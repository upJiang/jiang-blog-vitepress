import type { DefaultTheme } from 'vitepress'
import {
  articlesByCategory,
  articlePath,
  sections,
  type ArticleMeta,
  type Category
} from './content'

function groupArticles(items: ArticleMeta[]): DefaultTheme.SidebarItem[] {
  const groups = new Map<string, ArticleMeta[]>()

  for (const item of items) {
    const group = groups.get(item.group) ?? []
    group.push(item)
    groups.set(item.group, group)
  }

  return [...groups.entries()].map(([text, group]) => ({
    text,
    collapsed: false,
    items: group.map((item) => ({
      text: item.title,
      link: articlePath(item)
    }))
  }))
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
        ...groupArticles(articlesByCategory(section.key))
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
