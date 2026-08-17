<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  articlePath,
  articlesByCategory,
  sections,
  sectionTrackGroups,
  type Category
} from '../content'
import SectionTrackTabs from './SectionTrackTabs.vue'
import { useTrackSelection } from './useTrackSelection'

const props = defineProps<{ category: Category }>()

const section = computed(() =>
  sections.find((item) => item.key === props.category)
)
const tabsRef = ref<InstanceType<typeof SectionTrackTabs> | null>(null)

const readingHints: Record<Category, string> = {
  'ai-agent': '先理解模型、工作流、RAG 和 Agent，再按问题进入工具、知识处理、质量与运行实践。',
  seo: '先建立增长漏斗和数据基线，再进入页面、技术审计、归因与搜索广告。',
  frontend: '算法与重学前端保留原有顺序；现代专题从浏览器现象和可运行结果进入原理。',
  algorithms: '先掌握数据结构和复杂度，再用不变量、反例与测试推导查找、图、区间和缓存算法。',
  backend: '先看后端学习地图，再沿请求、数据、一致性、安全、异步处理、运行环境和项目实现逐步展开。',
  devops: '按八个阶段学习运行底座、AI Backend、模型服务、GPU、Kubernetes、企业平台、分布式训练与可靠交付。',
  'ai-practice': '从 Prompt、Tool、RAG、Agent、Skill 与 MCP 的能力地图出发，逐步建立 Agent 协作、能力扩展、研发系统和个人全栈工作方式。',
  'onnx-practice': '先用一张图片跑通本地推理，再观察 Tensor、Worker、执行后端、缓存和浏览器能力如何共同影响结果。'
}

const aiAgentOverview = {
  summary: '这条路线面向掌握 Python、HTTP 和基础数据库知识，但还没有 Agent 开发经验的读者。学习顺序只有一条：先理解模型和最小循环，再扩展工具、上下文、检索、治理和运行时，最后完成一个带证据的知识 Agent。',
  readingModes: [
    {
      title: '快速理解',
      description: '每个阶段先读第一篇，知道它解决的问题，再决定是否深入。'
    },
    {
      title: '系统学习',
      description: '从第一个阶段开始按栏目目录顺序阅读。文章之间的前置关系、左侧目录和上一篇、下一篇使用同一条顺序。'
    },
    {
      title: '项目对照',
      description: '先运行文章里的最小示例，再把同一概念映射到自己的 API、数据库、队列和权限系统。'
    }
  ],
  stages: [
    '模型与 Agent 基础：先分清 LLM、工作流、RAG 和 Agent，理解 Message、Token、Context、Responses API 与结构化输出。',
    '工具与能力扩展：把模型候选接入 Tool Calling，再学习 MCP、Skill、SubAgent 和人工审批。',
    '上下文、记忆与多轮对话：解决有限窗口、历史状态、长期记忆和间接提示注入。',
    '单 Agent 推理模式：按任务需要加入 Router、Planner、Reflection、Tree of Thoughts 和 Debate。',
    '多 Agent 编排：学习集中编排、DAG、Swarm、Handoff 和上下文隔离。',
    '研究型 Agent：把多轮检索组织成有覆盖度、证据和停止条件的研究循环。',
    'RAG 知识工程：从文件准入、结构解析、Embedding 到混合检索、图谱、ACL 和评测。',
    '可信、安全与治理：用 Claim、Evidence、验证器、沙箱、策略版本和 Eval 限制不可信输出。',
    'Runtime 与生产架构：把 Turn、幂等、Worker、Lease、Deadline、Checkpoint、SSE 和观测接起来。',
    'Agent Harness 与前沿开发：把同一套边界应用到 Computer Use、编码 Agent 和后台任务。',
    '综合项目：完成一条从知识发布到带引用答案交付的完整链路。'
  ],
  outcomes: [
    '什么时候一次模型调用或固定工作流已经足够，什么时候才需要 Agent 循环。',
    '模型可以提出什么，程序必须确认什么，权限和版本应该由谁保存。',
    '一个检索结果怎样变成可见 Evidence，一条答案怎样证明每个 Claim。',
    '长任务在重复投递、取消、断线和 Worker 崩溃后怎样恢复。',
    '版本、评测、Trace 和反馈怎样形成可回滚的发布流程。'
  ]
} as const

const trackGroups = computed(() => sectionTrackGroups(props.category))

const trackTabs = computed(() => {
  return [{ key: 'all', label: '全部' }, ...trackGroups.value.map(({ key, label }) => ({ key, label }))]
})

const { activeTrack, selectTrack } = useTrackSelection(() =>
  trackTabs.value.map((track) => track.key)
)

const visibleGroups = computed(() => {
  const selected = activeTrack.value === 'all'
    ? trackGroups.value
    : trackGroups.value.filter(({ key }) => key === activeTrack.value)
  return selected.flatMap((track) =>
    track.groups.map((group) => [`${track.key}:${group.key}`, group.label, group.items] as const)
  )
})
</script>

<template>
  <main v-if="section" class="section-index">
    <header class="section-header">
      <p>主题文章</p>
      <h1>{{ section.title }}</h1>
      <span>{{ section.description }}</span>
      <span class="section-reading-hint">{{ readingHints[category] }}</span>
      <span class="section-count">{{ articlesByCategory(category).length }} 篇文章</span>
    </header>

    <section v-if="category === 'ai-agent'" class="section-index-intro" aria-labelledby="ai-agent-reading-map">
      <div class="section-index-intro__heading">
        <p>阅读地图</p>
        <h2 id="ai-agent-reading-map">从一次调用走到可交付的 Agent</h2>
      </div>
      <p class="section-index-intro__summary">{{ aiAgentOverview.summary }}</p>

      <div class="section-index-intro__guides" aria-label="阅读方式">
        <section v-for="guide in aiAgentOverview.readingModes" :key="guide.title" class="section-index-intro__guide">
          <h3>{{ guide.title }}</h3>
          <p>{{ guide.description }}</p>
        </section>
      </div>

      <div class="section-index-intro__details">
        <section aria-labelledby="ai-agent-learning-dependencies">
          <h3 id="ai-agent-learning-dependencies">学习依赖</h3>
          <ol class="section-index-stage-list">
            <li v-for="stage in aiAgentOverview.stages" :key="stage">{{ stage }}</li>
          </ol>
        </section>
        <section aria-labelledby="ai-agent-outcomes">
          <h3 id="ai-agent-outcomes">读完应该能回答什么</h3>
          <ul class="section-index-outcome-list">
            <li v-for="outcome in aiAgentOverview.outcomes" :key="outcome">{{ outcome }}</li>
          </ul>
        </section>
      </div>
    </section>

    <SectionTrackTabs
      ref="tabsRef"
      :tabs="trackTabs"
      :active-key="activeTrack"
      id-prefix="category"
      :label="`${section.title}文章分组`"
      @select="selectTrack"
    />

    <div
      id="category-panel"
      class="frontend-track-panel"
      role="tabpanel"
      :aria-labelledby="`category-tab-${activeTrack}`"
      tabindex="0"
      @keydown.esc="tabsRef?.focusActiveTab()"
    >

    <section v-for="[groupKey, group, items] in visibleGroups" :key="groupKey" class="article-group">
      <h2>{{ group }}</h2>
      <div class="article-index-list">
        <a v-for="item in items" :key="item.slug" :href="articlePath(item)">
          <span class="article-index-copy">
            <span class="article-index-title">{{ item.title }}</span>
            <span class="article-index-description">{{ item.description }}</span>
          </span>
          <span class="article-index-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>
    </div>
  </main>
</template>
