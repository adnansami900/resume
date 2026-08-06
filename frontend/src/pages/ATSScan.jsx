// ATSScan.jsx - ATS scoring with file upload support

import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, Alert, Spinner, ScoreRing, GradientBanner, ProgressBar } from '../components/UI';
import api from '../services/api';

const CATEGORY_LABELS = {
  keywordMatch:           '🔑 Keyword Match',
  skillsMatch:            '🛠️ Skills Match',
  sectionCompleteness:    '📋 Section Completeness',
  contactDetails:         '📞 Contact Details',
  actionVerbs:            '⚡ Action Verbs',
  measurableAchievements: '📈 Measurable Achievements',
  formatting:             '🎨 Formatting',
};

function scoreColour(val) {
  return val >= 75 ? '#10b981' : val >= 50 ? '#f59e0b' : '#ef4444';
}

export default function ATSScan() {
  const [resumes, setResumes]     = useState([]);
  const [resumeId, setResumeId]   = useState('');
  const [jobDescription, setJD]   = useState('');
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    api.get('/resumes').then(res => {
      setResumes(res.data.resumes);
      if (res.data.resumes.length > 0) setResumeId(res.data.resumes[0].id);
    });
  }, []);

  const runScan = async () => {
    if (!resumeId || !jobDescription.trim()) {
      setError('Please select a resume and paste a job description.');
      return;
    }
    setError(''); setLoading(true); setResult(null);
    try {
      const res = await api.post('/ats/scan', { resumeId, jobDescription });
      setResult(res.data);
    } catch(err) {
      setError(err.response?.data?.error || 'Scan failed.');
    } finally { setLoading(false); }
  };

  return (
    <Layout title="🎯 ATS Scan" subtitle="See how well your resume matches a job description.">
      <GradientBanner icon="🤖" title="Local ATS Scoring Engine"
        subtitle="No AI credits used — runs on our own keyword and rules engine. Results are instant." />

      <div className="grid-2">
        <Card title="📋 Scan Setup">
          <div className="form-group">
            <label className="form-label">Select your resume</label>
            <select className="form-select" value={resumeId} onChange={e => setResumeId(e.target.value)}>
              {resumes.length === 0 && <option value="">No resumes yet — build one first</option>}
              {resumes.map(r => <option key={r.id} value={r.id}>{r.title} (v{r.version})</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Job description</label>
            <p className="form-hint" style={{ marginTop: 0, marginBottom: 8 }}>
              Copy the job ad from Seek, LinkedIn or the company website and paste it here.
            </p>
            <textarea className="form-textarea" style={{ minHeight: 260 }} value={jobDescription}
              onChange={e => setJD(e.target.value)}
              placeholder="Paste the full job description here — responsibilities, requirements and skills..." />
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
              {jobDescription.trim() ? `${jobDescription.trim().split(/\s+/).length} words` : 'Longer job ads give more accurate results.'}
            </div>
          </div>

          {error && <Alert type="error">{error}</Alert>}
          <button className="btn btn-primary btn-block btn-lg" onClick={runScan} disabled={loading}>
            {loading ? '⏳ Scanning...' : '🚀 Run ATS Scan'}
          </button>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>
            Free · No AI credits used · Results in seconds
          </p>
        </Card>

        <Card title="📊 Results">
          {loading && <Spinner label="Analyzing your resume..." />}
          {!loading && !result && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 50, marginBottom: 12 }}>🎯</div>
              <p>Run a scan to see your results here.</p>
            </div>
          )}
          {result && (
            <div className="animate-in">
              <ScoreRing score={result.overallScore} />
              <p style={{ textAlign: 'center', marginTop: 8, color: '#64748b', fontSize: 13, marginBottom: 20 }}>
                Overall ATS Score
              </p>
              <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Score Breakdown</h4>
              {Object.entries(result.breakdown).map(([key, val]) => (
                <div key={key} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{CATEGORY_LABELS[key] || key}</span>
                    <strong style={{ color: scoreColour(val) }}>{val}%</strong>
                  </div>
                  <ProgressBar value={val} colour={scoreColour(val)} />
                </div>
              ))}
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: '16px 0 10px' }}>✅ Matched</h4>
              <div className="tag-list">
                {result.matchedKeywords.length === 0
                  ? <span style={{ color: '#94a3b8', fontSize: 13 }}>None found</span>
                  : result.matchedKeywords.map(k => (
                    <span key={k} className="tag" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>{k}</span>
                  ))}
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: '16px 0 10px' }}>❌ Missing</h4>
              <div className="tag-list">
                {result.missingKeywords.length === 0
                  ? <span style={{ color: '#94a3b8', fontSize: 13 }}>None — great match! 🎉</span>
                  : result.missingKeywords.map(k => (
                    <span key={k} className="tag" style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}>{k}</span>
                  ))}
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: '16px 0 10px' }}>💡 Suggestions</h4>
              <ul style={{ fontSize: 13.5, paddingLeft: 18, color: '#374151' }}>
                {result.suggestions.map((s, i) => <li key={i} style={{ marginBottom: 6 }}>{s}</li>)}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
