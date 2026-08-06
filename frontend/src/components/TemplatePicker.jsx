// TemplatePicker.jsx - Grid of resume design templates.
//
// Shows a "Recommended" row (the featured top picks) first, then the
// rest grouped by tier. Each card renders a tiny CSS mock of the layout
// so the choice is visual, and Designer templates carry an ATS-risk
// badge so users choose with eyes open. The template list comes from
// the backend registry via api.getTemplates() — one source of truth.

import React, { useEffect, useState } from 'react';
import api from '../services/api';

// A small pure-CSS thumbnail hinting at each layout, tinted by accent.
function Thumb({ t }) {
  const a = t.accent;
  const bar = (w, c = '#cbd5e1', mt = 3) => (
    <div style={{ height: 3, width: w, background: c, borderRadius: 2, marginTop: mt }} />
  );

  if (t.layout === 'sidebar') {
    return (
      <div style={{ display: 'flex', height: '100%', background: '#fff' }}>
        <div style={{ width: '34%', background: a, padding: 6 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,.5)', margin: '0 auto 6px' }} />
          {bar('80%', 'rgba(255,255,255,.6)')}{bar('60%', 'rgba(255,255,255,.6)')}{bar('70%', 'rgba(255,255,255,.6)')}
        </div>
        <div style={{ flex: 1, padding: 6 }}>
          {bar('70%', '#334155')}{bar('90%')}{bar('85%')}{bar('60%')}{bar('88%')}
        </div>
      </div>
    );
  }
  if (t.layout === 'creative') {
    return (
      <div style={{ height: '100%', background: '#fff' }}>
        <div style={{ background: a, height: 22, padding: 6 }}>{bar('55%', 'rgba(255,255,255,.85)', 4)}</div>
        <div style={{ padding: 6 }}>{bar('40%', a)}{bar('92%')}{bar('85%')}{bar('40%', a)}{bar('70%')}</div>
      </div>
    );
  }
  // single column
  return (
    <div style={{ height: '100%', background: '#fff', padding: 6 }}>
      <div style={{ textAlign: t.id === 'classic' ? 'center' : 'left' }}>
        {bar(t.id === 'classic' ? '60%' : '55%', a, 0)}
      </div>
      <div style={{ borderBottom: `2px solid ${a}`, margin: '5px 0 4px' }} />
      {bar('90%')}{bar('84%')}
      <div style={{ height: 3, width: '35%', background: a, borderRadius: 2, marginTop: 6 }} />
      {bar('88%')}{bar('80%')}
    </div>
  );
}

export default function TemplatePicker({ value, onChange }) {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    api.getTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  if (!templates.length) return null;

  const featured = templates.filter(t => t.featured);
  const others = templates.filter(t => !t.featured);

  const renderCard = (t) => {
    const active = value === t.id;
    return (
      <div
        key={t.id}
        onClick={() => onChange(t.id)}
        title={t.description}
        style={{
          border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 10,
          overflow: 'hidden',
          cursor: 'pointer',
          background: 'var(--surface)',
          boxShadow: active ? '0 0 0 3px rgba(99,102,241,0.18)' : 'none',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ height: 120, borderBottom: '1px solid var(--border)' }}>
          <Thumb t={t} />
        </div>
        <div style={{ padding: '8px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</span>
            {active && <span style={{ color: 'var(--primary)', fontSize: 13 }}>✓</span>}
          </div>
          <div style={{ marginTop: 5 }}>
            {t.atsSafe
              ? <span className="badge badge-green" style={{ fontSize: 10 }}>ATS-safe</span>
              : <span className="badge badge-yellow" style={{ fontSize: 10 }}>Designer · ATS risk</span>}
          </div>
        </div>
      </div>
    );
  };

  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', margin: '4px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        ⭐ Recommended
      </div>
      <div style={gridStyle}>{featured.map(renderCard)}</div>

      {others.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', margin: '18px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            All templates
          </div>
          <div style={gridStyle}>{others.map(renderCard)}</div>
        </>
      )}

      <p className="form-hint" style={{ marginTop: 12 }}>
        <strong>ATS-safe</strong> designs are single-column and parse cleanly in applicant-tracking systems.
        <strong> Designer</strong> designs look richer but may not parse perfectly — great for networking, referrals, or when you also send a plain-text/PDF copy.
      </p>
    </div>
  );
}
