import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(req: NextRequest) {
  // Check if we are in production environment (or if user wants it everywhere)
  // The user wants the "first url" (production) to be authenticated.
  
  const basicAuth = req.headers.get('authorization')
  
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, pwd] = atob(authValue).split(':')
 
    // Secure credentials - ideally from env vars
    const validUser = process.env.BASIC_AUTH_USER ?? 'admin'
    const validPass = process.env.BASIC_AUTH_PASSWORD ?? 'password'
 
    if (user === validUser && pwd === validPass) {
      return NextResponse.next()
    }
  }
 
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  })
}
 
// Match all paths except static files and api routes if needed (though API routes should arguably be protected too)
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
