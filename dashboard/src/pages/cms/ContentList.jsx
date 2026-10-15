import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, ConfirmDialog, DataTable, Icon, IconAction, LinkButton, PageHeader, SearchInput, SelectField, StatusToggle } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { useQueryParam } from '@/hooks/useQueryState';
import { config } from '@/lib/config';
import { cmsService } from '@/services';

const POST_TYPES = { post: ['مقال مدونة', 'Blog article'], announcement: ['إعلان', 'Announcement'], faq: ['سؤال شائع', 'FAQ'] };

/**
 * Shared list screen for CMS pages and posts (pages/index.php + posts/index.php): search, status filter,
 * publish / draft toggle, edit, preview and delete.
 */
export default function ContentList({ kind }) {
  const isPage = kind === 'page';
  const { tr, isEn } = useT();
  const key = isPage ? 'pages' : 'posts';
  const [search, setSearch] = useQueryParam('q', '');
  const [status, setStatus] = useQueryParam('status', '');
  const [type, setType] = useQueryParam('type', '');
  const [toDelete, setToDelete] = useState(null);
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: [key], queryFn: () => (isPage ? cmsService.listPages() : cmsService.listPosts()) });

  const toggle = useAdminMutation((id) => cmsService.togglePageStatus(id), { invalidate: [[key]], success: tr('تم تحديث حالة النشر', 'Publishing status updated') });
  const remove = useAdminMutation((id) => (isPage ? cmsService.deletePage(id) : cmsService.deletePost(id)), {
    invalidate: [[key]],
    success: isPage ? tr('تم حذف الصفحة بنجاح', 'Page deleted successfully') : tr('تم حذف المنشور بنجاح', 'Post deleted successfully'),
    onSuccess: () => setToDelete(null),
  });

  const rows = data.filter((r) => (!status || r.status === status) && (!type || r.post_type === type));
  const base = isPage ? '/pages' : '/posts';
  const publicUrl = (r) => `${config.storefrontUrl}/${isPage ? 'page' : 'post'}/${r.slug}`;

  const columns = [
    {
      key: 'title',
      header: tr('العنوان', 'Title'),
      sortValue: (r) => r.title_ar,
      cell: (r) => (
        <div className="min-w-0">
          <Link to={`${base}/${r.id}/edit`} className="font-black text-stone-900 hover:text-[#6f431b] block">{isEn ? r.title_en || r.title_ar : r.title_ar}</Link>
          <span className="text-[11px] text-stone-400 block" dir="ltr">{isEn ? r.title_ar : r.title_en}</span>
        </div>
      ),
    },
    { key: 'slug', header: tr('الرابط', 'Slug'), hideOnMobile: true, cell: (r) => <span dir="ltr" className="font-mono text-[11px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded">/{isPage ? 'page' : 'post'}/{r.slug}</span> },
    ...(!isPage ? [{ key: 'type', header: tr('النوع', 'Type'), cell: (r) => <Badge tone="gold">{POST_TYPES[r.post_type]?.[isEn ? 1 : 0] || r.post_type}</Badge> }] : []),
    {
      key: 'status',
      header: tr('الحالة', 'Status'),
      align: 'center',
      sortValue: (r) => r.status,
      cell: (r) =>
        isPage ? (
          <StatusToggle active={r.status === 'published'} onToggle={() => toggle.mutate(r.id)} pending={toggle.isPending && toggle.variables === r.id} activeLabel={tr('منشورة', 'Published')} inactiveLabel={tr('مسودة', 'Draft')} />
        ) : (
          <Badge tone={r.status === 'published' ? 'green' : 'stone'}>{r.status === 'published' ? tr('منشور', 'Published') : tr('مسودة', 'Draft')}</Badge>
        ),
    },
    { key: 'updated', header: tr('آخر تحديث', 'Updated'), hideOnMobile: true, sortValue: (r) => r.updated_at, cell: (r) => <span className="text-stone-500 text-[11px]">{String(r.updated_at || r.created_at).slice(0, 10)}</span> },
    {
      key: 'actions',
      header: tr('الإجراءات', 'Actions'),
      align: 'center',
      cell: (r) => (
        <div className="flex items-center justify-center gap-2">
          <IconAction icon="eye" label={tr('عرض', 'View')} href={publicUrl(r)} target="_blank" rel="noreferrer" />
          <Link to={`${base}/${r.id}/edit`} className="w-8 h-8 rounded-xl flex items-center justify-center transition bg-slate-100 hover:bg-primary-50 text-slate-600 hover:text-primary-700" title={tr('تعديل', 'Edit')} aria-label={tr('تعديل', 'Edit')}>
            <Icon name="edit-3" className="w-4 h-4" />
          </Link>
          <IconAction icon="trash-2" label={tr('حذف', 'Delete')} tone="danger" onClick={() => setToDelete(r)} />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader
        title={isPage ? tr('الصفحات (CMS)', 'Content Pages (CMS)') : tr('المنشورات والأسئلة الشائعة', 'Posts, announcements & FAQs')}
        subtitle={isPage ? tr('إنشاء وتحرير صفحات المحتوى القانونية والتعريفية للمتجر', 'Create and edit the legal and informational pages of the store') : tr('مقالات المدونة وإعلانات المواسم والأسئلة الشائعة', 'Blog articles, seasonal announcements and FAQs')}
        actions={<LinkButton to={`${base}/create`} icon="plus-circle">{isPage ? tr('إضافة صفحة جديدة', 'Add new page') : tr('إضافة منشور جديد', 'Add new post')}</LinkButton>}
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        search={search}
        searchText={(r) => `${r.title_ar} ${r.title_en} ${r.slug}`}
        empty={{ icon: 'file-text', title: isPage ? tr('لا توجد صفحات بعد', 'No pages yet') : tr('لا توجد منشورات بعد', 'No posts yet'), action: <LinkButton to={`${base}/create`} icon="plus">{tr('إنشاء الآن', 'Create now')}</LinkButton> }}
        toolbar={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={tr('ابحث بالعنوان أو الرابط…', 'Search by title or slug…')} className="w-full sm:w-72" />
            <SelectField className="w-full sm:w-44 [&_select]:text-xs [&_select]:py-2" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={tr('الحالة', 'Status')}>
              <option value="">{tr('كل الحالات', 'All statuses')}</option>
              <option value="published">{tr('منشور', 'Published')}</option>
              <option value="draft">{tr('مسودة', 'Draft')}</option>
            </SelectField>
            {!isPage && (
              <SelectField className="w-full sm:w-44 [&_select]:text-xs [&_select]:py-2" value={type} onChange={(e) => setType(e.target.value)} aria-label={tr('النوع', 'Type')}>
                <option value="">{tr('كل الأنواع', 'All types')}</option>
                {Object.entries(POST_TYPES).map(([k, v]) => <option key={k} value={k}>{v[isEn ? 1 : 0]}</option>)}
              </SelectField>
            )}
          </>
        }
      />

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete.id)} loading={remove.isPending} message={tr('هل أنت متأكد من حذف هذا العنصر نهائياً؟', 'Are you sure you want to permanently delete this item?')} confirmLabel={tr('حذف', 'Delete')} />
    </div>
  );
}
