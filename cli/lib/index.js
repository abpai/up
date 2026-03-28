import { Command } from 'commander'
import open from 'open'
import { loadGlobalConfig, resolveRuntimeConfig } from './config.js'
import { runSetup } from './setup.js'
import { uploadCollection, uploadSingleFile } from './upload.js'

function createProgram() {
  return new Command()
    .name('up')
    .description('Upload local files to Up and get public share links')
    .argument('[paths...]', 'Local file paths to upload')
    .option('--api <url>', 'API base URL')
    .option('--app <url>', 'App base URL')
    .option('--json', 'Print the full response JSON')
    .option('--collection', 'Upload all provided paths as one collection')
    .option('--mode <mode>', 'Default upload mode: single|collection')
    .option('--open', 'Open the share URL in the browser')
    .option('--no-open', 'Do not open the share URL in the browser')
    .option('--config', 'Print the resolved config and exit')
    .exitOverride()
}

function redactConfig(config) {
  return {
    ...config,
    authToken: config.authToken ? '[set]' : null,
  }
}

function getCliOpenBrowserValue(program, options) {
  return program.getOptionValueSource('open') === 'cli'
    ? options.open
    : undefined
}

function resolveUploadMode(options, paths, runtimeConfig) {
  if (options.collection || paths.length > 1) {
    return 'collection'
  }

  return runtimeConfig.defaultMode === 'collection' ? 'collection' : 'single'
}

export async function run(args, deps = {}) {
  if (args[0] === 'setup') {
    await runSetup()
    return
  }

  const globalConfig = await loadGlobalConfig()
  for (const warning of globalConfig.warnings) {
    console.warn(`[up] ${warning}`)
  }

  const program = createProgram()
  program.parse(args, { from: 'user' })
  const options = program.opts()
  const paths = program.args

  const runtimeConfig = resolveRuntimeConfig({
    cli: {
      apiUrl: options.api,
      appUrl: options.app,
      mode: options.mode,
      openBrowser: getCliOpenBrowserValue(program, options),
    },
    file: globalConfig.config,
  })

  if (options.config) {
    console.info(JSON.stringify(redactConfig(runtimeConfig), null, 2))
    return
  }

  if (paths.length === 0) {
    throw new Error('Provide at least one file path, or run "up setup".')
  }

  const fetchImpl = deps.fetch ?? fetch
  const openImpl = deps.open ?? open
  const mode = resolveUploadMode(options, paths, runtimeConfig)
  const uploadOptions = { authToken: runtimeConfig.authToken }

  const result =
    mode === 'collection'
      ? await uploadCollection(
          runtimeConfig.apiUrl,
          paths,
          uploadOptions,
          fetchImpl,
        )
      : await uploadSingleFile(
          runtimeConfig.apiUrl,
          paths[0],
          uploadOptions,
          fetchImpl,
        )

  if (options.json) {
    console.info(JSON.stringify(result, null, 2))
  } else {
    console.info(result.shareUrl)
  }

  if (runtimeConfig.openBrowser) {
    await openImpl(result.shareUrl)
  }
}
