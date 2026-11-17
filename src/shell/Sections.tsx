import type { HeaderView } from '@/blocks/header/view'
import type { MediaView } from '@/blocks/media/view'
import type { TextView } from '@/blocks/text/view'
import { Prose } from '@/ds/organisms/Prose'
import { Header } from '@/ds/sections/Header'
import { Media } from '@/ds/sections/Media'
import { Text } from '@/ds/sections/Text'

type Placed = HeaderView | TextView | MediaView

// A gallery folds to the window's width, one across when compact and two at most when regular, and a picture is asked
// for at the share its column takes.
const across = (columns: number, width: number) =>
  width < 600 ? 1 : width < 960 ? Math.min(columns, 2) : columns

// The sections of a window in their order: a Header that opens it holds the title of the page, and a joined section
// stands in the body of the one above, under its heading.
export function Sections({ sections, width }: { sections: Placed[]; width: number }) {
  const groups: Placed[][] = []
  for (const section of sections) {
    if (section.type === 'text' && section.join) groups.at(-1)!.push(section)
    else groups.push([section])
  }
  // The first picture, when only a Header stands before it, is on screen as the window opens.
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
            span: Math.ceil(width / across(lead.columns, width)),
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
