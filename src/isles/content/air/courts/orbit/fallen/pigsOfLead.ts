import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt } from '../gimmicks/shared';
import { live } from '../gimmicks/shared';
import { lit, shadow, type G } from '../../../../../art/IsleArt';
import { BRASS, BRASS_DARK, BRASS_LIT, ENAMEL, IRON, IRON_DARK, IRON_LIT, LODE_GLINT, METER, NAVY_DARK } from '../palette';
import { chainLite, dist } from '../orbitArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * Pigs of Lead — Ballast-Bailiff Morrow, in the King's telling the man who carried lead to the
 * houses in arrears: a debtor's house hung with ballast swings lower round the moon, where breath
 * costs more. Each lead pig is stamped with the Prince's link.
 *
 * Morrow lobs pigs of lead onto rings at your feet. Caught, a pig is hooked to your belt on a
 * short chain: every pig you carry slows you and makes blows land heavier. A DASH throws off the
 * newest pig — it drops where the dash began and lands a beat later in a crushing ring that hooks
 * itself onto whoever stands there. So carry them to him: walk in, dash out, and he wears your
 * ballast (he sheds his the same way, so mind where he dashes from). Pigs work loose on their own
 * after a while. At half health he throws them in pairs, one where you are and one where you are
 * walking.
 */

const ID = fallenId('orbit', 'pigs');
const LAND_R = 46;
const LAND_MS = 1050;
const SHED_MS = 420;
const CRUSH_R = 64;
const MAX_PIGS = 4;
const LOOSE_MS = 10000;

