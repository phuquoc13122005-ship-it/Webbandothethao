import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Boxes, Tags, Users, LifeBuoy, CheckCircle2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Category, Order, Product, Profile, SupportRequest } from '../types';
import { formatDate, formatPrice, getStatusColor, getStatusLabel } from '../lib/formatters';

type StaffTab = 'orders' | 'products' | 'categories' | 'customers' | 'support';

interface OrderWithCustomer extends Order {
  customer?: Profile;
}

export default function StaffDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<StaffTab>('orders');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isStaff, setIsStaff] = useState(false);

  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [supportFeatureEnabled, setSupportFeatureEnabled] = useState(true);

  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<string, Order['status']>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [supportStatusDrafts, setSupportStatusDrafts] = useState<Record<string, SupportRequest['status']>>({});

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const loadStaffData = async () => {
      setLoading(true);
      setError('');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setError('Không thể tải thông tin tài khoản nhân viên.');
        setLoading(false);
        return;
      }

      const role = (profile.role || 'customer') as 'customer' | 'staff' | 'admin';
      const staffAccess = role === 'staff' || role === 'admin';
      setIsStaff(staffAccess);

      if (!staffAccess) {
        setError('Bạn không có quyền truy cập dashboard nhân viên.');
        setLoading(false);
        return;
      }

      const [ordersRes, productsRes, categoriesRes, customersRes, supportRes] = await Promise.all([
        supabase.from('orders').select('*, order_items(*, products(*))').order('created_at', { ascending: false }),
        supabase.from('products').select('*, categories(*)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('support_requests').select('*').order('created_at', { ascending: false }),
      ]);

      if (ordersRes.error || productsRes.error || categoriesRes.error || customersRes.error) {
        setError('Không thể tải dữ liệu dashboard nhân viên.');
        setLoading(false);
        return;
      }

      const customerMap = new Map<string, Profile>(
        (customersRes.data || []).map(item => [item.id, item]),
      );

      const nextOrders = (ordersRes.data || []).map(order => ({
        ...order,
        customer: customerMap.get(order.user_id),
      })) as OrderWithCustomer[];

      setOrders(nextOrders);
      setProducts((productsRes.data || []) as Product[]);
      setCategories((categoriesRes.data || []) as Category[]);
      setCustomers((customersRes.data || []) as Profile[]);

      if (supportRes.error) {
        setSupportFeatureEnabled(false);
      } else {
        setSupportFeatureEnabled(true);
        setSupportRequests((supportRes.data || []) as SupportRequest[]);
      }

      setOrderStatusDrafts(
        nextOrders.reduce<Record<string, Order['status']>>((acc, order) => {
          acc[order.id] = order.status;
          return acc;
        }, {}),
      );
      setStockDrafts(
        (productsRes.data || []).reduce<Record<string, string>>((acc, product) => {
          acc[product.id] = String(product.stock);
          return acc;
        }, {}),
      );
      setSupportStatusDrafts(
        (supportRes.data || []).reduce<Record<string, SupportRequest['status']>>((acc, item) => {
          acc[item.id] = item.status;
          return acc;
        }, {}),
      );

      setLoading(false);
    };

    loadStaffData();
  }, [authLoading, navigate, user]);

  const customerStats = useMemo(() => {
    const map = new Map<string, { orderCount: number; totalSpent: number }>();
    orders.forEach(order => {
      const current = map.get(order.user_id) || { orderCount: 0, totalSpent: 0 };
      map.set(order.user_id, {
        orderCount: current.orderCount + 1,
        totalSpent: current.totalSpent + Number(order.total || 0),
      });
    });
    return map;
  }, [orders]);

  const handleConfirmOrder = async (orderId: string) => {
    setSubmitting(true);
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', orderId)
      .eq('status', 'pending');
    setSubmitting(false);
    if (updateError) {
      window.alert('Không thể xác nhận đơn hàng.');
      return;
    }
    setOrders(prev => prev.map(order => (order.id === orderId ? { ...order, status: 'confirmed' } : order)));
    setOrderStatusDrafts(prev => ({ ...prev, [orderId]: 'confirmed' }));
  };

  const handleUpdateOrderStatus = async (orderId: string) => {
    const nextStatus = orderStatusDrafts[orderId];
    if (!nextStatus) return;
    setSubmitting(true);
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId);
    setSubmitting(false);
    if (updateError) {
      window.alert('Không thể cập nhật trạng thái đơn hàng.');
      return;
    }
    setOrders(prev => prev.map(order => (order.id === orderId ? { ...order, status: nextStatus } : order)));
  };

  const handleUpdateStock = async (productId: string) => {
    const stockValue = Number(stockDrafts[productId] || 0);
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      window.alert('Số lượng tồn kho không hợp lệ.');
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: Math.floor(stockValue) })
      .eq('id', productId);
    setSubmitting(false);
    if (updateError) {
      window.alert('Không thể cập nhật số lượng sản phẩm.');
      return;
    }
    setProducts(prev => prev.map(item => (item.id === productId ? { ...item, stock: Math.floor(stockValue) } : item)));
  };

  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newCategoryName.trim();
    const slug = newCategorySlug.trim();
    if (!name || !slug) {
      window.alert('Vui lòng nhập tên danh mục và slug.');
      return;
    }

    setSubmitting(true);
    const { data, error: createError } = await supabase
      .from('categories')
      .insert({
        name,
        slug,
        description: newCategoryDescription.trim(),
      })
      .select('*')
      .maybeSingle();
    setSubmitting(false);

    if (createError || !data) {
      window.alert('Không thể tạo danh mục mới.');
      return;
    }

    setCategories(prev => [data as Category, ...prev]);
    setNewCategoryName('');
    setNewCategorySlug('');
    setNewCategoryDescription('');
  };

  const handleSupportStatusUpdate = async (requestId: string) => {
    const nextStatus = supportStatusDrafts[requestId];
    if (!nextStatus) return;
    setSubmitting(true);
    const payload = nextStatus === 'resolved'
      ? { status: nextStatus, resolved_at: new Date().toISOString() }
      : { status: nextStatus, resolved_at: null };

    const { error: updateError } = await supabase
      .from('support_requests')
      .update(payload)
      .eq('id', requestId);
    setSubmitting(false);

    if (updateError) {
      window.alert('Không thể cập nhật yêu cầu hỗ trợ.');
      return;
    }
    setSupportRequests(prev => prev.map(item => (
      item.id === requestId
        ? { ...item, status: nextStatus, resolved_at: payload.resolved_at || null }
        : item
    )));
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isStaff) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Không có quyền truy cập</h2>
        <p className="text-gray-500 mb-6">{error || 'Tài khoản này không phải nhân viên.'}</p>
        <Link to="/dashboard" className="inline-flex px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold">
          Quay về dashboard cá nhân
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard nhân viên</h1>
        <Link to="/dashboard" className="text-sm font-medium text-teal-600 hover:text-teal-700">Về dashboard khách hàng</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <aside className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2 sticky top-24">
            {[
              { id: 'orders' as StaffTab, label: 'Đơn hàng', icon: Package },
              { id: 'products' as StaffTab, label: 'Sản phẩm', icon: Boxes },
              { id: 'categories' as StaffTab, label: 'Danh mục', icon: Tags },
              { id: 'customers' as StaffTab, label: 'Khách hàng', icon: Users },
              { id: 'support' as StaffTab, label: 'Hỗ trợ', icon: LifeBuoy },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl ${
                  activeTab === item.id ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <main className="lg:col-span-4">
          {activeTab === 'orders' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Xem và xử lý đơn hàng</h2>
              {orders.map(order => (
                <div key={order.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm text-gray-500">Mã đơn: <span className="font-medium text-gray-800">{order.id.slice(0, 8)}...</span></p>
                      <p className="text-sm text-gray-500">
                        Khách hàng: <span className="font-medium text-gray-800">{order.customer?.full_name || order.customer?.phone || order.user_id}</span>
                      </p>
                      <p className="text-sm text-gray-500">Ngày đặt: {formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatPrice(order.total)}</p>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleConfirmOrder(order.id)}
                      disabled={order.status !== 'pending' || submitting}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Xác nhận đơn
                    </button>
                    <select
                      value={orderStatusDrafts[order.id] || order.status}
                      onChange={event => setOrderStatusDrafts(prev => ({ ...prev, [order.id]: event.target.value as Order['status'] }))}
                      className="h-10 px-3 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="pending">Chờ xác nhận</option>
                      <option value="confirmed">Đã xác nhận</option>
                      <option value="shipping">Đang giao</option>
                      <option value="delivered">Đã giao</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      Cập nhật trạng thái
                    </button>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <p className="text-sm text-gray-500">Chưa có đơn hàng nào.</p>}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Quản lý sản phẩm và tồn kho</h2>
              <div className="space-y-3">
                {products.map(product => (
                  <div key={product.id} className="border border-gray-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.brand} - {formatPrice(product.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={stockDrafts[product.id] ?? String(product.stock)}
                        onChange={event => setStockDrafts(prev => ({ ...prev, [product.id]: event.target.value }))}
                        className="w-28 h-10 px-3 border border-gray-200 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => handleUpdateStock(product.id)}
                        disabled={submitting}
                        className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
                      >
                        Lưu số lượng
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Quản lý danh mục sản phẩm</h2>
              <form onSubmit={handleCreateCategory} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  value={newCategoryName}
                  onChange={event => setNewCategoryName(event.target.value)}
                  placeholder="Tên danh mục"
                  className="h-10 px-3 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={newCategorySlug}
                  onChange={event => setNewCategorySlug(event.target.value)}
                  placeholder="Slug (vd: giay-the-thao)"
                  className="h-10 px-3 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={newCategoryDescription}
                  onChange={event => setNewCategoryDescription(event.target.value)}
                  placeholder="Mô tả"
                  className="h-10 px-3 border border-gray-200 rounded-lg text-sm"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="md:col-span-3 h-10 px-4 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
                >
                  Tạo danh mục
                </button>
              </form>
              <div className="space-y-2">
                {categories.map(category => (
                  <div key={category.id} className="border border-gray-100 rounded-lg px-4 py-3">
                    <p className="font-medium text-gray-900">{category.name}</p>
                    <p className="text-xs text-gray-500">{category.slug}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
              <h2 className="text-lg font-bold text-gray-900">Thông tin khách hàng</h2>
              {customers.map(customer => {
                const stats = customerStats.get(customer.id) || { orderCount: 0, totalSpent: 0 };
                return (
                  <div key={customer.id} className="border border-gray-100 rounded-xl p-4">
                    <p className="font-semibold text-gray-900">{customer.full_name || 'Chưa cập nhật tên'}</p>
                    <p className="text-sm text-gray-500">SĐT: {customer.phone || '---'}</p>
                    <p className="text-sm text-gray-500">Địa chỉ: {customer.address || '---'}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Số đơn: <span className="font-medium">{stats.orderCount}</span> - Tổng mua: <span className="font-medium">{formatPrice(stats.totalSpent)}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'support' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Xử lý yêu cầu hỗ trợ</h2>
              {!supportFeatureEnabled && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  Chưa có bảng `support_requests` trong database. Hãy chạy migration mới để bật tính năng này.
                </div>
              )}
              {supportFeatureEnabled && supportRequests.map(item => (
                <div key={item.id} className="border border-gray-100 rounded-xl p-4">
                  <p className="font-semibold text-gray-900">{item.subject}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{item.full_name} - {item.email} - {formatDate(item.created_at)}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <select
                      value={supportStatusDrafts[item.id] || item.status}
                      onChange={event => setSupportStatusDrafts(prev => ({ ...prev, [item.id]: event.target.value as SupportRequest['status'] }))}
                      className="h-10 px-3 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="open">Mới</option>
                      <option value="in_progress">Đang xử lý</option>
                      <option value="resolved">Đã xử lý</option>
                    </select>
                    <button
                      onClick={() => handleSupportStatusUpdate(item.id)}
                      disabled={submitting}
                      className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
                    >
                      Lưu trạng thái
                    </button>
                  </div>
                </div>
              ))}
              {supportFeatureEnabled && supportRequests.length === 0 && (
                <p className="text-sm text-gray-500">Chưa có yêu cầu hỗ trợ nào.</p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
