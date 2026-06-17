import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/agroviaApi';
import { useRegions } from '../hooks/useAgroviaData';
import {
  ActivityRow,
  EmptyState,
  LoadingGrid,
  SectionTitle,
  StatCard,
  formatPrice,
  roleLabel,
} from '../components/Ui';
import { ChartColumn, PackageSearch, Truck, Users, Wallet } from 'lucide-react';

const dashboardQueries = {
  courier: api.courierDashboard,
  admin:   api.adminDashboard,
};

const saleTypeLabels = {
  retail:    'Pərakəndə',
  wholesale: 'Topdan',
  both:      'Topdan və pərakəndə',
};

export default function DashboardPage() {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role || 'buyer';
  const queryFn = dashboardQueries[role] || api.adminDashboard;
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState(null);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', role],
    queryFn,
    enabled: Boolean(user),
  });

  const adminPendingProductsQuery = useQuery({
    queryKey: ['admin-pending-products'],
    queryFn: api.adminPendingProducts,
    enabled: role === 'admin',
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }) => api.approveProduct(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
      setSelectedProduct(null);
    },
  });

  // ── Courier: serviced regions editor + available orders ──
  const allRegions = useRegions().data || [];
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    enabled: role === 'courier',
  });
  const [selectedRegions, setSelectedRegions] = useState([]);
  useEffect(() => {
    const regs = meQuery.data?.user?.courierInfo?.regions;
    if (Array.isArray(regs)) {
      setSelectedRegions(regs.map((r) => (typeof r === 'object' ? r._id : r)));
    }
  }, [meQuery.data]);

  const availableOrdersQuery = useQuery({
    queryKey: ['courier-available-orders'],
    queryFn: api.courierAvailableOrders,
    enabled: role === 'courier',
  });

  const saveRegionsMutation = useMutation({
    mutationFn: (regions) => api.updateCourierAvailability({ regions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['courier-available-orders'] });
    },
  });

  const acceptOrderMutation = useMutation({
    mutationFn: (id) => api.courierAcceptOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'courier'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const stats = dashboardQuery.data?.stats || {};
  const pendingProducts = adminPendingProductsQuery.data?.products || [];

  if (!user) {
    return <EmptyState title="Daxil ol" description="Dashboard-i görmək üçün daxil olmalısan." />;
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Dashboard" title={`${roleLabel(role)} paneli`} />

      {dashboardQuery.isLoading ? (
        <LoadingGrid rows={1} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {'totalOrders' in stats ? (
              <StatCard label="Sifarişlər" value={stats.totalOrders || 0} icon={Wallet} accent="amber" />
            ) : null}
            {'totalDeliveries' in stats ? (
              <StatCard label="Çatdırılmalar" value={stats.totalDeliveries || 0} icon={Truck} />
            ) : null}
            {'revenue' in stats ? (
              <StatCard label="Gəlir" value={formatPrice(stats.revenue || 0)} icon={ChartColumn} accent="amber" />
            ) : null}
            {'users' in stats ? (
              <StatCard label="İstifadəçi sayı" value={stats.users?.total || 0} icon={Users} />
            ) : null}
            {'products' in stats ? (
              <StatCard label="Məhsullar" value={stats.products?.total || 0} icon={PackageSearch} />
            ) : null}
          </div>

          <div className="panel space-y-3">
            <div className="text-lg font-semibold text-ink">Sürətli məlumat</div>
            {role === 'courier' ? (
              <>
                <ActivityRow title="Nəqliyyat" meta={stats.vehicleType || '—'} value={stats.isAvailable ? 'Mövcuddur' : 'Məşğuldur'} />
                <ActivityRow title="Rating" meta="Kuryer performansı" value={`${stats.rating || 0}/5`} />
                <ActivityRow title="Gözləyən çatdırılmalar" meta="Hazırda təyin olunmuş" value={stats.pendingDeliveries || 0} />
              </>
            ) : null}
            {role === 'admin' ? (
              <>
                <ActivityRow title="İstifadəçilər" meta="Alıcı / satıcı / kuryer" value={stats.users?.total || 0} />
                <ActivityRow title="Gözləyən məhsullar" meta="Admin təsdiqi gözləyənlər" value={stats.products?.pending || 0} />
                <ActivityRow title="Gəlir" meta="Tamamlanmış ödənişlər" value={formatPrice(stats.revenue || 0)} />
              </>
            ) : null}
          </div>

          {role === 'admin' ? (
            <section className="panel space-y-4">
              <div className="text-lg font-semibold text-ink">Təsdiq gözləyən məhsullar</div>
              {adminPendingProductsQuery.isLoading ? (
                <LoadingGrid rows={1} />
              ) : pendingProducts.length === 0 ? (
                <EmptyState
                  title="Gözləyən məhsul yoxdur"
                  description="Hazırda admin təsdiqini gözləyən məhsul tapılmadı."
                />
              ) : (
                <div className="space-y-3">
                  {pendingProducts.map((product) => (
                    <div key={product._id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">{product.name}</div>
                          <div className="mt-1 text-sm text-slate-600">
                            {product.seller?.firstName} {product.seller?.lastName} •{' '}
                            {product.category?.name || '—'} • {formatPrice(product.price)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-secondary flex-shrink-0 text-sm"
                          onClick={() =>
                            setSelectedProduct(selectedProduct?._id === product._id ? null : product)
                          }
                        >
                          {selectedProduct?._id === product._id ? 'Bağla' : 'Bax'}
                        </button>
                      </div>

                      {selectedProduct?._id === product._id ? (
                        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                          <div className="grid gap-2 text-sm sm:grid-cols-2">
                            <div><span className="text-slate-400">Kateqoriya:</span> {product.category?.name || '—'}</div>
                            <div><span className="text-slate-400">Region:</span> {product.region?.name || '—'}</div>
                            <div><span className="text-slate-400">Qiymət:</span> {formatPrice(product.price)}</div>
                            <div><span className="text-slate-400">Vahid:</span> {product.unit}</div>
                            <div><span className="text-slate-400">Satış tipi:</span> {saleTypeLabels[product.saleType] || '—'}</div>
                            <div><span className="text-slate-400">Min sifariş:</span> {product.minOrderQuantity}</div>
                            <div><span className="text-slate-400">Stok:</span> {product.stockQuantity}</div>
                            <div><span className="text-slate-400">Satıcı:</span> {product.seller?.firstName} {product.seller?.lastName}</div>
                          </div>

                          {product.description ? (
                            <p className="text-sm text-slate-600">{product.description}</p>
                          ) : null}

                          {product.images?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {product.images.map((img) => (
                                <img
                                  key={img.public_id || img.url}
                                  src={img.url}
                                  alt=""
                                  className="h-20 w-20 rounded-xl border border-slate-200 object-cover"
                                />
                              ))}
                            </div>
                          ) : null}

                          {product.videos?.length > 0 ? (
                            <div className="text-sm">
                              <a
                                href={product.videos[0].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-forest underline"
                              >
                                Videoya bax
                              </a>
                            </div>
                          ) : null}

                          {approveMutation.isError ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                              {(() => {
                                const d = approveMutation.error?.response?.data;
                                const errs = d?.errors;
                                return Array.isArray(errs) && errs.length
                                  ? errs.join(', ')
                                  : d?.message || 'Xəta baş verdi. Yenidən cəhd edin.';
                              })()}
                            </div>
                          ) : null}

                          <div className="flex gap-3">
                            <button
                              type="button"
                              className="btn-primary text-sm"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate({ id: product._id, status: 'active' })}
                            >
                              {approveMutation.isPending ? 'Gözləyin...' : 'Təsdiqlə'}
                            </button>
                            <button
                              type="button"
                              className="btn-secondary text-sm"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate({ id: product._id, status: 'rejected' })}
                            >
                              Rədd et
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {role === 'courier' ? (
            <section className="panel space-y-4">
              <div className="text-lg font-semibold text-ink">Xidmət regionları</div>
              <p className="text-sm text-slate-500">Sifariş alacağınız regionları seçin. Yalnız bu regionlara çatdırılacaq hazır sifarişlər sizə görünəcək.</p>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 p-3 sm:grid-cols-3">
                {allRegions.map((r) => {
                  const checked = selectedRegions.includes(r._id);
                  return (
                    <label key={r._id} className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => setSelectedRegions((current) =>
                          event.target.checked
                            ? [...current, r._id]
                            : current.filter((id) => id !== r._id)
                        )}
                      />
                      {r.name}
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  disabled={saveRegionsMutation.isPending}
                  onClick={() => saveRegionsMutation.mutate(selectedRegions)}
                >
                  {saveRegionsMutation.isPending ? 'Yadda saxlanılır...' : 'Regionları yadda saxla'}
                </button>
                {saveRegionsMutation.isSuccess ? (
                  <span className="text-sm text-emerald-700">Regionlar yeniləndi.</span>
                ) : null}
              </div>

              <div className="border-t border-slate-100 pt-4 text-lg font-semibold text-ink">Mövcud sifarişlər</div>
              {availableOrdersQuery.isLoading ? (
                <LoadingGrid rows={1} />
              ) : availableOrdersQuery.data?.reason === 'NO_REGIONS' ? (
                <EmptyState
                  title="Xidmət regionu seçilməyib"
                  description="Sifarişləri görmək üçün yuxarıdan ən azı bir xidmət regionu seçin və yadda saxlayın."
                />
              ) : (availableOrdersQuery.data?.orders || []).length === 0 ? (
                <EmptyState
                  title="Mövcud sifariş yoxdur"
                  description="Hazırda regionlarınıza uyğun hazır sifariş yoxdur."
                />
              ) : (
                <div className="space-y-3">
                  {availableOrdersQuery.data.orders.map((order) => (
                    <div key={order._id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">#{order.orderNumber || order._id.slice(-6)}</div>
                          <div className="mt-1 text-sm text-slate-600">
                            {order.deliveryAddress?.region?.name || '—'}
                            {order.deliveryAddress?.street ? ` • ${order.deliveryAddress.street}` : ''}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {order.buyer?.firstName} {order.buyer?.lastName}
                            {order.deliveryAddress?.phone ? ` • ${order.deliveryAddress.phone}` : ''}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-forest">{formatPrice(order.totalAmount)}</div>
                        </div>
                        <button
                          type="button"
                          className="btn-primary flex-shrink-0 text-sm"
                          disabled={acceptOrderMutation.isPending}
                          onClick={() => acceptOrderMutation.mutate(order._id)}
                        >
                          {acceptOrderMutation.isPending ? 'Gözləyin...' : 'Qəbul et'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {acceptOrderMutation.isError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {acceptOrderMutation.error?.response?.data?.message || 'Sifariş qəbul edilmədi.'}
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
