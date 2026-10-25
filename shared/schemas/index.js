/**
 * Zod validation schemas shared by forms and by the API contract.
 * Rules mirror the legacy PHP validation (controllers + inline view scripts).
 * Every factory takes the active locale so messages are localized.
 */
import { z } from 'zod';
import { GIFT_CARD } from '../constants/index.js';
import { isSaudiMobile, normalizeDigits } from '../utils/index.js';

const m = (locale) => (ar, en) => (locale === 'en' ? en : ar);

const saudiPhone = (locale, { required = true } = {}) => {
  const msg = m(locale);
  const base = z
    .string()
    .trim()
    .refine((v) => (required ? v.length > 0 : true), msg('رقم الجوال مطلوب', 'Mobile number is required'))
    .refine((v) => v === '' || isSaudiMobile(v), msg('يرجى إدخال رقم جوال سعودي صحيح (مثال: 0555123456)', 'Enter a valid Saudi mobile number (e.g. 0555123456)'));
  return base;
};

/** POST /login  — identity is a mobile number or an email. */
export const loginSchema = (locale = 'ar') => {
  const msg = m(locale);
  return z.object({
    identity: z.string().trim().min(1, msg('أدخل رقم الجوال أو البريد الإلكتروني', 'Enter your mobile number or email')).max(254),
    password: z.string().min(1, msg('أدخل كلمة المرور', 'Enter your password')).max(128),
  });
};

/** POST /register */
export const registerSchema = (locale = 'ar') => {
  const msg = m(locale);
  return z
    .object({
      first: z.string().trim().min(1, msg('الاسم الأول مطلوب', 'First name is required')).max(50),
      last: z.string().trim().min(1, msg('اسم العائلة مطلوب', 'Family name is required')).max(49),
      phone: saudiPhone(locale),
      email: z
        .string()
        .trim()
        .max(254)
        .refine((v) => v === '' || z.string().email().safeParse(v).success, msg('البريد الإلكتروني غير صحيح', 'Email address is invalid')),
      password: z
        .string()
        .min(8, msg('استخدم ٨ أحرف على الأقل، تشمل حرفًا ورقمًا', 'Use at least 8 characters including a letter and a number'))
        .max(128)
        .refine((v) => /[A-Za-z؀-ۿ]/.test(v) && /\d/.test(v), msg('يجب أن تتضمن كلمة المرور حرفًا ورقمًا', 'Password must include a letter and a number')),
      confirm: z.string().min(1, msg('أكّد كلمة المرور', 'Confirm your password')),
      terms: z.boolean().refine((v) => v === true, msg('يجب الموافقة على الشروط والأحكام', 'You must accept the terms and conditions')),
    })
    .refine((v) => v.password === v.confirm, { path: ['confirm'], message: msg('كلمتا المرور غير متطابقتين', 'Passwords do not match') });
};

/** POST /forgot-password */
export const forgotPasswordSchema = (locale = 'ar') => z.object({ phone: saudiPhone(locale) });

/** POST /verify-otp */
export const verifyOtpSchema = (locale = 'ar') =>
  z.object({
    phone: z.string().min(1),
    otp: z
      .string()
      .transform((v) => normalizeDigits(v).replace(/\D/g, ''))
      .refine((v) => v.length === 6, m(locale)('يرجى إدخال رمز التحقق المكون من ٦ أرقام', 'Enter the 6-digit verification code')),
  });

/** POST /checkout/process */
export const checkoutSchema = (locale = 'ar') => {
  const msg = m(locale);
  return z
    .object({
      first_name: z.string().trim().min(1, msg('الاسم الأول مطلوب', 'First name is required')),
      last_name: z.string().trim().min(1, msg('اسم العائلة مطلوب', 'Last name is required')),
      phone: z.string().trim().min(1, msg('رقم الجوال مطلوب', 'Mobile number is required')),
      email: z.string().trim().email(msg('البريد الإلكتروني غير صحيح', 'Email address is invalid')),
      shipping_type: z.enum(['home_delivery', 'branch_pickup']),
      city: z.string().trim().optional().default(''),
      district: z.string().trim().optional().default(''),
      address: z.string().trim().optional().default(''),
      // demo branches (riyadh / jeddah / madinah) or the id of a backend branch
      pickup_branch: z.string().max(40).optional(),
      notes: z.string().trim().max(500).optional().default(''),
      payment_method: z.string().min(1, msg('اختر طريقة الدفع', 'Select a payment method')),
      save_address: z.boolean().optional().default(false),
    })
    .superRefine((v, ctx) => {
      if (v.shipping_type === 'home_delivery' && !v.address) {
        ctx.addIssue({ code: 'custom', path: ['address'], message: msg('يرجى ملء كافة حقول العنوان ورقم الهاتف للتوصيل', 'Please complete the delivery address') });
      }
    });
};

