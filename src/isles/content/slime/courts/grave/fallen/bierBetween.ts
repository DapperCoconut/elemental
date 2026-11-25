import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { coffin, greyedGhost } from '../art';
import { BONE, BONE_DARK, BONE_LIT, CRAPE, CRAPE_LIT, GREY_LIT, IRON, IRON_LIT, LAMP, PETAL_LIT, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * The Bier Between — Lemuel Crossbar, Bearer-Captain of the Grave Court.
 *
 * Lemuel's six carry every coffin from the lych-gate to its grave and never let it touch the
 * ground. In the King's telling they carried the living too, and the coffin always went where it
 * was put: between a family and whoever came asking for them.
 *
 * A coffin on a wheeled bier rolls to stand at the midpoint between you and Lemuel, turned across
 * the line, and every shot either side fires at the other stops in its lid. Walk round it — it
 * rolls slower than you can circle. But the dead keep what they are given: each blow the coffin
 * takes is counted to whoever dealt it, and at six the lid flies up, the greyed sits up and gives
 * the blows back, a fan of bone at whoever gave the most (both, when even). Bait Lemuel into
 * shooting through it while you stay off the line. Halfway, it rolls faster and keeps only five.
 */

const ID = fallenId('grave', 'bier-between');
const BOX_R = 34;
const RETURN_WARN = 950;
const SHARD_DMG = 7;
const SHOVE_R = 46;

interface Volley { at: number; fire: number; aimAt: ('player' | 'npc')[] }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  let x = W / 2, y = (top + H) / 2;
  let ang = 0;
  const given = { player: 0, npc: 0 };
  let volley: Volley | null = null;
  let lidOpenAt = -9999;
  let restUntil = 0;
  let fast = false;
  let started = false;
  let roll = 0;
  let thumpAt = -9999;

  const keep = () => (fast ? 5 : 6);
  const handle: StrikeTarget = ctx.target({
    x, y: y - 10, r: BOX_R,
    onStruck: (by) => {
      if (volley) return;
      given[by] += 1;
      thumpAt = ctx.scene.time.now;
      ctx.sfx('drum-hit');
      if (given.player + given.npc >= keep()) {
        const now = ctx.scene.time.now;
        const aimAt: ('player' | 'npc')[] = given.player === given.npc ? ['player', 'npc'] : [given.player > given.npc ? 'player' : 'npc'];
        volley = { at: now, fire: now + tk.warn(RETURN_WARN), aimAt };
        ctx.sfx('curse-cast');
      }
    },
  });

  function giveBack(v: Volley, time: number): void {
    lidOpenAt = time;
    const both = v.aimAt.length > 1;
    for (const side of v.aimAt) {
      const f = side === 'player' ? player : npc;
      if (!alive(f)) continue;
      const base = Math.atan2(f.y - y, f.x - x);
      const n = both ? 3 : fast ? 7 : 5;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 0.16;
        tk.spawnBullet({ x, y: y - 14, angle: base + off, speed: 290, damage: SHARD_DMG, lifeMs: 2400, r: 6, color: BONE, hits: [f] });
      }
    }
    given.player = 0; given.npc = 0;
    restUntil = time + 1300;
    ctx.sfx('crystal-shatter');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; ctx.banner('THE DEAD KEEP WHAT THEY ARE GIVEN', '#e6dfc8'); }
      if (!fast && npc.hp < npc.maxHp * 0.5) { fast = true; ctx.banner('THE BEARERS QUICKEN', '#e6dfc8'); ctx.sfx('drum-hit'); }
      if (volley && time >= volley.fire) { giveBack(volley, time); volley = null; }
      // Roll toward the midpoint, turned across the line between the two.
      // Close quarters, the bearers stand still and let you at each other.
      const apart = dist(player.x, player.y, npc.x, npc.y);
      if (!volley && time >= restUntil && alive(player) && alive(npc) && apart > 170) {
        const mx = (player.x + npc.x) / 2, my = (player.y + npc.y) / 2;
        const d = dist(x, y, mx, my);
        const step = Math.min(d, (fast ? 118 : 82) * dt);
        if (d > 1) { x += ((mx - x) / d) * step; y += ((my - y) / d) * step; roll += step; }
        const want = Math.atan2(npc.y - player.y, npc.x - player.x) + Math.PI / 2;
        let da = Math.atan2(Math.sin(want - ang), Math.cos(want - ang));
        if (Math.abs(da) > Math.PI / 2) da = Math.atan2(Math.sin(want + Math.PI - ang), Math.cos(want + Math.PI - ang));
        ang += clamp(da, -2.2 * dt, 2.2 * dt);
        x = clamp(x, 60, W - 60); y = clamp(y, top + 50, H - 40);
        handle.moveTo(x, y - 10);
      }
      // It is heavy: a fighter it rolls into is pushed aside.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const d = dist(x, y, f.x, f.y);
        if (d < SHOVE_R && d > 0.1) ctx.nudge(f, ((f.x - x) / d) * (SHOVE_R - d), ((f.y - y) / d) * (SHOVE_R - d));
      }
    },

    npcSeek(): Pt | null {
      // When Lemuel has fed it more, step off the line so the coffin stops being between you.
      if (given.npc >= given.player && alive(player)) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        const side = Math.sin(ctx.scene.time.now / 2600) > 0 ? 1 : -1;
        const r = clamp(dist(player.x, player.y, npc.x, npc.y), 160, 280);
        const b = a + side * 1.0;
        return { x: clamp(player.x + Math.cos(b) * r, 60, W - 60), y: clamp(player.y + Math.sin(b) * r, top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g) {
      // The bier's ruts in the peat and the line it guards.
      if (alive(player) && alive(npc)) {
        g.lineStyle(1, BONE_DARK, 0.18);
        const n = 14;
        for (let i = 0; i < n; i += 2) {
          const a = i / n, b = (i + 1) / n;
          g.lineBetween(player.x + (npc.x - player.x) * a, player.y + (npc.y - player.y) * a, player.x + (npc.x - player.x) * b, player.y + (npc.y - player.y) * b);
        }
      }
      shadow(g, x + 6, y + 8, 120, 34, 0.34);
    },

    drawAir(g, time) {
      drawBier(g, x, y, ang, roll, time);
      const k = volley ? clamp((time - volley.at) / (volley.fire - volley.at), 0, 1) : 0;
      const jolt = time - thumpAt < 160 ? (1 - (time - thumpAt) / 160) * 3 : 0;
      const open = volley ? k * 0.4 : clamp(1 - (time - lidOpenAt) / 900, 0, 1) * 0.9;
      coffin(g, x, y - 18 - jolt + (volley ? Math.sin(time / 25) * 1.5 * k : 0), 92, 34, ang, open, true);
      if (volley) {
        // The greyed sits up, pointing at whom it will pay.
        greyedGhost(g, x, y - 26, 0.7 + k * 0.2, 0.5 + k * 0.5, time, 3, k);
        for (const side of volley.aimAt) {
          const f = side === 'player' ? player : npc;
          g.lineStyle(2, BONE_LIT, 0.25 + k * 0.5);
          g.lineBetween(x, y - 30, x + (f.x - x) * k, y - 30 + (f.y - y + 30) * k);
          g.lineStyle(2.5, BONE_LIT, 0.6 + k * 0.4); g.strokeCircle(f.x, f.y, 26 - k * 6);
        }
      }
      // Pips on the lid: blows kept, tinted by the giver.
      const n = keep();
      for (let i = 0; i < n; i++) {
        const px = x + (i - (n - 1) / 2) * 11, py = y - 52;
        g.fillStyle(0x000000, 0.45); g.fillCircle(px, py, 4.5);
        const col = i < given.player ? GREY_LIT : i < given.player + given.npc ? LAMP : 0;
        if (col) { g.fillStyle(col, 1); g.fillCircle(px, py, 3.4); }
        else { g.lineStyle(1, BONE_DARK, 0.9); g.strokeCircle(px, py, 3.4); }
      }
      if (given.player + given.npc >= n - 1 && !volley) glow(g, x, y - 20, 50, PETAL_LIT, 0.03 + Math.sin(time / 120) * 0.02, 3);
    },

    drawHud(g) {
      const y0 = top + 16;
      const plate = (px: number, count: number, col: number) => {
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(px - 10, y0 - 12, 104, 24, 7);
        g.fillStyle(col, 1); g.fillCircle(px, y0, 5);
        for (let i = 0; i < keep(); i++) {
          const bx = px + 16 + i * 14;
          g.fillStyle(i < count ? BONE : 0x2a2622, 1); g.fillRect(bx - 4, y0 - 2, 8, 4);
          g.fillCircle(bx - 4, y0, 2.4); g.fillCircle(bx + 4, y0, 2.4);
        }
      };
      plate(W / 2 - 120, given.player, GREY_LIT);
      plate(W / 2 + 22, given.npc, LAMP);
    },

    destroy() { handle.remove(); },
  };
}

