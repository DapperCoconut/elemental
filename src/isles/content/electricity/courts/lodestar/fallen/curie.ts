import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { FILINGS, FILINGS_LIT, IRON, IRON_DARK, IRON_LIT, NORTH, NORTH_LIT, RUST, RUST_DARK, SLATE_DEEP, SOUTH, SOUTH_LIT, SPARK } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * The Curie Point — Farrier Bartholo Cudlipp, who shod the observatory's dray-horses and, in the
 * King's telling, nailed a lucky horseshoe over every door the Prince meant to switch off.
 *
 * Up here every blow drives the field into you: each hard hit taken magnetises you a step (five at
 * most), and filings bristle on you to show it. Two great horseshoe magnets stand at the yard's
 * east and west walls, jaws inward. In turn one *wakes* — its jaws flare red and blue and the field
 * fans out of them — and drags every magnetised fighter in front of it toward the jaws, harder the
 * more magnetised. Walk away against it; dragged into the jaws, you are clamped and struck.
 *
 * The farrier's forge-pan burns in the middle of the yard. Heat a magnet past its Curie point and
 * it forgets: standing in the pan's fire scorches you, but sheds your magnetism step by step. And
 * the clamp takes all of it at once. Strike a horseshoe to wake it now — hit him till he bristles,
 * then wake the one he stands before. Past half, both wake together.
 */

const ID = fallenId('lodestar', 'curie');
const MAX_MAG = 5;
const JAW_REACH = 430;
const CONE = 0.62;
const WARN_MS = 1000;
const PULL_MS = 1700;
const FORGE_R = 62;

