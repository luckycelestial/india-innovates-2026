'use client'

type DepartmentStats = {
  name: string
  total: number
  open: number
  resolved: number
  overdue: number
  rate: number // Response / Resolution rate in percentage
}

type DepartmentPerformanceTableProps = {
  stats: DepartmentStats[]
}

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = "var(--font-display)"

export default function DepartmentPerformanceTable({ stats }: DepartmentPerformanceTableProps) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '24px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      marginBottom: '28px',
      fontFamily: FONT_SANS
    }}>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '16px', color: '#0f172a', marginBottom: '20px' }}>
        Department Performance Analysis
      </h3>
      
      {stats.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          No department performance logs found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px' }}>Department</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Cases</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Open</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Resolved</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Overdue SLA</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Resolution Rate</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(dept => {
                let rateColor = '#16a34a' // high
                let rateBg = '#f0fdf4'
                if (dept.rate < 50) {
                  rateColor = '#ef4444' // low
                  rateBg = '#fef2f2'
                } else if (dept.rate < 80) {
                  rateColor = '#d97706' // medium
                  rateBg = '#fffbeb'
                }

                return (
                  <tr
                    key={dept.name}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 100ms' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <td style={{ padding: '16px', fontWeight: 600, color: '#0f172a' }}>{dept.name}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>{dept.total}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#3b82f6', fontWeight: 600 }}>{dept.open}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{dept.resolved}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{dept.overdue}</td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        color: rateColor,
                        background: rateBg,
                        fontSize: '13px'
                      }}>
                        {dept.rate.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
