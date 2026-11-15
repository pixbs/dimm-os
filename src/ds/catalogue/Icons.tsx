import { Icon, type IconName } from '../atoms/Icon'
import { icons } from '../atoms/icons'
import type { Copy } from './copy/en'
import { Cap, Doc, Entry, Grid, u } from './parts'

const names = Object.keys(icons) as IconName[]
const wide = { gap: 'var(--s-12)' }

export function Icons({ t }: { t: Copy['icons'] }) {
  return (
    <Doc text={t.doc}>
      <Entry text={t.regular}>
        <Grid columns={6} gap="var(--s-2)">
          {names.map((name) => (
            <div className="iconcell" key={name}>
              <Icon name={name} />
              <span className="t-mono c-muted">{name}</span>
            </div>
          ))}
        </Grid>
      </Entry>
      <Entry text={t.small}>
        <div className="spec" style={{ gap: 'var(--s-4)' }}>
          {names.map((name) => (
            <Icon key={name} name={name} size="s" />
          ))}
        </div>
      </Entry>
      <Entry text={t.dot}>
        <div className="spec" style={wide}>
          {[undefined, 'off', 'signal'].map((tone, index) => (
            <Cap key={index} label={t.dotCaps[index]}>
              <span className="dot" data-tone={tone} />
            </Cap>
          ))}
        </div>
      </Entry>
      <Entry text={t.pitch}>
        <div className="stage" data-surface="window">
          <div className="spec" style={{ gap: 'var(--s-8)' }}>
            {[5, 6, 8, 10, 12].map((pitch) => (
              <Cap key={pitch} label={`${t.pitchCap} ${pitch}${pitch === 8 ? t.pitchDefault : ''}`}>
                <span
                  className="dotted"
                  data-pitch={pitch}
                  style={{
                    display: 'block',
                    width: u(30),
                    height: 'calc(var(--pitch) * var(--pitch-rows))',
                    backgroundRepeat: 'round',
                  }}
                />
              </Cap>
            ))}
          </div>
        </div>
        <div className="stage" data-surface="window">
          <div className="spec" style={{ gap: 'var(--s-8)' }}>
            {[5, 8, 12].map((pitch) => (
              <Cap key={pitch} label={`${t.ringCap} ${pitch}`}>
                <svg
                  aria-hidden="true"
                  data-pitch={pitch}
                  style={{ display: 'block', width: u(12), height: u(12) }}
                  viewBox="0 0 96 96"
                >
                  <circle className="dotring" cx="48" cy="48" r="40" />
                </svg>
              </Cap>
            ))}
          </div>
        </div>
      </Entry>
      <Entry text={t.mark}>
        <div className="spec" style={wide}>
          {[undefined, 'orange', 'blue', 'mint'].map((surface, index) => (
            <Cap key={index} label={t.markCaps[index]}>
              <span className="mark" data-surface={surface} />
            </Cap>
          ))}
          <Cap label={t.markCaps[4]}>
            <span className="mark" data-tone="off" />
          </Cap>
          <Cap label={t.markCaps[5]}>
            <span className="chipbox" data-surface="paper">
              <span className="mark" />
            </span>
          </Cap>
        </div>
      </Entry>
      <Entry text={t.barcode}>
        <div className="spec">
          <Cap label={t.barcodeCaps[0]}>
            <div className="stage" data-surface="paper">
              <span className="t-mono c-muted">
                <span className="barcode" />
                CODE/XXX.01
              </span>
            </div>
          </Cap>
          <Cap label={t.barcodeCaps[1]}>
            <div className="stage" data-surface="window">
              <span className="barcode" />
            </div>
          </Cap>
        </div>
      </Entry>
    </Doc>
  )
}
