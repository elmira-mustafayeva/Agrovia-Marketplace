import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Camera, CheckCircle2, ChevronRight, Clock3,
  Eye, EyeOff,
  Headphones, LayoutDashboard, LogOut,
  MapPin, MessageCircle, Package,
  Settings, Star, Truck, User, Wallet, X,
} from 'lucide-react';
import { api } from '../api/agroviaApi';
import { clearCredentials } from '../features/auth/authSlice';
import { useRegions } from '../hooks/useAgroviaData';
import {
  EmptyState, LoadingGrid, ORDER_STATUS_LABELS,
  StatusBadge, formatDate, formatPrice,
} from '../components/Ui';
import MessagesPage from './MessagesPage';
import SupportPage from './SupportPage';

// ─── Constants ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'overview',   icon: LayoutDashboard, label: 'Ümumi baxış' },
  { key: 'deliveries', icon: Truck,           label: 'Çatdırılmalarım' },
  { key: 'available',  icon: Package,         label: 'Mövcud sifarişlər' },
  { key: 'regions',    icon: MapPin,          label: 'Regionlar' },
  { key: 'earnings',   icon: Wallet,          label: 'Qazancım' },
  { key: 'messages',   icon: MessageCircle,   label: 'Mesajlar' },
  { key: 'profile',    icon: User,            label: 'Profil' },
  { key: 'settings',   icon: Settings,        label: 'Tənzimləmələr' },
];

const BREADCRUMBS = {
  overview:    ['Ümumi baxış'],
  deliveries:  ['Çatdırılmalar', 'Çatdırılma idarəetməsi'],
  available:   ['Mövcud sifarişlər'],
  regions:     ['Regionlar', 'Xidmət regionları'],
  earnings:    ['Qazancım'],
  messages:    ['Mesajlar', 'Söhbətlər'],
  support:     ['Dəstək', 'Dəstək mərkəzi'],
  profile:     ['Profil', 'Kuryer məlumatları'],
  settings:    ['Tənzimləmələr'],
};

// ─── Shared helpers ────────────────────────────────────────────────────────────

