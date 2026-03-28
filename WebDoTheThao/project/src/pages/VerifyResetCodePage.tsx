import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Dumbbell } from 'lucide-react';
import { db } from '../lib/db';

export default function VerifyResetCodePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('email') || '';
  }, [location.search]);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) {
      setError('Thiếu email xác minh. Vui lòng quay lại bước trước.');
      return;
    }

    setError('');
    setLoading(true);

    const { error: verifyError } = await db.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    });

    setLoading(false);
    if (verifyError) {
      setError('Mã xác minh không hợp lệ hoặc đã hết hạn.');
      return;
    }

    navigate('/reset-password', { replace: true });
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 sm:px-8 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Nika<span className="text-teal-600">Shop</span>
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nhập mã xác minh</h2>
          <p className="text-gray-500">
            Mã đã được gửi đến: <span className="font-medium text-gray-700">{email || '---'}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleVerifyCode} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mã xác minh</label>
            <input
              type="text"
              required
              value={code}
              onChange={event => setCode(event.target.value)}
              placeholder="Nhập mã gồm 6 ký tự"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang xác minh...' : (
              <>
                Tiếp tục
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          Sai email?{' '}
          <Link to="/forgot-password" className="font-semibold text-teal-600 hover:text-teal-700 transition-colors">
            Quay lại
          </Link>
        </p>
      </div>
    </div>
  );
}
