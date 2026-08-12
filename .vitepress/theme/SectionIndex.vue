<script setup lang="ts">
import { computed } from 'vue'
import {
  articlesByCategory,
  articlePath,
  sections,
  type Category
} from '../content'

const props = defineProps<{ category: Category }>()

const section = computed(() =>
  sections.find((item) => item.key === props.category)
)

const readingHints: Record<Category, string> = {
  'ai-agent': '先理解模型、工作流、RAG 和 Agent，再按问题进入工具、知识处理、质量与运行实践。',
  seo: '先建立增长漏斗和数据基线，再进入页面、技术审计、归因与搜索广告。',
  frontend: '算法与重学前端保留原有顺序；现代专题从浏览器现象和可运行结果进入原理。',
  algorithms: '先掌握数据结构和复杂度，再用不变量、反例与测试推导查找、图、区间和缓存算法。',
  backend: '先看后端学习地图，再沿请求、数据、一致性、安全、异步处理、运行环境和项目实现逐步展开。',
  devops: '按八个阶段学习运行底座、AI Backend、模型服务、GPU、Kubernetes、企业平台、分布式训练与可靠交付。',
  'ai-practice': '从 Prompt、Tool、RAG、Agent、Skill 与 MCP 的能力地图出发，逐步建立 Agent 协作、能力扩展、研发系统和个人全栈工作方式。'
}

const groups = computed(() => {
  const grouped = new Map<
    string,
    ReturnType<typeof articlesByCategory>
  >()

  for (const item of articlesByCategory(props.category)) {
    const group = grouped.get(item.part) ?? []
    group.push(item)
    grouped.set(item.part, group)
  }

  return [...grouped.entries()]
})

const aiMainline = computed(() =>
  articlesByCategory('ai-agent')
    .filter((item) => item.track === 'mainline')
    .sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0))
)

const aiSpecialGroups = computed(() => {
  const grouped = new Map<string, ReturnType<typeof articlesByCategory>>()
  for (const item of articlesByCategory('ai-agent').filter((entry) => entry.track === 'special')) {
    const group = grouped.get(item.part) ?? []
    group.push(item)
    grouped.set(item.part, group)
  }
  return [...grouped.entries()]
})

function displayGroup(group: string): string {
  return group.replace(/^第[一二三四五六七八九十]+部分[：:]?\s*/, '')
}
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

    <template v-if="category === 'ai-agent'">
      <section class="article-group article-group--mainline">
        <div class="article-group-heading">
          <span>从第一次模型请求到可恢复 Runtime</span>
          <h2>推荐阅读顺序</h2>
        </div>
        <div class="article-index-list">
          <a v-for="item in aiMainline" :key="item.slug" :href="articlePath(item)">
            <span class="article-index-sequence" aria-hidden="true">{{ String(item.sequence).padStart(2, '0') }}</span>
            <span class="article-index-copy">
              <span class="article-index-title">{{ item.title }}</span>
              <span class="article-index-description">{{ item.description }}</span>
            </span>
            <span class="article-index-arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      <section class="article-group article-group--special">
        <div class="article-group-heading">
          <span>主线完成后可按需要进入</span>
          <h2>专题阅读</h2>
        </div>
        <div v-for="[group, items] in aiSpecialGroups" :key="group" class="article-special-cluster">
          <h3>{{ displayGroup(group) }}</h3>
          <div class="article-index-list">
            <a v-for="item in items" :key="item.slug" :href="articlePath(item)">
              <span class="article-index-copy">
                <span class="article-index-title">{{ item.title }}</span>
                <span class="article-index-description">{{ item.description }}</span>
              </span>
              <span class="article-index-arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>
    </template>

    <section v-for="[group, items] in category === 'ai-agent' ? [] : groups" :key="group" class="article-group">
      <h2>{{ displayGroup(group) }}</h2>
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
  </main>
</template>
