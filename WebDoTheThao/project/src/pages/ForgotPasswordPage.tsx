import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Dumbbell, Eye, EyeOff, X } from 'lucide-react';

function getAuthServerBaseUrl() {
  const configuredUrl = import.meta.env.VITE_AUTH_SERVER_URL;
  if (configuredUrl && configuredUrl.trim()) {
    return configuredUrl.replace(/\/$/, '');
  }
  return 'http://localhost:4000';
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resetToken, setResetToken] = useState('');

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const canSendCode = useMemo(
    () => Boolean(email.trim()) && !sendingCode && countdown === 0,
    [email, sendingCode, countdown],
  );

  const handleSendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return;
    }

    setError('');
    setInfo('');
    setSendingCode(true);

    const response = await fetch(`${getAuthServerBaseUrl()}/auth/password/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.trim() }),
    });
    const payload = await response.json().catch(() => ({}));

    setSendingCode(false);
    if (!response.ok) {
      setError(payload?.error || 'Không thể gửi mã xác minh.');
      return;
    }

    setCodeSent(true);
    setCodeVerified(false);
    setResetToken('');
    setOtpCode('');
    setCountdown(60);
    setInfo('Mã xác minh đã được gửi về email của bạn.');
  };

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    const verifyCode = async () => {
      if (!codeSent || codeVerified || verifyingCode) return;
      if (otpCode.trim().length < 6) return;

      setVerifyingCode(true);
      setError('');
      setInfo('');
      const response = await fetch(`${getAuthServerBaseUrl()}/auth/password/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), code: otpCode.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      setVerifyingCode(false);

      if (!response.ok || !payload?.resetToken) {
        setCodeVerified(false);
        setResetToken('');
        setError(payload?.error || 'Mã xác minh không hợp lệ hoặc đã hết hạn.');
        return;
      }

      setCodeVerified(true);
      setResetToken(payload.resetToken);
      setInfo('Xác minh thành công. Hãy nhập mật khẩu mới.');
    };

    verifyCode();
  }, [codeSent, codeVerified, email, otpCode, verifyingCode]);

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!codeVerified) {
      setError('Vui lòng nhập đúng mã xác minh.');
      return;
    }
    if (!resetToken) {
      setError('Phiên xác minh không hợp lệ, vui lòng gửi mã lại.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setError('');
    setInfo('');
    setSubmittingPassword(true);
    const response = await fetch(`${getAuthServerBaseUrl()}/auth/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: email.trim(),
        newPassword: password,
        resetToken,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSubmittingPassword(false);

    if (!response.ok) {
      setError(payload?.error || 'Không thể đặt lại mật khẩu.');
      return;
    }

    window.alert('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 flex items-center justify-center"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 mb-5">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">Quên mật khẩu?</h2>
          <p className="text-gray-500 text-lg">
            Nhập email hoặc username của bạn và chúng tôi sẽ gửi cho bạn mã khôi phục mật khẩu.
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-6 px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-700">
            {info}
          </div>
        )}

        <form onSubmit={handleSendCode} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Tên đăng nhập</label>
            <input
              type="text"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="Email hoặc Username"
              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-full text-lg focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all"
            />
          </div>

          <div className="flex items-center rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
            <input
              type="text"
              value={otpCode}
              onChange={event => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Nhập mã xác nhận 6 số"
              inputMode="numeric"
              maxLength={6}
              className="flex-1 bg-transparent px-5 py-3.5 text-lg outline-none"
              disabled={!codeSent}
            />
            <button
              type="submit"
              disabled={!canSendCode}
              className="px-7 py-3.5 text-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sendingCode ? 'Đang gửi...' : countdown > 0 ? `Gửi lại (${countdown}s)` : 'Gửi mã'}
            </button>
          </div>
        </form>

        <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Mật khẩu mới"
              disabled={!codeVerified}
              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-full text-lg outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 disabled:bg-gray-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={!codeVerified}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              placeholder="Xác nhận mật khẩu mới"
              disabled={!codeVerified}
              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-full text-lg outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 disabled:bg-gray-100"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={!codeVerified}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={!codeVerified || submittingPassword || verifyingCode}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-sky-300 to-teal-300 text-white text-xl font-semibold rounded-full transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submittingPassword ? 'Đang đặt lại...' : (
              <>
                Đặt lại mật khẩu
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Việc bạn tiếp tục sử dụng trang web này đồng nghĩa bạn đồng ý với{' '}
          <Link to="#" className="underline hover:text-gray-700">điều khoản sử dụng</Link> của chúng tôi.
        </p>
      </div>
    </div>
  );
}
