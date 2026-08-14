# AI Agent Runtime 伴随工程

这个目录连接三篇文章的代码，不调用在线模型，也不访问数据库：

- `structured_output.py`：模型候选、Pydantic 校验和可信上下文装配。
- `langgraph_basics.py`：一张包含检索、寒暄、追问和无证据终态的最小 LangGraph。
- `domain_model.py`：Conversation、Turn、Message、Event、Task 的领域对象与内存状态机。
- `migrations/001_runtime.sql`：把领域关系落实为 PostgreSQL 表和唯一约束。

在本目录运行：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[test]'
pytest
python -m ai_agent_runtime.langgraph_basics
python -m ai_agent_runtime.domain_model
```

内存实现用于解释确定性状态和故障注入，不能证明 PostgreSQL 并发、队列 ACK、真实模型协议或持久 Checkpoint。迁移文件需要在隔离数据库中另做并发集成测试后，才可以用于实际服务。
