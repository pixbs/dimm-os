// Runs in the document head before first paint, so it stands alone: it is sent as its own text, given there the
// addresses of the desk in each language.
export function apply(homes: string[] = []) {
  const stored = (name: string) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  }
  const asks = (feature: string) => matchMedia(`(${feature})`).matches
  const apple = /Mac|iPhone|iPad/.test(navigator.platform)
  const motion = stored('motion') ?? (asks('prefers-reduced-motion: reduce') ? 'reduce' : 'full')

  // What the device asks for, until the visitor chooses.
  const device = {
    theme: asks('prefers-color-scheme: light') ? 'light' : 'dark',
    contrast: asks('prefers-contrast: more') ? 'more' : 'standard',
    pitch: '8',
    // The field number that seeds the wallpaper's form.
    wallpaper: '299',
    hand: apple ? 'dots' : 'squares',
    keys: apple ? 'apple' : 'other',
    motion,
    pause: asks('prefers-reduced-motion: reduce') ? 'on' : 'off',
    spacing: 'standard',
    underline: 'off',
    single: 'off',
    shortcuts: 'on',
    boot: motion === 'reduce' ? 'off' : 'on',
    // The windows marked to open at start do, the clock shows the site's time, and windows last for the tab.
    start: 'on',
    clock: 'site',
    remember: 'off',
  }
  for (const [name, value] of Object.entries(device)) {
    document.documentElement.dataset[name] = stored(name) ?? value
  }

  // The intro plays on the first visit to the desk in this tab, never on a deep link, and not when motion is reduced
  // or it is switched off; that it has played is kept for this tab's session alone.
  if (!homes.length || !homes.includes(location.pathname)) return
  const root = document.documentElement.dataset
  let played: string | null = null
  try {
    played = sessionStorage.getItem('intro')
  } catch {
    // A tab without storage plays it on every visit to the desk.
  }
  if (!played && root.motion !== 'reduce' && root.boot === 'on') root.intro = 'play'
}

// Every setting a visitor can change, which a reset hands back to the device.
export const settings = [
  'theme',
  'contrast',
  'pitch',
  'wallpaper',
  'hand',
  'motion',
  'pause',
  'spacing',
  'underline',
  'single',
  'shortcuts',
  'boot',
  'start',
  'clock',
  'remember',
]

// What a tab without storage chose: it holds for this page.
const unkept: Record<string, string | null> = {}

// The value the visitor chose, or null where the device decides.
export function chosen(name: string): string | null {
  if (name in unkept) return unkept[name]
  try {
    return localStorage.getItem(name)
  } catch {
    return null
  }
}

// A value is written only when the visitor changes it, null hands it back to the device, and a reset crossfades once.
export function change(values: Record<string, string | null>) {
  try {
    for (const [name, value] of Object.entries(values)) {
      if (value === null) localStorage.removeItem(name)
      else localStorage.setItem(name, value)
    }
  } catch {
    // A tab without storage still changes the screen, until it is closed.
    Object.assign(unkept, values)
  }

  const set = () => {
    apply()
    for (const [name, value] of Object.entries(unkept))
      if (value !== null) document.documentElement.dataset[name] = value
  }
  const crossfades = Object.keys(values).some((name) =>
    ['theme', 'contrast', 'hand'].includes(name),
  )
  if (crossfades && document.startViewTransition) document.startViewTransition(set)
  else set()
}
