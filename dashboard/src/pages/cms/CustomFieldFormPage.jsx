import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Button, CheckField, ErrorState, Icon, PageLoading, SelectField, TextAreaField, TextField, INPUT_SM, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { cmsService } from '@/services';

const card = 'bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6';
const FIELD_TYPES = [
  ['text', 'نص عادي (Text)', 'Text'], ['textarea', 'نص متعدد الأسطر (Textarea)', 'Textarea'], ['wysiwyg', 'محرر غني (WYSIWYG HTML)', 'Rich HTML'], ['number', 'رقمي (Number)', 'Number'],
  ['image', 'رفع صورة (Image)', 'Image upload'], ['color', 'منتقي ألوان (Color)', 'Color'], ['icon', '🎨 أيقونة (Icon)', 'Icon'], ['boolean', 'مفتاح نعم/لا (Boolean Switch)', 'Boolean switch'],
  ['select', 'قائمة خيارات (Select)', 'Select list'], ['repeater', '🌟 حقل مكرر تفاعلي (Repeater)', 'Repeater'],
];
const SUB_TYPES = FIELD_TYPES.filter(([k]) => ['text', 'textarea', 'image', 'wysiwyg', 'number', 'color', 'boolean'].includes(k));
const BLANK_FIELD = { label_ar: '', label_en: '', name: '', type: 'text', default_value: '', required: false, instructions_ar: '', instructions_en: '', options: '', sub_fields: [] };
const slug = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function SubFields({ control, register, index, tr }) {
  const { fields, append, remove } = useFieldArray({ control, name: `fields.${index}.sub_fields` });
  return (
    <div className="p-4 rounded-2xl bg-[#faf8f3] border border-stone-200 space-y-3">
      <p className="text-xs font-black text-stone-800">{tr('الحقول الفرعية لكل صف', 'Sub-fields of each row')}</p>
      {fields.map((sf, i) => (
        <div key={sf.id} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end bg-white p-3 rounded-xl border border-stone-200">
          <div><label className="block text-[10px] font-bold text-stone-600 mb-1">{tr('التسمية (عربي) *', 'Label (AR) *')}</label><input className={INPUT_SM} {...register(`fields.${index}.sub_fields.${i}.label_ar`)} /></div>
          <div><label className="block text-[10px] font-bold text-stone-600 mb-1">{tr('التسمية (إنجليزي)', 'Label (EN)')}</label><input className={INPUT_SM} dir="ltr" {...register(`fields.${index}.sub_fields.${i}.label_en`)} /></div>
          <div><label className="block text-[10px] font-bold text-stone-600 mb-1">{tr('المفتاح (Key) *', 'Key *')}</label><input className={cx(INPUT_SM, 'font-mono')} dir="ltr" {...register(`fields.${index}.sub_fields.${i}.name`)} /></div>
          <div>
            <label className="block text-[10px] font-bold text-stone-600 mb-1">{tr('النوع', 'Type')}</label>
            <select className={INPUT_SM} {...register(`fields.${index}.sub_fields.${i}.type`)}>
              {SUB_TYPES.map(([k, ar, en]) => <option key={k} value={k}>{tr(ar, en)}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => remove(i)} className="text-xs text-rose-500 hover:text-rose-700 font-bold py-2">{tr('حذف', 'Remove')}</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ label_ar: '', label_en: '', name: '', type: 'text' })} className="text-xs font-bold text-primary-700 hover:underline inline-flex items-center gap-1"><Icon name="plus" className="w-3.5 h-3.5" />{tr('إضافة حقل فرعي', 'Add sub-field')}</button>
    </div>
  );
}

/** Field group builder (resources/views/admin/custom_fields/form.php). */
export default function CustomFieldFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const { tr, isRtl, isEn } = useT();
  const navigate = useNavigate();
  const { data: group, isLoading, error, refetch } = useQuery({ queryKey: ['custom-field', id ?? 'new'], queryFn: () => (editing ? cmsService.getCustomFieldGroup(id) : null) });
  const { register, control, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm({
    defaultValues: { title_ar: '', title_en: '', key_name: '', target_type: 'page', target_filter: 'all', position: 'normal', order_index: 0, status: 'active', fields: [] },
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'fields' });
  const watched = useWatch({ control, name: 'fields' });
  const targetType = useWatch({ control, name: 'target_type' });
  const targetFilter = useWatch({ control, name: 'target_filter' });

  const { data: targets = [] } = useQuery({ queryKey: ['cf-targets', targetType], queryFn: () => cmsService.getCustomFieldTargets(targetType) });

  useEffect(() => {
    if (!group) return;
    reset({
      title_ar: group.title_ar, title_en: group.title_en, key_name: group.key_name, target_type: group.target_type, target_filter: group.target_filter, position: group.position, order_index: group.order_index, status: group.status,
      fields: (group.fields || []).map((f) => ({
        ...f,
        required: !!f.required,
        options: f.type === 'select' && f.options ? JSON.stringify(f.options) : '',
        sub_fields: f.type === 'repeater' && Array.isArray(f.options) ? f.options : [],
      })),
    });
  }, [group, reset]);

  // keep the selected filter valid for the chosen target type
  useEffect(() => {
    if (targets.length && !targets.some((t) => t.value === targetFilter)) setValue('target_filter', 'all');
  }, [targets, targetFilter, setValue]);

  const save = useAdminMutation((v) => (editing ? cmsService.updateCustomFieldGroup(id, v) : cmsService.createCustomFieldGroup(v)), {
    invalidate: [['custom-fields'], ['custom-field'], ['field-groups']],
    success: tr('تم حفظ مجموعة الحقول بنجاح!', 'Field group saved successfully!'),
    onSuccess: () => navigate('/custom-fields'),
    onFieldErrors: (errs) => Object.entries(errs).forEach(([f, msgs]) => setError(f, { message: [].concat(msgs)[0] })),
  });

  if (editing && isLoading) return <PageLoading />;
  if (error) return <ErrorState title={tr('تعذر تحميل المجموعة', 'Could not load the group')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} />;

  const grouped = targets.reduce((acc, t) => { const g = t.group ? t.group[isEn ? 1 : 0] : ''; (acc[g] ||= []).push(t); return acc; }, {});

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-3 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <Link to="/custom-fields" className="p-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition" aria-label={tr('رجوع', 'Back')}><Icon name={isRtl ? 'arrow-right' : 'arrow-left'} className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">{editing ? tr('تعديل مجموعة حقول', 'Edit field group') : tr('مجموعة حقول جديدة', 'New field group')}</h1>
          <p className="text-xs text-stone-500 mt-0.5">{tr('صمّم حقولاً إضافية تظهر في نماذج الإدارة وتُقرأ في المتجر عبر get_field()', 'Design extra fields that appear in admin forms and are read on the storefront via get_field()')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="space-y-8">
        <div className={card}>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100"><Icon name="folder-code" className="w-5 h-5 text-gold-600" />{tr('بيانات المجموعة', 'Group details')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <TextField label={tr('اسم المجموعة (عربي)', 'Group name (Arabic)')} required error={errors.title_ar?.message} {...register('title_ar')} />
            <TextField label={tr('اسم المجموعة (English)', 'Group name (English)')} dir="ltr" {...register('title_en')} />
            <TextField label={tr('المفتاح البرمجي للمجموعة', 'Group key')} dir="ltr" inputClassName="font-mono text-xs" placeholder="group_homepage" {...register('key_name')} />
            <SelectField label={tr('الموضع', 'Position')} {...register('position')}>
              <option value="normal">{tr('عادي', 'Normal')}</option>
              <option value="side">{tr('جانبي', 'Side')}</option>
            </SelectField>
            <SelectField label={tr('تظهر في', 'Show on')} {...register('target_type')}>
              <option value="page">{tr('الصفحات', 'Pages')}</option>
              <option value="post">{tr('المنشورات', 'Posts')}</option>
              <option value="product">{tr('المنتجات', 'Products')}</option>
              <option value="category">{tr('أصناف التمور (Category)', 'Date categories')}</option>
            </SelectField>
            <SelectField label={tr('النطاق', 'Scope')} {...register('target_filter')}>
              {Object.entries(grouped).map(([g, items]) =>
                g ? (
                  <optgroup key={g} label={g}>{items.map((t) => <option key={t.value} value={t.value}>{t.label[isEn ? 1 : 0]}</option>)}</optgroup>
                ) : (
                  items.map((t) => <option key={t.value} value={t.value}>{t.label[isEn ? 1 : 0]}</option>)
                ),
              )}
            </SelectField>
            <TextField label={tr('الترتيب', 'Order')} type="number" {...register('order_index')} />
            <SelectField label={tr('الحالة', 'Status')} {...register('status')}>
              <option value="active">{tr('مفعّلة', 'Active')}</option>
              <option value="inactive">{tr('معطّلة', 'Inactive')}</option>
            </SelectField>
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2"><Icon name="list-plus" className="w-5 h-5 text-gold-600" />{tr('منشئ الحقول', 'Fields builder')}</h2>
            <Button variant="outline" icon="plus" onClick={() => append({ ...BLANK_FIELD })}>{tr('إضافة حقل', 'Add field')}</Button>
          </div>

          {!fields.length && <p className="text-center text-xs text-slate-400 py-6">{tr('لا توجد حقول بعد. أضف أول حقل.', 'No fields yet. Add your first field.')}</p>}

          {fields.map((f, i) => {
            const type = watched?.[i]?.type;
            return (
              <div key={f.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-primary-700">#{i + 1} · <code dir="ltr" className="font-mono text-slate-500">get_field('{watched?.[i]?.name || 'name'}')</code></span>
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} className="p-1.5 rounded-lg hover:bg-stone-200 disabled:opacity-30" aria-label={tr('أعلى', 'Move up')}><Icon name="arrow-up" className="w-4 h-4" /></button>
                    <button type="button" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)} className="p-1.5 rounded-lg hover:bg-stone-200 disabled:opacity-30" aria-label={tr('أسفل', 'Move down')}><Icon name="arrow-down" className="w-4 h-4" /></button>
                    <button type="button" onClick={() => remove(i)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50" aria-label={tr('حذف الحقل', 'Delete field')}><Icon name="trash-2" className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <TextField label={`${tr('تسمية الحقل (عربي)', 'Label (Arabic)')} *`} {...register(`fields.${i}.label_ar`)} />
                  <TextField label={`${tr('تسمية الحقل (English)', 'Label (English)')} *`} dir="ltr" {...register(`fields.${i}.label_en`, { onBlur: (e) => !watched?.[i]?.name && setValue(`fields.${i}.name`, slug(e.target.value)) })} />
                  <TextField label={`${tr('المفتاح البرمجي', 'Field key')} *`} dir="ltr" inputClassName="font-mono text-xs" {...register(`fields.${i}.name`, { setValueAs: slug })} />
                  <SelectField label={tr('نوع الحقل', 'Field type')} {...register(`fields.${i}.type`)}>
                    {FIELD_TYPES.map(([k, ar, en]) => <option key={k} value={k}>{tr(ar, en)}</option>)}
                  </SelectField>
                  <TextField label={tr('القيمة الافتراضية', 'Default value')} {...register(`fields.${i}.default_value`)} />
                  <div className="flex items-end pb-2"><CheckField label={tr('حقل مطلوب', 'Required')} {...register(`fields.${i}.required`)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField label={tr('تعليمات (عربي)', 'Instructions (Arabic)')} {...register(`fields.${i}.instructions_ar`)} />
                  <TextField label={tr('تعليمات (English)', 'Instructions (English)')} dir="ltr" {...register(`fields.${i}.instructions_en`)} />
                </div>
                {type === 'select' && (
                  <TextAreaField label={tr('خيارات القائمة المنسدلة (JSON)', 'Select options (JSON)')} rows={2} dir="ltr" inputClassName="font-mono text-xs" placeholder='{"opt1": "الخيار الأول", "opt2": "الخيار الثاني"}' {...register(`fields.${i}.options`)} />
                )}
                {type === 'repeater' && <SubFields control={control} register={register} index={i} tr={tr} />}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-stone-200">
          <Link to="/custom-fields" className="px-6 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-bold transition">{tr('إلغاء', 'Cancel')}</Link>
          <Button type="submit" loading={save.isPending} icon="check" className="!px-8 !py-3.5 !rounded-2xl !font-black">{tr('حفظ المجموعة', 'Save group')}</Button>
        </div>
      </form>
    </div>
  );
}
