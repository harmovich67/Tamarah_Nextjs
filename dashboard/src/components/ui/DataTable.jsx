import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { EmptyState, ErrorState, TableSkeleton } from './basics';
import { CARD, INPUT, TABLE_HEAD, cx } from './classes';
import { useT } from '@/hooks/useT';

/** Debounced search box (clear button, search icon, loading hint). */
export function SearchInput({ value, onChange, placeholder, delay = 250, className }) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => setLocal(value ?? ''), [value]);
  useEffect(() => {
    if (local === (value ?? '')) return undefined;
    const t = setTimeout(() => onChange(local), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div className={cx('relative min-w-[240px]', className)}>
      <Icon name="search" className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className={cx(INPUT, 'ps-10 pe-9 text-xs sm:text-[13px] py-2 h-10')}
        aria-label={placeholder}
      />
      {local ? (
        <button
          type="button"
          onClick={() => { setLocal(''); onChange(''); }}
          className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-100 transition"
          aria-label="clear"
        >
          <Icon name="x" className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function Pagination({ page, pageCount, onPage, total, perPage }) {
  const { tr } = useT();
  if (pageCount <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const btn = 'min-w-9 h-9 px-2 rounded-xl text-xs font-semibold border transition-all duration-150 inline-flex items-center justify-center';
  const pages = [];
  for (let i = 1; i <= pageCount; i += 1) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) pages.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 text-xs text-slate-500 font-medium bg-slate-50/40">
      <span>{tr(`عرض ${from}–${to} من ${total}`, `Showing ${from}–${to} of ${total}`)}</span>
      <nav className="flex items-center gap-1.5" aria-label="pagination">
        <button
          type="button"
          className={cx(btn, 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs')}
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          aria-label={tr('السابق', 'Previous')}
        >
          <Icon name="chevron-left" className="w-4 h-4 mx-auto rtl:rotate-180" />
        </button>
        {pages.map((p, i) => (
          <span key={p} className="flex items-center gap-1.5">
            {i > 0 && pages[i - 1] !== p - 1 ? <span className="text-slate-400 px-1">…</span> : null}
            <button
              type="button"
              aria-current={p === page ? 'page' : undefined}
              className={cx(
                btn,
                p === page
                  ? 'bg-[#0f764a] text-white border-[#0f764a] shadow-xs font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs',
              )}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          </span>
        ))}
        <button
          type="button"
          className={cx(btn, 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs')}
          disabled={page === pageCount}
          onClick={() => onPage(page + 1)}
          aria-label={tr('التالي', 'Next')}
        >
          <Icon name="chevron-right" className="w-4 h-4 mx-auto rtl:rotate-180" />
        </button>
      </nav>
    </div>
  );
}

export function DataTable({
  columns,
  rows = [],
  rowKey = (r) => r.id,
  loading,
  error,
  onRetry,
  search = '',
  searchText,
  pageSize = 10,
  empty,
  bulkActions,
  selectable = false,
  toolbar,
  className,
  dense,
}) {
  const { tr } = useT();
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());

  const filtered = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    return q && searchText ? rows.filter((r) => searchText(r).toLowerCase().includes(q)) : rows;
  }, [rows, search, searchText]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    const val = col?.sortValue || ((r) => r[sort.key]);
    const out = [...filtered].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x == null) return 1;
      if (y == null) return -1;
      return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ar');
    });
    return sort.dir === 'desc' ? out.reverse() : out;
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => setPage(1), [search, rows.length]);
  useEffect(() => setSelected(new Set()), [rows]);
  const current = Math.min(page, pageCount);
  const visible = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  const allSelected = visible.length > 0 && visible.every((r) => selected.has(rowKey(r)));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visible.map(rowKey)));
  const toggleOne = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectedRows = rows.filter((r) => selected.has(rowKey(r)));
  const pad = dense ? 'px-4 py-2.5' : 'px-4.5 py-3.5';

  if (error) {
    return (
      <ErrorState
        title={tr('تعذر تحميل البيانات', 'Could not load the data')}
        text={tr('تحقق من الاتصال ثم حاول مرة أخرى.', 'Check your connection and try again.')}
        onRetry={onRetry}
        retryLabel={tr('إعادة المحاولة', 'Try again')}
      />
    );
  }

  return (
    <div className={cx(CARD, 'overflow-hidden w-full', className)}>
      {toolbar ? (
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          {toolbar}
        </div>
      ) : null}

      {selectable && selected.size > 0 && bulkActions ? (
        <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-200/60 flex items-center gap-3 text-xs font-semibold text-amber-900">
          <span className="bg-amber-100/80 px-2 py-0.5 rounded-md">{tr(`${selected.size} محدد`, `${selected.size} selected`)}</span>
          {bulkActions(selectedRows)}
        </div>
      ) : null}

      {loading ? (
        <TableSkeleton cols={Math.min(columns.length, 6)} />
      ) : !visible.length ? (
        <EmptyState
          icon={empty?.icon || (search ? 'search' : 'inbox')}
          title={search ? tr('لا توجد نتائج مطابقة', 'No matching results') : empty?.title || tr('لا توجد سجلات', 'No records available')}
          text={search ? tr('جرّب كلمات بحث مختلفة.', 'Try different search terms.') : empty?.text}
          action={search ? null : empty?.action}
        />
      ) : (
        <>
          {/* desktop / tablet table */}
          <div className="overflow-x-auto w-full hidden md:block">
            <table className="w-full text-xs sm:text-[13px] text-start">
              <thead>
                <tr className={TABLE_HEAD}>
                  {selectable ? (
                    <th className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="select all"
                        className="w-4 h-4 rounded text-[#0f764a] border-slate-300 focus:ring-2 focus:ring-[#0f764a]/20 cursor-pointer accent-[#0f764a]"
                      />
                    </th>
                  ) : null}
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cx(pad, c.align === 'center' ? 'text-center' : 'text-start', c.className)}
                      aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      {c.sortable || c.sortValue ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className="inline-flex items-center gap-1.5 uppercase hover:text-slate-900 transition-colors font-bold tracking-wider"
                        >
                          <span>{c.header}</span>
                          <Icon name={sort.key === c.key ? (sort.dir === 'asc' ? 'arrow-up' : 'arrow-down') : 'chevron-down'} className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      ) : (
                        <span>{c.header}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visible.map((row) => (
                  <tr key={rowKey(row)} className="hover:bg-slate-50/70 transition-colors duration-150">
                    {selectable ? (
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selected.has(rowKey(row))}
                          onChange={() => toggleOne(rowKey(row))}
                          aria-label="select row"
                          className="w-4 h-4 rounded text-[#0f764a] border-slate-300 focus:ring-2 focus:ring-[#0f764a]/20 cursor-pointer accent-[#0f764a]"
                        />
                      </td>
                    ) : null}
                    {columns.map((c) => (
                      <td key={c.key} className={cx(pad, c.align === 'center' ? 'text-center' : 'text-start', 'whitespace-nowrap', c.className)}>
                        {c.cell ? c.cell(row) : row[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* phone layout: one card per row */}
          <ul className="md:hidden divide-y divide-slate-100 bg-white">
            {visible.map((row) => (
              <li key={rowKey(row)} className="p-4 space-y-2.5">
                {columns.filter((c) => !c.hideOnMobile).map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-3 text-xs">
                    <span className="font-semibold text-slate-400 shrink-0">{c.header}</span>
                    <span className="text-end min-w-0 font-medium text-slate-800">{c.cell ? c.cell(row) : row[c.key]}</span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
          <Pagination page={current} pageCount={pageCount} onPage={setPage} total={sorted.length} perPage={pageSize} />
        </>
      )}
    </div>
  );
}
