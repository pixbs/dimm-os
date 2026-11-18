'use client'

import {
  type MouseEvent,
  startTransition,
  useEffect,
  useEffectEvent,
  useId,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import type { ListView } from '@/blocks/list/view'
import type { FootButton, View, WindowView } from '@/data/views'
import { change } from '@/ds/atoms/settings'
import { useSetting } from '@/ds/atoms/useSetting'
import { Bar, BarSpace, BarText } from '@/ds/molecules/Bar'
import { Button, ButtonGroup, ButtonLink } from '@/ds/molecules/Button'
import { Key } from '@/ds/molecules/Key'
import { Tag } from '@/ds/molecules/Tag'
import type { Box } from '@/ds/organisms/Window'
import { Decipher } from '@/ds/motion/Decipher'
import { duration, reduced } from '@/ds/motion/vocabulary'
import { MenuBar, MenuButton } from '@/ds/organisms/Menu'
import { type FormWords, Submit } from '@/ds/organisms/Form'
import { RecordFoot } from '@/ds/organisms/Record'
import { Dock, Screen, Skip, Taskbar } from '@/ds/organisms/Screen'
import { Header } from '@/ds/sections/Header'
import { Section } from '@/ds/sections/Section'
import { fromAddress, type Language, languages, toAddress, toRoute } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { named, systemKeys } from '@/i18n/keys'
import { aboutWindow } from '@/system/About'
import { hotkeysWindow } from '@/system/Hotkeys'
import { preferencesWindow } from '@/system/Preferences'

import { Page } from './Aside'
import { Clock } from './Clock'
import { type Chosen, filtered } from './filtered'
import { commandAction, keyAction, pressed } from './keys'
import { type Action, front, manager, phone, showing, stack, start, windowOf } from './manager'
import { menus } from './menus'
import { idOf, OnDesk, type Parts, tasksOf } from './OnDesk'
import { Search } from './Search'
import { chapters, numberOf, type Placed, Sections } from './Sections'
import { legalOf, shutDown, type Waiting, WaitingScreen } from './Waiting'

const STORE = 'windows'
// Where the windows stand, kept on the device while windows are remembered.
const PLACES = 'places'

// A window that moved has a view at another path, which the browser's own load of the address redirects to.
async function fetchWindow(language: Language, path: string): Promise<WindowView | null> {
  try {
    const response = await fetch(`/view${toRoute(language, path)}`)
    const view: View | null = response.ok ? await response.json() : null
    return view?.window?.path === path ? view.window : null
  } catch {
    return null
  }
}

// The paths this tab had open, back to front, or null in a tab that has not shown the desk yet.
function stored(): string[] | null {
  try {
    const paths: unknown = JSON.parse(sessionStorage.getItem(STORE) ?? 'null')
    return Array.isArray(paths) ? paths.filter((path) => typeof path === 'string') : null
  } catch {
    return null
  }
}

// The places remembered last time, or none.
function places(): { at: string; box: Box }[] {
  try {
    const kept: unknown = JSON.parse(localStorage.getItem(PLACES) ?? '[]')
    return Array.isArray(kept) ? kept.filter((one) => typeof one?.at === 'string' && one.box) : []
  } catch {
    return []
  }
}

function store(paths: string[]) {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(paths))
  } catch {
    // A tab without storage only loses its other windows on a reload.
  }
}

// The prototype's methods leave out the Next.js router: it wraps the history's own, and would
// fetch a page and remount the desk when Back crosses a reload.
function write(method: 'pushState' | 'replaceState', address?: string) {
  History.prototype[method].call(history, null, '', address)
}

// Whether this page opened with the intro, as the head decided before first paint, and whether its address is an
// invitation's link, both read once since the desk then clears the address; the server knows neither.
let opened: boolean | undefined
const intro = () => (opened ??= document.documentElement.dataset.intro === 'play')
let invite: boolean | undefined
const invitation = () => (invite ??= new URLSearchParams(location.search).has('p'))
const never = () => () => {}

const pad = (number: number) => String(number).padStart(2, '0')

