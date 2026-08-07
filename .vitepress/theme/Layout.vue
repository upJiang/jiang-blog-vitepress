<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import ChapterGuide from './ChapterGuide.vue'
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-before>
      <ChapterGuide />
    </template>
  </DefaultTheme.Layout>
</template>
