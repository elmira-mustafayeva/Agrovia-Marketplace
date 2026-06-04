import { useQuery } from '@tanstack/react-query';
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

export const useProducts = (filters) => useQuery({
  queryKey: ['products', filters],
  queryFn: () => api.getProducts(filters),
  select: (data) => data.products || []
});

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

export const useReviews = (productId) => useQuery({
  queryKey: ['reviews', productId],
  queryFn: () => api.getReviews(productId),
  enabled: Boolean(productId),
  select: (data) => data
});