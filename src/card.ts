import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { PayloadRequest } from 'payload'

import { ShareCard, type Shown, size } from '@/ds/organisms/ShareCard'
import type { Language } from '@/i18n/address'
import type { Media } from '@/payload-types'

// What a card is drawn from: the words it shows and, for a window, its headline, its surface and its picture.
export type From = {
  title: string
  text: string | null
  window?: { headline: string; paper: boolean; picture: Media | number | null }
}

// The two faces as ImageResponse reads them: the subsets the site serves, each weight a file of its own.
const faces = [
  ['sans', 400, 'inter-tight-latin-400'],
  ['sans', 500, 'inter-tight-latin-500'],
  ['sans', 400, 'inter-tight-latin-ext-400'],
  ['sans', 500, 'inter-tight-latin-ext-500'],
  ['mono', 400, 'jetbrains-mono-latin'],
  ['mono', 400, 'jetbrains-mono-latin-ext'],
] as const
const read = (file: string) =>
  readFile(path.join(process.cwd(), 'src/ds/atoms/faces', `${file}.woff`))
let fonts: Promise<{ name: string; weight: 400 | 500; style: 'normal'; data: Buffer }[]> | undefined

export async function draw(shown: Shown) {
  const { ImageResponse } = await import('next/og')
  fonts ??= Promise.all(
    faces.map(async ([name, weight, file]) => ({
      name,
      weight,
      style: 'normal' as const,
      data: await read(file),
    })),
  )
  const drawn = new ImageResponse(ShareCard(shown), { ...size, fonts: await fonts })
  return Buffer.from(await drawn.arrayBuffer())
}

const trusted = { depth: 0, fallbackLocale: false, overrideAccess: true } as const

// The card of a window, by its id, or of Site, in one language: drawn anew into its own document where what it shows
// has changed, and made where there is none. It answers the card's id, or nothing where the field holds a picture
// chosen by hand, which stays, or the drawing failed, which fails nothing.
export async function card(
  req: PayloadRequest,
  owner: { windows?: number | string; locale: Language },
  from: From,
  held?: number | null,
) {
  const { payload } = req
  const { locale } = owner
  const media = { collection: 'media', ...trusted, locale, req } as const
  try {
    // A window not saved yet has no id, and its card no owner until it has.
    const of = 'windows' in owner ? 'windows' : 'site'
    const id = 'windows' in owner ? Number(owner.windows) || null : 0
    const chosen = from.window?.picture
    const file =
      typeof chosen === 'number'
        ? await payload.findByID({ ...media, id: chosen, disableErrors: true })
        : chosen
    const share = file?.variants?.share
    const picture = share?.url && share.filename ? { ...share, id: file!.id } : null
    const drawn = {
      of,
      id,
      locale,
      title: from.title,
      text: from.text,
      headline: from.window?.headline ?? null,
      paper: from.window?.paper ?? null,
      // A picture changed since is another picture.
      picture: picture && `${picture.id} ${file!.updatedAt}`,
    }
    const said = (mark: unknown) => JSON.stringify(mark, Object.keys(drawn).sort())

    let own = held ? await payload.findByID({ ...media, id: held, disableErrors: true }) : null
    const mark = own?.drawn as typeof drawn | null | undefined
    if (own && !mark) return
    // The card of another window, as a duplicate holds it, stays that window's.
    if (mark && mark.id !== null && (mark.of !== of || mark.id !== id || mark.locale !== locale))
      own = null
    if (!own && id !== null)
      own = (
        await payload.find({
          ...media,
          limit: 1,
          where: {
            and: [
              { 'drawn.of': { equals: of } },
              { 'drawn.id': { equals: id } },
              { 'drawn.locale': { equals: locale } },
            ],
          },
        })
      ).docs[0]
    if (own && said(own.drawn) === said(drawn)) return own.id

    const bytes =
      picture &&
      (/^https?:/.test(picture.url!)
        ? Buffer.from(await (await fetch(picture.url!)).arrayBuffer())
        : await readFile(
            path.resolve(
              payload.collections.media.config.upload.staticDir ?? '',
              picture.filename!,
            ),
          ))
    const data = await draw({
      title: from.title,
      text: from.text,
      window: from.window && {
        ...from.window,
        picture: bytes && {
          src: `data:${picture.mimeType};base64,${bytes.toString('base64')}`,
          at: `${file!.focalX ?? 50}% ${file!.focalY ?? 50}%`,
        },
      },
    })
    const saved = {
      data: { alt: from.title, drawn },
      file: {
        data,
        mimetype: 'image/png',
        name: `card-${of}-${id ?? 'new'}-${locale}.png`,
        size: data.length,
      },
    }
    return (
      own
        ? await payload.update({ ...media, ...saved, id: own.id })
        : await payload.create({ ...media, ...saved })
    ).id
  } catch (error) {
    payload.logger.error({ err: error }, 'The card of a shared link was not drawn')
  }
}
