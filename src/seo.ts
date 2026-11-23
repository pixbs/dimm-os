import type {
  GenerateDescription,
  GenerateImage,
  GenerateTitle,
  GenerateURL,
  SEOPluginConfig,
} from '@payloadcms/plugin-seo/types'

import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

import { card, type From } from '@/card'
import { nested } from '@/hooks/nested'
import { hasLanguage, languages, origin, toAddress } from '@/i18n/address'
import type { Site, Window } from '@/payload-types'

type Shown = Partial<
  Pick<Window, 'title' | 'headline' | 'description' | 'cover' | 'sections' | 'paper'>
>

// What a window shows where its Listing leaves a part empty: the title and text of its first Header, and its pictures
// after its cover.
export const firsts = (doc: Shown) => {
  const header = doc.sections?.find((block) => block.blockType === 'header')
  const pictures = (doc.sections ?? []).flatMap((block) =>
    block.blockType === 'media' ? block.items.map(({ picture }) => picture) : [],
  )
  return {
    title: doc.headline || header?.title || doc.title || '',
    text: doc.description || header?.text || null,
    pictures: [doc.cover, ...pictures],
  }
}

// The desk at / shows no words of its own, so Site generates none.
const generateTitle: GenerateTitle<Shown> = ({ doc, globalConfig }) =>
  globalConfig ? '' : firsts(doc).title

const generateDescription: GenerateDescription<Shown> = ({ doc, globalConfig }) =>
  (!globalConfig && firsts(doc).text) || ''

// What the card of a window is drawn from, and the desk's, which shows the site's own title where Site has none.
const windowCard = (doc: Shown): From => {
  const { title, text, pictures } = firsts(doc)
  return {
    title: doc.title ?? '',
    text,
    window: {
      headline: title,
      paper: Boolean(doc.paper),
      picture: pictures.find((file) => file != null) ?? null,
    },
  }
}
const siteCard = (doc: Pick<Site, 'meta'>): From => ({
  title: doc.meta?.title || 'Dimm OS',
  text: doc.meta?.description || null,
})

const idOf = (file?: { id: number } | number | null) => (typeof file === 'object' ? file?.id : file)

// Auto-generate draws the card from what the form holds.
const generateImage: GenerateImage<Shown & Pick<Site, 'meta'>> = async (args) => {
  const { doc, globalConfig, id, locale, req } = args
  const language = locale && hasLanguage(locale) ? locale : languages[0]
  const owner = globalConfig ? { locale: language } : { windows: id, locale: language }
  return (await card(req, owner, globalConfig ? siteCard(doc) : windowCard(doc))) ?? ''
}

// What a save answers may hold a part of the document, so the hooks read it whole, as a guest gets it.
const whole = { depth: 0, draft: false, fallbackLocale: false, overrideAccess: true } as const

// A window published in a language has its card in the image field of that language; a draft draws nothing.
export const drawWindowCard: CollectionAfterChangeHook<Window> = async ({ context, doc, req }) => {
  const { locale } = req
  if (context.draft || !locale || !hasLanguage(locale)) return doc
  const saved = await req.payload.findByID({
    collection: 'windows',
    id: doc.id,
    ...whole,
    ...nested(req),
  })
  if (saved._status !== 'published') return doc
  const held = idOf(saved.meta?.image)
  const image = await card(req, { windows: doc.id, locale }, windowCard(saved), held)
  if (!image || image === held) return doc
  await req.payload.update({
    collection: 'windows',
    id: doc.id,
    data: { meta: { ...saved.meta, image } },
    ...whole,
    ...nested(req),
  })
  return doc.meta ? { ...doc, meta: { ...doc.meta, image } } : doc
}

export const deleteWindowCards: CollectionAfterDeleteHook<Window> = async ({ id, req }) => {
  await req.payload.delete({
    collection: 'media',
    ...whole,
    ...nested(req),
    where: { and: [{ 'drawn.of': { equals: 'windows' } }, { 'drawn.id': { equals: id } }] },
  })
}

// Site saves directly, so every save keeps the desk's card.
export const drawSiteCard: GlobalAfterChangeHook = async ({ doc, req }) => {
  const { locale } = req
  if (!locale || !hasLanguage(locale)) return doc
  const saved = await req.payload.findGlobal({ slug: 'site', ...whole, ...nested(req) })
  const held = idOf(saved.meta?.image)
  const image = await card(req, { locale }, siteCard(saved), held)
  if (!image || image === held) return doc
  await req.payload.updateGlobal({
    slug: 'site',
    data: { meta: { ...saved.meta, image } },
    ...whole,
    ...nested(req),
  })
  return doc.meta ? { ...doc, meta: { ...doc.meta, image } } : doc
}

// A window's address under its parent, or the desk's for Site, in the language being edited.
const generateURL: GenerateURL<Partial<Window>> = async ({ doc, globalConfig, locale, req }) => {
  const language = locale && hasLanguage(locale) ? locale : languages[0]
  let path = '/'
  if (!globalConfig) {
    const parent =
      typeof doc.parent === 'number'
        ? await req.payload.findByID({
            collection: 'windows',
            id: doc.parent,
            depth: 0,
            disableErrors: true,
            draft: false,
            fallbackLocale: false,
            locale: language,
            overrideAccess: false,
            req,
            select: { slug: true },
          })
        : doc.parent
    path = `${parent ? `/${parent.slug}` : ''}/${doc.slug ?? ''}`
  }
  return new URL(toAddress(language, path), origin()).href
}

// Windows place the plugin's fields in a tab of their own; Site takes them where the plugin adds them, at its end.
export const seo: SEOPluginConfig = {
  generateDescription,
  generateImage,
  generateTitle,
  generateURL,
  globals: ['site'],
  uploadsCollection: 'media',
}
