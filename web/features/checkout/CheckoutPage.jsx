'use client';

import { Suspense, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutSchema } from '@tamrna/shared/schemas';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { Icon } from '@tamrna/shared/components/Icon';
import { numberFormat } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import { FormField, Flash } from '@/components/ui/FormField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { cartKey } from '@/hooks/useCart';
import { checkoutService } from '@/services';
import { showToast } from '@/store/toastStore';
import { asset } from '@/lib/asset';

function paymentMethods(settings, tr, currency) {
  const list = [];
  if (settings.enable_mada) list.push(['mada', tr('بطاقة مدى البنكية (Mada)', 'Mada Debit Card'), tr('دفع فوري سريع وآمن عبر الشبكة السعودية', 'Instant and secure payment via Saudi national payment network'), 'mada']);
  if (settings.enable_apple_pay) list.push(['apple_pay', 'Apple Pay', tr('إتمام الشراء بنقرة واحدة لأجهزة آبل', 'One-tap checkout for Apple devices'), 'Apple Pay']);
  if (settings.enable_credit_card) list.push(['credit_card', tr('البطاقات الائتمانية (Visa / Mastercard)', 'Credit Cards (Visa / Mastercard)'), tr('فيزا، ماستركارد، بطاقات الائتمان الخليجية والدولية', 'Visa, Mastercard, GCC and international credit cards'), 'VISA']);
  if (settings.enable_paymob) list.push(['paymob', tr('باي موب (Paymob)', 'Paymob'), tr('بوابة الدفع الإلكتروني المعتمدة للبطاقات والمحافظ', 'Approved payment gateway for cards and digital wallets'), 'paymob']);
  if (settings.enable_tabby) list.push(['tabby', tr('تابي (Tabby)', 'Tabby'), tr('قسّم فاتورتك على 4 دفعات شهرية بدون أي فوائد', 'Split in 4 interest-free monthly installments'), 'tabby']);
  if (settings.enable_tamara) list.push(['tamara', tr('تمارا (Tamara)', 'Tamara'), tr('قسّمها على 4 دفعات مريحة ومتوافقة مع الشريعة', 'Split in 4 flexible Sharia-compliant payments'), 'tamara']);
  if (settings.enable_cod) list.push(['cod', tr('الدفع عند الاستلام', 'Cash on Delivery'), tr('سداد القيمة نقداً أو عبر بطاقة مدى لمندوب التوصيل', 'Pay cash or mada card upon delivery'), settings.cod_fee > 0 ? `+${numberFormat(settings.cod_fee, 2)} ${currency}` : tr('كاش / مدى', 'Cash/Mada')]);
  return list;
}

