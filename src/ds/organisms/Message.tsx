import { Heading } from '../molecules/Heading'

// What a window shows where there is nothing else to show.
export function Message({ text }: { text: string }) {
  return (
    <div className="message">
      <Heading level="heading" text={text} />
    </div>
  )
}
