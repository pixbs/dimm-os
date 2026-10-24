# Project standard — a minimal, fully filled repository that agents can run

Scope: Next.js + Payload + Bun projects owned by one person and worked on mostly by coding agents.
Derived from the review of `dimm-os`, `atmjet_website` and `claimlands-fable`
(`docs/refactor-analysis.md`, Parts II–IV). Every rule traces to a vendor document listed there
(§18); every number marked *budget* is this document's proposal, not a standard.

Three principles, in priority order:

1. **One source of truth per rule, enforced at the earliest point that can see the violation.**
   A rule lives in a lint config, a hook table or a test. Prose explains why and links to it.
   Hooks judge new files; lint judges changed files; CI repeats both. (Refactor analysis §14.)
2. **A budget, not a checklist.** The repository holds exactly the files GitHub recognises, one
   workflow per trigger, a dozen labels, five docs. Anything beyond the budget must displace
   something. (§13.)
3. **The owner does one thing: grant.** Every setup or operations task is Tier A (agent), Tier B
   (agent with a scoped credential) or Tier C (human identity, money, legal, sign-off). The first
   issue of a project is the Tier C grant; afterwards Tier C is rare and explicit. (§16.)

---

## 1. Layout and budgets

```
.
├── .github/
│   ├── CODEOWNERS
│   ├── CONTRIBUTING.md            # two lines: read AGENTS.md, open a task issue
│   ├── SECURITY.md
│   ├── ISSUE_TEMPLATE/
│   │   ├── config.yml
│   │   ├── 1-task.yml
│   │   ├── 2-bug.yml
│   │   └── 3-decision.yml         # optional
│   ├── pull_request_template.md
│   ├── dependabot.yml
│   ├── rulesets/master.json       # applied through the API, kept in git
│   └── workflows/
│       ├── ci.yml                 # the only required check: job `ci`
│       └── nightly.yml            # repeat pass, cross-browser, anything slow
├── .claude/
│   ├── settings.json              # hooks + deny rules (committed)
│   ├── hooks/check-path.mjs       # write-time naming / placement / Payload guard
│   ├── hooks/lint-file.mjs        # post-write eslint --fix + prettier feedback
│   └── rules/{payload,tests}.md   # path-scoped guidance
├── AGENTS.md                      # ≤ 120 lines; CLAUDE.md contains only `@AGENTS.md`
├── CLAUDE.md
├── LICENSE
├── README.md                      # what it is, how to run, where things are
├── docs/                          # ≤ 5 files + adr/ for decisions still in force
├── scripts/                       # ≤ 15 files, one per repeatable operation
├── src/
│   ├── app/                       # routes only; (frontend) and (payload) groups
│   ├── components/<area>/         # UI by area, kebab-case files
│   ├── collections/ globals/ blocks/ fields/   # Payload schema
│   ├── lib/ hooks/                # shared code
│   ├── migrations/                # generated; linguist-generated
│   ├── payload.config.ts
│   └── payload-types.ts           # generated; linguist-generated
├── tests/
│   ├── unit/ component/ integration/ e2e/
│   └── fixtures/ scripts/
├── eslint.config.mjs  lefthook.yml  next.config.ts  package.json  bun.lock  .bun-version
├── playwright.config.ts  postcss.config.mjs  tsconfig.json  vitest.config.ts  .prettierrc.json
└── .env.example  .gitignore  .gitattributes
```

| Budget (proposal) | Limit | Enforced by |
|---|---|---|
| Tracked root entries | ≤ 25 | review; `scripts/check-budgets.sh` in `ci` if wanted |
| Workflows | ≤ 2 | same |
| Issue templates | ≤ 3 + `config.yml` | same |
| Labels | ≤ 12 | `gh label list` in the setup check |
| `docs/` files | ≤ 5 + `adr/` | review |
| `scripts/` files | ≤ 15 | review |
| `AGENTS.md` | ≤ 120 lines | `wc -l` in `ci` |
| Tests vs source | tests ≤ source lines | review; the ratio is printed by `scripts/check-budgets.sh` |
| Data in git | types + migrations only | `.gitattributes` marks them generated; dumps go to releases |

What is deliberately **not** here: a `CODE_OF_CONDUCT.md` on a single-owner repo (add when a second
human contributes), a `CHANGELOG.md` for a deployed site (the squash log is the changelog; add Keep a
Changelog only for a published package), a `SUPPORT.md`, project boards, and a second agent guide.

## 2. Naming

