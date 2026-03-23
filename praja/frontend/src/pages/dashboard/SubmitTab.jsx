import React, { useState, useRef } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useMutation } from '../../hooks/useFetch';


export default function SubmitTab({ onToast }) {
  const [title, setTitle] = useState('');
  const [description, setDesc] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitted, setSubmitted] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        await handleAudioUpload(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      onToast('Listening... Speak your complaint.', 'success');
    } catch (err) {
      onToast('Microphone access denied or unavailable.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAudioUpload = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      
      const token = localStorage.getItem('praja_token');
            const res = await fetch((import.meta.env.VITE_API_URL || 'https://praja-backend.vercel.app') + '/api/mic/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': Bearer  
        },
        body: formData,
      });
      
      if (!res.ok) throw new Error('Transcription failed');
      
      const data = await res.json();
      if (data.english_text) {
        setDesc(data.original_text + '\n\n[English]: ' + data.english_text);
        if (!title) setTitle('Voice Complaint');
        onToast('Audio transcribed successfully!', 'success');
      } else {
        onToast('Could not understand the audio.', 'error');
      }
    } catch (err) {
      onToast('Transcription Error', 'error');
    } finally {
      setIsTranscribing(false);
    }
  };

  const { mutate: submitGrievance, loading, error } = useMutation('post');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(null);
    try {
      const body = { title, description };
      if (photoUrl.trim()) body.photo_url = photoUrl.trim();
      const data = await submitGrievance('/grievances/submit', body);
      setSubmitted(data);
      setTitle(''); setDesc(''); setPhotoUrl('');
      onToast(`âœ… Submitted â€” ID: ${data.tracking_id}`, 'success');
    } catch (err) {
      onToast(`âŒ ${err.message}`, 'error');
    }
  };

  const PRIORITY_COLORS = {
    critical: 'var(--color-danger-text)',
    high:     'var(--color-primary-light)',
    medium:   'var(--color-warning-text)',
    low:      'var(--color-success-text)',
  };

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <p className="ud-title">File a Complaint</p>
        <p className="ud-subtitle">
          AI auto-classifies department and priority. Supports Tamil, Hindi, Telugu, English.
        </p>
      </div>

      {/* Success state */}
      {submitted && (
        <div style={{
          background: 'var(--color-success-bg)',
          border: '1px solid var(--color-success-border)',
          borderLeft: '4px solid var(--color-success)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ fontWeight: 700, color: 'var(--color-success-text)', fontSize: '0.95rem' }}>
            âœ… Complaint submitted successfully
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Tracking ID:</span>
            <span className="ud-tracking-id">{submitted.tracking_id}</span>
            {submitted.ai_category && (
              <span style={{ color: 'var(--text-secondary)' }}>ðŸ“‚ {submitted.ai_category}</span>
            )}
            {submitted.priority && (
              <span style={{
                color: PRIORITY_COLORS[submitted.priority] || 'var(--text-primary)',
                fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {submitted.priority}
              </span>
            )}
          </div>
        </div>
      )}

      {error && <div className="ud-alert-error">{error}</div>}

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit}>
          <Input
            label="Title"
            id="complaint-title"
            placeholder="e.g. No water supply in our area"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
          
          <div style={{ position: 'relative' }}>
            <Input
              label="Description"
              id="complaint-desc"
              isTextarea
              placeholder="Describe your issue in any language - Hindi, Tamil, Telugu, English all supported"
              value={description}
              onChange={e => setDesc(e.target.value)}
              required
            />
            <button 
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              style={{
                position: 'absolute',
                right: '10px',
                top: '35px',
                background: isRecording ? 'var(--color-danger-bg)' : 'var(--color-primary-light)',
                color: isRecording ? 'var(--color-danger-text)' : 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}
              title={isRecording ? "Stop Recording" : "Speak your complaint (Bhashini ASR)"}
            >
              {isTranscribing ? 'âŒ›' : (isRecording ? 'â¹ï¸' : 'ðŸŽ¤')}
            </button>
          </div>

          <Input
            label="ðŸ“· Photo Evidence (optional)"
            id="complaint-photo"
            placeholder="Paste an image URL (e.g. https://imgur.com/...)"
            value={photoUrl}
            onChange={e => setPhotoUrl(e.target.value)}
          />
          {photoUrl && (
            <img
              src={photoUrl}
              alt="Evidence preview"
              className="ud-photo-preview"
              onError={e => { e.target.style.display = 'none'; }}
            />
          )}
          <div style={{ marginTop: 20 }}>
            <Button type="submit" isLoading={loading} size="lg" fullWidth>
              ðŸ“¤ Submit Complaint
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

