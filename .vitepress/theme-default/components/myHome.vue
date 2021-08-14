<template>
  <div class="home-container">
    <span class="home-title">Jiang's Blog</span>
    <span class="home-tips">97 | 前端 | 学习</span>
    <span class="home-tips" style="margin-top: 0.4rem">
      今天的不开心就到此为止 明天依旧光芒万丈
    </span>
    <span class="home-sum">
      只有坚持学习，善于总结，不安逸于现状，有自己的目标，才能变得更加优秀！
    </span>
    <button class="home-learning" @click="toLearn">一起学习吧~</button>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { useRouter } from 'vitepress'

export default defineComponent({
  setup() {
    const router = useRouter()
    const toLearn = () => {
      router.go('/docs/jsBase/git')
    }
    return {
      toLearn
    }
  }
})
</script>

<style>
.home-container {
  padding-top: 2rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.home-title {
  color: var(--accent-color);
  text-align: center;
  font-size: 3.2rem;
  font-weight: bold;
  font-style: italic;
  padding-top: 10%;
}
.home-tips {
  margin-top: 1.6rem;
  color: var(--accent-color);
  font-weight: bold;
  font-size: 1rem;
}

.home-learning {
  margin-top: 2rem;
  width: 12rem;
  height: 3rem;
  text-align: center;
  line-height: 3rem;
  font-size: 1rem;
  color: #fff;
  background: var(--accent-color);
  border-radius: 6px;
  cursor: pointer;
  border: none;
  text-align: center;
}
.home-sum {
  margin-top: 0.4rem;
  color: #6495ed;
  font-size: 0.7rem;
  text-align: center;
}
@media screen and (max-width: 959px) {
  .home-title {
    font-size: 2.2rem;
  }
  .home-tips {
    margin-top: 1.6rem;
    font-size: 0.7rem;
  }
}
</style>
