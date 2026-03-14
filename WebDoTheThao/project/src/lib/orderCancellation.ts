export type CancelReason =
  | 'change_mind'
  | 'change_product'
  | 'update_address'
  | 'delivery_delay'
  | 'other';

export const CANCEL_REASON_OPTIONS: Array<{ value: CancelReason; label: string }> = [
  { value: 'change_mind', label: 'Tôi không còn nhu cầu mua nữa' },
  { value: 'change_product', label: 'Tôi muốn thay đổi sản phẩm (kích thước/màu/số lượng)' },
  { value: 'update_address', label: 'Tôi muốn cập nhật địa chỉ/SĐT nhận hàng' },
  { value: 'delivery_delay', label: 'Thời gian giao hàng lâu' },
  { value: 'other', label: 'Lý do khác' },
];

const CANCELLABLE_STATUSES = new Set(['pending', 'confirmed']);
const STATUS_ALIASES: Record<string, string> = {
  'chờ xác nhận': 'pending',
  'cho xac nhan': 'pending',
  'đã xác nhận': 'confirmed',
  'da xac nhan': 'confirmed',
};

function normalizeOrderStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return STATUS_ALIASES[normalized] ?? normalized;
}

export function isStatusCancellable(status: string) {
  return CANCELLABLE_STATUSES.has(normalizeOrderStatus(status));
}

export function normalizeCancelDetail(detail: string) {
  const normalized = detail.trim();
  return normalized.length > 0 ? normalized : null;
}

export function isReasonValid(reason: string, detail: string) {
  const isKnownReason = CANCEL_REASON_OPTIONS.some(item => item.value === reason);
  if (!isKnownReason) return false;
  if (reason !== 'other') return true;
  return normalizeCancelDetail(detail) != null;
}

export function isCodOrder(paymentMethod: string | undefined | null, shippingAddress: string) {
  if (paymentMethod != null) {
    return paymentMethod === 'cod';
  }
  return shippingAddress.includes('(COD)');
}
