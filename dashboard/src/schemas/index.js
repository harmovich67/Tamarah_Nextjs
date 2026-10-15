import { z } from '@tamrna/shared/schemas';

/**
 * Zod schemas for the dashboard forms. Rules mirror the legacy PHP controller validation; the Laravel API must
 * enforce the same (and return Laravel-style 422 `errors`, which the forms map back onto fields).
 * Factories take a `m(ar, en)` message helper so errors follow the dashboard language.
 */
const num = (msg) =>
  z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number({ error: msg }));
const optNum = () => z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().nullable());

export const productSchema = (m) =>
  z
    .object({
      category_id: z.coerce.number().int().positive(m('اختر قسم التمور', 'Choose a category')),
      weight: z.string().default(''),
      status: z.enum(['published', 'draft']).default('published'),
      name_ar: z.string().trim().min(1, m('اسم الصنف بالعربية مطلوب', 'Arabic name is required')).max(200),
      name_en: z.string().trim().max(200).default(''),
      description_ar: z.string().default(''),
      description_en: z.string().default(''),
      price: num(m('السعر مطلوب', 'Price is required')).pipe(z.number().min(0, m('السعر غير صحيح', 'Invalid price'))),
      sale_price: optNum(),
      stock_quantity: num(m('الكمية مطلوبة', 'Stock is required')).pipe(z.number().int().min(0)),
      sku: z.string().trim().max(60).default(''),
      is_preorder: z.boolean().default(false),
      preorder_date: z.string().default(''),
      is_fragile: z.boolean().default(false),
      badge: z.string().default(''),
      featured_image: z.string().default(''),
      image_file: z.any().optional(),
      // Tamrna backend only (VITE_API_MODE=laravel): gallery files, slugs kept on edit and fields the form does not show.
      gallery: z.array(z.any()).default([]),
      gallery_existing: z.array(z.any()).default([]),
      slug_en: z.string().default(''),
      slug_ar: z.string().default(''),
      availability: z.string().optional(),
      extras: z.any().optional(),
      variants: z
        .array(
          z.object({
            id: z.any().optional(),
            weight: z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number().positive().optional()),
            weight_unit: z.string().default('g'),
            discount_percent: z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number().min(0).max(100).optional()),
            size_name: z.string().default(''),
            size_name_en: z.string().default(''),
            sku: z.string().default(''),
            price: optNum(),
            sale_price: optNum(),
            stock_quantity: optNum(),
          }),
        )
        .default([]),
    })
    .refine((v) => v.sale_price == null || v.sale_price < v.price, { path: ['sale_price'], message: m('سعر العرض يجب أن يكون أقل من السعر الأساسي', 'Sale price must be lower than the regular price') });

export const categorySchema = (m) =>
  z.object({
    name_ar: z.string().trim().min(1, m('اسم التصنيف بالعربية مطلوب', 'Arabic name is required')),
    name_en: z.string().trim().default(''),
    icon: z.string().trim().default('tag'),
    slug: z.string().trim().regex(/^[\p{L}\p{N}-]*$/u, m('الرابط يقبل حروفاً وأرقاماً وشرطات فقط', 'Slug accepts letters, digits and dashes only')).default(''),
    image_file: z.any().optional(),
    // Tamrna backend only: description per language, activation and the position kept on edit.
    description_ar: z.string().trim().default(''),
    description_en: z.string().trim().default(''),
    is_active: z.boolean().default(true),
    sort_order: z.any().optional(),
  });

export const warehouseSchema = (m) =>
  z.object({
    name_ar: z.string().trim().min(1, m('اسم المستودع بالعربية مطلوب', 'Arabic name is required')),
    name_en: z.string().trim().default(''),
    code: z.string().trim().default(''),
    location: z.string().trim().default(''),
    phone: z.string().trim().default(''),
    status: z.enum(['active', 'inactive']).default('active'),
  });

