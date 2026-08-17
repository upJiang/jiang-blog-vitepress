export interface AiAgentSourceLedgerEntry {
  slug: string
  waylandChapters: string[]
  internalSources: string[]
  officialSources: string[]
  allowedClaims: string
}

export const aiAgentSourceLedger: AiAgentSourceLedgerEntry[] = [
  {
    "slug": "llm-workflow-rag-agent",
    "waylandChapters": [
      "01",
      "02"
    ],
    "internalSources": [
      "README.md",
      "agent开发文章.md#1-2"
    ],
    "officialSources": [
      "openai-responses",
      "openai-function-calling"
    ],
    "allowedClaims": "分清模型、固定编排、检索增强与受控循环的职责"
  },
  {
    "slug": "messages-tokens-context",
    "waylandChapters": [
      "01"
    ],
    "internalSources": [
      "server/app/services/conversation_context.py",
      "server/tests/test_conversation_context.py"
    ],
    "officialSources": [
      "openai-text",
      "openai-tokenizer"
    ],
    "allowedClaims": "消息进入上下文后才影响本次生成，Token 预算由应用计算"
  },
  {
    "slug": "python-openai-responses-first-call",
    "waylandChapters": [
      "01"
    ],
    "internalSources": [
      "server/app/services/model.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "openai-quickstart",
      "openai-responses",
      "openai-streaming"
    ],
    "allowedClaims": "Responses API 的请求、输出、usage、流式事件与错误分层"
  },
  {
    "slug": "structured-output-model-boundaries",
    "waylandChapters": [
      "03"
    ],
    "internalSources": [
      "server/app/domain/agent_runtime.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "openai-structured-outputs",
      "json-schema"
    ],
    "allowedClaims": "结构化输出约束形状，业务真实性仍由程序验证"
  },
  {
    "slug": "agent-essence-autonomy-boundaries",
    "waylandChapters": [
      "01",
      "02"
    ],
    "internalSources": [
      "agent开发文章.md#1",
      "server/app/agent/enterprise_runtime.py"
    ],
    "officialSources": [
      "openai-agents"
    ],
    "allowedClaims": "Agent 的自主性来自受限动作循环，不等于无限权限"
  },
  {
    "slug": "python-agent-loop-from-scratch",
    "waylandChapters": [
      "02"
    ],
    "internalSources": [
      "agent流程.md",
      "server/app/agent/enterprise_runtime.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "openai-function-calling"
    ],
    "allowedClaims": "最小循环包含模型提议、程序验证、工具执行、观察与终止"
  },
  {
    "slug": "tool-calling-contracts",
    "waylandChapters": [
      "03"
    ],
    "internalSources": [
      "server/app/agent/tools.py",
      "server/tests/test_agent_tools.py"
    ],
    "officialSources": [
      "openai-function-calling",
      "json-schema"
    ],
    "allowedClaims": "工具定义、调用建议、参数校验、执行结果是不同对象"
  },
  {
    "slug": "mcp-foundations-boundaries",
    "waylandChapters": [
      "04"
    ],
    "internalSources": [
      "server/app/services/mcp.py",
      "server/tests/test_mcp_service.py"
    ],
    "officialSources": [
      "mcp-spec-architecture"
    ],
    "allowedClaims": "MCP 统一上下文和工具接入，不替代业务授权与运行时"
  },
  {
    "slug": "mcp-protocol-lifecycle",
    "waylandChapters": [
      "04"
    ],
    "internalSources": [
      "server/app/integrations/mcp_client.py",
      "server/tests/test_remote_mcp_client.py"
    ],
    "officialSources": [
      "mcp-spec-lifecycle",
      "json-rpc"
    ],
    "allowedClaims": "初始化、能力协商、调用、取消与关闭的生命周期"
  },
  {
    "slug": "mcp-python-server-client",
    "waylandChapters": [
      "04"
    ],
    "internalSources": [
      "server/app/services/mcp.py",
      "server/tests/test_mcp_service.py"
    ],
    "officialSources": [
      "mcp-python-sdk"
    ],
    "allowedClaims": "Python Server 与 Client 的最小可运行通信和失败处理"
  },
  {
    "slug": "skill-system-progressive-disclosure",
    "waylandChapters": [
      "05"
    ],
    "internalSources": [
      "server/app/agent/tools.py",
      "server/tests/test_agent_tools.py"
    ],
    "officialSources": [
      "agent-skills-spec"
    ],
    "allowedClaims": "Skill 按需加载说明和资源，工具仍由运行时授权"
  },
  {
    "slug": "agent-hooks-events-approval",
    "waylandChapters": [
      "06"
    ],
    "internalSources": [
      "server/app/agent/enterprise_runtime.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "mcp-spec",
      "openai-agents"
    ],
    "allowedClaims": "Hook 观察生命周期，审批在副作用执行前由程序决定"
  },
  {
    "slug": "context-engineering-assembly-budget",
    "waylandChapters": [
      "07"
    ],
    "internalSources": [
      "agent开发文章.md#8",
      "server/app/services/conversation_context.py",
      "server/tests/test_conversation_context.py"
    ],
    "officialSources": [
      "openai-context"
    ],
    "allowedClaims": "上下文按策略、证据、历史、摘要和记忆分配预算"
  },
  {
    "slug": "context-window-strategies",
    "waylandChapters": [
      "07"
    ],
    "internalSources": [
      "server/app/services/conversation_context.py",
      "server/tests/test_conversation_context.py"
    ],
    "officialSources": [
      "openai-context"
    ],
    "allowedClaims": "滑动窗口、裁剪和摘要各自损失什么信息"
  },
  {
    "slug": "prompt-cache-prefix-design",
    "waylandChapters": [
      "07"
    ],
    "internalSources": [
      "server/app/services/conversation_context.py"
    ],
    "officialSources": [
      "openai-prompt-caching"
    ],
    "allowedClaims": "稳定前缀影响缓存复用，缓存不等于长期记忆"
  },
  {
    "slug": "memory-architecture-retrieval",
    "waylandChapters": [
      "08"
    ],
    "internalSources": [
      "server/app/services/user_memory.py",
      "server/app/repositories/user_memory.py",
      "server/tests/test_user_memory.py"
    ],
    "officialSources": [
      "langgraph-memory"
    ],
    "allowedClaims": "记忆有类型、范围、来源、过期与检索边界"
  },
  {
    "slug": "multi-turn-conversation-design",
    "waylandChapters": [
      "09"
    ],
    "internalSources": [
      "server/app/repositories/conversations.py",
      "server/app/services/conversation_context.py",
      "server/tests/test_conversation_scope.py"
    ],
    "officialSources": [
      "openai-conversation-state"
    ],
    "allowedClaims": "会话、消息和 Turn 分层保存，多轮指代依赖可追踪历史"
  },
  {
    "slug": "context-pollution-injection",
    "waylandChapters": [
      "07",
      "09"
    ],
    "internalSources": [
      "server/app/security/external_content.py",
      "server/app/agent/enterprise_runtime.py",
      "server/tests/test_external_content_security.py"
    ],
    "officialSources": [
      "owasp-llm-prompt-injection"
    ],
    "allowedClaims": "外部内容保持低信任，指令与证据不能混写"
  },
  {
    "slug": "agent-router-mode-selection",
    "waylandChapters": [
      "01",
      "31"
    ],
    "internalSources": [
      "server/app/agent/enterprise_runtime.py#choose_mode",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "openai-model-selection"
    ],
    "allowedClaims": "路由先依据任务、范围和资源选择执行模式，再选模型"
  },
  {
    "slug": "agent-planner-search-plan",
    "waylandChapters": [
      "10"
    ],
    "internalSources": [
      "agent开发文章.md#9",
      "server/app/domain/agent_runtime.py",
      "server/app/agent/enterprise_runtime.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "langgraph-workflows"
    ],
    "allowedClaims": "Planner 产出有上限的 SearchPlan，不直接执行检索"
  },
  {
    "slug": "agent-reflection-repair",
    "waylandChapters": [
      "11"
    ],
    "internalSources": [
      "server/app/agent/enterprise_runtime.py#validate-repair",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "langgraph-workflows"
    ],
    "allowedClaims": "反思只针对可观察问题有限修复，不能无限自评"
  },
  {
    "slug": "chain-of-thought-boundaries",
    "waylandChapters": [
      "12"
    ],
    "internalSources": [
      "server/app/agent/enterprise_prompts.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "openai-reasoning"
    ],
    "allowedClaims": "保存结构化决策和证据，不依赖公开模型隐式推理"
  },
  {
    "slug": "tree-of-thoughts-search",
    "waylandChapters": [
      "17"
    ],
    "internalSources": [
      "server/app/domain/agent_runtime.py#SearchPlan",
      "server/app/agent/enterprise_runtime.py"
    ],
    "officialSources": [
      "original-tot-paper"
    ],
    "allowedClaims": "候选分支需要评分、剪枝、预算和终止条件"
  },
  {
    "slug": "debate-pattern",
    "waylandChapters": [
      "18"
    ],
    "internalSources": [
      "server/app/agent/enterprise_runtime.py#review"
    ],
    "officialSources": [
      "multi-agent-design"
    ],
    "allowedClaims": "辩论适合有可比较证据的分歧，最终裁决不能只数票"
  },
  {
    "slug": "multi-agent-orchestration",
    "waylandChapters": [
      "13"
    ],
    "internalSources": [
      "server/app/agent/enterprise_runtime.py#fanout"
    ],
    "officialSources": [
      "langgraph-multi-agent"
    ],
    "allowedClaims": "多 Agent 先定义角色输入输出、共享状态和失败归属"
  },
  {
    "slug": "multi-agent-dag-workflows",
    "waylandChapters": [
      "14"
    ],
    "internalSources": [
      "server/app/agent/enterprise_runtime.py#build_graph",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "langgraph-graph-api"
    ],
    "allowedClaims": "DAG 适合依赖稳定的并行任务，动态循环需显式路由"
  },
  {
    "slug": "multi-agent-swarm-pattern",
    "waylandChapters": [
      "15"
    ],
    "internalSources": [
      "server/app/agent/enterprise_runtime.py#fanout"
    ],
    "officialSources": [
      "multi-agent-design"
    ],
    "allowedClaims": "Swarm 的局部选择仍需全局预算、权限和停止条件"
  },
  {
    "slug": "multi-agent-handoff-workspace",
    "waylandChapters": [
      "16"
    ],
    "internalSources": [
      "server/app/domain/agent_runtime.py",
      "server/app/agent/enterprise_runtime.py"
    ],
    "officialSources": [
      "openai-agents-handoffs"
    ],
    "allowedClaims": "Handoff 传递任务、上下文和责任，不共享全部历史"
  },
  {
    "slug": "subagent-context-contracts",
    "waylandChapters": [
      "13",
      "16"
    ],
    "internalSources": [
      "server/app/domain/agent_runtime.py#SearchBranch",
      "server/app/agent/enterprise_runtime.py"
    ],
    "officialSources": [
      "multi-agent-design"
    ],
    "allowedClaims": "SubAgent 通过窄输入、结果契约和截止时间隔离上下文"
  },
  {
    "slug": "deep-research-agent",
    "waylandChapters": [
      "27"
    ],
    "internalSources": [
      "server/app/agent/enterprise_runtime.py#plan-research",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "openai-deep-research"
    ],
    "allowedClaims": "研究型 Agent 反复检索和补缺，必须限制轮数和来源范围"
  },
  {
    "slug": "research-synthesis-coverage",
    "waylandChapters": [
      "19",
      "27"
    ],
    "internalSources": [
      "server/app/domain/agent_runtime.py#EvidencePacket",
      "server/app/agent/enterprise_runtime.py#coverage",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "openai-deep-research"
    ],
    "allowedClaims": "覆盖率要对应问题维度，已知缺口不能伪装成已覆盖"
  },
  {
    "slug": "research-stop-citation-failure",
    "waylandChapters": [
      "19",
      "27"
    ],
    "internalSources": [
      "server/app/agent/enterprise_runtime.py#coverage-finalize",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "openai-deep-research"
    ],
    "allowedClaims": "停止由预算、覆盖、冲突和截止时间共同决定"
  },
  {
    "slug": "rag-strategy-map",
    "waylandChapters": [
      "01"
    ],
    "internalSources": [
      "agent开发文章.md#2",
      "server/app/rag/retrieval.py",
      "server/tests/test_retrieval.py"
    ],
    "officialSources": [
      "pgvector-docs"
    ],
    "allowedClaims": "按数据形态与失败代价选择 2-Step、混合或 Agentic RAG"
  },
  {
    "slug": "rag-ingestion-pipeline",
    "waylandChapters": [
      "01"
    ],
    "internalSources": [
      "agent开发文章.md#5",
      "server/app/ingestion/service.py",
      "server/tests/test_ingestion_service.py"
    ],
    "officialSources": [
      "object-storage-docs"
    ],
    "allowedClaims": "入库从准入、存储、解析、切片、向量化到发布"
  },
  {
    "slug": "document-parsing-block-chunking",
    "waylandChapters": [
      "01"
    ],
    "internalSources": [
      "server/app/ingestion/parsers.py",
      "server/app/ingestion/chunker.py",
      "server/tests/test_ingestion_parsers.py",
      "server/tests/test_ingestion_chunker.py"
    ],
    "officialSources": [
      "unstructured-docs"
    ],
    "allowedClaims": "解析先保留 Block 结构，再按语义和表格边界切片"
  },
  {
    "slug": "embedding-batch-idempotency",
    "waylandChapters": [
      "01"
    ],
    "internalSources": [
      "server/app/ingestion/embedding.py",
      "server/app/ingestion/service.py",
      "server/tests/test_ingestion_service.py"
    ],
    "officialSources": [
      "provider-embedding-docs"
    ],
    "allowedClaims": "批量向量化需要稳定 ID、重试与原子激活"
  },
  {
    "slug": "pgvector-index-recall",
    "waylandChapters": [
      "01"
    ],
    "internalSources": [
      "server/app/rag/retrieval.py",
      "server/tests/integration/test_retrieval_database.py"
    ],
    "officialSources": [
      "pgvector-docs"
    ],
    "allowedClaims": "索引参数影响候选召回，必须用查询集回归而非凭配置判断"
  },
  {
    "slug": "rag-query-rewrite-decomposition",
    "waylandChapters": [
      "10"
    ],
    "internalSources": [
      "agent开发文章.md#9",
      "server/app/domain/agent_runtime.py",
      "server/app/agent/enterprise_runtime.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "langchain-rag"
    ],
    "allowedClaims": "改写保留实体与范围，分解受分支数和截止时间限制"
  },
  {
    "slug": "hybrid-retrieval-rerank",
    "waylandChapters": [
      "10"
    ],
    "internalSources": [
      "agent开发文章.md#10",
      "server/app/rag/retrieval.py",
      "server/tests/test_retrieval.py"
    ],
    "officialSources": [
      "pgvector-docs"
    ],
    "allowedClaims": "精确、全文、向量、结构化候选融合后再重排"
  },
  {
    "slug": "rag-evidence-budget-cache",
    "waylandChapters": [
      "10",
      "19"
    ],
    "internalSources": [
      "agent开发文章.md#10-11",
      "server/app/agent/enterprise_runtime.py#select_relevant_evidence",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "cache-design"
    ],
    "allowedClaims": "Evidence 预算保留来源和覆盖，缓存键包含范围与版本"
  },
  {
    "slug": "knowledge-graph-wiki-alias",
    "waylandChapters": [
      "19"
    ],
    "internalSources": [
      "agent开发文章.md#7",
      "server/app/graph/service.py",
      "server/app/services/wiki.py",
      "server/tests/test_graph_service.py",
      "server/tests/test_wiki_service.py"
    ],
    "officialSources": [
      "knowledge-graph-docs"
    ],
    "allowedClaims": "Wiki 和 Alias 做确定性治理，图谱关系需有来源证据"
  },
  {
    "slug": "rag-acl-release-security",
    "waylandChapters": [
      "25",
      "26"
    ],
    "internalSources": [
      "agent开发文章.md#4,10,13",
      "server/app/rag/retrieval.py",
      "server/app/services/release.py",
      "server/tests/test_retrieval.py",
      "server/tests/test_release_service.py"
    ],
    "officialSources": [
      "owasp-llm",
      "postgres-rls"
    ],
    "allowedClaims": "ACL 和 Release 在检索前过滤，回答后仍做泄漏检查"
  },
  {
    "slug": "rag-evaluation-recall-mrr-ndcg",
    "waylandChapters": [
      "22"
    ],
    "internalSources": [
      "agent开发文章.md#15",
      "server/app/services/agent_eval.py",
      "server/tests/test_agent_eval.py"
    ],
    "officialSources": [
      "information-retrieval-metrics"
    ],
    "allowedClaims": "Recall、MRR、nDCG 衡量不同检索问题，评测集固定范围和版本"
  },
  {
    "slug": "claims-evidence-citations",
    "waylandChapters": [
      "19"
    ],
    "internalSources": [
      "agent开发文章.md#11",
      "server/app/domain/agent_runtime.py",
      "server/app/agent/enterprise_runtime.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "openai-citations"
    ],
    "allowedClaims": "Claim 与 Evidence 分开保存，引用必须直接支撑对应断言"
  },
  {
    "slug": "validation-repair-refusal",
    "waylandChapters": [
      "11",
      "19"
    ],
    "internalSources": [
      "agent开发文章.md#12",
      "server/app/agent/enterprise_runtime.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "owasp-llm"
    ],
    "allowedClaims": "验证失败只修可修项，越权或证据不足时拒答"
  },
  {
    "slug": "agent-security-trust-boundaries",
    "waylandChapters": [
      "24",
      "25"
    ],
    "internalSources": [
      "agent开发文章.md#13",
      "server/app/security/external_content.py",
      "server/tests/test_external_content_security.py"
    ],
    "officialSources": [
      "owasp-llm-top10"
    ],
    "allowedClaims": "输入、记忆、检索内容、工具结果按信任级别隔离"
  },
  {
    "slug": "agent-safe-execution-sandbox",
    "waylandChapters": [
      "25"
    ],
    "internalSources": [
      "server/app/agent/tools.py",
      "server/tests/test_agent_tools.py"
    ],
    "officialSources": [
      "container-security",
      "seccomp"
    ],
    "allowedClaims": "沙箱限制文件、网络、进程、资源和凭证，审批不能替代隔离"
  },
  {
    "slug": "agent-policy-governance",
    "waylandChapters": [
      "24"
    ],
    "internalSources": [
      "server/app/domain/agent_runtime.py#PolicyVersion",
      "server/app/services/governance.py",
      "server/tests/test_governance.py"
    ],
    "officialSources": [
      "opa-docs"
    ],
    "allowedClaims": "策略版本化、评测、Canary 灰度和回滚，模型不能修改治理规则"
  },
  {
    "slug": "multi-tenant-agent-design",
    "waylandChapters": [
      "26"
    ],
    "internalSources": [
      "server/app/rag/retrieval.py",
      "server/app/services/agent_admission.py",
      "server/tests/test_conversation_scope.py"
    ],
    "officialSources": [
      "postgres-rls"
    ],
    "allowedClaims": "租户隔离贯穿身份、状态、检索、缓存、事件和审计"
  },
  {
    "slug": "agent-evaluation-regression",
    "waylandChapters": [
      "22",
      "24"
    ],
    "internalSources": [
      "agent开发文章.md#15",
      "server/app/services/agent_eval.py",
      "server/tests/test_agent_eval.py"
    ],
    "officialSources": [
      "eval-design"
    ],
    "allowedClaims": "固定用例同时评估检索、回答、引用、安全和运行时"
  },
  {
    "slug": "agent-feedback-optimization",
    "waylandChapters": [
      "24"
    ],
    "internalSources": [
      "agent开发文章.md#15",
      "server/app/services/answer_feedback.py",
      "server/app/services/governance.py",
      "server/tests/test_answer_feedback.py"
    ],
    "officialSources": [
      "feedback-design"
    ],
    "allowedClaims": "反馈先结构化和评测，不能直接改 Prompt 或训练数据"
  },
  {
    "slug": "agent-runtime-domain-model",
    "waylandChapters": [
      "20"
    ],
    "internalSources": [
      "agent开发文章.md#3-4",
      "server/app/domain/agent_runtime.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "langgraph-runtime"
    ],
    "allowedClaims": "Conversation、Turn、Message、Event、Task 各有独立生命周期"
  },
  {
    "slug": "agent-request-lifecycle-runtime",
    "waylandChapters": [
      "20"
    ],
    "internalSources": [
      "agent开发文章.md#3-4",
      "server/app/agent/enterprise_runtime.py",
      "server/tests/test_agent_runtime_api.py"
    ],
    "officialSources": [
      "fastapi-docs"
    ],
    "allowedClaims": "HTTP 只创建和查询 Turn，长任务在运行时推进"
  },
  {
    "slug": "turn-idempotency-version-snapshot",
    "waylandChapters": [
      "20"
    ],
    "internalSources": [
      "agent开发文章.md#3-4",
      "server/app/repositories/agent_runtime.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "postgres-transactions"
    ],
    "allowedClaims": "幂等键防重复创建，Turn 固定 Release 和 Policy 快照"
  },
  {
    "slug": "celery-worker-ack-lease",
    "waylandChapters": [
      "20"
    ],
    "internalSources": [
      "server/app/worker.py",
      "server/app/services/agent_admission.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "celery-tasks"
    ],
    "allowedClaims": "ACK、租约和幂等共同处理重复投递与 Worker 崩溃"
  },
  {
    "slug": "deadline-cancel-checkpoint-recovery",
    "waylandChapters": [
      "21"
    ],
    "internalSources": [
      "agent开发文章.md#14",
      "server/app/agent/checkpoint.py",
      "server/app/services/agent_admission.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "temporal-retries"
    ],
    "allowedClaims": "截止时间、取消标记、检查点和恢复分别解决不同失败"
  },
  {
    "slug": "sse-events-replay-fallback",
    "waylandChapters": [
      "22"
    ],
    "internalSources": [
      "agent开发文章.md#14",
      "server/app/repositories/agent_runtime.py",
      "server/tests/test_agent_runtime_api.py"
    ],
    "officialSources": [
      "html-sse"
    ],
    "allowedClaims": "事件有递增序号，断线按游标重放，轮询只作降级"
  },
  {
    "slug": "temporal-workflow-patterns",
    "waylandChapters": [
      "21"
    ],
    "internalSources": [
      "server/app/agent/checkpoint.py",
      "server/tests/test_agent_runtime.py"
    ],
    "officialSources": [
      "temporal-workflows"
    ],
    "allowedClaims": "Workflow 代码需确定性，外部 I/O 放 Activity，版本演进可重放"
  },
  {
    "slug": "agent-production-architecture",
    "waylandChapters": [
      "20",
      "21"
    ],
    "internalSources": [
      "agent开发文章.md#4,17",
      "README.md",
      "deploy/compose.yml"
    ],
    "officialSources": [
      "fastapi-docs",
      "celery-docs",
      "postgres-docs"
    ],
    "allowedClaims": "API、运行时、Worker、存储和观测的职责与失败传播"
  },
  {
    "slug": "agent-trace-observability",
    "waylandChapters": [
      "22"
    ],
    "internalSources": [
      "agent开发文章.md#16",
      "server/app/observability.py",
      "server/app/repositories/qa_trace.py",
      "server/tests/test_observability.py"
    ],
    "officialSources": [
      "open-telemetry"
    ],
    "allowedClaims": "Trace 串起 Turn、节点、模型、工具、检索、验证与错误"
  },
  {
    "slug": "agent-token-budget-model-routing",
    "waylandChapters": [
      "23",
      "31"
    ],
    "internalSources": [
      "server/app/services/conversation_context.py",
      "server/app/services/model_resources.py",
      "server/tests/test_model_resources.py"
    ],
    "officialSources": [
      "openai-models"
    ],
    "allowedClaims": "预算按上下文和任务分配，路由记录版本、成本类和降级理由"
  },
  {
    "slug": "agent-harness-foundations",
    "waylandChapters": [
      "32"
    ],
    "internalSources": [
      "README.md",
      "agent开发文章.md#17"
    ],
    "officialSources": [
      "openai-agents",
      "harness-design"
    ],
    "allowedClaims": "Harness 统一工具、状态、上下文、权限、评测和运行时接口"
  },
  {
    "slug": "computer-use-agent",
    "waylandChapters": [
      "28"
    ],
    "internalSources": [
      "server/app/agent/tools.py"
    ],
    "officialSources": [
      "openai-computer-use"
    ],
    "allowedClaims": "Computer Use 依赖观察、动作、确认和隔离环境，页面内容不可信"
  },
  {
    "slug": "agentic-coding",
    "waylandChapters": [
      "29"
    ],
    "internalSources": [
      "server/app/agent/tools.py",
      "server/tests/test_agent_tools.py"
    ],
    "officialSources": [
      "openai-codex",
      "software-testing"
    ],
    "allowedClaims": "编码 Agent 的证据来自仓库、测试、差异和命令结果"
  },
  {
    "slug": "background-agent-scheduling",
    "waylandChapters": [
      "30"
    ],
    "internalSources": [
      "server/app/worker.py",
      "server/app/services/agent_admission.py"
    ],
    "officialSources": [
      "celery-periodic",
      "temporal-schedules"
    ],
    "allowedClaims": "后台任务必须有身份、幂等、预算、取消、审计和过期策略"
  },
  {
    "slug": "agent-harness-platform",
    "waylandChapters": [
      "32",
      "33"
    ],
    "internalSources": [
      "README.md",
      "server/app/agent/enterprise_runtime.py",
      "server/app/services/agent_eval.py"
    ],
    "officialSources": [
      "harness-design"
    ],
    "allowedClaims": "平台把工具协议、运行时、治理、评测和观测组合为可替换层"
  },
  {
    "slug": "knowledge-agent-capstone",
    "waylandChapters": [
      "01-33"
    ],
    "internalSources": [
      "README.md",
      "agent开发文章.md",
      "agent流程.md",
      "server/app/agent/",
      "server/app/rag/",
      "server/app/services/",
      "server/tests/"
    ],
    "officialSources": [
      "all-verified-sources"
    ],
    "allowedClaims": "从文档准入到回答交付的完整只读知识 Agent 链路"
  }
]
