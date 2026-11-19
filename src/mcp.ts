import type { MCPPluginConfig } from '@payloadcms/plugin-mcp'

import { voice } from '@/i18n/voice'

// How an agent writes, whatever it writes.
const writing = `Writing over MCP

- Every write names one language: locale "en" or "de", never "all", and never publishAllLocales. A German write publishes German only.
- Rich text is Lexical JSON.
- A field without a value is left out: a write refuses the null that a read shows.
- Pictures up to about 3 MB go inline as base64; a larger one goes by externalURL from the allowed host.`

// What an agent reads with a collection's schema: the voice, how to write, then that collection's own lines.
export const forAgents = (...lines: string[]) => [voice, writing, lines.join('\n')].join('\n\n')

// Every built-in tool by name; the MCP test fails if Payload adds one that these leave open.
const collectionOff = {
  count: false,
  countVersions: false,
  create: false,
  delete: false,
  duplicate: false,
  find: false,
  findDistinct: false,
  findVersionByID: false,
  findVersions: false,
  getCollectionSchema: false,
  getUploadInstructions: false,
  restoreVersion: false,
  update: false,
} as const
const globalOff = {
  countGlobalVersions: false,
  find: false,
  findGlobalVersionByID: false,
  findGlobalVersions: false,
  getGlobalSchema: false,
  restoreGlobalVersion: false,
  update: false,
} as const
const off = { tools: collectionOff }
const content = { tools: { delete: false } } as const

// Payload 4 exposes every collection and global by default: these three lose delete, Site stays whole, and every
// other one is switched off by name.
export const mcp: MCPPluginConfig = {
  collections: {
    windows: content,
    media: content,
    forms: content,
    users: off,
    visitors: off,
    senders: off,
    'form-submissions': off,
    'payload-kv': off,
    'payload-jobs': off,
    'payload-locked-documents': off,
    'payload-preferences': off,
    'payload-migrations': off,
    'payload-llm-instructions': off,
  },
  globals: {
    'payload-jobs-stats': { tools: globalOff },
  },
  // An agent signs in with a user's API key alone.
  oauth: false,
}
