import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, ConfirmDialog, EmptyState, ErrorState, Icon, Modal, SelectField, Skeleton, TextField, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { usePermissions } from '@/hooks/usePermissions';
import { storeService } from '@/services';
import { warehouseSchema } from '@/schemas';

function WarehouseDialog({ open, warehouse, onClose }) {
  const { tr, locale } = useT();
  const m = (ar, en) => (locale === 'en' ? en : ar);
  const schema = useMemo(() => warehouseSchema(m), [locale]); // eslint-disable-line react-hooks/exhaustive-deps
  const editing = !!warehouse;
  const blank = { name_ar: '', name_en: '', code: '', location: '', phone: '', status: 'active' };
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: blank });
  useEffect(() => {
    if (open) reset(warehouse ? { name_ar: warehouse.name_ar, name_en: warehouse.name_en || '', code: warehouse.code || '', location: warehouse.location || '', phone: warehouse.phone || '', status: warehouse.status || 'active' } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, warehouse]);

  const save = useAdminMutation((v) => (editing ? storeService.updateWarehouse(warehouse.id, v) : storeService.createWarehouse(v)), {
    invalidate: [['warehouses']],
    success: tr('تم حفظ بيانات المستودع بنجاح', 'Warehouse saved successfully'),
    onSuccess: onClose,
    onFieldErrors: (errs) => Object.entries(errs).forEach(([f, msgs]) => setError(f, { message: [].concat(msgs)[0] })),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? tr('تعديل بيانات المستودع', 'Edit Cold Storage') : tr('إضافة مستودع تمور مبرد جديد', 'Add New Date Cold Storage')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{tr('إلغاء', 'Cancel')}</Button>
          <Button type="submit" form="warehouse-form" loading={save.isPending}>{tr('حفظ المستودع', 'Save warehouse')}</Button>
        </>
      }
    >
      <form id="warehouse-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 text-sm">
        <TextField label={tr('اسم المستودع (بالعربية)', 'Warehouse Name (Arabic)')} required error={errors.name_ar?.message} placeholder="مستودع القصيم المركزي للتمور" inputClassName="font-bold" {...register('name_ar')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={tr('اسم المستودع (بالانجليزية)', 'Warehouse Name (English)')} dir="ltr" placeholder="Qassim Date Hub" {...register('name_en')} />
          <TextField label={tr('رمز المستودع (الكود)', 'Warehouse Code')} dir="ltr" placeholder="WH-QAS-01" inputClassName="font-mono font-bold" {...register('code')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={tr('الموقع الجغرافي', 'Location')} placeholder={tr('القصيم - بريدة', 'Qassim - Buraidah')} {...register('location')} />
          <TextField label={tr('هاتف التواصل', 'Contact phone')} dir="ltr" placeholder="+966 16 000 0000" {...register('phone')} />
        </div>
        <SelectField label={tr('الحالة', 'Status')} {...register('status')}>
          <option value="active">{tr('نشط / جاهز للشحن', 'Active')}</option>
          <option value="inactive">{tr('معطل', 'Inactive')}</option>
        </SelectField>
      </form>
    </Modal>
  );
}

/** Cold-storage warehouses (resources/views/admin/warehouses.php). */
export default function Warehouses() {
  const { tr, locale } = useT();
  const { can } = usePermissions();
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['warehouses'], queryFn: () => storeService.listWarehouses() });
  const [dialog, setDialog] = useState({ open: false, warehouse: null });
  const [toDelete, setToDelete] = useState(null);
  const remove = useAdminMutation((id) => storeService.deleteWarehouse(id), {
    invalidate: [['warehouses']],
    success: tr('تم حذف المستودع بنجاح', 'Warehouse deleted successfully'),
    onSuccess: () => setToDelete(null),
  });

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#0f764a] border border-emerald-200/60 flex items-center justify-center shadow-2xs">
            <Icon name="boxes" className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{tr('مستودعات التمور والمخازن المبردة', 'Date Cold Storages & Fulfillment Hubs')}</h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">{tr('إدارة مراكز التبريد وتخزين محصول التمور في مختلف مناطق المملكة', 'Manage cooling and storage hubs for the date harvest across the Kingdom')}</p>
          </div>
        </div>
        {can('warehouses.create') && (
          <button type="button" onClick={() => setDialog({ open: true, warehouse: null })} className="px-5 py-2.5 bg-gradient-to-b from-[#137547] to-[#0e5c37] hover:from-[#0e5c37] hover:to-[#0a472a] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition active:scale-[.98]">
            <Icon name="plus-circle" className="w-4 h-4" />
            <span>{tr('إضافة مستودع مبرد جديد', 'Add New Cold Storage')}</span>
          </button>
        )}
      </div>

      {error ? (
        <ErrorState title={tr('تعذر تحميل المستودعات', 'Could not load warehouses')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : !data.length ? (
        <EmptyState icon="snowflake" title={tr('لا توجد مستودعات بعد', 'No warehouses yet')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {data.map((w) => (
            <div key={w.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4 hover:shadow-xs transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 p-2 border border-emerald-200/60 flex items-center justify-center shrink-0 text-[#0f764a] shadow-2xs">
                    <Icon name="snowflake" className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{locale === 'en' ? w.name_en || w.name_ar : w.name_ar}</h3>
                    <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">{w.code || 'WH-DEFAULT'}</span>
                  </div>
                </div>
                <span className={cx('text-xs font-semibold px-2.5 py-0.5 rounded-full border', w.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70' : 'bg-slate-100 text-slate-600 border-slate-200')}>
                  {w.status === 'active' ? tr('نشط / جاهز للشحن', 'Active') : tr('معطل', 'Inactive')}
                </span>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-2 text-xs font-medium text-slate-600">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">{tr('نوع الحفظ:', 'Storage Type:')}</span>
                  <b className="text-[#0f764a] flex items-center gap-1"><Icon name="thermometer-snowflake" className="w-3.5 h-3.5" /> {tr('تبريد متحكم به (-18° إلى 4°)', 'Controlled cooling (-18° to 4°)')}</b>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">{tr('الموقع الجغرافي:', 'Location:')}</span>
                  <b className="text-slate-800 font-semibold">{w.location || tr('المملكة العربية السعودية', 'KSA')}</b>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">{tr('هاتف التواصل:', 'Contact Phone:')}</span>
                  <b dir="ltr" className="text-slate-800 font-mono">{w.phone || '-'}</b>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">{tr('إجمالي المخزون:', 'Total inventory:')}</span>
                  <b className="text-[#0f764a] font-bold">{w.total_inventory} {tr('وحدة', 'units')}</b>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {can('warehouses.edit') && (
                  <button type="button" onClick={() => setDialog({ open: true, warehouse: w })} className="flex-1 py-2 bg-white hover:bg-emerald-50 hover:text-[#0f764a] hover:border-emerald-200 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs">
                    <Icon name="edit-3" className="w-3.5 h-3.5" />
                    <span>{tr('تعديل المستودع', 'Edit')}</span>
                  </button>
                )}
                {can('warehouses.delete') && (
                  <button type="button" onClick={() => setToDelete(w)} className="p-2 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200/60 rounded-xl transition shadow-2xs" title={tr('حذف', 'Delete')} aria-label={tr('حذف', 'Delete')}>
                    <Icon name="trash-2" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <WarehouseDialog open={dialog.open} warehouse={dialog.warehouse} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete.id)} loading={remove.isPending} message={tr('هل أنت متأكد من حذف هذا المستودع نهائياً؟', 'Are you sure you want to permanently delete this warehouse?')} confirmLabel={tr('حذف', 'Delete')} />
    </div>
  );
}
