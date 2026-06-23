import { useState } from 'react';
import { BadgeCheck, Clock3, Heart, Leaf, MapPin, PackageSearch, ShoppingCart, Sprout, Star, Store, Truck } from 'lucide-react';
import { formatDate, formatPrice, getProductImage, roleLabel } from '../lib/format';

// Read-only star display: filled up to `value`, empty after.
export function Stars({ value = 0, className = '' }) {
  const v = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${v}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-4 w-4 ${n <= v ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
      ))}
    </span>
  );
}

// Interactive 5-star picker.
export function StarRating({ value, onChange, disabled }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Ulduz qiymətləndirmə">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-label={`${n} ulduz`}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="rounded p-0.5 transition disabled:cursor-not-allowed"
          >
            <Star className={`h-7 w-7 ${filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
          </button>
        );
      })}
    </div>
  );
}

export const UNIT_LABELS = {
  kg: 'kq',
  gram: 'qram',
  liter: 'litr',
  piece: 'ədəd',
  bottle: 'şüşə',
  box: 'qutu',
  bag: 'kisə',
  ton: 'ton'
};

export const ORDER_STATUS_LABELS = {
  pending:          { label: 'Gözləyir',        color: 'amber' },
  confirmed:        { label: 'Təsdiqləndi',      color: 'blue' },
  preparing:        { label: 'Hazırlanır',       color: 'indigo' },
  ready:            { label: 'Hazırdır',         color: 'violet' },
  out_for_delivery: { label: 'Çatdırılır',       color: 'sky' },
  delivered:        { label: 'Çatdırıldı',       color: 'forest' },
  cancelled:        { label: 'Ləğv edildi',      color: 'rose' },
  returned:         { label: 'Geri qaytarıldı',  color: 'slate' },
};

export const PAYMENT_STATUS_LABELS = {
  pending:  { label: 'Ödəniş gözləyir', color: 'amber' },
  paid:     { label: 'Ödənilib',        color: 'forest' },
  failed:   { label: 'Ödəniş alınmadı', color: 'rose' },
  refunded: { label: 'Geri qaytarıldı', color: 'slate' },
};

export const PAYMENT_METHOD_LABELS = {
  card:   'Kartla ödəniş',
  cash:   'Nağd ödəniş',
  online: 'Onlayn ödəniş',
};

const STATUS_COLOR_MAP = {
  amber:  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  sky:    'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  forest: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  rose:   'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  slate:  'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

export function StatusBadge({ status, map }) {
  const entry = map?.[status] ?? { label: status, color: 'slate' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR_MAP[entry.color] ?? STATUS_COLOR_MAP.slate}`}>
      {entry.label}
    </span>
  );
}

export const getDiscountedPrice = (product) => {
  if (!product) return 0;
  const pct = product?.discount?.percentage;
  if (pct > 0) {
    return Math.round((product.price - product.price * pct / 100) * 100) / 100;
  }
  return product.price || 0;
};

export const hasDiscount = (product) => (product?.discount?.percentage || 0) > 0;

const SALE_TYPE_LABELS = {
  retail: 'Pərakəndə',
  wholesale: 'Topdan',
  both: 'Topdan və pərakəndə'
};

export const SectionTitle = ({ eyebrow, title, description, action }) => (
  <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="max-w-2xl">
      {eyebrow ? <div className="chip mb-3">{eyebrow}</div> : null}
      <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl dark:text-white">{title}</h2>
      {description ? <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base dark:text-slate-400">{description}</p> : null}
    </div>
    {action}
  </div>
);

export const LoadingGrid = ({ rows = 6 }) => (
  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="animate-pulse overflow-hidden rounded-[20px] border border-[#E7EDEA] bg-white shadow-card dark:border-slate-700 dark:bg-slate-900">
        <div className="h-52 bg-slate-100 dark:bg-slate-800" />
        <div className="p-3.5 space-y-3">
          <div className="h-3 w-3/4 rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="h-3 w-1/2 rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    ))}
  </div>
);

export const EmptyState = ({ icon: Icon = PackageSearch, title, description, action }) => (
  <div className="panel flex flex-col items-center justify-center py-16 text-center dark:bg-slate-900/60">
    <div className="mb-4 rounded-full bg-emerald-100 p-4 text-forest dark:bg-emerald-500/15 dark:text-emerald-300">
      <Icon className="h-7 w-7" />
    </div>
    <h3 className="text-xl font-bold text-ink dark:text-white">{title}</h3>
    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
    {action ? <div className="mt-6">{action}</div> : null}
  </div>
);

