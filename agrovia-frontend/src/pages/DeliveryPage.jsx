import { useMutation } from '@tanstack/react-query';
import { Calculator, MapPinned, Truck } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/agroviaApi';
import { SectionTitle, formatPrice } from '../components/Ui';

const TIER_LABELS = {
  same_region: 'Eyni rayon (A)',
  cross_region: 'Fərqli rayon, ≤100 km (B)',
  long_distance: 'Uzaq məsafə, >100 km (C)',
};

export default function DeliveryPage() {
  const [form, setForm] = useState({ origin: '', destination: '', sameRegion: false });
  const [result, setResult] = useState(null);

  const mutation = useMutation({
    mutationFn: api.calculateDelivery,
    onSuccess: (data) => setResult(data)
  });

  const submit = (event) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  return (
    <section className="section-shell py-10">
      <SectionTitle eyebrow="Delivery" title="Çatdırılma qiyməti hesablama" description="Backend-dən məsafə alınır, yeni üç pillə formulası tətbiq olunur." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={submit} className="panel space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Origin</label>
              <input className="input-shell" value={form.origin} onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))} placeholder="Bakı" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Destination</label>
              <input className="input-shell" value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} placeholder="Sumqayıt" />
            </div>
          </div>
          <label className="flex h-[48px] w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={form.sameRegion} onChange={(e) => setForm((f) => ({ ...f, sameRegion: e.target.checked }))} />
            Eyni rayon (same region)
          </label>
          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
            <Calculator className="h-4 w-4" />Hesabla
          </button>
        </form>

        <div className="panel space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Truck className="h-4 w-4 text-forest" />Nəticə
          </div>
          {result ? (
            <div className="space-y-3 rounded-3xl bg-slate-50 p-5 text-sm">
              <div className="flex justify-between"><span>Məsafə</span><span className="font-semibold">{result.distanceKm} km</span></div>
              <div className="flex justify-between"><span>Müddət</span><span className="font-semibold">{result.durationMinutes} dəq</span></div>
              <div className="flex justify-between"><span>Pillə</span><span className="font-semibold">{TIER_LABELS[result.pricingTier] || result.pricingTier}</span></div>
              <div className="flex justify-between text-base"><span>Qiymət</span><span className="font-semibold text-forest">{formatPrice(result.price)}</span></div>
            </div>
          ) : (
            <p className="rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              Origin və destination daxil et, sonra backend route-u nəticəni qaytarsın.
            </p>
          )}
          <div className="rounded-3xl bg-ink p-5 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPinned className="h-4 w-4 text-sun" />Qiymət pillələri
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-white/70">
              <li><span className="font-medium text-white/90">A — Eyni rayon:</span> 2 + km×0.35, maks 8 AZN</li>
              <li><span className="font-medium text-white/90">B — Fərqli, ≤100 km:</span> 4 + km×0.45, maks 25 AZN</li>
              <li><span className="font-medium text-white/90">C — Uzaq &gt;100 km:</span> pillə-pillə, maks 50 AZN</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
