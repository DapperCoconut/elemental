import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { brandSigil, dim, lit } from '../../../../../art/IsleArt';
import { OBS, slab } from '../../../../../art/PinnacleArt';
import { EMB } from '../art';
import { type Who, alive, clamp, dist, other, side, stepDt, wrapAngle } from './util';

/**
 * Decree of the Sealed Writ — Councilor Prudence Wick, Seat of the Seal.
 *
 * Wick sealed every writ the Brand was served by ("a writ under seal is not a letter, it is a
 * sentence") and appointed Prince Tallow, who loved a candle and never read what he lit it to
 * sign. Her press stands at the head of the floor and serves writs, turn and turn about:
 *
 *  - A writ — folded vellum under a disc of hot red sealing wax — leaves the press addressed to
 *    one fighter and flies at them, turning to follow.
 *  - Strike it (any blow: a shot, a swing, an AoE) when it is addressed to YOU and it is
 *    RETURNED TO SENDER: re-addressed, turned round and faster, one more layer of wax on it.
 *  - If it reaches its addressee they are SEALED: held fast a moment, silenced (basic attack only)
 *    and burnt — all of it worse the more times the writ was returned. Dodge it long enough and
 *    the wax sets and it drops.
 *
 * A perfected Wax bot's stingers reach far and its bees hunt anything moving: it swats writs.
 * It steps up to meet one addressed to it, at stinger's length. A clever player turns the rally
 * into a weapon — returns it late, close, from the side — and makes the sixth return his.
 */

const SPEED = 150;
const SPEED_PER = 34;
const SPEED_CAP = 380;
const LIFE_MS = 7000;
const GAP_MS = 2000;
const PRESS_MS = 1000;
const REACH = 28;

interface Writ { x: number; y: number; a: number; to: Who; returns: number; lastAt: number; retAt: number; target: StrikeTarget }
interface Dropped { x: number; y: number; at: number; returns: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const TURN = ctx.hard ? 2.6 : 2.15;
  const px = W / 2, py = top + 46;
  let writ: Writ | null = null;
  let next: Who = 'player';
  let pressAt = 0;
  let pressing = false;
  let started = false;
  let dropped: Dropped[] = [];
  const sealedUntil: Record<Who, number> = { player: 0, npc: 0 };
  const sealedReturns: Record<Who, number> = { player: 0, npc: 0 };
  let best = 0;

  const speedOf = (r: number) => Math.min(SPEED_CAP, SPEED * (ctx.hard ? 1.12 : 1) + SPEED_PER * r);

  function serveWrit(time: number): void {
    const f = side(ctx, next);
    const a = Math.atan2(f.y - py, f.x - px);
    const w: Writ = { x: px, y: py + 30, a, to: next, returns: 0, lastAt: time, retAt: -9999, target: null as unknown as StrikeTarget };
    w.target = ctx.target({ x: w.x, y: w.y, r: 20, onStruck: (by) => strike(w, by) });
    writ = w;
    ctx.float(px, py + 40, next === 'player' ? 'SERVED ON THE CHALLENGER' : 'SERVED ON THE COUNCILOR', '#ffd8c8');
    ctx.sfx('hammer-forge');
    next = other(next);
  }

  function strike(w: Writ, by: Who): void {
    const now = ctx.scene.time.now;
    if (writ !== w || by !== w.to || now - w.retAt < 220) return;
    w.retAt = now;
    w.lastAt = now;
    w.returns++;
    best = Math.max(best, w.returns);
    w.to = other(w.to);
    const t = side(ctx, w.to);
    w.a = Math.atan2(t.y - w.y, t.x - w.x);
    ctx.flash(w.x, w.y, EMB.waxLit);
    ctx.sfx('snap-back');
    ctx.float(w.x, w.y - 26, w.returns === 1 ? 'RETURNED TO SENDER' : `RETURNED ×${w.returns}`, '#ffb8a0');
    if (w.returns === 5) ctx.banner('FIVE RETURNS — THE WAX RUNS HOT', '#ff8a6a');
  }

