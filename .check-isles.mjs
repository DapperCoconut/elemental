// Validates the Ten Isles content tables: every cross-reference between areas, courts, NPCs,
// quests, items, scripts, gimmicks, fish, bakeries and bosses resolves, and exits pair up.
//   node .check-isles.mjs              (everything)
//   node .check-isles.mjs --only <id>  (print only messages naming <id>, e.g. a court id; totals still count all)
// Content marked `placeholder` (content/placeholder.ts — stand-ins while an isle's builders work) is
// skipped, and any still standing are listed at the end so an isle can't be called done with one left.
// Phaser is stubbed (content only touches it inside draw functions), so this runs in plain node.
import { build } from 'esbuild';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'isles-'));
const stub = join(dir, 'phaser-stub.mjs');
writeFileSync(stub, `
const deep = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'prototype' ? {} : deep()), apply: () => deep(), construct: () => deep() });
// Real math, so rules that clamp or measure actually progress in the smoke runs.
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const M = {
  Clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  Linear: (a, b, t) => a + (b - a) * t,
  Between: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  FloatBetween: (a, b) => a + Math.random() * (b - a),
  Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) },
  Angle: { Wrap: wrapA, Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    RotateTo: (cur, tgt, lerp = 0.05) => { const d = wrapA(tgt - cur); return Math.abs(d) <= lerp ? tgt : cur + Math.sign(d) * lerp; } },
  DegToRad: (d) => d * Math.PI / 180, RadToDeg: (r) => r * 180 / Math.PI,
};
const Phaser = new Proxy(deep(), { get: (t, k) => (k === 'Math' ? new Proxy(M, { get: (m, kk) => (kk in m ? m[kk] : deep()) }) : t[k]) });
export default Phaser;
`);
const entry = join(dir, 'entry.ts');
writeFileSync(entry, `
export * as R from ${JSON.stringify(join(process.cwd(), 'src/isles/IslesRegistry.ts'))};
export { ELEMENT_DATA_MAP } from ${JSON.stringify(join(process.cwd(), 'src/data/ElementRoster.ts'))};
export { BossToolkit } from ${JSON.stringify(join(process.cwd(), 'src/boss/framework/BossToolkit.ts'))};
`);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.window = globalThis; globalThis.navigator = { userAgent: 'node' }; globalThis.document = { createElement: () => ({ getContext: () => null, style: {} }), addEventListener() {} };
const out = join(dir, 'bundle.mjs');
await build({
  entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
  plugins: [{ name: 'stub-phaser', setup(b) { b.onResolve({ filter: /^phaser$/ }, () => ({ path: stub })); } }],
});
const { R, ELEMENT_DATA_MAP, BossToolkit } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

const onlyAt = process.argv.indexOf('--only');
const ONLY = onlyAt > 0 ? process.argv[onlyAt + 1] : null;
let errors = 0, warns = 0;
const say = (m) => { if (!ONLY || m.includes(ONLY)) console.log(m); };
const err = (m) => { errors++; say(`  ✗ ${m}`); };
const warn = (m) => { warns++; say(`  ! ${m}`); };
const SFX = new Set(`hit-light hit-medium hit-heavy crit shield-block shield-break heal dash whoosh land explosion-small explosion-medium explosion-large status-burn status-freeze status-shock status-poison status-slow status-stun status-buff status-debuff fireball flame-burst inferno water-jet splash geyser rain bubble gust tornado beam-charge beam-fire rock-throw quake stone-slam stone-rise thorn spore ice-shard frost-blast ice-shatter zap thunder electric-charge plasma-arc chaos clang slash stab chain anvil gravity-slam meteor light-beam blink crystal-chime crystal-shatter prism portal teleport sonic-pulse screech drum-hit musket shotgun reload roar grenade-throw trap-set trap-snap sizzle slime-splat whip oil-splash engine drone-buzz train-horn magnet-pull glitch clock-tick time-warp dice jackpot sparkle curse-cast boing snap-back hush heartbeat money smoke judgement holy-chord wings hammer-forge gear-turn mortar-launch boss-intro boss-phase countdown-tick countdown-go`.split(' '));

