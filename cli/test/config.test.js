import test from 'node:test'
import assert from 'node:assert/strict'
import { parseGlobalConfigToml, resolveRuntimeConfig } from '../lib/config.js'

test('parses global config toml', () => {
  const { config, warnings } = parseGlobalConfigToml(`
api_url = "https://api.example.com"
app_url = "https://app.example.com"
open_browser = false
default_mode = "collection"
api_token = "up_secret"
`)

  assert.deepEqual(warnings, [])
  assert.deepEqual(config, {
    apiUrl: 'https://api.example.com',
    appUrl: 'https://app.example.com',
    openBrowser: false,
    defaultMode: 'collection',
    apiToken: 'up_secret',
  })
})

test('cli overrides env and file defaults', () => {
  const result = resolveRuntimeConfig({
    cli: {
      apiUrl: 'https://cli.example.com',
      openBrowser: false,
      mode: 'single',
    },
    env: {
      UP_API: 'https://env.example.com',
      UP_APP: 'https://env-app.example.com',
      UP_TOKEN: 'up_env_token',
    },
    file: {
      apiUrl: 'https://file.example.com',
      appUrl: 'https://file-app.example.com',
      openBrowser: true,
      defaultMode: 'collection',
      apiToken: 'up_file_token',
    },
  })

  assert.deepEqual(result, {
    apiUrl: 'https://cli.example.com',
    appUrl: 'https://env-app.example.com',
    openBrowser: false,
    defaultMode: 'single',
    authToken: 'up_env_token',
  })
})
