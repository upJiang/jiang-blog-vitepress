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
  'ai-agent': '这是连续课程。建议从第 1 章开始，先理解模型和 Agent，再进入工具、RAG、质量与完整案例。',
  seo: '先建立增长漏斗和数据基线，再进入页面、技术审计、归因与搜索广告。',
  frontend: '算法与重学前端保持原顺序；现代专题从浏览器现象和可运行结果进入原理。',
  backend: '先学习八章共同基础，再选择 Node.js、Python 或 Go 项目线继续实践。',
  devops: '从 Linux 与网络开始，依次学习容器、数据服务、GPU 推理、容量与安全交付。',
  architecture: '每章都站在 AI 工程师视角，从简单方案的失效条件推导架构选择。',
  engineering: '五篇都提供可以带到工作中的 Runbook、检查表或记录模板。'
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
</script>

<template>
  <main v-if="section" class="section-index">
    <header class="section-header">
      <p>阅读路径</p>
      <h1>{{ section.title }}</h1>
      <span>{{ section.description }}</span>
      <span class="section-reading-hint">{{ readingHints[category] }}</span>
      <span class="section-count">{{ articlesByCategory(category).length }} 篇文章</span>
    </header>

    <section v-for="[group, items] in groups" :key="group" class="article-group">
      <h2>{{ group }}</h2>
      <div class="article-index-list">
        <a v-for="item in items" :key="item.slug" :href="articlePath(item)">
          <span class="article-index-chapter">{{ String(item.chapter).padStart(2, '0') }}</span>
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
