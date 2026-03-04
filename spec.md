# Crypto Vision AI

## Current State
Full-stack crypto AI predictor app with:
- Markets, Watchlist, Portfolio, Wallet, Options, Intraday, Admin, Founders, About pages
- Internet Identity auth, onboarding flow, admin panel with user tracking
- Live AI signals, candlestick charts, BUY/SELL notifications

## Requested Changes (Diff)

### Add
- **Subscription page** accessible from sidebar and bottom nav ("Subscription" or "Pro" icon)
- **3 subscription tiers** displayed as cards:
  - Basic (1 Month) — $40/month
  - Standard (6 Months) — $210 total ($35/month, saves ~12%)
  - Pro (1 Year) — $420 total ($35/month, saves ~12%)
- **Features per tier** designed by AI to reflect a real trading platform:
  - Basic: Real-time AI signals (15-min delay removed), 15 coins tracked, Basic charts, Email alerts, Portfolio tracking
  - Standard: All Basic features + 31 coins tracked, Advanced candlestick charts, Options trading access, Intraday trading, Priority support, Custom watchlist (50 coins)
  - Pro: All Standard features + Unlimited coins, Premium AI predictions, API access, Dedicated account manager, Backtesting tools, Advanced analytics, Custom alerts, VIP support
- **Current plan badge** stored in localStorage, displayed in header or profile area
- **Subscribe CTA** button on each card — shows "Current Plan" if active
- **Upgrade prompt** — locked features hint on pages that require higher tiers (Options and Intraday require Standard+)
- **PageId** extended to include "subscription"

### Modify
- `appStore.ts` — add `PageId` "subscription", add `userSubscription` state (plan name + expiry), `setSubscription` action
- `AppShell.tsx` — add `SubscriptionPage` case in `PageContent`
- `SideNav.tsx` — add Subscription nav item with Crown/Gem icon
- `BottomNav.tsx` — add Subscription to MORE_NAV

### Remove
- Nothing removed

## Implementation Plan
1. Add `subscription` to `PageId` union and add subscription state to `appStore.ts`
2. Create `SubscriptionPage.tsx` with 3 tier cards, feature lists, CTA buttons
3. Wire `AppShell`, `SideNav`, `BottomNav` to include the new page
4. Add small "Plan badge" in `TopHeader.tsx` showing current active plan
5. Add soft lock hint on `OptionsPage.tsx` and `IntradayPage.tsx` for free users
