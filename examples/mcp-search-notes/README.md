# search_notes MCP 双语言示例

这份伴随工程让 Python 和 Node.js Server 实现同一个只读 `search_notes` Tool，并用真实 Client 验证协议与业务契约。

目录职责：

- `contracts/search-notes.json`：语言无关的 Tool 名称、输入与输出 Schema。
- `fixtures/notes.json`：两个实现共用的匿名测试数据。
- `node/`：TypeScript SDK v2 Server、Client 和测试。
- `python/`：Python SDK v2 Server、Client 和测试。

Node.js 需要 20 或更高版本，Python 需要 3.10 或更高版本。先安装两边依赖：

```bash
# Node 示例单独维护依赖；当前目录没有独立锁文件，因此不要使用 --frozen-lockfile。
yarn --cwd examples/mcp-search-notes/node install
cd examples/mcp-search-notes/python
uv sync --frozen
```

再从仓库根目录运行：

```bash
yarn --cwd examples/mcp-search-notes/node test
cd examples/mcp-search-notes/python
uv run pytest -q
```

Node 测试覆盖进程内工具发现、正常命中、空结果、参数拒绝、未知工具和错误结构化输出。Python 测试先验证 Python Server 的同一业务契约，再由 Python Client 启动 Node Server，证明现代协议探测、跨语言 stdio 调用和子进程关闭。

fixture 和进程内 Repository 只用于契约测试。它们不证明真实数据库权限、网络认证或多租户隔离；接入生产数据时，可信 Scope 必须由 Server 根据认证上下文注入，不能作为模型可填写的 Tool 参数。
