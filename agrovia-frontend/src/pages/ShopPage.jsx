import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, SlidersHorizontal, ShoppingBag, Heart, ArrowRight } from 'lucide-react';
import { useCategories, useProducts, useRegions } from '../hooks/useAgroviaData';
import { api } from '../api/agroviaApi';
import { EmptyState, LoadingGrid, ProductCard, SectionTitle } from '../components/Ui';

export default function ShopPage() {
  const [filters, setFilters] = useState({ search: '', category: '', region: '', sort: 'newest', status: 'active' });
  const queryClient = useQueryClient();

  const productsQuery = useProducts(filters);
  const categories = useCategories().data || [];
  const regions = useRegions().data || [];
  const products = productsQuery.data || [];

  const addToCartMutation = useMutation({
    mutationFn: api.addToCart,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] })
  });

  const addToWishlistMutation = useMutation({
    mutationFn: api.addToWishlist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] })
  });

  const visibleCount = useMemo(() => products.length, [products.length]);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <section className="section-shell py-10">
      <SectionTitle
        eyebrow="Mağaza"
        title="Dinamik məhsul bazarı"
        description="Search, kateqoriya, region və sort backend query parametrləri ilə işləyir."
        action={<div className="chip">{visibleCount} məhsul göstərilir</div>}
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

        <div className="space-y-6">
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
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onView={() => window.location.assign(`/products/${product._id}`)}
                  onAddToCart={() => addToCartMutation.mutate({ productId: product._id, quantity: product.minOrderQuantity || 1 })}
                  onAddToWishlist={() => addToWishlistMutation.mutate({ productId: product._id })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}