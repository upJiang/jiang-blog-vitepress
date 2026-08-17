import { aiAgentCurriculum } from '../../.vitepress/ai-agent-curriculum'

export interface AiAgentSourceLedgerEntry {
  slug: string
  sourceKey: string
  coverageKeys: string[]
}

export const aiAgentSourceLedger: AiAgentSourceLedgerEntry[] = aiAgentCurriculum.map((article) => ({
  slug: article.slug,
  sourceKey: article.sourceKey,
  coverageKeys: article.coverageKeys,
}))
