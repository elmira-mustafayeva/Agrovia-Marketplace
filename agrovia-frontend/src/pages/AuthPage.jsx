import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { api } from '../api/agroviaApi';
import { setCredentials } from '../features/auth/authSlice';
import { SectionTitle } from '../components/Ui';

const loginSchema = z.object({ email: z.string().email('Düzgün email yaz'), password: z.string().min(6, 'Şifrə ən az 6 simvol olmalıdır') });
const registerSchema = z.object({
  firstName: z.string().min(3),
  lastName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(6),
  role: z.enum(['buyer', 'seller', 'courier'])
});

const initialLogin = { email: '', password: '' };
const initialRegister = { firstName: '', lastName: '', email: '', phone: '', password: '', role: 'buyer' };

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: api.login,
    onSuccess: (data) => {
      dispatch(setCredentials(data));
      navigate('/dashboard');
    },
    onError: (err) => setError(err.response?.data?.message || 'Giriş alınmadı')
  });

  const registerMutation = useMutation({
    mutationFn: api.register,
    onSuccess: (data) => {
      dispatch(setCredentials(data));
      navigate('/dashboard');
    },
    onError: (err) => setError(err.response?.data?.message || 'Qeydiyyat alınmadı')
  });

  const submitLogin = (event) => {
    event.preventDefault();
    setError('');
    const parsed = loginSchema.safeParse(loginForm);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Form xətası');
      return;
    }
    loginMutation.mutate(loginForm);
  };

  const submitRegister = (event) => {
    event.preventDefault();
    setError('');
    const parsed = registerSchema.safeParse(registerForm);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Form xətası');
      return;
    }
    registerMutation.mutate(registerForm);
  };

  return (
    <section className="section-shell py-10">
      <SectionTitle eyebrow="Autentication" title="Daxil ol və ya qeydiyyatdan keç" description="Login və register backend auth endpoint-lərinə bağlıdır." />
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="panel">
          <div className="flex flex-wrap gap-3">
            <button type="button" className={mode === 'login' ? 'btn-primary' : 'btn-secondary'} onClick={() => setMode('login')}><LogIn className="h-4 w-4" />Giriş</button>
            <button type="button" className={mode === 'register' ? 'btn-primary' : 'btn-secondary'} onClick={() => setMode('register')}><UserPlus className="h-4 w-4" />Qeydiyyat</button>
          </div>
          {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {mode === 'login' ? (
            <form className="mt-6 grid gap-4" onSubmit={submitLogin}>
              <input className="input-shell" placeholder="Email" value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} />
              <input className="input-shell" placeholder="Şifrə" type="password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} />
              <button type="submit" className="btn-primary">Daxil ol</button>
            </form>
          ) : (
            <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submitRegister}>
              <input className="input-shell" placeholder="Ad" value={registerForm.firstName} onChange={(event) => setRegisterForm((current) => ({ ...current, firstName: event.target.value }))} />
              <input className="input-shell" placeholder="Soyad" value={registerForm.lastName} onChange={(event) => setRegisterForm((current) => ({ ...current, lastName: event.target.value }))} />
              <input className="input-shell sm:col-span-2" placeholder="Email" value={registerForm.email} onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))} />
              <input className="input-shell sm:col-span-2" placeholder="Telefon" value={registerForm.phone} onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))} />
              <input className="input-shell sm:col-span-2" type="password" placeholder="Şifrə" value={registerForm.password} onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))} />
              <select className="input-shell sm:col-span-2" value={registerForm.role} onChange={(event) => setRegisterForm((current) => ({ ...current, role: event.target.value }))}>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="courier">Courier</option>
              </select>
              <button type="submit" className="btn-primary sm:col-span-2">Qeydiyyatdan keç</button>
            </form>
          )}
        </div>
        <div className="panel space-y-4">
          <div className="rounded-3xl bg-ink p-5 text-white">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">Daxil ol sonra</div>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-white/75">
              <li>• Dinamik cart və wishlist açılır</li>
              <li>• Role-based dashboard görünür</li>
              <li>• Token localStorage-da saxlanır</li>
            </ul>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            Seller, courier və admin panelləri backend roluna görə açılır. Buyers üçün səbət, sifariş və wishlist axını aktivdir.
          </div>
        </div>
      </div>
    </section>
  );
}