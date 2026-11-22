import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { poleBadge } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, COPPER, COPPER_DARK, COPPER_LIT, IRON_DARK, NORTH, NORTH_LIT, SOUTH, SOUTH_LIT, SPARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Polarity — Dr. Anode.
 *
 * Dr. Anode has wired the yard behind his laboratory into one great magnet: the coil wall down
 * the west side is north, the one down the east is south, and each fighter carries a pole of
 * their own, painted on a badge over their head. Unlike poles attract, like poles repel — and
 * that goes for the walls as much as for the two of you. A north fighter drifts east toward the
 * south wall, a south one west; and whoever the walls drag in is shocked and kicked off.
 *
 * Two brass switch-plates sit at the top and bottom of the yard: step on one and your pole
 * flips. Anode flips his own on a timer and knows what he is doing — if you are near your wall
 * he matches your pole and shoves you into it. Do it to him: match his pole while he is near his.
 */

const WALL = 64;
const PAD_R = 34;
const ZAP = 7;
const FLIP_WARN = 900;

interface Pole { north: boolean; lastFlip: number; onPad: boolean; lastZap: number; zapFx: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const midY = (top + H) / 2;
  const pads: Pt[] = [{ x: W / 2, y: top + 64 }, { x: W / 2, y: H - 54 }];
  const poles = new Map<Fighter, Pole>([
    [player, { north: true, lastFlip: -9999, onPad: false, lastZap: 0, zapFx: -9999 }],
    [npc, { north: false, lastFlip: -9999, onPad: false, lastZap: 0, zapFx: -9999 }],
  ]);
  const DRIFT = ctx.hard ? 54 : 44;
  const anodeEvery = ctx.hard ? 4300 : 5400;
  let nextAnode = 0;
  let anodeWarnAt = -1;
  let anodePlan = false;
  let started = false;

  const P = (f: Fighter) => poles.get(f) as Pole;
  /** The x of the wall that drags fighter `f` in: north fighters go east (to the south wall). */
  const unlikeWallX = (f: Fighter) => (P(f).north ? W : 0);
  const wallDist = (f: Fighter) => Math.abs(f.x - unlikeWallX(f));
  const hurt = (f: Fighter, amount: number) => { if (f === player) tk.hitPlayer(amount, f.x, f.y); else ctx.hit(f, amount, f.x, f.y); };

  function flip(f: Fighter, time: number, north: boolean): void {
    const p = P(f);
    if (p.north === north) return;
    p.north = north;
    p.lastFlip = time;
    ctx.float(f.x, f.y - 56, north ? 'NORTH' : 'SOUTH', north ? '#ff8a7a' : '#8ab4ff');
    ctx.sfx('magnet-pull');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextAnode = time + anodeEvery; }

      // Anode's switch: he decides, warns, then throws his own pole.
      if (anodeWarnAt < 0 && time >= nextAnode - FLIP_WARN && alive(npc)) {
        anodeWarnAt = time;
        // Near your wall: match you, and the repulsion drives you in. Otherwise: unlike, to draw you close.
        anodePlan = wallDist(player) < 300 ? P(player).north : !P(player).north;
        ctx.float(npc.x, npc.y - 64, 'ANODE THROWS HIS SWITCH', '#ffe2a8');
        ctx.sfx('electric-charge');
      }
      if (time >= nextAnode) {
        nextAnode = time + anodeEvery;
        anodeWarnAt = -1;
        if (alive(npc)) flip(npc, time, anodePlan);
      }

