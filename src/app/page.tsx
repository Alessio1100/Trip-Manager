'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  Home, CheckSquare, Calendar, Wallet, StickyNote,
  Plane, Hotel, Bus, Car, Ticket, FileText, Heart, Utensils, MoreHorizontal,
  AlertCircle, Clipboard, Bed, Navigation, Star, Coffee,
  ChevronDown, Plus, Pencil, Trash2, RefreshCw, ArrowUp,
  MapPin, Clock, ChevronRight, Search, Map, FolderOpen,
  ExternalLink, File, X, Download, Link2,
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

/* ─── CONSTANTS ─── */
const CAT_COLORS: Record<string,string> = {Voli:'#3B82F6',Hotel:'#EC4899',Bus:'#10B981',Trasporti:'#F59E0B',Tour:'#8B5CF6',Ingressi:'#F97316',Documenti:'#6B7280',Salute:'#14B8A6',Homestay:'#EAB308',Cibo:'#F97316',Varie:'#22C55E'}
const NOTE_COLORS  = ['#10B981','#3B82F6','#F59E0B','#8B5CF6','#EC4899','#EF4444','#14B8A6']
const SECTIONS     = ['PUNTI CRITICI','BUROCRAZIA','ALLOGGI','TRASPORTI','TOUR','QUOTIDIANO']
const CATS         = ['Voli','Hotel','Bus','Trasporti','Tour','Ingressi','Documenti','Salute','Homestay','Cibo','Varie']
const QUANDO_OPTS  = ['SUBITO','Prima di partire','Online','In loco','In loco/Online','In loco/Tour','Online/Agenzia']
const ACT_TYPES    = ['👣 Visita','🍽 Pasto','🚌 Trasporto','🛏 Alloggio','🎫 Ingresso','🥾 Trek','📷 Foto','✈️ Volo','🚂 Treno','💤 Riposo']
const TRIP_START   = '2026-07-25'
const TRIP_END     = '2026-08-06'

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
}

/* ─── WEATHER UTILS ─── */
function wEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2)  return code === 1 ? '🌤' : '⛅'
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
  if (code === 1) return 'Prevalente sereno'
  if (code === 2) return 'Parzialmente nuvoloso'
  if (code === 3) return 'Coperto'
  if (code === 45 || code === 48) return 'Nebbia'
  if (code >= 51 && code <= 55)   return 'Pioggerella'
  if (code >= 61 && code <= 65)   return 'Pioggia'
  if (code >= 71 && code <= 75)   return 'Neve'
  if (code >= 80 && code <= 82)   return 'Rovesci'
  if (code >= 95)                 return 'Temporale'
  return 'Variabile'
}

/* ─── SMALL COMPONENTS ─── */
const SectionIcon = ({sec,size=13}:{sec:string,size?:number}) => {
  const p = {size,strokeWidth:2}
  if (sec==='PUNTI CRITICI') return <AlertCircle {...p} color="#991B1B"/>
  if (sec==='BUROCRAZIA')    return <Clipboard   {...p} color="#92400E"/>
  if (sec==='ALLOGGI')       return <Bed         {...p} color="#9D174D"/>
  if (sec==='TRASPORTI')     return <Navigation  {...p} color="#92400E"/>
  if (sec==='TOUR')          return <Ticket      {...p} color="#5B21B6"/>
  return <Coffee {...p} color="#9A3412"/>
}
const CatIcon = ({cat}:{cat:string}) => {
  const p = {size:11,strokeWidth:2}
  if (cat==='Voli')      return <Plane        {...p}/>
  if (cat==='Hotel')     return <Hotel        {...p}/>
  if (cat==='Bus')       return <Bus          {...p}/>
  if (cat==='Trasporti') return <Car          {...p}/>
  if (cat==='Tour')      return <Star         {...p}/>
  if (cat==='Ingressi')  return <Ticket       {...p}/>
  if (cat==='Documenti') return <FileText     {...p}/>
  if (cat==='Salute')    return <Heart        {...p}/>
  if (cat==='Homestay')  return <Home         {...p}/>
  if (cat==='Cibo')      return <Utensils     {...p}/>
  return <MoreHorizontal {...p}/>
}

function fmtDate(s:string){ if(!s) return '—'; const d=new Date(s+'T00:00:00'); return d.toLocaleDateString('it-IT',{day:'2-digit',month:'short'}) }
function fmtEur(n:number){ return '€ '+Number(n).toLocaleString('it-IT') }

const CAT_BADGE_COLORS: Record<string,{bg:string,color:string}> = {
  Voli:{bg:'#DBEAFE',color:'#1E40AF'},Hotel:{bg:'#FCE7F3',color:'#9D174D'},Bus:{bg:'#D1FAE5',color:'#065F46'},
  Trasporti:{bg:'#FEF3C7',color:'#92400E'},Tour:{bg:'#EDE9FE',color:'#5B21B6'},Ingressi:{bg:'#FFEDD5',color:'#9A3412'},
  Documenti:{bg:'#F3F4F6',color:'#374151'},Salute:{bg:'#ECFDF5',color:'#065F46'},Homestay:{bg:'#FEF9C3',color:'#713F12'},
  Cibo:{bg:'#FFF7ED',color:'#9A3412'},Varie:{bg:'#F0FDF4',color:'#166534'},
}
function CatBadge({cat}:{cat:string}){
  const c = CAT_BADGE_COLORS[cat]||{bg:'#eee',color:'#333'}
  return <span style={{background:c.bg,color:c.color,padding:'2px 8px',borderRadius:99,fontSize:'.7rem',fontWeight:600,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:4}}><CatIcon cat={cat}/>{cat}</span>
}
function QBadge({q}:{q:string}){
  const styles: Record<string,{bg:string,color:string}> = {'SUBITO':{bg:'#FEE2E2',color:'#991B1B'},'Prima di partire':{bg:'#FEF3C7',color:'#92400E'}}
  const c = q.includes('Online')?{bg:'#DBEAFE',color:'#1E40AF'}: styles[q]||{bg:'#F3F4F6',color:'#374151'}
  return <span style={{background:c.bg,color:c.color,padding:'2px 8px',borderRadius:4,fontSize:'.7rem',fontWeight:600}}>{q}</span>
}
function CancBadge({item}:{item:Item}){
  if(!item.cancGratuita) return null
  if(!item.cancScadenza) return <span style={{background:'#DCFCE7',color:'#166534',padding:'2px 9px',borderRadius:99,fontSize:'.7rem',fontWeight:600}}>Canc. gratuita</span>
  const oggi=new Date(); oggi.setHours(0,0,0,0)
  const diff=Math.ceil((new Date(item.cancScadenza+'T00:00:00').getTime()-oggi.getTime())/86400000)
  if(diff<0)  return <span style={{background:'#FEE2E2',color:'#991B1B',padding:'2px 9px',borderRadius:99,fontSize:'.7rem',fontWeight:600}}>Scaduta {fmtDate(item.cancScadenza)}</span>
  if(diff<=7) return <span style={{background:'#FEF9C3',color:'#713F12',padding:'2px 9px',borderRadius:99,fontSize:'.7rem',fontWeight:600}}>Scade tra {diff}g</span>
  return <span style={{background:'#DCFCE7',color:'#166534',padding:'2px 9px',borderRadius:99,fontSize:'.7rem',fontWeight:600}}>Canc. fino al {fmtDate(item.cancScadenza)}</span>
}

function Modal({title,children,onClose}:{title:string,children:React.ReactNode,onClose:()=>void}){
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:500,display:'flex',alignItems:'flex-end'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'#FAF6EE',borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'92dvh',overflowY:'auto',paddingBottom:'calc(16px + env(safe-area-inset-bottom,0px))'}}>
        <div style={{width:36,height:4,background:'#D4C4A0',borderRadius:99,margin:'12px auto 14px'}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:'1.15rem',padding:'0 20px 13px',borderBottom:'1px solid #D4C4A0',marginBottom:2}}>{title}</div>
        {children}
      </div>
    </div>
  )
}

