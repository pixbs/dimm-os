import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const lint = async (code: string, filePath: string) => {
  const [result] = await new ESLint().lintText(code, { filePath })
  return result.messages.filter((message) => message.severity === 2).map(({ ruleId }) => ruleId)
}

describe('the lint', () => {
  it('fails a stray import of the whole of Motion, on the desk as anywhere', async () => {
    for (const file of ['src/ds/stray.tsx', 'src/shell/stray.tsx']) {
      expect(await lint("import { motion } from 'motion/react'\n", file)).toEqual([
        'no-restricted-imports',
      ])
      expect(await lint("import * as motion from 'motion/react-client'\n", file)).toEqual([
        'no-restricted-imports',
      ])
    }
  })

  it('lets the lazy parts of Motion through', async () => {
    const lazy =
      "import { AnimatePresence } from 'motion/react'\nimport * as m from 'motion/react-m'\n"
    expect(await lint(`${lazy}export { AnimatePresence, m }\n`, 'src/ds/lazy.tsx')).toEqual([])
  })

  it('fails a move made by hand from the box of an element, outside the motion vocabulary', async () => {
    // The move the waiting screen once made for itself.
    const travel = `export function travel(from: Element, to: Element) {
  const [a, b] = [from.getBoundingClientRect(), to.getBoundingClientRect()]
  from.animate(
    [
      { transformOrigin: '0 0', transform: 'none' },
      {
        transformOrigin: '0 0',
        transform: \`translate(\${b.left - a.left}px, \${b.top - a.top}px) scale(\${b.width / a.width})\`,
      },
    ],
    { duration: 320, fill: 'forwards' },
  )
}
`
    expect(await lint(travel, 'src/shell/stray.ts')).toEqual(['moves/by-hand', 'moves/by-hand'])
    expect(await lint(travel, 'src/ds/motion/stray.ts')).toEqual([])
    // A box read for anything else passes.
    const read = 'export const top = (part: Element) => part.getBoundingClientRect().top\n'
    expect(await lint(read, 'src/shell/stray.ts')).toEqual([])
  })
})
