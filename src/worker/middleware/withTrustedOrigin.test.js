import { describe, expect, it, vi } from 'vitest'
import { withTrustedOrigin } from './withTrustedOrigin'

function createRequest(url, options = {}) {
  return new Request(url, {
    method: 'POST',
    body: JSON.stringify({ ok: true }),
    headers: {
      'Content-Type': 'application/json',
      ...(options.origin ? { Origin: options.origin } : {}),
      ...(options.authorization
        ? { Authorization: options.authorization }
        : {}),
    },
  })
}

describe('withTrustedOrigin', () => {
  it('allows loopback dev origins on any local port', async () => {
    const handler = vi.fn(async () => new Response('ok'))
    const request = createRequest('http://localhost:8787/api/auth/login', {
      origin: 'http://localhost:4173',
    })

    const response = await withTrustedOrigin(handler)(request, { CORS: '' }, {})

    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('allows loopback requests without an origin header in local dev', async () => {
    const handler = vi.fn(async () => new Response('ok'))
    const request = createRequest('http://127.0.0.1:8787/api/auth/signup')

    const response = await withTrustedOrigin(handler)(request, { CORS: '' }, {})

    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('allows ipv6 loopback origins in local dev', async () => {
    const handler = vi.fn(async () => new Response('ok'))
    const request = createRequest('http://[::1]:8787/api/auth/login', {
      origin: 'http://[::1]:5174',
    })

    const response = await withTrustedOrigin(handler)(request, { CORS: '' }, {})

    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('rejects non-loopback origins when running locally', async () => {
    const handler = vi.fn(async () => new Response('ok'))
    const request = createRequest('http://localhost:8787/api/auth/login', {
      origin: 'https://evil.example.com',
    })

    const response = await withTrustedOrigin(handler)(request, { CORS: '' }, {})

    expect(response.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: 'Forbidden origin',
    })
  })
})
