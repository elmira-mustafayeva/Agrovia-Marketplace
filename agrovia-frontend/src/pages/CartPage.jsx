import { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CreditCard, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { api } from '../api/agroviaApi';
import { useCart, useRegions, useWishlist } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, UNIT_LABELS, formatPrice } from '../components/Ui';
import LocationPicker from '../components/LocationPicker';
import FormField from '../components/FormField';
import PhoneInput from '../components/PhoneInput';
import QuantityInput from '../components/QuantityInput';
import { checkoutSchema } from '../lib/validation';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const stripeFieldStyle = {
  base: { fontSize: '14px', color: '#1e293b', '::placeholder': { color: '#94a3b8' } }
};

// ── Stripe card form (logic unchanged) ───────────────────────────────────────
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
      <button type="button" className="btn-primary w-full" onClick={handlePay} disabled={!stripe || processing}>
        {processing ? 'Ödəniş emal edilir...' : 'Ödənişi tamamla'}
      </button>
      <button type="button" className="btn-secondary w-full" onClick={onCancel} disabled={processing}>
        Ləğv et
      </button>
    </div>
  );
}

// ── Checkout step header ──────────────────────────────────────────────────────
function SectionStep({ number, label, action }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">
          {number}
        </span>
        <span className="text-base font-bold text-slate-900">{label}</span>
      </div>
      {action}
    </div>
  );
}

