from langchain_core.messages import content
from pydantic import BaseModel, Field
from typing import Optional , List , Dict , Any
from enum import Enum
from datetime import datetime
from ai.database.models import MessageRole

class StreamChunk(BaseModel): # thread_id , type , content , tool_name , 
    """A chunk of streamed response."""
    thread_id: Optional[str|int] = Field(None, description="Thread ID")
    type: str = Field(..., description="Type of chunk: 'start', 'content', 'tool_name', 'end', 'error'")
    content: Optional[str] = Field(None, description="Content for content chunks")
    tool_name: Optional[str] = Field(None, description="Tool name for tool_call chunks")
    checkpointer_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


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

class TodoItemSchema(BaseModel):
    id: str
    text: str
    completed: bool
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

class ScratchpadResponse(BaseModel):
    todos: List[TodoItemSchema]
    notes: str