/** Saved address modal (profile/addresses). */
export const addressSchema = (locale = 'ar') => {
  const msg = m(locale);
  return z.object({
    id: z.union([z.number(), z.string()]).optional(),
    title: z.string().default('المنزل'),
    recipient_name: z.string().trim().min(3, msg('يرجى كتابة اسم المستلم الثلاثي (3 أحرف على الأقل)', 'Please enter at least 3 characters')),
    phone: z
      .string()
      .trim()
      .refine((v) => /^(05|5|\+9665|009665)[0-9]{8}$/.test(normalizeDigits(v).replace(/[^\d+]/g, '')), msg('يجب أن يبدأ الرقم بـ 05 ويتكون من 10 أرقام (مثال: 0555000000)', 'Must be a valid Saudi mobile starting with 05 (10 digits)')),
    city: z.string().min(1, msg('اختر المدينة', 'Choose a city')),
    street_address: z.string().trim().min(5, msg('يرجى كتابة اسم الحي والشارع بالتفصيل (مثال: حي الملقا، شارع أنس بن مالك)', 'Please provide detailed street and district')),
    building_floor: z.string().trim().optional().default(''),
    landmark: z.string().trim().optional().default(''),
    is_default: z.boolean().optional().default(false),
  });
};

/** Gift card builder (POST /api/gift-cards/add). */
export const giftCardSchema = (locale = 'ar') => {
  const msg = m(locale);
  return z.object({
    card_type: z.enum(GIFT_CARD.TYPES),
    amount: z.coerce
      .number()
      .refine(
        (v) => v >= GIFT_CARD.MIN_AMOUNT && v <= GIFT_CARD.MAX_AMOUNT,
        msg(`قيمة البطاقة يجب أن تكون بين ${GIFT_CARD.MIN_AMOUNT} و${GIFT_CARD.MAX_AMOUNT} ر.س`, `Card value must be between ${GIFT_CARD.MIN_AMOUNT} and ${GIFT_CARD.MAX_AMOUNT} SAR`),
      ),
    sender_name: z.string().trim().min(2, msg('يرجى إكمال اسم المرسل واسم المُهدى إليه ورقم جوال المستلم.', 'Please complete the sender name, recipient name and recipient mobile.')),
    sender_phone: z.string().trim().optional().default(''),
    recipient_name: z.string().trim().min(2, msg('يرجى إكمال اسم المرسل واسم المُهدى إليه ورقم جوال المستلم.', 'Please complete the sender name, recipient name and recipient mobile.')),
    recipient_phone: z
      .string()
      .trim()
      .min(1, msg('يرجى إكمال اسم المرسل واسم المُهدى إليه ورقم جوال المستلم.', 'Please complete the sender name, recipient name and recipient mobile.'))
      .refine((v) => isSaudiMobile(v), msg('رقم جوال المستلم يجب أن يكون بالصيغة 05xxxxxxxx', 'Recipient mobile must look like 05xxxxxxxx')),
    recipient_email: z.string().trim().refine((v) => v === '' || z.string().email().safeParse(v).success, msg('البريد الإلكتروني غير صحيح', 'Email address is invalid')).optional().default(''),
    message: z.string().max(180).optional().default(''),
  });
};

export const contactSchema = (locale = 'ar') => {
  const msg = m(locale);
  return z.object({
    name: z.string().trim().min(1, msg('الاسم مطلوب', 'Name is required')),
    email: z.string().trim().email(msg('البريد الإلكتروني غير صحيح', 'Email address is invalid')),
    message: z.string().trim().min(1, msg('الرسالة مطلوبة', 'Message is required')),
  });
};

export const newsletterSchema = (locale = 'ar') =>
  z.object({ email: z.string().trim().email(m(locale)('البريد الإلكتروني غير صحيح', 'Email address is invalid')) });

export const profileInfoSchema = (locale = 'ar') => {
  const msg = m(locale);
  return z.object({
    name: z.string().trim().min(1, msg('الاسم مطلوب', 'Name is required')),
    email: z.string().trim().refine((v) => v === '' || z.string().email().safeParse(v).success, msg('البريد الإلكتروني غير صحيح', 'Email address is invalid')),
    phone: z.string().trim().min(1, msg('رقم الجوال مطلوب', 'Mobile number is required')),
  });
};

export const changePasswordSchema = (locale = 'ar') => {
  const msg = m(locale);
  return z
    .object({
      currentPassword: z.string().min(1, msg('كلمة المرور الحالية مطلوبة', 'Current password is required')),
      password: z
        .string()
        .min(8, msg('استخدم كلمة مرور من 8 أحرف على الأقل تشمل حرفًا ورقمًا.', 'Use at least 8 characters including a letter and a number.'))
        .refine((v) => /[A-Za-z؀-ۿ]/.test(v) && /\d/.test(v), msg('استخدم كلمة مرور من 8 أحرف على الأقل تشمل حرفًا ورقمًا.', 'Use at least 8 characters including a letter and a number.')),
      confirm: z.string().min(1),
    })
    .refine((v) => v.password === v.confirm, { path: ['confirm'], message: msg('كلمتا المرور غير متطابقتين أو الحقول ناقصة.', 'Passwords do not match.') });
};

export { z };
