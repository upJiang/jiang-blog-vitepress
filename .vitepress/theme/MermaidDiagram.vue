<script setup lang="ts">
import { Maximize2, RotateCcw, X, ZoomIn, ZoomOut } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{
  graph: string
  id: string
}>()

const { isDark } = useData()
const svg = ref('')
const error = ref('')
const isViewerOpen = ref(false)
const isDragging = ref(false)
const scale = ref(1)
const panX = ref(0)
const panY = ref(0)
const closeButton = ref<HTMLButtonElement | null>(null)
const viewerDialog = ref<HTMLElement | null>(null)
let renderVersion = 0
let activePointerId: number | null = null
let dragStartX = 0
let dragStartY = 0
let panStartX = 0
let panStartY = 0
let focusBeforeViewer: HTMLElement | null = null
let bodyOverflowBeforeViewer = ''

const viewerTransform = computed(
  () => `translate3d(${panX.value}px, ${panY.value}px, 0) scale(${scale.value})`
)
const zoomPercentage = computed(() => `${Math.round(scale.value * 100)}%`)

const semanticRules = [
  {
    name: 'failure',
    classNames: ['failure', 'error', 'danger'],
    pattern: /失败|错误|异常|拒绝|拒答|超时|取消|回滚|降级|中断|fail|error|reject|timeout|cancel|rollback/i
  },
  {
    name: 'success',
    classNames: ['success', 'complete', 'verified'],
    pattern: /成功|通过|完成|验证结果|最终答案|返回答案|返回结果|输出结果|success|complete|verified|final answer/i
  },
  {
    name: 'input',
    classNames: ['input', 'user', 'request'],
    pattern: /用户|输入|请求|问题|查询|客户端|浏览器|user|input|request|query|client|browser/i
  },
  {
    name: 'model',
    classNames: ['model', 'llm', 'agent'],
    pattern: /模型|推理|生成|预测|Token|LLM|Agent|理解意图|规划|改写|model|inference|generate|reason|plan/i
  },
  {
    name: 'tool',
    classNames: ['tool', 'external', 'api'],
    pattern: /工具|MCP|API|外部|服务商|插件|搜索引擎|tool|external|provider|plugin/i
  },
  {
    name: 'data',
    classNames: ['data', 'evidence', 'storage'],
    pattern: /数据|证据|文档|数据库|缓存|索引|检索|向量|知识|消息队列|data|evidence|document|database|cache|index|retriev|vector|knowledge|queue/i
  },
  {
    name: 'program',
    classNames: ['program', 'process', 'runtime'],
    pattern: /.*/
  }
] as const

function decorateSvg(markup: string): string {
  const container = document.createElement('div')
  container.innerHTML = markup
  const svgNode = container.querySelector('svg')
  if (!svgNode) throw new Error('Mermaid 没有返回可渲染的 SVG。')

  svgNode.classList.add('xj-mermaid-svg')
  svgNode.setAttribute('aria-hidden', 'true')
  svgNode.setAttribute('focusable', 'false')
  svgNode.removeAttribute('width')
  svgNode.removeAttribute('height')

  const viewBox = svgNode.getAttribute('viewBox')?.split(/\s+/).map(Number)
  const naturalWidth = viewBox?.length === 4 && Number.isFinite(viewBox[2]) ? viewBox[2] : 760
  const naturalHeight = viewBox?.length === 4 && Number.isFinite(viewBox[3]) ? viewBox[3] : 360
  const isWideDiagram = naturalWidth / Math.max(naturalHeight, 1) > 2.2
  const previewWidth = Math.min(Math.max(naturalWidth, isWideDiagram ? 900 : 620), 1280)
  svgNode.style.setProperty('--xj-diagram-preview-width', `${Math.round(previewWidth)}px`)

  for (const node of svgNode.querySelectorAll<SVGGElement>('.node')) {
    const classNames = Array.from(node.classList)
    const label = node.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    const semantic = semanticRules.find(
      (rule) =>
        rule.classNames.some((className) => classNames.includes(className)) ||
        rule.pattern.test(label)
    )
    node.dataset.xjSemantic = semantic?.name ?? 'program'
  }

  return svgNode.outerHTML
}

