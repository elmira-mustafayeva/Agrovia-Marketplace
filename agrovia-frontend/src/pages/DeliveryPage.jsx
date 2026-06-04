import { useMutation } from '@tanstack/react-query';
import { Calculator, CloudRain, MapPinned, Truck } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/agroviaApi';
import { SectionTitle, formatPrice } from '../components/Ui';

export default function DeliveryPage() {
  const [form, setForm] = useState({ origin: '', destination: '', weather: 'normal', isPeak: false, demand: 'normal' });
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
      <SectionTitle eyebrow="Delivery" title="Çatdırılma qiyməti hesablama" description="Backend-dən məsafə və müddət alınır, sonra price calculator tətbiq olunur." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={submit} className="panel space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Origin</label>
              <input className="input-shell" value={form.origin} onChange={(event) => setForm((current) => ({ ...current, origin: event.target.value }))} placeholder="Bakı" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Destination</label>
              <input className="input-shell" value={form.destination} onChange={(event) => setForm((current) => ({ ...current, destination: event.target.value }))} placeholder="Sumqayıt" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Weather</label>
              <select className="input-shell" value={form.weather} onChange={(event) => setForm((current) => ({ ...current, weather: event.target.value }))}>
                <option value="normal">Normal</option>
                <option value="rain">Rain</option>
                <option value="snow">Snow</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Demand</label>
              <select className="input-shell" value={form.demand} onChange={(event) => setForm((current) => ({ ...current, demand: event.target.value }))}>
                <option value="normal">Normal</option>
                <option value="busy">Busy</option>
                <option value="very_busy">Very busy</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex h-[48px] w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={form.isPeak} onChange={(event) => setForm((current) => ({ ...current, isPeak: event.target.checked }))} /> Peak time
              </label>
            </div>
          </div>
          <button type="submit" className="btn-primary w-full"><Calculator className="h-4 w-4" />Hesabla</button>
        </form>
        <div className="panel space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Truck className="h-4 w-4 text-forest" />Nəticə</div>
          {result ? (
            <div className="space-y-3 rounded-3xl bg-slate-50 p-5 text-sm">
              <div className="flex justify-between"><span>Məsafə</span><span className="font-semibold">{result.distanceKm} km</span></div>
              <div className="flex justify-between"><span>Müddət</span><span className="font-semibold">{result.durationMinutes} dəq</span></div>
              <div className="flex justify-between text-base"><span>Qiymət</span><span className="font-semibold text-forest">{formatPrice(result.price)}</span></div>
            </div>
          ) : (
            <p className="rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">Origin və destination daxil et, sonra backend route-u nəticəni qaytarsın.</p>
          )}
          <div className="rounded-3xl bg-ink p-5 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold"><CloudRain className="h-4 w-4 text-sun" />Price rules</div>
            <p className="mt-2 text-sm leading-6 text-white/70">Məsafə, vaxt, hava və demand faktorları calculator-a ötürülür.</p>
          </div>
        </div>
      </div>
    </section>
  );
}