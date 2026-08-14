import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const modelDirectory = path.join(root, 'public/models/onnx')
const squeezeNetPath = path.join(modelDirectory, 'squeezenet1.0-12.onnx')
const yoloXPath = path.join(modelDirectory, 'yolox-nano-416.onnx')
const labelsPath = path.join(modelDirectory, 'synset.txt')
const chineseLabelsPath = path.join(modelDirectory, 'imagenet.zh-CN.txt')
const cocoLabelsPath = path.join(modelDirectory, 'coco.zh-CN.txt')
const noticePath = path.join(root, 'public/models/onnx/NOTICE.txt')
const imagePath = path.join(root, 'public/images/onnx/domestic-cat-2011-g02-960.jpg')
const expectedSqueezeNetBytes = 4_952_956
const expectedSqueezeNetHash = 'dec81a8684617770b3cf13fadc1d92565d1d453d23935fc6388b792d99c992bd'
const expectedYoloXBytes = 3_659_407
const expectedYoloXHash = 'c789161ed43c8269fcd4e67c67eeeb4e80c622da2eb296a20bc6007bd18a0b7d'
const expectedChineseLabelsHash = 'f7b6f4bb0ddec755dbea41577c7c5155a4fa2852706f2263c0d3015dc67a8181'
const expectedCocoLabelsHash = 'cb569f2cf19083e113efd42ee51403ef2328b94e66890e220f91aba62e0c6b86'
const expectedImageHash = 'e9f17a07d12b1336af053bae1eb5ef3bb3b68a9530b77f650033b1937ca6ffba'

function fail(message) {
  console.error(`ONNX 资源检查失败：${message}`)
  process.exit(1)
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

for (const file of [squeezeNetPath, yoloXPath, labelsPath, chineseLabelsPath, cocoLabelsPath, noticePath, imagePath]) {
  if (!fs.existsSync(file)) fail(`缺少 ${path.relative(root, file)}`)
}

if (fs.statSync(squeezeNetPath).size !== expectedSqueezeNetBytes) fail(`SqueezeNet 大小应为 ${expectedSqueezeNetBytes} bytes`)
if (hashFile(squeezeNetPath) !== expectedSqueezeNetHash) fail('SqueezeNet SHA-256 不匹配')
if (fs.statSync(yoloXPath).size !== expectedYoloXBytes) fail(`YOLOX-Nano 大小应为 ${expectedYoloXBytes} bytes`)
if (hashFile(yoloXPath) !== expectedYoloXHash) fail('YOLOX-Nano SHA-256 不匹配')
if (hashFile(chineseLabelsPath) !== expectedChineseLabelsHash) fail('ImageNet 中文标签 SHA-256 不匹配')
if (hashFile(cocoLabelsPath) !== expectedCocoLabelsHash) fail('COCO 中文标签 SHA-256 不匹配')
if (hashFile(imagePath) !== expectedImageHash) fail('样例图片 SHA-256 不匹配')

function readLabels(file) {
  const labels = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  if (labels.at(-1) === '') labels.pop()
  const normalized = labels.map((label) => label.trim())
  if (normalized.some((label) => !label)) fail(`${path.relative(root, file)} 存在空标签`)
  return normalized
}

const labels = readLabels(labelsPath)
const chineseLabels = readLabels(chineseLabelsPath)
const cocoLabels = readLabels(cocoLabelsPath)
if (labels.length !== 1000) fail(`ImageNet 原始标签应为 1000 行，实际为 ${labels.length}`)
if (chineseLabels.length !== 1000) fail(`ImageNet 中文标签应为 1000 行，实际为 ${chineseLabels.length}`)
if (cocoLabels.length !== 80) fail(`COCO 中文标签应为 80 行，实际为 ${cocoLabels.length}`)
if (chineseLabels[285] !== '埃及猫') fail(`ImageNet 中文标签索引 285 应为“埃及猫”，实际为“${chineseLabels[285]}”`)
if (chineseLabels[669] !== '蚊帐') fail(`ImageNet 中文标签索引 669 应为“蚊帐”，实际为“${chineseLabels[669]}”`)
if (cocoLabels[15] !== '猫') fail(`COCO 中文标签索引 15 应为“猫”，实际为“${cocoLabels[15]}”`)
if (cocoLabels[59] !== '床') fail(`COCO 中文标签索引 59 应为“床”，实际为“${cocoLabels[59]}”`)

const notice = fs.readFileSync(noticePath, 'utf8')
for (const text of [
  'onnxmodelzoo/squeezenet1.0-12',
  '0e6cddd4291d78516c22543bc5a347d5916154a0',
  expectedSqueezeNetHash,
  '0.1.1rc0',
  'e1052df71842031413f6030723c3607b839c80ce',
  expectedYoloXHash,
  'DWHNicholas/ImageNet_chinese_cls',
  '4c9d449bfd473628c3bba0dba39536bc4c97be77',
  expectedChineseLabelsHash,
  expectedCocoLabelsHash,
  'Apache-2.0',
  'George Chernilevsky',
  'Public domain',
  '04be0d16becf3d4fefe5ea70b4cdef7274a08fd1'
]) {
  if (!notice.includes(text)) fail(`NOTICE 缺少来源字段：${text}`)
}

if (fs.readFileSync(imagePath).subarray(0, 3).toString('hex') !== 'ffd8ff') fail('样例图片不是 JPEG')

console.log('ONNX 资源检查通过：2 份模型、3 份标签、样例图片和来源说明完整。')
