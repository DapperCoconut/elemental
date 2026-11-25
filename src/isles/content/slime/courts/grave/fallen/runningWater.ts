import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, mulberry, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { graveMound, greyedGhost } from '../art';
import {
  BONE_LIT, DIRT_DARK, GREY_LIT, IRON, IRON_LIT, LAMP, MIRE, MIRE_DEEP, MIRE_SHEEN, PEAT_DARK, SLAB, SLAB_DARK, SLAB_LIT,
  TIMBER, TIMBER_DARK, TIMBER_LIT, WISP,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Running Water — Cornelius Weir, Drain-Warden of the Grave Court.
 *
 * The yard would be under the mire in a week without its drains: stone rills that carry the
 * black water out to the sea-ditch, each with a sluice-board at its head. Every child on Fangmire
 * knows the other thing the rills are for — the dead cannot cross running water. In the King's
 * telling Cornelius shut the sluices on the nights the Prince wanted the Quiet Ward visited.
 *
 * Three rills cross the yard north to south. The greyed rise from the graves at both ends and drift
 * at whoever is nearest, and a touch chills and hurts; strike one and it falls back. An open rill
 * runs, and no greyed can cross it — they pace the bank. Strike a sluice to open or shut its rill.
 * Wading an open rill slows you. Pen the dead on his side and let them have him; he shuts your
 * water and opens his. Halfway the greyed rise in pairs.
 */

const ID = fallenId('grave', 'running-water');
const RILL_W = 30;
const GHOST_SPEED = 72;
const TOUCH = 26;
const CHILL = 10;
const MAX_GHOSTS = 6;

interface Rill { x: number; open: boolean; lockedUntil: number; turnedAt: number; handle: StrikeTarget }
interface Ghost { x: number; y: number; born: number; seed: number; blocked: boolean; handle: StrikeTarget; gone: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const ghosts: Ghost[] = [];
  const fades: { x: number; y: number; at: number }[] = [];
  let pairs = false;
  let started = false;
  let nextRise = 0;
  let npcChillUntil = 0;

  const rills: Rill[] = [W * 0.32, W * 0.5, W * 0.68].map((x, i) => {
    const r: Rill = {
      x, open: i === 1, lockedUntil: 0, turnedAt: -9999,
      handle: ctx.target({
        x, y: top + 34, r: 22,
        onStruck: () => {
          const now = ctx.scene.time.now;
          if (now < r.lockedUntil) return;
          r.open = !r.open; r.lockedUntil = now + 1400; r.turnedAt = now;
          ctx.sfx(r.open ? 'water-jet' : 'gear-turn');
        },
      }),
    };
    return r;
  });
  const graves: Pt[] = [
    { x: 80, y: top + 150 }, { x: 80, y: H - 110 }, { x: W - 80, y: top + 150 }, { x: W - 80, y: H - 110 },
  ];
  const inRill = (x: number) => rills.find((r) => r.open && Math.abs(x - r.x) < RILL_W / 2 + 4);

  function rise(time: number): void {
    if (ghosts.filter((g) => !g.gone).length >= MAX_GHOSTS) return;
    const p = graves[Math.floor(rng() * graves.length)];
    const gh: Ghost = {
      x: p.x, y: p.y - 10, born: time, seed: rng() * 10, blocked: false, gone: false,
      handle: ctx.target({
        x: p.x, y: p.y - 20, r: 18,
        onStruck: () => { if (!gh.gone) { gh.gone = true; gh.handle.remove(); fades.push({ x: gh.x, y: gh.y, at: ctx.scene.time.now }); ctx.sfx('hush'); } },
      }),
    };
    ghosts.push(gh);
    ctx.sfx('curse-cast');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextRise = time + 1600; ctx.banner('THE DEAD CANNOT CROSS RUNNING WATER', '#b8f0d8'); }
      if (!pairs && npc.hp < npc.maxHp * 0.5) { pairs = true; ctx.banner('THE GREYED RISE IN PAIRS', '#c9cfd3'); ctx.sfx('roar'); }
      if (time >= nextRise) {
        nextRise = time + 2700;
        rise(time);
        if (pairs) rise(time);
      }
      for (const gh of ghosts) {
        if (gh.gone || time - gh.born < 700) continue;
        const live = [player, npc].filter((f) => alive(f) && !ctx.isAirborne(f));
        if (!live.length) continue;
        const f = live.reduce((b, c) => (dist(c.x, c.y, gh.x, gh.y) < dist(b.x, b.y, gh.x, gh.y) ? c : b));
        const d = Math.max(1, dist(f.x, f.y, gh.x, gh.y));
        let nx = gh.x + ((f.x - gh.x) / d) * GHOST_SPEED * dt;
        const ny = gh.y + ((f.y - gh.y) / d) * GHOST_SPEED * dt;
        // An open rill between: it walks the bank instead.
        gh.blocked = false;
        for (const r of rills) {
          if (!r.open) continue;
          const edge = RILL_W / 2 + 10;
          const before = gh.x - r.x, after = nx - r.x;
          if ((before <= -edge && after > -edge) || (before >= edge && after < edge) || Math.abs(after) < edge) {
            nx = r.x + (before < 0 ? -edge : edge);
            gh.blocked = true;
          }
        }
        gh.x = clamp(nx, 30, W - 30); gh.y = clamp(ny, top + 30, H - 30);
        gh.handle.moveTo(gh.x, gh.y - 10);
        if (dist(f.x, f.y, gh.x, gh.y) < TOUCH) {
          gh.gone = true; gh.handle.remove();
          fades.push({ x: gh.x, y: gh.y, at: time });
          ctx.hit(f, CHILL, gh.x, gh.y);
          if (f === player) tk.slowPlayer(0.65, 1200); else npcChillUntil = time + 1200;
          ctx.sfx('frost-blast');
        }
      }
      for (let i = ghosts.length - 1; i >= 0; i--) if (ghosts[i].gone) ghosts.splice(i, 1);
      for (let i = fades.length - 1; i >= 0; i--) if (time - fades[i].at > 700) fades.splice(i, 1);
    },

    playerSpeedMult() { return inRill(player.x) ? 0.7 : 1; },
    npcSpeedMult() { return (inRill(npc.x) ? 0.7 : 1) * (ctx.scene.time.now < npcChillUntil ? 0.65 : 1); },

    npcSeek(): Pt | null {
      const now = ctx.scene.time.now;
      const between = (r: Rill, a: Pt, b: Pt) => (r.x - a.x) * (r.x - b.x) < 0;
      // A greyed coming for him with only shut water between: open it.
      for (const gh of ghosts) {
        if (dist(gh.x, gh.y, npc.x, npc.y) > 260 || dist(gh.x, gh.y, npc.x, npc.y) > dist(gh.x, gh.y, player.x, player.y)) continue;
        const r = rills.find((rr) => !rr.open && now >= rr.lockedUntil && between(rr, gh, npc));
        if (r) return { x: r.x + (npc.x < r.x ? -30 : 30), y: top + 52 };
      }
      // Greyed penned away from the stranger by open water: shut it.
      for (const gh of ghosts) {
        if (!gh.blocked || dist(gh.x, gh.y, player.x, player.y) > 300) continue;
        const r = rills.find((rr) => rr.open && now >= rr.lockedUntil && between(rr, gh, player) && !between(rr, gh, npc));
        if (r) return { x: r.x + (npc.x < r.x ? -30 : 30), y: top + 52 };
      }
      return null;
    },

    drawGround(g, time) {
      for (const [i, p] of graves.entries()) {
        graveMound(g, p.x, p.y, 70, mulberry(70 + i * 13), true);
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x - 2, p.y - 34, 4, 26); g.fillRect(p.x - 9, p.y - 28, 18, 4);
      }
      for (const r of rills) drawRill(g, r, time, top, H);
    },

    drawAir(g, time) {
      for (const r of rills) drawSluice(g, r, time, top);
      for (const gh of ghosts) {
        const k = clamp((time - gh.born) / 700, 0, 1);
        shadow(g, gh.x + 3, gh.y + 14, 26, 7, 0.2 * k);
        greyedGhost(g, gh.x, gh.y + 10 - (1 - k) * -14, 0.75, 0.35 + k * 0.5, time, gh.seed, 0.55);
        if (gh.blocked) {
          // It frets at the bank: spray hissing where it touches the running water.
          for (let i = 0; i < 4; i++) {
            const q = ((time / 300) + i / 4) % 1;
            g.fillStyle(MIRE_SHEEN, 0.7 * (1 - q)); g.fillCircle(gh.x + (i - 1.5) * 5, gh.y + 6 - q * 16, 2);
          }
        }
      }
      for (const f of fades) {
        const k = (time - f.at) / 700;
        for (let i = 0; i < 8; i++) { g.fillStyle(GREY_LIT, 0.6 * (1 - k)); g.fillCircle(f.x + Math.cos(i * 0.8) * k * 30, f.y - k * 30 + Math.sin(i * 0.8) * 8, 3); }
      }
    },

    drawHud(g, time) {
      const y = top + 16, x = W / 2 - 66;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x, y - 12, 132, 24, 7);
      rills.forEach((r, i) => {
        const cx = x + 22 + i * 44;
        g.fillStyle(r.open ? MIRE_SHEEN : DIRT_DARK, 1); g.fillRect(cx - 5, y - 9, 10, 18);
        if (r.open) for (let j = 0; j < 3; j++) { const q = ((time / 400) + j / 3) % 1; g.fillStyle(lit(MIRE_SHEEN, 0.4), 1); g.fillRect(cx - 3, y - 9 + q * 16, 6, 1.5); }
      });
      const n = ghosts.length;
      for (let i = 0; i < MAX_GHOSTS; i++) { g.fillStyle(i < n ? GREY_LIT : 0x2a2622, 1); g.fillCircle(x + 140 + i * 9, y, 3); }
    },

    destroy() { for (const r of rills) r.handle.remove(); for (const gh of ghosts) gh.handle.remove(); },
  };
}

