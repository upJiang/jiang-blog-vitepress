import fs from 'node:fs'
import path from 'node:path'

/**
 * 格式化 Markdown 列表，在每个列表项之间添加空行
 * @param {string} filePath - 要处理的文件路径
 */
function formatMarkdownLists(filePath) {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`文件不存在: ${filePath}`)
      return false
    }

    // 检查是否是 Markdown 文件
    if (!filePath.toLowerCase().endsWith('.md')) {
      console.log(`不是 Markdown 文件，跳过: ${filePath}`)
      return false
    }

    console.log(`处理文件: ${filePath}`)

    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf-8')

    // 使用正则表达式处理列表项
    // 将所有列表项之间添加空行
    let formattedContent = content.replace(
      /^([ \t]*[-*+][ \t]+.+)(?=\n[ \t]*[-*+][ \t]+)/gm,
      '$1\n'
    )

    // 如果内容有变化，则写入文件
    if (content !== formattedContent) {
      fs.writeFileSync(filePath, formattedContent, 'utf-8')
      console.log(`✓ 已更新文件: ${filePath}`)
      return true
    } else {
      console.log(`✓ 文件无需更新: ${filePath}`)
      return false
    }
  } catch (error) {
    console.error(`处理文件时出错: ${filePath}`, error)
    return false
  }
}

/**
 * 处理目录下的所有 Markdown 文件
 * @param {string} pattern - glob 模式，用于查找 Markdown 文件
 */
function collectMarkdownFiles(directory) {
  const files = []

  if (!fs.existsSync(directory)) {
    return files
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) {
      continue
    }

    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(entryPath))
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(entryPath)
    }
  }

  return files
}

/**
 * 查找 Markdown 文件。默认 docs 目录由 Node 20 兼容的递归遍历处理。
 * @param {string} pattern - glob 模式或单个文件路径
 */
function findMarkdownFiles(pattern) {
  const recursiveMatch = pattern.match(/^(.*)\/\*\*\/\*\.md$/)
  if (recursiveMatch) {
    return collectMarkdownFiles(recursiveMatch[1])
  }

  return fs.existsSync(pattern) && fs.statSync(pattern).isFile() ? [pattern] : []
}

function processAllMarkdownFiles(pattern = 'docs/**/*.md') {
  try {
    // 查找所有匹配的 Markdown 文件
    const files = findMarkdownFiles(pattern)

    if (files.length === 0) {
      console.log(`没有找到匹配的 Markdown 文件: ${pattern}`)
      return
    }

    console.log(`找到 ${files.length} 个 Markdown 文件`)

    // 统计处理结果
    let updated = 0
    let skipped = 0
    let failed = 0

    // 处理每个文件
    for (const file of files) {
      const result = formatMarkdownLists(file)
      if (result === true) {
        updated++
      } else if (result === false) {
        skipped++
      } else {
        failed++
      }
    }

    // 输出处理结果
    console.log('\n===== 处理完成 =====')
    console.log(`共处理: ${files.length} 个文件`)
    console.log(`已更新: ${updated} 个文件`)
    console.log(`无需更新: ${skipped} 个文件`)
    if (failed > 0) {
      console.log(`处理失败: ${failed} 个文件`)
    }
  } catch (error) {
    console.error('处理文件时出错:', error)
  }
}

// 获取命令行参数
const args = process.argv.slice(2)

if (args.length === 0) {
  // 如果没有参数，处理所有 Markdown 文件
  processAllMarkdownFiles()
} else if (args[0] === '--all') {
  // 明确指定处理所有文件
  processAllMarkdownFiles()
} else {
  // 处理指定的文件
  formatMarkdownLists(args[0])
}
