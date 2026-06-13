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

const initialProductForm = {
  name: '',
  description: '',
  price: '',
  unit: 'kg',
  saleType: 'retail',
  minOrderQuantity: '1',
  stockQuantity: '1',
  category: '',
  region: '',
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

  const regionsQuery = useQuery({
    queryKey: ['seller-create-regions'],
    queryFn: api.getRegions,
    enabled: role === 'seller'
  });

  const sellerProductsQuery = useQuery({
    queryKey: ['seller-products'],
    queryFn: api.sellerProducts,
    enabled: role === 'seller',
    select: (data) => data.products || []
  });

  const createProductMutation = useMutation({
    mutationFn: api.createSellerProduct,
    onSuccess: (data) => {
      setCreateMessage(data?.message || 'Məhsul əlavə olundu.');
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
      setCreateMessage(Array.isArray(apiErrors) && apiErrors.length > 0 ? apiErrors.join(', ') : apiMessage || 'Məhsul əlavə edilə bilmədi.');
    }
  });

  const stats = dashboardQuery.data?.stats || {};
  const categories = categoriesQuery.data?.categories || [];
  const regions = regionsQuery.data?.regions || [];
  const sellerProducts = sellerProductsQuery.data || [];

  const submitSellerProduct = (event) => {
    event.preventDefault();
    setCreateMessage('');

    const formData = new FormData();
    formData.append('name', productForm.name.trim());
    formData.append('description', productForm.description.trim());
    formData.append('price', productForm.price);
    formData.append('unit', productForm.unit);
    formData.append('saleType', productForm.saleType);
    formData.append('minOrderQuantity', productForm.minOrderQuantity);
    formData.append('stockQuantity', productForm.stockQuantity);
    formData.append('category', productForm.category);
    formData.append('region', productForm.region);

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
                {role === 'admin' ? 'Admin paneli users, products, orders və revenue statistikalarını göstərir.' : role === 'seller' ? 'Seller paneli məhsullar, sifarişlər və satış performansını göstərir.' : 'Courier paneli qəbul edilmiş çatdırılmalar və availability statusunu göstərir.'}
              </p>
              <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Backend-də `{role}` üçün xüsusi endpoint aktivdir. UI həmin endpoint-dən gələn data-nı karta çevirir.
              </div>
            </div>
          </div>

          {role === 'seller' ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <section className="panel space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-ink">
                  <Plus className="h-5 w-5 text-forest" />
                  Məhsul əlavə et
                </div>
                <p className="text-sm text-slate-600">Bu forma `POST /api/products` endpointinə bağlıdır. Yeni məhsul ilkin olaraq `pending` statusunda yaranır.</p>

                <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitSellerProduct}>
                  <input
                    className="input-shell sm:col-span-2"
                    placeholder="Məhsul adı"
                    value={productForm.name}
                    onChange={(event) => updateProductField('name', event.target.value)}
                    required
                  />
                  <textarea
                    className="input-shell sm:col-span-2 min-h-[120px]"
                    placeholder="Təsvir"
                    value={productForm.description}
                    onChange={(event) => updateProductField('description', event.target.value)}
                    required
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-shell"
                    placeholder="Qiymət"
                    value={productForm.price}
                    onChange={(event) => updateProductField('price', event.target.value)}
                    required
                  />
                  <select
                    className="input-shell"
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
                  <select
                    className="input-shell"
                    value={productForm.saleType}
                    onChange={(event) => updateProductField('saleType', event.target.value)}
                  >
                    <option value="retail">Pərakəndə (retail)</option>
                    <option value="wholesale">Topdan (wholesale)</option>
                    <option value="both">Hər ikisi (both)</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="input-shell"
                    placeholder="Min sifariş"
                    value={productForm.minOrderQuantity}
                    onChange={(event) => updateProductField('minOrderQuantity', event.target.value)}
                    required
                  />
                  <input
                    type="number"
                    min="0"
                    className="input-shell"
                    placeholder="Stok miqdarı"
                    value={productForm.stockQuantity}
                    onChange={(event) => updateProductField('stockQuantity', event.target.value)}
                    required
                  />
                  <select
                    className="input-shell"
                    value={productForm.category}
                    onChange={(event) => updateProductField('category', event.target.value)}
                    required
                  >
                    <option value="">Kateqoriya seç</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>{category.name}</option>
                    ))}
                  </select>
                  <select
                    className="input-shell"
                    value={productForm.region}
                    onChange={(event) => updateProductField('region', event.target.value)}
                    required
                  >
                    <option value="">Region seç</option>
                    {regions.map((region) => (
                      <option key={region._id} value={region._id}>{region.name}</option>
                    ))}
                  </select>
                  <input
                    className="input-shell"
                    placeholder="Taglər (vergüllə): alma, təzə"
                    value={productForm.tags}
                    onChange={(event) => updateProductField('tags', event.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input-shell"
                    placeholder="Endirim %"
                    value={productForm.discountPercentage}
                    onChange={(event) => updateProductField('discountPercentage', event.target.value)}
                  />
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="input-shell sm:col-span-2"
                    onChange={(event) => setImages(Array.from(event.target.files || []))}
                  />
                  <input
                    type="file"
                    accept="video/*"
                    className="input-shell sm:col-span-2"
                    onChange={(event) => setVideos(Array.from(event.target.files || []))}
                  />
                  <button type="submit" className="btn-primary sm:col-span-2" disabled={createProductMutation.isPending}>
                    {createProductMutation.isPending ? 'Əlavə olunur...' : 'Məhsulu əlavə et'}
                  </button>
                </form>

                {createMessage ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{createMessage}</div>
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
                            <div className="mt-1 text-sm text-slate-600">{product.category?.name || 'Kateqoriya yoxdur'} • {product.region?.name || 'Region yoxdur'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-forest">{formatPrice(product.price)}</div>
                            <div className="mt-1 text-xs uppercase text-slate-500">{product.status}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">Stok: {product.stockQuantity} • Min sifariş: {product.minOrderQuantity} {product.unit}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}