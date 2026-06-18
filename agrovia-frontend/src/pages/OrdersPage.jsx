import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ShoppingCart } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { useMyReviews, useOrders } from '../hooks/useAgroviaData';
import {
  EmptyState,
  LoadingGrid,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  SectionTitle,
  StatusBadge,
  UNIT_LABELS,
  formatDate,
  formatPrice,
  getProductImage,
} from '../components/Ui';

const sellerName = (seller) =>
  seller?.sellerInfo?.businessName ||
  (seller ? `${seller.firstName || ''} ${seller.lastName || ''}`.trim() : '') ||
  'Satıcı';

export default function OrdersPage() {
  const { user } = useSelector((state) => state.auth);
  const ordersQuery = useOrders(Boolean(user));
  const myReviewsQuery = useMyReviews(Boolean(user));
  const orders = ordersQuery.data || [];
  const queryClient = useQueryClient();

  const [toast, setToast] = useState({ message: '', type: '' });
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  // Set of `${orderId}_${productId}` already reviewed by this buyer
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

  return (
    <section className="section-shell py-10">
      {toast.message ? (
        <div
          className={`fixed bottom-16 left-1/2 z-[9999] -translate-x-1/2 rounded-2xl border px-6 py-3 text-sm font-medium shadow-soft ${
            toast.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : toast.type === 'info'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <SectionTitle eyebrow="Sifarişlər" title="Mənim sifarişlərim" />

      {ordersQuery.isLoading ? (
        <LoadingGrid rows={2} />
      ) : orders.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Sifariş yoxdur" description="Sifariş verdikdən sonra burada görünəcək." />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isCardUnpaid = order.payment?.method === 'card' && order.payment?.status !== 'paid';
            const deliveredPaid = order.status === 'delivered' && order.payment?.status === 'paid';

            return (
              <div key={order._id} className="panel space-y-4">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {order.orderNumber}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                      <StatusBadge status={order.payment?.status} map={PAYMENT_STATUS_LABELS} />
                      {order.payment?.method ? (
                        <span className="text-xs text-slate-500">
                          {PAYMENT_METHOD_LABELS[order.payment.method] ?? order.payment.method}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500">
                      {order.deliveryAddress?.region?.name || '—'}
                      {order.deliveryAddress?.street ? ` • ${order.deliveryAddress.street}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold text-forest">{formatPrice(order.totalAmount)}</div>
                    <div className="text-xs text-slate-400">{formatDate(order.createdAt)}</div>
                  </div>
                </div>

                {/* Unpaid card warning */}
                {isCardUnpaid ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Bu sifariş üçün ödəniş tamamlanmayıb.
                  </div>
                ) : null}

                {/* Items */}
                <div className="space-y-3">
                  {order.items?.map((item) => {
                    const unitLabel = UNIT_LABELS[item.unit] ?? item.unit;
                    const productId = item.product?._id;
                    const reviewKey = `${order._id}_${productId}`;
                    const reviewed = productId && reviewedSet.has(reviewKey);

                    return (
                      <div key={item._id} className="rounded-2xl border border-slate-100 p-4">
                        <div className="flex gap-4">
                          <img
                            src={getProductImage(item.product)}
                            alt={item.name}
                            className="h-20 w-20 shrink-0 rounded-xl border border-slate-100 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-ink">{item.name}</div>
                            <div className="mt-0.5 text-sm text-slate-500">
                              {item.quantity} {unitLabel} × {formatPrice(item.price)}
                            </div>
                            <div className="mt-0.5 text-sm font-semibold text-forest">
                              {formatPrice(item.totalPrice)}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-400">Satıcı: {sellerName(item.seller)}</div>
                          </div>
                        </div>

                        {/* Item actions */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {productId ? (
                            <Link to={`/products/${productId}`} className="btn-secondary text-xs">
                              Məhsula bax
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">Məhsul mövcud deyil</span>
                          )}
                          {productId ? (
                            <button
                              type="button"
                              className="btn-secondary text-xs"
                              disabled={reorderMutation.isPending}
                              onClick={() => reorderMutation.mutate({ productId, quantity: item.quantity })}
                            >
                              Yenidən sifariş ver
                            </button>
                          ) : null}
                          {deliveredPaid && productId ? (
                            reviewed ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                                Rəy yazılıb
                              </span>
                            ) : (
                              <Link
                                to={`/products/${productId}?review=1&orderId=${order._id}`}
                                className="btn-secondary text-xs"
                              >
                                Rəy yaz
                              </Link>
                            )
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer totals */}
                <div className="flex flex-col items-end gap-1 text-sm">
                  {order.deliveryFee > 0 ? (
                    <div className="flex items-center gap-6 text-slate-500">
                      <span>Çatdırılma</span>
                      <span>{formatPrice(order.deliveryFee)}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">Pulsuz çatdırılma</div>
                  )}
                  <div className="flex items-center gap-6 font-semibold text-ink">
                    <span>Cəmi</span>
                    <span className="text-forest">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
