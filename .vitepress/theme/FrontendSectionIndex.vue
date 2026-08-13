<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  articlesByCategory,
  articlePath,
  frontendTracks,
  sections,
  type FrontendTrackKey
} from '../content'
import SectionTrackTabs from './SectionTrackTabs.vue'
import { useTrackSelection } from './useTrackSelection'

const section = sections.find((item) => item.key === 'frontend')
const tabs = frontendTracks.map((track) => ({ ...track }))
const { activeTrack, selectTrack } = useTrackSelection(() => tabs.map((track) => track.key))
const tabsRef = ref<InstanceType<typeof SectionTrackTabs> | null>(null)

function trackFor(slug: string, part: string): Exclude<FrontendTrackKey, 'all'> {
  if (slug.startsWith('relearn/') || part === '基础与手写') return 'fundamentals'
  if (part === 'TypeScript' || slug === 'typescript-type-system-engineering') return 'typescript'
  if (part === 'React' || slug === 'react-fiber-concurrent-rendering' || slug === 'nextjs-rendering-cache-invalidation') return 'react'
  if (part === 'Vue' || slug === 'vue-reactivity-scheduler') return 'vue'
  if (part === '构建工具' || part === '现代前端：构建工具') return 'tooling'
  return 'engineering'
}

const visibleArticles = computed(() => {
  const articles = articlesByCategory('frontend')
  if (activeTrack.value === 'all') return articles
  return articles.filter((item) => trackFor(item.slug, item.part) === activeTrack.value)
})

const groups = computed(() => {
  const grouped = new Map<string, typeof visibleArticles.value>()
  for (const item of visibleArticles.value) {
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
  <main v-if="section" class="section-index frontend-section-index">
    <header class="section-header">
      <p>主题文章</p>
      <h1>{{ section.title }}</h1>
      <span>{{ section.description }}</span>
      <span class="section-reading-hint">先按专题建立机制地图，再沿文章中的执行轨迹和实验验证细节。</span>
      <span class="section-count">{{ articlesByCategory('frontend').length }} 篇文章</span>
    </header>

    <SectionTrackTabs
      ref="tabsRef"
      :tabs="tabs"
      :active-key="activeTrack"
      id-prefix="frontend"
      label="前端专题"
      @select="selectTrack"
    />

    <div
      id="frontend-panel"
      class="frontend-track-panel"
      role="tabpanel"
      :aria-labelledby="`frontend-tab-${activeTrack}`"
      tabindex="0"
      @keydown.esc="tabsRef?.focusActiveTab()"
    >
      <section v-for="[group, items] in groups" :key="group" class="article-group">
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
    </div>
  </main>
</template>
