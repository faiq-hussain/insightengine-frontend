import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSurveys, deleteSurvey } from '../utils/api';

export default function Dashboard() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await listSurveys();
      setSurveys(data);
    } catch (e) {
      setError('Failed to load surveys. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this survey and all its data?')) return;
    await deleteSurvey(id);
    load();
  };

  const copyLink = (id, e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/survey/${id}/take`;
    navigator.clipboard.writeText(url);
    alert('Survey link copied to clipboard!\n\n' + url);
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 32, marginBottom: 8 }}>Research Dashboard</h1>
          <p style={{ color: 'var(--text2)' }}>Manage your AI-powered surveys and view insights</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/create')}>
          ✦ Create New Survey
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 36 }}>
        {[
          { label: 'Total Surveys', value: surveys.length, color: 'var(--accent)' },
          { label: 'Total Responses', value: surveys.reduce((a, s) => a + (s.response_count || 0), 0), color: 'var(--accent3)' },
          { label: 'Active Surveys', value: surveys.filter(s => s.status === 'active').length, color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'Syne', color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Surveys list */}
      <div>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Your Surveys</h2>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            Loading surveys…
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && surveys.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h3 style={{ marginBottom: 8, color: 'var(--text2)' }}>No surveys yet</h3>
            <p style={{ color: 'var(--text3)', marginBottom: 24 }}>Create your first AI-powered survey to start collecting insights</p>
            <button className="btn btn-primary" onClick={() => navigate('/create')}>Create Survey</button>
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {surveys.map(survey => (
            <div
              key={survey.id}
              className="card"
              onClick={() => navigate(`/survey/${survey.id}/insights`)}
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(79,110,247,0.4)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 17 }}>{survey.title}</h3>
                    <span className="badge badge-green">Active</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
                    {survey.research_goal}
                  </p>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                      📅 {new Date(survey.created_at).toLocaleDateString()}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                      💬 {survey.response_count || 0} responses
                    </span>
                    {survey.target_audience && (
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                        👥 {survey.target_audience}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginLeft: 20 }} onClick={e => e.stopPropagation()}>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 13, padding: '8px 14px' }}
                    onClick={(e) => copyLink(survey.id, e)}
                  >
                    🔗 Share
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 13, padding: '8px 14px' }}
                    onClick={() => navigate(`/survey/${survey.id}/insights`)}
                  >
                    📊 Insights
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ fontSize: 13, padding: '8px 14px' }}
                    onClick={(e) => handleDelete(survey.id, e)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
