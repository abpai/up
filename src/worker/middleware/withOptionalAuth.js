import { validateApiToken, validateSession } from '../services/auth'
import { getBearerToken, getSessionToken } from '../utils/cookie'

export const withOptionalAuth = (handler) => async (request, env, ctx) => {
  const bearerToken = getBearerToken(request)
  if (bearerToken) {
    const user = await validateApiToken(env, bearerToken)
    if (user) {
      request.user = user
      request.authType = 'api_token'
    }
    return handler(request, env, ctx)
  }

  const token = getSessionToken(request)
  if (token) {
    const user = await validateSession(env, token)
    if (user) {
      request.user = user
      request.authType = 'session'
    }
  }

  return handler(request, env, ctx)
}
