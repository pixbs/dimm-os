import { expect, test } from './test'

const pages = [
  '',
  '/colour',
  '/type',
  '/space',
  '/icons',
  '/motion',
  '/actions',
  '/rows',
  '/inputs',
  '/content',
  '/shell',
  '/records',
  '/sections',
]

// Everything the catalogue draws, held against the tokens the page itself declares.
function audit(): string[] {
  const root = getComputedStyle(document.documentElement)
  const tokens = [...document.styleSheets]
    .flatMap((sheet) => [...sheet.cssRules])
    .filter((rule) => rule instanceof CSSStyleRule && rule.selectorText === ':root')
    .flatMap((rule) => [...(rule as CSSStyleRule).style])
    .filter((name) => name.startsWith('--'))
  const named = (prefix: string) => tokens.filter((name) => name.startsWith(prefix))
  const lengths = (prefix: string) =>
    named(prefix).map((name) => parseFloat(root.getPropertyValue(name)))

  const probe = document.body.appendChild(document.createElement('i'))
  const colours = (value: string) =>
    [...value.matchAll(/rgba?\(([^)]+)\)|color\(srgb ([^)]+)\)/g)].map(([, bytes, shares]) => {
      const [r, g, b, a = 1] = (bytes ?? shares)
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number)
      const ink = [r, g, b].map((channel) => Math.round(channel * (bytes ? 1 : 255))).join(' ')
      return { ink, strength: Math.round(a * 100) }
    })
  const style = (of: CSSStyleDeclaration) =>
    [
      of.fontFamily,
      of.fontSize,
      of.lineHeight,
      (parseFloat(of.letterSpacing) || 0).toFixed(2),
    ].join()

  const inks = named('--')
    .filter((name) => CSS.supports('color', root.getPropertyValue(name)))
    .map((name) => {
      probe.style.color = `var(${name})`
      return colours(getComputedStyle(probe).color)[0].ink
    })
  const strengths = [100, ...lengths('--a-')]
  const spaces = [0, ...lengths('--s-')]
  const lines = lengths('--b-')
  const corners = lengths('--r-')
  const weights = lengths('--w-')
  const styles = named('--f-').map((name) => {
    probe.style.font = `var(${name})`
    probe.style.letterSpacing = `var(${name.replace('--f-', '--tk-')}, normal)`
    return style(getComputedStyle(probe))
  })
  // A token that is not a time or a curve resolves to the property's own start, which moves nothing.
  const timings = (property: 'transitionDuration' | 'transitionTimingFunction') =>
    named('--m-').map((name) => {
      probe.style[property] = `var(${name})`
      return getComputedStyle(probe)[property]
    })
  const times = timings('transitionDuration')
  const curves = timings('transitionTimingFunction')
  probe.remove()

  const off: string[] = []
  for (const element of document.querySelectorAll<HTMLElement>('main, main *')) {
    if (!element.checkVisibility() || element.parentElement?.closest('svg')) continue
    const computed = getComputedStyle(element)
    const report = (what: string, value: unknown) =>
      off.push(
        `${what} ${value} on <${element.localName} class="${element.getAttribute('class')}">`,
      )
    const colour = (what: string, value: string) => {
      for (const { ink, strength } of colours(value)) {
        if (strength && !(inks.includes(ink) && strengths.includes(strength))) report(what, value)
      }
    }
    const length = (what: string, value: string, allowed: number[]) => {
      for (const part of value.split(' ')) {
        if (part !== 'normal' && !allowed.includes(Math.abs(parseFloat(part)))) report(what, value)
      }
    }

    if ([...element.childNodes].some((node) => node.nodeType === 3 && node.textContent?.trim())) {
      if (!styles.includes(style(computed))) report('type style', style(computed))
      if (!weights.includes(Number(computed.fontWeight))) report('weight', computed.fontWeight)
      colour('text colour', computed.color)

      // Only a disabled thing may fall below the strength of muted text.
      let drawn = colours(computed.color)[0].strength
      for (let at: Element | null = element; at; at = at.parentElement) {
        drawn *= Number(getComputedStyle(at).opacity)
      }
      if (drawn < 64 && !element.closest(':disabled, [aria-disabled="true"]')) {
        report('text drawn at', `${drawn}%`)
      }
    }
    colour('background', computed.backgroundColor)
    colour('background image', computed.backgroundImage)
    colour('shadow', computed.boxShadow)
    if (computed.textDecorationLine !== 'none') colour('underline', computed.textDecorationColor)
    for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
      if (computed[`border${side}Style`] === 'none') continue
      length('line weight', computed[`border${side}Width`], lines)
      colour('line colour', computed[`border${side}Color`])
    }
    if (computed.outlineStyle !== 'none') {
      length('line weight', computed.outlineWidth, lines)
      colour('line colour', computed.outlineColor)
    }
    length('corner', computed.borderRadius, corners)
    length('space', computed.padding, spaces)
    length('space', computed.margin, spaces)
    length('space', computed.gap, spaces)

    // A transition is timed by tokens, and only colour, strength and transform change over time.
    const durations = computed.transitionDuration.split(', ')
    for (const time of durations) if (!times.includes(time)) report('duration', time)
    for (const curve of computed.transitionTimingFunction.split(/, (?=[a-z])/)) {
      if (!curves.includes(curve)) report('curve', curve)
    }
    computed.transitionProperty.split(', ').forEach((property, at) => {
      const moves = durations[at % durations.length] !== '0s'
      if (moves && !/color|shadow|^(fill|stroke|opacity|transform)$/.test(property)) {
        report('transition of', property)
      }
    })
  }
  return off
}

