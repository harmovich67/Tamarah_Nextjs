import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { numberFormat } from '@tamrna/shared/utils';
import { Button, ConfirmDialog, DataTable, Icon, IconAction, Modal, PageHeader, SearchInput, SelectField, StatCard, StatusToggle, SwitchRow, TextField } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { useQueryParam } from '@/hooks/useQueryState';
import { commerceService } from '@/services';
import { shippingZoneSchema } from '@/schemas';

const BLANK = { city_name_ar: '', city_name_en: '', shipping_fee: 25, estimated_delivery: 'توصيل مبرد خلال 24-48 ساعة', is_cold_shipping: true, is_active: true };

function ZoneDialog({ open, zone, onClose }) {
  const { tr, locale } = useT();
  const m = (ar, en) => (locale === 'en' ? en : ar);
  const schema = useMemo(() => shippingZoneSchema(m), [locale]); // eslint-disable-line react-hooks/exhaustive-deps
  const editing = !!zone;
  const { register, handleSubmit, reset, control, setError, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: BLANK });
  useEffect(() => {
    if (open) reset(zone ? { city_name_ar: zone.city_name_ar, city_name_en: zone.city_name_en || '', shipping_fee: zone.shipping_fee, estimated_delivery: zone.estimated_delivery || '', is_cold_shipping: !!zone.is_cold_shipping, is_active: !!zone.is_active } : BLANK);
  }, [open, zone, reset]);

  const save = useAdminMutation((v) => (editing ? commerceService.updateShippingZone(zone.id, v) : commerceService.createShippingZone(v)), {
    invalidate: [['shipping-zones']],
    success: tr('تم حفظ بيانات مدينة الشحن بنجاح!', 'Shipping zone saved successfully!'),
    onSuccess: onClose,
    onFieldErrors: (errs) => Object.entries(errs).forEach(([f, msgs]) => setError(f, { message: [].concat(msgs)[0] })),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? tr('تعديل مدينة الشحن', 'Edit shipping city') : tr('إضافة مدينة شحن جديدة', 'Add a new shipping city')}
      subtitle={editing ? tr('تحديث تكلفة الشحن ومواعيد التوصيل', 'Update the fee and delivery estimate') : tr('حدد اسم المدينة، رسوم الشحن ومدة التسليم', 'Set the city, shipping fee and delivery time')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{tr('إلغاء', 'Cancel')}</Button>
          <Button type="submit" form="zone-form" loading={save.isPending}>{tr('حفظ', 'Save')}</Button>
        </>
      }
    >
      <form id="zone-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={tr('اسم المدينة (بالعربية)', 'City name (Arabic)')} required placeholder="الباحة" error={errors.city_name_ar?.message} {...register('city_name_ar')} />
          <TextField label={tr('اسم المدينة (English)', 'City name (English)')} dir="ltr" placeholder="Al Baha" {...register('city_name_en')} />
        </div>
        <TextField label={tr('رسوم الشحن (ر.س)', 'Shipping fee (SAR)')} required type="number" step="0.5" min="0" error={errors.shipping_fee?.message} {...register('shipping_fee')} />
        <TextField label={tr('المدة التقديرية للتوصيل', 'Estimated delivery time')} {...register('estimated_delivery')} />
        <Controller control={control} name="is_cold_shipping" render={({ field }) => <SwitchRow label={tr('شحن مبرد', 'Cold shipping')} hint={tr('تتوفر سيارات تبريد لهذه المدينة', 'Refrigerated vehicles serve this city')} checked={!!field.value} onChange={field.onChange} />} />
        <Controller control={control} name="is_active" render={({ field }) => <SwitchRow label={tr('حالة التفعيل', 'Active')} hint={tr('المدن المتوقفة لا تظهر في صفحة إتمام الطلب', 'Stopped cities are hidden from checkout')} checked={!!field.value} onChange={field.onChange} />} />
      </form>
    </Modal>
  );
}

