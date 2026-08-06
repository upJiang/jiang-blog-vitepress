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
  'ai-agent': '第一次阅读可从“基础与边界”开始，再进入工具、上下文、RAG 与质量治理。',
  'agent-practice': '这是连续教程。建议从 01 开始按编号阅读，每篇只增加一组能力。',
  seo: '先判断需求和页面职责，再检查抓取、内容、数据与付费验证。',
  frontend: '算法与重学前端保留课程顺序；已有基础后可直接进入现代前端专题。',
  backend: '按主要语言选择一条路径，再横向比较事务、权限、异步任务和实时通信。',
  devops: '先跑通容器与网关，再进入 CI、观测、切流、迁移和恢复。',
  architecture: '每篇先看简单实现在哪个条件下失效，再阅读新的边界与可靠性设计。',
  engineering: '调试、Git 和资料检索三篇可以独立阅读，建议从正在处理的问题进入。'
}

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