export const couponSchema = (m) =>
  z
    .object({
      code: z.string().trim().min(3, m('رمز الكوبون 3 أحرف على الأقل', 'Code needs at least 3 characters')).max(40).regex(/^[A-Za-z0-9_-]+$/, m('أحرف إنجليزية وأرقام فقط', 'Letters and digits only')),
      discount_type: z.enum(['percentage', 'fixed']),
      discount_value: num(m('قيمة الخصم مطلوبة', 'Discount value is required')).pipe(z.number().positive(m('قيمة الخصم يجب أن تكون أكبر من صفر', 'Discount must be greater than zero'))),
      min_order_amount: optNum(),
      usage_limit: optNum(),
      start_date: z.string().default(''),
      end_date: z.string().default(''),
      is_active: z.boolean().default(true),
    })
    .refine((v) => v.discount_type !== 'percentage' || v.discount_value <= 100, { path: ['discount_value'], message: m('النسبة لا تتجاوز 100%', 'Percentage cannot exceed 100%') })
    .refine((v) => !v.start_date || !v.end_date || v.start_date <= v.end_date, { path: ['end_date'], message: m('تاريخ الانتهاء قبل تاريخ البداية', 'End date is before the start date') });

export const shippingZoneSchema = (m) =>
  z.object({
    city_name_ar: z.string().trim().min(1, m('اسم المدينة بالعربية مطلوب', 'Arabic city name is required')),
    city_name_en: z.string().trim().default(''),
    shipping_fee: num(m('رسوم الشحن مطلوبة', 'Shipping fee is required')).pipe(z.number().min(0)),
    estimated_delivery: z.string().trim().default(''),
    is_cold_shipping: z.boolean().default(true),
    is_active: z.boolean().default(true),
  });

export const userSchema = (m, { editing = false } = {}) =>
  z.object({
    name: z.string().trim().min(2, m('الاسم مطلوب', 'Name is required')),
    email: z.string().trim().email(m('البريد الإلكتروني غير صحيح', 'Invalid email')),
    phone: z.string().trim().default(''),
    role_id: z.coerce.number().int().min(1).max(3),
    status: z.enum(['active', 'pending', 'rejected']).default('active'),
    password: editing
      ? z.string().refine((v) => v === '' || v.length >= 8, m('كلمة المرور 8 أحرف على الأقل', 'Password needs at least 8 characters')).default('')
      : z.string().min(8, m('كلمة المرور 8 أحرف على الأقل', 'Password needs at least 8 characters')),
  });

export const pageSchema = (m) =>
  z.object({
    title_ar: z.string().trim().min(1, m('العنوان بالعربية مطلوب', 'Arabic title is required')),
    title_en: z.string().trim().default(''),
    slug: z.string().trim().regex(/^[a-z0-9-]*$/, m('الرابط: أحرف إنجليزية صغيرة وأرقام وشرطات', 'Slug: lowercase letters, digits and dashes')).default(''),
    content_ar: z.string().default(''),
    content_en: z.string().default(''),
    excerpt_ar: z.string().default(''),
    excerpt_en: z.string().default(''),
    meta_title_ar: z.string().default(''),
    meta_title_en: z.string().default(''),
    meta_desc_ar: z.string().default(''),
    meta_desc_en: z.string().default(''),
    status: z.enum(['published', 'draft']).default('published'),
    template: z.string().default('default'),
    post_type: z.enum(['post', 'announcement', 'faq']).default('post'),
    featured_image: z.string().default(''),
    image_file: z.any().optional(),
  });

export const siteSettingsSchema = (m) =>
  z.object({
    site_name_ar: z.string().trim().min(1, m('اسم المتجر مطلوب', 'Store name is required')),
    site_name_en: z.string().trim().default(''),
    contact_email: z.string().trim().refine((v) => v === '' || z.string().email().safeParse(v).success, m('بريد غير صحيح', 'Invalid email')).default(''),
  }).passthrough();

