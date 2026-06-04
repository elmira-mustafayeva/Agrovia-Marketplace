import { useSelector } from 'react-redux';
import { Clock3, PackageCheck, ShoppingCart } from 'lucide-react';
import { useOrders } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, SectionTitle, formatDate, formatPrice } from '../components/Ui';

export default function OrdersPage() {
  const { user } = useSelector((state) => state.auth);
  const ordersQuery = useOrders(Boolean(user));
  const orders = ordersQuery.data || [];

  return (
    <section className="section-shell py-10">
      <SectionTitle eyebrow="Sifarişlər" title="Mənim sifarişlərim" description="Bu səhifə `/api/orders/my` endpoint-inə bağlıdır." />
      {ordersQuery.isLoading ? (
        <LoadingGrid rows={2} />
      ) : orders.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Sifariş yoxdur" description="Sifariş verdikdən sonra burada görünəcək." />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="panel">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500">{order.orderNumber}</div>
                  <div className="mt-1 text-lg font-semibold text-ink">{order.status}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold text-forest">{formatPrice(order.totalAmount)}</div>
                  <div className="text-xs text-slate-400">{formatDate(order.createdAt)}</div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {order.items?.map((item) => (
                  <div key={item._id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                    <div className="font-semibold text-ink">{item.name}</div>
                    <div className="mt-1 text-slate-500">{item.quantity} × {formatPrice(item.price)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}