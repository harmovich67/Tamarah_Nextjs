import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert, Badge, Button, ConfirmDialog, DataTable, FileUploader, Icon, IconAction, Modal, PageHeader, StatCard, SelectField, Switch } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { systemService } from '@/services';
import { downloadBlob } from '@/lib/download';

const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(2)} MB` : b >= 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`);
const INTERVALS = [[6, 'كل 6 ساعات', 'Every 6 hours'], [12, 'كل 12 ساعة', 'Every 12 hours'], [24, 'يومياً', 'Daily'], [72, 'كل 3 أيام', 'Every 3 days'], [168, 'أسبوعياً', 'Weekly']];

/** Full backup & restore (resources/views/admin/backup.php). */
export default function Backup() {
  const { tr } = useT();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['backups'], queryFn: () => systemService.listBackups() });
  const [toDelete, setToDelete] = useState(null);
  const [toRestore, setToRestore] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [schedule, setSchedule] = useState({ enabled: false, interval_hours: 24 });
  useEffect(() => { if (data) setSchedule({ enabled: data.auto.enabled, interval_hours: data.auto.interval_hours }); }, [data]);

  const generate = useAdminMutation(() => systemService.generateBackup(), { invalidate: [['backups']], success: (r) => r?.message });
  const remove = useAdminMutation((id) => systemService.deleteBackup(id), { invalidate: [['backups']], success: tr('تم حذف النسخة', 'Backup deleted'), onSuccess: () => setToDelete(null) });
  const restore = useAdminMutation((v) => systemService.restoreBackup(v), {
    invalidate: [['backups'], ['dashboard'], ['products'], ['orders']],
    success: tr('تم استرجاع النسخة الاحتياطية بنجاح', 'Backup restored successfully'),
    onSuccess: () => { setToRestore(null); setUploadOpen(false); setFile(null); },
  });
  const download = useAdminMutation((id) => systemService.downloadBackup(id), { onSuccess: ({ filename, blob }) => { downloadBlob(blob, filename); toast.success(tr('بدأ التنزيل', 'Download started')); } });
  const saveSchedule = useAdminMutation((v) => systemService.saveBackupSchedule(v), { invalidate: [['backups']], success: tr('تم حفظ جدولة النسخ التلقائي', 'Backup schedule saved') });

  const backups = data?.backups || [];
  const columns = [
    { key: 'file', header: tr('الملف', 'File'), sortValue: (b) => b.filename, cell: (b) => <span dir="ltr" className="font-mono text-xs font-bold text-stone-800">{b.filename}</span> },
    { key: 'size', header: tr('الحجم', 'Size'), sortValue: (b) => b.size_bytes, cell: (b) => <span className="text-xs text-stone-600">{fmtSize(b.size_bytes)}</span> },
    { key: 'type', header: tr('النوع', 'Type'), cell: (b) => <Badge tone={b.type === 'auto' ? 'blue' : 'gold'}>{b.type === 'auto' ? tr('تلقائي', 'Automatic') : tr('يدوي', 'Manual')}</Badge> },
    { key: 'date', header: tr('التاريخ', 'Created'), sortValue: (b) => b.created_at, cell: (b) => <span dir="ltr" className="font-mono text-[11px] text-stone-500">{b.created_at}</span> },
    {
      key: 'actions',
      header: tr('الإجراءات', 'Actions'),
      align: 'center',
      cell: (b) => (
        <div className="flex items-center justify-center gap-2">
          <IconAction icon="download" label={tr('تنزيل', 'Download')} onClick={() => download.mutate(b.id)} />
          <IconAction icon="archive-restore" label={tr('استرجاع', 'Restore')} onClick={() => setToRestore(b)} />
          <IconAction icon="trash-2" label={tr('حذف', 'Delete')} tone="danger" onClick={() => setToDelete(b)} />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader
        title={tr('النسخ الاحتياطي والاسترجاع', 'Backups & Restore')}
        subtitle={tr('نسخة كاملة لقاعدة البيانات والملفات، مع جدولة تلقائية واسترجاع آمن', 'Full database and files backup with automatic scheduling and safe restore')}
        actions={
          <>
            <Button variant="outline" icon="upload-cloud" onClick={() => setUploadOpen(true)}>{tr('استرجاع من ملف', 'Restore from file')}</Button>
            <Button icon="folder-archive" loading={generate.isPending} onClick={() => generate.mutate()}>{tr('إنشاء نسخة كاملة الآن', 'Create full backup now')}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatCard icon="archive" label={tr('النسخ المحفوظة', 'Stored backups')} value={backups.length} tone="bg-gold-50 text-gold-700 border-gold-200" />
        <StatCard icon="hard-drive" label={tr('إجمالي الحجم', 'Total size')} value={fmtSize(backups.reduce((s, b) => s + b.size_bytes, 0))} valueClass="text-xl text-slate-900" />
        <StatCard icon="clock" label={tr('آخر نسخة تلقائية', 'Last automatic backup')} value={data?.auto.last_auto_at || backups.find((b) => b.type === 'auto')?.created_at?.slice(0, 10) || '—'} tone="bg-blue-50 text-blue-700 border-blue-200" valueClass="text-sm text-blue-900" />
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
        <div className="flex items-center gap-3">
          <Switch checked={schedule.enabled} onChange={(v) => setSchedule((s) => ({ ...s, enabled: v }))} label={tr('النسخ التلقائي', 'Automatic backups')} />
          <div>
            <p className="font-black text-stone-900 text-sm">{tr('النسخ الاحتياطي التلقائي', 'Automatic backups')}</p>
            <p className="text-[11px] text-stone-500">{tr('يُنفَّذ عند زيارة لوحة التحكم بعد انقضاء الفترة المحددة', 'Runs on a dashboard visit once the interval has elapsed')}</p>
          </div>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <SelectField className="w-48 [&_select]:text-xs" value={schedule.interval_hours} onChange={(e) => setSchedule((s) => ({ ...s, interval_hours: Number(e.target.value) }))} aria-label={tr('الفترة', 'Interval')}>
            {INTERVALS.map(([h, ar, en]) => <option key={h} value={h}>{tr(ar, en)}</option>)}
          </SelectField>
          <Button variant="outline" icon="save" loading={saveSchedule.isPending} onClick={() => saveSchedule.mutate(schedule)}>{tr('حفظ الجدولة', 'Save schedule')}</Button>
        </div>
      </div>

      <DataTable columns={columns} rows={backups} loading={isLoading} error={error} onRetry={refetch} pageSize={10} empty={{ icon: 'database', title: tr('لا توجد نسخ احتياطية بعد', 'No backups yet'), action: <Button icon="folder-archive" onClick={() => generate.mutate()}>{tr('إنشاء أول نسخة', 'Create the first backup')}</Button> }} />
      <Alert type="warning">{tr('يُحتفظ بآخر 5 نسخ فقط. الاسترجاع يستبدل البيانات الحالية بالكامل — أنشئ نسخة جديدة قبل المتابعة.', 'Only the latest 5 backups are kept. Restoring replaces the current data entirely — create a fresh backup first.')}</Alert>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete.id)} loading={remove.isPending} message={tr('حذف هذه النسخة الاحتياطية نهائياً؟', 'Permanently delete this backup?')} confirmLabel={tr('حذف', 'Delete')} />
      <ConfirmDialog open={!!toRestore} onClose={() => setToRestore(null)} onConfirm={() => restore.mutate({ id: toRestore.id })} loading={restore.isPending} message={tr('سيتم استبدال بيانات المتجر الحالية بمحتوى هذه النسخة. هل تريد المتابعة؟', 'The current store data will be replaced with this backup. Continue?')} confirmLabel={tr('استرجاع', 'Restore')} />
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} size="sm" title={tr('استرجاع من ملف', 'Restore from file')} footer={<><Button variant="secondary" onClick={() => setUploadOpen(false)}>{tr('إلغاء', 'Cancel')}</Button><Button variant="danger" loading={restore.isPending} disabled={!file} onClick={() => restore.mutate({ file })}>{tr('استرجاع', 'Restore')}</Button></>}>
        <FileUploader label={tr('ملف النسخة الاحتياطية (zip / sql)', 'Backup file (zip / sql)')} value={file || undefined} onChange={setFile} accept=".zip,.sql,.json" maxSizeMB={200} />
        {!file && <p className="text-[11px] text-stone-400 mt-2">{tr('اختر ملف النسخة الاحتياطية أولاً', 'Choose a backup file first')}</p>}
      </Modal>
    </div>
  );
}
