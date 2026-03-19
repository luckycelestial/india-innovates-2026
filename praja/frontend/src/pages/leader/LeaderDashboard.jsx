import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import SentinelHeatmap from '../../components/SentinelHeatmap'

// ─── DESIGN TOKENS ──────────────────────────────────────────────
const SAFFRON = "#FF6B00"
const GOLD    = "#f59e0b"
const GREEN   = "#22c55e"
const NAVY    = "#080f1e"
const CARD    = "#111d35"
const BORDER  = "#1e2d4d"
const MUTED   = "#64748b"
const LIGHT   = "#94a3b8"
const TEXT    = "#e2e8f0"
const RED     = "#ef4444"
const BLUE    = "#3b82f6"

const WARD_DATA = [
  { id:1,  name:"Ward 1 — Connaught Place", score:72, issues:["Road maintenance","Parking"],                 trending:"+5%"  },
  { id:3,  name:"Ward 3 — Karol Bagh",      score:38, issues:["Garbage collection","Water shortage"],        trending:"-12%" },
  { id:7,  name:"Ward 7 — Rohini",           score:21, issues:["Water supply","Power cuts","Drainage"],      trending:"-23%" },
  { id:11, name:"Ward 11 — Dwarka",          score:61, issues:["Traffic lights","Park maintenance"],         trending:"+8%"  },
  { id:14, name:"Ward 14 — Saket",           score:45, issues:["Street lights","Potholes"],                  trending:"-6%"  },
  { id:19, name:"Ward 19 — Okhla",           score:18, issues:["Sewage","Flooding","Healthcare access"],     trending:"-31%" },
  { id:22, name:"Ward 22 — Lajpat Nagar",    score:54, issues:["Road conditions","Noise"],                  trending:"-4%"  },
  { id:28, name:"Ward 28 — Janakpuri",       score:83, issues:["Minor road issues"],                        trending:"+11%" },
]

function scoreColor(s){if(s>=70)return GREEN;if(s>=45)return GOLD;if(s>=25)return SAFFRON;return RED}
function Tag({children,color=SAFFRON}){return<span style={{display:"inline-block",padding:"2px 10px",borderRadius:20,fontSize:"0.7rem",fontWeight:700,background:`${color}22`,border:`1px solid ${color}55`,color}}>{children}</span>}
function MiniBar({value,color,label}){return(<div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:"0.75rem",marginBottom:4}}><span style={{color:TEXT}}>{label}</span><span style={{color:MUTED}}>{value}%</span></div><div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:3}}><div style={{width:`${value}%`,height:"100%",borderRadius:3,background:`linear-gradient(90deg,${color},${color}99)`,transition:"width 1s ease"}} /></div></div>)}

function HeatMapGrid({selectedWard,onSelect}){return(<div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>{WARD_DATA.map(w=>(<div key={w.id} onClick={()=>onSelect(w)} style={{background:`${scoreColor(w.score)}22`,border:`2px solid ${selectedWard?.id===w.id?scoreColor(w.score):scoreColor(w.score)+"55"}`,borderRadius:10,padding:"10px 8px",cursor:"pointer",transition:"all 0.2s",transform:selectedWard?.id===w.id?"scale(1.04)":"scale(1)"}}><div style={{fontSize:"0.65rem",color:MUTED,marginBottom:2}}>Ward {w.id}</div><div style={{fontSize:"1.4rem",fontWeight:900,color:scoreColor(w.score)}}>{w.score}</div><div style={{fontSize:"0.62rem",color:scoreColor(w.score),fontWeight:700}}>{w.trending}</div></div>))}</div><div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:"0.72rem"}}>{[{label:"Satisfied 70+",c:GREEN},{label:"Moderate 45–70",c:GOLD},{label:"Tense 25–45",c:SAFFRON},{label:"Crisis <25",c:RED}].map(l=>(<div key={l.label} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:l.c}}/><span style={{color:LIGHT}}>{l.label}</span></div>))}</div></div>)}





