import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BASALT, BASALT_DARK, BASALT_LIT, BRASS, BRASS_DARK, COPPER, COPPER_DARK, GROUT, IRON, IRON_LIT, STATE_A, STATE_B,
  WELL, WELL_DEEP, WELL_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Whoever the Ripple Finds — Well-Warden Clemency Drabble.
 *
 * The Quantum Well is the court's fishing water, and its ripples do a thing no other water does:
 * a ripple is everywhere on the well at once until it touches something, and then it is all in
 * that one place. In the King's telling Drabble kept the well for the Grid and used it to find the
 * switched-off who hid on the banks: she dropped a sounding-lead and let the water find them.
 *
 * The rule: she drops lead sounding-weights into the yard (a falling weight, a growing shadow).
 * Each splash spreads a ripple ring. The ring passes over nothing — until it reaches a fighter: then
 * the whole ripple **collapses onto whoever it touched first**, a heavy slap of water there and
 * then, and the ring is gone; whoever was further out is spared. A dash carries you through a ring
 * untouched. And a **shot** that meets a ring collapses it too, where the shot is: the water gathers
 * there and spouts a moment later, on whoever stands by it. So keep the foe between you and the
 * splash, dash the rings, or shoot a ring as it passes over her. Past half the well rises: two
 * weights at a time, and the rings run quicker.
 *
 * The bot runs out ahead of rings it would meet first, then stands behind you from the last splash,
 * so the water finds you before it finds her.
 */

const ID = fallenId('superposition', 'ripple');
const DROP_MS = 750;
const BAND = 12;
const MAX_R = 470;
const SPOUT_WARN = 540;
const SPOUT_R = 60;

interface Ring { cx: number; cy: number; dropAt: number; r: number; done: boolean }
interface Spout { x: number; y: number; at: number; fired: boolean }
interface Slap { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const rings: Ring[] = [];
  const spouts: Spout[] = [];
  const slaps: Slap[] = [];
  const found = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let nextDrop = 0;
  let started = false;
  let rising = false;
  let aimAtPlayer = true;
  let lastDrop: Pt = { x: W / 2, y: (top + H) / 2 };

  const speed = () => (rising ? 205 : 165);
  const splashed = (r: Ring, time: number) => time >= r.dropAt + DROP_MS;

  function hurt(f: Fighter, pAmt: number, nAmt: number, x: number, y: number): void {
    if (!alive(f)) return;
    if (f === player) tk.hitPlayer(pAmt, x, y); else ctx.hit(npc, nAmt, x, y);
  }

  function drop(time: number, f: Fighter): void {
    const a = rng() * Math.PI * 2, d = 130 + rng() * 100;
    const cx = clamp(f.x + Math.cos(a) * d, 80, W - 80);
    const cy = clamp(f.y + Math.sin(a) * d, top + 70, H - 70);
    rings.push({ cx, cy, dropAt: time, r: 0, done: false });
    lastDrop = { x: cx, y: cy };
    ctx.sfx('whoosh');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextDrop = time + 1300; }
      if (!rising && npc.hp < npc.maxHp * 0.5) {
        rising = true;
        ctx.banner('THE WELL RISES', '#d2c0ff');
        ctx.sfx('geyser');
      }
      if (time >= nextDrop) {
        nextDrop = time + (rising ? 1550 : 2000);
        if (rings.filter((r) => !r.done).length < 5) {
          if (rising && alive(npc)) { drop(time, player); drop(time, npc); }
          else { drop(time, aimAtPlayer || !alive(npc) ? player : npc); aimAtPlayer = !aimAtPlayer; }
        }
      }
      for (const ring of rings) {
        if (ring.done || !splashed(ring, time)) continue;
        if (ring.r === 0) { ctx.sfx('splash'); ring.r = 8; }
        ring.r += speed() * dt;
        if (ring.r > MAX_R) { ring.done = true; continue; }
        // First fighter it touches takes the whole of it.
        const hitNow = [player, npc].filter((f) => alive(f) && !ctx.dashing(f) && Math.abs(dist(f.x, f.y, ring.cx, ring.cy) - ring.r) < BAND + 18);
        if (hitNow.length) {
          ring.done = true;
          for (const f of hitNow) {
            hurt(f, 20, 26, f.x, f.y);
            const a = Math.atan2(f.y - ring.cy, f.x - ring.cx);
            ctx.nudge(f, Math.cos(a) * 30, Math.sin(a) * 30);
            slaps.push({ x: f.x, y: f.y, at: time });
            found.set(f, (found.get(f) ?? 0) + 1);
          }
          ctx.sfx('water-jet');
          continue;
        }
        // A shot that meets it gathers it to where the shot is.
        for (const s of ctx.shotsNear(ring.cx, ring.cy, ring.r + BAND + 12)) {
          if (Math.abs(dist(s.x, s.y, ring.cx, ring.cy) - ring.r) > BAND + 8) continue;
          ring.done = true;
          spouts.push({ x: s.x, y: s.y, at: time, fired: false });
          ctx.sfx('bubble');
          break;
        }
      }
      for (const sp of spouts) {
        if (sp.fired || time - sp.at < SPOUT_WARN) continue;
        sp.fired = true;
        ctx.sfx('geyser');
        for (const f of [player, npc]) if (dist(f.x, f.y, sp.x, sp.y) < SPOUT_R) hurt(f, 24, 32, sp.x, sp.y);
      }
      for (let i = rings.length - 1; i >= 0; i--) if (rings[i].done) rings.splice(i, 1);
      for (let i = spouts.length - 1; i >= 0; i--) if (time - spouts[i].at > SPOUT_WARN + 700) spouts.splice(i, 1);
      for (let i = slaps.length - 1; i >= 0; i--) if (time - slaps[i].at > 700) slaps.splice(i, 1);
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      const keep = (x: number, y: number) => ({ x: clamp(x, 70, W - 70), y: clamp(y, top + 60, H - 50) });
      for (const sp of spouts) {
        if (sp.fired || dist(npc.x, npc.y, sp.x, sp.y) > SPOUT_R + 30) continue;
        const a = Math.atan2(npc.y - sp.y, npc.x - sp.x);
        return keep(sp.x + Math.cos(a) * (SPOUT_R + 70), sp.y + Math.sin(a) * (SPOUT_R + 70));
      }
      // A ring that would find her before the player: run outward ahead of it.
      for (const ring of rings) {
        const dn = dist(npc.x, npc.y, ring.cx, ring.cy), dp = dist(player.x, player.y, ring.cx, ring.cy);
        const r = splashed(ring, time) ? ring.r : 0;
        if (dn > r && dn < dp && dn - r < 260) {
          const a = Math.atan2(npc.y - ring.cy, npc.x - ring.cx);
          return keep(npc.x + Math.cos(a) * 200, npc.y + Math.sin(a) * 200);
        }
      }
      const a = Math.atan2(player.y - lastDrop.y, player.x - lastDrop.x);
      return keep(player.x + Math.cos(a) * 210, player.y + Math.sin(a) * 210);
    },

    drawGround(g, time) {
      wellKerb(g, W, H, time);
      for (const ring of rings) {
        if (!splashed(ring, time)) {
          const k = clamp((time - ring.dropAt) / DROP_MS, 0, 1);
          shadow(g, ring.cx, ring.cy, 16 + k * 26, 6 + k * 10, 0.2 + k * 0.35);
          g.lineStyle(1.5, WELL_LIT, 0.3 + k * 0.5); g.strokeCircle(ring.cx, ring.cy, 22 - k * 8);
          continue;
        }
        rippleRing(g, ring.cx, ring.cy, ring.r, time);
      }
      for (const sp of spouts) {
        if (sp.fired) continue;
        const k = clamp((time - sp.at) / SPOUT_WARN, 0, 1);
        g.fillStyle(WELL, 0.3 + k * 0.3); g.fillCircle(sp.x, sp.y, SPOUT_R);
        g.lineStyle(2, WELL_LIT, 0.6 + k * 0.4); g.strokeCircle(sp.x, sp.y, SPOUT_R);
        g.fillStyle(WELL_LIT, 0.25); g.slice(sp.x, sp.y, SPOUT_R - 4, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
        for (let i = 0; i < 7; i++) {
          const ph = ((time / 300) + i / 7) % 1;
          const a = i * 2.3;
          g.lineStyle(1, lit(WELL_LIT, 0.4), 0.8 * (1 - ph)); g.strokeCircle(sp.x + Math.cos(a) * 30 * (1 - ph), sp.y + Math.sin(a) * 18 * (1 - ph), 2 + ph * 4);
        }
      }
    },

    drawAir(g, time) {
      for (const ring of rings) {
        if (splashed(ring, time)) {
          const k = clamp((time - ring.dropAt - DROP_MS) / 400, 0, 1);
          if (k < 1) crown(g, ring.cx, ring.cy, k);
          continue;
        }
        const k = clamp((time - ring.dropAt) / DROP_MS, 0, 1);
        soundingLead(g, ring.cx, ring.cy - (1 - k * k) * 240, top);
      }
      for (const s of slaps) {
        const k = clamp((time - s.at) / 700, 0, 1);
        waterColumn(g, s.x, s.y, 70 * (1 - k * 0.6), 1 - k, time);
      }
      for (const sp of spouts) {
        if (!sp.fired) continue;
        const k = clamp((time - sp.at - SPOUT_WARN) / 700, 0, 1);
        waterColumn(g, sp.x, sp.y, 120 * (1 - k * 0.5), 1 - k, time);
      }
    },

    drawHud(g, time) {
      // Drabble's sounding line: knots for each time the water found someone.
      const x0 = 18, y0 = H - 38;
      g.fillStyle(0x0c0b10, 0.72); g.fillRoundedRect(x0 - 8, y0 - 18, 200, 38, 6);
      g.lineStyle(1, BRASS_DARK, 1); g.strokeRoundedRect(x0 - 8, y0 - 18, 200, 38, 6);
      [[player, STATE_B, -7], [npc, STATE_A, 7]].forEach(([f, col, dy]) => {
        const n = Math.min(12, found.get(f as Fighter) ?? 0);
        const y = y0 + (dy as number);
        g.lineStyle(1.5, 0xd8d0b8, 0.7); g.lineBetween(x0, y, x0 + 150, y);
        for (let i = 0; i < n; i++) { g.fillStyle(col as number, 1); g.fillCircle(x0 + 6 + i * 12, y, 3.5); }
      });
      const k = clamp(1 - (nextDrop - time) / (rising ? 1550 : 2000), 0, 1);
      const lx = x0 + 172;
      g.lineStyle(1, 0xd8d0b8, 0.7); g.lineBetween(lx, y0 - 14, lx, y0 - 14 + k * 20);
      g.fillStyle(IRON, 1); g.fillTriangle(lx - 4, y0 - 14 + k * 20, lx + 4, y0 - 14 + k * 20, lx, y0 - 4 + k * 20);
    },
  };
}

/** The well's kerb along the south edge: basalt blocks, copper tie-irons, the lit violet water beyond. */
function wellKerb(g: G, W: number, H: number, time: number): void {
  g.fillStyle(WELL_DEEP, 1); g.fillRect(0, H - 14, W, 14);
  g.fillStyle(WELL, 0.8); g.fillRect(0, H - 14, W, 6);
  for (let i = 0; i < 6; i++) {
    const x = ((time / 30 + i * 170) % (W + 60)) - 30;
    g.lineStyle(1, WELL_LIT, 0.4); g.lineBetween(x, H - 6, x + 26, H - 6);
  }
  for (let x = 0; x < W; x += 64) {
    g.fillStyle(BASALT_DARK, 1); g.fillRect(x + 1, H - 26, 62, 13);
    g.fillStyle(BASALT, 1); g.fillRect(x + 1, H - 26, 62, 10);
    g.fillStyle(BASALT_LIT, 1); g.fillRect(x + 1, H - 26, 62, 2);
    g.fillStyle(COPPER_DARK, 1); g.fillRect(x + 58, H - 24, 8, 4);
    g.fillStyle(COPPER, 1); g.fillRect(x + 58, H - 24, 8, 2);
  }
}

/** A ripple on the yard: a lit crest with a dark trough inside it and a broken shimmer on top. */
function rippleRing(g: G, x: number, y: number, r: number, time: number): void {
  const fade = 1 - clamp((r - 300) / (MAX_R - 300), 0, 0.7);
  g.lineStyle(BAND * 1.6, WELL, 0.22 * fade); g.strokeCircle(x, y, r);
  g.lineStyle(3, WELL_DEEP, 0.7 * fade); g.strokeCircle(x, y, Math.max(1, r - 7));
  g.lineStyle(2.5, WELL_LIT, 0.9 * fade); g.strokeCircle(x, y, r);
  g.lineStyle(1, lit(WELL_LIT, 0.6), 0.8 * fade);
  const n = Math.max(8, Math.floor(r / 14));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + time / 900;
    g.beginPath(); g.arc(x, y, r + 3, a, a + 0.12, false); g.strokePath();
  }
  g.lineStyle(1, WELL_LIT, 0.25 * fade); g.strokeCircle(x, y, r * 0.6);
}