| Thing | Rule | Enforced by |
|---|---|---|
| Files and folders under `src/`, `tests/`, `scripts/` | kebab-case: `window-frame.tsx`, `use-pointer-drag.ts`; middle extensions allowed: `foo.unit.test.ts` | `check-path.mjs` (new files), `check-file/filename-naming-convention` + `folder-naming-convention` (`NEXT_JS_APP_ROUTER_CASE` under `src/app`) |
| Next.js segments | `[slug]`, `[...all]`, `[[...all]]`, `(group)`, `@slot`, `_private` as documented; everything else kebab | same |
| React components | file kebab-case, export PascalCase: `window-frame.tsx` exports `WindowFrame` | `@typescript-eslint/naming-convention` (`function`: camelCase or PascalCase) |
| Identifiers | camelCase; types/interfaces PascalCase, no `I` prefix; constants UPPER_CASE only for true module-level constants; booleans `is/has/can/should…` | `@typescript-eslint/naming-convention` |
| Payload collection slugs | kebab-case plural: `media`, `articles`, `cookie-services` | architecture test |
| Payload field names | camelCase (JS identifier rules per Payload docs); files and images are `upload` fields, never `*Url` text | hook + architecture test |
| Tests | `tests/<suite>/<name>.<suite>.test.ts(x)`; `*.desktop.e2e.test.ts` / `*.mobile.e2e.test.ts` | vitest/playwright `include` globs; hook blocks colocated tests |
| Branches | `<type>/<issue>-<kebab-slug>`: `feat/42-window-snapping` | `ci` (PR head ref check) |
| Commits on a branch | free; squash-merged | — |
| PR title = squash commit subject | Conventional Commits, no emoji, ≤ 72 chars: `feat(desktop): snap windows to screen edges` | `ci` PR-title lint; repo setting `squash_merge_commit_title: PR_TITLE` |
| Labels | `type:task\|bug\|decision`, `area:<x>`, `ready`, `blocked`, `owner-action` | labels created once by the setup script |
| Env vars | `SCREAMING_SNAKE`, documented in `.env.example` with a one-line comment each | review |

Existing files keep their names. Case-only renames churn blame and break case-insensitive
checkouts; rename only when a file is rewritten anyway.

## 3. The `.github/` set

### `CODEOWNERS`

```
# Order matters: the last matching pattern wins. Owners need write access.
*                 @OWNER
/.github/         @OWNER
/src/collections/ @OWNER
/src/migrations/  @OWNER
```

### `ISSUE_TEMPLATE/config.yml`

```yaml
blank_issues_enabled: false
contact_links:
  - name: Security report
    url: https://github.com/OWNER/REPO/security/advisories/new
    about: Report a vulnerability privately; see SECURITY.md.
```

### `ISSUE_TEMPLATE/1-task.yml`

```yaml
name: Task
description: A unit of work an agent or a person can pick up and finish in one PR.
labels: ["type:task"]
body:
  - type: textarea
    id: goal
    attributes:
      label: Goal
      description: One paragraph. What is true when this is done, from the user's or operator's view.
    validations:
      required: true
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance criteria
      description: Checkable statements. Each becomes a test, a screenshot or a read-back of a setting.
      value: |
        - [ ]
        - [ ]
    validations:
      required: true
  - type: textarea
    id: scope
    attributes:
      label: Scope and non-goals
      description: Files or areas expected to change; what must not change.
  - type: dropdown
    id: who
    attributes:
      label: Who can do it
      options:
        - Agent
        - Agent with a grant (name the credential below)
        - Owner only (say why below)
      default: 0
    validations:
      required: true
  - type: textarea
    id: unblock
    attributes:
      label: If not "Agent" — what exactly would let an agent do it?
      description: The API call, CLI command or credential. "Owner only" needs a human identity, money, legal or product judgement; a missing token is not a reason.
  - type: input
    id: parent
    attributes:
      label: Parent issue
      description: "#number of the epic, if any (also add it as a sub-issue)."
```

### `ISSUE_TEMPLATE/2-bug.yml`

```yaml
name: Bug
description: Something behaves differently from what the code or the docs promise.
labels: ["type:bug"]
body:
  - type: textarea
    id: observed
    attributes:
      label: What happens
      description: Steps, URL or command, exact output or screenshot.
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: What should happen
    validations:
      required: true
  - type: input
    id: where
    attributes:
      label: Where it was seen
      placeholder: production / preview URL / local, browser or runtime, commit
  - type: dropdown
    id: regression
    attributes:
      label: Did this work before?
      options: ["Unknown", "Yes (name the last good commit or date below)", "No, never"]
      default: 0
```

### `ISSUE_TEMPLATE/3-decision.yml` (optional)

```yaml
name: Decision
description: A question whose answer changes what gets built. Comes with a default and a date.
labels: ["type:decision"]
body:
  - type: textarea
    id: question
    attributes:
      label: Question and options
      description: Two or three options with one line of consequences each.
    validations:
      required: true
  - type: textarea
    id: default
    attributes:
      label: Default and deadline
      description: "If nobody objects by <date>, option <n> is taken and work proceeds."
    validations:
      required: true
```

The decision template exists to stop the `claimlands-fable` pattern (seven design questions waiting on
the owner). A decision always has a default and a date; silence is an answer.

### `pull_request_template.md`

```markdown
Closes #

## Why
<!-- one paragraph: the problem, not the diff -->

## What changed
<!-- bullets; call out anything a reviewer would not guess from the files -->

## How it was verified
<!-- commands run, screenshots, settings read back. "CI" alone is not an answer. -->

- [ ] Title is a Conventional Commit subject (it becomes the squash commit)
- [ ] Hand-written change is one self-contained slice (≈100–400 lines; split otherwise)
- [ ] Tests cover the new contract at the lowest layer that can observe it
- [ ] Generated files were regenerated by their tool, not edited
```

