import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Leaf, Package, Truck, Shield, Sparkles, MapPin, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../api/agroviaApi';
import { useCategories, useProducts, useRegions, useWishlist } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, MiniInfo, ProductCard, SectionTitle, StatCard } from '../components/Ui';

const featureStats = [
  { label: 'Dinamik məhsullar', value: 'Realtime', helper: 'API-dən gələn data ilə', icon: Package },
  { label: 'Çatdırılma kalkulyatoru', value: 'Smart', helper: 'Məsafə və hava faktorları ilə', icon: Truck, accent: 'amber' },
  { label: 'Təhlükəsiz giriş', value: 'Token-based', helper: 'Qeydiyyat və rol yönləndirmə', icon: Shield }
];

export default function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user } = useSelector((state) => state.auth);
  const [roleWarning, setRoleWarning] = useState(false);
  const [homeToast, setHomeToast] = useState({ message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setHomeToast({ message, type });
    setTimeout(() => setHomeToast({ message: '', type: '' }), 3000);
  };

  const isBuyer = user?.role === 'buyer';
  const wishlistQuery = useWishlist(!!token && isBuyer);

  const categoriesQuery = useCategories();
  const regionsQuery = useRegions();
  const productsQuery = useProducts({ limit: 8, sort: 'newest', status: 'active' });

  const categories = categoriesQuery.data || [];
  const regions = regionsQuery.data || [];
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

  const highlights = useMemo(() => [
    { label: 'Kateqoriyalar', value: categories.length || 0 },
    { label: 'Regionlar', value: regions.length || 0 },
    { label: 'Aktiv məhsullar', value: products.length || 0 }
  ], [categories.length, regions.length, products.length]);

  return (
    <>
      {/* Fixed-bottom toast — visible even when scrolled past the banner position */}
      {homeToast.message ? (
        <div className={`fixed bottom-16 left-1/2 z-[9999] -translate-x-1/2 rounded-2xl border px-6 py-3 text-sm font-medium shadow-soft ${homeToast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : homeToast.type === 'info' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {homeToast.message}
        </div>
      ) : null}

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
        {roleWarning ? (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>Səbətə / wishlist-ə əlavə etmək yalnız alıcı hesabları üçün mümkündür.</span>
            <button type="button" className="ml-4 underline" onClick={() => setRoleWarning(false)}>Bağla</button>
          </div>
        ) : null}
        {productsQuery.isLoading ? (
          <LoadingGrid />
        ) : products.length === 0 ? (
          <EmptyState title="Məhsul tapılmadı" description="Filterlərə uyğun aktiv məhsul yoxdur." />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-100">
            <div className="grid gap-5 bg-transparent p-1 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onView={() => { window.location.href = `/products/${product._id}`; }}
                  onAddToCart={() => handleAddToCart(product)}
                  isInWishlist={wishlistQuery.data?.items?.some((item) => item.product?._id === product._id) ?? false}
                  onWishlistToggle={() => handleWishlistToggle(product)}
                />
              ))}
            </div>
            <div className="flex items-center justify-center border-t border-slate-100 bg-white/60 px-4 py-4">
              <Link to="/shop" className="btn-primary">
                Daha çox göstər <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
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