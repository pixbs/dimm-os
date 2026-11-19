import '@/ds/atoms/index.css'
import '@/ds/molecules/index.css'
import '@/ds/organisms/index.css'
import '@/ds/sections/index.css'

import type { Metadata } from 'next'
import localFont from 'next/font/local'

import { apply } from '@/ds/atoms/settings'
import { Motion } from '@/ds/motion/Motion'
import { languages, origin, toAddress } from '@/i18n/address'

// Where the desk is in each language: the intro plays there alone.
const homes = JSON.stringify(languages.map((language) => toAddress(language, '/')))

// The site serves its typefaces itself, so no build fetches them: the latin subset, and Latin Extended, which a page
// loads only when it holds one of its letters.
const sans = localFont({
  src: [
    { path: './inter-tight-latin.woff2', weight: '400' },
    { path: './inter-tight-latin.woff2', weight: '500' },
  ],
  variable: '--font-inter-tight',
})
const mono = localFont({
  src: './jetbrains-mono-latin.woff2',
  variable: '--font-jetbrains-mono',
  weight: '400',
})
const sansExtended = localFont({
  src: [
    { path: './inter-tight-latin-ext.woff2', weight: '400' },
    { path: './inter-tight-latin-ext.woff2', weight: '500' },
  ],
  variable: '--font-inter-tight-ext',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
    },
  ],
})
const monoExtended = localFont({
  src: './jetbrains-mono-latin-ext.woff2',
  variable: '--font-jetbrains-mono-ext',
  weight: '400',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
    },
  ],
})
// The key glyphs of the mono font, which no subset of it holds.
const monoKeys = localFont({
  src: './jetbrains-mono-keys.woff2',
  variable: '--font-jetbrains-mono-keys',
  weight: '400',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'unicode-range', value: 'U+2190, U+2192, U+21E7, U+2318, U+2325, U+23CE' },
  ],
})

export const metadata: Metadata = {
  metadataBase: origin(),
  title: { default: 'Dimm OS', template: '%s · Dimm OS' },
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params

  return (
    // The script below writes the settings onto the root before React reads it.
    <html
      className={`${sans.variable} ${sansExtended.variable} ${mono.variable} ${monoExtended.variable} ${monoKeys.variable}`}
      lang={lang}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(${apply})(${homes})` }} />
      </head>
      <body data-surface="desktop">
        <Motion>{children}</Motion>
      </body>
    </html>
  )
}
