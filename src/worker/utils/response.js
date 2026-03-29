import { corsHeaders } from './cors'

export function jsonResponse(
  body,
  env,
  request,
  status = 200,
  extraHeaders = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(env, request),
      ...extraHeaders,
    },
  })
}
