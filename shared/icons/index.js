/**
 * Icon path data extracted from the legacy `tumurna_icon()` helper + `icons_extra.php`
 * (24×24, stroke-based Lucide paths). Keeping the exact paths guarantees pixel-identical icons.
 */
import paths from './paths.json';

export const iconPaths = paths;

/** @param {string} name */
export const hasIcon = (name) => Object.prototype.hasOwnProperty.call(paths, name);

/** Fallback glyph used by the PHP helper when an icon name is unknown. */
export const FALLBACK_ICON = '<circle cx="12" cy="12" r="10"/>';

/** @param {string} name */
export function getIconMarkup(name) {
  return paths[String(name || '').toLowerCase().trim()] || FALLBACK_ICON;
}