// Placeholders: their areas, courts, and the bosses/artifacts they stand in for are skipped.
const phAreas = new Set(R.allAreas().filter((a) => a.placeholder).map((a) => a.id));
const phCourts = new Set(R.allCourts().filter((c) => phAreas.has(c.area)).map((c) => c.id));
const phBosses = new Set(R.allCourts().filter((c) => phCourts.has(c.id)).map((c) => `isle:${c.prince.id}`));
for (const isle of R.ISLES) { const d = R.getIslesBoss(`isle:${isle.monarch.id}`); if (d && !d.phases.length) phBosses.add(d.worldId); }
const areas = R.allAreas().filter((a) => !a.placeholder);
const npcIds = new Map();
for (const a of areas) for (const n of a.npcs) { if (npcIds.has(n.id)) err(`duplicate npc id ${n.id}`); npcIds.set(n.id, a.id); }
for (const isle of R.ISLES) { const w = R.getWanderer(isle.id); if (w) npcIds.set(w.id, '*'); }
const item = (id) => R.getIsleItem(id);

console.log(`Areas ${areas.length}, courts ${R.allCourts().length}, quests ${R.allQuests().length}, items ${R.allItems().length}, fish ${R.allFish().length}`);

// Areas & exits
for (const a of areas) {
  for (const e of a.exits) {
    const to = R.getArea(e.to);
    if (!to) { warn(`${a.id}: exit to unknown area ${e.to}`); continue; }
    const back = to.exits.find((x) => x.to === a.id);
    const opp = { n: 's', s: 'n', e: 'w', w: 'e' }[e.side];
    if (!back) err(`${a.id} → ${e.to}: ${e.to} has no exit back`);
    else if (back.side !== opp) err(`${a.id} exit ${e.side} → ${e.to} but ${e.to}'s return exit is on side ${back.side} (want ${opp})`);
  }
  for (const p of a.pois) {
    if (p.kind === 'encounter' && !R.getEncounter(p.id)) err(`${a.id}: poi encounter ${p.id} unknown`);
    if ((p.kind === 'prince' || p.kind === 'monarch') && !R.getIslesBoss(`isle:${p.id}`)) err(`${a.id}: ${p.kind} ${p.id} has no boss def`);
    if (p.kind === 'door' && !R.getArea(p.to)) err(`${a.id}: door to unknown area ${p.to}`);
    if (p.kind === 'water' && !R.getFishery(p.fishery)) err(`${a.id}: water uses unknown fishery ${p.fishery}`);
    if (p.kind === 'chest' && p.item && !item(p.item)) err(`${a.id}: chest ${p.id} gives unknown item ${p.item}`);
    const at = p.at ?? (p.shape ? { x: p.shape.x, y: p.shape.y } : null);
    if (at && (at.x < 0 || at.y < 0 || at.x > a.w || at.y > a.h)) err(`${a.id}: poi ${p.kind} out of bounds`);
  }
  if (!a.pois.some((p) => p.kind === 'waystone')) warn(`${a.id}: no waystone`);
  for (const n of a.npcs) {
    if (n.role) {
      const ok = n.role.kind === 'bakery' ? R.getBakery(n.role.id) : n.role.kind === 'dock' ? true : R.getShop(n.role.id);
      if (!ok) err(`${a.id}: npc ${n.id} keeps unknown ${n.role.kind} ${n.role.id}`);
    }
    if (!n.talks?.length) err(`${a.id}: npc ${n.id} has no talks`);
  }
}

