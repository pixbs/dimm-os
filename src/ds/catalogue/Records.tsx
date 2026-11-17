import { Prose } from '../organisms/Prose'
import { Quote } from '../organisms/Quote'
import type { Copy } from './copy/en'
import { Doc, Entry, Specs, u } from './parts'

export function Records({ t }: { t: Copy['records'] }) {
  const [everything, bare] = t.caps
  const [before, strong, between, link, and, code, after] = t.paragraph
  const list = (tag: 'ul' | 'ol', items: string[]) =>
    `<${tag}>${items.map((item) => `<li>${item}</li>`).join('')}</${tag}>`
  const html = [
    `<h2>${t.two}</h2>`,
    `<p>${before} <strong>${strong}</strong>${between} <a class="link" href="#">${link}</a> ${and} <code>${code}</code>${after}</p>`,
    `<h3>${t.three}</h3>`,
    `<p>${t.shorter}</p>`,
    list('ul', t.items),
    `<h4>${t.four}</h4>`,
    list('ol', t.numbered),
    `<blockquote>${t.quote}</blockquote>`,
    '<hr />',
    `<p>${t.after}</p>`,
  ].join('')

  return (
    <Doc text={t.doc}>
      <Entry text={t.prose}>
        <Specs caps={[everything]}>
          <div className="cq" style={{ width: u(90) }}>
            <div className="stage" data-surface="window">
              <Prose html={html} />
            </div>
          </div>
        </Specs>
      </Entry>
      <Entry text={t.quoted}>
        <Specs caps={[bare]}>
          <div className="cq" style={{ width: u(90) }}>
            <div className="stage" data-surface="window">
              <Quote name={t.name} role={t.role} text={t.quotation} />
            </div>
          </div>
        </Specs>
      </Entry>
    </Doc>
  )
}
