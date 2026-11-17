export const languages = ['en', 'de'] as const

export type Language = (typeof languages)[number]

// Each language by its own name, the same in every language.
export const names: Record<Language, string> = { en: 'English', de: 'Deutsch' }

// The first language has no prefix, so an English address is the window's path alone.
const [unprefixed] = languages

export const hasLanguage = (value: string): value is Language =>
  (languages as readonly string[]).includes(value)

export function fromAddress(pathname: string): { language: Language; path: string } {
  const [, first = '', ...rest] = pathname.split('/')
  return hasLanguage(first) && first !== unprefixed
    ? { language: first, path: `/${rest.join('/')}` }
    : { language: unprefixed, path: pathname }
}

export function toAddress(language: Language, path: string): string {
  return language === unprefixed ? path : toRoute(language, path)
}

// Inside the app every language has its own segment: /en/work, /de/work.
export function toRoute(language: Language, path: string): string {
  return `/${language}${path === '/' ? '' : path}`
}
