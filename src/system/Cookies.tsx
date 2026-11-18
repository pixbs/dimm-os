'use client'

import { type ReactNode, useSyncExternalStore } from 'react'

import { decide, useChoice } from '@/consent/choice'
import { necessary, registry, version } from '@/consent/registry'
import { Button, ButtonGroup, ButtonLink } from '@/ds/molecules/Button'
import { Heading } from '@/ds/molecules/Heading'
import { Link } from '@/ds/molecules/Link'
import { Row } from '@/ds/molecules/Row'
import { Tag } from '@/ds/molecules/Tag'
import { Toggle } from '@/ds/molecules/Toggle'
import { List } from '@/ds/organisms/List'
import { RecordHead } from '@/ds/organisms/Record'
import { SplitView } from '@/ds/organisms/SplitView'
import { Table } from '@/ds/organisms/Table'
import { Section } from '@/ds/sections/Section'
import { type Language, toAddress } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import type { Parts } from '@/shell/OnDesk'

type Props = { t: Dictionary; language: Language; name: string; close: () => void }

const all = registry.map(({ id }) => id)
const [analytics] = registry

// A sentence with the link to Cookies in its place.
function Said({ text, props }: { text: string; props: Props }) {
  const [before, after] = text.split('{cookies}')
  return (
    <p className="t-body">
      {before}
      <Link href={toAddress(props.language, '/cookies')}>{props.t.cookies}</Link>
      {after}
    </p>
  )
}

// The answer, recorded, closes what asked.
const answer = (props: Props, on: string[]) => () => {
  decide(on)
  props.close()
}

// cookies.sys: who asks, for what, where it goes and for how long, and the two equal answers, with the details beside.
export function cookiesWindow(props: Props): Parts {
  const { t, language } = props
  const c = t.consent
  return {
    body: (
      <>
        <Section>
          <RecordHead stamp={{ code: 'SYS/CNS.01', note: `v${version}` }}>
            <Heading page text={c.lead.replace('{name}', props.name)} title={c.title} />
          </RecordHead>
        </Section>
        <Section>
          <List head={{ title: c.purpose, end: c.byDefault }} ruled>
            <Row meta={c.on} text={c.necessaryText} title={c.necessary} />
            {registry.map((entry) => (
              <Row key={entry.id} meta={c.off} text={entry.service} title={entry.title[language]} />
            ))}
          </List>
          <Said
            props={props}
            text={c.note
              .replace('{purpose}', analytics.title[language])
              .replace('{company}', analytics.company)
              .replace('{country}', analytics.country[language])
              .replace('{stored}', analytics.stored[language])
              .replace('{kept}', analytics.keeps[0].kept[language])}
          />
        </Section>
      </>
    ),
    foot: (
      <ButtonGroup cells>
        <Button label={c.decline} onClick={answer(props, [])} tone="outline" />
        <Button label={c.accept} onClick={answer(props, all)} tone="outline" />
        <ButtonLink
          end="arrow-right"
          href={toAddress(language, '/cookies/preferences')}
          label={c.details}
          tone="outline"
        />
      </ButtonGroup>
    ),
  }
}

// What the switches say before they are saved, shared by the window's body and its foot.
let draft: string[] | null = null
const drafted = new Set<() => void>()
const redraft = (on: string[] | null) => {
  draft = on
  drafted.forEach((listener) => listener())
}
const useDraft = (saved: string[]) =>
  useSyncExternalStore(
    (listener) => (drafted.add(listener), () => drafted.delete(listener)),
    () => draft,
    () => null,
  ) ?? saved

function Preferences(props: Props) {
  const { t, language } = props
  const c = t.consent
  const choice = useChoice()
  const on = useDraft(choice?.on ?? [])
  const state = choice
    ? `${c.given.replace('{date}', new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(choice.at)))} · ${c.optional.replace('{on}', String(choice.on.length)).replace('{of}', String(all.length))}`
    : c.none
  const pane = (title: string, purpose: string, tables: ReactNode) => (
    <>
      <Heading level="heading" title={title} />
      <p className="t-body">{purpose}</p>
      {tables}
    </>
  )

  return (
    <>
      <Section>
        <RecordHead stamp={{ code: 'SYS/CNS.02', note: state }}>
          <Heading page title={t.cookiePreferences} />
        </RecordHead>
      </Section>
      <Section>
        <SplitView
          items={[
            {
              key: 'necessary',
              title: c.necessary,
              text: c.thisSite,
              end: <Tag>{c.alwaysOn}</Tag>,
              pane: pane(
                c.necessary,
                c.necessaryPurpose,
                <Table
                  columns={[c.what, c.kept]}
                  rows={necessary.map(({ name, kept }) => [name[language], kept[language]])}
                />,
              ),
            },
            ...registry.map((entry) => ({
              key: entry.id,
              title: entry.title[language],
              text: c.services
                .replace('{count}', '1')
                .replace('{country}', entry.country[language]),
              end: (
                <Toggle
                  aria-label={entry.title[language]}
                  checked={on.includes(entry.id)}
                  kind="switch"
                  onChange={(event) =>
                    redraft(
                      event.currentTarget.checked
                        ? [...on, entry.id]
                        : on.filter((id) => id !== entry.id),
                    )
                  }
                />
              ),
              pane: pane(
                entry.title[language],
                entry.purpose[language],
                <>
                  <Table
                    columns={[c.service, c.provider, c.country]}
                    rows={[[entry.service, entry.company, entry.country[language]]]}
                  />
                  <Table
                    columns={[c.what, c.kind, c.kept]}
                    rows={entry.keeps.map((kept) => [
                      kept.name[language],
                      kept.kind?.[language] ?? '',
                      kept.kept[language],
                    ])}
                  />
                </>,
              ),
            })),
          ]}
          label={t.cookiePreferences}
          ruled
        />
      </Section>
      <Section>
        <Said props={props} text={c.prefsNote} />
      </Section>
    </>
  )
}

function Save({ props }: { props: Props }) {
  const choice = useChoice()
  const on = useDraft(choice?.on ?? [])
  return <Button label={props.t.consent.save} onClick={answer(props, on)} tone="outline" />
}

// cookies.sys/preferences: one purpose at a time, Necessary always on, and the answer: no, yes, or what the switches say.
export function cookiePreferencesWindow(props: Props): Parts {
  const c = props.t.consent
  const close = () => {
    redraft(null)
    props.close()
  }
  const closing = { ...props, close }
  return {
    body: <Preferences {...closing} />,
    foot: (
      <ButtonGroup cells>
        <Button label={c.decline} onClick={answer(closing, [])} tone="outline" />
        <Button label={c.accept} onClick={answer(closing, all)} tone="outline" />
        <Save props={closing} />
      </ButtonGroup>
    ),
  }
}
