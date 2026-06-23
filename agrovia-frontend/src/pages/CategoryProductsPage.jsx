import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCategories, useProducts, useWishlist } from '../hooks/useAgroviaData';
import { api } from '../api/agroviaApi';
import { EmptyState, LoadingGrid, ProductCard, SectionTitle } from '../components/Ui';

export default function CategoryProductsPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user } = useSelector((s) => s.auth);
  const isBuyer = user?.role === 'buyer';

  const { data: categories = [] } = useCategories();
  const category = categories.find((c) => c._id === categoryId);

  const wishlistQuery = useWishlist(!!token && isBuyer);
  const productsQuery = useProducts({ category: categoryId, status: 'active', sort: 'newest', limit: 60 });
  const products = productsQuery.data || [];

  const addToCartMutation = useMutation({
    mutationFn: api.addToCart,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
  const addToWishlistMutation = useMutation({
    mutationFn: api.addToWishlist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });
  const removeFromWishlistMutation = useMutation({
    mutationFn: api.removeFromWishlist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  const handleCart = (product) => {
    if (!token || !isBuyer) { navigate('/auth'); return; }
    addToCartMutation.mutate({ productId: product._id, quantity: product.minOrderQuantity || 1 });
  };
  const handleWishlist = (product) => {
    if (!token || !isBuyer) { navigate('/auth'); return; }
    const inList = wishlistQuery.data?.items?.some((i) => i.product?._id === product._id);
    if (inList) removeFromWishlistMutation.mutate(product._id);
    else addToWishlistMutation.mutate({ productId: product._id });
  };

  return (
    <div className="section-shell py-10">
      <div className="mb-6">
        <Link
          to="/categories"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-forest hover:underline dark:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />Bütün kateqoriyalar
        </Link>
      </div>

      <SectionTitle
        eyebrow="Kateqoriya"
        title={category?.name || 'Məhsullar'}
        action={
          !productsQuery.isLoading ? (
            <div className="chip dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {products.length} məhsul
            </div>
          ) : null
        }
      />

      {productsQuery.isLoading ? (
        <LoadingGrid />
      ) : products.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Bu kateqoriyada məhsul tapılmadı"
          description="Hazırda bu kateqoriyaya aid aktiv məhsul yoxdur."
          action={
            <Link to="/categories" className="btn-secondary">
              Kateqoriyalara qayıt
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onView={() => navigate(`/products/${product._id}`)}
              onAddToCart={() => handleCart(product)}
              isInWishlist={wishlistQuery.data?.items?.some((i) => i.product?._id === product._id) ?? false}
              onWishlistToggle={() => handleWishlist(product)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
