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
  'ai-agent/agent-lifecycle',
  'ai-agent/hybrid-retrieval',
  'architecture/evidence-driven-systems',
  'frontend/component-library-design-system',
  'devops/safe-delivery-recovery'
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
        <p class="home-kicker">Engineering knowledge base</p>
        <h1 id="home-title">AI 全栈</h1>
        <p class="home-summary">
          围绕 AI 应用与 Agent 构建，连接前端、Python、Node.js、数据系统和可靠交付。
          这里记录可验证的原理、架构边界和工程决策。
        </p>
        <div class="home-actions">
          <button class="home-button home-button--primary" type="button" @click="go('/docs/ai-agent/')">
            开始阅读
          </button>
          <button class="home-button" type="button" @click="go('/docs/architecture/')">
            架构实践
          </button>
        </div>
      </div>

      <div class="home-signal" aria-label="知识库概览">
        <span class="home-signal__label">CURRENT FOCUS</span>
        <span class="home-signal__value">Agent Engineering</span>
        <dl>
          <div>
            <dt>Articles</dt>
            <dd>{{ articles.length }}</dd>
          </div>
          <div>
            <dt>Domains</dt>
            <dd>{{ sections.length }}</dd>
          </div>
          <div>
            <dt>Runtime</dt>
            <dd>Web + AI</dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="home-section" aria-labelledby="featured-title">
      <div class="home-section__heading">
        <p>Featured</p>
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
        <p>Knowledge map</p>
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
      <span>持续整理工程知识与实践</span>
      <a href="https://beian.miit.gov.cn" rel="noreferrer">粤ICP备18079096号</a>
    </footer>
  </main>
</template>
