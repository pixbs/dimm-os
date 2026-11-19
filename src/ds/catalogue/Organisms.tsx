'use client'

import type { FormField } from '@/blocks/form/view'
import type { Dictionary } from '@/i18n/en'
import { Page } from '@/shell/Aside'

import { Button } from '../molecules/Button'
import { Form } from '../organisms/Form'
import { Message } from '../organisms/Message'
import { Plate } from '../organisms/Plate'
import { Header } from '../sections/Header'
import { Facts } from '../sections/Facts'
import { Text } from '../sections/Text'
import type { Copy } from './copy/en'
import { Entry, Specs, u } from './parts'

type Records = Copy['records']

// An organism on a stage of a width it answers to.
const box = (width: number, children: React.ReactNode) => (
  <div className="cq" style={{ width: u(width) }}>
    <div className="stage" data-surface="window">
      {children}
    </div>
  </div>
)

// Forms of each kind of field and at each state, as the form builder gives them.
export function Forms({ t, language }: { t: Records; language: string }) {
  const w = t.formWords
  const text = (half: boolean, value: string | null = null): FormField => ({
    kind: 'text',
    name: 'text',
    label: w.text,
    required: true,
    half,
    value,
  })
  const email = (half: boolean, value: string | null = 'name@example.com'): FormField => ({
    kind: 'email',
    name: 'email',
    label: w.email,
    required: true,
    half,
    value,
  })
  const select: FormField = {
    kind: 'select',
    name: 'select',
    label: w.select,
    required: false,
    half: false,
    options: w.options.map((label) => ({ label, value: label })),
    value: w.options[0],
  }
  const area = (value: string | null): FormField => ({
    kind: 'area',
    name: 'area',
    label: w.area,
    required: false,
    half: false,
    value,
  })
  const agree: FormField = {
    kind: 'check',
    name: 'agree',
    label: w.agree,
    required: false,
    half: false,
    value: false,
  }
  const halves = [text(true, w.text), email(true), select, area(null), agree]
  const beside = [text(false, w.text), email(false), area(w.long)]
  const shared = {
    form: 0,
    lang: language,
    note: null,
    place: w.place,
    privacy: { href: '#', title: w.link },
    submit: w.send,
    to: 'name@example.com',
    words: w,
  }
  const [half, plain, compact, missing, sending, failed, sent] = t.formCaps

  return (
    <Entry text={t.form}>
      <Specs caps={[half, plain]}>
        {box(90, <Form {...shared} fields={halves} id="catalogue-form-half" />)}
        {box(90, <Form {...shared} fields={beside} id="catalogue-form-beside" />)}
      </Specs>
      <Specs caps={[compact, missing]}>
        {box(47, <Form {...shared} fields={halves} id="catalogue-form-compact" />)}
        {box(
          47,
          <Form
            {...shared}
            fields={[text(false, w.text), email(false, null)]}
            id="catalogue-form-missing"
            missing={['email']}
          />,
        )}
      </Specs>
      <Specs caps={[sending, failed, sent]}>
        {box(47, <Form {...shared} fields={beside} id="catalogue-form-sending" state="sending" />)}
        {box(47, <Form {...shared} fields={beside} id="catalogue-form-failed" state="failed" />)}
        {box(47, <Form {...shared} fields={beside} id="catalogue-form-sent" state="sent" />)}
      </Specs>
    </Entry>
  )
}

export function Messages({ t }: { t: Records }) {
  const m = t.messageWords
  const act = { label: m.label, onClick: () => {} }

  return (
    <Entry text={t.message}>
      <Specs caps={t.messageCaps}>
        {box(90, <Message action={act} text={m.text} title={m.title} />)}
        {box(47, <Message action={act} eyebrow={m.eyebrow} text={m.short} title={m.title} />)}
      </Specs>
    </Entry>
  )
}

// A plate in a bay: its screws come out one by one, and with none it falls and shows what the bay holds.
export function Plates({ t }: { t: Records }) {
  const p = t.plateWords

  return (
    <Entry text={t.plate}>
      <Specs caps={t.plateCaps}>
        {box(
          90,
          <Plate
            facts={t.facts.map(([label, value]) => ({ label, value }))}
            foot={[t.card.note, t.index[3]]}
            inside={(close) => (
              <div className="message">
                <p>{p.inside}</p>
                <Button label={p.back} onClick={close} tone="outline" />
              </div>
            )}
            label={t.card.title}
            marks={[
              { icon: 'star', title: t.card.title, text: p.mark },
              { icon: 'ab', title: t.card.note, text: p.mark },
            ]}
            screws={[p.screw, p.screw, p.screw, p.screw]}
            stamp={{ code: t.card.code, note: t.card.note }}
            text={p.text}
            title={t.card.title}
          />,
        )}
      </Specs>
    </Entry>
  )
}

// A page with its aside at the start, an index of its chapters, and at the end, a record card, at the three widths.
export function Asides(props: { t: Copy['collections']; widths: string[]; words: Dictionary }) {
  const { t, words } = props
  const facts = [t.value, t.value, t.long].map((value) => ({ label: t.label, value }))
  const widths = [47, 90, 130]

  return (
    <Entry text={t.aside}>
      {(['start', 'end'] as const).map((at, row) => (
        <Specs caps={[t.asides[row]]} key={at}>
          <Specs caps={props.widths}>
            {widths.map((width) => {
              const id = `catalogue-aside-${at}-${width}`
              const chapters = [1, 2].map((n) => ({
                id: `${id}-0${n}`,
                number: `0${n}`,
                title: t.section,
              }))
              return box(
                width,
                <Page
                  aside={
                    at === 'start'
                      ? { type: 'contents' }
                      : { type: 'record', title: t.title, facts, actions: [] }
                  }
                  chapters={chapters}
                  foot={null}
                  t={words}
                >
                  <Header level="title" page text={t.lead} title={t.page} />
                  {at === 'start' ? (
                    chapters.map((chapter) => (
                      <Text
                        eyebrow={chapter.number}
                        html={`<p>${t.about}</p>`}
                        id={chapter.id}
                        key={chapter.id}
                        title={chapter.title}
                      />
                    ))
                  ) : (
                    <Facts items={facts} title={t.section} />
                  )}
                </Page>,
              )
            })}
          </Specs>
        </Specs>
      ))}
    </Entry>
  )
}