### `dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: bun            # supported for Bun >= 1.1.39
    directory: /
    schedule: { interval: weekly, day: monday }
    open-pull-requests-limit: 5
    groups:
      minor-and-patch:
        update-types: [minor, patch]
    commit-message: { prefix: "build(deps)" }
    labels: ["type:task"]
  - package-ecosystem: github-actions # keeps SHA pins and their "# vX.Y.Z" comments in sync
    directory: /
    schedule: { interval: weekly, day: monday }
    groups:
      actions: { patterns: ["*"] }
    commit-message: { prefix: "ci" }
    labels: ["type:task"]
```

### `SECURITY.md`

```markdown
# Security

Report vulnerabilities privately through GitHub's "Report a vulnerability" button on the Security
tab (private vulnerability reporting is enabled), or to <security email>. Expect an acknowledgement
within 72 hours. Only the `master` deployment is supported; previews are disposable.
```

### `CONTRIBUTING.md`

```markdown
Read `AGENTS.md` (it applies to people too). Work starts from an issue labelled `ready`; one PR per
issue; the PR title is the squash commit. Run `bun run check` before pushing.
```

### `rulesets/master.json`

```json
{
  "name": "master",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "pull_request" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["squash"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [{ "context": "ci" }]
      }
    }
  ]
}
```

`actor_id: 5` with `RepositoryRole` is the repository admin role; `bypass_mode: pull_request` means
the admin can bypass only via a pull request. Apply with
`gh api -X POST repos/OWNER/REPO/rulesets --input .github/rulesets/master.json`; update with `PUT
…/rulesets/{id}`.

### `workflows/ci.yml`

```yaml
name: ci
on:
  pull_request:            # opened, synchronize, reopened by default
  push:
    branches: [master]
permissions:
  contents: read
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  static:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2.2.0
        with: { bun-version-file: .bun-version }
      - run: bun install --frozen-lockfile
      - name: Branch name
        if: github.event_name == 'pull_request'
        env:
          HEAD: ${{ github.head_ref }}
        run: |
          echo "$HEAD" | grep -Eq '^(feat|fix|refactor|perf|test|docs|build|ci|chore|revert|dependabot)/' \
            || { echo "branch must be <type>/<issue>-<kebab-slug>"; exit 1; }
      - name: PR title is a Conventional Commit subject
        if: github.event_name == 'pull_request'
        env:
          TITLE: ${{ github.event.pull_request.title }}   # an env var, never an inline expression in run:
        run: |
          echo "$TITLE" | grep -Eq '^(feat|fix|refactor|perf|test|docs|build|ci|chore|revert)(\([a-z0-9-]+\))?!?: [a-z0-9].{2,70}$' \
            || { echo "PR title must be '<type>(scope): lower-case description', no emoji, <= 72 chars"; exit 1; }
      - run: bun run lint
      - run: bun run typecheck
      - run: bun run format:check
      - run: bun run knip
      - name: Generated files are current
        run: bun run generate:types && git diff --exit-code -- src/payload-types.ts
      - run: test "$(wc -l < AGENTS.md)" -le 120 || { echo "AGENTS.md over 120 lines"; exit 1; }

  test:
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: app }
        ports: ["5432:5432"]
        options: --health-cmd "pg_isready -U postgres" --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgres://postgres:test@localhost:5432/app
      PAYLOAD_SECRET: ci-only-secret
      NEXT_PUBLIC_SITE_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2.2.0
        with: { bun-version-file: .bun-version }
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps chromium   # only the browser CI needs
      - run: bun run test:unit
      - run: bun run test:component
      - run: bun payload migrate
      - run: bun run test:integration:run
      - run: bun run test:coverage:run
      - run: bun run build
      - run: bun run test:e2e:seed && bun run test:e2e:run --project=chromium-desktop --project=chromium-mobile
      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        if: ${{ !cancelled() }}
        with: { name: test-reports, path: artifacts/, retention-days: 14, if-no-files-found: ignore }

  ci:                       # the one required check; name never changes
    if: always()
    needs: [static, test]
    runs-on: ubuntu-24.04
    steps:
      - if: contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled') || contains(needs.*.result, 'skipped')
        run: exit 1
      - run: echo ok
```

Pins: the SHAs above are the commits behind the named tags on 2026-10-24
(`git ls-remote --tags https://github.com/<owner>/<action>.git 'refs/tags/vX.Y.Z' 'refs/tags/vX.Y.Z^{}'`;
use the `^{}` line when one exists). Dependabot's `github-actions` entry moves them and the comment.

`nightly.yml`: `on: schedule` only, same two setup steps, then the repeat pass
(`test:unit` and `test:component` twice) and the cross-browser Playwright matrix. A nightly that is
red for two runs opens one issue (search for an open one first) and is fixed or deleted that week.

## 4. Agent files

### `AGENTS.md` skeleton (≤ 120 lines)

