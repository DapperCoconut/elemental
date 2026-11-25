import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { crackle, doubleMeter, stencilEye } from '../art';
import {
  BOTH, BOTH_DARK, BOTH_LIT, BRASS, BRASS_DARK, COPPER, COPPER_DARK, GROUT, IRON, IRON_LIT, SLATE_LIT,
  STATE_A, STATE_A_LIT, STATE_B, STATE_B_LIT, WAX,
} from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Borrowed from Nothing — Assessor Nihil Prowse, Meter of the Empty Lots.
 *
 * In the King's telling Prowse is the man who found a way to bill the empty lots: nothing, he
 * argued, is never quite nothing in the Superposition Court — it keeps borrowing itself into being
 * and paying itself back — so the empty lot owes the Draw on what it borrows. His yard is a
 * surveyed empty lot, pegged and strung, with his stake-meter in the corner.
 *
 * The rule: **pairs** bloom out of nothing — a crack in the air, then a magenta particle and a cyan
 * antiparticle that fly apart along a line, hang there joined by a live thread, and rush back
 * together to annihilate in a flash where they were born. The flash ring and the thread are drawn
 * from the moment the crack opens. Strike one of a pair and it is gone alone: its partner, orphaned,
 * cannot pay itself back and hunts the striker's foe until it catches them and bursts. Orphans walk
 * slower than a fighter, so they can be outwalked — or led. Past half the vacuum boils: pairs come
 * faster, ring wider, and orphans run quicker.
 *
 * The bot stands by a pair member whose partner hangs near you and strikes it, so the orphan comes
 * for you; it runs from orphans hunting it and steps out of pending flashes.
 */

const ID = fallenId('superposition', 'nothing');
const CRACK_MS = 650;
const SPLIT_MS = 750;
const HANG_MS = 1000;
const RUSH_MS = 300;
const LIFE_MS = CRACK_MS + SPLIT_MS + HANG_MS + RUSH_MS;
const SEP = 92;
const MOTE_R = 20;
const ORPHAN_LIFE = 5200;
const MAX_PAIRS = 4;

interface Mote { x: number; y: number; target: StrikeTarget | null; gone: boolean }
interface Pair { bx: number; by: number; ang: number; born: number; motes: [Mote, Mote]; done: boolean; zapped: Set<Fighter> }
interface Orphan { x: number; y: number; hunts: Fighter; born: number; sign: 1 | -1; trail: Pt[] }
interface Flash { x: number; y: number; at: number; r: number; color: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const pairs: Pair[] = [];
  const orphans: Orphan[] = [];
  const flashes: Flash[] = [];
  let nextPair = 0;
  let started = false;
  let boiling = false;
  let aimAtPlayer = true;

  const ringR = () => (boiling ? 94 : 78);
  const foeOf = (f: Fighter) => (f === player ? npc : player);

  /** Where a pair's members stand at `time`: apart along the axis by `off` each way. */
  function offset(p: Pair, time: number): number {
    const t = time - p.born - CRACK_MS;
    if (t < 0) return 0;
    if (t < SPLIT_MS) { const k = t / SPLIT_MS; return SEP * (1 - (1 - k) * (1 - k)); }
    if (t < SPLIT_MS + HANG_MS) return SEP + Math.sin((t - SPLIT_MS) / 140) * 5;
    const k = clamp((t - SPLIT_MS - HANG_MS) / RUSH_MS, 0, 1);
    return SEP * (1 - k * k);
  }

  function hurt(f: Fighter, pAmt: number, nAmt: number, x: number, y: number): void {
    if (!alive(f)) return;
    if (f === player) tk.hitPlayer(pAmt, x, y);
    else ctx.hit(npc, nAmt, x, y);
  }

  function orphan(p: Pair, keep: number, striker: Fighter, time: number): void {
    const m = p.motes[keep];
    orphans.push({ x: m.x, y: m.y, hunts: foeOf(striker), born: time, sign: keep === 0 ? 1 : -1, trail: [] });
    p.done = true;
    for (const mm of p.motes) { mm.target?.remove(); mm.target = null; }
    ctx.sfx('glitch');
  }

