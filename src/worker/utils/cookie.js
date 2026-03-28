export const SESSION_COOKIE_NAME = '__Host-up_session'

export function setSessionCookie(token, maxAge) {
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

export function getSessionToken(request) {
  const cookie = request.headers.get('Cookie') || ''
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`),
  )
  return match ? match[1] : null
}

export function getBearerToken(request) {
  const header = request.headers.get('Authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}
