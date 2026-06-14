import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/agroviaApi';
import { ActivityRow, EmptyState, LoadingGrid, SectionTitle, StatCard, formatPrice, roleLabel } from '../components/Ui';
import { ChartColumn, PackageSearch, Plus, Truck, Users, Wallet } from 'lucide-react';

const dashboardQueries = {
  seller: api.sellerDashboard,
  courier: api.courierDashboard,
  admin: api.adminDashboard
};

const saleTypeLabels = {
  retail: 'Pərakəndə',
  wholesale: 'Topdan',
  both: 'Topdan və pərakəndə'
};

const initialProductForm = {
  name: '',
  description: '',
  price: '',
  unit: 'kg',
  saleType: 'retail',
  minOrderQuantity: '1',
  stockQuantity: '1',
  category: '',
  tags: '',
  discountPercentage: '0'
};

export default function DashboardPage() {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role || 'buyer';
  const queryFn = dashboardQueries[role] || api.sellerDashboard;
  const queryClient = useQueryClient();
  const [productForm, setProductForm] = useState(initialProductForm);
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [createMessage, setCreateMessage] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', role],
    queryFn,
    enabled: Boolean(user)
  });

  const categoriesQuery = useQuery({
    queryKey: ['seller-create-categories'],
    queryFn: api.getCategories,
    enabled: role === 'seller'
  });

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    enabled: role === 'seller'
  });

  const sellerProductsQuery = useQuery({
    queryKey: ['seller-products'],
    queryFn: api.sellerProducts,
    enabled: role === 'seller',
    select: (data) => data.products || []
  });

  const adminPendingProductsQuery = useQuery({
    queryKey: ['admin-pending-products'],
    queryFn: api.adminPendingProducts,
    enabled: role === 'admin'
  });

  const createProductMutation = useMutation({
    mutationFn: api.createSellerProduct,
    onSuccess: (data) => {
      setCreateMessage(data?.message || 'Məhsul əlavə olundu. Admin təsdiqini gözləyir.');
      setCreateSuccess(true);
      setProductForm(initialProductForm);
      setImages([]);
      setVideos([]);
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'seller'] });
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      const apiErrors = error?.response?.data?.errors;
      const apiMessage = error?.response?.data?.message;
      setCreateMessage(
        Array.isArray(apiErrors) && apiErrors.length > 0
          ? apiErrors.join(', ')
          : apiMessage || 'Məhsul əlavə edilə bilmədi.'
      );
      setCreateSuccess(false);
    }
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }) => api.approveProduct(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
      setSelectedProduct(null);
    }
  });

  const stats = dashboardQuery.data?.stats || {};
  const categories = categoriesQuery.data?.categories || [];
  const sellerProducts = sellerProductsQuery.data || [];
  const pendingProducts = adminPendingProductsQuery.data?.products || [];
  const sellerRegion = meQuery.data?.user?.address?.region;
  const sellerSaleType = meQuery.data?.user?.sellerInfo?.saleType || stats.saleType;

  const submitSellerProduct = (event) => {
    event.preventDefault();
    setCreateMessage('');
    setCreateSuccess(false);

    if (!sellerRegion?._id) {
      setCreateMessage('Profilinizdə region yoxdur. Zəhmət olmasa profilinizi yeniləyin.');
      return;
    }

    const formData = new FormData();
    formData.append('name', productForm.name.trim());
    formData.append('description', productForm.description.trim());
    formData.append('price', productForm.price);
    formData.append('unit', productForm.unit);
    formData.append('saleType', productForm.saleType);
    formData.append('minOrderQuantity', productForm.minOrderQuantity);
    formData.append('stockQuantity', productForm.stockQuantity);
    formData.append('category', productForm.category);
    formData.append('region', sellerRegion._id);

    const parsedTags = productForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    formData.append('tags', JSON.stringify(parsedTags));
    formData.append('discount', JSON.stringify({
      percentage: Number(productForm.discountPercentage) || 0
    }));

    for (const image of images) {
      formData.append('images', image);
    }

    for (const video of videos) {
      formData.append('video', video);
    }

    createProductMutation.mutate(formData);
  };

  const updateProductField = (field, value) => {
    setProductForm((current) => ({ ...current, [field]: value }));
  };

  if (!user) {
    return <EmptyState title="Daxil ol" description="Dashboard-i görmək üçün daxil olmalısan." />;
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Dashboard"
        title={`${roleLabel(role)} paneli`}
        description="Backend role endpoint-lərinə uyğun şəkildə göstərilir."
      />
      {dashboardQuery.isLoading ? (
        <LoadingGrid rows={1} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {'totalProducts' in stats ? <StatCard label="Məhsullar" value={stats.totalProducts || 0} icon={PackageSearch} /> : null}
            {'totalOrders' in stats ? <StatCard label="Sifarişlər" value={stats.totalOrders || 0} icon={Wallet} accent="amber" /> : null}
            {'totalDeliveries' in stats ? <StatCard label="Çatdırılmalar" value={stats.totalDeliveries || 0} icon={Truck} /> : null}
            {'revenue' in stats ? <StatCard label="Gəlir" value={formatPrice(stats.revenue || 0)} icon={ChartColumn} accent="amber" /> : null}
            {'users' in stats ? <StatCard label="İstifadəçi sayı" value={stats.users?.total || 0} icon={Users} /> : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="panel space-y-3">
              <div className="text-lg font-semibold text-ink">Sürətli məlumat</div>
              {role === 'seller' ? (
                <>
                  <ActivityRow title="Business name" meta={stats.businessName || '—'} value={stats.isVerified ? 'Verified' : 'Pending'} />
                  <ActivityRow title="Satış növü" meta="Satıcı satış kateqoriyası" value={saleTypeLabels[sellerSaleType] || '—'} />
                  <ActivityRow title="Rating" meta="Satıcı reputasiyası" value={`${stats.rating || 0}/5`} />
                  <ActivityRow title="Pending orders" meta="Hazırda gözləyən sifarişlər" value={stats.pendingOrders || 0} />
                </>
              ) : null}
              {role === 'courier' ? (
                <>
                  <ActivityRow title="Vehicle" meta={stats.vehicleType || '—'} value={stats.isAvailable ? 'Available' : 'Busy'} />
                  <ActivityRow title="Rating" meta="Kuryer performansı" value={`${stats.rating || 0}/5`} />
                  <ActivityRow title="Pending deliveries" meta="Hazırda təyin olunmuş çatdırılmalar" value={stats.pendingDeliveries || 0} />
                </>
              ) : null}
              {role === 'admin' ? (
                <>
                  <ActivityRow title="Users" meta="Buyer / seller / courier" value={stats.users?.total || 0} />
                  <ActivityRow title="Pending products" meta="Admin təsdiqi gözləyənlər" value={stats.products?.pending || 0} />
                  <ActivityRow title="Revenue" meta="Completed payment total" value={formatPrice(stats.revenue || 0)} />
                </>
              ) : null}
            </div>
            <div className="panel space-y-4">
              <div className="text-lg font-semibold text-ink">Panel qısa xülasə</div>
              <p className="text-sm leading-6 text-slate-600">
                {role === 'admin'
                  ? 'Admin paneli users, products, orders və revenue statistikalarını göstərir.'
                  : role === 'seller'
                  ? 'Seller paneli məhsullar, sifarişlər və satış performansını göstərir.'
                  : 'Courier paneli qəbul edilmiş çatdırılmalar və availability statusunu göstərir.'}
              </p>
              <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Backend-də `{role}` üçün xüsusi endpoint aktivdir. UI həmin endpoint-dən gələn data-nı karta çevirir.
              </div>
            </div>
          </div>

          {role === 'seller' ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <section className="panel space-y-5">
                <div className="flex items-center gap-2 text-lg font-semibold text-ink">
                  <Plus className="h-5 w-5 text-forest" />
                  Məhsul əlavə et
                </div>

                {meQuery.isLoading ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Region yüklənir...</div>
                ) : sellerRegion ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Satış regionu: <strong>{sellerRegion.name}</strong>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Profilinizdə region yoxdur. Zəhmət olmasa profilinizi yeniləyin.
                  </div>
                )}

                <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitSellerProduct}>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Məhsul adı</label>
                    <input
                      className="input-shell w-full"
                      placeholder="Məhsul adı daxil edin"
                      value={productForm.name}
                      onChange={(event) => updateProductField('name', event.target.value)}
                      required
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Təsvir</label>
                    <p className="text-xs text-slate-400">Məhsul başqa regiondan gətirilibsə, bunu təsvir hissəsində qeyd edə bilərsiniz.</p>
                    <textarea
                      className="input-shell w-full min-h-[100px]"
                      placeholder="Məhsulun ətraflı təsviri"
                      value={productForm.description}
                      onChange={(event) => updateProductField('description', event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Qiymət (AZN)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-shell w-full"
                      placeholder="0.00"
                      value={productForm.price}
                      onChange={(event) => updateProductField('price', event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Ölçü vahidi</label>
                    <select
                      className="input-shell w-full"
                      value={productForm.unit}
                      onChange={(event) => updateProductField('unit', event.target.value)}
                    >
                      <option value="kg">kg</option>
                      <option value="gram">gram</option>
                      <option value="ton">ton</option>
                      <option value="piece">piece</option>
                      <option value="liter">liter</option>
                      <option value="bottle">bottle</option>
                      <option value="box">box</option>
                      <option value="bag">bag</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Satış tipi</label>
                    <select
                      className="input-shell w-full"
                      value={productForm.saleType}
                      onChange={(event) => updateProductField('saleType', event.target.value)}
                    >
                      <option value="retail">Pərakəndə</option>
                      <option value="wholesale">Topdan</option>
                      <option value="both">Topdan və pərakəndə</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Kateqoriya</label>
                    <select
                      className="input-shell w-full"
                      value={productForm.category}
                      onChange={(event) => updateProductField('category', event.target.value)}
                      required
                    >
                      <option value="">Kateqoriya seç</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Minimum sifariş</label>
                    <input
                      type="number"
                      min="1"
                      className="input-shell w-full"
                      placeholder="1"
                      value={productForm.minOrderQuantity}
                      onChange={(event) => updateProductField('minOrderQuantity', event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Stok miqdarı</label>
                    <input
                      type="number"
                      min="0"
                      className="input-shell w-full"
                      placeholder="0"
                      value={productForm.stockQuantity}
                      onChange={(event) => updateProductField('stockQuantity', event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Taglər</label>
                    <input
                      className="input-shell w-full"
                      placeholder="alma, təzə, üzvi"
                      value={productForm.tags}
                      onChange={(event) => updateProductField('tags', event.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Endirim faizi</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="input-shell w-full"
                      placeholder="0"
                      value={productForm.discountPercentage}
                      onChange={(event) => updateProductField('discountPercentage', event.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Şəkillər (maksimum 5)</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="input-shell w-full"
                      onChange={(event) => setImages(Array.from(event.target.files || []))}
                    />
                    {images.length > 0 ? (
                      <p className="text-xs text-slate-500">{images.length} şəkil seçildi: {images.map((f) => f.name).join(', ')}</p>
                    ) : null}
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Video (ixtiyari)</label>
                    <input
                      type="file"
                      accept="video/*"
                      className="input-shell w-full"
                      onChange={(event) => setVideos(Array.from(event.target.files || []))}
                    />
                    {videos.length > 0 ? (
                      <p className="text-xs text-slate-500">Seçilmiş video: {videos[0].name}</p>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    className="btn-primary sm:col-span-2"
                    disabled={createProductMutation.isPending || !sellerRegion}
                  >
                    {createProductMutation.isPending ? 'Əlavə olunur...' : 'Məhsulu əlavə et'}
                  </button>
                </form>

                {createMessage ? (
                  <div className={`rounded-2xl border px-4 py-3 text-sm ${
                    createSuccess
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}>
                    {createMessage}
                  </div>
                ) : null}
              </section>

              <section className="panel space-y-4">
                <div className="text-lg font-semibold text-ink">Mənim məhsullarım</div>
                {sellerProductsQuery.isLoading ? (
                  <LoadingGrid rows={1} />
                ) : sellerProducts.length === 0 ? (
                  <EmptyState title="Məhsul yoxdur" description="İlk məhsulunu soldakı forma ilə əlavə et." />
                ) : (
                  <div className="space-y-3">
                    {sellerProducts.slice(0, 8).map((product) => (
                      <div key={product._id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-ink">{product.name}</div>
                            <div className="mt-1 text-sm text-slate-600">
                              {product.category?.name || 'Kateqoriya yoxdur'} • {product.region?.name || 'Region yoxdur'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-forest">{formatPrice(product.price)}</div>
                            <div className="mt-1 text-xs uppercase text-slate-500">{product.status}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          Stok: {product.stockQuantity} • Min sifariş: {product.minOrderQuantity} {product.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {role === 'admin' ? (
            <section className="panel space-y-4">
              <div className="text-lg font-semibold text-ink">Təsdiq gözləyən məhsullar</div>
              {adminPendingProductsQuery.isLoading ? (
                <LoadingGrid rows={1} />
              ) : pendingProducts.length === 0 ? (
                <EmptyState title="Gözləyən məhsul yoxdur" description="Hazırda admin təsdiqini gözləyən məhsul tapılmadı." />
              ) : (
                <div className="space-y-3">
                  {pendingProducts.map((product) => (
                    <div key={product._id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">{product.name}</div>
                          <div className="mt-1 text-sm text-slate-600">
                            {product.seller?.firstName} {product.seller?.lastName} • {product.category?.name || '—'} • {formatPrice(product.price)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-secondary flex-shrink-0 text-sm"
                          onClick={() => setSelectedProduct(selectedProduct?._id === product._id ? null : product)}
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
                              Xəta baş verdi. Yenidən cəhd edin.
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
                              onClick={() => approveMutation.mutate({ id: product._id, status: 'inactive' })}
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
        </>
      )}
    </div>
  );
}
