import { describe, expect, it } from 'vitest'
import worker from './index'

describe('worker fetch', () => {
  it('responds to /api/auth/me without hanging', async () => {
    const response = await worker.fetch(
      new Request('https://up.example.com/api/auth/me'),
      { CORS: '*' },
      {},
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ user: null })
  })
})
