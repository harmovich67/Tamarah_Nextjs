'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, profileInfoSchema } from '@tamrna/shared/schemas';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { Icon } from '@tamrna/shared/components/Icon';
import { numberFormat } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import { FormField, Flash } from '@/components/ui/FormField';
import { ErrorState } from '@/components/ui/States';
import { PasswordField } from '@/components/ui/PasswordField';
import { accountService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/store/toastStore';
import AccountShell, { overviewKey } from './AccountShell';

function PersonalInfoCard({ user, editing, onDone }) {
  const { locale, tr } = useLocale();
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(profileInfoSchema(locale)), values: { name: user.name || '', email: user.email || '', phone: user.phone || '' } });

  const save = useMutation({
    mutationFn: (values) => accountService.updateInfo(values),
    onSuccess: (updated) => {
      setUser({ ...user, ...updated });
      qc.invalidateQueries({ queryKey: overviewKey });
      onDone();
      showToast(tr('تم تحديث بيانات الحساب بنجاح!', 'Your account details were updated!'), 'success');
    },
    onError: (e) => {
      if (e?.errors) Object.entries(e.errors).forEach(([f, m]) => setFieldError(f, { message: [].concat(m)[0] }));
      setError(toFriendlyMessage(e, locale));
    },
  });

  return (
    <section className="account-card">
      <header>
        <span><Icon name="user-round" size={21} /></span>
        <h2>{tr('المعلومات الشخصية', 'Personal information')}</h2>
      </header>
      {error ? <Flash type="error">{error}</Flash> : null}
      <form className="account-form" id="profileInfoForm" noValidate onSubmit={handleSubmit((v) => save.mutate(v))}>
        <FormField id="account-name" label={`${tr('الاسم الكامل', 'Full name')} *`} error={errors.name?.message}>
          <input id="account-name" className="input" type="text" readOnly={!editing} style={editing ? { background: '#fff' } : undefined} {...register('name')} />
        </FormField>
        <FormField id="account-email" label={tr('البريد الإلكتروني (اختياري)', 'Email (optional)')} error={errors.email?.message}>
          <input id="account-email" className="input" type="email" dir="ltr" readOnly={!editing} style={editing ? { background: '#fff' } : undefined} {...register('email')} />
        </FormField>
        <FormField id="account-phone" label={`${tr('رقم الجوال', 'Mobile number')} *`} error={errors.phone?.message}>
          <input id="account-phone" className="input" type="tel" dir="ltr" readOnly={!editing} style={editing ? { background: '#fff' } : undefined} {...register('phone')} />
        </FormField>
        {editing && (
          <div id="profile-save-container" style={{ marginTop: 6 }}>
            <button type="submit" className="button button--primary" style={{ width: '100%' }} disabled={save.isPending}>
              <Icon name="check" size={18} />
              {tr('حفظ التعديلات', 'Save changes')}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}

function ChangePasswordCard() {
  const { locale, tr } = useLocale();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(changePasswordSchema(locale)), defaultValues: { currentPassword: '', password: '', confirm: '' } });

  const change = useMutation({
    mutationFn: (v) => accountService.changePassword(v),
    onSuccess: () => {
      reset();
      setError('');
      showToast(tr('تم تحديث كلمة المرور بنجاح!', 'Your password was updated!'), 'success');
    },
    onError: (e) => setError(toFriendlyMessage(e, locale)),
  });

  return (
    <section className="account-card">
      <header>
        <span><Icon name="lock-keyhole" size={21} /></span>
        <h2>{tr('تغيير كلمة المرور', 'Change password')}</h2>
      </header>
      {error ? <div className="field-error" role="alert" style={{ marginBottom: 10 }}>{error}</div> : null}
      <form className="account-form" noValidate onSubmit={handleSubmit((v) => change.mutate(v))}>
        <PasswordField id="account-current" label={`${tr('كلمة المرور الحالية', 'Current password')} *`} autoComplete="current-password" error={errors.currentPassword?.message} registration={register('currentPassword')} />
        <PasswordField id="account-new" label={`${tr('كلمة المرور الجديدة', 'New password')} *`} autoComplete="new-password" error={errors.password?.message} registration={register('password')} />
        <PasswordField id="account-confirm" label={`${tr('تأكيد كلمة المرور الجديدة', 'Confirm new password')} *`} autoComplete="new-password" error={errors.confirm?.message} registration={register('confirm')} />
        <button type="submit" className="button button--primary" style={{ marginTop: 6, width: '100%' }} disabled={change.isPending}>
          <Icon name="lock" size={16} />
          {tr('تحديث كلمة المرور', 'Update password')}
        </button>
      </form>
    </section>
  );
}

