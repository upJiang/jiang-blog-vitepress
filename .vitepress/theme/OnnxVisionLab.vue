<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { Focus, ImageUp, Play, RotateCcw, ScanSearch, Tags } from '@lucide/vue'
import { withBase } from 'vitepress'
import type {
  ActiveBackend,
  AttentionCell,
  BackendMode,
  ClassificationItem,
  DetectionItem,
  ModelKind,
  VisionMode,
  WorkerRequest,
  WorkerResponse
} from './onnx-vision.types'

type RunState = 'idle' | 'preparing' | 'loading' | 'running' | 'explaining' | 'success' | 'error'

interface ModeMetrics {
  loadMs: number | null
  preprocessMs: number | null
  inferenceMs: number | null
  detailMs: number | null
}

interface PreparedTask {
  model: ModelKind
  data: ArrayBuffer
  originalWidth?: number
  originalHeight?: number
  scale?: number
}

const SAMPLE_IMAGE = '/images/onnx/domestic-cat-2011-g02-960.jpg'
const SQUEEZENET_URL = '/models/onnx/squeezenet1.0-12.onnx'
const YOLOX_URL = '/models/onnx/yolox-nano-416.onnx'
const IMAGENET_LABELS_URL = '/models/onnx/synset.txt'
const IMAGENET_CHINESE_LABELS_URL = '/models/onnx/imagenet.zh-CN.txt'
const COCO_CHINESE_LABELS_URL = '/models/onnx/coco.zh-CN.txt'
const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const DEFAULT_IMAGE_WIDTH = 960
const DEFAULT_IMAGE_HEIGHT = 640

const modeOptions: Array<{ value: VisionMode; label: string; model: ModelKind }> = [
  { value: 'classification', label: '整图分类', model: 'squeezenet' },
  { value: 'detection', label: '目标检测', model: 'yolox' }
]
const backendOptions: Array<{ value: BackendMode; label: string }> = [
  { value: 'auto', label: '自动' },
  { value: 'webgpu', label: 'WebGPU' },
  { value: 'wasm', label: 'WASM' }
]

const selectedMode = ref<VisionMode>('classification')
const selectedBackend = ref<BackendMode>('auto')
const loadedModels = ref<Partial<Record<ModelKind, ActiveBackend>>>({})
const state = ref<RunState>('idle')
const statusText = ref('使用内置猫图，模型尚未加载。')
const errorText = ref('')
const errorCode = ref('')
const fallbackReason = ref('')
const previewUrl = ref(withBase(SAMPLE_IMAGE))
const selectedFile = ref<File | null>(null)
const imageWidth = ref(DEFAULT_IMAGE_WIDTH)
const imageHeight = ref(DEFAULT_IMAGE_HEIGHT)
const classificationResults = ref<ClassificationItem[]>([])
const attentionCells = ref<AttentionCell[]>([])
const baselineProbability = ref<number | null>(null)
const detectionResults = ref<DetectionItem[]>([])
const hasDetectionOutput = ref(false)
const detectionThreshold = ref(0.25)
const filtering = ref(false)
const modeButtonRefs = ref<HTMLButtonElement[]>([])
const backendButtonRefs = ref<HTMLButtonElement[]>([])
const classificationMetrics = ref<ModeMetrics>({ loadMs: null, preprocessMs: null, inferenceMs: null, detailMs: null })
const detectionMetrics = ref<ModeMetrics>({ loadMs: null, preprocessMs: null, inferenceMs: null, detailMs: null })

let worker: Worker | null = null
let uploadObjectUrl: string | null = null
let pendingTask: PreparedTask | null = null
let filterTimer: ReturnType<typeof setTimeout> | null = null

const currentModel = computed<ModelKind>(() => selectedMode.value === 'classification' ? 'squeezenet' : 'yolox')
const currentMetrics = computed(() => selectedMode.value === 'classification'
  ? classificationMetrics.value
  : detectionMetrics.value)
