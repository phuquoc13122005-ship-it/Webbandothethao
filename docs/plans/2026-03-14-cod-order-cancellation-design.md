# COD Order Cancellation with Reason Design

Date: 2026-03-14
Status: Approved design (brainstorm output)
Scope: Replace delete order flow with COD cancellation flow requiring reason selection and confirmation

## Objective

In Dashboard order list:

- change action label from `Xóa` to `Hủy đơn hàng`
- require reason selection before cancellation
- for `Khác`, require additional detail text
- only cancel when user confirms with button `Xác nhận hủy đơn hàng`
- apply this flow only for COD orders in this phase
- bank transfer cancellation flow will be developed later

## Product decisions

- Reason mode: fixed reason list + `Khác` with free text
- Data handling: do not delete rows, update order status to `cancelled`
- Keep cancelled orders visible in history
- Scope guard: COD-only cancellation behavior in this iteration

## Architecture

Current behavior deletes order rows directly (`order_items` then `orders`).  
New behavior updates order metadata and status in `orders`, preserving order history and supporting reason traceability.

Flow summary:

1. User clicks `Hủy đơn hàng`
2. Modal opens with reason choices
3. User chooses reason; `Khác` requires detail
4. User clicks `Xác nhận hủy đơn hàng`
5. Frontend validates eligibility and input
6. System updates order:
   - `status = cancelled`
   - `cancel_reason`
   - `cancel_reason_detail`
   - `cancelled_at`

## Components and responsibilities

- `DashboardPage` (extend)
  - rename CTA from delete to cancel
  - maintain modal state:
    - selected order
    - selected reason
    - reason detail
    - loading/error state
  - call cancellation update and patch local UI state

- `CancelOrderModal` (new, or extracted block)
  - displays order summary
  - displays reason radio list
  - displays detail textarea when `other` selected
  - validates reason before allowing confirm

- reason constants (new helper)
  - one source of truth for reason keys/labels
  - avoids duplicated text and branching logic

## Data model changes

Add nullable cancellation metadata to `orders`:

- `cancel_reason text`
- `cancel_reason_detail text`
- `cancelled_at timestamptz`

No new table in this phase (YAGNI).

## Validation and eligibility rules

### Eligible orders

- `payment_method = cod` (phase scope)
- status in cancellable set: `pending`, `confirmed`

### Ineligible orders

- `shipping`, `delivered`, `cancelled`
- non-COD orders (`bank_transfer`) in this phase

### Input validation

- `cancel_reason` required
- if `cancel_reason = other`, `cancel_reason_detail` required (minimum non-empty text)

## Reason catalog (initial)

- `change_mind` - Tôi không còn nhu cầu mua nữa
- `change_product` - Tôi muốn thay đổi sản phẩm (kích thước/màu/số lượng)
- `update_address` - Tôi muốn cập nhật địa chỉ/SĐT nhận hàng
- `delivery_delay` - Thời gian giao hàng lâu
- `other` - Lý do khác

## UX details

- replace button text: `Xóa` -> `Hủy đơn hàng`
- modal title: `Yêu cầu hủy đơn`
- modal primary button: `Xác nhận hủy đơn hàng`
- modal must keep entered values if submission fails
- on success:
  - close modal
  - show updated badge `Đã hủy`
  - hide cancellation action for that order
  - optionally display cancellation reason in order details

## Error handling

- if update fails, keep modal open and show retryable error
- if order no longer eligible (race condition), show message and refresh list
- never partially apply local UI state before successful DB update

## Security and RLS alignment

- update query must target user-owned row only
- include status guard in update filter to reduce race-condition updates
- enforce with existing row-level ownership policies

## Test strategy

### Unit/UI logic

- selecting reason enables confirm flow
- selecting `other` without detail blocks confirmation
- selecting non-cancellable order hides/disables cancellation

### Integration

- COD pending order cancels successfully and persists reason metadata
- COD shipping order cannot be cancelled
- bank transfer order cannot be cancelled in this phase

### Regression

- dashboard load/profile/signout flows remain intact
- order list and status badges continue to render correctly

## Non-goals

- bank transfer cancellation/refund behavior
- separate cancellation audit table
- admin-side cancellation workflows
