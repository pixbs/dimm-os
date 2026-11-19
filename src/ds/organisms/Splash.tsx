import type { FormEvent, ReactNode } from 'react'

// The one thing a waiting screen asks: who comes in, or what has happened, in the middle of the screen or at its start.
// What is filled or pressed in it is one popover wide; one that asks for a value is a form.
export function Splash(props: {
  start?: boolean
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  const align = props.start ? 'start' : undefined
  return props.onSubmit ? (
    <form className="splash" data-align={align} noValidate onSubmit={props.onSubmit}>
      {props.children}
    </form>
  ) : (
    <div className="splash" data-align={align}>
      {props.children}
    </div>
  )
}
