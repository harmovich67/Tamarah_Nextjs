'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { Icon } from '@tamrna/shared/components/Icon';
import { numberFormat } from '@tamrna/shared/utils';
import { useLocale } from '@/components/LocaleProvider';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { accountService } from '@/services';
import { showToast } from '@/store/toastStore';
import AccountShell from './AccountShell';

/* ----------------------------------------------------------------------------------------------- gift cards */
export function GiftCardsPage() {
  const { isRtl, tr } = useLocale();
  const { data: cards, isLoading, isError, refetch } = useQuery({ queryKey: ['account', 'gift-cards'], queryFn: () => accountService.listGiftCards() });
  const statusLabels = {
    unused: tr('صالحة للاستخدام', 'Available'),
    active: tr('صالحة للاستخدام', 'Available'),
    pending: tr('بانتظار الدفع', 'Awaiting payment'),
    used: tr('مستخدمة', 'Used'),
    expired: tr('منتهية', 'Expired'),
  };

  return (
    <AccountShell active="gift-cards" heading={tr('بطاقات الهدايا', 'Gift cards')}>
      <section className="account-card account-wide-card">
        <header><span><Icon name="gift" size={21} /></span><h2>{tr('بطاقات الهدايا الخاصة بي', 'My gift cards')}</h2></header>

        {isLoading ? <LoadingState rows={1} /> : isError ? <ErrorState onRetry={refetch} /> : !cards.length ? (
          <p className="account-empty">{tr('لا توجد بطاقات هدايا مرتبطة بحسابك بعد.', 'No gift cards are linked to your account yet.')}</p>
        ) : (
          <div className="account-gift-grid">
            {cards.map((card) => {
              const st = ['used', 'expired'].includes(card.status) ? card.status : 'unused';
              const digital = (card.card_type || 'digital') === 'digital';
              return (
                <article key={card.id} data-status={st}>
                  <div className="account-gift-visual">
                    <Icon name="gift" size={30} />
                    <span>{digital ? tr('رقمية', 'Digital') : tr('مطبوعة', 'Printed')}</span>
                    <strong>{numberFormat(card.amount, 0)} {tr('ر.س', 'SAR')}</strong>
                  </div>
                  <div className="account-gift-details">
                    <header>
                      <h3>{card.recipient_name || tr('مستلم الهدية', 'Gift Recipient')}</h3>
                      <em>{statusLabels[card.status] || statusLabels[st]}</em>
                    </header>
                    <dl>
                      <div><dt>{tr('الكود', 'Code')}</dt><dd dir="ltr">{card.code}</dd></div>
                      <div><dt>{tr('الرصيد', 'Balance')}</dt><dd>{numberFormat(card.balance, 2)} {tr('ر.س', 'SAR')}</dd></div>
                      <div><dt>{tr('تاريخ الإصدار', 'Issued')}</dt><dd>{String(card.created_at || '').slice(0, 10)}</dd></div>
                      <div><dt>{tr('الصلاحية', 'Validity')}</dt><dd>365 {tr('يومًا', 'days')}</dd></div>
                    </dl>
                    {card.message ? <p>{card.message}</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="account-gift-policy">
          <Icon name="shield-check" size={22} />
          <div>
            <strong>{tr('قاعدة الاستخدام', 'Redemption rule')}</strong>
            <p>{tr('يُنشأ الكود بعد نجاح الدفع، ويُستخدم مرة واحدة، ويجب استخدام كامل قيمة البطاقة في معاملة واحدة. الأنواع المفعلة حاليًا: رقمية ومطبوعة.', 'The code is issued after successful payment, is single-use, and its full value must be redeemed in one transaction. Digital and printed types are enabled.')}</p>
          </div>
        </div>

        <Link className="button button--primary account-section-action" href="/gift-cards">
          {tr('شراء بطاقة إهداء', 'Buy a gift card')}
          <Icon name={isRtl ? 'chevron-left' : 'chevron-right'} size={16} />
        </Link>
      </section>
    </AccountShell>
  );
}

/* ----------------------------------------------------------------------------------------- notifications */
export function NotificationsPage() {
  const { isEn, tr } = useLocale();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['account', 'notifications'], queryFn: () => accountService.listNotifications() });
  const refresh = () => qc.invalidateQueries({ queryKey: ['account', 'notifications'] });
  const markOne = useMutation({ mutationFn: (id) => accountService.markNotificationRead(id), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => accountService.markAllNotificationsRead(), onSuccess: refresh });

  return (
    <AccountShell active="notifications" heading={tr('الإشعارات', 'Notifications')}>
      <section className="account-card account-wide-card">
        <header><span><Icon name="bell" size={21} /></span><h2>{tr('الإشعارات', 'Notifications')}</h2></header>
        <div className="account-card-actions">
          <button type="button" className="button button--outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <Icon name="check" size={16} />{tr('تحديد الكل كمقروء', 'Mark all read')}
          </button>
        </div>

        {isLoading ? <LoadingState rows={1} /> : isError ? <ErrorState onRetry={refetch} /> : !data.length ? (
          <p className="account-empty">{tr('لا توجد إشعارات بعد.', 'No notifications yet.')}</p>
        ) : (
          <div className="account-notification-list">
            {data.map((item) => (
              <button type="button" key={item.id} onClick={() => !item.is_read && markOne.mutate(item.id)} className={`account-notification-item${item.is_read ? ' is-read' : ''}`} style={{ textAlign: 'start', width: '100%', cursor: 'pointer' }}>
                <i />
                <div>
                  <h3>{isEn ? item.title_en || item.title : item.title}</h3>
                  <p>{isEn ? item.body_en || item.body : item.body}</p>
                  <time>{item.created_at}</time>
                </div>
                <span>{item.is_read ? tr('مقروء', 'Read') : tr('جديد', 'New')}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </AccountShell>
  );
}

/* --------------------------------------------------------------------------------------------- settings */
export function SettingsPage() {
  const { locale, isEn, tr } = useLocale();
  const { data: prefs, isLoading, isError, refetch } = useQuery({ queryKey: ['account', 'preferences'], queryFn: () => accountService.getPreferences() });
  return (
    <AccountShell active="settings" heading={tr('الإعدادات', 'Settings')}>
      {isLoading ? <LoadingState rows={1} /> : isError ? <ErrorState onRetry={refetch} /> : <SettingsForm prefs={prefs} locale={locale} isEn={isEn} />}
    </AccountShell>
  );
}

function SettingsForm({ prefs, locale, isEn }) {
  const { tr } = useLocale();
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: prefs });
  const save = useMutation({
    mutationFn: (v) => accountService.savePreferences(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['account', 'preferences'] }); showToast(tr('تم حفظ الإعدادات بنجاح على هذا المتصفح.', 'Settings saved on this browser.'), 'success'); },
    onError: (e) => showToast(toFriendlyMessage(e, locale), 'error'),
  });

  return (
    <section className="account-card account-wide-card">
      <header><span><Icon name="settings" size={21} /></span><h2>{tr('الإعدادات', 'Settings')}</h2></header>
      <form onSubmit={handleSubmit((v) => save.mutate(v))}>
        <div className="account-settings">
          <section>
            <h3>{tr('تفضيلات الإشعارات', 'Notification preferences')}</h3>
            <p>{tr('تحكم في أنواع التنبيهات التي ترغب في رؤيتها داخل حسابك.', 'Choose the alerts shown in your account.')}</p>
            <label className="choice"><input type="checkbox" {...register('orders')} /><span>{tr('تحديثات الطلب والشحن', 'Order and shipping updates')}</span></label>
            <label className="choice"><input type="checkbox" {...register('gifts')} /><span>{tr('تحديثات بطاقات الهدايا', 'Gift-card updates')}</span></label>
            <label className="choice"><input type="checkbox" {...register('marketing')} /><span>{tr('رسائل العروض والتسويق', 'Offers and marketing messages')}</span></label>
          </section>
          <section>
            <h3>{tr('اللغة', 'Language')}</h3>
            <p>{tr('يمكن تغيير لغة واجهة الحساب من الرابط التالي.', 'Change the account interface language.')}</p>
            <a href={`/lang/${isEn ? 'ar' : 'en'}`} className="button button--outline">{isEn ? 'العربية' : 'English'}</a>
          </section>
        </div>
        <button type="submit" className="button button--primary account-section-action" disabled={save.isPending}>{tr('حفظ الإعدادات', 'Save settings')}</button>
      </form>
    </section>
  );
}
