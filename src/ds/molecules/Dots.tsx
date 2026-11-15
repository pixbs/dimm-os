// A row of dots that counts: how many are on, from which dot.
export function Dots(props: { count: number; on: number; from?: number; label: string }) {
  const { count, on, from = 0, label } = props

  return (
    <span aria-label={label} className="dots" role="img">
      {Array.from({ length: count }, (_, at) => (
        <span
          className="dot"
          data-tone={at >= from && at < from + on ? undefined : 'off'}
          key={at}
        />
      ))}
    </span>
  )
}
