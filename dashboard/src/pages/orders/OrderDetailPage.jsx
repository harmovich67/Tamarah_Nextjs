import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { numberFormat } from '@tamrna/shared/utils';
import { Button, ErrorState, Icon, PageLoading, SelectField, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { usePermissions } from '@/hooks/usePermissions';
import { storeService } from '@/services';
import { assetSrc } from '../products/ProductsPage';

/** Order detail + status control (resources/views/admin/order_detail.php). */
export default function OrderDetailPage() {
  const { id } = useParams();
  const { tr, currency } = useT();
  const { can } = usePermissions();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['order', id], queryFn: () => storeService.getOrder(id) });
  const { register, reset, handleSubmit } = useForm({ defaultValues: { shipping_status: 'pending', payment_status: 'pending' } });

  useEffect(() => {
    if (data) reset({ shipping_status: data.order.shipping_status || 'pending', payment_status: data.order.payment_status || 'pending' });
  }, [data, reset]);

  const update = useAdminMutation((v) => storeService.updateOrderStatus({ id, ...v }), {
    invalidate: [['order', id], ['orders'], ['dashboard']],
    success: tr('تم تحديث حالة الطلب بنجاح', 'Order status updated'),
  });
  const waybill = useAdminMutation(() => storeService.generateWaybill(id), {
    invalidate: [['order', id], ['orders']],
    success: (r) => r?.message || tr('تم إصدار بوليصة الشحن المبرد بنجاح!', 'Cold-chain waybill issued!'),
  });

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorState title={tr('تعذر تحميل الطلب', 'Could not load the order')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} />;

  const { order, items } = data;
  const paid = order.payment_status === 'paid';
  const money = (n) => `${numberFormat(n, 2)} ${currency}`;
  const pm = String(order.payment_method || 'cod').toLowerCase();
  const pmLabel = pm === 'mada' ? 'مدى (Mada)' : pm === 'apple_pay' ? 'Apple Pay' : pm === 'tabby' ? tr('تقسيط تابي (4 دفعات)', 'Tabby (4 installments)') : pm === 'tamara' ? tr('تقسيط تمارا (4 دفعات)', 'Tamara (4 installments)') : tr('الدفع عند الاستلام (COD)', 'Cash on delivery (COD)');

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm no-print">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">{tr('تفاصيل الطلب: ', 'Order details: ')}#{order.order_number}</h1>
            <span className={cx('text-xs font-black px-3.5 py-1.5 rounded-full inline-flex items-center gap-2 border', paid ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300')}>
              <span className={cx('w-2 h-2 rounded-full', paid ? 'bg-emerald-500' : 'bg-amber-500')} />
              {paid ? tr('تم السداد بنجاح', 'Paid') : tr('في انتظار التحصيل', 'Awaiting payment')}
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
                <span className="flex items-center gap-1.5"><Icon name="truck" className="w-4 h-4 text-gold-700" /><span>{tr(`رسوم الشحن والتوصيل (${order.city || 'الرياض'}):`, `Shipping & delivery (${order.city || 'Riyadh'}):`)}</span></span>
                <span className="text-base font-black text-gold-700">{Number(order.shipping_fee) > 0 ? money(order.shipping_fee) : tr('شحن مجاني', 'Free shipping')}</span>
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
              <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center"><Icon name="user" className="w-5 h-5" /></div>
              <div>
                <h3 className="font-black text-slate-900 text-base">{tr('بيانات العميل والتوصيل', 'Customer & delivery')}</h3>
                <p className="text-xs text-slate-400">{tr('العنوان المسجل وطريقة الاستلام', 'Saved address and fulfillment')}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">{tr('اسم المستلم:', 'Recipient:')}</span>
                <b className="text-slate-900 font-extrabold text-base block">{order.customer_name}</b>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">{tr('رقم الجوال للتواصل والمندوب:', 'Phone for the courier:')}</span>
                <a href={`tel:${order.customer_phone}`} dir="ltr" className="inline-flex items-center gap-2 text-primary-700 hover:underline font-mono font-black text-base"><Icon name="phone" className="w-4 h-4" /><span>{order.customer_phone}</span></a>
              </div>
              {order.customer_email ? (
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">{tr('البريد الإلكتروني:', 'Email:')}</span>
                  <span className="text-slate-700 font-medium break-all">{order.customer_email}</span>
                </div>
              ) : null}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 block mb-1">{tr('طريقة الاستلام والعنوان:', 'Fulfillment & address:')}</span>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-slate-800 leading-relaxed font-medium">
                  <p className="text-primary-700 font-black mb-1 flex items-center gap-1.5">
                    <Icon name="map-pin" className="w-4 h-4" />
                    <span>{order.city || tr('المملكة العربية السعودية', 'Saudi Arabia')}</span>
                    <span className="text-xs text-gold-700 font-normal">({order.shipping_type === 'branch_pickup' ? tr('استلام فرع', 'Branch pickup') : tr('توصيل مبرد', 'Chilled delivery')})</span>
                  </p>
                  <p className="text-xs text-slate-600">{order.shipping_address || tr('العنوان الوطني المسجل', 'Registered national address')}</p>
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
                  <p className="text-xs text-stone-400">{tr('الشحن والتجهيز والتحصيل', 'Shipping, preparation and collection')}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit((v) => update.mutate(v))} className="space-y-4">
                <SelectField label={tr('حالة الشحن والتجهيز', 'Shipping & preparation status')} className="[&_label]:text-xs [&_label]:font-black" {...register('shipping_status')}>
                  <option value="pending">{tr('قيد التجهيز بالمستودع', 'Preparing in the warehouse')}</option>
                  <option value="processing">{tr('تم تغليف الصندوق وجاهز للشحن', 'Packed and ready to ship')}</option>
                  <option value="shipped">{tr('تم التسليم لسيارة التبريد / الشاحن', 'Handed to the cold-chain carrier')}</option>
                  <option value="delivered">{tr('تم التوصيل بنجاح للعميل', 'Delivered to the customer')}</option>
                  <option value="cancelled">{tr('ملغي', 'Cancelled')}</option>
                </SelectField>
                <SelectField label={tr('حالة السداد والتحصيل', 'Payment & collection status')} className="[&_label]:text-xs [&_label]:font-black" {...register('payment_status')}>
                  <option value="pending">{tr('معلق (بانتظار الدفع أو التحصيل عند الاستلام)', 'Pending (awaiting payment or COD collection)')}</option>
                  <option value="paid">{tr('مدفوع ومحصل بنجاح', 'Paid and collected')}</option>
                  <option value="failed">{tr('فشل في السداد', 'Payment failed')}</option>
                </SelectField>
                <Button type="submit" loading={update.isPending} icon="check" className="w-full justify-center">
                  {tr('حفظ التحديثات', 'Save updates')}
                </Button>
              </form>

              <div className="pt-4 border-t border-stone-100 space-y-2">
                {order.tracking_number ? (
                  <div className="text-xs bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl p-3.5 space-y-1">
                    <div className="font-black flex items-center gap-1.5"><Icon name="truck" className="w-3.5 h-3.5" />{tr('بوليصة الشحن', 'Waybill')}</div>
                    <div>{tr('رقم التتبع: ', 'Tracking: ')}<b dir="ltr" className="font-mono">{order.tracking_number}</b></div>
                    {order.waybill_id ? <div>{tr('رقم البوليصة: ', 'Waybill: ')}<b dir="ltr" className="font-mono">{order.waybill_id}</b></div> : null}
                  </div>
                ) : null}
                {can('orders.waybill') && (
                  <Button variant="outline" icon="rocket" loading={waybill.isPending} onClick={() => waybill.mutate()} className="w-full justify-center">
                    {order.tracking_number ? tr('إعادة إصدار بوليصة الشحن المبرد', 'Re-issue cold-chain waybill') : tr('إصدار بوليصة الشحن المبرد', 'Issue cold-chain waybill')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
