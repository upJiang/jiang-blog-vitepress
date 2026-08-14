import * as z from 'zod/v4'

export const noteResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  excerpt: z.string(),
})

export const searchNotesInputSchema = z.object({
  query: z.string().trim().min(1),
  limit: z.number().int().min(1).max(20).default(5),
})

export const searchNotesOutputSchema = z.object({
  items: z.array(noteResultSchema),
})

export type SearchNotesInput = z.infer<typeof searchNotesInputSchema>
export type SearchNotesOutput = z.infer<typeof searchNotesOutputSchema>
