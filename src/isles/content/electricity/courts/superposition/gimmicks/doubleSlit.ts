import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { ARC, ARC_HOT, BASALT, BASALT_DARK, BASALT_LIT, BOTH, BOTH_LIT, BRASS, BRASS_DARK, COPPER, COPPER_DARK, STATE_A, STATE_B } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Double Slit — Experimenter Young.
 *
 * A basalt wall runs down the middle of the room with two slits in it, and nobody crosses except
 * through a slit. On each side of the wall, against it between the slits, is a brass plate: the
 * trigger of *the Source*. Step on your plate and the Source fires a wave through both slits at
 * the far side of the wall, where it interferes — bright fringes and dark fringes fan out from
 * between the slits. A breath later the bright fringes strike; the dark fringes are untouched.
 *
 * The wall stops shots too, and a shot fired through a slit does not come out a shot: it comes out
 * a wave, and a breath later its own bright fringes strike the far side (only the firer's foe is
 * hurt by them). Shots through the slits close together pile into one wave.
 *
 * Young keeps the wall between you and fires the Source from his side on a clock. Walk the dark
 * bands. Or come through a slit and fight him on his own side, where his waves cannot reach — and
 * step on the plate there yourself while he is caught in the fringes on yours.
 */

const WALL_HALF = 14;
const SLIT_HALF = 40;
const FRINGE = 0.34;
const WARN_MS = 1300;
const STRIKE_DMG = 14;
const PLATE_R = 30;
const PLATE_CD = 6500;
const NEAR_SAFE = 60;
/** A shot's wave: how fast its fringes strike, how far they reach, and the most a pile-up deals. */
const SHOT_WARN_MS = 520;
const SHOT_REACH = 420;
const SHOT_MAX_DMG = 24;

interface Wave {
  /** Which side the wave lands on: -1 = left of the wall, +1 = right. */
  side: number;
  offset: number;
  bornAt: number;
  firesAt: number;
  dealt: boolean;
  /** Fired by the player's plate or the player's shot (so it can hurt Young). */
  byPlayer: boolean;
  /** Made of shots through a slit: hurts only the firer's foe, short reach. */
  shot: boolean;
  dmg: number;
  reach: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const WX = W / 2;
  const midY = (top + H) / 2;
  const slits = [midY - 120, midY + 120];
  const source: Pt = { x: WX, y: midY };
  const plates: Pt[] = [{ x: WX - 46, y: midY }, { x: WX + 46, y: midY }];
  const plateReady = [0, 0];
  const lastSide = new Map<Fighter, number>([[player, Math.sign(player.x - WX) || -1], [npc, Math.sign(npc.x - WX) || 1]]);
  const waves: Wave[] = [];
  const fireEvery = ctx.hard ? 3900 : 4800;
  let nextFire = 0;
  let started = false;

  const inSlit = (y: number) => slits.some((s) => Math.abs(y - s) < SLIT_HALF);
  /** Bright fringe at (x, y) for a wave? */
  const bright = (w: Wave, x: number, y: number) => {
    if (Math.sign(x - WX) !== w.side || Math.abs(x - WX) < NEAR_SAFE) return false;
    if (dist(x, y, WX + w.side * NEAR_SAFE, source.y) > w.reach) return false;
    const a = Math.atan2(y - source.y, Math.abs(x - WX) - NEAR_SAFE);
    const ph = (a / FRINGE + w.offset) % 1;
    return (ph + 1) % 1 < 0.5;
  };

  function fire(side: number, time: number, byPlayer: boolean): void {
    waves.push({ side, offset: Math.random(), bornAt: time, firesAt: time + ctx.tk.warn(WARN_MS), dealt: false, byPlayer, shot: false, dmg: STRIKE_DMG, reach: 900 });
    ctx.sfx('beam-charge');
  }

