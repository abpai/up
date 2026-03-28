#!/usr/bin/env node

import { run } from '../lib/index.js'

run(process.argv.slice(2)).catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Unexpected CLI failure',
  )
  process.exit(1)
})
