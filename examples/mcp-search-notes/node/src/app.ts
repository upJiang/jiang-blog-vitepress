import { McpServer } from '@modelcontextprotocol/server'
import {
  searchNotesInputSchema,
  searchNotesOutputSchema,
} from './contract.js'
import type { NoteRepository } from './repository.js'

export function createSearchNotesServer(repository: NoteRepository): McpServer {
  const server = new McpServer({ name: 'search-notes-node', version: '1.0.0' })

  server.registerTool(
    'search_notes',
    {
      description: 'Search notes visible to the authenticated caller.',
      inputSchema: searchNotesInputSchema,
      outputSchema: searchNotesOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      // SDK 完成 Schema 校验后才会进入 Repository；可信 Scope 不属于模型参数。
      const output = await repository.search(input)
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      }
    },
  )

  return server
}
