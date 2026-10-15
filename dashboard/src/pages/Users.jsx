import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Badge, Button, ConfirmDialog, DataTable, Icon, IconAction, Modal, PageHeader, PasswordField, SearchInput, SelectField, TextField, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { useQueryParam } from '@/hooks/useQueryState';
import { usePermissions } from '@/hooks/usePermissions';
import { accessService } from '@/services';
import { userSchema } from '@/schemas';

const initial = (name) => String(name || '?').slice(0, 1);

function UserDialog({ open, user, roles, onClose }) {
  const { tr, locale, isEn } = useT();
  const m = (ar, en) => (locale === 'en' ? en : ar);
  const editing = !!user;
  const schema = useMemo(() => userSchema(m, { editing }), [locale, editing]); // eslint-disable-line react-hooks/exhaustive-deps
  const blank = { name: '', email: '', phone: '', password: '', role_id: 3, status: 'active' };
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: blank });
  useEffect(() => {
    if (open) reset(user ? { name: user.name, email: user.email, phone: user.phone || '', password: '', role_id: user.role_id, status: user.status || 'active' } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const save = useAdminMutation((v) => (editing ? accessService.updateUser(user.id, v) : accessService.createUser(v)), {
    invalidate: [['users']],
    success: editing ? tr('تم تحديث بيانات المستخدم بنجاح', 'User updated successfully') : tr('تم إنشاء المستخدم بنجاح', 'User created successfully'),
    onSuccess: onClose,
    onFieldErrors: (errs) => Object.entries(errs).forEach(([f, msgs]) => setError(f, { message: [].concat(msgs)[0] })),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? tr('تعديل بيانات المستخدم', 'Edit user') : tr('إضافة مستخدم جديد', 'Add new user')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{tr('إلغاء', 'Cancel')}</Button>
          <Button type="submit" form="user-form" loading={save.isPending}>{editing ? tr('حفظ التعديلات', 'Save changes') : tr('إنشاء المستخدم', 'Create user')}</Button>
        </>
      }
    >
      <form id="user-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 text-sm">
        <TextField label={tr('الاسم الكامل', 'Full name')} required error={errors.name?.message} inputClassName="text-xs font-bold" {...register('name')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={tr('البريد الإلكتروني', 'Email')} required type="email" dir="ltr" error={errors.email?.message} inputClassName="text-xs font-mono" {...register('email')} />
          <TextField label={tr('رقم الجوال', 'Mobile')} type="tel" dir="ltr" placeholder="05XXXXXXXX" inputClassName="text-xs font-mono" {...register('phone')} />
        </div>
        <PasswordField label={editing ? tr('كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالية)', 'New password (leave empty to keep the current one)') : `${tr('كلمة المرور', 'Password')} *`} dir="ltr" placeholder="••••••••" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label={tr('الدور والصلاحية', 'Role & permission')} required {...register('role_id')}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{isEn ? r.display_name_en || r.name : r.display_name_ar}</option>
            ))}
          </SelectField>
          <SelectField label={tr('حالة الحساب', 'Account status')} required {...register('status')}>
            <option value="active">{tr('نشط ومعتمد', 'Active')}</option>
            <option value="pending">{tr('قيد الانتظار', 'Pending')}</option>
            <option value="rejected">{tr('محظور / متوقف', 'Suspended')}</option>
          </SelectField>
        </div>
      </form>
    </Modal>
  );
}

