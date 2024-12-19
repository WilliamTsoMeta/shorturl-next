'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  const pathname = usePathname()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const client = createClient()
    const getUser = async () => {
      const { data: { user } } = await client.auth.getUser()
      setEmail(user?.email || null)
    }
    getUser()
  }, [])

  const menuItems = [
    { href: '/link_list', label: 'Links' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/plugin-auth', label: 'Plugins' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between mx-auto px-4">
        <div className="flex-1 flex justify-start">
          <nav className="flex items-center space-x-2">
            <ThemeToggle />
            {email ? (
              <p className="text-sm text-foreground/60">{email}</p>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-foreground/60 hover:text-foreground/80"
              >
                Login
              </Link>
            )}
          </nav>
        </div>

        <div className="flex-1 flex justify-center">
          <Link className="flex items-center space-x-2" href="/">
            <span className="font-bold sm:inline-block">
              ShortURL
            </span>
          </Link>
        </div>

        <div className="flex-1 flex justify-end">
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors hover:text-foreground/80 ${
                  pathname?.startsWith(item.href)
                    ? 'text-foreground'
                    : 'text-foreground/60'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
