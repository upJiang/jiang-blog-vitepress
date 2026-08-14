import type { DefaultTheme } from 'vitepress'
import {
  articlesByCategory,
  articlesInStageOrder,
  articlePath,
  sectionTrackGroups,
  sections,
  type Category
} from './content'

function groupArticles(category: Category): DefaultTheme.SidebarItem[] {
  return sectionTrackGroups(category).map((track) => {
    const articleItems = track.groups.flatMap((group) =>
      group.items.map((item) => ({ text: item.title, link: articlePath(item) }))
    )

    return {
      text: track.label,
      collapsed: true,
      items: articleItems
    }
  })
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
        ...groupArticles(section.key)
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
  return articlePath(articlesInStageOrder(category)[0])
}
