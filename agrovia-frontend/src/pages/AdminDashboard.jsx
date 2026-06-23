import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line,
} from 'recharts';
import {
  AlertTriangle, ChevronDown, ChevronUp,
  CreditCard, Eye, EyeOff, Globe,
  LayoutDashboard, LogOut, MessageCircle, Package, PackageSearch,
  Pencil, Plus, Settings, ShieldCheck, ShoppingBag,
  Store, Tag, Trash2, Users, Wallet, X,
} from 'lucide-react';
import { api } from '../api/agroviaApi';
import { clearCredentials } from '../features/auth/authSlice';
import SupportPage from './SupportPage';
import {
  EmptyState, LoadingGrid, ORDER_STATUS_LABELS,
  StatusBadge, formatPrice, roleLabel,
} from '../components/Ui';

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'overview',    icon: LayoutDashboard, label: 'Ümumi baxış' },
  { key: 'products',   icon: PackageSearch,   label: 'Məhsullar' },
  { key: 'orders',     icon: ShoppingBag,     label: 'Sifarişlər' },
  { key: 'payouts',    icon: CreditCard,      label: 'Ödənişlər' },
  { key: 'users',      icon: Users,           label: 'İstifadəçilər' },
  { key: 'categories', icon: Tag,             label: 'Kateqoriyalar' },
  { key: 'regions',    icon: Globe,           label: 'Regionlar' },
  { key: 'shops',      icon: Store,           label: 'Mağazalar' },
  { key: 'support',    icon: MessageCircle,   label: 'Dəstək' },
  { key: 'settings',   icon: Settings,        label: 'Tənzimləmələr' },
];

const BREADCRUMBS = {
  overview:    ['Ümumi baxış'],
  products:    ['Məhsullar', 'Məhsul idarəetməsi'],
  orders:      ['Sifarişlər', 'Bütün sifarişlər'],
  payouts:     ['Ödənişlər', 'Ödəniş idarəetməsi'],
  users:       ['İstifadəçilər', 'İstifadəçi idarəetməsi'],
  categories:  ['Kateqoriyalar', 'Kateqoriya idarəetməsi'],
  regions:     ['Regionlar', 'Region idarəetməsi'],
  shops:       ['Mağazalar'],
  support:     ['Dəstək', 'Dəstək mərkəzi'],
  settings:    ['Tənzimləmələr'],
};

const SALE_TYPE = { retail: 'Pərakəndə', wholesale: 'Topdan', both: 'Topdan və pərakəndə' };

const PIE_COLORS = ['#6366F1', '#10B981', '#06B6D4', '#F59E0B'];

const ORDER_STATUS_AZ = {
  pending:          'Gözləyir',
  confirmed:        'Təsdiqləndi',
  preparing:        'Hazırlanır',
  out_for_delivery: 'Yoldadır',
  delivered:        'Çatdırıldı',
  cancelled:        'Ləğv edildi',
};

const ORDER_STATUS_FILL = {
  pending:          '#F59E0B',
  confirmed:        '#6366F1',
  preparing:        '#06B6D4',
  out_for_delivery: '#8B5CF6',
  delivered:        '#10B981',
  cancelled:        '#EF4444',
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, badgeCls }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className={`inline-flex items-center justify-center rounded-2xl p-3 ${badgeCls}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-sm text-slate-500">{label}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, empty, action }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-950">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {empty ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
          Məlumat yoxdur
        </div>
      ) : children}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      {label && <div className="mb-1 font-semibold text-slate-900">{label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} className="text-slate-600">
          {typeof p.value === 'number' && p.value > 100 ? formatPrice(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

const ACTION_COLORS = {
  amber:  { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',   num: 'text-amber-700'   },
  rose:   { bg: 'bg-rose-50',    border: 'border-rose-200',    badge: 'bg-rose-100 text-rose-700',     num: 'text-rose-700'    },
  indigo: { bg: 'bg-indigo-50',  border: 'border-indigo-200',  badge: 'bg-indigo-100 text-indigo-700', num: 'text-indigo-700'  },
  green:  { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', num: 'text-emerald-700' },
};

function ActionCard({ label, value, icon: Icon, accent, onClick }) {
  const c = ACTION_COLORS[accent] || ACTION_COLORS.indigo;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-center gap-4 rounded-2xl border ${c.border} ${c.bg} p-4 text-left transition hover:shadow-md disabled:cursor-default`}
    >
      <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.badge}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className={`text-2xl font-bold ${c.num}`}>{value}</div>
        <div className="mt-0.5 text-xs text-slate-500">{label}</div>
      </div>
    </button>
  );
}

