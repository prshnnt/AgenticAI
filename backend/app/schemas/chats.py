from pydantic import BaseModel, Field
from typing import Optional , List , Dict , Any , Literal
from datetime import datetime
from ai.database.models import MessageRole

# Real lifecycle of a single turn, in order:
#   start -> (message_start -> content* -> message_end | tool_start -> tool_end)*
#     -> end | approval_required
# "error" can happen at any point instead of the terminal "end".
# "approval_required" means execution is PAUSED (state is checkpointed) and the
# turn is not over until the caller resumes it via `aresume()`.
StreamType = Literal[
    "start", "message_start", "content", "message_end",
    "tool_start", "tool_end", "approval_required", "end", "error",
]

class StreamChunk(BaseModel):
    """A chunk of streamed response."""
    thread_id: str = Field(..., description="Thread ID")
    type: StreamType = Field(..., description="Type of chunk, see StreamType")
    content: Optional[str] = Field(None, description="Text content for content/end chunks")
    tool: Optional[str] = Field(None, description="Tool name for tool_start/tool_end chunks")
    skill: Optional[str] = Field(None, description="Skill being invoked, if any")
    checkpointer_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    data: Optional[Dict[str, Any]] = Field(
        None,
        description=(
            "Structured payload for approval_required chunks: "
            "{'action_requests': [...], 'review_configs': [...]}"
        ),
    )

class ChatThreadCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ChatThreadResponse(BaseModel):
    id : int
    title :str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ChatMessageCreate(BaseModel):
    """
    Incoming user message.
    Role is ALWAYS HUMAN in the router.
    """
    content: str
    allowed_tools: Optional[List[str]] = None

class ChatMessageResponse(BaseModel):
    id: int 
    role : MessageRole
    content : str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatHistoryResponse(BaseModel):
    thread: ChatThreadResponse
    messages: List[ChatMessageResponse]

    class Config:
        from_attributes = True