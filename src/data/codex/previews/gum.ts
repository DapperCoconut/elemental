import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  GUM, GumAvatar, GumFx, bloatShell, drips, gripSplat, gumBubble, gumShell, oozeBlob,
  slimeBeacon, slimePuddle, slimeShard, zipLine,
} from '../../../elements/kits/GumVisuals';

/**
 * Slime's showcases.
 *
 * There is one object in this element and every loop has to have it in frame: **the hand**. It
 * is the legs, the weapon and the inventory at once, so a Slime preview that does not show the
 * arm reaching, gripping, hauling or holding something is documenting a generic green projectile
 * element. Half of these scripts therefore drive the caster themselves — the body is *supposed*
 * to be moved by the arm, and a caster pinned to the caster mark would be the one thing this
 * element never does.
 *
 * Slime puts no sprite in the world: balls, bubbles, shards, puddles, beacons, gum shells and
 * the zip-lines are all Graphics repainted per frame out of `GumVisuals`, so `ctx.fly` is
 * useless here. The one exception is a caught enemy shot, which really is somebody else's
 * projectile — the loops stage `proj-fire` for it, because a shot you stole has to look like a
 * shot somebody fired.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `GumFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const HAND_MAX = 250;
const HAND_MIN = 20;
const DRAG_MAX_SPEED = 560;

const PUNCH_DAMAGE = 20;
const SMACK_DAMAGE = 15;
const SMACK_SPEED = 620;

const BALL_R = 13;
const BALL_DAMAGE = 30;
const BALL_HARD_DAMAGE = 45;
const SURGE_COUNT = 3;

const BUBBLE_COUNT = 9;
const BUBBLE_DAMAGE = 5;
const BUBBLE_SPEED = 540;
const BUBBLE_SPREAD = 0.46;
const BUBBLE_R = 15;
const WALL_SLAM_DAMAGE = 30;

const OOZE_SWELL = 1.2;
const HEAL_MIN_RATE = 3;
const HEAL_MAX_RATE = 12;
const EMESIS_COUNT = 3;

const SOLIDIFY_SHARDS = 16;
const SHARD_DAMAGE = 8;
const SHARD_SPEED = 420;
const SHARD_LIFE_MS = 900;
const HAND_REGROW_MS = 3000;

const ZIP_COUNT = 3;
const ZIP_SPEED = 640;
const ZIP_SPARK_COUNT = 7;
const ZIP_SPARK_DAMAGE = 4;

const BOMB_AOE_R = 78;
const PUDDLE_R = 46;
const PUDDLE_SLOW_FLOOR = 0.4;
const SOAK_RAMP_MS = 2500;

const BLOAT_DAMAGE = 12;
const BLOAT_BASE_R = 30;
const BLOAT_R_PER_LAYER = 7;

const SHARD_HAND_MS = 8000;
const SHARD_PUNCH_BONUS = 12;
const SHARD_SMACK_BONUS = 9;

const BEACON_R = 15;
const BEACON_AURA_R = 122;
const BEACON_MAX_ACTIVE_MS = 6000;
const BEACON_HEAL_RATE = 8;

const TAU = Math.PI * 2;

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── Shared staging ────────────────────────────────────────────────────

/**
 * A slime the script drives: body position, arm reach and everything the hand is doing.
 *
 * Every loop uses this rather than `ctx.useAvatar` on its own, because the hand's position is
 * both the art and the hitbox, and the scripts need to read it back the same way the kit does.
 */
interface Slime {
  fx: GumFx;
  av: BaseAvatar;
  gav: GumAvatar | null;
  /** Where the body is. Written by the script; the rig follows it. */
  at: Mark;
  /** Where the hand ended up this frame, read back off the rig exactly as `updateHand` does. */
  hand: Mark;
  /** Hand velocity, px/s — the number the smack and the throw both read. */
  handV: Mark;
  /** Where the hand is being sent. Clamped to the arm's 250px reach. */
  reach: Mark;
}

function slime(ctx: PreviewCtx, at: Mark): Slime {
  const fx = ctx.capture(() => new GumFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-gum')) {
    const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-gum').setDepth(5));
    ctx.onFrame(() => body.setPosition(at.x, at.y));
  }
  const av = ctx.useAvatar(() => new GumAvatar(ctx.scene, ctx.tint));
  const s: Slime = {
    fx, av, gav: av instanceof GumAvatar ? av : null,
    at, hand: { x: at.x + 40, y: at.y }, handV: { x: 0, y: 0 }, reach: { x: at.x + 40, y: at.y },
  };
  let seeded = false;
  ctx.onFrame((dt) => {
    const dx = s.reach.x - s.at.x;
    const dy = s.reach.y - s.at.y;
    const dist = Phaser.Math.Clamp(Math.hypot(dx, dy) || 1, HAND_MIN, HAND_MAX);
    const ang = Math.atan2(dy, dx);
    s.gav?.setReach(dist, ang, dist / HAND_MAX);
    s.av.setFacing(ang);
    s.av.update(dt, s.at.x, s.at.y, 1);
    // The rendered hand is the authoritative one — the same rule the kit works to.
    const pos = s.gav?.handPos() ?? { x: s.at.x + Math.cos(ang) * dist, y: s.at.y + Math.sin(ang) * dist };
    const step = Math.max(0.001, dt / 1000);
    if (seeded) {
      s.handV.x = (pos.x - s.hand.x) / step;
      s.handV.y = (pos.y - s.hand.y) / step;
    }
    s.hand.x = pos.x;
    s.hand.y = pos.y;
    seeded = true;
  });
  return s;
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#08160a', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(20));
  const y0 = y;
  let age = 0;
  ctx.onFrame((dt) => {
    age += dt;
    t.setY(y0 - (age / 760) * 20);
    t.setAlpha(Phaser.Math.Clamp(1 - age / 760, 0, 1));
  });
}

function label(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), align: 'center',
  }).setOrigin(0.5).setDepth(19));
}

