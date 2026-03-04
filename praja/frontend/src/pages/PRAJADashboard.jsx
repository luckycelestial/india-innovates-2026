import { useState } from "react";
import api from "../services/api";

const SAFFRON = "#FF6B00";
const GOLD = "#f59e0b";
const GREEN = "#22c55e";
const NAVY = "#080f1e";
const CARD = "#111d35";
const BORDER = "#1e2d4d";
const MUTED = "#64748b";
const LIGHT = "#94a3b8";
const TEXT = "#e2e8f0";
const RED = "#ef4444";
const BLUE = "#3b82f6";

// ─── SAMPLE DATA ───────────────────────────────────────────────
const SAMPLE_TICKETS = [
  { id: "GRV-001", citizen: "Ravi Kumar", lang: "Hindi", issue: "Broken streetlight on MG Road", dept: "Electricity", priority: "P1", status: "Open", ward: "Ward 14", time: "2 min ago", sentiment: "Angry" },
  { id: "GRV-002", citizen: "Priya Lakshmi", lang: "Tamil", issue: "Water supply cut for 3 days", dept: "Water", priority: "P0", status: "Escalated", ward: "Ward 7", time: "15 min ago", sentiment: "Urgent" },
  { id: "GRV-003", citizen: "Mohammed Iqbal", lang: "Hindi", issue: "Pothole causing accidents", dept: "Roads", priority: "P1", status: "In Progress", ward: "Ward 22", time: "1 hr ago", sentiment: "Angry" },
  { id: "GRV-004", citizen: "Sunita Devi", lang: "Bengali", issue: "Garbage not collected for a week", dept: "Sanitation", priority: "P2", status: "Open", ward: "Ward 3", time: "3 hr ago", sentiment: "Frustrated" },
  { id: "GRV-005", citizen: "Arjun Nair", lang: "Malayalam", issue: "Sewage overflow near school", dept: "Sanitation", priority: "P0", status: "Open", ward: "Ward 19", time: "5 hr ago", sentiment: "Urgent" },
  { id: "GRV-006", citizen: "Kavitha Rao", lang: "Telugu", issue: "Road light not working for 2 weeks", dept: "Electricity", priority: "P2", status: "Resolved", ward: "Ward 11", time: "1 day ago", sentiment: "Neutral" },
];

const WARD_DATA = [
  { id: 1, name: "Ward 1 — Connaught Place", score: 72, issues: ["Road maintenance", "Parking"], trending: "+5%" },
  { id: 3, name: "Ward 3 — Karol Bagh", score: 38, issues: ["Garbage collection", "Water shortage"], trending: "-12%" },
  { id: 7, name: "Ward 7 — Rohini", score: 21, issues: ["Water supply", "Power cuts", "Drainage"], trending: "-23%" },
  { id: 11, name: "Ward 11 — Dwarka", score: 61, issues: ["Traffic lights", "Park maintenance"], trending: "+8%" },
  { id: 14, name: "Ward 14 — Saket", score: 45, issues: ["Street lights", "Potholes"], trending: "-6%" },
  { id: 19, name: "Ward 19 — Okhla", score: 18, issues: ["Sewage", "Flooding", "Healthcare access"], trending: "-31%" },
  { id: 22, name: "Ward 22 — Lajpat Nagar", score: 54, issues: ["Road conditions", "Noise"], trending: "-4%" },
  { id: 28, name: "Ward 28 — Janakpuri", score: 83, issues: ["Minor road issues"], trending: "+11%" },
];

const MORNING_BRIEF = {
  date: "Wednesday, March 5, 2026",
  topIssues: [
    { topic: "Water Shortage", wards: "Ward 7, 14, 22", tickets: 47, trend: "↑ 34%" },
    { topic: "Power Outages", wards: "Ward 3, 19, 11", tickets: 29, trend: "↑ 18%" },
    { topic: "Road Potholes", wards: "Ward 22, 14", tickets: 23, trend: "→ stable" },
    { topic: "Sewage Overflow", wards: "Ward 19", tickets: 15, trend: "↑ 62%" },
    { topic: "Garbage Collection", wards: "Ward 3, 7", tickets: 12, trend: "↓ 8%" },
  ],
  slaViolations: 8,
  viralAlert: { ward: "Ward 19", issue: "Sewage overflow", posts: 234, velocity: "HIGH" },
  schedule: [
    { time: "10:00 AM", event: "Inauguration — Community Park, Sector 12" },
    { time: "2:30 PM", event: "Constituency Meeting — Ward Development Committee" },
    { time: "5:00 PM", event: "RTI Response Deadline — Water Dept" },
  ],
};

