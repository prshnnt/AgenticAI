from fastapi import APIRouter , Depends , HTTPException , status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from 

router = APIRouter(prefix='/chats',tags=['chats'])

@router.post('/threads',status_code=status.HTTP_201_CREATED)
def create():
    