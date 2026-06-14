import { useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { ChevronRight, Mail, MapPinned, PhoneCall, ShieldCheck, Sparkles } from 'lucide-react';
import Navigation from '../components/Navigation';

export default function MainLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen text-slate-900">
      <Navigation onMenuToggle={() => setMenuOpen((value) => !value)} />
      {menuOpen ? (
        <div className="border-b border-slate-200 bg-white px-4 py-3 text-sm lg:hidden">
          <div className="section-shell flex flex-wrap gap-2">
            {[
              { to: '/', label: 'Ana səhifə' },
              { to: '/shop', label: 'Mağaza' },
              { to: '/delivery', label: 'Çatdırılma' },
              { to: '/orders', label: 'Sifarişlər' },
              { to: '/dashboard', label: 'Panel' },
              { to: '/cart', label: 'Səbət' },
              { to: '/wishlist', label: 'Wishlist' }
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 ${isActive ? 'bg-forest text-white' : 'bg-slate-100 text-slate-700'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}
      <main>{children}</main>
      <footer className="mt-16 border-t border-white/70 bg-ink text-white">
        <div className="section-shell grid gap-10 py-14 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-sun">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <div className="text-lg font-semibold">Agrovia</div>
                <div className="text-sm text-white/60">Aqrar marketplace təcrübəsi</div>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/70">
              Fermer, satıcı, alıcı və kuryer üçün eyni platformada dinamik məhsul axını, sifariş idarəsi və çatdırılma hesablama axını.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/75">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2"><ShieldCheck className="h-4 w-4" />Auth guarded</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2"><ChevronRight className="h-4 w-4" />Dynamic API data</span>
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-medium text-slate-600 shadow-soft backdrop-blur"
      >
        React + Tailwind + Query + Redux + API-driven UI
      </motion.div>
    </div>
  );
}
