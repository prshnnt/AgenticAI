import os
import sys
from dotenv import load_dotenv
from typing import AsyncGenerator, Dict, List, Any, Optional
from datetime import datetime, timezone

from langchain_ollama import ChatOllama
from langgraph.checkpoint.memory import InMemorySaver
from deepagents import create_deep_agent
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from config import settings
from ai.tools import websearch
from ai.database.models import ChatThread

load_dotenv()
SYSTEM_PROMPT = "You are a helpful AI assistant."

class StreamChunk(BaseModel):
    """A chunk of streamed response."""
    thread_id: Optional[str|int] = Field(None, description="Thread ID")
    type: str = Field(..., description="Type of chunk: 'start', 'content', 'tool_call', 'tool_result', 'end', 'error'")
    content: Optional[str] = Field(None, description="Content for content chunks")
    tool_name: Optional[str] = Field(None, description="Tool name for tool_call chunks")
    tool_input: Optional[Dict[str, Any]] = Field(None, description="Tool input for tool_call chunks")
    tool_output: Optional[str] = Field(None, description="Tool output for tool_result chunks")
    checkpointer_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

# --- Custom Tools ---
tools = [
    websearch
]

def get_model():
    """
    Get the model based on the model name.
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
        self.tools = tools

        # Reusable persistent checkpointer 
        # (Using InMemorySaver as a placeholder. Swap with AsyncRedisSaver/AsyncPostgresSaver as needed)
        self.checkpointer = InMemorySaver()

        # # Default chat model
        # self.chat_model = self.models["planner"]

        # Reusable subagents
        self.subagents = []

        # Build ONCE
        self.agent = self._build_agent()

    def _build_agent(self):
        return create_deep_agent(
            model=self.chat_model,
            tools=self.tools,
            subagents=self.subagents,
            system_prompt=SYSTEM_PROMPT,
            checkpointer=self.checkpointer
        )

    async def stream(
        self,
        message: str,
        thread: ChatThread,
        db: Session
    ) -> AsyncGenerator[str, None]:
        start_chunk = StreamChunk(
            type="start",
            thread_id=thread.id,
            content=message,
            checkpointer_metadata={"timestamp": datetime.now(timezone.utc).isoformat()}
        )
        yield f"data: {start_chunk.model_dump_json()}\n\n"
        config = {
            "configurable": {
                "thread_id": thread.id
            }
        }

        async for event in self.agent.astream_events(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": message
                    }
                ]
            },
            config=config,
            version="v2"
        ):
            yield event


deep_agent_service = DeepAgentService()