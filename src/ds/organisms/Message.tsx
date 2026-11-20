import type { ComponentProps } from 'react'

import type { IconName } from '../atoms/Icon'
import { Button, ButtonLink } from '../molecules/Button'
import { Heading } from '../molecules/Heading'

// A button, or a link to a window or a file, in the tone its caller names; without one it is a ghost.
type Action = {
  label: string
  tone?: ComponentProps<typeof Button>['tone']
  end?: IconName
} & ({ onClick: () => void } | { href: string; lang?: string; download?: boolean })

// What a window shows where there is nothing else to show, and the few things to do about it, each of which may say
// where it leads at its end.
export function Message(props: {
  eyebrow?: string
  title?: string
  text?: string
  // A message behind a plate speaks at the size of the plate's own title.
  level?: 'display'
  actions?: Action[]
}) {
  const { eyebrow, title, text, actions = [] } = props

  return (
    <div className="message">
      {(eyebrow || title || text) && (
        <Heading
          eyebrow={eyebrow}
          level={props.level ?? (title ? 'title' : 'heading')}
          text={text}
          title={title}
        />
      )}
      {actions.length > 0 && (
        <div className="actions">
          {actions.map((action, at) =>
            'onClick' in action ? (
              <Button key={at} {...action} />
            ) : (
              <ButtonLink key={at} {...action} hrefLang={action.lang} />
            ),
          )}
        </div>
      )}
    </div>
  )
}
