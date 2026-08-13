#!/usr/bin/env node
/**
 * Ability Codex coverage check.
 *
 *   node .check-codex.mjs            summary + the first gaps
 *   node .check-codex.mjs --all      every gap, element by element
 *   node .check-codex.mjs fire air   just these elements
 *
 * Walks the real ability definitions in `src/elements/*.ts` and cross-checks them against
 * `src/data/codex/*.ts` and the preview registry. Reports:
 *
 *   - abilities with no codex entry            (the info screen shows a placeholder card)
 *   - codex entries for abilities that are gone (a rename that was not followed through)
 *   - abilities with no showcase loop
 *   - upgrade slots with no upgraded showcase   (UPGRADED tab falls back to the base loop)
 *   - effect rows with no number in them        (the whole point is the numbers)
 *   - elements still on the legacy passive text
 *
 * Exits 0 always — this is a progress report on a long content job, not a build gate.
 */
import fs from 'node:fs';
import path from 'node:path';

const ELEM_DIR = 'src/elements';
const CODEX_DIR = 'src/data/codex';
const args = process.argv.slice(2);
const showAll = args.includes('--all');
const only = args.filter((a) => !a.startsWith('--'));

const read = (p) => fs.readFileSync(p, 'utf8');
const grey = (s) => `\x1b[90m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

// ── The real abilities ────────────────────────────────────────────────
/** elementId -> [{ id, name, key }] */
const real = new Map();
for (const file of fs.readdirSync(ELEM_DIR)) {
  if (!file.endsWith('.ts') || ['Ability.ts', 'Element.ts'].includes(file)) continue;
  const src = read(path.join(ELEM_DIR, file));
  const elementId = file.replace(/\.ts$/, '');
  const abilities = [];
  // Split on the `const x: Ability = {` declarations rather than pattern-matching across the
  // whole literal — descriptions run to any length and some abilities order their fields
  // differently, which a single spanning regex silently drops.
  for (const chunk of src.split(/const \w+: Ability = \{/).slice(1)) {
    const body = chunk.slice(0, chunk.indexOf('\n};'));
    const id = body.match(/^\s*id: '([a-z0-9-]+)'/m)?.[1];
    const key = body.match(/^\s*displayKey: '([^']+)'/m)?.[1];
    const name = body.match(/^\s*name: '((?:[^'\\]|\\.)*)'/m)?.[1] ?? id;
    if (id && key) abilities.push({ id, name, key });
  }
  // Echo and Subterfuge never hoisted their abilities into named consts — they are object
  // literals sitting straight in the element's `abilities: [` array. Without this branch both
  // elements read as having no abilities at all, so they were quietly absent from every count
  // instead of appearing as the gaps they were.
  if (!abilities.length) {
    const arr = src.indexOf('\n  abilities: [');
    if (arr >= 0) {
      const seg = src.slice(arr, src.indexOf('\n  ],', arr));
      for (const chunk of seg.split(/^ {4}\{$/m).slice(1)) {
        const body = chunk.slice(0, chunk.indexOf('\n    },'));
        const id = body.match(/^\s*id: '([a-z0-9-]+)'/m)?.[1];
        const key = body.match(/^\s*displayKey: '([^']+)'/m)?.[1];
        const name = body.match(/^\s*name: '((?:[^'\\]|\\.)*)'/m)?.[1] ?? id;
        if (id && key) abilities.push({ id, name, key });
      }
    }
  }
  if (abilities.length) real.set(elementId, abilities);
}

// ── The codex ─────────────────────────────────────────────────────────
/** elementId -> { abilityIds:Set, effects:[{ability,label,detail}], hasPassives } */
const codex = new Map();
for (const file of fs.readdirSync(CODEX_DIR)) {
  if (!file.endsWith('.ts') || ['index.ts', 'legacy.ts'].includes(file)) continue;
  const src = read(path.join(CODEX_DIR, file));
  const elementId = file.replace(/\.ts$/, '');
  // Bounded to the `abilities` object: `perks` and `mastery` follow it in the same file and
  // an unbounded slice reads their keys as ability ids that no longer exist.
  const aStart = src.indexOf('\n  abilities: {');
  const aEnd = aStart < 0 ? -1 : src.indexOf('\n  },', aStart);
  const body = aStart < 0 ? '' : src.slice(aStart, aEnd < 0 ? undefined : aEnd);
  const ids = new Set();
  // Top-level keys of the `abilities` object, at exactly four spaces of indent.
  for (const m of body.matchAll(/^ {4}'?([a-z0-9-]+)'?: \{$/gm)) ids.add(m[1]);
  // Abilities that share a key with an upgrade belonging to something else, and have said so.
  // They are owed no upgraded showcase — there is no upgraded form of them to record.
  const noUpgrade = new Set();
  for (const m of body.matchAll(/^ {4}'?([a-z0-9-]+)'?: \{[\s\S]*?^ {4}\},$/gm)) {
    if (/^\s{6}noUpgrade: true,$/m.test(m[0])) noUpgrade.add(m[1]);
  }
  const perkIds = new Set();
  const masteryIds = new Set();
  for (const [key, target] of [['perks', perkIds], ['mastery', masteryIds]]) {
    const i = src.indexOf(`\n  ${key}: {`);
    if (i < 0) continue;
    // Top-level keys of that object, at four spaces, up to the closing brace at two.
    const seg = src.slice(i, src.indexOf('\n  },', i));
    for (const m of seg.matchAll(/^ {4}'?([a-z0-9-]+)'?: \{$/gm)) target.add(m[1]);
  }
  const effects = [];
  for (const m of src.matchAll(/\{ tag: '(\w+)', label: '((?:[^'\\]|\\.)*)', detail: '((?:[^'\\]|\\.)*)'/g)) {
    effects.push({ tag: m[1], label: m[2], detail: m[3] });
  }
  codex.set(elementId, { ids, noUpgrade, perkIds, masteryIds, effects, hasPassives: /^\s{2}passives: \[/m.test(src) });
}

const legacySrc = fs.existsSync(`${CODEX_DIR}/legacy.ts`) ? read(`${CODEX_DIR}/legacy.ts`) : '';
const legacyElements = new Set(
  [...legacySrc.matchAll(/^ {2}([a-z]+): \[$/gm)].map((m) => m[1]),
);

// ── The previews ──────────────────────────────────────────────────────
const previewSrc = read(`${CODEX_DIR}/previews/index.ts`);
const previewKeys = new Set(
  [...previewSrc.matchAll(/^ {2}'([^']+)':/gm)].map((m) => m[1]),
);

// ── Upgrade slots, so we know which abilities are owed an upgraded loop ──
const upgSrc = read('src/data/Upgrades.ts');
/** elementId -> Set(slot) */
const upgradeSlots = new Map();
for (const block of upgSrc.split(/\n {2}\{\n {4}elementId: /).slice(1)) {
  const id = block.match(/^'([a-z]+)'/)?.[1];
  if (!id) continue;
  upgradeSlots.set(id, new Set([...block.matchAll(/slot: '([a-z]+)'/g)].map((m) => m[1])));
}

// ── Report ────────────────────────────────────────────────────────────
let totalAbilities = 0, documented = 0, withPreview = 0;
let owedUpPreviews = 0, haveUpPreviews = 0;
let totalPerks = 0, docPerks = 0, fxPerks = 0;
let totalEnh = 0, docEnh = 0, fxEnh = 0;
let totalPassives = 0, fxPassives = 0;

// Perks and mastery enhancements, from their own tables.
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const perkSrc = read('src/data/Perks.ts');
/** elementId -> [perkId] */
const perksByElement = new Map();
for (const m of perkSrc.matchAll(/id: '([a-z0-9-]+)',[\s\S]{0,1400}?elementId: '([a-z]+)'/g)) {
  if (!perksByElement.has(m[2])) perksByElement.set(m[2], new Set());
  perksByElement.get(m[2]).add(m[1]);
}
const masterySrc = read('src/data/Mastery.ts');
const enhByElement = new Map();
for (const block of masterySrc.split(/elementId: /).slice(1)) {
  const id = block.match(/^'([a-z]+)'/)?.[1];
  if (!id) continue;
  const set = enhByElement.get(id) ?? new Set();
  const ei = block.indexOf('enhancements: [');
  if (ei >= 0) {
    for (const m of block.slice(ei).matchAll(/^\s{8}id: '([a-z0-9-]+)',$/gm)) set.add(m[1]);
  }
  enhByElement.set(id, set);
}
// Passive names, for their showcase keys.
const passivesByElement = new Map();
for (const f of [...fs.readdirSync(CODEX_DIR), 'legacy.ts']) {
  if (!f.endsWith('.ts') || f === 'index.ts') continue;
  const src = read(path.join(CODEX_DIR, f));
  if (f === 'legacy.ts') {
    let cur = null;
    for (const line of src.split('\n')) {
      const el = line.match(/^ {2}([a-z]+): \[$/);
      if (el) { cur = el[1]; passivesByElement.set(cur, passivesByElement.get(cur) ?? []); continue; }
      const nm = line.match(/^ {6}name: (?:'([^']+)'|"([^"]+)"),$/);
      if (nm && cur) passivesByElement.get(cur).push(nm[1] ?? nm[2]);
    }
  } else {
    const el = f.replace(/\.ts$/, '');
    const i = src.indexOf('\n  passives: [');
    if (i < 0) continue;
    const seg = src.slice(i, src.indexOf('\n  ],', i));
    passivesByElement.set(el, [...seg.matchAll(/^ {6}name: (?:'([^']+)'|"([^"]+)"),$/gm)].map((m) => m[1] ?? m[2]));
  }
}
const gaps = [];
const numberless = [];
const stale = [];

for (const [elementId, abilities] of [...real].sort()) {
  if (only.length && !only.includes(elementId)) continue;
  const c = codex.get(elementId);
  const slots = upgradeSlots.get(elementId) ?? new Set();
  const missing = [];

  for (const ab of abilities) {
    totalAbilities++;
    const has = c?.ids.has(ab.id);
    if (has) documented++; else missing.push(ab);
    if (previewKeys.has(`${elementId}:${ab.id}`)) withPreview++;
    if (slots.has(ab.key.toLowerCase()) && !c?.noUpgrade?.has(ab.id)) {
      owedUpPreviews++;
      if (previewKeys.has(`${elementId}:${ab.id}:up`)) haveUpPreviews++;
      else if (process.env.CODEX_DEBUG) console.log('MISSING UP FX', elementId, ab.id, ab.key);
    }
  }

  if (c) {
    const realIds = new Set(abilities.map((a) => a.id));
    for (const id of c.ids) if (!realIds.has(id)) stale.push(`${elementId}:${id}`);
    // Only tags that imply a figure. A row that says "nothing can touch you" is complete.
    const NUMERIC = new Set(['damage', 'dot', 'heal', 'area']);
    for (const e of c.effects) {
      if (NUMERIC.has(e.tag) && !/\d/.test(e.detail)) numberless.push(`${elementId} — “${e.label}”`);
    }
  }

  for (const pid of perksByElement.get(elementId) ?? []) {
    totalPerks++;
    if (c?.perkIds.has(pid)) docPerks++;
    if (previewKeys.has(`${elementId}:perk:${pid}`)) fxPerks++;
  }
  for (const eid of enhByElement.get(elementId) ?? []) {
    totalEnh++;
    if (c?.masteryIds.has(eid)) docEnh++;
    else if (process.env.CODEX_DEBUG) console.log('MISSING MASTERY DOC', elementId, eid);
    if (previewKeys.has(`${elementId}:mastery:${eid}`)) fxEnh++;
  }
  for (const name of passivesByElement.get(elementId) ?? []) {
    totalPassives++;
    if (previewKeys.has(`${elementId}:passive:${slug(name)}`)) fxPassives++;
  }

  if (missing.length) gaps.push({ elementId, missing, partial: !!c });
}

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
console.log('');
console.log(bold('  Ability Codex coverage'));
console.log('  ' + '─'.repeat(58));
const bar = (n, d) => {
  const w = 28, f = Math.round((n / Math.max(1, d)) * w);
  return (n === d ? green : n * 2 > d ? yellow : red)('█'.repeat(f)) + grey('░'.repeat(w - f));
};
console.log(`  documented   ${bar(documented, totalAbilities)}  ${documented}/${totalAbilities}  (${pct(documented, totalAbilities)}%)`);
console.log(`  showcases    ${bar(withPreview, totalAbilities)}  ${withPreview}/${totalAbilities}  (${pct(withPreview, totalAbilities)}%)`);
console.log(`  upgraded fx  ${bar(haveUpPreviews, owedUpPreviews)}  ${haveUpPreviews}/${owedUpPreviews}  (${pct(haveUpPreviews, owedUpPreviews)}%)`);
console.log('');
console.log(`  passive fx   ${bar(fxPassives, totalPassives)}  ${fxPassives}/${totalPassives}`);
console.log(`  perks  doc   ${bar(docPerks, totalPerks)}  ${docPerks}/${totalPerks}      fx ${fxPerks}/${totalPerks}`);
console.log(`  mastery doc  ${bar(docEnh, totalEnh)}  ${docEnh}/${totalEnh}      fx ${fxEnh}/${totalEnh}`);
console.log('');

if (stale.length) {
  console.log(red(`  ✗ ${stale.length} codex entr${stale.length === 1 ? 'y' : 'ies'} for an ability that no longer exists:`));
  for (const s of stale) console.log(`      ${s}`);
  console.log('');
}

if (numberless.length) {
  console.log(yellow(`  ⚠ ${numberless.length} effect row${numberless.length === 1 ? '' : 's'} with no number in the detail:`));
  for (const n of numberless.slice(0, showAll ? 999 : 8)) console.log(`      ${n}`);
  if (!showAll && numberless.length > 8) console.log(grey(`      …and ${numberless.length - 8} more (--all)`));
  console.log('');
}

if (legacyElements.size) {
  console.log(yellow(`  ⚠ ${legacyElements.size} element${legacyElements.size === 1 ? '' : 's'} still on the old hardcoded passive text:`));
  console.log(`      ${[...legacyElements].sort().join(', ')}`);
  console.log(grey('      (delete the entry from codex/legacy.ts once the real codex is written)'));
  console.log('');
}

if (gaps.length) {
  console.log(bold(`  Undocumented — ${gaps.reduce((n, g) => n + g.missing.length, 0)} abilities across ${gaps.length} elements`));
  for (const g of showAll ? gaps : gaps.slice(0, 12)) {
    const tag = g.partial ? yellow('partial') : grey('none   ');
    console.log(`   ${tag}  ${g.elementId.padEnd(13)} ${g.missing.map((a) => `${a.key}:${a.name}`).join(', ')}`);
  }
  if (!showAll && gaps.length > 12) console.log(grey(`      …and ${gaps.length - 12} more elements (--all)`));
} else {
  console.log(green('  ✓ every ability is documented'));
}
console.log('');
