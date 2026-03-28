import { describe, expect, it, vi } from 'vitest'
import { ensureSchema } from './schema'

function createDb() {
  return {
    prepare: vi.fn((statement) => ({ statement })),
    batch: vi.fn(async () => undefined),
  }
}

describe('ensureSchema', () => {
  it('initializes a given DB binding only once', async () => {
    const db = createDb()
    const env = { DB: db }

    await ensureSchema(env)
    await ensureSchema(env)

    expect(db.batch).toHaveBeenCalledTimes(1)
  })

  it('initializes separate DB bindings independently', async () => {
    const firstDb = createDb()
    const secondDb = createDb()

    await ensureSchema({ DB: firstDb })
    await ensureSchema({ DB: secondDb })

    expect(firstDb.batch).toHaveBeenCalledTimes(1)
    expect(secondDb.batch).toHaveBeenCalledTimes(1)
  })
})