// A window's sections in the language they are in, its title until it has any, and as an item the way to its
// neighbours, which ends its body. On paper its head is a record's and its foot says when it was updated; beside it
// stands its aside.
function Body(props: {
  view: WindowView
  width: number
  // The list its filter filters, and every list keeps to its limit.
  filtering?: ListView
  filter: Filter
  t: Dictionary
  language: Language
}) {
  const { view, width, filtering, filter, t } = props
  const { parent, neighbours } = view
  const before = neighbours.previous ?? parent
  const sections = view.sections.map((section): Placed => {
    if (section.type !== 'list') return section
    const chosen = section === filtering ? filter.chosen : null
    const shown = filtered(section, chosen, t)
    return {
      ...shown,
      reset:
        shown.empty && chosen ? { label: t.showAll, onClick: () => filter.choose(null) } : null,
    }
  })
  const [first] = sections
  const { stamp, paper } = view.frame
  const note = stamp && { code: stamp.code, note: stamp.place }
  const record = paper ? { stamp: note } : undefined
  // A paper window that opens with a form is a slip, which holds the stamp line alone.
  const slip = slipOf(view)
  const prefix = useId()
  const { aside } = view
  const contents = aside?.type === 'contents'
  const index = contents
    ? chapters(sections).map(({ title }, at) => ({
        id: `${prefix}-${numberOf(at)}`,
        number: numberOf(at),
        title: title!,
      }))
    : []
  const content = (
    <>
      {/* A window that opens with neither a Header nor tiles still holds its title once. */}
      {!slip && first?.type !== 'header' && !(first?.type === 'cards' && first.tiles) && (
        <Header level="title" page record={record} title={view.frame.title} />
      )}
      {sections.length > 0 && (
        <Sections
          chapters={contents ? prefix : undefined}
          forms={{ words: formWords(t), lang: view.lang ?? props.language, slip }}
          paper={paper}
          record={record}
          sections={sections}
          width={width}
        />
      )}
      {paper && !slip && view.updated && (
        <Section>
          <RecordFoot start={view.updated} />
        </Section>
      )}
    </>
  )
  return (
    <>
      {aside ? (
        <Page
          aside={aside}
          chapters={index}
          foot={aside.type === 'record' && <Foot buttons={aside.actions} />}
          lang={view.lang}
          stamp={note}
          t={t}
        >
          {content}
        </Page>
      ) : (
        <div lang={view.lang}>{content}</div>
      )}
      {before && (
        <Section>
          <nav>
            <ButtonGroup>
              <ButtonLink
                href={before.href}
                hrefLang={before.lang}
                icon="arrow-left"
                label={before.title}
                lang={before.lang}
                rel={neighbours.previous ? 'prev' : undefined}
                tone="outline"
              />
              {neighbours.next && (
                <ButtonLink
                  end="arrow-right"
                  href={neighbours.next.href}
                  hrefLang={neighbours.next.lang}
                  label={neighbours.next.title}
                  lang={neighbours.next.lang}
                  rel="next"
                  tone="outline"
                />
              )}
            </ButtonGroup>
          </nav>
        </Section>
      )}
    </>
  )
}

// The id of the form a slip holds, whose button stands at the window's foot.
const slipOf = (view: WindowView) =>
  view.frame.paper && view.sections[0]?.type === 'form'
    ? `slip${view.path.replace(/[^\w-]/g, '-')}`
    : undefined

const formWords = (t: Dictionary): FormWords => ({
  to: t.formTo,
  send: t.formSend,
  sending: t.formSending,
  missing: t.formMissing,
  address: t.formAddress,
  failed: t.formFailed,
  sent: t.formSent,
  reply: t.formReply,
  again: t.formNew,
})

// Where a foot button leads shows at its end: a window, a download, or an address, out of the site or in it.
const ends = (button: FootButton) =>
  button.to === 'media'
    ? 'arrow-down'
    : button.to === 'address' && /^https?:/i.test(button.href)
      ? 'arrow-up-right'
      : 'arrow-right'

// The buttons at a window's foot, the main one first, side by side at every width; a file downloads.
function Foot({ buttons }: { buttons: FootButton[] }) {
  return (
    <ButtonGroup cells>
      {buttons.map((button, index) => (
        <ButtonLink
          download={button.to === 'media' || undefined}
          end={ends(button)}
          hint={button.key}
          href={button.href}
          hrefLang={button.hrefLang}
          key={index}
          label={button.label}
          lang={button.lang}
          tone="outline"
        />
      ))}
    </ButtonGroup>
  )
}

