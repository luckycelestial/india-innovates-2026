'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, CheckCircle2, XCircle, AlertOctagon, AlertTriangle, AlertCircle, PartyPopper, ChevronRight, X } from 'lucide-react'

type Note = {
  id: string
  text: string
  type: 'internal' | 'public'
  author: string
  created_at: string
}

type StatusUpdateModalProps = {
  isOpen: boolean
  onClose: () => void
  complaintId: string
  complaintNumber: string
  currentStatus: string
  existingNotes: Note[]
  onSuccess: (updatedStatus: string, updatedNotes: string) => void
  initialTargetStatus?: string
}

const STATUS_OPTS = [
  { value: 'in_progress', label: 'In Progress', icon: Settings, color: '#024ad8', bg: '#e8f0fe', desc: 'Accept and start working on this grievance' },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle2, color: '#166534', bg: '#dcfce7', desc: 'Mark issue as fixed or completed' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: '#b3262b', bg: '#fee2e2', desc: 'Mark grievance as invalid or not applicable' },
  { value: 'escalated', label: 'Escalated', icon: AlertOctagon, color: '#b45309', bg: '#fef3c7', desc: 'Move issue upward to supervisor or other department' },
]

export default function StatusUpdateModal({
  isOpen,
  onClose,
  complaintId,
  complaintNumber,
  currentStatus,
  existingNotes,
  onSuccess,
  initialTargetStatus,
}: StatusUpdateModalProps) {
  const supabase = createClient()
  
  const [targetStatus, setTargetStatus] = useState('in_progress')
  
  // Form values
  const [reason, setReason] = useState('')
  const [publicMessage, setPublicMessage] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [evidenceLink, setEvidenceLink] = useState('')
  const [escalationTarget, setEscalationTarget] = useState('')
  
  // UI states
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successState, setSuccessState] = useState(false)

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setTargetStatus(initialTargetStatus || (currentStatus === 'resolved' || currentStatus === 'closed' ? 'in_progress' : currentStatus))
      setReason('')
      setPublicMessage('')
      setExpectedDate('')
      setEvidenceLink('')
      setEscalationTarget('')
      setShowConfirm(false)
      setSubmitting(false)
      setErrorMsg('')
      setSuccessState(false)
    }
  }, [isOpen, currentStatus])

  if (!isOpen) return null

  // Validate form before showing confirmation
  const handleValidateAndNext = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!reason.trim()) {
      if (targetStatus === 'in_progress') setErrorMsg('Progress note is required.')
      else if (targetStatus === 'resolved') setErrorMsg('Resolution note is required.')
      else if (targetStatus === 'rejected') setErrorMsg('Rejection reason is required.')
      else if (targetStatus === 'escalated') setErrorMsg('Escalation reason is required.')
      return
    }

    if (targetStatus === 'escalated' && !escalationTarget.trim()) {
      setErrorMsg('Target department or supervisor is required for escalation.')
      return
    }

    setShowConfirm(true)
  }

  // Handle final submission
  const handleConfirmSubmit = async () => {
    setSubmitting(true)
    setErrorMsg('')

    try {
      const OFFICER_NAME = 'Priya Nair'
      const timestamp = new Date().toISOString()
      const statusLabel = STATUS_OPTS.find(o => o.value === targetStatus)?.label ?? targetStatus
      const newNotes: Note[] = [...existingNotes]

      // 1. Generate internal log note
      let internalNoteText = `[Status Change] Grievance state updated to: ${statusLabel}.\nRemark: ${reason}`
      if (targetStatus === 'escalated') {
        internalNoteText += `\nTarget Unit: ${escalationTarget}`
      }
      if (targetStatus === 'in_progress' && expectedDate) {
        internalNoteText += `\nExpected Completion: ${expectedDate}`
      }
      if (targetStatus === 'resolved' && evidenceLink) {
        internalNoteText += `\nEvidence Link: ${evidenceLink}`
      }

      newNotes.unshift({
        id: Math.random().toString(36).substring(2, 9),
        text: internalNoteText,
        type: 'internal',
        author: OFFICER_NAME,
        created_at: timestamp,
      })

      // 2. Generate public citizen update note if provided
      const finalPublicMsg = publicMessage.trim() || `Grievance has been marked as ${statusLabel.toLowerCase()}.`
      newNotes.unshift({
        id: Math.random().toString(36).substring(2, 9),
        text: finalPublicMsg,
        type: 'public',
        author: OFFICER_NAME,
        created_at: timestamp,
      })

      const serializedNotes = JSON.stringify(newNotes)

      // 3. Write to Supabase complaints registry
      const updates: Record<string, any> = {
        status: targetStatus,
        notes: serializedNotes,
        updated_at: timestamp,
      }

      if (targetStatus === 'escalated') {
        updates.department = escalationTarget
      }

      const { error } = await supabase
        .from('complaints')
        .update(updates)
        .eq('id', complaintId)

      if (error) {
        throw new Error(error.message)
      }

      setSuccessState(true)
      setTimeout(() => {
        onSuccess(targetStatus, serializedNotes)
        onClose()
      }, 1500)

    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to update complaint status.')
      setSubmitting(false)
      setShowConfirm(false)
    }
  }

  const activeOpt = STATUS_OPTS.find(o => o.value === targetStatus)

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', // Sleek dark slate glass
      backdropFilter: 'blur(4px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        backgroundColor: 'var(--color-canvas)',
        borderRadius: 'var(--rounded-xl)',
        border: '1px solid var(--color-hairline)',
        width: '100%',
        maxWidth: '560px',
        boxShadow: 'var(--shadow-floating)',
        overflow: 'hidden',
        animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--color-hairline)',
          background: 'var(--color-cloud)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--color-ink)' }}>
              Resolve & Update Grievance
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-graphite)', fontWeight: 600 }}>
              Complaint ID: <code style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{complaintNumber}</code>
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-steel)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          
          {successState ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: '#166534', marginBottom: '16px', animation: 'scaleUp 0.3s ease' }}>
                <PartyPopper size={48} />
              </div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#166534', marginBottom: '8px' }}>
                Status Updated!
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--color-charcoal)' }}>
                Resolution changes applied and timeline update pushed successfully.
              </p>
            </div>
          ) : showConfirm ? (
            /* Confirmation Overlay Substate */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '8px',
                padding: '16px',
                color: '#92400E',
                fontSize: '14px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Confirm Decision</strong>
                  Are you sure you want to change status to <strong style={{ color: activeOpt?.color }}>{activeOpt?.label}</strong>? 
                  This will notify the citizen and update their tracking portal immediately.
                </div>
              </div>

              <div style={{ border: '1px solid var(--color-hairline)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-graphite)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Update Note summary
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-charcoal)', lineHeight: 1.5, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                  "{reason}"
                </p>
                {targetStatus === 'escalated' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ChevronRight size={14} /> Escalating to unit: {escalationTarget}
                    </span>
                )}
              </div>

              {errorMsg && (
                <div style={{ color: '#b3262b', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', padding: '10px 14px', fontSize: '12px', fontWeight: 600 }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--rounded-md)',
                    border: '1px solid var(--color-steel)',
                    background: 'var(--color-canvas)',
                    color: 'var(--color-charcoal)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--rounded-md)',
                    border: 'none',
                    background: activeOpt?.color ?? 'var(--color-primary)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Updating...' : 'Yes, Confirm Update'}
                </button>
              </div>
            </div>
          ) : (
            /* Main Form */
            <form onSubmit={handleValidateAndNext} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Status selection grid */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Select New Outcome
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {STATUS_OPTS.map(opt => {
                    const isSelected = targetStatus === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setTargetStatus(opt.value)
                          setErrorMsg('')
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: isSelected ? `2px solid ${opt.color}` : '1.5px solid var(--color-steel)',
                          background: isSelected ? opt.bg : 'var(--color-canvas)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 150ms'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: isSelected ? opt.color : 'var(--color-ink)' }}>
                          <opt.icon size={16} style={{ flexShrink: 0 }} /> {opt.label}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-graphite)', marginTop: '4px', lineHeight: 1.3 }}>
                          {opt.desc}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {errorMsg && (
                <div style={{ color: '#b3262b', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', padding: '10px 14px', fontSize: '12px', fontWeight: 600 }}>
                  {errorMsg}
                </div>
              )}

              {/* Conditional Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--color-hairline)', paddingTop: '16px' }}>
                
                {/* Note Field (Label adapts based on selected status) */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    {targetStatus === 'in_progress' && 'Progress Details (Required)'}
                    {targetStatus === 'resolved' && 'Resolution Summary (Required)'}
                    {targetStatus === 'rejected' && 'Reason for Rejection (Required)'}
                    {targetStatus === 'escalated' && 'Escalation Justification (Required)'}
                  </label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder={
                      targetStatus === 'in_progress' ? 'Detail target work actions to begin remediation...' :
                      targetStatus === 'resolved' ? 'Explain technical solution, work completed, or closure terms...' :
                      targetStatus === 'rejected' ? 'State why this grievance does not fall within civic limits or is invalid...' :
                      'Detail why municipal staff cannot resolve this at current level...'
                    }
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-steel)',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Status-specific optional/required fields */}
                {targetStatus === 'in_progress' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Expected Resolution Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={expectedDate}
                      onChange={e => setExpectedDate(e.target.value)}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-steel)',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                {targetStatus === 'resolved' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Public Message to Citizen (Optional)
                      </label>
                      <textarea
                        value={publicMessage}
                        onChange={e => setPublicMessage(e.target.value)}
                        placeholder="Say something directly to the citizen about the fix..."
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--color-steel)',
                          fontSize: '13px',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Proof of Resolution / Evidence link (Optional)
                      </label>
                      <input
                        type="text"
                        value={evidenceLink}
                        onChange={e => setEvidenceLink(e.target.value)}
                        placeholder="e.g. cloud photo url, dispatch work order ID"
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--color-steel)',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </>
                )}

                {targetStatus === 'rejected' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Citizen explanation message (Optional)
                    </label>
                    <textarea
                      value={publicMessage}
                      onChange={e => setPublicMessage(e.target.value)}
                      placeholder="Explain the rejection decision directly to the citizen..."
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-steel)',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                )}

                {targetStatus === 'escalated' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Target Division / Department / Officer Name (Required)
                    </label>
                    <input
                      type="text"
                      value={escalationTarget}
                      onChange={e => setEscalationTarget(e.target.value)}
                      placeholder="e.g., PWD Chief Engineer, Ward Superintendent"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-steel)',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-hairline)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--rounded-md)',
                    border: '1px solid var(--color-steel)',
                    background: 'var(--color-canvas)',
                    color: 'var(--color-charcoal)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--rounded-md)',
                    border: 'none',
                    background: activeOpt?.color ?? 'var(--color-primary)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Continue
                </button>
              </div>

            </form>
          )}

        </div>

      </div>

      <style>{`
        @keyframes modalSlideIn {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes scaleUp {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
