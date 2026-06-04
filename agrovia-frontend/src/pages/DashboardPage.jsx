import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/agroviaApi';
import { ActivityRow, EmptyState, LoadingGrid, SectionTitle, StatCard, formatPrice, roleLabel } from '../components/Ui';
import { ChartColumn, PackageSearch, Truck, Users, Wallet } from 'lucide-react';

const dashboardQueries = {
  seller: api.sellerDashboard,
  courier: api.courierDashboard,
  admin: api.adminDashboard
};

export default function DashboardPage() {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role || 'buyer';
  const queryFn = dashboardQueries[role] || api.sellerDashboard;

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', role],
    queryFn,
    enabled: Boolean(user)
  });

  const stats = dashboardQuery.data?.stats || {};

  if (!user) {
    return <EmptyState title="Daxil ol" description="Dashboard-i görmək üçün daxil olmalısan." />;
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Dashboard"
        title={`${roleLabel(role)} paneli`}
        description="Backend role endpoint-lərinə uyğun şəkildə göstərilir."
      />
      {dashboardQuery.isLoading ? (
        <LoadingGrid rows={1} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {'totalProducts' in stats ? <StatCard label="Məhsullar" value={stats.totalProducts || 0} icon={PackageSearch} /> : null}
            {'totalOrders' in stats ? <StatCard label="Sifarişlər" value={stats.totalOrders || 0} icon={Wallet} accent="amber" /> : null}
            {'totalDeliveries' in stats ? <StatCard label="Çatdırılmalar" value={stats.totalDeliveries || 0} icon={Truck} /> : null}
            {'revenue' in stats ? <StatCard label="Gəlir" value={formatPrice(stats.revenue || 0)} icon={ChartColumn} accent="amber" /> : null}
            {'users' in stats ? <StatCard label="İstifadəçi sayı" value={stats.users?.total || 0} icon={Users} /> : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="panel space-y-3">
              <div className="text-lg font-semibold text-ink">Sürətli məlumat</div>
              {role === 'seller' ? (
                <>
                  <ActivityRow title="Business name" meta={stats.businessName || '—'} value={stats.isVerified ? 'Verified' : 'Pending'} />
                  <ActivityRow title="Rating" meta="Satıcı reputasiyası" value={`${stats.rating || 0}/5`} />
                  <ActivityRow title="Pending orders" meta="Hazırda gözləyən sifarişlər" value={stats.pendingOrders || 0} />
                </>
              ) : null}
              {role === 'courier' ? (
                <>
                  <ActivityRow title="Vehicle" meta={stats.vehicleType || '—'} value={stats.isAvailable ? 'Available' : 'Busy'} />
                  <ActivityRow title="Rating" meta="Kuryer performansı" value={`${stats.rating || 0}/5`} />
                  <ActivityRow title="Pending deliveries" meta="Hazırda təyin olunmuş çatdırılmalar" value={stats.pendingDeliveries || 0} />
                </>
              ) : null}
              {role === 'admin' ? (
                <>
                  <ActivityRow title="Users" meta="Buyer / seller / courier" value={stats.users?.total || 0} />
                  <ActivityRow title="Pending products" meta="Admin təsdiqi gözləyənlər" value={stats.products?.pending || 0} />
                  <ActivityRow title="Revenue" meta="Completed payment total" value={formatPrice(stats.revenue || 0)} />
                </>
              ) : null}
            </div>
            <div className="panel space-y-4">
              <div className="text-lg font-semibold text-ink">Panel qısa xülasə</div>
              <p className="text-sm leading-6 text-slate-600">
                {role === 'admin' ? 'Admin paneli users, products, orders və revenue statistikalarını göstərir.' : role === 'seller' ? 'Seller paneli məhsullar, sifarişlər və satış performansını göstərir.' : 'Courier paneli qəbul edilmiş çatdırılmalar və availability statusunu göstərir.'}
              </p>
              <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Backend-də `{role}` üçün xüsusi endpoint aktivdir. UI həmin endpoint-dən gələn data-nı karta çevirir.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}