// Placement: everything you walk up to must be reachable from walkable ground (mirrors IsleWorldScene:
// player radius 11, REACH for talk/use, 28 for pickups); arrivals and spawns must be walkable themselves.
{
  const PR = 11, REACH = 70;
  const blocked = (a, x, y) => {
    if (x < PR || y < PR || x > a.w - PR || y > a.h - PR) return true;
    return a.solids.some((so) => {
      if (so.kind === 'circle') return Math.hypot(x - so.x, y - so.y) < so.r + PR;
      const qx = Math.max(so.x, Math.min(x, so.x + so.w)), qy = Math.max(so.y, Math.min(y, so.y + so.h));
      return Math.hypot(x - qx, y - qy) < PR;
    });
  };
  const reachable = (a, pt, r) => {
    if (!blocked(a, pt.x, pt.y)) return true;
    for (let d = 6; d < r; d += 6) for (let k = 0; k < 24; k++) {
      const an = (k / 24) * Math.PI * 2;
      if (!blocked(a, pt.x + Math.cos(an) * d, pt.y + Math.sin(an) * d)) return true;
    }
    return false;
  };
  const place = (areaId, pt, what, r, soft = false) => {
    const a = R.getArea(areaId);
    if (!a || a.placeholder || !pt) return;
    if (reachable(a, pt, r)) return;
    let near = null;
    for (let d = 6; d < 400 && !near; d += 6) for (let k = 0; k < 24 && !near; k++) {
      const an = (k / 24) * Math.PI * 2, x = pt.x + Math.cos(an) * d, y = pt.y + Math.sin(an) * d;
      if (!blocked(a, x, y)) near = `${Math.round(x)},${Math.round(y)}`;
    }
    (soft ? warn : err)(`${areaId}: ${what} at ${Math.round(pt.x)},${Math.round(pt.y)} can't be reached (inside solids)${near ? ` — nearest walkable ${near}` : ''}`);
  };
  for (const a of areas) {
    place(a.id, a.spawn, 'spawn', 1);
    for (const n of a.npcs) place(a.id, n.at, `npc ${n.id}`, REACH);
    for (const c of a.checkpoints ?? []) place(a.id, c, 'checkpoint', 60);
    for (const p of a.pois) {
      if (p.kind === 'water' || p.kind === 'sign') continue;
      if (p.at) place(a.id, p.at, `poi ${p.kind}${p.id ? ' ' + p.id : ''}`, REACH - 10);
      if (p.kind === 'door') place(p.to, p.arrive, `door arrival from ${a.id}`, 1);
    }
    for (const path of a.crowd?.paths ?? []) for (const pt of path) place(a.id, pt, 'crowd waypoint', 1, true);
    // Exit strips: 140px wide around the exit, 120px deep from the edge.
    for (const e of a.exits) {
      const along = e.at ?? (e.side === 'n' || e.side === 's' ? a.w / 2 : a.h / 2);
      const r = e.side === 'n' ? { x: along - 70, y: 0, w: 140, h: 120 } : e.side === 's' ? { x: along - 70, y: a.h - 120, w: 140, h: 120 }
        : e.side === 'w' ? { x: 0, y: along - 70, w: 120, h: 140 } : { x: a.w - 120, y: along - 70, w: 120, h: 140 };
      const hit = a.solids.some((so) => so.kind === 'rect'
        ? so.x < r.x + r.w && so.x + so.w > r.x && so.y < r.y + r.h && so.y + so.h > r.y
        : Math.max(r.x, Math.min(so.x, r.x + r.w)) - so.x !== undefined && Math.hypot(Math.max(r.x, Math.min(so.x, r.x + r.w)) - so.x, Math.max(r.y, Math.min(so.y, r.y + r.h)) - so.y) < so.r);
      if (hit) err(`${a.id}: exit ${e.side} → ${e.to} — a solid blocks its edge strip`);
    }
  }
  for (const c of R.allCourts()) if (!phCourts.has(c.id)) for (const e of c.encounters) place(c.area, e.at, `champion ${e.id}`, REACH);
  for (const q of R.allQuests()) for (const st of q.stages) {
    const o = st.objective;
    if (o.kind === 'duel') place(o.area, o.foe.at, `duel foe ${o.foe.id}`, REACH);
    if (o.kind === 'collect') for (const pt of o.spots) place(o.area, pt, `collect spot (${q.id})`, 28);
    if (o.kind === 'visit') place(o.area, o.at, `visit spot (${q.id})`, o.r);
  }
}
// Dialogue length: keep world lines ≤ 110 characters (warning); > 140 is an error.
{
  // The box word-wraps at ~85 chars a row; past 140 a line spills onto a third row.
  const MAXL = 110, HARD = 140;
  const long = (who, l) => { if (l.length > HARD) err(`${who}: line over ${HARD} chars (${l.length}): "${l.slice(0, 40)}…"`); else if (l.length > MAXL) warn(`${who}: line over ${MAXL} chars (${l.length})`); };
  const lines = (who, talks) => { for (const t of talks ?? []) for (const l of t.lines) long(who, l); };
  for (const a of areas) {
    for (const n of a.npcs) { lines(`${a.id} npc ${n.id}`, n.talks); lines(`${a.id} npc ${n.id} barks`, n.barks); }
    lines(`${a.id} crowd`, a.crowd?.barks);
  }
  for (const isle of R.ISLES) { const w = R.getWanderer(isle.id); if (w) { for (const [k, t] of Object.entries(w.byArea)) lines(`wanderer ${w.id} @${k}`, t); lines(`wanderer ${w.id}`, w.general); } }
  const encs = [...R.allCourts().filter((c) => !phCourts.has(c.id)).flatMap((c) => c.encounters), ...R.allEncounters()];
  for (const e of new Map(encs.map((e) => [e.id, e])).values()) for (const l of [...(e.challenge ?? []), ...(e.beaten ?? [])]) long(`encounter ${e.id}`, l);
}

