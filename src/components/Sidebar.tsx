import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { X } from 'lucide-react'

interface SidebarProps {
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const { profile, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-5 py-3 my-1 rounded-none transition-all ${
      isActive
        ? 'bg-gray-200 border-l-3 border-l-gray-800 font-medium'
        : 'bg-white border-l-3 border-l-transparent hover:bg-gray-50'
    }`

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-60 bg-gray-100 border-r-2 border-gray-300 flex flex-col z-50 transform transition-transform ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-300">
          <h1 className="text-lg font-bold">StudyBuddy</h1>
          {isMobileOpen && (
            <button onClick={onMobileClose} className="md:hidden">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Main Section */}
          <div className="mb-6">
            <div className="px-5 py-2 text-xs font-bold text-gray-600 uppercase tracking-wide">
              Main
            </div>
            <NavLink to="/notes" className={navLinkClass} onClick={onMobileClose}>
              <span>📝</span>
              <span>Mine Noter</span>
            </NavLink>
            <NavLink to="/progress" className={navLinkClass} onClick={onMobileClose}>
              <span>📊</span>
              <span>Min Progression</span>
            </NavLink>
          </div>

          {/* Tools Section */}
          <div className="mb-6">
            <div className="px-5 py-2 text-xs font-bold text-gray-600 uppercase tracking-wide">
              Tools
            </div>
            <NavLink to="/ai" className={navLinkClass} onClick={onMobileClose}>
              <span>🤖</span>
              <span>AI-hjælp</span>
            </NavLink>
            <NavLink to="/exam" className={navLinkClass} onClick={onMobileClose}>
              <span>🎯</span>
              <span>Exam Mode</span>
            </NavLink>
          </div>

          {/* Organization Section */}
          <div className="mb-6">
            <div className="px-5 py-2 text-xs font-bold text-gray-600 uppercase tracking-wide">
              Organization
            </div>
            <NavLink to="/plans" className={navLinkClass} onClick={onMobileClose}>
              <span>📅</span>
              <span>Study Plans</span>
            </NavLink>
            <NavLink to="/files" className={navLinkClass} onClick={onMobileClose}>
              <span>📁</span>
              <span>Files</span>
            </NavLink>
            <NavLink to="/reminders" className={navLinkClass} onClick={onMobileClose}>
              <span>⏰</span>
              <span>Reminders</span>
            </NavLink>
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-300 p-4">
          <div className="mb-2">
            <div className="font-medium text-sm">{profile?.name || 'User'}</div>
            <div className="text-xs text-gray-600 truncate">{profile?.email}</div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-sm text-red-600 hover:text-red-700 py-2 px-3 rounded hover:bg-red-50 transition"
          >
            Logg ut
          </button>
        </div>
      </aside>
    </>
  )
}
