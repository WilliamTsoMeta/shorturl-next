import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 定义公开路由
const publicRoutes = ['/login', '/signup']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {


    // 获取并检查会话
    const { data: { session } } = await supabase.auth.getSession()

    // 如果是公开路由，直接通过
    if (publicRoutes.includes(req.nextUrl.pathname)) {
      console.log('Public route, allowing access')
      return res
    }

    // 如果访问 link_list 并且有 session，允许访问
    if (req.nextUrl.pathname === '/link_list' && session) {
      console.log('Authenticated user accessing link_list')
      return res
    }

    // 如果没有 session，重定向到登录页
    if (!session) {
      console.log('No session found, redirecting to login')
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // 其他情况允许访问
    return res

  } catch (error) {
    console.error('Middleware error:', error)
    // 发生错误时重定向到登录页
    return NextResponse.redirect(new URL('/login', req.url))
  }
}

// 更新 matcher 配置，排除静态资源
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
