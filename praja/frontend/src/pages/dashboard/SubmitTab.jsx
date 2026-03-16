import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useMutation } from '../../hooks/useFetch';
import { Card } from '../../components/ui/Card';

export default function SubmitTab({ onToast }) {
  const [title, setTitle] = useState('');
  const [description, setDesc] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitted, setSubmitted] = useState(null);

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
      onToast(`✅ Submitted — ID: ${data.tracking_id}`, 'success');
    } catch (err) {
      onToast(`❌ ${err.message}`, 'error');
    }
  };

  return (
    <div style={{ maxWidth: 620 }}>
      <p className="ud-title">File a Complaint</p>
      <p className="ud-subtitle">AI auto-classifies department and priority. Supports Tamil, Hindi, Telugu, English.</p>

      {submitted && (
        <Card className="ud-alert-success" style={{ marginBottom: 'var(--spacing-4)' }}>
          <strong>✅ Complaint submitted</strong>
          <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
            ID: <span className="ud-tracking-id">{submitted.tracking_id}</span>
            {submitted.ai_category && (
              <span style={{ marginLeft: 10, color: 'var(--text-secondary)' }}>
                📂 {submitted.ai_category}
                {submitted.priority && (
                  <span className={`ud-pri-${submitted.priority}`} style={{ marginLeft: 6 }}>
                    {submitted.priority.toUpperCase()}
                  </span>
                )}
              </span>
            )}
          </div>
        </Card>
      )}

      {error && <div className="ud-alert-error">{error}</div>}

      <Card>
        <form onSubmit={handleSubmit}>
          <Input
            label="Title"
            placeholder="e.g. No water supply in our area"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
          <Input
            label="Description"
            isTextarea
            placeholder="Describe your issue in any language"
            value={description}
            onChange={e => setDesc(e.target.value)}
            required
          />
          <Input
            label="📷 Photo Evidence (optional)"
            placeholder="Paste image URL (e.g. https://imgur.com/...)"
            value={photoUrl}
            onChange={e => setPhotoUrl(e.target.value)}
          />
          {photoUrl && (
            <img src={photoUrl} alt="Preview" className="ud-photo-preview" onError={e => {e.target.style.display='none'}} />
          )}
          <Button type="submit" isLoading={loading} className="mt-4">
            📤 Submit Complaint
          </Button>
        </form>
      </Card>
    </div>
  );
}
