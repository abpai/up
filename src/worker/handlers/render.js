import { getDB } from '../services/db'

const escapeHtml = (str) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export const handleRender = async (request, env) => {
  const { id } = request.params

  // 1. Fetch Metadata from D1
  let manifest = null
  try {
    const db = getDB(env)

    // Parallel fetch
    const [collection, countResult, imageFile] = await Promise.all([
      db.prepare('SELECT * FROM collections WHERE id = ?').bind(id).first(),
      db
        .prepare('SELECT COUNT(*) as count FROM files WHERE collection_id = ?')
        .bind(id)
        .first(),
      db
        .prepare(
          'SELECT * FROM files WHERE collection_id = ? AND type LIKE ? ORDER BY uploaded_at ASC LIMIT 1',
        )
        .bind(id, 'image/%')
        .first(),
    ])

    if (collection) {
      const { origin } = new URL(request.url)
      const imageUrl = imageFile ? `${origin}/api/file/${imageFile.id}` : ''

      manifest = {
        title: collection.title,
        count: countResult?.count ?? 0,
        image: imageUrl,
      }
    }
  } catch (e) {
    console.error('Failed to fetch manifest for OG tags:', e)
  }

  // 2. Fetch index.html from assets
  let response
  try {
    const indexRequest = new Request(
      new URL('/index.html', request.url),
      request,
    )
    response = await env.ASSETS.fetch(indexRequest)
  } catch (e) {
    return new Response('Error loading application', { status: 500 })
  }

  if (!manifest) {
    return response
  }

  // 3. Inject OG Tags
  /* global HTMLRewriter */
  const description = `${manifest.count} file${manifest.count === 1 ? '' : 's'} shared via Up`

  return new HTMLRewriter()
    .on('head', {
      element(e) {
        e.append(
          `<meta property="og:title" content="${escapeHtml(manifest.title)}">`,
          { html: true },
        )
        e.append(`<meta property="og:description" content="${description}">`, {
          html: true,
        })
        e.append(`<meta property="og:url" content="${request.url}">`, {
          html: true,
        })
        e.append(`<meta property="og:site_name" content="Up">`, { html: true })

        if (manifest.image) {
          e.append(`<meta property="og:image" content="${manifest.image}">`, {
            html: true,
          })
          e.append(`<meta name="twitter:card" content="summary_large_image">`, {
            html: true,
          })
        } else {
          e.append(`<meta name="twitter:card" content="summary">`, {
            html: true,
          })
        }
      },
    })
    .transform(response)
}
