import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_TAR } from '../encounters';
import {
  FLAME, FLAME_LIT, TAR, TAR_LIT, blobPts, clamp, dist, flameTongue, frameClock, noise, sootPuff,
} from '../util';

/**
 * Tar Pit — Tarrer Grime's caulking yard. Three cast-iron kettles of hot tar steam at the edges
 * of the quay. Grime fills his long ladle at a kettle (three pours to a ladle) and slings it at
 * you: a stream of tar arcs across the deck and the patch it will make is marked before it lands.
 *
 * Fresh tar is hot and **holds you fast**. Step in and you stick: you can barely move, and you
 * take more from every blow until you work free — keep straining to tear loose faster — or until
 * Grime lands his free hit, which tears you out of it the hard way. Tar cools; cooled, it's
 * just black board.
 *
 * The rule the player can turn: **kick a kettle over.** Walk into a full kettle and it tips, a
 * wave of tar slopping out toward the middle of the yard — catch Grime in that and he sticks just
 * the same. A tipped kettle can't fill his ladle until it's been topped up again.
 */

interface Kettle { x: number; y: number; readyAt: number; tipAt: number; tipA: number }
interface Patch { x: number; y: number; r: number; landAt: number; hotUntil: number; until: number; seed: number; fromX: number; fromY: number; bornAt: number }
interface Stuck { since: number; struggle: number; px: number; py: number; immuneUntil: number; tarredUntil: number; patch: Patch | null }

const KETTLE_R = 32;
const POUR_R = 56;

