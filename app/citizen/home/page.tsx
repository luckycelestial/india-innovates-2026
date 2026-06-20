'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { MapPin, Image as ImageIcon, CheckCircle, Clock, AlertTriangle, Send } from 'lucide-react'

type Complaint = {
  id: string
  category: string
  location: string
  status: 'Pending' | 'In Progress' | 'Resolved'
  date: string
  desc: string
}

const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: '#COMP-8291',
    category: 'Waste Overflow',
    location: 'Ward 14, Malleshwaram',
    status: 'Pending',
    date: '2026-06-15',
    desc: 'Uncollected garbage piling up near the primary school entrance.'
  },
  {
    id: '#COMP-7104',
    category: 'Water Disruption',
    location: 'Ward 22, Indiranagar',
    status: 'In Progress',
    date: '2026-06-14',
    desc: 'No water supply in block 4 for the last 36 hours.'
  },
  {
    id: '#COMP-6512',
    category: 'Broken Streetlight',
    location: 'Ward 9, Jayanagar',
    status: 'Resolved',
    date: '2026-06-12',
    desc: 'Streetlights not working on 5th main road.'
  }
]

export default function CitizenHome() {
  const [complaints, setComplaints] = useState<Complaint[]>(INITIAL_COMPLAINTS)
  const [category, setCategory] = useState('Road Damage')
  const [desc, setDesc] = useState('')
  const [location, setLocation] = useState('Ward 14, Malleshwaram')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      const newComp: Complaint = {
        id: `#COMP-${Math.floor(1000 + Math.random() * 9000)}`,
        category,
        location,
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
        desc
      }
      setComplaints([newComp, ...complaints])
      setSubmitting(false)
      setSuccess(true)
      setDesc('')
      setTimeout(() => setSuccess(false), 3000)
    }, 1000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f6f6f3',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#000000'
    }}>
      {/* Main Grid */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 24px',
        display: 'grid',
        gridTemplateColumns: '1.1fr 0.9fr',
        gap: '32px'
      }} className="citizen-grid">
        {/* Left Side: Submit Complaint */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #dadad3',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid #f6f6f3', paddingBottom: '12px' }}>
            File a Civic Complaint
          </h2>

          {success && (
            <div style={{
              background: 'rgba(230, 0, 35, 0.08)',
              border: '1px solid #e60023',
              color: '#e60023',
              padding: '12px',
              borderRadius: '16px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px'
            }}>
              ✓ Complaint submitted successfully and added to tracking queue.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Complaint Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #dadad3',
                  fontSize: '13px',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <option value="Road Damage">Road Damage / Potholes</option>
                <option value="Waste Overflow">Waste Overflow / Garbage dumping</option>
                <option value="Water Disruption">Water Disruption / Leakage</option>
                <option value="Broken Streetlight">Broken Streetlight</option>
                <option value="Drainage Overflow">Drainage Overflow</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Select Ward / Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #dadad3',
                  fontSize: '13px',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <option value="Ward 14, Malleshwaram">Ward 14, Malleshwaram</option>
                <option value="Ward 22, Indiranagar">Ward 22, Indiranagar</option>
                <option value="Ward 9, Jayanagar">Ward 9, Jayanagar</option>
                <option value="Ward 4, Rajajinagar">Ward 4, Rajajinagar</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Issue Description</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Provide details of the issue (e.g. Landmark, duration, severity)..."
                required
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #dadad3',
                  fontSize: '13px',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Mock Media / Map Attachments */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => alert('Location locked from GPS coordinates.')}
                style={{
                  flex: 1,
                  height: '38px',
                  background: '#f6f6f3',
                  border: '1px solid #dadad3',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <MapPin size={16} /> Attach Location
              </button>
              <button
                type="button"
                onClick={() => alert('Photo upload simulated.')}
                style={{
                  flex: 1,
                  height: '38px',
                  background: '#f6f6f3',
                  border: '1px solid #dadad3',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <ImageIcon size={16} /> Upload Photo
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                height: '42px',
                background: '#e60023',
                color: '#ffffff',
                border: 'none',
                borderRadius: '16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'opacity 150ms',
                opacity: submitting ? 0.7 : 1,
                marginTop: '8px'
              }}
            >
              <Send size={16} /> {submitting ? 'Submitting...' : 'File Complaint'}
            </button>
          </form>
        </div>

        {/* Right Side: Tracking List */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #dadad3',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, borderBottom: '1px solid #f6f6f3', paddingBottom: '12px' }}>
            Track Your Complaints
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '450px' }}>
            {complaints.map((comp) => {
              const statusColor =
                comp.status === 'Resolved' ? '#7B8F65' : comp.status === 'In Progress' ? '#6D9998' : '#e60023'
              const statusBg =
                comp.status === 'Resolved' ? 'rgba(123, 143, 101, 0.1)' : comp.status === 'In Progress' ? 'rgba(109, 153, 152, 0.1)' : 'rgba(230, 0, 35, 0.06)'
              
              return (
                <div
                  key={comp.id}
                  style={{
                    border: '1px solid #dadad3',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#262622' }}>{comp.id}</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '16px',
                      background: statusBg,
                      color: statusColor,
                      border: `1px solid ${statusColor}30`
                    }}>{comp.status}</span>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0' }}>{comp.category}</h4>
                    <p style={{ fontSize: '12px', color: '#000000', margin: '0 0 8px 0', lineHeight: 1.4 }}>{comp.desc}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#262622', borderTop: '1px solid #f6f6f3', paddingTop: '8px' }}>
                      <span>📍 {comp.location}</span>
                      <span>📅 {comp.date}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .citizen-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  )
}
