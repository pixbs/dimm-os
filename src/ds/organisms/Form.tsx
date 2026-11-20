'use client'

import { type FormEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import type { FormField } from '@/blocks/form/view'

import { Button } from '../molecules/Button'
import { Dots } from '../molecules/Dots'
import { Field } from '../molecules/Field'
import { Link } from '../molecules/Link'
import { Row } from '../molecules/Row'
import { Choices, Toggle } from '../molecules/Toggle'
import { duration } from '../motion/vocabulary'
import { Message } from './Message'
import { dateOf, Postmark } from './Postmark'
import { Prose } from './Prose'
import { Stamp } from './Record'

export type FormWords = {
  to: string
  send: string
  sending: string
  missing: string
  address: string
  failed: string
  sent: string
  received: string
  postmark: string
  reply: string
  again: string
}

type State = 'idle' | 'sending' | 'failed' | 'leaving' | 'sent'

// A slip's button stands at the window's foot, outside the form, so it reads the form's state from here.
const states = new Map<string, State>()
const listeners = new Set<() => void>()
function setState(id: string, state: State) {
  states.set(id, state)
  listeners.forEach((listener) => listener())
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}
const useFormState = (id: string) =>
  useSyncExternalStore(
    subscribe,
    () => states.get(id) ?? 'idle',
    () => 'idle' as State,
  )

// What a form says of itself, which a slip shows at the window's foot, above its button, where no scroll hides it.
type Said = { text: string; error: boolean }
const quiet: Said = { text: '', error: false }
const said = new Map<string, Said>()
function setSaid(id: string, now: Said) {
  said.set(id, now)
  listeners.forEach((listener) => listener())
}
const useSaid = (id: string) =>
  useSyncExternalStore(
    subscribe,
    () => said.get(id) ?? quiet,
    () => quiet,
  )

// Something missing or wrong, sending, or a send that failed, announced as it changes; an error pops the signal dot.
function Status({ text, error }: Said) {
  return (
    <p className="form__note" data-error={error ? '' : undefined} role="status">
      {text && <span className="dot" data-tone="signal" />}
      {text}
    </p>
  )
}

const address = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// How long a form has been open, on the device's own steady clock.
const since = (start: number) => performance.now() - start

// The submit of a form, at its own bar or at the foot of the window it is the slip of, there under what the form
// says; gone once it has sent.
export function Submit(props: {
  form: string
  words: FormWords
  label?: string | null
  said?: boolean
  // A state shown at rest, for the catalogue.
  state?: 'sending'
}) {
  const live = useFormState(props.form)
  const state = props.state ?? live
  const now = useSaid(props.form)
  if (state === 'leaving' || state === 'sent') return null
  const button = (
    <Button
      busy={state === 'sending' ? <Dots count={3} label={props.words.sending} on={2} /> : undefined}
      end="arrow-right"
      fill
      form={props.form}
      label={props.label || props.words.send}
      tone="solid"
      type="submit"
    />
  )
  return props.said ? (
    <>
      <Status {...now} />
      {button}
    </>
  ) : (
    button
  )
}

// Fields from the form builder in its order, a note, and its submit. It checks what is required and what must be an
// address, names what is missing from the form's own labels, keeps what was typed when a send fails, and after a
// send its rows leave and a message takes their place. On a slip it opens with the locked To row.
export function Form(props: {
  id: string
  form: number
  fields: FormField[]
  note: string | null
  submit: string | null
  privacy: { href: string; title: string; lang?: string } | null
  to: string
  place: string
  // A slip opens with its record's stamp line and the locked To row.
  slip?: { stamp?: { code: string; note?: string } }
  lang: string
  words: FormWords
  // A state shown at rest, and the fields it marks, for the catalogue.
  state?: 'sending' | 'failed' | 'sent'
  missing?: string[]
}) {
  const { id, fields, words, slip } = props
  const live = useFormState(id)
  const state = props.state ?? live
  const [marked, setMarked] = useState<{ missing: string[]; invalid: string[] }>({
    missing: props.missing ?? [],
    invalid: [],
  })
  const [reply, setReply] = useState('')
  const [sentOn, setSentOn] = useState(new Date(0))
  const opened = useRef(0)
  const element = useRef<HTMLFormElement>(null)

  useEffect(() => {
    opened.current = performance.now()
    return () => {
      states.delete(id)
      said.delete(id)
    }
  }, [id])

  // A send takes away the row or the button that held the focus, and a new slip takes the confirmation: the focus
  // goes to what stands there now, so that is read.
  const sent = useRef<HTMLDivElement>(null)
  const was = useRef(state)
  useEffect(() => {
    const before = was.current
    was.current = state
    if (props.state || document.activeElement !== document.body) return
    const title = state === 'sent' && sent.current?.querySelector<HTMLElement>('.hgroup__title')
    const row =
      before === 'sent' &&
      element.current?.querySelector<HTMLElement>('[name]:not([readonly], [tabindex="-1"])')
    if (title) title.tabIndex = -1
    ;(title || row || null)?.focus()
  }, [state, props.state])

  const named = fields.flatMap((field) => (field.kind === 'words' ? [] : [field]))
  const labelOf = (name: string) => named.find((field) => field.name === name)?.label ?? name
  const list = new Intl.ListFormat(props.lang, { type: 'conjunction' })
  const says = [
    marked.missing.length &&
      words.missing.replace('{list}', list.format(marked.missing.map(labelOf))),
    marked.invalid.length && words.address,
  ]
    .filter(Boolean)
    .join(' ')
  const status =
    state === 'sending'
      ? words.sending
      : state === 'failed'
        ? words.failed.replace('{email}', props.to)
        : says
  const error = Boolean((says && state !== 'sending') || state === 'failed')
  const onSlip = Boolean(slip)

  useEffect(() => {
    if (onSlip) setSaid(id, { text: status, error })
  }, [id, onSlip, status, error])

  function values() {
    const data = new FormData(element.current!)
    return Object.fromEntries(
      named.map(({ name, kind }) => [
        name,
        kind === 'check' ? data.get(name) === 'on' : String(data.get(name) ?? '').trim(),
      ]),
    )
  }
  function check(typed: Record<string, unknown>) {
    return {
      missing: named
        .filter(({ name, required }) => required && !typed[name])
        .map(({ name }) => name),
      invalid: named
        .filter(
          ({ name, kind }) => kind === 'email' && typed[name] && !address.test(String(typed[name])),
        )
        .map(({ name }) => name),
    }
  }

  // A mark goes as soon as its row is filled.
  function onInput() {
    if (!marked.missing.length && !marked.invalid.length) return
    const now = check(values())
    setMarked({
      missing: marked.missing.filter((name) => now.missing.includes(name)),
      invalid: marked.invalid.filter((name) => now.invalid.includes(name)),
    })
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'sending') return
    const typed = values()
    const found = check(typed)
    setMarked(found)
    // The first row to fix takes the focus, and the note says what is wrong.
    const [first] = [...found.missing, ...found.invalid]
    if (first) {
      element.current!.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]`)?.focus()
      return
    }
    setState(id, 'sending')
    const trap = new FormData(element.current!).get('website')
    try {
      const response = await fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form: props.form,
          lang: props.lang,
          values: typed,
          trap,
          waited: since(opened.current),
        }),
      })
      if (response.status === 422) {
        setMarked(await response.json())
        setState(id, 'idle')
        return
      }
      if (!response.ok) throw new Error(String(response.status))
    } catch {
      setState(id, 'failed')
      return
    }
    setReply(
      String(named.map(({ name, kind }) => kind === 'email' && typed[name]).find(Boolean) || ''),
    )
    setSentOn(new Date())
    setState(id, 'leaving')
    setTimeout(() => setState(id, 'sent'), duration('slow-exit') * 1000)
  }

  function again() {
    setMarked({ missing: [], invalid: [] })
    opened.current = performance.now()
    setState(id, 'idle')
  }

  // A slip is stamped with the day it was sent.
  const { day, year } = dateOf(props.lang, sentOn)
  const on = (words: string) =>
    words.replace('{place}', props.place).replace('{date}', `${day} ${year}`)

  if (state === 'sent')
    return (
      <div className="form__sent" data-rest={props.state ? '' : undefined} ref={sent} role="status">
        {slip && (
          <Postmark date={{ day, year }} label={on(words.postmark)} words={on(words.received)} />
        )}
        <Message
          actions={[{ label: words.again, onClick: again, end: 'arrow-right', tone: 'outline' }]}
          text={reply ? words.reply.replace('{email}', reply) : ''}
          title={words.sent}
        />
      </div>
    )

  const wrong = (name: string) => marked.missing.includes(name) || marked.invalid.includes(name)
  const above = named.some(({ half }) => half)

  return (
    <form
      className="form"
      data-rest={props.state || props.missing ? '' : undefined}
      data-above={above ? '' : undefined}
      data-state={state === 'leaving' ? 'leaving' : undefined}
      id={id}
      noValidate
      onInput={onInput}
      onSubmit={onSubmit}
      ref={element}
    >
      {slip?.stamp && <Stamp {...slip.stamp} />}
      <div className="list form__fields" data-ruled={slip ? '' : undefined}>
        {slip && <Field kind="text" label={words.to} locked value={props.to} />}
        {fields.map((field, at) => {
          if (field.kind === 'words') return <Prose html={field.html} key={at} />
          const shared = {
            label: field.label,
            name: field.name,
            required: field.required,
            invalid: wrong(field.name),
          }
          const half = field.half ? 'half' : undefined
          switch (field.kind) {
            case 'check':
              return (
                <Row
                  data-width={half}
                  key={field.name}
                  lead={<Toggle defaultChecked={field.value} kind="check" name={field.name} />}
                  title={field.label}
                  toggles
                />
              )
            case 'radio':
              return (
                <div data-width={half} key={field.name}>
                  <Field {...shared}>
                    {(labelledBy) => (
                      <Choices
                        columns={2}
                        labelledBy={labelledBy}
                        name={field.name}
                        options={field.options.map(({ label }) => label)}
                        value={field.value ?? undefined}
                      />
                    )}
                  </Field>
                </div>
              )
            case 'select':
              return (
                <div data-width={half} key={field.name}>
                  <Field
                    {...shared}
                    kind="select"
                    options={field.options.map(({ label }) => label)}
                    placeholder=""
                    value={field.value ?? undefined}
                  />
                </div>
              )
            default:
              return (
                <div data-width={half} key={field.name}>
                  <Field
                    {...shared}
                    above={field.kind === 'area' && Boolean(slip)}
                    kind={field.kind}
                    ruled={field.kind === 'area' && Boolean(slip)}
                    value={field.value ?? undefined}
                  />
                </div>
              )
          }
        })}
      </div>
      {/* Left empty by people, whom it is hidden from; a bot fills it. */}
      <input aria-hidden autoComplete="off" className="form__trap" name="website" tabIndex={-1} />
      {props.note && <p className="form__note">{props.note}</p>}
      {!slip && <Status error={error} text={status} />}
      <div className="form__bar">
        {props.privacy && (
          <Link href={props.privacy.href} hrefLang={props.privacy.lang} lang={props.privacy.lang}>
            {props.privacy.title}
          </Link>
        )}
        {!slip && (
          <Submit
            form={id}
            label={props.submit}
            state={state === 'sending' ? state : undefined}
            words={words}
          />
        )}
      </div>
    </form>
  )
}
