'use client'

import type { ReactNode } from 'react'

import type { IconName } from '../atoms/Icon'
import { ButtonGroup, ButtonLink } from '../molecules/Button'
import { Heading } from '../molecules/Heading'
import { Media, type MediaProps } from '../molecules/Media'
import { useArrives } from '../motion/enters'

// Where a button leads, in the language its words are in where that is not the page's; a file downloads.
type To = { href: string; label: string; lang?: string; download?: boolean }

export type CardProps = {
  surface?: 'raised' | 'paper' | 'orange' | 'blue' | 'mint'
  title: string
  text?: string | null
  level?: 'display' | 'title' | 'heading' | 'lead'
  page?: boolean
  under?: boolean
  media?: MediaProps
  // Media beside the text, for a card that has the row to itself.
  side?: boolean
  // One or two items, the first at the start and the last at the end.
  meta?: ReactNode[]
  foot?: ReactNode
  actions?: To[]
  // As a link the whole card is pressed.
  href?: string
  state?: 'hover' | 'pressed' | 'focus'
}

// A button says where it leads: a file downloads, an address leaves the site, a window opens.
const way = ({ href, download }: To): IconName =>
  download ? 'arrow-down' : /^https?:/i.test(href) ? 'arrow-up-right' : 'arrow-right'

// A surface that holds one item, and whatever is on it follows the surface; its actions are flush with its bottom edge.
export function Card(props: CardProps) {
  const { media, meta = [], actions = [], href } = props
  const Root = href ? 'a' : 'div'

  return (
    <Root
      className="card"
      data-layout={props.side ? 'side' : undefined}
      data-media={media ? '' : undefined}
      data-state={props.state}
      data-surface={props.surface ?? 'raised'}
      href={href}
    >
      {media && <Media {...media} />}
      <div className="card__body">
        {meta.length > 0 && (
          <div className="card__meta">
            {meta.map((item, at) => (
              <span key={at}>{item}</span>
            ))}
          </div>
        )}
        <Heading
          level={props.level ?? 'lead'}
          page={props.page}
          text={props.text}
          title={props.title}
          under={props.under}
        />
        {props.foot && <div className="card__foot">{props.foot}</div>}
      </div>
      {/* Two at most, they stay side by side at every width. */}
      {actions.length > 0 && (
        <ButtonGroup cells>
          {actions.map((to, at) => (
            <ButtonLink
              download={to.download}
              end={way(to)}
              href={to.href}
              hrefLang={to.lang}
              key={at}
              label={to.label}
              lang={to.lang}
              tone="outline"
            />
          ))}
        </ButtonGroup>
      )}
    </Root>
  )
}

// Cards in a grid, three across in a wide window, two in a regular one and one in a compact one, that arrive along the
// spread as they are first seen.
export function Cards(props: { columns: 2 | 3; items: CardProps[] }) {
  const grid = useArrives()

  return (
    <div className="grid" data-columns={props.columns} ref={grid}>
      {props.items.map((item, at) => (
        <Card key={at} {...item} />
      ))}
    </div>
  )
}

// Cards that fill their window, one step apart: a tile with media is named at the title level, one without states one
// thing at the display level, and the first such statement holds the title of the page.
export function Tiles(props: { columns: 1 | 2; items: CardProps[]; page?: boolean }) {
  const tiles = useArrives()
  const statement = props.items.findIndex((item) => !item.media)
  const title = props.page ? Math.max(statement, 0) : -1

  return (
    <div className="tiles" data-columns={props.columns === 1 ? 1 : undefined} ref={tiles}>
      {props.items.map((item, at) => (
        <Card key={at} {...item} level={item.media ? 'title' : 'display'} page={at === title} />
      ))}
    </div>
  )
}
