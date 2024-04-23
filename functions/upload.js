import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// https://developers.cloudflare.com/workers/runtime-apis/request/

// eslint-disable-next-line import/prefer-default-export
export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        // @TODO: Make stricter before production
        'Access-Control-Allow-Origin': env.CORS || '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!file) {
    return new Response('No file found', { status: 400 })
  }

  const {
    AWS_S3_BUCKET: BUCKET_NAME,
    AWS_S3_REGION: REGION,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_S3_FOLDER_KEY: FOLDER_KEY,
  } = env

  const s3Client = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  })

  const fileName = `${FOLDER_KEY}/${file.name}`
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: await file.arrayBuffer(),
    ContentType: file.type,
    ACL: 'public-read',
  }

  try {
    await s3Client.send(new PutObjectCommand(params))

    const fileUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${fileName}`

    return new Response(JSON.stringify({ fileUrl }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': env.CORS || '*',
      },
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return new Response('Error uploading file', { status: 500 })
  }
}
