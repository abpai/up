import { getDB } from '../services/db'
import { corsHeaders } from '../utils/cors'

export const handleRenameCollection = async (request, env) => {
  const { id } = request.params
  const db = getDB(env)

  try {
    const { title: rawTitle } = await request.json()
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : ''

    if (!title) {
      return new Response('Invalid title', {
        status: 400,
        headers: corsHeaders(env),
      })
    }

    const result = await db
      .prepare('UPDATE collections SET title = ? WHERE id = ? AND user_id = ?')
      .bind(title, id, request.user.id)
      .run()

    if (result.meta.changes === 0) {
      return new Response('Collection not found', {
        status: 404,
        headers: corsHeaders(env),
      })
    }

    return new Response(JSON.stringify({ success: true, title }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
    })
  } catch (error) {
    console.error('Error renaming collection:', error)
    return new Response('Error renaming collection', {
      status: 500,
      headers: corsHeaders(env),
    })
  }
}

export const handleGetCollection = async (request, env) => {
  const { id } = request.params
  const db = getDB(env)

  try {
    // Fetch Collection
    const collection = await db
      .prepare('SELECT * FROM collections WHERE id = ?')
      .bind(id)
      .first()

    if (!collection) {
      return new Response('Collection not found', {
        status: 404,
        headers: corsHeaders(env),
      })
    }

    // Fetch Files
    const { results: files } = await db
      .prepare('SELECT * FROM files WHERE collection_id = ?')
      .bind(id)
      .all()

    // Construct Manifest Response
    const manifestFiles = files.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      size: f.size,
      url: `/api/file/${f.id}`,
      downloadUrl: `/api/file/${f.id}?download=1`,
    }))

    const isOwner = !!request.user && collection.user_id === request.user.id

    const responseData = {
      id: collection.id,
      title: collection.title,
      createdAt: collection.created_at,
      shareUrl: `/c/${collection.id}`,
      files: manifestFiles,
      count: files.length,
      isOwner,
    }

    if (manifestFiles.length === 1) {
      responseData.fileUrl = manifestFiles[0].url
    }

    const cors = corsHeaders(env, request)
    const varyParts = new Set(['Authorization', 'Cookie'])
    if (cors.Vary) varyParts.add(cors.Vary)

    return new Response(JSON.stringify(responseData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        ...cors,
        Vary: [...varyParts].join(', '),
      },
    })
  } catch (error) {
    console.error('Error fetching collection:', error)
    return new Response('Error fetching collection', {
      status: 500,
      headers: corsHeaders(env),
    })
  }
}
