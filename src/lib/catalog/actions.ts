'use server'

import { db } from '@/db'
import { categories, products } from '@/db/schema'
import { eq, and, lt, gt, desc, asc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentAdmin } from '@/lib/auth/session'
import { upsertCategorySchema, upsertProductSchema } from './schema'
import { createAdminClient } from '@/lib/supabase/admin'

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

// ---------------------------------------------------------------------------
// Product actions (03-04)
// ---------------------------------------------------------------------------

export async function upsertProduct(formData: FormData) {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { error: { _form: ['Não autorizado.'] } }

  const idRaw = formData.get('id') as string | null
  const raw = {
    id: idRaw && idRaw.length > 0 ? idRaw : undefined,
    categoryId: formData.get('categoryId') as string,
    name: formData.get('name') as string,
    description: (formData.get('description') as string) ?? '',
    price: (formData.get('price') as string) ?? '',
    isFeatured: formData.get('isFeatured') === 'true' || formData.get('isFeatured') === 'on',
  }

  const parsed = upsertProductSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  const { id, categoryId, name, description, price, isFeatured } = parsed.data
  const priceStr = price.toFixed(2)

  try {
    let product: { id: string } | undefined

    if (id) {
      const [updated] = await db
        .update(products)
        .set({ categoryId, name, description: description || null, price: priceStr, isFeatured })
        .where(and(eq(products.id, id), eq(products.restaurantId, admin.restaurantId)))
        .returning()
      product = updated
    } else {
      const [maxRow] = await db
        .select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
        .from(products)
        .where(and(eq(products.restaurantId, admin.restaurantId), eq(products.categoryId, categoryId)))
      const nextSortOrder = (maxRow?.max ?? -1) + 1
      const [inserted] = await db
        .insert(products)
        .values({ restaurantId: admin.restaurantId, categoryId, name, description: description || null, price: priceStr, isFeatured, sortOrder: nextSortOrder })
        .returning()
      product = inserted
    }

    if (!product) return { error: { _form: ['Produto não encontrado.'] } }

    // Photo upload (guard size > 0 — avoid empty file entries from browser)
    const file = formData.get('photo') as File | null
    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) return { error: { photo: ['Foto deve ter menos de 5 MB.'] } }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        return { error: { photo: ['Formato inválido. Use JPG, PNG ou WebP.'] } }
      }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${admin.restaurantId}/${product.id}/photo.${ext}`
      const supabaseAdmin = createAdminClient()
      const { error: uploadError } = await supabaseAdmin.storage
        .from('product-images')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) return { error: { photo: ['Erro ao fazer upload da foto.'] } }
      const { data: { publicUrl } } = supabaseAdmin.storage.from('product-images').getPublicUrl(path)
      await db.update(products).set({ imageUrl: publicUrl }).where(eq(products.id, product.id))
    }

    revalidateCardapio()
    return { success: true, productId: product.id }
  } catch {
    return { error: { _form: ['Não foi possível salvar. Tente novamente.'] } }
  }
}

export async function deleteProduct(id: string) {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { error: { _form: ['Não autorizado.'] } }

  try {
    await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.restaurantId, admin.restaurantId)))

    revalidateCardapio()
    return { success: true }
  } catch {
    return { error: { _form: ['Não foi possível remover. Tente novamente.'] } }
  }
}

export async function moveProductUp(productId: string) {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { error: { _form: ['Não autorizado.'] } }

  try {
    const [current] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.restaurantId, admin.restaurantId)))

    if (!current) return { error: { _form: ['Produto não encontrado.'] } }

    const [neighbor] = await db
      .select()
      .from(products)
      .where(and(
        eq(products.restaurantId, admin.restaurantId),
        eq(products.categoryId, current.categoryId),
        lt(products.sortOrder, current.sortOrder),
      ))
      .orderBy(desc(products.sortOrder))
      .limit(1)

    if (!neighbor) return { success: true } // already at top of category

    await db.transaction(async (tx) => {
      await tx.update(products).set({ sortOrder: neighbor.sortOrder }).where(eq(products.id, current.id))
      await tx.update(products).set({ sortOrder: current.sortOrder }).where(eq(products.id, neighbor.id))
    })

    revalidateCardapio()
    return { success: true }
  } catch {
    return { error: { _form: ['Não foi possível reordenar. Tente novamente.'] } }
  }
}

export async function moveProductDown(productId: string) {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { error: { _form: ['Não autorizado.'] } }

  try {
    const [current] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.restaurantId, admin.restaurantId)))

    if (!current) return { error: { _form: ['Produto não encontrado.'] } }

    const [neighbor] = await db
      .select()
      .from(products)
      .where(and(
        eq(products.restaurantId, admin.restaurantId),
        eq(products.categoryId, current.categoryId),
        gt(products.sortOrder, current.sortOrder),
      ))
      .orderBy(asc(products.sortOrder))
      .limit(1)

    if (!neighbor) return { success: true } // already at bottom of category

    await db.transaction(async (tx) => {
      await tx.update(products).set({ sortOrder: neighbor.sortOrder }).where(eq(products.id, current.id))
      await tx.update(products).set({ sortOrder: current.sortOrder }).where(eq(products.id, neighbor.id))
    })

    revalidateCardapio()
    return { success: true }
  } catch {
    return { error: { _form: ['Não foi possível reordenar. Tente novamente.'] } }
  }
}
