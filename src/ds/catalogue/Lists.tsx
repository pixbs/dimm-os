import { Tag } from '../molecules/Tag'
import { Gallery } from '../organisms/Gallery'
import { Items } from '../organisms/List'
import { Stats } from '../organisms/Stats'
import { Table } from '../organisms/Table'
import type { Copy } from './copy/en'
import { Doc, Entry, Specs, Stage, width, Widths } from './parts'

export function Lists({ t, widths }: { t: Copy['lists']; widths: string[] }) {
  const [three, two, columns3, columns2, figures] = t.caps
  const rows = (count: number) =>
    [t.cell, t.wraps, t.cell].map((first) => [first, ...Array(count - 1).fill(t.cell)])
  const empty = (ratio: string) => ({ label: <Tag>{ratio}</Tag>, caption: t.caption })
  const thrice = <T,>(item: (at: number) => T) => [0, 1, 2].map(item)
  const link = { href: '#' }
  const lists = [
    <Items items={thrice(() => ({ title: t.item, href: '#' }))} key="links" />,
    <Items
      foot={{ href: '/', label: t.all }}
      items={thrice(() => ({ title: t.item, text: [t.about], end: t.meta, ...link }))}
      key="foot"
      lead="index"
    />,
    <Items
      items={thrice(() => ({ title: t.item, end: t.meta, ...link }))}
      key="heading"
      large
      lead="index"
    />,
    <div key="leads">
      <Items items={thrice(() => ({ title: t.item, icon: 'folder' as const }))} lead="icon" />
      <Items
        items={thrice(() => ({ title: t.item, text: [t.about], picture: null, ...link }))}
        lead="picture"
      />
    </div>,
    <Items
      items={[9, 7, 11].map((on) => ({
        title: t.item,
        text: [t.about],
        meter: { on, of: 12, label: t.share },
      }))}
      key="meter"
      lead="index"
    />,
    <Items
      head={{ title: t.group, end: t.end }}
      items={thrice(() => ({ name: t.name, caption: t.about, title: t.about, end: t.meta }))}
      key="headed"
    />,
    <Items items={thrice(() => ({ title: t.item, text: [t.about] }))} key="opens" opens />,
    <Items empty={t.empty} items={[]} key="empty" />,
  ]

  return (
    <Doc text={t.doc}>
      <Entry text={t.list}>
        {lists.map((list, at) => (
          // A headed list holds three columns, so it has the room of the widest specimen.
          <Specs caps={[t.lists[at]]} key={at}>
            <Stage width={at === 5 ? width.wide : width.measure}>{list}</Stage>
          </Specs>
        ))}
      </Entry>
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
