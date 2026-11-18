import '@/ds/atoms/index.css'
import '@/ds/molecules/index.css'
import '@/ds/organisms/index.css'
import '@/ds/sections/index.css'

import type { Metadata } from 'next'
import localFont from 'next/font/local'

import { apply } from '@/ds/atoms/settings'
import { Motion } from '@/ds/motion/Motion'
import { origin } from '@/i18n/address'

// The site serves its typefaces itself, in the latin subset, so no build fetches them.
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
      className={`${sans.variable} ${mono.variable} ${monoKeys.variable}`}
      lang={lang}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(${apply})()` }} />
      </head>
      <body data-surface="desktop">
        <Motion>{children}</Motion>
      </body>
    </html>
  )
}
