'use client'
import { useEffect, useRef } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'

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

// Segmenti aerei — great circle automatico sul globo
const AIR_SEGMENTS = new Set([
  'Roma→Miami', 'Miami→Roma',
  'Miami→Lima', 'Lima→Miami',
  'Cusco→Lima',
])

interface Props {
  itinerary: Day[]
  onLocationClick: (place: string, days: Day[]) => void
}

// Palette
const ROUTE_LAND = '#C2622A'   // terracotta caldo
const ROUTE_AIR  = '#1C1410'   // nero espresso
const PIN_RING   = '#C2622A'
const PIN_NUM    = '#7C2D12'   // marrone scuro
const CLUSTER_BG = '#C2622A'
const OFFSET_R   = 0.006

// Pin teardrop: sfondo bianco, bordo terracotta, numero scuro — Path2D garantisce fill completo
function makePinImageData(dayNum: number): ImageData {
  const W = 52, H = 68   // 26x34 @2x
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')!
  ctx.scale(2, 2)

  const path = new Path2D(
    'M13 1.2 C6.4 1.2 1.2 6.4 1.2 13 C1.2 21.5 13 32.8 13 32.8 C13 32.8 24.8 21.5 24.8 13 C24.8 6.4 19.6 1.2 13 1.2 Z'
  )

  // Ombra
  ctx.shadowColor = 'rgba(0,0,0,0.30)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 3

  // Fill bianco
  ctx.fillStyle = '#FFFFFF'
  ctx.fill(path)

  ctx.shadowColor = 'transparent'

  // Bordo terracotta
  ctx.strokeStyle = PIN_RING
  ctx.lineWidth = 2
  ctx.stroke(path)

  // Numero
  ctx.fillStyle = PIN_NUM
  ctx.font = `700 11px system-ui,sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(dayNum), 13, 13)

  return ctx.getImageData(0, 0, W, H)
}

// Directions API — fallback linea retta se non disponibile
async function fetchRoadCoords(
  fromLng: number, fromLat: number,
  toLng: number, toLat: number,
  token: string
): Promise<[number, number][]> {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      `?geometries=geojson&overview=full&access_token=${token}`
    const res = await fetch(url)
    const json = await res.json()
    if (json.routes?.length > 0) return json.routes[0].geometry.coordinates
  } catch {}
  return [[fromLng, fromLat], [toLng, toLat]]
}

export default function MapboxGlobe({ itinerary, onLocationClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const cbRef        = useRef(onLocationClick)

  useEffect(() => { cbRef.current = onLocationClick })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const init = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
      mapboxgl.accessToken = token

      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [-77.0428, -12.0464],
        zoom: 1.5,
        projection: 'globe' as any,
        antialias: true,
      })

      map.on('style.load', async () => {
        map.setFog({
          color: 'rgb(220,232,245)',
          'high-color': 'rgb(60,120,200)',
          'horizon-blend': 0.03,
          'space-color': 'rgb(8,8,22)',
          'star-intensity': 0.65,
        } as any)

        const sorted = [...itinerary].sort((a, b) => a.day - b.day)

        // ── Registra immagini pin
        const uniqueDays = [...new Set(sorted.map(d => d.day))]
        for (const dayNum of uniqueDays) {
          const id = `pin-${dayNum}`
          if (!map.hasImage(id)) {
            map.addImage(id, makePinImageData(dayNum), { pixelRatio: 2 })
          }
        }

        // ── Costruisce lista posti unici in ordine
        const routePlaces: { place: string; lat: number; lng: number }[] = []
        let lastKey = ''
        for (const day of sorted) {
          const c = PLACE_COORDS[day.place]
          if (!c) continue
          const k = `${c[0].toFixed(4)},${c[1].toFixed(4)}`
          if (k !== lastKey) {
            routePlaces.push({ place: day.place, lat: c[0], lng: c[1] })
            lastKey = k
          }
        }

        // ── Separa segmenti aerei e terrestri
        const airFeatures: any[]  = []
        const landSegments: { fromLng: number; fromLat: number; toLng: number; toLat: number }[] = []

        for (let i = 0; i < routePlaces.length - 1; i++) {
          const f = routePlaces[i], t = routePlaces[i + 1]
          const key = `${f.place}→${t.place}`
          if (AIR_SEGMENTS.has(key)) {
            airFeatures.push({
              type: 'Feature' as const, properties: {},
              geometry: { type: 'LineString' as const, coordinates: [[f.lng, f.lat], [t.lng, t.lat]] },
            })
          } else {
            landSegments.push({ fromLng: f.lng, fromLat: f.lat, toLng: t.lng, toLat: t.lat })
          }
        }

        // ── Fetch rotte stradali in parallelo
        const roadCoords = await Promise.all(
          landSegments.map(s => fetchRoadCoords(s.fromLng, s.fromLat, s.toLng, s.toLat, token))
        )
        const landFeatures = roadCoords.map(coords => ({
          type: 'Feature' as const, properties: {},
          geometry: { type: 'LineString' as const, coordinates: coords },
        }))

        // ── Layer rotte terrestri
        if (landFeatures.length > 0) {
          map.addSource('land-route', {
            type: 'geojson',
            data: { type: 'FeatureCollection' as const, features: landFeatures },
          })
          map.addLayer({ id: 'land-glow', type: 'line', source: 'land-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': ROUTE_LAND, 'line-width': 9, 'line-opacity': 0.18, 'line-blur': 5 } })
          map.addLayer({ id: 'land-line', type: 'line', source: 'land-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': ROUTE_LAND, 'line-width': 2.8, 'line-opacity': 0.95 } })
        }

        // ── Layer rotte aeree (great circle automatico sul globo)
        if (airFeatures.length > 0) {
          map.addSource('air-route', {
            type: 'geojson',
            data: { type: 'FeatureCollection' as const, features: airFeatures },
          })
          map.addLayer({ id: 'air-glow', type: 'line', source: 'air-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': ROUTE_AIR, 'line-width': 9, 'line-opacity': 0.15, 'line-blur': 5 } })
          map.addLayer({ id: 'air-line', type: 'line', source: 'air-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': ROUTE_AIR, 'line-width': 2, 'line-opacity': 0.9,
              'line-dasharray': [1.5, 2.5] } })
        }

        // ── GeoJSON pin con clustering
        const byCoords: Record<string, { lat: number; lng: number; days: Day[]; places: Set<string> }> = {}
        for (const day of sorted) {
          const c = PLACE_COORDS[day.place]
          if (!c) continue
          const k = `${c[0].toFixed(4)},${c[1].toFixed(4)}`
          if (!byCoords[k]) byCoords[k] = { lat: c[0], lng: c[1], days: [], places: new Set() }
          byCoords[k].days.push(day)
          byCoords[k].places.add(day.place)
        }

        const pinFeatures: any[] = []
        for (const { lat, lng, days, places } of Object.values(byCoords)) {
          const placeLabel = [...places].join(' / ')
          days.forEach((day, idx) => {
            let pLat = lat, pLng = lng
            if (idx > 0 && days.length > 1) {
              const angle = ((idx - 1) / (days.length - 1)) * 2 * Math.PI - Math.PI / 2
              pLat += OFFSET_R * Math.cos(angle)
              pLng += OFFSET_R * Math.sin(angle) / Math.cos(lat * Math.PI / 180)
            }
            pinFeatures.push({
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [pLng, pLat] },
              properties: { dayId: day.id, day: day.day, place: day.place, label: placeLabel, image: `pin-${day.day}` },
            })
          })
        }

        map.addSource('pins', {
          type: 'geojson',
          data: { type: 'FeatureCollection' as const, features: pinFeatures },
          cluster: true, clusterMaxZoom: 5, clusterRadius: 20,
        })

        // Cluster
        map.addLayer({ id: 'clusters', type: 'circle', source: 'pins',
          filter: ['has', 'point_count'],
          paint: { 'circle-color': CLUSTER_BG, 'circle-radius': 18, 'circle-opacity': 0.92,
            'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF' } })
        map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'pins',
          filter: ['has', 'point_count'],
          layout: { 'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['DM Sans Bold', 'Arial Unicode MS Bold'], 'text-size': 13 },
          paint: { 'text-color': '#FFFFFF' } })

        // Pin singoli — overlap abilitato, la separazione è gestita dall'offset
        map.addLayer({ id: 'pins-layer', type: 'symbol', source: 'pins',
          filter: ['!', ['has', 'point_count']],
          layout: { 'icon-image': ['get', 'image'], 'icon-size': 1.3,
            'icon-anchor': 'bottom', 'icon-allow-overlap': true,
            'icon-ignore-placement': true } })

        // Click cluster → zoom in
        map.on('click', 'clusters', (e: any) => {
          const feat = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
          ;(map.getSource('pins') as any).getClusterExpansionZoom(
            feat[0].properties!.cluster_id,
            (err: any, zoom: number) => {
              if (!err) map.easeTo({ center: (feat[0].geometry as any).coordinates, zoom })
            }
          )
        })

        // Click pin → tutti i giorni dello stesso posto
        map.on('click', 'pins-layer', (e: any) => {
          if (!e.features?.[0]) return
          const { place } = e.features[0].properties
          const clickedC = PLACE_COORDS[place]
          if (!clickedC) return
          // Raggruppa per coordinate (gestisce alias tipo "Paracas / Ica" = "Paracas")
          const days = itinerary
            .filter(d => {
              const c = PLACE_COORDS[d.place]
              return c && Math.abs(c[0] - clickedC[0]) < 0.01 && Math.abs(c[1] - clickedC[1]) < 0.01
            })
            .sort((a, b) => a.day - b.day)
          if (days.length > 0) cbRef.current(place, days)
        })

        map.on('mouseenter', 'clusters',   () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'clusters',   () => { map.getCanvas().style.cursor = '' })
        map.on('mouseenter', 'pins-layer', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'pins-layer', () => { map.getCanvas().style.cursor = '' })
      })

      mapRef.current = map
    }

    init()
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
