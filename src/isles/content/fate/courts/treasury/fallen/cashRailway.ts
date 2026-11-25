import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { clerksDesk, coinFlat } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, CARD_RED, GOLD_LIT, IRON_DARK, LAMP_GLOW, LAMP_GREEN, PAPER, TIMBER, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * The Cash Railway — Head Cashier Euphrasia Trundle, in the King's telling the woman who ran
 * Counting-House Row's overhead wires and knew, by the twang of a cup, whose wages were short.
 *
 * Six tellers' desks stand round the yard, each under a brass standard, and from each standard
 * one taut wire runs to one other desk (a fixed network: the wires cross the yard, and the arrows
 * say which way they run). A desk struck fires its spring-gun: the wire glows, then a hanging
 * cash-cup races along it at head height, clipping whoever it passes; when it reaches the far desk
 * the till there bangs open with a shock that throws and stuns everyone round that desk.
 *
 * Trundle's office sends a cup on a clock — always from the desk whose wire ends at the desk
 * nearest you. The exploit is the network itself: learn which desk feeds which, and strike the
 * one that feeds the desk she is loitering by. Halfway down she restrings the row and every wire
 * runs the other way, and the office sends faster.
 */

const ID = fallenId('treasury', 'cash-railway');
/** The six desks, round the yard. */
const DESKS: Pt[] = [
  { x: 130, y: 196 }, { x: 480, y: 170 }, { x: 830, y: 196 },
  { x: 830, y: 572 }, { x: 480, y: 596 }, { x: 130, y: 572 },
];
/** Who each desk sends to (index → index); the second set is the restrung network. */
const WIRES_A = [3, 5, 4, 1, 0, 2];
const WIRES_B = [4, 3, 5, 0, 2, 1];
const POST_H = 74;
const COCK_MS = 620;
const CUP_SPEED = 330;
const CLIP_R = 28;
const CLIP_DMG = 9;
const TILL_R = 96;
const TILL_DMG = 15;
const TILL_STUN = 650;
const DESK_CD = 1500;

