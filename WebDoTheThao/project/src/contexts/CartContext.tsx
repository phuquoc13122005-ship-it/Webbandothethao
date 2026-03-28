import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { db } from '../lib/db';
import { useAuth } from './AuthContext';
import type { CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  itemCount: number;
  total: number;
  addToCart: (productId: string, quantity?: number, shoeSize?: number | null) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  updateItemSize: (itemId: string, shoeSize: number | null) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface LocalCartRecord {
  product_id: string;
  shoe_size?: number | null;
  quantity: number;
}

function getLocalCartKey(userId: string) {
  return `cart_google_${userId}`;
}

function readLocalCart(userId: string): LocalCartRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getLocalCartKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalCartRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => {
      const hasValidSize =
        item?.shoe_size == null || (Number.isFinite(item.shoe_size) && item.shoe_size >= 36 && item.shoe_size <= 45);
      return item?.product_id && Number.isFinite(item?.quantity) && item.quantity > 0 && hasValidSize;
    });
  } catch {
    return [];
  }
}

function writeLocalCart(userId: string, items: LocalCartRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getLocalCartKey(userId), JSON.stringify(items));
}

function buildLocalItemId(productId: string, shoeSize: number | null | undefined) {
  return `local::${productId}::${shoeSize ?? 'nosize'}`;
}

function parseLocalItemId(itemId: string) {
  const [, productId, sizeValue] = itemId.split('::');
  if (!productId) return { productId: '', shoeSize: null as number | null };
  if (!sizeValue || sizeValue === 'nosize') return { productId, shoeSize: null as number | null };
  return { productId, shoeSize: Number(sizeValue) };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async (silent = false) => {
    if (!user) {
      setItems([]);
      return;
    }

    if (user.provider === 'google') {
      if (!silent) setLoading(true);
      const localItems = readLocalCart(user.id);
      if (localItems.length === 0) {
        setItems([]);
        if (!silent) setLoading(false);
        return;
      }

      const productIds = localItems.map(item => item.product_id);
      const { data: products } = await db
        .from('products')
        .select('*')
        .in('id', productIds);

      const productMap = new Map((products || []).map((product: any) => [product.id, product]));
      const mappedItems = localItems.flatMap(item => {
        const product = productMap.get(item.product_id);
        if (!product) return [];
        return [{
          id: buildLocalItemId(item.product_id, item.shoe_size ?? null),
          user_id: user.id,
          product_id: item.product_id,
          shoe_size: item.shoe_size ?? null,
          quantity: item.quantity,
          created_at: new Date().toISOString(),
          products: product,
        }];
      }) as CartItem[];

      setItems(mappedItems);
      if (!silent) setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    const { data } = await db
      .from('cart_items')
      .select('*, products(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setItems(data || []);
    if (!silent) setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId: string, quantity = 1, shoeSize: number | null = null) => {
    if (!user) return;
    if (user.provider === 'google') {
      const localItems = readLocalCart(user.id);
      const existing = localItems.find(item => item.product_id === productId && (item.shoe_size ?? null) === shoeSize);
      const nextItems = existing
        ? localItems.map(item =>
            item.product_id === productId && (item.shoe_size ?? null) === shoeSize
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          )
        : [...localItems, { product_id: productId, shoe_size: shoeSize, quantity }];
      writeLocalCart(user.id, nextItems);
      await fetchCart(true);
      return;
    }

    const previousItems = items;
    const existing = items.find(item => item.product_id === productId && (item.shoe_size ?? null) === shoeSize);
    if (existing) {
      setItems(prev =>
        prev.map(item =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        ),
      );
    } else {
      const tempId = `temp-${productId}-${shoeSize ?? 'nosize'}-${Date.now()}`;
      setItems(prev => ([
        {
          id: tempId,
          user_id: user.id,
          product_id: productId,
          shoe_size: shoeSize,
          quantity,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]));

      const { data: inserted, error } = await db
        .from('cart_items')
        .insert({ user_id: user.id, product_id: productId, shoe_size: shoeSize, quantity })
        .select('*, products(*)')
        .maybeSingle();

      if (error || !inserted) {
        setItems(previousItems);
        await fetchCart(true);
        return;
      }

      setItems(prev => prev.map(item => (item.id === tempId ? inserted : item)));
      return;
    }

    const { error } = await db
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);

    if (error) {
      setItems(previousItems);
      await fetchCart(true);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    if (!user) return;
    if (user.provider === 'google') {
      const { productId, shoeSize } = parseLocalItemId(itemId);
      const localItems = readLocalCart(user.id).map(item =>
        item.product_id === productId && (item.shoe_size ?? null) === shoeSize ? { ...item, quantity } : item,
      );
      writeLocalCart(user.id, localItems);
      setItems(prev => prev.map(item => (item.id === itemId ? { ...item, quantity } : item)));
      return;
    }

    const previousItems = items;
    setItems(prev => prev.map(item => (item.id === itemId ? { ...item, quantity } : item)));

    const { error } = await db.from('cart_items').update({ quantity }).eq('id', itemId);
    if (error) {
      setItems(previousItems);
      await fetchCart(true);
    }
  };

  const updateItemSize = async (itemId: string, shoeSize: number | null) => {
    if (!user) return;
    if (user.provider === 'google') {
      const { productId, shoeSize: currentSize } = parseLocalItemId(itemId);
      const localItems = readLocalCart(user.id).map(item =>
        item.product_id === productId && (item.shoe_size ?? null) === currentSize
          ? { ...item, shoe_size: shoeSize }
          : item,
      );
      writeLocalCart(user.id, localItems);
      setItems(prev =>
        prev.map(item =>
          item.id === itemId
            ? {
                ...item,
                id: buildLocalItemId(item.product_id, shoeSize),
                shoe_size: shoeSize,
              }
            : item,
        ),
      );
      return;
    }

    const previousItems = items;
    setItems(prev => prev.map(item => (item.id === itemId ? { ...item, shoe_size: shoeSize } : item)));

    const { error } = await db.from('cart_items').update({ shoe_size: shoeSize }).eq('id', itemId);
    if (error) {
      setItems(previousItems);
      await fetchCart(true);
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (!user) return;
    if (user.provider === 'google') {
      const { productId, shoeSize } = parseLocalItemId(itemId);
      const localItems = readLocalCart(user.id).filter(
        item => !(item.product_id === productId && (item.shoe_size ?? null) === shoeSize),
      );
      writeLocalCart(user.id, localItems);
      setItems(prev => prev.filter(item => item.id !== itemId));
      return;
    }

    const previousItems = items;
    setItems(prev => prev.filter(item => item.id !== itemId));

    const { error } = await db.from('cart_items').delete().eq('id', itemId);
    if (error) {
      setItems(previousItems);
      await fetchCart(true);
    }
  };

  const clearCart = async () => {
    if (!user) return;
    if (user.provider === 'google') {
      writeLocalCart(user.id, []);
      setItems([]);
      return;
    }

    await db.from('cart_items').delete().eq('user_id', user.id);
    setItems([]);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => {
    const price = item.products?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{
      items, loading, itemCount, total,
      addToCart, updateQuantity, updateItemSize, removeFromCart, clearCart, refreshCart: fetchCart
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
