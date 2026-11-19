import config from '@payload-config'
import { getAuthorizedMCP } from '@payloadcms/plugin-mcp/internal'
import { createPayloadRequest, getPayload, handleEndpoints, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { User } from '@/payload-types'

// The one host a picture may come from by address, named before the config loads.
vi.hoisted(() => {
  process.env.MEDIA_URL_HOST = 'pictures.example.com'
})

let payload: Payload

const emails = ['mcp-admin@example.com', 'mcp-content@example.com']
const key = (name: string) => ({ Authorization: `users API-Key a-local-api-key-for-the-${name}` })
const admin = key('mcp-admin')
const content = key('mcp-content')
const slug = 'mcp-fenster'
const rule = 'MCP, a rule only the admin holds.'
const exposed = ['forms', 'media', 'site', 'windows']

type Answer = {
  status: number
  error?: { message: string }
  result?: { content?: { text: string }[]; isError?: boolean; tools?: { name: string }[] }
}

const rest = (route: string, init?: RequestInit) =>
  handleEndpoints({ config, request: new Request(`http://localhost:3000/api${route}`, init) })

// One request to the MCP endpoint, as a client sends it.
const mcp = async (method: string, params: object, headers: object): Promise<Answer> => {
  const response = await rest('/mcp', {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  return { status: response.status, ...(await response.json()) }
}
const call = (name: string, args: object, headers: object = content) =>
  mcp('tools/call', { name, arguments: args }, headers)
const said = (answer: Answer) => (answer.result?.content ?? []).map(({ text }) => text).join('\n')

// Running text as the editor stores it.
const lexical = (text: string) => ({
  root: {
    type: 'root',
    direction: null,
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        type: 'paragraph',
        direction: null,
        format: '',
        indent: 0,
        version: 1,
        textFormat: 0,
        textStyle: '',
        children: [
          { type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 },
        ],
      },
    ],
  },
})

const saveRule = (additionalInstructions: null | ReturnType<typeof lexical>) =>
  payload.update({
    collection: 'payload-llm-instructions',
    id: 'collection-windows',
    data: { additionalInstructions } as never,
    depth: 0,
    overrideAccess: true,
  })

const clear = async () => {
  await payload.delete({
    collection: 'windows',
    depth: 0,
    locale: 'en',
    overrideAccess: true,
    where: { slug: { equals: slug } },
  })
  await payload.delete({
    collection: 'media',
    overrideAccess: true,
    where: { alt: { equals: 'MCP, a file' } },
  })
  await payload.delete({
    collection: 'users',
    overrideAccess: true,
    where: { email: { in: emails } },
  })
}

beforeAll(async () => {
  payload = await getPayload({ config })
  await clear()
  const create = (email: string, role: User['role'], headers: { Authorization: string }) =>
    payload.create({
      collection: 'users',
      data: {
        email,
        password: 'a-local-password',
        role,
        apiKey: headers.Authorization.split(' ')[2],
      },
      depth: 0,
      draft: false,
      fallbackLocale: false,
      locale: 'en',
      overrideAccess: true,
    })
  // The admin first, since the first user of an empty database is always the admin.
  await create(emails[0], 'admin', admin)
  await create(emails[1], 'content', content)
  // A signed-in read makes the instructions' entry of each collection and global.
  await rest('/payload-llm-instructions?depth=0&limit=0', { headers: content })
})

afterAll(async () => {
  await saveRule(null)
  await clear()
})

describe('MCP', () => {
  it('gives Windows, Media, Forms and Site alone, to the admin too, and no tool that deletes', async () => {
    for (const headers of [admin, content]) {
      const req = await createPayloadRequest({ payload, req: { headers: new Headers(headers) } })
      const { items } = await getAuthorizedMCP({ overrideAccess: false, req })
      const targets = items.flatMap((item) =>
        item.type === 'collectionTool'
          ? [item.collectionSlug]
          : item.type === 'globalTool'
            ? [item.globalSlug]
            : [],
      )
      expect([...new Set(targets)].sort()).toEqual(exposed)
      expect(items.filter((item) => item.configKey === 'delete')).toEqual([])

      const { result } = await mcp('tools/list', {}, headers)
      const tools = result?.tools?.map(({ name }) => name) ?? []
      expect(tools).toContain('updateDocument')
      expect(tools).not.toContain('deleteDocuments')
      expect(said(await call('getConfigInfo', {}, headers))).toBe(
        'Collections: windows, media, forms\nGlobals: site',
      )
    }

    // The admin may read every collection, so only the plugin's settings keep these closed.
    const closed = payload.config.collections
      .map((collection) => collection.slug)
      .filter((collection) => !exposed.includes(collection))
    expect(closed).toEqual(expect.arrayContaining(['users', 'visitors', 'form-submissions']))
    for (const collection of closed) {
      const answer = await call('findDocuments', { slug: collection }, admin)
      expect(answer.result?.isError, collection).toBe(true)
      expect(said(answer), collection).toContain('is not enabled')
    }
    expect(
      (await call('deleteDocuments', { slug: 'windows', id: 1 }, admin)).result,
    ).toBeUndefined()
  })

  it('serves no one without a key, and signs no one in over OAuth', async () => {
    const guest = await mcp('tools/list', {}, {})
    expect(guest.result).toBeUndefined()
    expect(guest.error).toBeDefined()
    expect((await mcp('tools/list', {}, key('no-one'))).status).toBe(401)

    // With OAuth on, a signed-out client is sent to sign in, and these addresses answer.
    expect((await rest('/mcp')).headers.has('WWW-Authenticate')).toBe(false)
    for (const route of [
      '/mcp/oauth-protected-resource',
      '/mcp/oauth/.well-known/openid-configuration',
    ])
      expect((await rest(route)).status, route).toBe(404)
    expect((await rest('/mcp/oauth/register', { method: 'POST', body: '{}' })).status).toBe(404)
  })

  it('publishes a German write in German alone, from Lexical JSON', async () => {
    const answer = await call('createDocuments', {
      slug: 'windows',
      locale: 'de',
      documents: [
        {
          data: {
            title: 'Fenster',
            slug,
            _status: 'published',
            sections: [{ blockType: 'text', body: lexical('Hallo.') }],
          },
        },
      ],
    })
    expect(answer.result?.isError, said(answer)).toBe(false)

    const {
      docs: [made],
    } = await payload.find({
      collection: 'windows',
      depth: 0,
      draft: true,
      fallbackLocale: false,
      locale: 'all',
      overrideAccess: true,
      where: { slug: { equals: slug } },
    })
    expect(made._status).toEqual({ de: 'published' })
    expect(JSON.stringify(made.sections)).toContain('Hallo.')
  })

  it('takes a file of 3 MB inline, and a larger one by address from the allowed host alone', async () => {
    const file = (megabytes: number) => ({
      source: 'base64',
      name: 'mcp.txt',
      mimeType: 'text/plain',
      data: Buffer.alloc(megabytes * 1_000_000, 'a').toString('base64'),
    })
    const create = (source: object) =>
      call('createDocuments', {
        slug: 'media',
        locale: 'en',
        documents: [{ data: { alt: 'MCP, a file' }, file: source }],
      })

    const inline = await create(file(3))
    expect(inline.result?.isError, said(inline)).toBe(false)
    expect((await create(file(4))).status).toBe(413)

    const elsewhere = await create({ source: 'externalURL', url: 'https://example.com/large.png' })
    expect(elsewhere.result?.isError).toBe(true)
    expect(said(elsewhere)).toContain('The provided file URL is not allowed.')
  })

  it('gives the voice, the lines of the collection and the saved rules with its schema, and the saved rules to no one signed out', async () => {
    await saveRule(lexical(rule))

    const schema = said(await call('getCollectionSchema', { slug: 'windows' }))
    expect(schema).toContain('Voice guide')
    expect(schema).toContain('go the other way round: German first.')
    expect(schema).toContain(rule)

    const saved = await rest('/payload-llm-instructions/collection-windows?depth=0', {
      headers: content,
    })
    expect(JSON.stringify(await saved.json())).toContain(rule)
    for (const route of ['?depth=0', '/collection-windows?depth=0']) {
      const guest = await rest(`/payload-llm-instructions${route}`)
      expect(guest.status, route).toBe(403)
      expect(await guest.text(), route).not.toContain(rule)
    }
    const guest = await mcp(
      'tools/call',
      { name: 'getCollectionSchema', arguments: { slug: 'windows' } },
      {},
    )
    expect(JSON.stringify(guest)).not.toContain(rule)
    expect(guest.result).toBeUndefined()
  })
})
