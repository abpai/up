import {
  cancel,
  confirm,
  intro,
  isCancel,
  outro,
  password,
  select,
  text,
} from '@clack/prompts'
import {
  DEFAULT_CONFIG,
  UPLOAD_MODES,
  getGlobalConfigPath,
  loadGlobalConfig,
  writeGlobalConfig,
} from './config.js'

const SETUP_CANCELED = 'Setup canceled.'
const API_TOKEN_PREFIX = 'up_'
const API_TOKEN_PREFIX_MESSAGE = `API token should start with "${API_TOKEN_PREFIX}".`

function ensureInteractiveTerminal() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      'Interactive setup requires a TTY. For headless setup, run `up setup --token "$UP_TOKEN" --yes`.',
    )
  }
}

function throwIfCanceled(value) {
  if (isCancel(value)) {
    cancel(SETUP_CANCELED)
    throw new Error(SETUP_CANCELED)
  }

  return value
}

async function promptForRequiredText(prompts, message, initialValue) {
  return String(
    throwIfCanceled(
      await prompts.text({
        message,
        initialValue,
        validate: (value) =>
          String(value || '').trim().length > 0
            ? undefined
            : `${message} is required.`,
      }),
    ),
  ).trim()
}

async function promptForApiToken(prompts) {
  return String(
    throwIfCanceled(
      await prompts.password({
        message: 'Paste an API token from the Up dashboard',
        validate: (value) => {
          const trimmed = String(value || '').trim()
          if (!trimmed) return 'API token is required.'
          if (!trimmed.startsWith(API_TOKEN_PREFIX)) {
            return API_TOKEN_PREFIX_MESSAGE
          }
          return undefined
        },
      }),
    ),
  ).trim()
}

function validateRequiredString(value, label) {
  if (value === undefined) return undefined

  const trimmed = String(value).trim()
  if (!trimmed) {
    throw new Error(`${label} must be a non-empty string.`)
  }

  return trimmed
}

function validateApiToken(value) {
  const trimmed = validateRequiredString(value, 'API token')
  if (trimmed === undefined) return undefined

  if (!trimmed.startsWith(API_TOKEN_PREFIX)) {
    throw new Error(API_TOKEN_PREFIX_MESSAGE)
  }

  return trimmed
}

function validateDefaultMode(value) {
  if (value === undefined) return undefined
  if (UPLOAD_MODES.includes(value)) return value
  throw new Error('Default upload mode must be "single" or "collection".')
}

function applySetupOptions(config, options) {
  const next = { ...config }
  const apiUrl = validateRequiredString(options.apiUrl, 'API base URL')
  const appUrl = validateRequiredString(options.appUrl, 'App base URL')
  const defaultMode = validateDefaultMode(options.defaultMode)
  const apiToken = validateApiToken(options.apiToken)

  if (apiUrl !== undefined) next.apiUrl = apiUrl
  if (appUrl !== undefined) next.appUrl = appUrl
  if (options.openBrowser !== undefined) {
    next.openBrowser = Boolean(options.openBrowser)
  }
  if (defaultMode !== undefined) next.defaultMode = defaultMode
  if (apiToken !== undefined) next.apiToken = apiToken

  return next
}

export async function runSetup(
  options = {},
  prompts = { confirm, intro, outro, password, select, text },
) {
  const configPath = options.configPath ?? getGlobalConfigPath()
  const existing = await loadGlobalConfig(configPath)
  // Validate any provided flags up front and fold them onto the saved config,
  // so they seed both the headless write and the interactive prompts below.
  const current = applySetupOptions(
    { ...DEFAULT_CONFIG, ...existing.config },
    options,
  )

  if (options.yes) {
    for (const warning of existing.warnings) {
      console.warn(`[up] ${warning}`)
    }

    await writeGlobalConfig(current, configPath)
    console.info(`Saved config to ${configPath}`)
    return
  }

  ensureInteractiveTerminal()

  prompts.intro('up setup')
  console.info(`Up will save your defaults to ${configPath}.`)

  for (const warning of existing.warnings) {
    console.warn(`[up] ${warning}`)
  }

  const apiUrl = await promptForRequiredText(
    prompts,
    'API base URL',
    current.apiUrl,
  )
  const appUrl = await promptForRequiredText(
    prompts,
    'App base URL',
    current.appUrl,
  )

  const openBrowser = Boolean(
    throwIfCanceled(
      await prompts.confirm({
        message: 'Open browser after upload by default?',
        initialValue: current.openBrowser,
      }),
    ),
  )

  const defaultMode = String(
    throwIfCanceled(
      await prompts.select({
        message: 'Default upload mode',
        initialValue: current.defaultMode,
        options: [
          { value: 'single', label: 'Single file' },
          { value: 'collection', label: 'Collection' },
        ],
      }),
    ),
  )

  let apiToken = current.apiToken ?? null
  // A token passed via --token already seeds current.apiToken, so default the
  // prompt to keeping it rather than asking the user to paste it again.
  const tokenProvided = options.apiToken !== undefined
  const shouldUpdateToken = Boolean(
    throwIfCanceled(
      await prompts.confirm({
        message: current.apiToken
          ? 'Update the saved API token for authenticated CLI uploads?'
          : 'Save an API token for authenticated CLI uploads?',
        initialValue: tokenProvided ? false : Boolean(current.apiToken),
      }),
    ),
  )

  if (shouldUpdateToken) {
    apiToken = await promptForApiToken(prompts)
  }

  if (existing.exists) {
    const shouldWrite = Boolean(
      throwIfCanceled(
        await prompts.confirm({
          message: `Overwrite ${configPath}?`,
          initialValue: true,
        }),
      ),
    )

    if (!shouldWrite) {
      prompts.outro('No changes made.')
      return
    }
  }

  await writeGlobalConfig(
    { apiUrl, appUrl, openBrowser, defaultMode, apiToken },
    configPath,
  )
  prompts.outro(`Saved config to ${configPath}`)
}
