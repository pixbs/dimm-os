# Dimm OS — refactor analysis and recommendations

Branch: `claude/repo-website-refactor-analysis-h3d9vm` · Base commit: `ead93e0` · Date: 2026-10-21 ·
Updated 2026-10-24 with Parts II–IV

This is an analysis only. No application code was changed. Everything below was checked against the
code on this branch and against a production build of it running locally (details in §2).

**Contents**

- **Part I — Code** (§1–§8): verdict, how the desktop works, findings, target architecture, phased plan,
  desktop-behaviour backlog.
- **Part II — Repository and process** (§9–§11): community files, issues and PRs, merge policy, rulesets,
  CI, labels, coverage, agent instructions; scorecard for maintain / scale / assign-to-agents.
- **Part III — Lessons from `atmjet_website` and `claimlands-fable`** (§12–§17): what "bloated" measures
  as; the four pains (bloat, conventions broken then fixed, the `externalUrl` media field, the owner
  bottleneck) traced to root causes and fixes.
- **Part IV — Standards and action list** (§18–§20): every standard with its source, the ordered action
  list for dimm-os, and the pointer to the reusable blueprint `docs/project-standard.md`.
- Appendices: A desktop surface, B measurements, C the 18 owner-action issues classified, D sources.

---

# Part I — Code

## 1. Verdict

The product works, builds clean, and has a real test suite. The codebase is not broken; it is
**accreted**. Each phase of the roadmap added a parallel path next to the previous one instead of
extending it, so today there are:

- **three window implementations** (`ManagedWindowShell`, `PageDrawerShell`, `DrawerShell`) that
  duplicate drag, expand, resize, keyboard-inset and sheet-dismiss logic almost line for line;
- **two content pipelines** for the same document (server `ContentBlocks` + `ArticleListRenderer`
  versus client `ContentView` + `ArticleListBlock`), plus two ways to tell the chrome how to behave
  (`SetWindowTitle/SetWindowOptions/SetWindowToolbar` effects versus `behavior` in
  `WindowContentResult`);
- **window state split across five places** (React state in `useWindowManager`, CSS custom
  properties written to the DOM, `localStorage`, `sessionStorage`, and the URL via
  `history.replaceState`), reconciled by three effects and seven mirrored refs;
- **imperative glue** where a store should be: the context menu finds chrome buttons by
  `aria-label` string and calls `.click()`; two custom `window` events act as an event bus;
  `document.querySelector('header')` is used for layout maths in three places.

The right move is **consolidation, not a rewrite**: keep the Payload schema, the content blocks and
animation toolkit, the system-window registry idea, the cookie/analytics gating, the SEO pipeline and
the e2e journeys (they pass, and they are the contract to refactor against). Replace the window
manager hook, the three shells, the title context, the promise-cache choreography and the duplicate
content renderer with **one store, one `WindowFrame`, one content loader**. That foundation is also
what makes the desktop features you want (focus model, snapping, keyboard, 8-way resize, session
restore, launcher) cheap instead of each one becoming another special case.

Estimated size of the consolidation: roughly 4,400 lines in the desktop surface today (§Appendix A)
should land around 1,800–2,200 with strictly more behaviour.

---

## 2. What was checked

| Check | Result |
| --- | --- |
| `bun run typecheck` | 0 errors |
| `bun run lint` | 0 errors, 84 warnings: 60 are unused `payload`/`req` args in generated migrations; the 24 in application code are 15 × `react-hooks/set-state-in-effect` (state synced from storage/DOM inside effects), 2 × `react-hooks/refs` (`windowsRef.current = windows` during render in `useWindowManager.ts:130,135`), 3 × `exhaustive-deps` in `managed-window-shell.tsx`, 1 ref-cleanup warning, 2 unused vars in the dead `my-route`, 1 unused type, 1 `@ts-ignore` |
| `bun run test:unit` | 96 tests pass (15 files, 1.8 s) |
| `bun run test:component` (headless Chromium) | 32 tests pass (7 files, 11 s) |
| `bun run build` (Next 16.2.3, Turbopack) | succeeds; every app route is dynamic (`ƒ`) except `/_not-found`, `/robots.txt`, `/sitemap.xml` |
| `bun run test:e2e:run` (chromium desktop + mobile, production build, seeded Postgres 16) | 11 tests pass (49 s) |
| Live site `https://dimm.co` | **not reachable from this sandbox** (proxy refuses the tunnel). All runtime observations below come from the production build of this branch with the e2e fixture content, probed with headless Chromium at 1440×900 and Pixel 7 |

Measured on the built app, home page, desktop viewport, fixture content (3 shortcuts, 2 startup
windows):

| Metric | Value |
| --- | --- |
| JavaScript transferred | 415 KB (13 files) |
| Largest single asset | `remixicon.woff2` 185 KB (icon font for ~25 icons used) |
| Onest font | 33 KB · CSS 30 KB |
| HTML document | 9 KB gzip (57 KB raw); inline RSC payload 23 KB (28 KB on `/e2e-workspace`) |
| `[data-window-panel]` elements in DOM at `/` | 6 (4 hidden pre-mounted shortcut/startup windows, 2 visible) |
| `[data-window-panel]` elements at `/e2e-workspace` (direct load) | 7: the route drawer **plus a hidden pre-mounted copy of the same content** |

Screenshots used as evidence are in the session scratchpad (not committed):
`desktop-direct-route.png`, `desktop-1024x700-after-shrink.png`, `mobile-home-dismissed.png`.

---

## 3. How the desktop works today (map)

```
app/(frontend)/layout.tsx  (force-dynamic; 5 Payload queries + fetchAllShortcutContents per request)
└─ WindowManagerProvider (client)            ← useWindowManager(): windows[], primarySlug, effects 1-3
   ├─ WindowHeadSync                          favicon/title from focused window (canvas + font glyph probe)
   ├─ WindowLifecycleControllers              cookie notice, /cookie-preferences, ?open=, startup windows
   ├─ {children}                              ← (pages)/layout → WindowTitleProvider → PageDrawer
   │     └─ [slug]/page.tsx (RSC)                 3 full-doc queries + SetWindowTitle/Options/Toolbar effects
   │           └─ PageDrawerShell (client)        "primary" window: own drag/expand/resize/sheet/history code
   │                 └─ WindowContent/ArticleContent → ContentBlocks (RSC switch) → ArticleListRenderer (RSC fetch)
   ├─ preloadedSlugs.map → <div display:none?> → AdditionalWindow   always mounted, CSS-hidden
   │     └─ ManagedWindowShell (client)           "secondary" window: drag/expand/resize/sheet/genie animation
   │           └─ ContentView (client switch over the same blocks) → ArticleListBlock (client)
   ├─ on-demand windows → AdditionalWindow (mount/unmount)
   ├─ system windows → SystemWindow → ManagedWindowShell
   ├─ mobile: top-most managed window → AdditionalWindow/SystemWindow as a sheet
   └─ Taskbar
```

Two things to notice: the same document renders through **different components depending on how
the user arrived** (URL → `PageDrawerShell`; shortcut → `ManagedWindowShell`), and the manager hook
treats the URL-opened window as a special "primary" that must be swapped, hidden from the preloaded
list, closed via `router.push('/')`, and protected from the cosmetic URL writer. Most of the
complexity in `useWindowManager.ts` (345 lines) exists to keep those two worlds consistent.

---

## 4. Findings

Severity: **S1** structural root cause · **S2** user-visible bug or risk · **S3** waste/hygiene.

### 4.1 Structural root causes (S1)

**F1. Three window implementations.**
`src/components/window/managed-window-shell.tsx` (323 lines), `src/components/drawer/page-shell.tsx`
(327 lines) and `src/components/drawer/shell.tsx` (99 lines) each implement a draggable panel.
`expand()` is copy-pasted (`managed-window-shell.tsx:203-235` vs `page-shell.tsx:109-141`), as is the
mobile sheet drag (`managed-window-shell.tsx:237-275` vs `page-shell.tsx:193-241`), saved-position
restore, keyboard inset, resize handles and toolbar wiring. `DrawerShell` is a third sheet used only
by the `/test` QA page. Every window behaviour you add must be written two or three times, and they
already diverge (see B5, B6, B7).

**F2. Two content pipelines for one document.**
`src/components/content-blocks/index.tsx:32-63` and `src/components/window/content-view.tsx:51-79`
are the same `switch` over block types. Every section view is already `'use client'`, so the "server
renderer" has exactly one unique capability: `ArticleListRenderer` fetching on the server, which the
window path already solves with `resolveBlocks` in `src/lib/windowContent.ts`. The route page
(`[slug]/page.tsx:48-70`) also bypasses the `unstable_cache`d `fetchWindowContent` and re-queries
three collections with full documents, plus two more queries in `generateMetadata`.

**F3. Two ways to configure the chrome.**
`src/components/window/title-context.tsx` (133 lines: eight state pairs, three "setter components"
that run effects to push props into context) exists only so the route path can tell `PageDrawerShell`
the title/toolbar flags. The window path gets the same information as plain data
(`WindowContentResult.behavior`). One path makes the whole file disappear.

**F4. Window state lives in five places and is reconciled by effects.**
`useWindowManager.ts` keeps `windows[]` and `realPrimarySlug` in React state, mirrors them into
`windowsRef`/`realPrimarySlugRef`, tracks navigation with `prevPathSlugRef`/`prevRealPrimaryRef`,
flags cosmetic URL writes with `cosmeticChangeRef`, holds restore bookkeeping in
`restoredSessionSlugsRef`, and `WindowManagerProvider` adds `openedQueryRef` (the React Compiler lint rule
`react-hooks/refs` already flags the render-time ref mirroring). Geometry is not in state
at all: it is written to `--win-x/--win-y/--win-w/--win-h` on the DOM and read back with `parsePx`.
Open windows persist to `sessionStorage`, geometry to `localStorage` under three different key
schemes (B5). Three effects (`useWindowManager.ts:139-195`) exist purely to keep these in step.
`close`, `focus` and `openContent` compute from `windowsRef.current` and call `setWindows(next)`
non-functionally (`useWindowManager.ts:197-286`), so two calls in one tick can clobber each other; it
has not bitten yet because callers happen to be spread across ticks.