/** A pig in the air: from the bailiff's hand to its ring. */
interface Lob { from: Pt; x: number; y: number; at: number; t0: number }
/** A shed pig falling back down onto the floor where a dash began. */
interface Drop { x: number; y: number; at: number; t0: number; by: Fighter }
/** One fighter's load. */
interface Load { f: Fighter; pigs: number[]; wasDashing: boolean; last: Pt }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const lobs: Lob[] = [];
  const drops: Drop[] = [];
  const loads: Load[] = [
    { f: player, pigs: [], wasDashing: false, last: { x: player.x, y: player.y } },
    { f: npc, pigs: [], wasDashing: false, last: { x: npc.x, y: npc.y } },
  ];
  let started = false;
  let nextLob = 0;
  let pairs = false;
  const cx = (x: number): number => Math.max(50, Math.min(W - 50, x));
  const cy = (y: number): number => Math.max(top + 40, Math.min(H - 40, y));
  const loadOf = (f: Fighter): Load => (f === player ? loads[0] : loads[1]);

  function hook(f: Fighter, time: number, dmg: number): void {
    const l = loadOf(f);
    if (l.pigs.length < MAX_PIGS) l.pigs.push(time);
    ctx.sfx('anvil');
    if (f === player) tk.hitPlayer(dmg, f.x, f.y); else { ctx.hit(npc, dmg + 8, f.x, f.y); ctx.float(f.x, f.y - 48, 'BALLASTED', '#f0c766'); }
  }

  function lob(at: Pt, time: number): void {
    lobs.push({ from: { x: npc.x, y: npc.y - 30 }, x: cx(at.x), y: cy(at.y), at: time + LAND_MS, t0: time });
    ctx.sfx('rock-throw');
  }

  const speedFor = (f: Fighter): number => 1 - loadOf(f).pigs.length * 0.12;
  const takenFor = (f: Fighter): number => 1 + loadOf(f).pigs.length * 0.07;

  return {
    update(time) {
      if (!started) { started = true; nextLob = time + 2000; }
      if (!pairs && npc.hp < npc.maxHp * 0.5) { pairs = true; ctx.banner('THE BAILIFF THROWS IN PAIRS', '#f0c766'); ctx.sfx('stone-slam'); }
      if (time >= nextLob && live(player) && live(npc)) {
        nextLob = time + (pairs ? 4200 : 4600);
        lob({ x: player.x, y: player.y }, time);
        if (pairs) {
          const h = ctx.facing(player);
          lob({ x: player.x + Math.cos(h) * 160, y: player.y + Math.sin(h) * 160 }, time);
        }
      }
      for (let i = lobs.length - 1; i >= 0; i--) {
        const b = lobs[i];
        if (time < b.at) continue;
        lobs.splice(i, 1);
        ctx.sfx('land');
        if (live(player) && dist(player.x, player.y, b.x, b.y) < LAND_R + 18) hook(player, time, 10);
        else ctx.flash(b.x, b.y, IRON_LIT);
      }
      // Dashing throws off the newest pig, which drops where the dash began.
      for (const l of loads) {
        const d = live(l.f) && ctx.dashing(l.f);
        if (d && !l.wasDashing && l.pigs.length) {
          l.pigs.pop();
          drops.push({ x: l.last.x, y: l.last.y, at: time + SHED_MS, t0: time, by: l.f });
          ctx.sfx('chain');
        }
        if (!d) l.last = { x: l.f.x, y: l.f.y };
        l.wasDashing = d;
        if (l.pigs.length && time - l.pigs[0] > LOOSE_MS) { l.pigs.shift(); ctx.float(l.f.x, l.f.y - 40, 'WORKED LOOSE', '#cfe6f8'); }
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        if (time < d.at) continue;
        drops.splice(i, 1);
        ctx.sfx('stone-slam');
        ctx.flash(d.x, d.y, BRASS_LIT);
        for (const f of [player, npc]) {
          if (f === d.by || !live(f) || dist(f.x, f.y, d.x, d.y) > CRUSH_R + 14) continue;
          hook(f, time, 14);
        }
      }
    },

    playerSpeedMult: () => speedFor(player),
    npcSpeedMult: () => speedFor(npc),
    playerTakenMult: () => takenFor(player),
    npcTakenMult: () => takenFor(npc),

    npcSeek() {
      if (!live(player)) return null;
      // A falling pig: get out of its ring.
      for (const d of drops) {
        if (d.by === npc || dist(npc.x, npc.y, d.x, d.y) > CRUSH_R + 60) continue;
        const a = Math.atan2(npc.y - d.y, npc.x - d.x);
        return { x: cx(d.x + Math.cos(a) * (CRUSH_R + 80)), y: cy(d.y + Math.sin(a) * (CRUSH_R + 80)) };
      }
      const pl = loads[0].pigs.length, nl = loads[1].pigs.length;
      // Loaded himself: close in so the next dash sheds onto you. You loaded: keep off your dash-start.
      if (nl > 0) return { x: cx(player.x + (npc.x < player.x ? -40 : 40)), y: cy(player.y) };
      if (pl > 0 && dist(npc.x, npc.y, player.x, player.y) < 180) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: cx(player.x + Math.cos(a) * 220), y: cy(player.y + Math.sin(a) * 220) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const b of lobs) drawRing(g, b.x, b.y, LAND_R, (time - b.t0) / (b.at - b.t0), BRASS_LIT);
      for (const d of drops) drawRing(g, d.x, d.y, CRUSH_R, (time - d.t0) / (d.at - d.t0), METER);
    },

    drawAir(g, time) {
      for (const b of lobs) {
        const k = Math.min(1, (time - b.t0) / (b.at - b.t0));
        const x = b.from.x + (b.x - b.from.x) * k, y = b.from.y + (b.y - b.from.y) * k - Math.sin(k * Math.PI) * 170;
        drawPig(g, x, y, 1, time / 120 + b.t0);
      }
      for (const d of drops) {
        const k = Math.min(1, (time - d.t0) / (d.at - d.t0));
        drawPig(g, d.x, d.y - (1 - k) * 90 - 10, 1, time / 80);
      }
      // Pigs hanging off each fighter's belt, swinging as they walk.
      for (const l of loads) {
        if (!live(l.f)) continue;
        l.pigs.forEach((_, i) => {
          const a = Math.PI * (0.25 + i * 0.17) * (i % 2 ? -1 : 1) + Math.PI / 2;
          const sw = Math.sin(time / 180 + i * 1.7) * 0.25;
          const bx = l.f.x + Math.cos(a + sw) * 26, by = l.f.y + 4 + Math.sin(a + sw) * 12;
          chainLite(g, { x: l.f.x, y: l.f.y - 6 }, { x: bx, y: by - 6 }, 3, 0.9);
          drawPig(g, bx, by, 0.62, 0);
        });
      }
    },

    drawHud(g, time) {
      const y = top + 18;
      const k = Math.max(0, Math.min(1, 1 - (nextLob - time) / (pairs ? 4200 : 4600)));
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(W / 2 - 150, y - 13, 300, 26, 7);
      loads.forEach((l, s) => {
        const x0 = s === 0 ? W / 2 - 138 : W / 2 + 30;
        g.fillStyle(s === 0 ? ENAMEL : METER, 1); g.fillCircle(x0 + 4, y, 4);
        for (let i = 0; i < MAX_PIGS; i++) drawPig(g, x0 + 22 + i * 26, y + 4, 0.5, 0, i < l.pigs.length ? 1 : 0.22);
      });
      // The throw clock: a pig rising on a brass arc.
      g.lineStyle(2, BRASS_DARK, 1);
      g.beginPath(); g.arc(W / 2, y + 8, 14, Math.PI, Math.PI * 2, false); g.strokePath();
      g.fillStyle(IRON_LIT, 1); g.fillCircle(W / 2 + Math.cos(Math.PI + k * Math.PI) * 14, y + 8 + Math.sin(Math.PI + k * Math.PI) * 14, 3);
    },
  };
}

