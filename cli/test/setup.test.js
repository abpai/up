import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, stat } from 'node:fs/promises'
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

test('writes config from non-interactive options', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'up-setup-'))
  const configPath = join(dir, 'config.toml')

  await runSetup({
    apiUrl: 'https://api.example.com',
    appUrl: 'https://app.example.com',
    openBrowser: false,
    defaultMode: 'single',
    apiToken: 'up_noninteractive_token',
    configPath,
    yes: true,
  })

  const written = await readFile(configPath, 'utf8')
  const mode = (await stat(configPath)).mode.toString(8).slice(-3)

  assert.match(written, /api_url = "https:\/\/api\.example\.com"/)
  assert.match(written, /app_url = "https:\/\/app\.example\.com"/)
  assert.match(written, /open_browser = false/)
  assert.match(written, /default_mode = "single"/)
  assert.match(written, /api_token = "up_noninteractive_token"/)
  assert.equal(mode, '600')
})

test('rejects invalid non-interactive token', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'up-setup-'))
  const configPath = join(dir, 'config.toml')

  await assert.rejects(
    runSetup({
      apiToken: 'not_up_token',
      configPath,
      yes: true,
    }),
    /API token should start with "up_"/,
  )
})

test('seeds interactive prompts from provided flags', async () => {
  enableTty()
  const dir = await mkdtemp(join(tmpdir(), 'up-setup-'))
  const configPath = join(dir, 'config.toml')
  const seen = {}
  const prompts = {
    intro() {},
    outro() {},
    confirm: async ({ message, initialValue }) => {
      if (message.includes('Open browser')) return true
      if (message.includes('API token')) {
        // Provided token defaults the update prompt to "keep" (false).
        seen.tokenInitial = initialValue
        return false
      }
      return true
    },
    password: async () => {
      throw new Error('password prompt should not run')
    },
    select: async ({ initialValue }) => {
      seen.modeInitial = initialValue
      return initialValue
    },
    text: async ({ message, initialValue }) => initialValue || message,
  }

  await runSetup(
    {
      apiToken: 'up_flag_token',
      apiUrl: 'https://api.example.com',
      appUrl: 'https://app.example.com',
      defaultMode: 'collection',
      configPath,
    },
    prompts,
  )
  const written = await readFile(configPath, 'utf8')

  assert.equal(seen.tokenInitial, false)
  assert.equal(seen.modeInitial, 'collection')
  assert.match(written, /api_url = "https:\/\/api\.example\.com"/)
  assert.match(written, /default_mode = "collection"/)
  assert.match(written, /api_token = "up_flag_token"/)
})

test('rejects invalid flags before prompting interactively', async () => {
  enableTty()
  const dir = await mkdtemp(join(tmpdir(), 'up-setup-'))
  const configPath = join(dir, 'config.toml')
  const prompts = {
    intro() {
      throw new Error('prompts should not start with invalid flags')
    },
    outro() {},
    confirm: async () => true,
    password: async () => 'up_token',
    select: async () => 'single',
    text: async () => 'https://api.example.com',
  }

  await assert.rejects(
    runSetup({ apiToken: 'invalid_token', configPath }, prompts),
    /API token should start with "up_"/,
  )
})
