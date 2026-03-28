const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at)',
  `CREATE TABLE IF NOT EXISTS user_api_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token_prefix TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER,
    revoked_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  'CREATE INDEX IF NOT EXISTS idx_user_api_tokens_user_id ON user_api_tokens (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_user_api_tokens_hash ON user_api_tokens (token_hash)',
  `CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    user_id TEXT REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_at INTEGER NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
  )`,
  'CREATE INDEX IF NOT EXISTS idx_files_collection_id ON files (collection_id)',
]

const schemaReadyByDb = new WeakMap()

export async function ensureSchema(env) {
  if (!env?.DB) return

  let schemaReadyPromise = schemaReadyByDb.get(env.DB)

  if (!schemaReadyPromise) {
    schemaReadyPromise = env.DB.batch(
      SCHEMA_STATEMENTS.map((statement) => env.DB.prepare(statement)),
    ).catch((error) => {
      schemaReadyByDb.delete(env.DB)
      throw error
    })

    schemaReadyByDb.set(env.DB, schemaReadyPromise)
  }

  await schemaReadyPromise
}
