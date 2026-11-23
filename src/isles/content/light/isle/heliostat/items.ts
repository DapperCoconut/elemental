import type { IsleItemDef, ItemScriptCtx, ItemScriptFactory } from '../../../../IslesTypes';
import { BRASS, GOLD, GOLD_LIT, IRON, MIRROR, SUN, cog, sunDisc } from './art';

/**
 * The Heliostat's treasures: the Despot's own pinned sun (his artifact), and two charms found in
 * the machine — a signalling mirror from the Lens Gallery's west aisle, and a pawl knocked off the
 * Sun Chain's ratchet.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const TAU = Math.PI * 2;

// ── art-auriel: The Pinned Sun ───────────────────────────────────────

/**
 * A little sun on a chain, the size of a fist — the last link of the Heliostat. It circles you
 * once every 6s, so your shadow swings round you the other way. Hits you land while the foe is in
 * your shadow ECLIPSE them: +8 damage. And where the sun itself passes over the foe it scorches
 * them for 6.
 */
const pinnedSun: ItemScriptFactory = (ctx) => {
  const ORBIT = 74;
  const PERIOD = 6000;
  const SHADE_HALF = 0.5;
  const SHADE_LEN = 380;
  let sunA = 0;
  let eclipseAt = 0;
  let scorchAt = 0;
  let flashAt = 0;
  const sunPos = () => ({ x: ctx.player.x + Math.cos(sunA) * ORBIT, y: ctx.player.y - 10 + Math.sin(sunA) * ORBIT * 0.7 });
  const inShadow = (): boolean => {
    const p = ctx.player, n = ctx.npc;
    const d = Math.hypot(n.x - p.x, n.y - p.y);
    return d < SHADE_LEN && Math.abs(wrap(Math.atan2(n.y - p.y, n.x - p.x) - (sunA + Math.PI))) < SHADE_HALF;
  };
  return {
    update(time) {
      sunA = (time / PERIOD) * TAU;
      if (!alive(ctx, 'player') || !alive(ctx, 'npc')) return;
      const s = sunPos(), n = ctx.npc;
      if (Math.hypot(n.x - s.x, n.y - s.y) < 34 && time - scorchAt > 700) {
        scorchAt = time;
        ctx.hit(n, 6, n.x, n.y);
        ctx.float(n.x, n.y - 50, 'SCORCHED', '#ffd27a');
        ctx.sfx('sizzle');
      }
    },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (!alive(ctx, 'npc') || now - eclipseAt < 450 || !inShadow()) return;
      eclipseAt = now;
      flashAt = now;
      const n = ctx.npc;
      ctx.hit(n, 8, n.x, n.y);
      ctx.float(n.x, n.y - 56, 'ECLIPSED', '#c8b8ff');
      ctx.sfx('hush');
    },
    drawGround(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const a = sunA + Math.PI;
      // Your shadow, long and swinging.
      g.fillStyle(0x1a1430, 0.22 + (time - flashAt < 300 ? 0.2 : 0));
      g.slice(p.x, p.y, SHADE_LEN, a - SHADE_HALF, a + SHADE_HALF, false); g.fillPath();
      g.lineStyle(1, 0x8a7ac8, 0.4);
      g.lineBetween(p.x, p.y, p.x + Math.cos(a - SHADE_HALF) * SHADE_LEN, p.y + Math.sin(a - SHADE_HALF) * SHADE_LEN);
      g.lineBetween(p.x, p.y, p.x + Math.cos(a + SHADE_HALF) * SHADE_LEN, p.y + Math.sin(a + SHADE_HALF) * SHADE_LEN);
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player, s = sunPos();
      // The chain to it, and the sun.
      g.lineStyle(2, IRON, 0.8); g.lineBetween(p.x, p.y - 10, s.x, s.y);
      sunDisc(g, s.x, s.y, 9, time, 1);
    },
  };
};

// ── charm-heliostat-heliograph ───────────────────────────────────────

/**
 * A signalling mirror in a brass case, the kind the Lens Gallery's keepers flash to each other
 * across the rails. Cast your E while facing the foe within 340px and it flashes them: 6 damage
 * and dazzled (stunned 0.5s). Once every 10s.
 */
const heliograph: ItemScriptFactory = (ctx) => {
  const RANGE = 340;
  const HALF = 0.5;
  const EVERY = 10000;
  let readyAt = 0;
  let flashAt = -9999;
  let flashA = 0;
  return {
    onCast(_id, slot) {
      if (slot !== 'e' || !alive(ctx, 'npc') || !alive(ctx, 'player')) return;
      const now = ctx.scene.time.now;
      if (now < readyAt) return;
      const p = ctx.player, n = ctx.npc;
      const face = ctx.facing(p);
      const toFoe = Math.atan2(n.y - p.y, n.x - p.x);
      if (Math.hypot(n.x - p.x, n.y - p.y) > RANGE || Math.abs(wrap(face - toFoe)) > HALF) return;
      readyAt = now + EVERY;
      flashAt = now;
      flashA = toFoe;
      ctx.hit(n, 6, n.x, n.y);
      ctx.stun(n, 500);
      ctx.float(n.x, n.y - 56, 'DAZZLED', '#ffffff');
      ctx.flash(n.x, n.y, 0xffffff);
      ctx.sfx('blink');
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const k = 1 - (time - flashAt) / 350;
      if (k > 0) {
        g.fillStyle(0xffffff, 0.5 * k);
        g.slice(p.x, p.y - 10, RANGE, flashA - HALF * 0.6, flashA + HALF * 0.6, false); g.fillPath();
      }
      // The little mirror at your hip, glinting when it is ready.
      const ready = ctx.scene.time.now >= readyAt;
      g.fillStyle(BRASS, 1); g.fillCircle(p.x + 16, p.y - 4, 6);
      g.fillStyle(MIRROR, 1); g.fillCircle(p.x + 16, p.y - 4, 4);
      if (ready) { g.fillStyle(0xffffff, 0.5 + 0.5 * Math.sin(time / 180)); g.fillCircle(p.x + 15, p.y - 5, 1.6); }
    },
  };
};

