import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/db';

const DEFAULT_ABOUT_CONTENT = [
  'Shop thể thao của chúng tôi được xây dựng với mục tiêu mang sản phẩm chính hãng đến gần hơn với người dùng Việt Nam.',
  'Đội ngũ luôn kiểm soát chất lượng, tư vấn đúng nhu cầu và duy trì dịch vụ hậu mãi rõ ràng để khách hàng yên tâm mua sắm.',
  'Chúng tôi không ngừng mở rộng danh mục, cập nhật mẫu mới và tối ưu trải nghiệm để phục vụ cộng đồng yêu thể thao tốt hơn mỗi ngày.',
].join('\n\n');

export default function AboutPage() {
  const [content, setContent] = useState(DEFAULT_ABOUT_CONTENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAboutContent() {
      const { data, error } = await db
        .from('site_contents')
        .select('*')
        .eq('content_key', 'about_page')
        .maybeSingle();

      if (!active) return;
      if (!error && data && String((data as any).content_value || '').trim()) {
        setContent(String((data as any).content_value || ''));
      }
      setLoading(false);
    }

    loadAboutContent();
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

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 uppercase mb-6">Giới thiệu</h1>
      {loading ? (
        <p className="text-slate-500">Đang tải nội dung...</p>
      ) : (
        <div className="space-y-4 text-lg leading-8 text-slate-700">
          {paragraphs.length === 0 ? (
            <p>Chưa có nội dung giới thiệu.</p>
          ) : (
            paragraphs.map((paragraph, index) => (
              <p key={`about-paragraph-${index}`}>{paragraph}</p>
            ))
          )}
        </div>
      )}
    </section>
  );
}
