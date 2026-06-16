'use server'

import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'
import { db } from '@/db'
import { units } from '@/db/schema'
import { getCurrentAdmin } from '@/lib/auth/session'
import { generateSlug } from '@/lib/restaurants/slug'
import { upsertUnitSchema } from './schema'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function generateUnitSlug(name: string, restaurantId: string): Promise<string> {
  const base = generateSlug(name) || 'unidade'
  const existing = await db
    .select({ slug: units.slug })
    .from(units)
    .where(and(eq(units.restaurantId, restaurantId), eq(units.slug, base)))
  if (existing.length === 0) return base
  return `${base}-${Date.now()}`
}

// ---------------------------------------------------------------------------
// createUnit
// ---------------------------------------------------------------------------

export async function createUnit(input: {
  name: string
  address?: string
  whatsappNumber: string
  hours?: string
}): Promise<{ success: true } | { error: Record<string, string[]> }> {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { error: { _form: ['Não autorizado.'] } }

  const parsed = upsertUnitSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const slug = await generateUnitSlug(parsed.data.name, admin.restaurantId)

  try {
    await db.insert(units).values({
      restaurantId: admin.restaurantId,
      name: parsed.data.name,
      slug,
      address: parsed.data.address || null,
      whatsappNumber: parsed.data.whatsappNumber,
      hours: parsed.data.hours || null,
    })
  } catch {
    return { error: { _form: ['Não foi possível salvar. Tente novamente.'] } }
  }

  try { revalidatePath('/painel/unidades') } catch { /* not in Next.js runtime */ }
  return { success: true }
}

// ---------------------------------------------------------------------------
// updateUnit
// ---------------------------------------------------------------------------

export async function updateUnit(input: {
  id?: string
  name: string
  address?: string
  whatsappNumber: string
  hours?: string
}): Promise<{ success: true } | { error: Record<string, string[]> }> {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { error: { _form: ['Não autorizado.'] } }

  const parsed = upsertUnitSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  if (!parsed.data.id) {
    return { error: { _form: ['ID ausente.'] } }
  }

  try {
    await db
      .update(units)
      .set({
        name: parsed.data.name,
        address: parsed.data.address || null,
        whatsappNumber: parsed.data.whatsappNumber,
        hours: parsed.data.hours || null,
      })
      .where(and(eq(units.id, parsed.data.id), eq(units.restaurantId, admin.restaurantId)))
  } catch {
    return { error: { _form: ['Não foi possível salvar. Tente novamente.'] } }
  }

  try { revalidatePath('/painel/unidades') } catch { /* not in Next.js runtime */ }
  return { success: true }
}

// ---------------------------------------------------------------------------
// deleteUnit
// ---------------------------------------------------------------------------

export async function deleteUnit(
  id: string
): Promise<{ success: true } | { error: Record<string, string[]> }> {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { error: { _form: ['Não autorizado.'] } }

  try {
    await db
      .delete(units)
      .where(and(eq(units.id, id), eq(units.restaurantId, admin.restaurantId)))
  } catch {
    return { error: { _form: ['Não foi possível remover. Tente novamente.'] } }
  }

  try { revalidatePath('/painel/unidades') } catch { /* not in Next.js runtime */ }
  return { success: true }
}
