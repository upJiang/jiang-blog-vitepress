FROM python:3.13-slim
WORKDIR /app
RUN pip install --no-cache-dir uv==0.8.15
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev
COPY app ./app
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3002"]