  /**
   * Shots at the wall: a shot in a slit is taken out of the air and becomes (or joins) a wave on
   * the far side; one striking the basalt just stops.
   */
  function catchShots(time: number): void {
    for (const sh of ctx.shotsNear(WX, midY, (H - top) / 2 + 30)) {
      if (Math.abs(sh.x - WX) > WALL_HALF + 6) continue;
      sh.block();
      if (!inSlit(sh.y)) continue;
      const firer = sh.owner === 'player' ? player : npc;
      const from = Math.sign(firer.x - WX) || -(Math.sign(Math.cos(ctx.facing(firer))) || 1);
      const side = -from;
      const byPlayer = sh.owner === 'player';
      const dmg = Math.max(3, Math.round(sh.damage));
      const pending = waves.find((w) => w.shot && !w.dealt && w.side === side && w.byPlayer === byPlayer);
      if (pending) { pending.dmg = Math.min(SHOT_MAX_DMG, pending.dmg + dmg); continue; }
      waves.push({ side, offset: Math.random(), bornAt: time, firesAt: time + ctx.tk.warn(SHOT_WARN_MS), dealt: false, byPlayer, shot: true, dmg: Math.min(SHOT_MAX_DMG, dmg), reach: SHOT_REACH });
      ctx.flash(WX, sh.y, BOTH_LIT);
      ctx.sfx('crystal-chime');
    }
  }

