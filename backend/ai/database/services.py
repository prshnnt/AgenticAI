from sqlalchemy.orm import Session
from typing import List, Tuple ,  Optional

from app.database.models import User
from ai.database.models import (
    ChatMessage,
    MessageRole,
    ChatThread
)

class ChatService:

    @staticmethod
    def create_chat(
        db:Session,
        user:User,
        title:Optional[str]=None
    ) -> ChatThread:

        thread = ChatThread(
            user_id=user.id,
            title=title or "New Chat"
        )
        db.add(thread)
        db.commit()
        db.refresh(thread)
        return thread
    
    @staticmethod
    def get_chat_by_id(
        db:Session,
        chat_id:int,
        user_id:int
    ) -> Optional[ChatThread]:
        return (
            db.query(ChatThread).filter(
                ChatThread.id == chat_id,
                ChatThread.user_id == user_id
            ).first()
        )

    @staticmethod
    def list_chats(
        db:Session,
        user:User,
        skip:int=0,
        limit:int=100
    ) -> List[ChatThread]:
        return (
            db.query(ChatThread)
            .filter(ChatThread.user_id == user.id)
            .order_by(ChatThread.updated_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    @staticmethod
    def delete_chat(
        db:Session,
        chat_id:int,
        user_id:int
    ) -> bool:
        chat = db.query(ChatThread).filter(
            ChatThread.id == chat_id,
            ChatThread.user_id == user_id
        ).first()
        if chat:
            db.delete(chat)
            db.commit()
            return True
        return False
        

class MessageService:

    @staticmethod
    def create_message(
        db:Session,
        thread:ChatThread,
        role:MessageRole,
        content:str
    ) -> ChatMessage:
        message = ChatMessage(
            thread_id=thread.id,
            role=role,
            content=content
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        return message
    
    @staticmethod
    def get_messages_by_thread(
        db:Session,
        thread:ChatThread,
        skip:int=0,
        limit:int=100
    ) -> List[ChatMessage]:
        return (
            db.query(ChatMessage)
            .filter(
                ChatMessage.thread_id == thread.id,
            ).order_by(ChatMessage.created_at.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )