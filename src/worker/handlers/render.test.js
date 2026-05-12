import { describe, expect, it, vi } from 'vitest'
import { handleRender } from './render'

function createEnv() {
  return {
    DB: {
      prepare() {
        return {
          bind() {
            return {
              first: async () => null,
            }
          },
        }
      },
    },
    ASSETS: {
      fetch: vi.fn(
        async () =>
          new Response(
            '<!doctype html><html><head></head><body></body></html>',
            {
              headers: { 'Content-Type': 'text/html' },
            },
          ),
      ),
    },
  }
}

describe('handleRender', () => {
  it('loads the SPA shell from the root asset route', async () => {
    const env = createEnv()
    const response = await handleRender(
      {
        url: 'https://up.example.com/c/collection-123',
        params: { id: 'collection-123' },
      },
      env,
    )

    expect(response.status).toBe(200)
    const [assetRequest] = env.ASSETS.fetch.mock.calls[0]
    expect(new URL(assetRequest.url).pathname).toBe('/')
    expect(assetRequest.method).toBe('GET')
  })
})
