import React, { useState, useEffect, useCallback } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card, Badge } from '../../components/ui/Card';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function NayakAITab() {
  const [activeTab, setActiveTab] = useState('brief');
  const [prompt, setPrompt] = useState('');
  const [speechTopic, setST] = useState('');
  const [speechLang, setSL] = useState('English');
  const [aiOutput, setAiOutput] = useState('');
  
  const [chatHistory, setChat] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const [schedForm, setSchedForm] = useState({ title:'', description:'', event_date:'', event_time:'', location:'', event_type:'meeting' });
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingType, setMeetingType] = useState('general');
  const [meetingSummary, setMeetingSummary] = useState('');
  const [reportPeriod, setReportPeriod] = useState('month');
  const [reportCard, setReportCard] = useState(null);

  // Queries
  const { data: brief, execute: loadBrief, loading: briefLoading } = useFetch('/nayakai/morning-brief', { method: 'post' }, false);
  const { data: _schedules, execute: loadSchedules } = useFetch('/nayakai/schedule', {}, false);
  const { data: _actionAlerts, execute: loadActionAlerts, loading: alertsLoading } = useFetch('/nayakai/action-alerts', { method: 'post' }, false);

  const schedules = _schedules || [];
  const actionAlerts = _actionAlerts || [];

  // Mutations
  const { mutate: callAiApi, loading: aiLoading } = useMutation('post');
  const { mutate: askChatApi, loading: chatLoading } = useMutation('post');
  const { mutate: createScheduleApi, loading: schedLoading } = useMutation('post');
  const { mutate: summarizeMeetingApi, loading: meetingLoading } = useMutation('post');
  const { mutate: generateReportApi, loading: reportLoading } = useMutation('post');

  useEffect(() => {
    if (activeTab === 'brief' && !brief) loadBrief();
    if (activeTab === 'schedule') loadSchedules();
    if (activeTab === 'alerts' && actionAlerts.length === 0) loadActionAlerts();
  }, [activeTab, loadBrief, loadSchedules, loadActionAlerts, brief, actionAlerts.length]);

  const callAI = async (text, mode) => {
    setAiOutput('');
    try {
      const data = await callAiApi('/nayakai/assist', { text, mode });
      setAiOutput(data?.result || 'No response');
    } catch {
      setAiOutput('⚠️ Connection error — check backend status');
    }
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChat(h => [...h, { role: 'user', text: msg }]);
    try {
      const data = await askChatApi('/nayakai/ask', { question: msg, constituency: 'Delhi North' });
      setChat(h => [...h, { role: 'ai', text: data?.answer || 'No answer' }]);
    } catch {
      setChat(h => [...h, { role: 'ai', text: '⚠️ Error. Try again.' }]);
    }
  };

  const createSchedule = async (e) => {
    e.preventDefault();
    try {
      await createScheduleApi('/nayakai/schedule', schedForm);
      setSchedForm({ title:'', description:'', event_date:'', event_time:'', location:'', event_type:'meeting' });
      loadSchedules();
    } catch {}
  };

  const summarizeMeeting = async () => {
    setMeetingSummary('');
    try {
      const data = await summarizeMeetingApi('/nayakai/meeting-summary', { notes: meetingNotes, meeting_type: meetingType });
      setMeetingSummary(data?.summary || 'No summary generated');
    } catch { 
      setMeetingSummary('⚠️ Error generating summary'); 
    }
  };

  const generateReport = async () => {
    setReportCard(null);
    try {
      const data = await generateReportApi('/nayakai/report-card', { period: reportPeriod });
      setReportCard(data);
    } catch {
      // Handled via useMutation hook toast generally if we wanted, silently ignoring here to match legacy.
    }
  };

  const NK_TABS = [
    { id: 'brief',    label: '☀️ Brief' },
    { id: 'chat',     label: '💬 Chat' },
    { id: 'doc',      label: '📄 Summarize' },
    { id: 'speech',   label: '✍️ Speech' },
    { id: 'schedule', label: '📅 Schedule' },
    { id: 'alerts',   label: '🚨 Alerts' },
    { id: 'meeting',  label: '📝 Meeting' },
    { id: 'report',   label: '📊 Report' },
  ];

  return (
    <div>
      <p className="ud-title">🤖 NayakAI — Governance Intelligence</p>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-gray-200">
        {NK_TABS.map(t => (
          <button
            key={t.id}
            className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.id 
                ? 'border-orange-500 text-orange-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => { setActiveTab(t.id); setAiOutput(''); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'brief' && (
        briefLoading ? (
          <p className="ud-loading">Generating brief...</p>
        ) : brief ? (
          <div>
            <Card className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white border-0 shadow-lg mb-4">
              <div className="text-xl font-bold mb-4 opacity-90">Morning Brief — {brief.date}</div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/10 p-4 rounded-lg text-center backdrop-blur-sm">
                  <div className="text-3xl font-bold text-orange-400">{brief.total_open}</div>
                  <div className="text-sm opacity-80 uppercase tracking-widest mt-1">Open</div>
                </div>
                <div className="bg-white/10 p-4 rounded-lg text-center backdrop-blur-sm">
                  <div className="text-3xl font-bold text-red-400">{brief.critical_open}</div>
                  <div className="text-sm opacity-80 uppercase tracking-widest mt-1">Critical</div>
                </div>
                <div className="bg-white/10 p-4 rounded-lg text-center backdrop-blur-sm">
                  <div className="text-3xl font-bold text-yellow-400">{brief.sla_violations}</div>
                  <div className="text-sm opacity-80 uppercase tracking-widest mt-1">SLA Breaches</div>
                </div>
              </div>
              {brief.summary && <div className="bg-white/5 p-4 rounded-lg italic font-serif leading-relaxed">{brief.summary}</div>}
            </Card>
            <Button variant="secondary" onClick={loadBrief}>↻ Refresh</Button>
          </div>
        ) : (
          <Button onClick={loadBrief}>☀️ Generate Morning Brief</Button>
        )
      )}

      {activeTab === 'chat' && (
        <Card className="flex flex-col h-[500px] p-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-4">
            {chatHistory.length === 0 && (
              <p className="text-center text-gray-500 mt-10">Ask anything — grievances, schemes, ward stats, governance</p>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user' 
                  ? 'bg-orange-500 text-white self-end rounded-br-none' 
                  : 'bg-white border border-gray-200 text-gray-800 self-start rounded-bl-none shadow-sm'
              }`}>
                {msg.role === 'ai' && <div className="text-xs font-bold text-orange-600 mb-1">🤖 NAYAKAI</div>}
                {msg.text}
              </div>
            ))}
            {chatLoading && <div className="bg-white border border-gray-200 text-gray-500 self-start p-3 rounded-lg rounded-bl-none italic">🤖 Thinking...</div>}
          </div>
          <form className="p-3 border-t border-gray-200 bg-white flex gap-2" onSubmit={sendChat}>
            <input
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask NayakAI anything..."
            />
            <Button type="submit" disabled={chatLoading || !chatInput.trim()} className="rounded-full px-6">
              Send
            </Button>
          </form>
        </Card>
      )}

      {activeTab === 'doc' && (
        <div>
          <p className="text-gray-600 mb-2">Paste text or upload a document (.txt, .pdf, .doc):</p>
          <Input
            isTextarea
            rows={4}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. PM Awas Yojana guidelines..."
          />
          <div className="flex items-center gap-3 mt-4">
            <label className="ud-btn ud-btn-secondary cursor-pointer">
              📎 Upload File
              <input type="file" accept=".txt,.pdf,.doc,.docx" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { alert('File too large (max 2 MB)'); return; }
                const reader = new FileReader();
                reader.onload = () => setPrompt(reader.result);
                reader.readAsText(file);
                e.target.value = '';
              }} />
            </label>
            <Button
              isLoading={aiLoading}
              disabled={aiLoading || !prompt.trim()}
              onClick={() => callAI(prompt, 'summarize')}
            >
              🧠 Summarize
            </Button>
          </div>
          {aiOutput && <Card className="mt-4 bg-green-50 text-green-800 border-green-200 whitespace-pre-wrap">{aiOutput}</Card>}
        </div>
      )}

      {activeTab === 'speech' && (
        <div>
          <div className="flex gap-3 mb-4">
            <Input
              className="flex-1 mb-0"
              value={speechTopic}
              onChange={e => setST(e.target.value)}
              placeholder="Event: e.g. Inauguration of Community Park"
            />
            <select className="ud-input-base w-48" value={speechLang} onChange={e => setSL(e.target.value)}>
              {['English','Hindi','Tamil','Telugu','Bengali','Marathi'].map(l => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <Button
            isLoading={aiLoading}
            disabled={aiLoading || !speechTopic.trim()}
            onClick={() => callAI(`Event: ${speechTopic}. Language: ${speechLang}. Constituency: Delhi North.`, 'speech')}
          >
            ✍️ Draft Speech
          </Button>
          {aiOutput && <Card className="mt-4 bg-orange-50 text-orange-900 border-orange-200 whitespace-pre-wrap">{aiOutput}</Card>}
        </div>
      )}

      {activeTab === 'schedule' && (
        <div>
          <p className="text-gray-600 mb-4">Manage your constituency calendar. AI generates preparation briefs for each event.</p>
          <Card>
            <form onSubmit={createSchedule}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Event Title" value={schedForm.title} onChange={e => setSchedForm({...schedForm, title:e.target.value})} required placeholder="e.g. Ward Meeting" />
                <Input label="Date" type="date" value={schedForm.event_date} onChange={e => setSchedForm({...schedForm, event_date:e.target.value})} required />
                <Input label="Time" type="time" value={schedForm.event_time} onChange={e => setSchedForm({...schedForm, event_time:e.target.value})} />
                <Input label="Location" value={schedForm.location} onChange={e => setSchedForm({...schedForm, location:e.target.value})} placeholder="e.g. Community Hall" />
                <div className="ud-field-wrapper">
                  <label className="ud-label">Type</label>
                  <select className="ud-input-base ud-input" value={schedForm.event_type} onChange={e => setSchedForm({...schedForm, event_type:e.target.value})}>
                    {['meeting','inauguration','review','hearing','visit','rally'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <Input label="Description / Notes" isTextarea rows={2} value={schedForm.description} onChange={e => setSchedForm({...schedForm, description:e.target.value})} placeholder="Brief context (optional)" className="mt-4" />
              <Button type="submit" isLoading={schedLoading} className="mt-4 w-full md:w-auto">
                📅 Add Event (AI Brief Auto-Generated)
              </Button>
            </form>
          </Card>
          
          {schedules.length > 0 && (
            <div className="mt-8">
              <p className="ud-subtitle mb-4">Upcoming Events</p>
              <div className="flex flex-col gap-4">
                {schedules.map(s => (
                  <Card key={s.id}>
                    <div className="font-bold text-lg">📅 {s.title}</div>
                    <div className="flex gap-4 text-sm text-gray-500 mt-2 flex-wrap">
                      <span>{s.event_date}</span>
                      {s.event_time && <span>⏰ {s.event_time}</span>}
                      {s.location && <span>📍 {s.location}</span>}
                      <Badge variant="neutral">{s.event_type}</Badge>
                    </div>
                    {s.ai_brief && (
                      <div className="mt-4 p-3 bg-green-50 text-green-900 border border-green-200 rounded-md text-sm whitespace-pre-wrap">
                        {s.ai_brief}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div>
          <p className="text-gray-600 mb-4">AI-drafted responses for escalated and critical grievances requiring immediate action.</p>
          <Button variant="secondary" onClick={loadActionAlerts} isLoading={alertsLoading} className="mb-4">
            ↻ Refresh Alerts
          </Button>
          
          {actionAlerts.length === 0 && !alertsLoading ? (
            <div className="ud-alert-empty">No critical alerts right now. All under control.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {actionAlerts.map(a => (
                <Card key={a.id} className={`border-l-4 ${a.priority === 'critical' ? 'border-l-red-500' : 'border-l-orange-500'}`}>
                  <div className="font-bold text-lg">🚨 {a.title || 'Alert'}</div>
                  <div className="flex gap-3 text-sm text-gray-500 mt-2">
                    <span className="font-mono">{a.tracking_id}</span>
                    <span>{a.category}</span>
                    <Badge variant={a.priority}>{a.priority?.toUpperCase()}</Badge>
                  </div>
                  {a.ai_draft_response && (
                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 text-orange-900 rounded-md text-sm">
                      <div className="text-xs font-bold text-orange-600 mb-1">🤖 AI Suggested Action</div>
                      <div className="whitespace-pre-wrap">{a.ai_draft_response}</div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'meeting' && (
        <div>
          <p className="text-gray-600 mb-4">Paste meeting notes → get key decisions and action items extracted by AI.</p>
          <div className="mb-4 w-48">
            <select className="ud-input-base ud-input" value={meetingType} onChange={e => setMeetingType(e.target.value)}>
              {['general','review','grievance','development','emergency'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <Input
            isTextarea
            rows={6}
            value={meetingNotes}
            onChange={e => setMeetingNotes(e.target.value)}
            placeholder="Paste your meeting notes here..."
          />
          <Button isLoading={meetingLoading} disabled={meetingLoading || !meetingNotes.trim()} onClick={summarizeMeeting} className="mt-4">
            📝 Extract Action Items
          </Button>
          {meetingSummary && <Card className="mt-4 bg-green-50 text-green-900 border-green-200 whitespace-pre-wrap">{meetingSummary}</Card>}
        </div>
      )}

      {activeTab === 'report' && (
        <div>
          <p className="text-gray-600 mb-4">Auto-generate "What I Did This Month" development report card from your constituency data.</p>
          <div className="flex items-center gap-3 mb-6">
            <select className="ud-input-base ud-input w-48" value={reportPeriod} onChange={e => setReportPeriod(e.target.value)}>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            <Button onClick={generateReport} isLoading={reportLoading}>
              📊 Generate Report Card
            </Button>
          </div>
          
          {reportCard && (
            <Card>
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-800">{reportCard.new_grievances || 0}</div>
                  <div className="text-sm text-gray-500 uppercase">New Complaints</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{reportCard.resolved_count || 0}</div>
                  <div className="text-sm text-gray-500 uppercase">Resolved</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className={`text-3xl font-bold ${(reportCard.resolution_rate || 0) >= 60 ? 'text-green-600' : 'text-red-500'}`}>
                    {reportCard.resolution_rate || 0}%
                  </div>
                  <div className="text-sm text-gray-500 uppercase">Resolution Rate</div>
                </div>
              </div>
              
              {reportCard.top_categories?.length > 0 && (
                <div className="mb-6 border border-gray-100 p-4 rounded-lg bg-white">
                  <p className="font-bold text-gray-700 mb-4 text-center">Top Categories Resolved</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={reportCard.top_categories}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="category" tick={{fill:'#475569',fontSize:11}} />
                      <YAxis tick={{fill:'#475569',fontSize:11}} />
                      <Tooltip contentStyle={{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:8}} />
                      <Bar dataKey="count" fill="#10b981" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              <div className="p-4 bg-green-50 text-green-900 border border-green-200 rounded-lg leading-relaxed whitespace-pre-wrap font-serif">
                {reportCard.narrative}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
