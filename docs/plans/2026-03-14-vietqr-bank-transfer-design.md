# VietQR Bank Transfer with Countdown Design

Date: 2026-03-14
Status: Approved design (brainstorm output)
Scope: Checkout payment UX and payment state flow for bank transfer

## Objective

When a user selects `Chuyển khoản` in checkout, the system should show a dynamic VietQR code, enforce a payment time window, and support both manual confirmation and future webhook reconciliation.

## Product decisions

- Payment UX model: **Option C**
  - dynamic QR per order
  - countdown expiration
  - dual confirmation model (user action + webhook ready path)
- QR provider/format: **VietQR (Napas 247)**
- Webhook readiness: unknown for now, so implementation is phased to avoid blocking release.

## Architecture

The checkout flow is split by payment method:

- `cod`: keep current path unchanged.
- `bank_transfer`: create order in unpaid transfer state, render dynamic VietQR, start countdown, and allow user submission of payment intent.

The system is delivered in two phases:

1. Phase 1 (ship now)
   - full QR UI/UX with manual confirmation (`Tôi đã chuyển khoản`)
   - admin/manual reconciliation remains possible.

2. Phase 2 (upgrade)
   - backend webhook reconciles actual transactions and finalizes payment automatically.

## Components and responsibilities

- `CheckoutPage` (existing, extend)
  - toggle/render transfer panel when `paymentMethod === 'bank_transfer'`
  - orchestrate order creation and payment state updates.

- `BankTransferPanel` (new UI component)
  - show QR image and transfer metadata:
    - bank code/name
    - account number/name
    - amount
    - transfer reference
  - display countdown and expiration state
  - support action button `Tôi đã chuyển khoản`.

- `paymentQr` utility/service module (new)
  - generate transfer reference from order context
  - build VietQR URL from config and runtime values.

- backend webhook endpoint (phase 2)
  - receive bank/gateway callbacks
  - validate amount + reference
  - update payment status idempotently.

## Data model changes

Add payment metadata to `orders`:

- `payment_method` (`cod` | `bank_transfer`)
- `payment_status` (`unpaid` | `pending_confirmation` | `paid` | `expired` | `failed`)
- `payment_reference` (unique transfer memo, e.g. `DH-<orderId>`)
- `payment_qr_expires_at` (timestamp)
- `payment_submitted_at` (timestamp)
- `paid_at` (timestamp)
- `payment_transaction_ref` (webhook transaction id, phase 2)

## Payment state machine

### COD path

- starts and remains on normal order lifecycle as today.

### Bank transfer path

- order created -> `payment_status = unpaid`
- user reports transfer -> `payment_status = pending_confirmation`
- successful webhook/manual reconciliation -> `payment_status = paid`
- timeout without payment -> `payment_status = expired`
- mismatch/failure case -> `payment_status = failed` (or manual review branch)

## Timeout rules

- Default QR validity: 15 minutes.
- During final 2 minutes, UI should show warning style.
- After expiration:
  - disable transfer confirmation for that QR session
  - allow generating a fresh QR session (or restart checkout flow).
- If already `paid`, all QR regeneration and submit actions must be locked.

## Error handling

- Do not render payment QR before order creation succeeds.
- If QR rendering fails:
  - keep order in unpaid state
  - allow user to reload QR.
- If user confirmation request fails:
  - do not update UI optimistically
  - show retryable error.
- If webhook arrives after expiration:
  - route to manual reconciliation policy (do not auto-finalize blindly).

## UX states

- loading QR
- QR ready with active countdown
- near expiration warning
- expired
- pending confirmation (user clicked confirmation)
- paid
- failed/retry

## Verification strategy

### Unit

- VietQR URL builder correctness (amount, addInfo, account info)
- countdown transition behavior
- state guards (e.g. paid cannot reconfirm)

### Integration

- select bank transfer -> order created -> QR shown
- click confirmation -> payment status updated to pending confirmation
- expiration disables actions and offers regenerate path

### Webhook (phase 2)

- valid callback updates to paid
- invalid amount/reference does not mark paid
- duplicate callback remains idempotent

## Non-goals (for this design scope)

- Full banking reconciliation engine details
- Multi-gateway abstraction
- Refund/dispute workflows

## Rollout plan (high level)

1. Deliver phase 1 UI + order/payment metadata + manual confirmation.
2. Run pilot with manual reconciliation.
3. Add webhook integration and transition to automatic reconciliation.
