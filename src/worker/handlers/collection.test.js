import { describe, expect, it } from 'vitest'
import { handleGetCollection, handleRenameCollection } from './collection'

function createEnv({ userId = null } = {}) {
  return {
    CORS: '*',
    DB: {
      prepare(sql) {
        return {
          bind(id) {
            if (sql.includes('FROM collections')) {
              return {
                first: async () => ({
                  id,
                  title: 'image.png',
                  created_at: 1712512800000,
                  user_id: userId,
                }),
              }
            }

            return {
              all: async () => ({
                results: [
                  {
                    id: 'file-123',
                    name: 'image.png',
                    type: 'image/png',
                    size: 173056,
                  },
                ],
              }),
            }
          },
        }
      },
    },
  }
}

describe('handleGetCollection', () => {
  it('includes a forced-download URL for each file', async () => {
    const env = createEnv()
    const request = {
      url: 'https://up.example.com/api/collection/collection-123',
      params: { id: 'collection-123' },
    }

    const response = await handleGetCollection(request, env)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.fileUrl).toBe('/api/file/file-123')
    expect(body.files).toEqual([
      {
        id: 'file-123',
        name: 'image.png',
        type: 'image/png',
        size: 173056,
        url: '/api/file/file-123',
        downloadUrl: '/api/file/file-123?download=1',
      },
    ])
  })

  it('returns isOwner false when no auth', async () => {
    const env = createEnv({ userId: 'user-1' })
    const request = {
      url: 'https://up.example.com/api/collection/collection-123',
      params: { id: 'collection-123' },
    }

    const response = await handleGetCollection(request, env)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.isOwner).toBe(false)
  })

  it('returns isOwner true when authenticated as owner', async () => {
    const env = createEnv({ userId: 'user-1' })
    const request = {
      url: 'https://up.example.com/api/collection/collection-123',
      params: { id: 'collection-123' },
      user: { id: 'user-1', email: 'owner@example.com' },
    }

    const response = await handleGetCollection(request, env)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.isOwner).toBe(true)
  })

  it('returns isOwner false when authenticated as non-owner', async () => {
    const env = createEnv({ userId: 'user-1' })
    const request = {
      url: 'https://up.example.com/api/collection/collection-123',
      params: { id: 'collection-123' },
      user: { id: 'user-2', email: 'other@example.com' },
    }

    const response = await handleGetCollection(request, env)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.isOwner).toBe(false)
  })

  it('includes auth-aware Vary headers', async () => {
    const env = createEnv()
    const request = {
      url: 'https://up.example.com/api/collection/collection-123',
      params: { id: 'collection-123' },
      headers: new Headers({ Origin: 'https://up.example.com' }),
    }

    const response = await handleGetCollection(request, env)

    expect(response.headers.get('Vary')).toContain('Authorization')
    expect(response.headers.get('Vary')).toContain('Cookie')
    expect(response.headers.get('Vary')).toContain('Origin')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60')
  })
})

describe('handleRenameCollection', () => {
  function createRenameEnv({ changes = 1 } = {}) {
    const updateCalls = []

    return {
      env: {
        CORS: '*',
        DB: {
          prepare() {
            return {
              bind(...args) {
                updateCalls.push(args)
                return {
                  run: async () => ({ meta: { changes } }),
                }
              },
            }
          },
        },
      },
      updateCalls,
    }
  }

  it('trims titles before saving', async () => {
    const { env, updateCalls } = createRenameEnv()
    const request = {
      params: { id: 'collection-123' },
      user: { id: 'user-1', email: 'owner@example.com' },
      json: async () => ({ title: '  Vacation Photos  ' }),
    }

    const response = await handleRenameCollection(request, env)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.title).toBe('Vacation Photos')
    expect(updateCalls).toEqual([
      ['Vacation Photos', 'collection-123', 'user-1'],
    ])
  })

  it('rejects whitespace-only titles', async () => {
    const { env, updateCalls } = createRenameEnv()
    const request = {
      params: { id: 'collection-123' },
      user: { id: 'user-1', email: 'owner@example.com' },
      json: async () => ({ title: '   ' }),
    }

    const response = await handleRenameCollection(request, env)

    expect(response.status).toBe(400)
    expect(updateCalls).toEqual([])
  })
})
