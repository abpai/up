import { corsHeaders } from '../utils/cors'

export const handleStatic = async (request, env) => {
  // Handle OPTIONS for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(env) })
  }

  return env.ASSETS.fetch(request)
}
