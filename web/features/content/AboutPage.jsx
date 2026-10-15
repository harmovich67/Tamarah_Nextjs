import Link from 'next/link';
import { Icon } from '@tamrna/shared/components/Icon';
import { asset } from '@/lib/asset';
import content from '@/data/about.json';

const ICONS = { award: 'award', fingerprint: 'fingerprint', globe: 'earth', package: 'package-check', repeat: 'refresh-ccw', heart: 'heart', leaf: 'leaf', palm: 'tree-palm', people: 'users-round', pin: 'map-pin', shield: 'shield-check', sprout: 'sprout', truck: 'truck' };

/** About page (resources/views/storefront/about.php). Editorial copy lives in data/about.json (ar / en pairs). */
export default function AboutPage({ text }) {
  const { locale, isRtl, tr } = text;
  const c = content;
  const t = (v) => (v && typeof v === 'object' ? v[locale] ?? v.ar ?? '' : String(v ?? ''));
  const img = (src) => asset(`assets${src}`);
  const Ic = ({ name, size = 24 }) => <Icon name={ICONS[name] || 'sparkles'} size={size} />;
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
              <Ic name={item.icon} />
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
                <Ic name={item.icon} />
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
                <span aria-hidden="true"><Ic name={item.icon} /></span>
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
