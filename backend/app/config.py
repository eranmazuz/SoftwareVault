import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres_password_change_me@db:5432/software_vault"
    LIBRARY_PATH: str = "/library"
    PORT: int = 8000

    # Optional defaults from env
    OPENROUTER_API_KEY: str | None = None
    OPENROUTER_MODEL: str | None = "google/gemini-2.5-flash"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
