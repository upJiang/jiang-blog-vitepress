// 面试资料保护脚本
// 确保只在浏览器环境中执行
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // 使用立即执行函数，防止变量污染全局命名空间
  ;(function () {
    try {
      console.log('面试保护脚本加载 - ' + new Date().toLocaleString())

      // 使用更可靠的方式检测当前路径
      function getCurrentPath() {
        return decodeURIComponent(window.location.pathname)
      }

      // 检查是否是需要保护的页面
      function isProtectedPage(path) {
        // 匹配面试目录下的所有页面（除了密码页面）
        // 统一使用小写来比较，增加兼容性
        const lowerPath = path.toLowerCase()
        return (
          lowerPath.indexOf('/docs/进阶学习/面试/') > -1 &&
          lowerPath.indexOf('/password') === -1 &&
          lowerPath.indexOf('/password.html') === -1
        )
      }

      // 检查授权状态
      function checkAuthorization() {
        try {
          // 检查localStorage中的授权状态
          const authStatus = localStorage.getItem('interview_auth') === 'true'
          const authTime = parseInt(
            localStorage.getItem('interview_auth_time') || '0',
            10
          )
          const currentTime = Date.now()
          const oneDayInMs = 24 * 60 * 60 * 1000

          return authStatus && currentTime - authTime < oneDayInMs
        } catch (error) {
          console.error('授权检查失败:', error)
          return false
        }
      }

      // 重定向到密码页面
      function redirectToPasswordPage(currentPath) {
        // 先保存当前路径用于验证后返回
        try {
          localStorage.setItem('interview_redirect', currentPath)
          console.log('已保存重定向路径:', currentPath)
        } catch (error) {
          console.error('保存路径失败', error)
        }

        // 隐藏页面内容
        document.documentElement.style.display = 'none'

        // 简单延迟确保页面能够被隐藏
        setTimeout(function () {
          // 强制重定向到密码页面 - 使用replace避免浏览器历史堆积
          const passwordPageUrl = '/docs/进阶学习/面试/password.html'
          console.log('重定向到:', passwordPageUrl)
          window.location.replace(passwordPageUrl)
        }, 10)
      }

      // 主流程
      function main() {
        const currentPath = getCurrentPath()
        console.log('当前路径:', currentPath)

        // 检查是否是保护页面
        if (isProtectedPage(currentPath)) {
          console.log('访问的是受保护页面')

          // 检查授权状态
          const isAuthorized = checkAuthorization()
          console.log('授权状态:', isAuthorized)

          // 如果未授权，重定向到密码页面
          if (!isAuthorized) {
            console.log('未授权，执行重定向...')
            redirectToPasswordPage(currentPath)
          } else {
            console.log('已授权，允许访问')
            // 确保页面显示正常
            document.documentElement.style.display = ''
          }
        } else {
          console.log('不是需要保护的页面，跳过检查')
        }
      }

      // 立即执行一次
      main()

      // 兜底方案：延迟再检查一次，确保在动态路由变化时也能捕获
      setTimeout(main, 200)
    } catch (error) {
      console.error('保护脚本执行出错:', error)
    }
  })()
}