const activeBackend = computed(() => loadedModels.value[currentModel.value] ?? null)
const isBusy = computed(() => ['preparing', 'loading', 'running', 'explaining'].includes(state.value))
const currentModelText = computed(() => selectedMode.value === 'classification'
  ? 'SqueezeNet · 4.95 MB'
  : 'YOLOX-Nano · 3.66 MB')
const runButtonText = computed(() => {
  if (state.value === 'loading') return '加载模型中'
  if (state.value === 'preparing') return '处理图片中'
  if (state.value === 'running') return '模型推理中'
  if (state.value === 'explaining') return '分析关注区域中'
  return selectedMode.value === 'classification' ? '运行整图分类' : '运行目标检测'
})
const detectionSummary = computed(() => {
  if (!hasDetectionOutput.value) return ''
  if (!detectionResults.value.length) {
    return '当前阈值下没有识别到模型支持的物体。这不代表图片没有内容，图片中的内容可能不属于模型支持的 80 类。'
  }
  const labels = [...new Set(detectionResults.value.map((item) => item.label))]
  return `模型识别到 ${detectionResults.value.length} 个候选目标：${labels.join('、')}。`
})
const svgViewBox = computed(() => `0 0 ${imageWidth.value} ${imageHeight.value}`)
const svgLabelFontSize = computed(() => Math.max(imageWidth.value / 48, 14))

function metricsFor(model: ModelKind): ModeMetrics {
  return model === 'squeezenet' ? classificationMetrics.value : detectionMetrics.value
}