/** Profile overview (resources/views/storefront/profile/index.php). */
export default function ProfilePage() {
  const { isRtl, tr, currency } = useLocale();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { data: overview, isError, refetch } = useQuery({ queryKey: overviewKey, queryFn: () => accountService.getOverview() });
  const setDefault = useMutation({
    mutationFn: (id) => accountService.setDefaultAddress(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: overviewKey }),
  });

  return (
    <AccountShell
      active="profile"
      heading={tr('الملف الشخصي', 'Profile')}
      headerExtra={
        <button type="button" className="button button--outline" id="account-toggle-edit-btn" onClick={() => setEditing((v) => !v)}>
          <Icon name="pencil" size={16} />
          <span id="account-toggle-edit-text">{editing ? tr('إلغاء التعديل', 'Cancel edit') : tr('تعديل البيانات', 'Edit profile')}</span>
        </button>
      }
    >
      {isError ? <ErrorState onRetry={refetch} /> : null}
      {overview && (
        <>
          <div className="account-profile-grid">
            <PersonalInfoCard user={overview.user} editing={editing} onDone={() => setEditing(false)} />
            <ChangePasswordCard />
          </div>

          <section className="account-card account-wide-card">
            <header><span><Icon name="map-pin" size={21} /></span><h2>{tr('عناويني', 'My addresses')}</h2></header>
            <div className="account-card-actions">
              <Link className="button button--outline" href="/profile/addresses"><Icon name="plus" size={16} />{tr('إضافة عنوان جديد', 'Add new address')}</Link>
            </div>
            {overview.addresses.length ? (
              <div className="account-address-grid">
                {overview.addresses.map((address, index) => {
                  const isDefault = !!address.is_default || index === 0;
                  return (
                    <article key={address.id} className={isDefault ? 'is-default' : ''}>
                      <span>{isDefault ? tr('العنوان الافتراضي', 'Default address') : tr('عنوان محفوظ', 'Saved address')}</span>
                      <h3>{address.city || 'الرياض'}</h3>
                      <p>{address.title || tr('المنزل', 'Home')} · {address.street_address || address.address}</p>
                      {address.landmark ? <small>{address.landmark}</small> : null}
                      <div>
                        <Link href="/profile/addresses" className="button button--ghost"><Icon name="pencil" size={14} />{tr('تعديل', 'Edit')}</Link>
                        {!isDefault && (
                          <button type="button" className="button button--ghost" onClick={() => setDefault.mutate(address.id)}>
                            <Icon name="check" size={14} />{tr('تعيين كافتراضي', 'Set as default')}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="account-empty">{tr('لا توجد عناوين محفوظة بعد.', 'No saved addresses yet.')}</p>
            )}
          </section>

          <section className="account-card account-wide-card">
            <header><span><Icon name="package" size={21} /></span><h2>{tr('أحدث طلباتي', 'Recent orders')}</h2></header>
            <div className="account-card-actions">
              <Link className="button button--outline" href="/profile/orders">
                {tr('عرض جميع الطلبات', 'View all orders')}
                <Icon name={isRtl ? 'chevron-left' : 'chevron-right'} size={15} />
              </Link>
            </div>
            {overview.recentOrders.length ? (
              <div className="account-orders-table">
                {overview.recentOrders.map((ro) => {
                  const statusKey = String(ro.shipping_status || 'confirmed').toLowerCase();
                  const lines = overview.recentOrderItems[ro.id] || [];
                  return (
                    <details key={ro.id}>
                      <summary>
                        <b dir="ltr">#{ro.order_number}</b>
                        <span>{String(ro.created_at).slice(0, 10)}</span>
                        <span>{ro.items_count} {tr('منتج', 'items')}</span>
                        <strong>{numberFormat(ro.total, 2)} {currency}</strong>
                        <em data-status={statusKey}>{ro.shipping_status || tr('الطلب مؤكد', 'Order confirmed')}</em>
                        <i>{tr('عرض التفاصيل', 'View details')}</i>
                      </summary>
                      <div className="account-order-details">
                        <p>{tr('شحن مبرد فاخر وسريع لحفظ جودة التمور.', 'Refrigerated express shipping across Saudi Arabia.')}</p>
                        {lines.length > 0 && (
                          <ul>
                            {lines.map((line) => (
                              <li key={line.id}>
                                <span>{line.quantity} × {line.product_name}</span>
                                <strong>{numberFormat(Number(line.price) * Number(line.quantity), 2)} {currency}</strong>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : (
              <p className="account-empty">{tr('لا توجد طلبات مسجلة بعد.', 'No orders yet.')}</p>
            )}
          </section>
        </>
      )}
    </AccountShell>
  );
}
