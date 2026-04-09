import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react';
import { db } from '../lib/db';
import type { Product, Category } from '../types';
import ProductCard from '../components/ui/ProductCard';

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'rating';
const DISCOUNT_FILTER_OPTIONS = [20, 30, 40, 50, 60];
const PRICE_FILTER_OPTIONS = [
  { value: 'under_500k', label: 'Giá dưới 500.000đ', min: 0, max: 500000 },
  { value: '500k_1m', label: '500.000đ - 1 triệu', min: 500000, max: 1000000 },
  { value: '1m_2m', label: '1 - 2 triệu', min: 1000000, max: 2000000 },
  { value: '2m_3m', label: '2 - 3 triệu', min: 2000000, max: 3000000 },
  { value: 'above_3m', label: 'Giá trên 3 triệu', min: 3000000, max: Number.POSITIVE_INFINITY },
] as const;
const BRANCH_OPTIONS = [
  'VNB Super Center',
  'VNB PREMIUM Quận 1',
  'VNB PREMIUM Quận 11',
  'VNB PREMIUM Bình Thạnh',
  'VNB PREMIUM TP Thủ Đức',
  'VNB Quận 1',
  'VNB Quận 3',
  'VNB Quận 5',
  'VNB Quận 7',
  'VNB Quận 10',
  'VNB Quận 12',
  'VNB Bình Thạnh',
  'VNB Gò Vấp',
  'VNB Tân Bình',
  'VNB Tân Phú',
  'VNB Bình Tân',
  'VNB Cầu Giấy',
  'VNB Đống Đa',
  'VNB Hà Đông',
  'VNB Hải Châu Đà Nẵng',
  'VNB Thanh Khê Đà Nẵng',
  'VNB Biên Hòa',
  'VNB TP Vinh',
];
const AUDIENCE_FILTER_OPTIONS = [
  { value: 'nam', label: 'Nam', keywords: ['nam', 'men', 'male'] },
  { value: 'nu', label: 'Nữ', keywords: ['nữ', 'nu', 'women', 'female', 'lady'] },
  { value: 'ca-nam-lan-nu', label: 'Cả Nam lẫn Nữ', keywords: ['unisex', 'nam nữ', 'ca nam lan nu', 'cả nam lẫn nữ'] },
  { value: 'tre-em', label: 'Trẻ Em', keywords: ['trẻ em', 'tre em', 'kids', 'junior', 'child'] },
] as const;
const HIGHLIGHT_FILTER_OPTIONS = [
  { value: 'toan-dien', label: 'Toàn Diện', keywords: ['toàn diện', 'toan dien', 'all-around', 'all round'] },
  { value: 'sieu-nhe', label: 'Siêu Nhẹ', keywords: ['siêu nhẹ', 'sieu nhe', 'lightweight', 'ultra light', 'aerus'] },
  { value: 'on-dinh', label: 'Ổn Định', keywords: ['ổn định', 'on dinh', 'stable', 'stability'] },
  { value: 'em-ai', label: 'Êm Ái', keywords: ['êm ái', 'em ai', 'cushion', 'comfort'] },
] as const;
const SHOE_FORM_FILTER_OPTIONS = [
  { value: 'slim', label: 'Slim - Bàn Chân Thon', keywords: ['slim', 'thon'] },
  { value: 'unisex', label: 'Unisex - Bàn Chân Thường', keywords: ['unisex', 'regular', 'thường', 'thuong'] },
  { value: 'wide', label: 'Wide - Bàn Chân Bè', keywords: ['wide', 'bè', 'be', '2e', '3e'] },
] as const;
const PLAY_STYLE_FILTER_OPTIONS = [
  { value: 'ngoai-troi', label: 'Ngoài Trời - Sân Bê Tông', keywords: ['ngoài trời', 'ngoai troi', 'outdoor', 'sân bê tông', 'san be tong'] },
  { value: 'trong-nha', label: 'Trong Nhà - Sân Thảm', keywords: ['trong nhà', 'trong nha', 'indoor', 'sân thảm', 'san tham'] },
  { value: 'ca-hai', label: 'Trong Nhà & Ngoài Trời', keywords: ['trong nhà & ngoài trời', 'trong nha & ngoai troi', 'all court', 'đa bề mặt'] },
] as const;
const SEGMENT_FILTER_OPTIONS = [
  { value: 'tam-thap', label: 'Tầm Thấp', keywords: ['entry', 'beginner', 'giá rẻ', 'gia re', 'phổ thông', 'pho thong'] },
  { value: 'trung-cap', label: 'Trung Cấp', keywords: ['mid', 'trung cấp', 'trung cap'] },
  { value: 'cao-cap', label: 'Cao Cấp', keywords: ['premium', 'pro', 'cao cấp', 'cao cap', 'high-end'] },
] as const;
const APPAREL_TYPE_FILTER_OPTIONS = [
  { value: 'ao', label: 'Áo', keywords: ['áo', 'ao', 'shirt', 'tee', 'jersey'] },
  { value: 'quan', label: 'Quần', keywords: ['quần', 'quan', 'pants', 'short'] },
  { value: 'vay', label: 'Váy', keywords: ['váy', 'vay', 'skirt', 'dress'] },
] as const;

