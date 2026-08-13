from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import settings

engine = create_async_engine(
    settings().database_url, pool_pre_ping=True, pool_size=5, max_overflow=5
)
session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def database_session() -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session
