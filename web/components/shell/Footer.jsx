import Link from 'next/link';
import { Icon } from '@tamrna/shared/components/Icon';
import { asset } from '@/lib/asset';

/** Site footer (layouts/app.php). Presentational: all data arrives through `shell` (see deriveShell()). */
export default function Footer({ shell, locale }) {
  const isEn = locale === 'en';
  const tr = (ar, en) => (isEn ? en : ar);
  const quickLinks = shell.footerMenu.length ? shell.footerMenu : shell.nav;

  return (
    <footer className="site-footer">
      <div className="pattern-background">
        <div className="container">
          <div className="footer-main">
            <div className="footer-brand">
              <Link className="logo-link" href="/">
                <span className="brand-wordmark" role="img" aria-label="تمرنا Tamrna">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" width="174" height="246" loading="lazy" src={shell.customLogo || asset('assets/brand/tamrna-logo-light.svg')} />
                </span>
              </Link>
              <p>{tr('تمور سعودية .. بطعم أصيل لا يُنسى', 'Saudi dates with an authentic taste you will never forget.')}</p>
            </div>

            <nav className="footer-group" aria-label={tr('عن تمرنا', 'About Tamrna')}>
              <h3>{tr('عن تمرنا', 'About Tamrna')}</h3>
              <ul>
                <li><Link href="/about">{tr('من نحن', 'Our Story')}</Link></li>
                <li><Link href="/about#farms">{tr('مزارعنا', 'Our Farms')}</Link></li>
                <li><Link href="/about#journey">{tr('رحلتنا', 'Our Journey')}</Link></li>
                <li><Link href="/contact">{tr('تواصل معنا', 'Contact Us')}</Link></li>
              </ul>
            </nav>

            <nav className="footer-group" aria-label={tr('خدمة العملاء', 'Customer service')}>
              <h3>{tr('خدمة العملاء', 'Customer Service')}</h3>
              <ul>
                <li><Link href="/contact">{tr('مركز المساعدة', 'Help Center')}</Link></li>
                <li><Link href="/profile/orders">{tr('طلباتي', 'My Orders')}</Link></li>
                <li><Link href="/profile">{tr('حسابي', 'My Account')}</Link></li>
                <li><Link href="/wishlist">{tr('قائمة المفضلة', 'Wishlist')}</Link></li>
                <li><Link href="/contact">{tr('الاستفسار عن الشحن', 'Shipping Inquiries')}</Link></li>
              </ul>
            </nav>

            <nav className="footer-group" aria-label={tr('روابط سريعة', 'Quick links')}>
              <h3>{tr('روابط سريعة', 'Quick Links')}</h3>
              <ul>
                {quickLinks.map((item) => (
                  <li key={`${item.href}-${item.label}`}>
                    {item.newTab || /^(https?:)?\/\//.test(item.href) ? (
                      <a href={item.href} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noopener' : undefined}>{item.label}</a>
                    ) : (
                      <Link href={item.href}>{item.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            <aside className="footer-newsletter">
              <h3>{tr('طرق الدفع المعتمدة', 'Accepted Payment Methods')}</h3>
              <p className="footer-payment-note">
                {tr('بوابات دفع إلكترونية سعودية مشفرة ومصرحة وفق معايير البنك المركزي السعودي (ساما).', 'Encrypted Saudi payment gateways licensed under SAMA standards.')}
              </p>
              <div className="footer-payment" aria-label={tr('وسائل الدفع', 'Payment methods')}>
                {shell.payOn('enable_mada') && <span className="payment-mark payment-mark--mada">mada</span>}
                {shell.payOn('enable_credit_card') && (
                  <>
                    <span className="payment-mark payment-mark--visa">VISA</span>
                    <span className="payment-mark payment-mark--mastercard">
                      <i />
                      <i />
                      <span className="sr-only">Mastercard</span>
                    </span>
                  </>
                )}
                {shell.payOn('enable_apple_pay') && <span className="payment-mark payment-mark--text">Apple Pay</span>}
                {shell.payOn('enable_tabby') && <span className="payment-mark payment-mark--text">tabby</span>}
                {shell.payOn('enable_tamara') && <span className="payment-mark payment-mark--text">tamara</span>}
              </div>
              {(shell.taxNumber || shell.crNumber) && (
                <div className="footer-legal-numbers">
                  {shell.taxNumber && (
                    <span>
                      {tr('الرقم الضريبي:', 'VAT Number:')} <bdi>{shell.taxNumber}</bdi>
                    </span>
                  )}
                  {shell.crNumber && (
                    <span>
                      {tr('السجل التجاري:', 'Commercial Reg:')} <bdi>{shell.crNumber}</bdi>
                    </span>
                  )}
                </div>
              )}
            </aside>
          </div>

          <div className="footer-details">
            <address className="footer-contact-actions" aria-label={tr('تواصل مع تمرنا', 'Contact Tamrna')}>
              <a className="footer-action" href={`tel:${shell.phoneDigits}`}>
                <Icon name="phone" size={16} />
                <bdi>{shell.contactPhone}</bdi>
              </a>
              <a className="footer-action" href={`mailto:${shell.contactEmail}`}>
                <Icon name="mail" size={16} />
                {shell.contactEmail}
              </a>
              {shell.whatsappDigits && (
                <a className="footer-action" href={`https://wa.me/${shell.whatsappDigits}`} rel="noopener noreferrer" target="_blank">
                  <Icon name="message-circle" size={16} />
                  {tr('واتساب', 'WhatsApp')}
                </a>
              )}
            </address>

            {shell.socialLinks.length > 0 && (
              <nav className="footer-social-actions" aria-label={tr('تابع تمرنا', 'Follow Tamrna')}>
                {shell.socialLinks.map((s) => (
                  <a key={s.name} className="footer-icon-action" href={s.url} rel="noopener noreferrer" target="_blank" aria-label={s.name} title={s.name}>
                    <Icon name={s.icon} size={16} />
                    <span className="sr-only">{s.name}</span>
                  </a>
                ))}
              </nav>
            )}
          </div>

          <div className="footer-bottom">
            <small>{shell.footerText}</small>
            <span className="footer-location">
              <Icon name="map-pin" size={16} />
              {shell.contactAddress}
            </span>
            <span className="footer-signature">TAMRNA — SAUDI ARABIA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
