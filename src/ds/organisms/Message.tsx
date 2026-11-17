import { Button } from '../molecules/Button'
import { Heading } from '../molecules/Heading'

// What a window shows where there is nothing else to show, and the one thing to do about it.
export function Message(props: {
  text: string
  action?: { label: string; onClick: () => void } | null
}) {
  const { action } = props

  return (
    <div className="message">
      <Heading level="heading" text={props.text} />
      {action && <Button label={action.label} onClick={action.onClick} tone="outline" />}
    </div>
  )
}
