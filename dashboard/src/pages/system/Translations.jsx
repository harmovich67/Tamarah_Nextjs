import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Badge, Button, CheckField, ConfirmDialog, DataTable, Icon, IconAction, Modal, PageHeader, SearchInput, Tabs, TextAreaField, TextField } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { useQueryParam } from '@/hooks/useQueryState';
import { systemService } from '@/services';

const CATS = [
  ['all', 'الكل', 'All'], ['storefront', 'واجهة المتجر', 'Storefront'], ['catalog', 'الكتالوج', 'Catalog'], ['checkout', 'السلة والدفع', 'Cart & checkout'], ['orders', 'الطلبات', 'Orders'],
  ['profile_otp', 'الحساب والتحقق', 'Account & OTP'], ['acf', 'الحقول المخصصة', 'Custom fields'], ['security_cache', 'الأمان والكاش', 'Security & cache'], ['admin', 'لوحة التحكم', 'Dashboard'], ['general', 'عام', 'General'],
];

function TranslationDialog({ open, row, onClose }) {
  const { tr } = useT();
  const editing = !!row;
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm({ defaultValues: { key: '', ar: '', en: '' } });
  useEffect(() => { if (open) reset(row ? { key: row.key, ar: row.ar, en: row.en } : { key: '', ar: '', en: '' }); }, [open, row, reset]);
  const save = useAdminMutation((v) => systemService.saveTranslation(v), {
    invalidate: [['translations']],
    success: tr('تم حفظ الترجمة بنجاح', 'Translation saved'),
    onSuccess: onClose,
    onFieldErrors: (errs) => Object.entries(errs).forEach(([f, m]) => setError(f, { message: [].concat(m)[0] })),
  });
  return (
    <Modal open={open} onClose={onClose} title={editing ? tr('تعديل الترجمة', 'Edit translation') : tr('إضافة مفتاح ترجمة جديد', 'Add a new translation key')} footer={<><Button variant="secondary" onClick={onClose}>{tr('إلغاء', 'Cancel')}</Button><Button type="submit" form="tr-form" loading={save.isPending}>{tr('حفظ', 'Save')}</Button></>}>
      <form id="tr-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 text-sm">
        <TextField label={tr('مفتاح الترجمة', 'Translation key')} required readOnly={editing} dir="ltr" inputClassName="font-mono text-xs" placeholder="hero_summer_sale_title" error={errors.key?.message} {...register('key')} />
        <TextAreaField label={tr('النص بالعربية', 'Arabic text')} required rows={3} dir="rtl" {...register('ar')} />
        <TextAreaField label={tr('النص بالإنجليزية', 'English text')} required rows={3} dir="ltr" {...register('en')} />
      </form>
    </Modal>
  );
}

/** Live translations editor (resources/views/admin/translations.php). */
export default function Translations() {
  const { tr } = useT();
  const [cat, setCat] = useQueryParam('cat', 'all');
  const [search, setSearch] = useQueryParam('q', '');
  const [missing, setMissing] = useState(false);
  const [dialog, setDialog] = useState({ open: false, row: null });
  const [toDelete, setToDelete] = useState(null);
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['translations'], queryFn: () => systemService.listTranslations() });
  const remove = useAdminMutation((key) => systemService.deleteTranslation(key), { invalidate: [['translations']], success: tr('تم حذف التعديل', 'Override removed'), onSuccess: () => setToDelete(null) });

  const counts = useMemo(() => {
    const c = { all: data.length, missing: 0 };
    data.forEach((r) => { c[r.category] = (c[r.category] || 0) + 1; if (r.missing) c.missing += 1; });
    return c;
  }, [data]);
  const rows = data.filter((r) => (cat === 'all' || r.category === cat) && (!missing || r.missing));

  const columns = [
    { key: 'key', header: tr('المفتاح', 'Key'), sortValue: (r) => r.key, cell: (r) => <code dir="ltr" className="font-mono text-[11px] text-stone-700 bg-stone-100 px-2 py-0.5 rounded">{r.key}</code> },
    { key: 'ar', header: 'العربية', cell: (r) => <span dir="rtl" className="block max-w-xs truncate text-xs text-stone-800">{r.ar || <Badge tone="rose">{tr('مفقود', 'Missing')}</Badge>}</span> },
    { key: 'en', header: 'English', cell: (r) => <span dir="ltr" className="block max-w-xs truncate text-xs text-stone-800">{r.en || <Badge tone="rose">{tr('مفقود', 'Missing')}</Badge>}</span> },
    { key: 'state', header: tr('الحالة', 'State'), hideOnMobile: true, align: 'center', cell: (r) => (r.custom ? <Badge tone="blue">{tr('مفتاح جديد', 'Custom')}</Badge> : r.overridden ? <Badge tone="gold">{tr('معدّل', 'Overridden')}</Badge> : <Badge tone="stone">{tr('افتراضي', 'Default')}</Badge>) },
    {
      key: 'actions',
      header: tr('الإجراءات', 'Actions'),
      align: 'center',
      cell: (r) => (
        <div className="flex items-center justify-center gap-2">
          <IconAction icon="edit-3" label={tr('تعديل', 'Edit')} onClick={() => setDialog({ open: true, row: r })} />
          {(r.overridden || r.custom) && <IconAction icon={r.custom ? 'trash-2' : 'archive-restore'} label={r.custom ? tr('حذف', 'Delete') : tr('استعادة الافتراضي', 'Restore default')} tone="danger" onClick={() => setToDelete(r)} />}
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader
        title={tr('إدارة الترجمات', 'Translations Management')}
        subtitle={tr('تعديل نصوص المتجر ولوحة التحكم بالعربية والإنجليزية مباشرة', 'Edit storefront and dashboard texts in Arabic and English live')}
        actions={<Button icon="plus-circle" onClick={() => setDialog({ open: true, row: null })}>{tr('مفتاح جديد', 'New key')}</Button>}
      />
      <Tabs value={cat} onChange={setCat} tabs={CATS.map(([k, ar, en]) => ({ key: k, label: tr(ar, en), count: counts[k] ?? 0 }))} />
      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        search={search}
        pageSize={15}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.key} ${r.ar} ${r.en}`}
        empty={{ icon: 'languages', title: tr('لا توجد ترجمات مطابقة', 'No matching translations') }}
        toolbar={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={tr('ابحث بالمفتاح أو النص…', 'Search by key or text…')} className="w-full sm:w-80" />
            <CheckField label={<span className="text-xs">{tr(`المفقود فقط (${counts.missing || 0})`, `Missing only (${counts.missing || 0})`)}</span>} checked={missing} onChange={(e) => setMissing(e.target.checked)} />
            <span className="ms-auto text-[11px] text-stone-400 inline-flex items-center gap-1"><Icon name="info" className="w-3.5 h-3.5" />{tr('التعديلات تُحفظ كطبقة فوق القاموس الأصلي', 'Edits are stored as overrides over the base dictionary')}</span>
          </>
        }
      />
      <TranslationDialog open={dialog.open} row={dialog.row} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete.key)} loading={remove.isPending} message={toDelete?.custom ? tr('حذف هذا المفتاح نهائياً؟', 'Delete this key permanently?') : tr('استعادة النص الافتراضي لهذا المفتاح؟', 'Restore the default text for this key?')} confirmLabel={tr('تأكيد', 'Confirm')} />
    </div>
  );
}