interface Shoe { x: number; y: number; dir: number; warnAt: number; wakeAt: number; endAt: number; t: StrikeTarget | null }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const ym = (top + H) / 2 + 10;
  const shoes: Shoe[] = [
    { x: 64, y: ym, dir: 0 }, { x: W - 64, y: ym, dir: Math.PI },
  ].map((s) => ({ ...s, warnAt: 0, wakeAt: 0, endAt: 0, t: null }));
  const FORGE: Pt = { x: W / 2, y: H - 92 };
  const mag = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const hitGate = new Map<Fighter, number>();
  const clampedUntil = new Map<Fighter, number>();
  let nextWake = 0;
  let turn = 0;
  let burnTick = 0;
  let started = false;

  const half = () => npc.hp < npc.maxHp * 0.5;
  const hurt = (f: Fighter, n: number) => { if (f === player) tk.hitPlayer(n, f.x, f.y); else ctx.hit(f, n, f.x, f.y); };
  const jaws = (s: Shoe): Pt => ({ x: s.x + Math.cos(s.dir) * 40, y: s.y });
  const awake = (s: Shoe, time: number) => s.wakeAt > 0 && time >= s.wakeAt && time < s.endAt;
  const warning = (s: Shoe, time: number) => s.warnAt > 0 && time >= s.warnAt && time < s.wakeAt;
  /** In the fan of field in front of the jaws. */
  const inField = (s: Shoe, f: Fighter) => {
    const j = jaws(s);
    const d = dist(j.x, j.y, f.x, f.y);
    if (d > JAW_REACH) return false;
    const a = Math.atan2(f.y - j.y, f.x - j.x) - s.dir;
    return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < CONE;
  };

  function wake(s: Shoe, time: number, warn: number): void {
    if (s.warnAt && time < s.endAt) return;
    s.warnAt = time; s.wakeAt = time + tk.warn(warn); s.endAt = s.wakeAt + PULL_MS;
    ctx.sfx('beam-charge');
  }

  function magnetise(f: Fighter, amount: number): void {
    const time = ctx.scene.time.now;
    if (amount < 5 || time < (hitGate.get(f) ?? 0)) return;
    hitGate.set(f, time + 450);
    mag.set(f, Math.min(MAX_MAG, (mag.get(f) ?? 0) + 1));
  }

  return {
    update(time, dt) {
      if (!started) {
        started = true;
        nextWake = time + 3800;
        for (const s of shoes) s.t = ctx.target({ x: s.x + Math.cos(s.dir) * 6, y: s.y - 10, r: 34, onStruck: () => wake(s, ctx.scene.time.now, 600) });
      }
      if (time >= nextWake) {
        nextWake = time + (half() ? 5200 : 6000);
        if (half()) { for (const s of shoes) wake(s, time, WARN_MS); }
        else { wake(shoes[turn % 2], time, WARN_MS); turn++; }
      }
      // A waking horseshoe drags the magnetised in; reaching its jaws clamps them.
      for (const s of shoes) {
        if (!awake(s, time)) continue;
        const j = jaws(s);
        for (const f of [player, npc]) {
          const m = mag.get(f) ?? 0;
          if (!alive(f) || m <= 0 || !inField(s, f) || time < (clampedUntil.get(f) ?? 0)) continue;
          const strength = 45 + m * 17;
          if (f === player) tk.pull(j.x, j.y, strength, 120);
          else { const d = dist(f.x, f.y, j.x, j.y) || 1; ctx.nudge(f, ((j.x - f.x) / d) * strength * dt, ((j.y - f.y) / d) * strength * dt); }
          if (dist(f.x, f.y, j.x, j.y) < 52) {
            clampedUntil.set(f, time + 1300);
            ctx.root(f, 1200);
            hurt(f, 6 + m * 2);
            mag.set(f, 0);
            ctx.float(f.x, f.y - 46, 'CLAMPED', '#ff8a7a');
            ctx.sfx('anvil');
          }
        }
      }
      // The forge-pan: past the Curie point, on a slow clock.
      if (time >= burnTick) {
        burnTick = time + 500;
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, FORGE.x, FORGE.y) > FORGE_R) continue;
          hurt(f, 3);
          const m = mag.get(f) ?? 0;
          if (m > 0) { mag.set(f, m - 1); ctx.sfx('sizzle'); }
        }
      }
    },

    onPlayerHurt(amount) { magnetise(player, amount); },
    onNpcHurt(amount) { magnetise(npc, amount); },

    npcSeek() {
      if (!alive(npc)) return null;
      const time = ctx.scene.time.now;
      const m = mag.get(npc) ?? 0;
      // Out of a waking field, sideways (the fastest way out of a fan).
      for (const s of shoes) {
        if ((warning(s, time) || awake(s, time)) && m > 0 && inField(s, npc)) {
          const side = npc.y >= s.y ? 1 : -1;
          return { x: clamp(npc.x - Math.cos(s.dir) * 60, 80, W - 80), y: clamp(s.y + side * 260, top + 50, H - 50) };
        }
      }
      // Bristling: go and burn it off.
      if (m >= 3) return { x: FORGE.x + (npc.x < FORGE.x ? -20 : 20), y: FORGE.y };
      // You bristling: stand so you are between me and a horseshoe, near it.
      const pm = mag.get(player) ?? 0;
      if (pm >= 2) {
        const s = shoes.reduce((a, b) => (dist(player.x, player.y, a.x, a.y) < dist(player.x, player.y, b.x, b.y) ? a : b));
        return { x: clamp(player.x - Math.cos(s.dir) * 150, 80, W - 80), y: clamp(player.y, top + 50, H - 50) };
      }
      return null;
    },

    drawGround(g, time) {
      drawForge(g, FORGE, time);
      for (const s of shoes) {
        const w = warning(s, time), a = awake(s, time);
        if (!w && !a) continue;
        const j = jaws(s);
        const k = w ? clamp((time - s.warnAt) / Math.max(1, s.wakeAt - s.warnAt), 0, 1) : 1;
        // The fan of field: curved filings lines spraying out from the jaws.
        g.fillStyle(a ? NORTH : RUST, 0.05 + k * 0.06);
        g.slice(j.x, j.y, JAW_REACH, s.dir - CONE, s.dir + CONE, false); g.fillPath();
        for (let i = -3; i <= 3; i++) {
          const ang = s.dir + (i / 3) * CONE * 0.92;
          const reach = JAW_REACH * k;
          for (let d = 30; d < reach; d += 12) {
            const flow = a ? ((d - time / 6) % 24 + 24) % 24 < 12 : true;
            const x = j.x + Math.cos(ang) * d, y = j.y + Math.sin(ang) * d;
            g.lineStyle(1.4, flow ? FILINGS_LIT : FILINGS, a ? 0.75 : 0.45);
            g.lineBetween(x, y, x + Math.cos(ang) * 6, y + Math.sin(ang) * 6);
          }
        }
        g.lineStyle(2, a ? NORTH_LIT : RUST, 0.5); g.beginPath(); g.arc(j.x, j.y, JAW_REACH * k, s.dir - CONE, s.dir + CONE); g.strokePath();
      }
    },

    drawAir(g, time) {
      for (const s of shoes) drawShoe(g, s, warning(s, time), awake(s, time), time);
      // Filings bristling on each fighter, one tuft per step of magnetism.
      for (const f of [player, npc]) {
        const m = mag.get(f) ?? 0;
        if (!alive(f) || m <= 0) continue;
        for (let i = 0; i < m * 4; i++) {
          const a = -Math.PI / 2 + ((i / (m * 4)) - 0.5) * 2.6;
          const r = 18 + (i % 3) * 2;
          const x = f.x + Math.cos(a) * r, y = f.y - 8 + Math.sin(a) * r;
          const len = 4 + m * 1.6 + Math.sin(time / 70 + i) * 1;
          g.lineStyle(1.3, i % 3 ? FILINGS : FILINGS_LIT, 0.95);
          g.lineBetween(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
        }
        if (time < (clampedUntil.get(f) ?? 0) - 100) {
          g.lineStyle(5, IRON, 1); g.beginPath(); g.arc(f.x, f.y - 4, 24, 0.4, Math.PI - 0.4); g.strokePath();
          g.lineStyle(1.5, IRON_LIT, 1); g.beginPath(); g.arc(f.x, f.y - 5, 24, 0.6, 1.6); g.strokePath();
        }
      }
    },

    drawHud(g) {
      // Five filing-tufts for you (left) and five for him (right).
      const rows: [Fighter, number, number][] = [[player, W / 2 - 110, SOUTH_LIT], [npc, W / 2 + 30, NORTH_LIT]];
      for (const [f, x0, col] of rows) {
        const m = mag.get(f) ?? 0;
        g.fillStyle(SLATE_DEEP, 0.85); g.fillRoundedRect(x0 - 8, H - 34, 96, 24, 6);
        g.fillStyle(col, 1); g.fillCircle(x0 + 2, H - 22, 4);
        for (let i = 0; i < MAX_MAG; i++) {
          const x = x0 + 16 + i * 14, y = H - 16;
          for (let k = -2; k <= 2; k++) {
            g.lineStyle(1.4, i < m ? FILINGS_LIT : IRON_DARK, 1);
            g.lineBetween(x, y, x + k * 2, y - (i < m ? 10 : 4));
          }
        }
      }
    },

    destroy() { for (const s of shoes) s.t?.remove(); },
  };
}