/** Drabble's sounding-lead: a pear of grey lead with a tallow cup, falling on a knotted line from above. */
function soundingLead(g: G, x: number, y: number, top: number): void {
  g.lineStyle(1, 0xd8d0b8, 0.7); g.lineBetween(x, top - 10, x, y - 26);
  for (let ky = top + 20; ky < y - 30; ky += 36) { g.fillStyle(0xd8d0b8, 0.8); g.fillCircle(x, ky, 1.8); }
  g.fillStyle(dim(IRON_LIT, 0.1), 1);
  g.fillPoints([{ x: x - 3, y: y - 26 }, { x: x + 3, y: y - 26 }, { x: x + 9, y: y - 6 }, { x: x + 7, y: y + 2 }, { x: x - 7, y: y + 2 }, { x: x - 9, y: y - 6 }], true);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 5, y - 20, 2, 16);
  g.fillStyle(0xe0d8b8, 1); g.fillEllipse(x, y + 2, 12, 4);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 27, 2.5);
}

/** The splash crown where a lead goes in. */
function crown(g: G, x: number, y: number, k: number): void {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = 8 + k * 26;
    const h = Math.sin(k * Math.PI) * 26;
    g.fillStyle(WELL_LIT, 0.8 * (1 - k)); g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.45 - h, 3 - k * 2);
  }
  g.lineStyle(2, lit(WELL_LIT, 0.4), 1 - k); g.strokeEllipse(x, y, 20 + k * 50, 8 + k * 20);
}

/** A column of well-water thrown up out of the floor, frothing, falling back as spray. */
function waterColumn(g: G, x: number, y: number, h: number, a: number, time: number): void {
  glow(g, x, y - h * 0.5, 34, WELL_LIT, 0.05 * a, 3);
  g.fillStyle(WELL, 0.75 * a); g.fillRoundedRect(x - 16, y - h, 32, h, 12);
  g.fillStyle(WELL_LIT, 0.6 * a); g.fillRoundedRect(x - 9, y - h + 6, 10, h - 10, 5);
  g.fillStyle(lit(WELL_LIT, 0.6), 0.8 * a); g.fillCircle(x, y - h, 18);
  for (let i = 0; i < 9; i++) {
    const ph = ((time / 450) + i / 9) % 1;
    const sx = x + Math.sin(i * 2.7) * (14 + ph * 26), sy = y - h + ph * ph * h * 0.9 - ph * 14;
    g.fillStyle(lit(WELL_LIT, 0.5), a * (1 - ph)); g.fillCircle(sx, sy, 2.4);
  }
  g.lineStyle(2, GROUT, 0.5 * a); g.strokeEllipse(x, y, 54, 16);
}

export const FALLEN_RIPPLE: GimmickDef = {
  id: ID,
  rules: 'A ripple collapses on whoever it touches first. A dash slips through. A shot that meets a ring gathers it there: it spouts a beat later.',
  make,
};
