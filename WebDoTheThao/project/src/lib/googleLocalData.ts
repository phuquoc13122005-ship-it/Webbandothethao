import type { AuthUser } from '../contexts/AuthContext';
import type { Order, Profile } from '../types';

function getGoogleProfileKey(userId: string) {
  return `google_profile_${userId}`;
}

function getGoogleOrdersKey(userId: string) {
  return `google_orders_${userId}`;
}

function canUseStorage() {
  return typeof window !== 'undefined';
}

export function getGoogleProfile(user: AuthUser): Profile {
  const fallback: Profile = {
    id: user.id,
    full_name: user.fullName || '',
    phone: '',
    address: '',
    avatar_url: user.avatarUrl || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!canUseStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(getGoogleProfileKey(user.id));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      ...fallback,
      ...parsed,
      id: user.id,
      full_name: parsed.full_name ?? fallback.full_name,
      avatar_url: user.avatarUrl || parsed.avatar_url || '',
    };
  } catch {
    return fallback;
  }
}

export function saveGoogleProfile(user: AuthUser, profileInput: Pick<Profile, 'full_name' | 'phone' | 'address'>): Profile {
  const now = new Date().toISOString();
  const current = getGoogleProfile(user);
  const nextProfile: Profile = {
    ...current,
    id: user.id,
    full_name: profileInput.full_name,
    phone: profileInput.phone,
    address: profileInput.address,
    avatar_url: user.avatarUrl || current.avatar_url || '',
    updated_at: now,
  };

  if (canUseStorage()) {
    window.localStorage.setItem(getGoogleProfileKey(user.id), JSON.stringify(nextProfile));
  }

  return nextProfile;
}

export function getGoogleOrders(userId: string): Order[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(getGoogleOrdersKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Order[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function prependGoogleOrder(userId: string, order: Order) {
  const currentOrders = getGoogleOrders(userId);
  const nextOrders = [order, ...currentOrders];

  if (canUseStorage()) {
    window.localStorage.setItem(getGoogleOrdersKey(userId), JSON.stringify(nextOrders));
  }
}

export function removeGoogleOrder(userId: string, orderId: string) {
  const currentOrders = getGoogleOrders(userId);
  const nextOrders = currentOrders.filter(order => order.id !== orderId);

  if (canUseStorage()) {
    window.localStorage.setItem(getGoogleOrdersKey(userId), JSON.stringify(nextOrders));
  }
}

export function cancelGoogleOrder(
  userId: string,
  orderId: string,
  reason: string,
  reasonDetail: string | null,
) {
  const currentOrders = getGoogleOrders(userId);
  const cancelledAt = new Date().toISOString();
  const nextOrders = currentOrders.map(order =>
    order.id === orderId
      ? {
          ...order,
          status: 'cancelled' as const,
          cancel_reason: reason,
          cancel_reason_detail: reasonDetail,
          cancelled_at: cancelledAt,
        }
      : order,
  );

  if (canUseStorage()) {
    window.localStorage.setItem(getGoogleOrdersKey(userId), JSON.stringify(nextOrders));
  }

  return nextOrders;
}
