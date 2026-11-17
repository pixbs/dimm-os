import { Icon } from '../atoms/Icon'
import { Button } from '../molecules/Button'
import { Link } from '../molecules/Link'
import { Tag } from '../molecules/Tag'
import { Card, type CardProps, Tiles } from '../organisms/Card'
import { Gallery } from '../organisms/Gallery'
import { Items } from '../organisms/List'
import { Stats } from '../organisms/Stats'
import { Table } from '../organisms/Table'
import type { Copy } from './copy/en'
import { Doc, Entry, Pane, Specs, Stage, u, width, Widths } from './parts'

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

  // A card as wide as a compact window's column, on the window's surface.
  const card = (props: CardProps) => (
    <div className="cq" style={{ width: u(43) }}>
      <Stage flush>
        <Card {...props} />
      </Stage>
    </div>
  )
  const linked: CardProps = {
    href: '#',
    media: { label: <Tag>16:9</Tag> },
    meta: [<Tag key="tag">{t.label}</Tag>, t.meta],
    title: t.item,
    text: t.about,
    foot: (
      <>
        <span className="t-mono c-muted">{t.meta}</span>
        <Icon name="arrow-right" size="s" />
      </>
    ),
  }
  const onward = (
    <Link href="#">
      {t.link}
      <Icon name="arrow-right" size="s" />
    </Link>
  )
  const actions = [
    { href: '#', label: t.label },
    { href: '#', label: t.label, download: true },
  ]
  const tiles = (
    <Tiles
      columns={2}
      items={[
        {
          surface: 'paper',
          title: t.item,
          media: { label: <Tag>{t.media}</Tag> },
        },
        { surface: 'orange', title: t.statement, actions },
      ]}
    />
  )

  // Two items of a window, the first open to its preview.
  const previewed = ['a', 'b'].map((key, at) => ({
    key,
    name: t.item,
    caption: t.text,
    title: at ? t.next : t.says,
    text: [t.more],
    preview: {
      media: { label: <Tag>16:9</Tag> },
      text: t.sentence,
      facts: [t.label, t.label].map((label) => ({ label, value: t.value })),
      action: { href: '#', label: t.label },
    },
  }))

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
      <Entry text={t.preview}>
        <Specs caps={t.previewCaps}>
          <Widths caps={widths}>
            <div className="stage">
              <Items items={previewed} large lead="index" opens />
            </div>
          </Widths>
        </Specs>
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
      <Entry text={t.card}>
        <Specs caps={t.cards.slice(0, 3)}>
          {card(linked)}
          {card({ ...linked, state: 'hover' })}
          {card({ meta: [t.meta], title: t.item, text: t.about, foot: onward })}
        </Specs>
        <Specs caps={t.cards.slice(3, 6)}>
          {card({
            surface: 'paper',
            meta: [t.meta],
            title: t.item,
            text: t.about,
            actions: [
              { href: '#', label: t.label },
              { href: 'https://example.com', label: t.label },
            ],
          })}
          {card({
            surface: 'orange',
            meta: [
              <Tag key="tag" surface="inverted">
                {t.label}
              </Tag>,
            ],
            title: t.item,
            text: t.about,
            foot: <Button end="arrow-right" label={t.label} tone="solid" />,
          })}
          <div className="stack">
            {card({ surface: 'blue', title: t.item, text: t.text })}
            {card({ surface: 'mint', title: t.item, text: t.text })}
          </div>
        </Specs>
        <Specs caps={[t.cards[6]]}>
          <div className="cq" style={{ width: u(90) }}>
            <Stage flush>
              <Card
                foot={onward}
                level="heading"
                media={{ ratio: '4:3', label: <Tag>4:3</Tag> }}
                meta={[t.meta]}
                side
                text={t.about}
                title={t.item}
              />
            </Stage>
          </div>
        </Specs>
      </Entry>
      <Entry text={t.tiles}>
        <Specs caps={t.tileCaps}>
          <Pane height={u(50)} width={u(90)}>
            {tiles}
          </Pane>
          <Pane height={u(65)} width={u(43)}>
            {tiles}
          </Pane>
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
