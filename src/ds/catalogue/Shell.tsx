import type { ReactNode } from 'react'

import type { Dictionary } from '@/i18n/en'

import { Bar, BarGrip, BarSpace, BarText, BarTitle } from '../molecules/Bar'
import { Button, ButtonLink } from '../molecules/Button'
import { Heading } from '../molecules/Heading'
import { WindowControls } from '../molecules/WindowControls'
import { Apps, Dock, Screen, type Shortcut, type Task, Taskbar } from '../organisms/Screen'
import { FieldDial } from './Changing'
import type { Copy } from './copy/en'
import { Cap, Doc, Entry, Specs, u } from './parts'

type Props = { t: Copy['shell']; words: Dictionary }

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

function Mark() {
  return <span className="mark" data-surface="orange" />
}

function Menus({ words }: { words: Dictionary }) {
  return [words.file, words.view, words.window, words.help].map((menu) => (
    <Button key={menu} label={menu} size="compact" />
  ))
}

export function Shell({ t, words }: Props) {
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
              <Bar line="below" size="compact">
                <Button label={t.name} lead={<Mark />} size="compact" />
                <Menus words={words} />
                <BarSpace />
                <Button icon="search" name={words.search} size="compact" />
                <Button icon="contrast" name={words.theme} size="compact" />
                <Button label="EN" size="compact" />
                <BarText>{t.clock}</BarText>
              </Bar>
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
              <Bar line="below">
                <Button label={t.name} lead={<Mark />} />
                <BarSpace />
                <BarText>{t.time}</BarText>
              </Bar>
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
          <Screen className="box" style={sized(70, 35)} />
          <Screen className="box" data-pitch="5" style={sized(35, 35)} />
          <Screen className="box" data-pitch="12" style={sized(35, 35)} />
          <FieldDial label={t.field} />
        </Specs>
      </Entry>
      <Entry text={t.menubar}>
        <div className="spec" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <Cap label={t.menubarCaps[0]}>
            {fill(
              <Bar line="below" size="compact">
                <Button label={t.name} lead={<Mark />} size="compact" />
                <Menus words={words} />
                <BarSpace />
                <Button icon="search" name={words.search} size="compact" />
                <Button icon="contrast" name={words.theme} size="compact" />
                <Button label="EN" size="compact" />
                <BarText>{t.clock}</BarText>
              </Bar>,
            )}
          </Cap>
          <Cap label={t.menubarCaps[1]}>
            <div style={sized(46.875)}>
              <Bar line="below">
                <Button icon="menu" name={words.menu} />
                <Button label={t.name} lead={<Mark />} />
                <BarSpace />
                <BarText>{t.time}</BarText>
              </Bar>
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
    </Doc>
  )
}
