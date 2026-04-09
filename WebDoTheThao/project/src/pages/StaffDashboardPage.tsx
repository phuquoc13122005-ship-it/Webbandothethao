import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BadgeDollarSign,
  Boxes,
  ChevronDown,
  CheckCircle2,
  Headset,
  Home,
  ImagePlus,
  LayoutDashboard,
  Package,
  Pencil,
  Save,
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
import type { Banner, Category, CategoryProductGroup, HomeCategorySection, Order, Product, Profile, SupportRequest } from '../types';
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
  | 'banners'
  | 'categories'
  | 'customers'
  | 'employees'
  | 'support'
  | 'promotions'
  | 'reviews';

interface OrderWithCustomer extends Order {
  customer?: AccountProfile;
}

interface PromotionItem {
  id: string;
  code?: string;
  name?: string;
  discount_percent?: number;
  min_order?: number;
  max_uses_per_user?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: string;
  is_active?: boolean;
  created_at?: string;
}

interface PromotionAssignmentItem {
  id: string;
  promotion_id: string;
  user_id: string;
  assignment_type: string;
  criteria_json?: string | null;
  is_used?: boolean | number;
  assigned_at?: string | null;
  created_at?: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  role?: string | null;
}

interface ReviewItem {
  id: string;
  user_id?: string;
  product_id?: string;
  rating?: number;
  full_name?: string;
  phone?: string;
  comment?: string;
  image_url?: string;
  status?: string;
  is_hidden?: boolean;
  created_at?: string;
}

interface BranchItem {
  id: string;
  name: string;
  slug?: string;
  is_active?: boolean | number;
  created_at?: string;
}

interface HomeCategorySectionItem extends HomeCategorySection {
  categoryIds: string[];
}

interface UserAccountRow {
  id: string;
  email?: string | null;
  provider?: string | null;
  created_at?: string;
}

interface AccountProfile extends Profile {
  email?: string | null;
  provider?: string | null;
}

function buildAccountProfiles(profilesData: Profile[], usersData: UserAccountRow[]) {
  const profileMap = new Map<string, Profile>(profilesData.map(item => [item.id, item]));
  const mergedFromUsers = usersData.map((userItem) => {
    const matchedProfile = profileMap.get(userItem.id);
    return {
      id: userItem.id,
      full_name: matchedProfile?.full_name || '',
      phone: matchedProfile?.phone || '',
      address: matchedProfile?.address || '',
      avatar_url: matchedProfile?.avatar_url || '',
      role: matchedProfile?.role || 'customer',
      created_at: matchedProfile?.created_at || userItem.created_at || '',
      updated_at: matchedProfile?.updated_at || matchedProfile?.created_at || userItem.created_at || '',
      email: userItem.email || '',
      provider: userItem.provider || null,
    } as AccountProfile;
  });
  const userIdSet = new Set(mergedFromUsers.map(item => item.id));
  const onlyProfiles = profilesData
    .filter(profileItem => !userIdSet.has(profileItem.id))
    .map(profileItem => ({
      ...profileItem,
      email: '',
      provider: null,
    } as AccountProfile));
  return [...mergedFromUsers, ...onlyProfiles]
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
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
  branch_name: string;
  target_audience: string;
  highlight_tags: string;
  shoe_form: string;
  play_style: string;
  segment: string;
  price: string;
  original_price: string;
  discount_percent: string;
  stock: string;
  featured: boolean;
}

type CategorySizeType = 'none' | 'apparel' | 'shoes';
type BannerTargetType = 'none' | 'product' | 'category';
type EditProductForm = NewProductForm;
const CATEGORY_PRODUCT_GROUP_OPTIONS: Array<{ value: CategoryProductGroup; label: string }> = [
  { value: 'badminton', label: 'Sản phẩm cầu lông' },
  { value: 'tennis', label: 'Sản phẩm tennis' },
  { value: 'pickleball', label: 'Sản phẩm pickleball' },
  { value: 'other', label: 'Nhóm khác' },
];

const ORDER_STATUSES: Order['status'][] = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
const MAX_RENDER_ITEMS = 60;
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 300 * 1024;
const NEW_PRODUCT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL'];
const SHOES_SIZES = ['36', '37', '38', '39', '40', '41', '42'];
const TARGET_AUDIENCE_OPTIONS = ['Nam', 'Nữ', 'Cả Nam lẫn Nữ', 'Trẻ Em'];
const HIGHLIGHT_TAG_OPTIONS = ['Toàn Diện', 'Siêu Nhẹ', 'Ổn Định', 'Êm Ái'];
const SHOE_FORM_OPTIONS = ['Slim - Bàn Chân Thon', 'Unisex - Bàn Chân Thường', 'Wide - Bàn Chân Bè'];
const PLAY_STYLE_OPTIONS = ['Ngoài Trời - Sân Bê Tông', 'Trong Nhà - Sân Thảm', 'Trong Nhà & Ngoài Trời'];
const SEGMENT_OPTIONS = ['Tầm Thấp', 'Trung Cấp', 'Cao Cấp'];
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
const ACCOUNT_TABS: StaffTab[] = ['customers', 'employees'];
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
  'banners',
  'categories',
  'customers',
  'employees',
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

function isCheckedInCsv(value: string, option: string) {
  return normalizeCommaValues(value).includes(option);
}

