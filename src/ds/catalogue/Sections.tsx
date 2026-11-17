import type { ReactNode } from 'react'

import { Tag } from '../molecules/Tag'
import { Prose } from '../organisms/Prose'
import { Header } from '../sections/Header'
import { Section } from '../sections/Section'
import { Text } from '../sections/Text'
import type { Copy } from './copy/en'
import { Doc, Entry, Specs, u } from './parts'

type Props = { t: Copy['sections'] }

// A window body at each of the three widths a section knows.
const windows = [u(47), u(90), u(130)]

function Widths({ caps, children }: { caps: string[]; children: ReactNode }) {
  return (
    <Specs caps={caps}>
      {windows.map((width) => (
        <div className="cq box" data-surface="window" key={width} style={{ width }}>
          {children}
        </div>
      ))}
    </Specs>
  )
}

export function Sections({ t }: Props) {
  const body = (size?: 'line') => (
    <div className="placeholder" data-size={size}>
      <Tag>{t.body}</Tag>
    </div>
  )
  const actions = [
    { href: '#', label: t.label },
    { href: '#', label: t.label },
  ]
  const second = (words: string[]) =>
    `<p>${words[0]} <strong>${words[1]}</strong> ${words[2]} <a class="link" href="#">${words[3]}</a>.</p>`
  const split = `<p>${t.paragraph}</p><h3>${t.three}</h3>${second(t.second)}<ul>${t.items.map((item) => `<li>${item}</li>`).join('')}</ul>`
  const [surfaces, joined, display, closing, splits, stacked] = t.caps

  return (
    <Doc text={t.doc}>
      <Entry text={t.frame}>
        <Widths caps={t.widths}>
          <Section split text={t.sentence} title={t.title}>
            {body()}
          </Section>
        </Widths>
        <Specs caps={[surfaces]}>
          <Widths caps={t.widths}>
            <Section surface="paper" text={t.sentence} title={t.title}>
              {body('line')}
            </Section>
            <Section surface="orange" title={t.title}>
              {body('line')}
            </Section>
          </Widths>
        </Specs>
        <Specs caps={[joined]}>
          <Widths caps={t.widths}>
            <Text html={`<p>${t.paragraph}</p>`} split title={t.title}>
              <Prose html={`<p>${t.joined}</p>`} />
              {body()}
            </Text>
          </Widths>
        </Specs>
      </Entry>
      <Entry text={t.header}>
        <Widths caps={t.widths}>
          <Header actions={actions} level="title" text={t.lead} title={t.page} />
        </Widths>
        <Specs caps={[display]}>
          <Widths caps={t.widths}>
            <Header level="display" text={t.opens} title={t.big} />
          </Widths>
        </Specs>
        <Specs caps={[closing]}>
          <Widths caps={t.widths}>
            <Header
              actions={actions.slice(0, 1)}
              level="heading"
              surface="orange"
              title={t.closing}
            />
          </Widths>
        </Specs>
      </Entry>
      <Entry text={t.text}>
        <Specs caps={[splits]}>
          <Widths caps={t.widths}>
            <Text html={split} split title={t.title} />
          </Widths>
        </Specs>
        <Specs caps={[stacked]}>
          <Widths caps={t.widths}>
            <Text html={`<p>${t.wraps}</p>${second(t.holds)}`} />
          </Widths>
        </Specs>
      </Entry>
    </Doc>
  )
}
