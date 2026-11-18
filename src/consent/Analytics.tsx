'use client'

import { useEffect } from 'react'

import { type Choice, useChoice } from './choice'
import { registry } from './registry'

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST
const [entry] = registry
const YEAR = 365

// What analytics keeps on the device, as the registry names it, and its consent mark.
const ours = /^_*ph_/

function forget() {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim()
    if (ours.test(name)) document.cookie = `${name}=; Max-Age=0; path=/`
  }
  for (const store of [localStorage, sessionStorage])
    for (const name of Object.keys(store)) if (ours.test(name)) store.removeItem(name)
}

let loaded = false

// Whether analytics may run: it is set up, a guest said yes to it, and no visitor is signed in.
export const allowed = (choice: Choice | null, visitor: boolean, key = KEY, host = HOST) =>
  Boolean(key && host && !visitor && choice?.on.includes(entry.id))

// Analytics as the registry declares it: counts of visits and clicks, a cookie for a year, and nothing else it can
// do. It loads after a yes alone, never for a signed-in visitor, and a no taken back clears it and starts the page
// afresh, so nothing of it runs on.
export function Analytics({ visitor }: { visitor: boolean }) {
  const choice = useChoice()
  const yes = allowed(choice, visitor)
  const version = choice?.version
  const at = choice?.at

  useEffect(() => {
    if (!yes) {
      if (!loaded) return
      void import('posthog-js').then(({ default: posthog }) => {
        posthog.opt_out_capturing()
        posthog.set_config({ disable_persistence: true })
        forget()
        location.reload()
      })
      return
    }
    if (loaded) return
    loaded = true
    void import('posthog-js').then(({ default: posthog }) =>
      posthog.init(KEY!, {
        api_host: HOST,
        persistence: 'cookie',
        cookie_expiration: YEAR,
        person_profiles: 'identified_only',
        capture_pageview: 'history_change',
        capture_pageleave: false,
        autocapture: true,
        rageclick: false,
        capture_dead_clicks: false,
        enable_heatmaps: false,
        capture_performance: false,
        capture_exceptions: false,
        disable_session_recording: true,
        disable_surveys: true,
        disable_web_experiments: true,
        disable_product_tours: true,
        disable_conversations: true,
        advanced_disable_flags: true,
        disable_external_dependency_loading: true,
        // Every event says which consent it rests on, and when it was given.
        before_send: (event) =>
          event && {
            ...event,
            properties: { ...event.properties, consent_version: version, consent_at: at },
          },
      }),
    )
  }, [yes, version, at])

  return null
}
