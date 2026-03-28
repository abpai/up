import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { uploadSingleFile } from '../lib/upload.js'

test('uploads a single file through raw PUT', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'up-upload-'))
  const filepath = join(dir, 'hello.txt')
  await writeFile(filepath, 'hello world', 'utf8')

  let request
  const response = await uploadSingleFile(
    'https://up.example.com',
    filepath,
    { authToken: 'up_token' },
    async (url, init) => {
      request = { url, init }
      return new Response(
        JSON.stringify({ shareUrl: 'https://up.example.com/c/123' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  )

  assert.equal(request.url, 'https://up.example.com/api/upload')
  assert.equal(request.init.method, 'PUT')
  assert.equal(request.init.headers['X-Up-Filename'], 'hello.txt')
  assert.equal(request.init.headers.Authorization, 'Bearer up_token')
  assert.equal(response.shareUrl, 'https://up.example.com/c/123')
})