function CheckoutForm() {
  const { locale, isRtl, tr, currency } = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useSearchParams();
  const { user, hydrated } = useAuth();
  const { data: cart, isLoading: cartLoading } = useCart();
  const { data: checkout, isLoading, isError, refetch } = useQuery({ queryKey: ['checkout'], queryFn: () => checkoutService.getCheckoutData() });

  const nameParts = String(user?.name || '').trim().split(/\s+/);
  const form = useForm({
    resolver: zodResolver(checkoutSchema(locale)),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      shipping_type: 'home_delivery',
      city: 'الرياض',
      district: isRtl ? 'حي النرجس' : 'Al-Narjis',
      address: isRtl ? 'شارع الأمير فيصل بن بندر، فيلا 24' : 'Prince Faisal Bin Bandar St, Villa 24',
      pickup_branch: 'riyadh',
      notes: '',
      payment_method: '',
      save_address: false,
    },
  });
  const { register, handleSubmit, control, setValue, getValues, formState: { errors, isSubmitting } } = form;
  const shippingType = useWatch({ control, name: 'shipping_type' });
  const city = useWatch({ control, name: 'city' });

  // Prefill from the signed-in customer (once the session is known).
  useEffect(() => {
    if (!hydrated || !user) return;
    if (!getValues('first_name')) setValue('first_name', nameParts[0] || '');
    if (!getValues('last_name')) setValue('last_name', nameParts.slice(1).join(' '));
    if (!getValues('phone')) setValue('phone', user.phone || '');
    if (!getValues('email')) setValue('email', user.email || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  const methods = useMemo(() => (checkout ? paymentMethods(checkout.payment, tr, currency) : []), [checkout, tr, currency]);
  useEffect(() => {
    if (methods.length && !getValues('payment_method')) setValue('payment_method', methods[0][0]);
    if (checkout && !methods.length && checkout.payment.enable_bank_transfer && !getValues('payment_method')) setValue('payment_method', 'bank_transfer');
  }, [methods, checkout, getValues, setValue]);

  // Backend pickup branches: preselect the first one (the default value is a demo branch key).
  useEffect(() => {
    const first = checkout?.branches?.[0]?.id;
    if (first && !checkout.branches.some((b) => b.id === getValues('pickup_branch'))) setValue('pickup_branch', first);
  }, [checkout, getValues, setValue]);

  // Live shipping quote (replaces the PHP recalculateShipping() fetch).
  const { data: quote } = useQuery({
    queryKey: ['checkout-shipping', shippingType, city, cart?.subtotal, cart?.discount],
    queryFn: () => checkoutService.calculateShipping({ shipping_type: shippingType, city }),
    enabled: !!cart?.items?.length,
    placeholderData: (prev) => prev,
  });

  // Guards: empty cart -> /cart; guests blocked by the store policy -> /login.
  useEffect(() => {
    if (!cartLoading && cart && !cart.items.length) router.replace('/cart');
  }, [cart, cartLoading, router]);
  useEffect(() => {
    if (checkout && hydrated && !user && !checkout.payment.allow_guest_checkout) router.replace('/login?required_login=1&redirect=/checkout');
  }, [checkout, hydrated, user, router]);

  if (isLoading || cartLoading || !checkout || !cart) return isError ? <ErrorState onRetry={refetch} /> : <LoadingState />;
  if (!cart.items.length) return <LoadingState rows={1} />;

  const settings = checkout.payment;
  const queryError = params.get('error');
  const shippingFee = quote ? quote.shipping_fee : 0;
  const total = quote ? quote.total : cart.total;
  const free = shippingFee === 0;
  const freeThresholdMet = cart.is_free_shipping;

  const onSubmit = async (values) => {
    try {
      // `address_id` (a saved address picked above) is not part of the form schema: read it from the form directly.
      const result = await checkoutService.placeOrder({ ...values, address_id: getValues('address_id') });
      qc.invalidateQueries({ queryKey: cartKey });
      const url = result.next.url;
      if (/^https?:\/\//.test(url)) window.location.assign(url);
      else router.push(url);
    } catch (error) {
      showToast(toFriendlyMessage(error, locale), 'error');
    }
  };

  const err = (name) => errors[name]?.message;

  return (
    <section className="commerce-page checkout-page">
      <div className="container">
        <header className="commerce-heading">
          <span className="commerce-kicker">
            <Icon name="shield-check" size={16} />
            {tr('دفع آمن', 'Secure checkout')}
          </span>
          <h1>{tr('إنهاء الطلب والدفع', 'Checkout & Payment')}</h1>
          <p>{tr('أدخل بيانات العنوان الوطني السعودي للتوصيل المبرد واختر طريقة الدفع المناسبة', 'Enter your Saudi national address details for refrigerated delivery and select payment method')}</p>
          <Link className="commerce-back" href="/cart">{tr('العودة إلى السلة', 'Back to cart')}</Link>
        </header>

        {queryError ? <Flash type="error">{queryError}</Flash> : null}

        <form className="checkout-layout" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="checkout-main" style={{ display: 'grid', gap: 24 }}>
            {/* STEP 1 */}
            <div className="checkout-card">
              <div className="checkout-section-heading"><h2>{tr('١. بيانات العميل والتواصل', '1. Customer & Contact Details')}</h2></div>
              <div className="checkout-fields">
                <FormField id="co-first" label={tr('الاسم الأول', 'First Name')} required error={err('first_name')}>
                  <input id="co-first" className="input" type="text" placeholder={tr('فهد', 'Fahad')} aria-invalid={!!errors.first_name} {...register('first_name')} />
                </FormField>
                <FormField id="co-last" label={tr('اسم العائلة', 'Last Name')} required error={err('last_name')}>
                  <input id="co-last" className="input" type="text" placeholder={tr('الناصر', 'Al-Nasser')} aria-invalid={!!errors.last_name} {...register('last_name')} />
                </FormField>
                <FormField id="co-phone" label={tr('رقم الجوال السعودي', 'Saudi Mobile Number')} required error={err('phone')}>
                  <input id="co-phone" className="input" type="tel" placeholder="0555123456" dir="ltr" style={{ textAlign: 'start' }} aria-invalid={!!errors.phone} {...register('phone')} />
                </FormField>
                <FormField id="co-email" label={tr('البريد الإلكتروني', 'Email Address')} required error={err('email')}>
                  <input id="co-email" className="input" type="email" placeholder="customer@example.com" aria-invalid={!!errors.email} {...register('email')} />
                </FormField>
              </div>
            </div>

            {/* STEP 2 */}
            <div className="checkout-card">
              <div className="checkout-section-heading"><h2>{tr('٢. طريقة الاستلام والعنوان', '2. Delivery Method & Address')}</h2></div>
              <fieldset className="radio-group radio-group--2">
                <legend>{tr('طريقة الاستلام', 'Delivery method')}</legend>
                <label className="choice" id="label-shipping-home">
                  <input type="radio" value="home_delivery" {...register('shipping_type')} />
                  <span>
                    <strong>{tr('توصيل للمنزل (شحن مبرد)', 'Home Delivery (Refrigerated Fleet)')}</strong>
                    <small>{tr('العنوان الوطني لجميع مدن المملكة', 'National Address for all KSA cities')}</small>
                  </span>
                </label>
                <label className="choice" id="label-shipping-branch">
                  <input type="radio" value="branch_pickup" {...register('shipping_type')} />
                  <span>
                    <strong>{tr('استلام من الفرع (مجاناً)', 'Boutique Pickup (Free)')}</strong>
                    <small>
                      {checkout.branches?.length
                        ? [...new Set(checkout.branches.map((b) => b.city).filter(Boolean))].join('، ')
                        : tr('فروع الرياض، جدة، المدينة المنورة', 'Riyadh, Jeddah & Madinah lounges')}
                    </small>
                  </span>
                </label>
              </fieldset>

              <div id="homeDeliveryFields" className={`checkout-address${shippingType === 'branch_pickup' ? ' hidden' : ''}`}>
                {checkout.savedAddresses.length > 0 && (
                  <FormField id="saved-address" label={tr('عناوينك المحفوظة', 'Your saved addresses')}>
                    <select
                      id="saved-address"
                      className="input select"
                      defaultValue=""
                      onChange={(e) => {
                        const a = checkout.savedAddresses.find((x) => String(x.id) === e.target.value);
                        if (!a) return;
                        setValue('address_id', a.id);
                        setValue('city', a.city || 'الرياض');
                        setValue('district', a.district || '');
                        setValue('address', a.street_address || a.address || '');
                      }}
                    >
                      <option value="">{tr('اختر عنواناً…', 'Choose an address…')}</option>
                      {checkout.savedAddresses.map((a) => (
                        <option key={a.id} value={a.id}>{a.title || a.city} — {a.street_address || a.address}</option>
                      ))}
                    </select>
                  </FormField>
                )}
                <div className="checkout-fields">
                  <FormField id="citySelect" label={tr('المدينة (المملكة العربية السعودية)', 'City (Saudi Arabia)')} required>
                    <select id="citySelect" className="input select" {...register('city')}>
                      {checkout.cities.map((c) => (
                        <option key={c.id ?? c.city_name_ar} value={c.city_name_ar}>
                          {isRtl ? c.city_name_ar : c.city_name_en || c.city_name_ar} - {cart.subtotal >= cart.free_shipping_threshold ? tr('شحن مجاني', 'Free Shipping') : `${numberFormat(c.shipping_fee, 0)} ${currency}`}
                        </option>
                      ))}
                    </select>
                    <span className="field-hint" id="cityDeliveryNote">
                      <Icon name="snowflake" size={14} /> <span id="cityDeliveryNoteText">{quote?.delivery_estimate || tr('توصيل مبرد سريع ومضمون', 'Fast refrigerated delivery')}</span>
                    </span>
                  </FormField>
                  <FormField id="co-district" label={tr('الحي', 'District / Neighborhood')} required>
                    <input id="co-district" className="input" type="text" placeholder={tr('مثال: حي النرجس / حي الروضة', 'e.g. Al-Narjis / Al-Rawdah')} {...register('district')} />
                  </FormField>
                  <FormField id="co-address" className="checkout-full" label={tr('العنوان الوطني / الشارع ورقم المبنى', 'National Address / Street & Building')} required error={err('address')}>
                    <input id="co-address" className="input" type="text" placeholder={tr('اسم الشارع، رقم العمارة، أي علامة مميزة', 'Street name, building number, landmark')} aria-invalid={!!errors.address} {...register('address')} />
                  </FormField>
                </div>
                {user && (
                  <label className="choice" style={{ marginTop: 8 }}>
                    <input type="checkbox" {...register('save_address')} />
                    <span>{tr('حفظ هذا العنوان في حسابي', 'Save this address to my account')}</span>
                  </label>
                )}
              </div>

              <fieldset id="branchPickupFields" className={`radio-group${shippingType === 'branch_pickup' ? '' : ' hidden'}`}>
                <legend>{tr('اختر الفرع الأقرب للاستلام', 'Select nearest boutique for pickup')}</legend>
                {(checkout.branches?.length
                  ? checkout.branches.map((b) => [b.id, b.name, [b.city, b.address].filter(Boolean).join(' — ')])
                  : [
                      ['riyadh', tr('فرع الرياض', 'Riyadh Boutique'), tr('طريق الملك فهد (مقابل البرج)', 'King Fahd Road')],
                      ['jeddah', tr('فرع جدة', 'Jeddah Boutique'), tr('طريق الكورنيش الشمالي', 'North Corniche Road')],
                      ['madinah', tr('فرع المدينة', 'Madinah Boutique'), tr('طريق سلطانة التجاري', 'Sultana Commercial Road')],
                    ]
                ).map(([val, name, hint]) => (
                  <label className="choice" key={val}>
                    <input type="radio" value={val} {...register('pickup_branch')} />
                    <span><strong>{name}</strong><small>{hint}</small></span>
                  </label>
                ))}
              </fieldset>

              <FormField id="co-notes" label={tr('ملاحظات التوصيل أو وقت الاستلام (اختياري)', 'Delivery Notes or Preferred Timing (Optional)')} error={err('notes')}>
                <textarea id="co-notes" className="input textarea" rows={2} placeholder={tr('يرجى الاتصال قبل الوصول، تغليف هدايا إضافي...', 'Please call before arrival, gift wrapping notes...')} {...register('notes')} />
              </FormField>
            </div>

            {/* STEP 3 */}
            <div className="checkout-card">
              <div className="checkout-section-heading"><h2>{tr('٣. طريقة الدفع', '3. Payment Method')}</h2></div>
              <fieldset className="radio-group radio-group--1">
                <legend className="sr-only">{tr('طريقة الدفع', 'Payment method')}</legend>
                {methods.map(([val, name, desc, mark]) => (
                  <label className="choice payment-method-opt" key={val}>
                    <input type="radio" value={val} {...register('payment_method')} />
                    <span><strong>{name}</strong><small>{desc}</small></span>
                    <span className="choice-mark">{mark}</span>
                  </label>
                ))}
                {settings.enable_bank_transfer && (
                  <label className="choice payment-method-opt" style={{ flexWrap: 'wrap' }}>
                    <input type="radio" value="bank_transfer" {...register('payment_method')} />
                    <span><strong>{tr('التحويل البنكي المباشر', 'Direct Bank Transfer')}</strong><small>{settings.bank_name}</small></span>
                    <span className="choice-mark">{tr('تحويل بنكي', 'Bank Transfer')}</span>
                    <div className="checkout-notice" style={{ flexBasis: '100%' }}>
                      <div><b>{tr('المستفيد:', 'Beneficiary:')}</b> {settings.bank_account_name}</div>
                      <div><b>{tr('الآيبان (IBAN):', 'IBAN:')}</b> <bdi dir="ltr">{settings.bank_iban}</bdi></div>
                    </div>
                  </label>
                )}
              </fieldset>
              {err('payment_method') ? <span className="field-error" role="alert">{err('payment_method')}</span> : null}
            </div>
          </div>

          <aside className="commerce-summary checkout-summary">
            <h2>{tr('ملخص الفاتورة', 'Order Summary')}</h2>
            <div className="checkout-summary-items">
              {cart.items.map((item) => (
                <div className="checkout-summary-item" key={item.key}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset(item.image || 'assets/images/home/ajwa.webp')} alt="" />
                  <div>
                    <strong>{item.product_name}</strong>
                    <small>{item.size_name} × {item.quantity}</small>
                  </div>
                  <strong>{item.subtotal_formatted}</strong>
                </div>
              ))}
            </div>

            <div className="summary-row"><span>{tr('قيمة المنتجات', 'Products subtotal')}</span><strong>{cart.subtotal_formatted}</strong></div>
            {cart.discount > 0 && (
              <div className="summary-row summary-row--discount">
                <span>{isRtl ? `خصم الكوبون (${cart.coupon_code})` : `Promo discount (${cart.coupon_code})`}</span>
                <strong>- {cart.discount_formatted}</strong>
              </div>
            )}
            <div className="summary-row">
              <span>{tr('رسوم الشحن والتوصيل', 'Refrigerated shipping')}</span>
              <strong id="summaryShippingFee">{free ? tr('مجاناً', 'FREE') : `${numberFormat(shippingFee, 2)} ${currency}`}</strong>
            </div>
            <div className="summary-row summary-row--total">
              <span>
                {tr('المجموع النهائي', 'Grand total')}
                <br />
                <small className="muted">{tr('شامل ضريبة القيمة المضافة', 'Includes 15% VAT')}</small>
              </span>
              <strong><span id="summaryGrandTotal">{numberFormat(total, 2)}</span> {currency}</strong>
            </div>

            <button type="submit" className="button button--primary commerce-primary-action" disabled={isSubmitting}>
              {isSubmitting ? tr('جارٍ تأكيد الطلب…', 'Placing your order…') : tr('تأكيد الطلب الآن', 'Place Order Now')}
              <Icon name="arrow-left" size={18} className="directional-arrow" />
            </button>
            <p className="commerce-security-note">
              {tr('بالضغط على تأكيد الطلب، فإنك توافق على شروط وسياسة الشحن في متجر تمرنا للتمور الفاخرة.', 'By placing this order, you agree to Tumurna Luxury Dates shipping and quality terms.')}
            </p>
            {freeThresholdMet ? null : null}
          </aside>
        </form>
      </div>
    </section>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CheckoutForm />
    </Suspense>
  );
}
