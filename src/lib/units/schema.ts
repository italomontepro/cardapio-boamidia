import { z } from 'zod'
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js/min'

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
  lat: z.number().min(-90, 'Latitude inválida.').max(90, 'Latitude inválida.').optional().nullable(),
  lng: z.number().min(-180, 'Longitude inválida.').max(180, 'Longitude inválida.').optional().nullable(),
})

export type UpsertUnitInput = z.infer<typeof upsertUnitSchema>
