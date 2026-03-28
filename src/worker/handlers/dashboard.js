import { getDB } from '../services/db'
import { jsonResponse } from '../utils/response'

export const handleGetDashboard = async (request, env) => {
  try {
    const db = getDB(env)
    const { results } = await db
      .prepare(
        `SELECT c.id, c.title, c.created_at,
                COUNT(f.id) as file_count,
                MIN(CASE WHEN f.type LIKE 'image/%' THEN f.id END) as cover_file_id
         FROM collections c
         LEFT JOIN files f ON f.collection_id = c.id
         WHERE c.user_id = ?
         GROUP BY c.id
         ORDER BY c.created_at DESC
         LIMIT 50`,
      )
      .bind(request.user.id)
      .all()

    const { origin } = new URL(request.url)
    const collections = results.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.created_at,
      fileCount: c.file_count,
      coverUrl: c.cover_file_id
        ? `${origin}/api/file/${c.cover_file_id}`
        : null,
    }))

    return jsonResponse({ collections }, env)
  } catch (error) {
    console.error('Dashboard error:', error)
    return jsonResponse({ error: 'Failed to load dashboard' }, env, 500)
  }
}
