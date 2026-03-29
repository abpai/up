import { corsHeaders } from '../utils/cors'
import { getBearerToken } from '../utils/cookie'

function getAllowedOrigins(request, env) {
  const origins = new Set()
  const requestUrl = new URL(request.url)

  origins.add(requestUrl.origin)

  if (
    requestUrl.hostname === 'localhost' ||
    requestUrl.hostname === '127.0.0.1'
  ) {
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
    const allowedOrigins = getAllowedOrigins(request, env)

    if (origin && allowedOrigins.has(origin)) {
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
