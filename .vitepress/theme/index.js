import DefaultTheme from '../theme-default' // To extend default theme.
import Docs from './components/Docs.vue'
import Tags from './components/Tags.vue'
import Comment from './components/Comment.vue'

export default {
  ...DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    // 注册组件
    app.component('Comment', Comment)
    app.component('Tags', Tags)
    app.component('Docs', Docs)

    // app is the Vue 3 app instance from createApp()
    // router is VitePress' custom router (see `lib/app/router.js`)
    // siteData is a ref of current site-level metadata.
  }
}
