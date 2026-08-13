import type { DefaultTheme } from 'vitepress'
import {
  articlesByCategory,
  articlePath,
  sections,
  type ChapterMeta,
  type Category
} from './content'

function groupArticles(items: ChapterMeta[]): DefaultTheme.SidebarItem[] {
  const groups = new Map<string, ChapterMeta[]>()

  for (const item of items) {
    const group = groups.get(item.part) ?? []
    group.push(item)
    groups.set(item.part, group)
  }

  return [...groups.entries()].map(([text, group]) => ({
    text: text.replace(/^第[一二三四五六七八九十]+部分[：:]?\s*/, ''),
    collapsed: false,
    items: group.map((item) => ({
      text: item.title,
      link: articlePath(item)
    }))
  }))
}

function groupAiArticles(items: ChapterMeta[]): DefaultTheme.SidebarItem[] {
  const byTrack = (track: 'mainline' | 'special'): DefaultTheme.SidebarItem[] =>
    items
      .filter((item) => item.track === track)
      .sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0))
      .map((item) => ({ text: item.title, link: articlePath(item) }))

  return [
    { text: '推荐阅读顺序', collapsed: false, items: byTrack('mainline') },
    { text: '专题阅读', collapsed: true, items: byTrack('special') }
  ]
}

export function createSidebar(): DefaultTheme.SidebarMulti {
  return Object.fromEntries(
    sections.map((section) => [
      section.path,
      [
        {
          text: section.title,
          link: section.path
        },
        ...(section.key === 'ai-agent'
          ? groupAiArticles(articlesByCategory(section.key))
          : groupArticles(articlesByCategory(section.key)))
      ]
    ])
  )
}

export function sectionNavigation(): DefaultTheme.NavItem[] {
  return sections.map((section) => ({
    text: section.title,
    link: section.path,
    activeMatch: `^/docs/${section.key}/`
  }))
}

export function categoryStart(category: Category): string {
  return articlePath(articlesByCategory(category)[0])
}
