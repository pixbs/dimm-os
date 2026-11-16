'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import {
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react'

import type { Dictionary } from '@/i18n/en'
import type { Named } from '@/i18n/keys'

import { Bar } from '../molecules/Bar'
import { Button } from '../molecules/Button'
import { ForDevice } from '../molecules/Key'
import { Row } from '../molecules/Row'
import { curve, duration, reduced, usePainted } from '../motion/vocabulary'
import { Dialog } from './Dialog'

// A row of a menu: a link, a command, one that is checked or not, or a submenu, whose rows can wait to be asked for.
export type Item =
  | 'rule'
  | {
      label: string
      // Its key, which a phone does not have, and a count it shows on every screen.
      hint?: Named
      meta?: string
      href?: string
      act?: () => void
      checked?: boolean
      radio?: boolean
      disabled?: boolean
      items?: Item[] | (() => Item[])
      // A state shown at rest, for the catalogue.
      state?: 'hover'
    }

// A menu of the menu bar: a word, or an icon with its name, and its rows; data-for says which screens show it.
export type Top = {
  name: string
  label?: string
  icon?: ComponentProps<typeof Button>['icon']
  lead?: ReactNode
  for?: string
  items: Item[]
}

// The open menus, one a level: which row opened each and the element it was opened from.
type Chain = { at: number; from: Element | null; last?: boolean }[]

type Context = {
  chain: Chain
  open: (depth: number, at: number, from: Element | null, last?: boolean) => void
  close: (depth: number, restore: boolean) => void
  done: () => void
  // Left and Right at the first level go to the menu beside it.
  aside?: (by: 1 | -1) => void
  drawer?: boolean
  size?: 'compact'
  // Drawn open where it stands, for the catalogue: nothing takes the focus.
  shown?: boolean
  t: Pick<Dictionary, 'close'>
}

// A menu unfolds from the edge it hangs from, and folds back into it, as fast as a menu goes.
const unfolds = {
  open: () => ({
    opacity: 1,
    scaleY: 1,
    transition: { duration: duration('fast'), ease: curve('enter') },
  }),
  closed: () => ({
    opacity: 0,
    scaleY: reduced() ? 1 : 0,
    transition: { duration: duration('fast-exit'), ease: curve('exit') },
  }),
}

const rows = (menu: HTMLElement) =>
  [
    ...menu.querySelectorAll<HTMLElement>(
      ':scope > [role^=menuitem], :scope > .menu__sub > [role^=menuitem]',
    ),
  ].filter((row) => !row.matches(':disabled'))

// The rows of one menu, which the arrows walk: Right opens a submenu, Left and Esc close the menu, and the focus
// stays among its rows.
function List(props: { items: Item[]; label: string; depth: number; menus: Context }) {
  const { items, depth, menus } = props
  const { chain, drawer } = menus
  const self = useRef<HTMLDivElement>(null)

  const start = useEffectEvent(() => {
    if (menus.shown) return
    const all = rows(self.current!)
    ;(chain[depth]?.last ? all.at(-1) : all[0])?.focus()
  })
  useEffect(() => start(), [])

  function key(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as Element).closest('[role=menu]') !== self.current) return
    const all = rows(self.current!)
    const at = all.indexOf(document.activeElement as HTMLElement)
    const go = (to: number) => all[(to + all.length) % all.length]?.focus()
    const row = all[at]
    const next = (by: 1 | -1) => go(at < 0 && by < 0 ? -1 : at + by)

    if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) next(1)
    else if (event.key === 'ArrowUp' || event.key === 'Tab') next(-1)
    else if (event.key === 'Home') go(0)
    else if (event.key === 'End') go(-1)
    else if (event.key === 'ArrowRight' && row?.hasAttribute('aria-haspopup')) row.click()
    else if (event.key === 'ArrowRight' || (event.key === 'ArrowLeft' && !depth)) {
      menus.aside?.(event.key === 'ArrowRight' ? 1 : -1)
    } else if (event.key === 'ArrowLeft' || event.key === 'Escape') menus.close(depth, true)
    else if (event.key === ' ' && row?.matches('a')) row.click()
    else return
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      aria-label={props.label}
      className="menu"
      data-surface={drawer ? undefined : 'raised'}
      onKeyDown={key}
      ref={self}
      role="menu"
    >
      {items.map((item, at) => {
        if (item === 'rule') return <div className="menu__rule" key={at} role="separator" />
        const row = {
          disabled: item.disabled,
          // A phone has no keys: its rows say where they lead.
          meta: item.meta ?? (!drawer && item.hint && <ForDevice text={item.hint} />),
          role:
            item.checked === undefined
              ? 'menuitem'
              : `menuitem${item.radio ? 'radio' : 'checkbox'}`,
          'aria-checked': item.checked,
          icon: item.checked === undefined ? undefined : ('check' as const),
          size: menus.size,
          state: item.state,
          tabIndex: -1,
          title: item.label,
        }
        if (!item.items) {
          return (
            <Row
              {...row}
              end={drawer && item.href ? 'arrow-right' : undefined}
              href={item.href}
              key={at}
              onClick={() => {
                item.act?.()
                menus.done()
              }}
            />
          )
        }
        const open = chain[depth + 1]?.at === at
        return (
          <div className="menu__sub" key={at} role="none">
            <Row
              {...row}
              aria-expanded={open}
              aria-haspopup="menu"
              end="chevron-right"
              onClick={(event) =>
                open
                  ? menus.close(depth + 1, false)
                  : menus.open(depth + 1, at, event.currentTarget)
              }
            />
            <Level
              depth={depth + 1}
              items={item.items}
              label={item.label}
              menus={menus}
              open={open}
            />
          </div>
        )
      })}
    </div>
  )
}

