import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Percent, Search, ShoppingBag } from 'lucide-react';
import { useCategories, useProducts, useRegions, useWishlist } from '../hooks/useAgroviaData';
import { api } from '../api/agroviaApi';
import { EmptyState, LoadingGrid, ProductCard, SectionTitle } from '../components/Ui';

const Toast = ({ toast }) =>
  toast.message ? (
    <div
      className={`fixed bottom-16 left-1/2 z-[9999] -translate-x-1/2 rounded-2xl border px-6 py-3 text-sm font-medium shadow-soft ${
        toast.type === 'error'
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300'
          : toast.type === 'info'
            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      }`}
    >
      {toast.message}
    </div>
  ) : null;

export default function ShopPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user } = useSelector((state) => state.auth);

  // Read initial values from URL search params (links from nav search, category cards, region cards)
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    region: searchParams.get('region') || '',
    sort: 'newest',
    status: 'active'
  });
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
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
  const allProducts = productsQuery.data || [];

  // Client-side "Endirimli" filter — applied on top of server-side filters
  const filteredProducts = useMemo(() => {
    if (!onlyDiscounted) return allProducts;
    return allProducts.filter((p) => (p?.discount?.percentage || 0) > 0);
  }, [allProducts, onlyDiscounted]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleLimit), [filteredProducts, visibleLimit]);
  const hasMore = filteredProducts.length > visibleLimit;

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

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setVisibleLimit(12);
  };

  // Search drives both the query (local state) and the URL, so it stays shareable and
  // survives refresh. Empty value removes the param entirely.
  const updateSearch = (value) => {
    updateFilter('search', value);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value.trim()) next.set('search', value);
      else next.delete('search');
      return next;
    }, { replace: true });
  };

  const toggleDiscount = () => {
    setOnlyDiscounted((prev) => !prev);
    setVisibleLimit(12);
  };

  return (
    <>
      <Toast toast={shopToast} />

      <section className="section-shell py-10">
        <SectionTitle
          action={
            <div className="chip dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {filteredProducts.length} məhsul tapıldı
            </div>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
          {/* Filter sidebar */}
          <aside className="h-fit space-y-4 rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
            {/* Search */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink dark:text-white">Axtarış</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="input-shell pl-10"
                  placeholder="Məsələn: alma, pomidor..."
                  value={filters.search}
                  onChange={(e) => updateSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink dark:text-white">Kateqoriya</label>
              <select className="input-shell" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
                <option value="">Hamısı</option>
                {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
              </select>
            </div>

            {/* Region */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink dark:text-white">Region</label>
              <select className="input-shell" value={filters.region} onChange={(e) => updateFilter('region', e.target.value)}>
                <option value="">Hamısı</option>
                {regions.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink dark:text-white">Sıralama</label>
              <select className="input-shell" value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}>
                <option value="newest">Yeni</option>
                <option value="popular">Ən çox satılan</option>
                <option value="price_asc">Ucuzdan bahaya</option>
                <option value="price_desc">Bahadan ucuya</option>
              </select>
            </div>

            {/* Endirimli toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={toggleDiscount}
                className={`flex w-full items-center gap-2.5 rounded-[14px] border px-4 py-3 text-sm font-semibold transition ${
                  onlyDiscounted
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <Percent className={`h-4 w-4 ${onlyDiscounted ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`} />
                Endirimli məhsullar
                {onlyDiscounted ? (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">✓</span>
                ) : null}
              </button>
            </div>
          </aside>

          {/* Products grid */}
          <div className="space-y-4">
            {roleWarning ? (
              <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <span>Səbətə / wishlist-ə əlavə etmək yalnız alıcı hesabları üçün mümkündür.</span>
                <button type="button" className="ml-4 underline" onClick={() => setRoleWarning(false)}>Bağla</button>
              </div>
            ) : null}

            {productsQuery.isLoading ? (
              <LoadingGrid />
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title={
                  onlyDiscounted
                    ? 'Hazırda endirimli məhsul yoxdur.'
                    : filters.search.trim()
                      ? 'Axtarışa uyğun məhsul tapılmadı'
                      : 'Hazırda aktiv məhsul yoxdur.'
                }
              />
            ) : (
              <div className="overflow-hidden rounded-[20px] border border-[#E7EDEA] dark:border-slate-700">
                <div className="grid gap-5 bg-sand/40 p-3 sm:grid-cols-2 2xl:grid-cols-3 dark:bg-slate-950/50">
                  {visibleProducts.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      onView={() => navigate(`/products/${product._id}`)}
                      onAddToCart={() => handleAddToCart(product)}
                      isInWishlist={wishlistQuery.data?.items?.some((item) => item.product?._id === product._id) ?? false}
                      onWishlistToggle={() => handleWishlistToggle(product)}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 bg-white/80 px-5 py-3.5 dark:border-slate-700 dark:bg-slate-900/80">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {Math.min(visibleLimit, filteredProducts.length)} / {filteredProducts.length} məhsul
                  </span>
                  {hasMore ? (
                    <button
                      type="button"
                      className="btn-secondary py-2 text-xs"
                      onClick={() => setVisibleLimit((prev) => prev + 12)}
                    >
                      Daha çox göstər
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">Hamısı göstərildi</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