/**
 * The wheeled bier: a black frame on two tall spoked iron wheels that turn as it rolls, carrying
 * poles out front and back, a crape pall hanging fringed over the frame's sides.
 */
function drawBier(g: G, x: number, y: number, ang: number, roll: number, time: number): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const at = (l: number, w: number): Pt => ({ x: x + ca * l - sa * w, y: y + sa * l + ca * w });
  // Carrying poles.
  for (const w of [-14, 14]) {
    const a = at(-66, w), b = at(66, w);
    g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(a.x, a.y - 8, b.x, b.y - 8);
    g.lineStyle(1.5, TIMBER_LIT, 0.6); g.lineBetween(a.x, a.y - 9, b.x, b.y - 9);
  }
  // Pall over the frame, fringed.
  const c0 = at(-50, -20), c1 = at(50, -20), c2 = at(50, 20), c3 = at(-50, 20);
  g.fillStyle(CRAPE, 1); g.fillPoints([c0, c1, c2, c3].map((p) => ({ x: p.x, y: p.y - 6 })), true);
  g.fillStyle(CRAPE_LIT, 0.6); g.fillPoints([c0, c1, at(50, -10), at(-50, -10)].map((p) => ({ x: p.x, y: p.y - 7 })), true);
  for (let i = 0; i <= 10; i++) {
    const p = at(-50 + i * 10, 20);
    g.lineStyle(1, BONE_DARK, 0.8); g.lineBetween(p.x, p.y - 6, p.x, p.y - 1 + Math.sin(time / 300 + i) * 0.8);
  }
  // Two tall wheels either side, spokes turning with the distance rolled.
  for (const w of [-24, 24]) {
    const c = at(0, w);
    g.fillStyle(IRON, 1); g.fillEllipse(c.x, c.y - 4, 34 * Math.abs(sa) + 8, 34);
    g.lineStyle(3, IRON_LIT, 1); g.strokeEllipse(c.x, c.y - 4, 34 * Math.abs(sa) + 8, 34);
    for (let s = 0; s < 6; s++) {
      const a = roll / 16 + (s / 6) * Math.PI * 2;
      g.lineStyle(1.5, dim(IRON_LIT, 0.1), 1);
      g.lineBetween(c.x, c.y - 4, c.x + Math.cos(a) * (17 * Math.abs(sa) + 4), c.y - 4 + Math.sin(a) * 17);
    }
    g.fillStyle(lit(IRON_LIT, 0.3), 1); g.fillCircle(c.x, c.y - 4, 3);
  }
  // Brass finials on the pole ends.
  for (const l of [-66, 66]) for (const w of [-14, 14]) { const p = at(l, w); g.fillStyle(0xe2b462, 1); g.fillCircle(p.x, p.y - 8, 2.5); }
}

export const FALLEN_BIER_BETWEEN: GimmickDef = {
  id: ID,
  rules: 'A coffin rolls to stand between you, stopping every shot. It keeps each blow; at six the dead sit up and fire them back at whoever gave most.',
  make,
};