// Courts & encounters
for (const c of R.allCourts()) {
  if (phCourts.has(c.id)) continue;
  const els = c.encounters.map((e) => e.foeElement);
  for (const el of new Set(els)) if (els.filter((x) => x === el).length > 1) err(`court ${c.id}: element ${el} fought twice`);
  if (!R.getArea(c.area)) err(`court ${c.id}: area ${c.area} missing`);
  if (c.encounters.length !== 5) err(`court ${c.id}: ${c.encounters.length} encounters (want 5)`);
  if (c.quests.length < 5) warn(`court ${c.id}: ${c.quests.length} quests (want 5)`);
  if (!R.getIslesBoss(`isle:${c.prince.id}`)) err(`court ${c.id}: no boss isle:${c.prince.id}`);
  const art = item(c.prince.artifact);
  if (!art) err(`court ${c.id}: artifact ${c.prince.artifact} missing`); else if (art.kind !== 'artifact') err(`${art.id} is not kind artifact`);
  const area = R.getArea(c.area);
  if (area && !area.pois.some((p) => p.kind === 'prince' && p.id === c.prince.id)) err(`court ${c.id}: area has no prince poi for ${c.prince.id}`);
  const gims = new Set();
  for (const e of c.encounters) {
    if (!R.getGimmick(e.gimmick)) err(`encounter ${e.id}: gimmick ${e.gimmick} missing`);
    if (gims.has(e.gimmick)) err(`court ${c.id}: gimmick ${e.gimmick} used twice`);
    gims.add(e.gimmick);
    if (!ELEMENT_DATA_MAP[e.foeElement]) err(`encounter ${e.id}: unknown element ${e.foeElement}`);
    if (area && (e.at.x < 0 || e.at.y < 0 || e.at.x > area.w || e.at.y > area.h)) err(`encounter ${e.id}: at out of bounds`);
  }
}
for (const isle of R.ISLES) {
  if (phBosses.has(`isle:${isle.monarch.id}`) || phAreas.has(isle.port)) continue;
  if (!R.getArea(isle.port)?.pois.some((p) => p.kind === 'mooring')) err(`isle ${isle.id}: port ${isle.port} has no mooring`);
  if (!R.allUbers().some((u) => u.isle === isle.id)) warn(`isle ${isle.id}: no sea-beast Uber-upgrade`);
  for (const c of isle.courts) if (!R.getCourt(c)) err(`isle ${isle.id}: court ${c} not registered`);
  if (!item(isle.monarch.artifact)) err(`isle ${isle.id}: monarch artifact ${isle.monarch.artifact} missing`);
  if (!R.getIslesBoss(`isle:${isle.monarch.id}`)) err(`isle ${isle.id}: monarch boss missing`);
}