async function renderDiagram(): Promise<void> {
  try {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      flowchart: {
        curve: 'basis',
        htmlLabels: true,
        nodeSpacing: 44,
        rankSpacing: 58,
        padding: 14,
        useMaxWidth: false
      },
      sequence: {
        actorMargin: 64,
        boxMargin: 12,
        messageMargin: 36,
        noteMargin: 14,
        useMaxWidth: false
      },
      themeVariables: isDark.value
        ? {
            background: '#111827',
            primaryColor: '#172554',
            primaryTextColor: '#e5edf7',
            primaryBorderColor: '#60a5fa',
            secondaryColor: '#2e1065',
            secondaryTextColor: '#f3e8ff',
            secondaryBorderColor: '#c084fc',
            tertiaryColor: '#422006',
            tertiaryTextColor: '#fef3c7',
            tertiaryBorderColor: '#fbbf24',
            lineColor: '#94a3b8',
            textColor: '#e5edf7',
            mainBkg: '#172554',
            nodeBorder: '#60a5fa',
            clusterBkg: '#161d2a',
            clusterBorder: '#475569',
            edgeLabelBackground: '#111827',
            actorBkg: '#172554',
            actorBorder: '#60a5fa',
            actorTextColor: '#e5edf7',
            signalColor: '#cbd5e1',
            signalTextColor: '#e5edf7',
            labelBoxBkgColor: '#1e293b',
            labelBoxBorderColor: '#64748b',
            labelTextColor: '#e5edf7',
            noteBkgColor: '#422006',
            noteBorderColor: '#fbbf24',
            noteTextColor: '#fef3c7',
            fontSize: '15px'
          }
        : {
            background: '#ffffff',
            primaryColor: '#eff6ff',
            primaryTextColor: '#172033',
            primaryBorderColor: '#3b82f6',
            secondaryColor: '#faf5ff',
            secondaryTextColor: '#3b0764',
            secondaryBorderColor: '#a855f7',
            tertiaryColor: '#fffbeb',
            tertiaryTextColor: '#713f12',
            tertiaryBorderColor: '#d97706',
            lineColor: '#64748b',
            textColor: '#172033',
            mainBkg: '#eff6ff',
            nodeBorder: '#3b82f6',
            clusterBkg: '#f8fafc',
            clusterBorder: '#cbd5e1',
            edgeLabelBackground: '#ffffff',
            actorBkg: '#eff6ff',
            actorBorder: '#3b82f6',
            actorTextColor: '#172033',
            signalColor: '#475569',
            signalTextColor: '#172033',
            labelBoxBkgColor: '#f8fafc',
            labelBoxBorderColor: '#94a3b8',
            labelTextColor: '#172033',
            noteBkgColor: '#fffbeb',
            noteBorderColor: '#d97706',
            noteTextColor: '#713f12',
            fontSize: '15px'
          },
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
    })
    const result = await mermaid.render(
      `${props.id}-${renderVersion++}`,
      decodeURIComponent(props.graph)
    )
    svg.value = decorateSvg(result.svg)
    error.value = ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '图表渲染失败'
  }
}

function resetView(): void {
  scale.value = 1
  panX.value = 0
  panY.value = 0
}

function zoomBy(amount: number): void {
  scale.value = Math.min(3, Math.max(0.5, Number((scale.value + amount).toFixed(2))))
}

function handleWheel(event: WheelEvent): void {
  zoomBy(event.deltaY < 0 ? 0.15 : -0.15)
}

async function openViewer(): Promise<void> {
  focusBeforeViewer = document.activeElement instanceof HTMLElement ? document.activeElement : null
  bodyOverflowBeforeViewer = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  resetView()
  isViewerOpen.value = true
  await nextTick()
  closeButton.value?.focus()
}

function closeViewer(restoreFocus = true): void {
  if (!isViewerOpen.value) return
  isViewerOpen.value = false
  isDragging.value = false
  activePointerId = null
  document.body.style.overflow = bodyOverflowBeforeViewer
  if (restoreFocus) nextTick(() => focusBeforeViewer?.focus())
}

