'use client'

import { type ReactNode, useState } from 'react'

import type { Language } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { named } from '@/i18n/keys'
import { marked } from '@/shell/palette'

import { Bar, BarSpace, BarText, BarTitle } from '../molecules/Bar'
import { Button, ButtonGroup } from '../molecules/Button'
import { Heading } from '../molecules/Heading'
import { Row } from '../molecules/Row'
import { Dialog, Notice, Question } from '../organisms/Dialog'
import { type Item, Menu, MenuBar, MenuButton, type Top } from '../organisms/Menu'
import { Palette } from '../organisms/Palette'
import { Apps, Dock, Screen, type Shortcut } from '../organisms/Screen'
import { Window } from '../organisms/Window'
import type { Copy } from './copy/en'
import { Entry, Specs, u } from './parts'

type Props = { t: Copy['shell']; words: Dictionary; language: Language }

const sized = (width: number, height?: number) => ({
  width: u(width),
  height: height === undefined ? undefined : u(height),
})
const noop = () => {}

// The icon each tile carries in the frame.
const icons = { raised: 'folder', orange: 'image', mint: 'sliders', blue: 'mail' } as const
const apps = (name: string): Shortcut[] =>
  (['raised', 'orange', 'mint', 'blue'] as const).map((tile, index) => ({
    href: `#${index}`,
    name,
    icon: icons[tile],
    tile,
  }))

function Mark() {
  return <span className="mark" data-surface="orange" />
}

// The menus of a sample menu bar: the mark and the name, then menus of sample rows.
function bar(t: Copy['shell'], words: Dictionary, language: Language, count = 5): Top[] {
  const items: Item[] = [
    { label: t.item, hint: named(language, ['mod', 'N']) },
    { label: t.item, hint: named(language, ['mod', 'O']) },
    'rule',
    { label: t.item, hint: named(language, ['mod', 'W']) },
  ]
  return [
    { name: t.name, label: t.name, lead: <Mark />, items },
    ...[words.file, words.view, words.window, words.help].map((menu) => ({
      name: menu,
      label: menu,
      items,
    })),
  ].slice(0, count)
}

// The menu bar of a screen: compact under a pointer with its menus and status, regular under a finger with the
// menus behind one button, or on a phone the name alone.
export function Menubar(props: Props & { kind: 'pointer' | 'touch' | 'phone'; shown?: number }) {
  const { t, words, language, kind } = props
  const menus =
    kind === 'pointer'
      ? bar(t, words, language)
      : kind === 'touch'
        ? [
            {
              name: words.menu,
              icon: 'menu' as const,
              items: bar(t, words, language)
                .slice(1)
                .map((menu) => ({ label: menu.name, items: menu.items })),
            },
            ...bar(t, words, language, 1),
          ]
        : bar(t, words, language, 1)

  return (
    <MenuBar
      label={words.menuBar}
      menus={menus}
      shown={props.shown}
      size={kind === 'pointer' ? 'compact' : undefined}
      t={words}
    >
      <BarSpace />
      {kind === 'pointer' && (
        <>
          <Button icon="search" name={words.search} size="compact" />
          <Button icon="contrast" name={words.theme} size="compact" />
          <Button label="EN" size="compact" />
        </>
      )}
      <BarText>{kind === 'pointer' ? t.clock : t.time}</BarText>
    </MenuBar>
  )
}

// A phone with drawers over its apps and its dock.
export function Phone(props: Props & { height?: number; children: ReactNode }) {
  const { t } = props

  return (
    <Screen style={sized(42.875, props.height ?? 80)}>
      <header data-surface="desktop">
        <Menubar {...props} kind="phone" />
      </header>
      <div className="screen__main">
        <main className="screen__desk">
          <Apps apps={apps(t.name)} layout="screen" />
          {props.children}
        </main>
        <footer>
          <Dock
            tasks={[
              { name: t.name, front: true },
              { name: t.name, minimised: true },
            ]}
          />
        </footer>
      </div>
    </Screen>
  )
}

// A dialog drawer on a phone: the question, and its actions stacked.
export function Asking({ t, words, back }: Omit<Props, 'language'> & { back?: number }) {
  return (
    <Dialog
      actions={
        <ButtonGroup>
          <Button label={t.confirm} tone="solid" />
          <Button label={t.cancel} tone="outline" />
        </ButtonGroup>
      }
      back={back}
      drawer
      label={t.question}
      onClose={noop}
      open
      shown
      t={words}
    >
      <Question text={t.questionShort} title={t.question} />
    </Dialog>
  )
}

const values = (t: Copy['shell'], rule: boolean): Item[] => [
  { label: t.value, meta: '6', checked: true, radio: true },
  ...(rule ? ['rule' as const] : []),
  { label: t.anotherValue, meta: '3', checked: false, radio: true },
  { label: t.thirdValue, meta: '1', checked: false, radio: true },
]