// Quests
for (const q of R.allQuests()) {
  const last = q.stages[q.stages.length - 1]?.objective.kind;
  if (!['duel', 'defeat', 'prince'].includes(last)) err(`quest ${q.id}: does not end with a fight (last stage ${last})`);
  if (!npcIds.has(q.giver)) err(`quest ${q.id}: giver ${q.giver} unknown`);
  if (!R.getArea(q.area)) err(`quest ${q.id}: area ${q.area} unknown`);
  if (q.reward.item && !item(q.reward.item)) err(`quest ${q.id}: reward item ${q.reward.item} unknown`);
  q.stages.forEach((s, i) => {
    const o = s.objective;
    const at = `quest ${q.id} stage ${i}`;
    if ((o.kind === 'talk' || o.kind === 'deliver') && !npcIds.has(o.npc)) err(`${at}: npc ${o.npc} unknown`);
    if (o.kind === 'deliver' && !item(o.item)) err(`${at}: item ${o.item} unknown`);
    if (o.kind === 'defeat' && !R.getEncounter(o.encounter)) err(`${at}: encounter ${o.encounter} unknown`);
    if (o.kind === 'prince' && !R.courtOfPrince(o.prince)) err(`${at}: prince ${o.prince} unknown`);
    if (o.kind === 'duel') {
      const a = R.getArea(o.area), f = o.foe;
      if (!a) err(`${at}: duel area ${o.area} unknown`);
      else if (f.at.x < 0 || f.at.y < 0 || f.at.x > a.w || f.at.y > a.h) err(`${at}: duel foe out of bounds`);
      if (!ELEMENT_DATA_MAP[f.foeElement]) err(`${at}: duel foe element ${f.foeElement} unknown`);
      if (f.gimmick && !R.getGimmick(f.gimmick)) err(`${at}: duel gimmick ${f.gimmick} missing`);
      if (!R.getCourt(f.court) && !R.getFloor(f.court)) err(`${at}: duel court ${f.court} is neither a court nor a registered floor`);
      if (R.getEncounter(f.id)?.quest !== q.id) err(`${at}: duel foe id ${f.id} not registered to this quest`);
      if (!f.challenge?.length) err(`${at}: duel foe has no challenge lines`);
    }
    if (o.kind === 'fish' && !R.getFish(o.fish)) err(`${at}: fish ${o.fish} unknown`);
    if (o.kind === 'cook' && !R.allItems && true) {}
    if ((o.kind === 'collect' || o.kind === 'visit') && !R.getArea(o.area)) err(`${at}: area ${o.area} unknown`);
    if (o.kind === 'collect') { const a = R.getArea(o.area); for (const p of o.spots) if (a && (p.x < 0 || p.y < 0 || p.x > a.w || p.y > a.h)) err(`${at}: spot out of bounds`); }
  });
}
// No element fights twice in one court — champions and quest duel foes together.
{
  const byCourt = new Map();
  const add = (court, el, who) => { if (!byCourt.has(court)) byCourt.set(court, []); byCourt.get(court).push([el, who]); };
  for (const c of R.allCourts()) for (const e of c.encounters) add(c.id, e.foeElement, e.id);
  for (const q of R.allQuests()) for (const st of q.stages) if (st.objective.kind === 'duel') add(st.objective.foe.court, st.objective.foe.foeElement, st.objective.foe.id);
  for (const [court, list] of byCourt) {
    const seen = new Map();
    for (const [el, who] of list) { if (seen.has(el)) err(`court ${court}: element ${el} used by both ${seen.get(el)} and ${who}`); else seen.set(el, who); }
  }
}
const recipeIds = new Set();
for (const a of areas) for (const n of a.npcs) if (n.role?.kind === 'bakery') for (const r of R.getBakery(n.role.id)?.recipes ?? []) recipeIds.add(r.id);
for (const q of R.allQuests()) for (const s of q.stages) if (s.objective.kind === 'cook' && !recipeIds.has(s.objective.recipe)) err(`quest ${q.id}: recipe ${s.objective.recipe} unknown`);

