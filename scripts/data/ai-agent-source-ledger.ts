import fs from 'node:fs'
import path from 'node:path'
import { aiAgentCurriculum, type AiAgentArticleSpec } from '../../.vitepress/ai-agent-curriculum'

/**
 * This ledger is deliberately kept in the blog repository as a redacted
 * evidence index. Paths are relative to the read-only tp-knowledge checkout;
 * no private checkout path, prompt, table name or user data is published in
 * an article.
 */
export interface KnowledgeEvidence {
  sourcePaths: string[]
  symbols: string[]
  testPaths: string[]
  headingTerms: string[]
  claim: string
}

export interface AiAgentSourceLedgerEntry {
  slug: string
  sourceKey: string
  coverageKeys: string[]
  waylandChapters: number[]
  waylandTopics: string[]
  waylandChapterTitles: string[]
  appendixTopics: string[]
  knowledgeEvidence: KnowledgeEvidence[]
  officialEvidence: string[]
  allowedClaims: string[]
  avoidClaims: string[]
  headingAnchors: string[]
}

type EvidenceRule = Omit<KnowledgeEvidence, 'headingTerms'> & {
  prefix: string
  headingTerms: string[]
}

const waylandChapterTitles: Record<number, string> = {
  1: 'Agent 的本质',
  2: 'ReAct 循环',
  3: '工具调用基础',
  4: 'MCP 协议详解',
  5: 'Skills 技能系统',
  6: 'Hooks 与事件系统',
  7: '上下文工程',
  8: '记忆架构',
  9: '多轮对话设计',
  10: 'Planning 模式',
  11: 'Reflection 模式',
  12: 'Chain-of-Thought',
  13: '编排基础',
  14: 'DAG 工作流',
  15: 'Swarm 模式',
  16: 'Handoff 机制',
  17: 'Tree-of-Thoughts',
  18: 'Debate 模式',
  19: 'Research-Synthesis',
  20: '三层架构设计',
  21: 'Temporal 工作流',
  22: '可观测性',
  23: 'Token 预算控制',
  24: '策略治理',
  25: '安全执行',
  26: '多租户设计',
  27: 'Deep Research',
  28: 'Computer Use',
  29: 'Agentic Coding',
  30: 'Background Agents',
  31: '分层模型策略',
  32: 'OpenClaw 时代',
  33: 'Building on the Harness',
  34: '从 DAG 到 Agent Loop',
  35: '上下文压缩',
  36: 'Tool Result 预算与外溢',
  37: '分层压缩',
  38: 'Deferred Tool Loading 与 Tool Search',
  39: 'Prompt Cache 稳定性',
  40: '持久化 Agent Loop',
  41: '运行中操控 Agent',
  42: 'Agent 超时与 Watchdog',
  43: '卡循环检测',
  44: '并行工具执行',
  45: 'Computer Use 上下文管理',
}

const appendixTitles: Record<string, string> = {
  'appendix-terminology': '附录 A：术语表',
  'appendix-pattern-selection': '附录 B：模式选择指南',
  'appendix-engineering-faq': '附录 C：常见问题 FAQ',
}

const fallbackChapters: Record<string, number[]> = {
  foundations: [1, 2, 3],
  tools: [3, 4, 5, 6],
  'context-memory': [7, 8, 9, 35, 36, 37, 38, 39],
  'single-agent': [10, 11, 12, 17, 18],
  'multi-agent-research': [13, 14, 15, 16, 19, 27],
  rag: [19, 27],
  'trust-safety': [20, 24, 25, 26],
  runtime: [20, 21, 34, 40, 41, 42, 43, 44],
  production: [20, 22, 23, 30, 31],
  harness: [28, 29, 30, 32, 33, 45],
  capstone: [20, 27, 34],
}

