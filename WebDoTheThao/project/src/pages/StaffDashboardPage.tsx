import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BadgeDollarSign,
  Boxes,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Headset,
  Home,
  ImagePlus,
  LayoutDashboard,
  Package,
  Pencil,
  Save,
  Search,
  Star,
  Tags,
  TicketPercent,
  Trash2,
  TrendingUp,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { db } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import type { Category, Order, Product, Profile, SupportRequest } from '../types';
import { formatDate, formatPrice, getStatusColor, getStatusLabel } from '../lib/formatters';

type StaffTab =
  | 'overview'
  | 'orders'
  | 'products_list'
  | 'new_products'
  | 'featured_products'
  | 'inventory'
  | 'purchase_orders'
  | 'goods_receipt'
  | 'stock_audit'
  | 'transfers'
  | 'suppliers'
  | 'cost_adjustment'
  | 'categories'
  | 'customers'
  | 'support'
  | 'promotions'
  | 'reviews';

interface OrderWithCustomer extends Order {
  customer?: Profile;
}

interface PromotionItem {
  id: string;
  code?: string;
  name?: string;
  discount_percent?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: string;
  is_active?: boolean;
}

interface ReviewItem {
  id: string;
  user_id?: string;
  product_id?: string;
  rating?: number;
  comment?: string;
  status?: string;
  is_hidden?: boolean;
  created_at?: string;
}

interface NewProductForm {
  name: string;
  slug: string;
  description: string;
  brand: string;
  category_id: string;
  image_url: string;
  size_type: CategorySizeType;
  color_options: string;
  size_options: string;
  price: string;
  original_price: string;
  discount_percent: string;
  stock: string;
  featured: boolean;
}

type CategorySizeType = 'none' | 'apparel' | 'shoes';
type EditProductForm = NewProductForm;

const ORDER_STATUSES: Order['status'][] = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
const MAX_RENDER_ITEMS = 60;
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 300 * 1024;
const NEW_PRODUCT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL'];
const SHOES_SIZES = ['36', '37', '38', '39', '40', '41', '42'];
const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 1400,
  useWebWorker: true,
  initialQuality: 0.78,
};
const PRODUCT_TABS: StaffTab[] = [
  'products_list',
  'new_products',
  'featured_products',
  'inventory',
  'purchase_orders',
  'goods_receipt',
  'stock_audit',
  'transfers',
  'suppliers',
  'cost_adjustment',
];
const ALL_STAFF_TABS: StaffTab[] = [
  'overview',
  'orders',
  'products_list',
  'new_products',
  'featured_products',
  'inventory',
  'purchase_orders',
  'goods_receipt',
  'stock_audit',
  'transfers',
  'suppliers',
  'cost_adjustment',
  'categories',
  'customers',
  'support',
  'promotions',
  'reviews',
];

