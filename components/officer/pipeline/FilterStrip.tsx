import { Search, AlertCircle } from 'lucide-react'

type FilterStripProps = {
  search: string
  setSearch: (s: string) => void
  statusFilter: string
  setStatusFilter: (s: string) => void
  priorityFilter: string
  setPriorityFilter: (p: string) => void
  categoryFilter: string
  setCategoryFilter: (c: string) => void
  locationFilter: string
  setLocationFilter: (l: string) => void
  sortBy: string
  setSortBy: (s: string) => void
  overdueFilter: boolean
  setOverdueFilter: (o: boolean) => void
  uniqueCategories: string[]
  uniqueWards: string[]
  STATUS_META: Record<string, { label: string }>
  PRIORITY_META: Record<string, { label: string }>
  CAT_LABEL: Record<string, string>
}

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function FilterStrip({
  search, setSearch,
  statusFilter, setStatusFilter,
  priorityFilter, setPriorityFilter,
  categoryFilter, setCategoryFilter,
  locationFilter, setLocationFilter,
  sortBy, setSortBy,
  overdueFilter, setOverdueFilter,
  uniqueCategories, uniqueWards,
  STATUS_META, PRIORITY_META, CAT_LABEL
}: FilterStripProps) {
  const isAnyFilterActive = statusFilter !== 'all' || 
                            priorityFilter !== 'all' || 
                            categoryFilter !== 'all' || 
                            locationFilter !== 'all' || 
                            overdueFilter

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '16px 20px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      {/* Search Box */}
      <div style={{ position: 'relative', flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: FONT_SANS }}>Search</span>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: '#64748b' }}>
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            style={{
              width: '100%',
              height: '36px',
              padding: '0 12px 0 34px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '14px',
              fontFamily: FONT_SANS,
              color: '#1e293b',
              outline: 'none',
              transition: 'all 150ms'
            }}
          />
        </div>
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: FONT_SANS }}>Status</span>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            height: '36px',
            padding: '0 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
            fontFamily: FONT_SANS,
            fontWeight: 600,
            color: '#1e293b',
            background: '#ffffff',
            minWidth: '130px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Statuses</option>
          {Object.keys(STATUS_META).map(s => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
      </div>

      {/* Priority Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: FONT_SANS }}>Priority</span>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          style={{
            height: '36px',
            padding: '0 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
            fontFamily: FONT_SANS,
            fontWeight: 600,
            color: '#1e293b',
            background: '#ffffff',
            minWidth: '120px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Priorities</option>
          {Object.keys(PRIORITY_META).map(p => (
            <option key={p} value={p}>{PRIORITY_META[p].label}</option>
          ))}
        </select>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: FONT_SANS }}>Category</span>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{
            height: '36px',
            padding: '0 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
            fontFamily: FONT_SANS,
            fontWeight: 600,
            color: '#1e293b',
            background: '#ffffff',
            minWidth: '150px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map(c => (
            <option key={c} value={c}>{CAT_LABEL[c] ?? c}</option>
          ))}
        </select>
      </div>

      {/* Location Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: FONT_SANS }}>Ward / Location</span>
        <select
          value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}
          style={{
            height: '36px',
            padding: '0 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
            fontFamily: FONT_SANS,
            fontWeight: 600,
            color: '#1e293b',
            background: '#ffffff',
            minWidth: '150px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Locations</option>
          {uniqueWards.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      {/* Sort controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: FONT_SANS }}>Sort By</span>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            height: '36px',
            padding: '0 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#1e293b',
            fontSize: '14px',
            fontFamily: FONT_SANS,
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="urgent">Highest Priority</option>
          <option value="overdue">SLA Overdue</option>
        </select>
      </div>

      {/* Overdue Checkbox */}
      <label style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        cursor: 'pointer', 
        fontSize: '14px', 
        fontWeight: 600, 
        color: '#1e293b', 
        fontFamily: FONT_SANS,
        height: '36px'
      }}>
        <input
          type="checkbox"
          checked={overdueFilter}
          onChange={e => setOverdueFilter(e.target.checked)}
          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
        />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={16} style={{ color: '#dc2626' }} /> Overdue SLA Only
        </span>
      </label>

      {/* Clear filters button */}
      {isAnyFilterActive && (
        <button
          onClick={() => {
            setStatusFilter('all')
            setPriorityFilter('all')
            setCategoryFilter('all')
            setLocationFilter('all')
            setOverdueFilter(false)
          }}
          style={{
            height: '36px',
            padding: '0 16px',
            borderRadius: '8px',
            border: '1px dashed #ef4444',
            color: '#ef4444',
            background: 'transparent',
            fontSize: '14px',
            fontFamily: FONT_SANS,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 150ms',
            marginLeft: 'auto'
          }}
        >
          ✕ Clear Filters
        </button>
      )}
    </div>
  )
}
