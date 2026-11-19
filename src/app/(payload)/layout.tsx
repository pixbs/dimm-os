/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. MODIFY AT YOUR OWN RISK. */
import config from '@payload-config'
import '@payloadcms/next/css'
import type { ServerFunctionClient } from 'payload'
import {
  generatePayloadViewport,
  handleServerFunctions,
  RootLayout,
} from '@payloadcms/next/layouts'
import localFont from 'next/font/local'
import React from 'react'

import { importMap } from './admin/importMap.js'
import './custom.css'

export const generateViewport = generatePayloadViewport

// The admin's typefaces, which Payload otherwise fetches from Google at build time, served from local files: the latin
// subset, and Latin Extended, which custom.css puts first in each family.
const inter = localFont({
  src: './fonts/inter-latin.woff2',
  variable: '--font-inter',
  weight: '100 900',
})
const robotoMono = localFont({
  src: './fonts/roboto-mono-latin.woff2',
  variable: '--font-roboto-mono',
  weight: '100 700',
})
const interExtended = localFont({
  src: './fonts/inter-latin-ext.woff2',
  variable: '--font-inter-ext',
  weight: '100 900',
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
const robotoMonoExtended = localFont({
  src: './fonts/roboto-mono-latin-ext.woff2',
  variable: '--font-roboto-mono-ext',
  weight: '100 700',
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
const fonts = [inter, interExtended, robotoMono, robotoMonoExtended].map(
  ({ className, variable }) => ({ className, variable }),
)

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} fonts={fonts} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
