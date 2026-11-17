import { Tag } from '../molecules/Tag'
import { Prose } from '../organisms/Prose'
import { Header } from '../sections/Header'
import { Media } from '../sections/Media'
import { Quote } from '../sections/Quote'
import { Section } from '../sections/Section'
import { Stats } from '../sections/Stats'
import { Text } from '../sections/Text'
import type { Copy } from './copy/en'
import { Doc, Entry, Specs, Widths } from './parts'

type Props = { t: Copy['sections'] }

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
  const [
    surfaces,
    joined,
    display,
    closing,
    splits,
    stacked,
    pictures,
    stack,
    split2,
    paper,
    plain,
  ] = t.caps
  const quotation = { text: t.quotation, name: t.name, role: t.role }
  const empty = (ratio: string, caption?: string) => ({ label: <Tag>{ratio}</Tag>, caption })

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
      <Entry text={t.media}>
        <Specs caps={[pictures]}>
          <Widths caps={t.widths}>
            <Media bleed columns={1} items={[empty('16:9')]} ratio="16:9" />
            <Media
              columns={3}
              items={[1, 2, 3].map(() => empty('4:3', t.caption))}
              ratio="4:3"
              title={t.title}
            />
          </Widths>
        </Specs>
      </Entry>
      <Entry text={t.stats}>
        <Specs caps={[stack]}>
          <Widths caps={t.widths}>
            <Stats items={t.figures} title={t.title} />
          </Widths>
        </Specs>
        <Specs caps={[split2]}>
          <Widths caps={t.widths}>
            <Stats items={t.figures} split title={t.title} />
          </Widths>
        </Specs>
      </Entry>
      <Entry text={t.quote}>
        <Specs caps={[paper]}>
          <Widths caps={t.widths}>
            <Quote {...quotation} surface="paper" />
          </Widths>
        </Specs>
        <Specs caps={[plain]}>
          <Widths caps={t.widths}>
            <Quote {...quotation} />
          </Widths>
        </Specs>
      </Entry>
    </Doc>
  )
}
