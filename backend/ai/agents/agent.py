import asyncio
from typing import AsyncGenerator, Optional , List
from datetime import datetime, timezone

from langchain_core.messages import HumanMessage
from langchain_ollama import ChatOllama
from langgraph.checkpoint.redis import AsyncRedisSaver
from deepagents import create_deep_agent
from sqlalchemy.orm import Session

from config import settings

from ai.database.models import ChatThread , MessageRole 
from ai.tools import get_tools
from ai.agents.subagents import get_subagents

from app.database.services import MessageService
from app.schemas.chats import StreamChunk

import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()

try:
    from ai.prompts.SYSTEM_PROMPT import SYSTEM_PROMPT
except:
    SYSTEM_PROMPT = "You are a helpful AI assistant."
    logger.warning("SYSTEM_PROMPT.py not found, using default system prompt.")


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
    

class DeepAgentService:

    def __init__(self):
        # Reusable models
        self.models = get_model()

        # Reusable tools
        self.tools = get_tools()

        # Reusable persistent checkpointer 
        # (Using InMemorySaver as a placeholder. Swap with AsyncRedisSaver/AsyncPostgresSaver as needed)
        # self.checkpointer = InMemorySaver()
        self.checkpointer = AsyncRedisSaver(redis_url=settings.REDIS_URI)

        # Reusable subagents
        self.subagents = get_subagents()

        # Build ONCE
        self.agent = self._build_agent()

    def _build_agent(self, tools=None):
        return create_deep_agent(
            model=self.models,
            tools=tools if tools is not None else self.tools,
            subagents=self.subagents,
            system_prompt=SYSTEM_PROMPT,
            checkpointer=self.checkpointer
        )

    async def stream(
        self,
        message: str,
        thread: ChatThread,
        db: Session,
        allowed_tools: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:

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
                "checkpointer_ns":""
            }
        }
        tools = get_tools()
        if allowed_tools is not None:
            tools = [tool for tool in tools if tool.name in allowed_tools]
            agent = self._build_agent(tools=tools)
        else:
            agent = self.agent

        try:
            async with asyncio.timeout(300):
                async for event in agent.astream_events(
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
                            tool_name=tool_name,
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
            logger.exception("Error during agent stream for thread %s", thread.id)
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
            logger.error(
                "Failed to persist AI message for thread %s: %s",
                thread.id, db_err
            )

        yield StreamChunk(
            type='end',
            thread_id=thread.id,
            content=full_response,
            checkpointer_metadata={'timestamp': datetime.now(timezone.utc).isoformat()}
        )



deep_agent_service = DeepAgentService()