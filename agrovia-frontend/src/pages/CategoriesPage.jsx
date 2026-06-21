import { Link } from 'react-router-dom';
import { ArrowRight, Tag } from 'lucide-react';
import { useCategories } from '../hooks/useAgroviaData';
import { EmptyState, LoadingGrid, SectionTitle } from '../components/Ui';

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories();

  return (
    <div className="section-shell py-10">
      <SectionTitle
        description="Axtardığınız məhsul növünü seçin."
        action={
          !isLoading ? (
            <div className="chip dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {categories.length} kateqoriya
            </div>
          ) : null
        }
      />

      {isLoading ? (
        <LoadingGrid />
      ) : categories.length === 0 ? (
        <EmptyState icon={Tag} title="Kateqoriya tapılmadı" description="Hal-hazırda heç bir kateqoriya mövcud deyil." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat._id}
              to={`/categories/${cat._id}`}
              className="group flex items-center gap-4 rounded-[20px] border border-[#E7EDEA] bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-forest transition group-hover:bg-forest group-hover:text-white dark:bg-emerald-500/15 dark:text-emerald-300 dark:group-hover:bg-emerald-600 dark:group-hover:text-white">
                <Tag className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink dark:text-white">{cat.name}</div>
                {cat.nameEn ? (
                  <div className="truncate text-xs text-slate-400 dark:text-slate-500">{cat.nameEn}</div>
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
