import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { numberFormat } from '@tamrna/shared/utils';
import { Button, ConfirmDialog, DataTable, Icon, IconAction, Modal, PageHeader, SearchInput, SelectField, StatCard, StatusToggle, SwitchRow, TextField, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { useQueryParam } from '@/hooks/useQueryState';
import { commerceService } from '@/services';
import { couponSchema } from '@/schemas';

const BLANK = { code: '', discount_type: 'percentage', discount_value: '', min_order_amount: 0, usage_limit: '', start_date: '', end_date: '', is_active: true };

function CouponDialog({ open, coupon, onClose }) {
  const { tr, locale } = useT();
  const m = (ar, en) => (locale === 'en' ? en : ar);
  const schema = useMemo(() => couponSchema(m), [locale]); // eslint-disable-line react-hooks/exhaustive-deps
  const editing = !!coupon;
  const { register, handleSubmit, reset, control, setError, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: BLANK });

  useEffect(() => {
    if (!open) return;
    reset(coupon ? { code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value, min_order_amount: coupon.min_order_amount ?? 0, usage_limit: coupon.usage_limit ?? '', start_date: coupon.start_date || '', end_date: coupon.end_date || '', is_active: !!coupon.is_active } : BLANK);
  }, [open, coupon, reset]);

  const save = useAdminMutation((v) => (editing ? commerceService.updateCoupon(coupon.id, v) : commerceService.createCoupon(v)), {
    invalidate: [['coupons']],
    success: tr('تم حفظ بيانات الكوبون بنجاح!', 'Coupon saved successfully!'),
    onSuccess: onClose,
    onFieldErrors: (errs) => Object.entries(errs).forEach(([f, msgs]) => setError(f, { message: [].concat(msgs)[0] })),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? tr('تعديل بيانات الكوبون', 'Edit coupon') : tr('إضافة كوبون خصم جديد', 'Add a new discount coupon')}
      subtitle={editing ? tr('تعديل نسبة الخصم والحدود وتاريخ الانتهاء', 'Edit the discount, limits and expiry date') : tr('حدد رمز الكوبون، نوع الخصم وشروط الاستخدام', 'Set the coupon code, discount type and usage rules')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{tr('إلغاء', 'Cancel')}</Button>
          <Button type="submit" form="coupon-form" loading={save.isPending}>{editing ? tr('حفظ التعديلات', 'Save changes') : tr('إنشاء الكوبون', 'Create coupon')}</Button>
        </>
      }
    >
      <form id="coupon-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 text-sm">
        <TextField label={tr('رمز الكوبون (Coupon Code)', 'Coupon code')} required dir="ltr" placeholder="TAMRNA20" hint={tr('حروف وأرقام إنجليزية فقط بدون مسافات', 'English letters and digits only, no spaces')} error={errors.code?.message} inputClassName="font-mono font-black uppercase" {...register('code', { setValueAs: (v) => String(v).toUpperCase() })} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label={tr('نوع الخصم', 'Discount type')} {...register('discount_type')}>
            <option value="percentage">{tr('نسبة مئوية (%)', 'Percentage (%)')}</option>
            <option value="fixed">{tr('مبلغ ثابت (ر.س)', 'Fixed amount (SAR)')}</option>
          </SelectField>
          <TextField label={tr('قيمة الخصم', 'Discount value')} required type="number" step="0.5" min="0" placeholder="10" error={errors.discount_value?.message} {...register('discount_value')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={tr('الحد الأدنى للطلب (ر.س)', 'Minimum order (SAR)')} type="number" step="1" min="0" {...register('min_order_amount')} />
          <TextField label={tr('أقصى عدد مرات استخدام', 'Maximum uses')} type="number" min="1" placeholder={tr('اتركه فارغاً لعدد غير محدود', 'Leave empty for unlimited')} {...register('usage_limit')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={tr('تاريخ البداية (اختياري)', 'Start date (optional)')} type="date" {...register('start_date')} />
          <TextField label={tr('تاريخ الانتهاء (اختياري)', 'End date (optional)')} type="date" error={errors.end_date?.message} {...register('end_date')} />
        </div>
        <Controller control={control} name="is_active" render={({ field }) => <SwitchRow label={tr('حالة التفعيل', 'Active')} hint={tr('الكوبونات المتوقفة لا تُقبل في السلة', 'Stopped coupons are rejected at the cart')} checked={!!field.value} onChange={field.onChange} />} />
      </form>
    </Modal>
  );
}

/** Coupons & vouchers (resources/views/admin/coupons.php). */
export default function Coupons() {
  const { tr, currency } = useT();
  const [search, setSearch] = useQueryParam('q', '');
  const [status, setStatus] = useQueryParam('status', 'all');
  const [dialog, setDialog] = useState({ open: false, coupon: null });
  const [toDelete, setToDelete] = useState(null);
  const { data: coupons = [], isLoading, error, refetch } = useQuery({ queryKey: ['coupons'], queryFn: () => commerceService.listCoupons() });

  const toggle = useAdminMutation((id) => commerceService.toggleCoupon(id), { invalidate: [['coupons']], success: (r) => r?.message });
  const remove = useAdminMutation((id) => commerceService.deleteCoupon(id), { invalidate: [['coupons']], success: tr('تم حذف الكوبون بنجاح.', 'Coupon deleted.'), onSuccess: () => setToDelete(null) });

  const stats = {
    total: coupons.length,
    active: coupons.filter((c) => c.is_active).length,
    uses: coupons.reduce((s, c) => s + Number(c.times_used || 0), 0),
    pct: coupons.filter((c) => c.discount_type === 'percentage').length,
    fixed: coupons.filter((c) => c.discount_type === 'fixed').length,
  };
  const rows = coupons.filter((c) => status === 'all' || (status === 'active' ? c.is_active : !c.is_active));
  const today = new Date().toISOString().slice(0, 10);

  const columns = [
    {
      key: 'code',
      header: tr('رمز الكوبون', 'Coupon code'),
      sortValue: (c) => c.code,
      cell: (c) => (
        <div className="flex items-center gap-2">
          <span dir="ltr" className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/70">{c.code}</span>
          <button type="button" onClick={() => navigator.clipboard?.writeText(c.code).then(() => toast.success(tr('تم نسخ الكود', 'Code copied')))} title={tr('نسخ الكود', 'Copy code')} aria-label={tr('نسخ الكود', 'Copy code')} className="text-slate-400 hover:text-[#0f764a] transition">
            <Icon name="copy" className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
    {
      key: 'discount',
      header: tr('نوع وقيمة الخصم', 'Type & value'),
      sortValue: (c) => Number(c.discount_value),
      cell: (c) =>
        c.discount_type === 'percentage' ? (
          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/70 text-xs"><Icon name="percent" className="w-3 h-3" />{Number(c.discount_value)}% {tr('خصم', 'off')}</span>
        ) : (
          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/70 text-xs">{numberFormat(c.discount_value, 2)} {currency} {tr('خصم', 'off')}</span>
        ),
    },
    { key: 'min', header: tr('الحد الأدنى للطلب', 'Minimum order'), hideOnMobile: true, cell: (c) => (Number(c.min_order_amount) > 0 ? <span className="font-bold text-slate-900">{numberFormat(c.min_order_amount, 2)} {currency}</span> : <span className="text-slate-400">{tr('بدون حد أدنى', 'No minimum')}</span>) },
    {
      key: 'uses',
      header: tr('مرات الاستخدام', 'Uses'),
      sortValue: (c) => Number(c.times_used),
      cell: (c) => (
        <>
          <div className="flex items-center gap-1.5 font-bold"><span className="text-slate-900">{c.times_used}</span><span className="text-slate-400 text-[11px]">/ {c.usage_limit || '∞'}</span></div>
          {c.usage_limit && c.times_used >= c.usage_limit ? <span className="text-[10px] font-bold text-rose-600 block">{tr('تم استنفاد الحد', 'Limit reached')}</span> : null}
        </>
      ),
    },
    {
      key: 'validity',
      header: tr('فترة الصلاحية', 'Validity'),
      hideOnMobile: true,
      cell: (c) =>
        c.start_date || c.end_date ? (
          <div className="text-xs">
            <div><span className="text-slate-500 text-[11px]">{tr('من:', 'From:')}</span> {c.start_date || tr('غير محدد', 'Not set')}</div>
            <div><span className="text-slate-500 text-[11px]">{tr('إلى:', 'To:')}</span> <span className={cx(c.end_date && c.end_date < today && 'text-rose-600 font-bold')}>{c.end_date || tr('مفتوح', 'Open')}</span></div>
          </div>
        ) : (
          <span className="text-emerald-700 font-semibold text-xs">{tr('صالح دائماً', 'Always valid')}</span>
        ),
    },
    { key: 'status', header: tr('الحالة', 'Status'), align: 'center', cell: (c) => <StatusToggle active={!!c.is_active} onToggle={() => toggle.mutate(c.id)} pending={toggle.isPending && toggle.variables === c.id} activeLabel={tr('فعّال', 'Active')} inactiveLabel={tr('متوقف', 'Stopped')} /> },
    {
      key: 'actions',
      header: tr('الإجراءات', 'Actions'),
      align: 'center',
      cell: (c) => (
        <div className="flex items-center justify-center gap-2">
          <IconAction icon="edit-3" label={tr('تعديل', 'Edit')} onClick={() => setDialog({ open: true, coupon: c })} />
          <IconAction icon="trash-2" label={tr('حذف', 'Delete')} tone="danger" onClick={() => setToDelete(c)} />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader
        title={tr('إدارة كوبونات وقسائم التخفيض', 'Coupons & Discount Vouchers')}
        subtitle={tr('إنشاء ومتابعة أكواد الخصم، نسب التخفيض، صلاحية الكوبونات، ومرات الاستخدام', 'Create and track discount codes, rates, validity and usage')}
        actions={<Button icon="plus-circle" onClick={() => setDialog({ open: true, coupon: null })}>{tr('إضافة كوبون جديد', 'Add New Coupon')}</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard icon="tags" label={tr('إجمالي الكوبونات', 'Total coupons')} value={numberFormat(stats.total, 0)} tone="bg-amber-50 text-amber-800 border-amber-200/60" />
        <StatCard icon="check-circle-2" label={tr('كوبونات مفعّلة', 'Active coupons')} value={numberFormat(stats.active, 0)} valueClass="text-2xl text-[#0f764a]" />
        <StatCard icon="repeat" label={tr('مرات الاستخدام الفعلية', 'Actual uses')} value={numberFormat(stats.uses, 0)} tone="bg-sky-50 text-sky-700 border-sky-200/60" valueClass="text-2xl text-sky-800" />
        <StatCard icon="percent" label={tr('خصم مئوي / ثابت', 'Percentage / fixed')} value={tr(`${stats.pct} مئوي | ${stats.fixed} ثابت`, `${stats.pct} % | ${stats.fixed} fixed`)} tone="bg-emerald-50 text-[#0f764a] border-emerald-200/60" valueClass="text-lg text-slate-800" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        search={search}
        searchText={(c) => c.code}
        empty={{ icon: 'ticket', title: tr('لا توجد كوبونات مسجلة تطابق بحثك حالياً.', 'No coupons match your search.') }}
        toolbar={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={tr('بحث برمز الكوبون (مثال: TAMRNA10)...', 'Search by code (e.g. TAMRNA10)…')} className="w-full sm:w-72" />
            <SelectField className="w-full sm:w-44 [&_select]:text-xs [&_select]:py-2" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={tr('الحالة', 'Status')}>
              <option value="all">{tr('كل الحالات', 'All statuses')}</option>
              <option value="active">{tr('فعّال فقط', 'Active only')}</option>
              <option value="inactive">{tr('متوقف فقط', 'Stopped only')}</option>
            </SelectField>
          </>
        }
      />

      <CouponDialog open={dialog.open} coupon={dialog.coupon} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete.id)} loading={remove.isPending} message={tr('هل أنت متأكد من حذف هذا الكوبون نهائياً؟', 'Are you sure you want to permanently delete this coupon?')} confirmLabel={tr('حذف', 'Delete')} />
    </div>
  );
}
