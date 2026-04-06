import { describe, expect, it, vi } from 'vitest'
import { handleUpload } from './upload'

function createEnv() {
  return {
    CORS: '*',
    BUCKET: {
      put: vi.fn(async () => undefined),
    },
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              sql,
              args,
              run: async () => ({ meta: { changes: 1 } }),
            }
          },
        }
      },
      batch: vi.fn(async () => undefined),
    },
  }
}

describe('handleUpload', () => {
  it('accepts raw uploads and returns CLI-friendly fields', async () => {
    const env = createEnv()
    const request = new Request('https://up.example.com/api/upload', {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
        'X-Up-Filename': 'hello.txt',
      },
      body: 'hello world',
    })

    const response = await handleUpload(request, env)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.shareUrl).toMatch(/^https:\/\/up\.example\.com\/c\//)
    expect(body.fileUrl).toMatch(/^https:\/\/up\.example\.com\/api\/file\//)
    expect(body.files).toHaveLength(1)
    expect(body.files[0].name).toBe('hello.txt')
    expect(env.BUCKET.put).toHaveBeenCalledTimes(1)
    expect(env.BUCKET.put.mock.calls[0][2]).toEqual({
      httpMetadata: {
        contentType: 'application/octet-stream',
      },
    })
  })

  it('accepts multipart uploads and omits fileUrl for collections', async () => {
    const env = createEnv()
    const formData = new FormData()
    formData.append(
      'file',
      new Blob(['one'], { type: 'text/plain' }),
      'one.txt',
    )
    formData.append(
      'file',
      new Blob(['two'], { type: 'text/plain' }),
      'two.txt',
    )

    const request = {
      method: 'POST',
      url: 'https://up.example.com/api/upload',
      formData: async () => formData,
    }

    const response = await handleUpload(request, env)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.count).toBe(2)
    expect(body.shareUrl).toMatch(/^https:\/\/up\.example\.com\/c\//)
    expect(body.fileUrl).toBeUndefined()
    expect(body.files).toHaveLength(2)
    expect(env.BUCKET.put).toHaveBeenCalledTimes(2)
  })

  it('rejects raw uploads without a filename header', async () => {
    const env = createEnv()
    const request = new Request('https://up.example.com/api/upload', {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: 'hello world',
    })

    const response = await handleUpload(request, env)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/filename/i)
  })
})
