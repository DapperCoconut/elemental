import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit, mixC, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRONZE, BRONZE_DARK, BRONZE_LIT, FLOOR_DARK, FLOW_DARK, LAMP, LAMP_HOT, ROCK, ROCK_DARK, ROCK_DEEP, SILVER } from '../palette';
import { alive, clamp, dist, stepDt } from '../../../../life/courts/bloom/util';

/**
 * Choke-Damp — Hobart Sump, Damp-Reader, who in the King's telling walked the low grottos with
 * his safety lamp and decided which households' rooms had "bad air" — and so must be shut, and
 * their people moved up into the Tuners' rooms where they could be heard.
 *
 * Heavy black-damp seeps from fissures in the floor and does what heavy air does: it runs
 * downhill and pools in the hollows, rising as more comes. Standing in it your cooldowns crawl,
 * your feet drag and it chokes you on a slow clock; the lamp in the corner shows how bad the air
 * is where you stand. The high ground stays sweet.
 *
 * The thing to do is the dash. A dash fans the damp: everything around you is swept along and
 * dumped ahead of you where your dash points — so a dash at him through a pool carries the pool
 * onto him. He does the same. At half health the sea-door at the cave's foot is shut: the seeps
 * breathe harder and a fourth fissure opens.
 */

const ID = fallenId('cavern', 'damp');
const CELL = 32;
const STEP_S = 0.05;
const DAMP_AT = 0.3;
const CHOKE_MS = 560;
const FAN_R = 66;
const FAN_AHEAD = 112;
const DAMP = 0x6f7d62;
const DAMP_LIT = 0xa6b48e;
const SULPHUR = 0xd8c860;

