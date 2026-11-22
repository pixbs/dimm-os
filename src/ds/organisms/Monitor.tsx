'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useEffect, useState } from 'react'

import { duration } from '../motion/vocabulary'
import { Wallpaper } from './Wallpaper'

// A small copy of the screen with the settings in force: the wallpaper live, the window that opens at start, and the
// boot playing once each time `boot` counts up.
export function Monitor({ boot }: { boot: number }) {
  // The count of boots that have played out: one more is playing.
  const [played, setPlayed] = useState(boot)

  useEffect(() => {
    const timer = setTimeout(() => setPlayed(boot), duration('long') * 1000)
    return () => clearTimeout(timer)
  }, [boot])

  return (
    <div aria-hidden className="monitor" data-surface="desktop">
      <Wallpaper copy />
      <span className="monitor__apps">
        {(['orange', 'blue', 'mint', 'paper'] as const).map((surface) => (
          <span className="mark" data-surface={surface} key={surface} />
        ))}
      </span>
      <span className="monitor__win" data-surface="window">
        <span data-surface="paper" />
        <span data-surface="orange" />
      </span>
      <span className="monitor__task" />
      <span className="monitor__bar">
        <span className="mark" data-surface="orange" />
      </span>
      <AnimatePresence>
        {boot > played && (
          <m.span
            className="monitor__boot"
            animate={{ opacity: 1, transition: { duration: duration('fast') } }}
            data-surface="desktop"
            initial={{ opacity: 0 }}
            exit={{ opacity: 0, transition: { duration: duration('slow-exit') } }}
          >
            <span className="mark" data-surface="orange" />
          </m.span>
        )}
      </AnimatePresence>
    </div>
  )
}
