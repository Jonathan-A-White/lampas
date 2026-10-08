# PWA Best Practices

The owner's standing rules for his phone apps (React, Vite, Dexie, GitHub Pages). Updated 2026-10-08 from Postern, SpellForge, Cairn, argus and trade-tracker. Read before the first story of any new app.

> **Stack assumptions:** Examples use Vite + `vite-plugin-pwa` (Workbox), React, and Dexie for IndexedDB. The principles are general; the code is copy-paste ready for that stack.
>
> **How to read a rule:** a bold one-line rule, then the why (symptom and cause), then the how, then a pointer in parentheses (repo file:line or commit). Anything marked **UNVERIFIED** was inferred, not seen failing; do not build on it without a check. Pointers marked "(origin)" live only on Postern's remote main. Postern was phone-tested on Android Chrome only; no rule here has been proven on iOS unless it says so.

---

## Table of Contents

1. [Web App Manifest](#1-web-app-manifest)
2. [Fullscreen & Display Modes](#2-fullscreen--display-modes)
3. [Install to Home Screen](#3-install-to-home-screen)
4. [iOS and Android Platform Notes](#4-ios-and-android-platform-notes)
5. [Safe Area & Notch Handling](#5-safe-area--notch-handling)
6. [Viewport Configuration](#6-viewport-configuration)
7. [Scroll, Zoom and the Keyboard](#7-scroll-zoom-and-the-keyboard)
8. [Native-Feel CSS and Touch](#8-native-feel-css-and-touch)
9. [Service Worker & Caching](#9-service-worker--caching)
10. [Updates and the Service Worker](#10-updates-and-the-service-worker)
11. [Visibility, Timers and Battery](#11-visibility-timers-and-battery)
12. [Speech and Audio](#12-speech-and-audio)
13. [Camera, Photos and Haptics](#13-camera-photos-and-haptics)
14. [Notifications](#14-notifications)
15. [Offline Store and Sync](#15-offline-store-and-sync)
16. [Auto-Save, Drafts and Persistence](#16-auto-save-drafts-and-persistence)
17. [Icons & Splash Screens](#17-icons--splash-screens)
18. [Theme Color & Dark Mode](#18-theme-color--dark-mode)
19. [SPA Routing on Static Hosts](#19-spa-routing-on-static-hosts)
20. [Testing Offline-First Logic](#20-testing-offline-first-logic)
21. [Testing at Phone Width](#21-testing-at-phone-width)
22. [Build Traps: Vite, esbuild, TypeScript](#22-build-traps-vite-esbuild-typescript)
23. [Deploy to GitHub Pages](#23-deploy-to-github-pages)
24. [Licence and Keys on a Phone](#24-licence-and-keys-on-a-phone)
25. [Version Management](#25-version-management)
26. [Common Pitfalls](#26-common-pitfalls)
- [Quick Reference Checklist](#quick-reference-checklist)
- [Changelog](#changelog)

---

## 1. Web App Manifest

The manifest tells the browser how your app should behave when installed. Generate it at build time (vite-plugin-pwa does this from the `manifest` option) so it stays in sync with your build configuration.

### Required Fields

```json
{
  "name": "My App",
  "short_name": "MyApp",
  "description": "What the app does",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#1a1a2e",
  "background_color": "#ffffff",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Key Details

- **`short_name`** is what appears below the icon on the home screen. Keep it under 12 characters.
- **`start_url`** must be within `scope`. If deploying to a subdirectory (e.g., GitHub Pages), both must include the path prefix.
- **`background_color`** is shown on the splash screen before the app loads. Match it to your app's initial background.

**Keep the manifest a plain object that vite.config.ts and a unit test both import.**
Why: the manifest is easy to break silently (a wrong `scope`, a theme colour that drifts from the `<meta>`), and nothing fails at build time. Postern uses `display: standalone`, `start_url` and `scope` of `/`, and matching `theme_color` and `background_color`; the test asserts them. How: export the object from one module (`pwa-manifest.ts`), pass it to `VitePWA({ manifest })`, and import the same object in a Vitest file. (Postern pwa-manifest.ts; tests/unit)

**A `share_target` puts the app in Android's share sheet; the service worker must park the shared files somewhere the page can read.**
Why: the share arrives as a POST to the worker, not to the page. Postern's worker writes the files to IndexedDB and the page picks them up on open. (Postern pwa-manifest.ts, sw.ts)

### Subdirectory Deployments (e.g., GitHub Pages)

You don't need to inject absolute paths into the manifest. Relative values resolve against the manifest's own URL, so the same manifest works at any base path:

```json
{ "start_url": ".", "scope": "." }
```

With Vite, either set `base` to the repo path, or use `base: "./"` and a runtime router basename. These are two different models with different traps; choose one on purpose (Section 23).

```ts
// vite.config.ts
export default defineConfig({
  base: "/my-repo/", // GitHub Pages serves at username.github.io/my-repo/
});
```

---

## 2. Fullscreen & Display Modes

### Display Mode Options

| Mode | Browser UI | Status Bar | Use Case |
|------|-----------|------------|----------|
| `fullscreen` | Hidden | Hidden | Games, immersive apps |
| `standalone` | Hidden | Visible | Most apps (recommended default; Postern ships it) |
| `minimal-ui` | Minimal nav | Visible | Apps that need a back button |
| `browser` | Full | Visible | Not really a PWA |

### Recommended: Use `display_override` for Fallback Chain

```json
{
  "display": "fullscreen",
  "display_override": ["fullscreen", "standalone"]
}
```

The browser tries each mode in `display_override` first, then falls back to `display`. This gives you fullscreen where supported with standalone as a graceful fallback. Use it only for apps that want the whole screen; an app with a status bar and a tab bar wants plain `standalone`.

### Detecting Display Mode in CSS

```css
/* Styles only applied when running as installed PWA */
@media (display-mode: standalone) {
  /* ... */
}

@media (display-mode: fullscreen) {
  /* ... */
}
```

### Detecting Display Mode in JavaScript

```js
const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  window.navigator.standalone === true; // iOS Safari
```

---

## 3. Install to Home Screen

### Install Criteria

Browsers show an install prompt when these criteria are met:

- Valid web app manifest with `name`, `icons`, `start_url`, `display`
- Served over HTTPS (or localhost)
- Registered service worker with a fetch handler
- User has engaged with the app (varies by browser)

**An app with Dexie but no service worker is not offline, and a manifest without PNG icons is a shortcut, not an install.**
Why: SpellForge has a Dexie store and a README that says "offline first", but no vite-plugin-pwa and no worker; its data survives, its shell does not load without a network. Its manifest lists one SVG icon (`sizes: any`) and the apple-touch-icon is the same SVG, so the install experience is unproven (UNVERIFIED on device). How: register a service worker and ship 192 and 512 px PNG icons from the first story (Sections 9 and 17). Do not treat SpellForge as the model for install or caching. (spell-forge package.json, public/manifest.json, index.html:13)

### Custom Install Prompt

Capture the `beforeinstallprompt` event to control when and how the install banner appears:

```js
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // Suppress the default browser prompt
  deferredPrompt = e;
  showYourCustomInstallButton();
});

// When user clicks your custom install button:
async function handleInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(outcome === "accepted" ? "Installed" : "Dismissed");
  deferredPrompt = null;
}
```

### Detecting Installation

```js
window.addEventListener("appinstalled", () => {
  console.log("App was installed");
  deferredPrompt = null;
});
```

> **Note:** `beforeinstallprompt` is not supported on iOS Safari. iOS users must manually use "Add to Home Screen" from the share sheet. Consider showing instructions for iOS users.

---

## 4. iOS and Android Platform Notes

iOS Safari has its own PWA model with separate meta tags. These are **required** for a proper iOS home screen experience:

```html
<!-- Enable fullscreen (standalone) mode on iOS -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<!-- The Android/Chromium equivalent; set both -->
<meta name="mobile-web-app-capable" content="yes" />

<!-- Status bar appearance: default | black | black-translucent -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

<!-- App name shown under the icon on home screen -->
<meta name="apple-mobile-web-app-title" content="My App" />

<!-- Home screen icon (iOS ignores manifest icons) -->
<link rel="apple-touch-icon" href="/icon-192.png" />
```

Postern sets both `mobile-web-app-capable` and the apple metas. (Postern index.html:9-12)

### Status Bar Styles

| Value | Behavior |
|-------|----------|
| `default` | White status bar with black text |
| `black` | Black status bar with white text |
| `black-translucent` | Transparent status bar, content renders behind it |

**Use `black-translucent`** for fullscreen apps: it lets your content extend to the top of the screen. Pair it with safe area padding (see Section 5) to prevent content from hiding behind the status bar.

**Decide up front whether the app targets iOS; Postern never ran there.**
Why: Postern was phone-tested on Android Chrome only and has no iOS-specific code. Known differences to plan for: audio needs a user gesture, Web Push works only after Add to Home Screen, SVG touch icons are ignored, and there is no Vibration API (the last is general knowledge, not seen in the repos). Treat every Android-proven rule in Sections 7, 11, 12 and 14 as unproven on iOS. (Postern; SpellForge src/core/haptics.ts)

---

## 5. Safe Area & Notch Handling

Modern devices have notches, dynamic islands, rounded corners, and home indicators that can overlap your content.

### Enable Safe Area Support

The viewport meta tag must include `viewport-fit=cover`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

Without `viewport-fit=cover`, the `env(safe-area-inset-*)` values will always be `0`.

### Apply Safe Area Padding

```css
#root {
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

### Where to Apply

- **Top inset**: Prevents content from going behind the status bar or notch
- **Left/Right insets**: Needed for landscape orientation on notched devices
- **Bottom inset**: only on the lowest bar (next rule)

**Add the bottom safe-area inset only to the lowest bar, never to every layer.**
Why: the earlier version of this guide put all four insets on the outermost container and also padded fixed bars; stacked, they leave a double gap above the home indicator. The new rule wins because Postern saw exactly that gap. How: the tab bar alone keeps `env(safe-area-inset-bottom)`; the composer above it gets none; scrolling lists end with a calc so their last row clears the bar.

```css
.tab-bar { padding-bottom: env(safe-area-inset-bottom); }
.scroll-list { padding-bottom: calc(1rem + env(safe-area-inset-bottom)); }
```

(Postern 829f7b5, 3a0a3c8; src/index.css:123-133)

---

## 6. Viewport Configuration

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### Why Each Part Matters

- **`width=device-width`**: Matches the viewport to the device width (prevents desktop-width rendering on mobile)
- **`initial-scale=1.0`**: Prevents unexpected zoom on page load
- **`viewport-fit=cover`**: Tells the browser to extend content into safe areas (required for `env(safe-area-inset-*)` to work)
- **`interactive-widget=resizes-content`** (Android Chrome): makes the keyboard shrink the layout instead of overlaying it (Section 7)

**Decide pinch zoom per app. The default is to keep it; lock it only with open eyes.**
Why: the earlier edition offered `user-scalable=no` only "for a game or full-screen tool". Five apps now give two answers. Cairn, SpellForge, trade-tracker, argus and bsv-kit keep pinch zoom (SpellForge serves children with font-size settings, so zoom is a feature). Postern locks it, because a fast double tap zoomed the app; the cost is no accessibility zoom. This is a real decision, not a mistake on either side. How: the default is the three-token meta above. `html { touch-action: manipulation }` removes the double-tap zoom and the tap delay while leaving pinch alone (CSS behaviour, not separately tested in these repos). If the app must lock, do it in both places and test the two files:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1, user-scalable=no, interactive-widget=resizes-content" />
```

```css
html { touch-action: manipulation; }
```

(Postern 18c12a2, 4a1929b; index.html:6, src/index.css:95-97; unit test reads index.html and index.css. Others: each app's index.html; Cairn/index.html adds `interactive-widget`.)

**Size the root with `100dvh`; never `100vh`.**
Why: browser chrome and the keyboard change the visible height. The earlier edition said `100svh`; `svh` equals the visible area with chrome fully shown and never overflows, but it does not follow the keyboard. Postern uses `dvh` on html, body, `#root` and the Shell root, which tracks the visible height as it changes; SpellForge also uses `dvh`. In an installed standalone app there is no address bar, so the two differ mainly when the keyboard is up (this last point is Postern's observation on Android Chrome, not checked against the spec). Use `svh` for a page that is also opened in a browser tab and must never overflow. (Postern src/index.css:88,100, Shell.tsx; SpellForge, two places)

**Form fields must be 16 px (`text-base`).**
Why: under 16 px iOS Safari zooms on focus and, in a PWA, there is no pinch-out escape. Postern never saw it (Android only) but its field style is `text-base`; keep that. (Postern f24ab8e; src/index.css:141)

```css
input, select, textarea { font-size: 16px; }
```

---

## 7. Scroll, Zoom and the Keyboard

Fullscreen PWAs commonly suffer from unwanted scrolling, rubber-band bounce, visible gaps around safe areas, and a keyboard that shoves the page. Postern spent most of a week on this; the rules below are the result. Keyboard and scroll bugs cannot be reproduced in a headless browser by accident, so test them by hand-pushing the page (Section 21).

### The page never scrolls

**The page itself must never scroll: one scroll box inside `#root`, and `overflow: clip`, not `hidden`.**
Why: bounce, then the header sitting under the status bar after the keyboard closed. `overflow: hidden` still lets script, focus and the keyboard move the scroll offset; `clip` does not. The earlier edition of this guide said `hidden`; the new rule wins because Postern's bug was caused by `hidden`. How: html, body, `#root` and the Shell root are `overflow: clip` with `overscroll-behavior: none`; screens scroll in their own boxes.

```css
html, body, #root {
  margin: 0; padding: 0;
  height: 100dvh;
  overflow: clip;
  overscroll-behavior: none;
}
.screen { overflow-y: auto; overscroll-behavior: contain; }
```

(Postern ada275c first lock, 9affbd2 hidden to clip; src/index.css:85-102; tests/unit/index-css.test.ts reads the stylesheet source)

**Add a scroll guard that resets the document to scrollTop 0 after every event that can leave it moved.**
Why: even with `clip`, Android Chrome could leave the viewport scrolled after the keyboard closed or the app returned to the foreground. How: install first in main.tsx a capture-phase `scroll` listener plus `resize`, `visualViewport resize`, `focusout`, `pageshow` and `visibilitychange`; each resets document, body and a `[data-shell]` root, and does it again one `requestAnimationFrame` later because the keyboard finishes closing a frame or two after the event. (Postern src/ui/scrollGuard.ts, installed first in src/main.tsx; 9affbd2)

**Focus without scrolling: `el.focus({ preventScroll: true })` everywhere, and no `autoFocus`.**
Why: plain focus scrolls the page and pushes the screen under the status bar. How: route every focus call through one helper, and make the build fail if a screen uses `autoFocus` (Postern has a scenario for it). (Postern src/ui/focus.ts; 9affbd2; features/screen-stays-put.feature)

**Scroll a message list by setting `scrollTop` on its own scroll box, never `scrollIntoView`.**
Why: `scrollIntoView` scrolls every ancestor including the document, so a new message with the keyboard open and a banner showing pushed the whole screen up. How: find the nearest `overflow-y: auto` ancestor and set `scrollTop = scrollHeight`. (Postern Conversation.tsx `scrollBoxOf`; e3a74e7, 0b808a9)

**Back and the tab bar restore scroll, and it survives a close and reopen.**
Why: losing his place in a long list on every Back is the web-page feeling. How: key the offset by address plus slot name; save 250 ms after the last scroll and on `pagehide` and `visibilitychange hidden`; restore with a `ResizeObserver` (content arrives late) for up to 2.5 s, ended by the first touch, wheel or key so it never fights his finger. Persist the last 20 addresses and, on a cold open, rebuild `history` so Back walks them. (Postern src/nav/scrollMemory.ts, lastRoute.ts; e67103b, c787e09, 8ca1e65)

**A pinned action button plus a capped scroll area beats a page that scrolls.**
Why: a 20-line problem pushed SpellForge's "Read it" button off screen. How: put the text in its own `overflow-y: auto` area with `max-h` computed from `dvh` minus the chrome, `overscroll-contain`, and a `sticky bottom-0` footer. Proved by a Playwright test at 390x844. (SpellForge 2f58434, f3201d9; tests/e2e/tutor-long-problem.spec.ts)

**A routed sub-page rendered through `<Outlet/>` must be a fixed full-screen overlay, or it appends below the parent.**
(trade-tracker bd54128)

**Let flex children shrink (`min-w-0`), wrap long text, and check at 360 px.**
Why: long option labels and fenced code widened the page past the viewport. How: `min-w-0` on flex children, `break-words`, and `whitespace-pre-wrap break-all` on code blocks. (Postern 4fdaf40, 8d28b7f; src/index.css:179,230)

### Background behind safe areas, and page height

When using `viewport-fit=cover` with a `black-translucent` status bar, the area behind the safe area padding is visible. Set a background color on your app container:

```css
#root {
  background-color: #f8f9fa;
}

.dark #root {
  background-color: #111827;
}
```

Without this, you'll see a white (or transparent) bar at the top and bottom of the screen on notched devices.

Use `min-h-full` instead of `min-h-screen` on pages: `min-h-screen` overflows the app container and causes double scrollbars. `min-h-full` fills only the available space within the scroll container.

### The on-screen keyboard

The virtual keyboard is the biggest cross-platform behavioral difference left in PWAs:

- **Android Chrome (108+):** by default the keyboard resizes only the *visual* viewport. Your layout, `100svh`, and `position: fixed` elements don't move, so a fixed bottom bar ends up **hidden behind the keyboard**.
- **iOS Safari:** the keyboard always overlays the page; the layout never resizes. (No height unit fixes this on iOS; the earlier pitfall that said "use 100svh" was wrong and is gone.)

**Android: opt back into layout resize with `interactive-widget=resizes-content`.**
Why: without it a fixed bottom bar or composer is hidden behind the keyboard. The earlier edition offered it as an option for chat UIs; Postern needed it from the start (it was added in 9affbd2 after the keyboard kept shoving the page up), so put it in the viewport meta of every installed app that has a text field. It is Chromium-only; iOS ignores it. (Postern index.html:6, 9affbd2)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />
```

### Cross-Platform: Track the Visual Viewport

For full control on both platforms, mirror `visualViewport` into a CSS variable and size keyboard-sensitive UI with it:

```js
function syncViewportHeight() {
  const vv = window.visualViewport;
  document.documentElement.style.setProperty("--vvh", `${vv.height}px`);
}
window.visualViewport.addEventListener("resize", syncViewportHeight);
syncViewportHeight();
```

```css
.chat-screen {
  height: var(--vvh, 100dvh); /* Shrinks when the keyboard opens */
}
```

A simpler alternative for fixed bottom navigation: hide it while any input is focused (`focusin`/`focusout` on the container) instead of trying to reposition it.

**To stop autocomplete leaking answers, or to get a script-specific layout, render your own keyboard.**
Why: SpellForge's native keyboard offered suggestions that gave away the answer, and a spelling drill wants a language-specific layout. How: a focusable `role="textbox"` div, not an `<input>`, so no OS keyboard opens; `onMouseDown` `preventDefault` on the keys so they never steal focus; a physical-keyboard `onKeyDown` path stays; layouts and an accent row come from a per-language registry. For polytonic Greek this is the pattern, but test paste, IME and screen readers on it first (UNVERIFIED for those three). (SpellForge 97fd52a; custom-keyboard.tsx `keyboardRows`, `accentRow`)

---

## 8. Native-Feel CSS and Touch

A handful of CSS defaults betray "this is a web page" the moment someone touches the screen. Override them globally:

```css
html, body {
  /* Disable pull-to-refresh and overscroll glow/bounce (Android Chrome) */
  overscroll-behavior: none;
}

* {
  /* Remove the grey/blue flash on tap */
  -webkit-tap-highlight-color: transparent;
}

button, a, [role="button"] {
  /* Remove the double-tap-to-zoom delay on interactive elements */
  touch-action: manipulation;
}
```

### Text Selection

Long-pressing a button and getting a text-selection caret feels broken. Disable selection on UI chrome, but **keep it for content and inputs**:

```css
.app-chrome, button, nav {
  user-select: none;
  -webkit-user-select: none; /* Still needed on iOS Safari */
}

input, textarea, [contenteditable], .user-content {
  user-select: text;
  -webkit-user-select: text;
}
```

On iOS, also suppress the long-press callout menu on images and links if they're UI elements:

```css
img {
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
}
```

**Suppress the long-press context menu on a press-and-hold control.**
Why: `-webkit-touch-callout` covers images only; a push-to-talk button still raised the context menu on Android. How: `onContextMenu={e => e.preventDefault()}` plus `select-none` on the control. (SpellForge reading-loop.tsx)

### Sticky Hover

On touch screens, `:hover` styles activate on tap and **stay stuck** until the user taps elsewhere: a highlighted button that won't un-highlight. Gate hover styles behind a capability query and use `:active` for touch feedback:

```css
@media (hover: hover) {
  .button:hover { background: #e5e7eb; }
}

.button:active { background: #d1d5db; }
```

### Taps that do nothing

**A decorative absolute overlay eats taps: give it `pointer-events-none` and `aria-hidden`.**
Why: SpellForge's streak flame button did nothing on mobile because an `absolute inset-0` background layer sat above the buttons. (SpellForge 7046bf5; Cairn's scanline overlay already has `pointer-events: none`)

**`overflow-hidden` on a row clips its popup menu; render popups through a portal with `position: fixed`.**
Why: a long-press menu was invisible and untappable inside a swipe-to-delete row. (trade-tracker 9c9d764)

**`touch-action: none` on a held control also kills a second finger's scroll; use `pan-y` plus a non-passive native `touchmove`.**
Why: while one finger held the push-to-talk button, the other could not scroll the text, because `touch-action` is the intersection across all active touches. How: `touch-action: pan-y` on both the button and the scroll area, plus a native `touchmove` listener on the button only, registered `{ passive: false }` through a ref callback, calling `preventDefault()` while held, so the holding finger's drift does not become a pan and fire `pointercancel`. React's own touch handlers are passive, so `onTouchMove` cannot do this. (SpellForge 11bdacc, reading-loop.tsx)

```tsx
const ref = useCallback((el: HTMLButtonElement | null) => {
  el?.addEventListener("touchmove", (e) => { if (held.current) e.preventDefault(); }, { passive: false });
}, []);
```

**Make a used one-tap control go dead and say what happened.**
Why: a slow reply invites a second tap and a double send. How: one shared state per item, wherever the control is offered, so two taps send once and the control shows its answered state. (Postern src/cockpit/oneTap.ts; a179994; features/answered-once.feature)

**Swallowed rejections look like frozen buttons: await, show the error inline, disable while submitting.**
Why: Dexie's unique `&barcode` index threw `ConstraintError`, `onSave` was not awaited, and the Save button froze with no message. How: `await` the write in the handler, catch and show the message, disable the button while it runs, and pre-check duplicates. (trade-tracker 6a349dd)

---

## 9. Service Worker & Caching

### Workbox Caching Strategy

```js
workbox: {
  // Precache all static assets
  globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"],

  // SPA fallback: serve index.html for all navigation requests
  navigateFallback: "index.html",

  // Exclude special routes from the fallback (e.g., API endpoints)
  navigateFallbackAllowlist: [/^(?!\/__).*/],
}
```

### What to Precache

- HTML, CSS, JS bundles
- App icons and images
- Fonts (if self-hosted)
- Any static assets needed for first render

### What NOT to Precache

- API responses (use runtime caching instead)
- User-uploaded content
- Large media files (cache on demand)

### Runtime Caching (Optional)

```js
runtimeCaching: [
  {
    urlPattern: /^https:\/\/api\.example\.com\/.*/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "api-cache",
      expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
    },
  },
]
```

**Raise `maximumFileSizeToCacheInBytes`, or big chunks silently drop out of the precache.**
Why: Workbox's default is 2 MiB. A 2.5 MB chunk was skipped without an error and its feature failed offline. How: set it above your largest chunk (Postern uses 4 MiB) and check the generated precache manifest after adding a heavy dependency.

```ts
workbox: { maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 }
```

(Postern pwa-precache.ts; 41ae9ec)

**Guard the precache against a wrong-typed file: never cache or serve a `.js` or `.css` whose Content-Type does not fit.**
Why: the app broke permanently after a half-finished deploy. nginx answered a missing hashed `/assets/index-X.css` with `200 text/html` (the SPA fallback); the worker precached it; hashed URLs are never refetched; `nosniff` made the browser refuse it as CSS; only clearing site data fixed it. How, in the worker: a `fetch` listener registered BEFORE `precacheAndRoute` serves a precached asset only if its type fits (else deletes the entry and refetches with `cache: 'reload'`), and a `healPrecache` pass repairs poisoned entries on activate. How, on the server: a missing asset must be a real 404.

```nginx
location /assets/ { try_files $uri =404; }
```

(Postern src/precacheGuard.ts; sw.ts:34-48; docs/api.md:795-802; bba431c)

**A hand-written service worker keeps three rules: network-first for navigations, cache-first only for hashed assets, and never answer a failed script or style with the HTML shell.**
Why: the shell-for-everything fallback is what poisons the cache above and shows as "misleading MIME errors". How (argus): a navigation fetch falls back to the cached `./`; scripts, styles, images, fonts and manifests are cache-first with a background fill; a missing asset returns a real 404. (argus public/sw.js)

**Bump the cache name by hand when a hand-written worker changes.**
Why: Workbox versions its precache for you; a hand-written worker does not. How: name it with a version (`argus-shell-v2`) and delete older `argus-shell-*` caches on activate. (argus public/sw.js)

---

## 10. Updates and the Service Worker

### Choose: auto-update or prompt

**Use `registerType: 'prompt'` for an app people type in; `autoUpdate` only when auto-save means a surprise reload loses nothing.**
Why: the earlier edition recommended `autoUpdate` as the default and `prompt` as the exception. Two apps now reject `autoUpdate` on purpose. Postern: an automatic reload mid-typing loses work. Argus: "an active workflow must never be reloaded underneath a user". So the choice is a decision per app, with the prompt as the safe default. `autoUpdate` makes the generated worker call `skipWaiting()` and `clientsClaim()`, so a new version activates without waiting for all tabs to close; `immediate: true` registers as soon as the script runs instead of at window `load`.

```js
// vite.config.ts: auto
VitePWA({ registerType: "autoUpdate", /* ... */ })
// App entry point
import { registerSW } from "virtual:pwa-register";
registerSW({ immediate: true });
```

The trade-off of the prompt: users who never tap the toast stay on the old version indefinitely, so pair it with the periodic check below. (Postern vite.config.ts, src/services/appUpdate.ts, 1752caa; argus public/sw.js)

### The mid-session deploy problem

Silent auto-update has one failure mode: if you deploy while a user has the app open, the new service worker activates and **replaces the precache**. Lazy-loaded chunks from the old build no longer exist, so the user's next route navigation can fail until they reload.

**Reload on chunk-load failure.** Vite fires a dedicated event when a dynamic import fails:

```js
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  window.location.reload(); // Picks up the new build
});
```

This is safe when auto-save (Section 16) means a reload loses nothing. Prefer it with `autoUpdate`; with the prompt flow the user decides when the new build arrives.

### Prompt flow, done right

**A new worker waits until the user taps "Update ready"; reload once, and only if he asked.**
Why: a first install claiming the page, or another tab's update, must not reload the page under him. How: the banner posts `{ type: 'SKIP_WAITING' }`; the worker calls `clients.claim()` on activate; the page reloads once on `controllerchange` and only if the tap set a flag. A 10 s patience timer re-enables the tap if takeover stalls. Hand-written workers (argus) activate on a message in the same way.

```js
const updateSW = registerSW({
  onNeedRefresh() {
    // Show a toast; on click, activate the new SW and reload
    showUpdateToast(() => updateSW(true));
  },
});
```

(Postern src/services/appUpdate.ts; sw.ts; 1752caa)

**Wire the update message and test it: a prompt path nothing triggers is a dead update.**
Why: argus's worker waits for `ARGUS_ACTIVATE_UPDATE`, but no page code in src sends it (grep), so the update does nothing until every tab closes. How: whichever message your worker waits for, grep that the page sends it, and cover the tap-to-activate path with a test. (argus public/sw.js)

**Hold updates while work is in flight: no `skipWaiting` until the user agrees.**
(argus; the reason is in the previous rules.)

**Ask for a new build on start, on each return to the foreground, and every 30 minutes with `registration.update()`.**
Why: an installed PWA left open for days otherwise never learns of a deploy. (Postern appUpdate.ts:105-112)

**Show a build stamp on screen: version, UTC time, short commit.**
Why: `package.json`'s version never changes in Postern, so without a stamp neither the owner nor a bug report can say which build the phone runs. How: stamp time and commit at build time (Section 25). (Postern build-version.ts; mw-gq6.196)

---

## 11. Visibility, Timers and Battery

A phone page spends most of its life hidden, and Android Chrome suspends or freezes it. Two jobs follow: do nothing expensive while hidden, and catch up the instant the page is visible.

**Catch up on return to the foreground, on both `visibilitychange` and `pageshow` (bfcache), debounced.**
Why: stale data and a dead stream after the phone slept. How: on visible or `pageshow`, pull messages and view with a 3 s debounce (the two events are one return); if the stream has been silent past its window (60 s; the server pings every 25 s), abort it and reconnect at once. Every refresh listener acts on return; none stops work on leaving. (Postern src/services/live.ts:50-52,326-358; 5745d11)

**Do not trust an open stream or a "Live" label.**
Why: a suspended socket raises no error. How: read the stream with `fetch` + `TextDecoderStream` (EventSource cannot send an Authorization header), call it stale after 60 s without a ping, and drop the label to "reconnecting" the moment a send gets no answer. (Postern live.ts `STREAM_STALE_MS`; docs/best-practices.md)

**Replace bare `setInterval` with a visibility-aware interval and one shared clock.**
Why: Postern's battery research found 16 separate 30 s "time ago" timers, a 5 s poll and a 15 s drain all ticking with the screen off. How: `setVisibleInterval` sleeps while hidden and fires once on return; `useNow` is one `useSyncExternalStore` store per interval, shared by every component. House rule: ticks never use a bare `setInterval`. Sketch of the idea (not Postern's code):

```ts
export function setVisibleInterval(fn: () => void, ms: number) {
  let id: number | undefined;
  const start = () => { id ??= window.setInterval(fn, ms); };
  const stop = () => { if (id !== undefined) { clearInterval(id); id = undefined; } };
  const onVis = () => (document.hidden ? stop() : (fn(), start()));
  document.addEventListener("visibilitychange", onVis);
  if (!document.hidden) start();
  return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
}
```

(Postern (origin) src/ui/visibleInterval.ts, useNow.ts; 1d70a57)

**No infinite CSS animation on an always-visible element.**
Why: a pulsing live dot ran at the full display rate forever: 900 frames per 15 s and 4.55 s of GPU CPU per minute, against 0 with it off (its header also had `backdrop-blur`). How: a static dot; honour `prefers-reduced-motion`. (Postern docs/research/battery-and-responsiveness.md suspect 2; src/index.css:114)

**Load heavy items only near the viewport.**
How: an `IntersectionObserver` with `rootMargin: 600px`, rooted on the scroll box and not the document, sticky once near; where the API is missing, load everything. (Postern Conversation.tsx; 0650c88)

**Measure before guessing at battery.**
How: a 60 s idle harness that counts requests, timers, frames and wake locks ranked the causes; the top ones (no wake-lock limit, 60 fps pulse, 5 s polls) became fixes. (Postern docs/research/battery-and-responsiveness.md)

**Android suspends a page left open with the screen off; a silent looping `<audio>` and the Screen Wake Lock keep it alive, at a battery price. Avoid unless needed.**
Why: a talk or listening app needs the page alive. The wake lock is dropped whenever the page hides, so re-request it on `visibilitychange`. Postern's had no timeout: an unended session held the screen on for days (a three-day-old talk reopened and took the lock). How: release both after 5 min idle; do not reopen a session older than 30 min. (Postern wakeLock.ts, silentLoop.ts; 521683a, 4b8d69c, 1ac3c04)

**A page the OS has frozen cannot announce anything: push a notification, and speak or show the answer on return.**
Why: `speechSynthesis` is suspended on a hidden page. (Postern sw.ts `onPush`; talkAnswerNotice.ts; 521683a. See Section 14.)

---

## 12. Speech and Audio

Speech is the weakest-documented corner of Android Chrome. Every rule here came from a real phone; a fake recogniser or synthesiser in a test is not Android Chrome. Trust a speech fix only after a real-phone check.

### Speaking (speechSynthesis)

**`synthesis-failed` on Android Chrome has four distinct causes; test on a real Android phone.**
(1) The device default voice was Assamese (`as_IN`) and the utterance had no `lang` (SpellForge 02f4f87, 4b47f4b). (2) A voice listed by `getVoices()` but not usable (d9d05d7). (3) `cancel()` before `speak()` corrupts the engine on newer builds, yet older builds needed it to clear a stuck queue (0acb55c, c4127e4 versus 67e80e2, 5f62e0a); the two histories conflict and the final design avoids relying on either. (4) A Chrome Beta regression where every voice failed, fixed only by a bare utterance with no voice and no lang (7d10b76). Final design: a ranked strategy list, exponential backoff (500 ms base, 5 attempts), a 5 s cooldown, and `onvoiceschanged` clearing the voice cache. Always set `lang` explicitly. (SpellForge src/audio/speech.ts)

**Call `speechSynthesis.speak()` synchronously inside the tap handler.**
Why: a `setTimeout(50)` after `cancel()` moved `speak` out of user activation; the utterance errored instantly and the button flashed grey. `await` (microtasks) keeps activation; `setTimeout` does not. (SpellForge 5f62e0a)

**Prime the engine once on the first gesture with a near-silent `.` utterance, and call `synth.resume()` before each speak.**
Why: some Android engines ignore an empty or zero-volume priming utterance; Chrome silently pauses after the screen turns off. (SpellForge d9d05d7; `warmUp` in speech.ts)

**Do not time out a started utterance.**
Why: a fixed 10 s timeout restarted the tutor's long read-aloud. How: the timer guards only "never started" and `onstart` clears it. (SpellForge c1e8a58, speech.ts)

**Every stop goes through one `stopSpeaking()` with an epoch counter.**
Why: a bare `speechSynthesis.cancel()` looks like an error and triggers the retry loop. How: bump the epoch on a deliberate stop so the retry loop knows the cancel was intended. (SpellForge speech.ts:272; rig memory spell-forge.md "Speech")

**Keep one voice for a whole sequence.**
Why: falling back per letter mixed voices from two providers. How: choose a provider once per sequence and cancel once at the start. (SpellForge 516add8, 2ba0b25)

### Listening (Web Speech recognition, MediaRecorder)

**Web Speech recognition on Android Chrome ends the recogniser by itself mid-hold, rejects bare language tags, and a Bluetooth mic can be silent without an error.**
How: restart while the finger is down and keep the earlier words; always pass a full tag (`en-US`); drop an input device that yields no result and fall back to the phone mic. (Postern listen.ts:1-30; micInput.ts; mw-j0f2d.27, .34, .37)

**Push-to-talk: pressing stops speech, a buzz says the mic is ready, sliding off drops the attempt, replies wait for release.**
Presses under 500 ms are taps (`MIN_READING_MS`). (SpellForge reading-loop.tsx header comment; 9dda5d8)

**`MediaRecorder` gives `audio/mp4` on iOS and Opus webm on Chrome: pick by `isTypeSupported` and strip the codec from the mime.**
Also word the mic-denied error for the actual reader (a child, then a parent). (SpellForge recorder.ts)

---

## 13. Camera, Photos and Haptics

**Normalise photo orientation with `createImageBitmap` plus a canvas; never trust the library's EXIF handling.**
Why: Android cameras write little-endian EXIF; Tesseract mis-rotated portrait shots, and a white border made it return nothing. How: draw through a canvas before handing the image to OCR. (SpellForge b80e5d0)

**Use one `<input type="file" accept="image/*" capture="environment">` for the camera and a second plain input for the gallery.**
(SpellForge camera-import.tsx)

**Downscale to 1600 px and under 1 MB by trying lower quality first, then a smaller scale.**
(trade-tracker capture-still.ts)

**Haptics: `navigator.vibrate?.()` with optional chaining and short patterns (15 ms tap, 30 ms ready); never rely on it for state.**
Why: iOS Safari has no Vibration API (general knowledge, not seen in the repos). (SpellForge src/core/haptics.ts)

---

## 14. Notifications

**Notifications without a server are weak. Do not promise reminders.**
Why: with the tab open they work; with the app closed they are best-effort on installed Chromium only; iOS needs Home Screen on 16.4 or later; there is no periodic sync on iOS. Argus's rules for what it does send: 3 per hour, once per condition per day, text from a fixed vocabulary, never data. (argus docs/DEVICE_NOTIFICATIONS.md has the platform table)

**Chrome on Android gives one notification channel per origin; per-class behaviour comes only from `showNotification` options.**
Why: real per-class channels need a TWA wrapper. How: map each class to `vibrate`, `silent`, `tag`, `renotify`, `requireInteraction` in one table shared by worker and app. (Postern src/push/classOptions.ts; docs/research/notifications.md)

**Do not notify what is already on screen; make a tap land on the exact place.**
How: the worker asks a focused, visible window "seen?" (3 s deadline) before showing; the app closes notifications for records it renders; the push carries only an id, so the tap resolves its URL from the local store. (Postern sw.ts:60-90; dd7679b; src/push/tapTarget.ts)

---

## 15. Offline Store and Sync

For apps that need to work fully offline, store data client-side using IndexedDB. **Do not rely on `localStorage`** for structured data: it's synchronous, has a 5-10 MB limit, and can be cleared by the browser under storage pressure. (The one good use of `localStorage` is device-only settings; see below.)

### Recommended: Dexie (IndexedDB Wrapper)

```js
import Dexie from "dexie";

class AppDatabase extends Dexie {
  items; // Table<Item, string>

  constructor() {
    super("MyAppDB");
    this.version(1).stores({
      items: "id, status, updatedAt",
    });
  }
}

export const db = new AppDatabase();
```

**Screens read only the local store; only the sync service touches the network.**
Why: instant open, works offline, no fetch races. How: Dexie live queries (`useLiveQuery`) in screens, and UI code goes through repositories, never Dexie tables directly. (Postern src/cockpit/hooks.ts; docs/best-practices.md part 2)

**Dexie: never edit an old `version()`; repeat the whole stores map on each bump with a `// vN:` comment; a new field with no index still gets an empty bump.**
Why: a user's phone can be several versions behind, and the upgrade path must replay. Adding only an index needs no `upgrade()`. Dexie accepts compound keys over nested paths (`[origin.txid+origin.vout]`). Test migrations by opening a hand-built old database (Section 20). (trade-tracker CLAUDE.md; SpellForge db.ts, now v15; Postern tests/unit/db-migration.test.ts, 323c7c3)

**Nested or foreign Dexie transactions hang the UI.**
Why: a `db.transaction()` wrapped around a repository method that opens its own, and an implicit read beside `useLiveQuery` observers, deadlocked "Adding..." forever. How: do lookups outside, let the repository own its transaction, or put everything in one explicit read-write transaction. (trade-tracker da3f3a1, 5d57e33, 74f5294)

**Store timestamps as epoch-ms numbers and ids as UUID strings; test with `TZ=UTC` and another zone.**
Why: streaks broke on a timezone bug. (trade-tracker scaffold.md section 6.2; 4b80bdf)

**Device-only settings (keys, model choice, flags) go in `localStorage`, not Dexie.**
Why: they must never sync or export. This narrows the earlier "no `localStorage`" rule: structured data in IndexedDB, device-only flags in `localStorage`. (Cairn rig memory; SpellForge `sf-...` keys, debug-state.ts)

### Storage Limits

| Storage | Limit | Persistent? |
|---------|-------|-------------|
| `localStorage` | 5-10 MB | Cleared under pressure |
| IndexedDB | 50%+ of disk | Covered by `persist()` |
| Cache API | 50%+ of disk | Covered by `persist()` |

`navigator.storage.persist()` applies to the whole origin: IndexedDB, Cache API, and `localStorage` together.

### Request Persistent Storage

```js
if (navigator.storage && navigator.storage.persist) {
  const granted = await navigator.storage.persist();
  console.log(granted ? "Storage is persistent" : "Storage may be cleared");
}
```

Chrome grants this automatically for installed PWAs. Note that Safari deletes **all** script-writable storage (including IndexedDB) for sites the user hasn't interacted with in 7 days. Installed home-screen apps are exempt, which is one more reason to push iOS users toward Add to Home Screen.

### Export & Import: The User's Only Backup

For a purely local app, the device **is** the database: a lost phone or a cleared browser profile means lost data. Give users a way out:

```js
async function exportData() {
  const payload = {
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    items: await db.items.toArray(),
  };
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `myapp-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importData(file) {
  const payload = JSON.parse(await file.text());
  // Validate schemaVersion and migrate if needed before writing
  await db.items.bulkPut(payload.items);
}
```

Include a schema version in the export so old backups can be migrated on import. For whole-database dumps across many tables, the `dexie-export-import` addon handles this generically. A versioned export format is also the natural seam if you later add sync: the export payload is already your wire format.

**The export envelope carries `appName` and `type: full|partial`; validate fully and never import partially; round-trip every table in a test.**
Why: SpellForge's export once omitted progress and the coin balance, so a restore silently lost them. (trade-tracker scaffold.md section 7; SpellForge c7ba7ee)

### Writing to a server

**Write first, send later: an outbox row with a client id, backoff 2 s doubling to 60 s, resumed on open, on `online` and on stream return.**
Why: retries re-encrypt, so content dedupe fails; a 128-bit id fixed before the first try lets the server answer a repeat with the first acceptance. How: a final 4xx (not 408 or 429) marks the row failed with Retry and Discard; 502, 503, 504 and timeouts retry; a row is done only when its echo returns. (Postern src/services/outbox.ts; 619e04b)

**Refresh from event sequence numbers, never from a client-versus-server clock.**
Why: a tapped item flickered back into the queue because the code compared the host's `written_at` with the phone's clock, minutes apart. How: the view carries a `seq`; a tap waits until the view's seq passes the event that echoed it. (Postern (origin) 0e9d3c6, d65e634; docs/protocol.md "still waiting")

**Sync loops re-run on `online` and `visibilitychange`, pause polling when hidden, and recount queues after a failed pass.**
Say "Saved here, waiting to be shared", never "Synchronized" while offline. (argus transport.ts:95-99,133; CadetPoller.ts:49; 9958598)

**A static host falling back to the app page poisons JSON callers.**
Why: a missing API stub returned `200 text/html`, the JSON parse threw, and screens showed an empty state, not an error. How: in e2e, stub every endpoint a screen calls, the auth challenge too. (Postern mw-eqhpw.4)

**Bound every network call: 30 s on the API, 10 s on third-party reads, 15 s on push sends.**
Why: a silent provider otherwise hangs a flow. (Postern apiAuth.ts `API_TIMEOUT_MS`; (origin) ba2e68e, f06d5d7)

**Be gentle with third-party rate limits: one spaced queue (500 ms), back off on 429 and on an empty read, skip while hidden, fetch each item once.**
Why: backoff only on failure meant 24 requests a minute, forever, while the backend was down. (Postern 3a86cf1, 765c2b3, 539c62a)

**An event stream needs its own nginx location.**
How: `proxy_buffering off`, `proxy_read_timeout 1h`, `Connection ""`, plus an `X-Accel-Buffering: no` header and a 25 s comment ping, or proxies buffer or idle it out. (Postern docs/api.md:771-790)

---

## 16. Auto-Save, Drafts and Persistence

Users expect mobile apps to save automatically. Implement debounced auto-save to prevent excessive writes while ensuring no data is lost.

### Pattern: Debounced Auto-Save with Flush on Unmount

```js
function useAutoSave(recordId, delay = 500) {
  const timerRef = useRef(undefined);
  const pendingRef = useRef(undefined);

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pendingRef.current) {
      db.items.update(pendingRef.current.id, pendingRef.current.changes);
      pendingRef.current = undefined;
    }
  }, []);

  const save = useCallback(
    (changes) => {
      if (!recordId) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingRef.current = { id: recordId, changes };
      timerRef.current = setTimeout(() => {
        db.items.update(recordId, changes);
        pendingRef.current = undefined;
      }, delay);
    },
    [recordId, delay],
  );

  // Flush pending changes on unmount: prevents data loss on navigation
  useEffect(() => () => flush(), [flush]);

  return { save, flush };
}
```

### Key Lesson: Always Flush on Unmount

If a user navigates away while a debounce timer is pending, that data is lost. Always flush pending writes in your cleanup function.

### Consider Immediate Save for Critical Actions

For high-stakes interactions (e.g., submitting an answer, completing a step), bypass debounce and save immediately:

```js
const saveImmediate = useCallback(
  (changes) => {
    if (!recordId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = undefined;
    db.items.update(recordId, changes);
  },
  [recordId],
);
```

**Keep the draft: write it to storage 500 ms after the last keystroke and when the composer unmounts.**
Why: a reload or a screen lock lost what he was typing. How: one draft per channel or reply, restored on open, cleared on Send, never sent. The debounce-and-flush above is the same pattern applied to text; flush also on `pagehide` and `visibilitychange hidden` since a frozen page may never unmount. (The `pagehide` addition is inferred from Postern's scroll-memory rule, UNVERIFIED for drafts.) (Postern b6a017a, 798dcfe)

---

## 17. Icons & Splash Screens

### Required Icons

At minimum, provide:

| Size | Purpose | Notes |
|------|---------|-------|
| 192x192 | Standard icon | Used by Android and desktop |
| 512x512 | High-res icon | Used for splash screens and app stores |
| 512x512 (maskable) | Adaptive icon | Android applies circular/shaped masks |
| SVG | Favicon | Scalable, small file size |

**Ship PNG icons at 192 and 512 px; an SVG alone is not enough.**
Why: SpellForge's manifest lists one SVG icon and an SVG apple-touch-icon (UNVERIFIED on device that this blocks install); Postern ships only `icon.svg` and an SVG touch icon and records it as a gap, because iOS ignores SVG touch icons. The earlier edition listed the PNG sizes; this makes the SVG-only shortcut an explicit fault. (SpellForge public/manifest.json, index.html:13; Postern pwa-manifest.ts)

### Maskable Icons

Android uses "maskable" icons to apply platform-specific shapes (circles, squircles, etc.). The important content must fit within the **safe zone**: the inner 80% of the icon.

```json
{
  "src": "icon-512.png",
  "sizes": "512x512",
  "type": "image/png",
  "purpose": "maskable"
}
```

Test your maskable icon at [maskable.app](https://maskable.app/).

### iOS Icons

iOS ignores manifest icons entirely. You **must** use a `<link>` tag, with a PNG:

```html
<link rel="apple-touch-icon" href="/icon-192.png" />
```

If not provided, iOS will use a screenshot of your app as the icon.

### Splash Screens

Android generates the splash screen automatically from the manifest's `background_color`, `name`, and 512px icon: no extra work. iOS ignores this and shows a plain background unless you provide `apple-touch-startup-image` links, which require one image **per device size and orientation**. Don't hand-author these; if you want iOS splash screens, generate them with [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator). Otherwise, just make sure `background_color` matches your app's initial paint so the transition is seamless on Android.

---

## 18. Theme Color & Dark Mode

### Theme Color

The `theme-color` meta tag colors the browser's address bar and task switcher:

```html
<meta name="theme-color" content="#1a1a2e" />
```

Also set it in the manifest, with the same value (a unit test can assert they match; Section 1):

```json
{ "theme_color": "#1a1a2e" }
```

### Dark Mode

Respect the user's system preference, but allow manual override:

```js
function getInitialTheme() {
  // Check for saved preference first
  const stored = localStorage.getItem("app-theme");
  if (stored === "dark" || stored === "light") return stored;
  // Fall back to system preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}
```

### Dynamic Theme Color for Dark Mode

Update the theme-color meta tag when the theme changes:

```js
document.querySelector('meta[name="theme-color"]')
  .setAttribute("content", isDark ? "#111827" : "#1a1a2e");
```

---

## 19. SPA Routing on Static Hosts

SPAs with client-side routing break on static hosts (like GitHub Pages) when users refresh or deep-link to a route: the server returns a 404 because the path doesn't exist as a file.

### Solution: 404 Redirect Trick

**`404.html`**: redirects all 404s back to the app:

```html
<script>
  var pathSegmentsToKeep = 1; // Set to 0 for root domain, 1 for subdirectory
  var l = window.location;
  l.replace(
    l.protocol + "//" + l.hostname + (l.port ? ":" + l.port : "") +
    l.pathname.split("/").slice(0, 1 + pathSegmentsToKeep).join("/") + "/?/" +
    l.pathname.slice(1).split("/").slice(pathSegmentsToKeep).join("/").replace(/&/g, "~and~") +
    (l.search ? "&" + l.search.slice(1).replace(/&/g, "~and~") : "") +
    l.hash
  );
</script>
```

**`index.html`**: decodes the `?/...` query back into the real URL (must run **before** your router initializes):

```html
<script>
  (function (l) {
    if (l.search[1] === "/") {
      var decoded = l.search
        .slice(1)
        .split("&")
        .map(function (s) {
          return s.replace(/~and~/g, "&");
        })
        .join("?");
      window.history.replaceState(null, null, l.pathname.slice(0, -1) + decoded + l.hash);
    }
  })(window.location);
</script>
```

These two scripts are a matched pair (the [spa-github-pages](https://github.com/rafgraph/spa-github-pages) technique): the 404 page encodes the path into the query string, and index.html decodes it with `history.replaceState` so the router sees the original URL. Don't mix snippets from different variants of this trick; the encoding and decoding must agree.

**UNVERIFIED: with a relative `base: './'`, the decode script may break assets on a first-visit deep link.**
Why: the decode script calls `history.replaceState` before the relative `./assets/...` module script is fetched (Cairn dist/index.html:29-47), so the browser may resolve the assets against the new deep URL and 404. Cairn's service worker hides it on repeat visits. How: test a cold deep link on Pages (service worker unregistered, fresh profile) before copying this combination. (Cairn dist/index.html; nobody has seen it fail)

### Service Worker Alternative

If you have a service worker with `navigateFallback: "index.html"`, it will handle this for repeat visits. But the 404 trick is still needed for the **first visit** before the service worker is installed.

### On your own host: make every place a query URL on `/`

**On a host you control, make every place a `?v=` query URL on `/`.**
Why: deep links, reloads and notification taps all land on `index.html` with no per-route server rewrite. How: the router reads the query; `goBack` falls back to a parent route when the app was opened cold. (Postern src/nav/route.ts, router.ts)

---

## 20. Testing Offline-First Logic

The highest-value tests in an offline-first PWA are the data layer: importers, dedupe, migrations, derived analytics: pure logic that reads and writes IndexedDB. With `fake-indexeddb`, your real Dexie code runs unmodified in Vitest, no browser needed:

```ts
// vite.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
  // ...
});
```

```ts
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto"; // In-memory IndexedDB, Dexie works as-is
```

Tests then import the real database module:

```ts
import { db } from "../db";
import { importRecords } from "../services/importer";

beforeEach(async () => {
  await db.items.clear(); // Isolate tests within a file
});

it("dedupes records imported twice", async () => {
  await importRecords([record, record]);
  expect(await db.items.count()).toBe(1);
});
```

### What This Buys You

- Schema definitions and Dexie migrations are exercised on every test run: a broken `version(n).stores()` upgrade fails loudly in CI instead of on a user's device.
- Import/export round-trips (Section 15) become trivially testable.

**Test a Dexie migration by opening a hand-built old database, then the new schema.**
(Postern tests/unit/db-migration.test.ts; 323c7c3)

**Know the jsdom gaps; they are where unit tests pass and the phone fails.**
Why and how: there is no `matchMedia` (stub it); no canvas or Image decode; `Blob` does not survive fake-indexeddb cloning (use `node:buffer` Blob); fake timers break `crypto.subtle`; fake-indexeddb persists across tests, so `db.delete()` then `open()` per test; and a real timer wait under load needs `findBy*` timeouts of 5 s (set `asyncUtilTimeout` once). (rig memories spell-forge, trade-tracker, argus)

**`globalThis.fetch` passed bare throws "Illegal invocation" in real browsers; jsdom never catches it.**
How: `fetch.bind(globalThis)`. (SpellForge 003e773; rig memory spell-forge)

```ts
const doFetch = fetch.bind(globalThis);
```

**Testing Library `findBy*` resolves when the element EXISTS, not in the state you assert; assert state inside `waitFor`.**
With vitest-cucumber, import `@testing-library/react/dont-cleanup-after-each` before RTL. (Postern mw-tfne4.38, mw-u7ny2.3)

**Time-based tests: measure gaps with `performance.now()`, wait with an explicit route or host-speed helper, never `Date.now()` or `waitFor`'s default 1 s.**
Why: a loaded host and a WSL2 clock that steps back both produced flakes. (Postern (origin) 25f99f0, 5ee2805; mw-xhtcup.17, .20; helpers `waitForRoute`, `SLOW_HOST_MS`)

**Unit-test the worker with a fake registration and a worker harness.**
(Postern tests/support/fake-registration.ts, sw-harness.ts)

### Run Only the Tests Affected by Your Changes

Vitest resolves the module graph, so it knows which test files (transitively) import the files you touched. Use that during development instead of running the whole suite:

```jsonc
// package.json
"scripts": {
  "test": "vitest run",            // Full suite: what CI runs
  "test:watch": "vitest",          // Watch mode: reruns only tests related to each save
  "test:changed": "vitest run --changed"  // One-shot: tests affected by uncommitted changes
}
```

Variants of `--changed` cover the common workflows:

```sh
vitest run --changed              # Affected by uncommitted changes
vitest run --changed HEAD~1       # Affected by the last commit
vitest run --changed origin/main  # Affected by your whole branch
vitest related src/utils.ts       # Tests that import a specific file
```

Two caveats:

- Selection is based on **import tracing**. Changes that affect behavior without an import edge (vitest/Vite config, global setup files, environment variables, mocks resolved at runtime) won't trigger the right tests. When in doubt, run the full suite.
- Keep CI running the full suite. Affected-test selection is a dev-loop optimization; CI is the safety net that catches what the heuristic misses. Only reach for `--changed origin/main` in CI if the full run becomes painfully slow.

### What It Doesn't Cover

**Install flow, real caching, speech and the keyboard are not exercised by unit tests; the worker's logic can be, with a fake registration.**
The earlier edition said service worker behaviour was not unit-testable and had to be checked by hand; Postern unit-tests its worker with a fake registration and harness (above), so only the real browser behaviour remains manual. Verify those in Chrome DevTools (Application tab, Service Workers, "Offline" throttling) and on a real device (Section 21 lists what only a phone shows).

---

## 21. Testing at Phone Width

**jsdom has no layout (every width reads 0): a layout claim is proven only in a real browser at 360 to 390 px.**
Why: a button off screen, a clipped menu, a widened page are all invisible to jsdom. How: Playwright against the built `vite preview`, viewport 390x844; seed Dexie through raw `indexedDB` calls; assert the button stays in view. Every e2e ends with a screenshot. (Postern playwright.config.ts `shots` project, tests/e2e/long-options.spec.ts, tests/e2e/shot.ts; SpellForge tests/e2e/*.spec.ts; argus rig memory)

**Test keyboard and scroll bugs by pushing the page by hand.**
Why: headless browsers have no keyboard. How: insert a tall box, scroll html, body and the shell 300 px, act, then assert all are back at 0 and the tab bar's bottom edge is the window's. (Postern tests/e2e/screen-stays-put.spec.ts)

**Block service workers in e2e (`serviceWorkers: 'block'`) except in the spec that tests them.**
Why: a cached worker serves a stale build to the next spec. (Postern playwright config; the stale-build symptom is the standard reason, not a recorded incident)

**Never bind a shared preview port (4173) in Playwright's `webServer`.**
Why: a collision silently serves another project's `dist/` and looks like a failing test. Postern uses 4319; SpellForge runs one spec at a time on 4173. (Postern mw-u7ny2.1)

**Playwright host setup traps.**
Use `channel: 'chromium'` (no headless-shell); set `LD_LIBRARY_PATH` for missing libs when there is no sudo; `getByLabel` is a substring match, so use `getByRole('radio', { name })`. (SpellForge playwright.config.ts:7-18)

**A click-through at 390 px finds the bugs unit tests cannot; run one early.**
Why: argus found a top bar that overflowed, workflows with no close button on phones, and focus that was not trapped. How: shrink and truncate the bar, hide duplicates at 480 px and below, and give every drawer Escape, a backdrop tap and a visible close, with focus moved in and restored on close. (argus 9958598)

**Stub every endpoint a screen calls in e2e, the auth challenge too.**
(See Section 15: a static host answers an unstubbed call with HTML.)

### What only a real phone shows

Compiled from the rules above; not a separate source:

| Check | Why a browser test cannot show it | Section |
|-------|-----------------------------------|---------|
| Keyboard opening and closing | Headless has no keyboard | 7 |
| Speech synthesis and recognition | A fake engine is not Android Chrome | 12 |
| Wake lock and background suspension | The OS freezes the page | 11 |
| Notification channel behaviour | One channel per origin on Chrome | 14 |
| Install and maskable icon | Launcher chrome | 3, 17 |
| Bluetooth mic input | Silent without an error | 12 |

---

## 22. Build Traps: Vite, esbuild, TypeScript

These fail only in the deployed bundle or in `tsc -b`; unit tests stay green.

**Vite's production build turns Node built-ins into an empty object.**
Why: `class X extends require('events').default` threw "Class extends value #<Object>" only in the deployed bundle. Vite externalises a Node builtin to `{}` for the browser; the only clue is "has been externalized for browser compatibility" in the `vite build` output. How: for an import like `events`, a `resolve.alias` to a real EventEmitter; for bare globals (`Buffer`, `process`), a runtime stand-in. Prove it with a throwaway bundle built from the real vite.config.ts, not by grepping minified output. Relevant if the app pulls in bsv-kit. (Postern vite.config.ts:17-24, tests/unit/vite-events-alias.test.ts, mw-1589l.19; SpellForge 9a641f3, f5dc5ec, be20809)

**esbuild picks decorator semantics from the nearest tsconfig, even for files in `node_modules`.**
Why: a library shipping `.ts` with legacy decorators passed every test and threw in the deployed build. How: set `esbuild.tsconfigRaw.compilerOptions.experimentalDecorators`. (Postern 11129a6)

**Annotate `Uint8Array<ArrayBuffer>` where typed arrays flow into SubtleCrypto.**
Why: Vitest passes, `tsc -b` fails on TS 5.9. (argus rig memory)

**React 19 lint: the `react-hooks` compiler rule rejects a `useCallback` whose dependency comes from a plain helper's result or a ref synced in the same effect.**
How: derive in `useMemo` and take the primitive. (SpellForge rig memory mw-ke5k7i; trade-tracker fb25382)

**Run `npm run typecheck` after merging main into a branch.**
Why: two stories' imports merged clean and left an undefined identifier. (Postern mw-gq6.166)

**Pin an installed-by-git library by tag or SHA, and keep `resolved` as `git+https` in the lockfile.**
Why: `git+ssh` breaks CI. bsv-kit installs as `github:Jonathan-A-White/bsv-kit#v0.1.0`, but its README says no tags yet, so use a SHA until there is one. (trade-tracker rig memory; bsv-kit README)

---

## 23. Deploy to GitHub Pages

### CI/CD: GitHub Actions to GitHub Pages

One workflow handles both validation and deployment: every push and PR runs typecheck + tests + build; only pushes to `main` deploy.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Lint
        run: npm run lint
      - name: Type check
        run: npx tsc --noEmit
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build
      - name: Upload artifact
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Why This Shape

- **Lint and typecheck as their own steps** (before the build) so failures get a clear step name instead of being buried in build output. Order them cheapest-first: lint, typecheck, tests, build.
- **Deploy is gated on `needs: test` and main-push-only**: PRs get full validation but can never deploy.
- **Official Pages actions** (`upload-pages-artifact` + `deploy-pages`) deploy via OIDC, which is why `pages: write` and `id-token: write` permissions are needed. No `gh-pages` branch, no deploy keys.
- **`concurrency: group: pages`** prevents two merges from deploying simultaneously out of order.
- **`cache: npm` + `npm ci`** gives fast, reproducible installs from the lockfile.

One PWA-specific consequence: every merge to `main` is a production deploy, which immediately triggers a service worker update for any user with the app open. Make sure your update flow handles that (Section 10).

### Repo path: pick one model

**Two repo-path models exist; pick one on purpose, and mind the case.**
The earlier edition showed only the relative manifest. (a) Absolute `base: '/repo/'` (SpellForge; trade-tracker sets it only `if GITHUB_ACTIONS`, with a matching manifest scope and a router basename derived from `BASE_URL`). (b) Relative `base: './'` with manifest `.` and a runtime router basename (Cairn). Cairn moved to (b) after a blank page: the repo is `/Cairn/` but `base` was `/cairn/`, and Pages paths are case-sensitive. Model (b) carries the unverified first-visit risk in Section 19. (Cairn 0b7f96a; trade-tracker; SpellForge)

**Smoke-test the build under the repo path in CI.**
Why: a repo rename left the mount path stale in argus. How: serve `dist` at `/argus/`, require index, manifest and sw.js, and check that every `./` reference resolves. (argus scripts/deployment-smoke.mjs; c840184)

**Set the Pages source to "GitHub Actions" once, by hand, in the repo settings.**
Why: `actions/configure-pages` with `enablement: true` needs a token with enough scope to bootstrap Pages; it took argus three commits to find that. (argus 1d067a0, d7a7f95, b712c75)

**A builder's token may lack `workflow` scope; edits to `.github/workflows/` are refused on push.**
How: ship workflow changes from a host whose token has the scope. (vault rig memories: spell-forge, argus, cairn)

**A version-bump commit made by a workflow with `GITHUB_TOKEN` does not trigger another deploy.**
Why (UNVERIFIED; inferred from the workflow design): SpellForge's `version-bump.yml` pushes `[skip ci]` after merge, so the shipped `__APP_VERSION__` can lag the repo by one patch. How: bump before the build, not after. (SpellForge version-bump.yml)

**Path-filtered CI plus one `ci-pass` gate job for branch protection.**
Useful once the suite is slow: `dorny/paths-filter` per area, and a final job with `if: always()` that aggregates results so branch protection needs only one required check. The earlier edition mentioned only `--changed`. (SpellForge test.yml)

### On your own host instead of Pages

**Ship a self-contained `dist/` with root-absolute asset paths; rsync it and keep the previous build.**
Why: a half-finished deploy is the cause of the poisoned-precache failure in Section 9; keeping the previous build is the rollback. (Postern CLAUDE.md "Deploy")

---

## 24. Licence and Keys on a Phone

This section is thin on purpose: Postern's key handling is proven on Android Chrome; the bsv-kit licence material is from its README only and its modules are stubs until their stories land. Nothing here is proven on iOS.

**Keep the key on the phone: a passkey's PRF secret wraps it; a daily unlock re-wraps it with a non-extractable `CryptoKey` kept in IndexedDB.**
Why: the stored row is then useless anywhere else. (Postern keySession.ts, session.ts, webauthnPrf.ts)

**WebAuthn PRF: `prf.enabled === false` at `create()` is not final; evaluate in a `get()` assertion before ruling PRF out.**
Why: some authenticators compute PRF only after first use. trade-tracker's passkey.ts does the same: registration may not evaluate PRF, so run a separate assertion, and wrap WebAuthn behind a port so tests can fake it. (Postern webauthnPrf.ts:1-15; mw-f758y.16, mw-tfne4.18; trade-tracker passkey.ts)

**Never show raw WebAuthn error text.**
Why: browser messages carry w3.org links. How: run errors through a describer (Postern `describeUnlockError`). (Postern mw-f758y.16)

**Normalise a recovery phrase in one function (NFKD, lowercase, trim, collapse whitespace) and name invalid words before deriving.**
Why: a phone paste once derived a silently different key. (Postern vault.ts `normalisePhrase`, `findInvalidWords`; mw-f758y.12)

**bsv-kit has no DOM: the app owns the UI and the storage of the wrapped key (device-only, `localStorage`).**
Imports per the README: `import { vault, door, licence } from 'bsv-kit/bsv'; import { grist } from 'bsv-kit/grist'`. UNVERIFIED beyond the README: modules are stubs. Keys and wrapped keys never go in Dexie tables that sync or export (Section 15). (bsv-kit README)

---

## 25. Version Management

Inject the version at build time so users can see what version they're running (helpful for bug reports and cache debugging):

```js
// vite.config.ts
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
```

```js
// In your app
const version = __APP_VERSION__; // "1.0.7"
```

Display the version in a Settings or About page. When users report issues, you can immediately tell if they're running a stale cached version.

**If `package.json`'s version never changes, stamp the build with UTC time and short commit too.**
The earlier edition assumed the package version moves with each release. Postern's does not, so it shows version, build time and commit. If a workflow bumps the version after the build, the displayed number can lag by a patch (Section 23). (Postern build-version.ts; mw-gq6.196)

---

## 26. Common Pitfalls

A symptom index; the fix lives in the section named.

### White Bars Around Content
**Cause:** Safe area padding with no background color on the app container.
**Fix:** Set `background-color` on `#root` to match your app theme (Section 7).

### App Shows Old Content After Deploy
**Cause:** Service worker serving stale cached assets, or a prompt-based update that nothing triggers.
**Fix:** With `autoUpdate`, use `immediate: true`. With the prompt flow, check the banner really posts the activate message (Section 10). Show a build stamp so you can tell (Section 25).

### Double Scrollbars on Mobile
**Cause:** Both `<body>` and the app container allow scrolling.
**Fix:** Set `overflow: clip` on `html, body` and only allow `overflow-y: auto` in your screen boxes (Section 7).

### Header Hides Under the Status Bar After the Keyboard Closes
**Cause:** The document was scrolled by focus, `scrollIntoView` or the keyboard; `overflow: hidden` does not stop that.
**Fix:** `overflow: clip`, the scroll guard, `focus({ preventScroll: true })`, and `scrollTop` on the list's own box (Section 7).

### iOS Doesn't Show Install Banner
**Cause:** iOS Safari doesn't support `beforeinstallprompt`.
**Fix:** Show manual instructions ("Tap Share > Add to Home Screen") for iOS users.

### Content Hidden Behind Notch
**Cause:** Missing `viewport-fit=cover` or missing safe area padding.
**Fix:** Add both (Sections 5 and 6).

### Double Gap Above the Home Indicator
**Cause:** The bottom safe-area inset applied to more than one layer.
**Fix:** Only the lowest bar carries it (Section 5).

### Manifest `scope` and `start_url` Mismatch
**Cause:** Deploying to a subdirectory without updating both values.
**Fix:** Use relative values (`"start_url": "."`, `"scope": "."`) so the manifest works at any base path, or match an absolute `base` exactly, case included (Sections 1 and 23).

### Blank Page on GitHub Pages
**Cause:** `base` differs in case from the repo name (`/cairn/` versus `/Cairn/`).
**Fix:** Match the case, and smoke-test the build under the repo path (Section 23).

### Data Lost Between Page Navigations
**Cause:** Debounced saves discarded when component unmounts.
**Fix:** Always flush pending writes in the cleanup function (Section 16).

### Navigation Breaks Right After a Deploy
**Cause:** Auto-updated service worker replaced the precache while a user had the old build open; old lazy chunks no longer exist.
**Fix:** Reload on `vite:preloadError`, or switch to a prompt-based update flow (Section 10).

### App Broke For Good After a Half-Finished Deploy
**Cause:** A missing hashed asset was answered with the HTML shell and precached as CSS or JS.
**Fix:** Real 404s on `/assets/` and a precache guard in the worker (Section 9).

### Pull-to-Refresh Reloads the App
**Cause:** Default overscroll behavior on Android Chrome.
**Fix:** `overscroll-behavior: none` on `html, body` (Section 8).

### Buttons Stay Highlighted After Tapping
**Cause:** `:hover` styles stick on touch screens until the next tap.
**Fix:** Wrap hover styles in `@media (hover: hover)`; use `:active` for touch feedback (Section 8).

### A Button Does Nothing When Tapped
**Cause:** A decorative overlay above it, an un-awaited rejected write, or a popup clipped by `overflow-hidden`.
**Fix:** `pointer-events-none` on overlays, await and show errors, portal the popup (Section 8).

### Page Zooms When Focusing an Input (iOS)
**Cause:** Input font-size below 16px triggers Safari's auto-zoom.
**Fix:** Set `font-size: 16px` or larger on all inputs (Section 6).

### Page Zooms on a Fast Double Tap
**Cause:** Default double-tap-to-zoom.
**Fix:** `touch-action: manipulation` on `html`; lock pinch as well only if you accept losing accessibility zoom (Section 6).

### Bottom Bar Hidden Behind the Keyboard (Android)
**Cause:** Modern Android Chrome doesn't resize the layout viewport for the keyboard by default.
**Fix:** Add `interactive-widget=resizes-content` to the viewport meta tag, or size the UI from `visualViewport` (Section 7).

### Works in Tests, Throws in the Deployed Bundle
**Cause:** A Node built-in externalised to `{}`, decorator semantics from the wrong tsconfig, or a bare `fetch` reference.
**Fix:** Section 22 and Section 20.

### Speech Works on One Phone, Not Another
**Cause:** Default voice with no `lang`, an unusable listed voice, `cancel()` before `speak()`, or `speak()` outside the tap.
**Fix:** Section 12.

### Stale Data or "Live" Label After the Phone Slept
**Cause:** A suspended socket raises no error.
**Fix:** Catch up on `visibilitychange` and `pageshow`, and age out the stream (Section 11).

---

## Quick Reference Checklist

```
[ ] Manifest: name, short_name, icons (PNG 192, 512, 512 maskable), display, start_url, scope; one shared object, tested
[ ] Meta tags: viewport (viewport-fit=cover, interactive-widget), theme-color, description
[ ] iOS meta tags: apple-mobile-web-app-capable (+ mobile-web-app-capable), status-bar-style, title, apple-touch-icon PNG
[ ] Zoom: decided on purpose; touch-action manipulation on html; inputs >= 16px
[ ] Service worker: registered from story one, precaches static assets, navigateFallback, size limit raised, precache guard
[ ] Safe areas: top/side insets on root; bottom inset only on the lowest bar
[ ] Scroll: html/body/#root overflow clip + overscroll none, 100dvh, one scroll box per screen, scroll guard, preventScroll focus
[ ] Background color: set on #root to prevent white bars behind safe area padding
[ ] Updates: prompt or auto chosen on purpose; activate message wired and tested; periodic registration.update(); vite:preloadError handled
[ ] Visibility: no bare setInterval; catch up on visibilitychange + pageshow; no infinite animations; wake lock has a timeout
[ ] Offline storage: Dexie, no edited old versions, repositories own transactions; persist() requested; device-only flags in localStorage
[ ] Data backup: JSON export/import with schema version, appName, type; round-trip every table
[ ] Sync: outbox with client id; seq numbers not clocks; timeouts on every call; honest "waiting to be shared" label
[ ] Auto-save: debounced writes with flush on unmount; drafts kept
[ ] Native feel: overscroll-behavior none, tap-highlight transparent, hover gated behind (hover: hover), overlays pointer-events-none
[ ] Keyboard: bottom UI tested with keyboard open on a real Android phone
[ ] Speech/audio (if used): lang always set, speak() inside the tap, one stopSpeaking(), real-phone check
[ ] Icons: 192px, 512px, 512px maskable, SVG favicon, apple-touch-icon PNG
[ ] HTTPS: required for service workers (localhost exempt)
[ ] SPA routing: 404.html redirect for static hosts; cold deep link tested on Pages
[ ] Subdirectory deploy: base model chosen, case matches the repo, deploy smoke test in CI
[ ] Tests: data layer via fake-indexeddb; layout via Playwright at 390x844; service workers blocked in e2e
[ ] Build: production bundle exercised (Node built-ins, decorators); typecheck after merging main
[ ] CI: typecheck + tests + build on every PR; deploy gated to main
[ ] Version: injected at build time, with time and commit stamp, displayed in-app
```

---

## Changelog

- **2026-10-08: rewritten from Postern, SpellForge, Cairn, argus and trade-tracker lessons; 99 rules added, 12 changed, 1 removed.**
- 2026-06: first edition, from Cairn and trade-tracker.
