'use client';

import { useState } from 'react';
import { Icon } from '@tamrna/shared/components/Icon';
import { useLocale } from '@/components/LocaleProvider';
import { asset } from '@/lib/asset';

/** Decorative storytelling side of the auth screens (components/auth_story.php + auth_label.php). */
function AuthStory() {
  const { isRtl } = useLocale();
  return (
    <aside className="auth-story">
      <div className="auth-story-copy">
        <h2>
          {isRtl ? 'أكثر من تمر ..' : 'More than dates ..'}
          <br />
          <span>{isRtl ? 'هي قصة أرض وهُويّة' : 'a story of land and identity'}</span>
        </h2>
        <p>
          {isRtl ? (
            <>في تمرنا نحيي أصالة التمور السعودية،<br />ونختار لك أجود الأنواع من مزارع المملكة<br />لنقدم لك تجربة فاخرة بكل تفاصيلها</>
          ) : (
            <>At Tamrna we celebrate the authenticity of Saudi dates,<br />choosing the finest varieties from the Kingdom’s farms<br />for a luxurious experience in every detail</>
          )}
        </p>
      </div>
      <div className="auth-side-story">
        <Icon name="tree-palm" size={42} stroke={1.2} />
        <p>{isRtl ? <>من أرض<br />السعودية<br />إلى كل العالم</> : <>From the land<br />of Saudi Arabia<br />to the world</>}</p>
        <i />
      </div>
      <div className="auth-trust">
        <div><Icon name="badge-check" size={39} stroke={1.3} /><span>{isRtl ? 'جودة نعتني بها' : 'Quality we care for'}</span></div>
        <div><Icon name="tree-palm" size={39} stroke={1.3} /><span>{isRtl ? 'من مزارع سعودية مختارة' : 'From selected Saudi farms'}</span></div>
        <div><Icon name="leaf" size={39} stroke={1.3} /><span>{isRtl ? 'تمور بطعم أصيل' : 'Dates with authentic taste'}</span></div>
      </div>
      <p className="auth-signature">
        {isRtl ? 'تمرنا .. أصالة سعودية بطعم المستقبل' : 'Tamrna .. Saudi authenticity with a taste of the future'}
        <i />
      </p>
    </aside>
  );
}

function HeritageLabel() {
  const { isRtl } = useLocale();
  return (
    <div className="auth-heritage-label">
      <Icon name="tree-palm" size={24} stroke={1.2} />
      <span>{isRtl ? <>تمور<br />بأصالة<br />سعودية</> : 'Authentically Saudi'}</span>
      <i />
    </div>
  );
}

/**
 * Frame shared by login / register / forgot password / verify OTP: full-screen scene, the card column with
 * its heading, and the story panel.
 */
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-scene">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset('assets/images/home/hero.webp')} alt="" loading="eager" />
      </div>
      <div className="auth-cream" />
      <div className="auth-main">
        <div className="auth-card-column">
          <section className="auth-card" aria-labelledby="auth-title">
            <header className="auth-card-heading">
              <Icon name="tree-palm" size={24} stroke={1.4} />
              <h1 id="auth-title">{title}</h1>
              <p>{subtitle}</p>
            </header>
            {children}
          </section>
        </div>
        <AuthStory />
      </div>
      <HeritageLabel />
    </div>
  );
}

/** Password field with the show / hide toggle ([data-password-toggle]). */
export function PasswordInput({ id, placeholder, autoComplete, registration, invalid }) {
  const { tr } = useLocale();
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-input-wrap">
      <Icon name="lock-keyhole" size={19} />
      <div className="password-input">
        <input id={id} type={visible ? 'text' : 'password'} className="input" placeholder={placeholder} autoComplete={autoComplete} maxLength={128} aria-invalid={invalid ? 'true' : undefined} {...registration} />
        <button type="button" className="button button--icon" aria-pressed={visible} onClick={() => setVisible((v) => !v)} aria-label={visible ? tr('إخفاء كلمة المرور', 'Hide password') : tr('إظهار كلمة المرور', 'Show password')}>
          <Icon name="eye" size={18} />
        </button>
      </div>
    </div>
  );
}

/** Apple / Google placeholders (not connected in the PHP app either). */
export function SocialButtons({ onUnavailable }) {
  const { tr } = useLocale();
  const notice = tr('تسجيل الدخول الاجتماعي غير مفعّل حاليًا.', 'Social sign-in is not connected yet.');
  return (
    <>
      <div className="auth-social-divider"><span>{tr('أو المتابعة عبر', 'Or continue with')}</span></div>
      <div className="auth-social">
        <button type="button" className="button button--outline" onClick={() => onUnavailable(notice)}>
          <Icon name="apple" size={22} />
          {tr('متابعة عبر Apple', 'Continue with Apple')}
        </button>
        <button type="button" className="button button--outline" onClick={() => onUnavailable(notice)}>
          <span className="google-letter" aria-hidden="true">G</span>
          {tr('متابعة عبر Google', 'Continue with Google')}
        </button>
      </div>
    </>
  );
}

export function DemoNotice() {
  const { tr } = useLocale();
  return (
    <p className="auth-demo-notice">
      {tr('وضع تجربة محلي: استخدم بيانات اختبار فقط. لا تُرسل رسائل SMS، وتُحفظ الحسابات في هذا المتصفح فقط.', 'Local preview: use test data only. No SMS is sent. Accounts are stored in this browser only.')}
    </p>
  );
}
