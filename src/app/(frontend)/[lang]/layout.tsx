import '@/ds/atoms/index.css'

import { Inter_Tight, JetBrains_Mono } from 'next/font/google'

import { apply } from '@/ds/atoms/settings'

const sans = Inter_Tight({ subsets: ['latin'], variable: '--font-inter-tight', weight: ['400', '500'] })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', weight: '400' })

export const metadata = {
  title: 'Dimm OS',
  // The real icon comes with the metadata; an empty one keeps the browser from asking for a missing file.
  icons: { icon: 'data:,' },
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params

  return (
    // The script below writes the settings onto the root before React reads it.
    <html className={`${sans.variable} ${mono.variable}`} lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(${apply})()` }} />
      </head>
      <body data-surface="desktop">{children}</body>
    </html>
  )
}
