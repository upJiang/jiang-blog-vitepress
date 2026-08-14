import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { searchNotesOutputSchema } from './contract.js'

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['--import', 'tsx', 'src/server.ts'],
  cwd: import.meta.dirname.replace(/\/src$/, ''),
  stderr: 'inherit',
})
const client = new Client(
  { name: 'search-notes-cli', version: '1.0.0' },
  { versionNegotiation: { mode: 'auto' } },
)

try {
  await client.connect(transport)
  const { tools } = await client.listTools()
  if (!tools.some((tool) => tool.name === 'search_notes')) {
    throw new Error('Server did not expose search_notes')
  }

  const result = await client.callTool({
    name: 'search_notes',
    arguments: { query: process.argv[2] ?? 'release', limit: 5 },
  })
  if (result.isError) throw new Error(JSON.stringify(result.content))
  console.log(searchNotesOutputSchema.parse(result.structuredContent))
} finally {
  // 关闭 Client 会关闭 transport，并回收它启动的 Server 子进程。
  await client.close()
}
