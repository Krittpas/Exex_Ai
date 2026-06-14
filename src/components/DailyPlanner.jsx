import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6–23
const PX_PER_HOUR = 64

const CATEGORIES = [
  { value: 'school',      label: 'โรงเรียน', color: '#3b82f6' },
  { value: 'competition', label: 'แข่งขัน',  color: '#f59e0b' },
  { value: 'camp',        label: 'ค่าย',      color: '#10b981' },
  { value: 'meeting',     label: 'ประชุม',    color: '#8b5cf6' },
  { value: 'personal',    label: 'ส่วนตัว',   color: '#ec4899' },
  { value: 'other',       label: 'อื่นๆ',     color: '#6b7280' },
]

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

function timeToMin(t) {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function getNowTop() {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  if (mins < 6 * 60 || mins > 23 * 60 + 59) return null
  return (mins - 6 * 60) * (PX_PER_HOUR / 60)
}

const DEFAULT_FORM = { title: '', start_time: '09:00', end_time: '10:00', category: 'school' }

export default function DailyPlanner() {
  const today = toDateStr(new Date())
  const [date, setDate]       = useState(today)
  const [plans, setPlans]     = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState(DEFAULT_FORM)
  const [nowTop, setNowTop]   = useState(getNowTop)
  const nowRef = useRef(null)

  useEffect(() => { loadPlans() }, [date])

  useEffect(() => {
    const t = setInterval(() => setNowTop(getNowTop()), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (date === today && nowRef.current) {
      nowRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [date, nowTop])

  async function loadPlans() {
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('date', date)
      .order('start_time')
    setPlans(data ?? [])
  }

  async function addPlan() {
    if (!form.title.trim()) return
    if (timeToMin(form.end_time) <= timeToMin(form.start_time)) return
    const cat = CATEGORIES.find(c => c.value === form.category)
    const { data, error } = await supabase
      .from('plans')
      .insert([{ date, ...form, color: cat.color }])
      .select()
    if (!error && data) {
      setPlans(prev =>
        [...prev, ...data].sort((a, b) => a.start_time.localeCompare(b.start_time))
      )
      setShowForm(false)
      setForm(DEFAULT_FORM)
    }
  }

  async function deletePlan(id) {
    await supabase.from('plans').delete().eq('id', id)
    setPlans(prev => prev.filter(p => p.id !== id))
  }

  function blockStyle(plan) {
    const start = timeToMin(plan.start_time)
    const end   = timeToMin(plan.end_time)
    const top    = (start - 6 * 60) * (PX_PER_HOUR / 60)
    const height = Math.max((end - start) * (PX_PER_HOUR / 60), 28)
    return {
      top,
      height,
      backgroundColor: plan.color + 'cc',
      borderLeft: `3px solid ${plan.color}`,
    }
  }

  function shiftDate(delta) {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setDate(toDateStr(d))
  }

  const isToday = date === today

  return (
    <div className="planner">
      <div className="planner-nav">
        <button className="icon-btn" onClick={() => shiftDate(-1)}>
          <ChevronLeft size={18} />
        </button>
        <div className="planner-date">
          {new Date(date + 'T00:00:00').toLocaleDateString('th-TH', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
          {isToday && <span className="badge-today">วันนี้</span>}
        </div>
        <button className="icon-btn" onClick={() => shiftDate(1)}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="timeline-scroll">
        <div className="timeline-wrap">
          <div className="timeline-labels">
            {HOURS.map(h => (
              <div key={h} className="hour-label" style={{ height: PX_PER_HOUR }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          <div className="timeline-body" style={{ height: HOURS.length * PX_PER_HOUR }}>
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="hour-slot"
                style={{ top: i * PX_PER_HOUR, height: PX_PER_HOUR }}
              />
            ))}

            {isToday && nowTop !== null && (
              <div ref={nowRef} className="now-line" style={{ top: nowTop }}>
                <span className="now-dot" />
              </div>
            )}

            {plans.map(plan => (
              <div key={plan.id} className="plan-block" style={blockStyle(plan)}>
                <div className="plan-content">
                  <span className="plan-title">{plan.title}</span>
                  <span className="plan-time">
                    {plan.start_time.slice(0, 5)}–{plan.end_time.slice(0, 5)}
                  </span>
                </div>
                <button className="plan-delete" onClick={() => deletePlan(plan.id)}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showForm ? (
        <div className="plan-form">
          <input
            className="form-input"
            placeholder="ชื่อกิจกรรม"
            value={form.title}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && addPlan()}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          />
          <div className="form-row">
            <label>
              เริ่ม
              <input
                type="time"
                value={form.start_time}
                onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
              />
            </label>
            <label>
              สิ้นสุด
              <input
                type="time"
                value={form.end_time}
                onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
              />
            </label>
          </div>
          <select
            value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <div className="form-actions">
            <button className="btn-primary" onClick={addPlan}>เพิ่ม</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>ยกเลิก</button>
          </div>
        </div>
      ) : (
        <button className="add-btn" onClick={() => setShowForm(true)}>
          <Plus size={15} /> เพิ่มกิจกรรม
        </button>
      )}
    </div>
  )
}
