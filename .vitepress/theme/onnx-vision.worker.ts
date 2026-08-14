/// <reference lib="webworker" />

import type { InferenceSession } from 'onnxruntime-web'
import wasmBinaryUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url'
import webGpuWasmBinaryUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm?url'
import type {
  ActiveBackend,
  AttentionCell,
  BackendMode,
  ClassificationItem,
  DetectionItem,
  ModelKind,
  WorkerRequest,
  WorkerResponse
} from './onnx-vision.types'

const workerScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope
const YOLO_INPUT_SIDE = 416
const YOLO_OUTPUT_ROWS = 3549
const YOLO_OUTPUT_COLUMNS = 85
const YOLO_CLASS_COUNT = 80
const NMS_THRESHOLD = 0.45

interface LoadedSession {
  backend: ActiveBackend
  session: InferenceSession
}

interface DetectionContext {
  output: Float32Array
  originalWidth: number
  originalHeight: number
  scale: number
}

interface DetectionCandidate extends DetectionItem {
  x2: number
  y2: number
}

const sessions = new Map<ModelKind, LoadedSession>()
let imageNetLabels: string[] = []
let imageNetChineseLabels: string[] = []
let cocoChineseLabels: string[] = []
let detectionContext: DetectionContext | null = null

class WebGpuUnavailableError extends Error {}
class ModelLoadError extends Error {}

