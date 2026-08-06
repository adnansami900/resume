// ExportResume.jsx - Download your resume as PDF or Word document

import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, Alert, GradientBanner } from '../components/UI';
import api from '../services/api';

export default function ExportResume() {
  const [resumes, setResumes]     = useState([]);
  const [resumeId, setResumeId]   = useState('');
  const [error, setError]         = useState('');
  const [downloading, setDL]      = useState('');

  useEffect(() => {
    api.get('/resumes').then(res => {
      setResumes(res.data.resumes);
      if (res.data.resumes.length > 0) setResumeId(res.data.resumes[0].id);
    });
  }, []);

  // Trigger a file download from the backend
  const download = async (format) => {
    if (!resumeId) { setError('Please select a resume first.'); return; }
    setError(''); setDL(format);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/export/${resumeId}/${format}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `resume.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Download failed. Please try again.');
    } finally {
      setDL('');
    }
  };

  return (
    <Layout title="📤 Export Resume" subtitle="Download your resume as a PDF or Word document.">

      <GradientBanner
        icon="📥"
        title="Download Your Resume"
        subtitle="Choose PDF for most job applications. Use DOCX if you need to edit the file in Word."
      />

      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Card title="📄 Select Resume to Export">
          <div className="form-group">
            <label className="form-label">Which resume?</label>
            <select className="form-select" value={resumeId} onChange={e => setResumeId(e.target.value)}>
              {resumes.length === 0 && <option value="">No resumes yet — build one first</option>}
              {resumes.map(r => (
                <option key={r.id} value={r.id}>{r.title} (v{r.version})</option>
              ))}
            </select>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          {/* Download options */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 8 }}>
            {/* PDF */}
            <div style={{
              border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20,
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📕</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>PDF Format</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                Best for job applications. Most ATS systems accept PDF.
              </div>
              <button
                className="btn btn-primary btn-block"
                onClick={() => download('pdf')}
                disabled={!!downloading || !resumeId}
              >
                {downloading === 'pdf' ? '⏳ Downloading...' : '⬇️ Download PDF'}
              </button>
            </div>

            {/* DOCX */}
            <div style={{
              border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20,
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📘</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Word Format</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                Editable in Microsoft Word or Google Docs.
              </div>
              <button
                className="btn btn-secondary btn-block"
                onClick={() => download('docx')}
                disabled={!!downloading || !resumeId}
              >
                {downloading === 'docx' ? '⏳ Downloading...' : '⬇️ Download DOCX'}
              </button>
            </div>
          </div>

          <Alert type="info" style={{ marginTop: 20 }}>
            💡 Tip: Most employers and ATS systems prefer PDF. Use DOCX only if specifically requested.
          </Alert>
        </Card>
      </div>
    </Layout>
  );
}