/** A cup cocked or in flight from one desk to another. */
interface Cup { from: number; to: number; firesAt: number; arriveAt: number; clipped: Set<Fighter>; by: 'player' | 'npc' | 'office' }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const cups: Cup[] = [];
  const lastSent = DESKS.map(() => -9999);
  const bangAt = DESKS.map(() => -9999);
  let wires = WIRES_A;
  let restrung = false;
  let restrungAt = -9999;
  let nextOffice = 0;
  let started = false;

  const len = (a: number, b: number) => dist(DESKS[a].x, DESKS[a].y, DESKS[b].x, DESKS[b].y);
  const nearestDesk = (f: Fighter) => {
    let best = 0, bd = Infinity;
    DESKS.forEach((d, i) => { const k = dist(d.x, d.y, f.x, f.y); if (k < bd) { bd = k; best = i; } });
    return best;
  };
  const feeder = (to: number) => wires.indexOf(to);
  /** Where a cup is on the floor at `time` (the point beneath it), or null if not in flight. */
  function cupAt(c: Cup, time: number): Pt | null {
    if (time < c.firesAt || time > c.arriveAt) return null;
    const k = (time - c.firesAt) / Math.max(1, c.arriveAt - c.firesAt);
    const a = DESKS[c.from], b = DESKS[c.to];
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }

  function send(from: number, by: Cup['by'], time: number): void {
    if (time - lastSent[from] < DESK_CD) return;
    lastSent[from] = time;
    const to = wires[from];
    const firesAt = time + tk.warn(COCK_MS);
    cups.push({ from, to, firesAt, arriveAt: firesAt + (len(from, to) / CUP_SPEED) * 1000, clipped: new Set(), by });
    ctx.sfx('reload');
  }

  const targets: StrikeTarget[] = DESKS.map((d, i) => ctx.target({ x: d.x, y: d.y - 24, r: 30, passThrough: true, onStruck: (by) => send(i, by, ctx.scene.time.now) }));

  function bang(c: Cup, time: number): void {
    const d = DESKS[c.to];
    bangAt[c.to] = time;
    ctx.sfx('money'); ctx.sfx('hit-heavy');
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, d.x, d.y) > TILL_R) continue;
      ctx.hit(f, TILL_DMG, f.x, f.y);
      ctx.stun(f, TILL_STUN);
      const a = Math.atan2(f.y - d.y, f.x - d.x);
      ctx.nudge(f, Math.cos(a) * 46, Math.sin(a) * 46);
    }
  }

  /** Is this spot about to be hit: under a cup's path or round a desk a cup is bound for? */
  function danger(x: number, y: number, time: number): boolean {
    return cups.some((c) => {
      const d = DESKS[c.to];
      if (dist(x, y, d.x, d.y) < TILL_R + 30) return true;
      const a = DESKS[c.from];
      return time < c.arriveAt && segDist(x, y, a.x, a.y, d.x, d.y) < CLIP_R + 26;
    });
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextOffice = time + 2200; ctx.banner('THE CASH RAILWAY IS RUNNING', '#ffe27a'); }
      if (!restrung && alive(npc) && npc.hp < npc.maxHp * 0.5) {
        restrung = true; restrungAt = time; wires = WIRES_B;
        ctx.banner('RESTRUNG — EVERY WIRE RUNS BACK', '#ffcf8a'); ctx.sfx('chain');
      }
      // The office: a cup at the desk nearest you, from whichever desk feeds it.
      if (time >= nextOffice && alive(player)) {
        nextOffice = time + (restrung ? 2700 : 3500);
        const from = feeder(nearestDesk(player));
        if (from >= 0) send(from, 'office', time);
      }
      for (let i = cups.length - 1; i >= 0; i--) {
        const c = cups[i];
        const p = cupAt(c, time);
        if (p) {
          for (const f of [player, npc]) {
            if (!alive(f) || c.clipped.has(f) || dist(f.x, f.y, p.x, p.y) > CLIP_R + 18) continue;
            c.clipped.add(f);
            ctx.hit(f, CLIP_DMG, p.x, p.y);
            const a = DESKS[c.from], b = DESKS[c.to];
            const nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny) || 1;
            const side = (f.x - p.x) * nx + (f.y - p.y) * ny >= 0 ? 1 : -1;
            ctx.nudge(f, (nx / nl) * 38 * side, (ny / nl) * 38 * side);
            ctx.sfx('clang');
          }
        }
        if (time >= c.arriveAt) { bang(c, time); cups.splice(i, 1); }
      }
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      // Strike the desk that feeds the desk you are nearest — unless a cup is already bound there.
      const target = nearestDesk(player);
      const from = feeder(target);
      const busy = cups.some((c) => c.to === target);
      if (from >= 0 && !busy && now - lastSent[from] > DESK_CD) {
        const d = DESKS[from];
        const p = { x: d.x + (d.x < W / 2 ? 46 : -46), y: d.y + (d.y < H / 2 ? 40 : -40) };
        if (!danger(p.x, p.y, now)) return p;
      }
      // Otherwise keep clear of every live wire and every bell, at range from you.
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + now * 0.0002;
        const x = clamp(player.x + Math.cos(a) * 250, 60, W - 60), y = clamp(player.y + Math.sin(a) * 200, top + 50, H - 50);
        if (!danger(x, y, now)) return { x, y };
      }
      return null;
    },

    drawGround(g, time) {
      // The wires' shadows on the floor, with chevrons for the way they run.
      wires.forEach((to, from) => {
        const a = DESKS[from], b = DESKS[to];
        const live = cups.some((c) => c.from === from && time < c.arriveAt);
        const ang = Math.atan2(b.y - a.y, b.x - a.x), L = len(from, to);
        g.lineStyle(live ? 3 : 1.5, live ? CARD_RED : IRON_DARK, live ? 0.5 : 0.28); g.lineBetween(a.x, a.y, b.x, b.y);
        for (let s = 60; s < L - 60; s += 70) {
          const cx = a.x + Math.cos(ang) * s, cy = a.y + Math.sin(ang) * s;
          const pl = (time / 400 + s / 70) % 1;
          g.fillStyle(live ? CARD_RED : BRASS_DARK, live ? 0.4 + pl * 0.4 : 0.25);
          g.fillTriangle(cx + Math.cos(ang) * 7, cy + Math.sin(ang) * 7, cx + Math.cos(ang + 2.5) * 6, cy + Math.sin(ang + 2.5) * 6, cx + Math.cos(ang - 2.5) * 6, cy + Math.sin(ang - 2.5) * 6);
        }
      });
      // Bells: a ring closing in on any desk a cup is bound for — gone when it bangs.
      for (const c of cups) {
        const d = DESKS[c.to];
        const k = clamp((time - (c.firesAt - tk.warn(COCK_MS))) / Math.max(1, c.arriveAt - c.firesAt + tk.warn(COCK_MS)), 0, 1);
        g.fillStyle(CARD_RED, 0.08 + k * 0.16); g.fillCircle(d.x, d.y, TILL_R);
        g.lineStyle(2 + k * 2, CARD_RED, 0.45 + k * 0.5); g.strokeCircle(d.x, d.y, TILL_R);
        g.lineStyle(2, GOLD_LIT, 0.7); g.strokeCircle(d.x, d.y, TILL_R * (1 - k) + 8);
      }
      for (let i = 0; i < DESKS.length; i++) {
        const since = time - bangAt[i];
        if (since < 520) { const k = since / 520; g.lineStyle(5 * (1 - k), GOLD_LIT, 1 - k); g.strokeCircle(DESKS[i].x, DESKS[i].y, 30 + k * TILL_R); }
      }
    },

    drawAir(g, time) {
      // Each desk under its standard: a turned brass post, a spring-gun, a pulley head.
      DESKS.forEach((d, i) => {
        deskStation(g, d.x, d.y, time - lastSent[i], time - bangAt[i]);
      });
      // The wires, up at the pulley heads.
      wires.forEach((to, from) => {
        const a = DESKS[from], b = DESKS[to];
        const cock = cups.find((c) => c.from === from && time < c.firesAt);
        const hum = cock ? 0.5 + 0.5 * Math.sin(time / 30) : 0;
        g.lineStyle(1.6, BRASS_DARK, 0.85); g.lineBetween(a.x, a.y - POST_H, b.x, b.y - POST_H);
        if (cock) { g.lineStyle(3, GOLD_LIT, 0.3 + hum * 0.5); g.lineBetween(a.x, a.y - POST_H, b.x, b.y - POST_H); }
      });
      // The cups: a little wheeled carrier on the wire, the turned-wood cup hanging under it.
      for (const c of cups) {
        const p = cupAt(c, time);
        if (!p) continue;
        shadow(g, p.x, p.y + 4, 34, 10, 0.4);
        cashCup(g, p.x, p.y - POST_H, time);
        g.lineStyle(2, GOLD_LIT, 0.35);
        const a = DESKS[c.from];
        const ang = Math.atan2(p.y - a.y, p.x - a.x);
        g.lineBetween(p.x - Math.cos(ang) * 30, p.y - POST_H + 26 - Math.sin(ang) * 30, p.x - Math.cos(ang) * 8, p.y - POST_H + 26 - Math.sin(ang) * 8);
      }
      if (time - restrungAt < 1600) glow(g, W / 2, H / 2, 220, GOLD_LIT, 0.05 * (1 - (time - restrungAt) / 1600), 3);
    },

    drawHud(g, time) {
      // A clerk's plan of the network, top right: six dots, the arrows, the next cup's fuse.
      const ox = W - 136, oy = top + 8, sx = 0.12, sy = 0.1;
      g.fillStyle(PAPER, 0.88); g.fillRect(ox, oy, 124, 62);
      g.lineStyle(1, BRASS_DARK, 1); g.strokeRect(ox, oy, 124, 62);
      const pt = (i: number) => ({ x: ox + 6 + DESKS[i].x * sx, y: oy + 2 + (DESKS[i].y - top + 60) * sy });
      wires.forEach((to, from) => {
        const a = pt(from), b = pt(to);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        g.lineStyle(1, 0x2a5a3c, 0.9); g.lineBetween(a.x, a.y, b.x, b.y);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        g.fillStyle(CARD_RED, 1);
        g.fillTriangle(mx + Math.cos(ang) * 4, my + Math.sin(ang) * 4, mx + Math.cos(ang + 2.4) * 3.5, my + Math.sin(ang + 2.4) * 3.5, mx + Math.cos(ang - 2.4) * 3.5, my + Math.sin(ang - 2.4) * 3.5);
      });
      for (let i = 0; i < DESKS.length; i++) {
        const p = pt(i);
        const bound = cups.some((c) => c.to === i);
        g.fillStyle(bound ? CARD_RED : BRASS, 1); g.fillCircle(p.x, p.y, 3.4);
      }
      const yourDesk = pt(nearestDesk(player));
      g.lineStyle(1.2, LAMP_GREEN, 1); g.strokeCircle(yourDesk.x, yourDesk.y, 6);
      // The office fuse.
      const left = clamp((nextOffice - time) / (restrung ? 2700 : 3500), 0, 1);
      g.fillStyle(IRON_DARK, 0.7); g.fillRect(ox, oy + 66, 124, 5);
      g.fillStyle(CARD_RED, 0.9); g.fillRect(ox, oy + 66, 124 * (1 - left), 5);
    },

    destroy() { for (const t of targets) t.remove(); },
  };
}

