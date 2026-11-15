type Props = {
  name: string
  options: string[]
  // The position in force.
  at: number
  fill?: boolean
  // The id of the visible label that names it.
  labelledBy: string
}

// A choice of two to five that always has a value: its block slides to the position in force.
export function Slide(props: Props) {
  return (
    <div
      aria-labelledby={props.labelledBy}
      className="slide"
      data-positions={props.options.length}
      data-width={props.fill ? 'fill' : undefined}
      role="radiogroup"
    >
      <span className="slide__block" data-surface="inverted" />
      {props.options.map((option, index) => (
        <label className="slide__pos" key={index}>
          <input
            defaultChecked={index === props.at}
            name={props.name}
            type="radio"
            value={option}
          />
          {option}
        </label>
      ))}
    </div>
  )
}
