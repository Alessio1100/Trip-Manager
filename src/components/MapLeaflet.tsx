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

      // Group days by COORDINATES (merges places with same lat/lon)
      const sorted = [...itinerary].sort((a, b) => a.day - b.day)
      const byCoords: Record<string, { coords:[number,number]; days:Day[]; places:Set<string> }> = {}
      for (const day of sorted) {
        const c = PLACE_COORDS[day.place]
        if (!c) continue
        const k = `${c[0].toFixed(4)},${c[1].toFixed(4)}`
        if (!byCoords[k]) byCoords[k] = { coords: c, days: [], places: new Set() }
        byCoords[k].days.push(day)
        byCoords[k].places.add(day.place)
      }

      // Build route polyline (unique positions in order)
      const route: [number, number][] = []
      let lastKey = ''
      for (const day of sorted) {
        const c = PLACE_COORDS[day.place]
        if (!c) continue
        const k = `${c[0].toFixed(4)},${c[1].toFixed(4)}`
        if (k !== lastKey) { route.push(c); lastKey = k }
      }
      if (route.length > 1) {
        L.polyline(route, { color: '#E8B84B', weight: 3, opacity: 0.8, dashArray: '10,6' }).addTo(map)
      }

      // Add one marker per coordinate group
      for (const { coords, days, places } of Object.values(byCoords)) {
        const label   = days.map(d => `G${d.day}`).join('·')
        const tooltip = [...places].join(' / ')
        const w = Math.max(34, label.length * 7.5 + 18)
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:#171310;color:#E8B84B;border:2px solid #E8B84B;border-radius:18px;min-width:${w}px;height:30px;display:flex;align-items:center;justify-content:center;padding:0 8px;font-size:10px;font-weight:700;font-family:'DM Sans',sans-serif;box-shadow:0 4px 14px rgba(23,19,16,.45);cursor:pointer;white-space:nowrap;letter-spacing:-0.01em">${label}</div>`,
          iconSize: [w, 30],
          iconAnchor: [w / 2, 15],
        })
        const marker = L.marker(coords, { icon }).addTo(map)
        marker.bindTooltip(`<strong>${tooltip}</strong>`, { permanent: false, direction: 'top', offset: [0, -18] })
        marker.on('click', () => cbRef.current(days[0].place, days))
      }

      mapRef.current = map
    }

    init()
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
