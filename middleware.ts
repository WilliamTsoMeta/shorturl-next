import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 如果用户已登录且访问登录页，重定向到首页
  if (session && ['/login', '/signup'].includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // 如果用户未登录且访问需要认证的页面，重定向到登录页
  if (!session && 
      !req.nextUrl.pathname.startsWith('/login') && 
      !req.nextUrl.pathname.startsWith('/signup') &&
      !req.nextUrl.pathname.startsWith('/_next') &&
      !req.nextUrl.pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
