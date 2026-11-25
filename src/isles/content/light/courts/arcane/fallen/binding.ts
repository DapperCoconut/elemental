import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { rune } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, CHALK, GOLD, GOLD_DARK, GOLD_LIT, MANA_LIT, SCORCH, SIDE_NPC } from '../palette';
import { alive, clamp, dist } from '../util';
import { dashedRing, pastHalf, pip, slatePlate } from './common';

/**
 * Ring upon Ring — Anchor-Warden Radegund Vesh, who renews the Anchor Circle's binding.
 *
 * She plants herself and binds: ring after ring of gilt sigil is chalked out round the spot she
 * stood on, each wider than the last, chains running down the spokes between them — and the
 * outermost ring it will reach is dotted on the slate from the first moment. When the last ring is
 * laid the bind closes: anyone inside it but her is chained where they stand and wrung.
 *
 * Walk out past the dotted ring and you are safe. Or break her concentration: hurt her hard and
 * fast (the seal on the slate cracks as you do) and every ring she has laid snaps in on *her*
 * instead — the later you break it, the more rings, the worse for her. She keeps to the heart of
 * her circle while she binds, so breaking it means going in. Past half the rings come faster and
 * reach farther.
 */

const SLUG = 'binding';
const RINGS = 6;
const R0 = 70;
const REACH = 350;
const REACH_HALF = 420;
const RING_MS = 800;
const RING_HALF_MS = 640;
const CLOSE_WARN_MS = 550;
const REST_MS = 3400;
const REST_HALF_MS = 2600;
const BIND_DMG = 16;
const BIND_ROOT = 1400;
const BREAK = 26;
const BREAK_WINDOW = 2000;
const COLLAPSE_MS = 450;