function isStaffTab(value: string | null): value is StaffTab {
  return value != null && ALL_STAFF_TABS.includes(value as StaffTab);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function getQuarterKey(dateValue: Date) {
  const quarter = Math.floor(dateValue.getMonth() / 3) + 1;
  return `${dateValue.getFullYear()}-Q${quarter}`;
}

function getQuarterLabel(dateValue: Date) {
  const quarter = Math.floor(dateValue.getMonth() / 3) + 1;
  return `Q${quarter}/${String(dateValue.getFullYear()).slice(-2)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeVndInput(value: string) {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

function formatVndInput(value: string) {
  if (!value) return '';
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '';
  return new Intl.NumberFormat('vi-VN').format(numericValue);
}

function normalizePercentInput(value: string) {
  const digitsOnly = value.replace(/\D/g, '');
  if (!digitsOnly) return '';
  const next = Math.min(99, Math.max(0, Number(digitsOnly)));
  return String(next);
}

function computeDiscountedPrice(basePrice: number, discountPercent: number) {
  if (!Number.isFinite(basePrice) || basePrice < 0) return 0;
  const safePercent = Math.min(99, Math.max(0, discountPercent));
  if (safePercent <= 0) return Math.round(basePrice);
  return Math.round(basePrice * (100 - safePercent) / 100);
}

function deriveDiscountPercentFromPrices(price: number, originalPrice: number | null | undefined) {
  if (!originalPrice || originalPrice <= 0 || originalPrice <= price) return 0;
  return Math.min(99, Math.max(0, Math.round(((originalPrice - price) / originalPrice) * 100)));
}

function normalizeCommaValues(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function getAllowedSizesByType(sizeType: CategorySizeType) {
  if (sizeType === 'apparel') return APPAREL_SIZES;
  if (sizeType === 'shoes') return SHOES_SIZES;
  return [];
}

function normalizeSizesByType(rawValues: string[], sizeType: CategorySizeType) {
  const allowed = getAllowedSizesByType(sizeType);
  if (sizeType === 'none') return rawValues;
  const allowedSet = new Set(allowed.map(item => item.toUpperCase()));
  return rawValues
    .map(item => item.toUpperCase())
    .filter(item => allowedSet.has(item));
}

function parseSizeStockMap(rawValue?: string | null) {
  if (!rawValue) return {} as Record<string, number>;
  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    const entries = Object.entries(parsed).filter(([, value]) => Number.isFinite(Number(value)) && Number(value) >= 0);
    return Object.fromEntries(entries.map(([key, value]) => [key, Math.floor(Number(value))])) as Record<string, number>;
  } catch {
    return {};
  }
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

function getProductSizeOptions(product: Product) {
  const raw = String(product.size_options || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  if (raw.length > 0) return raw;
  if (product.size_type === 'apparel') return APPAREL_SIZES;
  if (product.size_type === 'shoes') return SHOES_SIZES;
  return [];
}

async function prepareImageForDatabase(file: File) {
  let finalFile: File = file;
  const shouldCompress = file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES;
  if (shouldCompress) {
    const compressed = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS);
    finalFile = compressed as File;
  }
  if (finalFile.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    throw new Error('IMAGE_TOO_LARGE_AFTER_COMPRESSION');
  }
  const uploadResult = await db.uploadImage(finalFile, file.name);
  if (uploadResult.error || !uploadResult.data?.url) {
    throw new Error(uploadResult.error?.message || 'IMAGE_UPLOAD_FAILED');
  }
  return {
    imageUrl: String(uploadResult.data.url),
    finalFile,
    compressed: shouldCompress,
  };
}

export default function StaffDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dashboardMode = useMemo<'staff' | 'admin'>(
    () => (location.pathname === '/admin-dashboard' ? 'admin' : 'staff'),
    [location.pathname],
  );

  const [activeTab, setActiveTab] = useState<StaffTab>(() => {
    if (typeof window === 'undefined') return 'overview';
    const tab = new URLSearchParams(window.location.search).get('tab');
    return isStaffTab(tab) ? tab : 'overview';
  });
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [supportFeatureEnabled, setSupportFeatureEnabled] = useState(true);
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [promotionFeatureEnabled, setPromotionFeatureEnabled] = useState(true);
  const [reviewFeatureEnabled, setReviewFeatureEnabled] = useState(true);

  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<string, Order['status']>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [inventorySizeDrafts, setInventorySizeDrafts] = useState<Record<string, string>>({});
  const [supportStatusDrafts, setSupportStatusDrafts] = useState<Record<string, SupportRequest['status']>>({});
  const [reviewStatusDrafts, setReviewStatusDrafts] = useState<Record<string, string>>({});

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategorySizeType, setNewCategorySizeType] = useState<CategorySizeType>('none');
  const [newCategoryImageUrl, setNewCategoryImageUrl] = useState('');
  const [newCategoryImageName, setNewCategoryImageName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategorySlug, setEditCategorySlug] = useState('');
  const [editCategoryDescription, setEditCategoryDescription] = useState('');
  const [editCategorySizeType, setEditCategorySizeType] = useState<CategorySizeType>('none');
  const [editCategoryImageUrl, setEditCategoryImageUrl] = useState('');
  const [editCategoryImageName, setEditCategoryImageName] = useState('');
  const [newProduct, setNewProduct] = useState<NewProductForm>({
    name: '',
    slug: '',
    description: '',
    brand: '',
    category_id: '',
    image_url: '',
    size_type: 'none',
    color_options: '',
    size_options: '',
    price: '',
    original_price: '',
    discount_percent: '',
    stock: '',
    featured: false,
  });
  const [productImageName, setProductImageName] = useState('');
  const [newProductGalleryUrls, setNewProductGalleryUrls] = useState<string[]>([]);
  const [newProductGalleryNames, setNewProductGalleryNames] = useState<string[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<EditProductForm>({
    name: '',
    slug: '',
    description: '',
    brand: '',
    category_id: '',
    image_url: '',
    size_type: 'none',
    color_options: '',
    size_options: '',
    price: '',
    original_price: '',
    discount_percent: '',
    stock: '',
    featured: false,
  });
  const [editProductImageName, setEditProductImageName] = useState('');
  const [editProductGalleryUrls, setEditProductGalleryUrls] = useState<string[]>([]);
  const [editProductGalleryNames, setEditProductGalleryNames] = useState<string[]>([]);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const shouldComputeOverview = activeTab === 'overview';
  const newProductBasePrice = Number(newProduct.price || 0);
  const newProductDiscountPercent = Number(newProduct.discount_percent || 0);
  const newProductFinalPrice = computeDiscountedPrice(newProductBasePrice, newProductDiscountPercent);
  const editProductBasePrice = Number(editProduct.price || 0);
  const editProductDiscountPercent = Number(editProduct.discount_percent || 0);
  const editProductFinalPrice = computeDiscountedPrice(editProductBasePrice, editProductDiscountPercent);
  const selectedProductCategory = useMemo(
    () => categories.find(item => item.id === newProduct.category_id),
    [categories, newProduct.category_id],
  );
  const selectedCategorySizeType = (selectedProductCategory?.size_type || 'none') as CategorySizeType;
  const selectedProductSizeType = (newProduct.size_type || selectedCategorySizeType || 'none') as CategorySizeType;

  useEffect(() => {
    const allowed = getAllowedSizesByType(selectedProductSizeType);
    if (allowed.length === 0) {
      return;
    }
    const normalizedCurrent = normalizeSizesByType(normalizeCommaValues(newProduct.size_options), selectedProductSizeType);
    const nextValue = (normalizedCurrent.length > 0 ? normalizedCurrent : allowed).join(', ');
    if (nextValue !== newProduct.size_options) {
      setNewProduct(prev => ({ ...prev, size_options: nextValue }));
    }
  }, [selectedProductSizeType, newProduct.size_options]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!editingProductId) return;
    const allowed = getAllowedSizesByType(editProduct.size_type);
    if (allowed.length === 0) return;
    const normalizedCurrent = normalizeSizesByType(normalizeCommaValues(editProduct.size_options), editProduct.size_type);
    const nextValue = (normalizedCurrent.length > 0 ? normalizedCurrent : allowed).join(', ');
    if (nextValue !== editProduct.size_options) {
      setEditProduct(prev => ({ ...prev, size_options: nextValue }));
    }
  }, [editingProductId, editProduct.size_type, editProduct.size_options]);

  const handleTabChange = (nextTab: StaffTab) => {
    setActiveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'overview') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const loadStaffData = async () => {
      setLoading(true);
      setError('');

      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setError('Không thể tải thông tin tài khoản nhân viên.');
        setLoading(false);
        return;
      }

      const role = (profile.role || 'customer') as 'customer' | 'staff' | 'admin';
      const isAdminRole = role === 'admin';
      const isStaffRole = role === 'staff' || isAdminRole;
      const hasDashboardAccess = dashboardMode === 'admin' ? isAdminRole : isStaffRole;
      setIsStaff(isStaffRole);
      setIsAdmin(isAdminRole);

      if (!hasDashboardAccess) {
        setError(
          dashboardMode === 'admin'
            ? 'Bạn không có quyền truy cập dashboard quản trị viên.'
            : 'Bạn không có quyền truy cập dashboard nhân viên.',
        );
        setLoading(false);
        return;
      }

      const [ordersRes, productsRes, categoriesRes, customersRes, supportRes, promotionsRes, reviewsRes] = await Promise.all([
        db.from('orders').select('*, order_items(*, products(*))').order('created_at', { ascending: false }),
        db.from('products').select('*, categories(*)').order('created_at', { ascending: false }),
        db.from('categories').select('*').order('created_at', { ascending: false }),
        db.from('profiles').select('*').order('created_at', { ascending: false }),
        db.from('support_requests').select('*').order('created_at', { ascending: false }),
        db.from('promotions').select('*').order('created_at', { ascending: false }),
        db.from('reviews').select('*').order('created_at', { ascending: false }),
      ]);

      if (ordersRes.error || productsRes.error || categoriesRes.error || customersRes.error) {
        setError('Không thể tải dữ liệu dashboard nhân viên.');
        setLoading(false);
        return;
      }

      const customerMap = new Map<string, Profile>(
        (customersRes.data || []).map((item: any) => [item.id, item as Profile]),
      );

      const nextOrders = (ordersRes.data || []).map((order: any) => ({
        ...order,
        customer: customerMap.get(order.user_id),
      })) as OrderWithCustomer[];

      setOrders(nextOrders);
      setProducts((productsRes.data || []) as Product[]);
      setCategories((categoriesRes.data || []) as Category[]);
      setCustomers((customersRes.data || []) as Profile[]);

      if (supportRes.error) {
        setSupportFeatureEnabled(false);
      } else {
        setSupportFeatureEnabled(true);
        setSupportRequests((supportRes.data || []) as SupportRequest[]);
      }

      if (promotionsRes.error) {
        setPromotionFeatureEnabled(false);
      } else {
        setPromotionFeatureEnabled(true);
        setPromotions((promotionsRes.data || []) as PromotionItem[]);
      }

      if (reviewsRes.error) {
        setReviewFeatureEnabled(false);
      } else {
        setReviewFeatureEnabled(true);
        setReviews((reviewsRes.data || []) as ReviewItem[]);
      }

      setOrderStatusDrafts(
        nextOrders.reduce<Record<string, Order['status']>>((acc, order) => {
          acc[order.id] = order.status;
          return acc;
        }, {}),
      );
      setStockDrafts(
        (productsRes.data || []).reduce((acc: Record<string, string>, product: any) => {
          acc[product.id] = String(product.stock);
          return acc;
        }, {}),
      );
      setSupportStatusDrafts(
        (supportRes.data || []).reduce((acc: Record<string, SupportRequest['status']>, item: any) => {
          acc[item.id] = item.status;
          return acc;
        }, {}),
      );
      setReviewStatusDrafts(
        (reviewsRes.data || []).reduce((acc: Record<string, string>, item: any) => {
          const statusValue = item.status || (item.is_hidden ? 'hidden' : 'approved');
          acc[item.id] = statusValue;
          return acc;
        }, {}),
      );

      setLoading(false);
    };

    loadStaffData();
  }, [authLoading, dashboardMode, navigate, user]);

  const customerStats = useMemo(() => {
    if (!shouldComputeOverview && activeTab !== 'customers') {
      return new Map<string, { orderCount: number; totalSpent: number }>();
    }
    const map = new Map<string, { orderCount: number; totalSpent: number }>();
    orders.forEach(order => {
      const current = map.get(order.user_id) || { orderCount: 0, totalSpent: 0 };
      map.set(order.user_id, {
        orderCount: current.orderCount + 1,
        totalSpent: current.totalSpent + Number(order.total || 0),
      });
    });
    return map;
  }, [orders, shouldComputeOverview, activeTab]);

  const statusCounts = useMemo(() => {
    if (!shouldComputeOverview) {
      return { pending: 0, confirmed: 0, shipping: 0, delivered: 0, cancelled: 0 };
    }
    const counts: Record<Order['status'], number> = {
      pending: 0,
      confirmed: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
    };
    orders.forEach(order => {
      counts[order.status] += 1;
    });
    return counts;
  }, [orders, shouldComputeOverview]);

  const totalRevenue = useMemo(() => {
    if (!shouldComputeOverview) return 0;
    return orders.filter(order => order.status !== 'cancelled').reduce((sum, order) => sum + Number(order.total || 0), 0);
  }, [orders, shouldComputeOverview]);

  const weekRevenue = useMemo(() => {
    if (!shouldComputeOverview) return 0;
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return orders
      .filter(order => {
        const createdAt = new Date(order.created_at).getTime();
        return createdAt >= weekAgo && createdAt <= now && order.status !== 'cancelled';
      })
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
  }, [orders, shouldComputeOverview]);

  const lowStockProducts = useMemo(() => {
    if (!shouldComputeOverview) return [];
    return products.filter(product => Number(product.stock || 0) <= 10).sort((a, b) => a.stock - b.stock).slice(0, 6);
  }, [products, shouldComputeOverview]);

  const recentOrders = useMemo(() => {
    if (!shouldComputeOverview) return [];
    return orders.slice(0, 6);
  }, [orders, shouldComputeOverview]);

  const topSellingProducts = useMemo(() => {
    if (!shouldComputeOverview) return [];
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    orders.forEach(order => {
      (order.order_items || []).forEach(item => {
        const key = item.product_id;
        const current = map.get(key) || {
          name: item.products?.name || `#${item.product_id.slice(0, 8)}`,
          quantity: 0,
          revenue: 0,
        };
        current.quantity += Number(item.quantity || 0);
        current.revenue += Number(item.price || 0) * Number(item.quantity || 0);
        map.set(key, current);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [orders, shouldComputeOverview]);

  const quarterlyRevenue = useMemo(() => {
    if (!shouldComputeOverview) return [];
    const quarters = Array.from({ length: 4 }).map((_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (3 - index) * 3, 1);
      return {
        key: getQuarterKey(date),
        label: getQuarterLabel(date),
        value: 0,
      };
    });
    const quarterMap = new Map(quarters.map(quarter => [quarter.key, { ...quarter }]));
    orders.forEach(order => {
      if (order.status === 'cancelled') return;
      const key = getQuarterKey(new Date(order.created_at));
      const entry = quarterMap.get(key);
      if (entry) {
        entry.value += Number(order.total || 0);
      }
    });
    return quarters.map(quarter => quarterMap.get(quarter.key) || quarter);
  }, [orders, shouldComputeOverview]);

  const maxQuarterRevenue = useMemo(
    () => Math.max(1, ...quarterlyRevenue.map(item => item.value)),
    [quarterlyRevenue],
  );

  const categoryDistribution = useMemo(() => {
    if (!shouldComputeOverview) {
      return { segments: [], conic: 'conic-gradient(#e2e8f0 0deg 360deg)' };
    }
    const totalProducts = Math.max(1, products.length);
    const byCategory = new Map<string, number>();
    products.forEach(product => {
      const key = product.category_id || 'uncategorized';
      byCategory.set(key, (byCategory.get(key) || 0) + 1);
    });
    const palette = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
    const segments = Array.from(byCategory.entries())
      .map(([categoryId, count], index) => {
        const categoryName = categories.find(item => item.id === categoryId)?.name || 'Khác';
        return {
          categoryId,
          name: categoryName,
          count,
          percent: Math.round((count / totalProducts) * 100),
          color: palette[index % palette.length],
        };
      })
      .sort((a, b) => b.count - a.count);

    const conicParts: string[] = [];
    let start = 0;
    segments.forEach(segment => {
      const end = start + (segment.count / totalProducts) * 360;
      conicParts.push(`${segment.color} ${start}deg ${end}deg`);
      start = end;
    });
    return {
      segments,
      conic: conicParts.length > 0 ? `conic-gradient(${conicParts.join(', ')})` : 'conic-gradient(#e2e8f0 0deg 360deg)',
    };
  }, [products, categories, shouldComputeOverview]);

  const openSupportCount = useMemo(
    () => (shouldComputeOverview ? supportRequests.filter(item => item.status !== 'resolved').length : 0),
    [supportRequests, shouldComputeOverview],
  );
  const activePromotionCount = useMemo(
    () => (shouldComputeOverview ? promotions.filter(item => item.is_active === true || item.status === 'active').length : 0),
    [promotions, shouldComputeOverview],
  );
  const pendingReviewCount = useMemo(
    () => (shouldComputeOverview ? reviews.filter(item => (item.status || '').toLowerCase() === 'pending').length : 0),
    [reviews, shouldComputeOverview],
  );

  const visibleProducts = useMemo(() => products.slice(0, MAX_RENDER_ITEMS), [products]);
  const visibleNewProducts = useMemo(
    () => [...products]
      .filter(item => {
        const createdAtMs = new Date(item.created_at || '').getTime();
        if (!Number.isFinite(createdAtMs)) return false;
        return currentTimeMs - createdAtMs <= NEW_PRODUCT_WINDOW_MS;
      })
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      .slice(0, MAX_RENDER_ITEMS),
    [products, currentTimeMs],
  );
  const visibleFeaturedProducts = useMemo(
    () => products.filter(item => item.featured).slice(0, MAX_RENDER_ITEMS),
    [products],
  );
  const visibleOrders = useMemo(() => orders.slice(0, MAX_RENDER_ITEMS), [orders]);
  const visibleCustomers = useMemo(() => customers.slice(0, MAX_RENDER_ITEMS), [customers]);
  const visibleSupportRequests = useMemo(() => supportRequests.slice(0, MAX_RENDER_ITEMS), [supportRequests]);
  const visiblePromotions = useMemo(() => promotions.slice(0, MAX_RENDER_ITEMS), [promotions]);
  const visibleReviews = useMemo(() => reviews.slice(0, MAX_RENDER_ITEMS), [reviews]);

  const handleConfirmOrder = async (orderId: string) => {
    setSubmitting(true);
    const { error: updateError } = await db
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', orderId)
      .eq('status', 'pending');
    setSubmitting(false);
    if (updateError) {
      window.alert('Không thể xác nhận đơn hàng.');
      return;
    }
    setOrders(prev => prev.map(order => (order.id === orderId ? { ...order, status: 'confirmed' } : order)));
    setOrderStatusDrafts(prev => ({ ...prev, [orderId]: 'confirmed' }));
  };

  const handleUpdateOrderStatus = async (orderId: string) => {
    const nextStatus = orderStatusDrafts[orderId];
    if (!nextStatus) return;
    setSubmitting(true);
    const { error: updateError } = await db
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId);
    setSubmitting(false);
    if (updateError) {
      window.alert('Không thể cập nhật trạng thái đơn hàng.');
      return;
    }
    setOrders(prev => prev.map(order => (order.id === orderId ? { ...order, status: nextStatus } : order)));
  };

  const handleUpdateStock = async (productId: string, sizeKey?: string | null) => {
    const draftKey = sizeKey ? `${productId}::${sizeKey}` : productId;
    const stockValue = Number(stockDrafts[draftKey] || 0);
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      window.alert('Số lượng tồn kho không hợp lệ.');
      return;
    }
    const product = products.find(item => item.id === productId);
    if (!product) return;

    let nextStock = Math.floor(stockValue);
    let nextSizeStockRaw: string | null = product.size_stock || null;
    if (sizeKey) {
      const sizeStockMap = parseSizeStockMap(product.size_stock);
      if (Object.keys(sizeStockMap).length === 0) {
        const allSizeOptions = getProductSizeOptions(product);
        allSizeOptions.forEach(option => {
          sizeStockMap[option] = 0;
        });
      }
      sizeStockMap[sizeKey] = Math.floor(stockValue);
      nextStock = Object.values(sizeStockMap).reduce((sum, value) => sum + Math.floor(Number(value) || 0), 0);
      nextSizeStockRaw = JSON.stringify(sizeStockMap);
    }

    setSubmitting(true);
    const { error: updateError } = await db
      .from('products')
      .update({ stock: nextStock, size_stock: nextSizeStockRaw })
      .eq('id', productId);
    setSubmitting(false);
    if (updateError) {
      window.alert('Không thể cập nhật số lượng sản phẩm.');
      return;
    }
    setProducts(prev => prev.map(item => (
      item.id === productId
        ? { ...item, stock: nextStock, size_stock: nextSizeStockRaw || undefined }
        : item
    )));
  };

  const handleCategoryImageChange = async (event: React.ChangeEvent<HTMLInputElement>, target: 'new' | 'edit') => {
    const file = event.target.files?.[0];
    const setUrl = target === 'new' ? setNewCategoryImageUrl : setEditCategoryImageUrl;
    const setName = target === 'new' ? setNewCategoryImageName : setEditCategoryImageName;
    if (!file) {
      setUrl('');
      setName('');
      return;
    }

    try {
      const { imageUrl, finalFile, compressed } = await prepareImageForDatabase(file);
      setUrl(imageUrl);
      setName(
        compressed
          ? `${file.name} (đã nén còn ${(finalFile.size / 1024).toFixed(0)}KB)`
          : `${file.name} (${(finalFile.size / 1024).toFixed(0)}KB)`,
      );
    } catch {
      window.alert('Không thể xử lý hoặc upload ảnh. Vui lòng thử lại.');
      setUrl('');
      setName('');
    }
  };

  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newCategoryName.trim();
    const slug = (newCategorySlug.trim() || slugify(name)).slice(0, 100);
    if (!name || !slug) {
      window.alert('Vui lòng nhập tên danh mục và slug.');
      return;
    }

    const sizeValues = getAllowedSizesByType(newCategorySizeType).join(',');

    setSubmitting(true);
    const { data, error: createError } = await db
      .from('categories')
      .insert({
        name,
        slug,
        description: newCategoryDescription.trim(),
        image_url: newCategoryImageUrl,
        size_type: newCategorySizeType,
        size_values: sizeValues || null,
      })
      .select('*')
      .maybeSingle();
    setSubmitting(false);

    if (createError || !data) {
      window.alert(createError?.message || 'Không thể tạo danh mục mới.');
      return;
    }

    setCategories(prev => [data as Category, ...prev]);
    setNewCategoryName('');
    setNewCategorySlug('');
    setNewCategoryDescription('');
    setNewCategorySizeType('none');
    setNewCategoryImageUrl('');
    setNewCategoryImageName('');
  };

  const startEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
    setEditCategorySlug(cat.slug);
    setEditCategoryDescription(cat.description || '');
    setEditCategorySizeType((cat.size_type || 'none') as CategorySizeType);
    setEditCategoryImageUrl(cat.image_url || '');
    setEditCategoryImageName(cat.image_url ? 'Ảnh hiện tại' : '');
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditCategoryName('');
    setEditCategorySlug('');
    setEditCategoryDescription('');
    setEditCategorySizeType('none');
    setEditCategoryImageUrl('');
    setEditCategoryImageName('');
  };

  const handleUpdateCategory = async (categoryId: string) => {
    const name = editCategoryName.trim();
    const slug = editCategorySlug.trim();
    if (!name || !slug) {
      window.alert('Tên và slug không được để trống.');
      return;
    }
    const sizeValues = getAllowedSizesByType(editCategorySizeType).join(',');
    setSubmitting(true);
    const { error: updateError } = await db
      .from('categories')
      .update({
        name,
        slug,
        description: editCategoryDescription.trim(),
        image_url: editCategoryImageUrl,
        size_type: editCategorySizeType,
        size_values: sizeValues || null,
      })
      .eq('id', categoryId);
    setSubmitting(false);
    if (updateError) {
      window.alert('Không thể cập nhật danh mục.');
      return;
    }
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              name,
              slug,
              description: editCategoryDescription.trim(),
              image_url: editCategoryImageUrl,
              size_type: editCategorySizeType,
              size_values: sizeValues || undefined,
            }
          : cat,
      ),
    );
    cancelEditCategory();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa danh mục này?')) return;
    setSubmitting(true);
    const { error: deleteError } = await db
      .from('categories')
      .delete()
      .eq('id', categoryId);
    setSubmitting(false);
    if (deleteError) {
      window.alert('Không thể xóa danh mục. Có thể còn sản phẩm thuộc danh mục này.');
      return;
    }
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    if (editingCategoryId === categoryId) cancelEditCategory();
  };

  const handleCreateProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newProduct.name.trim();
    const slug = (newProduct.slug.trim() || slugify(name)).slice(0, 100);
    const brand = newProduct.brand.trim();
    const description = newProduct.description.trim();
    const categoryId = newProduct.category_id.trim();
    const imageUrl = newProduct.image_url.trim();
    const colorOptions = normalizeCommaValues(newProduct.color_options).join(', ');
    const categorySizeType = (newProduct.size_type || 'none') as CategorySizeType;
    const rawSizeOptions = normalizeCommaValues(newProduct.size_options);
    const normalizedSizeOptions = normalizeSizesByType(rawSizeOptions, categorySizeType);
    const sizeOptions = normalizedSizeOptions.join(', ');
    const basePrice = Number(newProduct.price || 0);
    const discountPercent = Number(newProduct.discount_percent || 0);
    const price = computeDiscountedPrice(basePrice, discountPercent);
    const stock = Math.floor(Number(newProduct.stock || 0));
    const originalPrice = discountPercent > 0 ? basePrice : null;

    if (!name || !slug || !categoryId) {
      window.alert('Vui lòng nhập tên, slug và chọn danh mục sản phẩm.');
      return;
    }
    if (!imageUrl) {
      window.alert('Vui lòng chọn ảnh sản phẩm từ máy của bạn.');
      return;
    }
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      window.alert('Giá gốc không hợp lệ.');
      return;
    }
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 99) {
      window.alert('Phần trăm giảm giá phải từ 0 đến 99.');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      window.alert('Tồn kho không hợp lệ.');
      return;
    }
    if (categorySizeType !== 'none' && normalizedSizeOptions.length === 0) {
      window.alert('Size không hợp lệ với danh mục đã chọn.');
      return;
    }
    const mergedGallery = Array.from(new Set([imageUrl, ...newProductGalleryUrls]));

    setSubmitting(true);
    const { data, error: createError } = await db
      .from('products')
      .insert({
        name,
        slug,
        description,
        brand: brand || 'Nika Shop',
        category_id: categoryId,
        image_url: imageUrl,
        price,
        original_price: originalPrice,
        stock,
        featured: newProduct.featured,
        size_type: categorySizeType,
        color_options: colorOptions || null,
        size_options: sizeOptions || null,
        image_gallery: mergedGallery.length > 0 ? JSON.stringify(mergedGallery) : null,
        rating: 0,
        reviews_count: 0,
      })
      .select('*, categories(*)')
      .maybeSingle();
    setSubmitting(false);

    if (createError || !data) {
      const message = createError?.message || 'Không thể tạo sản phẩm mới.';
      window.alert(message);
      return;
    }

    setProducts(prev => [data as Product, ...prev]);
    setStockDrafts(prev => ({ ...prev, [data.id]: String((data as Product).stock || stock) }));
    setNewProduct({
      name: '',
      slug: '',
      description: '',
      brand: '',
      category_id: categoryId,
      image_url: '',
      size_type: categorySizeType,
      color_options: '',
      size_options: getAllowedSizesByType(categorySizeType).join(', '),
      price: '',
      original_price: '',
      discount_percent: '',
      stock: '',
      featured: false,
    });
    setProductImageName('');
    setNewProductGalleryUrls([]);
    setNewProductGalleryNames([]);
  };

  const handleProductImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setProductImageName('');
      setNewProduct(prev => ({ ...prev, image_url: '' }));
      return;
    }
    try {
      const { imageUrl, finalFile, compressed } = await prepareImageForDatabase(file);
      setNewProduct(prev => ({ ...prev, image_url: imageUrl }));
      setNewProductGalleryUrls(prev => Array.from(new Set([imageUrl, ...prev])));
      setProductImageName(
        compressed
          ? `${file.name} (đã nén còn ${(finalFile.size / 1024).toFixed(0)}KB)`
          : `${file.name} (${(finalFile.size / 1024).toFixed(0)}KB)`,
      );
    } catch {
      window.alert('Không thể xử lý hoặc upload ảnh. Vui lòng thử lại.');
      setProductImageName('');
      setNewProduct(prev => ({ ...prev, image_url: '' }));
    }
  };

  const handleProductGalleryChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    target: 'new' | 'edit',
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const uploadedUrls: string[] = [];
    const uploadedNames: string[] = [];
    for (const file of files) {
      try {
        const { imageUrl, finalFile, compressed } = await prepareImageForDatabase(file);
        uploadedUrls.push(imageUrl);
        uploadedNames.push(
          compressed
            ? `${file.name} (đã nén còn ${(finalFile.size / 1024).toFixed(0)}KB)`
            : `${file.name} (${(finalFile.size / 1024).toFixed(0)}KB)`,
        );
      } catch {
        window.alert(`Không thể upload ảnh: ${file.name}`);
      }
    }
    if (uploadedUrls.length === 0) return;
    if (target === 'new') {
      setNewProductGalleryUrls(prev => Array.from(new Set([...prev, ...uploadedUrls])));
      setNewProductGalleryNames(prev => [...prev, ...uploadedNames]);
    } else {
      setEditProductGalleryUrls(prev => Array.from(new Set([...prev, ...uploadedUrls])));
      setEditProductGalleryNames(prev => [...prev, ...uploadedNames]);
    }
    event.target.value = '';
  };

  const removeGalleryImage = (target: 'new' | 'edit', imageUrl: string) => {
    if (target === 'new') {
      setNewProductGalleryUrls(prev => prev.filter(url => url !== imageUrl));
      return;
    }
    setEditProductGalleryUrls(prev => prev.filter(url => url !== imageUrl));
  };

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    const parsedGallery = parseImageGallery(product.image_gallery, product.image_url);
    setEditProduct({
      name: product.name || '',
      slug: product.slug || '',
      description: product.description || '',
      brand: product.brand || '',
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      size_type: (product.size_type || product.categories?.size_type || 'none') as CategorySizeType,
      color_options: product.color_options || '',
      size_options: product.size_options || '',
      price: String((product.original_price && product.original_price > product.price) ? product.original_price : product.price),
      original_price: product.original_price == null ? '' : String(product.original_price),
      discount_percent: String(deriveDiscountPercentFromPrices(product.price, product.original_price)),
      stock: String(product.stock ?? 0),
      featured: Boolean(product.featured),
    });
    setEditProductImageName(product.image_url ? 'Ảnh hiện tại' : '');
    setEditProductGalleryUrls(parsedGallery);
    setEditProductGalleryNames(parsedGallery.map((_, index) => `Ảnh ${index + 1}`));
  };

  const cancelEditProduct = () => {
    setEditingProductId(null);
    setEditProduct({
      name: '',
      slug: '',
      description: '',
      brand: '',
      category_id: '',
      image_url: '',
      size_type: 'none',
      color_options: '',
      size_options: '',
      price: '',
      original_price: '',
      discount_percent: '',
      stock: '',
      featured: false,
    });
    setEditProductImageName('');
    setEditProductGalleryUrls([]);
    setEditProductGalleryNames([]);
  };

  const handleEditProductImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { imageUrl, finalFile, compressed } = await prepareImageForDatabase(file);
      setEditProduct(prev => ({ ...prev, image_url: imageUrl }));
      setEditProductGalleryUrls(prev => Array.from(new Set([imageUrl, ...prev])));
      setEditProductImageName(
        compressed
          ? `${file.name} (đã nén còn ${(finalFile.size / 1024).toFixed(0)}KB)`
          : `${file.name} (${(finalFile.size / 1024).toFixed(0)}KB)`,
      );
    } catch {
      window.alert('Không thể xử lý hoặc upload ảnh. Vui lòng thử lại.');
    }
  };

  const handleUpdateProduct = async (productId: string) => {
    const name = editProduct.name.trim();
    const slug = (editProduct.slug.trim() || slugify(name)).slice(0, 100);
    const categoryId = editProduct.category_id.trim();
    const imageUrl = editProduct.image_url.trim();
    const brand = editProduct.brand.trim();
    const description = editProduct.description.trim();
    const basePrice = Number(editProduct.price || 0);
    const discountPercent = Number(editProduct.discount_percent || 0);
    const price = computeDiscountedPrice(basePrice, discountPercent);
    const stock = Math.floor(Number(editProduct.stock || 0));
    const originalPrice = discountPercent > 0 ? basePrice : null;
    const colorOptions = normalizeCommaValues(editProduct.color_options).join(', ');
    const sizeType = (editProduct.size_type || 'none') as CategorySizeType;
    const normalizedSizeOptions = normalizeSizesByType(normalizeCommaValues(editProduct.size_options), sizeType);
    const sizeOptions = normalizedSizeOptions.join(', ');
    const mergedGallery = Array.from(new Set([imageUrl, ...editProductGalleryUrls]));

    if (!name || !slug || !categoryId) {
      window.alert('Vui lòng nhập tên, slug và chọn danh mục.');
      return;
    }
    if (!imageUrl) {
      window.alert('Vui lòng chọn ảnh sản phẩm.');
      return;
    }
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      window.alert('Giá gốc không hợp lệ.');
      return;
    }
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 99) {
      window.alert('Phần trăm giảm giá phải từ 0 đến 99.');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      window.alert('Tồn kho không hợp lệ.');
      return;
    }
    if (sizeType !== 'none' && normalizedSizeOptions.length === 0) {
      window.alert('Size không hợp lệ với loại size đã chọn.');
      return;
    }

    setSubmitting(true);
    const { data, error: updateError } = await db
      .from('products')
      .update({
        name,
        slug,
        description,
        brand: brand || 'Nika Shop',
        category_id: categoryId,
        image_url: imageUrl,
        price,
        original_price: originalPrice,
        stock,
        featured: editProduct.featured,
        size_type: sizeType,
        color_options: colorOptions || null,
        size_options: sizeOptions || null,
        image_gallery: mergedGallery.length > 0 ? JSON.stringify(mergedGallery) : null,
      })
      .eq('id', productId)
      .select('*, categories(*)')
      .maybeSingle();
    setSubmitting(false);

    if (updateError || !data) {
      window.alert(updateError?.message || 'Không thể cập nhật sản phẩm.');
      return;
    }

    setProducts(prev => prev.map(item => (item.id === productId ? data as Product : item)));
    setStockDrafts(prev => ({ ...prev, [productId]: String(stock) }));
    cancelEditProduct();
  };

  const handleSupportStatusUpdate = async (requestId: string) => {
    const nextStatus = supportStatusDrafts[requestId];
    if (!nextStatus) return;
    setSubmitting(true);
    const payload = nextStatus === 'resolved'
      ? { status: nextStatus, resolved_at: new Date().toISOString() }
      : { status: nextStatus, resolved_at: null };

    const { error: updateError } = await db
      .from('support_requests')
      .update(payload)
      .eq('id', requestId);
    setSubmitting(false);

    if (updateError) {
      window.alert('Không thể cập nhật yêu cầu hỗ trợ.');
      return;
    }
    setSupportRequests(prev => prev.map(item => (
      item.id === requestId
        ? { ...item, status: nextStatus, resolved_at: payload.resolved_at || null }
        : item
    )));
  };

  const handlePromotionToggle = async (promotionId: string) => {
    const promotion = promotions.find(item => item.id === promotionId);
    if (!promotion) return;
    const currentActive = promotion.is_active === true || promotion.status === 'active';
    const nextActive = !currentActive;
    const payload: Record<string, unknown> = {};
    if (typeof promotion.is_active === 'boolean') payload.is_active = nextActive;
    if (typeof promotion.status === 'string') payload.status = nextActive ? 'active' : 'inactive';
    if (Object.keys(payload).length === 0) payload.status = nextActive ? 'active' : 'inactive';

    setSubmitting(true);
    const { error: updateError } = await db.from('promotions').update(payload).eq('id', promotionId);
    setSubmitting(false);
    if (updateError) {
      window.alert('Không thể cập nhật trạng thái khuyến mãi.');
      return;
    }
    setPromotions(prev => prev.map(item => (
      item.id === promotionId
        ? { ...item, ...payload }
        : item
    )));
  };

  const handleReviewStatusUpdate = async (reviewId: string) => {
    const nextStatus = reviewStatusDrafts[reviewId] || 'approved';
    const review = reviews.find(item => item.id === reviewId);
    if (!review) return;
    const payload: Record<string, unknown> = {};
    if (typeof review.status === 'string') payload.status = nextStatus;
    if (typeof review.is_hidden === 'boolean') payload.is_hidden = nextStatus === 'hidden';
    if (Object.keys(payload).length === 0) payload.status = nextStatus;

    setSubmitting(true);
    const { error: updateError } = await db.from('reviews').update(payload).eq('id', reviewId);
    setSubmitting(false);
    if (updateError) {
      window.alert('Không thể cập nhật trạng thái đánh giá.');
      return;
    }
    setReviews(prev => prev.map(item => (
      item.id === reviewId
        ? { ...item, ...payload }
        : item
    )));
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isStaff) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Không có quyền truy cập</h2>
        <p className="text-gray-500 mb-6">{error || 'Tài khoản này không phải nhân viên.'}</p>
        <Link to="/dashboard" className="inline-flex px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold">
          Quay về dashboard cá nhân
        </Link>
      </div>
    );
  }

  const menuItems: Array<{ id: StaffTab; label: string; icon: any }> = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Đơn hàng', icon: Package },
    { id: 'categories', label: 'Danh mục', icon: Tags },
    { id: 'customers', label: 'Khách hàng', icon: Users },
    { id: 'promotions', label: 'Khuyến mãi', icon: TicketPercent },
    { id: 'reviews', label: 'Đánh giá', icon: Star },
    { id: 'support', label: 'Hỗ trợ', icon: Headset },
  ];

  const productMenuItems: Array<{ id: StaffTab; label: string }> = [
    { id: 'products_list', label: 'Danh sách sản phẩm' },
    { id: 'new_products', label: 'Sản phẩm mới' },
    { id: 'featured_products', label: 'Sản phẩm nổi bật' },
    { id: 'inventory', label: 'Quản lý kho' },
    { id: 'purchase_orders', label: 'Đặt hàng nhập' },
    { id: 'goods_receipt', label: 'Nhập hàng' },
    { id: 'stock_audit', label: 'Kiểm hàng' },
    { id: 'transfers', label: 'Chuyển hàng' },
    { id: 'suppliers', label: 'Nhà cung cấp' },
    { id: 'cost_adjustment', label: 'Điều chỉnh giá vốn' },
  ];

  const tabLabelMap: Record<StaffTab, string> = {
    overview: 'Admin Dashboard',
    orders: 'Đơn hàng',
    products_list: 'Danh sách sản phẩm',
    new_products: 'Sản phẩm mới',
    featured_products: 'Sản phẩm nổi bật',
    inventory: 'Quản lý kho',
    purchase_orders: 'Đặt hàng nhập',
    goods_receipt: 'Nhập hàng',
    stock_audit: 'Kiểm hàng',
    transfers: 'Chuyển hàng',
    suppliers: 'Nhà cung cấp',
    cost_adjustment: 'Điều chỉnh giá vốn',
    categories: 'Danh mục',
    customers: 'Khách hàng',
    support: 'Hỗ trợ',
    promotions: 'Khuyến mãi',
    reviews: 'Đánh giá',
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-100">
      <div className="flex">
        <aside
          className="hidden lg:flex flex-shrink-0 min-h-[calc(100vh-80px)] flex-col px-5 py-6 border-r shadow-xl overflow-y-auto"
          style={{
            backgroundColor: '#050505',
            color: '#ffffff',
            borderColor: '#27272a',
            width: '280px',
            minWidth: '280px',
            maxWidth: '280px',
          }}
        >
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Nika Admin</p>
              <p className="text-xs text-zinc-300">{isAdmin ? 'Admin panel' : 'Staff panel'}</p>
            </div>
          </div>

          <p className="px-2 text-[11px] tracking-widest text-zinc-300 uppercase mb-2">Menu</p>
          <div className="space-y-1">
            {menuItems.filter(item => item.id === 'overview').map(item => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}

            <button
              onClick={() => setIsProductMenuOpen(prev => !prev)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                PRODUCT_TABS.includes(activeTab)
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              <span className="inline-flex items-center gap-3">
                <Boxes className="w-4 h-4" />
                Sản phẩm
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isProductMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProductMenuOpen && (
              <div className="ml-4 space-y-1 border-l border-zinc-700 pl-3">
                {productMenuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      activeTab === item.id
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {menuItems.filter(item => item.id !== 'overview').map(item => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-auto pt-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-zinc-100 hover:text-white transition-colors"
            >
              <Home className="w-4 h-4" />
              Về trang khách hàng
            </Link>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 sm:px-6 flex flex-wrap items-center gap-3 justify-between mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {tabLabelMap[activeTab]}
              </h1>
              <p className="text-sm text-slate-500">Tổng quan vận hành và dữ liệu kinh doanh theo `readme.md`</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  placeholder="Tìm kiếm..."
                  className="bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
                />
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <UserCircle2 className="w-5 h-5 text-slate-500" />
                <div className="text-sm leading-tight">
                  <p className="font-semibold text-slate-900">{user.email || 'Tài khoản nội bộ'}</p>
                  <p className="text-xs text-slate-500">{isAdmin ? 'Admin' : 'Staff'}</p>
                </div>
              </div>
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <BadgeDollarSign className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{formatCompactNumber(totalRevenue)}</p>
                  <p className="text-sm text-slate-500">Tổng doanh thu</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{formatCompactNumber(weekRevenue)}</p>
                  <p className="text-sm text-slate-500">Doanh thu 7 ngày</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
                    <Package className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
                  <p className="text-sm text-slate-500">Tổng đơn hàng</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
                  <p className="text-sm text-slate-500">Người dùng</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="font-semibold text-slate-900 mb-3">Top sản phẩm bán chạy</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {topSellingProducts.length === 0 && (
                    <p className="text-sm text-slate-500">Chưa có dữ liệu bán hàng.</p>
                  )}
                  {topSellingProducts.map(item => (
                    <div key={item.name} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2.5">
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">Đã bán: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{formatPrice(item.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">Doanh thu theo quý</h3>
                    <span className="text-xs text-slate-500">Quarterly revenue</span>
                  </div>
                  <div className="h-64 flex items-end gap-4">
                    {quarterlyRevenue.map(quarter => (
                      <div key={quarter.key} className="flex-1 min-w-0 flex flex-col items-center gap-2">
                        <div className="w-full flex justify-center">
                          <div
                            className="w-8 sm:w-10 rounded-t-lg bg-gradient-to-t from-blue-600 to-sky-400 transition-all"
                            style={{ height: `${Math.max(10, Math.round((quarter.value / maxQuarterRevenue) * 170))}px` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">{quarter.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <h3 className="font-semibold text-slate-900">% các mặt hàng (theo danh mục)</h3>
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-44 h-44 rounded-full" style={{ background: categoryDistribution.conic }}>
                      <div className="absolute inset-8 rounded-full bg-white flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Tổng SP</p>
                          <p className="text-xl font-bold text-slate-900">{products.length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="w-full space-y-2">
                      {categoryDistribution.segments.slice(0, 5).map(segment => (
                        <div key={segment.categoryId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
                            <span className="text-slate-600">{segment.name}</span>
                          </div>
                          <span className="font-semibold text-slate-900">{segment.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-900 mb-3">Cảnh báo vận hành</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                      <p className="text-xs text-amber-700 mb-1">Sắp hết hàng</p>
                      <p className="text-xl font-bold text-amber-800">{lowStockProducts.length}</p>
                    </div>
                    <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                      <p className="text-xs text-rose-700 mb-1">Yêu cầu chưa xử lý</p>
                      <p className="text-xl font-bold text-rose-800">{supportFeatureEnabled ? openSupportCount : 0}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                      <p className="text-xs text-emerald-700 mb-1">Khuyến mãi đang chạy</p>
                      <p className="text-xl font-bold text-emerald-800">{promotionFeatureEnabled ? activePromotionCount : 0}</p>
                    </div>
                    <div className="rounded-xl bg-violet-50 border border-violet-100 p-3">
                      <p className="text-xs text-violet-700 mb-1">Review chờ duyệt</p>
                      <p className="text-xl font-bold text-violet-800">{reviewFeatureEnabled ? pendingReviewCount : 0}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {lowStockProducts.length === 0 && (
                      <p className="text-sm text-slate-500">Không có sản phẩm nào dưới ngưỡng cảnh báo.</p>
                    )}
                    {lowStockProducts.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm border border-slate-100 rounded-lg px-3 py-2">
                        <span className="text-slate-700">{item.name}</span>
                        <span className="font-semibold text-rose-600">{item.stock}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <h3 className="font-semibold text-slate-900">Trạng thái đơn hàng</h3>
                  {ORDER_STATUSES.map(status => {
                    const count = statusCounts[status];
                    const ratio = orders.length > 0 ? (count / orders.length) * 100 : 0;
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-600">{getStatusLabel(status)}</span>
                          <span className="font-semibold text-slate-900">{count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${ratio}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="font-semibold text-slate-900 mb-3">Đơn hàng mới nhất</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-slate-500">
                      <tr>
                        <th className="py-2 pr-4">Mã đơn</th>
                        <th className="py-2 pr-4">Khách hàng</th>
                        <th className="py-2 pr-4">Ngày</th>
                        <th className="py-2 pr-4">Tổng tiền</th>
                        <th className="py-2">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map(order => (
                        <tr key={order.id} className="border-t border-slate-100">
                          <td className="py-2 pr-4 font-medium text-slate-800">#{order.id.slice(0, 8)}</td>
                          <td className="py-2 pr-4 text-slate-600">{order.customer?.full_name || order.user_id}</td>
                          <td className="py-2 pr-4 text-slate-600">{formatDate(order.created_at)}</td>
                          <td className="py-2 pr-4 font-semibold text-slate-900">{formatPrice(order.total)}</td>
                          <td className="py-2">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Xem và xử lý đơn hàng</h2>
              {visibleOrders.map(order => (
                <div key={order.id} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm text-slate-500">Mã đơn: <span className="font-medium text-slate-800">{order.id.slice(0, 8)}...</span></p>
                      <p className="text-sm text-slate-500">
                        Khách hàng: <span className="font-medium text-slate-800">{order.customer?.full_name || order.customer?.phone || order.user_id}</span>
                      </p>
                      <p className="text-sm text-slate-500">Ngày đặt: {formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatPrice(order.total)}</p>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleConfirmOrder(order.id)}
                      disabled={order.status !== 'pending' || submitting}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Xác nhận đơn
                    </button>
                    <select
                      value={orderStatusDrafts[order.id] || order.status}
                      onChange={event => setOrderStatusDrafts(prev => ({ ...prev, [order.id]: event.target.value as Order['status'] }))}
                      className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="pending">Chờ xác nhận</option>
                      <option value="confirmed">Đã xác nhận</option>
                      <option value="shipping">Đang giao</option>
                      <option value="delivered">Đã giao</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      Cập nhật trạng thái
                    </button>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <p className="text-sm text-slate-500">Chưa có đơn hàng nào.</p>}
            </div>
          )}

          {PRODUCT_TABS.includes(activeTab) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              {activeTab === 'products_list' && (
                <>
                  <h2 className="text-lg font-bold text-slate-900">Danh sách sản phẩm</h2>
                  <form onSubmit={handleCreateProduct} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">Thêm sản phẩm mới</h3>
                      <span className="text-xs text-slate-500">Thiết kế theo luồng thêm sản phẩm của Sapo</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      <input value={newProduct.name} onChange={event => setNewProduct(prev => ({ ...prev, name: event.target.value }))} placeholder="Tên sản phẩm *" className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white" />
                      <input value={newProduct.slug} onChange={event => setNewProduct(prev => ({ ...prev, slug: event.target.value }))} placeholder="Slug (để trống tự tạo)" className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white" />
                      <select
                        value={newProduct.category_id}
                        onChange={event => {
                          const nextCategoryId = event.target.value;
                          const nextCategory = categories.find(item => item.id === nextCategoryId);
                          const nextSizeType = (nextCategory?.size_type || 'none') as CategorySizeType;
                          const allowedSizes = getAllowedSizesByType(nextSizeType).join(', ');
                          setNewProduct(prev => ({
                            ...prev,
                            category_id: nextCategoryId,
                            size_type: nextSizeType !== 'none' ? nextSizeType : prev.size_type,
                            size_options: allowedSizes || prev.size_options,
                          }));
                        }}
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="">Chọn danh mục *</option>
                        {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                      <input value={newProduct.brand} onChange={event => setNewProduct(prev => ({ ...prev, brand: event.target.value }))} placeholder="Nhãn hiệu" className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatVndInput(newProduct.price)}
                        onChange={event => setNewProduct(prev => ({ ...prev, price: normalizeVndInput(event.target.value) }))}
                        placeholder="Giá gốc * (VNĐ)"
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                      />
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={newProduct.discount_percent}
                        onChange={event => setNewProduct(prev => ({ ...prev, discount_percent: normalizePercentInput(event.target.value) }))}
                        placeholder="Giảm giá (%)"
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                      />
                      <input
                        type="text"
                        readOnly
                        value={formatVndInput(String(newProductFinalPrice))}
                        placeholder="Giá bán sau giảm (VNĐ)"
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-700"
                      />
                      <input type="number" min={0} value={newProduct.stock} onChange={event => setNewProduct(prev => ({ ...prev, stock: event.target.value }))} placeholder="Tồn kho *" className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white flex items-center justify-between gap-3">
                        <label className="inline-flex items-center gap-2 text-blue-600 font-medium cursor-pointer">
                          <span>Chọn ảnh từ máy</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProductImageChange}
                            className="hidden"
                          />
                        </label>
                        <span className="text-xs text-slate-500 truncate">
                          {productImageName || 'Chưa chọn ảnh'}
                        </span>
                      </div>
                      <textarea rows={2} value={newProduct.description} onChange={event => setNewProduct(prev => ({ ...prev, description: event.target.value }))} placeholder="Mô tả sản phẩm" className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white resize-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="inline-flex items-center gap-2 text-blue-600 font-medium cursor-pointer text-sm">
                        <ImagePlus className="w-4 h-4" />
                        <span>Thêm ảnh phụ (chọn nhiều ảnh)</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={event => handleProductGalleryChange(event, 'new')}
                          className="hidden"
                        />
                      </label>
                      {newProductGalleryUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {newProductGalleryUrls.map((url, index) => (
                            <div key={url} className="relative">
                              <img src={url} alt={`gallery-${index}`} className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                              <button
                                type="button"
                                onClick={() => removeGalleryImage('new', url)}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] leading-4"
                                title="Xóa ảnh"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {newProductGalleryNames.length > 0 && (
                        <p className="text-xs text-slate-500 truncate">{newProductGalleryNames.join(' | ')}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={newProduct.size_type}
                        onChange={event => setNewProduct(prev => ({ ...prev, size_type: event.target.value as CategorySizeType }))}
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="none">Loại size: Không áp dụng</option>
                        <option value="shoes">1. Giày dép</option>
                        <option value="apparel">2. Quần áo</option>
                      </select>
                      <div className="h-10 px-3 border border-slate-200 rounded-lg text-xs bg-white flex items-center text-slate-500">
                        {selectedProductSizeType === 'shoes' && 'Giày dép: chỉ size số 36-42'}
                        {selectedProductSizeType === 'apparel' && 'Quần áo: chỉ size chữ S, M, L, XL, 2XL'}
                        {selectedProductSizeType === 'none' && 'Chưa áp dụng quy tắc size'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        value={newProduct.color_options}
                        onChange={event => setNewProduct(prev => ({ ...prev, color_options: event.target.value }))}
                        placeholder="Màu sắc (VD: Đen/Đỏ, Xanh Navy, Xám/Bạc)"
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                      />
                      <input
                        value={newProduct.size_options}
                        onChange={event => setNewProduct(prev => ({ ...prev, size_options: event.target.value }))}
                        placeholder="Size (tự theo danh mục)"
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                        disabled={selectedProductSizeType !== 'none'}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {selectedProductSizeType === 'shoes' && 'Sản phẩm giày dép chỉ nhận size số: 36-42.'}
                      {selectedProductSizeType === 'apparel' && 'Sản phẩm quần áo chỉ nhận size chữ: S, M, L, XL, 2XL.'}
                      {selectedProductSizeType === 'none' && 'Chọn loại size 1 hoặc 2 để hệ thống tự chuẩn hóa size.'}
                    </p>

                    <p className="text-xs text-slate-500">
                      Sản phẩm mới mặc định chưa nổi bật. Muốn gắn nổi bật, hãy vào mục Sửa sản phẩm.
                    </p>

                    <div className="pt-2 border-t border-slate-200 flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="h-10 min-w-28 px-6 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {submitting ? 'Đang lưu...' : 'Lưu sản phẩm'}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {visibleProducts.map(product => (
                      <div key={product.id} className="border border-slate-100 rounded-xl p-4 space-y-3">
                        {editingProductId === product.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <input
                                value={editProduct.name}
                                onChange={event => setEditProduct(prev => ({ ...prev, name: event.target.value }))}
                                placeholder="Tên sản phẩm *"
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                              />
                              <input
                                value={editProduct.slug}
                                onChange={event => setEditProduct(prev => ({ ...prev, slug: event.target.value }))}
                                placeholder="Slug"
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                              />
                              <select
                                value={editProduct.category_id}
                                onChange={event => setEditProduct(prev => ({ ...prev, category_id: event.target.value }))}
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                              >
                                <option value="">Chọn danh mục *</option>
                                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                              </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <input
                                value={editProduct.brand}
                                onChange={event => setEditProduct(prev => ({ ...prev, brand: event.target.value }))}
                                placeholder="Thương hiệu"
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                              />
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatVndInput(editProduct.price)}
                                onChange={event => setEditProduct(prev => ({ ...prev, price: normalizeVndInput(event.target.value) }))}
                                placeholder="Giá gốc"
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                              />
                              <input
                                type="number"
                                min={0}
                                max={99}
                                value={editProduct.discount_percent}
                                onChange={event => setEditProduct(prev => ({ ...prev, discount_percent: normalizePercentInput(event.target.value) }))}
                                placeholder="Giảm giá (%)"
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                              />
                              <input
                                type="text"
                                readOnly
                                value={formatVndInput(String(editProductFinalPrice))}
                                placeholder="Giá bán sau giảm"
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-700"
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input
                                type="number"
                                min={0}
                                value={editProduct.stock}
                                onChange={event => setEditProduct(prev => ({ ...prev, stock: event.target.value }))}
                                placeholder="Tồn kho"
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setEditProduct(prev => ({ ...prev, featured: !prev.featured }))}
                                className={`h-10 px-3 rounded-lg text-sm font-medium border ${
                                  editProduct.featured
                                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                                    : 'border-slate-200 bg-white text-slate-700'
                                }`}
                              >
                                {editProduct.featured ? 'Đang là sản phẩm nổi bật' : 'Đặt làm sản phẩm nổi bật'}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <select
                                value={editProduct.size_type}
                                onChange={event => setEditProduct(prev => ({ ...prev, size_type: event.target.value as CategorySizeType }))}
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                              >
                                <option value="none">Loại size: Không áp dụng</option>
                                <option value="shoes">1. Giày dép</option>
                                <option value="apparel">2. Quần áo</option>
                              </select>
                              <input
                                value={editProduct.size_options}
                                onChange={event => setEditProduct(prev => ({ ...prev, size_options: event.target.value }))}
                                placeholder="Size"
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                                disabled={editProduct.size_type !== 'none'}
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input
                                value={editProduct.color_options}
                                onChange={event => setEditProduct(prev => ({ ...prev, color_options: event.target.value }))}
                                placeholder="Màu sắc"
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                              />
                              <div className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white flex items-center justify-between gap-3">
                                <label className="inline-flex items-center gap-2 text-blue-600 font-medium cursor-pointer">
                                  <span>Đổi ảnh</span>
                                  <input type="file" accept="image/*" onChange={handleEditProductImageChange} className="hidden" />
                                </label>
                                <span className="text-xs text-slate-500 truncate">{editProductImageName || 'Giữ ảnh hiện tại'}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="inline-flex items-center gap-2 text-blue-600 font-medium cursor-pointer text-sm">
                                <ImagePlus className="w-4 h-4" />
                                <span>Thêm ảnh phụ (chọn nhiều ảnh)</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={event => handleProductGalleryChange(event, 'edit')}
                                  className="hidden"
                                />
                              </label>
                              {editProductGalleryUrls.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {editProductGalleryUrls.map((url, index) => (
                                    <div key={url} className="relative">
                                      <img src={url} alt={`edit-gallery-${index}`} className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                                      <button
                                        type="button"
                                        onClick={() => removeGalleryImage('edit', url)}
                                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] leading-4"
                                        title="Xóa ảnh"
                                      >
                                        x
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {editProductGalleryNames.length > 0 && (
                                <p className="text-xs text-slate-500 truncate">{editProductGalleryNames.join(' | ')}</p>
                              )}
                            </div>
                            <textarea
                              rows={2}
                              value={editProduct.description}
                              onChange={event => setEditProduct(prev => ({ ...prev, description: event.target.value }))}
                              placeholder="Mô tả"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateProduct(product.id)}
                                disabled={submitting}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <Save className="w-4 h-4 inline mr-1" />
                                Lưu
                              </button>
                              <button
                                onClick={cancelEditProduct}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
                              >
                                <X className="w-4 h-4 inline mr-1" />
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{product.name}</p>
                              <p className="text-sm text-slate-500">{product.brand} - {formatPrice(product.price)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-sm text-slate-600">
                                Tồn kho: <span className="font-semibold text-slate-900">{product.stock}</span>
                              </div>
                              <button
                                onClick={() => startEditProduct(product)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                              >
                                <Pencil className="w-4 h-4" />
                                Sửa
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeTab === 'inventory' && (
                <>
                  <h2 className="text-lg font-bold text-slate-900">Quản lý kho</h2>
                  <div className="space-y-3">
                    {visibleProducts.map(product => {
                      const sizeOptions = getProductSizeOptions(product);
                      const selectedSize = inventorySizeDrafts[product.id] || sizeOptions[0] || '';
                      const sizeStockMap = parseSizeStockMap(product.size_stock);
                      const draftKey = selectedSize ? `${product.id}::${selectedSize}` : product.id;
                      const stockValue = stockDrafts[draftKey]
                        ?? (selectedSize ? String(sizeStockMap[selectedSize] ?? 0) : String(product.stock));
                      return (
                        <div key={product.id} className="border border-slate-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{product.name}</p>
                            <p className="text-sm text-slate-500">SKU: {product.slug} • {product.brand}</p>
                            {sizeOptions.length > 0 && (
                              <p className="text-xs text-slate-500 mt-1">Size khả dụng: {sizeOptions.join(', ')}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {sizeOptions.length > 0 && (
                              <select
                                value={selectedSize}
                                onChange={event => setInventorySizeDrafts(prev => ({ ...prev, [product.id]: event.target.value }))}
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                              >
                                {sizeOptions.map(size => (
                                  <option key={size} value={size}>Size {size}</option>
                                ))}
                              </select>
                            )}
                            <input
                              type="number"
                              min={0}
                              value={stockValue}
                              onChange={event => setStockDrafts(prev => ({ ...prev, [draftKey]: event.target.value }))}
                              className="w-28 h-10 px-3 border border-slate-200 rounded-lg text-sm"
                            />
                            <button
                              onClick={() => handleUpdateStock(product.id, selectedSize || null)}
                              disabled={submitting}
                              className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                            >
                              Lưu tồn kho
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {activeTab === 'new_products' && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-900">Sản phẩm mới</h2>
                    <span className="text-xs text-slate-500">Chỉ gồm sản phẩm trong 7 ngày gần nhất</span>
                  </div>
                  <div className="space-y-3">
                    {visibleNewProducts.map(product => (
                      <div key={product.id} className="border border-slate-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{product.name}</p>
                          <p className="text-sm text-slate-500">{product.brand} - {formatPrice(product.price)}</p>
                          <p className="text-xs text-slate-400 mt-1">Tạo lúc: {formatDate(product.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              startEditProduct(product);
                              handleTabChange('products_list');
                            }}
                            className="px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                          >
                            Sửa nhanh
                          </button>
                        </div>
                      </div>
                    ))}
                    {visibleNewProducts.length === 0 && <p className="text-sm text-slate-500">Chưa có sản phẩm nào.</p>}
                  </div>
                </>
              )}

              {activeTab === 'featured_products' && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-900">Sản phẩm nổi bật</h2>
                    <span className="text-xs text-slate-500">Quản lý danh sách hiển thị ưu tiên</span>
                  </div>
                  <div className="space-y-3">
                    {visibleFeaturedProducts.map(product => (
                      <div key={product.id} className="border border-slate-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{product.name}</p>
                          <p className="text-sm text-slate-500">{product.brand} - {formatPrice(product.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              startEditProduct(product);
                              handleTabChange('products_list');
                            }}
                            className="px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                          >
                            Sửa nhanh
                          </button>
                        </div>
                      </div>
                    ))}
                    {visibleFeaturedProducts.length === 0 && (
                      <p className="text-sm text-slate-500">Chưa có sản phẩm nổi bật nào.</p>
                    )}
                  </div>
                </>
              )}

              {!['products_list', 'inventory', 'new_products', 'featured_products'].includes(activeTab) && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{tabLabelMap[activeTab]}</h3>
                  <p className="text-sm text-slate-600">
                    Mục này đã được tách riêng theo phân loại bạn yêu cầu. Mình đã chuẩn bị cấu trúc menu, bước tiếp theo là triển khai chức năng chi tiết cho từng mục.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Quản lý danh mục sản phẩm</h2>

              <form onSubmit={handleCreateCategory} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-4">
                <h3 className="font-semibold text-slate-900">Thêm danh mục mới</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    value={newCategoryName}
                    onChange={event => setNewCategoryName(event.target.value)}
                    placeholder="Tên danh mục *"
                    className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                  <input
                    value={newCategorySlug}
                    onChange={event => setNewCategorySlug(event.target.value)}
                    placeholder="Slug (để trống tự tạo)"
                    className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                  <input
                    value={newCategoryDescription}
                    onChange={event => setNewCategoryDescription(event.target.value)}
                    placeholder="Mô tả"
                    className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={newCategorySizeType}
                    onChange={event => setNewCategorySizeType(event.target.value as CategorySizeType)}
                    className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="none">Không áp dụng size cố định</option>
                    <option value="shoes">Giày dép (size 36-42)</option>
                    <option value="apparel">Quần áo (size S-2XL)</option>
                  </select>
                  <div className="h-10 px-3 border border-slate-200 rounded-lg text-xs bg-white flex items-center text-slate-500">
                    {newCategorySizeType === 'shoes' && 'Rule: 36, 37, 38, 39, 40, 41, 42'}
                    {newCategorySizeType === 'apparel' && 'Rule: S, M, L, XL, 2XL'}
                    {newCategorySizeType === 'none' && 'Rule: chưa cấu hình size'}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-blue-600 font-medium cursor-pointer hover:bg-blue-50 transition-colors">
                    <ImagePlus className="w-4 h-4" />
                    Chọn ảnh danh mục
                    <input type="file" accept="image/*" onChange={event => handleCategoryImageChange(event, 'new')} className="hidden" />
                  </label>
                  <span className="text-xs text-slate-500 truncate">{newCategoryImageName || 'Chưa chọn ảnh (tùy chọn, tối đa 300KB)'}</span>
                  {newCategoryImageUrl && (
                    <img src={newCategoryImageUrl} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                  )}
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-10 min-w-28 px-6 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting ? 'Đang tạo...' : 'Tạo danh mục'}
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                {categories.map(category => (
                  <div key={category.id} className="border border-slate-100 rounded-xl p-4">
                    {editingCategoryId === category.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            value={editCategoryName}
                            onChange={event => setEditCategoryName(event.target.value)}
                            placeholder="Tên danh mục *"
                            className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                          />
                          <input
                            value={editCategorySlug}
                            onChange={event => setEditCategorySlug(event.target.value)}
                            placeholder="Slug *"
                            className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                          />
                          <input
                            value={editCategoryDescription}
                            onChange={event => setEditCategoryDescription(event.target.value)}
                            placeholder="Mô tả"
                            className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <select
                            value={editCategorySizeType}
                            onChange={event => setEditCategorySizeType(event.target.value as CategorySizeType)}
                            className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                          >
                            <option value="none">Không áp dụng size cố định</option>
                            <option value="shoes">Giày dép (size 36-42)</option>
                            <option value="apparel">Quần áo (size S-2XL)</option>
                          </select>
                          <div className="h-10 px-3 border border-slate-200 rounded-lg text-xs bg-white flex items-center text-slate-500">
                            {editCategorySizeType === 'shoes' && 'Rule: 36, 37, 38, 39, 40, 41, 42'}
                            {editCategorySizeType === 'apparel' && 'Rule: S, M, L, XL, 2XL'}
                            {editCategorySizeType === 'none' && 'Rule: chưa cấu hình size'}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-sm text-blue-600 font-medium cursor-pointer hover:bg-blue-50 transition-colors">
                            <ImagePlus className="w-4 h-4" />
                            Đổi ảnh
                            <input type="file" accept="image/*" onChange={event => handleCategoryImageChange(event, 'edit')} className="hidden" />
                          </label>
                          <span className="text-xs text-slate-500 truncate">{editCategoryImageName || 'Không có ảnh'}</span>
                          {editCategoryImageUrl && (
                            <img src={editCategoryImageUrl} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateCategory(category.id)}
                            disabled={submitting}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Save className="w-4 h-4 inline mr-1" />
                            Lưu
                          </button>
                          <button
                            onClick={cancelEditCategory}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
                          >
                            <X className="w-4 h-4 inline mr-1" />
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        {category.image_url ? (
                          <img src={category.image_url} alt={category.name} className="w-14 h-14 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <ImagePlus className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900">{category.name}</p>
                          <p className="text-xs text-slate-500">{category.slug}</p>
                          {category.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{category.description}</p>}
                          <p className="text-xs text-slate-500 mt-1">
                            {category.size_type === 'shoes' && 'Size: 36-42 (Giày dép)'}
                            {category.size_type === 'apparel' && 'Size: S-2XL (Quần áo)'}
                            {(!category.size_type || category.size_type === 'none') && 'Size: chưa cấu hình'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => startEditCategory(category)}
                            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            disabled={submitting}
                            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {categories.length === 0 && <p className="text-sm text-slate-500">Chưa có danh mục nào.</p>}
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="text-lg font-bold text-slate-900">Thông tin khách hàng</h2>
              {visibleCustomers.map(customer => {
                const stats = customerStats.get(customer.id) || { orderCount: 0, totalSpent: 0 };
                return (
                  <div key={customer.id} className="border border-slate-100 rounded-xl p-4">
                    <p className="font-semibold text-slate-900">{customer.full_name || 'Chưa cập nhật tên'}</p>
                    <p className="text-sm text-slate-500">SĐT: {customer.phone || '---'}</p>
                    <p className="text-sm text-slate-500">Địa chỉ: {customer.address || '---'}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Số đơn: <span className="font-medium">{stats.orderCount}</span> - Tổng mua: <span className="font-medium">{formatPrice(stats.totalSpent)}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'support' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Xử lý yêu cầu hỗ trợ</h2>
              {!supportFeatureEnabled && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  Chưa có bảng `support_requests` trong database. Hãy chạy migration mới để bật tính năng này.
                </div>
              )}
              {supportFeatureEnabled && visibleSupportRequests.map(item => (
                <div key={item.id} className="border border-slate-100 rounded-xl p-4">
                  <p className="font-semibold text-slate-900">{item.subject}</p>
                  <p className="text-sm text-slate-600 mt-1">{item.message}</p>
                  <p className="text-xs text-slate-500 mt-2">{item.full_name} - {item.email} - {formatDate(item.created_at)}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <select
                      value={supportStatusDrafts[item.id] || item.status}
                      onChange={event => setSupportStatusDrafts(prev => ({ ...prev, [item.id]: event.target.value as SupportRequest['status'] }))}
                      className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="open">Mới</option>
                      <option value="in_progress">Đang xử lý</option>
                      <option value="resolved">Đã xử lý</option>
                    </select>
                    <button
                      onClick={() => handleSupportStatusUpdate(item.id)}
                      disabled={submitting}
                      className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      Lưu trạng thái
                    </button>
                  </div>
                </div>
              ))}
              {supportFeatureEnabled && supportRequests.length === 0 && (
                <p className="text-sm text-slate-500">Chưa có yêu cầu hỗ trợ nào.</p>
              )}
            </div>
          )}

          {activeTab === 'promotions' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Quản lý khuyến mãi</h2>
              {!promotionFeatureEnabled && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  Chưa có bảng `promotions` trong database hoặc API chưa mở bảng này.
                </div>
              )}
              {promotionFeatureEnabled && promotions.length === 0 && (
                <p className="text-sm text-slate-500">Chưa có chương trình khuyến mãi nào.</p>
              )}
              {promotionFeatureEnabled && visiblePromotions.map(item => {
                const isActive = item.is_active === true || item.status === 'active';
                return (
                  <div key={item.id} className="border border-slate-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name || item.code || `KM-${item.id.slice(0, 6)}`}</p>
                      <p className="text-sm text-slate-500">
                        Mã: {item.code || '---'} • Giảm: {item.discount_percent ?? 0}%
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.starts_at ? formatDate(item.starts_at) : '--'} - {item.ends_at ? formatDate(item.ends_at) : '--'}
                      </p>
                    </div>
                    <button
                      onClick={() => handlePromotionToggle(item.id)}
                      disabled={submitting}
                      className={`px-3 py-2 rounded-lg text-sm font-medium text-white ${
                        isActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                      } disabled:opacity-50`}
                    >
                      {isActive ? 'Tắt khuyến mãi' : 'Kích hoạt'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Quản lý đánh giá</h2>
              {!reviewFeatureEnabled && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  Chưa có bảng `reviews` trong database hoặc API chưa mở bảng này.
                </div>
              )}
              {reviewFeatureEnabled && reviews.length === 0 && (
                <p className="text-sm text-slate-500">Chưa có đánh giá nào.</p>
              )}
              {reviewFeatureEnabled && visibleReviews.map(item => (
                <div key={item.id} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="font-semibold text-slate-900">Sản phẩm: {item.product_id ? `#${item.product_id.slice(0, 8)}` : '---'}</p>
                    <span className="text-sm text-amber-600">⭐ {item.rating ?? 0}/5</span>
                  </div>
                  <p className="text-sm text-slate-600">{item.comment || 'Không có nội dung.'}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    User: {item.user_id ? `#${item.user_id.slice(0, 8)}` : '---'} • {item.created_at ? formatDate(item.created_at) : '--'}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <select
                      value={reviewStatusDrafts[item.id] || item.status || (item.is_hidden ? 'hidden' : 'approved')}
                      onChange={event => setReviewStatusDrafts(prev => ({ ...prev, [item.id]: event.target.value }))}
                      className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="pending">Chờ duyệt</option>
                      <option value="approved">Hiển thị</option>
                      <option value="hidden">Ẩn đánh giá</option>
                    </select>
                    <button
                      onClick={() => handleReviewStatusUpdate(item.id)}
                      disabled={submitting}
                      className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      Lưu trạng thái
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 text-xs text-slate-500 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Dashboard được thiết kế lại theo phong cách TailAdmin và mục tiêu quản trị trong `readme.md`.
          </div>
        </main>
      </div>
    </div>
  );
}
