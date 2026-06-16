import { z } from 'zod'

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const createRestaurantSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome deve ter ao menos 2 caracteres.')
    .max(80, 'O nome deve ter no máximo 80 caracteres.'),
  slug: z
    .string()
    .trim()
    .min(2, 'O link deve ter ao menos 2 caracteres.')
    .max(80)
    .regex(slugRegex, 'O link deve conter apenas letras minúsculas, números e hífens.'),
  adminEmail: z.string().trim().email('Informe um e-mail válido para o administrador.'),
})

export const updateRestaurantSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(2, 'O nome deve ter ao menos 2 caracteres.')
    .max(80, 'O nome deve ter no máximo 80 caracteres.'),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(slugRegex, 'O link deve conter apenas letras minúsculas, números e hífens.'),
})

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>