/** A teller's station: the green-lamp desk, a turned brass standard, its spring-gun and pulley. */
function deskStation(g: G, x: number, y: number, sinceSent: number, sinceBang: number): void {
  clerksDesk(g, x, y);
  const px = x + 30;
  g.fillStyle(BRASS_DARK, 1); g.fillRect(px - 2.5, y - POST_H, 5, POST_H - 30);
  g.fillStyle(BRASS_LIT, 1); g.fillRect(px - 2.5, y - POST_H, 1.5, POST_H - 30);
  for (const ky of [y - 44, y - 60]) { g.fillStyle(BRASS, 1); g.fillEllipse(px, ky, 9, 4); }
  // Pulley head and the spring-gun's cocking lever (thrown back when it fires).
  g.fillStyle(IRON_DARK, 1); g.fillCircle(px, y - POST_H, 6);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(px, y - POST_H, 2.4);
  const throwK = clamp(sinceSent / 300, 0, 1);
  const la = -0.4 - (sinceSent < 300 ? (1 - throwK) * 1.1 : 0);
  g.lineStyle(2.4, TIMBER_DARK, 1); g.lineBetween(px, y - POST_H + 10, px + Math.cos(la) * 18, y - POST_H + 10 + Math.sin(la) * 18);
  g.fillStyle(TIMBER, 1); g.fillCircle(px + Math.cos(la) * 18, y - POST_H + 10 + Math.sin(la) * 18, 3);
  // The till drawer on the desk front — jumps open on a bang, coins leaping out.
  const open = sinceBang < 500 ? 1 - sinceBang / 500 : 0;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 14, y - 26 + open * 6, 28, 8);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 14, y - 26 + open * 6, 28, 1.5);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y - 22 + open * 6, 1.6);
  if (open > 0) for (let k = 0; k < 4; k++) coinFlat(g, x - 12 + k * 8, y - 34 - open * (12 + k * 5), 3);
  glow(g, x - 6, y - 46, 18, LAMP_GLOW, 0.05, 2);
}

