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
  'ai-agent/llm-workflow-rag-agent',
  'ai-agent/knowledge-agent-capstone',
  'frontend/relearn/browser/browser_event',
  'backend/request-connection-to-response',
  'devops/ai-infra-role-map'
]

const learningTracks = [
  {
    name: 'AI 全栈',
    description: '前端交互、后端服务、Agent 能力和工程交付一起学习。',
    href: '/docs/frontend/typescript-type-system-engineering'
  },
  {
    name: 'Agent 工程师',
    description: '从模型输入输出走到知识检索、工具、证据、评测与可靠运行。',
    href: '/docs/ai-agent/llm-workflow-rag-agent'
  },
  {
    name: 'AI Infra 工程师',
    description: '从 Linux、容器和数据服务走到 GPU 推理、容量和恢复。',
    href: '/docs/devops/ai-infra-role-map'
  }
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
          面向具备基础编程能力的读者，从前置知识开始讲清概念、完整流程、动手步骤和验证方法。
          每个系列按章节推进，读完不只知道名词，还能把方法带进实际工作。
        </p>
        <div class="home-actions">
          <button class="home-button home-button--primary" type="button" @click="go('/docs/ai-agent/llm-workflow-rag-agent')">
            从 Agent 课程开始
          </button>
          <button class="home-button" type="button" @click="go('/#topics-title')">
            查看知识地图
          </button>
        </div>
      </div>

      <div class="home-signal" aria-label="知识库概览">
        <span class="home-signal__label">当前主线</span>
        <span class="home-signal__value">课程式技术博客</span>
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
            <dd>AI + Infra</dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="home-section" aria-labelledby="tracks-title">
      <div class="home-section__heading">
        <p>学习路线</p>
        <h2 id="tracks-title">三条主线</h2>
      </div>
      <div class="track-list">
        <a v-for="track in learningTracks" :key="track.name" :href="track.href">
          <span class="track-title">{{ track.name }}</span>
          <span class="track-description">{{ track.description }}</span>
          <span class="featured-arrow" aria-hidden="true">→</span>
        </a>
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
