/**
 * Minimal HTML hardening for CMS content rendered with dangerouslySetInnerHTML (pages / posts authored by the
 * super admin). Strips <script>/<iframe>/<object>/<embed>/<style> blocks, inline event handlers and javascript:
 * URLs. The Laravel backend remains responsible for sanitising on save (see docs/API_CONTRACT.md).
 *
 * @param {string} html
 */
export function sanitizeHtml(html) {
  return String(html ?? '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2');
}
