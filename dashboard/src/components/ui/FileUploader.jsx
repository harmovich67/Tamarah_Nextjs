import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { INPUT, LABEL, cx } from './classes';
import { useT } from '@/hooks/useT';
import { assetUrl } from '@tamrna/shared/utils';

/**
 * Image / document uploader: drag & drop or browse, client-side type + size validation, preview, replace and
 * remove, optional upload progress, single or multiple.
 */
export function FileUploader({
  label,
  value,
  onChange,
  multiple = false,
  accept = 'image/*',
  maxSizeMB = 5,
  progress,
  hint,
  error: externalError,
  className,
}) {
  const { tr } = useT();
  const id = useId();
  const input = useRef(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const list = useMemo(() => (multiple ? (Array.isArray(value) ? value : value ? [value] : []) : value ? [value] : []), [value, multiple]);

  // Preview URLs for File objects, released on change/unmount.
  const [previews, setPreviews] = useState([]);
  useEffect(() => {
    const urls = list.map((v) => (typeof v === 'string' ? assetUrl(v, '') : URL.createObjectURL(v)));
    setPreviews(urls);
    return () => list.forEach((v, i) => typeof v !== 'string' && URL.revokeObjectURL(urls[i]));
  }, [list]);

  const isImage = (v) => (typeof v === 'string' ? /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(v) || v.startsWith('data:image') : v.type?.startsWith('image/'));
  const accepted = (f) => accept.split(',').some((a) => {
    const t = a.trim();
    return t === '*/*' || (t.endsWith('/*') ? f.type.startsWith(t.slice(0, -1)) : f.type === t || f.name.toLowerCase().endsWith(t));
  });

  const take = (files) => {
    setError('');
    const incoming = [...files];
    const bad = incoming.find((f) => !accepted(f));
    if (bad) return setError(tr('نوع الملف غير مدعوم', 'This file type is not supported'));
    const big = incoming.find((f) => f.size > maxSizeMB * 1024 * 1024);
    if (big) return setError(tr(`الحد الأقصى لحجم الملف ${maxSizeMB} ميجابايت`, `Maximum file size is ${maxSizeMB} MB`));
    return onChange(multiple ? [...list, ...incoming] : incoming[0] || null);
  };

  const remove = (i) => onChange(multiple ? list.filter((_, idx) => idx !== i) : null);
  const shown = externalError || error;

  return (
    <div className={className}>
      {label ? <span className={LABEL}>{label}</span> : null}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files); }}
        className={cx(
          'rounded-2xl border-2 border-dashed p-5 transition-all duration-200',
          drag ? 'border-[#0f764a] bg-emerald-50/30' : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50/80 hover:border-slate-300',
          shown && '!border-rose-300 !bg-rose-50/10',
        )}
      >
        {list.length > 0 && (
          <ul className="flex flex-wrap gap-3 mb-4">
            {list.map((v, i) => (
              <li key={`${i}-${typeof v === 'string' ? v : v.name}`} className="relative group">
                {isImage(v) ? (
                  <img src={previews[i]} alt="" className="w-24 h-24 rounded-xl object-cover border border-slate-200 bg-white shadow-2xs" />
                ) : (
                  <div className="w-24 h-24 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col items-center justify-center gap-1.5 text-[11px] text-slate-500 p-2 text-center">
                    <Icon name="file" className="w-6 h-6 text-slate-400" />
                    <span className="line-clamp-2 break-all font-medium">{typeof v === 'string' ? v.split('/').pop() : v.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition"
                  aria-label={tr('إزالة', 'Remove')}
                >
                  <Icon name="x" className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-3.5 flex-wrap">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#0f764a] hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-2 shadow-2xs transition-all duration-150 active:scale-[0.98]"
          >
            <Icon name="upload-cloud" className="w-4 h-4 text-[#0f764a]" />
            <span>
              {list.length && !multiple ? tr('استبدال الملف', 'Replace file') : multiple ? tr('إضافة ملفات', 'Add files') : tr('رفع من الجهاز', 'Upload from device')}
            </span>
          </button>
          <span className="text-xs text-slate-500 font-medium">
            {hint || tr(`اسحب الملف وأفلته هنا (حتى ${maxSizeMB} ميجابايت)`, `Drag a file here (up to ${maxSizeMB} MB)`)}
          </span>
        </div>
        <input id={id} ref={input} type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
        {typeof progress === 'number' && progress > 0 && progress < 100 ? (
          <div className="mt-3.5 h-1.5 rounded-full bg-slate-200 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-[#0f764a] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
      </div>
      {shown ? (
        <p role="alert" className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1.5">
          <Icon name="alert-circle" className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>{shown}</span>
        </p>
      ) : null}
    </div>
  );
}

/** Text input + uploader pair used where the form offered "upload or paste a path". */
export function ImagePathField({ label, path, onPath, file, onFile, pathLabel }) {
  const { tr } = useT();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
      <FileUploader label={label || tr('رفع صورة من الجهاز', 'Upload an image')} value={file || (path ? path : null)} onChange={onFile} />
      <div>
        <label className={LABEL}>{pathLabel || tr('أو مسار الصورة', 'Or image path')}</label>
        <input type="text" value={path || ''} onChange={(e) => onPath(e.target.value)} className={cx(INPUT, 'text-xs')} placeholder="/assets/images/..." />
      </div>
    </div>
  );
}
