import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { api } from '../api/agroviaApi';
import { useCart, useRegions, useWishlist } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, SectionTitle, UNIT_LABELS, formatPrice } from '../components/Ui';
import LocationPicker from '../components/LocationPicker';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const stripeFieldStyle = {
  base: { fontSize: '14px', color: '#1e293b', '::placeholder': { color: '#94a3b8' } }
};

// Must be rendered inside <Elements> so useStripe/useElements work
function StripeCardForm({ clientSecret, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState('');
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    setCardError('');
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardNumberElement) }
    });
    if (result.error) {
      setProcessing(false);
      setCardError(result.error.message);
    } else {
      // Keep button disabled while parent awaits api.confirmPayment + navigate
      onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Kart nömrəsi</label>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <CardNumberElement options={{ style: stripeFieldStyle, showIcon: true }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Bitmə tarixi</label>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <CardExpiryElement options={{ style: stripeFieldStyle }} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">CVC</label>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <CardCvcElement options={{ style: stripeFieldStyle }} />
            </div>
          </div>
        </div>
      </div>
      {cardError ? <p className="text-sm text-red-600">{cardError}</p> : null}
      <button
        type="button"
        className="btn-primary w-full"
        onClick={handlePay}
        disabled={!stripe || processing}
      >
        {processing ? 'Ödəniş emal edilir...' : 'Ödənişi tamamla'}
      </button>
      <button
        type="button"
        className="btn-secondary w-full"
        onClick={onCancel}
        disabled={processing}
      >
        Ləğv et
      </button>
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cartQuery = useCart();
  const cart = cartQuery.data;
  const regions = useRegions().data || [];

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [form, setForm] = useState({ recipientName: '', phone: '', region: '', street: '', notes: '' });

  // Populated after createPaymentIntent succeeds — shape: { clientSecret, paymentIntentId, amount }
  const [pendingPayment, setPendingPayment] = useState(null);

  const [confirmPending, setConfirmPending] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  // No onSuccess/onError callbacks on these — side effects live in submitOrder/handleStripeSuccess
  const orderMutation = useMutation({ mutationFn: api.createOrder });
  const paymentIntentMutation = useMutation({ mutationFn: api.createPaymentIntent });

  // Distance-based delivery estimate to the buyer's EXACT location (display only;
  // backend uses the picked coordinates directly, or geocodes the typed address).
  const [deliveryEstimate, setDeliveryEstimate] = useState(null);
  const [pickedLocation, setPickedLocation] = useState(null);
  const [mapAvailable, setMapAvailable] = useState(false);
  const estimateMutation = useMutation({
    mutationFn: ({ region, street, location }) => api.estimateDelivery({ region, street, location }),
    onSuccess: (data) => setDeliveryEstimate({ fee: data.deliveryFee, distanceKm: data.distanceKm }),
    onError: (err) => setDeliveryEstimate({ error: err.response?.data?.message || 'Çatdırılma hesablana bilmədi.' }),
  });
  const triggerEstimate = (region, street, location) => {
    setDeliveryEstimate(null);
    if (region && (location || (street && street.trim()))) {
      estimateMutation.mutate({ region, street: (street || '').trim(), location: location || undefined });
    }
  };
  const handleRegionChange = (e) => {
    const region = e.target.value;
    setForm((prev) => ({ ...prev, region }));
    triggerEstimate(region, form.street, pickedLocation);
  };
  const handleStreetBlur = () => triggerEstimate(form.region, form.street, pickedLocation);
  const handlePickLocation = ({ lat, lng, addressText }) => {
    const location = { lat, lng };
    setPickedLocation(location);
    setForm((prev) => ({ ...prev, street: addressText || prev.street }));
    triggerEstimate(form.region, addressText || form.street, location);
  };

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }) => api.updateCartItem(itemId, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: (err) => showToast(err.response?.data?.message || 'Miqdar yenilənmədi.', 'error')
  });

  const removeMutation = useMutation({
    mutationFn: api.removeFromCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setConfirmPending(null);
      showToast('Məhsul səbətdən silindi.');
    },
    onError: (err) => {
      setConfirmPending(null);
      showToast(err.response?.data?.message || 'Silinərkən xəta baş verdi.', 'error');
    }
  });

  const clearMutation = useMutation({
    mutationFn: api.clearCart,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] })
  });

  const wishlistQuery = useWishlist();
  const wishlistItems = wishlistQuery.data?.items || [];

  const isInWishlist = (productId) => {
    if (!productId) return false;
    return wishlistItems.some((wi) => {
      const id = typeof wi.product === 'object' ? wi.product?._id : wi.product;
      return String(id) === String(productId);
    });
  };

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
      showToast(err.response?.data?.message || 'Silinərkən xəta baş verdi.', 'error');
    }
  });

  const handleWishlistToggle = (item) => {
    const productId = item.product?._id;
    if (!productId) return;
    if (isInWishlist(productId)) {
      removeFromWishlistMutation.mutate(productId);
    } else {
      addToWishlistMutation.mutate({ productId });
    }
  };

  const handleRemoveClick = (item) => {
    setConfirmPending({ itemId: item._id, productName: item.product?.name || 'məhsul' });
  };

  const handleDecrease = (item) => {
    const minQty = item.product?.minOrderQuantity || 1;
    if (item.quantity > minQty) {
      updateMutation.mutate({ itemId: item._id, quantity: item.quantity - 1 });
    } else {
      const label = UNIT_LABELS[item.product?.unit] || item.product?.unit || '';
      showToast(`Bu məhsuldan minimum ${minQty} ${label} sifariş etməlisiniz.`, 'info');
    }
  };

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // Step 1 + 2 combined: create order then create payment intent sequentially.
  // navigate is NOT called here. After this resolves, pendingPayment is set and
  // the Stripe CardElement panel renders.
  const submitOrder = async (event) => {
    event.preventDefault();
    setCheckoutError('');
    const { recipientName, phone, region, street, notes } = form;
    if (!recipientName.trim() || !phone.trim() || !region || !street.trim()) {
      setCheckoutError('Bütün məcburi sahələri (*) doldurun');
      return;
    }
    // When the map picker is usable, require a confirmed pin (exact coordinates).
    // Typed-address fallback is allowed only when the key is missing / script failed.
    if (mapAvailable && !pickedLocation) {
      setCheckoutError('Zəhmət olmasa çatdırılma ünvanını xəritədən seçin.');
      return;
    }

    try {
      // POST /api/orders → { success, message, order: { _id, totalAmount, ... } }
      const orderData = await orderMutation.mutateAsync({
        deliveryAddress: {
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          region,
          street: street.trim(),
          // Exact picked point — backend uses it directly (no re-geocode) when valid.
          coordinates: pickedLocation || undefined
        },
        paymentMethod: 'card',
        notes: notes.trim() || undefined
      });

      const orderId = orderData?.order?._id;
      if (!orderId) {
        setCheckoutError('Sifariş yaradıldı lakin ID alınmadı.');
        return;
      }

      // POST /api/payments/create-intent → { success, message, data: { clientSecret, paymentIntentId, amount, currency } }
      const intentData = await paymentIntentMutation.mutateAsync({ orderId });
      const { clientSecret, paymentIntentId, amount } = intentData?.data ?? {};

      if (!clientSecret) {
        setCheckoutError('Ödəniş başladıla bilmədi. Yenidən cəhd edin.');
        return;
      }

      // Show Stripe card form — navigate is NOT called until card payment succeeds
      setPendingPayment({ clientSecret, paymentIntentId, amount });

    } catch (err) {
      setCheckoutError(err?.response?.data?.message || 'Sifariş yaradılmadı. Yenidən cəhd edin.');
    }
  };

  // Step 3: called ONLY after stripe.confirmCardPayment resolves without error.
  // This is the ONLY place navigate('/orders') is called.
  const handleStripeSuccess = async () => {
    try {
      // Tell backend to mark order as paid (payment.status = 'paid')
      await api.confirmPayment({ paymentIntentId: pendingPayment.paymentIntentId });
    } catch {
      // Stripe already processed the charge — navigate regardless.
      // The webhook or admin can reconcile if backend update fails.
    }
    showToast('Ödəniş uğurla tamamlandı.', 'success');
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setTimeout(() => navigate('/orders'), 1500);
  };

  const handleStripeCancel = () => {
    // Order exists with payment.status='pending'. Redirect so user can see it.
    navigate('/orders');
  };

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + (item.price || item.product?.price || 0) * item.quantity, 0);
  const deliveryFee = deliveryEstimate?.fee ?? null;
  const total = subtotal + (deliveryFee || 0);

  const isSubmitting = orderMutation.isPending || paymentIntentMutation.isPending;

  return (
    <>
      {toast.message ? (
        <div className={`fixed bottom-16 left-1/2 z-[9999] -translate-x-1/2 rounded-2xl border px-6 py-3 text-sm font-medium shadow-soft ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : toast.type === 'info' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {toast.message}
        </div>
      ) : null}

      {confirmPending ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmPending(null); }}
        >
          <div className="mx-4 w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="text-base font-semibold text-ink">Bu məhsulu sil?</div>
            <p className="text-sm text-slate-600">
              <strong>{confirmPending.productName}</strong> məhsulunu səbətdən silmək istədiyinizə əminsiniz?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="btn-secondary" onClick={() => setConfirmPending(null)} disabled={removeMutation.isPending}>
                Ləğv et
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                onClick={() => removeMutation.mutate(confirmPending.itemId)}
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
          eyebrow="Səbət"
          title="Səbətə əlavə olunmuş məhsullar"
          description="Bu səhifə protected API-yə qoşulur və cart state-ni yeniləyir."
          action={!pendingPayment ? (
            <button type="button" className="btn-secondary" onClick={() => clearMutation.mutate()}>Səbəti boşalt</button>
          ) : null}
        />

        {cartQuery.isLoading ? (
          <LoadingGrid rows={2} />

        ) : pendingPayment ? (
          // Payment step — checked BEFORE items.length so an empty React Query cart
          // cache (backend clears cart on order creation) never hides this panel
          <div className="mx-auto max-w-lg">
            <div className="panel space-y-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ödəniş məbləği</div>
                <div className="mt-1 text-3xl font-semibold text-forest">{formatPrice(pendingPayment.amount)}</div>
                <div className="mt-1 text-sm text-slate-500">Kart məlumatlarınızı daxil edin</div>
              </div>
              {checkoutError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{checkoutError}</div>
              ) : null}
              {stripePromise ? (
                <Elements stripe={stripePromise} options={{ locale: 'en' }}>
                  <StripeCardForm
                    clientSecret={pendingPayment.clientSecret}
                    onSuccess={handleStripeSuccess}
                    onCancel={handleStripeCancel}
                  />
                </Elements>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Stripe konfiqurasiya edilməyib. VITE_STRIPE_PUBLISHABLE_KEY əlavə edin.
                </div>
              )}
            </div>
          </div>

        ) : items.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Səbət boşdur"
            description="Məhsul əlavə edib burada miqdarını dəyişə bilərsən."
            action={<Link className="btn-primary" to="/shop">Alış-verişə başla</Link>}
          />

        ) : (
          // Cart list + delivery form
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item._id} className="panel flex items-start gap-4">
                  <img
                    src={item.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80'}
                    alt={item.product?.name}
                    className="h-28 w-28 shrink-0 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug text-ink">{item.product?.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-forest">{formatPrice(item.price)}</span>
                          {item.product?.price != null && item.price < item.product.price ? (
                            <span className="text-xs text-slate-400 line-through">{formatPrice(item.product.price)}</span>
                          ) : null}
                          <span className="text-slate-500">/ {UNIT_LABELS[item.product?.unit] || item.product?.unit}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleWishlistToggle(item)}
                          className="rounded-full p-2 transition hover:bg-rose-50 disabled:opacity-40"
                          title={isInWishlist(item.product?._id) ? 'Wishlist-dən çıxar' : 'Wishlist-ə əlavə et'}
                          disabled={addToWishlistMutation.isPending || removeFromWishlistMutation.isPending}
                        >
                          <Heart className={`h-4 w-4 transition ${isInWishlist(item.product?._id) ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveClick(item)}
                          className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          title="Məhsulu sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 p-2 transition hover:border-slate-300 disabled:opacity-40"
                          onClick={() => handleDecrease(item)}
                          disabled={updateMutation.isPending}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-10 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 p-2 transition hover:border-slate-300 disabled:opacity-40"
                          onClick={() => updateMutation.mutate({ itemId: item._id, quantity: item.quantity + 1 })}
                          disabled={updateMutation.isPending}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-sm font-semibold text-ink">
                        {formatPrice((item.price || item.product?.price || 0) * item.quantity)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="panel h-fit space-y-4">
              <div className="text-sm font-semibold text-slate-500">Sifariş xülasəsi</div>
              <div className="rounded-3xl bg-slate-50 p-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Məhsullar</span>
                  <span className="font-semibold text-ink">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Çatdırılma{deliveryEstimate?.distanceKm ? ` (~${deliveryEstimate.distanceKm} km)` : ''}</span>
                  <span className="font-semibold text-forest">
                    {estimateMutation.isPending
                      ? 'hesablanır…'
                      : deliveryEstimate?.error
                        ? 'Hesablana bilmədi'
                        : deliveryFee != null
                          ? formatPrice(deliveryFee)
                          : 'Region və ünvan daxil edin'}
                  </span>
                </div>
                {deliveryEstimate?.error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {deliveryEstimate.error}
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-semibold">
                  <span>Cəmi</span>
                  <span className="text-forest">{formatPrice(total)}</span>
                </div>
              </div>

              {checkoutOpen ? (
                <form onSubmit={submitOrder} className="space-y-3">
                  <div className="text-sm font-semibold text-slate-700">Çatdırılma məlumatları</div>
                  {checkoutError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{checkoutError}</div>
                  ) : null}
                  <input className="input-shell" placeholder="Ad Soyad *" value={form.recipientName} onChange={setField('recipientName')} disabled={isSubmitting} />
                  <input className="input-shell" placeholder="Telefon *" value={form.phone} onChange={setField('phone')} disabled={isSubmitting} />
                  <select className="input-shell" value={form.region} onChange={handleRegionChange} disabled={isSubmitting}>
                    <option value="">Region seçin *</option>
                    {regions.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
                  </select>
                  <LocationPicker value={pickedLocation} onChange={handlePickLocation} onAvailabilityChange={setMapAvailable} placeholder="Çatdırılma ünvanını xəritədə tap..." />
                  <input className="input-shell" placeholder="Küçə / dəqiq ünvan *" value={form.street} onChange={setField('street')} onBlur={handleStreetBlur} disabled={isSubmitting} />
                  <textarea className="input-shell" placeholder="Qeyd (istəyə bağlı)" value={form.notes} onChange={setField('notes')} disabled={isSubmitting} rows={2} />
                  <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Göndərilir...' : 'Ödənişə keç'}
                  </button>
                  <button type="button" className="btn-secondary w-full" onClick={() => setCheckoutOpen(false)} disabled={isSubmitting}>
                    Ləğv et
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => { setCheckoutOpen(true); setCheckoutError(''); }}
                >
                  Sifariş ver
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