/** Users & roles (resources/views/admin/users.php). */
export default function Users() {
  const { tr, isEn } = useT();
  const { user: me } = usePermissions();
  const [search, setSearch] = useQueryParam('q', '');
  const [role, setRole] = useQueryParam('role', '');
  const [dialog, setDialog] = useState({ open: false, user: null });
  const [toDelete, setToDelete] = useState(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['users'], queryFn: () => accessService.listUsers() });
  const users = data?.users || [];
  const roles = data?.roles || [];
  const remove = useAdminMutation((id) => accessService.deleteUser(id), { invalidate: [['users']], success: tr('تم حذف المستخدم بنجاح', 'User deleted'), onSuccess: () => setToDelete(null) });

  const rows = users.filter((u) => !role || String(u.role_id) === role);

  const columns = [
    {
      key: 'user',
      header: tr('المستخدم / العميل', 'User / Customer'),
      sortValue: (u) => u.name,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0f764a] border border-emerald-200/60 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">{initial(u.name)}</div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-900 block leading-tight">{u.name}</span>
            <span dir="ltr" className="text-[11px] text-slate-400 font-mono">{u.email}</span>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: tr('رقم الجوال', 'Saudi Mobile'), hideOnMobile: true, cell: (u) => <span dir="ltr" className="font-mono text-slate-700 text-xs">{u.phone || '—'}</span> },
    {
      key: 'role',
      header: tr('الدور والصلاحية', 'Role & Permission'),
      align: 'center',
      sortValue: (u) => u.role_id,
      cell: (u) => (
        <span className={cx('inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border', u.role_name === 'super_admin' ? 'bg-amber-50 text-amber-800 border-amber-200/70' : u.role_name === 'store_manager' ? 'bg-sky-50 text-sky-800 border-sky-200/70' : 'bg-slate-100 text-slate-700 border-slate-200/70')}>
          <Icon name={u.role_name === 'super_admin' ? 'crown' : u.role_name === 'store_manager' ? 'store' : 'user'} className="w-3 h-3" />
          {isEn ? u.role_en : u.role_ar}
        </span>
      ),
    },
    {
      key: 'activity',
      header: tr('المدينة والطلبات', 'City & Activity'),
      align: 'center',
      sortValue: (u) => u.orders_count,
      cell: (u) => (
        <div className="text-xs">
          <span className="font-bold text-stone-800 block">{u.customer_city || '—'}</span>
          <span className="text-[10px] text-stone-400">{u.orders_count} {tr('طلب', 'orders')}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: tr('حالة الحساب', 'Account Status'),
      align: 'center',
      cell: (u) => (
        <span className={cx('inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border whitespace-nowrap', u.status === 'active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : u.status === 'pending' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-rose-50 text-rose-800 border-rose-200')}>
          <span className={cx('w-1.5 h-1.5 rounded-full', u.status === 'active' ? 'bg-emerald-500' : u.status === 'pending' ? 'bg-amber-500' : 'bg-rose-500')} />
          {u.status === 'active' ? tr('نشط ومعتمد', 'Active') : u.status === 'pending' ? tr('قيد الانتظار', 'Pending') : tr('محظور / متوقف', 'Suspended')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: tr('الإجراءات', 'Actions'),
      align: 'center',
      cell: (u) => (
        <div className="flex items-center justify-center gap-2">
          <IconAction icon="edit-3" label={tr('تعديل', 'Edit')} onClick={() => setDialog({ open: true, user: u })} />
          {u.id !== me?.id && <IconAction icon="trash-2" label={tr('حذف', 'Delete')} tone="danger" onClick={() => setToDelete(u)} />}
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader
        title={tr('إدارة المستخدمين وحسابات العملاء', 'Users & Customers Management')}
        subtitle={tr('إدارة حسابات عملاء المتجر، المديرين، أدوار الموظفين، وصلاحيات الحسابات', 'Manage store customers, administrators, staff roles and account permissions')}
        actions={<Button icon="user-plus" onClick={() => setDialog({ open: true, user: null })}>{tr('إضافة مستخدم جديد', 'Add new user')}</Button>}
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        search={search}
        searchText={(u) => `${u.name} ${u.email} ${u.phone || ''}`}
        empty={{ icon: 'users', title: tr('لا يوجد مستخدمون', 'No users found') }}
        toolbar={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder={tr('ابحث بالاسم أو البريد أو الجوال…', 'Search by name, email or phone…')} className="w-full sm:w-72" />
            <SelectField className="w-full sm:w-52 [&_select]:text-xs [&_select]:py-2" value={role} onChange={(e) => setRole(e.target.value)} aria-label={tr('الدور', 'Role')}>
              <option value="">{tr('كل الأدوار', 'All roles')}</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{isEn ? r.display_name_en || r.name : r.display_name_ar}</option>)}
            </SelectField>
            <Badge tone="gold" className="ms-auto !text-xs !px-3 !py-1.5">{tr('الإجمالي: ', 'Total: ')}{users.length}</Badge>
          </>
        }
      />

      <UserDialog open={dialog.open} user={dialog.user} roles={roles} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => remove.mutate(toDelete.id)} loading={remove.isPending} message={tr(`هل أنت متأكد من حذف المستخدم (${toDelete?.name || ''}) نهائياً؟`, `Permanently delete the user (${toDelete?.name || ''})?`)} confirmLabel={tr('حذف', 'Delete')} />
    </div>
  );
}
