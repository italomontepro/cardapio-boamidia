'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/painel', label: 'Visão Geral', exact: true },
  { href: '/painel/unidades', label: 'Unidades', exact: false },
  { href: '/painel/cardapio', label: 'Cardápio', exact: false },
  { href: '/painel/disponibilidade', label: 'Disponibilidade', exact: false },
]

export function SidebarNav() {
  const pathname = usePathname()
  return (
    <nav className="w-52 shrink-0 border-r bg-sidebar px-3 pt-6 pb-4">
      <ul className="flex flex-col gap-1">
        {navLinks.map(({ href, label, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                )}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
