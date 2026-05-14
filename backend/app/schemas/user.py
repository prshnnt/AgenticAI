from pydantic import BaseModel

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
