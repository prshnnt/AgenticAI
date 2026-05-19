from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Agentic AI"
    VERSION: str = "0.1.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = ""
    
    # ChromaDB
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    CHROMA_COLLECTION_NAME: str = "user_documents"
    
    # Auth
    SECRET_KEY: str = "your-secret-key-change-in-production"
    # keep secret secure
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Ollama
    ollama_base_url: str = "https://api.ollama.com"
    ollama_model: str = "gpt-oss:120b"
    ollama_request_timeout: int = 300
    
    GOOGLE_API_KEY:str = "your-gemini-api-key"
    GROQ_API_KEY:str = "your-groq-api-key"
    TAVILY_API_KEY:str = "your-tavily-api-key"
    OLLAMA_API_KEY:str = "your-ollama-api-key"
    REDIS_API_KEY_AGENT_MEMORY: str = "your-redis-api-key"
    
    # CORS
    CORS_ORIGINS: list = ["*"]
    
    class Config:
        env_file = ".env"


settings = Settings()