**F5. The "primary window" concept.**
`primarySlug`, `isWindowVisible(rootSlug === primarySlug → hidden)`, effect 3's primary swap,
`close()` calling `router.push('/')`, `updateCosmeticUrl` skipping when a real route is active,
`PageDrawer`'s `/cookie-preferences` special case, `SYSTEM_ROUTE_KEYS`, and
`SystemWindow.closeWindow()` pushing `/` are all consequences of letting the Next route own one of the
windows. Treating the URL as *derived* from the focused window (and deep links as "open this window
focused") removes the concept entirely.

**F6. Content loading choreography.**
Because the loader is a server action (POST) that must not be called during render, the manager
pre-seeds promises in event handlers (`getOrCreatePromise` in `openContent`, `openStartupContent`,
`navigateInWindow`), `AdditionalWindow` keeps a "slug snapshot" and calls `setState` during render
(`AdditionalWindow.tsx:71-87`), adds an effect fallback for cold caches, remounts `ContentView` with
`key={slug}`, and `PageDrawerShell` repeats all of it (`page-shell.tsx:59-98`). A GET loader with a
per-slug cache can simply be `use(loadWindowContent(slug))` in render.

**F7. Imperative DOM coupling instead of state.**
- `src/components/context-menu/index.tsx:34-44,158-189` drives windows by querying
  `button[aria-label="Minimize"]` etc. and clicking them (breaks on any label change or i18n).
- `dimmos:open-display-options` / `dimmos:reset-shortcut-positions` custom events bridge contexts
  (`display-options/context.tsx:65`, `WindowManagerProvider.tsx:255`, `shortcut/grid.tsx:46`).
- `document.querySelector('header')` for header height in `managed-window-shell.tsx:206`,
  `page-shell.tsx:112`, `desktop-wallpaper/index.tsx:93` although `--header-height` already exists.
- Minimize is a two-phase state machine (`pendingMinimize` → animation → `actualMinimize`) and close
  awaits an animation before mutating state: animation concerns leak into the model.
- `onReady` is plumbed through `AdditionalWindow` → `ManagedWindowShell` but nothing passes it (the
  preloader it served was removed).

**F8. Pre-mounting every shortcut window.**
`WindowManagerProvider.tsx:108-140` keeps one full `AdditionalWindow` per shortcut and startup slug
mounted and `display:none`. Combined with fresh arrow-function props per render, no `memo`, and a
single context value for the whole manager, **every state change (focus, drag end, minimize, a
cookie-consent flag) re-renders every mounted window's content tree**, including framer-motion
subtrees. The stated reason (no "Loading…" flash) is solvable by seeding the content cache with an
already-fulfilled thenable so `use()` resolves synchronously.

### 4.2 Bugs and user-visible risks (S2)

**B1. Deep-linked content opens underneath existing windows.** Loading `/e2e-workspace` after the
startup window exists renders the route window at `z-index: 50` (`BASE_Z`) beneath the restored
window at `241`. Reproduced with the production build; the requested page is hidden behind
"Desktop Welcome" (screenshot `desktop-direct-route.png`). Cause: the primary window never gets
focused on arrival (`useWindowManager.ts:122-125,191`).

**B2. Windows drift off-screen.** Shrinking the viewport to 1024×700 left all four open windows
partially outside it (`right`/`bottom` beyond `innerWidth`/`innerHeight`), with the taskbar drawn
over them. Saved geometry is restored without clamping (`managed-window-shell.tsx:120-131`), so a
position saved on a wide monitor is unreachable on a laptop. The only clamp is inside
`startPanelDrag` while dragging.

**B3. Sitemap is frozen at build time.** `src/app/sitemap.ts` is prerendered as static (`○
/sitemap.xml` in the build output) and queries Payload during `next build`; new or deleted
articles never reach the sitemap until the next deploy. Same mechanism forces every build to have
database access (together with `generateStaticParams` in `[slug]/page.tsx:140-152`, which is dead
weight under the `force-dynamic` layout).

**B4. Stale window content for forms (and media).** `fetchWindowContent` is cached with
`revalidate: false` and only `windows`, `articles` and `tags` carry `createRevalidationHooks`. Editing
a form-builder form (fields, labels, pre-defined e-mail) or replacing a media file never invalidates
`window-content`; the contact window keeps serving the old form until a redeploy.

**B5. Same window, different saved geometry depending on how it was opened.** Keys:
`secondary:${rootSlug}` (`AdditionalWindow.tsx:62`), bare `slug` (`page-shell.tsx:177,201,321`),
`win.id` (`system-window.tsx:50`). Drag `/about` opened by URL, then open it from the shortcut: it
appears somewhere else.

**B6. Accessibility of windows is inconsistent and partly wrong.** The route drawer's `role="dialog"`
has no accessible name (`page-shell.tsx:255-265`; the probe reports `aria-label: null`, which is why
the mobile e2e has to fall back to `getByTestId('page-drawer')`). Every window sets
`aria-modal="true"` although none is modal. Opening a window never moves focus into it (probe:
`document.activeElement` stays on `body`/the clicked div; the first `Tab` lands on a desktop shortcut
instead of the new window). There is no visual or ARIA marker for the active window, only z-order.

**B7. Keyboard behaviour depends on which implementation you hit.** `Escape` closes the route drawer
via a document-level listener (`page-shell.tsx:184-191`) even when another window is focused, and
navigates to `/`; `Escape` does nothing for managed windows (probe: three windows stay open).
Double-clicking a title bar does nothing. No shortcut closes, minimizes or cycles windows.

**B8. The cosmetic URL promises something the reload cannot keep.** Focusing a window rewrites the URL
to `/slug` (`updateCosmeticUrl`). Reloading that URL yields the *other* implementation
(`PageDrawerShell`) with different keyboard handling (B7), a different geometry key (B5), no
accessible name (B6) and a different stacking position (B1).

**B9. Mobile first visit shows two full-screen sheets before the desktop.** The startup "Mobile
Welcome" sheet, then the cookie notice rendered as a 759 px tall sheet for two lines of text
(`mobile-home-dismissed.png`); shortcuts are unreachable until both are dismissed. Desktop shows the
notice as a compact top-right window; mobile deserves a compact bottom banner, not a window.

**B10. `/seo-preview/[collection]/[id]` is a public route that renders any document with
`overrideAccess: true`.** Harmless today because both collections are public-read and have no
drafts; it becomes a leak the day drafts/versions are enabled. Gate it (secret header or token) and
make sure it is `noindex`.

**B11. A vacuous test.** `tests/component/window-chrome.component.test.tsx:127` asserts
`getByRole('toolbar')` is absent, but `WindowToolbar` never renders `role="toolbar"`, so the assertion
passes even when the toolbar is shown. Add the role (it is the right role anyway) and the test
becomes real.

**B12. Content cache keyed by arbitrary input.** `getWindowContent(slug)` accepts any string; each
unknown slug becomes a permanent `unstable_cache` entry (`windowContent.ts:87-91`) after three
queries. Validate with the existing `SLUG_RE` before querying.

### 4.3 Performance and payload (S3 unless noted)

**P1. Icon font.** `remixicon/fonts/remixicon.css` pulls a 185 KB woff2 for roughly 25 icons. Inline
SVG (`@remixicon/react` is tree-shakeable, or a curated sprite keyed by the CMS `shortcutIcon`
string) removes the largest asset on the page. `WindowHeadSync` currently draws the favicon from the
font glyph via `getComputedStyle(::before)` (`window-head-sync.tsx:51-95`); with SVG icons that
becomes a `Path2D` draw or a pre-rendered set.

**P2. 415 KB of JavaScript on the home page** for a portfolio. Likely contributors: framer-motion,
posthog-js, Sentry, the Lexical rich-text React renderer and Next itself. Run
`@next/bundle-analyzer` once; candidates are lazy-loading PostHog/Sentry Replay until consent is
given (already partly done) and loading Lexical's renderer only when a rich-text block is present.

**P3. Every page serialises every shortcut window's content** (`fetchAllShortcutContents` →
`preloadedContents` prop → RSC payload) and article windows ship their content **twice**: the full
`doc` (raw `content` blocks included) *and* the resolved `blocks` (`windowContent.ts:72`). With
fixture content that is 23–28 KB inline; with real case studies it will be several times that on
every request. Send only what the client renders (resolved blocks, title, buttons, behaviour, the
two image layers) and preload lazily (prefetch on hover/`requestIdleCallback`) instead of inlining.

**P4. Uncached per-request work in the layout.** `fetchData()` runs five Payload queries on every
request (`layout.tsx:73-92`) under `force-dynamic`; only `fetchWindowContent` is cached. Cache the
registry/shortcut/startup data with the same tag (it changes only on CMS saves, which already
revalidate) and pass `consentVersion` from the server instead of the client fetching
`/api/globals/cookie-settings` on every load (`cookie-banner/context.tsx:76`).

**P5. Always-on work.** The wallpaper runs a `requestAnimationFrame` loop drawing `rows × cols`
rounded rectangles forever, including when the tab is hidden, when `prefers-reduced-motion` is set,
and when windows cover it (`desktop-wallpaper/index.tsx:110-242`). The clock re-renders the header
every second to display minutes (`header/clock/index.tsx:22`). Each mounted window registers its own
`visualViewport` listeners through `useKeyboardInset`.

**P6. Sentry `tracesSampleRate: 1`** on both client and server (`instrumentation-client.ts`,
`sentry.server.config.ts`) traces 100 % of requests; fine for a hobby quota, expensive otherwise.

### 4.4 Hygiene, dead code and configuration drift (S3)

| Item | Where | Action |
| --- | --- | --- |
| QA checklist page shipped to production | `src/app/(frontend)/test/page.tsx` | delete (and `DrawerShell` + `trigger.tsx` + `close-button.tsx` + `drawer/index.tsx`, used only here) |
| Template leftover route that creates a Payload instance to return a string | `src/app/my-route/route.ts` | delete |
| Component that renders `null` | `src/components/cookie-banner/index.tsx` | delete |
| Unused server component | `src/components/form/index.tsx` (`Form`) | delete |
| State written, never read | `setClosedSlugs` in `WindowManagerProvider.tsx:79,132` | delete |
| Stub context fields (`isDisplayOptionsOpen` always `false`, `closeDisplayOptions` no-op) | `display-options/context.tsx:64-66` | delete |
| Unused exports | `canUseCustomCursor`, `serializeOpenWindows`, `isSystemWindowId`, `evictPromise`, `DESKTOP_MEDIA_QUERY`, `onReady` | delete |
| Two seed entry points with different naming | `scripts/seedCookieServices.ts` wraps `seed-cookie-services.ts` | keep one |
| Production `Dockerfile` cannot build this repo (yarn/npm/pnpm lockfile logic, no `bun.lock`, `output: 'standalone'` not set) | `Dockerfile` | delete or rewrite for bun |
| Package manager leftovers | `package.json` `engines.pnpm`, `pnpm.onlyBuiltDependencies`, description "A blank template…", `.npmrc` (`legacy-peer-deps`), `.yarnrc` | clean up |
| 110 files duplicated byte-for-byte | `.agents/skills/**` = `.claude/skills/**` | symlink one to the other |
| `@ts-ignore` | `src/scripts/seed-content.ts:9` | fix |
| `body { height: 100vh }` | `styles.css:40` | `100dvh` (mobile browser chrome) |
| `aria-modal="true"` on non-modal windows | three shells | remove |
| `generateStaticParams` under `force-dynamic` | `[slug]/page.tsx:140-152` | remove |

### 4.5 Documentation drift (S3)

