---
title: 面试资料密码验证
---

# 面试资料 - 密码验证

<ClientOnly>
<div class="password-form-container">
  <div class="lock-icon">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  </div>
  <h2 class="form-title">需要密码验证</h2>
  <p class="form-description">此区域包含个人整理的前端面试资料，请输入密码继续访问</p>
  
  <div class="form-group">
    <input type="password" id="password" placeholder="请输入密码">
    <button id="submit-btn">验证</button>
  </div>
  
  <p id="error-message"></p>
  <p class="form-tip">提示：密码为默认密码</p>
</div>

<div id="interview-links" style="display: none;">
  <h2>面试资料目录</h2>
  <div class="grid-links">
    <a href="./GIT.html" class="grid-link">
      <span class="link-icon">📄</span>
      <span class="link-title">Git相关</span>
    </a>
    <a href="./近期面试遇到的问题汇总.html" class="grid-link">
      <span class="link-icon">📋</span>
      <span class="link-title">近期面试问题</span>
    </a>
    <a href="./算法.html" class="grid-link">
      <span class="link-icon">🧮</span>
      <span class="link-title">算法题</span>
    </a>
    <a href="./手写题.html" class="grid-link">
      <span class="link-icon">✍️</span>
      <span class="link-title">手写题</span>
    </a>
    <a href="./HTTP.html" class="grid-link">
      <span class="link-icon">🌐</span>
      <span class="link-title">HTTP</span>
    </a>
    <a href="./Vue-React.html" class="grid-link">
      <span class="link-icon">⚛️</span>
      <span class="link-title">Vue与React</span>
    </a>
    <a href="./浏览器加载渲染.html" class="grid-link">
      <span class="link-icon">🔍</span>
      <span class="link-title">浏览器渲染</span>
    </a>
    <a href="./前端安全.html" class="grid-link">
      <span class="link-icon">🔒</span>
      <span class="link-title">前端安全</span>
    </a>
    <a href="./浏览器.html" class="grid-link">
      <span class="link-icon">💻</span>
      <span class="link-title">浏览器</span>
    </a>
    <a href="./hr面.html" class="grid-link">
      <span class="link-icon">👥</span>
      <span class="link-title">HR面试问题</span>
    </a>
    <a href="./简历项目相关.html" class="grid-link">
      <span class="link-icon">📝</span>
      <span class="link-title">简历项目</span>
    </a>
    <a href="./node-koa-express.html" class="grid-link">
      <span class="link-icon">🛠️</span>
      <span class="link-title">Node相关</span>
    </a>
  </div>
</div>

