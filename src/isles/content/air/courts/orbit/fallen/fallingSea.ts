import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { live } from '../gimmicks/shared';
import { glow, type G } from '../../../../../art/IsleArt';
import { BRASS, BRASS_DARK, LODE_GLINT, METER, POOL, POOL_DEEP, POOL_LIT, SKY_PALE, WHITE } from '../palette';
import { dist } from '../orbitArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Falling Sea — Pool-Warden Ysolde Brack, in the King's telling the warden of the Moonpool
 * who held a debtor's head in the floating water until their breath-meter read low enough.
 *
 * The Moonpool hangs over the yard: a ball of water the size of a cart, held up by the moon's
 * pull, with the court's moon-fish turning inside it. Ysolde steers it over you. Every few
 * seconds the moon lets go: its shadow on the paving shrinks to a hard ring, the ball sinks —
 * and it drops, a crushing splash under it and a ring of spray thrown outward with one gap in it.
 * It leaves a puddle that drags at your feet while the ball gathers itself back up.
 *
 * The ball is a thing you can STRIKE: every blow shoves it a stride away from whoever struck it,
 * right up to the instant it falls. Shove it over her as the shadow tightens. The bot keeps the
 * ball between itself and you, and strikes it toward you when it casts.
 */

const ID = fallenId('orbit', 'sea');
const BALL_R = 76;
const LIFT = 96;
const HOVER_MS = 6200;
const FALL_MS = 1250;
const POOL_MS = 2600;
const RISE_MS = 1700;
const SHOVE = 48;

