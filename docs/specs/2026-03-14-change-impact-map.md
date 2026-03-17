# Change Impact Map

Date: 2026-03-14
Purpose: Pre-change guardrail for safe implementation in the current system.

## Scope boundary

This map identifies:

- where new changes should be concentrated (`TOUCH`)
- areas that can be accidentally broken (`HIGH-RISK TOUCH`)
- areas to avoid unless explicitly required (`AVOID`)

It is based on the current-state snapshot in `docs/specs/2026-03-14-current-state-spec.md`.

## TOUCH (primary change zones)

These are the safest and most expected places to add feature behavior:

- `WebDoTheThao/project/src/pages/*`
  - UI behavior, routing-level user flows, form handling, page-level orchestration.

- `WebDoTheThao/project/src/components/*`
  - Presentation, reusable UI building blocks, interaction surfaces.

- `WebDoTheThao/project/src/lib/*`
  - Formatting helpers, storage utility wrappers, small domain helpers.

- `WebDoTheThao/project/src/types/index.ts`
  - Shared TypeScript domain model updates when schema/domain changes.

- `WebDoTheThao/project/supabase/migrations/*` (add new migration files only)
  - Database schema evolution and policy/index updates.

## HIGH-RISK TOUCH (modify carefully with regression checks)

Changes here are often necessary but can have cross-cutting side effects:

- `WebDoTheThao/project/src/contexts/AuthContext.tsx`
  - Impacts login state across all pages.
  - Risk: auth race conditions, redirect loops, provider mismatch.

- `WebDoTheThao/project/src/contexts/CartContext.tsx`
  - Impacts cart totals, item identity, size handling, checkout readiness.
  - Risk: Supabase/localStorage divergence, stale optimistic updates.

- `WebDoTheThao/project/src/pages/CheckoutPage.tsx`
  - Impacts order creation and cart clearing.
  - Risk: partial writes (order created but order_items failed), validation gaps.

- `WebDoTheThao/project/src/pages/DashboardPage.tsx`
  - Impacts order visibility/deletion and profile persistence.
  - Risk: inconsistent deletion flow and provider-specific data mismatch.

- `auth-server.js`
  - Impacts Google auth and session validity globally.
  - Risk: broken callback flow or session cookie behavior.

## AVOID (unless task explicitly requires)

- `node_modules/`
  - Never edit vendor code.

- `.env`, secrets, or credential-bearing files
  - Do not commit or restructure secrets during feature work.

- Existing historical migration files in `WebDoTheThao/project/supabase/migrations/`
  - Prefer new forward-only migration files instead of rewriting old ones.

- Core build/config files without clear need:
  - `package.json` (root + project), `package-lock.json`, `vite.config.ts`
  - Only touch when dependency/build behavior must change.

## Cross-cutting dependency map

Use this to quickly estimate blast radius before any edit:

1. Auth change (`AuthContext` or `auth-server.js`)
   -> affects `LoginPage`, route guards/redirects, `DashboardPage`, checkout access.

2. Cart change (`CartContext`)
   -> affects `ProductDetailPage`, `CartPage`, `CheckoutPage`, dashboard order expectations.

3. Order/schema change (`orders`/`order_items` migrations or types)
   -> affects `CheckoutPage`, `DashboardPage`, type interfaces, Supabase queries.

4. Storage model change (`googleLocalData.ts`/`checkoutSession.ts`)
   -> affects provider-specific parity and persistence across refresh/navigation.

## Change strategy (recommended)

For each new task:

1. classify as `page-only`, `context-level`, `schema-level`, or `auth-server-level`
2. keep edits in one zone first, then propagate minimal required updates
3. validate both provider paths (`supabase` and `google`) when touching auth/cart/orders
4. verify migration + type + query alignment together when touching data model

## Minimal regression checklist before merge

- Auth flows:
  - Email/password login still works.
  - Google OAuth login + logout still works.

- Cart flows:
  - Add/update/remove item still works for both providers.
  - Shoe-size updates persist correctly.

- Checkout flows:
  - Order creation works and cart is cleared only on success.
  - Dashboard reflects newly created order correctly.

- Data integrity:
  - New migrations are additive and run cleanly.
  - Type definitions match queried/inserted fields.