```markdown
# <Project> — how to work here

## Map
- `src/app` routes only · `src/components/<area>` UI · `src/collections|globals|blocks` Payload schema
- `src/lib` shared logic · `tests/<suite>` tests · `scripts/` operations · `docs/` reference

## Commands
- `bun dev` · `bun run check` (lint, typecheck, format, knip, naming) · `bun run test` (needs
  `DATABASE_URL` to a disposable Postgres) · `bun run test:e2e`

## Picking work
1. `gh issue list --label ready --no-assignee` → take one: `gh issue edit N --add-assignee @me`.
2. Branch `<type>/<N>-<kebab-slug>`. One issue, one PR, PR title = Conventional Commit subject.
3. Done = acceptance criteria checked in the PR body, `ci` green, threads resolved.

## Before creating a file
1. Search for an existing component/hook/flow that does this. Extend it, or say why it cannot be.
2. Name it per the naming table below. The write-time hook will refuse anything else.
3. More than ~3 files or a new component? Justify in the PR body.

## Naming (the hook and eslint enforce this; this table is the human copy)
| files/folders kebab-case | components export PascalCase | Payload slugs kebab plural, fields camelCase |
| images/files = `upload` fields to `media` | tests in `tests/<suite>/` | branches `<type>/<N>-<slug>` |

## Data model (Payload) — see .claude/rules/payload.md when editing schema
- Schema change = edit → `bun generate:types` → `bun payload migrate:create` → `bun dev` (push).
- Never run `payload migrate` against the dev database; never mix push and migrate.

## Hard rules
- No `*Url`/`*Src` text fields for files. No skipped or retried-until-green tests. No force-push to
  `master`. No generated file edited by hand. No new workflow, label or doc without removing one.

## Owner actions
Tier A (agent) / B (agent with a grant: name it) / C (owner only: say why). A missing token is Tier B.
```

`CLAUDE.md` contains exactly one line: `@AGENTS.md`.

### `.claude/settings.json`

```json
{
  "permissions": {
    "deny": [
      "Bash(git push --force:*)",
      "Bash(git push -f:*)",
      "Bash(git push --force-with-lease:*)",
      "Bash(git push origin master:*)",
      "Bash(git push origin HEAD:master:*)",
      "Bash(git push --delete:*)",
      "Bash(bun payload migrate:*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|Bash",
        "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/check-path.mjs\"" }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/lint-file.mjs\"", "timeout": 30 }]
      }
    ]
  },
  "attribution": { "commit": "", "pr": "", "sessionUrl": false }
}
```

`PreToolUse` exit 2 blocks the call in every permission mode and the stderr text is shown to Claude;
`PostToolUse` cannot block, it feeds back. The `deny` list (`Bash(prefix:*)` syntax, as in
`atmjet_website`) is the backstop for the destructive commands no hook should have to reason about;
`payload migrate` is denied because the dev database uses push (allow it only in CI). Personal overrides go in
`settings.local.json` (git-ignored).

### `.claude/hooks/check-path.mjs` (tested: 20 cases against `dimm-os`, see refactor analysis Appendix D)

