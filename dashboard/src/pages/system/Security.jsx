import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Alert, Button, ConfirmDialog, EmptyState, ErrorState, Icon, PageHeader, PageLoading, SelectField, TextField, Badge, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { systemService } from '@/services';

const STATUS = {
  pass: ['bg-emerald-50 text-emerald-700 border-emerald-200', 'shield-check'],
  warning: ['bg-amber-50 text-amber-700 border-amber-200', 'alert-triangle'],
  fail: ['bg-rose-50 text-rose-700 border-rose-200', 'shield-alert'],
};

function ScoreRing({ score }) {
  const color = score >= 80 ? '#10b981' : score >= 55 ? '#d99a26' : '#ef4444';
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-36 h-36 shrink-0" role="img" aria-label={`${score}/100`}>
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-black text-slate-900">{score}</span><span dir="ltr" className="text-[10px] font-bold text-slate-400">/ 100</span></div>
    </div>
  );
}

/** Security & hardening suite (resources/views/admin/security.php). */
export default function Security() {
  const { tr, isEn } = useT();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['security'], queryFn: () => systemService.getSecurity() });
  const { register, reset, handleSubmit } = useForm({ defaultValues: {} });
  const ipForm = useForm({ defaultValues: { ip: '', reason: '' } });
  const [toUnblock, setToUnblock] = useState(null);
  useEffect(() => { if (data) reset(data.settings); }, [data, reset]);

  const saveSettings = useAdminMutation((v) => systemService.updateSecuritySettings(v), { invalidate: [['security']], success: tr('تم حفظ سياسات الأمان', 'Security policies saved') });
  const block = useAdminMutation((v) => systemService.blockIp(v), {
    invalidate: [['security']],
    success: (r) => r?.message,
    onSuccess: () => ipForm.reset(),
    onFieldErrors: (errs) => Object.entries(errs).forEach(([f, m]) => ipForm.setError(f, { message: [].concat(m)[0] })),
  });
  const unblock = useAdminMutation((ip) => systemService.unblockIp(ip), { invalidate: [['security']], success: (r) => r?.message, onSuccess: () => setToUnblock(null) });

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorState title={tr('تعذر تحميل بيانات الأمان', 'Could not load security data')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} />;
  const { audit, blockedIps, recentLogs } = data;
  const card = 'bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-5';

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader title={tr('الأمان والحماية', 'Security & Hardening')} subtitle={tr('تقييم صحة الحماية، سياسات الدخول وجدار حظر العناوين', 'Protection health audit, sign-in policies and the IP firewall')} />

      <div className={cx(card, 'flex flex-col md:flex-row gap-8 items-center')}>
        <ScoreRing score={audit.score} />
        <div className="flex-1 w-full space-y-3">
          <h2 className="font-black text-slate-900 text-lg flex items-center gap-2"><Icon name="shield-check" className="w-5 h-5 text-primary-600" />{tr('التقييم الآلي لصحة الحماية', 'Automated health assessment')}</h2>
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {audit.checks.map((c) => {
              const [cls, icon] = STATUS[c.status] || STATUS.warning;
              return (
                <li key={c.id} className={cx('p-4 rounded-2xl border space-y-1', cls)}>
                  <p className="text-xs font-black flex items-center gap-1.5"><Icon name={icon} className="w-4 h-4 shrink-0" />{isEn ? c.title_en : c.title}</p>
                  <p className="text-[11px] opacity-90 leading-5">{isEn ? c.desc_en : c.desc}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit((v) => saveSettings.mutate(v))} className={card} noValidate>
          <h3 className="font-black text-slate-900 flex items-center gap-2"><Icon name="sliders" className="w-4 h-4 text-gold-600" />{tr('سياسات الدخول والحماية', 'Sign-in & protection policies')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label={tr('أقصى عدد محاولات دخول', 'Max sign-in attempts')} type="number" min="1" max="50" hint={tr('خلال نافذة الزمن أدناه', 'within the window below')} {...register('security_rate_limit_max')} />
            <TextField label={tr('نافذة القفل (ثوانٍ)', 'Lockout window (seconds)')} type="number" min="30" {...register('security_rate_limit_decay')} />
            <SelectField label={tr('إجبار HTTPS', 'Force HTTPS')} {...register('security_force_https')}><option value="0">{tr('معطل', 'Disabled')}</option><option value="1">{tr('مفعل', 'Enabled')}</option></SelectField>
            <SelectField label={tr('حظر شبكة Tor', 'Block Tor network')} {...register('security_block_tor')}><option value="0">{tr('معطل', 'Disabled')}</option><option value="1">{tr('مفعل', 'Enabled')}</option></SelectField>
          </div>
          <Button type="submit" loading={saveSettings.isPending} icon="check">{tr('حفظ سياسات الأمان', 'Save security policies')}</Button>
        </form>

        <form onSubmit={ipForm.handleSubmit((v) => block.mutate(v))} className={card} noValidate>
          <h3 className="font-black text-stone-900 flex items-center gap-2"><Icon name="ban" className="w-4 h-4 text-rose-500" />{tr('حظر عنوان IP', 'Block an IP address')}</h3>
          <TextField label={tr('عنوان IP', 'IP address')} dir="ltr" placeholder="185.220.101.4" inputClassName="font-mono" error={ipForm.formState.errors.ip?.message} {...ipForm.register('ip')} />
          <TextField label={tr('سبب الحظر', 'Reason')} placeholder={tr('محاولات دخول مشبوهة', 'Suspicious activity')} {...ipForm.register('reason')} />
          <Button type="submit" variant="danger" icon="shield-ban" loading={block.isPending}>{tr('حظر العنوان', 'Block address')}</Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="font-black text-stone-900 flex items-center gap-2"><Icon name="shield-ban" className="w-4 h-4 text-rose-500" />{tr('العناوين المحظورة', 'Blocked IP addresses')} <Badge tone="rose">{blockedIps.length}</Badge></h3>
        {!blockedIps.length ? (
          <EmptyState icon="shield-check" title={tr('جدار الحماية نظيف', 'The firewall is clean')} text={tr('لا توجد عناوين محظورة حالياً.', 'No blocked addresses right now.')} />
        ) : (
          <ul className="divide-y divide-stone-100">
            {blockedIps.map((b) => (
              <li key={b.id} className="py-3 flex items-center gap-3 flex-wrap">
                <code dir="ltr" className="font-mono text-xs font-black bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg">{b.ip}</code>
                <span className="text-xs text-stone-600 flex-1 min-w-[8rem]">{b.reason}</span>
                <time className="text-[11px] font-mono text-stone-400" dir="ltr">{b.blocked_at}</time>
                <Button variant="outline" icon="check" onClick={() => setToUnblock(b)}>{tr('رفع الحظر', 'Unblock')}</Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={card}>
        <h3 className="font-black text-slate-900 flex items-center gap-2"><Icon name="history" className="w-4 h-4 text-gold-600" />{tr('آخر الأحداث الأمنية', 'Recent security events')}</h3>
        {!recentLogs.length ? <p className="text-xs text-stone-400 text-center py-4">{tr('لا توجد أحداث أمنية مسجلة.', 'No security events recorded.')}</p> : (
          <ul className="space-y-2">
            {recentLogs.map((l) => (
              <li key={l.id} className="p-3 rounded-xl bg-stone-50 text-xs flex items-center gap-3 flex-wrap">
                <Badge tone={l.level === 'warning' ? 'amber' : l.level === 'error' ? 'rose' : 'blue'} className="uppercase">{l.level}</Badge>
                <span className="font-semibold text-stone-800 flex-1 min-w-[10rem]">{l.message}</span>
                <time className="font-mono text-[11px] text-stone-400" dir="ltr">{l.created_at}</time>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Alert type="info">{tr('جدار الحماية الفعلي يُطبَّق من الخادم (Laravel). هذه الشاشة تدير القوائم والسياسات فقط.', 'The real firewall is enforced by the server (Laravel). This screen only manages lists and policies.')}</Alert>
      <ConfirmDialog open={!!toUnblock} onClose={() => setToUnblock(null)} onConfirm={() => unblock.mutate(toUnblock.ip)} loading={unblock.isPending} tone="primary" message={tr(`رفع الحظر عن العنوان ${toUnblock?.ip}؟`, `Unblock ${toUnblock?.ip}?`)} confirmLabel={tr('رفع الحظر', 'Unblock')} />
    </div>
  );
}
