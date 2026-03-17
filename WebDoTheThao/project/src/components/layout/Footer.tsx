import { Link } from 'react-router-dom';
import { Dumbbell, Phone, Mail, MapPin, Facebook, Instagram, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Nika<span className="text-teal-400">Shop</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400 mb-6">
              Cung cấp đồ thể thao chính hãng từ các thương hiệu hàng đầu thế giới.
              Chất lượng đảm bảo, giá cả hợp lý.
            </p>
            <div className="flex gap-3">
              {[Facebook, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 bg-gray-800 hover:bg-teal-600 rounded-xl flex items-center justify-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-6">Danh mục</h3>
            <ul className="space-y-3">
              {[
                { label: 'Giày thể thao', to: '/products?category=giay-the-thao' },
                { label: 'Quần áo thể thao', to: '/products?category=quan-ao-the-thao' },
                { label: 'Phụ kiện', to: '/products?category=phu-kien-the-thao' },
                { label: 'Dụng cụ tập gym', to: '/products?category=dung-cu-tap-gym' },
                { label: 'Bóng thể thao', to: '/products?category=bong-the-thao' },
              ].map(item => (
                <li key={item.to}>
                  <Link to={item.to} className="text-sm text-gray-400 hover:text-teal-400 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-6">Hỗ trợ</h3>
            <ul className="space-y-3">
              {['Chính sách đổi trả', 'Chính sách bảo hành', 'Hướng dẫn mua hàng', 'Phương thức thanh toán', 'Vận chuyển giao hàng'].map(item => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-6">Liên hệ</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-400">123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-teal-400 flex-shrink-0" />
                <span className="text-sm text-gray-400">1900 1234</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-teal-400 flex-shrink-0" />
                <span className="text-sm text-gray-400">support@sportzone.vn</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">&copy; 2026 Nika Shop. Tất cả quyền được bảo lưu.</p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Điều khoản sử dụng</a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Chính sách bảo mật</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
