import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Star, Store } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { EmptyState, LoadingGrid, SectionTitle } from '../components/Ui';

// Extract unique verified sellers from a product list response.
function extractStores(products) {
  const seen = new Set();
  const stores = [];
  for (const p of products) {
    const s = p.seller;
    if (!s?._id || seen.has(s._id)) continue;
    seen.add(s._id);
    stores.push({
      _id: s._id,
      name: s.sellerInfo?.businessName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Mağaza',
      rating: s.sellerInfo?.rating || 0,
      saleType: s.sellerInfo?.saleType,
    });
  }
  return stores;
}

export default function StoresPage() {
  // Fetch a broad product sample to extract unique sellers.
  // The public /products endpoint doesn't expose a separate seller-list route,
  // so we derive sellers from products. Limit is generous to capture variety.
  const productsQuery = useQuery({
    queryKey: ['products-for-stores'],
    queryFn: () => api.getProducts({ status: 'active', limit: 100, sort: 'newest' }),
    select: (data) => data.products || [],
  });

  const stores = useMemo(() => extractStores(productsQuery.data || []), [productsQuery.data]);

  return (
    <div className="section-shell py-10">
      <SectionTitle
        title="Mağazalar"
        description="Platforma üzərindəki yerli məhsul satıcılarını kəşf edin."
        action={
          !productsQuery.isLoading ? (
            <div className="chip dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {stores.length} mağaza
            </div>
          ) : null
        }
      />

      {productsQuery.isLoading ? (
        <LoadingGrid />
      ) : stores.length === 0 ? (
        <EmptyState icon={Store} title="Mağaza tapılmadı" description="Hal-hazırda aktiv satıcı yoxdur." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stores.map((store) => (
            <Link
              key={store._id}
              to={`/stores/${store._id}`}
              className="group flex items-center gap-4 rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-forest transition group-hover:bg-forest group-hover:text-white dark:bg-emerald-500/15 dark:text-emerald-300 dark:group-hover:bg-emerald-600 dark:group-hover:text-white">
                <Store className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink dark:text-white">{store.name}</div>
                {store.rating > 0 ? (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-500">
                    <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
                    {store.rating.toFixed(1)}
                  </div>
                ) : (
                  <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Yeni mağaza</div>
                )}
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-forest dark:text-slate-600 dark:group-hover:text-emerald-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
