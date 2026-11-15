import { Fragment } from 'react'

import { Decipher } from '../motion/Decipher'

// Where a window is, in mono; a segment deciphers when it changes, and the last is in the text colour.
export function Path({ segments }: { segments: string[] }) {
  return (
    <p className="path">
      {segments.map((segment, at) => (
        <Fragment key={at}>
          {at > 0 && <span>/</span>}
          <span className={at === segments.length - 1 ? 'path__here' : undefined}>
            <Decipher>{segment}</Decipher>
          </span>
        </Fragment>
      ))}
    </p>
  )
}
