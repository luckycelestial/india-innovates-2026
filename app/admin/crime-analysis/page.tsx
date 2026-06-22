'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { 
  Search, Sliders, Database, GitBranch, Crosshair, ChevronDown, ChevronUp, AlertTriangle, Shield, Activity, Star, MapPin, Calendar, Clock, X, Play, Pause, RefreshCw,
  Plus, Edit2, Trash2
} from 'lucide-react'
import { KspIncident, KspPerson, KspConnection } from '@/lib/ksp/mockData'
import { createClient } from '@/lib/db/client'

const CRIME_CATEGORIES = ['cybercrime', 'narcotics', 'theft', 'assault', 'robbery', 'murder']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']
const DISTRICTS = [
  'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 
  'Bidar', 'Chamarajanagar', 'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga', 
  'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 
  'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 
  'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 
  'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'
]

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const COMMUNITY_COLORS = [
  '#3b82f6', // Bright blue
  '#10b981', // Muted forest emerald
  '#ec4899', // Soft dusty amethyst
  '#f59e0b', // Warm sand amber
  '#06b6d4', // Steel blue teal
  '#8b5cf6', // Deeper violet
  '#64748b', // Slate gray-blue
  '#a3e635'  // Soft olive-gold
]

// Leiden community clustering algorithm
function runLeidenCommunityDetection(nodes: any[], links: any[], gamma: number) {
  let communities = new Map<string, string>()
  nodes.forEach(n => communities.set(n.id, n.id))

  const adj = new Map<string, string[]>()
  nodes.forEach(n => adj.set(n.id, []))
  links.forEach(l => {
    const s = l.incident_id
    const t = l.person_id
    if (adj.has(s) && adj.has(t)) {
      adj.get(s)!.push(t)
      adj.get(t)!.push(s)
    }
  })

  let changed = true
  let iterations = 0
  
  while (changed && iterations < 15) {
    changed = false
    iterations++
    
    const shuffled = [...nodes].sort((a, b) => a.id.localeCompare(b.id))
    
    for (let node of shuffled) {
      const currentComm = communities.get(node.id)!
      const neighbors = adj.get(node.id) || []
      
      if (neighbors.length === 0) continue
      
      const commWeights = new Map<string, number>()
      commWeights.set(currentComm, 0)
      
      neighbors.forEach(nbr => {
        const nbrComm = communities.get(nbr)!
        commWeights.set(nbrComm, (commWeights.get(nbrComm) || 0) + 2.0)
      })
      
      const commSizes = new Map<string, number>()
      communities.forEach((c) => {
        commSizes.set(c, (commSizes.get(c) || 0) + 1)
      })
      
      let bestComm = currentComm
      let maxScore = -9999
      
      commWeights.forEach((weight, comm) => {
        const size = commSizes.get(comm) || 0
        const score = weight - gamma * (size * 0.35)
        if (score > maxScore) {
          maxScore = score
          bestComm = comm
        }
      })
      
      if (bestComm !== currentComm) {
        communities.set(node.id, bestComm)
        changed = true
      }
    }
  }

  const uniqueComms = Array.from(new Set(communities.values())).sort()
  const commMap = new Map<string, number>()
  uniqueComms.forEach((c, idx) => commMap.set(c, idx + 1))
  
  const results = new Map<string, number>()
  nodes.forEach(n => {
    results.set(n.id, commMap.get(communities.get(n.id)!)!)
  })
  
  return results
}

