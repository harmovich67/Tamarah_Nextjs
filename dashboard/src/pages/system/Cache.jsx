import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, ConfirmDialog, ErrorState, Icon, PageHeader, PageLoading, StatCard, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { systemService } from '@/services';

const GROUP_LABEL = { data: ['بيانات المتجر', 'Store data'], translations: ['الترجمات', 'Translations'], settings: ['الإعدادات', 'Settings'], views: ['القوالب', 'Views'], queries: ['الاستعلامات', 'Queries'], security: ['الأمان', 'Security'] };

/** Cache & performance (resources/views/admin/cache.php). */
export default function Cache() {
  const { tr } = useT();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['cache'], queryFn: () => systemService.getCacheStats() });
  const [confirm, setConfirm] = useState(null);
  const [warmLog, setWarmLog] = useState([]);
  const clear = useAdminMutation((group) => systemService.clearCache(group), { invalidate: [['cache']], success: (r) => r?.message, onSuccess: () => setConfirm(null) });
  const preload = useAdminMutation(() => systemService.preloadCache(), { invalidate: [['cache']], success: (r) => r?.message, onSuccess: (r) => setWarmLog(r.warmed || []) });

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorState title={tr('تعذر تحميل بيانات الكاش', 'Could not load cache data')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} />;

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader
        title={tr('الكاش والأداء', 'Cache & Performance')}
        subtitle={tr('إدارة الذاكرة المؤقتة لتسريع المتجر وتقليل الضغط على قاعدة البيانات', 'Manage the cache to speed up the store and reduce database load')}
        actions={
          <>
            <Button variant="outline" icon="rocket" loading={preload.isPending} onClick={() => preload.mutate()}>{tr('إحماء الكاش', 'Preload cache')}</Button>
            <Button variant="danger" icon="trash-2" onClick={() => setConfirm('all')}>{tr('تفريغ كل الكاش', 'Clear all cache')}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard icon="hard-drive" label={tr('إجمالي حجم الكاش', 'Total cache size')} value={data.total_size_formatted} tone="bg-gold-50 text-gold-700 border-gold-200" valueClass="text-xl text-slate-900" />
        <StatCard icon="files" label={tr('عدد الملفات المخزنة', 'Cached items')} value={data.total_files} />
        <StatCard icon="check-circle-2" label={tr('حالة التخزين', 'Storage status')} value={tr('سليمة', 'Healthy')} valueClass="text-xl text-primary-700" />
        <StatCard icon="gauge" label={tr('محرك الكاش', 'Cache engine')} value="File driver" tone="bg-blue-50 text-blue-700 border-blue-200" valueClass="text-lg text-blue-800" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(data.groups).map(([g, info]) => (
          <div key={g} className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 flex items-center gap-2"><Icon name="database" className="w-4 h-4 text-gold-600" />{tr(...(GROUP_LABEL[g] || [g, g]))}</h3>
              <code className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded" dir="ltr">{g}</code>
            </div>
            <div className="flex items-end justify-between">
              <div><p className="text-2xl font-black text-slate-900">{info.count}</p><p className="text-[11px] text-slate-400">{tr('ملف مخزن', 'cached files')}</p></div>
              <p className={cx('text-sm font-black', info.size ? 'text-primary-700' : 'text-slate-300')}>{info.size_formatted}</p>
            </div>
            <Button variant="outline" icon="trash-2" className="w-full justify-center" disabled={!info.count} onClick={() => setConfirm(g)}>{tr('تفريغ هذه المجموعة', 'Clear this group')}</Button>
          </div>
        ))}
      </div>

      {warmLog.length > 0 && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-3">
          <h3 className="font-black text-stone-900 flex items-center gap-2"><Icon name="flame" className="w-4 h-4 text-orange-500" />{tr('سجل إحماء الكاش', 'Cache warm-up log')}</h3>
          <ul className="space-y-1.5 text-xs">
            {warmLog.map((w) => (
              <li key={w.item} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-stone-50"><span className="font-bold text-stone-800">{w.item}</span><span className={w.ok ? 'text-emerald-700 font-black' : 'text-rose-600 font-black'}>{w.ok ? '✓' : '✕'} {w.size_bytes} B</span></li>
            ))}
          </ul>
        </div>
      )}
      <Alert type="info">{tr('مسح الكاش آمن ولا يحذف أي بيانات للمتجر؛ يُعاد توليده تلقائياً عند أول زيارة.', 'Clearing the cache is safe and removes no store data; it is regenerated on the next visit.')}</Alert>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => clear.mutate(confirm)} loading={clear.isPending} tone="danger" message={confirm === 'all' ? tr('تفريغ كامل الذاكرة المؤقتة؟', 'Clear the entire cache?') : tr(`تفريغ مجموعة (${confirm})؟`, `Clear the "${confirm}" group?`)} confirmLabel={tr('تفريغ', 'Clear')} />
    </div>
  );
}
