import { Tag } from '../molecules/Tag'
import { Gallery } from '../organisms/Gallery'
import { Stats } from '../organisms/Stats'
import { Table } from '../organisms/Table'
import type { Copy } from './copy/en'
import { Doc, Entry, Specs, Widths } from './parts'

export function Lists({ t, widths }: { t: Copy['lists']; widths: string[] }) {
  const [three, two, columns3, columns2, figures] = t.caps
  const rows = (count: number) =>
    [t.cell, t.wraps, t.cell].map((first) => [first, ...Array(count - 1).fill(t.cell)])
  const empty = (ratio: string) => ({ label: <Tag>{ratio}</Tag>, caption: t.caption })

  return (
    <Doc text={t.doc}>
      <Entry text={t.table}>
        <Specs caps={[columns3]}>
          <Widths caps={widths}>
            <div className="stage">
              <Table columns={[t.column, t.column, t.column]} rows={rows(3)} />
            </div>
          </Widths>
        </Specs>
        <Specs caps={[columns2]}>
          <Widths caps={widths}>
            <div className="stage">
              <Table columns={[t.column, t.column]} rows={rows(2)} />
            </div>
          </Widths>
        </Specs>
      </Entry>
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
      <Entry text={t.stats}>
        <Specs caps={[figures]}>
          <Widths caps={widths}>
            <div className="stage">
              <Stats items={t.figures} />
            </div>
          </Widths>
        </Specs>
      </Entry>
    </Doc>
  )
}
