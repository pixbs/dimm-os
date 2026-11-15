import type { CSSProperties } from 'react'

// The digits, five lamps wide and seven high.
const font = [
  ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
]
// Where each digit of a time starts; the colon stands alone in the middle.
const starts = [0, 6, 14, 20]
const colon = 12

// A time such as 16:44 in a display of 25 × 7 round lamps on the pitch: lit, dark, or none between the digits.
export function Lamps({ time }: { time: string }) {
  // An hour of one digit is read with a leading zero, and what is not a digit stays dark.
  const digits = time.replace(':', '').padStart(4, '0')

  return (
    <div aria-label={time} className="lamps" role="img">
      {Array.from({ length: 25 * 7 }, (_, at) => {
        const row = Math.floor(at / 25)
        const col = at % 25
        const digit = starts.findIndex((start) => col >= start && col < start + 5)
        const lamp =
          digit >= 0
            ? font[Number(digits[digit])]?.[row][col - starts[digit]] === '1'
              ? 'on'
              : undefined
            : col === colon && (row === 2 || row === 4)
              ? 'on'
              : 'none'

        return <i data-lamp={lamp} key={at} style={{ '--col': col } as CSSProperties} />
      })}
    </div>
  )
}
