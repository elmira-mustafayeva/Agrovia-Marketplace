import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Moon, Sun } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import FloatingSupportButton from '../components/FloatingSupportButton';
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
      <FloatingSupportButton />
      <Footer />
    </div>
  );
}