// What the filter of a window holds: the choice in force, the way to change it, and on a phone how many of its menus,
// which are drawers there, stand in front of the window.
type Filter = {
  chosen: Chosen | null
  choose: (chosen: Chosen | null) => void
  drawer: boolean
  onDepth: (depth: number) => void
}

// The parts of a window its view derives: an item's path line, with the way back to its window and its place
// among the items; the count of a window's items, or of what its filter leaves, with the filter; and a line where it
// is shown in English, or where it answers an address with nothing.
function parts(
  view: WindowView,
  t: Dictionary,
  language: Language,
  width: number,
  filter: Filter,
): Parts {
  const { parent, counters } = view
  const counted = (count: number) =>
    (new Intl.PluralRules(language).select(count) === 'one' ? t.item : t.items).replace(
      '{count}',
      String(count),
    )
  // The first list that filters is the one the toolbar counts and filters.
  const filtering = view.sections.find(
    (section): section is ListView => section.type === 'list' && !!section.filter,
  )
  const count = filtering ? filtered(filtering, filter.chosen, t).matching : view.count
  const choices = filtering?.filter ?? []
  const toolbar = parent ? (
    <Bar line="below">
      <ButtonLink
        href={parent.href}
        hrefLang={parent.lang}
        icon="arrow-left"
        label={parent.title}
        lang={parent.lang}
        size="compact"
      />
      <BarSpace />
      {counters && <BarText>{`${pad(counters.position)} / ${pad(counters.total)}`}</BarText>}
    </Bar>
  ) : filtering ? (
    <Bar line="below">
      {/* The count after a filter is said as it changes. */}
      <BarText role="status">
        <Decipher>{counted(count)}</Decipher>
      </BarText>
      <BarSpace />
      <MenuButton
        button={{ end: 'chevron-down', label: filter.chosen?.label ?? t.all }}
        drawer={filter.drawer}
        end
        items={[
          {
            label: t.all,
            meta: String(filtering.items.length),
            checked: !filter.chosen,
            radio: true,
            act: () => filter.choose(null),
          },
          'rule',
          ...choices.map(({ href, label, count }) => ({
            label,
            meta: String(count),
            checked: filter.chosen?.href === href,
            radio: true,
            act: () => filter.choose({ href, label }),
          })),
        ]}
        label={t.filter}
        onDepth={filter.onDepth}
        size="chrome"
        t={t}
      />
    </Bar>
  ) : (
    count > 0 && (
      <Bar line="below">
        <BarText>{counted(count)}</BarText>
      </Bar>
    )
  )
  const slip = slipOf(view)
  const says = view.lang ? t.inEnglish : view.asked ? t.notFound : null
  const status = says && (
    <Bar line="above" size="compact">
      <BarText>{says}</BarText>
    </Bar>
  )

  return {
    toolbar,
    status,
    foot: (slip || view.actions.length > 0) && (
      <>
        {slip && (
          <Submit
            form={slip}
            label={view.sections[0]?.type === 'form' ? view.sections[0].submit : null}
            said
            words={formWords(t)}
          />
        )}
        {view.actions.length > 0 && <Foot buttons={view.actions} />}
      </>
    ),
    body: (
      <Body
        filter={filter}
        filtering={filtering}
        language={language}
        t={t}
        view={view}
        width={width}
      />
    ),
  }
}

