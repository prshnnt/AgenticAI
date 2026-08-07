import asyncio
import logging
from ai.agents.agent import build_agent
from fastapi import APIRouter , Depends , HTTPException , status, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from app.database.session import get_db, get_db_context
from app.schemas.chats import (
    ChatThreadCreate,
    ChatThreadResponse,
    ChatMessageCreate,
    ChatHistoryResponse
) 
from app.api.dependencies import get_current_user
from app.database.models import User
from ai.database.models import MessageRole
from datetime import timezone , datetime
from app.database.services import ThreadService , MessageService

router = APIRouter(prefix='/chats',tags=['chats'])

@router.post('/threads',response_model=ChatThreadResponse,status_code=status.HTTP_201_CREATED)
def create_thread(
    thread_data: ChatThreadCreate,
    user: User = Depends(get_current_user),
    db:Session = Depends(get_db)
):
    """
    Create a new chat thread.
    """
    return ThreadService.create_thread(db=db,user=user,title=thread_data.title)

@router.get("/threads", response_model=List[ChatThreadResponse])
def get_threads(
    user:User = Depends(get_current_user),
    db:Session = Depends(get_db)
):
    """
    Get all chat threads for current user.
    """
    return ThreadService.list_threads(db=db,user=user,limit=10)

@router.get("/threads/{thread_id}", response_model=ChatHistoryResponse)
def get_thread_history(
    thread_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get chat history for a specific thread.
    """
    thread = ThreadService.get_thread_by_id(db=db,thread_id=thread_id,user_id=user.id)
    if thread:
        
        messages = MessageService.get_messages_by_thread(db=db, thread=thread)
        return {
            "thread":thread,
            "messages":messages
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat thread not found"
        )

@router.delete("/threads/{thread_id}",status_code=status.HTTP_204_NO_CONTENT)
def delete_thread(
    thread_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a chat thread.
    """
    thread = ThreadService.get_thread_by_id(db=db,thread_id=thread_id,user_id=user.id)
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat thread not found"
        )
    ThreadService.delete_thread(db=db,thread=thread)
    return None

@router.patch("/threads/{thread_id}", response_model=ChatThreadResponse)
def rename_thread(
    thread_id: int,
    thread_data: ChatThreadCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rename/update a chat thread.
    """
    thread = ThreadService.get_thread_by_id(db=db, thread_id=thread_id, user_id=user.id)
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat thread not found"
        )
    thread.title = thread_data.title
    db.commit()
    db.refresh(thread)
    return thread

@router.post('/upload', status_code=status.HTTP_200_OK)
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Simulate uploading a file.
    Does not save the file anywhere.
    """
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "status": "success",
        "message": "File accepted successfully"
    }

logger = logging.getLogger(__name__)

class AgentTaskManager:
    def __init__(self):
        # thread_id -> asyncio.Task
        self.tasks: Dict[int, asyncio.Task] = {}
        # task -> list of asyncio.Queue
        self.task_queues: Dict[asyncio.Task, List[asyncio.Queue]] = {}

    def get_or_create_queue(self, thread_id: int) -> Optional[asyncio.Queue]:
        task = self.tasks.get(thread_id)
        if not task or task.done():
            return None
        q = asyncio.Queue()
        if task not in self.task_queues:
            self.task_queues[task] = []
        self.task_queues[task].append(q)
        return q

    def remove_queue(self, task: asyncio.Task, q: asyncio.Queue):
        if task in self.task_queues:
            if q in self.task_queues[task]:
                self.task_queues[task].remove(q)
            if not self.task_queues[task]:
                del self.task_queues[task]

    def is_running(self, thread_id: int) -> bool:
        task = self.tasks.get(thread_id)
        return task is not None and not task.done()

    def start_task(
        self,
        thread_id: int,
        message: str,
        allowed_tools: Optional[List[str]],
        user_id: int
    ) -> asyncio.Task:
        # If a task is already running, cancel it
        old_task = self.tasks.get(thread_id)
        if old_task and not old_task.done():
            old_task.cancel()
        
        task = asyncio.create_task(
            self._run_agent(thread_id, message, allowed_tools, user_id)
        )
        self.tasks[thread_id] = task
        self.task_queues[task] = []
        return task

    async def _run_agent(
        self,
        thread_id: int,
        message: str,
        allowed_tools: Optional[List[str]],
        user_id: int
    ):
        current_task = asyncio.current_task()
        try:
            with get_db_context() as bg_db:
                from app.database.services import ThreadService
                thread = ThreadService.get_thread_by_id(db=bg_db, thread_id=thread_id, user_id=user_id)
                if not thread:
                    logger.error("Thread %s not found in background task", thread_id)
                    return
                deep_agent_service = await build_agent()
                async for chunk in deep_agent_service.astream(
                    message=message,
                    thread_id=str(thread_id),
                    db=bg_db,
                    # allowed_tools=allowed_tools
                ):
                    queues = self.task_queues.get(current_task, [])
                    for q in queues:
                        await q.put(chunk)
        except asyncio.CancelledError:
            logger.info("Agent task for thread %s was cancelled", thread_id)
            raise
        except Exception as e:
            logger.exception("Error in background task for thread %s", thread_id)
        finally:
            if self.tasks.get(thread_id) == current_task:
                self.tasks.pop(thread_id, None)
            
            queues = self.task_queues.pop(current_task, [])
            for q in queues:
                await q.put(None)

agent_task_manager = AgentTaskManager()


@router.post("/threads/{thread_id}")
async def send_message(
    thread_id: int,
    message: ChatMessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
    ):
    thread = ThreadService.get_thread_by_id(db=db,thread_id=thread_id,user_id=user.id)
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat thread not found"
        )
    thread.updated_at = datetime.now(timezone.utc)
    db.commit()

    MessageService.create_message(
        db=db,
        thread=thread,
        role= MessageRole.HUMAN,
        content=message.content
    )

    # Start/overwrite background agent execution task
    task = agent_task_manager.start_task(
        thread_id=thread.id,
        message=message.content,
        allowed_tools=message.allowed_tools,
        user_id=user.id
    )

    # Register client-specific queue for the streaming response
    q = agent_task_manager.get_or_create_queue(thread.id)

    async def generate():
        if q is None:
            return
        try:
            while True:
                chunk = await q.get()
                if chunk is None:
                    break
                yield f"data: {chunk.model_dump_json()}\n\n"
        finally:
            agent_task_manager.remove_queue(task, q)

    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )