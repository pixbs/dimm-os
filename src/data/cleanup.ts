import 'server-only'

import type { PayloadRequest } from 'payload'

import { SENDER_WINDOW } from '@/collections/Senders'

const DAY = 24 * 60 * 60 * 1000

// A message is kept 90 days after it arrived, a visitor until the end date of the invitation, and a sender's row no
// longer than the limit needs it, though a send clears it sooner.
export async function cleanup(req: PayloadRequest) {
  const now = Date.now()
  const { docs: submissions } = await req.payload.delete({
    collection: 'form-submissions',
    depth: 0,
    overrideAccess: true,
    req,
    where: { createdAt: { less_than: new Date(now - 90 * DAY).toISOString() } },
  })
  const { docs: visitors } = await req.payload.delete({
    collection: 'visitors',
    depth: 0,
    overrideAccess: true,
    req,
    where: { expires: { less_than: new Date(now).toISOString() } },
  })
  const { docs: senders } = await req.payload.delete({
    collection: 'senders',
    depth: 0,
    overrideAccess: true,
    req,
    where: { createdAt: { less_than: new Date(now - SENDER_WINDOW).toISOString() } },
  })
  return { submissions: submissions.length, visitors: visitors.length, senders: senders.length }
}

// The hosting keeps its logs an hour, so a failed run is mailed to Site's address; its error stays on the job.
export async function cleanupFailed(req: PayloadRequest, job: number | string) {
  const { email } = await req.payload.findGlobal({
    slug: 'site',
    depth: 0,
    draft: false,
    fallbackLocale: false,
    locale: 'en',
    overrideAccess: true,
    req,
    select: { email: true },
  })
  await req.payload.sendEmail({
    to: email,
    subject: 'The daily cleanup failed',
    text: `The cleanup did not delete what is past its time. Its error is on job ${job} in the database; the next run tries again.`,
  })
}
