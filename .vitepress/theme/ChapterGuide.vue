<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { articles, articleFile, sections } from '../content'

const { page } = useData()

const chapter = computed(() => {
  const relative = page.value.relativePath.replace(/\\/g, '/')
  return articles.find((item) => articleFile(item) === relative)
})

const section = computed(() =>
  sections.find((item) => item.key === chapter.value?.category)
)
</script>

<template>
  <aside v-if="chapter && !chapter.preserved" class="chapter-guide" aria-label="本章学习信息">
    <div class="chapter-guide__position">
      <span>{{ section?.title }}</span>
      <span>{{ chapter.part }}</span>
      <span>第 {{ chapter.chapter }} 章</span>
    </div>
    <div class="chapter-guide__grid">
      <section>
        <h2>阅读前需要什么</h2>
        <ul>
          <li v-for="entry in chapter.prerequisites" :key="entry">{{ entry }}</li>
        </ul>
      </section>
      <section>
        <h2>读完能够做什么</h2>
        <ul>
          <li v-for="entry in chapter.outcomes" :key="entry">{{ entry }}</li>
        </ul>
      </section>
    </div>
    <div class="chapter-guide__practice">
      <span>本章实践</span>
      <p>{{ chapter.practice.result }}</p>
    </div>
  </aside>
</template>