<script>
// 将整个脚本内容直接执行，而不是等待DOMContentLoaded
(function() {
  console.log('脚本直接执行');
  
  // 确保DOM已加载
  function initPasswordForm() {
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submit-btn');
    const errorMessage = document.getElementById('error-message');
    const formContainer = document.querySelector('.password-form-container');
    const interviewLinks = document.getElementById('interview-links');
    
    if (!submitBtn || !passwordInput) {
      console.error('表单元素不存在，将在100ms后重试');
      setTimeout(initPasswordForm, 100);
      return;
    }
    
    console.log('找到表单元素，绑定事件');
    
    // 密码验证函数
    function handlePasswordSubmit() {
      console.log('密码验证触发');
      // 检查密码
      if (passwordInput.value === '123456') {
        console.log('密码正确');
        // 验证成功，设置授权状态
        try {
          localStorage.setItem('interview_auth', 'true');
          localStorage.setItem('interview_auth_time', Date.now().toString());
          
          // 显示成功消息
          if (errorMessage) {
            errorMessage.textContent = '验证成功！正在跳转...';
            errorMessage.style.color = '#52c41a'; // 绿色
          }
          
          // 获取重定向地址
          const redirectPath = localStorage.getItem('interview_redirect');
          
          // 直接跳转，不等待用户操作
          setTimeout(function() {
            if (redirectPath) {
              // 跳转到原始请求页面
              window.location.href = redirectPath;
              localStorage.removeItem('interview_redirect');
            } else {
              // 跳转到面试目录的第一个页面
              window.location.href = '/docs/进阶学习/面试/GIT.html';
            }
          }, 1000);
        } catch (e) {
          console.error('无法保存授权状态', e);
          if (errorMessage) {
            errorMessage.textContent = '验证成功，但无法保存登录状态';
            errorMessage.style.color = '#ff4d4f'; // 红色
          }
        }
      } else {
        console.log('密码错误');
        // 验证失败
        if (errorMessage) {
          errorMessage.textContent = '密码错误，请重试';
          errorMessage.style.color = '#ff4d4f'; // 红色
        }
        if (passwordInput) {
          passwordInput.value = '';
          
          // 添加抖动效果
          passwordInput.classList.add('shake');
          setTimeout(function() {
            passwordInput.classList.remove('shake');
          }, 500);
        }
      }
    }
    
    // 直接绑定事件，确保绑定成功
    submitBtn.onclick = handlePasswordSubmit;
    console.log('按钮点击事件已绑定');
    
    // 回车键事件
    passwordInput.onkeyup = function(e) {
      if (e.key === 'Enter') {
        handlePasswordSubmit();
      }
    };
    
    // 检查是否已授权
    try {
      const authStatus = localStorage.getItem('interview_auth') === 'true';
      const authTime = parseInt(localStorage.getItem('interview_auth_time') || '0', 10);
      const currentTime = Date.now();
      const isAuth = authStatus && (currentTime - (24 * 60 * 60 * 1000) < authTime);
      
      console.log('授权状态检查:', isAuth);
      
      // 如果已授权，检查是否有重定向地址
      if (isAuth) {
        const redirectPath = localStorage.getItem('interview_redirect');
        if (redirectPath) {
          // 直接跳转到请求页面
          window.location.href = redirectPath;
          localStorage.removeItem('interview_redirect');
        } else if (formContainer && interviewLinks) {
          // 显示导航链接
          formContainer.style.display = 'none';
          interviewLinks.style.display = 'block';
        }
      }
    } catch (e) {
      console.error('授权检查失败', e);
    }
  }
  
  // 如果DOM已加载，立即执行；否则等待DOM加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPasswordForm);
  } else {
    initPasswordForm();
  }
})();
</script>
</ClientOnly>

<style>
/* 全局样式调整 */
.password-form-container {
  max-width: 450px;
  margin: 40px auto;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
  background-color: var(--vp-c-bg-soft);
  text-align: center;
  transition: all 0.5s ease;
  position: relative;
}

/* 移动端适配 */
@media (max-width: 520px) {
  .password-form-container {
    max-width: 100%;
    margin: 20px auto;
    padding: 20px 15px;
    border-radius: 10px;
  }
}

.lock-icon {
  margin: 0 auto 20px;
  color: var(--vp-c-brand);
}

.form-title {
  margin: 0 0 10px;
  color: var(--vp-c-text-1);
  font-size: 1.8rem;
}

.form-description {
  margin-bottom: 25px;
  color: var(--vp-c-text-2);
  font-size: 1rem;
}

.form-group {
  display: flex;
  margin-bottom: 15px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.form-group input {
  flex: 1;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-right: none;
  border-radius: 8px 0 0 8px;
  font-size: 16px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  outline: none;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  border-color: var(--vp-c-brand);
}

.form-group button {
  padding: 0 20px;
  background-color: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
  white-space: nowrap;
}

.form-group button:hover {
  background-color: var(--vp-c-brand-dark);
}

#error-message {
  margin: 10px 0;
  min-height: 20px;
  font-size: 14px;
  font-weight: 500;
}

.form-tip {
  margin-top: 20px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

/* 面试链接网格布局 */
.grid-links {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.grid-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.grid-link:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-decoration: none;
}

.link-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.link-title {
  font-size: 0.9rem;
  font-weight: 500;
}

/* 动画效果 */
.shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% {
    transform: translate3d(-1px, 0, 0);
  }
  20%, 80% {
    transform: translate3d(2px, 0, 0);
  }
  30%, 50%, 70% {
    transform: translate3d(-3px, 0, 0);
  }
  40%, 60% {
    transform: translate3d(3px, 0, 0);
  }
}

/* 暗黑模式适配 */
.dark .grid-link {
  background-color: rgba(255, 255, 255, 0.05);
}

.dark .grid-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style> 