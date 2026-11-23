import {
  arrive,
  ended,
  fade,
  inTurn,
  leave,
  slide,
  step,
  steps,
  within,
} from '@/ds/motion/handover'
import { travel } from '@/ds/motion/Travels'
import { duration, reduced } from '@/ds/motion/vocabulary'

const seen = (part: Element | null | undefined): part is HTMLElement =>
  part instanceof HTMLElement && part.checkVisibility()
const all = (box: Element, selector: string) => [...box.querySelectorAll(selector)].filter(seen)
const ms = (name: Parameters<typeof duration>[0]) => duration(name) * 1000
const wait = (time: number) => new Promise((done) => setTimeout(done, time))
let busy = false
let queue = Promise.resolve()

// One hand-over plays to its end before the next begins, which waits for it.
export function playOut(play: () => Promise<unknown>) {
  const turn = queue.then(async () => {
    busy = true
    try {
      await play()
    } finally {
      busy = false
    }
  })
  queue = turn.catch(() => {})
  return turn
}
export const playing = () => busy

const languageOf = (screen: Element) => screen.querySelector(':scope > header [data-language]')

// The parts of the desk in the order they arrive. The system's menu stands on every screen, so it never moves; the
// language slides where the screen that waited had one; the visitor's name and the clock come last, and the visitor's
// tag with them unless something travels into it.
function deskParts(desk: HTMLElement, slides: boolean, tagged: boolean) {
  const bar = desk.querySelector(':scope > header .bar')!
  const visitor = bar.querySelector(':scope > [data-visitor]')
  const clock = bar.querySelector(':scope > .bar__text')
  const items = [...bar.querySelectorAll(':scope > .menubar > *'), ...bar.children].filter(
    (part) =>
      !part.matches('.menubar, .bar__space, noscript') &&
      !part.querySelector('.mark') &&
      ![visitor, clock].includes(part) &&
      !(slides && part.matches('[data-language]')),
  )
  return {
    items: items.filter(seen),
    language: slides ? languageOf(desk) : null,
    last: [
      visitor?.querySelector('.btn__label'),
      tagged ? null : visitor?.querySelector('.tag'),
      clock,
    ].filter(seen),
    taskbar: [desk.querySelector(':scope > footer')].filter(seen),
    apps: all(desk, '.screen__desk > .apps > *'),
  }
}

// What a screen that waits holds, in reading order: what its menu bar holds but its title and the language the next
// screen takes over where it stands, each section, each part of a splash or a page and each row of a list, its foot and
// its bottom bar.
function screenParts(screen: HTMLElement, kept: Element | null) {
  const walk = (box: Element): Element[] =>
    [...box.children].flatMap((part) =>
      part.matches('.screen__main, .splash, .screen__page, [data-part], .list')
        ? walk(part)
        : [part],
    )
  const head = [...screen.querySelectorAll(':scope > header .bar > *')].filter(
    (part) => !part.matches('.bar__title, .bar__space') && part !== kept,
  )
  return [
    ...head,
    ...walk(screen.querySelector(':scope > .screen__main')!),
    screen.querySelector(':scope > footer'),
  ].filter(seen)
}

// What a screen that waits holds leaves in turn, half a step apart, each part fading and rising a step in fast; the
// language the next screen has at the same place stays for it to take over.
function screenLeaves(screen: HTMLElement, kept: Element | null) {
  const parts = screenParts(screen, kept)
  return { parts, moves: inTurn(parts, leave('drop', 'fast'), 0, 0.5) }
}

