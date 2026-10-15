import { ICONS, FALLBACK_ICON } from './icons';

/**
 * Lucide icon by kebab-case name (the same names the PHP views passed to `data-lucide`).
 * @param {{ name: string, className?: string, size?: number }} props
 */
export function Icon({ name, className = 'w-4 h-4', size, ...rest }) {
  const Cmp = ICONS[name] || FALLBACK_ICON;
  return <Cmp aria-hidden="true" className={className} {...(size ? { size } : {})} {...rest} />;
}

export default Icon;
