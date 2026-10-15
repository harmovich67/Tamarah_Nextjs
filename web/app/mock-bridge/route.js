import { config, isMockMode } from '@/lib/config';
import { BRIDGE_MESSAGE, SETTINGS_OVERRIDE_KEY } from '@tamrna/shared/mocks';

/**
 * GET /mock-bridge — mock mode only. A tiny page the dashboard embeds in a hidden iframe to hand its saved settings
 * to this origin's localStorage (see shared/mocks/settingsBridge.js). Messages are accepted from the dashboard origin only.
 */
export function GET() {
  if (!isMockMode) return new Response('Not found', { status: 404 });
  const dashboardOrigin = new URL(config.dashboardUrl).origin;
  const html = `<!doctype html><meta charset="utf-8"><title>mock bridge</title><script>
addEventListener('message', function (e) {
  if (e.origin !== ${JSON.stringify(dashboardOrigin)} || !e.data || e.data.type !== ${JSON.stringify(BRIDGE_MESSAGE)}) return;
  try { localStorage.setItem(${JSON.stringify(SETTINGS_OVERRIDE_KEY)}, JSON.stringify(e.data.settings || {})); } catch (err) {}
  e.source.postMessage({ type: ${JSON.stringify(`${BRIDGE_MESSAGE}:ack`)} }, e.origin);
});
</script>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': `frame-ancestors ${dashboardOrigin}` } });
}
