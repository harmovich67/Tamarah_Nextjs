import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CheckField, ErrorState, FileUploader, H1, Icon, PageLoading, SectionHeading, SelectField, SUBTITLE, TextAreaField, TextField, BTN, INPUT, INPUT_SM, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { storeService } from '@/services';
import { productSchema } from '@/schemas';
import { config } from '@/lib/config';

// Tamrna backend: variants are weight + unit + price (+ % discount), images are a gallery, no stock / badge / sale price.
const isLaravel = config.apiMode === 'laravel';

const DEFAULTS = {
  category_id: '',
  weight: '1 كجم',
  status: 'published',
  name_ar: '',
  name_en: '',
  description_ar: '',
  description_en: '',
  price: 120,
  sale_price: '',
  stock_quantity: 50,
  sku: '',
  is_box: false,
  is_preorder: false,
  preorder_date: '',
  is_fragile: false,
  badge: '',
  featured_image: 'assets/images/ajwa_luxury_box_1787053900509.jpg',
  image_file: null,
  gallery: [],
  gallery_existing: [],
  slug_en: '',
  slug_ar: '',
  variants: [{ size_name: 'صندوق 1 كجم فاخر', size_name_en: '', sku: '', price: 120, sale_price: '', stock_quantity: 50, weight: isLaravel ? 250 : '', weight_unit: 'g', discount_percent: '' }],
};

/**
 * Interactive, high-craft packaging variant row.
 * Displays aligned inputs with joined unit addons, live discount preview, and clear status badges.
 */
