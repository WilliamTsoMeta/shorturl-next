'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Header } from '@/components/Header'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const client = createClient()
    const session = client.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    router.push('/link_list')
  }, [router])

  return (
    <>
      <Header />
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
      </div>
    </>
  )
}
