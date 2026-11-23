import type { CSSProperties } from 'react'

import { tokens } from '../atoms/tokens'
import { dots } from './filters'
import { passage } from './passage'
import { grid, SEED, seeded } from './tones'

// The desk a card shows, and how many times larger it is drawn, so a card shown small still reads.
const DESK = { width: 600, height: 315 }
const SCALE = 2
export const size = { width: DESK.width * SCALE, height: DESK.height * SCALE }

// The moment of the wallpaper every card shows, in ticks of its scene.
const MOMENT = 40

const column: CSSProperties = { display: 'flex', flexDirection: 'column' }
// A text that ends in an ellipsis where it is cut.
const lines = (most: number): CSSProperties => ({
  display: 'block',
  lineClamp: most,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

// Passage in dots with colour, as the wallpaper engine draws it on a desk of this size.
function wallpaper(t: ReturnType<typeof tokens>) {
  const inks = ['--paper-1', '--orange', '--blue', '--mint'].map(t.value)
  const tones = grid(DESK.width, DESK.height, t.px('--pitch') / SCALE)
  const scene = passage(tones, DESK.width, DESK.height, seeded(SEED))
  for (let tick = 0; tick < MOMENT; tick++) scene.step(null, false)
  scene.paint(true)
  return (
    <svg
      {...size}
      style={{ position: 'absolute', opacity: parseFloat(t.value('--a-wallpaper-colour')) / 100 }}
      viewBox={`0 0 ${DESK.width} ${DESK.height}`}
    >
      {dots(tones).map(([cx, cy, r, ink], at) => (
        <circle cx={cx} cy={cy} fill={inks[ink]} key={at} r={r} />
      ))}
    </svg>
  )
}

export type Shown = {
  title: string
  text: string | null
  // A window shows its picture, as an address with where its focal point lies, or else its words; the desk has none.
  window?: { headline: string; paper: boolean; picture: { src: string; at: string } | null }
}

// The picture a shared link shows: the desk in the dark theme with the default wallpaper, and on it one window at
// rest, or for the desk itself the site's words. No stylesheet reaches it, so it reads the tokens.
export function ShareCard({ title, text, window }: Shown) {
  const t = tokens(SCALE)
  const edge = t.px('--s-6')
  const [bg, fg] = window?.paper ? ['--paper-1', '--ink-1'] : ['--ink-2', '--paper-1']
  const muted = t.at(fg, '--a-muted')
  const line = t.at(fg, '--a-line')
  const dot = t.px('--s-3')
  const heading = t.type('--f-heading', '--k-2')
  const words = [
    <div key="title" style={{ ...(window ? heading : t.type('--f-title', '--k-2')), ...lines(2) }}>
      {window?.headline ?? title}
    </div>,
    text && (
      <div
        key="text"
        style={{
          ...(window ? t.type('--f-body') : t.type('--f-lead', '--k-1')),
          ...lines(3),
          color: muted,
        }}
      >
        {text}
      </div>
    ),
  ]

  return (
    <div
      style={{
        ...size,
        display: 'flex',
        backgroundColor: t.value('--ink-1'),
        color: t.value(fg),
        fontFamily: 'sans',
      }}
    >
      {wallpaper(t)}
      {window ? (
        <div
          style={{
            ...column,
            flex: 1,
            margin: edge,
            backgroundColor: t.value(bg),
            // Its shadow is the ground's own colour in the dark theme, and a card's renderer draws its blur as a
            // lighter slab, so the window keeps its ring alone.
            boxShadow: `0 0 0 ${t.value('--b-1')} ${line}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: t.px('--s-1'),
              height: t.px('--h-compact'),
              padding: `0 ${t.value('--s-1')}`,
              borderBottom: window.paper
                ? `${t.value('--b-2')} solid ${t.value(fg)}`
                : `${t.value('--b-1')} solid ${line}`,
            }}
          >
            <div
              style={{ display: 'flex', padding: `0 ${t.value('--s-1')} 0 ${t.value('--s-2')}` }}
            >
              {['close', 'minimise', 'fullScreen'].map((control) => (
                <div
                  key={control}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: t.px('--s-4') + t.px('--s-1'),
                  }}
                >
                  <div
                    style={{
                      width: dot,
                      height: dot,
                      borderRadius: t.px('--r-full'),
                      backgroundColor: t.value(fg),
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ ...t.type('--f-mono'), padding: `0 ${t.value('--s-3')}` }}>{title}</div>
          </div>
          {window.picture ? (
            // eslint-disable-next-line @next/next/no-img-element -- drawn into a picture, where no browser loads it
            <img
              alt=""
              src={window.picture.src}
              style={{ objectFit: 'cover', objectPosition: window.picture.at }}
              width={size.width - edge * 2}
              height={size.height - edge * 2 - t.px('--h-compact')}
            />
          ) : (
            <div style={{ ...column, gap: t.px('--s-2'), padding: edge }}>{words}</div>
          )}
        </div>
      ) : (
        <div
          style={{
            ...column,
            flex: 1,
            justifyContent: 'flex-end',
            gap: t.px('--s-4'),
            padding: edge,
          }}
        >
          {words}
        </div>
      )}
    </div>
  )
}