`README.md` is 67 KB mixing reference docs with a roadmap, and it describes code that no longer
exists: `manager.openDeferred`, `PreloaderProvider`/`PagePreloader`/`preloader-context`,
`contentCache`, `closedSlugs` (the dead state above), `useMediaQuery`, `WindowShell.tsx`,
`ContextMenu.tsx`, "`onBack = router.back()`". Phase 2.2/2.3 items are unchecked although the taskbar
and window system exist. `AGENTS.md` carries a "Testing standards" section that `CLAUDE.md` lacks.
Split into `docs/architecture.md` (what is true), `docs/testing.md` (exists), and `ROADMAP.md`;
make `AGENTS.md` and `CLAUDE.md` one file (or one include).

### 4.6 Tests

The harness is well built and the e2e journeys are the most valuable asset for a refactor: they are
locator-by-role, cover startup, drag, resize, minimize/restore, toolbar, history, context menus,
consent, forms, SEO and admin, and they pass. Three issues:

**T1. Coverage measures the easy files.** `vitest.config.ts:7-57` is an allowlist of 49 modules.
`useWindowManager.ts`, `WindowManagerProvider.tsx`, `managed-window-shell.tsx`, `page-shell.tsx`,
`AdditionalWindow.tsx`, `content-view.tsx`, `taskbar`, `context-menu`, `shortcut/grid.tsx` and
`window-head-sync.tsx` are all outside it. The "90 % lines" gate therefore says nothing about the
code you distrust; only the 49-second e2e run protects it.

**T2. The gate runs unit and component suites twice by design** (`tests/scripts/run-in-container.sh:12-15`).
Flake detection belongs in the nightly matrix, not in every push.

**T3. Component tests exercise harnesses, not the shells.** `window-state-and-recovery` drives the
hook through buttons and `window-chrome` tests the title bar/toolbar/resize handles in isolation;
nothing renders `ManagedWindowShell` or `PageDrawerShell`. After consolidation, one `WindowFrame`
component test (drag, resize, keyboard, focus, sheet mode) plus pure reducer unit tests cover what
today only e2e reaches.

**T4.** The vacuous toolbar assertion (B11).

---

## 5. Target architecture

### Principles

1. **One source of truth for windows**: a store holding `windows` (by id), `order` (z-order = array
   index), geometry, history, minimized/maximized flags. Everything else derives from it: the URL,
   the taskbar, the head title/favicon, the context menu items.
2. **One `WindowFrame`**: the only component that knows how to be a window on desktop and a sheet on
   mobile. System windows, content windows and route-opened windows all use it.
3. **One content loader**: `loadWindowContent(slug)` returns a cached thenable; SSR data seeds it as
   already fulfilled. Callable in render.
4. **Routes are intents, not implementations**: `/[slug]` server-renders the content for crawlers and
   first paint and seeds the store; it does not own a different window component.
5. **Geometry is data**: drag writes to the DOM for the duration of the gesture, then commits to the
   store; maximize, snap, clamp and session restore are pure functions over data.

### Layout

```
src/desktop/
  store.ts              createDesktopStore(initial) — zustand (1 KB, selector subscriptions) or a
                        ~60-line useSyncExternalStore store; persist middleware for session/geometry
  reducers.ts           pure: open, close, focus, minimize, restore, maximize, move, resize,
                        clampToViewport, snap, navigate/back/forward, restoreSession  (unit-tested)
  content-loader.ts     loadWindowContent(slug) → cached thenable; seed(slug, data) marks it fulfilled
  use-pointer-drag.ts   one pointer-capture drag hook (rAF-throttled) used by move, resize,
                        shortcut drag and sheet dismiss
  url-sync.tsx          focused window → history.replaceState('/slug' | '/') (10 lines)
  components/
    desktop.tsx         renders <WindowFrame> for each id in order (no pre-mounting; <Activity
                        mode="hidden"> for minimized windows if you want them to keep scroll state)
    window-frame.tsx    chrome + toolbar slot + body + 8 resize handles + focus/active state +
                        keyboard (Esc, ⌘/Ctrl+W, ⌘/Ctrl+M) + mobile sheet mode via CSS
    window-body.tsx     <ErrorBoundary><Suspense><ContentView data={use(load(slug))}/></…>
    taskbar.tsx, context-menu.tsx, head-sync.tsx   read the store, call actions directly
  system/registry.tsx   today's systemWindowRegistry, unchanged in spirit
src/content/
  content-view.tsx      the single block renderer (today's content-view.tsx, minus the duplicate)
  blocks/…              today's sections + animation toolkit, unchanged
```

### Store shape (sketch)

```ts
type WindowId = `content:${string}` | `system:${SystemWindowKey}`
type WindowRecord = {
  id: WindowId
  kind: 'content' | 'system'
  slug: string                       // current content (history[historyIndex])
  history: string[]; historyIndex: number
  rect: { x: number; y: number; w: number; h: number } | null   // null = CSS default
  restoreRect: WindowRecord['rect']  // before maximize/snap
  maximized: boolean; minimized: boolean
}
type DesktopState = {
  windows: Record<WindowId, WindowRecord>
  order: WindowId[]                  // last = focused; z-index = index + BASE_Z
  open(slug | key, opts?): void      // creates or focuses; never navigates
  close(id): void; focus(id): void; minimize(id): void; restore(id): void
  toggleMaximize(id): void; move(id, xy): void; resize(id, rect): void
  navigate(id, slug): void; back(id): void; forward(id): void
  clampAll(viewport): void           // on resize/mount
}
```

Z-order as an array removes the monotonically growing `zIndex`, the `SYSTEM_BASE_Z` table, the
taskbar's `maxZ + 1`, and the `Math.max(win.zIndex, entry.zIndexPriority)` arithmetic; a system
window that must stay on top is just pinned at the end of `order`.

### Route ↔ window

- `app/(frontend)/[slug]/page.tsx` fetches `fetchWindowContent(slug)` (cached, same function the
  loader endpoint uses) and renders `<RouteWindowSeed slug content />`, a client component that puts
  the window into the store before the frame list renders (during render on the server and on
  hydration; in a layout effect on later client navigations). The layout renders `<Desktop />`
  **after** `{children}` so render order guarantees the seed is visible to the first paint and the
  content is in the server HTML for crawlers. The page itself renders nothing visible.
- If that ordering feels too subtle, the fallback is equally small: the page renders the shared
  `<WindowFrame>` itself with the SSR content and marks the id `routeOwned`; `<Desktop>` skips that
  id. Either way `PageDrawerShell`, `WindowTitleProvider` and the primary/secondary split are gone.
- Mobile shortcuts stop calling `router.push`; they open through the store like desktop. `/slug`
  URLs keep working through the seed.
- Deep links open **focused** (fixes B1); closing the last window sets the URL to `/`.

### Content loading

