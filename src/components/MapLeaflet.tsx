'use client'
import { useEffect, useRef } from 'react'

type Activity = { time: string; type: string; title: string; note: string }
type Day = { id: number; date: string; day: number; title: string; place: string; hotel: string; notes: string; activities: Activity[] }

export const PLACE_COORDS: Record<string, [number, number]> = {
  'Paracas':         [-13.8303, -76.2503],
  'Paracas / Ica':   [-13.8303, -76.2503],
  'Arequipa':        [-16.4090, -71.5375],
  'Chivay':          [-15.6364, -71.5930],
  'Puno':            [-15.8402, -70.0219],
  'Sicuani':         [-14.2658, -71.2178],
  'Cusco':           [-13.5319, -71.9675],
  'Valle Sacra':     [-13.4167, -71.9833],
  'Aguas Calientes': [-13.1548, -72.5270],
  'Machu Picchu':    [-13.1631, -72.5450],
  'Lima':            [-12.0464, -77.0428],
  'Roma':            [ 41.9028,  12.4964],
  'Miami':           [ 25.7617, -80.1918],
}

interface Props {
  itinerary: Day[]
  onLocationClick: (place: string, days: Day[]) => void
}

export default function MapLeaflet({ itinerary, onLocationClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const cbRef        = useRef(onLocationClick)

  useEffect(() => { cbRef.current = onLocationClick })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const init = async () => {
      const L = (await import('leaflet')).default

      const proto = L.Icon.Default.prototype as any
      delete proto._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, { center: [-14.5, -73.0], zoom: 6 })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)

      // Group days by place
      const byPlace: Record<string, Day[]> = {}
      for (const day of [...itinerary].sort((a, b) => a.day - b.day)) {
        if (!byPlace[day.place]) byPlace[day.place] = []
        byPlace[day.place].push(day)
      }

      // Build route polyline (unique positions in order)
      const route: [number, number][] = []
      let lastKey = ''
      for (const day of [...itinerary].sort((a, b) => a.day - b.day)) {
        const c = PLACE_COORDS[day.place]
        if (!c) continue
        const k = `${c[0]},${c[1]}`
        if (k !== lastKey) { route.push(c); lastKey = k }
      }
      if (route.length > 1) {
        L.polyline(route, { color: '#E8B84B', weight: 3, opacity: 0.8, dashArray: '10,6' }).addTo(map)
      }

      // Add markers
      for (const [place, days] of Object.entries(byPlace)) {
        const coords = PLACE_COORDS[place]
        if (!coords) continue
        const label = days.map(d => `G${d.day}`).join('·')
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:#1A1208;color:#E8B84B;border:2.5px solid #E8B84B;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;font-family:sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.5);cursor:pointer">${label}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })
        const marker = L.marker(coords, { icon }).addTo(map)
        marker.bindTooltip(`<strong>${place}</strong>`, { permanent: false, direction: 'top', offset: [0, -18] })
        marker.on('click', () => cbRef.current(place, days))
      }

      mapRef.current = map
    }

    init()
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
