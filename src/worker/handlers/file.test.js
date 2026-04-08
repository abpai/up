import { describe, expect, it, vi } from 'vitest'
import { handleGetFile, handleDeleteFile, handleRenameFile } from './file'

function createEnv({ filename = 'image.png', type = 'image/png' } = {}) {
  return {
    CORS: '*',
    DB: {
      prepare() {
        return {
          bind() {
            return {
              first: async () => ({
                id: 'file-123',
                name: filename,
                r2_key: 'collection-123/file-123',
                type,
              }),
            }
          },
        }
      },
    },
    BUCKET: {
      get: vi.fn(async () => ({
        body: 'file-body',
        httpEtag: '"etag-123"',
        writeHttpMetadata(headers) {
          headers.set('Content-Type', type)
        },
      })),
    },
  }
}

function createRequest(url) {
  return {
    url,
    params: { id: 'file-123' },
  }
}

describe('handleGetFile', () => {
  it('serves images inline by default', async () => {
    const env = createEnv()
    const response = await handleGetFile(
      createRequest('https://up.example.com/api/file/file-123'),
      env,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Content-Disposition')).toContain('inline;')
    expect(response.headers.get('Content-Disposition')).toContain(
      'filename="image.png"',
    )
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('serves attachment content when download=1 is requested', async () => {
    const env = createEnv({
      filename: "quarterly report (final)*'.png",
    })
    const response = await handleGetFile(
      createRequest('https://up.example.com/api/file/file-123?download=1'),
      env,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Disposition')).toContain('attachment;')
    expect(response.headers.get('Content-Disposition')).toContain(
      `filename="quarterly report (final)*'.png"`,
    )
    expect(response.headers.get('Content-Disposition')).toContain(
      "filename*=UTF-8''quarterly%20report%20%28final%29%2A%27.png",
    )
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('serves non-image files as attachments by default', async () => {
    const env = createEnv({
      filename: 'evil".html',
      type: 'text/html',
    })
    const response = await handleGetFile(
      createRequest('https://up.example.com/api/file/file-123'),
      env,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Disposition')).toContain('attachment;')
    expect(response.headers.get('Content-Disposition')).toContain(
      'filename="evil_.html"',
    )
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })
})

describe('handleDeleteFile', () => {
  function createDeleteEnv({ fileExists = true, r2Fails = false } = {}) {
    const deletedRows = []
    const deletedR2Keys = []

    return {
      env: {
        CORS: '*',
        DB: {
          prepare(sql) {
            return {
              bind(...args) {
                if (sql.includes('SELECT')) {
                  return {
                    first: async () =>
                      fileExists
                        ? {
                            id: 'file-123',
                            r2_key: 'collection-123/file-123',
                          }
                        : null,
                  }
                }
                if (sql.includes('DELETE')) {
                  deletedRows.push(args[0])
                  return {
                    run: async () => ({ meta: { changes: 1 } }),
                  }
                }
                return { run: async () => ({}) }
              },
            }
          },
        },
        BUCKET: {
          delete: vi.fn(async (key) => {
            if (r2Fails) throw new Error('R2 failure')
            deletedR2Keys.push(key)
          }),
        },
      },
      deletedRows,
      deletedR2Keys,
    }
  }

  it('deletes file with valid owner auth', async () => {
    const { env, deletedRows, deletedR2Keys } = createDeleteEnv()
    const request = {
      params: { id: 'file-123' },
      user: { id: 'user-1', email: 'owner@example.com' },
    }

    const response = await handleDeleteFile(request, env)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(deletedRows).toContain('file-123')
    expect(deletedR2Keys).toContain('collection-123/file-123')
  })

  it('returns 404 for non-owned file', async () => {
    const { env } = createDeleteEnv({ fileExists: false })
    const request = {
      params: { id: 'file-123' },
      user: { id: 'user-2', email: 'other@example.com' },
    }

    const response = await handleDeleteFile(request, env)

    expect(response.status).toBe(404)
  })

  it('returns 404 on second delete (idempotent)', async () => {
    const { env } = createDeleteEnv({ fileExists: false })
    const request = {
      params: { id: 'file-123' },
      user: { id: 'user-1', email: 'owner@example.com' },
    }

    const response = await handleDeleteFile(request, env)

    expect(response.status).toBe(404)
  })

  it('succeeds even when R2 delete fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { env } = createDeleteEnv({ r2Fails: true })
    const request = {
      params: { id: 'file-123' },
      user: { id: 'user-1', email: 'owner@example.com' },
    }

    const response = await handleDeleteFile(request, env)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      'R2 delete failed:',
      expect.any(Error),
    )

    consoleSpy.mockRestore()
  })

  it('calls R2 delete with correct key', async () => {
    const { env } = createDeleteEnv()
    const request = {
      params: { id: 'file-123' },
      user: { id: 'user-1', email: 'owner@example.com' },
    }

    await handleDeleteFile(request, env)

    expect(env.BUCKET.delete).toHaveBeenCalledWith('collection-123/file-123')
  })
})

describe('handleRenameFile', () => {
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

  it('trims names before saving', async () => {
    const { env, updateCalls } = createRenameEnv()
    const request = {
      params: { id: 'file-123' },
      user: { id: 'user-1', email: 'owner@example.com' },
      json: async () => ({ name: '  invoice.pdf  ' }),
    }

    const response = await handleRenameFile(request, env)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.name).toBe('invoice.pdf')
    expect(updateCalls).toEqual([['invoice.pdf', 'file-123', 'user-1']])
  })

  it('rejects whitespace-only names', async () => {
    const { env, updateCalls } = createRenameEnv()
    const request = {
      params: { id: 'file-123' },
      user: { id: 'user-1', email: 'owner@example.com' },
      json: async () => ({ name: '   ' }),
    }

    const response = await handleRenameFile(request, env)

    expect(response.status).toBe(400)
    expect(updateCalls).toEqual([])
  })
})
