'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { restaurants, adminUsers } from '@/db/schema'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createRestaurantSchema,
  updateRestaurantSchema,
  type CreateRestaurantInput,
  type UpdateRestaurantInput,
} from '@/lib/restaurants/schema'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTempPassword(): string {
  // Cryptographically secure. Mix classes to satisfy any Supabase password policy.
  return `${randomBytes(6).toString('hex')}Aa1!`
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  )
}

class ProvisioningError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message)
    this.name = 'ProvisioningError'
  }
}

// ---------------------------------------------------------------------------
// createRestaurant
// ---------------------------------------------------------------------------

/**
 * Atomically-ish provisions a new restaurant row + auth.users row + admin_users row.
 * The two Postgres writes are wrapped in db.transaction(); the Auth API call sits
 * inside the transaction callback between them. If the transaction throws AFTER
 * the auth user was created, we delete the orphaned auth.users row (compensation).
 *
 * The returned `tempPassword` is NEVER persisted anywhere — shown once in the UI.
 * (D-08)
 */
export async function createRestaurant(input: CreateRestaurantInput): Promise<
  | { success: true; restaurant: { id: string; name: string; slug: string }; tempPassword: string; adminEmail: string }
  | { error: Record<string, string[]> }
> {
  // 1. Validate input (zod)
  const parsed = createRestaurantSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }
  const { name, slug, adminEmail } = parsed.data

  // 2. Pre-check slug uniqueness (UX fast-path — D-05).
  //    The DB unique constraint below is the authoritative check.
  const existing = await db.query.restaurants.findFirst({
    where: eq(restaurants.slug, slug),
  })
  if (existing) {
    return {
      error: { slug: ['Este link já está em uso. Escolha outro slug para o restaurante.'] },
    }
  }

  const tempPassword = generateTempPassword()
  const supabaseAdmin = createAdminClient()
  let createdAuthUserId: string | null = null

  try {
    // 3 + 4 + 5: wrap both Postgres writes in a transaction; Auth API call sits inside.
    const result = await db.transaction(async (tx) => {
      // 3. Insert restaurants row
      const [restaurant] = await tx.insert(restaurants).values({ name, slug }).returning()

      // 4. Create auth.users row via service_role Admin API (D-08/D-09)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: tempPassword,
        email_confirm: true, // D-09: no email-confirmation step needed
      })
      if (authError || !authData.user) {
        throw new ProvisioningError('admin_create_failed', authError?.message)
      }
      createdAuthUserId = authData.user.id

      // 5. Insert admin_users row (Drizzle runtime client bypasses RLS — same as seed.ts)
      await tx.insert(adminUsers).values({
        userId: authData.user.id,
        role: 'restaurant_admin',
        restaurantId: restaurant.id,
      })

      return { restaurant, authUser: authData.user }
    })

    // 6. Success — return tempPassword ONCE (D-08). Never persist it.
    return {
      success: true,
      restaurant: {
        id: result.restaurant.id,
        name: result.restaurant.name,
        slug: result.restaurant.slug,
      },
      tempPassword,
      adminEmail,
    }
  } catch (err) {
    // Compensation: if auth user was created but the transaction threw afterwards,
    // Postgres auto-rolled back restaurants + admin_users — but auth.users did NOT.
    // Clean it up so no orphaned auth user remains (D-07 rollback).
    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId)
    }

    if (err instanceof ProvisioningError && err.code === 'admin_create_failed') {
      return {
        error: {
          adminEmail: [
            'Não foi possível criar o usuário administrador. Verifique o e-mail.',
          ],
        },
      }
    }

    if (isUniqueViolation(err)) {
      return {
        error: { slug: ['Este link já está em uso. Escolha outro slug para o restaurante.'] },
      }
    }

    return {
      error: {
        _form: ['Não foi possível salvar as alterações. Verifique os dados e tente novamente.'],
      },
    }
  }
}

// ---------------------------------------------------------------------------
// updateRestaurant
// ---------------------------------------------------------------------------

/**
 * Updates name and/or slug for an existing restaurant.
 * Slug collision → D-05 error. Revalidates /admin on success.
 */
export async function updateRestaurant(input: UpdateRestaurantInput): Promise<
  | { success: true }
  | { error: Record<string, string[]> }
> {
  const parsed = updateRestaurantSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }
  const { id, name, slug } = parsed.data

  try {
    await db.update(restaurants).set({ name, slug }).where(eq(restaurants.id, id))
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        error: { slug: ['Este link já está em uso. Escolha outro slug para o restaurante.'] },
      }
    }
    return {
      error: {
        _form: ['Não foi possível salvar as alterações. Verifique os dados e tente novamente.'],
      },
    }
  }

  revalidatePath('/admin')
  return { success: true }
}

// ---------------------------------------------------------------------------
// toggleRestaurantActive
// ---------------------------------------------------------------------------

/**
 * Flips restaurants.is_active to the given value.
 * "Ativar" is a direct action; "Desativar" is guarded by AlertDialog in the UI (D-12).
 */
export async function toggleRestaurantActive(
  id: string,
  isActive: boolean,
): Promise<{ success: true }> {
  await db.update(restaurants).set({ isActive }).where(eq(restaurants.id, id))
  revalidatePath('/admin')
  return { success: true }
}
