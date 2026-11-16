import '@/ds/atoms/index.css'
import '@/ds/molecules/index.css'
import '@/ds/organisms/index.css'

import { Inter_Tight, JetBrains_Mono } from 'next/font/google'
import localFont from 'next/font/local'

import { apply } from '@/ds/atoms/settings'
import { Motion } from '@/ds/motion/Motion'

const sans = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  weight: ['400', '500'],
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: '400',
})
// Google ships these key glyphs of the mono font in no subset, so the site serves them itself.
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

export const metadata = {
  title: 'Dimm OS',
  // The real icon comes with the metadata; an empty one keeps the browser from asking for a missing file.
  icons: { icon: 'data:,' },
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
