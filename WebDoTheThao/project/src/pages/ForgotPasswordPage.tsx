import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { db } from '../lib/db';

function formatAuthError(err: unknown): string {
  if (err == null) return 'Không thể hoàn tất thao tác.';
  const msg = typeof err === 'string' ? err : (err as { message?: string }).message;
  const map: Record<string, string> = {
    EMAIL_INVALID: 'Email không hợp lệ.',
    USER_NOT_FOUND: 'Không tìm thấy tài khoản với email này.',
    INVALID_RESET_CODE: 'Mã xác nhận không hợp lệ hoặc đã hết hạn.',
    INVALID_PASSWORD: 'Mật khẩu phải có ít nhất 6 ký tự.',
    'Request failed': 'Không kết nối được máy chủ. Hãy chạy API (npm run dev:auth).',
  };
  return map[msg || ''] || msg || 'Không thể hoàn tất thao tác.';
}

function generateCaptchaCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [captchaCode, setCaptchaCode] = useState(() => generateCaptchaCode());
  const [captchaInput, setCaptchaInput] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [sendingRequest, setSendingRequest] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const isConfirmMode = searchParams.get('xac_nhan') === '1';

  useEffect(() => {
    const emailFromLink = String(searchParams.get('email') || '').trim();
    const codeFromLink = String(searchParams.get('ma_xac_nhan') || '').trim().toUpperCase();
    if (emailFromLink) setEmail(emailFromLink);
    if (codeFromLink) setVerificationCode(codeFromLink);
  }, [searchParams]);

  const canSend = useMemo(
    () => Boolean(email.trim()) && Boolean(captchaInput.trim()) && !sendingRequest,
    [email, captchaInput, sendingRequest],
  );

  const canVerifyCode = useMemo(
    () => Boolean(email.trim()) && Boolean(verificationCode.trim()) && !verifyingCode && !codeVerified,
    [email, verificationCode, verifyingCode, codeVerified],
  );

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    const normalizedCaptcha = captchaInput.trim();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    if (normalizedCaptcha !== captchaCode) {
      setError('Mã captcha không đúng. Vui lòng thử lại.');
      setCaptchaInput('');
      setCaptchaCode(generateCaptchaCode());
      return;
    }

    setError('');
    setInfo('');
    setSendingRequest(true);
    try {
      const { error: requestError, data } = await db.auth.requestPasswordResetLink({ email: normalizedEmail });
      if (requestError) {
        setError(formatAuthError(requestError));
        setCaptchaCode(generateCaptchaCode());
        setCaptchaInput('');
        return;
      }

      if (data?.deliveredViaEmail) {
        setInfo('Đã gửi email khôi phục mật khẩu. Hãy kiểm tra hộp thư (kể cả Spam) và bấm vào link xác nhận.');
      } else {
        const previewLink = data?.preview?.resetLink ? `\nLink test local: ${data.preview.resetLink}` : '';
        const previewCode = data?.preview?.confirmationCode ? `\nMã xác nhận: ${data.preview.confirmationCode}` : '';
        setInfo(
          `Server chưa cấu hình SMTP nên chưa gửi email thật. Dùng thông tin test local bên dưới.${previewLink}${previewCode}`,
        );
      }
      setCaptchaCode(generateCaptchaCode());
      setCaptchaInput('');
    } catch {
      setError('Không kết nối được máy chủ. Hãy chạy API (npm run dev:auth).');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canVerifyCode) return;

    setError('');
    setInfo('');
    setVerifyingCode(true);
    try {
      const { error: verifyError } = await db.auth.verifyPasswordResetCode({
        email: email.trim(),
        code: verificationCode.trim().toUpperCase(),
      });
      if (verifyError) {
        setCodeVerified(false);
        setError(formatAuthError(verifyError));
        return;
      }

      setCodeVerified(true);
      setInfo('Xác nhận thành công. Bạn có thể thiết lập mật khẩu mới.');
    } catch {
      setCodeVerified(false);
      setError('Không kết nối được máy chủ. Hãy chạy API (npm run dev:auth).');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!codeVerified) {
      setError('Vui lòng xác nhận mã trước khi đặt lại mật khẩu.');
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
    try {
      const { error: resetError } = await db.auth.resetPasswordWithCode({
        email: email.trim(),
        code: verificationCode.trim().toUpperCase(),
        password,
      });
      if (resetError) {
        setError(formatAuthError(resetError));
        return;
      }

      window.alert('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
      navigate('/login', { replace: true });
    } catch {
      setError('Không kết nối được máy chủ. Hãy chạy API (npm run dev:auth).');
    } finally {
      setSubmittingPassword(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-100 px-4 py-10">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
        <h1 className="text-center text-4xl font-bold tracking-wide text-orange-600 mb-4">QUÊN MẬT KHẨU</h1>
        <div className="w-56 h-2 bg-slate-200 rounded-full mx-auto mb-8 overflow-hidden">
          <div className="w-16 h-full bg-orange-500 rounded-full mx-auto" />
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm whitespace-pre-line">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm whitespace-pre-line">
            {info}
          </div>
        )}

        {!isConfirmMode && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full h-14 px-4 border border-slate-300 rounded-md text-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
            />
            <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
              <input
                type="text"
                value={captchaInput}
                onChange={event => setCaptchaInput(event.target.value.replace(/\s/g, ''))}
                placeholder="Mã captcha"
                className="h-14 px-4 border border-slate-300 rounded-md text-3xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
              />
              <button
                type="button"
                onClick={() => setCaptchaCode(generateCaptchaCode())}
                className="h-14 min-w-32 px-4 border border-slate-300 rounded-md bg-gray-50 text-black text-4xl tracking-[0.2em] font-mono"
                title="Đổi captcha"
              >
                {captchaCode}
              </button>
            </div>
            <button
              type="submit"
              disabled={!canSend}
              className="w-full h-14 rounded-md bg-orange-600 text-white text-3xl font-semibold hover:bg-orange-700 disabled:opacity-60"
            >
              {sendingRequest ? 'ĐANG GỬI...' : 'LẤY LẠI MẬT KHẨU'}
            </button>
          </form>
        )}

        {isConfirmMode && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full h-14 px-4 border border-slate-300 rounded-md text-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
            />
            <input
              type="text"
              value={verificationCode}
              onChange={event => setVerificationCode(event.target.value.toUpperCase())}
              placeholder="Mã xác nhận"
              className="w-full h-14 px-4 border border-slate-300 rounded-md text-3xl tracking-[0.08em] font-mono outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
            />
            <button
              type="submit"
              disabled={!canVerifyCode}
              className="w-full h-14 rounded-md bg-orange-600 text-white text-3xl font-semibold hover:bg-orange-700 disabled:opacity-60"
            >
              {verifyingCode ? 'ĐANG XÁC NHẬN...' : codeVerified ? 'ĐÃ XÁC NHẬN' : 'LẤY LẠI MẬT KHẨU'}
            </button>
          </form>
        )}

        {isConfirmMode && codeVerified && (
          <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Mật khẩu mới"
                className="w-full h-14 px-4 pr-12 border border-slate-300 rounded-md text-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
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
                className="w-full h-14 px-4 pr-12 border border-slate-300 rounded-md text-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={submittingPassword}
              className="w-full h-14 rounded-md bg-orange-600 text-white text-2xl font-semibold hover:bg-orange-700 disabled:opacity-60"
            >
              {submittingPassword ? 'ĐANG CẬP NHẬT...' : 'THIẾT LẬP MẬT KHẨU MỚI'}
            </button>
          </form>
        )}

        <p className="mt-6 text-right text-3xl text-slate-700">
          <Link to="/login" className="hover:text-orange-600">Đăng nhập tại đây</Link>
        </p>
      </div>
    </div>
  );
}