// Items, scripts, shops, bakeries, fish
for (const it of R.allItems()) {
  if (it.script && !R.getItemScript(it.script)) err(`item ${it.id}: script ${it.script} not registered`);
  if ((it.kind === 'charm' || it.kind === 'artifact') && !it.script) warn(`item ${it.id}: ${it.kind} without a script`);
}
for (const a of areas) for (const n of a.npcs) {
  if (!n.role) continue;
  const shop = R.getShop(n.role.id);
  for (const id of shop?.stock ?? []) { const it = item(id); if (!it) err(`shop ${shop.id}: stock ${id} unknown`); else if (it.price == null) err(`shop ${shop.id}: ${id} has no price`); }
  const bak = R.getBakery(n.role.id);
  for (const r of bak?.recipes ?? []) {
    if (!item(r.output)) err(`bakery ${bak.id}: output ${r.output} unknown`);
    for (const i of r.inputs) if (!item(i.item)) err(`bakery ${bak.id} recipe ${r.id}: input ${i.item} unknown`);
  }
}
for (const f of R.allFish()) {
  if (!item(f.id)) err(`fish ${f.id}: no item def`);
  for (const fy of f.fisheries) if (!R.getFishery(fy)) err(`fish ${f.id}: fishery ${fy} unknown`);
  if (f.rod && !R.getRod(f.rod)) err(`fish ${f.id}: rod ${f.rod} unknown`);
}
for (const r of R.allRods()) if (!item(r.id)) err(`rod ${r.id}: no item def`);

