// Shared, role-aware navigation config used by both the desktop navbar (Navigation.jsx)
// and the mobile menu (MainLayout.jsx). Plain link descriptors only — actions (support chat,
// logout, theme/language) are handled inline by Navigation.

const DASHBOARD_ROLES = ['seller', 'courier', 'admin'];

// Primary top-bar links shown per role. Signed-out and buyers get the public browse links;
// seller/courier/admin keep the top bar minimal (their real nav lives in the dashboard sidebar).
export function getPrimaryLinks(role) {
  if (DASHBOARD_ROLES.includes(role)) {
    return [{ to: '/dashboard', label: 'İdarəetmə paneli' }];
  }
  return [
    { to: '/', label: 'Ana səhifə' },
    { to: '/shop', label: 'Mağazalar' },
    { to: '/shop', label: 'Kateqoriyalar' },
    { to: '/shop', label: 'Regionlar' },
  ];
}

// Full link list for the mobile drawer (primary links + role-specific extras).
export function getMobileLinks(role, { isBuyer = false, signedIn = false } = {}) {
  const links = [...getPrimaryLinks(role)];
  if (isBuyer) {
    links.push(
      { to: '/wishlist', label: 'Wishlist' },
      { to: '/cart', label: 'Səbət' },
      { to: '/orders', label: 'Sifarişlərim' },
    );
  }
  if (signedIn) {
    links.push({ to: '/messages', label: 'Mesajlar' });
  }
  return links;
}
