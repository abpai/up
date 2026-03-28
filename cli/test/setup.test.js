import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runSetup } from '../lib/setup.js'

function enableTty() {
  Object.defineProperty(process.stdin, 'isTTY', {
    value: true,
    configurable: true,
  })
  Object.defineProperty(process.stdout, 'isTTY', {
    value: true,
    configurable: true,
  })
}

test('writes config from prompts', async () => {
  enableTty()
  const dir = await mkdtemp(join(tmpdir(), 'up-setup-'))
  const configPath = join(dir, 'config.toml')
  const prompts = {
    intro() {},
    outro() {},
    confirm: async ({ message }) => {
      if (message.includes('Open browser')) return false
      if (message.includes('API token')) return true
      return true
    },
    password: async () => 'up_setup_token',
    select: async () => 'collection',
    text: async ({ message }) =>
      message.includes('API')
        ? 'https://api.example.com'
        : 'https://app.example.com',
  }

  await runSetup({ configPath }, prompts)
  const written = await readFile(configPath, 'utf8')

  assert.match(written, /api_url = "https:\/\/api\.example\.com"/)
  assert.match(written, /app_url = "https:\/\/app\.example\.com"/)
  assert.match(written, /open_browser = false/)
  assert.match(written, /default_mode = "collection"/)
  assert.match(written, /api_token = "up_setup_token"/)
})
