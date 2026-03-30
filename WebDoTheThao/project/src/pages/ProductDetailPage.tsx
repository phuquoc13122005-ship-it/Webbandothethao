import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, ShoppingCart, Minus, Plus, Truck, Shield, RotateCcw, CheckCircle2, Store,
  ChevronRight, Heart,
} from 'lucide-react';
import { db } from '../lib/db';
import type { Product } from '../types';
import { formatPrice, getDiscountPercent } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import ProductCard from '../components/ui/ProductCard';

function parseOptionList(rawValue: string) {
  const normalized = String(rawValue || '').trim();
  if (!normalized) return [];
  const commaSplit = normalized
    .split(/[;,]/)
    .map(item => item.trim())
    .filter(Boolean);
  if (commaSplit.length > 1) return commaSplit;
  if (normalized.includes(' / ')) {
    return normalized
      .split(/\s+\/\s+/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return commaSplit;
}

function parseImageGallery(rawValue?: string | null, mainImageUrl?: string | null) {
  const result: string[] = [];
  if (mainImageUrl) result.push(String(mainImageUrl));
  if (!rawValue) return result;
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === 'string' && item.trim()) {
          result.push(item.trim());
        }
      }
    }
  } catch {
    return result;
  }
  return Array.from(new Set(result));
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [activeTab, setActiveTab] = useState<'description' | 'specs'>('description');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const sizeOptions = useMemo(() => {
    const raw = parseOptionList(String(product?.size_options || ''));
    if (raw.length > 0) return raw;
    if (product?.size_type === 'apparel' || product?.categories?.size_type === 'apparel') return ['S', 'M', 'L', 'XL', '2XL'];
    if (product?.size_type === 'shoes' || product?.categories?.size_type === 'shoes') return ['36', '37', '38', '39', '40', '41', '42'];
    return [];
  }, [product?.size_options, product?.size_type, product?.categories?.size_type]);
  const colorOptions = useMemo(() => {
    const raw = parseOptionList(String(product?.color_options || ''));
    return raw.length > 0 ? raw : ['Mặc định'];
  }, [product?.color_options]);
  const requiresNumericSize = useMemo(
    () => sizeOptions.length > 0 && sizeOptions.every(item => /^\d+$/.test(item)),
    [sizeOptions],
  );
  const sizeStockMap = useMemo(() => {
    if (!product?.size_stock) return {} as Record<string, number>;
    try {
      const parsed = JSON.parse(product.size_stock) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, Math.floor(Number(value) || 0)]),
      ) as Record<string, number>;
    } catch {
      return {};
    }
  }, [product?.size_stock]);
  const hasSizeStockMap = useMemo(() => Object.keys(sizeStockMap).length > 0, [sizeStockMap]);
  const inStockSizeOptions = useMemo(() => {
    if (!hasSizeStockMap) return sizeOptions;
    return sizeOptions.filter(size => Number(sizeStockMap[size] || 0) > 0);
  }, [hasSizeStockMap, sizeOptions, sizeStockMap]);
  const selectedSizeStock = useMemo(() => {
    if (!selectedSize) return null;
    if (!hasSizeStockMap) return null;
    if (!Object.prototype.hasOwnProperty.call(sizeStockMap, selectedSize)) return null;
    return Math.max(0, Number(sizeStockMap[selectedSize] || 0));
  }, [selectedSize, hasSizeStockMap, sizeStockMap]);
  const availableStock = selectedSizeStock ?? product?.stock ?? 0;
  const galleryImages = useMemo(
    () => parseImageGallery(product?.image_gallery, product?.image_url),
    [product?.image_gallery, product?.image_url],
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      setQuantity(1);
      setSelectedSize(null);
      setSelectedColor('');
      setSelectedImage('');
      setActiveTab('description');
      try {
        const { data } = await db
          .from('products')
          .select('*, categories(*)')
          .eq('slug', slug)
          .maybeSingle();

        if (!data) {
          setProduct(null);
          setRelated([]);
          return;
        }

        setProduct(data);

        // mysqlApiClient doesn't support .neq(), so filter in client.
        const { data: rel } = await db
          .from('products')
          .select('*')
          .eq('category_id', data.category_id);
        setRelated(((rel || []) as Product[]).filter(item => item.id !== data.id).slice(0, 4));
      } catch {
        setProduct(null);
        setRelated([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (colorOptions.length > 0) {
      setSelectedColor(colorOptions[0]);
    }
  }, [colorOptions]);
  useEffect(() => {
    if (galleryImages.length > 0) {
      setSelectedImage(galleryImages[0]);
      return;
    }
    setSelectedImage(product?.image_url || '');
  }, [galleryImages, product?.image_url]);
  useEffect(() => {
    if (inStockSizeOptions.length > 0) {
      if (selectedSize && inStockSizeOptions.includes(selectedSize)) return;
      setSelectedSize(inStockSizeOptions[0]);
      return;
    }
    if (sizeOptions.length > 0 && !selectedSize) {
      setSelectedSize(sizeOptions[0]);
      return;
    }
    if (sizeOptions.length === 0) {
      setSelectedSize(null);
    }
  }, [inStockSizeOptions, sizeOptions, selectedSize]);

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!product) return;
    if (sizeOptions.length > 0 && selectedSize == null) {
      window.alert('Vui lòng chọn size');
      return;
    }
    if (hasSizeStockMap && selectedSize && Number(sizeStockMap[selectedSize] || 0) <= 0) {
      window.alert('Size này hiện đã hết hàng.');
      return;
    }
    const numericSize = selectedSize && /^\d+$/.test(selectedSize) ? Number(selectedSize) : null;
    if (requiresNumericSize && numericSize == null) {
      window.alert('Size không hợp lệ cho sản phẩm giày.');
      return;
    }
    setAdding(true);
    await addToCart(product.id, quantity, numericSize);
    setAdding(false);
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    if (user) {
      navigate('/cart');
    }
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
        <div>
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-slate-200">
            <img src={selectedImage || product.image_url} alt={product.name} className="w-full h-full object-cover" />
            {discount > 0 && (
              <span className="absolute top-4 left-4 px-3 py-1 bg-rose-500 text-white text-xs font-bold rounded-lg">
                -{discount}%
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {galleryImages.map((imageUrl, idx) => (
              <button
                key={`${imageUrl}-${idx}`}
                type="button"
                onClick={() => setSelectedImage(imageUrl)}
                className={`aspect-square rounded-lg border overflow-hidden bg-slate-50 ${
                  selectedImage === imageUrl ? 'border-teal-500' : 'border-slate-200'
                }`}
              >
                <img src={imageUrl} alt={`${product.name}-${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-xs text-slate-500 mb-2">Thương hiệu: <span className="font-semibold text-teal-600">{product.brand || 'NikaSports'}</span></p>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.name}</h1>
            <p className="text-sm text-slate-500 mt-1">Tình trạng: {product.stock > 0 ? <span className="text-emerald-600 font-semibold">Còn hàng</span> : <span className="text-rose-600 font-semibold">Hết hàng</span>}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">{product.rating} ({product.reviews_count} đánh giá)</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-rose-600">{formatPrice(product.price)}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-base text-gray-400 line-through">{formatPrice(product.original_price)}</span>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Chọn màu sắc:</p>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map(color => (
                <label
                  key={color}
                  className={`inline-flex items-center gap-2 h-11 px-3 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
                    selectedColor === color
                      ? 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-slate-200 text-slate-700 hover:border-teal-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="product-color"
                    checked={selectedColor === color}
                    onChange={() => setSelectedColor(color)}
                    className="w-4 h-4 border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>{color}</span>
                </label>
              ))}
            </div>
          </div>

          {sizeOptions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Chọn size:</p>
              {inStockSizeOptions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {inStockSizeOptions.map(size => {
                    const checked = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-14 h-11 px-3 rounded-lg border text-sm font-semibold transition-colors ${
                          checked
                            ? 'border-teal-600 bg-teal-50 text-teal-700'
                            : 'border-slate-200 text-slate-700 hover:border-teal-300'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  Sản phẩm hiện đã hết size.
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Số lượng:</span>
            <div className="flex items-center gap-0 border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-14 text-center text-sm font-semibold text-gray-900 border-x border-slate-200 py-2.5">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(Math.max(1, availableStock), quantity + 1))}
                className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <span className="text-sm text-gray-500">Còn {availableStock} sản phẩm</span>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2 text-sm">
            <p className="font-semibold text-emerald-800">Khuyến mãi ưu đãi</p>
            <p className="inline-flex items-center gap-2 text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Tặng tất thể thao cho đơn từ 500.000đ</p>
            <p className="inline-flex items-center gap-2 text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Cam kết hàng chính hãng 100%</p>
            <p className="inline-flex items-center gap-2 text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Đổi trả trong 30 ngày nếu lỗi</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBuyNow}
              disabled={adding || availableStock === 0}
              className="flex-1 px-6 py-3.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-60"
            >
              Mua ngay
            </button>
            <button
              onClick={handleAddToCart}
              disabled={adding || availableStock === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60"
            >
              <ShoppingCart className="w-5 h-5" />
              Thêm vào giỏ hàng
            </button>
            <button className="w-12 h-12 flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:text-rose-500 hover:border-rose-200">
              <Heart className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Truck, label: 'Vận chuyển toàn quốc' },
              { icon: Shield, label: 'Chính hãng' },
              { icon: RotateCcw, label: 'Đổi trả nếu lỗi' },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <item.icon className="w-5 h-5 text-teal-600" />
                <span className="text-xs font-medium text-gray-600 text-center">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900 mb-2 inline-flex items-center gap-2"><Store className="w-4 h-4 text-teal-600" /> Đang có hàng tại</p>
            <p className="text-sm text-slate-600">TPHCM, Hà Nội, Đà Nẵng, Bình Dương, Đồng Nai...</p>
          </div>
        </div>
      </div>

      <section className="mb-16">
        <div className="border-b border-slate-200 mb-5 flex gap-2">
          <button
            onClick={() => setActiveTab('description')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'description'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Mô tả sản phẩm
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'specs'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Thông số kỹ thuật
          </button>
        </div>

        {activeTab === 'description' ? (
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-700 leading-7">
              {product.description || `Sản phẩm ${product.name} thuộc thương hiệu ${product.brand}, phù hợp luyện tập và thi đấu cường độ cao.`}
            </p>
            <p className="text-slate-700 leading-7">
              Mẫu sản phẩm được tối ưu độ bền, độ êm và cảm giác sử dụng ổn định. Đây là lựa chọn phù hợp cho người chơi phong trào nâng cao và bán chuyên.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="w-48 bg-slate-50 px-4 py-3 font-medium text-slate-700">Thương hiệu</td>
                  <td className="px-4 py-3 text-slate-700">{product.brand || 'NikaSports'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 px-4 py-3 font-medium text-slate-700">Danh mục</td>
                  <td className="px-4 py-3 text-slate-700">{product.categories?.name || 'Đang cập nhật'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 px-4 py-3 font-medium text-slate-700">Tình trạng</td>
                  <td className="px-4 py-3 text-slate-700">{product.stock > 0 ? 'Còn hàng' : 'Hết hàng'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 px-4 py-3 font-medium text-slate-700">Đánh giá</td>
                  <td className="px-4 py-3 text-slate-700">{product.rating} / 5 ({product.reviews_count} đánh giá)</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

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
