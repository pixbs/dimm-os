# Contributing

Dimm OS is one person's portfolio. Only collaborators can open pull requests. If you see something wrong, open an issue.

## From issue to merge

1. Every change starts as an issue, and the issue says when it is done.
2. Branch from `main`: `<type>/<issue>-<slug>`, for example `feat/12-window-frame`.
3. Open one pull request per issue. Its title is a Conventional Commit (`feat: window frame`). Its description starts with `Closes #12`, then says in up to three lines what changed, then names the frames it was compared with.
4. When the required checks pass, the pull request is squash-merged. The commit takes the pull request's title.

Above roughly 800 hand-written lines, the issue is split.

## What the checks enforce

| Check | Enforces |
| --- | --- |
| `conventions` | No tool attribution in the title, the description, the branch name or any commit's message, author or committer. No bot as author. A Conventional Commit title. A linked issue. |
| `ci` | Format, lint, types, generated files up to date, the dependency audit, migrations, tests and the production build. |
| CodeQL | No alert at high or above. |
| `Vercel` | The preview deployment: the build, with its migrations, succeeds against the preview database. |

`main` takes squash merges of up-to-date branches only, and nobody bypasses that.

## No tool attribution

Commits, pull requests, issues and comments carry no co-author line for a tool, no "generated with" footer and no session link, and a branch carries no tool's name. The commit hook removes such lines, and `conventions` fails on what is left.
