// ApplicationTracker.jsx - Track job applications through a visual pipeline

import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, Alert, GradientBanner } from '../components/UI';
import api from '../services/api';

const STATUSES = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];

// Colours for each status column
const STATUS_COLOURS = {
  Saved: '#6366f1', Applied: '#3b82f6',
  Interview: '#f59e0b', Offer: '#10b981', Rejected: '#ef4444',
};

const EMPTY_FORM = { companyName: '', jobTitle: '', jobDescription: '', status: 'Saved', notes: '' };

export default function ApplicationTracker() {
  const [applications, setApplications] = useState([]);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [error, setError]               = useState('');

  const load = () =>
    api.get('/applications').then(res => setApplications(res.data.applications));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/applications', form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add application.');
    }
  };

  const moveStatus = async (id, status) => {
    await api.put(`/applications/${id}`, { status });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this application?')) return;
    await api.delete(`/applications/${id}`);
    load();
  };

  // Group applications by status for the kanban board
  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = applications.filter(a => a.status === s);
    return acc;
  }, {});

  const total = applications.length;

  return (
    <Layout
      title="📋 Job Tracker"
      subtitle="Track every application through your pipeline."
      actions={
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Application'}
        </button>
      }
    >
      <GradientBanner
        icon="📊"
        title={`${total} application${total !== 1 ? 's' : ''} tracked`}
        subtitle="Move cards between columns as your applications progress."
      />

      {/* Add application form */}
      {showForm && (
        <Card title="➕ New Application" style={{ marginBottom: 20 }}>
          {error && <Alert type="error">{error}</Alert>}
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Company name *</label>
                <input className="form-input" value={form.companyName}
                  onChange={e => setForm({ ...form, companyName: e.target.value })} required placeholder="e.g. Google" />
              </div>
              <div className="form-group">
                <label className="form-label">Job title *</label>
                <input className="form-input" value={form.jobTitle}
                  onChange={e => setForm({ ...form, jobTitle: e.target.value })} required placeholder="e.g. Software Engineer" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-input" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Referral, deadline, etc." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" type="submit">💾 Save</button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {/* Kanban board */}
      <div className="kanban-board">
        {STATUSES.map(status => (
          <div className="kanban-column" key={status}>
            <div className="kanban-column-title" style={{ color: STATUS_COLOURS[status] }}>
              <span>{status}</span>
              <span className="badge" style={{
                background: STATUS_COLOURS[status] + '22',
                color: STATUS_COLOURS[status],
              }}>
                {grouped[status].length}
              </span>
            </div>

            {grouped[status].length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 10px', color: '#cbd5e1', fontSize: 13 }}>
                No applications here yet
              </div>
            )}

            {grouped[status].map(app => (
              <div className="kanban-card" key={app.id}>
                <div className="kanban-card-title">{app.job_title}</div>
                <div className="kanban-card-sub">🏢 {app.company_name}</div>
                {app.notes && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontStyle: 'italic' }}>
                    {app.notes}
                  </div>
                )}
                {/* Status change dropdown */}
                <select
                  className="form-select"
                  value={app.status}
                  onChange={e => moveStatus(app.id, e.target.value)}
                  style={{ fontSize: 12, padding: '5px 8px', marginBottom: 8 }}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => remove(app.id)}
                  style={{ width: '100%', color: '#ef4444', borderColor: '#fca5a5', fontSize: 12 }}
                >
                  🗑️ Remove
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Layout>
  );
}