```js
#!/usr/bin/env node
// PreToolUse hook for Claude Code (matcher: Edit|Write|Bash).
// Blocks a tool call that would create a file breaking naming or placement rules,
// or a Payload field that stores a file URL as text. Exit 2 blocks the call and
// returns the message to Claude; exit 0 allows it. No dependencies beyond Node.
import { existsSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
const input = JSON.parse(await readStdin())
const tool = input.tool_name ?? ''
const args = input.tool_input ?? {}

const SCOPES = ['src', 'tests', 'scripts'] // folders the rules apply to
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// kebab-case folders plus the Next.js app-router segment forms: [id] [...all] [[...all]] (group) @slot _private
const SEGMENT =
  /^(?:\[\[\.\.\.[a-zA-Z0-9]+\]\]|\[\.\.\.[a-zA-Z0-9]+\]|\[[a-zA-Z0-9]+\]|\([a-z0-9-]+\)|@[a-z0-9-]+|_[a-z0-9-]+|[a-z0-9]+(?:-[a-z0-9]+)*)$/
const SRC_ROOT_FILES = new Set([
  'payload.config.ts', 'payload-types.ts', 'middleware.ts', 'proxy.ts',
  'instrumentation.ts', 'instrumentation-client.ts',
])
const PAYLOAD_SCHEMA = /^src\/(collections|blocks|globals|fields)\//
// `{ name: 'heroUrl', type: 'text' }` in either key order, inside one object literal
const URL_TEXT_FIELD =
  /name:\s*['"](\w*(?:Url|URL|Link|Src|Href))['"][^{}]{0,200}?type:\s*['"]text['"]|type:\s*['"]text['"][^{}]{0,200}?name:\s*['"](\w*(?:Url|URL|Link|Src|Href))['"]/g

if (tool === 'Write' || tool === 'Edit') {
  const rel = toProjectRelative(args.file_path)
  if (rel) {
    checkPath(rel, { isNew: !existsSync(resolve(root, rel)) })
    checkPayloadContent(rel, tool === 'Write' ? args.content : args.new_string)
  }
} else if (tool === 'Bash') {
  // Backstop for files created through the shell (touch, mv, cp, redirects, heredocs).
  const command = String(args.command ?? '')
  const pathLike = /(?:^|[\s"'=>])((?:src|tests|scripts)\/[\w\-\[\]()@./]+\.[a-z]+)/g
  for (const match of command.matchAll(pathLike)) {
    const rel = match[1]
    checkPath(rel, { isNew: !existsSync(resolve(root, rel)) })
  }
}
process.exit(0)

function checkPath(rel, { isNew }) {
  const parts = rel.split('/')
  if (!SCOPES.includes(parts[0])) return
  const file = parts.at(-1)
  const folders = parts.slice(1, -1)
  // Folders that already exist keep their names; only new folders are checked.
  for (let i = 0; i < folders.length; i++) {
    const dir = join(root, ...parts.slice(0, i + 2))
    if (existsSync(dir)) continue
    if (!SEGMENT.test(folders[i])) {
      fail(
        `Folder "${folders[i]}" in ${rel} must be kebab-case (Next.js segments like [slug], (group), @slot and _private are fine). ` +
          `Use "${toKebab(folders[i])}".`,
      )
    }
  }
  if (!isNew) return // existing files keep their names (no case-only renames)
  const base = file.split('.')[0] // ignore middle extensions: foo.test.ts -> foo
  if (!KEBAB.test(base)) {
    fail(
      `New file "${file}" must be kebab-case: name it "${toKebab(base)}${file.slice(base.length)}". ` +
        `Existing files keep their names; new files follow the naming table in AGENTS.md.`,
    )
  }
  if (parts[0] === 'src' && parts.length === 2 && !SRC_ROOT_FILES.has(file)) {
    fail(`New file ${rel} sits directly in src/. Put it in an area folder (app, components, collections, blocks, lib, hooks).`)
  }
  if (/\.test\.[cm]?[jt]sx?$/.test(file) && parts[0] !== 'tests') {
    fail(`Test files live under tests/<suite>/ (unit, component, integration, e2e), not at ${rel}.`)
  }
}

function checkPayloadContent(rel, text) {
  if (!PAYLOAD_SCHEMA.test(rel) || typeof text !== 'string') return
  for (const match of text.matchAll(URL_TEXT_FIELD)) {
    if (match[0].includes('allow-url-text')) continue // explicit, reviewed exception
    const name = match[1] ?? match[2]
    fail(
      `Field "${name}" in ${rel} is a text field holding a URL. Files and images are documents of the ` +
        `"media" upload collection: use { name: '${name.replace(/(Url|URL|Link|Src|Href)$/, '')}', type: 'upload', relationTo: 'media' }. ` +
        `Outbound links use the shared link field. If this is a genuine external URL and not a file, add the comment ` +
        `"// allow-url-text" on the same line as the name and say why in the PR.`,
    )
  }
}

function toProjectRelative(filePath) {
  if (!filePath) return null
  const abs = isAbsolute(filePath) ? filePath : resolve(root, filePath)
  const rel = relative(root, abs).split('\\').join('/')
  return rel.startsWith('..') ? null : rel
}

function toKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[_\s.]+/g, '-')
    .toLowerCase()
}

function fail(message) {
  process.stderr.write(message + '\n')
  process.exit(2)
}

function readStdin() {
  return new Promise((done) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => (data += chunk))
    process.stdin.on('end', () => done(data || '{}'))
  })
}
```

Adapting it: `SCOPES` and `SRC_ROOT_FILES` are the only project-specific tables. If tests are
colocated in your project, delete the `.test.` clause. The Payload clause applies to
`src/(collections|blocks|globals|fields)/`; the `// allow-url-text` comment is the single, visible
escape hatch and must be justified in the PR.

### `.claude/hooks/lint-file.mjs` (tested: formats on success, returns eslint/prettier output with exit 2 on failure)

```js
#!/usr/bin/env node
// PostToolUse hook (matcher: Edit|Write). Formats and lint-fixes the file that was just written and
// reports what is left. PostToolUse cannot block; exit 2 returns stderr to Claude as feedback.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { extname, isAbsolute, relative, resolve } from 'node:path'

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
const input = JSON.parse(await readStdin())
const file = input.tool_input?.file_path
if (!file) process.exit(0)
const abs = isAbsolute(file) ? file : resolve(root, file)
const rel = relative(root, abs)
if (rel.startsWith('..') || !existsSync(abs)) process.exit(0)

const ext = extname(abs)
const lintable = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)
const formattable = lintable || ['.json', '.css', '.md', '.yml', '.yaml'].includes(ext)
if (!formattable) process.exit(0)

const problems = []
if (lintable) {
  const eslint = run('bunx', ['eslint', '--fix', '--no-warn-ignored', abs])
  if (eslint.status !== 0) problems.push(eslint.stdout || eslint.stderr)
}
const prettier = run('bunx', ['prettier', '--write', '--log-level', 'warn', abs])
if (prettier.status !== 0) problems.push(prettier.stderr || prettier.stdout)

if (problems.length) {
  process.stderr.write(`Lint/format problems remain in ${rel} after auto-fix:\n${problems.join('\n')}`)
  process.exit(2)
}
process.exit(0)

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: 25_000 })
  return { status: r.status ?? 1, stdout: r.stdout?.trim() ?? '', stderr: r.stderr?.trim() ?? '' }
}
function readStdin() {
  return new Promise((done) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (c) => (data += c))
    process.stdin.on('end', () => done(data || '{}'))
  })
}
```

### `.claude/rules/payload.md`

