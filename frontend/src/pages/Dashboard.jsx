// Dashboard.jsx - Home page after login, shows stats and quick links

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, Spinner, GradientBanner, ProgressBar } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Colour for each application status
const STATUS_COLOURS = {
  Saved: '#6366f1', Applied: '#3b82f6',
  Interview: '#f59e0b', Offer: '#10b981', Rejected: '#ef4444',
};

// Quick action cards shown on the dashboard
const QUICK_ACTIONS = [
  { to: '/resume-builder', icon: '📝', label: 'Build Resume',     colour: '#6366f1', desc: 'Create or edit your resume' },
  { to: '/ats-scan',       icon: '🎯', label: 'Run ATS Scan',     colour: '#ec4899', desc: 'Check your match score'    },
  { to: '/ai-suggestions', icon: '💡', label: 'AI Suggestions',   colour: '#06b6d4', desc: 'Improve your writing'      },
  { to: '/applications',   icon: '📋', label: 'Track Jobs',       colour: '#10b981', desc: 'Manage applications'        },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [resumes, setResumes]     = useState([]);
  const [appStats, setAppStats]   = useState(null);
  const [quota, setQuota]         = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    // Load all dashboard data at once
    Promise.all([
      api.get('/resumes'),
      api.get('/applications/stats/summary'),
      api.get('/ai/quota'),
    ])
      .then(([resumesRes, statsRes, quotaRes]) => {
        setResumes(resumesRes.data.resumes);
        setAppStats(statsRes.data.summary);
        setQuota(quotaRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Dashboard"><Spinner label="Loading your dashboard..." /></Layout>;

  const totalApps = appStats ? Object.values(appStats).reduce((a, b) => a + b, 0) : 0;
  const firstName = user?.name?.split(' ')[0] || '';

  return (
    <Layout
      title={`Hey ${firstName}! 👋`}
      subtitle="Here's what's happening with your job search today."
    >
      {/* Welcome banner */}
      <GradientBanner
        icon="🚀"
        title="Ready to land your next role?"
        subtitle="Use the tools below to build a standout resume and track your applications."
      />

      {/* Stat cards row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card stat-card">
          <div className="stat-value">{resumes.length}</div>
          <div className="stat-label">📄 Resumes</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{totalApps}</div>
          <div className="stat-label">📋 Applications</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{appStats?.Interview || 0}</div>
          <div className="stat-label">🎤 Interviews</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{quota ? quota.remaining : '—'}</div>
          <div className="stat-label">💡 AI Credits Left</div>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {QUICK_ACTIONS.map(action => (
          <Link key={action.to} to={action.to} style={{ textDecoration: 'none' }}>
            <div className="card" style={{
              textAlign: 'center', cursor: 'pointer', padding: '20px 16px',
              borderTop: `3px solid ${action.colour}`,
              transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{action.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: action.colour }}>{action.label}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{action.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid-2">
        {/* Recent resumes */}
        <Card title="📄 Your Resumes">
          {resumes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
              <p className="page-subtitle">No resumes yet.</p>
              <Link to="/resume-builder" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
                Build your first resume →
              </Link>
            </div>
          ) : (
            <>
              {resumes.slice(0, 5).map((r) => (
                <div key={r.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid #f1f5f9',
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</span>
                    <span className="badge badge-purple" style={{ marginLeft: 8, fontSize: 11 }}>v{r.version}</span>
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>
                    {new Date(r.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
              <Link to="/resume-builder" className="btn btn-secondary btn-sm" style={{ marginTop: 14 }}>
                Manage resumes →
              </Link>
            </>
          )}
        </Card>

        {/* Application pipeline */}
        <Card title="📊 Application Pipeline">
          {appStats ? (
            <>
              {Object.entries(appStats).map(([status, count]) => (
                <div key={status} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{status}</span>
                    <span style={{ fontWeight: 700, color: STATUS_COLOURS[status] }}>{count}</span>
                  </div>
                  <ProgressBar value={count} max={Math.max(totalApps, 1)} colour={STATUS_COLOURS[status]} />
                </div>
              ))}
              <Link to="/applications" className="btn btn-secondary btn-sm" style={{ marginTop: 14 }}>
                Open tracker →
              </Link>
            </>
          ) : (
            <p className="page-subtitle">No applications yet.</p>
          )}
        </Card>
      </div>

      {/* AI credits bar */}
      {quota && (
        <Card style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>💡 AI Credits</span>
              <span className="badge badge-purple" style={{ marginLeft: 10 }}>{user?.plan === 'pro' ? 'Pro' : 'Free'}</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#6366f1' }}>
              {quota.remaining} / {quota.limit} remaining
            </span>
          </div>
          <ProgressBar
            value={quota.used}
            max={quota.limit}
            colour={quota.remaining <= 3 ? '#ef4444' : undefined}
          />
          {quota.remaining <= 5 && (
            <div style={{ marginTop: 10, fontSize: 13, color: '#d97706' }}>
              ⚠️ Running low on credits. Paid top-ups coming soon!
            </div>
          )}
        </Card>
      )}
    </Layout>
  );
}
