'use client'

import Image, { type StaticImageData } from 'next/image'
import { type ReactNode, useLayoutEffect, useRef } from 'react'

import { type Picture as Dots, pour } from '../motion/liquid'
import { duration, still, usePainted } from '../motion/vocabulary'

export type Source = {
  src: string | StaticImageData
  alt: string
  // The language of its words, where it is not the page's.
  lang?: string
  // How wide it stands at most in its window on a desk, in CSS pixels; in a drawer it spans the screen.
  span: number
  first?: boolean
  // Where the box crops it, as an object position.
  position?: string
  // The upload of a live picture, which stands still until its visual draws over it.
  still?: boolean
}

// The steps a picture resolves through, in pitches: from the coarsest to the dot.
const steps = [4, 2, 1]

const luma = (data: ArrayLike<number>, at: number) =>
  (0.2126 * data[at] + 0.7152 * data[at + 1] + 0.0722 * data[at + 2]) / 255

// The picture as the dot engine reads it at one step: a cell is as full as the picture is light under it, or dark on a light surface.
function sample(img: HTMLImageElement, ink: string, step: number): Dots {
  const { clientWidth: width, clientHeight: height, naturalWidth, naturalHeight } = img
  const cols = Math.ceil(width / step)
  const rows = Math.ceil(height / step)
  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const context = canvas.getContext('2d', { willReadFrequently: true })!

  context.fillStyle = ink
  context.fillRect(0, 0, 1, 1)
  const light = luma(context.getImageData(0, 0, 1, 1).data, 0) > 0.5
  context.clearRect(0, 0, 1, 1)

  // The whole picture is laid in cells as object-fit and object-position lay it in the box, since its natural size counts the chosen density and a source rectangle would not.
  const scale = Math.max(width / naturalWidth, height / naturalHeight)
  const [x, y] = getComputedStyle(img)
    .objectPosition.split(' ')
    .map((at) => parseFloat(at) / 100)
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    img,
    ((width - naturalWidth * scale) * x) / step,
    ((height - naturalHeight * scale) * y) / step,
    (naturalWidth * scale) / step,
    (naturalHeight * scale) / step,
  )
  // Throws for a picture from another origin, which a canvas may not read.
  const { data } = context.getImageData(0, 0, cols, rows)
  const cover = Array.from({ length: cols * rows }, (_, cell) => {
    const tone = light ? luma(data, cell * 4) : 1 - luma(data, cell * 4)
    // A dot grows in area with its tone; past the picture's edge there is none.
    return Math.round(100 * Math.sqrt((tone * data[cell * 4 + 3]) / 255))
  })

  return { step, cols, rows, cover }
}

export function Picture(props: Source & { live?: ReactNode }) {
  const { src, alt, lang, span, first, position, still: standing, live } = props
  const host = useRef<HTMLSpanElement>(null)
  const painted = usePainted()
  const server = useRef(painted)
  // A live picture draws itself once script runs; until then its upload is the still.
  const running = Boolean(live) && !painted

  useLayoutEffect(() => {
    const box = host.current!
    const img = box.querySelector('img')!
    const canvas = box.querySelector('canvas')
    const loaded = () => img.complete && img.naturalWidth > 0
    // The first picture and a live one never wait, and one the server painted that is already drawn stays as it is.
    if (!canvas || (server.current && loaded())) return

    box.dataset.picture = 'wait'
    let timer = 0
    let drain = () => {}
    let seen = false
    let started = false

    // The photo fades in under the last dots, which stop moving and leave after it.
    function show() {
      drain()
      box.dataset.picture = 'shown'
    }

    function resolve() {
      if (started || !seen || !loaded()) return
      started = true
      watcher.disconnect()
      if (still()) return show()

      const pitch = parseFloat(getComputedStyle(box).getPropertyValue('--pitch'))
      const ink = getComputedStyle(canvas!).color
      let pictures: Dots[]
      try {
        pictures = steps.map((times) => sample(img, ink, pitch * times))
      } catch {
        return show()
      }
      // Each step is the coarser dots leaving for the finer, and each holds for its whole time.
      const step = duration('fast-exit') * 1000
      const next = (at: number) => {
        if (at === pictures.length) return show()
        drain()
        drain = pour(canvas!, pictures[at])
        timer = window.setTimeout(next, step, at + 1)
      }
      next(0)
    }

    // It resolves when it is both loaded and on screen, whichever comes last.
    const watcher = new IntersectionObserver(([entry]) => {
      seen = entry.isIntersecting
      resolve()
    })
    watcher.observe(box)
    img.addEventListener('load', resolve)

    return () => {
      started = true
      watcher.disconnect()
      img.removeEventListener('load', resolve)
      clearTimeout(timer)
      drain()
    }
  }, [])

  return (
    <span className="media__picture" data-live={running ? '' : undefined} ref={host}>
      <Image
        alt={alt}
        fetchPriority={first ? 'high' : undefined}
        fill
        lang={lang}
        loading={first ? 'eager' : undefined}
        sizes={`(max-width: 599px) 100vw, ${span}px`}
        src={src}
        style={position ? { objectPosition: position } : undefined}
      />
      {running ? (
        <span className="media__live">{live}</span>
      ) : (
        !first && !live && !standing && <canvas aria-hidden className="media__dots" />
      )}
    </span>
  )
}
