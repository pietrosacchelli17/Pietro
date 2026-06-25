'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { STAGE_CONFIG } from '@/types'
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import toast from 'react-hot-toast'

const STAGES = Object.keys(STAGE_CONFIG) as (keyof typeof STAGE_CONFIG)[]

type ZoomLevel = 'week' | 'month' | 'quarter'

export default function TimelinePage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState<ZoomLevel>('month')
  const [viewStart, setViewStart] = useState(() => startOfMonth(new Date()))
  const [dragging, setDragging] = useState<{ projectId: string; stage: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    const { data } = await supabase.from('projects')
      .select(`*, milestones:project_milestones(*), project_manager:users!project_manager_id(*)`)
      .neq('status', 'complete')
      .order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  function getViewDays(): Date[] {
    const days: Date[] = []
    if (zoom === 'week') {
      for (let i = 0; i < 28; i++) days.push(addDays(viewStart, i))
    } else if (zoom === 'month') {
      for (let i = 0; i < 90; i++) days.push(addDays(viewStart, i))
    } else {
      for (let i = 0; i < 180; i++) days.push(addDays(viewStart, i))
    }
    return days
  }

  function navigate(dir: 1 | -1) {
    const delta = zoom === 'week' ? 14 : zoom === 'month' ? 30 : 60
    setViewStart(addDays(viewStart, dir * delta))
  }

  function getCellWidth() {
    return zoom === 'week' ? 44 : zoom === 'month' ? 30 : 18
  }

  const days = getViewDays()
  const cellW = getCellWidth()
  const todayIdx = days.findIndex(d => isToday(d))

  // Group days by month for header
  const monthGroups: { label: string; count: number }[] = []
  let curMonth = ''
  days.forEach(d => {
    const m = format(d, 'MMM yyyy')
    if (m !== curMonth) { monthGroups.push({ label: m, count: 1 }); curMonth = m }
    else monthGroups[monthGroups.length - 1].count++
  })

  async function handleDrop(projectId: string, stage: string, dayIdx: number) {
    const date = format(days[dayIdx], 'yyyy-MM-dd')
    await supabase.from('project_milestones').upsert(
      { project_id: projectId, stage, planned_date: date, status: 'planned' },
      { onConflict: 'project_id,stage' }
    )
    toast.success(`${STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG].label} set to ${format(days[dayIdx], 'd MMM')}`)
    loadProjects()
    setDragging(null)
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Timeline</h1>
          <p className="text-sm text-stone-500 mt-0.5">{projects.length} active projects</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom */}
          <div className="flex items-center border border-stone-200 rounded-lg bg-white overflow-hidden">
            {(['week', 'month', 'quarter'] as ZoomLevel[]).map(z => (
              <button key={z} onClick={() => setZoom(z)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors
                  ${zoom === z ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'}`}>
                {z}
              </button>
            ))}
          </div>
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50 bg-white">
            <ChevronLeft size={16} className="text-stone-600"/>
          </button>
          <button onClick={() => { setViewStart(startOfMonth(new Date())) }} className="btn-secondary text-xs py-1.5 px-3">Today</button>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50 bg-white">
            <ChevronRight size={16} className="text-stone-600"/>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {STAGES.map(s => {
          const sc = STAGE_CONFIG[s]
          return (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: sc.color }}/>
              <span className="text-xs text-stone-500">{sc.label}</span>
            </div>
          )
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <div className="card flex-1 overflow-hidden flex flex-col">
          <div ref={scrollRef} className="overflow-auto flex-1">
            <table className="border-collapse" style={{ minWidth: `${220 + days.length * cellW}px` }}>
              <thead>
                {/* Month row */}
                <tr>
                  <th className="sticky left-0 bg-stone-50 z-20 border-b border-r border-stone-200 w-52 min-w-52"/>
                  {monthGroups.map((mg, i) => (
                    <th key={i} colSpan={mg.count}
                      className="text-xs font-semibold text-stone-500 bg-stone-50 border-b border-stone-200 px-2 py-1.5 text-left border-l"
                      style={{ width: `${mg.count * cellW}px` }}>
                      {mg.label}
                    </th>
                  ))}
                </tr>
                {/* Day row */}
                <tr className="bg-white">
                  <th className="sticky left-0 bg-white z-20 border-b border-r border-stone-200 w-52 min-w-52 text-left px-4 text-xs font-semibold text-stone-400 uppercase tracking-wide py-2">
                    Project
                  </th>
                  {days.map((d, i) => {
                    const isWk = d.getDay() === 0 || d.getDay() === 6
                    const isTd = isToday(d)
                    return (
                      <th key={i}
                        className={`text-center border-b border-stone-100 relative
                          ${isWk ? 'bg-stone-50' : 'bg-white'}
                          ${isTd ? 'bg-brand-50' : ''}`}
                        style={{ width: `${cellW}px`, minWidth: `${cellW}px`, padding: '4px 0' }}>
                        <span className={`text-xs font-medium ${isTd ? 'text-brand-600' : 'text-stone-400'}`}
                          style={{ display: cellW < 28 && d.getDate() % 7 !== 1 ? 'none' : 'block' }}>
                          {d.getDate()}
                        </span>
                        {isTd && <div className="absolute bottom-0 left-1/2 w-0.5 h-0.5 bg-brand-500 -translate-x-1/2"/>}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {projects.map(project => {
                  const msMap: Record<string, any> = {}
                  project.milestones?.forEach((m: any) => { msMap[m.stage] = m })

                  return (
                    <tr key={project.id} className="border-b border-stone-100 hover:bg-stone-50 group">
                      {/* Project name */}
                      <td className="sticky left-0 bg-white group-hover:bg-stone-50 z-10 border-r border-stone-200 px-4 py-2"
                        style={{ minWidth: '208px', width: '208px' }}>
                        <Link href={`/projects/${project.id}`} className="block">
                          <p className="text-xs font-medium text-stone-900 truncate hover:text-brand-600">{project.name}</p>
                          <p className="text-xs text-stone-400 truncate mt-0.5">{project.client}</p>
                        </Link>
                      </td>

                      {/* Day cells */}
                      {days.map((d, i) => {
                        const isWk = d.getDay() === 0 || d.getDay() === 6
                        const isTd = isToday(d)
                        // Find milestone on this day
                        const milestone = STAGES.find(s => {
                          const ms = msMap[s]
                          return ms?.planned_date && isSameDay(parseISO(ms.planned_date), d)
                        })
                        const sc = milestone ? STAGE_CONFIG[milestone] : null

                        return (
                          <td key={i}
                            className={`relative border-l border-stone-100 text-center p-0
                              ${isWk ? 'bg-stone-50/50' : ''}
                              ${isTd ? 'bg-brand-50/60' : ''}
                              ${dragging ? 'cursor-crosshair' : ''}`}
                            style={{ width: `${cellW}px`, height: '42px' }}
                            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('bg-brand-50') }}
                            onDragLeave={e => e.currentTarget.classList.remove('bg-brand-50')}
                            onDrop={async e => {
                              e.currentTarget.classList.remove('bg-brand-50')
                              if (dragging) await handleDrop(dragging.projectId, dragging.stage, i)
                            }}>
                            {isTd && <div className="absolute top-0 bottom-0 left-1/2 w-px bg-brand-300 -translate-x-1/2 pointer-events-none"/>}
                            {sc && (
                              <div
                                draggable
                                onDragStart={() => setDragging({ projectId: project.id, stage: milestone! })}
                                onDragEnd={() => setDragging(null)}
                                className="absolute inset-y-2 left-0.5 right-0.5 rounded flex items-center justify-center cursor-grab active:cursor-grabbing"
                                style={{ background: sc.color }}
                                title={`${sc.label} — ${format(d, 'd MMM yyyy')}`}>
                                {cellW >= 30 && (
                                  <span className="text-white text-xs font-semibold leading-none px-1 truncate" style={{ fontSize: '9px' }}>
                                    {sc.label.slice(0, 3)}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={days.length + 1} className="py-16 text-center text-sm text-stone-400">
                      No active projects. <Link href="/projects/new" className="text-brand-600 hover:underline">Create one →</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-xs text-stone-400 mt-3 text-center">
        Drag milestone markers to reschedule dates. Click on a project name to open it.
      </p>
    </div>
  )
}
