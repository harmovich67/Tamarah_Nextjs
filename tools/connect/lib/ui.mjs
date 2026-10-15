import readline from 'node:readline/promises';

const tty = process.stdout.isTTY;
const paint = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : String(s));
export const c = { bold: paint(1), dim: paint(2), red: paint(31), green: paint(32), yellow: paint(33), blue: paint(36) };

let rl = null;
let auto = false;
export const setAuto = (v) => {
  auto = v;
};
export const isAuto = () => auto;
const io = () => (rl ||= readline.createInterface({ input: process.stdin, output: process.stdout }));
export const closeUI = () => {
  rl?.close();
  rl = null;
};

export const log = (s = '') => console.log(s);
export const step = (n, total, title) => log(`\n${c.bold(c.blue(`━━ الخطوة ${n}/${total} · ${title}`))}`);
export const ok = (s) => log(`  ${c.green('✔')} ${s}`);
export const warn = (s) => log(`  ${c.yellow('▲')} ${s}`);
export const bad = (s) => log(`  ${c.red('✖')} ${s}`);
export const info = (s) => log(`  ${c.dim(s)}`);

/** Free-text question. In --yes mode the default is returned. */
export async function ask(question, def = '') {
  if (auto) return def;
  const hint = def ? c.dim(` [${def}]`) : '';
  const a = (await io().question(`  ${c.bold('?')} ${question}${hint} `)).trim();
  return a || def;
}

export async function confirm(question, def = true) {
  if (auto) return def;
  const a = (await ask(`${question} (${def ? 'Y/n' : 'y/N'})`, '')).toLowerCase();
  if (!a) return def;
  return ['y', 'yes', 'ن', 'نعم', 'ا'].includes(a);
}

/** Numbered menu; returns the chosen option's value. */
export async function choose(question, options, defIndex = 0) {
  options.forEach((o, i) => log(`    ${c.bold(i + 1)}. ${o.label}${o.hint ? c.dim(`  — ${o.hint}`) : ''}`));
  if (auto) return options[defIndex].value;
  for (;;) {
    const a = await ask(question, String(defIndex + 1));
    const n = Number(a);
    if (n >= 1 && n <= options.length) return options[n - 1].value;
    warn('اكتب رقم من القائمة.');
  }
}
