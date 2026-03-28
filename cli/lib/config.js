import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parse, stringify } from '@iarna/toml'

export const DEFAULT_BASE_URL = 'https://up.andypai.me'

export const DEFAULT_CONFIG = {
  apiUrl: DEFAULT_BASE_URL,
  appUrl: DEFAULT_BASE_URL,
  openBrowser: true,
  defaultMode: 'single',
  apiToken: null,
}

const CONFIG_DIR = '.up'
const CONFIG_FILE = 'config.toml'

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : null
}

function validateString(value, label, warnings) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    warnings.push(`${label} must be a non-empty string.`)
    return undefined
  }

  return value.trim()
}

function validateBoolean(value, label, warnings) {
  if (typeof value !== 'boolean') {
    warnings.push(`${label} must be true or false.`)
    return undefined
  }

  return value
}

function validateMode(value, label, warnings) {
  if (value === 'single' || value === 'collection') return value
  warnings.push(`${label} must be "single" or "collection".`)
  return undefined
}

export function getGlobalConfigPath(homeDir = os.homedir()) {
  return path.join(homeDir, CONFIG_DIR, CONFIG_FILE)
}

export function parseGlobalConfigToml(
  contents,
  configPath = getGlobalConfigPath(),
) {
  const warnings = []
  const config = {}

  let parsed
  try {
    parsed = parse(contents)
  } catch (error) {
    warnings.push(
      `Failed to parse Up config "${configPath}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
    return { config, warnings }
  }

  const root = asObject(parsed)
  if (!root) {
    warnings.push(`Up config "${configPath}" must contain a TOML table.`)
    return { config, warnings }
  }

  if ('api_url' in root) {
    const value = validateString(root.api_url, 'api_url', warnings)
    if (value) config.apiUrl = value
  }

  if ('app_url' in root) {
    const value = validateString(root.app_url, 'app_url', warnings)
    if (value) config.appUrl = value
  }

  if ('open_browser' in root) {
    const value = validateBoolean(root.open_browser, 'open_browser', warnings)
    if (value !== undefined) config.openBrowser = value
  }

  if ('default_mode' in root) {
    const value = validateMode(root.default_mode, 'default_mode', warnings)
    if (value) config.defaultMode = value
  }

  if ('api_token' in root) {
    const value = validateString(root.api_token, 'api_token', warnings)
    if (value) config.apiToken = value
  }

  return { config, warnings }
}

export async function loadGlobalConfig(configPath = getGlobalConfigPath()) {
  try {
    const contents = await fs.readFile(configPath, 'utf8')
    const parsed = parseGlobalConfigToml(contents, configPath)
    return {
      ...parsed,
      path: configPath,
      exists: true,
    }
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return {
        config: {},
        warnings: [],
        path: configPath,
        exists: false,
      }
    }

    throw error
  }
}

export async function writeGlobalConfig(
  config,
  configPath = getGlobalConfigPath(),
) {
  const directory = path.dirname(configPath)
  await fs.mkdir(directory, { recursive: true })
  const payload = stringify({
    api_url: config.apiUrl,
    app_url: config.appUrl,
    open_browser: config.openBrowser,
    default_mode: config.defaultMode,
    ...(config.apiToken ? { api_token: config.apiToken } : {}),
  })
  await fs.writeFile(configPath, payload, 'utf8')
}

export function resolveRuntimeConfig({
  cli = {},
  env = process.env,
  file = {},
} = {}) {
  const apiUrl =
    cli.apiUrl ?? env.UP_API ?? file.apiUrl ?? DEFAULT_CONFIG.apiUrl
  const appUrl = cli.appUrl ?? env.UP_APP ?? file.appUrl ?? apiUrl
  const openBrowser =
    cli.openBrowser ?? file.openBrowser ?? DEFAULT_CONFIG.openBrowser
  const defaultMode = cli.mode ?? file.defaultMode ?? DEFAULT_CONFIG.defaultMode
  const authToken =
    cli.authToken ?? env.UP_TOKEN ?? file.apiToken ?? DEFAULT_CONFIG.apiToken

  return {
    apiUrl,
    appUrl,
    openBrowser,
    defaultMode,
    authToken,
  }
}
