export interface AiAgentStage {
  key: string
  label: string
  question: string
}

export interface AiAgentArticleSpec {
  stageKey: string
  slug: string
  title: string
  description: string
  tags: string[]
  dependsOn: string[]
  sourceKey: string
}

export const aiAgentStages: AiAgentStage[] = [
  { key: 'foundations', label: '模型与 Agent 基础', question: '模型怎样接收输入，Agent 又怎样把模型接入可控的行动循环？' },
  { key: 'tools', label: '工具与能力扩展', question: '模型提出动作以后，程序怎样安全地连接工具、MCP、Skill 和人工审批？' },
  { key: 'context-memory', label: '上下文、记忆与多轮对话', question: '有限上下文怎样装配，多轮状态和长期记忆怎样保存而不越权？' },
  { key: 'single-agent', label: '单 Agent 推理模式', question: 'Router、Planning、Reflection 等模式各自改变了哪一段控制流？' },
  { key: 'multi-agent', label: '多 Agent 编排', question: '任务拆给多个 Agent 后，状态、责任、失败和成本由谁管理？' },
  { key: 'research', label: '研究型 Agent', question: '多轮检索怎样判断覆盖度、停止研究并生成可核验的结论？' },
  { key: 'rag', label: 'RAG 知识工程', question: '文件怎样成为带权限、版本和来源的检索证据？' },
  { key: 'trust-safety', label: '可信、安全与治理', question: '怎样证明答案有依据，并限制 Agent 的权限、执行和策略变更？' },
  { key: 'runtime', label: 'Runtime 与生产架构', question: '长任务怎样处理幂等、队列、取消、恢复、事件和可观测性？' },
  { key: 'harness', label: 'Agent Harness 与前沿开发', question: 'Computer Use、编码和后台 Agent 怎样共享一套可靠运行底座？' },
  { key: 'capstone', label: '综合项目', question: '怎样把知识入库、检索、推理、验证和异步交付连成一套系统？' },
]

type ArticleInput = Omit<AiAgentArticleSpec, 'stageKey' | 'sourceKey'> & { sourceKey?: string }

function stage(stageKey: string, articles: ArticleInput[]): AiAgentArticleSpec[] {
  return articles.map((article) => ({
    ...article,
    stageKey,
    sourceKey: article.sourceKey ?? `ai-${article.slug}`,
  }))
}

const article = (
  slug: string,
  title: string,
  description: string,
  tags: string[],
  dependsOn: string[] = [],
): ArticleInput => ({ slug, title, description, tags, dependsOn })

