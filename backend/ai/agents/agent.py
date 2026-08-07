import asyncio
from typing import AsyncGenerator, Optional , List , Dict , Any
from datetime import datetime, timezone

from langchain_core.messages import HumanMessage
from langchain_ollama import ChatOllama
from langchain_community.agent_toolkits import SQLDatabaseToolkit
from langchain_community.utilities import SQLDatabase
from langgraph.checkpoint.redis.aio import AsyncRedisSaver
from langgraph.types import Command
from deepagents import create_deep_agent
from deepagents.backends.filesystem import FilesystemBackend
from sqlalchemy.orm import Session

from config import settings

from ai.database.models import ChatThread , MessageRole 
from ai.tools import get_tools
from ai.agents.subagents import get_subagents

from app.database.services import MessageService
from app.schemas.chats import StreamChunk

from dotenv import load_dotenv
import os

load_dotenv()


def get_model():
    """
    Get the model based on the model name configured in settings.

    Retrieves a ChatOllama instance using the model name, base URL, and a
    temperature of 0 to ensure deterministic responses.

    Returns:
        ChatOllama: Configured Ollama chat model instance.
    """
    return ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=0
    )
    
# Tools that require a human decision before they're allowed to execute.
# See https://docs.langchain.com/oss/python/deepagents/human-in-the-loop
DEFAULT_INTERRUPT_ON: Dict[str, Any] = {
    # sql_db_query can run arbitrary SQL (including writes) -> always gate it.
    "sql_db_query": {"allowed_decisions": ["approve", "edit", "reject"]},
    "websearch": {"allowed_decisions":["approve","reject"]}
    # Schema/table-listing/query-checking tools are read-only and safe to
    # leave unattended; deepagents treats an absent key as "no interrupt".
}

