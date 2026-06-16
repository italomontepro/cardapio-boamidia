import { z } from 'zod'

export const upsertCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(80, 'Nome deve ter no máximo 80 caracteres.'),
})
export type UpsertCategoryInput = z.infer<typeof upsertCategorySchema>

export const upsertProductSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(120),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  price: z
    .string()
    .trim()
    .min(1, 'Preço é obrigatório.')
    .transform((val) => {
      // Normalize "1.299,90" and "29,90" → parse as number
      const normalized = val.replace(/\./g, '').replace(',', '.')
      return parseFloat(normalized)
    })
    .refine((n) => !isNaN(n) && n > 0, 'Preço deve ser maior que zero.'),
  isFeatured: z.boolean().default(false),
})
export type UpsertProductInput = z.infer<typeof upsertProductSchema>
