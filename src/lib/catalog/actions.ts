'use server'

import { db } from '@/db'
import { categories } from '@/db/schema'
import { eq, and, lt, gt, desc, asc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentAdmin } from '@/lib/auth/session'
import { upsertCategorySchema } from './schema'

function revalidateCardapio() {
  try {
    revalidatePath('/painel/cardapio')
  } catch {}
}

export async function createCategory(input: { name: string }) {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { error: { _form: ['Não autorizado.'] } }

  const parsed = upsertCategorySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    const [maxRow] = await db
      .select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(categories)
      .where(eq(categories.restaurantId, admin.restaurantId))

    const nextSortOrder = (maxRow?.max ?? -1) + 1

    await db.insert(categories).values({
      restaurantId: admin.restaurantId,
      name: parsed.data.name,
      sortOrder: nextSortOrder,
    })

    revalidateCardapio()
    return { success: true }
  } catch {
    return { error: { _form: ['Não foi possível salvar. Tente novamente.'] } }
  }
}

export async function updateCategory(input: { id?: string; name: string }) {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { error: { _form: ['Não autorizado.'] } }

  const parsed = upsertCategorySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  if (!parsed.data.id) return { error: { _form: ['ID da categoria é obrigatório.'] } }

  const id = parsed.data.id

  try {
    await db
      .update(categories)
      .set({ name: parsed.data.name })
      .where(and(eq(categories.id, id), eq(categories.restaurantId, admin.restaurantId)))

    revalidateCardapio()
    return { success: true }
  } catch {
    return { error: { _form: ['Não foi possível salvar. Tente novamente.'] } }
  }
}

export async function deleteCategory(id: string) {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { error: { _form: ['Não autorizado.'] } }

  try {
    await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.restaurantId, admin.restaurantId)))

    revalidateCardapio()
    return { success: true }
  } catch {
    return { error: { _form: ['Não foi possível remover. Tente novamente.'] } }
  }
}

export async function moveCategoryUp(categoryId: string) {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { error: { _form: ['Não autorizado.'] } }

  try {
    const [current] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.restaurantId, admin.restaurantId)))

    if (!current) return { error: { _form: ['Categoria não encontrada.'] } }

    const [neighbor] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.restaurantId, admin.restaurantId), lt(categories.sortOrder, current.sortOrder)))
      .orderBy(desc(categories.sortOrder))
      .limit(1)

    if (!neighbor) return { success: true } // already at top

    await db.transaction(async (tx) => {
      await tx.update(categories).set({ sortOrder: neighbor.sortOrder }).where(eq(categories.id, current.id))
      await tx.update(categories).set({ sortOrder: current.sortOrder }).where(eq(categories.id, neighbor.id))
    })

    revalidateCardapio()
    return { success: true }
  } catch {
    return { error: { _form: ['Não foi possível reordenar. Tente novamente.'] } }
  }
}

export async function moveCategoryDown(categoryId: string) {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { error: { _form: ['Não autorizado.'] } }

  try {
    const [current] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.restaurantId, admin.restaurantId)))

    if (!current) return { error: { _form: ['Categoria não encontrada.'] } }

    const [neighbor] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.restaurantId, admin.restaurantId), gt(categories.sortOrder, current.sortOrder)))
      .orderBy(asc(categories.sortOrder))
      .limit(1)

    if (!neighbor) return { success: true } // already at bottom

    await db.transaction(async (tx) => {
      await tx.update(categories).set({ sortOrder: neighbor.sortOrder }).where(eq(categories.id, current.id))
      await tx.update(categories).set({ sortOrder: current.sortOrder }).where(eq(categories.id, neighbor.id))
    })

    revalidateCardapio()
    return { success: true }
  } catch {
    return { error: { _form: ['Não foi possível reordenar. Tente novamente.'] } }
  }
}

// Product actions appended in Plan 04.
