'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  Home, CheckSquare, Calendar, Wallet, StickyNote,
  Plane, Hotel, Bus, Car, Ticket, FileText, Heart, Utensils, MoreHorizontal,
  AlertCircle, Clipboard, Bed, Navigation, Star, Coffee,
  ChevronDown, Plus, Pencil, Trash2, RefreshCw, Check,
  MapPin, Clock, ChevronRight, Search, Map, FolderOpen,
  ExternalLink, File, X, Download, Link2, Sparkles, ArrowRight,
} from 'lucide-react'

/* ─── TYPES ─── */
type Item       = { id:number; done:boolean; section:string; giorno:string; cat:string; voce:string; quando:string; costo:number; note:string; cancGratuita:boolean; cancScadenza:string }
type Activity   = { time:string; type:string; title:string; note:string }
type Day        = { id:number; date:string; day:number; title:string; place:string; hotel:string; notes:string; activities:Activity[] }
type Note       = { id:number; title:string; color:string; text:string }
type Documento  = { id:number; name:string; url:string; type:'link'|'file'; cat:string; note:string; mime?:string; dayId?:number }
type WeatherDay = { date:string; maxTemp:number; minTemp:number; code:number; precip:number }
type AppData    = { items:Item[]; itinerary:Day[]; notes:Note[]; documenti:Documento[]; nextId:number }
type PageId     = 'dashboard'|'checklist'|'itinerario'|'budget'|'note'|'mappa'|'documenti'

/* ─── DESIGN TOKENS ─── */
const T = {
  /* surface */
  bg:           '#F6F3EC',     // warmer cream, deeper than before
  surface:      '#FFFFFF',
  surfaceAlt:   '#EFEAE0',
  surfaceDark:  '#0C0907',     // near-black espresso, more dramatic
  surfaceDarkSoft: '#1A1612',
  /* border (very subtle, often replaced by shadow) */
  border:       '#E5DFD0',
  borderSoft:   '#EFEAE0',
  borderStrong: '#D4CBB5',
  /* text */
  text:         '#100C08',     // deeper black for contrast
  textDim:      '#5A4F3F',
  textFaint:    '#928A78',
  /* brand — terracotta primary (replaces gold-first identity) */
  primary:      '#B23A0F',     // deep andean terracotta
  primaryBright:'#E2570C',
  primarySoft:  '#FCEEE3',
  /* gold — used sparingly for premium moments */
  gold:         '#B8862E',
  goldBright:   '#F0C654',
  goldSoft:     '#FAF1DD',
  /* semantic */
  success:      '#15803D',
  successSoft:  '#DCFCE7',
  warning:      '#A16207',
  warningSoft:  '#FEF3C7',
  danger:       '#991B1B',
  dangerSoft:   '#FEE2E2',
  info:         '#1E40AF',
  infoSoft:     '#DBEAFE',
  /* elevation */
  shadowSm:     '0 1px 2px rgba(16,12,8,.04), 0 1px 3px rgba(16,12,8,.05)',
  shadowMd:     '0 2px 4px rgba(16,12,8,.04), 0 8px 24px rgba(16,12,8,.06)',
  shadowLg:     '0 4px 12px rgba(16,12,8,.08), 0 16px 48px rgba(16,12,8,.12)',
  shadowHero:   '0 12px 40px rgba(178,58,15,.18), 0 4px 12px rgba(12,9,7,.18)',
  shadowNav:    '0 -2px 8px rgba(16,12,8,.03), 0 -8px 32px rgba(16,12,8,.06)',
  /* fonts */
  fontDisplay:  "'Playfair Display', serif",
  fontBody:     "'DM Sans', sans-serif",
}

/* ─── DATA CONSTANTS ─── */
const CAT_COLORS: Record<string,string> = {Voli:'#3B82F6',Hotel:'#EC4899',Bus:'#10B981',Trasporti:'#F59E0B',Tour:'#8B5CF6',Ingressi:'#F97316',Documenti:'#6B7280',Salute:'#14B8A6',Homestay:'#EAB308',Cibo:'#F97316',Varie:'#22C55E'}
const NOTE_COLORS = ['#15803D','#1E40AF','#A16207','#7E22CE','#BE185D','#B91C1C','#0E7490']
const SECTIONS    = ['PUNTI CRITICI','BUROCRAZIA','ALLOGGI','TRASPORTI','TOUR','QUOTIDIANO']
const CATS        = ['Voli','Hotel','Bus','Trasporti','Tour','Ingressi','Documenti','Salute','Homestay','Cibo','Varie']
const QUANDO_OPTS = ['SUBITO','Prima di partire','Online','In loco','In loco/Online','In loco/Tour','Online/Agenzia']
const ACT_TYPES   = ['👣 Visita','🍽 Pasto','🚌 Trasporto','🛏 Alloggio','🎫 Ingresso','🥾 Trek','📷 Foto','✈️ Volo','🚂 Treno','💤 Riposo']
const TRIP_START  = '2026-07-25'
const TRIP_END    = '2026-08-06'

const PLACE_COORDS: Record<string, [number, number]> = {
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
  'Miami':           [ 25.7617, -80.1918],
  'Roma':            [ 41.9028,  12.4964],
}

/* ─── WEATHER UTILS ─── */
function wEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code === 1) return '🌤'
  if (code === 2) return '⛅'
  if (code === 3) return '☁️'
  if (code === 45 || code === 48) return '🌫'
  if (code >= 51 && code <= 55)   return '🌦'
  if (code >= 61 && code <= 65)   return '🌧'
  if (code >= 71 && code <= 75)   return '❄️'
  if (code >= 80 && code <= 82)   return '🌦'
  if (code >= 95)                 return '⛈'
  return '🌡'
}
function wDesc(code: number): string {
  if (code === 0) return 'Sereno'
  if (code === 1) return 'Sereno'
  if (code === 2) return 'Poco nuvoloso'
  if (code === 3) return 'Coperto'
  if (code === 45 || code === 48) return 'Nebbia'
  if (code >= 51 && code <= 55)   return 'Pioggerella'
  if (code >= 61 && code <= 65)   return 'Pioggia'
  if (code >= 71 && code <= 75)   return 'Neve'
  if (code >= 80 && code <= 82)   return 'Rovesci'
  if (code >= 95)                 return 'Temporale'
  return 'Variabile'
}

/* ─── ICONS ─── */
const SectionIcon = ({sec,size=14}:{sec:string,size?:number}) => {
  const p = {size,strokeWidth:1.8}
  if (sec==='PUNTI CRITICI') return <AlertCircle {...p}/>
  if (sec==='BUROCRAZIA')    return <Clipboard   {...p}/>
  if (sec==='ALLOGGI')       return <Bed         {...p}/>
  if (sec==='TRASPORTI')     return <Navigation  {...p}/>
  if (sec==='TOUR')          return <Ticket      {...p}/>
  return <Coffee {...p}/>
}
const CatIcon = ({cat,size=12}:{cat:string,size?:number}) => {
  const p = {size,strokeWidth:1.8}
  if (cat==='Voli')      return <Plane    {...p}/>
  if (cat==='Hotel')     return <Hotel    {...p}/>
  if (cat==='Bus')       return <Bus      {...p}/>
  if (cat==='Trasporti') return <Car      {...p}/>
  if (cat==='Tour')      return <Star     {...p}/>
  if (cat==='Ingressi')  return <Ticket   {...p}/>
  if (cat==='Documenti') return <FileText {...p}/>
  if (cat==='Salute')    return <Heart    {...p}/>
  if (cat==='Homestay')  return <Home     {...p}/>
  if (cat==='Cibo')      return <Utensils {...p}/>
  return <MoreHorizontal {...p}/>
}

/* ─── FORMATTERS ─── */
function fmtDate(s:string){ if(!s) return '—'; const d=new Date(s+'T00:00:00'); return d.toLocaleDateString('it-IT',{day:'2-digit',month:'short'}) }
function fmtEur(n:number){ return '€ '+Number(n).toLocaleString('it-IT') }

/* ─── BADGES ─── */
const CAT_BADGE_COLORS: Record<string,{bg:string,color:string}> = {
  Voli:      {bg:'#EFF6FF',color:'#1E3A8A'},
  Hotel:     {bg:'#FDF2F8',color:'#9F1239'},
  Bus:       {bg:'#ECFDF5',color:'#065F46'},
  Trasporti: {bg:'#FEFCE8',color:'#854D0E'},
  Tour:      {bg:'#F5F3FF',color:'#5B21B6'},
  Ingressi:  {bg:'#FFF7ED',color:'#9A3412'},
  Documenti: {bg:'#F8FAFC',color:'#334155'},
  Salute:    {bg:'#F0FDFA',color:'#115E59'},
  Homestay:  {bg:'#FEFCE8',color:'#854D0E'},
  Cibo:      {bg:'#FFF7ED',color:'#9A3412'},
  Varie:     {bg:'#F0FDF4',color:'#166534'},
}
function CatBadge({cat,size='md'}:{cat:string,size?:'sm'|'md'}){
  const c = CAT_BADGE_COLORS[cat]||{bg:'#F5F5F4',color:'#44403C'}
  const isSm = size==='sm'
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: isSm ? '2px 7px' : '3px 9px',
      borderRadius: 999,
      fontSize: isSm ? 10.5 : 11.5,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      display:'inline-flex',alignItems:'center',gap:4,
      letterSpacing: '-0.005em',
    }}>
      <CatIcon cat={cat} size={isSm?10:11}/>{cat}
    </span>
  )
}
function QBadge({q}:{q:string}){
  const styles: Record<string,{bg:string,color:string}> = {
    'SUBITO':           {bg:T.dangerSoft, color:T.danger},
    'Prima di partire': {bg:T.warningSoft,color:T.warning},
  }
  const c = q.includes('Online') ? {bg:T.infoSoft,color:T.info} : styles[q] || {bg:'#F5F5F4',color:'#44403C'}
  return <span style={{background:c.bg,color:c.color,padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,letterSpacing:'-0.005em'}}>{q}</span>
}
function CancBadge({item}:{item:Item}){
  if(!item.cancGratuita) return null
  const base = {padding:'3px 9px',borderRadius:999,fontSize:11,fontWeight:600,letterSpacing:'-0.005em'} as const
  if(!item.cancScadenza) return <span style={{...base,background:T.successSoft,color:T.success}}>Canc. gratuita</span>
  const oggi=new Date(); oggi.setHours(0,0,0,0)
  const diff=Math.ceil((new Date(item.cancScadenza+'T00:00:00').getTime()-oggi.getTime())/86400000)
  if(diff<0)  return <span style={{...base,background:T.dangerSoft,color:T.danger}}>Scaduta {fmtDate(item.cancScadenza)}</span>
  if(diff<=7) return <span style={{...base,background:T.warningSoft,color:T.warning}}>Scade tra {diff}g</span>
  return <span style={{...base,background:T.successSoft,color:T.success}}>Canc. fino al {fmtDate(item.cancScadenza)}</span>
}