class DeepAgentService:
    """
    Service for managing and interacting with the LangGraph Deep Agent.

    This service initializes the LLM instance, retrieves relevant tools,
    configures a persistent checkpointer (e.g., AsyncRedisSaver), and
    composes the main conversational agent. It provides a stream endpoint
    to stream agent execution events to the client.
    """

    def __init__(self,model,agent,redis_cm,checkpointer):
        # Reusable models
        self.models = model
        self.agent = agent
        self._redis_cm = redis_cm
        self.checkpointer = checkpointer

    @classmethod
    async def create(
        cls,
        redis_url: str = "redis://localhost:6379",
        interrupt_on: Optional[Dict[str, Any]] = None,
    ) -> "DeepAgentService":
        model = get_model()

        base_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(base_dir, "chinook.db")
        db = SQLDatabase.from_uri(f"sqlite:///{db_path}", sample_rows_in_table_info=3)
        toolkit = SQLDatabaseToolkit(db=db, llm=model)
        tools = toolkit.get_tools() + get_tools()

        # AsyncRedisSaver must be entered as an async context manager and
        # explicitly `asetup()` to create its indices before first use.
        redis_cm = AsyncRedisSaver.from_conn_string(redis_url)
        checkpointer = await redis_cm.__aenter__()
        await checkpointer.asetup()

        agent = create_deep_agent(
            model=model,
            tools=tools,
            backend=FilesystemBackend(root_dir="./ai/sandbox/", virtual_mode=True),
            skills=["/skills/examples","/skills/public"],
            subagents=[],
            memory=["./AGENTS.md"],
            checkpointer=checkpointer,
            # Human-in-the-loop: pause before running gated tools until a
            # human calls MainAgent.aresume() with approve/edit/reject.
            interrupt_on=DEFAULT_INTERRUPT_ON if interrupt_on is None else interrupt_on,
        )

        return cls(model, agent, redis_cm, checkpointer)
    
    async def aclose(self):
        """Release the Redis connection. Call once at process shutdown."""
        if self._redis_cm is not None:
            await self._redis_cm.__aexit__(None, None, None)
            self._redis_cm = None
    async def _pending_interrupts(self, config: dict):
        """Return any interrupts left un-resolved after the last run, if any."""
        state = await self.agent.aget_state(config)
        interrupts = getattr(state, "interrupts", None)
        if interrupts:
            return interrupts
        # Older langgraph versions surface interrupts per-task instead of
        # top-level; fall back to flattening those.
        return tuple(
            i
            for task in getattr(state, "tasks", ())
            for i in getattr(task, "interrupts", ())
        )
    async def _run(self, graph_input, thread_id: str, db:Session) -> AsyncGenerator[StreamChunk, None]:
        """Drive one graph execution (fresh message OR a Command(resume=...))
        and yield StreamChunks for it, ending in exactly one of:
        'end' (turn finished), 'approval_required' (paused, needs a human
        decision), or 'error'.
        """
        config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}
        full_response = ""

        try:
            async for event in self.agent.astream_events(
                graph_input, config=config, version="v2"
            ):
                event_type = event.get("event", "")
                data = event.get("data", {})

                if event_type == "on_chat_model_start":
                    yield StreamChunk(type="message_start", thread_id=thread_id)

                elif event_type == "on_chat_model_stream":
                    chunk = data.get("chunk")
                    text = getattr(chunk, "content", None) if chunk else None
                    if text:
                        full_response += text
                        yield StreamChunk(type="content", thread_id=thread_id, content=text)

                elif event_type == "on_chat_model_end":
                    yield StreamChunk(type="message_end", thread_id=thread_id)

                elif event_type == "on_tool_start":
                    yield StreamChunk(
                        type="tool_start",
                        thread_id=thread_id,
                        tool=event.get("name", "unknown"),
                    )

                elif event_type == "on_tool_end":
                    output = data.get("output")
                    output_text = getattr(output, "content", output)
                    yield StreamChunk(
                        type="tool_end",
                        thread_id=thread_id,
                        tool=event.get("name", "unknown"),
                        content=str(output_text),
                    )

        except Exception as e:
            yield StreamChunk(type="error", thread_id=thread_id, content=str(e))
            return

        # astream_events finishing "normally" doesn't mean the turn is done --
        # if a gated tool was called, the graph is paused and checkpointed
        # rather than errored. Check for that before declaring "end".
        interrupts = await self._pending_interrupts(config)
        if interrupts:
            yield StreamChunk(
                type="approval_required",
                thread_id=thread_id,
                data=interrupts[0].value,
            )
            return
        try:
            if full_response:
                thread = db.query(ChatThread).filter(ChatThread.id == int(thread_id)).first()
                if thread:
                    MessageService.create_message(
                        db=db,
                        thread=thread,
                        role=MessageRole.AI,
                        content=full_response,
                    )
        except Exception as db_err:
            # Log but don't surface to client — the stream itself succeeded
            print(
                "Failed to persist AI message for thread %s: %s",
                thread_id, db_err
            )
        yield StreamChunk(type="end", thread_id=thread_id, content=full_response)
    async def astream(
        self, message: str, thread_id: str ,db:Session
    ) -> AsyncGenerator[StreamChunk, None]:
        """Start (or continue) a conversation turn with a new user message."""
        yield StreamChunk(type="start", thread_id=thread_id)
        async for chunk in self._run({"messages": [HumanMessage(content=message)]}, thread_id,db=db):
            yield chunk

    async def aresume(
        self, decisions: list, thread_id: str ,db:Session
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Resume a turn paused by an 'approval_required' chunk.

        `decisions` must have one entry per action_request from that chunk,
        in the same order, each one of:
          {"type": "approve"}
          {"type": "reject"}
          {"type": "edit", "edited_action": {"name": ..., "args": {...}}}
        """
        yield StreamChunk(type="start", thread_id=thread_id)
        async for chunk in self._run(Command(resume={"decisions": decisions}), thread_id):
            yield chunk

    async def stream(
        self,
        message: str,
        thread: ChatThread,
        db: Session,
        allowed_tools: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream agent execution events and final output for a user message.

        Executes the agent workflow asynchronously, capturing LangGraph execution
        events (model stream chunks, tool calls/returns, errors), yields them as
        StreamChunk instances, and persists the final response in the database.

        Args:
            message (str): The user input message.
            thread (ChatThread): The active chat thread model.
            db (Session): SQLAlchemy database session.
            allowed_tools (Optional[List[str]]): List of specific tool names that
                the agent is allowed to invoke. If None, all tools are allowed.

        Yields:
            StreamChunk: Chunks representing different stages of execution (start,
                content, tool_name, tool_output, error, and end).
        """

        # Dynamically set up Redis search indices if not already done
        if not hasattr(self, "_setup_done") or not self._setup_done:
            await self.checkpointer.asetup()
            self._setup_done = True

        yield StreamChunk(
            type="start",
            thread_id=thread.id,
            checkpointer_metadata={"timestamp": datetime.now(timezone.utc).isoformat()}
        )

        full_response = ""

        config = {
            "configurable": {
                "thread_id": str(thread.id),
                "checkpoint_ns":""
            }
        }


        try:
            async with asyncio.timeout(300):
                async for event in self.agent.astream_events(
                    {"messages": [HumanMessage(content=message)]},
                    config=config,
                    version="v2"
                ):
                    event_type = event.get("event","")
                    event_data = event.get("data",{})
                    
                    if event_type == "on_chat_model_stream":
                        chunk = event_data.get("chunk",{})
                        if chunk and hasattr(chunk,"content") and chunk.content:
                            full_response += chunk.content
                            yield StreamChunk(
                                type="content",
                                thread_id=thread.id,
                                content=chunk.content,
                                checkpointer_metadata={'timestamp': datetime.now(timezone.utc).isoformat()}
                            )
                    
                    if event_type == "on_tool_start":
                        tool_name = event.get("name", "unknown")
                        yield StreamChunk(
                            type="tool_name",
                            thread_id=thread.id,
                            tool=tool_name,
                            checkpointer_metadata={'timestamp': datetime.now(timezone.utc).isoformat()}
                        )
                    
                    if event_type == "on_tool_end":
                        yield StreamChunk(
                            type="tool_output",
                            thread_id=thread.id,
                            content=str(event_data.get("output")),
                            checkpointer_metadata={'timestamp': datetime.now(timezone.utc).isoformat()}
                        )
                    
                    if event_type == "on_chat_model_end":
                        yield StreamChunk(
                            type="end",
                            thread_id=thread.id,
                            content=str(event_data.get("content")),
                            checkpointer_metadata={'timestamp': datetime.now(timezone.utc).isoformat()}
                        )
                    
                    if event_type == "on_chat_model_error":
                        yield StreamChunk(
                            type="error",
                            thread_id=thread.id,
                            content=str(event_data.get("error")),
                            checkpointer_metadata={'timestamp': datetime.now(timezone.utc).isoformat()}
                        )
        except Exception as e:
            yield StreamChunk(
                type="error",
                thread_id=thread.id,
                content=str(e),
                checkpointer_metadata={'timestamp': datetime.now(timezone.utc).isoformat()}
            )
            return

        try:
            if full_response:
                MessageService.create_message(
                    db=db,
                    thread=thread,
                    role=MessageRole.AI,
                    content=full_response,
                )
        except Exception as db_err:
            # Log but don't surface to client — the stream itself succeeded
            print(
                "Failed to persist AI message for thread %s: %s",
                thread.id, db_err
            )

        yield StreamChunk(
            type='end',
            thread_id=thread.id,
            content=full_response,
            checkpointer_metadata={'timestamp': datetime.now(timezone.utc).isoformat()}
        )


async def build_agent() -> DeepAgentService:
    """Convenience factory for callers (e.g. main.py) to construct the singleton."""
    return await DeepAgentService.create()