const officialUrls: Record<string, string> = {
  'official-model-input': 'https://developers.openai.com/api/docs/guides/text',
  'official-responses-api': 'https://developers.openai.com/api/docs/api-reference/responses',
  'official-structured-output': 'https://developers.openai.com/api/docs/guides/structured-outputs',
  'official-embedding': 'https://developers.openai.com/api/docs/guides/embeddings',
  'official-rag-patterns': 'https://python.langchain.com/docs/concepts/retrieval/',
  'official-mcp-lifecycle': 'https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle',
  'official-mcp-python': 'https://py.sdk.modelcontextprotocol.io/',
  'official-agent-skills': 'https://agentskills.io/skill-creation/quickstart',
  'official-tool-search': 'https://developers.openai.com/api/docs/guides/tools-tool-search',
  'official-reasoning-boundary': 'https://developers.openai.com/api/docs/guides/reasoning',
  'official-pgvector': 'https://github.com/pgvector/pgvector',
  'official-ranking-metrics': 'https://scikit-learn.org/stable/modules/generated/sklearn.metrics.ndcg_score.html',
  'official-sandboxing': 'https://docs.wasmtime.dev/',
  'official-temporal': 'https://docs.temporal.io/develop/python',
  'official-computer-use': 'https://developers.openai.com/api/docs/guides/tools-computer-use',
  'official-prompt-cache': 'https://developers.openai.com/api/docs/guides/prompt-caching',
}

