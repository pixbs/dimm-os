'use client'

import { type ChangeEvent, type KeyboardEvent, type MouseEvent, useEffect, useId } from 'react'

import type { Dictionary } from '@/i18n/en'
import type { Named } from '@/i18n/keys'

import { Icon, type IconName } from '../atoms/Icon'
import { Bar, BarSpace, BarText } from '../molecules/Bar'
import { Button } from '../molecules/Button'
import { Key, Keys } from '../molecules/Key'
import { Row } from '../molecules/Row'
import { Dialog } from './Dialog'

// A row: what leads to it, its title cut where the typed letters stand, its kind, and the keys that open it.
type Result = {
  href: string
  lang?: string
  icon: IconName
  title: [string, string, string]
  kind: string
  group: string
  keys: Named[]
}

type Props = {
  open: boolean
  onClose: () => void
  drawer?: boolean
  opener?: Element | null
  onGone?: () => void
  // Shown where it stands, for the catalogue.
  shown?: boolean
  // The name of the field, which it shows until something is typed.
  field: string
  value: string
  onType?: (event: ChangeEvent<HTMLInputElement>) => void
  onKey?: (event: KeyboardEvent<HTMLInputElement>) => void
  onClear?: () => void
  // A row is chosen with a plain press, which follows its link.
  onChoose?: (event: MouseEvent<HTMLAnchorElement>) => void
  results: Result[]
  selected: number
  // What is said when nothing is found, and how many are.
  none: string
  said: string
  // The keys of the bar, each beside what it does, and the one that clears and closes.
  keys: [Named[], string][]
  escape: Named
  t: Pick<Dictionary, 'search' | 'resultList' | 'clear' | 'close'>
}

// The id of a row, by which the field names the one in force.
const rowId = (palette: string, at: number) => `${palette}-${at}`

// Search over everything: not a window, it has no title bar and no controls. A field that is a combobox, the rows it
// found under the labels of their groups, and a bar of the keys with the count. It comes from 96 % at its own place, a
// press beside it or Esc puts it away, and on a compact screen it is a drawer with no keys.
export function Palette(props: Props) {
  const { results, selected, t } = props
  const id = useId()
  const list = `${id}-list`
  // The row in force stays in sight as the arrows move it and as the letters change.
  useEffect(() => {
    document.getElementById(rowId(id, selected))?.scrollIntoView({ block: 'nearest' })
  }, [id, selected, props.value])
  // The rows of one group stand together under its label.
  const groups = results.reduce<{ label: string; rows: [Result, number][] }[]>((all, row, at) => {
    if (all.at(-1)?.label !== row.group) all.push({ label: row.group, rows: [] })
    all.at(-1)!.rows.push([row, at])
    return all
  }, [])

  return (
    <Dialog
      className="palette"
      drawer={props.drawer}
      label={t.search}
      onClose={props.onClose}
      onGone={props.onGone}
      open={props.open}
      opener={props.opener}
      shown={props.shown}
      t={t}
    >
      <div role="search">
        <div className="row" data-kind="field">
          <span className="row__lead">
            <Icon name="search" />
          </span>
          <span className="row__value">
            <input
              aria-activedescendant={results.length ? rowId(id, selected) : undefined}
              aria-autocomplete="list"
              aria-controls={list}
              aria-expanded
              aria-label={props.field}
              autoComplete="off"
              className="input"
              enterKeyHint="search"
              onChange={props.onType}
              onKeyDown={props.onKey}
              placeholder={props.field}
              readOnly={!props.onType}
              role="combobox"
              spellCheck={false}
              type="text"
              value={props.value}
            />
          </span>
          <span className="row__trail">
            <span className="palette__keys">
              <Key name={props.escape} />
            </span>
            <Button icon="close" name={t.clear} onClick={props.onClear} size="compact" />
          </span>
        </div>
      </div>
      <div aria-label={t.resultList} className="palette__list" id={list} role="listbox">
        {groups.map(({ label, rows }) => (
          <div aria-labelledby={`${id}-${rows[0][1]}-group`} key={rows[0][1]} role="group">
            <p className="palette__group" id={`${id}-${rows[0][1]}-group`}>
              {label}
            </p>
            {rows.map(([row, at]) => (
              <Row
                aria-selected={at === selected}
                data-surface={at === selected ? 'inverted' : undefined}
                href={row.href}
                icon={row.icon}
                id={rowId(id, at)}
                key={at}
                lang={row.lang}
                meta={row.kind}
                onClick={props.onChoose}
                role="option"
                tabIndex={-1}
                title={
                  <>
                    {row.title[0]}
                    {row.title[1] && <mark className="match">{row.title[1]}</mark>}
                    {row.title[2]}
                  </>
                }
                trail={<Keys names={row.keys} />}
              />
            ))}
          </div>
        ))}
        {!results.length && (
          <div className="row">
            <span className="row__main">
              <span className="row__title">{props.none}</span>
            </span>
          </div>
        )}
      </div>
      <Bar className="palette__bar" line="above" size="compact">
        <span className="palette__keys">
          {props.keys.map(([names, does]) => (
            <BarText key={does}>
              <Keys names={names} />
              {does}
            </BarText>
          ))}
        </span>
        <BarSpace />
        <BarText role="status">{props.said}</BarText>
      </Bar>
    </Dialog>
  )
}
