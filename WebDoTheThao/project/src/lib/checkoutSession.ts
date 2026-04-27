import type { CartItem } from '../types';

export interface CheckoutDraftItem {
  id: string;
  product_id: string;
  quantity: number;
  shoe_size?: number | null;
  selected_size?: string | null;
  product_name: string;
  product_slug?: string;
  price: number;
  image_url?: string;
}

export function getCheckoutDraftKey(userId: string) {
  return `checkout_draft_${userId}`;
}

function canUseSessionStorage() {
  return typeof window !== 'undefined';
}

export function mapCartItemsToCheckoutDraft(items: CartItem[]): CheckoutDraftItem[] {
  return items.map(item => ({
    id: item.id,
    product_id: item.product_id,
    quantity: item.quantity,
    shoe_size: item.shoe_size ?? null,
    selected_size: String(item.selected_size || item.shoe_size || '').trim() || null,
    product_name: item.products?.name || 'Sản phẩm',
    product_slug: item.products?.slug,
    price: item.products?.price || 0,
    image_url: item.products?.image_url,
  }));
}

export function saveCheckoutDraft(userId: string, items: CheckoutDraftItem[]) {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(getCheckoutDraftKey(userId), JSON.stringify(items));
}

export function readCheckoutDraft(userId: string): CheckoutDraftItem[] {
  if (!canUseSessionStorage()) return [];
  try {
    const raw = window.sessionStorage.getItem(getCheckoutDraftKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CheckoutDraftItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => item.product_id && item.quantity > 0);
  } catch {
    return [];
  }
}

export function clearCheckoutDraft(userId: string) {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.removeItem(getCheckoutDraftKey(userId));
}
