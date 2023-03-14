<template>
    <div class="home-container">
      <span class="home-title">
        时间不在于拥有多少 
      </span>
       <span class="home-title">
        而在于你怎样使用
      </span>
      <span class="home-tips">
        前端 | 学习
      </span>
     
    </div>
  </template>
  
  <script>
  import { defineComponent } from 'vue'
  import { useRouter } from 'vitepress'
  export default defineComponent({
    setup() {
      const router = useRouter()
      const toLearn = () => {
        router.go('/docs/前端/start')
      }
      return {
        toLearn
      }
    }
  })
  </script>
  
  <style>
  .home-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: fixed;
    left: 50%;
    top: 30%;
    transform: translateX(-50%);
    width: 100%;
  }
  .home-title {
    color: var(--vp-c-text-1);
    text-align: center;
    font-size: 40px;
    font-weight: 600;
    line-height: 48px;
    font-style: italic;
  }
  .home-tips {
    margin-top: 1.6rem;

    font-weight: 600;
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
    margin-top: 0.5rem;
    font-size: 0.7rem;
    color: #773098;
    text-align: center;
  }
  @media screen and (max-width: 959px) {
    .home-title {
      font-size: 30px;
      line-height: 38px;
    }
    
  }
  </style>
  