<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vitepress'
import {
  articles,
  articlesByCategory,
  articlePath,
  sections
} from '../content'

const router = useRouter()

const featuredPaths = [
  'agent-practice/01-system-boundaries',
  'agent-practice/06-hybrid-retrieval',
  'frontend/relearn/browser/browser_event',
  'seo/crawl-index-ranking',
  'devops/candidate-validation-traffic-switching'
]

const featured = computed(() =>
  featuredPaths
    .map((entry) => {
      const [category, ...slugParts] = entry.split('/')
      return articles.find(
        (item) => item.category === category && item.slug === slugParts.join('/')
      )
    })
    .filter((item) => item !== undefined)
)

const categoryCounts = computed(() =>
  sections.map((section) => ({
    ...section,
    count: articlesByCategory(section.key).length
  }))
)

function go(path: string) {
  void router.go(path)
}
</script>

<template>
  <main class="knowledge-home">
    <section class="home-hero" aria-labelledby="home-title">
      <div class="home-hero__content">
        <p class="home-kicker">工程知识库</p>
        <h1 id="home-title">AI 全栈</h1>
        <p class="home-summary">
          从具体问题和必要前置开始，逐步学习 Agent、前端、后端、搜索增长与交付。
          内容按主题选择示例、实验或决策表，讲清验证方法和适用边界。
        </p>
        <div class="home-actions">
          <button class="home-button home-button--primary" type="button" @click="go('/docs/agent-practice/01-system-boundaries')">
            从 Agent 第一篇开始
          </button>
          <button class="home-button" type="button" @click="go('/#topics-title')">
            查看知识地图
          </button>
        </div>
      </div>

      <div class="home-signal" aria-label="知识库概览">
        <span class="home-signal__label">当前主线</span>
        <span class="home-signal__value">Agent 工程实践</span>
        <dl>
          <div>
            <dt>文章</dt>
            <dd>{{ articles.length }}</dd>
          </div>
          <div>
            <dt>栏目</dt>
            <dd>{{ sections.length }}</dd>
          </div>
          <div>
            <dt>技术主线</dt>
            <dd>AI + Web</dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="home-section" aria-labelledby="featured-title">
      <div class="home-section__heading">
        <p>从这里开始</p>
        <h2 id="featured-title">重点文章</h2>
      </div>
      <div class="featured-list">
        <a v-for="(item, index) in featured" :key="item.slug" :href="articlePath(item)">
          <span class="featured-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="featured-copy">
            <span class="featured-title">{{ item.title }}</span>
            <span class="featured-description">{{ item.description }}</span>
          </span>
          <span class="featured-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>

    <section class="home-section topic-section" aria-labelledby="topics-title">
      <div class="home-section__heading">
        <p>全部栏目</p>
        <h2 id="topics-title">知识地图</h2>
      </div>
      <div class="topic-grid">
        <a v-for="section in categoryCounts" :key="section.key" :href="section.path">
          <span class="topic-count">{{ section.count }} 篇</span>
          <span class="topic-title">{{ section.title }}</span>
          <span class="topic-description">{{ section.description }}</span>
        </a>
      </div>
    </section>

    <footer class="home-footer">
      <span>文章按实际校订日期持续更新</span>
      <a href="https://beian.miit.gov.cn" rel="noreferrer">粤ICP备18079096号</a>
    </footer>
  </main>
</template>
