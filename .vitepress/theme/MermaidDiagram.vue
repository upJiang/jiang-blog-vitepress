<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{
  graph: string
  id: string
}>()

const { isDark } = useData()
const svg = ref('')
const error = ref('')
let renderVersion = 0

async function renderDiagram(): Promise<void> {
  try {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: isDark.value ? 'dark' : 'neutral',
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
    })
    const result = await mermaid.render(
      `${props.id}-${renderVersion++}`,
      decodeURIComponent(props.graph)
    )
    svg.value = result.svg
    error.value = ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '图表渲染失败'
  }
}

onMounted(renderDiagram)
watch(isDark, renderDiagram)
</script>

<template>
  <div class="mermaid mermaid-wrapper" role="img" aria-label="技术流程图">
    <div v-if="svg" v-html="svg" />
    <pre v-else-if="error" class="mermaid-error">{{ error }}</pre>
    <span v-else class="mermaid-loading" aria-live="polite">图表加载中</span>
  </div>
</template>
