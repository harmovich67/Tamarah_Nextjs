import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { numberFormat, pickLang } from '@tamrna/shared/utils';
import { Icon, ErrorState, PageLoading, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { usePermissions } from '@/hooks/usePermissions';
import { storeService } from '@/services';
import { config } from '@/lib/config';

function Kpi({ label, icon, tone, value, unit, hint }) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-[#0f764a]/30 transition-all duration-200 space-y-2 group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={cx('w-11 h-11 rounded-xl flex items-center justify-center shadow-2xs transition-transform duration-200 group-hover:scale-105', tone)}>
          <Icon name={icon} className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none pt-1">
        {value} <span className="text-xs font-semibold text-slate-500 ms-1">{unit}</span>
      </div>
      <p className="text-xs font-medium text-slate-400">{hint}</p>
    </div>
  );
}

/** Modern Dashboard Home for Tamrna Administration */
export default function Dashboard() {
  const { t, tr, isRtl, locale, currency } = useT();
  const { can } = usePermissions();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => storeService.getDashboardStats(),
  });

  if (isLoading) return <PageLoading />;
  if (isError) {
    return (
      <ErrorState
        title={tr('تعذر تحميل المؤشرات', 'Could not load the dashboard')}
        onRetry={refetch}
        retryLabel={tr('إعادة المحاولة', 'Try again')}
      />
    );
  }

  const { totalSales, totalOrders, totalProducts, totalCustomers, lowStockVariants, recentOrders, categoriesCount } = data;

  return (
    <div className="space-y-7 w-full pb-12">
      {/* Welcome banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#0a2016] via-[#103d29] to-[#0a2016] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md border border-amber-400/25 relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute -end-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1.5 text-center sm:text-start relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-amber-200 border border-white/15 backdrop-blur-xs">
            <Icon name="sparkles" className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('admin_welcome_title')}</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{t('admin_welcome_heading')}</h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">{t('admin_welcome_sub')}</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap justify-center relative z-10">
          {can('products.create') && (
            <Link
              to="/products/create"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-b from-[#d49e35] to-[#b98422] hover:from-[#b98422] hover:to-[#9f6f1a] text-white text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Icon name="plus" className="w-4 h-4" />
              <span>{t('admin_add_product')}</span>
            </Link>
          )}
          <a
            href={config.storefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-all border border-white/20 flex items-center gap-1.5 backdrop-blur-xs active:scale-95"
          >
            <Icon name="external-link" className="w-3.5 h-3.5 text-amber-300" />
            <span>{t('admin_live_store')}</span>
          </a>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
        <Kpi
          label={t('admin_kpi_sales')}
          icon="wallet"
          tone="bg-emerald-50 text-[#0f764a] border border-emerald-200/60"
          value={numberFormat(totalSales, 2)}
          unit={currency}
          hint={t('admin_kpi_sales_hint')}
        />
        <Kpi
          label={t('admin_kpi_orders')}
          icon="shopping-bag"
          tone="bg-amber-50 text-amber-800 border border-amber-200/60"
          value={totalOrders}
          unit={tr('طلب', 'orders')}
          hint={t('admin_kpi_orders_hint')}
        />
        <Kpi
          label={t('admin_kpi_products')}
          icon="box"
          tone="bg-emerald-50/70 text-[#0f764a] border border-emerald-200/60"
          value={totalProducts}
          unit={tr('صنف نشط', 'varieties')}
          hint={t('admin_kpi_products_hint')}
        />
        <Kpi
          label={t('admin_kpi_customers')}
          icon="users"
          tone="bg-slate-100 text-slate-700 border border-slate-200/60"
          value={totalCustomers}
          unit={tr('عميل', 'clients')}
          hint={t('admin_kpi_customers_hint')}
        />
      </div>

      {/* Main Grid: Orders & Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Recent orders */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0f764a] flex items-center justify-center shadow-2xs border border-emerald-200/60">
                <Icon name="truck" className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">{t('admin_recent_orders')}</h2>
            </div>
            {can('orders.view') && (
              <Link
                to="/orders"
                className="text-xs font-semibold text-[#0f764a] hover:text-[#0b5d3a] flex items-center gap-1 transition-colors"
              >
                <span>{t('admin_view_all_orders')}</span>
                <Icon name={isRtl ? 'arrow-left' : 'arrow-right'} className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {recentOrders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-[13px] text-start">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                    {['admin_col_order_num', 'admin_col_customer', 'admin_col_city', 'admin_col_total', 'admin_col_payment', 'admin_col_status'].map((k) => (
                      <th key={k} className="pb-3 text-start pe-4">{t(k)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pe-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <Link to={`/orders/${o.id}`} className="hover:text-[#0f764a] hover:underline">
                          {o.order_number}
                        </Link>
                      </td>
                      <td className="py-3 pe-4 font-semibold text-slate-800 whitespace-nowrap">{o.customer_name}</td>
                      <td className="py-3 pe-4 text-slate-500 whitespace-nowrap">{o.city || tr('الرياض', 'Riyadh')}</td>
                      <td className="py-3 pe-4 font-extrabold text-[#0f764a] whitespace-nowrap">
                        {numberFormat(o.total, 2)} {currency}
                      </td>
                      <td className="py-3 pe-4">
                        <span
                          className={cx(
                            'px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase border inline-flex items-center gap-1',
                            o.payment_status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                              : 'bg-amber-50 text-amber-800 border-amber-200/70',
                          )}
                        >
                          <span className={cx('w-1.5 h-1.5 rounded-full', o.payment_status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500')} />
                          {o.payment_method}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/70">
                          {o.shipping_status || 'processing'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">{tr('لا توجد طلبات مسجلة بعد.', 'No orders registered yet.')}</div>
          )}
        </div>

        {/* Low stock */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200/60 shadow-2xs">
                <Icon name="alert-triangle" className="w-4 h-4 text-amber-700" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">{t('admin_low_stock_title')}</h2>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
              {tr('أقل من 20 عبوة', '< 20 units')}
            </span>
          </div>

          {lowStockVariants.length ? (
            <div className="space-y-2.5">
              {lowStockVariants.map((v) => (
                <div key={v.id} className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/90 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={`/${(v.featured_image || 'assets/images/ajwa_luxury_box_1787053900509.jpg').replace(/^\//, '')}`}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover bg-white border border-slate-200/80 shrink-0 shadow-2xs"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {locale === 'en' && v.product_name_en ? v.product_name_en : v.product_name_ar}
                      </h4>
                      <span className="text-[11px] font-medium text-slate-500">{pickLang(v, 'size_name', locale)}</span>
                    </div>
                  </div>
                  <span
                    className={cx(
                      'px-2.5 py-0.5 rounded-lg text-xs font-bold shrink-0 border',
                      v.stock_quantity <= 5
                        ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                        : 'bg-amber-50 text-amber-800 border-amber-200/60',
                    )}
                  >
                    {v.stock_quantity} {tr('عبوة', 'units')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">{tr('مستويات المخزون ممتازة في جميع الفروع.', 'Stock levels are optimal across all branches.')}</div>
          )}
        </div>
      </div>

      {/* Categories breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#0f764a] flex items-center justify-center border border-emerald-200/60">
            <Icon name="tags" className="w-3.5 h-3.5" />
          </div>
          <span>{tr('أقسام التمور الملكية والمنتجات المتوفرة', 'Royal Date Categories & Available Catalog')}</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categoriesCount.map((c) => (
            <Link
              key={c.slug}
              to={`/products?cat=${c.slug}`}
              className="p-4 rounded-xl bg-slate-50/60 hover:bg-white border border-slate-200/70 hover:border-[#0f764a]/50 hover:shadow-2xs transition-all text-center space-y-1 group"
            >
              <h4 className="text-xs font-semibold text-slate-800 group-hover:text-[#0f764a] transition-colors">{locale === 'en' && c.name_en ? c.name_en : c.name_ar}</h4>
              <div className="text-lg font-extrabold text-[#0f764a]">{c.products_count}</div>
              <span className="text-[11px] font-medium text-slate-400">{tr('أصناف متوفرة', 'varieties')}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
