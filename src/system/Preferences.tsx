'use client'

import { useId, useState } from 'react'

import { change, settings } from '@/ds/atoms/settings'
import { useChosen, useSetting } from '@/ds/atoms/useSetting'
import { Button, ButtonGroup, ButtonLink } from '@/ds/molecules/Button'
import { Dial } from '@/ds/molecules/Dial'
import { Dip } from '@/ds/molecules/Dip'
import { Field } from '@/ds/molecules/Field'
import { Stat } from '@/ds/molecules/Heading'
import { Lamps } from '@/ds/molecules/Lamps'
import { Row } from '@/ds/molecules/Row'
import { Slide } from '@/ds/molecules/Slide'
import { Monitor } from '@/ds/organisms/Monitor'
import { step, stepAt, steps } from '@/ds/organisms/wallpapers'
import { Section } from '@/ds/sections/Section'
import { type Language, languages, names, toAddress } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { useMinute, useZone } from '@/shell/Clock'
import type { Parts } from '@/shell/OnDesk'

type Props = {
  t: Dictionary
  language: Language
  site: { name: string; timezone: string; place: string }
  // The address the window stands at, which the other language loads.
  path: string
}

const pitches = ['5', '6', '8', '10', '12']
// Each choice of a slide and the value it writes: the first follows the device, which writes nothing.
const hands = [null, 'dots', 'squares']
const themes = [null, 'dark', 'light']
const switches = ['boot', 'start', 'remember'] as const

function Body({ t, language, site, path }: Props) {
  const pitch = useSetting('pitch') ?? '8'
  const at = stepAt(useSetting('wallpaper'))
  const clock = useSetting('clock')
  const on = {
    boot: useSetting('boot') === 'on',
    start: useSetting('start') === 'on',
    remember: useSetting('remember') === 'on',
  }
  const [boot, setBoot] = useState(0)
  const dial = useId()
  const minute = useMinute()
  const zone = useZone(site.timezone)
  const themeAt = themes.indexOf(useChosen('theme'))
  const handAt = hands.indexOf(useChosen('hand'))

  const time =
    minute === null
      ? ''
      : new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: zone,
        }).format(new Date(minute * 60000))
  const { place } = site
  const other = languages.find((one) => one !== language)!
  // Each step in words: the wallpaper, the filter, and in colour where it is.
  const said = steps.map((setting) => {
    const { wallpaper, filter, colour } = step(setting)
    return [t.wallpapers[wallpaper], t.filters[filter], colour && t.inColour]
      .filter(Boolean)
      .join(', ')
  })
  const groups = steps.flatMap((setting, index) =>
    index && step(steps[index - 1]).wallpaper === step(setting).wallpaper ? [] : [index],
  )

  const left = (
    <div className="list">
      <Field control label={t.prefsDisplay}>
        {() => <Monitor boot={boot} />}
      </Field>
      <Row
        lead={
          <Dial
            groups={groups}
            labelledBy={dial}
            onChange={(index) => change({ wallpaper: steps[index] })}
            steps={said}
            value={at}
          />
        }
        title={
          <Stat
            label={<span id={dial}>{t.wallpaper}</span>}
            value={t.wallpapers[step(steps[at]).wallpaper]}
          />
        }
      />
      <Field control label={t.dot}>
        {(id) => (
          <Slide
            at={pitches.indexOf(pitch)}
            labelledBy={id}
            name="pitch"
            onChange={(index) => change({ pitch: pitches[index] })}
            options={pitches}
          />
        )}
      </Field>
      {/* A drawer has no controls, so a phone does not offer their style. */}
      <div data-for="desk">
        <Field control label={t.prefsControls}>
          {(id) => (
            <Slide
              at={handAt}
              labelledBy={id}
              name="hand"
              onChange={(index) => change({ hand: hands[index] })}
              options={[t.system, t.prefsMac, t.prefsWindows]}
            />
          )}
        </Field>
      </div>
    </div>
  )

  const right = (
    <div className="list">
      <Field control label={t.theme}>
        {(id) => (
          <Slide
            at={themeAt}
            labelledBy={id}
            name="theme"
            onChange={(index) => change({ theme: themes[index] })}
            options={[t.system, t.dark, t.light]}
          />
        )}
      </Field>
      <Field control label={t.prefsStartUp}>
        {(id) => (
          <div className="grid" data-columns="2">
            <Dip
              cap={t.prefsUp}
              labelledBy={id}
              onChange={(index, now) => {
                if (switches[index] === 'boot' && now) setBoot((count) => count + 1)
                change({ [switches[index]]: now ? 'on' : 'off' })
              }}
              said={[t.prefsOff, t.prefsOn]}
              switches={[
                { label: t.prefsBoot, on: on.boot },
                { label: t.prefsStart, on: on.start },
                { label: t.prefsRemember, on: on.remember },
              ]}
            />
          </div>
        )}
      </Field>
      <Field control label={t.prefsClock}>
        {(id) => (
          <>
            <Lamps time={time} />
            <Slide
              at={clock === 'yours' ? 1 : 0}
              labelledBy={id}
              name="clock"
              onChange={(index) => change({ clock: index ? 'yours' : null })}
              options={[place, t.prefsYours]}
            />
          </>
        )}
      </Field>
      <Field control label={t.prefsLanguage}>
        {(id) => (
          <Slide
            at={languages.indexOf(language)}
            labelledBy={id}
            langs={[...languages]}
            name="language"
            // The same address in the other language: a plain load, as any link to it.
            onChange={() => location.assign(toAddress(other, path))}
            options={languages.map((one) => names[one])}
          />
        )}
      </Field>
    </div>
  )

  return (
    <Section>
      <div className="grid" data-columns="2">
        {left}
        {right}
      </div>
    </Section>
  )
}

// Preferences: every setting a visitor can change, kept on the device, and at its foot a reset, a restart and done.
export function preferencesWindow(props: Props & { close: () => void }): Parts {
  const { t, language } = props
  return {
    body: <Body {...props} />,
    foot: (
      <ButtonGroup cells>
        <Button
          label={t.factoryReset}
          onClick={() => change(Object.fromEntries(settings.map((name) => [name, null])))}
          tone="outline"
        />
        <ButtonLink
          href={toAddress(language, '/')}
          label={t.restart}
          // A restart begins a new session of this tab: its windows close and the intro plays again.
          onClick={() => {
            try {
              sessionStorage.clear()
            } catch {
              // A tab without storage has no session to end.
            }
          }}
          tone="outline"
        />
        <Button label={t.done} onClick={props.close} tone="solid" />
      </ButtonGroup>
    ),
  }
}
