export type VisionMode = 'classification' | 'detection'
export type ModelKind = 'squeezenet' | 'yolox'
export type BackendMode = 'auto' | 'webgpu' | 'wasm'
export type ActiveBackend = Exclude<BackendMode, 'auto'>

export interface ClassificationItem {
  index: number
  label: string
  originalLabel: string
  probability: number
}

export interface AttentionCell {
  row: number
  column: number
  impact: number
}

export interface DetectionItem {
  id: string
  classIndex: number
  label: string
  score: number
  x: number
  y: number
  width: number
  height: number
}

export type WorkerRequest =
  | {
      type: 'load'
      model: ModelKind
      backend: BackendMode
      modelUrl: string
      labelsUrl: string
      chineseLabelsUrl?: string
    }
  | { type: 'classify'; data: ArrayBuffer }
  | { type: 'explain'; data: ArrayBuffer; targetIndex: number }
  | {
      type: 'detect'
      data: ArrayBuffer
      originalWidth: number
      originalHeight: number
      scale: number
      threshold: number
    }
  | { type: 'filter'; threshold: number }

export type WorkerResponse =
  | { type: 'loaded'; model: ModelKind; backend: ActiveBackend; loadMs: number; reused: boolean }
  | { type: 'classified'; items: ClassificationItem[]; inferenceMs: number }
  | { type: 'explained'; cells: AttentionCell[]; baselineProbability: number; explainMs: number }
  | { type: 'detected'; items: DetectionItem[]; threshold: number; inferenceMs: number; postprocessMs: number }
  | { type: 'filtered'; items: DetectionItem[]; threshold: number; postprocessMs: number }
  | { type: 'error'; code: string; message: string }