  function spawn(time: number): void {
    const f = aimAtPlayer || !alive(npc) ? player : npc;
    aimAtPlayer = !aimAtPlayer;
    const a = rng() * Math.PI * 2, d = 70 + rng() * 90;
    const bx = clamp(f.x + Math.cos(a) * d, 90, W - 90);
    const by = clamp(f.y + Math.sin(a) * d, top + 80, H - 70);
    const p: Pair = {
      bx, by, ang: rng() * Math.PI, born: time, done: false, zapped: new Set(),
      motes: [{ x: bx, y: by, target: null, gone: false }, { x: bx, y: by, target: null, gone: false }],
    };
    pairs.push(p);
    ctx.sfx('beam-charge');
  }

  function arm(p: Pair): void {
    p.motes.forEach((m, i) => {
      m.target = ctx.target({
        x: m.x, y: m.y, r: MOTE_R, passThrough: true,
        onStruck: (by) => {
          if (p.done) return;
          m.gone = true;
          flashes.push({ x: m.x, y: m.y, at: ctx.scene.time.now, r: 26, color: i === 0 ? STATE_A : STATE_B });
          orphan(p, 1 - i, by === 'player' ? player : npc, ctx.scene.time.now);
        },
      });
    });
  }

  function annihilate(p: Pair, time: number): void {
    p.done = true;
    for (const m of p.motes) { m.target?.remove(); m.target = null; }
    const r = ringR();
    flashes.push({ x: p.bx, y: p.by, at: time, r, color: BOTH_LIT });
    ctx.sfx('explosion-small');
    for (const f of [player, npc]) if (dist(f.x, f.y, p.bx, p.by) < r) hurt(f, 22, 28, p.bx, p.by);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextPair = time + 1600; }
      if (!boiling && npc.hp < npc.maxHp * 0.5) {
        boiling = true;
        ctx.banner('THE VACUUM BOILS', '#d2c0ff');
        ctx.sfx('chaos');
      }
      if (time >= nextPair) {
        nextPair = time + (boiling ? 1650 : 2300);
        if (pairs.filter((p) => !p.done).length < MAX_PAIRS) spawn(time);
      }

      for (const p of pairs) {
        if (p.done) continue;
        const t = time - p.born;
        const off = offset(p, time);
        const cx = Math.cos(p.ang), cy = Math.sin(p.ang);
        p.motes[0].x = p.bx + cx * off; p.motes[0].y = p.by + cy * off;
        p.motes[1].x = p.bx - cx * off; p.motes[1].y = p.by - cy * off;
        if (t >= CRACK_MS && !p.motes[0].target) arm(p);
        for (const m of p.motes) m.target?.moveTo(m.x, m.y);
        // The thread is live while they hang apart.
        if (t > CRACK_MS + SPLIT_MS * 0.6 && t < CRACK_MS + SPLIT_MS + HANG_MS) {
          for (const f of [player, npc]) {
            if (p.zapped.has(f) || !alive(f)) continue;
            if (segDist(f.x, f.y, p.motes[0].x, p.motes[0].y, p.motes[1].x, p.motes[1].y) < 16) {
              p.zapped.add(f);
              hurt(f, 8, 10, f.x, f.y);
              ctx.sfx('zap');
            }
          }
        }
        if (t >= LIFE_MS) annihilate(p, time);
      }
      for (let i = pairs.length - 1; i >= 0; i--) if (pairs[i].done) pairs.splice(i, 1);

