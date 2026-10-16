import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  MAGNET, MagnetAvatar, MagnetFx, drawCoin, drawCoinShot, drawGatherPile, drawNail, drawOrbitRing,
  drawScrap, drawSpikeFlying, drawSpikeHover, drawSpikePlanted,
} from '../../../elements/kits/MagnetVisuals';
import { MagnetMech } from '../../../elements/kits/MagnetMech';

/**
 * Magnet's showcases (the 2026-10-15 scrap rework).
 *
 * Coins, nails, spikes and scrap are plain data in the kit, painted every frame by the exported
 * `draw*` painters — so these loops keep a tiny copy of the same records, step them with the
 * kit's numbers, and paint them with the same functions. The mech is the real `MagnetMech`,
 * given an empty target list (the dummy is not a fighter) and no camera shake.
 *
 * Containment: anything built inside `ctx.at` / `ctx.onFrame` goes through `ctx.capture` /
 * `ctx.adopt`; `MagnetFx` carries a sticky sink.
 */

// ── Kit numbers the loops replay ────────────────────────────────────────
const COIN_AIR_MS = 3000;
const COIN_PEAK = 120;
const COIN_SHOT_SPEED = 820;
const REPULSE_R = 170;
const REPULSE_HALF = Phaser.Math.DegToRad(70);
const NAIL_SPEED = 840;
const NAIL_RETURN_SPEED = 760;
const SPIKE_HOVER_MS = 2000;
const SPIKE_RADIUS = 95;
const ROD_SPEED = 1050;
const ORBIT_R = 46;

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

// ── Staging ───────────────────────────────────────────────────────────

function stage(ctx: PreviewCtx): { fx: MagnetFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new MagnetFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new MagnetAvatar(ctx.scene, ctx.tint, 'player'));
  av.setFacing(ctx.aim);
  return { fx, av };
}