function dummy(ctx: PreviewCtx, at: Mark, o?: { alpha?: () => number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  ctx.onFrame(() => {
    const a = o?.alpha?.() ?? 1;
    g.clear();
    if (a <= 0.02) return;
    g.fillStyle(0x2b2f3d, a);
    g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, a);
    g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, a * 0.9);
    g.fillCircle(at.x - 5, at.y - 4, 3.2);
    g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, a);
    g.fillCircle(at.x - 5.6, at.y - 4, 1.6);
    g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
  });
}

/** The gum shell an encased body wears, plus the bloat balloon under it. */
function encasedShell(
  ctx: PreviewCtx, at: Mark, read: () => { on: boolean; hard: boolean; layers: number },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    const st = read();
    g.clear();
    if (!st.on) return;
    if (st.layers >= 2) {
      bloatShell(g, ctx.tint, at.x, at.y,
        Math.min(96, BLOAT_BASE_R + st.layers * BLOAT_R_PER_LAYER), st.layers, 0.95, t,
        { hard: st.hard });
    }
    gumShell(g, ctx.tint, at.x, at.y, 24, 0.95, t, { hard: st.hard });
  });
}

// ── Slimeballs and shards, the two things every loop reuses ───────────

interface BallState {
  x: number; y: number; vx: number; vy: number;
  flying: boolean; hard: boolean; bomb: boolean; stolen: boolean;
  damage: number; seed: number; landsAt: number; gone: boolean;
}

/** Resting and thrown slimeballs, painted the way `paintGround`/`paintAir` paint them. */
function ballField(
  ctx: PreviewCtx, s: Slime, foe: Mark,
  o?: { onHit?: (b: BallState) => void; onBomb?: (b: BallState) => void },
): { list: BallState[]; add(x: number, y: number, opts?: Partial<BallState>): BallState } {
  const list: BallState[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  let now = 0;
  ctx.onFrame((dt) => {
    now += dt;
    const step = dt / 1000;
    g.clear();
    for (const b of list) {
      if (b.gone) continue;
      if (b.flying) {
        b.x += b.vx * step;
        b.y += b.vy * step;
        if (Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) <= BALL_R + 16) {
          b.gone = true;
          if (b.bomb) o?.onBomb?.(b); else o?.onHit?.(b);
          continue;
        }
        if (b.x <= 6 || b.x >= ctx.w - 6 || b.y <= 6 || b.y >= ctx.h - 6) {
          b.x = Phaser.Math.Clamp(b.x, 7, ctx.w - 7);
          b.y = Phaser.Math.Clamp(b.y, 7, ctx.h - 7);
          if (b.bomb) { b.gone = true; o?.onBomb?.(b); continue; }
          // Hardened slime does not stick — the wall is what breaks it.
          if (b.hard) { b.gone = true; s.fx.harden(b.x, b.y, 22); s.fx.shardBurst(b.x, b.y, 8); continue; }
          b.flying = false;
          b.vx = 0;
          b.vy = 0;
          s.fx.splat(b.x, b.y, 18, 4);
        } else if (now >= b.landsAt) {
          if (b.stolen) { b.gone = true; s.fx.pop(b.x, b.y, 14); continue; }
          b.flying = false;
          b.vx = 0;
          b.vy = 0;
          s.fx.splat(b.x, b.y, 16, 4);
        }
      }
      // Resting balls sit in their own little puddles, dripping.
      if (!b.flying) {
        g.fillStyle(ctx.tint(GUM.murk), 0.35);
        g.fillEllipse(b.x, b.y + BALL_R * 0.7, BALL_R * 2.2, BALL_R * 0.9);
      }
      oozeBlob(g, ctx.tint, b.x, b.y, BALL_R, 0.95, now / 1000, {
        seed: b.seed, squat: b.flying ? 0.2 : 0.5, wobble: 0.14,
        deep: b.hard ? GUM.solidDeep : GUM.oozeDeep,
        fill: b.hard ? GUM.solid : GUM.ooze,
        lit: b.hard ? GUM.solidLit : GUM.oozeLit,
      });
      if (b.hard) {
        for (let i = 0; i < 3; i++) {
          slimeShard(g, ctx.tint, b.x, b.y, (i / 3) * TAU + (now / 1000) * 0.4, BALL_R * 1.1, 0.85, { seed: i });
        }
      }
      if (b.stolen) {
        g.lineStyle(1.6, ctx.tint(GUM.shine), 0.8);
        g.strokeCircle(b.x, b.y, BALL_R * 0.55);
      }
      if (b.bomb) {
        // The fuse, so a bomb reads as a bomb before it goes off.
        g.lineStyle(1.4, ctx.tint(GUM.solidLit), 0.9);
        g.lineBetween(b.x, b.y - BALL_R, b.x + 3, b.y - BALL_R - 6);
        g.fillStyle(ctx.tint(GUM.shine), 0.6 + 0.4 * Math.sin(now / 90));
        g.fillCircle(b.x + 3.4, b.y - BALL_R - 7, 2.1);
      }
      drips(g, ctx.tint, b.x, b.y + BALL_R * 0.6, BALL_R, 2, 0.55, now / 1000, { seed: b.seed });
    }
  });
  return {
    list,
    add(x, y, opts) {
      const b: BallState = {
        x, y, vx: 0, vy: 0, flying: false, hard: false, bomb: false, stolen: false,
        damage: BALL_DAMAGE, seed: Math.random() * 999, landsAt: 0, gone: false, ...opts,
      };
      list.push(b);
      return b;
    },
  };
}

