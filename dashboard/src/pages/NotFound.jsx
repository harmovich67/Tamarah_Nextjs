import { Link } from 'react-router-dom';
import { Icon, CARD, BTN, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';

export default function NotFound() {
  const { tr } = useT();
  return (
    <div className={cx(CARD, 'max-w-xl mx-auto p-10 text-center space-y-4')}>
      <div className="mx-auto w-16 h-16 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center">
        <Icon name="search-x" className="w-8 h-8" />
      </div>
      <p className="text-5xl font-black text-stone-300" dir="ltr">404</p>
      <h1 className="text-2xl font-black text-stone-900 font-serif">{tr('الصفحة غير موجودة', 'Page not found')}</h1>
      <p className="text-sm text-stone-500">{tr('ربما تغيّر الرابط أو لم تعد الصفحة متاحة.', 'The link may have changed or the page is no longer available.')}</p>
      <Link to="/" className={cx(BTN.primary, 'mx-auto')}>{tr('العودة للوحة التحكم', 'Back to the dashboard')}</Link>
    </div>
  );
}