function respond(message: WorkerResponse): void {
  workerScope.postMessage(message)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function fetchLines(url: string, expected: number, label: string): Promise<string[]> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${label}请求返回 HTTP ${response.status}`)
  const lines = (await response.text()).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length !== expected) throw new Error(`${label}应为 ${expected} 行，实际为 ${lines.length}`)
  return lines
}

async function fetchModel(modelUrl: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(modelUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.arrayBuffer()
  } catch (error) {
    throw new ModelLoadError(errorMessage(error))
  }
}

async function createSession(modelData: ArrayBuffer, backend: ActiveBackend): Promise<InferenceSession> {
  if (backend === 'webgpu') {
    try {
      if (!('gpu' in navigator)) throw new Error('当前浏览器没有提供 WebGPU')
      const ort = await import('onnxruntime-web/webgpu')
      ort.env.wasm.wasmPaths = { wasm: webGpuWasmBinaryUrl }
      return await ort.InferenceSession.create(modelData, {
        executionProviders: ['webgpu'],
        graphOptimizationLevel: 'all'
      })
    } catch (error) {
      throw new WebGpuUnavailableError(errorMessage(error))
    }
  }

  const ort = await import('onnxruntime-web/wasm')
  ort.env.wasm.numThreads = 1
  ort.env.wasm.proxy = false
  ort.env.wasm.wasmPaths = { wasm: wasmBinaryUrl }
  return ort.InferenceSession.create(modelData, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all'
  })
}

async function ensureLabels(request: Extract<WorkerRequest, { type: 'load' }>): Promise<void> {
  if (request.model === 'squeezenet') {
    if (!request.chineseLabelsUrl) throw new Error('缺少 ImageNet 中文标签地址')
    if (!imageNetLabels.length) {
      imageNetLabels = (await fetchLines(request.labelsUrl, 1000, 'ImageNet 原始标签'))
        .map((line) => line.replace(/^n\d+\s+/, ''))
    }
    if (!imageNetChineseLabels.length) {
      imageNetChineseLabels = await fetchLines(request.chineseLabelsUrl, 1000, 'ImageNet 中文标签')
    }
    return
  }

  if (!cocoChineseLabels.length) {
    cocoChineseLabels = await fetchLines(request.labelsUrl, YOLO_CLASS_COUNT, 'COCO 中文标签')
  }
}

async function loadModel(request: Extract<WorkerRequest, { type: 'load' }>): Promise<void> {
  await ensureLabels(request)
  const cached = sessions.get(request.model)
  if (cached) {
    respond({ type: 'loaded', model: request.model, backend: cached.backend, loadMs: 0, reused: true })
    return
  }

  const startedAt = performance.now()
  let loaded: LoadedSession | null = null
  const modelData = await fetchModel(request.modelUrl)

  if (request.backend === 'auto' || request.backend === 'webgpu') {
    try {
      loaded = { backend: 'webgpu', session: await createSession(modelData, 'webgpu') }
    } catch (error) {
      if (request.backend === 'webgpu') throw error
    }
  }
  if (!loaded) loaded = { backend: 'wasm', session: await createSession(modelData, 'wasm') }

  sessions.set(request.model, loaded)
  respond({
    type: 'loaded',
    model: request.model,
    backend: loaded.backend,
    loadMs: performance.now() - startedAt,
    reused: false
  })
}

async function runtimeFor(backend: ActiveBackend) {
  return backend === 'webgpu'
    ? import('onnxruntime-web/webgpu')
    : import('onnxruntime-web/wasm')
}

function probabilitiesFor(scores: Float32Array): Float32Array {
  const total = scores.reduce((sum, value) => sum + value, 0)
  const isProbabilityDistribution = scores.every((value) => value >= 0 && value <= 1) &&
    Math.abs(total - 1) < 0.001
  if (isProbabilityDistribution) return scores

  const maxScore = scores.reduce((max, value) => Math.max(max, value), Number.NEGATIVE_INFINITY)
  const exponentials = scores.map((score) => Math.exp(score - maxScore))
  const exponentialTotal = exponentials.reduce((sum, value) => sum + value, 0)
  return exponentials.map((value) => value / exponentialTotal)
}

function topFive(scores: Float32Array): ClassificationItem[] {
  const probabilities = probabilitiesFor(scores)
  return Array.from(probabilities, (probability, index) => ({
    index,
    label: imageNetChineseLabels[index] ?? `类别 ${index}`,
    originalLabel: imageNetLabels[index] ?? `class ${index}`,
    probability
  })).sort((left, right) => right.probability - left.probability).slice(0, 5)
}

async function runSqueezeNet(data: ArrayBuffer): Promise<Float32Array> {
  const loaded = sessions.get('squeezenet')
  if (!loaded) throw new Error('SqueezeNet 模型尚未加载')
  if (data.byteLength !== 3 * 224 * 224 * Float32Array.BYTES_PER_ELEMENT) {
    throw new Error('分类 Tensor 数据长度不符合 [1, 3, 224, 224]')
  }

  const ort = await runtimeFor(loaded.backend)
  const tensor = new ort.Tensor('float32', new Float32Array(data), [1, 3, 224, 224])
  const output = await loaded.session.run({ [loaded.session.inputNames[0]]: tensor })
  const scores = output[loaded.session.outputNames[0]]?.data
  if (!(scores instanceof Float32Array) || scores.length !== 1000) {
    throw new Error('分类模型没有返回预期的 1000 个 Float32 分数')
  }
  return scores
}

async function classify(data: ArrayBuffer): Promise<void> {
  const startedAt = performance.now()
  const scores = await runSqueezeNet(data)
  respond({ type: 'classified', items: topFive(scores), inferenceMs: performance.now() - startedAt })
}

function maskCell(source: Float32Array, row: number, column: number): ArrayBuffer {
  const imageSide = 224
  const planeSize = imageSide * imageSide
  const cellsPerSide = 5
  const masked = new Float32Array(source)
  const startY = Math.floor((row * imageSide) / cellsPerSide)
  const endY = Math.floor(((row + 1) * imageSide) / cellsPerSide)
  const startX = Math.floor((column * imageSide) / cellsPerSide)
  const endX = Math.floor(((column + 1) * imageSide) / cellsPerSide)

  for (let channel = 0; channel < 3; channel += 1) {
    const channelOffset = channel * planeSize
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) masked[channelOffset + y * imageSide + x] = 0
    }
  }
  return masked.buffer
}

async function explain(data: ArrayBuffer, targetIndex: number): Promise<void> {
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= 1000) {
    throw new Error('待解释的类别索引无效')
  }
  const startedAt = performance.now()
  const source = new Float32Array(data)
  const baselineProbability = probabilitiesFor(await runSqueezeNet(source.buffer))[targetIndex]
  const cells: AttentionCell[] = []

  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const maskedProbability = probabilitiesFor(await runSqueezeNet(maskCell(source, row, column)))[targetIndex]
      const impact = Math.max(0, baselineProbability - maskedProbability) /
        Math.max(baselineProbability, Number.EPSILON)
      cells.push({ row, column, impact })
    }
  }

  respond({
    type: 'explained',
    cells,
    baselineProbability,
    explainMs: performance.now() - startedAt
  })
}

function intersectionOverUnion(left: DetectionCandidate, right: DetectionCandidate): number {
  const x1 = Math.max(left.x, right.x)
  const y1 = Math.max(left.y, right.y)
  const x2 = Math.min(left.x2, right.x2)
  const y2 = Math.min(left.y2, right.y2)
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  return intersection / (left.width * left.height + right.width * right.height - intersection)
}

function decodeDetections(context: DetectionContext, threshold: number): DetectionItem[] {
  const candidates: DetectionCandidate[] = []
  const levels = [
    { grid: 52, stride: 8 },
    { grid: 26, stride: 16 },
    { grid: 13, stride: 32 }
  ]
  let rowOffset = 0

  for (const level of levels) {
    const levelRows = level.grid * level.grid
    for (let localRow = 0; localRow < levelRows; localRow += 1) {
      const outputOffset = (rowOffset + localRow) * YOLO_OUTPUT_COLUMNS
      const objectness = context.output[outputOffset + 4]
      const gridX = localRow % level.grid
      const gridY = Math.floor(localRow / level.grid)
      const centerX = (context.output[outputOffset] + gridX) * level.stride / context.scale
      const centerY = (context.output[outputOffset + 1] + gridY) * level.stride / context.scale
      const width = Math.exp(context.output[outputOffset + 2]) * level.stride / context.scale
      const height = Math.exp(context.output[outputOffset + 3]) * level.stride / context.scale
      const x = Math.max(0, centerX - width / 2)
      const y = Math.max(0, centerY - height / 2)
      const x2 = Math.min(context.originalWidth, centerX + width / 2)
      const y2 = Math.min(context.originalHeight, centerY + height / 2)
      if (x2 <= x || y2 <= y) continue

      for (let classIndex = 0; classIndex < YOLO_CLASS_COUNT; classIndex += 1) {
        const score = objectness * context.output[outputOffset + 5 + classIndex]
        if (score < threshold) continue
        candidates.push({
          id: `${rowOffset + localRow}-${classIndex}`,
          classIndex,
          label: cocoChineseLabels[classIndex] ?? `类别 ${classIndex}`,
          score,
          x,
          y,
          x2,
          y2,
          width: x2 - x,
          height: y2 - y
        })
      }
    }
    rowOffset += levelRows
  }

  const selected: DetectionCandidate[] = []
  for (const candidate of candidates.sort((left, right) => right.score - left.score)) {
    const overlaps = selected.some((item) => item.classIndex === candidate.classIndex &&
      intersectionOverUnion(item, candidate) > NMS_THRESHOLD)
    if (!overlaps) selected.push(candidate)
  }

  return selected.map(({ x2: _x2, y2: _y2, ...item }) => item)
}

function postprocessDetections(threshold: number): { items: DetectionItem[]; postprocessMs: number } {
  if (!detectionContext) throw new Error('还没有可重新筛选的检测结果')
  if (!Number.isFinite(threshold) || threshold < 0.1 || threshold > 0.9) {
    throw new Error('置信度阈值应位于 0.1 到 0.9 之间')
  }
  const startedAt = performance.now()
  return { items: decodeDetections(detectionContext, threshold), postprocessMs: performance.now() - startedAt }
}

async function detect(request: Extract<WorkerRequest, { type: 'detect' }>): Promise<void> {
  const loaded = sessions.get('yolox')
  if (!loaded) throw new Error('YOLOX-Nano 模型尚未加载')
  if (request.data.byteLength !== 3 * YOLO_INPUT_SIDE * YOLO_INPUT_SIDE * Float32Array.BYTES_PER_ELEMENT) {
    throw new Error('检测 Tensor 数据长度不符合 [1, 3, 416, 416]')
  }
  if (request.originalWidth <= 0 || request.originalHeight <= 0 || request.scale <= 0) {
    throw new Error('原图尺寸或缩放比例无效')
  }

  const ort = await runtimeFor(loaded.backend)
  const tensor = new ort.Tensor('float32', new Float32Array(request.data), [1, 3, YOLO_INPUT_SIDE, YOLO_INPUT_SIDE])
  const startedAt = performance.now()
  const outputs = await loaded.session.run({ [loaded.session.inputNames[0]]: tensor })
  const output = outputs[loaded.session.outputNames[0]]?.data
  const inferenceMs = performance.now() - startedAt
  if (!(output instanceof Float32Array) || output.length !== YOLO_OUTPUT_ROWS * YOLO_OUTPUT_COLUMNS) {
    throw new Error('检测模型没有返回预期的 [1, 3549, 85] Float32 数据')
  }

  detectionContext = {
    output: new Float32Array(output),
    originalWidth: request.originalWidth,
    originalHeight: request.originalHeight,
    scale: request.scale
  }
  const result = postprocessDetections(request.threshold)
  respond({ type: 'detected', threshold: request.threshold, inferenceMs, ...result })
}

function filter(threshold: number): void {
  const result = postprocessDetections(threshold)
  respond({ type: 'filtered', threshold, ...result })
}

workerScope.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  const task = request.type === 'load'
    ? loadModel(request)
    : request.type === 'classify'
      ? classify(request.data)
      : request.type === 'explain'
        ? explain(request.data, request.targetIndex)
        : request.type === 'detect'
          ? detect(request)
          : Promise.resolve().then(() => filter(request.threshold))

  void task.catch((error: unknown) => {
    const code = error instanceof WebGpuUnavailableError
      ? 'webgpu_unavailable'
      : error instanceof ModelLoadError
        ? 'model_load_failed'
      : request.type === 'load'
        ? 'model_load_failed'
        : request.type === 'explain'
          ? 'explanation_failed'
          : request.type === 'filter'
            ? 'filter_failed'
            : 'inference_failed'
    respond({ type: 'error', code, message: errorMessage(error) })
  })
})
