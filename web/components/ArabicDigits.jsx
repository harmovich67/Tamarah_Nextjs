'use client';

import { useEffect } from 'react';

/**
 * Arabic pages show Arabic-Indic digits (ar-SA), exactly like the Tamrna Foundation reference
 * (port of assets/js/foundation-digits.js). Only visible text nodes are converted: attributes, form values,
 * phone numbers, e-mails, order codes and anything inside `dir="ltr"`, <bdi> or [data-keep-digits] stay as typed.
 */
const MAP = '٠١٢٣٤٥٦٧٨٩';
const SKIP_TAG = /^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|CODE|PRE|BDI|BDO|NOSCRIPT)$/;
const DATE = /^(\s*)(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2})?)?(\s*)$/;

export default function ArabicDigits() {
  useEffect(() => {
    let dateOnly;
    let dateTime;
    try {
      dateOnly = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', calendar: 'gregory' });
      dateTime = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short', calendar: 'gregory' });
    } catch {
      /* older browsers keep the plain digit conversion */
    }

    const skipped = (node) => {
      for (let el = node.parentNode; el && el.nodeType === 1; el = el.parentNode) {
        if (SKIP_TAG.test(el.tagName)) return true;
        if (el.getAttribute('dir') === 'ltr' || el.hasAttribute('data-keep-digits')) return true;
        if (el.tagName === 'A' && /^(mailto|tel):/i.test(el.getAttribute('href') || '')) return true;
      }
      return false;
    };

    const localise = (text) => {
      const m = DATE.exec(text);
      if (m && dateOnly) {
        const d = new Date(+m[2], +m[3] - 1, +m[4], m[5] ? +m[5] : 0, m[6] ? +m[6] : 0);
        if (!Number.isNaN(d.getTime())) return m[1] + (m[5] ? dateTime : dateOnly).format(d) + m[7];
      }
      return text
        .replace(/(\d)\.00(?!\d)/g, '$1')
        .replace(/(\d)\.(\d)/g, '$1٫$2')
        .replace(/[0-9]/g, (d) => MAP.charAt(+d));
    };

    const convert = (node) => {
      const text = node.nodeValue;
      if (!/[0-9]/.test(text) || /[A-Za-z]/.test(text) || skipped(node)) return;
      const out = localise(text);
      if (out !== text) node.nodeValue = out;
    };

    const walk = (root) => {
      if (root.nodeType === 3) {
        convert(root);
        return;
      }
      if (root.nodeType !== 1 || SKIP_TAG.test(root.tagName)) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const batch = [];
      let n = walker.nextNode();
      while (n) {
        batch.push(n);
        n = walker.nextNode();
      }
      batch.forEach(convert);
    };

    walk(document.body);
    const observer = new MutationObserver((records) => {
      records.forEach((r) => {
        if (r.type === 'characterData') convert(r.target);
        else r.addedNodes.forEach(walk);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
