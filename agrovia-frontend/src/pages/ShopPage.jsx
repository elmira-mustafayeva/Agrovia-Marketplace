import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, SlidersHorizontal, ShoppingBag, Heart, ArrowRight } from 'lucide-react';
import { useCategories, useProducts, useRegions, useWishlist } from '../hooks/useAgroviaData';
import { api } from '../api/agroviaApi';
import { EmptyState, LoadingGrid, ProductCard, SectionTitle } from '../components/Ui';

export default function ShopPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user } = useSelector((state) => state.auth);
  const [filters, setFilters] = useState({ search: '', category: '', region: '', sort: 'newest', status: 'active' });
  const [roleWarning, setRoleWarning] = useState(false);
  const [shopToast, setShopToast] = useState({ message: '', type: '' });
  const [visibleLimit, setVisibleLimit] = useState(12);

  const showToast = (message, type = 'success') => {
    setShopToast({ message, type });
    setTimeout(() => setShopToast({ message: '', type: '' }), 3000);
  };

  const isBuyer = user?.role === 'buyer';
  const wishlistQuery = useWishlist(!!token && isBuyer);

  const productsQuery = useProducts(filters);
  const categories = useCategories().data || [];
  const regions = useRegions().data || [];
  const products = productsQuery.data || [];

  const addToCartMutation = useMutation({
    mutationFn: api.addToCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      showToast('Məhsul səbətə əlavə edildi.');
    },
    onError: (err) => {
      const type = err.response?.status === 409 ? 'info' : 'error';
      showToast(err.response?.data?.message || 'Səbətə əlavə edilmədi.', type);
    }
  });

  const addToWishlistMutation = useMutation({
    mutationFn: api.addToWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      showToast('Məhsul wishlist-ə əlavə edildi.');
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Wishlist-ə əlavə edilmədi.', 'error');
    }
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: api.removeFromWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      showToast('Məhsul wishlist-dən silindi.');
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Wishlist-dən silinmədi.', 'error');
    }
  });

  const handleAddToCart = (product) => {
    if (!token || !user) { navigate('/auth'); return; }
    if (user.role !== 'buyer') { setRoleWarning(true); return; }
    addToCartMutation.mutate({ productId: product._id, quantity: product.minOrderQuantity || 1 });
  };

  const handleWishlistToggle = (product) => {
    if (!token || !user) { navigate('/auth'); return; }
    if (user.role !== 'buyer') { setRoleWarning(true); return; }
    const alreadyIn = wishlistQuery.data?.items?.some((item) => item.product?._id === product._id);
    if (alreadyIn) {
      removeFromWishlistMutation.mutate(product._id);
    } else {
      addToWishlistMutation.mutate({ productId: product._id });
    }
  };

  const visibleProducts = useMemo(() => products.slice(0, visibleLimit), [products, visibleLimit]);
  const hasMore = products.length > visibleLimit;

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setVisibleLimit(12);
  };

  return (
    <>
      {/* Fixed-bottom toast */}
      {shopToast.message ? (
        <div className={`fixed bottom-16 left-1/2 z-[9999] -translate-x-1/2 rounded-2xl border px-6 py-3 text-sm font-medium shadow-soft ${shopToast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : shopToast.type === 'info' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {shopToast.message}
        </div>
      ) : null}
      <section className="section-shell py-10">
      <SectionTitle
        eyebrow="Mağaza"
        title="Dinamik məhsul bazarı"
        description="Search, kateqoriya, region və sort backend query parametrləri ilə işləyir."
        action={<div className="chip">{products.length} məhsul tapıldı</div>}
      />

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="panel space-y-5 h-fit">
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">Axtarış</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input-shell pl-11" placeholder="Məsələn: alma, pomidor..." value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">Kateqoriya</label>
            <select className="input-shell" value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
              <option value="">Hamısı</option>
              {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">Region</label>
            <select className="input-shell" value={filters.region} onChange={(event) => updateFilter('region', event.target.value)}>
              <option value="">Hamısı</option>
              {regions.map((region) => <option key={region._id} value={region._id}>{region.name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">Sıralama</label>
            <select className="input-shell" value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}>
              <option value="newest">Ən yeni</option>
              <option value="price_asc">Qiymət: ucuzdan bahaya</option>
              <option value="price_desc">Qiymət: bahadan ucuza</option>
              <option value="popular">Ən çox satılan</option>
            </select>
          </div>

          <div className="rounded-3xl bg-ink p-5 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4 text-sun" />Filter summary</div>
            <p className="mt-3 text-sm leading-6 text-white/70">Bu panel `GET /api/products` sorğusunun query parametrlərini birbaşa dəyişir.</p>
          </div>
        </aside>

        <div className="space-y-4">
          {roleWarning ? (
            <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span>Səbətə / wishlist-ə əlavə etmək yalnız alıcı hesabları üçün mümkündür.</span>
              <button type="button" className="ml-4 underline" onClick={() => setRoleWarning(false)}>Bağla</button>
            </div>
          ) : null}
          {productsQuery.isLoading ? (
            <LoadingGrid />
          ) : products.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Məhsul tapılmadı"
              description="Filter kriteriyalarına uyğun aktiv məhsul yoxdur. Filterləri dəyişməyə çalış."
              action={<Link className="btn-primary" to="/delivery">Çatdırılma hesabla <ArrowRight className="h-4 w-4" /></Link>}
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-100">
              <div className="grid gap-5 bg-transparent p-1 sm:grid-cols-2 2xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onView={() => window.location.assign(`/products/${product._id}`)}
                    onAddToCart={() => handleAddToCart(product)}
                    isInWishlist={wishlistQuery.data?.items?.some((item) => item.product?._id === product._id) ?? false}
                    onWishlistToggle={() => handleWishlistToggle(product)}
                  />
                ))}
              </div>
              {hasMore ? (
                <div className="flex items-center justify-between border-t border-slate-100 bg-white/60 px-5 py-4">
                  <span className="text-xs text-slate-400">{visibleLimit} / {products.length} məhsul göstərilir</span>
                  <button
                    type="button"
                    className="btn-secondary py-2 text-xs"
                    onClick={() => setVisibleLimit((prev) => prev + 12)}
                  >
                    Daha çox göstər
                  </button>
                </div>
              ) : (
                <div className="border-t border-slate-100 bg-white/60 px-5 py-3 text-center text-xs text-slate-400">
                  Bütün {products.length} məhsul göstərildi
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
    </>
  );
}