'use server'

import { db } from '@/db'
import { productAvailability, products } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentAdmin } from '@/lib/auth/session'

export async function toggleAvailability({
  productId,
  unitId,
  available,
}: {
  productId: string
  unitId: string
  available: boolean
}): Promise<{ success: boolean; error?: string }> {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { success: false, error: 'Não autorizado.' }

  // Tenant ownership check (defense-in-depth on top of RLS)
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.restaurantId, admin.restaurantId)))

  if (!product) return { success: false, error: 'Produto não encontrado.' }

  try {
    if (available) {
      // Mark available = DELETE the exclusion row (no-op if absent)
      await db
        .delete(productAvailability)
        .where(
          and(
            eq(productAvailability.productId, productId),
            eq(productAvailability.unitId, unitId),
          ),
        )
    } else {
      // Mark unavailable = INSERT exclusion row, idempotent
      await db
        .insert(productAvailability)
        .values({ productId, unitId })
        .onConflictDoNothing()
    }
    revalidatePath('/painel/disponibilidade')
    return { success: true }
  } catch {
    return { success: false, error: 'Erro ao atualizar disponibilidade. Tente novamente.' }
  }
}
