import { describe, expect, it, vi } from 'vitest';
import { createSupabaseCheckoutOrder } from './checkoutOrder';

describe('createSupabaseCheckoutOrder', () => {
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
    expect(rpc).toHaveBeenCalledWith('create_checkout_order_atomic', {
      p_user_id: 'u1',
      p_total: 100000,
      p_shipping_address: 'A - 0123 - HCM',
      p_status: 'pending',
      p_items: [{ product_id: 'p1', quantity: 1, price: 100000, shoe_size: null }],
    });
  });

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
