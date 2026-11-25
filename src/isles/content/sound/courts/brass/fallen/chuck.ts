import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, BRASS_DEEP, BRASS_LIT, BRASS_SHINE, BRONZE, BRONZE_DARK, CREAM, FURNACE, NAVY_DARK, SCARLET,
  SCARLET_LIT, SILVER, SILVER_DARK, SLATE_DARK, WOOD_DARK,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Spinning Chuck — Isidore Chuckworth, Horn-Spinner.
 *
 * Every bell on Choirholm's horns is spun, not beaten: a disc of brass is clamped on a great
 * chuck set flush in the foundry floor and pressed over a form while it turns. Chuckworth spun
 * the bells of the Tuners' collecting-horns, and in the star's telling he spins people too.
 *
 * The chuck turns slowly and carries whoever stands on it round with it. Its tool-post walks the
 * rim, peeling curls of hot swarf off the blank along the tangent. Every few seconds the belt is
 * thrown onto the HIGH pulley (the rim glows scarlet first): everyone still on the disc is flung
 * off along their tangent — and slammed if they fly into a wall, or into the other fighter.
 * The belt fork on the headstock is anyone's: strike it to throw HIGH early while he is aboard.
 * Past half, the blank is spun up into a bell, the chuck runs faster and shifts more often.
 */

const CX = 480;
const CY = 380;
const R = 150;
const LOW_W = 0.85;
const HALF_W = 1.15;
const CARRY = 0.62;
const WARN_MS = 1150;
const FORK_WARN_MS = 950;
const HIGH_MS = 600;
const FLING_SPEED = 820;
const FLING_MS = 380;
const FLING_DMG = 9;
const SLAM_DMG = 12;
const SLAM_STUN = 700;
const CRASH_DMG = 10;
const SWARF_MS = 850;
const SWARF_DMG = 8;

interface Flight { vx: number; vy: number; until: number }

