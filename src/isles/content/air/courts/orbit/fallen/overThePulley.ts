import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt } from '../gimmicks/shared';
import { live } from '../gimmicks/shared';
import { dim, glow, shadow, type G } from '../../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, BRASS_LIT, IRON, IRON_DARK, IRON_LIT, LODE, LODE_GLINT, LODE_MID, LODE_SHEEN, METER, NAVY_DARK, STONE_DARK,
} from '../palette';
import { chainLite, dist, gear } from '../orbitArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * Over the Pulley — Cuthbert Lanyard, in the King's telling the winch-hand who hauled the debtors'
 * islets in a link at a time.
 *
 * You and Cuthbert hang off the two ends of ONE chain, run up over a great sheave on a gantry in the
 * middle of the yard. Your two distances to the sheave can never add up to more than the chain:
 * walk out and you haul him in; he walks out and hauls you. Under the sheave is the well — an
 * iron throat where the chain's weight crushes whoever is dragged into it, and where every blow
 * lands harder. Whoever is DASHING when the chain runs out takes none of the strain: the whole
 * excess goes to the other end, a yank that slams them toward the well.
 *
 * Every few seconds Cuthbert throws the ratchet and the winch reels the chain in (the pawl clacks
 * first): both ends are dragged toward the well. At half health he takes up the slack for good.
 * The exploit: stand far out when the ratchet clacks, dash outward as it reels, and he goes down
 * the throat. The bot walks out on the far side from you, and dashes on the reel when it can.
 */

const ID = fallenId('orbit', 'pulley');
const CHAIN_L = 620;
const CHAIN_HALF = 530;
const WELL_R = 78;
const REEL_EVERY = 9000;
const REEL_WARN = 1300;
const REEL_MS = 2200;
const REEL_TAKE = 150;
const CRUSH_MS = 500;

/** Per-end bookkeeping: crush clock and the yank a dash put through the chain. */
interface End { f: Fighter; lastCrush: number; yanked: number; yankShown: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const P: Pt = { x: W / 2, y: (top + H) / 2 + 10 };
  const ends: End[] = [
    { f: player, lastCrush: 0, yanked: 0, yankShown: 0 },
    { f: npc, lastCrush: 0, yanked: 0, yankShown: 0 },
  ];
  let started = false;
  let nextReel = 0;
  let reelFrom = -1;
  let takenUp = false;
  let spin = 0;
  let lastTotal = 0;
  let now = 0;

  /** The chain as it stands now: base length, less whatever the winch is reeling. */
  const chainLen = (time: number): number => {
    const base = takenUp ? CHAIN_HALF : CHAIN_L;
    if (reelFrom < 0 || time < reelFrom + REEL_WARN) return base;
    const k = (time - reelFrom - REEL_WARN) / REEL_MS;
    return base - REEL_TAKE * Math.sin(Math.min(1, Math.max(0, k)) * Math.PI);
  };
  const reach = (f: Fighter): number => dist(f.x, f.y, P.x, P.y);
  const inWell = (f: Fighter): boolean => reach(f) < WELL_R;

  /** Haul one end `d` px toward the sheave. */
  function haul(e: End, d: number): void {
    const r = reach(e.f) || 1;
    const k = Math.min(d, Math.max(0, r - 24)) / r;
    ctx.nudge(e.f, (P.x - e.f.x) * k, (P.y - e.f.y) * k);
  }

