'use client'

import { type FormEvent, type ReactNode, useEffect, useEffectEvent, useRef, useState } from 'react'

import type { View } from '@/data/views'
import { Icon } from '@/ds/atoms/Icon'
import { App } from '@/ds/molecules/App'
import { Bar, BarSpace, BarText, BarTitle } from '@/ds/molecules/Bar'
import { Button, ButtonLink } from '@/ds/molecules/Button'
import { Field } from '@/ds/molecules/Field'
import { Heading } from '@/ds/molecules/Heading'
import { Dots } from '@/ds/molecules/Dots'
import { Avatar } from '@/ds/molecules/Media'
import { Row } from '@/ds/molecules/Row'
import { curve, duration, reduced } from '@/ds/motion/vocabulary'
import { Card } from '@/ds/organisms/Card'
import { MenuButton } from '@/ds/organisms/Menu'
import { Screen } from '@/ds/organisms/Screen'
import { Splash } from '@/ds/organisms/Splash'
import { Section } from '@/ds/sections/Section'
import { fromAddress, type Language, languages, toAddress } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'

import { useMinute, useZone } from './Clock'
import { legalLinks, legalMenu } from './menus'

// The screens that wait: the start, who comes in (as a guest, by a personal link, by a password), and the end.
export type Waiting = 'boot' | 'login' | 'link' | 'other' | 'shutdown'

type Props = {
  view: View
  t: Dictionary
  // Where the desk goes next: another waiting screen, or the desk itself.
  go: (next: Waiting | null) => void
}

// British English puts the day before the month.
const locales = { en: 'en-GB', de: 'de' }

const say = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key]))

const wait = (seconds: number) => new Promise((done) => setTimeout(done, seconds * 1000))

// The legal links, which a phone holds in the bottom bar of every screen.
export const legalOf = (t: Dictionary, language: Language) =>
  (
    [
      ['/imprint', t.imprint],
      ['/privacy-policy', t.privacy],
      ['/cookies', t.cookies],
    ] as const
  ).map(([path, label]) => ({ href: toAddress(language, path), label }))

// The login screen has an address of its own, which a personal link opens.
export const atLogin = () => fromAddress(location.pathname).path === '/login'

// What a personal link carries after #, which a browser never sends: taken once, and cleared from the address at
// once, so it reaches no log and no other site.
let carried: string | null | undefined
function invitation() {
  if (carried === undefined) {
    carried = new URLSearchParams(location.hash.slice(1)).get('p')
    if (carried) History.prototype.replaceState.call(history, null, '', location.pathname)
  }
  const password = carried
  carried = null
  return password
}

// That a personal link signed this tab in, kept across the reload that follows and read once.
const INVITED = 'invited'
export function invited() {
  try {
    const was = sessionStorage.getItem(INVITED)
    sessionStorage.removeItem(INVITED)
    return was !== null
  } catch {
    return false
  }
}

function Legal({ t, language }: { t: Dictionary; language: Language }) {
  return legalOf(t, language).map((link) => (
    <ButtonLink data-for="phone" key={link.href} {...link} size="chrome" />
  ))
}

