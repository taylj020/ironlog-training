import { useState, useEffect, useRef, useCallback } from "react";

// ── Google Fonts ──────────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&display=swap";
document.head.appendChild(fontLink);

// ── Globals ───────────────────────────────────────────────────────────────────
const ACCENT = "#e8ff47";
const BG = "#0d0d0d";
const SURFACE = "#161616";
const SURFACE2 = "#1f1f1f";
const BORDER = "#2a2a2a";
const TEXT = "#f0f0f0";
const MUTED = "#555";
const GREEN = "#4ade80";
const RED = "#f87171";

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; width: 100%; background: ${BG}; color: ${TEXT}; font-family: 'DM Mono', monospace; overflow-x: hidden; }
  :root { --accent: ${ACCENT}; --bg: ${BG}; --surface: ${SURFACE}; --surface2: ${SURFACE2}; --border: ${BORDER}; --text: ${TEXT}; --muted: ${MUTED}; --green: ${GREEN}; --red: ${RED}; }
  input, textarea, select { font-family: 'DM Mono', monospace; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; font-size: 14px; outline: none; width: 100%; }
  input:focus, textarea:focus, select:focus { border-color: var(--accent); }
  button { font-family: 'DM Mono', monospace; cursor: pointer; border: none; outline: none; }
  ::-webkit-scrollbar { width: 0; }
  .fade-in { animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .sheet-up { animation: sheetUp 0.25s cubic-bezier(0.32,0.72,0,1); }
  @keyframes sheetUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .set-row input { text-align: center; }
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
  .tab-content { padding: 16px; padding-top: max(16px, env(safe-area-inset-top)); padding-bottom: 100px; width: 100%; }
`;

// ── Storage helpers ───────────────────────────────────────────────────────────
const load = (key, fallback = null) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ── Default empty state ───────────────────────────────────────────────────────
const defaultProfile = {
  goal: "strength",
  programmeName: "",
  trainingDays: 4,
  injuries: "",
  aboutTraining: "",
  apiKey: "",
};

// ── Utility ───────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const uid = () => Math.random().toString(36).slice(2, 9);

// ── Claude API ────────────────────────────────────────────────────────────────
async function callClaude(apiKey, systemPrompt, userMessage) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.content.map(b => b.text || "").join("");
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Icon set (inline SVG) ─────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const paths = {
    dumbbell: "M6.5 6.5h1v11h-1V6.5zM16.5 6.5h1v11h-1V6.5zM2 10.5h5v3H2v-3zM17 10.5h5v3h-5v-3zM8 9h8v6H8V9z",
    chart: "M4 20V8l5 5 4-7 5 8",
    history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
    check: "M5 13l4 4L19 7",
    plus: "M12 5v14M5 12h14",
    minus: "M5 12h14",
    x: "M18 6L6 18M6 6l12 12",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    chevronDown: "M19 9l-7 7-7-7",
    chevronUp: "M5 15l7-7 7 7",
    weight: "M12 3a3 3 0 100 6 3 3 0 000-6zM6.5 10h11l1 11h-13l1-11z",
    sparkle: "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z",
    loader: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
};

// ── Tag ───────────────────────────────────────────────────────────────────────
const Tag = ({ children, color = ACCENT }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 500, letterSpacing: 1, textTransform: "uppercase" }}>{children}</span>
);

// ── Button ────────────────────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = "primary", disabled, style = {}, size = "md" }) => {
  const base = { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, fontFamily: "'DM Mono', monospace", fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "all 0.15s", border: "none", ...style };
  const sizes = { sm: { padding: "6px 12px", fontSize: 12 }, md: { padding: "10px 16px", fontSize: 13 }, lg: { padding: "14px 20px", fontSize: 14 } };
  const variants = {
    primary: { background: ACCENT, color: "#000" },
    ghost: { background: "transparent", color: TEXT, border: `1px solid ${BORDER}` },
    danger: { background: RED + "22", color: RED, border: `1px solid ${RED}44` },
    accent: { background: ACCENT + "15", color: ACCENT, border: `1px solid ${ACCENT}33` },
  };
  return <button style={{ ...base, ...sizes[size], ...variants[variant] }} onClick={disabled ? undefined : onClick}>{children}</button>;
};

// ── Card ──────────────────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, ...style }}>{children}</div>
);

// ── Section label ─────────────────────────────────────────────────────────────
const Label = ({ children }) => (
  <div style={{ fontSize: 10, letterSpacing: 2, color: MUTED, textTransform: "uppercase", marginBottom: 8 }}>{children}</div>
);

// ── Divider ───────────────────────────────────────────────────────────────────
const Divider = () => <div style={{ borderTop: `1px solid ${BORDER}`, margin: "12px 0" }} />;

// ── Spinner ───────────────────────────────────────────────────────────────────
const Spinner = ({ size = 18 }) => (
  <svg className="spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

// ── NumInput (tap-friendly) ───────────────────────────────────────────────────
const NumInput = ({ value, onChange, placeholder, style = {} }) => (
  <input
    type="text"
    inputMode="decimal"
    value={value === 0 || value === "0" || value === null || value === undefined ? "" : value}
    placeholder={placeholder}
    onChange={e => onChange(e.target.value)}
    style={{ textAlign: "center", fontSize: 15, padding: "8px 4px", minWidth: 0, ...style }}
  />
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SessionTab({ programme, profile, sessions, onSaveSession }) {
  const [picked, setPicked] = useState(null); // selected session template
  const [activeSession, setActiveSession] = useState(null); // live session data
  const [tweak, setTweak] = useState(null); // { exerciseIdx, exerciseName, sets }
  const [tweakResult, setTweakResult] = useState(null);
  const [tweakLoading, setTweakLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const startSession = async (template) => {
    if (!profile.apiKey) {
      // start without AI
      const sess = buildLiveSession(template, null);
      setActiveSession(sess);
      return;
    }
    setGenerating(true);
    // find last session of this type
    const lastSess = [...sessions].reverse().find(s => s.templateId === template.id);
    let aiTargets = null;
    try {
      const systemPrompt = `You are a strength coach assistant. Given a user's last session and profile, return ONLY a JSON array of exercise targets (one per exercise). Each item: { "exerciseIdx": number, "sets": number, "reps": string, "weight": number }. Be conservative with progressions. No extra text.`;
      const userMsg = `Profile: ${JSON.stringify({ goal: profile.goal, injuries: profile.injuries, about: profile.aboutTraining })}\nSession template: ${JSON.stringify(template)}\nLast session of this type: ${lastSess ? JSON.stringify(lastSess) : "None — first time"}\nReturn JSON array only.`;
      const raw = await callClaude(profile.apiKey, systemPrompt, userMsg);
      const cleaned = raw.replace(/```json|```/g, "").trim();
      aiTargets = JSON.parse(cleaned);
    } catch (e) { /* silently fallback */ }
    setGenerating(false);
    setActiveSession(buildLiveSession(template, aiTargets));
  };

  const buildLiveSession = (template, aiTargets) => ({
    id: uid(),
    templateId: template.id,
    templateName: template.name,
    date: today(),
    aiAdjusted: false,
    exercises: template.exercises.map((ex, idx) => {
      const ai = aiTargets?.find(a => a.exerciseIdx === idx);
      const numSets = ai?.sets || parseInt(ex.sets) || 1;
      // per-set reps: use ai override, or per-set array, or fallback to single value
      const setTargetReps = ex.setTargetReps && ex.setTargetReps.length === numSets
        ? ex.setTargetReps
        : Array.from({ length: numSets }, (_, si) => ai?.reps || ex.setTargetReps?.[si] || ex.targetReps || "");
      return {
        ...ex,
        sets: numSets,
        setTargetReps,
        targetWeight: ai?.weight || ex.startingWeight || 0,
        logs: Array.from({ length: numSets }, () => ({ kg: "", reps: "", rpe: "", done: false })),
        aiNote: ai ? "AI adjusted targets" : null,
      };
    }),
  });

  const updateLog = (exIdx, setIdx, field, val) => {
    setActiveSession(s => {
      const sess = JSON.parse(JSON.stringify(s));
      sess.exercises[exIdx].logs[setIdx][field] = val;
      return sess;
    });
  };

  const toggleSet = (exIdx, setIdx) => {
    setActiveSession(s => {
      const sess = JSON.parse(JSON.stringify(s));
      sess.exercises[exIdx].logs[setIdx].done = !sess.exercises[exIdx].logs[setIdx].done;
      return sess;
    });
  };

  const openTweak = (exIdx) => {
    setTweak({ exIdx, exerciseName: activeSession.exercises[exIdx].name, logs: activeSession.exercises[exIdx].logs, target: activeSession.exercises[exIdx] });
    setTweakResult(null);
  };

  const submitTweak = async (reason) => {
    if (!profile.apiKey) { setTweak(null); return; }
    setTweakLoading(true);
    const ex = activeSession.exercises[tweak.exIdx];
    try {
      const systemPrompt = `You are a strength coach. Given a mid-session issue, return a JSON object: { "explanation": "1-2 sentences", "adjustments": [{ "setIdx": number, "kg": number, "reps": string }] }. Be practical. No extra text.`;
      const userMsg = `Exercise: ${ex.name}\nTarget: ${ex.targetSets || ex.sets} sets × ${ex.targetReps} reps @ ${ex.targetWeight}kg\nLogged so far: ${JSON.stringify(ex.logs)}\nReason: ${reason}\nProfile context: ${profile.injuries || "none"}\nReturn JSON only.`;
      const raw = await callClaude(profile.apiKey, systemPrompt, userMsg);
      const cleaned = raw.replace(/```json|```/g, "").trim();
      setTweakResult(JSON.parse(cleaned));
    } catch (e) { setTweakResult({ explanation: "Could not reach AI. Adjust manually.", adjustments: [] }); }
    setTweakLoading(false);
  };

  const applyTweak = () => {
    if (!tweakResult) return;
    setActiveSession(s => {
      const sess = JSON.parse(JSON.stringify(s));
      sess.aiAdjusted = true;
      tweakResult.adjustments.forEach(a => {
        if (sess.exercises[tweak.exIdx].logs[a.setIdx]) {
          if (a.kg) sess.exercises[tweak.exIdx].logs[a.setIdx].kg = a.kg;
          if (a.reps) sess.exercises[tweak.exIdx].targetReps = a.reps;
        }
      });
      return sess;
    });
    setTweak(null);
  };

  const finishSession = () => {
    onSaveSession(activeSession);
    setActiveSession(null);
    setPicked(null);
  };

  const completedSets = activeSession ? activeSession.exercises.reduce((n, ex) => n + ex.logs.filter(l => l.done).length, 0) : 0;
  const totalSets = activeSession ? activeSession.exercises.reduce((n, ex) => n + ex.logs.length, 0) : 0;

  // ── Pick session screen ───────────────────────────────────────────────────
  if (!activeSession) {
    return (
      <div style={{ padding: "16px 16px 100px", width: "100%" }} className="fade-in">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 36, color: ACCENT, letterSpacing: 2 }}>IRONLOG</span>
          {generating && <Spinner />}
        </div>

        {/* Pick session */}
        <Label>Select Today's Session</Label>
        {programme.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 32 }}>
            <div style={{ color: MUTED, marginBottom: 12 }}>No sessions yet.</div>
            <div style={{ color: MUTED, fontSize: 12 }}>Go to Profile → My Programme to build your programme.</div>
          </Card>
        ) : (
          programme.map(tmpl => (
            <div
              key={tmpl.id}
              onClick={() => !generating && startSession(tmpl)}
              style={{ width: "100%", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 10, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", WebkitTapHighlightColor: "transparent", userSelect: "none" }}
            >
              <div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 1 }}>{tmpl.name}</div>
                <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{tmpl.exercises.length} exercises</div>
              </div>
              <div style={{ color: ACCENT, flexShrink: 0 }}><Icon name="zap" size={20} color={ACCENT} /></div>
            </div>
          ))
        )}
      </div>
    );
  }

  // ── Active session screen ─────────────────────────────────────────────────
  return (
    <div style={{ padding: "16px 16px 100px", width: "100%" }} className="fade-in">
      {/* Banner */>
      <div style={{ background: ACCENT + "15", border: `1px solid ${ACCENT}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: ACCENT, letterSpacing: 1 }}>{activeSession.templateName}</div>
          <div style={{ fontSize: 11, color: MUTED }}>{completedSets}/{totalSets} sets done</div>
        </div>
        <Btn onClick={finishSession} variant="primary" size="sm">Finish</Btn>
      </div>

      {activeSession.exercises.map((ex, exIdx) => {
        const allDone = ex.logs.every(l => l.done);
        return (
          <Card key={exIdx} style={{ marginBottom: 12, borderColor: allDone ? GREEN + "55" : BORDER }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 0.5 }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: MUTED }}>
                  {ex.sets} sets @ {ex.targetWeight}kg
                  {ex.setTargetReps?.every(r => r === ex.setTargetReps[0]) && ex.setTargetReps[0]
                    ? ` · ${ex.setTargetReps[0]} reps`
                    : ""}
                </div>
                {ex.aiNote && <div style={{ fontSize: 10, color: ACCENT, marginTop: 2 }}>⚡ {ex.aiNote}</div>}
              </div>
              {allDone && <Icon name="check" color={GREEN} />}
            </div>

            {/* Set header */}
            <div style={{ display: "grid", gridTemplateColumns: "20px 1fr 1fr 1fr 32px", gap: 6, marginBottom: 6, alignItems: "center" }}>
              {["#", "KG", "REPS", "RPE", "✓"].map(h => (
                <div key={h} style={{ fontSize: 9, color: MUTED, textAlign: "center", letterSpacing: 1 }}>{h}</div>
              ))}
            </div>

            {ex.logs.map((log, setIdx) => {
              const targetReps = ex.setTargetReps?.[setIdx] || "";
              return (
                <div key={setIdx} style={{ display: "grid", gridTemplateColumns: "20px 1fr 1fr 1fr 32px", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <div style={{ fontSize: 11, color: log.done ? ACCENT : MUTED, textAlign: "center", fontWeight: 500 }}>{setIdx + 1}</div>
                  <NumInput value={log.kg} onChange={v => updateLog(exIdx, setIdx, "kg", v)} placeholder={String(ex.targetWeight || "")} />
                  <input
                    inputMode="text"
                    value={log.reps}
                    placeholder={targetReps || "—"}
                    onChange={e => updateLog(exIdx, setIdx, "reps", e.target.value)}
                    style={{ textAlign: "center", fontSize: 13, padding: "8px 4px", minWidth: 0, background: SURFACE2, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 6, outline: "none", width: "100%", fontFamily: "'DM Mono', monospace" }}
                  />
                  <NumInput value={log.rpe} onChange={v => updateLog(exIdx, setIdx, "rpe", v)} placeholder="7" />
                  <button
                    onClick={() => toggleSet(exIdx, setIdx)}
                    style={{ width: 32, height: 32, borderRadius: 6, border: `2px solid ${log.done ? GREEN : BORDER}`, background: log.done ? GREEN + "22" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                  >
                    {log.done && <Icon name="check" size={14} color={GREEN} />}
                  </button>
                </div>
              );
            })}

            <Divider />
            <Btn onClick={() => openTweak(exIdx)} variant="ghost" size="sm" style={{ width: "100%", color: ACCENT, borderColor: ACCENT + "44", fontSize: 11 }}>
              <Icon name="zap" size={13} color={ACCENT} /> Missed reps — adjust next sets
            </Btn>
          </Card>
        );
      })}

      {/* AI Tweak overlay */}
      {tweak && (
        <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 100, display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) setTweak(null); }}>
          <div className="sheet-up" style={{ width: "100%", background: SURFACE, borderRadius: "20px 20px 0 0", padding: 24, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ width: 36, height: 4, background: BORDER, borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 1, marginBottom: 4 }}>AI TWEAK</div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>{tweak.exerciseName}</div>

            {!tweakResult && !tweakLoading && (
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  "Hit fewer reps than target",
                  "Felt too easy — could do more",
                  "Something felt off (fatigue / form)",
                  "Skipping this exercise today",
                ].map(reason => (
                  <Btn key={reason} variant="ghost" onClick={() => submitTweak(reason)} style={{ justifyContent: "flex-start", width: "100%" }}>{reason}</Btn>
                ))}
              </div>
            )}

            {tweakLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: MUTED, padding: "20px 0" }}>
                <Spinner /> Consulting coach...
              </div>
            )}

            {tweakResult && !tweakLoading && (
              <div className="fade-in">
                <Card style={{ marginBottom: 16, borderColor: ACCENT + "44" }}>
                  <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{tweakResult.explanation}</div>
                  {tweakResult.adjustments.map((a, i) => (
                    <div key={i} style={{ fontSize: 12, color: ACCENT, marginBottom: 4 }}>
                      Set {a.setIdx + 1}: <span style={{ color: MUTED, textDecoration: "line-through" }}>was</span> → {a.kg ? `${a.kg}kg` : ""} {a.reps ? `× ${a.reps}` : ""}
                    </div>
                  ))}
                </Card>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Btn variant="ghost" onClick={() => setTweak(null)}>Keep original</Btn>
                  <Btn variant="primary" onClick={applyTweak}>Apply adjustment</Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHT LOG TAB
// ── Inline SVG Line Chart ─────────────────────────────────────────────────────
function LineChart({ points, width = 600, height = 120 }) {
  if (points.length < 2) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 12 }}>
        Not enough data for this period
      </div>
    );
  }

  const PAD = { top: 12, right: 8, bottom: 24, left: 36 };
  const W = width - PAD.left - PAD.right;
  const H = height - PAD.top - PAD.bottom;

  const vals = points.map(p => p.v);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;

  const sx = (i) => PAD.left + (i / (points.length - 1)) * W;
  const sy = (v) => PAD.top + H - ((v - minV) / range) * H;

  // Build smooth polyline path
  const pathD = points.map((p, i) => {
    const x = sx(i), y = sy(p.v);
    if (i === 0) return `M ${x} ${y}`;
    const px = sx(i - 1), py = sy(points[i - 1].v);
    const cx = (px + x) / 2;
    return `C ${cx} ${py}, ${cx} ${y}, ${x} ${y}`;
  }).join(" ");

  // Fill area under line
  const fillD = pathD + ` L ${sx(points.length - 1)} ${PAD.top + H} L ${sx(0)} ${PAD.top + H} Z`;

  // Y axis labels (3 ticks)
  const yTicks = [minV, minV + range / 2, maxV];

  // X axis labels — pick ~5 evenly spaced
  const xStep = Math.max(1, Math.floor(points.length / 5));
  const xLabels = points.filter((_, i) => i % xStep === 0 || i === points.length - 1);

  const gradId = "lgfill";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height, overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.25" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={sy(tick)} x2={PAD.left + W} y2={sy(tick)} stroke={BORDER} strokeWidth="1" />
          <text x={PAD.left - 4} y={sy(tick) + 4} textAnchor="end" fontSize="9" fill={MUTED} fontFamily="DM Mono, monospace">{tick.toFixed(1)}</text>
        </g>
      ))}

      {/* Fill */}
      <path d={fillD} fill={`url(#${gradId})`} />

      {/* Line */}
      <path d={pathD} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={sx(i)} cy={sy(p.v)} r="3" fill={p.isToday ? ACCENT : BG} stroke={ACCENT} strokeWidth="1.5" />
      ))}

      {/* X labels */}
      {xLabels.map((p, i) => {
        const idx = points.indexOf(p);
        return (
          <text key={i} x={sx(idx)} y={height - 4} textAnchor="middle" fontSize="9" fill={p.isToday ? ACCENT : MUTED} fontFamily="DM Mono, monospace">{p.label}</text>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
function WeightTab() {
  const [bwLog, setBwLog] = useState(() => load("bw_log", {}));
  const [input, setInput] = useState(() => load("bw_log", {})[today()] || "");
  const [period, setPeriod] = useState("week"); // week | month | 3m | 6m

  const logWeight = (val) => {
    setInput(val);
    const updated = { ...bwLog, [today()]: val };
    setBwLog(updated);
    save("bw_log", updated);
  };

  const entries = Object.entries(bwLog).sort((a, b) => b[0].localeCompare(a[0]));
  const last7 = entries.slice(0, 7);
  const prevWeek = entries.slice(7, 14);
  const avg = (arr) => {
    const valid = arr.filter(([, v]) => v && parseFloat(v) > 0);
    return valid.length ? (valid.reduce((s, [, v]) => s + parseFloat(v), 0) / valid.length).toFixed(1) : "--";
  };

  // Build chart points for selected period
  const periodDays = { week: 7, month: 30, "3m": 90, "6m": 180 };
  const days = periodDays[period];

  const chartPoints = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    const val = bwLog[key];
    const label = period === "week"
      ? d.toLocaleDateString("en-GB", { weekday: "short" })
      : period === "month"
        ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return val ? { key, v: parseFloat(val), label, isToday: key === today() } : null;
  }).filter(Boolean);

  const PERIODS = [
    { key: "week", label: "1W" },
    { key: "month", label: "1M" },
    { key: "3m", label: "3M" },
    { key: "6m", label: "6M" },
  ];

  return (
    <div style={{ padding: "16px 16px 100px", width: "100%", boxSizing: "border-box" }} className="fade-in">
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 2, marginBottom: 16 }}>WEIGHT LOG</div>

      {/* Input */}
      <Card style={{ marginBottom: 16 }}>
        <Label>Today — {fmt(today())}</Label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <NumInput value={input} onChange={logWeight} placeholder="0.0" style={{ flex: 1, fontSize: 28, fontFamily: "'Bebas Neue'", color: ACCENT }} />
          <span style={{ color: MUTED }}>kg</span>
        </div>
      </Card>

      {/* Avg stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Card>
          <Label>7-Day Average</Label>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: ACCENT }}>{avg(last7)}<span style={{ fontSize: 14, color: MUTED }}> kg</span></div>
        </Card>
        <Card>
          <Label>Prev Week Avg</Label>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: TEXT }}>{avg(prevWeek)}<span style={{ fontSize: 14, color: MUTED }}> kg</span></div>
        </Card>
      </div>

      {/* Line chart */}
      <Card style={{ marginBottom: 16 }}>
        {/* Period toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Label>Trend</Label>
          <div style={{ display: "flex", gap: 4 }}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 5,
                  fontSize: 11,
                  fontFamily: "'DM Mono', monospace",
                  border: `1px solid ${period === p.key ? ACCENT : BORDER}`,
                  background: period === p.key ? ACCENT + "20" : "transparent",
                  color: period === p.key ? ACCENT : MUTED,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >{p.label}</button>
            ))}
          </div>
        </div>
        <LineChart points={chartPoints} height={130} />
      </Card>

      {/* Full log */}
      <Label>Full Log</Label>
      {entries.length === 0 ? (
        <Card style={{ textAlign: "center", color: MUTED, padding: 24, fontSize: 12 }}>No weights logged yet.</Card>
      ) : (
        entries.map(([date, val]) => (
          <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ color: MUTED, fontSize: 13 }}>{fmt(date)}{date === today() ? <span style={{ color: ACCENT }}> · today</span> : ""}</span>
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: TEXT }}>{val} <span style={{ fontSize: 12, color: MUTED }}>kg</span></span>
          </div>
        ))
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY TAB
// ═══════════════════════════════════════════════════════════════════════════════
function HistoryTab({ sessions, profile, onUpdateSession }) {
  const [expanded, setExpanded] = useState(null);
  const [generating, setGenerating] = useState(null); // session id being generated

  const generateNext = async (sess) => {
    if (!profile.apiKey) { alert("Add your Claude API key in Profile first."); return; }
    setGenerating(sess.id);
    try {
      const systemPrompt = `You are a strength coach. Given a completed session, suggest targets for the NEXT session of the same type. Return JSON: { "sessionName": string, "exercises": [{ "name": string, "sets": number, "targetReps": string, "suggestedWeight": number, "note": string }] }. Be brief. No extra text.`;
      const userMsg = `Profile: goal=${profile.goal}, injuries=${profile.injuries || "none"}, about=${profile.aboutTraining || "not set"}\nCompleted session: ${JSON.stringify(sess)}\nReturn JSON only.`;
      const raw = await callClaude(profile.apiKey, systemPrompt, userMsg);
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const result = JSON.parse(cleaned);
      onUpdateSession(sess.id, { nextSession: result });
    } catch (e) {
      alert("Could not generate next session. Check your API key and connection.");
    }
    setGenerating(null);
  };

  if (sessions.length === 0) {
    return (
      <div style={{ padding: "16px 16px 100px", width: "100%" }} className="fade-in">
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 2, marginBottom: 24 }}>HISTORY</div>
        <Card style={{ textAlign: "center", padding: 40 }}>
          <Icon name="history" size={32} color={MUTED} />
          <div style={{ color: MUTED, marginTop: 12, fontSize: 13 }}>No sessions logged yet.<br />Start a session to build your history.</div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 16px 100px", width: "100%" }} className="fade-in">
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 2, marginBottom: 16 }}>HISTORY</div>
      {[...sessions].reverse().map(sess => {
        const isOpen = expanded === sess.id;
        return (
          <Card key={sess.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : sess.id)}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 0.5 }}>{sess.templateName}</span>
                  {sess.aiAdjusted && <Tag color={ACCENT}>AI Adjusted</Tag>}
                </div>
                <div style={{ fontSize: 11, color: MUTED }}>{fmt(sess.date)} · {sess.exercises.length} exercises</div>
              </div>
              <Icon name={isOpen ? "chevronUp" : "chevronDown"} size={16} color={MUTED} />
            </div>

            {isOpen && (
              <div className="fade-in">
                <Divider />
                {sess.exercises.map((ex, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{ex.name}</div>
                    {ex.logs.map((log, si) => {
                      const targetReps = ex.setTargetReps?.[si] || ex.targetReps || "";
                      return (
                        <div key={si} style={{ display: "flex", gap: 10, fontSize: 11, color: log.done ? TEXT : MUTED, marginBottom: 2 }}>
                          <span style={{ color: MUTED }}>#{si + 1}</span>
                          <span>{log.kg || "--"} kg</span>
                          <span>× {log.reps || "--"}{targetReps && log.reps !== targetReps ? <span style={{ color: MUTED }}> / {targetReps} tgt</span> : ""}</span>
                          {log.rpe && <span style={{ color: MUTED }}>RPE {log.rpe}</span>}
                          {log.done && <span style={{ color: GREEN }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {sess.nextSession && (
                  <div style={{ marginTop: 12 }}>
                    <Card style={{ borderColor: ACCENT + "44", background: ACCENT + "08" }}>
                      <div style={{ fontSize: 11, color: ACCENT, marginBottom: 8, letterSpacing: 1 }}>⚡ NEXT SESSION PLAN</div>
                      {sess.nextSession.exercises.map((ex, i) => (
                        <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: TEXT }}>{ex.name}</span>
                          <span style={{ color: MUTED }}> — {ex.sets}×{ex.targetReps} @ {ex.suggestedWeight}kg</span>
                          {ex.note && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{ex.note}</div>}
                        </div>
                      ))}
                    </Card>
                  </div>
                )}

                <Btn
                  variant="accent"
                  size="sm"
                  style={{ width: "100%", marginTop: 12 }}
                  onClick={() => generateNext(sess)}
                  disabled={!!generating}
                >
                  {generating === sess.id ? <><Spinner size={14} /> Generating...</> : <><Icon name="sparkle" size={14} color={ACCENT} /> Generate Next Session</>}
                </Btn>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE TAB
// ═══════════════════════════════════════════════════════════════════════════════
function ProfileTab({ profile, setProfile, programme, setProgramme }) {
  const [editingSession, setEditingSession] = useState(null); // null | "new" | session obj
  const [showApiKey, setShowApiKey] = useState(false);

  const updateProfile = (field, val) => {
    const updated = { ...profile, [field]: val };
    setProfile(updated);
    save("profile", updated);
  };

  // ── Programme builder ─────────────────────────────────────────────────────
  const saveSession = (sess) => {
    let updated;
    if (sess.id && programme.find(s => s.id === sess.id)) {
      updated = programme.map(s => s.id === sess.id ? sess : s);
    } else {
      updated = [...programme, { ...sess, id: uid() }];
    }
    setProgramme(updated);
    save("programme", updated);
    setEditingSession(null);
  };

  const deleteSession = (id) => {
    const updated = programme.filter(s => s.id !== id);
    setProgramme(updated);
    save("programme", updated);
  };

  if (editingSession !== null) {
    return <SessionEditor sess={editingSession === "new" ? { name: "", exercises: [] } : editingSession} onSave={saveSession} onCancel={() => setEditingSession(null)} />;
  }

  return (
    <div style={{ padding: "16px 16px 100px", width: "100%" }} className="fade-in">
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 2, marginBottom: 16 }}>PROFILE</div>

      {/* Goal */}
      <Card style={{ marginBottom: 12 }}>
        <Label>Training Goal</Label>
        <select value={profile.goal} onChange={e => updateProfile("goal", e.target.value)}>
          {["strength", "hypertrophy", "cut", "bulk", "recomp", "endurance"].map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
        </select>
      </Card>

      {/* Programme name + days */}
      <Card style={{ marginBottom: 12 }}>
        <Label>Programme Name</Label>
        <input value={profile.programmeName} onChange={e => updateProfile("programmeName", e.target.value)} placeholder="e.g. Upper/Lower Split" style={{ marginBottom: 10 }} />
        <Label>Training Days / Week</Label>
        <div style={{ display: "flex", gap: 6 }}>
          {[3, 4, 5, 6].map(n => (
            <button key={n} onClick={() => updateProfile("trainingDays", n)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: `1px solid ${profile.trainingDays === n ? ACCENT : BORDER}`, background: profile.trainingDays === n ? ACCENT + "20" : "transparent", color: profile.trainingDays === n ? ACCENT : MUTED, fontFamily: "'DM Mono'", fontSize: 14, cursor: "pointer" }}>{n}</button>
          ))}
        </div>
      </Card>

      {/* Injuries */}
      <Card style={{ marginBottom: 12 }}>
        <Label>Injuries / Limitations</Label>
        <textarea value={profile.injuries} onChange={e => updateProfile("injuries", e.target.value)} placeholder="e.g. Left shoulder impingement — avoid overhead pressing" rows={2} style={{ resize: "none" }} />
      </Card>

      {/* About */}
      <Card style={{ marginBottom: 12 }}>
        <Label>About My Training</Label>
        <textarea value={profile.aboutTraining} onChange={e => updateProfile("aboutTraining", e.target.value)} placeholder="e.g. 4 years lifting, mainly powerlifting focus, train at a commercial gym, no belt yet" rows={3} style={{ resize: "none" }} />
      </Card>

      {/* API Key */}
      <Card style={{ marginBottom: 20 }}>
        <Label>Claude API Key</Label>
        <div style={{ display: "flex", gap: 8 }}>
          <input type={showApiKey ? "text" : "password"} value={profile.apiKey} onChange={e => updateProfile("apiKey", e.target.value)} placeholder="sk-ant-..." style={{ flex: 1 }} />
          <button onClick={() => setShowApiKey(s => !s)} style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "0 10px", color: MUTED, cursor: "pointer" }}>
            {showApiKey ? "Hide" : "Show"}
          </button>
        </div>
        <div style={{ fontSize: 10, color: MUTED, marginTop: 6 }}>Stored locally on device only. Never sent anywhere except Anthropic.</div>
      </Card>

      {/* Programme builder */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Label>My Programme</Label>
        <Btn variant="accent" size="sm" onClick={() => setEditingSession("new")}><Icon name="plus" size={13} color={ACCENT} /> New Session</Btn>
      </div>

      {programme.length === 0 ? (
        <Card style={{ textAlign: "center", color: MUTED, padding: 24, fontSize: 12 }}>
          No sessions yet. Tap "New Session" to build your programme.
        </Card>
      ) : (
        programme.map(sess => (
          <Card key={sess.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 0.5 }}>{sess.name}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{sess.exercises.length} exercises</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="ghost" size="sm" onClick={() => setEditingSession(sess)}><Icon name="edit" size={13} /></Btn>
                <Btn variant="danger" size="sm" onClick={() => deleteSession(sess.id)}><Icon name="trash" size={13} /></Btn>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ── Session Editor ────────────────────────────────────────────────────────────
function SessionEditor({ sess, onSave, onCancel }) {
  const [name, setName] = useState(sess.name);
  const [exercises, setExercises] = useState(() =>
    (sess.exercises || []).map(ex => ({
      ...ex,
      // migrate old single-targetReps to per-set array
      setTargetReps: ex.setTargetReps || Array.from({ length: ex.sets || 3 }, () => ex.targetReps || ""),
    }))
  );

  const addEx = () => setExercises(ex => [...ex, { id: uid(), name: "", sets: "", startingWeight: "", setTargetReps: [] }]);

  const updateEx = (idx, field, val) => setExercises(ex => ex.map((e, i) => i === idx ? { ...e, [field]: val } : e));

  const updateSetCount = (idx, newCount) => {
    const n = newCount === "" ? "" : Math.max(1, parseInt(newCount) || 1);
    setExercises(ex => ex.map((e, i) => {
      if (i !== idx) return e;
      if (n === "") return { ...e, sets: "", setTargetReps: [] };
      const current = e.setTargetReps || [];
      const updated = Array.from({ length: n }, (_, si) => current[si] ?? "");
      return { ...e, sets: n, setTargetReps: updated };
    }));
  };

  const updateSetReps = (exIdx, setIdx, val) => {
    setExercises(ex => ex.map((e, i) => {
      if (i !== exIdx) return e;
      const updated = [...(e.setTargetReps || [])];
      updated[setIdx] = val;
      return { ...e, setTargetReps: updated };
    }));
  };

  const removeEx = (idx) => setExercises(ex => ex.filter((_, i) => i !== idx));

  const moveEx = (idx, dir) => {
    const next = [...exercises];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setExercises(next);
  };

  return (
    <div style={{ padding: "16px 16px 100px", width: "100%" }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 4 }}>
          <Icon name="x" size={20} />
        </button>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 1 }}>
          {sess.id ? "Edit Session" : "New Session"}
        </div>
      </div>

      <Card style={{ marginBottom: 14 }}>
        <Label>Session Name</Label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Upper A, Push Day, Legs" />
      </Card>

      <Label>Exercises</Label>

      {exercises.map((ex, idx) => (
        <Card key={ex.id || idx} style={{ marginBottom: 10 }}>
          {/* Exercise header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: MUTED, fontSize: 12 }}>Exercise {idx + 1}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => moveEx(idx, -1)} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer" }}><Icon name="chevronUp" size={14} /></button>
              <button onClick={() => moveEx(idx, 1)} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer" }}><Icon name="chevronDown" size={14} /></button>
              <button onClick={() => removeEx(idx)} style={{ background: "none", border: "none", color: RED, cursor: "pointer" }}><Icon name="x" size={14} /></button>
            </div>
          </div>

          {/* Exercise name */}
          <input value={ex.name} onChange={e => updateEx(idx, "name", e.target.value)} placeholder="Exercise name (e.g. Squat)" style={{ marginBottom: 10 }} />

          {/* Sets + Start kg */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <Label>Sets</Label>
              <NumInput value={ex.sets} onChange={v => updateSetCount(idx, v)} placeholder="e.g. 4" />
            </div>
            <div>
              <Label>Start kg</Label>
              <NumInput value={ex.startingWeight} onChange={v => updateEx(idx, "startingWeight", v === "" ? "" : (parseFloat(v) || ""))} placeholder="60" />
            </div>
          </div>

          {/* Per-set target reps */}
          <Label>Target Reps Per Set</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(ex.setTargetReps || []).map((reps, si) => (
              <div key={si} style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 11, color: MUTED, textAlign: "center" }}>S{si + 1}</div>
                <input
                  value={reps}
                  onChange={e => updateSetReps(idx, si, e.target.value)}
                  placeholder="e.g. 5, 8-10, AMRAP"
                  style={{ fontSize: 13 }}
                />
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Btn variant="ghost" onClick={addEx} style={{ width: "100%", marginBottom: 16 }}>
        <Icon name="plus" size={14} /> Add Exercise
      </Btn>

      <Btn variant="primary" onClick={() => onSave({ ...sess, name, exercises })} style={{ width: "100%" }} disabled={!name.trim()}>
        Save Session
      </Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState(0);
  const [profile, setProfile] = useState(() => load("profile", defaultProfile));
  const [programme, setProgramme] = useState(() => load("programme", []));
  const [sessions, setSessions] = useState(() => load("sessions", []));

  const saveSession = (sess) => {
    const updated = [...sessions, sess];
    setSessions(updated);
    save("sessions", updated);
    setTab(2);
  };

  const updateSession = (id, patch) => {
    const updated = sessions.map(s => s.id === id ? { ...s, ...patch } : s);
    setSessions(updated);
    save("sessions", updated);
  };

  const tabs = [
    { label: "Session", icon: "dumbbell" },
    { label: "Weight", icon: "weight" },
    { label: "History", icon: "history" },
    { label: "Profile", icon: "user" },
  ];

  return (
    <>
      <style>{css}</style>
      <div style={{ height: "100%", display: "flex", flexDirection: "column", width: "100%", position: "relative" }}>
        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", width: "100%" }}>
          {tab === 0 && <SessionTab programme={programme} profile={profile} sessions={sessions} onSaveSession={saveSession} />}
          {tab === 1 && <WeightTab />}
          {tab === 2 && <HistoryTab sessions={sessions} profile={profile} onUpdateSession={updateSession} />}
          {tab === 3 && <ProfileTab profile={profile} setProfile={setProfile} programme={programme} setProgramme={setProgramme} />}
        </div>

        {/* Bottom nav */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, width: "100%", background: SURFACE, borderTop: `1px solid ${BORDER}`, display: "flex", zIndex: 50, paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ flex: 1, padding: "12px 4px 10px", background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", color: tab === i ? ACCENT : MUTED, transition: "color 0.15s" }}>
              <Icon name={t.icon} size={20} color={tab === i ? ACCENT : MUTED} />
              <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