  function resolve(time: number, served: boolean): void {
    if (!writ) return;
    writ.target.remove();
    if (!served) {
      dropped.push({ x: writ.x, y: writ.y, at: time, returns: writ.returns });
      ctx.float(writ.x, writ.y - 20, 'THE WAX HAS SET', '#d8c8a0');
    }
    writ = null;
    pressAt = time + GAP_MS;
    pressing = false;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; pressAt = time + 1800; }
      if (!writ) {
        if (!pressing && time >= pressAt) { pressing = true; pressAt = time + ctx.tk.warn(PRESS_MS); ctx.sfx('gear-turn'); }
        else if (pressing && time >= pressAt) { pressing = false; serveWrit(time); }
        return;
      }
      const w = writ;
      const t = side(ctx, w.to);
      if (!alive(t)) { resolve(time, false); return; }
      // Fly at the addressee, turning no faster than the wax allows.
      const want = Math.atan2(t.y - w.y, t.x - w.x);
      const d = wrapAngle(want - w.a);
      w.a += clamp(d, -TURN * dt, TURN * dt);
      const sp = speedOf(w.returns);
      w.x = clamp(w.x + Math.cos(w.a) * sp * dt, 24, W - 24);
      w.y = clamp(w.y + Math.sin(w.a) * sp * dt, top + 20, H - 20);
      w.target.moveTo(w.x, w.y);
      if (!ctx.isAirborne(t) && dist(w.x, w.y, t.x, t.y) < REACH) {
        const r = w.returns;
        ctx.root(t, 1000);
        ctx.silence(t, Math.min(4200, 2000 + 300 * r));
        ctx.hit(t, Math.min(30, 8 + 4 * r), t.x, t.y);
        sealedUntil[w.to] = time + Math.min(4200, 2000 + 300 * r);
        sealedReturns[w.to] = r;
        ctx.float(t.x, t.y - 54, 'SEALED', '#ff8a6a');
        ctx.flash(t.x, t.y, EMB.wax);
        ctx.sfx('anvil');
        resolve(time, true);
        return;
      }
      if (time - w.lastAt > LIFE_MS) resolve(time, false);
      dropped = dropped.filter((x) => time - x.at < 1800);
    },

    npcSeek() {
      const n = ctx.npc;
      if (!alive(n) || !writ) return null;
      if (writ.to === 'npc') {
        // Meet it at stinger's length, square on.
        const d = dist(writ.x, writ.y, n.x, n.y) || 1;
        const k = 130 / d;
        return { x: clamp(writ.x + (n.x - writ.x) * k, 60, W - 60), y: clamp(writ.y + (n.y - writ.y) * k, top + 60, H - 50) };
      }
      return null;
    },

    drawGround(g, time) {
      drawPress(g, time);
      for (const dr of dropped) {
        const k = (time - dr.at) / 1800;
        g.fillStyle(EMB.wax, 0.7 * (1 - k)); g.fillEllipse(dr.x, dr.y + 6, 26 + dr.returns * 3, 12 + dr.returns);
        g.fillStyle(EMB.vellum, 0.6 * (1 - k)); g.fillRect(dr.x - 14, dr.y - 4, 28, 14);
      }
      // The writ's shadow and its addressee's ring.
      if (writ) {
        const t = side(ctx, writ.to);
        g.fillStyle(0x000000, 0.3); g.fillEllipse(writ.x, writ.y + 22, 30, 10);
        const c = writ.to === 'player' ? 0xffd27a : OBS.seamLit;
        g.lineStyle(2, c, 0.35 + 0.25 * Math.sin(time / 90)); g.strokeCircle(t.x, t.y, 30);
        // The address, written along the floor as a dotted line.
        const dd = dist(writ.x, writ.y, t.x, t.y);
        const n = Math.floor(dd / 18);
        for (let i = 1; i < n; i++) {
          const f = i / n;
          g.fillStyle(c, 0.25); g.fillCircle(writ.x + (t.x - writ.x) * f, writ.y + (t.y - writ.y) * f, 1.6);
        }
      }
    },

    drawAir(g, time) {
      if (writ) drawWrit(g, writ, time);
      // A sealed fighter wears the seal: a disc of red wax over the head, dripping.
      for (const w of ['player', 'npc'] as Who[]) {
        if (time >= sealedUntil[w]) continue;
        const f = side(ctx, w);
        if (!alive(f)) continue;
        const left = (sealedUntil[w] - time) / (2000 + 300 * sealedReturns[w]);
        const r = 11 + sealedReturns[w] * 1.2;
        const x = f.x, y = f.y - 38;
        g.fillStyle(dim(EMB.wax, 0.3), 1); g.fillCircle(x, y + 1.5, r + 2);
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.fillStyle(EMB.wax, 1); g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, 3.2); }
        g.fillStyle(EMB.wax, 1); g.fillCircle(x, y, r);
        brandSigil(g, x, y, r * 0.5, dim(EMB.wax, 0.45), 1);
        g.fillStyle(0xffffff, 0.3); g.fillEllipse(x - r * 0.35, y - r * 0.4, r * 0.6, r * 0.3);
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 900) + i / 3) % 1;
          g.fillStyle(EMB.wax, 0.9 * left); g.fillCircle(x - 6 + i * 6, y + r + ph * 22, 2.2);
        }
        g.lineStyle(2, EMB.waxLit, 0.8); g.beginPath(); g.arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      }
    },

    drawHud(g) {
      if (!writ && best === 0) return;
      const cx = W / 2, y = top + 14;
      const r = writ ? writ.returns : 0;
      g.fillStyle(OBS.glass, 0.88); g.fillRoundedRect(cx - 80, y - 8, 160, 22, 8);
      g.lineStyle(1, OBS.edge, 0.6); g.strokeRoundedRect(cx - 80, y - 8, 160, 22, 8);
      for (let i = 0; i < 8; i++) {
        const x = cx - 62 + i * 18;
        g.fillStyle(i < r ? EMB.waxLit : dim(EMB.wax, 0.6), i < r ? 1 : 0.5); g.fillCircle(x, y + 3, 5);
      }
      // The best rally of the fight, as a tick on the row.
      if (best > 0) { const x = cx - 62 + (Math.min(8, best) - 1) * 18; g.lineStyle(1.5, EMB.vellum, 0.9); g.strokeCircle(x, y + 3, 7.5); }
    },

    destroy() { writ?.target.remove(); writ = null; },
  };

  /** The signet press at the head of the floor: two glass columns, a screw, the platen, the wax pot. */
  function drawPress(g: Phaser.GameObjects.Graphics, time: number): void {
    const k = pressing ? clamp(1 - (pressAt - time) / ctx.tk.warn(PRESS_MS), 0, 1) : 0;
    const drop = Math.sin(k * Math.PI) * 18;
    g.fillStyle(0x000000, 0.35); g.fillEllipse(px, py + 34, 170, 26);
    // The wax pot under the platen, ember-hot.
    g.fillStyle(OBS.glass, 1); g.fillEllipse(px, py + 30, 70, 20);
    g.fillStyle(EMB.wax, 1); g.fillEllipse(px, py + 29, 58, 14);
    g.fillStyle(EMB.waxLit, 0.5 + 0.3 * Math.sin(time / 300)); g.fillEllipse(px - 6, py + 27, 26, 5);
    // Columns.
    for (const d of [-1, 1]) slab(g, px + d * 64, py + 36, 22, 70);
    slab(g, px, py - 26, 160, 18);
    // The screw, turning.
    for (let i = 0; i < 5; i++) {
      const yy = py - 20 + i * 6 + ((time / 80) % 6);
      g.lineStyle(1.4, OBS.edge, 0.55); g.lineBetween(px - 7, yy, px + 7, yy + 3);
    }
    g.lineStyle(4, OBS.facet, 1); g.lineBetween(px, py - 22, px, py + drop - 2);
    // The platen with the Brand cut in it.
    g.fillStyle(OBS.sheen, 1); g.fillRect(px - 26, py + drop - 4, 52, 12);
    g.lineStyle(1, OBS.edge, 0.7); g.strokeRect(px - 26, py + drop - 4, 52, 12);
    brandSigil(g, px, py + drop + 2, 4, pressing ? lit(EMB.ember, k * 0.5) : dim(EMB.ember, 0.3), 1);
    if (pressing) { g.lineStyle(2, EMB.waxLit, k); g.strokeCircle(px, py + 30, 22 + (1 - k) * 30); }
  }

  /** A writ in flight: folded vellum along its heading, the wax seal fat with every return. */
  function drawWrit(g: Phaser.GameObjects.Graphics, w: Writ, time: number): void {
    const ca = Math.cos(w.a), sa = Math.sin(w.a);
    const rot = (dx: number, dy: number) => ({ x: w.x + dx * ca - dy * sa, y: w.y + dx * sa + dy * ca });
    // Speed lines and wax drips behind.
    const sp = speedOf(w.returns);
    for (let i = 1; i <= 4; i++) {
      const b = rot(-14 - i * 10 * (sp / 200), (i % 2 ? 6 : -6));
      g.lineStyle(1.2, EMB.vellum, 0.35 - i * 0.07); g.lineBetween(b.x, b.y, b.x - ca * 12, b.y - sa * 12);
    }
    // The letter.
    const c = [rot(-18, -12), rot(18, -12), rot(18, 12), rot(-18, 12)];
    g.fillStyle(dim(EMB.vellum, 0.3), 1); g.fillTriangle(c[0].x, c[0].y + 2, c[1].x, c[1].y + 2, c[2].x, c[2].y + 2); g.fillTriangle(c[0].x, c[0].y + 2, c[2].x, c[2].y + 2, c[3].x, c[3].y + 2);
    g.fillStyle(EMB.vellum, 1); g.fillTriangle(c[0].x, c[0].y, c[1].x, c[1].y, c[2].x, c[2].y); g.fillTriangle(c[0].x, c[0].y, c[2].x, c[2].y, c[3].x, c[3].y);
    const m = rot(0, 0);
    g.lineStyle(1, dim(EMB.vellum, 0.4), 1); g.lineBetween(c[0].x, c[0].y, m.x, m.y); g.lineBetween(c[3].x, c[3].y, m.x, m.y);
    for (let i = -1; i <= 1; i++) { const a = rot(4, i * 5), b = rot(15, i * 5); g.lineStyle(1, 0x5a4a3a, 0.5); g.lineBetween(a.x, a.y, b.x, b.y); }
    // Ribbon tails under the seal.
    const t1 = rot(-4, 4), t2 = rot(-14, 16 + Math.sin(time / 80) * 3), t3 = rot(4, 18 + Math.cos(time / 90) * 3);
    g.lineStyle(3, EMB.wax, 1); g.lineBetween(t1.x, t1.y, t2.x, t2.y); g.lineBetween(t1.x, t1.y, t3.x, t3.y);
    // The seal.
    const r = 9 + w.returns * 1.4;
    g.fillStyle(dim(EMB.wax, 0.35), 1); g.fillCircle(m.x, m.y + 1.5, r + 1.5);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + w.returns; g.fillStyle(EMB.wax, 1); g.fillCircle(m.x + Math.cos(a) * r * 0.9, m.y + Math.sin(a) * r * 0.9, 2.6 + w.returns * 0.2); }
    g.fillStyle(EMB.wax, 1); g.fillCircle(m.x, m.y, r);
    brandSigil(g, m.x, m.y, r * 0.48, dim(EMB.wax, 0.5), 1);
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(m.x - r * 0.3, m.y - r * 0.4, r * 0.7, r * 0.3);
    // Each return is a ring of fresh wax round the rim.
    for (let i = 0; i < w.returns; i++) { g.lineStyle(1, EMB.waxLit, 0.7); g.strokeCircle(m.x, m.y, r + 3 + i * 2.2); }
    // Hot: it steams as it gets fast.
    if (w.returns >= 3) for (let i = 0; i < 3; i++) { const ph = ((time / 400) + i / 3) % 1; g.fillStyle(0xffffff, 0.2 * (1 - ph)); g.fillCircle(m.x - ca * ph * 20, m.y - 8 - ph * 16, 4 + ph * 6); }
  }
}

export const SEALED_WRIT: GimmickDef = {
  id: 'bench-fire-sealed-writ',
  rules: 'Writs shall be served: a sealed writ seeks its addressee. Strike yours to return it, faster; reached, you are held, silenced and burnt.',
  make,
};
