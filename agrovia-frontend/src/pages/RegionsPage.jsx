import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { useRegions } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, SectionTitle } from '../components/Ui';

export default function RegionsPage() {
  const { data: regions = [], isLoading } = useRegions();

  return (
    <div className="section-shell py-10">
      <SectionTitle
        eyebrow="Coğrafiya"
        title="Regionlar"
        description="Yerli istehsalçıları regionlara görə kəşf edin."
        action={
          !isLoading ? (
            <div className="chip dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {regions.length} region
            </div>
          ) : null
        }
      />

      {isLoading ? (
        <LoadingGrid />
      ) : regions.length === 0 ? (
        <EmptyState icon={MapPin} title="Region tapılmadı" description="Hal-hazırda aktiv region mövcud deyil." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {regions.map((region) => (
            <Link
              key={region._id}
              to={`/regions/${region._id}`}
              className="group flex items-center gap-4 rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-forest transition group-hover:bg-forest group-hover:text-white dark:bg-emerald-500/15 dark:text-emerald-300 dark:group-hover:bg-emerald-600 dark:group-hover:text-white">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink dark:text-white">{region.name}</div>
                {region.nameEn ? (
                  <div className="truncate text-xs text-slate-400 dark:text-slate-500">{region.nameEn}</div>
                ) : region.type ? (
                  <div className="truncate text-xs capitalize text-slate-400 dark:text-slate-500">{region.type}</div>
                ) : null}
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-forest dark:text-slate-600 dark:group-hover:text-emerald-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
