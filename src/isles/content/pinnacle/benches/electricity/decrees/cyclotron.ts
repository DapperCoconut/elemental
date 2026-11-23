import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { OBS, slab } from '../../../../../art/PinnacleArt';
import { COPPER, COPPER_DARK, COPPER_LIT, SIDE_NPC, SIDE_PLAYER, VOLT, bolt, inductionCoil, sparks } from '../art';
import { type Who, WHO, alive, clamp, dist, other, segDist, stepOf } from '../util';

/**
 * DECREE OF THE CYCLOTRON — Councilor Ferrand Lodemoor, Seat of the Lode (magnet).
 *
 * Lodemoor wrote the clause that let the Grid *take* metal — every nail, hinge and ploughshare
 * on Voltreach drawn up the wires to wind the Coil. His room is an accelerator: a ring of copper
 * rails round the floor, and three great induction coils riding it, round and round. Strike a
 * coil — any blow, shot, sweep or fist — and it takes what you gave it, winds it up and fires it
 * back out as a magnetised slug at the one you are fighting, harder than you hit it. A coil spends
 * itself and has to wind up again. Step into a coil's bore and the field carries you round the
 * ring with it.
 *
 * A perfected Magnet bot fights from beside the coils, putting one between himself and you. The
 * turn: a coil fires at whoever is *not* its striker — beat him to the coil he is guarding, and
 * every slug he was saving is yours. The aim line shows before the slug: walk off it.
 */

const COIL_R = 34;
const BORE_R = 26;
const AIM_MS = 420;
const SLUG_SPEED = 760;

interface Coil {
  phase: number;
  x: number; y: number; vx: number; vy: number;
  charge: number;
  /** Firing: who struck it, the locked aim point and when it fires. */
  aim: { by: Who; at: number; lx: number; ly: number; amount: number } | null;
  target: StrikeTarget | null;
  flash: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const CX = W / 2, CY = (top + H) / 2 + 12;
  const RX = 330, RY = 178;
  const OMEGA = ctx.hard ? 0.4 : 0.32;
  const RECHARGE = ctx.hard ? 2.0 : 2.4;
  const aimMs = ctx.tk.warn(AIM_MS);
  let angle = 0;
  let started = false;
  const coils: Coil[] = [0, 1, 2].map((i) => ({
    phase: (i / 3) * Math.PI * 2, x: CX, y: CY, vx: 0, vy: 0, charge: 1, aim: null, target: null, flash: 0,
  }));
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const colorOf = (w: Who): number => (w === 'player' ? SIDE_PLAYER : SIDE_NPC);
  const riding: Record<Who, boolean> = { player: false, npc: false };

  const place = (c: Coil) => {
    const a = angle + c.phase;
    c.x = CX + Math.cos(a) * RX; c.y = CY + Math.sin(a) * RY;
    c.vx = -Math.sin(a) * RX * OMEGA; c.vy = Math.cos(a) * RY * OMEGA;
  };
  coils.forEach(place);

  for (const c of coils) {
    c.target = ctx.target({
      x: c.x, y: c.y, r: COIL_R + 4,
      onStruck: (by, amount) => {
        if (c.charge < 1 || c.aim) return;
        const foe = fighter(other(by));
        c.aim = { by, at: ctx.scene.time.now + aimMs, lx: foe.x, ly: foe.y, amount: Math.max(6, amount) };
        c.flash = ctx.scene.time.now;
        ctx.sfx('magnet-pull');
      },
    });
  }

  const fire = (c: Coil) => {
    if (!c.aim) return;
    const { by, lx, ly, amount } = c.aim;
    const foe = fighter(other(by));
    const ang = Math.atan2(ly - c.y, lx - c.x);
    ctx.tk.spawnBullet({
      x: c.x + Math.cos(ang) * (COIL_R + 6), y: c.y + Math.sin(ang) * (COIL_R + 6), angle: ang, speed: SLUG_SPEED,
      damage: clamp(Math.round(amount * 1.6), 9, 26), r: 8, color: colorOf(by), lifeMs: 1800, hits: [foe],
    });
    ctx.sfx('musket');
    ctx.flash(c.x, c.y, colorOf(by));
    c.aim = null;
    c.charge = 0;
  };

