import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, ConfirmDialog, DataTable, Icon, IconAction, LinkButton, PageHeader } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { cmsService } from '@/services';

const TARGETS = { page: ['صفحات', 'Pages'], post: ['منشورات', 'Posts'], product: ['منتجات', 'Products'], category: ['أصناف', 'Categories'] };

/** ACF-style custom field groups (resources/views/admin/custom_fields/index.php). */
export default function CustomFieldsPage() {
  const { tr, isEn } = useT();
  const [toDelete, setToDelete] = useState(null);
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['custom-fields'], queryFn: () => cmsService.listCustomFieldGroups() });
  const remove = useAdminMutation((id) => cmsService.deleteCustomFieldGroup(id), { invalidate: [['custom-fields'], ['field-groups']], success: tr('تم حذف مجموعة الحقول بنجاح.', 'Field group deleted.'), onSuccess: () => setToDelete(null) });

  const columns = [
    {
      key: 'title',
      header: tr('المجموعة', 'Group'),
      sortValue: (g) => g.title_ar,
      cell: (g) => (
        <div>
          <Link to={`/custom-fields/${g.id}/edit`} className="font-black text-slate-900 hover:text-primary-700 block">{isEn ? g.title_en || g.title_ar : g.title_ar}</Link>
          <code className="text-[10px] font-mono text-slate-400" dir="ltr">{g.key_name}</code>
        </div>
      ),
    },
    { key: 'target', header: tr('تظهر في', 'Shown on'), cell: (g) => <span className="text-xs"><Badge tone="gold">{TARGETS[g.target_type]?.[isEn ? 1 : 0] || g.target_type}</Badge> <span dir="ltr" className="font-mono text-[10px] text-slate-400 ms-1">{g.target_filter}</span></span> },
    { key: 'count', header: tr('عدد الحقول', 'Fields'), align: 'center', sortValue: (g) => g.fields_count, cell: (g) => <span className="font-black text-primary-700">{g.fields_count}</span> },
    { key: 'status', header: tr('الحالة', 'Status'), align: 'center', cell: (g) => <Badge tone={g.status === 'active' ? 'green' : 'stone'}>{g.status === 'active' ? tr('مفعّلة', 'Active') : tr('معطّلة', 'Inactive')}</Badge> },
    {
      key: 'actions',
      header: tr('الإجراءات', 'Actions'),
      align: 'center',
      cell: (g) => (
        <div className="flex items-center justify-center gap-2">
          <Link to={`/custom-fields/${g.id}/edit`} className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-primary-50 text-slate-600 hover:text-primary-700 transition" title={tr('تعديل', 'Edit')} aria-label={tr('تعديل', 'Edit')}>
            <Icon name="edit-3" className="w-4 h-4" />
          </Link>
          <IconAction icon="trash-2" label={tr('حذف', 'Delete')} tone="danger" onClick={() => setToDelete(g)} />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader
        title={tr('الحقول المخصصة (ACF)', 'Custom Fields (ACF)')}
        subtitle={tr('مجموعات حقول إضافية للصفحات والمنشورات والمنتجات والأصناف', 'Extra field groups for pages, posts, products and categories')}
        actions={<LinkButton to="/custom-fields/create" icon="plus-circle">{tr('مجموعة جديدة', 'New group')}</LinkButton>}
      />
      <DataTable columns={columns} rows={data} loading={isLoading} error={error} onRetry={refetch} empty={{ icon: 'folder-code', title: tr('لا توجد مجموعات حقول بعد', 'No field groups yet'), action: <LinkButton to="/custom-fields/create" icon="plus">{tr('إنشاء مجموعة', 'Create a group')}</LinkButton> }} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete.id)} loading={remove.isPending} message={tr('سيتم حذف المجموعة وجميع حقولها. هل أنت متأكد؟', 'The group and all of its fields will be deleted. Are you sure?')} confirmLabel={tr('حذف', 'Delete')} />
    </div>
  );
}
