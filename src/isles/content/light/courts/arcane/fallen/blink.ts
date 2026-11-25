import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { rune } from '../art';
import { CHALK, CHALK_DIM, MANA, MANA_DEEP, MANA_LIT, ROBE, SCORCH, SIDE_NPC } from '../palette';
import { alive, clamp, dist } from '../util';
import { dashedRing, pastHalf, progressArc, slatePlate } from './common';

/**
 * Translocation — Blink-Lector Evander Sallowmere, who taught the Academy's first-years to step
 * through a chalked circle and out of another.
 *
 * Seven blink-runes are chalked across the floor. Every few seconds the lector blinks — always to
 * the sound rune nearest *you*. The rune he is coming to lights first: it brightens, his outline
 * gathers in it, and the ring of his arrival is chalked round it. When he lands, that ring bursts.
 *
 * Step out of the ring. Or strike the lit rune before he lands: a scuffed rune is a bad door, and
 * he comes through it wrong — stunned, torn, and no burst. Strike a rune that is not lit and it is
 * simply scuffed shut, so he must arrive somewhere else (he re-chalks it if he can reach it, and
 * chalk mends itself in time). Past half he blinks twice running.
 */

const SLUG = 'blink';
const RUNE_R = 30;
const BURST_R = 95;
const LIGHT_MS = 1100;
const CHAIN_LIGHT_MS = 950;
const BLINK_MS = 3700;
const BLINK_HALF_MS = 3200;
const BURST = 14;
const MISFIRE = 18;
const MISFIRE_STUN = 1400;
const MEND_MS = 8000;