// One level of a menu: on a desk it hangs from what opened it, on a compact screen it is a drawer, and modal.
function Level(props: {
  open: boolean
  items: Item[] | (() => Item[])
  label: string
  depth: number
  end?: boolean
  menus: Context
}) {
  const { open, items, label, depth, menus } = props
  const painted = usePainted()
  const list = () => (
    <List
      depth={depth}
      items={typeof items === 'function' ? items() : items}
      label={label}
      menus={menus}
    />
  )

  if (menus.drawer) {
    return (
      <Dialog
        back={menus.chain.length - 1 - depth}
        bar
        drawer
        label={label}
        onClose={() => menus.close(depth, true)}
        open={open}
        opener={menus.chain[depth]?.from}
        shown={menus.shown}
        t={menus.t}
      >
        {open && list()}
      </Dialog>
    )
  }
  return (
    <AnimatePresence initial={!painted}>
      {open && (
        <m.div
          animate="open"
          className="menu__hang"
          data-end={props.end ? '' : undefined}
          exit="closed"
          initial="closed"
          variants={painted ? undefined : unfolds}
        >
          {list()}
        </m.div>
      )}
    </AnimatePresence>
  )
}

// The menus under one element: opening one closes the ones beside it, and choosing a row closes them all. A
// press outside closes them too, and Esc gives the focus back to what opened the menu.
function useMenus(root: { current: HTMLElement | null }, shown?: number) {
  const [chain, setChain] = useState<Chain>(shown === undefined ? [] : [{ at: shown, from: null }])

  const open = (depth: number, at: number, from: Element | null, last?: boolean) =>
    setChain([...chain.slice(0, depth), { at, from, last }])
  function close(depth: number, restore: boolean) {
    const from = chain[depth]?.from
    setChain(chain.slice(0, depth))
    if (restore && from instanceof HTMLElement) from.focus({ preventScroll: true })
  }
  // A drawer leaves at once, so what the row opened can take the focus; the focus goes back to the bar meanwhile.
  function done() {
    for (const dialog of root.current?.querySelectorAll('dialog') ?? []) dialog.close()
    close(0, true)
  }

  const outside = useEffectEvent((event: PointerEvent) => {
    if (!root.current?.contains(event.target as Node)) setChain([])
  })
  useEffect(() => {
    if (!chain.length) return
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [chain.length])

  return { chain, open, close, done }
}

type Shared = {
  drawer?: boolean
  size?: 'compact' | 'chrome'
  t: Pick<Dictionary, 'close'>
  // The menu drawn open, for the catalogue.
  shown?: number
  // How many menus are open, which on a phone are drawers in front of the windows.
  onDepth?: (depth: number) => void
}

// Rows are compact where a fine pointer opens the menu and regular where a finger does.
const density = (size: Shared['size']) =>
  size === 'compact' ||
  (size === 'chrome' && typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches)
    ? 'compact'
    : undefined

// The top edge of the screen: the menus, which follow the menu bar pattern of ARIA, then what the bar shows.
// Left and Right go along the menus, and with one open open the next; Down, Enter and Space open one.
export function MenuBar(props: Shared & { label: string; menus: Top[]; children?: ReactNode }) {
  const bar = useRef<HTMLDivElement>(null)
  const { chain, open, close, done } = useMenus(bar, props.shown)
  const [current, setCurrent] = useState(() => props.menus.findIndex((menu) => !menu.for))
  const depth = useEffectEvent(() => props.onDepth?.(chain.length))
  useEffect(() => depth(), [chain.length])

  // The buttons of the menus this screen shows.
  const buttons = () =>
    [...bar.current!.querySelectorAll<HTMLElement>(':scope > * > [role=menuitem]')].filter((one) =>
      one.checkVisibility(),
    )
  // By one along the menus this screen shows, or to the one given.
  function move(by: 1 | -1 | 0, from: HTMLElement, unfold: boolean) {
    const all = buttons()
    const to = by ? all[(all.indexOf(from) + by + all.length) % all.length] : from
    const index = Number(to.dataset.menu)
    setCurrent(index)
    to.focus()
    if (unfold) open(0, index, to)
  }
  function key(event: KeyboardEvent<HTMLElement>, at: number) {
    const { key, currentTarget: button } = event
    if (key === 'ArrowRight' || key === 'ArrowLeft')
      move(key === 'ArrowRight' ? 1 : -1, button, false)
    else if (key === 'Home' || key === 'End') {
      const all = buttons()
      move(0, key === 'Home' ? all[0] : all.at(-1)!, false)
    } else if (key === 'ArrowDown' || key === 'ArrowUp') open(0, at, button, key === 'ArrowUp')
    else return
    event.preventDefault()
  }
  const shared: Omit<Context, 'chain'> = {
    open,
    close,
    done,
    aside: props.drawer ? undefined : (by) => move(by, chain[0]?.from as HTMLElement, true),
    drawer: props.drawer,
    size: density(props.size),
    shown: props.shown !== undefined && chain[0]?.from === null,
    t: props.t,
  }

  return (
    <Bar line="below" size={props.size}>
      <div aria-label={props.label} className="menubar" ref={bar} role="menubar">
        {props.menus.map((menu, index) => (
          <span className="menu-anchor" data-for={menu.for} key={menu.name} role="none">
            <Button
              aria-expanded={chain[0]?.at === index}
              aria-haspopup="menu"
              data-menu={index}
              icon={menu.icon}
              label={menu.label}
              lead={menu.lead}
              name={menu.name}
              onClick={(event) =>
                chain[0]?.at === index ? close(0, false) : open(0, index, event.currentTarget)
              }
              onFocus={() => setCurrent(index)}
              onKeyDown={(event) => key(event, index)}
              role="menuitem"
              size={props.size}
              tabIndex={current === index ? 0 : -1}
            />
            <Level
              menus={{ ...shared, chain }}
              depth={0}
              items={menu.items}
              label={menu.name}
              open={chain[0]?.at === index}
            />
          </span>
        ))}
      </div>
      {props.children}
    </Bar>
  )
}

// A button that opens a menu: under it, flush with its start, or with its end when it closes a bar.
export function MenuButton(
  props: Shared & {
    label: string
    items: Item[]
    end?: boolean
    button: ComponentProps<typeof Button>
  },
) {
  const anchor = useRef<HTMLSpanElement>(null)
  const menus = useMenus(anchor, props.shown)
  const open = menus.chain.length > 0

  return (
    <span className="menu-anchor" ref={anchor}>
      <Button
        {...props.button}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(event) => (open ? menus.close(0, false) : menus.open(0, 0, event.currentTarget))}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          event.preventDefault()
          menus.open(0, 0, event.currentTarget, event.key === 'ArrowUp')
        }}
        size={props.size}
      />
      <Level
        menus={{
          ...menus,
          drawer: props.drawer,
          size: density(props.size),
          shown: props.shown !== undefined && menus.chain[0]?.from === null,
          t: props.t,
        }}
        depth={0}
        end={props.end}
        items={props.items}
        label={props.label}
        open={open}
      />
    </span>
  )
}

// A menu drawn where it stands, as the catalogue shows one.
export function Menu(props: { items: Item[]; label: string; drawer?: boolean; size?: 'compact' }) {
  const noop = () => {}
  return (
    <List
      menus={{
        chain: [],
        open: noop,
        close: noop,
        done: noop,
        drawer: props.drawer,
        size: props.size,
        shown: true,
        t: { close: '' },
      }}
      depth={0}
      items={props.items}
      label={props.label}
    />
  )
}
