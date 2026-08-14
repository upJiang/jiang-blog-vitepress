<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  articlesByCategory,
  articlePath,
  sections,
  sectionTrackGroups
} from '../content'
import SectionTrackTabs from './SectionTrackTabs.vue'
import { useTrackSelection } from './useTrackSelection'

const section = sections.find((item) => item.key === 'frontend')
const trackGroups = sectionTrackGroups('frontend')
const tabs = [{ key: 'all', label: '全部' }, ...trackGroups.map(({ key, label }) => ({ key, label }))]
const { activeTrack, selectTrack } = useTrackSelection(() => tabs.map((track) => track.key))
const tabsRef = ref<InstanceType<typeof SectionTrackTabs> | null>(null)
const groups = computed(() => {
  const selected = activeTrack.value === 'all'
    ? trackGroups
    : trackGroups.filter(({ key }) => key === activeTrack.value)
  return selected.flatMap((track) =>
    track.groups.map((group) => [`${track.key}:${group.key}`, group.label, group.items] as const)
  )
})

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
      <section v-for="[groupKey, group, items] in groups" :key="groupKey" class="article-group">
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
