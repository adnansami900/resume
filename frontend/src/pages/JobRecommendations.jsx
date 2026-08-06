// JobRecommendations.jsx - "What kind of jobs should I look for?"
//
// Scores the user's most recent resume against a seed dataset of job
// listings (see backend/utils/recommendationEngine.js) and surfaces
// both specific matching listings and the broader role types worth
// searching for. Since the listings are a demo dataset rather than a
// live job board, that's disclosed up front, and "Track this
// application" sends the user straight to the Application Tracker
// with the form pre-filled — real utility today regardless of the
// data source.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, Alert, Spinner, GradientBanner } from '../components/UI';
import JobCard from '../components/JobCard';
import api from '../services/api';

export default function JobRecommendations() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/jobs/recommended')
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || 'Could not load job recommendations.'))
      .finally(() => setLoading(false));
  }, []);

  const handleApply = (job) => {
    navigate('/applications', {
      state: {
        prefill: {
          companyName: job.company,
          jobTitle: job.title,
          jobDescription: job.description,
        },
      },
    });
  };

  if (loading) return <Layout title="🧭 Job Matches"><Spinner label="Scoring jobs against your resume..." /></Layout>;

  return (
    <Layout title="🧭 Job Matches" subtitle="What kind of jobs should you be looking for, based on your resume?">
      <GradientBanner
        icon="🧭"
        title="Your best-matching roles"
        subtitle="Ranked by how well your resume matches each listing — the same scoring engine that powers your ATS scan."
      />

      {error && <Alert type="error">{error}</Alert>}

      {!error && data && (
        <>
          {data.suggestedRoles.length > 0 && (
            <Card title="🎯 Suggested roles for you" style={{ marginBottom: 20 }}>
              <div className="tag-list">
                {data.suggestedRoles.map(role => (
                  <span key={role} className="chip">{role}</span>
                ))}
              </div>
              <p className="form-hint" style={{ marginTop: 10 }}>
                Based on the roles your resume matches best below — try searching for these titles on job boards.
              </p>
            </Card>
          )}

          <Alert type="info" style={{ marginBottom: 16 }}>
            📦 These listings come from a demo dataset (not a live job board yet) — great for practicing your targeting,
            but double check real openings elsewhere. {data.source === 'gemini' ? 'Reasons personalised by AI.' : 'Reasons generated locally.'}
          </Alert>

          {data.recommendations.length === 0 ? (
            <p className="page-subtitle">No matches found — try adding more skills and experience to your resume.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {data.recommendations.map(rec => (
                <JobCard key={rec.job.id} recommendation={rec} onApply={handleApply} />
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
