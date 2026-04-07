import { getDB } from '../services/db'
import { jsonResponse } from '../utils/response'

const MAX_FILE_SIZE = 100 * 1024 * 1024
const DEFAULT_CONTENT_TYPE = 'application/octet-stream'

function getCollectionTitle(files, titleOverride) {
  if (typeof titleOverride === 'string' && titleOverride.trim()) {
    return titleOverride.trim()
  }

  const [first] = files
  if (!first) return 'Untitled upload'

  return (
    first.name + (files.length > 1 ? ` and ${files.length - 1} others` : '')
  )
}

function createManifest(request, collectionId, title, files) {
  const { origin } = new URL(request.url)
  const manifestFiles = files.map((file) => ({
    id: file.id,
    name: file.name,
    type: file.type,
    size: file.size,
    url: `${origin}/api/file/${file.id}`,
    downloadUrl: `${origin}/api/file/${file.id}?download=1`,
  }))
  const manifest = {
    id: collectionId,
    title,
    createdAt: files[0]?.uploaded_at ?? Date.now(),
    count: manifestFiles.length,
    shareUrl: `${origin}/c/${collectionId}`,
    files: manifestFiles,
  }

  if (manifestFiles.length === 1) {
    manifest.fileUrl = manifestFiles[0].url
  }

  return manifest
}

function validateFiles(files) {
  if (!files || files.length === 0) {
    return { error: 'No files found' }
  }

  const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE)
  if (oversizedFiles.length > 0) {
    return {
      error: `Files exceed 100MB limit: ${oversizedFiles.map((file) => file.name).join(', ')}`,
    }
  }

  return null
}

async function persistUpload(request, env, inputFiles, titleOverride) {
  const collectionId = crypto.randomUUID()
  const uploadedAt = Date.now()
  const db = getDB(env)

  const uploadedFiles = await Promise.all(
    inputFiles.map(async (file) => {
      const fileId = crypto.randomUUID()
      const key = `${collectionId}/${fileId}`

      await env.BUCKET.put(key, await file.arrayBuffer(), {
        httpMetadata: {
          contentType: DEFAULT_CONTENT_TYPE,
        },
      })

      return {
        id: fileId,
        name: file.name,
        type: file.type || DEFAULT_CONTENT_TYPE,
        size: file.size,
        key,
        uploaded_at: uploadedAt,
      }
    }),
  )

  const title = getCollectionTitle(uploadedFiles, titleOverride)

  const userId = request.user ? request.user.id : null
  await db
    .prepare(
      'INSERT INTO collections (id, title, created_at, user_id) VALUES (?, ?, ?, ?)',
    )
    .bind(collectionId, title, uploadedAt, userId)
    .run()

  const statement = db.prepare(
    'INSERT INTO files (id, collection_id, r2_key, name, type, size, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )

  await db.batch(
    uploadedFiles.map((file) =>
      statement.bind(
        file.id,
        collectionId,
        file.key,
        file.name,
        file.type,
        file.size,
        file.uploaded_at,
      ),
    ),
  )

  return createManifest(request, collectionId, title, uploadedFiles)
}

async function handleMultipartUpload(request, env) {
  const formData = await request.formData()
  const files = formData
    .getAll('file')
    .filter((value) => value && typeof value.arrayBuffer === 'function')

  const validation = validateFiles(files)
  if (validation) return jsonResponse(validation, env, request, 400)

  const manifest = await persistUpload(
    request,
    env,
    files,
    formData.get('title'),
  )
  return jsonResponse(manifest, env, request)
}

async function handleRawUpload(request, env) {
  const filename = request.headers.get('x-up-filename')?.trim()
  if (!filename) {
    return jsonResponse(
      { error: 'Missing X-Up-Filename header' },
      env,
      request,
      400,
    )
  }

  const body = await request.arrayBuffer()
  const file = {
    name: filename,
    type: request.headers.get('content-type') || DEFAULT_CONTENT_TYPE,
    size: body.byteLength,
    arrayBuffer: async () => body,
  }

  const validation = validateFiles([file])
  if (validation) return jsonResponse(validation, env, request, 400)

  const manifest = await persistUpload(
    request,
    env,
    [file],
    request.headers.get('x-up-title'),
  )
  return jsonResponse(manifest, env, request)
}

export const handleUpload = async (request, env) => {
  try {
    if (request.method === 'PUT') {
      return await handleRawUpload(request, env)
    }

    return await handleMultipartUpload(request, env)
  } catch (error) {
    console.error('Error processing upload:', error)
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : 'Unexpected upload failure',
      },
      env,
      request,
      500,
    )
  }
}
