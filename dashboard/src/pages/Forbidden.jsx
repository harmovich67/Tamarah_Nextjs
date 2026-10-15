import { Link } from 'react-router-dom';
import { Icon, CARD, BTN, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';

/** 403 — authenticated but not allowed. Laravel still enforces authorization server-side. */
export default function Forbidden() {
  const { tr } = useT();
  return (
    <div className={cx(CARD, 'max-w-xl mx-auto p-10 text-center space-y-4')} role="alert">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
        <Icon name="shield-ban" className="w-8 h-8" />
      </div>
      <p className="text-5xl font-black text-stone-300" dir="ltr">403</p>
      <h1 className="text-2xl font-black text-stone-900 font-serif">{tr('لا تملك صلاحية الوصول', 'Access denied')}</h1>
      <p className="text-sm text-stone-500">{tr('ليست لديك صلاحية لفتح هذه الصفحة. تواصل مع مدير النظام إذا كنت تحتاجها.', 'You do not have permission to open this page. Contact a super admin if you need it.')}</p>
      <Link to="/" className={cx(BTN.primary, 'mx-auto')}>{tr('العودة للوحة التحكم', 'Back to the dashboard')}</Link>
    </div>
  );
}
