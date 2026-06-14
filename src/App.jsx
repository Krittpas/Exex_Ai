import { useState, useEffect, useCallback, memo } from "react";
import { Calendar, CheckSquare, Plus, Trash2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "./lib/supabase";

const C = {
  bg: "#080D1A", surface: "#0F172A", surfaceAlt: "#1A2235",
  border: "rgba(99,102,241,0.14)", accent: "#6366F1", accentDim: "rgba(99,102,241,0.13)",
  cyan: "#22D3EE", amber: "#FBBF24", green: "#34D399", red: "#F87171",
  text: "#E2E8F0", muted: "#64748B", dim: "#374151",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
};

const CATS = {
  school:      { label: "📚 โรงเรียน", color: "#818CF8", bg: "rgba(129,140,248,0.12)" },
  competition: { label: "🏆 แข่งขัน",  color: "#FBBF24", bg: "rgba(251,191,36,0.12)"  },
  project:     { label: "⚡️ โปรเจกต์", color: "#22D3EE", bg: "rgba(34,211,238,0.12)"  },
  meeting:     { label: "🤝 ประชุม",    color: "#F472B6", bg: "rgba(244,114,182,0.12)"  },
  camp:        { label: "🏕️ ค่าย",     color: "#FB923C", bg: "rgba(251,146,60,0.12)"   },
  personal:    { label: "🌿 ส่วนตัว",  color: "#34D399", bg: "rgba(52,211,153,0.12)"   },
  other:       { label: "📎 อื่นๆ",    color: "#94A3B8", bg: "rgba(148,163,184,0.12)"  },
};

const PRIS = {
  high:   { label: "🔴 สูง",  color: "#F87171", bg: "rgba(248,113,113,0.12)" },
  medium: { label: "🟡 กลาง", color: "#FBBF24", bg: "rgba(251,191,36,0.12)"  },
  low:    { label: "🟢 ต่ำ",  color: "#34D399", bg: "rgba(52,211,153,0.12)"   },
};

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

const inp  = (x={}) => ({ background:"rgba(15,23,42,.9)", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:14, color:C.text, fontFamily:"inherit", outline:"none", width:"100%", transition:"border-color .15s", ...x });
const card = (x={}) => ({ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:16, ...x });
const tag  = (color, bg) => ({ fontSize:11, padding:"2px 9px", borderRadius:999, fontWeight:500, color, background:bg });
const btn  = (v="primary", x={}) => ({
  display:"inline-flex", alignItems:"center", gap:6, padding:"8px 15px",
  borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", border:"none",
  fontFamily:"inherit", transition:"all .15s",
  ...(v==="primary" ? { background:C.accent, color:"#fff" }
    : v==="ghost"   ? { background:"transparent", color:C.muted, border:`1px solid ${C.border}` }
    : v==="danger"  ? { background:"rgba(248,113,113,.1)", color:C.red, border:"1px solid rgba(248,113,113,.2)" }
    : {}), ...x
});

/* map DB row → JS object */
const toEv = r => ({ id:r.id, date:r.date, hour:r.hour, endHour:r.end_hour, title:r.title, category:r.category });
const toTk = r => ({ id:r.id, title:r.title, priority:r.priority, category:r.category, due:r.due, completed:r.completed, createdAt:r.created_at });

/* ── Module-level forms — ไม่ถูก re-render จาก timer ── */

const AddEventForm = memo(({ defaultDate, onAdd, onCancel }) => {
  const [ev, setEv] = useState({ date: defaultDate, hour:"8", endHour:"9", title:"", category:"school" });

  const handleAdd = () => {
    if (!ev.title.trim()) return;
    onAdd({ date:ev.date, hour:+ev.hour, endHour:+ev.endHour, title:ev.title.trim(), category:ev.category });
  };

  return (
    <div style={{ ...card(), marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:".07em" }}>เพิ่มกิจกรรม</span>
        <span style={{ cursor:"pointer", color:C.muted, fontSize:18, lineHeight:1 }} onClick={onCancel}>×</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
        <input style={inp()} placeholder="ชื่อกิจกรรม..." value={ev.title}
          onChange={e => setEv(p => ({ ...p, title:e.target.value }))}
          onKeyDown={e => e.key === "Enter" && handleAdd()} autoFocus />
        <div>
          <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>วันที่</div>
          <input type="date" style={inp()} value={ev.date} onChange={e => setEv(p => ({ ...p, date:e.target.value }))} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div>
            <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>เริ่ม</div>
            <select style={inp()} value={ev.hour} onChange={e => setEv(p => ({ ...p, hour:e.target.value }))}>
              {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>สิ้นสุด</div>
            <select style={inp()} value={ev.endHour} onChange={e => setEv(p => ({ ...p, endHour:e.target.value }))}>
              {HOURS.filter(h => h > +ev.hour).map(h => <option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>)}
            </select>
          </div>
        </div>
        <select style={inp()} value={ev.category} onChange={e => setEv(p => ({ ...p, category:e.target.value }))}>
          {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ display:"flex", gap:8 }}>
          <button className="bp" style={btn("primary", { flex:1 })} onClick={handleAdd}>เพิ่ม</button>
          <button className="bg" style={btn("ghost")} onClick={onCancel}>ยกเลิก</button>
        </div>
      </div>
    </div>
  );
});

const AddTaskForm = memo(({ onAdd, onCancel }) => {
  const [tk, setTk] = useState({ title:"", priority:"medium", category:"school", due:"" });

  const handleAdd = () => {
    if (!tk.title.trim()) return;
    onAdd({ title:tk.title.trim(), priority:tk.priority, category:tk.category, due:tk.due });
  };

  return (
    <div style={{ ...card(), marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:".07em" }}>เพิ่มงาน</span>
        <span style={{ cursor:"pointer", color:C.muted, fontSize:18, lineHeight:1 }} onClick={onCancel}>×</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
        <input style={inp()} placeholder="ชื่องาน..." value={tk.title}
          onChange={e => setTk(p => ({ ...p, title:e.target.value }))}
          onKeyDown={e => e.key === "Enter" && handleAdd()} autoFocus />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div>
            <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>ความสำคัญ</div>
            <select style={inp()} value={tk.priority} onChange={e => setTk(p => ({ ...p, priority:e.target.value }))}>
              {Object.entries(PRIS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>หมวดหมู่</div>
            <select style={inp()} value={tk.category} onChange={e => setTk(p => ({ ...p, category:e.target.value }))}>
              {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <input type="date" style={inp()} value={tk.due} onChange={e => setTk(p => ({ ...p, due:e.target.value }))} />
        <div style={{ display:"flex", gap:8 }}>
          <button className="bp" style={btn("primary", { flex:1 })} onClick={handleAdd}>เพิ่ม</button>
          <button className="bg" style={btn("ghost")} onClick={onCancel}>ยกเลิก</button>
        </div>
      </div>
    </div>
  );
});

/* ── Main App ── */

export default function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700);
  const [view, setView]         = useState("planner");
  const [now,  setNow]          = useState(new Date());
  const [events, setEvents]     = useState([]);
  const [tasks,  setTasks]      = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAddEv, setShowAddEv] = useState(false);
  const [showAddTk, setShowAddTk] = useState(false);
  const [tkFilter, setTkFilter] = useState("all");
  const [date, setDate]               = useState(() => new Date().toISOString().split("T")[0]);
  const [plannerMode, setPlannerMode] = useState("calendar");
  const [calMonth, setCalMonth]       = useState(() => new Date().toISOString().slice(0, 7));

  const shiftDate = (delta) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  };

  const shiftCalMonth = (delta) => {
    const [y, m] = calMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  /* โหลดข้อมูลจาก Supabase */
  useEffect(() => {
    Promise.all([
      supabase.from("events").select("*"),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    ]).then(([{ data: evData }, { data: tkData }]) => {
      if (evData) setEvents(evData.map(toEv));
      if (tkData) setTasks(tkData.map(toTk));
      setLoading(false);
    });
  }, []);

  /* Events CRUD */
  const addEvent = useCallback(async (data) => {
    const row = { id: Date.now().toString(), date: data.date, hour: data.hour, end_hour: data.endHour, title: data.title, category: data.category };
    const { data: inserted } = await supabase.from("events").insert([row]).select();
    if (inserted) setEvents(prev => [...prev, toEv(inserted[0])].sort((a, b) => a.hour - b.hour));
    setShowAddEv(false);
  }, []);

  const deleteEvent = useCallback(async (id) => {
    await supabase.from("events").delete().eq("id", id);
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  /* Tasks CRUD */
  const addTask = useCallback(async (data) => {
    const row = { id: Date.now().toString(), title: data.title, priority: data.priority, category: data.category, due: data.due || null, completed: false, created_at: Date.now() };
    const { data: inserted } = await supabase.from("tasks").insert([row]).select();
    if (inserted) setTasks(prev => [toTk(inserted[0]), ...prev]);
    setShowAddTk(false);
  }, []);

  const deleteTask = useCallback(async (id) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleTask = useCallback(async (id, completed) => {
    await supabase.from("tasks").update({ completed: !completed }).eq("id", id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t));
  }, []);

  const cancelAddEv = useCallback(() => setShowAddEv(false), []);
  const cancelAddTk = useCallback(() => setShowAddTk(false), []);

  const curH      = now.getHours();
  const doneCt    = tasks.filter(t => t.completed).length;
  const pendingCt = tasks.filter(t => !t.completed).length;
  const pct       = tasks.length ? Math.round((doneCt / tasks.length) * 100) : 0;
  const fmtT      = d => d.toLocaleTimeString("th-TH", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false });
  const fmtD      = d => d.toLocaleDateString("th-TH", { weekday:"short", day:"numeric", month:"short" });

  const filtered = tasks.filter(t => {
    if (tkFilter === "pending") return !t.completed;
    if (tkFilter === "done")    return  t.completed;
    if (Object.keys(CATS).includes(tkFilter)) return t.category === tkFilter;
    return true;
  });

  const NAVS = [
    { id:"planner", icon:<Calendar size={20}/>,    label:"Planner", badge:0 },
    { id:"tasks",   icon:<CheckSquare size={20}/>, label:"Tasks",   badge:pendingCt },
  ];

  /* ── STAT ROW ── */
  const StatRow = ({ items }) => (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${items.length},1fr)`, gap:10, marginBottom:16 }}>
      {items.map((st, i) => (
        <div key={i} style={card()}>
          <div style={{ fontFamily:C.fontMono, fontSize:st.mono?20:24, fontWeight:600, color:st.color }}>{st.val}</div>
          <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{st.label}</div>
        </div>
      ))}
    </div>
  );

  /* ── PLANNER VIEW ── */
  const PlannerView = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const isToday  = date === todayStr;
    const dayEvs   = events.filter(e => e.date === date);

    const arrowBtn = { display:"flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:7, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", flexShrink:0, transition:"all .15s" };
    const modeTab  = (active) => ({ padding:"5px 14px", borderRadius:6, fontSize:12, fontWeight:500, cursor:"pointer", border:"none", fontFamily:"inherit", transition:"all .15s", background:active ? C.accent : "transparent", color:active ? "#fff" : C.muted });

    const [cy, cm] = calMonth.split("-").map(Number);
    const firstDow  = (new Date(cy, cm - 1, 1).getDay() + 6) % 7;
    const daysInMon = new Date(cy, cm, 0).getDate();
    const cells     = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMon }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    const monthLabel = new Date(cy, cm - 1, 1).toLocaleDateString("th-TH", { month:"long", year:"numeric" });

    if (loading) return (
      <div style={{ textAlign:"center", padding:60, color:C.muted, fontSize:13 }}>กำลังโหลด...</div>
    );

    return (
      <div>
        {/* Mode toggle */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div style={{ display:"flex", gap:3, background:"rgba(99,102,241,.07)", padding:3, borderRadius:8, border:`1px solid ${C.border}` }}>
            <button style={modeTab(plannerMode === "timeline")} onClick={() => setPlannerMode("timeline")}>📅 ตาราง</button>
            <button style={modeTab(plannerMode === "calendar")} onClick={() => { setPlannerMode("calendar"); setCalMonth(date.slice(0, 7)); }}>🗓 ปฏิทิน</button>
          </div>
          {!isToday && (
            <button className="bp" style={btn("primary", { fontSize:11, padding:"5px 12px" })} onClick={() => setDate(todayStr)}>กลับวันนี้</button>
          )}
        </div>

        {plannerMode === "timeline" ? (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <button className="nav-arrow" style={arrowBtn} onClick={() => shiftDate(-1)}><ChevronLeft size={16}/></button>
              <div style={{ flex:1, textAlign:"center" }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>
                  {new Date(date + "T00:00:00").toLocaleDateString("th-TH", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
                </div>
                {isToday && <span style={{ fontSize:10, padding:"1px 8px", borderRadius:999, background:C.accentDim, color:C.accent, fontWeight:600 }}>วันนี้</span>}
              </div>
              <button className="nav-arrow" style={arrowBtn} onClick={() => shiftDate(1)}><ChevronRight size={16}/></button>
            </div>

            <StatRow items={[
              { label:"กิจกรรม", val:dayEvs.length, color:C.accent },
              { label:"เวลาตอนนี้", val:`${String(curH).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`, color:C.cyan, mono:true },
              { label:"งานค้าง", val:pendingCt, color:pendingCt > 0 ? C.red : C.green },
            ]} />

            {showAddEv && <AddEventForm defaultDate={date} onAdd={addEvent} onCancel={cancelAddEv} />}

            <div style={card()}>
              <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:".07em", marginBottom:12 }}>
                ตารางเวลา — {new Date(date + "T00:00:00").toLocaleDateString("th-TH", { weekday:"short", day:"numeric", month:"short" })}
              </div>
              {HOURS.map(h => {
                const evs   = dayEvs.filter(e => h >= e.hour && h < e.endHour);
                const isCur = isToday && h === curH;
                return (
                  <div key={h} style={{ display:"flex", gap:8, minHeight:48, borderBottom:`1px solid rgba(99,102,241,.05)`, padding:"3px 0", alignItems:"flex-start" }}>
                    <div style={{ fontFamily:C.fontMono, fontSize:10, color:isCur?C.accent:C.dim, width:36, minWidth:36, paddingTop:6, textAlign:"right" }}>
                      {String(h).padStart(2,"0")}:00
                    </div>
                    <div style={{ width:1, background:isCur?"rgba(99,102,241,.4)":"rgba(99,102,241,.08)", alignSelf:"stretch" }} />
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:3, padding:"2px 0" }}>
                      {isCur && evs.length === 0 && <div style={{ fontSize:10, color:C.dim, fontStyle:"italic", paddingTop:5 }}>← ตอนนี้</div>}
                      {evs.map(ev => {
                        const cat = CATS[ev.category] || CATS.other;
                        return (
                          <div key={ev.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 9px", borderRadius:6, background:cat.bg, borderLeft:`3px solid ${cat.color}` }}>
                            <span style={{ flex:1, fontSize:12.5, fontWeight:500, color:cat.color }}>{ev.title}</span>
                            <span style={{ fontFamily:C.fontMono, fontSize:10, color:cat.color, opacity:.5 }}>{String(ev.hour).padStart(2,"0")}–{String(ev.endHour).padStart(2,"0")}</span>
                            <span style={{ cursor:"pointer", fontSize:11, color:C.red, opacity:.7 }} onClick={() => deleteEvent(ev.id)}>×</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <button className="nav-arrow" style={arrowBtn} onClick={() => shiftCalMonth(-1)}><ChevronLeft size={16}/></button>
              <div style={{ flex:1, textAlign:"center", fontSize:14, fontWeight:600, color:C.text }}>{monthLabel}</div>
              <button className="nav-arrow" style={arrowBtn} onClick={() => shiftCalMonth(1)}><ChevronRight size={16}/></button>
            </div>

            <div style={card({ padding:12 })}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:6 }}>
                {["จ","อ","พ","พฤ","ศ","ส","อา"].map((d, i) => (
                  <div key={i} style={{ textAlign:"center", fontSize:10, fontWeight:600, color:i >= 5 ? "#F87171" : C.muted, padding:"4px 0" }}>{d}</div>
                ))}
              </div>
              {Array.from({ length: cells.length / 7 }, (_, wi) => (
                <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:2 }}>
                  {cells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
                    if (!day) return <div key={di} style={{ minHeight:52 }} />;
                    const dayStr   = `${cy}-${String(cm).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                    const dayEvs   = events.filter(e => e.date === dayStr);
                    const isSel    = dayStr === date;
                    const isDToday = dayStr === todayStr;
                    const isWknd   = di >= 5;
                    return (
                      <div key={di}
                        onClick={() => { setDate(dayStr); setCalMonth(dayStr.slice(0,7)); setPlannerMode("timeline"); }}
                        style={{ minHeight:68, borderRadius:7, padding:"5px 5px 4px", cursor:"pointer", transition:"all .15s",
                          background: isSel ? C.accent : isDToday ? "rgba(99,102,241,.12)" : "rgba(255,255,255,.02)",
                          border:`1px solid ${isSel ? C.accent : isDToday ? "rgba(99,102,241,.4)" : C.border}`,
                          overflow:"hidden",
                        }}>
                        <div style={{ fontSize:12, fontWeight:isSel||isDToday?700:400, color:isSel?"#fff":isDToday?C.accent:isWknd?"#F87171":C.text, textAlign:"center", marginBottom:4 }}>{day}</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                          {dayEvs.slice(0, 2).map(ev => {
                            const cat = CATS[ev.category] || CATS.other;
                            return (
                              <div key={ev.id} style={{ display:"flex", alignItems:"center", gap:3 }}>
                                <div style={{ width:4, height:4, borderRadius:"50%", background:isSel?"rgba(255,255,255,.85)":cat.color, flexShrink:0 }} />
                                <span style={{ fontSize:9, color:isSel?"rgba(255,255,255,.92)":cat.color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.3 }}>
                                  {ev.title}
                                </span>
                              </div>
                            );
                          })}
                          {dayEvs.length > 2 && (
                            <span style={{ fontSize:8, color:isSel?"rgba(255,255,255,.6)":C.muted, paddingLeft:7 }}>+{dayEvs.length - 2} อื่นๆ</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Selected day panel */}
            {(() => {
              const selEvs = events.filter(e => e.date === date).sort((a, b) => a.hour - b.hour);
              return (
                <div style={{ marginTop:12 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:".07em" }}>
                      {new Date(date + "T00:00:00").toLocaleDateString("th-TH", { weekday:"long", day:"numeric", month:"long" })}
                    </div>
                    <button className="bp" style={btn("primary", { fontSize:11, padding:"4px 10px" })}
                      onClick={() => setShowAddEv(p => !p)}>+ เพิ่ม</button>
                  </div>
                  {showAddEv && <AddEventForm defaultDate={date} onAdd={addEvent} onCancel={cancelAddEv} />}
                  {selEvs.length === 0 && !showAddEv && (
                    <div style={{ textAlign:"center", padding:"16px 0", color:C.dim, fontSize:12 }}>ยังไม่มีกิจกรรม — กดวันในปฏิทินเพื่อดูตาราง</div>
                  )}
                  {selEvs.map(ev => {
                    const cat = CATS[ev.category] || CATS.other;
                    return (
                      <div key={ev.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:7, background:cat.bg, borderLeft:`3px solid ${cat.color}`, marginBottom:5 }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:cat.color, flexShrink:0 }} />
                        <span style={{ flex:1, fontSize:13, fontWeight:500, color:cat.color }}>{ev.title}</span>
                        <span style={{ fontFamily:C.fontMono, fontSize:10, color:cat.color, opacity:.6 }}>{String(ev.hour).padStart(2,"0")}:00–{String(ev.endHour).padStart(2,"0")}:00</span>
                        <span style={{ cursor:"pointer", fontSize:11, color:C.red, opacity:.6 }} onClick={() => deleteEvent(ev.id)}>×</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  /* ── TASKS VIEW ── */
  const TasksView = () => (
    <div>
      <div style={{ display:"flex", gap:5, marginBottom:12, flexWrap:"wrap" }}>
        {[{ id:"all", label:"ทั้งหมด" }, { id:"pending", label:"ยังค้าง" }, { id:"done", label:"เสร็จ" },
          ...Object.entries(CATS).map(([k, v]) => ({ id:k, label:v.label })),
        ].map(f => (
          <button key={f.id} className={tkFilter === f.id ? "bp" : "bg"}
            style={btn(tkFilter === f.id ? "primary" : "ghost", { fontSize:11, padding:"5px 10px" })}
            onClick={() => setTkFilter(f.id)}>{f.label}</button>
        ))}
      </div>
      <StatRow items={[
        { label:"ทั้งหมด",  val:tasks.length, color:C.accent },
        { label:"ยังค้าง", val:pendingCt,    color:C.red },
        { label:"เสร็จแล้ว", val:`${pct}%`,  color:C.green },
      ]} />
      {showAddTk && <AddTaskForm onAdd={addTask} onCancel={cancelAddTk} />}
      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:C.muted, fontSize:13 }}>กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:C.dim }}>
          <div style={{ fontSize:28, marginBottom:8 }}>✓</div>
          <div style={{ fontSize:13 }}>ไม่มีงานในหมวดนี้</div>
        </div>
      ) : filtered.map(tk => {
        const cat = CATS[tk.category] || CATS.other;
        const pri = PRIS[tk.priority] || PRIS.medium;
        return (
          <div key={tk.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"11px 12px", borderRadius:9, background:"rgba(15,23,42,.5)", border:`1px solid ${C.border}`, marginBottom:7, opacity:tk.completed ? .45 : 1, minHeight:44 }}>
            <div onClick={() => toggleTask(tk.id, tk.completed)}
              style={{ width:18, height:18, borderRadius:4, border:`2px solid ${tk.completed?C.accent:"rgba(99,102,241,.35)"}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1, background:tk.completed?C.accent:"transparent", transition:"all .15s" }}>
              {tk.completed && <Check size={11} color="#fff" />}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13.5, fontWeight:500, color:tk.completed?C.muted:C.text, textDecoration:tk.completed?"line-through":"none" }}>{tk.title}</div>
              <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
                <span style={tag(cat.color, cat.bg)}>{cat.label}</span>
                <span style={tag(pri.color, pri.bg)}>{pri.label}</span>
                {tk.due && <span style={tag(C.muted, "rgba(148,163,184,.08)")}>📅 {tk.due}</span>}
              </div>
            </div>
            <button className="bg" style={btn("danger", { fontSize:11, padding:"4px 8px", flexShrink:0 })} onClick={() => deleteTask(tk.id)}>
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );

  /* ─── MOBILE LAYOUT ── */
  if (isMobile) return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:C.bg, color:C.text, fontFamily:"'Inter',system-ui,sans-serif", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(99,102,241,.25);border-radius:2px}
        input::placeholder{color:#374151}select option{background:#0F172A;color:#E2E8F0}
        .bp:hover{background:#4F46E5!important}.bg:hover{background:rgba(99,102,241,.1)!important;color:#A5B4FC!important}
        .nav-arrow:hover{border-color:#6366F1!important;color:#6366F1!important;background:rgba(99,102,241,.1)!important}
        .cs:hover{background:rgba(99,102,241,.18)!important}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.4)}
      `}</style>

      <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, background:"rgba(9,14,28,.97)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <div style={{ fontFamily:C.fontMono, fontSize:12, fontWeight:600, color:C.accent, letterSpacing:".06em" }}>EXEC_AI</div>
          <div style={{ fontSize:10, color:C.muted }}>
            {view==="planner" ? "📅 ตารางประจำวัน" : "✅ จัดการงาน"}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:C.fontMono, fontSize:16, fontWeight:600, color:C.accent }}>{fmtT(now)}</div>
            <div style={{ fontSize:10, color:C.muted }}>{fmtD(now)}</div>
          </div>
          {view==="planner" && <button className="bp" style={btn("primary", { padding:"7px 10px", fontSize:12 })} onClick={() => setShowAddEv(p => !p)}><Plus size={14} /></button>}
          {view==="tasks"   && <button className="bp" style={btn("primary", { padding:"7px 10px", fontSize:12 })} onClick={() => setShowAddTk(p => !p)}><Plus size={14} /></button>}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"14px" }}>
        {view==="planner" && PlannerView()}
        {view==="tasks"   && TasksView()}
      </div>

      <div style={{ display:"flex", borderTop:`1px solid ${C.border}`, background:"rgba(9,14,28,.97)", paddingBottom:"env(safe-area-inset-bottom)", flexShrink:0 }}>
        {NAVS.map(n => (
          <div key={n.id} onClick={() => setView(n.id)}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"10px 0 8px", cursor:"pointer", color:view===n.id?C.accent:C.muted, transition:"color .15s", position:"relative" }}>
            <div style={{ position:"relative", display:"inline-flex" }}>
              {n.icon}
              {n.badge > 0 && <span style={{ position:"absolute", top:-4, right:-8, background:C.accent, color:"#fff", borderRadius:999, fontSize:9, fontWeight:700, minWidth:14, height:14, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px" }}>{n.badge}</span>}
            </div>
            <div style={{ fontSize:10, marginTop:3, fontWeight:view===n.id?600:400 }}>{n.label}</div>
            {view===n.id && <div style={{ position:"absolute", bottom:0, left:"25%", right:"25%", height:2, background:C.accent, borderRadius:"2px 2px 0 0" }} />}
          </div>
        ))}
      </div>
    </div>
  );

  /* ─── DESKTOP LAYOUT ── */
  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"'Inter',system-ui,sans-serif", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(99,102,241,.25);border-radius:2px}
        input::placeholder{color:#374151}select option{background:#0F172A;color:#E2E8F0}
        .bp:hover{background:#4F46E5!important}.bg:hover{background:rgba(99,102,241,.1)!important;color:#A5B4FC!important}
        .nav-arrow:hover{border-color:#6366F1!important;color:#6366F1!important;background:rgba(99,102,241,.1)!important}
        .nav-i:hover{background:rgba(99,102,241,.08)!important;color:#A5B4FC!important}
        .cs:hover{background:rgba(99,102,241,.18)!important}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.4)}
      `}</style>

      <div style={{ width:210, minWidth:210, background:"rgba(9,14,28,.98)", borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"20px 18px 16px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:C.fontMono, fontSize:13, fontWeight:600, color:C.accent, letterSpacing:".06em" }}>EXEC_AI</div>
          <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>Executive Assistant</div>
        </div>
        <div style={{ flex:1, paddingTop:8 }}>
          {NAVS.map(n => (
            <div key={n.id} className="nav-i" onClick={() => setView(n.id)}
              style={{ display:"flex", alignItems:"center", gap:9, padding:"10px 18px", cursor:"pointer", fontSize:13, color:view===n.id?"#818CF8":C.muted, borderLeft:`2px solid ${view===n.id?C.accent:"transparent"}`, background:view===n.id?C.accentDim:"transparent", transition:"all .15s" }}>
              {n.icon}
              <span style={{ flex:1 }}>{n.label}</span>
              {n.badge > 0 && <span style={{ background:C.accent, color:"#fff", borderRadius:999, fontSize:10, fontWeight:700, minWidth:17, height:17, display:"inline-flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>{n.badge}</span>}
            </div>
          ))}
        </div>
        <div style={{ padding:"14px 18px", borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:C.fontMono, fontSize:21, fontWeight:600, color:C.accent }}>{fmtT(now)}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{fmtD(now)}</div>
          {tasks.length > 0 && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:10, color:C.dim, marginBottom:4 }}>งาน {doneCt}/{tasks.length} เสร็จ</div>
              <div style={{ height:3, background:"rgba(99,102,241,.15)", borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${C.accent},${C.cyan})`, transition:"width .5s" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"13px 22px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(9,14,28,.6)", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:600 }}>
              {view==="planner" && "📅 ตารางประจำวัน"}
              {view==="tasks"   && "✅ จัดการงาน"}
            </div>
            <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
              {view==="planner" && `${events.length} กิจกรรมทั้งหมด`}
              {view==="tasks"   && `${pendingCt} งานที่ยังค้าง`}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {view==="planner" && <button className="bp" style={btn("primary")} onClick={() => setShowAddEv(p => !p)}><Plus size={14} /> เพิ่มกิจกรรม</button>}
            {view==="tasks"   && <button className="bp" style={btn("primary")} onClick={() => setShowAddTk(p => !p)}><Plus size={14} /> เพิ่มงาน</button>}
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"18px 22px" }}>
          {view==="planner" && PlannerView()}
          {view==="tasks"   && TasksView()}
        </div>
      </div>
    </div>
  );
}
