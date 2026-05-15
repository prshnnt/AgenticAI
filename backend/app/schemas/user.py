from pydantic import BaseModel
from datetime import datetime

class UserLogin(BaseModel):
    # user authentication schema
    username: str
    password: str


class UserCreate(BaseModel):
    email:str
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True