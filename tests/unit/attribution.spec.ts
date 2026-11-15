import { describe, expect, it } from 'vitest'

import {
  judgeCommit,
  judgePullRequest,
  loadPatterns,
  strip,
} from '../../scripts/attribution/check.mjs'

const patterns = loadPatterns()

const person = { name: 'Dimm', email: 'owner@example.com' }

function commit({
  message = 'feat: window frame',
  author = person,
  committer = person,
  type = 'User',
} = {}) {
  return {
    sha: '0123456789abcdef',
    commit: { message, author, committer },
    author: { type },
    committer: { type: 'User' },
  }
}

function pull(overrides: Record<string, unknown> = {}) {
  return {
    title: 'feat: window frame',
    body: 'Closes #12\n\nAdds the window frame.',
    head: { ref: 'feat/12-window-frame' },
    user: { login: 'pixbs', type: 'User' },
    ...overrides,
  }
}

const issue = { number: 12 }

describe('strip', () => {
  it('removes trailers and footers a tool appends, and the blank lines they leave', () => {
    const message = [
      'feat: window frame',
      '',
      'Adds the frame.',
      '',
      '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
      '',
      'Co-Authored-By: Claude <noreply@anthropic.com>',
      '',
    ].join('\n')
    expect(strip(message, patterns)).toBe('feat: window frame\n\nAdds the frame.\n')
  })

  it('removes a rule left hanging above a footer', () => {
    const body = 'Closes #12\n\n---\nGenerated with Codex\n'
    expect(strip(body, patterns)).toBe('Closes #12\n')
  })

  it('leaves a clean message untouched', () => {
    const message = 'fix: keep the address\n\nBack returns to the window in front before.\n'
    expect(strip(message, patterns)).toBe(message)
  })
})

describe('a clean pull request', () => {
  it('has no problems', () => {
    expect(judgePullRequest(pull(), [commit()], issue, patterns)).toEqual([])
  })
})

describe('each kind of problem', () => {
  const cases: [string, Parameters<typeof judgePullRequest>, RegExp][] = [
    [
      'attribution in the title',
      [pull({ title: 'feat: frame generated with Claude' }), [commit()], issue, patterns],
      /^title: attribution/,
    ],
    [
      'attribution in the description',
      [
        pull({ body: 'Closes #12\n\nhttps://claude.ai/code/session_01' }),
        [commit()],
        issue,
        patterns,
      ],
      /^description: attribution/,
    ],
    [
      'a session link in a commit message',
      [pull(), [commit({ message: 'feat: frame\n\nclaude-session: 01ab' })], issue, patterns],
      /attribution in the message/,
    ],
    [
      'a co-author trailer for a tool in a commit message',
      [
        pull(),
        [commit({ message: 'feat: frame\n\nCo-authored-by: Copilot <copilot@github.com>' })],
        issue,
        patterns,
      ],
      /attribution in the message/,
    ],
    [
      'a tool as commit author',
      [
        pull(),
        [commit({ author: { name: 'Claude', email: 'noreply@anthropic.com' } })],
        issue,
        patterns,
      ],
      /the author .* is a tool or a bot/,
    ],
    [
      'a bot as commit committer',
      [
        pull(),
        [commit({ committer: { name: 'github-actions[bot]', email: 'actions@github.com' } })],
        issue,
        patterns,
      ],
      /the committer .* is a tool or a bot/,
    ],
    [
      'a GitHub account of type Bot as author',
      [pull(), [commit({ type: 'Bot' })], issue, patterns],
      /the author .* is a tool or a bot/,
    ],
    [
      "a tool's name in the branch",
      [pull({ head: { ref: 'claude/window-frame' } }), [commit()], issue, patterns],
      /^branch: /,
    ],
    [
      'a bot as the pull request author',
      [pull({ user: { login: 'renovate[bot]', type: 'Bot' } }), [commit()], issue, patterns],
      /^author: /,
    ],
    [
      'a title that is not a Conventional Commit',
      [pull({ title: 'Window frame' }), [commit()], issue, patterns],
      /^title: not a Conventional Commit/,
    ],
    [
      'no linked issue',
      [pull({ body: 'Adds the window frame.' }), [commit()], issue, patterns],
      /^description: no linked issue/,
    ],
    [
      'a linked number that is a pull request',
      [pull(), [commit()], { number: 12, pull_request: {} }, patterns],
      /not an issue of this repository/,
    ],
  ]

  it.each(cases)('%s', (_, args, expected) => {
    const problems = judgePullRequest(...args)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(expected)
  })

  it('judges a commit that reached main on its own', () => {
    const problems = judgeCommit(
      commit({
        message: 'feat: frame\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
        author: { name: 'Claude', email: 'noreply@anthropic.com' },
      }),
      patterns,
    )
    expect(problems).toEqual([
      expect.stringMatching(/attribution in the message/),
      expect.stringMatching(/the author .* is a tool or a bot/),
    ])
  })
})
