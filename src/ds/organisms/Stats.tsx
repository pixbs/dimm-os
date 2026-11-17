import { Stat } from '../molecules/Heading'
import { Decipher } from '../motion/Decipher'

// Figures on a hairline each, one to three across as the window allows; a count deciphers as it is first seen.
export function Stats({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="grid stats" data-columns={items.length > 1 ? items.length : undefined}>
      {items.map(({ value, label }, at) => (
        <Stat key={at} label={label} value={<Decipher>{value}</Decipher>} />
      ))}
    </div>
  )
}