export const aiAgentCurriculum: AiAgentArticleSpec[] = [
  ...stage('foundations', [
    article('llm-workflow-rag-agent', 'LLM、工作流、RAG 与 Agent 如何分工', '用同一个知识查询任务比较四条执行路径，先看清模型、检索、编排和运行时各自负责什么。', ['LLM', 'Workflow', 'RAG', 'Agent']),
    article('messages-tokens-context', 'Message、Token 与 Context：模型实际看到了什么', '从一条请求拆开消息角色、Token 计量、上下文装配、输出上限和停止原因。', ['Message', 'Token', 'Context'], ['llm-workflow-rag-agent']),
    article('python-openai-responses-first-call', '用 Python 调用一次 Responses API', '按真实调用顺序准备凭证、发送请求、读取输出和 usage，再处理流式事件与错误。', ['Python', 'OpenAI', 'Responses API'], ['messages-tokens-context']),
    article('structured-output-model-boundaries', '结构化输出只能约束格式，不能证明事实', '从 JSON Schema 和 Pydantic 校验走到权限、版本、证据与业务字段的服务端确认。', ['Structured Outputs', 'JSON Schema', 'Pydantic'], ['messages-tokens-context']),
    article('agent-essence-autonomy-boundaries', '什么是 Agent：自主性从哪里来，边界在哪里', '把 Agent 放回应用运行时，说明目标、状态、动作、观察和停止条件怎样形成有限自主性。', ['Agent', 'Autonomy', 'Runtime'], ['llm-workflow-rag-agent', 'structured-output-model-boundaries']),
    article('python-agent-loop-from-scratch', '什么是 Agent 循环', '不用框架实现一次有限循环，观察模型决策、工具执行、状态更新、终止和异常传播。', ['Agent Loop', 'Python', 'Tool Calling'], ['agent-essence-autonomy-boundaries', 'structured-output-model-boundaries']),
  ]),
  ...stage('tools', [
    article('tool-calling-contracts', 'Tool Calling：模型提议调用，程序负责执行', '拆开工具定义、调用候选、参数校验、可信上下文、执行结果和回传消息。', ['Tool Calling', 'Contract', 'JSON Schema'], ['python-agent-loop-from-scratch']),
    article('mcp-foundations-boundaries', 'MCP 是什么：它解决连接问题，不替代业务权限', '从 Host、Client、Server 和能力边界理解 MCP 与 Tool Calling、API、Skill 的关系。', ['MCP', 'Tool', 'Protocol'], ['tool-calling-contracts']),
    article('mcp-protocol-lifecycle', 'MCP 生命周期：从初始化到关闭', '沿连接、版本协商、能力发现、调用、进度、取消和关闭理解 JSON-RPC 消息怎样流动。', ['MCP', 'JSON-RPC', 'Lifecycle'], ['mcp-foundations-boundaries']),
    article('mcp-python-server-client', '用 Python 实现 MCP Server 与 Client', '实现一个只读搜索工具，并用进程内客户端验证发现、调用、参数错误和资源释放。', ['MCP', 'Python', 'Client Server'], ['mcp-protocol-lifecycle']),
    article('skill-system-progressive-disclosure', 'Skill 系统怎样按需提供任务知识', '说明 Skill 的触发、目录、渐进式披露和脚本资源怎样减少常驻上下文。', ['Skill', 'Progressive Disclosure', 'Context'], ['mcp-foundations-boundaries']),
    article('agent-hooks-events-approval', 'Hook、事件与人工审批怎样约束工具执行', '把观察、拦截、审批和审计放进工具调用前后，区分 Hook 与业务策略的职责。', ['Hook', 'Event', 'Approval'], ['tool-calling-contracts']),
  ]),
  ...stage('context-memory', [
    article('context-engineering-assembly-budget', '上下文工程：怎样装配一次模型输入', '把策略、当前问题、历史、记忆、检索证据和工具结果放进有限预算。', ['Context Engineering', 'Token Budget'], ['messages-tokens-context', 'tool-calling-contracts']),
    article('context-window-strategies', '上下文超限时怎样裁剪、滑窗和摘要', '比较保留最近消息、按优先级裁剪、滚动摘要和分层压缩的损失。', ['Context Window', 'Compression', 'Summary'], ['context-engineering-assembly-budget']),
    article('prompt-cache-prefix-design', 'Prompt Cache：稳定前缀怎样复用计算', '解释前缀匹配、缓存键、失效和隐私边界，并区分缓存与记忆。', ['Prompt Cache', 'Prefix', 'Cost'], ['context-engineering-assembly-budget']),
    article('memory-architecture-retrieval', 'Agent 记忆怎样写入、检索和遗忘', '区分会话摘要与长期记忆，建立来源、范围、置信度、过期和撤回规则。', ['Memory', 'Retrieval', 'TTL'], ['context-window-strategies']),
    article('multi-turn-conversation-design', '多轮对话怎样保存状态与处理指代', '从 Conversation、Message 和 Turn 的关系解释历史装配、焦点切换与并发消息。', ['Conversation', 'Turn', 'Coreference'], ['memory-architecture-retrieval']),
    article('context-pollution-injection', '上下文污染与间接提示注入', '追踪恶意内容怎样从文件、网页、记忆和工具结果进入模型输入，并在装配前隔离。', ['Prompt Injection', 'Trust Boundary', 'Context'], ['context-engineering-assembly-budget', 'multi-turn-conversation-design']),
  ]),
  ...stage('single-agent', [
    article('agent-router-mode-selection', 'Router 怎样选择执行模式和模型', '在调用模型前用任务类型、范围、时限和风险选择固定回答、快速检索或深度研究。', ['Router', 'Model Routing', 'Mode'], ['python-agent-loop-from-scratch']),
    article('agent-planner-search-plan', 'Planner 怎样把目标变成受限 SearchPlan', '让计划只描述目标、分支、范围、预算和停止条件，执行仍由运行时负责。', ['Planning', 'SearchPlan', 'Agent'], ['agent-router-mode-selection']),
    article('agent-reflection-repair', 'Reflection 怎样发现问题并做有限修复', '把可观察的验证结果反馈给修复步骤，限制轮数并保留原始证据。', ['Reflection', 'Repair', 'Validation'], ['agent-planner-search-plan']),
    article('chain-of-thought-boundaries', '推理过程应该保存什么，不应该依赖什么', '区分模型内部推理、可公开解释和运行时决策记录，避免把隐式思维当审计证据。', ['Reasoning', 'Chain of Thought', 'Trace'], ['python-agent-loop-from-scratch']),
    article('tree-of-thoughts-search', 'Tree of Thoughts 怎样搜索多条候选路径', '从候选生成、评分、剪枝和回溯理解树搜索，并给出预算耗尽时的终止方式。', ['Tree of Thoughts', 'Search', 'Pruning'], ['agent-planner-search-plan']),
    article('debate-pattern', 'Debate 模式怎样处理有证据的分歧', '让多个角色基于不同证据提出和质询观点，再由独立规则裁决，而不是简单多数投票。', ['Debate', 'Multi Agent', 'Evidence'], ['agent-reflection-repair']),
  ]),
  ...stage('multi-agent', [
    article('multi-agent-orchestration', '多 Agent 编排先解决责任和状态归属', '从单循环拆出多个角色，明确输入输出、共享状态、预算和失败责任。', ['Multi Agent', 'Orchestration', 'State'], ['agent-planner-search-plan']),
    article('multi-agent-dag-workflows', 'DAG 工作流怎样表达依赖与并行', '把稳定依赖画成有向无环图，处理扇出、汇合、部分失败和重试。', ['DAG', 'Workflow', 'Parallel'], ['multi-agent-orchestration']),
    article('multi-agent-swarm-pattern', 'Swarm 模式怎样在局部协作中保持全局约束', '说明去中心化选择带来的灵活性，以及预算、权限、重复工作和终止难题。', ['Swarm', 'Coordination', 'Budget'], ['multi-agent-orchestration']),
    article('multi-agent-handoff-workspace', 'Handoff 怎样移交任务、上下文和责任', '设计移交包、工作区和回收控制，让接收方知道目标、权限、进度与返回条件。', ['Handoff', 'Workspace', 'Context'], ['multi-agent-orchestration']),
    article('subagent-context-contracts', 'SubAgent 怎样隔离上下文并返回可合并结果', '用窄任务契约限制资料、工具和输出，处理超时、冲突与父任务取消。', ['SubAgent', 'Context Isolation', 'Contract'], ['multi-agent-handoff-workspace']),
  ]),
  ...stage('research', [
    article('deep-research-agent', 'Deep Research Agent 怎样组织多轮检索', '从问题拆解、并行搜索、来源审查到补缺，建立有预算的研究循环。', ['Deep Research', 'Search', 'Agent'], ['agent-planner-search-plan', 'multi-agent-dag-workflows']),
    article('research-synthesis-coverage', '研究综合怎样判断覆盖度与冲突', '把问题维度、证据包、已知缺口和冲突分开，再生成有范围的结论。', ['Research', 'Coverage', 'Synthesis'], ['deep-research-agent']),
    article('research-stop-citation-failure', '研究任务怎样停止并处理引用失败', '用覆盖、截止时间、轮数和边际收益停止循环，拒绝无法核对的关键结论。', ['Research', 'Citation', 'Stop Condition'], ['research-synthesis-coverage']),
  ]),
  ...stage('rag', [
    article('rag-strategy-map', 'RAG 策略怎样从固定检索升级到研究循环', '比较 2-Step、混合、纠正式和 Agentic RAG，按问题复杂度选择最小方案。', ['RAG', 'Retrieval', 'Agentic RAG'], ['llm-workflow-rag-agent']),
    article('rag-ingestion-pipeline', '文档怎样从上传进入可发布知识库', '沿准入、对象存储、解析、切片、向量化、校验和发布建立可重放入库链路。', ['RAG', 'Ingestion', 'Release'], ['rag-strategy-map']),
    article('document-parsing-block-chunking', '文档解析怎样保留 Block、表格与章节结构', '从 PDF、Office、HTML 和 Markdown 统一到 Block，再按语义边界生成可追溯 Chunk。', ['Parsing', 'Block', 'Chunking'], ['rag-ingestion-pipeline']),
    article('embedding-batch-idempotency', 'Embedding 批处理怎样保证幂等与原子激活', '说明稳定来源 ID、批次重试、失败补偿和候选版本切换怎样避免半成品。', ['Embedding', 'Batch', 'Idempotency'], ['document-parsing-block-chunking']),
    article('pgvector-index-recall', 'pgvector 索引怎样影响召回率', '从精确扫描建立基线，再比较 HNSW、IVFFlat、过滤条件和索引参数。', ['pgvector', 'HNSW', 'Recall'], ['embedding-batch-idempotency']),
    article('rag-query-rewrite-decomposition', '查询改写与问题分解怎样保留原意', '在实体、时间和权限范围不变的前提下生成多路查询，并限制分支膨胀。', ['Query Rewrite', 'Decomposition', 'SearchPlan'], ['agent-planner-search-plan', 'rag-strategy-map']),
    article('hybrid-retrieval-rerank', '混合检索怎样召回、融合与重排', '把精确、全文、向量和结构化检索放进同一候选链，解释 RRF 和 Rerank 的位置。', ['Hybrid Retrieval', 'RRF', 'Rerank'], ['pgvector-index-recall', 'rag-query-rewrite-decomposition']),
    article('rag-evidence-budget-cache', 'Evidence 预算与检索缓存怎样设计', '按问题覆盖选择证据，缓存键同时包含查询、权限范围、知识版本和检索配置。', ['Evidence', 'Cache', 'Budget'], ['hybrid-retrieval-rerank']),
    article('knowledge-graph-wiki-alias', '知识图谱、Wiki 与 Alias 分别解决什么', '用确定性别名治理查询，用带来源关系扩展检索，不把语义猜测冒充事实。', ['Knowledge Graph', 'Wiki', 'Alias'], ['hybrid-retrieval-rerank']),
    article('rag-acl-release-security', 'RAG 怎样同时约束 ACL 与知识版本', '检索前固定用户范围和 Release，缓存、重排、引用和输出继续保留同一边界。', ['ACL', 'Release', 'RAG Security'], ['rag-evidence-budget-cache']),
    article('rag-evaluation-recall-mrr-ndcg', '怎样用 Recall、MRR 与 nDCG 评估检索', '从带标注查询集计算三个指标，分析无答案问题、过滤条件和版本回归。', ['RAG Evaluation', 'Recall', 'MRR', 'nDCG'], ['hybrid-retrieval-rerank']),
  ]),
  ...stage('trust-safety', [
    article('claims-evidence-citations', 'Claim、Evidence 与 Citation 怎样对应', '把答案拆成原子断言，让每条事实绑定用户可见证据和准确位置。', ['Claim', 'Evidence', 'Citation'], ['rag-evidence-budget-cache']),
    article('validation-repair-refusal', '答案验证、有限修复与安全拒答', '沿事实、引用、权限、隐私和新鲜度检查答案，只修可修问题。', ['Validation', 'Repair', 'Refusal'], ['claims-evidence-citations', 'agent-reflection-repair']),
    article('agent-security-trust-boundaries', 'Agent 安全从信任边界开始', '区分系统策略、用户输入、记忆、检索内容和工具结果的信任等级。', ['Security', 'Trust Boundary', 'Prompt Injection'], ['context-pollution-injection', 'tool-calling-contracts']),
    article('agent-safe-execution-sandbox', '安全执行怎样限制文件、网络与进程', '把沙箱、最小权限、资源配额和人工确认组合起来约束有副作用的工具。', ['Sandbox', 'Least Privilege', 'Approval'], ['agent-security-trust-boundaries', 'agent-hooks-events-approval']),
    article('agent-policy-governance', 'Agent 策略怎样版本化、灰度与回滚', '将模型、提示、工具、预算和质量门禁保存为不可变策略版本。', ['Policy', 'Governance', 'Canary'], ['validation-repair-refusal']),
    article('multi-tenant-agent-design', '多租户 Agent 怎样隔离身份、状态与证据', '让租户边界贯穿认证、Turn、检索、缓存、事件、工具和审计。', ['Multi Tenant', 'Isolation', 'ACL'], ['agent-security-trust-boundaries', 'rag-acl-release-security']),
    article('agent-evaluation-regression', 'Agent Eval 怎样覆盖检索、回答与运行时', '用固定用例同时检查范围、召回、引用、拒答、终态和恢复。', ['Agent Eval', 'Regression', 'Quality Gate'], ['validation-repair-refusal', 'rag-evaluation-recall-mrr-ndcg']),
    article('agent-feedback-optimization', '用户反馈怎样进入可控优化流程', '把采纳、拒绝、原因和纠正转成评测数据，再经过 Challenger、Canary 和回滚。', ['Feedback', 'Optimization', 'Canary'], ['agent-evaluation-regression', 'agent-policy-governance']),
  ]),
  ...stage('runtime', [
    article('agent-runtime-domain-model', 'Agent Runtime 的领域模型怎样拆分', '区分 Conversation、Turn、Message、Event、Task、Release 和 Policy 的状态与所有权。', ['Runtime', 'Turn', 'Domain Model'], ['python-agent-loop-from-scratch']),
    article('agent-request-lifecycle-runtime', '一次 Agent 请求怎样穿过 API 与 Runtime', '从创建 Turn 到异步执行、持久化事件和读取终态，解释每层职责。', ['Request Lifecycle', 'API', 'Runtime'], ['agent-runtime-domain-model']),
    article('turn-idempotency-version-snapshot', 'Turn 怎样保证幂等并固定版本快照', '用幂等键处理重复请求，并在开始时固定知识 Release、Policy 和权限范围。', ['Turn', 'Idempotency', 'Snapshot'], ['agent-request-lifecycle-runtime']),
    article('celery-worker-ack-lease', 'Celery Worker 怎样处理 ACK、Lease 与重复投递', '说明队列至少一次投递下，任务领取、续租、确认和幂等如何配合。', ['Celery', 'ACK', 'Lease'], ['turn-idempotency-version-snapshot']),
    article('deadline-cancel-checkpoint-recovery', 'Deadline、取消、Checkpoint 与恢复怎样配合', '区分超时、主动取消、进程崩溃和重试，设计可恢复且不重复副作用的路径。', ['Deadline', 'Cancellation', 'Checkpoint'], ['celery-worker-ack-lease']),
    article('sse-events-replay-fallback', 'SSE 事件怎样支持断线重放与轮询降级', '用递增序号持久化事件，按 Last-Event-ID 重放，并在流式连接失败时查询终态。', ['SSE', 'Replay', 'Event'], ['agent-request-lifecycle-runtime']),
    article('temporal-workflow-patterns', 'Temporal 怎样执行可恢复的长流程', '区分 Workflow 与 Activity，解释事件历史、重试、Signal、Query 和版本演进。', ['Temporal', 'Workflow', 'Activity'], ['deadline-cancel-checkpoint-recovery']),
    article('agent-production-architecture', '生产 Agent 的组件职责与失败传播', '把 API、运行时、Worker、模型、检索、数据库、对象存储和观测放进同一架构。', ['Architecture', 'Agent', 'Production'], ['agent-request-lifecycle-runtime', 'rag-acl-release-security']),
    article('agent-trace-observability', 'Trace 怎样串起模型、检索、工具与验证', '设计跨节点 Trace 和指标，区分延迟、错误、质量与资源问题。', ['Trace', 'Observability', 'Metrics'], ['agent-production-architecture']),
    article('agent-token-budget-model-routing', 'Token 预算与模型路由怎样共同控制成本', '按任务阶段分配输入输出预算，再根据能力、时限和风险选择模型与降级路径。', ['Token Budget', 'Model Routing', 'Cost'], ['agent-router-mode-selection', 'agent-trace-observability']),
  ]),
  ...stage('harness', [
    article('agent-harness-foundations', 'Agent Harness 是什么', '说明 Harness 怎样统一模型、工具、上下文、状态、权限、运行时、评测和观测接口。', ['Agent Harness', 'Runtime', 'Platform'], ['agent-production-architecture']),
    article('computer-use-agent', 'Computer Use Agent 怎样观察并操作界面', '把截图或 DOM 观察、动作提议、确认、执行和重新观察组成受控循环。', ['Computer Use', 'Vision', 'Sandbox'], ['agent-harness-foundations', 'agent-safe-execution-sandbox']),
    article('agentic-coding', '编码 Agent 怎样从仓库证据走到验证结果', '沿读取约束、定位代码、修改、测试和审查解释代码 Agent 的控制流。', ['Agentic Coding', 'Testing', 'Repository'], ['agent-harness-foundations']),
    article('background-agent-scheduling', 'Background Agent 怎样调度长时间任务', '为后台任务定义身份、触发器、幂等、预算、取消、过期和通知。', ['Background Agent', 'Scheduling', 'Worker'], ['agent-harness-foundations', 'celery-worker-ack-lease']),
    article('agent-harness-platform', '怎样把 Agent Harness 做成可治理的平台', '将协议适配、运行时、沙箱、策略、评测和可观测性做成可替换的平台层。', ['Agent Harness', 'Platform', 'Governance'], ['agent-harness-foundations', 'agent-policy-governance']),
  ]),
  ...stage('capstone', [
    article('knowledge-agent-capstone', '综合项目：实现一个可信的知识 Agent', '从文档入库开始，串起检索、Agent 循环、证据验证、异步运行和前端交付。', ['Knowledge Agent', 'RAG', 'Runtime'], ['rag-acl-release-security', 'agent-evaluation-regression', 'agent-production-architecture']),
  ]),
]

if (aiAgentCurriculum.length !== 67) {
  throw new Error(`AI/Agent curriculum must contain 67 articles, got ${aiAgentCurriculum.length}`)
}