/** A stone rill: kerbed channel; open, black water racing south with flecks; shut, a silted bed. */
function drawRill(g: G, r: Rill, time: number, top: number, H: number): void {
  const x0 = r.x - RILL_W / 2, y0 = top + 50, h = H - y0;
  g.fillStyle(SLAB_DARK, 1); g.fillRect(x0 - 6, y0, RILL_W + 12, h);
  for (let y = y0; y < H; y += 22) {
    g.fillStyle(SLAB, 1); g.fillRect(x0 - 6, y + 1, 5, 20); g.fillRect(x0 + RILL_W + 1, y + 1, 5, 20);
    g.fillStyle(SLAB_LIT, 0.4); g.fillRect(x0 - 6, y + 1, 5, 2); g.fillRect(x0 + RILL_W + 1, y + 1, 5, 2);
  }
  const k = clamp((time - r.turnedAt) / 600, 0, 1);
  const water = r.open ? k : 1 - k;
  g.fillStyle(PEAT_DARK, 1); g.fillRect(x0, y0, RILL_W, h);
  for (let y = y0 + 10; y < H; y += 34) { g.fillStyle(dim(DIRT_DARK, 0.2), 1); g.fillEllipse(r.x + Math.sin(y) * 6, y, 14, 6); }
  if (water > 0.01) {
    g.fillStyle(MIRE, water); g.fillRect(x0, y0, RILL_W, h * water);
    g.fillStyle(MIRE_DEEP, water * 0.8); g.fillRect(r.x - 6, y0, 12, h * water);
    for (let i = 0; i < 14; i++) {
      const q = ((time / 700) + i / 14) % 1;
      const fy = y0 + q * h * water;
      g.lineStyle(1.4, MIRE_SHEEN, 0.6 * water);
      const fx = x0 + 5 + ((i * 7) % (RILL_W - 10));
      g.lineBetween(fx, fy, fx + 3, fy + 8); g.lineBetween(fx + 3, fy + 8, fx + 6, fy);
    }
  }
}

