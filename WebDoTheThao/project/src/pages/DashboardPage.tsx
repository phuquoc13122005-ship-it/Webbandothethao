import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, ShoppingBag, User as UserIcon, LogOut, ChevronRight, Clock, MapPin, Phone, Mail, CreditCard as Edit3, X, Trash2, Eye, EyeOff } from 'lucide-react';
import { db } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import type { Order, Profile } from '../types';
import { formatPrice, formatDate, getStatusLabel, getStatusColor } from '../lib/formatters';
import { cancelGoogleOrder, getGoogleOrders, getGoogleProfile, saveGoogleProfile } from '../lib/googleLocalData';
import {
  CANCEL_REASON_OPTIONS,
  type CancelReason,
  isCodOrder,
  isReasonValid,
  isStatusCancellable,
  normalizeCancelDetail,
} from '../lib/orderCancellation';

type Tab = 'orders' | 'profile' | 'account_settings';
type OrderFilterStatus = 'all' | Order['status'];

function formatPasswordErrorMessage(error: any) {
  const code = String(error?.message || '');
  if (code === 'INVALID_CURRENT_PASSWORD') return 'Sai mật khẩu hiện tại.';
  if (code === 'PASSWORD_ALREADY_USED') return 'Mật khẩu đã được sử dụng.';
  if (code === 'INVALID_PASSWORD') return 'Mật khẩu mới phải có ít nhất 6 ký tự.';
  if (code === 'USER_NOT_FOUND') return 'Không tìm thấy tài khoản trong hệ thống. Vui lòng đăng xuất rồi đăng nhập lại.';
  if (code === 'UNAUTHENTICATED') return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (code === 'PASSWORD_REQUIRED') return 'Vui lòng nhập đầy đủ thông tin mật khẩu.';
  return 'Không thể đổi mật khẩu lúc này. Vui lòng thử lại.';
}

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [profileSaveMessage, setProfileSaveMessage] = useState('');
  const [profileSaveError, setProfileSaveError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showPasswordFields, setShowPasswordFields] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderFilterStatus>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [hasInitializedDateFilters, setHasInitializedDateFilters] = useState(false);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<CancelReason | ''>('');
  const [cancelReasonDetail, setCancelReasonDetail] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [reorderLoadingOrderId, setReorderLoadingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    const currentUser = user;

    async function load() {
      setLoading(true);
      if (currentUser.provider === 'google') {
        const googleOrders = getGoogleOrders(currentUser.id);
        const googleProfile = getGoogleProfile(currentUser);
        setOrders(googleOrders);
        setProfile(googleProfile);
        setEditForm({
          full_name: googleProfile.full_name || '',
          phone: googleProfile.phone || '',
          address: googleProfile.address || '',
        });
        setLoading(false);
        return;
      }

      const [ordersRes, profileRes] = await Promise.all([
        db
          .from('orders')
          .select('*, order_items(*, products(*))')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false }),
        db
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle(),
      ]);
      setOrders(ordersRes.data || []);
      setProfile(profileRes.data);
      if (profileRes.data) {
        setEditForm({
          full_name: profileRes.data.full_name || '',
          phone: profileRes.data.phone || '',
          address: profileRes.data.address || '',
        });
      }
      setLoading(false);
    }
    load();
  }, [authLoading, user, navigate]);

  const todayDate = toLocalDateInputValue(new Date());
  const earliestOrderDate = orders.reduce<string | null>((earliest, order) => {
    const parsed = new Date(order.created_at);
    if (Number.isNaN(parsed.getTime())) return earliest;
    const value = toLocalDateInputValue(parsed);
    if (!earliest) return value;
    return value < earliest ? value : earliest;
  }, null);

  useEffect(() => {
    if (!orders.length || !earliestOrderDate || hasInitializedDateFilters) return;
    setFilterDateFrom(earliestOrderDate);
    setFilterDateTo(todayDate);
    setHasInitializedDateFilters(true);
  }, [orders.length, earliestOrderDate, todayDate, hasInitializedDateFilters]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaveMessage('');
    setProfileSaveError('');
    if (user.provider === 'google') {
      const updated = saveGoogleProfile(user, {
        full_name: editForm.full_name,
        phone: editForm.phone,
        address: editForm.address,
      });
      setProfile(updated);
      setProfileSaveMessage('Cập nhật thông tin thành công.');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await db
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim(),
          phone: editForm.phone.trim(),
          address: editForm.address.trim(),
        })
        .eq('id', user.id);

      if (updateError) {
        setProfileSaveError(updateError.message || 'Không thể cập nhật thông tin lúc này.');
        return;
      }

      const { data, error: refreshError } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (refreshError || !data) {
        setProfileSaveError(refreshError?.message || 'Đã lưu nhưng không thể tải lại thông tin.');
        return;
      }

      setProfile(data);
      setEditForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        address: data.address || '',
      });
      setProfileSaveMessage('Cập nhật thông tin thành công.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const currentPassword = passwordForm.currentPassword;
    const newPassword = passwordForm.newPassword;
    const confirmNewPassword = passwordForm.confirmNewPassword;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Vui lòng nhập đầy đủ thông tin đổi mật khẩu.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Mật khẩu chưa trùng khớp.');
      return;
    }

    setPasswordSubmitting(true);
    try {
      const { error } = await db.auth.changePassword({
        currentPassword,
        newPassword,
      });
      if (error) {
        setPasswordError(formatPasswordErrorMessage(error));
        return;
      }

      setPasswordSuccess('Đổi mật khẩu thành công.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleOpenDetailModal = (order: Order) => {
    setDetailOrder(order);
  };

  const closeDetailModal = () => {
    setDetailOrder(null);
  };

  const closeCancelModal = () => {
    setCancelOrder(null);
    setCancelReason('');
    setCancelReasonDetail('');
    setCancelError('');
    setCancelSubmitting(false);
  };

  const handleReorder = async (order: Order) => {
    if (!order.order_items?.length) {
      window.alert('Đơn hàng này không có sản phẩm để mua lại.');
      return;
    }

    if (reorderLoadingOrderId) {
      return;
    }

    setReorderLoadingOrderId(order.id);
    try {
      await Promise.all(
        order.order_items.map(item =>
          addToCart(item.product_id, item.quantity, item.shoe_size ?? null),
        ),
      );
      navigate('/cart');
    } catch {
      window.alert('Không thể thêm sản phẩm vào giỏ hàng lúc này. Vui lòng thử lại.');
    } finally {
      setReorderLoadingOrderId(null);
    }
  };

  const handleOpenCancelModal = (order: Order) => {
    if (!isStatusCancellable(order.status) || !isCodOrder(order.payment_method, order.shipping_address)) {
      window.alert('Đơn hàng này không đủ điều kiện hủy.');
      return;
    }
    setCancelOrder(order);
    setCancelReason('');
    setCancelReasonDetail('');
    setCancelError('');
  };

  const handleConfirmCancelOrder = async () => {
    if (!user || !cancelOrder || cancelSubmitting) return;
    if (!isReasonValid(cancelReason, cancelReasonDetail)) {
      setCancelError('Vui lòng chọn lý do hủy đơn hàng. Nếu chọn "Lý do khác", hãy nhập nội dung.');
      return;
    }

    const normalizedDetail = normalizeCancelDetail(cancelReasonDetail);
    const cancelledAt = new Date().toISOString();
    setCancelSubmitting(true);
    setCancelError('');

    if (user.provider === 'google') {
      const nextOrders = cancelGoogleOrder(user.id, cancelOrder.id, cancelReason, normalizedDetail);
      setOrders(nextOrders);
      closeCancelModal();
      return;
    }

    const { data: updatedOrder, error } = await db
      .from('orders')
      .update({
        status: 'cancelled',
        cancel_reason: cancelReason,
        cancel_reason_detail: normalizedDetail,
        cancelled_at: cancelledAt,
      })
      .eq('id', cancelOrder.id)
      .eq('user_id', user.id)
      .in('status', ['pending', 'confirmed'])
      .select('*, order_items(*, products(*))')
      .maybeSingle();

    const missingCancelColumns =
      error?.message?.includes('cancel_reason') ||
      error?.message?.includes('cancel_reason_detail') ||
      error?.message?.includes('cancelled_at');

    if ((error || !updatedOrder) && missingCancelColumns) {
      const { data: fallbackOrder, error: fallbackError } = await db
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', cancelOrder.id)
        .eq('user_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .select('*, order_items(*, products(*))')
        .maybeSingle();

      if (fallbackError || !fallbackOrder) {
        setCancelError('Không thể hủy đơn hàng lúc này. Vui lòng thử lại.');
        setCancelSubmitting(false);
        return;
      }

      setOrders(prev =>
        prev.map(order =>
          order.id === fallbackOrder.id
            ? {
                ...fallbackOrder,
                cancel_reason: cancelReason,
                cancel_reason_detail: normalizedDetail,
                cancelled_at: cancelledAt,
              }
            : order,
        ),
      );
      closeCancelModal();
      return;
    }

    if (error || !updatedOrder) {
      setCancelError('Không thể hủy đơn hàng lúc này. Vui lòng thử lại.');
      setCancelSubmitting(false);
      return;
    }

    setOrders(prev => prev.map(order => (order.id === updatedOrder.id ? updatedOrder : order)));
    closeCancelModal();
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    shipping: orders.filter(o => o.status === 'shipping').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  const filteredOrders = orders.filter(order => {
    if (filterStatus !== 'all' && order.status !== filterStatus) {
      return false;
    }

    const createdAt = new Date(order.created_at);
    if (Number.isNaN(createdAt.getTime())) {
      return false;
    }

    if (filterDateFrom) {
      const from = new Date(`${filterDateFrom}T00:00:00`);
      if (createdAt < from) return false;
    }

    if (filterDateTo) {
      const to = new Date(`${filterDateTo}T23:59:59.999`);
      if (createdAt > to) return false;
    }

    return true;
  });

  const resetFilters = () => {
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const paymentMethodLabel = (method: Order['payment_method']) => {
    if (method === 'bank_transfer') return 'Chuyển khoản ngân hàng';
    if (method === 'cod') return 'Thanh toán khi nhận hàng (COD)';
    return 'Chưa cập nhật';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/" className="hover:text-teal-600 transition-colors">Trang chủ</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-900 font-medium">Dashboard</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-2xl flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{profile?.full_name || 'Người dùng'}</p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            <nav className="space-y-1 mb-6">
              {[
                { id: 'orders' as Tab, icon: Package, label: 'Đơn hàng của tôi' },
                { id: 'profile' as Tab, icon: UserIcon, label: 'Thông tin cá nhân' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                    activeTab === item.id
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </aside>

        <main className="lg:col-span-3">
          {activeTab === 'orders' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Tổng đơn', value: stats.total, color: 'bg-teal-50 text-teal-700' },
                  { label: 'Chờ xác nhận', value: stats.pending, color: 'bg-amber-50 text-amber-700' },
                  { label: 'Đang giao', value: stats.shipping, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Hoàn thành', value: stats.delivered, color: 'bg-emerald-50 text-emerald-700' },
                ].map(stat => (
                  <div key={stat.label} className={`rounded-2xl p-5 ${stat.color}`}>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm font-medium mt-1 opacity-80">{stat.label}</p>
                  </div>
                ))}
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-6">Đơn hàng của tôi</h2>

              <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
                    <select
                      value={filterStatus}
                      onChange={event => setFilterStatus(event.target.value as OrderFilterStatus)}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                    >
                      <option value="all">Tất cả</option>
                      <option value="pending">Chờ xác nhận</option>
                      <option value="confirmed">Đã xác nhận</option>
                      <option value="shipping">Đang giao</option>
                      <option value="delivered">Hoàn thành</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={event => {
                        const nextFrom = event.target.value;
                        setFilterDateFrom(nextFrom);
                        if (filterDateTo && nextFrom && filterDateTo < nextFrom) {
                          setFilterDateTo(nextFrom);
                        }
                      }}
                      min={earliestOrderDate || undefined}
                      max={filterDateTo || todayDate}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={event => {
                        const nextTo = event.target.value;
                        if (filterDateFrom && nextTo && nextTo < filterDateFrom) {
                          setFilterDateTo(filterDateFrom);
                          return;
                        }
                        setFilterDateTo(nextTo);
                      }}
                      min={filterDateFrom || earliestOrderDate || undefined}
                      max={todayDate}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={resetFilters}
                      className="w-full h-10 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    {orders.length === 0 ? 'Bạn chưa có đơn hàng nào' : 'Không tìm thấy đơn hàng phù hợp bộ lọc'}
                  </p>
                  {orders.length === 0 ? (
                    <Link
                      to="/products"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all"
                    >
                      Mua sắm ngay
                    </Link>
                  ) : (
                    <button
                      onClick={resetFilters}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Đặt lại bộ lọc
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            {formatDate(order.created_at)}
                          </div>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</span>
                          <button
                            onClick={() => handleOpenDetailModal(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            Xem chi tiết
                          </button>
                          <button
                            onClick={() => handleReorder(order)}
                            disabled={reorderLoadingOrderId === order.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {reorderLoadingOrderId === order.id ? 'Đang thêm...' : 'Mua lại'}
                          </button>
                          {isStatusCancellable(order.status) && isCodOrder(order.payment_method, order.shipping_address) && (
                            <button
                              onClick={() => handleOpenCancelModal(order)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Hủy đơn hàng
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="px-6 py-4">
                        <div className="space-y-3">
                          {order.order_items?.map(item => (
                            <div key={item.id} className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                <img
                                  src={item.products?.image_url}
                                  alt={item.products?.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{item.products?.name}</p>
                                <p className="text-xs text-gray-500">
                                  x{item.quantity}
                                  {item.shoe_size ? ` - Size ${item.shoe_size}` : ''}
                                  {' - '}
                                  {formatPrice(item.price)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {order.status === 'cancelled' && order.cancel_reason && (
                          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-100 p-3">
                            <p className="text-sm text-rose-700">
                              <span className="font-semibold">Lý do hủy:</span>{' '}
                              {CANCEL_REASON_OPTIONS.find(item => item.value === order.cancel_reason)?.label || order.cancel_reason}
                            </p>
                            {order.cancel_reason_detail && (
                              <p className="text-sm text-rose-700 mt-1">
                                <span className="font-semibold">Chi tiết:</span> {order.cancel_reason_detail}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-gray-900">Thông tin cá nhân</h2>
                <button
                  onClick={() => setActiveTab('account_settings')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Chỉnh sửa
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-2xl">
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-2xl flex items-center justify-center">
                    <UserIcon className="w-9 h-9 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {profile?.full_name || 'Chưa cập nhật'}
                    </h3>
                    <p className="text-gray-500 text-sm">Thành viên từ {profile ? formatDate(profile.created_at) : ''}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: Mail, label: 'Email', value: user.email },
                    { icon: Phone, label: 'Số điện thoại', value: profile?.phone || 'Chưa cập nhật' },
                    { icon: UserIcon, label: 'Họ tên', value: profile?.full_name || 'Chưa cập nhật' },
                    { icon: MapPin, label: 'Địa chỉ', value: profile?.address || 'Chưa cập nhật' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                      <item.icon className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                        <p className="text-sm font-medium text-gray-900">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account_settings' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Trang thông tin tài khoản</h2>
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setProfileSaveMessage('');
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="px-6 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
                >
                  QUAY LẠI
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-3xl font-bold text-gray-900">Thông tin tài khoản</h3>
                {profileSaveMessage && (
                  <p className="text-sm text-emerald-600">{profileSaveMessage}</p>
                )}
                {profileSaveError && (
                  <p className="text-sm text-rose-600">{profileSaveError}</p>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={user.email || ''}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-sm text-base text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Họ tên *</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={event => setEditForm(prev => ({ ...prev, full_name: event.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-sm text-base focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Số điện thoại *</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={event => setEditForm(prev => ({ ...prev, phone: event.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-sm text-base focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Địa chỉ</label>
                  <textarea
                    value={editForm.address}
                    onChange={event => setEditForm(prev => ({ ...prev, address: event.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-sm text-base focus:outline-none focus:border-teal-400 resize-none"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full h-11 rounded-md bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60"
                >
                  {saving ? 'ĐANG CẬP NHẬT...' : 'CẬP NHẬT'}
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <h3 className="text-3xl font-bold text-gray-900">Đổi mật khẩu</h3>
                {passwordError && (
                  <p className="text-sm text-rose-600">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-sm text-emerald-600">{passwordSuccess}</p>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <input
                      type={showPasswordFields.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={event => setPasswordForm(prev => ({ ...prev, currentPassword: event.target.value }))}
                      placeholder="Mật khẩu hiện tại (*)"
                      className="w-full px-4 pr-12 py-3 bg-white border border-gray-200 rounded-sm text-base focus:outline-none focus:border-teal-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordFields(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPasswordFields.current ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                    >
                      {showPasswordFields.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showPasswordFields.next ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={event => setPasswordForm(prev => ({ ...prev, newPassword: event.target.value }))}
                      placeholder="Mật khẩu mới (*)"
                      className="w-full px-4 pr-12 py-3 bg-white border border-gray-200 rounded-sm text-base focus:outline-none focus:border-teal-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordFields(prev => ({ ...prev, next: !prev.next }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPasswordFields.next ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                    >
                      {showPasswordFields.next ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nhập lại mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showPasswordFields.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmNewPassword}
                      onChange={event => setPasswordForm(prev => ({ ...prev, confirmNewPassword: event.target.value }))}
                      placeholder="Nhập lại mật khẩu mới (*)"
                      className="w-full px-4 pr-12 py-3 bg-white border border-gray-200 rounded-sm text-base focus:outline-none focus:border-teal-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordFields(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPasswordFields.confirm ? 'Ẩn nhập lại mật khẩu mới' : 'Hiện nhập lại mật khẩu mới'}
                    >
                      {showPasswordFields.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="w-full h-11 rounded-md bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60"
                >
                  {passwordSubmitting ? 'ĐANG CẬP NHẬT...' : 'ĐỔI MẬT KHẨU'}
                </button>
              </form>
            </div>
          )}

          {detailOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={closeDetailModal} />
              <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Chi tiết đơn hàng</h3>
                  <button
                    onClick={closeDetailModal}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Đóng"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <p className="text-xs text-gray-500 mb-1">Mã đơn</p>
                    <p className="text-sm font-semibold text-gray-900 break-all">{detailOrder.id}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <p className="text-xs text-gray-500 mb-1">Ngày đặt</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(detailOrder.created_at)}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(detailOrder.status)}`}>
                      {getStatusLabel(detailOrder.status)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <p className="text-xs text-gray-500 mb-1">Thanh toán</p>
                    <p className="text-sm font-semibold text-gray-900">{paymentMethodLabel(detailOrder.payment_method)}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 mb-5">
                  <p className="text-xs text-gray-500 mb-1">Địa chỉ giao hàng</p>
                  <p className="text-sm text-gray-800">{detailOrder.shipping_address || 'Chưa cập nhật'}</p>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden mb-5">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">Sản phẩm trong đơn</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {detailOrder.order_items?.map(item => (
                      <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <img
                            src={item.products?.image_url}
                            alt={item.products?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.products?.name || 'Sản phẩm'}</p>
                          <p className="text-xs text-gray-500">
                            x{item.quantity}
                            {item.shoe_size ? ` - Size ${item.shoe_size}` : ''}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                    {!detailOrder.order_items?.length && (
                      <p className="px-4 py-5 text-sm text-gray-500">Không có dữ liệu sản phẩm trong đơn hàng.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-teal-50 border border-teal-100 p-4">
                  <span className="text-sm font-semibold text-gray-700">Tổng thanh toán</span>
                  <span className="text-lg font-bold text-gray-900">{formatPrice(detailOrder.total)}</span>
                </div>
              </div>
            </div>
          )}

          {cancelOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={closeCancelModal} />
              <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Yêu cầu hủy đơn</h3>
                  <button
                    onClick={closeCancelModal}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Đóng"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-5">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Đơn:</span> {cancelOrder.id.slice(0, 8)}...
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Tổng tiền:</span> {formatPrice(cancelOrder.total)}
                  </p>
                </div>

                <div className="space-y-3 mb-4">
                  {CANCEL_REASON_OPTIONS.map(option => (
                    <label key={option.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer">
                      <input
                        type="radio"
                        name="cancelReason"
                        value={option.value}
                        checked={cancelReason === option.value}
                        onChange={() => setCancelReason(option.value)}
                        className="mt-1 w-4 h-4 text-teal-600"
                      />
                      <span className="text-sm text-gray-800">{option.label}</span>
                    </label>
                  ))}
                </div>

                {cancelReason === 'other' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chi tiết lý do</label>
                    <textarea
                      value={cancelReasonDetail}
                      onChange={event => setCancelReasonDetail(event.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 resize-none"
                      placeholder="Nhập lý do hủy đơn hàng..."
                    />
                  </div>
                )}

                {cancelError && (
                  <p className="text-sm text-rose-600 mb-4">{cancelError}</p>
                )}

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={closeCancelModal}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    disabled={cancelSubmitting}
                  >
                    Đóng
                  </button>
                  <button
                    onClick={handleConfirmCancelOrder}
                    disabled={cancelSubmitting}
                    className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {cancelSubmitting ? 'Đang xử lý...' : 'Xác nhận hủy đơn hàng'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
