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
  <aside v-if="chapter && !chapter.preserved && chapter.category !== 'ai-agent' && chapter.category !== 'ai-practice' && chapter.category !== 'backend'" class="chapter-guide" aria-label="文章阅读信息">
    <div class="chapter-guide__position">
      <span>{{ section?.title }}</span>
    </div>
    <div class="chapter-guide__grid">
      <section>
        <h2>开始前可以了解</h2>
        <ul>
          <li v-for="entry in chapter.prerequisites" :key="entry">{{ entry }}</li>
        </ul>
      </section>
      <section>
        <h2>读完可以带走</h2>
        <ul>
          <li v-for="entry in chapter.outcomes" :key="entry">{{ entry }}</li>
        </ul>
      </section>
    </div>
  </aside>
</template>