      const speed = boiling ? 172 : 145;
      for (let i = orphans.length - 1; i >= 0; i--) {
        const o = orphans[i];
        const f = o.hunts;
        o.trail.unshift({ x: o.x, y: o.y });
        if (o.trail.length > 9) o.trail.pop();
        if (!alive(f) || time - o.born > ORPHAN_LIFE) {
          flashes.push({ x: o.x, y: o.y, at: time, r: 18, color: o.sign > 0 ? STATE_A : STATE_B });
          orphans.splice(i, 1);
          continue;
        }
        const d = dist(o.x, o.y, f.x, f.y);
        if (d < 28) {
          flashes.push({ x: o.x, y: o.y, at: time, r: 60, color: o.sign > 0 ? STATE_A_LIT : STATE_B_LIT });
          ctx.sfx('explosion-medium');
          for (const g of [player, npc]) if (dist(g.x, g.y, o.x, o.y) < 60) hurt(g, 24, 32, o.x, o.y);
          orphans.splice(i, 1);
          continue;
        }
        o.x += ((f.x - o.x) / d) * speed * dt;
        o.y += ((f.y - o.y) / d) * speed * dt;
      }
      for (let i = flashes.length - 1; i >= 0; i--) if (time - flashes[i].at > 650) flashes.splice(i, 1);
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      const hunter = orphans.find((o) => o.hunts === npc);
      if (hunter) {
        const a = Math.atan2(npc.y - hunter.y, npc.x - hunter.x);
        return { x: clamp(npc.x + Math.cos(a) * 220, 70, W - 70), y: clamp(npc.y + Math.sin(a) * 220, top + 60, H - 50) };
      }
      for (const p of pairs) {
        if (p.done || dist(npc.x, npc.y, p.bx, p.by) > ringR() + 20) continue;
        const a = Math.atan2(npc.y - p.by, npc.x - p.bx);
        return { x: clamp(p.bx + Math.cos(a) * (ringR() + 60), 70, W - 70), y: clamp(p.by + Math.sin(a) * (ringR() + 60), top + 60, H - 50) };
      }
      // Strike the member whose partner hangs by the player.
      for (const p of pairs) {
        if (p.done || time - p.born < CRACK_MS) continue;
        for (let i = 0; i < 2; i++) {
          const mine = p.motes[i], theirs = p.motes[1 - i];
          if (dist(theirs.x, theirs.y, player.x, player.y) < 240 && dist(mine.x, mine.y, npc.x, npc.y) < 300) {
            const a = Math.atan2(mine.y - p.by, mine.x - p.bx);
            return { x: clamp(mine.x + Math.cos(a) * 46, 70, W - 70), y: clamp(mine.y + Math.sin(a) * 46, top + 60, H - 50) };
          }
        }
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 230, 80, W - 80), y: clamp(player.y + Math.sin(a) * 230, top + 70, H - 60) };
    },

    drawGround(g, time) {
      surveyLot(g, W, H, top);
      for (const p of pairs) {
        const t = time - p.born;
        const r = ringR();
        // The flash ring, chalked from the first crack, filling toward the annihilation.
        const k = clamp(t / LIFE_MS, 0, 1);
        g.fillStyle(BOTH_DARK, 0.16 + k * 0.14); g.fillCircle(p.bx, p.by, r);
        g.lineStyle(2, BOTH, 0.45 + k * 0.4); g.strokeCircle(p.bx, p.by, r);
        g.fillStyle(BOTH, 0.22);
        g.slice(p.bx, p.by, r - 4, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
        // The axis they will fly along, ticked at the hanging points.
        const cx = Math.cos(p.ang), cy = Math.sin(p.ang);
        g.lineStyle(1, SLATE_LIT, 0.5);
        g.lineBetween(p.bx - cx * (SEP + 14), p.by - cy * (SEP + 14), p.bx + cx * (SEP + 14), p.by + cy * (SEP + 14));
        for (const s of [-1, 1]) {
          const hx = p.bx + cx * SEP * s, hy = p.by + cy * SEP * s;
          g.lineStyle(1.5, s > 0 ? STATE_A : STATE_B, 0.6); g.strokeCircle(hx, hy, 9);
        }
        if (t < CRACK_MS + 200) crack(g, p.bx, p.by, p.ang + Math.PI / 2, clamp(t / CRACK_MS, 0, 1), time);
      }
      for (const o of orphans) shadow(g, o.x, o.y + 4, 24, 8, 0.3);
    },

    drawAir(g, time) {
      for (const p of pairs) {
        const t = time - p.born;
        if (t < CRACK_MS) continue;
        const [a, b] = p.motes;
        if (t < CRACK_MS + SPLIT_MS + HANG_MS) {
          crackle(g, { x: a.x, y: a.y - 16 }, { x: b.x, y: b.y - 16 }, time / 1000, p.born % 97, BOTH_LIT, 1.4, 0.75, 8);
        }
        mote(g, a.x, a.y - 16, time, STATE_A, 1);
        mote(g, b.x, b.y - 16, time, STATE_B, -1);
      }
      for (const o of orphans) {
        const col = o.sign > 0 ? STATE_A : STATE_B;
        o.trail.forEach((q, i) => { g.fillStyle(col, 0.3 * (1 - i / o.trail.length)); g.fillCircle(q.x, q.y - 16, 8 - i * 0.6); });
        mote(g, o.x + Math.sin(time / 37) * 2, o.y - 16, time * 2.2, col, o.sign);
        // A frayed half-thread trailing where its partner should be.
        g.lineStyle(1.2, lit(col, 0.4), 0.6);
        g.beginPath(); g.moveTo(o.x, o.y - 16);
        for (let k = 1; k <= 5; k++) g.lineTo(o.x - k * 6 + Math.sin(time / 60 + k) * 4, o.y - 16 + Math.cos(time / 70 + k) * 5);
        g.strokePath();
      }
      for (const f of flashes) {
        const k = clamp((time - f.at) / 650, 0, 1);
        g.fillStyle(0xffffff, 0.5 * (1 - k)); g.fillCircle(f.x, f.y - 10, f.r * (0.3 + k * 0.5));
        g.lineStyle(3 * (1 - k) + 1, f.color, 1 - k); g.strokeCircle(f.x, f.y, f.r * (0.4 + k * 0.7));
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + f.at;
          const r0 = f.r * (0.2 + k * 0.6), r1 = r0 + f.r * 0.35 * (1 - k);
          g.lineStyle(1.5, lit(f.color, 0.5), 1 - k);
          g.lineBetween(f.x + Math.cos(a) * r0, f.y - 10 + Math.sin(a) * r0, f.x + Math.cos(a) * r1, f.y - 10 + Math.sin(a) * r1);
        }
      }
      stakeMeter(g, W - 46, top + 64, pairs.filter((p) => !p.done).length + orphans.length, time);
    },

    drawHud(g) {
      // The Assessor's ledger strip: one brass slot per pair he may raise, lit while it is out.
      const x0 = 16, y0 = H - 40;
      g.fillStyle(0x0c0b10, 0.7); g.fillRoundedRect(x0 - 6, y0 - 14, 150, 30, 6);
      g.lineStyle(1, BRASS_DARK, 1); g.strokeRoundedRect(x0 - 6, y0 - 14, 150, 30, 6);
      const live = pairs.filter((p) => !p.done);
      for (let i = 0; i < MAX_PAIRS; i++) {
        const x = x0 + 8 + i * 26;
        g.fillStyle(GROUT, 1); g.fillCircle(x, y0, 9);
        if (i < live.length) {
          g.fillStyle(STATE_A, 1); g.fillCircle(x - 3, y0, 4);
          g.fillStyle(STATE_B, 1); g.fillCircle(x + 3, y0, 4);
        }
        g.lineStyle(1, BRASS, 0.8); g.strokeCircle(x, y0, 9);
      }
      orphans.slice(0, 3).forEach((o, i) => {
        const x = x0 + 112 + i * 10;
        g.fillStyle(o.hunts === player ? WAX : BOTH_LIT, 1); g.fillTriangle(x, y0 - 7, x - 4, y0 + 6, x + 4, y0 + 6);
      });
    },

    destroy() {
      for (const p of pairs) for (const m of p.motes) m.target?.remove();
    },
  };
}

