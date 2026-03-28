import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { db } from '../lib/db';
import { formatPrice } from '../lib/formatters';
import { createCheckoutOrder } from '../lib/checkoutOrder';
import { buildVietQrImageUrl, formatCountdown, getDefaultQrExpiry } from '../lib/vietQr';
import { prependGoogleOrder } from '../lib/googleLocalData';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import {
  clearCheckoutDraft,
  mapCartItemsToCheckoutDraft,
  readCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutDraftItem,
} from '../lib/checkoutSession';

type PaymentMethod = 'cod' | 'bank_transfer';

interface ShippingForm {
  fullName: string;
  phone: string;
  address: string;
}

function createTransferReference(userId: string) {
  return `DH-${userId.slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-6)}`;
}

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, loading: cartLoading, clearCart } = useCart();
  const navigate = useNavigate();
  const [checkoutItems, setCheckoutItems] = useState<CheckoutDraftItem[]>([]);
  const [form, setForm] = useState<ShippingForm>({
    fullName: '',
    phone: '',
    address: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingForm, string>>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [submitting, setSubmitting] = useState(false);
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [paymentReference, setPaymentReference] = useState('');
  const [transferConfirmed, setTransferConfirmed] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    if (cartLoading) return;

    const draftItems = readCheckoutDraft(user.id);
    if (draftItems.length > 0) {
      setCheckoutItems(draftItems);
      return;
    }

    const fallbackItems = mapCartItemsToCheckoutDraft(items);
    if (fallbackItems.length === 0) {
      navigate('/cart');
      return;
    }

    saveCheckoutDraft(user.id, fallbackItems);
    setCheckoutItems(fallbackItems);
  }, [authLoading, user, cartLoading, items, navigate]);

  const total = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [checkoutItems],
  );
  const bankCode = import.meta.env.VITE_VIETQR_BANK_CODE || '';
  const accountNo = import.meta.env.VITE_VIETQR_ACCOUNT_NO || '';
  const accountName = import.meta.env.VITE_VIETQR_ACCOUNT_NAME || '';
  const hasVietQrConfig = Boolean(bankCode && accountNo);
  const remainingMs = qrExpiresAt == null ? 0 : Math.max(0, qrExpiresAt - nowMs);
  const isQrExpired = paymentMethod === 'bank_transfer' && qrExpiresAt != null && remainingMs <= 0;
  const submitDisabled = submitting || checkoutItems.length === 0;
  const fallbackAccountNo = '913122005';
  const fallbackBankCode = 'MBBank';
  const fallbackAccountName = 'MBBANK';
  const effectiveAccountNo = accountNo || fallbackAccountNo;
  const effectiveBankCode = bankCode || fallbackBankCode;
  const effectiveAccountName = accountName || fallbackAccountName;
  const vietQrUrl = paymentMethod === 'bank_transfer'
    ? buildVietQrImageUrl({
        bankCode: effectiveBankCode,
        accountNo: effectiveAccountNo,
        amount: total,
        description: paymentReference || 'THANH TOAN',
      })
    : '';

  useEffect(() => {
    if (!user || paymentMethod !== 'bank_transfer') return;
    if (!paymentReference) {
      setPaymentReference(createTransferReference(user.id));
    }
    if (qrExpiresAt == null || remainingMs <= 0) {
      setQrExpiresAt(getDefaultQrExpiry());
    }
  }, [paymentMethod, user, paymentReference, qrExpiresAt, remainingMs]);

  useEffect(() => {
    if (paymentMethod !== 'bank_transfer') return;
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paymentMethod]);

  useEffect(() => {
    if (paymentMethod !== 'bank_transfer') {
      setTransferConfirmed(false);
    }
  }, [paymentMethod]);

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof ShippingForm, string>> = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'Vui lòng nhập họ tên.';
    if (!form.phone.trim()) nextErrors.phone = 'Vui lòng nhập số điện thoại.';
    if (!form.address.trim()) nextErrors.address = 'Vui lòng nhập địa chỉ nhận hàng.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || checkoutItems.length === 0 || submitting) return;

    if (!validateForm()) return;

    const hasMissingSize = checkoutItems.some(item => item.shoe_size == null);
    if (hasMissingSize) {
      window.alert('Vui lòng chọn size giày trước khi thanh toán.');
      return;
    }
    if (paymentMethod === 'bank_transfer' && isQrExpired) {
      window.alert('Mã QR đã hết hạn. Vui lòng tạo mã mới trước khi thanh toán.');
      return;
    }
    if (paymentMethod === 'bank_transfer' && !transferConfirmed) {
      window.alert('Vui lòng bấm "Tôi đã thanh toán" sau khi chuyển khoản.');
      return;
    }

    setSubmitting(true);

    try {
      const shippingAddress = `${form.fullName.trim()} - ${form.phone.trim()} - ${form.address.trim()}`;

      if (user.provider === 'google') {
        const orderId =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `google-order-${Date.now()}`;
        const createdAt = new Date().toISOString();

        prependGoogleOrder(user.id, {
          id: orderId,
          user_id: user.id,
          total,
          shipping_address: `${shippingAddress} (${paymentMethod === 'cod' ? 'COD' : 'Chuyển khoản'})`,
          status: 'pending',
          created_at: createdAt,
          order_items: checkoutItems.map(item => {
            const matchedCartItem = items.find(
              cartItem =>
                cartItem.product_id === item.product_id &&
                (cartItem.shoe_size ?? null) === (item.shoe_size ?? null),
            );

            return {
              id: `google-item-${item.product_id}-${createdAt}`,
              order_id: orderId,
              product_id: item.product_id,
              shoe_size: item.shoe_size ?? null,
              quantity: item.quantity,
              price: item.price,
              products: matchedCartItem?.products,
            };
          }),
        });
      } else {
        await createCheckoutOrder(db, {
          userId: user.id,
          total,
          shippingAddress: `${shippingAddress} (${paymentMethod === 'cod' ? 'COD' : 'Chuyển khoản'})`,
          items: checkoutItems.map(item => ({
            product_id: item.product_id,
            shoe_size: item.shoe_size ?? null,
            quantity: item.quantity,
            price: item.price,
          })),
        });
      }

      await clearCart();
      clearCheckoutDraft(user.id);
      navigate('/dashboard');
    } catch {
      window.alert('Thanh toán thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || cartLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại giỏ hàng
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Thanh toán</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tóm tắt đơn hàng</h2>
            <div className="space-y-4">
              {checkoutItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.product_name}</p>
                    <p className="text-sm text-gray-500">
                      Số lượng: {item.quantity}
                      {item.shoe_size ? ` - Size ${item.shoe_size}` : ''}
                    </p>
                    <p className="text-sm text-gray-500">Đơn giá: {formatPrice(item.price)}</p>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <form id="checkout-form" onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Thông tin giao hàng</h2>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Họ tên
              </label>
              <input
                id="fullName"
                type="text"
                value={form.fullName}
                onChange={event => setForm(prev => ({ ...prev, fullName: event.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                placeholder="Nhập họ và tên người nhận"
              />
              {errors.fullName && <p className="text-sm text-rose-600 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Số điện thoại
              </label>
              <input
                id="phone"
                type="text"
                value={form.phone}
                onChange={event => setForm(prev => ({ ...prev, phone: event.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                placeholder="Nhập số điện thoại"
              />
              {errors.phone && <p className="text-sm text-rose-600 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Địa chỉ nhận hàng
              </label>
              <textarea
                id="address"
                rows={3}
                value={form.address}
                onChange={event => setForm(prev => ({ ...prev, address: event.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 resize-none"
                placeholder="Nhập địa chỉ nhận hàng"
              />
              {errors.address && <p className="text-sm text-rose-600 mt-1">{errors.address}</p>}
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-3">Phương thức thanh toán</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="w-4 h-4 text-teal-600"
                  />
                  <span className="text-sm text-gray-800">Thanh toán khi nhận hàng (COD)</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="w-4 h-4 text-teal-600"
                  />
                  <span className="text-sm text-gray-800">Chuyển khoản</span>
                </label>
              </div>
            </div>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24 space-y-5">
            <h3 className="font-semibold text-gray-900">Chi tiết thanh toán</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Tạm tính</span>
                <span className="text-gray-900">{formatPrice(total)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Phí vận chuyển</span>
                <span className="text-emerald-600 font-medium">Miễn phí</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Tổng cộng</span>
                <span className="text-xl font-bold text-gray-900">{formatPrice(total)}</span>
              </div>
            </div>
            {paymentMethod === 'bank_transfer' && (
              <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">Mã QR SePay</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    isQrExpired ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isQrExpired ? 'Đã hết hạn' : `Còn ${formatCountdown(remainingMs)}`}
                  </span>
                </div>
                {!hasVietQrConfig && (
                  <p className="text-xs text-amber-700">
                    Đang dùng mẫu mặc định. Hãy cấu hình `VITE_VIETQR_BANK_CODE`, `VITE_VIETQR_ACCOUNT_NO` trong `.env`.
                  </p>
                )}
                <div className="mx-auto w-56 h-56 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                  {!isQrExpired ? (
                    <img
                      src={vietQrUrl}
                      alt="Mã QR chuyển khoản"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <p className="text-sm text-gray-500 text-center px-3">QR đã hết hạn, vui lòng tạo mã mới.</p>
                  )}
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><span className="font-medium">Ngân hàng:</span> {effectiveBankCode}</p>
                  <p><span className="font-medium">Số tài khoản:</span> {effectiveAccountNo}</p>
                  <p><span className="font-medium">Chủ tài khoản:</span> {effectiveAccountName}</p>
                  <p><span className="font-medium">Số tiền:</span> {formatPrice(total)}</p>
                  <p><span className="font-medium">Nội dung CK:</span> {paymentReference || 'Đang tạo...'}</p>
                </div>
                <button
                  type="button"
                  disabled={isQrExpired}
                  onClick={() => setTransferConfirmed(true)}
                  className={`w-full inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    transferConfirmed
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {transferConfirmed ? 'Đã xác nhận thanh toán' : 'Tôi đã thanh toán'}
                </button>
                {isQrExpired && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) return;
                      setPaymentReference(createTransferReference(user.id));
                      setQrExpiresAt(getDefaultQrExpiry());
                      setNowMs(Date.now());
                      setTransferConfirmed(false);
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-teal-700 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                  >
                    Tạo mã QR mới
                  </button>
                )}
              </div>
            )}
            <button
              type="submit"
              form="checkout-form"
              disabled={submitDisabled}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang xử lý...' : 'Xác nhận đặt đơn'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
