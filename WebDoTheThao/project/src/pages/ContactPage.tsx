import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/db';

const DEFAULT_CONTACT_CONTENT = [
  'Nếu bạn cần hỗ trợ về sản phẩm, đơn hàng hoặc chính sách bảo hành, vui lòng liên hệ với chúng tôi qua các kênh bên dưới.',
  'Đội ngũ tư vấn luôn sẵn sàng phản hồi nhanh chóng để giúp bạn chọn đúng sản phẩm và giải quyết vấn đề trong quá trình mua sắm.',
  'Bạn cũng có thể để lại thông tin liên hệ để chúng tôi gọi lại và hỗ trợ chi tiết theo nhu cầu.',
].join('\n\n');

export default function ContactPage() {
  const [content, setContent] = useState(DEFAULT_CONTACT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadContactContent() {
      const { data, error } = await db
        .from('site_contents')
        .select('*')
        .eq('content_key', 'contact_page')
        .maybeSingle();

      if (!active) return;
      if (!error && data && String((data as any).content_value || '').trim()) {
        setContent(String((data as any).content_value || ''));
      }
      setLoading(false);
    }

    loadContactContent();
    return () => {
      active = false;
    };
  }, []);

  const paragraphs = useMemo(
    () => String(content || '')
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean),
    [content],
  );

  const handleSubmitSupport = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const normalizedMessage = message.trim();

    if (!normalizedName || !normalizedEmail || !normalizedPhone || !normalizedMessage) {
      setSubmitError('Vui lòng nhập đầy đủ họ tên, email, điện thoại và nội dung.');
      setSubmitMessage('');
      return;
    }
    if (!normalizedEmail.includes('@')) {
      setSubmitError('Email không hợp lệ.');
      setSubmitMessage('');
      return;
    }

    setSubmitError('');
    setSubmitMessage('');
    setSubmitting(true);
    const { error } = await db.submitSupportRequest({
      fullName: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      message: normalizedMessage,
    });
    setSubmitting(false);

    if (error) {
      setSubmitError(error.message || 'Không thể gửi yêu cầu hỗ trợ. Vui lòng thử lại.');
      return;
    }

    setFullName('');
    setEmail('');
    setPhone('');
    setMessage('');
    setSubmitMessage('Đã gửi yêu cầu hỗ trợ thành công. Bộ phận CSKH sẽ liên hệ sớm.');
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 uppercase mb-6">Liên hệ</h1>
      {loading ? (
        <p className="text-slate-500">Đang tải nội dung...</p>
      ) : (
        <div className="space-y-4 text-lg leading-8 text-slate-700">
          {paragraphs.length === 0 ? (
            <p>Chưa có nội dung liên hệ.</p>
          ) : (
            paragraphs.map((paragraph, index) => (
              <p key={`contact-paragraph-${index}`}>{paragraph}</p>
            ))
          )}
        </div>
      )}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-2xl font-extrabold text-slate-900 uppercase mb-5">Liên hệ với chúng tôi</h2>
        <form onSubmit={handleSubmitSupport} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={fullName}
              onChange={event => setFullName(event.target.value)}
              placeholder="Họ và tên"
              className="h-12 rounded-xl border border-slate-200 px-4 text-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
            />
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="Email"
              className="h-12 rounded-xl border border-slate-200 px-4 text-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
            />
          </div>
          <input
            type="text"
            value={phone}
            onChange={event => setPhone(event.target.value)}
            placeholder="Điện thoại"
            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
          <textarea
            value={message}
            onChange={event => setMessage(event.target.value)}
            placeholder="Nội dung"
            rows={7}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg text-slate-700 bg-white resize-y focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
          {submitError && <p className="text-sm text-rose-600">{submitError}</p>}
          {submitMessage && <p className="text-sm text-emerald-700">{submitMessage}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="h-11 px-6 rounded-lg text-base font-semibold text-white bg-blue-800 hover:bg-blue-900 disabled:opacity-50"
          >
            {submitting ? 'Đang gửi...' : 'Gửi thông tin'}
          </button>
        </form>
      </div>
    </section>
  );
}
