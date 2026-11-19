import { describe, expect, it } from 'vitest'

import { allowed } from '@/consent/Analytics'
import type { Choice } from '@/consent/choice'
import { version } from '@/consent/registry'

const yes: Choice = { version, at: new Date().toISOString(), on: ['analytics'] }
const no: Choice = { ...yes, on: [] }
const set = ['phc_key', 'https://eu.i.posthog.com'] as const

describe('analytics', () => {
  it('runs for a guest who said yes, once it is set up', () => {
    expect(allowed(yes, false, ...set)).toBe(true)
    expect(allowed(yes, false, '', set[1])).toBe(false)
    expect(allowed(yes, false, set[0], '')).toBe(false)
  })

  it('does not run before a choice or after a no', () => {
    expect(allowed(null, false, ...set)).toBe(false)
    expect(allowed(no, false, ...set)).toBe(false)
  })

  it('never runs for a signed-in visitor, with or without a stored yes', () => {
    expect(allowed(yes, true, ...set)).toBe(false)
    expect(allowed(no, true, ...set)).toBe(false)
  })
})
