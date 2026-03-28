import { getDB } from './db'

const PBKDF2_ITERATIONS = 100000
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000
const API_TOKEN_PREFIX = 'up_'

function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function fromBase64(str) {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function deriveKey(password, salt) {
  const encoded = new TextEncoder().encode(password)
  const key = await crypto.subtle.importKey('raw', encoded, 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return bits
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const derived = await deriveKey(password, salt.buffer)
  return { hash: toBase64(derived), salt: toBase64(salt.buffer) }
}

export async function verifyPassword(password, storedHash, storedSalt) {
  const salt = fromBase64(storedSalt)
  const derived = await deriveKey(password, salt)
  const derivedB64 = toBase64(derived)

  // Timing-safe comparison
  if (derivedB64.length !== storedHash.length) return false
  const a = new TextEncoder().encode(derivedB64)
  const b = new TextEncoder().encode(storedHash)
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    // eslint-disable-next-line no-bitwise
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

async function hashOpaqueToken(token) {
  const encoded = new TextEncoder().encode(token)
  return toHex(await crypto.subtle.digest('SHA-256', encoded))
}

export async function createSession(env, userId, ctx) {
  const db = getDB(env)
  const token = crypto.randomUUID()
  const tokenHash = await hashOpaqueToken(token)
  const now = Date.now()
  const expiresAt = now + SESSION_TTL

  await db
    .prepare(
      'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    )
    .bind(tokenHash, userId, now, expiresAt)
    .run()

  if (ctx) {
    ctx.waitUntil(
      db
        .prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < ?')
        .bind(userId, now)
        .run(),
    )
  }

  return { token, expiresAt, maxAge: Math.floor(SESSION_TTL / 1000) }
}

export async function validateSession(env, token) {
  const db = getDB(env)
  const tokenHash = await hashOpaqueToken(token)
  const row = await db
    .prepare(
      'SELECT u.id, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > ?',
    )
    .bind(tokenHash, Date.now())
    .first()

  return row || null
}

export async function deleteSession(env, token) {
  const db = getDB(env)
  const tokenHash = await hashOpaqueToken(token)
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(tokenHash).run()
}

function createPlaintextApiToken() {
  const first = crypto.randomUUID().replace(/-/g, '')
  const second = crypto.randomUUID().replace(/-/g, '')
  return `${API_TOKEN_PREFIX}${first}${second.slice(0, 12)}`
}

export async function createApiToken(env, userId, name = 'CLI token') {
  const db = getDB(env)
  const token = createPlaintextApiToken()
  const tokenHash = await hashOpaqueToken(token)
  const tokenId = crypto.randomUUID()
  const now = Date.now()
  const tokenPrefix = token.slice(0, 12)

  await db
    .prepare(
      `INSERT INTO user_api_tokens
       (id, user_id, name, token_prefix, token_hash, created_at, last_used_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    )
    .bind(tokenId, userId, name, tokenPrefix, tokenHash, now, null)
    .run()

  return {
    id: tokenId,
    name,
    token,
    tokenPrefix,
    createdAt: now,
    lastUsedAt: null,
  }
}

export async function validateApiToken(env, token) {
  if (!token) return null

  const db = getDB(env)
  const tokenHash = await hashOpaqueToken(token)
  const row = await db
    .prepare(
      `SELECT t.id as token_id, u.id, u.email
       FROM user_api_tokens t
       JOIN users u ON t.user_id = u.id
       WHERE t.token_hash = ? AND t.revoked_at IS NULL`,
    )
    .bind(tokenHash)
    .first()

  if (!row) return null

  await db
    .prepare('UPDATE user_api_tokens SET last_used_at = ? WHERE id = ?')
    .bind(Date.now(), row.token_id)
    .run()

  return { id: row.id, email: row.email }
}

export async function listApiTokens(env, userId) {
  const db = getDB(env)
  const { results } = await db
    .prepare(
      `SELECT id, name, token_prefix, created_at, last_used_at, revoked_at
       FROM user_api_tokens
       WHERE user_id = ? AND revoked_at IS NULL
       ORDER BY created_at DESC`,
    )
    .bind(userId)
    .all()

  return results
}

export async function revokeApiToken(env, userId, tokenId) {
  const db = getDB(env)
  const result = await db
    .prepare(
      'UPDATE user_api_tokens SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL',
    )
    .bind(Date.now(), tokenId, userId)
    .run()

  return result.meta.changes > 0
}