/** Saudi shipping zones (resources/views/admin/shipping_zones.php). */
export default function ShippingZones() {
  const { tr, currency } = useT();
  const [search, setSearch] = useQueryParam('q', '');
  const [status, setStatus] = useQueryParam('status', 'all');
  const [dialog, setDialog] = useState({ open: false, zone: null });
  const [toDelete, setToDelete] = useState(null);
  const { data: zones = [], isLoading, error, refetch } = useQuery({ queryKey: ['shipping-zones'], queryFn: () => commerceService.listShippingZones() });

  const toggle = useAdminMutation((id) => commerceService.toggleShippingZone(id), { invalidate: [['shipping-zones']], success: (r) => r?.message });
  const remove = useAdminMutation((id) => commerceService.deleteShippingZone(id), { invalidate: [['shipping-zones']], success: tr('تم حذف المدينة بنجاح.', 'City deleted.'), onSuccess: () => setToDelete(null) });

  const active = zones.filter((z) => z.is_active);
  const stats = { total: zones.length, active: active.length, cold: active.filter((z) => z.is_cold_shipping).length, avg: active.length ? active.reduce((s, z) => s + Number(z.shipping_fee), 0) / active.length : 25 };
  const rows = zones.filter((z) => status === 'all' || (status === 'active' ? z.is_active : !z.is_active));

  const columns = [
    {
      key: 'city',
      header: tr('المدينة (بالعربية / English)', 'City (Arabic / English)'),
      sortValue: (z) => z.city_name_ar,
      cell: (z) => (
        <div>
          <span className="font-semibold text-slate-900 block leading-tight">{z.city_name_ar}</span>
          <span dir="ltr" className="text-[11px] text-slate-400 font-mono">{z.city_name_en}</span>
        </div>
      ),
    },
    { key: 'fee', header: tr('تكلفة الشحن والتوصيل', 'Shipping fee'), sortValue: (z) => Number(z.shipping_fee), cell: (z) => <span className="font-bold text-[#0f764a] text-sm">{numberFormat(z.shipping_fee, 2)} {currency}</span> },
    { key: 'eta', header: tr('المدة التقديرية للتوصيل', 'Delivery estimate'), hideOnMobile: true, cell: (z) => <span className="text-slate-600 text-xs font-medium">{z.estimated_delivery}</span> },
    {
      key: 'cold',
      header: tr('نوع الشحن', 'Shipping type'),
      align: 'center',
      cell: (z) =>
        z.is_cold_shipping ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0f764a] bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full"><Icon name="snowflake" className="w-3.5 h-3.5" />{tr('شحن مبرد', 'Cold')}</span>
        ) : (
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">{tr('عادي', 'Standard')}</span>
        ),
    },
    { key: 'status', header: tr('الحالة', 'Status'), align: 'center', cell: (z) => <StatusToggle active={!!z.is_active} onToggle={() => toggle.mutate(z.id)} pending={toggle.isPending && toggle.variables === z.id} activeLabel={tr('فعّال', 'Active')} inactiveLabel={tr('متوقف', 'Stopped')} /> },
    {
      key: 'actions',
      header: tr('الإجراءات', 'Actions'),
      align: 'center',
      cell: (z) => (
        <div className="flex items-center justify-center gap-2">
          <IconAction icon="edit-3" label={tr('تعديل', 'Edit')} onClick={() => setDialog({ open: true, zone: z })} />
          <IconAction icon="trash-2" label={tr('حذف', 'Delete')} tone="danger" onClick={() => setToDelete(z)} />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader
        title={tr('مناطق ومدن الشحن بالمملكة العربية السعودية', 'Saudi Shipping Zones & Cities')}
        subtitle={tr('تحديد مدن التوصيل، رسوم الشحن لكل منطقة، مدة التوصيل التقديرية والشحن المبرد', 'Define delivery cities, per-zone fees, estimated times and cold shipping')}
        actions={<Button icon="plus-circle" onClick={() => setDialog({ open: true, zone: null })}>{tr('إضافة مدينة جديدة', 'Add New City')}</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard icon="map" label={tr('إجمالي المدن', 'Total cities')} value={numberFormat(stats.total, 0)} tone="bg-amber-50 text-amber-800 border-amber-200/60" />
        <StatCard icon="check-circle-2" label={tr('مدن مفعّلة', 'Active cities')} value={numberFormat(stats.active, 0)} valueClass="text-2xl text-[#0f764a]" />
        <StatCard icon="snowflake" label={tr('شحن مبرد', 'Cold shipping')} value={tr(`${stats.cold} مدينة`, `${stats.cold} cities`)} tone="bg-emerald-50 text-[#0f764a] border-emerald-200/60" valueClass="text-2xl text-[#0f764a]" />
        <StatCard icon="dollar-sign" label={tr('متوسط رسوم الشحن', 'Average fee')} value={`${numberFormat(stats.avg, 2)} ${currency}`} tone="bg-sky-50 text-sky-700 border-sky-200/60" valueClass="text-xl text-slate-900" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        search={search}
        searchText={(z) => `${z.city_name_ar} ${z.city_name_en}`}
        empty={{ icon: 'map-pin-off', title: tr('لا توجد مدن شحن مسجلة تطابق بحثك حالياً.', 'No shipping cities match your search.') }}
        toolbar={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={tr('بحث بالمدينة (الرياض، جدة، الدمام، Riyadh)...', 'Search city (Riyadh, Jeddah, Dammam)…')} className="w-full sm:w-72" />
            <SelectField className="w-full sm:w-44 [&_select]:text-xs [&_select]:py-2" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={tr('الحالة', 'Status')}>
              <option value="all">{tr('كل الحالات', 'All statuses')}</option>
              <option value="active">{tr('فعّال فقط', 'Active only')}</option>
              <option value="inactive">{tr('متوقف فقط', 'Stopped only')}</option>
            </SelectField>
          </>
        }
      />

      <ZoneDialog open={dialog.open} zone={dialog.zone} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete.id)} loading={remove.isPending} message={tr('هل أنت متأكد من حذف هذه المدينة من مناطق الشحن؟', 'Remove this city from the shipping zones?')} confirmLabel={tr('حذف', 'Delete')} />
    </div>
  );
}
