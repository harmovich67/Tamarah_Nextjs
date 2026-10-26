import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { numberFormat } from '@tamrna/shared/utils';
import { ORDER_STATUS } from '@tamrna/shared/constants';
import { DataTable, Icon, LinkButton, SearchInput, SelectField, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useQueryParam } from '@/hooks/useQueryState';
import { usePermissions } from '@/hooks/usePermissions';
import { newOrderService, storeService } from '@/services';

export const SHIP_CLASSES = {
  pending: 'bg-slate-100 text-slate-700 border border-slate-200/80',
  processing: 'bg-amber-50 text-amber-800 border border-amber-200/70',
  shipped: 'bg-sky-50 text-sky-800 border border-sky-200/70',
  delivered: 'bg-emerald-50 text-emerald-800 border border-emerald-200/70',
  cancelled: 'bg-rose-50 text-rose-800 border border-rose-200/70',
};

export function useShipLabels() {
  const { tr } = useT();
  return {
    pending: tr('قيد التجهيز', 'Processing'),
    processing: tr('جاهز للشحن', 'Ready to ship'),
    shipped: tr('تم الشحن', 'Shipped'),
    delivered: tr('تم التوصيل', 'Delivered'),
    cancelled: tr('ملغي', 'Cancelled'),
  };
}

/** Orders list (resources/views/admin/orders.php) with search and shipping / payment filters. */
export default function OrdersPage() {
  const { t, tr, currency } = useT();
  const labels = useShipLabels();
  const { can } = usePermissions();
  const [search, setSearch] = useQueryParam('q', '');
  const [ship, setShip] = useQueryParam('shipping', '');
  const [pay, setPay] = useQueryParam('payment', '');
  const { data: orders = [], isLoading, error, refetch } = useQuery({ queryKey: ['orders'], queryFn: () => storeService.listOrders() });

  const rows = orders.filter((o) => (!ship || (o.shipping_status || 'pending') === ship) && (!pay || o.payment_status === pay));

  const columns = [
    {
      key: 'order',
      header: t('admin_col_order_num'),
      sortValue: (o) => o.id,
      cell: (o) => (
        <div className="font-mono font-bold text-slate-900">
          <span className="text-primary-700 font-black">#{o.order_number}</span>
          <span className="block text-[11px] text-slate-400 font-sans mt-0.5">{String(o.created_at).slice(0, 16).replace('-', '/').replace('-', '/').replace(' ', ' - ')}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: t('admin_col_customer'),
      sortValue: (o) => o.customer_name,
      cell: (o) => (
        <div className="text-slate-700">
          <span className="font-black text-slate-900 block">{o.customer_name}</span>
          <span dir="ltr" className="text-[11px] text-slate-400 font-mono">{o.customer_phone}</span>
        </div>
      ),
    },
    {
      key: 'items',
      header: t('admin_col_items'),
      hideOnMobile: true,
      cell: (o) => (
        <div className="max-w-xs truncate text-slate-600">
          <span className="font-bold text-slate-800">{o.items_summary || tr('منتجات تمور فاخرة', 'Luxury Date Products')}</span>
          <span className="text-[11px] text-slate-400 block">{o.items_count || 1} {tr('قطع', 'items')}</span>
        </div>
      ),
    },
    {
      key: 'city',
      header: tr('المدينة / طريقة الاستلام', 'City / Fulfillment'),
      cell: (o) => (
        <div className="text-slate-600">
          <div className="font-bold text-slate-900">{o.city || tr('الرياض', 'Riyadh')}</div>
          <span className="text-[11px] text-gold-700 font-medium">{o.shipping_type === 'branch_pickup' ? tr('استلام من الفرع', 'Branch Pickup') : tr('شحن مبرد للمنزل', 'Cold Express Freight')}</span>
        </div>
      ),
    },
    {
      key: 'total',
      header: t('admin_col_total'),
      sortValue: (o) => Number(o.total),
      cell: (o) => <span className="font-black text-primary-700 text-sm">{numberFormat(o.total, 2)} {currency}</span>,
    },
    {
      key: 'payment',
      header: tr('حالة الدفع', 'Payment Status'),
      align: 'center',
      cell: (o) => (
        <>
          <span className={cx('inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-0.5 rounded-full border', o.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70' : 'bg-amber-50 text-amber-800 border-amber-200/70')}>
            <span className={cx('w-1.5 h-1.5 rounded-full', o.payment_status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500')} />
            {o.payment_status === 'paid' ? tr('مدفوع', 'Paid') : tr('في الانتظار', 'Pending')}
          </span>
          <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">{String(o.payment_method || 'COD').toUpperCase()}</span>
        </>
      ),
    },
    {
      key: 'shipping',
      header: tr('حالة الشحن', 'Shipping Status'),
      align: 'center',
      cell: (o) => {
        const s = o.shipping_status || 'pending';
        return <span className={cx('inline-flex text-[11px] font-black px-2.5 py-0.5 rounded-lg', SHIP_CLASSES[s] || SHIP_CLASSES.pending)}>{labels[s] || s}</span>;
      },
    },
    {
      key: 'actions',
      header: t('admin_col_actions'),
      align: 'center',
      cell: (o) => (
        <Link to={`/orders/${o.id}`} className="px-3.5 py-1.5 bg-primary-50/70 hover:bg-primary-700 hover:text-white text-primary-700 font-black rounded-xl transition inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs border border-primary-200/50">
          <Icon name="eye" className="w-3.5 h-3.5" />
          <span>{tr('تفاصيل الطلب', 'Details')}</span>
        </Link>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center shadow-xs">
            <Icon name="shopping-bag" className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{t('admin_orders_title')}</h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">{t('admin_orders_sub')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-3.5 py-1.5 bg-gold-50 border border-gold-200/60 rounded-xl text-xs font-black text-gold-800">
            {tr('إجمالي الطلبات: ', 'Total Orders: ')}{orders.length}
          </span>
          {newOrderService && can('orders.update') ? <LinkButton to="/orders/new" icon="plus-circle">{tr('طلب جديد', 'New order')}</LinkButton> : null}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        search={search}
        searchText={(o) => `${o.order_number} ${o.customer_name} ${o.customer_phone} ${o.city || ''} ${o.items_summary || ''}`}
        empty={{ icon: 'package-open', title: tr('لا توجد طلبات مسجلة حالياً', 'No orders recorded yet.') }}
        toolbar={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={tr('ابحث برقم الطلب أو العميل أو الجوال…', 'Search by order, customer or phone…')} className="w-full sm:w-72" />
            <SelectField className="w-full sm:w-48 [&_select]:text-xs [&_select]:py-2" value={ship} onChange={(e) => setShip(e.target.value)} aria-label={tr('حالة الشحن', 'Shipping Status')}>
              <option value="">{tr('كل حالات الشحن', 'All shipping statuses')}</option>
              {Object.values(ORDER_STATUS).map((s) => (
                <option key={s} value={s}>{labels[s]}</option>
              ))}
            </SelectField>
            <SelectField className="w-full sm:w-44 [&_select]:text-xs [&_select]:py-2" value={pay} onChange={(e) => setPay(e.target.value)} aria-label={tr('حالة الدفع', 'Payment Status')}>
              <option value="">{tr('كل حالات الدفع', 'All payment statuses')}</option>
              <option value="paid">{tr('مدفوع', 'Paid')}</option>
              <option value="pending">{tr('في الانتظار', 'Pending')}</option>
              <option value="failed">{tr('فشل', 'Failed')}</option>
            </SelectField>
          </>
        }
      />
    </div>
  );
}