function toggleCsvValue(value: string, option: string, checked: boolean) {
  const current = normalizeCommaValues(value);
  const next = checked
    ? Array.from(new Set([...current, option]))
    : current.filter(item => item !== option);
  return next.join(', ');
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
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [homeCategorySections, setHomeCategorySections] = useState<HomeCategorySectionItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [customers, setCustomers] = useState<AccountProfile[]>([]);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccountFullName, setEditAccountFullName] = useState('');
  const [editAccountPhone, setEditAccountPhone] = useState('');
  const [editAccountAddress, setEditAccountAddress] = useState('');
  const [editAccountRole, setEditAccountRole] = useState<'customer' | 'staff'>('customer');
  const [newAccountFullName, setNewAccountFullName] = useState('');
  const [newAccountPhone, setNewAccountPhone] = useState('');
  const [newAccountAddress, setNewAccountAddress] = useState('');
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountRole, setNewAccountRole] = useState<'customer' | 'staff'>('customer');
  const [createAccountMessage, setCreateAccountMessage] = useState('');
  const [createAccountError, setCreateAccountError] = useState('');
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [supportFeatureEnabled, setSupportFeatureEnabled] = useState(true);
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [promotionAssignments, setPromotionAssignments] = useState<PromotionAssignmentItem[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState('');
  const [newPromotionCode, setNewPromotionCode] = useState('');
  const [newPromotionName, setNewPromotionName] = useState('');
  const [newPromotionDiscountPercent, setNewPromotionDiscountPercent] = useState('');
  const [newPromotionMinOrder, setNewPromotionMinOrder] = useState('');
  const [newPromotionMaxUses, setNewPromotionMaxUses] = useState('');
  const [newPromotionStartsAt, setNewPromotionStartsAt] = useState('');
  const [newPromotionEndsAt, setNewPromotionEndsAt] = useState('');
  const [newPromotionIsActive, setNewPromotionIsActive] = useState(true);
  const [assignMode, setAssignMode] = useState<'all_buyers' | 'min_order' | 'specific_user'>('all_buyers');
  const [assignMinOrderAmount, setAssignMinOrderAmount] = useState('');
  const [assignTargetUserId, setAssignTargetUserId] = useState('');
  const [promotionMessage, setPromotionMessage] = useState('');
  const [promotionError, setPromotionError] = useState('');
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [promotionFeatureEnabled, setPromotionFeatureEnabled] = useState(true);
  const [reviewFeatureEnabled, setReviewFeatureEnabled] = useState(true);
  const [bannerFeatureEnabled, setBannerFeatureEnabled] = useState(true);

  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<string, Order['status']>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [inventorySizeDrafts, setInventorySizeDrafts] = useState<Record<string, string>>({});
  const [supportStatusDrafts, setSupportStatusDrafts] = useState<Record<string, SupportRequest['status']>>({});
  const [reviewStatusDrafts, setReviewStatusDrafts] = useState<Record<string, string>>({});

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryProductGroup, setNewCategoryProductGroup] = useState<CategoryProductGroup>('badminton');
  const [newCategorySizeType, setNewCategorySizeType] = useState<CategorySizeType>('none');
  const [newCategoryImageUrl, setNewCategoryImageUrl] = useState('');
  const [newCategoryImageName, setNewCategoryImageName] = useState('');
  const [newHomeSectionTitle, setNewHomeSectionTitle] = useState('');
  const [newHomeSectionGroup, setNewHomeSectionGroup] = useState<CategoryProductGroup>('badminton');
  const [newHomeSectionCategoryIds, setNewHomeSectionCategoryIds] = useState<string[]>([]);
  const [editingHomeSectionId, setEditingHomeSectionId] = useState<string | null>(null);
  const [editHomeSectionTitle, setEditHomeSectionTitle] = useState('');
  const [editHomeSectionGroup, setEditHomeSectionGroup] = useState<CategoryProductGroup>('badminton');
  const [editHomeSectionCategoryIds, setEditHomeSectionCategoryIds] = useState<string[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategorySlug, setEditCategorySlug] = useState('');
  const [editCategoryDescription, setEditCategoryDescription] = useState('');
  const [editCategoryProductGroup, setEditCategoryProductGroup] = useState<CategoryProductGroup>('badminton');
  const [editCategorySizeType, setEditCategorySizeType] = useState<CategorySizeType>('none');
  const [editCategoryImageUrl, setEditCategoryImageUrl] = useState('');
  const [editCategoryImageName, setEditCategoryImageName] = useState('');
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerImageUrl, setNewBannerImageUrl] = useState('');
  const [newBannerImageName, setNewBannerImageName] = useState('');
  const [newBannerIsActive, setNewBannerIsActive] = useState(true);
  const [newBannerTargetType, setNewBannerTargetType] = useState<BannerTargetType>('none');
  const [newBannerTargetProductId, setNewBannerTargetProductId] = useState('');
  const [newBannerTargetCategoryId, setNewBannerTargetCategoryId] = useState('');
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [editBannerTitle, setEditBannerTitle] = useState('');
  const [editBannerImageUrl, setEditBannerImageUrl] = useState('');
  const [editBannerImageName, setEditBannerImageName] = useState('');
  const [editBannerSortOrder, setEditBannerSortOrder] = useState('0');
  const [editBannerIsActive, setEditBannerIsActive] = useState(true);
  const [editBannerTargetType, setEditBannerTargetType] = useState<BannerTargetType>('none');
  const [editBannerTargetProductId, setEditBannerTargetProductId] = useState('');
  const [editBannerTargetCategoryId, setEditBannerTargetCategoryId] = useState('');
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
    branch_name: '',
    target_audience: '',
    highlight_tags: '',
    shoe_form: '',
    play_style: '',
    segment: '',
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
    branch_name: '',
    target_audience: '',
    highlight_tags: '',
    shoe_form: '',
    play_style: '',
    segment: '',
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
  const nextBannerSortOrder = useMemo(() => {
    const maxSortOrder = banners.reduce((maxValue, banner) => {
      const parsed = Math.floor(Number(banner.sort_order || 0));
      if (!Number.isFinite(parsed) || parsed < 0) return maxValue;
      return Math.max(maxValue, parsed);
    }, 0);
    return maxSortOrder + 1;
  }, [banners]);
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
    if (PRODUCT_TABS.includes(activeTab)) {
      setIsProductMenuOpen(true);
    }
    if (ACCOUNT_TABS.includes(activeTab)) {
      setIsAccountMenuOpen(true);
    }
  }, [activeTab]);

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

      const [ordersRes, productsRes, categoriesRes, sectionsRes, branchesRes, bannersRes, customersRes, usersRes, supportRes, promotionsRes, reviewsRes] = await Promise.all([
        db.from('orders').select('*, order_items(*, products(*))').order('created_at', { ascending: false }),
        db.from('products').select('*, categories(*)').order('created_at', { ascending: false }),
        db.from('categories').select('*').order('created_at', { ascending: false }),
        db.from('home_category_sections').select('*').order('sort_order', { ascending: true }),
        db.from('branches').select('*').order('name', { ascending: true }),
        db.from('banners').select('*').order('sort_order', { ascending: true }),
        db.from('profiles').select('*').order('created_at', { ascending: false }),
        db.from('users').select('id, email, provider, created_at').order('created_at', { ascending: false }),
        db.from('support_requests').select('*').order('created_at', { ascending: false }),
        db.from('promotions').select('*').order('created_at', { ascending: false }),
        db.from('reviews').select('*').order('created_at', { ascending: false }),
      ]);

      if (ordersRes.error || productsRes.error || categoriesRes.error || customersRes.error || usersRes.error) {
        setError('Không thể tải dữ liệu dashboard nhân viên.');
        setLoading(false);
        return;
      }

      const mergedAccounts = buildAccountProfiles(
        ((customersRes.data || []) as Profile[]),
        ((usersRes.data || []) as UserAccountRow[]),
      );
      const accountMap = new Map<string, AccountProfile>(
        mergedAccounts.map((item) => [item.id, item]),
      );

      const nextOrders = (ordersRes.data || []).map((order: any) => ({
        ...order,
        customer: accountMap.get(order.user_id),
      })) as OrderWithCustomer[];

      setOrders(nextOrders);
      setProducts((productsRes.data || []) as Product[]);
      setCategories((categoriesRes.data || []) as Category[]);
      if (!sectionsRes.error) {
        const nextSections = ((sectionsRes.data || []) as HomeCategorySection[])
          .filter(item => item && String(item.title || '').trim())
          .map(item => ({
            ...item,
            categoryIds: parseCategoryIdsJson(item.categories_json),
          }));
        setHomeCategorySections(nextSections);
      }
      if (branchesRes.error) {
        setBranches([]);
      } else {
        const nextBranches = ((branchesRes.data || []) as BranchItem[])
          .filter(item => item && String(item.name || '').trim())
          .filter(item => item.is_active == null || Boolean(Number(item.is_active)));
        setBranches(nextBranches);
      }
      if (bannersRes.error) {
        setBannerFeatureEnabled(false);
      } else {
        setBannerFeatureEnabled(true);
        setBanners((bannersRes.data || []) as Banner[]);
      }
      setCustomers(mergedAccounts);

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

  useEffect(() => {
    if (authLoading || !user || !isStaff) return;
    if (!ACCOUNT_TABS.includes(activeTab)) return;

    let active = true;
    const refreshAccounts = async () => {
      const [profilesRes, usersRes] = await Promise.all([
        db.from('profiles').select('*').order('created_at', { ascending: false }),
        db.from('users').select('id, email, provider, created_at').order('created_at', { ascending: false }),
      ]);
      if (!active || profilesRes.error || usersRes.error) return;
      const mergedAccounts = buildAccountProfiles(
        ((profilesRes.data || []) as Profile[]),
        ((usersRes.data || []) as UserAccountRow[]),
      );
      setCustomers(mergedAccounts);
    };

    refreshAccounts();
    const timer = window.setInterval(refreshAccounts, 12000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [authLoading, user, isStaff, activeTab]);

  const customerStats = useMemo(() => {
    if (!shouldComputeOverview && activeTab !== 'customers' && activeTab !== 'employees') {
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
  const bannerProductOptions = useMemo(
    () => [...products].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi')),
    [products],
  );
  const bannerCategoryOptions = useMemo(
    () => [...categories].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi')),
    [categories],
  );
  const categoriesForNewSectionGroup = useMemo(
    () => categories.filter(item => (item.product_group || 'badminton') === newHomeSectionGroup),
    [categories, newHomeSectionGroup],
  );
  const categoriesForEditSectionGroup = useMemo(
    () => categories.filter(item => (item.product_group || 'badminton') === editHomeSectionGroup),
    [categories, editHomeSectionGroup],
  );
  useEffect(() => {
    const allowedIds = new Set(categoriesForNewSectionGroup.map(item => item.id));
    setNewHomeSectionCategoryIds(prev => prev.filter(id => allowedIds.has(id)));
  }, [categoriesForNewSectionGroup]);
  useEffect(() => {
    const allowedIds = new Set(categoriesForEditSectionGroup.map(item => item.id));
    setEditHomeSectionCategoryIds(prev => prev.filter(id => allowedIds.has(id)));
  }, [categoriesForEditSectionGroup]);
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
  const visibleCustomerAccounts = useMemo(
    () => visibleCustomers.filter(item => (item.role || 'customer') === 'customer'),
    [visibleCustomers],
  );
  const visibleEmployeeAccounts = useMemo(
    () => visibleCustomers.filter(item => (item.role || 'customer') === 'staff'),
    [visibleCustomers],
  );
  const visibleSupportRequests = useMemo(() => supportRequests.slice(0, MAX_RENDER_ITEMS), [supportRequests]);
  const visiblePromotions = useMemo(() => promotions.slice(0, MAX_RENDER_ITEMS), [promotions]);
  const visibleReviews = useMemo(() => reviews.slice(0, MAX_RENDER_ITEMS), [reviews]);
  const selectedPromotion = useMemo(
    () => promotions.find(item => item.id === selectedPromotionId) || null,
    [promotions, selectedPromotionId],
  );

  useEffect(() => {
    if (promotions.length === 0) {
      setSelectedPromotionId('');
      setPromotionAssignments([]);
      return;
    }
    if (!selectedPromotionId || !promotions.some(item => item.id === selectedPromotionId)) {
      setSelectedPromotionId(promotions[0].id);
    }
  }, [promotions, selectedPromotionId]);

  useEffect(() => {
    if (!selectedPromotionId || activeTab !== 'promotions') return;
    let active = true;
    const loadAssignments = async () => {
      const { data, error: assignmentError } = await db.getPromotionAssignments(selectedPromotionId);
      if (!active || assignmentError) return;
      setPromotionAssignments((data || []) as PromotionAssignmentItem[]);
    };
    loadAssignments();
    return () => {
      active = false;
    };
  }, [selectedPromotionId, activeTab]);

  const startEditAccount = (account: AccountProfile) => {
    setEditingAccountId(account.id);
    setEditAccountFullName(account.full_name || '');
    setEditAccountPhone(account.phone || '');
    setEditAccountAddress(account.address || '');
    setEditAccountRole((account.role === 'staff' ? 'staff' : 'customer'));
  };

  const cancelEditAccount = () => {
    setEditingAccountId(null);
    setEditAccountFullName('');
    setEditAccountPhone('');
    setEditAccountAddress('');
    setEditAccountRole('customer');
  };

  const handleUpdateAccount = async (accountId: string) => {
    if (!isAdmin) {
      window.alert('Chỉ admin mới có quyền chỉnh sửa tài khoản.');
      return;
    }
    const payload = {
      full_name: editAccountFullName.trim(),
      phone: editAccountPhone.trim(),
      address: editAccountAddress.trim(),
      role: editAccountRole,
    };
    setSubmitting(true);
    const { error: updateError } = await db.from('profiles').update(payload).eq('id', accountId);
    setSubmitting(false);
    if (updateError) {
      window.alert(updateError.message || 'Không thể cập nhật tài khoản.');
      return;
    }
    setCustomers(prev => prev.map(item => (item.id === accountId ? { ...item, ...payload } as AccountProfile : item)));
    cancelEditAccount();
  };

  const handleCreateAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin) {
      window.alert('Chỉ admin mới có quyền tạo tài khoản.');
      return;
    }
    setCreateAccountMessage('');
    setCreateAccountError('');
    const email = newAccountEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setCreateAccountError('Email không hợp lệ.');
      return;
    }
    setSubmitting(true);
    const { data, error: createError } = await db.auth.adminCreateAccount({
      fullName: newAccountFullName.trim(),
      phone: newAccountPhone.trim(),
      address: newAccountAddress.trim(),
      email,
      role: newAccountRole,
    });
    setSubmitting(false);
    if (createError || !data?.account) {
      const errorCode = String(createError?.message || '');
      if (errorCode === 'EMAIL_EXISTS') {
        setCreateAccountError('Email đã tồn tại trong hệ thống.');
      } else if (errorCode === 'FORBIDDEN') {
        setCreateAccountError('Bạn không có quyền tạo tài khoản.');
      } else {
        setCreateAccountError(createError?.message || 'Không thể tạo tài khoản.');
      }
      return;
    }

    const createdAccount = data.account as AccountProfile;
    const temporaryPassword = String(data.temporary_password || '');
    setCustomers(prev => [createdAccount, ...prev.filter(item => item.id !== createdAccount.id)]);
    setNewAccountFullName('');
    setNewAccountPhone('');
    setNewAccountAddress('');
    setNewAccountEmail('');
    setNewAccountRole('customer');
    setCreateAccountMessage(
      temporaryPassword
        ? `Tạo tài khoản thành công. Mật khẩu tạm thời: ${temporaryPassword}`
        : 'Tạo tài khoản thành công.',
    );
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!isAdmin) {
      window.alert('Chỉ admin mới có quyền xóa tài khoản.');
      return;
    }
    if (user?.id === accountId) {
      window.alert('Không thể tự xóa tài khoản đang đăng nhập.');
      return;
    }
    if (!window.confirm('Bạn có chắc muốn xóa tài khoản này?')) return;
    setSubmitting(true);
    const { error: deleteProfileError } = await db.from('profiles').delete().eq('id', accountId);
    if (deleteProfileError) {
      setSubmitting(false);
      window.alert(deleteProfileError.message || 'Không thể xóa profile.');
      return;
    }
    const { error: deleteUserError } = await db.from('users').delete().eq('id', accountId);
    setSubmitting(false);
    if (deleteUserError) {
      window.alert(deleteUserError.message || 'Đã xóa profile nhưng chưa xóa được user.');
      return;
    }
    setCustomers(prev => prev.filter(item => item.id !== accountId));
    if (editingAccountId === accountId) cancelEditAccount();
  };

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
        product_group: newCategoryProductGroup,
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
    setNewCategoryProductGroup('badminton');
    setNewCategorySizeType('none');
    setNewCategoryImageUrl('');
    setNewCategoryImageName('');
  };

  const startEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
    setEditCategorySlug(cat.slug);
    setEditCategoryDescription(cat.description || '');
    setEditCategoryProductGroup((cat.product_group || 'badminton') as CategoryProductGroup);
    setEditCategorySizeType((cat.size_type || 'none') as CategorySizeType);
    setEditCategoryImageUrl(cat.image_url || '');
    setEditCategoryImageName(cat.image_url ? 'Ảnh hiện tại' : '');
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditCategoryName('');
    setEditCategorySlug('');
    setEditCategoryDescription('');
    setEditCategoryProductGroup('badminton');
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
        product_group: editCategoryProductGroup,
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
              product_group: editCategoryProductGroup,
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

  const handleToggleNewHomeSectionCategory = (categoryId: string) => {
    setNewHomeSectionCategoryIds(prev => (
      prev.includes(categoryId)
        ? prev.filter(item => item !== categoryId)
        : [...prev, categoryId]
    ));
  };

  const handleCreateHomeCategorySection = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = newHomeSectionTitle.trim();
    if (!title) {
      window.alert('Vui lòng nhập tiêu đề section.');
      return;
    }
    if (newHomeSectionCategoryIds.length === 0) {
      window.alert('Vui lòng chọn ít nhất 1 danh mục.');
      return;
    }
    const nextSortOrder = homeCategorySections.reduce((maxValue, item) => {
      const parsed = Math.floor(Number(item.sort_order || 0));
      return Number.isFinite(parsed) ? Math.max(maxValue, parsed) : maxValue;
    }, 0) + 1;

    setSubmitting(true);
    const { data, error: createError } = await db
      .from('home_category_sections')
      .insert({
        title,
        product_group: newHomeSectionGroup,
        categories_json: JSON.stringify(newHomeSectionCategoryIds),
        is_active: true,
        sort_order: nextSortOrder,
      })
      .select('*')
      .maybeSingle();
    setSubmitting(false);
    if (createError || !data) {
      window.alert(createError?.message || 'Không thể tạo section trang chủ.');
      return;
    }

    const created = data as HomeCategorySection;
    setHomeCategorySections(prev => [
      ...prev,
      { ...created, categoryIds: parseCategoryIdsJson(created.categories_json) },
    ].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)));
    setNewHomeSectionTitle('');
    setNewHomeSectionCategoryIds([]);
  };

  const handleDeleteHomeCategorySection = async (sectionId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa section này khỏi trang chủ?')) return;
    setSubmitting(true);
    const { error: deleteError } = await db.from('home_category_sections').delete().eq('id', sectionId);
    setSubmitting(false);
    if (deleteError) {
      window.alert(deleteError.message || 'Không thể xóa section.');
      return;
    }
    setHomeCategorySections(prev => prev.filter(item => item.id !== sectionId));
    if (editingHomeSectionId === sectionId) {
      setEditingHomeSectionId(null);
      setEditHomeSectionTitle('');
      setEditHomeSectionGroup('badminton');
      setEditHomeSectionCategoryIds([]);
    }
  };

  const startEditHomeCategorySection = (section: HomeCategorySectionItem) => {
    setEditingHomeSectionId(section.id);
    setEditHomeSectionTitle(section.title || '');
    setEditHomeSectionGroup((section.product_group || 'badminton') as CategoryProductGroup);
    setEditHomeSectionCategoryIds(section.categoryIds || []);
  };

  const cancelEditHomeCategorySection = () => {
    setEditingHomeSectionId(null);
    setEditHomeSectionTitle('');
    setEditHomeSectionGroup('badminton');
    setEditHomeSectionCategoryIds([]);
  };

  const handleToggleEditHomeSectionCategory = (categoryId: string) => {
    setEditHomeSectionCategoryIds(prev => (
      prev.includes(categoryId)
        ? prev.filter(item => item !== categoryId)
        : [...prev, categoryId]
    ));
  };

  const handleUpdateHomeCategorySection = async (sectionId: string) => {
    const title = editHomeSectionTitle.trim();
    if (!title) {
      window.alert('Vui lòng nhập tiêu đề section.');
      return;
    }
    if (editHomeSectionCategoryIds.length === 0) {
      window.alert('Vui lòng chọn ít nhất 1 danh mục.');
      return;
    }

    setSubmitting(true);
    const { data, error: updateError } = await db
      .from('home_category_sections')
      .update({
        title,
        product_group: editHomeSectionGroup,
        categories_json: JSON.stringify(editHomeSectionCategoryIds),
      })
      .eq('id', sectionId)
      .select('*')
      .maybeSingle();
    setSubmitting(false);

    if (updateError || !data) {
      window.alert(updateError?.message || 'Không thể cập nhật section.');
      return;
    }

    const updated = data as HomeCategorySection;
    setHomeCategorySections(prev => prev.map(item => (
      item.id === sectionId
        ? { ...updated, categoryIds: parseCategoryIdsJson(updated.categories_json) }
        : item
    )));
    cancelEditHomeCategorySection();
  };

  const handleBannerImageChange = async (event: React.ChangeEvent<HTMLInputElement>, target: 'new' | 'edit') => {
    const file = event.target.files?.[0];
    const setUrl = target === 'new' ? setNewBannerImageUrl : setEditBannerImageUrl;
    const setName = target === 'new' ? setNewBannerImageName : setEditBannerImageName;
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
      window.alert('Không thể xử lý hoặc upload ảnh banner. Vui lòng thử lại.');
      setUrl('');
      setName('');
    }
  };

  const resolveBannerTargetPayload = (
    targetType: BannerTargetType,
    targetProductId: string,
    targetCategoryId: string,
    fallbackImageUrl: string,
  ) => {
    if (targetType === 'product') {
      const matchedProduct = products.find(item => item.id === targetProductId);
      if (!matchedProduct) return null;
      const imageUrl = String(matchedProduct.image_url || '').trim();
      if (!imageUrl) return null;
      return {
        imageUrl,
        target_product_id: matchedProduct.id,
        target_product_slug: matchedProduct.slug || null,
        target_category_id: matchedProduct.category_id || null,
        target_category_slug: categories.find(item => item.id === matchedProduct.category_id)?.slug || null,
      };
    }
    if (targetType === 'category') {
      const matchedCategory = categories.find(item => item.id === targetCategoryId);
      if (!matchedCategory) return null;
      const imageUrl = String(matchedCategory.image_url || '').trim();
      if (!imageUrl) return null;
      return {
        imageUrl,
        target_product_id: null,
        target_product_slug: null,
        target_category_id: matchedCategory.id,
        target_category_slug: matchedCategory.slug || null,
      };
    }
    if (!fallbackImageUrl) return null;
    return {
      imageUrl: fallbackImageUrl,
      target_product_id: null,
      target_product_slug: null,
      target_category_id: null,
      target_category_slug: null,
    };
  };

  const handleCreateBanner = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = newBannerTitle.trim();
    const targetPayload = resolveBannerTargetPayload(
      newBannerTargetType,
      newBannerTargetProductId,
      newBannerTargetCategoryId,
      newBannerImageUrl.trim(),
    );
    if (!targetPayload) {
      window.alert('Vui lòng chọn đúng nguồn banner (sản phẩm/danh mục) hoặc upload ảnh thủ công.');
      return;
    }
    setSubmitting(true);
    const { data, error: createError } = await db
      .from('banners')
      .insert({
        title: title || null,
        image_url: targetPayload.imageUrl,
        target_type: newBannerTargetType,
        target_product_id: targetPayload.target_product_id,
        target_product_slug: targetPayload.target_product_slug,
        target_category_id: targetPayload.target_category_id,
        target_category_slug: targetPayload.target_category_slug,
        sort_order: nextBannerSortOrder,
        is_active: newBannerIsActive,
      })
      .select('*')
      .maybeSingle();
    setSubmitting(false);
    if (createError || !data) {
      window.alert(createError?.message || 'Không thể tạo banner.');
      return;
    }
    setBanners(prev => [...prev, data as Banner].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)));
    setNewBannerTitle('');
    setNewBannerImageUrl('');
    setNewBannerImageName('');
    setNewBannerIsActive(true);
    setNewBannerTargetType('none');
    setNewBannerTargetProductId('');
    setNewBannerTargetCategoryId('');
  };

  const startEditBanner = (banner: Banner) => {
    setEditingBannerId(banner.id);
    setEditBannerTitle(banner.title || '');
    setEditBannerImageUrl(banner.image_url || '');
    setEditBannerImageName(banner.image_url ? 'Ảnh hiện tại' : '');
    setEditBannerSortOrder(String(Number(banner.sort_order || 0)));
    setEditBannerIsActive(Boolean(Number(banner.is_active ?? 1)));
    const nextTargetType = (banner.target_type || 'none') as BannerTargetType;
    setEditBannerTargetType(nextTargetType);
    setEditBannerTargetProductId(String(banner.target_product_id || ''));
    setEditBannerTargetCategoryId(String(banner.target_category_id || ''));
  };

  const cancelEditBanner = () => {
    setEditingBannerId(null);
    setEditBannerTitle('');
    setEditBannerImageUrl('');
    setEditBannerImageName('');
    setEditBannerSortOrder('0');
    setEditBannerIsActive(true);
    setEditBannerTargetType('none');
    setEditBannerTargetProductId('');
    setEditBannerTargetCategoryId('');
  };

  const handleUpdateBanner = async (bannerId: string) => {
    const targetPayload = resolveBannerTargetPayload(
      editBannerTargetType,
      editBannerTargetProductId,
      editBannerTargetCategoryId,
      editBannerImageUrl.trim(),
    );
    const sortOrder = Number(editBannerSortOrder || 0);
    if (!targetPayload) {
      window.alert('Banner phải có ảnh hoặc nguồn hợp lệ.');
      return;
    }
    if (!Number.isFinite(sortOrder)) {
      window.alert('Thứ tự hiển thị không hợp lệ.');
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await db
      .from('banners')
      .update({
        title: editBannerTitle.trim() || null,
        image_url: targetPayload.imageUrl,
        target_type: editBannerTargetType,
        target_product_id: targetPayload.target_product_id,
        target_product_slug: targetPayload.target_product_slug,
        target_category_id: targetPayload.target_category_id,
        target_category_slug: targetPayload.target_category_slug,
        sort_order: Math.floor(sortOrder),
        is_active: editBannerIsActive,
      })
      .eq('id', bannerId);
    setSubmitting(false);
    if (updateError) {
      window.alert(updateError.message || 'Không thể cập nhật banner.');
      return;
    }
    setBanners(prev =>
      prev
        .map(item =>
          item.id === bannerId
            ? {
                ...item,
                title: editBannerTitle.trim(),
                image_url: targetPayload.imageUrl,
                target_type: editBannerTargetType,
                target_product_id: targetPayload.target_product_id,
                target_product_slug: targetPayload.target_product_slug,
                target_category_id: targetPayload.target_category_id,
                target_category_slug: targetPayload.target_category_slug,
                sort_order: Math.floor(sortOrder),
                is_active: editBannerIsActive,
              }
            : item,
        )
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    );
    cancelEditBanner();
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa banner này?')) return;
    setSubmitting(true);
    const { error: deleteError } = await db.from('banners').delete().eq('id', bannerId);
    setSubmitting(false);
    if (deleteError) {
      window.alert(deleteError.message || 'Không thể xóa banner.');
      return;
    }
    setBanners(prev => prev.filter(item => item.id !== bannerId));
    if (editingBannerId === bannerId) cancelEditBanner();
  };

  const handleDeleteAllBanners = async () => {
    if (banners.length === 0) return;
    if (!window.confirm('Xóa toàn bộ banner hiện có?')) return;
    const allIds = banners.map(item => item.id).filter(Boolean);
    if (allIds.length === 0) return;
    setSubmitting(true);
    const { error: deleteError } = await db.from('banners').delete().in('id', allIds);
    setSubmitting(false);
    if (deleteError) {
      window.alert(deleteError.message || 'Không thể xóa toàn bộ banner.');
      return;
    }
    setBanners([]);
    cancelEditBanner();
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
    const branchName = newProduct.branch_name.trim();
    const targetAudience = normalizeCommaValues(newProduct.target_audience).join(', ');
    const highlightTags = normalizeCommaValues(newProduct.highlight_tags).join(', ');
    const categorySizeType = (newProduct.size_type || 'none') as CategorySizeType;
    const shoeForm = categorySizeType === 'shoes' ? normalizeCommaValues(newProduct.shoe_form).join(', ') : '';
    const playStyle = categorySizeType === 'shoes' ? normalizeCommaValues(newProduct.play_style).join(', ') : '';
    const segment = categorySizeType === 'shoes' ? normalizeCommaValues(newProduct.segment).join(', ') : '';
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
        branch_name: branchName || null,
        target_audience: targetAudience || null,
        highlight_tags: highlightTags || null,
        shoe_form: shoeForm || null,
        play_style: playStyle || null,
        segment: segment || null,
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
      branch_name: '',
      target_audience: '',
      highlight_tags: '',
      shoe_form: '',
      play_style: '',
      segment: '',
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
      branch_name: product.branch_name || '',
      target_audience: product.target_audience || '',
      highlight_tags: product.highlight_tags || '',
      shoe_form: product.shoe_form || '',
      play_style: product.play_style || '',
      segment: product.segment || '',
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
      branch_name: '',
      target_audience: '',
      highlight_tags: '',
      shoe_form: '',
      play_style: '',
      segment: '',
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
    const branchName = editProduct.branch_name.trim();
    const targetAudience = normalizeCommaValues(editProduct.target_audience).join(', ');
    const highlightTags = normalizeCommaValues(editProduct.highlight_tags).join(', ');
    const sizeType = (editProduct.size_type || 'none') as CategorySizeType;
    const shoeForm = sizeType === 'shoes' ? normalizeCommaValues(editProduct.shoe_form).join(', ') : '';
    const playStyle = sizeType === 'shoes' ? normalizeCommaValues(editProduct.play_style).join(', ') : '';
    const segment = sizeType === 'shoes' ? normalizeCommaValues(editProduct.segment).join(', ') : '';
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
        branch_name: branchName || null,
        target_audience: targetAudience || null,
        highlight_tags: highlightTags || null,
        shoe_form: shoeForm || null,
        play_style: playStyle || null,
        segment: segment || null,
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

  const handleCreatePromotion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin) {
      window.alert('Chỉ admin mới có quyền tạo mã khuyến mãi.');
      return;
    }
    setPromotionMessage('');
    setPromotionError('');
    const code = newPromotionCode.trim().toUpperCase();
    const name = newPromotionName.trim();
    const discountPercent = Math.floor(Number(newPromotionDiscountPercent || 0));
    const minOrder = Number(newPromotionMinOrder || 0);
    const maxUses = Math.floor(Number(newPromotionMaxUses || 1));
    if (!code) {
      setPromotionError('Vui lòng nhập mã khuyến mãi.');
      return;
    }
    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 99) {
      setPromotionError('Phần trăm giảm phải từ 1 đến 99.');
      return;
    }
    if (!Number.isFinite(minOrder) || minOrder < 0) {
      setPromotionError('Giá trị đơn tối thiểu không hợp lệ.');
      return;
    }
    if (!Number.isFinite(maxUses) || maxUses < 1) {
      setPromotionError('Số lần dùng tối đa mỗi user phải >= 1.');
      return;
    }

    setSubmitting(true);
    const { data, error: createError } = await db.createPromotion({
      code,
      name,
      discountPercent,
      minOrder,
      maxUsesPerUser: maxUses,
      startsAt: newPromotionStartsAt || undefined,
      endsAt: newPromotionEndsAt || undefined,
      isActive: newPromotionIsActive,
    });
    setSubmitting(false);
    if (createError || !data) {
      const codeError = String(createError?.message || '');
      if (codeError === 'PROMOTION_CODE_EXISTS') {
        setPromotionError('Mã khuyến mãi đã tồn tại.');
      } else {
        setPromotionError(createError?.message || 'Không thể tạo mã khuyến mãi.');
      }
      return;
    }
    const createdPromotion = data as PromotionItem;
    setPromotions(prev => [createdPromotion, ...prev]);
    setSelectedPromotionId(createdPromotion.id);
    setNewPromotionCode('');
    setNewPromotionName('');
    setNewPromotionDiscountPercent('');
    setNewPromotionMinOrder('');
    setNewPromotionMaxUses('');
    setNewPromotionStartsAt('');
    setNewPromotionEndsAt('');
    setNewPromotionIsActive(true);
    setPromotionMessage('Tạo mã khuyến mãi thành công.');
  };

  const handleAssignPromotion = async () => {
    if (!isAdmin) {
      window.alert('Chỉ admin mới có quyền phát mã.');
      return;
    }
    if (!selectedPromotionId) {
      setPromotionError('Vui lòng chọn mã khuyến mãi cần phát.');
      return;
    }
    setPromotionMessage('');
    setPromotionError('');
    const minOrderAmount = Math.max(0, Number(assignMinOrderAmount || 0));
    if (assignMode === 'min_order' && !Number.isFinite(minOrderAmount)) {
      setPromotionError('Ngưỡng đơn hàng phát mã không hợp lệ.');
      return;
    }
    if (assignMode === 'specific_user' && !assignTargetUserId.trim()) {
      setPromotionError('Vui lòng chọn người dùng cần phát mã riêng.');
      return;
    }
    setSubmitting(true);
    const { data, error: assignError } = await db.assignPromotion({
      promotionId: selectedPromotionId,
      mode: assignMode,
      minOrderAmount,
      targetUserId: assignTargetUserId.trim(),
    });
    setSubmitting(false);
    if (assignError) {
      const errorCode = String(assignError.message || '');
      if (errorCode === 'TARGET_USER_REQUIRED') {
        setPromotionError('Vui lòng chọn người dùng cụ thể.');
      } else if (errorCode === 'TARGET_USER_NOT_FOUND') {
        setPromotionError('Không tìm thấy tài khoản được chọn để phát mã.');
      } else {
        setPromotionError(assignError.message || 'Không thể phát mã khuyến mãi.');
      }
      return;
    }
    const assignedCount = Number(data?.assigned_count || 0);
    const totalEligible = Number(data?.total_eligible || 0);
    const skippedCount = Number(data?.skipped_count || 0);
    setPromotionMessage(`Đã phát ${assignedCount}/${totalEligible} người dùng hợp lệ (bỏ qua ${skippedCount} đã phát trước đó).`);
    const { data: assignmentRows } = await db.getPromotionAssignments(selectedPromotionId);
    setPromotionAssignments((assignmentRows || []) as PromotionAssignmentItem[]);
  };

  const handleReviewStatusUpdate = async (reviewId: string) => {
    if (!isAdmin) {
      window.alert('Chỉ admin mới có quyền phê duyệt đánh giá.');
      return;
    }
    const review = reviews.find(item => item.id === reviewId);
    if (!review) return;
    const nextStatus = reviewStatusDrafts[reviewId]
      || review.status
      || (review.is_hidden ? 'hidden' : 'approved');

    setSubmitting(true);
    const { data: updated, error: updateError } = await db.moderateReview({
      reviewId,
      status: nextStatus as 'pending' | 'approved' | 'hidden',
    });
    setSubmitting(false);
    if (updateError) {
      const code = String(updateError?.message || '');
      if (code === 'FORBIDDEN') {
        window.alert('Bạn không có quyền phê duyệt đánh giá.');
      } else if (code === 'REVIEW_NOT_FOUND') {
        window.alert('Không tìm thấy đánh giá cần cập nhật.');
      } else {
        window.alert(`Không thể cập nhật trạng thái đánh giá. ${code || ''}`.trim());
      }
      return;
    }
    setReviews(prev => prev.map(item => (
      item.id === reviewId
        ? { ...item, ...(updated || {}) }
        : item
    )));
    setReviewStatusDrafts(prev => ({
      ...prev,
      [reviewId]: String(updated?.status || nextStatus),
    }));
    window.alert('Đã lưu trạng thái đánh giá.');
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
    { id: 'banners', label: 'Banner', icon: ImagePlus },
    { id: 'categories', label: 'Danh mục', icon: Tags },
    { id: 'promotions', label: 'Khuyến mãi', icon: TicketPercent },
    { id: 'reviews', label: 'Đánh giá', icon: Star },
    { id: 'support', label: 'Hỗ trợ', icon: Headset },
  ];

  const productMenuItems: Array<{ id: StaffTab; label: string }> = [
    { id: 'products_list', label: 'Danh sách sản phẩm' },
    { id: 'new_products', label: 'Sản phẩm mới' },
    { id: 'featured_products', label: 'Sản phẩm nổi bật' },
  ];
  const accountMenuItems: Array<{ id: StaffTab; label: string }> = [
    { id: 'customers', label: 'Khách hàng' },
    { id: 'employees', label: 'Nhân viên' },
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
    banners: 'Banner',
    categories: 'Danh mục',
    customers: 'Tài khoản khách hàng',
    employees: 'Tài khoản nhân viên',
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

            <button
              onClick={() => setIsAccountMenuOpen(prev => !prev)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                ACCOUNT_TABS.includes(activeTab)
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              <span className="inline-flex items-center gap-3">
                <Users className="w-4 h-4" />
                Tài khoản
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAccountMenuOpen && (
              <div className="ml-4 space-y-1 border-l border-zinc-700 pl-3">
                {accountMenuItems.map(item => (
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
            </div>
            <div className="flex items-center gap-3">
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
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
                      <select
                        value={newProduct.branch_name}
                        onChange={event => setNewProduct(prev => ({ ...prev, branch_name: event.target.value }))}
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="">Chọn chi nhánh</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.name}>{branch.name}</option>
                        ))}
                      </select>
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

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      <div className="border border-slate-200 rounded-lg bg-white p-3 space-y-2">
                        <p className="text-xs font-semibold text-slate-700 uppercase">Đối tượng</p>
                        <div className="flex flex-wrap gap-2">
                          {TARGET_AUDIENCE_OPTIONS.map(option => (
                            <label key={option} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                              <input
                                type="checkbox"
                                checked={isCheckedInCsv(newProduct.target_audience, option)}
                                onChange={event => setNewProduct(prev => ({ ...prev, target_audience: toggleCsvValue(prev.target_audience, option, event.target.checked) }))}
                                className="rounded border-slate-300"
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="border border-slate-200 rounded-lg bg-white p-3 space-y-2">
                        <p className="text-xs font-semibold text-slate-700 uppercase">Điểm nổi bật</p>
                        <div className="flex flex-wrap gap-2">
                          {HIGHLIGHT_TAG_OPTIONS.map(option => (
                            <label key={option} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                              <input
                                type="checkbox"
                                checked={isCheckedInCsv(newProduct.highlight_tags, option)}
                                onChange={event => setNewProduct(prev => ({ ...prev, highlight_tags: toggleCsvValue(prev.highlight_tags, option, event.target.checked) }))}
                                className="rounded border-slate-300"
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      </div>
                      {selectedProductSizeType === 'shoes' && (
                        <>
                          <div className="border border-slate-200 rounded-lg bg-white p-3 space-y-2">
                            <p className="text-xs font-semibold text-slate-700 uppercase">Form giày</p>
                            <div className="flex flex-wrap gap-2">
                              {SHOE_FORM_OPTIONS.map(option => (
                                <label key={option} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={isCheckedInCsv(newProduct.shoe_form, option)}
                                    onChange={event => setNewProduct(prev => ({ ...prev, shoe_form: toggleCsvValue(prev.shoe_form, option, event.target.checked) }))}
                                    className="rounded border-slate-300"
                                  />
                                  {option}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="border border-slate-200 rounded-lg bg-white p-3 space-y-2">
                            <p className="text-xs font-semibold text-slate-700 uppercase">Thể loại chơi</p>
                            <div className="flex flex-wrap gap-2">
                              {PLAY_STYLE_OPTIONS.map(option => (
                                <label key={option} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={isCheckedInCsv(newProduct.play_style, option)}
                                    onChange={event => setNewProduct(prev => ({ ...prev, play_style: toggleCsvValue(prev.play_style, option, event.target.checked) }))}
                                    className="rounded border-slate-300"
                                  />
                                  {option}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="border border-slate-200 rounded-lg bg-white p-3 space-y-2 xl:col-span-2">
                            <p className="text-xs font-semibold text-slate-700 uppercase">Phân khúc</p>
                            <div className="flex flex-wrap gap-2">
                              {SEGMENT_OPTIONS.map(option => (
                                <label key={option} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={isCheckedInCsv(newProduct.segment, option)}
                                    onChange={event => setNewProduct(prev => ({ ...prev, segment: toggleCsvValue(prev.segment, option, event.target.checked) }))}
                                    className="rounded border-slate-300"
                                  />
                                  {option}
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {selectedProductSizeType === 'apparel' && (
                      <p className="text-xs text-slate-500">
                        Với quần áo, hệ thống tập trung bộ lọc theo mức giá, thương hiệu, chi nhánh và size (S/M/L/XL/2XL), không hiển thị các thuộc tính riêng của giày.
                      </p>
                    )}

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
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                              <input
                                value={editProduct.brand}
                                onChange={event => setEditProduct(prev => ({ ...prev, brand: event.target.value }))}
                                placeholder="Thương hiệu"
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                              />
                              <select
                                value={editProduct.branch_name}
                                onChange={event => setEditProduct(prev => ({ ...prev, branch_name: event.target.value }))}
                                className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                              >
                                <option value="">Chọn chi nhánh</option>
                                {branches.map(branch => (
                                  <option key={branch.id} value={branch.name}>{branch.name}</option>
                                ))}
                              </select>
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
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                              <div className="border border-slate-200 rounded-lg bg-white p-3 space-y-2">
                                <p className="text-xs font-semibold text-slate-700 uppercase">Đối tượng</p>
                                <div className="flex flex-wrap gap-2">
                                  {TARGET_AUDIENCE_OPTIONS.map(option => (
                                    <label key={option} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={isCheckedInCsv(editProduct.target_audience, option)}
                                        onChange={event => setEditProduct(prev => ({ ...prev, target_audience: toggleCsvValue(prev.target_audience, option, event.target.checked) }))}
                                        className="rounded border-slate-300"
                                      />
                                      {option}
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div className="border border-slate-200 rounded-lg bg-white p-3 space-y-2">
                                <p className="text-xs font-semibold text-slate-700 uppercase">Điểm nổi bật</p>
                                <div className="flex flex-wrap gap-2">
                                  {HIGHLIGHT_TAG_OPTIONS.map(option => (
                                    <label key={option} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={isCheckedInCsv(editProduct.highlight_tags, option)}
                                        onChange={event => setEditProduct(prev => ({ ...prev, highlight_tags: toggleCsvValue(prev.highlight_tags, option, event.target.checked) }))}
                                        className="rounded border-slate-300"
                                      />
                                      {option}
                                    </label>
                                  ))}
                                </div>
                              </div>
                              {editProduct.size_type === 'shoes' && (
                                <>
                                  <div className="border border-slate-200 rounded-lg bg-white p-3 space-y-2">
                                    <p className="text-xs font-semibold text-slate-700 uppercase">Form giày</p>
                                    <div className="flex flex-wrap gap-2">
                                      {SHOE_FORM_OPTIONS.map(option => (
                                        <label key={option} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                          <input
                                            type="checkbox"
                                            checked={isCheckedInCsv(editProduct.shoe_form, option)}
                                            onChange={event => setEditProduct(prev => ({ ...prev, shoe_form: toggleCsvValue(prev.shoe_form, option, event.target.checked) }))}
                                            className="rounded border-slate-300"
                                          />
                                          {option}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="border border-slate-200 rounded-lg bg-white p-3 space-y-2">
                                    <p className="text-xs font-semibold text-slate-700 uppercase">Thể loại chơi</p>
                                    <div className="flex flex-wrap gap-2">
                                      {PLAY_STYLE_OPTIONS.map(option => (
                                        <label key={option} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                          <input
                                            type="checkbox"
                                            checked={isCheckedInCsv(editProduct.play_style, option)}
                                            onChange={event => setEditProduct(prev => ({ ...prev, play_style: toggleCsvValue(prev.play_style, option, event.target.checked) }))}
                                            className="rounded border-slate-300"
                                          />
                                          {option}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="border border-slate-200 rounded-lg bg-white p-3 space-y-2 xl:col-span-2">
                                    <p className="text-xs font-semibold text-slate-700 uppercase">Phân khúc</p>
                                    <div className="flex flex-wrap gap-2">
                                      {SEGMENT_OPTIONS.map(option => (
                                        <label key={option} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                          <input
                                            type="checkbox"
                                            checked={isCheckedInCsv(editProduct.segment, option)}
                                            onChange={event => setEditProduct(prev => ({ ...prev, segment: toggleCsvValue(prev.segment, option, event.target.checked) }))}
                                            className="rounded border-slate-300"
                                          />
                                          {option}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                            {editProduct.size_type === 'apparel' && (
                              <p className="text-xs text-slate-500">
                                Với quần áo, hệ thống tập trung bộ lọc theo mức giá, thương hiệu, chi nhánh và size (S/M/L/XL/2XL), không hiển thị các thuộc tính riêng của giày.
                              </p>
                            )}
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

          {activeTab === 'banners' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Quản lý banner trang chủ</h2>
                  <p className="text-sm text-slate-500 mt-1">Thêm, sửa, xóa và sắp xếp thứ tự hiển thị slider banner.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAllBanners}
                  disabled={submitting || banners.length === 0}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  Xóa tất cả banner
                </button>
              </div>

              {!bannerFeatureEnabled && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  Chưa có bảng `banners` trong database hoặc API chưa mở bảng này.
                </div>
              )}

              {bannerFeatureEnabled && (
                <>
                  <form onSubmit={handleCreateBanner} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-4">
                    <h3 className="font-semibold text-slate-900">Thêm banner mới</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input
                        value={newBannerTitle}
                        onChange={event => setNewBannerTitle(event.target.value)}
                        placeholder="Tiêu đề banner (tùy chọn)"
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                      />
                      <input
                        type="number"
                        value={nextBannerSortOrder}
                        placeholder="Thứ tự hiển thị"
                        readOnly
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-700"
                      />
                      <label className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white inline-flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={newBannerIsActive}
                          onChange={event => setNewBannerIsActive(event.target.checked)}
                        />
                        Kích hoạt hiển thị
                      </label>
                      <select
                        value={newBannerTargetType}
                        onChange={event => {
                          const value = event.target.value as BannerTargetType;
                          setNewBannerTargetType(value);
                          if (value !== 'product') setNewBannerTargetProductId('');
                          if (value !== 'category') setNewBannerTargetCategoryId('');
                        }}
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="none">Ảnh thủ công, mở trang sản phẩm</option>
                        <option value="product">Lấy ảnh từ sản phẩm</option>
                        <option value="category">Lấy ảnh từ danh mục</option>
                      </select>
                    </div>
                    {newBannerTargetType === 'product' && (
                      <select
                        value={newBannerTargetProductId}
                        onChange={event => setNewBannerTargetProductId(event.target.value)}
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white w-full"
                      >
                        <option value="">Chọn sản phẩm để lấy ảnh + gắn link</option>
                        {bannerProductOptions.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    )}
                    {newBannerTargetType === 'category' && (
                      <select
                        value={newBannerTargetCategoryId}
                        onChange={event => setNewBannerTargetCategoryId(event.target.value)}
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white w-full"
                      >
                        <option value="">Chọn danh mục để lấy ảnh + gắn link</option>
                        {bannerCategoryOptions.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-blue-600 font-medium cursor-pointer hover:bg-blue-50 transition-colors">
                        <ImagePlus className="w-4 h-4" />
                        Chọn ảnh banner
                        <input type="file" accept="image/*" onChange={event => handleBannerImageChange(event, 'new')} className="hidden" />
                      </label>
                      <span className="text-xs text-slate-500 truncate">{newBannerImageName || 'Chưa chọn ảnh (tối đa 300KB)'}</span>
                      {newBannerImageUrl && (
                        <img src={newBannerImageUrl} alt="Preview banner" className="w-14 h-10 rounded-lg object-cover border border-slate-200" />
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="h-10 min-w-28 px-6 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {submitting ? 'Đang tạo...' : 'Tạo banner'}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {banners
                      .slice()
                      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
                      .map(banner => (
                        <div key={banner.id} className="border border-slate-100 rounded-xl p-4">
                          {editingBannerId === banner.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <input
                                  value={editBannerTitle}
                                  onChange={event => setEditBannerTitle(event.target.value)}
                                  placeholder="Tiêu đề banner (tùy chọn)"
                                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                                />
                                <input
                                  type="number"
                                  value={editBannerSortOrder}
                                  onChange={event => setEditBannerSortOrder(event.target.value)}
                                  placeholder="Thứ tự hiển thị"
                                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                                />
                                <label className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white inline-flex items-center gap-2 text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={editBannerIsActive}
                                    onChange={event => setEditBannerIsActive(event.target.checked)}
                                  />
                                  Kích hoạt hiển thị
                                </label>
                                <select
                                  value={editBannerTargetType}
                                  onChange={event => {
                                    const value = event.target.value as BannerTargetType;
                                    setEditBannerTargetType(value);
                                    if (value !== 'product') setEditBannerTargetProductId('');
                                    if (value !== 'category') setEditBannerTargetCategoryId('');
                                  }}
                                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                                >
                                  <option value="none">Ảnh thủ công, mở trang sản phẩm</option>
                                  <option value="product">Lấy ảnh từ sản phẩm</option>
                                  <option value="category">Lấy ảnh từ danh mục</option>
                                </select>
                              </div>
                              {editBannerTargetType === 'product' && (
                                <select
                                  value={editBannerTargetProductId}
                                  onChange={event => setEditBannerTargetProductId(event.target.value)}
                                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white w-full"
                                >
                                  <option value="">Chọn sản phẩm để lấy ảnh + gắn link</option>
                                  {bannerProductOptions.map(item => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                  ))}
                                </select>
                              )}
                              {editBannerTargetType === 'category' && (
                                <select
                                  value={editBannerTargetCategoryId}
                                  onChange={event => setEditBannerTargetCategoryId(event.target.value)}
                                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white w-full"
                                >
                                  <option value="">Chọn danh mục để lấy ảnh + gắn link</option>
                                  {bannerCategoryOptions.map(item => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                  ))}
                                </select>
                              )}
                              <div className="flex items-center gap-4">
                                <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-sm text-blue-600 font-medium cursor-pointer hover:bg-blue-50 transition-colors">
                                  <ImagePlus className="w-4 h-4" />
                                  Đổi ảnh
                                  <input type="file" accept="image/*" onChange={event => handleBannerImageChange(event, 'edit')} className="hidden" />
                                </label>
                                <span className="text-xs text-slate-500 truncate">{editBannerImageName || 'Không có ảnh'}</span>
                                {editBannerImageUrl && (
                                  <img src={editBannerImageUrl} alt="Preview banner" className="w-14 h-10 rounded-lg object-cover border border-slate-200" />
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBanner(banner.id)}
                                  disabled={submitting}
                                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <Save className="w-4 h-4 inline mr-1" />
                                  Lưu
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditBanner}
                                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
                                >
                                  <X className="w-4 h-4 inline mr-1" />
                                  Hủy
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              {banner.image_url ? (
                                <img src={banner.image_url} alt={banner.title || 'Banner'} className="w-24 h-14 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                              ) : (
                                <div className="w-24 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                                  <ImagePlus className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900">{banner.title || 'Banner không tiêu đề'}</p>
                                <p className="text-xs text-slate-500">
                                  Thứ tự: {Number(banner.sort_order || 0)} - Trạng thái: {Boolean(Number(banner.is_active ?? 1)) ? 'Đang hiển thị' : 'Đang ẩn'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Liên kết: {banner.target_type === 'product'
                                    ? 'Chi tiết sản phẩm'
                                    : banner.target_type === 'category'
                                      ? 'Trang danh mục sản phẩm'
                                      : 'Trang sản phẩm'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startEditBanner(banner)}
                                  className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Sửa"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBanner(banner.id)}
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
                    {banners.length === 0 && <p className="text-sm text-slate-500">Chưa có banner nào.</p>}
                  </div>
                </>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={newCategoryProductGroup}
                    onChange={event => setNewCategoryProductGroup(event.target.value as CategoryProductGroup)}
                    className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {CATEGORY_PRODUCT_GROUP_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <select
                            value={editCategoryProductGroup}
                            onChange={event => setEditCategoryProductGroup(event.target.value as CategoryProductGroup)}
                            className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                          >
                            {CATEGORY_PRODUCT_GROUP_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
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
                            Nhóm: {CATEGORY_PRODUCT_GROUP_OPTIONS.find(item => item.value === (category.product_group || 'badminton'))?.label || 'Sản phẩm cầu lông'}
                          </p>
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

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-4">
                <h3 className="font-semibold text-slate-900">Tiêu đề section trang chủ</h3>
                <form onSubmit={handleCreateHomeCategorySection} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={newHomeSectionTitle}
                      onChange={event => setNewHomeSectionTitle(event.target.value)}
                      placeholder="Tiêu đề section (VD: Sản phẩm tennis)"
                      className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                    <select
                      value={newHomeSectionGroup}
                      onChange={event => setNewHomeSectionGroup(event.target.value as CategoryProductGroup)}
                      className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      {CATEGORY_PRODUCT_GROUP_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="border border-slate-200 rounded-lg bg-white p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Chọn danh mục hiển thị trong section</p>
                    <div className="flex flex-wrap gap-2">
                      {categoriesForNewSectionGroup.map(item => (
                        <label key={item.id} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={newHomeSectionCategoryIds.includes(item.id)}
                            onChange={() => handleToggleNewHomeSectionCategory(item.id)}
                            className="rounded border-slate-300"
                          />
                          {item.name}
                        </label>
                      ))}
                      {categoriesForNewSectionGroup.length === 0 && (
                        <p className="text-xs text-slate-500">Nhóm này chưa có danh mục nào.</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-10 min-w-28 px-6 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                    >
                      {submitting ? 'Đang thêm...' : 'Thêm tiêu đề'}
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  {homeCategorySections.map(section => (
                    <div key={section.id} className="border border-slate-200 rounded-lg bg-white p-3 space-y-3">
                      {editingHomeSectionId === section.id ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              value={editHomeSectionTitle}
                              onChange={event => setEditHomeSectionTitle(event.target.value)}
                              placeholder="Tiêu đề section"
                              className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                            />
                            <select
                              value={editHomeSectionGroup}
                              onChange={event => setEditHomeSectionGroup(event.target.value as CategoryProductGroup)}
                              className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                            >
                              {CATEGORY_PRODUCT_GROUP_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="border border-slate-200 rounded-lg bg-white p-3">
                            <p className="text-xs font-semibold text-slate-600 mb-2">Chọn danh mục hiển thị trong section</p>
                            <div className="flex flex-wrap gap-2">
                              {categoriesForEditSectionGroup.map(item => (
                                <label key={item.id} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={editHomeSectionCategoryIds.includes(item.id)}
                                    onChange={() => handleToggleEditHomeSectionCategory(item.id)}
                                    className="rounded border-slate-300"
                                  />
                                  {item.name}
                                </label>
                              ))}
                              {categoriesForEditSectionGroup.length === 0 && (
                                <p className="text-xs text-slate-500">Nhóm này chưa có danh mục nào.</p>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEditHomeCategorySection}
                              className="h-9 px-4 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateHomeCategorySection(section.id)}
                              disabled={submitting}
                              className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                            >
                              {submitting ? 'Đang lưu...' : 'Lưu sửa'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{section.title}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Nhóm: {CATEGORY_PRODUCT_GROUP_OPTIONS.find(item => item.value === (section.product_group || 'badminton'))?.label || 'Sản phẩm cầu lông'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 truncate">
                              Danh mục: {section.categoryIds
                                .map(id => categories.find(cat => cat.id === id)?.name || '')
                                .filter(Boolean)
                                .join(', ') || 'Chưa chọn'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditHomeCategorySection(section)}
                              className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Sửa section"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHomeCategorySection(section.id)}
                              disabled={submitting}
                              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                              title="Xóa section"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {homeCategorySections.length === 0 && (
                    <p className="text-sm text-slate-500">Chưa có section danh mục nào cho trang chủ.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'customers' || activeTab === 'employees') && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="text-lg font-bold text-slate-900">
                {activeTab === 'customers' ? 'Thông tin tài khoản khách hàng' : 'Thông tin tài khoản nhân viên'}
              </h2>
              <p className="text-sm text-slate-500">
                {isAdmin
                  ? 'Admin có thể xem, chỉnh sửa hoặc xóa tài khoản khi cần.'
                  : 'Bạn đang ở chế độ xem. Chỉ admin mới có quyền chỉnh sửa hoặc xóa tài khoản.'}
              </p>
              {isAdmin && (
                <form onSubmit={handleCreateAccount} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                  <h3 className="font-semibold text-slate-900">Tạo tài khoản</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={newAccountFullName}
                      onChange={event => setNewAccountFullName(event.target.value)}
                      placeholder="Tên"
                      className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                    <input
                      type="email"
                      value={newAccountEmail}
                      onChange={event => setNewAccountEmail(event.target.value)}
                      placeholder="Email *"
                      className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                      required
                    />
                    <input
                      value={newAccountPhone}
                      onChange={event => setNewAccountPhone(event.target.value)}
                      placeholder="SĐT (không bắt buộc)"
                      className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                    <select
                      value={newAccountRole}
                      onChange={event => setNewAccountRole(event.target.value as 'customer' | 'staff')}
                      className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option value="customer">Khách hàng</option>
                      <option value="staff">Nhân viên</option>
                    </select>
                    <input
                      value={newAccountAddress}
                      onChange={event => setNewAccountAddress(event.target.value)}
                      placeholder="Địa chỉ (không bắt buộc)"
                      className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white md:col-span-2"
                    />
                  </div>
                  {createAccountMessage && (
                    <p className="text-sm text-emerald-700">{createAccountMessage}</p>
                  )}
                  {createAccountError && (
                    <p className="text-sm text-rose-600">{createAccountError}</p>
                  )}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </button>
                  </div>
                </form>
              )}
              {(activeTab === 'customers' ? visibleCustomerAccounts : visibleEmployeeAccounts).map(account => {
                const stats = customerStats.get(account.id) || { orderCount: 0, totalSpent: 0 };
                const isEditing = editingAccountId === account.id;
                return (
                  <div key={account.id} className="border border-slate-100 rounded-xl p-4 space-y-2">
                    {isEditing ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            value={editAccountFullName}
                            onChange={event => setEditAccountFullName(event.target.value)}
                            placeholder="Họ tên"
                            className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                          />
                          <input
                            value={editAccountPhone}
                            onChange={event => setEditAccountPhone(event.target.value)}
                            placeholder="Số điện thoại"
                            className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                          />
                          <input
                            value={editAccountAddress}
                            onChange={event => setEditAccountAddress(event.target.value)}
                            placeholder="Địa chỉ"
                            className="h-10 px-3 border border-slate-200 rounded-lg text-sm md:col-span-2"
                          />
                          <select
                            value={editAccountRole}
                            onChange={event => setEditAccountRole(event.target.value as 'customer' | 'staff')}
                            className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                          >
                            <option value="customer">Khách hàng</option>
                            <option value="staff">Nhân viên</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateAccount(account.id)}
                            disabled={submitting}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Save className="w-4 h-4 inline mr-1" />
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditAccount}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
                          >
                            <X className="w-4 h-4 inline mr-1" />
                            Hủy
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-900">{account.full_name || 'Chưa cập nhật tên'}</p>
                        <p className="text-sm text-slate-500">Email: {account.email || '---'}</p>
                        <p className="text-sm text-slate-500">SĐT: {account.phone || '---'}</p>
                        <p className="text-sm text-slate-500">Địa chỉ: {account.address || '---'}</p>
                        <p className="text-sm text-slate-500">
                          Vai trò: {(account.role || 'customer') === 'staff' ? 'Nhân viên' : 'Khách hàng'}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          Số đơn: <span className="font-medium">{stats.orderCount}</span> - Tổng mua: <span className="font-medium">{formatPrice(stats.totalSpent)}</span>
                        </p>
                        {isAdmin && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => startEditAccount(account)}
                              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                            >
                              <Pencil className="w-4 h-4 inline mr-1" />
                              Chỉnh sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(account.id)}
                              disabled={submitting}
                              className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4 inline mr-1" />
                              Xóa
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {(activeTab === 'customers' ? visibleCustomerAccounts.length === 0 : visibleEmployeeAccounts.length === 0) && (
                <p className="text-sm text-slate-500">
                  {activeTab === 'customers' ? 'Chưa có tài khoản khách hàng nào.' : 'Chưa có tài khoản nhân viên nào.'}
                </p>
              )}
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
              {promotionFeatureEnabled && (
                <>
                  <form onSubmit={handleCreatePromotion} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                    <h3 className="font-semibold text-slate-900">Tạo mã khuyến mãi</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        value={newPromotionCode}
                        onChange={event => setNewPromotionCode(event.target.value.toUpperCase())}
                        placeholder="Mã (VD: SUMMER10)"
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
                      />
                      <input
                        value={newPromotionName}
                        onChange={event => setNewPromotionName(event.target.value)}
                        placeholder="Tên chiến dịch"
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
                      />
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={newPromotionDiscountPercent}
                        onChange={event => setNewPromotionDiscountPercent(event.target.value)}
                        placeholder="% giảm (1-99)"
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
                      />
                      <input
                        type="number"
                        min={0}
                        value={newPromotionMinOrder}
                        onChange={event => setNewPromotionMinOrder(event.target.value)}
                        placeholder="Đơn tối thiểu áp mã (VND)"
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
                      />
                      <input
                        type="number"
                        min={1}
                        value={newPromotionMaxUses}
                        onChange={event => setNewPromotionMaxUses(event.target.value)}
                        placeholder="Số lần dùng tối đa cho mỗi user"
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
                      />
                      <label className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newPromotionIsActive}
                          onChange={event => setNewPromotionIsActive(event.target.checked)}
                        />
                        Kích hoạt ngay
                      </label>
                      <input
                        type="datetime-local"
                        value={newPromotionStartsAt}
                        onChange={event => setNewPromotionStartsAt(event.target.value)}
                        placeholder="Ngày bắt đầu (không bắt buộc)"
                        title="Ngày bắt đầu (không bắt buộc)"
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
                      />
                      <input
                        type="datetime-local"
                        value={newPromotionEndsAt}
                        onChange={event => setNewPromotionEndsAt(event.target.value)}
                        placeholder="Ngày kết thúc (không bắt buộc)"
                        title="Ngày kết thúc (không bắt buộc)"
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
                      />
                    </div>
                    
                    {promotionError && <p className="text-sm text-rose-600">{promotionError}</p>}
                    {promotionMessage && <p className="text-sm text-emerald-700">{promotionMessage}</p>}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Đang tạo...' : 'Tạo mã'}
                    </button>
                  </form>

                  <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <h3 className="font-semibold text-slate-900">Phát mã cho người dùng</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select
                        value={selectedPromotionId}
                        onChange={event => setSelectedPromotionId(event.target.value)}
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
                      >
                        <option value="">Chọn mã khuyến mãi</option>
                        {promotions.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.code || item.name || item.id}
                          </option>
                        ))}
                      </select>
                      <select
                        value={assignMode}
                        onChange={event => setAssignMode(event.target.value as 'all_buyers' | 'min_order' | 'specific_user')}
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
                      >
                        <option value="all_buyers">Phát cho tất cả user đã mua hàng</option>
                        <option value="min_order">Phát cho user có đơn từ mức chỉ định</option>
                        <option value="specific_user">Phát cho người dùng riêng</option>
                      </select>
                      {assignMode === 'min_order' && (
                        <input
                          type="number"
                          min={0}
                          value={assignMinOrderAmount}
                          onChange={event => setAssignMinOrderAmount(event.target.value)}
                          placeholder="Đơn tối thiểu để phát mã (VND)"
                          className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
                        />
                      )}
                      {assignMode === 'specific_user' && (
                        <select
                          value={assignTargetUserId}
                          onChange={event => setAssignTargetUserId(event.target.value)}
                          className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white"
                        >
                          <option value="">Chọn người dùng cần phát mã riêng</option>
                          {customers.map(account => (
                            <option key={account.id} value={account.id}>
                              {(account.full_name || 'Không tên')} - {account.email || account.id}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAssignPromotion}
                      disabled={submitting || !selectedPromotionId}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {submitting ? 'Đang phát...' : 'Phát mã'}
                    </button>
                    {selectedPromotion && (
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-sm font-semibold text-slate-800 mb-2">Danh sách đã phát: {selectedPromotion.code || selectedPromotion.name}</p>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {promotionAssignments.map(item => (
                            <div key={item.id} className="text-sm text-slate-600 border border-slate-100 rounded-lg px-3 py-2">
                              <p className="font-medium text-slate-800">{item.full_name || 'Người dùng'} - {item.email || '---'}</p>
                              <p className="text-xs text-slate-500">
                                Vai trò: {item.role || 'customer'} • Cách phát: {item.assignment_type === 'min_order' ? 'Theo ngưỡng đơn' : item.assignment_type === 'specific_user' ? 'Phát riêng từng user' : 'Tất cả đã mua'}
                              </p>
                            </div>
                          ))}
                          {promotionAssignments.length === 0 && (
                            <p className="text-sm text-slate-500">Chưa phát mã cho người dùng nào.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {promotions.length === 0 && (
                    <p className="text-sm text-slate-500">Chưa có chương trình khuyến mãi nào.</p>
                  )}
                  {visiblePromotions.map(item => {
                    const isActive = item.is_active === true || item.status === 'active';
                    return (
                      <div key={item.id} className="border border-slate-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.name || item.code || `KM-${item.id.slice(0, 6)}`}</p>
                          <p className="text-sm text-slate-500">
                            Mã: {item.code || '---'} • Giảm: {item.discount_percent ?? 0}% • Đơn tối thiểu: {formatPrice(Number(item.min_order || 0))}
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
                </>
              )}
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
                  <p className="text-xs text-slate-500 mb-2">
                    Người đánh giá: {item.full_name || 'Ẩn danh'}{item.phone ? ` - ${item.phone}` : ''}
                  </p>
                  <p className="text-sm text-slate-600">{item.comment || 'Không có nội dung.'}</p>
                  {item.image_url && (
                    <div className="mt-2">
                      <img src={item.image_url} alt="Ảnh đính kèm đánh giá" className="w-24 h-24 rounded-lg object-cover border border-slate-200" />
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    User: {item.user_id ? `#${item.user_id.slice(0, 8)}` : '---'} • {item.created_at ? formatDate(item.created_at) : '--'}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <select
                      value={reviewStatusDrafts[item.id] || item.status || (item.is_hidden ? 'hidden' : 'approved')}
                      onChange={event => setReviewStatusDrafts(prev => ({ ...prev, [item.id]: event.target.value }))}
                      className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                      disabled={!isAdmin}
                    >
                      <option value="pending">Chờ duyệt</option>
                      <option value="approved">Hiển thị</option>
                      <option value="hidden">Ẩn đánh giá</option>
                    </select>
                    <button
                      onClick={() => handleReviewStatusUpdate(item.id)}
                      disabled={submitting || !isAdmin}
                      className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      Lưu trạng thái
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
