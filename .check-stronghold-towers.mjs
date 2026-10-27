// Validates the Stronghold tower table: shape, path rules, costs, ids, decos and fx fields.
//   node .check-stronghold-towers.mjs            → every tower
//   node .check-stronghold-towers.mjs fire water → just those
// Also prints a rough DPS-per-gold line per tower so balance outliers stand out.
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'shtowers-'));
const out = join(dir, 'towers.mjs');
await build({ entryPoints: ['src/stronghold/towers/index.ts'], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { TOWER_DEFS } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

const DECOS = new Set(['crown', 'halo', 'horns', 'antenna', 'hat', 'eye', 'star', 'moon', 'sun', 'skull', 'flame',
  'orbit', 'sparks', 'bubbles', 'coins', 'leaves', 'motes', 'notes', 'bees', 'cards',
  'spikes', 'runes', 'gears', 'chains', 'crystals', 'roots', 'bricks', 'gold-trim', 'moat', 'bones',
  'banner', 'shield', 'barrel', 'scope', 'drum', 'book', 'wings', 'cape', 'lantern', 'sack', 'pennant']);
const FX_FIELDS = {
  bolt: ['texture', 'look', 'color', 'speed', 'count', 'spread', 'pierce', 'homing', 'size', 'splash', 'splashMult', 'lob', 'returns', 'bounces', 'broadside', 'salvo'],
  splash: ['radius', 'color', 'delayMs', 'shape'], line: ['length', 'width', 'color'],
  zone: ['radius', 'ms', 'color', 'shape', 'pull'], aura: ['radius', 'color', 'look'],
  beam: ['color', 'width', 'ms', 'ramp'], chain: ['jumps', 'jumpRange', 'color', 'falloff'], nova: ['radius', 'color'],
  rally: ['radius', 'ms', 'fireRateMult', 'damageMult', 'rangeMult', 'color'],
  summon: ['ms', 'color', 'attackMs', 'attackRange', 'label'], barrier: ['ms', 'hp', 'color', 'label'],
  execute: ['thresholdFrac', 'color'], gold: ['amount', 'color'],
  trap: ['count', 'hits', 'ms', 'color', 'look', 'blast'], minion: ['hits', 'speed', 'ms', 'color', 'look', 'size'],
  sentry: ['ms', 'max', 'attackMs', 'range', 'color', 'look'], convert: ['thresholdFrac', 'color', 'look'],
  fence: ['ms', 'color', 'width'], overclock: ['ms', 'fireRateMult', 'damageMult', 'color'], field: ['color'], mend: ['amount', 'color'],
};
const PATCH_FIELDS = new Set(Object.values(FX_FIELDS).flat());
const UTILITY = new Set(['rally', 'gold', 'overclock', 'barrier', 'mend']);

const want = process.argv.slice(2);
const ids = want.length ? want : Object.keys(TOWER_DEFS);
let errors = 0, warns = 0;
const err = (id, m) => { errors++; console.log(`  ✗ ${id}: ${m}`); };
const warn = (id, m) => { warns++; console.log(`  ! ${id}: ${m}`); };

/** Rough sustained DPS of an attack (ignores riders and targets hit beyond the first). */
function dps(a) {
  const fx = a.fx;
  if (UTILITY.has(fx.kind) || a.damage <= 0) return 0;
  let per = a.damage;
  if (fx.kind === 'aura' || fx.kind === 'zone' || fx.kind === 'beam') {
    if (fx.kind === 'aura') return a.damage;
    const ms = fx.ms ?? 1000;
    return a.damage * Math.min(ms, a.cooldown) / a.cooldown;
  }
  if (fx.kind === 'bolt') per *= (fx.count ?? 1) * (fx.salvo ?? 1);
  if (fx.kind === 'trap') per *= fx.count * (fx.blast ? 2 : fx.hits);
  if (fx.kind === 'minion') per *= fx.hits;
  if (fx.kind === 'sentry') return a.damage * fx.max * 1000 / fx.attackMs;
  if (fx.kind === 'summon') return a.damage * 1000 / fx.attackMs * Math.min(1, fx.ms / a.cooldown);
  return per * 1000 / Math.max(50, a.cooldown);
}

function applyMod(a, m) {
  const fx = { ...a.fx, ...(m.fx ?? {}), kind: a.fx.kind };
  if (m.areaMult) for (const k of ['radius', 'length', 'jumpRange', 'splash', 'attackRange', 'blast']) if (typeof fx[k] === 'number') fx[k] *= m.areaMult;
  if (m.countAdd) { if (fx.kind === 'bolt') fx.count = (fx.count ?? 1) + m.countAdd; else if (fx.kind === 'chain') fx.jumps += m.countAdd; else if (fx.kind === 'trap') fx.count += m.countAdd; else if (fx.kind === 'sentry') fx.max += m.countAdd; else if (fx.kind === 'minion') fx.hits += m.countAdd; }
  return { ...a, fx, damage: (a.damage + (m.damageAdd ?? 0)) * (m.damageMult ?? 1), cooldown: a.cooldown * (m.cooldownMult ?? 1) };
}

function checkAttack(id, where, a) {
  if (!a || typeof a !== 'object') return err(id, `${where}: not an attack`);
  if (typeof a.damage !== 'number' || typeof a.cooldown !== 'number') err(id, `${where}: damage/cooldown missing`);
  if (!a.desc) err(id, `${where}: no desc`);
  if (a.desc && a.desc.length > 80) warn(id, `${where}: desc is ${a.desc.length} chars (keep ≤ 80)`);
  const fields = FX_FIELDS[a.fx?.kind];
  if (!fields) return err(id, `${where}: unknown fx kind ${a.fx?.kind}`);
  for (const k of Object.keys(a.fx)) if (k !== 'kind' && !fields.includes(k)) err(id, `${where}: fx.${k} is not a ${a.fx.kind} field`);
  if (a.cooldown < 80 && !['aura'].includes(a.fx.kind) && where !== 'active') warn(id, `${where}: cooldown ${a.cooldown}ms is very fast`);
}

for (const id of ids) {
  const d = TOWER_DEFS[id];
  if (!d) { err(id, 'no such tower'); continue; }
  if (!(d.cost > 0)) err(id, 'no cost');
  if (!d.attacks || !Object.keys(d.attacks).length) err(id, 'no base attacks');
  for (const [k, a] of Object.entries(d.attacks ?? {})) checkAttack(id, `base.${k}`, a);
  if (!Array.isArray(d.paths) || d.paths.length !== 3) { err(id, 'needs exactly 3 paths'); continue; }
  const attacks = { ...d.attacks };
  let order = Object.keys(attacks);
  let total = d.cost;
  const tierLines = [];
  d.paths.forEach((p, pi) => {
    if (!p.name || !p.theme) err(id, `path ${pi}: name/theme missing`);
    if (p.name && p.name.length > 16) warn(id, `path ${pi}: name "${p.name}" is long`);
    if (!Array.isArray(p.upgrades) || p.upgrades.length !== 5) { err(id, `path ${pi}: needs 5 upgrades`); return; }
    let last = 0;
    // Each path checked on its own atop the base (crosspaths resolve at runtime).
    const local = { ...d.attacks };
    let localOrder = Object.keys(local);
    p.upgrades.forEach((u, ti) => {
      const where = `${p.name} ${ti + 1}`;
      if (!u.name || !u.desc) err(id, `${where}: name/desc missing`);
      if (u.name && u.name.length > 20) warn(id, `${where}: name "${u.name}" > 20 chars`);
      if (u.desc && u.desc.length > 120) warn(id, `${where}: desc ${u.desc.length} chars (keep ≤ 120)`);
      if (!(u.cost > last)) err(id, `${where}: cost ${u.cost} must exceed the tier before (${last})`);
      last = u.cost;
      if (!u.deco || !DECOS.has(u.deco.kind)) err(id, `${where}: bad deco ${u.deco?.kind}`);
      for (const r of u.remove ?? []) { if (!local[r]) err(id, `${where}: removes unknown attack ${r}`); delete local[r]; localOrder = localOrder.filter((o) => o !== r); }
      for (const [k, a] of Object.entries(u.add ?? {})) { checkAttack(id, `${where} add.${k}`, a); if (!local[k]) localOrder.push(k); local[k] = a; }
      for (const [k, m] of Object.entries(u.mods ?? {})) {
        if (k !== '*' && !local[k]) err(id, `${where}: mods unknown attack "${k}" (has: ${localOrder.join(', ')})`);
        for (const f of Object.keys(m.fx ?? {})) if (!PATCH_FIELDS.has(f)) err(id, `${where}: fx patch field ${f} unknown`);
        const targets = k === '*' ? localOrder : [k];
        for (const t of targets) if (local[t]) local[t] = applyMod(local[t], m);
      }
      if (u.active) {
        if (pi !== 1) err(id, `${where}: only the middle path may grant an ability`);
        if (!u.active.name || !u.active.desc || !(u.active.cooldown >= 10000)) err(id, `${where}: active needs name, desc, cooldown ≥ 10s`);
        if (!u.active.cast && !u.active.selfBuff) err(id, `${where}: active needs a cast or a selfBuff`);
        if (u.active.cast) checkAttack(id, 'active', u.active.cast);
      }
      if (pi === 1 && ti === 2 && !u.active) err(id, `${where}: middle path tier 3 must grant the ability`);
      if (pi === 1 && ti === 4 && !u.active) warn(id, `${where}: middle path tier 5 should upgrade the ability`);
      if (pi === 1 && ti < 2 && u.active) warn(id, `${where}: ability arrives before tier 3`);
      const sum = Object.values(local).reduce((s, a) => s + dps(a), 0);
      tierLines.push({ pi, ti, cost: u.cost, dps: sum });
    });
    total += p.upgrades.reduce((s, u) => s + (u.cost ?? 0), 0);
  });
  const base = Object.values(d.attacks).reduce((s, a) => s + dps(a), 0);
  const pathsStr = [0, 1, 2].map((pi) => tierLines.filter((t) => t.pi === pi).map((t) => `${Math.round(t.dps)}`).join('/')).join('  |  ');
  console.log(`${id.padEnd(12)} cost ${String(d.cost).padStart(4)}  range ${String(d.range).padStart(4)}  base dps ${base.toFixed(1).padStart(6)}  (${(base / d.cost * 100).toFixed(1)}/100g)  paths dps ${pathsStr}`);
  void attacks; void order;
}
console.log(`\n${ids.length} towers, ${errors} errors, ${warns} warnings`);
process.exit(errors ? 1 : 0);
