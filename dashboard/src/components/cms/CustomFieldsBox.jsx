import { useMemo, useState } from 'react';
import { iconPaths } from '@tamrna/shared/icons';
import { Icon as SharedIcon } from '@tamrna/shared/components/Icon';
import { FileUploader, INPUT, INPUT_SM, Icon, Switch, cx } from '@/components/ui';
import { useT } from '@/hooks/useT';

/** Icon picker backed by the storefront icon set, so the chosen name always renders on the public site. */
function IconPicker({ value, onChange }) {
  const { tr } = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const names = useMemo(() => Object.keys(iconPaths).filter((n) => n.includes(q.toLowerCase().trim())).sort(), [q]);
  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-primary-700">{value ? <SharedIcon name={value} size={22} /> : <Icon name="sparkles" className="w-5 h-5 text-slate-300" />}</div>
        <code dir="ltr" className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-600 truncate">{value || tr('لم يتم اختيار أيقونة', 'No icon selected')}</code>
        <button type="button" onClick={() => setOpen((v) => !v)} className="px-3.5 py-2.5 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 font-bold text-xs border border-primary-200/70 inline-flex items-center gap-1.5 transition">
          <Icon name="layout-grid" className="w-3.5 h-3.5" />
          {tr('اختر أيقونة', 'Choose icon')}
        </button>
        {value ? (
          <button type="button" onClick={() => onChange('')} className="px-3 py-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200" aria-label={tr('مسح', 'Clear')}>
            <Icon name="x" className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
      {open && (
        <div className="absolute z-20 mt-2 w-full sm:w-[420px] p-4 bg-white border border-stone-200 rounded-2xl shadow-2xl space-y-3">
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('ابحث عن أيقونة…', 'Search icons…')} className={cx(INPUT_SM)} />
          <div className="max-h-64 overflow-y-auto grid grid-cols-6 gap-2">
            {names.map((n) => (
              <button key={n} type="button" title={n} onClick={() => { onChange(n); setOpen(false); }} className={cx('aspect-square rounded-xl border flex items-center justify-center hover:bg-primary-50 text-slate-700 transition', value === n ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-slate-200')}>
                <SharedIcon name={n} size={18} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubInput({ sub, value, onChange }) {
  const { tr } = useT();
  const type = sub.type || 'text';
  if (type === 'textarea' || type === 'wysiwyg') return <textarea rows={2} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={INPUT_SM} />;
  if (type === 'number') return <input type="number" step="any" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={INPUT_SM} />;
  if (type === 'color') return <input type="color" value={value || '#4f46e5'} onChange={(e) => onChange(e.target.value)} className="w-10 h-8 p-0.5 rounded-lg border border-stone-200" />;
  if (type === 'boolean')
    return (
      <select value={String(value ?? '1')} onChange={(e) => onChange(e.target.value)} className={INPUT_SM}>
        <option value="1">{tr('نعم (Yes)', 'Yes')}</option>
        <option value="0">{tr('لا (No)', 'No')}</option>
      </select>
    );
  if (type === 'image') return <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="/uploads/... / URL" className={INPUT_SM} dir="ltr" />;
  return <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={INPUT_SM} />;
}

function Repeater({ field, value, onChange }) {
  const { tr, isEn } = useT();
  const subs = Array.isArray(field.options) ? field.options : [];
  const rows = Array.isArray(value) && value.length ? value : [{}];
  const setRow = (i, key, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  return (
    <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/70 space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-primary-700">#{i + 1}</span>
            <button type="button" onClick={() => onChange(rows.filter((_, idx) => idx !== i))} className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1">
              <Icon name="trash-2" className="w-3.5 h-3.5" /> {tr('حذف الصف', 'Delete row')}
            </button>
          </div>
          <div className={cx('grid grid-cols-1 gap-3', subs.length >= 3 ? 'sm:grid-cols-3' : subs.length === 2 ? 'sm:grid-cols-2' : '')}>
            {subs.map((s) => (
              <div key={s.name}>
                <label className="block text-xs font-bold text-stone-700 mb-1">{isEn && s.label_en ? s.label_en : s.label_ar || s.label || s.name}</label>
                {s.name === 'icon' && (s.type || 'text') === 'text' ? <IconPicker value={row[s.name]} onChange={(v) => setRow(i, s.name, v)} /> : <SubInput sub={s} value={row[s.name]} onChange={(v) => setRow(i, s.name, v)} />}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, {}])} className="px-3.5 py-2 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 font-bold text-xs border border-primary-200/70 inline-flex items-center gap-1.5 transition">
        <Icon name="plus" className="w-3.5 h-3.5" /> {tr('إضافة صف', 'Add row')}
      </button>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  const { tr } = useT();
  switch (field.type) {
    case 'textarea':
      return <textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={INPUT} />;
    case 'wysiwyg':
      return <textarea rows={5} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={cx(INPUT, 'font-mono text-xs')} dir="ltr" placeholder="<p>HTML…</p>" />;
    case 'number':
      return <input type="number" step="any" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={cx(INPUT, 'sm:w-64')} />;
    case 'color':
      return (
        <div className="flex items-center gap-3">
          <input type="color" value={value || '#4f46e5'} onChange={(e) => onChange(e.target.value)} className="w-12 h-11 p-1 rounded-xl border border-stone-200" />
          <input type="text" value={value || '#4f46e5'} onChange={(e) => onChange(e.target.value)} className="w-32 px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs" dir="ltr" />
        </div>
      );
    case 'boolean':
      return (
        <div className="flex items-center gap-3">
          <Switch checked={value === '1' || value === 1 || value === true} onChange={(v) => onChange(v ? '1' : '0')} label={field.label_en} />
          <span className="text-xs font-semibold text-stone-600">{tr('مفعّل', 'Enabled')}</span>
        </div>
      );
    case 'image':
      return <FileUploader value={value || undefined} onChange={(v) => onChange(v)} accept="image/*" maxSizeMB={5} />;
    case 'icon':
      return <IconPicker value={value} onChange={onChange} />;
    case 'select': {
      const opts = field.options && typeof field.options === 'object' ? Object.entries(field.options) : [];
      return (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={cx(INPUT, 'sm:w-80 font-bold')}>
          <option value="">{tr('اختر…', 'Select…')}</option>
          {opts.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      );
    }
    case 'repeater':
      return <Repeater field={field} value={value} onChange={onChange} />;
    default:
      return <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={INPUT} />;
  }
}

/**
 * Dynamic ACF meta box (CustomFields::renderMetaBox): one card per matching field group, one input per field
 * type. Values are an object keyed by field name; the parent submits it as `fields`.
 */
export default function CustomFieldsBox({ groups = [], values = {}, onChange }) {
  const { tr, isEn } = useT();
  if (!groups.length) return null;
  const set = (name, v) => onChange({ ...values, [name]: v });
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.id} className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Icon name="folder-code" className="w-5 h-5 text-gold-600" />
            <h2 className="text-base font-black text-slate-900">{isEn ? g.title_en || g.title_ar : g.title_ar}</h2>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md ms-auto" dir="ltr">ACF</span>
          </div>
          {(g.fields || []).map((f) => (
            <div key={f.id ?? f.name} className="space-y-1.5 pb-5 border-b border-stone-100 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs font-bold text-stone-700">
                  {isEn ? f.label_en || f.label_ar : f.label_ar}
                  {f.required ? <span className="text-rose-500"> *</span> : null}
                </label>
                <code className="text-[10px] font-mono text-stone-400" dir="ltr">get_field('{f.name}')</code>
                <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 rounded">{f.type}</span>
              </div>
              {(isEn ? f.instructions_en : f.instructions_ar) ? <p className="text-[11px] text-stone-400">{isEn ? f.instructions_en : f.instructions_ar}</p> : null}
              <FieldInput field={f} value={values[f.name] ?? (f.type === 'boolean' ? f.default_value || '0' : f.default_value || undefined)} onChange={(v) => set(f.name, v)} />
            </div>
          ))}
          {!(g.fields || []).length && <p className="text-xs text-stone-400">{tr('لا توجد حقول في هذه المجموعة.', 'This group has no fields.')}</p>}
        </div>
      ))}
    </div>
  );
}

/** Seed missing values with each field's default so untouched switches / selects keep their default on save. */
export function withDefaults(groups = [], values = {}) {
  const out = { ...values };
  groups.forEach((g) =>
    (g.fields || []).forEach((f) => {
      if (out[f.name] === undefined && f.default_value !== undefined && f.default_value !== '') out[f.name] = f.default_value;
    }),
  );
  return out;
}
