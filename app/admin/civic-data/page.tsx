'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Database, RefreshCw, Search, FileText, 
  Layers, ArrowRight, ExternalLink, Info, CheckCircle2,
  AlertCircle, Table2, BarChart2, PieChart
} from 'lucide-react'

const SECTORS = [
  'Transport & Mobility',
  'Environment & Pollution',
  'Water & Sanitation',
  'Land Use & Urban Planning',
  'Education',
  'Health & Social Statistics',
  'Governance & Budgets'
]

export default function CivicDataPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSector, setSelectedSector] = useState('All')
  const [selectedFormat, setSelectedFormat] = useState('All')
  
  // Selected inspect document state (modal)
  const [inspectDoc, setInspectDoc] = useState<any | null>(null)
  const [inspectTab, setInspectTab] = useState<'chart' | 'table'>('chart')

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/opencity/fetch')
      if (res.ok) {
        const json = await res.json()
        setDocuments(json.data || [])
      }
    } catch (err: any) {
      console.error('Failed to load documents:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/opencity/fetch', { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setDocuments(json.data || [])
        } else {
          setSyncError(json.error || 'Unknown sync error')
        }
      } else {
        const errJson = await res.json()
        setSyncError(errJson.error || 'Failed sync response')
      }
    } catch (err: any) {
      setSyncError(err.message || String(err))
    } finally {
      setSyncing(false)
    }
  }

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase())
      const matchSector = selectedSector === 'All' || doc.sector === selectedSector
      const matchFormat = selectedFormat === 'All' || doc.file_type === selectedFormat
      return matchSearch && matchSector && matchFormat
    })
  }, [documents, searchTerm, selectedSector, selectedFormat])

  // Count sectors covered
  const sectorsCoveredCount = useMemo(() => {
    const unique = new Set(documents.map(doc => doc.sector))
    return unique.size
  }, [documents])

  // Sector distribution metrics for overview chart
  const sectorDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    SECTORS.forEach(s => { counts[s] = 0 })
    documents.forEach(doc => {
      if (counts[doc.sector] !== undefined) {
        counts[doc.sector]++
      }
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [documents])

  // File type format splits
  const formatSplits = useMemo(() => {
    let pdfCount = 0
    let csvCount = 0
    documents.forEach(doc => {
      if (doc.file_type === 'PDF') pdfCount++
      else if (doc.file_type === 'CSV') csvCount++
    })
    const total = pdfCount + csvCount || 1
    return {
      pdf: pdfCount,
      csv: csvCount,
      pdfPct: (pdfCount / total) * 100,
      csvPct: (csvCount / total) * 100
    }
  }, [documents])

  // CSV Dynamic visual chart helper
  const csvChartData = useMemo(() => {
    if (!inspectDoc || inspectDoc.file_type !== 'CSV' || !inspectDoc.parsed_data || inspectDoc.parsed_data.length === 0) {
      return null
    }

    const rawData = inspectDoc.parsed_data
    const keys = Object.keys(rawData[0])
    
    // Auto-detect columns
    let labelKey = keys[0]
    let valKey = keys.find(k => !isNaN(parseFloat(rawData[0][k])) && k !== 'ward_no' && k !== 'id') || keys[1]

    if (keys.includes('district')) labelKey = 'district'
    else if (keys.includes('route_no')) labelKey = 'route_no'
    else if (keys.includes('station_name')) labelKey = 'station_name'
    else if (keys.includes('lake_name')) labelKey = 'lake_name'
    else if (keys.includes('zone_name')) labelKey = 'zone_name'
    else if (keys.includes('taluk')) labelKey = 'taluk'
    else if (keys.includes('school_name')) labelKey = 'school_name'
    else if (keys.includes('library_name')) labelKey = 'library_name'
    else if (keys.includes('ward_name')) labelKey = 'ward_name'

    if (keys.includes('crashes_2023')) valKey = 'crashes_2023'
    else if (keys.includes('passengers_carried')) valKey = 'passengers_carried'
    else if (keys.includes('aqi_level')) valKey = 'aqi_level'
    else if (keys.includes('wet_waste_tons')) valKey = 'wet_waste_tons'
    else if (keys.includes('wqi_score')) valKey = 'wqi_score'
    else if (keys.includes('daily_supply_mld')) valKey = 'daily_supply_mld'
    else if (keys.includes('compensation_estimate_cr')) valKey = 'compensation_estimate_cr'
    else if (keys.includes('student_count')) valKey = 'student_count'
    else if (keys.includes('daily_visitors')) valKey = 'daily_visitors'
    else if (keys.includes('registered_births')) valKey = 'registered_births'
    else if (keys.includes('resolution_percentage')) valKey = 'resolution_percentage'

    const points = rawData.map((item: any) => ({
      label: String(item[labelKey] || '').split(' ')[0], // abbreviate
      value: parseFloat(item[valKey]) || 0
    }))

    const maxValue = Math.max(...points.map((p: any) => p.value), 1)

    return {
      points,
      maxValue,
      valLabel: valKey.replace(/_/g, ' ').toUpperCase(),
      labelLabel: labelKey.replace(/_/g, ' ').toUpperCase()
    }
  }, [inspectDoc])

  // Open modal handler
  const handleOpenInspect = (doc: any) => {
    setInspectDoc(doc)
    setInspectTab(doc.file_type === 'CSV' ? 'chart' : 'chart')
  }

  return (
    <div style={{ padding: '24px 30px', minHeight: '100vh', background: '#f6f6f3', fontFamily: 'sans-serif' }}>
      
      {/* Custom styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .badge-sector {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          text-transform: uppercase;
        }
        .doc-card {
          transition: transform 150ms ease, box-shadow 150ms;
        }
        .doc-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
        }
        .tab-btn {
          padding: 8px 16px;
          font-size: 11px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 120ms;
        }
        .tab-btn.active {
          background: #36375D;
          color: #ffffff;
        }
        .tab-btn.inactive {
          background: #e2e8f0;
          color: #64748b;
        }
        .doc-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 1024px) {
          .doc-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .doc-grid {
            grid-template-columns: 1fr;
          }
        }
      `}} />

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#36375D', color: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Database size={18} />
            </span>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#262622', margin: 0, letterSpacing: '-0.3px' }}>
              OpenCity Historical Civic Data
            </h1>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
            Sync and inspect parsed urban metrics from historical city datasets.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            background: syncing ? '#64748b' : '#36375D',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: syncing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(54, 55, 93, 0.15)',
            transition: 'background-color 150ms'
          }}
          onMouseEnter={e => !syncing && (e.currentTarget.style.background = '#2a2b49')}
          onMouseLeave={e => !syncing && (e.currentTarget.style.background = '#36375D')}
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
          <span>{syncing ? 'Syncing Historical Datasets...' : 'Sync Datasets from OpenCity'}</span>
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '14px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '10px', borderRadius: '10px', display: 'flex' }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Documents Logged</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#262622', marginTop: '2px' }}>{documents.length} Files</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '14px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ background: '#ecfdf5', color: '#10b981', padding: '10px', borderRadius: '10px', display: 'flex' }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sectors Covered</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#262622', marginTop: '2px' }}>{sectorsCoveredCount} / 7 Sectors</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '14px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ background: '#fef3c7', color: '#d97706', padding: '10px', borderRadius: '10px', display: 'flex' }}>
            <Table2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Historical Sync status</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: documents.length > 0 ? '#10b981' : '#f59e0b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {documents.length > 0 ? (
                <>
                  <CheckCircle2 size={13} />
                  <span>Synced &amp; Parsed</span>
                </>
              ) : (
                <>
                  <AlertCircle size={13} />
                  <span>Awaiting Initial Sync</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {syncError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '12px 16px', color: '#b91c1c', fontSize: '12px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>Error during sync: {syncError}</span>
        </div>
      )}

      {/* Visual Analytics Overview Cards */}
      {documents.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Sector Bar Chart Card */}
          <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#36375D', marginBottom: '16px' }}>
              <BarChart2 size={16} />
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sector Registry Scope</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sectorDistribution.map(item => {
                const max = Math.max(...sectorDistribution.map(s => s.count), 1)
                const pct = (item.count / max) * 100
                return (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '130px', fontSize: '11px', fontWeight: 700, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#36375D', borderRadius: '4px', transition: 'width 300ms ease' }} />
                    </div>
                    <div style={{ width: '50px', fontSize: '11px', fontWeight: 800, color: '#262622', textAlign: 'right' }}>
                      {item.count} docs
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Format split donut chart card */}
          <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3ca686', marginBottom: '16px' }}>
              <PieChart size={16} />
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Format Distribution</span>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
              {/* Stacked indicator bar */}
              <div style={{ height: '24px', background: '#f1f5f9', borderRadius: '12px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${formatSplits.csvPct}%`, background: '#3ca686', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '9px', fontWeight: 800 }}>
                  {formatSplits.csvPct.toFixed(0)}% CSV
                </div>
                <div style={{ width: `${formatSplits.pdfPct}%`, background: '#dd5a5a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '9px', fontWeight: 800 }}>
                  {formatSplits.pdfPct.toFixed(0)}% PDF
                </div>
              </div>

              {/* Legends with absolute counts */}
              <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '11px', fontWeight: 700 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3ca686' }} />
                  <span style={{ color: '#475569' }}>CSV Datasets ({formatSplits.csv} files)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dd5a5a' }} />
                  <span style={{ color: '#475569' }}>PDF Reports ({formatSplits.pdf} files)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and search bar */}
      <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '14px', padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#f6f6f3', border: '1px solid #dadad3', borderRadius: '8px', padding: '6px 12px', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={14} style={{ color: '#64748b' }} />
          <input 
            type="text" 
            placeholder="Search documents by title..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', color: '#262622', width: '100%', fontWeight: 500 }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Sector:</span>
            <select
              value={selectedSector}
              onChange={e => setSelectedSector(e.target.value)}
              style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: '#262622', outline: 'none', fontWeight: 600 }}
            >
              <option value="All">All Sectors</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Format:</span>
            <select
              value={selectedFormat}
              onChange={e => setSelectedFormat(e.target.value)}
              style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: '#262622', outline: 'none', fontWeight: 600 }}
            >
              <option value="All">All Formats</option>
              <option value="CSV">CSV</option>
              <option value="PDF">PDF</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents layout list */}
      {loading ? (
        <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '14px', padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '13px', fontWeight: 600 }}>Loading documents repository...</div>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '14px', padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <Info size={28} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#262622' }}>No Documents Found</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {documents.length === 0 ? 'Click "Sync Datasets from OpenCity" above to fetch and parse historical datasets.' : 'Try adjusting your search or sector filters.'}
          </div>
        </div>
      ) : (
        <div className="doc-grid">
          {filteredDocs.map(doc => {
            const isCSV = doc.file_type === 'CSV'
            let parsed = null
            try {
              parsed = typeof doc.parsed_data === 'string' ? JSON.parse(doc.parsed_data) : doc.parsed_data
            } catch (e) {
              parsed = doc.parsed_data
            }

            return (
              <div 
                key={doc.id}
                className="doc-card"
                style={{
                  background: '#ffffff',
                  border: '1px solid #dadad3',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span 
                      className="badge-sector"
                      style={{
                        background: doc.sector === 'Transport & Mobility' ? '#eff6ff' : doc.sector === 'Environment & Pollution' ? '#ecfdf5' : doc.sector === 'Water & Sanitation' ? '#e0f2fe' : doc.sector === 'Governance & Budgets' ? '#fef3c7' : '#f3e8ff',
                        color: doc.sector === 'Transport & Mobility' ? '#1d4ed8' : doc.sector === 'Environment & Pollution' ? '#047857' : doc.sector === 'Water & Sanitation' ? '#0369a1' : doc.sector === 'Governance & Budgets' ? '#b45309' : '#6b21a8'
                      }}
                    >
                      {doc.sector}
                    </span>
                    <span 
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isCSV ? '#d1fae5' : '#fee2e2',
                        color: isCSV ? '#065f46' : '#991b1b'
                      }}
                    >
                      {doc.file_type}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#262622', margin: '0 0 12px 0', lineHeight: '1.4', minHeight: '38px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {doc.title}
                  </h3>

                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px', border: '1px solid #dadad3' }}>
                    {isCSV ? (
                      <div>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.3px' }}>
                          Dataset Snippet
                        </div>
                        {parsed && Array.isArray(parsed) && parsed.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {parsed.slice(0, 3).map((row: any, idx: number) => {
                              const keys = Object.keys(row)
                              let labelKey = keys[0]
                              let valKey = keys.find(k => !isNaN(parseFloat(row[k])) && k !== 'ward_no' && k !== 'id') || keys[1]

                              if (keys.includes('district')) labelKey = 'district'
                              else if (keys.includes('route_no')) labelKey = 'route_no'
                              else if (keys.includes('station_name')) labelKey = 'station_name'
                              else if (keys.includes('lake_name')) labelKey = 'lake_name'
                              else if (keys.includes('zone_name')) labelKey = 'zone_name'
                              else if (keys.includes('taluk')) labelKey = 'taluk'
                              else if (keys.includes('school_name')) labelKey = 'school_name'
                              else if (keys.includes('library_name')) labelKey = 'library_name'
                              else if (keys.includes('ward_name')) labelKey = 'ward_name'

                              const label = String(row[labelKey] || '').split(' ')[0]
                              const val = parseFloat(row[valKey]) || 0
                              const vals = parsed.slice(0, 3).map((r: any) => parseFloat(r[valKey]) || 0)
                              const maxVal = Math.max(...vals, 1)
                              const widthPct = (val / maxVal) * 100

                              return (
                                <div key={idx}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{row[labelKey] || label}</span>
                                    <span style={{ color: '#36375D' }}>{row[valKey]}</span>
                                  </div>
                                  <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${widthPct}%`, height: '100%', background: '#36375D', borderRadius: '2px' }} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '10px', color: '#64748b' }}>No data points parsed</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.3px' }}>
                          Key Highlights
                        </div>
                        {parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {Object.entries(parsed).slice(0, 2).map(([key, val]: any) => (
                              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                                <span style={{ color: '#475569', fontWeight: 600, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {key.replace(/_/g, ' ')}
                                </span>
                                <strong style={{ color: '#36375D', fontWeight: 800 }}>{val}</strong>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '10px', color: '#64748b' }}>No metrics extracted</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#64748b', fontWeight: 600, borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                    <span>Parsed Items: <strong style={{ color: '#262622' }}>{doc.row_count}</strong></span>
                    <span>Synced: {new Date(doc.fetched_at).toLocaleDateString()}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <a 
                      href={doc.source_url} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{
                        padding: '8px',
                        border: '1px solid #dadad3',
                        borderRadius: '8px',
                        color: '#64748b',
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: '#ffffff',
                        transition: 'color 120ms'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#36375D'}
                      onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                    >
                      <ExternalLink size={13} />
                    </a>

                    <button
                      onClick={() => handleOpenInspect(doc)}
                      style={{
                        flex: 1,
                        background: '#36375D',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background 120ms'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#2a2b49'}
                      onMouseLeave={e => e.currentTarget.style.background = '#36375D'}
                    >
                      <span>Visual Inspector</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Inspect parsed data Modal/Drawer */}
      {inspectDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(24, 24, 27, 0.4)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'flex-end',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            width: '580px',
            height: '100%',
            background: '#ffffff',
            boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #dadad3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: inspectDoc.file_type === 'CSV' ? '#d1fae5' : '#fee2e2', color: inspectDoc.file_type === 'CSV' ? '#065f46' : '#991b1b', textTransform: 'uppercase' }}>
                  {inspectDoc.file_type} File Inspector
                </span>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#262622', margin: '4px 0 0' }}>
                  {inspectDoc.title}
                </h3>
              </div>
              <button 
                onClick={() => setInspectDoc(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                &times;
              </button>
            </div>

            {/* Selector tabs for CSV files */}
            {inspectDoc.file_type === 'CSV' && (
              <div style={{ display: 'flex', borderBottom: '1px solid #dadad3', flexShrink: 0 }}>
                <button 
                  className={`tab-btn ${inspectTab === 'chart' ? 'active' : 'inactive'}`} 
                  onClick={() => setInspectTab('chart')}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <BarChart2 size={14} />
                  <span>Visual Chart View</span>
                </button>
                <button 
                  className={`tab-btn ${inspectTab === 'table' ? 'active' : 'inactive'}`} 
                  onClick={() => setInspectTab('table')}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Table2 size={14} />
                  <span>Raw Spreadsheet Grid</span>
                </button>
              </div>
            )}

            {/* Modal Scroll Content */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              
              {/* Common File Source Panel */}
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>OpenCity Source URL</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #dadad3', borderRadius: '8px', padding: '10px', marginTop: '4px' }}>
                  <FileText size={16} style={{ color: '#36375D', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {inspectDoc.source_url}
                  </span>
                  <a href={inspectDoc.source_url} target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: '#e60023', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span>Open Link</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {/* Data Tab Panels */}
              {inspectDoc.file_type === 'CSV' ? (
                inspectTab === 'table' ? (
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Parsed CSV Spreadsheet</span>
                    <div style={{ marginTop: '8px', border: '1px solid #dadad3', borderRadius: '10px', background: '#ffffff', overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #dadad3' }}>
                              {inspectDoc.parsed_data && inspectDoc.parsed_data.length > 0 && Object.keys(inspectDoc.parsed_data[0]).map(k => (
                                <th key={k} style={{ padding: '10px 12px', fontWeight: 700, color: '#475569', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {inspectDoc.parsed_data && inspectDoc.parsed_data.map((row: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: idx < inspectDoc.parsed_data.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                {Object.values(row).map((val: any, vIdx: number) => (
                                  <td key={vIdx} style={{ padding: '10px 12px', color: '#334155', fontWeight: 500 }}>{val}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Visual SVG Bar Chart for CSV */
                  csvChartData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Metric Graph: {csvChartData.valLabel} by {csvChartData.labelLabel}
                      </span>
                      
                      <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <svg viewBox="0 0 500 240" style={{ width: '100%', height: 'auto' }}>
                          {/* Y-axis gridlines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                            const y = 30 + (1 - ratio) * 160
                            const val = (ratio * csvChartData.maxValue).toFixed(0)
                            return (
                              <g key={index}>
                                <line x1="50" y1={y} x2="480" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                                <text x="42" y={y + 4} fill="#94a3b8" fontSize="8" textAnchor="end">{val}</text>
                              </g>
                            )
                          })}
                          
                          {/* Bars and labels */}
                          {csvChartData.points.map((pt: any, idx: number) => {
                            const barCount = csvChartData.points.length
                            const totalWidth = 410 // 480 - 70
                            const barSpacing = totalWidth / barCount
                            const x = 70 + idx * barSpacing
                            const barWidth = Math.max(12, barSpacing * 0.5)
                            const barHeight = (pt.value / csvChartData.maxValue) * 160
                            const y = 190 - barHeight
                            
                            return (
                              <g key={idx}>
                                <rect 
                                  x={x - barWidth / 2} 
                                  y={y} 
                                  width={barWidth} 
                                  height={barHeight} 
                                  fill="#36375D" 
                                  rx="3" 
                                  style={{ transition: 'all 200ms' }}
                                />
                                <text 
                                  x={x} 
                                  y="205" 
                                  fill="#475569" 
                                  fontSize="8" 
                                  textAnchor="middle"
                                  transform={`rotate(-15, ${x}, 205)`}
                                  style={{ fontWeight: 700 }}
                                >
                                  {pt.label}
                                </text>
                                <text 
                                  x={x} 
                                  y={y - 6} 
                                  fill="#262622" 
                                  fontSize="8" 
                                  fontWeight="bold" 
                                  textAnchor="middle"
                                >
                                  {pt.value.toLocaleString()}
                                </text>
                              </g>
                            )
                          })}
                          <line x1="50" y1="190" x2="480" y2="190" stroke="#dadad3" strokeWidth="1.5" />
                        </svg>
                      </div>
                    </div>
                  )
                )
              ) : (
                /* PDF structured infographic inspector */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Extracted Key Metrics</span>
                    <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '12px', padding: '16px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {inspectDoc.parsed_data && Object.entries(inspectDoc.parsed_data).map(([key, val]: any) => {
                        const parsedNum = parseFloat(String(val).replace(/[^0-9.]/g, ''))
                        const hasPercentage = String(val).includes('%')
                        const isRatio = !isNaN(parsedNum) && parsedNum > 0 && parsedNum <= 100
                        return (
                          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span style={{ color: '#475569', fontWeight: 700, textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</span>
                              <span style={{ color: '#36375D', fontWeight: 800 }}>{val}</span>
                            </div>
                            {isRatio && (
                              <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${parsedNum}%`, height: '100%', background: '#36375D', borderRadius: '3px' }} />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Raw Extracted PDF Document Text</span>
                    <div style={{ background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '10px', padding: '16px', fontFamily: 'Consolas, monospace', fontSize: '11px', marginTop: '6px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {inspectDoc.raw_text}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '20px 24px', borderTop: '1px solid #dadad3', background: '#ffffff', textAlign: 'right', flexShrink: 0 }}>
              <button 
                onClick={() => setInspectDoc(null)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #dadad3',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
