import Link from 'next/link';
import { Icon } from '@tamrna/shared/components/Icon';
import { asset } from '@/lib/asset';
import content from '@/data/about.json';

const ICONS = { award: 'award', fingerprint: 'fingerprint', globe: 'earth', package: 'package-check', repeat: 'refresh-ccw', heart: 'heart', leaf: 'leaf', palm: 'tree-palm', people: 'users-round', pin: 'map-pin', shield: 'shield-check', sprout: 'sprout', truck: 'truck' };

/** Replace a section of the bundled copy with the backend's when it has one (`remote` = tamrna `getAbout`). */
function withRemote(base, r) {
  if (!r) return base;
  const some = (v) => Array.isArray(v) && v.length > 0;
  const c = { ...base };
  if (r.story?.title || r.story?.description) c.story = { ...base.story, title: r.story.title || base.story.title, description: r.story.description || base.story.description, image: r.story.image || base.story.image };
  if (some(r.pillars)) c.pillars = r.pillars;
  if (some(r.stats)) c.stats = r.stats;
  if (some(r.values)) c.values = r.values;
  if (some(r.performance)) c.performance = { ...base.performance, items: r.performance };
  if (r.sustainability?.title) {
    c.sustainability = {
      ...base.sustainability,
      title: r.sustainability.title,
      description: r.sustainability.description || base.sustainability.description,
      image: r.sustainability.image || base.sustainability.image,
      principles: some(r.sustainability.principles) ? r.sustainability.principles : base.sustainability.principles,
    };
  }
  if (r.quality?.title) {
    c.quality = { ...base.quality, title: r.quality.title, description: r.quality.description || base.quality.description, images: some(r.quality.images) ? r.quality.images.map((src) => ({ src, alt: r.quality.title })) : base.quality.images };
  }
  return c;
}

/**
 * About page (resources/views/storefront/about.php). Editorial copy lives in data/about.json (ar / en pairs); with the real
 * backend the story, principles, numbers, sustainability and commitment sections come from `GET /client/about`.
 */
