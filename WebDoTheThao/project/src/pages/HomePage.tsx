import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Truck, Shield, RotateCcw, Headphones,
  ChevronRight, Flame, Tag,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../types';
import ProductCard from '../components/ui/ProductCard';

let homePageCache: {
  featured: Product[];
  categories: Category[];
  allProducts: Product[];
} | null = null;

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>(homePageCache?.featured || []);
  const [categories, setCategories] = useState<Category[]>(homePageCache?.categories || []);
  const [allProducts, setAllProducts] = useState<Product[]>(homePageCache?.allProducts || []);
  const [loading, setLoading] = useState(!homePageCache);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!homePageCache) setLoading(true);
      const [featuredRes, catRes, productsRes] = await Promise.all([
        supabase.from('products').select('*').eq('featured', true).limit(4),
        supabase.from('categories').select('*').order('created_at'),
        supabase.from('products').select('*').order('created_at', { ascending: false }).limit(8),
      ]);

      if (!active) return;

      const nextFeatured = featuredRes.data || [];
      const nextCategories = catRes.data || [];
      const nextAllProducts = productsRes.data || [];

      setFeatured(nextFeatured);
      setCategories(nextCategories);
      setAllProducts(nextAllProducts);
      homePageCache = {
        featured: nextFeatured,
        categories: nextCategories,
        allProducts: nextAllProducts,
      };
      setLoading(false);
    }
    load();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/3764014/pexels-photo-3764014.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Hero"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/70 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-8">
              <Flame className="w-4 h-4 text-teal-400" />
              <span className="text-sm font-medium text-teal-300">Giảm giá đến 50% - Mua ngay!</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Đồ thể thao<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                chính hãng
              </span>
            </h1>
            <p className="text-lg text-gray-300 mb-10 max-w-lg leading-relaxed">
              Khám phá bộ sưu tập đồ thể thao từ các thương hiệu hàng đầu thế giới. Chất lượng vượt trội, giá cả hợp lý.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-teal-500/25 transition-all active:scale-[0.98]"
              >
                Mua sắm ngay
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/products?category=giay-the-thao"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/20 hover:bg-white/20 transition-all"
              >
                Xem giày hot
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 mb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Truck, title: 'Miễn phí vận chuyển', desc: 'Đơn hàng từ 500K', color: 'text-teal-600 bg-teal-50' },
            { icon: Shield, title: 'Hàng chính hãng', desc: 'Bảo đảm 100%', color: 'text-blue-600 bg-blue-50' },
            { icon: RotateCcw, title: 'Đổi trả 30 ngày', desc: 'Không mất phí', color: 'text-amber-600 bg-amber-50' },
            { icon: Headphones, title: 'Hỗ trợ 24/7', desc: 'Liên hệ bất kỳ lúc nào', color: 'text-rose-600 bg-rose-50' },
          ].map(item => (
            <div key={item.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Danh mục sản phẩm</h2>
            <p className="text-gray-500 mt-1">Khám phá các danh mục đồ thể thao</p>
          </div>
          <Link to="/products" className="hidden sm:flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
            Xem tất cả <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map(cat => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="group relative aspect-[4/5] rounded-2xl overflow-hidden"
            >
              <img
                src={cat.image_url}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-sm font-semibold text-white">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Sản phẩm nổi bật</h2>
              <p className="text-gray-500 mt-0.5 text-sm">Được yêu thích nhất</p>
            </div>
          </div>
          <Link to="/products" className="hidden sm:flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
            Xem tất cả <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {featured.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-br from-teal-600 to-emerald-700 mb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full mb-6">
                <Tag className="w-4 h-4 text-teal-200" />
                <span className="text-sm font-medium text-teal-100">Khuyến mãi đặc biệt</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Giảm đến 50% cho<br />bộ sưu tập mới
              </h2>
              <p className="text-teal-100/80 mb-8 max-w-md">
                Đừng bỏ lỡ cơ hội sở hữu những sản phẩm thể thao chất lượng với giá ưu đãi nhất.
              </p>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-teal-700 font-semibold rounded-2xl hover:shadow-xl transition-all active:scale-[0.98]"
              >
                Mua ngay
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              {featured.slice(0, 2).map(product => (
                <Link
                  key={product.id}
                  to={`/products/${product.slug}`}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/20 transition-colors"
                >
                  <div className="aspect-square rounded-xl overflow-hidden mb-3">
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate">{product.name}</h3>
                  <p className="text-teal-200 text-sm font-bold mt-1">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sản phẩm mới nhất</h2>
            <p className="text-gray-500 mt-1">Cập nhật liên tục</p>
          </div>
          <Link to="/products" className="hidden sm:flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
            Xem tất cả <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {allProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
