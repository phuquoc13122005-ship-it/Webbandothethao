export type CategoryProductGroup = 'badminton' | 'tennis' | 'pickleball' | 'other';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  product_group?: CategoryProductGroup;
  size_type?: 'none' | 'apparel' | 'shoes';
  size_values?: string;
  created_at: string;
}

export interface Banner {
  id: string;
  title?: string;
  image_url: string;
  target_type?: 'none' | 'product' | 'category';
  target_product_id?: string | null;
  target_product_slug?: string | null;
  target_category_id?: string | null;
  target_category_slug?: string | null;
  sort_order?: number;
  is_active?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface HomeCategorySection {
  id: string;
  title: string;
  product_group: CategoryProductGroup;
  categories_json?: string | null;
  is_active?: boolean | number;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  original_price: number | null;
  image_url: string;
  category_id: string;
  brand: string;
  rating: number;
  reviews_count: number;
  stock: number;
  featured: boolean;
  size_type?: 'none' | 'apparel' | 'shoes';
  color_options?: string;
  size_options?: string;
  size_stock?: string;
  image_gallery?: string;
  branch_name?: string | null;
  target_audience?: string | null;
  highlight_tags?: string | null;
  shoe_form?: string | null;
  play_style?: string | null;
  segment?: string | null;
  created_at: string;
  categories?: Category;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  shoe_size?: number | null;
  quantity: number;
  created_at: string;
  products?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  payment_method?: 'cod' | 'bank_transfer' | null;
  status: 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';
  total: number;
  shipping_address: string;
  cancel_reason?: string | null;
  cancel_reason_detail?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  shoe_size?: number | null;
  quantity: number;
  price: number;
  products?: Product;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  avatar_url: string;
  role?: 'customer' | 'staff' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface SupportRequest {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
  resolved_at?: string | null;
}