```markdown
---
paths:
  - "src/collections/**"
  - "src/globals/**"
  - "src/blocks/**"
  - "src/fields/**"
  - "src/payload.config.ts"
---
# Payload schema rules (loaded when you edit schema files)

- Files and images are documents of the `media` upload collection. Reference them with
  `{ name: 'image', type: 'upload', relationTo: 'media' }`. Never store a file URL as `text`; the
  storage adapter (S3 / Vercel Blob) serves `doc.url`. Import external files with
  `payload.create({ collection: 'media', data, file })` in a script, then relate to the document.
- Outbound links use the shared `link` field group (`src/fields/link.ts`), not ad-hoc `*Url` text.
- Slugs: kebab-case plural (`cookie-services`). Field names: camelCase. Reuse `src/fields/*` before
  adding a field shape.
- After a schema change: `bun generate:types`, then `bun payload migrate:create`, then `bun dev`
  (push). Never run `payload migrate` on the dev database; finish the feature before creating the
  migration; one migration per PR.
- `tests/unit/payload-schema.unit.test.ts` enforces the first three bullets; if it fails, fix the
  schema, not the test.
```

### `.claude/rules/tests.md`

```markdown
---
paths:
  - "tests/**"
  - "vitest.config.ts"
  - "playwright.config.ts"
---
# Test rules (loaded when you edit tests)

- Lowest sufficient layer: pure logic → `tests/unit`; rendered behaviour → `tests/component`
  (Vitest browser mode); Payload/database → `tests/integration`; cross-system journeys only →
  `tests/e2e`. Do not repeat an assertion at a higher layer.
- Names: `<name>.unit.test.ts`, `<name>.component.test.tsx`, `<name>.integration.test.ts`,
  `<name>.desktop|mobile.e2e.test.ts`. Extend the existing fixtures in `tests/fixtures`.
- Query by role, label, text; no CSS-class selectors; a test id only to scope a region.
- No fixed sleeps, no retries-until-green, no `test.only` (CI forbids it), no shared mutable records.
- Coverage thresholds are floors for `src/**`; never lower them or add an exclusion to pass.
```

## 5. Lint, format and commits — one config, four execution points

### `eslint.config.mjs` additions

```js
import checkFile from 'eslint-plugin-check-file'

export default [
  // …existing Next.js / TypeScript config…
  {
    files: ['src/**/*', 'tests/**/*', 'scripts/**/*'],
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx,js,mjs,css}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true }, // foo.unit.test.ts validates "foo"
      ],
      'check-file/folder-naming-convention': [
        'error',
        { 'src/app/**/': 'NEXT_JS_APP_ROUTER_CASE', 'src/!(app)/**/': 'KEBAB_CASE', 'tests/**/': 'KEBAB_CASE' },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] }, // PascalCase for components/constants objects
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'interface', format: ['PascalCase'], custom: { regex: '^I[A-Z]', match: false } },
        { selector: 'objectLiteralProperty', format: null }, // Payload field objects, CSS vars, headers
        { selector: 'import', format: null },
      ],
    },
  },
]
```

Legacy files that violate the filename rule are listed in an `ignores` block with a comment
`// legacy names; rename only when rewritten` so the rule is green from day one and bites only new
files — the same policy the hook applies.

### `lefthook.yml`

```yaml
pre-commit:
  parallel: true
  jobs:
    - name: eslint
      glob: "*.{ts,tsx,js,mjs}"
      run: bunx eslint --fix {staged_files}
      stage_fixed: true
    - name: prettier
      glob: "*.{ts,tsx,js,mjs,json,css,md,yml,yaml}"
      run: bunx prettier --write {staged_files}
      stage_fixed: true
    - name: typecheck
      run: bun run typecheck
commit-msg:
  jobs:
    - name: commitlint
      run: bunx commitlint --edit {1}
```

Install: `bun add -d lefthook @commitlint/cli @commitlint/config-conventional eslint-plugin-check-file knip`
and run `bunx lefthook install` once after cloning (put it in a `prepare` script if your package
manager runs it; `bun run check` can also call it so nobody forgets).
`commitlint` config in `package.json`: `"commitlint": { "extends": ["@commitlint/config-conventional"] }`.
`LEFTHOOK=0 git commit` skips locally; CI repeats every check, so skipping only moves the failure.

### `package.json` scripts the standard assumes

```json
{
  "check": "bun run lint && bun run typecheck && bun run format:check && bun run knip",
  "format:check": "prettier --check .",
  "knip": "knip",
  "test": "vitest run",
  "test:unit": "vitest run --project unit",
  "test:component": "vitest run --project component",
  "test:integration:run": "vitest run --project integration",
  "test:coverage:run": "vitest run --coverage",
  "test:e2e:run": "playwright test",
  "test:e2e:seed": "bun tests/fixtures/e2e.ts"
}
```

`bun run test` needs only `DATABASE_URL` pointing at a disposable Postgres (local install, a Neon
branch, or `docker run postgres` if you like Docker). No test script requires a container runtime.

## 6. Tests and coverage

### `vitest.config.ts` coverage block