// Boss defs: signatures referenced exist; sfx names valid (best effort).
for (const c of R.allCourts()) {
  if (phCourts.has(c.id)) continue;
  const d = R.getIslesBoss(`isle:${c.prince.id}`);
  if (!d) continue;
  const phases = [...d.phases, ...(d.hard?.extraPhase ? [d.hard.extraPhase] : [])];
  if (d.phases.length < 2) err(`${d.worldId}: ${d.phases.length} phases`);
  if (!d.hard?.extraPhase) err(`${d.worldId}: no hard extra phase`);
  for (const p of phases) for (const m of p.cycle) if (m.startsWith('sig:') && !d.signatures[m.slice(4)]) err(`${d.worldId}: cycle ${m} has no signature`);
}
// ── Smoke: run every painter, gimmick, script and signature against stubs ──
{
  const G = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'length' ? 0 : G), apply: () => G, construct: () => G });
  const fighter = () => ({ x: 480, y: 320, hp: 300, maxHp: 300, active: true, shieldHp: 0, shieldCharges: 0, walkSpeedMult: 1,
    takeDamage() {}, heal() {}, setPosition(x, y) { this.x = x; this.y = y; }, reduceCooldown() {}, resetCooldown() {}, setMaxHp(n) { this.maxHp = n; },
    body: { velocity: { x: 0, y: 0 } } });
  const scene = new Proxy({ time: { now: 1000, delayedCall: () => G, addEvent: () => G }, scale: { width: 960, height: 640 } }, {
    get: (t, k) => (k in t ? t[k] : (k === 'add' || k === 'tweens' || k === 'cameras' || k === 'make' || k === 'sound') ? G : G),
  });
  const rng = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
  const tryRun = (what, fn) => { try { fn(); } catch (e) { err(`${what}: ${e?.message ?? e}`); } };
  for (const a of areas) {
    tryRun(`${a.id} ground`, () => a.painter.ground(G, rng));
    for (const pc of a.painter.pieces ?? []) tryRun(`${a.id} piece@${pc.x},${pc.y}`, () => pc.draw(G, rng));
    const view = { x: 0, y: 0, w: a.w, h: a.h };
    for (const t of [0.5, 3.3, 17]) {
      tryRun(`${a.id} animate`, () => a.painter.animate?.(G, t, view));
      tryRun(`${a.id} animateOver`, () => a.painter.animateOver?.(G, t, view));
    }
  }
  const bossDefs = [...R.allCourts().map((c) => R.getIslesBoss(`isle:${c.prince.id}`)), ...R.ISLES.map((i) => R.getIslesBoss(`isle:${i.monarch.id}`))].filter((d) => d && !phBosses.has(d.worldId));
  console.log(`Smoke: ${bossDefs.length} bosses, ${bossDefs.reduce((n, d) => n + Object.keys(d.signatures).length, 0)} signatures`);
  for (const d of bossDefs) {
    const player = fighter();
    let bx = 480, by = 260;
    const host = { scene, W: 960, H: 640, player: () => player, bossX: () => bx, bossY: () => by, setBossPos: (x, y) => { bx = x; by = y; },
      stopped: () => false, addEnemy: () => {}, removeEnemy: () => {}, healBoss: () => {}, spawnHitFlash: () => {}, showFloatingText: () => {} };
    tryRun(`${d.worldId} drawArena`, () => d.drawArena?.(G, 960, 640));
    for (const hard of [false, true]) {
      const tk = new BossToolkit(host, { main: d.color, lit: d.colorLit, dark: d.colorDark, accent: d.accent }, hard);
      const sigs = Object.entries(d.signatures).map(([k, f]) => { let m = null; tryRun(`${d.worldId} sig ${k} build`, () => { m = f(tk); }); return [k, m]; });
      for (const [k, m] of sigs) {
        if (!m) continue;
        tryRun(`${d.worldId} sig ${k}`, () => {
          m.cast(1000);
          for (let i = 0; i < 240; i++) {
            const t = 1000 + i * 16;
            scene.time.now = t;
            player.x = 480 + Math.sin(i / 15) * 250; player.y = 380 + Math.cos(i / 25) * 120;
            m.update?.(t, 0.016); tk.update(t, 16);
            m.drawGround?.(G, t); m.drawAir?.(G, t); tk.drawGround(G, t); tk.drawAir(G, t);
          }
          m.onPhaseEnd?.();
        });
      }
      for (let pi = 0; pi < d.phases.length + 1; pi++) {
        tryRun(`${d.worldId} drawDecor p${pi}`, () => d.drawDecor?.(G, { x: 480, y: 260, t: 2, hpRatio: 0.5, enraged: pi > 1, hurt: false, phaseIdx: pi, hard,
          facing: 0, castGlow: 0.5, radius: 34, palette: { main: d.color, lit: d.colorLit, dark: d.colorDark, accent: d.accent }, look: d.look,
          hands: [{ x: 440, y: 270 }, { x: 520, y: 270 }, { x: 430, y: 300 }, { x: 530, y: 300 }] }));
      }
    }
  }
  for (const c of R.allCourts().filter((c) => !phCourts.has(c.id))) tryRun(`${c.id} floor`, () => c.floor(G, 960, 640, rng));
  const STATIONS = [[150, 160], [480, 360], [810, 560], [810, 160], [150, 560], [480, 160], [480, 560], [150, 360], [810, 360]].map(([x, y]) => ({ x, y }));
  const encs = [...new Map([...R.allCourts().flatMap((c) => c.encounters), ...R.allEncounters()].map((e) => [e.gimmick, e])).values()].filter((e) => e.gimmick);
  for (const e of encs) {
    const g = R.getGimmick(e.gimmick);
    if (!g) continue;
    const player = fighter(), npc = fighter();
    npc.x = 700;
    // `acts` counts everything the rule does to the fight (toolkit spawns, damage, pushes, CC, words on
    // screen, multipliers off 1) so a rule that never fires in a long simulated fight is flagged.
    let acts = 0;
    const act = (f) => (...a) => { acts++; return f(...a); };
    for (const f of [player, npc]) { const td = f.takeDamage, hl = f.heal, sp = f.setPosition; f.takeDamage = (...a) => { acts++; return td.apply(f, a); }; f.heal = (...a) => { acts++; return hl.apply(f, a); }; f.setPosition = function (...a) { acts++; return sp.apply(f, a); }; }
    const tk = new Proxy({ bossX: 700, bossY: 320, player, W: 960, H: 640, now: 1000, palette: { main: 1, lit: 1, dark: 1, accent: 1 } }, {
      get: (t, k) => (k in t ? t[k] : (...a) => { if (typeof k === 'string' && /^(spawn|hit|pull|push|warn|ring|lane|zone|pool|bullet|beam|fire|burst|sfx)/i.test(k)) acts++; return G; }),
    });
    const ctx = { scene, W: 960, H: 640, tk, player, npc, top: 96, hard: false, rng,
      hit: act((f, n) => { f.hp -= n; }), heal: act(() => {}), nudge: act((f, dx, dy) => { f.x += dx; f.y += dy; }), stun: act(() => {}), root: act(() => {}), silence: act(() => {}),
      float: act(() => {}), flash: act(() => {}), banner: act(() => {}), sfx: () => {}, victory: () => {} };
    tryRun(`gimmick ${e.gimmick}`, () => {
      scene.time.now = 1000; // every rule starts its own clock at make()
      const gm = g.make(ctx);
      for (let i = 0; i < 2500; i++) {
        scene.time.now = 1000 + i * 16;
        // The player sweeps the whole floor; the bot walks toward whatever the rule tells it to seek.
        // (pausing ~3 s at each of nine stations, so dwell- and linger-rules get a chance to fire).
        const st = STATIONS[Math.floor(i / 180) % STATIONS.length];
        player.x += (st.x - player.x) * 0.08; player.y += (st.y - player.y) * 0.08;
        const seek = gm.npcSeek?.();
        if (seek) { const d = Math.hypot(seek.x - npc.x, seek.y - npc.y) || 1, st = Math.min(d, 3); npc.x += (seek.x - npc.x) / d * st; npc.y += (seek.y - npc.y) / d * st; }
        else { npc.x = 480 + Math.cos(i / 41) * 380; npc.y = 360 + Math.cos(i / 29) * 220; }
        tk.bossX = npc.x; tk.bossY = npc.y;
        gm.update(scene.time.now, 0.016);
        gm.drawGround?.(G, scene.time.now); gm.drawAir?.(G, scene.time.now); gm.drawHud?.(G, scene.time.now);
        gm.playerSpeedMult?.(); gm.npcSpeedMult?.(); gm.playerTakenMult?.(); gm.npcTakenMult?.(); gm.npcSeek?.();
        for (const m of [gm.playerSpeedMult?.(), gm.npcSpeedMult?.(), gm.playerTakenMult?.(), gm.npcTakenMult?.()]) if (m !== undefined && m !== 1) acts++;
        if (i % 50 === 0) { gm.onPlayerHurt?.(10); gm.onNpcHurt?.(10); }
      }
      gm.destroy?.();
      if (!acts) warn(`gimmick ${e.gimmick}: did nothing to the fight in ~40 s of simulated play (no spawns, hits, pushes, CC, text or multipliers)`);
    });
  }
  for (const it of R.allItems()) {
    if (!it.script) continue;
    const f = R.getItemScript(it.script);
    if (!f) continue;
    const player = fighter(), npc = fighter();
    tryRun(`script ${it.id}`, () => {
      const sc = f({ scene, W: 960, H: 640, player, npc, rng, hit: () => {}, heal: () => {}, float: () => {}, flash: () => {}, sfx: () => {},
        slotOf: () => 'e', refund: () => {}, boostDamage: () => {}, boostSpeed: () => {} });
      for (let i = 0; i < 300; i++) {
        scene.time.now = 1000 + i * 16;
        sc.update?.(scene.time.now, 0.016);
        if (i % 30 === 0) { sc.onHitDealt?.(12); sc.onHitTaken?.(9); sc.onCast?.('x', ['click', 'e', 'r', 'f', 'q'][i % 5]); }
        sc.drawGround?.(G, scene.time.now); sc.drawAir?.(G, scene.time.now);
      }
    });
  }
}

// sfx scan over source text
import('node:child_process').then(({ execSync }) => {
  const txt = execSync("grep -rhoE \"(sfx|Sfx\\.play(At)?)\\('[a-z0-9-]+'\" src/isles || true").toString();
  for (const m of txt.matchAll(/'([a-z0-9-]+)'/g)) {
    if (!SFX.has(m[1]) && !/^ui-|^(reward-big|shard-gain|unlock|achievement|level-up|victory|defeat|craft-complete|potion-drink|nucleus-gain)$/.test(m[1])) warn(`sfx '${m[1]}' is not a known voice`);
  }
  const standing = [...phAreas];
  if (standing.length) console.log(`\n⚠ ${standing.length} placeholder(s) still standing (skipped): ${standing.join(', ')}`);
  console.log(errors ? `\n${errors} error(s), ${warns} warning(s)` : `\nOK — ${warns} warning(s)`);
  process.exit(errors ? 1 : 0);
});
