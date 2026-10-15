import { useSearchParams } from 'react-router-dom';

/** String query-param state (filters / search that should survive reloads and be shareable). */
export function useQueryParam(name, fallback = '') {
  const [params, setParams] = useSearchParams();
  const value = params.get(name) ?? fallback;
  const set = (next) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === '' || next == null || next === fallback) p.delete(name);
        else p.set(name, next);
        return p;
      },
      { replace: true },
    );
  return [value, set];
}
