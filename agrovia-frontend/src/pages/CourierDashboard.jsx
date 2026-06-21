import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  CheckCircle2, Clock3, MessageCircle, Package, Truck, Wallet
} from 'lucide-react';
import { api } from '../api/agroviaApi';
import { useRegions } from '../hooks/useAgroviaData';
import { useOpenConversation } from '../hooks/useOpenConversation';
import { useTheme } from '../components/ThemeProvider';
import {
  ActivityRow, EmptyState, LoadingGrid, ORDER_STATUS_LABELS,
  SectionTitle, StatusBadge, formatPrice
} from '../components/Ui';

// Sky/teal accent palette for courier role
const SKY = { 500: '#06B6D4', 600: '#0891B2', 50: '#ECFEFF' };

function StatCard({ label, value, icon: Icon, accent = false }) {
  return (
    <div className="flex items-start gap-4 rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
      <div className={`rounded-xl p-3 ${accent ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-ink dark:text-white">{value}</div>
        <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{label}</div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-card dark:border-slate-700 dark:bg-slate-900">
      <div className="font-semibold text-ink dark:text-white">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="text-slate-600 dark:text-slate-300">
          {formatPrice(p.value)}
        </div>
      ))}
    </div>
  );
}

export default function CourierDashboard() {
  const { user } = useSelector((s) => s.auth);
  const queryClient = useQueryClient();
  const openChat = useOpenConversation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const allRegions = useRegions().data || [];
  const [selectedRegions, setSelectedRegions] = useState([]);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'courier'],
    queryFn: api.courierDashboard,
    enabled: !!user,
  });
  const stats = dashboardQuery.data?.stats || {};

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    enabled: true,
  });
  useEffect(() => {
    const regs = meQuery.data?.user?.courierInfo?.regions;
    if (Array.isArray(regs)) {
      setSelectedRegions(regs.map((r) => (typeof r === 'object' ? r._id : r)));
    }
  }, [meQuery.data]);

  const availableOrdersQuery = useQuery({
    queryKey: ['courier-available-orders'],
    queryFn: api.courierAvailableOrders,
    enabled: !!user,
  });

  const deliveriesQuery = useQuery({
    queryKey: ['courier-deliveries'],
    queryFn: api.courierOrders,
    enabled: !!user,
  });

  const saveRegionsMutation = useMutation({
    mutationFn: (regions) => api.updateCourierAvailability({ regions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['courier-available-orders'] });
    },
  });

  const acceptOrderMutation = useMutation({
    mutationFn: (id) => api.courierAcceptOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['courier-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'courier'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const markDeliveredMutation = useMutation({
    mutationFn: (id) => api.courierUpdateDeliveryStatus(id, 'delivered'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'courier'] });
      queryClient.invalidateQueries({ queryKey: ['courier-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['courier-available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const courierBusy = stats.isAvailable === false;
  const myDeliveries = deliveriesQuery.data?.orders || [];
  const availableOrders = availableOrdersQuery.data?.orders || [];

  // Chart: earnings breakdown from real stats
  const earningsData = [
    { name: 'Ümumi', value: stats.totalEarnings || 0 },
    { name: 'Ödəniləcək', value: stats.availablePayout || 0 },
    { name: 'Ödənilib', value: stats.paidPayout || 0 },
  ];
  const earningsHasData = earningsData.some((d) => d.value > 0);

  // Chart: deliveries count
  const deliveryData = [
    { name: 'Ümumi', value: stats.totalDeliveries || 0 },
    { name: 'Tamamlandı', value: stats.completedDeliveries || 0 },
    { name: 'Gözləyir', value: stats.pendingDeliveries || 0 },
  ];
  const deliveriesHasData = deliveryData.some((d) => d.value > 0);

  const axisColor = isDark ? '#64748b' : '#94a3b8';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <div className="section-shell py-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
          <Truck className="h-3.5 w-3.5" />Kuryer paneli
        </div>
        <h1 className="mt-2 text-3xl font-bold text-ink dark:text-white">
          Salam, {user?.firstName || 'Kuryer'}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Çatdırılmaları idarə edin, gəlirinizi izləyin.
        </p>
      </div>

      {dashboardQuery.isLoading ? (
        <LoadingGrid rows={4} />
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Ümumi çatdırılma" value={stats.totalDeliveries || 0} icon={Package} />
            <StatCard label="Tamamlandı" value={stats.completedDeliveries || 0} icon={CheckCircle2} accent />
            <StatCard label="Ümumi qazanc" value={formatPrice(stats.totalEarnings || 0)} icon={Wallet} accent />
            <StatCard label="Ödəniləcək" value={formatPrice(stats.availablePayout || 0)} icon={Clock3} />
          </div>

          {/* Charts row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Earnings chart */}
            <div className="rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 text-sm font-bold text-ink dark:text-white">Qazanc xülasəsi</div>
              {earningsHasData ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={earningsData} barSize={36}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `${v} ₼`} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={52} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {earningsData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? SKY[500] : i === 1 ? SKY[600] : '#10B981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[180px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                  Hələ qazanc yoxdur
                </div>
              )}
            </div>

            {/* Deliveries chart */}
            <div className="rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 text-sm font-bold text-ink dark:text-white">Çatdırılma statistikası</div>
              {deliveriesHasData ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={deliveryData} barSize={36}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-card dark:border-slate-700 dark:bg-slate-900">
                        <div className="font-semibold dark:text-white">{label}</div>
                        <div className="text-slate-600 dark:text-slate-300">{payload[0].value} ədəd</div>
                      </div>
                    ) : null} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {deliveryData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? SKY[500] : i === 1 ? '#10B981' : '#F59E0B'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[180px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                  Hələ çatdırılma yoxdur
                </div>
              )}
            </div>
          </div>

          {/* Quick info */}
          <div className="rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 text-sm font-bold text-ink dark:text-white">Hesab məlumatları</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ActivityRow title="Nəqliyyat" meta="Kuryer tipi" value={stats.vehicleType || '—'} icon={Truck} />
              <ActivityRow title="Mövcudluq" meta="Hazırkı vəziyyət" value={stats.isAvailable ? 'Mövcuddur' : 'Məşğuldur'} icon={CheckCircle2} />
              <ActivityRow title="Reytinq" meta="Kuryer performansı" value={`${stats.rating || 0}/5`} icon={Package} />
              <ActivityRow title="Ödənilib" meta="Tamamlanmış ödənişlər" value={formatPrice(stats.paidPayout || 0)} icon={Wallet} />
            </div>
          </div>

          {/* Service regions */}
          <div className="rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-1 text-sm font-bold text-ink dark:text-white">Xidmət regionları</div>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Sifariş alacağınız regionları seçin. Yalnız bu regionlardakı hazır sifarişlər görünəcək.
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-3 dark:border-slate-800">
              {allRegions.map((r) => {
                const checked = selectedRegions.includes(r._id);
                return (
                  <label key={r._id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setSelectedRegions((cur) =>
                        e.target.checked ? [...cur, r._id] : cur.filter((id) => id !== r._id)
                      )}
                      className="accent-cyan-500"
                    />
                    {r.name}
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
                disabled={saveRegionsMutation.isPending}
                onClick={() => saveRegionsMutation.mutate(selectedRegions)}
              >
                {saveRegionsMutation.isPending ? 'Saxlanılır...' : 'Regionları yadda saxla'}
              </button>
              {saveRegionsMutation.isSuccess ? (
                <span className="text-sm text-emerald-600 dark:text-emerald-400">Yeniləndi.</span>
              ) : null}
            </div>
          </div>

          {/* My deliveries */}
          <div className="rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 text-sm font-bold text-ink dark:text-white">Mənim çatdırılmalarım</div>
            {deliveriesQuery.isLoading ? (
              <LoadingGrid rows={1} />
            ) : myDeliveries.length === 0 ? (
              <EmptyState icon={Package} title="Aktiv çatdırılma yoxdur" description="Hazırda sizə təyin olunmuş çatdırılma yoxdur." />
            ) : (
              <div className="space-y-3">
                {myDeliveries.map((order) => (
                  <div key={order._id} className="rounded-[14px] border border-slate-100 p-4 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink dark:text-white">#{order.orderNumber || order._id.slice(-6)}</span>
                          <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                        </div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {order.deliveryAddress?.region?.name || '—'}
                          {order.deliveryAddress?.street ? ` • ${order.deliveryAddress.street}` : ''}
                        </div>
                        <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {order.buyer?.firstName} {order.buyer?.lastName}
                          {order.buyer?.phone ? ` • ${order.buyer.phone}` : ''}
                        </div>
                        {order.items?.length ? (
                          <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                            {order.items.map((it) => `${it.name} ×${it.quantity}`).join(', ')}
                          </div>
                        ) : null}
                        <div className="mt-1 text-sm font-bold text-cyan-600 dark:text-cyan-400">
                          Qazanc: {formatPrice(order.payout?.courierEarning || 0)}
                        </div>
                      </div>
                      {order.status === 'out_for_delivery' ? (
                        <button
                          type="button"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          disabled={markDeliveredMutation.isPending}
                          onClick={() => markDeliveredMutation.mutate(order._id)}
                        >
                          {markDeliveredMutation.isPending ? '...' : 'Çatdırıldı'}
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={() => openChat({ type: 'buyer_courier', orderId: order._id })}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />Alıcıya yaz
                      </button>
                      <button type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={() => openChat({ type: 'seller_courier', orderId: order._id })}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />Satıcıya yaz
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {markDeliveredMutation.isError ? (
              <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
                {markDeliveredMutation.error?.response?.data?.message || 'Status yenilənmədi.'}
              </div>
            ) : null}
          </div>

          {/* Available orders */}
          <div className="rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 text-sm font-bold text-ink dark:text-white">Mövcud sifarişlər</div>
            {courierBusy ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
                Aktiv çatdırılmanız var. Yeni sifariş qəbul etmək üçün əvvəlcə cari çatdırılmanı tamamlayın.
              </div>
            ) : null}
            {availableOrdersQuery.isLoading ? (
              <LoadingGrid rows={1} />
            ) : availableOrdersQuery.data?.reason === 'NO_REGIONS' ? (
              <EmptyState icon={Truck} title="Xidmət regionu seçilməyib" description="Sifarişləri görmək üçün yuxarıdan ən azı bir xidmət regionu seçin." />
            ) : availableOrders.length === 0 ? (
              <EmptyState icon={Package} title="Mövcud sifariş yoxdur" description="Hazırda regionlarınıza uyğun hazır sifariş yoxdur." />
            ) : (
              <div className="space-y-3">
                {availableOrders.map((order) => (
                  <div key={order._id} className="rounded-[14px] border border-slate-100 p-4 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-ink dark:text-white">#{order.orderNumber || order._id.slice(-6)}</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {order.deliveryAddress?.region?.name || '—'}
                          {order.deliveryAddress?.street ? ` • ${order.deliveryAddress.street}` : ''}
                        </div>
                        <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {order.buyer?.firstName} {order.buyer?.lastName}
                        </div>
                        <div className="mt-1 text-sm font-bold text-ink dark:text-white">{formatPrice(order.totalAmount)}</div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
                        disabled={acceptOrderMutation.isPending || courierBusy}
                        onClick={() => acceptOrderMutation.mutate(order._id)}
                      >
                        {acceptOrderMutation.isPending ? '...' : courierBusy ? 'Məşğulsunuz' : 'Qəbul et'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {acceptOrderMutation.isError ? (
              <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
                {acceptOrderMutation.error?.response?.data?.message || 'Sifariş qəbul edilmədi.'}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
