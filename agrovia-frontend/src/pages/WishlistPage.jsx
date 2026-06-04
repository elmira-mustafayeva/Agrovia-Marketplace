import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Shuffle, ShoppingBag, Trash2 } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { useWishlist } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, SectionTitle, formatPrice } from '../components/Ui';

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const wishlistQuery = useWishlist();
  const wishlist = wishlistQuery.data;
  const items = wishlist?.items || [];

  const removeMutation = useMutation({ mutationFn: api.removeFromWishlist, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }) });
  const moveMutation = useMutation({ mutationFn: api.moveWishlistToCart, onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  } });

  return (
    <section className="section-shell py-10">
      <SectionTitle eyebrow="Wishlist" title="Seçilmiş məhsullar" description="Wishlist data-si serverdən gəlir və alış üçün səbətə köçürülə bilər." />

      {wishlistQuery.isLoading ? (
        <LoadingGrid rows={2} />
      ) : items.length === 0 ? (
        <EmptyState icon={Heart} title="Wishlist boşdur" description="Bəyəndiyin məhsulları burada toplaya bilərsən." action={<Link to="/shop" className="btn-primary">Məhsullar bax</Link>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item._id} className="panel flex gap-4">
                <img src={item.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80'} alt={item.product?.name} className="h-28 w-28 rounded-2xl object-cover" />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-ink">{item.product?.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{formatPrice(item.product?.price)} • {item.product?.unit}</div>
                    </div>
                    <button type="button" onClick={() => removeMutation.mutate(item.product?._id)} className="rounded-full p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" className="btn-primary" onClick={() => moveMutation.mutate({ productId: item.product?._id })}><ShoppingBag className="h-4 w-4" />Səbətə köçür</button>
                    <Link to={`/products/${item.product?._id}`} className="btn-secondary"><Shuffle className="h-4 w-4" />Detala bax</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="panel h-fit space-y-4">
            <div className="text-sm font-semibold text-slate-500">Wishlist summary</div>
            <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">Məhsulların statusunu izləmək və stok aktiv olduqda sürətli almaq üçün ideal sahədir.</div>
          </div>
        </div>
      )}
    </section>
  );
}