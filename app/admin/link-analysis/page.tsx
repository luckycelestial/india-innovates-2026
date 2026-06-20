'use client'

import { useEffect, useState } from 'react'
// Removed Supabase client
import { 
  Users, MapPin, Search, RefreshCw, Radio, 
  HelpCircle, ExternalLink, ShieldAlert, Award
} from 'lucide-react'
import { MOCK_INCIDENTS, MOCK_PEOPLE, MOCK_CONNECTIONS, KspIncident, KspPerson, KspConnection } from '@/lib/ksp/mockData'

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function LinkAnalysisPage() {
  const [incidents, setIncidents] = useState<KspIncident[]>(MOCK_INCIDENTS)
  const [people, setPeople] = useState<KspPerson[]>(MOCK_PEOPLE)
  const [connections, setConnections] = useState<KspConnection[]>(MOCK_CONNECTIONS)
  const [loading, setLoading] = useState(false)

  // Layout Nodes State
  const [nodes, setNodes] = useState<any[]>([])
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)

  // Search Filter
  const [searchTerm, setSearchTerm] = useState('')

  // Dynamic spring-force simulation loop
  useEffect(() => {
    if (loading || people.length === 0) return

    let tempNodes = [
      ...people.map((p, idx) => ({
        id: p.id,
        label: p.name,
        type: p.classification, // 'suspect' | 'victim' | 'associate'
        val: p,
        x: 180 + Math.random() * 300,
        y: 120 + Math.random() * 200,
        vx: 0, vy: 0
      })),
      ...incidents.map((inc, idx) => ({
        id: inc.id,
        label: inc.case_number,
        type: 'incident',
        val: inc,
        x: 180 + Math.random() * 300,
        y: 120 + Math.random() * 200,
        vx: 0, vy: 0
      }))
    ]

    const interval = setInterval(() => {
      // Repulsion force
      for (let i = 0; i < tempNodes.length; i++) {
        for (let j = i + 1; j < tempNodes.length; j++) {
          const dx = tempNodes[j].x - tempNodes[i].x
          const dy = tempNodes[j].y - tempNodes[i].y
          const dist = Math.sqrt(dx*dx + dy*dy) || 1
          if (dist < 150) {
            const force = (150 - dist) * 0.08
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            tempNodes[i].vx -= fx
            tempNodes[i].vy -= fy
            tempNodes[j].vx += fx
            tempNodes[j].vy += fy
          }
        }
      }

      // Attraction force along links
      connections.forEach(link => {
        const sourceNode = tempNodes.find(n => n.id === link.incident_id)
        const targetNode = tempNodes.find(n => n.id === link.person_id)
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x
          const dy = targetNode.y - sourceNode.y
          const dist = Math.sqrt(dx*dx + dy*dy) || 1
          const force = (dist - 120) * 0.04
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          sourceNode.vx += fx
          sourceNode.vy += fy
          targetNode.vx -= fx
          targetNode.vy -= fy
        }
      })

      // Central gravity pull and bounds restriction
      tempNodes.forEach(node => {
        if (node.id === draggedNodeId) return // Skip physics for current dragged node
        
        node.vx += (400 - node.x) * 0.006
        node.vy += (250 - node.y) * 0.006
        
        node.x += node.vx
        node.y += node.vy
        
        node.vx *= 0.82
        node.vy *= 0.82

        // Keep inside boundaries
        node.x = Math.max(40, Math.min(760, node.x))
        node.y = Math.max(40, Math.min(460, node.y))
      })

      setNodes([...tempNodes])
    }, 25)

    return () => clearInterval(interval)
  }, [loading, people, incidents, connections, draggedNodeId])

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedNodeId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x, y, vx: 0, vy: 0 } : n))
  }

  // Filtered nodes based on search
  const filteredNodes = nodes.filter(n => 
    n.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Find all links related to filtered nodes
  const visibleLinks = connections.filter(link => {
    const hasSource = filteredNodes.some(n => n.id === link.incident_id)
    const hasTarget = filteredNodes.some(n => n.id === link.person_id)
    return hasSource && hasTarget
  })

  // Repeat offender calculation (suspects connected to multiple incidents)
  const offenderCounts = connections.reduce((acc, current) => {
    if (current.role === 'primary_suspect' || current.role === 'accomplice') {
      acc[current.person_id] = (acc[current.person_id] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const repeatOffenders = Object.entries(offenderCounts)
    .filter(([_, count]) => count > 1)
    .map(([personId, count]) => {
      const personObj = people.find(p => p.id === personId)
      return { person: personObj, count }
    })

  return (
    <main style={{ minHeight: '100vh', background: '#f6f6f3', padding: '40px 24px', fontFamily: FONT_SANS }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Title strip */}
        <div style={{
          background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)',
          borderRadius: '16px',
          padding: '24px 32px',
          color: '#ffffff',
          marginBottom: '32px',
          boxShadow: '0 4px 20px rgba(17, 24, 39, 0.15)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#818cf8', marginBottom: '8px' }}>
                <Radio size={12} className="animate-pulse" />
                Criminological Link Analysis
              </div>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '32px', color: '#ffffff' }}>
                Relationship Mapping &amp; Association Detection
              </h1>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
                Interactive force-directed graph tracking linkages between suspects, victims, and recurring coordinates.
              </p>
            </div>
          </div>
        </div>

        {/* Network and Info Panels Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '28px', alignItems: 'start' }}>
          
          {/* Node Link Diagram Area */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #dadad3',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#000000' }}>
                  Interactive Association Graph
                </h3>
                <p style={{ fontSize: '12px', color: '#262622' }}>
                  Drag nodes to adjust layout. Click node to inspect criminal profile and interconnected linkages.
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search name/case..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #dadad3',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* SVG Interactive Canvas */}
            <div style={{ background: '#0b0f19', borderRadius: '16px', overflow: 'hidden', border: '1px solid #262622' }}>
              <svg 
                viewBox="0 0 800 500" 
                style={{ width: '100%', height: 'auto', cursor: draggedNodeId ? 'grabbing' : 'grab' }}
                onMouseMove={handleMouseMove}
                onMouseUp={() => setDraggedNodeId(null)}
                onMouseLeave={() => setDraggedNodeId(null)}
              >
                {/* Connection Links */}
                {visibleLinks.map(link => {
                  const source = nodes.find(n => n.id === link.incident_id)
                  const target = nodes.find(n => n.id === link.person_id)
                  if (!source || !target) return null
                  
                  const isSelected = selectedNode && (selectedNode.id === source.id || selectedNode.id === target.id)
                  
                  return (
                    <line
                      key={link.id}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isSelected ? '#818cf8' : '#262622'}
                      strokeWidth={isSelected ? '2.5' : '1'}
                      strokeDasharray={link.role === 'witness' ? '4' : '0'}
                      opacity={isSelected ? 0.9 : 0.4}
                    />
                  )
                })}

                {/* Nodes Group */}
                {filteredNodes.map(node => {
                  const isSelected = selectedNode && selectedNode.id === node.id
                  const isLinked = selectedNode && connections.some(l => 
                    (l.incident_id === node.id && l.person_id === selectedNode.id) ||
                    (l.person_id === node.id && l.incident_id === selectedNode.id)
                  )
                  
                  // Style configurations
                  let nodeColor = '#e60023'
                  let r = 18
                  if (node.type === 'suspect') {
                    nodeColor = '#f43f5e' // Red
                  } else if (node.type === 'victim') {
                    nodeColor = '#7B8F65' // Green
                  } else if (node.type === 'incident') {
                    nodeColor = '#eab308' // Yellow
                    r = 15
                  }

                  return (
                    <g 
                      key={node.id}
                      transform={`translate(${node.x},${node.y})`}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        setDraggedNodeId(node.id)
                        setSelectedNode(node)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        r={r}
                        fill={nodeColor}
                        stroke={isSelected ? '#ffffff' : isLinked ? '#818cf8' : 'none'}
                        strokeWidth="3.5"
                        opacity={selectedNode && !isSelected && !isLinked ? 0.4 : 1}
                      />
                      {node.type === 'incident' ? (
                        <rect x="-6" y="-6" width="12" height="12" fill="#000000" />
                      ) : (
                        <circle r="4" fill="#000000" />
                      )}
                      
                      {/* Node Text labels */}
                      <text
                        y={r + 14}
                        fill={isSelected ? '#ffffff' : '#94a3b8'}
                        fontSize="10"
                        fontWeight={isSelected ? '700' : '600'}
                        textAnchor="middle"
                        opacity={selectedNode && !isSelected && !isLinked ? 0.3 : 1}
                      >
                        {node.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>

          {/* Sidebar drawer showing profiles / Repeat Offenders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Selected Node Details Panel */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #dadad3',
              padding: '24px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
              minHeight: '220px'
            }}>
              {selectedNode ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid #dadad3', paddingBottom: '12px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: selectedNode.type === 'suspect' ? '#f43f5e' : selectedNode.type === 'victim' ? '#7B8F65' : '#eab308' }}>
                        {selectedNode.type} profile
                      </div>
                      <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#000000', marginTop: '2px' }}>
                        {selectedNode.label}
                      </h3>
                    </div>
                  </div>

                  {selectedNode.type === 'incident' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#262622' }}>
                      <div><strong>Location:</strong> {selectedNode.val.location}, {selectedNode.val.district}</div>
                      <div><strong>Modus Operandi:</strong> {selectedNode.val.modus_operandi}</div>
                      <div><strong>Description:</strong> {selectedNode.val.description}</div>
                      <div><strong>Threat Level:</strong> {selectedNode.val.priority.toUpperCase()}</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#262622' }}>
                      <div><strong>Age / Gender:</strong> {selectedNode.val.demographics?.age} / {selectedNode.val.demographics?.gender}</div>
                      <div><strong>Last Known Profession:</strong> {selectedNode.val.demographics?.occupation}</div>
                      
                      {/* Connection links list */}
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontWeight: 700, marginBottom: '6px', color: '#000000' }}>Linked Cases:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {connections
                            .filter(c => c.person_id === selectedNode.id)
                            .map(c => {
                              const inc = incidents.find(i => i.id === c.incident_id)
                              return (
                                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f6f6f3', borderRadius: '4px', border: '1px solid #dadad3' }}>
                                  <span>📁 {inc?.case_number}</span>
                                  <span style={{ fontWeight: 600, color: '#f43f5e' }}>{c.role}</span>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', color: '#94a3b8', textAlign: 'center' }}>
                  <Users size={32} style={{ marginBottom: '10px', color: '#dadad3' }} />
                  <p style={{ fontSize: '13px' }}>Click any suspect or case node on the link graph to analyze associations</p>
                </div>
              )}
            </div>

            {/* Repeat Offender profiles list (MO Jurisdiction analytics) */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #dadad3',
              padding: '24px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#000000', marginBottom: '4px' }}>
                Repeat Offender Profiles
              </h3>
              <p style={{ fontSize: '12px', color: '#262622', marginBottom: '16px' }}>
                Cross-jurisdictional offenders linked to multiple incidents across KSP.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {repeatOffenders.map(ro => {
                  if (!ro.person) return null
                  return (
                    <div 
                      key={ro.person.id} 
                      onClick={() => setSelectedNode(nodes.find(n => n.id === ro.person?.id))}
                      style={{
                        padding: '12px',
                        borderRadius: '16px',
                        border: '1px solid #fca5a5',
                        background: '#fff5f5',
                        cursor: 'pointer',
                        transition: 'all 120ms'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#991b1b' }}>{ro.person.name}</span>
                        <span style={{ background: '#f87171', color: '#ffffff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                          {ro.count} Incidents
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#7f1d1d' }}>
                        MO: {ro.person.classification === 'suspect' ? 'Specialized signal grabbers & weld cutters.' : 'Associated partner'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

        </div>

      </div>
    </main>
  )
}