function makeTarPit(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const now0 = ctx.scene.time.now;
  const stuckMs = hard ? 2300 : 1900;
  const stuckTaken = hard ? 1.45 : 1.35;
  const pourEvery = hard ? 2300 : 2900;

  const kettles: Kettle[] = [
    { x: W / 2, y: top + 52, readyAt: 0, tipAt: 0, tipA: 0 },
    { x: 70, y: H - 78, readyAt: 0, tipAt: 0, tipA: 0 },
    { x: W - 70, y: H - 78, readyAt: 0, tipAt: 0, tipA: 0 },
  ];
  const patches: Patch[] = [];
  let seedN = 1;
  let ladle = 3;
  let nextPour = now0 + 2200;
  let refillTarget: Kettle | null = null;
  let emptySince = 0;
  /** The player's walking velocity, smoothed, so a sling can lead them a little. */
  const pv = { x: 0, y: 0, px: ctx.player.x, py: ctx.player.y };

  const stuck = new Map<Fighter, Stuck>();
  const stateOf = (f: Fighter): Stuck => {
    let s = stuck.get(f);
    if (!s) { s = { since: 0, struggle: 0, px: f.x, py: f.y, immuneUntil: 0, tarredUntil: 0, patch: null }; stuck.set(f, s); }
    return s;
  };

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const hotAt = (x: number, y: number, time: number): Patch | null => {
    for (const p of patches) if (time >= p.landAt && time < p.hotUntil && dist(x, y, p.x, p.y) < p.r * 0.92) return p;
    return null;
  };

  const spawnPatch = (x: number, y: number, r: number, fromX: number, fromY: number, flightMs: number, time: number): void => {
    patches.push({
      x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 50), r, fromX, fromY,
      bornAt: time, landAt: time + flightMs, hotUntil: time + flightMs + (hard ? 6800 : 6000), until: time + flightMs + 9000, seed: seedN++ * 1.9,
    });
    if (patches.length > 8) patches.shift();
  };

  const free = (f: Fighter, why: string, time: number): void => {
    const s = stateOf(f);
    if (!s.since) return;
    s.since = 0; s.struggle = 0; s.patch = null;
    s.immuneUntil = time + 1300;
    s.tarredUntil = time + 1800;
    ctx.float(f.x, f.y - 46, why, f === ctx.player ? '#e8e0d0' : '#8fe6ff');
    ctx.sfx('snap-back');
  };

  const stepStuck = (f: Fighter, dt: number, time: number): void => {
    const s = stateOf(f);
    if (!alive(f)) { s.since = 0; return; }
    if (!s.since) {
      const p = time >= s.immuneUntil ? hotAt(f.x, f.y, time) : null;
      if (p) {
        s.since = time; s.struggle = 0; s.patch = p;
        ctx.float(f.x, f.y - 40, 'STUCK!', f === ctx.player ? '#ffb27a' : '#8fe6ff');
        ctx.sfx('slime-splat');
      }
    } else {
      // Straining against the tar (still trying to move) tears you free twice as fast.
      const moved = dist(f.x, f.y, s.px, s.py);
      s.struggle += dt * (moved > 0.25 ? 2 : 1) / (stuckMs / 1000);
      if (s.struggle >= 1) free(f, 'PULLED FREE', time);
      else if (s.patch && time >= s.patch.hotUntil) free(f, 'TAR SET', time);
    }
    s.px = f.x; s.py = f.y;
  };

  const tip = (k: Kettle, time: number): void => {
    k.tipAt = time;
    k.readyAt = time + (hard ? 9000 : 10000);
    const a = Math.atan2((top + H) / 2 - k.y, W / 2 - k.x);
    k.tipA = a;
    spawnPatch(k.x + Math.cos(a) * 120, k.y + Math.sin(a) * 100, 74, k.x, k.y, 480, time);
    ctx.sfx('oil-splash');
    ctx.float(k.x, k.y - 46, 'KETTLE OVER!', '#ffd79a');
    if (refillTarget === k) refillTarget = null;
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      const k0 = Math.min(1, dt * 4);
      pv.x += (clamp((ctx.player.x - pv.px) / dt, -260, 260) - pv.x) * k0;
      pv.y += (clamp((ctx.player.y - pv.py) / dt, -260, 260) - pv.y) * k0;
      pv.px = ctx.player.x; pv.py = ctx.player.y;
      stepStuck(ctx.player, dt, time);
      stepStuck(ctx.npc, dt, time);

      // The player tips full kettles by walking into them; Grime refills at them.
      for (const k of kettles) {
        if (time < k.readyAt) continue;
        if (alive(ctx.player) && dist(ctx.player.x, ctx.player.y, k.x, k.y) < KETTLE_R + 18) { tip(k, time); continue; }
        if (ladle < 3 && alive(ctx.npc) && dist(ctx.npc.x, ctx.npc.y, k.x, k.y) < KETTLE_R + 26) {
          ladle = 3;
          k.readyAt = time + (hard ? 6500 : 7500);
          refillTarget = null;
          ctx.float(k.x, k.y - 50, 'LADLE FULL', '#ffcf8a');
          ctx.sfx('bubble');
        }
      }

      // Grime slings tar while he has it.
      if (time >= nextPour && ladle > 0 && alive(ctx.npc) && alive(ctx.player) && !stateOf(ctx.npc).since) {
        nextPour = time + pourEvery;
        ladle--;
        const p = ctx.player, n = ctx.npc;
        // Lead the player a little, but never past what a step sideways can dodge.
        const lead = stateOf(p).since ? 0 : 0.35;
        const tx = p.x + pv.x * lead, ty = p.y + pv.y * lead;
        spawnPatch(tx, ty, POUR_R, n.x, n.y, hard ? 850 : 950, time);
        ctx.sfx('whip');
      }
      // If Grime can't get to a kettle, his tar-boy runs him a bucket.
      if (ladle > 0) emptySince = 0;
      else if (!emptySince) emptySince = time;
      else if (time - emptySince > 8000) {
        ladle = 2; emptySince = 0; refillTarget = null;
        ctx.float(ctx.npc.x, ctx.npc.y - 50, 'FRESH BUCKET', '#ffcf8a');
        ctx.sfx('bubble');
      }
      if (ladle === 0 && !refillTarget) {
        // Go to the nearest ready kettle.
        let best: Kettle | null = null, bd = Infinity;
        for (const k of kettles) {
          const d = dist(ctx.npc.x, ctx.npc.y, k.x, k.y) + (time < k.readyAt ? (k.readyAt - time) * 0.12 : 0);
          if (d < bd) { bd = d; best = k; }
        }
        refillTarget = best;
      }
      for (let i = patches.length - 1; i >= 0; i--) if (time >= patches[i].until) patches.splice(i, 1);
    },

    onPlayerHurt(amount) {
      if (amount > 0 && stateOf(ctx.player).since) free(ctx.player, 'TORN LOOSE', ctx.scene.time.now);
    },
    onNpcHurt(amount) {
      if (amount > 0 && stateOf(ctx.npc).since) free(ctx.npc, 'TORN LOOSE', ctx.scene.time.now);
    },

    playerSpeedMult() {
      const s = stateOf(ctx.player), t = ctx.scene.time.now;
      return s.since ? 0.12 : t < s.tarredUntil ? 0.85 : 1;
    },
    npcSpeedMult() {
      const s = stateOf(ctx.npc), t = ctx.scene.time.now;
      return s.since ? 0.2 : t < s.tarredUntil ? 0.85 : 1;
    },
    playerTakenMult: () => (stateOf(ctx.player).since ? stuckTaken : 1),
    npcTakenMult: () => (stateOf(ctx.npc).since ? stuckTaken : 1),

    npcSeek(): Pt | null {
      const n = ctx.npc, time = ctx.scene.time.now;
      if (ladle === 0 && refillTarget) return { x: refillTarget.x, y: refillTarget.y + (refillTarget.y < H / 2 ? 30 : -30) };
      // Keep out of hot tar.
      for (const p of patches) {
        if (time < p.landAt - 300 || time >= p.hotUntil) continue;
        const d = dist(n.x, n.y, p.x, p.y);
        if (d < p.r + 40) {
          const a = Math.atan2(n.y - p.y, n.x - p.x);
          return { x: clamp(p.x + Math.cos(a) * (p.r + 90), 60, W - 60), y: clamp(p.y + Math.sin(a) * (p.r + 90), top + 40, H - 40) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      const ts = time / 1000;
      for (const p of patches) {
        if (time < p.landAt) {
          // Telegraph: the patch's outline, dashed, tightening as the stream arrives.
          const c = clamp((time - p.bornAt) / (p.landAt - p.bornAt), 0, 1);
          g.fillStyle(TAR, 0.12 + c * 0.25); g.fillCircle(p.x, p.y, p.r);
          for (let i = 0; i < 16; i++) {
            const a0 = (i / 16) * Math.PI * 2 + ts;
            g.lineStyle(3, FLAME, 0.4 + c * 0.5);
            g.beginPath(); g.arc(p.x, p.y, p.r, a0, a0 + 0.22, false); g.strokePath();
          }
          continue;
        }
        const hot = time < p.hotUntil;
        const fade = clamp((p.until - time) / 1500, 0, 1);
        const cool = hot ? clamp(1 - (p.hotUntil - time) / 2200, 0, 1) : 1;
        const grow = clamp((time - p.landAt) / 200, 0.4, 1);
        const pts = blobPts(p.x, p.y, p.r * grow, p.r * 0.72 * grow, p.seed, 12, 0.28);
        if (hot) {
          // Hot rim glow, fading as it cools.
          g.fillStyle(FLAME, 0.3 * (1 - cool)); g.fillPoints(blobPts(p.x, p.y, p.r * grow * 1.12, p.r * 0.8 * grow, p.seed, 12, 0.28), true, true);
        }
        g.fillStyle(hot ? TAR : 0x2a2c30, (hot ? 1 : 0.75) * fade); g.fillPoints(pts, true, true);
        if (hot) {
          g.fillStyle(TAR_LIT, 0.7); g.fillEllipse(p.x - p.r * 0.25, p.y - p.r * 0.22, p.r * 0.5, p.r * 0.14);
          g.fillStyle(0xffffff, 0.25); g.fillEllipse(p.x - p.r * 0.3, p.y - p.r * 0.26, p.r * 0.16, p.r * 0.05);
          // Bubbles rising and bursting.
          for (let b = 0; b < 5; b++) {
            const ph = (ts * (1.2 + b * 0.13) + noise(p.seed + b)) % 1;
            const bx = p.x + (noise(p.seed * 3 + b) - 0.5) * p.r * 1.1, by = p.y + (noise(p.seed * 5 + b) - 0.5) * p.r * 0.7;
            if (ph < 0.75) { g.fillStyle(TAR_LIT, 0.8); g.fillCircle(bx, by, 2 + ph * 5); g.fillStyle(0xffffff, 0.3); g.fillCircle(bx - 1, by - 1.5, 1.2); }
            else { g.lineStyle(1.2, TAR_LIT, (1 - ph) * 3); g.strokeCircle(bx, by, 6 + (ph - 0.75) * 24); }
          }
        } else {
          // Cooled: matte, cracked like a dried river bed.
          g.lineStyle(1, 0x46484e, 0.6 * fade);
          for (let c = 0; c < 6; c++) {
            const a = noise(p.seed + c) * Math.PI * 2;
            g.lineBetween(p.x, p.y, p.x + Math.cos(a) * p.r * 0.7, p.y + Math.sin(a) * p.r * 0.5);
          }
        }
      }
      // Kettles: a ring of hot coals, the pot, its level.
      for (const k of kettles) {
        const ready = time >= k.readyAt;
        g.fillStyle(0x000000, 0.35); g.fillEllipse(k.x, k.y + 18, 82, 24);
        g.fillStyle(FLAME, 0.18 + 0.08 * Math.sin(ts * 9 + k.x)); g.fillEllipse(k.x, k.y + 14, 70, 22);
        for (let c = 0; c < 7; c++) {
          const a = (c / 7) * Math.PI;
          g.fillStyle(c % 2 ? 0x6a3a26 : 0x4a2418, 1); g.fillRect(k.x - 34 + c * 10, k.y + 8 + Math.sin(a) * 3, 9, 9);
        }
        if (ready) {
          g.lineStyle(2, FLAME_LIT, 0.35 + 0.25 * Math.sin(ts * 4)); g.strokeCircle(k.x, k.y, KETTLE_R + 18);
        } else {
          const c = 1 - (k.readyAt - time) / (hard ? 9000 : 10000);
          g.lineStyle(3, FLAME_LIT, 0.6);
          g.beginPath(); g.arc(k.x, k.y, KETTLE_R + 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(c, 0, 1), false); g.strokePath();
        }
      }
      // Stuck fighters: tar strands clinging from the boards up their legs, and a struggle meter.
      for (const [f, s] of stuck) {
        if (!s.since || !alive(f)) continue;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const bx = f.x + Math.cos(a) * 24, by = f.y + 14 + Math.sin(a) * 10;
          g.lineStyle(3, TAR, 0.9); g.lineBetween(bx, by, f.x + Math.cos(a) * 8, f.y + 4);
        }
        g.lineStyle(4, 0x000000, 0.5); g.strokeCircle(f.x, f.y + 4, 30);
        g.lineStyle(3, 0xf0e6c8, 0.9);
        g.beginPath(); g.arc(f.x, f.y + 4, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(s.struggle, 0, 1), false); g.strokePath();
      }
    },

    drawAir(g, time) {
      const ts = time / 1000;
      // Kettle bodies, lit by their fires, and their tar smoke.
      for (const k of kettles) {
        const tipping = k.tipAt && time - k.tipAt < 700;
        const lean = tipping ? Math.sin(((time - k.tipAt) / 700) * Math.PI) * 0.5 : 0;
        const ox = Math.cos(k.tipA) * lean * 14, oy = Math.sin(k.tipA) * lean * 10;
        g.fillStyle(0x0e0e10, 1); g.fillEllipse(k.x + ox, k.y - 4 + oy, 62, 46);
        g.fillStyle(0x1e1e22, 1); g.fillEllipse(k.x - 6 + ox, k.y - 8 + oy, 44, 30);
        g.fillStyle(0x0e0e10, 1); g.fillEllipse(k.x + ox * 1.6, k.y - 22 + oy * 1.6, 64, 18);
        const full = time >= k.readyAt;
        g.fillStyle(full ? TAR : 0x2a1a12, 1); g.fillEllipse(k.x + ox * 1.6, k.y - 22 + oy * 1.6, 54, 12);
        if (full) { g.fillStyle(FLAME, 0.25); g.fillEllipse(k.x + ox * 1.6, k.y - 23 + oy * 1.6, 30, 5); }
        for (let i = 0; i < 2; i++) flameTongue(g, k.x - 14 + i * 28, k.y + 18, 12, ts, k.x * 0.1 + i);
        for (let i = 0; i < 3; i++) sootPuff(g, k.x + (i - 1) * 8, k.y - 28, (ts * 0.5 + i / 3 + k.x * 0.002) % 1, 10, full ? 0.55 : 0.25);
      }
      // Tar streams arcing from the ladle to their patch.
      for (const p of patches) {
        if (time >= p.landAt || time < p.bornAt) continue;
        const c = clamp((time - p.bornAt) / (p.landAt - p.bornAt), 0, 1);
        for (let i = 0; i < 9; i++) {
          const t = clamp(c - i * 0.045, 0, 1);
          if (t <= 0) continue;
          const x = p.fromX + (p.x - p.fromX) * t, y = p.fromY + (p.y - p.fromY) * t - Math.sin(t * Math.PI) * 120;
          g.fillStyle(TAR, 1); g.fillCircle(x, y, 7 - i * 0.5);
          g.fillStyle(FLAME, 0.45); g.fillCircle(x - 2, y - 2, 2);
        }
      }
      // Grime's ladle: a long pole with a steaming cup, and his pour pips over his head.
      const n = ctx.npc;
      if (alive(n)) {
        const sw = Math.sin(ts * 2) * 0.2;
        const a = -Math.PI / 4 + sw;
        const ex = n.x + Math.cos(a) * 50, ey = n.y - 10 + Math.sin(a) * 50;
        g.lineStyle(3.5, 0x6a4a2a, 1); g.lineBetween(n.x + 6, n.y - 6, ex, ey);
        g.fillStyle(0x2a2a2e, 1); g.fillCircle(ex, ey, 9);
        g.fillStyle(ladle > 0 ? TAR : 0x3a3a3e, 1); g.fillCircle(ex, ey - 1, 6.5);
        if (ladle > 0) sootPuff(g, ex, ey - 6, (ts * 0.8) % 1, 6, 0.4);
        for (let i = 0; i < 3; i++) {
          g.fillStyle(i < ladle ? TAR : 0x4a4a4e, 1); g.fillCircle(n.x - 12 + i * 12, n.y - 62, 4.5);
          g.lineStyle(1.5, i < ladle ? FLAME : 0x6a6a6a, 0.9); g.strokeCircle(n.x - 12 + i * 12, n.y - 62, 4.5);
        }
      }
    },
  };
}

export const TAR_PIT: GimmickDef = {
  id: GIM_TAR,
  rules: 'Hot tar holds you fast and you take more while stuck — strain to tear free. Walk into a full kettle to tip it over on Grime.',
  make: makeTarPit,
};
