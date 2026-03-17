import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error_description') ?? params.get('error');
    if (oauthError) {
      navigate(`/login?error=${encodeURIComponent(oauthError)}`, { replace: true });
      return;
    }

    const finalizeAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error) {
        navigate(`/login?error=${encodeURIComponent(error.message)}`, { replace: true });
        return;
      }

      if (data.session) {
        navigate('/', { replace: true });
        return;
      }

      navigate('/login?error=' + encodeURIComponent('Đăng nhập Google thất bại, vui lòng thử lại.'), { replace: true });
    };

    finalizeAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-600">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" />
        <p>Đang xác thực Google...</p>
      </div>
    </div>
  );
}
