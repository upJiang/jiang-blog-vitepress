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

const groups = computed(() => {
  const grouped = new Map<
    string,
    ReturnType<typeof articlesByCategory>
  >()

  for (const item of articlesByCategory(props.category)) {
    const group = grouped.get(item.group) ?? []
    group.push(item)
    grouped.set(item.group, group)
  }

  return [...grouped.entries()]
})
</script>

<template>
  <main v-if="section" class="section-index">
    <header class="section-header">
      <p>AI 全栈知识库</p>
      <h1>{{ section.title }}</h1>
      <span>{{ section.description }}</span>
      <strong>{{ articlesByCategory(category).length }} 篇文章</strong>
    </header>

    <section v-for="[group, items] in groups" :key="group" class="article-group">
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
  </main>
</template>
