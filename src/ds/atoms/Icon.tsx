import { icons } from './icons'

export type IconName = keyof typeof icons

export function Icon({ name, size }: { name: IconName; size?: 's' }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      dangerouslySetInnerHTML={{ __html: icons[name] }}
      data-size={size}
      viewBox="0 0 24 24"
    />
  )
}