// ── CartPage ──────────────────────────────────────────────────────────────────
export default function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSelector((s) => s.auth.user);
  const cartQuery = useCart();
  const cart = cartQuery.data;
  const regions = useRegions().data || [];

  const [checkoutError, setCheckoutError] = useState('');
  const [pendingPayment, setPendingPayment] = useState(null);
  const [confirmPending, setConfirmPending] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [prefillApplied, setPrefillApplied] = useState(false);
  const hasPrefilledRef = useRef(false);

  // Delivery estimate state (driven by map/region/street)
  const [deliveryEstimate, setDeliveryEstimate] = useState(null);
  const [pickedLocation, setPickedLocation] = useState(null);
  const [mapAvailable, setMapAvailable] = useState(false);

  // ── Checkout form (RHF + Zod) ─────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors: fe },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { recipientName: '', phone: '', region: '', street: '', notes: '' },
  });

  const watchedRegion = watch('region');
  const watchedStreet = watch('street');

  // ── Prefill from logged-in buyer profile (runs once when user data arrives) ─
  useEffect(() => {
    if (!user || hasPrefilledRef.current) return;

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const regionId =
      typeof user.address?.region === 'object'
        ? user.address.region?._id?.toString()
        : user.address?.region?.toString() || '';

    let anyPrefill = false;

    if (fullName && !watch('recipientName')) {
      setValue('recipientName', fullName, { shouldValidate: false });
      anyPrefill = true;
    }
    if (user.phone && !watch('phone')) {
      setValue('phone', user.phone, { shouldValidate: false });
      anyPrefill = true;
    }
    if (regionId && !watch('region')) {
      setValue('region', regionId, { shouldValidate: false });
      anyPrefill = true;
    }
    if (user.address?.street && !watch('street')) {
      setValue('street', user.address.street, { shouldValidate: false });
      anyPrefill = true;
    }

    if (anyPrefill) {
      setPrefillApplied(true);
      // Trigger delivery estimate if both region and street/location are available
      const effectiveRegion = regionId || watch('region');
      const effectiveStreet = user.address?.street || watch('street');
      if (effectiveRegion && effectiveStreet?.trim()) {
        triggerEstimate(effectiveRegion, effectiveStreet, pickedLocation);
      }
    }

    hasPrefilledRef.current = true;
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutations ─────────────────────────────────────────────────────────────
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const orderMutation = useMutation({ mutationFn: api.createOrder });
  const paymentIntentMutation = useMutation({ mutationFn: api.createPaymentIntent });

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

  const handleRegionChange = (e) => triggerEstimate(e.target.value, watchedStreet, pickedLocation);
  const handleStreetBlur = () => triggerEstimate(watchedRegion, watchedStreet, pickedLocation);

  const handlePickLocation = ({ lat, lng, addressText }) => {
    const location = { lat, lng };
    setPickedLocation(location);
    if (addressText) setValue('street', addressText);
    triggerEstimate(watchedRegion, addressText || watchedStreet, location);
  };

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }) => api.updateCartItem(itemId, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: (err) => showToast(err.response?.data?.message || 'Miqdar yenilənmədi.', 'error'),
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
    },
  });

  const clearMutation = useMutation({
    mutationFn: api.clearCart,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wishlist'] }); showToast('Məhsul wishlist-ə əlavə edildi.'); },
    onError: (err) => showToast(err.response?.data?.message || 'Wishlist-ə əlavə edilmədi.', 'error'),
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: api.removeFromWishlist,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wishlist'] }); showToast('Məhsul wishlist-dən silindi.'); },
    onError: (err) => showToast(err.response?.data?.message || 'Silinərkən xəta baş verdi.', 'error'),
  });

  const handleWishlistToggle = (item) => {
    const productId = item.product?._id;
    if (!productId) return;
    if (isInWishlist(productId)) removeFromWishlistMutation.mutate(productId);
    else addToWishlistMutation.mutate({ productId });
  };

  // ── Checkout submit (logic unchanged) ────────────────────────────────────
  const submitOrder = handleSubmit(async (data) => {
    setCheckoutError('');

    if (mapAvailable && !pickedLocation) {
      setCheckoutError('Zəhmət olmasa çatdırılma ünvanını xəritədən seçin.');
      return;
    }

    try {
      const orderData = await orderMutation.mutateAsync({
        deliveryAddress: {
          recipientName: data.recipientName,
          phone: data.phone,
          region: data.region,
          street: data.street,
          coordinates: pickedLocation || undefined,
        },
        paymentMethod: 'card',
        notes: data.notes?.trim() || undefined,
      });

      const orderId = orderData?.order?._id;
      if (!orderId) { setCheckoutError('Sifariş yaradıldı lakin ID alınmadı.'); return; }

      const intentData = await paymentIntentMutation.mutateAsync({ orderId });
      const { clientSecret, paymentIntentId, amount } = intentData?.data ?? {};

      if (!clientSecret) { setCheckoutError('Ödəniş başladıla bilmədi. Yenidən cəhd edin.'); return; }

      setPendingPayment({ clientSecret, paymentIntentId, amount });
    } catch (err) {
      setCheckoutError(err?.response?.data?.message || 'Sifariş yaradılmadı. Yenidən cəhd edin.');
    }
  });

  const handleStripeSuccess = async () => {
    try { await api.confirmPayment({ paymentIntentId: pendingPayment.paymentIntentId }); } catch { /* webhook reconciles */ }
    showToast('Ödəniş uğurla tamamlandı.', 'success');
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setTimeout(() => navigate('/orders'), 1500);
  };

  const handleStripeCancel = () => navigate('/orders');

  // ── Derived values ────────────────────────────────────────────────────────
  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + (item.price || item.product?.price || 0) * item.quantity, 0);
  const deliveryFee = deliveryEstimate?.fee ?? null;
  const total = subtotal + (deliveryFee || 0);
  const isSubmitting = orderMutation.isPending || paymentIntentMutation.isPending;
  const needsDeliveryHint = !watchedRegion || (!watchedStreet?.trim() && !pickedLocation);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toast */}
      {toast.message ? (
        <div className={`fixed bottom-16 left-1/2 z-[9999] -translate-x-1/2 rounded-2xl border px-6 py-3 text-sm font-medium shadow-soft ${
          toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700'
          : toast.type === 'info' ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          {toast.message}
        </div>
      ) : null}

      {/* Delete confirm modal */}
      {confirmPending ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmPending(null); }}
        >
          <div className="mx-4 w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="text-base font-semibold text-ink">Bu məhsulu sil?</div>
            <p className="text-sm text-slate-600">
              <strong>{confirmPending.productName}</strong> Məhsulu səbətdən silmək istədiyinizə əminsiniz?
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

      <section className="section-shell py-8">
        {/* ── Payment mode ── */}
        {pendingPayment ? (
          <div className="mx-auto max-w-lg">
            <div className="panel space-y-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ödəniş məbləği</div>
                <div className="mt-1 text-3xl font-semibold text-forest">{formatPrice(pendingPayment.amount)}</div>
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

        ) : cartQuery.isLoading ? (
          <LoadingGrid rows={2} />

        ) : items.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Səbət boşdur"
            description="Məhsul əlavə edib burada miqdarını dəyişə bilərsiniz."
            action={<Link className="btn-primary" to="/shop">Alış-verişə başla</Link>}
          />

        ) : (
          /* ── Checkout layout: main left + sticky summary right ── */
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">

            {/* ── Left column ── */}
            <div className="space-y-8">

              {/* Step 1: Products */}
              <div>
                <SectionStep
                  number="1"
                  label="Məhsullar"
                  action={
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() => clearMutation.mutate()}
                      disabled={clearMutation.isPending}
                    >
                      Səbəti boşalt
                    </button>
                  }
                />
                <div className="mt-4 space-y-3">
                  {items.map((item) => (
                    <div key={item._id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex gap-4">
                        <img
                          src={item.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80'}
                          alt={item.product?.name}
                          className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold leading-snug text-slate-900">{item.product?.name}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium text-forest">{formatPrice(item.price)}</span>
                                {item.product?.price != null && item.price < item.product.price ? (
                                  <span className="text-xs text-slate-400 line-through">{formatPrice(item.product.price)}</span>
                                ) : null}
                                <span className="text-slate-400">/ {UNIT_LABELS[item.product?.unit] || item.product?.unit}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleWishlistToggle(item)}
                                className="rounded-full p-1.5 transition hover:bg-rose-50 disabled:opacity-40"
                                disabled={addToWishlistMutation.isPending || removeFromWishlistMutation.isPending}
                                title={isInWishlist(item.product?._id) ? 'Wishlist-dən çıxar' : 'Wishlist-ə əlavə et'}
                              >
                                <Heart className={`h-4 w-4 transition ${isInWishlist(item.product?._id) ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmPending({ itemId: item._id, productName: item.product?.name || 'məhsul' })}
                                className="rounded-full p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                title="Məhsulu sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-4">
                            <QuantityInput
                              value={item.quantity}
                              min={item.product?.minOrderQuantity || 1}
                              max={item.product?.stockQuantity || 9999}
                              onChange={(qty) => updateMutation.mutate({ itemId: item._id, quantity: qty })}
                            />
                            <span className="text-sm font-bold text-slate-900">
                              {formatPrice((item.price || item.product?.price || 0) * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Delivery form */}
              <div>
                <SectionStep number="2" label="Çatdırılma məlumatları" />
                <form id="checkout-form" onSubmit={submitOrder} noValidate>
                  <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    {prefillApplied ? (
                      <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700">
                        Məlumatlar profilinizdən avtomatik dolduruldu. İstəsəniz dəyişə bilərsiniz.
                      </div>
                    ) : null}

                    {checkoutError ? (
                      <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {checkoutError}
                      </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField label="Ad Soyad" error={fe.recipientName} required>
                        <input
                          className={`input-shell ${fe.recipientName ? 'input-error' : ''}`}
                          placeholder="Ad Soyad"
                          disabled={isSubmitting}
                          autoComplete="name"
                          {...register('recipientName')}
                        />
                      </FormField>

                      <FormField label="Telefon" error={fe.phone} required>
                        <Controller
                          name="phone"
                          control={control}
                          render={({ field }) => (
                            <PhoneInput
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              hasError={!!fe.phone}
                            />
                          )}
                        />
                      </FormField>

                      <div className="md:col-span-2">
                        <FormField label="Region" error={fe.region} required>
                          <select
                            className={`input-shell ${fe.region ? 'input-error' : ''}`}
                            disabled={isSubmitting}
                            {...register('region', { onChange: handleRegionChange })}
                          >
                            <option value="">Region seçin</option>
                            {regions.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
                          </select>
                        </FormField>
                      </div>

                      <div className="md:col-span-2">
                        <div className="mb-1.5 text-sm font-medium text-slate-700">Xəritədə ünvan seç</div>
                        <LocationPicker
                          value={pickedLocation}
                          onChange={handlePickLocation}
                          onAvailabilityChange={setMapAvailable}
                          placeholder="Çatdırılma ünvanını xəritədə tap..."
                        />
                      </div>

                      <div className="md:col-span-2">
                        <FormField label="Küçə / dəqiq ünvan" error={fe.street} required>
                          <input
                            className={`input-shell ${fe.street ? 'input-error' : ''}`}
                            placeholder="Küçə, ev nömrəsi, mənzil"
                            disabled={isSubmitting}
                            autoComplete="street-address"
                            {...register('street', { onBlur: handleStreetBlur })}
                          />
                        </FormField>
                      </div>

                      <div className="md:col-span-2">
                        <FormField label="Qeyd" error={fe.notes}>
                          <textarea
                            className="input-shell"
                            placeholder="Kuryerə qeyd (istəyə bağlı)"
                            disabled={isSubmitting}
                            rows={2}
                            {...register('notes')}
                          />
                        </FormField>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* ── Right column: sticky order summary ── */}
            <div>
              <SectionStep number="3" label="Sifariş xülasəsi" />
              <aside className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
                {/* Line items */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Məhsullar ({items.length} növ)</span>
                    <span className="font-semibold text-slate-900">{formatPrice(subtotal)}</span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-600">
                      Çatdırılma
                      {deliveryEstimate?.distanceKm ? (
                        <span className="ml-1 text-xs text-slate-400">(~{deliveryEstimate.distanceKm} km)</span>
                      ) : null}
                    </span>
                    <span className={`shrink-0 font-semibold ${
                      estimateMutation.isPending ? 'text-slate-400 animate-pulse'
                      : deliveryEstimate?.error ? 'text-red-500'
                      : deliveryFee != null ? 'text-forest'
                      : 'text-slate-400'
                    }`}>
                      {estimateMutation.isPending
                        ? 'Hesablanır…'
                        : deliveryEstimate?.error
                        ? 'Hesablana bilmədi'
                        : deliveryFee != null
                        ? formatPrice(deliveryFee)
                        : '—'}
                    </span>
                  </div>

                  {deliveryEstimate?.error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {deliveryEstimate.error}
                    </div>
                  ) : null}

                  {needsDeliveryHint ? (
                    <p className="text-xs text-slate-400">
                      Çatdırılma qiyməti üçün region və ünvan daxil edin
                    </p>
                  ) : null}
                </div>

                {/* Total */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-base font-bold text-slate-900">Cəmi</span>
                  <span className="text-xl font-bold text-emerald-700">{formatPrice(total)}</span>
                </div>

                {/* Payment method */}
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                  <CreditCard className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>Kartla ödəniş (Visa / Mastercard)</span>
                </div>

                {/* Submit button — submits the form in the left column via form= */}
                <button
                  type="submit"
                  form="checkout-form"
                  className="mt-5 h-12 w-full rounded-full bg-emerald-700 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Ödənişə keçilir...' : 'Sifariş ver →'}
                </button>
              </aside>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
