import { getIconMarkup } from '../icons/index.js';

/**
 * Inline SVG icon rendered from the migrated Lucide path data.
 * Equivalent of the PHP `fnd_icon($name, $size, $class, $stroke)` helper.
 *
 * Add the `directional-arrow` class to icons that must mirror in LTR (handled by the CSS).
 *
 * @param {object} props
 * @param {string} props.name        Lucide icon name (kebab-case)
 * @param {number} [props.size=20]
 * @param {string} [props.className]
 * @param {number} [props.stroke=2]
 * @param {boolean} [props.filled]   fill with currentColor (rating stars)
 */
export function Icon({ name, size = 20, className = '', stroke = 2, filled = false, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`lucide lucide-${name} ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
      {...rest}
      dangerouslySetInnerHTML={{ __html: getIconMarkup(name) }}
    />
  );
}

export default Icon;