const DEPT_STATS = [
  { name: "Water", open: 47, resolved: 12, sla: 38, color: BLUE },
  { name: "Roads", open: 29, resolved: 34, sla: 72, color: SAFFRON },
  { name: "Sanitation", open: 31, resolved: 19, sla: 55, color: "#a855f7" },
  { name: "Electricity", open: 18, resolved: 41, sla: 81, color: GOLD },
  { name: "Health", open: 9, resolved: 28, sla: 76, color: GREEN },
];

// ─── HELPERS ───────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 70) return GREEN;
  if (s >= 45) return GOLD;
  if (s >= 25) return SAFFRON;
  return RED;
}
function priorityColor(p) {
  return p === "P0" ? RED : p === "P1" ? SAFFRON : p === "P2" ? GOLD : LIGHT;
}
function statusBg(s) {
  return s === "Resolved" ? "rgba(34,197,94,0.15)" : s === "Escalated" ? "rgba(239,68,68,0.15)" : s === "In Progress" ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)";
}
function statusColor(s) {
  return s === "Resolved" ? GREEN : s === "Escalated" ? RED : s === "In Progress" ? BLUE : LIGHT;
}

// ─── COMPONENTS ─────────────────────────────────────────────────

function Tag({ children, color = SAFFRON }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: "0.7rem",
      fontWeight: 700,
      background: `${color}22`,
      border: `1px solid ${color}55`,
      color,
    }}>{children}</span>
  );
}