test.describe('Tokens', () => {
  test('draws every catalogue page from tokens alone, in both themes and both languages', async ({
    page,
  }) => {
    test.slow()

    for (const theme of ['dark', 'light']) {
      await page.goto('/catalogue')
      await page.evaluate((stored) => localStorage.setItem('theme', stored), theme)

      for (const language of ['', '/de']) {
        for (const name of pages) {
          await page.goto(`${language}/catalogue${name}`)
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
          await expect(page.locator('html')).toHaveAttribute('lang', language ? 'de' : 'en')
          await page.evaluate(() => document.fonts.ready)

          expect(await page.evaluate(audit), `${theme} ${language}/catalogue${name}`).toEqual([])
        }
      }
    }
  })

  test('applies a stored setting in the head, before the page has any other script', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'light')
      localStorage.setItem('pitch', '12')
    })
    // With every script file emptied, only the lines in the head can have set the root.
    await page.route('**/*.js', (route) => route.fulfill({ contentType: 'text/javascript' }))
    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('html')).toHaveAttribute('data-pitch', '12')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(237, 235, 230)')

    // Hydration keeps what the head set: the page logs no error, which fails any test here.
    await page.unroute('**/*.js')
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('html')).toHaveAttribute('data-pitch', '12')
  })

  test('starts from what the device asks for', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', contrast: 'more', reducedMotion: 'reduce' })
    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more')
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce')
    await expect(page.locator('html')).toHaveAttribute('data-boot', 'off')
    await expect(page.locator('html')).toHaveAttribute('data-pitch', '8')
  })

  test('changes the theme in one crossfade and the pitch at once, keeps both, and resets in one crossfade', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.addInitScript(() => {
      const transition = document.startViewTransition.bind(document)
      Object.assign(window, { fades: 0 })
      document.startViewTransition = (update) => {
        Object.assign(window, { fades: 1 + Reflect.get(window, 'fades') })
        return transition(update as ViewTransitionUpdateCallback)
      }
    })
    await page.goto('/catalogue/icons')

    await page.getByRole('button', { name: 'light' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.getByRole('button', { name: '12' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-pitch', '12')
    expect(await page.evaluate(() => Reflect.get(window, 'fades'))).toBe(1)

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('html')).toHaveAttribute('data-pitch', '12')

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('html')).toHaveAttribute('data-pitch', '8')
    expect(await page.evaluate(() => Reflect.get(window, 'fades'))).toBe(1)
  })

  test('steps the largest type down in a window narrower than 600 px', async ({ page }) => {
    await page.goto('/catalogue/type')

    await expect(page.locator('.dl > .t-hero')).toHaveCSS('font-size', '80px')
    await expect(page.locator('.cq > .t-hero')).toHaveCSS('font-size', '56px')
  })

  test('serves its fonts and their licences from its own origin', async ({ baseURL, page }) => {
    const fonts: string[] = []
    page.on('request', (request) => {
      if (request.resourceType() === 'font') fonts.push(new URL(request.url()).origin)
    })
    await page.goto('/catalogue/type')
    await page.evaluate(() => document.fonts.ready)

    expect(fonts.length).toBeGreaterThan(0)
    expect(new Set(fonts)).toEqual(new Set([baseURL]))
    for (const licence of ['inter-tight', 'jetbrains-mono']) {
      const response = await page.request.get(`/licenses/${licence}.txt`)
      expect(response.status()).toBe(200)
      expect(await response.text()).toContain('SIL Open Font License')
    }
  })
})
