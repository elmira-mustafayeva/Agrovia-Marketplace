import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Package, ShoppingBag, Star, Truck } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { useProduct, useReviews } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, SectionTitle, formatDate, formatPrice, getProductImage } from '../components/Ui';

export default function ProductPage() {
  const { id } = useParams();
  const [reviewNote, setReviewNote] = useState('');
  const queryClient = useQueryClient();
  const productQuery = useProduct(id);
  const reviewsQuery = useReviews(id);
  const product = productQuery.data;
  const reviews = reviewsQuery.data?.reviews || [];

  const addToCartMutation = useMutation({ mutationFn: api.addToCart, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }) });
  const addToWishlistMutation = useMutation({ mutationFn: api.addToWishlist, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }) });

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

          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" className="btn-primary" onClick={() => addToCartMutation.mutate({ productId: product._id, quantity: product.minOrderQuantity || 1 })}>
              <ShoppingBag className="h-4 w-4" />Səbətə at
            </button>
            <button type="button" className="btn-secondary" onClick={() => addToWishlistMutation.mutate({ productId: product._id })}>
              <Heart className="h-4 w-4" />Wishlist
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
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Package className="h-4 w-4 text-forest" />Sürətli rəy formu</div>
          <textarea className="input-shell min-h-40" placeholder="Rəy yazmaq üçün giriş tələb olunur" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
          <button type="button" className="btn-primary w-full" onClick={() => setReviewNote('')}>Rəyi göndər</button>
          <p className="text-xs leading-6 text-slate-500">Bu demo formu backend-dəki `POST /api/reviews` strukturuna uyğun UI göstərir.</p>
        </div>
      </div>
    </section>
  );
}