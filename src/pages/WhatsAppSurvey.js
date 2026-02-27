import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getSurvey, startResponse, submitAnswer, completeResponse } from '../utils/api';

// ── WhatsApp colour tokens ────────────────────────────────────────────────────
const WA = {
  bg:        '#0b141a',      // dark chat wallpaper
  header:    '#202c33',      // top bar
  inputBar:  '#202c33',      // bottom bar
  incoming:  '#202c33',      // bot bubble
  outgoing:  '#005c4b',      // user bubble (WhatsApp green)
  accent:    '#00a884',      // ticks, send btn
  text:      '#e9edef',
  subtext:   '#8696a0',
  divider:   '#222e35',
  followUp:  '#2a3942',
};

// Realistic WhatsApp tick SVG
const Ticks = ({ seen }) => (
  <svg width="16" height="11" viewBox="0 0 16 11" style={{ marginLeft: 3, flexShrink: 0 }}>
    <path d="M11.071.653l-6.01 6.01-2.01-2.01" stroke={seen ? WA.accent : WA.subtext} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
    <path d="M14.071.653l-6.01 6.01" stroke={seen ? WA.accent : WA.subtext} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
  </svg>
);

// Format time like WhatsApp
const msgTime = () => {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
};

export default function WhatsAppSurvey() {
  const { id } = useParams();
  const [survey,          setSurvey]          = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [responseId,      setResponseId]      = useState(null);
  const [messages,        setMessages]        = useState([]);
  const [currentQIndex,   setCurrentQIndex]   = useState(0);
  const [inputVal,        setInputVal]        = useState('');
  const [submitting,      setSubmitting]      = useState(false);
  const [done,            setDone]            = useState(false);
  const [waitingFollowUp, setWaitingFollowUp] = useState(false);
  const [seenMsgs,        setSeenMsgs]        = useState({});   // mark user msgs as "seen"

  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [{ data: sv }, { data: sd }] = await Promise.all([
          getSurvey(id), startResponse(id)
        ]);
        setSurvey(sv);
        setResponseId(sd.responseId);
        setMessages([{
          id: 'intro',
          role: 'bot',
          text: `👋 Hi! I'm your research assistant.\n\n*${sv.title}*\n\nI have a few quick questions for you. Just reply naturally — this will only take a few minutes!\n\n${sv.questions[0]?.text}`,
          time: msgTime(),
        }]);
      } catch {
        setError('Survey not found or server error.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    inputRef.current?.focus();
  }, [messages, submitting]);

  const wait = ms => new Promise(r => setTimeout(r, ms));

  const addBotMsg = async (text, extra = {}) => {
    await wait(700);
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      role: 'bot', text, time: msgTime(), ...extra
    }]);
  };

  // Mark user message as "seen" after 1.5s (simulates the bot reading it)
  const markSeen = (msgId) => {
    setTimeout(() => {
      setSeenMsgs(prev => ({ ...prev, [msgId]: true }));
    }, 1500);
  };

  // ── Send answer ─────────────────────────────────────────────────────────────
  const sendAnswer = async () => {
    if (!inputVal.trim() || submitting) return;
    const answer = inputVal.trim();
    const msgId  = Date.now();
    setInputVal('');
    setSubmitting(true);

    setMessages(prev => [...prev, {
      id: msgId, role: 'user', text: answer, time: msgTime(), seen: false
    }]);
    markSeen(msgId);

    try {
      // ── Follow-up answer ──
      if (waitingFollowUp) {
        setWaitingFollowUp(false);
        const nextIdx = currentQIndex + 1;
        if (nextIdx < survey.questions.length) {
          await addBotMsg(survey.questions[nextIdx].text, {
            questionNum: `${nextIdx + 1}/${survey.questions.length}`
          });
          setCurrentQIndex(nextIdx);
        } else {
          await completeResponse(responseId);
          await addBotMsg(
            '✅ Thank you so much for your time!\n\nYour feedback is incredibly valuable and will help make real improvements. Have a great day! 😊',
            { isFinal: true }
          );
          setDone(true);
        }
        setSubmitting(false);
        return;
      }

      // ── Main question answer ──
      const currentQ = survey.questions[currentQIndex];
      const { data } = await submitAnswer(responseId, {
        questionId: currentQ.id,
        answerText: answer
      });

      if (data.followUp) {
        await addBotMsg(data.followUp, { isFollowUp: true });
        setWaitingFollowUp(true);
        setSubmitting(false);
        return;
      }

      const nextIdx = currentQIndex + 1;
      if (nextIdx < survey.questions.length) {
        await addBotMsg(survey.questions[nextIdx].text, {
          questionNum: `${nextIdx + 1}/${survey.questions.length}`
        });
        setCurrentQIndex(nextIdx);
      } else {
        await completeResponse(responseId);
        await addBotMsg(
          '✅ Thank you so much for your time!\n\nYour feedback is incredibly valuable and will help make real improvements. Have a great day! 😊',
          { isFinal: true }
        );
        setDone(true);
      }
    } catch {
      await addBotMsg('Sorry, something went wrong. Please try again.', { isError: true });
    }
    setSubmitting(false);
  };

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAnswer(); }
  };

  // Bold *text* renderer (basic WhatsApp-style markdown)
  const renderText = (text) => {
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((p, i) =>
      p.startsWith('*') && p.endsWith('*')
        ? <strong key={i}>{p.slice(1, -1)}</strong>
        : <span key={i}>{p}</span>
    );
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background: WA.bg, gap: 16 }}>
      <div style={{ width:48, height:48, borderRadius:'50%', background: WA.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🤖</div>
      <div style={{ color: WA.subtext, fontSize:14 }}>Connecting…</div>
      <div style={{ display:'flex', gap:5 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:7, height:7, borderRadius:'50%', background: WA.accent, opacity:0.6, animation:'pulse 1s infinite', animationDelay:`${i*0.2}s` }} />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background: WA.bg }}>
      <div style={{ color:'#ef4444', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'16px 24px' }}>{error}</div>
    </div>
  );

  const progress = survey ? Math.round(((currentQIndex) / survey.questions.length) * 100) : 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', maxWidth:480, margin:'0 auto', background: WA.bg, fontFamily: "-apple-system, 'Segoe UI', sans-serif", position:'relative' }}>

      {/* ── WhatsApp Header ── */}
      <div style={{ background: WA.header, padding:'10px 16px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 3px rgba(0,0,0,0.3)', zIndex:10, flexShrink:0 }}>
        {/* Back arrow */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={WA.text} strokeWidth="2.5" strokeLinecap="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        {/* Avatar */}
        <div style={{ width:40, height:40, borderRadius:'50%', background:`linear-gradient(135deg, ${WA.accent}, #128c7e)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🤖</div>
        {/* Name & status */}
        <div style={{ flex:1 }}>
          <div style={{ color: WA.text, fontWeight:600, fontSize:15 }}>InsightAI Research Bot</div>
          <div style={{ color: WA.accent, fontSize:12 }}>
            {done ? 'Survey complete ✓' : submitting ? 'typing…' : 'online'}
          </div>
        </div>
        {/* Icons */}
        <div style={{ display:'flex', gap:20, color: WA.subtext }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
        </div>
      </div>

      {/* ── Progress bar ── */}
      {!done && (
        <div style={{ height:3, background: WA.divider, flexShrink:0 }}>
          <div style={{ height:'100%', width:`${progress}%`, background: WA.accent, transition:'width 0.5s ease' }} />
        </div>
      )}

      {/* ── Chat background with WhatsApp pattern ── */}
      <div style={{
        flex:1, overflowY:'auto', padding:'12px 10px',
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
        backgroundSize: '20px 20px',
      }}>

        {/* Date chip */}
        <div style={{ textAlign:'center', margin:'8px 0 16px' }}>
          <span style={{ background:'rgba(17,27,33,0.8)', color: WA.subtext, fontSize:11, borderRadius:6, padding:'4px 10px' }}>
            {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
          </span>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} style={{
            display:'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 4,
            animation: 'fadeIn 0.2s ease'
          }}>
            {/* Bot bubble */}
            {msg.role === 'bot' && (
              <div style={{
                maxWidth:'80%',
                background: msg.isFollowUp ? WA.followUp : WA.incoming,
                borderRadius: '0px 10px 10px 10px',
                padding:'8px 12px 6px',
                boxShadow:'0 1px 2px rgba(0,0,0,0.3)',
                position:'relative',
              }}>
                {/* Tail */}
                <div style={{ position:'absolute', left:-8, top:0, width:0, height:0, borderTop:'8px solid ' + (msg.isFollowUp ? WA.followUp : WA.incoming), borderLeft:'8px solid transparent' }} />

                {msg.isFollowUp && (
                  <div style={{ fontSize:11, color: WA.accent, fontWeight:600, marginBottom:4 }}>
                    ↳ Follow-up
                  </div>
                )}
                {msg.questionNum && (
                  <div style={{ fontSize:10, color: WA.subtext, marginBottom:4 }}>
                    Question {msg.questionNum}
                  </div>
                )}
                <div style={{ color: WA.text, fontSize:14, lineHeight:1.5, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                  {renderText(msg.text)}
                </div>
                <div style={{ textAlign:'right', marginTop:4 }}>
                  <span style={{ fontSize:11, color: WA.subtext }}>{msg.time}</span>
                </div>
              </div>
            )}

            {/* User bubble */}
            {msg.role === 'user' && (
              <div style={{
                maxWidth:'80%',
                background: WA.outgoing,
                borderRadius:'10px 0px 10px 10px',
                padding:'8px 12px 6px',
                boxShadow:'0 1px 2px rgba(0,0,0,0.3)',
                position:'relative',
              }}>
                {/* Tail */}
                <div style={{ position:'absolute', right:-8, top:0, width:0, height:0, borderTop:'8px solid ' + WA.outgoing, borderRight:'8px solid transparent' }} />
                <div style={{ color: WA.text, fontSize:14, lineHeight:1.5, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                  {msg.text}
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:2, marginTop:4 }}>
                  <span style={{ fontSize:11, color: WA.subtext }}>{msg.time}</span>
                  <Ticks seen={seenMsgs[msg.id]} />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {submitting && (
          <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:4 }}>
            <div style={{ background: WA.incoming, borderRadius:'0px 10px 10px 10px', padding:'10px 14px', boxShadow:'0 1px 2px rgba(0,0,0,0.3)' }}>
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width:7, height:7, borderRadius:'50%',
                    background: WA.subtext,
                    animation:'pulse 1s infinite',
                    animationDelay:`${i*0.25}s`
                  }}/>
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── WhatsApp Input Bar ── */}
      {!done ? (
        <div style={{ background: WA.bg, padding:'8px 10px', flexShrink:0, borderTop:`1px solid ${WA.divider}` }}>
          {waitingFollowUp && (
            <div style={{ fontSize:11, color: WA.accent, marginBottom:6, paddingLeft:4 }}>
              ↳ Replying to follow-up
            </div>
          )}
          <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
            {/* Emoji icon */}
            <div style={{ color: WA.subtext, paddingBottom:10, flexShrink:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </div>
            {/* Text input */}
            <div style={{ flex:1, background: WA.header, borderRadius:24, padding:'8px 14px', display:'flex', alignItems:'center' }}>
              <textarea
                ref={inputRef}
                placeholder={waitingFollowUp ? "Reply to follow-up…" : "Message"}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleKey}
                disabled={submitting}
                rows={1}
                style={{
                  flex:1, background:'transparent', border:'none', outline:'none',
                  color: WA.text, fontSize:14, lineHeight:1.5, resize:'none',
                  fontFamily:"inherit", maxHeight:100, overflow:'auto',
                  '::placeholder': { color: WA.subtext }
                }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
              />
            </div>
            {/* Send / mic button */}
            <button
              onClick={inputVal.trim() ? sendAnswer : undefined}
              disabled={submitting}
              style={{
                width:44, height:44, borderRadius:'50%', border:'none',
                background: WA.accent, cursor: inputVal.trim() ? 'pointer' : 'default',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0, transition:'background 0.2s',
                opacity: submitting ? 0.6 : 1
              }}
            >
              {inputVal.trim() ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: WA.header, padding:'16px', textAlign:'center', flexShrink:0 }}>
          <div style={{ color: WA.accent, fontWeight:600, marginBottom:4 }}>Survey Complete ✓</div>
          <div style={{ color: WA.subtext, fontSize:13 }}>Thank you for your responses. You may close this tab.</div>
        </div>
      )}
    </div>
  );
}
