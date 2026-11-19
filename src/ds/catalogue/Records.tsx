import { Heading } from '../molecules/Heading'
import { ButtonGroup, ButtonLink } from '../molecules/Button'
import { Row } from '../molecules/Row'
import { List } from '../organisms/List'
import { Prose } from '../organisms/Prose'
import { Quote } from '../organisms/Quote'
import { RecordCard, RecordFoot, RecordHead } from '../organisms/Record'
import { SplitView } from '../organisms/SplitView'
import { Table } from '../organisms/Table'
import { Toggle } from '../molecules/Toggle'
import type { Copy } from './copy/en'
import { Forms, Messages, Plates } from './Organisms'
import { Doc, Entry, Specs, u } from './parts'

export function Records({ t, language }: { t: Copy['records']; language: string }) {
  const [everything, bare] = t.caps
  const [before, strong, between, link, and, code, after] = t.paragraph
  const list = (tag: 'ul' | 'ol', items: string[]) =>
    `<${tag}>${items.map((item) => `<li>${item}</li>`).join('')}</${tag}>`
  const html = [
    `<h2>${t.two}</h2>`,
    `<p>${before} <strong>${strong}</strong>${between} <a class="link" href="#">${link}</a> ${and} <code>${code}</code>${after}</p>`,
    `<h3>${t.three}</h3>`,
    `<p>${t.shorter}</p>`,
    list('ul', t.items),
    `<h4>${t.four}</h4>`,
    list('ol', t.numbered),
    `<blockquote>${t.quote}</blockquote>`,
    '<hr />',
    `<p>${t.after}</p>`,
  ].join('')

  const { card } = t
  const head = (
    <RecordHead stamp={{ code: card.code, note: card.note }}>
      <Heading level="heading" title={card.title} />
    </RecordHead>
  )

  const [title, text, column, cell] = t.pane
  const split = (
    <SplitView
      items={['1', '2', '3'].map((key) => ({
        key,
        title,
        text: title,
        end: <Toggle aria-label={title} defaultChecked={key === '1'} kind="switch" />,
        pane: (
          <>
            <Heading level="heading" title={title} />
            <p className="t-body">{text}</p>
            <Table
              columns={[column, column, column]}
              rows={[
                [cell, cell, cell],
                [cell, cell, cell],
              ]}
            />
          </>
        ),
      }))}
      label={title}
    />
  )

  return (
    <Doc text={t.doc}>
      <Entry text={t.split}>
        <Specs caps={t.splitCaps}>
          <div className="cq" style={{ width: u(90) }}>
            <div className="stage" data-surface="window">
              {split}
            </div>
          </div>
          <div className="cq" style={{ width: u(47) }}>
            <div className="stage" data-surface="window">
              {split}
            </div>
          </div>
        </Specs>
      </Entry>
      <Entry text={t.record}>
        <Specs caps={t.recordCaps}>
          <div className="cq" style={{ width: u(47) }}>
            <RecordCard
              foot={
                <ButtonGroup cells>
                  {t.labels.map((label, at) => (
                    <ButtonLink end="arrow-right" href="#" key={at} label={label} tone="outline" />
                  ))}
                </ButtonGroup>
              }
              head={head}
              label={card.title}
              name={card.name}
            >
              <List ruled>
                {t.facts.map(([label, value], at) => (
                  <Row key={at} label={label} value={value} />
                ))}
              </List>
            </RecordCard>
          </div>
          <div className="cq" style={{ width: u(36) }}>
            <RecordCard
              foot={<RecordFoot end={t.index[3]} />}
              head={head}
              label={card.title}
              name={card.name}
            >
              <List head={{ title: t.index[0], end: t.index[1] }} ruled>
                {['01', '02', '03', '04'].map((number, at) => (
                  <Row
                    current={at === 0}
                    href="#"
                    key={number}
                    meta={number}
                    size="compact"
                    title={t.index[2]}
                  />
                ))}
              </List>
            </RecordCard>
          </div>
        </Specs>
      </Entry>
      <Plates t={t} />
      <Entry text={t.prose}>
        <Specs caps={[everything]}>
          <div className="cq" style={{ width: u(90) }}>
            <div className="stage" data-surface="window">
              <Prose html={html} />
            </div>
          </div>
        </Specs>
      </Entry>
      <Entry text={t.quoted}>
        <Specs caps={[bare]}>
          <div className="cq" style={{ width: u(90) }}>
            <div className="stage" data-surface="window">
              <Quote name={t.name} role={t.role} text={t.quotation} />
            </div>
          </div>
        </Specs>
      </Entry>
      <Forms language={language} t={t} />
      <Messages t={t} />
    </Doc>
  )
}
