import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/agroviaApi';

export const useCategories = () => useQuery({
  queryKey: ['categories'],
  queryFn: api.getCategories,
  select: (data) => data.categories || []
});

export const useRegions = () => useQuery({
  queryKey: ['regions'],
  queryFn: api.getRegions,
  select: (data) => data.regions || []
});

// Strip empty/null/whitespace/Hamısı values so axios never sends category=&region=&search=
function cleanProductParams(raw = {}) {
  const params = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined) continue;
    const s = typeof v === 'string' ? v.trim() : String(v);
    if (s === '' || s === 'Hamısı') continue;
    params[k] = s;
  }
  return params;
}

export const useProducts = (filters) => {
  const clean = cleanProductParams(filters);
  return useQuery({
    queryKey: ['products', clean],
    queryFn: () => api.getProducts(clean),
    select: (data) => data.products || [],
  });
};

export const useProduct = (id) => useQuery({
  queryKey: ['product', id],
  queryFn: () => api.getProduct(id),
  enabled: Boolean(id),
  select: (data) => data.product
});

export const useCart = (enabled = true) => useQuery({
  queryKey: ['cart'],
  queryFn: api.getCart,
  enabled,
  select: (data) => data.cart
});

export const useWishlist = (enabled = true) => useQuery({
  queryKey: ['wishlist'],
  queryFn: api.getWishlist,
  enabled,
  select: (data) => data.wishlist
});

export const useOrders = (enabled = true) => useQuery({
  queryKey: ['orders'],
  queryFn: api.getMyOrders,
  enabled,
  select: (data) => data.orders || []
});

export const useSellerOrders = (enabled = true) => useQuery({
  queryKey: ['seller-orders'],
  queryFn: api.sellerOrders,
  enabled,
  select: (data) => data.orders || [],
});

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useReviews = (productId) => useQuery({
  queryKey: ['reviews', productId],
  queryFn: () => api.getReviews(productId),
  enabled: Boolean(productId),
  select: (data) => data
});

export const useMyReviews = (enabled = true) => useQuery({
  queryKey: ['my-reviews'],
  queryFn: api.getMyReviews,
  enabled,
  select: (data) => data.reviews || []
});

export const useSellerReviews = (enabled = true) => useQuery({
  queryKey: ['seller-reviews'],
  queryFn: api.sellerReviews,
  enabled,
  select: (data) => data.reviews || []
});