function normalizeDistrictName(name: string): string {
  const normalized = name.toLowerCase().trim()
  if (normalized === 'bangalore' || normalized === 'bangalore urban' || normalized === 'bengaluru urban') return 'Bengaluru Urban'
  if (normalized === 'belgaum' || normalized === 'belagavi') return 'Belagavi'
  if (normalized === 'gulbarga' || normalized === 'kalaburagi') return 'Kalaburagi'
  if (normalized === 'mysore' || normalized === 'mysuru') return 'Mysuru'
  if (normalized === 'dharwad' || normalized === 'hubli-dharwad' || normalized === 'hubballi-dharwad') return 'Dharwad'
  if (normalized === 'dakshina kannada' || normalized === 'mangalore' || normalized === 'mangaluru') return 'Mangaluru'
  if (normalized === 'bellary' || normalized === 'ballari') return 'Ballari'
  if (normalized === 'bijapur' || normalized === 'vijayapura') return 'Vijayapura'
  if (normalized === 'chamrajnagar' || normalized === 'chamarajanagar') return 'Chamarajanagar'
  if (normalized === 'chikmagalur' || normalized === 'chikkamagaluru') return 'Chikkamagaluru'
  if (normalized === 'shimoga' || normalized === 'shivamogga') return 'Shivamogga'
  if (normalized === 'tumkur' || normalized === 'tumakuru') return 'Tumakuru'
  if (normalized === 'bangalore rural' || normalized === 'bengaluru rural') return 'Bengaluru Rural'
  if (normalized === 'chikkaballapura') return 'Chikkaballapura'
  if (normalized === 'bagalkot') return 'Bagalkot'
  if (normalized === 'ramanagara') return 'Ramanagara'
  if (normalized === 'bidar') return 'Bidar'
  if (normalized === 'chitradurga') return 'Chitradurga'
  if (normalized === 'davanagere') return 'Davanagere'
  if (normalized === 'gadag') return 'Gadag'
  if (normalized === 'hassan') return 'Hassan'
  if (normalized === 'haveri') return 'Haveri'
  if (normalized === 'kodagu') return 'Kodagu'
  if (normalized === 'koppal') return 'Koppal'
  if (normalized === 'mandya') return 'Mandya'
  if (normalized === 'raichur') return 'Raichur'
  if (normalized === 'udupi') return 'Udupi'
  if (normalized === 'uttara kannada') return 'Uttara Kannada'
  if (normalized === 'kolar') return 'Kolar'
  if (normalized === 'yadgir') return 'Yadgir'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export default function CrimeAnalysisPage() {
  const db = createClient()

  const [incidents, setIncidents] = useState<KspIncident[]>([])
  const [people, setPeople] = useState<KspPerson[]>([])
  const [connections, setConnections] = useState<KspConnection[]>([])

  // CRUD States
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingIncident, setEditingIncident] = useState<Partial<KspIncident>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    try {
      const res = await fetch('/api/crime')
      const data = await res.json()
      if (data.incidents && data.people && data.connections) {
        setIncidents(data.incidents)
        setPeople(data.people)
        setConnections(data.connections)
      }
    } catch (err) {
      console.error('Failed to load crime data from DB:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const validateForm = (data: Partial<KspIncident>) => {
    const errors: Record<string, string> = {}
    if (!data.category) errors.category = 'Category is required'
    if (!data.location) errors.location = 'Location is required'
    if (!data.district) errors.district = 'District is required'
    if (!data.police_station) errors.police_station = 'Police station is required'
    if (!data.date_time) errors.date_time = 'Date & Time is required'
    if (!data.priority) errors.priority = 'Priority is required'
    if (data.risk_score === undefined || isNaN(Number(data.risk_score)) || Number(data.risk_score) < 0 || Number(data.risk_score) > 100) {
      errors.risk_score = 'Risk score must be between 0 and 100'
    }
    if (data.latitude === undefined || isNaN(Number(data.latitude))) errors.latitude = 'Valid latitude is required'
    if (data.longitude === undefined || isNaN(Number(data.longitude))) errors.longitude = 'Valid longitude is required'
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm(editingIncident)) return
    setIsSaving(true)

    const newId = 'inc-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36)
    const newCaseNum = 'KSP-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000)

    const payload = {
      id: newId,
      case_number: newCaseNum,
      category: editingIncident.category,
      description: editingIncident.description || '',
      location: editingIncident.location,
      district: editingIncident.district,
      police_station: editingIncident.police_station,
      latitude: Number(editingIncident.latitude),
      longitude: Number(editingIncident.longitude),
      date_time: editingIncident.date_time,
      priority: editingIncident.priority,
      modus_operandi: editingIncident.modus_operandi || '',
      socio_economic_factors: JSON.stringify(editingIncident.socio_economic_factors || {
        urbanization: 'medium',
        density: 'moderate',
        poverty_index: 'medium'
      }),
      risk_score: Number(editingIncident.risk_score)
    }

    try {
      const { error } = await db.from('ksp_incidents').insert(payload)
      if (!error) {
        setIsAddOpen(false)
        setEditingIncident({})
        await loadData()
      } else {
        alert('Failed to register incident: ' + error.message)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!validateForm(editingIncident)) return
    setIsSaving(true)

    const payload = {
      category: editingIncident.category,
      description: editingIncident.description || '',
      location: editingIncident.location,
      district: editingIncident.district,
      police_station: editingIncident.police_station,
      latitude: Number(editingIncident.latitude),
      longitude: Number(editingIncident.longitude),
      date_time: editingIncident.date_time,
      priority: editingIncident.priority,
      modus_operandi: editingIncident.modus_operandi || '',
      socio_economic_factors: JSON.stringify(editingIncident.socio_economic_factors || {}),
      risk_score: Number(editingIncident.risk_score)
    }

    try {
      const { error } = await db
        .from('ksp_incidents')
        .eq('id', editingIncident.id)
        .update(payload)

      if (!error) {
        setIsEditOpen(false)
        setEditingIncident({})
        await loadData()
      } else {
        alert('Failed to update incident: ' + error.message)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await db.from('ksp_connections').eq('incident_id', id).delete()
      const { error } = await db.from('ksp_incidents').eq('id', id).delete()
      
      if (!error) {
        setDeletingId(null)
        await loadData()
      } else {
        alert('Failed to delete incident: ' + error.message)
      }
    } catch (err) {
      console.error(err)
    }
  }
  
  // Graph visual controls
  const [colorMode, setColorMode] = useState<'community' | 'type'>('community')
  const [gamma, setGamma] = useState(2.0)
  const [gravity, setGravity] = useState(0.02)
  const [repulsionDistance, setRepulsionDistance] = useState(110)
  
  // Zoom & Pan states (disabled/locked)

  // Leaflet Map states
  const [mapLoaded, setMapLoaded] = useState(false)
  const [geoJsonData, setGeoJsonData] = useState<any>(null)
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all')

  // Spatiotemporal Cluster States
  const [activeHour, setActiveHour] = useState<number>(12)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)

  // Custom styled dropdown states and refs
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [isDistrictOpen, setIsDistrictOpen] = useState(false)
  const [districtSearch, setDistrictSearch] = useState('')
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const districtDropdownRef = useRef<HTMLDivElement>(null)

  // Details inspector modal state
  const [inspectingIncident, setInspectingIncident] = useState<KspIncident | null>(null)

  // Layout nodes states
  const [nodes, setNodes] = useState<any[]>([])
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [registryTab, setRegistryTab] = useState<'complaints' | 'suspects'>('complaints')
  const alphaRef = useRef(1.0)
  
  // Collapsible sections
  const [showParameters, setShowParameters] = useState(false)

  // SVG Ref
  const svgRef = useRef<SVGSVGElement>(null)

  // Leaflet Map instance ref
  const leafletMapRef = useRef<any>(null)

  // Load Leaflet assets
  useEffect(() => {
    if (!document.getElementById('leaflet-css-analysis')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css-analysis'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    if ((window as any).L) {
      setMapLoaded(true)
    } else {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => setMapLoaded(true)
      document.head.appendChild(script)
    }
  }, [])

  // Load Karnataka GeoJSON
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/shuklaneerajdev/IndiaStateTopojsonFiles/master/Karnataka.geojson')
      .then(res => res.json())
      .then(data => setGeoJsonData(data))
      .catch(err => console.error('Failed to load Karnataka GeoJSON:', err))
  }, [])

  // Close custom dropdowns on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false)
      }
      if (districtDropdownRef.current && !districtDropdownRef.current.contains(event.target as Node)) {
        setIsDistrictOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const districtHistoryPushed = useRef(false)

  const selectDistrict = useCallback((name: string) => {
    if (name !== 'all') {
      window.history.pushState({ districtSelected: name }, '')
      districtHistoryPushed.current = true
    } else {
      districtHistoryPushed.current = false
    }
    setSelectedDistrict(name)
  }, [])

  const clearDistrict = useCallback(() => {
    if (districtHistoryPushed.current) {
      districtHistoryPushed.current = false
      window.history.back()
    } else {
      setSelectedDistrict('all')
    }
  }, [])

  useEffect(() => {
    const onPopState = () => {
      if (districtHistoryPushed.current) {
        districtHistoryPushed.current = false
        setSelectedDistrict('all')
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Memoize sorted unique district names from GeoJSON boundaries
  const districtNames = useMemo(() => {
    if (!geoJsonData || !geoJsonData.features) return []
    const names = geoJsonData.features.map((f: any) => normalizeDistrictName(f.properties.Dist_Name || ''))
    return Array.from(new Set(names)).sort() as string[]
  }, [geoJsonData])

  // Filtered district names matching search query
  const filteredDistrictNames = useMemo(() => {
    return districtNames.filter(name => name.toLowerCase().includes(districtSearch.toLowerCase()))
  }, [districtNames, districtSearch])

  // Bind global inspector hook for Leaflet popups
  useEffect(() => {
    (window as any).inspectNodeFromMap = (incidentId: string) => {
      handleInspectCrime(incidentId)
    }
    return () => {
      delete (window as any).inspectNodeFromMap
    }
  }, [nodes])



  // Initialize nodes positions
  useEffect(() => {
    const initialNodes = [
      ...people.map((p, idx) => {
        const angle = (idx / people.length) * Math.PI * 2
        return {
          id: p.id,
          label: p.name,
          type: p.classification,
          val: p,
          x: 420 + Math.cos(angle) * 260,
          y: 340 + Math.sin(angle) * 240,
          vx: 0, vy: 0,
          community: 1
        }
      }),
      ...incidents.map((inc, idx) => {
        const angle = (idx / incidents.length) * Math.PI * 2
        return {
          id: inc.id,
          label: inc.case_number,
          type: 'incident',
          val: inc,
          x: 420 + Math.cos(angle + 0.5) * 310,
          y: 340 + Math.sin(angle + 0.5) * 290,
          vx: 0, vy: 0,
          community: 1
        }
      })
    ]
    setNodes(initialNodes)
  }, [people, incidents])

  // Run Leiden Community detection dynamically
  const communityAssignments = useMemo(() => {
    if (nodes.length === 0) return new Map<string, number>()
    return runLeidenCommunityDetection(nodes, connections, gamma)
  }, [nodes.length, connections, gamma])

  // Attach community IDs back to active nodes
  const nodesWithCommunities = useMemo(() => {
    return nodes.map(n => ({
      ...n,
      community: communityAssignments.get(n.id) || 1
    }))
  }, [nodes, communityAssignments])

  // Heat up simulation on parameter adjustments
  useEffect(() => {
    alphaRef.current = 1.0
  }, [gamma, gravity, repulsionDistance, searchTerm, colorMode])

  // Dynamic physics simulation loop
  useEffect(() => {
    if (nodes.length === 0) return

    const interval = setInterval(() => {
      if (alphaRef.current < 0.005) {
        return 
      }

      setNodes(prevNodes => {
        const updated = prevNodes.map(n => ({ ...n, community: communityAssignments.get(n.id) || 1 }))
        const alpha = alphaRef.current
        
        // Repulsion forces
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const dx = updated[j].x - updated[i].x
            const dy = updated[j].y - updated[i].y
            const dist = Math.sqrt(dx*dx + dy*dy) || 1
            if (dist < repulsionDistance) {
              const force = (repulsionDistance - dist) * 0.08 * alpha
              const fx = (dx / dist) * force
              const fy = (dy / dist) * force
              updated[i].vx -= fx
              updated[i].vy -= fy
              updated[j].vx += fx
              updated[j].vy += fy
            }
          }
        }

        // Attraction forces
        connections.forEach(link => {
          const sNode = updated.find(n => n.id === link.incident_id)
          const tNode = updated.find(n => n.id === link.person_id)
          if (sNode && tNode) {
            const dx = tNode.x - sNode.x
            const dy = tNode.y - sNode.y
            const dist = Math.sqrt(dx*dx + dy*dy) || 1
            const force = (dist - 140) * 0.04 * alpha
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            sNode.vx += fx
            sNode.vy += fy
            tNode.vx -= fx
            tNode.vy -= fy
          }
        })

        // Gravity and friction update with community clustering
        updated.forEach(n => {
          if (n.id === draggedNodeId) return

          const totalComms = 8
          const commAngle = (n.community * 2 * Math.PI) / totalComms
          const targetX = 420 + Math.cos(commAngle) * 260
          const targetY = 340 + Math.sin(commAngle) * 240

          n.vx += (targetX - n.x) * gravity * 1.5 * alpha
          n.vy += (targetY - n.y) * gravity * 1.5 * alpha
          
          n.x += n.vx
          n.y += n.vy
          n.vx *= 0.65 
          n.vy *= 0.65
        })

        // Constraint relaxation to prevent physical node overlaps
        const minSpacing = 85
        for (let step = 0; step < step + 1; step++) {
          if (step >= 4) break
          for (let i = 0; i < updated.length; i++) {
            for (let j = i + 1; j < updated.length; j++) {
              const dx = updated[j].x - updated[i].x
              const dy = updated[j].y - updated[i].y
              const dist = Math.sqrt(dx*dx + dy*dy) || 1
              if (dist < minSpacing) {
                const overlap = minSpacing - dist
                const px = (dx / dist) * overlap * 0.5
                const py = (dy / dist) * overlap * 0.5
                
                if (updated[i].id !== draggedNodeId) {
                  updated[i].x -= px
                  updated[i].y -= py
                }
                if (updated[j].id !== draggedNodeId) {
                  updated[j].x += px
                  updated[j].y += py
                }
              }
            }
          }
        }

        // Keep in bounds final check
        updated.forEach(n => {
          n.x = Math.max(50, Math.min(790, n.x))
          n.y = Math.max(50, Math.min(630, n.y))
        })

        return updated
      })

      alphaRef.current *= 0.985
    }, 25)

    return () => clearInterval(interval)
  }, [nodes.length, connections, communityAssignments, gravity, repulsionDistance, draggedNodeId])

  // Spatiotemporal autoplay timeline effect
  useEffect(() => {
    let interval: any
    if (isPlaying) {
      interval = setInterval(() => {
        setActiveHour(prev => (prev + 1) % 24)
      }, 750)
    }
    return () => clearInterval(interval)
  }, [isPlaying])

  // Panning & Zooming Event Handlers
  const handleMouseDownCanvas = (e: React.MouseEvent<SVGSVGElement>) => {
    // Canvas panning disabled
  }

  const handleMouseUpCanvas = () => {
    setDraggedNodeId(null)
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggedNodeId) {
      alphaRef.current = 1.0 
      const rect = e.currentTarget.getBoundingClientRect()
      const viewBoxX = ((e.clientX - rect.left) / rect.width) * 840
      const viewBoxY = ((e.clientY - rect.top) / rect.height) * 680
      
      // Fixed zoom of 1.0 and panX/panY of 0
      const x = viewBoxX
      const y = viewBoxY
      
      setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x, y, vx: 0, vy: 0 } : n))
    }
  }

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodesWithCommunities.filter(n => 
      n.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [nodesWithCommunities, searchTerm])

  // Visible links
  const visibleLinks = useMemo(() => {
    return connections.filter(link => {
      const hasSource = filteredNodes.some(n => n.id === link.incident_id)
      const hasTarget = filteredNodes.some(n => n.id === link.person_id)
      return hasSource && hasTarget
    })
  }, [connections, filteredNodes])

  // Community centers and statistics
  const communityStats = useMemo(() => {
    const stats = new Map<number, { cx: number; cy: number; count: number; maxDist: number }>()
    nodesWithCommunities.forEach(n => {
      const comm = n.community
      if (!stats.has(comm)) {
        stats.set(comm, { cx: 0, cy: 0, count: 0, maxDist: 40 })
      }
      const val = stats.get(comm)!
      val.cx += n.x
      val.cy += n.y
      val.count++
    })
    
    stats.forEach((val) => {
      val.cx = val.cx / val.count
      val.cy = val.cy / val.count
    })

    nodesWithCommunities.forEach(n => {
      const comm = n.community
      const val = stats.get(comm)!
      const dx = n.x - val.cx
      const dy = n.y - val.cy
      const dist = Math.sqrt(dx*dx + dy*dy)
      if (dist > val.maxDist) val.maxDist = dist
    })

    return stats
  }, [nodesWithCommunities])

  // Get total community partition count
  const totalCommunitiesCount = useMemo(() => {
    const comms = new Set(nodesWithCommunities.map(n => n.community))
    return comms.size
  }, [nodesWithCommunities])

  // Dynamic ranking of entities (PageRank style)
  const criticalThreatVectors = useMemo(() => {
    const degreeMap = new Map<string, number>()
    
    people.forEach(p => degreeMap.set(p.id, 0))
    incidents.forEach(i => degreeMap.set(i.id, 0))
    
    connections.forEach(c => {
      if (degreeMap.has(c.incident_id)) {
        degreeMap.set(c.incident_id, degreeMap.get(c.incident_id)! + 1)
      }
      if (degreeMap.has(c.person_id)) {
        degreeMap.set(c.person_id, degreeMap.get(c.person_id)! + 1)
      }
    })
    
    const list: Array<{ id: string; label: string; type: string; score: number }> = []
    
    people.forEach(p => {
      const deg = degreeMap.get(p.id) || 0
      const score = deg === 3 ? 1.9 : deg === 2 ? 1.8 : deg === 1 ? 0.8 : 0.5
      list.push({
        id: p.id,
        label: p.name,
        type: p.classification.toUpperCase(),
        score
      })
    })
    
    incidents.forEach(inc => {
      const deg = degreeMap.get(inc.id) || 0
      const score = deg >= 3 ? 1.9 : deg === 2 ? 1.4 : deg === 1 ? 0.8 : 0.5
      list.push({
        id: inc.id,
        label: inc.case_number,
        type: 'COMPLAINT',
        score
      })
    })
    
    return list.sort((a, b) => b.score - a.score).slice(0, 5)
  }, [people, incidents, connections])

  // Filtered incidents for Spatiotemporal Heatmap view (with +/- 4 hour clustering window)
  const activeHeatmapIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (selectedCategory !== 'all' && inc.category !== selectedCategory) {
        return false
      }
      const hour = new Date(inc.date_time).getHours()
      const diff = Math.abs(hour - activeHour)
      return diff <= 4 || (24 - diff) <= 4
    })
  }, [incidents, activeHour, selectedCategory])

  // Compute stats for police intelligence panel
  const districtPoliceStats = useMemo(() => {
    // Filter incidents by district first
    const districtIncidents = incidents.filter(inc => {
      if (selectedDistrict === 'all') return true
      return normalizeDistrictName(inc.district) === normalizeDistrictName(selectedDistrict)
    })

    // Filter by category if selected
    const categoryFiltered = districtIncidents.filter(inc => {
      if (selectedCategory === 'all') return true
      return inc.category === selectedCategory
    })

    const totalInDistrict = districtIncidents.length
    const activeInWindow = categoryFiltered.filter(inc => {
      const hour = new Date(inc.date_time).getHours()
      const diff = Math.abs(hour - activeHour)
      return diff <= 4 || (24 - diff) <= 4
    }).length

    if (districtIncidents.length === 0) {
      return {
        total: 0,
        activeInWindow: 0,
        avgRisk: 0,
        primaryCategory: 'N/A',
        topStation: 'N/A',
        alertLevel: 'Low',
        density: 'N/A',
        urbanization: 'N/A',
        poverty: 'N/A',
      }
    }

    // Average risk score
    const avgRisk = districtIncidents.reduce((sum, inc) => sum + inc.risk_score, 0) / districtIncidents.length

    // Primary crime category
    const catCounts: Record<string, number> = {}
    districtIncidents.forEach(inc => {
      catCounts[inc.category] = (catCounts[inc.category] || 0) + 1
    })
    let primaryCategory = 'N/A'
    let maxCatCount = 0
    Object.entries(catCounts).forEach(([cat, count]) => {
      if (count > maxCatCount) {
        maxCatCount = count
        primaryCategory = cat
      }
    })

    // Most active police station
    const psCounts: Record<string, number> = {}
    districtIncidents.forEach(inc => {
      psCounts[inc.police_station] = (psCounts[inc.police_station] || 0) + 1
    })
    let topStation = 'N/A'
    let maxPsCount = 0
    Object.entries(psCounts).forEach(([ps, count]) => {
      if (count > maxPsCount) {
        maxPsCount = count
        topStation = ps
      }
    })

    // Alert Level based on priorities
    const priorities = districtIncidents.map(inc => inc.priority)
    const hasUrgent = priorities.includes('urgent')
    const highCount = priorities.filter(p => p === 'high').length
    let alertLevel = 'Low'
    if (hasUrgent) alertLevel = 'Urgent'
    else if (highCount >= 2) alertLevel = 'High'
    else if (highCount > 0 || priorities.includes('medium')) alertLevel = 'Medium'

    // Socio-economic modes
    const densities = districtIncidents.map(inc => inc.socio_economic_factors?.density || 'moderate')
    const density = densities.sort((a,b) => densities.filter(v => v===a).length - densities.filter(v => v===b).length).length > 0
      ? densities.sort((a,b) => densities.filter(v => v===a).length - densities.filter(v => v===b).length).pop()
      : 'moderate'

    const urbanizations = districtIncidents.map(inc => inc.socio_economic_factors?.urbanization || 'medium')
    const urbanization = urbanizations.sort((a,b) => urbanizations.filter(v => v===a).length - urbanizations.filter(v => v===b).length).length > 0
      ? urbanizations.sort((a,b) => urbanizations.filter(v => v===a).length - urbanizations.filter(v => v===b).length).pop()
      : 'medium'

    const povertyIndices = districtIncidents.map(inc => inc.socio_economic_factors?.poverty_index || 'medium')
    const poverty = povertyIndices.sort((a,b) => povertyIndices.filter(v => v===a).length - povertyIndices.filter(v => v===b).length).length > 0
      ? povertyIndices.sort((a,b) => povertyIndices.filter(v => v===a).length - povertyIndices.filter(v => v===b).length).pop()
      : 'medium'

    return {
      total: totalInDistrict,
      activeInWindow,
      avgRisk,
      primaryCategory,
      topStation,
      alertLevel,
      density,
      urbanization,
      poverty
    }
  }, [incidents, selectedDistrict, selectedCategory, activeHour])

  // Find linked people for the inspector modal
  const linkedModalPeople = useMemo(() => {
    if (!inspectingIncident) return []
    return connections
      .filter(c => c.incident_id === inspectingIncident.id)
      .map(c => {
        const person = people.find(p => p.id === c.person_id)
        return {
          ...person,
          role: c.role
        }
      })
  }, [inspectingIncident, connections, people])

  // Handle focusing/selecting a node
  const handleInspectCrime = (incidentId: string) => {
    const matched = nodesWithCommunities.find(n => n.id === incidentId)
    if (matched) {
      setSelectedNode(matched)
      alphaRef.current = 1.0 
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Handle full case detail lookup modal popup
  const handleOpenCaseDetails = (incident: KspIncident) => {
    setInspectingIncident(incident)
  }

  // Calculate temporal crime distribution values for bottom histogram
  const temporalDistribution = useMemo(() => {
    const distribution = Array(24).fill(0)
    incidents.forEach(inc => {
      const hour = new Date(inc.date_time).getHours()
      distribution[hour]++
    })
    return distribution
  }, [incidents])

  // Leaflet Spatiotemporal Map loader effect
  useEffect(() => {
    if (!mapLoaded || !(window as any).L) return

    const L = (window as any).L

    if (leafletMapRef.current) {
      leafletMapRef.current.remove()
      leafletMapRef.current = null
    }

    // Initialize Leaflet map centered on Karnataka
    const map = L.map('crime-spatiotemporal-leaflet-map', {
      zoomSnap: 0.1,
      zoomDelta: 0.1,
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      dragging: false
    }).setView([15.013923, 76.193331], 6.80)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    leafletMapRef.current = map

    // Calculate active crime counts per district from activeHeatmapIncidents
    const crimeCountsPerDistrict = activeHeatmapIncidents.reduce((acc, inc) => {
      const normName = normalizeDistrictName(inc.district)
      acc[normName] = (acc[normName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Draw district boundaries from GeoJSON
    let geoJsonLayer: any = null
    if (geoJsonData) {
      geoJsonLayer = L.geoJSON(geoJsonData, {
        filter: (feature: any) => {
          if (selectedDistrict === 'all') return true
          const dName = feature.properties.Dist_Name || ''
          const normalizedName = normalizeDistrictName(dName)
          return normalizeDistrictName(selectedDistrict) === normalizedName
        },
        style: (feature: any) => {
          const dName = feature.properties.Dist_Name || ''
          const normalizedName = normalizeDistrictName(dName)
          const count = crimeCountsPerDistrict[normalizedName] || 0
          
          let fillClr = '#cbd5e1'
          if (count >= 4) fillClr = '#ef4444'
          else if (count === 3) fillClr = '#f97316'
          else if (count === 2) fillClr = '#eab308'
          else if (count === 1) fillClr = '#93c5fd'
          else fillClr = '#f1f5f9'
          
          return {
            color: '#475569',
            weight: 1.5,
            fillColor: fillClr,
            fillOpacity: 0.4
          }
        },
        onEachFeature: (feature: any, layer: any) => {
          const dName = feature.properties.Dist_Name || ''
          const normalizedName = normalizeDistrictName(dName)
          const count = crimeCountsPerDistrict[normalizedName] || 0
          
          layer.on('click', (e: any) => {
            L.DomEvent.stopPropagation(e)
            selectDistrict(normalizedName)
          })

          layer.bindPopup(`
            <div style="font-family: sans-serif; min-width: 140px; padding: 4px; color: #1e293b;">
              <h4 style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                📍 ${dName} District
              </h4>
              <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; color: #334155;">
                <span>Active Crimes: <strong>${count} cases</strong></span>
              </div>
            </div>
          `)
        }
      }).addTo(map)
    }

    // Plot incident nodes dynamically
    activeHeatmapIncidents.forEach(inc => {
      const color = inc.priority === 'urgent' ? '#ef4444' : inc.priority === 'high' ? '#f97316' : '#eab308'
      const marker = L.circleMarker([inc.latitude, inc.longitude], {
        radius: inc.priority === 'urgent' ? 12 : inc.priority === 'high' ? 9 : 7,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.75
      }).addTo(map)

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 11px; color: #1e293b; width: 180px;">
          <div style="font-weight: 800; font-size: 12px; color: #0f172a; margin-bottom: 2px;">
            📁 Case File: ${inc.case_number}
          </div>
          <div style="font-weight: 700; color: ${color}; text-transform: uppercase; margin-bottom: 6px; font-size: 9px;">
            Category: ${inc.category}
          </div>
          <p style="margin: 0 0 8px; line-height: 1.4; color: #334155;">
            ${inc.description}
          </p>
          <div style="margin-bottom: 3px;"><strong>M.O.:</strong> ${inc.modus_operandi}</div>
          <div style="margin-bottom: 3px;"><strong>Location:</strong> ${inc.location}</div>
          <div><strong>Reported:</strong> ${new Date(inc.date_time).toLocaleTimeString()}</div>
          <div style="margin-top: 8px; display: flex; justify-content: flex-end; gap: 4px;">
            <button 
              onclick="window.inspectNodeFromMap('${inc.id}')"
              style="background: #2563eb; color: #ffffff; border: none; font-size: 8px; font-weight: 800; padding: 4px 8px; border-radius: 4px; cursor: pointer; outline: none;"
            >
              INSPECT NODE
            </button>
          </div>
        </div>
      `)
    })

    // Fit bounds of the GeoJSON layer to fit the state/district stretch perfectly in vertical viewport
    const fitTimer = setTimeout(() => {
      try {
        map.invalidateSize()
        if (selectedDistrict === 'all') {
          if (geoJsonLayer && geoJsonLayer.getLayers().length > 0) {
            map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] })
          } else {
            map.setView([15.013923, 76.193331], 6.80)
          }
        } else if (geoJsonLayer && geoJsonLayer.getLayers().length > 0) {
          map.fitBounds(geoJsonLayer.getBounds(), { padding: [5, 5] })
        } else {
          map.setView([15.013923, 76.193331], 6.80)
        }
      } catch (err) {
        console.error('Failed to fit bounds:', err)
      }
    }, 200)

    return () => {
      clearTimeout(fitTimer)
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [mapLoaded, geoJsonData, activeHour, selectedCategory, activeHeatmapIncidents, selectedDistrict, selectDistrict])

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', display: 'flex', flexDirection: 'column', fontFamily: FONT_SANS }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        input[type=range] {
          -webkit-appearance: none;
          width: 100%;
          background: transparent;
        }
        input[type=range]:focus {
          outline: none;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: #e2e8f0;
          border-radius: 2px;
        }
        input[type=range]::-webkit-slider-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          -webkit-appearance: none;
          margin-top: -4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }
      `}} />

      {/* Page Header */}
      <header style={{
        height: '70px',
        borderBottom: '1px solid #e2e8f0',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: FONT_DISPLAY, letterSpacing: '-0.3px' }}>
              Threat Intelligence Network
            </h1>
          </div>
        </div>

        {/* Profile indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>CM_PORTAL</div>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>CM Secretariat</div>
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: '#475569',
            fontSize: '13px'
          }}>
            CM
          </div>
        </div>
      </header>

      {/* Unified Tab Bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', padding: '0 24px', flexShrink: 0 }}>
        <Link href="/admin/analytics" style={{ padding: '12px 16px', color: '#64748b', borderBottom: '3px solid transparent', fontWeight: 600, textDecoration: 'none', fontSize: '14px', display: 'inline-block', transition: 'all 150ms' }} onMouseEnter={e => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.borderBottomColor = '#cbd5e1' }} onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderBottomColor = 'transparent' }}>
          📈 SentinelPulse Analytics
        </Link>
        <Link href="/admin/crime-analysis" style={{ padding: '12px 16px', color: '#e60023', borderBottom: '3px solid #e60023', fontWeight: 700, textDecoration: 'none', fontSize: '14px', display: 'inline-block', transition: 'all 150ms' }}>
          🕸️ Threat Network
        </Link>
        <Link href="/admin/crimes" style={{ padding: '12px 16px', color: '#64748b', borderBottom: '3px solid transparent', fontWeight: 600, textDecoration: 'none', fontSize: '14px', display: 'inline-block', transition: 'all 150ms' }} onMouseEnter={e => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.borderBottomColor = '#cbd5e1' }} onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderBottomColor = 'transparent' }}>
          👮 Crime Registry
        </Link>
      </div>

      {/* Main Workspace Layout (Row 1 Grid) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '7fr 3fr',
        gap: '24px',
        padding: '24px',
        boxSizing: 'border-box'
      }}>

        {/* LEFT COLUMN: Topology Visualizer */}
        <div style={{
          background: '#111c30',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          height: '780px',
          position: 'relative'
        }}>
          {/* Topology Header */}
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 20
          }}>
            <div>
              <h2 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#ffffff', margin: 0 }}>
                INTELLIGENCE NETWORK TOPOLOGY
              </h2>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>
                Powered by Neo4j Louvain Community Detection
              </p>
            </div>
            <div style={{
              background: '#b91c1c',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 800,
              padding: '4px 8px',
              borderRadius: '4px',
              letterSpacing: '0.5px'
            }}>
              LIVE GRAPH
            </div>
          </div>

          {/* SVG Visual Canvas */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {/* Legend / Overlay stats inside card */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: 'rgba(17, 28, 48, 0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              gap: '12px',
              zIndex: 10,
              backdropFilter: 'blur(4px)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Communities</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6' }}>{totalCommunitiesCount} Partitions</span>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Nodes / Links</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc' }}>{nodes.length} / {connections.length}</span>
              </div>
            </div>

            {/* Filter mode button toggle overlay */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(17, 28, 48, 0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '3px',
              display: 'flex',
              gap: '2px',
              zIndex: 10
            }}>
              <button 
                onClick={() => setColorMode('community')}
                style={{
                  background: colorMode === 'community' ? '#2563eb' : 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Leiden Clusters
              </button>
              <button 
                onClick={() => setColorMode('type')}
                style={{
                  background: colorMode === 'type' ? '#2563eb' : 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Categories
              </button>
            </div>

            <svg 
              ref={svgRef}
              viewBox="0 0 840 680"
              style={{ width: '100%', height: '100%', cursor: draggedNodeId ? 'grabbing' : 'default' }}
              onMouseDown={handleMouseDownCanvas}
              onMouseUp={handleMouseUpCanvas}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseUpCanvas}
            >
              <defs>
                <filter id="comm-blur-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="18" />
                </filter>
              </defs>

              {/* Group containing all elements to apply translation and scaling */}
              <g transform="translate(0, 0) scale(1)">
                
                {/* Links */}
                {visibleLinks.map(link => {
                  const sNode = nodesWithCommunities.find(n => n.id === link.incident_id)
                  const tNode = nodesWithCommunities.find(n => n.id === link.person_id)
                  if (!sNode || !tNode) return null
                  
                  const isSelected = selectedNode && (selectedNode.id === sNode.id || selectedNode.id === tNode.id)
                  const connectionColor = colorMode === 'community' && sNode.community === tNode.community
                    ? COMMUNITY_COLORS[sNode.community % COMMUNITY_COLORS.length]
                    : 'rgba(255,255,255,0.15)'
                  
                  return (
                    <line
                      key={link.id}
                      x1={sNode.x}
                      y1={sNode.y}
                      x2={tNode.x}
                      y2={tNode.y}
                      stroke={isSelected ? '#ef4444' : connectionColor}
                      strokeWidth={isSelected ? '2.5' : '1.0'}
                      strokeDasharray={link.role === 'witness' ? '4, 4' : '0'}
                      opacity={isSelected ? 0.95 : 0.45}
                    />
                  )
                })}

                {/* Contours */}
                {colorMode === 'community' && Array.from(communityStats.entries()).map(([commId, data]) => {
                  if (data.count < 2) return null
                  const color = COMMUNITY_COLORS[commId % COMMUNITY_COLORS.length]
                  return (
                    <g key={`contour-${commId}`}>
                      <circle
                        cx={data.cx}
                        cy={data.cy}
                        r={data.maxDist + 16}
                        fill={color}
                        fillOpacity="0.05"
                        filter="url(#comm-blur-glow)"
                      />
                      <circle
                        cx={data.cx}
                        cy={data.cy}
                        r={data.maxDist + 24}
                        fill="transparent"
                        stroke={color}
                        strokeOpacity="0.15"
                        strokeWidth="1"
                        strokeDasharray="4, 4"
                      />
                    </g>
                  )
                })}

                {/* Nodes */}
                {filteredNodes.map(node => {
                  const isSelected = selectedNode && selectedNode.id === node.id
                  const isLinked = selectedNode && connections.some(l => 
                    (l.incident_id === node.id && l.person_id === selectedNode.id) ||
                    (l.person_id === node.id && l.incident_id === selectedNode.id)
                  )

                  let markerColor = '#94a3b8'
                  if (colorMode === 'community') {
                    markerColor = COMMUNITY_COLORS[node.community % COMMUNITY_COLORS.length]
                  } else {
                    if (node.type === 'suspect') markerColor = '#ef4444'
                    else if (node.type === 'victim') markerColor = '#10b981'
                    else if (node.type === 'incident') markerColor = '#f59e0b'
                    else markerColor = '#a855f7'
                  }

                  const size = node.type === 'incident' ? 12 : 14

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x},${node.y})`}
                      onMouseDown={(e) => {
                        e.stopPropagation() // Stop event to prevent background pan start
                        alphaRef.current = 1.0 
                        setDraggedNodeId(node.id)
                        setSelectedNode(node)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        r={size + 5}
                        fill="transparent"
                        stroke={markerColor}
                        strokeWidth="1.5"
                        strokeOpacity={isSelected ? 0.8 : isLinked ? 0.35 : 0}
                      />

                      {node.type === 'incident' ? (
                        <rect 
                          x={-size} 
                          y={-size} 
                          width={size * 2} 
                          height={size * 2} 
                          rx="4"
                          fill="#0b1329"
                          stroke={markerColor}
                          strokeWidth="3"
                          opacity={selectedNode && !isSelected && !isLinked ? 0.35 : 1}
                        />
                      ) : (
                        <circle
                          r={size}
                          fill="#0b1329"
                          stroke={markerColor}
                          strokeWidth="3"
                          opacity={selectedNode && !isSelected && !isLinked ? 0.35 : 1}
                        />
                      )}

                      {/* Text label card */}
                      <rect
                        x={-Math.min(90, node.label.length * 2.8 + 4)}
                        y={size + 6}
                        width={Math.min(180, node.label.length * 5.6 + 8)}
                        height={12}
                        rx="3"
                        fill="rgba(11, 19, 41, 0.9)"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="0.5"
                        style={{ pointerEvents: 'none' }}
                        opacity={selectedNode && !isSelected && !isLinked ? 0.25 : 1}
                      />

                      <text
                        y={size + 15}
                        fill={isSelected ? '#ffffff' : '#cbd5e1'}
                        fontSize="8"
                        fontWeight={isSelected ? '800' : '700'}
                        textAnchor="middle"
                        opacity={selectedNode && !isSelected && !isLinked ? 0.35 : 1}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {node.label}
                      </text>
                    </g>
                  )
                })}
              </g>
            </svg>
          </div>

          {/* Topology Footer Legend */}
          <div style={{
            height: '42px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: '#0d1629',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            fontSize: '9px',
            fontWeight: 700,
            color: '#94a3b8',
            flexShrink: 0,
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '2px' }}></div>
              <span>Incident Case (Orange)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }}></div>
              <span>Suspect (Red)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div>
              <span>Victim (Green)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', background: '#a855f7', borderRadius: '50%' }}></div>
              <span>Associate (Purple)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '1.5px', background: '#475569' }}></div>
              <span>Direct Link</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Critical Threat Vectors & Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Critical Threat Vectors */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#1e293b', margin: 0 }}>
              CRITICAL THREAT VECTORS
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5, margin: '8px 0 16px' }}>
              The nodes below possess the highest PageRank scores globally, indicating they act as central focal points for surrounding complaints or actor networks.
            </p>

            {/* List of Vectors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {criticalThreatVectors.map((vector, idx) => (
                <div 
                  key={vector.id} 
                  onClick={() => handleInspectCrime(vector.id)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '8px',
                    transition: 'background-color 150ms'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Rank Index Box */}
                    <div style={{
                      width: '28px',
                      height: '28px',
                      background: '#fee2e2',
                      color: '#ef4444',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 800
                    }}>
                      {idx + 1}
                    </div>
                    {/* Node details */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                        {vector.label}
                      </div>
                      <div style={{ fontSize: '9px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginTop: '1px' }}>
                        {vector.type}
                      </div>
                    </div>
                  </div>
                  {/* Score */}
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    {vector.score.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Analytic Parameters & Tuning */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#1e293b', margin: '0 0 16px' }}>
              ANALYTIC PARAMETERS
            </h3>

            {/* Entity Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Total Entities</span>
                <span style={{ background: '#d1fae5', color: '#065f46', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px' }}>
                  {nodes.length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Connections</span>
                <span style={{ background: '#d1fae5', color: '#065f46', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px' }}>
                  {connections.length}
                </span>
              </div>
            </div>

            {/* Leiden parameters accordion toggle */}
            <button
              onClick={() => setShowParameters(!showParameters)}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                color: '#2563eb',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                outline: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={12} />
                <span>LEIDEN ENGINE TUNING</span>
              </div>
              {showParameters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showParameters && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: '#475569' }}>
                    <span>Gamma (Resolution)</span>
                    <span>{gamma.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="2.0" 
                    step="0.05"
                    value={gamma} 
                    onChange={e => setGamma(parseFloat(e.target.value))}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: '#475569' }}>
                    <span>Gravity</span>
                    <span>{gravity.toFixed(4)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.001" 
                    max="0.02" 
                    step="0.001"
                    value={gravity} 
                    onChange={e => setGravity(parseFloat(e.target.value))}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: '#475569' }}>
                    <span>Gap Distance</span>
                    <span>{repulsionDistance}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="300" 
                    step="10"
                    value={repulsionDistance} 
                    onChange={e => setRepulsionDistance(parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}

            {/* Inspector Panel */}
            <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '16px', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '10px' }}>
                <Crosshair size={13} />
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Node Inspector</span>
              </div>

              {selectedNode ? (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', color: selectedNode.type === 'incident' ? '#d97706' : '#2563eb', marginBottom: '2px' }}>
                    {selectedNode.type}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', flex: 1 }}>
                      {selectedNode.label}
                    </h4>
                    {selectedNode.type === 'incident' && (
                      <button
                        onClick={() => handleOpenCaseDetails(selectedNode.val)}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#475569',
                          fontSize: '8px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginLeft: '6px'
                        }}
                      >
                        Profile
                      </button>
                    )}
                  </div>

                  {selectedNode.type === 'incident' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px', color: '#475569' }}>
                      <div><strong style={{ color: '#64748b' }}>Location:</strong> {selectedNode.val.location}</div>
                      <div><strong style={{ color: '#64748b' }}>MO:</strong> <span style={{ fontStyle: 'italic' }}>{selectedNode.val.modus_operandi}</span></div>
                      <div><strong style={{ color: '#64748b' }}>Risk Score:</strong> <span style={{ fontWeight: 700, color: '#d97706' }}>{selectedNode.val.risk_score}</span></div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px', color: '#475569' }}>
                      <div><strong style={{ color: '#64748b' }}>Demographics:</strong> {selectedNode.val.demographics?.age} yo, {selectedNode.val.demographics?.gender}</div>
                      <div><strong style={{ color: '#64748b' }}>Job:</strong> {selectedNode.val.demographics?.occupation}</div>
                      <div><strong style={{ color: '#64748b' }}>Partition:</strong> Community #{selectedNode.community}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ border: '1px dashed #cbd5e1', borderRadius: '10px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '11px', textAlign: 'center', padding: '10px' }}>
                  Click node in canvas or table to inspect attributes
                </div>
              )}
            </div>

            {/* Neo4j Style "N" Logo bottom right */}
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#0c1629',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '11px',
              fontFamily: 'serif',
              alignSelf: 'flex-end',
              marginTop: '16px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              N
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Comprehensive Spatiotemporal Crime Heatmap (Leaflet OSM Integration) */}
      <div style={{
        padding: '0 24px 24px 24px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Heatmap Header */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              SPATIOTEMPORAL CRIME HEATMAP
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
              Interactive OpenStreetMap geospatial visualization with active crime hot spots &amp; temporal filters.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', width: '100%' }}>
            {/* Map Frame */}
            <div style={{ flex: '1.1 1 450px', minWidth: '320px', position: 'relative', minHeight: '760px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Leaflet container mount */}
              <div id="crime-spatiotemporal-leaflet-map" style={{ height: '100%', width: '100%', zIndex: 1 }} />

              {selectedDistrict !== 'all' && (
                <button
                  onClick={() => clearDistrict()}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    zIndex: 2000,
                    background: '#ffffff',
                    border: '2px solid #2563eb',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    transition: 'all 150ms ease'
                  }}
                >
                  <span>←</span>
                  <span>Back to State View</span>
                </button>
              )}
              
              {(!mapLoaded || !geoJsonData) && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                  <div style={{ textAlign: 'center', color: '#475569', fontSize: '13px', fontWeight: 700 }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                    Loading interactive OpenStreetMap overlays & boundaries...
                  </div>
                  <style>{`
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                  `}</style>
                </div>
              )}
            </div>

            {/* Map Controls */}
            <div style={{ flex: '1 1 320px', minWidth: '300px', display: 'flex', flexDirection: 'column', justifyItems: 'space-between', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', minHeight: '760px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Timeline display */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{
                      background: '#2563eb',
                      border: 'none',
                      color: '#ffffff',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                    }}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
                  </button>
                  <div>
                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Active Timeline</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                      {activeHour.toString().padStart(2, '0')}:00 hrs
                    </div>
                  </div>
                </div>

                {/* Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 700, color: '#64748b' }}>
                    <span>00:00</span>
                    <span>23:00</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="23"
                    step="1"
                    value={activeHour}
                    onChange={e => setActiveHour(parseInt(e.target.value))}
                  />
                </div>

                {/* Category selection */}
                <div 
                  ref={categoryDropdownRef}
                  style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}
                >
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Crime Type</span>
                  <button
                    onClick={() => {
                      setIsCategoryOpen(!isCategoryOpen)
                      setIsDistrictOpen(false)
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      outline: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'left',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <span>
                      {[
                        { value: 'all', label: 'All Categories' },
                        { value: 'cybercrime', label: 'Cybercrime' },
                        { value: 'narcotics', label: 'Narcotics' },
                        { value: 'theft', label: 'Theft' },
                        { value: 'assault', label: 'Assault' },
                        { value: 'robbery', label: 'Robbery' },
                        { value: 'murder', label: 'Murder' }
                      ].find(c => c.value === selectedCategory)?.label || selectedCategory}
                    </span>
                    <ChevronDown 
                      size={14} 
                      style={{ 
                        color: '#64748b',
                        transform: isCategoryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 150ms ease'
                      }} 
                    />
                  </button>

                  {isCategoryOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
                      zIndex: 150,
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}>
                      {[
                        { value: 'all', label: 'All Categories' },
                        { value: 'cybercrime', label: 'Cybercrime' },
                        { value: 'narcotics', label: 'Narcotics' },
                        { value: 'theft', label: 'Theft' },
                        { value: 'assault', label: 'Assault' },
                        { value: 'robbery', label: 'Robbery' },
                        { value: 'murder', label: 'Murder' }
                      ].map((opt) => {
                        const isSelected = selectedCategory === opt.value
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setSelectedCategory(opt.value)
                              setIsCategoryOpen(false)
                            }}
                            style={{
                              background: isSelected ? '#2563eb' : 'transparent',
                              color: isSelected ? '#ffffff' : '#334155',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '8px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%',
                              transition: 'background-color 100ms, color 100ms',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                            onMouseEnter={e => {
                              if (!isSelected) {
                                e.currentTarget.style.background = '#f1f5f9'
                                e.currentTarget.style.color = '#0f172a'
                              }
                            }}
                            onMouseLeave={e => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.color = '#334155'
                              }
                            }}
                          >
                            <span>{opt.label}</span>
                            {isSelected && (
                              <span style={{ fontSize: '10px', fontWeight: 800 }}>✓</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Focus District Zoom Control */}
                <div 
                  ref={districtDropdownRef}
                  style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}
                >
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Focus District</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                    <button
                      onClick={() => {
                        setIsDistrictOpen(!isDistrictOpen)
                        setIsCategoryOpen(false)
                        setDistrictSearch('') // Reset search query on toggle
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        outline: 'none',
                        cursor: 'pointer',
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        textAlign: 'left',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      <span>
                        {selectedDistrict === 'all' ? 'All Districts (State View)' : selectedDistrict}
                      </span>
                      <ChevronDown 
                        size={14} 
                        style={{ 
                          color: '#64748b',
                          transform: isDistrictOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 150ms ease'
                        }} 
                      />
                    </button>
                    
                    {selectedDistrict !== 'all' && (
                      <button
                        onClick={() => clearDistrict()}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#475569',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                          transition: 'background-color 100ms'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {isDistrictOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
                      zIndex: 150,
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      maxHeight: '260px'
                    }}>
                      {/* Search Bar inside popup */}
                      <div style={{ padding: '4px', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                          type="text"
                          placeholder="Search district..."
                          value={districtSearch}
                          onChange={e => setDistrictSearch(e.target.value)}
                          onClick={e => e.stopPropagation()} // Prevent closing dropdown on input click
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            color: '#0f172a',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '6px 10px',
                            width: '100%',
                            outline: 'none'
                          }}
                        />
                      </div>

                      {/* Dropdown Options List */}
                      <div style={{
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        flex: 1
                      }}>
                        {/* Option: All Districts */}
                        {('all'.includes(districtSearch.toLowerCase()) || 'state view'.includes(districtSearch.toLowerCase())) && (
                          <button
                            onClick={() => {
                              clearDistrict()
                              setIsDistrictOpen(false)
                            }}
                            style={{
                              background: selectedDistrict === 'all' ? '#2563eb' : 'transparent',
                              color: selectedDistrict === 'all' ? '#ffffff' : '#334155',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '8px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%',
                              transition: 'background-color 100ms, color 100ms',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                            onMouseEnter={e => {
                              if (selectedDistrict !== 'all') {
                                e.currentTarget.style.background = '#f1f5f9'
                                e.currentTarget.style.color = '#0f172a'
                              }
                            }}
                            onMouseLeave={e => {
                              if (selectedDistrict !== 'all') {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.color = '#334155'
                              }
                            }}
                          >
                            <span>All Districts (State View)</span>
                            {selectedDistrict === 'all' && (
                              <span style={{ fontSize: '10px', fontWeight: 800 }}>✓</span>
                            )}
                          </button>
                        )}

                        {/* Mapped districts */}
                        {filteredDistrictNames.map((name) => {
                          const isSelected = selectedDistrict === name
                          return (
                            <button
                              key={name}
                              onClick={() => {
                                selectDistrict(name)
                                setIsDistrictOpen(false)
                              }}
                              style={{
                                background: isSelected ? '#2563eb' : 'transparent',
                                color: isSelected ? '#ffffff' : '#334155',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '8px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                transition: 'background-color 100ms, color 100ms',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                              onMouseEnter={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = '#f1f5f9'
                                  e.currentTarget.style.color = '#0f172a'
                                }
                              }}
                              onMouseLeave={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'transparent'
                                  e.currentTarget.style.color = '#334155'
                                }
                              }}
                            >
                              <span>{name}</span>
                              {isSelected && (
                                <span style={{ fontSize: '10px', fontWeight: 800 }}>✓</span>
                              )}
                            </button>
                          )
                        })}

                        {filteredDistrictNames.length === 0 && !'all'.includes(districtSearch.toLowerCase()) && (
                          <div style={{
                            padding: '8px 10px',
                            fontSize: '11px',
                            color: '#64748b',
                            textAlign: 'center',
                            fontStyle: 'italic'
                          }}>
                            No districts found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Police Intelligence Profile */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      👮 Dept Intelligence
                    </span>
                    <span style={{
                      background: districtPoliceStats.alertLevel === 'Urgent' ? '#fee2e2' : districtPoliceStats.alertLevel === 'High' ? '#ffedd5' : '#e0f2fe',
                      color: districtPoliceStats.alertLevel === 'Urgent' ? '#991b1b' : districtPoliceStats.alertLevel === 'High' ? '#c2410c' : '#0369a1',
                      fontSize: '8px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase'
                    }}>
                      {districtPoliceStats.alertLevel} Alert
                    </span>
                  </div>

                  {/* 2x2 Grid of stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>District Crimes</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{districtPoliceStats.total}</div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Active in Window</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>{districtPoliceStats.activeInWindow}</div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Average Risk</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                        {districtPoliceStats.avgRisk.toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Primary Crime</div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', marginTop: '4px', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={districtPoliceStats.primaryCategory}>
                        {districtPoliceStats.primaryCategory}
                      </div>
                    </div>
                  </div>

                  {/* Most Active Station */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Most Active PS:</span>
                    <span style={{ color: '#0f172a', fontWeight: 800 }}>{districtPoliceStats.topStation}</span>
                  </div>

                  {/* Socio-Economic Threat Profiler */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '8px', padding: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Socio-Economic Risk Drivers
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#166534', fontWeight: 700, marginTop: '2px' }}>
                      <span>Density: <strong style={{ color: '#15803d', textTransform: 'uppercase' }}>{districtPoliceStats.density}</strong></span>
                      <span>Urbanization: <strong style={{ color: '#15803d', textTransform: 'uppercase' }}>{districtPoliceStats.urbanization}</strong></span>
                      <span>Poverty: <strong style={{ color: '#15803d', textTransform: 'uppercase' }}>{districtPoliceStats.poverty}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Histogram analysis */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '8px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Temporal Count Profile
                  </span>
                  <span style={{ fontSize: '8px', fontWeight: 800, color: '#3b82f6', background: '#eff6ff', padding: '1px 6px', borderRadius: '4px' }}>
                    Active: {activeHour.toString().padStart(2, '0')}:00 ({temporalDistribution[activeHour]} cases)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '40px', gap: '2px', padding: '4px 0 2px 0', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', paddingLeft: '4px', paddingRight: '4px' }}>
                  {temporalDistribution.map((count, hour) => {
                    const isActive = hour === activeHour
                    const isHovered = hour === hoveredHour
                    const percentage = Math.max(10, (count / Math.max(1, ...temporalDistribution)) * 100)
                    return (
                      <div
                        key={`hist-${hour}`}
                        onClick={() => setActiveHour(hour)}
                        onMouseEnter={() => setHoveredHour(hour)}
                        onMouseLeave={() => setHoveredHour(null)}
                        style={{
                          flex: 1,
                          height: `${percentage}%`,
                          background: isActive ? '#3b82f6' : isHovered ? 'rgba(59, 130, 246, 0.5)' : 'rgba(148, 163, 184, 0.2)',
                          borderRadius: '2px 2px 0 0',
                          cursor: 'pointer',
                          transition: 'background-color 100ms'
                        }}
                        title={`${count} crimes at ${hour.toString().padStart(2, '0')}:00`}
                      />
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#64748b', fontWeight: 700, padding: '0 4px', marginTop: '2px' }}>
                  <span>00:00</span>
                  <span>04:00</span>
                  <span>08:00</span>
                  <span>12:00</span>
                  <span>16:00</span>
                  <span>20:00</span>
                  <span>23:00</span>
                </div>
              </div>

              {/* Map Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', fontWeight: 700, color: '#475569' }}>
                  <div style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
                  <span>Urgent Crimes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', fontWeight: 700, color: '#475569' }}>
                  <div style={{ width: '8px', height: '8px', background: '#f97316', borderRadius: '50%' }} />
                  <span>High Severity</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', fontWeight: 700, color: '#475569' }}>
                  <div style={{ width: '8px', height: '8px', background: '#eab308', borderRadius: '50%' }} />
                  <span>Medium / Low</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Comprehensive Tabular Crime Registry */}
      <div style={{
        padding: '0 24px 48px 24px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          {/* Table Header toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                CRIME REGISTRY DETAILS
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                {registryTab === 'complaints'
                  ? 'Full repository database of registered incidents, severity indices, and modus operandi profiles.'
                  : 'Registry of key suspect profiles, demographics, primary occupations, and associated cases.'}
              </p>
            </div>
            
            {/* Search filter input and Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', gap: '8px', width: '220px' }}>
                <Search size={14} style={{ color: '#64748b' }} />
                <input 
                  type="text" 
                  placeholder={registryTab === 'complaints' ? "Search registry crimes..." : "Search suspects..."}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#0f172a',
                    fontSize: '12px',
                    outline: 'none',
                    width: '100%',
                    fontWeight: 500
                  }}
                />
              </div>

              {registryTab === 'complaints' && (
                <button
                  onClick={() => {
                    setEditingIncident({
                      category: 'theft',
                      priority: 'medium',
                      district: DISTRICTS[4] || 'Bengaluru Urban',
                      risk_score: 50.0,
                      latitude: 12.9716,
                      longitude: 77.5946,
                      socio_economic_factors: {
                        urbanization: 'medium',
                        density: 'moderate',
                        poverty_index: 'medium'
                      }
                    })
                    setFormErrors({})
                    setIsAddOpen(true)
                  }}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'opacity 150ms'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <Plus size={12} />
                  <span>Register Incident</span>
                </button>
              )}
            </div>
          </div>

          {/* Toggle buttons for Complaints vs Suspects */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}>
            <button
              onClick={() => {
                setRegistryTab('complaints')
                setSearchTerm('')
              }}
              style={{
                background: registryTab === 'complaints' ? '#2563eb' : '#f1f5f9',
                color: registryTab === 'complaints' ? '#ffffff' : '#475569',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 150ms'
              }}
            >
              Complaints
            </button>
            <button
              onClick={() => {
                setRegistryTab('suspects')
                setSearchTerm('')
              }}
              style={{
                background: registryTab === 'suspects' ? '#2563eb' : '#f1f5f9',
                color: registryTab === 'suspects' ? '#ffffff' : '#475569',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 150ms'
              }}
            >
              Suspects
            </button>
          </div>

          {/* Table Element */}
          <div style={{ overflowX: 'auto' }}>
            {registryTab === 'complaints' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '12px 16px' }}>Case Number</th>
                    <th style={{ padding: '12px 16px' }}>Category</th>
                    <th style={{ padding: '12px 16px' }}>Location</th>
                    <th style={{ padding: '12px 16px' }}>Modus Operandi</th>
                    <th style={{ padding: '12px 16px' }}>Severity</th>
                    <th style={{ padding: '12px 16px' }}>Risk Score</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents
                    .filter(inc => inc.case_number.toLowerCase().includes(searchTerm.toLowerCase()) || inc.modus_operandi.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((inc) => {
                      const isSelected = selectedNode && selectedNode.id === inc.id
                      
                      let priorityColor = '#64748b'
                      let priorityBg = '#f1f5f9'
                      if (inc.priority === 'urgent') {
                        priorityColor = '#b91c1c'
                        priorityBg = '#fee2e2'
                      } else if (inc.priority === 'high') {
                        priorityColor = '#c2410c'
                        priorityBg = '#ffedd5'
                      } else if (inc.priority === 'medium') {
                        priorityColor = '#1d4ed8'
                        priorityBg = '#dbeafe'
                      }

                      return (
                        <tr 
                          key={inc.id}
                          style={{ 
                            borderBottom: '1px solid #f1f5f9', 
                            background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                            transition: 'background-color 100ms'
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                            <span 
                              onClick={() => handleOpenCaseDetails(inc)}
                              style={{ cursor: 'pointer', textDecoration: 'underline', color: '#2563eb' }}
                              title="Click to view full case details and network connections"
                            >
                              {inc.case_number}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textTransform: 'capitalize', color: '#475569', fontWeight: 600 }}>
                            {inc.category}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#475569' }}>
                            {inc.location}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#64748b', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inc.modus_operandi}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ 
                              color: priorityColor, 
                              background: priorityBg, 
                              fontSize: '10px', 
                              fontWeight: 800, 
                              padding: '3px 8px', 
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}>
                              {inc.priority}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, color: '#0f172a', width: '28px' }}>{inc.risk_score}</span>
                              <div style={{ width: '60px', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${inc.risk_score}%`, height: '100%', background: inc.risk_score > 80 ? '#ef4444' : '#f59e0b', borderRadius: '3px' }}></div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                            <button
                              onClick={() => handleOpenCaseDetails(inc)}
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                color: '#475569',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '10px',
                                cursor: 'pointer'
                              }}
                            >
                              Details
                            </button>
                            <button
                              onClick={() => handleInspectCrime(inc.id)}
                              style={{
                                background: '#3b82f6',
                                color: '#ffffff',
                                border: 'none',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '10px',
                                cursor: 'pointer',
                                transition: 'opacity 150ms'
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                            >
                              Inspect Node
                            </button>
                            <button
                              onClick={() => {
                                setEditingIncident({ ...inc })
                                setFormErrors({})
                                setIsEditOpen(true)
                              }}
                              title="Edit Incident"
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                color: '#1d4ed8',
                                padding: '5px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => setDeletingId(inc.id)}
                              title="Delete Incident Record"
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                color: '#dc2626',
                                padding: '5px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '12px 16px' }}>Name / Alias</th>
                    <th style={{ padding: '12px 16px' }}>Age</th>
                    <th style={{ padding: '12px 16px' }}>Gender</th>
                    <th style={{ padding: '12px 16px' }}>Occupation</th>
                    <th style={{ padding: '12px 16px' }}>Associated Cases</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {people
                    .filter(p => p.classification === 'suspect')
                    .filter(p => {
                      const nameMatch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
                      const occMatch = p.demographics?.occupation?.toLowerCase().includes(searchTerm.toLowerCase())
                      return nameMatch || occMatch
                    })
                    .map((p) => {
                      const isSelected = selectedNode && selectedNode.id === p.id
                      const associatedCases = connections
                        .filter(c => c.person_id === p.id)
                        .map(c => incidents.find(inc => inc.id === c.incident_id))
                        .filter((inc): inc is KspIncident => !!inc)

                      return (
                        <tr 
                          key={p.id}
                          style={{ 
                            borderBottom: '1px solid #f1f5f9', 
                            background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                            transition: 'background-color 100ms'
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                            {p.name}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#475569' }}>
                            {p.demographics?.age || 'N/A'}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#475569' }}>
                            {p.demographics?.gender || 'N/A'}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#64748b' }}>
                            {p.demographics?.occupation || 'N/A'}
                          </td>
                          <td style={{ padding: '14px 16px', maxWidth: '300px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {associatedCases.map(inc => (
                                <span 
                                  key={inc.id}
                                  onClick={() => handleOpenCaseDetails(inc)}
                                  style={{
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    color: '#2563eb',
                                    fontWeight: 600,
                                    fontSize: '10px',
                                    background: '#eff6ff',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #dbeafe'
                                  }}
                                  title={inc.description}
                                >
                                  {inc.case_number}
                                </span>
                              ))}
                              {associatedCases.length === 0 && (
                                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>None</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleInspectCrime(p.id)}
                              style={{
                                background: '#3b82f6',
                                color: '#ffffff',
                                border: 'none',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '10px',
                                cursor: 'pointer',
                                transition: 'opacity 150ms'
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                            >
                              Inspect Node
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* FULL CRIME PROFILE DETAILS MODAL DIALOG */}
      {inspectingIncident && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '24px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #e2e8f0',
            fontFamily: FONT_SANS
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#2563eb', background: '#dbeafe', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    {inspectingIncident.category}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: inspectingIncident.priority === 'urgent' ? '#b91c1c' : inspectingIncident.priority === 'high' ? '#c2410c' : '#1d4ed8',
                    background: inspectingIncident.priority === 'urgent' ? '#fee2e2' : inspectingIncident.priority === 'high' ? '#ffedd5' : '#dbeafe',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {inspectingIncident.priority} Priority
                  </span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '6px 0 0', fontFamily: FONT_DISPLAY }}>
                  Case File: {inspectingIncident.case_number}
                </h3>
              </div>
              <button
                onClick={() => setInspectingIncident(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  outline: 'none'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Section 1: Description */}
              <div>
                <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>
                  Incident Description
                </h4>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                    {inspectingIncident.description}
                  </p>
                </div>
              </div>

              {/* Section 2: Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Geospatial Information
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={13} /> <span>{inspectingIncident.location}, {inspectingIncident.district}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={13} /> <span>Jrsd: {inspectingIncident.police_station}</span></div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Temporal &amp; Risk Metrics
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={13} /> <span>Occurred: {new Date(inspectingIncident.date_time).toLocaleString()}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={13} /> <span style={{ fontWeight: 700, color: '#ef4444' }}>Risk Index: {inspectingIncident.risk_score}/100</span></div>
                  </div>
                </div>
              </div>

              {/* Section 3: MO & Socio-Economic */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>
                    Modus Operandi (M.O.)
                  </h4>
                  <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>
                    "{inspectingIncident.modus_operandi}"
                  </p>
                </div>
                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>
                    Sociological Context
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569' }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between' }}><span>Urbanization level:</span> <span style={{ fontWeight: 700 }}>{inspectingIncident.socio_economic_factors.urbanization}</span></div>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between' }}><span>Pop Density:</span> <span style={{ fontWeight: 700 }}>{inspectingIncident.socio_economic_factors.density}</span></div>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between' }}><span>Poverty Index:</span> <span style={{ fontWeight: 700 }}>{inspectingIncident.socio_economic_factors.poverty_index}</span></div>
                  </div>
                </div>
              </div>

              {/* Section 4: Linked Actors */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>
                  Connected Actors &amp; Network Nodes ({linkedModalPeople.length})
                </h4>

                {linkedModalPeople.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {linkedModalPeople.map(p => {
                      let roleColor = '#475569'
                      let roleBg = '#f1f5f9'
                      if (p.role === 'primary_suspect') {
                        roleColor = '#b91c1c'
                        roleBg = '#fee2e2'
                      } else if (p.role === 'accomplice') {
                        roleColor = '#c2410c'
                        roleBg = '#ffedd5'
                      } else if (p.role === 'victim') {
                        roleColor = '#15803d'
                        roleBg = '#dcfce7'
                      }

                      return (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>👤 {p.name}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                              Demographics: {p.demographics?.age} yo {p.demographics?.gender} | Occupation: {p.demographics?.occupation}
                            </div>
                          </div>
                          <span style={{
                            color: roleColor,
                            background: roleBg,
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>
                            {p.role?.replace('_', ' ')}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '12px', border: '1px dashed #cbd5e1', borderRadius: '10px' }}>
                    No linked suspects, victims, or witnesses catalogued.
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              borderBottomLeftRadius: '16px',
              borderBottomRightRadius: '16px'
            }}>
              <button
                onClick={() => setInspectingIncident(null)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close Profile
              </button>
              <button
                onClick={() => {
                  const id = inspectingIncident.id
                  setInspectingIncident(null)
                  handleInspectCrime(id)
                }}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Inspect on Graph
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {(isAddOpen || isEditOpen) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '640px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', fontFamily: FONT_SANS }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: FONT_DISPLAY }}>
                {isAddOpen ? 'Register Crime Case' : `Edit Incident ${editingIncident.case_number}`}
              </h3>
              <button onClick={() => { setIsAddOpen(false); setIsEditOpen(false) }} style={{ background: 'none', border: 'none', fontSize: '20px', fontWeight: 700, cursor: 'pointer', color: '#64748b', outline: 'none' }}>&times;</button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Category *</label>
                  <select
                    value={editingIncident.category || ''}
                    onChange={e => setEditingIncident(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: `1.5px solid ${formErrors.category ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a' }}
                  >
                    <option value="" disabled>Select Category</option>
                    {CRIME_CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </select>
                  {formErrors.category && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.category}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Priority *</label>
                  <select
                    value={editingIncident.priority || ''}
                    onChange={e => setEditingIncident(prev => ({ ...prev, priority: e.target.value as any }))}
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: `1.5px solid ${formErrors.priority ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a' }}
                  >
                    <option value="" disabled>Select Priority</option>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                  {formErrors.priority && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.priority}</span>}
                </div>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>District *</label>
                  <select
                    value={editingIncident.district || ''}
                    onChange={e => setEditingIncident(prev => ({ ...prev, district: e.target.value }))}
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: `1.5px solid ${formErrors.district ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a' }}
                  >
                    <option value="" disabled>Select District</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {formErrors.district && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.district}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Police Station Jurisdiction *</label>
                  <input
                    type="text"
                    value={editingIncident.police_station || ''}
                    onChange={e => setEditingIncident(prev => ({ ...prev, police_station: e.target.value }))}
                    placeholder="e.g. Indiranagar PS"
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${formErrors.police_station ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box', color: '#0f172a' }}
                  />
                  {formErrors.police_station && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.police_station}</span>}
                </div>
              </div>

              {/* Row 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Ward Location / Landmark *</label>
                  <input
                    type="text"
                    value={editingIncident.location || ''}
                    onChange={e => setEditingIncident(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. Ward 12, Main Cross near Mall"
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${formErrors.location ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box', color: '#0f172a' }}
                  />
                  {formErrors.location && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.location}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Risk Score (0 - 100) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingIncident.risk_score === undefined ? '' : editingIncident.risk_score}
                    onChange={e => setEditingIncident(prev => ({ ...prev, risk_score: parseFloat(e.target.value) }))}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${formErrors.risk_score ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box', color: '#0f172a' }}
                  />
                  {formErrors.risk_score && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.risk_score}</span>}
                </div>
              </div>

              {/* Row 4 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Incident Date &amp; Time *</label>
                  <input
                    type="text"
                    value={editingIncident.date_time || ''}
                    onChange={e => setEditingIncident(prev => ({ ...prev, date_time: e.target.value }))}
                    placeholder="e.g. 2026-06-20T14:30:00Z"
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${formErrors.date_time ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box', color: '#0f172a' }}
                  />
                  {formErrors.date_time && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.date_time}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Latitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editingIncident.latitude === undefined ? '' : editingIncident.latitude}
                    onChange={e => setEditingIncident(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${formErrors.latitude ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box', color: '#0f172a' }}
                  />
                  {formErrors.latitude && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.latitude}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Longitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editingIncident.longitude === undefined ? '' : editingIncident.longitude}
                    onChange={e => setEditingIncident(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${formErrors.longitude ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box', color: '#0f172a' }}
                  />
                  {formErrors.longitude && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.longitude}</span>}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Description</label>
                <textarea
                  rows={2}
                  value={editingIncident.description || ''}
                  onChange={e => setEditingIncident(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Case description and logs summary..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Modus Operandi (M.O.)</label>
                <textarea
                  rows={2}
                  value={editingIncident.modus_operandi || ''}
                  onChange={e => setEditingIncident(prev => ({ ...prev, modus_operandi: e.target.value }))}
                  placeholder="e.g. Phishing emails targeting elderly..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: '#0f172a' }}
                />
              </div>

              {/* Socio-economic inputs */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Socio-Economic Threat Index Parameters</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Urbanization</label>
                    <select
                      value={editingIncident.socio_economic_factors?.urbanization || 'medium'}
                      onChange={e => setEditingIncident(prev => {
                        const current: any = prev.socio_economic_factors || {};
                        return {
                          ...prev,
                          socio_economic_factors: {
                            urbanization: e.target.value as any,
                            density: current.density || 'moderate',
                            poverty_index: current.poverty_index || 'medium'
                          }
                        };
                      })}
                      style={{ width: '100%', height: '34px', padding: '0 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '12.5px', outline: 'none', background: '#fff', boxSizing: 'border-box', color: '#0f172a' }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Pop Density</label>
                    <select
                      value={editingIncident.socio_economic_factors?.density || 'moderate'}
                      onChange={e => setEditingIncident(prev => {
                        const current: any = prev.socio_economic_factors || {};
                        return {
                          ...prev,
                          socio_economic_factors: {
                            urbanization: current.urbanization || 'medium',
                            density: e.target.value as any,
                            poverty_index: current.poverty_index || 'medium'
                          }
                        };
                      })}
                      style={{ width: '100%', height: '34px', padding: '0 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '12.5px', outline: 'none', background: '#fff', boxSizing: 'border-box', color: '#0f172a' }}
                    >
                      <option value="sparse">Sparse</option>
                      <option value="moderate">Moderate</option>
                      <option value="dense">Dense</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Poverty Index</label>
                    <select
                      value={editingIncident.socio_economic_factors?.poverty_index || 'medium'}
                      onChange={e => setEditingIncident(prev => {
                        const current: any = prev.socio_economic_factors || {};
                        return {
                          ...prev,
                          socio_economic_factors: {
                            urbanization: current.urbanization || 'medium',
                            density: current.density || 'moderate',
                            poverty_index: e.target.value as any
                          }
                        };
                      })}
                      style={{ width: '100%', height: '34px', padding: '0 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '12.5px', outline: 'none', background: '#fff', boxSizing: 'border-box', color: '#0f172a' }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => { setIsAddOpen(false); setIsEditOpen(false) }}
                style={{ background: '#fff', border: '1.5px solid #dadad3', borderRadius: '10px', padding: '8px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                onClick={isAddOpen ? handleCreate : handleUpdate}
                disabled={isSaving}
                style={{ background: '#2563eb', border: 'none', borderRadius: '10px', padding: '8px 20px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', color: '#fff', opacity: isSaving ? 0.7 : 1 }}
              >
                {isSaving ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '380px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '24px', fontFamily: FONT_SANS }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', fontFamily: FONT_DISPLAY }}>Delete Incident Record?</h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.5, margin: '0 0 20px' }}>
              Are you sure you want to delete this incident from the database? This action will also delete all associated actor connections and cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setDeletingId(null)}
                style={{ background: '#fff', border: '1.5px solid #dadad3', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                style={{ background: '#dc2626', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#fff' }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