/* ─── MODAL ─── */
function Modal({title,children,onClose}:{title:string,children:React.ReactNode,onClose:()=>void}){
  return (
    <div
      style={{position:'fixed',inset:0,background:'rgba(20,16,12,.55)',zIndex:1300,display:'flex',alignItems:'flex-end',backdropFilter:'blur(4px)',WebkitBackdropFilter:'blur(4px)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}
    >
      <div style={{background:T.bg,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:600,margin:'0 auto',maxHeight:'92dvh',overflowY:'auto',paddingBottom:'calc(20px + env(safe-area-inset-bottom,0px))'}}>
        <div style={{width:40,height:4,background:T.borderStrong,borderRadius:99,margin:'12px auto 16px'}}/>
        <div style={{fontFamily:T.fontDisplay,fontSize:22,fontWeight:700,color:T.text,padding:'0 24px 16px',letterSpacing:'-0.01em'}}>{title}</div>
        {children}
      </div>
    </div>
  )
}

/* ─── FORM PRIMITIVES ─── */
const inputStyle: React.CSSProperties = {
  width:'100%',
  border:`1px solid ${T.border}`,
  borderRadius:10,
  padding:'12px 14px',
  fontFamily:T.fontBody,
  fontSize:14.5,
  color:T.text,
  background:T.surface,
  WebkitAppearance:'none',
  minHeight:46,
  boxSizing:'border-box',
  outline:'none',
}
const Label = ({children}:{children:React.ReactNode}) => (
  <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:T.textDim,marginBottom:6}}>{children}</label>
)
const FG = ({label,children}:{label:string,children:React.ReactNode}) => (
  <div style={{padding:'12px 24px 0'}}><Label>{label}</Label>{children}</div>
)
const FRow = ({children}:{children:React.ReactNode}) => (
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px',padding:'12px 24px 0'}}>{children}</div>
)
const FRowItem = ({label,children}:{label:string,children:React.ReactNode}) => (
  <div><Label>{label}</Label>{children}</div>
)
const btnPrimary: React.CSSProperties   = {flex:1,background:T.primary,border:'none',borderRadius:12,padding:'14px 16px',fontFamily:T.fontBody,fontSize:14.5,fontWeight:700,color:'#fff',cursor:'pointer',letterSpacing:'-0.005em',boxShadow:`0 4px 14px ${T.primary}40`}
const btnSecondary: React.CSSProperties = {flex:1,background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 16px',fontFamily:T.fontBody,fontSize:14.5,fontWeight:600,color:T.textDim,cursor:'pointer',letterSpacing:'-0.005em'}

/* ─── DYNAMIC MAP ─── */
const MapLeafletDynamic = dynamic(() => import('@/components/MapLeaflet'), {
  ssr: false,
  loading: () => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:T.textDim,fontSize:14,flexDirection:'column',gap:10}}>
      <Map size={32} color={T.borderStrong} strokeWidth={1.5}/>
      <span>Caricamento mappa…</span>
    </div>
  ),
})

