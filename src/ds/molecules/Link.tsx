import type { AnchorHTMLAttributes } from 'react'

import { Icon } from '../atoms/Icon'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { state?: 'hover' | 'pressed' | 'focus' }

// Underlined text in the size and colour around it; a link that leaves the site says so with an arrow.
export function Link({ state, children, ...rest }: Props) {
  return (
    <a {...rest} className="link" data-state={state}>
      {children}
      {/^https?:/.test(rest.href ?? '') && <Icon name="arrow-up-right" size="s" />}
    </a>
  )
}