/** The cash-cup: a carrier with two grooved wheels on the wire, a turned wooden cup with a brass lid hung below. */
function cashCup(g: G, x: number, y: number, time: number): void {
  const spin = time / 40;
  for (const dx of [-7, 7]) {
    g.fillStyle(IRON_DARK, 1); g.fillCircle(x + dx, y, 4.2);
    g.lineStyle(1, BRASS_LIT, 1); g.lineBetween(x + dx + Math.cos(spin) * 3, y + Math.sin(spin) * 3, x + dx - Math.cos(spin) * 3, y - Math.sin(spin) * 3);
  }
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 10, y + 2, 20, 4);
  g.lineStyle(1.6, BRASS, 1); g.lineBetween(x, y + 6, x, y + 16);
  g.fillStyle(BRASS_LIT, 1); g.fillEllipse(x, y + 17, 18, 5);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 8, y + 18, 16, 10);
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x, y + 28, 16, 6);
  g.fillStyle(TIMBER_LIT, 0.7); g.fillRect(x - 6, y + 19, 3, 8);
  g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(x - 8, y + 23, x + 8, y + 23);
}

export const FALLEN_CASH_RAILWAY: GimmickDef = {
  id: ID,
  rules: 'Strike a desk to send a cup down its wire: it clips heads, and the far desk\'s till bangs open. Learn which desk feeds which — feed hers.',
  make,
};
