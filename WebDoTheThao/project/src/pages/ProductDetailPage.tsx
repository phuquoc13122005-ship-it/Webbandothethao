import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, ShoppingCart, Minus, Plus, Truck, Shield, RotateCcw, CheckCircle2, Store,
  ChevronRight, Heart, ImagePlus, X,
} from 'lucide-react';
import { db } from '../lib/db';
import type { Product } from '../types';
import { formatDate, formatPrice, getDiscountPercent } from '../lib/formatters';
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

interface ProductReview {
  id: string;
  product_id: string;
  user_id?: string | null;
  full_name?: string | null;
  phone?: string | null;
  rating: number;
  comment?: string | null;
  image_url?: string | null;
  status?: string;
  is_hidden?: boolean | number;
  created_at?: string;
}

function generateCaptchaCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
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
  const [approvedReviews, setApprovedReviews] = useState<ProductReview[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState('');
  const [reviewSubmitError, setReviewSubmitError] = useState('');
  const [captchaCode, setCaptchaCode] = useState(generateCaptchaCode());
  const [reviewForm, setReviewForm] = useState({
    fullName: '',
    phone: '',
    comment: '',
    rating: 5,
    captchaInput: '',
    imageUrl: '',
    imageName: '',
  });
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
  const branchLocations = useMemo(() => {
    const raw = String(product?.branch_name || '').trim();
    if (!raw) return [];
    return Array.from(
      new Set(
        raw
          .split(/[;,]/)
          .map(item => item.trim())
          .filter(Boolean),
      ),
    );
  }, [product?.branch_name]);
  const reviewStats = useMemo(() => {
    const distribution = [1, 2, 3, 4, 5].reduce((acc, star) => ({ ...acc, [star]: 0 }), {} as Record<number, number>);
    approvedReviews.forEach(item => {
      const star = Math.min(5, Math.max(1, Math.floor(Number(item.rating || 0))));
      distribution[star] += 1;
    });
    const total = approvedReviews.length;
    const average = total > 0
      ? Number((approvedReviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total).toFixed(1))
      : Number(product?.rating || 0);
    return { distribution, total, average };
  }, [approvedReviews, product?.rating]);

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
    let cancelled = false;
    async function loadReviews() {
      if (!product?.id) {
        setApprovedReviews([]);
        return;
      }
      setReviewLoading(true);
      const { data, error } = await db.getApprovedReviewsByProduct(product.id);
      if (cancelled) return;
      if (error) {
        setApprovedReviews([]);
      } else {
        setApprovedReviews((data || []) as ProductReview[]);
      }
      setReviewLoading(false);
    }
    loadReviews();
    const timer = window.setInterval(loadReviews, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [product?.id]);

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

  useEffect(() => {
    setReviewForm(prev => ({
      ...prev,
      fullName: user?.fullName || prev.fullName,
    }));
  }, [user?.fullName]);

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

  const openReviewModal = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setReviewSubmitMessage('');
    setReviewSubmitError('');
    setCaptchaCode(generateCaptchaCode());
    setReviewForm(prev => ({
      ...prev,
      fullName: user.fullName || prev.fullName,
      captchaInput: '',
    }));
    setIsReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    setReviewSubmitError('');
  };

  const handleReviewImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setReviewForm(prev => ({ ...prev, imageUrl: '', imageName: '' }));
      return;
    }
    const uploadResult = await db.uploadImage(file, file.name);
    if (uploadResult.error || !uploadResult.data?.url) {
      setReviewSubmitError(uploadResult.error?.message || 'Không thể tải ảnh đánh giá.');
      return;
    }
    setReviewForm(prev => ({
      ...prev,
      imageUrl: String(uploadResult.data.url),
      imageName: file.name,
    }));
  };

  const handleSubmitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!product?.id) return;
    setReviewSubmitError('');
    setReviewSubmitMessage('');
    if (!reviewForm.comment.trim()) {
      setReviewSubmitError('Vui lòng nhập nhận xét.');
      return;
    }
    if (!reviewForm.fullName.trim()) {
      setReviewSubmitError('Vui lòng nhập họ và tên.');
      return;
    }
    if (reviewForm.captchaInput.trim() !== captchaCode) {
      setReviewSubmitError('Mã xác nhận không đúng.');
      setCaptchaCode(generateCaptchaCode());
      setReviewForm(prev => ({ ...prev, captchaInput: '' }));
      return;
    }

    setReviewSubmitting(true);
    const { error } = await db.submitProductReview({
      productId: product.id,
      fullName: reviewForm.fullName.trim(),
      phone: reviewForm.phone.trim(),
      rating: reviewForm.rating,
      comment: reviewForm.comment.trim(),
      imageUrl: reviewForm.imageUrl,
    });
    setReviewSubmitting(false);
    if (error) {
      setReviewSubmitError(error.message || 'Không thể gửi đánh giá.');
      return;
    }
    // setReviewSubmitMessage('Đã gửi đánh giá thành công. Vui lòng chờ admin phê duyệt.');
    setReviewForm({
      fullName: user.fullName || '',
      phone: '',
      comment: '',
      rating: 5,
      captchaInput: '',
      imageUrl: '',
      imageName: '',
    });
    setCaptchaCode(generateCaptchaCode());
    window.setTimeout(() => setIsReviewModalOpen(false), 1200);
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
                  className={`w-4 h-4 ${i < Math.round(reviewStats.average) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">{reviewStats.average.toFixed(1)} ({reviewStats.total} đánh giá)</span>
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
            <p className="text-sm text-slate-600">
              {branchLocations.length > 0 ? branchLocations.join(', ') : 'Chưa cập nhật chi nhánh'}
            </p>
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
                  <td className="px-4 py-3 text-slate-700">{reviewStats.average.toFixed(1)} / 5 ({reviewStats.total} đánh giá)</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-16 space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Đánh giá & nhận xét {product.name}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border border-slate-100 rounded-xl p-4">
            <div className="text-center flex flex-col items-center justify-center gap-1">
              <p className="text-4xl font-bold text-slate-900">{reviewStats.average.toFixed(1)}/5</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={`summary-star-${idx}`}
                    className={`w-5 h-5 ${idx < Math.round(reviewStats.average) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                  />
                ))}
              </div>
              <p className="text-sm text-slate-500">{reviewStats.total} đánh giá và nhận xét</p>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(star => {
                const count = reviewStats.distribution[star] || 0;
                const percent = reviewStats.total > 0 ? Math.round((count / reviewStats.total) * 100) : 0;
                return (
                  <div key={`bar-${star}`} className="flex items-center gap-3">
                    <span className="text-sm text-slate-700 min-w-[36px] inline-flex items-center gap-1">
                      {star} <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-sm text-slate-500 min-w-[70px] text-right">{count} đánh giá</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-center mt-4">
            <p className="text-slate-600 mb-2">Bạn đánh giá sao sản phẩm này?</p>
            <button
              type="button"
              onClick={openReviewModal}
              className="inline-flex items-center justify-center min-w-72 h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            >
              Đánh giá ngay
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Bình luận</h3>
          {reviewLoading && (
            <p className="text-sm text-slate-500">Đang tải đánh giá...</p>
          )}
          {!reviewLoading && approvedReviews.length === 0 && (
            <p className="text-sm text-slate-500">Chưa có đánh giá nào được duyệt cho sản phẩm này.</p>
          )}
          <div className="space-y-4">
            {approvedReviews.map(review => (
              <div key={review.id} className="border border-slate-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{review.full_name || 'Khách hàng'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={`${review.id}-${idx}`}
                          className={`w-4 h-4 ${idx < Math.round(Number(review.rating || 0)) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">{review.created_at ? formatDate(review.created_at) : ''}</p>
                </div>
                <p className="text-slate-700 mt-3">{review.comment || ''}</p>
                {review.image_url && (
                  <img src={review.image_url} alt="Ảnh đánh giá người dùng" className="mt-3 w-24 h-24 rounded-lg object-cover border border-slate-200" />
                )}
              </div>
            ))}
          </div>
        </div>
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

      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between bg-orange-600 px-6 py-4">
              <p className="text-3xl font-bold text-white">Đánh giá & nhận xét sản phẩm</p>
              <button onClick={closeReviewModal} type="button" className="text-white/90 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
              <input
                value={reviewForm.fullName}
                onChange={event => setReviewForm(prev => ({ ...prev, fullName: event.target.value }))}
                placeholder="Họ và Tên"
                className="w-full h-12 rounded-xl border border-slate-200 px-4"
              />
              <input
                value={reviewForm.phone}
                onChange={event => setReviewForm(prev => ({ ...prev, phone: event.target.value }))}
                placeholder="Số điện thoại"
                className="w-full h-12 rounded-xl border border-slate-200 px-4"
              />
              <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden">
                <input
                  value={reviewForm.imageName}
                  readOnly
                  placeholder="Hình ảnh thực tế"
                  className="flex-1 h-12 px-4 bg-white"
                />
                <label className="h-12 px-4 inline-flex items-center gap-2 bg-slate-100 font-semibold text-slate-700 cursor-pointer">
                  <ImagePlus className="w-5 h-5" />
                  Thêm ảnh
                  <input type="file" accept="image/*" onChange={handleReviewImageChange} className="hidden" />
                </label>
              </div>
              <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden">
                <input
                  value={reviewForm.captchaInput}
                  onChange={event => setReviewForm(prev => ({ ...prev, captchaInput: event.target.value }))}
                  placeholder="Mã xác nhận"
                  className="flex-1 h-12 px-4"
                />
                <button
                  type="button"
                  onClick={() => setCaptchaCode(generateCaptchaCode())}
                  className="h-12 min-w-28 px-4 bg-slate-100 font-mono italic text-2xl text-slate-800"
                >
                  {captchaCode}
                </button>
              </div>
              <textarea
                value={reviewForm.comment}
                onChange={event => setReviewForm(prev => ({ ...prev, comment: event.target.value }))}
                placeholder="Xin mời chia sẻ một số cảm nhận về sản phẩm"
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
              <div className="rounded-xl border border-slate-200 px-4 py-4">
                <p className="text-3xl font-bold text-slate-800 mb-3">Bạn thấy sản phẩm này như thế nào?</p>
                <div className="flex items-center justify-center gap-4">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const star = index + 1;
                    return (
                      <button
                        key={`review-star-${star}`}
                        type="button"
                        onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                        className="p-1"
                      >
                        <Star className={`w-8 h-8 ${star <= reviewForm.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
              {reviewSubmitError && <p className="text-sm text-rose-600">{reviewSubmitError}</p>}
              {reviewSubmitMessage && <p className="text-sm text-emerald-600">{reviewSubmitMessage}</p>}
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="w-full h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-2xl font-bold disabled:opacity-50"
              >
                {reviewSubmitting ? 'ĐANG GỬI...' : 'GỬI ĐÁNH GIÁ'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
