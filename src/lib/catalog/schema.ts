import { z } from 'zod'

export const upsertCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(80, 'Nome deve ter no máximo 80 caracteres.'),
})
export type UpsertCategoryInput = z.infer<typeof upsertCategorySchema>

// Product schema appended in Plan 04.