// ── charm-heliostat-pawl ─────────────────────────────────────────────

/**
 * The pawl off a ratchet on the Sun Chain — the tooth that kept it from slipping back. Every 24
 * damage you take winds it a click (up to 3). Your next cast lets every click go at once: that
 * ability comes back 1.2s sooner per click, and the foe, if within 220px, takes 6 per click.
 */
const pawl: ItemScriptFactory = (ctx) => {
  const PER_CLICK = 24;
  const MAX = 3;
  const REACH = 220;
  let tension = 0;
  let releaseAt = -9999;
  let released = 0;
  const clicks = (): number => Math.min(MAX, Math.floor(tension / PER_CLICK));
  return {
    onHitTaken(amount) {
      const before = clicks();
      tension = Math.min(MAX * PER_CLICK, tension + amount);
      if (clicks() > before) { ctx.sfx('gear-turn'); ctx.float(ctx.player.x, ctx.player.y - 56, `CLICK ${clicks()}`, '#ffd27a'); }
    },
    onCast(id) {
      const c = clicks();
      if (c === 0 || !alive(ctx, 'player')) return;
      tension = 0;
      released = c;
      releaseAt = ctx.scene.time.now;
      ctx.refund(id, c * 1200);
      const p = ctx.player, n = ctx.npc;
      if (alive(ctx, 'npc') && Math.hypot(n.x - p.x, n.y - p.y) <= REACH) {
        ctx.hit(n, 6 * c, n.x, n.y);
        ctx.float(n.x, n.y - 52, `RATCHET ×${c}`, '#ffd27a');
      }
      ctx.sfx('clang');
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const c = clicks();
      const spin = time - releaseAt < 500 ? (time - releaseAt) / 40 : c * 0.5;
      cog(g, p.x - 26, p.y - 46, 7, 8, spin, c > 0 ? BRASS : IRON);
      for (let i = 0; i < MAX; i++) {
        g.fillStyle(i < c ? GOLD_LIT : 0x3a3a44, 1); g.fillCircle(p.x - 14 + i * 7, p.y - 46, 2.5);
      }
      if (time - releaseAt < 400) {
        const k = (time - releaseAt) / 400;
        g.lineStyle(3, GOLD, 1 - k); g.strokeCircle(p.x, p.y, 30 + k * 60 * released / MAX);
        g.fillStyle(SUN, 0.3 * (1 - k)); g.fillCircle(p.x, p.y, 20);
      }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const HELIOSTAT_ITEMS: IsleItemDef[] = [
  {
    id: 'art-auriel', name: 'The Pinned Sun', emoji: '🌞', kind: 'artifact', isle: 'light',
    flavor: 'The last link of the Sun Chain, and a sun no bigger than a fist on it. It has not set in twenty-two years. It can now.',
    script: 'art-auriel', effect: { maxHp: 25 },
    scriptText: [
      'A little sun circles you every 6s, and your shadow swings round the other way.',
      'Hits on a foe standing in your shadow ECLIPSE them for +8. The sun scorches the foe it passes over for 6.',
    ],
  },
  {
    id: 'charm-heliostat-heliograph', name: 'Pocket Heliograph', emoji: '🪞', kind: 'charm', isle: 'light', sell: 260,
    flavor: 'A signalling mirror in a brass case. The lens-keepers flashed each other with it across the rails, in a code nobody bleached ever learned.',
    script: 'charm-heliostat-heliograph',
    scriptText: ['Cast E facing the foe within 340px: a flash deals 6 and dazzles them (stun 0.5s). Every 10s.'],
  },
  {
    id: 'charm-heliostat-pawl', name: 'Ratchet Pawl', emoji: '⚙️', kind: 'charm', isle: 'light', sell: 280,
    flavor: 'Knocked off the Sun Chain\'s ratchet. For twenty-two years it did not let go of anything. It is ready to.',
    script: 'charm-heliostat-pawl', effect: { damageTakenMult: 0.98 },
    scriptText: ['Each 24 damage taken winds a click (max 3). Your next cast releases them: −1.2s cooldown and 6 damage within 220px, per click.'],
  },
];

export const HELIOSTAT_SCRIPTS: Record<string, ItemScriptFactory> = {
  'art-auriel': pinnedSun,
  'charm-heliostat-heliograph': heliograph,
  'charm-heliostat-pawl': pawl,
};
