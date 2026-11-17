import type { HeaderView } from '@/blocks/header/view'
import type { MediaView } from '@/blocks/media/view'
import type { TextView } from '@/blocks/text/view'
import { Prose } from '@/ds/organisms/Prose'
import { Header } from '@/ds/sections/Header'
import { Media } from '@/ds/sections/Media'
import { Text } from '@/ds/sections/Text'

type Placed = HeaderView | TextView | MediaView

// The sections of a window in their order: a Header that opens it holds the title of the page, and a joined section
// stands in the body of the one above, under its heading. A picture is asked for at the share of the window's width
// its column takes, and the first, when only a Header stands before it, is on screen as the window opens.
export function Sections({ sections, width }: { sections: Placed[]; width: number }) {
  const groups: Placed[][] = []
  for (const section of sections) {
    if (section.type === 'text' && section.join) groups.at(-1)!.push(section)
    else groups.push([section])
  }
  const first = sections.find((section) => section.type !== 'header')

  return groups.map(([lead, ...joined], at) =>
    lead.type === 'header' ? (
      <Header key={at} {...lead} page={at === 0} />
    ) : lead.type === 'media' ? (
      <Media
        bleed={lead.bleed}
        columns={lead.columns}
        items={lead.items.map(({ src, alt, caption, position, live }, index) => ({
          caption,
          picture: {
            src,
            alt,
            position,
            span: Math.ceil(width / lead.columns),
            first: lead === first && index === 0,
            still: Boolean(live),
          },
        }))}
        key={at}
        ratio={lead.ratio}
        text={lead.text}
        title={lead.title}
      />
    ) : (
      <Text html={lead.html} key={at} split={lead.split} text={lead.text} title={lead.title}>
        {joined.map(
          (part, index) => part.type === 'text' && <Prose html={part.html} key={index} />,
        )}
      </Text>
    ),
  )
}