export function Menus(props: Props) {
  const { t, words, language } = props
  const desk = { padding: 'var(--s-6)' }

  return (
    <Entry text={t.menu}>
      <Specs caps={t.menuCaps.slice(0, 2)}>
        <div data-surface="desktop" style={desk}>
          <Menu
            items={[
              { label: t.item, hint: named(language, ['mod', 'N']) },
              { label: t.item, hint: named(language, ['mod', 'O']) },
              { label: t.hover, hint: named(language, ['mod', 'S']), state: 'hover' },
              'rule',
              { label: t.checked, checked: true },
              { label: t.submenu, items: [] },
              'rule',
              { label: t.disabled, disabled: true },
            ]}
            label={t.title}
            size="compact"
          />
        </div>
        <div data-surface="desktop" style={sized(60, 20)}>
          <MenuBar
            label={words.menuBar}
            menus={bar(t, words, language, 3)}
            shown={1}
            size="compact"
            t={words}
          >
            <BarSpace />
            <Button icon="search" name={words.search} size="compact" />
            <Button icon="contrast" name={words.theme} size="compact" />
            <Button label="EN" size="compact" />
            <BarText>{t.time}</BarText>
          </MenuBar>
        </div>
      </Specs>
      <Specs caps={t.menuCaps.slice(2)}>
        <div data-surface="window" style={sized(50, 30)}>
          <Bar line="below">
            <BarTitle>{t.title}</BarTitle>
            <BarSpace />
            <MenuButton
              button={{ label: t.value, end: 'chevron-down' }}
              end
              items={values(t, true)}
              label={t.value}
              shown={0}
              size="compact"
              t={words}
            />
          </Bar>
        </div>
        <div data-surface="desktop" style={desk}>
          <Menu items={values(t, true)} label={t.value} />
        </div>
        <Phone {...props} height={70}>
          <Window back={1} density="touch" name={[t.replaced[0]]} t={words} title={t.replaced[0]}>
            <div style={{ paddingBlock: 'var(--s-6)' }}>
              <div style={{ paddingInline: 'var(--inset)' }}>
                <Heading level="heading" text={t.windowText} title={t.title} />
              </div>
              {Array.from({ length: 12 }, (_, at) => (
                <Row
                  end="arrow-right"
                  href="#"
                  index={String(at + 1).padStart(2, '0')}
                  key={at}
                  title={t.title}
                />
              ))}
            </div>
          </Window>
          <Dialog bar drawer label={t.title} onClose={noop} open shown t={words}>
            <Menu drawer items={values(t, false)} label={t.title} />
          </Dialog>
        </Phone>
      </Specs>
    </Entry>
  )
}

// A dialog drawn as it stands, and one to open: it is modal, Esc closes it and the focus returns to the button.
export function Dialogs(props: Props) {
  const { t, words, language } = props
  const enter = named(language, ['enter'])
  const [open, setOpen] = useState(false)
  const [opener, setOpener] = useState<Element | null>(null)
  const close = () => setOpen(false)

  return (
    <Entry text={t.dialog}>
      <Specs caps={t.dialogCaps}>
        <div className="played">
          <button
            className="play"
            onClick={(event) => {
              setOpener(event.currentTarget)
              setOpen(true)
            }}
            type="button"
          >
            {t.ask}
          </button>
          <div data-surface="desktop" style={{ padding: 'var(--s-6)' }}>
            <Dialog
              actions={
                <ButtonGroup>
                  <Button label={t.cancel} tone="outline" />
                  <Button hint={enter} label={t.confirm} tone="solid" />
                </ButtonGroup>
              }
              label={t.question}
              onClose={noop}
              open
              shown
              t={words}
            >
              <Question text={t.questionText} title={t.question} />
            </Dialog>
          </div>
          <Dialog
            actions={
              <ButtonGroup>
                <Button label={t.cancel} onClick={close} tone="outline" />
                <Button hint={enter} label={t.confirm} onClick={close} tone="solid" />
              </ButtonGroup>
            }
            label={t.question}
            onClose={close}
            open={open}
            opener={opener}
            t={words}
          >
            <Question text={t.questionText} title={t.question} />
          </Dialog>
        </div>
        <Phone {...props} height={60}>
          <Asking t={t} words={words} />
        </Phone>
      </Specs>
    </Entry>
  )
}

export function Notices({ t }: Props) {
  const label = (tone?: 'solid' | 'outline') => (
    <Button label={t.label} size="compact" tone={tone} />
  )

  return (
    <Entry text={t.notice}>
      <Specs caps={t.noticeCaps}>
        <div data-surface="desktop" style={{ padding: 'var(--s-6)' }}>
          <Notice
            actions={
              <>
                {label('solid')}
                {label('outline')}
                {label()}
              </>
            }
            signal
            text={t.noticeAsks}
            title={t.title}
          />
        </div>
        <div data-surface="desktop" style={{ padding: 'var(--s-6)' }}>
          <Notice text={t.noticeTells} title={t.title} />
        </div>
      </Specs>
    </Entry>
  )
}

// The palette as it stands over a desk and as a drawer on a phone, with a few letters typed.
export function Palettes(props: Props) {
  const { t, words, language } = props
  const key = (...keys: string[]) => named(language, keys)
  // Two rows hold the letters in their titles, and the third, in a group of its own, only in its words.
  const results = t.found.map((title, at) => ({
    href: '#',
    icon: 'window' as const,
    title: marked(title, at < 2 ? t.typed : ''),
    kind: t.kind,
    group: at < 2 ? t.group : `${t.group} 2`,
    keys: at ? [key('alt'), String(at + 1)] : [key('enter')],
  }))
  const palette = (drawer?: boolean) => (
    <Palette
      drawer={drawer}
      escape={key('esc')}
      field={words.searchField.replace('{name}', t.name)}
      keys={[
        [[key('up'), key('down')], words.move],
        [[key('enter')], words.open],
        [[key('esc')], words.close],
      ]}
      none=""
      onClose={noop}
      open
      results={results}
      said={words.results.replace('{count}', String(results.length))}
      selected={0}
      shown
      t={words}
      value={t.typed}
    />
  )

  return (
    <Entry text={t.palette}>
      <Specs caps={t.paletteCaps}>
        <div data-surface="desktop" style={{ padding: 'var(--s-6)' }}>
          {palette()}
        </div>
        <Phone {...props} height={60}>
          {palette(true)}
        </Phone>
      </Specs>
    </Entry>
  )
}
