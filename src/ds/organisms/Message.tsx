import type { IconName } from '../atoms/Icon'
import { Button } from '../molecules/Button'
import { Heading } from '../molecules/Heading'

// What a window shows where there is nothing else to show, and the one thing to do about it, which may say where it
// leads at its end.
export function Message(props: {
  eyebrow?: string
  title?: string
  text: string
  action?: { label: string; onClick: () => void; end?: IconName } | null
}) {
  const { action } = props

  return (
    <div className="message">
      <Heading
        eyebrow={props.eyebrow}
        level={props.title ? 'title' : 'heading'}
        text={props.text}
        title={props.title}
      />
      {action && <Button {...action} tone="outline" />}
    </div>
  )
}
