# Dimm OS — refactor analysis and recommendations

Branch: `claude/repo-website-refactor-analysis-h3d9vm` · Base commit: `ead93e0` · Date: 2026-10-21

This is an analysis only. No application code was changed. Everything below was checked against the
code on this branch and against a production build of it running locally (details in §2).

---

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