/** A hollow in the floor: where the damp runs to. */
interface Hollow { x: number; y: number; r: number; depth: number }
/** A fissure the damp seeps from. */
interface Seep { x: number; y: number; ang: number; open: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const cols = Math.ceil(W / CELL), rows = Math.ceil((H - top) / CELL);
  const hollows: Hollow[] = [
    { x: 230 + rng() * 60, y: top + 330 + rng() * 60, r: 135, depth: 0.95 },
    { x: 700 + rng() * 60, y: top + 150 + rng() * 50, r: 120, depth: 0.85 },
    { x: 540 + rng() * 40, y: H - 90, r: 100, depth: 0.6 },
  ];
  const height = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * CELL + CELL / 2, y = top + r * CELL + CELL / 2;
      let h = 1 + (x / W) * 0.12;
      for (const o of hollows) h -= o.depth * Math.exp(-(((x - o.x) ** 2 + (y - o.y) ** 2) / (o.r * o.r)));
      height[r * cols + c] = h;
    }
  }
  const gas = new Float32Array(cols * rows);
  const delta = new Float32Array(cols * rows);
  // Each seep sits up the slope from its hollow so the damp is seen to run down.
  const seeps: Seep[] = hollows.map((o, i) => {
    const a = i * 2.1 + rng();
    return { x: clamp(o.x + Math.cos(a) * o.r * 0.95, 60, W - 60), y: clamp(o.y + Math.sin(a) * o.r * 0.8, top + 40, H - 40), ang: a, open: 1 };
  });
  const cellOf = (x: number, y: number): number => {
    const c = clamp(Math.floor(x / CELL), 0, cols - 1), r = clamp(Math.floor((y - top) / CELL), 0, rows - 1);
    return r * cols + c;
  };
  const gasAt = (x: number, y: number): number => gas[cellOf(x, y)];
  const heightAt = (x: number, y: number): number => height[cellOf(x, y)];

  let acc = 0;
  let started = false;
  let shut = false;
  let breath = 0.55;
  const last = new Map<Fighter, Pt>([[player, { x: player.x, y: player.y }], [npc, { x: npc.x, y: npc.y }]]);
  const choke = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const fannedAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);

  function flow(): void {
    delta.fill(0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        for (const j of [c + 1 < cols ? i + 1 : -1, r + 1 < rows ? i + cols : -1]) {
          if (j < 0) continue;
          let f = ((height[i] + gas[i]) - (height[j] + gas[j])) * 0.22;
          if (f > 0) f = Math.min(f, gas[i] * 0.24); else f = Math.max(f, -gas[j] * 0.24);
          delta[i] -= f; delta[j] += f;
        }
      }
    }
    for (let i = 0; i < gas.length; i++) gas[i] = Math.max(0, (gas[i] + delta[i]) * (1 - 0.03 * STEP_S));
    for (const s of seeps) gas[cellOf(s.x, s.y)] += breath * s.open * STEP_S * (0.8 + 0.4 * Math.sin(ctx.scene.time.now / 700 + s.ang));
  }

  /** A dash sweeps the damp around the dasher and drops it where the dash points. */
  function fan(f: Fighter, dx: number, dy: number): void {
    const d = Math.hypot(dx, dy);
    const a = d > 0.5 ? Math.atan2(dy, dx) : ctx.facing(f);
    const tx = f.x + Math.cos(a) * FAN_AHEAD, ty = f.y + Math.sin(a) * FAN_AHEAD;
    const into = [cellOf(tx, ty), cellOf(tx + Math.cos(a + 1.5) * CELL, ty + Math.sin(a + 1.5) * CELL), cellOf(tx + Math.cos(a - 1.5) * CELL, ty + Math.sin(a - 1.5) * CELL)];
    let moved = 0;
    const c0 = Math.floor((f.x - FAN_R) / CELL), c1 = Math.floor((f.x + FAN_R) / CELL);
    const r0 = Math.floor((f.y - top - FAN_R) / CELL), r1 = Math.floor((f.y - top + FAN_R) / CELL);
    for (let r = Math.max(0, r0); r <= Math.min(rows - 1, r1); r++) {
      for (let c = Math.max(0, c0); c <= Math.min(cols - 1, c1); c++) {
        const i = r * cols + c;
        if (into.includes(i) || dist(c * CELL + CELL / 2, top + r * CELL + CELL / 2, f.x, f.y) > FAN_R) continue;
        const m = gas[i] * 0.6;
        gas[i] -= m; moved += m;
      }
    }
    for (const i of into) gas[i] += moved / into.length;
    if (moved > 0.4) {
      const now = ctx.scene.time.now;
      if (now - fannedAt.get(f)! > 400) ctx.sfx('gust');
      fannedAt.set(f, now);
    }
  }

  const inDamp = (f: Fighter) => alive(f) && gasAt(f.x, f.y) >= DAMP_AT;

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; ctx.banner('BLACK-DAMP POOLS IN THE HOLLOWS: IT CHOKES AND SLOWS. A DASH FANS IT AHEAD OF YOU.', '#c8d4b0'); }
      if (!shut && npc.hp < npc.maxHp * 0.5) {
        shut = true;
        breath = 0.85;
        const o = hollows[0], p = hollows[1];
        seeps.push({ x: (o.x + p.x) / 2, y: (o.y + p.y) / 2, ang: 0.7, open: 0 });
        ctx.banner('HE SHUTS THE SEA-DOOR: THE SEEPS BREATHE HARDER', '#c8d4b0');
        ctx.sfx('stone-slam');
      }
      for (const s of seeps) s.open = Math.min(1, s.open + dt * 0.4);
      acc += dt;
      while (acc >= STEP_S) { acc -= STEP_S; flow(); }
      for (const f of [player, npc]) {
        const p = last.get(f)!;
        if (alive(f) && ctx.dashing(f)) fan(f, f.x - p.x, f.y - p.y);
        p.x = f.x; p.y = f.y;
        if (inDamp(f)) {
          if (time - choke.get(f)! >= CHOKE_MS) {
            choke.set(f, time);
            ctx.hit(f, 2 + Math.round(3 * Math.min(1, gasAt(f.x, f.y))), f.x, f.y);
          }
        }
      }
    },

    playerSpeedMult() { return inDamp(player) ? 0.84 : 1; },
    npcSpeedMult() { return inDamp(npc) ? 0.84 : 1; },
    playerCooldownRate() { return inDamp(player) ? 0.55 : 1; },
    npcCooldownRate() { return inDamp(npc) ? 0.55 : 1; },

    npcSeek() {
      // Choking: climb to the sweetest high ground near by.
      if (gasAt(npc.x, npc.y) >= DAMP_AT * 0.7) {
        let best: Pt | null = null, bs = Infinity;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const x = clamp(npc.x + Math.cos(a) * 130, 50, W - 50), y = clamp(npc.y + Math.sin(a) * 130, top + 40, H - 40);
          const s = gasAt(x, y) * 500 - heightAt(x, y) * 80 + dist(x, y, player.x, player.y) * 0.15;
          if (s < bs) { bs = s; best = { x, y }; }
        }
        return best;
      }
      // A pool by the player: stand behind it, so a dash at the player carries the pool onto them.
      let pool: Pt | null = null, pg = 0.55;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x = player.x + Math.cos(a) * 110, y = player.y + Math.sin(a) * 110;
        const g = gasAt(x, y);
        if (g > pg) { pg = g; pool = { x, y }; }
      }
      if (pool) {
        const a = Math.atan2(pool.y - player.y, pool.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 200, 50, W - 50), y: clamp(player.y + Math.sin(a) * 200, top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      // The hollows: rings of darker rock stepping down, like contours on a survey.
      for (const o of hollows) {
        for (let k = 0; k < 4; k++) {
          const s = 1 - k * 0.22;
          g.fillStyle(mixC(FLOOR_DARK, ROCK_DEEP, k / 3), 0.18 + k * 0.06); g.fillEllipse(o.x, o.y, o.r * 2 * s, o.r * 1.5 * s);
          g.lineStyle(1, ROCK, 0.25); g.strokeEllipse(o.x, o.y, o.r * 2 * s, o.r * 1.5 * s);
        }
      }
      // The seeps: a split in the floor crusted yellow-white, bubbling.
      for (const s of seeps) {
        if (s.open <= 0) continue;
        const L = 30 * s.open;
        const ca = Math.cos(s.ang + 1.2), sa = Math.sin(s.ang + 1.2);
        const pts: Pt[] = [];
        for (let i = -3; i <= 3; i++) pts.push({ x: s.x + ca * L * (i / 3) + ((i * 7) % 5) * 0.8, y: s.y + sa * L * (i / 3) * 0.6 + ((i * 3) % 4) });
        g.lineStyle(8, SULPHUR, 0.25); g.strokePoints(pts, false);
        g.lineStyle(4, ROCK_DEEP, 1); g.strokePoints(pts, false);
        for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? SULPHUR : lit(SULPHUR, 0.5), 0.7); g.fillCircle(pts[i].x + 4, pts[i].y - 3, 1.8); }
        const ph = (t * 0.9 + s.ang) % 1;
        g.lineStyle(1.5, DAMP_LIT, 0.6 * (1 - ph)); g.strokeEllipse(s.x, s.y, 10 + ph * 34, 5 + ph * 16);
      }
      // The damp itself: soft heavy layers, thick where it pools, curling as it settles.
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = gas[r * cols + c];
          if (v < 0.04) continue;
          const x = c * CELL + CELL / 2 + Math.sin(t * 0.6 + r * 1.3) * 5, y = top + r * CELL + CELL / 2 + Math.cos(t * 0.5 + c) * 3;
          g.fillStyle(DAMP, Math.min(0.42, v * 0.34)); g.fillEllipse(x, y, CELL * 1.7, CELL * 1.2);
          if (v > 0.5) { g.fillStyle(dim(DAMP, 0.4), Math.min(0.3, (v - 0.5) * 0.4)); g.fillEllipse(x + 3, y + 2, CELL * 1.1, CELL * 0.7); }
          if (v > DAMP_AT && (r + c) % 3 === 0) {
            const w = (t * 0.4 + c * 0.37) % 1;
            g.lineStyle(1.2, DAMP_LIT, 0.35 * (1 - w)); g.beginPath(); g.arc(x, y, 6 + w * 10, -1, 1.4, false); g.strokePath();
          }
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // A fighter in it coughs: puffs rising off the shoulders.
      for (const f of [player, npc]) {
        if (!inDamp(f)) continue;
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.9 + i / 3) % 1;
          g.fillStyle(DAMP_LIT, 0.45 * (1 - k)); g.fillCircle(f.x + 10 + Math.sin(i * 2 + t) * 6, f.y - 30 - k * 26, 3 + k * 5);
        }
      }
      // A dash's wake: the fanned damp streaming off in a fan.
      for (const f of [player, npc]) {
        const k = (time - fannedAt.get(f)!) / 420;
        if (k < 0 || k > 1) continue;
        for (let i = -2; i <= 2; i++) {
          g.lineStyle(2, DAMP_LIT, 0.5 * (1 - k));
          const a = ctx.facing(f) + i * 0.28;
          g.lineBetween(f.x + Math.cos(a) * (20 + k * 40), f.y + Math.sin(a) * (20 + k * 40), f.x + Math.cos(a) * (40 + k * 80), f.y + Math.sin(a) * (40 + k * 80));
        }
      }
    },

    drawHud(g, time) {
      // Two Davy lamps: the flame shows the air where each fighter stands, and dies in the damp.
      safetyLamp(g, 34, ctx.top + 44, gasAt(player.x, player.y), time);
      safetyLamp(g, ctx.W - 34, ctx.top + 44, gasAt(npc.x, npc.y), time);
    },
  };
}

