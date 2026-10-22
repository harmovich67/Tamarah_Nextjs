import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Button, ConfirmDialog, DataTable, FileUploader, IconAction, Modal, PageHeader, SearchInput, SelectField, StatusToggle, SwitchRow, TextAreaField, TextField } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { useQueryParam } from '@/hooks/useQueryState';
import { resourceService } from '@/services';
import { RESOURCE_PAGES } from './configs';

/**
 * Generic admin screen for the simple Tamrna resources: searchable table, optional server-side filter, status switch,
 * extra row actions, and a modal form built from the field list in `configs.jsx`.
 */
const pair = (p, tr) => (Array.isArray(p) ? tr(p[0], p[1]) : p);
const optionLabel = (label, tr) => (String(label).includes('|') ? tr(...String(label).split('|')) : label);

/** Select options coming from another resource (e.g. the cities of a branch). */
function useOptions(field) {
  const { locale } = useT();
  const from = field.optionsFrom;
  const { data = [] } = useQuery({ queryKey: ['resource', from], queryFn: () => resourceService[from].list(), enabled: !!from });
  return from ? data.map((r) => [String(r.id), (locale === 'en' ? r.name_en || r.name_ar : r.name_ar || r.name_en) || `#${r.id}`]) : field.options || [];
}

function FieldInput({ field, control, register, errors }) {
  const { tr } = useT();
  const options = useOptions(field);
  const label = pair(field.label, tr);
  const hint = field.hint ? pair(field.hint, tr) : undefined;
  const required = field.required ? { required: tr('هذا الحقل مطلوب', 'This field is required') } : {};
  const err = (name) => errors[name]?.message;

  switch (field.type) {
    case 'bilingual':
    case 'bilingual-area': {
      const Input = field.type === 'bilingual' ? TextField : TextAreaField;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={`${label} (AR)`} dir="rtl" required={field.required} error={err(`${field.name}_ar`)} {...register(`${field.name}_ar`, required)} />
          <Input label={`${label} (EN)`} dir="ltr" error={err(`${field.name}_en`)} {...register(`${field.name}_en`)} />
        </div>
      );
    }
    case 'select':
      return (
        <SelectField label={label} required={field.required} error={err(field.name)} {...register(field.name, required)}>
          <option value="">{tr('اختر…', 'Select…')}</option>
          {options.map(([value, text]) => (
            <option key={value} value={value}>{optionLabel(text, tr)}</option>
          ))}
        </SelectField>
      );
    case 'switch':
      return <Controller control={control} name={field.name} render={({ field: f }) => <SwitchRow label={label} hint={hint} checked={!!f.value} onChange={f.onChange} />} />;
    case 'image':
      return <Controller control={control} name={field.name} render={({ field: f }) => <FileUploader label={label} value={f.value || null} onChange={f.onChange} error={err(field.name)} />} />;
    case 'images':
      return <Controller control={control} name={field.name} render={({ field: f }) => <FileUploader label={label} multiple value={f.value || []} onChange={f.onChange} error={err(field.name)} />} />;
    case 'number':
      return <TextField label={label} type="number" step={field.step || '1'} required={field.required} hint={hint} error={err(field.name)} {...register(field.name, required)} />;
    case 'textarea':
      return <TextAreaField label={label} required={field.required} hint={hint} error={err(field.name)} {...register(field.name, required)} />;
    default:
      return <TextField label={label} required={field.required} hint={hint} error={err(field.name)} {...register(field.name, required)} />;
  }
}

const blankFor = (fields) =>
  Object.fromEntries(fields.flatMap((f) => (f.type === 'bilingual' || f.type === 'bilingual-area' ? [[`${f.name}_ar`, ''], [`${f.name}_en`, '']] : [[f.name, f.type === 'switch' ? true : f.type === 'images' ? [] : f.type === 'image' ? null : '']])));

function FormDialog({ page, svc, open, row, onClose }) {
  const { tr } = useT();
  const editing = !!row;
  const { register, handleSubmit, reset, control, setError, formState: { errors } } = useForm({ defaultValues: blankFor(page.fields) });

  useEffect(() => {
    if (!open) return;
    if (!row) return reset(blankFor(page.fields));
    // The adapter needs the ids / urls of the current images to keep the ones that stay.
    const extra = {};
    page.fields.forEach((f) => {
      if (f.type === 'image') extra[`${f.name}_id`] = row[`${f.name}_id`];
      if (f.type === 'images') {
        extra[`${f.name}_ids`] = row[`${f.name}_ids`];
        extra[`${f.name}_urls`] = row[f.name];
      }
    });
    return reset({ ...blankFor(page.fields), ...Object.fromEntries(Object.entries(row).filter(([k]) => !k.startsWith('_') && row[k] !== null)), ...extra });
  }, [open, row, page, reset]);

  const save = useAdminMutation((v) => (editing ? svc.update(row.id, v) : svc.create(v)), {
    invalidate: [['resource', page.service]],
    success: tr('تم الحفظ بنجاح', 'Saved successfully'),
    onSuccess: onClose,
    onFieldErrors: (errs) => Object.entries(errs).forEach(([f, msgs]) => setError(f, { message: [].concat(msgs)[0] })),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? tr('تعديل', 'Edit') : tr('إضافة جديد', 'Add new')}
      subtitle={pair(page.title, tr)}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{tr('إلغاء', 'Cancel')}</Button>
          <Button type="submit" form={`resource-form-${page.service}`} loading={save.isPending}>{tr('حفظ', 'Save')}</Button>
        </>
      }
    >
      <form id={`resource-form-${page.service}`} noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 text-sm">
        {page.fields.map((f) => (
          <FieldInput key={f.name} field={f} control={control} register={register} errors={errors} />
        ))}
      </form>
    </Modal>
  );
}

