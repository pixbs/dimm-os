'use client'

import { useId, useState } from 'react'

type Props = {
  // The words above the block, which say which way is on.
  cap: string
  switches: { label: string; on?: boolean }[]
  // What each number does and whether it is on, in an ordered list under the block: [off, on].
  said?: [string, string]
  // The id of the visible label that names it.
  labelledBy: string
}

// Small numbered switches on an accent, up for on, for settings flipped once and then left.
export function Dip(props: Props) {
  const id = useId()
  const [on, setOn] = useState(() => props.switches.map((item) => Boolean(item.on)))

  return (
    <>
      <div aria-labelledby={props.labelledBy} className="dip" data-surface="orange" role="group">
        <span className="dip__cap">{props.cap}</span>
        <span className="dip__row">
          {props.switches.map((item, index) => (
            <label className="dip__sw" key={index}>
              <input
                aria-labelledby={props.said ? `${id}-said-${index}` : undefined}
                checked={on[index]}
                onChange={() => setOn(on.map((was, at) => (at === index ? !was : was)))}
                role="switch"
                type="checkbox"
              />
              <span className="dip__slot" data-surface="inverted">
                <span className="dip__knob" />
              </span>
              {index + 1}
            </label>
          ))}
        </span>
      </div>
      {props.said && (
        <ol className="dip__said">
          {props.switches.map((item, index) => (
            <li id={`${id}-said-${index}`} key={index}>
              {`${index + 1} ${item.label}: ${props.said![Number(on[index])]}.`}
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
