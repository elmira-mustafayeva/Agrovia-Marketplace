import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Package, Truck, Shield, Sparkles, MapPin, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCategories, useProducts, useRegions } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, MiniInfo, ProductCard, SectionTitle, StatCard } from '../components/Ui';

const featureStats = [
  { label: 'Dinamik məhsullar', value: 'Realtime', helper: 'API-dən gələn data ilə', icon: Package },
  { label: 'Çatdırılma kalkulyatoru', value: 'Smart', helper: 'Məsafə və hava faktorları ilə', icon: Truck, accent: 'amber' },
  { label: 'Təhlükəsiz giriş', value: 'Token-based', helper: 'Qeydiyyat və rol yönləndirmə', icon: Shield }
];

export default function HomePage() {
  const categoriesQuery = useCategories();
  const regionsQuery = useRegions();
  const productsQuery = useProducts({ limit: 8, sort: 'newest', status: 'active' });

  const categories = categoriesQuery.data || [];
  const regions = regionsQuery.data || [];
  const products = productsQuery.data || [];

  const highlights = useMemo(() => [
    { label: 'Kateqoriyalar', value: categories.length || 0 },
    { label: 'Regionlar', value: regions.length || 0 },
    { label: 'Aktiv məhsullar', value: products.length || 0 }
  ], [categories.length, regions.length, products.length]);

  return (
    <>
      <section className="bg-hero-radial text-white">
        <div className="section-shell grid gap-10 py-16 lg:grid-cols-[1.25fr_0.95fr] lg:py-24">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="chip border-white/20 bg-white/10 text-white">Agrovia Marketplace</div>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Fermerdən alıcıya qədər vahid, dinamik aqrar bazar.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              Məhsulları canlı API-dən çəkən, səbət, wishlist, sifariş, qiymət hesablama və rol əsaslı panelləri olan frontend.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary bg-white text-forest hover:bg-sand">
                Mağazaya keç <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/delivery" className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/15">
                Çatdırılma hesabla
              </Link>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <MiniInfo key={item.label} label={item.label} value={item.value} icon={Sparkles} />
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="glass-card rounded-[32px] p-6 text-slate-900 shadow-soft">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] bg-slate-950 p-5 text-white shadow-soft sm:col-span-2">
                <div className="flex items-center gap-3 text-sm text-white/70"><Star className="h-4 w-4 text-sun" />Live storefront</div>
                <div className="mt-3 text-2xl font-semibold">Məhsul və regionlar backend-dən gəlir.</div>
                <p className="mt-2 text-sm leading-6 text-white/72">Hər kart və səhifə API nəticəsi ilə yenilənir.</p>
              </div>
              {featureStats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-shell py-14">
        <SectionTitle
          eyebrow="Kateqoriyalar"
          title="Təsnifatlı alış axını"
          description="Kateqoriyalar backend-dən gəlir; UI bu məlumatı kart formatında göstərir."
          action={<Link to="/shop" className="btn-secondary">Hamısına bax</Link>}
        />
        {categoriesQuery.isLoading ? (
          <LoadingGrid rows={3} />
        ) : categories.length === 0 ? (
          <EmptyState title="Kateqoriya tapılmadı" description="Backend-dən kateqoriya gəlmədiyi üçün bu sahə boş görünür." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
              <div key={category._id} className="panel group flex items-center gap-4 transition hover:-translate-y-1">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-forest">
                  <Leaf className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-semibold text-ink">{category.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{category.description || 'Aktiv kateqoriya'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section-shell py-14">
        <SectionTitle
          eyebrow="Seçilmiş məhsullar"
          title="API-dən gələn son məhsullar"
          description="Bu grid `/api/products` nəticəsinə görə dinamik şəkildə qurulur."
          action={<Link to="/shop" className="btn-primary">Bütün məhsullar <ArrowRight className="h-4 w-4" /></Link>}
        />
        {productsQuery.isLoading ? (
          <LoadingGrid />
        ) : products.length === 0 ? (
          <EmptyState title="Məhsul tapılmadı" description="Filterlərə uyğun aktiv məhsul yoxdur." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onView={() => { window.location.href = `/products/${product._id}`; }}
                onAddToCart={() => { window.location.href = '/auth'; }}
                onAddToWishlist={() => { window.location.href = '/auth'; }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="section-shell py-14">
        <div className="panel grid gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div>
            <div className="chip">Region məlumatları</div>
            <h3 className="mt-4 text-3xl font-semibold text-ink">Regionlara uyğun məhsul axını</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Backend-dəki region endpoint-ləri ilə məhsulları şəhər/rayon üzrə süzgəcdən keçirmək mümkündür.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {regions.slice(0, 4).map((region) => (
              <div key={region._id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-forest" />{region.name}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}