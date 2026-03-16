import React, { useState, useEffect } from 'react';
import { Card, Badge } from '../../components/ui/Card';
import SentinelHeatmap from '../../components/SentinelHeatmap';
import { useFetch } from '../../hooks/useFetch';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CHART_COLORS = ['#ef4444','#f59e0b','#3b82f6','#10b981','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16'];

export default function SentinelTab() {
  const [subTab, setSubTab] = useState('map');
  
  const { data: _topics, loading: topicsLoading, execute: loadTopics } = useFetch('/sentinel/topics', {}, false);
  const { data: _trends, loading: trendsLoading, execute: loadTrends } = useFetch('/sentinel/trends', {}, false);
  const { data: _comparison, loading: compareLoading, execute: loadCompare } = useFetch('/sentinel/comparison', {}, false);
  const { data: _alerts, loading: alertsLoading, execute: loadAlerts } = useFetch('/sentinel/alerts', {}, false);

  const topics = _topics || [];
  const trends = _trends || [];
  const comparison = _comparison || [];
  const alerts = _alerts || [];

  useEffect(() => {
    if (subTab === 'topics') loadTopics();
    if (subTab === 'trends') loadTrends();
    if (subTab === 'compare') loadCompare();
    if (subTab === 'alerts') loadAlerts();
  }, [subTab, loadTopics, loadTrends, loadCompare, loadAlerts]);

  const SP_TABS = [
    { id: 'map',     label: '🗺️ Heatmap' },
    { id: 'topics',  label: '📊 Topics' },
    { id: 'trends',  label: '📈 Trends' },
    { id: 'compare', label: '⚖️ Compare' },
    { id: 'alerts',  label: '🚨 Alerts' },
  ];

  return (
    <div>
      <p className="ud-title">🗺️ SentinelPulse — Ward Sentiment Intelligence</p>
      <p className="ud-subtitle">Real-time ward-level grievance density, topic clusters, and trend analysis.</p>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-gray-200">
        {SP_TABS.map(t => (
          <button 
            key={t.id} 
            className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              subTab === t.id 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setSubTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'map' && <SentinelHeatmap />}

      {subTab === 'topics' && (
        topicsLoading ? <p className="ud-loading">Loading topics...</p> : (
          <div>
            <p className="ud-subtitle mb-4">Open grievances grouped by AI-classified category</p>
            {topics.length > 0 ? (
              <Card className="mb-6">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topics} margin={{top:5,right:10,left:0,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="topic" tick={{fill:'#475569',fontSize:11}} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{fill:'#475569',fontSize:11}} />
                    <Tooltip contentStyle={{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:8}} />
                    <Bar dataKey="count" name="Total Open" radius={[4,4,0,0]}>
                      {topics.map((_,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                    <Bar dataKey="critical" name="Critical" fill="#ef4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            ) : <div className="ud-alert-empty">No topic data available</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map((t, i) => (
                <Card key={i} className="flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full" style={{backgroundColor: CHART_COLORS[i % CHART_COLORS.length]}} />
                  <div className="pl-2 font-bold text-gray-800 truncate" title={t.topic}>{t.topic}</div>
                  <div className="pl-2 flex justify-between items-center">
                    <span className="text-2xl font-bold">{t.count}</span>
                    <span className="text-sm text-gray-500">open tickets</span>
                  </div>
                  <div className="pl-2 flex gap-2 flex-wrap mt-2">
                    {t.critical > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">🔴 {t.critical} critical</span>}
                    {t.negative > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">😠 {t.negative} negative</span>}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )
      )}

      {subTab === 'trends' && (
        trendsLoading ? <p className="ud-loading">Loading trends...</p> : (
          <div>
            <p className="ud-subtitle mb-4">Daily grievance volume over the last 7 days</p>
            {trends.length > 0 ? (
              <Card>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends} margin={{top:5,right:10,left:0,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{fill:'#475569',fontSize:11}} />
                    <YAxis tick={{fill:'#475569',fontSize:11}} />
                    <Tooltip contentStyle={{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:8}} />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{fill:'#3b82f6',r:4}} name="New" activeDot={{r:6}} />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={3} dot={{fill:'#10b981',r:4}} name="Resolved" activeDot={{r:6}} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            ) : <div className="ud-alert-empty">No trend data available</div>}
          </div>
        )
      )}

      {subTab === 'compare' && (
        compareLoading ? <p className="ud-loading">Loading comparison...</p> : (
          <div>
            <p className="ud-subtitle mb-4">Category-wise resolution rates and satisfaction scores</p>
            {comparison.length > 0 ? (
              <div className="flex flex-col gap-6">
                <Card>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={comparison} margin={{top:5,right:10,left:0,bottom:5}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="category" tick={{fill:'#475569',fontSize:11}} angle={-15} textAnchor="end" height={50} />
                      <YAxis tick={{fill:'#475569',fontSize:11}} />
                      <Tooltip contentStyle={{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:8}} />
                      <Bar dataKey="resolution_rate" name="Resolution %" fill="#10b981" radius={[4,4,0,0]} />
                      <Bar dataKey="satisfaction_score" name="Satisfaction %" fill="#3b82f6" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resolved</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resolution %</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Satisfaction</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Critical</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {comparison.map((c,i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.total}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.resolved}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${c.resolution_rate >= 60 ? 'text-green-600' : 'text-red-500'}`}>
                            {c.resolution_rate}%
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${c.satisfaction_score >= 60 ? 'text-blue-600' : 'text-orange-500'}`}>
                            {c.satisfaction_score}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {c.critical_count > 0 ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                {c.critical_count}
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : <div className="ud-alert-empty">No comparison data available</div>}
          </div>
        )
      )}

      {subTab === 'alerts' && (
        alertsLoading ? <p className="ud-loading">Loading alerts...</p> : (
          <div>
            <p className="ud-subtitle mb-4">Critical and SLA-breached grievances requiring immediate attention</p>
            {alerts.length === 0 ? <div className="ud-alert-empty">No critical alerts. All wards are stable.</div> : (
              <div className="flex flex-col gap-4">
                {alerts.map((a, i) => (
                  <Card key={i} className={`border-l-4 ${a.severity === 'critical' ? 'border-l-red-500' : 'border-l-orange-500'}`}>
                    <div className="font-bold text-lg">{a.title}</div>
                    <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-100">
                      {a.description}
                    </div>
                    <div className="flex gap-3 text-sm mt-4">
                      <Badge variant={a.severity === 'critical' ? 'danger' : 'warning'}>{a.type}</Badge>
                      <Badge variant={a.severity}>{a.severity?.toUpperCase()}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
