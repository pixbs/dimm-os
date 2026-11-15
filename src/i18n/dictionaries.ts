import 'server-only'

import type { Language } from './address'

const dictionaries = {
  en: () => import('./en').then((module) => module.default),
  de: () => import('./de').then((module) => module.default),
}

export const getDictionary = (language: Language) => dictionaries[language]()
