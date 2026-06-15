'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    redirect('/admin/login?error=invalid_credentials')
  }

  // Role lookup MUST go through the Supabase SSR client (not Drizzle's runtime
  // pool) so the query runs under the authenticated user's RLS context --
  // the "admins read own row" policy from plan 01-03 permits this read.
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', data.user.id)
    .single()

  if (!adminRow) {
    await supabase.auth.signOut()
    redirect('/admin/login?error=not_an_admin')
  }

  redirect(adminRow.role === 'super_admin' ? '/admin' : '/painel')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
