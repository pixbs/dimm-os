import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Form, Visitor } from '@/payload-types'

import { keepSite } from './site'

let payload: Payload
let form: Form
let restoreSite: Awaited<ReturnType<typeof keepSite>>

const TITLE = 'Cleanup, a test form'
const NAMES = ['Cleanup, past', 'Cleanup, current']
const KEYS = ['0'.repeat(64), 'f'.repeat(64)]
const DAY = 24 * 60 * 60 * 1000
const trusted = { depth: 0, overrideAccess: true } as const

const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString()

const submission = (days: number) =>
  payload.create({
    collection: 'form-submissions',
    data: { form: form.id, submissionData: [{ field: 'days', value: String(days) }] },
    ...trusted,
  })

const visitor = (name: string, expires: string) =>
  payload.create({
    collection: 'visitors',
    data: { name, password: `a-password-for-${name}`, expires } as Visitor,
    ...trusted,
  })

// What the daily cron does: queue the job, then run it.
const run = async () => {
  const job = await payload.jobs.queue({ task: 'cleanup', input: {}, overrideAccess: true })
  await payload.jobs.runByID({ id: job.id, overrideAccess: true, silent: true })
}

async function clean() {
  const { docs } = await payload.find({
    collection: 'forms',
    where: { title: { equals: TITLE } },
    ...trusted,
  })
  const ids = docs.map(({ id }) => id)
  await payload.delete({ collection: 'form-submissions', where: { form: { in: ids } }, ...trusted })
  await payload.delete({ collection: 'forms', where: { id: { in: ids } }, ...trusted })
  await payload.delete({ collection: 'visitors', where: { name: { in: NAMES } }, ...trusted })
  await payload.delete({ collection: 'senders', where: { key: { in: KEYS } }, ...trusted })
}

beforeAll(async () => {
  payload = await getPayload({ config })
  await clean()
  restoreSite = await keepSite(payload)
  await payload.updateGlobal({
    slug: 'site',
    data: {
      name: 'A site',
      email: 'site@example.com',
      place: 'Somewhere',
      timezone: 'Europe/London',
    },
    // The window Site counts is checked against what its saver may read: a guest, as the site reads it.
    context: { viewer: null },
    draft: false,
    fallbackLocale: false,
    locale: 'en',
    ...trusted,
  })
  form = await payload.create({
    collection: 'forms',
    data: { title: TITLE, fields: [{ blockType: 'text', name: 'days', label: 'Days' }] },
    draft: false,
    fallbackLocale: false,
    locale: 'en',
    ...trusted,
  })
})

afterEach(() => vi.restoreAllMocks())

afterAll(async () => {
  await clean()
  await restoreSite()
})

describe('the daily cleanup', () => {
  it('is queued for the daily cron', () => {
    const task = payload.config.jobs.tasks?.find(({ slug }) => slug === 'cleanup')
    expect(task?.schedule).toEqual([{ cron: '0 3 * * *', queue: 'default' }])
  })

  it('deletes a submission 90 days after it arrived and a visitor at the end date', async () => {
    const old = await submission(91)
    const young = await submission(89)
    // The time it arrived is Payload's own, so the test moves it back in the database.
    for (const [doc, days] of [
      [old, 91],
      [young, 89],
    ] as const) {
      await payload.db.updateOne({
        collection: 'form-submissions',
        id: doc.id,
        data: { createdAt: ago(days) },
      })
    }
    const past = await visitor(NAMES[0], ago(1))
    const current = await visitor(NAMES[1], ago(-1))

    await run()

    const left = await payload.find({
      collection: 'form-submissions',
      where: { form: { equals: form.id } },
      ...trusted,
    })
    expect(left.docs.map(({ id }) => id)).toEqual([young.id])
    const visitors = await payload.find({
      collection: 'visitors',
      where: { name: { in: NAMES } },
      ...trusted,
    })
    expect(visitors.docs.map(({ id }) => id)).toEqual([current.id])
    expect(visitors.docs).not.toContainEqual(expect.objectContaining({ id: past.id }))
  })

  it('deletes a sender’s row once the limit no longer counts it', async () => {
    const [past, current] = await Promise.all(
      KEYS.map((key) => payload.create({ collection: 'senders', data: { key }, ...trusted })),
    )
    await payload.db.updateOne({
      collection: 'senders',
      id: past.id,
      data: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    })

    await run()

    const left = await payload.find({
      collection: 'senders',
      where: { key: { in: KEYS } },
      ...trusted,
    })
    expect(left.docs.map(({ id }) => id)).toEqual([current.id])
  })

  it('mails Site’s address when a run fails', async () => {
    vi.spyOn(payload, 'delete').mockRejectedValueOnce(new Error('The database is away.'))
    const mailed = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)

    await run()

    expect(mailed).toHaveBeenCalledOnce()
    expect(mailed.mock.calls[0][0]).toMatchObject({
      to: 'site@example.com',
      subject: 'The daily cleanup failed',
    })
  })
})
