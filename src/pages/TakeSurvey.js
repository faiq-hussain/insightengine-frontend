import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getSurvey, startResponse, submitAnswer, completeResponse } from '../utils/api';

export default function TakeSurvey() {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responseId, setResponseId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Track whether we are waiting for the user to answer a follow-up question.
  // If true, the next user message is treated as the follow-up answer, then we
  // move on to the next main question — we do NOT call the backend again for it.
  const [waitingForFollowUp, setWaitingForFollowUp] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [{ data: surveyData }, { data: startData }] = await Promise.all([
          getSurvey(id),
          startResponse(id)
        ]);
        setSurvey(surveyData);
        setResponseId(startData.responseId);
        setMessages([{
          role: 'assistant',
          text: `Hi there! 👋 I'm your research assistant.\n\n"${surveyData.title}"\n\nI have a few questions for you — just answer naturally, like a conversation. Let's begin!\n\n${surveyData.questions[0]?.text}`,
        }]);
      } catch (e) {
        setError('Survey not found or server error.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    inputRef.current?.focus();
  }, [messages, submitting]);

  // Delay helper
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // Add a bot message with a small typing delay for realism
  const addBotMessage = async (text, extra = {}) => {
    await wait(600);
    setMessages(prev => [...prev, { role: 'assistant', text, ...extra }]);
  };

  const sendAnswer = async () => {
    if (!inputVal.trim() || submitting) return;
    const answer = inputVal.trim();
    setInputVal('');
    setSubmitting(true);

    // Show user's message immediately
    setMessages(prev => [...prev, { role: 'user', text: answer }]);

    try {
      // ── CASE 1: User is answering a follow-up question ───────────────────
      // We already asked the follow-up; now accept their answer and move on
      // to the next main question without another AI call.
      if (waitingForFollowUp) {
        setWaitingForFollowUp(false);
        const nextIndex = currentQIndex + 1;

        if (nextIndex < survey.questions.length) {
          const nextQ = survey.questions[nextIndex];
          await addBotMessage(nextQ.text, {
            questionNum: `Question ${nextIndex + 1} of ${survey.questions.length}`
          });
          setCurrentQIndex(nextIndex);
        } else {
          await completeResponse(responseId);
          await addBotMessage(
            "Thank you so much for your time! 🎉 Your insights are incredibly valuable. You can close this window now.",
            { isFinal: true }
          );
          setDone(true);
        }

        setSubmitting(false);
        return;
      }

      // ── CASE 2: Normal main question answer ───────────────────────────────
      const currentQ = survey.questions[currentQIndex];
      const { data } = await submitAnswer(responseId, {
        questionId: currentQ.id,
        answerText: answer
      });

      if (data.followUp) {
        // Show the follow-up question and STOP — wait for user to answer it
        await addBotMessage(data.followUp, { isFollowUp: true });
        setWaitingForFollowUp(true);
        setSubmitting(false);
        return;
      }

      // No follow-up — go straight to the next main question
      const nextIndex = currentQIndex + 1;

      if (nextIndex < survey.questions.length) {
        const nextQ = survey.questions[nextIndex];
        await addBotMessage(nextQ.text, {
          questionNum: `Question ${nextIndex + 1} of ${survey.questions.length}`
        });
        setCurrentQIndex(nextIndex);
      } else {
        await completeResponse(responseId);
        await addBotMessage(
          "Thank you so much for your time! 🎉 Your insights are incredibly valuable. You can close this window now.",
          { isFinal: true }
        );
        setDone(true);
      }
    } catch (e) {
      await addBotMessage('Sorry, something went wrong. Please try again.', { isError: true });
    }

    setSubmitting(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAnswer(); }
  };

  const progress = survey
    ? Math.round((currentQIndex / survey.questions.length) * 100)
    : 0;

  // ── Loading & error screens ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)', flexDirection:'column', gap:16 }}>
      <div className="spinner" style={{ width:32, height:32, borderWidth:3 }} />
      <span style={{ color:'var(--text2)' }}>Loading survey…</span>
    </div>
  );

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div className="alert alert-error">{error}</div>
    </div>
  );

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', maxWidth:720, margin:'0 auto', padding:'0 16px' }}>

      {/* ── Header ── */}
      <div style={{ padding:'20px 0 16px', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--bg)', zIndex:5 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{ width:36, height:36, background:'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🤖</div>
          <div>
            <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:15 }}>InsightAI Research Bot</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>{survey?.title}</div>
          </div>
          {!done && (
            <div style={{ marginLeft:'auto', fontSize:12, color:'var(--text2)' }}>
              {waitingForFollowUp
                ? `Follow-up • Q${currentQIndex + 1}/${survey?.questions?.length}`
                : `Question ${Math.min(currentQIndex + 1, survey?.questions?.length)} of ${survey?.questions?.length}`}
            </div>
          )}
        </div>
        {!done && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width:`${done ? 100 : progress}%` }} />
          </div>
        )}
      </div>

      {/* ── Chat messages ── */}
      <div style={{ flex:1, padding:'24px 0', display:'flex', flexDirection:'column', gap:16 }}>
        {messages.map((msg, i) => (
          <div key={i} className="fade-in" style={{ display:'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width:28, height:28, background:'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, marginRight:10, flexShrink:0, marginTop:2 }}>🤖</div>
            )}
            <div style={{
              maxWidth:'76%',
              background: msg.role === 'user' ? 'var(--accent)'
                : msg.isFinal   ? 'rgba(16,185,129,0.1)'
                : msg.isFollowUp? 'rgba(245,158,11,0.08)'
                : msg.isError   ? 'rgba(239,68,68,0.1)'
                : 'var(--bg2)',
              border: msg.role === 'user' ? 'none'
                : msg.isFinal   ? '1px solid rgba(16,185,129,0.3)'
                : msg.isFollowUp? '1px solid rgba(245,158,11,0.25)'
                : msg.isError   ? '1px solid rgba(239,68,68,0.3)'
                : '1px solid var(--border)',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
              padding:'12px 16px',
              fontSize:14,
              lineHeight:1.6,
              whiteSpace:'pre-wrap',
              color: msg.role === 'user' ? 'white' : 'var(--text)'
            }}>
              {msg.questionNum && (
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>
                  {msg.questionNum}
                </div>
              )}
              {msg.isFollowUp && (
                <div style={{ fontSize:11, color:'#fcd34d', marginBottom:6, fontWeight:600 }}>
                  ↳ Follow-up
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {submitting && (
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, background:'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🤖</div>
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px 18px 18px 18px', padding:'12px 16px' }}>
              <div style={{ display:'flex', gap:4 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--text3)', animation:'pulse 1s infinite', animationDelay:`${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Input box ── */}
      {!done && (
        <div style={{ padding:'16px 0 24px', borderTop:'1px solid var(--border)', position:'sticky', bottom:0, background:'var(--bg)' }}>
          {waitingForFollowUp && (
            <div style={{ fontSize:12, color:'#fcd34d', marginBottom:8, paddingLeft:4 }}>
              ↳ Answering follow-up question
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <textarea
              ref={inputRef}
              className="textarea"
              placeholder={waitingForFollowUp ? "Answer the follow-up above…" : "Type your answer here…"}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKey}
              disabled={submitting}
              style={{ resize:'none', minHeight:48, height:48, overflow:'hidden', lineHeight:1.5 }}
              onInput={e => {
                e.target.style.height = '48px';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <button
              className="btn btn-primary"
              onClick={sendAnswer}
              disabled={submitting || !inputVal.trim()}
              style={{ flexShrink:0, padding:'10px 16px' }}
            >↑</button>
          </div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:6, textAlign:'center' }}>
            Shift+Enter for new line · Enter to send
          </div>
        </div>
      )}
    </div>
  );
}
