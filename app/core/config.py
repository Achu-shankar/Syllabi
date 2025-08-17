from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Union, Optional # Import Optional for CELERY_BROKER_URL

class Settings(BaseSettings):
    # Project Metadata
    PROJECT_NAME: str = "Reference Manager Backend"
    API_V1_STR: str = "/api/v1"

    # Supabase Configuration
    # Ensure these are set in your .env file or environment
    SUPABASE_URL: AnyHttpUrl
    SUPABASE_KEY: str # This is typically the anon key or service_role key
    
    CELERY_BROKER_URL: str # Changed to str as it's a URL string
    CELERY_RESULT_BACKEND_URL: Optional[str] = None # Often same as broker, or a DB

    # OpenAI API Key
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL_NAME: Optional[str] = None
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small" # Default value
    OPENAI_EMBEDDING_BATCH_SIZE: int = 2048 # Default from previous hardcoding
    
    # Google OAuth Configuration
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    
    # Notion OAuth Configuration
    NOTION_CLIENT_ID: Optional[str] = None
    NOTION_CLIENT_SECRET: Optional[str] = None

    # Chunking settings
    MIN_TOKENS_PER_CHUNK: int = 30
    MAX_TOKENS_PER_CHUNK: int = 400
    TOKEN_OVERLAP: int = 20

    # Database operations
    DB_INSERT_BATCH_SIZE: int = 250 # Default from previous hardcoding

    # If using service_role key, be mindful of security implications
    # For direct DB connections if needed (usually Supabase client handles this)
    # POSTGRES_SERVER: Optional[str] = None
    # POSTGRES_USER: Optional[str] = None
    # POSTGRES_PASSWORD: Optional[str] = None
    # POSTGRES_DB: Optional[str] = None
    # DATABASE_URL: Optional[str] = None # For SQLAlchemy or other ORMs if we were using one

    # @field_validator("DATABASE_URL", mode="before")
    # def assemble_db_connection(cls, v: Optional[str], values: dict) -> Any:
    #     if isinstance(v, str):
    #         return v
    #     if values.get("POSTGRES_SERVER") and values.get("POSTGRES_USER") and values.get("POSTGRES_PASSWORD") and values.get("POSTGRES_DB"):
    #         return f"postgresql://{values['POSTGRES_USER']}:{values['POSTGRES_PASSWORD']}@{values['POSTGRES_SERVER']}/{values['POSTGRES_DB']}"
    #     return v # Or raise an error if direct DB connection is mandatory and not fully configured

    # Celery Configuration
    # Example: "redis://localhost:6379/0" or "amqp://guest:guest@localhost:5672//"

    # Real-time settings (e.g., for SSE polling interval)
    SSE_POLL_INTERVAL_SECONDS: float = 1.0 # Interval for checking task updates in Supabase

    # For loading .env file
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")




settings = Settings()

# Debug: Print environment variables at startup
import os
print("=== Environment Variables Debug ===")
print(f"GOOGLE_CLIENT_ID from os.getenv: {bool(os.getenv('GOOGLE_CLIENT_ID'))}")
print(f"GOOGLE_CLIENT_SECRET from os.getenv: {bool(os.getenv('GOOGLE_CLIENT_SECRET'))}")
print(f"GOOGLE_CLIENT_ID from settings: {bool(settings.GOOGLE_CLIENT_ID)}")
print(f"GOOGLE_CLIENT_SECRET from settings: {bool(settings.GOOGLE_CLIENT_SECRET)}")
print(f"All GOOGLE_* env vars: {[k for k in os.environ.keys() if k.startswith('GOOGLE')]}")
print("=== End Debug ===")
