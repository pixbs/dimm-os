import { Fragment } from 'react'

import type { Dictionary } from '@/i18n/en'

import { Icon } from '../atoms/Icon'
import { App } from '../molecules/App'
import { Bar, BarSpace, BarText, BarTitle } from '../molecules/Bar'
import { Button } from '../molecules/Button'
import { Heading, Stat } from '../molecules/Heading'
import { Avatar, Media } from '../molecules/Media'
import { Path } from '../molecules/Path'
import { Tag } from '../molecules/Tag'
import { WindowControls } from '../molecules/WindowControls'
import { LampsChange, LivePicture, PathChange, PictureAgain } from './Changing'
import type { Copy } from './copy/en'
import { Cap, Doc, Entry, Specs, Stage, width } from './parts'
import picture from './picture.jpg'

type Props = { t: Copy['content']; words: Dictionary }

function Headings({ t }: Props) {
  const [display, title, heading, lead, only, paper, orange] = t.headingCaps
  const full = (level: 'display' | 'title' | 'heading' | 'lead') => (
    <Heading eyebrow={t.eyebrow} level={level} text={t.text} title={t.title} />
  )

  return (
    <Entry text={t.heading}>
      <Specs caps={[display]}>
        <Stage width={width.wide}>{full('display')}</Stage>
      </Specs>
      <Specs caps={[title]}>
        <Stage width={width.wide}>{full('title')}</Stage>
      </Specs>
      <Specs caps={[heading, lead]}>
        <Stage width={width.dialog}>{full('heading')}</Stage>
        <Stage width={width.dialog}>{full('lead')}</Stage>
      </Specs>
      <Specs caps={[only, paper, orange]}>
        <Stage width={width.popover}>
          <Heading level="heading" title={t.title} />
        </Stage>
        {(['paper', 'orange'] as const).map((surface) => (
          <Stage key={surface} surface={surface} width={width.popover}>
            <Heading level="heading" text={t.text} title={t.title} />
          </Stage>
        ))}
      </Specs>
    </Entry>
  )
}

function Medias({ t }: Props) {
  const caps = t.mediaCaps
  const ratios = ['16:9', '4:3', '1:1', '3:1'] as const
  // The specimens are as wide as a popover, which is the width a picture is asked for.
  const source = { src: picture, alt: t.picture, span: 320 }

  return (
    <Entry text={t.media}>
      <Specs caps={caps.slice(0, 4)}>
        {ratios.map((ratio) => (
          <Stage flush key={ratio} width={width.popover}>
            <Media label={<Tag>{ratio}</Tag>} ratio={ratio} />
          </Stage>
        ))}
      </Specs>
      <Specs caps={caps.slice(4, 8)}>
        <Stage width={width.popover}>
          <Media caption={t.caption} label={<Tag>16:9</Tag>} />
        </Stage>
        <Stage width={width.popover}>
          <Media
            label={<Tag>{t.length}</Tag>}
            play={<Button icon="play" name={t.play} tone="solid" />}
          />
        </Stage>
        <Stage surface="paper" width={width.popover}>
          <Media caption={t.captionShort} label={<Tag>16:9</Tag>} />
        </Stage>
        <Stage width={width.popover}>
          <Media
            cover="orange"
            label={
              <Tag dot="on" surface="window">
                {t.label}
              </Tag>
            }
          />
        </Stage>
      </Specs>
      <Specs caps={caps.slice(8, 14)} tight>
        <Stage>
          <Avatar />
        </Stage>
        <Stage>
          <Avatar size="compact" />
        </Stage>
        <Stage>
          <Avatar surface="raised">{t.initials}</Avatar>
        </Stage>
        <Stage>
          <Avatar>
            <Icon name="user" />
          </Avatar>
        </Stage>
        <Stage>
          <Avatar surface="paper">{t.initials}</Avatar>
        </Stage>
        <Stage>
          <Avatar size="large" surface="raised">
            {t.initials}
          </Avatar>
        </Stage>
      </Specs>
      <Specs caps={caps.slice(14)}>
        <Stage flush width={width.popover}>
          <Media picture={{ ...source, first: true }} />
        </Stage>
        <PictureAgain label={t.again} picture={source} />
        <LivePicture picture={source} />
      </Specs>
    </Entry>
  )
}

