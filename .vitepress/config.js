const getPages = require('./utils/pages')

async function getConfig() {
  const config = {
    head: [
      [
        'meta',
        {
          name: 'viewport',
          content:
            'width=device-width,initial-scale=1,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no'
        }
      ],
      ['meta', { name: 'keywords', content: 'Jiang的个人博客' }],
      ['link', { rel: 'icon', href: '/favicon.ico' }],
      // 引入 Gitalk
      [
        'link',
        { rel: 'stylesheet', href: 'https://unpkg.com/gitalk/dist/gitalk.css' }
      ],
      ['script', { src: 'https://unpkg.com/gitalk/dist/gitalk.min.js' }]
    ],
    title: "Jiang's Blog",
    themeConfig: {
      pages: await getPages(),
      author: 'Jiang',
      search: true,
      nav: [
        { text: '首页', link: '/' },
        { text: '基础', link: '/docs/jsBase/index' },
        { text: '进阶', link: '/docs/jsAdvanced/index' },
        { text: '文章', link: '/docs/article/index' }
        // { text: "归档", link: "/docs" },
        // { text: "分类", link: "/tags" },
      ]
    },
    dest: 'public'
  }

  return config
}
module.exports = getConfig()
