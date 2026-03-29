function getConfiguredOrigins(env) {
  if (!env.CORS) return []

  return env.CORS.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function getAllowedOrigin(request, env) {
  const requestOrigin = request?.headers?.get('Origin')

  if (!env.CORS) {
    return '*'
  }

  if (!requestOrigin) {
    return getConfiguredOrigins(env)[0] || '*'
  }

  return getConfiguredOrigins(env).includes(requestOrigin)
    ? requestOrigin
    : null
}

export const corsHeaders = (env, request) => {
  const allowedOrigin = getAllowedOrigin(request, env)
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, X-Up-Filename, X-Up-Title',
    'Access-Control-Allow-Credentials': 'true',
  }

  if (env.CORS) {
    headers.Vary = 'Origin'
  }

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin
  }

  return headers
}