function FormField({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Stats row ─────────────────────────────────────────────────────────────────

function StatsRow({ stats }) {
  const cards = [
    { icon: Package,      iconCls: 'bg-cyan-100 text-cyan-600',     label: 'Ümumi çatdırılma', value: stats.totalDeliveries ?? 0 },
    { icon: CheckCircle2, iconCls: 'bg-emerald-100 text-emerald-600', label: 'Tamamlandı',       value: stats.completedDeliveries ?? 0 },
    { icon: Wallet,       iconCls: 'bg-violet-100 text-violet-600', label: 'Ümumi qazanc',     value: formatPrice(stats.totalEarnings ?? 0) },
    { icon: Clock3,       iconCls: 'bg-amber-100 text-amber-600',   label: 'Ödəniləcək',       value: formatPrice(stats.availablePayout ?? 0) },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map(({ icon: Icon, iconCls, label, value }) => (
        <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className={`inline-flex items-center justify-center rounded-xl p-2.5 ${iconCls}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="mt-3 text-2xl font-bold text-ink">{value}</div>
          <div className="mt-0.5 text-sm text-slate-500">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ section, onSection }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <aside className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img src="/agrovia-logo.svg" alt="Agrovia" className="h-9 w-9 rounded-xl object-contain" />
        <div>
          <div className="text-sm font-bold text-ink">Agrovia</div>
          <div className="text-[10px] text-slate-400">Kuryer Paneli</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 pb-2">
        {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
          const active = section === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSection(key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? 'bg-cyan-600 text-white shadow-lift' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="space-y-2.5 px-3 pb-4 pt-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white shadow-sm">
              <Headphones className="h-3.5 w-3.5 text-cyan-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-ink">Dəstək mərkəzi</div>
              <div className="text-[10px] text-slate-400">Köməyə ehtiyacınız var?</div>
            </div>
          </div>
          <button type="button" onClick={() => onSection('support')} className="mt-2 text-xs font-medium text-cyan-600 hover:underline">
            Bizimlə əlaqə
          </button>
        </div>

        <button
          type="button"
          onClick={() => { dispatch(clearCredentials()); navigate('/'); }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-rose-600"
        >
          <LogOut className="h-3.5 w-3.5" />
          Çıxış
        </button>
      </div>
    </aside>
  );
}

// ─── Top bar ───────────────────────────────────────────────────────────────────

function TopBar({ section, liveUser }) {
  const { user: authUser } = useSelector(state => state.auth);
  const queryClient = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    if (!notifOpen) return;
    const handle = e => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [notifOpen]);

  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications({ limit: 10 }),
    enabled: Boolean(authUser),
    select: d => ({ notifications: d.notifications || [], unreadCount: d.unreadCount ?? 0 }),
    refetchInterval: 60_000,
  });

  const markAllMut = useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneMut = useMutation({
    mutationFn: id => api.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = notifQuery.data?.notifications ?? [];
  const unreadCount = notifQuery.data?.unreadCount ?? 0;
  const crumbs = BREADCRUMBS[section] ?? [section];
  const initials = `${liveUser?.firstName?.[0] ?? ''}${liveUser?.lastName?.[0] ?? ''}`.toUpperCase() || 'KY';

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
            <span className={i === crumbs.length - 1 ? 'font-semibold text-ink' : 'text-slate-400'}>{crumb}</span>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => setNotifOpen(v => !v)}
            className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-600 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl" style={{ zIndex: 70 }}>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  Bildirişlər
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-cyan-600/10 px-1.5 py-0.5 text-xs font-semibold text-cyan-600">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllMut.mutate()}
                      disabled={markAllMut.isPending}
                      className="text-xs text-cyan-600 hover:underline disabled:opacity-50"
                    >
                      Hamısını oxu
                    </button>
                  )}
                  <button type="button" onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-ink">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifQuery.isLoading ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">Bildiriş yoxdur</div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n._id}
                      type="button"
                      onClick={() => { if (!n.isRead) markOneMut.mutate(n._id); }}
                      className={`w-full border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-slate-50 ${!n.isRead ? 'bg-blue-50/40' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead
                          ? <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-600" />
                          : <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />}
                        <div className="min-w-0">
                          <div className={`text-sm font-medium leading-snug ${n.isRead ? 'text-slate-600' : 'text-ink'}`}>
                            {n.title}
                          </div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-slate-400">{n.message}</div>
                          <div className="mt-1 text-[10px] text-slate-300">{formatDate(n.createdAt)}</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 p-3">
                <div className="text-center text-xs text-slate-400">Son 10 bildiriş göstərilir</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid h-8 w-8 place-items-center rounded-full bg-cyan-600 text-xs font-bold text-white">
          {initials}
        </div>
      </div>
    </header>
  );
}

// ─── Overview ──────────────────────────────────────────────────────────────────

function OverviewSection({ stats, deliveries, onSection }) {
  return (
    <div className="space-y-6">
      <StatsRow stats={stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 text-base font-semibold text-ink">Aktiv çatdırılmalar</div>
          {deliveries.filter(o => o.status === 'out_for_delivery').length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Aktiv çatdırılma yoxdur</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {deliveries.filter(o => o.status === 'out_for_delivery').slice(0, 5).map(order => (
                <div key={order._id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <div className="font-medium text-ink">#{order.orderNumber || order._id.slice(-6)}</div>
                    <div className="text-xs text-slate-400">{order.deliveryAddress?.region?.name || '—'}</div>
                  </div>
                  <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 text-base font-semibold text-ink">Kuryer məlumatları</div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Nəqliyyat</span>
              <span className="font-medium text-ink">{stats.vehicleType || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mövcudluq</span>
              <span className={`font-medium ${stats.isAvailable ? 'text-emerald-600' : 'text-amber-600'}`}>
                {stats.isAvailable ? 'Mövcuddur' : 'Məşğuldur'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reytinq</span>
              <span className="flex items-center gap-1 font-medium text-ink">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {stats.rating || 0}/5
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ödənilib</span>
              <span className="font-medium text-ink">{formatPrice(stats.paidPayout || 0)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSection('deliveries')}
            className="mt-4 text-xs font-medium text-cyan-600 hover:underline"
          >
            Bütün çatdırılmalar →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Deliveries ────────────────────────────────────────────────────────────────

function DeliveriesSection({ deliveries, isLoading, markDeliveredMutation, openChat }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 text-base font-semibold text-ink">Mənim çatdırılmalarım</div>
        {isLoading ? (
          <LoadingGrid rows={3} />
        ) : deliveries.length === 0 ? (
          <EmptyState icon={Package} title="Aktiv çatdırılma yoxdur" description="Hazırda sizə təyin olunmuş çatdırılma yoxdur." />
        ) : (
          <div className="space-y-3">
            {deliveries.map(order => (
              <div key={order._id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">#{order.orderNumber || order._id.slice(-6)}</span>
                      <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {order.deliveryAddress?.region?.name || '—'}
                      {order.deliveryAddress?.street ? ` • ${order.deliveryAddress.street}` : ''}
                    </div>
                    <div className="mt-0.5 text-sm text-slate-500">
                      {order.buyer?.firstName} {order.buyer?.lastName}
                      {order.buyer?.phone ? ` • ${order.buyer.phone}` : ''}
                    </div>
                    {order.items?.length ? (
                      <div className="mt-0.5 text-xs text-slate-400">
                        {order.items.map(it => `${it.name} ×${it.quantity}`).join(', ')}
                      </div>
                    ) : null}
                    <div className="mt-1 text-sm font-bold text-cyan-600">
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
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                    onClick={() => openChat({ type: 'buyer_courier', orderId: order._id })}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />Alıcıya yaz
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
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
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {markDeliveredMutation.error?.response?.data?.message || 'Status yenilənmədi.'}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Available orders ──────────────────────────────────────────────────────────

function AvailableSection({ availableOrders, isLoading, courierBusy, availableData, acceptOrderMutation }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 text-base font-semibold text-ink">Mövcud sifarişlər</div>
      {courierBusy ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Aktiv çatdırılmanız var. Yeni sifariş qəbul etmək üçün əvvəlcə cari çatdırılmanı tamamlayın.
        </div>
      ) : null}
      {isLoading ? (
        <LoadingGrid rows={3} />
      ) : availableData?.reason === 'NO_REGIONS' ? (
        <EmptyState icon={MapPin} title="Xidmət regionu seçilməyib" description="Sifarişləri görmək üçün Regionlar bölməsindən ən azı bir xidmət regionu seçin." />
      ) : availableOrders.length === 0 ? (
        <EmptyState icon={Package} title="Mövcud sifariş yoxdur" description="Hazırda regionlarınıza uyğun hazır sifariş yoxdur." />
      ) : (
        <div className="space-y-3">
          {availableOrders.map(order => (
            <div key={order._id} className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-ink">#{order.orderNumber || order._id.slice(-6)}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {order.deliveryAddress?.region?.name || '—'}
                    {order.deliveryAddress?.street ? ` • ${order.deliveryAddress.street}` : ''}
                  </div>
                  <div className="mt-0.5 text-sm text-slate-500">
                    {order.buyer?.firstName} {order.buyer?.lastName}
                  </div>
                  <div className="mt-1 text-sm font-bold text-ink">{formatPrice(order.totalAmount)}</div>
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
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {acceptOrderMutation.error?.response?.data?.message || 'Sifariş qəbul edilmədi.'}
        </div>
      ) : null}
    </div>
  );
}

// ─── Regions ───────────────────────────────────────────────────────────────────

function RegionsSection({ allRegions, selectedRegions, setSelectedRegions, saveRegionsMutation }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-1 text-base font-semibold text-ink">Xidmət regionları</div>
      <p className="mb-5 text-sm text-slate-500">
        Sifariş alacağınız regionları seçin. Yalnız bu regionlardakı hazır sifarişlər görünəcək.
      </p>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-3">
        {allRegions.map(r => {
          const checked = selectedRegions.includes(r._id);
          return (
            <label key={r._id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setSelectedRegions(cur =>
                  e.target.checked ? [...cur, r._id] : cur.filter(id => id !== r._id)
                )}
                className="accent-cyan-600"
              />
              {r.name}
            </label>
          );
        })}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
          disabled={saveRegionsMutation.isPending}
          onClick={() => saveRegionsMutation.mutate(selectedRegions)}
        >
          {saveRegionsMutation.isPending ? 'Saxlanılır...' : 'Regionları yadda saxla'}
        </button>
        {saveRegionsMutation.isSuccess ? (
          <span className="text-sm text-emerald-600">Yeniləndi.</span>
        ) : null}
      </div>
    </div>
  );
}

// ─── Earnings ──────────────────────────────────────────────────────────────────

function EarningsSection({ stats }) {
  const rows = [
    { label: 'Ümumi qazanc',    value: formatPrice(stats.totalEarnings ?? 0),    cls: 'text-ink font-bold' },
    { label: 'Ödəniləcək',      value: formatPrice(stats.availablePayout ?? 0), cls: 'text-cyan-600 font-semibold' },
    { label: 'Ödənilib',        value: formatPrice(stats.paidPayout ?? 0),      cls: 'text-emerald-600 font-semibold' },
    { label: 'Tamamlanan say',  value: stats.completedDeliveries ?? 0,          cls: 'text-ink font-medium' },
    { label: 'Reytinq',         value: `${stats.rating ?? 0} / 5`,              cls: 'text-amber-600 font-medium' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 text-base font-semibold text-ink">Qazanc xülasəsi</div>
        <div className="divide-y divide-slate-50">
          {rows.map(({ label, value, cls }) => (
            <div key={label} className="flex items-center justify-between py-3 text-sm">
              <span className="text-slate-500">{label}</span>
              <span className={cls}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-2 text-base font-semibold text-ink">Ödəniş məlumatı</div>
        <p className="text-sm text-slate-500">
          Ödəniləcək məbləğ hər çatdırılma tamamlandıqda hesablanır. Admin ödənişi işlədikdə balansınız sıfırlanır.
        </p>
      </div>
    </div>
  );
}

// ─── Profile ───────────────────────────────────────────────────────────────────

function ProfileSection({ liveUser, stats, regionMap }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const avatarMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('avatar', file);
      return api.uploadAvatar(fd);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 text-base font-semibold text-ink">Kuryer məlumatları</div>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {liveUser?.avatar ? (
              <img src={liveUser.avatar} alt="Avatar" className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-cyan-600 text-xl font-bold text-white">
                {`${liveUser?.firstName?.[0] ?? ''}${liveUser?.lastName?.[0] ?? ''}`.toUpperCase() || 'KY'}
              </div>
            )}
            <button
              type="button"
              disabled={avatarMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-ink disabled:opacity-60"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) avatarMutation.mutate(f); }}
            />
          </div>
          <div>
            <div className="text-lg font-bold text-ink">
              {liveUser?.firstName} {liveUser?.lastName}
            </div>
            <div className="text-sm text-slate-500">{liveUser?.email}</div>
            {liveUser?.phone && <div className="text-sm text-slate-500">{liveUser.phone}</div>}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Nəqliyyat növü', value: stats.vehicleType || liveUser?.courierInfo?.vehicleType || '—' },
            { label: 'Mövcudluq',      value: (stats.isAvailable ?? liveUser?.courierInfo?.isAvailable) ? 'Mövcuddur' : 'Məşğuldur' },
            { label: 'Reytinq',        value: `${stats.rating ?? 0} / 5` },
            { label: 'Region',         value: liveUser?.address?.region?.name || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
              <div className="mt-1 text-sm font-medium text-ink">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {liveUser?.courierInfo?.regions?.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-3 text-base font-semibold text-ink">Xidmət regionları</div>
          <div className="flex flex-wrap gap-2">
            {liveUser.courierInfo.regions.map(r => {
              const id = typeof r === 'object' ? r._id : r;
              const name = typeof r === 'object' ? r.name : (regionMap?.[String(r)] || 'Region');
              return (
                <span key={id} className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings ──────────────────────────────────────────────────────────────────

function SettingsSection() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);

  const mutation = useMutation({
    mutationFn: api.changePassword,
    onSuccess: () => {
      setMsg('Şifrə uğurla dəyişdirildi.');
      setMsgOk(true);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: err => {
      setMsg(err?.response?.data?.message || 'Xəta baş verdi.');
      setMsgOk(false);
    },
  });

  const sf = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = e => {
    e.preventDefault();
    setMsg('');
    if (form.newPassword !== form.confirmPassword) {
      setMsg('Yeni şifrələr uyğun gəlmir.');
      setMsgOk(false);
      return;
    }
    if (form.newPassword.length < 8) {
      setMsg('Yeni şifrə minimum 8 simvol olmalıdır.');
      setMsgOk(false);
      return;
    }
    mutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 text-base font-semibold text-ink">Şifrəni dəyiş</div>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <FormField label="Cari şifrə" required>
            <div className="relative">
              <input type={showCur ? 'text' : 'password'} className="input-shell w-full pr-10" value={form.currentPassword} onChange={e => sf('currentPassword', e.target.value)} required />
              <button type="button" onClick={() => setShowCur(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink">
                {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>
          <FormField label="Yeni şifrə" required>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} className="input-shell w-full pr-10" value={form.newPassword} onChange={e => sf('newPassword', e.target.value)} required />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>
          <FormField label="Yeni şifrəni təkrarlayın" required>
            <input type="password" className="input-shell w-full" value={form.confirmPassword} onChange={e => sf('confirmPassword', e.target.value)} required />
          </FormField>
          {msg ? (
            <div className={`rounded-xl border px-4 py-3 text-sm ${msgOk ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {msg}
            </div>
          ) : null}
          <button type="submit" disabled={mutation.isPending} className="btn-primary px-8 py-2.5 text-sm disabled:opacity-60">
            {mutation.isPending ? 'Dəyişdirilir...' : 'Şifrəni dəyiş'}
          </button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: 'Bildiriş parametrləri', desc: 'Email və tətbiq bildirişlərini idarə edin' },
          { title: 'Məxfilik parametrləri', desc: 'Profil görünüşünü tənzimləyin' },
        ].map(item => (
          <div key={item.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-ink">{item.title}</div>
                <div className="mt-1 text-xs text-slate-400">{item.desc}</div>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">Tezliklə</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function CourierDashboard() {
  const { user } = useSelector(s => s.auth);
  const queryClient = useQueryClient();
  const [section, setSection] = useState('overview');
  const [, setSearchParams] = useSearchParams();
  const [selectedRegions, setSelectedRegions] = useState([]);

  const allRegions = useRegions().data || [];
  const regionMap = Object.fromEntries(allRegions.map(r => [String(r._id), r.name]));

  const handleDashboardChat = async (payload) => {
    try {
      const data = await api.createConversation(payload);
      setSearchParams({ c: data.conversation._id });
      setSection('messages');
    } catch (e) {
      alert(e?.response?.data?.message || 'Söhbət açıla bilmədi.');
    }
  };

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
      setSelectedRegions(regs.map(r => (typeof r === 'object' ? r._id : r)));
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
    mutationFn: regions => api.updateCourierAvailability({ regions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['courier-available-orders'] });
    },
  });

  const acceptOrderMutation = useMutation({
    mutationFn: id => api.courierAcceptOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['courier-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'courier'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const markDeliveredMutation = useMutation({
    mutationFn: id => api.courierUpdateDeliveryStatus(id, 'delivered'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'courier'] });
      queryClient.invalidateQueries({ queryKey: ['courier-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['courier-available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const myDeliveries = deliveriesQuery.data?.orders || [];
  const availableOrders = availableOrdersQuery.data?.orders || [];
  const courierBusy = stats.isAvailable === false;
  const liveUser = meQuery.data?.user ?? user;

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-50">
      <Sidebar section={section} onSection={setSection} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar section={section} liveUser={liveUser} />

        <main className={`flex-1 p-6 ${(section === 'messages' || section === 'support') ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {dashboardQuery.isLoading && section !== 'messages' ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
              ))}
            </div>
          ) : (
            <>
              {section === 'overview' && (
                <OverviewSection
                  stats={stats}
                  deliveries={myDeliveries}
                  onSection={setSection}
                />
              )}

              {section === 'deliveries' && (
                <DeliveriesSection
                  deliveries={myDeliveries}
                  isLoading={deliveriesQuery.isLoading}
                  markDeliveredMutation={markDeliveredMutation}
                  openChat={handleDashboardChat}
                />
              )}

              {section === 'available' && (
                <AvailableSection
                  availableOrders={availableOrders}
                  isLoading={availableOrdersQuery.isLoading}
                  courierBusy={courierBusy}
                  availableData={availableOrdersQuery.data}
                  acceptOrderMutation={acceptOrderMutation}
                />
              )}

              {section === 'regions' && (
                <RegionsSection
                  allRegions={allRegions}
                  selectedRegions={selectedRegions}
                  setSelectedRegions={setSelectedRegions}
                  saveRegionsMutation={saveRegionsMutation}
                />
              )}

              {section === 'earnings' && <EarningsSection stats={stats} />}

              {section === 'messages' && <div className="-m-6 h-full"><MessagesPage embedded /></div>}

              {section === 'support' && <div className="-m-6 h-full"><SupportPage embedded /></div>}

              {section === 'profile' && <ProfileSection liveUser={liveUser} stats={stats} regionMap={regionMap} />}

              {section === 'settings' && <SettingsSection />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