```ts
coverage: {
  provider: 'v8',
  include: ['src/**/*.{ts,tsx}'],                       // count every source file, not an allowlist
  exclude: [
    'src/payload-types.ts', 'src/migrations/**', 'src/app/(payload)/**', 'src/**/*.d.ts',
    'src/app/**/{layout,page,loading,error,not-found}.tsx', // thin route files are covered by e2e
  ],
  reporter: ['text', 'json-summary', 'lcov'],
  thresholds: {
    lines: 80, functions: 80, branches: 70, statements: 80,   // set to the real numbers after the first run, then only raise
    perFile: true,
    'src/lib/**': { lines: 90, functions: 90, branches: 80, statements: 90 },
  },
},
```

Fixed numbers, raised deliberately in their own PR. No `autoUpdate` (config churn) and no custom
threshold script: Vitest's `perFile` and glob thresholds already do the per-file floors.

### `tests/unit/payload-schema.unit.test.ts` — the architecture test

```ts
import { describe, expect, it } from 'vitest'
import type { Block, CollectionConfig, Field, GlobalConfig } from 'payload'

// Every schema module, loaded eagerly. Adjust the globs to the project layout.
const collections = import.meta.glob<Record<string, CollectionConfig>>('../../src/collections/*.ts', { eager: true })
const globals = import.meta.glob<Record<string, GlobalConfig>>('../../src/globals/*.ts', { eager: true })
const blocks = import.meta.glob<Record<string, Block>>('../../src/blocks/*.ts', { eager: true })

const URL_NAME = /(Url|URL|Link|Src|Href)$/
// Genuine external URLs that are not files. Each entry needs a reason in the PR that added it.
const ALLOW_URL_TEXT = new Set(['cookie-services.privacyPolicyUrl'])

type Entity = { slug: string; fields: Field[] }

function entities(): Entity[] {
  const all: Entity[] = []
  for (const mod of [...Object.values(collections), ...Object.values(globals), ...Object.values(blocks)]) {
    for (const value of Object.values(mod)) {
      if (value && typeof value === 'object' && 'slug' in value && Array.isArray((value as Entity).fields)) {
        all.push(value as Entity)
      }
    }
  }
  return all
}

function* walk(fields: Field[], path: string): Generator<[string, Field]> {
  for (const field of fields) {
    const here = 'name' in field && field.name ? `${path}.${field.name}` : path
    yield [here, field]
    if ('fields' in field && Array.isArray(field.fields)) yield* walk(field.fields, here)
    if ('tabs' in field) for (const tab of field.tabs) yield* walk(tab.fields, here)
    if ('blocks' in field && Array.isArray(field.blocks)) for (const b of field.blocks) yield* walk(b.fields, `${here}[${b.slug}]`)
  }
}

describe('payload schema conventions', () => {
  const all = entities()

  it('finds the schema modules', () => {
    expect(all.length).toBeGreaterThan(0)
  })

  it('uses kebab-case slugs', () => {
    for (const e of all) expect(e.slug, `slug "${e.slug}"`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('uses camelCase field names', () => {
    for (const e of all)
      for (const [path, f] of walk(e.fields, e.slug))
        if ('name' in f && f.name) expect(f.name, path).toMatch(/^[a-z][A-Za-z0-9]*$/)
  })

  it('stores files and images as upload relations, not URL text', () => {
    const offenders: string[] = []
    for (const e of all)
      for (const [path, f] of walk(e.fields, e.slug))
        if (f.type === 'text' && 'name' in f && f.name && URL_NAME.test(f.name) && !ALLOW_URL_TEXT.has(path)) offenders.push(path)
    expect(offenders, 'use { type: "upload", relationTo: "media" } or the shared link field').toEqual([])
  })

  it('points every upload field at the media collection', () => {
    for (const e of all)
      for (const [path, f] of walk(e.fields, e.slug))
        if (f.type === 'upload') expect(f.relationTo, path).toBe('media')
  })
})
```

The walker was run against `dimm-os` (collections and globals) and reports the four existing `upload`
fields and no offenders; `cookie-services.privacyPolicyUrl` is a third-party policy page and is
correctly allowlisted.

### `playwright.config.ts` — CI settings from the Playwright docs

```ts
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['junit', { outputFile: 'artifacts/playwright/junit.xml' }], ['list']] : 'list',
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000', trace: 'on-first-retry' },
  webServer: { command: 'bun run start', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
    // firefox / webkit only in nightly.yml
  ],
})
```

## 7. Payload data rules (the short version lives in `.claude/rules/payload.md`)

1. One upload collection, `media`, with the storage adapter configured in `payload.config.ts`.
   Everything that is a file is a `media` document; everything that shows a file is an `upload` field.
2. Links are a shared field group; URL-ish text fields need `// allow-url-text` and a reason.
3. Schema change workflow: edit → `bun generate:types` → `bun payload migrate:create` → `bun dev`.
   Push for dev, migrations for CI/production, never both on one database (Payload docs). Finish the
   feature before creating the migration; squash a feature's migrations before the first production
   deploy of that feature.
4. Imports and backfills are scripts under `scripts/` that use the Local API and create real
   documents; they never write parallel fields "for now".
5. `src/payload-types.ts` and `src/migrations/**` are generated: marked `linguist-generated` in
   `.gitattributes`, never edited by hand, regenerated in CI and diffed (`static` job).

## 8. Owner actions — the grant and the Tier B surface

### The one owner action

