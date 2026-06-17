const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CardapioBoaMidia/1.0 (contato@suporte.folkscomp.com)' },
  })
  if (!res.ok) return null
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
  if (!Array.isArray(data) || data.length === 0) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name }
}
