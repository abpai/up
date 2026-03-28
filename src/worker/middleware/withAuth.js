import { validateApiToken, validateSession } from '../services/auth'
import {
  getBearerToken,
  getSessionToken,
  clearSessionCookie,
} from '../utils/cookie'
import { jsonResponse } from '../utils/response'

export const withAuth = (handler) => async (request, env, ctx) => {
  const bearerToken = getBearerToken(request)
  if (bearerToken) {
    const user = await validateApiToken(env, bearerToken)
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, env, 401)
    }

    request.user = user
    request.authType = 'api_token'
    return handler(request, env, ctx)
  }

  const token = getSessionToken(request)
  if (!token) {
    return jsonResponse({ error: 'Unauthorized' }, env, 401)
  }

  const user = await validateSession(env, token)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, env, 401, {
      'Set-Cookie': clearSessionCookie(),
    })
  }

  request.user = user
  request.authType = 'session'
  return handler(request, env, ctx)
}
