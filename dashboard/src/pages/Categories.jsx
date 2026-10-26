import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, CheckField, ConfirmDialog, EmptyState, ErrorState, FileUploader, Icon, Modal, Pagination, SearchInput, SelectField, Skeleton, TextAreaField, TextField, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { useQueryParam } from '@/hooks/useQueryState';
import { usePermissions } from '@/hooks/usePermissions';
import { storeService } from '@/services';
import { categorySchema } from '@/schemas';
import { config } from '@/lib/config';
import { assetSrc } from './products/ProductsPage';

const isLaravel = config.apiMode === 'laravel';
const PER_PAGE = 12;

function CategoryDialog({ open, category, onClose }) {
  const { tr, locale } = useT();
  const m = (ar, en) => (locale === 'en' ? en : ar);
  const schema = useMemo(() => categorySchema(m), [locale]); // eslint-disable-line react-hooks/exhaustive-deps
  const editing = !!category;
  const blank = { name_ar: '', name_en: '', icon: 'tag', slug: '', image_file: null, description_ar: '', description_en: '', is_active: true, sort_order: '' };
  const { register, handleSubmit, reset, control, setError, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: blank });

  // The list only carries what the cards show; the backend edit form needs both languages, so fetch the full record.
  const { data: full } = useQuery({ queryKey: ['category', category?.id], queryFn: () => storeService.getCategory(category.id), enabled: open && editing && isLaravel });
  const source = isLaravel && editing ? full ?? category : category;

  useEffect(() => {
    if (!open) return;
    if (!source) return reset(blank);
    reset({
      ...blank,
      name_ar: source.name_ar,
      name_en: source.name_en || '',
      icon: source.icon || 'tag',
      slug: source.slug || '',
      description_ar: source.description_ar || '',
      description_en: source.description_en || '',
      is_active: source.is_active !== false,
      sort_order: source.sort_order ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source, reset]);

  const save = useAdminMutation((values) => (editing ? storeService.updateCategory(category.id, values) : storeService.createCategory(values)), {
    invalidate: [['categories'], ['category'], ['dashboard']],
    success: tr('تم حفظ بيانات التصنيف بنجاح!', 'Category saved successfully!'),
    onSuccess: onClose,
    onFieldErrors: (errs) => Object.entries(errs).forEach(([f, msgs]) => setError(f, { message: [].concat(msgs)[0] })),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? tr('تعديل تصنيف التمور', 'Edit category') : tr('إضافة صنف تمور جديد', 'Add a new date category')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{tr('إلغاء', 'Cancel')}</Button>
          <Button type="submit" form="category-form" loading={save.isPending}>{editing ? tr('حفظ التعديلات', 'Save changes') : tr('حفظ الصنف', 'Save category')}</Button>
        </>
      }
    >
      <form id="category-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 text-sm">
        <TextField label={tr('اسم التصنيف (بالعربية)', 'Category name (Arabic)')} required error={errors.name_ar?.message} placeholder={tr('مثال: عجوة فاخرة، سكري القصيم...', 'e.g. Luxury Ajwa, Qassim Sukkari…')} {...register('name_ar')} />
        <TextField label={tr('اسم التصنيف (بالإنجليزية)', 'Category name (English)')} dir="ltr" placeholder="e.g. Madinah Ajwa Luxury" {...register('name_en')} />
        <Controller control={control} name="image_file" render={({ field }) => <FileUploader label={editing ? tr('تحديث صورة التصنيف', 'Update category image') : tr('صورة التصنيف', 'Category image')} value={field.value || (editing ? category.image : null) || undefined} onChange={field.onChange} />} />
        {isLaravel ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextAreaField label={tr('الوصف (بالعربية)', 'Description (Arabic)')} error={errors.description_ar?.message} {...register('description_ar')} />
              <TextAreaField label={tr('الوصف (بالإنجليزية)', 'Description (English)')} dir="ltr" error={errors.description_en?.message} {...register('description_en')} />
            </div>
            <TextField label={tr('الرابط اللطيف (Slug)', 'Slug')} dir="ltr" inputClassName="font-mono" placeholder="ajwa-dates" error={errors.slug?.message} {...register('slug')} />
            <CheckField label={tr('التصنيف فعّال ويظهر في المتجر', 'Category is active and visible in the store')} {...register('is_active')} />
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label={tr('أيقونة Lucide', 'Lucide icon')} dir="ltr" inputClassName="font-mono" placeholder="tag, gift, box, star, award..." {...register('icon')} />
            <TextField label={tr('الرابط اللطيف (Slug)', 'Slug')} dir="ltr" inputClassName="font-mono" placeholder="ajwa-dates" error={errors.slug?.message} {...register('slug')} />
          </div>
        )}
      </form>
    </Modal>
  );
}

