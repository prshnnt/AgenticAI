from ai.agents.agent import deep_agent_service
from fastapi import APIRouter , Depends , HTTPException , status
from fastapi.responses import StreamingResponse
from typing import List
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.chats import (
    ChatThreadCreate,
    ChatThreadResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    ChatHistoryResponse
) 
from app.api.dependencies import get_current_user
from app.database.models import User
from ai.database.models import MessageRole
from datetime import datetime , timezone
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
    messages = MessageService.get_messages_by_thread(db=db, thread=thread)
    return {
        "thread":thread,
        "messages":messages
    }

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
    thread.updated_at = timezone.now()
    db.commit()

    user_message = MessageService.create_message(
        db=db,
        thread=thread,
        role= MessageRole.HUMAN,
        content=message.content
    )

    async def generate():
        async for event in deep_agent_service.stream(
            message=message.content,
            thread=thread,
            db=db
        ):
            yield f"data: {event.model_dump_json()}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )