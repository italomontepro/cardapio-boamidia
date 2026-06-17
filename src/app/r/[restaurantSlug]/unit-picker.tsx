'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { haversineDistanceKm } from '@/lib/menu/format'

type UnitPickerUnit = {
  id: string
  name: string
  slug: string
  address: string | null
  hours: string | null
  lat: number | null
  lng: number | null
}

export default function UnitPicker({
  restaurantSlug,
  restaurantName,
  units,
}: {
  restaurantSlug: string
  restaurantName: string
  units: UnitPickerUnit[]
}) {
  const [sortedUnits, setSortedUnits] = useState<UnitPickerUnit[]>(units)

  useEffect(() => {
    if (!navigator.geolocation) return // silent fallback

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        const withDist = [...units].sort((a, b) => {
          const da =
            a.lat != null && a.lng != null
              ? haversineDistanceKm(me, { lat: a.lat, lng: a.lng })
              : Infinity
          const db =
            b.lat != null && b.lng != null
              ? haversineDistanceKm(me, { lat: b.lat, lng: b.lng })
              : Infinity
          return da - db
        })
        setSortedUnits(withDist)
      },
      () => {
        // PERMISSION_DENIED(1)/POSITION_UNAVAILABLE(2)/TIMEOUT(3): keep unsorted, no error UI
      },
      { timeout: 8000, maximumAge: 60_000 },
    )
    // units is stable per render of this Server Component subtree; intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSelect(unitSlug: string) {
    localStorage.setItem(`boamidia:lastUnit:${restaurantSlug}`, unitSlug)
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4 sm:p-8">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold">{restaurantName}</h1>
        <p className="text-muted-foreground text-sm">Escolha a unidade</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sortedUnits.map((unit) => (
          <Link
            key={unit.id}
            href={`/r/${restaurantSlug}/${unit.slug}`}
            onClick={() => handleSelect(unit.slug)}
            className="block"
          >
            <Card className="h-full transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle>{unit.name}</CardTitle>
                {unit.address && <CardDescription>{unit.address}</CardDescription>}
              </CardHeader>
              {unit.hours && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">Horário: {unit.hours}</p>
                </CardContent>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}
