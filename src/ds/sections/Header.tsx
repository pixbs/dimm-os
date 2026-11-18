import { ButtonLink } from '../molecules/Button'
import { Heading } from '../molecules/Heading'
import { RecordHead } from '../organisms/Record'
import { Section, type Surface } from './Section'

type Action = { href: string; label: string; lang?: string; download?: boolean }

// Opens a window as the title of its page, or at the heading level on an accent closes it as a call to action. On
// paper it is the head of the record: the stamp line over it, the heavy rule under it.
export function Header(props: {
  level: 'display' | 'title' | 'heading'
  title: string
  text?: string | null
  actions?: Action[]
  surface?: Surface
  page?: boolean
  record?: { stamp?: { code: string; note?: string } }
}) {
  const { actions = [], record } = props
  const heading = (
    <Heading level={props.level} page={props.page} text={props.text} title={props.title} />
  )

  return (
    <Section surface={props.surface}>
      {record ? <RecordHead stamp={record.stamp}>{heading}</RecordHead> : heading}
      {actions.length > 0 && (
        <div className="actions">
          {actions.map(({ href, label, lang, download }, at) => (
            <ButtonLink
              download={download}
              end={at === 0 ? 'arrow-right' : undefined}
              href={href}
              hrefLang={lang}
              key={at}
              label={label}
              lang={lang}
              tone={at === 0 ? 'solid' : 'outline'}
            />
          ))}
        </div>
      )}
    </Section>
  )
}
