import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronRight,
  ClipboardList,
  Clock3,
  Eye,
  EyeOff,
  Headphones,
  LayoutDashboard,
  LogOut,
  Package,
  Pencil,
  Percent,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Sprout,
  Star,
  MessageCircle,
  LifeBuoy,
  Trash2,
  Upload,
  User,
  Wallet,
  Warehouse,
  X,
} from 'lucide-react';
import { api } from '../api/agroviaApi';
import { clearCredentials, setCredentials } from '../features/auth/authSlice';
import { useSellerOrders, useSellerReviews, useUpdateOrderStatus } from '../hooks/useAgroviaData';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  StatusBadge,
  Stars,
  UNIT_LABELS,
  formatDate,
  formatPrice,
  getProductImage,
} from '../components/Ui';
import LocationPicker from '../components/LocationPicker';
import { useOpenConversation } from '../hooks/useOpenConversation';

// ─── Constants ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'overview',    icon: LayoutDashboard, label: 'Ümumi baxış' },
  { key: 'products',    icon: Package,         label: 'Məhsullarım' },
  { key: 'add-product', icon: Plus,            label: 'Məhsul əlavə et' },
  { key: 'orders',      icon: ShoppingBag,     label: 'Sifarişlər' },
  { key: 'reviews',     icon: Star,            label: 'Rəylər' },
  { key: 'profile',     icon: User,            label: 'Profil' },
  { key: 'settings',    icon: Settings,        label: 'Tənzimləmələr' },
];

const LOCKED_ITEMS = [
  { icon: Warehouse, label: 'Anbar' },
  { icon: BarChart3, label: 'Analitika' },
];

const BREADCRUMBS = {
  overview:       ['Ümumi baxış'],
  products:       ['Məhsullar', 'Məhsul idarəetməsi'],
  'add-product':  ['Məhsullar', 'Yeni məhsul'],
  orders:         ['Sifarişlər', 'Sifariş idarəetməsi'],
  reviews:        ['Rəylər', 'Məhsul rəyləri'],
  profile:        ['Profil', 'Satıcı məlumatları'],
  settings:       ['Tənzimləmələr'],
  'coming-soon':  ['Tezliklə'],
};

const PRODUCT_STATUS_MAP = {
  active:       { label: 'Aktiv',           cls: 'bg-emerald-100 text-emerald-700' },
  inactive:     { label: 'Deaktiv',         cls: 'bg-slate-100 text-slate-500' },
  pending:      { label: 'Təsdiq gözləyir', cls: 'bg-amber-100 text-amber-700' },
  rejected:     { label: 'Rədd edildi',     cls: 'bg-rose-100 text-rose-700' },
  out_of_stock: { label: 'Stok bitib',      cls: 'bg-orange-100 text-orange-700' },
};

const SALE_TYPE_LABELS = {
  retail:    'Pərakəndə',
  wholesale: 'Topdan',
  both:      'Topdan və pərakəndə',
};

const NEXT_ORDER_STATUS = {
  pending:   { status: 'confirmed', label: 'Təsdiqlə' },
  confirmed: { status: 'preparing', label: 'Hazırlamağa başla' },
  preparing: { status: 'ready',     label: 'Hazırdır' },
};

const EMPTY_FORM = {
  name: '', description: '', price: '', unit: 'kg',
  saleType: 'retail', minOrderQuantity: '1',
  stockQuantity: '1', category: '', discountPercentage: '0',
};

const EMPTY_FILTERS = { status: 'all', saleType: 'all', category: 'all', stock: 'all' };

// ─── Shared helpers ────────────────────────────────────────────────────────────

function FormField({ label, helper, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {helper ? <p className="text-[11px] leading-relaxed text-slate-400">{helper}</p> : null}
      {children}
    </div>
  );
}

function SkelRow() {
  return <div className="h-14 animate-pulse rounded-xl bg-slate-100" />;
}

