import { Button } from '../molecules/Button'
import { Heading } from '../molecules/Heading'

// What a window shows where there is nothing else to show, and the one thing to do about it.
export function Message(props: {
  title?: string
  text: string
  action?: { label: string; onClick: () => void } | null
}) {
  const { action } = props

  return (
    <div className="message">
      <Heading level={props.title ? 'title' : 'heading'} text={props.text} title={props.title} />
      {action && <Button label={action.label} onClick={action.onClick} tone="outline" />}
    </div>
  )
}
