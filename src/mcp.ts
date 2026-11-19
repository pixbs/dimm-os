import type { MCPPluginConfig } from '@payloadcms/plugin-mcp'

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

// Payload 4 exposes every collection and global by default, so each one is named here.
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
  // Only the content user's API key signs in.
  oauth: false,
}