function ProductStatusBadge({ status }) {
  const s = PRODUCT_STATUS_MAP[status] ?? PRODUCT_STATUS_MAP.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

// Reviews written for this seller's products (GET /api/seller/reviews — backend-filtered).
function SellerReviewsSection() {
  const reviewsQuery = useSellerReviews(true);
  const reviews = reviewsQuery.data || [];

  if (reviewsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <SkelRow />
        <SkelRow />
        <SkelRow />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <Star className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">Məhsullarınıza hələ rəy yazılmayıb.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div key={review._id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex gap-4">
            <img
              src={getProductImage(review.product)}
              alt={review.product?.name}
              className="h-16 w-16 shrink-0 rounded-xl border border-slate-100 object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-ink">{review.product?.name || 'Məhsul'}</div>
                <Stars value={review.productRating} />
              </div>
              <div className="mt-0.5 text-sm text-slate-500">
                {review.user?.firstName} {review.user?.lastName}
                {review.order?.orderNumber ? ` • #${review.order.orderNumber}` : ''}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{review.productReview}</p>
              <div className="mt-2 text-xs text-slate-400">{formatDate(review.createdAt)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Modal({ title, onClose, children, width = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className={`relative w-full ${width} rounded-2xl border border-slate-100 bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="text-base font-semibold text-ink">{title}</div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TagInput({ tags, setTags }) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim().replace(/,$/, '');
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setInput('');
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {t}
            <button type="button" onClick={() => setTags(p => p.filter(x => x !== t))} className="text-slate-400 hover:text-slate-700">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          className="min-w-[100px] flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          placeholder={tags.length === 0 ? 'Tag yazıb Enter basın...' : ''}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
          onBlur={add}
        />
      </div>
    </div>
  );
}

// Card defined at module level to avoid remount-on-every-render inside AddProductForm
function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-5 space-y-4">
      <div className="text-sm font-semibold text-ink">{title}</div>
      {children}
    </div>
  );
}

// ─── Stats row ─────────────────────────────────────────────────────────────────

function StatsRow({ stats }) {
  const cards = [
    { icon: Package,       iconCls: 'bg-blue-100 text-blue-600',       label: 'Aktiv məhsullar',     value: stats.totalProducts ?? 0 },
    { icon: ClipboardList, iconCls: 'bg-amber-100 text-amber-600',     label: 'Gözləyən sifarişlər', value: stats.pendingOrders ?? 0 },
    { icon: ShoppingBag,   iconCls: 'bg-emerald-100 text-emerald-600', label: 'Ümumi sifarişlər',    value: stats.totalOrders ?? 0 },
    { icon: Wallet,        iconCls: 'bg-purple-100 text-purple-600',   label: 'Gəlir',               value: formatPrice(stats.revenue ?? 0) },
    { icon: Wallet,        iconCls: 'bg-forest/10 text-forest',        label: 'Ödəniləcək',          value: formatPrice(stats.payable ?? 0) },
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
  const openChat = useOpenConversation();

  return (
    <aside className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-forest text-white shadow-lift">
          <Sprout className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold text-ink">agrovia</div>
          <div className="text-[10px] text-slate-400">Satıcı Paneli</div>
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
                active ? 'bg-forest text-white shadow-lift' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => navigate('/messages')}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />Mesajlar
        </button>
        <button
          type="button"
          onClick={() => openChat({ type: 'support' })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink"
        >
          <LifeBuoy className="h-4 w-4 shrink-0" />Dəstək
        </button>

        <div className="my-2 h-px bg-slate-100" />

        {LOCKED_ITEMS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            onClick={() => onSection('coming-soon')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">Tez</span>
          </button>
        ))}
      </nav>

      <div className="space-y-2.5 px-3 pb-4 pt-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white shadow-sm">
              <Headphones className="h-3.5 w-3.5 text-forest" />
            </div>
            <div>
              <div className="text-xs font-semibold text-ink">Dəstək mərkəzi</div>
              <div className="text-[10px] text-slate-400">Köməyə ehtiyacınız var?</div>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/')} className="mt-2 text-xs font-medium text-forest hover:underline">
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

  // Close dropdown on outside click
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
  const initials = `${liveUser?.firstName?.[0] ?? ''}${liveUser?.lastName?.[0] ?? ''}`.toUpperCase() || 'YF';

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
        {/* Bell with notification dropdown */}
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => setNotifOpen(v => !v)}
            className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-forest text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl"
              style={{ zIndex: 70 }}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  Bildirişlər
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-forest/10 px-1.5 py-0.5 text-xs font-semibold text-forest">
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
                      className="text-xs text-forest hover:underline disabled:opacity-50"
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
                          ? <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
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
            </div>
          )}
        </div>

        {/* Avatar initials — uses liveUser so updates immediately after profile save */}
        <div className="grid h-8 w-8 place-items-center rounded-full bg-forest text-xs font-bold text-white">
          {initials}
        </div>
      </div>
    </header>
  );
}

// ─── Overview ──────────────────────────────────────────────────────────────────

function OverviewSection({ stats, sellerOrders, sellerProducts }) {
  return (
    <div className="space-y-6">
      <StatsRow stats={stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 text-base font-semibold text-ink">Son sifarişlər</div>
          {sellerOrders.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Hələ sifariş yoxdur</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {sellerOrders.slice(0, 5).map(order => (
                <div key={order._id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <div className="font-medium text-ink">{order.orderNumber}</div>
                    <div className="text-xs text-slate-400">{formatDate(order.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                    <span className="font-semibold text-forest">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 text-base font-semibold text-ink">Son məhsullar</div>
          {sellerProducts.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Hələ məhsul yoxdur</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {sellerProducts.slice(0, 5).map(product => (
                <div key={product._id} className="flex items-center gap-3 py-3 text-sm">
                  <img src={getProductImage(product)} alt="" className="h-10 w-10 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink">{product.name}</div>
                    <div className="text-xs text-slate-400">
                      {formatPrice(product.price)} / {UNIT_LABELS[product.unit] ?? product.unit}
                    </div>
                  </div>
                  <ProductStatusBadge status={product.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Filter panel ──────────────────────────────────────────────────────────────

function FilterPanel({ filters, setFilters, categories, onClear }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            key: 'status', label: 'Status',
            opts: [
              { value: 'all', label: 'Hamısı' }, { value: 'active', label: 'Aktiv' },
              { value: 'pending', label: 'Təsdiq gözləyir' }, { value: 'inactive', label: 'Deaktiv' },
              { value: 'out_of_stock', label: 'Stok bitib' },
            ],
          },
          {
            key: 'saleType', label: 'Satış tipi',
            opts: [
              { value: 'all', label: 'Hamısı' }, { value: 'retail', label: 'Pərakəndə' },
              { value: 'wholesale', label: 'Topdan' }, { value: 'both', label: 'Hər ikisi' },
            ],
          },
          {
            key: 'stock', label: 'Stok',
            opts: [
              { value: 'all', label: 'Hamısı' }, { value: 'low', label: 'Az stok (< 5)' },
              { value: 'zero', label: 'Stok yoxdur' },
            ],
          },
        ].map(({ key, label, opts }) => (
          <div key={key} className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
            <select
              className="input-shell w-full text-sm"
              value={filters[key]}
              onChange={e => setFilters(p => ({ ...p, [key]: e.target.value }))}
            >
              {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kateqoriya</label>
          <select
            className="input-shell w-full text-sm"
            value={filters.category}
            onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}
          >
            <option value="all">Hamısı</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <button type="button" onClick={onClear} className="mt-3 text-xs font-medium text-slate-500 hover:text-rose-600">
        Filterləri sıfırla
      </button>
    </div>
  );
}

// ─── Edit product modal ────────────────────────────────────────────────────────

function EditProductModal({ product, categories, regions, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name:             product.name ?? '',
    description:      product.description ?? '',
    price:            String(product.price ?? ''),
    unit:             product.unit ?? 'kg',
    saleType:         product.saleType ?? 'retail',
    minOrderQuantity: String(product.minOrderQuantity ?? '1'),
    stockQuantity:    String(product.stockQuantity ?? '0'),
    category:         product.category?._id ?? product.category ?? '',
    region:           product.region?._id ?? product.region ?? '',
    discountPct:      String(product.discount?.percentage ?? '0'),
  });
  const [tags, setTags] = useState(Array.isArray(product.tags) ? product.tags : []);
  const [location, setLocation] = useState(
    product.location && Number.isFinite(product.location.lat)
      ? { lat: product.location.lat, lng: product.location.lng }
      : null
  );
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);

  const mutation = useMutation({
    mutationFn: fd => api.updateProduct(product._id, fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'seller'] });
      setMsg('Məhsul yeniləndi.');
      setOk(true);
      setTimeout(() => { onSuccess?.(); onClose(); }, 800);
    },
    onError: err => {
      const errs = err?.response?.data?.errors;
      setMsg(Array.isArray(errs) && errs.length ? errs.join(', ') : err?.response?.data?.message || 'Xəta baş verdi.');
      setOk(false);
    },
  });

  const sf = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = e => {
    e.preventDefault();
    setMsg('');
    const fd = new FormData();
    fd.append('name',             form.name.trim());
    fd.append('description',      form.description.trim());
    fd.append('price',            form.price);
    fd.append('unit',             form.unit);
    fd.append('saleType',         form.saleType);
    fd.append('minOrderQuantity', form.minOrderQuantity);
    fd.append('stockQuantity',    form.stockQuantity);
    fd.append('category',         form.category);
    fd.append('region',           form.region);
    fd.append('tags',             JSON.stringify(tags));
    fd.append('discount',         JSON.stringify({ percentage: Number(form.discountPct) || 0 }));
    // Send the origin override (or null to clear). Backend validates the coordinates.
    fd.append('location',         JSON.stringify(location));
    mutation.mutate(fd);
  };

  return (
    <Modal title="Məhsulu redaktə et" onClose={onClose} width="max-w-2xl">
      <form onSubmit={handleSubmit}>
        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Məhsul adı" required>
              <input className="input-shell w-full" value={form.name} onChange={e => sf('name', e.target.value)} required />
            </FormField>
            <FormField label="Qiymət (AZN)" required>
              <input type="number" min="0" step="0.01" className="input-shell w-full" value={form.price} onChange={e => sf('price', e.target.value)} required />
            </FormField>
          </div>

          <FormField label="Təsvir" required>
            <textarea className="input-shell w-full min-h-[80px] resize-y" value={form.description} onChange={e => sf('description', e.target.value)} required />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Ölçü vahidi" required>
              <select className="input-shell w-full" value={form.unit} onChange={e => sf('unit', e.target.value)}>
                {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </FormField>
            <FormField label="Satış tipi" required>
              <select className="input-shell w-full" value={form.saleType} onChange={e => sf('saleType', e.target.value)}>
                <option value="retail">Pərakəndə</option>
                <option value="wholesale">Topdan</option>
                <option value="both">Hər ikisi</option>
              </select>
            </FormField>
            <FormField label="Endirim (%)">
              <input type="number" min="0" max="100" className="input-shell w-full" value={form.discountPct} onChange={e => sf('discountPct', e.target.value)} />
            </FormField>
          </div>

          <FormField label="Götürmə nöqtəsi (istəyə bağlı)" helper="Boş olduqda profil götürmə nöqtəniz / region istifadə olunur.">
            <LocationPicker
              value={location}
              onChange={({ lat, lng }) => setLocation({ lat, lng })}
              placeholder="Məhsulun göndərildiyi yeri xəritədə tap..."
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Min. sifariş" required>
              <input type="number" min="1" className="input-shell w-full" value={form.minOrderQuantity} onChange={e => sf('minOrderQuantity', e.target.value)} required />
            </FormField>
            <FormField label="Stok miqdarı" required>
              <input type="number" min="0" className="input-shell w-full" value={form.stockQuantity} onChange={e => sf('stockQuantity', e.target.value)} required />
            </FormField>
            <FormField label="Kateqoriya" required>
              <select className="input-shell w-full" value={form.category} onChange={e => sf('category', e.target.value)} required>
                <option value="">Seçin</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Region" required>
            <select className="input-shell w-full" value={form.region} onChange={e => sf('region', e.target.value)} required>
              <option value="">Seçin</option>
              {regions.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
            </select>
          </FormField>

          <FormField label="Taglər" helper="Axtarış üçün açar sözlər">
            <TagInput tags={tags} setTags={setTags} />
          </FormField>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">
            Şəkil/video yeniləmə — Tezliklə
          </div>

          {msg ? (
            <div className={`rounded-xl border px-4 py-3 text-sm ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {msg}
            </div>
          ) : null}
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Ləğv et
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-60">
            {mutation.isPending ? 'Saxlanılır...' : 'Saxla'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Discount modal ────────────────────────────────────────────────────────────

function DiscountModal({ product, categories, regions, onClose }) {
  const queryClient = useQueryClient();
  const [pct, setPct] = useState(String(product.discount?.percentage ?? '0'));
  const [msg, setMsg] = useState('');

  const mutation = useMutation({
    mutationFn: fd => api.updateProduct(product._id, fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      setMsg('Endirim yeniləndi.');
      setTimeout(onClose, 800);
    },
    onError: err => {
      setMsg(err?.response?.data?.message || 'Xəta baş verdi.');
    },
  });

  const handleSubmit = e => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name',             product.name);
    fd.append('description',      product.description);
    fd.append('price',            String(product.price));
    fd.append('unit',             product.unit);
    fd.append('saleType',         product.saleType);
    fd.append('minOrderQuantity', String(product.minOrderQuantity));
    fd.append('stockQuantity',    String(product.stockQuantity));
    fd.append('category',         product.category?._id ?? product.category);
    fd.append('region',           product.region?._id ?? product.region);
    fd.append('tags',             JSON.stringify(Array.isArray(product.tags) ? product.tags : []));
    fd.append('discount',         JSON.stringify({ percentage: Number(pct) || 0 }));
    mutation.mutate(fd);
  };

  const preview = Number(pct) > 0 ? product.price * (1 - Number(pct) / 100) : null;

  return (
    <Modal title="Endirim tənzimləmələri" onClose={onClose} width="max-w-sm">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-6 py-5">
          <div className="text-sm text-slate-600">
            <strong>{product.name}</strong> — {formatPrice(product.price)}
          </div>
          {(product.discount?.percentage ?? 0) > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
              Mövcud endirim: {product.discount.percentage}%
            </div>
          ) : null}
          <FormField label="Endirim faizi (0 = endirim yoxdur)" required>
            <input type="number" min="0" max="100" className="input-shell w-full" value={pct} onChange={e => setPct(e.target.value)} required />
          </FormField>
          {preview !== null ? (
            <div className="text-sm text-slate-500">
              Endirimdən sonra: <strong className="text-forest">{formatPrice(preview)}</strong>
            </div>
          ) : null}
          {msg ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{msg}</div>
          ) : null}
        </div>
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Ləğv et
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-60">
            {mutation.isPending ? '...' : 'Saxla'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete product modal ──────────────────────────────────────────────────────

function DeleteModal({ product, onClose }) {
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.deleteProduct(product._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'seller'] });
      onClose();
    },
    onError: err => {
      setMsg(err?.response?.data?.message || 'Xəta baş verdi.');
    },
  });

  return (
    <Modal title="Məhsulu sil" onClose={onClose} width="max-w-sm">
      <div className="space-y-4 px-6 py-5">
        <p className="text-sm text-slate-600">
          <strong>"{product.name}"</strong> məhsulunu silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz.
        </p>
        {msg ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{msg}</div> : null}
      </div>
      <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Ləğv et
        </button>
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {mutation.isPending ? 'Silinir...' : 'Bəli, sil'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Products section ──────────────────────────────────────────────────────────

function ProductsSection({ products, categories, regions, isLoading, stats }) {
  const [search, setSearch]             = useState('');
  const [filters, setFilters]           = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters]   = useState(false);
  const [editProduct, setEditProduct]           = useState(null);
  const [discountProduct, setDiscountProduct]   = useState(null);
  const [deleteProduct, setDeleteProduct]       = useState(null);

  const filtered = products.filter(p => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.status !== 'all' && p.status !== filters.status) return false;
    if (filters.saleType !== 'all' && p.saleType !== filters.saleType) return false;
    if (filters.category !== 'all' && (p.category?._id ?? p.category) !== filters.category) return false;
    if (filters.stock === 'low' && p.stockQuantity >= 5) return false;
    if (filters.stock === 'zero' && p.stockQuantity !== 0) return false;
    return true;
  });

  const hasActiveFilters = Object.values(filters).some(v => v !== 'all');

  return (
    <div className="space-y-5">
      <StatsRow stats={stats ?? {}} />

      {showFilters && (
        <FilterPanel filters={filters} setFilters={setFilters} categories={categories} onClear={() => setFilters(EMPTY_FILTERS)} />
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest/30"
              placeholder="Məhsul axtar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
              showFilters || hasActiveFilters
                ? 'border-forest bg-forest/10 text-forest'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtrlər
            {hasActiveFilters ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-forest text-[9px] text-white">!</span>
            ) : null}
          </button>
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {['Məhsul', 'Kateqoriya', 'Qiymət', 'Stok', 'Status', 'Əməliyyatlar'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-2.5"><SkelRow /></td></tr>
                ))
              : filtered.length === 0
              ? <tr><td colSpan={6} className="px-4 py-14 text-center text-slate-400">Məhsul tapılmadı</td></tr>
              : filtered.map(product => {
                  const unitLabel = UNIT_LABELS[product.unit] ?? product.unit;
                  return (
                    <tr key={product._id} className="transition hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={getProductImage(product)} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                          <div className="min-w-0">
                            <div className="font-semibold text-ink leading-snug">{product.name}</div>
                            <div className="text-xs text-slate-400">1 {unitLabel}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{product.category?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">{formatPrice(product.price)}</div>
                        {(product.discount?.percentage ?? 0) > 0 ? (
                          <div className="text-xs text-emerald-600">-{product.discount.percentage}%</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{product.stockQuantity} {unitLabel}</td>
                      <td className="px-4 py-3"><ProductStatusBadge status={product.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" title="Redaktə et" onClick={() => setEditProduct(product)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" title="Endirim" onClick={() => setDiscountProduct(product)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600">
                            <Percent className="h-4 w-4" />
                          </button>
                          <button type="button" title="Sil" onClick={() => setDeleteProduct(product)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>

        {filtered.length > 0 ? (
          <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            {filtered.length} məhsul
          </div>
        ) : null}
      </div>

      {editProduct ? (
        <EditProductModal product={editProduct} categories={categories} regions={regions}
          onClose={() => setEditProduct(null)} onSuccess={() => setEditProduct(null)} />
      ) : null}
      {discountProduct ? (
        <DiscountModal product={discountProduct} categories={categories} regions={regions}
          onClose={() => setDiscountProduct(null)} />
      ) : null}
      {deleteProduct ? (
        <DeleteModal product={deleteProduct} onClose={() => setDeleteProduct(null)} />
      ) : null}
    </div>
  );
}

// ─── Add product form ──────────────────────────────────────────────────────────

function AddProductForm({ categories, sellerRegion, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [tags, setTags] = useState([]);
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [location, setLocation] = useState(null);
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: api.createSellerProduct,
    onSuccess: data => {
      setMsg(data?.message || 'Məhsul əlavə olundu. Admin təsdiqini gözləyir.');
      setSuccess(true);
      setForm(EMPTY_FORM);
      setTags([]);
      setImages([]);
      setVideos([]);
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'seller'] });
      onSuccess?.();
    },
    onError: err => {
      const errs = err?.response?.data?.errors;
      setMsg(Array.isArray(errs) && errs.length ? errs.join(', ') : err?.response?.data?.message || 'Məhsul əlavə edilə bilmədi.');
      setSuccess(false);
    },
  });

  const sf = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = e => {
    e.preventDefault();
    setMsg('');
    setSuccess(false);
    if (!sellerRegion?._id) {
      setMsg('Profilinizdə region yoxdur. Zəhmət olmasa profil bölməsindən region əlavə edin.');
      return;
    }
    if (images.length === 0) {
      setMsg('Ən azı bir məhsul şəkli əlavə edin.');
      setSuccess(false);
      return;
    }
    const fd = new FormData();
    fd.append('name',             form.name.trim());
    fd.append('description',      form.description.trim());
    fd.append('price',            form.price);
    fd.append('unit',             form.unit);
    fd.append('saleType',         form.saleType);
    fd.append('minOrderQuantity', form.minOrderQuantity);
    fd.append('stockQuantity',    form.stockQuantity);
    fd.append('category',         form.category);
    fd.append('region',           sellerRegion._id);
    fd.append('tags',             JSON.stringify(tags));
    fd.append('discount',         JSON.stringify({ percentage: Number(form.discountPercentage) || 0 }));
    if (location) fd.append('location', JSON.stringify(location));
    for (const img of images) fd.append('images', img);
    for (const vid of videos) fd.append('video', vid);
    mutation.mutate(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-ink">Yeni məhsul əlavə et</div>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {!sellerRegion ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Profilinizdə region yoxdur. Profil bölməsindən region əlavə edin.
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Satış regionu: <strong>{sellerRegion.name}</strong>
        </div>
      )}

      <Card title="1. Əsas məlumatlar">
        <FormField label="Məhsul adı" required>
          <input className="input-shell w-full" placeholder="Məhsul adını daxil edin" value={form.name} onChange={e => sf('name', e.target.value)} required />
        </FormField>
        <FormField label="Təsvir" required>
          <textarea className="input-shell w-full min-h-[80px] resize-y" placeholder="Məhsul haqqında məlumat..." value={form.description} onChange={e => sf('description', e.target.value)} required />
        </FormField>
      </Card>

      <Card title="2. Qiymət və satış">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Qiymət (AZN)" required>
            <input type="number" min="0" step="0.01" className="input-shell w-full" placeholder="0.00" value={form.price} onChange={e => sf('price', e.target.value)} required />
          </FormField>
          <FormField label="Ölçü vahidi" required>
            <select className="input-shell w-full" value={form.unit} onChange={e => sf('unit', e.target.value)}>
              {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Satış tipi" required>
          <div className="grid grid-cols-3 gap-2">
            {[{ value: 'retail', label: 'Pərakəndə' }, { value: 'wholesale', label: 'Topdan' }, { value: 'both', label: 'Hər ikisi' }].map(({ value, label }) => (
              <button key={value} type="button" onClick={() => sf('saleType', value)}
                className={`rounded-xl border py-2.5 text-xs font-medium transition ${
                  form.saleType === value ? 'border-forest bg-forest/10 text-forest' : 'border-slate-200 text-slate-600 hover:border-forest/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="Endirim faizi (%)">
          <input type="number" min="0" max="100" className="input-shell w-full" placeholder="0" value={form.discountPercentage} onChange={e => sf('discountPercentage', e.target.value)} />
        </FormField>
      </Card>

      <Card title="3. Stok və minimum sifariş">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Stok miqdarı" required>
            <input type="number" min="0" className="input-shell w-full" placeholder="10" value={form.stockQuantity} onChange={e => sf('stockQuantity', e.target.value)} required />
          </FormField>
          <FormField label="Minimum sifariş" required>
            <input type="number" min="1" className="input-shell w-full" placeholder="1" value={form.minOrderQuantity} onChange={e => sf('minOrderQuantity', e.target.value)} required />
          </FormField>
        </div>
      </Card>

      <Card title="4. Kateqoriya və taglər">
        <FormField label="Kateqoriya" required>
          <select className="input-shell w-full" value={form.category} onChange={e => sf('category', e.target.value)} required>
            <option value="">Kateqoriya seçin</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </FormField>
        <FormField label="Taglər" helper="Axtarış və filtrləmə üçün açar sözlər: məsələn alma, təzə, üzvi">
          <TagInput tags={tags} setTags={setTags} />
        </FormField>
      </Card>

      <Card title="5. Media">
        <FormField label="Şəkillər (maksimum 5)">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-6 text-center transition hover:border-forest/50">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-forest/10 text-forest">
              <Upload className="h-4 w-4" />
            </div>
            <div className="text-sm font-medium text-slate-700">Şəkilləri yükləyin</div>
            <div className="text-xs text-slate-400">JPG, PNG (10MB-ə qədər)</div>
            {images.length > 0 ? <div className="text-xs font-medium text-forest">{images.length} şəkil seçildi</div> : null}
            <input type="file" multiple accept="image/*" className="sr-only" onChange={e => setImages(Array.from(e.target.files || []))} />
          </label>
        </FormField>
        <FormField label="Video (istəyə bağlı)">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-5 text-center transition hover:border-forest/50">
            <div className="text-sm font-medium text-slate-700">Video faylını yükləyin</div>
            <div className="text-xs text-slate-400">MP4, MOV (50MB-ə qədər)</div>
            {videos.length > 0 ? <div className="text-xs font-medium text-forest">{videos[0].name}</div> : null}
            <input type="file" accept="video/*" className="sr-only" onChange={e => setVideos(Array.from(e.target.files || []))} />
          </label>
        </FormField>
      </Card>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-3">
        <div className="text-sm font-semibold text-ink">Götürmə nöqtəsi (istəyə bağlı)</div>
        <p className="text-xs text-slate-400">Boş buraxsanız, profil götürmə nöqtəniz və ya region istifadə olunur. Yalnız bu məhsul başqa yerdən göndərilirsə doldurun.</p>
        <LocationPicker
          value={location}
          onChange={({ lat, lng }) => setLocation({ lat, lng })}
          placeholder="Məhsulun göndərildiyi yeri xəritədə tap..."
        />
      </div>

      {msg ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {msg}
        </div>
      ) : null}

      <div className="flex items-center gap-3 pb-6 pt-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Ləğv et
          </button>
        ) : null}
        <button type="submit" disabled={mutation.isPending || !sellerRegion} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-60">
          {mutation.isPending ? 'Yüklənir...' : 'Məhsul əlavə et'}
        </button>
      </div>
    </form>
  );
}

// ─── Add product page (standalone) ────────────────────────────────────────────

function AddProductPage({ categories, sellerRegion, onBack }) {
  return (
    <div className="mx-auto max-w-2xl pb-8">
      <AddProductForm categories={categories} sellerRegion={sellerRegion} onCancel={onBack} onSuccess={onBack} />
    </div>
  );
}

// ─── Order detail modal ────────────────────────────────────────────────────────

function OrderDetailModal({ orderId, onClose }) {
  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId),
    enabled: Boolean(orderId),
    select: d => d.order,
  });
  const order = orderQuery.data;

  return (
    <Modal title="Sifariş ətraflı" onClose={onClose} width="max-w-2xl">
      <div className="max-h-[72vh] overflow-y-auto px-6 py-5 space-y-5">
        {orderQuery.isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkelRow key={i} />)}</div>
        ) : orderQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Sifariş yüklənə bilmədi.</div>
        ) : order ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-mono text-xs font-semibold text-slate-400">{order.orderNumber}</div>
                <div className="mt-1 text-xs text-slate-400">{formatDate(order.createdAt)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                <StatusBadge status={order.payment?.status} map={PAYMENT_STATUS_LABELS} />
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3 space-y-1 text-sm">
              <div className="font-semibold text-ink">Alıcı</div>
              <div className="text-slate-600">{order.buyer?.firstName} {order.buyer?.lastName}</div>
              {order.buyer?.phone ? <div className="text-slate-600">{order.buyer.phone}</div> : null}
            </div>

            {order.deliveryAddress ? (
              <div className="rounded-xl bg-slate-50 px-4 py-3 space-y-1 text-sm">
                <div className="font-semibold text-ink">Çatdırılma ünvanı</div>
                {order.deliveryAddress.recipientName ? <div className="text-slate-600">Alıcı: {order.deliveryAddress.recipientName}</div> : null}
                {order.deliveryAddress.phone ? <div className="text-slate-600">Tel: {order.deliveryAddress.phone}</div> : null}
                {order.deliveryAddress.region?.name ? <div className="text-slate-600">Region: {order.deliveryAddress.region.name}</div> : null}
                {order.deliveryAddress.city ? <div className="text-slate-600">Şəhər: {order.deliveryAddress.city}</div> : null}
                {order.deliveryAddress.street ? <div className="text-slate-600">Küçə: {order.deliveryAddress.street}</div> : null}
              </div>
            ) : null}

            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm space-y-1">
              <div className="font-semibold text-ink">Ödəniş</div>
              <div className="text-slate-600">{PAYMENT_METHOD_LABELS[order.payment?.method] ?? order.payment?.method}</div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold text-ink">Məhsullar</div>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                {order.items?.map(item => (
                  <div key={item._id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-ink">{item.name}</div>
                      <div className="text-xs text-slate-400">
                        {item.quantity} {UNIT_LABELS[item.unit] ?? item.unit} × {formatPrice(item.price)}
                      </div>
                    </div>
                    <div className="font-semibold text-forest">{formatPrice(item.totalPrice)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 text-sm">
              {(order.deliveryFee ?? 0) > 0 ? (
                <div className="flex gap-8 text-slate-500">
                  <span>Çatdırılma</span>
                  <span>{formatPrice(order.deliveryFee)}</span>
                </div>
              ) : (
                <div className="text-xs text-slate-400">Pulsuz çatdırılma</div>
              )}
              <div className="flex gap-8 font-semibold text-ink">
                <span>Cəmi</span>
                <span className="text-forest">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

// ─── Orders section ────────────────────────────────────────────────────────────

function OrdersSection({ orders, isLoading }) {
  const updateStatus = useUpdateOrderStatus();
  const openChat = useOpenConversation();
  const [detailOrderId, setDetailOrderId] = useState(null);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkelRow key={i} />)}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-20 text-center shadow-sm">
        <ShoppingBag className="mb-3 h-10 w-10 text-slate-300" />
        <div className="text-base font-semibold text-slate-500">Sifariş yoxdur</div>
        <div className="mt-1 text-sm text-slate-400">Alıcılar sifariş verdikdən sonra burada görünəcək.</div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {['Sifariş №', 'Alıcı', 'Məhsullar', 'Cəmi', 'Ödəniş', 'Status', 'Əməliyyatlar'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.map(order => {
              const next = NEXT_ORDER_STATUS[order.status];
              const isCardUnpaid = order.payment?.method === 'card' && order.payment?.status !== 'paid';
              const isUpdating = updateStatus.isPending && updateStatus.variables?.id === order._id;
              const blocked = isCardUnpaid && order.status === 'pending';
              return (
                <tr key={order._id} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-ink">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{order.buyer?.firstName} {order.buyer?.lastName}</div>
                    {order.buyer?.phone ? <div className="text-xs text-slate-400">{order.buyer.phone}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {order.items?.slice(0, 2).map(i => i.name).join(', ')}
                    {(order.items?.length ?? 0) > 2 ? ` +${order.items.length - 2}` : ''}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{formatPrice(order.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <StatusBadge status={order.payment?.status} map={PAYMENT_STATUS_LABELS} />
                      <div className="text-[10px] text-slate-400">{PAYMENT_METHOD_LABELS[order.payment?.method] ?? order.payment?.method}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} map={ORDER_STATUS_LABELS} /></td>
                  <td className="px-4 py-3">
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setDetailOrderId(order._id)}
                        className="block rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Ətraflı bax
                      </button>
                      {next ? (
                        <>
                          {blocked ? (
                            <div className="flex items-center gap-1 text-[10px] text-amber-600">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Kart ödənişi gözlənilir
                            </div>
                          ) : null}
                          <button
                            type="button"
                            disabled={isUpdating || blocked}
                            onClick={() => updateStatus.mutate({ id: order._id, status: next.status })}
                            className="block rounded-xl bg-forest/10 px-3 py-1.5 text-xs font-medium text-forest transition hover:bg-forest/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUpdating ? '...' : next.label}
                          </button>
                          {updateStatus.isError && updateStatus.variables?.id === order._id ? (
                            <div className="text-[10px] text-red-600">
                              {updateStatus.error?.response?.data?.message || 'Xəta baş verdi'}
                            </div>
                          ) : null}
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openChat({ type: 'buyer_seller', orderId: order._id })}
                        className="flex w-full items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        <MessageCircle className="h-3 w-3 shrink-0" />Alıcıya yaz
                      </button>
                      {order.courier ? (
                        <button
                          type="button"
                          onClick={() => openChat({ type: 'seller_courier', orderId: order._id })}
                          className="flex w-full items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          <MessageCircle className="h-3 w-3 shrink-0" />Kuryerə yaz
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detailOrderId ? (
        <OrderDetailModal orderId={detailOrderId} onClose={() => setDetailOrderId(null)} />
      ) : null}
    </>
  );
}

// ─── Profile section ───────────────────────────────────────────────────────────

function ProfileSection({ user, stats, meData, regions }) {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { token } = useSelector(state => state.auth);

  const sellerInfo = meData?.user?.sellerInfo ?? user?.sellerInfo ?? {};
  const address    = meData?.user?.address ?? {};

  const [editMode, setEditMode] = useState(false);
  const [personal, setPersonal] = useState({
    firstName: meData?.user?.firstName ?? user?.firstName ?? '',
    lastName:  meData?.user?.lastName  ?? user?.lastName  ?? '',
    phone:     meData?.user?.phone     ?? user?.phone     ?? '',
    region:    address.region?._id ?? (typeof address.region === 'string' ? address.region : '') ?? '',
  });
  const [business, setBusiness] = useState({
    businessName:        sellerInfo.businessName ?? '',
    businessDescription: sellerInfo.businessDescription ?? '',
    saleType:            sellerInfo.saleType ?? 'both',
    pickupLocation:      (sellerInfo.pickupLocation && Number.isFinite(sellerInfo.pickupLocation.lat))
      ? { lat: sellerInfo.pickupLocation.lat, lng: sellerInfo.pickupLocation.lng }
      : null,
  });
  const [msg, setMsg]     = useState('');
  const [msgOk, setMsgOk] = useState(false);

  const personalMut = useMutation({ mutationFn: p => api.updateAuthProfile(p) });
  const businessMut = useMutation({ mutationFn: p => api.updateSellerProfile(p) });

  const handleSave = async e => {
    e.preventDefault();
    setMsg('');
    try {
      await personalMut.mutateAsync({
        firstName: personal.firstName,
        lastName:  personal.lastName,
        phone:     personal.phone,
        address: {
          ...address,
          region: personal.region || address.region?._id || address.region || undefined,
        },
      });
      await businessMut.mutateAsync({
        businessName:        business.businessName,
        businessDescription: business.businessDescription,
        saleType:            business.saleType,
        pickupLocation:      business.pickupLocation || null,
      });
      // Fetch fresh user data and update both React Query cache and Redux/localStorage
      const freshData = await api.me();
      queryClient.setQueryData(['me'], freshData);
      dispatch(setCredentials({ user: freshData.user, token }));
      setMsg('Profil yeniləndi.');
      setMsgOk(true);
      setEditMode(false);
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Xəta baş verdi.');
      setMsgOk(false);
    }
  };

  const sp = (f, v) => setPersonal(p => ({ ...p, [f]: v }));
  const sb = (f, v) => setBusiness(p => ({ ...p, [f]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-ink">Satıcı profili</div>
        {!editMode ? (
          <button type="button" onClick={() => setEditMode(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            Redaktə et
          </button>
        ) : (
          <button type="button" onClick={() => { setEditMode(false); setMsg(''); }} className="text-sm text-slate-500 hover:text-ink">
            Ləğv et
          </button>
        )}
      </div>

      {msg ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${msgOk ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {msg}
        </div>
      ) : null}

      {editMode ? (
        <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="text-sm font-semibold text-ink">Şəxsi məlumatlar</div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ad" required>
                <input className="input-shell w-full" value={personal.firstName} onChange={e => sp('firstName', e.target.value)} required />
              </FormField>
              <FormField label="Soyad" required>
                <input className="input-shell w-full" value={personal.lastName} onChange={e => sp('lastName', e.target.value)} required />
              </FormField>
            </div>
            <FormField label="Telefon">
              <input className="input-shell w-full" value={personal.phone} onChange={e => sp('phone', e.target.value)} />
            </FormField>
            <FormField label="Region">
              <select className="input-shell w-full" value={personal.region} onChange={e => sp('region', e.target.value)}>
                <option value="">Region seçin</option>
                {regions.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </FormField>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="text-sm font-semibold text-ink">İş məlumatları</div>
            <FormField label="Biznes adı">
              <input className="input-shell w-full" placeholder="Biznes adını daxil edin" value={business.businessName} onChange={e => sb('businessName', e.target.value)} />
            </FormField>
            <FormField label="Biznes təsviri">
              <textarea className="input-shell w-full min-h-[80px] resize-y" placeholder="Biznesiniz haqqında..." value={business.businessDescription} onChange={e => sb('businessDescription', e.target.value)} />
            </FormField>
            <FormField label="Satış tipi" required>
              <select className="input-shell w-full" value={business.saleType} onChange={e => sb('saleType', e.target.value)}>
                <option value="retail">Pərakəndə</option>
                <option value="wholesale">Topdan</option>
                <option value="both">Hər ikisi</option>
              </select>
            </FormField>
            <FormField label="Götürmə nöqtəsi (çatdırılma məsafəsi bu nöqtədən hesablanır)" helper="Məhsulların göndərildiyi dəqiq yer">
              <LocationPicker
                value={business.pickupLocation}
                onChange={({ lat, lng }) => sb('pickupLocation', { lat, lng })}
                placeholder="Götürmə ünvanını xəritədə tap..."
              />
            </FormField>
          </div>

          <div className="lg:col-span-2">
            <button type="submit" disabled={personalMut.isPending || businessMut.isPending}
              className="btn-primary px-8 py-2.5 text-sm disabled:opacity-60"
            >
              {(personalMut.isPending || businessMut.isPending) ? 'Saxlanılır...' : 'Profili saxla'}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-4 text-base font-semibold text-ink">Şəxsi məlumatlar</div>
              <dl className="divide-y divide-slate-50 text-sm">
                {[
                  { label: 'Ad soyad', value: `${meData?.user?.firstName ?? user?.firstName ?? ''} ${meData?.user?.lastName ?? user?.lastName ?? ''}`.trim() },
                  { label: 'E-poçt',   value: meData?.user?.email ?? user?.email },
                  { label: 'Telefon',  value: meData?.user?.phone ?? user?.phone },
                  { label: 'Region',   value: address.region?.name },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-slate-400">{label}</dt>
                    <dd className="font-medium text-ink">{value || 'Əlavə edilməyib'}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-4 text-base font-semibold text-ink">İş məlumatları</div>
              <dl className="divide-y divide-slate-50 text-sm">
                {[
                  { label: 'Biznes adı',     value: sellerInfo.businessName },
                  { label: 'Biznes təsviri', value: sellerInfo.businessDescription },
                  { label: 'Satış növü',     value: SALE_TYPE_LABELS[sellerInfo.saleType ?? stats.saleType] },
                  { label: 'Rating',         value: `${stats.rating ?? 0} / 5` },
                  { label: 'Təsdiqlənib',    value: (sellerInfo.isVerified ?? stats.isVerified) ? 'Bəli ✓' : 'Xeyr' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-slate-400">{label}</dt>
                    <dd className="font-medium text-ink">{value || 'Əlavə edilməyib'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 text-base font-semibold text-ink">Performans</div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Ümumi məhsullar',     value: stats.totalProducts ?? 0 },
                { label: 'Ümumi sifarişlər',    value: stats.totalOrders ?? 0 },
                { label: 'Gözləyən sifarişlər', value: stats.pendingOrders ?? 0 },
                { label: 'Gəlir',               value: formatPrice(stats.revenue ?? 0) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xl font-bold text-ink">{value}</div>
                  <div className="mt-1 text-xs text-slate-500">{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Hesab statusu:{' '}
              <strong className={(sellerInfo.isVerified ?? stats.isVerified) ? 'text-emerald-600' : 'text-amber-600'}>
                {(sellerInfo.isVerified ?? stats.isVerified) ? 'Təsdiqlənmiş satıcı' : 'Təsdiq gözlənilir'}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings section ──────────────────────────────────────────────────────────

function SettingsSection() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [msg, setMsg]     = useState('');
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
          { title: 'Məxfilik parametrləri', desc: 'Profil görünürlüğünü tənzimləyin' },
          { title: 'Dil və görünüş',        desc: 'İnterfeys dilini seçin' },
          { title: 'API inteqrasiyası',     desc: 'Xarici sistemlərlə əlaqə' },
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

// ─── Coming soon ───────────────────────────────────────────────────────────────

function ComingSoonSection() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-24 text-center shadow-sm">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100">
        <Clock3 className="h-6 w-6 text-slate-400" />
      </div>
      <div className="text-lg font-semibold text-ink">Tezliklə</div>
      <div className="mt-2 max-w-xs text-sm text-slate-400">
        Bu bölmə hazırda işlənir. Yaxın zamanda əlçatan olacaq.
      </div>
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function SellerDashboard() {
  const { user } = useSelector(state => state.auth);
  const [section, setSection] = useState('overview');

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'seller'],
    queryFn: api.sellerDashboard,
    enabled: Boolean(user),
  });

  const sellerProductsQuery = useQuery({
    queryKey: ['seller-products'],
    queryFn: api.sellerProducts,
    enabled: Boolean(user),
    select: d => d.products || [],
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
    select: d => d.categories || [],
  });

  const regionsQuery = useQuery({
    queryKey: ['regions'],
    queryFn: api.getRegions,
    select: d => d.regions || [],
  });

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    enabled: Boolean(user),
  });

  const sellerOrdersQuery = useSellerOrders(Boolean(user));

  const stats          = dashboardQuery.data?.stats ?? {};
  const sellerProducts = sellerProductsQuery.data ?? [];
  const categories     = categoriesQuery.data ?? [];
  const regions        = regionsQuery.data ?? [];
  const sellerOrders   = sellerOrdersQuery.data ?? [];
  const sellerRegion   = meQuery.data?.user?.address?.region;
  const meData         = meQuery.data;

  // Always use the freshest user data for display; fall back to Redux only while meQuery loads
  const liveUser = meQuery.data?.user ?? user;

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden bg-slate-50">
      <Sidebar section={section} onSection={setSection} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar section={section} liveUser={liveUser} />

        <main className="flex-1 overflow-y-auto p-6">
          {dashboardQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
              ))}
            </div>
          ) : (
            <>
              {section === 'overview' && (
                <OverviewSection stats={stats} sellerOrders={sellerOrders} sellerProducts={sellerProducts} />
              )}

              {section === 'products' && (
                <ProductsSection
                  key="products"
                  stats={stats}
                  products={sellerProducts}
                  categories={categories}
                  regions={regions}
                  isLoading={sellerProductsQuery.isLoading}
                />
              )}

              {section === 'add-product' && (
                <AddProductPage
                  categories={categories}
                  sellerRegion={sellerRegion}
                  onBack={() => setSection('products')}
                />
              )}

              {section === 'orders' && (
                <OrdersSection orders={sellerOrders} isLoading={sellerOrdersQuery.isLoading} />
              )}

              {section === 'reviews' && <SellerReviewsSection />}

              {section === 'profile' && (
                <ProfileSection user={user} stats={stats} meData={meData} regions={regions} />
              )}

              {section === 'settings' && <SettingsSection />}

              {section === 'coming-soon' && <ComingSoonSection />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
