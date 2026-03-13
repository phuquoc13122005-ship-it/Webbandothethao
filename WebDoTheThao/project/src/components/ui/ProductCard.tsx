import { Link } from 'react-router-dom';
import { Star, ShoppingCart } from 'lucide-react';
import type { Product } from '../../types';
import { formatPrice, getDiscountPercent } from '../../lib/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const discount = getDiscountPercent(product.price, product.original_price);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    await addToCart(product.id);
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-300"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {discount > 0 && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-rose-500 text-white text-xs font-bold rounded-lg">
            -{discount}%
          </span>
        )}
        {product.featured && (
          <span className="absolute top-3 right-3 px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg">
            HOT
          </span>
        )}
        {user && (
          <button
            onClick={handleAddToCart}
            className="absolute bottom-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-teal-500 hover:text-white rounded-xl flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        <p className="text-xs font-medium text-teal-600 mb-1">{product.brand}</p>
        <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-teal-700 transition-colors">
          {product.name}
        </h3>

        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < Math.round(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400">({product.reviews_count})</span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(product.original_price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
