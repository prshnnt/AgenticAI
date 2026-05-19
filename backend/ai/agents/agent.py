import os
import sys
import json
import logging
import asyncio
from typing import Optional, List, Dict, AsyncGenerator
from datetime import datetime, timezone

# Add the 'backend' directory to sys.path so we can import modules
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv()

from pydantic import BaseModel
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langgraph.checkpoint.memory import InMemorySaver
from deepagents import create_deep_agent
from config import settings

logger = logging.getLogger(__name__)

# TODO: Import your actual database and domain models here
# from app.models import ChatThread, Session, StreamChunk, MessageRole, MessageService

# For now, using dummy classes so the module can be imported without NameErrors.
# Replace these with your actual implementations.
class StreamChunk(BaseModel):
    type: str
    session_id: str
    content: Optional[str] = None
    tool_name: Optional[str] = None
    tool_input: Optional[Dict] = None
    tool_output: Optional[str] = None
    checkpointer_metadata: Optional[Dict] = None

class ChatThread(BaseModel):
    id: str

class Session: pass
class MessageRole: AI = "ai"
class MessageService:
    @staticmethod
    def create_message(db, thread_id, role, content): pass

SYSTEM_PROMPT = "You are a helpful AI assistant."

# --- Custom Tools ---

@tool
def custom_websearch(query: str) -> str:
    """Search the internet for information about a given query."""
    # Placeholder for actual internet search logic (e.g., DuckDuckGo, SerpAPI, etc.)
    return f"Search results for '{query}': Found relevant information on the web."

@tool
def read_documentation(url: str) -> str:
    """Read documentation from a specific URL."""
    # Placeholder for actual web scraping/reading logic
    if "deepagents" in url:
        return "Deep Agents overview: Build agents that can plan, use subagents, and leverage file systems for complex tasks."
    return f"Scraped content of {url}"


class DeepAgentService:

    def __init__(self):
        self.llm = ChatOllama(
            model=settings.ollama_model,
            base_url=settings.ollama_base_url,
            api_key=settings.OLLAMA_API_KEY
        )
        # Replacing Tavily with our own custom tools
        self.tools = [custom_websearch, read_documentation]

    def _create_deep_agent(
        self,
        system_prompt: str,
        thread_id: str,
        subagents: Optional[List[Dict]] = None
    ):
        checkpointer = InMemorySaver()
        try:
            return create_deep_agent(
                model=self.llm,
                tools=self.tools,
                system_prompt=system_prompt,
                checkpointer=checkpointer,
                subagents=subagents
            )
        finally:
            # InMemorySaver doesn't have a close method, but keeping structure for your reference
            pass

    async def stream_chat_response(
        self,
        message_content: str,
        thread: ChatThread,
        db: Session
    ) -> AsyncGenerator[str, None]:

        # Send start event — outside try so a failure here is a true server error
        start_chunk = StreamChunk(
            type="start",
            session_id=thread.id,
            content=message_content,
            checkpointer_metadata={"timestamp": datetime.now(timezone.utc).isoformat()}
        )
        yield f"data: {start_chunk.model_dump_json()}\n\n"

        full_response = ""
        tool_calls_made = []

        try:
            agent = self._create_deep_agent(SYSTEM_PROMPT, thread.id)

            config = {
                "configurable": {
                    "thread_id": thread.id,
                    "checkpoint_ns": ""
                }
            }

            async with asyncio.timeout(settings.ollama_request_timeout or 300):
                async for event in agent.astream_events(
                    {"messages": [HumanMessage(content=message_content)]},
                    config=config,
                    version="v1"
                ):
                    event_type = event.get("event")

                    if event_type == "on_chat_model_stream":
                        chunk = event.get("data", {}).get("chunk", {})
                        if chunk and hasattr(chunk, "content") and chunk.content:
                            full_response += chunk.content
                            yield f"data: {StreamChunk(type='content', content=chunk.content, session_id=thread.id).model_dump_json()}\n\n"

                    elif event_type == "on_tool_start":
                        tool_name = event.get("name", "unknown")
                        tool_input = event.get("data", {}).get("input", {})
                        tool_calls_made.append({"tool": tool_name, "input": tool_input})
                        yield f"data: {StreamChunk(type='tool_call', tool_name=tool_name, tool_input=tool_input, session_id=thread.id, checkpointer_metadata={'timestamp': datetime.now(timezone.utc).isoformat()}).model_dump_json()}\n\n"

                    elif event_type == "on_tool_end":
                        tool_name = event.get("name", "unknown")
                        tool_output = str(event.get("data", {}).get("output", ""))
                        yield f"data: {StreamChunk(type='tool_result', tool_name=tool_name, tool_output=tool_output, session_id=thread.id, checkpointer_metadata={'timestamp': datetime.now(timezone.utc).isoformat()}).model_dump_json()}\n\n"

        except Exception as e:
            logger.exception("Error during agent stream for thread %s", thread.id)
            yield f"data: {StreamChunk(type='error', content=str(e), session_id=thread.id, checkpointer_metadata={'timestamp': datetime.now(timezone.utc).isoformat()}).model_dump_json()}\n\n"
            # Early return — don't send 'end' after an error so the client
            # knows the stream did not complete successfully
            return

        # ----------------------------------------------------------------
        # Only reached on clean completion (no exception)
        # ----------------------------------------------------------------

        # Save assistant message in a separate try so a DB failure doesn't
        # retroactively make the stream look like it errored
        try:
            if full_response:
                MessageService.create_message(
                    db=db,
                    thread_id=thread.id,
                    role=MessageRole.AI,
                    content=full_response,
                )
        except Exception as db_err:
            # Log but don't surface to client — the stream itself succeeded
            logger.error(
                "Failed to persist AI message for thread %s: %s",
                thread.id, db_err
            )

        yield f"data: {StreamChunk(type='end', session_id=thread.id, checkpointer_metadata={'timestamp': datetime.now(timezone.utc).isoformat(), 'tools_used': len(tool_calls_made)}).model_dump_json()}\n\n"

    def _format_sse(self, event_type: str, data: Dict) -> str:
        try:
            return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
        except TypeError:
            return f"event: error\ndata: {{\"message\": \"Serialization error\"}}\n\n"


deep_agent_service = DeepAgentService()