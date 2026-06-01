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

      // ── Brand palette (matches bottom nav)
      const DARK = '#0C0907'        // surfaceDark
      const GOLD = '#F0C654'        // goldBright
      const ROUTE = '#B23A0F'       // primary terracotta

      // ── Build route (unique positions in order)
      const route: [number, number][] = []
      let lastKey = ''
      for (const day of sorted) {
        const c = PLACE_COORDS[day.place]
        if (!c) continue
        const k = `${c[0].toFixed(4)},${c[1].toFixed(4)}`
        if (k !== lastKey) { route.push(c); lastKey = k }
      }

      // ── ROUTE: solid double line for depth + visible flow
      if (route.length > 1) {
        L.polyline(route, { color: '#FFFFFF', weight: 7, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(map)
        L.polyline(route, { color: ROUTE,     weight: 3.5, opacity: 1,   lineCap: 'round', lineJoin: 'round' }).addTo(map)

        // ── Direction arrows at each segment midpoint
        for (let i = 0; i < route.length - 1; i++) {
          const [lat1, lon1] = route[i]
          const [lat2, lon2] = route[i + 1]
          if (Math.abs(lat1 - lat2) < 0.001 && Math.abs(lon1 - lon2) < 0.001) continue
          const midLat = (lat1 + lat2) / 2
          const midLon = (lon1 + lon2) / 2
          const angleDeg = Math.atan2(-(lat2 - lat1), lon2 - lon1) * 180 / Math.PI
          const arrow = L.divIcon({
            className: '',
            html: `<div style="width:20px;height:20px;background:#FFFFFF;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(178,58,15,.35);transform:rotate(${angleDeg}deg)">
                     <svg width="10" height="10" viewBox="0 0 10 10" style="display:block">
                       <path d="M2 5 L8 5 M8 5 L5 2 M8 5 L5 8" stroke="${ROUTE}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                     </svg>
                   </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          })
          L.marker([midLat, midLon], { icon: arrow, interactive: false, keyboard: false }).addTo(map)
        }
      }

      // ── PINS: classic Maps teardrop, one per DAY (offset stacks)
      const OFFSET_R = 0.006 // ~660 m, keeps stacked days close but distinct

      for (const { coords, days, places } of Object.values(byCoords)) {
        const placeLabel = [...places].join(' / ')
        days.forEach((day, idx) => {
          let lat = coords[0]
          let lon = coords[1]
          if (idx > 0 && days.length > 1) {
            // distribute offset days around a circle, first stays at center
            const angle = ((idx - 1) / (days.length - 1)) * 2 * Math.PI - Math.PI / 2
            lat += OFFSET_R * Math.cos(angle)
            lon += OFFSET_R * Math.sin(angle) / Math.cos(coords[0] * Math.PI / 180)
          }

          const icon = L.divIcon({
            className: '',
            html: `<svg width="26" height="34" viewBox="0 0 26 34" style="filter:drop-shadow(0 3px 4px rgba(12,9,7,.4));overflow:visible">
                     <path d="M13 1.2 C6.4 1.2 1.2 6.4 1.2 13 C1.2 21.5 13 32.8 13 32.8 C13 32.8 24.8 21.5 24.8 13 C24.8 6.4 19.6 1.2 13 1.2 Z"
                           fill="${DARK}" stroke="${GOLD}" stroke-width="1.7"/>
                     <text x="13" y="17.5" text-anchor="middle"
                           font-family="'DM Sans',system-ui,sans-serif"
                           font-size="11" font-weight="700"
                           fill="${GOLD}" letter-spacing="-0.02em">${day.day}</text>
                   </svg>`,
            iconSize: [26, 34],
            iconAnchor: [13, 32],
          })

          const marker = L.marker([lat, lon], { icon, riseOnHover: true }).addTo(map)
          marker.bindTooltip(`<strong>G${day.day}</strong> · ${placeLabel}`, { permanent: false, direction: 'top', offset: [0, -32] })
          marker.on('click', () => cbRef.current(day.place, [day]))
        })
      }

      mapRef.current = map
    }

    init()
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
