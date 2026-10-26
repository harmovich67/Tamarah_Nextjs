/**
 * After a new deploy the old chunk files are gone and the host answers their URLs with the index page (a "text/html" MIME
 * error: "Failed to fetch dynamically imported module"). A tab opened before the deploy hits this on its next navigation.
 * The page is reloaded ONCE to pick up the new build; a second failure inside a minute is left to the error screen so a real
 * outage cannot loop.
 */
const KEY = 'tamrna.admin.chunk-reload';

export function reloadForNewBuild() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage blocked: reload anyway, once per page load */
  }
  window.location.reload();
  return true;
}

export const isStaleChunkError = (error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to load module script/i.test(
    String(error?.message || error || ''),
  );

/** Vite fires this when a preloaded chunk cannot be fetched. */
export function watchStaleChunks() {
  if (typeof window === 'undefined') return;
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewBuild()) event.preventDefault();
  });
}
