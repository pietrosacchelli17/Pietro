'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, FolderOpen, CheckSquare, Calendar, Users,
  FileText, BarChart2, Bell, Search, Settings, LogOut,
  ChevronLeft, ChevronRight, Menu, X, Bot, Zap
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/projects',   label: 'Projects',   icon: FolderOpen },
  { href: '/timeline',   label: 'Timeline',   icon: Calendar },
  { href: '/tasks',      label: 'Tasks',      icon: CheckSquare },
  { href: '/team',       label: 'Team',       icon: Users },
  { href: '/documents',  label: 'Documents',  icon: FileText },
  { href: '/reports',    label: 'Reports',    icon: BarChart2 },
  { href: '/ai',         label: 'AI Assistant', icon: Bot },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth'); return }
      supabase.from('users').select('*').eq('id', data.user.id).single()
        .then(({ data: profile }) => setUser(profile))
    })
    supabase.from('notifications').select('id').eq('read', false)
      .then(({ data }) => setNotifications(data?.length || 0))
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const initials = user?.full_name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)}/>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 flex flex-col bg-stone-900 transition-all duration-200
        ${collapsed ? 'w-16' : 'w-56'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 h-14 border-b border-stone-800 flex-shrink-0 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-white text-sm font-semibold leading-none truncate">Stoneline UK</div>
              <div className="text-stone-500 text-xs mt-0.5">Projects</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${active ? 'bg-brand-500 text-white' : 'text-stone-400 hover:text-white hover:bg-stone-800'}
                  ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? label : undefined}>
                <Icon size={16} className="flex-shrink-0"/>
                {!collapsed && <span>{label}</span>}
                {label === 'AI Assistant' && !collapsed && (
                  <span className="ml-auto bg-brand-500/20 text-brand-400 text-xs px-1.5 py-0.5 rounded">NEW</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-stone-800 p-2 space-y-0.5">
          <Link href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stone-400 hover:text-white hover:bg-stone-800 ${collapsed ? 'justify-center' : ''}`}>
            <Settings size={16}/>
            {!collapsed && <span>Settings</span>}
          </Link>
          <button onClick={signOut}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stone-400 hover:text-red-400 hover:bg-stone-800 w-full ${collapsed ? 'justify-center' : ''}`}>
            <LogOut size={16}/>
            {!collapsed && <span>Sign out</span>}
          </button>
          {!collapsed && user && (
            <div className="flex items-center gap-2 px-3 py-2 mt-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: user?.color || '#10B981' }}>
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-stone-300 text-xs font-medium truncate">{user?.full_name}</div>
                <div className="text-stone-500 text-xs truncate">{user?.role}</div>
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-stone-800 border border-stone-700 rounded-full items-center justify-center text-stone-400 hover:text-white">
          {collapsed ? <ChevronRight size={12}/> : <ChevronLeft size={12}/>}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 h-14 bg-white border-b border-stone-200 flex-shrink-0">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-stone-100" onClick={() => setMobileOpen(true)}>
            <Menu size={18} className="text-stone-600"/>
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/>
              <input
                className="w-full bg-stone-100 rounded-lg pl-9 pr-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Search projects, clients, tasks…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications */}
            <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-stone-100">
              <Bell size={18} className="text-stone-600"/>
              {notifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </Link>

            {/* Avatar */}
            <Link href="/settings" className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: user?.color || '#10B981' }}>
              {initials}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
