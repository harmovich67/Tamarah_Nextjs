import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { Button, CheckField, ConfirmDialog, EmptyState, ErrorState, Icon, Modal, SelectField, Skeleton, TextField, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { cmsService } from '@/services';

const BLANK = { location: 'header', label_ar: '', label_en: '', link_type: 'custom', page_id: '', custom_url: '', icon: '', order_index: 0, open_new_tab: false, status: 'active' };

function MenuDialog({ open, item, location, pages, onClose }) {
  const { t, tr, isEn } = useT();
  const editing = !!item;
  const { register, handleSubmit, reset, control, setError, formState: { errors } } = useForm({ defaultValues: BLANK });
  const linkType = useWatch({ control, name: 'link_type' });
  useEffect(() => {
    if (open) reset(item ? { ...BLANK, ...item, label_ar: item.label_ar || '', label_en: item.label_en || '', page_id: item.page_id || '', custom_url: item.custom_url || '', icon: item.icon || '', open_new_tab: !!Number(item.open_new_tab) } : { ...BLANK, location, page_id: pages[0]?.id || '' });
  }, [open, item, location, pages, reset]);

  const save = useAdminMutation((v) => (editing ? cmsService.updateMenuItem(item.id, v) : cmsService.createMenuItem(v)), {
    invalidate: [['menus']],
    success: t('menu_item_saved_success'),
    onSuccess: onClose,
    onFieldErrors: (errs) => Object.entries(errs).forEach(([f, msgs]) => setError(f, { message: [].concat(msgs)[0] })),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('edit_menu_item') : t('add_menu_item')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" form="menu-form" loading={save.isPending} className="!bg-indigo-600 hover:!bg-indigo-700">{t('save_menu_item')}</Button>
        </>
      }
    >
      <form id="menu-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={t('menu_label_ar')} required error={errors.label_ar?.message} {...register('label_ar')} />
          <TextField label={t('menu_label_en')} dir="ltr" {...register('label_en')} />
        </div>
        <SelectField label={t('menu_link_type')} {...register('link_type')}>
          <option value="page">{t('link_type_page')}</option>
          <option value="custom">{t('link_type_custom')}</option>
        </SelectField>
        {linkType === 'page' ? (
          <SelectField label={t('menu_target_page')} {...register('page_id')}>
            {pages.map((p) => <option key={p.id} value={p.id}>{isEn ? p.title_en || p.title_ar : p.title_ar}</option>)}
          </SelectField>
        ) : (
          <TextField label={t('menu_custom_url')} dir="ltr" placeholder="/catalog" inputClassName="font-mono" {...register('custom_url')} />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={t('menu_icon_optional')} dir="ltr" placeholder="link, star, info" inputClassName="font-mono" {...register('icon')} />
          <TextField label={t('menu_order_hint')} type="number" {...register('order_index')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <CheckField label={t('menu_open_new_tab')} {...register('open_new_tab')} />
          <SelectField {...register('status')} aria-label={tr('الحالة', 'Status')}>
            <option value="active">{t('menu_status_active')}</option>
            <option value="inactive">{t('menu_status_inactive')}</option>
          </SelectField>
        </div>
      </form>
    </Modal>
  );
}

function destination(item, tr) {
  if (item.link_type === 'page') return item.page_slug ? `/page/${item.page_slug}` : tr('(الصفحة المرتبطة محذوفة)', '(linked page was deleted)');
  return item.custom_url || '#';
}

/** Header & footer menus (resources/views/admin/menus.php). */
export default function Menus() {
  const { t, tr, isEn } = useT();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['menus'], queryFn: () => cmsService.listMenus() });
  const [dialog, setDialog] = useState({ open: false, item: null, location: 'header' });
  const [toDelete, setToDelete] = useState(null);
  const remove = useAdminMutation((id) => cmsService.deleteMenuItem(id), { invalidate: [['menus']], success: t('menu_item_deleted_success'), onSuccess: () => setToDelete(null) });

  const sections = [
    ['header', t('header_menu_title'), t('header_menu_subtitle'), 'layout-panel-top'],
    ['footer', t('footer_menu_title'), t('footer_menu_subtitle'), 'layout'],
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shadow-sm"><Icon name="menu" className="w-6 h-6" /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">{t('menus_management')}</h1>
          <p className="text-sm font-semibold text-stone-500 mt-1">{t('menus_management_subtitle')}</p>
        </div>
      </div>

      {error ? (
        <ErrorState title={tr('تعذر تحميل القوائم', 'Could not load menus')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} />
      ) : isLoading ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : (
        sections.map(([loc, title, subtitle, icon]) => {
          const items = data[loc];
          return (
            <div key={loc} className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center"><Icon name={icon} className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-base font-black text-stone-900">{title}</h3>
                    <p className="text-xs text-stone-400">{subtitle}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setDialog({ open: true, item: null, location: loc })} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-indigo-600/20 transition">
                  <Icon name="plus" className="w-4 h-4" />
                  <span>{t('add_menu_item')}</span>
                </button>
              </div>
              {!items.length ? (
                <EmptyState icon="link-2-off" title={t('no_menu_items')} text={t('no_menu_items_hint')} />
              ) : (
                <div className="divide-y divide-stone-100">
                  {items.map((item) => (
                    <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center text-xs font-black shrink-0">{Number(item.order_index)}</span>
                        {item.icon ? <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Icon name={item.icon} className="w-4 h-4" /></div> : null}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-stone-900 truncate">
                            {isEn ? item.label_en || item.label_ar : item.label_ar}
                            {item.status !== 'active' && <span className="ms-1.5 text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{t('menu_status_inactive')}</span>}
                          </p>
                          <p className="text-xs text-stone-400 font-mono truncate" dir="ltr">{destination(item, tr)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => setDialog({ open: true, item, location: loc })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white transition">
                          <Icon name="edit-3" className="w-3.5 h-3.5" />
                          <span>{t('edit_menu_item')}</span>
                        </button>
                        <button type="button" onClick={() => setToDelete(item)} className={cx('p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white transition')} title={t('delete')} aria-label={t('delete')}>
                          <Icon name="trash-2" className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      <MenuDialog open={dialog.open} item={dialog.item} location={dialog.location} pages={data?.pages || []} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete.id)} loading={remove.isPending} message={t('confirm_delete_menu_item')} confirmLabel={t('delete')} />
    </div>
  );
}