  return {
    update(time) {
      now = time;
      if (!started) { started = true; nextReel = time + 5000; }
      if (!takenUp && npc.hp < npc.maxHp * 0.5) {
        takenUp = true;
        ctx.banner('SLACK TAKEN UP — THE CHAIN IS SHORTER', '#f0c766');
        ctx.sfx('gear-turn');
      }
      if (reelFrom < 0 && time >= nextReel) { reelFrom = time; ctx.sfx('clock-tick'); }
      if (reelFrom >= 0 && time >= reelFrom + REEL_WARN && time < reelFrom + REEL_WARN + 40) ctx.sfx('chain');
      if (reelFrom >= 0 && time > reelFrom + REEL_WARN + REEL_MS) { reelFrom = -1; nextReel = time + REEL_EVERY - (takenUp ? 1500 : 0); }

      const L = chainLen(time);
      const [pe, ne] = ends;
      if (live(player) && live(npc)) {
        const total = reach(player) + reach(npc);
        spin += (total - lastTotal) * 0.02;
        lastTotal = total;
        const excess = total - L;
        if (excess > 0) {
          const pd = ctx.dashing(player), nd = ctx.dashing(npc);
          if (pd && !nd) { haul(ne, excess); ne.yanked += excess; }
          else if (nd && !pd) { haul(pe, excess); pe.yanked += excess; }
          else { haul(pe, excess / 2); haul(ne, excess / 2); }
        }
      }
      for (const e of ends) {
        // A yank of more than a stride lands as a blow.
        if (e.yanked > 70 && time - e.yankShown > 900) {
          e.yankShown = time;
          ctx.float(e.f.x, e.f.y - 46, 'YANKED', '#f0c766');
          ctx.sfx('snap-back');
          if (e.f === player) tk.hitPlayer(8, e.f.x, e.f.y); else ctx.hit(npc, 10, e.f.x, e.f.y);
        }
        if (!ctx.dashing(player) && !ctx.dashing(npc)) e.yanked = 0;
        if (live(e.f) && inWell(e.f) && time - e.lastCrush > CRUSH_MS) {
          e.lastCrush = time;
          ctx.sfx('gravity-slam');
          if (e.f === player) tk.hitPlayer(9, e.f.x, e.f.y); else ctx.hit(npc, 12, e.f.x, e.f.y);
        }
      }
    },

    playerTakenMult: () => (inWell(player) ? 1.3 : 1),
    npcTakenMult: () => (inWell(npc) ? 1.3 : 1),

    npcSeek() {
      if (!live(player)) return null;
      // Walk out on the far side of the sheave from you, so every step hauls you in.
      let a = Math.atan2(P.y - player.y, P.x - player.x);
      if (!Number.isFinite(a)) a = 0;
      const r = Math.min(300, Math.max(WELL_R + 90, chainLen(now) - reach(player) + 30));
      return { x: Math.max(50, Math.min(W - 50, P.x + Math.cos(a) * r)), y: Math.max(top + 40, Math.min(H - 40, P.y + Math.sin(a) * r * 0.7)) };
    },

    drawGround(g, time) {
      drawWell(g, P, time, reelFrom >= 0);
      // The equilibrium ring: where each end sits when both pull equally.
      const half = chainLen(time) / 2;
      g.lineStyle(1, BRASS_LIT, 0.22);
      for (let i = 0; i < 36; i += 2) {
        const a0 = (i / 36) * Math.PI * 2, a1 = ((i + 1) / 36) * Math.PI * 2;
        g.lineBetween(P.x + Math.cos(a0) * half, P.y + Math.sin(a0) * half * 0.7, P.x + Math.cos(a1) * half, P.y + Math.sin(a1) * half * 0.7);
      }
      for (const e of ends) if (live(e.f)) drawCollar(g, e.f.x, e.f.y + 8);
    },

    drawAir(g, time) {
      const axle = { x: P.x, y: P.y - 120 };
      const L = chainLen(time);
      const taut = reach(player) + reach(npc) > L - 14;
      drawGantry(g, P, axle);
      for (const e of ends) {
        if (!live(e.f)) continue;
        const side = e.f.x < P.x ? -1 : 1;
        const off = { x: axle.x + side * 26, y: axle.y };
        chainLite(g, off, { x: e.f.x, y: e.f.y - 14 }, taut ? 0 : 22, 1, taut ? IRON_LIT : IRON);
        if (taut) { g.lineStyle(1, BRASS_LIT, 0.35 + Math.sin(time / 50) * 0.15); g.lineBetween(off.x, off.y, e.f.x, e.f.y - 14); }
      }
      drawSheave(g, axle, spin, reelFrom >= 0 && time >= reelFrom + REEL_WARN);
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 18;
      const L = chainLen(time);
      const used = live(player) && live(npc) ? Math.min(1.2, (reach(player) + reach(npc)) / L) : 0;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 130, y - 12, 260, 24, 7);
      // The chain gauge: link marks, filled up to how much of the chain is out.
      for (let i = 0; i < 24; i++) {
        const lx = x - 112 + i * 9;
        const on = i / 24 < used;
        g.lineStyle(2, on ? (used > 0.98 ? BRASS_LIT : IRON_LIT) : IRON_DARK, 1);
        g.strokeEllipse(lx, y, i % 2 ? 7 : 9, i % 2 ? 4 : 6);
      }
      // The ratchet clock: a pawl over a toothed wheel, red while it clacks.
      const k = reelFrom >= 0 ? 1 : Math.max(0, 1 - (nextReel - time) / REEL_EVERY);
      gear(g, x + 112, y, 9, 10, reelFrom >= 0 ? METER : BRASS, k * Math.PI * 2);
      g.fillStyle(NAVY_DARK, 1); g.fillCircle(x + 112, y, 3);
      if (takenUp) { g.fillStyle(METER, 0.9); g.fillRect(x - 126, y - 9, 4, 18); }
    },
  };
}

