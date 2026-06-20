'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Search, Plus, Trash2, Edit2, Check, X, ShieldAlert, 
  Award, Activity, Layers, CornerDownRight, Settings, Grid 
} from 'lucide-react'

type Category = {
  id: string
  name: string
  description: string | null
  status: 'active' | 'inactive'
  department_name: string | null
  secondary_department_name: string | null
  escalation_target: string | null
  priority_weight: number
  created_at: string
}

type Department = {
  id: string
  name: string
  officer_count: number
  escalation_target: string | null
  status: 'active' | 'inactive'
}

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const PRIORITY_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Low', color: '#475569', bg: '#f1f5f9' },
  2: { label: 'Medium', color: '#024ad8', bg: '#e8f0fe' },
  3: { label: 'High', color: '#b45309', bg: '#fef3c7' },
  4: { label: 'Urgent', color: '#b3262b', bg: '#fee2e2' },
}

export default function CategoryDepartmentManagementPage() {
  const supabase = createClient()

  // Data states
  const [categories, setCategories] = useState<Category[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  // Filter/Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Selected object state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  
  // Modals state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false)

  // Form states for Category creation
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [newCatDept, setNewCatDept] = useState('')
  const [newCatPriority, setNewCatPriority] = useState(2)

  // Form states for Department creation
  const [newDeptName, setNewDeptName] = useState('')
  const [newDeptEscalation, setNewDeptEscalation] = useState('')
  const [newDeptOfficers, setNewDeptOfficers] = useState(0)

  // Editor states (for editing selected category)
  const [editDeptName, setEditDeptName] = useState('')
  const [editSecDeptName, setEditSecDeptName] = useState('')
  const [editEscalation, setEditEscalation] = useState('')
  const [editPriority, setEditPriority] = useState(2)
  const [editDesc, setEditDesc] = useState('')
  const [editName, setEditName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Load data
  const loadData = async () => {
    try {
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true })

      if (!catError && catData) setCategories(catData)
      if (!deptError && deptData) setDepartments(deptData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Sync editor fields when selected category changes
  useEffect(() => {
    if (selectedCategory) {
      setEditName(selectedCategory.name)
      setEditDesc(selectedCategory.description || '')
      setEditDeptName(selectedCategory.department_name || '')
      setEditSecDeptName(selectedCategory.secondary_department_name || '')
      setEditEscalation(selectedCategory.escalation_target || '')
      setEditPriority(selectedCategory.priority_weight)
    } else {
      setEditName('')
      setEditDesc('')
      setEditDeptName('')
      setEditSecDeptName('')
      setEditEscalation('')
      setEditPriority(2)
    }
  }, [selectedCategory])

  // Handle category toggle status
  const handleToggleCatStatus = async (cat: Category) => {
    const nextStatus = cat.status === 'active' ? 'inactive' : 'active'
    try {
      const { error } = await supabase
        .from('categories')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', cat.id)

      if (!error) {
        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, status: nextStatus } : c))
        if (selectedCategory?.id === cat.id) {
          setSelectedCategory(prev => prev ? { ...prev, status: nextStatus } : null)
        }
      }
    } catch (e) {
      alert('Error toggling status')
    }
  }

  // Handle saving details
  const handleSaveChanges = async () => {
    if (!selectedCategory) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: editName.trim(),
          description: editDesc.trim() || null,
          department_name: editDeptName || null,
          secondary_department_name: editSecDeptName || null,
          escalation_target: editEscalation.trim() || null,
          priority_weight: editPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCategory.id)

      if (!error) {
        setCategories(prev => prev.map(c => c.id === selectedCategory.id ? { 
          ...c, 
          name: editName.trim(),
          description: editDesc.trim() || null,
          department_name: editDeptName || null,
          secondary_department_name: editSecDeptName || null,
          escalation_target: editEscalation.trim() || null,
          priority_weight: editPriority
        } : c))
        setSelectedCategory(prev => prev ? {
          ...prev,
          name: editName.trim(),
          description: editDesc.trim() || null,
          department_name: editDeptName || null,
          secondary_department_name: editSecDeptName || null,
          escalation_target: editEscalation.trim() || null,
          priority_weight: editPriority
        } : null)
        alert('Changes saved successfully!')
      } else {
        alert('Failed to update category: ' + error.message)
      }
    } catch (e) {
      alert('Error saving category changes')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle category creation
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: newCatName.trim().toLowerCase(),
          description: newCatDesc.trim() || null,
          department_name: newCatDept || null,
          priority_weight: newCatPriority,
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        alert('Failed to create category: ' + error.message)
      } else if (data) {
        setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        setIsCatModalOpen(false)
        setNewCatName('')
        setNewCatDesc('')
        setNewCatDept('')
        setNewCatPriority(2)
        setSelectedCategory(data)
      }
    } catch (e) {
      alert('Error creating category')
    }
  }

  // Handle department creation
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDeptName.trim()) return

    try {
      const { data, error } = await supabase
        .from('departments')
        .insert({
          name: newDeptName.trim(),
          officer_count: newDeptOfficers,
          escalation_target: newDeptEscalation.trim() || null,
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        alert('Failed to create department: ' + error.message)
      } else if (data) {
        setDepartments(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        setIsDeptModalOpen(false)
        setNewDeptName('')
        setNewDeptEscalation('')
        setNewDeptOfficers(0)
        alert('Department created successfully!')
      }
    } catch (e) {
      alert('Error creating department')
    }
  }

  // Filter categories
  const filteredCategories = categories.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (c.department_name && c.department_name.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ height: '40px', width: '250px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '24px' }}></div>
          <div style={{ height: '400px', background: '#e2e8f0', borderRadius: '12px' }}></div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '38px', color: '#0f172a', lineHeight: 1.2 }}>
              Categories &amp; Routing
            </h1>
            <p style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', color: '#475569', marginTop: '6px', lineHeight: 1.6, fontWeight: 400 }}>
              Map complaint categories to responsible departments and configure escalation rules.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setIsDeptModalOpen(true)}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 120ms'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
            >
              <Plus size={16} />
              Add Department
            </button>
            <button
              onClick={() => setIsCatModalOpen(true)}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'var(--color-primary)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 120ms',
                boxShadow: '0 2px 4px rgba(2, 74, 216, 0.2)'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Plus size={16} />
              Create Category
            </button>
          </div>
        </div>

        {/* Dashboard Split Panel Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Panel: Category List */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            overflow: 'hidden'
          }}>
            {/* Search and Filter strip */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}><Search size={16} /></span>
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px 0 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: FONT_SANS
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {(['all', 'active', 'inactive'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      border: statusFilter === tab ? 'none' : '1px solid #cbd5e1',
                      background: statusFilter === tab ? '#0f172a' : 'transparent',
                      color: statusFilter === tab ? '#ffffff' : '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Category table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '14px 20px' }}>Category Code</th>
                    <th style={{ padding: '14px 20px' }}>Primary Route</th>
                    <th style={{ padding: '14px 20px' }}>Weight</th>
                    <th style={{ padding: '14px 20px' }}>Status</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center' }}>Toggle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        No categories found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map(cat => {
                      const isSelected = selectedCategory?.id === cat.id
                      const pm = PRIORITY_LABELS[cat.priority_weight] ?? PRIORITY_LABELS[2]
                      return (
                        <tr
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat)}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            background: isSelected ? '#f1f5f9' : 'transparent',
                            transition: 'background-color 100ms'
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc' }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: 700, color: '#024ad8', textTransform: 'capitalize' }}>
                              {cat.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {cat.description || 'No description provided'}
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px', fontWeight: 500, color: '#1e293b' }}>
                            🏢 {cat.department_name || 'Unassigned'}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              color: pm.color,
                              background: pm.bg
                            }}>
                              {pm.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: cat.status === 'active' ? '#166534' : '#b3262b',
                              background: cat.status === 'active' ? '#dcfce7' : '#fee2e2',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              textTransform: 'uppercase'
                            }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cat.status === 'active' ? '#166534' : '#b3262b' }} />
                              {cat.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleCatStatus(cat)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#475569',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 120ms'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = '#0f172a'
                                e.currentTarget.style.color = '#0f172a'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = '#cbd5e1'
                                e.currentTarget.style.color = '#475569'
                              }}
                            >
                              {cat.status === 'active' ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Panel: Routing Details Editor */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            position: 'sticky',
            top: '24px'
          }}>
            {!selectedCategory ? (
              <div style={{ textAlign: 'center', padding: '64px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔀</div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#0f172a', marginBottom: '8px' }}>
                  No Category Selected
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Click a category from the list to view and configure its routing rules and escalation parameters.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Routing Rules</span>
                    <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '22px', color: '#0f172a', textTransform: 'capitalize', marginTop: '4px' }}>
                      {selectedCategory.name}
                    </h3>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: selectedCategory.status === 'active' ? '#166534' : '#b3262b',
                    background: selectedCategory.status === 'active' ? '#dcfce7' : '#fee2e2',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    textTransform: 'uppercase'
                  }}>
                    {selectedCategory.status}
                  </span>
                </div>

                {/* Form parameters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Category Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: FONT_SANS
                      }}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Description
                    </label>
                    <textarea
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      placeholder="Enter description of what this category handles..."
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: FONT_SANS
                      }}
                    />
                  </div>

                  {/* Primary Department */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Primary Department Route
                    </label>
                    <select
                      value={editDeptName}
                      onChange={e => setEditDeptName(e.target.value)}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        fontWeight: 600,
                        background: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Unassigned</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Secondary Department */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Secondary / Alternate Route (Optional)
                    </label>
                    <select
                      value={editSecDeptName}
                      onChange={e => setEditSecDeptName(e.target.value)}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        background: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">None</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Escalation Target */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Escalation officer / Target
                    </label>
                    <input
                      type="text"
                      value={editEscalation}
                      onChange={e => setEditEscalation(e.target.value)}
                      placeholder="e.g. Chief Superintendent Engineer"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: FONT_SANS
                      }}
                    />
                  </div>

                  {/* Priority weight */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Default Priority SLA Weight
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {[1, 2, 3, 4].map(val => {
                        const pm = PRIORITY_LABELS[val]
                        const isChosen = editPriority === val
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setEditPriority(val)}
                            style={{
                              padding: '8px 4px',
                              borderRadius: '6px',
                              border: isChosen ? `2px solid ${pm.color}` : '1px solid #cbd5e1',
                              background: isChosen ? pm.bg : '#ffffff',
                              color: pm.color,
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                              transition: 'all 120ms'
                            }}
                          >
                            {pm.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <button
                    disabled={isSaving}
                    onClick={handleSaveChanges}
                    style={{
                      flex: 1,
                      height: '40px',
                      borderRadius: '8px',
                      background: 'var(--color-primary)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 150ms'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    {isSaving ? 'Saving...' : 'Save Routing Policy'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal: Create Category */}
        {isCatModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>
                  Create New Category
                </h3>
                <button onClick={() => setIsCatModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
              </div>

              <form onSubmit={handleCreateCategory} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Category Code (lowercase, unique)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sanitation, water, road"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: FONT_SANS
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    placeholder="Describe category purpose..."
                    value={newCatDesc}
                    onChange={e => setNewCatDesc(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: FONT_SANS
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Primary Department Route
                  </label>
                  <select
                    value={newCatDept}
                    onChange={e => setNewCatDept(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      background: '#ffffff',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="">Unassigned</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Default SLA Severity
                  </label>
                  <select
                    value={newCatPriority}
                    onChange={e => setNewCatPriority(Number(e.target.value))}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      background: '#ffffff',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="1">Low</option>
                    <option value="2">Medium</option>
                    <option value="3">High</option>
                    <option value="4">Urgent</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setIsCatModalOpen(false)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'var(--color-primary)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Department */}
        {isDeptModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>
                  Add New Department
                </h3>
                <button onClick={() => setIsDeptModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
              </div>

              <form onSubmit={handleCreateDepartment} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Department Name (unique)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Public Health Division"
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: FONT_SANS
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Supervisor Escalation Target
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Director of Operations"
                    value={newDeptEscalation}
                    onChange={e => setNewDeptEscalation(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: FONT_SANS
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Assigned Officer Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newDeptOfficers}
                    onChange={e => setNewDeptOfficers(Number(e.target.value))}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: FONT_SANS
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setIsDeptModalOpen(false)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'var(--color-primary)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
      <style>{`
        @keyframes modalSlideIn {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </main>
  )
}
