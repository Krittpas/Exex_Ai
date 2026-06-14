import { useState, useEffect } from 'react'
import { Plus, X, Check, Circle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const PRIORITIES = [
  { value: 'high',   label: 'สูง',  color: '#ef4444' },
  { value: 'medium', label: 'กลาง', color: '#f59e0b' },
  { value: 'low',    label: 'ต่ำ',  color: '#22c55e' },
]

const FILTERS = [
  { value: 'all',     label: 'ทั้งหมด' },
  { value: 'pending', label: 'ค้างอยู่' },
  { value: 'done',    label: 'เสร็จแล้ว' },
  { value: 'high',    label: '🔴 สูง' },
  { value: 'medium',  label: '🟡 กลาง' },
  { value: 'low',     label: '🟢 ต่ำ' },
]

const DEFAULT_FORM = { title: '', priority: 'medium', category: '', due_date: '' }

export default function TasksManager() {
  const [tasks, setTasks]       = useState([])
  const [filter, setFilter]     = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(DEFAULT_FORM)

  useEffect(() => { loadTasks() }, [])

  async function loadTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    setTasks(data ?? [])
  }

  async function addTask() {
    if (!form.title.trim()) return
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title:    form.title,
        priority: form.priority,
        category: form.category || null,
        due_date: form.due_date || null,
        completed: false,
      }])
      .select()
    if (!error && data) {
      setTasks(prev => [...data, ...prev])
      setShowForm(false)
      setForm(DEFAULT_FORM)
    }
  }

  async function toggleTask(id, completed) {
    await supabase.from('tasks').update({ completed: !completed }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t))
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const filtered = tasks.filter(t => {
    if (filter === 'all')     return true
    if (filter === 'done')    return t.completed
    if (filter === 'pending') return !t.completed
    return t.priority === filter
  })

  const done  = tasks.filter(t => t.completed).length
  const total = tasks.length
  const pct   = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="tasks">
      <div className="tasks-progress">
        <div className="progress-text">
          <span>งานทั้งหมด</span>
          <span className="progress-count">{done}/{total} ({pct}%)</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="task-filters">
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`filter-btn${filter === f.value ? ' active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="task-list">
        {filtered.length === 0 && (
          <div className="empty-state">ไม่มีงาน</div>
        )}
        {filtered.map(task => {
          const p = PRIORITIES.find(p => p.value === task.priority)
          return (
            <div key={task.id} className={`task-item${task.completed ? ' done' : ''}`}>
              <button
                className="task-check"
                style={{ color: task.completed ? p?.color : 'var(--border)' }}
                onClick={() => toggleTask(task.id, task.completed)}
              >
                {task.completed ? <Check size={18} /> : <Circle size={18} />}
              </button>
              <div className="task-body">
                <span className="task-title">{task.title}</span>
                <div className="task-meta">
                  <span className="task-priority" style={{ color: p?.color }}>
                    {p?.label}
                  </span>
                  {task.category && (
                    <span className="task-cat">{task.category}</span>
                  )}
                  {task.due_date && (
                    <span className="task-due">
                      ครบ{' '}
                      {new Date(task.due_date + 'T00:00:00').toLocaleDateString('th-TH', {
                        day: 'numeric', month: 'short',
                      })}
                    </span>
                  )}
                </div>
              </div>
              <button className="task-delete" onClick={() => deleteTask(task.id)}>
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>

      {showForm ? (
        <div className="task-form">
          <input
            className="form-input"
            placeholder="ชื่องาน"
            value={form.title}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && addTask()}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          />
          <div className="form-row">
            <select
              value={form.priority}
              onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
            >
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <input
              className="form-input"
              placeholder="หมวดหมู่ (ถ้ามี)"
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            />
          </div>
          <label className="form-date-label">
            วันครบกำหนด
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
            />
          </label>
          <div className="form-actions">
            <button className="btn-primary" onClick={addTask}>เพิ่ม</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>ยกเลิก</button>
          </div>
        </div>
      ) : (
        <button className="add-btn" onClick={() => setShowForm(true)}>
          <Plus size={15} /> เพิ่มงาน
        </button>
      )}
    </div>
  )
}