/** The well under the sheave: an iron-lipped throat in the paving, hazard-brassed, the moon's dark at its bottom. */
function drawWell(g: G, P: Pt, time: number, reeling: boolean): void {
  shadow(g, P.x, P.y + 6, WELL_R * 2.4, WELL_R * 0.9, 0.3);
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(P.x, P.y, WELL_R * 2.2, WELL_R * 1.55);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.fillStyle(i % 2 ? BRASS : BRASS_DARK, 0.9);
    g.fillTriangle(
      P.x + Math.cos(a) * WELL_R * 1.1, P.y + Math.sin(a) * WELL_R * 0.78,
      P.x + Math.cos(a + 0.2) * WELL_R * 1.1, P.y + Math.sin(a + 0.2) * WELL_R * 0.78,
      P.x + Math.cos(a + 0.1) * WELL_R * 0.94, P.y + Math.sin(a + 0.1) * WELL_R * 0.66,
    );
  }
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(P.x, P.y, WELL_R * 1.86, WELL_R * 1.3);
  g.fillStyle(LODE, 1); g.fillEllipse(P.x, P.y + 4, WELL_R * 1.6, WELL_R * 1.05);
  g.fillStyle(LODE_MID, 0.8); g.fillEllipse(P.x, P.y + 10, WELL_R * 1.1, WELL_R * 0.6);
  // Rungs down the throat and the violet glint of the moon below.
  for (let i = 0; i < 4; i++) { g.lineStyle(2, IRON, 0.8 - i * 0.15); g.lineBetween(P.x - 20 + i * 2, P.y - 20 + i * 12, P.x + 20 - i * 2, P.y - 20 + i * 12); }
  const pulse = 0.4 + Math.sin(time / (reeling ? 90 : 400)) * 0.2;
  g.fillStyle(LODE_GLINT, 0.25 * pulse); g.fillEllipse(P.x, P.y + 16, 40, 14);
  g.lineStyle(2, reeling ? METER : LODE_SHEEN, 0.6); g.strokeEllipse(P.x, P.y, WELL_R * 2, WELL_R * 1.4);
}

/** The iron collar every debtor wears where the chain meets them. */
function drawCollar(g: G, x: number, y: number): void {
  g.lineStyle(3, IRON, 1); g.strokeEllipse(x, y, 26, 9);
  g.lineStyle(1, IRON_LIT, 0.8); g.strokeEllipse(x, y - 1, 22, 6);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y + 4, 3);
}

/** The gantry: two riveted iron A-frames from the well's lip up to the sheave's axle. */
function drawGantry(g: G, P: Pt, axle: Pt): void {
  for (const s of [-1, 1]) {
    const fx = P.x + s * (WELL_R + 6);
    g.lineStyle(7, IRON_DARK, 1); g.lineBetween(fx, P.y + 4, axle.x + s * 10, axle.y);
    g.lineStyle(4, IRON, 1); g.lineBetween(fx, P.y + 4, axle.x + s * 10, axle.y);
    g.lineStyle(2, IRON, 1); g.lineBetween(fx - s * 20, P.y - 30, axle.x + s * 36, axle.y + 40);
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      g.fillStyle(BRASS_LIT, 0.9); g.fillCircle(fx + (axle.x + s * 10 - fx) * t, P.y + 4 + (axle.y - P.y - 4) * t, 1.6);
    }
    g.fillStyle(IRON_DARK, 1); g.fillRect(fx - 9, P.y, 18, 8);
  }
  g.lineStyle(5, IRON, 1); g.lineBetween(axle.x - 34, axle.y, axle.x + 34, axle.y);
}

/** The sheave: a spoked iron wheel with a brass rim, turning as the chain runs over it. */
function drawSheave(g: G, c: Pt, spin: number, reeling: boolean): void {
  glow(g, c.x, c.y, 60, reeling ? METER : BRASS_LIT, 0.05, 3);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(c.x, c.y, 30);
  g.lineStyle(5, BRASS_DARK, 1); g.strokeCircle(c.x, c.y, 28);
  g.lineStyle(2, BRASS, 1); g.strokeCircle(c.x, c.y, 26);
  for (let i = 0; i < 6; i++) {
    const a = spin + (i / 6) * Math.PI * 2;
    g.lineStyle(3, IRON, 1); g.lineBetween(c.x, c.y, c.x + Math.cos(a) * 24, c.y + Math.sin(a) * 24);
  }
  // The chain riding the groove over the top.
  g.lineStyle(3, IRON_LIT, 1);
  g.beginPath(); g.arc(c.x, c.y, 29, Math.PI, Math.PI * 2, false); g.strokePath();
  g.fillStyle(dim(BRASS, 0.2), 1); g.fillCircle(c.x, c.y, 7);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(c.x - 2, c.y - 2, 2.5);
  // The pawl, dropped into the teeth while the winch reels.
  g.lineStyle(4, reeling ? METER : IRON, 1); g.lineBetween(c.x + 40, c.y - 26, c.x + 22, c.y - 18);
}

export const FALLEN_PULLEY: GimmickDef = {
  id: ID,
  rules: 'You and he hang off one chain over the sheave: walk out to haul him in. A dash yanks the other end. The well crushes; the ratchet reels.',
  make,
};

