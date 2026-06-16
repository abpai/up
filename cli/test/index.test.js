import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { version } = require('../package.json')

const cliRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const binPath = join(cliRoot, 'bin/up.js')

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [binPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: options.home,
    },
  })
}

test('prints package version', async () => {
  const home = await mkdtemp(join(tmpdir(), 'up-home-'))
  const result = runCli(['--version'], { home })

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), version)
})

test('prints help without error exit', async () => {
  const home = await mkdtemp(join(tmpdir(), 'up-home-'))
  const result = runCli(['--help'], { home })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Usage: up \[options\] \[paths\.\.\.\]/)
  assert.equal(result.stderr, '')
})

test('setup command accepts non-interactive flags', async () => {
  const home = await mkdtemp(join(tmpdir(), 'up-home-'))
  const result = runCli(
    [
      'setup',
      '--api',
      'https://api.example.com',
      '--app',
      'https://app.example.com',
      '--token',
      'up_cli_token',
      '--mode',
      'collection',
      '--no-open',
      '--yes',
    ],
    { home },
  )

  assert.equal(result.status, 0, result.stderr)

  const written = await readFile(join(home, '.up/config.toml'), 'utf8')
  assert.match(written, /api_url = "https:\/\/api\.example\.com"/)
  assert.match(written, /app_url = "https:\/\/app\.example\.com"/)
  assert.match(written, /open_browser = false/)
  assert.match(written, /default_mode = "collection"/)
  assert.match(written, /api_token = "up_cli_token"/)
})
