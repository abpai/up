import { basename, resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { lookup as lookupMime } from 'mime-types'

function normalizeUrl(url) {
  return url.replace(/\/+$/, '')
}

function joinUrl(base, subpath) {
  const normalizedBase = normalizeUrl(base)
  const normalizedPath = subpath.replace(/^\/+/, '')
  return `${normalizedBase}/${normalizedPath}`
}

async function parseError(res, fallback) {
  try {
    const data = await res.json()
    return data.error || fallback
  } catch {
    const text = await res.text().catch(() => '')
    return text || fallback
  }
}

function normalizeOptions(optionsOrFetch, fallbackFetch) {
  if (typeof optionsOrFetch === 'function') {
    return { options: {}, fetchImpl: optionsOrFetch }
  }

  return {
    options: optionsOrFetch || {},
    fetchImpl: fallbackFetch ?? fetch,
  }
}

function withAuthHeader(headers, authToken) {
  if (!authToken) return headers

  return {
    ...headers,
    Authorization: `Bearer ${authToken}`,
  }
}

async function getUploadError(res, authToken) {
  const fallback =
    res.status === 401 && !authToken
      ? 'Upload requires authentication. Run "up setup" or set UP_TOKEN.'
      : `Upload failed: ${res.status}`

  return parseError(res, fallback)
}

async function performUpload(apiBase, init, authToken, fetchImpl) {
  const res = await fetchImpl(joinUrl(apiBase, '/api/upload'), init)

  if (!res.ok) {
    throw new Error(await getUploadError(res, authToken))
  }

  return res.json()
}

export async function uploadSingleFile(
  apiBase,
  filepath,
  optionsOrFetch,
  maybeFetch,
) {
  const { options, fetchImpl } = normalizeOptions(optionsOrFetch, maybeFetch)
  const { authToken } = options
  const absolutePath = resolve(filepath)
  const filename = basename(absolutePath)
  const body = await readFile(absolutePath)
  const type = lookupMime(filename) || 'application/octet-stream'

  return performUpload(
    apiBase,
    {
      method: 'PUT',
      headers: withAuthHeader(
        {
          'Content-Type': type,
          'X-Up-Filename': filename,
        },
        authToken,
      ),
      body,
    },
    authToken,
    fetchImpl,
  )
}

export async function uploadCollection(
  apiBase,
  filepaths,
  optionsOrFetch,
  maybeFetch,
) {
  const { options, fetchImpl } = normalizeOptions(optionsOrFetch, maybeFetch)
  const { authToken } = options
  const formData = new FormData()

  for (const filepath of filepaths) {
    const absolutePath = resolve(filepath)
    const filename = basename(absolutePath)
    const body = await readFile(absolutePath)
    const type = lookupMime(filename) || 'application/octet-stream'
    formData.append('file', new Blob([body], { type }), filename)
  }

  return performUpload(
    apiBase,
    {
      method: 'POST',
      headers: withAuthHeader({}, authToken),
      body: formData,
    },
    authToken,
    fetchImpl,
  )
}
