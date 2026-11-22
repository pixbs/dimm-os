import type { ComponentProps, ReactNode } from 'react'

import type { Language } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'

import { Bar, BarGrip, BarSpace, BarText, BarTitle } from '../molecules/Bar'
import { Button, ButtonGroup, ButtonLink } from '../molecules/Button'
import { Heading } from '../molecules/Heading'
import { Path } from '../molecules/Path'
import { Row } from '../molecules/Row'
import { WindowControls } from '../molecules/WindowControls'
import { Apps, Dock, Screen, type Shortcut, type Task, Taskbar } from '../organisms/Screen'
import { Window } from '../organisms/Window'
import { Asking, Dialogs, Menubar, Menus, Notices, Palettes, Phone } from './Floats'
import type { Copy } from './copy/en'
import { Handled, Replaced } from './Handled'
import { Cap, Doc, Entry, Specs, Table, u } from './parts'

type Props = { t: Copy['shell']; words: Dictionary; language: Language }

const sized = (width: number, height?: number) => ({
  width: u(width),
  height: height === undefined ? undefined : u(height),
})

// The icon each tile carries in the frame.
const icons = { raised: 'folder', orange: 'image', mint: 'sliders', blue: 'mail' } as const

const apps = (name: string, tiles: (keyof typeof icons)[]): Shortcut[] =>
  tiles.map((tile, index) => ({ href: `#${index}`, name, icon: icons[tile], tile }))

// A desk drawn as the dot grid of an empty box.
const desk = { backgroundImage: 'var(--pattern)', backgroundSize: 'var(--s-4) var(--s-4)' }

// The tray of the site: the three legal links, then Preferences, as words.
function Tray({ words, size }: { words: Dictionary; size?: 'compact' }) {
  return [words.imprint, words.privacy, words.cookies, words.preferences].map((label) => (
    <ButtonLink href="#" key={label} label={label} size={size} />
  ))
}

// A patch of desk for a window, in the hand and at the pitch its caption names.
function Patch(props: {
  width: number
  hand?: 'squares'
  pitch?: '5' | '12'
  children: ReactNode
}) {
  return (
    <div
      className="stage"
      data-hand={props.hand ?? 'dots'}
      data-pitch={props.pitch}
      data-surface="desktop"
      style={desk}
    >
      <div style={sized(props.width)}>{props.children}</div>
    </div>
  )
}

function Windows({ t, words }: Props) {
  const [file, sys, pdf] = t.files
  const frame = (props: Partial<ComponentProps<typeof Window>>) => (
    <Window front name={[file]} t={words} title={t.window} {...props}>
      <div className="stage">
        <Heading level="heading" text={t.windowText} title={t.title} />
      </div>
    </Window>
  )
  const label = (props: ComponentProps<typeof Button>) => <Button label={t.label} {...props} />

  return (
    <Entry text={t.windows}>
      <Specs caps={t.windowsCaps.slice(0, 2)}>
        <Patch width={70}>
          {frame({
            toolbar: (
              <Bar line="below">
                <Button icon="arrow-left" name={t.back} size="compact" />
                <Button disabled icon="arrow-right" name={t.forward} size="compact" />
                <BarText>
                  <Path segments={t.path} />
                </BarText>
                <BarSpace />
                <BarText>{t.position}</BarText>
              </Bar>
            ),
            status: (
              <Bar line="above" size="compact">
                <BarText>{t.items}</BarText>
                <BarSpace />
                <BarText>{t.updated}</BarText>
              </Bar>
            ),
          })}
        </Patch>
        <Patch width={40}>{frame({ front: false })}</Patch>
      </Specs>
      <Specs caps={t.windowsCaps.slice(2, 4)}>
        <Patch hand="squares" width={60}>
          {frame({ name: t.path })}
        </Patch>
        <Patch width={60}>{frame({ density: 'touch' })}</Patch>
      </Specs>
      <Specs caps={t.windowsCaps.slice(4, 6)}>
        <Patch width={50}>
          {frame({
            name: [sys],
            oneSize: true,
            foot: (
              <ButtonGroup>
                {label({ tone: 'outline' })}
                {label({ tone: 'solid' })}
              </ButtonGroup>
            ),
          })}
        </Patch>
        <Patch width={50}>
          {frame({
            name: [pdf],
            surface: 'paper',
            foot: (
              <ButtonGroup>
                {label({ end: 'arrow-down', tone: 'outline' })}
                {label({ end: 'arrow-right', tone: 'outline' })}
              </ButtonGroup>
            ),
          })}
        </Patch>
      </Specs>
      <Specs caps={t.windowsCaps.slice(6)}>
        <Patch hand="squares" pitch="5" width={45}>
          {frame({})}
        </Patch>
        <Patch hand="squares" pitch="12" width={45}>
          {frame({})}
        </Patch>
      </Specs>
    </Entry>
  )
}

