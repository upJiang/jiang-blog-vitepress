const fs = require('fs')
const path = require('path')

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

// 获取命令行参数
const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('请提供要处理的 Markdown 文件路径')
  process.exit(1)
}

// 处理文件
formatMarkdownLists(args[0])
