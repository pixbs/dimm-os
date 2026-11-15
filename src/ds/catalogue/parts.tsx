import type { ReactNode } from 'react'

// A size of the catalogue's own layout, in steps of 8.
export const u = (steps: number) => `calc(var(--s-2) * ${steps})`

// The columns of a table: a number is a width in steps of 8, a share takes what is left.
const tracks = (columns: string) =>
  columns
    .split(' ')
    .map((column) => (column.endsWith('fr') ? `minmax(0, ${column})` : u(Number(column))))
    .join(' ')

export function Doc({ text, children }: { text: string[]; children: ReactNode }) {
  return (
    <>
      <header className="doc__head">
        <h1 className="doc__title">{text[0]}</h1>
        <p className="doc__intro">{text[1]}</p>
      </header>
      {children}
    </>
  )
}

// An entry is told as its name, its properties ("name: values", one after another) and a note.
export function Entry({ text, children }: { text: string[]; children: ReactNode }) {
  const [name, props, note] = text

  return (
    <section className="entry">
      <div>
        <h2 className="entry__name">{name}</h2>
        {props && (
          <ul className="entry__props">
            {props.split(' | ').map((prop) => (
              <li key={prop}>
                <b>{prop.split(': ')[0]}</b> {prop.split(': ').slice(1).join(': ')}
              </li>
            ))}
          </ul>
        )}
        {note && <p className="entry__note">{note}</p>}
      </div>
      <div className="specs">{children}</div>
    </section>
  )
}

export function Cap({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cap">
      <p className="cap__label">{label}</p>
      {children}
    </div>
  )
}

// Rows of plain cells; each column takes the class at its place.
export function Table(props: {
  columns: string
  head?: string[]
  rows?: string[][]
  classes?: string[]
  children?: ReactNode
}) {
  return (
    <div className="dl" style={{ gridTemplateColumns: tracks(props.columns) }}>
      {props.head?.map((cell, index) => (
        <p className="dl__h" key={index}>
          {cell}
        </p>
      ))}
      {props.rows?.flat().map((cell, index) => (
        <p className={props.classes?.[index % props.rows![0].length]} key={index}>
          {cell}
        </p>
      ))}
      {props.children}
    </div>
  )
}

export function Grid(props: { columns: number; gap?: string; children: ReactNode }) {
  const style = { gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))`, gap: props.gap }

  return (
    <div className="grid" style={style}>
      {props.children}
    </div>
  )
}
