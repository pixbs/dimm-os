// Every wallpaper in the order of the list, each with whether it has colours to show.
export const wallpapers = { passage: true }

// One way a wallpaper is drawn: through which filter, and whether in colour.
export type Step = {
  wallpaper: keyof typeof wallpapers
  filter: 'dots' | 'ascii'
  colour: boolean
}

// The setting holds a step as words. Anything else, like the field number of an earlier visit, reads as the default.
export function step(setting?: string | null): Step {
  const [wallpaper, filter, colour] = (setting ?? '').split(' ')
  if (!Object.hasOwn(wallpapers, wallpaper) || (filter !== 'dots' && filter !== 'ascii'))
    return { wallpaper: 'passage', filter: 'dots', colour: true }
  const name = wallpaper as keyof typeof wallpapers
  return { wallpaper: name, filter, colour: wallpapers[name] && colour === 'colour' }
}

// Every step of the dial as the setting writes it: each wallpaper in the order of the list, in dots before signs,
// and in colour first where it has colours.
export const steps = Object.entries(wallpapers).flatMap(([name, colours]) =>
  (['dots', 'ascii'] as const).flatMap((filter) =>
    colours ? [`${name} ${filter} colour`, `${name} ${filter}`] : [`${name} ${filter}`],
  ),
)

// The place on the dial of the step a setting holds.
export function stepAt(setting?: string | null) {
  const { wallpaper, filter, colour } = step(setting)
  return steps.indexOf(`${wallpaper} ${filter}${colour ? ' colour' : ''}`)
}
