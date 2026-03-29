import { describe, expect, it } from 'vitest'
import { corsHeaders, getAllowedOrigin } from './cors'

describe('cors utilities', () => {
  it('returns the matching origin from a comma-separated allowlist', () => {
    const env = {
      CORS: 'https://up.andyp.ai,https://up.andypai.me',
    }
    const request = new Request('https://api.example.com/api/auth/me', {
      headers: {
        Origin: 'https://up.andypai.me',
      },
    })

    expect(getAllowedOrigin(request, env)).toBe('https://up.andypai.me')
    expect(corsHeaders(env, request)['Access-Control-Allow-Origin']).toBe(
      'https://up.andypai.me',
    )
    expect(corsHeaders(env, request).Vary).toBe('Origin')
  })

  it('omits the allow-origin header for disallowed origins', () => {
    const env = {
      CORS: 'https://up.andyp.ai,https://up.andypai.me',
    }
    const request = new Request('https://api.example.com/api/auth/me', {
      headers: {
        Origin: 'https://evil.example.com',
      },
    })

    expect(getAllowedOrigin(request, env)).toBeNull()
    expect(
      corsHeaders(env, request)['Access-Control-Allow-Origin'],
    ).toBeUndefined()
  })
})