/** Categories grid (resources/views/admin/categories.php). */
export default function Categories() {
  const { tr, locale } = useT();
  const { can } = usePermissions();
  const [active, setActive] = useQueryParam('active', ''); // '' | '1' | '0' (the backend filters[is_active]; laravel mode only)
  const [search, setSearch] = useQueryParam('q', '');
  const [page, setPage] = useState(1);
  // The search goes to the backend (`search`): wait for the typing to pause so it is one request, not one per key.
  const [term, setTerm] = useState(search);
  useEffect(() => {
    const id = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);
  useEffect(() => setPage(1), [term, active]);

  // ONE request per page (the backend pages the list: page / per_page / search / filters[is_active]).
  const { data: result, isLoading, error, refetch } = useQuery({
    queryKey: ['categories', { page, term, active, locale }],
    queryFn: () => storeService.listCategoriesPage({ page, per_page: PER_PAGE, search: term, ...(isLaravel && active !== '' ? { is_active: active } : {}) }),
    placeholderData: (previous) => previous,
  });
  const data = useMemo(() => result?.rows ?? [], [result]);
  const filtering = term !== '' || active !== '';
  // Deleting the last card of the last page leaves an empty page: step back.
  useEffect(() => {
    if (result && page > result.lastPage) setPage(result.lastPage);
  }, [result, page]);
  const [dialog, setDialog] = useState({ open: false, category: null });
  const toggle = useAdminMutation((id) => storeService.toggleCategory(id), {
    invalidate: [['categories']],
    success: tr('تم تحديث حالة التصنيف.', 'Category status updated.'),
  });
  const [toDelete, setToDelete] = useState(null);
  const remove = useAdminMutation((id) => storeService.deleteCategory(id), {
    invalidate: [['categories'], ['dashboard']],
    success: tr('تم حذف التصنيف بنجاح.', 'Category deleted successfully.'),
    onSuccess: () => setToDelete(null),
  });

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#0f764a] border border-emerald-200/60 flex items-center justify-center shadow-2xs">
            <Icon name="tag" className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{tr('تصنيفات التمور والمنتجات', 'Dates Categories & Taxonomy')}</h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">{tr('إدارة أصناف تمور فاخرة، بوكسات الهدايا، والمشتقات الطبيعية', 'Manage luxury date varieties, royal gift boxes, and authentic harvests')}</p>
          </div>
        </div>
        {can('categories.create') && (
          <button type="button" onClick={() => setDialog({ open: true, category: null })} className="px-5 py-2.5 bg-gradient-to-b from-[#137547] to-[#0e5c37] hover:from-[#0e5c37] hover:to-[#0a472a] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition active:scale-[.98]">
            <Icon name="plus-circle" className="w-4 h-4" />
            <span>{tr('إضافة تصنيف جديد', 'Add New Category')}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder={tr('ابحث باسم القسم…', 'Search categories…')} className="w-full sm:w-72" />
        {isLaravel ? (
          <SelectField className="w-full sm:w-44 [&_select]:text-xs [&_select]:py-2" value={active} onChange={(e) => setActive(e.target.value)} aria-label={tr('الحالة', 'Status')}>
            <option value="">{tr('كل الحالات', 'All statuses')}</option>
            <option value="1">{tr('فعّال', 'Active')}</option>
            <option value="0">{tr('متوقف', 'Inactive')}</option>
          </SelectField>
        ) : null}
      </div>

      {error ? (
        <ErrorState title={tr('تعذر تحميل التصنيفات', 'Could not load categories')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
      ) : !data.length ? (
        <EmptyState icon="tags" title={filtering ? tr('لا توجد تصنيفات مطابقة', 'No matching categories') : tr('لا توجد تصنيفات بعد', 'No categories yet')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {data.map((cat) => (
            <div key={cat.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {cat.image ? <img src={assetSrc(cat.image)} alt={cat.name_ar} className="w-full h-full object-cover rounded-lg" /> : <Icon name={cat.icon || 'tag'} className="w-7 h-7 text-[#0f764a]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-base leading-tight truncate">{locale === 'en' && cat.name_en ? cat.name_en : cat.name_ar}</h3>
                    {/* The backend list answers one language only, so there is no second-language line in production. */}
                    {!isLaravel && <p className="text-xs text-amber-600 font-medium tracking-wide mt-0.5 truncate">{locale === 'en' ? cat.name_ar : cat.name_en}</p>}
                  </div>
                </div>
                {isLaravel ? (
                  // The backend list has no slug, icon or product count: only what it returns is shown.
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 flex justify-between items-center text-xs font-medium text-slate-600">
                    <span className="text-slate-400 font-normal">{tr('الترتيب:', 'Order:')}</span>
                    <span className="font-mono text-slate-700">{cat.sort_order ?? '—'}</span>
                  </div>
                ) : (
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-2.5 text-xs font-medium text-slate-600">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-normal">{tr('عدد المنتجات النشطة:', 'Active products:')}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#0f764a] font-bold text-xs border border-emerald-200/60">{cat.products_count == null ? '—' : `${cat.products_count} ${tr('منتج', 'products')}`}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-normal">{tr('الرابط الدائم (Slug):', 'Permalink (slug):')}</span>
                      <span dir="ltr" className="font-mono text-slate-700 text-[11px] bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">{cat.slug || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-normal">{tr('أيقونة العرض:', 'Display icon:')}</span>
                      <span className="font-mono text-slate-500 text-xs">{cat.icon || 'tag'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <a href={`${config.storefrontUrl}/catalog?cat=${cat.slug || cat.id}`} target="_blank" rel="noreferrer" className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs" title={tr('معاينة في المتجر', 'Preview in store')} aria-label={tr('معاينة في المتجر', 'Preview in store')}>
                  <Icon name="external-link" className="w-3.5 h-3.5" />
                </a>
                {isLaravel && can('categories.edit') && (
                  <button type="button" onClick={() => toggle.mutate(cat.id)} disabled={toggle.isPending} className={cx('px-3 py-2 rounded-xl text-xs font-semibold transition border shadow-2xs', cat.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200')} title={tr('تفعيل / إيقاف', 'Activate / deactivate')}>
                    {cat.is_active ? tr('فعّال', 'Active') : tr('موقوف', 'Inactive')}
                  </button>
                )}
                {can('categories.edit') && (
                  <button type="button" onClick={() => setDialog({ open: true, category: cat })} className="flex-1 py-2 bg-white hover:bg-emerald-50 hover:text-[#0f764a] hover:border-emerald-200 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs">
                    <Icon name="edit-3" className="w-3.5 h-3.5" />
                    <span>{tr('تعديل الصنف', 'Edit category')}</span>
                  </button>
                )}
                {can('categories.delete') && (
                  <button type="button" onClick={() => setToDelete(cat)} className="p-2 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200/60 rounded-xl transition shadow-2xs" title={tr('حذف التصنيف', 'Delete category')} aria-label={tr('حذف التصنيف', 'Delete category')}>
                    <Icon name="trash-2" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!error && result && result.lastPage > 1 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <Pagination page={result.page} pageCount={result.lastPage} onPage={setPage} total={result.total} perPage={result.perPage} />
        </div>
      ) : null}

      <CategoryDialog open={dialog.open} category={dialog.category} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete.id)} loading={remove.isPending} message={tr('هل أنت متأكد من رغبتك في حذف هذا التصنيف؟', 'Are you sure you want to delete this category?')} confirmLabel={tr('حذف', 'Delete')} />
    </div>
  );
}

