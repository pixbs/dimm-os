'use client'

import { useId, useSyncExternalStore } from 'react'

import { change } from '@/ds/atoms/settings'
import { useChosen, useSetting } from '@/ds/atoms/useSetting'
import { Bar, BarText } from '@/ds/molecules/Bar'
import { Button, ButtonGroup } from '@/ds/molecules/Button'
import { Field } from '@/ds/molecules/Field'
import { Heading } from '@/ds/molecules/Heading'
import { Keys } from '@/ds/molecules/Key'
import { Link } from '@/ds/molecules/Link'
import { Row } from '@/ds/molecules/Row'
import { Slide } from '@/ds/molecules/Slide'
import { Tag } from '@/ds/molecules/Tag'
import { Toggle } from '@/ds/molecules/Toggle'
import { Decipher } from '@/ds/motion/Decipher'
import { List } from '@/ds/organisms/List'
import { Specimen } from '@/ds/organisms/Specimen'
import { Section } from '@/ds/sections/Section'
import type { Language } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { named } from '@/i18n/keys'
import type { Parts } from '@/shell/OnDesk'

type Props = { t: Dictionary; language: Language; email: string }

// What this window sets, which its reset hands back to the device.
const names = [
  'theme',
  'contrast',
  'plain',
  'underline',
  'spacing',
  'motion',
  'pause',
  'single',
  'shortcuts',
]
const themes = [null, 'dark', 'light']

// What the device asks for, which the server does not know.
const useAsks = (feature: string) =>
  useSyncExternalStore(
    (changed) => {
      const query = matchMedia(`(${feature})`)
      query.addEventListener('change', changed)
      return () => query.removeEventListener('change', changed)
    },
    () => matchMedia(`(${feature})`).matches,
    () => null,
  )

// A setting as a row that is its switch; one that follows the device says so until it is touched.
function Setting(props: {
  name: string
  on: string
  off: string
  title: string
  text: string
  device?: boolean
  system: string
}) {
  const { name, on, off } = props
  const value = useSetting(name)
  const chosen = useChosen(name)

  return (
    <Row
      text={props.text}
      title={props.title}
      toggles
      trail={
        <>
          {props.device && chosen === null && value !== null && <Tag>{props.system}</Tag>}
          <Toggle
            checked={value === on}
            kind="switch"
            onChange={(event) => change({ [name]: event.currentTarget.checked ? on : off })}
          />
        </>
      }
    />
  )
}

function Body({ t, language, email }: Props) {
  const theme = useSetting('theme')
  const themeAt = themes.indexOf(useChosen('theme'))
  const motion = useSetting('motion')
  const pause = useSetting('pause')
  const still = motion === 'reduce' || pause === 'on'
  const label = useId()
  const asks = {
    light: useAsks('prefers-color-scheme: light'),
    contrast: useAsks('prefers-contrast: more'),
    transparency: useAsks('prefers-reduced-transparency: reduce'),
    motion: useAsks('prefers-reduced-motion: reduce'),
  }
  const said = (value: boolean | null, yes: string, no: string) =>
    value === null ? '' : value ? yes : no
  const shared = { system: t.system }

  return (
    <Section>
      <div className="grid" data-columns="3">
        <div className="grid__stack">
          <Heading level="title" page text={t.accLead} title={t.accessibility} />
          <Specimen
            caption={t.accSpecimenCaption}
            name={t.accSpecimenName}
            paused={still ? t.accPaused : null}
            text={
              <>
                {t.accSpecimenText} <span className="link">{t.accSpecimenLink}</span>
              </>
            }
            title={t.accSpecimenTitle}
          />
          <List head={{ title: t.accAsks, end: '' }} lines>
            <Row meta={said(asks.light, t.light, t.dark)} title={t.theme} />
            <Row meta={said(asks.contrast, t.accMore, t.accStandard)} title={t.accContrast} />
            <Row
              meta={said(asks.transparency, t.accReduced, t.accStandard)}
              title={t.accTransparency}
            />
            <Row meta={said(asks.motion, t.accReduced, t.accStandard)} title={t.accMotionAsks} />
          </List>
        </div>
        <div className="grid__stack">
          <List head={{ title: t.accSeeing, end: '' }} lines>
            <Field
              control
              help={
                <Decipher>
                  {
                    [
                      theme === 'light' ? t.prefsThemeLight : t.prefsThemeDark,
                      t.prefsDark,
                      t.prefsLight,
                    ][themeAt]
                  }
                </Decipher>
              }
              label={<span id={label}>{t.theme}</span>}
            >
              {() => (
                <Slide
                  at={themeAt}
                  labelledBy={label}
                  name="theme"
                  onChange={(index) => change({ theme: themes[index] })}
                  options={[t.system, t.dark, t.light]}
                />
              )}
            </Field>
            <Setting
              {...shared}
              device
              name="contrast"
              off="standard"
              on="more"
              {...t.accMoreContrast}
            />
            <Setting {...shared} device name="plain" off="off" on="on" {...t.accPlain} />
            <Setting {...shared} name="underline" off="off" on="on" {...t.accUnderline} />
          </List>
          <div className="grid__stack">
            <List head={{ title: t.accReading, end: '' }} lines>
              <Setting {...shared} name="spacing" off="standard" on="wide" {...t.accSpacing} />
              <Row
                text={t.accSizeText}
                title={t.accSize}
                trail={<Keys names={[named(language, ['mod']), '+']} />}
              />
            </List>
            <List head={{ title: t.accMoving, end: '' }} lines>
              <Setting {...shared} device name="motion" off="full" on="reduce" {...t.accMotion} />
              <Setting {...shared} device name="pause" off="off" on="on" {...t.accPause} />
              <Setting {...shared} name="single" off="off" on="on" {...t.accSingle} />
              <Setting {...shared} name="shortcuts" off="off" on="on" {...t.accShortcuts} />
            </List>
            <p className="t-body">
              {t.accWrite} <Link href={`mailto:${email}`}>{email}</Link>.
            </p>
          </div>
        </div>
      </div>
    </Section>
  )
}

// Accessibility: what a visitor can change to read and move more easily, a specimen that answers at once, and at its foot
// a reset to the device and done.
export function accessibilityWindow(props: Props & { close: () => void }): Parts {
  const { t } = props
  return {
    body: <Body {...props} />,
    foot: (
      <ButtonGroup cells>
        <Button
          label={t.reset}
          onClick={() => change(Object.fromEntries(names.map((name) => [name, null])))}
          tone="outline"
        />
        <Button label={t.done} onClick={props.close} tone="solid" />
      </ButtonGroup>
    ),
    status: (
      <Bar line="above" size="compact">
        <BarText>{t.prefsSaved}</BarText>
      </Bar>
    ),
  }
}
