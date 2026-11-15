'use client'

import { useEffect, useRef } from 'react'

import { type Picture, pour } from './liquid'

// A picture of the dot engine, as wide as what holds it: it is poured again when the dot or that width changes.
export function Liquid({ picture }: { picture: (pitch: number, width: number) => Picture }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const host = canvas.current!.parentElement!
    let poured = ''
    let drain = () => {}

    function fill() {
      const pitch = parseFloat(getComputedStyle(host).getPropertyValue('--pitch'))
      const width = host.clientWidth
      if (poured === `${pitch} ${width}`) return
      poured = `${pitch} ${width}`
      drain()
      drain = pour(canvas.current!, picture(pitch, width))
    }

    const sized = new ResizeObserver(fill)
    sized.observe(host)
    const set = new MutationObserver(fill)
    set.observe(document.documentElement, { attributeFilter: ['data-pitch'] })

    return () => {
      sized.disconnect()
      set.disconnect()
      drain()
    }
  }, [picture])

  return <canvas aria-hidden className="liquid" ref={canvas} />
}
