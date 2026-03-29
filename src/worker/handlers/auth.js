import { getDB } from '../services/db'
import {
  createApiToken,
  hashPassword,
  createSession,
  deleteSession,
  listApiTokens,
  revokeApiToken,
  validateSession,
  verifyPassword,
} from '../services/auth'
import {
  setSessionCookie,
  clearSessionCookie,
  getSessionToken,
} from '../utils/cookie'
import { jsonResponse } from '../utils/response'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const handleSignup = async (request, env, ctx) => {
  try {
    const { email, password } = await request.json()

    if (!email || !EMAIL_RE.test(email)) {
      return jsonResponse({ error: 'Invalid email' }, env, request, 400)
    }
    if (!password || password.length < 8) {
      return jsonResponse(
        { error: 'Password must be at least 8 characters' },
        env,
        request,
        400,
      )
    }

    const db = getDB(env)
    const existing = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first()

    if (existing) {
      return jsonResponse(
        { error: 'Email already registered' },
        env,
        request,
        409,
      )
    }

    const userId = crypto.randomUUID()
    const { hash, salt } = await hashPassword(password)

    await db
      .prepare(
        'INSERT INTO users (id, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(userId, email.toLowerCase(), hash, salt, Date.now())
      .run()

    const session = await createSession(env, userId, ctx)

    return jsonResponse(
      { user: { id: userId, email: email.toLowerCase() } },
      env,
      request,
      201,
      { 'Set-Cookie': setSessionCookie(session.token, session.maxAge) },
    )
  } catch (error) {
    console.error('Signup error:', error)
    return jsonResponse({ error: 'Signup failed' }, env, request, 500)
  }
}

export const handleLogin = async (request, env, ctx) => {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return jsonResponse(
        { error: 'Email and password required' },
        env,
        request,
        400,
      )
    }

    const db = getDB(env)
    const user = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first()

    if (!user) {
      return jsonResponse(
        { error: 'Invalid email or password' },
        env,
        request,
        401,
      )
    }

    const valid = await verifyPassword(password, user.password_hash, user.salt)
    if (!valid) {
      return jsonResponse(
        { error: 'Invalid email or password' },
        env,
        request,
        401,
      )
    }

    const session = await createSession(env, user.id, ctx)

    return jsonResponse(
      { user: { id: user.id, email: user.email } },
      env,
      request,
      200,
      { 'Set-Cookie': setSessionCookie(session.token, session.maxAge) },
    )
  } catch (error) {
    console.error('Login error:', error)
    return jsonResponse({ error: 'Login failed' }, env, request, 500)
  }
}

export const handleLogout = async (request, env) => {
  const token = getSessionToken(request)
  if (token) {
    await deleteSession(env, token)
  }
  return jsonResponse({ ok: true }, env, request, 200, {
    'Set-Cookie': clearSessionCookie(),
  })
}

export const handleMe = async (request, env) => {
  const token = getSessionToken(request)
  if (!token) {
    return jsonResponse({ user: null }, env, request)
  }

  const user = await validateSession(env, token)
  if (!user) {
    return jsonResponse({ user: null }, env, request, 200, {
      'Set-Cookie': clearSessionCookie(),
    })
  }

  return jsonResponse(
    { user: { id: user.id, email: user.email } },
    env,
    request,
  )
}

export const handleListTokens = async (request, env) => {
  try {
    const tokens = await listApiTokens(env, request.user.id)
    return jsonResponse(
      {
        tokens: tokens.map((token) => ({
          id: token.id,
          name: token.name,
          tokenPrefix: token.token_prefix,
          createdAt: token.created_at,
          lastUsedAt: token.last_used_at,
        })),
      },
      env,
      request,
    )
  } catch (error) {
    console.error('Token list error:', error)
    return jsonResponse(
      { error: 'Failed to load API tokens' },
      env,
      request,
      500,
    )
  }
}

export const handleCreateToken = async (request, env) => {
  try {
    const body = await request.json().catch(() => ({}))
    const name =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : 'CLI token'

    const token = await createApiToken(env, request.user.id, name)

    return jsonResponse(
      {
        token: {
          id: token.id,
          name: token.name,
          tokenPrefix: token.tokenPrefix,
          createdAt: token.createdAt,
          lastUsedAt: token.lastUsedAt,
        },
        plaintextToken: token.token,
      },
      env,
      request,
      201,
    )
  } catch (error) {
    console.error('Token create error:', error)
    return jsonResponse(
      { error: 'Failed to create API token' },
      env,
      request,
      500,
    )
  }
}

export const handleRevokeToken = async (request, env) => {
  try {
    const revoked = await revokeApiToken(
      env,
      request.user.id,
      request.params.id,
    )
    if (!revoked) {
      return jsonResponse({ error: 'Token not found' }, env, request, 404)
    }

    return jsonResponse({ ok: true }, env, request)
  } catch (error) {
    console.error('Token revoke error:', error)
    return jsonResponse(
      { error: 'Failed to revoke API token' },
      env,
      request,
      500,
    )
  }
}