/** The empty lot: pegged corners, survey string sagging between them, chalked lot-line ticks. */
function surveyLot(g: G, W: number, H: number, top: number): void {
  const x0 = 44, y0 = top + 26, x1 = W - 44, y1 = H - 26;
  const corners: Pt[] = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  g.lineStyle(1, 0xd8d0b8, 0.35);
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4];
    const n = 16;
    g.beginPath(); g.moveTo(a.x, a.y);
    for (let k = 1; k <= n; k++) { const f = k / n; g.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f + Math.sin(f * Math.PI) * 4); }
    g.strokePath();
    for (let k = 1; k < 8; k++) {
      const f = k / 8, mx = a.x + (b.x - a.x) * f, my = a.y + (b.y - a.y) * f;
      g.lineStyle(1, 0xd8d0b8, 0.22); g.lineBetween(mx - (b.y - a.y ? 6 : 0), my - (b.x - a.x ? 6 : 0), mx + (b.y - a.y ? 6 : 0), my + (b.x - a.x ? 6 : 0));
    }
  }
  for (const c of corners) {
    shadow(g, c.x, c.y + 3, 14, 5);
    g.fillStyle(COPPER_DARK, 1); g.fillRect(c.x - 2, c.y - 12, 4, 14);
    g.fillStyle(COPPER, 1); g.fillRect(c.x - 2, c.y - 12, 2, 14);
    g.fillStyle(WAX, 1); g.fillCircle(c.x, c.y - 13, 3);
  }
  stencilEye(g, W / 2, top + 14, 6, 0xd8d0b8, 0.25);
}

