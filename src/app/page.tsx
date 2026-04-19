'use client'
import { useEffect, useState, useCallback, useRef } from 'react'

/* ── TYPES ── */
type Item = { id:number; done:boolean; section:string; giorno:string; cat:string; voce:string; quando:string; costo:number; note:string; cancGratuita:boolean; cancScadenza:string }
type Activity = { time:string; type:string; title:string; note:string }
type Day = { id:number; date:string; day:number; title:string; place:string; hotel:string; notes:string; activities:Activity[] }
type Note = { id:number; title:string; color:string; text:string }
type AppData = { items:Item[]; itinerary:Day[]; notes:Note[]; nextId:number }

const CAT_COLORS:Record<string,string> = {Voli:'#3B82F6',Hotel:'#EC4899',Bus:'#10B981',Trasporti:'#F59E0B',Tour:'#8B5CF6',Ingressi:'#F97316',Documenti:'#6B7280',Salute:'#14B8A6',Homestay:'#EAB308',Cibo:'#F97316',Varie:'#22C55E'}
const NOTE_COLORS = ['#10B981','#3B82F6','#F59E0B','#8B5CF6','#EC4899','#EF4444','#14B8A6']
const SECTIONS = ['PUNTI CRITICI','BUROCRAZIA','ALLOGGI','TRASPORTI','TOUR','QUOTIDIANO']
const SECTION_ICONS:Record<string,string> = {'PUNTI CRITICI':'🚨','BUROCRAZIA':'📋','ALLOGGI':'🏨','TRASPORTI':'🚌','TOUR':'🎟️','QUOTIDIANO':'🍽️'}
const CATS = ['Voli','Hotel','Bus','Trasporti','Tour','Ingressi','Documenti','Salute','Homestay','Cibo','Varie']
const QUANDO_OPTS = ['SUBITO','Prima di partire','Online','In loco','In loco/Online','In loco/Tour','Online/Agenzia']
const ACT_TYPES = ['🚶 Visita','🍽️ Pasto','🚌 Trasporto','🏨 Alloggio','🎟️ Ingresso','🥾 Trek','📷 Foto','✈️ Volo','🚂 Treno','💤 Riposo']

/* ── HELPERS ── */
function fmtDate(s:string){ if(!s) return '—'; const d=new Date(s+'T00:00:00'); return d.toLocaleDateString('it-IT',{day:'2-digit',month:'short'}) }
function fmtEur(n:number){ return '€ '+Number(n).toLocaleString('it-IT') }

/* ── BADGES (inline style approach for SSR safety) ── */
const CAT_BADGE_COLORS:Record<string,{bg:string,color:string}> = {
  Voli:{bg:'#DBEAFE',color:'#1E40AF'},Hotel:{bg:'#FCE7F3',color:'#9D174D'},Bus:{bg:'#D1FAE5',color:'#065F46'},
  Trasporti:{bg:'#FEF3C7',color:'#92400E'},Tour:{bg:'#EDE9FE',color:'#5B21B6'},Ingressi:{bg:'#FFEDD5',color:'#9A3412'},
  Documenti:{bg:'#F3F4F6',color:'#374151'},Salute:{bg:'#ECFDF5',color:'#065F46'},Homestay:{bg:'#FEF9C3',color:'#713F12'},
  Cibo:{bg:'#FFF7ED',color:'#9A3412'},Varie:{bg:'#F0FDF4',color:'#166534'},
}
function CatBadge({cat}:{cat:string}){ const c=CAT_BADGE_COLORS[cat]||{bg:'#eee',color:'#333'}; return <span style={{background:c.bg,color:c.color,padding:'2px 9px',borderRadius:99,fontSize:'.7rem',fontWeight:600,whiteSpace:'nowrap'}}>{cat}</span> }
function QBadge({q}:{q:string}){
  const styles:Record<string,{bg:string,color:string}> = {'SUBITO':{bg:'#FEE2E2',color:'#991B1B'},'Prima di partire':{bg:'#FEF3C7',color:'#92400E'}}
  const c = q.includes('Online')?{bg:'#DBEAFE',color:'#1E40AF'}: styles[q]||{bg:'#F3F4F6',color:'#374151'}
  return <span style={{background:c.bg,color:c.color,padding:'2px 8px',borderRadius:4,fontSize:'.7rem',fontWeight:600}}>{q}</span>
}
function CancBadge({item}:{item:Item}){
  if(!item.cancGratuita) return null
  if(!item.cancScadenza) return <span style={{background:'#DCFCE7',color:'#166534',padding:'2px 9px',borderRadius:99,fontSize:'.7rem',fontWeight:600}}>🟢 Canc. gratuita</span>
  const oggi=new Date(); oggi.setHours(0,0,0,0)
  const scad=new Date(item.cancScadenza+'T00:00:00')
  const diff=Math.ceil((scad.getTime()-oggi.getTime())/86400000)
  if(diff<0) return <span style={{background:'#FEE2E2',color:'#991B1B',padding:'2px 9px',borderRadius:99,fontSize:'.7rem',fontWeight:600}}>🔴 Scaduta {fmtDate(item.cancScadenza)}</span>
  if(diff<=7) return <span style={{background:'#FEF9C3',color:'#713F12',padding:'2px 9px',borderRadius:99,fontSize:'.7rem',fontWeight:600}}>🟡 Scade tra {diff}g</span>
  return <span style={{background:'#DCFCE7',color:'#166534',padding:'2px 9px',borderRadius:99,fontSize:'.7rem',fontWeight:600}}>🟢 Canc. fino al {fmtDate(item.cancScadenza)}</span>
}

