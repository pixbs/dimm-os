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
})