export const StatCard = ({ label, value, helper, icon: Icon = Leaf, accent = 'emerald' }) => (
  <div className="panel flex items-start gap-4 dark:bg-slate-900/60">
    <div className={`rounded-xl p-3 ${accent === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-emerald-100 text-forest dark:bg-emerald-500/15 dark:text-emerald-300'}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <div className="text-2xl font-bold text-ink dark:text-white">{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</div>
      {helper ? <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{helper}</div> : null}
    </div>
  </div>
);

// Design-doc-aligned ProductCard:
// - Whole card is clickable (calls onView); action buttons use stopPropagation
// - No description
// - Store icon + rating
// - Region with MapPin + category pill
// - Min order label
// - Large price + "Səbət" button
export const ProductCard = ({ product, onAddToCart, onWishlistToggle, isInWishlist, onView }) => {
  const discount = product?.discount?.percentage || 0;
  const discountedPrice = discount > 0
    ? (product.discountedPrice ?? Math.round((product.price - product.price * discount / 100) * 100) / 100)
    : product?.price;
  const image = getProductImage(product);
  const rating = Number(product?.averageRating || 0);
  const store = product?.seller?.sellerInfo?.businessName || product?.seller?.firstName || 'Satıcı';

  return (
    <article
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onView?.(); }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-[#E7EDEA] bg-white shadow-card transition hover:-translate-y-1.5 hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-900"
    >
      {/* Image area */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 3.1' }}>
        <img
          src={image}
          alt={product?.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
        />
        {discount > 0 ? (
          <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-extrabold text-white shadow-sm">
            -{discount}%
          </span>
        ) : null}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onWishlistToggle?.(); }}
          className="absolute right-2.5 top-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:scale-110 dark:bg-slate-800"
          title={isInWishlist ? 'Wishlist-dən çıxar' : 'Wishlist-ə əlavə et'}
        >
          <Heart
            className={`h-[17px] w-[17px] transition ${
              isInWishlist ? 'fill-rose-500 text-rose-500' : 'text-slate-500 dark:text-slate-400'
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-[13px]">
        {/* Store + Rating */}
        <div className="mb-[7px] flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-[5px] text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
            <Store className="h-[13px] w-[13px] shrink-0 text-slate-400 dark:text-slate-500" />
            <span className="truncate">{store}</span>
          </div>
          {rating > 0 ? (
            <div className="flex shrink-0 items-center gap-[3px]">
              <Star className="h-[13px] w-[13px] fill-amber-400 text-amber-400" />
              <span className="text-[12.5px] font-bold text-ink dark:text-white">{rating.toFixed(1)}</span>
            </div>
          ) : (
            <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">Yeni</span>
          )}
        </div>

        {/* Product name */}
        <h3 className="mb-2 line-clamp-2 text-[15px] font-bold leading-[1.25] text-ink dark:text-white">
          {product?.name}
        </h3>

        {/* Region + Category */}
        <div className="mb-[9px] flex flex-wrap items-center gap-2">
          {product?.region?.name ? (
            <span className="inline-flex items-center gap-1 text-[11.5px] text-slate-500 dark:text-slate-400">
              <MapPin className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
              {product.region.name}
            </span>
          ) : null}
          {product?.category?.name ? (
            <span className="rounded-full bg-emerald-50 px-[9px] py-[3px] text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              {product.category.name}
            </span>
          ) : null}
        </div>

        {/* Min order */}
        <div className="mb-3 text-[11.5px] text-slate-400 dark:text-slate-500">
          Min. sifariş:{' '}
          <span className="font-bold text-slate-500 dark:text-slate-400">
            {product?.minOrderQuantity || 1} {UNIT_LABELS[product?.unit] || product?.unit || 'ədəd'}
          </span>
        </div>

        {/* Price + Cart button */}
        <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
          <div>
            <div className="flex items-baseline gap-[6px]">
              <span className="text-[20px] font-extrabold tracking-tight text-ink dark:text-white">
                {formatPrice(discountedPrice)}
              </span>
              {discount > 0 ? (
                <span className="text-[12.5px] text-slate-400 line-through">
                  {formatPrice(product?.price)}
                </span>
              ) : null}
            </div>
            {product?.unit ? (
              <div className="text-[11.5px] text-slate-500 dark:text-slate-400">
                / {UNIT_LABELS[product.unit] || product.unit}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddToCart?.(); }}
            className="inline-flex h-[38px] shrink-0 items-center gap-[6px] rounded-[12px] bg-emerald-600 px-3.5 text-[13px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <ShoppingCart className="h-4 w-4" />
            Səbət
          </button>
        </div>
      </div>
    </article>
  );
};

export const DashboardBadge = ({ role }) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-slate-700">
    <BadgeCheck className="h-3.5 w-3.5" />
    {roleLabel(role)} paneli
  </span>
);

export const ActivityRow = ({ title, meta, value, icon: Icon = Clock3 }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-emerald-100 p-2 text-forest dark:bg-emerald-500/15 dark:text-emerald-300">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold text-ink dark:text-white">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{meta}</div>
      </div>
    </div>
    <div className="shrink-0 text-sm font-semibold text-forest dark:text-emerald-400">{value}</div>
  </div>
);

export const MiniInfo = ({ icon: Icon = Sprout, label, value }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-white/25 backdrop-blur-sm dark:bg-white/5 dark:ring-white/10">
    <div className="rounded-xl bg-white/20 p-2 dark:bg-white/10">
      <Icon className="h-4 w-4 text-white" />
    </div>
    <div>
      <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  </div>
);

export { formatDate, formatPrice, getProductImage, roleLabel, SALE_TYPE_LABELS };
