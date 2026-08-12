<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  articlesByCategory,
  articlePath,
  frontendTracks,
  sections,
  type FrontendTrackKey
} from '../content'

const activeTrack = ref<FrontendTrackKey>('all')
const tabButtons = new Map<FrontendTrackKey, HTMLButtonElement>()
const section = sections.find((item) => item.key === 'frontend')

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

function readTrackFromLocation(): FrontendTrackKey {
  const value = new URLSearchParams(window.location.search).get('track')
  return frontendTracks.some((track) => track.key === value)
    ? value as FrontendTrackKey
    : 'all'
}

function writeTrackToLocation(track: FrontendTrackKey, replace = false): void {
  const url = new URL(window.location.href)
  url.searchParams.set('track', track)
  window.history[replace ? 'replaceState' : 'pushState']({}, '', url)
}

function selectTrack(track: FrontendTrackKey, replace = false): void {
  if (activeTrack.value === track && !replace) return
  activeTrack.value = track
  writeTrackToLocation(track, replace)
}

async function moveFocus(currentIndex: number, offset: number): Promise<void> {
  const nextIndex = (currentIndex + offset + frontendTracks.length) % frontendTracks.length
  const track = frontendTracks[nextIndex]
  selectTrack(track.key)
  await nextTick()
  tabButtons.get(track.key)?.focus()
}

async function onTabKeydown(event: KeyboardEvent, index: number): Promise<void> {
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    await moveFocus(index, 1)
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    await moveFocus(index, -1)
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    const nextIndex = event.key === 'Home' ? 0 : frontendTracks.length - 1
    const track = frontendTracks[nextIndex]
    selectTrack(track.key)
    await nextTick()
    tabButtons.get(track.key)?.focus()
  }
}

function syncFromHistory(): void {
  activeTrack.value = readTrackFromLocation()
}

onMounted(() => {
  activeTrack.value = readTrackFromLocation()
  const rawTrack = new URLSearchParams(window.location.search).get('track')
  if (rawTrack !== activeTrack.value) writeTrackToLocation(activeTrack.value, true)
  window.addEventListener('popstate', syncFromHistory)
})

onBeforeUnmount(() => window.removeEventListener('popstate', syncFromHistory))
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

    <div class="frontend-track-tabs" role="tablist" aria-label="前端专题">
      <button
        v-for="(track, index) in frontendTracks"
        :id="`frontend-tab-${track.key}`"
        :key="track.key"
        :ref="(element) => element && tabButtons.set(track.key, element as HTMLButtonElement)"
        type="button"
        role="tab"
        :aria-controls="`frontend-panel-${track.key}`"
        :aria-selected="activeTrack === track.key"
        :tabindex="activeTrack === track.key ? 0 : -1"
        @click="selectTrack(track.key)"
        @keydown="onTabKeydown($event, index)"
      >
        {{ track.label }}
      </button>
    </div>

    <div
      :id="`frontend-panel-${activeTrack}`"
      class="frontend-track-panel"
      role="tabpanel"
      :aria-labelledby="`frontend-tab-${activeTrack}`"
      tabindex="0"
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
