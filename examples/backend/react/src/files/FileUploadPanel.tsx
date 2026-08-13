import { Alert, Button, Progress, Space, Typography, Upload } from 'antd'
import { useState } from 'react'
import type { UploadFile } from 'antd/es/upload/interface'
import { ApiProblem, request, sha256, uploadObject } from '../api/client'

type PresignedUpload = {
  fileId: string
  objectKey: string
  uploadUrl: string
  expiresAt: string
}

type UploadState = 'idle' | 'hashing' | 'signing' | 'uploading' | 'uploaded' | 'failed'

export function FileUploadPanel() {
  const [selected, setSelected] = useState<UploadFile[]>([])
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [fileId, setFileId] = useState('')
  const [error, setError] = useState('')

  const upload = async () => {
    const file = selected[0]?.originFileObj
    if (!file) return
    setError('')
    setFileId('')
    setProgress(0)
    try {
      setState('hashing')
      const digest = await sha256(file)
      setState('signing')
      const intent = await request<PresignedUpload>('/files/presign', {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
          sha256: digest,
        }),
      })
      setFileId(intent.fileId)
      setState('uploading')
      await uploadObject(intent.uploadUrl, file, setProgress)
      setState('uploaded')
    } catch (reason) {
      setState('failed')
      if (reason instanceof ApiProblem && reason.code === 'object_storage_unavailable') {
        setError('对象存储不可用，未生成上传地址。请检查 MinIO 和 bucket 初始化服务。')
      } else {
        setError('上传失败。文件记录与对象状态可能不同，需要按 fileId 核对后再重试。')
      }
    }
  }

  const statusText: Record<UploadState, string> = {
    idle: '选择一个不超过 50 MiB 的文件',
    hashing: '正在计算 SHA-256',
    signing: '正在申请 15 分钟有效的上传地址',
    uploading: `正在上传 ${progress}%`,
    uploaded: '对象上传完成，后续扫描 Worker 会继续推进文件状态',
    failed: '本次上传未完成',
  }

  return (
    <section className="tool-panel" aria-labelledby="file-upload-title">
      <Typography.Title level={3} id="file-upload-title">文件直传</Typography.Title>
      <Typography.Paragraph type="secondary">
        浏览器先提交文件元数据和摘要，拿到预签名地址后直接 PUT 到对象存储。
      </Typography.Paragraph>
      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError('')} />}
      <Space direction="vertical" size="middle" className="full-width">
        <Upload
          accept="*/*"
          beforeUpload={() => false}
          fileList={selected}
          maxCount={1}
          onChange={({ fileList }) => {
            setSelected(fileList.slice(-1))
            setState('idle')
            setProgress(0)
            setError('')
          }}
          onRemove={() => {
            setSelected([])
            setState('idle')
            setProgress(0)
          }}
        >
          <Button disabled={state === 'hashing' || state === 'signing' || state === 'uploading'}>选择文件</Button>
        </Upload>
        {(state === 'uploading' || state === 'uploaded') && (
          <Progress percent={progress} status={state === 'uploaded' ? 'success' : 'active'} aria-label="文件上传进度" />
        )}
        <div className="operation-row" aria-live="polite">
          <Typography.Text>{statusText[state]}</Typography.Text>
          <Button
            type="primary"
            disabled={!selected.length || state === 'hashing' || state === 'signing' || state === 'uploading'}
            loading={state === 'hashing' || state === 'signing' || state === 'uploading'}
            onClick={() => void upload()}
          >
            开始上传
          </Button>
        </div>
        {fileId && <Typography.Text copyable={{ text: fileId }}>fileId: {fileId}</Typography.Text>}
      </Space>
    </section>
  )
}
