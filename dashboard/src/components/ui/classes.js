/**
 * Modern Design System Tokens for Tamrna Admin Dashboard
 * Scaled typography, refined color palette, systematic input heights, soft elevation, and micro-interactions.
 */
export const cx = (...parts) => parts.flat(Infinity).filter(Boolean).join(' ');

/* Surfaces & Layout Hierarchy */
export const CARD = 'bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-xs transition-shadow duration-200';
export const HEADER_CARD = 'bg-white p-5 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4';
export const H1 = 'text-xl sm:text-2xl font-bold text-slate-900 tracking-tight';
export const SUBTITLE = 'text-xs sm:text-sm font-medium text-slate-500 mt-1';
export const SECTION_TITLE = 'text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2';

/* Form Controls & Inputs - systematic scale (sm: 36px, md: 42px, lg: 48px) */
export const LABEL = 'block text-xs font-semibold text-slate-700 mb-1.5 tracking-tight';

export const INPUT = 'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all duration-200 hover:border-slate-300 focus:outline-none focus:border-[#0f764a] focus:ring-4 focus:ring-[#0f764a]/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed';
export const INPUT_SM = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all duration-200 hover:border-slate-300 focus:outline-none focus:border-[#0f764a] focus:ring-3 focus:ring-[#0f764a]/10 disabled:bg-slate-50 disabled:cursor-not-allowed';
export const INPUT_LG = 'w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-base font-medium text-slate-900 placeholder:text-slate-400 shadow-xs transition-all duration-200 hover:border-slate-300 focus:outline-none focus:border-[#0f764a] focus:ring-4 focus:ring-[#0f764a]/10 disabled:bg-slate-50 disabled:cursor-not-allowed';

export const INPUT_INVALID = '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-500/15 !bg-rose-50/10';

/* Button System with micro-press physics and crisp gradients */
export const BTN = {
  primary: 'px-4.5 py-2.5 bg-gradient-to-b from-[#137547] to-[#0e5c37] hover:from-[#0e5c37] hover:to-[#0a472a] active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_4px_rgba(19,117,71,0.2)] hover:shadow-[0_4px_12px_rgba(19,117,71,0.3)] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none',
  gold: 'px-4 py-2.5 rounded-xl bg-gradient-to-b from-[#d49e35] to-[#b98422] hover:from-[#b98422] hover:to-[#9f6f1a] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_4px_rgba(212,158,53,0.2)] hover:shadow-[0_4px_12px_rgba(212,158,53,0.3)] inline-flex items-center justify-center gap-1.5 disabled:opacity-50',
  secondary: 'px-4 py-2.5 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-2xs transition-all duration-150 disabled:opacity-50',
  danger: 'px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs transition-all duration-150 disabled:opacity-50',
  outline: 'px-3.5 py-2 rounded-xl border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all duration-150 disabled:opacity-50',
  ghost: 'px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors',
  icon: 'p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors',
  iconGold: 'p-2 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-xl transition-colors font-medium',
  iconDanger: 'p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors',
};

/* Data Table Typography & Styling */
export const TH = 'px-4 py-3.5 text-start font-semibold text-slate-500 text-[11px] uppercase tracking-wider';
export const TABLE_HEAD = 'bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider';

/* Feedback Alerts */
export const ALERT = {
  success: 'p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900 text-xs font-medium flex items-center gap-2.5',
  warning: 'p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs font-medium flex items-center gap-2.5',
  error: 'p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 text-rose-900 text-xs font-medium flex items-center gap-2.5',
  info: 'p-4 rounded-xl bg-sky-50/70 border border-sky-200/80 text-sky-900 text-xs font-medium flex items-center gap-2.5',
};

/* Semantic Badges */
export const BADGE = {
  green: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1',
  greenSoft: 'bg-emerald-50/60 text-emerald-700 font-medium text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1',
  amber: 'bg-amber-50 text-amber-800 border border-amber-200/60 font-medium text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1',
  amberSoft: 'bg-amber-50/60 text-amber-800 font-medium text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1',
  gold: 'bg-amber-50 text-amber-800 border border-amber-200/80 font-medium text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1',
  dark: 'bg-[#0f764a] text-white font-medium text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs',
  rose: 'bg-rose-50 text-rose-700 border border-rose-200/60 font-medium text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1',
  stone: 'bg-slate-100 text-slate-700 border border-slate-200/60 font-medium text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1',
  blue: 'bg-sky-50 text-sky-700 border border-sky-200/60 font-medium text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1',
};
