"use client"

import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Menu,
  X,
  UserCheck,
  Database,
  DoorClosed,
  UserPlus,
  ChevronRight,
  ShieldCheck
} from 'lucide-react'

export default function AdminLayout({ children }) {
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) setIsSidebarOpen(false)
      else setIsSidebarOpen(true)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navigation = [
    {
      name: 'Approvals',
      href: '/gatepass/approvals',
      icon: UserCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'All Data',
      href: '/gatepass/all-data',
      icon: Database,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Close Pass',
      href: '/gatepass/close-pass',
      icon: DoorClosed,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      name: 'Request Visit',
      href: '/gatepass/request-visit',
      icon: UserPlus,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
  ]

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar Overlay (Mobile) */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                Visitor GatePass
              </span>
            </div>
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                    ? `${item.bgColor} ${item.color} font-semibold shadow-sm`
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center gap-3 text-sm">
                    <item.icon className={`w-5 h-5 ${isActive ? item.color : 'text-gray-400 group-hover:text-gray-600'}`} />
                    {item.name}
                  </div>
                  {isActive && <div className={`w-1.5 h-1.5 rounded-full ${item.color.replace('text', 'bg')}`} />}
                  {!isActive && <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-800">
                {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900 leading-none mb-1">
                Administrator
              </span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                Gate Management
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold">
              A
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 relative custom-scrollbar">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  )
}
