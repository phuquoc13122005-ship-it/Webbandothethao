# COD Order Cancellation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Dashboard hard-delete action with COD-only cancel flow that requires reason selection and explicit cancellation confirmation.

**Architecture:** Add order cancellation metadata columns via Supabase migration, then implement a modal-driven cancellation UX in Dashboard that updates order status to `cancelled` instead of deleting rows. Keep bank transfer cancellation out of scope and reject non-COD cancellations at UI/data layer.

**Tech Stack:** React, TypeScript, Supabase JS, PostgreSQL migration SQL, Vitest, ESLint

---

### Task 1: Extend order schema for cancellation metadata

**Files:**
- Create: `WebDoTheThao/project/supabase/migrations/20260314180000_add_order_cancellation_fields.sql`
- Modify: `WebDoTheThao/project/src/types/index.ts`

**Step 1: Write the failing test**

Add a type-level usage in Dashboard (temporary) expecting `cancel_reason` and `cancelled_at` to exist on `Order`.

**Step 2: Run test to verify it fails**

Run: `cd WebDoTheThao/project && npm run typecheck`  
Expected: FAIL due missing fields on `Order`.

**Step 3: Write minimal implementation**

- Add migration columns:
  - `cancel_reason text`
  - `cancel_reason_detail text`
  - `cancelled_at timestamptz`
- Update `Order` interface with optional fields:
  - `payment_method?: 'cod' | 'bank_transfer'`
  - `cancel_reason?: string | null`
  - `cancel_reason_detail?: string | null`
  - `cancelled_at?: string | null`

**Step 4: Run test to verify it passes**

Run: `cd WebDoTheThao/project && npm run typecheck`  
Expected: PASS.

**Step 5: Commit**

```bash
git add WebDoTheThao/project/supabase/migrations/20260314180000_add_order_cancellation_fields.sql WebDoTheThao/project/src/types/index.ts
git commit -m "feat: add order cancellation metadata fields"
```

### Task 2: Add cancellation reason model and validation helpers

**Files:**
- Create: `WebDoTheThao/project/src/lib/orderCancellation.ts`
- Create: `WebDoTheThao/project/src/lib/orderCancellation.test.ts`

**Step 1: Write the failing test**

Add tests for:
- reason list contains `other`
- `other` requires non-empty detail
- COD-only guard returns false for non-COD
- status guard only allows `pending` and `confirmed`

**Step 2: Run test to verify it fails**

Run: `cd WebDoTheThao/project && npm run test -- src/lib/orderCancellation.test.ts`  
Expected: FAIL because helper module does not exist yet.

**Step 3: Write minimal implementation**

Implement:
- `ORDER_CANCEL_REASONS`
- `isCancellationReasonValid(reason, detail)`
- `isOrderCancellable(order)`
- `normalizeCancelDetail(detail)`

**Step 4: Run test to verify it passes**

Run: `cd WebDoTheThao/project && npm run test -- src/lib/orderCancellation.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add WebDoTheThao/project/src/lib/orderCancellation.ts WebDoTheThao/project/src/lib/orderCancellation.test.ts
git commit -m "feat: add COD cancellation reason rules"
```

### Task 3: Implement cancellation modal UI and action rename

**Files:**
- Modify: `WebDoTheThao/project/src/pages/DashboardPage.tsx`

**Step 1: Write the failing test**

Add UI assertions (or minimal behavior test if no React testing setup) by creating a local state-driven check:
- button text changes from `Xóa` to `Hủy đơn hàng`
- confirm modal requires reason selection before submit

**Step 2: Run test to verify it fails**

Run: `cd WebDoTheThao/project && npm run typecheck`  
Expected: FAIL after introducing modal state placeholders without handlers.

**Step 3: Write minimal implementation**

In `DashboardPage`:
- rename action button label to `Hủy đơn hàng`
- add modal state:
  - selected order
  - selected reason
  - reason detail
  - loading/error states