type Phase = 'hover' | 'fall' | 'pool';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  let bx = W / 2, by = (top + H) / 2;
  let phase: Phase = 'hover';
  let phaseAt = 0;
  let started = false;
  let lastShove = -9999;
  let now = 0;
  let quick = false;
  let lastPuddleTick = 0;
  let target: StrikeTarget | null = null;
  const fish = [0, 1, 2].map((i) => ({ a: rng() * Math.PI * 2, r: 20 + i * 14, sp: 0.7 + rng() * 0.8 }));
  const clampX = (x: number): number => Math.max(BALL_R * 0.6, Math.min(W - BALL_R * 0.6, x));
  const clampY = (y: number): number => Math.max(top + 30, Math.min(H - 30, y));

  /** Height of the ball above its shadow, by phase. */
  const height = (time: number): number => {
    const k = (time - phaseAt);
    if (phase === 'hover') return LIFT + Math.sin(time / 600) * 6;
    if (phase === 'fall') return LIFT * (1 - Math.pow(Math.min(1, k / FALL_MS), 3));
    return k < POOL_MS ? 0 : LIFT * Math.min(1, (k - POOL_MS) / RISE_MS);
  };

  function splash(): void {
    ctx.sfx('geyser');
    ctx.flash(bx, by, POOL_LIT);
    if (live(player) && dist(player.x, player.y, bx, by) < BALL_R + 18) { tk.hitPlayer(20, player.x, player.y); tk.slowPlayer(0.6, 900); }
    if (live(npc) && dist(npc.x, npc.y, bx, by) < BALL_R + 18) { ctx.hit(npc, 28, npc.x, npc.y); ctx.float(npc.x, npc.y - 50, 'UNDER', '#caf0ff'); }
    // Spray thrown outward with one dry gap, facing away from the warden's side of the splash.
    const gap = Math.atan2(by - npc.y, bx - npc.x) + (rng() - 0.5) * 1.2;
    tk.spawnRing({ cx: bx, cy: by, delayMs: 0, speed: 320, gapCentre: gap, gapHalf: 0.6, band: 16, damage: 9, startRadius: BALL_R });
  }

  return {
    update(time, dt) {
      now = time;
      if (!started) {
        started = true;
        phaseAt = time;
        target = ctx.target({
          x: bx, y: by - LIFT, r: 58,
          onStruck: (who) => {
            if (phase === 'pool' || now - lastShove < 240) return;
            lastShove = now;
            const f = who === 'player' ? player : npc;
            const a = Math.atan2(by - f.y, bx - f.x);
            bx = clampX(bx + Math.cos(a) * SHOVE);
            by = clampY(by + Math.sin(a) * SHOVE);
            ctx.sfx('splash');
          },
        });
      }
      if (!quick && npc.hp < npc.maxHp * 0.5) { quick = true; ctx.banner('THE MOON LETS GO MORE OFTEN', '#caf0ff'); ctx.sfx('rain'); }
      const k = time - phaseAt;
      if (phase === 'hover') {
        // The warden steers it over you.
        if (live(player)) {
          const d = dist(bx, by, player.x, player.y);
          const sp = (quick ? 70 : 52) * dt;
          if (d > 4) { bx = clampX(bx + (player.x - bx) / d * Math.min(d, sp)); by = clampY(by + (player.y - by) / d * Math.min(d, sp)); }
        }
        if (k > HOVER_MS - (quick ? 1400 : 0)) { phase = 'fall'; phaseAt = time; ctx.sfx('bubble'); }
      } else if (phase === 'fall') {
        if (k >= FALL_MS) { splash(); phase = 'pool'; phaseAt = time; }
      } else {
        if (k < POOL_MS && time - lastPuddleTick > 300) {
          lastPuddleTick = time;
          if (live(player) && dist(player.x, player.y, bx, by) < BALL_R * 1.3) tk.slowPlayer(0.7, 360);
        }
        if (k >= POOL_MS + RISE_MS) { phase = 'hover'; phaseAt = time; }
      }
      for (const f of fish) f.a += f.sp * dt;
      target?.moveTo(bx, by - height(time));
    },

    npcSpeedMult: () => (phase === 'pool' && dist(npc.x, npc.y, bx, by) < BALL_R * 1.3 ? 0.7 : 1),

    npcSeek() {
      if (!live(player)) return null;
      // Far side of the ball from you, near enough to strike it your way.
      const a = Math.atan2(by - player.y, bx - player.x);
      const r = phase === 'fall' ? BALL_R + 110 : BALL_R + 70;
      return { x: clampX(bx + Math.cos(a) * r), y: clampY(by + Math.sin(a) * r) };
    },

    drawGround(g, time) {
      const k = time - phaseAt;
      if (phase === 'pool') { drawPuddle(g, bx, by, k, time); return; }
      // The shadow: soft and wide while it hovers, a hard tightening ring as it falls.
      const f = phase === 'fall' ? Math.min(1, k / FALL_MS) : 0;
      const sr = BALL_R * (1.15 - f * 0.15);
      g.fillStyle(POOL_DEEP, 0.12 + f * 0.25); g.fillEllipse(bx, by, sr * 2, sr * 0.8);
      for (let i = 0; i < 5; i++) {
        const ph = ((time / 1400) + i / 5) % 1;
        g.lineStyle(1, POOL_LIT, 0.25 * (1 - ph)); g.strokeEllipse(bx + Math.sin(i * 2.1) * 20, by + Math.cos(i * 1.3) * 6, 20 + ph * 50, 6 + ph * 16);
      }
      if (phase === 'fall') {
        g.lineStyle(3, METER, 0.4 + f * 0.5); g.strokeEllipse(bx, by, (BALL_R + 18) * 2, (BALL_R + 18) * 0.8);
        g.lineStyle(4, POOL_LIT, 0.9);
        g.beginPath(); g.arc(bx, by, BALL_R + 18, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2, false); g.strokePath();
      }
    },

    drawAir(g, time) {
      const h = height(time);
      if (phase === 'pool' && h <= 0) return;
      const rise = phase === 'pool' ? h / LIFT : 1;
      drawBall(g, bx, by - h, BALL_R * (0.35 + 0.65 * rise), time, fish, phase === 'fall');
      // Drips: a steady patter from the underside, heavier as it lets go.
      const n = phase === 'fall' ? 9 : 4;
      for (let i = 0; i < n; i++) {
        const ph = ((time / 500) + i / n) % 1;
        const dx = bx + Math.sin(i * 2.7) * BALL_R * 0.5;
        g.fillStyle(POOL_LIT, 0.8 * (1 - ph)); g.fillEllipse(dx, by - h + BALL_R * 0.8 + ph * h, 2.5, 5);
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 18;
      // A little glass draining: how long the moon still holds the water up.
      const k = phase === 'hover' ? Math.min(1, (time - phaseAt) / (HOVER_MS - (quick ? 1400 : 0))) : 1;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 20, y - 14, 40, 28, 6);
      g.lineStyle(2, BRASS, 1); g.strokeRoundedRect(x - 8, y - 11, 16, 22, 4);
      g.fillStyle(POOL, 0.9); g.fillRect(x - 6, y - 9 + 18 * k, 12, 18 * (1 - k));
      g.fillStyle(phase === 'fall' ? METER : BRASS_DARK, 1); g.fillCircle(x + 14, y - 8, 3);
    },

    destroy() { target?.remove(); },
  };
}

/**
 * The Moonpool: a wobbling sphere of water — deep blue core, lighter shell, a bright meniscus
 * where the light hits, moon-fish turning inside and a corked breath-bottle bobbing at the middle.
 */
