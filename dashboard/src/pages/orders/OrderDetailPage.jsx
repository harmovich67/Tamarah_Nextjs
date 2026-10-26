import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { numberFormat } from '@tamrna/shared/utils';
import { allowedOrderStatuses, canCancelOrder, getNextOrderStatus, ORDER_STATUS_LABELS } from '@tamrna/shared/constants';
import { Button, ConfirmDialog, ErrorState, Icon, Modal, PageLoading, SelectField, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { usePermissions } from '@/hooks/usePermissions';
import { storeService } from '@/services';
import { config } from '@/lib/config';
import { assetSrc } from '../products/ProductsPage';

const realBackend = config.apiMode === 'laravel';

const STATUS_BADGES = {
  pending: 'bg-slate-100 text-slate-800 border-slate-200',
  processing: 'bg-blue-50 text-blue-800 border-blue-200',
  ready: 'bg-purple-50 text-purple-800 border-purple-200',
  delivered: 'bg-amber-50 text-amber-800 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-800 border-rose-200',
};

const NEXT_STEP_ICONS = {
  processing: 'package',
  ready: 'store',
  delivered: 'truck',
  completed: 'check-circle-2',
};

function CancelOrderModal({ open, onClose, onConfirm, isPending }) {
  const { tr } = useT();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={tr('تأكيد إلغاء الطلب', 'Confirm Order Cancellation')}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            {tr('تراجع', 'Back')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={isPending}
            className="px-4 py-2.5 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5"
          >
            {isPending ? <Icon name="loader-2" className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{tr('تأكيد الإلغاء', 'Confirm cancellation')}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Icon name="alert-triangle" className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-snug">
              {tr('هل أنت متأكد من إلغاء هذا الطلب؟', 'Are you sure you want to cancel this order?')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {tr('سيتم تحويل حالة الطلب إلى ملغي وإيقاف التجهيز فوراً.', 'The order will be marked as cancelled and processing stopped.')}
            </p>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5">
            {tr('سبب الإلغاء (اختياري):', 'Cancellation reason (optional):')}
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={tr('مثال: طلب العميل إلغاء الطلب / خطأ في العنوان…', 'e.g. Customer requested cancellation / address error…')}
            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>
      </div>
    </Modal>
  );
}

/** Order detail + status control (resources/views/admin/order_detail.php). */
export default function OrderDetailPage() {
  const { id } = useParams();
  const { tr, currency } = useT();
  const { can } = usePermissions();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['order', id], queryFn: () => storeService.getOrder(id) });
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [overrideBranch, setOverrideBranch] = useState(null);
  const { register, reset, handleSubmit } = useForm({ defaultValues: { shipping_status: 'pending', payment_status: 'pending' } });

  useEffect(() => {
    if (data) {
      reset({
        shipping_status: data.order.shipping_status || 'pending',
        payment_status: data.order.payment_status || 'pending',
      });
    }
  }, [data, reset]);

  const update = useAdminMutation((v) => storeService.updateOrderStatus({ id, ...v }), {
    invalidate: [['order', id], ['orders'], ['dashboard']],
    success: tr('تم تحديث حالة الطلب بنجاح', 'Order status updated'),
  });

  const remove = useAdminMutation(() => storeService.deleteOrder(id), {
    invalidate: [['orders'], ['dashboard']],
    success: tr('تم حذف الطلب', 'Order deleted'),
    onSuccess: () => navigate('/orders'),
  });

  const waybill = useAdminMutation(() => storeService.generateWaybill(id), {
    invalidate: [['order', id], ['orders']],
    success: (r) => r?.message || tr('تم إصدار بوليصة الشحن المبرد بنجاح!', 'Cold-chain waybill issued!'),
  });

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorState title={tr('تعذر تحميل الطلب', 'Could not load the order')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} />;

  const { order, items } = data;
  const isDeliveryType =
    order.shipping_type === 'delivery' ||
    order.shipping_type === 'home_delivery' ||
    order.delivery_type === 'delivery';

  const detectedIsBranch = Boolean(
    !isDeliveryType && (
      order.is_branch === true ||
      order.shipping_type === 'branch_pickup' ||
      order.shipping_type === 'branch' ||
      order.delivery_type === 'branch' ||
      order.shipping_type === 'pickup' ||
      order.delivery_type === 'pickup' ||
      order.is_pickup ||
      (order.branch_id && String(order.branch_id) !== '0') ||
      order.shipping_status === 'ready' ||
      String(order.shipping_address || '').includes('استلام من الفرع') ||
      String(order.notes || '').includes('استلام من الفرع')
    )
  );

  const isBranch = overrideBranch !== null ? overrideBranch : detectedIsBranch;
  const currentStatus = order.shipping_status || 'pending';
  const nextStatus = getNextOrderStatus(currentStatus, isBranch ? 'branch_pickup' : 'delivery');
  const canCancel = canCancelOrder(currentStatus);
  const isFinal = currentStatus === 'completed' || currentStatus === 'cancelled';
  const paid = order.payment_status === 'paid';
  const money = (n) => `${numberFormat(n, 2)} ${currency}`;
  const pm = String(order.payment_method || 'cod').toLowerCase();
  const pmLabel = pm === 'mada' ? 'مدى (Mada)' : pm === 'apple_pay' ? 'Apple Pay' : pm === 'tabby' ? tr('تقسيط تابي (4 دفعات)', 'Tabby (4 installments)') : pm === 'tamara' ? tr('تقسيط تمارا (4 دفعات)', 'Tamara (4 installments)') : tr('الدفع عند الاستلام (COD)', 'Cash on delivery (COD)');

  const getStatusLabel = (status) => {
    if (status === 'ready') return tr('جاهز للاستلام من الفرع', 'Ready for branch pickup');
    if (status === 'delivered') return tr('تم التوصيل للعميل', 'Delivered to customer');
    if (status === 'processing') return isBranch ? tr('قيد التجهيز في الفرع', 'Preparing at branch') : tr('قيد التجهيز بالمستودع', 'Preparing in warehouse');
    if (status === 'completed') return isBranch ? tr('تم الاستلام من الفرع', 'Picked up from branch') : tr('مكتمل', 'Completed');
    return tr(ORDER_STATUS_LABELS[status]?.ar || status, ORDER_STATUS_LABELS[status]?.en || status);
  };

  const handleCancelConfirm = (reason) => {
    update.mutate({ shipping_status: 'cancelled', reason });
    setConfirmCancel(false);
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm no-print">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">{tr('تفاصيل الطلب: ', 'Order details: ')}#{order.order_number}</h1>
            <span className={cx('text-xs font-black px-3.5 py-1.5 rounded-full inline-flex items-center gap-2 border', paid ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300')}>
              <span className={cx('w-2 h-2 rounded-full', paid ? 'bg-emerald-500' : 'bg-amber-500')} />
              {paid ? tr('تم السداد بنجاح', 'Paid') : tr('في انتظار التحصيل', 'Awaiting payment')}
            </span>
            <span className={cx('text-xs font-black px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 border', STATUS_BADGES[currentStatus] || STATUS_BADGES.pending)}>
              <span>{getStatusLabel(currentStatus)}</span>
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-500 mt-2 flex items-center gap-2">
            <Icon name="calendar" className="w-4 h-4 text-primary-700" />
            <span>{tr('تاريخ وتوقيت الطلب: ', 'Order placed: ')}{String(order.created_at).replace(/-/g, '/')}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => window.print()} className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-bold flex items-center gap-2.5 shadow-md transition">
            <Icon name="printer" className="w-4 h-4 text-gold-300" />
            <span>{tr('طباعة الفاتورة', 'Print invoice')}</span>
          </button>
          {realBackend && can('orders.update') && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="px-5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl text-sm font-bold flex items-center gap-2 transition">
              <Icon name="trash-2" className="w-4 h-4" />
              <span>{tr('حذف الطلب', 'Delete order')}</span>
            </button>
          )}
          <Link to="/orders" className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-bold flex items-center gap-2 transition">
            <Icon name="arrow-right" className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
            <span>{tr('العودة للطلبات', 'Back to orders')}</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">{tr('أصناف التمور والبوكسات المطلوبة', 'Ordered dates & gift boxes')}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{tr('تفاصيل الأوزان والتعبئة والكميات', 'Weights, packaging and quantities')}</p>
              </div>
              <span className="text-xs font-black text-primary-800 bg-primary-50 border border-primary-200/70 px-3.5 py-1 rounded-xl">{items.length} {tr('أصناف', 'items')}</span>
            </div>

            <div className="divide-y divide-slate-100 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
                      {item.featured_image ? <img src={assetSrc(item.featured_image)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-primary-700"><Icon name="package" className="w-7 h-7" /></div>}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-black text-slate-900 text-sm sm:text-base leading-snug">{item.product_name_ar || item.product_name || tr('صنف تمور فاخر', 'Luxury dates')}</h4>
                      {item.category_name_ar ? <span className="inline-flex text-[11px] font-bold text-gold-700 bg-gold-50 border border-gold-200/60 px-2 py-0.5 rounded-md">{item.category_name_ar}</span> : null}
                      <div className="text-xs text-slate-400">{tr('سعر الوحدة: ', 'Unit price: ')}<b className="text-slate-700 font-bold">{money(item.unit_price)}</b></div>
                    </div>
                  </div>
                  <div className="flex items-center sm:flex-col sm:items-center justify-between sm:justify-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 font-bold text-xs text-primary-800 bg-primary-50 border border-primary-200/70 px-3 py-1.5 rounded-xl whitespace-nowrap">
                      <Icon name="package" className="w-3.5 h-3.5" />
                      <span>{item.size_name || tr('العبوة القياسية', 'Standard pack')}</span>
                    </span>
                    <span className="text-xs font-bold text-slate-500">{tr('الكمية: ', 'Qty: ')}<b className="text-slate-900 font-black text-sm">{item.quantity}</b></span>
                  </div>
                  <div className="shrink-0 min-w-[90px] text-end">
                    <span className="text-[11px] text-slate-400 block">{tr('المجموع', 'Total')}</span>
                    <span className="text-base sm:text-lg font-black text-slate-900">{money(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-slate-100 mt-8 pt-6 space-y-3">
              <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                <span>{tr('المجموع الفرعي:', 'Subtotal:')}</span>
                <span className="text-base font-bold text-slate-900">{money(order.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Icon name={isBranch ? 'store' : 'truck'} className="w-4 h-4 text-gold-700" />
                  <span>
                    {isBranch
                      ? tr('طريقة الاستلام (استلام من الفرع):', 'Fulfillment (Branch pickup):')
                      : tr(`رسوم الشحن والتوصيل${order.city ? ` (${order.city})` : ''}:`, `Shipping & delivery${order.city ? ` (${order.city})` : ''}:`)}
                  </span>
                </span>
                <span className="text-base font-black text-gold-700">
                  {isBranch || Number(order.shipping_fee) === 0 ? tr('مجاناً', 'Free') : money(order.shipping_fee)}
                </span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between items-center text-sm font-semibold text-emerald-600">
                  <span>{tr('الخصم المطبق:', 'Discount applied:')}</span>
                  <span className="text-base font-bold">- {money(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-black text-slate-900 border-t border-slate-200 pt-4 bg-primary-950/5 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 sm:p-8 rounded-b-3xl">
                <span>{tr('الإجمالي الكلي (شامل ضريبة القيمة المضافة 15%):', 'Grand total (incl. 15% VAT):')}</span>
                <span className="text-2xl font-black text-primary-700">{money(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center">
                <Icon name={isBranch ? 'store' : 'user'} className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {isBranch ? tr('بيانات العميل والاستلام', 'Customer & pickup') : tr('بيانات العميل والتوصيل', 'Customer & delivery')}
                </h3>
                <p className="text-xs text-slate-400">
                  {isBranch ? tr('مقر الفرع وبيانات المستلم', 'Boutique and recipient details') : tr('العنوان المسجل وطريقة الاستلام', 'Saved address and fulfillment')}
                </p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">{tr('اسم المستلم:', 'Recipient:')}</span>
                <b className="text-slate-900 font-extrabold text-base block">{order.customer_name || '—'}</b>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">
                  {isBranch ? tr('رقم الجوال للتواصل:', 'Contact phone:') : tr('رقم الجوال للتواصل والمندوب:', 'Phone for the courier:')}
                </span>
                <a href={`tel:${order.customer_phone}`} dir="ltr" className="inline-flex items-center gap-2 text-primary-700 hover:underline font-mono font-black text-base">
                  <Icon name="phone" className="w-4 h-4" />
                  <span>{order.customer_phone || '—'}</span>
                </a>
              </div>
              {order.customer_email ? (
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">{tr('البريد الإلكتروني:', 'Email:')}</span>
                  <span className="text-slate-700 font-medium break-all">{order.customer_email}</span>
                </div>
              ) : null}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 block mb-1">
                  {isBranch ? tr('طريقة الاستلام ومقر الفرع:', 'Pickup & boutique details:') : tr('طريقة الاستلام والعنوان:', 'Fulfillment & address:')}
                </span>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-slate-800 leading-relaxed font-medium">
                  {isBranch ? (
                    <>
                      <p className="text-primary-700 font-black mb-1 flex items-center gap-1.5">
                        <Icon name="store" className="w-4 h-4" />
                        <span>{order.branch_name || tr('فرع تمرنا المعتمد', 'Authorized Tamrna Boutique')}</span>
                        <span className="text-xs text-gold-700 font-bold">
                          ({tr('استلام مباشر من الفرع - مجاناً', 'Direct boutique pickup - Free')})
                        </span>
                      </p>
                      <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1.5">
                        <Icon name="map-pin" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {[order.branch_city || order.city, order.branch_address].filter(Boolean).join(' - ') || tr('بيانات الفرع غير متوفرة', 'Branch details unavailable')}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 font-normal">
                        {tr('يتم تسليم الطلب للعميل داخل الفرع عند الحضور.', 'Order will be handed over to the customer at the boutique.')}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-primary-700 font-black mb-1 flex items-center gap-1.5">
                        <Icon name="map-pin" className="w-4 h-4" />
                        <span>{order.city || tr('المملكة العربية السعودية', 'Saudi Arabia')}</span>
                        <span className="text-xs text-gold-700 font-normal">
                          ({tr('توصيل مبرد للمنزل', 'Chilled delivery')})
                        </span>
                      </p>
                      <p className="text-xs text-slate-600">{order.shipping_address || tr('العنوان غير متوفر', 'Address unavailable')}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 block mb-1">{tr('طريقة الدفع:', 'Payment method:')}</span>
                <div className="font-bold text-slate-900 text-xs flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 uppercase font-mono">{order.payment_method || 'COD'}</span>
                  <span>{pmLabel}</span>
                </div>
              </div>
              {order.notes ? (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 block mb-1">{tr('ملاحظات العميل الخاصة:', 'Customer notes:')}</span>
                  <p className="text-xs text-slate-600 bg-amber-50/70 p-3 rounded-xl border border-amber-200/70">{order.notes}</p>
                </div>
              ) : null}
            </div>
          </div>

          {can('orders.update') && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-5 no-print">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center"><Icon name="sliders" className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-black text-stone-900 text-base">{tr('تحديث حالة الطلب', 'Update order status')}</h3>
                  <p className="text-xs text-stone-400">
                    {isBranch
                      ? tr('استلام من الفرع (تم إلغاء مراحل التوصيل)', 'Branch pickup (delivery steps omitted)')
                      : tr('مسار الشحن والتوصيل للمنزل', 'Home shipping & delivery workflow')}
                  </p>
                </div>
              </div>

              {/* Current status display */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 block">{tr('الحالة الحالية للطلب:', 'Current status:')}</span>
                  <button
                    type="button"
                    onClick={() => setOverrideBranch(!isBranch)}
                    className="text-[11px] text-primary-700 hover:text-primary-800 font-bold underline transition"
                    title={tr('تبديل وضع الاستلام يدوياً', 'Toggle fulfillment mode manually')}
                  >
                    {isBranch ? tr('تبديل إلى توصيل مبرد', 'Switch to delivery') : tr('تبديل إلى استلام من الفرع', 'Switch to branch pickup')}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cx('text-xs font-black px-3 py-1 rounded-xl border inline-flex items-center gap-1.5', STATUS_BADGES[currentStatus] || STATUS_BADGES.pending)}>
                    <span className="w-2 h-2 rounded-full bg-current" />
                    <span>{getStatusLabel(currentStatus)}</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    ({isBranch ? tr('استلام فرع', 'Branch pickup') : tr('توصيل مبرد', 'Chilled delivery')})
                  </span>
                </div>
              </div>

              {/* Next status action (ONLY the status whose turn it is!) */}
              {!isFinal && nextStatus ? (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-black text-slate-700 block">
                    {tr('الخطوة التالية في مسار الطلب:', 'Next step in turn:')}
                  </span>
                  <Button
                    type="button"
                    onClick={() => update.mutate({ shipping_status: nextStatus })}
                    loading={update.isPending}
                    icon={NEXT_STEP_ICONS[nextStatus] || 'arrow-left'}
                    className="w-full justify-center py-3 text-sm font-black shadow-sm rounded-2xl bg-primary-700 hover:bg-primary-800 text-white"
                  >
                    <span>{tr('نقل الطلب إلى: ', 'Advance to: ')}{getStatusLabel(nextStatus)}</span>
                  </Button>
                </div>
              ) : null}

              {/* Dropdown containing ONLY current status, NEXT status, and cancel */}
              {!isFinal ? (
                <form onSubmit={handleSubmit((v) => update.mutate(v))} className="space-y-3 pt-2 border-t border-slate-100">
                  <SelectField
                    label={tr('أو اختر الإجراء المطلوب:', 'Or select action: ')}
                    className="[&_label]:text-xs [&_label]:font-black"
                    {...register('shipping_status')}
                  >
                    <option value={currentStatus} disabled>
                      {tr('الحالية: ', 'Current: ')}{getStatusLabel(currentStatus)}
                    </option>
                    {nextStatus && (
                      <option value={nextStatus}>
                        {tr('الحالة التالية: ', 'Next: ')}{getStatusLabel(nextStatus)}
                      </option>
                    )}
                    {canCancel && (
                      <option value="cancelled">
                        {tr('إلغاء الطلب', 'Cancel order')}
                      </option>
                    )}
                  </SelectField>

                  <Button
                    type="submit"
                    loading={update.isPending}
                    variant="outline"
                    icon="check"
                    className="w-full justify-center text-xs font-bold"
                  >
                    {tr('تطبيق التغيير', 'Apply change')}
                  </Button>
                </form>
              ) : null}

              {/* Cancellation button: only when order is cancellable */}
              {canCancel ? (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                    disabled={update.isPending}
                    className="w-full py-2.5 px-4 rounded-2xl border border-rose-300 text-rose-700 bg-rose-50/70 hover:bg-rose-100 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
                  >
                    <Icon name="x-circle" className="w-4 h-4" />
                    <span>{tr('إلغاء هذا الطلب', 'Cancel this order')}</span>
                  </button>
                </div>
              ) : null}

              {/* Final State Notice */}
              {isFinal && (
                <div className={cx('p-4 rounded-2xl border text-xs font-bold flex items-start gap-2.5', currentStatus === 'completed' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200')}>
                  <Icon name={currentStatus === 'completed' ? 'check-circle-2' : 'x-circle'} className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-sm">
                      {currentStatus === 'completed'
                        ? tr('اكتمل هذا الطلب بنجاح', 'This order is completed')
                        : tr('تم إلغاء هذا الطلب', 'This order is cancelled')}
                    </p>
                    <p className="font-normal text-slate-600 mt-1">
                      {currentStatus === 'completed'
                        ? tr('الطلب في حالته النهائية ولا يمكن تغيير حالته أو إلغاؤه.', 'Order is in final state and cannot be changed or cancelled.')
                        : tr('تم إلغاء الطلب مسبقاً ولا يمكن استئنافه.', 'Order was cancelled and cannot be resumed.')}
                    </p>
                    {order.cancellation_reason ? (
                      <p className="mt-2 text-rose-800 font-semibold bg-white/70 p-2 rounded-lg border border-rose-200/50">
                        {tr('سبب الإلغاء: ', 'Reason: ')}{order.cancellation_reason}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Waybill section (for delivery only) */}
              {!isBranch && (
                <div className="pt-4 border-t border-stone-100 space-y-2">
                  {order.tracking_number ? (
                    <div className="text-xs bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl p-3.5 space-y-1">
                      <div className="font-black flex items-center gap-1.5"><Icon name="truck" className="w-3.5 h-3.5" />{tr('بوليصة الشحن', 'Waybill')}</div>
                      <div>{tr('رقم التتبع: ', 'Tracking: ')}<b dir="ltr" className="font-mono">{order.tracking_number}</b></div>
                      {order.waybill_id ? <div>{tr('رقم البوليصة: ', 'Waybill: ')}<b dir="ltr" className="font-mono">{order.waybill_id}</b></div> : null}
                    </div>
                  ) : null}
                  {can('orders.waybill') && !realBackend && (
                    <Button variant="outline" icon="rocket" loading={waybill.isPending} onClick={() => waybill.mutate()} className="w-full justify-center">
                      {order.tracking_number ? tr('إعادة إصدار بوليصة الشحن المبرد', 'Re-issue cold-chain waybill') : tr('إصدار بوليصة الشحن المبرد', 'Issue cold-chain waybill')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation modal for permanent deletion */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
        loading={remove.isPending}
        message={tr('هل أنت متأكد من حذف هذا الطلب نهائياً؟', 'Are you sure you want to permanently delete this order?')}
        confirmLabel={tr('حذف', 'Delete')}
      />

      {/* Confirmation modal for order cancellation */}
      <CancelOrderModal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancelConfirm}
        isPending={update.isPending}
      />
    </div>
  );
}
