import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Globe,
  LayoutDashboard, MessageCircle, Package, PackageSearch, Pencil, Plus,
  ShieldCheck, ShoppingBag, Tag, Trash2, Users, Wallet, X,
} from 'lucide-react';
import { api } from '../api/agroviaApi';
import { useOpenConversation } from '../hooks/useOpenConversation';
import { useTheme } from '../components/ThemeProvider';
import {
  EmptyState, LoadingGrid, ORDER_STATUS_LABELS,
  SectionTitle, StatusBadge, formatPrice, roleLabel,
} from '../components/Ui';

const TABS = [
  { id: 'overview',    label: 'Xülasə',        icon: LayoutDashboard },
  { id: 'products',   label: 'Məhsullar',      icon: PackageSearch },
  { id: 'payouts',    label: 'Ödənişlər',      icon: Wallet },
  { id: 'users',      label: 'İstifadəçilər',  icon: Users },
  { id: 'categories', label: 'Kateqoriyalar',  icon: Tag },
  { id: 'regions',    label: 'Regionlar',      icon: Globe },
  { id: 'shops',      label: 'Mağazalar',      icon: ShoppingBag },
  { id: 'support',    label: 'Dəstək',         icon: MessageCircle },
];

const SALE_TYPE = { retail: 'Pərakəndə', wholesale: 'Topdan', both: 'Topdan və pərakəndə' };

