import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Clock3, Leaf, PackageSearch, Sprout, Truck } from 'lucide-react';
import { formatDate, formatPrice, getProductImage, roleLabel } from '../lib/format';

const SALE_TYPE_LABELS = {
  retail: 'Pərakəndə',
  wholesale: 'Topdan',
  both: 'Topdan və pərakəndə'
};

export const SectionTitle = ({ eyebrow, title, description, action }) => (
  <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="max-w-2xl">
      {eyebrow ? <div className="chip mb-3">{eyebrow}</div> : null}
      <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {description ? <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{description}</p> : null}
    </div>
    {action}
  </div>
);

export const LoadingGrid = ({ rows = 6 }) => (
  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-56 rounded-2xl bg-slate-200" />
        <div className="mt-4 h-4 w-3/4 rounded bg-slate-200" />
        <div className="mt-3 h-3 w-1/2 rounded bg-slate-200" />
        <div className="mt-4 h-10 rounded-2xl bg-slate-200" />
      </div>
    ))}
  </div>
);

export const EmptyState = ({ icon: Icon = PackageSearch, title, description, action }) => (
  <div className="panel flex flex-col items-center justify-center py-16 text-center">
    <div className="mb-4 rounded-full bg-emerald-100 p-4 text-forest">
      <Icon className="h-7 w-7" />
    </div>
    <h3 className="text-xl font-semibold text-ink">{title}</h3>
    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
    {action ? <div className="mt-6">{action}</div> : null}
  </div>
);

export const StatCard = ({ label, value, helper, icon: Icon = Leaf, accent = 'emerald' }) => (
  <div className="panel flex items-start gap-4">
    <div className={`rounded-2xl p-3 ${accent === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-forest'}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <div className="text-2xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{label}</div>
      {helper ? <div className="mt-1 text-xs text-slate-500">{helper}</div> : null}
    </div>
  </div>
);

export const ProductCard = ({ product, onAddToCart, onAddToWishlist, onView }) => {
  const price = product?.discount?.percentage > 0 && product.discountedPrice ? product.discountedPrice : product?.price;
  const discount = product?.discount?.percentage || 0;
  const image = getProductImage(product);

  return (
    <motion.article
      whileHover={{ y: -6 }}
      className="group overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-soft transition"
    >
      <button type="button" onClick={onView} className="block w-full text-left">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={image} alt={product?.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute left-4 top-4 flex gap-2">
            {discount > 0 ? <span className="chip bg-amber-100 text-amber-800">-{discount}%</span> : null}
            <span className="chip bg-white/90 text-forest">{product?.unit}</span>
          </div>
        </div>
      </button>
      <div className="space-y-4 p-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-ink line-clamp-2">{product?.name}</h3>
            <div className="text-right text-sm font-semibold text-forest">{formatPrice(price)}</div>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{product?.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">{product?.category?.name || 'Kateqoriya yoxdur'}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">{product?.region?.name || 'Region yoxdur'}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">{product?.seller?.sellerInfo?.businessName || product?.seller?.firstName || 'Satıcı'}</span>
          {(product?.seller?.sellerInfo?.saleType || product?.saleType) ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-forest">
              {SALE_TYPE_LABELS[product?.seller?.sellerInfo?.saleType || product?.saleType]}
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onAddToWishlist} className="btn-secondary text-xs">
            İstək siyahısı
          </button>
          <button type="button" onClick={onAddToCart} className="btn-primary text-xs">
            Səbətə əlavə et
          </button>
        </div>
      </div>
    </motion.article>
  );
};

export const DashboardBadge = ({ role }) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
    <BadgeCheck className="h-3.5 w-3.5" />
    {roleLabel(role)} paneli
  </span>
);

export const ActivityRow = ({ title, meta, value, icon: Icon = Clock3 }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-emerald-100 p-2 text-forest">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        <div className="text-xs text-slate-500">{meta}</div>
      </div>
    </div>
    <div className="text-sm font-semibold text-forest">{value}</div>
  </div>
);

export const MiniInfo = ({ icon: Icon = Sprout, label, value }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-white/70">
    <div className="rounded-xl bg-emerald-100 p-2 text-forest">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-ink">{value}</div>
    </div>
  </div>
);

export { formatDate, formatPrice, getProductImage, roleLabel };
