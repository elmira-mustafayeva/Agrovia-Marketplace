import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { setCredentials } from '../features/auth/authSlice';
import { useRegions } from '../hooks/useAgroviaData';
import FormField from '../components/FormField';
import PasswordInput from '../components/PasswordInput';
import PhoneInput from '../components/PhoneInput';
import { loginSchema, registerSchema } from '../lib/validation';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [serverError, setServerError] = useState('');
  const [info, setInfo] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const regions = useRegions().data || [];

  // ── Login form ─────────────────────────────────────────────────────────────
  const {
    register: loginReg,
    handleSubmit: loginHS,
    formState: { errors: le },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const loginMutation = useMutation({
    mutationFn: api.login,
    onSuccess: (data) => {
      dispatch(setCredentials(data));
      if (data?.user?.role === 'buyer') { navigate('/', { replace: true }); return; }
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => setServerError(err.response?.data?.message || 'Giriş alınmadı'),
  });

  const submitLogin = loginHS((data) => {
    setServerError('');
    setInfo('');
    loginMutation.mutate(data);
  });

  // ── Register form ──────────────────────────────────────────────────────────
  const {
    register: regReg,
    handleSubmit: regHS,
    control: regControl,
    watch: regWatch,
    setValue: regSet,
    setError: regSetError,
    formState: { errors: re },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', phone: '',
      password: '', role: 'buyer', region: '',
      sellerSaleType: 'both', courierRegions: [],
    },
  });

  const selectedRole = regWatch('role');
  const courierRegions = regWatch('courierRegions') || [];

  const registerMutation = useMutation({
    mutationFn: api.register,
    onSuccess: (data) => {
      if (data?.token) {
        dispatch(setCredentials(data));
        if (data?.user?.role === 'buyer') { navigate('/', { replace: true }); return; }
        navigate('/dashboard', { replace: true });
        return;
      }
      setInfo(
        data?.data?.pendingApproval
          ? (data.message || 'Qeydiyyat qəbul edildi. Emailinizi doğrulayın və admin təsdiqini gözləyin.')
          : 'Qeydiyyat uğurludur. Emailinizi yoxlayın və hesabınızı doğrulayın.'
      );
      setMode('login');
    },
    onError: (err) => setServerError(err.response?.data?.message || 'Qeydiyyat alınmadı'),
  });

  const submitRegister = regHS((data) => {
    setServerError('');
    setInfo('');
    if (data.role === 'courier' && (!data.courierRegions || data.courierRegions.length === 0)) {
      regSetError('courierRegions', { message: 'Ən azı bir xidmət regionu seçin' });
      return;
    }
    const { region, sellerSaleType, courierRegions: cr, ...rest } = data;
    const payload = { ...rest, address: { region } };
    if (rest.role === 'seller') payload.sellerInfo = { saleType: sellerSaleType };
    if (rest.role === 'courier') payload.courierInfo = { regions: cr };
    registerMutation.mutate(payload);
  });

  const switchMode = (m) => { setMode(m); setServerError(''); setInfo(''); };

  // ── Shared error banner ────────────────────────────────────────────────────
  const errorBanner = serverError
    ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>
    : null;
  const infoBanner = info
    ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{info}</div>
    : null;

  return (
    <section className="section-shell flex min-h-[calc(100vh-120px)] items-center justify-center py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-slate-950 dark:text-white md:text-4xl">
            Daxil ol və ya qeydiyyatdan keç
          </h1>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-950 md:p-8">
          <div className="flex flex-wrap gap-3">
            <button type="button" className={mode === 'login' ? 'btn-primary' : 'btn-secondary'} onClick={() => switchMode('login')}>
              <LogIn className="h-4 w-4" />Giriş
            </button>
            <button type="button" className={mode === 'register' ? 'btn-primary' : 'btn-secondary'} onClick={() => switchMode('register')}>
              <UserPlus className="h-4 w-4" />Qeydiyyat
            </button>
          </div>

          {errorBanner}
          {infoBanner}

          {mode === 'login' ? (
            <form className="mt-6 grid gap-4" onSubmit={submitLogin} noValidate>
              <FormField label="Email" error={le.email} required>
                <input
                  className={`input-shell ${le.email ? 'input-error' : ''}`}
                  placeholder="Email"
                  type="email"
                  autoComplete="email"
                  {...loginReg('email')}
                />
              </FormField>

              <FormField label="Şifrə" error={le.password} required>
                <PasswordInput
                  className={`input-shell ${le.password ? 'input-error' : ''}`}
                  placeholder="Şifrə"
                  autoComplete="current-password"
                  disabled={loginMutation.isPending}
                  {...loginReg('password')}
                />
              </FormField>

              <button type="submit" className="btn-primary" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? 'Daxil olunur...' : 'Daxil ol'}
              </button>
              <div className="text-right text-sm">
                <Link to="/forgot-password" className="text-forest underline">Şifrəni unutmusunuz?</Link>
              </div>
            </form>
          ) : (
            <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submitRegister} noValidate>
              <FormField label="Ad" error={re.firstName} required>
                <input
                  className={`input-shell ${re.firstName ? 'input-error' : ''}`}
                  placeholder="Ad"
                  autoComplete="given-name"
                  {...regReg('firstName')}
                />
              </FormField>

              <FormField label="Soyad" error={re.lastName} required>
                <input
                  className={`input-shell ${re.lastName ? 'input-error' : ''}`}
                  placeholder="Soyad"
                  autoComplete="family-name"
                  {...regReg('lastName')}
                />
              </FormField>

              <FormField label="Email" error={re.email} required className="sm:col-span-2">
                <input
                  className={`input-shell ${re.email ? 'input-error' : ''}`}
                  placeholder="Email"
                  type="email"
                  autoComplete="email"
                  {...regReg('email')}
                />
              </FormField>

              <FormField label="Telefon" error={re.phone} required className="sm:col-span-2">
                <Controller
                  name="phone"
                  control={regControl}
                  render={({ field }) => (
                    <PhoneInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      hasError={!!re.phone}
                    />
                  )}
                />
              </FormField>

              <FormField label="Şifrə" error={re.password} required className="sm:col-span-2">
                <PasswordInput
                  className={`input-shell ${re.password ? 'input-error' : ''}`}
                  placeholder="Şifrə (ən az 8 simvol, 1 böyük hərf, 1 rəqəm)"
                  autoComplete="new-password"
                  disabled={registerMutation.isPending}
                  {...regReg('password')}
                />
              </FormField>

              <FormField label="Rol" error={re.role} required className="sm:col-span-2">
                <select className={`input-shell ${re.role ? 'input-error' : ''}`} {...regReg('role')}>
                  <option value="buyer">Alıcı (buyer)</option>
                  <option value="seller">Satıcı (seller)</option>
                  <option value="courier">Kuryer (courier)</option>
                </select>
              </FormField>

              {selectedRole === 'seller' && (
                <FormField label="Satış növü" error={re.sellerSaleType} className="sm:col-span-2">
                  <select className="input-shell" {...regReg('sellerSaleType')}>
                    <option value="both">Topdan və pərakəndə</option>
                    <option value="retail">Pərakəndə</option>
                    <option value="wholesale">Topdan</option>
                  </select>
                </FormField>
              )}

              {selectedRole === 'courier' && (
                <div className="sm:col-span-2">
                  <div className="mb-2 text-sm font-medium text-slate-700">
                    Xidmət regionları <span className="text-red-500">*</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 p-3">
                    {regions.map((r) => {
                      const checked = courierRegions.includes(r._id);
                      return (
                        <label key={r._id} className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              regSet('courierRegions', e.target.checked
                                ? [...courierRegions, r._id]
                                : courierRegions.filter((id) => id !== r._id))
                            }
                          />
                          {r.name}
                        </label>
                      );
                    })}
                  </div>
                  {re.courierRegions && (
                    <p className="helper-error">{re.courierRegions.message}</p>
                  )}
                </div>
              )}

              <FormField label="Region" error={re.region} required className="sm:col-span-2">
                <select
                  className={`input-shell ${re.region ? 'input-error' : ''}`}
                  {...regReg('region')}
                >
                  <option value="">Region seçin</option>
                  {regions.map((r) => (
                    <option key={r._id} value={r._id}>{r.name}</option>
                  ))}
                </select>
              </FormField>

              <button type="submit" className="btn-primary sm:col-span-2" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? 'Qeydiyyat olunur...' : 'Qeydiyyatdan keç'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