- `GET /window-content/[slug]` (a route handler outside Payload's `/api` namespace) returns
  `WindowContentResult` from the same cached function; validates the slug (B12); carries
  `Cache-Control` so a CDN can serve repeats.
- `loadWindowContent(slug)` keeps a `Map<slug, Thenable>`; SSR-preloaded data is inserted as
  `{ status: 'fulfilled', value }` so `use()` returns synchronously and opening a shortcut window
  never shows a fallback. No pre-mounted windows, no `seedPromise` in render, no slug snapshots.
- Trim `WindowContentResult` for articles to what the client renders (P3).
- Revalidation: tag the form-builder collections and media too (B4); consider `'use cache'` +
  `cacheTag` instead of `unstable_cache` when touching this.

### Mobile

Same store, same `WindowFrame`. Under 1024 px the frame renders as a bottom sheet (CSS already does
this via `[data-window-panel]`), `Desktop` shows only the focused window, and sheet dismiss uses the
same drag hook with a vertical axis. The cookie notice gets its own compact banner on mobile instead
of a full-height sheet (B9).

### What this deletes

| Delete | Lines | Replaced by |
| --- | ---: | --- |
| `hooks/useWindowManager.ts` | 345 | `desktop/store.ts` + `reducers.ts` |
| `components/window/WindowManagerProvider.tsx` | 296 | `desktop/components/desktop.tsx` + a small lifecycle component |
| `components/drawer/page-shell.tsx` | 327 | `WindowFrame` |
| `components/drawer/shell.tsx`, `trigger.tsx`, `close-button.tsx`, `index.tsx`, `page-drawer.tsx`, `context.ts` | 177 | nothing (the `/test` page goes too) |
| `components/window/managed-window-shell.tsx` | 323 | `WindowFrame` |
| `components/window/AdditionalWindow.tsx` | 173 | `WindowBody` |
| `components/window/title-context.tsx` | 133 | data on the store |
| `components/window/manager-context.tsx` | 40 | store hook |
| `lib/window-promise-cache.ts`, `actions/getWindowContent.ts` | 52 | `content-loader.ts` + route handler |
| `components/content-blocks/index.tsx`, `article-list-renderer.tsx` | 81 | `ContentView` |
| duplicated drag code in `shortcut/grid.tsx` | ~50 | `usePointerDrag` |

---

## 6. Action plan

Each phase is independently shippable and keeps the e2e suite green. Effort assumes one developer
familiar with the code; treat the numbers as ranges, not promises.

### Phase 0 — hygiene and quick wins (1–2 days)

1. Delete the dead files and exports in §4.4; remove `generateStaticParams`; add
   `export const dynamic = 'force-dynamic'` (or a `revalidate`) to `sitemap.ts` (B3).
2. Add revalidation hooks for form-builder collections and media; validate slugs in the loader (B4, B12).
3. Replace the icon font with SVG icons (P1); pause the wallpaper when hidden/reduced-motion/covered
   and cap its idle frame rate; tick the clock once a minute (P5).
4. Pass `consentVersion` from the layout to `CookieConsentProvider`; cache the layout registry data by tag (P4).
5. Remove `aria-modal`, add `aria-labelledby` to every window, add `role="toolbar"` (B6, B11).
6. Fix or delete `Dockerfile`; clean `package.json`, `.npmrc`, `.yarnrc`; symlink `.agents/skills`.
7. Split the README (§4.5). Lower Sentry sample rates (P6). `100dvh` (§4.4).

### Phase 1 — store and loader, no UI change (2–3 days)

1. Add `src/desktop/reducers.ts` with unit tests for every transition (open/focus/close/minimize/
   maximize/clamp/snap/history/session restore). This is where "robust" is won: the logic becomes
   testable without a browser.
2. Add `store.ts` and re-implement the `WindowManager` API on top of it so existing components keep
   working (adapter), including URL sync and session persistence as store middleware.
3. Add the GET route handler and `content-loader.ts`; switch `AdditionalWindow`/`PageDrawerShell` to
   `use(loadWindowContent(slug))`; delete the promise-cache choreography.
4. Exit criteria: e2e green; `useWindowManager.ts` is a thin adapter; no `windowsRef`-style mirrors.

### Phase 2 — one `WindowFrame` (3–5 days)

1. Extract `WindowFrame` from `ManagedWindowShell`: props are `id` + `children`; everything else
   comes from the store via selectors. Add `usePointerDrag` and 8-way resize while you are in there.
2. Move system windows and content windows onto it; delete `AdditionalWindow` glue, `isPreloaded`/
   `isVisible`/`onReady`, two-phase minimize (`AnimatePresence`/`useAnimate` handle exit animations).
3. Move the route path onto it (`RouteWindowSeed`); delete `page-shell.tsx`, `title-context.tsx`,
   `drawer/*`, the primary-slug logic, `SYSTEM_ROUTE_KEYS`, the custom events, the `aria-label`
   click-driving in the context menu.
4. Exit criteria: one implementation; the same e2e journeys pass; B1, B5, B6, B7, B8 fixed by
   construction.

### Phase 3 — one content pipeline (1–2 days)

1. The route page uses `fetchWindowContent(slug)` and renders through `ContentView`; delete
   `content-blocks/index.tsx` and `ArticleListRenderer`; `generateMetadata` reuses the cached result.
2. Trim the article payload; stop inlining all shortcut contents into every page (prefetch on hover
   or idle instead).

### Phase 4 — desktop behaviour (feature by feature, see §7)

### Phase 5 — tests and docs (1–2 days)

1. Put `src/desktop/**` and `src/content/**` inside the coverage scope; add the `WindowFrame`
   component test and reducer unit tests; drop the duplicate suite runs from the push gate (keep
   them nightly).
2. `docs/architecture.md` describing §5 as built; `ROADMAP.md` for the rest.

---

## 7. Desktop behaviour backlog (after Phase 2)

Ordered by value for the "feels like a real desktop" goal. All of these are reducer functions plus a
few lines in `WindowFrame` once the foundation exists; most are impossible to do cleanly today
because they would have to be implemented three times.

| # | Feature | What it needs | Notes |
| --- | --- | --- | --- |
| 1 | Active window model: focused window has a distinct title bar, receives focus on open, `Esc` closes, `⌘/Ctrl+W` close, `⌘/Ctrl+M` minimize, `⌘\``/`Alt+Tab` cycle, arrows + modifier move/resize | `order`, `focus()`, keyboard handler in `WindowFrame` | fixes B6/B7; announce open/close via a live region |
| 2 | Keep windows on screen: clamp on mount, on viewport resize, on restore from storage; minimum size; max within desktop minus taskbar | `clampAll(viewport)` reducer | fixes B2 |
| 3 | 8-direction resize (N/S/E/W + corners) with keyboard support | `WindowFrame` handles + `resize()` | today only E/S/SE |
| 4 | Maximize on title-bar double-click; snap to left/right half and top (maximize) with a translucent preview while dragging; drag a maximized window to restore | `toggleMaximize`, `snap()`, `restoreRect` | persist `maximized` |
| 5 | Window menu (title-bar right-click / ⋯ button): Minimize, Maximize, Close, Open in new tab, Copy link | context menu reads the store | replaces the `aria-label` click-driving |
| 6 | Persistent dock: always visible, pinned shortcuts, running indicator, hover preview thumbnails, Show Desktop, drag to reorder | taskbar reads `order`; `<Activity>` for thumbnails | today the taskbar disappears with no windows |
| 7 | Full session restore: geometry, history, minimized/maximized, z-order (today only root slugs) | persist middleware | one key scheme (fixes B5) |
| 8 | Menu bar: app menu (About, Display options, Reset icons, Restart = reload), clock popover with calendar | small components | |
| 9 | Launcher / Spotlight (`⌘/Ctrl+K`): fuzzy search over the shortcut registry and articles, opens a window | registry context | |
| 10 | Boot / login screen once per session (roadmap 5.1); lock screen; "shut down" easter egg | one overlay + `sessionStorage` | respect reduced motion |
| 11 | Notifications/toasts ("Message sent", "Preferences saved") as a `system` window kind anchored top-right | registry entry | |
| 12 | Desktop icons: marquee selection, keyboard navigation, "Clean up"/sort, grid snapping on drop | shortcut store + `usePointerDrag` | today each pointer move sets React state |
| 13 | Themes: wallpaper variants, accent colour, light mode; cursor options already exist | extend display-options + CSS variables | |
| 14 | Genie minimize/restore using framer-motion `layoutId` between the dock button and the frame; same animation on both paths | `WindowFrame` only | removes `querySelector('[data-window-id]')` |

---

## 8. What to keep (do not rewrite)

- Payload collections, fields, hooks, access control discipline (`overrideAccess: false`, `select`,
  `depth`, indexes) — this is the strongest part of the repo.
- Content blocks, section views and the animation toolkit (`ScrollRoot`, `AnimatedText`,
  `PixelatedImage`, `ParallaxImagePair`, `CountUp`) — well isolated, reduced-motion aware.
- System window registry concept, cookie consent + consent-mode gating, SEO image generation with
  injectable dependencies, OG fallback images.
- The e2e journeys and fixtures — they are the refactor's safety net. Add to them, do not replace them.
- The visual design: traffic lights, genie animation, reactive wallpaper, custom cursor, context menus.

---

# Part II — Repository and process (dimm-os)

Part I looked at the code. This part looks at everything around it: how work is described (issues),
how it is reviewed and merged (PRs, merge policy, rulesets), how it is checked (CI, coverage), and how
an agent can pick it up. Every standard quoted here comes from the vendor's own documentation; the
sources are listed in §18 and Appendix D. Where a number is a budget rather than a standard, it is
marked as a proposal.

## 9. Verdict on the repository

The repository is **under-filled, not bloated** — the opposite problem from `atmjet_website`. It has
one CI workflow with sound basics (read-only token, concurrency, frozen lockfile, artifacts), a real
multi-layer test suite and a short agent guide. It has nothing else: no issue has ever been opened, no
template, no license, no code owners, no dependency updates, no branch rules, and the merge policy
glues commit messages together. Conventions exist on paper (`CLAUDE.md`: "new files use kebab-case")
and nothing checks them, so they drift exactly the way you described: an agent writes a file, CI (or
you) notices later.

The fix is small and mostly mechanical: about twelve files under `.github/` and `.claude/`, six
repository settings set through the API, and the test gate made runnable without Docker. One action
needs you: issuing a scoped token (§19). Everything else an agent can do and verify.

## 10. Repository findings

Severity uses the Part I scale: **S1** blocks agents or hides breakage, **S2** costs time every week,
**S3** hygiene.

### R1 — Community files: README only (S2)

**Evidence.** `.github/` contains a single file, `workflows/ci.yml`. There is no `LICENSE`,
`CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY.md`, issue template, PR template, `CODEOWNERS` or
`dependabot.yml`. GitHub's community profile for the repository lists only the README as present.

**Standard.** GitHub's community profile checklist looks for README, CODE_OF_CONDUCT, LICENSE,
CONTRIBUTING, a security policy and issue templates. All of them except LICENSE may live in `.github/`
("GitHub uses the following order of precedence: the `.github` folder; the root of the repository; the
`docs` folder"). LICENSE must be in the root. Issue templates count only when they are in
`.github/ISSUE_TEMPLATE` with valid `name`/`description` (`.yml`) keys.

**Fix.** Add the files under `.github/` (keeps the root clean) and `LICENSE` in the root. The license
choice is yours (a content decision); the files are agent work. Contents in `docs/project-standard.md`.

### R2 — No issues, no templates, bot-written PR bodies (S1 for agent work)

**Evidence.** Zero issues in the repository's history. Thirteen PRs; six of thirteen titles are the
branch name (`Feat/preloader wave reveal` style) and the bodies are CodeRabbit auto-summaries
describing *what* changed, never *why* or what "done" means. The branch
`feat/preloader-wave-reveal` was abandoned with red CI and no issue to say why.

**Why it matters.** An agent needs three things to work unattended: a scoped task, acceptance criteria
and a place to report. None exist. This is also why the roadmap drifted into parallel implementations
(Part I §4.1): nothing recorded the intended design before the code.

**Standard.** Issue forms (`.github/ISSUE_TEMPLATE/*.yml`) "must begin with `name`, `description`, and
`body`"; optional `labels`, `assignees`, `title`, `type`, `projects`. `config.yml` with
`blank_issues_enabled: false` hides the blank option from everyone below Write. Files are listed
alphanumerically, so number them. PR template: `.github/pull_request_template.md`. Sub-issues: up to
100 per parent, eight levels deep — enough for epics without a project board.

**Fix.** Two forms (`1-task.yml`, `2-bug.yml`), optionally `3-decision.yml`, plus `config.yml` and
one PR template that asks for `Closes #n`, the why, and how it was verified. See
`docs/project-standard.md` §4.

### R3 — Merge policy glues commit subjects (S2)

**Evidence.** All three merge methods are enabled. Squash is configured with
`squash_merge_commit_title: COMMIT_OR_PR_TITLE` and `squash_merge_commit_message: COMMIT_MESSAGES`,
so for single-commit PRs the commit subject is used and for multi-commit PRs the messages are
concatenated. On `master`, 8 of 52 subjects contain two or more conventional prefixes glued into one
line, e.g.

```
feat: ✨ add preloader and window toolbar components with context management test: ✅ implement e2e tests fo…
fix: 🔧 update seed scripts to remove unnecessary environment file flag feat: 🖼️ enhance DesktopWallpap…
```

Subjects also carry an emoji after the type. The Conventional Commits spec allows any description,
but the emoji repeats what the type already says and breaks `git log --grep='^feat'` style tooling.

**Standard.** Conventional Commits 1.0.0: `<type>[optional scope]: <description>`; "Go back and make
multiple commits whenever possible"; and for squash workflows: "lead maintainers can clean up the
commit messages as they're merged". GitHub rulesets can require a merge method
(`allowed_merge_methods: ["squash"]`) and the repository can default the squash message to the PR
title (`squash_merge_commit_title: PR_TITLE`, `squash_merge_commit_message: PR_BODY` or `BLANK`).

**Fix.** Squash only; default message = PR title; lint the PR title as a conventional subject in CI
(a 10-line script or `amannn/action-semantic-pull-request`, which `atmjet_website` already uses);
drop the emoji. The `master` log then reads as the list of merged PRs, one line each.

### R4 — No rulesets, no required check (S1)

**Evidence.** No branch protection or ruleset exists. A PR with red CI can be merged; `master` accepts
direct pushes and force pushes.

**Standard.** Rulesets are available on public repositories on the Free plan. A ruleset can require a
pull request, require status checks (named check; "strict" = branch must be up to date), block force
pushes and deletions, and restrict merge methods. Multiple rulesets aggregate, most restrictive wins.
Rulesets can be created and updated through the REST API (`POST /repos/{owner}/{repo}/rulesets`) and
imported/exported as JSON.

**Fix.** One ruleset on `master`: pull request required, required check `ci` (the aggregate job,
R5), block force push, block deletion, squash only. Keep the repository admin as a bypass actor so an
emergency fix is still possible. Store the JSON in `.github/rulesets/master.json` as
`atmjet_website` does, and apply it with the API.

### R5 — CI: good basics, four avoidable costs and one permanent red (S1)

**What is right.** `permissions: contents: read`, `concurrency` with `cancel-in-progress`,
`bun install --frozen-lockfile`, `timeout-minutes`, artifacts uploaded with `if: always()`.

**Costs.**

1. **Actions pinned to tags** (`actions/checkout@v4`, `oven-sh/setup-bun@v2`,
   `actions/upload-artifact@v4`). GitHub: "Pin actions to a full-length commit SHA" or use a workflow
   lockfile; "a tag can be moved or deleted if a bad actor gains access to the repository storing the
   action." Dependabot keeps the `# vX.Y.Z` comment on the same line in sync.
2. **Bun version in three places**: `.bun-version`, and `bun-version: 1.2.15` twice in `ci.yml`.
   `oven-sh/setup-bun` has a `bun-version-file` input that reads `.bun-version`, `package.json` or
   `.tool-versions`. One source.
3. **The gate needs Docker.** `bun run test` and `bun run test:ci` both call
   `tests/scripts/run-test-stack.sh`, which exits if `docker info` fails, builds `Dockerfile.ci` and
   runs everything inside Compose. Agent sandboxes and most contributors' CI mental model have no
   Docker daemon; this session had none either (Part I measurements used a local Postgres instead).
   The same isolation is available natively: GitHub Actions `services: postgres` plus Playwright's
   documented `npx playwright install --with-deps`. Locally, a disposable database is one
   `DATABASE_URL` away. Docker stays optional, not the gate.
4. **The `all` suite runs unit and component tests twice** (`run-in-container.sh` lines 12–15) to
   prove repeatability (AGENTS.md "Testing standards" rule 4). Good rule, wrong place: run the second
   pass nightly, not on every PR.
5. **`nightly-cross-browser` has been red every night since at least 2026-09-26** (Firefox failures in
   `tests/component/form-and-ai.component.test.tsx`). A job that is always red is a job everyone
   ignores — and it hides the day a Chromium failure joins it. Fix or delete; never keep it red.

**Standard.** Vitest: coverage is root-level, "done for the whole process"; Playwright: "We recommend
setting workers to 1 in CI", `retries: process.env.CI ? 2 : 0`, `trace: 'on-first-retry'`,
`forbidOnly: !!process.env.CI`; install only needed browsers. GitHub: `pull_request` runs by default on
`opened`, `synchronize`, `reopened`; a required check name must be stable, hence an aggregate job.

**Fix.** One `ci.yml` (lint → typecheck → unit/component → integration with a Postgres service →
build → e2e chromium), an aggregate job named `ci` that is the only required check, SHA-pinned actions
with Dependabot `github-actions` updates, `bun-version-file: .bun-version`. Nightly: the repeat pass
and the cross-browser matrix, fixed first.

### R6 — Labels: defaults only (S3)

**Evidence.** The ten GitHub default labels (`bug`, `enhancement`, `documentation`, …) and nothing
else; none is used because there are no issues.

**Fix.** A scheme small enough to apply without thinking: `type:task|bug|decision`, `area:desktop|
content|infra`, `ready`, `blocked`, `owner-action`. Twelve at most (proposal). Labels referenced by
issue forms must exist or they are silently dropped (GitHub docs).

### R7 — Four package managers' fingerprints (S3, but confuses agents)

**Evidence.** The truth is Bun (`bun.lock`, `.bun-version`, CI). The repository also carries
`package.json#engines.pnpm: "^9 || ^10"`, `.vscode/settings.json` → `"npm.packageManager": "pnpm"`,
`.yarnrc`, and `.npmrc` with `legacy-peer-deps=true` (an npm-only setting). An agent reading the repo
sees four managers and has to guess.

**Fix.** Delete `.yarnrc` and `.npmrc`; remove the `pnpm` engine; set the VS Code setting to `bun`.

### R8 — Root clutter and tracked junk (S3)

**Evidence.** 34 tracked root entries, including `test-output.txt` (a stray test log),
`Dockerfile`, `Dockerfile.ci` and `docker-compose.yml` (test infrastructure), and both `CLAUDE.md`
and `AGENTS.md` (R9). For comparison: `atmjet_website` 40, `claimlands-fable` 25.

**Fix.** Delete `test-output.txt` (and add `*.txt` logs to `.gitignore` if they recur). If Docker
stays as an optional local runner, move its three files to `tests/docker/` (`docker compose -f`).
Target: ≤ 25 tracked root entries (proposal; framework-mandated files such as `next.config.ts`,
`instrumentation.ts`, `sentry.*.config.ts` are fixed by their tools).

### R9 — Agent instructions duplicated and diverged (S1 — this is a cause of convention breaks)

**Evidence.** `.claude/skills/` and `.agents/skills/` are byte-identical copies (110 files, 808 KB
each). `CLAUDE.md` (38 lines) and `AGENTS.md` (51 lines) have diverged: `AGENTS.md` contains the
"Testing standards — CRITICAL" section; `CLAUDE.md` does not. Claude Code loads `CLAUDE.md`. So the
tool you use most never sees the testing rules you consider mandatory.

**Standard (Claude Code docs/changelog).** `CLAUDE.md` supports `@path` imports, so `CLAUDE.md`
containing only `@AGENTS.md` makes the two files one (this is what `atmjet_website` does). Since
2.1.277 Claude Code also reads `AGENTS.md` natively when no `CLAUDE.md` exists. Guidance in these
files is advisory: the docs say that if something must happen every time, make it a hook. Target
length is under 200 lines; anything path-specific belongs in `.claude/rules/*.md` with a `paths:`
frontmatter so it loads only when matching files are read or edited.

**Fix.** One `AGENTS.md` (≤ 120 lines, proposal), `CLAUDE.md` = `@AGENTS.md`, one skills directory
(the other becomes a symlink if a second tool needs the path), and the Payload and testing rules moved
to `.claude/rules/payload.md` and `.claude/rules/tests.md` with `paths:`.

### R10 — Naming is a wish, not a rule (S1 — the "breaks conventions" mechanism in miniature)

**Evidence.** Under `src/`, TypeScript files are 120 kebab-case, 17 PascalCase and 21 camelCase.
`CLAUDE.md` says "New files use kebab-case". Nothing checks it: no `eslint-plugin-check-file` rule, no
pre-commit hook, no CI step, no Claude hook. The only enforcement is a reviewer noticing.

**Standard.** `eslint-plugin-check-file` enforces file and folder case per glob
(`KEBAB_CASE`, `NEXT_JS_APP_ROUTER_CASE` for `app/` segments, `ignoreMiddleExtensions` for
`foo.test.ts`); `@typescript-eslint/naming-convention` enforces identifier case. Claude Code
`PreToolUse` hooks on `Edit|Write` receive `tool_input.file_path` on stdin and **exit 2 blocks the
call and returns stderr to Claude** — in every permission mode.

**Fix.** The enforcement ladder in §14: a write-time hook (shipped and tested, `docs/project-standard.md`
§5), the lint rule in `eslint.config.mjs`, lefthook pre-commit, CI. Existing files keep their names
(the hook only judges new files), which honours the CLAUDE.md note about case-only renames.

### R11 — Coverage measures an allowlist (S2)

**Evidence.** `vitest.config.ts` sets `coverage.include` to `coverageModules`, a hand-written list of
49 files, with global thresholds 85/90/90/90 and a custom per-file floor script
(`tests/scripts/assert-coverage.mjs`, 70/70/70/60). The headline number is therefore "coverage of the
files we chose to count". New files are uncounted until someone adds them to the list.

**Standard (Vitest 4.0.18 docs).** `coverage.include` defaults to "files that were imported during
test run"; "to include uncovered files in the report, you'll need to configure `coverage.include` with
a pattern that will pick your source files". `thresholds.perFile: true` checks each file against the
thresholds natively; glob-keyed thresholds exist for stricter areas; `autoUpdate` can ratchet but
makes the config churn — fixed numbers are easier to reason about.

**Fix.** `include: ['src/**/*.{ts,tsx}']`, `exclude` for generated and framework files
(`payload-types.ts`, `migrations/**`, `app/(payload)/**`, `*.d.ts`), thresholds set to the real
current numbers after the change, `perFile: true`, and the custom script deleted. Tests are 4,397
lines against 12,019 lines of source — a healthy ratio; the problem is what is counted, not how much.

### R12 — Branch and release hygiene (S3)

**Evidence.** `feat/preloader-wave-reveal` is abandoned with failing CI; there is no issue or PR
comment saying whether it is dead. There are no tags or releases. Whether merged branches are
auto-deleted is a repository setting an agent can set (`delete_branch_on_merge`).

**Fix.** Delete or finish the branch (tag it `archive/<name>` first if the work has value — a tag is
one API call with `contents: write`); enable auto-delete of merged branches.

## 11. Scorecard — maintain, scale, assign to agents

| Question | Today | After §19 |
|---|---|---|
| Can a newcomer run the full gate on a laptop without Docker? | No (R5.3) | Yes: Postgres URL + `bun run test` |
| Can an agent pick up work without a conversation? | No: no issues, no acceptance criteria (R2) | Yes: `ready` issues from the `1-task` form |
| Does a wrong file name fail before it is committed? | No (R10) | Yes: blocked at write time, then lint, then CI |
| Does a red PR stay unmerged? | No (R4) | Yes: ruleset + required `ci` |
| Is the `master` log readable as a change list? | No: 8 glued subjects, emoji (R3) | Yes: one conventional PR title per merge |
| Is the coverage number meaningful? | No: allowlist of 49 files (R11) | Yes: all of `src/**`, fixed thresholds |
| Do dependencies update themselves? | No | Yes: Dependabot, grouped, weekly |
| Are agent instructions single-sourced? | No: two guides, two skill trees (R9) | Yes: `AGENTS.md` + imports + rules |
| Is anything always red? | Yes: nightly since 2026-09-26 (R5.5) | Nothing red is tolerated |

---

# Part III — Lessons from `atmjet_website` and `claimlands-fable`

You asked what "bloated" means in those two repositories and why the same agents keep breaking
conventions, modelled media wrongly, and produced owner work. Below: the measurements, then each of
the four pains traced to a root cause and a fix that applies to dimm-os and to new projects.

## 12. What "bloated" measures as

| Measure | dimm-os | atmjet_website | claimlands-fable |
|---|---|---|---|
| Tracked files | 505 (incl. 31 migrations) | 993 | 260 |
| Tracked root entries | 34 | 40 | 25 |
| Workflows | 1 | 7 (`ci`, `conventions`, `e2e`, `labels`, `legacy-baselines`, `legacy-performance`, `scrub-comments`) | 7 (`ci`, `branch-guard`, `labels`, `mobile`, `policy`, `preview`, `stale-claims`) |
| Labels defined | 10 (defaults) | 27 custom + defaults | 38 |
| Issue templates | 0 | 5 + config | 4 + config |
| ADRs | 0 | 9 | 10 |
| Scripts | 5 seed + 4 test scripts | 72 files under `scripts/` | `xtask` crate |
| Migration files | 31 | 93 files, 991,158 lines (generated SQL + snapshots) | n/a |
| Tests vs source (lines) | 4,397 vs 12,019 | 25,158 vs 18,753 | — |
| `docs/` | 2 files | 55 files, 9.3 MB (legacy TSV dumps, inventories) | 22 files |
| Agent guide | 38 + 51 lines, diverged | 79 lines / 15 KB (wide tables) | 89 lines |
| Attribution enforcement layers | 0 | 4 (settings deny, PreToolUse hook, `conventions` scan, `scrub-comments`) | 2 (`policy/banned.txt` + hook) |
| Owner-action issues | 0 | 18 (4 open) | 7 open "Design:" questions assigned to the owner |

Three patterns produce the bloat:

1. **Every concern got its own artefact.** Seven workflows where one `ci.yml` with four jobs would
   do; a label for every axis; an ADR for every decision including ones nobody will revisit. Each
   artefact is cheap to add and expensive to keep consistent. `atmjet_website`'s own ADR-0008 ("lean
   conventions") diagnoses this correctly — the repo just never deleted what the ADR superseded.
2. **The same rule enforced in several places.** Attribution is checked four times in
   `atmjet_website`. Four implementations of one rule means four places to update and four ways to
   disagree; meanwhile naming and data-model rules had zero enforcement. Enforcement effort went to
   the rule that was easiest to regex, not the one that was breaking.
3. **Data in git.** 991 k lines of generated migrations and 9.5 MB of legacy dumps make every clone,
   grep and agent context window pay for history. Generated and legacy data belong in releases,
   object storage or a `linguist-generated` folder that tooling skips — the repo already marks
   migrations `linguist-generated`, which fixes the diff view but not the clone.

## 13. Pain 1 — too much of everything

**Root cause.** "Fully filled" was read as "everything GitHub offers". GitHub recognises eleven kinds
of community/health files; a minimal, fully-filled repository needs seven, in `.github/`, and three
settings. Everything else is optional and should justify itself.

**Fix: a budget with a placement rule.** Numbers are proposals, chosen so that a reader can hold the
whole repository in their head:

| Thing | Budget | Where | Why this number |
|---|---|---|---|
| Tracked root entries | ≤ 25 | — | `claimlands-fable` sits at 25 and feels lean; framework files take ~15 |
| Workflows | ≤ 2 (`ci.yml`, `nightly.yml`) | `.github/workflows/` | Required check = one aggregate job; scheduled work is the only other trigger |
| Issue templates | 2–3 + `config.yml` | `.github/ISSUE_TEMPLATE/` | task, bug, (decision). Epics are parent issues with sub-issues, not a template |
| Labels | ≤ 12 | repo settings | type ×3, area ×3–4, state ×3 (`ready`, `blocked`, `owner-action`) |
| Docs | ≤ 5 files + `adr/` for decisions still in force | `docs/` | README answers "what/how to run"; AGENTS.md answers "how to work"; the rest is reference |
| Scripts | ≤ 15 | `scripts/` | One per repeatable operation; everything else is a package script |
| Agent guide | ≤ 120 lines | `AGENTS.md` | Claude Code suggests < 200; path-specific text goes to `.claude/rules/` |
| Enforcement layers per rule | 1 source of truth, executed at up to 4 points | lint config / hook table | §14 |
| Generated code and data in git | types + migrations only, `linguist-generated` | `src/` | Dumps, baselines, snapshots → release assets or storage |
| Tests vs source | tests ≤ source lines | `tests/` | Above 1:1 usually means the same contract asserted at several layers |

Apply it by deleting, not by reorganising: `atmjet_website` would lose five workflows, 15 labels,
57 scripts and about 9 MB of docs without losing a check.

## 14. Pain 2 — conventions broken first, fixed after

> "Claude keeps breaking my conventions… faces a convention error, and only after that does he fix
> himself, every single time."

**Root cause.** Every convention in your repositories is enforced *after* the code exists: by CI,
by a reviewer, or by the agent re-reading a long guide. Claude Code's own documentation is explicit
that `CLAUDE.md` is advisory and that anything that must always happen should be a hook. Prose
competes for attention with the task; a check does not. In `atmjet_website` the one write-time hook
that exists (`block-attribution.sh`, a `PreToolUse` Bash hook that exits 2) proves the mechanism works
in your setup — it was pointed at attribution, while naming and data modelling had none.

**Fix: the enforcement ladder.** Each rule is written once (lint config, hook table or test) and
executed at the earliest point that can see the violation. From earliest to latest:

| Rung | When | Mechanism | Can block? | Notes |
|---|---|---|---|---|
| 0 | Before adopting a rule | Make it mechanical (regex, lint rule, test). If it cannot be, it is a preference: write it in `AGENTS.md` and accept drift | — | This filters most "conventions" |
| 1 | Write time | `PreToolUse` hook on `Edit\|Write\|Bash`; exit 2 with the corrected name in the message | **Yes**, all permission modes | Judges new files only; existing names stay. Shipped in `project-standard.md` §5, 20 cases tested against this repo |
| 2 | Save time | `PostToolUse` hook runs `eslint --fix` + `prettier --write` on the touched file; remaining errors go back to Claude | No (feedback) | Same config as rung 4/5; 1–3 s per edit |
| 3 | Read time | `.claude/rules/<area>.md` with `paths:` frontmatter: the Payload rule loads only when a collection/block file is touched | No (context) | Replaces 15 KB guides; the rule is in front of the agent exactly when it matters |
| 4 | Commit time | lefthook `pre-commit` (lint, format, typecheck on staged files) and `commit-msg` (commitlint) | Yes, locally | `LEFTHOOK=0` escape exists; CI is the backstop |
| 5 | PR time | CI job `ci` runs the identical commands; ruleset requires it | Yes | Also lints the PR title |
| 6 | Test time | Architecture tests over the Payload config (field types, slugs, naming) | Yes | The only rung that sees data-model intent (§15) |

Two rules make the ladder "steel":

- **One source of truth per rule.** The naming pattern lives in `eslint.config.mjs` (check-file) and
  is mirrored by the hook's table; the hook message tells the agent the exact correct name. Docs link
  to the config; they never restate it.
- **Existing violations are not the rule's problem.** Hooks and lint judge new files (hook) or
  changed files (lint on staged files). Legacy names are renamed in dedicated PRs or never.

What this changes in practice: the agent attempts `Write src/components/Foo/NewThing.tsx`, the hook
answers `Folder "Foo" … must be kebab-case. Use "foo".` and `New file "NewThing.tsx" must be
kebab-case: name it "new-thing.tsx"`, and the second attempt is right. No CI round trip, no reviewer.

## 15. Pain 3 — the `externalUrl` media field

**What happened (facts from the repository).** `src/collections/Media.ts` has a `text` field
`externalUrl`; `Yachts.ts` photo rows carry both `{ name: 'media', type: 'upload', relationTo:
'media' }` and an `externalUrl` text; `src/lib/media.ts` (`mediaSource`, `rowImageSource`) prefers
`externalUrl` over the upload; the import scripts (`scripts/migrate/yachts.ts`, `aircraft.ts`) write
`externalUrl` from the legacy S3 URLs. `payload.config.ts` configures `@payloadcms/storage-s3`. The
field has 17 usages in `src/` and 3 in `scripts/`. `AGENTS.md` says nothing about media.

**What the platform says.** Payload: "A common pattern is to create a 'media' collection and enable
upload on that collection"; files are documents of that collection; other collections reference them
with `{ type: 'upload', relationTo: 'media' }`; the storage adapter (S3, Vercel Blob…) plugs into that
collection and serves `doc.url`; remote files can be imported (`pasteURL`, or Local API
`payload.create({ collection: 'media', data, file })`). The docs never show a URL stored as text.

**Root cause.** Three gaps lined up: (1) the legacy data arrived as URLs and the shortest path from a
URL to a rendered `<img>` was a text field; (2) no rule said "images are upload relations" where the
agent could see it while editing a collection; (3) nothing mechanical rejected a `text` field whose
name ends in `Url` in a collection file. The parallel path then grew consumers (`mediaSource`), which
is exactly the accretion pattern of Part I §4.1 — in the data model instead of the UI.

**Fix for `atmjet_website`.** Backfill: for each `externalUrl`, download and `payload.create` a media
document, set the `media` relation, then delete `externalUrl` and the `mediaSource` indirection; the
S3 adapter already serves the files. One migration, one PR.

**Prevention (applies to dimm-os now).** Rung 1: the shipped hook blocks `{ name: '*Url|*Link|*Src|*Href',
type: 'text' }` in `src/collections|blocks|globals|fields/**` with the message "use `{ type: 'upload',
relationTo: 'media' }`", with an explicit `// allow-url-text` escape for genuine external links
(dimm-os has one: `cookie-services.privacyPolicyUrl`, a third-party policy page, which is correct as
text). Rung 3: `.claude/rules/payload.md` states the model in six lines. Rung 6: an architecture test
walks every collection, global and block field (including nested `tabs`, `blocks`, `group`) and fails
on any non-allowlisted URL-named text field — the walker was run against this repository and finds the
four existing `upload` fields and no violations.

## 16. Pain 4 — the owner-action bottleneck

**What happened.** The planning agent created 18 `owner-action` issues in `atmjet_website`; twelve of
them (#23–#34) were created within 40 seconds on 2026-09-11 23:51, before any code existed. Appendix C
classifies all 18. Result: 2 are owner-only by nature (rotate leaked credentials in vendor consoles
#28; write the legal privacy text #57), 2 are a sign-off followed by agent execution (#182, #184),
2 were doable with the repository token all along (#24, #29), and **12 need nothing but a credential
the agent did not have**: rulesets, merge settings,
secret scanning, Actions permissions, topics, repository secrets and variables, tags and releases,
branch archiving, Vercel and Neon project operations. The repository's own history proves it: #24
(tag + release) was eventually "done by the `legacy baselines` workflow", and #29 states "agent
sessions cannot push tags" — a token-scope limitation, not a human requirement.

**Root cause.** The orchestrator conflated *"needs a credential I don't hold"* with *"needs a human
decision"* and labelled both `owner-action`. Nothing in the issue template forced it to say which.
`atmjet_website`'s `40-chore.yml` later added a "Who can do it" dropdown (Anyone / Repository owner
only), which is the right instinct but still lets the agent pick "owner" without justification.

**Fix: three tiers and one owner action at the start.**

| Tier | Definition | Examples | Who executes |
|---|---|---|---|
| **A — agent** | Doable with the repository token or `GITHUB_TOKEN` in a workflow | files, PRs, labels, tags/releases via Actions (`contents: write`), issues, sub-issues | agent, no ask |
| **B — agent with a grant** | Doable through a documented API/CLI once a scoped credential exists | rulesets, merge settings, `security_and_analysis`, Actions permissions, secrets/variables, topics; Vercel env/protection/project settings; Neon projects/branches | agent; the owner issues the credential **once** (Tier C, 5 minutes) |
| **C — owner only** | Needs a human identity, money, legal or product judgement, or is the credential itself | issuing tokens, installing apps, paying, rotating secrets in vendor consoles, legal text, sign-offs | owner; the agent prepares the exact steps and verifies afterwards |

Protocol for planners and templates:

1. The **first** issue of any setup plan is Tier C: "Issue a fine-grained token with these
   permissions and put it in this environment secret" — one action, listed precisely (§19).
2. Every other `owner-action` candidate must name the API or CLI call that would make it Tier B, or
   state why none exists. The task form carries a required field for this ("What would let an agent
   do it?"). An issue without it is not `owner-action`; it is `blocked`.
3. Tier B work is executed by the agent and **verified by the agent** (read the setting back, open a
   test PR against the ruleset). The owner's job is the five-minute grant and the Tier C decisions.
4. Where the API is destructive (deleting a project, a database), the agent prepares and the owner
   confirms with one word; the agent still executes.

Verified API surface for Tier B on GitHub (REST, from the official OpenAPI description): repository
settings including merge methods and `delete_branch_on_merge` (`PATCH /repos/{owner}/{repo}`),
`security_and_analysis` in the same call, topics (`PUT …/topics`), rulesets (`POST`/`PUT
…/rulesets`), Actions permissions (`PUT …/actions/permissions`, `…/permissions/workflow`), secrets and
variables (`PUT …/actions/secrets/{name}`, `POST …/actions/variables`), labels, releases, refs
(tags), sub-issues and issue dependencies. `gh repo edit`, `gh secret set`, `gh label`, `gh api`,
`vercel env add`, `vercel project`, `neonctl projects|branches` cover the same ground from a shell.

## 17. What to keep from both repositories

From `atmjet_website`: SHA-pinned actions with Dependabot `github-actions` updates; the aggregate
`ci` job as the single required check; the ruleset stored as JSON in the repo; grouped Dependabot
updates (`minor-and-patch`); the `conventions` checks (branch name, PR title, commitlint) — merged
into `ci.yml`, not a separate workflow; the `.claude/settings.json` deny rules (no force-push, no
push to `master`); ADR-0008's self-diagnosis.

From `claimlands-fable`: issues as the work queue (ADR-0010) with a `ready` label gate; the
assignee lock plus `stale-claims` so two agents never take one issue; a one-command "give me the next
task" (`cargo xtask next|take`) — for a Bun project the same is a 30-line script over `gh issue list`;
the 89-line `AGENTS.md`; `CONTRIBUTING.md` as a two-line pointer to it. Not to keep: 38 labels, seven
workflows, duplicate auto-filed `ci-failure` issues (#58/#62/#80 — if a workflow files issues, it
must search for an open one first), and design questions parked on the owner: a Tier C question
gets a default the agent proceeds with unless the owner objects by a date.

---

# Part IV — Standards and the action list

## 18. Standards used, with sources

Every rule in Parts II–III and in `docs/project-standard.md` traces to one of these. The docs hosts
were unreachable from this sandbox, so each page was read from its canonical public source
repository (the same files that render on the site); the rendered URL is given for verification.

| Topic | Rule relied on | Source |
|---|---|---|
| Community health files | Checklist items; `.github` → root → `docs` precedence; LICENSE root-only; issue forms need `name`+`description` | docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories; …/creating-a-default-community-health-file |
| Issue templates / forms | `config.yml` (`blank_issues_enabled`, `contact_links`); alphanumeric ordering; form keys `name`, `description`, `body` required; `labels`, `assignees`, `title`, `type`, `projects` optional; element types and validations | docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository; …/syntax-for-issue-forms; …/syntax-for-githubs-form-schema |
| PR template | `.github/pull_request_template.md` (or root/`docs/`), default branch | …/creating-a-pull-request-template-for-your-repository |
| CODEOWNERS | `.github/`, root or `docs/`; < 3 MB; last match wins; owners need write; protect the file itself | docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners |
| Labels | Ten defaults; per-repository; forms drop unknown labels | docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels |
| Sub-issues | 100 per parent, 8 levels; `gh issue create --parent` | docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues |
| Rulesets | Free plan on public repos; aggregate, most restrictive wins; PR required, required checks (strict/loose), merge method, block force push/deletion; REST + JSON import | docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets; …/available-rules-for-rulesets; …/creating-rulesets-for-a-repository |
| Actions security | Lockfile or full-SHA pins; least-privilege `permissions`; avoid `pull_request_target` with untrusted checkout; `GITHUB_TOKEN` read-only default | docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions (now …/actions/reference/security/secure-use) |
| Workflow syntax | `permissions` key semantics; `pull_request` default types; filters; `concurrency` group/`cancel-in-progress` | docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax; …/events-that-trigger-workflows; …/control-workflow-concurrency |
| Dependabot | `.github/dependabot.yml`, `version: 2`; `bun` ecosystem (≥ 1.1.39) and `github-actions`; `groups`; `open-pull-requests-limit` default 5; SHA pins keep the version comment | docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file |
| Security policy | `SECURITY.md` in `.github/`, root or `docs/` | docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository |
| REST endpoints for Tier B | repos update (merge settings, `security_and_analysis`, `delete_branch_on_merge`), topics, rulesets, Actions permissions/secrets/variables, labels, releases, refs, sub-issues | github.com/github/rest-api-description (OpenAPI `api.github.com`) |
| Fine-grained tokens | Single owner, chosen repositories, per-permission scopes, expiry | docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens |
| `linguist-generated` | `.gitattributes` marks files as generated (collapsed in diffs, excluded from stats) | docs.github.com/en/repositories/working-with-files/managing-files/customizing-how-changed-files-appear-on-github |
| Conventional Commits 1.0.0 | Structure, `feat`/`fix`, `!`/`BREAKING CHANGE`, "make multiple commits", squash clean-up | conventionalcommits.org/en/v1.0.0 |
| commitlint | `@commitlint/config-conventional` types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test | npm `@commitlint/config-conventional` README |
| SemVer 2.0.0 | MAJOR/MINOR/PATCH | semver.org |
| Small changes | "100 lines is usually a reasonable size… 1000 lines is usually too large"; one self-contained change with its tests | google.github.io/eng-practices/review/developer/small-cls.html |
| Next.js 16.2.3 | Route groups, `_private` folders, `src/`, safe colocation; no casing rule for non-convention files; `use cache` needs `cacheComponents`; two-argument `revalidateTag` | nextjs.org/docs/app/getting-started/project-structure (read from `node_modules/next/dist/docs`) |
| Payload 3.x | Upload collections; `upload` fields; storage adapters; push vs migrations ("do not mix"); `generate:types`; field names follow JS identifier rules; no prescribed folder layout | payloadcms.com/docs/upload/overview; …/fields/upload; …/upload/storage-adapters; …/database/migrations; …/typescript/generating-types |
| Vitest 4.0.18 | `coverage.include` default and src glob; thresholds, `perFile`, glob thresholds, `autoUpdate`; coverage is root-level | vitest.dev/config/#coverage; vitest.dev/guide/coverage |
| Playwright 1.58.2 | `forbidOnly`, `retries`, `workers: 1` in CI, `trace: 'on-first-retry'`; install only needed browsers; role-first locators; web-first assertions | playwright.dev/docs/test-configuration; …/ci; …/best-practices |
| eslint-plugin-check-file 3.3.2 | `filename-naming-convention`, `folder-naming-convention`, `KEBAB_CASE`, `NEXT_JS_APP_ROUTER_CASE`, `ignoreMiddleExtensions`; flat config only | github.com/dukeluo/eslint-plugin-check-file (README + docs/rules) |
| @typescript-eslint/naming-convention | Selectors, formats, boolean prefixes; "use it only to flag very egregious violations" | typescript-eslint.io/rules/naming-convention |
| Lefthook | `pre-commit` jobs with `{staged_files}`, `glob`, `stage_fixed`; `lefthook.yml`; `LEFTHOOK=0` | github.com/evilmartians/lefthook docs |
| Bun | `bun run` resolution order; pre/post scripts run automatically; no arbitrary lifecycle scripts on install | bun.sh/docs/cli/run (read from oven-sh/bun docs) |
| setup-bun | `bun-version-file` input (`.bun-version`, `package.json`, `.tool-versions`) | github.com/oven-sh/setup-bun `action.yml` |
| Claude Code | `CLAUDE.md` advisory, `@import`, < 200 lines; `.claude/rules/*.md` with `paths:`; `AGENTS.md` read natively (2.1.277); hooks: `PreToolUse` exit 2 blocks in all modes, `PostToolUse` feedback only, stdin JSON `tool_input.file_path`, `CLAUDE_PROJECT_DIR`; `.claude/settings.json` committed, `settings.local.json` personal | code.claude.com/docs (memory, hooks, settings) and github.com/anthropics/claude-code CHANGELOG |

## 19. Action list for dimm-os — operations

Ordered so each step is a small PR (Google's "one self-contained change"). Tier per §16. Everything
here is independent of the code consolidation in Part I §6 and can go first.

**Tier C — the only owner action**

0. Issue a fine-grained personal access token for `pixbs/dimm-os` only, 90-day expiry, with
   repository permissions: Administration (write), Actions (write), Secrets (write), Variables
   (write), Contents (write), Issues (write), Pull requests (write), Workflows (write), Metadata
   (read). Put it in the environment the agent runs in (e.g. a cloud-environment secret named
   `GH_ADMIN_TOKEN`). Optional: a Vercel token if deployments should be agent-managed. Also decide
   the LICENSE (MIT is the default suggestion for a portfolio site).

**Tier A — agent, files**

1. Hygiene: delete `test-output.txt`, `.yarnrc`, `.npmrc`, the `pnpm` engine, the pnpm VS Code
   setting; merge `CLAUDE.md` into `AGENTS.md` and make `CLAUDE.md` = `@AGENTS.md`; keep one skills
   tree. (R7, R8, R9)
2. `.github/`: `CODEOWNERS`, `ISSUE_TEMPLATE/{config.yml,1-task.yml,2-bug.yml}`,
   `pull_request_template.md`, `dependabot.yml`, `SECURITY.md`, `CONTRIBUTING.md` (pointer to
   AGENTS.md), `rulesets/master.json`; `LICENSE` in root. (R1, R2)
3. CI: SHA-pin the three actions; `bun-version-file: .bun-version`; Postgres as a service container;
   `bun run test` runnable without Docker; aggregate `ci` job; PR-title lint; nightly job holds the
   repeat pass and the cross-browser matrix — after the Firefox failures are fixed or the Firefox
   project is dropped with a note. (R5)
4. Enforcement: `.claude/settings.json` with the `PreToolUse` naming/placement/Payload hook and a
   `PostToolUse` lint hook; `.claude/rules/payload.md` and `tests.md`; `eslint-plugin-check-file` and
   `@typescript-eslint/naming-convention` in `eslint.config.mjs`; `lefthook.yml` with pre-commit and
   commit-msg; the Payload architecture test in `tests/unit/`. (R10, §14, §15)
5. Coverage: `include: ['src/**/*.{ts,tsx}']`, excludes for generated files, real thresholds,
   `perFile: true`, delete `assert-coverage.mjs`. (R11)
6. Open the first issues from the new form: one per Part I phase, each with acceptance criteria, so
   the refactor itself runs through the queue it creates.

**Tier B — agent with the token from step 0**

7. Repository settings: squash only, `squash_merge_commit_title: PR_TITLE`,
   `squash_merge_commit_message: BLANK`, `delete_branch_on_merge: true`, description and topics,
   `security_and_analysis` (secret scanning, push protection), Dependabot security updates. (R3, R12)
8. Ruleset `master` from `.github/rulesets/master.json`; verify with a deliberately red test PR
   that cannot be merged. (R4)
9. Labels: delete the unused defaults, create the ≤ 12 from R6.
10. Branches: tag `archive/preloader-wave-reveal`, delete the branch. (R12)

Expected size: steps 1–5 are five PRs of 50–300 lines each; steps 7–10 are API calls with a
read-back check and no PR.

## 20. The reusable blueprint

`docs/project-standard.md` turns Parts II–IV into a checklist and file set for new projects and for
refactoring existing ones: the layout and budgets, the naming table, every `.github/` and `.claude/`
file in full (including the tested hook and the architecture test), the enforcement matrix, the
owner-action protocol, and the setup sequence an agent runs end to end after the single token grant.

---

## Appendix A — desktop surface today (lines)

| File | Lines | Disposition |
| --- | ---: | --- |
| `hooks/useWindowManager.ts` | 345 | replace (store) |
| `components/drawer/page-shell.tsx` | 327 | delete |
| `components/window/managed-window-shell.tsx` | 323 | becomes `WindowFrame` |
| `components/window/WindowManagerProvider.tsx` | 296 | shrink to lifecycle + `<Desktop>` |
| `components/context-menu/index.tsx` | 262 | keep; call store actions |
| `app/(frontend)/layout.tsx` | 232 | keep; cache registry data |
| `components/window/window-head-sync.tsx` | 196 | keep; SVG favicon |
| `components/shortcut/grid.tsx` | 174 | keep; use `usePointerDrag` |
| `components/window/AdditionalWindow.tsx` | 173 | delete |
| `components/taskbar/index.tsx` | 170 | keep; read `order` |
| `components/window/ResizeHandles.tsx` | 161 | extend to 8 directions |
| `app/(frontend)/(pages)/[slug]/page.tsx` | 152 | shrink to fetch + seed |
| `components/window/content-view.tsx` | 144 | becomes the single renderer |
| `components/window/title-context.tsx` | 133 | delete |
| `lib/window-state.ts` | 128 | fold into reducers/persist |
| `components/window/title-bar.tsx` | 121 | keep |
| `components/window/system-windows.tsx` | 112 | keep |
| `components/drawer/shell.tsx` | 99 | delete |
| `components/window/WindowToolbar.tsx` | 96 | keep (+ `role="toolbar"`) |
| `components/window/window-toolbar-context.tsx` | 90 | keep or fold into frame props |
| remaining window/drawer/lib files | ~600 | mostly keep |
| **Total** | **~4,400** | target ~1,800–2,200 |

## Appendix B — how the measurements were taken

Local Postgres 16 cluster, `bun payload migrate`, `bun tests/fixtures/e2e.ts` seed, `bun run build`,
`next start`, headless Chromium (Playwright 1.58 with the pre-installed Chromium build) at 1440×900
and Pixel 7. Transfer sizes from `performance.getEntriesByType('resource')`; panel counts from
`document.querySelectorAll('[data-window-panel]')`; behaviour probes: `Escape` after opening two
windows, double-click on a title bar, `setViewportSize(1024, 700)`, direct navigation to
`/e2e-workspace` after a session with a restored window, `Tab` from the body.

## Appendix C — the 18 `owner-action` issues of `atmjet_website`, classified

Tiers as defined in §16. "Grant" means a scoped credential the agent did not have (GitHub
fine-grained token with Administration/Secrets/Actions/Contents write; Vercel token; Neon API key).

| # | Title (abridged) | State | Tier | What would have let an agent do it |
|---|---|---|---|---|
| 23 | Switch the legacy Vercel project's production branch | closed | B | Vercel token: project settings are API/CLI-addressable; owner confirms the live site afterwards |
| 24 | Create tag `legacy/v1` and publish the baseline release | closed | A | Was in fact done by the `legacy baselines` workflow (`contents: write`) |
| 25 | Import the `master` ruleset and set the merge policy | closed | B | `POST …/rulesets`, `PATCH /repos/{o}/{r}` (merge methods, auto-delete) |
| 26 | Import the legacy branch/tag rulesets | closed | B | `POST …/rulesets` ×2 |
| 27 | Enable secret scanning + push protection; triage alerts; Dependabot security updates | closed | B (+C for marking a leaked key "revoked") | `PATCH /repos` `security_and_analysis`; `PUT …/automated-security-fixes`; alert triage via API, owner confirms the rotation happened |
| 28 | Rotate leaked credentials (Neon, NextAuth, AWS, TinyPNG) | closed | **C** | Vendor consoles and the credentials themselves; agent writes the runbook and verifies old keys fail |
| 29 | Archive the stale branch (tag + delete) | closed | A | `POST …/git/refs` + `DELETE …/git/refs/heads/…`; the issue's "agent sessions cannot push tags" is a token scope, not a human need |
| 30 | Repository settings: Actions permissions, stacked-PR preview, features, topics | closed | B (+C for the UI-only preview toggle) | `PUT …/actions/permissions`, `…/permissions/workflow`; `PATCH /repos` (wiki/projects/description); `PUT …/topics` |
| 31 | Set repository variables and secrets | closed | B | `PUT …/actions/secrets/{name}` (`gh secret set`), `POST …/actions/variables`; the Vercel bypass value needs a Vercel token or the owner pasting it once |
| 32 | Record legacy Neon project facts (read-only queries) | closed | B | A read-only connection string or Neon API key; six SQL queries |
| 33 | Create the new Neon project with roles | closed | B (+C for billing) | `neonctl projects create`, roles and connection strings via API; the account must already exist |
| 34 | Create the new Vercel project, env, domain, protection | closed | B (+C for billing/domain ownership) | `vercel project add`, `vercel env add`, protection settings via API; DNS/ownership stays with the owner |
| 57 | `/privacy` page text in en/ru/uk | closed | **C** | Legal content; the agent can draft, the owner must approve |
| 181 | Freeze the legacy Vercel project | open | B (+C for the retention period decision) | Disable auto-deploy and archive via API after the owner names the date |
| 182 | Disconnect the legacy admin after sign-off | open | C (decision) + B (execution) | Sign-off is the owner's; the disconnect is an API/env change |
| 184 | Decommission the legacy Neon project after sign-off | open | C (decision) + B (execution, destructive → one-word confirm) | `neonctl projects delete` once the owner confirms |
| 227 | Squash-only merges and re-import the `master` ruleset | closed | B | `PATCH /repos` + `PUT …/rulesets/{id}` |
| 248 | Browser tier never ran against a preview: bypass secret unset | open | B | Vercel token to read/generate the Protection Bypass secret + `gh secret set`; with the token this is a five-minute agent task, not a 37-test red for a month |

Count: 2 Tier A, 12 Tier B (five with a small Tier C decision attached), 2 Tier C decisions followed
by Tier B execution, 2 Tier C. Twelve of the
eighteen were opened within 40 seconds on 2026-09-11, so the owner's queue was at its longest on day
one, before any of the work that depended on it had started.

## Appendix D — sources and access notes

- **Docs hosts blocked from this sandbox**: docs.github.com, conventionalcommits.org, nextjs.org,
  payloadcms.com, typescript-eslint.io, vitest.dev, playwright.dev, vercel.com, neon.tech, bun.sh,
  semver.org, agents.md, code.claude.com (proxy `CONNECT … 403`). Every standard was therefore read
  from the project's own public source repository on GitHub — the files that render those pages — and
  cross-checked where two sources overlap:
  `github/docs` (`content/**` with `data/reusables` and `data/variables` resolved, `fpt` version),
  `github/rest-api-description` (OpenAPI for api.github.com), `anthropics/claude-code` (CHANGELOG and
  README), `payloadcms/payload` (`docs/**` at `3.x` and `v3.84.1`), Next.js docs shipped in
  `node_modules/next/dist/docs` (v16.2.3), `vitest-dev/vitest` (`docs/**` at v4.0.18),
  `microsoft/playwright` (`docs/src/**` at v1.58.2), `typescript-eslint/typescript-eslint`
  (`naming-convention.mdx`), `dukeluo/eslint-plugin-check-file` (README and `docs/rules`),
  `evilmartians/lefthook` (`docs/**`), `conventional-commits/conventionalcommits.org`
  (`content/v1.0.0`), `semver/semver`, `google/eng-practices`, `olivierlacan/keep-a-changelog`,
  `oven-sh/bun` (`docs/runtime`), `oven-sh/setup-bun` (`action.yml`), npm registry READMEs for
  `@commitlint/config-conventional`, `eslint-plugin-check-file`, `eslint-plugin-unicorn`, `knip`;
  `gh`, `vercel` and `neonctl` CLI `--help` output for the Tier B command surface.
- **Not verifiable from here**: the live site `https://dimm.co` (proxy refused; all behaviour probes
  used a local production build), GitHub's rendered community-profile percentage (the file list was
  verified directly), and the Vercel/Neon REST endpoints beyond what their CLIs advertise.
- **Repositories read**: `pixbs/dimm-os` (this branch), `pixbs/atmjet_website` (clone at the default
  branch, issues and PRs via the GitHub API), `pixbs/claimlands-fable` (anonymous read-only clone;
  issues read once from the public issues page — 59 issues, 41 open).
- **Hook and architecture test**: `check-path.mjs` was executed against this repository's real layout
  with 20 inputs (new/existing files, Next.js segments, Payload field snippets in both key orders,
  Bash `touch`/heredoc/`cat`, paths outside the project, empty stdin) and behaved as specified; the
  final architecture test (`project-standard.md` §6) was executed with Vitest against this repository's
  `src/collections` and `src/globals`: 5 tests passed, it sees the four `upload` fields, and no URL-named
  text field exists outside the allowlist.