/** Shards from a shattered hand, a broken ball or a zip-line spark. */
function shardField(ctx: PreviewCtx, foe: Mark, onHit: (damage: number) => void): {
  burst(x: number, y: number, count: number, damage: number, spark: boolean): void;
} {
  interface Sh { x: number; y: number; vx: number; vy: number; life: number; seed: number; damage: number; spark: boolean; done: boolean }
  const list: Sh[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  ctx.onFrame((dt) => {
    const step = dt / 1000;
    g.clear();
    for (let i = list.length - 1; i >= 0; i--) {
      const sh = list[i];
      sh.x += sh.vx * step;
      sh.y += sh.vy * step;
      sh.life -= dt;
      if (!sh.done && Phaser.Math.Distance.Between(sh.x, sh.y, foe.x, foe.y) <= 20) {
        sh.done = true;
        onHit(sh.damage);
        list.splice(i, 1);
        continue;
      }
      if (sh.life <= 0 || sh.x < -20 || sh.x > ctx.w + 20 || sh.y < -20 || sh.y > ctx.h + 20) {
        list.splice(i, 1);
        continue;
      }
      slimeShard(g, ctx.tint, sh.x, sh.y, Math.atan2(sh.vy, sh.vx), sh.spark ? 9 : 15,
        Phaser.Math.Clamp(sh.life / 400, 0, 1),
        sh.spark
          ? { seed: sh.seed, deep: GUM.stoneDeep, fill: GUM.stone, lit: GUM.stoneLit }
          : { seed: sh.seed });
    }
  });
  return {
    burst(x, y, count, damage, spark) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + Math.random() * 0.3;
        const sp = (spark ? 300 : SHARD_SPEED) * (0.7 + Math.random() * 0.5);
        list.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: spark ? 260 : SHARD_LIFE_MS, seed: Math.random() * 999, damage, spark, done: false,
        });
      }
    },
  };
}

// ── Click — Grab ──────────────────────────────────────────────────────

export const grab: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Click — grip the floor and the cursor becomes a handle: drag it back, and the arm hauls you forward',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.24, y: ctx.h * 0.66 };
    const s = slime(ctx, home);
    const foe: Mark = { x: ctx.w * 0.8, y: ctx.h * 0.4 };
    dummy(ctx, foe);

    // The anchor, and the splat it leaves. Everything after this is the drag.
    const anchor: Mark = { x: ctx.w * 0.58, y: ctx.h * 0.78 };
    let gripping = false;
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((_dt, elapsed) => {
      ground.clear();
      if (!gripping) return;
      gripSplat(ground, ctx.tint, anchor.x, anchor.y, 11, 0.95, elapsed / 1000,
        { pull: 1, toward: Math.atan2(home.y - anchor.y, home.x - anchor.x), wall: false });
    });

    ctx.at(700, () => {
      gripping = true;
      s.reach.x = anchor.x;
      s.reach.y = anchor.y;
      s.gav?.setGrip(true);
      s.fx.splat(anchor.x, anchor.y, 16, 4);
      tick(ctx, anchor.x, anchor.y - 24, '🖐 GRIP', GUM.oozeLit);
    });

    // The haul. The body moves toward the anchor at up to the kit's own 560 px/s ceiling, which
    // is what a player dragging the mouse steadily actually produces.
    ctx.onFrame((dt, elapsed) => {
      if (!gripping || elapsed < 900) return;
      s.reach.x = anchor.x;
      s.reach.y = anchor.y;
      const d = Phaser.Math.Distance.Between(home.x, home.y, anchor.x, anchor.y);
      if (d <= 30) return;
      const step = Math.min(d - 30, DRAG_MAX_SPEED * 0.4 * (dt / 1000));
      home.x += ((anchor.x - home.x) / d) * step;
      home.y += ((anchor.y - home.y) / d) * step;
    });

    // A punch, once the haul has put somebody in reach.
    ctx.at(4200, () => {
      gripping = false;
      s.gav?.setGrip(false);
    });
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 4200 || elapsed > 5400) return;
      s.reach.x = foe.x;
      s.reach.y = foe.y;
    });
    ctx.at(5000, () => {
      s.av.play('punch', Math.atan2(foe.y - home.y, foe.x - home.x));
      s.fx.splat(foe.x, foe.y, 22);
      tick(ctx, foe.x, foe.y - 16, `${PUNCH_DAMAGE}`, GUM.oozeLit);
    });

    // …and then the free half: the hand whipped past on the way back.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 5600) return;
      const sweep = (elapsed - 5600) / 1000;
      s.reach.x = foe.x + Math.cos(sweep * 4) * 90;
      s.reach.y = foe.y + Math.sin(sweep * 4) * 60;
      void dt;
    });
    let gate = 0;
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 5600 || elapsed < gate) return;
      if (Math.hypot(s.handV.x, s.handV.y) < SMACK_SPEED) return;
      if (Phaser.Math.Distance.Between(s.hand.x, s.hand.y, foe.x, foe.y) > 32) return;
      gate = elapsed + 520;
      s.fx.splat(foe.x, foe.y, 18);
      tick(ctx, foe.x, foe.y - 16, `${SMACK_DAMAGE}`, GUM.oozeLit);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 10,
      'grip → haul → 20-damage punch → free 15s from a hand moving over 620 px/s', GUM.oozeDeep);
  },
};

export const grabUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Zip-Line — three strands only your hand can touch, and a 640 px/s ride you cannot steer',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.12, y: ctx.h * 0.5 };
    const s = slime(ctx, home);
    const foe: Mark = { x: ctx.w * 0.7, y: ctx.h * 0.72 };
    dummy(ctx, foe);

    const lines: number[] = [];
    for (let i = 0; i < ZIP_COUNT; i++) lines.push((ctx.h * (i + 1)) / (ZIP_COUNT + 1));
    let riding = -1;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      for (let i = 0; i < lines.length; i++) {
        const lit = riding === i;
        zipLine(g, ctx.tint, 8, ctx.w - 8, lines[i], lit ? 1 : 0.72, elapsed / 1000,
          { seed: 4 + i * 3, lit });
      }
    });

    const sparks = shardField(ctx, foe, (dmg) => tick(ctx, foe.x, foe.y - 14, `${dmg}`, GUM.stoneLit));
    ctx.at(600, () => {
      riding = 1;
      s.gav?.setGrip(true);
      s.gav?.setShardHand(true);
      s.fx.splat(s.hand.x, lines[1], 14, 8);
      tick(ctx, home.x, home.y - 44, '🪢 ZIP-LINE', GUM.oozeLit);
    });

    let nextSpark = 0;
    ctx.onFrame((dt, elapsed) => {
      if (riding < 0) return;
      // 640 px/s flat across, and the hand rides 46px ahead of the body.
      home.y = Phaser.Math.Linear(home.y, lines[riding], Math.min(1, dt / 90));
      home.x += ZIP_SPEED * (dt / 1000);
      s.reach.x = home.x + 46;
      s.reach.y = lines[riding];
      if (elapsed >= nextSpark) {
        nextSpark = elapsed + 110;
        sparks.burst(s.hand.x, s.hand.y, ZIP_SPARK_COUNT, ZIP_SPARK_DAMAGE, true);
        s.fx.sparks(s.hand.x, s.hand.y, 22);
      }
      if (home.x >= ctx.w - 20) {
        riding = -1;
        s.gav?.setGrip(false);
        s.fx.splat(home.x, home.y, 26, 8);
        tick(ctx, home.x, home.y - 40, '🧱 END OF THE LINE', GUM.oozeLit);
      }
    });

    label(ctx, ctx.w * 0.5, ctx.h - 10,
      'catch within 22px of a line · with the hand of stone it throws 7 sparks at 4 every 110ms', GUM.oozeDeep);
  },
};

