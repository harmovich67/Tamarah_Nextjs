import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Alert, Button, ErrorState, Icon, PageLoading, PageHeader, SelectField, TextField, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { settingsService } from '@/services';

const card = 'bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-8 space-y-6 transition-all';

/** Heading row of a gateway card: brand tile, title, description and the enable select. */
function GatewayHeader({ tile, title, desc, enableName, enableLabels, register }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
      <div className="flex items-center gap-3.5">
        <div className={cx('w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-sm shrink-0 text-white', tile.className)}>{tile.content}</div>
        <div>
          <h3 className="text-lg font-black text-stone-900">{title}</h3>
          <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
        </div>
      </div>
      {enableName ? (
        <select aria-label={title} className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs font-black text-stone-900" {...register(enableName)}>
          <option value="1">{enableLabels[0]}</option>
          <option value="0">{enableLabels[1]}</option>
        </select>
      ) : null}
    </div>
  );
}

function TestConnection({ provider, label, getConfig }) {
  const { tr } = useT();
  const [state, setState] = useState(null);
  const test = useAdminMutation((cfg) => settingsService.testPaymentConnection({ provider, config: cfg }), {
    silentError: true,
    onSuccess: (r) => setState({ ok: r.success, message: r.message }),
  });
  return (
    <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <button
        type="button"
        onClick={() => { setState(null); test.mutate(getConfig(), { onError: () => setState({ ok: false, message: tr('حدث خطأ بالشبكة أثناء الاتصال', 'Network error occurred') }) }); }}
        disabled={test.isPending}
        className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs flex items-center gap-2 transition shadow-xs disabled:opacity-60"
      >
        <Icon name={test.isPending ? 'loader-2' : 'activity'} className={cx('w-4 h-4', test.isPending && 'animate-spin')} />
        <span>{label}</span>
      </button>
      {test.isPending ? <div className="text-xs font-bold px-4 py-2 rounded-xl bg-stone-100 text-stone-700 border border-stone-200">{tr('جاري فحص الاتصال بالخادم...', 'Testing connection...')}</div> : null}
      {state ? (
        <div role="status" className={cx('text-xs font-bold px-4 py-2 rounded-xl border flex items-center gap-2', state.ok ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-rose-50 text-rose-900 border-rose-300')}>
          <span className={cx('font-black', state.ok ? 'text-emerald-600' : 'text-rose-600')}>{state.ok ? '✓' : '✕'}</span> {state.message}
        </div>
      ) : null}
    </div>
  );
}

/** Payment gateways, COD, bank transfer and checkout policies (resources/views/admin/settings.php). */
export default function PaymentSettings() {
  const { t, tr: translate, currency } = useT();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['settings', 'payments'], queryFn: () => settingsService.getPaymentSettings() });
  const { register, reset, handleSubmit, getValues } = useForm({ defaultValues: {} });
  useEffect(() => {
    if (data) reset(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' && k.startsWith('enable_') ? '1' : v])));
  }, [data, reset]);

  const save = useAdminMutation((v) => settingsService.updatePaymentSettings(v), {
    invalidate: [['settings']],
    success: translate('تم حفظ إعدادات بوابات الدفع بنجاح!', 'Payment settings saved successfully!'),
  });

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorState title={translate('تعذر تحميل الإعدادات', 'Could not load settings')} onRetry={refetch} retryLabel={translate('إعادة المحاولة', 'Try again')} />;

  const tr2 = translate;
  const modes = (name, labelTest, labelLive, testVal = 'test', id) => (
    <SelectField label={tr2('بيئة العمل (Mode)', 'Environment (Mode)')} id={id} {...register(name)}>
      <option value={testVal}>{labelTest}</option>
      <option value="live">{labelLive}</option>
    </SelectField>
  );
  const labelCls = '[&_label]:font-black [&_label]:text-stone-800 [&_label]:text-xs';
  const cfg = (keys) => () => Object.fromEntries(keys.map((k) => [k, getValues(k)]));

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader title={t('payment_gateway_settings')} subtitle={tr2('ربط بوابات الدفع الإلكتروني، التحقق من مفاتيح الـ API، واختبار الاتصال الفعلي', 'Configure electronic payment gateways, verify API keys, and test live connections')} />

      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-8 text-sm" noValidate>
        {/* Paymob */}
        <div className={cx(card, 'hover:border-blue-800/40')}>
          <GatewayHeader tile={{ className: 'bg-blue-800', content: <span className="text-sm">paymob</span> }} title={t('paymob_title')} desc={t('paymob_desc')} enableName="enable_paymob" enableLabels={[tr2('مفعّلة (Active)', 'Active'), tr2('معطّلة (Disabled)', 'Disabled')]} register={register} />
          <div className={cx('grid grid-cols-1 sm:grid-cols-2 gap-6', labelCls)}>
            {modes('paymob_mode', tr2('بيئة تجريبية (Sandbox / Test Mode)', 'Sandbox / Test Mode'), tr2('بيئة حية إنتاجية (Live Production)', 'Live Production'))}
            <TextField label={`${t('paymob_api_key_label')} *`} type="password" dir="ltr" placeholder="ZXlKaGJHY2lPaUpTVXpVe..." autoComplete="off" {...register('paymob_api_key')} />
            <TextField label={`${t('paymob_integration_id_label')} *`} dir="ltr" placeholder="e.g. 123456" {...register('paymob_integration_id')} />
            <TextField label={`${t('paymob_iframe_id_label')} *`} dir="ltr" placeholder="e.g. 789012" {...register('paymob_iframe_id')} />
            <TextField label={t('paymob_hmac_label')} type="password" dir="ltr" placeholder="HMAC Secret Key" autoComplete="off" {...register('paymob_hmac')} />
          </div>
          <TestConnection provider="paymob" label={tr2('فحص اتصال Paymob الفعلي (Test Connection)', 'Test Paymob connection')} getConfig={cfg(['paymob_api_key', 'paymob_integration_id', 'paymob_iframe_id', 'paymob_hmac'])} />
        </div>

        {/* Moyasar / primary direct gateway */}
        <div className={cx(card, 'hover:border-emerald-800/40')}>
          <GatewayHeader tile={{ className: 'bg-emerald-800', content: <Icon name="credit-card" className="w-6 h-6" /> }} title={t('moyasar_title')} desc={t('moyasar_desc')} register={register} />
          <div className={cx('grid grid-cols-1 sm:grid-cols-2 gap-6', labelCls)}>
            <SelectField label={tr2('مزود بوابة الدفع المباشر (Primary Direct Gateway)', 'Primary direct gateway')} {...register('gateway_provider')}>
              <option value="moyasar">{tr2('ميسر (Moyasar - معتمد من البنك المركزي السعودي)', 'Moyasar (SAMA licensed)')}</option>
              <option value="stripe">{tr2('سترايب (Stripe Payments - بطاقات دولية وعالمية)', 'Stripe Payments (international cards)')}</option>
              <option value="paymob">{tr2('باي موب (Paymob - تحصيل بطاقات ومحافظ)', 'Paymob (cards & wallets)')}</option>
            </SelectField>
            {modes('gateway_mode', tr2('بيئة تجريبية واختبار (Sandbox / Test Mode)', 'Sandbox / Test Mode'), tr2('بيئة حية ومباشرة (Live Production)', 'Live Production'))}
            <TextField label={tr2('المفتاح العام (Publishable Key)', 'Publishable key')} dir="ltr" placeholder="pk_test_..." {...register('gateway_publishable_key')} />
            <TextField label={`${tr2('المفتاح السري (Secret Key)', 'Secret key')} *`} type="password" dir="ltr" placeholder="sk_test_... or sk_live_..." autoComplete="off" {...register('gateway_secret_key')} />
          </div>
          <div>
            <p className="font-black text-stone-800 text-xs mb-3">{tr2('طرق الدفع المفعلة عبر البوابة المباشرة:', 'Payment methods enabled on the direct gateway:')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[['enable_mada', 'mada', 'bg-[#0e8f4f]'], ['enable_apple_pay', 'Apple Pay', 'bg-black'], ['enable_credit_card', 'VISA', 'bg-blue-700']].map(([name, label, bg]) => (
                <div key={name} className="p-4 rounded-2xl border border-stone-200 bg-[#faf8f3] flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2"><span className={cx('px-2 py-0.5 rounded text-white text-[11px] font-bold', bg)}>{label}</span><span className="font-black text-xs text-stone-900">{name === 'enable_credit_card' ? tr2('فيزا / ماستركارد', 'Visa / Mastercard') : name === 'enable_mada' ? tr2('بطاقة مدى', 'Mada card') : 'Apple Pay'}</span></span>
                  <select aria-label={label} className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-bold" {...register(name)}>
                    <option value="1">{tr2('مفعل', 'Enabled')}</option>
                    <option value="0">{tr2('معطل', 'Disabled')}</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
          <TestConnection provider="moyasar" label={tr2('فحص اتصال Moyasar الفعلي (Test Connection)', 'Test Moyasar connection')} getConfig={cfg(['gateway_secret_key', 'gateway_publishable_key', 'gateway_mode'])} />
        </div>

        {/* Stripe */}
        <div className={cx(card, 'hover:border-[#635bff]/40')}>
          <GatewayHeader tile={{ className: 'bg-[#635bff]', content: <span className="text-base">stripe</span> }} title={t('stripe_title')} desc={t('stripe_desc')} register={register} />
          <p className="text-xs text-stone-600 leading-relaxed">{tr2('يستخدم Stripe المفتاحين العام والسري المُدخلين في بطاقة البوابة المباشرة أعلاه عند اختيار "سترايب" كمزود رئيسي.', 'Stripe uses the publishable and secret keys entered in the direct-gateway card above when "Stripe" is the primary provider.')}</p>
          <TestConnection provider="stripe" label={tr2('فحص اتصال Stripe الفعلي (Test Connection)', 'Test Stripe connection')} getConfig={cfg(['gateway_secret_key', 'gateway_publishable_key', 'gateway_mode'])} />
        </div>

        {/* Tamara */}
        <div className={cx(card, 'hover:border-rose-500/40')}>
          <GatewayHeader tile={{ className: 'bg-rose-500', content: <span className="text-sm">tamara</span> }} title={t('tamara_title')} desc={t('tamara_desc')} enableName="enable_tamara" enableLabels={[tr2('تمارا: مفعّلة في المتجر', 'Tamara: enabled'), tr2('تمارا: معطّلة', 'Tamara: disabled')]} register={register} />
          <div className={cx('grid grid-cols-1 sm:grid-cols-2 gap-6', labelCls)}>
            {modes('tamara_mode', tr2('بيئة تجريبية (Sandbox)', 'Sandbox'), tr2('بيئة إنتاجية حية (Live)', 'Live'), 'sandbox')}
            <TextField label={`${tr2('رمز التاجر (Merchant API Token)', 'Merchant API token')} *`} type="password" dir="ltr" placeholder="Bearer Token..." autoComplete="off" {...register('tamara_merchant_token')} />
            <TextField label={tr2('المفتاح العام (Public Key)', 'Public key')} dir="ltr" {...register('tamara_public_key')} />
          </div>
          <TestConnection provider="tamara" label={tr2('فحص اتصال Tamara الفعلي (Test Connection)', 'Test Tamara connection')} getConfig={cfg(['tamara_merchant_token', 'tamara_mode'])} />
        </div>

        {/* Tabby */}
        <div className={cx(card, 'hover:border-teal-500/40')}>
          <GatewayHeader tile={{ className: 'bg-teal-500', content: <span className="text-sm">tabby</span> }} title={t('tabby_title')} desc={t('tabby_desc')} enableName="enable_tabby" enableLabels={[tr2('تابي: مفعّلة في المتجر', 'Tabby: enabled'), tr2('تابي: معطّلة', 'Tabby: disabled')]} register={register} />
          <div className={cx('grid grid-cols-1 sm:grid-cols-2 gap-6', labelCls)}>
            {modes('tabby_mode', tr2('بيئة تجريبية (Sandbox)', 'Sandbox'), tr2('بيئة إنتاجية حية (Live)', 'Live'), 'sandbox')}
            <TextField label={tr2('المفتاح العام (Public Key)', 'Public key')} dir="ltr" placeholder="pk_test_..." {...register('tabby_public_key')} />
            <TextField label={`${tr2('المفتاح السري (Secret Key)', 'Secret key')} *`} type="password" dir="ltr" placeholder="sk_test_..." autoComplete="off" {...register('tabby_secret_key')} />
          </div>
          <TestConnection provider="tabby" label={tr2('فحص اتصال Tabby الفعلي (Test Connection)', 'Test Tabby connection')} getConfig={cfg(['tabby_secret_key', 'tabby_public_key', 'tabby_mode'])} />
        </div>

        {/* COD */}
        <div className={card}>
          <GatewayHeader tile={{ className: 'bg-amber-600', content: <Icon name="banknote" className="w-6 h-6" /> }} title={tr2('الدفع عند الاستلام (Cash On Delivery - COD)', 'Cash On Delivery (COD)')} desc={tr2('تحصيل قيمة الطلب نقداً أو عبر جهاز الشبكة عند وصول المندوب', 'Collect payment in cash or by card terminal when the courier arrives')} enableName="enable_cod" enableLabels={[tr2('الدفع عند الاستلام: مفعّل', 'COD: enabled'), tr2('معطّل', 'Disabled')]} register={register} />
          <div className={labelCls}>
            <TextField label={`${tr2('رسوم خدمة الدفع عند الاستلام الإضافية', 'Extra COD service fee')} (${currency})`} type="number" step="0.5" min="0" placeholder="0.00" hint={tr2('ضع 0 إذا كانت الخدمة مجانية بدون رسوم تحصيل إضافية', 'Enter 0 if the service is free of extra collection fees')} className="sm:max-w-sm" {...register('cod_fee')} />
          </div>
        </div>

        {/* Bank transfer */}
        <div className={card}>
          <GatewayHeader tile={{ className: 'bg-stone-800', content: <Icon name="database" className="w-6 h-6" /> }} title={tr2('التحويل البنكي المباشر (Bank Wire Transfer)', 'Direct Bank Transfer')} desc={tr2('عرض بيانات الحساب البنكي والآيبان للعميل عند إتمام الطلب', 'Show the bank account and IBAN to the customer at checkout')} enableName="enable_bank_transfer" enableLabels={[tr2('التحويل البنكي: مفعّل', 'Bank transfer: enabled'), tr2('معطّل', 'Disabled')]} register={register} />
          <div className={cx('grid grid-cols-1 sm:grid-cols-3 gap-6', labelCls)}>
            <TextField label={tr2('اسم البنك', 'Bank name')} {...register('bank_name')} />
            <TextField label={tr2('اسم صاحب الحساب (المستفيد)', 'Account holder (beneficiary)')} {...register('bank_account_name')} />
            <TextField label={tr2('رقم الآيبان الدولي (IBAN)', 'IBAN')} dir="ltr" placeholder="SA..." {...register('bank_iban')} />
          </div>
        </div>

        {/* Checkout policies */}
        <div className={card}>
          <GatewayHeader tile={{ className: 'bg-gold-50 !text-gold-700 border border-gold-200/60', content: <Icon name="truck" className="w-6 h-6" /> }} title={tr2('سياسات الشحن والشراء كزائر (Checkout Policies)', 'Shipping & guest checkout policies')} desc={tr2('تسعيرة الشحن القياسية، حد الشحن المجاني، والتحكم في إمكانية الشراء السريع', 'Standard shipping fee, free-shipping threshold and guest checkout control')} register={register} />
          <div className={cx('grid grid-cols-1 sm:grid-cols-3 gap-6', labelCls)}>
            <TextField label={`${tr2('رسوم الشحن القياسية', 'Standard shipping fee')} (${currency})`} type="number" step="0.5" min="0" {...register('shipping_standard_fee')} />
            <TextField label={`${tr2('حد الشحن المجاني للطلب', 'Free-shipping threshold')} (${currency})`} type="number" step="1" min="0" hint={tr2('الطلبات التي تتجاوز هذا المبلغ تحصل على شحن مجاني تلقائياً', 'Orders above this amount ship free automatically')} {...register('shipping_free_threshold')} />
            <SelectField label={tr2('تفعيل خيار الاستلام من الفرع', 'Enable branch pickup')} {...register('enable_branch_pickup')}>
              <option value="1">{tr2('مفعل (استلام مجاني من الفروع)', 'Enabled (free pickup from branches)')}</option>
              <option value="0">{tr2('معطل (توصيل فقط)', 'Disabled (delivery only)')}</option>
            </SelectField>
          </div>
          <div className={cx('pt-4 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center', labelCls)}>
            <SelectField label={tr2('سياسة حسابات العملاء وإتمام الشراء:', 'Customer accounts & checkout policy:')} {...register('allow_guest_checkout')}>
              <option value="1">{tr2('✅ مسموح بالشراء كزائر سريع (بدون إلزام تسجيل حساب)', '✅ Guest checkout allowed (no account required)')}</option>
              <option value="0">{tr2('🔒 إلزام تسجيل الدخول / إنشاء حساب لإتمام الشراء', '🔒 Require sign-in / account to complete the purchase')}</option>
            </SelectField>
            <Alert type="info" icon="info" className="!bg-slate-50 !border-slate-200/80 !text-slate-600 !font-medium leading-relaxed">
              {tr2('عند اختيار "إلزام تسجيل الدخول"، يتم تحويل أي زائر لصفحة الدخول/التسجيل مع الاحتفاظ بسلته وحقوله تلقائياً ليعود لإتمام الطلب.', 'When sign-in is required, guests are redirected to sign in / register while their cart is kept so they can complete the order.')}
            </Alert>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4">
          <Button type="submit" loading={save.isPending} icon="check-circle" className="!px-8 !py-3.5 !rounded-2xl !text-base !font-black shadow-lg shadow-primary-950/20">
            {tr2('حفظ كافة إعدادات ومفاتيح بوابات الدفع', 'Save all payment gateway settings')}
          </Button>
        </div>
      </form>
    </div>
  );
}
