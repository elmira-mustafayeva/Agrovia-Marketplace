import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Shuffle, ShoppingBag, Trash2 } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { useWishlist } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, SectionTitle, formatPrice, UNIT_LABELS, getDiscountedPrice, hasDiscount } from '../components/Ui';

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const wishlistQuery = useWishlist();
  const wishlist = wishlistQuery.data;
  const items = wishlist?.items || [];

  // { productId, productName } — set when trash is clicked
  const [confirmRemovePending, setConfirmRemovePending] = useState(null);
  // Fixed-bottom toast: { message, type }
  const [toast, setToast] = useState({ message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const removeMutation = useMutation({
    mutationFn: api.removeFromWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      setConfirmRemovePending(null);
      showToast('Məhsul wishlist-dən silindi.');
    },
    onError: (err) => {
      setConfirmRemovePending(null);
      showToast(err.response?.data?.message || 'Silinərkən xəta baş verdi.', 'error');
    }
  });

  const moveMutation = useMutation({
    mutationFn: api.moveWishlistToCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      showToast('Məhsul səbətə köçürüldü.');
    },
    onError: (err) => {
      const type = err.response?.status === 409 ? 'info' : 'error';
      showToast(err.response?.data?.message || 'Səbətə köçürülərkən xəta baş verdi.', type);
    }
  });

  const handleRemoveClick = (item) => {
    setConfirmRemovePending({
      productId: item.product?._id,
      productName: item.product?.name || 'məhsul'
    });
  };

  return (
    <>
      {/* Fixed-bottom toast */}
      {toast.message ? (
        <div className={`fixed bottom-16 left-1/2 z-[9999] -translate-x-1/2 rounded-2xl border px-6 py-3 text-sm font-medium shadow-soft ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : toast.type === 'info' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {toast.message}
        </div>
      ) : null}

      {/* Remove confirmation modal */}
      {confirmRemovePending ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmRemovePending(null); }}
        >
          <div className="mx-4 w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="text-base font-semibold text-ink">Bu məhsulu sil?</div>
            <p className="text-sm text-slate-600">
              <strong>{confirmRemovePending.productName}</strong> məhsulunu wishlist-dən silmək istədiyinizə əminsiniz?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmRemovePending(null)}
                disabled={removeMutation.isPending}
              >
                Ləğv et
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                onClick={() => removeMutation.mutate(confirmRemovePending.productId)}
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending ? 'Silinir...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="section-shell py-10">
        <SectionTitle
          eyebrow="Wishlist"
          title="Seçilmiş məhsullar"
          description="Wishlist data-si serverdən gəlir və alış üçün səbətə köçürülə bilər."
        />

        {wishlistQuery.isLoading ? (
          <LoadingGrid rows={2} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Wishlist boşdur"
            description="Bəyəndiyin məhsulları burada toplaya bilərsən."
            action={<Link to="/shop" className="btn-primary">Məhsullar bax</Link>}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item._id} className="panel flex gap-4">
                  <img
                    src={item.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80'}
                    alt={item.product?.name}
                    className="h-28 w-28 rounded-2xl object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-ink">{item.product?.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-forest">{formatPrice(getDiscountedPrice(item.product))}</span>
                          <span className="text-slate-500">/ {UNIT_LABELS[item.product?.unit] || item.product?.unit}</span>
                          {hasDiscount(item.product) ? (
                            <span className="text-xs text-slate-400 line-through">{formatPrice(item.product?.price)}</span>
                          ) : null}
                        </div>
                        {item.product?.minOrderQuantity > 1 ? (
                          <div className="mt-0.5 text-xs text-slate-500">
                            Minimum sifariş: {item.product.minOrderQuantity} {UNIT_LABELS[item.product?.unit] || item.product?.unit}
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveClick(item)}
                        disabled={moveMutation.isPending}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                        title="Wishlist-dən sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => moveMutation.mutate({ productId: item.product?._id })}
                        disabled={moveMutation.isPending || removeMutation.isPending}
                      >
                        <ShoppingBag className="h-4 w-4" />
                        {moveMutation.isPending ? 'Əlavə edilir...' : 'Səbətə əlavə et'}
                      </button>
                      <Link to={`/products/${item.product?._id}`} className="btn-secondary">
                        <Shuffle className="h-4 w-4" />Detala bax
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="panel h-fit space-y-4">
              <div className="text-sm font-semibold text-slate-500">Wishlist xülasəsi</div>
              <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Məhsulların statusunu izləmək və stok aktiv olduqda sürətli almaq üçün ideal sahədir.
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 text-center">
                <div className="text-2xl font-semibold text-ink">{items.length}</div>
                <div className="mt-1 text-xs text-slate-500">wishlist-dəki məhsul</div>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
