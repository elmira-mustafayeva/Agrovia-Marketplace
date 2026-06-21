import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, KeyRound, UserCircle2 } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { setCredentials } from '../features/auth/authSlice';
import { azNameStr } from '../lib/validation';
import PhoneInput from '../components/PhoneInput';
import { SectionTitle } from '../components/Ui';

// Profile fields schema — phone optional (empty or full AZ number)
const profileSchema = z.object({
  firstName: azNameStr,
  lastName: azNameStr,
  phone: z.string().max(20).optional(),
  address: z.string().max(300, 'Ünvan 300 simvoldan çox ola bilməz').optional(),
});

// Change-password schema
const pwSchema = z
  .object({
    currentPassword: z.string().min(1, 'Cari şifrəni daxil edin'),
    newPassword: z.string().min(8, 'Yeni şifrə ən az 8 simvol olmalıdır'),
    confirmPassword: z.string().min(1, 'Şifrəni təsdiqləyin'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Şifrələr uyğun gəlmir',
    path: ['confirmPassword'],
  });

function FormField({ label, error, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-ink dark:text-white">{label}</label>
      {children}
      {error ? <p className="helper-error">{error}</p> : null}
    </div>
  );
}

function PasswordField({ label, error, name, register, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <FormField label={label} error={error}>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete="off"
          className={`input-shell pr-11 ${error ? 'input-error' : ''}`}
          {...register(name)}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          tabIndex={-1}
          aria-label={show ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FormField>
  );
}

export default function BuyerProfilePage() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((s) => s.auth);

  const [profileMsg, setProfileMsg] = useState(null);
  const [pwMsg, setPwMsg] = useState(null);

  // ── Profile form ────────────────────────────────────────────────────────────
  const {
    register: regPro,
    handleSubmit: hsPro,
    control: ctrlPro,
    formState: { errors: ePro },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      address: typeof user?.address === 'string' ? user.address : '',
    },
  });

  const profileMutation = useMutation({
    mutationFn: api.updateAuthProfile,
    onSuccess: (data) => {
      if (data?.user) {
        dispatch(setCredentials({ user: data.user, token }));
      }
      setProfileMsg({ type: 'success', text: 'Profil məlumatları yeniləndi.' });
      setTimeout(() => setProfileMsg(null), 4000);
    },
    onError: (err) => {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Yeniləmə zamanı xəta baş verdi.' });
    },
  });

  const onProfileSubmit = (data) => {
    const payload = {
      firstName: data.firstName,
      lastName: data.lastName,
    };
    // Include phone only if the user typed something beyond the +994 prefix
    if (data.phone && data.phone.length > 4 && data.phone !== '+994') {
      payload.phone = data.phone;
    }
    if (data.address?.trim()) {
      payload.address = data.address.trim();
    }
    profileMutation.mutate(payload);
  };

  // ── Change-password form ────────────────────────────────────────────────────
  const {
    register: regPw,
    handleSubmit: hsPw,
    reset: resetPw,
    formState: { errors: ePw },
  } = useForm({ resolver: zodResolver(pwSchema) });

  const pwMutation = useMutation({
    mutationFn: api.changePassword,
    onSuccess: () => {
      resetPw();
      setPwMsg({ type: 'success', text: 'Şifrə uğurla dəyişdirildi.' });
      setTimeout(() => setPwMsg(null), 4000);
    },
    onError: (err) => {
      setPwMsg({ type: 'error', text: err.response?.data?.message || 'Şifrə dəyişdirilmədi.' });
    },
  });

  const onPwSubmit = (data) => {
    pwMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  const msgClass = (type) =>
    type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      : 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300';

  return (
    <div className="section-shell py-10">
      <SectionTitle
        eyebrow="Hesabım"
        title="Profil tənzimləmələri"
        description="Ad, telefon və çatdırılma ünvanını burada dəyişə bilərsiniz."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile info */}
        <div className="rounded-[20px] border border-[#E7EDEA] bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-forest dark:bg-emerald-500/15 dark:text-emerald-300">
              <UserCircle2 className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-ink dark:text-white">Profil məlumatları</h2>
          </div>

          <form onSubmit={hsPro(onProfileSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Ad" error={ePro.firstName?.message}>
                <input
                  className={`input-shell ${ePro.firstName ? 'input-error' : ''}`}
                  placeholder="Adınız"
                  {...regPro('firstName')}
                />
              </FormField>
              <FormField label="Soyad" error={ePro.lastName?.message}>
                <input
                  className={`input-shell ${ePro.lastName ? 'input-error' : ''}`}
                  placeholder="Soyadınız"
                  {...regPro('lastName')}
                />
              </FormField>
            </div>

            <FormField label="Email" error={null}>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                className="input-shell cursor-not-allowed opacity-60"
                title="Email ünvanını burada dəyişmək olmaz"
              />
            </FormField>

            <FormField label="Telefon nömrəsi" error={ePro.phone?.message}>
              <Controller
                name="phone"
                control={ctrlPro}
                render={({ field }) => (
                  <PhoneInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    hasError={!!ePro.phone}
                  />
                )}
              />
            </FormField>

            <FormField label="Çatdırılma ünvanı (istəyə bağlı)" error={ePro.address?.message}>
              <input
                className={`input-shell ${ePro.address ? 'input-error' : ''}`}
                placeholder="Küçə, ev nömrəsi..."
                {...regPro('address')}
              />
            </FormField>

            {profileMsg ? (
              <div className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${msgClass(profileMsg.type)}`}>
                {profileMsg.text}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="btn-primary w-full disabled:opacity-60"
            >
              {profileMutation.isPending ? 'Yenilənir...' : 'Dəyişiklikləri yadda saxla'}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="rounded-[20px] border border-[#E7EDEA] bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-ink dark:text-white">Şifrə dəyişdirmə</h2>
          </div>

          <form onSubmit={hsPw(onPwSubmit)} className="space-y-4">
            <PasswordField
              label="Cari şifrə"
              name="currentPassword"
              register={regPw}
              error={ePw.currentPassword?.message}
              placeholder="Mövcud şifrəniz"
            />
            <PasswordField
              label="Yeni şifrə"
              name="newPassword"
              register={regPw}
              error={ePw.newPassword?.message}
              placeholder="Ən az 8 simvol"
            />
            <PasswordField
              label="Yeni şifrəni təsdiqlə"
              name="confirmPassword"
              register={regPw}
              error={ePw.confirmPassword?.message}
              placeholder="Yeni şifrəni təkrarlayın"
            />

            {pwMsg ? (
              <div className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${msgClass(pwMsg.type)}`}>
                {pwMsg.text}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pwMutation.isPending}
              className="btn-primary w-full disabled:opacity-60"
            >
              {pwMutation.isPending ? 'Dəyişdirilir...' : 'Şifrəni dəyişdir'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