function parseDiscountValues(raw: string | null) {
  if (!raw) return [];
  return raw
    .split(',')
    .map(item => Number(item.trim()))
    .filter(value => DISCOUNT_FILTER_OPTIONS.includes(value))
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .sort((a, b) => a - b);
}

function parseListValues(raw: string | null) {
  if (!raw) return [];
  return raw
    .split(',')
    .map(item => decodeURIComponent(item.trim()))
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

function parseProductSizeValues(sizeOptions?: string | null) {
  if (!sizeOptions) return [];
  return sizeOptions
    .split(/[;,/]/)
    .map(item => item.trim())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

function isPriceInRange(price: number, rangeValue: string) {
  const option = PRICE_FILTER_OPTIONS.find(item => item.value === rangeValue);
  if (!option) return false;
  if (option.max === Number.POSITIVE_INFINITY) return price >= option.min;
  return price >= option.min && price < option.max;
}

function normalizeText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function productMatchesOption(product: Product, keywords: readonly string[], explicitFields: string[]) {
  const sourceTexts = [
    product.name,
    product.description,
    product.brand,
    ...explicitFields.map(fieldName => (product as any)[fieldName]),
  ]
    .map(item => normalizeText(item))
    .filter(Boolean);
  if (sourceTexts.length === 0) return false;
  const normalizedKeywords = keywords.map(item => normalizeText(item)).filter(Boolean);
  return normalizedKeywords.some(keyword => sourceTexts.some(text => text.includes(keyword)));
}

function getProductDiscountPercent(product: Product) {
  const direct = Number((product as any).discount_percent || 0);
  if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
  const originalPrice = Number(product.original_price || 0);
  const currentPrice = Number(product.price || 0);
  if (originalPrice > currentPrice && originalPrice > 0) {
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  }
  return 0;
}

const sortLabels: Record<SortOption, string> = {
  newest: 'Mới nhất',
  price_asc: 'Giá thấp - cao',
  price_desc: 'Giá cao - thấp',
  rating: 'Đánh giá cao',
};

const productsPageCache = new Map<string, Product[]>();

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchParams.get('search') || '');
  const [branchKeyword, setBranchKeyword] = useState('');

  const selectedCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const saleOnly = searchParams.get('sale') === '1';
  const selectedDiscounts = parseDiscountValues(searchParams.get('salePct'));
  const selectedPrices = parseListValues(searchParams.get('price'));
  const selectedBrands = parseListValues(searchParams.get('brand'));
  const selectedSizes = parseListValues(searchParams.get('size'));
  const selectedBranches = parseListValues(searchParams.get('branch'));
  const selectedAudiences = parseListValues(searchParams.get('audience'));
  const selectedHighlights = parseListValues(searchParams.get('highlight'));
  const selectedShoeForms = parseListValues(searchParams.get('shoeForm'));
  const selectedPlayStyles = parseListValues(searchParams.get('playStyle'));
  const selectedSegments = parseListValues(searchParams.get('segment'));
  const selectedApparelTypes = parseListValues(searchParams.get('apparelType'));

  useEffect(() => {
    db.from('categories').select('*').order('name').then(({ data }: { data: any[] | null }) => {
      setCategories(data || []);
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      const cacheKey = `${selectedCategory}::${searchQuery}::${saleOnly ? 'sale' : 'all'}`;
      const cachedProducts = productsPageCache.get(cacheKey);
      if (cachedProducts) {
        setProducts(cachedProducts);
        setLoading(false);
      } else {
        setLoading(true);
      }

      let query = db.from('products').select('*');

      if (selectedCategory) {
        const { data: cat } = await db
          .from('categories')
          .select('id')
          .eq('slug', selectedCategory)
          .maybeSingle();
        if (cat) {
          query = query.eq('category_id', cat.id);
        }
      }

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data } = await query;
      if (!active) return;
      let nextProducts = (data || []) as Product[];
      if (saleOnly) {
        nextProducts = nextProducts.filter((product: any) => {
          const hasOriginalPrice = Number(product.original_price || 0) > Number(product.price || 0);
          const hasDiscountPercent = Number(product.discount_percent || 0) > 0;
          return hasOriginalPrice || hasDiscountPercent;
        });
      }
      setProducts(nextProducts);
      productsPageCache.set(cacheKey, nextProducts);
      setLoading(false);
    }
    load();

    return () => {
      active = false;
    };
  }, [selectedCategory, searchQuery, saleOnly]);

  const availableBrands = useMemo(() => {
    return products
      .map(product => String(product.brand || '').trim())
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b, 'vi'));
  }, [products]);

  const availableSizes = useMemo(() => {
    const merged = products.flatMap(product => parseProductSizeValues(product.size_options));
    return merged
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .sort((a, b) => {
        const numA = Number(a);
        const numB = Number(b);
        const bothNumeric = Number.isFinite(numA) && Number.isFinite(numB);
        return bothNumeric ? numA - numB : a.localeCompare(b, 'vi');
      });
  }, [products]);

  const hasBranchDataInProducts = useMemo(() => {
    return products.some(product => {
      const candidate = (product as any).branch_name || (product as any).branch || '';
      return Boolean(String(candidate).trim());
    });
  }, [products]);

  const filteredBranchOptions = useMemo(() => {
    const keyword = branchKeyword.trim().toLowerCase();
    if (!keyword) return BRANCH_OPTIONS;
    return BRANCH_OPTIONS.filter(branch => branch.toLowerCase().includes(keyword));
  }, [branchKeyword]);

  const activeCategory = categories.find(item => item.slug === selectedCategory) || null;
  const currentContext = useMemo<'shoes' | 'apparel' | 'general'>(() => {
    if (activeCategory?.size_type === 'shoes') return 'shoes';
    if (activeCategory?.size_type === 'apparel') return 'apparel';
    const source = normalizeText(`${activeCategory?.name || ''} ${activeCategory?.slug || ''}`);
    if (/giay|shoe|sandal/.test(source)) return 'shoes';
    if (/ao|quan|vay|shirt|pant|skirt|apparel/.test(source)) return 'apparel';
    const shoesCount = products.filter(item => item.size_type === 'shoes').length;
    const apparelCount = products.filter(item => item.size_type === 'apparel').length;
    if (shoesCount > 0 && apparelCount === 0) return 'shoes';
    if (apparelCount > 0 && shoesCount === 0) return 'apparel';
    return 'general';
  }, [activeCategory, products]);
  const showSharedAdvancedFilters = currentContext !== 'apparel';
  const showShoeAdvancedFilters = currentContext === 'shoes';
  const showApparelTypeFilter = currentContext === 'apparel';


  const sorted = useMemo(() => {
    let arr = [...products];

    if (selectedPrices.length > 0) {
      arr = arr.filter(product => selectedPrices.some(rangeValue => isPriceInRange(Number(product.price || 0), rangeValue)));
    }

    if (selectedBrands.length > 0) {
      arr = arr.filter(product => selectedBrands.includes(String(product.brand || '').trim()));
    }

    if (selectedSizes.length > 0) {
      arr = arr.filter(product => {
        const productSizes = parseProductSizeValues(product.size_options);
        return selectedSizes.some(size => productSizes.includes(size));
      });
    }

    // Chi nhánh chỉ lọc khi dữ liệu sản phẩm có trường chi nhánh.
    if (selectedBranches.length > 0 && hasBranchDataInProducts) {
      arr = arr.filter(product => {
        const rawBranch = String((product as any).branch_name || (product as any).branch || '').trim();
        return selectedBranches.includes(rawBranch);
      });
    }

    if (showSharedAdvancedFilters && selectedAudiences.length > 0) {
      arr = arr.filter(product => selectedAudiences.some(value => {
        const option = AUDIENCE_FILTER_OPTIONS.find(item => item.value === value);
        if (!option) return false;
        return productMatchesOption(product, option.keywords, ['target_audience', 'audience', 'gender']);
      }));
    }

    if (showSharedAdvancedFilters && selectedHighlights.length > 0) {
      arr = arr.filter(product => selectedHighlights.some(value => {
        const option = HIGHLIGHT_FILTER_OPTIONS.find(item => item.value === value);
        if (!option) return false;
        return productMatchesOption(product, option.keywords, ['highlight_tags', 'highlights', 'feature_tags']);
      }));
    }

    if (showShoeAdvancedFilters && selectedShoeForms.length > 0) {
      arr = arr.filter(product => selectedShoeForms.some(value => {
        const option = SHOE_FORM_FILTER_OPTIONS.find(item => item.value === value);
        if (!option) return false;
        return productMatchesOption(product, option.keywords, ['shoe_form', 'last_type', 'foot_type']);
      }));
    }

    if (showShoeAdvancedFilters && selectedPlayStyles.length > 0) {
      arr = arr.filter(product => selectedPlayStyles.some(value => {
        const option = PLAY_STYLE_FILTER_OPTIONS.find(item => item.value === value);
        if (!option) return false;
        return productMatchesOption(product, option.keywords, ['play_style', 'court_type']);
      }));
    }

    if (showShoeAdvancedFilters && selectedSegments.length > 0) {
      arr = arr.filter(product => selectedSegments.some(value => {
        const option = SEGMENT_FILTER_OPTIONS.find(item => item.value === value);
        if (!option) return false;
        return productMatchesOption(product, option.keywords, ['segment', 'price_segment']);
      }));
    }

    if (showApparelTypeFilter && selectedApparelTypes.length > 0) {
      arr = arr.filter(product => selectedApparelTypes.some(value => {
        const option = APPAREL_TYPE_FILTER_OPTIONS.find(item => item.value === value);
        if (!option) return false;
        return productMatchesOption(product, option.keywords, ['apparel_type', 'item_type']);
      }));
    }

    if (saleOnly && selectedDiscounts.length > 0) {
      arr = arr.filter(product => selectedDiscounts.includes(getProductDiscountPercent(product)));
    }
    switch (sortBy) {
      case 'price_asc': return arr.sort((a, b) => a.price - b.price);
      case 'price_desc': return arr.sort((a, b) => b.price - a.price);
      case 'rating': return arr.sort((a, b) => b.rating - a.rating);
      default: return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [
    products,
    sortBy,
    saleOnly,
    selectedDiscounts,
    selectedPrices,
    selectedBrands,
    selectedSizes,
    selectedBranches,
    selectedAudiences,
    selectedHighlights,
    selectedShoeForms,
    selectedPlayStyles,
    selectedSegments,
    selectedApparelTypes,
    hasBranchDataInProducts,
    showSharedAdvancedFilters,
    showShoeAdvancedFilters,
    showApparelTypeFilter,
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (localSearch.trim()) {
      params.set('search', localSearch.trim());
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const setCategory = (slug: string) => {
    const params = new URLSearchParams(searchParams);
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    if (saleOnly) params.set('sale', '1');
    setSearchParams(params);
  };

  const toggleListFilter = (
    key: 'price' | 'brand' | 'size' | 'branch' | 'audience' | 'highlight' | 'shoeForm' | 'playStyle' | 'segment' | 'apparelType',
    value: string,
  ) => {
    const params = new URLSearchParams(searchParams);
    const current = parseListValues(params.get(key));
    const next = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    if (next.length > 0) {
      params.set(key, next.map(item => encodeURIComponent(item)).join(','));
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    if (saleOnly) params.set('sale', '1');
    setSearchParams(params);
    setLocalSearch('');
    setSortBy('newest');
    setBranchKeyword('');
  };

  const toggleDiscountFilter = (percent: number) => {
    if (!saleOnly) return;
    const current = parseDiscountValues(searchParams.get('salePct'));
    const next = current.includes(percent)
      ? current.filter(item => item !== percent)
      : [...current, percent].sort((a, b) => a - b);
    const params = new URLSearchParams(searchParams);
    if (next.length > 0) {
      params.set('salePct', next.join(','));
    } else {
      params.delete('salePct');
    }
    params.set('sale', '1');
    setSearchParams(params);
  };

  const activeCategoryName = categories.find(c => c.slug === selectedCategory)?.name;
  const hasFilters = selectedCategory
    || searchQuery
    || selectedPrices.length > 0
    || selectedBrands.length > 0
    || selectedSizes.length > 0
    || selectedBranches.length > 0
    || (showSharedAdvancedFilters && selectedAudiences.length > 0)
    || (showSharedAdvancedFilters && selectedHighlights.length > 0)
    || (showShoeAdvancedFilters && selectedShoeForms.length > 0)
    || (showShoeAdvancedFilters && selectedPlayStyles.length > 0)
    || (showShoeAdvancedFilters && selectedSegments.length > 0)
    || (showApparelTypeFilter && selectedApparelTypes.length > 0)
    || (saleOnly && selectedDiscounts.length > 0);
  const pageTitle = saleOnly ? 'Sản phẩm sale off' : (activeCategoryName || 'Tất cả sản phẩm');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-teal-600 transition-colors">Trang chủ</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">
          {pageTitle}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className={`lg:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Bộ lọc</h3>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-teal-600 hover:text-teal-700">
                  Xóa bộ lọc
                </button>
              )}
            </div>

            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                />
              </div>
            </form>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Danh mục</h4>
              <div className="space-y-1">
                <button
                  onClick={() => setCategory('')}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                    !selectedCategory ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Tất cả
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.slug)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                      selectedCategory === cat.slug ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Chọn mức giá</h4>
              <div className="space-y-2.5">
                {PRICE_FILTER_OPTIONS.map(option => (
                  <label key={option.value} className="flex items-center gap-2.5 text-[17px] text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPrices.includes(option.value)}
                      onChange={() => toggleListFilter('price', option.value)}
                      className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/30"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Thương hiệu</h4>
              <div className="space-y-2.5 max-h-44 overflow-auto pr-1">
                {availableBrands.length === 0 ? (
                  <p className="text-sm text-gray-500">Chưa có dữ liệu thương hiệu.</p>
                ) : (
                  availableBrands.map(brand => (
                    <label key={brand} className="flex items-center gap-2.5 text-[17px] text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => toggleListFilter('brand', brand)}
                        className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/30"
                      />
                      {brand}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Chi nhánh</h4>
              <div className="relative mb-3">
                <input
                  type="text"
                  value={branchKeyword}
                  onChange={e => setBranchKeyword(e.target.value)}
                  placeholder="Tìm chi nhánh"
                  className="w-full pr-11 pl-3 py-2.5 border border-gray-200 rounded-none text-[17px] text-gray-700 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-500/20"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
              </div>
              <div className="max-h-48 overflow-auto pr-1 space-y-2.5">
                {filteredBranchOptions.map(branch => (
                  <label key={branch} className="flex items-center gap-2.5 text-[17px] text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBranches.includes(branch)}
                      onChange={() => toggleListFilter('branch', branch)}
                      className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/30"
                    />
                    {branch}
                  </label>
                ))}
              </div>
              {!hasBranchDataInProducts && (
                <p className="text-xs text-gray-500 mt-2">
                  Dữ liệu tồn kho theo chi nhánh chưa được cấu hình trong sản phẩm, danh sách đang hiển thị mẫu giao diện.
                </p>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Lọc theo size</h4>
              <div className="max-h-44 overflow-auto pr-1 space-y-2.5">
                {availableSizes.length === 0 ? (
                  <p className="text-sm text-gray-500">Danh mục này chưa có size để lọc.</p>
                ) : (
                  availableSizes.map(size => (
                    <label key={size} className="flex items-center gap-2.5 text-[17px] text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSizes.includes(size)}
                        onChange={() => toggleListFilter('size', size)}
                        className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/30"
                      />
                      {size}
                    </label>
                  ))
                )}
              </div>
            </div>

            {showSharedAdvancedFilters && (
              <>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Đối tượng</h4>
                  <div className="space-y-2.5">
                    {AUDIENCE_FILTER_OPTIONS.map(option => (
                      <label key={option.value} className="flex items-center gap-2.5 text-[17px] text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAudiences.includes(option.value)}
                          onChange={() => toggleListFilter('audience', option.value)}
                          className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/30"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Điểm nổi bật</h4>
                  <div className="space-y-2.5">
                    {HIGHLIGHT_FILTER_OPTIONS.map(option => (
                      <label key={option.value} className="flex items-center gap-2.5 text-[17px] text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedHighlights.includes(option.value)}
                          onChange={() => toggleListFilter('highlight', option.value)}
                          className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/30"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {showShoeAdvancedFilters && (
              <>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Form giày</h4>
                  <div className="space-y-2.5">
                    {SHOE_FORM_FILTER_OPTIONS.map(option => (
                      <label key={option.value} className="flex items-center gap-2.5 text-[17px] text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedShoeForms.includes(option.value)}
                          onChange={() => toggleListFilter('shoeForm', option.value)}
                          className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/30"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Thể loại chơi</h4>
                  <div className="space-y-2.5">
                    {PLAY_STYLE_FILTER_OPTIONS.map(option => (
                      <label key={option.value} className="flex items-center gap-2.5 text-[17px] text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPlayStyles.includes(option.value)}
                          onChange={() => toggleListFilter('playStyle', option.value)}
                          className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/30"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Phân khúc</h4>
                  <div className="space-y-2.5">
                    {SEGMENT_FILTER_OPTIONS.map(option => (
                      <label key={option.value} className="flex items-center gap-2.5 text-[17px] text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSegments.includes(option.value)}
                          onChange={() => toggleListFilter('segment', option.value)}
                          className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/30"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {showApparelTypeFilter && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Loại trang phục</h4>
                <div className="space-y-2.5">
                  {APPAREL_TYPE_FILTER_OPTIONS.map(option => (
                    <label key={option.value} className="flex items-center gap-2.5 text-[17px] text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedApparelTypes.includes(option.value)}
                        onChange={() => toggleListFilter('apparelType', option.value)}
                        className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500/30"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            )}


            {saleOnly && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Mức giảm giá</h4>
                <div className="space-y-2">
                  {DISCOUNT_FILTER_OPTIONS.map(percent => (
                    <label key={percent} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDiscounts.includes(percent)}
                        onChange={() => toggleDiscountFilter(percent)}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500/30"
                      />
                      {percent}%
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-teal-300 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Bộ lọc
              </button>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-900">{sorted.length}</span> sản phẩm
                {saleOnly && <span className="ml-2 text-rose-600 font-medium">(đang giảm giá)</span>}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {hasFilters && (
                <div className="hidden sm:flex items-center gap-2 flex-wrap">
                  {activeCategoryName && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">
                      {activeCategoryName}
                      <button onClick={() => setCategory('')}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">
                      "{searchQuery}"
                      <button onClick={() => {
                        const p = new URLSearchParams(searchParams);
                        p.delete('search');
                        setSearchParams(p);
                        setLocalSearch('');
                      }}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedPrices.map(priceKey => {
                    const label = PRICE_FILTER_OPTIONS.find(item => item.value === priceKey)?.label || priceKey;
                    return (
                      <span key={`price-${priceKey}`} className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full">
                        {label}
                        <button onClick={() => toggleListFilter('price', priceKey)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {selectedBrands.map(brand => (
                    <span key={`brand-${brand}`} className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full">
                      {brand}
                      <button onClick={() => toggleListFilter('brand', brand)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {selectedSizes.map(size => (
                    <span key={`size-${size}`} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                      Size {size}
                      <button onClick={() => toggleListFilter('size', size)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {selectedBranches.map(branch => (
                    <span key={`branch-${branch}`} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                      {branch}
                      <button onClick={() => toggleListFilter('branch', branch)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {showSharedAdvancedFilters && selectedAudiences.map(value => {
                    const label = AUDIENCE_FILTER_OPTIONS.find(item => item.value === value)?.label || value;
                    return (
                      <span key={`audience-${value}`} className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-50 text-cyan-700 text-xs font-medium rounded-full">
                        {label}
                        <button onClick={() => toggleListFilter('audience', value)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {showSharedAdvancedFilters && selectedHighlights.map(value => {
                    const label = HIGHLIGHT_FILTER_OPTIONS.find(item => item.value === value)?.label || value;
                    return (
                      <span key={`highlight-${value}`} className="inline-flex items-center gap-1 px-3 py-1 bg-lime-50 text-lime-700 text-xs font-medium rounded-full">
                        {label}
                        <button onClick={() => toggleListFilter('highlight', value)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {showShoeAdvancedFilters && selectedShoeForms.map(value => {
                    const label = SHOE_FORM_FILTER_OPTIONS.find(item => item.value === value)?.label || value;
                    return (
                      <span key={`shoe-form-${value}`} className="inline-flex items-center gap-1 px-3 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-full">
                        {label}
                        <button onClick={() => toggleListFilter('shoeForm', value)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {showShoeAdvancedFilters && selectedPlayStyles.map(value => {
                    const label = PLAY_STYLE_FILTER_OPTIONS.find(item => item.value === value)?.label || value;
                    return (
                      <span key={`play-style-${value}`} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                        {label}
                        <button onClick={() => toggleListFilter('playStyle', value)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {showShoeAdvancedFilters && selectedSegments.map(value => {
                    const label = SEGMENT_FILTER_OPTIONS.find(item => item.value === value)?.label || value;
                    return (
                      <span key={`segment-${value}`} className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                        {label}
                        <button onClick={() => toggleListFilter('segment', value)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {showApparelTypeFilter && selectedApparelTypes.map(value => {
                    const label = APPAREL_TYPE_FILTER_OPTIONS.find(item => item.value === value)?.label || value;
                    return (
                      <span key={`apparel-type-${value}`} className="inline-flex items-center gap-1 px-3 py-1 bg-pink-50 text-pink-700 text-xs font-medium rounded-full">
                        {label}
                        <button onClick={() => toggleListFilter('apparelType', value)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {saleOnly && selectedDiscounts.map(percent => (
                    <span key={`discount-${percent}`} className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 text-xs font-medium rounded-full">
                      Giảm {percent}%
                      <button onClick={() => toggleDiscountFilter(percent)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 cursor-pointer"
                >
                  {Object.entries(sortLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-gray-500 mb-4">Không tìm thấy sản phẩm nào</p>
              <button onClick={clearFilters} className="text-sm text-teal-600 font-medium hover:text-teal-700">
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {sorted.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