const PIE_COLORS = ['#6366F1', '#10B981', '#06B6D4', '#F59E0B'];

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber:   'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    slate:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
  return (
    <div className="flex items-start gap-4 rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
      <div className={`rounded-xl p-3 ${colorMap[color] || colorMap.slate}`}>
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
          {typeof p.value === 'number' && p.value > 100 ? formatPrice(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

function FormInput({ label, error, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-ink dark:text-white">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}

// ─── Category modal ───────────────────────────────────────────────────────────

function CategoryModal({ initial, onClose, onSave, isLoading, error }) {
  const [name, setName] = useState(initial?.name || '');
  const [nameEn, setNameEn] = useState(initial?.nameEn || '');
  const [desc, setDesc] = useState(initial?.description || '');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), nameEn: nameEn.trim() || undefined, description: desc.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-ink dark:text-white">
            {initial ? 'Kateqoriyanı düzəlt' : 'Yeni kateqoriya'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <FormInput label="Ad (AZ) *">
            <input
              className="input-shell"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kateqoriya adı"
              required
            />
          </FormInput>
          <FormInput label="Ad (EN)">
            <input
              className="input-shell"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Category name"
            />
          </FormInput>
          <FormInput label="Açıqlama">
            <textarea
              className="input-shell resize-none"
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Kateqoriya haqqında qısa məlumat"
            />
          </FormInput>
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          ) : null}
          <div className="flex gap-3 pt-1">
            <button type="submit" className="btn-primary flex-1 justify-center disabled:opacity-60" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saxlanılır...' : initial ? 'Yadda saxla' : 'Yarat'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Ləğv et</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Region modal ─────────────────────────────────────────────────────────────

const REGION_TYPES = ['city', 'district', 'region'];

function RegionModal({ initial, onClose, onSave, isLoading, error }) {
  const [name, setName] = useState(initial?.name || '');
  const [nameEn, setNameEn] = useState(initial?.nameEn || '');
  const [type, setType] = useState(initial?.type || 'region');
  const [isActive, setIsActive] = useState(initial ? (initial.isActive !== false) : true);
  const [coordWarningShown, setCoordWarningShown] = useState(false);
  const [coordConfirmed, setCoordConfirmed] = useState(false);
  const [coordJson, setCoordJson] = useState(
    initial?.coordinates ? JSON.stringify(initial.coordinates, null, 2) : ''
  );
  const [coordError, setCoordError] = useState(null);

  const handleCoordEdit = () => {
    if (!coordWarningShown) { setCoordWarningShown(true); return; }
    setCoordConfirmed(true);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      nameEn: nameEn.trim() || undefined,
      type,
      isActive,
    };
    if (coordConfirmed && coordJson.trim()) {
      try {
        payload.coordinates = JSON.parse(coordJson);
        setCoordError(null);
      } catch {
        setCoordError('Koordinat JSON formatı yanlışdır.');
        return;
      }
    }
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-ink dark:text-white">
            {initial ? 'Regionu düzəlt' : 'Yeni region'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <FormInput label="Ad (AZ) *">
            <input className="input-shell" value={name} onChange={(e) => setName(e.target.value)} placeholder="Region adı" required />
          </FormInput>
          <FormInput label="Ad (EN)">
            <input className="input-shell" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Region name" />
          </FormInput>
          <FormInput label="Tip">
            <select className="input-shell" value={type} onChange={(e) => setType(e.target.value)}>
              {REGION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormInput>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-indigo-600" />
            <span className="text-sm font-medium text-ink dark:text-white">Region aktiv</span>
          </label>

          {/* Coordinates section */}
          {initial ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5 dark:text-amber-400" />
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">Koordinatlar çatdırılma qiymətinə təsir edir.</span>
                  {' '}Yalnız ehtiyac olduqda dəyişdirin.
                </div>
              </div>
              {!coordWarningShown ? (
                <button type="button" onClick={() => setCoordWarningShown(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 dark:border-amber-700 dark:text-amber-300">
                  Koordinatları düzəlt
                </button>
              ) : !coordConfirmed ? (
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setCoordConfirmed(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">
                    Dəyişdirməyi təsdiq et
                  </button>
                  <button type="button" onClick={() => setCoordWarningShown(false)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300">
                    Ləğv et
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="mb-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">GeoJSON koordinatları:</div>
                  <textarea
                    className="input-shell w-full resize-y font-mono text-xs"
                    rows={5}
                    value={coordJson}
                    onChange={(e) => setCoordJson(e.target.value)}
                    placeholder='{"type":"Polygon","coordinates":[[[49.6,40.2],...]]}'
                    spellCheck={false}
                  />
                  {coordError ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{coordError}</p> : null}
                </div>
              )}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          ) : null}
          <div className="flex gap-3 pt-1">
            <button type="submit" className="btn-primary flex-1 justify-center disabled:opacity-60" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saxlanılır...' : initial ? 'Yadda saxla' : 'Yarat'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Ləğv et</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete confirm ──────────────────────────────────────────────────────────

function DeleteConfirm({ label, onConfirm, onCancel, isLoading, onDeactivate }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
          <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="mb-2 text-base font-bold text-ink dark:text-white">Silmək istəyirsiniz?</h3>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold">{label}</span> silinəcək. Bu əməliyyat geri alına bilməz.
          {onDeactivate ? ' Əgər silinmirsə, deaktivasiya edə bilərsiniz.' : ''}
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-full bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {isLoading ? 'Silinir...' : 'Sil'}
          </button>
          {onDeactivate ? (
            <button type="button" onClick={onDeactivate} disabled={isLoading}
              className="rounded-full border border-amber-300 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30">
              Deaktivasiya et
            </button>
          ) : null}
          <button type="button" onClick={onCancel}
            className="rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Ləğv et
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useSelector((s) => s.auth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const openChat = useOpenConversation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [tab, setTab] = useState('overview');
  const [expandedProduct, setExpandedProduct] = useState(null);

  // Category CRUD state
  const [catModal, setCatModal] = useState(null); // null | { mode, item? }
  const [catDeleteTarget, setCatDeleteTarget] = useState(null);
  const [catError, setCatError] = useState(null);

  // Region CRUD state
  const [regionModal, setRegionModal] = useState(null);
  const [regionDeleteTarget, setRegionDeleteTarget] = useState(null);
  const [regionError, setRegionError] = useState(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const dashboardQuery = useQuery({ queryKey: ['dashboard', 'admin'], queryFn: api.adminDashboard });
  const pendingProductsQuery = useQuery({ queryKey: ['admin-pending-products'], queryFn: api.adminPendingProducts });
  const ordersQuery = useQuery({ queryKey: ['admin-orders'], queryFn: api.adminOrders });
  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: api.adminUsers, enabled: tab === 'users' });
  const supportQuery = useQuery({
    queryKey: ['support-conversations'],
    queryFn: () => api.getConversations({ type: 'support' }),
    enabled: tab === 'support',
  });
  const catQuery = useQuery({ queryKey: ['admin-categories'], queryFn: api.adminGetCategories, enabled: tab === 'categories' });
  const regionQuery = useQuery({ queryKey: ['admin-regions'], queryFn: api.adminGetRegions, enabled: tab === 'regions' });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: ({ id, status }) => api.approveProduct(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
      setExpandedProduct(null);
    },
  });

  const payoutMutation = useMutation({
    mutationFn: ({ id, target }) => api.markPayout(id, target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: (id) => api.adminToggleUserStatus(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const catCreateMutation = useMutation({
    mutationFn: (payload) => api.adminCreateCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setCatModal(null);
      setCatError(null);
    },
    onError: (err) => setCatError(err.response?.data?.message || 'Xəta baş verdi.'),
  });

  const catUpdateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.adminUpdateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setCatModal(null);
      setCatError(null);
    },
    onError: (err) => setCatError(err.response?.data?.message || 'Xəta baş verdi.'),
  });

  const catDeleteMutation = useMutation({
    mutationFn: (id) => api.adminDeleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setCatDeleteTarget(null);
      setCatError(null);
    },
    onError: (err) => {
      setCatDeleteTarget(null);
      setCatError(err.response?.data?.message || 'Silinmə zamanı xəta baş verdi. Məhsullara bağlı ola bilər.');
    },
  });

  const regionCreateMutation = useMutation({
    mutationFn: (payload) => api.adminCreateRegion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-regions'] });
      setRegionModal(null);
      setRegionError(null);
    },
    onError: (err) => setRegionError(err.response?.data?.message || 'Xəta baş verdi.'),
  });

  const regionUpdateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.adminUpdateRegion(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-regions'] });
      setRegionModal(null);
      setRegionError(null);
    },
    onError: (err) => setRegionError(err.response?.data?.message || 'Xəta baş verdi.'),
  });

  const regionDeleteMutation = useMutation({
    mutationFn: (id) => api.adminDeleteRegion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-regions'] });
      setRegionDeleteTarget(null);
      setRegionError(null);
    },
    onError: (err) => {
      setRegionDeleteTarget(null);
      setRegionError(err.response?.data?.message || 'Silinmə zamanı xəta baş verdi. Region rayonlara və ya məhsullara bağlı ola bilər.');
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────
  const stats = dashboardQuery.data?.stats || {};
  const pendingProducts = pendingProductsQuery.data?.products || [];
  const allOrders = ordersQuery.data?.orders || [];
  const payableOrders = allOrders.filter(
    (o) => o.payout?.sellerPayoutStatus === 'available' || o.payout?.courierPayoutStatus === 'available'
  );
  const users = usersQuery.data?.users || [];
  const supportConversations = supportQuery.data?.conversations || [];
  const categories = catQuery.data?.categories || [];
  const regions = regionQuery.data?.regions || [];

  // Chart data — users pie
  const usersData = [
    { name: 'Alıcı', value: stats.users?.buyers || 0 },
    { name: 'Satıcı', value: stats.users?.sellers || 0 },
    { name: 'Kuryer', value: stats.users?.couriers || 0 },
  ].filter((d) => d.value > 0);
  const usersHasData = usersData.length > 0;

  // Chart data — finance bar
  const financeData = [
    { name: 'Alıcı öd.', value: stats.finance?.buyerPayments || stats.revenue || 0 },
    { name: 'Platform', value: stats.finance?.platformFeeTotal || 0 },
    { name: 'Satıcı (gözl.)', value: stats.finance?.sellerPayable || 0 },
    { name: 'Kuryer (gözl.)', value: stats.finance?.courierPayable || 0 },
  ];
  const financeHasData = financeData.some((d) => d.value > 0);

  const axisColor = isDark ? '#64748b' : '#94a3b8';

  // ── Tab content renderers ─────────────────────────────────────────────────

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="İstifadəçi sayı" value={stats.users?.total || 0} icon={Users} color="indigo" />
        <StatCard label="Məhsullar" value={stats.products?.total || 0} icon={PackageSearch} color="indigo" />
        <StatCard label="Sifarişlər" value={stats.totalOrders || 0} icon={Package} color="slate" />
        <StatCard label="Alıcı ödənişləri" value={formatPrice(stats.finance?.buyerPayments || stats.revenue || 0)} icon={Wallet} color="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Users pie */}
        <div className="rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 text-sm font-bold text-ink dark:text-white">İstifadəçi bölgüsü</div>
          {usersHasData ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={usersData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {usersData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#475569' }} />
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-card dark:border-slate-700 dark:bg-slate-900">
                    <div className="font-semibold dark:text-white">{payload[0].name}</div>
                    <div className="text-slate-600 dark:text-slate-300">{payload[0].value} nəfər</div>
                  </div>
                ) : null} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              Hələ istifadəçi yoxdur
            </div>
          )}
        </div>

        {/* Finance bar */}
        <div className="rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 text-sm font-bold text-ink dark:text-white">Maliyyə xülasəsi</div>
          {financeHasData ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={financeData} barSize={30}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${v} ₼`} tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {financeData.map((_, i) => (
                    <Cell key={i} fill={['#428297', '#48913a', '#F59E0B', '#06b6d4'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              Hələ maliyyə məlumatı yoxdur
            </div>
          )}
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Gözləyən məhsullar', value: stats.products?.pending || 0 },
          { label: 'Platform komissiyası', value: formatPrice(stats.finance?.platformFeeTotal || 0) },
          { label: 'Satıcı ödəniləcək', value: formatPrice(stats.finance?.sellerPayable || 0) },
          { label: 'Kuryer ödəniləcək', value: formatPrice(stats.finance?.courierPayable || 0) },
          { label: 'Alıcılar', value: stats.users?.buyers || 0 },
          { label: 'Satıcılar', value: stats.users?.sellers || 0 },
        ].map((item) => (
          <div key={item.label} className="rounded-[14px] border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-lg font-bold text-ink dark:text-white">{item.value}</div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-4">
      {pendingProductsQuery.isLoading ? <LoadingGrid rows={2} /> : pendingProducts.length === 0 ? (
        <EmptyState icon={PackageSearch} title="Gözləyən məhsul yoxdur" description="Hazırda admin təsdiqini gözləyən məhsul tapılmadı." />
      ) : (
        pendingProducts.map((product) => {
          const expanded = expandedProduct === product._id;
          return (
            <div key={product._id} className="rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-ink dark:text-white">{product.name}</div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {product.seller?.firstName} {product.seller?.lastName} • {product.category?.name || '—'} • {formatPrice(product.price)}
                  </div>
                </div>
                <button type="button" className="btn-secondary shrink-0 text-xs"
                  onClick={() => setExpandedProduct(expanded ? null : product._id)}>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {expanded ? 'Bağla' : 'Bax'}
                </button>
              </div>

              {expanded ? (
                <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
                    {[
                      ['Kateqoriya', product.category?.name || '—'],
                      ['Region', product.region?.name || '—'],
                      ['Qiymət', formatPrice(product.price)],
                      ['Vahid', product.unit],
                      ['Satış tipi', SALE_TYPE[product.saleType] || '—'],
                      ['Min sifariş', product.minOrderQuantity],
                      ['Stok', product.stockQuantity],
                      ['Satıcı', `${product.seller?.firstName || ''} ${product.seller?.lastName || ''}`],
                    ].map(([k, v]) => (
                      <div key={k} className="text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-ink dark:text-slate-200">{k}:</span> {v}
                      </div>
                    ))}
                  </div>

                  {product.description ? (
                    <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{product.description}</p>
                  ) : null}

                  {product.images?.length > 0 ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {product.images.map((img) => (
                        <img key={img.public_id || img.url} src={img.url} alt=""
                          className="h-20 w-20 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
                      ))}
                    </div>
                  ) : null}

                  {product.videos?.length > 0 ? (
                    <div className="mb-3">
                      <a href={product.videos[0].url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-indigo-600 underline dark:text-indigo-400">Videoya bax</a>
                    </div>
                  ) : null}

                  {approveMutation.isError && expandedProduct === product._id ? (
                    <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
                      {approveMutation.error?.response?.data?.errors?.join(', ') || approveMutation.error?.response?.data?.message || 'Xəta baş verdi.'}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <button type="button"
                      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate({ id: product._id, status: 'active' })}>
                      <ShieldCheck className="h-4 w-4" />{approveMutation.isPending ? 'Gözləyin...' : 'Təsdiqlə'}
                    </button>
                    <button type="button" className="btn-secondary text-sm"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate({ id: product._id, status: 'rejected' })}>
                      Rədd et
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );

  const renderPayouts = () => (
    <div className="space-y-3">
      {ordersQuery.isLoading ? <LoadingGrid rows={2} /> : payableOrders.length === 0 ? (
        <EmptyState icon={Wallet} title="Ödəniləcək yoxdur" description="Hazırda ödənilməsi gözlənilən satıcı və ya kuryer ödənişi yoxdur." />
      ) : (
        payableOrders.map((order) => (
          <div key={order._id} className="rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink dark:text-white">#{order.orderNumber || order._id.slice(-6)}</span>
                  <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {order.buyer?.firstName} {order.buyer?.lastName}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {order.payout?.sellerPayoutStatus === 'available' ? (
                  <button type="button"
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                    disabled={payoutMutation.isPending}
                    onClick={() => payoutMutation.mutate({ id: order._id, target: 'seller' })}>
                    Satıcı: {formatPrice(order.payout.sellerEarning || 0)} — Ödə
                  </button>
                ) : null}
                {order.payout?.courierPayoutStatus === 'available' ? (
                  <button type="button"
                    className="inline-flex items-center gap-1.5 rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
                    disabled={payoutMutation.isPending}
                    onClick={() => payoutMutation.mutate({ id: order._id, target: 'courier' })}>
                    Kuryer: {formatPrice(order.payout.courierEarning || 0)} — Ödə
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-3">
      {usersQuery.isLoading ? <LoadingGrid rows={3} /> : users.length === 0 ? (
        <EmptyState icon={Users} title="İstifadəçi tapılmadı" />
      ) : (
        users.map((u) => (
          <div key={u._id} className="flex items-center justify-between gap-3 rounded-[20px] border border-[#E7EDEA] bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
            <div className="min-w-0">
              <div className="font-semibold text-ink dark:text-white">{u.firstName} {u.lastName}</div>
              <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {u.email} • {roleLabel(u.role)}
                {u.phone ? ` • ${u.phone}` : ''}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`inline-flex h-2 w-2 rounded-full ${u.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <button type="button"
                className="btn-secondary text-xs"
                disabled={toggleUserMutation.isPending}
                onClick={() => toggleUserMutation.mutate(u._id)}>
                {u.isActive !== false ? 'Bloklа' : 'Aktivləşdir'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500 dark:text-slate-400">{categories.length} kateqoriya</div>
        <button type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          onClick={() => { setCatError(null); setCatModal({ mode: 'create' }); }}>
          <Plus className="h-4 w-4" />Yeni kateqoriya
        </button>
      </div>

      {catError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
          {catError}
        </div>
      ) : null}

      {catQuery.isLoading ? <LoadingGrid rows={2} /> : categories.length === 0 ? (
        <EmptyState icon={Tag} title="Kateqoriya yoxdur" />
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat._id} className="flex items-center justify-between gap-3 rounded-[14px] border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="min-w-0">
                <div className="font-semibold text-ink dark:text-white">{cat.name}</div>
                {cat.nameEn ? <div className="text-xs text-slate-400 dark:text-slate-500">{cat.nameEn}</div> : null}
                {cat.description ? <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{cat.description}</div> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button"
                  className="rounded-full p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-400"
                  onClick={() => { setCatError(null); setCatModal({ mode: 'edit', item: cat }); }}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button"
                  className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                  onClick={() => setCatDeleteTarget(cat)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRegions = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{regions.length} aktiv region</div>
        </div>
        <button type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          onClick={() => { setRegionError(null); setRegionModal({ mode: 'create' }); }}>
          <Plus className="h-4 w-4" />Yeni region
        </button>
      </div>

      {regionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
          {regionError}
        </div>
      ) : null}

      {regionQuery.isLoading ? <LoadingGrid rows={2} /> : regions.length === 0 ? (
        <EmptyState icon={Globe} title="Region tapılmadı" />
      ) : (
        <div className="space-y-2">
          {regions.map((r) => (
            <div key={r._id} className="flex items-center justify-between gap-3 rounded-[14px] border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink dark:text-white">{r.name}</span>
                  {r.type ? (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                      {r.type}
                    </span>
                  ) : null}
                  <span className={`inline-flex h-2 w-2 rounded-full ${r.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
                {r.nameEn ? <div className="text-xs text-slate-400 dark:text-slate-500">{r.nameEn}</div> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button"
                  className="rounded-full p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-400"
                  onClick={() => { setRegionError(null); setRegionModal({ mode: 'edit', item: r }); }}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button"
                  className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                  onClick={() => setRegionDeleteTarget(r)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSupport = () => (
    <div className="space-y-3">
      {supportQuery.isLoading ? <LoadingGrid rows={2} /> : supportConversations.length === 0 ? (
        <EmptyState icon={MessageCircle} title="Dəstək sorğusu yoxdur" description="Hazırda açıq dəstək söhbəti yoxdur." />
      ) : (
        supportConversations.map((c) => {
          const unread = c.unread?.admin || 0;
          const name = `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim() || 'İstifadəçi';
          return (
            <div key={c._id} className="flex items-center justify-between gap-3 rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink dark:text-white">{name}</span>
                  {unread > 0 ? (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">{unread}</span>
                  ) : null}
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{c.lastMessage || 'Söhbət başladıldı'}</div>
              </div>
              <button type="button"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => navigate(`/messages?c=${c._id}`)}>
                <MessageCircle className="h-3.5 w-3.5" />Cavabla
              </button>
            </div>
          );
        })
      )}
    </div>
  );

  const tabContent = {
    overview:   renderOverview,
    products:   renderProducts,
    payouts:    renderPayouts,
    users:      renderUsers,
    categories: renderCategories,
    regions:    renderRegions,
    support:    renderSupport,
  };

  return (
    <div className="section-shell py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
          <ShieldCheck className="h-3.5 w-3.5" />Admin paneli
        </div>
        <h1 className="mt-2 text-3xl font-bold text-ink dark:text-white">
          Salam, {user?.firstName || 'Admin'}
        </h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max rounded-[16px] border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-900">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button key={id} type="button"
                onClick={() => id === 'shops' ? navigate('/shop') : setTab(id)}
                className={`inline-flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}>
                <Icon className="h-3.5 w-3.5" />{label}
                {id === 'products' && pendingProducts.length > 0 ? (
                  <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">{pendingProducts.length}</span>
                ) : null}
                {id === 'payouts' && payableOrders.length > 0 ? (
                  <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">{payableOrders.length}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {dashboardQuery.isLoading && tab === 'overview' ? <LoadingGrid rows={4} /> : tabContent[tab]?.()}

      {/* Modals */}
      {catModal ? (
        <CategoryModal
          initial={catModal.mode === 'edit' ? catModal.item : null}
          onClose={() => { setCatModal(null); setCatError(null); }}
          onSave={(payload) => {
            if (catModal.mode === 'create') catCreateMutation.mutate(payload);
            else catUpdateMutation.mutate({ id: catModal.item._id, payload });
          }}
          isLoading={catCreateMutation.isPending || catUpdateMutation.isPending}
          error={catError}
        />
      ) : null}

      {catDeleteTarget ? (
        <DeleteConfirm
          label={catDeleteTarget.name}
          onConfirm={() => catDeleteMutation.mutate(catDeleteTarget._id)}
          onCancel={() => setCatDeleteTarget(null)}
          isLoading={catDeleteMutation.isPending}
        />
      ) : null}

      {regionModal ? (
        <RegionModal
          initial={regionModal.mode === 'edit' ? regionModal.item : null}
          onClose={() => { setRegionModal(null); setRegionError(null); }}
          onSave={(payload) => {
            if (regionModal.mode === 'create') regionCreateMutation.mutate(payload);
            else regionUpdateMutation.mutate({ id: regionModal.item._id, payload });
          }}
          isLoading={regionCreateMutation.isPending || regionUpdateMutation.isPending}
          error={regionError}
        />
      ) : null}

      {regionDeleteTarget ? (
        <DeleteConfirm
          label={regionDeleteTarget.name}
          onConfirm={() => regionDeleteMutation.mutate(regionDeleteTarget._id)}
          onCancel={() => setRegionDeleteTarget(null)}
          isLoading={regionDeleteMutation.isPending}
          onDeactivate={() => {
            regionUpdateMutation.mutate({ id: regionDeleteTarget._id, payload: { isActive: false } });
            setRegionDeleteTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}
