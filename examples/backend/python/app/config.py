from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BACKEND_", extra="ignore")

    database_url: str = "mysql+asyncmy://backend:backend-local-only@localhost:3307/backend_learning"
    jwt_secret: str = "replace-with-at-least-32-characters"
    access_token_seconds: int = 900
    refresh_token_seconds: int = 2_592_000
    web_origin: str = "http://localhost:5173"


@lru_cache
def settings() -> Settings:
    return Settings()
