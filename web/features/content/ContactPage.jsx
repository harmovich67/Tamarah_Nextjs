'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema } from '@tamrna/shared/schemas';
import { toFriendlyMessage } from '@tamrna/shared/api';
import { Icon } from '@tamrna/shared/components/Icon';
import { useLocale } from '@/components/LocaleProvider';
import { FormField } from '@/components/ui/FormField';
import { BRANCHES } from '@/data/branches';
import { asset } from '@/lib/asset';
import { contentService } from '@/services';
import { showToast } from '@/store/toastStore';

/** Contact page + branch locator (resources/views/storefront/contact.php). */
export default function ContactPage({ phone, email, whatsapp }) {
  const { locale, isRtl, tr } = useLocale();
  const branches = BRANCHES[locale].map((b) => ({
    ...b,
    map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${isRtl ? 'تمرنا، ' : 'Tamrna, '}${b.address}`)}`,
  }));
  const [active, setActive] = useState(0);
  const branch = branches[active];
  const phoneHref = String(phone).replace(/[^\d+]/g, '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(contactSchema(locale)), defaultValues: { name: '', email: '', message: '' } });

  const onSubmit = async (values) => {
    try {
      await contentService.sendContactMessage(values);
      showToast(tr('شكراً لتواصلك مع متجر تمرنا للتمور الفاخرة! تم استلام رسالتك بنجاح.', 'Thank you for reaching out to Tumurna Luxury Dates! Your message has been received.'), 'success');
      reset();
    } catch (error) {
      showToast(toFriendlyMessage(error, locale), 'error');
    }
  };

  return (
    <div className="pattern-background contact-page">
      <section className="contact-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset('assets/images/home/heritage.webp')} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        <div className="contact-hero-overlay" />
        <div className="container contact-hero-copy">
          <span className="commerce-kicker">{tr('خدمة تليق بضيافتكم', 'Service worthy of your hospitality')}</span>
          <h1>{tr('نسعد بخدمتكم، بكل عناية', 'We are happy to serve you, with care')}</h1>
          <p>{tr('للاستفسارات عن المنتجات والطلبات والتوصيل، تواصلوا معنا عبر القنوات الرسمية المعتمدة.', 'For questions about products, orders and delivery, reach us through our official channels.')}</p>
        </div>
      </section>

      <div className="container contact-content">
        <section className="contact-channels" aria-labelledby="contact-channels-title">
          <span>{tr('قنوات التواصل الرسمية', 'Official channels')}</span>
          <h2 id="contact-channels-title">{tr('نحن بالقرب منكم', 'We are close to you')}</h2>
          <p>{tr('تواصل معنا مباشرة عبر الهاتف أو البريد الإلكتروني، ويسعدنا متابعة استفسارك عبر واتساب.', 'Reach us directly by phone or email, and we are happy to follow up on WhatsApp.')}</p>

          <div className="contact-channel-grid">
            <article>
              <Icon name="mail" size={26} stroke={1.6} />
              <div>
                <small>{tr('البريد الإلكتروني الرسمي', 'Official email')}</small>
                <a href={`mailto:${email}`}>{email}</a>
              </div>
            </article>
            <article>
              <Icon name="phone" size={26} stroke={1.6} />
              <div>
                <small>{tr('رقم التواصل الرسمي', 'Official phone')}</small>
                <a dir="ltr" href={`tel:${phoneHref}`}>{phone}</a>
              </div>
            </article>
            <article>
              <Icon name="message-circle" size={26} stroke={1.6} />
              <div>
                <small>{tr('متابعة الاستفسارات', 'Follow-up on inquiries')}</small>
                <a dir="ltr" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">{tr('واتساب', 'WhatsApp')}</a>
              </div>
            </article>
          </div>
        </section>

        <div className="contact-lower">
          <section className="branch-locator" aria-labelledby="branch-locator-title">
            <header className="branch-locator-head">
              <span className="commerce-kicker">
                <Icon name="map-pin" size={15} />
                {tr('شبكة فروع تمرنا في المملكة', 'Tamrna branches across the Kingdom')}
              </span>
              <h2 id="branch-locator-title">{tr('تفضل بزيارة أقرب فرع إليك', 'Visit the branch nearest to you')}</h2>
            </header>

            <div className="branch-locator-body">
              <ul className="branch-list">
                {branches.map((b, i) => (
                  <li key={b.city}>
                    <button type="button" className={`branch-item${i === active ? ' branch-item--active' : ''}`} data-branch={i} aria-pressed={i === active} onClick={() => setActive(i)}>
                      <strong>{b.name}</strong>
                      <em>{b.city}</em>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="branch-map-col">
                <div className="branch-map">
                  <article className="branch-map-card">
                    <span className="branch-map-badge" id="branch-badge">{tr('الفرع المحدد', 'Selected branch')}</span>
                    <h3 id="branch-name">{branch.name}</h3>
                    <a className="button button--primary branch-map-link" id="branch-map-link" href={branch.map} target="_blank" rel="noopener noreferrer">
                      <Icon name="map-pin" size={17} />
                      {tr('فتح الموقع في Google Maps', 'Open in Google Maps')}
                      <Icon name="external-link" size={15} />
                    </a>
                  </article>
                </div>
                <dl className="branch-details" aria-live="polite">
                  <div>
                    <Icon name="map-pin" size={20} />
                    <div><dt>{tr('العنوان التفصيلي', 'Full address')}</dt><dd id="branch-address">{branch.address}</dd></div>
                  </div>
                  <div>
                    <Icon name="clock3" size={20} />
                    <div><dt>{tr('مواعيد العمل', 'Opening hours')}</dt><dd id="branch-hours">{branch.hours}</dd></div>
                  </div>
                  <div>
                    <Icon name="phone" size={20} />
                    <div><dt>{tr('هاتف الفرع', 'Branch phone')}</dt><dd dir="ltr" style={{ textAlign: 'start' }} id="branch-phone">{branch.phone}</dd></div>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <form className="checkout-card contact-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <span className="commerce-kicker">{tr('أرسل استفسارك', 'Send your inquiry')}</span>
              <h2>{tr('كيف يمكننا مساعدتك؟', 'How can we help you?')}</h2>
            </div>
            <FormField id="ct-name" label={tr('الاسم', 'Name')} required error={errors.name?.message}>
              <input id="ct-name" className="input" type="text" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
            </FormField>
            <FormField id="ct-email" label={tr('البريد الإلكتروني', 'Email')} required error={errors.email?.message}>
              <input id="ct-email" className="input" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
            </FormField>
            <FormField id="ct-msg" label={tr('رسالتك', 'Your message')} required error={errors.message?.message}>
              <textarea id="ct-msg" className="input textarea" rows={4} aria-invalid={!!errors.message} {...register('message')} />
            </FormField>
            <button type="submit" className="button button--primary" disabled={isSubmitting}>{tr('إرسال الاستفسار', 'Send inquiry')}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
