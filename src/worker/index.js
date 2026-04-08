import { Router } from 'itty-router'
import { handleUpload } from './handlers/upload'
import {
  handleGetCollection,
  handleRenameCollection,
} from './handlers/collection'
import { handleGetDashboard } from './handlers/dashboard'
import { handleRender } from './handlers/render'
import { handleStatic } from './handlers/static'
import {
  handleGetFile,
  handleRenameFile,
  handleDeleteFile,
} from './handlers/file'
import {
  handleSignup,
  handleLogin,
  handleLogout,
  handleMe,
  handleListTokens,
  handleCreateToken,
  handleRevokeToken,
} from './handlers/auth'
import { withAuth } from './middleware/withAuth'
import { withOptionalAuth } from './middleware/withOptionalAuth'
import { withTrustedOrigin } from './middleware/withTrustedOrigin'
import { ensureSchema } from './services/schema'
import { corsHeaders } from './utils/cors'

const router = Router()

// Auth Routes (public)
router.post('/api/auth/signup', withTrustedOrigin(handleSignup))
router.post('/api/auth/login', withTrustedOrigin(handleLogin))
router.post('/api/auth/logout', withTrustedOrigin(handleLogout))
router.get('/api/auth/me', handleMe)
router.get('/api/auth/tokens', withAuth(handleListTokens))
router.post(
  '/api/auth/tokens',
  withTrustedOrigin(withAuth(handleCreateToken), { allowBearer: true }),
)
router.delete(
  '/api/auth/tokens/:id',
  withTrustedOrigin(withAuth(handleRevokeToken), { allowBearer: true }),
)

// Protected Routes
router.post(
  '/api/upload',
  withTrustedOrigin(withAuth(handleUpload), { allowBearer: true }),
)
router.put(
  '/api/upload',
  withTrustedOrigin(withAuth(handleUpload), { allowBearer: true }),
)
router.patch(
  '/api/file/:id/rename',
  withTrustedOrigin(withAuth(handleRenameFile), { allowBearer: true }),
)
router.patch(
  '/api/collection/:id/rename',
  withTrustedOrigin(withAuth(handleRenameCollection), { allowBearer: true }),
)
router.get('/api/dashboard', withAuth(handleGetDashboard))

// Public Routes
router.get('/api/collection/:id', withOptionalAuth(handleGetCollection))
router.get('/api/file/:id', handleGetFile)

// Protected File Operations
router.delete(
  '/api/file/:id',
  withTrustedOrigin(withAuth(handleDeleteFile), { allowBearer: true }),
)

// Page Routes (Edge Rendering)
router.get('/c/:id', handleRender)

// Options (CORS)
router.options(
  '*',
  (request, env) => new Response(null, { headers: corsHeaders(env, request) }),
)

// Static Assets & Fallback
router.all('*', handleStatic)

export default {
  async fetch(request, env, ctx) {
    await ensureSchema(env)
    return router.fetch(request, env, ctx)
  },
}
