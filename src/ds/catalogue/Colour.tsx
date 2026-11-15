import type { Copy } from './copy/en'
import { Cap, Doc, Entry, Grid, Table, u } from './parts'

// The raw colours as tokens.css holds them, in the order of the palette.
const palette = [
  ['ink-1', '#0E0E10'],
  ['ink-2', '#141416'],
  ['ink-3', '#1C1C1F'],
  ['paper-1', '#EDEBE6'],
  ['orange', '#FF5B1F'],
  ['blue', '#7C8CFF'],
  ['mint', '#A8F0C6'],
  ['paper-2', '#F3F1ED'],
  ['paper-3', '#F9F8F5'],
  ['orange-dark', '#EB541D'],
]
const strengths = [
  ['100', 'text', 'fg'],
  ['64', 'muted', 'muted'],
  ['48', 'faint', 'faint'],
  ['16', 'line', 'line'],
  ['8', 'hover', 'hover'],
]
// Each surface of a theme with its background in dark; its foreground is the other of ink and paper.
const surfaces = [
  ['desktop', 'ink-1', 'paper-1'],
  ['window', 'ink-2', 'paper-1'],
  ['raised', 'ink-3', 'paper-1'],
  ['paper', 'paper-1', 'ink-1'],
]
const accents = ['orange', 'blue', 'mint']

// Light is the reverse of dark.
const reverse = (name: string) =>
  name.replace(/ink|paper/, (word) => (word === 'ink' ? 'paper' : 'ink'))

const channels = (name: string) => {
  const hex = palette.find(([colour]) => colour === name)![1]
  return [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
}
const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
// The contrast of a foreground, at a strength, with the background it lies on, as WCAG counts it.
function contrast(fg: string, bg: string, strength = 1) {
  const back = channels(bg)
  const text = channels(fg).map((c, index) => c * strength + back[index] * (1 - strength))
  const [dim, bright] = [luminance(text), luminance(back)].sort((a, b) => a - b)
  return `${((bright + 0.05) / (dim + 0.05)).toFixed(1)}:1`
}

function Fills() {
  return (
    <>
      <div className="panel__rule" />
      <div className="panel__fills">
        {['hover', 'pressed'].map((fill) => (
          <span className="panel__fill" key={fill} style={{ backgroundColor: `var(--${fill})` }}>
            {fill}
          </span>
        ))}
        <span className="panel__fill" data-surface="inverted">
          inverted
        </span>
      </div>
    </>
  )
}

export function Colour({ t }: { t: Copy['colour'] }) {
  return (
    <Doc text={t.doc}>
      <Entry text={t.palette}>
        <Grid columns={7}>
          {palette.map(([name, hex], index) => (
            <div className="sw" key={name}>
              <div className="sw__chip" style={{ backgroundColor: `var(--${name})` }} />
              <p className="t-body t-medium">{name}</p>
              <p className="t-mono c-muted">{hex}</p>
              <p className="t-small c-muted">{t.uses[index]}</p>
            </div>
          ))}
        </Grid>
      </Entry>
      <Entry text={t.strength}>
        <Table columns="8 12 1fr 8 8 8" head={t.strengthHead}>
          {strengths.flatMap(([strength, role, token], index) => [
            <p className="t-mono" key={strength}>
              {strength}
            </p>,
            <p className="t-medium" key={role}>
              {role}
            </p>,
            <p className="c-muted" key="use">
              {t.strengthUses[index]}
            </p>,
            ...['window', 'paper', 'orange'].map((surface) => (
              <div key={surface + strength}>
                <span className="chipbox" data-surface={surface}>
                  <span className="chip" style={{ backgroundColor: `var(--${token})` }} />
                </span>
              </div>
            )),
          ])}
        </Table>
      </Entry>
      <Entry text={t.surface}>
        <Grid columns={4}>
          {surfaces.map(([name, bg, fg]) => (
            <div
              className={name === 'desktop' ? 'stage panel box' : 'stage panel'}
              data-surface={name}
              key={name}
            >
              <p className="t-mono">{name}</p>
              {[
                ['dark', bg, fg],
                ['light', reverse(bg), reverse(fg)],
              ].flatMap(([theme, back, text]) => [
                <p className="t-mono c-muted" data-in={theme} key={theme}>
                  {back} + {text}
                </p>,
                <p
                  className="t-heading"
                  data-in={theme}
                  key={theme + 1}
                  style={{ marginTop: 'var(--s-4)' }}
                >
                  {t.text} {contrast(text, back)}
                </p>,
                <p className="t-body c-muted" data-in={theme} key={theme + 2}>
                  {t.muted} {contrast(text, back, 0.64)}
                </p>,
              ])}
              <Fills />
            </div>
          ))}
        </Grid>
        <Grid columns={4}>
          {accents.map((name) => (
            <div className="stage panel" data-surface={name} key={name}>
              <p className="t-mono">{name}</p>
              <p className="t-mono c-muted">{name} + ink-1</p>
              <p className="t-heading" style={{ marginTop: 'var(--s-4)' }}>
                {t.text} {contrast('ink-1', name)}
              </p>
              <p className="t-body">{t.accent}</p>
              <Fills />
            </div>
          ))}
        </Grid>
      </Entry>
      <Entry text={t.signal}>
        <div className="spec">
          <Cap label={t.signalCaps[0]}>
            <div className="stage" data-surface="window">
              <span className="dot" data-tone="signal" />
            </div>
          </Cap>
          {['window', 'paper'].map((surface, index) => (
            <Cap key={surface} label={t.signalCaps[index + 1]}>
              <div className="stage" data-surface={surface}>
                <span
                  className="swatchtext t-mono"
                  style={{ outline: 'var(--b-2) solid var(--ring)', outlineOffset: 'var(--b-2)' }}
                >
                  Aa
                </span>
              </div>
            </Cap>
          ))}
          <Cap label={t.signalCaps[3]}>
            <div className="stage" data-surface="window">
              <span
                className="t-body"
                style={{ backgroundColor: 'var(--orange)', color: 'var(--ink-1)' }}
              >
                {t.selected}
              </span>
            </div>
          </Cap>
          <Cap label={t.signalCaps[4]}>
            <div data-surface="paper" style={{ display: 'flex', width: u(24), height: u(12) }}>
              <div style={{ flex: 1, backgroundColor: 'var(--scrim)' }} />
              <div style={{ flex: 1 }} />
            </div>
          </Cap>
          <Cap label={t.signalCaps[5]}>
            <div
              data-surface="window"
              style={{
                width: u(24),
                height: u(12),
                backgroundImage: 'var(--pattern)',
                backgroundSize: 'var(--s-2) var(--s-2)',
              }}
            />
          </Cap>
          <Cap label={t.signalCaps[6]}>
            <div className="stage" data-surface="paper">
              <span className="dot" data-tone="signal" />
            </div>
          </Cap>
        </div>
      </Entry>
    </Doc>
  )
}
