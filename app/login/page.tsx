'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      // Redirect will be handled by middleware
    } catch (error) {
      console.error('Error logging in:', error)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      })
      if (error) throw error
    } catch (error) {
      console.error('Error logging in with Google:', error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white dark:bg-gray-900">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image src="/logo.png" alt="Logo" width={48} height={48} className="rounded-xl" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">Log in to your account</h1>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-8">Welcome back! Please enter your details.</p>

        {/* Tabs */}
        <div className="flex mb-8 border dark:border-gray-700 rounded-lg">
          <button className="flex-1 py-2 px-4 bg-white dark:bg-gray-800 rounded-l-lg font-medium text-gray-900 dark:text-white">Log in</button>
          <Link href="/signup" className="flex-1 py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-center">
            Sign up
          </Link>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember for 30 days</span>
            </label>
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              Forgot password
            </Link>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Log in
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-2 px-4 border dark:border-gray-700 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors"
          >
            <Image src="/google.svg" alt="Google" width={20} height={20} />
            <span>Sign in with Google</span>
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          {"Don't have an account? "}
          <Link href="/signup" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
