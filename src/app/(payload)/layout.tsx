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

// The admin's typefaces, which Payload otherwise fetches from Google at build time, served from local files.
const inter = localFont({
  src: './fonts/inter-latin.woff2',
  variable: '--font-family-sans',
  weight: '100 900',
})
const robotoMono = localFont({
  src: './fonts/roboto-mono-latin.woff2',
  variable: '--font-family-mono',
  weight: '100 700',
})
const fonts = [inter, robotoMono].map(({ className, variable }) => ({ className, variable }))

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