function formatMs(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)} ms`
}

function terminateWorker(): void {
  worker?.terminate()
  worker = null
  loadedModels.value = {}
  pendingTask = null
}

function clearErrors(): void {
  errorText.value = ''
  errorCode.value = ''
  fallbackReason.value = ''
}

function clearImageResults(): void {
  classificationResults.value = []
  attentionCells.value = []
  baselineProbability.value = null
  detectionResults.value = []
  hasDetectionOutput.value = false
  classificationMetrics.value = { ...classificationMetrics.value, preprocessMs: null, inferenceMs: null, detailMs: null }
  detectionMetrics.value = { ...detectionMetrics.value, preprocessMs: null, inferenceMs: null, detailMs: null }
  clearErrors()
}

function setError(code: string, message: string): void {
  state.value = 'error'
  errorCode.value = code
  errorText.value = message
  statusText.value = '实验运行失败，请根据下方原因重试。'
  pendingTask = null
  filtering.value = false
}

function readerError(code: string, detail: string): string {
  const messages: Record<string, string> = {
    webgpu_unavailable: '当前浏览器、系统或显卡无法使用 WebGPU，请切换到自动或 WASM 后端。',
    model_load_failed: '模型加载失败，请检查网络后重试。模型文件不会从外部网站临时下载。',
    explanation_failed: '关注区域分析失败，已有分类结果仍然可用。',
    filter_failed: '检测结果筛选失败，请重新运行目标检测。',
    inference_failed: '模型推理失败，请重新选择执行后端后重试。'
  }
  if (messages[code]) return messages[code]
  return /[\u3400-\u9fff]/.test(detail) ? detail : '实验运行失败，请刷新页面后重试。'
}

function fallbackText(model: ModelKind, backend: ActiveBackend): string {
  if (selectedBackend.value !== 'auto' || backend !== 'wasm') return ''
  const modelName = model === 'squeezenet' ? 'SqueezeNet' : 'YOLOX-Nano'
  return `${modelName} 在当前浏览器中无法使用 WebGPU，自动模式已回退到 WASM。`
}

function selectMode(mode: VisionMode): void {
  if (selectedMode.value === mode || isBusy.value) return
  selectedMode.value = mode
  state.value = 'idle'
  clearErrors()
  const model = currentModel.value
  const backend = loadedModels.value[model]
  fallbackReason.value = backend ? fallbackText(model, backend) : ''
  statusText.value = mode === 'classification'
    ? '已切换到整图分类，这个模式判断整张图最像什么。'
    : '已切换到目标检测，这个模式定位图片中的常见物体。'
}

function selectBackend(backend: BackendMode): void {
  if (selectedBackend.value === backend || isBusy.value) return
  selectedBackend.value = backend
  terminateWorker()
  clearImageResults()
  classificationMetrics.value.loadMs = null
  detectionMetrics.value.loadMs = null
  state.value = 'idle'
  statusText.value = `已选择 ${backendOptions.find((item) => item.value === backend)?.label}，等待运行。`
}

function setButtonRef(collection: 'mode' | 'backend', element: Element | null, index: number): void {
  if (!(element instanceof HTMLButtonElement)) return
  if (collection === 'mode') modeButtonRefs.value[index] = element
  else backendButtonRefs.value[index] = element
}

function handleSegmentKeydown(event: KeyboardEvent, kind: 'mode' | 'backend', index: number): void {
  const options = kind === 'mode' ? modeOptions : backendOptions
  const refs = kind === 'mode' ? modeButtonRefs : backendButtonRefs
  let nextIndex: number | null = null
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % options.length
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + options.length) % options.length
  if (event.key === 'Home') nextIndex = 0
  if (event.key === 'End') nextIndex = options.length - 1
  if (nextIndex === null) return

  event.preventDefault()
  if (kind === 'mode') selectMode(modeOptions[nextIndex].value)
  else selectBackend(backendOptions[nextIndex].value)
  void nextTick(() => refs.value[nextIndex]?.focus())
}

function createWorker(): Worker {
  terminateWorker()
  const nextWorker = new Worker(new URL('./onnx-vision.worker.ts', import.meta.url), { type: 'module' })
  nextWorker.addEventListener('message', onWorkerMessage)
  nextWorker.addEventListener('error', () => setError('worker_failed', '推理任务启动失败，请刷新页面后重试。'))
  worker = nextWorker
  return nextWorker
}

function post(request: WorkerRequest, transfer: Transferable[] = []): void {
  worker?.postMessage(request, transfer)
}

function dispatchPreparedTask(task: PreparedTask): void {
  state.value = 'running'
  const backend = loadedModels.value[task.model]
  statusText.value = `正在使用 ${backend?.toUpperCase()} 执行${task.model === 'squeezenet' ? '整图分类' : '目标检测'}。`
  if (task.model === 'squeezenet') {
    post({ type: 'classify', data: task.data }, [task.data])
    return
  }
  post({
    type: 'detect',
    data: task.data,
    originalWidth: task.originalWidth ?? 0,
    originalHeight: task.originalHeight ?? 0,
    scale: task.scale ?? 0,
    threshold: detectionThreshold.value
  }, [task.data])
}

function onWorkerMessage(event: MessageEvent<WorkerResponse>): void {
  const message = event.data
  if (message.type === 'error') {
    const readableMessage = readerError(message.code, message.message)
    if (message.code === 'explanation_failed' && classificationResults.value.length) {
      state.value = 'success'
      errorCode.value = message.code
      errorText.value = readableMessage
      statusText.value = '分类结果仍然可用，可以重新尝试关注区域分析。'
      return
    }
    if (message.code === 'filter_failed' && hasDetectionOutput.value) {
      state.value = 'success'
      filtering.value = false
      errorCode.value = message.code
      errorText.value = readableMessage
      return
    }
    setError(message.code, readableMessage)
    return
  }

  if (message.type === 'loaded') {
    loadedModels.value = { ...loadedModels.value, [message.model]: message.backend }
    metricsFor(message.model).loadMs = message.loadMs
    fallbackReason.value = fallbackText(message.model, message.backend)
    if (!pendingTask || pendingTask.model !== message.model) {
      setError('image_data_missing', '图片预处理结果已经失效，请重新运行。')
      return
    }
    const task = pendingTask
    pendingTask = null
    dispatchPreparedTask(task)
    return
  }

  if (message.type === 'classified') {
    classificationResults.value = message.items
    classificationMetrics.value.inferenceMs = message.inferenceMs
    state.value = 'success'
    statusText.value = '整图分类完成。下方五项是同一张图的备选答案。'
    return
  }

  if (message.type === 'explained') {
    attentionCells.value = message.cells
    baselineProbability.value = message.baselineProbability
    classificationMetrics.value.detailMs = message.explainMs
    state.value = 'success'
    statusText.value = '关注区域分析完成。颜色越深，遮住该区域后模型分数下降越明显。'
    return
  }

  if (message.type === 'detected') {
    detectionResults.value = message.items
    hasDetectionOutput.value = true
    detectionMetrics.value.inferenceMs = message.inferenceMs
    detectionMetrics.value.detailMs = message.postprocessMs
    state.value = 'success'
    filtering.value = false
    statusText.value = message.items.length
      ? '目标检测完成，图片上的框表示模型认为物体所在的位置。'
      : '目标检测完成，当前阈值下没有可显示的结果。'
    return
  }

  detectionResults.value = message.items
  detectionMetrics.value.detailMs = message.postprocessMs
  filtering.value = false
  state.value = 'success'
  statusText.value = `已用 ${(message.threshold * 100).toFixed(0)}% 置信度阈值重新筛选，没有重复运行模型。`
}

async function imageSource(): Promise<Blob> {
  if (selectedFile.value) return selectedFile.value
  const response = await fetch(withBase(SAMPLE_IMAGE))
  if (!response.ok) throw new Error(`内置图片请求返回 HTTP ${response.status}`)
  return response.blob()
}

async function preprocessClassification(): Promise<PreparedTask> {
  const startedAt = performance.now()
  const bitmap = await createImageBitmap(await imageSource())
  imageWidth.value = bitmap.width
  imageHeight.value = bitmap.height
  const side = Math.min(bitmap.width, bitmap.height)
  const sourceX = (bitmap.width - side) / 2
  const sourceY = (bitmap.height - side) / 2
  const canvas = document.createElement('canvas')
  canvas.width = 224
  canvas.height = 224
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    bitmap.close()
    throw new Error('浏览器无法创建图片预处理环境')
  }
  context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, 224, 224)
  bitmap.close()
  const pixels = context.getImageData(0, 0, 224, 224).data
  const planeSize = 224 * 224
  const tensor = new Float32Array(planeSize * 3)
  const means = [0.485, 0.456, 0.406]
  const standardDeviations = [0.229, 0.224, 0.225]

  for (let position = 0; position < planeSize; position += 1) {
    const pixel = position * 4
    tensor[position] = (pixels[pixel] / 255 - means[0]) / standardDeviations[0]
    tensor[planeSize + position] = (pixels[pixel + 1] / 255 - means[1]) / standardDeviations[1]
    tensor[planeSize * 2 + position] = (pixels[pixel + 2] / 255 - means[2]) / standardDeviations[2]
  }
  classificationMetrics.value.preprocessMs = performance.now() - startedAt
  return { model: 'squeezenet', data: tensor.buffer }
}

async function preprocessDetection(): Promise<PreparedTask> {
  const startedAt = performance.now()
  const bitmap = await createImageBitmap(await imageSource())
  imageWidth.value = bitmap.width
  imageHeight.value = bitmap.height
  const inputSide = 416
  const scale = Math.min(inputSide / bitmap.width, inputSide / bitmap.height)
  const drawnWidth = Math.floor(bitmap.width * scale)
  const drawnHeight = Math.floor(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = inputSide
  canvas.height = inputSide
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    bitmap.close()
    throw new Error('浏览器无法创建图片预处理环境')
  }
  context.fillStyle = 'rgb(114, 114, 114)'
  context.fillRect(0, 0, inputSide, inputSide)
  context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, drawnWidth, drawnHeight)
  bitmap.close()

  const pixels = context.getImageData(0, 0, inputSide, inputSide).data
  const planeSize = inputSide * inputSide
  const tensor = new Float32Array(planeSize * 3)
  for (let position = 0; position < planeSize; position += 1) {
    const pixel = position * 4
    tensor[position] = pixels[pixel]
    tensor[planeSize + position] = pixels[pixel + 1]
    tensor[planeSize * 2 + position] = pixels[pixel + 2]
  }
  detectionMetrics.value.preprocessMs = performance.now() - startedAt
  return {
    model: 'yolox',
    data: tensor.buffer,
    originalWidth: imageWidth.value,
    originalHeight: imageHeight.value,
    scale
  }
}

function loadRequest(model: ModelKind): Extract<WorkerRequest, { type: 'load' }> {
  if (model === 'squeezenet') {
    return {
      type: 'load',
      model,
      backend: selectedBackend.value,
      modelUrl: withBase(SQUEEZENET_URL),
      labelsUrl: withBase(IMAGENET_LABELS_URL),
      chineseLabelsUrl: withBase(IMAGENET_CHINESE_LABELS_URL)
    }
  }
  return {
    type: 'load',
    model,
    backend: selectedBackend.value,
    modelUrl: withBase(YOLOX_URL),
    labelsUrl: withBase(COCO_CHINESE_LABELS_URL)
  }
}

async function runCurrentMode(): Promise<void> {
  if (isBusy.value) return
  clearErrors()
  const nextWorker = worker ?? createWorker()
  state.value = 'preparing'
  if (selectedMode.value === 'classification') {
    classificationResults.value = []
    attentionCells.value = []
    baselineProbability.value = null
    classificationMetrics.value.inferenceMs = null
    classificationMetrics.value.detailMs = null
    statusText.value = '正在中心裁剪图片并构造 [1, 3, 224, 224] Tensor。'
  } else {
    detectionResults.value = []
    hasDetectionOutput.value = false
    detectionMetrics.value.inferenceMs = null
    detectionMetrics.value.detailMs = null
    statusText.value = '正在等比缩放图片并构造 [1, 3, 416, 416] Tensor。'
  }

  try {
    pendingTask = selectedMode.value === 'classification'
      ? await preprocessClassification()
      : await preprocessDetection()
  } catch (error) {
    setError('image_read_failed', error instanceof Error ? error.message : String(error))
    return
  }

  if (loadedModels.value[pendingTask.model]) {
    const task = pendingTask
    pendingTask = null
    dispatchPreparedTask(task)
    return
  }

  state.value = 'loading'
  statusText.value = `正在加载 ${currentModelText.value} 并初始化推理会话。`
  nextWorker.postMessage(loadRequest(pendingTask.model))
}

function attentionOpacity(impact: number): number {
  const largestImpact = Math.max(...attentionCells.value.map((cell) => cell.impact), 0)
  if (largestImpact <= 0) return 0
  return 0.15 + (impact / largestImpact) * 0.7
}

function cellStyle(cell: AttentionCell): Record<string, string> {
  return {
    gridColumn: String(cell.column + 1),
    gridRow: String(cell.row + 1),
    opacity: String(attentionOpacity(cell.impact))
  }
}

function strongestAttentionText(): string {
  const strongestCells = [...attentionCells.value].sort((left, right) => right.impact - left.impact).slice(0, 3)
  if (!strongestCells[0] || strongestCells[0].impact <= 0) return '本次遮挡没有产生可观察的概率下降。'
  return strongestCells
    .map((cell) => `第 ${cell.row + 1} 行第 ${cell.column + 1} 列（下降 ${(cell.impact * 100).toFixed(1)}%）`)
    .join('、')
}

async function explainAttention(): Promise<void> {
  if (!worker || !classificationResults.value[0] || state.value !== 'success') return
  clearErrors()
  state.value = 'explaining'
  statusText.value = '正在逐格遮住图片并重新推理，检查哪些区域影响当前第一候选。'
  try {
    const task = await preprocessClassification()
    attentionCells.value = []
    baselineProbability.value = null
    classificationMetrics.value.detailMs = null
    post({ type: 'explain', data: task.data, targetIndex: classificationResults.value[0].index }, [task.data])
  } catch (error) {
    setError('image_read_failed', error instanceof Error ? error.message : String(error))
  }
}

function scheduleDetectionFilter(event: Event): void {
  detectionThreshold.value = Number((event.target as HTMLInputElement).value)
  if (!hasDetectionOutput.value || !worker) return
  filtering.value = true
  errorText.value = ''
  errorCode.value = ''
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => post({ type: 'filter', threshold: detectionThreshold.value }), 80)
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    input.value = ''
    setError('invalid_image_type', '请选择 JPEG、PNG、WebP 等浏览器可解码的图片。')
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    input.value = ''
    setError('image_too_large', '图片不能超过 12 MB。')
    return
  }

  if (uploadObjectUrl) URL.revokeObjectURL(uploadObjectUrl)
  uploadObjectUrl = URL.createObjectURL(file)
  selectedFile.value = file
  previewUrl.value = uploadObjectUrl
  clearImageResults()
  state.value = 'idle'
  statusText.value = `已选择 ${file.name}，图片只在当前浏览器中处理。`
}

function restoreSample(): void {
  if (uploadObjectUrl) URL.revokeObjectURL(uploadObjectUrl)
  uploadObjectUrl = null
  selectedFile.value = null
  previewUrl.value = withBase(SAMPLE_IMAGE)
  imageWidth.value = DEFAULT_IMAGE_WIDTH
  imageHeight.value = DEFAULT_IMAGE_HEIGHT
  clearImageResults()
  state.value = 'idle'
  statusText.value = '已恢复内置猫图，等待运行。'
}

function detectionLabel(item: DetectionItem): string {
  return `${item.label} ${(item.score * 100).toFixed(0)}%`
}

function labelY(item: DetectionItem): number {
  return Math.max(0, item.y - svgLabelFontSize.value * 1.55)
}

function labelWidth(item: DetectionItem): number {
  const estimated = detectionLabel(item).length * svgLabelFontSize.value * 0.72 + svgLabelFontSize.value
  return Math.min(estimated, imageWidth.value - item.x)
}

function coordinateText(item: DetectionItem): string {
  const x2 = Math.min(imageWidth.value, item.x + item.width)
  const y2 = Math.min(imageHeight.value, item.y + item.height)
  return `左上 (${Math.round(item.x)}, ${Math.round(item.y)})，右下 (${Math.round(x2)}, ${Math.round(y2)})`
}

onBeforeUnmount(() => {
  terminateWorker()
  if (uploadObjectUrl) URL.revokeObjectURL(uploadObjectUrl)
  if (filterTimer) clearTimeout(filterTimer)
})
</script>

<template>
  <section class="onnx-lab onnx-vision-lab" aria-labelledby="onnx-lab-title">
    <header class="onnx-lab__header">
      <div>
        <p class="onnx-lab__eyebrow">浏览器本地推理</p>
        <h2 id="onnx-lab-title">ONNX 图片识别实验</h2>
      </div>
      <span class="onnx-lab__privacy">图片不会上传</span>
    </header>

    <div class="onnx-lab__mode-tabs" role="tablist" aria-label="图片识别模式">
      <button
        v-for="(option, index) in modeOptions"
        :id="`vision-mode-${option.value}`"
        :key="option.value"
        :ref="(element) => setButtonRef('mode', element as Element | null, index)"
        type="button"
        role="tab"
        :aria-selected="selectedMode === option.value"
        :aria-controls="`vision-panel-${option.value}`"
        :tabindex="selectedMode === option.value ? 0 : -1"
        :disabled="isBusy"
        @click="selectMode(option.value)"
        @keydown="handleSegmentKeydown($event, 'mode', index)"
      >
        <Tags v-if="option.value === 'classification'" :size="18" aria-hidden="true" />
        <ScanSearch v-else :size="18" aria-hidden="true" />
        <span>{{ option.label }}</span>
      </button>
    </div>

    <div
      :id="`vision-panel-${selectedMode}`"
      class="onnx-lab__workspace"
      role="tabpanel"
      :aria-labelledby="`vision-mode-${selectedMode}`"
    >
      <div class="onnx-lab__image-panel">
        <div class="onnx-lab__image-frame" :class="{ 'is-classification': selectedMode === 'classification' }">
          <img
            :src="previewUrl"
            :alt="selectedMode === 'classification' ? '整图分类使用的中心裁剪图片' : '用于目标检测的完整图片'"
          />
          <div v-if="selectedMode === 'classification' && attentionCells.length" class="onnx-lab__attention-map" aria-hidden="true">
            <span v-for="cell in attentionCells" :key="`${cell.row}-${cell.column}`" :style="cellStyle(cell)" />
          </div>
          <svg
            v-if="selectedMode === 'detection' && detectionResults.length"
            class="onnx-lab__detection-overlay"
            :viewBox="svgViewBox"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <g v-for="item in detectionResults" :key="item.id">
              <rect class="onnx-lab__detection-box" :x="item.x" :y="item.y" :width="item.width" :height="item.height" />
              <rect
                class="onnx-lab__detection-label-bg"
                :x="item.x"
                :y="labelY(item)"
                :width="labelWidth(item)"
                :height="svgLabelFontSize * 1.55"
              />
              <text
                class="onnx-lab__detection-label"
                :x="item.x + svgLabelFontSize * 0.35"
                :y="labelY(item) + svgLabelFontSize * 1.12"
                :font-size="svgLabelFontSize"
              >{{ detectionLabel(item) }}</text>
            </g>
          </svg>
        </div>
        <div class="onnx-lab__image-actions">
          <label class="onnx-lab__file-button">
            <ImageUp :size="18" aria-hidden="true" />
            <span>选择图片</span>
            <input type="file" accept="image/*" @change="onFileChange" />
          </label>
          <button
            v-if="selectedFile"
            type="button"
            class="onnx-lab__icon-button"
            title="恢复内置猫图"
            aria-label="恢复内置猫图"
            @click="restoreSample"
          >
            <RotateCcw :size="18" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="onnx-lab__controls">
        <div class="onnx-lab__mode-summary">
          <span>{{ selectedMode === 'classification' ? '整张图最像什么？' : '图片中有什么，它们在哪里？' }}</span>
          <p v-if="selectedMode === 'classification'">SqueezeNet 会在 1000 个整图类别中排序，不负责标出物体位置。</p>
          <template v-else>
            <p>YOLOX-Nano 只会在 COCO 的 80 种常见物体中查找目标，例如人、猫、狗、汽车、杯子、手机、椅子和床。</p>
            <p>圆形、颜色、文字和 Logo 不属于这 80 类；没有检测结果不等于图片没有内容。</p>
          </template>
        </div>

        <fieldset>
          <legend>执行后端</legend>
          <div class="onnx-lab__segments" role="group" aria-label="执行后端">
            <button
              v-for="(option, index) in backendOptions"
              :key="option.value"
              :ref="(element) => setButtonRef('backend', element as Element | null, index)"
              type="button"
              :aria-pressed="selectedBackend === option.value"
              :tabindex="selectedBackend === option.value ? 0 : -1"
              :disabled="isBusy"
              @click="selectBackend(option.value)"
              @keydown="handleSegmentKeydown($event, 'backend', index)"
            >
              {{ option.label }}
            </button>
          </div>
        </fieldset>

        <label v-if="selectedMode === 'detection'" class="onnx-lab__threshold" for="onnx-detection-threshold">
          <span>置信度阈值</span>
          <output for="onnx-detection-threshold">{{ (detectionThreshold * 100).toFixed(0) }}%</output>
          <input
            id="onnx-detection-threshold"
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            :value="detectionThreshold"
            :aria-valuetext="`${(detectionThreshold * 100).toFixed(0)}%`"
            @input="scheduleDetectionFilter"
          />
          <span class="onnx-lab__threshold-hint">阈值越高，结果越少；阈值越低，越容易出现误检。</span>
        </label>

        <button type="button" class="onnx-lab__run" :disabled="isBusy" @click="runCurrentMode">
          <Play :size="18" :fill="isBusy ? 'none' : 'currentColor'" aria-hidden="true" />
          <span>{{ runButtonText }}</span>
        </button>

        <button
          v-if="selectedMode === 'classification' && classificationResults.length"
          type="button"
          class="onnx-lab__explain"
          :disabled="state === 'explaining'"
          @click="explainAttention"
        >
          <Focus :size="18" aria-hidden="true" />
          <span>{{ state === 'explaining' ? '分析中' : '分析模型关注区域' }}</span>
        </button>

        <p class="onnx-lab__status" role="status" aria-live="polite">{{ filtering ? '正在重新筛选检测结果。' : statusText }}</p>
        <p v-if="fallbackReason" class="onnx-lab__notice">{{ fallbackReason }}</p>
        <p v-if="errorText" class="onnx-lab__error" role="alert" :data-error-code="errorCode">{{ errorText }}</p>
      </div>
    </div>

    <dl class="onnx-lab__metrics">
      <div><dt>模型</dt><dd>{{ currentModelText }}</dd></div>
      <div><dt>当前后端</dt><dd>{{ activeBackend?.toUpperCase() ?? '未加载' }}</dd></div>
      <div><dt>模型加载</dt><dd>{{ formatMs(currentMetrics.loadMs) }}</dd></div>
      <div><dt>图片预处理</dt><dd>{{ formatMs(currentMetrics.preprocessMs) }}</dd></div>
      <div><dt>模型推理</dt><dd>{{ formatMs(currentMetrics.inferenceMs) }}</dd></div>
      <div><dt>{{ selectedMode === 'classification' ? '关注分析' : '结果后处理' }}</dt><dd>{{ formatMs(currentMetrics.detailMs) }}</dd></div>
    </dl>

    <div v-if="selectedMode === 'classification' && classificationResults.length" class="onnx-lab__results" aria-label="整图分类的五个中文候选">
      <h3>模型认为整张图片最像什么</h3>
      <p>这是同一个问题的五个备选答案，不是图片中的五个物体。</p>
      <ol>
        <li v-for="item in classificationResults" :key="item.index">
          <span>{{ item.label }}</span>
          <span>{{ (item.probability * 100).toFixed(2) }}%</span>
          <span class="onnx-lab__bar" aria-hidden="true"><span :style="{ width: `${Math.max(item.probability * 100, 1)}%` }" /></span>
        </li>
      </ol>
    </div>

    <div v-if="selectedMode === 'classification' && attentionCells.length" class="onnx-lab__explanation" aria-label="模型关注区域说明">
      <h3>模型判断时主要受哪些区域影响</h3>
      <p>
        当前第一候选是“{{ classificationResults[0]?.label }}”，原始概率为 {{ ((baselineProbability ?? 0) * 100).toFixed(2) }}%。
        颜色越深，遮住该区域后模型分数下降越明显。
      </p>
      <p>影响最大的区域：{{ strongestAttentionText() }}</p>
      <p>这只能说明模型依赖哪个区域，不能证明模型明确识别出了耳朵、毛发等具名特征。</p>
    </div>

    <div v-if="selectedMode === 'detection' && hasDetectionOutput" class="onnx-lab__results onnx-lab__detections" aria-label="目标检测结果">
      <h3>图片中有什么，它们在哪里</h3>
      <p class="onnx-lab__detection-summary" aria-live="polite">{{ detectionSummary }}</p>
      <p v-if="detectionResults.length">检测框表示模型的位置判断，置信度是模型分数，不是事实保证。</p>
      <ol v-if="detectionResults.length">
        <li v-for="item in detectionResults" :key="item.id" class="onnx-lab__detection-item">
          <span>{{ item.label }}</span>
          <span>{{ (item.score * 100).toFixed(2) }}%</span>
          <span v-if="item.score < 0.4" class="onnx-lab__uncertain">可能误检</span>
          <span class="onnx-lab__coordinates">{{ coordinateText(item) }}</span>
        </li>
      </ol>
    </div>
  </section>
</template>