const FG = ({label,children}:{label:string,children:React.ReactNode}) => (
  <div style={{padding:'10px 20px 0'}}>
    <label style={{display:'block',fontSize:'.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'#7A6845',marginBottom:5}}>{label}</label>
    {children}
  </div>
)
const inputStyle: React.CSSProperties = {width:'100%',border:'1.5px solid #D4C4A0',borderRadius:10,padding:'12px 13px',fontFamily:"'DM Sans',sans-serif",fontSize:'.92rem',color:'#2C2012',background:'#fff',WebkitAppearance:'none',minHeight:44,boxSizing:'border-box'}
const FRow = ({children}:{children:React.ReactNode}) => <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px',padding:'10px 20px 0'}}>{children}</div>
const FRowItem = ({label,children}:{label:string,children:React.ReactNode}) => (
  <div><label style={{display:'block',fontSize:'.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'#7A6845',marginBottom:5}}>{label}</label>{children}</div>
)

/* ─── DYNAMIC MAP ─── */
const MapLeafletDynamic = dynamic(() => import('@/components/MapLeaflet'), {
  ssr: false,
  loading: () => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#7A6845',fontSize:'.9rem',flexDirection:'column',gap:10}}>
      <Map size={30} color="#D4C4A0"/>
      <span>Caricamento mappa…</span>
    </div>
  ),
})

/* ══════════════════════════════
   MAIN APP
══════════════════════════════ */
export default function App() {
  /* core */
  const [data, setData]       = useState<AppData|null>(null)
  const [page, setPage]       = useState<PageId>('dashboard')
  const [filter, setFilter]   = useState('Tutto')
  const [openDays, setOpenDays] = useState<Set<number>>(new Set())
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState('')
  const saveTimeout = useRef<ReturnType<typeof setTimeout>|null>(null)

  /* modals */
  const [addModal,  setAddModal]  = useState(false)
  const [editModal, setEditModal] = useState<Item|null>(null)
  const [actModal,  setActModal]  = useState<number|null>(null)
  const [dayModal,  setDayModal]  = useState(false)

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

  /* ── SEARCH RESULTS (hook must be before any early return) ── */
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
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh',flexDirection:'column',gap:12,background:'#1A1208',color:'#E8B84B',fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{fontSize:'2rem'}}>🦙</div>
      <div style={{fontSize:'.9rem',color:'#aaa'}}>Caricamento Perù 2026…</div>
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

  /* ── NOTE ACTIONS ── */
  const saveNote  = (id:number, field:'title'|'text', val:string) => save({...data, notes: data.notes.map(n=>n.id===id?{...n,[field]:val}:n)})
  const deleteNote = (id:number) => { if(!confirm('Eliminare?')) return; save({...data, notes: data.notes.filter(n=>n.id!==id)}) }
  const addNote   = () => save({...data, notes:[...data.notes,{id:data.nextId,title:'Nuova nota',color:NOTE_COLORS[data.notes.length%NOTE_COLORS.length],text:''}], nextId:data.nextId+1})

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

  const oggi      = new Date(); oggi.setHours(0,0,0,0)
  const startDate = new Date(TRIP_START+'T00:00:00')
  const endDate   = new Date(TRIP_END+'T00:00:00')
  const daysToGo  = Math.ceil((startDate.getTime()-oggi.getTime())/86400000)
  const inViaggio = oggi>=startDate && oggi<=endDate
  const finito    = oggi>endDate

  const prossimoAlloggio = [...data.items].filter(i=>i.section==='ALLOGGI'&&!i.done&&i.giorno).sort((a,b)=>a.giorno.localeCompare(b.giorno))[0]
  const prossimoGiorno   = [...data.itinerary].sort((a,b)=>a.day-b.day).find(d=>!d.date||new Date(d.date+'T00:00:00')>=oggi) || [...data.itinerary].sort((a,b)=>a.day-b.day)[0]
  const daFare           = SECTIONS.filter(s=>s!=='QUOTIDIANO').map(sec=>({sec,count:data.items.filter(i=>i.section===sec&&!i.done).length})).filter(x=>x.count>0)

  /* ── STYLES ── */
  const S = {
    page: {height:'calc(100dvh - 62px - env(safe-area-inset-bottom,0px))',overflowY:'auto' as const,WebkitOverflowScrolling:'touch' as const},
    hdr:  {background:'#1A1208',color:'#fff',padding:'14px 16px',position:'sticky' as const,top:0,zIndex:50},
    hdrT: {fontFamily:"'Playfair Display',serif",fontSize:'1.2rem',color:'#E8B84B'},
    hdrS: {fontSize:'.74rem',color:'#aaa',marginTop:2},
    card: {margin:'0 16px 8px',background:'#fff',borderRadius:12,border:'1px solid #D4C4A0',overflow:'hidden'},
    btn:  {flex:1,background:'#1A1208',border:'none',borderRadius:12,padding:14,fontFamily:"'DM Sans',sans-serif",fontSize:'.9rem',fontWeight:700,color:'#E8B84B',cursor:'pointer'} as React.CSSProperties,
    btnC: {flex:1,background:'#F0E8D0',border:'1.5px solid #D4C4A0',borderRadius:12,padding:14,fontFamily:"'DM Sans',sans-serif",fontSize:'.9rem',fontWeight:600,color:'#7A6845',cursor:'pointer'} as React.CSSProperties,
    iBtn: {border:'none',background:'#F0E8D0',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'} as React.CSSProperties,
  }

  const searchBtn = (
    <button onClick={()=>setSearchOpen(true)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',padding:'4px 6px',borderRadius:8}}>
      <Search size={17} color="#E8B84B"/>
    </button>
  )

  const goToChecklist = (cat?:string) => { if(cat) setFilter(cat); setPage('checklist') }

  const navItems: {id:PageId; icon:React.ReactNode; lbl:string}[] = [
    {id:'dashboard',  icon:<Home        size={19} strokeWidth={page==='dashboard'  ?2.5:1.5}/>, lbl:'Home'},
    {id:'checklist',  icon:<CheckSquare size={19} strokeWidth={page==='checklist'  ?2.5:1.5}/>, lbl:'Lista'},
    {id:'mappa',      icon:<Map         size={19} strokeWidth={page==='mappa'      ?2.5:1.5}/>, lbl:'Mappa'},
    {id:'itinerario', icon:<Calendar    size={19} strokeWidth={page==='itinerario' ?2.5:1.5}/>, lbl:'Giorni'},
    {id:'budget',     icon:<Wallet      size={19} strokeWidth={page==='budget'     ?2.5:1.5}/>, lbl:'Budget'},
    {id:'documenti',  icon:<FolderOpen  size={19} strokeWidth={page==='documenti'  ?2.5:1.5}/>, lbl:'Docs'},
    {id:'note',       icon:<StickyNote  size={19} strokeWidth={page==='note'       ?2.5:1.5}/>, lbl:'Note'},
  ]

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:'#FAF6EE',color:'#2C2012',maxWidth:600,margin:'0 auto'}}>
      {syncing && <div style={{position:'fixed',top:0,left:0,right:0,height:3,background:'#E8B84B',zIndex:999}}/>}

      {/* ══════════════════════════════
          DASHBOARD
      ══════════════════════════════ */}
      {page==='dashboard'&&(
        <div style={S.page}>
          <div style={S.hdr}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div style={S.hdrT}>🦙 Perù 2026</div>
              <div style={{display:'flex',alignItems:'center',gap:4,marginTop:2}}>
                {searchBtn}
                <span style={{display:'flex',alignItems:'center',gap:4,fontSize:'.72rem',color:syncing?'#E8B84B':'#555'}}>
                  {syncing?<><ArrowUp size={10}/>sync…</>:<><RefreshCw size={10}/>{lastSync}</>}
                </span>
              </div>
            </div>
            <div style={S.hdrS}>25 lug – 6 ago · 13 notti · 2 persone</div>
          </div>

          {/* COUNTDOWN HERO */}
          <div style={{margin:'16px 16px 12px',background:'linear-gradient(135deg,#1A1208,#2A1A08)',borderRadius:16,padding:'24px 22px',color:'#fff',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:'rgba(201,153,42,.12)'}}/>
            {finito ? (
              <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:'2rem',fontWeight:700,color:'#E8B84B'}}>Viaggio terminato</div><div style={{fontSize:'.85rem',color:'#aaa',marginTop:4}}>Speriamo sia andato bene! 🦙</div></div>
            ) : inViaggio ? (
              <div><div style={{fontSize:'.7rem',color:'#aaa',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>Sei in viaggio!</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:'2rem',fontWeight:700,color:'#E8B84B'}}>Buon Perù! ✈️</div><div style={{fontSize:'.82rem',color:'#ccc',marginTop:4}}>Finisce il {fmtDate(TRIP_END)}</div></div>
            ) : (
              <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:'.7rem',color:'#aaa',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>Alla partenza</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:'3.2rem',fontWeight:700,color:'#E8B84B',lineHeight:1}}>{daysToGo}</div>
                  <div style={{fontSize:'.85rem',color:'#ccc',marginTop:4}}>giorni · {fmtDate(TRIP_START)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'.7rem',color:'#aaa',marginBottom:4}}>Checklist</div>
                  <div style={{fontSize:'1.3rem',fontWeight:700,color:'#fff'}}>{doneCount}<span style={{fontSize:'.8rem',color:'#888',fontWeight:400}}>/{data.items.length}</span></div>
                  <div style={{fontSize:'.7rem',color:'#aaa',marginTop:2}}>{Math.round(doneCount/data.items.length*100)}% fatto</div>
                </div>
              </div>
            )}
          </div>

          {/* METEO ATTUALE */}
          {currentWeather && (
            <div style={{margin:'0 16px 12px',background:'#fff',borderRadius:14,border:'1px solid #D4C4A0',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{fontSize:'1.9rem',lineHeight:1}}>{wEmoji(currentWeather.code)}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:'.88rem',fontWeight:700,color:'#2C2012'}}>{currentWeather.temp}° · {wDesc(currentWeather.code)}</div>
                <div style={{fontSize:'.72rem',color:'#7A6845',marginTop:3,display:'flex',alignItems:'center',gap:3}}><MapPin size={9}/>{currentWeather.loc}</div>
              </div>
              <div style={{fontSize:'.62rem',color:'#aaa',textAlign:'right',lineHeight:1.5}}>Meteo<br/>attuale</div>
            </div>
          )}

          {/* BUDGET BAR */}
          <div style={{margin:'0 16px 12px',background:'#fff',borderRadius:14,border:'1px solid #D4C4A0',padding:'14px 16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'#7A6845',display:'flex',alignItems:'center',gap:5}}><Wallet size={13} color="#7A6845"/>Budget</div>
              <button onClick={()=>setPage('budget')} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:2,color:'#C9992A',fontSize:'.75rem',fontWeight:600}}>Dettagli<ChevronRight size={13}/></button>
            </div>
            <div style={{background:'#F0E8D0',borderRadius:99,height:8,overflow:'hidden',marginBottom:10}}>
              <div style={{display:'flex',height:8,borderRadius:99,overflow:'hidden'}}>
                <div style={{width:`${pagato/total*100}%`,background:'#22C55E',transition:'width .6s'}}/>
                <div style={{width:`${cancConf/total*100}%`,background:'#EAB308',transition:'width .6s'}}/>
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'.78rem'}}>
              <div style={{display:'flex',gap:12}}>
                <span style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:2,background:'#22C55E'}}/><span style={{color:'#555'}}>Pagato <strong>{fmtEur(pagato)}</strong></span></span>
                {cancConf>0&&<span style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:2,background:'#EAB308'}}/><span style={{color:'#555'}}>Canc. <strong>{fmtEur(cancConf)}</strong></span></span>}
              </div>
              <span style={{color:'#7A6845',fontWeight:600}}>{fmtEur(total)}</span>
            </div>
          </div>

          {/* DA PRENOTARE */}
          {daFare.length > 0 && (
            <div style={{margin:'0 16px 12px',background:'#fff',borderRadius:14,border:'1px solid #D4C4A0',overflow:'hidden'}}>
              <div style={{padding:'12px 16px 10px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #F0E8D0'}}>
                <div style={{fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'#7A6845',display:'flex',alignItems:'center',gap:5}}><CheckSquare size={13} color="#7A6845"/>Da prenotare</div>
                <button onClick={()=>goToChecklist()} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:2,color:'#C9992A',fontSize:'.75rem',fontWeight:600}}>Vedi tutto<ChevronRight size={13}/></button>
              </div>
              {daFare.map(({sec,count})=>(
                <button key={sec} onClick={()=>goToChecklist()} style={{width:'100%',background:'none',border:'none',borderBottom:'1px solid #F0E8D0',padding:'10px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left'}}>
                  <SectionIcon sec={sec} size={14}/>
                  <div style={{flex:1,fontSize:'.86rem',fontWeight:500,color:'#2C2012'}}>{sec.charAt(0)+sec.slice(1).toLowerCase()}</div>
                  <div style={{background:'#FEF3C7',color:'#92400E',borderRadius:99,padding:'2px 9px',fontSize:'.75rem',fontWeight:700}}>{count}</div>
                  <ChevronRight size={14} color="#ccc"/>
                </button>
              ))}
            </div>
          )}

          {/* PROSSIMO ALLOGGIO */}
          {prossimoAlloggio && (
            <div style={{margin:'0 16px 12px',background:'#fff',borderRadius:14,border:'1px solid #D4C4A0',overflow:'hidden'}}>
              <div style={{padding:'12px 16px 10px',fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'#7A6845',display:'flex',alignItems:'center',gap:5,borderBottom:'1px solid #F0E8D0'}}><Bed size={13} color="#9D174D"/>Prossimo alloggio</div>
              <div style={{padding:'12px 16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'.9rem',fontWeight:700}}>{prossimoAlloggio.voce}</div>
                    <div style={{fontSize:'.78rem',color:'#7A6845',marginTop:3,display:'flex',alignItems:'center',gap:4}}><Clock size={11}/>{fmtDate(prossimoAlloggio.giorno)}{prossimoAlloggio.costo>0&&<span style={{marginLeft:4,color:'#3D5A2E',fontWeight:600}}>{fmtEur(prossimoAlloggio.costo)}</span>}</div>
                  </div>
                  {prossimoAlloggio.cancGratuita&&<CancBadge item={prossimoAlloggio}/>}
                </div>
                {prossimoAlloggio.note&&<div style={{fontSize:'.76rem',color:'#7A6845',fontStyle:'italic',marginTop:6}}>{prossimoAlloggio.note}</div>}
              </div>
            </div>
          )}

          {/* PROSSIMO GIORNO */}
          {prossimoGiorno && (
            <div style={{margin:'0 16px 16px',background:'#fff',borderRadius:14,border:'1px solid #D4C4A0',overflow:'hidden'}}>
              <div style={{padding:'12px 16px 10px',fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'#7A6845',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #F0E8D0'}}>
                <div style={{display:'flex',alignItems:'center',gap:5}}><Calendar size={13} color="#7A6845"/>Prossimo giorno</div>
                <button onClick={()=>setPage('itinerario')} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:2,color:'#C9992A',fontSize:'.75rem',fontWeight:600}}>Itinerario<ChevronRight size={13}/></button>
              </div>
              <div style={{padding:'12px 16px 8px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <div style={{background:'#1A1208',color:'#E8B84B',borderRadius:8,padding:'4px 10px',fontFamily:"'Playfair Display',serif",fontSize:'.9rem',fontWeight:700,lineHeight:1,textAlign:'center'}}>
                    {fmtDate(prossimoGiorno.date)}<br/><small style={{fontFamily:"'DM Sans',sans-serif",fontSize:'.55rem',color:'#aaa',fontWeight:400}}>G{prossimoGiorno.day}</small>
                  </div>
                  <div>
                    <div style={{fontSize:'.9rem',fontWeight:700}}>{prossimoGiorno.title}</div>
                    <div style={{fontSize:'.75rem',color:'#7A6845',display:'flex',alignItems:'center',gap:3,marginTop:2}}><MapPin size={10}/>{prossimoGiorno.place}</div>
                  </div>
                </div>
                {prossimoGiorno.activities.slice(0,3).map((a,i)=>(
                  <div key={i} style={{display:'flex',gap:8,padding:'5px 0',borderTop:'1px solid #F0E8D0',alignItems:'flex-start'}}>
                    <div style={{fontSize:'.7rem',fontWeight:700,color:'#C9992A',minWidth:38,display:'flex',alignItems:'center',gap:2,paddingTop:1}}><Clock size={9}/>{a.time}</div>
                    <div style={{fontSize:'.88rem'}}>{a.type}</div>
                    <div style={{fontSize:'.82rem',fontWeight:500,flex:1}}>{a.title}</div>
                  </div>
                ))}
                {prossimoGiorno.activities.length>3&&<div style={{fontSize:'.72rem',color:'#aaa',paddingTop:6,textAlign:'center'}}>+{prossimoGiorno.activities.length-3} altre attività</div>}
              </div>
            </div>
          )}
          <div style={{height:16}}/>
        </div>
      )}

      {/* ══════════════════════════════
          CHECKLIST
      ══════════════════════════════ */}
      {page==='checklist'&&(
        <div style={S.page}>
          <div style={S.hdr}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><div style={S.hdrT}>Checklist</div><div style={S.hdrS}>{doneCount}/{data.items.length} completati</div></div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                {searchBtn}
                <button onClick={()=>setAddModal(true)} style={{background:'none',border:'1px solid #E8B84B',borderRadius:8,color:'#E8B84B',padding:'7px 12px',fontSize:'.82rem',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}><Plus size={14}/>Aggiungi</button>
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:8,padding:'10px 16px',overflowX:'auto',scrollbarWidth:'none',position:'sticky',top:58,background:'#FAF6EE',zIndex:40,borderBottom:'1px solid #D4C4A0'}}>
            {['Tutto',...new Set(data.items.map(i=>i.cat))].map(c=>(
              <button key={c} onClick={()=>setFilter(c)} style={{flexShrink:0,padding:'6px 14px',borderRadius:99,border:`1px solid ${filter===c?'#1A1208':'#D4C4A0'}`,background:filter===c?'#1A1208':'#fff',color:filter===c?'#E8B84B':'#7A6845',fontFamily:"'DM Sans',sans-serif",fontSize:'.78rem',fontWeight:600,cursor:'pointer'}}>{c}</button>
            ))}
          </div>
          {SECTIONS.map(sec=>{
            let items=data.items.filter(i=>i.section===sec)
            if(filter!=='Tutto') items=items.filter(i=>i.cat===filter)
            if(!items.length) return null
            items=[...items].sort((a,b)=>{ if(a.done!==b.done) return a.done?1:-1; if(!a.giorno&&!b.giorno) return 0; if(!a.giorno) return 1; if(!b.giorno) return -1; return a.giorno.localeCompare(b.giorno) })
            return (
              <div key={sec}>
                <div style={{padding:'12px 16px 5px',fontSize:'.67rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#7A6845',display:'flex',alignItems:'center',gap:5}}><SectionIcon sec={sec}/>{sec}</div>
                {items.map(i=>(
                  <div key={i.id} style={{...S.card,opacity:i.done?.5:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 10px 12px 12px'}}>
                      <button onClick={()=>toggleItem(i.id)} style={{width:28,height:28,borderRadius:8,border:`2px solid ${i.done?'#3D5A2E':'#D4C4A0'}`,background:i.done?'#3D5A2E':'#fff',color:'#fff',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {i.done&&<CheckSquare size={14} strokeWidth={3}/>}
                      </button>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'.88rem',fontWeight:600,lineHeight:1.3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textDecoration:i.done?'line-through':'none'}}>{i.voce}</div>
                        <div style={{display:'flex',gap:6,marginTop:3,flexWrap:'wrap'}}>
                          {i.costo>0&&<span style={{fontSize:'.8rem',fontWeight:700,color:'#3D5A2E'}}>{fmtEur(i.costo)}</span>}
                          {i.giorno&&<span style={{fontSize:'.73rem',color:'#7A6845',display:'flex',alignItems:'center',gap:2}}><Clock size={10}/>{fmtDate(i.giorno)}</span>}
                        </div>
                      </div>
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={()=>openEdit(i)} style={{...S.iBtn,width:34,height:34}}><Pencil size={14} color="#7A6845"/></button>
                        <button onClick={()=>deleteItem(i.id)} style={{...S.iBtn,width:34,height:34}}><Trash2 size={14} color="#7A6845"/></button>
                      </div>
                    </div>
                    <div style={{borderTop:'1px solid #F0E8D0',padding:'7px 12px 8px',display:'flex',flexWrap:'wrap',gap:5}}>
                      <CatBadge cat={i.cat}/><QBadge q={i.quando}/><CancBadge item={i}/>
                    </div>
                    {i.note&&<div style={{fontSize:'.75rem',color:'#7A6845',fontStyle:'italic',padding:'0 12px 9px',lineHeight:1.4}}>{i.note}</div>}
                  </div>
                ))}
              </div>
            )
          })}
          <div style={{margin:'8px 16px 16px',background:'#1A1208',borderRadius:14,padding:'15px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><div style={{fontSize:'.72rem',color:'#aaa'}}>Totale / persona</div><div style={{fontSize:'.68rem',color:'#777',marginTop:1}}>x2 = {fmtEur(total*2)} coppia</div></div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:'1.55rem',fontWeight:700,color:'#E8B84B'}}>{fmtEur(total)}</div>
          </div>
          <div style={{height:80}}/>
        </div>
      )}

      {/* ══════════════════════════════
          MAPPA
      ══════════════════════════════ */}
      {page==='mappa'&&(
        <div style={{...S.page,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <div style={S.hdr}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><div style={S.hdrT}>Mappa Itinerario</div><div style={S.hdrS}>Perù 2026 · clicca un luogo per i dettagli</div></div>
              {searchBtn}
            </div>
          </div>
          <div style={{flex:1,position:'relative',minHeight:0}}>
            <MapLeafletDynamic
              itinerary={data.itinerary}
              onLocationClick={(place, days) => setMapLocation({place, days})}
            />
            {/* LOCATION PANEL */}
            {mapLocation && (
              <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#FAF6EE',borderRadius:'20px 20px 0 0',maxHeight:'62%',overflowY:'auto',boxShadow:'0 -6px 24px rgba(0,0,0,.22)',zIndex:1000}}>
                <div style={{width:36,height:4,background:'#D4C4A0',borderRadius:99,margin:'12px auto 8px'}}/>
                <div style={{padding:'0 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #D4C4A0'}}>
                  <div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:'1.05rem',fontWeight:700}}>{mapLocation.place}</div>
                    <div style={{fontSize:'.72rem',color:'#7A6845',marginTop:2}}>{mapLocation.days.length} {mapLocation.days.length===1?'giorno':'giorni'}</div>
                  </div>
                  <button onClick={()=>setMapLocation(null)} style={{background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center'}}><X size={18} color="#7A6845"/></button>
                </div>
                {mapLocation.days.map(day=>(
                  <div key={day.id}>
                    <div style={{padding:'10px 16px 6px',display:'flex',gap:10,alignItems:'center',borderBottom:'1px solid #F0E8D0'}}>
                      <div style={{background:'#1A1208',color:'#E8B84B',borderRadius:8,padding:'3px 9px',fontFamily:"'Playfair Display',serif",fontSize:'.82rem',fontWeight:700,flexShrink:0}}>G{day.day}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'.88rem',fontWeight:700}}>{day.title}</div>
                        <div style={{fontSize:'.7rem',color:'#7A6845',marginTop:1}}>{fmtDate(day.date)}{day.hotel&&<> · {day.hotel}</>}</div>
                      </div>
                    </div>
                    {(() => {
                      const wd = getWeatherForDay(day)
                      if (!wd) return null
                      return (
                        <div style={{padding:'6px 16px',background:'#F8F4EC',display:'flex',alignItems:'center',gap:8,fontSize:'.76rem',color:'#7A6845',borderBottom:'1px solid #F0E8D0'}}>
                          <span style={{fontSize:'1rem'}}>{wEmoji(wd.code)}</span>
                          <span style={{fontWeight:600}}>{wd.maxTemp}°/{wd.minTemp}°</span>
                          <span>{wDesc(wd.code)}</span>
                          {wd.precip>0&&<span>💧{wd.precip}mm</span>}
                          <span style={{marginLeft:'auto',fontSize:'.64rem',color:'#B09060'}}>lug '25</span>
                        </div>
                      )
                    })()}
                    {day.activities.map((a,i)=>(
                      <div key={i} style={{display:'flex',gap:10,padding:'7px 16px',borderBottom:'1px solid #F8F4EC',alignItems:'center'}}>
                        <div style={{fontSize:'.68rem',fontWeight:700,color:'#C9992A',minWidth:36}}>{a.time}</div>
                        <div style={{fontSize:'.88rem'}}>{a.type}</div>
                        <div style={{fontSize:'.82rem',fontWeight:500,flex:1}}>{a.title}</div>
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{height:16}}/>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          ITINERARIO
      ══════════════════════════════ */}
      {page==='itinerario'&&(
        <div style={S.page}>
          <div style={S.hdr}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={S.hdrT}>Itinerario</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                {searchBtn}
                <button onClick={()=>setDayModal(true)} style={{background:'none',border:'none',color:'#E8B84B',cursor:'pointer',padding:'4px 0 4px 6px',display:'flex',alignItems:'center'}}><Plus size={20}/></button>
              </div>
            </div>
          </div>
          <div style={{height:10}}/>
          {[...data.itinerary].sort((a,b)=>a.day-b.day).map(day=>{
            const wd = getWeatherForDay(day)
            return (
              <div key={day.id} style={{margin:'0 16px 10px',background:'#fff',borderRadius:14,border:'1px solid #D4C4A0',overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'stretch',cursor:'pointer'}} onClick={()=>setOpenDays(prev=>{ const n=new Set(prev); n.has(day.id)?n.delete(day.id):n.add(day.id); return n })}>
                  <div style={{background:'#1A1208',color:'#E8B84B',fontFamily:"'Playfair Display',serif",fontSize:'1.05rem',fontWeight:700,padding:'13px 12px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minWidth:58,lineHeight:1,gap:2}}>
                    {fmtDate(day.date)}<small style={{fontFamily:"'DM Sans',sans-serif",fontSize:'.58rem',color:'#aaa',fontWeight:400,textTransform:'uppercase'}}>G{day.day}</small>
                  </div>
                  <div style={{flex:1,padding:'12px 10px',minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{fontSize:'.9rem',fontWeight:700,lineHeight:1.3,flex:1}}>{day.title}</div>
                      <button onClick={e=>{e.stopPropagation();deleteDay(day.id)}} style={{background:'none',border:'none',cursor:'pointer',padding:'2px',display:'flex',alignItems:'center'}}><Trash2 size={13} color="#ccc"/></button>
                    </div>
                    <div style={{fontSize:'.73rem',color:'#7A6845',marginTop:3,display:'flex',gap:8,flexWrap:'wrap'}}>
                      <span style={{display:'flex',alignItems:'center',gap:3}}><MapPin size={10}/>{day.place}</span>
                      {day.hotel&&<span style={{display:'flex',alignItems:'center',gap:3}}><Bed size={10}/>{day.hotel}</span>}
                      {wd&&<span style={{display:'flex',alignItems:'center',gap:2}}>{wEmoji(wd.code)}{wd.maxTemp}°/{wd.minTemp}°</span>}
                    </div>
                  </div>
                  <div style={{padding:12,display:'flex',alignItems:'center',color:'#7A6845',transition:'transform .2s',transform:openDays.has(day.id)?'rotate(180deg)':'none'}}><ChevronDown size={16}/></div>
                </div>
                {openDays.has(day.id)&&(
                  <div style={{borderTop:'1px solid #F0E8D0'}}>
                    {/* Weather row when expanded */}
                    {wd&&(
                      <div style={{padding:'8px 14px',background:'#F8F4EC',borderBottom:'1px solid #F0E8D0',display:'flex',alignItems:'center',gap:10,fontSize:'.78rem',color:'#7A6845'}}>
                        <span style={{fontSize:'1.1rem'}}>{wEmoji(wd.code)}</span>
                        <span style={{fontWeight:600}}>{wd.maxTemp}°/{wd.minTemp}°</span>
                        <span>{wDesc(wd.code)}</span>
                        {wd.precip>0&&<span>💧{wd.precip}mm</span>}
                        <span style={{marginLeft:'auto',fontSize:'.66rem',color:'#B09060'}}>media lug '25</span>
                      </div>
                    )}
                    {day.activities.map((a,i)=>(
                      <div key={i} style={{display:'flex',gap:10,padding:'10px 14px',borderBottom:'1px solid #F0E8D0',alignItems:'flex-start'}}>
                        <div style={{fontSize:'.7rem',fontWeight:700,color:'#C9992A',minWidth:36,paddingTop:2,display:'flex',alignItems:'center',gap:2}}><Clock size={9}/>{a.time||'—'}</div>
                        <div style={{fontSize:'.95rem',paddingTop:1}}>{a.type}</div>
                        <div style={{flex:1}}><div style={{fontSize:'.84rem',fontWeight:600,lineHeight:1.3}}>{a.title}</div>{a.note&&<div style={{fontSize:'.74rem',color:'#7A6845',marginTop:1}}>{a.note}</div>}</div>
                        <button onClick={()=>deleteActivity(day.id,i)} style={{background:'none',border:'none',cursor:'pointer',padding:'2px',flexShrink:0,display:'flex',alignItems:'center',paddingTop:4}}><Trash2 size={13} color="#ccc"/></button>
                      </div>
                    ))}
                    {day.notes&&<div style={{background:'#FFFBEB',padding:'9px 14px',fontSize:'.78rem',color:'#92400E',borderTop:'1px solid #F0E8D0'}}>📝 {day.notes}</div>}
                    {/* documenti collegati */}
                    {(()=>{
                      const linked = (data.documenti||[]).filter(d=>d.dayId===day.id)
                      if (!linked.length) return null
                      return (
                        <div style={{borderTop:'1px solid #F0E8D0',background:'#F8F4EC',padding:'8px 14px'}}>
                          <div style={{fontSize:'.66rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'#7A6845',marginBottom:6,display:'flex',alignItems:'center',gap:4}}><FolderOpen size={10}/>Documenti allegati</div>
                          {linked.map(doc=>(
                            <div key={doc.id} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0',borderBottom:'1px solid #F0E8D0'}}>
                              <div style={{width:24,height:24,borderRadius:6,background:doc.type==='link'?'#DBEAFE':'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                {doc.type==='link'?<Link2 size={11} color="#1E40AF"/>:<File size={11} color="#5B21B6"/>}
                              </div>
                              <span style={{flex:1,fontSize:'.8rem',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{doc.name}</span>
                              <button onClick={()=>openDoc(doc)} style={{background:'none',border:'none',cursor:'pointer',padding:3,display:'flex',alignItems:'center',borderRadius:6,flexShrink:0}}>
                                {doc.type==='link'?<ExternalLink size={13} color="#1E40AF"/>:<Download size={13} color="#5B21B6"/>}
                              </button>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                    <button onClick={()=>setActModal(day.id)} style={{width:'100%',background:'none',border:'none',borderTop:'1px dashed #D4C4A0',padding:11,fontFamily:"'DM Sans',sans-serif",fontSize:'.8rem',color:'#7A6845',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><Plus size={13}/>Aggiungi attività</button>
                  </div>
                )}
              </div>
            )
          })}
          <div style={{height:80}}/>
        </div>
      )}

      {/* ══════════════════════════════
          BUDGET
      ══════════════════════════════ */}
      {page==='budget'&&(
        <div style={S.page}>
          <div style={S.hdr}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={S.hdrT}>Budget</div>
              {searchBtn}
            </div>
          </div>
          <div style={{margin:'14px 16px',background:'linear-gradient(135deg,#1A1208,#2A1A08)',borderRadius:16,padding:20,color:'#fff'}}>
            <div style={{fontSize:'.7rem',color:'#aaa',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>Budget totale / persona</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:'2.1rem',fontWeight:700,color:'#E8B84B',lineHeight:1}}>{fmtEur(total)}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 8px',marginTop:14}}>
              {[
                {v:fmtEur(pagato),l:'Già pagato',c:'#86EFAC',sub:'definitivo'},
                {v:fmtEur(cancConf),l:'Canc. gratuita',c:'#FCD34D',sub:'ancora cancellabile'},
                {v:fmtEur(total-spent),l:'Da prenotare',c:'#FDA4AF',sub:'non ancora fatto'},
                {v:fmtEur(total*2),l:'Totale coppia',c:'#fff',sub:'entrambi'},
              ].map((st,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,.08)',borderRadius:10,padding:'10px 12px'}}>
                  <div style={{fontSize:'1rem',fontWeight:700,color:st.c}}>{st.v}</div>
                  <div style={{fontSize:'.72rem',color:'#E8B84B',marginTop:1,fontWeight:600}}>{st.l}</div>
                  <div style={{fontSize:'.62rem',color:'#888',marginTop:1}}>{st.sub}</div>
                </div>
              ))}
            </div>
          </div>
          {(()=>{
            const byCat:{[k:string]:{b:number,p:number,c:number}}={}
            data.items.forEach(i=>{ if(!byCat[i.cat]) byCat[i.cat]={b:0,p:0,c:0}; byCat[i.cat].b+=i.costo; if(i.done&&!i.cancGratuita) byCat[i.cat].p+=i.costo; if(i.done&&i.cancGratuita) byCat[i.cat].c+=i.costo })
            return (
              <div style={{margin:'0 16px 12px',background:'#fff',borderRadius:14,border:'1px solid #D4C4A0',overflow:'hidden'}}>
                <div style={{padding:'11px 14px 9px',fontSize:'.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'#7A6845',borderBottom:'1px solid #F0E8D0'}}>Per categoria</div>
                {Object.entries(byCat).map(([cat,v])=>(
                  <div key={cat} style={{padding:'10px 14px',borderBottom:'1px solid #F0E8D0'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:v.p>0||v.c>0?5:0}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:CAT_COLORS[cat]||'#999',flexShrink:0}}/>
                      <div style={{fontSize:'.84rem',fontWeight:600,flex:1}}>{cat}</div>
                      <div style={{fontSize:'.86rem',fontWeight:700}}>{fmtEur(v.b)}</div>
                      <div style={{fontSize:'.7rem',color:'#7A6845',background:'#F0E8D0',padding:'2px 7px',borderRadius:99}}>{Math.round(v.b/total*100)}%</div>
                    </div>
                    {(v.p>0||v.c>0)&&(
                      <div style={{display:'flex',gap:6,paddingLeft:18,flexWrap:'wrap'}}>
                        {v.p>0&&<span style={{fontSize:'.7rem',background:'#DCFCE7',color:'#166534',padding:'2px 8px',borderRadius:99,display:'flex',alignItems:'center',gap:3}}><CheckSquare size={9}/>pagato {fmtEur(v.p)}</span>}
                        {v.c>0&&<span style={{fontSize:'.7rem',background:'#FEF9C3',color:'#713F12',padding:'2px 8px',borderRadius:99}}>canc. {fmtEur(v.c)}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })()}
          <div style={{height:80}}/>
        </div>
      )}

      {/* ══════════════════════════════
          DOCUMENTI
      ══════════════════════════════ */}
      {page==='documenti'&&(
        <div style={S.page}>
          <div style={S.hdr}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={S.hdrT}>Documenti</div>
                <div style={S.hdrS}>{(data.documenti||[]).length} file e link salvati</div>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                {searchBtn}
                <button onClick={()=>setDocModal(true)} style={{background:'none',border:'1px solid #E8B84B',borderRadius:8,color:'#E8B84B',padding:'7px 12px',fontSize:'.82rem',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}><Plus size={14}/>Aggiungi</button>
              </div>
            </div>
          </div>

          {(data.documenti||[]).length === 0 ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 32px',textAlign:'center',color:'#7A6845'}}>
              <FolderOpen size={44} color="#D4C4A0"/>
              <div style={{marginTop:16,fontSize:'.95rem',fontWeight:600,color:'#2C2012'}}>Nessun documento salvato</div>
              <div style={{marginTop:6,fontSize:'.82rem',color:'#aaa',lineHeight:1.5}}>Aggiungi link di prenotazione,<br/>biglietti PDF o conferme</div>
              <button onClick={()=>setDocModal(true)} style={{marginTop:20,background:'#1A1208',color:'#E8B84B',border:'none',borderRadius:12,padding:'12px 24px',fontFamily:"'DM Sans',sans-serif",fontSize:'.9rem',fontWeight:700,cursor:'pointer'}}>+ Aggiungi documento</button>
            </div>
          ) : (
            <div style={{padding:'10px 0 80px'}}>
              {(()=>{
                const grouped: Record<string, Documento[]> = {}
                ;(data.documenti||[]).forEach(d=>{ if(!grouped[d.cat]) grouped[d.cat]=[]; grouped[d.cat].push(d) })
                return Object.entries(grouped).map(([cat, docs])=>(
                  <div key={cat}>
                    <div style={{padding:'12px 16px 5px',fontSize:'.67rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#7A6845',display:'flex',alignItems:'center',gap:5}}>
                      <CatIcon cat={cat}/> {cat}
                    </div>
                    {docs.map(doc=>(
                      <div key={doc.id} style={S.card}>
                        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 12px'}}>
                          <div style={{width:36,height:36,borderRadius:10,background:doc.type==='link'?'#DBEAFE':'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            {doc.type==='link'
                              ? <Link2 size={16} color="#1E40AF"/>
                              : <File  size={16} color="#5B21B6"/>
                            }
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:'.88rem',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{doc.name}</div>
                            <div style={{fontSize:'.72rem',color:'#7A6845',marginTop:2,display:'flex',alignItems:'center',gap:5}}>
                              <CatBadge cat={doc.cat}/>
                              {doc.type==='link'&&<span style={{color:'#aaa',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:120}}>{doc.url.replace(/^https?:\/\//,'')}</span>}
                              {doc.type==='file'&&doc.mime&&<span style={{color:'#aaa',textTransform:'uppercase',fontSize:'.65rem'}}>{doc.mime.split('/')[1]||'file'}</span>}
                            </div>
                            {doc.note&&<div style={{fontSize:'.73rem',color:'#7A6845',fontStyle:'italic',marginTop:3}}>{doc.note}</div>}
                          </div>
                          <div style={{display:'flex',gap:4,flexShrink:0}}>
                            <button onClick={()=>openDoc(doc)} style={{...S.iBtn,width:36,height:36,background:doc.type==='link'?'#DBEAFE':'#EDE9FE'}}>
                              {doc.type==='link'?<ExternalLink size={14} color="#1E40AF"/>:<Download size={14} color="#5B21B6"/>}
                            </button>
                            <button onClick={()=>deleteDoc(doc.id)} style={{...S.iBtn,width:36,height:36}}><Trash2 size={14} color="#ccc"/></button>
                          </div>
                        </div>
                      </div>
                    ))}
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
        <div style={S.page}>
          <div style={S.hdr}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={S.hdrT}>Note</div>
              {searchBtn}
            </div>
          </div>
          <div style={{padding:'10px 16px 16px',display:'flex',flexDirection:'column',gap:10}}>
            {data.notes.map(n=>(
              <div key={n.id} style={{background:'#fff',borderRadius:14,border:'1px solid #D4C4A0',overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'center',padding:'11px 14px 9px',gap:10}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:n.color,flexShrink:0}}/>
                  <input defaultValue={n.title} onBlur={e=>saveNote(n.id,'title',e.target.value)} style={{flex:1,border:'none',fontFamily:"'DM Sans',sans-serif",fontSize:'.9rem',fontWeight:700,color:'#2C2012',background:'transparent'}}/>
                  <button onClick={()=>deleteNote(n.id)} style={{background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center'}}><Trash2 size={14} color="#ccc"/></button>
                </div>
                <textarea defaultValue={n.text} onBlur={e=>saveNote(n.id,'text',e.target.value)} style={{width:'100%',border:'none',borderTop:'1px solid #F0E8D0',fontFamily:"'DM Sans',sans-serif",fontSize:'.84rem',color:'#2C2012',padding:'10px 14px',background:'#FAF6EE',resize:'none',minHeight:88,lineHeight:1.5,boxSizing:'border-box'}}/>
              </div>
            ))}
          </div>
          <div style={{height:100}}/>
          <button onClick={addNote} style={{position:'fixed',bottom:'calc(70px + env(safe-area-inset-bottom,0px) + 14px)',right:16,width:50,height:50,background:'#1A1208',color:'#E8B84B',border:'none',borderRadius:'50%',cursor:'pointer',boxShadow:'0 4px 18px rgba(0,0,0,.25)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:150}}><Plus size={22}/></button>
        </div>
      )}

      {/* ══ BOTTOM NAV ══ */}
      <nav style={{position:'fixed',bottom:0,left:0,right:0,background:'#1A1208',display:'flex',zIndex:200,paddingBottom:'env(safe-area-inset-bottom,0px)',boxShadow:'0 -2px 20px rgba(0,0,0,.3)',maxWidth:600,margin:'0 auto',overflowX:'auto',scrollbarWidth:'none'}}>
        {navItems.map(({id,icon,lbl})=>(
          <button key={id} onClick={()=>setPage(id)} style={{flex:'1 0 auto',minWidth:44,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'9px 2px 7px',border:'none',background:'none',color:page===id?'#E8B84B':'#555',fontFamily:"'DM Sans',sans-serif",fontSize:'.56rem',fontWeight:600,letterSpacing:'.04em',textTransform:'uppercase',cursor:'pointer',gap:3}}>
            {icon}{lbl}
            <div style={{width:4,height:4,borderRadius:'50%',background:'#E8B84B',visibility:page===id?'visible':'hidden'}}/>
          </button>
        ))}
      </nav>

      {/* ══ SEARCH OVERLAY ══ */}
      {searchOpen&&(
        <div style={{position:'fixed',inset:0,background:'#FAF6EE',zIndex:600,display:'flex',flexDirection:'column',maxWidth:600,margin:'0 auto'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #D4C4A0',display:'flex',gap:10,alignItems:'center',background:'#1A1208'}}>
            <Search size={16} color="#E8B84B"/>
            <input
              autoFocus
              value={searchQ}
              onChange={e=>setSearchQ(e.target.value)}
              placeholder="Cerca in tutto il viaggio…"
              style={{flex:1,border:'none',background:'transparent',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontSize:'1rem',outline:'none'}}
            />
            <button onClick={()=>{setSearchOpen(false);setSearchQ('')}} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',padding:4}}><X size={22} color="#E8B84B"/></button>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {!searchQ.trim() ? (
              <div style={{padding:'48px 24px',textAlign:'center',color:'#7A6845',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
                <Search size={36} color="#D4C4A0"/>
                <div style={{fontSize:'.9rem'}}>Cerca voci, attività, note, documenti…</div>
              </div>
            ) : searchResults && (
              <>
                {/* items */}
                {searchResults.items.length>0&&(
                  <div>
                    <div style={{padding:'10px 16px 4px',fontSize:'.64rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#7A6845',borderBottom:'1px solid #F0E8D0',display:'flex',alignItems:'center',gap:5}}><CheckSquare size={11}/>Checklist</div>
                    {searchResults.items.map(item=>(
                      <button key={item.id} onClick={()=>{setPage('checklist');setFilter('Tutto');setSearchOpen(false);setSearchQ('')}} style={{width:'100%',background:'none',border:'none',borderBottom:'1px solid #F0E8D0',padding:'10px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left'}}>
                        <CatBadge cat={item.cat}/>
                        <div style={{flex:1,fontSize:'.86rem',fontWeight:500,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.voce}</div>
                        {item.costo>0&&<span style={{fontSize:'.78rem',fontWeight:700,color:'#3D5A2E',flexShrink:0}}>{fmtEur(item.costo)}</span>}
                        <ChevronRight size={13} color="#ccc"/>
                      </button>
                    ))}
                  </div>
                )}
                {/* days */}
                {searchResults.days.length>0&&(
                  <div>
                    <div style={{padding:'10px 16px 4px',fontSize:'.64rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#7A6845',borderBottom:'1px solid #F0E8D0',display:'flex',alignItems:'center',gap:5}}><Calendar size={11}/>Itinerario</div>
                    {searchResults.days.map(day=>(
                      <button key={day.id} onClick={()=>{setPage('itinerario');setOpenDays(new Set([day.id]));setSearchOpen(false);setSearchQ('')}} style={{width:'100%',background:'none',border:'none',borderBottom:'1px solid #F0E8D0',padding:'10px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left'}}>
                        <div style={{background:'#1A1208',color:'#E8B84B',borderRadius:6,padding:'2px 7px',fontFamily:"'Playfair Display',serif",fontSize:'.8rem',fontWeight:700,flexShrink:0}}>G{day.day}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'.86rem',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{day.title}</div>
                          <div style={{fontSize:'.72rem',color:'#7A6845',display:'flex',alignItems:'center',gap:3,marginTop:1}}><MapPin size={9}/>{day.place}</div>
                        </div>
                        <ChevronRight size={13} color="#ccc"/>
                      </button>
                    ))}
                  </div>
                )}
                {/* notes */}
                {searchResults.notes.length>0&&(
                  <div>
                    <div style={{padding:'10px 16px 4px',fontSize:'.64rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#7A6845',borderBottom:'1px solid #F0E8D0',display:'flex',alignItems:'center',gap:5}}><StickyNote size={11}/>Note</div>
                    {searchResults.notes.map(note=>(
                      <button key={note.id} onClick={()=>{setPage('note');setSearchOpen(false);setSearchQ('')}} style={{width:'100%',background:'none',border:'none',borderBottom:'1px solid #F0E8D0',padding:'10px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left'}}>
                        <div style={{width:10,height:10,borderRadius:'50%',background:note.color,flexShrink:0}}/>
                        <div style={{flex:1,fontSize:'.86rem',fontWeight:500}}>{note.title}</div>
                        <ChevronRight size={13} color="#ccc"/>
                      </button>
                    ))}
                  </div>
                )}
                {/* docs */}
                {searchResults.docs.length>0&&(
                  <div>
                    <div style={{padding:'10px 16px 4px',fontSize:'.64rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#7A6845',borderBottom:'1px solid #F0E8D0',display:'flex',alignItems:'center',gap:5}}><FolderOpen size={11}/>Documenti</div>
                    {searchResults.docs.map(doc=>(
                      <button key={doc.id} onClick={()=>{setPage('documenti');setSearchOpen(false);setSearchQ('')}} style={{width:'100%',background:'none',border:'none',borderBottom:'1px solid #F0E8D0',padding:'10px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left'}}>
                        {doc.type==='link'?<Link2 size={14} color="#7A6845"/>:<File size={14} color="#7A6845"/>}
                        <div style={{flex:1,fontSize:'.86rem',fontWeight:500,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{doc.name}</div>
                        <CatBadge cat={doc.cat}/>
                        <ChevronRight size={13} color="#ccc"/>
                      </button>
                    ))}
                  </div>
                )}
                {/* empty */}
                {searchResults.items.length===0&&searchResults.days.length===0&&searchResults.notes.length===0&&searchResults.docs.length===0&&(
                  <div style={{padding:'48px 24px',textAlign:'center',color:'#7A6845',display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                    <div style={{fontSize:'1.5rem'}}>🔍</div>
                    <div style={{fontSize:'.9rem'}}>Nessun risultato per <strong>"{searchQ}"</strong></div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ MODALS ══ */}
      {addModal&&(
        <Modal title="Aggiungi Voce" onClose={()=>setAddModal(false)}>
          <FG label="Voce / Attività"><input style={inputStyle} value={fVoce} onChange={e=>setFVoce(e.target.value)} placeholder="es. Volo Lima – Cusco"/></FG>
          <FRow><FRowItem label="Sezione"><select style={inputStyle} value={fSec} onChange={e=>setFSec(e.target.value)}>{SECTIONS.map(s=><option key={s}>{s}</option>)}</select></FRowItem><FRowItem label="Categoria"><select style={inputStyle} value={fCat} onChange={e=>setFCat(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></FRowItem></FRow>
          <FRow><FRowItem label="Data"><input style={inputStyle} type="date" value={fGiorno} onChange={e=>setFGiorno(e.target.value)}/></FRowItem><FRowItem label="Costo €/pers."><input style={inputStyle} type="number" value={fCosto} onChange={e=>setFCosto(e.target.value)} placeholder="0"/></FRowItem></FRow>
          <FG label="Quando prenotare"><select style={inputStyle} value={fQuando} onChange={e=>setFQuando(e.target.value)}>{QUANDO_OPTS.map(o=><option key={o}>{o}</option>)}</select></FG>
          <FG label="Note"><textarea style={{...inputStyle,minHeight:70,resize:'none'}} value={fNote} onChange={e=>setFNote(e.target.value)}/></FG>
          <div style={{margin:'10px 20px 0',background:'#ECFDF5',border:'1.5px solid #6EE7B7',borderRadius:10,padding:'12px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}><input type="checkbox" id="fcanc" checked={fCanc} onChange={e=>setFCanc(e.target.checked)} style={{width:20,height:20,accentColor:'#3D5A2E',cursor:'pointer'}}/><label htmlFor="fcanc" style={{fontSize:'.88rem',fontWeight:600,color:'#065F46',cursor:'pointer'}}>Cancellazione gratuita</label></div>
            {fCanc&&<input style={{...inputStyle,marginTop:9,border:'1.5px solid #6EE7B7'}} type="date" value={fCancDate} onChange={e=>setFCancDate(e.target.value)}/>}
          </div>
          <div style={{display:'flex',gap:10,padding:'14px 20px 0'}}><button style={S.btnC} onClick={()=>setAddModal(false)}>Annulla</button><button style={S.btn} onClick={saveNewItem}>Aggiungi</button></div>
        </Modal>
      )}
      {editModal&&(
        <Modal title="Modifica Voce" onClose={()=>setEditModal(null)}>
          <FG label="Voce / Attività"><input style={inputStyle} value={eVoce} onChange={e=>setEVoce(e.target.value)}/></FG>
          <FRow><FRowItem label="Sezione"><select style={inputStyle} value={eSec} onChange={e=>setESec(e.target.value)}>{SECTIONS.map(s=><option key={s}>{s}</option>)}</select></FRowItem><FRowItem label="Categoria"><select style={inputStyle} value={eCat} onChange={e=>setECat(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></FRowItem></FRow>
          <FRow><FRowItem label="Data"><input style={inputStyle} type="date" value={eGiorno} onChange={e=>setEGiorno(e.target.value)}/></FRowItem><FRowItem label="Costo €/pers."><input style={inputStyle} type="number" value={eCosto} onChange={e=>setECosto(e.target.value)}/></FRowItem></FRow>
          <FG label="Quando prenotare"><select style={inputStyle} value={eQuando} onChange={e=>setEQuando(e.target.value)}>{QUANDO_OPTS.map(o=><option key={o}>{o}</option>)}</select></FG>
          <FG label="Note"><textarea style={{...inputStyle,minHeight:70,resize:'none'}} value={eNote} onChange={e=>setENote(e.target.value)}/></FG>
          <div style={{margin:'10px 20px 0',background:'#ECFDF5',border:'1.5px solid #6EE7B7',borderRadius:10,padding:'12px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}><input type="checkbox" id="ecanc" checked={eCanc} onChange={e=>setECanc(e.target.checked)} style={{width:20,height:20,accentColor:'#3D5A2E',cursor:'pointer'}}/><label htmlFor="ecanc" style={{fontSize:'.88rem',fontWeight:600,color:'#065F46',cursor:'pointer'}}>Cancellazione gratuita</label></div>
            {eCanc&&<input style={{...inputStyle,marginTop:9,border:'1.5px solid #6EE7B7'}} type="date" value={eCancDate} onChange={e=>setECancDate(e.target.value)}/>}
          </div>
          <div style={{display:'flex',gap:10,padding:'14px 20px 0'}}><button style={S.btnC} onClick={()=>setEditModal(null)}>Annulla</button><button style={S.btn} onClick={saveEdit}>Salva</button></div>
        </Modal>
      )}
      {actModal!==null&&(
        <Modal title={`Aggiungi attività – G${data.itinerary.find(d=>d.id===actModal)?.day}`} onClose={()=>setActModal(null)}>
          <FG label="Titolo"><input style={inputStyle} value={aTitle} onChange={e=>setATitle(e.target.value)} placeholder="es. Visita Machu Picchu"/></FG>
          <FRow><FRowItem label="Ora"><input style={inputStyle} type="time" value={aTime} onChange={e=>setATime(e.target.value)}/></FRowItem><FRowItem label="Tipo"><select style={inputStyle} value={aType} onChange={e=>setAType(e.target.value)}>{ACT_TYPES.map(t=><option key={t}>{t}</option>)}</select></FRowItem></FRow>
          <FG label="Note"><input style={inputStyle} value={aNote} onChange={e=>setANote(e.target.value)} placeholder="es. Portare acqua"/></FG>
          <div style={{display:'flex',gap:10,padding:'14px 20px 0'}}><button style={S.btnC} onClick={()=>setActModal(null)}>Annulla</button><button style={S.btn} onClick={saveActivity}>Aggiungi</button></div>
        </Modal>
      )}
      {dayModal&&(
        <Modal title="Aggiungi Giorno" onClose={()=>setDayModal(false)}>
          <FG label="Titolo"><input style={inputStyle} value={dTitle} onChange={e=>setDTitle(e.target.value)} placeholder="es. Arequipa – Città Bianca"/></FG>
          <FRow><FRowItem label="Data"><input style={inputStyle} type="date" value={dDate} onChange={e=>setDDate(e.target.value)}/></FRowItem><FRowItem label="N° Giorno"><input style={inputStyle} type="number" value={dNum} onChange={e=>setDNum(e.target.value)}/></FRowItem></FRow>
          <FRow><FRowItem label="Luogo"><input style={inputStyle} value={dPlace} onChange={e=>setDPlace(e.target.value)} placeholder="es. Arequipa"/></FRowItem><FRowItem label="Alloggio"><input style={inputStyle} value={dHotel} onChange={e=>setDHotel(e.target.value)} placeholder="es. Hostal"/></FRowItem></FRow>
          <div style={{display:'flex',gap:10,padding:'14px 20px 0'}}><button style={S.btnC} onClick={()=>setDayModal(false)}>Annulla</button><button style={S.btn} onClick={saveDay}>Aggiungi</button></div>
        </Modal>
      )}

      {/* ── DOCUMENTO MODAL ── */}
      {docModal&&(
        <Modal title="Aggiungi Documento" onClose={()=>setDocModal(false)}>
          {/* type toggle */}
          <div style={{display:'flex',margin:'12px 20px 0',background:'#F0E8D0',borderRadius:12,padding:3,gap:3}}>
            {(['link','file'] as const).map(t=>(
              <button key={t} onClick={()=>setDDocType(t)} style={{flex:1,padding:'10px 0',border:'none',borderRadius:9,background:dDocType===t?'#1A1208':'transparent',color:dDocType===t?'#E8B84B':'#7A6845',fontFamily:"'DM Sans',sans-serif",fontSize:'.85rem',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                {t==='link'?<><Link2 size={14}/>Link URL</>:<><File size={14}/>File (PDF/img)</>}
              </button>
            ))}
          </div>
          {dDocType==='link' ? (
            <FG label="URL Prenotazione / Conferma"><input style={inputStyle} type="url" value={dDocUrl} onChange={e=>setDDocUrl(e.target.value)} placeholder="https://booking.com/..."/></FG>
          ) : (
            <FG label="Carica File (max 500KB – PDF, JPG, PNG)">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={handleFileUpload} style={{...inputStyle,padding:'10px'}}/>
            </FG>
          )}
          <FG label="Nome / Titolo"><input style={inputStyle} value={dDocName} onChange={e=>setDDocName(e.target.value)} placeholder="es. Conferma volo Roma–Lima"/></FG>
          <FG label="Categoria"><select style={inputStyle} value={dDocCat} onChange={e=>setDDocCat(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></FG>
          <FG label="Note (opzionale)"><input style={inputStyle} value={dDocNote} onChange={e=>setDDocNote(e.target.value)} placeholder="es. Codice: ABC123"/></FG>
          <FG label="Collega a giorno itinerario (opzionale)">
            <select style={inputStyle} value={dDocDayId??''} onChange={e=>setDDocDayId(e.target.value?parseInt(e.target.value):undefined)}>
              <option value="">— Nessuno —</option>
              {[...data.itinerary].sort((a,b)=>a.day-b.day).map(d=>(
                <option key={d.id} value={d.id}>G{d.day} · {d.title} ({fmtDate(d.date)})</option>
              ))}
            </select>
          </FG>
          <div style={{display:'flex',gap:10,padding:'14px 20px 0'}}><button style={S.btnC} onClick={()=>setDocModal(false)}>Annulla</button><button style={S.btn} onClick={saveDoc}>Salva</button></div>
        </Modal>
      )}
    </div>
  )
}
