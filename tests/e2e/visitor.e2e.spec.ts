import type { APIRequestContext, Page } from '@playwright/test'

import { expect, test } from './test'

const waiting = (page: Page) => page.locator('.screen[data-waiting]')
const stamp = Date.now().toString(36)
const password = `a-password-for-${stamp}`
const title = `Hidden ${stamp}`
const name = `Visitor ${stamp}`
const hidden = `/hidden-${stamp}`
const wrong = 'Enter the password from your invite.'

// The owner's side, with its own cookies, so the page under test is never signed in to the admin.
let admin: APIRequestContext
let expires: string
const made: string[] = []

test.beforeAll(async ({ playwright }) => {
  admin = await playwright.request.newContext({ baseURL: 'http://localhost:3000' })
  await admin.post('/api/users/login', {
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  })
  const window = await admin.post('/api/windows?locale=en', {
    data: { title, slug: hidden.slice(1), hidden: true, _status: 'published' },
  })
  const { id } = (await window.json()).doc
  made.push(`/api/windows/${id}`)
  const visitors = [
    { name, password, windows: [id] },
    {
      name: `${name}, expired`,
      password: `${password}-expired`,
      windows: [id],
      expires: '2020-01-01',
    },
  ]
  for (const data of visitors) {
    const { doc } = await (await admin.post('/api/visitors', { data })).json()
    made.push(`/api/visitors/${doc.id}`)
    expires ??= doc.expires
  }
})

test.afterAll(async () => {
  for (const route of made) await admin.delete(route)
  await admin.dispose()
})

// The addresses a page asked for, none of which may carry the password.
function addresses(page: Page) {
  const asked: string[] = []
  page.on('request', (request) => asked.push(request.url()))
  return asked
}

test.describe('A visitor', () => {
  // Wrong passwords are counted by where they come from, so each test comes from an address of its own.
  test.beforeEach(async ({ page }, info) => {
    const from = `198.51.100.${(info.line + info.retry * 7) % 250}`
    await page.context().setExtraHTTPHeaders({ 'x-forwarded-for': `${from}-${stamp}` })
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('signs in with the password, sees the windows on their list, and none of them after "Continue as Guest"', async ({
    page,
    context,
  }) => {
    const asked = addresses(page)
    expect((await page.request.get(hidden)).status()).toBe(404)
    await page.goto('/imprint')

    await page.locator('header [data-visitor]').click()
    await waiting(page).getByRole('button', { name: 'Other user…' }).click()
    const field = waiting(page).getByLabel('Password')
    await expect(field).toHaveAttribute('autocomplete', 'current-password')
    await field.fill(password)
    await waiting(page).getByRole('button', { name: 'Show' }).click()
    await expect(field).toHaveAttribute('type', 'text')
    await waiting(page).getByRole('button', { name: 'Sign in' }).click()

    // Signing in reloads the page, which is now the visitor's.
    await expect(page.locator('header [data-visitor]')).toHaveText(new RegExp(name))
    await page.goto(hidden)
    await expect(page.getByRole('article', { name: title })).toBeVisible()
    expect(asked.filter((url) => url.includes(password))).toEqual([])

    const [cookie] = (await context.cookies()).filter((one) => one.name === 'visitor')
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax' })
    expect(Math.abs(cookie.expires - Date.parse(expires) / 1000)).toBeLessThan(1)

    // The lock screen is the login screen, which says until when the device stays signed in.
    await page.goto('/imprint')
    await page.getByRole('menubar').getByRole('menuitem', { name: 'Dimm OS' }).click()
    await page.getByRole('menuitem', { name: 'Lock screen' }).click()
    await expect(waiting(page).getByRole('heading', { name })).toBeVisible()
    await expect(
      waiting(page).getByText(/This device stays signed in until \d+ \w+ \d{4}\./),
    ).toBeVisible()
    await waiting(page).getByRole('button', { name: 'Not you? Continue as Guest' }).click()

    await expect(page.locator('header [data-visitor]')).toHaveText(/Guest/)
    expect((await context.cookies()).filter((one) => one.name === 'visitor')).toEqual([])
    expect((await page.request.get(hidden)).status()).toBe(404)
  })

  test('signs in with the personal link, whose password leaves the address and reaches no request', async ({
    page,
  }) => {
    const asked = addresses(page)
    await page.goto(`/login#p=${encodeURIComponent(password)}`)

    await expect(waiting(page).getByRole('heading', { name })).toBeVisible()
    await expect(waiting(page).getByText('Signed in with your personal link.')).toBeVisible()
    expect(new URL(page.url()).pathname + new URL(page.url()).hash).toBe('/')
    expect(asked.filter((url) => url.includes(password))).toEqual([])

    await waiting(page).getByRole('button', { name: 'Enter' }).click()
    await expect(waiting(page)).toHaveCount(0)
    await page.goto(hidden)
    await expect(page.getByRole('article', { name: title })).toBeVisible()
  })

  test('gets one answer for an empty, a wrong and an expired password, and another for too many tries', async ({
    page,
  }) => {
    const answers = []
    for (const typed of ['', `${password}-wrong`, `${password}-expired`]) {
      const response = await page.request.post('/login', { data: { password: typed } })
      const { date: _, ...headers } = response.headers()
      answers.push({ status: response.status(), body: await response.text(), headers })
    }
    expect(answers[0]).toMatchObject({ status: 200, body: '{"in":false}' })
    expect(answers[1]).toEqual(answers[0])
    expect(answers[2]).toEqual(answers[0])

    await page.goto('/login')
    const status = waiting(page).getByRole('status')
    await waiting(page).getByLabel('Password').fill(`${password}-expired`)
    await waiting(page).getByRole('button', { name: 'Sign in' }).click()
    await expect(status).toHaveText(wrong)

    for (let tries = 4; tries < 10; tries++)
      await page.request.post('/login', { data: { password: '' } })
    await waiting(page).getByRole('button', { name: 'Sign in' }).click()
    await expect(status).toHaveText('Too many tries. Try again later.')
    // Not even the right password comes in from there until the tries have run out.
    const limited = await page.request.post('/login', { data: { password } })
    expect(await limited.json()).toEqual({ in: false, limited: true })
  })

  test('is a guest with a cookie that was changed, and meets the password at a link that no longer signs in', async ({
    page,
    context,
  }) => {
    await page.request.post('/login', { data: { password } })
    const [cookie] = (await context.cookies()).filter((one) => one.name === 'visitor')
    await context.addCookies([{ ...cookie, value: cookie.value.replace(/^\d+/, '999999') }])
    expect((await page.request.get(hidden)).status()).toBe(404)

    await context.clearCookies()
    await page.goto(`/de/login#p=${encodeURIComponent(password)}-wrong`)
    await expect(waiting(page).getByRole('status')).toHaveText(
      'Geben Sie das Passwort aus Ihrer Einladung ein.',
    )
    expect(new URL(page.url()).hash).toBe('')
  })
})
