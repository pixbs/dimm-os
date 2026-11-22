import { Fragment } from 'react'

import type { Language } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { type Key as KeyName, keyNames, named } from '@/i18n/keys'

import { Bar, BarHandle, BarText } from '../molecules/Bar'
import { Button, ButtonGroup } from '../molecules/Button'
import { Dots } from '../molecules/Dots'
import { ForDevice, Key, Keys } from '../molecules/Key'
import { Link } from '../molecules/Link'
import { Path } from '../molecules/Path'
import { Row } from '../molecules/Row'
import { Tag } from '../molecules/Tag'
import { Tooltip } from '../molecules/Tooltip'
import { WindowControls } from '../molecules/WindowControls'
import type { Copy } from './copy/en'
import { Cap, Doc, Entry, Specs, Stage, type Surface, Table, width } from './parts'

type Props = { t: Copy['actions']; language: Language; words: Dictionary }
const tones = ['solid', 'outline', 'ghost'] as const
const states = [undefined, 'hover', 'pressed', 'focus', 'disabled'] as const
const surfaces = ['window', 'raised', 'paper', 'orange', 'blue', 'mint'] as const

// Every tone in every state, at one size.
function Matrix({ label, size }: { label: string; size?: 'compact' }) {
  return (
    <Stage>
      <div className="matrix">
        <span />
        {states.map((state) => (
          <p className="cap__label" key={state ?? 'default'}>
            {state ?? 'default'}
          </p>
        ))}
        {tones.map((tone) => (
          <Fragment key={tone}>
            <p className="cap__label">{tone}</p>
            {states.map((state) => (
              <Button
                disabled={state === 'disabled'}
                key={state ?? 'default'}
                label={label}
                size={size}
                state={state === 'disabled' ? undefined : state}
                tone={tone === 'ghost' ? undefined : tone}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </Stage>
  )
}

function Buttons({ t, language, words }: Props) {
  const enter = named(language, ['enter'])
  const contents = (size?: 'compact') => (
    <Specs caps={t.buttonCaps}>
      <Button label={t.label} size={size} tone="outline" />
      <Button icon="plus" label={t.label} size={size} tone="outline" />
      <Button end="arrow-right" label={t.label} size={size} tone="outline" />
      <Button hint={enter} label={t.label} size={size} tone="solid" />
      <Button lead={<span className="dot" data-tone="signal" />} label={t.label} size={size} />
      <Button lead={<span className="mark" data-surface="orange" />} label={t.label} size={size} />
      <Button lead={<Tag>L</Tag>} label={t.label} size={size} />
      <Button icon="close" name={words.close} size={size} tone="outline" />
      <Button icon="more" name={t.more} size={size} />
      <Button
        busy={<Dots count={3} label={t.dotsLabels[4]} on={2} />}
        label={t.label}
        size={size}
        tone="solid"
      />
    </Specs>
  )

  return (
    <Entry text={t.button}>
      <Specs caps={['regular', 'compact']}>
        <Matrix label={t.label} />
        <Matrix label={t.label} size="compact" />
      </Specs>
      {contents()}
      {contents('compact')}
      <Specs caps={t.fillCaps}>
        <div className="stack" style={{ width: width.popover }}>
          <Button end="arrow-right" fill label={t.label} tone="solid" />
          <Button fill hint={named(language, ['mod', 'K'])} label={t.label} tone="outline" />
          <Button fill label={t.label} tone="outline" />
        </div>
        <div className="inline">
          <Button label={t.label} tone="solid" />
          <Button label={t.label} tone="outline" />
          <Button label={t.label} />
        </div>
        <Stage width={width.narrow}>
          <div className="stack">
            <Button end="arrow-right" fill label={t.long[0]} tone="solid" />
            <Button hint={enter} label={t.long[3]} tone="outline" />
          </div>
        </Stage>
        <Stage surface="orange">
          <Button hint={named(language, ['mod', 'K'])} label={t.label} tone="outline" />
        </Stage>
      </Specs>
      <Cap label={t.surfacesCap}>
        <Specs caps={[...surfaces]} tight>
          {surfaces.map((surface) => (
            <Stage key={surface} surface={surface}>
              <div className="inline">
                <Button label={t.label} tone="solid" />
                <Button label={t.label} tone="outline" />
                <Button end="arrow-right" label={t.label} />
              </div>
            </Stage>
          ))}
        </Specs>
      </Cap>
    </Entry>
  )
}

function Choice({ labels, on, size }: { labels: string[]; on: number; size?: 'compact' }) {
  return (
    <ButtonGroup hug>
      {labels.map((label, index) => (
        <Button
          aria-pressed={index === on}
          key={label}
          label={label}
          size={size}
          tone={index === on ? 'solid' : 'outline'}
        />
      ))}
    </ButtonGroup>
  )
}

function Groups({ t }: Props) {
  const actions = (
    <ButtonGroup>
      <Button end="arrow-right" label={t.label} tone="outline" />
      <Button end="arrow-up-right" label={t.label} tone="outline" />
    </ButtonGroup>
  )

  return (
    <Entry text={t.group}>
      <Specs caps={t.groupCaps.slice(0, 3)}>
        <Stage>
          <Choice labels={t.choices} on={0} />
        </Stage>
        <Stage>
          <Choice labels={t.choices} on={1} size="compact" />
        </Stage>
        <Stage>
          <ButtonGroup hug label={t.theme[0]}>
            <Button
              aria-pressed={false}
              icon="sun"
              name={t.theme[1]}
              size="compact"
              tone="outline"
            />
            <Button aria-pressed icon="moon" name={t.theme[2]} size="compact" tone="solid" />
          </ButtonGroup>
        </Stage>
      </Specs>
      <Specs caps={t.groupCaps.slice(3, 5)}>
        <Stage>
          <div style={{ width: width.dialog }}>{actions}</div>
        </Stage>
        <Stage>
          <div className="cq" style={{ width: width.popover }}>
            {actions}
          </div>
        </Stage>
      </Specs>
      <Specs caps={t.groupCaps.slice(5)}>
        <Stage>
          <ButtonGroup hug>
            {t.states.map((label, index) => (
              <Button
                disabled={index === 4}
                key={label}
                label={label}
                state={[undefined, 'hover', 'pressed', 'focus'][index] as 'hover'}
                tone="outline"
              />
            ))}
          </ButtonGroup>
        </Stage>
        <Stage surface="paper">
          <Choice labels={t.choices} on={0} />
        </Stage>
        <Stage width={`calc(${width.narrow} + var(--s-12) * 2)`}>
          <Choice labels={t.long.slice(0, 2)} on={0} />
        </Stage>
      </Specs>
    </Entry>
  )
}

function Links({ t }: Props) {
  const [label, sentence, inSentence] = t.linkText
  const [before, after] = sentence.split('{link}')
  const plain = (surface?: Surface) => (
    <Stage surface={surface}>
      <Link href="#">{label}</Link>
    </Stage>
  )

  return (
    <Entry text={t.link}>
      <Specs caps={t.linkCaps} tight>
        {plain()}
        {(['hover', 'pressed', 'focus'] as const).map((state) => (
          <Stage key={state}>
            <Link href="#" state={state}>
              {label}
            </Link>
          </Stage>
        ))}
        <Stage>
          <Link href="https://example.com">{label}</Link>
        </Stage>
        <Stage>
          <p className="t-body" style={{ width: width.popover }}>
            {before}
            <Link href="#">{inSentence}</Link>
            {after}
          </p>
        </Stage>
        {plain('paper')}
        {plain('orange')}
      </Specs>
    </Entry>
  )
}

function Tags({ t, language }: Props) {
  return (
    <Entry text={t.tag}>
      <Specs caps={t.tagCaps} tight>
        <Stage>
          <Tag>{t.label}</Tag>
        </Stage>
        <Stage>
          <Tag dot="on">{t.label}</Tag>
        </Stage>
        <Stage>
          <Tag dot="signal">{t.label}</Tag>
        </Stage>
        <Stage>
          <Tag surface="inverted">{t.label}</Tag>
        </Stage>
        <Stage surface="orange">
          <Tag dot="on" surface="orange">
            {t.label}
          </Tag>
        </Stage>
        <Stage>
          <div className="inline">
            {([['mod', 'K'], ['esc'], ['enter']] as const).map((keys) => (
              <Tag key={keys.join()}>
                <ForDevice text={named(language, [...keys])} />
              </Tag>
            ))}
          </div>
        </Stage>
        <Stage>
          <Tag>12</Tag>
        </Stage>
        {(['paper', 'orange'] as const).map((surface) => (
          <Stage key={surface} surface={surface}>
            <div className="inline">
              <Tag>{t.label}</Tag>
              <Tag surface="inverted">{t.label}</Tag>
            </div>
          </Stage>
        ))}
        <Stage width={`calc(${width.narrow} - var(--s-12))`}>
          <Tag dot="on">{t.long[2]}</Tag>
        </Stage>
      </Specs>
    </Entry>
  )
}

function DotsEntry({ t }: Props) {
  const values = [
    [5, 2, 0],
    [8, 6, 0],
    [14, 6, 2],
  ]

  return (
    <Entry text={t.dots}>
      <Specs caps={t.dotsCaps} tight>
        {values.map(([count, on, from], index) => (
          <Stage key={index}>
            <Dots count={count} from={from} label={t.dotsLabels[index]} on={on} />
          </Stage>
        ))}
        <Stage surface="paper">
          <Dots count={5} label={t.dotsLabels[3]} on={3} />
        </Stage>
      </Specs>
    </Entry>
  )
}

function Tooltips({ t, language }: Props) {
  return (
    <Entry text={t.tooltip}>
      <Specs caps={t.tooltipCaps} tight>
        <Stage>
          <Tooltip label={t.label} />
        </Stage>
        <Stage>
          <Tooltip hint={named(language, ['mod', 'K'])} label={t.label} />
        </Stage>
        <Stage>
          <Button hint="," icon="sliders" name={t.preferences} tone="outline" />
        </Stage>
      </Specs>
    </Entry>
  )
}

function Keyboard({ t, language }: Props) {
  const key = (name: KeyName) => named(language, [name])
  const keys = Object.keys(keyNames[language].apple) as KeyName[]
  const [arrows, move, open] = t.keyWords

  return (
    <Entry text={t.key}>
      <Specs caps={t.keyCaps.slice(0, 5)} tight>
        <Stage>
          <Key name={key('esc')} />
        </Stage>
        <Stage>
          <Keys names={[key('mod'), 'K']} />
        </Stage>
        <Stage flush width={width.popover}>
          <Row title={t.label} trail={<Keys names={[key('shift'), arrows]} />} />
        </Stage>
        <Stage flush>
          <Bar size="compact">
            <BarText>
              <Keys names={[key('up'), key('down')]} />
              {move}
            </BarText>
            <BarText>
              <Key name={key('enter')} />
              {open}
            </BarText>
          </Bar>
        </Stage>
        <div className="stage" data-keys="other" data-surface="paper">
          <Keys names={[key('mod'), 'K']} />
        </div>
      </Specs>
      <Cap label={t.keyCaps[5]}>
        <Table
          classes={['c-muted', ...keys.map(() => 't-mono')]}
          columns={['12', ...keys.map(() => '9')].join(' ')}
          head={[t.keyHead[0], ...keys]}
          rows={(['apple', 'other'] as const).map((device, index) => [
            t.keyHead[index + 1],
            ...keys.map((name) => keyNames[language][device][name]),
          ])}
        />
      </Cap>
    </Entry>
  )
}

type Bar = {
  hand?: 'dots' | 'squares'
  size?: 'compact' | 'regular'
  paper?: boolean
  fixed?: boolean
}

function Controls({ t, words }: Props) {
  // Both hands are in every bar; a specimen that shows one hand sets it, the last follows the setting.
  const bars: Bar[] = [
    { hand: 'dots' },
    { hand: 'squares' },
    { hand: 'dots', size: 'regular' },
    { hand: 'squares', size: 'regular' },
    { hand: 'dots', fixed: true },
    { hand: 'squares', fixed: true },
    { hand: 'dots', paper: true },
    {},
  ]

  return (
    <Entry text={t.controls}>
      {[0, 2, 4, 6].map((first) => (
        <Specs caps={t.controlsCaps.slice(first, first + 2)} key={first}>
          {bars.slice(first, first + 2).map(({ hand, size = 'compact', paper, fixed }, index) => {
            const controls = (shape: 'dots' | 'squares') => (
              <WindowControls
                off={fixed ? ['fullScreen'] : []}
                shape={shape}
                size={size}
                t={words}
              />
            )

            return (
              <div
                className="stage"
                data-hand={hand}
                data-surface={paper ? 'paper' : 'window'}
                key={index}
                style={{ width: width.dialog, padding: 0 }}
              >
                <Bar line="below" size={size === 'compact' ? size : undefined}>
                  {controls('dots')}
                  <BarText>
                    <Path segments={[t.name]} />
                  </BarText>
                  <BarHandle />
                  {controls('squares')}
                </Bar>
              </div>
            )
          })}
        </Specs>
      ))}
    </Entry>
  )
}

export function Actions(props: Props) {
  return (
    <Doc text={props.t.doc}>
      <Buttons {...props} />
      <Groups {...props} />
      <Links {...props} />
      <Tags {...props} />
      <DotsEntry {...props} />
      <Tooltips {...props} />
      <Keyboard {...props} />
      <Controls {...props} />
    </Doc>
  )
}
