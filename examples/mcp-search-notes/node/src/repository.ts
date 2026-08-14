import { readFileSync } from 'node:fs'
import type { SearchNotesInput, SearchNotesOutput } from './contract.js'

interface StoredNote {
  id: string
  title: string
  body: string
}

export interface NoteRepository {
  search(input: SearchNotesInput): Promise<SearchNotesOutput>
}

export class FixtureNoteRepository implements NoteRepository {
  private readonly notes: StoredNote[]

  constructor() {
    const fixtureUrl = new URL('../../fixtures/notes.json', import.meta.url)
    this.notes = JSON.parse(readFileSync(fixtureUrl, 'utf8')) as StoredNote[]
  }

  async search({ query, limit }: SearchNotesInput): Promise<SearchNotesOutput> {
    const term = query.toLowerCase()
    return {
      items: this.notes
        .filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(term))
        .slice(0, limit)
        .map((note) => ({ id: note.id, title: note.title, excerpt: note.body })),
    }
  }
}
