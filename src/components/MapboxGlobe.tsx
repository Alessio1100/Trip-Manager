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

interface Props {
  itinerary: Day[]
  onLocationClick: (place: string, days: Day[]) => void
}

const DARK   = '#0C0907'
const GOLD   = '#F0C654'
const ROUTE  = '#B23A0F'
const OFFSET_R = 0.006

// Disegna un pin teardrop su canvas e restituisce ImageData (@2x per retina)
function makePinImageData(dayNum: number): ImageData {
  const W = 52, H = 68  // 26x34 @2x
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')!
  ctx.scale(2, 2)

  // Path SVG identico al MapLeaflet originale
  const path = new Path2D(
    'M13 1.2 C6.4 1.2 1.2 6.4 1.2 13 C1.2 21.5 13 32.8 13 32.8 C13 32.8 24.8 21.5 24.8 13 C24.8 6.4 19.6 1.2 13 1.2 Z'
  )
  ctx.fillStyle = DARK
  ctx.fill(path)
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 1.7
  ctx.stroke(path)

  ctx.fillStyle = GOLD
  ctx.font = `700 11px system-ui,sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(dayNum), 13, 13)

  return ctx.getImageData(0, 0, W, H)
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
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [-77.0428, -12.0464],
        zoom: 1.5,
        projection: 'globe' as any,
        antialias: true,
      })

      map.on('style.load', () => {
        // Atmosfera globo
        map.setFog({
          color: 'rgb(220,230,240)',
          'high-color': 'rgb(80,130,210)',
          'horizon-blend': 0.03,
          'space-color': 'rgb(8,8,20)',
          'star-intensity': 0.7,
        } as any)

        const sorted = [...itinerary].sort((a, b) => a.day - b.day)

        // ── Registra immagine pin per ogni giorno unico
        const uniqueDays = [...new Set(sorted.map(d => d.day))]
        for (const dayNum of uniqueDays) {
          const id = `pin-${dayNum}`
          if (!map.hasImage(id)) {
            map.addImage(id, makePinImageData(dayNum), { pixelRatio: 2 })
          }
        }

        // ── Rotta [lng, lat]
        const routeCoords: [number, number][] = []
        let lastKey = ''
        for (const day of sorted) {
          const c = PLACE_COORDS[day.place]
          if (!c) continue
          const k = `${c[0].toFixed(4)},${c[1].toFixed(4)}`
          if (k !== lastKey) { routeCoords.push([c[1], c[0]]); lastKey = k }
        }
        if (routeCoords.length > 1) {
          map.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routeCoords } },
          })
          map.addLayer({ id: 'route-halo', type: 'line', source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#FFFFFF', 'line-width': 7, 'line-opacity': 0.85 } })
          map.addLayer({ id: 'route-line', type: 'line', source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': ROUTE, 'line-width': 3.5 } })
        }

        // ── Features GeoJSON con offset per giorni sullo stesso posto
        const byCoords: Record<string, { lat: number; lng: number; days: Day[]; places: Set<string> }> = {}
        for (const day of sorted) {
          const c = PLACE_COORDS[day.place]
          if (!c) continue
          const k = `${c[0].toFixed(4)},${c[1].toFixed(4)}`
          if (!byCoords[k]) byCoords[k] = { lat: c[0], lng: c[1], days: [], places: new Set() }
          byCoords[k].days.push(day)
          byCoords[k].places.add(day.place)
        }

        const features: any[] = []
        for (const { lat, lng, days, places } of Object.values(byCoords)) {
          const placeLabel = [...places].join(' / ')
          days.forEach((day, idx) => {
            let pLat = lat, pLng = lng
            if (idx > 0 && days.length > 1) {
              const angle = ((idx - 1) / (days.length - 1)) * 2 * Math.PI - Math.PI / 2
              pLat += OFFSET_R * Math.cos(angle)
              pLng += OFFSET_R * Math.sin(angle) / Math.cos(lat * Math.PI / 180)
            }
            features.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [pLng, pLat] },
              properties: { dayId: day.id, day: day.day, place: day.place, label: placeLabel, image: `pin-${day.day}` },
            })
          })
        }

        // ── Sorgente con clustering
        map.addSource('pins', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
          cluster: true,
          clusterMaxZoom: 5,
          clusterRadius: 20,
        })

        // Layer cluster: cerchio scuro con bordo oro
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'pins',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': GOLD,
            'circle-radius': 18,
            'circle-stroke-width': 2,
            'circle-stroke-color': DARK,
          },
        })
        // Testo contatore cluster
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'pins',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['DM Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 13,
          },
          paint: { 'text-color': DARK },
        })

        // Layer pin singoli — collision detection automatica
        map.addLayer({
          id: 'pins-layer',
          type: 'symbol',
          source: 'pins',
          filter: ['!', ['has', 'point_count']],
          layout: {
            'icon-image': ['get', 'image'],
            'icon-size': 1.35,
            'icon-anchor': 'bottom',
            'icon-allow-overlap': false,
            'icon-ignore-placement': false,
            'icon-padding': 2,
          },
        })

        // Click cluster → zoom in per espandere
        map.on('click', 'clusters', (e: any) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
          const clusterId = features[0].properties!.cluster_id
          ;(map.getSource('pins') as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err) return
            map.easeTo({ center: (features[0].geometry as any).coordinates, zoom })
          })
        })

        // Click pin singolo → apre dettaglio giorno
        map.on('click', 'pins-layer', (e: any) => {
          if (!e.features?.[0]) return
          const { dayId, place } = e.features[0].properties
          const day = itinerary.find(d => d.id === dayId)
          if (day) cbRef.current(place, [day])
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
