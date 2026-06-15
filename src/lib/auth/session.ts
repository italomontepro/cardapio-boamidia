import { createClient } from '@/lib/supabase/server'

export type CurrentAdmin = {
  userId: string
  email: string | null
  role: 'super_admin' | 'restaurant_admin'
  restaurantId: string | null
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('role, restaurant_id')
    .eq('user_id', user.id)
    .single()

  if (!adminRow) return null

  return {
    userId: user.id,
    email: user.email ?? null,
    role: adminRow.role,
    restaurantId: adminRow.restaurant_id,
  }
}
