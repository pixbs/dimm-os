import { Fragment } from 'react'

import { MenuButton } from '../organisms/Menu'
import type { Copy } from './copy/en'
import { Arrives, Deciphers, Opens, Pictures, Played, Springs, Travelled } from './Moves'
import { Doc, Entry, Table } from './parts'

const times = [
  'fast',
  'slow',
  'long',
  'fast-exit',
  'slow-exit',
  'slide-exit',
  'note',
  'travel',
  'back',
  'lag',
  'step',
]
// Each curve is shown at the duration it is used with.
const curves = [
  ['standard', 'slow'],
  ['enter', 'slow'],
  ['exit', 'slow-exit'],
  ['swing', 'long'],
  ['drop', 'long'],
  ['across', 'travel'],
  ['up', 'travel'],
  ['even', 'fast'],
  ['swatch', 'swatch-grow'],
]
const columns = Array.from({ length: 40 }, (_, column) => column)

// A dot crosses its track in the time and on the curve named, orange only where it overshoots, with a twin at the far end for the reduced form.
function Run({ time, curve }: { time: string; curve: string }) {
  const style = {
    transitionDuration: `var(--m-${time})`,
    transitionTimingFunction: `var(--m-${curve})`,
  }

  return (
    <div>
      <div className="run">
        {[0, 1].map((twin) => (
          <span key={twin} style={style}>
            <i className="dot" data-tone={curve === 'swing' ? 'signal' : undefined} />
          </span>
        ))}
      </div>
    </div>
  )
}

export function Motion({ t }: { t: Copy['motion'] }) {
  return (
    <Doc text={t.doc}>
      <Entry text={t.duration}>
        <Played label={t.play}>
          <Table columns="12 10 1fr 30">
            {times.map((time, index) => (
              <Fragment key={time}>
                <p className="t-medium">{time}</p>
                <p className="t-mono c-muted">{t.durationRows[index][0]}</p>
                <p className="c-muted">{t.durationRows[index][1]}</p>
                <Run curve="standard" time={time} />
              </Fragment>
            ))}
          </Table>
        </Played>
      </Entry>
      <Entry text={t.curve}>
        <Played label={t.play}>
          <Table columns="12 20 1fr 30">
            {curves.map(([curve, time], index) => (
              <Fragment key={curve}>
                <p className="t-medium">{curve}</p>
                <p className="t-mono c-muted">{t.curveRows[index][0]}</p>
                <p className="c-muted">{t.curveRows[index][1]}</p>
                <Run curve={curve} time={time} />
              </Fragment>
            ))}
          </Table>
        </Played>
      </Entry>
      <Entry text={t.spread}>
        <Played label={t.play}>
          <div className="sweep">
            {columns.map((column) => (
              <span
                className="dotted"
                key={column}
                style={{
                  transitionDelay: `calc(var(--m-spread) * ${column} / ${columns.length})`,
                }}
              />
            ))}
          </div>
        </Played>
      </Entry>
      <Entry text={t.turn}>
        <MenuButton
          button={{ label: t.turnOpen, tone: 'outline' }}
          items={Array.from({ length: 12 }, (_, at) => ({ label: `${t.turnRow} ${at + 1}` }))}
          label={t.turn[0]}
          t={{ close: '' }}
        />
      </Entry>
      <Entry text={t.spring}>
        <Springs label={t.play} />
      </Entry>
      <Entry text={t.origin}>
        <Opens caps={t.originCaps} text={t.originPart} />
      </Entry>
      <Entry text={t.travel}>
        <Travelled label={t.play} letters={t.travelLetters} />
      </Entry>
      <Entry text={t.handOver}>
        <Table
          classes={['t-mono c-muted', 't-medium', 'c-muted']}
          columns="6 16 1fr"
          head={t.handOverHead}
          rows={t.handOverRows}
        />
      </Entry>
      <Entry text={t.decipher}>
        <Deciphers heading={t.decipherHeading} label={t.change} texts={t.decipherTexts} />
      </Entry>
      <Entry text={t.arrival}>
        <Arrives label={t.play} texts={t.arrivalTexts} title={t.arrivalTitle} />
      </Entry>
      <Entry text={t.dots}>
        <Pictures caps={t.dotsCaps} />
      </Entry>
      <Entry text={t.settings}>
        <Table
          classes={['t-medium', 'c-muted', 'c-muted']}
          columns="1fr 1fr 1fr"
          head={t.settingsHead}
          rows={t.settingsRows}
        />
      </Entry>
      <Entry text={t.rules}>
        <Table
          classes={['t-medium', 'c-muted']}
          columns="6 1fr"
          head={t.rulesHead}
          rows={t.rulesRows.map((rule, index) => [String(index + 1).padStart(2, '0'), rule])}
        />
      </Entry>
    </Doc>
  )
}
