'use client'
import dynamic from 'next/dynamic'

export const UnitLocationMap = dynamic(
  () => import('./unit-location-map').then((m) => m.UnitLocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
        Carregando mapa…
      </div>
    ),
  }
)
