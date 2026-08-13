from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BACKEND_", extra="ignore")

    database_url: str = "mysql+asyncmy://backend:backend-local-only@localhost:3307/backend_learning"
    jwt_secret: str = "replace-with-at-least-32-characters"
    access_token_seconds: int = 900
    refresh_token_seconds: int = 2_592_000
    web_origin: str = "http://localhost:5173"
    cookie_secure: bool = False
    minio_endpoint: str = "127.0.0.1:9000"
    minio_access_key: str = "backend"
    minio_secret_key: str = "backend-local-only"
    minio_secure: bool = False
    minio_bucket: str = "backend-files"
    minio_public_endpoint: str | None = None
    payment_callback_secret: str = "local-payment-secret"


@lru_cache
def settings() -> Settings:
    return Settings()
