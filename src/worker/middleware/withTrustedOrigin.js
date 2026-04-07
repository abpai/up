import { corsHeaders } from '../utils/cors'
import { getBearerToken } from '../utils/cookie'

function isLoopbackHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]'
  )
}

function isLoopbackOrigin(origin) {
  if (!origin) return false

  try {
    return isLoopbackHost(new URL(origin).hostname)
  } catch {
    return false
  }
}

function getAllowedOrigins(requestUrl, env) {
  const origins = new Set()

  origins.add(requestUrl.origin)

  if (isLoopbackHost(requestUrl.hostname)) {
    origins.add('http://localhost:5173')
    origins.add('http://127.0.0.1:5173')
  }

  if (env.CORS) {
    env.CORS.split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => origins.add(value))
  }

  return origins
}

export const withTrustedOrigin =
  (handler, options = { allowBearer: false }) =>
  async (request, env, ctx) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return handler(request, env, ctx)
    }

    if (options.allowBearer && getBearerToken(request)) {
      return handler(request, env, ctx)
    }

    const origin = request.headers.get('Origin')
    const requestUrl = new URL(request.url)
    const isLocal = isLoopbackHost(requestUrl.hostname)

    if (isLocal && (!origin || isLoopbackOrigin(origin))) {
      return handler(request, env, ctx)
    }

    if (origin && getAllowedOrigins(requestUrl, env).has(origin)) {
      return handler(request, env, ctx)
    }

    return new Response(JSON.stringify({ error: 'Forbidden origin' }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(env, request),
      },
    })
  }
