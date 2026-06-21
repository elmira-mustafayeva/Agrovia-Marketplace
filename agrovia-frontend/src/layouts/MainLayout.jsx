import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Mail, MapPinned, Moon, PhoneCall, Sparkles, Sun } from 'lucide-react';
import Navigation from '../components/Navigation';
import { useTheme } from '../components/ThemeProvider';
import { getMobileLinks } from '../config/navConfig';
import { clearCredentials } from '../features/auth/authSlice';

export default function MainLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, token } = useSelector((state) => state.auth);
  const { theme, toggleTheme } = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isBuyer = user?.role === 'buyer';
  const mobileLinks = getMobileLinks(user?.role, { isBuyer, signedIn: !!token });

  const close = () => setMenuOpen(false);
  const handleLogout = () => { dispatch(clearCredentials()); close(); navigate('/'); };

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <Navigation onMenuToggle={() => setMenuOpen((value) => !value)} />

      {menuOpen ? (
        <div className="border-b border-slate-200 bg-white px-4 py-3 text-sm lg:hidden dark:border-slate-800 dark:bg-slate-950">
          <div className="section-shell flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {mobileLinks.map(({ to, label }) => (
                <NavLink
                  key={label}
                  to={to}
                  end={to === '/'}
                  onClick={close}
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 ${
                      isActive
                        ? 'bg-forest text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === 'dark' ? 'İşıqlı rejim' : 'Qaranlıq rejim'}
              </button>
              {user ? (
                <button type="button" onClick={handleLogout} className="rounded-full bg-ink px-4 py-2 font-semibold text-white dark:bg-slate-800">Çıxış</button>
              ) : (
                <NavLink to="/auth" onClick={close} className="btn-primary py-2">Daxil ol</NavLink>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <main>{children}</main>

      <footer className="mt-16 border-t border-white/70 bg-ink text-white dark:border-slate-800">
        <div className="section-shell grid gap-10 py-14 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-sun">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <div className="text-lg font-semibold">Agrovia</div>
                <div className="text-sm text-white/60">Yerli məhsul marketplace təcrübəsi</div>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/70">
              Satıcı, alıcı və kuryer üçün eyni platformada dinamik məhsul axını, sifariş idarəsi və çatdırılma hesablama axını.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/75">
             </div>
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">Əlaqə</div>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              <li className="inline-flex items-center gap-3"><PhoneCall className="h-4 w-4 text-sun" />+994 50 000 00 00</li>
              <li className="inline-flex items-center gap-3"><Mail className="h-4 w-4 text-sun" />support@agrovia.az</li>
              <li className="inline-flex items-center gap-3"><MapPinned className="h-4 w-4 text-sun" />Bakı, Azərbaycan</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">İş axını</div>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              <li>1. Məhsul baxışı</li>
              <li>2. Səbət və wishlist</li>
              <li>3. Sifariş və çatdırılma</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