// What leaves for the menu bar travels to its place there, as the screen it stood on fades.
function travel(from: Element | null | undefined, to: Element | null | undefined) {
  if (!from || !to || reduced()) return
  const [a, b] = [from.getBoundingClientRect(), to.getBoundingClientRect()]
  from.animate(
    [
      { transformOrigin: '0 0', transform: 'none' },
      {
        transformOrigin: '0 0',
        transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width})`,
      },
    ],
    {
      duration: duration('slow') * 1000,
      easing: `cubic-bezier(${curve('standard')})`,
      fill: 'forwards',
    },
  )
}

// The desk takes over from a waiting screen: what travels goes to the menu bar, the screen fades, and from the boot
// the bars, the apps and the windows arrive in turn, all within a long move.
async function handOver(
  screen: HTMLElement,
  from: Element | null | undefined,
  to: string,
  boot: boolean,
) {
  const root = document.documentElement.dataset
  if (boot) root.intro = 'hand'
  travel(from, document.querySelector(`.screen[data-fill]:not([data-waiting]) header ${to}`))
  screen.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: duration('slow') * 1000,
    delay: duration('fast') * 1000,
    easing: `cubic-bezier(${curve('exit')})`,
    fill: 'forwards',
  })
  await wait(boot ? duration('long') : duration('slow') + duration('fast'))
  delete root.intro
}

// Shutting down is the start in reverse: the windows go to the taskbar, then the apps, then the bars.
export async function shutDown(go: Props['go']) {
  const root = document.documentElement.dataset
  if (!reduced()) {
    root.intro = 'leave'
    await wait(duration('long'))
  }
  go('shutdown')
  delete root.intro
}

// Turning on again begins a new session of this tab, as a restart does: its windows close and the intro plays.
function turnOn() {
  try {
    sessionStorage.clear()
  } catch {
    // A tab without storage has no session to end.
  }
}

function Boot({ view, t, go }: Props) {
  const { rows, counted } = view.boot
  const screen = useRef<HTMLDivElement>(null)
  const head = useRef<HTMLDivElement>(null)
  const [share, setShare] = useState(0)
  const done = share >= 1
  const shown = Math.ceil(share * rows.length)
  const today = useMinute()
  const ended = useRef(false)

  // Any key, press or scroll ends it at once and hands over to the desk, except in its menu bar.
  const end = useEffectEvent(async (event?: Event) => {
    const top = screen.current?.querySelector(':scope > header')
    if (ended.current || top?.contains(event?.target as Node)) return
    ended.current = true
    setShare(1)
    try {
      sessionStorage.setItem('intro', 'played')
    } catch {
      // A tab without storage plays it again on its next visit to the desk.
    }
    await handOver(screen.current!, head.current?.querySelector('.avatar'), '.mark', true)
    go(null)
  })

  // One row per step across a long move, the count running with them; once all have passed, the desk takes over.
  useEffect(() => {
    const start = performance.now()
    const long = duration('long') * 1000
    let frame = requestAnimationFrame(function step(now) {
      if (ended.current) return
      const at = Math.min(1, (now - start) / long)
      setShare(at)
      if (at < 1) frame = requestAnimationFrame(step)
      else setTimeout(() => end(), duration('hold') * 1000)
    })
    const events = ['keydown', 'pointerdown', 'wheel', 'touchmove'] as const
    for (const event of events) addEventListener(event, end, { capture: true })
    return () => {
      cancelAnimationFrame(frame)
      for (const event of events) removeEventListener(event, end, { capture: true })
    }
  }, [])

  const total = counted?.total ?? 0
  const count = Math.floor(share * total)
  const cases =
    counted &&
    say(new Intl.PluralRules(view.language).select(total) === 'one' ? counted.one : counted.other, {
      count: say(t.bootOf, { count, total }),
    })
  const date =
    today !== null &&
    new Intl.DateTimeFormat(locales[view.language], {
      timeZone: view.site.timezone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(today * 60000)

  return (
    // The last row brings the wallpaper in.
    <Screen fill ref={screen} waiting wallpaper={shown >= rows.length}>
      <Top name={view.site.name} t={t} view={view} />
      <div className="screen__main cq">
        <div className="screen__page">
          <div data-part="head" ref={head}>
            <Row
              lead={<Avatar surface="orange">{''}</Avatar>}
              text={say(t.bootCopyright, {
                year: new Date().getFullYear(),
                name: view.site.name,
                place: view.site.place,
              })}
              title={say(t.bootTitle, {
                name: view.site.name,
                version: process.env.SYSTEM_VERSION ?? '',
              })}
            />
          </div>
          <div data-part="side">
            <Card
              level="lead"
              media={{ cover: 'ink', form: 'star', alt: t.bootStarPicture }}
              surface="paper"
              text={t.bootStarSays}
              title={t.bootStar}
            />
            <Heading
              eyebrow={t.bootMemory}
              level="hero"
              text={cases || undefined}
              title={`${Math.round(share * 100)}%`}
            />
          </div>
          <div className="list" data-headed="lines" data-part="body">
            <Row
              className="row list__head"
              data-for="desk"
              label={t.bootDevice}
              meta={t.bootStatus}
              value={t.bootDetected}
            />
            {/* Every row has its place from the start, so nothing jumps. */}
            {rows.map((row, at) => (
              <Row
                key={at}
                label={at < shown ? row.label : ''}
                meta={at < shown ? row.status : ''}
                value={at < shown ? row.value : ''}
              />
            ))}
          </div>
        </div>
      </div>
      <footer>
        <Bar line="above">
          <BarTitle>{done ? say(t.bootDone, { name: view.site.name }) : t.bootChecking}</BarTitle>
          <BarSpace />
          <BarText data-for="desk">{t.bootSkip}</BarText>
          {date && <BarText data-for="wide">{date}</BarText>}
          <Legal language={view.language} t={t} />
        </Bar>
      </footer>
    </Screen>
  )
}

// The menu bar of a screen that waits: the mark and the name, what it holds, and at its end the legal menu, which a
// phone holds in its bottom bar.
function Top(props: {
  name: string
  off?: boolean
  t: Dictionary
  view: View
  children?: ReactNode
}) {
  const { t, view } = props
  return (
    <header>
      <Bar line="below" size="chrome">
        <BarTitle>
          <span
            className="mark"
            data-surface={props.off ? undefined : 'orange'}
            data-tone={props.off ? 'off' : undefined}
          />
          {props.name}
        </BarTitle>
        <BarSpace />
        {props.children}
        <span data-for="desk">
          <MenuButton
            button={{ label: t.legal }}
            end
            items={legalMenu(legalLinks(t, view.language, view.search))}
            label={t.legal}
            size="chrome"
            t={t}
          />
        </span>
      </Bar>
    </header>
  )
}

// Who comes in: a guest, a signed-in visitor, by a personal link or not, or another user with a password.
function Login({ at, view, t, go }: Props & { at: 'login' | 'link' | 'other' }) {
  const { language, site } = view
  const screen = useRef<HTMLDivElement>(null)
  const avatar = useRef<HTMLDivElement>(null)
  const [answer, setAnswer] = useState<'wrong' | 'limited' | null>(null)
  const [busy, setBusy] = useState(false)
  const [shown, setShown] = useState(false)
  const minute = useMinute()
  const timeZone = useZone(site.timezone)
  const format = (options: Intl.DateTimeFormatOptions) =>
    minute === null
      ? ''
      : new Intl.DateTimeFormat(locales[language], { timeZone, ...options }).format(minute * 60000)
  const other = languages.find((one) => one !== language)!
  const visitor = at === 'other' ? null : view.visitor

  const enter = async () => {
    await handOver(screen.current!, avatar.current?.firstElementChild, '[data-visitor]', false)
    go(null)
  }
  // Signing in or out reloads the page, as the server draws the desk for whoever asks; from the login's own address
  // the desk comes next.
  const reload = () => (atLogin() ? location.replace(toAddress(language, '/')) : location.reload())
  // The password goes in the body of a request, never in its address.
  const post = (password: string): Promise<{ in: boolean; limited?: boolean }> =>
    fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).then(
      (response) => response.json(),
      () => ({ in: false }),
    )
  const answered = (got: { in: boolean; limited?: boolean }, linked: boolean) => {
    if (!got.in) {
      setBusy(false)
      return setAnswer(got.limited ? 'limited' : 'wrong')
    }
    try {
      if (linked) sessionStorage.setItem(INVITED, '')
    } catch {
      // A tab without storage arrives at the desk without the link's screen.
    }
    reload()
  }
  const signOut = async () => {
    await fetch('/login', { method: 'DELETE' }).catch(() => null)
    reload()
  }
  const typed = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    const password = String(new FormData(event.currentTarget).get('password') ?? '')
    void post(password).then((got) => answered(got, false))
  }
  // A personal link signs in by itself; a link that no longer does leaves its visitor at the password.
  const linked = useEffectEvent(() => {
    const password = at === 'other' && invitation()
    if (password) void post(password).then((got) => answered(got, true))
  })
  useEffect(() => linked(), [])

  return (
    <Screen fill ref={screen} waiting>
      <Top name={site.name} t={t} view={view}>
        <ButtonLink
          aria-label={t.language}
          href={toAddress(other, '/')}
          hrefLang={other}
          label={language.toUpperCase()}
          size="chrome"
        />
      </Top>
      <div className="screen__main cq">
        <Section>
          <Heading
            level="hero"
            text={`${format({ weekday: 'long', day: 'numeric', month: 'long' })} · ${site.place}`}
            title={format({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}
          />
        </Section>
        {at === 'other' ? (
          <Splash onSubmit={typed}>
            <Avatar size="large">
              <Icon name="lock" />
            </Avatar>
            <Heading level="heading" page title={t.loginOtherTitle} />
            <Field
              above
              announced
              error={answer === 'limited' ? t.loginTooMany : t.loginPasswordMissing}
              help={t.loginPasswordHelp}
              invalid={answer !== null}
              kind="password"
              label={t.loginPassword}
              name="password"
              reveal={{
                shown,
                label: t.loginPasswordShow,
                onClick: () => setShown((now) => !now),
              }}
            />
            <Button
              busy={busy ? <Dots count={3} label={t.loginSignIn} on={2} /> : undefined}
              end="arrow-right"
              label={t.loginSignIn}
              tone="solid"
              type="submit"
            />
          </Splash>
        ) : (
          <Splash>
            <div ref={avatar}>
              <Avatar size="large" surface={visitor ? 'paper' : 'raised'}>
                {(visitor?.name ?? t.guest)
                  .split(/\s+/)
                  .map((word) => word[0])
                  .join('')
                  .slice(0, 2)}
              </Avatar>
            </div>
            <Heading
              level="heading"
              page
              text={
                visitor
                  ? [at === 'link' && t.loginLink, say(t.loginUntil, { date: visitor.until })]
                      .filter(Boolean)
                      .join(' ')
                  : undefined
              }
              title={visitor?.name ?? t.guest}
            />
            <Button end="arrow-right" label={t.loginEnter} onClick={enter} tone="solid" />
          </Splash>
        )}
        <div className="screen__foot">
          {visitor ? (
            <Button
              label={t.loginNotYou}
              lead={<Avatar size="compact">{t.guest[0]}</Avatar>}
              onClick={signOut}
            />
          ) : at === 'other' ? (
            <Button
              label={t.loginBack}
              lead={<Avatar size="compact">{t.guest[0]}</Avatar>}
              onClick={() => go('login')}
            />
          ) : (
            <Button icon="plus" label={t.loginOther} onClick={() => go('other')} />
          )}
          <nav aria-label={t.system} className="apps">
            <App
              href={toAddress(language, '/accessibility')}
              icon="sliders"
              name={t.accessibility}
            />
            <App icon="play" name={t.replay} onClick={() => go('boot')} />
            <App icon="power" name={t.shutDown} onClick={() => void shutDown(go)} />
          </nav>
        </div>
      </div>
      <footer data-for="phone">
        <Bar line="above">
          <Legal language={language} t={t} />
        </Bar>
      </footer>
    </Screen>
  )
}

// The end: the time it came, that the tab may close, and the way back on.
function Shutdown({ view, t }: Props) {
  const { language, site } = view
  const [at] = useState(() =>
    new Intl.DateTimeFormat(locales[language], {
      timeZone: site.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(Date.now()),
  )

  return (
    <Screen fill waiting wallpaper={false}>
      <Top name={site.name} off t={t} view={view}>
        <BarText>{say(t.shutDownAt, { time: at })}</BarText>
      </Top>
      <div className="screen__main cq">
        <Splash start>
          <Heading level="hero" page text={t.shutDownThanks} title={t.shutDownSafe} />
          <ButtonLink
            href={toAddress(language, '/')}
            icon="power"
            label={t.turnOn}
            onClick={turnOn}
            tone="solid"
          />
        </Splash>
      </div>
      <footer>
        <Bar line="above">
          {view.site.email && (
            <BarText>
              {t.shutDownTalk}{' '}
              <a className="link" href={`mailto:${view.site.email}`}>
                {view.site.email}
              </a>
            </BarText>
          )}
          <BarSpace />
          <Legal language={language} t={t} />
        </Bar>
      </footer>
    </Screen>
  )
}

// The waiting screen in force, drawn by script over the desk the server rendered.
export function WaitingScreen(props: Props & { at: Waiting }) {
  const { at } = props
  if (at === 'boot') return <Boot {...props} />
  if (at === 'shutdown') return <Shutdown {...props} />
  return <Login {...props} at={at} />
}
