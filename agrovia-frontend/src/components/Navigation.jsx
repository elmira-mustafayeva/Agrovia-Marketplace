import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ClipboardList,
  Globe,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Search,
  ShoppingBag,
  Sun,
  UserCircle2,
} from 'lucide-react';
import { clearCredentials } from '../features/auth/authSlice';
import { useCart, useWishlist } from '../hooks/useAgroviaData';
import { useOpenConversation } from '../hooks/useOpenConversation';
import { useTheme } from './ThemeProvider';
import { getPrimaryLinks } from '../config/navConfig';

const LANGS = ['AZ', 'EN', 'RU', 'AR'];
const ROLE_LABELS = { buyer: 'Alıcı', seller: 'Satıcı', courier: 'Kuryer', admin: 'Admin' };

const navClass = ({ isActive }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-forest text-white shadow-lift'
      : 'text-slate-700 hover:bg-white hover:text-forest dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-emerald-300'
  }`;

function MenuItem({ to, icon: Icon, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export default function Navigation({ onMenuToggle }) {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const openChat = useOpenConversation();
  const { theme, toggleTheme } = useTheme();

  const isBuyer = user?.role === 'buyer';
  const primaryLinks = getPrimaryLinks(user?.role);

  const cartQuery = useCart(!!token && isBuyer);
  const wishlistQuery = useWishlist(!!token && isBuyer);
  const cartCount = cartQuery.data?.items?.length ?? 0;
  const wishlistCount = wishlistQuery.data?.items?.length ?? 0;

  const [search, setSearch] = useState('');
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('agrovia-lang') || 'AZ'; } catch { return 'AZ'; }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const handle = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [userMenuOpen]);

  const handleLogout = () => { dispatch(clearCredentials()); setUserMenuOpen(false); navigate('/'); };
  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/shop?search=${encodeURIComponent(q)}` : '/shop');
    setSearch('');
  };
  const changeLang = (e) => {
    setLang(e.target.value);
    try { localStorage.setItem('agrovia-lang', e.target.value); } catch { /* ignore */ }
  };
  const startSupport = () => { setUserMenuOpen(false); openChat({ type: 'support' }); };

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="section-shell flex items-center justify-between gap-4 py-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#064e3b] bg-white shadow-sm">
            <img
              src="/agrovia-logo.svg?v=2"
              alt="Agrovia Marketplace"
              className="h-12 w-12 object-contain"
            />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-bold text-slate-900 dark:text-white">Agrovia</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Marketplace</p>
          </div>
        </Link>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="inline-flex rounded-full border border-slate-200 bg-white p-3 text-slate-700 lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Primary links */}
        <nav className="hidden items-center gap-1 lg:flex">
          {primaryLinks.map((l) => (
            <NavLink key={l.label} to={l.to} end={l.to === '/'} className={navClass}>{l.label}</NavLink>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="hidden items-center gap-2 lg:flex">
          {/* Search → shop */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Axtar..."
              aria-label="Məhsul axtar"
              className="w-36 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:w-52 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-emerald-900/40"
            />
          </form>

          {/* Buyer cart + wishlist */}
          {isBuyer ? (
            <>
              <NavLink to="/wishlist" className={navClass} aria-label="Wishlist">
                <span className="relative inline-flex items-center">
                  <Heart className="h-4 w-4" />
                  {wishlistCount > 0 ? (
                    <span className="absolute -right-2.5 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold leading-none text-white">{wishlistCount}</span>
                  ) : null}
                </span>
              </NavLink>
              <NavLink to="/cart" className={navClass} aria-label="Səbət">
                <span className="relative inline-flex items-center">
                  <ShoppingBag className="h-4 w-4" />
                  {cartCount > 0 ? (
                    <span className="absolute -right-2.5 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-forest text-[10px] font-bold leading-none text-white">{cartCount}</span>
                  ) : null}
                </span>
              </NavLink>
            </>
          ) : null}

          {/* Messages (signed in) */}
          {token ? (
            <NavLink to="/messages" className={navClass} aria-label="Mesajlar"><MessageCircle className="h-4 w-4" /></NavLink>
          ) : null}

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'İşıqlı rejim' : 'Qaranlıq rejim'}
            className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Language (cosmetic, AZ default) */}
          <div className="relative">
            <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <select
              value={lang}
              onChange={changeLang}
              aria-label="Dil"
              className="appearance-none rounded-full border border-slate-200 bg-white py-2 pl-7 pr-6 text-xs font-semibold text-slate-600 outline-none transition focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Auth / user menu */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
              >
                <UserCircle2 className="h-4 w-4" />
                <span className="max-w-[7rem] truncate">{user.firstName || 'İstifadəçi'}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {userMenuOpen ? (
                <div
                  className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                  style={{ zIndex: 70 }}
                >
                  <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <div className="text-sm font-semibold text-ink dark:text-white">{user.firstName} {user.lastName}</div>
                    <div className="text-xs text-slate-400">{ROLE_LABELS[user.role] || 'İstifadəçi'}</div>
                  </div>
                  <div className="py-1 text-sm">
                    {isBuyer ? <MenuItem to="/profile" icon={UserCircle2} label="Profilim" onClick={() => setUserMenuOpen(false)} /> : null}
                    {['seller', 'courier', 'admin'].includes(user?.role) ? (
                      <MenuItem to="/dashboard" icon={LayoutDashboard} label="İdarəetmə paneli" onClick={() => setUserMenuOpen(false)} />
                    ) : null}
                    {isBuyer ? <MenuItem to="/orders" icon={ClipboardList} label="Sifarişlərim" onClick={() => setUserMenuOpen(false)} /> : null}
                    <MenuItem to="/messages" icon={MessageCircle} label="Mesajlar" onClick={() => setUserMenuOpen(false)} />
                    <button
                      type="button"
                      onClick={startSupport}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <LifeBuoy className="h-4 w-4" />Dəstək
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <LogOut className="h-4 w-4" />Çıxış
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Link to="/auth" className="btn-primary">
              <LayoutDashboard className="h-4 w-4" />Daxil ol
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