function VariantItem({ index: i, isLaravel, isBox, remove, register, errors, control, currency }) {
  const { tr } = useT();
  const price = useWatch({ control, name: `variants.${i}.price` });
  const discount = useWatch({ control, name: `variants.${i}.discount_percent` });

  const numPrice = Number(price) || 0;
  const numDiscount = Number(discount) || 0;
  const hasDiscount = numDiscount > 0 && numDiscount <= 100 && numPrice > 0;
  const finalPrice = hasDiscount ? numPrice * (1 - numDiscount / 100) : numPrice;
  const savings = hasDiscount ? numPrice - finalPrice : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 p-4 sm:p-5 space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-primary-50 text-primary-800 border border-primary-200/60 text-xs font-black flex items-center justify-center">
            {i + 1}
          </span>
          <span className="text-sm font-bold text-slate-800">
            {i === 0 ? tr('العبوة الافتراضية الرئيسية', 'Default primary pack') : `${tr('خيار عبوة إضافي', 'Pack option')} #${i + 1}`}
          </span>
          {i === 0 ? (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-[10px] font-bold inline-flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {tr('الرئيسية بالمتجر', 'Primary')}
            </span>
          ) : null}
        </div>

        {i > 0 && (
          <button
            type="button"
            onClick={() => remove(i)}
            className="px-2.5 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition"
          >
            <Icon name="trash-2" className="w-3.5 h-3.5" />
            <span>{tr('حذف هذا الحجم', 'Remove size')}</span>
          </button>
        )}
      </div>

      {/* Grid of Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
        {isLaravel ? (
          <div className="sm:col-span-5">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {tr('الوزن والوحدة', 'Weight & unit')} <span className="text-rose-500">*</span>
            </label>
            <div className="flex rounded-xl shadow-2xs border border-slate-200/90 focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-500/10 transition-all bg-white overflow-hidden">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="250"
                className="flex-1 min-w-0 px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                aria-label={tr('الوزن', 'Weight')}
                {...register(`variants.${i}.weight`)}
              />
              <div className="border-s border-slate-200/90 bg-slate-50/90 px-2.5 flex items-center shrink-0">
                <select
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer py-1.5 pe-3 ps-1"
                  aria-label={tr('الوحدة', 'Unit')}
                  {...register(`variants.${i}.weight_unit`)}
                >
                  <option value="g">{tr('جرام (g)', 'Gram (g)')}</option>
                  <option value="kg">{tr('كيلو جرام (kg)', 'Kilogram (kg)')}</option>
                  <option value="t">{tr('طن (t)', 'Ton (t)')}</option>
                </select>
              </div>
            </div>
            {errors.variants?.[i]?.weight && (
              <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                <Icon name="alert-circle" className="w-3 h-3" />
                {errors.variants[i].weight.message}
              </p>
            )}
          </div>
        ) : (
          <div className="sm:col-span-5">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {tr('اسم العبوة / الوزن', 'Pack name / weight')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder={tr('مثال: كرتون 3 كجم فاخر', 'e.g. 3 kg luxury carton')}
              className={INPUT}
              {...register(`variants.${i}.size_name`)}
            />
          </div>
        )}

        {/* السعر */}
        <div className="sm:col-span-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {tr('السعر الأساسي', 'Base price')} <span className="text-rose-500">*</span>
          </label>
          <div className="flex rounded-xl shadow-2xs border border-slate-200/90 focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-500/10 transition-all bg-white overflow-hidden">
            <input
              type="number"
              step="0.5"
              min="0"
              placeholder="0.00"
              className="flex-1 min-w-0 px-3.5 py-2.5 text-sm font-black text-primary-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
              {...register(`variants.${i}.price`)}
            />
            <span className="border-s border-slate-200/90 bg-slate-50/90 px-3 flex items-center text-xs font-bold text-slate-500 select-none shrink-0">
              {currency || tr('ر.س', 'SAR')}
            </span>
          </div>
        </div>

        {/* الخصم أو الكمية */}
        {isLaravel ? (
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {tr('نسبة الخصم %', 'Discount %')}
            </label>
            <div className="flex rounded-xl shadow-2xs border border-slate-200/90 focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-500/10 transition-all bg-white overflow-hidden">
              <input
                type="number"
                step="any"
                min="0"
                max="100"
                placeholder={tr('0', '0')}
                className="flex-1 min-w-0 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                {...register(`variants.${i}.discount_percent`)}
              />
              <span className="border-s border-slate-200/90 bg-slate-50/90 px-3 flex items-center text-xs font-black text-slate-500 select-none shrink-0">
                %
              </span>
            </div>
            {errors.variants?.[i]?.discount_percent && (
              <p className="text-[11px] text-rose-500 font-semibold mt-1">
                {errors.variants[i].discount_percent.message}
              </p>
            )}
          </div>
        ) : (
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {tr('الكمية المتوفرة', 'Stock quantity')}
            </label>
            <input
              type="number"
              min="0"
              placeholder="50"
              className={INPUT}
              {...register(`variants.${i}.stock_quantity`)}
            />
          </div>
        )}
      </div>

      {/* Per-pack stock: only for box products (is_box); otherwise the product has one stock. */}
      {isLaravel && isBox ? (
        <div className="sm:max-w-xs">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">{tr('الكمية المتوفرة لهذه العبوة', 'Stock for this pack')}</label>
          <input type="number" min="0" placeholder="0" className={INPUT} {...register(`variants.${i}.stock_quantity`)} />
          {errors.variants?.[i]?.stock_quantity && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.variants[i].stock_quantity.message}</p>}
        </div>
      ) : null}

      {/* Live Calculated Price Bar (shown if discount is active) */}
      {isLaravel && hasDiscount ? (
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Icon name="tag" className="w-3.5 h-3.5 text-primary-600" />
            <span>{tr('السعر المعروض للعميل بعد تطبيق الخصم:', 'Customer price after discount:')}</span>
            <span className="font-black text-primary-700 bg-primary-50/80 border border-primary-200/70 px-2.5 py-0.5 rounded-lg text-xs shadow-2xs">
              {finalPrice.toFixed(2)} {currency || tr('ر.س', 'SAR')}
            </span>
          </div>
          <span className="text-slate-400 text-[11px]">
            {tr('وفر العميل: ', 'Savings: ')}
            <b className="text-emerald-700 font-bold">{savings.toFixed(2)} {currency || tr('ر.س', 'SAR')}</b> ({numDiscount}%)
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Create / edit a product with its packaging variants (product_create.php + product_edit.php). */
export default function ProductFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const { tr, locale, currency } = useT();
  const navigate = useNavigate();
  const m = (ar, en) => (locale === 'en' ? en : ar);
  const schema = useMemo(() => productSchema(m), [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['product', id ?? 'new'],
    queryFn: () => (editing ? storeService.getProduct(id) : storeService.listProductFormOptions()),
  });

  const form = useForm({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const { register, handleSubmit, control, reset, setError, setValue, formState: { errors, isSubmitting } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const isPreorder = useWatch({ control, name: 'is_preorder' });
  const isBox = useWatch({ control, name: 'is_box' });
  const categories = data?.categories || [];

  useEffect(() => {
    if (!data) return;
    if (editing) {
      const p = data.product;
      reset({
        category_id: p.category_id,
        weight: p.weight || '1 كجم',
        status: p.status || 'published',
        name_ar: p.name_ar || '',
        name_en: p.name_en || '',
        description_ar: p.description_ar || '',
        description_en: p.description_en || '',
        price: p.price,
        sale_price: p.sale_price ?? '',
        stock_quantity: p.stock_quantity,
        sku: p.sku || '',
        is_box: !!p.is_box,
        is_preorder: !!p.is_preorder,
        preorder_date: p.preorder_date || '',
        is_fragile: !!p.is_fragile,
        badge: p.badge || '',
        featured_image: p.featured_image || '',
        image_file: null,
        gallery: (p.gallery_existing || []).map((m) => m.url),
        gallery_existing: p.gallery_existing || [],
        slug_en: p.slug_en || '',
        slug_ar: p.slug_ar || '',
        availability: p.availability,
        extras: p.extras,
        variants: (data.variants.length ? data.variants : [{ size_name: p.weight || 'عبوة 1 كجم', price: p.price, stock_quantity: p.stock_quantity }]).map((v) => ({
          id: v.id,
          size_name: v.size_name || '',
          size_name_en: v.size_name_en || '',
          sku: v.sku || '',
          price: v.price,
          sale_price: v.sale_price ?? '',
          stock_quantity: v.stock_quantity,
          weight: v.weight ?? '',
          weight_unit: v.weight_unit || 'g',
          discount_percent: v.discount_percent ?? '',
        })),
      });
    } else if (categories[0] && !form.getValues('category_id')) {
      setValue('category_id', categories[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, editing]);

  const save = useAdminMutation(
    (values) => (editing ? storeService.updateProduct(id, values) : storeService.createProduct(values)),
    {
      invalidate: [['products'], ['product'], ['dashboard']],
      success: editing ? tr('تم تحديث بيانات الصنف بنجاح.', 'Product details updated successfully.') : tr('تمت إضافة صنف التمور بنجاح إلى المتجر!', 'Product variety created successfully!'),
      onSuccess: () => navigate('/products'),
      onFieldErrors: (errs) => Object.entries(errs).forEach(([f, msgs]) => setError(f, { message: [].concat(msgs)[0] })),
    },
  );

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorState title={tr('تعذر تحميل الصنف', 'Could not load the product')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} />;

  const err = (name) => errors[name]?.message;

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className={H1}>{editing ? `${tr('تعديل صنف: ', 'Edit product: ')}${data.product.name_ar}` : tr('إضافة صنف تمور ملكي جديد', 'Add a new royal dates product')}</h1>
          <p className={SUBTITLE}>{editing ? tr('تحديث الأسعار بالريال السعودي، الأوزان، الحجز المسبق، والصور', 'Update prices (SAR), weights, pre-order settings and images') : tr('إدخال تفاصيل الصنف، تصنيف التمور، الأسعار بالريال السعودي، وخيارات التعبئة والحصاد', 'Enter product details, category, prices in SAR, and packaging / harvest options')}</p>
        </div>
        <Link to="/products" className={BTN.secondary}>
          <Icon name="arrow-left" className="w-4 h-4 rtl:rotate-180 ltr:rotate-0" /> {tr('العودة لقائمة التمور', 'Back to the dates list')}
        </Link>
      </div>

      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 sm:p-8 space-y-8 text-sm">
        {/* Classification */}
        <div className="space-y-4">
          <SectionHeading icon="tags">{tr('تصنيف التمور', 'Classification')}</SectionHeading>
          <div className={cx('grid grid-cols-1 gap-4', editing ? (isLaravel ? 'sm:grid-cols-2' : 'sm:grid-cols-3') : isLaravel ? 'sm:grid-cols-1' : 'sm:grid-cols-2')}>
            <SelectField label={tr('قسم التمور', 'Category')} required error={err('category_id')} {...register('category_id')}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
            </SelectField>
            {!isLaravel && <TextField label={editing ? tr('الوزن الافتراضي', 'Default weight') : tr('الوزن / نوع العبوة الافتراضية', 'Default weight / pack')} placeholder={tr('مثال: 1 كجم / عبوة 500 جرام / كرتون 3 كجم', 'e.g. 1 kg / 500 g pack / 3 kg carton')} {...register('weight')} />}
            {editing && (
              <SelectField label={tr('حالة النشر', 'Publish status')} {...register('status')}>
                <option value="published">{tr('منشور في المتجر', 'Published in the store')}</option>
                <option value="draft">{tr('مسودة غير منشورة', 'Unpublished draft')}</option>
              </SelectField>
            )}
          </div>
        </div>

        {/* Names */}
        <div className="space-y-4">
          <SectionHeading icon="file-text">{tr('بيانات الصنف والوصف', 'Product details & description')}</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label={tr('اسم صنف التمر (بالعربية)', 'Product name (Arabic)')} required error={err('name_ar')} placeholder="عجوة المدينة المنورة العالية الملكية" inputClassName="font-bold" {...register('name_ar')} />
            <TextField label={tr('اسم الصنف (بالإنجليزية)', 'Product name (English)')} placeholder="e.g. Royal Madinah Al-Aliyah Ajwa" dir="ltr" {...register('name_en')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextAreaField label={tr('الوصف التفصيلي (بالعربية)', 'Description (Arabic)')} placeholder="وصف الحبة، مصدر المزرعة، ومواصفات الطراوة..." {...register('description_ar')} />
            <TextAreaField label={tr('الوصف التفصيلي (بالإنجليزية)', 'Description (English)')} placeholder="English detailed description..." dir="ltr" {...register('description_en')} />
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <SectionHeading icon="dollar-sign">{tr('الأسعار والمخزون والشارات', 'Pricing, stock & badges')}</SectionHeading>
          {isLaravel ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label={tr('الباركود', 'Barcode')} placeholder="6281234567890" dir="ltr" inputClassName="font-mono" error={err('sku')} {...register('sku')} />
                {!isBox && <TextField label={tr('الكمية بالمخزون', 'Stock quantity')} required type="number" min="0" error={err('stock_quantity')} inputClassName="font-bold" {...register('stock_quantity')} />}
              </div>
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                <CheckField
                  label={tr('منتج بوكس: المخزون لكل عبوة على حدة', 'Box product: stock is tracked per pack')}
                  hint={isBox ? tr('أدخل الكمية داخل كل عبوة (Variant) أدناه.', 'Enter the quantity inside each pack (variant) below.') : tr('بدون تفعيل: مخزون واحد للمنتج كله (الحقل أعلاه).', 'Off: one stock for the whole product (the field above).')}
                  {...register('is_box')}
                />
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <TextField label={tr('السعر الأساسي (ر.س)', 'Regular price (SAR)')} required type="number" step="0.5" min="0" error={err('price')} inputClassName="font-extrabold text-[#0f764a]" {...register('price')} />
            <TextField label={tr('سعر العرض / الخصم (ر.س)', 'Sale price (SAR)')} type="number" step="0.5" min="0" placeholder={tr('اختياري', 'Optional')} error={err('sale_price')} {...register('sale_price')} />
            <TextField label={tr('الكمية بالمخزون', 'Stock quantity')} required type="number" min="0" error={err('stock_quantity')} inputClassName="font-bold" {...register('stock_quantity')} />
            <TextField label={tr('رمز التتبع (SKU)', 'SKU')} placeholder="TUM-DATE-01" dir="ltr" inputClassName="font-mono" {...register('sku')} />
          </div>
          )}
          <div className={cx('grid grid-cols-1 gap-4 pt-2', isLaravel ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
              <CheckField label={tr('صنف متاح للحجز المسبق للحصاد 🌴', 'Available for harvest pre-order 🌴')} {...register('is_preorder')} />
              {isPreorder && !isLaravel && (
                <div className="pt-1">
                  <label className="block text-[11px] text-slate-500 mb-1" htmlFor="preorder_date">{tr('موعد بدء الشحن التقديري', 'Estimated shipping start')}</label>
                  <input id="preorder_date" type="text" placeholder={tr('مثال: 15 سبتمبر 2026', 'e.g. 15 September 2026')} className={INPUT_SM} {...register('preorder_date')} />
                </div>
              )}
            </div>
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
              <CheckField label={tr('منتج حساس أو زجاجي (قابل للكسر)', 'Fragile / glass product')} hint={!editing ? tr('يظهر تنبيه للمشتري بضرورة الشحن المبرد أو الاستلام من الفرع.', 'Buyers are warned about chilled shipping or branch pickup.') : undefined} {...register('is_fragile')} />
            </div>
            {!isLaravel && <TextField label={tr('الشارة المميزة (Badge)', 'Highlight badge')} placeholder={tr('مثال: الأكثر طلباً / نخب أول', 'e.g. Best seller / Grade A')} {...register('badge')} />}
          </div>
        </div>

        {/* Image */}
        <div className="space-y-4">
          <SectionHeading icon="image">{isLaravel ? tr('معرض صور الصنف', 'Product gallery') : tr('صورة الصنف', 'Product image')}</SectionHeading>
          {isLaravel ? (
            <Controller
              control={control}
              name="gallery"
              render={({ field }) => <FileUploader multiple label={tr('رفع صور من الجهاز (الأولى هي الصورة الرئيسية)', 'Upload images (the first one is the main image)')} value={field.value} onChange={field.onChange} accept="image/*" maxSizeMB={5} error={err('image_file')} />}
            />
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <Controller
              control={control}
              name="image_file"
              render={({ field }) => <FileUploader label={editing ? tr('رفع صورة جديدة من الجهاز', 'Upload a new image') : tr('رفع صورة من الجهاز', 'Upload an image')} value={field.value || undefined} onChange={field.onChange} accept="image/*" maxSizeMB={5} />}
            />
            <TextField label={editing ? tr('أو مسار الصورة الحالية', 'Or current image path') : tr('أو مسار الصورة الافتراضية', 'Or default image path')} inputClassName="text-xs" dir="ltr" {...register('featured_image')} />
          </div>
          )}
        </div>

        {/* Variants */}
        <div className="space-y-4">
          <SectionHeading
            icon="boxes"
            action={
              <button
                type="button"
                onClick={() => append({ size_name: '', size_name_en: '', sku: '', price: '', sale_price: '', stock_quantity: '', weight: isLaravel ? 250 : '', weight_unit: 'g', discount_percent: '' })}
                className="px-3.5 py-1.5 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 hover:text-primary-800 border border-primary-200/70 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
              >
                <Icon name="plus" className="w-3.5 h-3.5" />
                <span>{tr('إضافة حجم أو عبوة أخرى', 'Add size or pack')}</span>
              </button>
            }
          >
            {tr('خيارات الأوزان والعبوات المتوفرة (Variants)', 'Available weights & packs (Variants)')}
          </SectionHeading>
          <div className="space-y-3">
            {fields.map((f, i) => (
              <VariantItem
                key={f.id}
                index={i}
                isLaravel={isLaravel}
                isBox={isBox}
                remove={remove}
                register={register}
                errors={errors}
                control={control}
                currency={currency}
              />
            ))}
          </div>
        </div>

        <div className="pt-5 border-t border-slate-200/80 flex items-center justify-end gap-3">
          <Link to="/products" className={BTN.secondary}>{tr('إلغاء', 'Cancel')}</Link>
          <button type="submit" disabled={isSubmitting || save.isPending} className={cx(BTN.primary, 'px-7')}>
            <Icon name={save.isPending ? 'loader-2' : 'check'} className={cx('w-4 h-4', save.isPending && 'animate-spin')} />
            <span>{editing ? tr('حفظ التعديلات', 'Save changes') : tr('حفظ ونشر صنف التمور', 'Save & publish product')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

