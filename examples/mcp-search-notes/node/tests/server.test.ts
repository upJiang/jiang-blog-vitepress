import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport, McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod/v4'
import { createSearchNotesServer } from '../src/app.js'
import {
  searchNotesOutputSchema,
  type SearchNotesInput,
} from '../src/contract.js'
import type { NoteRepository } from '../src/repository.js'

class CountingRepository implements NoteRepository {
  calls = 0

  async search({ query }: SearchNotesInput) {
    this.calls += 1
    return query === 'missing'
      ? { items: [] }
      : { items: [{ id: 'n-1', title: 'Release checklist', excerpt: 'Confirm rollback.' }] }
  }
}

async function connectInMemory(server: McpServer) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'contract-test', version: '1.0.0' })
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return { client, close: () => Promise.all([client.close(), server.close()]) }
}

test('keeps the exposed MCP schemas aligned with the language-neutral contract', async () => {
  const contractUrl = new URL('../../contracts/search-notes.json', import.meta.url)
  const contract = JSON.parse(readFileSync(contractUrl, 'utf8')) as {
    inputSchema: Record<string, unknown>
    outputSchema: Record<string, unknown>
  }
  const commonCore = (schema: Record<string, unknown>) => {
    const {
      $schema: _dialect,
      additionalProperties: _extraPropertyPolicy,
      ...rest
    } = schema
    return rest
  }
  const connection = await connectInMemory(createSearchNotesServer(new CountingRepository()))
  try {
    const { tools } = await connection.client.listTools()
    const tool = tools.find((item) => item.name === 'search_notes')
    assert.ok(tool?.outputSchema)
    assert.deepEqual(commonCore(tool.inputSchema), commonCore(contract.inputSchema))
    assert.deepEqual(commonCore(tool.outputSchema), commonCore(contract.outputSchema))
  } finally {
    await connection.close()
  }
})

test('discovers and calls search_notes with the shared result shape', async () => {
  const repository = new CountingRepository()
  const connection = await connectInMemory(createSearchNotesServer(repository))
  try {
    const { tools } = await connection.client.listTools()
    assert.deepEqual(tools.map((tool) => tool.name), ['search_notes'])

    const hit = await connection.client.callTool({
      name: 'search_notes',
      arguments: { query: 'release', limit: 2 },
    })
    assert.equal(hit.isError, undefined)
    assert.equal(searchNotesOutputSchema.parse(hit.structuredContent).items[0]?.id, 'n-1')

    const empty = await connection.client.callTool({
      name: 'search_notes',
      arguments: { query: 'missing', limit: 5 },
    })
    assert.deepEqual(searchNotesOutputSchema.parse(empty.structuredContent), { items: [] })
  } finally {
    await connection.close()
  }
})

test('rejects invalid input before repository execution', async () => {
  const repository = new CountingRepository()
  const connection = await connectInMemory(createSearchNotesServer(repository))
  try {
    const invalid = await connection.client.callTool({
      name: 'search_notes',
      arguments: { query: 'release', limit: 21 },
    })
    assert.equal(invalid.isError, true)
    assert.equal(repository.calls, 0)
  } finally {
    await connection.close()
  }
})

test('separates unknown tools from invalid structured output', async () => {
  const server = createSearchNotesServer(new CountingRepository())
  server.registerTool(
    'broken_output',
    { inputSchema: z.object({}), outputSchema: z.object({ ok: z.boolean() }) },
    async () => ({
      content: [{ type: 'text', text: 'invalid' }],
      structuredContent: { ok: 'yes' } as unknown as { ok: boolean },
    }),
  )
  const connection = await connectInMemory(server)
  try {
    await connection.client.listTools()
    await assert.rejects(
      connection.client.callTool({ name: 'missing_tool', arguments: {} }),
      /not found|unknown/i,
    )
    const broken = await connection.client.callTool({ name: 'broken_output', arguments: {} })
    assert.equal(broken.isError, true)
    assert.match(JSON.stringify(broken.content), /output|validation|invalid/i)
  } finally {
    await connection.close()
  }
})
