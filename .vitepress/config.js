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
        { text: '🏡首页', link: '/' },
        { text: '📚基础', link: '/docs/jsBase/git' },
        { text: '🤵面试', link: '/docs/interview/center' },
        { text: '🙇进阶', link: '/docs/jsAdvanced/index' },
        { text: '🧾文章', link: '/docs/article/index' }
        // { text: "归档", link: "/docs" },
        // { text: "分类", link: "/tags" },
      ],
      sidebar: {
        '/': [],
        // 侧边栏
        '/docs/jsBase/': [
          {
            text: '基础',
            children: [
              { text: 'git', link: '/docs/jsBase/git' },
              { text: 'es6', link: '/docs/jsBase/es6' },
              { text: 'this指向', link: '/docs/jsBase/this' },
              { text: 'JavaScript上下文', link: '/docs/jsBase/context' },
              { text: '垃圾回收机制方式', link: '/docs/jsBase/garbage' },
              { text: '内存管理', link: '/docs/jsBase/memory' },
              { text: '原型/原型链', link: '/docs/jsBase/prototype' },
              { text: 'js中的new', link: '/docs/jsBase/new' },
              { text: 'js中的五种绑定', link: '/docs/jsBase/bind' },
              { text: 'https', link: '/docs/jsBase/https' },
              { text: '浏览器缓存', link: '/docs/jsBase/storage' },
              { text: 'event loop', link: '/docs/jsBase/eventLoop' }
            ]
          }
        ],
        '/docs/interview/': [
          {
            text: '面试',
            children: [
              { text: '垂直居中', link: '/docs/interview/center' },
              { text: '进程、线程', link: '/docs/interview/process' },
              { text: '判断数据类型', link: '/docs/interview/dataType' },
              { text: '盒模型及如何转换', link: '/docs/interview/boxsizing' },
              { text: '回流、重绘', link: '/docs/interview/repaint' },
              { text: '节流防抖', link: '/docs/interview/debounce' },
              { text: 'HTTP状态码', link: '/docs/interview/httpCode' },
              { text: '深拷贝与浅拷贝', link: '/docs/interview/copy' }
            ]
          }
        ]
      }
    },
    dest: 'public'
  }

  return config
}
module.exports = getConfig()
