// ExportResume.jsx - Download your resume in a chosen design + format.

import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, Alert, GradientBanner } from '../components/UI';
import TemplatePicker from '../components/TemplatePicker';
import ResumePreview from '../components/ResumePreview';
import api from '../services/api';

// The formats offered, with a short "best for" line.
const FORMATS = [
  { id: 'pdf',  icon: '📕', label: 'PDF',         desc: 'Best all-round. Keeps the design exactly.' },
  { id: 'docx', icon: '📘', label: 'Word (DOCX)', desc: 'Editable in Word or Google Docs.' },
  { id: 'txt',  icon: '📄', label: 'Plain text',  desc: 'Most ATS-safe. Paste into web forms.' },
  { id: 'html', icon: '🌐', label: 'HTML',        desc: 'Self-contained web page you can share.' },
  { id: 'json', icon: '🧩', label: 'JSON',        desc: 'Structured backup / re-import.' },
];

export default function ExportResume() {
  const [resumes, setResumes]   = useState([]);
  const [resumeId, setResumeId] = useState('');
  const [template, setTemplate] = useState('modern');
  const [error, setError]       = useState('');
  const [downloading, setDL]    = useState('');

  useEffect(() => {
    api.get('/resumes').then(res => {
      setResumes(res.data.resumes);
      if (res.data.resumes.length > 0) {
        setResumeId(res.data.resumes[0].id);
        setTemplate(res.data.resumes[0].template || 'modern');
      }
    });
  }, []);

  // When switching which resume to export, adopt its saved template.
  const onResumeChange = (id) => {
    setResumeId(id);
    const r = resumes.find(x => x.id === id);
    if (r) setTemplate(r.template || 'modern');
  };

  const download = async (format) => {
    if (!resumeId) { setError('Please select a resume first.'); return; }
    setError(''); setDL(format);
    try {
      await api.downloadResume(resumeId, format, template);
    } catch (err) {
      setError('Download failed. Please try again.');
    } finally {
      setDL('');
    }
  };

  return (
    <Layout title="📤 Export Resume" subtitle="Choose a design and download in the format you need.">

      <GradientBanner
        icon="📥"
        title="Download Your Resume"
        subtitle="Pick a template, preview it live, then export as PDF, Word, plain text, HTML or JSON."
      />

      <div className="form-group" style={{ maxWidth: 560 }}>
        <label className="form-label">Which resume?</label>
        <select className="form-select" value={resumeId} onChange={e => onResumeChange(e.target.value)}>
          {resumes.length === 0 && <option value="">No resumes yet — build one first</option>}
          {resumes.map(r => (
            <option key={r.id} value={r.id}>{r.title} (v{r.version})</option>
          ))}
        </select>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left: template picker + formats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card title="🎨 Choose a Design">
            <TemplatePicker value={template} onChange={setTemplate} />
          </Card>

          <Card title="⬇️ Download Format">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {FORMATS.map(f => (
                <div key={f.id} style={{
                  border: '1.5px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>{f.icon}</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, minHeight: 48 }}>{f.desc}</div>
                  <button
                    className="btn btn-primary btn-block btn-sm"
                    onClick={() => download(f.id)}
                    disabled={!!downloading || !resumeId}
                  >
                    {downloading === f.id ? '⏳...' : 'Download'}
                  </button>
                </div>
              ))}
            </div>
            <Alert type="info" style={{ marginTop: 16 }}>
              💡 Applying to jobs? Use <strong>PDF</strong> (with an ATS-safe template) or <strong>Plain text</strong>. Save <strong>Designer</strong> templates for networking and personal sharing.
            </Alert>
          </Card>
        </div>

        {/* Right: live preview */}
        <Card title="👁️ Live Preview">
          <ResumePreview resumeId={resumeId} template={template} />
        </Card>
      </div>
    </Layout>
  );
}
