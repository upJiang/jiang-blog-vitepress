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
