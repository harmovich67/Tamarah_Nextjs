/**
 * Design tokens extracted from the legacy CSS.
 *  - storefront: assets/css/foundation.css (:root custom properties)
 *  - dashboard:  assets/css/admin-source.css (@theme) + the hard-coded admin palette
 * The CSS files remain the runtime source of truth; this module exposes the same values to JS
 * (charts, canvas, inline styles, tests, docs).
 */

export const storefrontTokens = Object.freeze({
  colors: {
    brandGreen900: '#123b2d',
    brandGreen800: '#194c3b',
    brandGreen700: '#256149',
    brandGreen600: '#367858',
    cream50: '#fbf8f1',
    cream100: '#f5efe3',
    sand100: '#ece3d2',
    sand200: '#dcccb2',
    gold400: '#ccb17b',
    gold500: '#a48649',
    earth600: '#816650',
    earth800: '#4e3c2d',
    textPrimary: '#1d352a',
    textSecondary: '#657064',
    border: '#d8d6c8',
    success: '#26613c',
    warning: '#79531c',
    error: '#a33228',
  },
  spacing: { 1: '.25rem', 2: '.5rem', 3: '.75rem', 4: '1rem', 5: '1.25rem', 6: '1.5rem', 8: '2rem', 10: '2.5rem', 12: '3rem', 16: '4rem', 20: '5rem', 24: '6rem' },
  radius: { sm: '.25rem', md: '.5rem', lg: '.75rem', xl: '1.25rem', '2xl': '1.5rem', pill: '999px' },
  shadows: {
    card: '0 8px 28px rgb(18 59 45 / 6%)',
    elevated: '0 16px 64px rgb(18 59 45 / 14%)',
    drawer: '0 0 60px rgb(18 59 45 / 20%)',
  },
  transitions: { fast: '140ms', normal: '240ms', easing: 'cubic-bezier(.2,.7,.3,1)' },
  typography: {
    body: "'thmanyahSans', 'Geeza Pro', 'Tahoma', sans-serif",
    display: "'thmanyahDisplay', 'Geeza Pro', serif",
  },
  breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1440 },
});

export const dashboardTokens = Object.freeze({
  colors: {
    primary50: '#eff7ee',
    primary100: '#d9edd7',
    primary200: '#b4dbae',
    primary500: '#23531e',
    primary600: '#1b4218',
    primary700: '#153313',
    primary800: '#0e230d',
    primary900: '#081507',
    gold400: '#dfc282',
    gold500: '#c49a52',
    gold600: '#a37b34',
    gold700: '#7d5c21',
    sidebar: '#0c190f',
    sidebarDark: '#08120a',
    sidebarBorder: '#19321e',
    surface: '#fcfbfa',
    ink: '#1c1917',
  },
  typography: { sans: "'Thmanyah Sans', 'Cairo', sans-serif" },
});

/** Chart palette for the dashboard (derived from the admin colors; used by Recharts widgets). */
export const chartPalette = Object.freeze(['#23531e', '#c49a52', '#568d43', '#8c5d25', '#7d5c21', '#3e7836']);