export default function LeaderDashboard() {
  const { user, logout } = useAuth()
  const [activeModule, setActiveModule] = useState("grievance")
  const [selectedWard, setSelectedWard] = useState(null)
  const [liveAlerts, setLiveAlerts] = useState([])
  const [tickets, setTickets] = useState([])
  const [ticketLoading, setTL] = useState(false)

  useEffect(() => {
    if (activeModule === "grievance" && tickets.length === 0) loadTickets()
    if (activeModule === "sentinel") loadAlerts()
  }, [activeModule])

  async function loadTickets() {
    setTL(true)
    try { const { data } = await api.get('/officers/tickets', { params: { limit: 50 } }); setTickets(Array.isArray(data) ? data : (data.items || [])) }
    catch (e) { console.error(e) } finally { setTL(false) }
  }
  async function loadAlerts() {
    try { const { data } = await api.get('/sentinel/alerts'); setLiveAlerts(Array.isArray(data) ? data : (data.alerts || [])) }
    catch (e) { console.error(e) }
  }

  const open = tickets.filter(t => t.status === 'open').length
  const escalated = tickets.filter(t => t.status === 'escalated').length
  const inProgress = tickets.filter(t => t.status === 'in_progress').length
  const resolved = tickets.filter(t => t.status === 'resolved').length

    { id: "grievance", label: "GrievanceOS",   icon: "📋", sub: "Ticket Overview" },
    { id: "sentinel",  label: "SentinelPulse", icon: "🗺️", sub: "Heatmap" },
  ]

  function pColor(p){return p==="critical"?RED:p==="high"?SAFFRON:p==="medium"?GOLD:LIGHT}
  function sColor(s){return s==="resolved"?GREEN:s==="escalated"?RED:s==="in_progress"?BLUE:LIGHT}
  function sBg(s){return s==="resolved"?"rgba(34,197,94,0.15)":s==="escalated"?"rgba(239,68,68,0.15)":s==="in_progress"?"rgba(59,130,246,0.15)":"rgba(255,255,255,0.06)"}

  return (
    <div style={{ display:"flex", height:"100vh", background:NAVY, fontFamily:"'Segoe UI', system-ui, sans-serif", color:TEXT, fontSize:"14px" }}>
      {/* SIDEBAR */}
      <div style={{ width:200, background:"#0d1526", borderRight:`1px solid ${BORDER}`, display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"20px 18px", borderBottom:`1px solid ${BORDER}` }}>
          <div style={{ fontSize:"1.4rem", fontWeight:900, color:SAFFRON, letterSpacing:-1 }}>PRAJA</div>
          <div style={{ fontSize:"0.62rem", color:MUTED, letterSpacing:2, textTransform:"uppercase" }}>Governance AI</div>
        </div>
        <div style={{ padding:"12px 0", flex:1 }}>
          <div style={{ fontSize:"0.58rem", letterSpacing:2, color:MUTED, padding:"8px 18px 4px", fontWeight:700, textTransform:"uppercase" }}>Modules</div>
          {navItems.map(n => (
            <div key={n.id} onClick={() => setActiveModule(n.id)} style={{ padding:"10px 18px", cursor:"pointer", borderLeft:`3px solid ${activeModule===n.id?SAFFRON:"transparent"}`, background:activeModule===n.id?`${SAFFRON}11`:"transparent", transition:"all 0.15s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:"1rem" }}>{n.icon}</span>
                <div>
                  <div style={{ fontSize:"0.82rem", fontWeight:700, color:activeModule===n.id?"#fff":LIGHT }}>{n.label}</div>
                  <div style={{ fontSize:"0.65rem", color:MUTED }}>{n.sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:"14px 18px", borderTop:`1px solid ${BORDER}`, fontSize:"0.72rem", color:MUTED }}>
          <div style={{ fontWeight:700, color:TEXT, marginBottom:2 }}>{user?.full_name || user?.name || "Leader"}</div>
          <div>Delhi North</div>
          <div style={{ marginTop:6, display:"flex", gap:4, alignItems:"center" }}><div style={{ width:6, height:6, borderRadius:"50%", background:GREEN }} /><span style={{ color:GREEN, fontSize:"0.65rem" }}>Live</span></div>
          <button onClick={logout} style={{ marginTop:10, width:"100%", padding:"6px 0", borderRadius:6, border:`1px solid ${BORDER}`, background:"transparent", color:MUTED, fontSize:"0.72rem", cursor:"pointer" }}>Sign Out</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, overflow:"auto" }}>
        <div style={{ padding:"14px 28px", borderBottom:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:"#0d1526", position:"sticky", top:0, zIndex:10 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:"1rem" }}>
              {activeModule==="grievance"&&"GrievanceOS — Ticket Overview"}
              {activeModule==="sentinel"&&"SentinelPulse — Constituency Heatmap"}
            </div>
            <div style={{ fontSize:"0.72rem", color:MUTED }}>India Innovates 2026 · Delhi North Constituency</div>
          </div>
          {escalated>0&&<div style={{ padding:"6px 14px", borderRadius:20, background:`${RED}22`, border:`1px solid ${RED}55`, color:RED, fontSize:"0.75rem", fontWeight:700 }}>🚨 {escalated} Escalated</div>}
        </div>

        <div style={{ padding:24 }}>
          {/* GRIEVANCE */}
          {activeModule==="grievance"&&(
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
                {[["Open",open,SAFFRON,"📋"],["Escalated",escalated,RED,"🚨"],["In Progress",inProgress,BLUE,"⚙️"],["Resolved",resolved,GREEN,"✅"]].map(([lbl,val,color,icon])=>(
                  <div key={lbl} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:"16px 18px", borderTop:`3px solid ${color}` }}>
                    <div style={{ fontSize:"1.5rem", marginBottom:4 }}>{icon}</div>
                    <div style={{ fontSize:"1.8rem", fontWeight:900, color }}>{val}</div>
                    <div style={{ fontSize:"0.75rem", color:MUTED }}>{lbl}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14 }}>
                <div style={{ padding:"16px 20px", borderBottom:`1px solid ${BORDER}`, fontWeight:800 }}>Live Ticket Queue</div>
                <div style={{ overflow:"auto" }}>
                  {ticketLoading?<div style={{ padding:40, textAlign:"center", color:MUTED }}>Loading...</div>:tickets.length===0?<div style={{ padding:40, textAlign:"center", color:MUTED }}>No tickets.</div>:tickets.slice(0,30).map((t,i)=>(
                    <div key={t.id||i} style={{ padding:"14px 20px", borderBottom:`1px solid ${BORDER}44`, display:"grid", gridTemplateColumns:"160px 1fr 90px 120px 80px", gap:12, alignItems:"center" }}>
                      <div><div style={{ fontWeight:700, fontSize:"0.78rem", color:SAFFRON }}>{t.tracking_id||t.id?.slice(0,8)}</div><div style={{ fontSize:"0.68rem", color:MUTED }}>{t.created_at?new Date(t.created_at).toLocaleDateString():"—"}</div></div>
                      <div><div style={{ fontSize:"0.83rem", color:TEXT, marginBottom:2 }}>{t.title||t.description?.slice(0,60)}</div><Tag color={BLUE}>{t.ai_category||"General"}</Tag></div>
                      <div><Tag color={pColor(t.priority)}>{t.priority?.toUpperCase()}</Tag></div>
                      <div><span style={{ padding:"3px 8px", borderRadius:6, fontSize:"0.72rem", background:sBg(t.status), color:sColor(t.status), fontWeight:600 }}>{t.status?.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}</span></div>
                      <div style={{ fontSize:"0.75rem", color:LIGHT }}>{t.channel==="whatsapp"?"📱 WA":"🌐 Web"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* SENTINEL */}
          {activeModule==="sentinel"&&(
            <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20 }}>
              <div>
                <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:20, marginBottom:16 }}>
                  <div style={{ fontWeight:800, marginBottom:4 }}>Constituency Sentiment Heatmap</div>
                  <div style={{ fontSize:"0.78rem", color:MUTED, marginBottom:18 }}>Delhi North · Ward scores · Click a ward for details</div>
                  <HeatMapGrid selectedWard={selectedWard} onSelect={setSelectedWard} />
                </div>
                {selectedWard&&(
                  <div style={{ background:CARD, border:`2px solid ${scoreColor(selectedWard.score)}55`, borderRadius:14, padding:20, marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                      <div><div style={{ fontWeight:800, fontSize:"1rem" }}>{selectedWard.name}</div><div style={{ fontSize:"0.75rem", color:MUTED }}>Drilldown View</div></div>
                      <div style={{ textAlign:"right" }}><div style={{ fontSize:"2rem", fontWeight:900, color:scoreColor(selectedWard.score) }}>{selectedWard.score}</div><div style={{ fontSize:"0.75rem", color:scoreColor(selectedWard.score), fontWeight:700 }}>Sentiment Score {selectedWard.trending}</div></div>
                    </div>
                    {selectedWard.issues.map((issue,i)=>(<div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", marginBottom:6, background:"rgba(255,255,255,0.03)", borderRadius:8, border:`1px solid ${BORDER}` }}><div style={{ width:6, height:6, borderRadius:"50%", background:scoreColor(selectedWard.score), flexShrink:0 }}/><div style={{ fontSize:"0.84rem", color:TEXT }}>{issue}</div><div style={{ marginLeft:"auto", fontSize:"0.72rem", color:RED, fontWeight:700 }}>↑ trending</div></div>))}
                    <div style={{ background:`${SAFFRON}11`, border:`1px solid ${SAFFRON}44`, borderRadius:8, padding:12, fontSize:"0.8rem", color:TEXT, marginTop:12 }}><strong style={{ color:SAFFRON }}>AI Recommendation:</strong> Schedule a public grievance camp within 48 hours. Prioritize {selectedWard.issues[0].toLowerCase()} resolution.</div>
                  </div>
                )}
                <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:20 }}>
                  <div style={{ fontWeight:800, marginBottom:4 }}>Leaflet Map View</div>
                  <div style={{ fontSize:"0.78rem", color:MUTED, marginBottom:14 }}>Live grievance density on OpenStreetMap</div>
                  <SentinelHeatmap />
                </div>
              </div>
              <div>
                <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:16, marginBottom:14 }}>
                  <div style={{ fontWeight:700, marginBottom:12 }}>🔥 Alert Feed</div>
                  {(liveAlerts.length>0?liveAlerts:[
                    {title:"Ward 19: Sewage overflow — 234 posts",type:"critical_grievance",severity:"critical"},
                    {title:"Ward 7: Water shortage spike +62%",type:"sla_breach",severity:"high"},
                    {title:"Ward 3: Garbage collection flagged",type:"escalated",severity:"medium"},
                  ]).map((a,i)=>(
                    <div key={i} style={{ padding:"10px 0", borderBottom:`1px solid ${BORDER}44`, display:"flex", gap:10 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:a.severity==="critical"?RED:SAFFRON, marginTop:4, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize:"0.7rem", color:a.severity==="critical"?RED:SAFFRON, fontWeight:700 }}>{a.type?.replace(/_/g," ").toUpperCase()}</div>
                        <div style={{ fontSize:"0.78rem", color:TEXT }}>{a.title}</div>
                        {a.description&&<div style={{ fontSize:"0.72rem", color:MUTED }}>{a.description?.slice(0,80)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:16 }}>
                  <div style={{ fontWeight:700, marginBottom:12 }}>📈 Issue Trends</div>
                  {[{issue:"Water Shortage",pct:78,color:BLUE},{issue:"Power Cuts",pct:54,color:GOLD},{issue:"Road Potholes",pct:42,color:SAFFRON},{issue:"Sewage Issues",pct:81,color:RED},{issue:"Garbage",pct:35,color:"#a855f7"}].map(t=><MiniBar key={t.issue} value={t.pct} color={t.color} label={t.issue}/>)}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:${NAVY}}::-webkit-scrollbar-thumb{background:${BORDER};border-radius:2px}*{box-sizing:border-box}button:hover{opacity:0.85}textarea:focus,input:focus,select:focus{outline:1px solid ${SAFFRON}}`}</style>
    </div>
  )
}