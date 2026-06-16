import { z } from 'zod'
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js'

export const upsertUnitSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(120, 'Nome deve ter no máximo 120 caracteres.'),
  address: z.string().trim().max(255).optional().or(z.literal('')),
  hours: z.string().trim().max(255).optional().or(z.literal('')),
  whatsappNumber: z
    .string()
    .trim()
    .min(1, 'Número de WhatsApp é obrigatório.')
    .refine(
      (val) => isValidPhoneNumber(val, 'BR'),
      'Número de WhatsApp inválido. Use o formato (11) 99999-9999 ou +5511999999999.'
    )
    .transform((val) => parsePhoneNumber(val, 'BR').number),
})

export type UpsertUnitInput = z.infer<typeof upsertUnitSchema>
