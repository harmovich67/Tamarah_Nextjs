import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Icon, PageHeader, SearchInput, SelectField, Skeleton, StatCard, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { useQueryParam } from '@/hooks/useQueryState';
import { systemService } from '@/services';
import { downloadBlob } from '@/lib/download';

const LEVEL_TONE = { error: 'rose', warning: 'amber', info: 'blue' };

/** System logs & audit trail (resources/views/admin/logs.php). */
export default function Logs() {
  const { tr } = useT();
  const [level, setLevel] = useQueryParam('level', 'all');
  const [channel, setChannel] = useQueryParam('channel', 'all');
  const [q, setQ] = useQueryParam('q', '');
  const [limit, setLimit] = useQueryParam('limit', '150');
  const [confirmClear, setConfirmClear] = useState(false);
  const [open, setOpen] = useState(() => new Set());
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ['logs', { level, channel, q, limit }], queryFn: () => systemService.listLogs({ level, channel, q, limit }), placeholderData: (p) => p });

  const clear = useAdminMutation(() => systemService.clearLogs(), { invalidate: [['logs']], success: (r) => r?.message, onSuccess: () => setConfirmClear(false) });
  const download = useAdminMutation(() => systemService.downloadLogs(), { onSuccess: ({ filename, blob }) => { downloadBlob(blob, filename); toast.success(tr('تم تنزيل السجل', 'Log downloaded')); } });

  const toggle = (id) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const stats = data?.stats;

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader
        title={tr('سجلات النظام والمراجعة', 'System Logs & Audit')}
        subtitle={tr('تتبع الأحداث والأخطاء ومحاولات الدخول وعمليات الإدارة', 'Track events, errors, sign-in attempts and admin operations')}
        actions={
          <>
            <Button variant="outline" icon="download" loading={download.isPending} onClick={() => download.mutate()}>{tr('تنزيل السجل', 'Download log')}</Button>
            <Button variant="danger" icon="trash-2" onClick={() => setConfirmClear(true)}>{tr('تفريغ السجلات', 'Clear logs')}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard icon="file-text" label={tr('إجمالي الأحداث', 'Total events')} value={stats?.total_events ?? '—'} tone="bg-stone-100 text-stone-700 border-stone-200" />
        <StatCard icon="alert-octagon" label={tr('أخطاء', 'Errors')} value={stats?.errors_count ?? '—'} tone="bg-rose-50 text-rose-600 border-rose-200" valueClass="text-2xl text-rose-700" />
        <StatCard icon="alert-triangle" label={tr('تحذيرات', 'Warnings')} value={stats?.warnings_count ?? '—'} tone="bg-amber-50 text-amber-700 border-amber-200" valueClass="text-2xl text-amber-700" />
        <StatCard icon="shield" label={tr('أحداث أمنية', 'Security events')} value={stats?.security_count ?? '—'} tone="bg-blue-50 text-blue-700 border-blue-200" valueClass="text-2xl text-blue-800" />
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex flex-wrap items-center gap-3">
          <SearchInput value={q} onChange={setQ} placeholder={tr('ابحث في السجلات…', 'Search the logs…')} className="w-full sm:w-72" />
          <SelectField className="w-full sm:w-40 [&_select]:text-xs [&_select]:py-2" value={level} onChange={(e) => setLevel(e.target.value)} aria-label={tr('المستوى', 'Level')}>
            <option value="all">{tr('كل المستويات', 'All levels')}</option>
            <option value="error">{tr('أخطاء', 'Errors')}</option>
            <option value="warning">{tr('تحذيرات', 'Warnings')}</option>
            <option value="info">{tr('معلومات', 'Info')}</option>
          </SelectField>
          <SelectField className="w-full sm:w-40 [&_select]:text-xs [&_select]:py-2" value={channel} onChange={(e) => setChannel(e.target.value)} aria-label={tr('القناة', 'Channel')}>
            <option value="all">{tr('كل القنوات', 'All channels')}</option>
            {(data?.channels || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </SelectField>
          <SelectField className="w-full sm:w-32 [&_select]:text-xs [&_select]:py-2" value={limit} onChange={(e) => setLimit(e.target.value)} aria-label={tr('العدد', 'Limit')}>
            {['50', '150', '500', '1000'].map((n) => <option key={n} value={n}>{n}</option>)}
          </SelectField>
          <span className="ms-auto text-[11px] text-stone-400">{isFetching ? tr('جارٍ التحديث…', 'Refreshing…') : tr(`${data?.logs.length ?? 0} سجل معروض · ${stats?.total_size_formatted ?? ''}`, `${data?.logs.length ?? 0} records shown · ${stats?.total_size_formatted ?? ''}`)}</span>
        </div>

        {error ? (
          <div className="p-6"><ErrorState title={tr('تعذر تحميل السجلات', 'Could not load the logs')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} /></div>
        ) : isLoading ? (
          <div className="p-4 space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !data.logs.length ? (
          <EmptyState icon="search-x" title={tr('لا توجد سجلات مطابقة', 'No matching logs')} text={tr('جرّب تغيير الفلاتر.', 'Try changing the filters.')} />
        ) : (
          <ul className="divide-y divide-stone-100">
            {data.logs.map((l) => (
              <li key={l.id} className="p-4 hover:bg-stone-50/60">
                <div className="flex items-start gap-3 flex-wrap">
                  <Badge tone={LEVEL_TONE[l.level] || 'stone'} className="uppercase">{l.level}</Badge>
                  <Badge tone="stone">{l.channel}</Badge>
                  <span className="text-xs font-semibold text-slate-800 flex-1 min-w-[12rem] break-words">{l.message}</span>
                  <time className="text-[11px] font-mono text-slate-400" dir="ltr">{l.created_at}</time>
                  {l.context && Object.keys(l.context).length > 0 && (
                    <button type="button" onClick={() => toggle(l.id)} className="text-[11px] font-bold text-gold-700 hover:underline inline-flex items-center gap-1" aria-expanded={open.has(l.id)}>
                      <Icon name="code" className="w-3 h-3" />{tr('عرض البيانات', 'Show context')}
                    </button>
                  )}
                </div>
                {open.has(l.id) && <pre dir="ltr" className={cx('mt-2 text-[11px] bg-slate-900 text-emerald-200 p-3 rounded-xl overflow-x-auto')}>{JSON.stringify(l.context, null, 2)}</pre>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog open={confirmClear} onClose={() => setConfirmClear(false)} onConfirm={() => clear.mutate()} loading={clear.isPending} message={tr('هل أنت متأكد من تفريغ كافة سجلات النظام؟ لا يمكن التراجع.', 'Clear all system logs? This cannot be undone.')} confirmLabel={tr('تفريغ', 'Clear')} />
    </div>
  );
}
