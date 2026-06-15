import { useSelector } from 'react-redux';
import { AlertTriangle, ShoppingCart } from 'lucide-react';
import { useOrders } from '../hooks/useAgroviaData';
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
} from '../components/Ui';

export default function OrdersPage() {
  const { user } = useSelector((state) => state.auth);
  const ordersQuery = useOrders(Boolean(user));
  const orders = ordersQuery.data || [];

  return (
    <section className="section-shell py-10">
      <SectionTitle eyebrow="Sifarişlər" title="Mənim sifarişlərim" />
      {ordersQuery.isLoading ? (
        <LoadingGrid rows={2} />
      ) : orders.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Sifariş yoxdur" description="Sifariş verdikdən sonra burada görünəcək." />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isCardUnpaid =
              order.payment?.method === 'card' && order.payment?.status !== 'paid';

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
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold text-forest">
                      {formatPrice(order.totalAmount)}
                    </div>
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
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
                  {order.items?.map((item) => {
                    const unitLabel = UNIT_LABELS[item.unit] ?? item.unit;
                    return (
                      <div
                        key={item._id}
                        className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                      >
                        <div>
                          <div className="font-semibold text-ink">{item.name}</div>
                          <div className="mt-0.5 text-slate-500">
                            {item.quantity} {unitLabel} × {formatPrice(item.price)}
                          </div>
                        </div>
                        <div className="text-right font-semibold text-forest">
                          {formatPrice(item.totalPrice)}
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