function Drawers(props: Props) {
  const { t, words } = props
  const [first, second, third] = t.replaced
  const rows = (count: number) =>
    Array.from({ length: count }, (_, at) => (
      <Row
        end="arrow-right"
        href="#"
        index={String(at + 1).padStart(2, '0')}
        key={at}
        title={t.title}
      />
    ))
  // A drawer as many steps back as it is given, with a heading and the rows asked for.
  const drawer = (name: string, back: number, count: number, foot?: ReactNode) => (
    <Window
      back={back}
      density="touch"
      foot={foot}
      front={!back}
      name={[name]}
      t={words}
      title={name}
    >
      <div style={{ paddingBlock: 'var(--s-6)' }}>
        <div style={{ paddingInline: 'var(--inset)' }}>
          <Heading level="heading" text={t.windowText} title={t.title} />
        </div>
        {rows(count)}
      </div>
    </Window>
  )
  const label = (props: ComponentProps<typeof Button>) => <Button label={t.label} {...props} />

  return (
    <Entry text={t.drawers}>
      <Specs caps={t.drawersCaps.slice(0, 3)}>
        <Phone {...props}>{drawer(t.title, 0, 0)}</Phone>
        <Phone {...props}>{drawer(t.title, 0, 12)}</Phone>
        <Phone {...props}>
          {drawer(
            t.title,
            0,
            3,
            <ButtonGroup>
              {label({ tone: 'outline' })}
              {label({ end: 'arrow-right', tone: 'solid' })}
            </ButtonGroup>,
          )}
        </Phone>
      </Specs>
      <Specs caps={t.drawersCaps.slice(3)}>
        <Phone {...props}>
          {drawer(first, 1, 8)}
          {drawer(second, 0, 8)}
        </Phone>
        <Phone {...props}>
          {drawer(first, 2, 8)}
          {drawer(second, 1, 8)}
          {drawer(third, 0, 8)}
        </Phone>
        <Phone {...props}>
          {drawer(first, 1, 8)}
          <Asking t={t} words={words} />
        </Phone>
      </Specs>
    </Entry>
  )
}

