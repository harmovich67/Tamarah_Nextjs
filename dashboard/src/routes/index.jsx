import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { BACKEND_REDIRECTS } from '@/layouts/navigation';
import { RequireAuth, RequirePermission } from './guards';
import { PageLoading } from '@/components/ui';
import { config } from '@/lib/config';
import { isStaleChunkError, reloadForNewBuild } from '@/lib/staleChunk';

/** Every screen is a lazy chunk (code splitting); the guards enforce login + permission for UX. */
const page = (loader) => {
  // A chunk of an older build is gone after a deploy: reload once for the new build (the error screen shows if that fails too).
  const Component = lazy(() =>
    loader().catch((error) => {
      if (isStaleChunkError(error) && reloadForNewBuild()) return new Promise(() => {});
      throw error;
    }),
  );
  return function LazyPage(props) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Component {...props} />
      </Suspense>
    );
  };
};
const Login = page(() => import('@/pages/Login'));
const Dashboard = page(() => import('@/pages/Dashboard'));
const Products = page(() => import('@/pages/products/ProductsPage'));
const ProductForm = page(() => import('@/pages/products/ProductFormPage'));
const Categories = page(() => import('@/pages/Categories'));
const Warehouses = page(() => import('@/pages/Warehouses'));
const Orders = page(() => import('@/pages/orders/OrdersPage'));
const OrderDetail = page(() => import('@/pages/orders/OrderDetailPage'));
const NewOrder = page(() => import('@/pages/orders/NewOrderPage'));
const Coupons = page(() => import('@/pages/Coupons'));
const ShippingZones = page(() => import('@/pages/ShippingZones'));
const PaymentSettings = page(() => import('@/pages/settings/PaymentSettings'));
const SiteSettings = page(() => import('@/pages/settings/SiteSettings'));
const HomeSections = page(() => import('@/pages/home/HomeSections'));
const Menus = page(() => import('@/pages/Menus'));
const Pages = page(() => import('@/pages/cms/PagesPage'));
const PageForm = page(() => import('@/pages/cms/PageFormPage'));
const Posts = page(() => import('@/pages/cms/PostsPage'));
const PostForm = page(() => import('@/pages/cms/PostFormPage'));
const CustomFields = page(() => import('@/pages/cms/CustomFieldsPage'));
const CustomFieldForm = page(() => import('@/pages/cms/CustomFieldFormPage'));
const Users = page(() => import('@/pages/Users'));
const Translations = page(() => import('@/pages/system/Translations'));
const Cache = page(() => import('@/pages/system/Cache'));
const Logs = page(() => import('@/pages/system/Logs'));
const Security = page(() => import('@/pages/system/Security'));
const Backup = page(() => import('@/pages/system/Backup'));
const NotFound = page(() => import('@/pages/NotFound'));
const StoreSettings = page(() => import('@/pages/resources/StoreSettingsPage'));
const ResourcePage = page(() => import('@/pages/resources/ResourcePage'));
// Tamrna backend resources: route path -> key of RESOURCE_PAGES. Only registered in laravel mode.
const RESOURCE_ROUTES = ['clients', 'reviews', 'gift-cards', 'branches', 'cities', 'features', 'sections', 'system-numbers', 'contacts', 'notifications', 'roles'];

const guard = (permission, element) => <RequirePermission permission={permission}>{element}</RequirePermission>;

/** Production (laravel mode): a legacy demo screen whose data lives on a backend screen (see navigation.js `backend`) opens that screen. */
const withBackendRedirects = (routes) =>
  config.apiMode !== 'laravel'
    ? routes
    : routes.map((r) => {
        const from = Object.keys(BACKEND_REDIRECTS).find((k) => r.path === k || r.path?.startsWith(`${k}/`));
        return from ? { path: r.path, element: <Navigate to={BACKEND_REDIRECTS[from]} replace /> } : r;
      });

const rawBase = import.meta.env.BASE_URL || '/';
const normalizedBase = rawBase.replace(/\/+$/, '');

export const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    {
      element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: withBackendRedirects([
          { index: true, element: guard('dashboard.view', <Dashboard />) },
          { path: 'products', element: guard('products.view', <Products />) },
          { path: 'products/create', element: guard('products.create', <ProductForm />) },
          { path: 'products/:id/edit', element: guard('products.edit', <ProductForm />) },
          { path: 'categories', element: guard('categories.view', <Categories />) },
          { path: 'warehouses', element: guard('warehouses.view', <Warehouses />) },
          { path: 'orders', element: guard('orders.view', <Orders />) },
          ...(config.apiMode === 'laravel' ? [{ path: 'orders/new', element: guard('orders.update', <NewOrder />) }] : []),
          { path: 'orders/:id', element: guard('orders.view', <OrderDetail />) },
          { path: 'coupons', element: guard('coupons.view', <Coupons />) },
          { path: 'shipping-zones', element: guard('shipping.view', <ShippingZones />) },
          { path: 'settings', element: guard('payments.view', <PaymentSettings />) },
          { path: 'site-settings', element: guard('site_settings.view', <SiteSettings />) },
          { path: 'home-sections', element: guard('home_sections.view', <HomeSections />) },
          { path: 'menus', element: guard('menus.view', <Menus />) },
          { path: 'pages', element: guard('pages.view', <Pages />) },
          { path: 'pages/create', element: guard('pages.create', <PageForm />) },
          { path: 'pages/:id/edit', element: guard('pages.edit', <PageForm />) },
          { path: 'posts', element: guard('posts.view', <Posts />) },
          { path: 'posts/create', element: guard('posts.create', <PostForm />) },
          { path: 'posts/:id/edit', element: guard('posts.edit', <PostForm />) },
          { path: 'custom-fields', element: guard('custom_fields.view', <CustomFields />) },
          { path: 'custom-fields/create', element: guard('custom_fields.create', <CustomFieldForm />) },
          { path: 'custom-fields/:id/edit', element: guard('custom_fields.edit', <CustomFieldForm />) },
          { path: 'users', element: guard('users.view', <Users />) },
          { path: 'translations', element: guard('translations.view', <Translations />) },
          { path: 'cache', element: guard('cache.manage', <Cache />) },
          { path: 'logs', element: guard('logs.view', <Logs />) },
          { path: 'security', element: guard('security.view', <Security />) },
          { path: 'backup', element: guard('backup.view', <Backup />) },
          ...(config.apiMode === 'laravel' ? [{ path: 'store-settings', element: guard('resources.view', <StoreSettings />) }] : []),
          ...(config.apiMode === 'laravel' ? RESOURCE_ROUTES.map((r) => ({ path: r, element: guard('resources.view', <ResourcePage resource={r} />) })) : []),          // Legacy PHP URL (/admin/shipping_zones etc. were hyphenated already; keep a friendly alias)
          { path: 'admin/*', element: <Navigate to="/" replace /> },
          { path: '*', element: <NotFound /> },
        ]),
      },
    ],
  }],
  {
    basename: normalizedBase || undefined,
  }
);