export function Desk({ dictionary, view }: { dictionary: Dictionary; view: View }) {
  const { language } = view
  // The first render takes its window from the view alone, so it matches the server's HTML at any address.
  const [desk, dispatch] = useReducer(manager, view.window, start)
  const restored = useRef(false)
  // The remembered windows in the taskbar whose views wait until they are brought back.
  const unloaded = useRef(new Set<string>())
  const top = showing(desk)
  // On a phone the menus that are open are drawers in front of the windows, those of a filter too.
  const [unfolded, setMenus] = useState(0)
  const [filtering, setFiltering] = useState(0)
  // The filter in force in each window, by its path.
  const [chosen, setChosen] = useState<Record<string, Chosen | null>>({})
  // Search is open, and what opened it gets the focus back.
  const [searching, setSearching] = useState<{ opener: Element | null } | null>(null)
  const search = (opener: Element | null) => setSearching({ opener })
  // The screen that waits over the desk, if one does; an invitation's link stands between the boot and the desk, and
  // the intro is not replayed where motion is reduced.
  const [asked, setWaiting] = useState<Waiting | null>()
  const opening = useSyncExternalStore(never, intro, () => false)
  const invited = useSyncExternalStore(never, invitation, () => false) && !!view.visitor
  const waiting = asked !== undefined ? asked : opening ? 'boot' : invited ? 'link' : null
  function go(next: Waiting | null) {
    const linking = next === null && waiting === 'boot' && invited && asked === undefined
    setWaiting(linking ? 'link' : next === 'boot' && reduced() ? null : next)
  }

  // The address follows what the window in front shows: picking a window, or a path in it, adds an entry, and
  // when it leaves the next takes its place. The windows that open with the measured desk are picked by no one.
  function act(action: Action) {
    dispatch(action)
    const after = manager(desk, action)
    if (action.type === 'desk' || after === desk) return
    const next = showing(after)
    const address = toAddress(language, next ?? '/')
    if (location.pathname === address) return
    if ('path' in action && action.path && windowOf(action.path) === windowOf(next ?? '/')) {
      write('pushState', address)
    } else if (next !== top) write('replaceState', address)
  }

  // A window opens at once and fills when its view arrives; without one, the address is the browser's to show.
  async function open(to: typeof act, path: string, opener: Element | null, lost: () => void) {
    // Drawing it is a transition, so a slow device still answers the press that asked for it within a frame.
    startTransition(() =>
      to({ type: 'open', path, opener, alone: document.documentElement.dataset.single === 'on' }),
    )
    unloaded.current.delete(windowOf(path))
    if (desk.open.some((entry) => entry.view?.path === path)) return

    const opened = await fetchWindow(language, path)
    if (opened) dispatch({ type: 'fill', window: opened })
    else lost()
  }

  // A plain link to a window opens it here; any other link is the browser's.
  function follow(event: MouseEvent) {
    const anchor = (event.target as Element).closest('a')
    if (!anchor || anchor.origin !== location.origin || anchor.target || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (anchor.hash || anchor.search || anchor.hasAttribute('download')) return

    const { language: theirs, path } = fromAddress(anchor.pathname)
    if (theirs !== language || path === '/') return

    event.preventDefault()
    // A link in the window it opens another path in did not open the window. The address is written already, so
    // the page the browser loads takes its place.
    const inside = anchor.closest('article')?.id === idOf(windowOf(path))
    void open(act, path, inside ? null : anchor, () => location.replace(anchor.href))
  }

  // Back and Forward bring the window of their address to the front, opening it again if it was closed since.
  const arrive = useEffectEvent(() => {
    const { path } = fromAddress(location.pathname)
    if (path !== '/') void open(dispatch, path, null, () => location.reload())
  })
  useEffect(() => {
    addEventListener('popstate', arrive)
    return () => removeEventListener('popstate', arrive)
  }, [])

  // The server knows the window of the address alone: the others come back from this tab's session, and a tab
  // that has not shown the desk yet opens the windows marked to open at start.
  useEffect(() => {
    // The router keeps its page in the entry a document loads in: emptied, that entry is the desk's as well.
    write('replaceState')

    const { single, start, remember } = document.documentElement.dataset
    // Remembered windows stand where they stood, in a new tab and after a reload alike.
    const remembers = () => {
      if (remember !== 'on') return
      const kept = places()
      for (const { at } of kept) unloaded.current.add(windowOf(at))
      dispatch({ type: 'remember', windows: kept })
    }
    const saved = stored()
    if (!saved) {
      restored.current = true
      remembers()
      const windows = start === 'off' ? [] : view.start
      dispatch({ type: 'start', windows: single === 'on' ? windows.slice(0, 1) : windows })
      return
    }
    const here = view.window && windowOf(view.window.path)
    const paths = saved.filter((path) => windowOf(path) !== here)
    void Promise.all(paths.map((path) => fetchWindow(language, path))).then((found) => {
      restored.current = true
      dispatch({ type: 'restore', windows: found.filter((opened) => opened !== null) })
      remembers()
    })
  }, [language, view])

  useEffect(() => {
    if (restored.current)
      store(desk.z.map((path) => desk.open.find((one) => one.path === path)!.at))
  }, [desk])

  // A remembered window loads when it is brought back, from the taskbar, a menu or a key; one that is gone closes.
  const lost = useEffectEvent((path: string) => act({ type: 'close', path }))
  useEffect(() => {
    for (const one of desk.open)
      if (one.view) unloaded.current.delete(one.path)
      else if (one.mode !== 'min' && unloaded.current.delete(one.path))
        void fetchWindow(language, one.at).then((opened) =>
          opened ? dispatch({ type: 'fill', window: opened }) : lost(one.path),
        )
  }, [desk, language])

  // Places are written once the desk is measured, only while windows are remembered, and forgotten when they are not;
  // a window is kept by its own path, and only once its view says it is not hidden, so the taskbar names nothing a
  // later viewer may not see.
  const remember = useSetting('remember')
  useEffect(() => {
    if (!restored.current || remember === null || !desk.desk) return
    const kept = desk.open.filter(
      (one) => one.placed && (one.view ? !one.view.hidden : unloaded.current.has(one.path)),
    )
    try {
      if (remember === 'on')
        localStorage.setItem(
          PLACES,
          JSON.stringify(kept.map(({ path, box }) => ({ at: path, box }))),
        )
      else localStorage.removeItem(PLACES)
    } catch {
      // A tab without storage remembers nothing past itself.
    }
  }, [desk, remember])

  // What a key or a row of the hotkeys window does; a key opens its window as the menu's link to it does.
  function run(action: Action | 'search' | null, opener: Element | null) {
    if (!action) return
    if (action === 'search') search(opener)
    else if (action.type === 'open') {
      void open(act, action.path, null, () => location.replace(toAddress(language, action.path)))
    } else act(action)
  }

  // The row of the hotkeys window that a key or a press lit, for a moment.
  const [lit, setLit] = useState<string | null>(null)
  const unlit = useRef<ReturnType<typeof setTimeout>>(undefined)
  function light(row: string) {
    setLit(row)
    clearTimeout(unlit.current)
    unlit.current = setTimeout(() => setLit(null), duration('hold') * 1000)
  }

  // The keys act from wherever the focus is; the switch on the root is read at each press.
  const keyDown = useEffectEvent((event: KeyboardEvent) => {
    if (waiting) return
    const single = document.documentElement.dataset.shortcuts !== 'off'
    const action = keyAction(event, view.keys, single, desk)
    const key = pressed(event, view.keys, single)
    if (!action || !key) return
    event.preventDefault()
    // A row lights where the window that shows it is open, or opens with it.
    if (key === 'hotkeys' || desk.open.some((one) => one.path === '/hotkeys'))
      light(typeof key === 'string' ? key : key.path)
    run(action, document.activeElement)
  })
  useEffect(() => {
    addEventListener('keydown', keyDown)
    return () => removeEventListener('keydown', keyDown)
  }, [])

  // In the taskbar a window goes by the name its bar shows, in the dock by its title; on a phone the hotkeys are
  // gestures.
  const tasks = tasksOf(desk)
  const titleOf = (path: string, title: string) =>
    path === '/hotkeys' && phone(desk) ? dictionary.gestures : title
  const pick = (index: number, opener: Element) =>
    act({ type: 'task', path: desk.open[index].path, opener })

  const other = languages.find((one) => one !== language)!
  const legal = legalOf(dictionary, language)
  const preferences = { href: toAddress(language, '/preferences'), label: dictionary.preferences }
  const [before, after] = dictionary.hotkeyHint.split('{key}')

  return (
    <>
      <Screen fill inert={waiting !== null} onClick={follow}>
        <header data-surface="desktop">
          {front(desk) && <Skip label={dictionary.skip} to={idOf(front(desk)!)} />}
          <MenuBar
            drawer={phone(desk)}
            label={dictionary.menuBar}
            menus={menus({
              t: dictionary,
              language,
              name: view.site.name,
              desk,
              act,
              lock: () => go('login'),
              shutDown: () => void shutDown(go),
              // Once the menu has closed and given the focus back to its button, which gets it again after.
              search: () => queueMicrotask(() => search(document.activeElement)),
            })}
            onDepth={setMenus}
            size="chrome"
            t={dictionary}
          >
            <BarSpace />
            <Button
              data-for="pointer"
              hint={named(language, systemKeys.search)}
              icon="search"
              keyed
              name={dictionary.search}
              onClick={(event) => search(event.currentTarget)}
              size="chrome"
            />
            <Button
              data-for="touch"
              icon="search"
              name={dictionary.search}
              onClick={(event) => search(event.currentTarget)}
              size="chrome"
            />
            <Button
              data-for="desk pointer"
              icon="contrast"
              name={dictionary.theme}
              onClick={() =>
                change({
                  theme: document.documentElement.dataset.theme === 'light' ? 'dark' : 'light',
                })
              }
              size="chrome"
            />
            <ButtonLink
              aria-label={dictionary.language}
              data-for="desk"
              href={toAddress(other, top ?? '/')}
              hrefLang={other}
              label={language.toUpperCase()}
              size="chrome"
            />
            <Button
              data-visitor
              label={dictionary.guest}
              lead={<Tag>{dictionary.guest[0]}</Tag>}
              onClick={() => go('login')}
              size="chrome"
            />
            <Clock language={language} zone={view.site.timezone} />
          </MenuBar>
        </header>
        {/* The room under the menu bar: the desk, and on a phone its foot, which drawers rise over. */}
        <div className="screen__main">
          <OnDesk
            apps={view.shortcuts}
            desk={desk}
            dispatch={act}
            label={dictionary.apps}
            over={phone(desk) ? unfolded + filtering : 0}
            t={dictionary}
          >
            {(opened, width) =>
              opened.path === '/hotkeys'
                ? {
                    ...hotkeysWindow({
                      t: dictionary,
                      language,
                      name: view.site.name,
                      apps: view.keys,
                      lit,
                      run: (command, opener) => run(commandAction(command, desk), opener),
                      light,
                    }),
                    title: titleOf(opened.path, opened.frame.title),
                  }
                : opened.path === '/preferences'
                  ? preferencesWindow({
                      t: dictionary,
                      language,
                      site: view.site,
                      path: opened.path,
                      close: () => act({ type: 'close', path: opened.path }),
                    })
                  : opened.about
                    ? aboutWindow({ t: dictionary, about: opened.about, width })
                    : parts(opened, dictionary, language, width, {
                        chosen: chosen[opened.path] ?? null,
                        choose: (one) => setChosen((all) => ({ ...all, [opened.path]: one })),
                        drawer: phone(desk),
                        onDepth: setFiltering,
                      })
            }
          </OnDesk>
          <footer data-for="phone" inert={phone(desk) && stack(desk).length > 0}>
            <Bar>
              {legal.map((link) => (
                <ButtonLink key={link.href} {...link} />
              ))}
            </Bar>
            {tasks.length > 0 && (
              <Dock
                label={dictionary.windows}
                onPick={pick}
                tasks={tasks.map((task, index) => ({
                  ...task,
                  name: desk.open[index].view
                    ? titleOf(desk.open[index].path, desk.open[index].view!.frame.title)
                    : task.name,
                }))}
              />
            )}
          </footer>
        </div>
        <footer data-for="desk" data-surface="desktop">
          <Taskbar onPick={pick} size="chrome" tasks={tasks}>
            <BarText data-for="wide pointer keys">
              {before}
              <Key name={named(language, systemKeys.hotkeys)} />
              {after}
            </BarText>
            {[...legal, preferences].map((link) => (
              <ButtonLink key={link.href} {...link} size="chrome" />
            ))}
          </Taskbar>
        </footer>
        <Search
          drawer={phone(desk)}
          index={view.search}
          language={language}
          name={view.site.name}
          onClose={() => setSearching(null)}
          open={!!searching}
          opener={searching?.opener ?? null}
          t={dictionary}
        />
      </Screen>
      {waiting && <WaitingScreen at={waiting} go={go} t={dictionary} view={view} />}
    </>
  )
}