/** A stepped cone pulley seen from above: three brass rings, the belt on the lit one. */
function conePulley(g: G, x: number, y: number, s: number, high: boolean, spin: number): void {
  const radii = [16, 12, 8].map((r) => r * s);
  radii.forEach((r, i) => {
    g.fillStyle(i === 0 ? BRASS_DEEP : i === 1 ? BRASS_DARK : BRASS, 1); g.fillCircle(x, y, r);
    g.lineStyle(1.2, BRASS_SHINE, 0.45); g.strokeCircle(x, y, r - 1);
  });
  // Spokes so the pulley reads as turning.
  g.lineStyle(1.5, BRASS_DEEP, 0.8);
  for (let k = 0; k < 3; k++) { const a = spin + (k * Math.PI * 2) / 3; g.lineBetween(x, y, x + Math.cos(a) * radii[2], y + Math.sin(a) * radii[2]); }
  // The belt rides the small step (HIGH) or the big one (LOW).
  const br = high ? radii[2] : radii[0];
  g.lineStyle(4 * s, 0x3a2414, 1); g.strokeCircle(x, y, br + 2);
  g.lineStyle(1, 0x7a5232, 0.8); g.strokeCircle(x, y, br + 3);
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk, player, npc } = ctx;
  const FORK = { x: CX + 96, y: CY - R - 40 };
  let spin = 0;
  let dir = 1;
  let phase: 'low' | 'warn' | 'high' = 'low';
  let cycle = 6800;
  let w = LOW_W;
  let nextShiftAt = ctx.scene.time.now + cycle;
  let warnFrom = nextShiftAt - WARN_MS;
  let highUntil = 0;
  let lastFling = -9999;
  let tool = Math.PI * 0.15;
  let nextSwarf = ctx.scene.time.now + 1500;
  let belled = false;
  const flights = new Map<Fighter, Flight>();
  const crashed = new Set<Fighter>();

  const onDisc = (f: Fighter) => dist(f.x, f.y, CX, CY) < R;
  const rim = (a: number, r = R) => ({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r });

  const fork = ctx.target({
    x: FORK.x, y: FORK.y, r: 22,
    onStruck(by) {
      const now = ctx.scene.time.now;
      if (phase !== 'low' || now - lastFling < 1500 || nextShiftAt - now < FORK_WARN_MS) return;
      nextShiftAt = now + FORK_WARN_MS;
      warnFrom = now;
      ctx.float(FORK.x, FORK.y - 34, by === 'player' ? 'BELT THROWN!' : 'He throws the belt!', by === 'player' ? '#9ad0ff' : '#ffb070');
      ctx.sfx('gear-turn');
    },
  });

  const fling = (time: number) => {
    lastFling = time;
    crashed.clear();
    let any = false;
    for (const f of [player, npc]) {
      if (!alive(f) || !onDisc(f)) continue;
      any = true;
      const a = Math.atan2(f.y - CY, f.x - CX);
      const tx = -Math.sin(a) * dir, ty = Math.cos(a) * dir;
      let vx = tx * 0.8 + Math.cos(a) * 0.6, vy = ty * 0.8 + Math.sin(a) * 0.6;
      const m = Math.hypot(vx, vy) || 1;
      vx = (vx / m) * FLING_SPEED; vy = (vy / m) * FLING_SPEED;
      flights.set(f, { vx, vy, until: time + FLING_MS });
      ctx.hit(f, FLING_DMG, f.x, f.y);
      ctx.float(f.x, f.y - 44, 'FLUNG!', '#ffe08a');
    }
    ctx.sfx(any ? 'whoosh' : 'gear-turn');
    ctx.flash(CX, CY, SCARLET_LIT);
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!belled && alive(npc) && npc.hp / npc.maxHp < 0.5) {
        belled = true;
        cycle = 4800; w = HALF_W;
        ctx.banner('The blank is spun up into a bell — the chuck runs faster and shifts sooner!', '#ffd27a');
        ctx.sfx('hammer-forge');
      }
      // The gearbox.
      if (phase === 'low' && time >= warnFrom) { phase = 'warn'; ctx.sfx('beam-charge'); }
      if (phase === 'warn' && time >= nextShiftAt) { phase = 'high'; highUntil = time + HIGH_MS; fling(time); }
      if (phase === 'high' && time >= highUntil) {
        phase = 'low'; dir = -dir;
        nextShiftAt = time + cycle; warnFrom = nextShiftAt - WARN_MS;
      }
      const ww = phase === 'high' ? 3.6 : phase === 'warn' ? w * (1 + clamp((time - warnFrom) / WARN_MS, 0, 1) * 0.9) : w;
      spin += ww * dir * dt;

      // Riders are carried round with the blank.
      for (const f of [player, npc]) {
        if (!alive(f) || flights.has(f) || !onDisc(f)) continue;
        const a = Math.atan2(f.y - CY, f.x - CX);
        const v = ww * dist(f.x, f.y, CX, CY) * CARRY;
        ctx.nudge(f, -Math.sin(a) * dir * v * dt, Math.cos(a) * dir * v * dt);
      }

      // Flung fighters fly, and are slammed by a wall or by the other fighter.
      for (const [f, fl] of flights) {
        if (!alive(f) || time >= fl.until) { flights.delete(f); continue; }
        const bx = f.x, by = f.y;
        ctx.nudge(f, fl.vx * dt, fl.vy * dt);
        const blocked = Math.abs(f.x - bx) < Math.abs(fl.vx * dt) * 0.5 && Math.abs(f.y - by) < Math.abs(fl.vy * dt) * 0.5;
        if (blocked || f.x <= 41 || f.x >= W - 41 || f.y <= top + 1 || f.y >= H - 41) {
          flights.delete(f);
          ctx.hit(f, SLAM_DMG, f.x, f.y);
          ctx.stun(f, SLAM_STUN);
          ctx.float(f.x, f.y - 46, 'SLAMMED!', '#ff9a7a');
          ctx.sfx('stone-slam');
          continue;
        }
        const o = f === player ? npc : player;
        if (alive(o) && !crashed.has(o) && dist(f.x, f.y, o.x, o.y) < 46) {
          crashed.add(o); flights.delete(f);
          ctx.hit(f, CRASH_DMG, f.x, f.y);
          ctx.hit(o, CRASH_DMG, o.x, o.y);
          ctx.nudge(o, fl.vx * 0.12, fl.vy * 0.12);
          ctx.float(o.x, o.y - 46, 'CRASH!', '#ffe08a');
          ctx.sfx('hit-heavy');
        }
      }

      // The tool-post walks the rim and peels swarf off along the tangent.
      if (phase === 'low') {
        tool += 0.22 * dt;
        if (time >= nextSwarf) {
          nextSwarf = time + (belled ? SWARF_MS * 0.8 : SWARF_MS);
          const p = rim(tool, R + 6);
          const a = tool + (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
          tk.spawnBullet({ x: p.x, y: p.y, angle: a, speed: 300, damage: SWARF_DMG, lifeMs: 2600, r: 7, color: BRASS_LIT, hits: [player, npc] });
          ctx.sfx('sizzle');
        }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const now = ctx.scene.time.now;
      const dN = dist(npc.x, npc.y, CX, CY);
      const soon = phase !== 'low' || nextShiftAt - now < 1700;
      if (soon && dN < R + 40) {
        const a = Math.atan2(npc.y - CY, npc.x - CX);
        return { x: clamp(CX + Math.cos(a) * (R + 95), 60, W - 60), y: clamp(CY + Math.sin(a) * (R + 95), top + 50, H - 50) };
      }
      if (phase === 'low' && onDisc(player) && nextShiftAt - now > FORK_WARN_MS + 400 && now - lastFling > 1500) {
        return { x: FORK.x + 30, y: FORK.y + 26 };
      }
      const a = Math.atan2(player.y - CY, player.x - CX);
      return { x: clamp(CX + Math.cos(a) * (R + 75), 60, W - 60), y: clamp(CY + Math.sin(a) * (R + 75), top + 50, H - 50) };
    },

    drawGround(g, time) {
      // The foundry floor's iron ring and pit round the chuck.
      shadow(g, CX, CY + 8, R * 2.3, R * 0.5, 0.25);
      g.fillStyle(SLATE_DARK, 1); g.fillCircle(CX, CY, R + 16);
      g.lineStyle(3, 0x1a1c22, 1); g.strokeCircle(CX, CY, R + 16);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const p = rim(a, R + 9);
        g.fillStyle(0x5a6070, 1); g.fillCircle(p.x, p.y, 2);
      }
      // The warning: the rim heats scarlet while the belt is thrown.
      const k = phase === 'warn' ? clamp((time - warnFrom) / Math.max(1, nextShiftAt - warnFrom), 0, 1) : phase === 'high' ? 1 : 0;
      if (k > 0) { g.lineStyle(10, SCARLET, 0.25 + k * 0.5); g.strokeCircle(CX, CY, R + 6); }

      // The brass blank, turned in rings.
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(CX, CY, R);
      g.fillStyle(BRASS, 1); g.fillCircle(CX, CY, R - 6);
      for (let r = 20; r < R - 6; r += 11) { g.lineStyle(1.2, (r / 11) % 2 < 1 ? BRASS_LIT : BRASS_DARK, 0.45); g.strokeCircle(CX, CY, r); }
      // Polished streaks wheel round with the spin (blurred when HIGH).
      const streaks = phase === 'high' ? 12 : 6;
      for (let i = 0; i < streaks; i++) {
        const a = spin + (i / streaks) * Math.PI * 2;
        g.fillStyle(BRASS_SHINE, phase === 'high' ? 0.12 : 0.22);
        g.slice(CX, CY, R - 8, a, a + (phase === 'high' ? 0.4 : 0.12), false); g.fillPath();
      }
      // The bell being raised in the middle (a dome once the blank is belled).
      const dome = belled ? 62 : 38;
      glow(g, CX, CY, dome, BRASS_SHINE, 0.05, 3);
      g.fillStyle(lit(BRASS, 0.15), 1); g.fillCircle(CX, CY, dome);
      g.fillStyle(BRASS_SHINE, 0.5); g.fillEllipse(CX - dome * 0.3, CY - dome * 0.3, dome * 0.7, dome * 0.4);
      // Three chuck jaws, turning.
      for (let j = 0; j < 3; j++) {
        const a = spin + (j * Math.PI * 2) / 3;
        const p = rim(a, dome + 14), q = rim(a, dome + 34);
        g.lineStyle(12, SILVER_DARK, 1); g.lineBetween(p.x, p.y, q.x, q.y);
        g.lineStyle(6, SILVER, 1); g.lineBetween(p.x, p.y, q.x, q.y);
        g.fillStyle(NAVY_DARK, 1); g.fillCircle((p.x + q.x) / 2, (p.y + q.y) / 2, 2.2);
      }
      // Which way it turns: chevrons riding the outer ring.
      for (let i = 0; i < 8; i++) {
        const a = spin * 0.5 + (i / 8) * Math.PI * 2;
        const p = rim(a, R - 14);
        const t = a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        g.lineStyle(2.5, k > 0 ? SCARLET_LIT : CREAM, 0.75);
        g.lineBetween(p.x, p.y, p.x - Math.cos(t - 0.6) * 9, p.y - Math.sin(t - 0.6) * 9);
        g.lineBetween(p.x, p.y, p.x - Math.cos(t + 0.6) * 9, p.y - Math.sin(t + 0.6) * 9);
      }

      // The tool-post on its carriage at the rim: a steel arm and a hard roller pressed in.
      if (phase === 'low') {
        const p = rim(tool, R + 34), q = rim(tool, R - 4);
        g.fillStyle(0x3a3e48, 1); g.fillRoundedRect(p.x - 14, p.y - 10, 28, 20, 4);
        g.lineStyle(7, SILVER_DARK, 1); g.lineBetween(p.x, p.y, q.x, q.y);
        g.fillStyle(SILVER, 1); g.fillCircle(q.x, q.y, 6);
        g.fillStyle(FURNACE, 0.5 + Math.sin(time / 60) * 0.3); g.fillCircle(q.x, q.y, 3);
      }

      // The headstock: an iron housing, the cone pulleys and the leather belt up to the line shaft.
      const hx = CX, hy = CY - R - 30;
      g.fillStyle(0x2c3038, 1); g.fillRoundedRect(hx - 46, hy - 24, 92, 34, 6);
      g.lineStyle(2, 0x5a6070, 1); g.strokeRoundedRect(hx - 46, hy - 24, 92, 34, 6);
      conePulley(g, hx - 18, hy - 8, 1, phase !== 'low', spin * 3);
      g.lineStyle(5, 0x3a2414, 1); g.lineBetween(hx - 18, hy - 24, hx - 18, top + 4);
      g.lineStyle(5, 0x3a2414, 1); g.lineBetween(hx - 2, hy - 18, hx - 2, top + 4);
      // The belt fork: a brass-handled lever, thrown over when HIGH.
      const thrown = phase !== 'low';
      const lx = FORK.x, ly = FORK.y;
      g.fillStyle(WOOD_DARK, 1); g.fillRect(lx - 10, ly + 4, 20, 10);
      const la = thrown ? -0.5 : -2.6;
      g.lineStyle(5, 0x4a4e58, 1); g.lineBetween(lx, ly + 6, lx + Math.cos(la) * 30, ly + 6 + Math.sin(la) * 30);
      g.fillStyle(BRASS_LIT, 1); g.fillCircle(lx + Math.cos(la) * 32, ly + 6 + Math.sin(la) * 32, 6);
      g.lineStyle(2, BRASS_DEEP, 1); g.lineBetween(hx + 10, hy - 6, lx, ly + 6);
      const ready = phase === 'low' && time - lastFling > 1500;
      if (ready) { g.lineStyle(2, BRASS_LIT, 0.3 + Math.sin(time / 240) * 0.2); g.strokeCircle(lx, ly + 2, 26); }
    },

    drawAir(g, time) {
      // Curls of swarf twisting off the roller.
      if (phase === 'low') {
        const q = rim(tool, R + 4);
        for (let i = 0; i < 4; i++) {
          const ph = (time / 220 + i * 0.25) % 1;
          const a = tool + (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
          const cx = q.x + Math.cos(a) * ph * 30, cy = q.y + Math.sin(a) * ph * 30 - ph * 10;
          g.lineStyle(1.5, i % 2 ? BRASS_LIT : BRONZE, 1 - ph);
          g.beginPath(); g.arc(cx, cy, 3 + ph * 4, time / 90 + i, time / 90 + i + 4.2, false); g.strokePath();
        }
      }
      // Streaks behind anyone in flight.
      for (const [f, fl] of flights) {
        const m = Math.hypot(fl.vx, fl.vy) || 1;
        for (let i = 1; i <= 4; i++) {
          g.lineStyle(6 - i, BRASS_SHINE, 0.5 - i * 0.1);
          g.lineBetween(f.x - (fl.vx / m) * i * 14 - (fl.vy / m) * 10, f.y - (fl.vy / m) * i * 14 + (fl.vx / m) * 10,
            f.x - (fl.vx / m) * i * 14 + (fl.vy / m) * 10, f.y - (fl.vy / m) * i * 14 - (fl.vx / m) * 10);
        }
      }
    },

    drawHud(g, time) {
      // The gear plate: two pulleys, LOW and HIGH, the belt on one, and an arc to the next shift.
      const x = W - 112, y = top + 26;
      g.fillStyle(NAVY_DARK, 0.75); g.fillRoundedRect(x - 70, y - 20, 140, 40, 8);
      g.lineStyle(1.5, BRASS, 0.9); g.strokeRoundedRect(x - 70, y - 20, 140, 40, 8);
      conePulley(g, x - 34, y, 0.9, false, time / 300);
      conePulley(g, x + 34, y, 0.9, true, time / 120);
      g.lineStyle(3, phase === 'low' ? CREAM : SCARLET_LIT, 1); g.strokeCircle(phase === 'low' ? x - 34 : x + 34, y, 19);
      const left = clamp((nextShiftAt - ctx.scene.time.now) / cycle, 0, 1);
      g.lineStyle(3, phase === 'warn' ? SCARLET_LIT : BRASS_LIT, 0.9);
      g.beginPath(); g.arc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + (1 - left) * Math.PI * 2, false); g.strokePath();
      g.fillStyle(dim(BRONZE_DARK, 0.2), 1); g.fillCircle(x, y, 4);
    },

    destroy() { fork.remove(); flights.clear(); },
  };
}

export const FALLEN_CHUCK: GimmickDef = {
  id: fallenId('brass', 'chuck'),
  rules: 'The chuck carries you round; when the belt goes HIGH all aboard are flung and slammed into walls. Mind the swarf. Strike the fork to fling him.',
  make,
};
