import type { ReactNode } from 'react'

import type { Language } from '@/i18n/address'
import { named } from '@/i18n/keys'

import { Button } from '../molecules/Button'
import { ForDevice } from '../molecules/Key'
import { Link } from '../molecules/Link'
import { Row } from '../molecules/Row'
import { Tag } from '../molecules/Tag'
import { Toggle } from '../molecules/Toggle'
import type { Copy } from './copy/en'
import { Cap, Doc, Entry, Specs, Stage, type Surface, width } from './parts'

type Props = { t: Copy['rows']; language: Language }

// Rows on a flush stage of a frame's width.
function List(props: { surface?: Surface; width?: string; children: ReactNode }) {
  return (
    <Stage flush surface={props.surface} width={props.width ?? width.measure}>
      {props.children}
    </Stage>
  )
}

export function Rows({ t, language }: Props) {
  const { caps } = t
  const [says, said, second] = t.says
  const key = (letter: string) => <ForDevice text={named(language, ['mod', letter])} />
  const menu = 'calc(var(--h-regular) * 5)'
  const sides = [
    <Row
      end="plus"
      href="#"
      key="heading"
      scale="heading"
      side={{ index: '01', title: t.title, text: t.text }}
      text={[t.more, second]}
      title={says}
    />,
    <Row
      end="arrow-right"
      href="#"
      key="body"
      side={{ title: t.title, text: t.text }}
      text={t.more}
      title={said}
    />,
  ]
  // Every state on its own row; the compact list follows its frame, which shows no focus.
  const states = (size?: 'compact') => {
    const [plain, hover, pressed, current, selected, focus, disabled] = t.states
    const shared = {
      end: size ? undefined : ('arrow-right' as const),
      meta: size ? key('K') : t.meta,
      size,
    }
    return [
      <Row {...shared} href="#" key="default" title={plain} />,
      <Row {...shared} href="#" key="hover" state="hover" title={hover} />,
      <Row {...shared} href="#" key="pressed" state="pressed" title={pressed} />,
      <Row {...shared} current href="#" key="current" title={current} />,
      <Row {...shared} key="selected" pressed title={selected} />,
      !size && <Row {...shared} href="#" key="focus" state="focus" title={focus} />,
      <Row {...shared} disabled key="disabled" title={disabled} />,
    ]
  }

  return (
    <Doc text={t.doc}>
      <Entry text={t.row}>
        <Cap label={caps[0]}>
          <List>
            <Row
              end="arrow-right"
              href="#"
              index="01"
              meta={t.meta}
              text={t.about}
              title={t.title}
            />
          </List>
        </Cap>
        <Specs caps={caps.slice(1, 3)}>
          <List width={width.dialog}>
            <Row title={t.title} />
            <Row title={t.title} />
          </List>
          <List width={width.dialog}>
            <Row text={t.more} title={t.title} />
            <Row text={t.shortText} title={t.longTitle} />
          </List>
        </Specs>
        <Cap label={caps[3]}>
          <List>
            <Row index="01" title={t.title} />
            <Row icon="folder" title={t.title} />
            <Row media={null} text={t.text} title={t.title} />
            <Row lead={<span className="dot" data-tone="signal" />} title={t.title} />
            <Row lead={<Toggle defaultChecked kind="check" />} title={t.title} toggles />
            <Row lead={<Toggle defaultChecked kind="radio" />} title={t.title} toggles />
          </List>
        </Cap>
        <Cap label={caps[4]}>
          <List>
            <Row meta={t.meta} title={t.title} />
            <Row end="arrow-right" href="#" title={t.title} />
            <Row end="arrow-up-right" href="#" meta={t.meta} title={t.title} />
            <Row title={t.title} trail={<Tag>{t.tag}</Tag>} />
            <Row
              text={t.text}
              title={t.title}
              toggles
              trail={<Toggle defaultChecked kind="switch" />}
            />
            <Row end="chevron-down" href="#" title={t.title} />
          </List>
        </Cap>
        <Specs caps={caps.slice(5, 8)}>
          <List width={width.dialog}>
            <Row label={t.label} value={t.value} />
            <Row label={t.label} value={t.longValue} />
            <Row label={t.label} value={<Link href="https://example.com">{t.value}</Link>} />
          </List>
          <List width={width.popover}>
            <Row above label={t.label} value={t.value} />
            <Row above label={t.label} value={t.wrapValue} />
          </List>
          <List width={width.dialog}>
            <Row
              label={t.label}
              trail={<Button icon="copy" name={t.copy} size="compact" />}
              value={t.value}
            />
            <Row label={t.label} trail={<Tag>{t.tag}</Tag>} value={t.value} />
          </List>
        </Specs>
        <Cap label={caps[8]}>
          <List width={width.dialog}>
            <Row expanded={false} text={t.opened} title={t.title} />
            <Row expanded text={t.opened} title={t.title} />
            <Row expanded={false} text={t.opened} title={t.title} />
          </List>
        </Cap>
        <Cap label={caps[9]}>
          <List>
            {[undefined, t.about, undefined].map((text, index) => (
              <Row
                end="arrow-right"
                href="#"
                index={index < 2 ? `0${index + 1}` : undefined}
                key={index}
                meta={index < 2 ? t.meta : undefined}
                scale="heading"
                text={text}
                title={t.title}
              />
            ))}
          </List>
        </Cap>
        <Specs caps={caps.slice(10, 12)}>
          <List>{sides}</List>
          <List width={width.popover}>
            <div className="cq">
              <div>{sides}</div>
            </div>
          </List>
        </Specs>
        <Cap label={caps[12]}>
          <List surface="raised" width={menu}>
            <Row meta={key('N')} size="compact" title={t.title} />
            <Row meta={key('O')} size="compact" title={t.title} />
            <Row icon="check" size="compact" title={t.title} />
            <Row end="chevron-right" size="compact" title={t.title} />
          </List>
        </Cap>
        <Specs caps={caps.slice(13, 15)}>
          <List width={width.dialog}>{states()}</List>
          <List surface="raised" width={menu}>
            {states('compact')}
          </List>
        </Specs>
        <Cap label={caps[15]}>
          <List width={width.popover}>
            <Row label={t.long[0]} value={t.long[1]} />
            <Row
              end="arrow-right"
              href="#"
              index="01"
              meta={t.meta}
              text={t.long[1]}
              title={t.long[2]}
            />
            <Row above label={t.long[3]} value={t.long[1]} />
          </List>
        </Cap>
        <Cap label={caps[16]}>
          <Specs caps={['paper', 'orange', 'raised']} tight>
            {(['paper', 'orange', 'raised'] as const).map((surface) => (
              <List key={surface} surface={surface} width={width.popover}>
                <Row
                  end="arrow-right"
                  href="#"
                  index="01"
                  meta={t.meta}
                  text={t.text}
                  title={t.title}
                />
                <Row
                  end="arrow-right"
                  href="#"
                  index="02"
                  meta={t.meta}
                  state="hover"
                  title={t.states[1]}
                />
                <Row end="arrow-right" index="03" meta={t.meta} pressed title={t.states[4]} />
              </List>
            ))}
          </Specs>
        </Cap>
      </Entry>
    </Doc>
  )
}
