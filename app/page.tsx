import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default async function Home() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  redirect('/link_list')
}
