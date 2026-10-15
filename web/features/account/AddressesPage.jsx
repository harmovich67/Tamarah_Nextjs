'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema } from '@tamrna/shared/schemas';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { Icon } from '@tamrna/shared/components/Icon';
import { isSaudiMobile } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import { FormField, Flash } from '@/components/ui/FormField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/hooks/useAuth';
import { accountService } from '@/services';
import { showToast } from '@/store/toastStore';
import AccountShell, { overviewKey } from './AccountShell';

const TITLE_ICONS = { العمل: 'store', Work: 'store', استراحة: 'tree-palm', مزرعة: 'tree-palm', Lounge: 'tree-palm', إهداء: 'gift', Gift: 'gift' };

function AddressDialog({ open, address, cities, user, isFirst, onClose }) {
  const { locale, isRtl, tr } = useLocale();
  const qc = useQueryClient();
  const [serverError, setServerError] = useState('');
  const editing = !!address;
  const defaults = {
    title: 'المنزل',
    recipient_name: user?.name || '',
    phone: user?.phone || '',
    city: 'الرياض',
    street_address: '',
    building_floor: '',
    landmark: '',
    is_default: isFirst,
  };
  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(addressSchema(locale)), defaultValues: defaults, mode: 'onChange' });
  const phone = useWatch({ control, name: 'phone' });

  useEffect(() => {
    if (!open) return;
    setServerError('');
    reset(
      address
        ? { id: address.id, title: address.title || 'المنزل', recipient_name: address.recipient_name || '', phone: address.phone || '', city: address.city || 'الرياض', street_address: address.street_address || '', building_floor: address.building_floor || '', landmark: address.landmark || '', is_default: address.is_default == 1 }
        : defaults,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, address]);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const save = useMutation({
    mutationFn: (v) => accountService.saveAddress(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account'] });
      showToast(tr('تم حفظ العنوان بنجاح', 'Address saved'), 'success');
      onClose();
    },
    onError: (e) => {
      if (e?.errors) Object.entries(e.errors).forEach(([f, m]) => setError(f, { message: [].concat(m)[0] }));
      setServerError(toFriendlyMessage(e, locale));
    },
  });

  const phoneOk = isSaudiMobile(phone || '');
  const labels = [
    ['المنزل', tr('المنزل', 'Home')],
    ['العمل', tr('العمل', 'Office')],
    ['استراحة', tr('استراحة', 'Farm / Rest')],
    ['إهداء', tr('إهداء', 'Gift')],
  ];
  const aria = (name) => (errors[name] ? 'true' : undefined);

  return (
    <>
      <div className={`global-overlay${open ? '' : ' hidden'}`} id="addressOverlay" onClick={onClose} />
      <div className={`dialog${open ? '' : ' hidden'}`} id="addressModal" dir={isRtl ? 'rtl' : 'ltr'} role="dialog" aria-modal="true" aria-labelledby="modalAddressTitle" style={{ maxWidth: '36rem' }}>
        <div className="dialog-heading">
          <div>
            <h2 id="modalAddressTitle">{editing ? tr('تعديل العنوان الوطني', 'Edit National Address') : tr('إضافة عنوان وطني للتوصيل', 'Add Saudi National Address')}</h2>
            <p className="muted">{tr('توصيل مبرد لحفظ نضارة وجودة التمور', 'Shipping with temperature control across KSA')}</p>
          </div>
          <button type="button" className="button button--icon" onClick={onClose} aria-label={tr('إغلاق', 'Close')}><Icon name="x" size={20} /></button>
        </div>

        {serverError ? <Flash type="error">{serverError}</Flash> : null}
        <form id="addressForm" className="account-form" style={{ marginTop: 18 }} noValidate onSubmit={handleSubmit((v) => save.mutate(v))}>
          <fieldset className="radio-group address-labels">
            <legend>{tr('نوع ومسمى العنوان', 'Address Label')}</legend>
            {labels.map(([val, label]) => (
              <label className="choice" key={val}><input type="radio" value={val} {...register('title')} /><span>{label}</span></label>
            ))}
          </fieldset>

          <FormField id="recipientNameInput" label={`${tr('اسم المستلم الثلاثي', 'Recipient Full Name')} *`} error={errors.recipient_name?.message}>
            <input id="recipientNameInput" className="input" placeholder={tr('مثال: فهد بن عبد العزيز الناصر', 'e.g. Fahad Al-Otaibi')} aria-invalid={aria('recipient_name')} {...register('recipient_name')} />
          </FormField>

          <FormField id="phoneInput" label={<>{tr('رقم الجوال السعودي', 'Saudi Mobile Number')} * <span id="phoneBadge" className="field-hint" style={{ color: phoneOk ? 'var(--color-success)' : 'var(--color-error)' }}>{phoneOk ? '✓ رقم جوال سعودي معتمد' : 'صيغة غير مكتملة'}</span></>} error={errors.phone?.message}>
            <input id="phoneInput" type="tel" className="input" dir="ltr" style={{ textAlign: 'start' }} placeholder="05XXXXXXXX" maxLength={14} aria-invalid={aria('phone')} {...register('phone')} />
          </FormField>

          <FormField id="citySelect" label={`${tr('المدينة السعودية', 'Saudi City / Region')} *`} error={errors.city?.message}>
            <select id="citySelect" className="input select" aria-invalid={aria('city')} {...register('city')}>
              <option value="">-- {tr('اختر المدينة', 'Choose City')} --</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="field-hint"><Icon name="snowflake" size={12} /> {tr('الشحن المبرد متوفر لكافة أحياء هذه المدينة', 'Cold express delivery available for this city')}</span>
          </FormField>

          <FormField id="streetInput" label={`${tr('الحي واسم الشارع', 'District & Street Name')} *`} error={errors.street_address?.message}>
            <input id="streetInput" className="input" placeholder={tr('مثال: حي النرجس، طريق عثمان بن عفان', 'e.g. Al Narjis District, Othman Bin Affan Rd')} aria-invalid={aria('street_address')} {...register('street_address')} />
          </FormField>

          <div className="checkout-fields" style={{ gap: 10 }}>
            <FormField id="buildingInput" label={tr('رقم المبنى / الفيلا (اختياري)', 'Building / Villa No.')}>
              <input id="buildingInput" className="input" placeholder={tr('مثال: فيلا 14، الدور الثاني', 'e.g. Villa 14')} {...register('building_floor')} />
            </FormField>
            <FormField id="landmarkInput" label={tr('علامة مميزة (اختياري)', 'Nearest Landmark')}>
              <input id="landmarkInput" className="input" placeholder={tr('بجوار جامع التقوى أو الحديقة', 'Near mosque or park')} {...register('landmark')} />
            </FormField>
          </div>

          <label className="choice">
            <input type="checkbox" id="isDefaultCheck" {...register('is_default')} />
            <span>{tr('تعيين كعنوان وطني رئيسي ومعتمد لجميع الطلبات القادمة', 'Set as default address for future orders')}</span>
          </label>

          <div className="address-form-actions">
            <button type="button" className="button button--outline" onClick={onClose}>{tr('إلغاء', 'Cancel')}</button>
            <button type="submit" id="submitAddressBtn" className="button button--primary" disabled={isSubmitting || save.isPending}>
              <Icon name="check" size={18} />
              <span id="submitAddressText">{editing ? tr('تحديث العنوان الوطني', 'Update Address') : tr('حفظ العنوان الوطني', 'Save National Address')}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/** Address book (profile/addresses.php). */
export default function AddressesPage() {
  const { locale, tr } = useLocale();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['account', 'addresses'], queryFn: () => accountService.listAddresses(), enabled: !!user });
  const [dialog, setDialog] = useState({ open: false, address: null });

  const setDefault = useMutation({
    mutationFn: (id) => accountService.setDefaultAddress(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['account'] }); showToast(tr('تم حفظ العنوان بنجاح', 'Address saved'), 'success'); },
    onError: (e) => showToast(toFriendlyMessage(e, locale), 'error'),
  });
  const remove = useMutation({
    mutationFn: (id) => accountService.deleteAddress(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['account'] }); showToast(tr('تم حذف العنوان', 'Address deleted'), 'success'); },
    onError: (e) => showToast(toFriendlyMessage(e, locale), 'error'),
  });

  const addresses = data?.addresses || [];
  const limits = data?.limits || { allowMultiple: true, max: 10 };
  const canAdd = (limits.allowMultiple || addresses.length === 0) && addresses.length < limits.max;
  const open = (address = null) => setDialog({ open: true, address });
  const close = () => setDialog((d) => ({ ...d, open: false }));

  return (
    <AccountShell active="addresses" heading={tr('دفتر العناوين الوطنية للتوصيل', 'National Addresses Book')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <p className="muted" style={{ margin: 0 }}>{tr('إدارة عناوين التوصيل المبرد السريع لتمورك الملكية داخل كافة مدن المملكة', 'Manage your saved delivery addresses for fast refrigerated shipping across Saudi Arabia')}</p>
        {canAdd ? (
          <button type="button" className="button button--primary" onClick={() => open(null)}><Icon name="plus" size={18} />{tr('إضافة عنوان وطني جديد', 'Add New Address')}</button>
        ) : data ? (
          <span className="badge badge--preorder">{!limits.allowMultiple ? tr('مسموح بعنوان واحد فقط', 'Single address limit') : tr('تم الوصول للحد الأقصى للعناوين', 'Maximum addresses reached')}</span>
        ) : null}
      </div>

      {isLoading ? <LoadingState rows={2} /> : isError ? <ErrorState onRetry={refetch} /> : !addresses.length ? (
        <div className="account-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Icon name="map-pin" size={44} stroke={1.3} />
          <h2 style={{ marginTop: 10 }}>{tr('لم تقم بحفظ أي عنوان وطني بعد', 'No addresses saved yet')}</h2>
          <p className="muted" style={{ margin: '8px auto 18px', maxWidth: '30rem', lineHeight: 1.8 }}>{tr('أضف عنوانك الوطني لإنهاء طلباتك بشكل فوري مع خدمة الشحن المبرد حتى باب منزلك.', 'Add your delivery addresses in Saudi cities for faster cold shipping checkout.')}</p>
          <button type="button" className="button button--primary" onClick={() => open(null)}><Icon name="plus" size={18} />{tr('إضافة عنوانك الأول', 'Add First Address')}</button>
        </div>
      ) : (
        <div className="account-address-grid">
          {addresses.map((addr) => (
            <article key={addr.id} className={addr.is_default ? 'is-default' : ''}>
              {addr.is_default ? <span>{tr('الافتراضي', 'Default')}</span> : null}
              <h3><Icon name={TITLE_ICONS[addr.title] || 'home'} size={16} /> {addr.title || tr('المنزل', 'Home')} · <small>{addr.city || 'الرياض'}</small></h3>
              <p><b>{addr.recipient_name}</b></p>
              <p dir="ltr" style={{ textAlign: 'start' }}>{addr.phone}</p>
              <p>{addr.street_address}{addr.building_floor ? ` - ${addr.building_floor}` : ''}</p>
              {addr.landmark ? <small><Icon name="map-pin" size={12} /> <b>{tr('علامة مميزة', 'Landmark')}:</b> {addr.landmark}</small> : null}
              <div>
                {!addr.is_default ? (
                  <button type="button" className="button button--ghost button--sm" onClick={() => setDefault.mutate(addr.id)}><Icon name="check-circle" size={14} />{tr('تعيين كافتراضي', 'Set as Default')}</button>
                ) : (
                  <small style={{ color: '#176044' }}><Icon name="shield-check" size={13} /> {tr('العنوان المعتمد', 'Main Default')}</small>
                )}
                <button type="button" className="button button--ghost button--sm" onClick={() => open(addr)} title={tr('تعديل', 'Edit')}><Icon name="pencil" size={14} />{tr('تعديل', 'Edit')}</button>
                <button type="button" className="button button--ghost button--sm" style={{ color: 'var(--color-error)' }} title={tr('حذف', 'Delete')} onClick={() => window.confirm(tr('هل أنت متأكد من رغبتك في حذف هذا العنوان؟', 'Are you sure you want to delete this address?')) && remove.mutate(addr.id)}>
                  <Icon name="trash-2" size={14} />{tr('حذف', 'Delete')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <AddressDialog open={dialog.open} address={dialog.address} cities={data?.cities?.length ? data.cities : ['الرياض']} user={user} isFirst={!addresses.length} onClose={close} />
    </AccountShell>
  );
}
