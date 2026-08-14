import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { searchNotesOutputSchema } from '../src/contract.js'

test('calls the real stdio server and reaps it on close', async () => {
  const projectRoot = new URL('../', import.meta.url).pathname
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', 'src/server.ts'],
    cwd: projectRoot,
    stderr: 'pipe',
  })
  const client = new Client(
    { name: 'stdio-test', version: '1.0.0' },
    { versionNegotiation: { mode: 'auto' } },
  )

  try {
    await client.connect(transport)
    assert.ok(transport.pid)
    const { tools } = await client.listTools()
    assert.deepEqual(tools.map((tool) => tool.name), ['search_notes'])

    const result = await client.callTool({
      name: 'search_notes',
      arguments: { query: 'release', limit: 2 },
    })
    assert.deepEqual(
      searchNotesOutputSchema.parse(result.structuredContent).items.map((item) => item.id),
      ['n-1', 'n-3'],
    )
  } finally {
    await client.close()
  }

  await delay(50)
  assert.equal(transport.pid, null)
})
