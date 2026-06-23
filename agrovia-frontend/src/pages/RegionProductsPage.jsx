import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useProducts, useRegions, useWishlist } from '../hooks/useAgroviaData';
import { api } from '../api/agroviaApi';
import { EmptyState, LoadingGrid, ProductCard, SectionTitle } from '../components/Ui';

export default function RegionProductsPage() {
  const { regionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user } = useSelector((s) => s.auth);
  const isBuyer = user?.role === 'buyer';

  const { data: regions = [] } = useRegions();
  const region = regions.find((r) => r._id === regionId);

  const wishlistQuery = useWishlist(!!token && isBuyer);
  const productsQuery = useProducts({ region: regionId, status: 'active', sort: 'newest', limit: 60 });
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
          to="/regions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-forest hover:underline dark:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />Bütün regionlar
        </Link>
      </div>

      <SectionTitle
        title={region?.name || 'Məhsullar'}
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
          title="Hazırda bu regionda aktiv məhsul yoxdur."
          action={
            <Link to="/regions" className="btn-secondary">
              Regionlara qayıt
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
