<template>
  <div class="password-protection" v-if="showPasswordForm">
    <div class="password-container">
      <h2>密码保护</h2>
      <p>此内容需要密码才能访问</p>
      <div class="password-form">
        <input 
          type="password"
          v-model="password"
          placeholder="请输入密码"
          @keyup.enter="verifyPassword"
        />
        <button @click="verifyPassword">提交</button>
      </div>
      <div class="error-message" v-if="errorMessage">{{ errorMessage }}</div>
    </div>
  </div>
  <slot v-else></slot>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useData } from 'vitepress'

const route = useRoute()
const { theme } = useData()

const password = ref('')
const errorMessage = ref('')
const showPasswordForm = ref(true)
const correctPassword = '530274' // 你可以在这里设置密码，也可以从配置中读取

// 从localStorage获取已验证路径
const getVerifiedPaths = () => {
  const stored = localStorage.getItem('verifiedPaths')
  return stored ? JSON.parse(stored) : []
}

// 保存已验证路径到localStorage
const saveVerifiedPath = (path) => {
  const verifiedPaths = getVerifiedPaths()
  if (!verifiedPaths.includes(path)) {
    verifiedPaths.push(path)
    localStorage.setItem('verifiedPaths', JSON.stringify(verifiedPaths))
  }
}

// 检查当前路径是否已验证
const checkPathVerified = () => {
  const path = route.path
  const verifiedPaths = getVerifiedPaths()
  return verifiedPaths.includes(path) || verifiedPaths.includes('/docs/进阶学习/面试')
}

// 验证密码
const verifyPassword = () => {
  if (password.value === correctPassword) {
    showPasswordForm.value = false
    errorMessage.value = ''
    saveVerifiedPath(route.path)
    // 也保存面试目录的根路径
    saveVerifiedPath('/docs/进阶学习/面试')
  } else {
    errorMessage.value = '密码错误，请重试'
    password.value = ''
  }
}

onMounted(() => {
  // 检查是否已经验证过
  if (checkPathVerified()) {
    showPasswordForm.value = false
  }
})
</script>

<style>
.password-protection {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--vp-c-bg);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
}

.password-container {
  background-color: var(--vp-c-bg-soft);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.password-form {
  display: flex;
  margin-top: 1.5rem;
  gap: 0.5rem;
}

.password-form input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 1rem;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.password-form button {
  padding: 0.5rem 1rem;
  background-color: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.password-form button:hover {
  background-color: var(--vp-c-brand-dark);
}

.error-message {
  color: #ff5252;
  margin-top: 1rem;
}
</style> 