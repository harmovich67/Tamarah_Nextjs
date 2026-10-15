import { Icon } from '@tamrna/shared/components/Icon';
import { asset } from '@/lib/asset';
import { sanitizeHtml } from '@/lib/sanitize';

/**
 * CMS page / post (resources/views/storefront/page.php). Custom-field values (ACF) arrive as `page.fields`:
 * hero_badge_text, show_support_card and the key_features repeater (icon / title / desc).
 */
export default function LegalPage({ page, text, whatsapp = '966500000000' }) {
  const { locale, tr } = text;
  const en = locale === 'en';
  const title = en && page.title_en ? page.title_en : page.title_ar;
  const content = en && page.content_en ? page.content_en : page.content_ar || '';
  const excerpt = en && page.excerpt_en ? page.excerpt_en : page.excerpt_ar || '';
  const fields = page.fields || {};
  const heroBadge = fields.hero_badge_text || tr('متجر تَـمْرُنـا للتمور الفاخرة', 'Tumurna Luxury Dates Store');
  const showSupport = fields.show_support_card === undefined ? true : String(fields.show_support_card) !== '0' && fields.show_support_card !== false;
  const features = Array.isArray(fields.key_features) ? fields.key_features : [];
  const updated = String(page.updated_at || page.created_at || '').slice(0, 10).replace(/-/g, '/');

  return (
    <div className="pattern-background legal-page">
      <div className="container legal-layout">
        <header className="legal-hero">
          <Icon name="file-text" size={42} />
          {heroBadge ? <span>{heroBadge}</span> : null}
          <h1>{title}</h1>
          {excerpt ? <p>{excerpt}</p> : null}
          <small>
            {tr('آخر تحديث: ', 'Last updated: ')}
            {updated}
          </small>
        </header>

        <div className="legal-sections">
          {page.featured_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset(page.featured_image)} alt={title} style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 14 }} />
          ) : null}

          <section>
            <article className="rich" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
          </section>

          {features.length > 0 && (
            <section>
              <h2>{tr('المميزات والضمانات المعتمدة', 'Official Guarantees & Features')}</h2>
              <div className="home-features" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginTop: 16 }}>
                {features.map((f, i) => (
                  <div className="home-feature-card" key={i}>
                    <Icon name={f.icon || 'check-circle'} size={38} stroke={1.35} />
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {showSupport && (
            <section>
              <h2>{tr('هل لديك أي استفسار حول أصناف التمور أو طلبات الإهداء؟', 'Have questions regarding our date varieties or luxury gifting?')}</h2>
              <p>{tr('فريق خدمة عملاء تَـمْرُنـا متواجد دائماً لمساعدتك في اختيار أفخر أصناف التمور الملكية وطلبات المناسبات.', 'Our connoisseur support team is ready to assist with custom packaging and premium gifting.')}</p>
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="button button--primary" style={{ marginTop: 14 }}>
                <Icon name="message-circle" size={18} />
                {tr('تواصل عبر واتساب', 'Chat via WhatsApp')}
              </a>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
