import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  User,
  Search,
  Menu,
  X,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Dumbbell,
  Briefcase,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { db } from '../../lib/db';
import { formatPrice } from '../../lib/formatters';
import type { Category, Product } from '../../types';

export default function Header() {
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestOpen, setSearchSuggestOpen] = useState(false);
  const [searchProductSuggestions, setSearchProductSuggestions] = useState<Product[]>([]);
  const [searchSuggestLoading, setSearchSuggestLoading] = useState(false);
  const [headerCategories, setHeaderCategories] = useState<Category[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'staff' | 'customer'>('customer');
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const fetchHeaderMenuData = useCallback(async () => {
    setMenuLoading(true);
    const categoriesRes = await db.from('categories').select('*').order('created_at', { ascending: false });
    setHeaderCategories(((categoriesRes.data || []) as Category[]).slice(0, 24));
    setMenuLoading(false);
  }, []);

  useEffect(() => {
    fetchHeaderMenuData();
  }, [fetchHeaderMenuData]);

  useEffect(() => {
    let active = true;
    async function loadCurrentUserRole() {
      if (!user?.id) {
        setCurrentUserRole('customer');
        return;
      }
      const { data } = await db
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      const role = String((data as { role?: string } | null)?.role || '').toLowerCase();
      if (role === 'admin') {
        setCurrentUserRole('admin');
        return;
      }
      if (role === 'staff') {
        setCurrentUserRole('staff');
        return;
      }
      setCurrentUserRole('customer');
    }
    loadCurrentUserRole();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const categoryColumns = useMemo(() => {
    const chunks: Category[][] = [[], [], [], []];
    headerCategories.forEach((category, index) => {
      chunks[index % 4].push(category);
    });
    return chunks.filter(chunk => chunk.length > 0);
  }, [headerCategories]);

  const quickSearchCategories = useMemo(() => {
    const normalizedPriority = ['vot', 'giay', 'ao', 'quan', 'vay'];
    const scored = [...headerCategories].map(category => {
      const normalized = String(category.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const priorityIndex = normalizedPriority.findIndex(keyword => normalized.includes(keyword));
      return {
        category,
        score: priorityIndex >= 0 ? priorityIndex : normalizedPriority.length + 1,
      };
    });
    return scored
      .sort((a, b) => (a.score - b.score) || String(a.category.name || '').localeCompare(String(b.category.name || ''), 'vi'))
      .map(item => item.category)
      .slice(0, 8);
  }, [headerCategories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchSuggestOpen(false);
    }
  };

  const handleQuickCategorySelect = (category: Category) => {
    const slug = String(category.slug || '').trim();
    if (slug) {
      navigate(`/products?category=${encodeURIComponent(slug)}`);
    } else {
      navigate(`/products?search=${encodeURIComponent(String(category.name || '').trim())}`);
    }
    setSearchSuggestOpen(false);
    setSearchQuery('');
  };

  const handleQuickProductSelect = (product: Product) => {
    const slug = String(product.slug || '').trim();
    if (slug) {
      navigate(`/products/${encodeURIComponent(slug)}`);
    } else {
      navigate(`/products?search=${encodeURIComponent(String(product.name || '').trim())}`);
    }
    setSearchSuggestOpen(false);
    setSearchQuery('');
    setSearchProductSuggestions([]);
  };

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(event.target as Node)) {
        setSearchSuggestOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!searchSuggestOpen) return;
    const keyword = searchQuery.trim();
    if (!keyword) {
      setSearchProductSuggestions([]);
      setSearchSuggestLoading(false);
      return;
    }

    let active = true;
    setSearchSuggestLoading(true);
    const timer = window.setTimeout(async () => {
      const { data, error } = await db
        .from('products')
        .select('id, name, slug, price, image_url')
        .ilike('name', `%${keyword}%`)
        .order('created_at', { ascending: false })
        .limit(6);
      if (!active) return;
      if (error) {
        setSearchProductSuggestions([]);
      } else {
        setSearchProductSuggestions((data || []) as Product[]);
      }
      setSearchSuggestLoading(false);
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, searchSuggestOpen]);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Nika<span className="text-teal-600">Sports</span>
            </span>
          </Link>

          <div className="hidden lg:flex flex-1 max-w-3xl">
            <form onSubmit={handleSearch} className="w-full flex items-center">
              <div ref={searchBoxRef} className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm vợt, giày, quần áo thể thao..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchSuggestOpen(true)}
                  className="w-full h-11 pl-11 pr-4 text-sm bg-white border border-slate-300 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                {searchSuggestOpen && (
                  <div className="absolute top-12 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-40">
                    {quickSearchCategories.length > 0 && (
                      <>
                        <p className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Tìm kiếm nhiều nhất</p>
                        <div className="flex flex-wrap gap-2">
                          {quickSearchCategories.map(category => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => handleQuickCategorySelect(category)}
                              className="px-3 py-1.5 rounded-md text-sm bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                            >
                              {category.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    {searchQuery.trim() && (
                      <div className={`${quickSearchCategories.length > 0 ? 'mt-3 pt-3 border-t border-slate-200' : ''}`}>
                        {searchSuggestLoading ? (
                          <p className="text-sm text-slate-500">Đang tìm sản phẩm...</p>
                        ) : searchProductSuggestions.length === 0 ? (
                          <p className="text-sm text-slate-500">Không có sản phẩm phù hợp.</p>
                        ) : (
                          <div className="space-y-1">
                            {searchProductSuggestions.map(product => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleQuickProductSelect(product)}
                                className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {product.image_url ? (
                                    <img
                                      src={product.image_url}
                                      alt={product.name}
                                      className="w-10 h-10 rounded-md object-cover border border-slate-200 flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex-shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{product.name}</p>
                                    <p className="text-sm font-semibold text-orange-600">{formatPrice(Number(product.price || 0))}</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button type="submit" className="h-11 px-5 bg-teal-600 text-white text-sm font-semibold rounded-r-xl hover:bg-teal-700 transition-colors">
                Tìm kiếm
              </button>
            </form>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <PackageCheck className="w-4 h-4 text-teal-600" />
                Vận chuyển toàn quốc
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Đổi trả nếu lỗi
              </span>
            </div>
            <Link
              to="/cart"
              className="relative p-2.5 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {itemCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                      </div>
                      {currentUserRole === 'admin' ? (
                        <Link
                          to="/admin-dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard admin
                        </Link>
                      ) : currentUserRole === 'staff' ? (
                        <Link
                          to="/staff-dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        >
                          <Briefcase className="w-4 h-4" />
                          Dashboard nhân viên
                        </Link>
                      ) : (
                        <Link
                          to="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all active:scale-[0.98]"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </Link>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2.5 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:block bg-teal-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-center gap-10">
          <Link to="/" className="text-sm font-semibold text-white hover:text-white/80 transition-colors">
            Trang chủ
          </Link>

          <div className="relative">
            <button
              onClick={() => {
                setCategoryMenuOpen(prev => {
                  const next = !prev;
                  if (next) {
                    fetchHeaderMenuData();
                  }
                  return next;
                });
              }}
              className="text-sm font-semibold text-white inline-flex items-center gap-2 hover:text-white/80 transition-colors"
            >
              Sản phẩm <ChevronDown className={`w-4 h-4 transition-transform ${categoryMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {categoryMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setCategoryMenuOpen(false)} />
                <div className="absolute left-1/2 -translate-x-1/2 top-11 z-40 w-[920px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-5">
                  {menuLoading ? (
                    <p className="text-sm text-slate-500">Đang tải danh mục...</p>
                  ) : categoryColumns.length === 0 ? (
                    <p className="text-sm text-slate-500">Chưa có danh mục nào. Hãy tạo danh mục trong admin trước.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-5">
                      {categoryColumns.map((column, columnIndex) => (
                        <div key={`col-${columnIndex}`}>
                          <p className="text-sm font-bold text-slate-900 mb-2">Danh mục</p>
                          <div className="space-y-1.5">
                            {column.map(category => (
                              <Link
                                key={category.id}
                                to={`/products?category=${category.slug}`}
                                onClick={() => setCategoryMenuOpen(false)}
                                className="block text-sm text-slate-600 hover:text-teal-600 transition-colors truncate"
                                title={category.name}
                              >
                                {category.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {[
            { label: 'Sale off', to: '/products?sale=1' },
            { label: 'Hướng dẫn', to: '/products' },
            { label: 'Giới thiệu', to: '/gioi-thieu' },
            { label: 'Liên hệ', to: '/products' },
          ].map(link => (
            <Link key={link.label} to={link.to} className="text-sm font-semibold text-white hover:text-white/80 transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white animate-in slide-in-from-top-2">
          <div className="px-4 py-3">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                />
              </div>
            </form>
            {[
              { label: 'Trang chủ', to: '/' },
              { label: 'Sản phẩm', to: '/products' },
              { label: 'Giới thiệu', to: '/gioi-thieu' },
              { label: 'Sale off', to: '/products?sale=1' },
              { label: 'Vợt cầu lông', to: '/products' },
              { label: 'Giày cầu lông', to: '/products' },
              { label: 'Pickleball', to: '/products' },
            ].map(link => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