- render modal with:
  - radio reasons
  - textarea for `other`
  - button `Xác nhận hủy đơn hàng`

**Step 4: Run test to verify it passes**

Run:
- `cd WebDoTheThao/project && npm run typecheck`
- `cd WebDoTheThao/project && npm run test -- src/lib/orderCancellation.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add WebDoTheThao/project/src/pages/DashboardPage.tsx
git commit -m "feat: add cancel-order modal with reason selection"
```

### Task 4: Replace hard-delete with status-based cancellation update

**Files:**
- Modify: `WebDoTheThao/project/src/pages/DashboardPage.tsx`

**Step 1: Write the failing test**

Create failure scenario by asserting cancellation path calls `update` on `orders` instead of deleting `order_items`/`orders`.

**Step 2: Run test to verify it fails**

Run: `cd WebDoTheThao/project && npm run typecheck`  
Expected: FAIL or behavior mismatch until old delete logic removed.

**Step 3: Write minimal implementation**

- Remove hard-delete logic from `handleDeleteOrder`
- Introduce `handleCancelOrder` update:
  - `status = 'cancelled'`
  - `cancel_reason`
  - `cancel_reason_detail`
  - `cancelled_at`
- Apply guard:
  - COD-only
  - status in `pending/confirmed`

**Step 4: Run test to verify it passes**

Run:
- `cd WebDoTheThao/project && npm run typecheck`
- `cd WebDoTheThao/project && npm run test -- src/lib/orderCancellation.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add WebDoTheThao/project/src/pages/DashboardPage.tsx
git commit -m "refactor: cancel COD orders by status update"
```

### Task 5: Surface cancellation reason in order history and polish UX

**Files:**
- Modify: `WebDoTheThao/project/src/pages/DashboardPage.tsx`

**Step 1: Write the failing test**

Add assertion that cancelled orders show reason text and hide cancel button.

**Step 2: Run test to verify it fails**

Run: `cd WebDoTheThao/project && npm run typecheck`  
Expected: FAIL until UI references new fields correctly.

**Step 3: Write minimal implementation**

- Show reason block in cancelled order item card
- hide/disable cancel action for cancelled or non-cancellable statuses
- display retryable error text in modal on failure

**Step 4: Run test to verify it passes**

Run:
- `cd WebDoTheThao/project && npm run typecheck`
- `cd WebDoTheThao/project && npm run test -- src/lib/orderCancellation.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add WebDoTheThao/project/src/pages/DashboardPage.tsx
git commit -m "feat: show cancellation reason in order history"
```

### Task 6: Final verification and docs update

**Files:**
- Modify: `docs/specs/2026-03-14-current-state-spec.md`
- Create: `docs/specs/cod-cancellation-verification.md`

**Step 1: Write the failing test**

Draft verification checklist and mark pending items as incomplete initially.

**Step 2: Run test to verify it fails**

Manual checklist status: incomplete.

**Step 3: Write minimal implementation**

Document:
- COD-only scope
- new order fields
- manual QA steps (reason selection + other detail + status guards)

**Step 4: Run verification**

Run:
- `cd WebDoTheThao/project && npm run test -- src/lib/orderCancellation.test.ts src/lib/vietQr.test.ts src/lib/checkoutOrder.test.ts`
- `cd WebDoTheThao/project && npm run typecheck`
- `cd WebDoTheThao/project && npm run lint`

Expected:
- tests PASS
- typecheck PASS
- lint may still show known repo-wide toolchain issue; confirm no new file-specific lint problems.

**Step 5: Commit**

```bash
git add docs/specs/2026-03-14-current-state-spec.md docs/specs/cod-cancellation-verification.md
git commit -m "docs: add COD cancellation verification checklist"
```

## Notes

- Keep bank transfer cancellation explicitly unimplemented.
- Do not delete orders in this feature.
- Use `@superpowers:test-driven-development` while implementing each task.
- Use `@superpowers:verification-before-completion` before claiming success.