/* ── MODAL SHELL ── */
function Modal({id,title,children,onClose}:{id:string,title:string,children:React.ReactNode,onClose:()=>void}){
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

/* ── FORM HELPERS ── */
const FG = ({label,children}:{label:string,children:React.ReactNode}) => (
  <div style={{padding:'10px 20px 0'}}>
    <label style={{display:'block',fontSize:'.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'#7A6845',marginBottom:5}}>{label}</label>
    {children}
  </div>
)
const inputStyle:React.CSSProperties = {width:'100%',border:'1.5px solid #D4C4A0',borderRadius:10,padding:'12px 13px',fontFamily:"'DM Sans',sans-serif",fontSize:'.92rem',color:'#2C2012',background:'#fff',WebkitAppearance:'none',minHeight:44,boxSizing:'border-box'}
const FRow = ({children}:{children:React.ReactNode}) => <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px',padding:'10px 20px 0'}}>{children}</div>
const FRowItem = ({label,children}:{label:string,children:React.ReactNode}) => (
  <div><label style={{display:'block',fontSize:'.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'#7A6845',marginBottom:5}}>{label}</label>{children}</div>
)

/* ── MAIN ── */
export default function App() {
  const [data, setData] = useState<AppData|null>(null)
  const [page, setPage] = useState<'dashboard'|'checklist'|'itinerario'|'budget'|'note'>('dashboard')
  const [filter, setFilter] = useState('Tutto')
  const [openDays, setOpenDays] = useState<Set<number>>(new Set())
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string>('')
  const saveTimeout = useRef<ReturnType<typeof setTimeout>|null>(null)

  // modals
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState<Item|null>(null)
  const [actModal, setActModal] = useState<number|null>(null)
  const [dayModal, setDayModal] = useState(false)

  // form state - add item
  const [fVoce,setFVoce]=useState(''); const [fSec,setFSec]=useState(SECTIONS[0]); const [fCat,setFCat]=useState(CATS[0])
  const [fGiorno,setFGiorno]=useState(''); const [fCosto,setFCosto]=useState(''); const [fQuando,setFQuando]=useState(QUANDO_OPTS[0])
  const [fNote,setFNote]=useState(''); const [fCanc,setFCanc]=useState(false); const [fCancDate,setFCancDate]=useState('')

  // form state - edit item
  const [eVoce,setEVoce]=useState(''); const [eSec,setESec]=useState(SECTIONS[0]); const [eCat,setECat]=useState(CATS[0])
  const [eGiorno,setEGiorno]=useState(''); const [eCosto,setECosto]=useState(''); const [eQuando,setEQuando]=useState(QUANDO_OPTS[0])
  const [eNote,setENote]=useState(''); const [eCanc,setECanc]=useState(false); const [eCancDate,setECancDate]=useState('')

  // form state - activity
  const [aTitle,setATitle]=useState(''); const [aTime,setATime]=useState('09:00'); const [aType,setAType]=useState(ACT_TYPES[0]); const [aNote,setANote]=useState('')

  // form state - day
  const [dTitle,setDTitle]=useState(''); const [dDate,setDDate]=useState(''); const [dNum,setDNum]=useState(''); const [dPlace,setDPlace]=useState(''); const [dHotel,setDHotel]=useState('')

  /* ── LOAD ── */
  useEffect(() => {
    fetch('/api/data').then(r=>r.json()).then(d=>{ setData(d); setLastSync(new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})) })
    // poll every 15s for real-time sync
    const interval = setInterval(() => {
      fetch('/api/data').then(r=>r.json()).then(d=>{ setData(d); setLastSync(new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})) })
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  /* ── SAVE (debounced) ── */
  const save = useCallback((newData: AppData) => {
    setData(newData)
    setSyncing(true)
    if(saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newData)})
        .then(()=>{ setSyncing(false); setLastSync(new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})) })
        .catch(()=>setSyncing(false))
    }, 600)
  }, [])

  if(!data) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh',flexDirection:'column',gap:12,background:'#1A1208',color:'#E8B84B',fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{fontSize:'2rem'}}>🦙</div>
      <div style={{fontSize:'.9rem',color:'#aaa'}}>Caricamento Perù 2026…</div>
    </div>
  )

  /* ── MUTATIONS ── */
  const toggleItem = (id:number) => {
    save({...data, items: data.items.map(i=>i.id===id?{...i,done:!i.done}:i)})
  }
  const deleteItem = (id:number) => {
    if(!confirm('Eliminare questa voce?')) return
    save({...data, items: data.items.filter(i=>i.id!==id)})
  }
  const saveNewItem = () => {
    if(!fVoce.trim()) return
    const newItem:Item = {id:data.nextId,done:false,section:fSec,giorno:fGiorno,cat:fCat,voce:fVoce.trim(),quando:fQuando,costo:parseFloat(fCosto)||0,note:fNote,cancGratuita:fCanc,cancScadenza:fCanc?fCancDate:''}
    save({...data, items:[...data.items,newItem], nextId:data.nextId+1})
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
  const saveActivity = () => {
    if(!aTitle.trim()||actModal===null) return
    const typeIcon = aType.split(' ')[0]
    const newAct:Activity = {time:aTime,type:typeIcon,title:aTitle.trim(),note:aNote}
    save({...data, itinerary: data.itinerary.map(d=>d.id===actModal?{...d,activities:[...d.activities,newAct].sort((a,b)=>a.time.localeCompare(b.time))}:d)})
    setActModal(null); setATitle(''); setATime('09:00'); setANote('')
  }
  const saveDay = () => {
    if(!dTitle.trim()) return
    const newDay:Day = {id:data.nextId,date:dDate,day:parseInt(dNum)||0,title:dTitle.trim(),place:dPlace,hotel:dHotel,notes:'',activities:[]}
    save({...data, itinerary:[...data.itinerary,newDay], nextId:data.nextId+1})
    setDayModal(false); setDTitle(''); setDDate(''); setDNum(''); setDPlace(''); setDHotel('')
  }
  const deleteDay = (id:number) => {
    if(!confirm('Eliminare questo giorno?')) return
    save({...data, itinerary: data.itinerary.filter(d=>d.id!==id)})
  }
  const deleteActivity = (dayId:number, actIdx:number) => {
    if(!confirm('Eliminare questa attività?')) return
    save({...data, itinerary: data.itinerary.map(d=>d.id===dayId?{...d,activities:d.activities.filter((_,i)=>i!==actIdx)}:d)})
  }
  const saveNote = (id:number, field:'title'|'text', val:string) => {
    save({...data, notes: data.notes.map(n=>n.id===id?{...n,[field]:val}:n)})
  }
  const deleteNote = (id:number) => {
    if(!confirm('Eliminare?')) return
    save({...data, notes: data.notes.filter(n=>n.id!==id)})
  }
  const addNote = () => {
    const newNote:Note = {id:data.nextId,title:'Nuova nota',color:NOTE_COLORS[data.notes.length%NOTE_COLORS.length],text:''}
    save({...data, notes:[...data.notes,newNote], nextId:data.nextId+1})
  }

  /* ── COMPUTED ── */
  const total = data.items.reduce((s,i)=>s+i.costo,0)
  const doneCount = data.items.filter(i=>i.done).length
  const pct = Math.round(doneCount/data.items.length*100)
  const subito = data.items.filter(i=>i.quando==='SUBITO'&&!i.done).length
  const days = Math.ceil((new Date('2026-07-25').getTime()-new Date().getTime())/86400000)
  const spent = data.items.filter(i=>i.done).reduce((s,i)=>s+i.costo,0)

  /* ── STYLES ── */
  const s = {
    page: {height:'calc(100dvh - 62px - env(safe-area-inset-bottom,0px))',overflowY:'auto' as const,WebkitOverflowScrolling:'touch' as const},
    hdr: {background:'#1A1208',color:'#fff',padding:'14px 16px',position:'sticky' as const,top:0,zIndex:50},
    hdrTitle: {fontFamily:"'Playfair Display',serif",fontSize:'1.2rem',color:'#E8B84B'},
    hdrSub: {fontSize:'.74rem',color:'#aaa',marginTop:2},
    card: {margin:'0 16px 8px',background:'#fff',borderRadius:12,border:'1px solid #D4C4A0',overflow:'hidden'},
    secLabel: {padding:'12px 16px 5px',fontSize:'.67rem',fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.1em',color:'#7A6845',display:'flex',alignItems:'center',gap:5},
    btn: {flex:1,background:'#1A1208',border:'none',borderRadius:12,padding:14,fontFamily:"'DM Sans',sans-serif",fontSize:'.9rem',fontWeight:700,color:'#E8B84B',cursor:'pointer'},
    btnCancel: {flex:1,background:'#F0E8D0',border:'1.5px solid #D4C4A0',borderRadius:12,padding:14,fontFamily:"'DM Sans',sans-serif",fontSize:'.9rem',fontWeight:600,color:'#7A6845',cursor:'pointer'},
  }

  /* ── RENDER ── */
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:'#FAF6EE',color:'#2C2012',maxWidth:600,margin:'0 auto'}}>

      {/* ── SYNC INDICATOR ── */}
      {syncing && <div style={{position:'fixed',top:0,left:0,right:0,height:3,background:'#E8B84B',zIndex:999,animation:'none'}}/>}

      {/* ══ DASHBOARD ══ */}
      {page==='dashboard' && (
        <div style={s.page}>
          <div style={s.hdr}>
            <div style={s.hdrTitle}>🦙 Perù 2026</div>
            <div style={{...s.hdrSub,display:'flex',justifyContent:'space-between'}}>
              <span>25 lug – 6 ago · 13 notti · 2 persone</span>
              <span style={{color:syncing?'#E8B84B':'#555'}}>{syncing?'↑ salvataggio…':`↺ ${lastSync}`}</span>
            </div>
          </div>

          {/* Stats scroll */}
          <div style={{display:'flex',gap:10,padding:'14px 16px',overflowX:'auto',scrollbarWidth:'none'}}>
            {[
              {val:days>0?days:'✈',lbl:days>0?'Giorni':'Partito!',hi:true},
              {val:`${pct}%`,lbl:'Fatto'},
              {val:`${doneCount}/${data.items.length}`,lbl:'Voci ok'},
              {val:subito,lbl:'Urgenti',warn:subito>0},
              {val:fmtEur(total),lbl:'/persona',small:true},
            ].map((st,i)=>(
              <div key={i} style={{flexShrink:0,background:'#fff',border:'1px solid #D4C4A0',borderRadius:12,padding:'12px 14px',textAlign:'center',minWidth:80}}>
                <div style={{fontSize:st.small?'1rem':'1.4rem',fontWeight:700,color:st.hi?'#C9992A':st.warn?'#991B1B':'#1A1208',lineHeight:1}}>{st.val}</div>
                <div style={{fontSize:'.62rem',color:'#7A6845',textTransform:'uppercase',letterSpacing:'.06em',marginTop:3}}>{st.lbl}</div>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div style={{padding:'0 16px 16px'}}>
            <div style={{fontSize:'.68rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'#7A6845',padding:'14px 0 8px'}}>Avanzamento per categoria</div>
            {Object.entries(Object.fromEntries(
              Object.entries(data.items.reduce((acc,i)=>{ if(!acc[i.cat]) acc[i.cat]={t:0,d:0}; acc[i.cat].t++; if(i.done) acc[i.cat].d++; return acc },{} as Record<string,{t:number,d:number}>))
            )).map(([cat,v])=>{
              const p=Math.round(v.d/v.t*100), col=CAT_COLORS[cat]||'#999'
              return (
                <div key={cat} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:col,flexShrink:0}}/>
                  <div style={{fontSize:'.8rem',fontWeight:500,flex:1}}>{cat}</div>
                  <div style={{flex:2,background:'#F0E8D0',borderRadius:99,height:5}}>
                    <div style={{height:5,borderRadius:99,background:col,width:`${p}%`,transition:'width .5s'}}/>
                  </div>
                  <div style={{fontSize:'.72rem',color:'#7A6845',minWidth:30,textAlign:'right'}}>{p}%</div>
                </div>
              )
            })}
          </div>

          {/* Urgent */}
          <div style={{margin:'0 16px 12px',borderRadius:14,overflow:'hidden',border:'1px solid #D4C4A0'}}>
            <div style={{padding:'10px 14px',fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',background:'#FEE2E2',color:'#991B1B'}}>🚨 Da fare subito</div>
            {data.items.filter(i=>i.quando==='SUBITO'&&!i.done).length===0
              ? <div style={{padding:'11px 14px',background:'#fff',fontSize:'.86rem',color:'#3D5A2E'}}>✅ Tutto completato!</div>
              : data.items.filter(i=>i.quando==='SUBITO'&&!i.done).map(i=>(
                <div key={i.id} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',background:'#fff',borderTop:'1px solid #f0e8d0'}}>
                  <button onClick={()=>toggleItem(i.id)} style={{width:28,height:28,borderRadius:8,border:'2px solid #D4C4A0',background:'#fff',cursor:'pointer',flexShrink:0}}/>
                  <div style={{flex:1,fontSize:'.86rem',fontWeight:500}}>{i.voce}</div>
                  <div style={{fontSize:'.83rem',fontWeight:700,color:'#991B1B'}}>{fmtEur(i.costo)}</div>
                </div>
              ))
            }
          </div>

          {/* Recent */}
          <div style={{margin:'0 16px 16px',borderRadius:14,overflow:'hidden',border:'1px solid #D4C4A0'}}>
            <div style={{padding:'10px 14px',fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',background:'#DCFCE7',color:'#166534'}}>✅ Confermati recenti</div>
            {[...data.items].filter(i=>i.done).slice(-4).reverse().map(i=>(
              <div key={i.id} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',background:'#fff',borderTop:'1px solid #f0e8d0'}}>
                <span style={{color:'#3D5A2E',fontSize:'.9rem'}}>✓</span>
                <div style={{flex:1,fontSize:'.86rem',fontWeight:500}}>{i.voce}</div>
                <div style={{fontSize:'.83rem',fontWeight:700,color:'#3D5A2E'}}>{fmtEur(i.costo)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ CHECKLIST ══ */}
      {page==='checklist' && (
        <div style={s.page}>
          <div style={s.hdr}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><div style={s.hdrTitle}>Checklist</div><div style={s.hdrSub}>{doneCount}/{data.items.length} completati</div></div>
              <button onClick={()=>setAddModal(true)} style={{background:'none',border:'1px solid #E8B84B',borderRadius:8,color:'#E8B84B',padding:'7px 14px',fontSize:'.82rem',fontWeight:600,cursor:'pointer'}}>＋ Aggiungi</button>
            </div>
          </div>

          {/* Filter chips */}
          <div style={{display:'flex',gap:8,padding:'10px 16px',overflowX:'auto',scrollbarWidth:'none',position:'sticky',top:58,background:'#FAF6EE',zIndex:40,borderBottom:'1px solid #D4C4A0'}}>
            {['Tutto',...new Set(data.items.map(i=>i.cat))].map(c=>(
              <button key={c} onClick={()=>setFilter(c)} style={{flexShrink:0,padding:'6px 14px',borderRadius:99,border:`1px solid ${filter===c?'#1A1208':'#D4C4A0'}`,background:filter===c?'#1A1208':'#fff',color:filter===c?'#E8B84B':'#7A6845',fontFamily:"'DM Sans',sans-serif",fontSize:'.78rem',fontWeight:600,cursor:'pointer'}}>{c}</button>
            ))}
          </div>

          {SECTIONS.map(sec=>{
            let items = data.items.filter(i=>i.section===sec)
            if(filter!=='Tutto') items=items.filter(i=>i.cat===filter)
            if(!items.length) return null
            items=[...items].sort((a,b)=>{ if(a.done!==b.done) return a.done?1:-1; if(!a.giorno&&!b.giorno)return 0; if(!a.giorno)return 1; if(!b.giorno)return -1; return a.giorno.localeCompare(b.giorno) })
            return (
              <div key={sec}>
                <div style={s.secLabel}><span>{SECTION_ICONS[sec]}</span>{sec}</div>
                {items.map(i=>(
                  <div key={i.id} style={{...s.card,opacity:i.done?.5:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 10px 12px 12px'}}>
                      <button onClick={()=>toggleItem(i.id)} style={{width:28,height:28,borderRadius:8,border:`2px solid ${i.done?'#3D5A2E':'#D4C4A0'}`,background:i.done?'#3D5A2E':'#fff',color:'#fff',fontSize:14,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {i.done?'✓':''}
                      </button>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'.88rem',fontWeight:600,lineHeight:1.3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textDecoration:i.done?'line-through':'none'}}>{i.voce}</div>
                        <div style={{display:'flex',gap:6,marginTop:3,flexWrap:'wrap'}}>
                          {i.costo>0&&<span style={{fontSize:'.8rem',fontWeight:700,color:'#3D5A2E'}}>{fmtEur(i.costo)}</span>}
                          {i.giorno&&<span style={{fontSize:'.73rem',color:'#7A6845'}}>{fmtDate(i.giorno)}</span>}
                        </div>
                      </div>
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={()=>openEdit(i)} style={{width:34,height:34,border:'none',background:'#F0E8D0',borderRadius:8,fontSize:'.9rem',cursor:'pointer'}}>✏️</button>
                        <button onClick={()=>deleteItem(i.id)} style={{width:34,height:34,border:'none',background:'#F0E8D0',borderRadius:8,fontSize:'.9rem',cursor:'pointer'}}>🗑</button>
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

          {/* Total */}
          <div style={{margin:'8px 16px 16px',background:'#1A1208',borderRadius:14,padding:'15px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:'.72rem',color:'#aaa'}}>Totale / persona</div>
              <div style={{fontSize:'.68rem',color:'#777',marginTop:1}}>x2 = {fmtEur(total*2)} coppia</div>
            </div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:'1.55rem',fontWeight:700,color:'#E8B84B'}}>{fmtEur(total)}</div>
          </div>
          <div style={{height:80}}/>
        </div>
      )}

      {/* ══ ITINERARIO ══ */}
      {page==='itinerario' && (
        <div style={s.page}>
          <div style={s.hdr}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={s.hdrTitle}>Itinerario</div>
              <button onClick={()=>setDayModal(true)} style={{background:'none',border:'none',color:'#E8B84B',fontSize:'1.3rem',cursor:'pointer',padding:'4px 0 4px 12px'}}>＋</button>
            </div>
          </div>
          <div style={{height:10}}/>
          {[...data.itinerary].sort((a,b)=>a.day-b.day).map(day=>(
            <div key={day.id} style={{margin:'0 16px 10px',background:'#fff',borderRadius:14,border:'1px solid #D4C4A0',overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'stretch',cursor:'pointer'}} onClick={()=>setOpenDays(prev=>{ const n=new Set(prev); n.has(day.id)?n.delete(day.id):n.add(day.id); return n })}>
                <div style={{background:'#1A1208',color:'#E8B84B',fontFamily:"'Playfair Display',serif",fontSize:'1.05rem',fontWeight:700,padding:'13px 12px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minWidth:54,lineHeight:1,gap:2}}>
		{fmtDate(day.date)}<small style={{fontFamily:"'DM Sans',sans-serif",fontSize:'.58rem',color:'#aaa',fontWeight:400,textTransform:'uppercase'}}>G{day.day}</small>
                </div>
                <div style={{flex:1,padding:'12px 10px',minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
  					 <div style={{fontSize:'.9rem',fontWeight:700,lineHeight:1.3,flex:1}}>{day.title}</div>
  					 <button onClick={e=>{e.stopPropagation();deleteDay(day.id)}} style={{background:'none',border:'none',fontSize:'.85rem',color:'#555',cursor:'pointer',padding:'2px 4px'}}>🗑		  </button>
		  </div>
                  <div style={{fontSize:'.73rem',color:'#7A6845',marginTop:3,display:'flex',gap:8,flexWrap:'wrap'}}>
                    <span>📍 {day.place}</span>{day.hotel&&<span>🏨 {day.hotel}</span>}
                  </div>
                </div>
                <div style={{padding:12,display:'flex',alignItems:'center',color:'#7A6845',fontSize:'.9rem',transition:'transform .2s',transform:openDays.has(day.id)?'rotate(180deg)':'none'}}>▾</div>
              </div>
              {openDays.has(day.id)&&(
                <div style={{borderTop:'1px solid #F0E8D0'}}>
                  {day.activities.map((a,i)=>(
                    <div key={i} style={{display:'flex',gap:10,padding:'10px 14px',borderBottom:'1px solid #F0E8D0',alignItems:'flex-start'}}>
                      <div style={{fontSize:'.7rem',fontWeight:700,color:'#C9992A',minWidth:36,paddingTop:2}}>{a.time||'—'}</div>
                      <div style={{fontSize:'.95rem',paddingTop:1}}>{a.type}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'.84rem',fontWeight:600,lineHeight:1.3}}>{a.title}</div>
                        {a.note&&<div style={{fontSize:'.74rem',color:'#7A6845',marginTop:1}}>{a.note}</div>}
                      </div>
		    <button onClick={()=>deleteActivity(day.id,i)} style={{background:'none',border:'none',fontSize:'.85rem',color:'#ccc',cursor:'pointer',padding:'2px',flexShrink:0}}>🗑</button>
                    </div>
                  ))}
                  {day.notes&&<div style={{background:'#FFFBEB',padding:'9px 14px',fontSize:'.78rem',color:'#92400E',borderTop:'1px solid #F0E8D0'}}>📝 {day.notes}</div>}
                  <button onClick={()=>setActModal(day.id)} style={{width:'100%',background:'none',border:'none',borderTop:'1px dashed #D4C4A0',padding:11,fontFamily:"'DM Sans',sans-serif",fontSize:'.8rem',color:'#7A6845',cursor:'pointer'}}>＋ Aggiungi attività</button>
                </div>
              )}
            </div>
          ))}
          <div style={{height:80}}/>
        </div>
      )}

      {/* ══ BUDGET ══ */}
      {page==='budget' && (
        <div style={s.page}>
          <div style={s.hdr}><div style={s.hdrTitle}>Budget</div></div>
          <div style={{margin:'14px 16px',background:'linear-gradient(135deg, #1A1208, #2A1A08)',borderRadius:16,padding:20,color:'#fff'}}>
            <div style={{fontSize:'.7rem',color:'#aaa',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>Budget totale / persona</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:'2.1rem',fontWeight:700,color:'#E8B84B',lineHeight:1}}>{fmtEur(total)}</div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:14}}>
              {[{v:fmtEur(spent),l:'Confermato',c:'#86EFAC'},{v:fmtEur(total-spent),l:'Da prenotare',c:'#E8B84B'},{v:fmtEur(total*2),l:'Coppia',c:'#fff'}].map((st,i)=>(
                <div key={i}><div style={{fontSize:'1.05rem',fontWeight:700,color:st.c}}>{st.v}</div><div style={{fontSize:'.65rem',color:'#aaa'}}>{st.l}</div></div>
              ))}
            </div>
          </div>
          {/* By category */}
          {(() => {
            const byCat:{[k:string]:{b:number,s:number}} = {}
            data.items.forEach(i=>{ if(!byCat[i.cat]) byCat[i.cat]={b:0,s:0}; byCat[i.cat].b+=i.costo; if(i.done) byCat[i.cat].s+=i.costo })
            return (
              <div style={{margin:'0 16px 12px',background:'#fff',borderRadius:14,border:'1px solid #D4C4A0',overflow:'hidden'}}>
                <div style={{padding:'11px 14px 9px',fontSize:'.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'#7A6845',borderBottom:'1px solid #F0E8D0'}}>Per categoria</div>
                {Object.entries(byCat).map(([cat,v])=>(
                  <div key={cat} style={{display:'flex',alignItems:'center',padding:'10px 14px',borderBottom:'1px solid #F0E8D0',gap:10}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:CAT_COLORS[cat]||'#999',flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'.84rem',fontWeight:500}}>{cat}</div>
                      <div style={{fontSize:'.7rem',color:'#7A6845'}}>{fmtEur(v.s)} conf.</div>
                    </div>
                    <div style={{fontSize:'.86rem',fontWeight:700}}>{fmtEur(v.b)}</div>
                    <div style={{fontSize:'.7rem',color:'#7A6845',background:'#F0E8D0',padding:'2px 7px',borderRadius:99}}>{Math.round(v.b/total*100)}%</div>
                  </div>
                ))}
              </div>
            )
          })()}
          <div style={{height:80}}/>
        </div>
      )}

      {/* ══ NOTE ══ */}
      {page==='note' && (
        <div style={s.page}>
          <div style={s.hdr}><div style={s.hdrTitle}>Note</div></div>
          <div style={{padding:'10px 16px 16px',display:'flex',flexDirection:'column',gap:10}}>
            {data.notes.map(n=>(
              <div key={n.id} style={{background:'#fff',borderRadius:14,border:'1px solid #D4C4A0',overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'center',padding:'11px 14px 9px',gap:10}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:n.color,flexShrink:0}}/>
                  <input defaultValue={n.title} onBlur={e=>saveNote(n.id,'title',e.target.value)} style={{flex:1,border:'none',fontFamily:"'DM Sans',sans-serif",fontSize:'.9rem',fontWeight:700,color:'#2C2012',background:'transparent'}}/>
                  <button onClick={()=>deleteNote(n.id)} style={{background:'none',border:'none',fontSize:'.95rem',color:'#ccc',cursor:'pointer',padding:4}}>✕</button>
                </div>
                <textarea defaultValue={n.text} onBlur={e=>saveNote(n.id,'text',e.target.value)} style={{width:'100%',border:'none',borderTop:'1px solid #F0E8D0',fontFamily:"'DM Sans',sans-serif",fontSize:'.84rem',color:'#2C2012',padding:'10px 14px',background:'#FAF6EE',resize:'none',minHeight:88,lineHeight:1.5,boxSizing:'border-box'}}/>
              </div>
            ))}
          </div>
          <div style={{height:100}}/>
          <button onClick={addNote} style={{position:'fixed',bottom:'calc(70px + env(safe-area-inset-bottom,0px) + 14px)',right:16,width:50,height:50,background:'#1A1208',color:'#E8B84B',border:'none',borderRadius:'50%',fontSize:'1.4rem',cursor:'pointer',boxShadow:'0 4px 18px rgba(0,0,0,.25)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:150}}>＋</button>
        </div>
      )}

      {/* ══ BOTTOM NAV ══ */}
      <nav style={{position:'fixed',bottom:0,left:0,right:0,background:'#1A1208',display:'flex',zIndex:200,paddingBottom:'env(safe-area-inset-bottom,0px)',boxShadow:'0 -2px 20px rgba(0,0,0,.3)',maxWidth:600,margin:'0 auto'}}>
        {([['dashboard','🗺','Home'],['checklist','✅','Lista'],['itinerario','📅','Giorni'],['budget','💶','Budget'],['note','📝','Note']] as const).map(([id,ico,lbl])=>(
          <button key={id} onClick={()=>setPage(id)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'10px 4px 8px',border:'none',background:'none',color:page===id?'#E8B84B':'#777',fontFamily:"'DM Sans',sans-serif",fontSize:'.6rem',fontWeight:600,letterSpacing:'.05em',textTransform:'uppercase',cursor:'pointer',gap:3}}>
            <span style={{fontSize:'1.3rem',lineHeight:1}}>{ico}</span>{lbl}
            <div style={{width:4,height:4,borderRadius:'50%',background:'#E8B84B',visibility:page===id?'visible':'hidden'}}/>
          </button>
        ))}
      </nav>

      {/* ══ MODALS ══ */}

      {/* ADD ITEM */}
      {addModal&&(
        <Modal id="add" title="Aggiungi Voce" onClose={()=>setAddModal(false)}>
          <FG label="Voce / Attività"><input style={inputStyle} value={fVoce} onChange={e=>setFVoce(e.target.value)} placeholder="es. Volo Lima – Cusco"/></FG>
          <FRow>
            <FRowItem label="Sezione"><select style={inputStyle} value={fSec} onChange={e=>setFSec(e.target.value)}>{SECTIONS.map(s=><option key={s}>{s}</option>)}</select></FRowItem>
            <FRowItem label="Categoria"><select style={inputStyle} value={fCat} onChange={e=>setFCat(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></FRowItem>
          </FRow>
          <FRow>
            <FRowItem label="Data"><input style={inputStyle} type="date" value={fGiorno} onChange={e=>setFGiorno(e.target.value)}/></FRowItem>
            <FRowItem label="Costo €/pers."><input style={inputStyle} type="number" value={fCosto} onChange={e=>setFCosto(e.target.value)} placeholder="0"/></FRowItem>
          </FRow>
          <FG label="Quando prenotare"><select style={inputStyle} value={fQuando} onChange={e=>setFQuando(e.target.value)}>{QUANDO_OPTS.map(o=><option key={o}>{o}</option>)}</select></FG>
          <FG label="Note"><textarea style={{...inputStyle,minHeight:70,resize:'none'}} value={fNote} onChange={e=>setFNote(e.target.value)}/></FG>
          <div style={{margin:'10px 20px 0',background:'#ECFDF5',border:'1.5px solid #6EE7B7',borderRadius:10,padding:'12px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <input type="checkbox" id="fcanc" checked={fCanc} onChange={e=>setFCanc(e.target.checked)} style={{width:20,height:20,accentColor:'#3D5A2E',cursor:'pointer'}}/>
              <label htmlFor="fcanc" style={{fontSize:'.88rem',fontWeight:600,color:'#065F46',cursor:'pointer'}}>🟢 Cancellazione gratuita</label>
            </div>
            {fCanc&&<input style={{...inputStyle,marginTop:9,border:'1.5px solid #6EE7B7'}} type="date" value={fCancDate} onChange={e=>setFCancDate(e.target.value)}/>}
          </div>
          <div style={{display:'flex',gap:10,padding:'14px 20px 0'}}>
            <button style={s.btnCancel} onClick={()=>setAddModal(false)}>Annulla</button>
            <button style={s.btn} onClick={saveNewItem}>Aggiungi</button>
          </div>
        </Modal>
      )}

      {/* EDIT ITEM */}
      {editModal&&(
        <Modal id="edit" title="Modifica Voce" onClose={()=>setEditModal(null)}>
          <FG label="Voce / Attività"><input style={inputStyle} value={eVoce} onChange={e=>setEVoce(e.target.value)}/></FG>
          <FRow>
            <FRowItem label="Sezione"><select style={inputStyle} value={eSec} onChange={e=>setESec(e.target.value)}>{SECTIONS.map(s=><option key={s}>{s}</option>)}</select></FRowItem>
            <FRowItem label="Categoria"><select style={inputStyle} value={eCat} onChange={e=>setECat(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></FRowItem>
          </FRow>
          <FRow>
            <FRowItem label="Data"><input style={inputStyle} type="date" value={eGiorno} onChange={e=>setEGiorno(e.target.value)}/></FRowItem>
            <FRowItem label="Costo €/pers."><input style={inputStyle} type="number" value={eCosto} onChange={e=>setECosto(e.target.value)}/></FRowItem>
          </FRow>
          <FG label="Quando prenotare"><select style={inputStyle} value={eQuando} onChange={e=>setEQuando(e.target.value)}>{QUANDO_OPTS.map(o=><option key={o}>{o}</option>)}</select></FG>
          <FG label="Note"><textarea style={{...inputStyle,minHeight:70,resize:'none'}} value={eNote} onChange={e=>setENote(e.target.value)}/></FG>
          <div style={{margin:'10px 20px 0',background:'#ECFDF5',border:'1.5px solid #6EE7B7',borderRadius:10,padding:'12px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <input type="checkbox" id="ecanc" checked={eCanc} onChange={e=>setECanc(e.target.checked)} style={{width:20,height:20,accentColor:'#3D5A2E',cursor:'pointer'}}/>
              <label htmlFor="ecanc" style={{fontSize:'.88rem',fontWeight:600,color:'#065F46',cursor:'pointer'}}>🟢 Cancellazione gratuita</label>
            </div>
            {eCanc&&<input style={{...inputStyle,marginTop:9,border:'1.5px solid #6EE7B7'}} type="date" value={eCancDate} onChange={e=>setECancDate(e.target.value)}/>}
          </div>
          <div style={{display:'flex',gap:10,padding:'14px 20px 0'}}>
            <button style={s.btnCancel} onClick={()=>setEditModal(null)}>Annulla</button>
            <button style={s.btn} onClick={saveEdit}>Salva</button>
          </div>
        </Modal>
      )}

      {/* ADD ACTIVITY */}
      {actModal!==null&&(
        <Modal id="act" title={`Aggiungi attività – G${data.itinerary.find(d=>d.id===actModal)?.day}`} onClose={()=>setActModal(null)}>
          <FG label="Titolo"><input style={inputStyle} value={aTitle} onChange={e=>setATitle(e.target.value)} placeholder="es. Visita Machu Picchu"/></FG>
          <FRow>
            <FRowItem label="Ora"><input style={inputStyle} type="time" value={aTime} onChange={e=>setATime(e.target.value)}/></FRowItem>
            <FRowItem label="Tipo"><select style={inputStyle} value={aType} onChange={e=>setAType(e.target.value)}>{ACT_TYPES.map(t=><option key={t}>{t}</option>)}</select></FRowItem>
          </FRow>
          <FG label="Note"><input style={inputStyle} value={aNote} onChange={e=>setANote(e.target.value)} placeholder="es. Portare acqua"/></FG>
          <div style={{display:'flex',gap:10,padding:'14px 20px 0'}}>
            <button style={s.btnCancel} onClick={()=>setActModal(null)}>Annulla</button>
            <button style={s.btn} onClick={saveActivity}>Aggiungi</button>
          </div>
        </Modal>
      )}

      {/* ADD DAY */}
      {dayModal&&(
        <Modal id="day" title="Aggiungi Giorno" onClose={()=>setDayModal(false)}>
          <FG label="Titolo"><input style={inputStyle} value={dTitle} onChange={e=>setDTitle(e.target.value)} placeholder="es. Arequipa – Città Bianca"/></FG>
          <FRow>
            <FRowItem label="Data"><input style={inputStyle} type="date" value={dDate} onChange={e=>setDDate(e.target.value)}/></FRowItem>
            <FRowItem label="N° Giorno"><input style={inputStyle} type="number" value={dNum} onChange={e=>setDNum(e.target.value)}/></FRowItem>
          </FRow>
          <FRow>
            <FRowItem label="Luogo"><input style={inputStyle} value={dPlace} onChange={e=>setDPlace(e.target.value)} placeholder="es. Arequipa"/></FRowItem>
            <FRowItem label="Alloggio"><input style={inputStyle} value={dHotel} onChange={e=>setDHotel(e.target.value)} placeholder="es. Hostal"/></FRowItem>
          </FRow>
          <div style={{display:'flex',gap:10,padding:'14px 20px 0'}}>
            <button style={s.btnCancel} onClick={()=>setDayModal(false)}>Annulla</button>
            <button style={s.btn} onClick={saveDay}>Aggiungi</button>
          </div>
        </Modal>
      )}

    </div>
  )
}
