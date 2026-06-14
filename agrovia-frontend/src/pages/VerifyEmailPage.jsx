import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { SectionTitle } from '../components/Ui';

export default function VerifyEmailPage() {
  const { token } = useParams();

  const { isLoading, isSuccess, isError, error } = useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => api.verifyEmail(token),
    retry: false,
    staleTime: Infinity
  });

  return (
    <section className="section-shell py-10">
      <SectionTitle eyebrow="Email doğrulama" title="Email ünvanınızı doğrulayın" />
      <div className="mx-auto max-w-md">
        <div className="panel space-y-4 text-center">
          {isLoading ? (
            <p className="py-4 text-sm text-slate-600">Email təsdiqlənir...</p>
          ) : isSuccess ? (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-forest">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Email uğurla təsdiqləndi. İndi daxil ola bilərsiniz.
              </div>
              <Link to="/auth" className="btn-primary inline-flex">Daxil ol</Link>
            </>
          ) : isError ? (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                <XCircle className="h-6 w-6" />
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error?.response?.data?.message || 'Doğrulama linki etibarsızdır və ya vaxtı keçib'}
              </div>
              <Link to="/auth" className="btn-secondary inline-flex">Yenidən qeydiyyat / giriş səhifəsinə qayıt</Link>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
