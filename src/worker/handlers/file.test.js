import { describe, expect, it, vi } from 'vitest'
import { handleGetFile } from './file'

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