function MiniBar({ value, color, label }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 4 }}>
        <span style={{ color: TEXT }}>{label}</span>
        <span style={{ color: MUTED }}>{value}%</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
        <div style={{ width: `${value}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${color}, ${color}99)`, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

// ─── WHATSAPP SIMULATION ────────────────────────────────────────
function WhatsAppDemo({ onNewTicket }) {
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState(false);
  const msgs = [
    { from: "citizen", text: "नमस्ते, वार्ड 14 में MG रोड पर स्ट्रीटलाइट टूटी हुई है। 3 दिनों से अँधेरा है। कृपया जल्दी ठीक करें।" },
    { from: "bot", text: "🤖 AI Processing...\n\n✅ Language: Hindi\n🏷 Department: Electricity\n⚡ Priority: P1 (High)\n📍 Location: Ward 14 — MG Road\n😤 Sentiment: Angry\n\nTicket #GRV-007 created. Routed to Electricity Department. Officer notified via SMS." },
    { from: "citizen", text: "Thank you! When will it be fixed?" },
    { from: "bot", text: "🎯 SLA Timeline: 72 hours\n📅 Resolution by: March 7, 11:00 PM\n\nYour complaint has been assigned to Officer Ramesh Kumar (Electricity Dept). You'll receive updates via WhatsApp.\n\nTrack your complaint: praja.gov.in/track/GRV-007" },
  ];
  const visibleMsgs = msgs.slice(0, step);

  function next() {
    if (step < msgs.length) {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setStep(s => s + 1);
        if (step === 1) onNewTicket();
      }, 1500);
    }
  }

  return (
    <div style={{ background: "#0a1628", border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", maxWidth: 380 }}>
      <div style={{ background: "#128C7E", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>👨</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>PRAJA GrievanceOS</div>
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.7)" }}>+91-1800-PRAJA</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: "0.75rem", background: "#25D366", padding: "3px 8px", borderRadius: 4, color: "#fff" }}>WhatsApp</div>
      </div>
      <div style={{ padding: 14, minHeight: 220, background: "url(\"data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='rgba(255,255,255,0.015)'/%3E%3C/svg%3E\")" }}>
        {visibleMsgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.from === "citizen" ? "flex-end" : "flex-start", marginBottom: 10 }}>
            <div style={{
              maxWidth: "85%",
              padding: "8px 12px",
              borderRadius: m.from === "citizen" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: m.from === "citizen" ? "#005c4b" : "#1f2c3e",
              fontSize: "0.78rem",
              color: TEXT,
              lineHeight: 1.5,
              whiteSpace: "pre-line",
            }}>{m.text}</div>
          </div>
        ))}
        {typing && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
            <div style={{ padding: "10px 14px", borderRadius: "12px 12px 12px 2px", background: "#1f2c3e" }}>
              <span style={{ color: LIGHT, fontSize: "0.8rem" }}>●●● typing...</span>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${BORDER}` }}>
        {step < msgs.length ? (
          <button onClick={next} style={{
            width: "100%", padding: "9px", borderRadius: 8, border: "none",
            background: "#128C7E", color: "#fff", fontWeight: 700, fontSize: "0.83rem", cursor: "pointer"
          }}>
            {step === 0 ? "📱 Send Complaint (Hindi)" : step === 1 ? "💬 Ask Status" : step === 2 ? "🤖 Get Response" : ""}
          </button>
        ) : (
          <div style={{ textAlign: "center", color: GREEN, fontSize: "0.82rem", fontWeight: 700 }}>✅ Ticket Created & Routed!</div>
        )}
      </div>
    </div>
  );
}

// ─── HEATMAP ────────────────────────────────────────────────────
function HeatMap({ selectedWard, onSelect }) {
  const wards = WARD_DATA;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {wards.map(w => (
          <div key={w.id} onClick={() => onSelect(w)} style={{
            background: `${scoreColor(w.score)}22`,
            border: `2px solid ${selectedWard?.id === w.id ? scoreColor(w.score) : scoreColor(w.score) + "55"}`,
            borderRadius: 10,
            padding: "10px 8px",
            cursor: "pointer",
            transition: "all 0.2s",
            transform: selectedWard?.id === w.id ? "scale(1.04)" : "scale(1)",
          }}>
            <div style={{ fontSize: "0.65rem", color: MUTED, marginBottom: 2 }}>Ward {w.id}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: scoreColor(w.score) }}>{w.score}</div>
            <div style={{ fontSize: "0.62rem", color: scoreColor(w.score), fontWeight: 700 }}>{w.trending}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: "0.72rem" }}>
        {[{ label: "Satisfied 70+", c: GREEN }, { label: "Moderate 45–70", c: GOLD }, { label: "Tense 25–45", c: SAFFRON }, { label: "Crisis <25", c: RED }].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.c }} />
            <span style={{ color: LIGHT }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NAYAK AI ────────────────────────────────────────────────────
function NayakAI() {
  const [activeTab, setActiveTab] = useState("brief");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState("");
  const [speechTopic, setSpeechTopic] = useState("");
  const [speechLang, setSpeechLang] = useState("English");

  const tabs = [
    { id: "brief", label: "☀️ Morning Brief" },
    { id: "doc", label: "📄 Doc Summarizer" },
    { id: "speech", label: "✍️ Speech Drafter" },
  ];

  async function callBackend(text, mode) {
    setLoading(true);
    setAiOutput("");
    try {
      const res = await api.post("/nayakai/assist", { text, mode });
      setAiOutput(res.data.result || "No response received.");
    } catch (e) {
      setAiOutput("⚠️ Connection error. Please check your network or try again.");
    }
    setLoading(false);
  }

  function runDocSummarizer() {
    if (!prompt.trim()) return;
    callBackend(prompt, "summarize");
  }

  function runSpeechDrafter() {
    if (!speechTopic.trim()) return;
    callBackend(
      `Event: ${speechTopic}. Language: ${speechLang}. Constituency: Delhi North Constituency.`,
      "speech"
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setAiOutput(""); }} style={{
            padding: "7px 14px", borderRadius: 8, border: `1px solid ${activeTab === t.id ? SAFFRON : BORDER}`,
            background: activeTab === t.id ? `${SAFFRON}22` : "transparent",
            color: activeTab === t.id ? SAFFRON : LIGHT,
            fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === "brief" && (
        <div>
          <div style={{ background: `${SAFFRON}11`, border: `1px solid ${SAFFRON}44`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: "0.65rem", color: SAFFRON, letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>MORNING BRIEF</div>
            <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 2 }}>Good morning, MLA Sharma</div>
            <div style={{ fontSize: "0.75rem", color: MUTED }}>{MORNING_BRIEF.date}</div>
          </div>
          <div style={{ background: `${RED}11`, border: `1px solid ${RED}44`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: RED, marginBottom: 6 }}>🔥 VIRAL ALERT — Immediate Attention Required</div>
            <div style={{ fontSize: "0.82rem", color: TEXT }}>{MORNING_BRIEF.viralAlert.ward} — <strong>{MORNING_BRIEF.viralAlert.issue}</strong></div>
            <div style={{ fontSize: "0.75rem", color: LIGHT }}>📊 {MORNING_BRIEF.viralAlert.posts} posts in last 2 hrs · Velocity: <span style={{ color: RED, fontWeight: 700 }}>{MORNING_BRIEF.viralAlert.velocity}</span></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: "0.65rem", color: MUTED, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>TOP 5 BURNING ISSUES</div>
            {MORNING_BRIEF.topIssues.map((issue, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", marginBottom: 6, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.84rem", color: TEXT }}>{issue.topic}</div>
                  <div style={{ fontSize: "0.72rem", color: MUTED }}>{issue.wards}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: TEXT, fontSize: "0.9rem" }}>{issue.tickets}</div>
                  <div style={{ fontSize: "0.7rem", color: issue.trend.includes("↑") ? RED : issue.trend.includes("↓") ? GREEN : GOLD }}>{issue.trend}</div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: "0.65rem", color: MUTED, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>TODAY'S SCHEDULE</div>
            {MORNING_BRIEF.schedule.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${BORDER}44` }}>
                <div style={{ fontSize: "0.75rem", color: SAFFRON, fontWeight: 700, minWidth: 65 }}>{s.time}</div>
                <div style={{ fontSize: "0.82rem", color: TEXT }}>{s.event}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "doc" && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: "0.78rem", color: LIGHT, marginBottom: 8 }}>Paste a document excerpt or describe a government scheme/policy:</div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. PM Awas Yojana — Urban Housing Scheme guidelines and eligibility criteria..."
              rows={4}
              style={{
                width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${BORDER}`,
                background: "#0d1526", color: TEXT, fontSize: "0.83rem", resize: "vertical",
                fontFamily: "inherit", lineHeight: 1.5,
              }}
            />
          </div>
          <button onClick={runDocSummarizer} disabled={loading || !prompt.trim()} style={{
            padding: "9px 20px", borderRadius: 8, border: "none",
            background: loading ? MUTED : `linear-gradient(90deg, ${SAFFRON}, ${GOLD})`,
            color: "#000", fontWeight: 700, fontSize: "0.83rem", cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 16,
          }}>
            {loading ? "⏳ Summarizing..." : "🧠 Summarize with NayakAI"}
          </button>
          {aiOutput && (
            <div style={{ background: "#0d1526", border: `1px solid ${GREEN}44`, borderRadius: 10, padding: 14, whiteSpace: "pre-wrap", fontSize: "0.83rem", color: TEXT, lineHeight: 1.7 }}>
              {aiOutput}
            </div>
          )}
        </div>
      )}

      {activeTab === "speech" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input
              value={speechTopic}
              onChange={e => setSpeechTopic(e.target.value)}
              placeholder="Event: e.g. Inauguration of Community Park, Sector 12"
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${BORDER}`,
                background: "#0d1526", color: TEXT, fontSize: "0.83rem", fontFamily: "inherit",
              }}
            />
            <select value={speechLang} onChange={e => setSpeechLang(e.target.value)} style={{
              padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`,
              background: "#0d1526", color: TEXT, fontSize: "0.83rem",
            }}>
              {["English", "Hindi", "Tamil", "Telugu", "Bengali", "Marathi"].map(l => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <button onClick={runSpeechDrafter} disabled={loading || !speechTopic.trim()} style={{
            padding: "9px 20px", borderRadius: 8, border: "none",
            background: loading ? MUTED : `linear-gradient(90deg, ${SAFFRON}, ${GOLD})`,
            color: "#000", fontWeight: 700, fontSize: "0.83rem", cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 16,
          }}>
            {loading ? "⏳ Drafting..." : "✍️ Draft Speech with NayakAI"}
          </button>
          {aiOutput && (
            <div style={{ background: "#0d1526", border: `1px solid ${GOLD}44`, borderRadius: 10, padding: 16, whiteSpace: "pre-wrap", fontSize: "0.84rem", color: TEXT, lineHeight: 1.8 }}>
              {aiOutput}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────
export default function PRAJADashboard() {
  const [activeModule, setActiveModule] = useState("grievance");
  const [tickets, setTickets] = useState(SAMPLE_TICKETS);
  const [selectedWard, setSelectedWard] = useState(null);
  const [newTicketFlash, setNewTicketFlash] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");

  function addNewTicket() {
    const newT = {
      id: "GRV-007",
      citizen: "Ramesh Gupta",
      lang: "Hindi",
      issue: "Street light broken on MG Road",
      dept: "Electricity",
      priority: "P1",
      status: "Open",
      ward: "Ward 14",
      time: "Just now",
      sentiment: "Angry",
    };
    setTickets(t => [newT, ...t]);
    setNewTicketFlash(true);
    setTimeout(() => setNewTicketFlash(false), 3000);
  }

  const filteredTickets = filterStatus === "All" ? tickets : tickets.filter(t => t.status === filterStatus);

  const navItems = [
    { id: "grievance", label: "GrievanceOS", icon: "📋", sub: "Ticket Engine" },
    { id: "sentinel", label: "SentinelPulse", icon: "🗺️", sub: "Heatmap" },
    { id: "nayak", label: "NayakAI", icon: "🤖", sub: "Co-Pilot" },
  ];

  const statCards = [
    { label: "Open Tickets", value: tickets.filter(t => t.status === "Open").length, color: SAFFRON, icon: "📋" },
    { label: "Escalated", value: tickets.filter(t => t.status === "Escalated").length, color: RED, icon: "🚨" },
    { label: "In Progress", value: tickets.filter(t => t.status === "In Progress").length, color: BLUE, icon: "⚙️" },
    { label: "Resolved Today", value: tickets.filter(t => t.status === "Resolved").length, color: GREEN, icon: "✅" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: NAVY, fontFamily: "'Segoe UI', system-ui, sans-serif", color: TEXT, fontSize: "14px" }}>
      {/* SIDEBAR */}
      <div style={{ width: 200, background: "#0d1526", borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 18px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: SAFFRON, letterSpacing: -1 }}>PRAJA</div>
          <div style={{ fontSize: "0.62rem", color: MUTED, letterSpacing: 2, textTransform: "uppercase" }}>Governance AI</div>
        </div>
        <div style={{ padding: "12px 0", flex: 1 }}>
          <div style={{ fontSize: "0.58rem", letterSpacing: 2, color: MUTED, padding: "8px 18px 4px", fontWeight: 700, textTransform: "uppercase" }}>Modules</div>
          {navItems.map(n => (
            <div key={n.id} onClick={() => setActiveModule(n.id)} style={{
              padding: "10px 18px",
              cursor: "pointer",
              borderLeft: `3px solid ${activeModule === n.id ? SAFFRON : "transparent"}`,
              background: activeModule === n.id ? `${SAFFRON}11` : "transparent",
              transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1rem" }}>{n.icon}</span>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: activeModule === n.id ? "#fff" : LIGHT }}>{n.label}</div>
                  <div style={{ fontSize: "0.65rem", color: MUTED }}>{n.sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "14px 18px", borderTop: `1px solid ${BORDER}`, fontSize: "0.72rem", color: MUTED }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 2 }}>MLA Sharma</div>
          <div>Delhi North</div>
          <div style={{ marginTop: 6, display: "flex", gap: 4, alignItems: "center" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN }} />
            <span style={{ color: GREEN, fontSize: "0.65rem" }}>Live</span>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {/* TOP BAR */}
        <div style={{ padding: "14px 28px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d1526", position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>
              {activeModule === "grievance" && "GrievanceOS — Citizen Complaint Engine"}
              {activeModule === "sentinel" && "SentinelPulse — Constituency Heatmap"}
              {activeModule === "nayak" && "NayakAI — Co-Pilot Dashboard"}
            </div>
            <div style={{ fontSize: "0.72rem", color: MUTED }}>India Innovates 2026 · Delhi North Constituency</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {newTicketFlash && <div style={{ padding: "6px 14px", borderRadius: 20, background: `${GREEN}22`, border: `1px solid ${GREEN}55`, color: GREEN, fontSize: "0.75rem", fontWeight: 700, animation: "pulse 1s infinite" }}>🔔 New ticket — GRV-007</div>}
            <div style={{ padding: "6px 14px", borderRadius: 20, background: `${RED}22`, border: `1px solid ${RED}55`, color: RED, fontSize: "0.75rem", fontWeight: 700 }}>⚠️ 8 SLA Violations</div>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* GRIEVANCE MODULE */}
          {activeModule === "grievance" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
                {statCards.map(s => (
                  <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px", borderTop: `3px solid ${s.color}` }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: "0.75rem", color: MUTED }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
                {/* TICKETS TABLE */}
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 800 }}>Live Ticket Queue</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["All", "Open", "In Progress", "Escalated", "Resolved"].map(f => (
                        <button key={f} onClick={() => setFilterStatus(f)} style={{
                          padding: "4px 10px", borderRadius: 6, border: `1px solid ${filterStatus === f ? SAFFRON : BORDER}`,
                          background: filterStatus === f ? `${SAFFRON}22` : "transparent",
                          color: filterStatus === f ? SAFFRON : MUTED, fontSize: "0.7rem", cursor: "pointer",
                        }}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ overflow: "auto" }}>
                    {filteredTickets.map((t, i) => (
                      <div key={t.id} style={{
                        padding: "14px 20px",
                        borderBottom: `1px solid ${BORDER}44`,
                        display: "grid",
                        gridTemplateColumns: "90px 1fr 90px 90px 80px",
                        gap: 12,
                        alignItems: "center",
                        background: i === 0 && newTicketFlash ? `${GREEN}08` : "transparent",
                        transition: "background 0.5s",
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.78rem", color: SAFFRON }}>{t.id}</div>
                          <div style={{ fontSize: "0.68rem", color: MUTED }}>{t.time}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.83rem", color: TEXT, marginBottom: 2 }}>{t.issue}</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <Tag color={BLUE}>{t.lang}</Tag>
                            <Tag color={MUTED}>{t.ward}</Tag>
                          </div>
                        </div>
                        <div><Tag color={priorityColor(t.priority)}>{t.priority}</Tag></div>
                        <div>
                          <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: "0.72rem", background: statusBg(t.status), color: statusColor(t.status), fontWeight: 600 }}>{t.status}</span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: LIGHT }}>{t.dept}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WHATSAPP + DEPT STATS */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12, fontSize: "0.88rem" }}>📱 Live WhatsApp Demo</div>
                    <WhatsAppDemo onNewTicket={addNewTicket} />
                  </div>
                  <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 14, fontSize: "0.88rem" }}>📊 Dept SLA Performance</div>
                    {DEPT_STATS.map(d => (
                      <MiniBar key={d.name} value={d.sla} color={d.color} label={`${d.name} (${d.open} open)`} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* SENTINEL MODULE */}
          {activeModule === "sentinel" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
              <div>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>Constituency Sentiment Heatmap</div>
                  <div style={{ fontSize: "0.78rem", color: MUTED, marginBottom: 18 }}>Delhi North · Real-time ward scores · Click a ward for details</div>
                  <HeatMap selectedWard={selectedWard} onSelect={setSelectedWard} />
                </div>
                {selectedWard && (
                  <div style={{ background: CARD, border: `2px solid ${scoreColor(selectedWard.score)}55`, borderRadius: 14, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "1rem" }}>{selectedWard.name}</div>
                        <div style={{ fontSize: "0.75rem", color: MUTED }}>Drilldown View</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "2rem", fontWeight: 900, color: scoreColor(selectedWard.score) }}>{selectedWard.score}</div>
                        <div style={{ fontSize: "0.75rem", color: scoreColor(selectedWard.score), fontWeight: 700 }}>Sentiment Score {selectedWard.trending}</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: "0.65rem", color: MUTED, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>TOP ISSUES DRIVING SENTIMENT</div>
                      {selectedWard.issues.map((issue, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 6, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: scoreColor(selectedWard.score), flexShrink: 0 }} />
                          <div style={{ fontSize: "0.84rem", color: TEXT }}>{issue}</div>
                          <div style={{ marginLeft: "auto", fontSize: "0.72rem", color: RED, fontWeight: 700 }}>↑ trending</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: `${SAFFRON}11`, border: `1px solid ${SAFFRON}44`, borderRadius: 8, padding: 12, fontSize: "0.8rem", color: TEXT }}>
                      <strong style={{ color: SAFFRON }}>AI Recommendation:</strong> Schedule a public grievance camp in this ward within 48 hours. Prioritize {selectedWard.issues[0].toLowerCase()} resolution.
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>🔥 Alert Feed</div>
                  {[
                    { time: "2 min ago", ward: "Ward 19", msg: "Sewage overflow posts hit 234. Velocity: HIGH", color: RED },
                    { time: "18 min ago", ward: "Ward 7", msg: "Water shortage complaints spike 62% this hour", color: SAFFRON },
                    { time: "1 hr ago", ward: "Ward 3", msg: "Garbage collection trending negative", color: GOLD },
                    { time: "3 hr ago", ward: "Ward 14", msg: "Streetlight outages reported across 3 streets", color: BLUE },
                  ].map((a, i) => (
                    <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${BORDER}44`, display: "flex", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, marginTop: 4, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: "0.7rem", color: a.color, fontWeight: 700 }}>{a.ward} · {a.time}</div>
                        <div style={{ fontSize: "0.78rem", color: TEXT }}>{a.msg}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>📈 Issue Trends</div>
                  {[
                    { issue: "Water Shortage", pct: 78, color: BLUE },
                    { issue: "Power Cuts", pct: 54, color: GOLD },
                    { issue: "Road Potholes", pct: 42, color: SAFFRON },
                    { issue: "Sewage Issues", pct: 81, color: RED },
                    { issue: "Garbage", pct: 35, color: "#a855f7" },
                  ].map(t => <MiniBar key={t.issue} value={t.pct} color={t.color} label={t.issue} />)}
                </div>
              </div>
            </div>
          )}

          {/* NAYAK MODULE */}
          {activeModule === "nayak" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22 }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 4 }}>🤖 NayakAI Co-Pilot</div>
                <div style={{ fontSize: "0.78rem", color: MUTED, marginBottom: 20 }}>AI-powered intelligence for elected representatives — powered by Groq LLaMA</div>
                <NayakAI />
              </div>
              <div>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>📊 Constituency Report</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Grievances Filed", value: "142", sub: "This month" },
                      { label: "Resolution Rate", value: "67%", sub: "vs 45% national avg" },
                      { label: "Avg Resolution", value: "4.2d", sub: "vs 45d CPGRAMS" },
                      { label: "Active Wards", value: "28", sub: "8 critical" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: SAFFRON }}>{s.value}</div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: TEXT }}>{s.label}</div>
                        <div style={{ fontSize: "0.65rem", color: MUTED }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>⚡ Quick Actions</div>
                  {[
                    { label: "Escalate Water Dept", icon: "💧", color: BLUE },
                    { label: "Generate RTI Reply", icon: "📄", color: SAFFRON },
                    { label: "Share Ward Report", icon: "📊", color: GREEN },
                    { label: "Alert Field Workers", icon: "📢", color: RED },
                  ].map(a => (
                    <button key={a.label} style={{
                      width: "100%", marginBottom: 8, padding: "9px 14px", borderRadius: 8,
                      border: `1px solid ${a.color}44`, background: `${a.color}11`,
                      color: a.color, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8, textAlign: "left",
                    }}>
                      <span>{a.icon}</span> {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:${NAVY}}
        ::-webkit-scrollbar-thumb{background:${BORDER};border-radius:2px}
        * { box-sizing: border-box; }
        button:hover { opacity: 0.85; }
        textarea:focus, input:focus, select:focus { outline: 1px solid ${SAFFRON}; }
      `}</style>
    </div>
  );
}