// ── E — Slime Surge ───────────────────────────────────────────────────

function surgeLoop(ctx: PreviewCtx, opts: { bomb: boolean }): void {
  const home: Mark = { x: ctx.w * 0.22, y: ctx.h * 0.66 };
  const s = slime(ctx, home);
  const foe: Mark = { x: ctx.w * 0.82, y: ctx.h * 0.5 };
  dummy(ctx, foe);

  // Slime Splash's puddles: the ramp is the ability, so the loop runs the real soak integrator.
  interface Pud { x: number; y: number; until: number; seed: number }
  const puddles: Pud[] = [];
  let soak = 0;
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    ground.clear();
    let inIt = false;
    for (const pd of puddles) {
      if (Phaser.Math.Distance.Between(pd.x, pd.y, foe.x, foe.y) <= PUDDLE_R) inIt = true;
      slimePuddle(ground, ctx.tint, pd.x, pd.y, PUDDLE_R, 1, t,
        { seed: pd.seed, heal: false, soak, life: 1 });
    }
    soak = Phaser.Math.Clamp(soak + (inIt ? dt / SOAK_RAMP_MS : -dt / 1500), 0, 1);
  });

  const balls = ballField(ctx, s, foe, {
    onHit: (b) => {
      s.fx.splat(foe.x, foe.y, b.hard ? 26 : 30);
      tick(ctx, foe.x, foe.y - 16, `${b.damage}`, b.hard ? GUM.solidLit : GUM.oozeLit);
      if (!b.stolen) tick(ctx, foe.x, foe.y - 34, '🐌 SLIMED · −50%', GUM.oozeLit);
    },
    onBomb: (b) => {
      s.fx.splat(b.x, b.y, 42, 6);
      tick(ctx, b.x, b.y - 26, '💥 SPLASH', GUM.oozeLit);
      if (Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) <= BOMB_AOE_R) {
        tick(ctx, foe.x, foe.y - 16, `${b.damage}`, GUM.oozeLit);
      }
      puddles.push({ x: b.x, y: b.y, until: 12000, seed: Math.random() * 999 });
    },
  });

  ctx.at(400, () => {
    s.av.play('sweep', 0);
    const base = Math.atan2(foe.y - home.y, foe.x - home.x);
    for (let i = 0; i < SURGE_COUNT; i++) {
      const a = base + (i - 1) * 0.42;
      const d = 58 + Math.random() * 42;
      const x = Phaser.Math.Clamp(home.x + Math.cos(a) * d, 12, ctx.w - 12);
      const y = Phaser.Math.Clamp(home.y + Math.sin(a) * d, 12, ctx.h - 12);
      balls.add(x, y, { bomb: opts.bomb });
      s.fx.splat(x, y, 18, 4);
    }
    tick(ctx, home.x, home.y - 44, opts.bomb ? '💣 SLIME SPLASH' : '🟢 SLIME SURGE', GUM.oozeLit);
  });

  // Reach out, pick one up, wind up and flick it. The throw is the hand's own velocity ×1.15.
  let held: BallState | null = null;
  const pickAt = 1600;
  ctx.at(pickAt, () => {
    held = balls.list.find((b) => !b.flying && !b.gone) ?? null;
    if (!held) return;
    s.reach.x = held.x;
    s.reach.y = held.y;
    s.gav?.setCarry(true);
    tick(ctx, held.x, held.y - 22, '🫳 PICKED UP', GUM.oozeLit);
  });
  ctx.onFrame((_dt, elapsed) => {
    if (!held || elapsed < pickAt) return;
    if (elapsed < pickAt + 900) {
      // Winding up: the hand is swung back, and the ball rides it.
      const k = (elapsed - pickAt) / 900;
      s.reach.x = home.x - 60 * k;
      s.reach.y = home.y - 30 * k;
    }
    if (held.flying) return;
    held.x = s.hand.x;
    held.y = s.hand.y;
  });
  ctx.at(pickAt + 900, () => {
    if (!held) return;
    s.reach.x = foe.x;
    s.reach.y = foe.y;
  });
  ctx.at(pickAt + 1120, () => {
    if (!held) return;
    s.gav?.setCarry(false);
    const a = Math.atan2(foe.y - s.hand.y, foe.x - s.hand.x);
    held.vx = Math.cos(a) * 820;
    held.vy = Math.sin(a) * 820;
    held.flying = true;
    held.landsAt = 99999;
    s.fx.splat(held.x, held.y, 12, 6);
    tick(ctx, home.x, home.y - 58, '🤾 THROWN · 820 px/s', GUM.shine);
    held = null;
  });

  label(ctx, ctx.w * 0.5, ctx.h - 10,
    opts.bomb ? `a ${BOMB_AOE_R}px burst and a ${PUDDLE_R}px puddle — 2.5s of standing in it is ${Math.round(PUDDLE_SLOW_FLOOR * 100)}% speed`
      : 'the balls just sit there — only your hand can pick one up, and a miss lands and waits',
    GUM.oozeDeep);
}

export const surge: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'E — three balls of ammunition on the floor. 30 damage and a 50% slow once one is thrown',
  run(ctx) { surgeLoop(ctx, { bomb: false }); },
};

export const surgeUpgraded: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Slime Splash — a 78px burst wherever it stops, and a puddle that gets worse the longer you stand in it',
  run(ctx) { surgeLoop(ctx, { bomb: true }); },
};

// ── R — Gumball ───────────────────────────────────────────────────────

