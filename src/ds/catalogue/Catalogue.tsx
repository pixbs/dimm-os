import './catalogue.css'

import { type Language, languages, toAddress } from '@/i18n/address'
import { getDictionary } from '@/i18n/dictionaries'

import { Actions } from './Actions'
import { Colour } from './Colour'
import { Icons } from './Icons'
import { Index } from './Index'
import { Motion } from './Motion'
import { Settings } from './Settings'
import { Space } from './Space'
import { Type } from './Type'

const copy = {
  en: () => import('./copy/en').then((module) => module.default),
  de: () => import('./copy/de').then((module) => module.default),
}

export const pages = ['index', 'colour', 'type', 'space', 'icons', 'motion', 'actions'] as const

type Name = (typeof pages)[number]

const path = (name: Name) => (name === 'index' ? '/catalogue' : `/catalogue/${name}`)

export async function Catalogue({ language, name }: { language: Language; name: Name }) {
  const t = await copy[language]()

  return (
    <main className="doc">
      <nav className="doc__nav">
        {pages.map((page) => (
          <a
            aria-current={page === name ? 'page' : undefined}
            href={toAddress(language, path(page))}
            key={page}
          >
            {t[page].doc[0]}
          </a>
        ))}
        {languages.map((other) => (
          <a
            aria-current={other === language ? 'true' : undefined}
            href={toAddress(other, path(name))}
            hrefLang={other}
            key={other}
            lang={other}
          >
            {other.toUpperCase()}
          </a>
        ))}
        <Settings reset={t.reset} />
      </nav>
      {name === 'index' && <Index t={t.index} />}
      {name === 'colour' && <Colour t={t.colour} />}
      {name === 'type' && <Type t={t.type} />}
      {name === 'space' && <Space t={t.space} />}
      {name === 'icons' && <Icons t={t.icons} />}
      {name === 'motion' && <Motion t={t.motion} />}
      {name === 'actions' && (
        <Actions language={language} t={t.actions} words={await getDictionary(language)} />
      )}
    </main>
  )
}
