export const currency = new Intl.NumberFormat('az-AZ', {
  style: 'currency',
  currency: 'AZN',
  maximumFractionDigits: 2
});

export const formatPrice = (value = 0) => currency.format(Number(value || 0));

export const formatDate = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('az-AZ', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
};

export const getProductImage = (product) => {
  const firstImage = product?.images?.[0];
  if (!firstImage) return 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80';
  if (typeof firstImage === 'string') return firstImage;
  return firstImage.url || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80';
};

export const roleLabel = (role = '') => {
  const map = {
    admin: 'Admin',
    seller: 'Satıcı',
    buyer: 'Alıcı',
    courier: 'Kuryer'
  };
  return map[role] || role;
};