/** A crack in the air: a jagged violet slit opening across the axis, star specks leaking out. */
function crack(g: G, x: number, y: number, a: number, k: number, time: number): void {
  const len = 10 + k * 34;
  const cx = Math.cos(a), cy = Math.sin(a);
  glow(g, x, y - 16, 10 + k * 22, BOTH, 0.08, 3);
  g.lineStyle(3, BOTH_DARK, 0.9);
  g.beginPath();
  for (let i = 0; i <= 6; i++) {
    const f = i / 6 - 0.5, j = (i % 2 ? 1 : -1) * 4 * k;
    const px = x + cx * len * f - cy * j, py = y - 16 + cy * len * f + cx * j;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  g.lineStyle(1.2, BOTH_LIT, 0.9); g.lineBetween(x - cx * len * 0.4, y - 16 - cy * len * 0.4, x + cx * len * 0.4, y - 16 + cy * len * 0.4);
  for (let i = 0; i < 5; i++) {
    const ph = ((time / 500) + i / 5) % 1;
    g.fillStyle(0xffffff, 0.8 * (1 - ph)); g.fillCircle(x + Math.sin(i * 7.1) * 18 * ph, y - 16 - ph * 20 + Math.cos(i * 3.3) * 6, 1.4);
  }
}

/** A particle (sign 1) or antiparticle (sign −1): a bright bead with orbiting specks and its sign. */
function mote(g: G, x: number, y: number, time: number, col: number, sign: 1 | -1): void {
  glow(g, x, y, 20, col, 0.08, 3);
  for (let k = 0; k < 3; k++) {
    const a = (time / 170) * sign + k * 2.094;
    const ox = Math.cos(a) * 15, oy = Math.sin(a) * 6;
    if (oy < 0) { g.fillStyle(lit(col, 0.5), 0.7); g.fillCircle(x + ox, y + oy, 1.8); }
  }
  g.fillStyle(dim(col, 0.45), 1); g.fillCircle(x, y, 10);
  g.fillStyle(col, 1); g.fillCircle(x, y, 7.5);
  g.fillStyle(lit(col, 0.65), 1); g.fillCircle(x - 2.5, y - 2.5, 3);
  g.lineStyle(2, dim(col, 0.7), 1); g.lineBetween(x - 4, y + 1, x + 4, y + 1);
  if (sign > 0) g.lineBetween(x, y - 3, x, y + 5);
  for (let k = 0; k < 3; k++) {
    const a = (time / 170) * sign + k * 2.094;
    const ox = Math.cos(a) * 15, oy = Math.sin(a) * 6;
    if (oy >= 0) { g.fillStyle(lit(col, 0.5), 1); g.fillCircle(x + ox, y + oy, 1.8); }
  }
}

/** Prowse's stake-meter in the lot's corner: a twin-needled meter on a pole, ticking with what is out. */
function stakeMeter(g: G, x: number, y: number, n: number, time: number): void {
  shadow(g, x, y + 2, 26, 8);
  g.fillStyle(IRON, 1); g.fillRect(x - 2, y - 40, 4, 40);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 2, y - 40, 1, 40);
  doubleMeter(g, x, y - 36, 1.5);
  const sw = Math.min(1, n / 5);
  const a = Math.PI * 1.2 + sw * Math.PI * 0.6 + Math.sin(time / 90) * 0.04 * n;
  g.lineStyle(1.4, WAX, 1); g.lineBetween(x, y - 55.5, x + Math.cos(a) * 7, y - 55.5 + Math.sin(a) * 7);
}

export const FALLEN_NOTHING: GimmickDef = {
  id: ID,
  rules: 'Pairs bloom from nothing, fly apart and rush back to annihilate. Strike one away: its orphan hunts your foe. Their thread zaps.',
  make,
};
