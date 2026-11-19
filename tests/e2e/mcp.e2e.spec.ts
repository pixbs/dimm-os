import type { APIRequestContext, Page } from '@playwright/test'

import { expect, test } from './test'

const front = (page: Page) => page.locator('article[data-front]')
const stamp = Date.now().toString(36)
const address = `/ready-${stamp}`

// The owner's side makes the content user and removes what the run made; the agent holds that user's key alone.
let admin: APIRequestContext
let agent: APIRequestContext
const made: string[] = []

test.beforeAll(async ({ playwright }) => {
  const baseURL = 'http://localhost:3000'
  const apiKey = `a-local-api-key-for-${stamp}`
  admin = await playwright.request.newContext({ baseURL })
  await admin.post('/api/users/login', {
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  })
  const user = await admin.post('/api/users', {
    data: {
      email: `ready-${stamp}@example.com`,
      password: `a-password-for-${stamp}`,
      role: 'content',
      apiKey,
    },
  })
  made.push(`/api/users/${(await user.json()).doc.id}`)
  agent = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: {
      Accept: 'application/json, text/event-stream',
      Authorization: `users API-Key ${apiKey}`,
    },
  })
})

test.afterAll(async () => {
  // An item goes before its window.
  for (const route of made.reverse()) await admin.delete(route)
  await admin.dispose()
  await agent.dispose()
})

// A Text section, its running text as the editor stores it.
const text = (words: string) => ({
  blockType: 'text',
  body: {
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
            {
              type: 'text',
              text: words,
              format: 0,
              detail: 0,
              mode: 'normal',
              style: '',
              version: 1,
            },
          ],
        },
      ],
    },
  },
})

// One write to Windows over MCP, in one language; without an id, a new window, whose id it answers.
async function write(locale: 'de' | 'en', data: object, id?: number): Promise<number> {
  const response = await agent.post('/api/mcp', {
    data: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: id
        ? { name: 'updateDocument', arguments: { slug: 'windows', id, locale, data } }
        : {
            name: 'createDocuments',
            arguments: { slug: 'windows', locale, returning: true, documents: [{ data }] },
          },
    },
  })
  const { result } = await response.json()
  expect(result?.isError ?? false, JSON.stringify(result)).toBe(false)
  return id ?? result.structuredContent.docs[0].doc.id
}

test.describe('The readiness run', () => {
  test('writes a window and its item over MCP, one language at a time, and each page shows the write at the next request', async ({
    page,
  }) => {
    test.slow()
    const shows = async (path: string, title: string, words: string) => {
      await page.goto(path)
      await expect(front(page).locator('h1')).toHaveText(title)
      await expect(front(page).getByText(words)).toBeVisible()
    }
    // English first, which the German address shows until the German is written; then a change to the English.
    const run = async (path: string, en: string, de: string, parent?: number) => {
      const english = { title: `${en} ${stamp}`, words: `${en}, in English.` }
      const german = { title: `${de} ${stamp}`, words: `${de}, auf Deutsch.` }
      const id = await write('en', {
        title: english.title,
        slug: path.split('/').pop(),
        parent,
        _status: 'published',
        sections: [text(english.words)],
      })
      made.push(`/api/windows/${id}`)
      await shows(path, english.title, english.words)
      await shows(`/de${path}`, english.title, english.words)

      await write(
        'de',
        { title: german.title, _status: 'published', sections: [text(german.words)] },
        id,
      )
      await shows(`/de${path}`, german.title, german.words)
      await shows(path, english.title, english.words)

      await write('en', { sections: [text(`${en}, changed.`)] }, id)
      await shows(path, english.title, `${en}, changed.`)
      await shows(`/de${path}`, german.title, german.words)
      return id
    }

    const id = await run(address, 'Window', 'Fenster')
    await run(`${address}/item`, 'Item', 'Stück', id)
  })
})
