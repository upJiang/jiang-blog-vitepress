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
