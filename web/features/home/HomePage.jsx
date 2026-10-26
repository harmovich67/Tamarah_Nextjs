import Link from 'next/link';
import { Icon } from '@tamrna/shared/components/Icon';
import { pickLang } from '@tamrna/shared/utils';
import ProductCard from '@/components/product/ProductCard';
import { asset } from '@/lib/asset';
import { DEFAULT_FEATURES, DEFAULT_REVIEWS, FEATURE_ICON_MAP } from '@/data/homeDefaults';
import HeroSlider from './HeroSlider';
import CategoryScroller from './CategoryScroller';
import ReviewsSlider from './ReviewsSlider';
import NewsletterForm from './NewsletterForm';

const Arrow = ({ size = 19 }) => <Icon name="arrow-left" size={size} className="directional-arrow" />;
const Palm = () => <Icon name="tree-palm" size={24} className="palm-decoration" stroke={1.1} />;

function SectionTitle({ title, subtitle }) {
  return (
    <div className="section-title section-title--center section-title--palms">
      <div className="section-heading-line">
        <Palm />
        <h2>{title}</h2>
        <Palm />
      </div>
      <p>{subtitle}</p>
    </div>
  );
}

function FeatureStrip({ section, locale }) {
  const cards = Array.isArray(section.settings?.cards) && section.settings.cards.length ? section.settings.cards : DEFAULT_FEATURES[locale];
  return (
    <div className="benefit-strip container">
      <ul style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(5, cards.length))}, 1fr)` }}>
        {cards.map((feat, i) => {
          const title = pickLang(feat, 'title', locale, feat.title || feat.title_ar || '');
          const desc = pickLang(feat, 'desc', locale, feat.desc || feat.desc_ar || '');
          const icon = FEATURE_ICON_MAP[feat.icon] || feat.icon || 'award';
          return (
            <li key={`${title}-${i}`}>
              {feat.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={feat.image} alt="" width={40} height={40} loading="lazy" />
              ) : (
                <Icon name={icon} size={40} stroke={1.35} />
              )}
              <div>
                <strong>{title}</strong>
                <p className="clamp-2">{desc}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PromoBanner({ className, children, image, imageAlt = '', imageProps = {} }) {
  return (
    <article className={`promo-banner promo-banner--full-background ${className}`}>
      <div className="promo-copy">{children}</div>
      <div className="promo-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset(image)} alt={imageAlt} loading="lazy" {...imageProps} />
      </div>
    </article>
  );
}

/**
 * Dynamic homepage (resources/views/storefront/home.php): the CMS decides which sections exist and in which
 * order (`homeSections`); the hero comes from the active banners.
 */
export default function HomePage({ data, text }) {
  const { locale, isRtl, tr, money } = text;
  const { banners, categories, products, preorderProducts, bestsellers, homeSections } = data;

  let heroSection = null;
  let featuresSection = null;
  const bodySections = [];
  homeSections.forEach((sec) => {
    // The "pre-order harvest" banner is not shown on the home page (pre-order products stay in the catalog filter).
    if (sec.section_key === 'preorder') return;
    if (sec.section_key === 'hero') {
      if (banners.length) heroSection = sec;
      return;
    }
    if (sec.section_key === 'features' && featuresSection === null) {
      featuresSection = sec;
      return;
    }
    bodySections.push(sec);
  });

  return (
    <>
      {heroSection && (
        <>
          <HeroSlider banners={banners} />
          {featuresSection && <FeatureStrip section={featuresSection} locale={locale} />}
        </>
      )}
      {!heroSection && featuresSection && <FeatureStrip section={featuresSection} locale={locale} />}

      <div className="home-content container">
        <section className="home-gift-section">
          <PromoBanner
            className="home-gift-banner"
            image="assets/images/home/gifting.webp"
            imageAlt={tr('علبة تمور فاخرة ودلة عربية', 'Luxury dates box and Arabic coffee pot')}
            imageProps={{ width: 1536, height: 1024 }}
          >
            <span className="eyebrow">{tr('هدية من تراثنا العريق', 'A gift from our rich heritage')}</span>
            <h3>{tr('بطاقات إهداء ومطبوعة', 'Gift cards, digital & printed')}</h3>
            <p>{tr('لأن بعض المشاعر تُهدى .. تمرنا خياركم الأمثل', 'Because some feelings are meant to be gifted — Tamrna is your best choice')}</p>
            <Link className="button button--secondary" href="/gift-cards">
              {tr('اكتشف بطاقات الإهداء', 'Discover gift cards')}
              <Arrow />
            </Link>
          </PromoBanner>
        </section>

        {bodySections.map((sec) => (
          <BodySection key={sec.id} sec={sec} data={{ categories, products, preorderProducts, bestsellers }} text={text} />
        ))}

        <div style={{ height: 'var(--space-16)' }} />
      </div>
    </>
  );
}

function BodySection({ sec, data, text }) {
  const { locale, isRtl, tr, money } = text;
  const { categories, products, preorderProducts, bestsellers } = data;
  const key = sec.section_key;
  const title = pickLang(sec, 'title', locale);
  const subtitle = pickLang(sec, 'subtitle', locale);
  const badge = pickLang(sec, 'badge', locale);
  const btnText = pickLang(sec, 'button_text', locale);
  const btnUrl = (fallback) => sec.button_url || fallback;

  // ===== Categories (+ heritage banner) =====
  if (key === 'categories' && categories.length) {
    return (
      <>
        <section className="home-section" id="categories">
          <SectionTitle title={title || tr('الأقسام الرئيسية للتمور', 'Main Date Categories')} subtitle={subtitle || tr('اكتشف عالم التمور الفاخرة', 'Discover the world of luxury dates')} />
          <CategoryScroller categories={categories} />
          <div className="home-section-action">
            <Link className="button button--outline home-cta" href={btnUrl('/catalog')}>
              {btnText || tr('عرض كافة الأقسام', 'View All Categories')}
              <Arrow />
            </Link>
          </div>
        </section>

        <section id="our-story" className="home-story-section">
          <PromoBanner className="home-heritage-banner" image="assets/images/home/heritage.webp" imageAlt={tr('عمارة نجدية وواحة نخيل سعودية', 'Najdi architecture and a Saudi palm oasis')}>
            <h3>{tr('من عمق التاريخ\nإلى حاضرنا', 'From the depth of history\nto our present')}</h3>
            <p>{tr('ليس مجرد غذاء .. بل هو إرث وثقافة وهوية متجذرة في أرض المملكة منذ آلاف السنين', 'Not just food — an heritage, a culture and an identity rooted in the Kingdom for thousands of years')}</p>
            <Link className="button button--secondary" href="/about">
              {tr('تعرّف على قصتنا', 'Learn our story')}
              <Arrow />
            </Link>
          </PromoBanner>
        </section>
      </>
    );
  }

  // ===== Featured products (+ editorial blocks) =====
  if (key === 'featured_products' && products.length) {
    const giftBox = categories.find((c) => c.slug === 'gift-boxes');
    return (
      <>
        <section className="home-section" id="featured">
          <SectionTitle title={title || tr('منتجات مميزة ومقترحة', 'Featured Products')} subtitle={badge || tr('مختارة بعناية', 'Carefully selected')} />
          <div className="home-product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="home-section-action">
            <Link className="button button--outline home-cta" href={btnUrl('/catalog')}>
              {btnText || tr('تصفح كافة الأصناف', 'Explore All Dates')}
              <Arrow />
            </Link>
          </div>
        </section>

        <section className="home-quality" aria-label={tr('جودة تعتز بها مزارعنا السعودية', 'Quality our Saudi farms are proud of')}>
          <div className="quality-scene">
            <PromoBanner className="home-farm-banner" image="assets/images/home/heritage.webp">
              <h3>{tr('جودة تعتز بها\nمزارعنا السعودية', 'Quality our Saudi farms\nare proud of')}</h3>
              <p>{tr('نحرص على اختيار أجود التمور من مزارع محلية، بعناية تمنح كل حبة مذاقها الأصيل.', 'We carefully choose the finest dates from local farms, giving every date its authentic taste.')}</p>
              <Link className="button button--secondary" href="/about#farms">
                {tr('اكتشف مزارعنا', 'Discover our farms')}
                <Arrow />
              </Link>
            </PromoBanner>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="quality-date-image" src={asset('assets/images/home/medjool.webp')} alt="" loading="lazy" />
          </div>
        </section>

        {bestsellers.length > 0 && (
          <section className="home-bestsellers home-section">
            <aside className="home-editorial">
              <Icon name="tree-palm" size={24} className="palm-decoration" stroke={1.1} />
              <h2>{tr('الأصالة\nفي كل حبة', 'Authenticity\nin every date')}</h2>
              <p>{tr('تمور نختارها للضيافة، تجمع المذاق الأصيل وعناية الاختيار.', 'Dates chosen for hospitality, combining authentic taste and careful selection.')}</p>
              <a href="#featured" className="button button--secondary home-cta">
                {tr('تسوق الآن', 'Shop now')}
                <Arrow />
              </a>
            </aside>
            <div className="home-bestsellers-products">
              <SectionTitle title={tr('الأكثر طلبًا', 'Best sellers')} subtitle={tr('اختيارات ضيافتنا المفضلة', 'Our favourite hospitality picks')} />
              <div className="home-compact-grid">
                {bestsellers.map((p, i) => (
                  <ProductCard key={p.id} product={p} extraClass="product-card--compact" rank={i + 1} />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="home-packaging-section">
          <PromoBanner className="home-packaging-banner" image="assets/images/home/gifting.webp">
            <h3>{tr('بوكسات التمور الفاخرة\nمناسبة لكل لحظاتكم', 'Luxury date boxes\nfor every moment')}</h3>
            <p>{tr('بوكسات مصممة بعناية، تعكس الهوية السعودية في جميع المناسبات.', 'Carefully designed boxes that reflect Saudi identity for every occasion.')}</p>
            <Link className="button button--secondary" href={giftBox ? '/catalog?cat=gift-boxes' : '/catalog'}>
              {tr('تسوق البوكسات', 'Shop the boxes')}
              <Arrow />
            </Link>
          </PromoBanner>
          <div className="packaging-wordmark">
            <span className="brand-wordmark brand-wordmark--light" role="img" aria-label="تمرنا Tamrna">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src={asset('assets/brand/tamrna-logo-light.svg')} />
            </span>
          </div>
        </section>
      </>
    );
  }

  // ===== Pre-order banner =====
  if (key === 'preorder') {
    return (
      <section className="home-section">
        <article className="promo-banner promo-banner--full-background home-preorder-banner">
          {sec.image ? (
            <div className="promo-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset(sec.image)} alt="" loading="lazy" />
            </div>
          ) : null}
          <div className="promo-copy">
            <span className="eyebrow">{badge || tr('حجز حصاد موسم ٢٠٢٦ 🌴', 'Season 2026 Harvest Pre-Order 🌴')}</span>
            <h3>{title || tr('احجز رطب المدينة والقصيم الطازج قبل اكتمال الحصاد', 'Reserve Fresh Madinah & Qassim Ruthab Before Harvest Ends')}</h3>
            <p>
              {subtitle ||
                tr(
                  'نضمن لك أولى قطاف النخيل المبارك، مفرز ومعبأ مبرداً ليصل إلى بابك فور الجني بنفس اليوم بنضارته الفائقة.',
                  'Guaranteed first pick of blessed palm groves, packaged and delivered chilled right to your doorstep on harvest day.',
                )}
            </p>
            <Link className="button button--secondary" href={btnUrl('/catalog?filter=preorder')}>
              {btnText || tr('استعراض أصناف الحجز المسبق', 'Browse Pre-Order Items')}
              <Arrow />
            </Link>
          </div>
          {preorderProducts.length > 0 && (
            <div className="home-preorder-products">
              {preorderProducts.slice(0, 2).map((pp) => (
                <div className="home-preorder-card" key={pp.id}>
                  <div>
                    <span className="badge badge--preorder">{tr('حجز مسبق', 'Pre-Order')}</span>
                    <strong>{money(pp.price)}</strong>
                  </div>
                  <h3>{pickLang(pp, 'name', locale)}</h3>
                  <Link className="button button--secondary" href={`/product/${pp.slug}`}>
                    {tr('تفاصيل الحجز', 'Details')}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    );
  }

  // ===== Features (when it is not attached to the hero) =====
  if (key === 'features') return <FeatureStrip section={sec} locale={locale} />;

  // ===== Testimonials =====
  if (key === 'testimonials') {
    const reviews = Array.isArray(sec.settings?.reviews) && sec.settings.reviews.length ? sec.settings.reviews : DEFAULT_REVIEWS[locale];
    return (
      <section className="home-reviews home-section" id="reviews">
        <SectionTitle
          title={title || tr('آراء عملائنا', 'What our customers say')}
          subtitle={subtitle || badge || tr('ثقة تُبنى مع كل طلب', 'Trust built with every order')}
        />
        <ReviewsSlider reviews={reviews} title={title || tr('آراء عملائنا', 'Customer reviews')} />
      </section>
    );
  }

  // ===== Newsletter =====
  if (key === 'newsletter') {
    return <NewsletterForm title={title} subtitle={subtitle} buttonText={btnText} couponCode={sec.settings?.coupon_code || 'TAMRNA10'} />;
  }

  // ===== Custom sections (CMS) =====
  if (sec.is_custom) {
    const content = pickLang(sec, 'custom_content', locale);
    const style = sec.style || 'default';
    const href = sec.button_url || '/';
    const rich = content ? <div className="rich">{content.split(/\r?\n/).map((line, i, arr) => <span key={i}>{line}{i < arr.length - 1 ? <br /> : null}</span>)}</div> : null;

    if (style === 'banner_cta') {
      return (
        <section className="home-section">
          <div className="home-custom-section home-custom-section--banner">
            <h2>{title}</h2>
            {subtitle ? <p className="rich">{subtitle}</p> : null}
            {rich}
            {btnText ? <Link className="button button--secondary" href={href}>{btnText}</Link> : null}
          </div>
        </section>
      );
    }
    if (style === 'image_first' && sec.image) {
      return (
        <section className="home-section">
          <div className="home-custom-section home-custom-section--split">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset(sec.image)} alt={title} loading="lazy" />
            <div>
              <h2>{title}</h2>
              <p className="eyebrow" style={{ marginBlock: '.5rem' }}>{subtitle}</p>
              {rich}
              {btnText ? (
                <Link className="button button--primary" style={{ marginTop: '1rem' }} href={href}>
                  {btnText}
                  <Arrow size={18} />
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      );
    }
    return (
      <section className="home-section">
        <div className="home-custom-section">
          {sec.image ? (
            <div className="home-custom-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset(sec.image)} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : null}
          <h2>{title}</h2>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
          {rich}
          {btnText ? (
            <Link className="button button--primary" href={href}>
              {btnText}
              <Arrow size={18} />
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  return null;
}
