import React, { useState, useRef } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useMutation } from '../../hooks/useFetch';


export default function SubmitTab({ onToast }) {
  const [title, setTitle] = useState('');
  const [description, setDesc] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [photoFileName, setPhotoFileName] = useState('');
  const [submitted, setSubmitted] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const photoInputRef = useRef(null);

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
      const res = await fetch((import.meta.env.VITE_API_URL || 'https://backend-topaz-one-69.vercel.app') + '/api/mic/transcribe', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const compressImageToDataUrl = (file, maxSize = 1280, quality = 0.78) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Could not process image'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Invalid image file'));
      };
      img.src = url;
    });

  const estimateDataUrlBytes = (dataUrl) => {
    const base64 = String(dataUrl).split(',')[1] || '';
    return Math.floor((base64.length * 3) / 4);
  };

  const handlePhotoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoDataUrl('');
      setPhotoFileName('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      onToast('Please select an image file.', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      onToast('Please choose an image under 8MB.', 'error');
      e.target.value = '';
      return;
    }

    try {
      const dataUrl = await compressImageToDataUrl(file);
      const bytes = estimateDataUrlBytes(dataUrl);
      if (bytes > 900 * 1024) {
        onToast('Image is still too large after compression. Choose a smaller image.', 'error');
        e.target.value = '';
        return;
      }
      setPhotoDataUrl(String(dataUrl));
      setPhotoFileName(file.name);
    } catch (err) {
      onToast('Could not read selected image.', 'error');
    }
  };

  const openPhotoPicker = () => {
    if (photoInputRef.current) photoInputRef.current.click();
  };

  const clearPhoto = () => {
    setPhotoDataUrl('');
    setPhotoFileName('');
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(null);
    try {
      const body = { title, description };
      if (photoDataUrl) body.photo_url = photoDataUrl;
      const data = await submitGrievance('/grievances/submit', body);
      setSubmitted(data);
      setTitle('');
      setDesc('');
      setPhotoDataUrl('');
      setPhotoFileName('');
      if (photoInputRef.current) photoInputRef.current.value = '';
      onToast(`✅ Submitted — ID: ${data.tracking_id}`, 'success');
    } catch (err) {
      onToast(`❌ ${err.message}`, 'error');
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
          Submit your complaint in Tamil, Hindi, Telugu, or English.
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
            ✅ Complaint submitted successfully
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Tracking ID:</span>
            <span className="ud-tracking-id">{submitted.tracking_id}</span>
            {submitted.ai_category && (
              <span style={{ color: 'var(--text-secondary)' }}>📂 {submitted.ai_category}</span>
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
              {isTranscribing ? '⌛' : (isRecording ? '⏹️' : '🎤')}
            </button>
          </div>

          <div className="ud-field-wrapper">
            <label htmlFor="complaint-photo" className="ud-label">📷 Photo Evidence (optional)</label>
            <input
              id="complaint-photo"
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoFileChange}
              className="ud-photo-input-hidden"
            />
            <div className="ud-photo-upload-shell" role="group" aria-label="Photo evidence upload">
              <button type="button" className="ud-photo-upload-btn" onClick={openPhotoPicker}>
                📁 Choose Image
              </button>
              <div className="ud-photo-upload-name" title={photoFileName || 'No image selected'}>
                {photoFileName || 'No image selected'}
              </div>
              {photoFileName && (
                <button type="button" className="ud-photo-clear-btn" onClick={clearPhoto}>
                  Remove
                </button>
              )}
            </div>
            <span className="ud-field-hint">Upload from gallery/files (auto-compressed before submit)</span>
          </div>
          {photoDataUrl && (
            <div className="ud-photo-preview-wrap">
              <div className="ud-photo-preview-label">Preview</div>
              <img
                src={photoDataUrl}
                alt="Evidence preview"
                className="ud-photo-preview"
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
          <div style={{ marginTop: 20 }}>
            <Button type="submit" isLoading={loading} size="lg" fullWidth>
              📤 Submit Complaint
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
