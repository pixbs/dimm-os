// The field that draws the form where the screen sets it.
const HOME = 299

// The field number the setting holds until the dial picks a wallpaper; a step reads as the field at home.
export const fieldOf = (setting: string | null) => Number(setting) || HOME