/** A landing ring: a chalked brass circle with plumb-cross ticks, filling clockwise to the drop. */
function drawRing(g: G, x: number, y: number, r: number, k: number, col: number): void {
  const t = Math.max(0, Math.min(1, k));
  g.fillStyle(0x000000, 0.12 + t * 0.28); g.fillEllipse(x, y, r * 0.6 + t * r * 1.2, r * 0.25 + t * r * 0.5);
  g.lineStyle(2, col, 0.35 + t * 0.4); g.strokeCircle(x, y, r);
  g.lineStyle(4, col, 0.85);
  g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2, false); g.strokePath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    g.lineStyle(2, col, 0.7); g.lineBetween(x + Math.cos(a) * (r - 8), y + Math.sin(a) * (r - 8), x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6));
  }
}

/**
 * A pig of lead: a long trapezoid ingot, dull blue-grey with a cast sheen, a lifting eye on its
 * back and the Prince's link stamped in its face. `s` scales it; `rot` tumbles it in the air.
 */
function drawPig(g: G, x: number, y: number, s: number, rot: number, a = 1): void {
  const lead = 0x5d6474, leadDark = 0x3a3f4b;
  const tilt = Math.sin(rot) * 6 * s;
  if (a >= 1 && s >= 1) shadow(g, x, y + 14 * s, 36 * s, 8 * s, 0.25);
  g.fillStyle(leadDark, a);
  g.fillTriangle(x - 20 * s, y + 6 * s + tilt, x + 20 * s, y + 6 * s - tilt, x + 16 * s, y - 8 * s - tilt);
  g.fillTriangle(x - 20 * s, y + 6 * s + tilt, x + 16 * s, y - 8 * s - tilt, x - 16 * s, y - 8 * s + tilt);
  g.fillStyle(lead, a);
  g.fillTriangle(x - 16 * s, y - 8 * s + tilt, x + 16 * s, y - 8 * s - tilt, x + 12 * s, y - 13 * s - tilt);
  g.fillTriangle(x - 16 * s, y - 8 * s + tilt, x + 12 * s, y - 13 * s - tilt, x - 12 * s, y - 13 * s + tilt);
  g.lineStyle(1, lit(lead, 0.35), 0.7 * a); g.lineBetween(x - 12 * s, y - 12 * s + tilt, x + 10 * s, y - 12 * s - tilt);
  // The stamp: one chain link, struck into the face.
  g.lineStyle(Math.max(1, 1.4 * s), NAVY_DARK, a); g.strokeEllipse(x, y - 1 * s, 10 * s, 5 * s);
  g.lineStyle(1, LODE_GLINT, 0.4 * a); g.strokeEllipse(x, y - 1.5 * s, 8 * s, 3.5 * s);
  // The lifting eye.
  g.lineStyle(Math.max(1, 2 * s), IRON, a); g.strokeCircle(x, y - 16 * s, 3.5 * s);
  g.fillStyle(a >= 1 ? BRASS : BRASS_DARK, a); g.fillRect(x - 3 * s, y - 14 * s, 6 * s, 2 * s);
  g.fillStyle(IRON_DARK, a * 0.5); g.fillRect(x + 7 * s, y + 1 * s, 4 * s, 1.5 * s);
}

export const FALLEN_PIGS: GimmickDef = {
  id: ID,
  rules: 'Lead pigs hook onto whoever they land on: slower, hit harder. A dash sheds one where it began — it crushes and hooks on him. Pairs at half.',
  make,
};
