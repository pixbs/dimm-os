import { Fragment, type ReactNode } from 'react'

import { Choices, Toggle } from '../molecules/Toggle'
import { Dial } from '../molecules/Dial'
import { Dip } from '../molecules/Dip'
import { Field } from '../molecules/Field'
import { Row } from '../molecules/Row'
import { Slide } from '../molecules/Slide'
import type { Copy } from './copy/en'
import { Cap, Doc, Entry, Specs, Stage, type Surface, Table, width } from './parts'
import { Turned } from './Turned'

type Props = { t: Copy['inputs'] }

// Rows on a flush stage of a frame's width, which is the window their layout answers to.
function List(props: { surface?: Surface; width: string; children: ReactNode }) {
  return (
    <Stage flush surface={props.surface} width={props.width}>
      <div className="cq">
        <div>{props.children}</div>
      </div>
    </Stage>
  )
}

function Fields({ t }: Props) {
  const [text, email, number, date, select, area, upload] = t.kinds
  const [empty, placeholder, focus, filled, required, help, error, locked, disabled] = t.states

  return (
    <Entry text={t.field}>
      <Cap label={t.fieldCaps[0]}>
        <List width={width.regular}>
          <Field kind="text" label={text} value={t.value} />
          <Field error={t.emailError} kind="email" label={email} value={t.email} />
          <Field kind="number" label={number} value="12" />
          <Field kind="date" label={date} value="2026-11-10" />
          <Field kind="select" label={select} options={t.options} value={t.option} />
          <Field kind="area" label={area} value={t.area} />
          <Field choose={t.choose} empty={t.empty} kind="upload" label={upload} />
        </List>
      </Cap>
      <Cap label={t.fieldCaps[1]}>
        <List width={width.popover}>
          <Field kind="text" label={text} value={t.value} />
          <Field kind="select" label={select} options={t.options} value={t.option} />
          <Field kind="area" label={area} value={t.areaShort} />
        </List>
      </Cap>
      <Cap label={t.fieldCaps[2]}>
        <List width={width.regular}>
          <Field kind="text" label={empty} />
          <Field kind="text" label={placeholder} placeholder={t.placeholder} />
          <Field kind="text" label={focus} state="focus" value={t.value} />
          <Field kind="text" label={filled} value={t.value} />
          <Field error={t.required} kind="text" label={required} required value={t.value} />
          <Field help={t.help} kind="text" label={help} value={t.value} />
          <Field error={t.error} invalid kind="text" label={error} value={t.value} />
          <Field kind="text" label={locked} locked value={t.value} />
          <Field disabled kind="text" label={disabled} value={t.value} />
        </List>
      </Cap>
      <Cap label={t.fieldCaps[3]}>
        <Specs caps={t.fieldCaps.slice(4)}>
          <List surface="paper" width={width.dialog}>
            <Field kind="text" label={text} value={t.value} />
            <Field kind="text" label={focus} state="focus" value={t.value} />
            <Field error={t.errorShort} invalid kind="text" label={error} value={t.value} />
            <Row title={t.setting} toggles trail={<Toggle defaultChecked kind="switch" />} />
          </List>
          <List surface="raised" width={width.dialog}>
            <Field kind="text" label={text} value={t.value} />
            <Field kind="select" label={select} options={t.options} value={t.option} />
            <Row lead={<Toggle defaultChecked kind="check" />} title={t.option} toggles />
          </List>
        </Specs>
      </Cap>
    </Entry>
  )
}

