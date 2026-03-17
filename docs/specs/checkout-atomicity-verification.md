# Checkout Atomicity Verification Checklist

Date: 2026-03-14
Owner: Engineering
Scope: Validate transactional order creation via RPC `create_checkout_order_atomic`

## Preconditions

- Migration `20260314120000_create_checkout_order_rpc.sql` has been applied.
- Frontend includes `createSupabaseCheckoutOrder` service and `CheckoutPage` uses it for Supabase-auth users.
- Test account exists with at least one product in stock.

## Automated verification evidence

Run from `WebDoTheThao/project`:

1. `npm run test -- src/lib/checkoutOrder.test.ts`
   - Expected: 2/2 tests pass

2. `npm run typecheck`
   - Expected: exit code 0

3. `npm run lint`
   - Expected: exit code 0
   - Current known status: lint command currently fails with an existing ESLint runtime incompatibility in this repo (`@typescript-eslint/no-unused-expressions` loader error). This is pre-existing infrastructure debt and not specific to checkout atomicity logic.

## Manual runtime verification

### Scenario A: Happy path

1. Sign in as Supabase user.
2. Add product(s) with valid shoe size to cart.
3. Complete checkout with valid shipping data.
4. Confirm redirect to dashboard.
5. Verify:
   - one order row exists in `orders`
   - matching rows exist in `order_items`
   - cart is cleared
   - checkout draft is cleared

Pass criteria:
- All 4 checks succeed.

### Scenario B: Failure rollback behavior

Goal: prove no orphan `orders` row remains when item insert would fail.

Method:
1. Trigger RPC with a deliberately invalid `product_id` in one item.
2. Observe RPC error response.
3. Query latest orders for user after failed call.

Pass criteria:
- No new order row is persisted for failed attempt.

## SQL helper snippets (manual)

```sql
-- Check latest orders for current user
select id, user_id, total, shipping_address, status, created_at
from orders
where user_id = auth.uid()
order by created_at desc
limit 5;
```

```sql
-- Check order items for a specific order id
select id, order_id, product_id, shoe_size, quantity, price
from order_items
where order_id = '<order-id>';
```

## Sign-off

- [ ] Automated tests passed
- [ ] Typecheck passed
- [ ] Lint passed or tracked as unrelated blocker
- [ ] Happy path verified
- [ ] Rollback path verified
- [ ] Product owner acceptance
