'use client'

import { AnimatePresence, useMotionValue } from 'motion/react'
import * as m from 'motion/react-m'
import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type { Dictionary } from '@/i18n/en'

import { Bar, BarTitle } from '../molecules/Bar'
import { Heading } from '../molecules/Heading'
import { ways } from '../motion/Origin'
import { curve, duration, reduced, spring, usePainted } from '../motion/vocabulary'
import { Handle, rises } from './Drawer'

type Props = {
  open: boolean
  label: string
  // Dismissed by Esc, by its scrim or by its handle.
  onClose: () => void
  // On a compact screen it is a drawer, and steps back behind one opened from it.
  drawer?: boolean
  back?: number
  // Shown where it stands, for the catalogue; otherwise it is modal.
  shown?: boolean
  // A title bar, as a menu has in a drawer.
  bar?: boolean
  // What gets the focus back, unless something else took it.
  opener?: Element | null
  actions?: ReactNode
  // A part built on the dialog, which a press beside it also puts away.
  className?: string
  t: Pick<Dictionary, 'close'>
  children?: ReactNode
}

// A window that asks one question: the native dialog, so what lies behind it is inert and Esc closes it. It comes
// from 96 % at its own place; on a compact screen it is a drawer that rises under the menu bar, its actions stacked.
export function Dialog(props: Props) {
  const painted = usePainted()
  // Each opening is a dialog of its own, so one opened again while the last is still leaving stands modal.
  const [times, setTimes] = useState(0)
  const [was, setWas] = useState(props.open)
  if (was !== props.open) {
    setWas(props.open)
    if (props.open) setTimes(times + 1)
  }

  return (
    <AnimatePresence initial={!painted}>
      {props.open && <Shown key={times} {...props} />}
    </AnimatePresence>
  )
}

function Shown(props: Props) {
  const { drawer, shown, opener, onClose } = props
  const self = useRef<HTMLDialogElement>(null)
  const y = useMotionValue('0%')
  const flung = useRef(0)
  const [kept, setKept] = useState(false)
  const painted = usePainted()

  // Modal, it stands in the top layer: a drawer over the room under the menu bar. What it holds may take the focus;
  // if not, the first thing in it to press does. Once it has gone the focus returns to its opener, unless it went
  // elsewhere meanwhile.
  useLayoutEffect(() => {
    const dialog = self.current!
    if (shown) return
    const room = dialog.closest('.screen')?.querySelector('.screen__main')
    if (room) dialog.style.setProperty('--room', `${room.getBoundingClientRect().top}px`)
    dialog.showModal()
  }, [shown])
  const settle = useEffectEvent(() => {
    const dialog = self.current!
    if (shown) return
    const content = ':scope > .dialog__frame > :not(.drawer__handle)'
    if (!dialog.querySelector(`${content}:focus-within`)) {
      dialog
        .querySelector<HTMLElement>(`${content} :is(input:enabled, a[href], button:enabled)`)
        ?.focus()
    }
  })
  // The opener as it is when the dialog leaves: one that hands the focus on names none.
  const opened = useEffectEvent(() => opener)
  useEffect(() => {
    settle()
    return () => {
      const back = opened()
      const lost = (document.activeElement ?? document.body) === document.body
      if (lost && back instanceof HTMLElement) back.focus({ preventScroll: true })
    }
  }, [])

  const frames = useMemo(() => {
    if (painted) return
    return drawer ? rises() : ways('fast')
  }, [painted, drawer])
  const scrim = useMemo(() => {
    if (painted) return
    const fades = (opacity: number) => () => ({
      opacity,
      transition: { duration: duration('slow'), ease: curve('standard') },
    })
    return { open: fades(1), closed: fades(0) }
  }, [painted])

  function dismiss(speed = 0) {
    flung.current = speed
    onClose()
  }

  return (
    <m.dialog
      aria-label={props.label}
      className={props.className ? `dialog ${props.className}` : 'dialog'}
      data-back={props.back || undefined}
      data-drawer={drawer ? '' : undefined}
      // Esc closes the dialog in front, not the ones it was opened from.
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return
        event.preventDefault()
        dismiss()
      }}
      // A press on the backdrop lands on the dialog itself.
      onClick={(event) => {
        if (props.className && event.target === event.currentTarget) dismiss()
      }}
      open={shown}
      ref={self}
    >
      {drawer && (
        <m.div
          animate="open"
          aria-hidden
          className="dialog__scrim"
          exit="closed"
          initial="closed"
          onClick={() => dismiss()}
          variants={scrim}
        />
      )}
      <m.div
        animate={kept ? 'kept' : 'open'}
        className="dialog__frame"
        custom={flung}
        data-surface="window"
        exit="closed"
        initial="closed"
        // Behind one opened from it, it steps back on the spring, as a drawer does.
        layout={drawer && !painted && !reduced()}
        layoutDependency={props.back}
        style={{ y }}
        transition={painted ? undefined : { layout: spring('slow') }}
        variants={frames}
      >
        {drawer && (
          <Handle
            height={() => self.current!.querySelector('.dialog__frame')!.clientHeight}
            label={props.t.close}
            leave={dismiss}
            stay={() => setKept((kept) => !kept)}
            y={y}
          />
        )}
        {props.bar && (
          <Bar line="below">
            <BarTitle>{props.label}</BarTitle>
          </Bar>
        )}
        {props.children}
        {props.actions}
      </m.div>
    </m.dialog>
  )
}

// The body of a dialog that asks: its question and what will happen.
export function Question({ title, text }: { title: string; text: string }) {
  return (
    <div className="dialog__body">
      <Heading level="lead" text={text} title={title} />
    </div>
  )
}

// A raised note in a corner of the screen: a confirmation, a consent, a message from the system. It blocks
// nothing, and comes from 96 % at its own place.
export function Notice(props: {
  open?: boolean
  title: string
  text?: string
  signal?: boolean
  actions?: ReactNode
}) {
  const painted = usePainted()

  return (
    <AnimatePresence initial={!painted}>
      {props.open !== false && (
        <m.div
          animate="open"
          className="notice"
          data-surface="raised"
          exit="closed"
          initial="closed"
          role="status"
          variants={painted ? undefined : ways('fast')}
        >
          <div className="notice__head">
            {props.signal && (
              <span className="notice__mark">
                <span className="dot" data-tone="signal" />
              </span>
            )}
            <Heading level="lead" text={props.text} title={props.title} />
          </div>
          {props.actions && <div className="notice__actions">{props.actions}</div>}
        </m.div>
      )}
    </AnimatePresence>
  )
}
