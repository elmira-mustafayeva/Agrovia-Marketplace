import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { SectionTitle } from '../components/Ui';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload) => api.resetPassword(token, payload),
    onSuccess: () => {
      setSuccess(true);
      setError('');
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Şifrə sıfırlanmadı');
    }
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Şifrə ən az 8 simvol olmalıdır');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Şifrələr uyğun gəlmir');
      return;
    }
    mutation.mutate({ newPassword });
  };

  return (
    <section className="section-shell py-10">
      <SectionTitle
        eyebrow="Şifrə bərpası"
        title="Yeni şifrə təyin et"
        description="Aşağıda yeni şifrənizi daxil edin."
      />
      <div className="mx-auto max-w-md">
        <div className="panel">
          {success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-forest">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Şifrəniz uğurla sıfırlandı. İndi yeni şifrənizlə daxil ola bilərsiniz.
              </div>
              <Link to="/auth" className="btn-primary inline-flex">Daxil ol</Link>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={handleSubmit}>
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              ) : null}
              <input
                className="input-shell"
                type="password"
                placeholder="Yeni şifrə (ən az 8 simvol)"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={mutation.isPending}
              />
              <input
                className="input-shell"
                type="password"
                placeholder="Şifrəni təsdiqlə"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={mutation.isPending}
              />
              <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                {mutation.isPending ? 'Sıfırlanır...' : 'Şifrəni sıfırla'}
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