  function wallBlock(f: Fighter): void {
    if (!alive(f)) return;
    const dx = f.x - WX;
    if (Math.abs(dx) >= WALL_HALF + 20) { lastSide.set(f, Math.sign(dx)); return; }
    if (inSlit(f.y)) { if (Math.abs(dx) > 2) lastSide.set(f, Math.sign(dx)); return; }
    // In the wall's band and not in a slit: back out to the side they came from.
    const s = lastSide.get(f) ?? (Math.sign(dx) || 1);
    const want = WX + s * (WALL_HALF + 20);
    ctx.nudge(f, want - f.x, 0);
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextFire = time + 2600; }
      wallBlock(player);
      wallBlock(npc);
      catchShots(time);
      // Young's Source fires from his side at yours.
      if (time >= nextFire && alive(npc)) {
        nextFire = time + fireEvery;
        const side = -(Math.sign(npc.x - WX) || 1);
        fire(side, time, false);
        ctx.float(npc.x, npc.y - 50, 'SOURCE!', '#d2c0ff');
      }
      // The plates.
      plates.forEach((p, i) => {
        if (time < plateReady[i]) return;
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, p.x, p.y) > PLATE_R) continue;
          plateReady[i] = time + PLATE_CD;
          const side = i === 0 ? 1 : -1;
          fire(side, time, f === player);
          ctx.float(p.x, p.y - 30, 'CLICK', '#f4dc94');
          ctx.sfx('gear-turn');
          if (f === npc) nextFire = Math.max(nextFire, time + 2000);
          break;
        }
      });
      // Strikes.
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        if (!w.dealt && time >= w.firesAt) {
          w.dealt = true;
          ctx.sfx('beam-fire');
          // A shot's wave spares whoever fired it; the Source's strikes everyone in a bright band.
          if (alive(player) && !(w.shot && w.byPlayer) && bright(w, player.x, player.y)) ctx.tk.hitPlayer(w.dmg, player.x, player.y);
          if (alive(npc) && !(w.shot && !w.byPlayer) && bright(w, npc.x, npc.y)) { ctx.hit(npc, w.dmg, npc.x, npc.y); if (w.byPlayer) ctx.float(npc.x, npc.y - 44, 'BRIGHT FRINGE', '#ffffff'); }
        }
        if (time > w.firesAt + 500) waves.splice(i, 1);
      }
    },

    npcSeek() {
      const ps = Math.sign(player.x - WX) || -1;
      const ns = Math.sign(npc.x - WX) || 1;
      // Plate ready on his side and the player over the wall: use it.
      const myPlate = ns < 0 ? 0 : 1;
      if (ps !== ns && ctx.scene.time.now >= plateReady[myPlate] && ctx.scene.time.now < nextFire - 1500) return plates[myPlate];
      if (ps === ns) {
        // Wrong side: back through the nearest slit.
        const sy = slits.reduce((b, s) => (Math.abs(s - npc.y) < Math.abs(b - npc.y) ? s : b), slits[0]);
        if (Math.abs(npc.x - WX) < 40 && Math.abs(npc.y - sy) < SLIT_HALF - 8) return { x: WX - ps * 120, y: sy };
        return { x: WX + ps * 40, y: sy };
      }
      // Across the wall, off the slits, roughly level with the player.
      let y = clamp(player.y + Math.sin(ctx.scene.time.now / 1500) * 80, top + 60, H - 50);
      if (inSlit(y)) y += y < midY ? -SLIT_HALF : SLIT_HALF;
      return { x: WX + ns * 230, y: clamp(y, top + 60, H - 50) };
    },

    drawGround(g, time) {
      // Fringe telegraphs and strikes.
      for (const w of waves) {
        const k = clamp((time - w.bornAt) / Math.max(1, w.firesAt - w.bornAt), 0, 1);
        const struck = time >= w.firesAt;
        const reach = w.reach;
        const n = Math.ceil(Math.PI / 2 / FRINGE) + 2;
        for (let j = -n; j <= n; j++) {
          // Each bright band: from a0 to a1 in angle off the wall normal.
          const a0 = (j - w.offset) * FRINGE, a1 = a0 + FRINGE * 0.5;
          if (a1 < -Math.PI / 2 || a0 > Math.PI / 2) continue;
          const lo = clamp(a0, -Math.PI / 2, Math.PI / 2), hi = clamp(a1, -Math.PI / 2, Math.PI / 2);
          const base = w.side > 0 ? 0 : Math.PI;
          const s0 = w.side > 0 ? lo : -lo, s1 = w.side > 0 ? hi : -hi;
          const ang0 = wrapAngle(base + s0), ang1 = wrapAngle(base + s1);
          const ox = source.x + w.side * NEAR_SAFE;
          const color = w.side > 0 ? STATE_B : STATE_A;
          if (struck) {
            const f = clamp(1 - (time - w.firesAt) / 500, 0, 1);
            g.fillStyle(lit(color, 0.5), 0.55 * f);
          } else {
            g.fillStyle(color, 0.08 + k * 0.2);
          }
          g.beginPath(); g.moveTo(ox, source.y);
          g.lineTo(ox + Math.cos(ang0) * reach, source.y + Math.sin(ang0) * reach);
          g.lineTo(ox + Math.cos(ang1) * reach, source.y + Math.sin(ang1) * reach);
          g.closePath(); g.fillPath();
          if (!struck) {
            g.lineStyle(1, lit(color, 0.4), 0.2 + k * 0.4);
            g.lineBetween(ox, source.y, ox + Math.cos(ang0) * reach, source.y + Math.sin(ang0) * reach);
          }
        }
        // A shot's wave: its reach drawn as a dashed rim.
        if (w.shot && !struck) {
          const ox = source.x + w.side * NEAR_SAFE;
          const base = w.side > 0 ? 0 : Math.PI;
          g.lineStyle(1.5, BOTH_LIT, 0.25 + k * 0.4);
          for (let q = 0; q < 12; q += 2) {
            const a0 = base - Math.PI / 2 + (q / 12) * Math.PI, a1 = base - Math.PI / 2 + ((q + 1) / 12) * Math.PI;
            g.beginPath(); g.arc(ox, source.y, reach, a0, a1, false); g.strokePath();
          }
        }
        // Wavefronts rolling out of the slits as it charges.
        if (!struck) {
          for (const sy of slits) for (let r = 0; r < 4; r++) {
            const rad = ((time / 4 + r * 60) % 240) + 10;
            g.lineStyle(1.2, BOTH_LIT, 0.3 * (1 - rad / 250));
            g.beginPath(); g.arc(WX, sy, rad, w.side > 0 ? -Math.PI / 2 : Math.PI / 2, w.side > 0 ? Math.PI / 2 : Math.PI * 1.5, false); g.strokePath();
          }
        }
      }
      // The plates.
      plates.forEach((p, i) => {
        const ready = time >= plateReady[i];
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(p.x, p.y, PLATE_R - 4);
        g.fillStyle(ready ? BRASS : dim(BRASS, 0.4), 1); g.fillCircle(p.x, p.y, PLATE_R - 8);
        g.lineStyle(2, ready ? BOTH_LIT : 0x555555, ready ? 0.6 + Math.sin(time / 200) * 0.3 : 0.4); g.strokeCircle(p.x, p.y, PLATE_R - 4);
        // Two slits and an arrow toward the far side.
        const d = i === 0 ? 1 : -1;
        g.fillStyle(0x1a1410, 1); g.fillRect(p.x - 4, p.y - 9, 2, 7); g.fillRect(p.x - 4, p.y + 2, 2, 7);
        g.fillTriangle(p.x + d * 4, p.y - 5, p.x + d * 4, p.y + 5, p.x + d * 12, p.y);
        if (!ready) {
          const k = 1 - (plateReady[i] - time) / PLATE_CD;
          g.lineStyle(3, BRASS, 0.8); g.beginPath(); g.arc(p.x, p.y, PLATE_R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      });
    },

    drawAir(g, time) {
      // The wall, in three lengths between the slits.
      const runs: [number, number][] = [[top, slits[0] - SLIT_HALF], [slits[0] + SLIT_HALF, slits[1] - SLIT_HALF], [slits[1] + SLIT_HALF, H]];
      for (const [y0, y1] of runs) {
        g.fillStyle(BASALT_DARK, 1); g.fillRect(WX - WALL_HALF, y0, WALL_HALF * 2, y1 - y0);
        for (let y = y0; y < y1; y += 16) {
          g.fillStyle(((y / 16) | 0) % 2 ? BASALT : BASALT_LIT, 1); g.fillRect(WX - WALL_HALF + 2, y + 1, WALL_HALF * 2 - 4, Math.min(14, y1 - y - 1));
        }
        g.fillStyle(COPPER_DARK, 1); g.fillRect(WX - WALL_HALF - 2, y0, 3, y1 - y0); g.fillRect(WX + WALL_HALF - 1, y0, 3, y1 - y0);
        g.fillStyle(COPPER, 1); g.fillRect(WX - WALL_HALF - 2, y0, 1.5, y1 - y0);
      }
      // Slit jambs: brass horns, and the light pouring through when a wave is charging.
      const charging = waves.some((w) => time < w.firesAt);
      for (const sy of slits) {
        for (const e of [-1, 1]) {
          g.fillStyle(BRASS_DARK, 1); g.fillRect(WX - WALL_HALF - 4, sy + e * SLIT_HALF - (e > 0 ? 0 : 6), WALL_HALF * 2 + 8, 6);
          g.fillStyle(BRASS, 1); g.fillRect(WX - WALL_HALF - 4, sy + e * SLIT_HALF - (e > 0 ? 0 : 6), WALL_HALF * 2 + 8, 3);
        }
        if (charging) glow(g, WX, sy, 46, BOTH, 0.06 + 0.04 * Math.sin(time / 70), 3);
      }
      // The Source between the slits.
      glow(g, source.x, source.y, 40, ARC, charging ? 0.09 : 0.04, 4);
      g.fillStyle(0x1a1a22, 1); g.fillCircle(source.x, source.y, 16);
      g.fillStyle(charging ? ARC_HOT : lit(BOTH, 0.4), 1); g.fillCircle(source.x, source.y, charging ? 9 + Math.sin(time / 50) * 2 : 7);
      g.lineStyle(2, BRASS, 1); g.strokeCircle(source.x, source.y, 16);
    },

    drawHud(g, time) {
      const next = waves.find((w) => time < w.firesAt);
      if (!next) return;
      const k = clamp((time - next.bornAt) / Math.max(1, next.firesAt - next.bornAt), 0, 1);
      const x = next.side > 0 ? W - 160 : 20, y = top + 10;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 2, y - 2, 144, 12, 5);
      g.fillStyle(next.side > 0 ? STATE_B : STATE_A, 0.9); g.fillRoundedRect(x, y, 140 * k, 8, 4);
    },
  };
}

export const DOUBLE_SLIT: GimmickDef = {
  id: 'superposition-slit',
  rules: 'A wall with two slits splits the room and stops shots. The Source fires through both: bright fringes strike the far side, dark ones are safe. Step on your plate to fire it; a shot fired through a slit comes out as its own fringes.',
  make,
};