/* ══════════════════════════════
   MAIN APP
══════════════════════════════ */
export default function App() {
  /* core */
  const [data, setData]         = useState<AppData|null>(null)
  const [page, setPage]         = useState<PageId>('dashboard')
  const [filter, setFilter]     = useState('Tutto')
  const [openDays, setOpenDays] = useState<Set<number>>(new Set())
  const [syncing, setSyncing]   = useState(false)
  const [lastSync, setLastSync] = useState('')
  const saveTimeout = useRef<ReturnType<typeof setTimeout>|null>(null)

  /* modals */
  const [addModal,     setAddModal]     = useState(false)
  const [editModal,    setEditModal]    = useState<Item|null>(null)
  const [actModal,     setActModal]     = useState<number|null>(null)
  const [dayModal,     setDayModal]     = useState(false)
  const [editDayModal, setEditDayModal] = useState<Day|null>(null)
  const [editActModal, setEditActModal] = useState<{dayId:number; actIdx:number}|null>(null)

  /* add-item form */
  const [fVoce,setFVoce]=useState(''); const [fSec,setFSec]=useState(SECTIONS[0]); const [fCat,setFCat]=useState(CATS[0])
  const [fGiorno,setFGiorno]=useState(''); const [fCosto,setFCosto]=useState(''); const [fQuando,setFQuando]=useState(QUANDO_OPTS[0])
  const [fNote,setFNote]=useState(''); const [fCanc,setFCanc]=useState(false); const [fCancDate,setFCancDate]=useState('')

  /* edit-item form */
  const [eVoce,setEVoce]=useState(''); const [eSec,setESec]=useState(SECTIONS[0]); const [eCat,setECat]=useState(CATS[0])
  const [eGiorno,setEGiorno]=useState(''); const [eCosto,setECosto]=useState(''); const [eQuando,setEQuando]=useState(QUANDO_OPTS[0])
  const [eNote,setENote]=useState(''); const [eCanc,setECanc]=useState(false); const [eCancDate,setECancDate]=useState('')

  /* activity / day forms */
  const [aTitle,setATitle]=useState(''); const [aTime,setATime]=useState('09:00'); const [aType,setAType]=useState(ACT_TYPES[0]); const [aNote,setANote]=useState('')
  const [dTitle,setDTitle]=useState(''); const [dDate,setDDate]=useState(''); const [dNum,setDNum]=useState(''); const [dPlace,setDPlace]=useState(''); const [dHotel,setDHotel]=useState('')

  /* documento form */
  const [docModal,  setDocModal]  = useState(false)
  const [dDocName,  setDDocName]  = useState('')
  const [dDocUrl,   setDDocUrl]   = useState('')
  const [dDocType,  setDDocType]  = useState<'link'|'file'>('link')
  const [dDocCat,   setDDocCat]   = useState(CATS[0])
  const [dDocNote,  setDDocNote]  = useState('')
  const [dDocMime,  setDDocMime]  = useState('')
  const [dDocDayId, setDDocDayId] = useState<number|undefined>(undefined)

  /* search */
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ,    setSearchQ]    = useState('')

  /* map */
  const [mapLocation, setMapLocation] = useState<{place:string; days:Day[]}|null>(null)

  /* weather */
  const [currentWeather, setCurrentWeather] = useState<{temp:number; code:number; loc:string}|null>(null)
  const [tripWeather,    setTripWeather]    = useState<Record<string, WeatherDay[]>>({})
  const weatherFetchedRef = useRef(false)

  /* ── LOAD & SYNC ── */
  const applyMigration = (d: any): AppData => ({ ...d, documenti: d.documenti ?? [] })

  useEffect(() => {
    fetch('/api/data').then(r=>r.json()).then(d=>{ setData(applyMigration(d)); setLastSync(new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})) })
    const iv = setInterval(() => {
      fetch('/api/data').then(r=>r.json()).then(d=>{ setData(applyMigration(d)); setLastSync(new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})) })
    }, 15000)
    return () => clearInterval(iv)
  }, [])

  /* ── CURRENT WEATHER (geolocation) ── */
  useEffect(() => {
    if (!navigator?.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords
        const [wRes, gRes] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`),
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=it`),
        ])
        const [wData, gData] = await Promise.all([wRes.json(), gRes.json()])
        const loc = gData.address?.city || gData.address?.town || gData.address?.village || gData.address?.county || 'La tua posizione'
        setCurrentWeather({ temp: Math.round(wData.current.temperature_2m), code: wData.current.weather_code, loc })
      } catch { /* silent */ }
    }, () => { /* denied */ }, { timeout: 6000, maximumAge: 300000 })
  }, [])

  /* ── TRIP WEATHER (archive 2025) ── */
  useEffect(() => {
    if (!data || weatherFetchedRef.current) return
    weatherFetchedRef.current = true
    const places = [...new Set(data.itinerary.map(d => d.place))].filter(p => PLACE_COORDS[p])
    places.forEach(async (place) => {
      const [lat, lon] = PLACE_COORDS[place]
      try {
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2025-07-25&end_date=2025-08-06&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&timezone=America%2FLima`
        const r = await fetch(url)
        const d = await r.json()
        if (!d.daily?.time) return
        const days: WeatherDay[] = d.daily.time.map((date: string, i: number) => ({
          date,
          maxTemp: Math.round(d.daily.temperature_2m_max[i] ?? 20),
          minTemp: Math.round(d.daily.temperature_2m_min[i] ?? 10),
          code:    d.daily.weather_code[i] ?? 0,
          precip:  Math.round((d.daily.precipitation_sum[i] ?? 0) * 10) / 10,
        }))
        setTripWeather(prev => ({ ...prev, [place]: days }))
      } catch { /* silent */ }
    })
  }, [data])

  /* ── SAVE ── */
  const save = useCallback((newData: AppData) => {
    setData(newData); setSyncing(true)
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newData)})
        .then(()=>{ setSyncing(false); setLastSync(new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})) })
        .catch(()=>setSyncing(false))
    }, 600)
  }, [])

  /* ── SEARCH RESULTS ── */
  const searchResults = useMemo(() => {
    if (!data || !searchQ.trim()) return null
    const q = searchQ.toLowerCase().trim()
    return {
      items: data.items.filter(i => i.voce.toLowerCase().includes(q) || (i.note||'').toLowerCase().includes(q)),
      days:  data.itinerary.filter(d => d.title.toLowerCase().includes(q) || d.place.toLowerCase().includes(q) || (d.notes||'').toLowerCase().includes(q) || d.activities.some(a=>a.title.toLowerCase().includes(q)||(a.note||'').toLowerCase().includes(q))),
      notes: data.notes.filter(n => n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q)),
      docs:  (data.documenti||[]).filter(d => d.name.toLowerCase().includes(q) || (d.note||'').toLowerCase().includes(q)),
    }
  }, [searchQ, data])

  /* ── LOADING ── */
  if (!data) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh',flexDirection:'column',gap:20,background:T.surfaceDark,color:T.goldBright,fontFamily:T.fontBody,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:'30%',left:'50%',transform:'translateX(-50%)',width:400,height:400,borderRadius:'50%',background:`radial-gradient(circle,${T.primaryBright}30,transparent 60%)`,filter:'blur(40px)',pointerEvents:'none'}}/>
      <div style={{position:'relative',fontSize:48,animation:'pulse 2s ease-in-out infinite'}}>🦙</div>
      <div style={{position:'relative',fontFamily:T.fontDisplay,fontSize:24,fontWeight:700,color:T.goldBright,letterSpacing:'-0.02em'}}>Perù 2026</div>
      <div style={{position:'relative',fontSize:11,color:'#9C8F73',letterSpacing:'.18em',textTransform:'uppercase',fontWeight:600}}>Caricamento in corso</div>
    </div>
  )

  /* ── WEATHER HELPER ── */
  const getWeatherForDay = (day: Day): WeatherDay | null => {
    const pw = tripWeather[day.place]
    if (!pw || !day.date) return null
    const md = day.date.slice(5)
    return pw.find(w => w.date.slice(5) === md) ?? null
  }

  /* ── ITEM ACTIONS ── */
  const toggleItem  = (id:number) => save({...data, items: data.items.map(i=>i.id===id?{...i,done:!i.done}:i)})
  const deleteItem  = (id:number) => { if(!confirm('Eliminare?')) return; save({...data, items: data.items.filter(i=>i.id!==id)}) }
  const saveNewItem = () => {
    if(!fVoce.trim()) return
    save({...data, items:[...data.items,{id:data.nextId,done:false,section:fSec,giorno:fGiorno,cat:fCat,voce:fVoce.trim(),quando:fQuando,costo:parseFloat(fCosto)||0,note:fNote,cancGratuita:fCanc,cancScadenza:fCanc?fCancDate:''}], nextId:data.nextId+1})
    setAddModal(false); setFVoce(''); setFGiorno(''); setFCosto(''); setFNote(''); setFCanc(false); setFCancDate('')
  }
  const openEdit = (item:Item) => {
    setEVoce(item.voce); setESec(item.section); setECat(item.cat); setEGiorno(item.giorno||'')
    setECosto(String(item.costo)); setEQuando(item.quando); setENote(item.note||'')
    setECanc(!!item.cancGratuita); setECancDate(item.cancScadenza||'')
    setEditModal(item)
  }
  const saveEdit = () => {
    if(!editModal) return
    save({...data, items: data.items.map(i=>i.id===editModal.id?{...i,section:eSec,cat:eCat,voce:eVoce.trim(),giorno:eGiorno,costo:parseFloat(eCosto)||0,quando:eQuando,note:eNote,cancGratuita:eCanc,cancScadenza:eCanc?eCancDate:''}:i)})
    setEditModal(null)
  }

  /* ── ACTIVITY / DAY ACTIONS ── */
  const saveActivity = () => {
    if(!aTitle.trim()||actModal===null) return
    save({...data, itinerary: data.itinerary.map(d=>d.id===actModal?{...d,activities:[...d.activities,{time:aTime,type:aType.split(' ')[0],title:aTitle.trim(),note:aNote}].sort((a,b)=>a.time.localeCompare(b.time))}:d)})
    setActModal(null); setATitle(''); setATime('09:00'); setANote('')
  }
  const saveDay = () => {
    if(!dTitle.trim()) return
    save({...data, itinerary:[...data.itinerary,{id:data.nextId,date:dDate,day:parseInt(dNum)||0,title:dTitle.trim(),place:dPlace,hotel:dHotel,notes:'',activities:[]}], nextId:data.nextId+1})
    setDayModal(false); setDTitle(''); setDDate(''); setDNum(''); setDPlace(''); setDHotel('')
  }
  const deleteDay      = (id:number) => { if(!confirm('Eliminare questo giorno?')) return; save({...data, itinerary: data.itinerary.filter(d=>d.id!==id)}) }
  const deleteActivity = (dayId:number, idx:number) => { if(!confirm('Eliminare?')) return; save({...data, itinerary: data.itinerary.map(d=>d.id===dayId?{...d,activities:d.activities.filter((_,i)=>i!==idx)}:d)}) }

  const openEditDay  = (day:Day) => { setDTitle(day.title); setDDate(day.date); setDNum(String(day.day)); setDPlace(day.place); setDHotel(day.hotel||''); setEditDayModal(day) }
  const openAddTappa = (day:Day) => { setDTitle(''); setDDate(day.date); setDNum(String(day.day)); setDPlace(''); setDHotel(day.hotel||''); setDayModal(true) }
  const saveEditDay  = () => {
    if(!editDayModal||!dTitle.trim()) return
    save({...data, itinerary: data.itinerary.map(d=>d.id===editDayModal.id?{...d,title:dTitle.trim(),date:dDate,day:parseInt(dNum)||d.day,place:dPlace,hotel:dHotel}:d)})
    setEditDayModal(null); setDTitle(''); setDDate(''); setDNum(''); setDPlace(''); setDHotel('')
  }
  const openEditActivity = (dayId:number, actIdx:number) => {
    const act = data.itinerary.find(d=>d.id===dayId)?.activities[actIdx]
    if(!act) return
    setATitle(act.title); setATime(act.time||'09:00'); setANote(act.note||'')
    setAType(ACT_TYPES.find(t=>t.split(' ')[0]===act.type)||ACT_TYPES[0])
    setEditActModal({dayId, actIdx})
  }
  const saveEditActivity = () => {
    if(!editActModal||!aTitle.trim()) return
    const {dayId, actIdx} = editActModal
    save({...data, itinerary: data.itinerary.map(d=>d.id===dayId?{...d,activities:d.activities.map((a,i)=>i===actIdx?{time:aTime,type:aType.split(' ')[0],title:aTitle.trim(),note:aNote}:a).sort((a,b)=>a.time.localeCompare(b.time))}:d)})
    setEditActModal(null); setATitle(''); setATime('09:00'); setANote('')
  }

  /* ── NOTE ACTIONS ── */
  const saveNote   = (id:number, field:'title'|'text', val:string) => save({...data, notes: data.notes.map(n=>n.id===id?{...n,[field]:val}:n)})
  const deleteNote = (id:number) => { if(!confirm('Eliminare?')) return; save({...data, notes: data.notes.filter(n=>n.id!==id)}) }
  const addNote    = () => save({...data, notes:[...data.notes,{id:data.nextId,title:'Nuova nota',color:NOTE_COLORS[data.notes.length%NOTE_COLORS.length],text:''}], nextId:data.nextId+1})

  /* ── DOCUMENTO ACTIONS ── */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { alert(`File troppo grande (max 500KB). Dimensione: ${(file.size/1024).toFixed(0)}KB`); e.target.value = ''; return }
    const reader = new FileReader()
    reader.onload = ev => {
      setDDocUrl(ev.target?.result as string)
      setDDocMime(file.type)
      if (!dDocName) setDDocName(file.name)
    }
    reader.readAsDataURL(file)
  }
  const saveDoc = () => {
    if (!dDocName.trim() || !dDocUrl.trim()) return
    const doc: Documento = { id:data.nextId, name:dDocName.trim(), url:dDocUrl.trim(), type:dDocType, cat:dDocCat, note:dDocNote.trim(), mime:dDocType==='file'?dDocMime:undefined, dayId:dDocDayId }
    save({...data, documenti:[...(data.documenti||[]),doc], nextId:data.nextId+1})
    setDocModal(false); setDDocName(''); setDDocUrl(''); setDDocType('link'); setDDocCat(CATS[0]); setDDocNote(''); setDDocMime(''); setDDocDayId(undefined)
  }
  const deleteDoc = (id:number) => { if(!confirm('Eliminare?')) return; save({...data, documenti:(data.documenti||[]).filter(d=>d.id!==id)}) }
  const openDoc   = (doc: Documento) => {
    if (doc.type === 'link') { window.open(doc.url, '_blank', 'noopener,noreferrer') }
    else { const a=document.createElement('a'); a.href=doc.url; a.download=doc.name; a.click() }
  }

  /* ── COMPUTED ── */
  const total     = data.items.reduce((s,i)=>s+i.costo,0)
  const spent     = data.items.filter(i=>i.done).reduce((s,i)=>s+i.costo,0)
  const pagato    = data.items.filter(i=>i.done&&!i.cancGratuita).reduce((s,i)=>s+i.costo,0)
  const cancConf  = data.items.filter(i=>i.done&&i.cancGratuita).reduce((s,i)=>s+i.costo,0)
  const doneCount = data.items.filter(i=>i.done).length
  const progress  = data.items.length ? Math.round(doneCount/data.items.length*100) : 0

  const oggi      = new Date(); oggi.setHours(0,0,0,0)
  const startDate = new Date(TRIP_START+'T00:00:00')
  const endDate   = new Date(TRIP_END+'T00:00:00')
  const daysToGo  = Math.ceil((startDate.getTime()-oggi.getTime())/86400000)
  const inViaggio = oggi>=startDate && oggi<=endDate
  const finito    = oggi>endDate

  const prossimoAlloggio = [...data.items].filter(i=>i.section==='ALLOGGI'&&!i.done&&i.giorno).sort((a,b)=>a.giorno.localeCompare(b.giorno))[0]
  const prossimoGiorno   = [...data.itinerary].sort((a,b)=>a.day!==b.day?a.day-b.day:a.id-b.id).find(d=>!d.date||new Date(d.date+'T00:00:00')>=oggi) || [...data.itinerary].sort((a,b)=>a.day!==b.day?a.day-b.day:a.id-b.id)[0]
  const daFare           = SECTIONS.filter(s=>s!=='QUOTIDIANO').map(sec=>({sec,count:data.items.filter(i=>i.section===sec&&!i.done).length})).filter(x=>x.count>0)

  /* ── UI HELPERS ── */
  const PAGE_STYLE: React.CSSProperties = {
    minHeight:'100dvh',
    paddingBottom:'calc(96px + env(safe-area-inset-bottom,0px))',
    WebkitOverflowScrolling:'touch',
  }

  const PageHeader = ({title, subtitle, action, eyebrow}:{title:string; subtitle?:string; action?:React.ReactNode; eyebrow?:string}) => (
    <header style={{position:'sticky',top:0,zIndex:50,background:`${T.bg}f5`,backdropFilter:'blur(12px) saturate(1.4)',WebkitBackdropFilter:'blur(12px) saturate(1.4)',borderBottom:`1px solid ${T.borderSoft}`,padding:'22px 22px 16px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:12}}>
        <div style={{minWidth:0,flex:1}}>
          {eyebrow && <div style={{fontSize:10,fontWeight:700,letterSpacing:'.18em',textTransform:'uppercase',color:T.primary,marginBottom:6}}>{eyebrow}</div>}
          <h1 style={{fontFamily:T.fontDisplay,fontSize:30,fontWeight:700,color:T.text,letterSpacing:'-0.025em',lineHeight:1,margin:0}}>{title}</h1>
          {subtitle && <p style={{fontSize:13,color:T.textDim,marginTop:5,margin:'5px 0 0',letterSpacing:'-0.005em'}}>{subtitle}</p>}
        </div>
        {action && <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>{action}</div>}
      </div>
    </header>
  )

  const SearchBtn = () => (
    <button onClick={()=>setSearchOpen(true)} style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,borderRadius:12,width:40,height:40}} aria-label="Cerca">
      <Search size={17} color={T.text} strokeWidth={2.2}/>
    </button>
  )
  const SyncDot = () => (
    <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,fontWeight:600,color:syncing?T.primary:T.textDim,padding:'8px 12px',background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:12,height:40,boxSizing:'border-box',letterSpacing:'-0.005em'}}>
      <span style={{width:6,height:6,borderRadius:99,background:syncing?T.primary:'#10B981',animation:syncing?'pulse 1.2s ease-in-out infinite':'none'}}/>
      {syncing ? 'sync…' : lastSync}
    </span>
  )
  const PrimaryActionBtn = ({onClick,icon,label}:{onClick:()=>void; icon?:React.ReactNode; label?:string}) => (
    <button onClick={onClick} style={{background:T.primary,border:'none',borderRadius:12,color:'#fff',padding:label?'0 14px':0,width:label?'auto':40,height:40,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontFamily:T.fontBody,letterSpacing:'-0.005em',boxShadow:`0 4px 14px ${T.primary}40`}}>
      {icon}{label}
    </button>
  )

  const goToChecklist = (cat?:string) => { if(cat) setFilter(cat); setPage('checklist') }

  const navItems: {id:PageId; icon:React.ReactNode; lbl:string}[] = [
    {id:'dashboard',  icon:<Home        size={20} strokeWidth={page==='dashboard'?2.4:1.7}/>, lbl:'Home'},
    {id:'checklist',  icon:<CheckSquare size={20} strokeWidth={page==='checklist'?2.4:1.7}/>, lbl:'Lista'},
    {id:'mappa',      icon:<Map         size={20} strokeWidth={page==='mappa'?2.4:1.7}/>, lbl:'Mappa'},
    {id:'itinerario', icon:<Calendar    size={20} strokeWidth={page==='itinerario'?2.4:1.7}/>, lbl:'Giorni'},
    {id:'budget',     icon:<Wallet      size={20} strokeWidth={page==='budget'?2.4:1.7}/>, lbl:'Budget'},
    {id:'documenti',  icon:<FolderOpen  size={20} strokeWidth={page==='documenti'?2.4:1.7}/>, lbl:'Docs'},
    {id:'note',       icon:<StickyNote  size={20} strokeWidth={page==='note'?2.4:1.7}/>, lbl:'Note'},
  ]

  return (
    <div style={{fontFamily:T.fontBody,background:T.bg,color:T.text,maxWidth:600,margin:'0 auto',minHeight:'100dvh',position:'relative'}}>
      {syncing && <div style={{position:'fixed',top:0,left:0,right:0,height:2.5,background:`linear-gradient(90deg,transparent,${T.goldBright},transparent)`,zIndex:999,backgroundSize:'200% 100%',animation:'shimmer 1.5s linear infinite'}}/>}

      {/* keyframes */}
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        ::-webkit-scrollbar { width: 0; display: none }
        input:focus, select:focus, textarea:focus { border-color: ${T.gold} !important; box-shadow: 0 0 0 3px ${T.goldSoft}; }
        button:active { transform: scale(0.98); }
      `}</style>

      {/* ══════════════════════════════
          DASHBOARD
      ══════════════════════════════ */}
      {page==='dashboard'&&(
        <div style={PAGE_STYLE}>
          <PageHeader
            title="Perù 2026"
            subtitle="25 luglio – 6 agosto · 2 persone"
            action={<><SearchBtn/><SyncDot/></>}
          />

          <div style={{padding:'16px 20px 24px',display:'flex',flexDirection:'column',gap:14}}>

            {/* HERO COUNTDOWN */}
            <div style={{background:T.surfaceDark,borderRadius:22,padding:'18px 20px 16px',color:'#fff',position:'relative',overflow:'hidden',boxShadow:T.shadowHero}}>
              <div style={{position:'absolute',top:-60,right:-60,width:200,height:200,borderRadius:'50%',background:`radial-gradient(circle,${T.primaryBright}30,transparent 65%)`,filter:'blur(6px)'}}/>

              {finito ? (
                <div style={{position:'relative'}}>
                  <div style={{fontSize:10,color:'#9C8F73',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:8,fontWeight:600}}>Viaggio terminato</div>
                  <div style={{fontFamily:T.fontDisplay,fontSize:26,fontWeight:700,color:T.goldBright,letterSpacing:'-0.02em',lineHeight:1.05}}>Speriamo sia andato bene</div>
                  <div style={{fontSize:12,color:'#A89B7E',marginTop:8}}>🦙 Adios Perú</div>
                </div>
              ) : inViaggio ? (
                <div style={{position:'relative'}}>
                  <div style={{fontSize:10,color:'#9C8F73',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:8,fontWeight:600}}>Sei in viaggio</div>
                  <div style={{fontFamily:T.fontDisplay,fontSize:28,fontWeight:700,color:T.goldBright,letterSpacing:'-0.02em',lineHeight:1.05}}>Buon Perù ✈️</div>
                  <div style={{fontSize:12,color:'#A89B7E',marginTop:8}}>Termina il {fmtDate(TRIP_END)}</div>
                </div>
              ) : (
                <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',gap:14}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:10,color:'#9C8F73',textTransform:'uppercase',letterSpacing:'.16em',fontWeight:700,marginBottom:4,display:'flex',alignItems:'center',gap:5}}>
                      <Sparkles size={10} color={T.goldBright}/>Alla partenza
                    </div>
                    <div style={{display:'flex',alignItems:'baseline',gap:6}}>
                      <span style={{fontFamily:T.fontDisplay,fontSize:60,fontWeight:700,color:T.goldBright,lineHeight:.9,letterSpacing:'-0.04em'}}>{daysToGo}</span>
                      <span style={{fontFamily:T.fontDisplay,fontSize:14,color:'#A89B7E',fontWeight:600,letterSpacing:'-0.005em'}}>giorni</span>
                    </div>
                    <div style={{fontSize:11,color:'#7C7058',marginTop:4,fontVariantNumeric:'tabular-nums'}}>{fmtDate(TRIP_START)} · {doneCount}/{data.items.length} task</div>
                  </div>
                  <div style={{position:'relative',width:62,height:62,flexShrink:0}}>
                    <svg width="62" height="62" style={{transform:'rotate(-90deg)'}}>
                      <circle cx="31" cy="31" r="26" stroke="rgba(255,255,255,.08)" strokeWidth="4" fill="none"/>
                      <circle cx="31" cy="31" r="26" stroke={T.goldBright} strokeWidth="4" fill="none"
                        strokeDasharray={`${2*Math.PI*26}`}
                        strokeDashoffset={`${2*Math.PI*26*(1-progress/100)}`}
                        strokeLinecap="round"
                        style={{transition:'stroke-dashoffset .8s ease-out'}}/>
                    </svg>
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff',fontVariantNumeric:'tabular-nums'}}>{progress}<span style={{fontSize:9,color:'#9C8F73'}}>%</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* WEATHER + PROGRESS GRID */}
            <div style={{display:'grid',gridTemplateColumns:currentWeather?'1fr 1fr':'1fr',gap:10}}>
              {currentWeather && (
                <div style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:20,padding:'14px 16px'}}>
                  <div style={{fontSize:10,color:T.textFaint,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700,marginBottom:8}}>Ora qui</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:4}}>
                    <span style={{fontSize:32,lineHeight:1}}>{wEmoji(currentWeather.code)}</span>
                    <span style={{fontFamily:T.fontDisplay,fontSize:28,fontWeight:700,color:T.text,letterSpacing:'-0.02em'}}>{currentWeather.temp}°</span>
                  </div>
                  <div style={{fontSize:12,color:T.textDim,display:'flex',alignItems:'center',gap:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    <MapPin size={10} strokeWidth={2}/>{currentWeather.loc}
                  </div>
                </div>
              )}
              <div style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:20,padding:'14px 16px',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                <div style={{fontSize:10,color:T.textFaint,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700}}>Budget</div>
                <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:4}}>
                  <span style={{fontFamily:T.fontDisplay,fontSize:24,fontWeight:700,color:T.text,letterSpacing:'-0.02em'}}>{fmtEur(pagato).replace('€ ','')}</span>
                  <span style={{fontSize:11,color:T.textDim}}>su {fmtEur(total)}</span>
                </div>
                <div style={{background:T.surfaceAlt,borderRadius:99,height:5,overflow:'hidden',marginTop:8}}>
                  <div style={{display:'flex',height:'100%'}}>
                    <div style={{width:`${pagato/total*100}%`,background:T.success,transition:'width .6s'}}/>
                    <div style={{width:`${cancConf/total*100}%`,background:T.warning,transition:'width .6s'}}/>
                  </div>
                </div>
              </div>
            </div>

            {/* DA PRENOTARE */}
            {daFare.length > 0 && (
              <div style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:20,overflow:'hidden'}}>
                <div style={{padding:'14px 18px 6px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:T.textDim}}>Da prenotare</div>
                  <button onClick={()=>goToChecklist()} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:2,color:T.gold,fontSize:12,fontWeight:600,fontFamily:T.fontBody}}>
                    Apri lista<ChevronRight size={13}/>
                  </button>
                </div>
                <div style={{padding:'4px 6px 8px'}}>
                  {daFare.map(({sec,count})=>(
                    <button key={sec} onClick={()=>goToChecklist()} style={{width:'100%',background:'none',border:'none',padding:'10px 12px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',textAlign:'left',borderRadius:12,fontFamily:T.fontBody,transition:'background .15s'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=T.surfaceAlt}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='none'}}>
                      <div style={{width:30,height:30,borderRadius:8,background:T.surfaceAlt,display:'flex',alignItems:'center',justifyContent:'center',color:T.primary,flexShrink:0}}>
                        <SectionIcon sec={sec} size={14}/>
                      </div>
                      <div style={{flex:1,fontSize:14,fontWeight:600,color:T.text,letterSpacing:'-0.005em'}}>{sec.charAt(0)+sec.slice(1).toLowerCase()}</div>
                      <div style={{background:T.warningSoft,color:T.warning,borderRadius:99,padding:'2px 9px',fontSize:11.5,fontWeight:700,minWidth:24,textAlign:'center'}}>{count}</div>
                      <ChevronRight size={14} color={T.textFaint}/>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PROSSIMO GIORNO */}
            {prossimoGiorno && (
              <button onClick={()=>setPage('itinerario')} style={{background:'none',border:'none',padding:0,cursor:'pointer',width:'100%',textAlign:'left'}}>
                <div style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:20,overflow:'hidden'}}>
                  <div style={{padding:'14px 18px 8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:T.textDim}}>Prossima tappa</div>
                    <ArrowRight size={14} color={T.gold}/>
                  </div>
                  <div style={{padding:'4px 18px 14px'}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:10}}>
                      <div style={{background:T.surfaceDark,color:T.goldBright,borderRadius:14,padding:'10px 12px',fontFamily:T.fontDisplay,fontWeight:700,lineHeight:1,textAlign:'center',minWidth:62}}>
                        <div style={{fontSize:18,letterSpacing:'-0.01em'}}>{fmtDate(prossimoGiorno.date)}</div>
                        <div style={{fontFamily:T.fontBody,fontSize:9,color:'#9C8F73',fontWeight:500,marginTop:3,letterSpacing:'.08em'}}>GIORNO {prossimoGiorno.day}</div>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:T.fontDisplay,fontSize:18,fontWeight:700,color:T.text,letterSpacing:'-0.015em',lineHeight:1.2}}>{prossimoGiorno.title}</div>
                        <div style={{fontSize:12.5,color:T.textDim,display:'flex',alignItems:'center',gap:4,marginTop:6}}><MapPin size={11} strokeWidth={2}/>{prossimoGiorno.place}</div>
                      </div>
                    </div>
                    {prossimoGiorno.activities.slice(0,3).map((a,i)=>(
                      <div key={i} style={{display:'flex',gap:10,padding:'7px 0',borderTop:`1px solid ${T.borderSoft}`,alignItems:'center'}}>
                        <div style={{fontSize:11,fontWeight:600,color:T.gold,minWidth:38,fontVariantNumeric:'tabular-nums'}}>{a.time}</div>
                        <div style={{fontSize:14}}>{a.type}</div>
                        <div style={{fontSize:13,fontWeight:500,flex:1,color:T.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.title}</div>
                      </div>
                    ))}
                    {prossimoGiorno.activities.length>3&&<div style={{fontSize:11,color:T.textFaint,paddingTop:8,textAlign:'center'}}>+{prossimoGiorno.activities.length-3} altre attività</div>}
                  </div>
                </div>
              </button>
            )}

            {/* PROSSIMO ALLOGGIO */}
            {prossimoAlloggio && (
              <div style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:20,padding:'14px 18px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:T.textDim,display:'flex',alignItems:'center',gap:6}}>
                    <Bed size={12} strokeWidth={2}/>Prossimo alloggio
                  </div>
                  {prossimoAlloggio.cancGratuita&&<CancBadge item={prossimoAlloggio}/>}
                </div>
                <div style={{fontSize:14.5,fontWeight:600,color:T.text,letterSpacing:'-0.005em'}}>{prossimoAlloggio.voce}</div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginTop:6,fontSize:12.5,color:T.textDim}}>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><Clock size={11}/>{fmtDate(prossimoAlloggio.giorno)}</span>
                  {prossimoAlloggio.costo>0&&<span style={{color:T.success,fontWeight:600}}>{fmtEur(prossimoAlloggio.costo)}</span>}
                </div>
                {prossimoAlloggio.note&&<div style={{fontSize:12.5,color:T.textDim,fontStyle:'italic',marginTop:8,paddingTop:8,borderTop:`1px solid ${T.borderSoft}`}}>{prossimoAlloggio.note}</div>}
              </div>
            )}

            <div style={{height:24}}/>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          CHECKLIST
      ══════════════════════════════ */}
      {page==='checklist'&&(
        <div style={PAGE_STYLE}>
          <PageHeader
            title="Checklist"
            subtitle={`${doneCount} di ${data.items.length} completati · ${progress}%`}
            action={
              <>
                <SearchBtn/>
                <PrimaryActionBtn onClick={()=>setAddModal(true)} icon={<Plus size={15} strokeWidth={2.6}/>} label="Aggiungi"/>
              </>
            }
          />

          {/* progress bar */}
          <div style={{padding:'2px 20px 12px'}}>
            <div style={{background:T.surfaceAlt,borderRadius:99,height:4,overflow:'hidden'}}>
              <div style={{width:`${progress}%`,height:'100%',background:`linear-gradient(90deg,${T.gold},${T.goldBright})`,transition:'width .6s'}}/>
            </div>
          </div>

          {/* filter chips */}
          <div style={{display:'flex',gap:8,padding:'4px 20px 16px',overflowX:'auto',position:'sticky',top:75,background:T.bg,zIndex:40}}>
            {['Tutto',...new Set(data.items.map(i=>i.cat))].map(c=>{
              const active = filter===c
              return (
                <button key={c} onClick={()=>setFilter(c)} style={{flexShrink:0,padding:'7px 14px',borderRadius:99,border:`1px solid ${active?T.surfaceDark:T.border}`,background:active?T.surfaceDark:T.surface,color:active?T.goldBright:T.text,fontFamily:T.fontBody,fontSize:13,fontWeight:600,cursor:'pointer',letterSpacing:'-0.005em',transition:'all .15s'}}>{c}</button>
              )
            })}
          </div>

          <div style={{padding:'0 20px',display:'flex',flexDirection:'column',gap:18}}>
            {SECTIONS.map(sec=>{
              let items=data.items.filter(i=>i.section===sec)
              if(filter!=='Tutto') items=items.filter(i=>i.cat===filter)
              if(!items.length) return null
              const total = items.length
              const done = items.filter(i=>i.done).length
              items=[...items].sort((a,b)=>{ if(a.done!==b.done) return a.done?1:-1; if(!a.giorno&&!b.giorno) return 0; if(!a.giorno) return 1; if(!b.giorno) return -1; return a.giorno.localeCompare(b.giorno) })
              return (
                <div key={sec}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,paddingLeft:2}}>
                    <div style={{width:24,height:24,borderRadius:7,background:T.surfaceAlt,color:T.primary,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <SectionIcon sec={sec} size={13}/>
                    </div>
                    <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:T.textDim}}>{sec}</div>
                    <div style={{fontSize:11,color:T.textFaint,fontVariantNumeric:'tabular-nums'}}>{done}/{total}</div>
                  </div>
                  <div style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:18,overflow:'hidden'}}>
                    {items.map((i,idx)=>(
                      <div key={i.id} style={{opacity:i.done?.55:1,borderBottom:idx<items.length-1?`1px solid ${T.borderSoft}`:'none'}}>
                        <div style={{display:'flex',alignItems:'center',gap:12,padding:'13px 14px'}}>
                          <button onClick={()=>toggleItem(i.id)} style={{width:24,height:24,borderRadius:8,border:`2px solid ${i.done?T.success:T.borderStrong}`,background:i.done?T.success:'transparent',color:'#fff',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',padding:0}}>
                            {i.done&&<Check size={13} strokeWidth={3}/>}
                          </button>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:14,fontWeight:600,lineHeight:1.3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textDecoration:i.done?'line-through':'none',color:T.text,letterSpacing:'-0.005em'}}>{i.voce}</div>
                            <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap',alignItems:'center'}}>
                              {i.costo>0&&<span style={{fontSize:12.5,fontWeight:600,color:T.success,fontVariantNumeric:'tabular-nums'}}>{fmtEur(i.costo)}</span>}
                              {i.giorno&&<span style={{fontSize:11.5,color:T.textDim,display:'flex',alignItems:'center',gap:3}}><Clock size={10}/>{fmtDate(i.giorno)}</span>}
                            </div>
                          </div>
                          <div style={{display:'flex',gap:2}}>
                            <button onClick={()=>openEdit(i)} style={{border:'none',background:'transparent',borderRadius:8,cursor:'pointer',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}><Pencil size={14} color={T.textDim}/></button>
                            <button onClick={()=>deleteItem(i.id)} style={{border:'none',background:'transparent',borderRadius:8,cursor:'pointer',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={14} color={T.textFaint}/></button>
                          </div>
                        </div>
                        <div style={{padding:'0 14px 11px',display:'flex',flexWrap:'wrap',gap:5}}>
                          <CatBadge cat={i.cat} size="sm"/><QBadge q={i.quando}/><CancBadge item={i}/>
                        </div>
                        {i.note&&<div style={{fontSize:12.5,color:T.textDim,fontStyle:'italic',padding:'0 14px 11px',lineHeight:1.5}}>{i.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{margin:'20px 20px 16px',background:T.surfaceDark,borderRadius:18,padding:'18px 20px',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
            <div>
              <div style={{fontSize:10,color:'#9C8F73',textTransform:'uppercase',letterSpacing:'.12em',fontWeight:600}}>Totale a persona</div>
              <div style={{fontSize:11,color:'#7C7058',marginTop:4}}>Coppia: {fmtEur(total*2)}</div>
            </div>
            <div style={{fontFamily:T.fontDisplay,fontSize:30,fontWeight:700,color:T.goldBright,letterSpacing:'-0.02em',lineHeight:1}}>{fmtEur(total)}</div>
          </div>
          <div style={{height:80}}/>
        </div>
      )}

      {/* ══════════════════════════════
          MAPPA
      ══════════════════════════════ */}
      {page==='mappa'&&(
        <div style={{height:'100dvh',overflow:'hidden',display:'flex',flexDirection:'column',paddingBottom:'calc(88px + env(safe-area-inset-bottom,0px))',boxSizing:'border-box'}}>
          <PageHeader
            title="Mappa"
            subtitle="Tocca un luogo per i dettagli"
            action={<SearchBtn/>}
          />
          <div style={{flex:1,position:'relative',minHeight:0}}>
            <MapLeafletDynamic
              itinerary={data.itinerary}
              onLocationClick={(place, days) => setMapLocation({place, days})}
            />
            {mapLocation && (
              <div style={{position:'absolute',bottom:0,left:0,right:0,background:T.bg,borderRadius:'24px 24px 0 0',maxHeight:'62%',overflowY:'auto',boxShadow:'0 -10px 40px rgba(0,0,0,.18)',zIndex:1000,animation:'fadeIn .2s ease-out'}}>
                <div style={{width:40,height:4,background:T.borderStrong,borderRadius:99,margin:'12px auto 10px'}}/>
                <div style={{padding:'0 20px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${T.border}`}}>
                  <div>
                    <div style={{fontFamily:T.fontDisplay,fontSize:20,fontWeight:700,color:T.text,letterSpacing:'-0.015em'}}>{mapLocation.place}</div>
                    <div style={{fontSize:12,color:T.textDim,marginTop:3}}>{mapLocation.days.length} {mapLocation.days.length===1?'giorno':'giorni'} in questa tappa</div>
                  </div>
                  <button onClick={()=>setMapLocation(null)} style={{background:T.surface,border:`1px solid ${T.border}`,cursor:'pointer',width:34,height:34,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16} color={T.textDim}/></button>
                </div>
                {mapLocation.days.map(day=>(
                  <div key={day.id} style={{padding:'14px 20px',borderBottom:`1px solid ${T.borderSoft}`}}>
                    <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:8}}>
                      <div style={{background:T.surfaceDark,color:T.goldBright,borderRadius:10,padding:'4px 9px',fontFamily:T.fontDisplay,fontSize:14,fontWeight:700,flexShrink:0,letterSpacing:'-0.01em'}}>G{day.day}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:T.fontDisplay,fontSize:15,fontWeight:700,color:T.text,letterSpacing:'-0.01em'}}>{day.title}</div>
                        <div style={{fontSize:11.5,color:T.textDim,marginTop:2}}>{fmtDate(day.date)}{day.hotel&&<> · {day.hotel}</>}</div>
                      </div>
                    </div>
                    {(() => {
                      const wd = getWeatherForDay(day)
                      if (!wd) return null
                      return (
                        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:T.textDim,marginBottom:8,padding:'6px 10px',background:T.surfaceAlt,borderRadius:8}}>
                          <span style={{fontSize:15}}>{wEmoji(wd.code)}</span>
                          <span style={{fontWeight:600,color:T.text}}>{wd.maxTemp}°/{wd.minTemp}°</span>
                          <span>{wDesc(wd.code)}</span>
                          {wd.precip>0&&<span>💧{wd.precip}mm</span>}
                          <span style={{marginLeft:'auto',fontSize:10,color:T.textFaint,letterSpacing:'.04em'}}>storico</span>
                        </div>
                      )
                    })()}
                    {day.activities.map((a,i)=>(
                      <div key={i} style={{display:'flex',gap:10,padding:'5px 0',alignItems:'center'}}>
                        <div style={{fontSize:11,fontWeight:600,color:T.gold,minWidth:36,fontVariantNumeric:'tabular-nums'}}>{a.time}</div>
                        <div style={{fontSize:14}}>{a.type}</div>
                        <div style={{fontSize:13,fontWeight:500,flex:1,color:T.text}}>{a.title}</div>
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{height:20}}/>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          ITINERARIO
      ══════════════════════════════ */}
      {page==='itinerario'&&(
        <div style={PAGE_STYLE}>
          <PageHeader
            title="Itinerario"
            subtitle={`${data.itinerary.length} giorni · ${data.itinerary.reduce((s,d)=>s+d.activities.length,0)} attività`}
            action={
              <>
                <SearchBtn/>
                <PrimaryActionBtn onClick={()=>setDayModal(true)} icon={<Plus size={18} strokeWidth={2.6}/>}/>
              </>
            }
          />
          <div style={{padding:'14px 20px',display:'flex',flexDirection:'column',gap:8}}>
            {(()=>{
              const dayCounts: Record<number, number> = {}
              data.itinerary.forEach(d => { dayCounts[d.day] = (dayCounts[d.day]||0) + 1 })
              return [...data.itinerary]
                .sort((a,b) => a.day !== b.day ? a.day - b.day : a.id - b.id)
                .map((day, _i, arr) => {
              const wd = getWeatherForDay(day)
              const expanded = openDays.has(day.id)
              const total = dayCounts[day.day]
              const position = arr.filter(d => d.day === day.day && d.id <= day.id).length
              const isMultiLeg = total > 1
              return (
                <div key={day.id} style={{background:T.surface,borderRadius:16,border:`1px solid ${expanded?T.borderStrong:T.border}`,overflow:'hidden',transition:'border-color .15s'}}>
                  <div style={{display:'flex',alignItems:'stretch'}}>
                    <div style={{background:T.surfaceDark,color:T.goldBright,fontFamily:T.fontDisplay,fontWeight:700,padding:'14px 12px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minWidth:62,lineHeight:1,position:'relative',cursor:'pointer'}} onClick={()=>setOpenDays(prev=>{ const n=new Set(prev); n.has(day.id)?n.delete(day.id):n.add(day.id); return n })}>
                      <div style={{fontSize:16,letterSpacing:'-0.01em'}}>{fmtDate(day.date)}</div>
                      <div style={{fontFamily:T.fontBody,fontSize:9,color:'#9C8F73',fontWeight:500,marginTop:4,letterSpacing:'.08em'}}>G{day.day}{isMultiLeg && <span style={{color:T.goldBright}}> · {position}/{total}</span>}</div>
                    </div>
                    <div style={{flex:1,padding:'13px 12px',minWidth:0,cursor:'pointer'}} onClick={()=>setOpenDays(prev=>{ const n=new Set(prev); n.has(day.id)?n.delete(day.id):n.add(day.id); return n })}>
                      <div style={{fontFamily:T.fontDisplay,fontSize:15.5,fontWeight:700,lineHeight:1.25,color:T.text,letterSpacing:'-0.01em'}}>{day.title}</div>
                      {isMultiLeg && <div style={{display:'inline-block',marginTop:4,fontSize:9,fontWeight:700,color:T.primary,letterSpacing:'.1em',textTransform:'uppercase',background:T.primarySoft,padding:'2px 6px',borderRadius:99}}>Tappa {position}</div>}
                      <div style={{fontSize:11.5,color:T.textDim,marginTop:4,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                        <span style={{display:'flex',alignItems:'center',gap:3}}><MapPin size={10}/>{day.place}</span>
                        {day.hotel&&<span style={{display:'flex',alignItems:'center',gap:3}}><Bed size={10}/>{day.hotel}</span>}
                        {wd&&<span style={{display:'flex',alignItems:'center',gap:3,fontWeight:600,color:T.text}}>{wEmoji(wd.code)}{wd.maxTemp}°/{wd.minTemp}°</span>}
                      </div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'8px 10px',gap:2,borderLeft:`1px solid ${T.borderSoft}`}}>
                      <button onClick={e=>{e.stopPropagation();openEditDay(day)}} style={{background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center',color:T.textDim}}><Pencil size={14}/></button>
                      <button onClick={e=>{e.stopPropagation();deleteDay(day.id)}} style={{background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center',color:T.textFaint}}><Trash2 size={14}/></button>
                    </div>
                  </div>
                  {expanded&&(
                    <div style={{borderTop:`1px solid ${T.borderSoft}`}}>
                      {wd&&(
                        <div style={{padding:'10px 16px',background:T.surfaceAlt,display:'flex',alignItems:'center',gap:10,fontSize:12.5,color:T.textDim}}>
                          <span style={{fontSize:16}}>{wEmoji(wd.code)}</span>
                          <span style={{fontWeight:600,color:T.text,fontVariantNumeric:'tabular-nums'}}>{wd.maxTemp}°/{wd.minTemp}°</span>
                          <span>{wDesc(wd.code)}</span>
                          {wd.precip>0&&<span>💧{wd.precip}mm</span>}
                          <span style={{marginLeft:'auto',fontSize:10,color:T.textFaint,letterSpacing:'.04em',textTransform:'uppercase'}}>media lug '25</span>
                        </div>
                      )}
                      {day.activities.map((a,i)=>(
                        <div key={i} style={{display:'flex',borderBottom:`1px solid ${T.borderSoft}`,alignItems:'stretch'}}>
                          <div style={{display:'flex',flex:1,gap:12,padding:'11px 16px',alignItems:'flex-start',minWidth:0}}>
                            <div style={{fontSize:11.5,fontWeight:700,color:T.gold,minWidth:38,paddingTop:3,display:'flex',alignItems:'center',gap:2,fontVariantNumeric:'tabular-nums'}}>{a.time||'—'}</div>
                            <div style={{fontSize:16,paddingTop:0,lineHeight:1.2}}>{a.type}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13.5,fontWeight:600,lineHeight:1.35,color:T.text,letterSpacing:'-0.005em'}}>{a.title}</div>
                              {a.note&&<div style={{fontSize:12,color:T.textDim,marginTop:2}}>{a.note}</div>}
                            </div>
                          </div>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'6px 10px',gap:2,borderLeft:`1px solid ${T.borderSoft}`}}>
                            <button onClick={()=>openEditActivity(day.id,i)} style={{background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center',color:T.textDim}}><Pencil size={12}/></button>
                            <button onClick={()=>deleteActivity(day.id,i)} style={{background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center',color:T.textFaint}}><Trash2 size={12}/></button>
                          </div>
                        </div>
                      ))}
                      {day.notes&&<div style={{background:T.warningSoft,padding:'10px 16px',fontSize:12.5,color:T.warning,borderTop:`1px solid ${T.borderSoft}`,display:'flex',gap:6,alignItems:'flex-start'}}>📝 <span>{day.notes}</span></div>}
                      {(()=>{
                        const linked = (data.documenti||[]).filter(d=>d.dayId===day.id)
                        if (!linked.length) return null
                        return (
                          <div style={{borderTop:`1px solid ${T.borderSoft}`,background:T.surfaceAlt,padding:'10px 16px'}}>
                            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:T.textDim,marginBottom:8,display:'flex',alignItems:'center',gap:5}}><FolderOpen size={11}/>Documenti allegati</div>
                            <div style={{display:'flex',flexDirection:'column',gap:6}}>
                              {linked.map(doc=>(
                                <div key={doc.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 10px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:10}}>
                                  <div style={{width:26,height:26,borderRadius:7,background:doc.type==='link'?T.infoSoft:'#F3E8FF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                    {doc.type==='link'?<Link2 size={12} color={T.info}/>:<File size={12} color="#7E22CE"/>}
                                  </div>
                                  <span style={{flex:1,fontSize:13,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:T.text}}>{doc.name}</span>
                                  <button onClick={()=>openDoc(doc)} style={{background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center',color:doc.type==='link'?T.info:'#7E22CE',flexShrink:0}}>
                                    {doc.type==='link'?<ExternalLink size={13}/>:<Download size={13}/>}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                      <div style={{display:'flex',borderTop:`1px dashed ${T.borderStrong}`}}>
                        <button onClick={()=>setActModal(day.id)} style={{flex:1,background:'none',border:'none',padding:'12px',fontFamily:T.fontBody,fontSize:13,color:T.textDim,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontWeight:500}}><Plus size={14}/>Attività</button>
                        <button onClick={()=>openAddTappa(day)} style={{flex:1,background:'none',border:'none',borderLeft:`1px dashed ${T.borderStrong}`,padding:'12px',fontFamily:T.fontBody,fontSize:13,color:T.primary,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontWeight:600}}><Plus size={14}/>Tappa parallela</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
            })()}
          </div>
          <div style={{height:80}}/>
        </div>
      )}

      {/* ══════════════════════════════
          BUDGET
      ══════════════════════════════ */}
      {page==='budget'&&(
        <div style={PAGE_STYLE}>
          <PageHeader
            title="Budget"
            subtitle="Spese stimate e ripartizione"
            action={<SearchBtn/>}
          />
          <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:T.surfaceDark,borderRadius:24,padding:'28px 24px 26px',color:'#fff',position:'relative',overflow:'hidden',boxShadow:T.shadowHero}}>
              <div style={{position:'absolute',top:-80,right:-80,width:240,height:240,borderRadius:'50%',background:`radial-gradient(circle,${T.primaryBright}30,transparent 65%)`,filter:'blur(6px)'}}/>
              <div style={{position:'absolute',bottom:-40,right:30,width:120,height:120,borderRadius:'50%',background:`radial-gradient(circle,${T.gold}25,transparent 65%)`,filter:'blur(6px)'}}/>
              <div style={{position:'relative'}}>
                <div style={{fontSize:10,color:'#9C8F73',textTransform:'uppercase',letterSpacing:'.16em',fontWeight:700,marginBottom:10}}>Budget a persona</div>
                <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                  <span style={{fontFamily:T.fontDisplay,fontSize:18,fontWeight:600,color:T.goldBright,letterSpacing:'-0.02em',marginRight:4}}>€</span>
                  <span style={{fontFamily:T.fontDisplay,fontSize:64,fontWeight:700,color:T.goldBright,lineHeight:.9,letterSpacing:'-0.04em'}}>{Number(total).toLocaleString('it-IT')}</span>
                </div>
                <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.08)',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12,color:'#A89B7E'}}>
                  <span>Coppia · <strong style={{color:'#E5DBC5',fontWeight:600}}>{fmtEur(total*2)}</strong></span>
                  <span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:6,height:6,borderRadius:99,background:T.success}}/>{Math.round(spent/total*100)}% confermato</span>
                </div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[
                {v:fmtEur(pagato),    l:'Già pagato',     dot:T.success, sub:'definitivo'},
                {v:fmtEur(cancConf),  l:'Cancellabile',   dot:T.warning, sub:'ancora annullabile'},
                {v:fmtEur(total-spent),l:'Da prenotare', dot:T.danger,  sub:'da fare'},
                {v:fmtEur(total*2),   l:'Coppia',        dot:T.gold,    sub:'entrambi'},
              ].map((st,i)=>(
                <div key={i} style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:18,padding:'14px 16px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                    <div style={{width:7,height:7,borderRadius:99,background:st.dot}}/>
                    <div style={{fontSize:11,fontWeight:600,color:T.textDim,textTransform:'uppercase',letterSpacing:'.05em'}}>{st.l}</div>
                  </div>
                  <div style={{fontFamily:T.fontDisplay,fontSize:20,fontWeight:700,color:T.text,letterSpacing:'-0.015em',lineHeight:1}}>{st.v}</div>
                  <div style={{fontSize:11,color:T.textFaint,marginTop:4}}>{st.sub}</div>
                </div>
              ))}
            </div>
            {(()=>{
              const byCat: {[k:string]:{b:number,p:number,c:number}}={}
              data.items.forEach(i=>{ if(!byCat[i.cat]) byCat[i.cat]={b:0,p:0,c:0}; byCat[i.cat].b+=i.costo; if(i.done&&!i.cancGratuita) byCat[i.cat].p+=i.costo; if(i.done&&i.cancGratuita) byCat[i.cat].c+=i.costo })
              const entries = Object.entries(byCat).sort((a,b)=>b[1].b-a[1].b)
              return (
                <div style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:20,overflow:'hidden'}}>
                  <div style={{padding:'14px 18px 10px',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:T.textDim,borderBottom:`1px solid ${T.borderSoft}`}}>Per categoria</div>
                  {entries.map(([cat,v],idx)=>{
                    const pct = Math.round(v.b/total*100)
                    return (
                      <div key={cat} style={{padding:'12px 18px',borderBottom:idx<entries.length-1?`1px solid ${T.borderSoft}`:'none'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                          <div style={{width:8,height:8,borderRadius:'50%',background:CAT_COLORS[cat]||'#999',flexShrink:0}}/>
                          <div style={{fontSize:13.5,fontWeight:600,flex:1,color:T.text,letterSpacing:'-0.005em'}}>{cat}</div>
                          <div style={{fontSize:13.5,fontWeight:700,color:T.text,fontVariantNumeric:'tabular-nums'}}>{fmtEur(v.b)}</div>
                          <div style={{fontSize:10.5,color:T.textDim,background:T.surfaceAlt,padding:'2px 7px',borderRadius:99,fontWeight:600,minWidth:32,textAlign:'center'}}>{pct}%</div>
                        </div>
                        <div style={{background:T.surfaceAlt,borderRadius:99,height:3,overflow:'hidden',marginBottom:(v.p>0||v.c>0)?8:0}}>
                          <div style={{width:`${pct}%`,height:'100%',background:CAT_COLORS[cat]||T.gold,transition:'width .6s'}}/>
                        </div>
                        {(v.p>0||v.c>0)&&(
                          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                            {v.p>0&&<span style={{fontSize:10.5,background:T.successSoft,color:T.success,padding:'2px 7px',borderRadius:99,fontWeight:600,display:'flex',alignItems:'center',gap:3}}><Check size={9} strokeWidth={3}/>{fmtEur(v.p)}</span>}
                            {v.c>0&&<span style={{fontSize:10.5,background:T.warningSoft,color:T.warning,padding:'2px 7px',borderRadius:99,fontWeight:600}}>canc. {fmtEur(v.c)}</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
            <div style={{height:24}}/>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          DOCUMENTI
      ══════════════════════════════ */}
      {page==='documenti'&&(
        <div style={PAGE_STYLE}>
          <PageHeader
            title="Documenti"
            subtitle={`${(data.documenti||[]).length} elementi salvati`}
            action={
              <>
                <SearchBtn/>
                <PrimaryActionBtn onClick={()=>setDocModal(true)} icon={<Plus size={15} strokeWidth={2.6}/>} label="Aggiungi"/>
              </>
            }
          />
          {(data.documenti||[]).length === 0 ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 32px 80px',textAlign:'center'}}>
              <div style={{width:80,height:80,borderRadius:24,background:T.surfaceAlt,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:18}}>
                <FolderOpen size={36} color={T.borderStrong} strokeWidth={1.5}/>
              </div>
              <div style={{fontFamily:T.fontDisplay,fontSize:20,fontWeight:700,color:T.text,letterSpacing:'-0.015em'}}>Nessun documento</div>
              <div style={{marginTop:8,fontSize:13.5,color:T.textDim,lineHeight:1.5,maxWidth:280}}>Salva qui link di prenotazione, biglietti PDF o conferme da rileggere prima del viaggio.</div>
              <button onClick={()=>setDocModal(true)} style={{marginTop:24,background:T.primary,color:'#fff',border:'none',borderRadius:14,padding:'14px 26px',fontFamily:T.fontBody,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,boxShadow:`0 4px 14px ${T.primary}40`}}><Plus size={16} strokeWidth={2.6}/>Aggiungi documento</button>
            </div>
          ) : (
            <div style={{padding:'14px 20px 100px',display:'flex',flexDirection:'column',gap:18}}>
              {(()=>{
                const grouped: Record<string, Documento[]> = {}
                ;(data.documenti||[]).forEach(d=>{ if(!grouped[d.cat]) grouped[d.cat]=[]; grouped[d.cat].push(d) })
                return Object.entries(grouped).map(([cat, docs])=>(
                  <div key={cat}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,paddingLeft:2}}>
                      <div style={{width:24,height:24,borderRadius:7,background:T.surfaceAlt,color:T.primary,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <CatIcon cat={cat} size={12}/>
                      </div>
                      <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:T.textDim}}>{cat}</div>
                      <div style={{fontSize:11,color:T.textFaint}}>{docs.length}</div>
                    </div>
                    <div style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:18,overflow:'hidden'}}>
                      {docs.map((doc,idx)=>(
                        <div key={doc.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderBottom:idx<docs.length-1?`1px solid ${T.borderSoft}`:'none'}}>
                          <div style={{width:38,height:38,borderRadius:10,background:doc.type==='link'?T.infoSoft:'#F3E8FF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            {doc.type==='link'?<Link2 size={16} color={T.info}/>:<File size={16} color="#7E22CE"/>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:14,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:T.text,letterSpacing:'-0.005em'}}>{doc.name}</div>
                            <div style={{fontSize:11.5,color:T.textDim,marginTop:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                              {doc.type==='link'?doc.url.replace(/^https?:\/\//,''):(doc.mime||'file')}
                              {doc.dayId&&(()=>{ const d=data.itinerary.find(x=>x.id===doc.dayId); return d?<span> · G{d.day} {d.title}</span>:null })()}
                            </div>
                            {doc.note&&<div style={{fontSize:11.5,color:T.textDim,fontStyle:'italic',marginTop:2}}>{doc.note}</div>}
                          </div>
                          <div style={{display:'flex',gap:2,flexShrink:0}}>
                            <button onClick={()=>openDoc(doc)} style={{border:'none',background:doc.type==='link'?T.infoSoft:'#F3E8FF',borderRadius:9,cursor:'pointer',width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center'}}>
                              {doc.type==='link'?<ExternalLink size={14} color={T.info}/>:<Download size={14} color="#7E22CE"/>}
                            </button>
                            <button onClick={()=>deleteDoc(doc.id)} style={{border:'none',background:'transparent',borderRadius:9,cursor:'pointer',width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={13} color={T.textFaint}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════
          NOTE
      ══════════════════════════════ */}
      {page==='note'&&(
        <div style={PAGE_STYLE}>
          <PageHeader
            title="Note"
            subtitle={`${data.notes.length} appunti rapidi`}
            action={<SearchBtn/>}
          />
          <div style={{padding:'14px 20px 16px',display:'flex',flexDirection:'column',gap:12}}>
            {data.notes.map(n=>(
              <div key={n.id} style={{background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,overflow:'hidden',position:'relative'}}>
                <div style={{position:'absolute',left:0,top:0,bottom:0,width:4,background:n.color}}/>
                <div style={{display:'flex',alignItems:'center',padding:'12px 14px 8px 18px',gap:10}}>
                  <input defaultValue={n.title} onBlur={e=>saveNote(n.id,'title',e.target.value)} style={{flex:1,border:'none',fontFamily:T.fontDisplay,fontSize:16,fontWeight:700,color:T.text,background:'transparent',outline:'none',letterSpacing:'-0.01em'}}/>
                  <button onClick={()=>deleteNote(n.id)} style={{background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center'}}><Trash2 size={14} color={T.textFaint}/></button>
                </div>
                <textarea defaultValue={n.text} onBlur={e=>saveNote(n.id,'text',e.target.value)} style={{width:'100%',border:'none',borderTop:`1px solid ${T.borderSoft}`,fontFamily:T.fontBody,fontSize:13.5,color:T.text,padding:'12px 18px',background:T.bg,resize:'none',minHeight:88,lineHeight:1.55,boxSizing:'border-box',outline:'none'}}/>
              </div>
            ))}
          </div>
          <div style={{height:100}}/>
          <button onClick={addNote} style={{position:'fixed',bottom:'calc(110px + env(safe-area-inset-bottom,0px))',right:'max(24px, calc(50vw - 280px))',width:56,height:56,background:T.primary,color:'#fff',border:'none',borderRadius:'50%',cursor:'pointer',boxShadow:T.shadowHero,display:'flex',alignItems:'center',justifyContent:'center',zIndex:150,transition:'transform .15s'}}><Plus size={24} strokeWidth={2.5}/></button>
        </div>
      )}

      {/* ══ BOTTOM NAV — floating glass ══ */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,maxWidth:600,margin:'0 auto',zIndex:1100,paddingBottom:'env(safe-area-inset-bottom,0px)',pointerEvents:'none',background:`linear-gradient(to top,${T.bg} 50%,${T.bg}00)`}}>
        <nav style={{margin:'12px 14px 14px',background:T.surfaceDark,display:'flex',borderRadius:22,padding:'8px 6px',boxShadow:T.shadowLg,pointerEvents:'auto'}}>
          {navItems.map(({id,icon,lbl})=>{
            const active = page===id
            return (
              <button key={id} onClick={()=>setPage(id)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:active?'8px 4px 7px':'9px 4px 8px',border:'none',background:active?'rgba(240,198,84,.12)':'transparent',color:active?T.goldBright:'#807464',fontFamily:T.fontBody,fontSize:9,fontWeight:700,letterSpacing:'.04em',textTransform:'uppercase',cursor:'pointer',gap:3,borderRadius:14,position:'relative',transition:'all .2s'}}>
                {icon}
                <span style={{opacity:active?1:.85}}>{lbl}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* ══ SEARCH OVERLAY ══ */}
      {searchOpen&&(
        <div style={{position:'fixed',inset:0,background:T.bg,zIndex:1200,display:'flex',flexDirection:'column',maxWidth:600,margin:'0 auto',animation:'fadeIn .15s ease-out'}}>
          <div style={{padding:'14px 16px',display:'flex',gap:10,alignItems:'center',background:T.surface,borderBottom:`1px solid ${T.border}`}}>
            <Search size={18} color={T.textDim}/>
            <input autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Cerca voci, attività, note…" style={{flex:1,border:'none',background:'transparent',color:T.text,fontFamily:T.fontBody,fontSize:15,outline:'none'}}/>
            <button onClick={()=>{setSearchOpen(false);setSearchQ('')}} style={{background:T.surfaceAlt,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,borderRadius:10,width:34,height:34}}><X size={16} color={T.text}/></button>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {!searchQ.trim() ? (
              <div style={{padding:'60px 24px',textAlign:'center',color:T.textDim,display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
                <div style={{width:64,height:64,borderRadius:20,background:T.surfaceAlt,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Search size={28} color={T.borderStrong} strokeWidth={1.5}/>
                </div>
                <div style={{fontSize:14,maxWidth:240,lineHeight:1.5}}>Cerca tra checklist, itinerario, note e documenti</div>
              </div>
            ) : searchResults && (
              <div style={{padding:'8px 20px 80px'}}>
                {searchResults.items.length>0&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:T.textDim,padding:'10px 4px 8px',display:'flex',alignItems:'center',gap:6}}><CheckSquare size={12}/>Checklist · {searchResults.items.length}</div>
                    <div style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:16,overflow:'hidden'}}>
                      {searchResults.items.map((item,idx)=>(
                        <button key={item.id} onClick={()=>{setPage('checklist');setFilter('Tutto');setSearchOpen(false);setSearchQ('')}} style={{width:'100%',background:'none',border:'none',borderBottom:idx<searchResults.items.length-1?`1px solid ${T.borderSoft}`:'none',padding:'11px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left',fontFamily:T.fontBody}}>
                          <CatBadge cat={item.cat} size="sm"/>
                          <div style={{flex:1,fontSize:13.5,fontWeight:500,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:T.text}}>{item.voce}</div>
                          {item.costo>0&&<span style={{fontSize:12,fontWeight:600,color:T.success,fontVariantNumeric:'tabular-nums'}}>{fmtEur(item.costo)}</span>}
                          <ChevronRight size={14} color={T.textFaint}/>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {searchResults.days.length>0&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:T.textDim,padding:'10px 4px 8px',display:'flex',alignItems:'center',gap:6}}><Calendar size={12}/>Itinerario · {searchResults.days.length}</div>
                    <div style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:16,overflow:'hidden'}}>
                      {searchResults.days.map((day,idx)=>(
                        <button key={day.id} onClick={()=>{setPage('itinerario');setOpenDays(new Set([day.id]));setSearchOpen(false);setSearchQ('')}} style={{width:'100%',background:'none',border:'none',borderBottom:idx<searchResults.days.length-1?`1px solid ${T.borderSoft}`:'none',padding:'11px 14px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',textAlign:'left',fontFamily:T.fontBody}}>
                          <div style={{background:T.surfaceDark,color:T.goldBright,borderRadius:8,padding:'3px 8px',fontFamily:T.fontDisplay,fontSize:12.5,fontWeight:700,flexShrink:0}}>G{day.day}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13.5,fontWeight:600,color:T.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{day.title}</div>
                            <div style={{fontSize:11.5,color:T.textDim,display:'flex',alignItems:'center',gap:3,marginTop:2}}><MapPin size={9}/>{day.place}</div>
                          </div>
                          <ChevronRight size={14} color={T.textFaint}/>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {searchResults.notes.length>0&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:T.textDim,padding:'10px 4px 8px',display:'flex',alignItems:'center',gap:6}}><StickyNote size={12}/>Note · {searchResults.notes.length}</div>
                    <div style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:16,overflow:'hidden'}}>
                      {searchResults.notes.map((note,idx)=>(
                        <button key={note.id} onClick={()=>{setPage('note');setSearchOpen(false);setSearchQ('')}} style={{width:'100%',background:'none',border:'none',borderBottom:idx<searchResults.notes.length-1?`1px solid ${T.borderSoft}`:'none',padding:'11px 14px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',textAlign:'left',fontFamily:T.fontBody}}>
                          <div style={{width:10,height:10,borderRadius:99,background:note.color,flexShrink:0}}/>
                          <div style={{flex:1,fontSize:13.5,fontWeight:600,color:T.text}}>{note.title}</div>
                          <ChevronRight size={14} color={T.textFaint}/>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {searchResults.docs.length>0&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:T.textDim,padding:'10px 4px 8px',display:'flex',alignItems:'center',gap:6}}><FolderOpen size={12}/>Documenti · {searchResults.docs.length}</div>
                    <div style={{background:T.surface,border:`1px solid ${T.borderSoft}`,boxShadow:T.shadowSm,borderRadius:16,overflow:'hidden'}}>
                      {searchResults.docs.map((doc,idx)=>(
                        <button key={doc.id} onClick={()=>{setPage('documenti');setSearchOpen(false);setSearchQ('')}} style={{width:'100%',background:'none',border:'none',borderBottom:idx<searchResults.docs.length-1?`1px solid ${T.borderSoft}`:'none',padding:'11px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left',fontFamily:T.fontBody}}>
                          {doc.type==='link'?<Link2 size={14} color={T.info}/>:<File size={14} color="#7E22CE"/>}
                          <div style={{flex:1,fontSize:13.5,fontWeight:500,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:T.text}}>{doc.name}</div>
                          <CatBadge cat={doc.cat} size="sm"/>
                          <ChevronRight size={14} color={T.textFaint}/>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {searchResults.items.length===0&&searchResults.days.length===0&&searchResults.notes.length===0&&searchResults.docs.length===0&&(
                  <div style={{padding:'48px 24px',textAlign:'center',color:T.textDim,display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
                    <div style={{fontSize:32}}>🔍</div>
                    <div style={{fontSize:14}}>Nessun risultato per <strong style={{color:T.text}}>"{searchQ}"</strong></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODALS ══ */}
      {addModal&&(
        <Modal title="Aggiungi voce" onClose={()=>setAddModal(false)}>
          <FG label="Voce / Attività"><input style={inputStyle} value={fVoce} onChange={e=>setFVoce(e.target.value)} placeholder="es. Volo Lima – Cusco"/></FG>
          <FRow><FRowItem label="Sezione"><select style={inputStyle} value={fSec} onChange={e=>setFSec(e.target.value)}>{SECTIONS.map(s=><option key={s}>{s}</option>)}</select></FRowItem><FRowItem label="Categoria"><select style={inputStyle} value={fCat} onChange={e=>setFCat(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></FRowItem></FRow>
          <FRow><FRowItem label="Data"><input style={inputStyle} type="date" value={fGiorno} onChange={e=>setFGiorno(e.target.value)}/></FRowItem><FRowItem label="Costo €/pers."><input style={inputStyle} type="number" value={fCosto} onChange={e=>setFCosto(e.target.value)} placeholder="0"/></FRowItem></FRow>
          <FG label="Quando prenotare"><select style={inputStyle} value={fQuando} onChange={e=>setFQuando(e.target.value)}>{QUANDO_OPTS.map(o=><option key={o}>{o}</option>)}</select></FG>
          <FG label="Note"><textarea style={{...inputStyle,minHeight:72,resize:'none'}} value={fNote} onChange={e=>setFNote(e.target.value)}/></FG>
          <div style={{margin:'12px 24px 0',background:T.successSoft,border:`1px solid #BBF7D0`,borderRadius:12,padding:'13px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}><input type="checkbox" id="fcanc" checked={fCanc} onChange={e=>setFCanc(e.target.checked)} style={{width:18,height:18,accentColor:T.success,cursor:'pointer'}}/><label htmlFor="fcanc" style={{fontSize:13.5,fontWeight:600,color:T.success,cursor:'pointer'}}>Cancellazione gratuita</label></div>
            {fCanc&&<input style={{...inputStyle,marginTop:10,border:`1px solid #6EE7B7`}} type="date" value={fCancDate} onChange={e=>setFCancDate(e.target.value)}/>}
          </div>
          <div style={{display:'flex',gap:10,padding:'16px 24px 0'}}><button style={btnSecondary} onClick={()=>setAddModal(false)}>Annulla</button><button style={btnPrimary} onClick={saveNewItem}>Aggiungi</button></div>
        </Modal>
      )}
      {editModal&&(
        <Modal title="Modifica voce" onClose={()=>setEditModal(null)}>
          <FG label="Voce / Attività"><input style={inputStyle} value={eVoce} onChange={e=>setEVoce(e.target.value)}/></FG>
          <FRow><FRowItem label="Sezione"><select style={inputStyle} value={eSec} onChange={e=>setESec(e.target.value)}>{SECTIONS.map(s=><option key={s}>{s}</option>)}</select></FRowItem><FRowItem label="Categoria"><select style={inputStyle} value={eCat} onChange={e=>setECat(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></FRowItem></FRow>
          <FRow><FRowItem label="Data"><input style={inputStyle} type="date" value={eGiorno} onChange={e=>setEGiorno(e.target.value)}/></FRowItem><FRowItem label="Costo €/pers."><input style={inputStyle} type="number" value={eCosto} onChange={e=>setECosto(e.target.value)}/></FRowItem></FRow>
          <FG label="Quando prenotare"><select style={inputStyle} value={eQuando} onChange={e=>setEQuando(e.target.value)}>{QUANDO_OPTS.map(o=><option key={o}>{o}</option>)}</select></FG>
          <FG label="Note"><textarea style={{...inputStyle,minHeight:72,resize:'none'}} value={eNote} onChange={e=>setENote(e.target.value)}/></FG>
          <div style={{margin:'12px 24px 0',background:T.successSoft,border:`1px solid #BBF7D0`,borderRadius:12,padding:'13px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}><input type="checkbox" id="ecanc" checked={eCanc} onChange={e=>setECanc(e.target.checked)} style={{width:18,height:18,accentColor:T.success,cursor:'pointer'}}/><label htmlFor="ecanc" style={{fontSize:13.5,fontWeight:600,color:T.success,cursor:'pointer'}}>Cancellazione gratuita</label></div>
            {eCanc&&<input style={{...inputStyle,marginTop:10,border:`1px solid #6EE7B7`}} type="date" value={eCancDate} onChange={e=>setECancDate(e.target.value)}/>}
          </div>
          <div style={{display:'flex',gap:10,padding:'16px 24px 0'}}><button style={btnSecondary} onClick={()=>setEditModal(null)}>Annulla</button><button style={btnPrimary} onClick={saveEdit}>Salva</button></div>
        </Modal>
      )}
      {actModal!==null&&(
        <Modal title={`Nuova attività · G${data.itinerary.find(d=>d.id===actModal)?.day}`} onClose={()=>setActModal(null)}>
          <FG label="Titolo"><input style={inputStyle} value={aTitle} onChange={e=>setATitle(e.target.value)} placeholder="es. Visita Machu Picchu"/></FG>
          <FRow><FRowItem label="Ora"><input style={inputStyle} type="time" value={aTime} onChange={e=>setATime(e.target.value)}/></FRowItem><FRowItem label="Tipo"><select style={inputStyle} value={aType} onChange={e=>setAType(e.target.value)}>{ACT_TYPES.map(t=><option key={t}>{t}</option>)}</select></FRowItem></FRow>
          <FG label="Note"><input style={inputStyle} value={aNote} onChange={e=>setANote(e.target.value)} placeholder="es. Portare acqua"/></FG>
          <div style={{display:'flex',gap:10,padding:'16px 24px 0'}}><button style={btnSecondary} onClick={()=>setActModal(null)}>Annulla</button><button style={btnPrimary} onClick={saveActivity}>Aggiungi</button></div>
        </Modal>
      )}
      {dayModal&&(
        <Modal title="Nuovo giorno" onClose={()=>setDayModal(false)}>
          <FG label="Titolo"><input style={inputStyle} value={dTitle} onChange={e=>setDTitle(e.target.value)} placeholder="es. Arequipa – Città Bianca"/></FG>
          <FRow><FRowItem label="Data"><input style={inputStyle} type="date" value={dDate} onChange={e=>setDDate(e.target.value)}/></FRowItem><FRowItem label="N° Giorno"><input style={inputStyle} type="number" value={dNum} onChange={e=>setDNum(e.target.value)}/></FRowItem></FRow>
          <FRow>
            <FRowItem label="Luogo (pin mappa)"><select style={inputStyle} value={dPlace} onChange={e=>setDPlace(e.target.value)}><option value="">— Seleziona —</option>{Object.keys(PLACE_COORDS).sort().map(p=><option key={p} value={p}>{p}</option>)}</select></FRowItem>
            <FRowItem label="Alloggio"><input style={inputStyle} value={dHotel} onChange={e=>setDHotel(e.target.value)} placeholder="es. Hostal"/></FRowItem>
          </FRow>
          <div style={{display:'flex',gap:10,padding:'16px 24px 0'}}><button style={btnSecondary} onClick={()=>setDayModal(false)}>Annulla</button><button style={btnPrimary} onClick={saveDay}>Aggiungi</button></div>
        </Modal>
      )}
      {editDayModal&&(
        <Modal title={`Modifica G${editDayModal.day}`} onClose={()=>setEditDayModal(null)}>
          <FG label="Titolo"><input style={inputStyle} value={dTitle} onChange={e=>setDTitle(e.target.value)}/></FG>
          <FRow><FRowItem label="Data"><input style={inputStyle} type="date" value={dDate} onChange={e=>setDDate(e.target.value)}/></FRowItem><FRowItem label="N° Giorno"><input style={inputStyle} type="number" value={dNum} onChange={e=>setDNum(e.target.value)}/></FRowItem></FRow>
          <FRow>
            <FRowItem label="Luogo (pin mappa)"><select style={inputStyle} value={dPlace} onChange={e=>setDPlace(e.target.value)}><option value="">— Seleziona —</option>{Object.keys(PLACE_COORDS).sort().map(p=><option key={p} value={p}>{p}</option>)}</select></FRowItem>
            <FRowItem label="Alloggio"><input style={inputStyle} value={dHotel} onChange={e=>setDHotel(e.target.value)}/></FRowItem>
          </FRow>
          <div style={{display:'flex',gap:10,padding:'16px 24px 0'}}><button style={btnSecondary} onClick={()=>setEditDayModal(null)}>Annulla</button><button style={btnPrimary} onClick={saveEditDay}>Salva</button></div>
        </Modal>
      )}
      {editActModal!==null&&(
        <Modal title="Modifica attività" onClose={()=>setEditActModal(null)}>
          <FG label="Titolo"><input style={inputStyle} value={aTitle} onChange={e=>setATitle(e.target.value)}/></FG>
          <FRow><FRowItem label="Ora"><input style={inputStyle} type="time" value={aTime} onChange={e=>setATime(e.target.value)}/></FRowItem><FRowItem label="Tipo"><select style={inputStyle} value={aType} onChange={e=>setAType(e.target.value)}>{ACT_TYPES.map(t=><option key={t}>{t}</option>)}</select></FRowItem></FRow>
          <FG label="Note"><input style={inputStyle} value={aNote} onChange={e=>setANote(e.target.value)}/></FG>
          <div style={{display:'flex',gap:10,padding:'16px 24px 0'}}><button style={btnSecondary} onClick={()=>setEditActModal(null)}>Annulla</button><button style={btnPrimary} onClick={saveEditActivity}>Salva</button></div>
        </Modal>
      )}
      {docModal&&(
        <Modal title="Nuovo documento" onClose={()=>setDocModal(false)}>
          <div style={{display:'flex',margin:'12px 24px 0',background:T.surfaceAlt,borderRadius:12,padding:3,gap:3}}>
            {(['link','file'] as const).map(t=>(
              <button key={t} onClick={()=>setDDocType(t)} style={{flex:1,padding:'10px 0',border:'none',borderRadius:9,background:dDocType===t?T.surface:'transparent',color:dDocType===t?T.text:T.textDim,fontFamily:T.fontBody,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,boxShadow:dDocType===t?'0 1px 3px rgba(0,0,0,.08)':'none',transition:'all .15s'}}>
                {t==='link'?<><Link2 size={14}/>Link URL</>:<><File size={14}/>File caricato</>}
              </button>
            ))}
          </div>
          {dDocType==='link' ? (
            <FG label="URL Prenotazione / Conferma"><input style={inputStyle} type="url" value={dDocUrl} onChange={e=>setDDocUrl(e.target.value)} placeholder="https://booking.com/..."/></FG>
          ) : (
            <FG label="Carica file (max 500KB)"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={handleFileUpload} style={{...inputStyle,padding:'10px'}}/></FG>
          )}
          <FG label="Nome / Titolo"><input style={inputStyle} value={dDocName} onChange={e=>setDDocName(e.target.value)} placeholder="es. Conferma volo Roma–Lima"/></FG>
          <FRow><FRowItem label="Categoria"><select style={inputStyle} value={dDocCat} onChange={e=>setDDocCat(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></FRowItem><FRowItem label="Giorno itinerario"><select style={inputStyle} value={dDocDayId??''} onChange={e=>setDDocDayId(e.target.value?parseInt(e.target.value):undefined)}><option value="">— Nessuno —</option>{[...data.itinerary].sort((a,b)=>a.day-b.day).map(d=><option key={d.id} value={d.id}>G{d.day} · {d.title}</option>)}</select></FRowItem></FRow>
          <FG label="Note (opzionale)"><input style={inputStyle} value={dDocNote} onChange={e=>setDDocNote(e.target.value)} placeholder="es. Codice: ABC123"/></FG>
          <div style={{display:'flex',gap:10,padding:'16px 24px 0'}}><button style={btnSecondary} onClick={()=>setDocModal(false)}>Annulla</button><button style={btnPrimary} onClick={saveDoc}>Salva</button></div>
        </Modal>
      )}
    </div>
  )
}