function gumballLoop(ctx: PreviewCtx, opts: { bloat: boolean }): void {
  const home: Mark = { x: ctx.w * 0.18, y: ctx.h * 0.6 };
  const s = slime(ctx, home);
  const foe: Mark = { x: ctx.w * 0.52, y: ctx.h * 0.6 };
  dummy(ctx, foe);

  const enc = { on: false, hard: false, layers: 0 };
  encasedShell(ctx, foe, () => enc);

  // The fan of nine, stepped and popped the way `updateBubbles` does it.
  interface Bub { x: number; y: number; vx: number; vy: number; life: number; seed: number; gone: boolean }
  const bubbles: Bub[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  ctx.onFrame((dt, elapsed) => {
    const step = dt / 1000;
    g.clear();
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.x += b.vx * step;
      b.y += b.vy * step;
      b.life -= dt;
      if (Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) <= BUBBLE_R + 16) {
        bubbles.splice(i, 1);
        s.fx.pop(b.x, b.y, 20);
        tick(ctx, foe.x + (Math.random() - 0.5) * 20, foe.y - 12, `${BUBBLE_DAMAGE}`, GUM.gum);
        if (!enc.on) {
          enc.on = true;
          tick(ctx, foe.x, foe.y - 36, '🩷 ENCASED · −55%', GUM.gumLit);
        }
        if (opts.bloat) {
          enc.layers++;
          if (enc.layers === 2) tick(ctx, foe.x, foe.y - 54, '🎈 BLOATED', GUM.gumLit);
        }
        continue;
      }
      if (b.life <= 0 || b.x <= 4 || b.x >= ctx.w - 4 || b.y <= 4 || b.y >= ctx.h - 4) {
        bubbles.splice(i, 1);
        s.fx.pop(b.x, b.y, 12);
        continue;
      }
      gumBubble(g, ctx.tint, b.x, b.y, BUBBLE_R, 0.95, elapsed / 1000, { seed: b.seed });
    }
  });

  ctx.at(400, () => {
    s.av.play('sweep', 0);
    const base = Math.atan2(foe.y - home.y, foe.x - home.x);
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const a = base + (i / (BUBBLE_COUNT - 1) - 0.5) * BUBBLE_SPREAD * 2 + (Math.random() - 0.5) * 0.08;
      const sp = BUBBLE_SPEED * (0.85 + Math.random() * 0.3);
      bubbles.push({
        x: home.x + Math.cos(a) * 22, y: home.y + Math.sin(a) * 22,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 900, seed: Math.random() * 999, gone: false,
      });
    }
    tick(ctx, home.x, home.y - 44, '🩷 GUMBALL', GUM.gum);
  });

  // Pick them up — a gummed body is the hand's first grab priority — and throw them at the wall.
  let carrying = false;
  ctx.at(1900, () => {
    if (!enc.on) return;
    carrying = true;
    s.gav?.setCarry(true);
    tick(ctx, foe.x, foe.y - 40, '🫳 GRABBED', GUM.gumLit);
  });
  ctx.onFrame((_dt, elapsed) => {
    if (!carrying) return;
    // Wound back, then flicked at the far wall. A carried body goes exactly where the hand goes.
    const k = Phaser.Math.Clamp((elapsed - 1900) / 900, 0, 1);
    s.reach.x = home.x + Math.cos(Math.PI * (1 - k * 0.9)) * 90;
    s.reach.y = home.y + Math.sin(Math.PI * (1 - k * 0.9)) * 50;
    foe.x = s.hand.x;
    foe.y = s.hand.y;
  });

  let flung: Mark | null = null;
  ctx.at(2900, () => {
    if (!carrying) return;
    carrying = false;
    s.gav?.setCarry(false);
    flung = { x: 900, y: -60 };
    tick(ctx, foe.x, foe.y - 40, '🤾 THROWN', GUM.gumLit);
  });
  ctx.onFrame((dt) => {
    if (!flung) return;
    foe.x += flung.x * (dt / 1000);
    foe.y += flung.y * (dt / 1000);
    if (foe.x < ctx.w - 14) return;
    foe.x = ctx.w - 14;
    flung = null;
    s.fx.splat(foe.x, foe.y, 30, 6, true);
    tick(ctx, foe.x - 20, foe.y - 16, `${WALL_SLAM_DAMAGE}`, GUM.gumLit);
    tick(ctx, foe.x - 20, foe.y - 40, '🧱 STUCK · 5s AT ZERO SPEED', GUM.gumLit);
    if (!opts.bloat || enc.layers < 2) return;
    // Any wall does it — including one they walked into themselves.
    const dmg = BLOAT_DAMAGE * enc.layers;
    s.fx.bloatBurst(foe.x, foe.y, Math.min(96, BLOAT_BASE_R + enc.layers * BLOAT_R_PER_LAYER), false);
    tick(ctx, foe.x - 20, foe.y - 58, `🎈 BLOAT ×${enc.layers} · ${dmg}`, GUM.gumLit);
    enc.layers = 0;
  });

  label(ctx, ctx.w * 0.5, ctx.h - 10,
    opts.bloat ? `${BLOAT_DAMAGE} a layer on any wall — 18 a layer if you had solidified them first`
      : '9 bubbles at 5 · encased for 5s · picked up like a slimeball · 30 and a 5s root on the wall',
    GUM.gumDeep);
}

export const gumball: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  bodyTexture: '',
  caption: 'R — the barrage is only 45. Everything after it is a way of getting them to a wall',
  run(ctx) { gumballLoop(ctx, { bloat: false }); },
};

export const gumballUpgraded: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Bubble Bloat — a layer per bubble that connected, and it all comes off against the wall',
  run(ctx) { gumballLoop(ctx, { bloat: true }); },
};

// ── F — Oozorbtion ────────────────────────────────────────────────────