const evidenceRules: EvidenceRule[] = [
  {
    prefix: 'kb-parallel',
    sourcePaths: ['server/app/agent/enterprise_runtime.py', 'server/app/rag/retrieval.py'],
    symbols: ['_race_retrieval_channels', 'HybridRetriever'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/test_retrieval.py'],
    headingTerms: ['并行', '合并', '部分失败'],
    claim: '并行只重叠等待时间，结果仍需按稳定身份合并并处理部分失败。',
  },
  {
    prefix: 'kb-citation',
    sourcePaths: ['server/app/agent/enterprise_runtime.py', 'server/app/agent/enterprise_prompts.py'],
    symbols: ['evidence_references', 'supported_claim_evidence_ids'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/test_qa_trace.py'],
    headingTerms: ['引用', '证据', '停止'],
    claim: '引用失败和证据缺口需要进入显式拒答或有限修复，不由生成文本掩盖。',
  },
  {
    prefix: 'kb-rag-strategy',
    sourcePaths: ['server/app/ingestion/service.py', 'server/app/rag/retrieval.py'],
    symbols: ['IngestionService', 'HybridRetriever'],
    testPaths: ['server/tests/test_ingestion_service.py', 'server/tests/test_retrieval.py'],
    headingTerms: ['RAG', '检索', '策略'],
    claim: 'RAG 同时包含离线入库和在线检索，检索策略不能脱离版本与权限。',
  },
  {
    prefix: 'kb-retrieval-eval',
    sourcePaths: ['server/app/services/agent_eval.py', 'server/app/rag/retrieval.py'],
    symbols: ['AgentEvalService', 'HybridRetriever'],
    testPaths: ['server/tests/test_agent_eval.py', 'server/tests/test_retrieval.py'],
    headingTerms: ['Recall', 'MRR', 'nDCG'],
    claim: '检索评测需要固定查询、相关性标注、范围和版本，再解释排序指标。',
  },
  {
    prefix: 'kb-runtime-domain',
    sourcePaths: ['server/app/domain/agent_runtime.py', 'server/app/repositories/agent_runtime.py'],
    symbols: ['AgentRuntimeState', 'AgentRuntimeRepository'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/integration/test_agent_runtime_database.py'],
    headingTerms: ['领域模型', '状态', '生命周期'],
    claim: 'Runtime 领域对象、状态归属和持久化边界以源码与运行时测试为准。',
  },
  {
    prefix: 'kb-runtime',
    sourcePaths: ['server/app/agent/enterprise_runtime.py', 'server/app/api/agent_runtime.py'],
    symbols: ['EnterpriseState', 'EnterpriseAgentRuntime', 'execute_enterprise_turn'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/test_agent_runtime_api.py'],
    headingTerms: ['运行时', '执行', '状态'],
    claim: 'Runtime 负责状态快照、阶段执行、事件记录和终态控制，模型只产生候选。',
  },
  {
    prefix: 'kb-turn',
    sourcePaths: ['server/app/domain/agent_runtime.py', 'server/app/repositories/agent_runtime.py'],
    symbols: ['Turn', 'AgentRuntimeRepository'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/test_agent_runtime_api.py'],
    headingTerms: ['Turn', '幂等', '快照'],
    claim: 'Turn 的身份、版本与幂等字段由运行时和仓储共同维护。',
  },
  {
    prefix: 'kb-checkpoint',
    sourcePaths: ['server/app/agent/checkpoint.py', 'server/app/agent/enterprise_runtime.py'],
    symbols: ['CheckpointStore', 'persist_checkpoint'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/integration/test_agent_runtime_database.py'],
    headingTerms: ['检查点', '恢复', '重入'],
    claim: '检查点用于恢复边界，恢复仍需重新经过版本、权限与幂等检查。',
  },
  {
    prefix: 'kb-tool',
    sourcePaths: ['server/app/agent/tools.py', 'server/app/agent/enterprise_runtime.py'],
    symbols: ['build_tools', 'tool_call'],
    testPaths: ['server/tests/test_agent_tools.py', 'server/tests/test_agent_runtime.py'],
    headingTerms: ['工具', '参数', '校验'],
    claim: '工具目录、参数校验和执行回执由程序控制，工具调用提议不等于执行。',
  },
  {
    prefix: 'kb-mcp',
    sourcePaths: ['server/app/services/mcp.py', 'server/app/integrations/mcp_client.py', 'server/app/domain/mcp.py'],
    symbols: ['MCPService', 'MCPClientConfig'],
    testPaths: ['server/tests/test_mcp_service.py', 'server/tests/test_remote_mcp_client.py'],
    headingTerms: ['MCP', '初始化', '调用'],
    claim: 'MCP 的服务配置、客户端连接和能力目录由协议适配层负责，业务授权仍在应用运行时。',
  },
  {
    prefix: 'kb-context',
    sourcePaths: ['server/app/services/conversation_context.py', 'server/app/agent/enterprise_runtime.py'],
    symbols: ['ConversationContextService', 'EnterpriseState'],
    testPaths: ['server/tests/test_conversation_context.py', 'server/tests/test_agent_runtime.py'],
    headingTerms: ['上下文', '预算', '装配'],
    claim: '上下文是一次调用的装配视图，应用负责裁剪、版本和可信字段。',
  },
  {
    prefix: 'kb-conversation',
    sourcePaths: ['server/app/services/conversation_context.py', 'server/app/repositories/conversations.py'],
    symbols: ['ConversationContextService', 'ConversationRepository'],
    testPaths: ['server/tests/test_conversation_context.py', 'server/tests/integration/test_conversation_memory_database.py'],
    headingTerms: ['会话', '多轮', '指代'],
    claim: '会话、Turn 与 Message 的保存和读取由应用持久化，不由模型自动记忆。',
  },
  {
    prefix: 'kb-user-memory',
    sourcePaths: ['server/app/services/user_memory.py', 'server/app/repositories/user_memory.py'],
    symbols: ['UserMemoryService', 'UserMemoryRepository'],
    testPaths: ['server/tests/test_user_memory.py', 'server/tests/integration/test_conversation_memory_database.py'],
    headingTerms: ['记忆', '检索', '撤回'],
    claim: '长期记忆需要来源、范围、更新和删除策略，不能等同于当前上下文。',
  },
  {
    prefix: 'kb-untrusted',
    sourcePaths: ['server/app/agent/enterprise_runtime.py', 'server/app/security/external_content.py'],
    symbols: ['detect_prompt_injection', 'ExternalContentSecurity'],
    testPaths: ['server/tests/test_external_content_security.py', 'server/tests/test_agent_runtime.py'],
    headingTerms: ['注入', '信任', '污染'],
    claim: '外部内容进入上下文前要标记来源和风险，不能提升为系统策略。',
  },
  {
    prefix: 'kb-file',
    sourcePaths: ['server/app/ingestion/domain.py', 'server/app/ingestion/service.py'],
    symbols: ['DocumentManifest', 'IngestionService'],
    testPaths: ['server/tests/test_ingestion_service.py', 'server/tests/integration/test_ingestion_database.py'],
    headingTerms: ['文件', '准入', '上传'],
    claim: '文件准入、来源清单和版本状态在入库入口确定，失败不会直接激活索引。',
  },
  {
    prefix: 'kb-object',
    sourcePaths: ['server/app/integrations/storage.py', 'server/app/ingestion/service.py'],
    symbols: ['StorageClient', 'document_source_from_file'],
    testPaths: ['server/tests/test_ingestion_service.py', 'server/tests/integration/test_storage_integration.py'],
    headingTerms: ['对象存储', 'Manifest', '清理'],
    claim: '对象字节、上传记录和清理任务需要通过稳定 ID 与生命周期关联。',
  },
  {
    prefix: 'kb-document',
    sourcePaths: ['server/app/ingestion/parsers.py', 'server/app/ingestion/parser_service.py'],
    symbols: ['parse_document', 'DocumentParser'],
    testPaths: ['server/tests/test_ingestion_parsers.py', 'server/tests/test_ingestion_ocr.py'],
    headingTerms: ['解析', '文档', '格式'],
    claim: '多格式解析将输入转为带来源和警告的统一内容，不把解析失败伪装为空文档。',
  },
  {
    prefix: 'kb-ocr',
    sourcePaths: ['server/app/ingestion/parser_service.py', 'server/app/ingestion/parsers.py'],
    symbols: ['DocumentOCRRequiredError', 'VisionOCRClient'],
    testPaths: ['server/tests/test_ingestion_ocr.py', 'server/tests/integration/test_bailian_ocr.py'],
    headingTerms: ['OCR', '扫描', '失败'],
    claim: '扫描文档需要显式 OCR 能力和失败状态，OCR 不可用时按边界关闭。',
  },
  {
    prefix: 'kb-parsed',
    sourcePaths: ['server/app/ingestion/domain.py', 'server/app/ingestion/parsers.py'],
    symbols: ['ParsedContent', 'CoverageManifest'],
    testPaths: ['server/tests/test_ingestion_parsers.py', 'server/tests/test_ingestion_chunker.py'],
    headingTerms: ['Block', '结构', '来源'],
    claim: '解析产物保留结构和覆盖统计，显示文本与检索文本可以承担不同职责。',
  },
  {
    prefix: 'kb-block',
    sourcePaths: ['server/app/ingestion/domain.py', 'server/app/ingestion/chunker.py'],
    symbols: ['ChunkRecord', 'Chunker'],
    testPaths: ['server/tests/test_ingestion_chunker.py', 'server/tests/test_ingestion_parsers.py'],
    headingTerms: ['Block', '章节', '来源'],
    claim: 'Block 和 Chunk 保留章节、页码、邻接及稳定来源信息。',
  },
  {
    prefix: 'kb-chunk',
    sourcePaths: ['server/app/ingestion/chunker.py', 'server/app/ingestion/domain.py'],
    symbols: ['Chunker', 'ChunkRecord'],
    testPaths: ['server/tests/test_ingestion_chunker.py', 'server/tests/test_ingestion_service.py'],
    headingTerms: ['切块', 'Chunk', '质量'],
    claim: '切块边界、长度、重复和邻接关系需要通过质量测试回归。',
  },
  {
    prefix: 'kb-semantic',
    sourcePaths: ['server/app/ingestion/chunker.py'],
    symbols: ['Chunker'],
    testPaths: ['server/tests/test_ingestion_chunker.py'],
    headingTerms: ['语义', '边界', '邻接'],
    claim: '语义切块以结构边界和长度约束共同决定，不依赖单一字符数。',
  },
  {
    prefix: 'kb-table',
    sourcePaths: ['server/app/ingestion/parsers.py', 'server/app/ingestion/chunker.py'],
    symbols: ['_markdown_table', 'Chunker'],
    testPaths: ['server/tests/test_ingestion_parsers.py', 'server/tests/test_ingestion_chunker.py'],
    headingTerms: ['表格', '字段', '行'],
    claim: '表格保留表头和字段关系，超大表需要结构化拆分而不是丢掉列语义。',
  },
  {
    prefix: 'kb-embedding',
    sourcePaths: ['server/app/ingestion/embedding.py', 'server/app/ingestion/domain.py'],
    symbols: ['EmbeddingService', 'ChunkRecord'],
    testPaths: ['server/tests/test_ingestion_service.py', 'server/tests/integration/test_ingestion_database.py'],
    headingTerms: ['Embedding', '向量', '批'],
    claim: 'Embedding 任务保存模型、维度、版本和失败状态，批处理可以重试但必须幂等。',
  },
  {
    prefix: 'kb-staged',
    sourcePaths: ['server/app/ingestion/repository.py', 'server/app/ingestion/node.py'],
    symbols: ['IngestionRepository', 'NodeIngestionRepository'],
    testPaths: ['server/tests/test_reindex.py', 'server/tests/integration/test_release_database.py'],
    headingTerms: ['候选', '阶段', '激活'],
    claim: '候选版本先校验再激活，旧活动版本在候选失败时继续服务。',
  },
  {
    prefix: 'kb-release',
    sourcePaths: ['server/app/ingestion/repository.py', 'server/app/services/release.py'],
    symbols: ['activate_version', 'ReleaseService'],
    testPaths: ['server/tests/test_release_service.py', 'server/tests/integration/test_release_database.py'],
    headingTerms: ['Release', '版本', '回滚'],
    claim: 'Release 快照和原子激活把在线检索与候选构建隔离开。',
  },
  {
    prefix: 'kb-vector',
    sourcePaths: ['server/app/rag/retrieval.py', 'server/app/repositories/node.py'],
    symbols: ['HybridRetriever', 'SearchCandidate'],
    testPaths: ['server/tests/test_retrieval.py', 'server/tests/integration/test_retrieval_database.py'],
    headingTerms: ['向量', '距离', '召回'],
    claim: '向量候选必须带版本和权限过滤，距离分数不能替代事实或 ACL 判断。',
  },
  {
    prefix: 'kb-query',
    sourcePaths: ['server/app/agent/enterprise_runtime.py', 'server/app/rag/retrieval.py'],
    symbols: ['planned_queries', 'query_terms'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/test_retrieval.py'],
    headingTerms: ['查询', '意图', '范围'],
    claim: '查询理解和改写产生结构化条件，实体、时间和范围不能在改写中漂移。',
  },
  {
    prefix: 'kb-exact',
    sourcePaths: ['server/app/rag/retrieval.py'],
    symbols: ['exact_query_terms', 'identifier_query_terms'],
    testPaths: ['server/tests/test_retrieval.py'],
    headingTerms: ['精确', '编号', '结构化'],
    claim: '精确标识和业务编号优先走确定性查询，不能被向量相似度替代。',
  },
  {
    prefix: 'kb-sparse',
    sourcePaths: ['server/app/rag/retrieval.py'],
    symbols: ['strict_sparse_query', 'relaxed_sparse_queries'],
    testPaths: ['server/tests/test_retrieval.py'],
    headingTerms: ['全文', '稀疏', '放宽'],
    claim: '全文检索保留严格与受控放宽路径，空结果需要区分无匹配与服务失败。',
  },
  {
    prefix: 'kb-dense',
    sourcePaths: ['server/app/rag/retrieval.py'],
    symbols: ['HybridRetriever', 'SearchCandidate'],
    testPaths: ['server/tests/test_retrieval.py'],
    headingTerms: ['向量', 'Top K', '过滤'],
    claim: '稠密检索返回候选，需结合元数据、权限和邻接补全后才可作为证据。',
  },
  {
    prefix: 'kb-hybrid',
    sourcePaths: ['server/app/rag/retrieval.py'],
    symbols: ['HybridRetriever', 'fuse_candidates'],
    testPaths: ['server/tests/test_retrieval.py', 'server/tests/integration/test_retrieval_database.py'],
    headingTerms: ['检索', '查询', '证据'],
    claim: '混合检索通过候选身份、融合、重排和超时处理合并多通道结果。',
  },
  {
    prefix: 'kb-rerank',
    sourcePaths: ['server/app/rag/retrieval.py'],
    symbols: ['rerank_document', 'HybridRetriever.rerank'],
    testPaths: ['server/tests/test_retrieval.py'],
    headingTerms: ['重排', '分数', '超时'],
    claim: '重排改变候选顺序，不改变来源身份、权限和发布版本。',
  },
  {
    prefix: 'kb-evidence',
    sourcePaths: ['server/app/agent/enterprise_runtime.py', 'server/app/agent/enterprise_prompts.py'],
    symbols: ['select_relevant_evidence', 'evidence_payload'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/test_qa_trace.py'],
    headingTerms: ['Evidence', '证据', '预算'],
    claim: 'Evidence 选择保留来源、版本、权限和覆盖信息，候选相似度不等于可引用证据。',
  },
  {
    prefix: 'kb-claim',
    sourcePaths: ['server/app/agent/enterprise_runtime.py'],
    symbols: ['Claim', 'supported_claim_evidence_ids', 'claim_is_directly_supported'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/test_agent_eval.py'],
    headingTerms: ['Claim', '断言', '引用'],
    claim: '回答断言必须能回到当前可见 Evidence，证据不足时进入修复或拒答。',
  },
  {
    prefix: 'kb-answer',
    sourcePaths: ['server/app/agent/enterprise_runtime.py', 'server/app/agent/enterprise_prompts.py'],
    symbols: ['deterministic_claim_answer', 'deterministic_factual_issues', 'repair_payload'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/test_qa_trace.py'],
    headingTerms: ['答案', '验证', '拒答'],
    claim: '答案验证和有限修复由确定性规则约束，不能用模型总结覆盖缺失证据。',
  },
  {
    prefix: 'kb-graph',
    sourcePaths: ['server/app/graph/service.py', 'server/app/domain/graph.py'],
    symbols: ['KnowledgeGraphService', 'stable_id', 'expand_for_retrieval'],
    testPaths: ['server/tests/test_graph_service.py', 'server/tests/integration/test_graph_database.py'],
    headingTerms: ['图谱', '节点', '关系'],
    claim: '图谱节点、边、来源和构建版本由图服务保存，图扩展失败可回退普通检索。',
  },
  {
    prefix: 'kb-wiki',
    sourcePaths: ['server/app/services/wiki.py', 'server/app/domain/wiki.py'],
    symbols: ['WikiService', 'automatic_title_aliases', 'card_confidence'],
    testPaths: ['server/tests/test_wiki_service.py', 'server/tests/integration/test_wiki_database.py'],
    headingTerms: ['检索', 'Wiki', '路由'],
    claim: 'Wiki Card、摘要和主题是可治理派生视图，必须保留来源、版本和人工锁定边界。',
  },
  {
    prefix: 'kb-alias',
    sourcePaths: ['server/app/services/wiki.py', 'server/app/services/governance.py'],
    symbols: ['search_terms', 'distinctive_alias', 'GovernanceService'],
    testPaths: ['server/tests/test_wiki_service.py', 'server/tests/test_governance.py'],
    headingTerms: ['Alias', '归一化', '歧义'],
    claim: 'Alias 归一化解决写法差异，冲突时必须保留候选并拒绝猜测。',
  },
  {
    prefix: 'kb-rag-acl',
    sourcePaths: ['server/app/rag/retrieval.py', 'server/app/graph/service.py'],
    symbols: ['_visible_cached_candidates', '_acl_sql'],
    testPaths: ['server/tests/test_retrieval.py', 'server/tests/test_conversation_scope.py'],
    headingTerms: ['ACL', '权限', '范围'],
    claim: 'ACL 贯穿路由、检索、缓存、图扩展和回答验证，不能只在页面层过滤。',
  },
  {
    prefix: 'kb-scope',
    sourcePaths: ['server/app/services/conversation_context.py', 'server/app/api/auth.py'],
    symbols: ['ConversationScope', 'AuthContext'],
    testPaths: ['server/tests/test_conversation_scope.py', 'server/tests/test_auth.py'],
    headingTerms: ['范围', '身份', '租户'],
    claim: '身份和可见范围来自可信认证上下文，模型参数不能扩大范围。',
  },
  {
    prefix: 'kb-tenant',
    sourcePaths: ['server/app/services/conversation_context.py', 'server/app/repositories/conversations.py'],
    symbols: ['tenant_id', 'ConversationRepository'],
    testPaths: ['server/tests/test_conversation_scope.py', 'server/tests/integration/test_conversation_scope_database.py'],
    headingTerms: ['租户', '隔离', '范围'],
    claim: '多租户边界需要在状态、检索、缓存、事件和审计中保持一致。',
  },
  {
    prefix: 'kb-policy',
    sourcePaths: ['server/app/services/governance.py', 'server/app/domain/governance.py'],
    symbols: ['GovernanceService', 'AgentRuleUpsertRequest'],
    testPaths: ['server/tests/test_governance.py', 'server/tests/integration/test_governance_database.py'],
    headingTerms: ['策略', '版本', '发布'],
    claim: '策略规则和别名通过治理服务写入并测试，不能由模型临时改写。',
  },
  {
    prefix: 'kb-agent-eval',
    sourcePaths: ['server/app/services/agent_eval.py', 'server/app/domain/agent_eval.py'],
    symbols: ['AgentEvalService', 'EvalCase'],
    testPaths: ['server/tests/test_agent_eval.py', 'server/tests/integration/test_agent_eval_database.py'],
    headingTerms: ['测试', '发布', '评测'],
    claim: 'Agent 评测把控制不变量、证据支持和答案质量拆开记录。',
  },
  {
    prefix: 'kb-eval',
    sourcePaths: ['server/app/services/agent_eval.py', 'server/app/agent_eval_fixture.py'],
    symbols: ['AgentEvalService', 'build_eval_fixture'],
    testPaths: ['server/tests/test_agent_eval.py', 'server/tests/test_agent_eval_seed.py'],
    headingTerms: ['评测', '回归', '验证'],
    claim: '评测 Fixture 固定输入、范围、版本和期望终态，结果不能脱离版本解释。',
  },
  {
    prefix: 'kb-feedback',
    sourcePaths: ['server/app/services/answer_feedback.py', 'server/app/services/feedback.py'],
    symbols: ['AnswerFeedbackService', 'FeedbackService'],
    testPaths: ['server/tests/test_answer_feedback.py', 'server/tests/test_feedback_service.py'],
    headingTerms: ['反馈', '优化', '回归'],
    claim: '用户反馈先保存原始事实和关联 Turn，再进入离线评测或受控发布。',
  },
  {
    prefix: 'kb-observability',
    sourcePaths: ['server/app/observability.py', 'server/app/services/stat.py'],
    symbols: ['configure_observability', 'StatService'],
    testPaths: ['server/tests/test_observability.py', 'server/tests/test_stat_service.py'],
    headingTerms: ['观测', 'Trace', '指标'],
    claim: '观测记录区分延迟、错误、质量和资源，不以单一成功率替代证据。',
  },
  {
    prefix: 'kb-agent-admission',
    sourcePaths: ['server/app/services/agent_admission.py', 'server/app/agent/enterprise_runtime.py'],
    symbols: ['AgentAdmissionService', 'AgentAdmissionUnavailableError'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/test_agent_runtime_api.py'],
    headingTerms: ['准入', '并发', '容量'],
    claim: '任务在执行前经过准入和容量判断，拒绝不能被模型改写成成功。',
  },
  {
    prefix: 'kb-runtime-lease',
    sourcePaths: ['server/app/services/agent_admission.py', 'server/app/worker.py'],
    symbols: ['Lease', 'worker'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/test_worker_ingestion.py'],
    headingTerms: ['失败', '阶段', '容量'],
    claim: 'Lease 用于区分活跃执行、失联 Worker 和可重试任务，续租与回收必须可观察。',
  },
  {
    prefix: 'kb-celery',
    sourcePaths: ['server/app/worker.py', 'server/app/services/agent_admission.py'],
    symbols: ['worker', 'ack_task'],
    testPaths: ['server/tests/test_worker_ingestion.py', 'server/tests/integration/test_ingestion_database.py'],
    headingTerms: ['Worker', 'ACK', '重复'],
    claim: 'Worker 在至少一次投递下必须依靠 ACK、Lease 和幂等处理重复任务。',
  },
  {
    prefix: 'kb-worker',
    sourcePaths: ['server/app/worker.py', 'server/app/ingestion/node.py'],
    symbols: ['worker', 'NodeIngestionRepository'],
    testPaths: ['server/tests/test_worker_ingestion.py', 'server/tests/test_ingestion_service.py'],
    headingTerms: ['Worker', '重试', '恢复'],
    claim: '后台 Worker 的领取、失败和恢复状态必须落到可重放的任务记录。',
  },
  {
    prefix: 'kb-sse',
    sourcePaths: ['server/app/api/agent_runtime.py', 'server/app/domain/agent_runtime.py'],
    symbols: ['stream_events', 'AgentRuntimeEvent'],
    testPaths: ['server/tests/test_agent_runtime_api.py', 'server/tests/test_agent_runtime.py'],
    headingTerms: ['SSE', '事件', '重放'],
    claim: '流式事件以稳定序号交付，断线后可读取终态或按序号恢复。',
  },
  {
    prefix: 'kb-service-boundaries',
    sourcePaths: ['server/app/api/agent_runtime.py', 'server/app/agent/enterprise_runtime.py', 'server/app/rag/retrieval.py'],
    symbols: ['execute_enterprise_turn', 'HybridRetriever'],
    testPaths: ['server/tests/test_agent_runtime_api.py', 'server/tests/test_retrieval.py'],
    headingTerms: ['职责', '组件', '边界'],
    claim: 'API、Runtime、检索和工具服务分担不同责任，失败应在拥有者处分类。',
  },
  {
    prefix: 'kb-production',
    sourcePaths: ['server/app/agent/enterprise_runtime.py', 'server/app/observability.py', 'server/app/worker.py'],
    symbols: ['EnterpriseAgentRuntime', 'configure_observability', 'worker'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/test_observability.py'],
    headingTerms: ['验证', '容量', '治理'],
    claim: '生产架构要同时考虑执行、持久化、队列、观测和恢复，不能只展示模型调用。',
  },
  {
    prefix: 'kb-search-plan',
    sourcePaths: ['server/app/agent/enterprise_runtime.py', 'server/app/agent/enterprise_prompts.py'],
    symbols: ['planned_queries', 'planner_payload'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/test_agent_eval.py'],
    headingTerms: ['计划', '分支', '停止'],
    claim: 'SearchPlan 只描述受限目标、分支和预算，执行权仍由 Runtime 决定。',
  },
  {
    prefix: 'kb-mode-routing',
    sourcePaths: ['server/app/agent/enterprise_runtime.py'],
    symbols: ['choose_mode', 'checkpoint_required'],
    testPaths: ['server/tests/test_agent_runtime.py', 'server/tests/test_agent_eval.py'],
    headingTerms: ['路由', '模型', '预算'],
    claim: '模式选择根据请求、范围和风险由确定性函数裁决，不能依赖关键词特判。',
  },
]

function sourceRulesFor(keys: string[]): KnowledgeEvidence[] {
  const matches = new Map<string, KnowledgeEvidence>()
  for (const key of keys) {
    const rule = evidenceRules
      .filter((candidate) => key.startsWith(candidate.prefix))
      .sort((left, right) => right.prefix.length - left.prefix.length)[0]
    if (!rule) continue
    matches.set(rule.prefix, {
      sourcePaths: rule.sourcePaths,
      symbols: rule.symbols,
      testPaths: rule.testPaths,
      headingTerms: rule.headingTerms,
      claim: rule.claim,
    })
  }
  return [...matches.values()]
}

function headingsFor(slug: string): string[] {
  const file = path.join(process.cwd(), 'docs', 'ai-agent', `${slug}.md`)
  if (!fs.existsSync(file)) return []
  const source = fs.readFileSync(file, 'utf8')
  const prose = source.replace(/```[\s\S]*?```/g, ' ').replace(/~~~[\s\S]*?~~~/g, ' ')
  return [...prose.matchAll(/^#{2,3}\s+(.+)$/gm)].map((match) => match[1].trim())
}

function chapterNumbers(article: AiAgentArticleSpec): number[] {
  const numbers = article.coverageKeys
    .map((key) => key.match(/^wl-(\d{2})-/)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number)
  return [...new Set(numbers.length > 0 ? numbers : (fallbackChapters[article.stageKey] ?? []))]
}

function chapterTopics(article: AiAgentArticleSpec): string[] {
  const topics = article.coverageKeys
    .map((key) => key.match(/^wl-\d{2}-(.+)$/)?.[1])
    .filter((value): value is string => Boolean(value))
  return [...new Set(topics.length > 0 ? topics : [article.title])]
}

function officialSources(keys: string[]): string[] {
  return keys.filter((key) => officialUrls[key]).map((key) => officialUrls[key])
}

function buildEntry(article: AiAgentArticleSpec): AiAgentSourceLedgerEntry {
  const chapters = chapterNumbers(article)
  const topics = chapterTopics(article)
  const evidence = sourceRulesFor(article.coverageKeys)
  const officialEvidence = officialSources(article.coverageKeys)
  const appendixTopics = article.coverageKeys
    .filter((key) => appendixTitles[key])
    .map((key) => appendixTitles[key])
  const allowedClaims = [
    ...evidence.map((item) => item.claim),
    ...officialEvidence.map((url) => `版本与协议事实以官方资料 ${url} 为准。`),
    ...(chapters.length > 0 ? [`Wayland 第 ${chapters.join('、')} 章提供模式范围，正文只采用其问题拆解和比较视角。`] : []),
  ]
  const avoidClaims = [
    '不把演示代码当成生产能力或线上运行结果。',
    '不把模型输出当成权限、事实、版本或业务成功的证明。',
    '不把来源项目的案例、指标或结论扩写成未被源码和测试支持的事实。',
  ]
  return {
    slug: article.slug,
    sourceKey: article.sourceKey,
    coverageKeys: article.coverageKeys,
    waylandChapters: chapters,
    waylandTopics: topics,
    waylandChapterTitles: chapters.map((chapter) => waylandChapterTitles[chapter]).filter(Boolean),
    appendixTopics,
    knowledgeEvidence: evidence,
    officialEvidence,
    allowedClaims,
    avoidClaims,
    headingAnchors: headingsFor(article.slug),
  }
}

export const aiAgentSourceLedger: AiAgentSourceLedgerEntry[] = aiAgentCurriculum.map(buildEntry)
