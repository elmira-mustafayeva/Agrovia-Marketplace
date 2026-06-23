import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, MessageCircle, ShoppingCart } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { useMyReviews, useOrders } from '../hooks/useAgroviaData';
import { useOpenConversation } from '../hooks/useOpenConversation';
import {
  EmptyState,
  LoadingGrid,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  StarRating,
  Stars,
  StatusBadge,
  UNIT_LABELS,
  formatPrice,
  getProductImage,
} from '../components/Ui';

const sellerName = (seller) =>
  seller?.sellerInfo?.businessName ||
  (seller ? `${seller.firstName || ''} ${seller.lastName || ''}`.trim() : '') ||
  'Satıcı';

// Produces "19.06.2026, 21:44" — avoids the broken az-AZ "M06" locale output.
const formatOrderDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy}, ${hh}:${min}`;
};

// Takes only the first comma-segment of the street (strips long Google Maps strings).
const formatAddress = (addr) => {
  if (!addr) return null;
  const region = addr.region?.name || '';
  const street = addr.street ? addr.street.split(',')[0].trim() : '';
  return [region, street].filter(Boolean).join(', ') || null;
};

const PILL =
  'inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800';
const PILL_GREEN =
  'inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950';

export default function OrdersPage() {
  const { user } = useSelector((state) => state.auth);
  const ordersQuery = useOrders(Boolean(user));
  const myReviewsQuery = useMyReviews(Boolean(user));
  const orders = ordersQuery.data || [];
  const queryClient = useQueryClient();
  const openChat = useOpenConversation();

  const [toast, setToast] = useState({ message: '', type: '' });
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const reviewedSet = new Set(
    (myReviewsQuery.data || []).map((r) => {
      const productId = typeof r.product === 'object' ? r.product?._id : r.product;
      return `${r.order}_${productId}`;
    })
  );

  const reorderMutation = useMutation({
    mutationFn: ({ productId, quantity }) => api.addToCart({ productId, quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      showToast('Məhsul səbətə əlavə edildi.');
    },
    onError: (err) => {
      const type = err.response?.status === 409 ? 'info' : 'error';
      showToast(err.response?.data?.message || 'Səbətə əlavə edilmədi.', type);
    },
  });

  const [courierForm, setCourierForm] = useState(null);
  const courierReviewMutation = useMutation({
    mutationFn: ({ orderId, rating, comment }) => api.addCourierReview(orderId, { rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setCourierForm(null);
      showToast('Kuryer qiymətləndirildi.');
    },
    onError: (err) => showToast(err.response?.data?.message || 'Qiymətləndirmə alınmadı.', 'error'),
  });
  const submitCourierReview = () => {
    if (!courierForm?.rating) { showToast('Zəhmət olmasa ulduzla qiymətləndirin.', 'error'); return; }
    if (courierForm.comment && !courierForm.comment.trim()) { showToast('Rəy mətni yalnız boşluqlardan ibarət ola bilməz.', 'error'); return; }
    courierReviewMutation.mutate({ ...courierForm, comment: courierForm.comment?.trim() || undefined });
  };

  // Only show orders where payment is complete.
  const visibleOrders = orders.filter((o) => o.payment?.status === 'paid');

  return (
    <section className="section-shell max-w-4xl py-8">
      {toast.message ? (
        <div className={`fixed bottom-16 left-1/2 z-[9999] -translate-x-1/2 rounded-2xl border px-6 py-3 text-sm font-medium shadow-soft ${
          toast.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : toast.type === 'info'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          {toast.message}
        </div>
      ) : null}

      <h1 className="mb-6 text-2xl font-black text-slate-950 dark:text-white">Mənim sifarişlərim</h1>

      {ordersQuery.isLoading ? (
        <LoadingGrid rows={2} />
      ) : visibleOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={orders.length === 0 ? 'Hələ sifarişiniz yoxdur' : 'Tamamlanmış sifarişiniz yoxdur'}
          description={
            orders.length === 0
              ? 'Məhsul bazarına keçərək ilk sifarişinizi verə bilərsiniz.'
              : 'Ödənişi tamamlanmış sifarişlər burada görünəcək.'
          }
          action={orders.length === 0 ? <Link to="/shop" className="btn-secondary">Məhsul bazarına keç</Link> : null}
        />
      ) : (
        <div className="space-y-5">
          {visibleOrders.map((order) => {
            const deliveredPaid = order.status === 'delivered' && order.payment?.status === 'paid';
            const address = formatAddress(order.deliveryAddress);

            return (
              <article key={order._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                {/* Header */}
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between dark:border-slate-800">
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{order.orderNumber}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                      <StatusBadge status={order.payment?.status} map={PAYMENT_STATUS_LABELS} />
                    </div>
                    {address ? (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{address}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-xs text-slate-400 md:text-right">
                    Sifariş tarixi: {formatOrderDate(order.createdAt)}
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {order.items?.map((item) => {
                    const unitLabel = UNIT_LABELS[item.unit] ?? item.unit;
                    const productId = item.product?._id;
                    const reviewKey = `${order._id}_${productId}`;
                    const reviewed = productId && reviewedSet.has(reviewKey);

                    return (
                      <div key={item._id} className="flex gap-4 py-4">
                        <img
                          src={getProductImage(item.product)}
                          alt={item.name}
                          className="h-24 w-28 shrink-0 rounded-2xl object-cover md:h-28 md:w-32"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-slate-950 dark:text-white">{item.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">{item.quantity} {unitLabel} × {formatPrice(item.price)}</p>
                          <p className="mt-0.5 text-xs text-slate-400">Satıcı: {sellerName(item.seller)}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {order.items?.[0]?.product?._id ? (
                              <button type="button" className={PILL} onClick={() => openChat({ type: 'buyer_seller', productId: order.items[0].product._id })}>
                                <MessageCircle className="h-3.5 w-3.5" />Satıcıya yaz
                              </button>
                            ) : null}
                            {order.courier ? (
                              <button type="button" className={PILL} onClick={() => openChat({ type: 'buyer_courier', orderId: order._id })}>
                                <MessageCircle className="h-3.5 w-3.5" />Kuryerə yaz
                              </button>
                            ) : null}
                            {productId ? (
                              <button
                                type="button"
                                className={PILL_GREEN}
                                disabled={reorderMutation.isPending}
                                onClick={() => reorderMutation.mutate({ productId, quantity: item.quantity })}
                              >
                                Yenidən sifariş ver
                              </button>
                            ) : null}
                            {deliveredPaid && productId ? (
                              reviewed ? (
                                <span className="inline-flex h-8 items-center rounded-full bg-emerald-100 px-3 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                  Rəy yazılıb
                                </span>
                              ) : (
                                <Link to={`/products/${productId}?review=1&orderId=${order._id}`} className={PILL_GREEN}>
                                  Rəy yaz
                                </Link>
                              )
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Courier rating — order-level */}
                {order.status === 'delivered' && order.payment?.status === 'paid' && order.courier ? (
                  <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                    {order.deliveryReview?.rating ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span>Kuryer qiymətləndirildi:</span>
                        <Stars value={order.deliveryReview.rating} />
                      </div>
                    ) : courierForm?.orderId === order._id ? (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Kuryeri qiymətləndir</div>
                        <StarRating
                          value={courierForm.rating}
                          onChange={(n) => setCourierForm((c) => ({ ...c, rating: n }))}
                          disabled={courierReviewMutation.isPending}
                        />
                        <textarea
                          className="input-shell min-h-20"
                          placeholder="Kuryer haqqında rəyiniz (istəyə bağlı)..."
                          value={courierForm.comment}
                          onChange={(e) => setCourierForm((c) => ({ ...c, comment: e.target.value }))}
                          disabled={courierReviewMutation.isPending}
                        />
                        <div className="flex gap-2">
                          <button type="button" className="btn-primary text-xs" disabled={courierReviewMutation.isPending} onClick={submitCourierReview}>
                            {courierReviewMutation.isPending ? 'Göndərilir...' : 'Göndər'}
                          </button>
                          <button type="button" className="btn-secondary text-xs" disabled={courierReviewMutation.isPending} onClick={() => setCourierForm(null)}>
                            Ləğv et
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" className={PILL} onClick={() => setCourierForm({ orderId: order._id, rating: 0, comment: '' })}>
                        Kuryeri qiymətləndir
                      </button>
                    )}
                  </div>
                ) : null}

                {/* Summary footer */}
                <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="ml-auto w-fit space-y-1 text-sm">
                    <div className="flex items-center justify-end gap-4 text-slate-500">
                      <span>Çatdırılma:</span>
                      <span>{order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : 'Pulsuz'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-4 font-bold text-slate-950 dark:text-white">
                      <span>Cəmi:</span>
                      <span className="text-emerald-700">{formatPrice(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
