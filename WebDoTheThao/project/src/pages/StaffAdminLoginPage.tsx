import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type StaffRole = 'staff' | 'admin';

export default function StaffAdminLoginPage() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const mode = useMemo<StaffRole>(
    () => (location.pathname.includes('/admin') ? 'admin' : 'staff'),
    [location.pathname],
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const title = mode === 'admin' ? 'Đăng nhập quản trị viên' : 'Đăng nhập nhân viên';
  const subtitle = mode === 'admin'
    ? 'Khu vực quản trị hệ thống NikaShop'
    : 'Khu vực dành cho nhân viên vận hành đơn hàng';

  const hasRoleAccess = (role: string | null | undefined) => {
    if (mode === 'admin') return role === 'admin';
    return role === 'staff' || role === 'admin';
  };

  const resolveUserRole = async (userId: string) => {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) return null;
    return data?.role as string | null | undefined;
  };

  useEffect(() => {
    if (authLoading || !user) return;

    const validateExistingSession = async () => {
      const role = await resolveUserRole(user.id);
      if (!hasRoleAccess(role)) {
        await signOut();
        setError('Tài khoản này không có quyền truy cập khu vực nhân viên/admin.');
        return;
      }
      navigate('/staff-dashboard', { replace: true });
    };

    validateExistingSession();
  }, [authLoading, hasRoleAccess, mode, navigate, signOut, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const signInResult = await signIn(email, password);
    if (signInResult.error) {
      setSubmitting(false);
      setError(signInResult.error);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const signedInUserId = userData.user?.id;

    if (!signedInUserId) {
      await signOut();
      setSubmitting(false);
      setError('Không thể xác minh tài khoản sau khi đăng nhập.');
      return;
    }

    const role = await resolveUserRole(signedInUserId);
    if (!hasRoleAccess(role)) {
      await signOut();
      setSubmitting(false);
      setError('Bạn không có quyền truy cập khu vực này.');
      return;
    }

    setSubmitting(false);
    navigate('/staff-dashboard', { replace: true });
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 overflow-hidden">
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-sky-300/30 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-indigo-300/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 left-1/3 w-72 h-72 bg-teal-300/25 rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 bg-white/90 backdrop-blur-sm border border-white/70 rounded-3xl overflow-hidden shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)]">
          <div className="p-8 sm:p-10 bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-800">
            <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-white/15 mb-6">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">{title}</h1>
            <p className="text-blue-100">{subtitle}</p>
            <div className="mt-8 space-y-3 text-sm text-blue-100/90">
              <p>- Quản lý đơn hàng và trạng thái giao hàng</p>
              <p>- Cập nhật sản phẩm, danh mục và tồn kho</p>
              <p>- Xử lý yêu cầu hỗ trợ khách hàng</p>
            </div>
          </div>

          <div className="p-8 sm:p-10 bg-white/95 text-gray-900">
            <h2 className="text-2xl font-bold mb-2">Xác thực tài khoản</h2>
            <p className="text-sm text-gray-500 mb-6">Vui lòng dùng tài khoản đã được cấp quyền.</p>

            {error && (
              <div className="mb-5 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="staff@nikashop.com"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-60"
              >
                {submitting ? 'Đang đăng nhập...' : (
                  <>
                    Đăng nhập
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-sm text-gray-500">
              Đăng nhập khách hàng?{' '}
              <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-700">
                Chuyển về trang khách hàng
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
