import { defineConfig } from 'vitepress'
import { createSidebar, sectionNavigation } from './sidebar'

export default defineConfig({
    vite: {
      cacheDir: 'node_modules/.vitepress-cache'
    },
    lang: 'zh-CN',
    title: 'AI 全栈',
    titleTemplate: ':title | AI 全栈',
    description: '面向工程实践的 AI、Agent、前端、Python、Node.js 与运维知识库。',
    cleanUrls: true,
    lastUpdated: true,
    sitemap: {
      hostname: 'https://junfeng530.xyz'
    },
    head: [
      ['meta', { name: 'theme-color', content: '#f8fafc' }],
      [
        'meta',
        {
          name: 'keywords',
          content: 'AI 全栈,Agent,RAG,LangGraph,前端,Python,Node.js,DevOps'
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
      siteTitle: 'AI 全栈',
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
      lastUpdated: {
        text: '更新于',
        formatOptions: {
          dateStyle: 'medium'
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