/** A stand-in enemy the script can move. */
function dummyAt(ctx: PreviewCtx, at: { x: number; y: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color, stroke: '#07090e', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

// ── A miniature of the kit's world ───────────────────────────────────

interface Coin { sx: number; sy: number; lx: number; ly: number; air: number; spin: number; x: number; y: number; z: number }
interface Shot { x: number; y: number; vx: number; vy: number; life: number }
interface Nail { x: number; y: number; angle: number; state: 'fly' | 'stuck' | 'return'; vx: number; vy: number }
interface Spike { x: number; y: number; state: 'hover' | 'planted' | 'flying'; born: number; vx: number; vy: number; zipped: boolean }
interface Shard { x: number; y: number; vx: number; vy: number; angle: number; spin: number; seed: number; state: 'fly' | 'ground' | 'orbit' }

interface World {
  coins: Coin[];
  shots: Shot[];
  nails: Nail[];
  spikes: Spike[];
  shards: Shard[];
  hover: boolean;
  /** Elapsed of the loop, so spikes can count their hover. */
  now: number;
}

/**
 * Step and paint everything in `w`. `victim` is asked about hits; `onWall` fires when a flying
 * spike reaches the edge of the box.
 */
function worldLayer(
  ctx: PreviewCtx, w: World,
  victim: { x: number; y: number } | null,
  hooks: { onShotHit?: (s: Shot) => void; onNailHit?: (n: Nail) => void; onSpikeWall?: (s: Spike, nx: number, ny: number) => void; onSpikeHit?: (s: Spike) => void } = {},
): void {
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const hitSpikes = new Set<Spike>();
  ctx.onFrame((dt, elapsed) => {
    w.now = elapsed;
    const s = dt / 1000;
    const t = elapsed / 1000;
    const caster = ctx.casterAt();
    ground.clear();
    air.clear();

    for (let i = w.coins.length - 1; i >= 0; i--) {
      const c = w.coins[i];
      if (!w.hover) { c.air += dt; c.spin += 16 * s; } else c.spin += 1.5 * s;
      const k = Phaser.Math.Clamp(c.air / COIN_AIR_MS, 0, 1);
      c.x = Phaser.Math.Linear(c.sx, c.lx, k);
      c.y = Phaser.Math.Linear(c.sy, c.ly, k);
      c.z = 4 * COIN_PEAK * k * (1 - k);
      if (k >= 1) { w.coins.splice(i, 1); continue; }
      drawCoin(air, ctx.tint, c.x, c.y, c.z, c.spin, w.hover, t);
    }

    for (let i = w.shots.length - 1; i >= 0; i--) {
      const sh = w.shots[i];
      sh.x += sh.vx * s; sh.y += sh.vy * s; sh.life -= dt;
      if (victim && Phaser.Math.Distance.Between(sh.x, sh.y, victim.x, victim.y) < 24) {
        hooks.onShotHit?.(sh);
        w.shots.splice(i, 1);
        continue;
      }
      if (sh.life <= 0 || sh.x > ctx.w || sh.x < 0) { w.shots.splice(i, 1); continue; }
      drawCoinShot(air, ctx.tint, sh.x, sh.y, Math.atan2(sh.vy, sh.vx), t);
    }

    for (let i = w.nails.length - 1; i >= 0; i--) {
      const n = w.nails[i];
      if (n.state === 'fly') {
        n.x += n.vx * s; n.y += n.vy * s;
        if (victim && Phaser.Math.Distance.Between(n.x, n.y, victim.x, victim.y) < 22) {
          n.state = 'stuck';
          hooks.onNailHit?.(n);
        } else if (n.x > ctx.w || n.x < 0) { w.nails.splice(i, 1); continue; }
      } else if (n.state === 'stuck' && victim) {
        n.x = victim.x - 10; n.y = victim.y - 4;
      } else if (n.state === 'return') {
        const a = Math.atan2(caster.y - n.y, caster.x - n.x);
        n.angle = a;
        n.x += Math.cos(a) * NAIL_RETURN_SPEED * s; n.y += Math.sin(a) * NAIL_RETURN_SPEED * s;
        if (Phaser.Math.Distance.Between(n.x, n.y, caster.x, caster.y) < 22) { w.nails.splice(i, 1); continue; }
      }
      drawNail(air, ctx.tint, n.x, n.y, n.angle, n.state, caster.x, caster.y, t);
    }

    for (let i = w.spikes.length - 1; i >= 0; i--) {
      const sp = w.spikes[i];
      if (sp.state === 'hover') {
        drawSpikeHover(air, ctx.tint, sp.x, sp.y, Phaser.Math.Clamp((elapsed - sp.born) / SPIKE_HOVER_MS, 0, 1), SPIKE_RADIUS, t);
      } else if (sp.state === 'planted') {
        drawSpikePlanted(ground, ctx.tint, sp.x, sp.y, t, !sp.zipped, 1);
      } else {
        sp.x += sp.vx * s; sp.y += sp.vy * s;
        if (victim && !hitSpikes.has(sp) && Phaser.Math.Distance.Between(sp.x, sp.y, victim.x, victim.y) < 30) {
          hitSpikes.add(sp);
          hooks.onSpikeHit?.(sp);
        }
        const nx = sp.x >= ctx.w - 10 ? -1 : sp.x <= 10 ? 1 : 0;
        const ny = sp.y >= ctx.h - 10 ? -1 : sp.y <= 10 ? 1 : 0;
        if (nx !== 0 || ny !== 0) { hooks.onSpikeWall?.(sp, nx, ny); w.spikes.splice(i, 1); continue; }
        drawSpikeFlying(air, ctx.tint, sp.x, sp.y, Math.atan2(sp.vy, sp.vx));
      }
    }

    const orbit = w.shards.filter((sh) => sh.state === 'orbit');
    if (orbit.length > 0) drawOrbitRing(air, ctx.tint, caster.x, caster.y, ORBIT_R, t);
    let k = 0;
    for (const sh of w.shards) {
      if (sh.state === 'fly') {
        sh.x += sh.vx * s; sh.y += sh.vy * s;
        const drag = Math.pow(0.12, s);
        sh.vx *= drag; sh.vy *= drag;
        sh.angle += sh.spin * s;
        if (sh.y < 10 || sh.y > ctx.h - 10) sh.vy = -sh.vy;
        if (Math.hypot(sh.vx, sh.vy) < 120) sh.state = 'ground';
      } else if (sh.state === 'ground') {
        if (Phaser.Math.Distance.Between(sh.x, sh.y, caster.x, caster.y) < 76) sh.state = 'orbit';
      }
      if (sh.state === 'orbit') {
        const a = t * 3 + (k / Math.max(1, orbit.length)) * Math.PI * 2;
        sh.x = caster.x + Math.cos(a) * ORBIT_R;
        sh.y = caster.y + Math.sin(a) * ORBIT_R;
        sh.angle = a * 1.3;
        k++;
      }
      drawScrap(sh.state === 'ground' ? ground : air, ctx.tint, sh.x, sh.y, sh.angle, 10, sh.seed, sh.state, t);
    }
  });
}

function emptyWorld(): World {
  return { coins: [], shots: [], nails: [], spikes: [], shards: [], hover: false, now: 0 };
}

/** Straight up off the thumb: it comes down where the caster stood when it was flipped. */
function tossCoin(ctx: PreviewCtx, w: World): void {
  const c = ctx.casterAt();
  w.coins.push({ sx: c.x, sy: c.y, lx: c.x, ly: c.y, air: 0, spin: Math.random() * 3, x: c.x, y: c.y, z: 0 });
}

/** Repulse from the caster toward `ang`: coins in the cone become shots. Returns how many fired. */
function repulse(ctx: PreviewCtx, fx: MagnetFx, av: BaseAvatar, w: World, ang: number): number {
  const c = ctx.casterAt();
  fx.repulse(c.x, c.y, ang, REPULSE_R, REPULSE_HALF, MAGNET.blue);
  av.play('clap', ang, 300);
  const inCone = (x: number, y: number): boolean => {
    const d = Phaser.Math.Distance.Between(c.x, c.y, x, y);
    if (d > REPULSE_R + 12) return false;
    return d < 24 || Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(y - c.y, x - c.x) - ang)) <= REPULSE_HALF;
  };
  let n = 0;
  for (let i = w.coins.length - 1; i >= 0; i--) {
    const coin = w.coins[i];
    if (!inCone(coin.x, coin.y - coin.z) && !inCone(coin.x, coin.y)) continue;
    w.coins.splice(i, 1);
    w.shots.push({ x: coin.x, y: coin.y - coin.z, vx: Math.cos(ang) * COIN_SHOT_SPEED, vy: Math.sin(ang) * COIN_SHOT_SPEED, life: 1100 });
    n++;
  }
  for (const sp of w.spikes) {
    if (sp.state !== 'planted' || !inCone(sp.x, sp.y)) continue;
    sp.state = 'flying';
    sp.vx = Math.cos(ang) * ROD_SPEED;
    sp.vy = Math.sin(ang) * ROD_SPEED;
  }
  for (const nl of w.nails) {
    if (nl.state !== 'return' || Phaser.Math.Distance.Between(c.x, c.y, nl.x, nl.y) > 150) continue;
    nl.state = 'fly';
    nl.angle = ang;
    nl.vx = Math.cos(ang) * NAIL_SPEED;
    nl.vy = Math.sin(ang) * NAIL_SPEED;
  }
  return n;
}

