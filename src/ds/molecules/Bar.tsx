import type { HTMLAttributes, ReactNode } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & {
  size?: 'compact' | 'chrome'
  line?: 'below' | 'above'
}

// Every strip of chrome: menu bar, title bar, toolbar, status bar, taskbar. Its slots are buttons and the parts below.
export function Bar({ size, line, className, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={className ? `bar ${className}` : 'bar'}
      data-line={line}
      data-size={size}
    />
  )
}

export function BarTitle({ children }: { children: ReactNode }) {
  return <span className="bar__title">{children}</span>
}

// What the system says in a bar, in mono.
export function BarText(props: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className="bar__text" />
}

export function BarSpace() {
  return <span className="bar__space" />
}
