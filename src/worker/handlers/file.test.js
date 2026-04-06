import { describe, expect, it, vi } from 'vitest'
import { handleGetFile } from './file'

describe('handleGetFile', () => {
  it('forces attachment and nosniff headers for served files', async () => {
    const env = {
      CORS: '*',
      DB: {
        prepare() {
          return {
            bind() {
              return {
                first: async () => ({
                  id: 'file-id',
                  name: 'evil".html',
                  r2_key: 'collection/file-id',
                }),
              }
            },
          }
        },
      },
      BUCKET: {
        get: vi.fn(async () => ({
          body: 'file contents',
          httpEtag: 'etag-value',
          writeHttpMetadata(headers) {
            headers.set('Content-Type', 'text/html')
          },
        })),
      },
    }

    const response = await handleGetFile({ params: { id: 'file-id' } }, env)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Disposition')).toContain('attachment;')
    expect(response.headers.get('Content-Disposition')).toContain(
      'filename="evil_.html"',
    )
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })
})
