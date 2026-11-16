import type { HeaderView } from '@/blocks/header/view'
import type { TextView } from '@/blocks/text/view'
import { Prose } from '@/ds/organisms/Prose'
import { Header } from '@/ds/sections/Header'
import { Text } from '@/ds/sections/Text'

type Placed = HeaderView | TextView

// The sections of a window in their order: a Header that opens it holds the title of the page, and a joined section
// stands in the body of the one above, under its heading.
export function Sections({ sections }: { sections: Placed[] }) {
  const groups: Placed[][] = []
  for (const section of sections) {
    if (section.type === 'text' && section.join) groups.at(-1)!.push(section)
    else groups.push([section])
  }

  return groups.map(([lead, ...joined], at) =>
    lead.type === 'header' ? (
      <Header key={at} {...lead} page={at === 0} />
    ) : (
      <Text html={lead.html} key={at} split={lead.split} text={lead.text} title={lead.title}>
        {joined.map(
          (part, index) => part.type === 'text' && <Prose html={part.html} key={index} />,
        )}
      </Text>
    ),
  )
}