function drawBall(g: G, x: number, y: number, r: number, time: number, fish: { a: number; r: number }[], falling: boolean): void {
  const wob = Math.sin(time / 180) * (falling ? 0.1 : 0.04);
  const rx = r * (1 + wob), ry = r * (1 - wob);
  glow(g, x, y, r * 1.4, POOL, 0.05, 3);
  g.fillStyle(POOL_DEEP, 0.92); g.fillEllipse(x, y, rx * 2, ry * 2);
  g.fillStyle(POOL, 0.7); g.fillEllipse(x - r * 0.08, y - r * 0.1, rx * 1.7, ry * 1.6);
  g.fillStyle(POOL_DEEP, 0.5); g.fillEllipse(x + r * 0.15, y + r * 0.3, rx * 1.2, ry * 0.7);
  // The moon's pull shows as a faint violet band round the water's waist.
  g.lineStyle(2, LODE_GLINT, 0.35); g.strokeEllipse(x, y, rx * 2, ry * 0.5);
  for (const f of fish) {
    const fx = x + Math.cos(f.a) * f.r * (r / BALL_R), fy = y + Math.sin(f.a) * f.r * 0.6 * (r / BALL_R);
    const hd = f.a + Math.PI / 2;
    g.fillStyle(SKY_PALE, 0.75); g.fillEllipse(fx, fy, 12 * (r / BALL_R), 5 * (r / BALL_R));
    g.fillTriangle(fx - Math.cos(hd) * 6, fy - Math.sin(hd) * 3, fx - Math.cos(hd) * 11 - 3, fy - 3, fx - Math.cos(hd) * 11 + 3, fy + 3);
  }
  // A breath-bottle caught in the middle, corked, bobbing.
  const bob = Math.sin(time / 400) * 4;
  g.fillStyle(0xb8dcc8, 0.7); g.fillRoundedRect(x - 5, y - 8 + bob, 10, 16, 3);
  g.fillStyle(0xb8dcc8, 0.7); g.fillRect(x - 2, y - 13 + bob, 4, 6);
  g.fillStyle(0x8a5a34, 1); g.fillRect(x - 2.5, y - 15 + bob, 5, 3);
  // Shell and meniscus.
  g.lineStyle(2, POOL_LIT, 0.8); g.strokeEllipse(x, y, rx * 2, ry * 2);
  g.fillStyle(WHITE, 0.55); g.fillEllipse(x - r * 0.38, y - r * 0.5, r * 0.5, r * 0.18);
  g.fillStyle(WHITE, 0.3); g.fillEllipse(x + r * 0.35, y + r * 0.55, r * 0.35, r * 0.1);
}

/** The puddle the fall leaves: a spreading sheet with rings, and a stranded fish flapping in it. */
function drawPuddle(g: G, x: number, y: number, k: number, time: number): void {
  const fade = k < POOL_MS ? 1 : Math.max(0, 1 - (k - POOL_MS) / RISE_MS);
  const sp = Math.min(1, k / 300);
  g.fillStyle(POOL_DEEP, 0.45 * fade); g.fillEllipse(x, y, BALL_R * 2.6 * sp, BALL_R * 1.0 * sp);
  g.fillStyle(POOL, 0.35 * fade); g.fillEllipse(x - 10, y - 3, BALL_R * 2.0 * sp, BALL_R * 0.7 * sp);
  for (let i = 0; i < 4; i++) {
    const ph = ((time / 900) + i / 4) % 1;
    g.lineStyle(1.5, POOL_LIT, 0.5 * (1 - ph) * fade); g.strokeEllipse(x + (i - 1.5) * 24, y + Math.sin(i) * 8, 10 + ph * 40, 4 + ph * 12);
  }
  const flap = Math.sin(time / 90) * 4;
  g.fillStyle(SKY_PALE, fade); g.fillEllipse(x + 30, y + 6 - Math.abs(flap), 14, 6);
  g.fillTriangle(x + 37, y + 6 - Math.abs(flap), x + 44, y + 2 + flap, x + 44, y + 10 - flap);
  // Where it climbs back up: a column of water lifting from the sheet.
  if (k > POOL_MS) {
    const c = (k - POOL_MS) / RISE_MS;
    g.fillStyle(POOL, 0.4); g.fillRect(x - 8, y - LIFT * c, 16, LIFT * c);
    g.lineStyle(1, POOL_LIT, 0.6); g.lineBetween(x - 4, y, x - 4, y - LIFT * c);
  }
}

export const FALLEN_SEA: GimmickDef = {
  id: ID,
  rules: 'The Moonpool hovers over you and drops: crushing splash, then a ring of spray with one gap. Strike the ball to shove it — drop it on her.',
  make,
};
