import { Fragment } from 'react'

import type { Copy } from './copy/en'
import { Cap, Doc, Entry, Table, u } from './parts'

const steps = [1, 2, 3, 4, 6, 8, 12]
const plate = { width: u(24), height: u(12) }
const outline = '0 0 0 var(--b-1) var(--line)'
const text = ['t-medium', 't-mono c-muted', 'c-muted']

export function Space({ t }: { t: Copy['space'] }) {
  return (
    <Doc text={t.doc}>
      <Entry text={t.space}>
        <Table columns="6 8 8 1fr">
          {steps.map((step, index) => (
            <Fragment key={step}>
              <p className="t-mono c-muted">{step * 4}</p>
              <p className="t-mono c-muted">{`s-${step}`}</p>
              <div>
                <span className="measure" style={{ width: `var(--s-${step})` }} />
              </div>
              <p className="c-muted">{t.spaceUses[index]}</p>
            </Fragment>
          ))}
        </Table>
      </Entry>
      <Entry text={t.size}>
        <div className="spec">
          {(['regular', 'compact'] as const).map((size, index) => (
            <Cap key={size} label={t.sizeCaps[index]}>
              <div
                className={index ? 'box t-small' : 'box'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: u(24),
                  height: `var(--h-${size})`,
                  padding: `0 var(--s-${index ? 3 : 4})`,
                }}
              >
                {index ? 32 : 48}
              </div>
            </Cap>
          ))}
          {['m', 's'].map((glyph, index) => (
            <Cap key={glyph} label={t.sizeCaps[index + 2]}>
              <div
                className="box"
                style={{ width: `var(--g-${glyph})`, height: `var(--g-${glyph})` }}
              />
            </Cap>
          ))}
          <Cap label={t.sizeCaps[4]}>
            <span className="dot" />
          </Cap>
        </div>
      </Entry>
      <Entry text={t.shape}>
        <div className="spec">
          {['var(--r-0)', 'var(--r-full)'].map((borderRadius, index) => (
            <Cap key={borderRadius} label={t.shapeCaps[index]}>
              <div
                className="box"
                style={{ width: u(12), height: 'var(--h-regular)', borderRadius }}
              />
            </Cap>
          ))}
          {[1, 2].map((line) => (
            <Cap key={line} label={t.shapeCaps[line + 1]}>
              <div
                style={{
                  width: u(18),
                  height: 'var(--h-regular)',
                  borderBottom: `var(--b-${line}) solid var(--fg)`,
                }}
              />
            </Cap>
          ))}
        </div>
      </Entry>
      <Entry text={t.depth}>
        <div className="spec" style={{ gap: 'var(--s-12)', paddingBottom: 'var(--s-12)' }}>
          {[
            ['window', outline],
            ['raised', `var(--e-popover), ${outline}`],
            ['window', `var(--e-window), ${outline}`],
          ].map(([surface, boxShadow], index) => (
            <Cap key={boxShadow} label={t.depthCaps[index]}>
              <div data-surface={surface} style={{ ...plate, boxShadow }} />
            </Cap>
          ))}
        </div>
      </Entry>
      <Entry text={t.motion}>
        <Table classes={text} columns="12 16 1fr" rows={t.motionRows} />
      </Entry>
      <Entry text={t.width}>
        <div className="spec" style={{ alignItems: 'flex-end' }}>
          {t.widths.map((name, index) => (
            <div className="mini" key={name} style={{ width: u(15 + index * 12) }}>
              <div className="mini__win">
                {t.widths.slice(0, index + 1).map((column) => (
                  <span key={column} />
                ))}
              </div>
              <p className="cap__label">{name}</p>
            </div>
          ))}
        </div>
        <Table
          classes={['', 'c-muted', 'c-muted', 'c-muted']}
          columns="1.6fr 1fr 1fr 1fr"
          head={t.widthHead}
          rows={t.widthRows}
        />
      </Entry>
      <Entry text={t.fixed}>
        <Table classes={text} columns="12 8 1fr" rows={t.fixedRows} />
      </Entry>
      <Entry text={t.settings}>
        <Table classes={text} columns="25 25 1fr" head={t.settingsHead} rows={t.settingsRows} />
      </Entry>
    </Doc>
  )
}
