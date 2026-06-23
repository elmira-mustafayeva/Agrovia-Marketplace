import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { useWishlist } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, ProductCard, SectionTitle } from '../components/Ui';

export default function StoreProductsPage() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user } = useSelector((s) => s.auth);
  const isBuyer = user?.role === 'buyer';

  // Fetch a broad set of products and filter by seller client-side.
  // The public products endpoint does not expose a seller filter param.
  const productsQuery = useQuery({
    queryKey: ['products-for-store', sellerId],
    queryFn: () => api.getProducts({ status: 'active', limit: 100, sort: 'newest' }),
    select: (data) => data.products || [],
    enabled: Boolean(sellerId),
  });

  const allProducts = productsQuery.data || [];
  const products = useMemo(
    () => allProducts.filter((p) => p.seller?._id === sellerId || p.seller === sellerId),
    [allProducts, sellerId]
  );

  // Derive store name from any product's seller info
  const firstProduct = allProducts.find((p) => p.seller?._id === sellerId);
  const seller = firstProduct?.seller;
  const storeName = seller?.sellerInfo?.businessName
    || `${seller?.firstName || ''} ${seller?.lastName || ''}`.trim()
    || 'Mağaza';

  const wishlistQuery = useWishlist(!!token && isBuyer);

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
          to="/stores"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-forest hover:underline dark:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />Bütün mağazalar
        </Link>
      </div>

      <SectionTitle
        eyebrow="Mağaza"
        title={storeName}
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
          title="Bu mağazada məhsul tapılmadı"
          description="Hazırda bu satıcının aktiv məhsulu yoxdur."
          action={
            <Link to="/stores" className="btn-secondary">
              Mağazalara qayıt
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
