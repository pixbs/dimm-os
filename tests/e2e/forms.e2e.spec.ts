import type { Page } from '@playwright/test'

import { login } from './login'
import { expect, test } from './test'

const slip = (page: Page, name: string) => page.locator(`article[aria-label="${name}"]`)

// The device's clock runs two minutes ahead of the server's, which takes nothing from the time a person fills it in.
const ahead = (page: Page) => page.clock.install({ time: Date.now() + 120_000 })

test.describe('Forms', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a paper window with a form is a slip: the To line, the fields, and Send at its foot', async ({
    page,
  }) => {
    await page.goto('/contact', { waitUntil: 'networkidle' })
    const window = slip(page, 'Contact')

    await expect(window.locator('.record__stamp')).toContainText('FIX/MSG.01')
    await expect(window.getByLabel('To')).toHaveValue('site@example.com')
    await expect(window.getByLabel('To')).toHaveAttribute('readonly')
    await expect(window.getByRole('radio')).toHaveCount(4)
    const send = window.getByRole('button', { name: 'Send' })
    await expect(send).toHaveAttribute('form', /slip/)
    await expect(window.locator('form').getByRole('button', { name: 'Send' })).toHaveCount(0)
    await expect(window.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/privacy-policy',
    )
  })

  for (const [lang, path, button, said, email] of [
    ['en', '/contact', 'Send', 'Still missing: Email and Message.', 'Email'],
    ['de', '/de/contact', 'Senden', 'Noch offen: E-Mail und Nachricht.', 'E-Mail'],
  ] as const)
    test(`a missing field is named from the form's own label (${lang})`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' })
      const window = slip(page, lang === 'en' ? 'Contact' : 'Kontakt')
      await window.getByRole('button', { name: button }).click()

      await expect(window.getByRole('status')).toHaveText(said)
      // On a slip the message stands above Send, where the window's scroll never hides it.
      await expect(window.getByRole('status')).toBeInViewport({ ratio: 1 })
      const field = window.getByLabel(email)
      await expect(field).toHaveAttribute('aria-invalid', 'true')
      await expect(field).toBeFocused()
      // The mark goes as soon as the row is filled.
      await field.fill('ana@example.com')
      await expect(field).not.toHaveAttribute('aria-invalid')
    })

  test('a failed send keeps what was typed and says what to do', async ({ page }) => {
    // The network is down for the send alone, which the browser reports as no error of the page.
    await page.addInitScript(() => {
      const fetch = globalThis.fetch
      globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
        String(input).endsWith('/send')
          ? Promise.reject(new TypeError('offline'))
          : fetch(input, init)
    })
    await page.goto('/contact', { waitUntil: 'networkidle' })
    const window = slip(page, 'Contact')
    await window.getByLabel('Email').fill('ana@example.com')
    await window.getByLabel('Message').fill('Hello from a failed send.')
    await window.getByRole('button', { name: 'Send' }).click()

    await expect(window.getByRole('status')).toHaveText(
      'Not sent. Try again, or write to site@example.com.',
    )
    await expect(window.getByLabel('Email')).toHaveValue('ana@example.com')
    await expect(window.getByLabel('Message')).toHaveValue('Hello from a failed send.')
  })

  test('a message is sent, kept as a submission, and confirmed', async ({ page }) => {
    const text = `Hello from the end-to-end test, ${Date.now()}.`
    await ahead(page)
    await page.goto('/contact', { waitUntil: 'networkidle' })
    const window = slip(page, 'Contact')
    await window.getByLabel('Name').fill('Ana')
    await window.getByLabel('Email').fill('ana@example.com')
    await window.getByText('A second subject').click()
    await window.getByLabel('Message').fill(text)
    await page.clock.fastForward(10_000)
    await window.getByRole('button', { name: 'Send' }).click()

    await expect(window.getByRole('status')).toContainText(
      'Message sent.I will reply to ana@example.com.',
    )
    await expect(window.getByRole('button', { name: 'Send' })).toHaveCount(0)
    // It leads to a new slip, as its arrow says.
    await expect(
      window.getByRole('button', { name: 'New message' }).locator('.btn__end svg'),
    ).toBeVisible()
    await window.getByRole('button', { name: 'New message' }).click()
    await expect(window.getByLabel('Message')).toHaveValue('')

    await login(page)
    const found = await page.request.get(
      `/api/form-submissions?depth=0&where[submissionData.value][equals]=${encodeURIComponent(text)}`,
    )
    const [submission] = (await found.json()).docs
    expect(
      submission.submissionData.map(({ field, value }: { field: string; value: string }) => [
        field,
        value,
      ]),
    ).toEqual([
      ['name', 'Ana'],
      ['email', 'ana@example.com'],
      ['subject', 'A second subject'],
      ['message', text],
    ])
  })
})