function oozorbtionLoop(ctx: PreviewCtx, opts: { emesis: boolean }): void {
  const home: Mark = { x: ctx.w * 0.3, y: ctx.h * 0.62 };
  const s = slime(ctx, home);
  const foe: Mark = { x: ctx.w * 0.86, y: ctx.h * 0.44 };
  dummy(ctx, foe);

  // The swell: the body really does get a fifth bigger, and it is a real cost.
  let swollen = false;
  const swell = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame((_dt, elapsed) => {
    swell.clear();
    if (!swollen) return;
    const t = elapsed / 1000;
    oozeBlob(swell, ctx.tint, home.x, home.y, 24 * OOZE_SWELL, 0.4, t,
      { seed: 3, wobble: 0.2, rim: true });
  });

  // Pink puddles, and the healing ramp they run on.
  interface Pud { x: number; y: number; seed: number }
  const puddles: Pud[] = [];
  let heal = 0;
  let acc = 0;
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    ground.clear();
    let inIt = false;
    for (const pd of puddles) {
      if (Phaser.Math.Distance.Between(pd.x, pd.y, home.x, home.y) <= PUDDLE_R) inIt = true;
      slimePuddle(ground, ctx.tint, pd.x, pd.y, PUDDLE_R, 1, t,
        { seed: pd.seed, heal: true, soak: heal, life: 1 });
    }
    heal = Phaser.Math.Clamp(heal + (inIt ? dt / 3000 : -dt / 1500), 0, 1);
    if (!inIt) { acc = 0; return; }
    const rate = HEAL_MIN_RATE + (HEAL_MAX_RATE - HEAL_MIN_RATE) * heal;
    acc += rate * (dt / 1000);
    while (acc >= 1) { acc -= 1; }
    if (Math.random() < 0.04) {
      s.fx.digest(home.x, home.y);
      tick(ctx, home.x, home.y - 24, `+${Math.round(rate)}/s`, GUM.gumLit);
    }
  });

  ctx.at(400, () => {
    swollen = true;
    s.av.play('flex');
    s.fx.swallow(home.x, home.y);
    tick(ctx, home.x, home.y - 46, '🫧 OOZORBTION', GUM.oozeLit);
    tick(ctx, home.x, home.y - 64, '×1.2 SIZE · 8s ARMED', GUM.oozeDeep);
  });

  // A real enemy shot, on a real projectile texture — swallowed before it lands.
  const INCOMING = 42;
  ctx.at(1300, () => {
    ctx.fly({
      texture: 'proj-fire',
      from: { x: foe.x, y: foe.y },
      to: { x: home.x, y: home.y },
      speed: 520,
      onHit: () => {
        swollen = false;
        s.fx.swallow(home.x, home.y);
        tick(ctx, home.x, home.y - 40, `🫗 ABSORBED ${INCOMING}`, GUM.oozeLit);
        if (!opts.emesis) return;
        for (let i = 0; i < EMESIS_COUNT; i++) {
          const a = (i / EMESIS_COUNT) * TAU + Math.random() * 0.5;
          const d = 46 + Math.random() * 26;
          puddles.push({ x: home.x + Math.cos(a) * d, y: home.y + Math.sin(a) * d, seed: Math.random() * 999 });
        }
        s.fx.splat(home.x, home.y, 30, 4, true);
        tick(ctx, home.x, home.y - 60, '🤮 EMESIS', GUM.gumLit);
      },
    });
  });

  // Three seconds later it comes back out as exactly that much health.
  ctx.at(1300 + 620 + 3000, () => {
    s.fx.digest(home.x, home.y);
    tick(ctx, home.x, home.y - 48, `🍽 DIGESTED +${INCOMING}`, GUM.shine);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 10,
    opts.emesis ? `three pink puddles: ${HEAL_MIN_RATE} HP/s rising to ${HEAL_MAX_RATE} over 3s of standing`
      : 'the hit is nullified whatever its size, and 3s later it is that much health', GUM.oozeDeep);
}

export const oozorbtion: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'F — swell up and swallow the next attack whole, then digest it into exactly that much health',
  run(ctx) { oozorbtionLoop(ctx, { emesis: false }); },
};

export const oozorbtionUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Emesis — everything you swallow brings three pink puddles back up with it',
  run(ctx) { oozorbtionLoop(ctx, { emesis: true }); },
};

// ── Q — Solidify ──────────────────────────────────────────────────────