function shatter(fx: MagnetFx, w: World, x: number, y: number, inward: number, count: number): void {
  fx.flash(x, y, 30, 10, MAGNET.sky);
  fx.shrapnel(x, y, 8, { angle: inward, spread: 0.9, speed: 260, size: 10, color: MAGNET.iron });
  for (let k = 0; k < count; k++) {
    const a = inward + (count === 1 ? 0 : (k / (count - 1) - 0.5) * 1.4);
    const v = 470;
    w.shards.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, angle: a, spin: 10, seed: k * 13 + 3, state: 'fly' });
  }
}

// ══ CLICK — Coin Flip ══════════════════════════════════════════════════

export const coinFlip: PreviewScript = {
  duration: 7200,
  scale: 0.9,
  caption: 'Click — a coin flips straight up where you stand and lands 3s later. Hold to freeze them; Repulse fires them for 6 each',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.cx + 300, y: ctx.cy };
    dummyAt(ctx, target);
    const w = emptyWorld();
    worldLayer(ctx, w, target, {
      onShotHit: (s) => { fx.sparks(s.x, s.y, 4, Math.PI, 10, MAGNET.goldHi); float(ctx, target.x, target.y - 26, '6', hex(MAGNET.gold), 12); },
    });
    // Flip, step forward, flip — a row of coins left hanging along the walk.
    ctx.glideCaster({ to: { x: ctx.cx + 150, y: ctx.cy }, ms: 1700, ease: 'linear' });
    for (const at of [150, 600, 1050, 1500]) {
      ctx.at(at, () => { av.play('punch', -Math.PI / 2, 200); tossCoin(ctx, w); });
    }
    ctx.at(1800, () => { w.hover = true; av.setHold('brace'); float(ctx, ctx.cx + 80, ctx.cy - 70, 'HOLD', hex(MAGNET.sky)); });
    // Back up behind the row so the cone covers it.
    ctx.at(1900, () => ctx.glideCaster({ to: { x: ctx.cx - 20, y: ctx.cy }, ms: 900, ease: 'out' }));
    ctx.at(3600, () => { w.hover = false; av.setHold(null); });
    ctx.at(3650, () => {
      const n = repulse(ctx, fx, av, w, 0);
      if (n > 0) float(ctx, ctx.cx + 40, ctx.cy - 50, `REPULSE ×${n}`, hex(MAGNET.sky));
    });
  },
};