/** A great horseshoe magnet standing on its bend, jaws to the yard, poles painted red and blue. */
function drawShoe(g: G, s: Shoe, warn: boolean, awake: boolean, time: number): void {
  const d = Math.cos(s.dir) >= 0 ? 1 : -1;
  const x = s.x, y = s.y - 22;
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x + 4, s.y + 6, 80, 22);
  // Stand: an iron block bolted to the slate.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 26, s.y - 8, 52, 14);
  g.fillStyle(IRON_LIT, 1); g.fillCircle(x - 18, s.y - 1, 2); g.fillCircle(x + 18, s.y - 1, 2);
  // The bend (away from the yard) and the two arms reaching toward it.
  g.lineStyle(22, IRON_DARK, 1); g.beginPath(); g.arc(x, y, 30, d > 0 ? Math.PI / 2 : -Math.PI / 2, d > 0 ? Math.PI * 1.5 : Math.PI / 2); g.strokePath();
  g.lineStyle(16, RUST_DARK, 1); g.beginPath(); g.arc(x, y, 30, d > 0 ? Math.PI / 2 : -Math.PI / 2, d > 0 ? Math.PI * 1.5 : Math.PI / 2); g.strokePath();
  g.lineStyle(4, RUST, 0.8); g.beginPath(); g.arc(x, y - 3, 30, d > 0 ? Math.PI * 1.05 : -Math.PI * 0.05, d > 0 ? Math.PI * 1.4 : Math.PI * 0.3); g.strokePath();
  const arm = (yy: number, col: number, colLit: number) => {
    g.fillStyle(IRON_DARK, 1); g.fillRect(d > 0 ? x : x - 44, yy - 11, 44, 22);
    g.fillStyle(col, 1); g.fillRect(d > 0 ? x + 18 : x - 44, yy - 9, 26, 18);
    g.fillStyle(colLit, warn || awake ? 0.9 : 0.4); g.fillRect(d > 0 ? x + 20 : x - 42, yy - 8, 22, 4);
    g.fillStyle(0x9aa0aa, 1); g.fillRect(d > 0 ? x + 42 : x - 46, yy - 9, 4, 18);
  };
  arm(y - 30, NORTH, NORTH_LIT);
  arm(y + 30, SOUTH, SOUTH_LIT);
  // Lucky nail holes stamped down the arms.
  for (let i = 0; i < 3; i++) for (const yy of [y - 30, y + 30]) { g.fillStyle(SLATE_DEEP, 1); g.fillCircle(x + d * (6 + i * 6), yy, 1.6); }
  if (warn || awake) {
    const jx = x + d * 46;
    glow(g, jx, y, awake ? 50 : 30, awake ? NORTH_LIT : 0xffc080, 0.07, 3);
    for (let i = 0; i < 4; i++) {
      const a = time / 60 + i * 1.6;
      g.lineStyle(1.5, SPARK, 0.8);
      g.lineBetween(jx, y - 30 + ((i * 17) % 60), jx + d * (6 + Math.abs(Math.sin(a)) * 8), y - 26 + ((i * 17) % 60));
    }
  }
}

