import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { useCart } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, SectionTitle, formatPrice } from '../components/Ui';

export default function CartPage() {
  const queryClient = useQueryClient();
  const cartQuery = useCart();
  const cart = cartQuery.data;

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }) => api.updateCartItem(itemId, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] })
  });
  const removeMutation = useMutation({ mutationFn: api.removeFromCart, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }) });
  const clearMutation = useMutation({ mutationFn: api.clearCart, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }) });

  const items = cart?.items || [];
  const total = items.reduce((sum, item) => sum + (item.price || item.product?.price || 0) * item.quantity, 0);

  return (
    <section className="section-shell py-10">
      <SectionTitle eyebrow="Səbət" title="Səbətə əlavə olunmuş məhsullar" description="Bu səhifə protected API-yə qoşulur və cart state-ni yeniləyir." action={<button type="button" className="btn-secondary" onClick={() => clearMutation.mutate()}>Səbəti boşalt</button>} />

      {cartQuery.isLoading ? (
        <LoadingGrid rows={2} />
      ) : items.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Səbət boşdur" description="Məhsul əlavə edib burada miqdarını dəyişə bilərsən." action={<Link className="btn-primary" to="/shop">Alış-verişə başla</Link>} />
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
                      <div className="mt-1 text-sm text-slate-500">{formatPrice(item.price || item.product?.price)} × {item.quantity}</div>
                    </div>
                    <button type="button" onClick={() => removeMutation.mutate(item._id)} className="rounded-full p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button type="button" className="rounded-full border border-slate-200 p-2" onClick={() => updateMutation.mutate({ itemId: item._id, quantity: Math.max(1, item.quantity - 1) })}><Minus className="h-4 w-4" /></button>
                    <span className="min-w-10 text-center text-sm font-semibold">{item.quantity}</span>
                    <button type="button" className="rounded-full border border-slate-200 p-2" onClick={() => updateMutation.mutate({ itemId: item._id, quantity: item.quantity + 1 })}><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="panel h-fit space-y-4">
            <div className="text-sm font-semibold text-slate-500">Sifariş xülasəsi</div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <div className="flex items-center justify-between text-sm"><span>Toplam</span><span className="font-semibold text-ink">{formatPrice(total)}</span></div>
              <div className="mt-3 flex items-center justify-between text-sm"><span>Çatdırılma</span><span className="font-semibold text-forest">50+ AZN-də pulsuz</span></div>
            </div>
            <Link to="/delivery" className="btn-primary w-full">Çatdırılma hesabla</Link>
            <button type="button" className="btn-secondary w-full">Checkout üçün hazırla</button>
          </div>
        </div>
      )}
    </section>
  );
}