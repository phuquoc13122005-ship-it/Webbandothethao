import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, ShoppingCart, Minus, Plus, Truck, Shield, RotateCcw,
  ChevronRight, Heart,
} from 'lucide-react';
import { db } from '../lib/db';
import type { Product } from '../types';
import { formatPrice, getDiscountPercent } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import ProductCard from '../components/ui/ProductCard';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const shoeSizes = Array.from({ length: 10 }, (_, i) => i + 36);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setQuantity(1);
      setSelectedSize(null);
      const { data } = await db
        .from('products')
        .select('*, categories(*)')
        .eq('slug', slug)
        .maybeSingle();

      if (!data) {
        setLoading(false);
        return;
      }

      setProduct(data);

      const { data: rel } = await db
        .from('products')
        .select('*')
        .eq('category_id', data.category_id)
        .neq('id', data.id)
        .limit(4);
      setRelated(rel || []);
      setLoading(false);
    }
    load();
  }, [slug]);

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!product) return;
    if (selectedSize == null) {
      window.alert('chọn size giày');
      return;
    }
    setAdding(true);
    await addToCart(product.id, quantity, selectedSize);
    setAdding(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">Không tìm thấy sản phẩm</p>
        <Link to="/products" className="text-teal-600 font-medium hover:text-teal-700">
          Quay lại cửa hàng
        </Link>
      </div>
    );
  }

  const discount = getDiscountPercent(product.price, product.original_price);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/" className="hover:text-teal-600 transition-colors">Trang chủ</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/products" className="hover:text-teal-600 transition-colors">Sản phẩm</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-900 font-medium truncate">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 mb-20">
        <div className="relative aspect-square rounded-3xl overflow-hidden bg-gray-100">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {discount > 0 && (
            <span className="absolute top-6 left-6 px-3 py-1.5 bg-rose-500 text-white text-sm font-bold rounded-xl">
              -{discount}%
            </span>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <div className="mb-4">
            <p className="text-sm font-medium text-teal-600 mb-2">{product.brand}</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.round(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {product.rating} ({product.reviews_count} đánh giá)
              </span>
            </div>

            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-lg text-gray-400 line-through">{formatPrice(product.original_price)}</span>
              )}
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed mb-8">{product.description}</p>

          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Size giày:</p>
            <div className="flex flex-wrap gap-2">
              {shoeSizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`min-w-12 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    selectedSize === size
                      ? 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-700 hover:border-teal-300'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <span className="text-sm font-medium text-gray-700">Số lượng:</span>
            <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-14 text-center text-sm font-semibold text-gray-900 border-x border-gray-200 py-2.5">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <span className="text-sm text-gray-500">
              Còn {product.stock} sản phẩm
            </span>
          </div>

          <div className="flex gap-3 mb-8">
            <button
              onClick={handleAddToCart}
              disabled={adding || product.stock === 0}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-teal-500/25 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {adding ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  Thêm vào giỏ
                </>
              )}
            </button>
            <button className="w-14 h-14 flex items-center justify-center border border-gray-200 rounded-2xl text-gray-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all">
              <Heart className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Truck, label: 'Miễn phí ship' },
              { icon: Shield, label: 'Chính hãng' },
              { icon: RotateCcw, label: 'Đổi trả 30 ngày' },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl">
                <item.icon className="w-5 h-5 text-teal-600" />
                <span className="text-xs font-medium text-gray-600 text-center">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Sản phẩm liên quan</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {related.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
