export const corsHeaders = (env) => ({
  'Access-Control-Allow-Origin': env.CORS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, X-Up-Filename, X-Up-Title',
  'Access-Control-Allow-Credentials': 'true',
})