export default function AboutPage({ text, remote = null }) {
  const { locale, isRtl, tr } = text;
  const c = withRemote(content, remote);
  const t = (v) => (v && typeof v === 'object' ? v[locale] ?? v.ar ?? '' : String(v ?? ''));
  const img = (src) => (/^https?:\/\//.test(src) ? src : asset(`assets${src}`));
  const Ic = ({ name, size = 24 }) => <Icon name={ICONS[name] || 'sparkles'} size={size} />;
  // The picture uploaded in the dashboard for an item wins over the fixed icon; without one the icon stays.
  const Pic = ({ item, size = 24 }) =>
    item.image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="about-item-image" src={item.image} alt="" width={size} height={size} loading="lazy" />
    ) : (
      <Ic name={item.icon} size={size} />
    );
  const Arrow = ({ size = 17 }) => <Icon name="arrow-left" size={size} className="directional-arrow" />;

  return (
    <div className="pattern-background about-page">
      <section className="about-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(c.hero.image)} alt="" />
        <div className="about-hero-shade" />
        <div className="container about-hero-content">
          <div className="about-hero-copy">
            <nav aria-label={tr('مسار الصفحة', 'Breadcrumb')}>
              <Link href="/">{tr('الرئيسية', 'Home')}</Link>
              <span>/</span>
              <span>{t(c.hero.eyebrow)}</span>
            </nav>
            <span className="about-eyebrow">{t(c.hero.eyebrow)}</span>
            <h1>{t(c.hero.title)}</h1>
            <p>{t(c.hero.description)}</p>
            <a className="button button--secondary" href="#story">
              {t(c.hero.action)}
              <Arrow size={18} />
            </a>
          </div>
          <aside>
            <Icon name="tree-palm" size={24} />
            <p>{isRtl ? <>من أرض<br />السعودية<br />إلى كل العالم</> : <>From Saudi soil<br />to the world</>}</p>
          </aside>
        </div>
      </section>

      <div className="about-main">
        <section className="container about-story" id="story">
          <div className="about-story-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(c.story.image)} alt={t(c.story.imageAlt)} />
          </div>
          <div className="about-story-copy">
            <span className="about-eyebrow">{t(c.story.eyebrow)}</span>
            <h2>{t(c.story.title)}</h2>
            <p>{t(c.story.description)}</p>
            <ul className="about-pillars">
              {c.pillars.map((item) => (
                <li key={item.id}>
                  <p><strong>{t(item.title)}</strong><span>{t(item.description)}</span></p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="container about-stats" aria-label={tr('مؤشرات تمرنا', 'Tamrna indicators')}>
          {c.stats.map((item) => (
            <article key={item.id}>
              <Pic item={item} />
              <span>{t(item.label)}</span>
              <strong>{t(item.value)}</strong>
            </article>
          ))}
        </section>

        <section className="container about-farms" id="farms">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img(c.farms.image)} alt="" />
          <div />
          <article>
            <span className="about-eyebrow">{t(c.farms.eyebrow)}</span>
            <h2>{t(c.farms.title)}</h2>
            <p>{t(c.farms.description)}</p>
            <Link className="button button--secondary" href="/catalog">
              {t(c.farms.action)}
              <Arrow />
            </Link>
          </article>
        </section>

        <section className="container about-values">
          <div className="section-title section-title--center section-title--divider">
            <span className="eyebrow">{tr('قيمنا', 'Our values')}</span>
            <div className="section-heading-line"><h2>{tr('المبادئ التي نؤمن بها', 'Principles we believe in')}</h2></div>
          </div>
          <div>
            {c.values.map((item) => (
              <article key={item.id}>
                <Pic item={item} />
                <h3>{t(item.title)}</h3>
                <p>{t(item.description)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="container about-performance" id="numbers">
          <header>
            <span className="about-eyebrow">{t(c.performance.eyebrow)}</span>
            <h2>{t(c.performance.title)}</h2>
            <p>{t(c.performance.description)}</p>
          </header>
          <ol>
            {c.performance.items.map((item, i) => (
              <li key={item.id ?? i}>
                <span aria-hidden="true"><Pic item={item} size={item.image ? 40 : 24} /></span>
                <b dir="ltr">{item.value}</b>
                <strong>{t(item.title)}</strong>
                <small>{t(item.description)}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className="container about-sustainability">
          <div className="about-sustainability-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(c.sustainability.image)} alt={t(c.sustainability.imageAlt)} />
          </div>
          <article>
            <h2>{t(c.sustainability.title)}</h2>
            <p>{t(c.sustainability.description)}</p>
            <div className="about-sustainability-principles">
              {c.sustainability.principles.map((item, i) => (
                <span key={item.id ?? i}><strong>{t(item.title)}</strong><small>{t(item.description)}</small></span>
              ))}
            </div>
          </article>
        </section>

        <section className="container about-quality" id="quality">
          <article>
            <span className="about-eyebrow">{t(c.quality.eyebrow)}</span>
            <h2>{t(c.quality.title)}</h2>
            <p>{t(c.quality.description)}</p>
            <Link className="button button--secondary" href="/catalog">
              {t(c.quality.action)}
              <Arrow />
            </Link>
          </article>
          <div className="about-quality-gallery">
            {c.quality.images.map((image, i) => (
              <figure key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(image.src)} alt={t(image.alt)} loading="lazy" />
              </figure>
            ))}
          </div>
        </section>

        <section className="about-gift">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img(c.gift.image)} alt="" />
          <div />
          <article className="container">
            <h2>{t(c.gift.title)}</h2>
            <p>{t(c.gift.description)}</p>
            <Link className="button button--secondary" href="/gift-cards">
              {t(c.gift.action)}
              <Arrow />
            </Link>
          </article>
        </section>
      </div>
    </div>
  );
}
