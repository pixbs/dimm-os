import { icons } from './icons'

export type IconName = keyof typeof icons

// Chrome: small where a fine pointer uses it, full where a finger lands.
export function Icon({ name, size }: { name: IconName; size?: 's' | 'chrome' }) {
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
