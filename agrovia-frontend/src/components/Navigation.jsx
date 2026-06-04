import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, ShoppingBag, LogOut, Sprout, Heart, UserCircle2, LayoutDashboard } from 'lucide-react';
import { clearCredentials } from '../features/auth/authSlice';

const navClass = ({ isActive }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-forest text-white shadow-lift' : 'text-slate-700 hover:bg-white hover:text-forest'}`;

export default function Navigation({ onMenuToggle }) {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="section-shell flex items-center justify-between gap-4 py-4">
        <Link to="/" className="flex items-center gap-3 font-semibold text-ink">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-forest text-white shadow-lift">
            <Sprout className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-base tracking-wide">Agrovia</span>
            <span className="block text-xs font-normal text-slate-500">Marketplace</span>
          </span>
        </Link>

        <button type="button" onClick={onMenuToggle} className="inline-flex rounded-full border border-slate-200 bg-white p-3 text-slate-700 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>

        <nav className="hidden items-center gap-2 lg:flex">
          <NavLink to="/" className={navClass}>Ana səhifə</NavLink>
          <NavLink to="/shop" className={navClass}>Mağaza</NavLink>
          <NavLink to="/delivery" className={navClass}>Çatdırılma</NavLink>
          <NavLink to="/orders" className={navClass}>Sifarişlər</NavLink>
          <NavLink to="/dashboard" className={navClass}>Panel</NavLink>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <NavLink to="/wishlist" className={navClass}>
            <span className="inline-flex items-center gap-2"><Heart className="h-4 w-4" />Wishlist</span>
          </NavLink>
          <NavLink to="/cart" className={navClass}>
            <span className="inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4" />Cart</span>
          </NavLink>
          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
                <UserCircle2 className="h-4 w-4" />{user.firstName || 'İstifadəçi'}
              </Link>
              <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
                <LogOut className="h-4 w-4" />Çıxış
              </button>
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