// ══ E — Repulse ════════════════════════════════════════════════════════

export const repulsePreview: PreviewScript = {
  duration: 6400,
  scale: 0.85,
  caption: 'E — a 170px cone fires everything in it: coins, a planted spike (30), and shoves a nailed foe from 340px',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.cx + 280, y: ctx.cy };
    dummyAt(ctx, target);
    const w = emptyWorld();
    w.spikes.push({ x: ctx.cx + 90, y: ctx.cy + 30, state: 'planted', born: 0, vx: 0, vy: 0, zipped: false });
    w.nails.push({ x: target.x - 10, y: target.y - 4, angle: 0, state: 'stuck', vx: 0, vy: 0 });
    worldLayer(ctx, w, target, {
      onShotHit: () => float(ctx, target.x, target.y - 26, '6', hex(MAGNET.gold), 12),
      onSpikeHit: () => float(ctx, target.x, target.y - 40, '30 SKEWERED', hex(MAGNET.sky), 12),
      onSpikeWall: (s, nx, ny) => shatter(fx, w, s.x, s.y, Math.atan2(ny, nx), 3),
    });
    ctx.glideCaster({ to: { x: ctx.cx + 110, y: ctx.cy }, ms: 1200, ease: 'linear' });
    for (const at of [150, 600, 1050]) {
      ctx.at(at, () => { av.play('punch', -Math.PI / 2, 200); tossCoin(ctx, w); });
    }
    ctx.at(1300, () => { w.hover = true; av.setHold('brace'); ctx.glideCaster({ to: { x: ctx.cx - 10, y: ctx.cy }, ms: 700, ease: 'out' }); });
    ctx.at(2400, () => {
      w.hover = false;
      av.setHold(null);
      repulse(ctx, fx, av, w, 0);
      fx.grasp(ctx.cx, ctx.cy, target.x, target.y, MAGNET.blue, 300);
      float(ctx, target.x, target.y - 56, 'REPULSED', hex(MAGNET.sky));
      let vx = 600;
      ctx.onFrame((dt) => { target.x = Math.min(ctx.w - 30, target.x + vx * dt / 1000); vx *= 0.9; });
    });
  },
};

// ══ R — Nail Implant ═══════════════════════════════════════════════════

export const nailImplant: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'R — a nail sticks (10). R again rips it out (15) and it flies home — Repulse it near you to fire it again',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.cx + 320, y: ctx.cy };
    dummyAt(ctx, target);
    const w = emptyWorld();
    worldLayer(ctx, w, target, {
      onNailHit: (n) => { fx.sparks(n.x, n.y, 5, Math.PI, 10, MAGNET.chrome); float(ctx, target.x, target.y - 26, '10 NAILED', hex(MAGNET.rose), 11); },
    });
    const shoot = (): void => {
      av.play('punch', 0, 240);
      const c = ctx.casterAt();
      w.nails.push({ x: c.x + 18, y: c.y, angle: 0, state: 'fly', vx: NAIL_SPEED, vy: 0 });
    };
    ctx.at(300, shoot);
    ctx.at(2000, () => {
      for (const n of w.nails) {
        if (n.state !== 'stuck') continue;
        n.state = 'return';
        fx.sparks(n.x, n.y, 7, Math.PI, 10, MAGNET.chrome);
        float(ctx, target.x, target.y - 26, '15 RIPPED OUT', hex(MAGNET.rose), 11);
      }
      av.play('punch', 0, 260);
    });
    // The nail is back within re-fire range about a third of a second later.
    ctx.at(2330, () => {
      repulse(ctx, fx, av, w, 0);
      float(ctx, ctx.cx + 40, ctx.cy - 40, 'RE-FIRED', hex(MAGNET.sky));
    });
  },
};

// ══ F — Steel Spike ════════════════════════════════════════════════════

