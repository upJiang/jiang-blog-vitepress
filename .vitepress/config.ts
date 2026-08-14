import { defineConfig } from 'vitepress'
import { articleFile, articlePath, articles, articlesInStageOrder } from './content'
import { createSidebar, sectionNavigation } from './sidebar'
import { draftArticleFiles } from './drafts'

const draftRoutes = draftArticleFiles.map((file) => `/${file.replace(/\.md$/, '')}`)

export default defineConfig({
    transformPageData(pageData) {
      if (!pageData.relativePath.startsWith('docs/') || pageData.relativePath.endsWith('/index.md')) return

      const current = articles.find((article) => articleFile(article) === pageData.relativePath)
      if (!current) return

      const orderedArticles = articlesInStageOrder(current.category)
      const index = orderedArticles.findIndex((article) => article.slug === current.slug)
      const previous = orderedArticles[index - 1]
      const next = orderedArticles[index + 1]

      return {
        frontmatter: {
          ...pageData.frontmatter,
          prev: previous ? { text: previous.title, link: articlePath(previous) } : false,
          next: next ? { text: next.title, link: articlePath(next) } : false
        }
      }
    },
    srcExclude: [
      'AGENTS.md',
      'CLAUDE.md',
      'AI_Infra_工程入门学习路线.md',
      '后端开发入门体系教程.md',
      'content-reviews/**/*.md',
      'examples/**/*.md',
      ...draftArticleFiles
    ],
    ignoreDeadLinks: draftRoutes,
    vite: {
      cacheDir: 'node_modules/.vitepress-cache',
      worker: {
        format: 'es'
      },
      plugins: [
        {
          name: 'legacy-algorithm-redirect',
          configureServer(server) {
            server.middlewares.use((request, response, next) => {
              const requestUrl = request.url ?? ''
              const match = requestUrl.match(
                /^\/docs\/frontend\/algorithms\/([^/?#]+?)(?:\.html)?\/?(?:\?.*)?$/
              )
              if (!match) {
                next()
                return
              }

              response.statusCode = 302
              response.setHeader('Location', `/docs/algorithms/${match[1]}`)
              response.end()
            })
          }
        }
      ]
    },
    lang: 'zh-CN',
    title: '小江AI',
    titleTemplate: ':title | 小江AI',
    description: '小江的个人技术博客，记录 AI、Agent、AI 实践、前端、后端、SEO 与 AI Infra。',
    cleanUrls: true,
    lastUpdated: false,
    sitemap: {
      hostname: 'https://junfeng530.xyz'
    },
    head: [
      ['meta', { name: 'theme-color', content: '#f8fafc' }],
      [
        'meta',
        {
          name: 'keywords',
          content: 'AI 全栈,Agent,RAG,LangGraph,前端,后端,SEO,AI Infra,DevOps'
        }
      ],
      ['meta', { name: 'referrer', content: 'strict-origin-when-cross-origin' }],
      ['link', { rel: 'icon', href: '/favicon.ico' }]
    ],
    markdown: {
      lineNumbers: true,
      theme: {
        light: 'github-light',
        dark: 'github-dark'
      },
      config(markdown) {
        const fence = markdown.renderer.rules.fence!
        markdown.renderer.rules.fence = (tokens, index, options, env, renderer) => {
          const token = tokens[index]
          if (token.info.trim() === 'mermaid') {
            return `<MermaidDiagram id="mermaid-${index}" graph="${encodeURIComponent(token.content)}" />`
          }
          return fence(tokens, index, options, env, renderer)
        }
      }
    },
    themeConfig: {
      logo: '/favicon.ico',
      siteTitle: '小江AI',
      nav: sectionNavigation(),
      sidebar: createSidebar(),
      outline: {
        level: [2, 3],
        label: '本页目录'
      },
      search: {
        provider: 'local',
        options: {
          translations: {
            button: {
              buttonText: '搜索',
              buttonAriaLabel: '搜索文档'
            },
            modal: {
              noResultsText: '没有找到相关内容',
              resetButtonTitle: '清除查询',
              footer: {
                selectText: '选择',
                navigateText: '切换',
                closeText: '关闭'
              }
            }
          }
        }
      },
      docFooter: {
        prev: '上一篇',
        next: '下一篇'
      },
      returnToTopLabel: '回到顶部',
      sidebarMenuLabel: '目录',
      darkModeSwitchLabel: '外观',
      lightModeSwitchTitle: '切换为浅色模式',
      darkModeSwitchTitle: '切换为深色模式',
      socialLinks: [{ icon: 'github', link: 'https://github.com/upJiang' }]
    }
  })
