// AITailoring.jsx - Tailor your resume to a specific job description using AI

import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, Alert, Spinner, GradientBanner } from '../components/UI';
import api from '../services/api';

export default function AITailoring() {
  const [resumes, setResumes]           = useState([]);
  const [resumeId, setResumeId]         = useState('');
  const [jobDescription, setJD]         = useState('');
  const [result, setResult]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    api.get('/resumes').then(res => {
      setResumes(res.data.resumes);
      if (res.data.resumes.length > 0) setResumeId(res.data.resumes[0].id);
    });
  }, []);

  const tailor = async () => {
    if (!resumeId || !jobDescription.trim()) {
      setError('Please select a resume and paste a job description.');
      return;
    }
    setError(''); setLoading(true); setResult(null);
    try {
      const res = await api.post('/ai/tailor', { resumeId, jobDescription });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to tailor resume.');
    } finally {
      setLoading(false);
    }
  };

  const copy = (text) => navigator.clipboard.writeText(text).catch(() => {});

  return (
    <Layout title="✂️ AI Resume Tailoring" subtitle="Tailor your resume to a specific job — without inventing anything new.">

      <GradientBanner
        icon="🎯"
        title="Truth-Constrained AI Tailoring"
        subtitle="The AI only uses facts already in your resume. It will never make up skills or experience."
      />

      <div className="grid-2">
        {/* Input */}
        <Card title="📋 Job Details">
          <div className="form-group">
            <label className="form-label">Resume to tailor</label>
            <select className="form-select" value={resumeId} onChange={e => setResumeId(e.target.value)}>
              {resumes.length === 0 && <option value="">No resumes yet</option>}
              {resumes.map(r => <option key={r.id} value={r.id}>{r.title} (v{r.version})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Job description</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: 240 }}
              value={jobDescription}
              onChange={e => setJD(e.target.value)}
              placeholder="Paste the job description you're targeting..."
            />
          </div>
          {error && <Alert type="error">{error}</Alert>}
          <button className="btn btn-primary btn-block btn-lg" onClick={tailor} disabled={loading}>
            {loading ? '⏳ Tailoring...' : '✂️ Tailor My Resume (1 credit)'}
          </button>
        </Card>

        {/* Results */}
        <Card title="✨ Tailoring Result">
          {loading && <Spinner label="Tailoring your resume..." />}
          {!loading && !result && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 50, marginBottom: 12 }}>✂️</div>
              <p>Results will appear here after tailoring.</p>
            </div>
          )}
          {result && (
            <div className="animate-in">
              <span className={`badge ${result.source === 'gemini' ? 'badge-purple' : 'badge-gray'}`} style={{ marginBottom: 16 }}>
                {result.source === 'gemini' ? '🤖 Gemini AI' : '📏 Local Rules'}
              </span>

              {/* Tailored summary */}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 15 }}>📝 Tailored Summary</h4>
                  <button className="btn btn-secondary btn-sm" onClick={() => copy(result.tailoredSummary)}>📋 Copy</button>
                </div>
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 14, fontSize: 14, lineHeight: 1.6 }}>
                  {result.tailoredSummary}
                </div>
              </div>

              {/* Keywords to add */}
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 15, marginBottom: 10 }}>🔑 Keywords to Emphasise</h4>
                <div className="tag-list">
                  {(result.keywordsToAdd || []).length > 0
                    ? result.keywordsToAdd.map((k, i) => <span key={i} className="tag">{k}</span>)
                    : <span style={{ color: '#94a3b8', fontSize: 13 }}>No additional keywords suggested.</span>}
                </div>
              </div>

              {/* AI reasoning */}
              {result.reasoning && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: 15, marginBottom: 8 }}>🧠 AI Reasoning</h4>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{result.reasoning}</p>
                </div>
              )}

              {/* Truth check flags */}
              {result.truthFlags?.length > 0 && (
                <Alert type="warning" style={{ marginTop: 14 }}>
                  <div>
                    <strong>⚠️ Truth-check flags:</strong>
                    <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                      {result.truthFlags.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                </Alert>
              )}

              <Alert type="info" style={{ marginTop: 14 }}>
                Only add keywords you can genuinely back up in an interview. Review all suggestions carefully before using.
              </Alert>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