export const solidify: PreviewScript = {
  duration: 8600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Q — the hand bursts into 16 shards, and for 3 seconds you have no arm and therefore no legs',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.42, y: ctx.h * 0.6 };
    const s = slime(ctx, home);
    const foe: Mark = { x: ctx.w * 0.7, y: ctx.h * 0.46 };
    dummy(ctx, foe);
    const shards = shardField(ctx, foe, (dmg) => tick(ctx, foe.x, foe.y - 14, `${dmg}`, GUM.solidLit));
    const balls = ballField(ctx, s, foe);

    // Two slimeballs and a puddle already on the floor — the ultimate is worth what you had
    // already set up, and nothing more.
    balls.add(ctx.w * 0.24, ctx.h * 0.78);
    balls.add(ctx.w * 0.58, ctx.h * 0.8);
    const beacons: Array<{ x: number; y: number; seed: number; on: boolean; charge: number; active: number }> = [];
    const puddles = [{ x: ctx.w * 0.3, y: ctx.h * 0.34, seed: 41, set: false }];
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      ground.clear();
      air.clear();
      for (const pd of puddles) {
        if (pd.set) continue;
        slimePuddle(ground, ctx.tint, pd.x, pd.y, PUDDLE_R, 1, t, { seed: pd.seed, life: 1 });
      }
      for (const b of beacons) {
        slimeBeacon(air, ctx.tint, b.x, b.y, BEACON_R, 1, t,
          { seed: 5, heal: false, charge: b.charge, active: b.active, auraR: BEACON_AURA_R });
      }
    });

    let handless = false;
    ctx.at(900, () => {
      s.av.play('raise');
      handless = true;
      s.gav?.setHandless(true);
      s.fx.harden(s.hand.x, s.hand.y, 36);
      shards.burst(s.hand.x, s.hand.y, SOLIDIFY_SHARDS, SHARD_DAMAGE, false);
      // Everything of yours on the field sets at once.
      for (const b of balls.list) {
        b.hard = true;
        b.damage = BALL_HARD_DAMAGE;
        s.fx.harden(b.x, b.y, 20);
      }
      for (const pd of puddles) {
        pd.set = true;
        beacons.push({ x: pd.x, y: pd.y, seed: pd.seed, on: false, charge: 0, active: 0 });
        s.fx.harden(pd.x, pd.y, 24);
      }
      ctx.scene.cameras.main.shake(200, 0.004);
      tick(ctx, home.x, home.y - 50, '🧊 SOLIDIFY · 2 HARDENED · 1 BEACON', GUM.solidLit);
      tick(ctx, home.x, home.y - 68, '🫠 NO HAND — CANNOT MOVE', GUM.solidLit);
    });
    ctx.at(900 + HAND_REGROW_MS, () => {
      handless = false;
      s.gav?.setHandless(false);
      s.fx.splat(home.x, home.y, 22);
      tick(ctx, home.x, home.y - 44, '🖐 HAND REGROWN', GUM.oozeLit);
    });
    ctx.onFrame(() => {
      if (!handless) return;
      s.reach.x = home.x + HAND_MIN;
      s.reach.y = home.y;
    });

    // Picking a beacon up, shaking it and setting it down — the whole switch, in one gesture.
    let carried: typeof beacons[number] | null = null;
    ctx.at(900 + HAND_REGROW_MS + 400, () => {
      carried = beacons[0] ?? null;
      if (!carried) return;
      s.gav?.setCarry(true);
      tick(ctx, carried.x, carried.y - 24, '🫳 BEACON', GUM.oozeLit);
    });
    ctx.onFrame((dt, elapsed) => {
      const from = 900 + HAND_REGROW_MS + 400;
      if (!carried || elapsed < from) return;
      // Shaking: the hand has to be moving at 430 px/s or better to bank anything.
      const sw = (elapsed - from) / 1000;
      s.reach.x = home.x + Math.cos(sw * 15) * 60;
      s.reach.y = home.y + Math.sin(sw * 15) * 40;
      carried.x = s.hand.x;
      carried.y = s.hand.y;
      if (Math.hypot(s.handV.x, s.handV.y) >= 430) {
        carried.charge = Math.min(1, carried.charge + dt / BEACON_MAX_ACTIVE_MS);
      }
    });
    ctx.at(900 + HAND_REGROW_MS + 2000, () => {
      if (!carried) return;
      s.gav?.setCarry(false);
      const ms = carried.charge * BEACON_MAX_ACTIVE_MS;
      carried.active = 1;
      s.fx.harden(carried.x, carried.y, 26);
      tick(ctx, carried.x, carried.y - 30, `🐌 BEACON · ${(ms / 1000).toFixed(1)}s`, GUM.oozeLit);
      tick(ctx, carried.x, carried.y - 48, '122px · −50% SPEED', GUM.oozeDeep);
      carried = null;
    });

    label(ctx, ctx.w * 0.5, ctx.h - 10,
      `${SOLIDIFY_SHARDS} shards at ${SHARD_DAMAGE} · balls to ${BALL_HARD_DAMAGE} · puddles to beacons`, GUM.solidDeep);
  },
};

export const solidifyUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Hand of Stone — no shatter and no standstill: 8s of a claw that hardens everything it touches',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.26, y: ctx.h * 0.62 };
    const s = slime(ctx, home);
    const foe: Mark = { x: ctx.w * 0.74, y: ctx.h * 0.5 };
    dummy(ctx, foe);
    const balls = ballField(ctx, s, foe);
    balls.add(ctx.w * 0.5, ctx.h * 0.76);
    balls.add(ctx.w * 0.62, ctx.h * 0.3);

    const enc = { on: true, hard: false, layers: 0 };
    encasedShell(ctx, foe, () => enc);

    ctx.at(500, () => {
      s.av.play('raise');
      s.gav?.setShardHand(true);
      s.fx.harden(s.hand.x, s.hand.y, 30);
      s.fx.sparks(s.hand.x, s.hand.y, 34);
      tick(ctx, home.x, home.y - 50, '🪨 HAND OF STONE · 8s', GUM.stoneLit);
      tick(ctx, home.x, home.y - 68, 'no shatter, no standstill', GUM.stoneLit);
    });

    // It sweeps across the field, and everything it brushes goes glassy on contact.
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 700) return;
      const k = (elapsed - 700) / 1000;
      s.reach.x = home.x + 60 + Math.min(220, k * 130);
      s.reach.y = home.y + Math.sin(k * 2.4) * 60;
      for (const b of balls.list) {
        if (b.hard || b.gone) continue;
        if (Phaser.Math.Distance.Between(s.hand.x, s.hand.y, b.x, b.y) > 32 + BALL_R) continue;
        b.hard = true;
        b.damage = BALL_HARD_DAMAGE;
        s.fx.harden(b.x, b.y, 20);
        tick(ctx, b.x, b.y - 22, `🪨 ${BALL_HARD_DAMAGE}`, GUM.solidLit);
      }
      if (!enc.hard && Phaser.Math.Distance.Between(s.hand.x, s.hand.y, foe.x, foe.y) <= 32 + 24) {
        enc.hard = true;
        s.fx.harden(foe.x, foe.y, 34);
        tick(ctx, foe.x, foe.y - 44, '🪨 SEALED · +5s', GUM.solidLit);
      }
    });

    // The claw hits harder both ways.
    ctx.at(4200, () => {
      s.av.play('punch', Math.atan2(foe.y - home.y, foe.x - home.x));
      s.fx.shardBurst(foe.x, foe.y, 5);
      tick(ctx, foe.x, foe.y - 16, `${PUNCH_DAMAGE + SHARD_PUNCH_BONUS}`, GUM.stoneLit);
    });
    ctx.at(5400, () => {
      s.fx.sparks(foe.x, foe.y, 20);
      tick(ctx, foe.x, foe.y - 16, `${SMACK_DAMAGE + SHARD_SMACK_BONUS}`, GUM.stoneLit);
      tick(ctx, foe.x, foe.y - 34, 'passing smack', GUM.stoneLit);
    });
    ctx.at(500 + SHARD_HAND_MS - 1200, () => {
      s.gav?.setShardHand(false);
      s.fx.splat(home.x, home.y, 20);
      tick(ctx, home.x, home.y - 44, '🫠 HAND SOFTENED', GUM.oozeLit);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 10,
      `punch ${PUNCH_DAMAGE} → ${PUNCH_DAMAGE + SHARD_PUNCH_BONUS} · smack ${SMACK_DAMAGE} → ${SMACK_DAMAGE + SHARD_SMACK_BONUS} · everything within 32px goes glassy`,
      GUM.stoneDeep);
  },
};

