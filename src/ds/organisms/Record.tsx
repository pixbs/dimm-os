import { Decipher } from '../motion/Decipher'

// A record opens with its stamp line: the barcode, its code and a note at its end, which decipher as they appear.
export function Stamp({ code, note }: { code: string; note?: string }) {
  return (
    <p className="record__stamp">
      <span className="record__code">
        <span aria-hidden className="barcode" />
        <Decipher>{code}</Decipher>
      </span>
      {note && <Decipher>{note}</Decipher>}
    </p>
  )
}