// The desk takes over from the screen that waits over it. What the screen holds leaves in turn as what travels under
// the id goes to its place in the menu bar, whose title and language the desk's stand in for at once. Then the desk
// arrives in turn: from a login meanwhile, from the boot once all has left. The windows are let go at their step, to
// travel out of the taskbar, and it ends once the last part is at rest. With reduced motion it is one fade.
export async function handOver(
  screen: HTMLElement,
  desk: HTMLElement,
  id: string,
  after: boolean,
  letGo: () => void,
) {
  const root = document.documentElement.dataset
  screen.inert = true
  travel(id)
  if (reduced()) {
    const shown = [':scope > header', ':scope > footer', '.screen__desk > .apps']
    const fades = inTurn(all(desk, shown.join(', ')), fade('in'), 0, 0)
    delete root.intro
    letGo()
    await ended([...fade('out')(screen, 0), ...fades])
    for (const move of fades) move.cancel()
    return
  }

  const [from, to] = [languageOf(screen), languageOf(desk)]
  const slides = seen(from) && seen(to)
  const head = screen.querySelector<HTMLElement>(':scope > header')!
  const { parts, moves } = screenLeaves(screen, slides ? from : null)
  head.style.visibility = 'hidden'
  for (const part of parts) if (head.contains(part)) part.style.visibility = 'visible'

  const start = after ? step((parts.length - 1) / 2) + ms('fast') : 0
  const at = (count: number) => start + step(count)
  const desks = deskParts(desk, slides, id === 'visitor')
  moves.push(
    ...inTurn(desks.items, arrive('drop'), at(steps.bar)),
    ...(slides ? slide(from)(to!, at(steps.language)) : []),
    ...inTurn(desks.taskbar, arrive('rise'), at(steps.taskbar)),
    ...inTurn(desks.apps, arrive('grow'), at(steps.apps)),
    ...inTurn(desks.last, arrive('drop', 'fast'), at(steps.last), 0),
  )
  // Unseen until now, it shows as the moves that hold its parts begin.
  delete root.intro
  const windows = at(steps.windows)
  setTimeout(letGo, windows)
  // The windows are let go by a timer, and travel frame by frame until they have landed.
  const landed = () =>
    new Promise((done) =>
      requestAnimationFrame(function look() {
        if (desk.querySelector('.screen__desk [data-travels]')) requestAnimationFrame(look)
        else done(null)
      }),
    )
  await Promise.all([ended(moves), wait(windows + ms('slow')).then(landed)])
}

// The desk leaves for a screen that waits: each part the way it came, together in half of fast, or for a shut down
// once its windows have gone to the taskbar, its apps, taskbar and menu bar one after another in the reverse of their
// arrival, inside slow in all. With reduced motion it fades over fast. It returns its moves, which keep it unseen until
// they are cancelled.
export function deskLeaves(desk: HTMLElement, shutDown: boolean) {
  const bar = desk.querySelector(':scope > header .bar')!
  const items = [...bar.querySelectorAll(':scope > .menubar > *'), ...bar.children].filter(
    (part) => seen(part) && !part.matches('.menubar, .bar__space') && !part.querySelector('.mark'),
  )
  const { taskbar, apps } = deskParts(desk, false, false)
  if (reduced())
    return inTurn([...items, ...taskbar, desk.querySelector('.screen__desk')!], fade('out'), 0, 0)
  const each = (parts: Element[], shape: Parameters<typeof leave>[0]) =>
    parts.map((part) => [part, leave(shape, 'fast-exit')] as const)
  if (!shutDown)
    return [
      ...each(items, 'drop'),
      ...each(taskbar, 'rise'),
      ...each(apps, 'grow'),
      ...each(all(desk, '.screen__desk > .window'), 'show'),
    ].flatMap(([part, plays]) => plays(part, 0))
  const away = ms('lag') + ms('back')
  return within(
    [...each(apps.reverse(), 'grow'), ...each(taskbar, 'rise'), ...each(items.reverse(), 'drop')],
    'slow',
    'fast-exit',
    away,
  )
}

// A screen that waits comes over the desk once the desk has left: one that covers it fades in over fast, its language
// slides over from where the desk's stood, and what it holds arrives in turn, a step apart, as it left. With reduced
// motion it fades in over fast. It ends once all has arrived and the desk's windows have gone to the taskbar.
export async function screenArrives(screen: HTMLElement, desk: HTMLElement) {
  const [from, to] = [languageOf(desk), languageOf(screen)]
  const slides = seen(from) && seen(to)
  const moves = reduced()
    ? fade('in')(screen, 0)
    : [
        ...(screen.dataset.waiting === 'covers' ? fade('in')(screen, 0) : []),
        ...(slides ? slide(from)(to!, 0) : []),
        ...inTurn(screenParts(screen, slides ? to : null), arrive('drop'), 0),
      ]
  await Promise.all([ended(moves), wait(reduced() ? 0 : ms('lag') + ms('back'))])
}

// From one screen that waits to the shut-down screen: what it holds leaves first.
export function screenGoes(screen: HTMLElement) {
  screen.inert = true
  return reduced() ? Promise.resolve() : ended(screenLeaves(screen, null).moves)
}