type Phase = 'rest' | 'binding' | 'closing' | 'snapping';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top, player, npc, tk } = ctx;
  let phase: Phase = 'rest';
  let phaseAt = 0;
  let nextAt = 2600;
  let ax = 0, ay = 0, reach = REACH, ringMs = RING_MS;
  let laid = 0;
  let lastRingAt = 0;
  let snapRings = 0;
  let snapFrom = { x: 0, y: 0 };
  let boundUntil = 0;
  let boundAt = { x: 0, y: 0 };
  let turned = false;
  let hurts: { t: number; amt: number }[] = [];

  const radius = (i: number): number => R0 + (reach - R0) * (i / (RINGS - 1));
  const strain = (time: number): number => hurts.filter((h) => time - h.t < BREAK_WINDOW).reduce((s, h) => s + h.amt, 0);

  function begin(time: number): void {
    phase = 'binding'; phaseAt = time; lastRingAt = time; laid = 1;
    ax = npc.x; ay = npc.y;
    reach = turned ? REACH_HALF : REACH; ringMs = turned ? RING_HALF_MS : RING_MS;
    hurts = [];
    ctx.sfx('chain');
  }

  function rest(time: number): void { phase = 'rest'; phaseAt = time; nextAt = time + (turned ? REST_HALF_MS : REST_MS); }

  return {
    update(time) {
      if (!turned && pastHalf(npc)) { turned = true; ctx.banner('THE RINGS REACH FARTHER', '#ffe2a8'); }
      if (!alive(npc)) return;
      if (phase === 'rest' && time >= nextAt) begin(time);
      if (phase === 'binding' || phase === 'closing') {
        if (strain(time) >= BREAK) {
          phase = 'snapping'; phaseAt = time; snapRings = laid; snapFrom = { x: ax, y: ay };
          hurts = [];
          ctx.sfx('crystal-shatter');
          return;
        }
      }
      if (phase === 'binding' && time - lastRingAt >= ringMs) {
        laid++; lastRingAt = time;
        ctx.sfx(laid >= RINGS ? 'curse-cast' : 'chain');
        if (laid >= RINGS) { phase = 'closing'; phaseAt = time; }
      } else if (phase === 'closing' && time - phaseAt >= CLOSE_WARN_MS) {
        if (alive(player) && !ctx.isAirborne(player) && dist(player.x, player.y, ax, ay) < reach) {
          tk.hitPlayer(BIND_DMG, player.x, player.y);
          ctx.root(player, BIND_ROOT);
          boundUntil = time + BIND_ROOT; boundAt = { x: player.x, y: player.y };
          ctx.sfx('chain');
        }
        rest(time);
      } else if (phase === 'snapping' && time - phaseAt >= COLLAPSE_MS) {
        ctx.hit(npc, 6 * snapRings, npc.x, npc.y);
        ctx.stun(npc, 900 + 120 * snapRings);
        ctx.flash(npc.x, npc.y, GOLD_LIT);
        ctx.sfx('judgement');
        rest(time);
      }
    },

    onNpcHurt(amount) {
      if (phase === 'binding' || phase === 'closing') hurts.push({ t: ctx.scene.time.now, amt: amount });
    },

    npcSeek() {
      // She keeps to the heart of her circle while she binds.
      if (phase === 'binding' || phase === 'closing') return { x: ax, y: ay };
      return null;
    },

    drawGround(g, time) {
      if (phase === 'binding' || phase === 'closing') {
        // The reach, dotted from the first ring.
        dashedRing(g, ax, ay, reach, CHALK, 0.55, 2, 54, 1, time / 4000);
        drawAnchor(g, ax, ay, time);
        for (let i = 0; i < laid; i++) {
          const fresh = i === laid - 1 ? clamp((time - lastRingAt) / (ringMs * 0.6), 0, 1) : 1;
          drawRing(g, ax, ay, radius(i), fresh, i, time, phase === 'closing' && i === laid - 1);
        }
        drawChains(g, ax, ay, radius(laid - 1), time);
      } else if (phase === 'snapping') {
        // Every laid ring snaps in on her.
        const k = clamp((time - phaseAt) / COLLAPSE_MS, 0, 1);
        const e = k * k;
        const cx = snapFrom.x + (npc.x - snapFrom.x) * e, cy = snapFrom.y + (npc.y - snapFrom.y) * e;
        for (let i = 0; i < snapRings; i++) {
          const r = Math.max(14, radius(i) * (1 - e) + 18 * e);
          g.lineStyle(3, GOLD_LIT, 0.9); g.strokeCircle(cx, cy, r);
          g.lineStyle(1.2, MANA_LIT, 0.7); g.strokeCircle(cx, cy, r - 5);
        }
      }
    },

    drawAir(g, time) {
      // The bound: chains from the ring to their limbs, a padlock at the chest.
      if (time < boundUntil) {
        const fade = clamp((boundUntil - time) / 300, 0, 1);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.4;
          const ox = boundAt.x + Math.cos(a) * 64, oy = boundAt.y + Math.sin(a) * 40;
          chain(g, ox, oy, boundAt.x + Math.cos(a) * 12, boundAt.y - 10 + Math.sin(a) * 8, GOLD, fade);
          g.fillStyle(BRASS_DARK, fade); g.fillCircle(ox, oy, 4); g.fillStyle(BRASS, fade); g.fillCircle(ox, oy, 2.6);
        }
        padlock(g, boundAt.x, boundAt.y - 14, 1, fade);
      }
      if (phase === 'snapping') {
        const k = clamp((time - phaseAt) / COLLAPSE_MS, 0, 1);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + time / 200;
          const r = 60 * (1 - k) + 14;
          chain(g, npc.x + Math.cos(a) * r, npc.y + Math.sin(a) * r * 0.7, npc.x, npc.y - 10, GOLD_LIT, 0.9);
        }
        if (k > 0.6) padlock(g, npc.x, npc.y - 16, 1.1, 1);
      }
    },

    drawHud(g, time) {
      const cx = W / 2, y = top + 4;
      slatePlate(g, cx, y, 220, 30);
      const live = phase === 'binding' || phase === 'closing';
      // The rings laid.
      for (let i = 0; i < RINGS; i++) {
        const x = cx - 92 + i * 15, yy = y + 15;
        if (live && i < laid) { g.lineStyle(2, GOLD_LIT, 1); g.strokeCircle(x, yy, 5); g.lineStyle(1, GOLD, 1); g.strokeCircle(x, yy, 2.5); }
        else pip(g, x, yy, false);
      }
      // The seal of her concentration: a wax seal that cracks as you hurt her.
      const sx = cx + 50, sy = y + 15;
      const k = live ? clamp(strain(time) / BREAK, 0, 1) : 0;
      g.fillStyle(dim(SIDE_NPC, 0.3), 1); g.fillCircle(sx, sy, 9);
      g.fillStyle(SIDE_NPC, 1); g.fillCircle(sx, sy, 7.5);
      g.lineStyle(1, dim(SIDE_NPC, 0.45), 1); g.strokeCircle(sx, sy, 4.5);
      rune(g, sx, sy, 3, 5, lit(SIDE_NPC, 0.5), 0.9, 1);
      const cracks = Math.floor(k * 5);
      g.lineStyle(1.3, 0x1a0a08, 1);
      for (let i = 0; i < cracks; i++) { const a = i * 1.3 + 0.3; g.lineBetween(sx + Math.cos(a) * 2, sy + Math.sin(a) * 2, sx + Math.cos(a + 0.3) * 9, sy + Math.sin(a + 0.3) * 9); }
      // A bar beside it, filling toward the break.
      g.fillStyle(0x000000, 0.5); g.fillRect(sx + 14, sy - 3, 46, 6);
      g.fillStyle(GOLD_LIT, 1); g.fillRect(sx + 14, sy - 3, 46 * k, 6);
      g.lineStyle(1, GOLD_DARK, 1); g.strokeRect(sx + 14, sy - 3, 46, 6);
    },
  };

  /** One laid ring: a scorched band, twin gilt lines and runes, the newest traced as it is laid. */
  function drawRing(g: G, x: number, y: number, r: number, fresh: number, i: number, time: number, warn: boolean): void {
    const span = fresh * Math.PI * 2;
    const a0 = -Math.PI / 2 + i * 0.7;
    g.lineStyle(9, SCORCH, 0.18); g.beginPath(); g.arc(x, y, r, a0, a0 + span, false); g.strokePath();
    g.lineStyle(2.5, GOLD, 0.95); g.beginPath(); g.arc(x, y, r, a0, a0 + span, false); g.strokePath();
    g.lineStyle(1, GOLD_LIT, 0.8); g.beginPath(); g.arc(x, y, r - 6, a0, a0 + span, false); g.strokePath();
    const n = Math.max(8, Math.round(r / 20));
    for (let k = 0; k < n; k++) {
      const a = a0 + (k / n) * Math.PI * 2 + 0.1;
      if (a - a0 > span) break;
      rune(g, x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3), 3, k + i * 3, CHALK, 0.7, 1);
    }
    if (fresh < 1) { const a = a0 + span; glow(g, x + Math.cos(a) * r, y + Math.sin(a) * r, 10, GOLD_LIT, 0.12, 2); }
    if (warn) {
      const p = 0.5 + Math.sin(time / 45) * 0.5;
      g.lineStyle(5, 0xff6a48, 0.35 + p * 0.45); g.strokeCircle(x, y, r + 3);
    }
  }

  /** The anchor at the heart: a hexagram bound in a circle with a keyhole in the middle. */
  function drawAnchor(g: G, x: number, y: number, time: number): void {
    glow(g, x, y, 34, GOLD, 0.05, 3);
    g.lineStyle(2, GOLD, 0.9); g.strokeCircle(x, y, 28);
    for (const rot of [-Math.PI / 2, Math.PI / 2]) {
      const p = [0, 1, 2].map((k) => ({ x: x + Math.cos(rot + (k / 3) * Math.PI * 2) * 26, y: y + Math.sin(rot + (k / 3) * Math.PI * 2) * 26 }));
      g.lineStyle(1.5, GOLD_LIT, 0.8); g.strokeTriangle(p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y);
    }
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y - 2, 5); g.fillTriangle(x - 3, y, x + 3, y, x, y + 8);
    g.lineStyle(1, MANA_LIT, 0.4 + Math.sin(time / 200) * 0.3); g.strokeCircle(x, y, 34);
  }

  /** Six chains down the spokes from the anchor to the outermost laid ring. */
  function drawChains(g: G, x: number, y: number, r: number, time: number): void {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.26;
      chain(g, x + Math.cos(a) * 30, y + Math.sin(a) * 30, x + Math.cos(a) * r, y + Math.sin(a) * r, dim(GOLD, 0.1), 0.75 + Math.sin(time / 300 + i) * 0.1);
    }
  }

  /** A chain of oval links between two points, links alternately face-on and edge-on. */
  function chain(g: G, x1: number, y1: number, x2: number, y2: number, color: number, a: number): void {
    const d = dist(x1, y1, x2, y2), n = Math.max(2, Math.floor(d / 9));
    const ang = Math.atan2(y2 - y1, x2 - x1), c = Math.cos(ang), s = Math.sin(ang);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
      if (k % 2) { g.lineStyle(2, color, a); g.lineBetween(px - c * 5, py - s * 5, px + c * 5, py + s * 5); }
      else {
        g.lineStyle(1.6, color, a);
        g.beginPath();
        for (let j = 0; j <= 10; j++) {
          const u = (j / 10) * Math.PI * 2, lx = Math.cos(u) * 5.5, ly = Math.sin(u) * 3;
          const qx = px + lx * c - ly * s, qy = py + lx * s + ly * c;
          if (j === 0) g.moveTo(qx, qy); else g.lineTo(qx, qy);
        }
        g.strokePath();
      }
    }
  }

  /** A brass padlock, shackle up. */
  function padlock(g: G, x: number, y: number, s: number, a: number): void {
    g.lineStyle(3 * s, BRASS_DARK, a); g.beginPath(); g.arc(x, y - 4 * s, 5 * s, Math.PI, 0, false); g.strokePath();
    g.lineStyle(1.6 * s, BRASS_LIT, a); g.beginPath(); g.arc(x, y - 4 * s, 5 * s, Math.PI, 0, false); g.strokePath();
    g.fillStyle(BRASS_DARK, a); g.fillRect(x - 7 * s, y - 4 * s, 14 * s, 11 * s);
    g.fillStyle(BRASS, a); g.fillRect(x - 6 * s, y - 3 * s, 12 * s, 9 * s);
    g.fillStyle(0x1a1208, a); g.fillCircle(x, y, 1.6 * s); g.fillRect(x - 0.7 * s, y, 1.4 * s, 3.5 * s);
  }
}

export const FALLEN_BINDING: GimmickDef = {
  id: fallenId('arcane', SLUG),
  rules: 'She lays ring after ring round her spot; when the last is laid, all inside are chained. Hurt her hard and fast to snap the rings in on her.',
  make,
};
