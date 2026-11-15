// Runs in the document head before first paint, so it stands alone: it is sent as its own text.
export function apply() {
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
    hand: apple ? 'dots' : 'squares',
    keys: apple ? 'apple' : 'other',
    motion,
    pause: asks('prefers-reduced-motion: reduce') ? 'on' : 'off',
    spacing: 'standard',
    underline: 'off',
    single: 'off',
    shortcuts: 'on',
    boot: motion === 'reduce' ? 'off' : 'on',
  }
  for (const [name, value] of Object.entries(device)) {
    document.documentElement.dataset[name] = stored(name) ?? value
  }
}

// A value is written only when the visitor changes it; null hands the setting back to the device.
export function change(name: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(name)
    else localStorage.setItem(name, value)
  } catch {
    // A tab without storage keeps what the device asks for.
    return
  }

  const crossfades = ['theme', 'contrast', 'hand'].includes(name)
  if (crossfades && document.startViewTransition) document.startViewTransition(apply)
  else apply()
}
