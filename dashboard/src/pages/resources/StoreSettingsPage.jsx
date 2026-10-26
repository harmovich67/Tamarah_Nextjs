import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, ErrorState, PageHeader, PageLoading, SectionHeading, SwitchRow, TextField } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { resourceService } from '@/services';
import { backendSettings } from '@/services/adapters/laravel/resources';

/**
 * Store settings of the Tamrna backend (`GET / POST /admin/settings`): contact details and switches such as
 * `accept_gift_card_amount` (shows / hides the "Other value" button of the storefront gift card page).
 */
// The backend's `type` decides the input: a number setting (e.g. `accept_gift_card_amount`, type float) must not become a 1 / 0 switch.
// `accept_gift_card_amount` is stored as a float by the backend but works as an on / off switch (1 / 0): the storefront shows
// the "Other value" button only when it is on.
const SWITCH_KEYS = ['accept_gift_card_amount'];
const isSwitch = (s) => SWITCH_KEYS.includes(s.key) || ['boolean', 'bool', 'switch', 'toggle', 'checkbox'].includes(String(s.type).toLowerCase());
const isNumber = (s) => ['float', 'double', 'decimal', 'integer', 'int', 'number'].includes(String(s.type).toLowerCase());
const on = (v) => ['1', 'true', 'yes', 'on'].includes(String(v).trim().toLowerCase()) || Number(v) > 0;

export default function StoreSettingsPage() {
  const { tr } = useT();
  const { data: rows, isLoading, error, refetch } = useQuery({ queryKey: ['resource', 'settings'], queryFn: () => backendSettings.list(), enabled: !!resourceService });
  // A `data = []` default is a new array on every render while loading / after an error, which re-ran the effect forever.
  const data = useMemo(() => rows ?? [], [rows]);
  const [values, setValues] = useState({});

  useEffect(() => {
    if (rows) setValues(Object.fromEntries(rows.map((s) => [s.key, s.value])));
  }, [rows]);

  const changed = useMemo(() => data.filter((s) => String(values[s.key] ?? '') !== String(s.value ?? '')), [data, values]);
  const groups = useMemo(() => {
    const map = new Map();
    data.forEach((s) => map.set(s.group, [...(map.get(s.group) || []), s]));
    return [...map.entries()];
  }, [data]);

  const save = useAdminMutation(() => backendSettings.save(changed.map((s) => ({ key: s.key, value: values[s.key] ?? '' }))), {
    invalidate: [['resource', 'settings']],
    success: tr('تم حفظ الإعدادات', 'Settings saved'),
  });

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorState title={tr('تعذر تحميل الإعدادات', 'Could not load the settings')} onRetry={refetch} retryLabel={tr('إعادة المحاولة', 'Try again')} />;

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader
        title={tr('إعدادات المتجر', 'Store settings')}
        subtitle={tr('بيانات التواصل ومفاتيح التحكم في المتجر الإلكتروني', 'Contact details and switches for the online store')}
        actions={<Button icon="check" loading={save.isPending} disabled={!changed.length} onClick={() => save.mutate()}>{tr('حفظ التغييرات', 'Save changes')}{changed.length ? ` (${changed.length})` : ''}</Button>}
      />
      {!groups.length ? <p className="text-sm text-slate-500">{tr('لا توجد إعدادات.', 'No settings yet.')}</p> : null}
      {groups.map(([group, rows]) => (
        <Card key={group} className="p-5 sm:p-6 space-y-4">
          <SectionHeading icon="settings">{group}</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rows.map((s) =>
              isSwitch(s) ? (
                <SwitchRow key={s.key} label={s.label} hint={s.isPublic ? s.key : `${s.key} · ${tr('غير ظاهر للموقع', 'not visible to the storefront')}`} checked={on(values[s.key])} onChange={(v) => setValues((o) => ({ ...o, [s.key]: v ? '1' : '0' }))} />
              ) : (
                <TextField
                  key={s.key}
                  label={s.label}
                  hint={s.isPublic ? s.key : `${s.key} · ${tr('غير ظاهر للموقع', 'not visible to the storefront')}`}
                  type={isNumber(s) ? 'number' : 'text'}
                  step={isNumber(s) ? 'any' : undefined}
                  dir={s.type === 'phone' || s.type === 'email' || isNumber(s) ? 'ltr' : undefined}
                  value={values[s.key] ?? ''}
                  onChange={(e) => setValues((o) => ({ ...o, [s.key]: e.target.value }))}
                />
              ),
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