export const steelSpike: PreviewScript = {
  duration: 8200,
  scale: 0.8,
  caption: 'F — the rod follows your cursor for 2s, then slams (22). F again rides to it; Repulse launches it (30) into a wall: 3 shards',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.cx + 240, y: ctx.cy + 10 };
    dummyAt(ctx, target);
    const w = emptyWorld();
    worldLayer(ctx, w, target, {
      onSpikeHit: () => float(ctx, target.x, target.y - 40, '30', hex(MAGNET.sky), 12),
      onSpikeWall: (s, nx, ny) => shatter(fx, w, s.x, s.y, Math.atan2(ny, nx), 3),
    });
    const drop = { x: ctx.cx + 140, y: ctx.cy - 20 };
    // The cursor wanders for the two seconds the rod hangs, and the rod sits on it.
    const cursor = ctx.adopt(ctx.scene.add.graphics().setDepth(19));
    ctx.onFrame((_dt, e) => {
      cursor.clear();
      if (e < 200 || e > 2200) return;
      const k = (e - 200) / 2000;
      const cx = drop.x + Math.sin(k * Math.PI * 2) * 70 * (1 - k);
      const cy = drop.y - 50 + k * 50 + Math.cos(k * Math.PI * 3) * 30 * (1 - k);
      cursor.lineStyle(2, 0xffffff, 0.9);
      cursor.strokeCircle(cx, cy, 6);
      cursor.lineBetween(cx - 10, cy, cx + 10, cy);
      cursor.lineBetween(cx, cy - 10, cx, cy + 10);
      const sp = w.spikes[0];
      if (sp && sp.state === 'hover') { sp.x = cx; sp.y = cy; }
    });
    ctx.at(200, () => {
      av.play('raise', 0, 400);
      w.spikes.push({ x: drop.x, y: drop.y - 50, state: 'hover', born: w.now, vx: 0, vy: 0, zipped: false });
    });
    ctx.at(2200, () => {
      const sp = w.spikes[0];
      if (!sp) return;
      sp.state = 'planted';
      fx.slam(sp.x, sp.y, SPIKE_RADIUS, MAGNET.sky);
      float(ctx, target.x, target.y - 26, '22', hex(MAGNET.sky), 12);
    });
    ctx.at(3300, () => {
      const sp = w.spikes[0];
      if (!sp) return;
      sp.zipped = true;
      fx.grasp(sp.x, sp.y, ctx.cx, ctx.cy, MAGNET.blue, 380);
      av.play('dash', 0, 300);
      ctx.glideCaster({ to: { x: sp.x - 50, y: sp.y + 6 }, ms: 260, ease: 'out' });
    });
    ctx.at(4100, () => {
      repulse(ctx, fx, av, w, Math.atan2(target.y - (drop.y + 6), target.x - (drop.x - 50)));
    });
  },
};

// ══ Q — Mecha Massacre ═════════════════════════════════════════════════

export const mechaMassacre: PreviewScript = {
  duration: 12000,
  scale: 0.55,
  caption: 'Q — 3s rooted while scrap streams in, then 15s as the mech: smash, rail, cannon, avalanche, self-destruct',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.w * 0.68, y: ctx.h * 0.62 };
    dummyAt(ctx, target);
    const pile = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const bits: Array<{ sx: number; sy: number; at: number; land: number; seed: number }> = [];
    let gathering = true;
    av.play('raise', -Math.PI / 2, 3000);
    ctx.onFrame((_dt, e) => {
      pile.clear();
      if (!gathering) return;
      const c = ctx.casterAt();
      if (bits.length === 0 || e - bits[bits.length - 1].at > 55) {
        const edge = Math.floor(Math.random() * 4);
        bits.push({
          sx: edge === 0 ? -20 : edge === 1 ? ctx.w + 20 : Math.random() * ctx.w,
          sy: edge === 2 ? -20 : edge === 3 ? ctx.h + 20 : Math.random() * ctx.h,
          at: e, land: e + 520 + Math.random() * 260, seed: Math.floor(Math.random() * 50),
        });
      }
      drawGatherPile(pile, ctx.tint, c.x, c.y, Phaser.Math.Clamp(e / 3000, 0, 1), e / 1000);
      for (const b of bits) {
        if (e > b.land) continue;
        const k = Phaser.Math.Clamp((e - b.at) / (b.land - b.at), 0, 1) ** 2;
        drawScrap(pile, ctx.tint, Phaser.Math.Linear(b.sx, c.x, k), Phaser.Math.Linear(b.sy, c.y, k), k * 9, 7, b.seed, 'fly', e / 1000);
      }
    });

    let mech: MagnetMech | null = null;
    ctx.at(3000, () => {
      gathering = false;
      ctx.moveCaster(ctx.cx, ctx.cy, { alpha: 0 });
      mech = ctx.capture(() => new MagnetMech({
        scene: ctx.scene, width: ctx.w, height: ctx.h, tint: ctx.tint, fx,
        targets: () => [], hit: () => {}, stun: () => {}, push: () => {}, carry: () => {},
        announce: (x, y, text, color) => float(ctx, x, y, text, hex(color), 16),
        shake: () => {},
      }, false, ctx.scene.time.now));
    });
    ctx.onFrame((dt) => {
      if (mech) mech.update(ctx.scene.time.now, dt, target.x + Math.sin(ctx.scene.time.now / 300) * 80, target.y);
    });
    const key = (at: number, a: 'smash' | 'rail' | 'cannon' | 'avalanche' | 'destruct', label?: string): void => {
      ctx.at(at, () => {
        if (!mech) return;
        mech.use(a, ctx.scene.time.now, target.x, target.y);
        if (label) float(ctx, target.x, target.y - 34, label, hex(MAGNET.visor), 16);
      });
    };
    key(3700, 'smash', '20');
    key(4700, 'rail');
    key(5600, 'cannon');
    key(8300, 'avalanche');
    key(10600, 'destruct');
    ctx.at(11300, () => ctx.moveCaster(ctx.cx, ctx.cy, { alpha: 1 }));
  },
};

