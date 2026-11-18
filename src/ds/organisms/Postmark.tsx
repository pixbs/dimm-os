'use client'

import { useEffect, useId, useRef } from 'react'

import { pour } from '../motion/liquid'
import { duration } from '../motion/vocabulary'

// The drawing's own space: two rings around one centre, and the waves of a cancel running off beside them.
const WIDTH = 576
const HEIGHT = 240
const CENTRE = 120
const waves = [76, 98, 120, 142, 164].map((y) => `M248 ${y}q20-14 40 0${'t40 0'.repeat(7)}`)

// Where the dots of the rings and waves stand in the ink: one every pitch along each line, and a ring shares its length
// evenly, since it closes on itself. The drawing is laid in the ink as it slices it.
function beads(svg: SVGSVGElement, pitch: number, width: number, height: number) {
  const scale = Math.max(width / WIDTH, height / HEIGHT)
  const top = (height - HEIGHT * scale) / 2
  const edge = pitch * 0.36 + 0.6
  const points: [number, number][] = []
  for (const line of svg.querySelectorAll<SVGGeometryElement>('.dotring')) {
    const length = line.getTotalLength() * scale
    const ring = line instanceof SVGCircleElement
    const count = ring ? Math.max(1, Math.round(length / pitch)) : Math.floor(length / pitch) + 1
    const gap = ring ? length / count : pitch
    for (let at = 0; at < count; at++) {
      const point = line.getPointAtLength((at * gap) / scale)
      const x = point.x * scale
      const y = point.y * scale + top
      if (x < edge || y < edge || x > width - edge || y > height - edge) continue
      points.push([x / pitch - 0.5, y / pitch - 0.5])
    }
  }
  return {
    step: pitch,
    cols: Math.ceil(width / pitch) + 1,
    rows: Math.ceil(height / pitch) + 1,
    points,
    centre: [CENTRE * scale, CENTRE * scale + top].map((at) => at / pitch - 0.5) as [
      number,
      number,
    ],
  }
}

// What a sent message is stamped with. The words and the date are text; the rings and waves are dots on the pitch, which
// the dot engine takes over so the pointer can push them off their lines. It lands with one move, a little turned, and
// its dots splash as it does. Until the engine holds them, the drawn rings are its still.
export function Postmark(props: {
  // Without one it is the live picture of a media document, which its still names.
  label?: string
  words?: string
  date?: { day: string; year: string }
}) {
  const ink = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    const box = ink.current!
    const svg = box.querySelector<SVGSVGElement>('.postmark__dots')!
    const canvas = box.querySelector('canvas')!
    let poured = ''
    let drain: ReturnType<typeof pour> | undefined
    let first = true
    let timer = 0

    function fill() {
      const pitch = parseFloat(getComputedStyle(box).getPropertyValue('--pitch'))
      const { clientWidth: width, clientHeight: height } = box
      if (!width || !height || poured === `${pitch} ${width} ${height}`) return
      poured = `${pitch} ${width} ${height}`
      drain?.()
      const { centre, ...picture } = beads(svg, pitch, width, height)
      drain = pour(canvas, picture)
      box.dataset.poured = ''
      if (first) timer = window.setTimeout(() => drain?.splash(...centre), duration('slow') * 1000)
      first = false
    }

    const sized = new ResizeObserver(fill)
    sized.observe(box)
    const set = new MutationObserver(fill)
    set.observe(document.documentElement, { attributeFilter: ['data-pitch'], subtree: true })

    return () => {
      clearTimeout(timer)
      sized.disconnect()
      set.disconnect()
      drain?.()
    }
  }, [])

  return (
    <div
      aria-hidden={props.label ? undefined : true}
      aria-label={props.label}
      className="postmark"
      role={props.label ? 'img' : undefined}
    >
      <div className="postmark__ink" ref={ink}>
        <svg
          aria-hidden
          className="postmark__dots"
          preserveAspectRatio="xMinYMid slice"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        >
          <circle className="dotring" cx={CENTRE} cy={CENTRE} r="114.6" />
          <circle className="dotring" cx={CENTRE} cy={CENTRE} r="70" />
          {waves.map((d) => (
            <path className="dotring" d={d} key={d} />
          ))}
        </svg>
        <canvas aria-hidden className="liquid postmark__liquid" />
        {props.words && (
          <svg aria-hidden className="postmark__words" viewBox={`0 0 ${HEIGHT} ${HEIGHT}`}>
            <defs>
              <path d="M28 120a92 92 0 1 1 184 0a92 92 0 1 1-184 0" id={id} />
            </defs>
            <text className="postmark__around">
              <textPath href={`#${id}`} lengthAdjust="spacing" textLength="572">
                {`${props.words} · ${props.words} ·`}
              </textPath>
            </text>
          </svg>
        )}
        {props.date && (
          <div aria-hidden className="postmark__date">
            <span className="postmark__day">{props.date.day}</span>
            <span className="postmark__year">{props.date.year}</span>
          </div>
        )}
      </div>
    </div>
  )
}
