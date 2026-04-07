import { getDB } from '../services/db'
import { corsHeaders } from '../utils/cors'

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
    const { origin } = new URL(request.url)
    const manifestFiles = files.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      size: f.size,
      url: `${origin}/api/file/${f.id}`,
      downloadUrl: `${origin}/api/file/${f.id}?download=1`,
    }))

    const responseData = {
      id: collection.id,
      title: collection.title,
      createdAt: collection.created_at,
      shareUrl: `${origin}/c/${collection.id}`,
      files: manifestFiles,
      count: files.length,
    }

    if (manifestFiles.length === 1) {
      responseData.fileUrl = manifestFiles[0].url
    }

    return new Response(JSON.stringify(responseData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        ...corsHeaders(env),
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
