import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/auth/session'
import { logout } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getCurrentAdmin()

  if (!admin || admin.role !== 'super_admin') {
    redirect('/admin/login')
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b bg-card px-6 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Boa Mídia</span>
          <span className="text-muted-foreground/40 text-sm">·</span>
          <span className="text-sm text-muted-foreground">Plataforma</span>
          <span className="text-muted-foreground/40 text-sm">·</span>
          <span className="text-sm text-muted-foreground">{admin.email}</span>
        </div>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Sair
          </Button>
        </form>
      </header>
      <main className="flex flex-1 flex-col p-6">{children}</main>
    </div>
  )
}
