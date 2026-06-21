import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useOpenConversation } from '../hooks/useOpenConversation';

// Pages with important fixed bottom UI on mobile — push the button up so it doesn't overlap.
const PUSH_UP_PATHS = ['/cart', '/delivery'];

export default function FloatingSupportButton() {
  const { token } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const openChat = useOpenConversation();

  const handleClick = () => {
    if (token) {
      openChat({ type: 'support' });
    } else {
      navigate('/auth');
    }
  };

  const needsPushUp = PUSH_UP_PATHS.some((p) => pathname.startsWith(p));

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Dəstək"
      className={[
        'fixed right-5 z-50',
        'flex h-14 w-14 items-center justify-center',
        'rounded-full bg-emerald-700 text-white',
        'shadow-2xl ring-4 ring-emerald-700/20',
        'transition-all duration-200',
        'hover:-translate-y-1 hover:bg-emerald-800 hover:shadow-[0_12px_28px_-4px_rgba(4,120,87,0.45)]',
        'focus:outline-none focus:ring-4 focus:ring-emerald-300',
        // Mobile: push up on cart/delivery to avoid overlap with fixed bottom bars
        needsPushUp
          ? 'bottom-24 sm:bottom-6'
          : 'bottom-6',
      ].join(' ')}
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}
