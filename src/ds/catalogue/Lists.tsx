import { Tag } from '../molecules/Tag'
import { Gallery } from '../organisms/Gallery'
import type { Copy } from './copy/en'
import { Doc, Entry, Specs, Widths } from './parts'

export function Lists({ t, widths }: { t: Copy['lists']; widths: string[] }) {
  const [three, two] = t.caps
  const empty = (ratio: string) => ({ label: <Tag>{ratio}</Tag>, caption: t.caption })

  return (
    <Doc text={t.doc}>
      <Entry text={t.gallery}>
        <Specs caps={[three]}>
          <Widths caps={widths}>
            <div className="stage">
              <Gallery columns={3} items={[1, 2, 3].map(() => empty('4:3'))} ratio="4:3" />
            </div>
          </Widths>
        </Specs>
        <Specs caps={[two]}>
          <Widths caps={widths}>
            <div className="stage">
              <Gallery columns={2} items={[1, 2].map(() => empty('1:1'))} ratio="1:1" />
            </div>
          </Widths>
        </Specs>
      </Entry>
    </Doc>
  )
}
