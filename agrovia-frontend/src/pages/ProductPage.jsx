import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Heart, Package, ShoppingBag, Star, Truck } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { useOrders, useProduct, useReviews } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, SectionTitle, formatDate, formatPrice, getProductImage } from '../components/Ui';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [productToast, setProductToast] = useState({ message: '', type: '' });
  const [roleWarning, setRoleWarning] = useState(false);

  const showToast = (message, type = 'success') => {
    setProductToast({ message, type });
    setTimeout(() => setProductToast({ message: '', type: '' }), 3000);
  };
  const queryClient = useQueryClient();
  const productQuery = useProduct(id);
  const reviewsQuery = useReviews(id);
  const ordersQuery = useOrders(!!user);
  const product = productQuery.data;
  const reviews = reviewsQuery.data?.reviews || [];

  const deliveredOrdersForProduct = (ordersQuery.data || []).filter(
    (order) =>
      order.status === 'delivered' &&
      order.items.some((item) => {
        const itemProductId = item.product?._id ?? item.product;
        return String(itemProductId) === id;
      })
  );
  const canReview = deliveredOrdersForProduct.length > 0;

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

  const handleAddToCart = () => {
    if (!token || !user) { navigate('/auth'); return; }
    if (user.role !== 'buyer') { setRoleWarning(true); return; }
    addToCartMutation.mutate({ productId: product._id, quantity: product.minOrderQuantity || 1 });
  };

  const handleAddToWishlist = () => {
    if (!token || !user) { navigate('/auth'); return; }
    if (user.role !== 'buyer') { setRoleWarning(true); return; }
    addToWishlistMutation.mutate({ productId: product._id });
  };

  const addReviewMutation = useMutation({
    mutationFn: api.addReview,
    onSuccess: () => {
      setReviewNote('');
      setReviewRating(5);
      setReviewError('');
      setReviewSuccess('Rəyiniz göndərildi.');
      queryClient.invalidateQueries({ queryKey: ['reviews', id] });
    },
    onError: (err) => {
      setReviewSuccess('');
      setReviewError(err.response?.data?.message || 'Rəy göndərilmədi');
    }
  });

  const submitReview = () => {
    setReviewError('');
    setReviewSuccess('');
    if (!reviewNote.trim()) {
      setReviewError('Rəy mətni boş ola bilməz');
      return;
    }
    const orderId = selectedOrderId || deliveredOrdersForProduct[0]?._id;
    addReviewMutation.mutate({
      orderId,
      productId: id,
      productRating: reviewRating,
      productReview: reviewNote.trim()
    });
  };

  if (productQuery.isLoading) {
    return <section className="section-shell py-10"><LoadingGrid rows={1} /></section>;
  }

  if (!product) {
    return (
      <section className="section-shell py-10">
        <EmptyState title="Məhsul tapılmadı" description="Bu ID üçün backend-dən məhsul gəlmədi." action={<Link to="/shop" className="btn-primary">Mağazaya qayıt</Link>} />
      </section>
    );
  }

  const image = getProductImage(product);
  const mainPrice = product.discount?.percentage > 0 ? product.discountedPrice || product.price : product.price;

  return (
    <>
      {/* Fixed-bottom toast */}
      {productToast.message ? (
        <div className={`fixed bottom-16 left-1/2 z-[9999] -translate-x-1/2 rounded-2xl border px-6 py-3 text-sm font-medium shadow-soft ${productToast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : productToast.type === 'info' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {productToast.message}
        </div>
      ) : null}
      <section className="section-shell py-10">
      <SectionTitle
        eyebrow="Məhsul detalı"
        title={product.name}
        description="Bu səhifə `GET /api/products/:id` və `GET /api/reviews/product/:productId` nəticələrinə əsaslanır."
      />

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-soft">
          <img src={image} alt={product.name} className="h-[420px] w-full object-cover" />
        </div>
        <div className="panel space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="chip">{product.category?.name || 'Kateqoriya'}</span>
            <span className="chip">{product.region?.name || 'Region'}</span>
            <span className="chip">{product.unit}</span>
          </div>
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Qiymət</div>
                <div className="mt-1 text-4xl font-semibold text-ink">{formatPrice(mainPrice)}</div>
              </div>
              {product.discount?.percentage > 0 ? <div className="rounded-2xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900">-{product.discount.percentage}% endirim</div> : null}
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{product.description}</p>
          </div>

          {roleWarning ? (
            <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span>Səbətə yalnız alıcı hesabı ilə əlavə etmək olar.</span>
              <button type="button" className="ml-4 underline" onClick={() => setRoleWarning(false)}>Bağla</button>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" className="btn-primary" onClick={handleAddToCart} disabled={addToCartMutation.isPending}>
              <ShoppingBag className="h-4 w-4" />{addToCartMutation.isPending ? 'Əlavə edilir...' : 'Səbətə at'}
            </button>
            <button type="button" className="btn-secondary" onClick={handleAddToWishlist} disabled={addToWishlistMutation.isPending}>
              <Heart className="h-4 w-4" />{addToWishlistMutation.isPending ? 'Əlavə edilir...' : 'Wishlist'}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Stok</div>
              <div className="mt-1 text-lg font-semibold text-ink">{product.stockQuantity}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Minimum sifariş</div>
              <div className="mt-1 text-lg font-semibold text-ink">{product.minOrderQuantity} {product.unit}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Satıcı</div>
              <div className="mt-1 text-lg font-semibold text-ink">{product.seller?.sellerInfo?.businessName || product.seller?.firstName}</div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-5 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold"><Truck className="h-4 w-4 text-sun" />Çatdırılma və rating</div>
            <p className="mt-2 text-sm leading-6 text-white/70">Sifariş verdikdən sonra rəy bölməsi aktivləşir. Aşağıda product review-lar da backend-dən gəlir.</p>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.7fr]">
        <div className="panel">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Star className="h-4 w-4 text-sun" />Rəylər</div>
          <div className="mt-5 space-y-4">
            {reviews.length === 0 ? (
              <EmptyState title="Rəy yoxdur" description="Bu məhsul üçün hələ rəy yazılmayıb." />
            ) : reviews.map((review) => (
              <div key={review._id} className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-semibold text-ink">{review.user?.firstName} {review.user?.lastName}</div>
                  <div className="text-sm font-semibold text-forest">{review.productRating}/5</div>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{review.productReview}</p>
                <div className="mt-3 text-xs text-slate-400">{formatDate(review.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Package className="h-4 w-4 text-forest" />Rəy yaz</div>
          {!user ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Rəy yazmaq üçün <Link to="/auth" className="font-semibold text-forest underline">daxil olun</Link>.
            </div>
          ) : !canReview ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
              Rəy yazmaq üçün bu məhsulu sifariş edib təhvil almalısınız.
            </div>
          ) : (
            <>
              {deliveredOrdersForProduct.length > 1 ? (
                <select
                  className="input-shell"
                  value={selectedOrderId || deliveredOrdersForProduct[0]._id}
                  onChange={(event) => setSelectedOrderId(event.target.value)}
                  disabled={addReviewMutation.isPending}
                >
                  {deliveredOrdersForProduct.map((order) => (
                    <option key={order._id} value={order._id}>
                      Sifariş #{order.orderNumber || order._id.slice(-6)}
                    </option>
                  ))}
                </select>
              ) : null}
              <select
                className="input-shell"
                value={reviewRating}
                onChange={(event) => setReviewRating(Number(event.target.value))}
                disabled={addReviewMutation.isPending}
              >
                <option value={5}>⭐⭐⭐⭐⭐ — 5/5</option>
                <option value={4}>⭐⭐⭐⭐ — 4/5</option>
                <option value={3}>⭐⭐⭐ — 3/5</option>
                <option value={2}>⭐⭐ — 2/5</option>
                <option value={1}>⭐ — 1/5</option>
              </select>
              <textarea
                className="input-shell min-h-40"
                placeholder="Məhsul haqqında rəyinizi yazın..."
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                disabled={addReviewMutation.isPending}
              />
              {reviewError ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{reviewError}</div> : null}
              {reviewSuccess ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{reviewSuccess}</div> : null}
              <button
                type="button"
                className="btn-primary w-full"
                onClick={submitReview}
                disabled={addReviewMutation.isPending}
              >
                {addReviewMutation.isPending ? 'Göndərilir...' : 'Rəyi göndər'}
              </button>
            </>
          )}
          <p className="text-xs leading-6 text-slate-500">Rəy yalnız çatdırılmış sifariş üçün qəbul edilir.</p>
        </div>
      </div>
    </section>
    </>
  );
}