/** A miner's safety lamp: brass foot, gauze chimney, guard wires, and a flame the damp starves. */
function safetyLamp(g: G, x: number, y: number, v: number, time: number): void {
  const k = clamp(v / (DAMP_AT * 2.2), 0, 1);
  g.fillStyle(ROCK_DEEP, 0.65); g.fillRoundedRect(x - 18, y - 40, 36, 66, 8);
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 11, y + 12, 22, 9);
  g.fillStyle(BRONZE, 1); g.fillRect(x - 10, y + 12, 20, 3);
  g.fillStyle(ROCK_DARK, 0.9); g.fillRect(x - 8, y - 22, 16, 34);
  // Flame: tall and gold in sweet air, a low blue cap as the damp climbs, then out.
  if (k < 0.97) {
    const fh = 18 * (1 - k) + 3;
    const flick = Math.sin(time / 90) * 1.2;
    g.fillStyle(mixC(LAMP, 0x6a8aff, k), 0.95); g.fillEllipse(x + flick * 0.4, y + 8 - fh / 2, 7 * (1 - k * 0.5), fh);
    g.fillStyle(LAMP_HOT, 0.9 * (1 - k)); g.fillEllipse(x, y + 8 - fh / 3, 3, fh * 0.5);
    glow(g, x, y + 2, 14, LAMP, 0.05 * (1 - k), 2);
  }
  g.lineStyle(1, SILVER, 0.55);
  for (let i = -6; i <= 6; i += 3) g.lineBetween(x + i, y - 22, x + i, y + 12);
  for (let j = -20; j <= 10; j += 5) g.lineBetween(x - 8, y + j, x + 8, y + j);
  g.lineStyle(2, BRONZE_LIT, 1); g.lineBetween(x - 9, y - 22, x - 9, y + 12); g.lineBetween(x + 9, y - 22, x + 9, y + 12);
  g.fillStyle(BRONZE, 1); g.fillRect(x - 10, y - 26, 20, 5);
  g.lineStyle(2, BRONZE_DARK, 1); g.beginPath(); g.arc(x, y - 30, 7, Math.PI, 0, false); g.strokePath();
  // The damp's line creeping up the glass.
  if (k > 0) { g.fillStyle(DAMP, 0.55); g.fillRect(x - 8, y + 12 - 34 * k, 16, 34 * k); }
  g.lineStyle(1, FLOW_DARK, 0.6); g.strokeRect(x - 8, y - 22, 16, 34);
}

export const FALLEN_DAMP: GimmickDef = {
  id: ID,
  rules: 'Black-damp seeps out and pools in the hollows: in it you choke, slow and cool down slowly. A dash fans it ahead of you. Fan it onto him.',
  make,
};
