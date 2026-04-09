type CheckoutOrderItemInput = {
  product_id: string;
  quantity: number;
  price: number;
  shoe_size: number | null;
};

type CreateCheckoutOrderInput = {
  userId: string;
  total: number;
  subTotal?: number;
  promotionAssignmentId?: string | null;
  shippingAddress: string;
  items: CheckoutOrderItemInput[];
};

type RpcClient = {
  rpc: (fn: string, args: unknown) => unknown;
};

export async function createCheckoutOrder(
  client: RpcClient,
  input: CreateCheckoutOrderInput,
): Promise<string> {
  const payload = {
    p_user_id: input.userId,
    p_total: input.total,
    p_subtotal: input.subTotal ?? input.total,
    p_promotion_assignment_id: input.promotionAssignmentId || null,
    p_shipping_address: input.shippingAddress,
    p_status: 'pending',
    p_items: input.items,
  };
  const result = await Promise.resolve(client.rpc('create_checkout_order_atomic', payload)) as {
    data: string | null;
    error: { message: string } | null;
  };
  const { data, error } = result;

  if (error || !data) {
    throw new Error('Không thể tạo đơn hàng.');
  }

  return data;
}
