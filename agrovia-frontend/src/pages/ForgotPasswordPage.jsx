import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { SectionTitle } from '../components/Ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: api.forgotPassword,
    onSuccess: () => {
      setSuccess(true);
      setError('');
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Sorğu göndərilmədi');
    }
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email daxil edin');
      return;
    }
    mutation.mutate({ email: email.trim() });
  };

  return (
    <section className="section-shell py-10">
      <SectionTitle
        eyebrow="Şifrə bərpası"
        title="Şifrəni sıfırla"
        description="Email ünvanınızı daxil edin. Əgər hesabınız varsa, sıfırlama linki göndəriləcək."
      />
      <div className="mx-auto max-w-md">
        <div className="panel">
          {success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-forest">
                <Mail className="h-6 w-6" />
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Əgər bu email sistemdə qeydiyyatlıdırsa, şifrə sıfırlama linki göndərildi.
              </div>
              <Link to="/auth" className="btn-secondary inline-flex">Girişə qayıt</Link>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={handleSubmit}>
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              ) : null}
              <input
                className="input-shell"
                type="email"
                placeholder="Email ünvanınız"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={mutation.isPending}
              />
              <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                {mutation.isPending ? 'Göndərilir...' : 'Şifrə sıfırlama linki göndər'}
              </button>
              <div className="text-center text-sm text-slate-500">
                <Link to="/auth" className="text-forest underline">Girişə qayıt</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