/** The sluice at a rill's head: a timber frame, a board in its grooves raised or dropped, a windlass. */
function drawSluice(g: G, r: Rill, time: number, top: number): void {
  const x = r.x, y = top + 56;
  shadow(g, x + 4, y + 2, 64, 12, 0.3);
  for (const k of [-1, 1]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 24 - 4, y - 50, 8, 52);
    g.fillStyle(TIMBER_LIT, 0.5); g.fillRect(x + k * 24 - 4, y - 50, 2, 52);
  }
  g.fillStyle(TIMBER, 1); g.fillRect(x - 30, y - 54, 60, 7);
  const k = clamp((time - r.turnedAt) / 500, 0, 1);
  const lift = (r.open ? k : 1 - k) * 26;
  g.fillStyle(TIMBER, 1); g.fillRect(x - 20, y - 26 - lift, 40, 26);
  for (let i = 0; i < 3; i++) { g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(x - 20, y - 18 + i * 8 - lift, x + 20, y - 18 + i * 8 - lift); }
  g.fillStyle(IRON, 1); g.fillRect(x - 20, y - 26 - lift, 40, 3);
  // The windlass wheel, its spokes turned by how far the board has gone.
  const wx = x + 34, wy = y - 40;
  g.lineStyle(3, IRON, 1); g.strokeCircle(wx, wy, 10);
  for (let i = 0; i < 4; i++) { const a = lift / 8 + (i * Math.PI) / 2; g.lineStyle(2, IRON_LIT, 1); g.lineBetween(wx, wy, wx + Math.cos(a) * 10, wy + Math.sin(a) * 10); }
  g.lineStyle(1.2, BONE_LIT, 0.6); g.lineBetween(wx, wy, x, y - 50 - lift * 0.2);
  if (r.open) { for (let i = 0; i < 3; i++) { const q = ((time / 260) + i / 3) % 1; g.fillStyle(WISP, 0.4 * (1 - q)); g.fillCircle(x + (i - 1) * 10, y + 2 + q * 10, 3); } }
  if (time < r.lockedUntil) { g.fillStyle(LAMP, 0.6); g.fillCircle(x, y - 60, 2.5); }
}

export const FALLEN_RUNNING_WATER: GimmickDef = {
  id: ID,
  rules: 'The greyed rise and drift at whoever is nearest; strike one to lay it. They cannot cross an open rill. Strike a sluice to open or shut its rill.',
  make,
};