function FormInput({ label, error, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-900">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ section, onSection, pendingCount, payableCount }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img src="/agrovia-logo.svg" alt="Agrovia" className="h-9 w-9 rounded-xl object-contain" />
        <div>
          <div className="text-sm font-bold text-slate-900">Agrovia</div>
          <div className="text-[10px] text-slate-400">Admin Paneli</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 pb-2">
        {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
          const active = section === key;
          const badge =
            key === 'products' && pendingCount > 0 ? pendingCount
            : key === 'payouts' && payableCount > 0 ? payableCount
            : null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => key === 'shops' ? navigate('/stores') : onSection(key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge ? (
                <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  active ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-slate-100 px-3 py-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Globe className="h-4 w-4 shrink-0" />
          Sayta qayıt
        </button>
        <button
          type="button"
          onClick={() => { dispatch(clearCredentials()); navigate('/'); }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Çıxış
        </button>
      </div>
    </aside>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({ section, user }) {
  const crumbs = BREADCRUMBS[section] || [section];
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-slate-900">Admin</span>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2 text-slate-400">
            <span>/</span>
            <span className={i === crumbs.length - 1 ? 'font-medium text-slate-600' : ''}>{c}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-semibold text-slate-900">{user?.firstName} {user?.lastName}</div>
          <div className="text-[10px] text-slate-400">Admin</div>
        </div>
        <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">
          {(user?.firstName?.[0] ?? 'A').toUpperCase()}
        </div>
      </div>
    </header>
  );
}

// ─── Settings section ─────────────────────────────────────────────────────────

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
    onError: (err) => {
      setMsg(err?.response?.data?.message || 'Xəta baş verdi.');
      setMsgOk(false);
    },
  });

  const sf = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = (e) => {
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
        <div className="mb-5 text-base font-semibold text-slate-900">Şifrəni dəyiş</div>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <FormInput label="Cari şifrə *">
            <div className="relative">
              <input
                type={showCur ? 'text' : 'password'}
                className="input-shell w-full pr-10"
                value={form.currentPassword}
                onChange={(e) => sf('currentPassword', e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowCur((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
              >
                {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormInput>
          <FormInput label="Yeni şifrə *">
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className="input-shell w-full pr-10"
                value={form.newPassword}
                onChange={(e) => sf('newPassword', e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormInput>
          <FormInput label="Yeni şifrəni təkrarlayın *">
            <input
              type="password"
              className="input-shell w-full"
              value={form.confirmPassword}
              onChange={(e) => sf('confirmPassword', e.target.value)}
              required
            />
          </FormInput>
          {msg ? (
            <div className={`rounded-xl border px-4 py-3 text-sm ${
              msgOk ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              {msg}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary px-8 py-2.5 text-sm disabled:opacity-60"
          >
            {mutation.isPending ? 'Dəyişdirilir...' : 'Şifrəni dəyiş'}
          </button>
        </form>
      </div>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {initial ? 'Kateqoriyanı düzəlt' : 'Yeni kateqoriya'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <FormInput label="Ad (AZ) *">
            <input className="input-shell" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kateqoriya adı" required />
          </FormInput>
          <FormInput label="Ad (EN)">
            <input className="input-shell" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Category name" />
          </FormInput>
          <FormInput label="Açıqlama">
            <textarea className="input-shell resize-none" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Kateqoriya haqqında qısa məlumat" />
          </FormInput>
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
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

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = { name: name.trim(), nameEn: nameEn.trim() || undefined, type, isActive };
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {initial ? 'Regionu düzəlt' : 'Yeni region'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:text-slate-600">
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
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-indigo-600" />
            <span className="text-sm font-medium text-slate-900">Region aktiv</span>
          </label>

          {initial ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="text-xs text-amber-800">
                  <span className="font-semibold">Koordinatlar çatdırılma qiymətinə təsir edir.</span>
                  {' '}Yalnız ehtiyac olduqda dəyişdirin.
                </div>
              </div>
              {!coordWarningShown ? (
                <button type="button" onClick={() => setCoordWarningShown(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800">
                  Koordinatları düzəlt
                </button>
              ) : !coordConfirmed ? (
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setCoordConfirmed(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">
                    Dəyişdirməyi təsdiq et
                  </button>
                  <button type="button" onClick={() => setCoordWarningShown(false)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600">
                    Ləğv et
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="mb-1.5 text-xs font-semibold text-amber-800">GeoJSON koordinatları:</div>
                  <textarea
                    className="input-shell w-full resize-y font-mono text-xs"
                    rows={5}
                    value={coordJson}
                    onChange={(e) => setCoordJson(e.target.value)}
                    placeholder='{"type":"Polygon","coordinates":[[[49.6,40.2],...]]}'
                    spellCheck={false}
                  />
                  {coordError ? <p className="mt-1 text-xs text-red-600">{coordError}</p> : null}
                </div>
              )}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <Trash2 className="h-5 w-5 text-red-600" />
        </div>
        <h3 className="mb-2 text-base font-bold text-slate-900">Silmək istəyirsiniz?</h3>
        <p className="mb-5 text-sm text-slate-500">
          <span className="font-semibold">{label}</span> silinəcək. Bu əməliyyat geri alına bilməz.
          {onDeactivate ? ' Əgər silinmirsə, deaktivasiya edə bilərsiniz.' : ''}
        </p>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onConfirm} disabled={isLoading}
            className="rounded-full bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
            {isLoading ? 'Silinir...' : 'Sil'}
          </button>
          {onDeactivate ? (
            <button type="button" onClick={onDeactivate} disabled={isLoading}
              className="rounded-full border border-amber-300 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50">
              Deaktivasiya et
            </button>
          ) : null}
          <button type="button" onClick={onCancel}
            className="rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            Ləğv et
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useSelector((s) => s.auth);
  const queryClient = useQueryClient();

  const [section, setSection] = useState('overview');
  const [expandedProduct, setExpandedProduct] = useState(null);

  const [catModal, setCatModal] = useState(null);
  const [catDeleteTarget, setCatDeleteTarget] = useState(null);
  const [catError, setCatError] = useState(null);

  const [regionModal, setRegionModal] = useState(null);
  const [regionDeleteTarget, setRegionDeleteTarget] = useState(null);
  const [regionError, setRegionError] = useState(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const dashboardQuery    = useQuery({ queryKey: ['dashboard', 'admin'], queryFn: api.adminDashboard });
  const pendingProductsQuery = useQuery({ queryKey: ['admin-pending-products'], queryFn: api.adminPendingProducts });
  const ordersQuery       = useQuery({ queryKey: ['admin-orders'], queryFn: api.adminOrders });
  const usersQuery        = useQuery({ queryKey: ['admin-users'], queryFn: api.adminUsers, enabled: section === 'users' });
  const catQuery          = useQuery({ queryKey: ['admin-categories'], queryFn: api.adminGetCategories, enabled: section === 'categories' });
  const regionQuery       = useQuery({ queryKey: ['admin-regions'], queryFn: api.adminGetRegions, enabled: section === 'regions' });

  // ── Mutations ────────────────────────────────────────────────────────────────
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); setCatModal(null); setCatError(null); },
    onError: (err) => setCatError(err.response?.data?.message || 'Xəta baş verdi.'),
  });

  const catUpdateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.adminUpdateCategory(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); setCatModal(null); setCatError(null); },
    onError: (err) => setCatError(err.response?.data?.message || 'Xəta baş verdi.'),
  });

  const catDeleteMutation = useMutation({
    mutationFn: (id) => api.adminDeleteCategory(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); setCatDeleteTarget(null); setCatError(null); },
    onError: (err) => { setCatDeleteTarget(null); setCatError(err.response?.data?.message || 'Silinmə zamanı xəta baş verdi.'); },
  });

  const regionCreateMutation = useMutation({
    mutationFn: (payload) => api.adminCreateRegion(payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-regions'] }); setRegionModal(null); setRegionError(null); },
    onError: (err) => setRegionError(err.response?.data?.message || 'Xəta baş verdi.'),
  });

  const regionUpdateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.adminUpdateRegion(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-regions'] }); setRegionModal(null); setRegionError(null); },
    onError: (err) => setRegionError(err.response?.data?.message || 'Xəta baş verdi.'),
  });

  const regionDeleteMutation = useMutation({
    mutationFn: (id) => api.adminDeleteRegion(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-regions'] }); setRegionDeleteTarget(null); setRegionError(null); },
    onError: (err) => { setRegionDeleteTarget(null); setRegionError(err.response?.data?.message || 'Silinmə zamanı xəta baş verdi.'); },
  });

  // ── Derived data ─────────────────────────────────────────────────────────────
  const stats          = dashboardQuery.data?.stats || {};
  const pendingProducts = pendingProductsQuery.data?.products || [];
  const allOrders       = ordersQuery.data?.orders || [];
  const payableOrders   = allOrders.filter(
    (o) => o.payout?.sellerPayoutStatus === 'available' || o.payout?.courierPayoutStatus === 'available'
  );
  const users    = usersQuery.data?.users || [];
  const categories = catQuery.data?.categories || [];
  const regions  = regionQuery.data?.regions || [];

  // Chart — users distribution
  const usersData = [
    { name: 'Alıcı',  value: stats.users?.buyers  || 0 },
    { name: 'Satıcı', value: stats.users?.sellers || 0 },
    { name: 'Kuryer', value: stats.users?.couriers || 0 },
  ].filter((d) => d.value > 0);
  const usersHasData = usersData.length > 0;

  // Chart — finance bar
  const financeData = [
    { name: 'Alıcı öd.',      value: stats.finance?.buyerPayments || stats.revenue || 0, fill: '#6366F1' },
    { name: 'Platform',       value: stats.finance?.platformFeeTotal || 0,                fill: '#8B5CF6' },
    { name: 'Satıcı (gözl.)', value: stats.finance?.sellerPayable || 0,                  fill: '#10B981' },
    { name: 'Kuryer (gözl.)', value: stats.finance?.courierPayable || 0,                 fill: '#06B6D4' },
  ];
  const financeHasData = financeData.some((d) => d.value > 0);

  // Chart — order status
  const orderStatusData = Object.keys(ORDER_STATUS_AZ)
    .map((key) => ({
      name: ORDER_STATUS_AZ[key],
      value: allOrders.filter((o) => o.status === key).length,
      fill: ORDER_STATUS_FILL[key],
    }))
    .filter((d) => d.value > 0);
  const ordersHasData = orderStatusData.length > 0;

  // Chart — product status
  const productStatusData = [
    { name: 'Aktiv',     value: stats.products?.total   || 0, fill: '#10B981' },
    { name: 'Gözləyir', value: stats.products?.pending  || 0, fill: '#F59E0B' },
    { name: 'Rədd edildi', value: stats.products?.rejected || 0, fill: '#EF4444' },
  ].filter((d) => d.value > 0);
  const productsHasData = productStatusData.some((d) => d.value > 0);

  // ── Section renderers ─────────────────────────────────────────────────────────

  const renderOverview = () => {
    const analytics = dashboardQuery.data?.analytics || {};
    const usersByRegion     = analytics.usersByRegion    || [];
    const productsByCategory = analytics.productsByCategory || [];
    const ordersByRegion    = analytics.ordersByRegion   || [];
    const growthTrend       = analytics.growthTrend      || [];
    const actionRequired    = analytics.actionRequired   || {};

    return (
      <div className="space-y-6">
        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="İstifadəçilər"        value={stats.users?.total || 0}                                         icon={Users}       badgeCls="bg-indigo-100 text-indigo-600" />
          <KpiCard label="Məhsullar"            value={stats.products?.total || 0}                                      icon={Package}     badgeCls="bg-emerald-100 text-emerald-600" />
          <KpiCard label="Sifarişlər"           value={stats.orders?.total || 0}                                        icon={ShoppingBag} badgeCls="bg-sky-100 text-sky-600" />
          <KpiCard label="Alıcı ödənişləri"    value={formatPrice(stats.finance?.buyerPayments || stats.revenue || 0)} icon={Wallet}      badgeCls="bg-violet-100 text-violet-600" />
          <KpiCard label="Platform komissiyası" value={formatPrice(stats.finance?.platformFeeTotal || 0)}               icon={CreditCard}  badgeCls="bg-amber-100 text-amber-600" />
        </div>

        {/* Operational action cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ActionCard label="Gözləyən məhsullar"       value={actionRequired.pendingProducts   || 0} icon={PackageSearch} accent="amber"  onClick={() => setSection('products')} />
          <ActionCard label="Ödənişi tamamlanmamış"    value={actionRequired.unpaidOrders      || 0} icon={CreditCard}    accent="rose"   onClick={() => setSection('payouts')} />
          <ActionCard label="Gecikən çatdırılmalar"    value={actionRequired.delayedDeliveries || 0} icon={ShoppingBag}   accent="rose"   onClick={null} />
          <ActionCard label="Satıcı təsdiqi gözləyənlər" value={actionRequired.pendingSellers   || 0} icon={Users}       accent="indigo" onClick={() => setSection('users')} />
        </div>

        {/* Region analytics: users by region + orders by region */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Regionlar üzrə istifadəçilər" subtitle="Ən çox üzv olan regionlar" empty={usersByRegion.length === 0}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={usersByRegion} barSize={18} layout="vertical" margin={{ left: 0, right: 12 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Bar dataKey="value" name="İstifadəçi" radius={[0, 6, 6, 0]} fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Regionlar üzrə sifarişlər" subtitle="Çatdırılma tələb olunan regionlar" empty={ordersByRegion.length === 0}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ordersByRegion} barSize={18} layout="vertical" margin={{ left: 0, right: 12 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(10,185,129,0.05)' }} />
                <Bar dataKey="value" name="Sifariş" radius={[0, 6, 6, 0]} fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Products by category + Growth trend */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Kateqoriyalar üzrə məhsullar" subtitle="Aktiv məhsulların kateqoriya bölgüsü" empty={productsByCategory.length === 0}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={productsByCategory} barSize={18} layout="vertical" margin={{ left: 0, right: 12 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(245,158,11,0.05)' }} />
                <Bar dataKey="value" name="Məhsul" radius={[0, 6, 6, 0]} fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Son 30 günlük artım" subtitle="Sifarişlər və yeni istifadəçilər" empty={growthTrend.length === 0}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={growthTrend} margin={{ left: 0, right: 12 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: '#475569' }} />
                <Line type="monotone" dataKey="orders" name="Sifarişlər"     stroke="#6366F1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="users"  name="İstifadəçilər"  stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Compact status summaries */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Sifariş statusları" subtitle="Status üzrə bölgü" empty={!ordersHasData}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={orderStatusData} barSize={22} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {orderStatusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="İstifadəçi bölgüsü" subtitle="Rol üzrə paylanma" empty={!usersHasData}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={usersData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {usersData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#475569' }} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                        <div className="font-semibold text-slate-900">{payload[0].name}</div>
                        <div className="text-slate-600">{payload[0].value} nəfər</div>
                      </div>
                    ) : null
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Recent lists */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-950">Son sifarişlər</h3>
              <button type="button" onClick={() => setSection('orders')} className="text-xs font-medium text-indigo-600 hover:underline">
                Hamısı →
              </button>
            </div>
            {ordersQuery.isLoading ? (
              <LoadingGrid rows={2} />
            ) : allOrders.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="Sifariş yoxdur" />
            ) : (
              <div className="space-y-2">
                {allOrders.slice(0, 5).map((order) => (
                  <div key={order._id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">#{order.orderNumber || order._id.slice(-6)}</div>
                      <div className="text-xs text-slate-500">{order.buyer?.firstName} {order.buyer?.lastName}</div>
                    </div>
                    <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-950">Gözləyən məhsullar</h3>
              {pendingProducts.length > 0 ? (
                <button type="button" onClick={() => setSection('products')} className="text-xs font-medium text-indigo-600 hover:underline">
                  Hamısı ({pendingProducts.length}) →
                </button>
              ) : null}
            </div>
            {pendingProductsQuery.isLoading ? (
              <LoadingGrid rows={2} />
            ) : pendingProducts.length === 0 ? (
              <EmptyState icon={PackageSearch} title="Gözləyən məhsul yoxdur" />
            ) : (
              <div className="space-y-2">
                {pendingProducts.slice(0, 5).map((product) => (
                  <div key={product._id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{product.name}</div>
                      <div className="text-xs text-slate-500">{product.seller?.firstName} {product.seller?.lastName}</div>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-amber-600">{formatPrice(product.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProducts = () => (
    <div className="space-y-4">
      {pendingProductsQuery.isLoading ? (
        <LoadingGrid rows={2} />
      ) : pendingProducts.length === 0 ? (
        <EmptyState icon={PackageSearch} title="Gözləyən məhsul yoxdur" description="Hazırda admin təsdiqini gözləyən məhsul tapılmadı." />
      ) : (
        pendingProducts.map((product) => {
          const expanded = expandedProduct === product._id;
          return (
            <div key={product._id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">{product.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {product.seller?.firstName} {product.seller?.lastName} • {product.category?.name || '—'} • {formatPrice(product.price)}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary shrink-0 text-xs"
                  onClick={() => setExpandedProduct(expanded ? null : product._id)}
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {expanded ? 'Bağla' : 'Bax'}
                </button>
              </div>

              {expanded ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
                    {[
                      ['Kateqoriya', product.category?.name || '—'],
                      ['Region',     product.region?.name || '—'],
                      ['Qiymət',     formatPrice(product.price)],
                      ['Vahid',      product.unit],
                      ['Satış tipi', SALE_TYPE[product.saleType] || '—'],
                      ['Min sifariş', product.minOrderQuantity],
                      ['Stok',       product.stockQuantity],
                      ['Satıcı',     `${product.seller?.firstName || ''} ${product.seller?.lastName || ''}`],
                    ].map(([k, v]) => (
                      <div key={k} className="text-slate-500">
                        <span className="font-medium text-slate-900">{k}:</span> {v}
                      </div>
                    ))}
                  </div>

                  {product.description ? (
                    <p className="mb-3 text-sm text-slate-600">{product.description}</p>
                  ) : null}

                  {product.images?.length > 0 ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {product.images.map((img) => (
                        <img
                          key={img.public_id || img.url}
                          src={img.url}
                          alt=""
                          className="h-20 w-20 rounded-xl border border-slate-200 object-cover"
                        />
                      ))}
                    </div>
                  ) : null}

                  {product.videos?.length > 0 ? (
                    <div className="mb-3">
                      <a href={product.videos[0].url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-indigo-600 underline">Videoya bax</a>
                    </div>
                  ) : null}

                  {approveMutation.isError && expandedProduct === product._id ? (
                    <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                      {approveMutation.error?.response?.data?.errors?.join(', ') || approveMutation.error?.response?.data?.message || 'Xəta baş verdi.'}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate({ id: product._id, status: 'active' })}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {approveMutation.isPending ? 'Gözləyin...' : 'Təsdiqlə'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate({ id: product._id, status: 'rejected' })}
                    >
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

  const renderOrders = () => (
    <div className="space-y-3">
      {ordersQuery.isLoading ? (
        <LoadingGrid rows={3} />
      ) : allOrders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Sifariş tapılmadı" />
      ) : (
        allOrders.map((order) => (
          <div key={order._id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">#{order.orderNumber || order._id.slice(-6)}</span>
                  <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {order.buyer?.firstName} {order.buyer?.lastName}
                  {order.buyer?.email ? ` • ${order.buyer.email}` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">{formatPrice(order.totalPrice || 0)}</div>
                <div className="text-xs text-slate-400">Ümumi məbləğ</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderPayouts = () => (
    <div className="space-y-3">
      {ordersQuery.isLoading ? (
        <LoadingGrid rows={2} />
      ) : payableOrders.length === 0 ? (
        <EmptyState icon={Wallet} title="Ödəniləcək yoxdur" description="Hazırda ödənilməsi gözlənilən satıcı və ya kuryer ödənişi yoxdur." />
      ) : (
        payableOrders.map((order) => (
          <div key={order._id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">#{order.orderNumber || order._id.slice(-6)}</span>
                  <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {order.buyer?.firstName} {order.buyer?.lastName}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {order.payout?.sellerPayoutStatus === 'available' ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
                    disabled={payoutMutation.isPending}
                    onClick={() => payoutMutation.mutate({ id: order._id, target: 'seller' })}
                  >
                    Satıcı: {formatPrice(order.payout.sellerEarning || 0)} — Ödə
                  </button>
                ) : null}
                {order.payout?.courierPayoutStatus === 'available' ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
                    disabled={payoutMutation.isPending}
                    onClick={() => payoutMutation.mutate({ id: order._id, target: 'courier' })}
                  >
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
      {usersQuery.isLoading ? (
        <LoadingGrid rows={3} />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="İstifadəçi tapılmadı" />
      ) : (
        users.map((u) => (
          <div key={u._id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900">{u.firstName} {u.lastName}</div>
              <div className="mt-0.5 text-sm text-slate-500">
                {u.email} • {roleLabel(u.role)}{u.phone ? ` • ${u.phone}` : ''}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`inline-flex h-2 w-2 rounded-full ${u.isActive !== false ? 'bg-emerald-500' : 'bg-red-400'}`} />
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={toggleUserMutation.isPending}
                onClick={() => toggleUserMutation.mutate(u._id)}
              >
                {u.isActive !== false ? 'Blokla' : 'Aktivləşdir'}
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
        <div className="text-sm text-slate-500">{categories.length} kateqoriya</div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          onClick={() => { setCatError(null); setCatModal({ mode: 'create' }); }}
        >
          <Plus className="h-4 w-4" />Yeni kateqoriya
        </button>
      </div>

      {catError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{catError}</div>
      ) : null}

      {catQuery.isLoading ? (
        <LoadingGrid rows={2} />
      ) : categories.length === 0 ? (
        <EmptyState icon={Tag} title="Kateqoriya yoxdur" />
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">{cat.name}</div>
                {cat.nameEn ? <div className="text-xs text-slate-400">{cat.nameEn}</div> : null}
                {cat.description ? <div className="mt-0.5 truncate text-xs text-slate-500">{cat.description}</div> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="rounded-full p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                  onClick={() => { setCatError(null); setCatModal({ mode: 'edit', item: cat }); }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  onClick={() => setCatDeleteTarget(cat)}
                >
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
        <div className="text-sm text-slate-500">{regions.length} region</div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          onClick={() => { setRegionError(null); setRegionModal({ mode: 'create' }); }}
        >
          <Plus className="h-4 w-4" />Yeni region
        </button>
      </div>

      {regionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{regionError}</div>
      ) : null}

      {regionQuery.isLoading ? (
        <LoadingGrid rows={2} />
      ) : regions.length === 0 ? (
        <EmptyState icon={Globe} title="Region tapılmadı" />
      ) : (
        <div className="space-y-2">
          {regions.map((r) => (
            <div key={r._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{r.name}</span>
                  {r.type ? (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{r.type}</span>
                  ) : null}
                  <span className={`inline-flex h-2 w-2 rounded-full ${r.isActive !== false ? 'bg-emerald-500' : 'bg-red-400'}`} />
                </div>
                {r.nameEn ? <div className="text-xs text-slate-400">{r.nameEn}</div> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="rounded-full p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                  onClick={() => { setRegionError(null); setRegionModal({ mode: 'edit', item: r }); }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  onClick={() => setRegionDeleteTarget(r)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const sectionMap = {
    overview:    renderOverview,
    products:    renderProducts,
    orders:      renderOrders,
    payouts:     renderPayouts,
    users:       renderUsers,
    categories:  renderCategories,
    regions:     renderRegions,
    settings:    () => <SettingsSection />,
  };

  const isLoading = dashboardQuery.isLoading && section === 'overview';

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-50">
      <Sidebar
        section={section}
        onSection={setSection}
        pendingCount={pendingProducts.length}
        payableCount={payableOrders.length}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar section={section} user={user} />

        <main className={`flex-1 p-6 ${section === 'support' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-3xl bg-slate-200" />
              ))}
            </div>
          ) : section === 'support' ? (
            <div className="-m-6 h-full">
              <SupportPage embedded />
            </div>
          ) : (
            sectionMap[section]?.()
          )}
        </main>
      </div>

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