/** The farrier's forge-pan: a ring of firebrick round glowing coals, a hood of flame breathing. */
function drawForge(g: G, p: Pt, time: number): void {
  g.fillStyle(0xff7a28, 0.07); g.fillCircle(p.x, p.y, FORGE_R + 8);
  g.lineStyle(2, 0xffa040, 0.35 + 0.15 * Math.sin(time / 200)); g.strokeCircle(p.x, p.y, FORGE_R);
  g.fillStyle(0x000000, 0.35); g.fillEllipse(p.x + 3, p.y + 6, 110, 40);
  // Brick ring.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const bx = p.x + Math.cos(a) * 44, by = p.y + Math.sin(a) * 18;
    g.fillStyle(i % 2 ? 0x7a3a26 : 0x8e4a30, 1); g.fillRoundedRect(bx - 8, by - 6, 16, 11, 2);
  }
  g.fillStyle(0x1a0c08, 1); g.fillEllipse(p.x, p.y - 1, 74, 26);
  // Coals.
  for (let i = 0; i < 22; i++) {
    const cx = p.x - 30 + ((i * 37) % 60), cy = p.y - 8 + ((i * 13) % 16);
    const hot = 0.5 + 0.5 * Math.sin(time / 180 + i * 1.7);
    g.fillStyle(hot > 0.6 ? 0xffd080 : 0xd0502a, 0.8); g.fillCircle(cx, cy, 3 + (i % 3));
  }
  // Flames licking up, a horseshoe heating in the middle.
  for (let i = 0; i < 6; i++) {
    const fx = p.x - 24 + i * 10, h = 14 + 8 * Math.abs(Math.sin(time / 130 + i));
    g.fillStyle(i % 2 ? 0xffa040 : 0xff6a28, 0.7);
    g.fillTriangle(fx - 5, p.y - 4, fx + 5, p.y - 4, fx + Math.sin(time / 90 + i) * 3, p.y - 4 - h);
  }
  g.lineStyle(3.5, 0xff9a60, 1); g.beginPath(); g.arc(p.x, p.y - 4, 7, 0.5, Math.PI * 2 - 0.5); g.strokePath();
  glow(g, p.x, p.y - 8, 50, 0xffa040, 0.06, 3);
}

export const FALLEN_CURIE: GimmickDef = {
  id: ID,
  rules: 'Hard blows magnetise you; a waking horseshoe drags the magnetised into its jaws. The forge burns it out. Strike a horseshoe to wake it.',
  make,
};
