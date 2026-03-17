# Checkout Atomicity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make checkout writes atomic so an order header and its order items are either both persisted or both rolled back.

**Architecture:** Move order creation for Supabase-auth users from two client-side inserts to one PostgreSQL transaction inside an RPC function. The frontend calls a typed checkout service that sends shipping and item payload in one request. Keep Google-provider fallback unchanged for now.

**Tech Stack:** React, TypeScript, Supabase JS, PostgreSQL migration SQL, Vitest, ESLint

---

### Task 1: Add test harness for checkout service

**Files:**
- Modify: `WebDoTheThao/project/package.json`
- Modify: `WebDoTheThao/project/eslint.config.js`
- Create: `WebDoTheThao/project/src/lib/checkoutOrder.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createSupabaseCheckoutOrder } from './checkoutOrder';

describe('createSupabaseCheckoutOrder', () => {
  it('throws when rpc returns an error', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'db failed' } });
    await expect(
      createSupabaseCheckoutOrder(
        { rpc } as never,
        {
          userId: 'u1',
          shippingAddress: 'A - 0123 - HCM',
          total: 100000,
          items: [{ product_id: 'p1', quantity: 1, price: 100000, shoe_size: 40 }],
        },
      ),
    ).rejects.toThrow('Không thể tạo đơn hàng.');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd WebDoTheThao/project && npm run test -- src/lib/checkoutOrder.test.ts`

Expected: FAIL because `vitest` script and `checkoutOrder` module do not exist yet.

**Step 3: Write minimal implementation support**

- Add dev dependency `vitest`.
- Add script `"test": "vitest run"` to `WebDoTheThao/project/package.json`.
- Update `eslint.config.js` test override so test files include Vitest globals:

```js
{
  files: ['**/*.test.{ts,tsx}'],
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.node,
      ...globals.vitest,
    },
  },
}
```

**Step 4: Run test to verify it passes toolchain setup stage**

Run: `cd WebDoTheThao/project && npm run test -- src/lib/checkoutOrder.test.ts`

Expected: FAIL now references missing exported function from `checkoutOrder.ts` (good next-step failure).

**Step 5: Commit**

```bash
git add WebDoTheThao/project/package.json WebDoTheThao/project/eslint.config.js WebDoTheThao/project/src/lib/checkoutOrder.test.ts
git commit -m "test: add checkout service test harness"
```

### Task 2: Implement transactional DB function (RPC)

**Files:**
- Create: `WebDoTheThao/project/supabase/migrations/20260314120000_create_checkout_order_rpc.sql`
- Test: `WebDoTheThao/project/supabase/migrations/20260314120000_create_checkout_order_rpc.sql` (manual SQL verification block)

**Step 1: Write the failing test**

Add a SQL verification block comment at end of migration with expected behavior:

```sql
-- Verification (run manually in SQL editor):
-- 1) Call public.create_checkout_order_atomic with one valid and one invalid item.
-- 2) Expect: function raises exception and no orders row is persisted.
```

**Step 2: Run test to verify it fails**

Run (Supabase SQL editor): call function before creation.

Expected: ERROR `function public.create_checkout_order_atomic(...) does not exist`.

**Step 3: Write minimal implementation**

Create migration with:

- function `public.create_checkout_order_atomic(...) returns uuid`
- inserts one row into `orders`
- inserts all rows into `order_items` using JSONB payload
- validates non-empty items and positive total
- wraps both inserts in one PL/pgSQL function execution
- grants execute to `authenticated`

Use `security invoker` so RLS policies still apply to caller identity.

**Step 4: Run test to verify it passes**

Run (Supabase SQL editor):
- valid payload call -> returns order id, both tables contain rows.
- invalid payload call (bad product id) -> error and no orphan order row.

Expected: PASS for both behaviors.

**Step 5: Commit**

```bash
git add WebDoTheThao/project/supabase/migrations/20260314120000_create_checkout_order_rpc.sql
git commit -m "feat: add transactional checkout RPC"
```

### Task 3: Add checkout service and make unit tests pass

**Files:**
- Create: `WebDoTheThao/project/src/lib/checkoutOrder.ts`
- Modify: `WebDoTheThao/project/src/lib/checkoutOrder.test.ts`

**Step 1: Write the failing test**

Extend tests:

```ts
it('calls rpc with normalized payload and returns order id', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: 'order-1', error: null });
  const result = await createSupabaseCheckoutOrder(
    { rpc } as never,
    {
      userId: 'u1',
      shippingAddress: 'A - 0123 - HCM',
      total: 100000,
      items: [{ product_id: 'p1', quantity: 1, price: 100000, shoe_size: null }],
    },
  );
  expect(result).toBe('order-1');
  expect(rpc).toHaveBeenCalledWith('create_checkout_order_atomic', expect.any(Object));
});
```

