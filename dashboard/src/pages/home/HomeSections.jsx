import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Alert, Button, ConfirmDialog, EmptyState, ErrorState, FileUploader, Icon, Modal, SelectField, Skeleton, StatusToggle, Tabs, TextAreaField, TextField, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { useQueryParam } from '@/hooks/useQueryState';
import { homeService } from '@/services';
import { assetSrc } from '../products/ProductsPage';
import { config } from '@/lib/config';

const FEATURE_ICONS = ['truck', 'award', 'gift', 'store', 'shield-check', 'leaf', 'heart', 'star', 'tree-palm', 'package', 'snowflake', 'headphones', 'badge-check'];
const SECTION_LABEL = { hero: ['السلايدر الرئيسي', 'Hero slider'], categories: ['أقسام التمور', 'Categories'], featured_products: ['المنتجات المميزة', 'Featured products'], preorder: ['الحجز المسبق', 'Pre-order banner'], features: ['مميزات تمرنا', 'Why Tamrna'], testimonials: ['آراء العملاء', 'Testimonials'], newsletter: ['النشرة البريدية', 'Newsletter'] };

const dir = (en) => (en ? { dir: 'ltr' } : {});

/** Generic content editor for categories / featured / preorder / custom sections (updateSection). */
function GenericDialog({ section, onClose }) {
  const { tr } = useT();
  const open = !!section;
  const custom = !!section?.is_custom;
  const { register, handleSubmit, reset, control } = useForm({ defaultValues: {} });
  useEffect(() => {
    if (section) reset({ badge_ar: section.badge_ar || '', badge_en: section.badge_en || '', title_ar: section.title_ar || '', title_en: section.title_en || '', subtitle_ar: section.subtitle_ar || '', subtitle_en: section.subtitle_en || '', button_text_ar: section.button_text_ar || '', button_text_en: section.button_text_en || '', button_url: section.button_url || '', style: section.style || 'default', content_ar: section.custom_content_ar || '', content_en: section.custom_content_en || '', image_url: section.image || '', image_file: null });
  }, [section, reset]);
  const save = useAdminMutation((v) => homeService.updateSection(section.id, v), { invalidate: [['home']], success: tr('تم حفظ محتوى القسم بنجاح!', 'Section content saved!'), onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} size="lg" title={tr('تعديل محتوى القسم', 'Edit section content')} footer={<><Button variant="secondary" onClick={onClose}>{tr('إلغاء', 'Cancel')}</Button><Button type="submit" form="generic-form" loading={save.isPending}>{tr('حفظ', 'Save')}</Button></>}>
      <form id="generic-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={tr('الشارة (عربي)', 'Badge (Arabic)')} {...register('badge_ar')} />
          <TextField label={tr('الشارة (English)', 'Badge (English)')} {...dir(true)} {...register('badge_en')} />
          <TextField label={tr('العنوان (عربي)', 'Title (Arabic)')} required {...register('title_ar')} />
          <TextField label={tr('العنوان (English)', 'Title (English)')} {...dir(true)} {...register('title_en')} />
          <TextAreaField label={tr('العنوان الفرعي (عربي)', 'Subtitle (Arabic)')} {...register('subtitle_ar')} />
          <TextAreaField label={tr('العنوان الفرعي (English)', 'Subtitle (English)')} {...dir(true)} {...register('subtitle_en')} />
          <TextField label={tr('نص الزر (عربي)', 'Button text (Arabic)')} {...register('button_text_ar')} />
          <TextField label={tr('نص الزر (English)', 'Button text (English)')} {...dir(true)} {...register('button_text_en')} />
          <TextField className="sm:col-span-2" label={tr('رابط الزر', 'Button URL')} {...dir(true)} inputClassName="font-mono" {...register('button_url')} />
        </div>
        {custom && (
          <>
            <SelectField label={tr('نمط العرض', 'Layout style')} {...register('style')}>
              <option value="default">{tr('افتراضي', 'Default')}</option>
              <option value="centered">{tr('وسط', 'Centered')}</option>
              <option value="image_first">{tr('صورة أولاً', 'Image first')}</option>
              <option value="banner_cta">{tr('بانر دعوة لإجراء', 'CTA banner')}</option>
            </SelectField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextAreaField label={tr('المحتوى (عربي)', 'Content (Arabic)')} rows={4} {...register('content_ar')} />
              <TextAreaField label={tr('المحتوى (English)', 'Content (English)')} rows={4} {...dir(true)} {...register('content_en')} />
            </div>
          </>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <Controller control={control} name="image_file" render={({ field }) => <FileUploader label={tr('صورة القسم', 'Section image')} value={field.value || section?.image || undefined} onChange={field.onChange} />} />
          <TextField label={tr('أو مسار الصورة', 'Or image path')} {...dir(true)} inputClassName="text-xs" {...register('image_url')} />
        </div>
      </form>
    </Modal>
  );
}

function FeaturesDialog({ section, onClose }) {
  const { tr } = useT();
  const { register, handleSubmit, reset, control } = useForm({ defaultValues: { cards: [] } });
  const { fields, append, remove } = useFieldArray({ control, name: 'cards' });
  useEffect(() => {
    if (section) reset({ badge_ar: section.badge_ar || 'الجودة السعودية الخالصة', badge_en: section.badge_en || 'Pure Saudi Quality', title_ar: section.title_ar || 'لماذا يختار عملاؤنا تمرنا؟', title_en: section.title_en || 'Why Our Customers Choose Tumurna', cards: section.settings?.cards || [] });
  }, [section, reset]);
  const save = useAdminMutation((v) => homeService.updateFeatures(section.id, v), { invalidate: [['home']], success: tr('تم حفظ المميزات بنجاح!', 'Features saved!'), onSuccess: onClose });
  return (
    <Modal open={!!section} onClose={onClose} size="lg" title={tr('تعديل مميزات تمرنا', 'Edit "Why Tamrna" features')} footer={<><Button variant="secondary" onClick={onClose}>{tr('إلغاء', 'Cancel')}</Button><Button type="submit" form="features-form" loading={save.isPending}>{tr('حفظ', 'Save')}</Button></>}>
      <form id="features-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={tr('الشارة (عربي)', 'Badge (Arabic)')} {...register('badge_ar')} />
          <TextField label={tr('الشارة (English)', 'Badge (English)')} {...dir(true)} {...register('badge_en')} />
          <TextField label={tr('العنوان (عربي)', 'Title (Arabic)')} {...register('title_ar')} />
          <TextField label={tr('العنوان (English)', 'Title (English)')} {...dir(true)} {...register('title_en')} />
        </div>
        <div className="flex items-center justify-between"><h4 className="font-black text-stone-900 text-sm">{tr('بطاقات المميزات', 'Feature cards')}</h4><Button variant="outline" icon="plus" disabled={fields.length >= 5} onClick={() => append({ icon: 'award', title_ar: '', title_en: '', desc_ar: '', desc_en: '' })}>{tr('إضافة بطاقة', 'Add card')}</Button></div>
        {fields.map((f, i) => (
          <div key={f.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between"><span className="text-xs font-black text-primary-700">#{i + 1}</span><button type="button" onClick={() => remove(i)} className="text-xs text-rose-500 font-bold">{tr('حذف', 'Remove')}</button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField label={tr('الأيقونة', 'Icon')} {...register(`cards.${i}.icon`)}>{FEATURE_ICONS.map((n) => <option key={n} value={n}>{n}</option>)}</SelectField>
              <span />
              <TextField label={tr('العنوان (عربي)', 'Title (Arabic)')} {...register(`cards.${i}.title_ar`)} />
              <TextField label={tr('العنوان (English)', 'Title (English)')} {...dir(true)} {...register(`cards.${i}.title_en`)} />
              <TextAreaField label={tr('الوصف (عربي)', 'Description (Arabic)')} rows={2} {...register(`cards.${i}.desc_ar`)} />
              <TextAreaField label={tr('الوصف (English)', 'Description (English)')} rows={2} {...dir(true)} {...register(`cards.${i}.desc_en`)} />
            </div>
          </div>
        ))}
      </form>
    </Modal>
  );
}

function TestimonialsDialog({ section, onClose }) {
  const { tr } = useT();
  const { register, handleSubmit, reset, control } = useForm({ defaultValues: { reviews: [] } });
  const { fields, append, remove } = useFieldArray({ control, name: 'reviews' });
  useEffect(() => {
    if (section) reset({ badge_ar: section.badge_ar || 'تجارب حقيقية', badge_en: section.badge_en || 'Real Experiences', title_ar: section.title_ar || 'ماذا يقول عملاؤنا عن تمورنا؟', title_en: section.title_en || 'What Customers Say About Our Dates', reviews: section.settings?.reviews || [] });
  }, [section, reset]);
  const save = useAdminMutation((v) => homeService.updateTestimonials(section.id, v), { invalidate: [['home']], success: tr('تم حفظ آراء العملاء بنجاح!', 'Testimonials saved!'), onSuccess: onClose });
  return (
    <Modal open={!!section} onClose={onClose} size="xl" title={tr('تعديل آراء العملاء', 'Edit customer testimonials')} footer={<><Button variant="secondary" onClick={onClose}>{tr('إلغاء', 'Cancel')}</Button><Button type="submit" form="testimonials-form" loading={save.isPending}>{tr('حفظ', 'Save')}</Button></>}>
      <form id="testimonials-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={tr('الشارة (عربي)', 'Badge (Arabic)')} {...register('badge_ar')} />
          <TextField label={tr('الشارة (English)', 'Badge (English)')} {...dir(true)} {...register('badge_en')} />
          <TextField label={tr('العنوان (عربي)', 'Title (Arabic)')} {...register('title_ar')} />
          <TextField label={tr('العنوان (English)', 'Title (English)')} {...dir(true)} {...register('title_en')} />
        </div>
        <div className="flex items-center justify-between"><h4 className="font-black text-stone-900 text-sm">{tr('الآراء', 'Reviews')}</h4><Button variant="outline" icon="plus" onClick={() => append({ name: '', name_en: '', city: 'الرياض', city_en: 'Riyadh', rating: 5, comment: '', comment_en: '', product_name: '', product_name_en: '' })}>{tr('إضافة رأي', 'Add review')}</Button></div>
        {fields.map((f, i) => (
          <div key={f.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between"><span className="text-xs font-black text-primary-700">#{i + 1}</span><button type="button" onClick={() => remove(i)} className="text-xs text-rose-500 font-bold">{tr('حذف', 'Remove')}</button></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TextField label={tr('الاسم (عربي)', 'Name (Arabic)')} {...register(`reviews.${i}.name`)} />
              <TextField label={tr('الاسم (English)', 'Name (English)')} {...dir(true)} {...register(`reviews.${i}.name_en`)} />
              <SelectField label={tr('التقييم', 'Rating')} {...register(`reviews.${i}.rating`)}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</SelectField>
              <TextField label={tr('المدينة (عربي)', 'City (Arabic)')} {...register(`reviews.${i}.city`)} />
              <TextField label={tr('المدينة (English)', 'City (English)')} {...dir(true)} {...register(`reviews.${i}.city_en`)} />
              <span />
              <TextField label={tr('المنتج (عربي)', 'Product (Arabic)')} {...register(`reviews.${i}.product_name`)} />
              <TextField label={tr('المنتج (English)', 'Product (English)')} {...dir(true)} {...register(`reviews.${i}.product_name_en`)} />
              <span />
              <TextAreaField label={tr('التعليق (عربي)', 'Comment (Arabic)')} rows={2} className="sm:col-span-3" {...register(`reviews.${i}.comment`)} />
              <TextAreaField label={tr('التعليق (English)', 'Comment (English)')} rows={2} className="sm:col-span-3" {...dir(true)} {...register(`reviews.${i}.comment_en`)} />
            </div>
          </div>
        ))}
      </form>
    </Modal>
  );
}

function NewsletterDialog({ section, onClose }) {
  const { tr } = useT();
  const { register, handleSubmit, reset } = useForm({ defaultValues: {} });
  useEffect(() => {
    if (section) reset({ badge_ar: section.badge_ar || '', badge_en: section.badge_en || '', title_ar: section.title_ar || '', title_en: section.title_en || '', subtitle_ar: section.subtitle_ar || '', subtitle_en: section.subtitle_en || '', coupon_code: section.settings?.coupon_code || 'TAMRNA10', discount_percent: section.settings?.discount_percent || '10', button_text_ar: section.button_text_ar || '', button_text_en: section.button_text_en || '' });
  }, [section, reset]);
  const save = useAdminMutation((v) => homeService.updateNewsletter(section.id, v), { invalidate: [['home']], success: tr('تم حفظ إعدادات النشرة البريدية!', 'Newsletter settings saved!'), onSuccess: onClose });
  return (
    <Modal open={!!section} onClose={onClose} size="lg" title={tr('تعديل النشرة البريدية', 'Edit newsletter')} footer={<><Button variant="secondary" onClick={onClose}>{tr('إلغاء', 'Cancel')}</Button><Button type="submit" form="newsletter-form" loading={save.isPending}>{tr('حفظ', 'Save')}</Button></>}>
      <form id="newsletter-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <TextField label={tr('الشارة (عربي)', 'Badge (Arabic)')} {...register('badge_ar')} />
        <TextField label={tr('الشارة (English)', 'Badge (English)')} {...dir(true)} {...register('badge_en')} />
        <TextField label={tr('العنوان (عربي)', 'Title (Arabic)')} required {...register('title_ar')} />
        <TextField label={tr('العنوان (English)', 'Title (English)')} {...dir(true)} {...register('title_en')} />
        <TextAreaField label={tr('الوصف (عربي)', 'Description (Arabic)')} {...register('subtitle_ar')} />
        <TextAreaField label={tr('الوصف (English)', 'Description (English)')} {...dir(true)} {...register('subtitle_en')} />
        <TextField label={tr('كود الخصم المُرسل', 'Welcome coupon code')} {...dir(true)} inputClassName="font-mono" {...register('coupon_code')} />
        <TextField label={tr('نسبة الخصم %', 'Discount %')} {...dir(true)} {...register('discount_percent')} />
        <TextField label={tr('نص الزر (عربي)', 'Button text (Arabic)')} {...register('button_text_ar')} />
        <TextField label={tr('نص الزر (English)', 'Button text (English)')} {...dir(true)} {...register('button_text_en')} />
      </form>
    </Modal>
  );
}

function CustomDialog({ open, onClose }) {
  const { tr } = useT();
  const { register, handleSubmit, reset, control, setError, formState: { errors } } = useForm({ defaultValues: { style: 'centered' } });
  useEffect(() => { if (open) reset({ style: 'centered', title_ar: '', title_en: '', subtitle_ar: '', subtitle_en: '', content_ar: '', content_en: '', button_text_ar: '', button_text_en: '', button_url: '', image_file: null }); }, [open, reset]);
  const save = useAdminMutation((v) => homeService.createCustomSection(v), { invalidate: [['home']], success: tr('تمت إضافة القسم بنجاح!', 'Section added!'), onSuccess: onClose, onFieldErrors: (errs) => Object.entries(errs).forEach(([f, m]) => setError(f, { message: [].concat(m)[0] })) });
  return (
    <Modal open={open} onClose={onClose} size="lg" title={tr('إضافة قسم مخصص', 'Add a custom section')} footer={<><Button variant="secondary" onClick={onClose}>{tr('إلغاء', 'Cancel')}</Button><Button type="submit" form="custom-form" loading={save.isPending}>{tr('إضافة القسم', 'Add section')}</Button></>}>
      <form id="custom-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 text-sm">
        <SelectField label={tr('نمط العرض', 'Layout style')} {...register('style')}>
          <option value="centered">{tr('وسط', 'Centered')}</option>
          <option value="default">{tr('افتراضي', 'Default')}</option>
          <option value="image_first">{tr('صورة أولاً', 'Image first')}</option>
          <option value="banner_cta">{tr('بانر دعوة لإجراء', 'CTA banner')}</option>
        </SelectField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={tr('العنوان (عربي)', 'Title (Arabic)')} required error={errors.title_ar?.message} placeholder="قصة حصاد النخيل الملكي" {...register('title_ar')} />
          <TextField label={tr('العنوان (English)', 'Title (English)')} {...dir(true)} {...register('title_en')} />
          <TextField label={tr('العنوان الفرعي (عربي)', 'Subtitle (Arabic)')} {...register('subtitle_ar')} />
          <TextField label={tr('العنوان الفرعي (English)', 'Subtitle (English)')} {...dir(true)} {...register('subtitle_en')} />
          <TextAreaField label={tr('المحتوى (عربي)', 'Content (Arabic)')} rows={3} {...register('content_ar')} />
          <TextAreaField label={tr('المحتوى (English)', 'Content (English)')} rows={3} {...dir(true)} {...register('content_en')} />
          <TextField label={tr('نص الزر (عربي)', 'Button text (Arabic)')} {...register('button_text_ar')} />
          <TextField label={tr('نص الزر (English)', 'Button text (English)')} {...dir(true)} {...register('button_text_en')} />
          <TextField className="sm:col-span-2" label={tr('رابط الزر', 'Button URL')} {...dir(true)} inputClassName="font-mono" placeholder="/about" {...register('button_url')} />
        </div>
        <Controller control={control} name="image_file" render={({ field }) => <FileUploader label={tr('صورة القسم', 'Section image')} value={field.value || undefined} onChange={field.onChange} />} />
      </form>
    </Modal>
  );
}

const isLaravel = config.apiMode === 'laravel';
const PLACEMENTS = [['home', 'الرئيسية', 'Home'], ['department', 'الأقسام', 'Departments'], ['gift_card', 'بطاقات الهدايا', 'Gift cards'], ['about', 'من نحن', 'About'], ['contact', 'تواصل معنا', 'Contact']];

function BannerDialog({ open, banner, onClose }) {
  const { tr } = useT();
  const editing = !!banner;
  const blank = { badge_ar: '', badge_en: '', title_ar: '', title_en: '', subtitle_ar: '', subtitle_en: '', cta_ar: 'تسوق الآن', cta_en: 'Shop Now', link: '/catalog', image_url: '', image_file: null, placement: 'home', is_active: true, sort_order: '', image_id: '' };
  const { register, handleSubmit, reset, control, setError, formState: { errors } } = useForm({ defaultValues: blank });
  useEffect(() => {
    if (open) reset(banner ? { ...blank, ...Object.fromEntries(Object.keys(blank).map((k) => [k, banner[k] ?? blank[k]])), image_url: banner.image || '', image_file: null } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, banner]);
  const save = useAdminMutation((v) => (editing ? homeService.updateBanner(banner.id, v) : homeService.createBanner(v)), { invalidate: [['home']], success: tr('تم حفظ الشريحة بنجاح!', 'Slide saved!'), onSuccess: onClose, onFieldErrors: (errs) => Object.entries(errs).forEach(([f, m]) => setError(f, { message: [].concat(m)[0] })) });
  return (
    <Modal open={open} onClose={onClose} size="lg" title={editing ? tr('تعديل شريحة السلايدر', 'Edit slider slide') : tr('إضافة شريحة جديدة', 'Add a new slide')} footer={<><Button variant="secondary" onClick={onClose}>{tr('إلغاء', 'Cancel')}</Button><Button type="submit" form="banner-form" loading={save.isPending}>{tr('حفظ الشريحة', 'Save slide')}</Button></>}>
      <form id="banner-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={tr('الشارة (عربي)', 'Badge (Arabic)')} {...register('badge_ar')} />
          <TextField label={tr('الشارة (English)', 'Badge (English)')} {...dir(true)} {...register('badge_en')} />
          <TextField label={tr('العنوان (عربي)', 'Title (Arabic)')} required error={errors.title_ar?.message} {...register('title_ar')} />
          <TextField label={tr('العنوان (English)', 'Title (English)')} {...dir(true)} {...register('title_en')} />
          <TextAreaField label={tr('الوصف (عربي)', 'Subtitle (Arabic)')} {...register('subtitle_ar')} />
          <TextAreaField label={tr('الوصف (English)', 'Subtitle (English)')} {...dir(true)} {...register('subtitle_en')} />
          {isLaravel ? (
            <SelectField className="sm:col-span-2" label={tr('مكان العرض', 'Placement')} {...register('placement')}>
              {PLACEMENTS.map(([value, ar, en]) => <option key={value} value={value}>{tr(ar, en)}</option>)}
            </SelectField>
          ) : (
            <>
              <TextField label={tr('نص الزر (عربي)', 'Button (Arabic)')} {...register('cta_ar')} />
              <TextField label={tr('نص الزر (English)', 'Button (English)')} {...dir(true)} {...register('cta_en')} />
              <TextField className="sm:col-span-2" label={tr('رابط الزر', 'Button link')} {...dir(true)} inputClassName="font-mono" {...register('link')} />
            </>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <Controller control={control} name="image_file" render={({ field }) => <FileUploader label={tr('صورة الشريحة', 'Slide image')} value={field.value || banner?.image || undefined} onChange={field.onChange} maxSizeMB={8} error={errors.image_file?.message} />} />
          {!isLaravel && <TextField label={tr('أو مسار الصورة', 'Or image path')} {...dir(true)} inputClassName="text-xs" {...register('image_url')} />}
        </div>
      </form>
    </Modal>
  );
}

/** Reorder buttons (up / down). */
function Reorder({ onMove, first, last, pending }) {
  const { tr } = useT();
  const b = 'w-8 h-8 rounded-lg flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-600 disabled:opacity-30';
  return (
    <div className="flex flex-col gap-1">
      <button type="button" className={b} disabled={first || pending} onClick={() => onMove('up')} aria-label={tr('تحريك لأعلى', 'Move up')}><Icon name="arrow-up" className="w-4 h-4" /></button>
      <button type="button" className={b} disabled={last || pending} onClick={() => onMove('down')} aria-label={tr('تحريك لأسفل', 'Move down')}><Icon name="arrow-down" className="w-4 h-4" /></button>
    </div>
  );
}

/** Homepage sections + hero slider management (resources/views/admin/home_sections.php). */
export default function HomeSections() {
  const { t, tr, isEn } = useT();
  const [tabParam, setTab] = useQueryParam('tab', 'sections');
  // Production: the backend serves the hero slides only; the other homepage blocks read Features / Reviews / Gift cards.
  const tab = isLaravel ? 'banners' : tabParam;
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['home'], queryFn: () => homeService.getHomeContent() });
  const [editing, setEditing] = useState({ kind: null, section: null });
  const [customOpen, setCustomOpen] = useState(false);
  const [bannerDialog, setBannerDialog] = useState({ open: false, banner: null });
  const [toDelete, setToDelete] = useState(null);

  const inv = { invalidate: [['home']] };
  const toggleSection = useAdminMutation((id) => homeService.toggleSection(id), inv);
  const moveSection = useAdminMutation((v) => homeService.moveSection(v), inv);
  const deleteSection = useAdminMutation((id) => homeService.deleteCustomSection(id), { ...inv, success: tr('تم حذف القسم', 'Section deleted'), onSuccess: () => setToDelete(null) });
  const toggleBanner = useAdminMutation((id) => homeService.toggleBanner(id), inv);
  const moveBanner = useAdminMutation((v) => homeService.moveBanner(v), inv);
  const deleteBanner = useAdminMutation((id) => homeService.deleteBanner(id), { ...inv, success: tr('تم حذف الشريحة', 'Slide deleted'), onSuccess: () => setToDelete(null) });

  const openEdit = (s) => {
    const kind = s.section_key === 'features' ? 'features' : s.section_key === 'testimonials' ? 'testimonials' : s.section_key === 'newsletter' ? 'newsletter' : 'generic';
    setEditing({ kind, section: s });
  };
  const closeEdit = () => setEditing({ kind: null, section: null });
  const sections = data?.sections || [];
  const banners = data?.banners || [];

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center shadow-xs"><Icon name="layout-panel-top" className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{t('home_sections_management')}</h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">{t('home_sections_subtitle')}</p>
          </div>
        </div>
        {tab === 'sections' ? (
          <Button icon="plus-circle" onClick={() => setCustomOpen(true)}>{tr('إضافة قسم مخصص', 'Add custom section')}</Button>
        ) : (
          <Button icon="plus-circle" onClick={() => setBannerDialog({ open: true, banner: null })}>{tr('إضافة شريحة', 'Add slide')}</Button>
        )}
      </div>

      {isLaravel ? (
        <Alert type="info">
          {tr(
            'شرائح السلايدر تظهر في أعلى الصفحة الرئيسية. شريط المميزات من شاشة «المميزات» (النوع home)، وآراء العملاء من «التقييمات»، و«الأكثر طلباً» تلقائي من الطلبات.',
            'Slides appear at the top of the homepage. The benefits strip comes from the Features screen (type home), customer reviews from Reviews, and "Most ordered" is automatic from orders.',
          )}
        </Alert>
      ) : (
        <Tabs value={tab} onChange={setTab} tabs={[{ key: 'sections', label: tr('أقسام الصفحة الرئيسية', 'Homepage sections'), icon: 'boxes', count: sections.length }, { key: 'banners', label: tr('شرائح السلايدر', 'Hero slides'), icon: 'sparkles', count: banners.length }]} />
      )}

      {error ? <ErrorState title={tr('تعذر تحميل المحتوى', 'Could not load the content')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} /> : isLoading ? <Skeleton className="h-72 rounded-3xl" /> : tab === 'sections' ? (
        <div className="space-y-4">
          {!sections.length ? <EmptyState icon="layout-panel-top" title={tr('لا توجد أقسام', 'No sections')} /> : sections.map((s, i) => (
            <div key={s.id} className={cx('bg-white rounded-3xl border border-stone-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4', s.status !== 'active' && 'opacity-70')}>
              <Reorder first={i === 0} last={i === sections.length - 1} pending={moveSection.isPending} onMove={(direction) => moveSection.mutate({ id: s.id, direction })} />
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-stone-900 text-sm flex items-center gap-2 flex-wrap">
                  {(SECTION_LABEL[s.section_key] ? SECTION_LABEL[s.section_key][isEn ? 1 : 0] : isEn ? s.name_en || s.name_ar : s.name_ar)}
                  <code className="text-[10px] font-mono bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded" dir="ltr">{s.section_key}</code>
                  {s.is_custom ? <span className="text-[10px] font-black bg-[#fbf5e9] text-[#6f431b] px-1.5 py-0.5 rounded">{tr('مخصص', 'Custom')}</span> : null}
                </h3>
                <p className="text-xs text-stone-400 truncate mt-0.5">{isEn ? s.title_en || s.title_ar : s.title_ar}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusToggle active={s.status === 'active'} onToggle={() => toggleSection.mutate(s.id)} pending={toggleSection.isPending && toggleSection.variables === s.id} activeLabel={tr('ظاهر', 'Visible')} inactiveLabel={tr('مخفي', 'Hidden')} />
                {s.section_key === 'hero' ? (
                  <Button variant="outline" icon="sparkles" onClick={() => setTab('banners')}>{tr('إدارة الشرائح', 'Manage slides')}</Button>
                ) : (
                  <Button variant="outline" icon="edit-3" onClick={() => openEdit(s)}>{tr('تعديل المحتوى', 'Edit content')}</Button>
                )}
                {s.is_custom ? <button type="button" onClick={() => setToDelete({ type: 'section', row: s })} className="p-2.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-xl transition" aria-label={tr('حذف', 'Delete')}><Icon name="trash-2" className="w-4 h-4" /></button> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <Alert type="info">{tr('الشريحة الأولى هي الظاهرة أولاً وتحمل عنوان الصفحة الرئيسية (H1).', 'The first slide appears first and carries the homepage H1.')}</Alert>
          {data?.bannersError ? (
            <Alert type="error">{tr('تعذر تحميل الشرائح من الخادم (خطأ في الباك اند). حاول لاحقًا أو راجع مطور الباك اند.', 'Could not load the slides from the server (backend error). Try again later or contact the backend developer.')}</Alert>
          ) : !banners.length ? <EmptyState icon="images" title={tr('لا توجد شرائح بعد', 'No slides yet')} /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {banners.map((b, i) => (
                <div key={b.id} className={cx('bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col', b.status !== 'active' && 'opacity-70')}>
                  <div className="relative h-44 bg-stone-100">
                    <img src={assetSrc(b.image)} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-3 start-3 text-[10px] font-black bg-black/60 text-white px-2 py-1 rounded-lg">#{i + 1}</span>
                  </div>
                  <div className="p-5 flex gap-4">
                    <Reorder first={i === 0} last={i === banners.length - 1} pending={moveBanner.isPending} onMove={(direction) => moveBanner.mutate({ id: b.id, direction })} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="font-black text-stone-900 text-sm line-clamp-2">{isEn ? b.title_en || b.title_ar : b.title_ar}</h3>
                      <p className="text-xs text-stone-500 line-clamp-2">{isEn ? b.subtitle_en || b.subtitle_ar : b.subtitle_ar}</p>
                      <code className="text-[10px] font-mono text-stone-400" dir="ltr">{b.link || b.placement}</code>
                    </div>
                  </div>
                  <div className="px-5 pb-5 flex items-center justify-between gap-2 mt-auto">
                    <StatusToggle active={b.status === 'active'} onToggle={() => toggleBanner.mutate(b.id)} pending={toggleBanner.isPending && toggleBanner.variables === b.id} activeLabel={tr('ظاهرة', 'Visible')} inactiveLabel={tr('مخفية', 'Hidden')} />
                    <div className="flex items-center gap-2">
                      <Button variant="outline" icon="edit-3" onClick={() => setBannerDialog({ open: true, banner: b })}>{tr('تعديل', 'Edit')}</Button>
                      <button type="button" onClick={() => setToDelete({ type: 'banner', row: b })} className="p-2.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-xl transition" aria-label={tr('حذف', 'Delete')}><Icon name="trash-2" className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <GenericDialog section={editing.kind === 'generic' ? editing.section : null} onClose={closeEdit} />
      <FeaturesDialog section={editing.kind === 'features' ? editing.section : null} onClose={closeEdit} />
      <TestimonialsDialog section={editing.kind === 'testimonials' ? editing.section : null} onClose={closeEdit} />
      <NewsletterDialog section={editing.kind === 'newsletter' ? editing.section : null} onClose={closeEdit} />
      <CustomDialog open={customOpen} onClose={() => setCustomOpen(false)} />
      <BannerDialog open={bannerDialog.open} banner={bannerDialog.banner} onClose={() => setBannerDialog((d) => ({ ...d, open: false }))} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => (toDelete.type === 'banner' ? deleteBanner : deleteSection).mutate(toDelete.row.id)}
        loading={deleteBanner.isPending || deleteSection.isPending}
        message={toDelete?.type === 'banner' ? tr('هل أنت متأكد من حذف هذه الشريحة؟', 'Delete this slide?') : tr('هل أنت متأكد من حذف هذا القسم المخصص؟', 'Delete this custom section?')}
        confirmLabel={tr('حذف', 'Delete')}
      />
    </div>
  );
}