// ── Passives ──────────────────────────────────────────────────────────

export const theHand: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'The cursor is a handle, not an aim: every pixel you drag it hauls the body one pixel the other way',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.7, y: ctx.h * 0.4 };
    const s = slime(ctx, home);

    const anchor: Mark = { x: ctx.w * 0.24, y: ctx.h * 0.82 };
    let gripping = false;
    let wall = false;
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const cursor = ctx.adopt(ctx.scene.add.graphics().setDepth(19));
    const mouse: Mark = { x: ctx.w * 0.24, y: ctx.h * 0.82 };
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      ground.clear();
      cursor.clear();
      if (gripping) {
        gripSplat(ground, ctx.tint, anchor.x, anchor.y, 11, 0.95, t,
          { pull: 1, toward: Math.atan2(home.y - anchor.y, home.x - anchor.x), wall });
      }
      // The mouse itself, drawn — this loop is about what the cursor is doing, so it has to be
      // on screen.
      cursor.lineStyle(1.4, ctx.tint(GUM.shine), 0.85);
      cursor.strokeCircle(mouse.x, mouse.y, 5);
      cursor.lineBetween(mouse.x - 8, mouse.y, mouse.x + 8, mouse.y);
      cursor.lineBetween(mouse.x, mouse.y - 8, mouse.x, mouse.y + 8);
    });

    ctx.at(500, () => {
      gripping = true;
      wall = anchor.x < 54;
      s.gav?.setGrip(true);
      s.fx.splat(anchor.x, anchor.y, 16, 4);
      tick(ctx, anchor.x, anchor.y - 24, '🖐 GRIP', GUM.oozeLit);
    });

    // Drag the cursor away from the anchor; the body is hauled toward it, one pixel per pixel.
    ctx.onFrame((dt, elapsed) => {
      if (!gripping) return;
      s.reach.x = anchor.x;
      s.reach.y = anchor.y;
      if (elapsed < 800 || elapsed > 5000) return;
      const step = 90 * (dt / 1000);
      const before = { x: mouse.x, y: mouse.y };
      mouse.x += step * 1.4;
      mouse.y -= step * 0.5;
      // 1 pixel of body per pixel of mouse travel, in the opposite direction.
      home.x -= mouse.x - before.x;
      home.y -= mouse.y - before.y;
    });
    ctx.at(2400, () => tick(ctx, mouse.x, mouse.y - 20, 'cursor →', GUM.shine));
    ctx.at(2400, () => tick(ctx, home.x, home.y - 44, '← body', GUM.oozeLit));

    // …and then wound too far, which tears the grip.
    ctx.at(5000, () => {
      gripping = false;
      s.gav?.setGrip(false);
      s.fx.pop(anchor.x, anchor.y, 18);
      tick(ctx, anchor.x, anchor.y - 24, '💢 SLIPPED', GUM.oozeDeep);
      tick(ctx, anchor.x, anchor.y - 42, 'cursor wound past 437px', GUM.oozeDeep);
    });

    // Then a hand full of slimeball, which is a body that cannot move at all.
    const foe: Mark = { x: ctx.w * 0.88, y: ctx.h * 0.3 };
    const balls = ballField(ctx, s, foe);
    ctx.at(5600, () => {
      const b = balls.add(home.x + 50, home.y + 20);
      s.gav?.setCarry(true);
      tick(ctx, home.x, home.y - 44, '🫳 A FULL HAND', GUM.oozeLit);
      tick(ctx, home.x, home.y - 62, 'IS A STILL BODY', GUM.oozeDeep);
      ctx.onFrame(() => { if (!b.flying) { b.x = s.hand.x; b.y = s.hand.y; } });
    });
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 5600) return;
      s.reach.x = home.x + 50 + Math.sin((elapsed - 5600) / 400) * 26;
      s.reach.y = home.y + 10;
    });

    label(ctx, ctx.w * 0.5, ctx.h - 10,
      `250px arm · ×1 on the floor, ×1.35 on a wall · capped at ${DRAG_MAX_SPEED} px/s`, GUM.oozeDeep);
  },
};

export const theSmack: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  bodyTexture: '',
  caption: 'A hand travelling over 620 px/s hurts whatever it passes through — no press, no cooldown',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.28, y: ctx.h * 0.62 };
    const s = slime(ctx, home);
    const foe: Mark = { x: ctx.w * 0.66, y: ctx.h * 0.5 };
    dummy(ctx, foe);

    // A speed readout, because the whole passive is a threshold on one number.
    const meter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 14, '', {
      fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(GUM.shine),
    }).setOrigin(0.5).setDepth(19));

    let gate = 0;
    ctx.onFrame((_dt, elapsed) => {
      // Slow figure-of-eight first, then a fast one: the same path, either side of the line.
      const fast = elapsed > 3000;
      const w = fast ? 5.2 : 1.3;
      const t = elapsed / 1000;
      s.reach.x = foe.x + Math.cos(t * w) * 84;
      s.reach.y = foe.y + Math.sin(t * w * 2) * 46;

      const sp = Math.hypot(s.handV.x, s.handV.y);
      meter.setText(`hand ${Math.round(sp)} px/s   ·   smack at ${SMACK_SPEED}`);
      meter.setColor(hex(sp >= SMACK_SPEED ? GUM.oozeLit : GUM.oozeDeep));

      if (sp < SMACK_SPEED || elapsed < gate) return;
      if (Phaser.Math.Distance.Between(s.hand.x, s.hand.y, foe.x, foe.y) > 32) return;
      gate = elapsed + 520;
      s.fx.splat(foe.x, foe.y, 18);
      tick(ctx, foe.x, foe.y - 16, `${SMACK_DAMAGE}`, GUM.oozeLit);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 10,
      '32px, 520ms per target — about 29 damage a second from a hand you were moving anyway', GUM.oozeDeep);
  },
};
