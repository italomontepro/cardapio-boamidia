import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/auth/session'
import { logout } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getCurrentAdmin()

  if (!admin || admin.role !== 'restaurant_admin') {
    redirect('/admin/login')
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-sm text-muted-foreground">{admin.email}</span>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Sair
          </Button>
        </form>
      </header>
      <main className="flex flex-1 flex-col p-6">{children}</main>
    </div>
  )
}
