import type { ReactNode } from 'react'

// Every strip of chrome: menu bar, title bar, toolbar, status bar, taskbar. Its slots are buttons and the parts below.
export function Bar(props: { size?: 'compact'; line?: 'below' | 'above'; children: ReactNode }) {
  return (
    <div className="bar" data-line={props.line} data-size={props.size}>
      {props.children}
    </div>
  )
}

export function BarTitle({ children }: { children: ReactNode }) {
  return <span className="bar__title">{children}</span>
}

// What the system says in a bar, in mono.
export function BarText({ children }: { children: ReactNode }) {
  return <span className="bar__text">{children}</span>
}

export function BarSpace() {
  return <span className="bar__space" />
}

// The handle of a window: the empty part of its title bar, shown as rows of dots on the pitch.
export function BarGrip() {
  return <span className="bar__grip dotted" />
}
