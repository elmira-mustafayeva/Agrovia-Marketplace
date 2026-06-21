import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Leaf, MapPin, Percent, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../api/agroviaApi';
import { useCategories, useProducts, useRegions, useWishlist } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, MiniInfo, ProductCard, SectionTitle } from '../components/Ui';
import VideoHero from '../components/VideoHero';

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
  const productsQuery = useProducts({ limit: 16, sort: 'newest', status: 'active' });

  const categories = categoriesQuery.data || [];
  const regions = regionsQuery.data || [];
  const allProducts = productsQuery.data || [];

  const featuredProducts = useMemo(() => allProducts.slice(0, 8), [allProducts]);
  const discountedProducts = useMemo(
    () => allProducts.filter((p) => (p?.discount?.percentage || 0) > 0).slice(0, 6),
    [allProducts]
  );

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
    { label: 'Aktiv məhsullar', value: allProducts.length || 0 }
  ], [categories.length, regions.length, allProducts.length]);

  const isInWishlist = (product) =>
    wishlistQuery.data?.items?.some((item) => item.product?._id === product._id) ?? false;

  return (
    <>
      <Toast toast={homeToast} />

      {/* Hero */}
      <VideoHero>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="chip mb-5 border-white/25 bg-white/10 text-white">Agrovia Marketplace</div>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            Azərbaycanın yerli məhsulları<br className="hidden sm:block" /> bir platformada.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
            Artıq bir kliklə təbii və təzə məhsullar birbaşa süfrənizdə olacaq!
          </p>
          <div className="mt-8">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-4 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              Alış-verişə başla <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          {highlights.some((h) => h.value > 0) ? (
            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <MiniInfo key={item.label} label={item.label} value={item.value} icon={Sparkles} />
              ))}
            </div>
          ) : null}
        </motion.div>
      </VideoHero>

      {/* Role warning banner */}
      {roleWarning ? (
        <div className="section-shell pt-5">
          <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <span>Səbətə / wishlist-ə əlavə etmək yalnız alıcı hesabları üçün mümkündür.</span>
            <button type="button" className="ml-4 underline" onClick={() => setRoleWarning(false)}>Bağla</button>
          </div>
        </div>
      ) : null}

      {/* Categories */}
      <section className="section-shell py-14">
        <SectionTitle
          eyebrow="Kateqoriyalar"
          title="Kateqoriya üzrə alış-veriş"
          action={<Link to="/shop" className="btn-secondary">Hamısına bax</Link>}
        />
        {categoriesQuery.isLoading ? (
          <LoadingGrid rows={4} />
        ) : categories.length === 0 ? (
          <EmptyState title="Kateqoriya tapılmadı" description="Backend-dən kateqoriya gəlmədikdə bu sahə boş görünür." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category._id}
                to={`/shop?category=${category._id}`}
                className="group flex items-center gap-4 rounded-[20px] border border-[#E7EDEA] bg-white p-4 shadow-card transition hover:-translate-y-1 hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-forest dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Leaf className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink dark:text-white">{category.name}</div>
                  <div className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                    {category.description || 'Aktiv kateqoriya'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured products */}
      <section className="section-shell py-14">
        <SectionTitle
          eyebrow="Seçilmiş məhsullar"
          title="Ən son məhsullar"
          action={
            <Link to="/shop" className="btn-primary">
              Bütün məhsullar <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        {productsQuery.isLoading ? (
          <LoadingGrid />
        ) : featuredProducts.length === 0 ? (
          <EmptyState title="Məhsul tapılmadı" description="Filterlərə uyğun aktiv məhsul yoxdur." />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onView={() => navigate(`/products/${product._id}`)}
                  onAddToCart={() => handleAddToCart(product)}
                  isInWishlist={isInWishlist(product)}
                  onWishlistToggle={() => handleWishlistToggle(product)}
                />
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Link to="/shop" className="btn-secondary">
                Daha çox göstər <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* Discounted products */}
      {discountedProducts.length > 0 ? (
        <section className="section-shell py-14">
          <SectionTitle
            eyebrow="Endirimli məhsullar"
            title="Qiymət endirimlərini əldən vermə"
            action={
              <Link to="/shop" className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20">
                <Percent className="h-4 w-4" />Hamısına bax
              </Link>
            }
          />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {discountedProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onView={() => navigate(`/products/${product._id}`)}
                onAddToCart={() => handleAddToCart(product)}
                isInWishlist={isInWishlist(product)}
                onWishlistToggle={() => handleWishlistToggle(product)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Regions */}
      <section className="section-shell py-14">
        <SectionTitle
          eyebrow="Regionlar"
          title="Region üzrə məhsul axını"
          description="Bakı, Gəncə, Lənkəran və digər regionlardan birbaşa satıcılar."
        />
        {regions.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {regions.slice(0, 8).map((region) => (
              <Link
                key={region._id}
                to={`/shop?region=${region._id}`}
                className="flex items-center gap-3 rounded-[14px] border border-[#E7EDEA] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-forest dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
              >
                <MapPin className="h-4 w-4 shrink-0 text-forest dark:text-emerald-400" />
                {region.name}
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
