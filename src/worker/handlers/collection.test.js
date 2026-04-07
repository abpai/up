import { describe, expect, it } from 'vitest'
import { handleGetCollection } from './collection'

function createEnv() {
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
})
