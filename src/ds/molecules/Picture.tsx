'use client'

import Image, { type StaticImageData } from 'next/image'
import { type ReactNode, useLayoutEffect, useRef } from 'react'

import { swatches } from '../motion/swatches'
import { still, usePainted } from '../motion/vocabulary'

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
    let stop = () => {}
    let seen = false
    let started = false

    // The photo fades in under the closed swatches as they fade out.
    function show() {
      box.dataset.picture = 'shown'
    }

    function resolve() {
      if (started || !seen || !loaded()) return
      started = true
      watcher.disconnect()
      if (still()) return show()
      const pitch = parseFloat(getComputedStyle(box).getPropertyValue('--pitch'))
      stop = swatches(canvas!, img, pitch, show)
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
      stop()
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
