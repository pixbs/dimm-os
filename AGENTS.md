# Dimm OS: rules for coding agents

A portfolio built as an operating system: every page is a window. Payload CMS 4 (beta), Next.js 16, Postgres on Neon, Vercel. English and German.

## Enforced, not asked

1. No tool attribution anywhere: no co-author trailer or "generated with" line in a commit, pull request, issue or comment, no session link, no tool's name in a branch, no bot as author.
2. A pull request title is a Conventional Commit: `feat: window frame`.
3. A pull request closes one issue: its description starts with `Closes #n`.

The commit hook, `.claude/hooks/guard.js` and the required check `conventions` enforce these. Do not work around them. The repository's rules are set by `scripts/repo/apply-settings.sh` from the files here; a change to them is a pull request.

## From issue to merge

Take one issue. Branch `<type>/<issue>-<slug>` from `main`. Build only what the issue lists; above about 800 hand-written lines, stop and split it. Open one pull request: `Closes #n`, up to three lines on what changed, the frames it was compared with. When the required checks pass, merge with `gh pr merge <n> --squash --auto`. The owner reviews per milestone on the preview address and files what he sees as issues.

## The design

- The design handoff is outside the repository, at the path in `DIMM_OS_HANDOFF`. Read its `CLAUDE.md` first. It is private: nothing from its notes goes into code, commits, issues or pull requests.
- The result must match the frame at phone, tablet and desktop size. Open the handoff's page beside yours and compare.
- The handoff's CSS and scripts are a reference to rebuild from, never to import.
- Add to the design system, in its layer, built from the layer below. Never style a one-off.
- Every part that appears, leaves or changes state is animated from the shared vocabulary in `src/ds/motion`, and has its reduced form.

## Content is not code

The owner's name, address, tax number and phone, and every legal text, are content in the admin. They never appear in code, fixtures, commits or issues.

## Payload and Next.js

- This is Payload 4 beta. The types and docs in `node_modules` and `payloadcms.com/docs/beta` win over memory. Always write out `depth`, `locale`, `fallbackLocale`, `versions` and access.
- Only `src/data` calls Payload.
- The desk owns navigation: plain links and `fetch`. Never the Next.js router or a Server Action where the desk lives; lint enforces it.
- Reuse first. Taken from Payload, never written again: the slug field, the hierarchy and its tree, drag-and-drop order, drafts with autosave and live preview, localisation with "copy to locale", uploads with focal point, relationship and join fields, tabs and conditions, blocks, the form builder, access queries, the jobs queue, per-collection instructions for agents, the MCP plugin, Lexical and its HTML converter.
- Read before writing code for either: Payload's agent skill at `node_modules/payload/skills/payload/SKILL.md`, and the docs Next.js ships at `node_modules/next/dist/docs/`. They are not copied here; `agentRules: false` keeps `next dev` from writing them in.

## Smallest diff that passes

Only what the issue lists. No export without a caller. A comment is one sentence that says why. An admin description is one line or absent. A test asserts a behaviour the issue lists.

## The database

- The local database is a sandbox: when the migration tool asks a question, wipe it.
- Only `payload migrate` in a build ever touches preview or production. No dev server, test or seed does.
- One migration when the feature is finished. A migration only adds or only removes; a removing one merges alone, and after it production is fixed forward.

## Recovery

- Code: Vercel's instant rollback, then promote. It does not undo a migration.
- One document: Payload's version history.
- The database: Neon restore to a point in time.
- The keys: the Vercel project's environment variables, never the repository.