interface BlinkRune { x: number; y: number; scuffedAt: number; target: StrikeTarget | null }
interface Fx { x: number; y: number; at: number; kind: 'leave' | 'burst' | 'misfire' }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const mid = top + (H - top) / 2;
  const now = (): number => ctx.scene.time.now;
  const runes: BlinkRune[] = [
    { x: 170, y: top + 110 }, { x: W / 2, y: top + 92 }, { x: W - 170, y: top + 110 },
    { x: W / 2, y: mid + 10 },
    { x: 170, y: H - 86 }, { x: W / 2, y: H - 70 }, { x: W - 170, y: H - 86 },
  ].map((p) => ({ ...p, scuffedAt: -1, target: null }));
  let lit_: number = -1;
  let litAt = 0;
  let litMs = LIGHT_MS;
  let chained = false;
  let nextBlink = 2600;
  let fx: Fx[] = [];
  let turned = false;

  const scuffed = (r: BlinkRune): boolean => r.scuffedAt >= 0;

  runes.forEach((r) => {
    r.target = ctx.target({
      x: r.x, y: r.y, r: RUNE_R, passThrough: true,
      onStruck: (by) => {
        if (by === 'player') { if (!scuffed(r)) ctx.sfx('glitch'); r.scuffedAt = now(); }
        else if (scuffed(r)) { r.scuffedAt = -1; ctx.sfx('sparkle'); }
      },
    });
  });

  /** The sound rune nearest the player that he is not already standing on. */
  function pick(exclude: number): number {
    let best = -1, bd = Infinity;
    runes.forEach((r, i) => {
      if (i === exclude || scuffed(r) || dist(r.x, r.y, npc.x, npc.y) < 110) return;
      const d = dist(r.x, r.y, player.x, player.y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  function light(i: number, time: number, ms: number): void {
    lit_ = i; litAt = time; litMs = ms;
    ctx.sfx('beam-charge');
  }

  function arrive(time: number): void {
    const r = runes[lit_];
    fx.push({ x: npc.x, y: npc.y, at: time, kind: 'leave' });
    ctx.nudge(npc, r.x - npc.x, r.y - npc.y);
    const at = lit_;
    lit_ = -1;
    if (scuffed(r)) {
      r.scuffedAt = time;
      ctx.stun(npc, MISFIRE_STUN);
      ctx.hit(npc, MISFIRE, r.x, r.y);
      fx.push({ x: r.x, y: r.y, at: time, kind: 'misfire' });
      ctx.sfx('glitch'); ctx.sfx('explosion-small');
      chained = false;
      nextBlink = time + (turned ? BLINK_HALF_MS : BLINK_MS);
      return;
    }
    fx.push({ x: r.x, y: r.y, at: time, kind: 'burst' });
    ctx.sfx('teleport');
    if (alive(player) && !ctx.isAirborne(player)) {
      const d = dist(player.x, player.y, r.x, r.y);
      if (d < BURST_R) {
        tk.hitPlayer(BURST, player.x, player.y);
        const a = d > 1 ? Math.atan2(player.y - r.y, player.x - r.x) : 0;
        ctx.nudge(player, Math.cos(a) * 40, Math.sin(a) * 40);
      }
    }
    if (turned && !chained) {
      const next = pick(at);
      if (next >= 0) { chained = true; light(next, time, CHAIN_LIGHT_MS); return; }
    }
    chained = false;
    nextBlink = time + (turned ? BLINK_HALF_MS : BLINK_MS);
  }

  return {
    update(time) {
      if (!turned && pastHalf(npc)) { turned = true; ctx.banner('HE BLINKS TWICE', '#c8f4ff'); }
      for (const r of runes) if (scuffed(r) && time - r.scuffedAt > MEND_MS && runes.indexOf(r) !== lit_) r.scuffedAt = -1;
      if (!alive(npc) || !alive(player)) return;
      if (lit_ < 0 && time >= nextBlink) {
        const i = pick(-1);
        if (i >= 0) light(i, time, LIGHT_MS); else nextBlink = time + 900;
      }
      if (lit_ >= 0 && time - litAt >= litMs) arrive(time);
      fx = fx.filter((f) => time - f.at < 650);
    },

    npcSeek() {
      // Between blinks he mends a scuffed rune, if one lies well away from you.
      let best: BlinkRune | null = null, bd = Infinity;
      runes.forEach((r, i) => {
        if (!scuffed(r) || i === lit_ || dist(r.x, r.y, player.x, player.y) < 200) return;
        const d = dist(r.x, r.y, npc.x, npc.y);
        if (d < bd) { bd = d; best = r; }
      });
      const b = best as BlinkRune | null;
      return b ? { x: b.x, y: b.y } : null;
    },

    drawGround(g, time) {
      runes.forEach((r, i) => drawRune(g, r, i, time));
      if (lit_ >= 0) {
        const r = runes[lit_];
        const k = clamp((time - litAt) / litMs, 0, 1);
        g.fillStyle(MANA, 0.05 + k * 0.12); g.fillCircle(r.x, r.y, BURST_R);
        dashedRing(g, r.x, r.y, BURST_R, scuffed(r) ? CHALK_DIM : MANA_LIT, 0.5 + k * 0.5, 2, 30, 1, -time / 600);
        progressArc(g, r.x, r.y, BURST_R + 5, k, MANA_LIT, 0.9, 3);
      }
      for (const f of fx) {
        const k = (time - f.at) / 650;
        if (f.kind === 'burst') {
          g.lineStyle(7 * (1 - k), MANA_LIT, 0.8 * (1 - k)); g.strokeCircle(f.x, f.y, 20 + k * (BURST_R - 10));
          g.lineStyle(2, MANA_DEEP, 0.6 * (1 - k)); g.strokeCircle(f.x, f.y, 10 + k * BURST_R * 0.7);
        } else if (f.kind === 'misfire') {
          // Torn through a bad door: chalk dust and a crackle that goes nowhere.
          for (let i = 0; i < 8; i++) {
            const a = i * 0.785 + f.x;
            g.fillStyle(CHALK, 0.5 * (1 - k)); g.fillCircle(f.x + Math.cos(a) * k * 50, f.y + Math.sin(a) * k * 30, 6 - k * 4);
          }
        }
      }
    },

    drawAir(g, time) {
      if (lit_ >= 0) {
        const r = runes[lit_];
        const k = clamp((time - litAt) / litMs, 0, 1);
        silhouette(g, r.x, r.y, k, time, scuffed(r));
        for (let i = 0; i < 8; i++) {
          const ph = ((time / 600 + i / 8) % 1);
          g.fillStyle(MANA_LIT, (1 - ph) * k); g.fillCircle(r.x + Math.sin(i * 2.4) * RUNE_R * 0.8, r.y - ph * 70, 1.6);
        }
      }
      for (const f of fx) {
        const k = (time - f.at) / 650;
        if (f.kind === 'leave') {
          // Where he was: shards of him folding away into a point.
          for (let i = 0; i < 10; i++) {
            const a = i * 0.63 + f.y;
            const r = 30 * (1 - k);
            const px = f.x + Math.cos(a) * r, py = f.y - 24 + Math.sin(a) * r * 1.3;
            g.fillStyle(i % 2 ? MANA_LIT : SIDE_NPC, 0.8 * (1 - k)); g.fillTriangle(px, py - 4, px + 3, py + 2, px - 3, py + 2);
          }
          glow(g, f.x, f.y - 24, 18 * (1 - k) + 2, MANA, 0.12, 2);
        } else if (f.kind === 'misfire') {
          g.lineStyle(2, MANA_LIT, 0.9 * (1 - k));
          for (let i = 0; i < 6; i++) {
            const a = i * 1.05 + time / 60;
            const x1 = f.x + Math.cos(a) * 10, y1 = f.y - 26 + Math.sin(a) * 10;
            g.lineBetween(x1, y1, x1 + Math.cos(a + 0.8) * 18, y1 + Math.sin(a + 0.8) * 18);
          }
        }
      }
    },

    drawHud(g, time) {
      const cx = W / 2, y = top + 4;
      slatePlate(g, cx, y, 210, 30);
      const yy = y + 15;
      runes.forEach((r, i) => {
        const x = cx - 84 + i * 20;
        if (i === lit_) { glow(g, x, yy, 9, MANA, 0.15, 2); g.fillStyle(MANA_LIT, 0.7 + Math.sin(time / 60) * 0.3); g.fillCircle(x, yy, 5); }
        else if (scuffed(r)) { g.lineStyle(2, CHALK_DIM, 0.8); g.lineBetween(x - 4, yy - 4, x + 4, yy + 4); g.lineBetween(x + 4, yy - 4, x - 4, yy + 4); }
        else { g.lineStyle(1.4, MANA, 0.9); g.strokeCircle(x, yy, 4.5); g.fillStyle(MANA, 0.5); g.fillCircle(x, yy, 1.8); }
      });
      const span = turned ? BLINK_HALF_MS : BLINK_MS;
      const k = lit_ >= 0 ? 1 : clamp(1 - (nextBlink - time) / span, 0, 1);
      const tx = cx + 76;
      g.lineStyle(1.2, CHALK_DIM, 0.6); g.strokeCircle(tx, yy, 9);
      progressArc(g, tx, yy, 9, k, lit_ >= 0 ? MANA_LIT : CHALK, 1, 2);
      blinkGlyph(g, tx, yy, 5, MANA_LIT, 0.9);
    },

    destroy() { for (const r of runes) r.target?.remove(); },
  };

  /** A blink-rune: a double chalk ring, the translocation glyph inside, runes round the rim. */
  function drawRune(g: G, r: BlinkRune, i: number, time: number): void {
    const isLit = i === lit_;
    const k = isLit ? clamp((time - litAt) / litMs, 0, 1) : 0;
    const bad = scuffed(r);
    g.fillStyle(SCORCH, 0.16); g.fillCircle(r.x, r.y, RUNE_R + 4);
    if (!bad) glow(g, r.x, r.y, RUNE_R, MANA, 0.03 + k * 0.08, 2);
    const ring = isLit ? lit(MANA, k * 0.6) : bad ? CHALK_DIM : CHALK;
    if (bad) {
      // A broken ring: only some arcs of it left.
      g.lineStyle(2, ring, 0.6);
      for (let s = 0; s < 6; s++) if (s % 3 !== 1) { g.beginPath(); g.arc(r.x, r.y, RUNE_R, s, s + 0.7, false); g.strokePath(); }
    } else {
      g.lineStyle(2, ring, 0.9); g.strokeCircle(r.x, r.y, RUNE_R);
      g.lineStyle(1, ring, 0.6); g.strokeCircle(r.x, r.y, RUNE_R - 6);
    }
    for (let j = 0; j < 6; j++) { const a = (j / 6) * Math.PI * 2 + i; rune(g, r.x + Math.cos(a) * (RUNE_R - 3), r.y + Math.sin(a) * (RUNE_R - 3), 2.6, j + i, ring, bad ? 0.3 : 0.7, 1); }
    blinkGlyph(g, r.x, r.y, 12, isLit ? MANA_LIT : bad ? CHALK_DIM : CHALK, bad ? 0.35 : 0.85);
    if (bad) {
      // The scuff: a palm's smear of chalk dragged across it.
      for (let s = 0; s < 4; s++) { g.lineStyle(5 - s, 0xe6e4e0, 0.22); g.lineBetween(r.x - 26 + s * 4, r.y + 14 - s * 3, r.x + 20 + s * 3, r.y - 16 + s * 2); }
    }
  }

  /** The translocation glyph: two small circles, an arrowed arc carrying one into the other. */
  function blinkGlyph(g: G, x: number, y: number, s: number, color: number, a: number): void {
    g.lineStyle(Math.max(1, s * 0.14), color, a);
    g.strokeCircle(x - s * 0.6, y + s * 0.2, s * 0.32);
    g.strokeCircle(x + s * 0.6, y + s * 0.2, s * 0.32);
    g.beginPath(); g.arc(x, y + s * 0.2, s * 0.6, Math.PI + 0.35, -0.35, false); g.strokePath();
    const hx = x + Math.cos(-0.35) * s * 0.6, hy = y + s * 0.2 + Math.sin(-0.35) * s * 0.6;
    g.lineBetween(hx, hy, hx - s * 0.28, hy - s * 0.1); g.lineBetween(hx, hy, hx - s * 0.05, hy - s * 0.3);
  }

  /** His outline gathering in the rune: hat, shoulders and robe in mana lines, filling as he comes. */
  function silhouette(g: G, x: number, y: number, k: number, time: number, bad: boolean): void {
    const jitter = bad ? Math.sin(time / 23) * 3 * k : 0;
    const c = bad ? dim(CHALK, 0.1) : MANA_LIT;
    const a = 0.25 + k * 0.7;
    const bx = x + jitter;
    g.fillStyle(bad ? CHALK_DIM : ROBE, 0.12 * k); g.fillTriangle(bx - 16, y, bx + 16, y, bx, y - 44);
    g.lineStyle(1.6, c, a);
    g.lineBetween(bx - 16, y, bx - 8, y - 30); g.lineBetween(bx + 16, y, bx + 8, y - 30);
    g.lineBetween(bx - 16, y, bx + 16, y);
    g.strokeCircle(bx, y - 36, 6);
    // The tall hat.
    g.lineBetween(bx - 10, y - 41, bx + 10, y - 41); g.lineBetween(bx - 6, y - 41, bx + 2, y - 60); g.lineBetween(bx + 6, y - 41, bx + 2, y - 60);
    if (k > 0.5) { g.fillStyle(0xffa040, (k - 0.5) * 2); g.fillCircle(bx - 2, y - 36, 1.3); g.fillCircle(bx + 2, y - 36, 1.3); }
  }
}

export const FALLEN_BLINK: GimmickDef = {
  id: fallenId('arcane', SLUG),
  rules: 'He blinks to the rune nearest you and his landing bursts. Strike the lit rune before he lands: he comes through it torn and stunned.',
  make,
};
