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
import type { Product } from '../types';
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

interface AppliedPromotion {
  assignmentId: string;
  promotionCode: string;
  discountPercent: number;
  discountAmount: number;
}

interface AvailablePromotionItem {
  assignment_id: string;
  code: string;
  name?: string;
  discount_percent: number;
  min_order: number;
  can_apply: boolean;
  disabled_reason?: string;
}

function createTransferReference(userId: string) {
  return `DH-${userId.slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-6)}`;
}

function parseSizeOptions(rawValue?: string | null) {
  return String(rawValue || '')
    .split(/[;,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function getSelectableSizes(product?: Product | null) {
  if (!product) return [] as string[];
  const options = parseSizeOptions(product.size_options);
  if (options.length > 0) return options;
  const sizeType = product.size_type || product.categories?.size_type || 'none';
  if (sizeType === 'shoes') return ['36', '37', '38', '39', '40', '41', '42'];
  if (sizeType === 'apparel') return ['S', 'M', 'L', 'XL', '2XL'];
  return [];
}

function toNumericShoeSize(selectedSize?: string | null) {
  const normalized = String(selectedSize || '').trim();
  if (!normalized || !/^\d+$/.test(normalized)) return null;
  return Number(normalized);
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
  const [promotionCodeInput, setPromotionCodeInput] = useState('');
  const [applyingPromotion, setApplyingPromotion] = useState(false);
  const [promotionError, setPromotionError] = useState('');
  const [appliedPromotion, setAppliedPromotion] = useState<AppliedPromotion | null>(null);
  const [availablePromotions, setAvailablePromotions] = useState<AvailablePromotionItem[]>([]);
  const [loadingAvailablePromotions, setLoadingAvailablePromotions] = useState(false);

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
  const discountAmount = appliedPromotion ? Math.min(total, Number(appliedPromotion.discountAmount || 0)) : 0;
  const payableTotal = Math.max(0, total - discountAmount);
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
        amount: payableTotal,
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

  useEffect(() => {
    let active = true;
    if (!user || user.provider === 'google') {
      setAvailablePromotions([]);
      return () => {
        active = false;
      };
    }
    setLoadingAvailablePromotions(true);
    db.getMyAvailablePromotions(total)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setAvailablePromotions([]);
          return;
        }
        setAvailablePromotions((data || []) as AvailablePromotionItem[]);
      })
      .finally(() => {
        if (active) setLoadingAvailablePromotions(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id, user?.provider, total]);

  const handleApplyPromotion = async (overrideCode?: string) => {
    if (!user || user.provider === 'google') {
      setPromotionError('Tài khoản Google local chưa hỗ trợ áp mã ở bản này.');
      return;
    }
    const code = String(overrideCode || promotionCodeInput).trim().toUpperCase();
    if (!code) {
      setPromotionError('Vui lòng nhập mã khuyến mãi.');
      return;
    }
    setPromotionError('');
    setApplyingPromotion(true);
    const { data, error } = await db.applyPromotionPreview({
      code,
      orderSubtotal: total,
    });
    setApplyingPromotion(false);
    if (error || !data) {
      const errorCode = String(error?.message || '');
      if (errorCode === 'PROMOTION_NOT_ASSIGNED') {
        setPromotionError('Mã này chưa được phát cho tài khoản của bạn.');
      } else if (errorCode === 'PROMOTION_ALREADY_USED') {
        setPromotionError('Bạn đã sử dụng mã này trước đó.');
      } else if (errorCode === 'ORDER_BELOW_MINIMUM') {
        setPromotionError('Đơn hàng chưa đạt giá trị tối thiểu để dùng mã.');
      } else if (errorCode === 'PROMOTION_EXPIRED') {
        setPromotionError('Mã khuyến mãi đã hết hạn.');
      } else if (errorCode === 'PROMOTION_INACTIVE') {
        setPromotionError('Mã khuyến mãi chưa kích hoạt.');
      } else if (errorCode === 'PROMOTION_NOT_FOUND') {
        setPromotionError('Không tìm thấy mã khuyến mãi.');
      } else {
        setPromotionError(error?.message || 'Không thể áp dụng mã khuyến mãi.');
      }
      setAppliedPromotion(null);
      return;
    }

    setAppliedPromotion({
      assignmentId: String(data.assignment_id || ''),
      promotionCode: String(data.code || code),
      discountPercent: Number(data.discount_percent || 0),
      discountAmount: Number(data.discount_amount || 0),
    });
    setPromotionCodeInput(String(data.code || code));
    setPromotionError('');
  };

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setPromotionError('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || checkoutItems.length === 0 || submitting) return;

    if (!validateForm()) return;

    const hasMissingSize = checkoutItems.some(item => {
      const matchedCartItem = items.find(cartItem => cartItem.id === item.id)
        || items.find(cartItem => cartItem.product_id === item.product_id);
      return getSelectableSizes(matchedCartItem?.products).length > 0 && !String(item.selected_size || '').trim();
    });
    if (hasMissingSize) {
      window.alert('Vui lòng chọn size sản phẩm trước khi thanh toán.');
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
          total: payableTotal,
          shipping_address: `${shippingAddress} (${paymentMethod === 'cod' ? 'COD' : 'Chuyển khoản'})`,
          status: 'pending',
          created_at: createdAt,
          order_items: checkoutItems.map(item => {
            const matchedCartItem = items.find(
              cartItem =>
                cartItem.product_id === item.product_id &&
                String(cartItem.selected_size || cartItem.shoe_size || '') === String(item.selected_size || item.shoe_size || ''),
            );

            return {
              id: `google-item-${item.product_id}-${createdAt}`,
              order_id: orderId,
              product_id: item.product_id,
              shoe_size: toNumericShoeSize(item.selected_size),
              size_label: String(item.selected_size || '').trim() || null,
              quantity: item.quantity,
              price: item.price,
              products: matchedCartItem?.products,
            };
          }),
        });
      } else {
        await createCheckoutOrder(db, {
          userId: user.id,
          total: payableTotal,
          subTotal: total,
          promotionAssignmentId: appliedPromotion?.assignmentId || null,
          shippingAddress: `${shippingAddress} (${paymentMethod === 'cod' ? 'COD' : 'Chuyển khoản'})`,
          items: checkoutItems.map(item => ({
            product_id: item.product_id,
            shoe_size: toNumericShoeSize(item.selected_size),
            size_label: String(item.selected_size || '').trim() || null,
            quantity: item.quantity,
            price: item.price,
          })),
        });
      }

      await clearCart();
      clearCheckoutDraft(user.id);
      setAppliedPromotion(null);
      setPromotionCodeInput('');
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
                      {(item.selected_size || item.shoe_size) ? ` - Size ${item.selected_size || item.shoe_size}` : ''}
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
              {appliedPromotion && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Mã {appliedPromotion.promotionCode} (-{appliedPromotion.discountPercent}%)
                  </span>
                  <span className="text-rose-600 font-medium">- {formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Phí vận chuyển</span>
                <span className="text-emerald-600 font-medium">Miễn phí</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Tổng cộng</span>
                <span className="text-xl font-bold text-gray-900">{formatPrice(payableTotal)}</span>
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 p-3 space-y-2">
              <label className="block text-sm font-medium text-gray-700">Mã khuyến mãi</label>
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Voucher của bạn</p>
                {loadingAvailablePromotions && (
                  <p className="text-xs text-slate-500">Đang tải danh sách mã...</p>
                )}
                {!loadingAvailablePromotions && availablePromotions.length === 0 && (
                  <p className="text-xs text-slate-500">Bạn chưa có mã khả dụng.</p>
                )}
                {!loadingAvailablePromotions && availablePromotions.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {availablePromotions.map(item => (
                      <div key={item.assignment_id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {item.code} - Giảm {item.discount_percent}%
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {item.name || 'Mã khuyến mãi cá nhân'} • Đơn từ {formatPrice(Number(item.min_order || 0))}
                            </p>
                            {!item.can_apply && item.disabled_reason && (
                              <p className="text-xs text-amber-700 mt-1">{item.disabled_reason}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={!item.can_apply || applyingPromotion || submitting}
                            onClick={() => handleApplyPromotion(item.code)}
                            className="shrink-0 px-2.5 h-8 rounded-md text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
                          >
                            Áp dụng
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={promotionCodeInput}
                  onChange={event => setPromotionCodeInput(event.target.value.toUpperCase())}
                  placeholder="Nhập mã khuyến mãi"
                  className="flex-1 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                />
                <button
                  type="button"
                  onClick={handleApplyPromotion}
                  disabled={applyingPromotion || submitting || !promotionCodeInput.trim()}
                  className="px-3 h-10 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {applyingPromotion ? 'Đang áp...' : 'Áp dụng'}
                </button>
              </div>
              {appliedPromotion && (
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                  <p className="text-xs text-emerald-700">
                    Đã áp mã <span className="font-semibold">{appliedPromotion.promotionCode}</span>
                  </p>
                  <button type="button" onClick={handleRemovePromotion} className="text-xs text-rose-600 hover:text-rose-700">
                    Bỏ mã
                  </button>
                </div>
              )}
              {promotionError && <p className="text-xs text-rose-600">{promotionError}</p>}
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
                  {appliedPromotion && (
                    <p><span className="font-medium">Sau giảm:</span> {formatPrice(payableTotal)}</p>
                  )}
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
