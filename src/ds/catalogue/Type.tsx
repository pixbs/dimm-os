import type { Copy } from './copy/en'
import { Cap, Doc, Entry, Table, u } from './parts'

const styles = ['hero', 'display', 'title', 'heading', 'lead', 'body', 'small', 'mono'] as const
// The largest three, each with the style it becomes in a compact window.
const steps = [
  ['hero', 'display'],
  ['display', 'title'],
  ['title', 'heading'],
] as const
const wraps = ['lead', 'body', 'small']

export function Type({ t }: { t: Copy['type'] }) {
  return (
    <Doc text={t.doc}>
      <Entry text={t.families}>
        <div className="spec" style={{ gap: 'var(--s-12)' }}>
          <Cap label={t.familiesCaps[0]}>
            <p className="sample t-display">Aa Bb Cc 0123</p>
          </Cap>
          <Cap label={t.familiesCaps[1]}>
            <p className="sample t-mono">Aa Bb Cc 0123456789 / · : → ↵ ⌘ %</p>
          </Cap>
        </div>
      </Entry>
      {styles.map((style) => (
        <Entry key={style} text={t.styles[style]}>
          <p className={`sample t-${style}`} data-wrap={wraps.includes(style) ? '' : undefined}>
            {t.styles[style][3]}
          </p>
        </Entry>
      ))}
      <Entry text={t.compact}>
        <Table columns="20 1.4fr 20 1fr" head={t.compactHead}>
          {steps.flatMap(([style, compact]) => [
            <p className="t-mono" key={style}>
              {t.styles[style][0]}
            </p>,
            <p className={`sample t-${style}`} key="wide">
              Aa 09
            </p>,
            <p className="t-mono" key={compact}>
              {t.styles[compact][0]}
            </p>,
            // The same style in a cell that is a compact window: it steps down by itself.
            <div className="cq" key="compact">
              <p className={`sample t-${style}`}>Aa 09</p>
            </div>,
          ])}
        </Table>
      </Entry>
      <Entry text={t.rules}>
        <div className="spec">
          <Cap label={t.rulesCaps[0]}>
            <div className="stage" data-surface="window">
              <Table
                classes={['c-muted', '']}
                columns="20 30"
                rows={[
                  [t.label, t.value],
                  [t.label, t.value],
                ]}
              />
            </div>
          </Cap>
          <Cap label={t.rulesCaps[1]}>
            <div className="stage" data-surface="window">
              <p className="t-heading" style={{ width: u(40) }}>
                {t.oneWeight}
              </p>
            </div>
          </Cap>
          <Cap label={t.rulesCaps[2]}>
            <div className="stage" data-surface="window">
              <p className="t-body" style={{ width: u(40) }}>
                {t.emphasis[0]}
                <span className="t-medium">{t.emphasis[1]}</span>
                {t.emphasis[2]}
              </p>
            </div>
          </Cap>
        </div>
      </Entry>
    </Doc>
  )
}
