'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen p-8 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to URL Shortener</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-gray-600 dark:text-gray-300">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Start creating your shortened URLs here...
          </p>
        </div>
      </div>
    </div>
  )
}