// ══ Passive — Scrap ════════════════════════════════════════════════════

export const passiveScrap: PreviewScript = {
  duration: 7600,
  scale: 0.8,
  caption: 'Scrap — a launched spike shatters on the wall; walk over the shards and they orbit you, blocking a shot each',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const w = emptyWorld();
    worldLayer(ctx, w, null, {
      onSpikeWall: (s, nx, ny) => shatter(fx, w, s.x, s.y, Math.atan2(ny, nx), 3),
    });
    w.spikes.push({ x: ctx.cx + 70, y: ctx.cy, state: 'planted', born: 0, vx: 0, vy: 0, zipped: true });
    ctx.at(500, () => repulse(ctx, fx, av, w, 0));
    ctx.at(2200, () => {
      const pts = w.shards.filter((s) => s.state !== 'orbit');
      const mid = pts.length > 0
        ? { x: pts.reduce((a, s) => a + s.x, 0) / pts.length, y: pts.reduce((a, s) => a + s.y, 0) / pts.length }
        : { x: ctx.w * 0.75, y: ctx.cy };
      ctx.glideCaster({ to: { x: mid.x - 30, y: mid.y }, ms: 1300, ease: 'linear' });
    });
    // A shot comes in and the ring eats it.
    ctx.at(4600, () => {
      const c = ctx.casterAt();
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
      const shot = { x: c.x - 260, y: c.y };
      let alive = true;
      ctx.onFrame((dt) => {
        g.clear();
        if (!alive) return;
        shot.x += 420 * dt / 1000;
        g.fillStyle(0xff5566, 1); g.fillCircle(shot.x, shot.y, 6);
        const hit = w.shards.find((s) => s.state === 'orbit' && Phaser.Math.Distance.Between(s.x, s.y, shot.x, shot.y) < 16);
        if (hit) {
          alive = false;
          w.shards.splice(w.shards.indexOf(hit), 1);
          fx.sparks(shot.x, shot.y, 6, Math.PI, 10, MAGNET.sky);
          float(ctx, shot.x, shot.y - 20, 'BLOCKED', hex(MAGNET.sky));
        }
      });
    });
  },
};

// ══ Perk — Blade ═══════════════════════════════════════════════════════

export const perkBlade: PreviewScript = {
  duration: 5600,
  scale: 0.8,
  caption: 'Blade — a launched spike is a sword: 60 to everything it runs through, and 5 shards instead of 3',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const target = { x: ctx.cx + 260, y: ctx.cy };
    dummyAt(ctx, target);
    const w = emptyWorld();
    w.spikes.push({ x: ctx.cx + 70, y: ctx.cy, state: 'planted', born: 0, vx: 0, vy: 0, zipped: true });
    worldLayer(ctx, w, target, {
      onSpikeHit: () => float(ctx, target.x, target.y - 40, '60 RUN THROUGH', hex(MAGNET.sky), 12),
      onSpikeWall: (s, nx, ny) => shatter(fx, w, s.x, s.y, Math.atan2(ny, nx), 5),
    });
    ctx.at(600, () => repulse(ctx, fx, av, w, 0));
  },
};