function Stats({ t }: Props) {
  return (
    <Entry text={t.stat}>
      <Specs caps={t.statCaps}>
        {(['window', 'paper', 'orange'] as const).map((surface, index) => (
          <Stage key={surface} surface={surface} width={width.popover}>
            <Stat label={t.stats[index][1]} value={t.stats[index][0]} />
          </Stage>
        ))}
      </Specs>
    </Entry>
  )
}

const states = [undefined, 'hover', 'pressed', 'selected', 'focus', 'open'] as const

function Apps({ t }: Props) {
  const tiles = [
    ['raised', 'folder'],
    ['orange', 'image'],
    ['blue', 'mail'],
    ['mint', 'sliders'],
    ['paper', 'file'],
  ] as const

  return (
    <Entry text={t.app}>
      <div className="stage box" data-surface="desktop">
        <div className="matrix" style={{ gridTemplateColumns: 'repeat(7, max-content)' }}>
          <span />
          {t.appStates.map((state) => (
            <p className="cap__label" key={state}>
              {state}
            </p>
          ))}
          {t.appSizes.map((size, row) => (
            <Fragment key={size}>
              <p className="cap__label">{size}</p>
              {states.map((state) =>
                // A compact icon has no name to invert.
                row && state === 'selected' ? (
                  <span key={state} />
                ) : (
                  <App
                    href="#"
                    icon="folder"
                    key={state ?? 'default'}
                    name={t.name}
                    open={state === 'open'}
                    selected={state === 'selected'}
                    size={row ? 'compact' : undefined}
                    state={state === 'open' || state === 'selected' ? undefined : state}
                  />
                ),
              )}
            </Fragment>
          ))}
        </div>
      </div>
      <Specs caps={[t.tilesCap]}>
        <div className="stage box" data-surface="desktop">
          <div className="inline" style={{ gap: 'var(--s-4)' }}>
            {tiles.map(([tile, icon]) => (
              <App
                href="#"
                icon={icon}
                key={tile}
                name={tile === 'paper' ? t.longName : t.name}
                tile={tile}
              />
            ))}
          </div>
        </div>
      </Specs>
    </Entry>
  )
}

function Bars({ t, words }: Props) {
  const [regular, compact, text, floating] = t.barCaps
  const name = (
    <BarText>
      <Path segments={[t.window]} />
    </BarText>
  )

  return (
    <Entry text={t.bar}>
      <div className="spec" style={{ flexDirection: 'column' }}>
        <Cap label={regular}>
          <Stage flush width={width.wide}>
            <Bar line="below">
              <Button icon="arrow-left" name={t.back} />
              <BarTitle>{t.title}</BarTitle>
              <BarSpace />
              <Button label={t.label} size="compact" />
              <Button icon="more" name={t.more} />
            </Bar>
          </Stage>
        </Cap>
        <Cap label={compact}>
          <Stage flush width={width.wide}>
            <Bar line="below" size="compact">
              <Button icon="arrow-left" name={t.back} size="compact" />
              <BarTitle>{t.title}</BarTitle>
              <BarSpace />
              <Button label={t.label} size="compact" />
              <BarText>{t.items}</BarText>
            </Bar>
          </Stage>
        </Cap>
        <Cap label={text}>
          <Stage flush width={width.wide}>
            <Bar line="above" size="compact">
              <BarText>{t.items}</BarText>
              <BarSpace />
              <BarText>{t.date}</BarText>
            </Bar>
          </Stage>
        </Cap>
        <Cap label={floating}>
          <div
            className="stage"
            data-hand="dots"
            data-surface="window"
            style={{ width: width.wide, padding: 0 }}
          >
            <Bar line="below" size="compact">
              <WindowControls shape="dots" size="compact" t={words} />
              {name}
              <BarSpace />
            </Bar>
          </div>
        </Cap>
      </div>
    </Entry>
  )
}

export function Content(props: Props) {
  const { t } = props

  return (
    <Doc text={t.doc}>
      <Headings {...props} />
      <Medias {...props} />
      <Stats {...props} />
      <Apps {...props} />
      <Entry text={t.path}>
        <Specs caps={[t.pathCap]}>
          <PathChange label={t.change} paths={t.paths} />
        </Specs>
      </Entry>
      <Entry text={t.lamps}>
        <LampsChange caps={t.lampsCaps} label={t.change} />
      </Entry>
      <Bars {...props} />
    </Doc>
  )
}