export default function ResourcePage({ resource }) {
  const { tr, locale } = useT();
  const page = RESOURCE_PAGES[resource];
  const svc = resourceService?.[page.service];
  const [search, setSearch] = useQueryParam('q', '');
  const [filter, setFilter] = useQueryParam('f', '');
  const [dialog, setDialog] = useState({ open: false, row: null });
  const [toDelete, setToDelete] = useState(null);

  // `is_active` is a top-level list parameter; anything else travels as `filters[<name>]`.
  const params = page.filter && filter ? (page.filter.name === 'is_active' ? { is_active: filter } : { filters: { [page.filter.name]: filter } }) : undefined;
  const { data: rows = [], isLoading, error, refetch } = useQuery({ queryKey: ['resource', page.service, filter], queryFn: () => svc.list(params) });

  const invalidate = [['resource', page.service]];
  const toggle = useAdminMutation((id) => svc.toggle(id), { invalidate });
  const act = useAdminMutation(({ name, id }) => svc.action(name, id), { invalidate, success: tr('تم التنفيذ', 'Done') });
  const remove = useAdminMutation((id) => svc.remove(id), { invalidate, success: tr('تم الحذف', 'Deleted'), onSuccess: () => setToDelete(null) });

  const columns = [
    ...page.columns.map((c) => ({ key: c.key, header: pair(c.header, tr), align: c.align, hideOnMobile: c.hideOnMobile, sortValue: c.sortValue, cell: (r) => c.cell(r, { tr, locale }) })),
    ...(page.toggle
      ? [{ key: 'status', header: tr('الحالة', 'Status'), align: 'center', cell: (r) => <StatusToggle active={!!r.is_active} onToggle={() => toggle.mutate(r.id)} pending={toggle.isPending && toggle.variables === r.id} activeLabel={tr('فعّال', 'Active')} inactiveLabel={tr('متوقف', 'Stopped')} /> }]
      : []),
    {
      key: 'actions',
      header: tr('الإجراءات', 'Actions'),
      align: 'center',
      cell: (r) => (
        <div className="flex items-center justify-center gap-2">
          {(page.rowActions || []).filter((a) => !a.show || a.show(r)).map((a) => (
            <IconAction key={a.name} icon={a.icon} label={pair(a.label, tr)} tone={a.tone} onClick={() => act.mutate({ name: a.name, id: r.id })} />
          ))}
          {!page.readOnly && !page.noEdit && <IconAction icon="edit-3" label={tr('تعديل', 'Edit')} onClick={() => setDialog({ open: true, row: r })} />}
          {(!page.readOnly || page.canDelete) && <IconAction icon="trash-2" label={tr('حذف', 'Delete')} tone="danger" onClick={() => setToDelete(r)} />}
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader
        title={pair(page.title, tr)}
        subtitle={pair(page.subtitle, tr)}
        actions={!page.readOnly ? <Button icon="plus-circle" onClick={() => setDialog({ open: true, row: null })}>{tr('إضافة جديد', 'Add new')}</Button> : null}
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        search={search}
        searchText={(r) => String(page.searchText(r) || '')}
        empty={{ icon: page.icon, title: tr('لا توجد بيانات', 'Nothing here yet') }}
        toolbar={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={tr('بحث…', 'Search…')} className="w-full sm:w-72" />
            {page.filter ? (
              <SelectField className="w-full sm:w-44 [&_select]:text-xs [&_select]:py-2" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={pair(page.filter.label, tr)}>
                <option value="">{tr('الكل', 'All')}</option>
                {page.filter.options.map(([value, label]) => (
                  <option key={value} value={value}>{optionLabel(label, tr)}</option>
                ))}
              </SelectField>
            ) : null}
          </>
        }
      />

      {!page.readOnly && <FormDialog page={page} svc={svc} open={dialog.open} row={dialog.row} onClose={() => setDialog((d) => ({ ...d, open: false }))} />}
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete.id)} loading={remove.isPending} message={tr('هل أنت متأكد من الحذف؟', 'Are you sure you want to delete this?')} confirmLabel={tr('حذف', 'Delete')} />
    </div>
  );
}