Create a fine-grained personal access token (Settings → Developer settings → Personal access
tokens → Fine-grained): resource owner = you, repository access = *only* this repository, expiry
≤ 90 days, repository permissions:

| Permission | Level | Used for |
|---|---|---|
| Administration | Read and write | repository settings, rulesets, topics, auto-delete branches |
| Actions | Read and write | workflow permissions, re-running jobs |
| Secrets, Variables | Read and write | `gh secret set`, `gh variable set` |
| Contents | Read and write | tags, releases, pushing branches |
| Issues, Pull requests | Read and write | the work queue, sub-issues, labels, reviews |
| Workflows | Read and write | editing files under `.github/workflows` |
| Metadata | Read | implied |

Store it where the agent runs (a cloud-environment secret or `GH_TOKEN` in the local shell). Rotate
on expiry — Dependabot-style, a calendar reminder, or an issue the agent opens 7 days before.

Optional grants, only if deployments/databases are agent-managed: a Vercel token scoped to the
project; a Neon API key scoped to the project. Decisions that stay with the owner: license text,
legal/privacy copy, paying for anything, rotating secrets in vendor consoles, destructive
decommissions (the agent prepares the exact command; you answer yes).

### Tier B commands (GitHub, verified against the REST description; `-F` sends typed values)

```bash
R=OWNER/REPO
# merge policy, auto-delete, description
gh api -X PATCH repos/$R -F allow_merge_commit=false -F allow_rebase_merge=false -F allow_squash_merge=true \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=BLANK -F delete_branch_on_merge=true \
  -F has_wiki=false -F has_projects=false -f description='One-line description'
gh api -X PUT repos/$R/topics -f 'names[]=nextjs' -f 'names[]=payload' -f 'names[]=bun'
# secret scanning + push protection; Dependabot security updates
gh api -X PATCH repos/$R --input - <<'JSON'
{"security_and_analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}
JSON
gh api -X PUT repos/$R/automated-security-fixes
# Actions: read-only default token, no PR approval by workflows
gh api -X PUT repos/$R/actions/permissions/workflow -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false
# ruleset from the file in git
gh api -X POST repos/$R/rulesets --input .github/rulesets/master.json
# secrets, variables, labels
gh secret set VERCEL_AUTOMATION_BYPASS_SECRET --repo $R --body "$VALUE"
gh variable set STAGING_URL --repo $R --body "https://staging.example.com"
gh label create "type:task" --repo $R --color 0E8A16 --description "A unit of work" --force
# archive a branch: tag it, delete it
gh api -X POST repos/$R/git/refs -f ref=refs/tags/archive/old-branch -f sha="$(git rev-parse origin/old-branch)"
gh api -X DELETE repos/$R/git/refs/heads/old-branch
# read-back (every Tier B step ends with one)
gh api repos/$R --jq '{squash_title: .squash_merge_commit_title, auto_delete: .delete_branch_on_merge, merge: .allow_merge_commit}'
gh api repos/$R/rulesets --jq '.[].name'
```

## 9. Setup sequence (the agent runs it; each step is one PR or one API call with a read-back)

1. **Grant** (Tier C, owner): the token above in the agent's environment; the license choice.
2. **Hygiene PR**: remove stray files and foreign package-manager fingerprints; one `AGENTS.md`,
   `CLAUDE.md` = `@AGENTS.md`; `.gitattributes` with `linguist-generated` for generated paths.
3. **`.github/` PR**: all files from §3 plus `LICENSE`. Verify: Insights → Community Standards shows
   every item, and the issue chooser shows exactly the forms.
4. **CI PR**: `ci.yml` + `nightly.yml`, SHA-pinned, Postgres service, aggregate `ci`. Verify: a PR
   with a wrong title fails `static`; a green PR shows one `ci` check.
5. **Enforcement PR**: `.claude/settings.json`, hooks, rules, eslint additions, `lefthook.yml`,
   commitlint, the architecture test. Verify: attempt `Write src/components/Foo/Bar.tsx` in Claude
   Code and watch the refusal; `bun run check` is green.
6. **Coverage PR**: `include: ['src/**']`, real thresholds, `perFile`. Verify: the report lists every
   source file.
7. **Settings (API, Tier B)**: §8 commands, then the read-back lines. Open a deliberately red test PR
   and confirm it cannot be merged; close it.
8. **Labels (API)**: delete unused defaults, create the ≤ 12. Verify: `gh label list` count.
9. **Queue**: open the first `ready` issues from `1-task.yml` with acceptance criteria; from here on,
   all work enters through the queue.

### Definition of done for the setup

- Community Standards: every item present; chooser shows only the forms; `blank_issues_enabled: false`.
- `ci` is the single required check; actions SHA-pinned; Dependabot open for `bun` and
  `github-actions`; no workflow is red on `master` or on schedule.
- Squash-only, PR title as commit message, auto-delete branches, secret scanning + push protection
  on, workflow token read-only, ruleset active with admin bypass via PR only.
- Hooks installed and demonstrated once; `bun run check` and `bun run test` run on a laptop without
  Docker; coverage counts all of `src/**`.
- `AGENTS.md` ≤ 120 lines, `CLAUDE.md` one line, rules path-scoped, one skills tree.
- Budgets in §1 met; no `owner-action` issue open that names a missing credential as its reason.
