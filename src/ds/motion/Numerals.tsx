'use client'

import { useEffect, useState } from 'react'

import type { Picture } from './engine'
import { Liquid } from './Liquid'
import mask from './numerals.png'

type Ink = { width: number; height: number; alpha: Uint8ClampedArray }

// The ink of the numerals, read once from their tone picture.
let read: Promise<Ink> | undefined
function ink() {
  read ??= new Promise((done, fail) => {
    const img = new Image()
    img.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = img
      const canvas = Object.assign(document.createElement('canvas'), { width, height })
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      context.drawImage(img, 0, 0)
      const { data } = context.getImageData(0, 0, width, height)
      done({ width, height, alpha: data.filter((_, at) => at % 4 === 3) })
    }
    img.onerror = fail
    img.src = mask.src
  })
  return read
}

// As many dots across as the width holds, so the numerals keep their size at every pitch; every cell holds as much ink
// as the tone picture has under it.
function grid({ width, height, alpha }: Ink, step: number, across: number): Picture {
  const cols = Math.floor(across / step)
  const rows = Math.round((cols * height) / width)
  const sx = width / cols
  const sy = height / rows
  const cover = new Uint8Array(cols * rows)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor(col * sx)
      const y0 = Math.floor(row * sy)
      const x1 = Math.max(x0 + 1, Math.floor((col + 1) * sx))
      const y1 = Math.max(y0 + 1, Math.floor((row + 1) * sy))
      let sum = 0
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) sum += alpha[y * width + x]
      const share = sum / ((x1 - x0) * (y1 - y0)) / 255
      cover[row * cols + col] = share < 0.04 ? 0 : Math.round(Math.sqrt(share) * 100)
    }
  }
  return { step, cols, rows, cover }
}

// The numerals of a lost page, liquid in dots: drawn once their ink is read.
export default function Numerals() {
  const [picture, setPicture] = useState<(pitch: number, width: number) => Picture>()

  useEffect(() => {
    let gone = false
    ink().then(
      (read) =>
        gone || setPicture(() => (pitch: number, width: number) => grid(read, pitch, width)),
      () => {},
    )
    return () => {
      gone = true
    }
  }, [])

  return picture ? <Liquid picture={picture} /> : null
}