export function Shell(props: Props) {
  const { t, words } = props
  const tasks = (minimised = false): Task[] => [
    { name: t.window, tile: 'orange', front: true },
    { name: t.window, tile: 'blue' },
    { name: t.window, minimised },
  ]
  const fill = (children: ReactNode) => <div style={{ width: '100%' }}>{children}</div>

  return (
    <Doc text={t.doc}>
      <Entry text={t.screen}>
        <Specs caps={t.screenCaps}>
          <Screen style={sized(90, 55)}>
            <header data-surface="desktop">
              <Menubar {...props} kind="pointer" />
            </header>
            <main className="screen__desk">
              <Apps apps={apps(t.name, ['orange', 'mint', 'blue'])} layout="screen" />
              {/* A stand-in for the window, which comes with its own entry. */}
              <section
                className="box"
                data-hand="dots"
                data-surface="window"
                style={{ position: 'absolute', left: u(22.5), top: u(7), width: u(50) }}
              >
                <Bar line="below" size="compact">
                  <WindowControls shape="dots" size="compact" t={words} />
                  <BarTitle>{t.title}</BarTitle>
                  <BarGrip />
                </Bar>
                <div className="stage">
                  <Heading level="lead" text={t.text} title={t.title} />
                </div>
              </section>
            </main>
            <footer data-surface="desktop">
              <Taskbar size="compact" tasks={tasks()}>
                <Tray size="compact" words={words} />
              </Taskbar>
            </footer>
          </Screen>
          <Screen style={sized(42.875, 70)}>
            <header data-surface="desktop">
              <Menubar {...props} kind="phone" />
            </header>
            <main className="screen__desk">
              <Apps apps={apps(t.name, ['raised', 'orange', 'mint', 'blue'])} layout="screen" />
            </main>
            <footer>
              <Bar>
                {[words.imprint, words.privacy, words.cookies].map((label) => (
                  <ButtonLink href="#" key={label} label={label} />
                ))}
              </Bar>
              <Dock
                tasks={[
                  { name: t.name, front: true },
                  { name: t.name, minimised: true },
                ]}
              />
            </footer>
          </Screen>
        </Specs>
      </Entry>
      <Entry text={t.wallpaper}>
        <Specs caps={t.wallpaperCaps}>
          {['passage dots colour', 'passage dots', 'passage ascii colour', 'passage ascii'].map(
            (step) => (
              <Screen className="box" data-wallpaper={step} key={step} style={sized(90, 45)} />
            ),
          )}
          <Screen
            className="box"
            data-pitch="12"
            data-wallpaper="passage dots colour"
            style={sized(90, 45)}
          />
        </Specs>
      </Entry>
      <Entry text={t.menubar}>
        <div className="spec" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <Cap label={t.menubarCaps[0]}>{fill(<Menubar {...props} kind="pointer" />)}</Cap>
          <Cap label={t.menubarCaps[1]}>
            <div style={sized(46.875)}>
              <Menubar {...props} kind="touch" />
            </div>
          </Cap>
        </div>
      </Entry>
      <Entry text={t.taskbar}>
        <div className="spec" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          {[tasks(), tasks(true), tasks()].map((shown, index) => (
            <Cap key={index} label={t.taskbarCaps[index]}>
              {fill(
                <Taskbar size={index < 2 ? 'compact' : undefined} tasks={shown}>
                  <Tray size={index < 2 ? 'compact' : undefined} words={words} />
                </Taskbar>,
              )}
            </Cap>
          ))}
          <Cap label={t.taskbarCaps[3]}>
            <div data-surface="desktop" style={sized(46.875)}>
              <Dock
                tasks={[
                  { name: t.name, front: true },
                  { name: t.name, minimised: true },
                ]}
              />
            </div>
          </Cap>
        </div>
      </Entry>
      <Entry text={t.apps}>
        <Specs caps={t.appsCaps}>
          <div className="stage box" data-surface="desktop" style={{ ...sized(30), ...desk }}>
            <Apps apps={apps(t.name, ['raised', 'orange', 'mint', 'blue'])} layout="column" />
          </div>
          <div className="stage box" data-surface="desktop" style={{ ...sized(46.875), ...desk }}>
            <Apps apps={apps(t.name, ['raised', 'orange', 'mint', 'blue'])} layout="grid" />
          </div>
        </Specs>
      </Entry>
      <Windows {...props} />
      <Entry text={t.handled}>
        <Specs caps={t.handledCaps}>
          <Handled t={t} words={words} />
          <Patch width={60}>
            <Replaced t={t} words={words} />
          </Patch>
        </Specs>
        <Table
          classes={['t-medium', 'c-muted', 't-mono c-muted']}
          columns="30 1fr 15"
          head={t.handledHead}
          rows={t.handledRows}
        />
      </Entry>
      <Drawers {...props} />
      <Menus {...props} />
      <Dialogs {...props} />
      <Notices {...props} />
      <Palettes {...props} />
    </Doc>
  )
}
