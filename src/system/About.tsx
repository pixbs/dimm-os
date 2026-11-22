'use client'

import type { AboutView } from '@/data/views'
import { Card } from '@/ds/organisms/Card'
import { Live, surfaceFor } from '@/ds/organisms/Live'
import { Message } from '@/ds/organisms/Message'
import { Plate } from '@/ds/organisms/Plate'
import type { Dictionary } from '@/i18n/en'
import type { Parts } from '@/shell/OnDesk'

type Props = { t: Dictionary; about: AboutView; width: number }

// The marks stamped on the plate, in the order the dictionary names them.
const marks = ['star', 'ab', 'trash', 'eye-off'] as const

// The year and month of the commit this build was made from, and its first seven signs.
const version = process.env.SYSTEM_VERSION ?? ''
const serial = process.env.SYSTEM_COMMIT ?? ''

const say = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key]))

function Body({ t, about, width }: Props) {
  const code = about.name.toLocaleUpperCase().replaceAll(' ', '/')
  const { picture, title, text, actions } = about.inside

  return (
    <Plate
      facts={[
        { label: t.aboutModel, value: say(t.aboutVersion, { name: about.name, version }) },
        { label: t.aboutSerial, value: serial },
        ...(about.memory ? [{ label: t.aboutMemory, value: about.memory }] : []),
        ...about.facts,
      ]}
      foot={[t.aboutFoot, say(t.aboutRevision, { version })]}
      // Behind the plate: the owner's print and words, the ways on, and the way back.
      inside={(close) => (
        <div className="grid" data-columns="2">
          {picture && (
            <Card
              media={{
                ratio: '1:1',
                picture: {
                  src: picture.src,
                  alt: picture.alt,
                  lang: picture.lang,
                  position: picture.position,
                  span: Math.ceil(width / 2),
                  still: Boolean(picture.live),
                },
                live: picture.live ? <Live name={picture.live} /> : undefined,
              }}
              meta={[code, about.place]}
              surface={surfaceFor(picture.live) ?? 'paper'}
            />
          )}
          <Message
            actions={[
              ...actions.map((action, at) => ({
                ...action,
                tone: at === 0 ? ('solid' as const) : ('outline' as const),
              })),
              { label: t.aboutClose, onClick: close },
            ]}
            level="display"
            text={text ?? undefined}
            title={title ?? undefined}
          />
        </div>
      )}
      label={say(t.plate, { name: about.name })}
      marks={t.aboutMarks.map(([title, text], at) => ({ icon: marks[at], title, text }))}
      screws={t.screws}
      stamp={{ code: say(t.aboutVersion, { name: code, version }), note: about.place }}
      text={t.aboutTagline}
      title={about.name}
    />
  )
}

// About: the type plate of the system, held by four screws, and behind it who made it.
export function aboutWindow(props: Props): Parts {
  return { body: <Body {...props} /> }
}
