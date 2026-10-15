'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { giftCardSchema } from '@tamrna/shared/schemas';
import { GIFT_CARD } from '@tamrna/shared/constants';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { Icon } from '@tamrna/shared/components/Icon';
import { useLocale } from '@/components/LocaleProvider';
import { FormField } from '@/components/ui/FormField';
import { useAuth } from '@/hooks/useAuth';
import { useCartActions } from '@/hooks/useCart';
import { asset } from '@/lib/asset';

const CARD_FACE = 'assets/images/gift/gift-card-face.webp';

/**
 * Gift card builder (resources/views/storefront/gift_cards.php). The configured card becomes a cart line via
 * cartService.addGiftCard(); the code is issued at checkout and activated once the order is paid.
 */
export default function GiftCardBuilder() {
  const { locale, isRtl, isEn, tr, currency, money } = useLocale();
  const { user } = useAuth();
  const { addGiftCard } = useCartActions();
  const [customSelected, setCustomSelected] = useState(false);
  const [formError, setFormError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(giftCardSchema(locale)),
    defaultValues: { card_type: 'digital', amount: GIFT_CARD.PRESET_AMOUNTS[0], sender_name: '', sender_phone: '', recipient_name: '', recipient_phone: '', recipient_email: '', message: '' },
  });
  const { register, handleSubmit, setValue, getValues, control, formState: { errors } } = form;
  const [cardType, amount, sender, recipient, message] = useWatch({ control, name: ['card_type', 'amount', 'sender_name', 'recipient_name', 'message'] });

  // Prefill the sender from the signed-in account (once known).
  useEffect(() => {
    if (!user) return;
    if (!getValues('sender_name')) setValue('sender_name', user.name || '');
    if (!getValues('sender_phone')) setValue('sender_phone', user.phone || '');
  }, [user, getValues, setValue]);

  useEffect(() => {
    if (!previewOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setPreviewOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [previewOpen]);

  const typeLabel = (t) => (t === 'printed' ? tr('بطاقة مطبوعة فاخرة', 'Luxury printed card') : tr('بطاقة رقمية', 'Digital card'));

  const onSubmit = (values) => {
    setFormError('');
    addGiftCard.mutate(values, {
      onError: (error) => setFormError(toFriendlyMessage(error, locale)),
    });
  };
  const onInvalid = (errs) => {
    const first = Object.values(errs)[0];
    setFormError(first?.message || tr('يرجى مراجعة البيانات', 'Please review the details'));
  };

  const pickPreset = (value) => {
    setCustomSelected(false);
    setValue('amount', value, { shouldValidate: false });
  };

  return (
    <>
      <div className="gift-builder gift-builder--approved">
        <section className="gift-builder-hero" aria-labelledby="gift-builder-title">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="gift-builder-hero-bg" src={asset('assets/images/home/hero.webp')} alt="" />
          <div className="gift-builder-hero-shade" />
          <div className="gift-builder-hero-art">
            <div className="gift-approved-card-stack">
              <div className="gift-approved-card gift-approved-card--compact">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset(CARD_FACE)} alt="" />
              </div>
            </div>
          </div>
          <div className="gift-builder-hero-copy">
            <Icon name="gift" size={40} stroke={1.5} />
            <span>{tr('بطاقات الهدايا', 'Gift cards')}</span>
            <h1 id="gift-builder-title">{tr('هدية من أرض الخير\nتصل لمن تحب', 'A gift from the land of goodness\nfor the ones you love')}</h1>
            <p>{tr('اختر قيمة البطاقة وأضف لمستك الخاصة.\nلتصل بها إلى من تحب في أي وقت.', 'Choose the card value and add your personal touch.\nSend it to your loved ones any time.')}</p>
          </div>
        </section>

        <div className="gift-builder-layout container">
          <div className="gift-builder-main">
            <form id="gift-builder-form" noValidate onSubmit={handleSubmit(onSubmit, onInvalid)}>
              {/* 1. Delivery */}
              <section className="gift-builder-section">
                <header className="gift-builder-section-heading">
                  <span>1</span>
                  <div>
                    <h2>{tr('كيف تريد أن تصل الهدية؟', 'How should the gift arrive?')}</h2>
                    <p>{tr('اختر الطريقة الأنسب للمناسبة', 'Choose what suits the occasion')}</p>
                  </div>
                </header>
                <div className="gift-builder-delivery-options" role="radiogroup">
                  {[
                    ['digital', 'smartphone', tr('بطاقة رقمية', 'Digital card'), tr('كود فريد مع بطاقة أنيقة عبر البريد الإلكتروني أو الواتساب.', 'A unique code with an elegant card by email or WhatsApp.')],
                    ['printed', 'package', tr('بطاقة مطبوعة فاخرة', 'Luxury printed card'), tr('ورق فاخر وتغليف أنيق، تصل مباشرة إلى عنوان المستلم.', 'Fine paper and elegant wrapping, delivered to the recipient.')],
                  ].map(([val, icon, title, text]) => (
                    <button key={val} type="button" className={cardType === val ? 'is-selected' : ''} role="radio" aria-checked={cardType === val} onClick={() => setValue('card_type', val)}>
                      <Icon name="check" size={14} />
                      <span><Icon name={icon} size={22} /></span>
                      <div>
                        <strong>{title}</strong>
                        <p>{text}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* 2. Value */}
              <section className="gift-builder-section">
                <header className="gift-builder-section-heading">
                  <span>2</span>
                  <div>
                    <h2>{tr('اختر قيمة البطاقة', 'Choose the card value')}</h2>
                    <p>{tr('اختر القيمة المناسبة لمن تحب', 'Pick the right value for your loved one')}</p>
                  </div>
                </header>
                <div className="gift-builder-values">
                  {GIFT_CARD.PRESET_AMOUNTS.map((amt) => (
                    <button type="button" key={amt} className={!customSelected && Number(amount) === amt ? 'is-selected' : ''} data-amount={amt} onClick={() => pickPreset(amt)}>
                      <b>{amt}</b>
                      <span>{currency}</span>
                    </button>
                  ))}
                  <label id="gb-custom-label" className={customSelected ? 'is-selected' : ''} tabIndex={0} onClick={() => setCustomSelected(true)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setCustomSelected(true))}>
                    <span>{tr('قيمة أخرى', 'Other value')}</span>
                    <Icon name="pencil" size={16} />
                    <input
                      id="gb-custom"
                      type="number"
                      min={GIFT_CARD.MIN_AMOUNT}
                      max={GIFT_CARD.MAX_AMOUNT}
                      placeholder={tr('المبلغ', 'Amount')}
                      aria-label={tr('قيمة أخرى', 'Other value')}
                      onFocus={() => setCustomSelected(true)}
                      onChange={(e) => {
                        setCustomSelected(true);
                        setValue('amount', e.target.value === '' ? '' : Number(e.target.value));
                      }}
                    />
                  </label>
                </div>
              </section>

              {/* 3. People */}
              <section className="gift-builder-section gift-builder-people-step">
                <header className="gift-builder-section-heading">
                  <span>03</span>
                  <div>
                    <h2>{tr('ممن وإلى من؟', 'From whom and to whom?')}</h2>
                    <p>{tr('أضف بيانات المرسل والمُهدى إليه التي ستظهر على البطاقة', 'Add the sender and recipient details shown on the card')}</p>
                  </div>
                </header>
                <div className="gift-builder-details">
                  <fieldset className="gift-builder-sender">
                    <legend>
                      <Icon name="user-round" size={17} /> {tr('بيانات المرسل', 'Sender details')}
                      {user ? <span>{tr('من حسابك', 'From your account')}</span> : null}
                    </legend>
                    <FormField id="gb-sender" label={tr('اسم المرسل', 'Sender name')} required>
                      <input id="gb-sender" className="input" autoComplete="name" aria-invalid={!!errors.sender_name} {...register('sender_name')} />
                    </FormField>
                    <FormField id="gb-sender-phone" label={tr('رقم جوال المرسل', 'Sender mobile')}>
                      <input id="gb-sender-phone" className="input" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="05xxxxxxxx" {...register('sender_phone')} />
                    </FormField>
                  </fieldset>
                  <fieldset>
                    <legend><Icon name="gift" size={17} /> {tr('بيانات المُهدى إليه', 'Recipient details')}</legend>
                    <FormField id="gb-recipient" label={tr('اسم المُهدى إليه', 'Recipient name')} required>
                      <input id="gb-recipient" className="input" autoComplete="off" aria-invalid={!!errors.recipient_name} {...register('recipient_name')} />
                    </FormField>
                    <FormField id="gb-recipient-phone" label={tr('رقم جوال المستلم', 'Recipient mobile')} required>
                      <input id="gb-recipient-phone" className="input" type="tel" dir="ltr" inputMode="tel" autoComplete="off" placeholder="05xxxxxxxx" aria-invalid={!!errors.recipient_phone} {...register('recipient_phone')} />
                    </FormField>
                    <FormField id="gb-recipient-email" label={tr('البريد الإلكتروني للمستلم (اختياري)', 'Recipient email (optional)')}>
                      <input id="gb-recipient-email" className="input" type="email" dir="ltr" autoComplete="off" aria-invalid={!!errors.recipient_email} {...register('recipient_email')} />
                    </FormField>
                  </fieldset>
                </div>
              </section>

              {/* 4. Message */}
              <section className="gift-builder-section gift-builder-message-step">
                <header className="gift-builder-section-heading">
                  <span>4</span>
                  <div>
                    <h2>{tr('رسالة الإهداء (اختياري)', 'Gift message (optional)')}</h2>
                    <p>{tr('أضف رسالة شخصية لتظهر مع البطاقة', 'Add a personal message shown with the card')}</p>
                  </div>
                </header>
                <div className="gift-builder-message">
                  <textarea id="gb-message" maxLength={180} className="input textarea" aria-label={tr('رسالة الإهداء', 'Gift message')} {...register('message')} />
                  <span id="gb-message-count">{(message || '').length}/180</span>
                </div>
                {formError ? <p className="field-error" id="gb-error" role="alert">{formError}</p> : null}
                <button type="submit" className="button button--primary" id="gb-submit" disabled={addGiftCard.isPending}>
                  {tr('إرسال بطاقة الهدية', 'Send the gift card')}
                  <Icon name="gift" size={18} />
                </button>
              </section>
            </form>
          </div>

          <aside className="gift-builder-preview">
            <header><h2>{tr('معاينة البطاقة', 'Card preview')}</h2></header>
            <div className="gift-builder-preview-stage">
              <div className="gift-approved-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset(CARD_FACE)} alt={tr('بطاقة إهداء تمرنا', 'Tamrna gift card')} />
              </div>
            </div>
            <section className="gift-builder-summary">
              <h3>{tr('تفاصيل البطاقة', 'Card details')}</h3>
              <dl>
                <div><dt>{tr('قيمة البطاقة', 'Card value')}</dt><dd id="pv-amount">{amount ? money(amount) : '—'}</dd></div>
                <div><dt>{tr('نوع البطاقة', 'Card type')}</dt><dd id="pv-type">{typeLabel(cardType)}</dd></div>
                <div><dt>{tr('من المرسل', 'From')}</dt><dd id="pv-from">{(sender || '').trim() || '—'}</dd></div>
                <div><dt>{tr('إلى المُهدى إليه', 'To')}</dt><dd id="pv-to">{(recipient || '').trim() || '—'}</dd></div>
                <div><dt>{tr('رسالة الإهداء (اختياري)', 'Gift message (optional)')}</dt><dd id="pv-message">{(message || '').trim() || tr('أضف رسالتك الخاصة', 'Add your personal message')}</dd></div>
              </dl>
              <button type="button" id="gb-full-preview" onClick={() => setPreviewOpen(true)}>
                <Icon name="eye" size={18} />
                {tr('معاينة بشكل كامل', 'Full preview')}
              </button>
              <p className="gift-builder-policy">{tr('يصدر الكود بعد إتمام الدفع، ويُستخدم من خانة كوبون الخصم في سلة المشتريات.', 'The code is issued after payment and can be redeemed in the cart promo-code field.')}</p>
            </section>
          </aside>
        </div>
      </div>

      <div className={`global-overlay${previewOpen ? '' : ' hidden'}`} id="gb-overlay" onClick={() => setPreviewOpen(false)} />
      <div className={`dialog${previewOpen ? '' : ' hidden'}`} id="gb-dialog" dir={isRtl ? 'rtl' : 'ltr'} role="dialog" aria-modal="true" aria-labelledby="gb-dialog-title" style={{ maxWidth: '40rem' }}>
        <div className="dialog-heading">
          <h2 id="gb-dialog-title">{tr('معاينة البطاقة', 'Card preview')}</h2>
          <button type="button" className="button button--icon" onClick={() => setPreviewOpen(false)} aria-label={tr('إغلاق', 'Close')}>
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="gift-approved-card" style={{ marginTop: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset(CARD_FACE)} alt="" />
        </div>
        <dl className="gift-builder-review-list" id="gb-dialog-details">
          {[
            [tr('قيمة البطاقة', 'Card value'), money(amount || 0)],
            [tr('نوع البطاقة', 'Card type'), typeLabel(cardType)],
            [tr('من', 'From'), (sender || '').trim() || '—'],
            [tr('إلى', 'To'), (recipient || '').trim() || '—'],
            [tr('الرسالة', 'Message'), (message || '').trim() || '—'],
          ].map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      </div>
    </>
  );
}
