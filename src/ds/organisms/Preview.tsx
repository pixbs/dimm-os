import { ButtonLink } from '../molecules/Button'
import { Media, type MediaProps } from '../molecules/Media'
import { Row } from '../molecules/Row'

// Where its action leads, in the language its words are in where that is not the page's.
type To = { href: string; label: string; lang?: string }

export type PreviewProps = {
  media?: MediaProps
  text?: string | null
  facts?: { label: string; value: string }[]
  action: To
}

// What an item of a list shows as it opens in place, keeping the columns of a split row: one column when compact,
// the facts at the side when regular, and when wide the text, facts and action at the side of the media. Its facts
// put each label above its value, as their column is narrow; its one action is as wide as its column.
export function Preview({ id, label, ...props }: PreviewProps & { id: string; label: string }) {
  const { media, text, facts = [], action } = props

  return (
    <div aria-label={label} className="preview" id={id} role="region">
      {media && (
        <div className="preview__media">
          <Media {...media} />
        </div>
      )}
      {text && <p className="preview__text">{text}</p>}
      {facts.length > 0 && (
        <div className="preview__facts">
          <div className="list">
            {facts.map((fact, at) => (
              <Row above key={at} label={fact.label} value={fact.value} />
            ))}
          </div>
        </div>
      )}
      <div className="preview__action">
        <ButtonLink
          end="arrow-right"
          fill
          href={action.href}
          hrefLang={action.lang}
          label={action.label}
          lang={action.lang}
          tone="solid"
        />
      </div>
    </div>
  )
}
