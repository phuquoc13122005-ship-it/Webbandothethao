# Current State Spec

Date: 2026-03-14
Scope: Existing system snapshot before new changes

## Project purpose

This repository implements a sports e-commerce web application. The system lets users browse and filter products, add items (including shoe sizes) to cart, place orders at checkout, and manage orders/profile in a dashboard. Authentication is supported through Supabase email/password and Google OAuth.

## Architecture overview

The system is organized into three runtime parts:

1. Frontend SPA (`WebDoTheThao/project`)
   - React + TypeScript + Vite application.
   - Routing and page composition are defined in `src/App.tsx`.
   - Application bootstraps in `src/main.tsx`.

2. Authentication backend (`auth-server.js`)
   - Express server for Google OAuth flow and session endpoints.
   - Handles `/auth/google`, `/auth/google/callback`, `/auth/me`, `/auth/logout`.
   - Uses cookie-based sessions via `express-session`.

3. Data backend (Supabase)
   - Frontend directly calls Supabase via `@supabase/supabase-js`.
   - PostgreSQL schema and RLS policies live in `WebDoTheThao/project/supabase/migrations`.

Data flow is hybrid: Supabase-auth users persist data in database tables, while Google-auth users use browser storage for selected domains (cart/profile/orders) through local helper modules.

## Key modules

- `WebDoTheThao/project/src/contexts/AuthContext.tsx`
  - Unifies auth state from Supabase session and Google session endpoint.
  - Exposes sign-up/sign-in/sign-out and Google sign-in initiation.

- `WebDoTheThao/project/src/contexts/CartContext.tsx`
  - Central cart state/actions.
  - Supabase-backed behavior for `provider = supabase`.
  - `localStorage`-backed behavior for `provider = google`.
  - Supports size-aware cart items.

- `WebDoTheThao/project/src/pages/CheckoutPage.tsx`
  - Checkout flow with shipping form validation and payment selection.
  - Creates order + order items (or local order fallback for Google users).
  - Clears cart and checkout draft on success.

- `WebDoTheThao/project/src/pages/DashboardPage.tsx`
  - User dashboard for order history and profile editing.
  - Loads from Supabase or local Google fallback store.

- `WebDoTheThao/project/src/lib/supabase.ts`
  - Supabase client initialization from environment variables.

- `WebDoTheThao/project/src/lib/checkoutSession.ts`
  - Persists checkout draft in `sessionStorage`.

- `WebDoTheThao/project/src/lib/googleLocalData.ts`
  - Persists Google-user profile and orders in `localStorage`.

- `auth-server.js`
  - Google OAuth and session lifecycle logic.

## Data models

Primary relational tables (Supabase/Postgres):

- `profiles`
  - User profile metadata linked to `auth.users`.

- `categories`
  - Product grouping metadata.

- `products`
  - Catalog items with pricing, rating, stock, featured flags.

- `cart_items`
  - User cart rows, now size-aware via `shoe_size`.

- `orders`
  - Order header data: user, status, total, shipping address, created time.

- `order_items`
  - Per-item order rows with quantity, price, and optional `shoe_size`.

TypeScript interfaces in `WebDoTheThao/project/src/types/index.ts` mirror these entities:
`Category`, `Product`, `CartItem`, `Order`, `OrderItem`, `Profile`.

Schema and security notes:

- Row-level security is enabled across core tables.
- Policies enforce per-user access for private entities.
- Recent migration `20260313090000_add_shoe_size_to_cart_and_order_items.sql`:
  - Adds `shoe_size` columns with valid range constraints.
  - Reworks cart uniqueness by user + product + size.

## External dependencies

Frontend (project package):

- `react`, `react-dom`, `react-router-dom`
- `@supabase/supabase-js`
- `lucide-react`
- Tooling: `vite`, `typescript`, `eslint`, `tailwindcss`, `postcss`

Backend (root package):

- `express`
- `express-session`
- `googleapis`
- `cors`
- `dotenv`

External integrations:

- Supabase project (Auth + Postgres)
- Google OAuth through custom Express server

## Known limitations

1. Session/cookie production hardening is incomplete in auth server:
   - Session cookie currently configured with `secure: false`.
   - OAuth state uses `Math.random()` rather than crypto-secure generation.

2. Session storage backend is in-memory by default (`express-session` default store):
   - Not durable across process restarts.
   - Not suitable for horizontal scale.

3. Persistence behavior differs by auth provider:
   - Supabase users store in DB.
   - Google users use browser storage for cart/profile/orders.
   - Can cause cross-device inconsistency for Google users.

4. Checkout/order writing atomicity depends on deployment state:
   - Legacy path writes `orders` and `order_items` in separate client operations.
   - New hardening work introduces RPC `create_checkout_order_atomic` in migration `20260314120000_create_checkout_order_rpc.sql`.
   - Until that migration is applied in target environments, partial-write risk remains.

5. Order deletion path is split across multiple operations:
   - `order_items` delete then `orders` delete as separate calls.
   - Mid-flow failures can leave inconsistent state.

6. Environment guardrails are minimal:
   - Supabase client creation does not validate required env vars before initialization.

7. Automated testing coverage is not evident at repository root:
   - Root `test` script is a placeholder.
