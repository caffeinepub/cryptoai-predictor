# Crypto Vision AI

## Current State
- Full-stack React + Motoko app with dark exchange-style UI
- Mobile bottom navigation already exists (BottomNav.tsx)
- index.html has minimal meta tags (only charset + viewport)
- No PWA manifest, no service worker, no iOS/Android home screen meta tags
- AppShell uses `h-screen` layout with fixed header/footer
- Logo assets exist: crypto-vision-ai-logo-transparent.dim_200x200.png (200x200)

## Requested Changes (Diff)

### Add
- `manifest.json` in `public/` — full PWA manifest with name, short_name, icons (192x192, 512x512), display: standalone, theme_color, background_color, orientation, start_url, scope
- PWA icon 192x192 at `public/assets/generated/pwa-icon-192.png`
- PWA icon 512x512 at `public/assets/generated/pwa-icon-512.png`
- `public/sw.js` — minimal service worker that caches the app shell for offline use (cache-first for static assets, network-first for API calls)
- iOS/Android/PWA meta tags in `index.html`: apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style, apple-mobile-web-app-title, mobile-web-app-capable, theme-color, apple-touch-icon links, manifest link
- Service worker registration script in `index.html` (inline or via main.tsx)
- viewport meta update to include `viewport-fit=cover` for iPhone notch/safe-area

### Modify
- `index.html` — add all PWA meta, link to manifest, register SW
- `AppShell.tsx` — add `safe-area-inset` padding to bottom nav area so content is not hidden behind iPhone home indicator; ensure `env(safe-area-inset-*)` is respected
- `index.css` / global styles — add `padding-bottom: env(safe-area-inset-bottom)` to bottom nav, ensure `color-scheme: dark` is set on html

### Remove
- Nothing

## Implementation Plan
1. Generate pwa-icon-192.png and pwa-icon-512.png from existing logo asset
2. Create `src/frontend/public/manifest.json` with correct PWA fields
3. Create `src/frontend/public/sw.js` — app shell cache + offline fallback
4. Update `src/frontend/index.html` — viewport-fit=cover, all apple/android meta, link manifest, register SW inline script
5. Update `AppShell.tsx` — add `pb-safe` / `env(safe-area-inset-bottom)` to BottomNav wrapper so iPhone home bar doesn't overlap
6. Update global CSS to ensure `color-scheme: dark` on html, and `overscroll-behavior: none` on body to prevent pull-to-refresh rubber banding
7. Typecheck and build
