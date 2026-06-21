import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Heart, Package, Truck, ShieldAlert, LogIn, MessageCircle, LifeBuoy } from 'lucide-react';
import { useSelector } from 'react-redux';
import { DashboardBadge } from '../components/Ui';
import { useOpenConversation } from '../hooks/useOpenConversation';

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-forest text-white shadow-lift' : 'text-slate-700 hover:bg-slate-100'}`;
const staticLinkClass = 'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100';

export default function DashboardLayout({ title, subtitle, children }) {
  const { user } = useSelector((state) => state.auth);
  const openChat = useOpenConversation();

  return (
    <div className="section-shell py-8">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="panel h-fit">
          <DashboardBadge role={user?.role} />
          <nav className="mt-6 space-y-2">
            <NavLink to="/dashboard" end className={linkClass}><LayoutDashboard className="h-4 w-4" />Overview</NavLink>
            <NavLink to="/orders" className={linkClass}><ShoppingCart className="h-4 w-4" />Orders</NavLink>
            {/* <NavLink to="/cart" className={linkClass}><Package className="h-4 w-4" />Cart</NavLink> */}
            {/* <NavLink to="/wishlist" className={linkClass}><Heart className="h-4 w-4" />Wishlist</NavLink> */}
            <NavLink to="/messages" className={linkClass}><MessageCircle className="h-4 w-4" />Mesajlar</NavLink>
            <button type="button" className={staticLinkClass} onClick={() => openChat({ type: 'support' })}><LifeBuoy className="h-4 w-4" />Dəstək</button>
            {/* <NavLink to="/delivery" className={linkClass}><Truck className="h-4 w-4" />Çatdırılma kalkulyatoru</NavLink> */}
            <NavLink to="/auth" className={linkClass}><LogIn className="h-4 w-4" />Auth</NavLink>
          </nav>
        </aside>
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
