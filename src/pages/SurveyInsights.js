import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { getSurvey, getInsights, generateInsights, getSurveyStats } from '../utils/api';

const COLORS = ['#10b981', '#8b92a8', '#ef4444'];

export default function SurveyInsights() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [insights, setInsights] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      const [{ data: s }, { data: ins }, { data: st }] = await Promise.all([
        getSurvey(id),
        getInsights(id),
        getSurveyStats(id)
      ]);
      setSurvey(s);
      setInsights(ins);
      setStats(st);
    } catch (e) {
      setError('Failed to load survey data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleGenerateInsights = async () => {
    if (stats?.answer_count === 0) {
      alert('No responses yet! Share the survey link first to collect responses.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const { data } = await generateInsights(id);
      setInsights(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to generate insights.');
    } finally {
      setGenerating(false);
    }
  };

  const surveyUrl = `${window.location.origin}/survey/${id}/take`;

  const copyLink = () => {
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <span style={{ color: 'var(--text2)' }}>Loading…</span>
    </div>
  );

  const sentimentData = stats ? [
    { name: 'Positive', value: stats.sentimentCounts?.positive || 0 },
    { name: 'Neutral', value: stats.sentimentCounts?.neutral || 0 },
    { name: 'Negative', value: stats.sentimentCounts?.negative || 0 },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ marginBottom: 16, padding: '6px 0', fontSize: 13 }}>
          ← Back to Dashboard
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 6 }}>{survey?.title}</h1>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>{survey?.research_goal}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={copyLink}>
              {copied ? '✓ Copied!' : '🔗 Copy Survey Link'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleGenerateInsights}
              disabled={generating}
            >
              {generating ? <><span className="spinner" /> Analysing…</> : '⚡ Generate Insights'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Share panel */}
      <div className="card" style={{ marginBottom: 24, background: 'rgba(79,110,247,0.06)', borderColor: 'rgba(79,110,247,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🔗</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Survey Collection Link</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'monospace', background: 'var(--bg3)', padding: '6px 10px', borderRadius: 6 }}>
              {surveyUrl}
            </div>
          </div>
          <button className="btn btn-primary" onClick={copyLink} style={{ flexShrink: 0 }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>
          Share this link with your target audience. Each person will have a conversational AI-powered interview.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Starts', value: stats?.total || 0, icon: '📊' },
          { label: 'Completed', value: stats?.completed || 0, icon: '✅' },
          { label: 'Completion Rate', value: `${stats?.completion_rate || 0}%`, icon: '📈' },
          { label: 'Total Answers', value: stats?.answer_count || 0, icon: '💬' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '18px 12px' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontFamily: 'Syne', fontWeight: 800, color: 'var(--accent)' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Questions list */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, marginBottom: 16 }}>Survey Questions ({survey?.questions?.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {survey?.questions?.map((q, i) => (
            <div key={q.id} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '12px 14px',
              background: 'var(--bg3)',
              borderRadius: 10,
              border: '1px solid var(--border)'
            }}>
              <div style={{
                width: 24, height: 24,
                background: 'rgba(79,110,247,0.15)',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                flexShrink: 0
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, marginBottom: 4 }}>{q.text}</p>
                <span className="badge badge-purple" style={{ fontSize: 11 }}>{q.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* No insights yet */}
      {!insights && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <h3 style={{ marginBottom: 8, color: 'var(--text2)' }}>No insights generated yet</h3>
          <p style={{ color: 'var(--text3)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            {stats?.answer_count > 0
              ? `You have ${stats.answer_count} answers. Click "Generate Insights" to run the AI analysis.`
              : 'Share the survey link above to collect responses, then generate insights.'}
          </p>
          {stats?.answer_count > 0 && (
            <button className="btn btn-primary" onClick={handleGenerateInsights} disabled={generating}>
              {generating ? <><span className="spinner" /> Analysing…</> : '⚡ Generate AI Insights'}
            </button>
          )}
        </div>
      )}

      {/* Insights */}
      {insights && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 20 }}>AI Insight Report</h2>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              Generated {new Date(insights.generated_at).toLocaleString()}
            </span>
          </div>

          {/* Executive Summary */}
          <div className="card" style={{
            marginBottom: 20,
            background: 'linear-gradient(135deg, rgba(79,110,247,0.1), rgba(124,58,237,0.1))',
            borderColor: 'rgba(79,110,247,0.3)'
          }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', fontWeight: 600, marginBottom: 10 }}>
              Executive Summary
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)' }}>{insights.executive_summary}</p>
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Sentiment */}
            {sentimentData.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: 15, marginBottom: 16 }}>Sentiment Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {sentimentData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                  {sentimentData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i] }} />
                      {d.name}: {d.value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Themes */}
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 16 }}>Key Themes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.themes?.map((t, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px',
                    background: 'var(--bg3)',
                    borderRadius: 8,
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pain Points */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>🔴 Key Pain Points</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {insights.key_pain_points?.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '12px 14px',
                  background: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: 10
                }}>
                  <span style={{ color: 'var(--red)', fontSize: 16, flexShrink: 0 }}>!</span>
                  <span style={{ fontSize: 14 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Patterns & Recommendations - 2 col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 14 }}>📈 Patterns Identified</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.patterns?.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14 }}>
                    <span style={{ color: 'var(--accent3)', flexShrink: 0 }}>→</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 14 }}>💡 Recommendations</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.recommendations?.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14 }}>
                    <span style={{ color: 'var(--yellow)', flexShrink: 0 }}>✦</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Plan */}
          {insights.action_plan?.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 14 }}>🎯 Prioritised Action Plan</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {insights.action_plan?.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    padding: '14px 16px',
                    background: 'var(--bg3)',
                    borderRadius: 10,
                    border: '1px solid var(--border)'
                  }}>
                    <span className={`badge ${a.priority === 'High' ? 'badge-red' : a.priority === 'Medium' ? 'badge-yellow' : 'badge-green'}`}
                      style={{ flexShrink: 0, marginTop: 2 }}>
                      {a.priority}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{a.action}</div>
                      <div style={{ fontSize: 13, color: 'var(--text2)' }}>{a.rationale}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
