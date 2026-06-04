import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="section-shell flex min-h-[70vh] items-center justify-center py-20 text-center">
      <div className="panel max-w-xl">
        <div className="text-6xl font-semibold text-forest">404</div>
        <h1 className="mt-4 text-3xl font-semibold text-ink">Səhifə tapılmadı</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Axtardığın route mövcud deyil. Ana səhifəyə qayıdıb yenidən başla.</p>
        <Link to="/" className="btn-primary mt-6">Ana səhifəyə qayıt</Link>
      </div>
    </section>
  );
}