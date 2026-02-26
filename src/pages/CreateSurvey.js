import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSurvey } from '../utils/api';

const AUDIENCE_OPTIONS = [
  'Startup founders', 'Product managers', 'Research students',
  'SMEs / Small businesses', 'University students', 'NGOs', 'Customers / End users',
  'Healthcare professionals', 'Teachers / Educators', 'General public'
];

export default function CreateSurvey() {
  const [form, setForm] = useState({ researchGoal: '', targetAudience: '', numQuestions: 6 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!form.researchGoal.trim()) { setError('Please enter a research goal'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await generateSurvey(form);
      setPreview(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to generate survey. Check your API key and backend.');
    } finally {
      setLoading(false);
    }
  };

  const EXAMPLES = [
    'Understand why users abandon their shopping cart before checkout',
    'Discover pain points for remote team collaboration tools',
    'Validate product-market fit for a B2B SaaS analytics dashboard',
    'Explore challenges faced by small business owners managing finances',
  ];

  return (
    <div className="fade-in" style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>AI Survey Designer</h1>
        <p style={{ color: 'var(--text2)' }}>Describe your research goal and let AI build a conversational survey</p>
      </div>

      {!preview ? (
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="label">Research Goal *</label>
            <textarea
              className="textarea"
              placeholder="e.g. Understand why startup founders struggle with market validation and what tools they currently use..."
              value={form.researchGoal}
              onChange={e => setForm({ ...form, researchGoal: e.target.value })}
              style={{ minHeight: 120 }}
            />
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Examples:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {EXAMPLES.map(ex => (
                  <button
                    key={ex}
                    className="btn btn-ghost"
                    style={{ textAlign: 'left', fontSize: 12, padding: '4px 8px', color: 'var(--text3)' }}
                    onClick={() => setForm({ ...form, researchGoal: ex })}
                  >
                    → {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Target Audience</label>
            <select className="select" value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })}>
              <option value="">Select target audience (optional)</option>
              {AUDIENCE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Number of Questions: {form.numQuestions}</label>
            <input
              type="range" min="3" max="12" step="1"
              value={form.numQuestions}
              onChange={e => setForm({ ...form, numQuestions: +e.target.value })}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              <span>3 (Quick)</span><span>12 (Deep Dive)</span>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
          >
            {loading ? <><span className="spinner" /> Generating with AI…</> : '✦ Generate Survey with AI'}
          </button>
        </div>
      ) : (
        /* Preview */
        <div className="fade-in">
          <div className="alert alert-success">✓ Survey generated! Review and confirm to save.</div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, marginBottom: 4 }}>{preview.title}</h2>
                <span className="badge badge-blue">{preview.questions?.length} Questions</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {preview.questions?.map((q, i) => (
                <div key={q.id} style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28, height: 28,
                      background: 'rgba(79,110,247,0.15)',
                      borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'var(--accent)',
                      flexShrink: 0
                    }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ marginBottom: 6 }}>{q.text}</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span className="badge badge-purple">{q.type}</span>
                        {q.follow_up_logic && (
                          <span className="badge badge-yellow">Has follow-up logic</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setPreview(null)} style={{ flex: 1, justifyContent: 'center' }}>
              ← Regenerate
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/survey/${preview.surveyId}/insights`)}
              style={{ flex: 2, justifyContent: 'center', padding: '14px' }}
            >
              ✓ Save & View Survey →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
