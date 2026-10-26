import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { numberFormat } from '@tamrna/shared/utils';
import { Alert, Button, Card, ErrorState, Icon, LinkButton, PageHeader, SectionHeading, SearchInput, SelectField, TextField } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { newOrderService as svc } from '@/services';

/**
 * New order from the dashboard: the admin builds a cart (the admin cart of the backend), picks the customer (a registered client
 * or a guest with name / phone / address) and the delivery type, then `POST /admin/checkout` creates the order.
 */
const BLANK = { customer: 'client', userId: '', name: '', phone: '', cityId: '', district: '', street: '', nationalAddress: '', deliveryType: 'delivery', branchId: '', giftCardCode: '' };
const CART_KEY = ['admin-cart'];

function CartSection() {
  const { tr } = useT();
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState(1);

  const cart = useQuery({ queryKey: CART_KEY, queryFn: () => svc.getCart() });
  const products = useQuery({ queryKey: ['admin-order-products'], queryFn: () => svc.listProductChoices(), staleTime: 60_000 });
  const variants = useQuery({ queryKey: ['admin-order-variants', productId], queryFn: () => svc.listVariants(productId), enabled: !!productId });

  const invalidate = { invalidate: [CART_KEY] };
  const add = useAdminMutation(() => svc.addToCart({ variantId, quantity: qty }), { ...invalidate, success: tr('أُضيف المنتج للسلة', 'Added to the cart'), onSuccess: () => setQty(1) });
  const update = useAdminMutation((v) => svc.updateCartItem(v), invalidate);
  const remove = useAdminMutation((id) => svc.removeCartItem(id), invalidate);
  const clear = useAdminMutation(() => svc.clearCart(), { ...invalidate, success: tr('تم تفريغ السلة', 'Cart cleared') });

  // Pick the default pack as soon as a product's packs arrive.
  useEffect(() => {
    if (!variants.data?.length) return;
    if (!variants.data.some((v) => String(v.id) === String(variantId))) setVariantId(String((variants.data.find((v) => v.isDefault) || variants.data[0]).id));
  }, [variants.data, variantId]);

  const items = cart.data?.items ?? [];

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      <SectionHeading icon="shopping-bag">{tr('١. المنتجات (سلة الطلب)', '1. Products (order cart)')}</SectionHeading>

      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.4fr_90px_auto] gap-3 items-end">
        <SelectField label={tr('المنتج', 'Product')} value={productId} onChange={(e) => { setProductId(e.target.value); setVariantId(''); }}>
          <option value="">{products.isLoading ? tr('جارٍ التحميل…', 'Loading…') : tr('اختر منتجاً…', 'Choose a product…')}</option>
          {(products.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </SelectField>
        <SelectField label={tr('العبوة', 'Pack')} value={variantId} onChange={(e) => setVariantId(e.target.value)} disabled={!productId || variants.isLoading}>
          {(variants.data ?? []).map((v) => <option key={v.id} value={v.id}>{v.label} — {numberFormat(v.price, 2)}{v.stock != null ? ` (${tr('مخزون', 'stock')} ${v.stock})` : ''}</option>)}
        </SelectField>
        <TextField label={tr('الكمية', 'Qty')} type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
        <Button icon="plus-circle" loading={add.isPending} disabled={!variantId} onClick={() => add.mutate()}>{tr('إضافة', 'Add')}</Button>
      </div>

      {cart.error ? (
        <ErrorState title={tr('تعذر تحميل السلة', 'Could not load the cart')} onRetry={cart.refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} />
      ) : !items.length ? (
        <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-xl">{cart.isLoading ? tr('جارٍ تحميل السلة…', 'Loading the cart…') : tr('السلة فارغة. أضف منتجاً للبدء.', 'The cart is empty. Add a product to start.')}</p>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
              {i.image && !/\/assets\/images\//.test(i.image) ? <img src={i.image} alt="" className="w-11 h-11 rounded-lg object-cover border border-slate-200" /> : <span className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300"><Icon name="image" className="w-5 h-5" /></span>}
              <div className="flex-1 min-w-32">
                <p className="font-bold text-sm text-slate-900">{i.productName}</p>
                <p className="text-xs text-slate-500">{i.weight} · {numberFormat(i.unitPrice, 2)} {cart.data.currency}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 font-black" disabled={update.isPending || i.quantity <= 1} onClick={() => update.mutate({ id: i.id, quantity: i.quantity - 1 })} aria-label={tr('إنقاص', 'Decrease')}>−</button>
                <span className="w-8 text-center font-black text-sm">{i.quantity}</span>
                <button type="button" className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 font-black" disabled={update.isPending} onClick={() => update.mutate({ id: i.id, quantity: i.quantity + 1 })} aria-label={tr('زيادة', 'Increase')}>+</button>
              </div>
              <b className="w-24 text-end text-sm text-primary-700">{numberFormat(i.total, 2)} {cart.data.currency}</b>
              <button type="button" className="p-2 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 transition" disabled={remove.isPending} onClick={() => remove.mutate(i.id)} aria-label={tr('حذف', 'Remove')}>
                <Icon name="trash-2" className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" icon="trash-2" loading={clear.isPending} onClick={() => clear.mutate()}>{tr('تفريغ السلة', 'Clear cart')}</Button>
            <span className="text-sm font-black text-slate-900">{tr('المجموع:', 'Subtotal:')} <span className="text-primary-700">{numberFormat(cart.data.subtotal, 2)} {cart.data.currency}</span></span>
          </div>
        </div>
      )}
    </Card>
  );
}

function CustomerSection({ values, set, errors }) {
  const { tr } = useT();
  const [typed, setTyped] = useState('');
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setKeyword(typed.trim()), 350);
    return () => clearTimeout(id);
  }, [typed]);

  const clients = useQuery({ queryKey: ['admin-order-clients', keyword], queryFn: () => svc.searchClients(keyword), enabled: values.customer === 'client', placeholderData: (prev) => prev });
  const cities = useQuery({ queryKey: ['admin-order-cities'], queryFn: () => svc.listCities(), staleTime: 300_000 });
  const guest = values.customer === 'guest';
  const radio = (value, label) => (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
      <input type="radio" name="customer" className="accent-[#0f764a]" checked={values.customer === value} onChange={() => set({ customer: value })} />
      {label}
    </label>
  );

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      <SectionHeading icon="users">{tr('٢. العميل', '2. Customer')}</SectionHeading>
      <div className="flex flex-wrap gap-6">
        {radio('client', tr('عميل مسجّل', 'Registered client'))}
        {radio('guest', tr('عميل جديد (بدون حساب)', 'New customer (no account)'))}
      </div>

      {!guest ? (
        <div className="space-y-3">
          <SearchInput value={typed} onChange={setTyped} placeholder={tr('ابحث بالاسم أو الجوال أو البريد…', 'Search by name, phone or e-mail…')} className="w-full sm:w-96" />
          <SelectField label={tr('اختر العميل', 'Choose the client')} required error={errors.userId} value={values.userId} onChange={(e) => set({ userId: e.target.value })}>
            <option value="">{clients.isLoading ? tr('جارٍ البحث…', 'Searching…') : tr('اختر…', 'Select…')}</option>
            {(clients.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
          </SelectField>
          <p className="text-xs text-slate-500">{tr('يُستخدم عنوان العميل المحفوظ في حسابه.', "The client's saved address is used.")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={tr('الاسم', 'Name')} required error={errors.name} value={values.name} onChange={(e) => set({ name: e.target.value })} />
          <TextField label={tr('رقم الجوال (٩ أرقام بدون الصفر)', 'Mobile (9 digits, no leading 0)')} required dir="ltr" error={errors.phone} value={values.phone} onChange={(e) => set({ phone: e.target.value })} />
          <SelectField label={tr('المدينة', 'City')} required error={errors.cityId} value={values.cityId} onChange={(e) => set({ cityId: e.target.value })}>
            <option value="">{tr('اختر…', 'Select…')}</option>
            {(cities.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          <TextField label={tr('الحي', 'District')} required error={errors.district} value={values.district} onChange={(e) => set({ district: e.target.value })} />
          <TextField label={tr('الشارع', 'Street')} required error={errors.street} value={values.street} onChange={(e) => set({ street: e.target.value })} />
          <TextField label={tr('العنوان الوطني (اختياري)', 'National address (optional)')} error={errors.nationalAddress} value={values.nationalAddress} onChange={(e) => set({ nationalAddress: e.target.value })} />
        </div>
      )}
    </Card>
  );
}

function DeliverySection({ values, set, errors }) {
  const { tr } = useT();
  const branches = useQuery({ queryKey: ['admin-order-branches'], queryFn: () => svc.listBranches(), enabled: values.deliveryType === 'branch', staleTime: 300_000 });

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      <SectionHeading icon="truck">{tr('٣. التسليم', '3. Delivery')}</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label={tr('طريقة التسليم', 'Delivery type')} required error={errors.deliveryType} value={values.deliveryType} onChange={(e) => set({ deliveryType: e.target.value, branchId: '' })}>
          <option value="delivery">{tr('توصيل للمنزل', 'Home delivery')}</option>
          <option value="private">{tr('توصيل خاص', 'Private delivery')}</option>
          <option value="branch">{tr('استلام من فرع', 'Branch pickup')}</option>
        </SelectField>
        {values.deliveryType === 'branch' ? (
          <SelectField label={tr('الفرع', 'Branch')} required error={errors.branchId} value={values.branchId} onChange={(e) => set({ branchId: e.target.value })}>
            <option value="">{branches.isLoading ? tr('جارٍ التحميل…', 'Loading…') : tr('اختر الفرع…', 'Choose a branch…')}</option>
            {(branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}{b.city ? ` — ${b.city}` : ''}</option>)}
          </SelectField>
        ) : null}
        <TextField label={tr('كود بطاقة الهدايا (اختياري)', 'Gift card code (optional)')} dir="ltr" error={errors.giftCardCode} value={values.giftCardCode} onChange={(e) => set({ giftCardCode: e.target.value })} />
      </div>
    </Card>
  );
}

export default function NewOrderPage() {
  const { tr } = useT();
  const navigate = useNavigate();
  const [values, setValues] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const set = (patch) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch))));
  };
  const cart = useQuery({ queryKey: CART_KEY, queryFn: () => svc.getCart() });

  const place = useAdminMutation((v) => svc.placeOrder(v), {
    invalidate: [CART_KEY, ['orders'], ['dashboard']],
    success: (order) => tr(`تم إنشاء الطلب${order.orderNumber ? ` ${order.orderNumber}` : ''}`, `Order created${order.orderNumber ? ` ${order.orderNumber}` : ''}`),
    onSuccess: (order) => navigate(order.id ? `/orders/${order.id}` : '/orders'),
    onFieldErrors: (errs) => setErrors(Object.fromEntries(Object.entries(errs).map(([k, m]) => [k, [].concat(m)[0]]))),
  });

  const submit = () => {
    const missing = {};
    const need = tr('هذا الحقل مطلوب', 'This field is required');
    if (values.customer === 'client' && !values.userId) missing.userId = need;
    if (values.customer === 'guest') ['name', 'phone', 'cityId', 'district', 'street'].forEach((k) => { if (!String(values[k]).trim()) missing[k] = need; });
    if (values.deliveryType === 'branch' && !values.branchId) missing.branchId = need;
    setErrors(missing);
    if (Object.keys(missing).length) return;
    place.mutate(values);
  };

  const empty = !(cart.data?.items?.length);

  return (
    <div className="w-full space-y-6 pb-12 max-w-4xl">
      <PageHeader
        title={tr('طلب جديد من الداشبورد', 'New order from the dashboard')}
        subtitle={tr('أضف المنتجات للسلة ثم اختر العميل وطريقة التسليم', 'Add products to the cart, then choose the customer and the delivery')}
        actions={<LinkButton to="/orders" variant="secondary" icon="arrow-right">{tr('رجوع للطلبات', 'Back to orders')}</LinkButton>}
      />
      <CartSection />
      <CustomerSection values={values} set={set} errors={errors} />
      <DeliverySection values={values} set={set} errors={errors} />
      {empty && !cart.isLoading ? <Alert type="warning">{tr('أضف منتجاً واحداً على الأقل قبل إنشاء الطلب.', 'Add at least one product before creating the order.')}</Alert> : null}
      <div className="flex justify-end">
        <Button icon="check" loading={place.isPending} disabled={empty} onClick={submit}>{tr('إنشاء الطلب', 'Create order')}</Button>
      </div>
    </div>
  );
}