**Step 2: Run test to verify it fails**

Run: `cd WebDoTheThao/project && npm run test -- src/lib/checkoutOrder.test.ts`

Expected: FAIL because function behavior is not implemented.

**Step 3: Write minimal implementation**

Implement `createSupabaseCheckoutOrder`:

```ts
export async function createSupabaseCheckoutOrder(
  client: Pick<typeof supabase, 'rpc'>,
  input: CreateCheckoutOrderInput,
): Promise<string> {
  const { data, error } = await client.rpc('create_checkout_order_atomic', {
    p_user_id: input.userId,
    p_total: input.total,
    p_shipping_address: input.shippingAddress,
    p_status: 'pending',
    p_items: input.items,
  });
  if (error || !data) throw new Error('Không thể tạo đơn hàng.');
  return data;
}
```

**Step 4: Run test to verify it passes**

Run: `cd WebDoTheThao/project && npm run test -- src/lib/checkoutOrder.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add WebDoTheThao/project/src/lib/checkoutOrder.ts WebDoTheThao/project/src/lib/checkoutOrder.test.ts
git commit -m "feat: add checkout RPC client service"
```

### Task 4: Refactor checkout flow to use atomic service

**Files:**
- Modify: `WebDoTheThao/project/src/pages/CheckoutPage.tsx`
- Test: `WebDoTheThao/project/src/lib/checkoutOrder.test.ts`

**Step 1: Write the failing test**

Add/adjust service test to assert the page-facing error contract:

```ts
it('uses Vietnamese fallback message when rpc fails', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'x' } });
  await expect(
    createSupabaseCheckoutOrder(
      { rpc } as never,
      {
        userId: 'u1',
        shippingAddress: 'A - 0123 - HCM',
        total: 100000,
        items: [{ product_id: 'p1', quantity: 1, price: 100000, shoe_size: 40 }],
      },
    ),
  ).rejects.toThrow('Không thể tạo đơn hàng.');
});
```

**Step 2: Run test to verify it fails**

Run: `cd WebDoTheThao/project && npm run test -- src/lib/checkoutOrder.test.ts`

Expected: FAIL if error mapping/contract diverges.

**Step 3: Write minimal implementation**

- In `CheckoutPage.tsx`, replace:
  - `orders.insert(...)` then `order_items.insert(...)`
- With:
  - one call to `createSupabaseCheckoutOrder(...)`.
- Keep Google-provider branch unchanged.
- Keep post-success behavior unchanged (`clearCart`, `clearCheckoutDraft`, navigate dashboard).

**Step 4: Run verification**

Run:

- `cd WebDoTheThao/project && npm run test -- src/lib/checkoutOrder.test.ts`
- `cd WebDoTheThao/project && npm run typecheck`
- `cd WebDoTheThao/project && npm run lint`

Expected:
- test: PASS
- typecheck: exits 0
- lint: exits 0 (or only pre-existing warnings unrelated to touched files)

**Step 5: Commit**

```bash
git add WebDoTheThao/project/src/pages/CheckoutPage.tsx WebDoTheThao/project/src/lib/checkoutOrder.test.ts
git commit -m "refactor: make checkout order creation atomic"
```

### Task 5: Add rollout notes and operator verification checklist

**Files:**
- Modify: `docs/specs/2026-03-14-current-state-spec.md`
- Create: `docs/specs/checkout-atomicity-verification.md`

**Step 1: Write the failing test**

Create checklist first with explicit expected results; treat unchecked items as failing acceptance.

**Step 2: Run test to verify it fails**

Manual status before rollout:
- checklist not yet validated in staging.

Expected: FAIL/NOT VERIFIED.

**Step 3: Write minimal implementation**

Document:
- new RPC name and payload contract
- migration dependency
- manual validation script (success + failure rollback scenario)

**Step 4: Run test to verify it passes**

Run manual checklist end-to-end in local/staging.

Expected: all checklist items marked PASS.

**Step 5: Commit**

```bash
git add docs/specs/2026-03-14-current-state-spec.md docs/specs/checkout-atomicity-verification.md
git commit -m "docs: add checkout atomicity rollout checklist"
```

## Notes for execution

- Use @superpowers:test-driven-development before each implementation task.
- Use @superpowers:verification-before-completion before claiming success.
- Keep changes additive and avoid modifying old migrations.
- Do not touch Google local fallback behavior in this plan (strict YAGNI).