      // Switch-plates flip whoever steps onto them.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const p = P(f);
        const on = pads.some((q) => dist(q.x, q.y, f.x, f.y) < PAD_R);
        if (on && !p.onPad && time - p.lastFlip > 1100) { flip(f, time, !p.north); ctx.flash(f.x, f.y, p.north ? NORTH_LIT : SOUTH_LIT); }
        p.onPad = on;
      }

      // The walls: drift toward your unlike wall, harder near it; touch it and it shocks.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const p = P(f);
        const dir = p.north ? 1 : -1;
        const near = clamp(1 - wallDist(f) / 220, 0, 1);
        ctx.nudge(f, dir * (DRIFT + near * 50) * dt, 0);
        if (wallDist(f) < WALL && time - p.lastZap > 900) {
          p.lastZap = time;
          p.zapFx = time;
          hurt(f, ZAP);
          ctx.nudge(f, -dir * 110, 0);
          ctx.float(f.x, f.y - 44, 'SHOCKED', p.north ? '#8ab4ff' : '#ff8a7a');
          ctx.sfx('zap');
          ctx.flash(f.x, f.y, SPARK);
        }
      }

      // The two of you: unlike draw together, like shove apart.
      if (alive(player) && alive(npc)) {
        const dx = npc.x - player.x, dy = npc.y - player.y;
        const d = Math.hypot(dx, dy) || 1;
        const ux = dx / d, uy = dy / d;
        if (P(player).north !== P(npc).north) {
          if (d > 90) {
            const s = (24 + 64 * clamp(1 - d / 700, 0, 1)) * dt;
            ctx.nudge(player, ux * s, uy * s); ctx.nudge(npc, -ux * s, -uy * s);
          }
        } else if (d < 380) {
          const s = 150 * (1 - d / 380) * dt;
          ctx.nudge(player, -ux * s, -uy * s); ctx.nudge(npc, ux * s, uy * s);
        }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Being dragged into his own wall: off to a switch-plate.
      if (wallDist(npc) < 230) {
        const near = pads.reduce((b, q) => (dist(q.x, q.y, npc.x, npc.y) < dist(b.x, b.y, npc.x, npc.y) ? q : b), pads[0]);
        return { x: near.x, y: near.y };
      }
      // Otherwise keep to his own side of you — between you and your wall when he can, to shove you into it.
      const wx = unlikeWallX(player);
      const x = wx === W ? clamp(player.x - 180, 120, W - 120) : clamp(player.x + 180, 120, W - 120);
      return { x, y: clamp(player.y, top + 60, H - 50) };
    },

    drawGround(g, time) {
      // The field across the yard: faint lines bowing from the north wall to the south.
      for (let i = 0; i < 9; i++) {
        const yy = top + 40 + (i / 8) * (H - top - 80);
        const bow = (yy - midY) * 0.25;
        const ph = (time / 2400 + i * 0.11) % 1;
        g.lineStyle(1, dim(SPARK, 0.6), 0.12);
        g.beginPath(); g.moveTo(WALL, yy);
        for (let k = 1; k <= 16; k++) { const t = k / 16; g.lineTo(WALL + (W - WALL * 2) * t, yy + bow * 4 * t * (1 - t)); }
        g.strokePath();
        const t = ph;
        g.fillStyle(SPARK, 0.25); g.fillCircle(WALL + (W - WALL * 2) * t, yy + bow * 4 * t * (1 - t), 1.6);
      }
      // The coil walls.
      for (const [x0, north] of [[0, true], [W - WALL, false]] as [number, boolean][]) {
        const c = north ? NORTH : SOUTH;
        g.fillStyle(dim(c, 0.6), 1); g.fillRect(x0, top, WALL, H - top);
        g.fillStyle(dim(c, 0.35), 1); g.fillRect(x0 + (north ? WALL - 14 : 0), top, 14, H - top);
        for (let y = top + 6; y < H; y += 9) {
          g.lineStyle(3, COPPER_DARK, 1); g.lineBetween(x0 + 6, y, x0 + WALL - 6, y + 4);
          g.lineStyle(1.5, COPPER_LIT, 0.8); g.lineBetween(x0 + 6, y - 1, x0 + WALL - 6, y + 3);
        }
        const hot = [player, npc].some((f) => alive(f) && unlikeWallX(f) === (north ? 0 : W) && wallDist(f) < 220);
        if (hot) { g.fillStyle(lit(c, 0.3), 0.12 + Math.sin(time / 80) * 0.06); g.fillRect(x0, top, WALL, H - top); }
        // The painted letter, big, three times down the wall.
        for (const yy of [top + 120, midY, H - 120]) {
          g.fillStyle(IRON_DARK, 0.8); g.fillCircle(x0 + WALL / 2, yy, 20);
          poleBadge(g, x0 + WALL / 2, yy, north, 1);
        }
      }
      // The switch-plates.
      for (const q of pads) {
        g.fillStyle(0x000000, 0.35); g.fillEllipse(q.x + 3, q.y + 6, PAD_R * 2.4, PAD_R * 1.2);
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(q.x, q.y, PAD_R + 4);
        g.fillStyle(BRASS, 1); g.fillCircle(q.x, q.y, PAD_R);
        g.lineStyle(2, BRASS_LIT, 0.8); g.strokeCircle(q.x, q.y, PAD_R - 6);
        const a = time / 1200;
        g.fillStyle(NORTH, 1); g.fillTriangle(q.x + Math.cos(a) * 22, q.y + Math.sin(a) * 22, q.x + Math.cos(a + 1.6) * 7, q.y + Math.sin(a + 1.6) * 7, q.x + Math.cos(a - 1.6) * 7, q.y + Math.sin(a - 1.6) * 7);
        g.fillStyle(SOUTH, 1); g.fillTriangle(q.x - Math.cos(a) * 22, q.y - Math.sin(a) * 22, q.x + Math.cos(a + 1.6) * 7, q.y + Math.sin(a + 1.6) * 7, q.x + Math.cos(a - 1.6) * 7, q.y + Math.sin(a - 1.6) * 7);
        g.fillStyle(BRASS_LIT, 1); g.fillCircle(q.x, q.y, 4);
      }
      // Drift arrows under each fighter, pointing at the wall that wants them.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const dir = P(f).north ? 1 : -1;
        const c = P(f).north ? SOUTH_LIT : NORTH_LIT;
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 500) + i / 3) % 1;
          const ax = f.x + dir * (20 + ph * 40), ay = f.y + 18;
          g.fillStyle(c, 0.5 * (1 - ph)); g.fillTriangle(ax + dir * 8, ay, ax - dir * 2, ay - 6, ax - dir * 2, ay + 6);
        }
      }
    },

    drawAir(g, time) {
      // The bond between the two of you: drawn lines if attracting, bowed-apart lines if repelling.
      if (alive(player) && alive(npc)) {
        const unlike = P(player).north !== P(npc).north;
        const dx = npc.x - player.x, dy = npc.y - player.y;
        const d = Math.hypot(dx, dy) || 1;
        const nx = -dy / d, ny = dx / d;
        if (unlike) {
          for (const off of [-18, 0, 18]) {
            g.lineStyle(1.5, off ? COPPER : SPARK, 0.35 + Math.sin(time / 120 + off) * 0.15);
            g.beginPath(); g.moveTo(player.x, player.y - 10);
            for (let k = 1; k <= 12; k++) { const t = k / 12; const b = off * 4 * t * (1 - t); g.lineTo(player.x + dx * t + nx * b, player.y - 10 + dy * t + ny * b); }
            g.strokePath();
          }
        } else if (d < 380) {
          for (const f of [player, npc]) {
            const s = f === player ? -1 : 1;
            for (const off of [-1, 1]) {
              g.lineStyle(1.5, P(f).north ? NORTH_LIT : SOUTH_LIT, 0.4 * (1 - d / 380));
              g.beginPath(); g.arc(f.x, f.y - 10, 30, Math.atan2(dy * s, dx * s) + off * 0.4, Math.atan2(dy * s, dx * s) + off * 1.4, off < 0); g.strokePath();
            }
          }
        }
      }
      // Pole badges, and a spinning switch over Anode while he decides.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const p = P(f);
        const fresh = clamp(1 - (time - p.lastFlip) / 400, 0, 1);
        poleBadge(g, f.x, f.y - 52 - fresh * 6, p.north, 1);
        if (fresh > 0) { g.lineStyle(2, 0xffffff, fresh); g.strokeCircle(f.x, f.y - 52, 12 + (1 - fresh) * 18); }
        if (time - p.zapFx < 300) {
          const k = (time - p.zapFx) / 300;
          const wx = unlikeWallX(f) === 0 ? WALL : W - WALL;
          g.lineStyle(3 * (1 - k), SPARK, 1 - k);
          let px = wx, py = f.y;
          for (let i = 1; i <= 6; i++) { const nx = wx + (f.x - wx) * (i / 6), ny = f.y + (i % 2 ? 10 : -10) * (1 - i / 6); g.lineBetween(px, py, nx, ny); px = nx; py = ny; }
        }
      }
      if (anodeWarnAt >= 0 && alive(npc)) {
        const k = clamp((time - anodeWarnAt) / FLIP_WARN, 0, 1);
        const a = time / 60;
        glow(g, npc.x, npc.y - 52, 22, anodePlan ? NORTH_LIT : SOUTH_LIT, 0.08 * k, 2);
        g.lineStyle(2, anodePlan ? NORTH_LIT : SOUTH_LIT, 0.4 + k * 0.5);
        g.beginPath(); g.arc(npc.x, npc.y - 52, 16, a, a + Math.PI * 1.3, false); g.strokePath();
      }
    },
  };
}

export const POLARITY: GimmickDef = {
  id: 'lodestar-polarity',
  rules: 'Each fighter carries a pole: unlike attract, like repel — each other and the coil walls (N west, S east). The wall that drags you in shocks. Step on a switch-plate to flip.',
  make,
};
