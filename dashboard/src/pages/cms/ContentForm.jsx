import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { slugify } from '@tamrna/shared/utils';
import { BTN, Button, ErrorState, FileUploader, Icon, PageLoading, SelectField, Tabs, TextAreaField, TextField, cx } from '@/components/ui';
import CustomFieldsBox, { withDefaults } from '@/components/cms/CustomFieldsBox';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { cmsService } from '@/services';
import { pageSchema } from '@/schemas';
import { config } from '@/lib/config';

const card = 'bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6';
const h2 = 'text-base font-black text-stone-900 flex items-center gap-2 pb-3 border-b border-stone-100';

/**
 * Create / edit a CMS page or post (pages/form.php + posts/form.php): titles + permalink, bilingual body with a
 * language tab, featured image, publishing, SEO (pages) and the dynamic ACF custom-field meta box.
 */
export default function ContentForm({ kind }) {
  const isPage = kind === 'page';
  const { id } = useParams();
  const editing = !!id;
  const { tr, locale, isEn, isRtl } = useT();
  const navigate = useNavigate();
  const m = (ar, en) => (locale === 'en' ? en : ar);
  const schema = useMemo(() => pageSchema(m), [locale]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = isPage ? '/pages' : '/posts';
  const [lang, setLang] = useState('ar');
  const [acf, setAcf] = useState({});

  const { data: record, isLoading, error, refetch } = useQuery({
    queryKey: [kind, id ?? 'new'],
    queryFn: () => (editing ? (isPage ? cmsService.getPage(id) : cmsService.getPost(id)) : null),
  });

  const blank = { title_ar: '', title_en: '', slug: '', content_ar: '', content_en: '', excerpt_ar: '', excerpt_en: '', meta_title_ar: '', meta_title_en: '', meta_desc_ar: '', meta_desc_en: '', status: 'published', featured_image: '', image_file: null, template: 'default', post_type: 'post' };
  const { register, handleSubmit, reset, control, watch, setValue, setError, formState: { errors, dirtyFields } } = useForm({ resolver: zodResolver(schema), defaultValues: blank });
  const postType = watch('post_type');
  const titleEn = watch('title_en');
  const titleAr = watch('title_ar');

  // Field groups matching this entity (all / id:N / type:X)
  const { data: groups = [] } = useQuery({
    queryKey: ['field-groups', kind, id ?? 'new', isPage ? null : postType],
    queryFn: () => cmsService.getFieldGroups({ entityType: kind, entityId: editing ? Number(id) : null, subType: isPage ? null : postType }),
  });

  useEffect(() => {
    if (record) {
      reset({ ...blank, ...Object.fromEntries(Object.keys(blank).map((k) => [k, record[k] ?? blank[k]])), image_file: null });
      setAcf(record.fields || {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);
  useEffect(() => setAcf((cur) => withDefaults(groups, cur)), [groups]);

  // Auto-generate the slug while the user has not typed one (creation only)
  useEffect(() => {
    if (!editing && !dirtyFields.slug) setValue('slug', slugify(titleEn || '') || '', { shouldDirty: false });
  }, [titleEn, titleAr, editing, dirtyFields.slug, setValue]);

  const save = useAdminMutation((values) => (editing ? (isPage ? cmsService.updatePage(id, values) : cmsService.updatePost(id, values)) : isPage ? cmsService.createPage(values) : cmsService.createPost(values)), {
    invalidate: [[isPage ? 'pages' : 'posts'], [kind]],
    success: isPage ? tr('تم حفظ الصفحة بنجاح', 'Page saved successfully') : tr('تم حفظ المنشور بنجاح', 'Post saved successfully'),
    onSuccess: () => navigate(base),
    onFieldErrors: (errs) => Object.entries(errs).forEach(([f, msgs]) => setError(f, { message: [].concat(msgs)[0] })),
  });

  if (editing && isLoading) return <PageLoading />;
  if (error) return <ErrorState title={tr('تعذر تحميل البيانات', 'Could not load the data')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} />;

  const onSubmit = (values) => save.mutate({ ...values, fields: acf });
  const publicUrl = record?.slug ? `${config.storefrontUrl}/${isPage ? 'page' : 'post'}/${record.slug}` : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to={base} className="p-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition" title={isPage ? tr('العودة للصفحات', 'Back to pages') : tr('العودة للمنشورات', 'Back to posts')}>
            <Icon name={isRtl ? 'arrow-right' : 'arrow-left'} className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">{editing ? (isPage ? tr('تعديل الصفحة', 'Edit page') : tr('تعديل المنشور', 'Edit post')) : isPage ? tr('إضافة صفحة جديدة', 'Add new page') : tr('إضافة منشور جديد', 'Add new post')}</h1>
            <p className="text-xs text-stone-500 mt-0.5">{editing ? (isEn ? record?.title_en : record?.title_ar) : isPage ? tr('إنشاء صفحة جديدة في المنصة وربطها بحقول ACF', 'Create a new page and link it to ACF fields') : tr('كتابة مقال أو إعلان أو سؤال شائع', 'Write an article, announcement or FAQ')}</p>
          </div>
        </div>
        {publicUrl ? (
          <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
            <Icon name="external-link" className="w-4 h-4 text-primary-700" />
            <span>{tr('عرض الصفحة', 'View page')}</span>
          </a>
        ) : null}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
        <div className={card}>
          <h2 className={h2}><Icon name="type" className="w-5 h-5 text-gold-600" /><span>{tr('العناوين والروابط الدائمة', 'Titles & permalinks')}</span></h2>
          {!isPage && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <SelectField label={tr('نوع المنشور', 'Post type')} required {...register('post_type')}>
                <option value="post">{tr('مقال في مدونة عالم التمور', 'Date blog article')}</option>
                <option value="announcement">{tr('إعلان موسم الحصاد', 'Harvest announcement')}</option>
                <option value="faq">{tr('سؤال شائع (FAQ)', 'FAQ')}</option>
              </SelectField>
              <SelectField label={tr('حالة النشر', 'Publishing status')} {...register('status')}>
                <option value="published">{tr('منشور', 'Published')}</option>
                <option value="draft">{tr('مسودة', 'Draft')}</option>
              </SelectField>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <TextField label={tr('العنوان (بالعربية)', 'Title (Arabic)')} required error={errors.title_ar?.message} {...register('title_ar')} />
            <TextField label={tr('العنوان (بالإنجليزية)', 'Title (English)')} dir="ltr" error={errors.title_en?.message} {...register('title_en')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <TextField className="sm:col-span-2" label={`${tr('الرابط الدائم', 'Permalink')} /${isPage ? 'page' : 'post'}/{slug}`} dir="ltr" inputClassName="font-mono text-xs" error={errors.slug?.message} {...register('slug')} />
            {isPage && (
              <SelectField label={tr('قالب الصفحة', 'Page template')} {...register('template')}>
                <option value="default">{tr('القالب الافتراضي', 'Default template')}</option>
                <option value="full_width">{tr('عرض كامل', 'Full width')}</option>
                <option value="blank">{tr('صفحة فارغة', 'Blank')}</option>
              </SelectField>
            )}
          </div>
        </div>

        <div className={card}>
          <h2 className={h2}><Icon name="align-left" className="w-5 h-5 text-gold-600" /><span>{tr('المحتوى الرئيسي والنصوص', 'Main content & body')}</span></h2>
          <Tabs value={lang} onChange={setLang} tabs={[{ key: 'ar', label: 'العربية' }, { key: 'en', label: 'English' }]} />
          <div className="space-y-4">
            <TextAreaField label={tr(`الملخص (${lang === 'ar' ? 'العربية' : 'الإنجليزية'})`, `Excerpt (${lang === 'ar' ? 'Arabic' : 'English'})`)} rows={2} dir={lang === 'en' ? 'ltr' : undefined} {...register(`excerpt_${lang}`)} key={`ex-${lang}`} />
            <TextAreaField label={tr(`المحتوى (${lang === 'ar' ? 'العربية' : 'الإنجليزية'})`, `Content (${lang === 'ar' ? 'Arabic' : 'English'})`)} rows={10} hint={tr('يدعم وسوم HTML الأساسية (h2, p, ul, a …).', 'Basic HTML tags are supported (h2, p, ul, a …).')} dir={lang === 'en' ? 'ltr' : undefined} inputClassName="leading-relaxed" {...register(`content_${lang}`)} key={`ct-${lang}`} />
          </div>
        </div>

        <div className={card}>
          <h2 className={h2}><Icon name="image" className="w-5 h-5 text-gold-600" /><span>{isPage ? tr('الصورة البارزة وحالة النشر', 'Featured image & publishing') : tr('الصورة البارزة', 'Featured image')}</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Controller control={control} name="image_file" render={({ field }) => <FileUploader label={tr('الصورة البارزة', 'Featured image')} value={field.value || watch('featured_image') || undefined} onChange={field.onChange} />} />
              <TextField label={tr('أو أدخل رابط صورة', 'Or enter an image URL')} dir="ltr" inputClassName="text-xs" {...register('featured_image')} />
            </div>
            {isPage && (
              <div className="space-y-4">
                <SelectField label={tr('حالة النشر', 'Publishing status')} {...register('status')}>
                  <option value="published">{tr('منشور', 'Published')}</option>
                  <option value="draft">{tr('مسودة', 'Draft')}</option>
                </SelectField>
                <TextField label={tr('عنوان SEO (عربي)', 'SEO title (Arabic)')} {...register('meta_title_ar')} />
                <TextField label={tr('عنوان SEO (English)', 'SEO title (English)')} dir="ltr" {...register('meta_title_en')} />
                <TextAreaField label={tr('وصف SEO (عربي)', 'SEO description (Arabic)')} rows={2} {...register('meta_desc_ar')} />
                <TextAreaField label={tr('وصف SEO (English)', 'SEO description (English)')} rows={2} dir="ltr" {...register('meta_desc_en')} />
              </div>
            )}
          </div>
        </div>

        <CustomFieldsBox groups={groups} values={acf} onChange={setAcf} />

        <div className="flex items-center justify-between pt-6 border-t border-slate-200/80">
          <Link to={base} className={BTN.secondary}>{tr('إلغاء', 'Cancel')}</Link>
          <Button type="submit" loading={save.isPending} icon="check" className="px-8">
            {isPage ? tr('حفظ الصفحة', 'Save page') : tr('حفظ المنشور', 'Save post')}
          </Button>
        </div>
      </form>
    </div>
  );
}