  return {
    update(time, dt) {
      const s = stepOf(dt);
      if (!started) {
        started = true;
        ctx.banner('DECREE OF THE CYCLOTRON — STRIKE A COIL, AND IT STRIKES BACK FOR YOU', '#ffe14a');
      }
      angle += OMEGA * s;
      for (const c of coils) {
        place(c);
        c.target?.moveTo(c.x, c.y);
        if (c.charge < 1) c.charge = Math.min(1, c.charge + s / RECHARGE);
        if (c.aim) {
          // Track the foe until the last instant, then lock — the line is the warning.
          const foe = fighter(other(c.aim.by));
          if (c.aim.at - time > 140 && alive(foe)) { c.aim.lx = foe.x; c.aim.ly = foe.y; }
          if (time >= c.aim.at) fire(c);
        }
      }
      // The field carries whoever stands in a bore.
      for (const w of WHO) {
        const f = fighter(w);
        riding[w] = false;
        if (!alive(f)) continue;
        for (const c of coils) {
          if (dist(f.x, f.y, c.x, c.y) < BORE_R) {
            ctx.nudge(f, c.vx * s * 0.9, c.vy * s * 0.9);
            riding[w] = true;
            break;
          }
        }
      }
    },
    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      // Off a coil's aim line first.
      for (const c of coils) {
        if (c.aim && c.aim.by === 'player') {
          if (segDist(n.x, n.y, c.x, c.y, c.aim.lx + (c.aim.lx - c.x), c.aim.ly + (c.aim.ly - c.y)) < 60) {
            const a = Math.atan2(c.aim.ly - c.y, c.aim.lx - c.x) + Math.PI / 2;
            return { x: clamp(n.x + Math.cos(a) * 130, 60, W - 60), y: clamp(n.y + Math.sin(a) * 130, top + 50, H - 50) };
          }
        }
      }
      // Guard a ready coil: stand on its far side from the player so it is between you.
      let best: Coil | null = null, bd = Infinity;
      for (const c of coils) {
        if (c.charge < 1 || c.aim) continue;
        const d = dist(n.x, n.y, c.x, c.y);
        if (d < bd && d < 420) { bd = d; best = c; }
      }
      if (!best) return null;
      const a = Math.atan2(best.y - p.y, best.x - p.x);
      return { x: clamp(best.x + Math.cos(a) * (COIL_R + 26), 50, W - 50), y: clamp(best.y + Math.sin(a) * (COIL_R + 26), top + 40, H - 40) };
    },
    drawGround(g, time) {
      const t = time / 1000;
      // The accelerator ring: a bed of black glass, twin copper rails, sleepers, and eight
      // quadrupole magnets in black-glass housings round it.
      g.lineStyle(56, OBS.glass, 0.55);
      g.strokeEllipse(CX, CY, RX * 2, RY * 2);
      g.lineStyle(2, OBS.edge, 0.25); g.strokeEllipse(CX, CY, RX * 2 + 56, RY * 2 + 56); g.strokeEllipse(CX, CY, RX * 2 - 56, RY * 2 - 56);
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const ix = CX + Math.cos(a) * (RX - 20), iy = CY + Math.sin(a) * (RY - 20);
        const ox = CX + Math.cos(a) * (RX + 20), oy = CY + Math.sin(a) * (RY + 20);
        g.lineStyle(3, COPPER_DARK, 0.6); g.lineBetween(ix, iy, ox, oy);
      }
      for (const off of [-16, 16]) {
        g.lineStyle(4, COPPER_DARK, 1); g.strokeEllipse(CX, CY, (RX + off) * 2, (RY + off) * 2);
        g.lineStyle(1.5, COPPER_LIT, 0.7); g.strokeEllipse(CX, CY, (RX + off) * 2 - 1, (RY + off) * 2 - 1);
      }
      // Current racing round the rails, the way the coils go.
      for (let k = 0; k < 10; k++) {
        const a = angle * 1.8 + (k / 10) * Math.PI * 2;
        const x = CX + Math.cos(a) * RX, y = CY + Math.sin(a) * RY;
        g.fillStyle(VOLT, 0.12); g.fillCircle(x, y, 12);
        g.fillStyle(VOLT, 0.6); g.fillCircle(x, y, 2.5);
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const x = CX + Math.cos(a) * (RX + 46), y = CY + Math.sin(a) * (RY + 40);
        slab(g, x, y + 12, 38, 26);
        g.fillStyle(i % 2 ? COPPER : COPPER_DARK, 1); g.fillRect(x - 13, y - 8, 26, 6);
        g.lineStyle(1, COPPER_LIT, 0.8);
        for (let k = 0; k < 6; k++) g.lineBetween(x - 12 + k * 4.6, y - 8, x - 12 + k * 4.6, y - 2);
        g.fillStyle(VOLT, 0.3 + 0.3 * Math.sin(t * 2 + i)); g.fillCircle(x, y + 4, 2);
      }
      // Aim lines: the slug's path, brightening to the shot.
      for (const c of coils) {
        if (!c.aim) continue;
        const k = clamp(1 - (c.aim.at - time) / aimMs, 0, 1);
        const a = Math.atan2(c.aim.ly - c.y, c.aim.lx - c.x);
        const col = colorOf(c.aim.by);
        g.lineStyle(18, col, 0.05 + k * 0.12); g.lineBetween(c.x, c.y, c.x + Math.cos(a) * 1100, c.y + Math.sin(a) * 1100);
        g.lineStyle(2, col, 0.4 + k * 0.5); g.lineBetween(c.x, c.y, c.x + Math.cos(a) * 1100, c.y + Math.sin(a) * 1100);
      }
      for (const c of coils) {
        const charging = c.aim ? 1 : c.charge;
        const col = c.aim ? colorOf(c.aim.by) : VOLT;
        inductionCoil(g, c.x, c.y, COIL_R, charging, angle * 4 + c.phase, col);
        // A ready coil wears a little ring of sparks; a spent one a winding arc that grows.
        if (c.charge >= 1 && !c.aim) {
          g.lineStyle(1.5, VOLT, 0.35 + 0.25 * Math.sin(t * 5 + c.phase)); g.strokeCircle(c.x, c.y, COIL_R + 14);
        } else if (!c.aim) {
          g.lineStyle(3, VOLT, 0.7); g.beginPath(); g.arc(c.x, c.y, COIL_R + 12, -Math.PI / 2, -Math.PI / 2 + c.charge * Math.PI * 2, false); g.strokePath();
        }
        if (time - c.flash < 300) sparks(g, c.x, c.y, 40, Math.floor(time / 40) + c.phase * 10, col, 1 - (time - c.flash) / 300);
      }
    },
    drawAir(g, time) {
      // Field lines round a rider, and the arc from a firing coil's winding.
      for (const w of WHO) {
        if (!riding[w]) continue;
        const f = fighter(w);
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 500) + i / 3) % 1;
          g.lineStyle(1.5, colorOf(w), 0.6 * (1 - ph)); g.strokeEllipse(f.x, f.y, 40 + ph * 30, 20 + ph * 14);
        }
      }
      for (const c of coils) {
        if (!c.aim) continue;
        const a = Math.atan2(c.aim.ly - c.y, c.aim.lx - c.x);
        bolt(g, c.x, c.y, c.x + Math.cos(a) * (COIL_R + 18), c.y + Math.sin(a) * (COIL_R + 18), Math.floor(time / 40) + c.phase, 1.6, colorOf(c.aim.by), 0.9, 1);
      }
    },
    drawHud(g) {
      const cx = W / 2, cy = top + 18;
      g.fillStyle(OBS.glass, 0.85); g.fillRoundedRect(cx - 66, cy - 11, 132, 22, 8);
      g.lineStyle(1.5, COPPER, 0.9); g.strokeRoundedRect(cx - 66, cy - 11, 132, 22, 8);
      coils.forEach((c, i) => {
        const x = cx - 40 + i * 40;
        g.lineStyle(4, COPPER_DARK, 1); g.strokeCircle(x, cy, 7);
        g.lineStyle(3, c.aim ? (c.aim.by === 'player' ? SIDE_PLAYER : SIDE_NPC) : VOLT, c.charge >= 1 ? 1 : 0.5);
        g.beginPath(); g.arc(x, cy, 7, -Math.PI / 2, -Math.PI / 2 + c.charge * Math.PI * 2, false); g.strokePath();
      });
    },
    destroy() { for (const c of coils) { c.target?.remove(); c.target = null; } },
  };
}

export const DECREE_CYCLOTRON: GimmickDef = {
  id: 'bench-electricity-cyclotron',
  rules: 'Three induction coils ride a ring round the floor. Strike one and it fires a slug at your foe, harder than you hit it. Its bore carries you.',
  make,
};
