import { getDB } from '../services/db'
import { corsHeaders } from '../utils/cors'

function encodeContentDispositionFilename(filename) {
  return encodeURIComponent(filename).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

function buildContentDisposition(disposition, filename) {
  const safeFilename = (filename || 'download').replace(/[\r\n"\\]/g, '_')
  const encodedFilename = encodeContentDispositionFilename(
    filename || safeFilename,
  )

  return `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
}

function getDisposition(request, fileRecord) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('download') === '1') return 'attachment'
  return fileRecord.type?.startsWith('image/') ? 'inline' : 'attachment'
}

export const handleGetFile = async (request, env) => {
  const { id } = request.params
  const db = getDB(env)

  try {
    // 1. Get file metadata to find R2 key
    const fileRecord = await db
      .prepare('SELECT * FROM files WHERE id = ?')
      .bind(id)
      .first()

    if (!fileRecord) {
      return new Response('File not found', {
        status: 404,
        headers: corsHeaders(env),
      })
    }

    // 2. Get file from R2
    const object = await env.BUCKET.get(fileRecord.r2_key)

    if (!object) {
      return new Response('File content not found', {
        status: 404,
        headers: corsHeaders(env),
      })
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)

    headers.set(
      'Content-Disposition',
      buildContentDisposition(
        getDisposition(request, fileRecord),
        fileRecord.name,
      ),
    )
    headers.set('X-Content-Type-Options', 'nosniff')

    // CORS
    const cors = corsHeaders(env)
    Object.keys(cors).forEach((key) => {
      headers.set(key, cors[key])
    })

    return new Response(object.body, {
      headers,
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return new Response('Error serving file', {
      status: 500,
      headers: corsHeaders(env),
    })
  }
}

export const handleRenameFile = async (request, env) => {
  const { id } = request.params
  const db = getDB(env)

  try {
    const { name } = await request.json()

    if (!name || typeof name !== 'string') {
      return new Response('Invalid name', {
        status: 400,
        headers: corsHeaders(env),
      })
    }

    // Update name in D1
    const result = await db
      .prepare(
        `UPDATE files
         SET name = ?
         WHERE id = ?
           AND collection_id IN (
             SELECT id FROM collections WHERE user_id = ?
           )`,
      )
      .bind(name, id, request.user.id)
      .run()

    if (result.meta.changes === 0) {
      return new Response('File not found', {
        status: 404,
        headers: corsHeaders(env),
      })
    }

    return new Response(JSON.stringify({ success: true, name }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
    })
  } catch (error) {
    console.error('Error renaming file:', error)
    return new Response('Error renaming file', {
      status: 500,
      headers: corsHeaders(env),
    })
  }
}
