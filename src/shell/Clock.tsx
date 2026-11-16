'use client'

import { useSyncExternalStore } from 'react'

import type { Language } from '@/i18n/address'

// British English puts the day before the month.
const locales = { en: 'en-GB', de: 'de' }

const minute = () => Math.floor(Date.now() / 60000)
const ticks = (change: () => void) => {
  const timer = setInterval(change, 1000)
  return () => clearInterval(timer)
}

// The time where the site is. It shows once the page runs, so a static page never holds a time already past.
export function Clock({ language, zone }: { language: Language; zone: string }) {
  const at = useSyncExternalStore(ticks, minute, () => null)
  if (at === null) return <span className="bar__text" />

  const time = new Date(at * 60000)
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locales[language], { timeZone: zone, ...options }).format(time)

  return (
    <span className="bar__text">
      <time dateTime={time.toISOString()}>
        <span data-for="desk pointer">
          {format({ weekday: 'short', day: 'numeric', month: 'short' })}{' '}
        </span>
        {format({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}
      </time>
    </span>
  )
}
