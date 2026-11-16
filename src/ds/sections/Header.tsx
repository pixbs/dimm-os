import { ButtonLink } from '../molecules/Button'
import { Heading } from '../molecules/Heading'
import { Section, type Surface } from './Section'

type Action = { href: string; label: string; lang?: string; download?: boolean }

// Opens a window as the title of its page, or at the heading level on an accent closes it as a call to action.
export function Header(props: {
  level: 'display' | 'title' | 'heading'
  title: string
  text?: string | null
  actions?: Action[]
  surface?: Surface
  page?: boolean
}) {
  const { actions = [] } = props

  return (
    <Section surface={props.surface}>
      <Heading level={props.level} page={props.page} text={props.text} title={props.title} />
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
