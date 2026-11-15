import type { Named } from '@/i18n/keys'

// A name that differs by device: both are in the page, and the device's shows.
export function ForDevice({ text }: { text: Named }) {
  if (typeof text === 'string') return text

  return (
    <>
      <span data-device="apple">{text.apple}</span>
      <span data-device="other">{text.other}</span>
    </>
  )
}

export function Key({ name }: { name: Named }) {
  return (
    <kbd className="kbd">
      <ForDevice text={name} />
    </kbd>
  )
}

export function Keys({ names }: { names: Named[] }) {
  return (
    <span className="keys">
      {names.map((name, index) => (
        <Key key={index} name={name} />
      ))}
    </span>
  )
}
