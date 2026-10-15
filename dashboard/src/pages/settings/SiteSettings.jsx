import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Button, ErrorState, FileUploader, Icon, PageHeader, PageLoading, TextField, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { settingsService } from '@/services';

const card = 'bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6';
const labels = '[&_label]:font-black [&_label]:text-stone-800 [&_label]:text-xs';

function Section({ icon, tone, title, subtitle, children }) {
  return (
    <section className={card}>
      <div className="flex items-center gap-3.5 border-b border-stone-100 pb-4">
        <div className={cx('w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0', tone)}>
          <Icon name={icon} className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-black text-stone-900">{title}</h3>
          <p className="text-xs text-stone-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** Store identity, announcement bar, contact details and footer (resources/views/admin/site_settings.php). */
export default function SiteSettings() {
  const { tr } = useT();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['settings', 'site'], queryFn: () => settingsService.getSiteSettings() });
  const { register, reset, handleSubmit, control, setValue } = useForm({ defaultValues: { logo_file: null } });
  useEffect(() => { if (data) reset({ ...data, logo_file: null }); }, [data, reset]);

  const save = useAdminMutation((v) => settingsService.updateSiteSettings(v), {
    invalidate: [['settings']],
    success: tr('تم حفظ إعدادات هوية المتجر بنجاح!', 'Store identity settings saved successfully!'),
  });

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorState title={tr('تعذر تحميل الإعدادات', 'Could not load settings')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} />;

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader title={tr('إعدادات هوية المتجر والمنصة', 'Store & Platform Identity Settings')} subtitle={tr('تخصيص هوية تَـمْرُنـا، شريط الإعلانات، قنوات التواصل، وعناوين الفروع', 'Customize the Tamrna identity, announcement bar, contact channels and branch addresses')} />

      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-8 text-sm" noValidate>
        <Section icon="image" tone="bg-gold-50 text-gold-700 border border-gold-200/60" title={tr('هوية المتجر والشعار (Logo)', 'Store identity & logo')} subtitle={tr('اسم العلامة التجارية وشعار المتجر الرسمي', 'Brand name and official store logo')}>
          <Controller
            control={control}
            name="logo_file"
            render={({ field }) => (
              <FileUploader label={tr('شعار المتجر (Logo)', 'Store logo')} value={field.value || (data?.site_logo ? data.site_logo : undefined)} onChange={field.onChange} accept="image/png,image/jpeg,image/webp,image/svg+xml" maxSizeMB={2} hint={tr('يُفضل رفع شعار بصيغة PNG أو SVG بخلفية شفافة', 'A PNG or SVG logo with a transparent background works best')} />
            )}
          />
          <TextField label={tr('أو رابط صورة الشعار:', 'Or logo image URL:')} type="url" dir="ltr" placeholder="https://..." className={labels} {...register('site_logo')} />
          <div className={cx('grid grid-cols-1 sm:grid-cols-2 gap-6', labels)}>
            <TextField label={tr('اسم المتجر (بالعربية)', 'Store name (Arabic)')} required {...register('site_name_ar')} />
            <TextField label={tr('اسم المتجر (بالإنجليزية)', 'Store name (English)')} dir="ltr" {...register('site_name_en')} />
            <TextField label={tr('وصف المتجر / الشعار اللفظي (بالعربية)', 'Tagline (Arabic)')} {...register('site_tagline_ar')} />
            <TextField label={tr('الشعار اللفظي (بالإنجليزية)', 'Tagline (English)')} dir="ltr" {...register('site_tagline_en')} />
          </div>
        </Section>

        <Section icon="megaphone" tone="bg-amber-50 text-amber-700" title={tr('شريط الإعلانات العلوي للمتجر', 'Top announcement bar')} subtitle={tr('يظهر في أعلى كل صفحات المتجر للترويج للعروض وخدمات الشحن', 'Shown above every storefront page to promote offers and shipping')}>
          <div className={cx('grid grid-cols-1 sm:grid-cols-2 gap-6', labels)}>
            <TextField label={tr('نص الإعلان (بالعربية)', 'Announcement (Arabic)')} {...register('announcement_text_ar')} />
            <TextField label={tr('نص الإعلان (بالإنجليزية)', 'Announcement (English)')} dir="ltr" {...register('announcement_text_en')} />
          </div>
        </Section>

        <Section icon="phone-call" tone="bg-primary-50 text-primary-700 border border-primary-100" title={tr('بيانات التواصل وخدمة عملاء تَـمْرُنـا', 'Contact details & customer care')} subtitle={tr('أرقام الواتساب وخدمة كبار العملاء والبريد الرسمي', 'WhatsApp, VIP care line and official email')}>
          <div className={cx('grid grid-cols-1 sm:grid-cols-3 gap-6', labels)}>
            <TextField label={tr('هاتف خدمة العملاء', 'Customer care phone')} dir="ltr" {...register('contact_phone')} />
            <TextField label={tr('رقم الواتساب للطلبات', 'Orders WhatsApp number')} dir="ltr" {...register('contact_whatsapp')} />
            <TextField label={tr('البريد الإلكتروني الرسمي', 'Official email')} type="email" dir="ltr" {...register('contact_email')} />
          </div>
          <div className={cx('grid grid-cols-1 sm:grid-cols-2 gap-6', labels)}>
            <TextField label={tr('عنوان المقر والفروع (بالعربية)', 'HQ & branches address (Arabic)')} {...register('contact_address_ar')} />
            <TextField label={tr('عنوان المقر والفروع (بالإنجليزية)', 'HQ & branches address (English)')} dir="ltr" {...register('contact_address_en')} />
          </div>
        </Section>

        <Section icon="share-2" tone="bg-blue-50 text-blue-700" title={tr('وسائل التواصل وحقوق التذييل (Footer)', 'Social media & footer')} subtitle={tr('حسابات التواصل الاجتماعي وتوثيق المتجر (سجل تجاري / ضريبة)', 'Social accounts and store credentials (commercial register / VAT)')}>
          <div className={cx('grid grid-cols-1 sm:grid-cols-2 gap-6', labels)}>
            <TextField label={tr('رابط إنستغرام (Instagram)', 'Instagram link')} type="url" dir="ltr" {...register('social_instagram')} />
            <TextField label={tr('رابط إكس / تويتر (X)', 'X / Twitter link')} type="url" dir="ltr" {...register('social_facebook')} />
            <TextField label={tr('حقوق التذييل (بالعربية)', 'Footer text (Arabic)')} {...register('footer_text_ar')} />
            <TextField label={tr('حقوق التذييل (بالإنجليزية)', 'Footer text (English)')} dir="ltr" {...register('footer_text_en')} />
          </div>
        </Section>

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={() => data && reset({ ...data, logo_file: null })}>{tr('تراجع عن التعديلات', 'Discard changes')}</Button>
          <Button type="submit" loading={save.isPending} icon="check-circle" className="!px-8 !py-3.5 !rounded-2xl !text-base !font-black shadow-lg shadow-primary-950/20">
            {tr('حفظ إعدادات الهوية', 'Save identity settings')}
          </Button>
        </div>
      </form>
    </div>
  );
}

