import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Truck, Shield, RotateCcw, Headphones,
  ChevronRight, ChevronLeft, Flame, Tag,
} from 'lucide-react';
import { db } from '../lib/db';
import type { Product, Category, Banner, CategoryProductGroup, HomeCategorySection } from '../types';
import ProductCard from '../components/ui/ProductCard';
import { getDiscountPercent } from '../lib/formatters';

const NEW_PRODUCT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const HERO_SLIDE_INTERVAL_MS = 3000;
const CATEGORY_GROUP_LABEL: Record<CategoryProductGroup, string> = {
  badminton: 'cầu lông',
  tennis: 'tennis',
  pickleball: 'pickleball',
  other: 'khác',
};

function parseCategoryIdsJson(rawValue?: string | null) {
  if (!rawValue) return [] as string[];
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => String(item || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

let homePageCache: {
  featured: Product[];
  promoProducts: Product[];
  bannerProductRefs: Array<{ id: string; slug: string }>;
  categories: Category[];
  allProducts: Product[];
  banners: Banner[];
  homeCategorySections: HomeCategorySection[];
} | null = null;

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>(homePageCache?.featured || []);
  const [promoProducts, setPromoProducts] = useState<Product[]>(homePageCache?.promoProducts || []);
  const [bannerProductRefs, setBannerProductRefs] = useState<Array<{ id: string; slug: string }>>(homePageCache?.bannerProductRefs || []);
  const [categories, setCategories] = useState<Category[]>(homePageCache?.categories || []);
  const [allProducts, setAllProducts] = useState<Product[]>(homePageCache?.allProducts || []);
  const [banners, setBanners] = useState<Banner[]>(homePageCache?.banners || []);
  const [homeCategorySections, setHomeCategorySections] = useState<HomeCategorySection[]>(homePageCache?.homeCategorySections || []);
  const [loading, setLoading] = useState(!homePageCache);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [newestCategoryFilter, setNewestCategoryFilter] = useState('all');
  const tabsScrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({ isDown: false, startX: 0, startScrollLeft: 0 });
  const heroSlides = banners
    .filter(item => {
      const hasImage = Boolean(String(item.image_url || '').trim());
      const isActive = item.is_active === undefined ? true : Boolean(Number(item.is_active));
      return hasImage && isActive;
    })
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const categorySlugById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(item => {
      if (item.id && item.slug) map.set(item.id, item.slug);
    });
    return map;
  }, [categories]);
  const productSlugById = useMemo(() => {
    const map = new Map<string, string>();
    bannerProductRefs.forEach(item => {
      if (item.id && item.slug) map.set(item.id, item.slug);
    });
    return map;
  }, [bannerProductRefs]);

  const getBannerTargetHref = (banner: Banner) => {
    if (banner.target_type === 'product') {
      const productSlug = String(
        banner.target_product_slug
        || (banner.target_product_id ? productSlugById.get(String(banner.target_product_id)) : '')
        || '',
      ).trim();
      return productSlug ? `/products/${productSlug}` : null;
    }
    if (banner.target_type === 'category') {
      const categorySlug = String(
        banner.target_category_slug
        || (banner.target_category_id ? categorySlugById.get(String(banner.target_category_id)) : '')
        || '',
      ).trim();
      return categorySlug ? `/products?category=${encodeURIComponent(categorySlug)}` : null;
    }
    return null;
  };

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroSlideIndex(prev => (prev + 1) % heroSlides.length);
    }, HERO_SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    setHeroSlideIndex(prev => (heroSlides.length ? prev % heroSlides.length : 0));
  }, [heroSlides.length]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        if (!homePageCache) setLoading(true);
        const [featuredRes, promoSourceRes, bannerProductRefsRes, catRes, productsRes, bannersRes, sectionsRes] = await Promise.all([
          db.from('products').select('*').eq('featured', true).limit(4),
          db.from('products').select('*').order('created_at', { ascending: false }).limit(120),
          db.from('products').select('id, slug'),
          db.from('categories').select('*').order('created_at'),
          db.from('products').select('*').order('created_at', { ascending: false }).limit(60),
          db.from('banners').select('*').order('sort_order', { ascending: true }),
          db.from('home_category_sections').select('*').eq('is_active', 1).order('sort_order', { ascending: true }),
        ]);

        if (!active) return;

        const nextFeatured = featuredRes.data || [];
        const nextPromoProducts = ((promoSourceRes.data || []) as Product[])
          .filter(item => Number(item.original_price || 0) > Number(item.price || 0))
          .slice(0, 24);
        const nextBannerProductRefs = ((bannerProductRefsRes.data || []) as Array<{ id?: string; slug?: string }>)
          .map(item => ({ id: String(item.id || '').trim(), slug: String(item.slug || '').trim() }))
          .filter(item => item.id && item.slug);
        const nextCategories = catRes.data || [];
        const nextBanners = (bannersRes.data || []) as Banner[];
        const nextSections = (sectionsRes.data || []) as HomeCategorySection[];
        const now = Date.now();
        const nextAllProducts = (productsRes.data || [])
          .filter((product: Product) => {
            const createdAtMs = new Date(product.created_at || '').getTime();
            return Number.isFinite(createdAtMs) && now - createdAtMs <= NEW_PRODUCT_WINDOW_MS;
          });

        setFeatured(nextFeatured);
        setPromoProducts(nextPromoProducts);
        setBannerProductRefs(nextBannerProductRefs);
        setCategories(nextCategories);
        setAllProducts(nextAllProducts);
        setBanners(nextBanners);
        setHomeCategorySections(nextSections);
        homePageCache = {
          featured: nextFeatured,
          promoProducts: nextPromoProducts,
          bannerProductRefs: nextBannerProductRefs,
          categories: nextCategories,
          allProducts: nextAllProducts,
          banners: nextBanners,
          homeCategorySections: nextSections,
        };
      } finally {
        if (active) setLoading(false);
      }
    }
    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (newestCategoryFilter === 'all') return;
    const categoryExists = categories.some(item => item.id === newestCategoryFilter);
    if (!categoryExists) {
      setNewestCategoryFilter('all');
    }
  }, [categories, newestCategoryFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  const displayFeatured = featured.length > 0 ? featured : allProducts.slice(0, 4);
  const displayPromoProducts = promoProducts.slice(0, 2);
  const promoMaxDiscount = promoProducts.reduce((maxValue, item) => (
    Math.max(maxValue, getDiscountPercent(Number(item.price || 0), Number(item.original_price || 0)))
  ), 0);
  const newestProductsByCategory = (newestCategoryFilter === 'all'
    ? allProducts
    : allProducts.filter(product => product.category_id === newestCategoryFilter))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);
  const fallbackCategoryIds = categories
    .filter(item => (item.product_group || 'badminton') === 'badminton')
    .map(item => item.id);
  const resolvedHomeSections = (homeCategorySections.length > 0
    ? homeCategorySections
    : [{
        id: 'default-badminton',
        title: `Sản phẩm ${CATEGORY_GROUP_LABEL.badminton}`,
        product_group: 'badminton' as CategoryProductGroup,
        categories_json: JSON.stringify(fallbackCategoryIds),
      }])
    .map(section => {
      const selectedIds = parseCategoryIdsJson(section.categories_json);
      const idsForRender = selectedIds.length > 0
        ? selectedIds
        : categories
          .filter(item => (item.product_group || 'badminton') === (section.product_group || 'badminton'))
          .map(item => item.id);
      const renderCategories = idsForRender
        .map(id => categories.find(item => item.id === id))
        .filter(Boolean) as Category[];
      return {
        ...section,
        renderCategories,
      };
    })
    .filter(section => section.renderCategories.length > 0);

  const handleTabsMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const container = tabsScrollRef.current;
    if (!container) return;
    dragStateRef.current = {
      isDown: true,
      startX: event.pageX - container.offsetLeft,
      startScrollLeft: container.scrollLeft,
    };
  };

  const handleTabsMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const container = tabsScrollRef.current;
    if (!container || !dragStateRef.current.isDown) return;
    event.preventDefault();
    const currentX = event.pageX - container.offsetLeft;
    const delta = currentX - dragStateRef.current.startX;
    container.scrollLeft = dragStateRef.current.startScrollLeft - delta;
  };

  const handleTabsMouseUpOrLeave = () => {
    dragStateRef.current.isDown = false;
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute inset-0">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === heroSlideIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {(() => {
                const isActive = index === heroSlideIndex;
                const targetHref = getBannerTargetHref(slide);
                const mediaClassName = `absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${
                  isActive ? 'scale-100' : 'scale-105'
                }`;
                const wrapperClassName = `absolute inset-0 block ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`;
                if (!targetHref) {
                  return (
                    <div className={wrapperClassName}>
                      <img
                        src={slide.image_url}
                        alt={slide.title || `Banner ${index + 1}`}
                        className={mediaClassName}
                      />
                    </div>
                  );
                }
                return (
                  <Link
                    to={targetHref}
                    aria-label={slide.title ? `Mở banner ${slide.title}` : `Mở banner ${index + 1}`}
                    className={wrapperClassName}
                  >
                    <img
                      src={slide.image_url}
                      alt={slide.title || `Banner ${index + 1}`}
                      className={mediaClassName}
                    />
                  </Link>
                );
              })()}
            </div>
          ))}
          <div className="absolute inset-0 pointer-events-none bg-black/10" />
        </div>
        <div className="relative h-[280px] sm:h-[360px] lg:h-[460px] pointer-events-none" />
        {heroSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setHeroSlideIndex(prev => (prev - 1 + heroSlides.length) % heroSlides.length)}
              className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 border border-white/20 text-white flex items-center justify-center hover:bg-black/50 transition-colors"
              aria-label="Ảnh trước"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setHeroSlideIndex(prev => (prev + 1) % heroSlides.length)}
              className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 border border-white/20 text-white flex items-center justify-center hover:bg-black/50 transition-colors"
              aria-label="Ảnh sau"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setHeroSlideIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === heroSlideIndex ? 'w-7 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/70'
                  }`}
                  aria-label={`Chuyển tới ảnh ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
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
            <h2 className="text-2xl font-bold text-gray-900">Sản phẩm mới nhất</h2>
            <p className="text-gray-500 mt-1">Cập nhật liên tục theo danh mục</p>
          </div>
          <Link to="/products" className="hidden sm:flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
            Xem tất cả <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div
          ref={tabsScrollRef}
          className="mb-4 bg-white border border-gray-200 rounded-xl overflow-x-auto cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleTabsMouseDown}
          onMouseMove={handleTabsMouseMove}
          onMouseUp={handleTabsMouseUpOrLeave}
          onMouseLeave={handleTabsMouseUpOrLeave}
        >
          <div className="min-w-max flex items-center">
            <button
              type="button"
              onClick={() => setNewestCategoryFilter('all')}
              className={`px-6 py-3 text-sm font-semibold border-r border-gray-200 transition-colors ${
                newestCategoryFilter === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-orange-50'
              }`}
            >
              Tất cả
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                type="button"
                onClick={() => setNewestCategoryFilter(category.id)}
                className={`px-6 py-3 text-sm font-semibold border-r border-gray-200 transition-colors whitespace-nowrap ${
                  newestCategoryFilter === category.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-orange-50'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {newestProductsByCategory.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {newestProductsByCategory.length === 0 && (
          <div className="mt-5 text-center text-sm text-gray-500">
            Chưa có sản phẩm mới trong danh mục này.
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-teal-600 to-emerald-700 overflow-hidden">
          <div className="px-6 sm:px-8 lg:px-10 py-10 lg:py-12">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full mb-6">
                  <Tag className="w-4 h-4 text-teal-200" />
                  <span className="text-sm font-medium text-teal-100">Khuyến mãi đặc biệt</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                  Giảm đến {promoMaxDiscount > 0 ? promoMaxDiscount : 0}% cho<br />bộ sưu tập mới
                </h2>
                <p className="text-teal-100/80 mb-8 max-w-md">
                  Đừng bỏ lỡ cơ hội sở hữu những sản phẩm thể thao chất lượng với giá ưu đãi nhất.
                </p>
                <Link
                  to="/products?sale=1"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-teal-700 font-semibold rounded-2xl hover:shadow-xl transition-all active:scale-[0.98]"
                >
                  Mua ngay
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                {displayPromoProducts.map(product => (
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
                {displayPromoProducts.length === 0 && (
                  <div className="col-span-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-5 text-sm text-teal-100">
                    Hiện chưa có sản phẩm giảm giá nào để hiển thị.
                  </div>
                )}
              </div>
            </div>
          </div>
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
          {displayFeatured.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {resolvedHomeSections.map(section => (
        <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-orange-600">{section.title}</h2>
            <div className="mt-3 flex justify-center">
              <span className="w-24 h-1 rounded-full bg-orange-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {section.renderCategories.map(cat => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="group relative aspect-square overflow-hidden border-2 border-orange-300 bg-orange-200/60"
              >
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -rotate-6 bg-orange-600/90 text-white px-4 py-2 min-w-[72%] text-center shadow-lg">
                  <span className="text-sm sm:text-base font-semibold uppercase tracking-wide">
                    {cat.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

    </div>
  );
}