function Toggles({ t }: Props) {
  const kinds = ['check', 'radio', 'switch'] as const

  return (
    <Entry text={t.toggles}>
      <Stage>
        <div className="matrix">
          <span />
          {t.glyphStates.map((state, index) => (
            <p className="cap__label" id={`glyph-state-${index}`} key={state}>
              {state}
            </p>
          ))}
          {kinds.map((kind, row) => (
            <Fragment key={kind}>
              <p className="cap__label" id={`glyph-${row}`}>
                {t.glyphs[row]}
              </p>
              {t.glyphStates.map((state, index) => (
                <Toggle
                  aria-labelledby={`glyph-${row} glyph-state-${index}`}
                  defaultChecked={index % 2 === 1 || index === 4}
                  disabled={index === 4}
                  key={state}
                  kind={kind}
                  name={`glyph-${row}-${index}`}
                  state={index === 2 ? 'hover' : index === 3 ? 'focus' : undefined}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </Stage>
      <Specs caps={t.toggleCaps}>
        <List width={width.dialog}>
          <Row lead={<Toggle defaultChecked kind="check" />} title={t.agree} toggles />
          <Row lead={<Toggle kind="check" />} title={t.option} toggles />
        </List>
        <List width={width.dialog}>
          <Row
            text={t.changes}
            title={t.setting}
            toggles
            trail={<Toggle defaultChecked kind="switch" />}
          />
          <Row title={t.setting} toggles trail={<Toggle kind="switch" />} />
        </List>
        <List width={width.dialog}>
          <Field label={t.radio}>
            {(id) => (
              <Choices
                labelledBy={id}
                name="radio"
                options={t.choices.slice(0, 3)}
                value={t.choices[0]}
              />
            )}
          </Field>
        </List>
        <List width={width.regular}>
          <Field label={t.radio}>
            {(id) => (
              <Choices
                columns={2}
                labelledBy={id}
                name="columns"
                options={t.choices}
                value={t.choices[1]}
              />
            )}
          </Field>
        </List>
        <List surface="paper" width={width.dialog}>
          <Field above kind="area" label={t.kinds[5]} ruled value={t.ruled} />
        </List>
      </Specs>
    </Entry>
  )
}

function Slides({ t }: Props) {
  const three = [t.label, t.label, t.label]
  const slides = [
    { at: 0, options: three },
    { at: 1, options: three.slice(1) },
    { at: 2, options: ['5', '6', '8', '10', '12'] },
    { at: 1, options: three, surface: 'paper' as const },
  ]

  return (
    <Entry text={t.slide}>
      <div className="spec">
        {slides.map((slide, index) => (
          <Cap id={`slide-${index}`} key={index} label={t.slideCaps[index]}>
            <Stage surface={slide.surface}>
              <Slide
                at={slide.at}
                labelledBy={`slide-${index}`}
                name={`slide-${index}`}
                options={slide.options}
              />
            </Stage>
          </Cap>
        ))}
      </div>
      <Cap label={t.slideCaps[4]}>
        <List width={width.dialog}>
          {[three, three.slice(1)].map((options, index) => (
            <Field control help={t.means} key={index} label={t.setting}>
              {(id) => (
                <Slide at={index} labelledBy={id} name={`setting-${index}`} options={options} />
              )}
            </Field>
          ))}
        </List>
      </Cap>
    </Entry>
  )
}

function Dips({ t }: Props) {
  const switches = t.dipSaid.map((label, index) => ({ label, on: index < 2 }))

  return (
    <Entry text={t.dip}>
      <div className="spec">
        <Cap id="dip" label={t.dipCaps[0]}>
          <Stage>
            <Dip cap={t.dipCap} labelledBy="dip" switches={switches} />
          </Stage>
        </Cap>
        <Cap label={t.dipCaps[1]}>
          <List width={width.dialog}>
            <Field control label={t.setting}>
              {(id) => (
                <Dip
                  cap={t.dipCap}
                  labelledBy={id}
                  said={t.dipWords}
                  switches={[switches[0], { label: switches[1].label }]}
                />
              )}
            </Field>
          </List>
        </Cap>
      </div>
    </Entry>
  )
}

function Dials({ t }: Props) {
  return (
    <Entry text={t.dial}>
      <div className="spec">
        {[100, 400].map((value, index) => (
          <Cap id={`dial-${index}`} key={value} label={t.dialCaps[index]}>
            <Stage>
              <Dial labelledBy={`dial-${index}`} max={999} min={100} value={value} />
            </Stage>
          </Cap>
        ))}
        <Cap label={t.dialCaps[2]}>
          <List width={width.dialog}>
            <Turned counts={t.counts} />
          </List>
        </Cap>
      </div>
    </Entry>
  )
}

export function Inputs({ t }: Props) {
  return (
    <Doc text={t.doc}>
      <Fields t={t} />
      <Toggles t={t} />
      <Slides t={t} />
      <Dips t={t} />
      <Dials t={t} />
      <Entry text={t.builder}>
        <Table
          classes={['t-mono c-muted', '']}
          columns="30 1fr"
          head={t.builderHead}
          rows={t.builderRows}
        />
      </Entry>
    </Doc>
  )
}
