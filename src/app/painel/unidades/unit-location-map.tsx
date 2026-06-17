'use client'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Pitfall 1: fix default marker icon paths broken by bundlers (webpack AND Turbopack).
// Must run at module scope inside this client-only (ssr:false) file.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: (iconUrl as { src?: string }).src ?? (iconUrl as unknown as string),
  iconRetinaUrl: (iconRetinaUrl as { src?: string }).src ?? (iconRetinaUrl as unknown as string),
  shadowUrl: (shadowUrl as { src?: string }).src ?? (shadowUrl as unknown as string),
})

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng]) }, [lat, lng, map])
  return null
}

export function UnitLocationMap({
  lat, lng, onChange,
}: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  return (
    <MapContainer center={[lat, lng]} zoom={15} style={{ height: 280, width: '100%' }} className="rounded-md border z-0">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter lat={lat} lng={lng} />
      <Marker
        position={[lat, lng]}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const ll = (e.target as L.Marker).getLatLng()
            onChange(ll.lat, ll.lng)
          },
        }}
      />
    </MapContainer>
  )
}
