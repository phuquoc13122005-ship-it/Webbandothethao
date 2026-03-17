import { describe, expect, it } from 'vitest';
import {
  CANCEL_REASON_OPTIONS,
  isCodOrder,
  isReasonValid,
  isStatusCancellable,
  normalizeCancelDetail,
} from './orderCancellation';

describe('order cancellation rules', () => {
  it('contains "other" reason option', () => {
    expect(CANCEL_REASON_OPTIONS.some((item: { value: string }) => item.value === 'other')).toBe(true);
  });

  it('accepts only cancellable statuses', () => {
    expect(isStatusCancellable('pending')).toBe(true);
    expect(isStatusCancellable('confirmed')).toBe(true);
    expect(isStatusCancellable('Chờ xác nhận')).toBe(true);
    expect(isStatusCancellable('Đã xác nhận')).toBe(true);
    expect(isStatusCancellable('shipping')).toBe(false);
    expect(isStatusCancellable('delivered')).toBe(false);
    expect(isStatusCancellable('cancelled')).toBe(false);
  });

  it('detects COD from payment_method or legacy shipping text', () => {
    expect(isCodOrder('cod', 'test')).toBe(true);
    expect(isCodOrder('COD', 'test')).toBe(true);
    expect(isCodOrder('cash_on_delivery', 'test')).toBe(true);
    expect(isCodOrder('bank_transfer', 'test')).toBe(false);
    expect(isCodOrder(undefined, 'abc COD xyz')).toBe(true);
    expect(isCodOrder(undefined, 'abc (COD) xyz')).toBe(true);
    expect(isCodOrder(undefined, 'abc thanh toan khi nhan hang xyz')).toBe(true);
    expect(isCodOrder(undefined, 'abc (Chuyển khoản) xyz')).toBe(false);
  });

  it('requires detail only for other reason', () => {
    expect(isReasonValid('change_mind', '')).toBe(true);
    expect(isReasonValid('other', '')).toBe(false);
    expect(isReasonValid('other', '  ly do   ')).toBe(true);
  });

  it('normalizes detail text', () => {
    expect(normalizeCancelDetail('  test reason  ')).toBe('test reason');
    expect(normalizeCancelDetail('    ')).toBe(null);
  });
});
