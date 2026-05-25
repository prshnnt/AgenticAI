from langchain_core.messages import content
from pydantic import BaseModel, Field
from typing import Optional , List , Dict , Any
from enum import Enum
from datetime import datetime
from ai.database.models import MessageRole

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