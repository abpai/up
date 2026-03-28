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
  getGlobalConfigPath,
  loadGlobalConfig,
  writeGlobalConfig,
} from './config.js'

const SETUP_CANCELED = 'Setup canceled.'

function ensureInteractiveTerminal() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive setup requires a TTY.')
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
          if (!trimmed.startsWith('up_')) {
            return 'API tokens should start with "up_".'
          }
          return undefined
        },
      }),
    ),
  ).trim()
}

export async function runSetup(
  options = {},
  prompts = { confirm, intro, outro, password, select, text },
) {
  ensureInteractiveTerminal()

  const configPath = options.configPath ?? getGlobalConfigPath()
  const existing = await loadGlobalConfig(configPath)

  prompts.intro('up setup')
  console.info(`Up will save your defaults to ${configPath}.`)

  for (const warning of existing.warnings) {
    console.warn(`[up] ${warning}`)
  }

  const current = { ...DEFAULT_CONFIG, ...existing.config }

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
  const shouldUpdateToken = Boolean(
    throwIfCanceled(
      await prompts.confirm({
        message: current.apiToken
          ? 'Update the saved API token for authenticated CLI uploads?'
          : 'Save an API token for authenticated CLI uploads?',
        initialValue: Boolean(current.apiToken),
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