function startDragging(event: PointerEvent): void {
  if (event.button !== 0) return
  activePointerId = event.pointerId
  dragStartX = event.clientX
  dragStartY = event.clientY
  panStartX = panX.value
  panStartY = panY.value
  isDragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function continueDragging(event: PointerEvent): void {
  if (!isDragging.value || event.pointerId !== activePointerId) return
  panX.value = panStartX + event.clientX - dragStartX
  panY.value = panStartY + event.clientY - dragStartY
}

function stopDragging(event?: PointerEvent): void {
  if (event && activePointerId !== null && event.pointerId !== activePointerId) return
  isDragging.value = false
  activePointerId = null
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (!isViewerOpen.value) return

  if (event.key === 'Escape') {
    event.preventDefault()
    closeViewer()
    return
  }
  if (event.key === '+' || event.key === '=') {
    event.preventDefault()
    zoomBy(0.15)
    return
  }
  if (event.key === '-') {
    event.preventDefault()
    zoomBy(-0.15)
    return
  }
  if (event.key === '0') {
    event.preventDefault()
    resetView()
    return
  }
  if (event.key !== 'Tab') return

  const focusableElements = Array.from(
    viewerDialog.value?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []
  )
  if (focusableElements.length === 0) return
  const first = focusableElements[0]
  const last = focusableElements[focusableElements.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  renderDiagram()
  window.addEventListener('keydown', handleGlobalKeydown)
})
watch(isDark, renderDiagram)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  closeViewer(false)
})
</script>

<template>
  <figure class="mermaid mermaid-wrapper">
    <div
      v-if="svg"
      class="mermaid-preview"
      role="button"
      tabindex="0"
      aria-label="放大查看技术流程图"
      @click="openViewer"
      @keydown.enter.prevent="openViewer"
      @keydown.space.prevent="openViewer"
    >
      <div class="mermaid-preview__diagram" v-html="svg" />
      <span class="mermaid-preview__expand" aria-hidden="true">
        <Maximize2 :size="19" :stroke-width="1.8" />
      </span>
    </div>
    <pre v-else-if="error" class="mermaid-error" role="alert">{{ error }}</pre>
    <span v-else class="mermaid-loading" aria-live="polite">图表加载中</span>
  </figure>

  <Teleport to="body">
    <Transition name="mermaid-viewer">
      <div
        v-if="isViewerOpen"
        class="mermaid-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mermaid-viewer-title"
        @click.self="closeViewer()"
      >
        <section ref="viewerDialog" class="mermaid-viewer__panel">
          <header class="mermaid-viewer__toolbar">
            <div class="mermaid-viewer__status">
              <span id="mermaid-viewer-title" class="mermaid-viewer__title">流程图</span>
              <output aria-live="polite">{{ zoomPercentage }}</output>
            </div>
            <div class="mermaid-viewer__actions">
              <button type="button" aria-label="缩小流程图" title="缩小" @click="zoomBy(-0.15)">
                <ZoomOut :size="20" :stroke-width="1.8" />
              </button>
              <button type="button" aria-label="放大流程图" title="放大" @click="zoomBy(0.15)">
                <ZoomIn :size="20" :stroke-width="1.8" />
              </button>
              <button type="button" aria-label="复位流程图" title="复位" @click="resetView">
                <RotateCcw :size="19" :stroke-width="1.8" />
              </button>
              <button
                ref="closeButton"
                type="button"
                aria-label="关闭流程图"
                title="关闭"
                @click="closeViewer()"
              >
                <X :size="21" :stroke-width="1.8" />
              </button>
            </div>
          </header>
          <div
            class="mermaid-viewer__stage"
            :class="{ 'is-dragging': isDragging }"
            @wheel.prevent="handleWheel"
            @dblclick="zoomBy(0.2)"
            @pointerdown="startDragging"
            @pointermove="continueDragging"
            @pointerup="stopDragging"
            @pointercancel="stopDragging"
          >
            <div
              class="mermaid-viewer__diagram"
              :style="{ transform: viewerTransform }"
              v-html="svg"
            />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
