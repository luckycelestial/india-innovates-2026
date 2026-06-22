import React from 'react'

type CrimeKpiCardProps = {
  title: string
  value: any
  subtitle: string
  icon: any
  color: string
}

export default function CrimeKpiCard({ title, value, subtitle, icon, color }: CrimeKpiCardProps) {
  return (
    <div className="bg-white border border-[#dadad3] rounded-2xl p-5 flex items-center gap-4 shadow-sm">
      <div className="p-3 rounded-2xl" style={{ background: `${color}15`, color: color }}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-[#262622] uppercase tracking-[0.5px]">{title}</div>
        <div className="text-2xl font-bold text-black my-0.5">{value}</div>
        <div className="text-[11px] text-slate-400">{subtitle}</div>
      </div>
    </div>
  )
}
