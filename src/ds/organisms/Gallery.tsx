import { Media, type MediaProps } from '../molecules/Media'

// Media in a grid, one ratio for all, each with its caption; the window's width decides how many stand across.
export function Gallery(props: {
  columns: 1 | 2 | 3
  ratio: NonNullable<MediaProps['ratio']>
  items: Omit<MediaProps, 'ratio'>[]
}) {
  return (
    <div className="grid" data-columns={props.columns === 1 ? undefined : props.columns}>
      {props.items.map((item, at) => (
        <Media key={at} ratio={props.ratio} {...item} />
      ))}
    </div>
  )
}
