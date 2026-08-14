import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { createSearchNotesServer } from './app.js'
import { FixtureNoteRepository } from './repository.js'

void serveStdio(() => createSearchNotesServer(new FixtureNoteRepository()), {
  onerror(error) {
    // stdout 是协议通道；诊断信息只能写 stderr。
    console.error(error)
  },
})
