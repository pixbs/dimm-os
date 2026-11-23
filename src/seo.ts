import type {
  GenerateDescription,
  GenerateImage,
  GenerateTitle,
  GenerateURL,
  SEOPluginConfig,
} from '@payloadcms/plugin-seo/types'

import { hasLanguage, languages, origin, toAddress } from '@/i18n/address'
import type { Window } from '@/payload-types'

type Shown = Partial<Pick<Window, 'title' | 'headline' | 'description' | 'cover' | 'sections'>>

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

// The desk at / shows no words of its own and no picture, so Site generates none.
const generateTitle: GenerateTitle<Shown> = ({ doc, globalConfig }) =>
  globalConfig ? '' : firsts(doc).title

const generateDescription: GenerateDescription<Shown> = ({ doc, globalConfig }) =>
  (!globalConfig && firsts(doc).text) || ''

const generateImage: GenerateImage<Shown> = ({ doc, globalConfig }) => {
  const picture = globalConfig ? null : firsts(doc).pictures.find((file) => file != null)
  return (typeof picture === 'object' ? picture?.id : picture) ?? ''
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
