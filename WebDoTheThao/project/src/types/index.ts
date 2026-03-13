export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  created_at: string;
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
  created_at: string;
  categories?: Category;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  products?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';
  total: number;
  shipping_address: string;
  created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
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
  created_at: string;
  updated_at: string;
}
