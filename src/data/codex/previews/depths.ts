import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  DPT, DepthsAvatar, DepthsFx, FISH_COLOR, FISH_EMOJI, FISH_PROFILE, FishKind, REMORA_PROFILE,
  algaeOrb, bubbleColumn, darkPuddle, fishBody, oxygenBar, piranha as drawPiranha, sharkBody,
} from '../../../elements/kits/DepthsVisuals';

/**
 * Depths' showcases.
 *
 * The thing to keep in frame here is that Depths is a **bait** element. Half of these loops are
 * showing something that is not damage at all — an orb that is a lie, a puddle somebody has to
 * run to, a bloom either side can eat — so every script stages the thing being baited as well as
 * the bait. A Depths preview with only a caster and a dummy in it documents a different element.
 *
 * Depths puts no sprite in the world: piranhas, thrown fish, remoras, the algae, the black
 * puddle, the oxygen bar and the shark are every one of them Graphics repainted per frame out of
 * `DepthsVisuals`, so `ctx.fly` is useless. Every loop mirrors the kit's own records and hands
 * them to the kit's own painters.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `DepthsFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const LURE_STANDOFF = 56;
const LURE_BITE_R = 44;
const BOOST_MULT = 1.5;
const BOOST_MS = 1000;
const FADE_IN_MS = 1400;

const PIRANHA_SPEED = 640;
const PIRANHA_HIT_R = 24;
const LATCH_MS = 3000;
const LATCH_DPS = 3;
const MAX_LATCH = 5;
const SWARM_DAMAGE_AT = 3;
const SWARM_SLOW_AT = 5;
const SWARM_LIFE_MULT = 1.5;

const DASH_SPEED = 720;
const DASH_MS = 170;
const SLASH_REACH = 96;
const SLASH_DAMAGE = 15;
const SLASH_DAMAGE_BOOSTED = 30;
const O2_DRAIN_MS = 5000;
const DROWN_DPS = 12;
const PUDDLE_R = 48;
const BREATH_PER_DAMAGE = 0.006;

const ALGAE_COUNT = 12;
const ALGAE_HEAL = 12;
const ALGAE_R = 28;
const RED_ALGAE_DAMAGE = 18;

const FISH_CATCH_MS = 3000;
const ICEFISH_DAMAGE = 15;
const BARRACUDA_DAMAGE = 25;
const PUFFER_DAMAGE = 15;
const BOMBFISH_DAMAGE = 20;
const BOMBFISH_R = 92;
const GULPER_DPS = 10;
const SWORD_DAMAGE = 50;
const SAW_TICK_DAMAGE = 1;
const REMORA_DAMAGE = 3;
const FLYER_DAMAGE = 15;

const SHARK_LEN = 210;
const SHARK_SPEED = 780;
const SHARK_MOUTH_R = 62;
const SHARK_DPS = 8;
const SHARK_FOLLOW_SPEED = 120;
const SHARK_ALGAE_DAMAGE = 30;

/** Speeds and shapes for every fish a preview throws, straight out of `FISH_STATS`. */
const FISH_SPEED: Partial<Record<FishKind, number>> = {
  icefish: 620, barracuda: 800, pufferfish: 400, bombfish: 540, gulper: 460,
  sawfish: 560, swordfish: 880, whaleshark: 150, flyingfish: 900, catfish: 420,
};
const FISH_LEN: Partial<Record<FishKind, number>> = {
  icefish: 34, barracuda: 46, pufferfish: 34, bombfish: 32, gulper: 52,
  sawfish: 46, swordfish: 54, whaleshark: 100, flyingfish: 32, catfish: 42,
};

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── Shared staging ────────────────────────────────────────────────────

function stageIt(ctx: PreviewCtx): { fx: DepthsFx; av: BaseAvatar; dav: DepthsAvatar | null } {
  const fx = ctx.capture(() => new DepthsFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new DepthsAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av, dav: av instanceof DepthsAvatar ? av : null };
}

/**
 * A caster the script places itself — needed by the loops where the character dashes, and by the
 * passive, where the whole point is that the body fades out from under the rig.
 */
function drivenCaster(
  ctx: PreviewCtx, read: () => Mark, o?: { alpha?: () => number },
): { fx: DepthsFx; av: BaseAvatar; dav: DepthsAvatar | null } {
  const fx = ctx.capture(() => new DepthsFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-depths')) {
    const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-depths').setDepth(5));
    ctx.onFrame(() => {
      const p = read();
      body.setPosition(p.x, p.y);
      body.setAlpha(o?.alpha?.() ?? 1);
    });
  }
  const av = ctx.useAvatar(() => new DepthsAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  // The rig is driven off the fade rather than the sprite's alpha, exactly as the kit does it,
  // so the esca survives the body going completely transparent.
  ctx.onFrame((dt) => { const p = read(); av.update(dt, p.x, p.y, 1); });
  return { fx, av, dav: av instanceof DepthsAvatar ? av : null };
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#02101a', strokeThickness: 3,
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

/** A stand-in the script can move, hide and hang an oxygen bar on. */
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

/**
 * The school: piranhas in flight and piranhas chewing, stepped and painted the way
 * `updateSwimmers` / `updateLatches` / `paintAir` do it. The chew is billed per victim as one
 * figure rather than per fish, which is the kit's own rule and the reason a full school reads
 * as a single number.
 */
function school(ctx: PreviewCtx, fx: DepthsFx, victim: Mark, o: { swarm: boolean }): {
  send(from: Mark): void;
  count(): number;
} {
  interface Swimmer { x: number; y: number; vx: number; vy: number; wig: number }
  interface Latch { until: number; orbit: number; chew: number }
  const swimmers: Swimmer[] = [];
  const latches: Latch[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  const life = o.swarm ? SWARM_LIFE_MULT : 1;
  let now = 0;
  let carry = 0;
  let announced = false;

  ctx.onFrame((dt) => {
    now += dt;
    const s = dt / 1000;
    g.clear();

    for (let i = swimmers.length - 1; i >= 0; i--) {
      const p = swimmers[i];
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.wig += s * 16;
      if (Phaser.Math.Distance.Between(p.x, p.y, victim.x, victim.y) <= PIRANHA_HIT_R) {
        swimmers.splice(i, 1);
        // Past five, the newest one shoulders the oldest aside rather than joining.
        if (latches.length >= MAX_LATCH) {
          latches.reduce((a, b) => (a.until <= b.until ? a : b)).until = now + LATCH_MS * life;
        } else {
          latches.push({ until: now + LATCH_MS * life, orbit: Math.random() * Math.PI * 2, chew: Math.random() * 6 });
        }
        fx.chomp(victim.x, victim.y, Math.random() * Math.PI * 2, 20, DPT.blood);
        continue;
      }
      drawPiranha(g, ctx.tint, p.x, p.y, Math.atan2(p.vy, p.vx) + Math.sin(p.wig) * 0.32, 9, 1, p.wig * 1.6);
    }

    for (let i = latches.length - 1; i >= 0; i--) {
      const l = latches[i];
      if (now >= l.until) { latches.splice(i, 1); continue; }
      l.orbit += s * 1.6;
      l.chew += s * 14;
      const r = 26;
      const fade = Phaser.Math.Clamp((l.until - now) / 400, 0, 1);
      drawPiranha(g, ctx.tint, victim.x + Math.cos(l.orbit) * r, victim.y + Math.sin(l.orbit) * r * 0.9,
        l.orbit + Math.PI, 9, fade, l.chew);
    }

    if (!latches.length) { carry = 0; announced = false; return; }
    const swarming = o.swarm && latches.length >= SWARM_DAMAGE_AT;
    carry += latches.length * LATCH_DPS * (swarming ? 2 : 1) * s;
    const whole = Math.floor(carry);
    if (whole > 0) {
      carry -= whole;
      tick(ctx, victim.x + (Math.random() - 0.5) * 16, victim.y - 12, `${whole}`, DPT.blood);
    }
    if (o.swarm && latches.length >= SWARM_SLOW_AT && !announced) {
      announced = true;
      tick(ctx, victim.x, victim.y - 52, '🐟 SWARMED · −20% SPEED', DPT.trench);
    }
  });

  return {
    send(from) {
      const ang = Math.atan2(victim.y - from.y, victim.x - from.x);
      swimmers.push({
        x: from.x + Math.cos(ang) * 20, y: from.y + Math.sin(ang) * 20,
        vx: Math.cos(ang) * PIRANHA_SPEED, vy: Math.sin(ang) * PIRANHA_SPEED,
        wig: Math.random() * 6,
      });
      fx.bubbles(from.x, from.y, 4, 14, DPT.foam, 420, 7);
    },
    count: () => latches.length,
  };
}

// ── Click — Piranha ───────────────────────────────────────────────────

function piranhaLoop(ctx: PreviewCtx, opts: { swarm: boolean }): void {
  const { fx, av } = stageIt(ctx);
  const foe: Mark = { x: ctx.tx, y: ctx.ty };
  dummy(ctx, foe);
  const sc = school(ctx, fx, foe, { swarm: opts.swarm });

  // Five clicks at the real 1.2s cadence would outrun the box, so the loop shows a school being
  // assembled at the pace a player actually assembles one when the target is standing still.
  for (let i = 0; i < 5; i++) {
    ctx.at(300 + i * 700, () => {
      av.play('punch', ctx.aim);
      sc.send({ x: ctx.cx, y: ctx.cy });
    });
  }
  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.swarm ? '3 on one body doubles every bite to 6/s each; 5 also drags them 20% slower'
      : 'no impact damage at all — 3 HP a second each, for 3 seconds each, up to five',
    DPT.trench);
}

export const piranha: PreviewScript = {
  duration: 7200,
  scale: 0.9,
  caption: 'Click — the fish does nothing on arrival. It stays on, and chews for 3 a second',
  run(ctx) { piranhaLoop(ctx, { swarm: false }); },
};

export const piranhaUpgraded: PreviewScript = {
  duration: 7200,
  scale: 0.9,
  caption: 'Swarm Tactics — half again as long, doubled bites at three, and a 20% drag at five',
  run(ctx) { piranhaLoop(ctx, { swarm: true }); },
};

// ── E — Lungfish Strike ───────────────────────────────────────────────

/** The black air pocket, the oxygen bar and the tether — the whole drowning, drawn. */
function drowning(
  ctx: PreviewCtx, fx: DepthsFx, victim: Mark, puddle: Mark,
): { o2: () => number; drain(dt: number): void; winded(damage: number): void } {
  const state = { o2: 1, tickAcc: 0 };
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    ground.clear();
    air.clear();
    darkPuddle(ground, ctx.tint, puddle.x, puddle.y, PUDDLE_R, t, 1, 4);
    oxygenBar(air, ctx.tint, victim.x, victim.y - 40, 54, state.o2, t, 1);
    air.lineStyle(1.6, ctx.tint(state.o2 > 0 ? DPT.cyan : DPT.blood), 0.28);
    air.lineBetween(victim.x, victim.y, puddle.x, puddle.y);
  });
  return {
    o2: () => state.o2,
    drain(dt) {
      // Reaching the pool is a full breath, not a trickle — and it resets the damage tick.
      if (Phaser.Math.Distance.Between(victim.x, victim.y, puddle.x, puddle.y) <= PUDDLE_R) {
        if (state.o2 < 0.999) {
          fx.bubbles(victim.x, victim.y, 8, 30, DPT.foam, 500, 9);
          tick(ctx, victim.x, victim.y - 46, '💨 AIR', DPT.foam);
        }
        state.o2 = 1;
        state.tickAcc = 0;
        return;
      }
      state.o2 = Math.max(0, state.o2 - dt / O2_DRAIN_MS);
      if (state.o2 > 0) return;
      state.tickAcc += dt;
      while (state.tickAcc >= 1000) {
        state.tickAcc -= 1000;
        tick(ctx, victim.x, victim.y - 18, `${DROWN_DPS}`, DPT.trench);
        fx.bubbles(victim.x, victim.y - 10, 5, 18, DPT.cyan, 420, 9);
      }
    },
    winded(damage) {
      if (state.o2 <= 0) return;
      const cost = damage * BREATH_PER_DAMAGE;
      state.o2 = Math.max(0, state.o2 - cost);
      if (cost < 0.05) return;
      tick(ctx, victim.x, victim.y - 58, '💨 WINDED', DPT.cyan);
      fx.bubbles(victim.x, victim.y - 12, 4, 16, DPT.foam, 380, 9);
    },
  };
}

export const lungfish: PreviewScript = {
  duration: 8200,
  scale: 0.9,
  bodyTexture: '',
  caption: 'E — 15 on the cut, then 5s of air and 12 a second until they reach the pool',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.2, y: ctx.h * 0.62 };
    const { fx, av } = drivenCaster(ctx, () => home);
    const foe: Mark = { x: ctx.w * 0.42, y: ctx.h * 0.62 };
    dummy(ctx, foe);
    // The pool lands at the mirror of the victim's position, which is why it is always a run.
    const pool: Mark = { x: ctx.w * 0.86, y: ctx.h * 0.34 };
    const drown = drowning(ctx, fx, foe, pool);

    let running = false;
    ctx.at(500, () => {
      av.play('dash', ctx.aim);
      fx.slashArc(home.x, home.y, ctx.aim, SLASH_REACH * 0.8, DPT.cyan);
      let run = 0;
      // 720 px/s for 170ms, applied after movement so nothing cancels it.
      ctx.onFrame((dt) => {
        if (run >= DASH_MS) return;
        const use = Math.min(dt, DASH_MS - run);
        run += use;
        home.x += DASH_SPEED * (use / 1000);
      });
    });
    ctx.at(620, () => {
      fx.chomp(foe.x, foe.y, ctx.aim, 24, DPT.blood);
      tick(ctx, foe.x, foe.y - 14, `${SLASH_DAMAGE}`, DPT.cyan);
      tick(ctx, foe.x, foe.y - 44, '🫧 NO AIR', DPT.cyan);
      fx.ring(pool.x, pool.y, 14, PUDDLE_R * 1.6, DPT.cyan, 620);
      running = true;
    });

    // They run for it — and get there just after the bar has already emptied on them.
    ctx.onFrame((dt) => {
      if (!running) return;
      drown.drain(dt);
      const d = Phaser.Math.Distance.Between(foe.x, foe.y, pool.x, pool.y);
      if (d <= 4) return;
      const step = Math.min(d, 62 * (dt / 1000));
      foe.x += ((pool.x - foe.x) / d) * step;
      foe.y += ((pool.y - foe.y) / d) * step;
    });
    label(ctx, ctx.w * 0.5, ctx.h - 10,
      'the pool is placed at the mirror of where they were standing — 48px, and a full breath', DPT.trench);
  },
};

export const lungfishUpgraded: PreviewScript = {
  duration: 8200,
  scale: 0.9,
  caption: 'Knock the Breath Out — 0.6% of the bar per point of damage, from anything in the kit',
  run(ctx) {
    const { fx, av } = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.56, y: ctx.h * 0.6 };
    dummy(ctx, foe);
    const pool: Mark = { x: ctx.w * 0.88, y: ctx.h * 0.28 };
    const drown = drowning(ctx, fx, foe, pool);
    const sc = school(ctx, fx, foe, { swarm: false });

    ctx.at(400, () => {
      av.play('dash', ctx.aim);
      fx.slashArc(ctx.cx, ctx.cy, ctx.aim, SLASH_REACH * 0.8, DPT.lure);
      fx.chomp(foe.x, foe.y, ctx.aim, 24, DPT.blood);
      tick(ctx, foe.x, foe.y - 14, `${SLASH_DAMAGE_BOOSTED}`, DPT.lure);
      tick(ctx, foe.x, foe.y - 44, '🫧 NO AIR', DPT.cyan);
    });

    let running = false;
    ctx.at(700, () => { running = true; });
    ctx.onFrame((dt) => { if (running) drown.drain(dt); });

    // A sword fish is 50 damage and 30% of somebody's lungs at the same time.
    ctx.at(2000, () => {
      av.play('punch', ctx.aim);
      tick(ctx, foe.x, foe.y - 26, `${SWORD_DAMAGE}`, DPT.sword);
      drown.winded(SWORD_DAMAGE);
    });
    // And a school takes a couple of percent a second off the top of it.
    for (let i = 0; i < 3; i++) ctx.at(2600 + i * 400, () => sc.send({ x: ctx.cx, y: ctx.cy }));
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 3200 || !sc.count()) return;
      drown.winded(sc.count() * LATCH_DPS * (dt / 1000));
    });

    label(ctx, ctx.w * 0.5, ctx.h - 10,
      '50-damage sword fish = 30% of the bar · a school of three ≈ 5% a second', DPT.trench);
  },
};

// ── R — Eutrophication ────────────────────────────────────────────────

interface Orb { x: number; y: number; bad: boolean; seed: number; gone: boolean }

/** The bloom, painted with the kit's own orb painter — red only for the side that planted it. */
function bloom(ctx: PreviewCtx, orbs: Orb[], o?: { mine?: boolean }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    for (const a of orbs) {
      if (a.gone) continue;
      algaeOrb(g, ctx.tint, a.x, a.y, 8, t, 1, a.seed, a.bad && (o?.mine ?? true));
    }
  });
}

/** Scattered the way `doEutrophication` scatters one: ten tries each at staying 80px clear. */
function scatter(ctx: PreviewCtx, count: number, trap: boolean): Orb[] {
  const out: Orb[] = [];
  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 10; attempt++) {
      x = Phaser.Math.Between(20, Math.floor(ctx.w) - 20);
      y = Phaser.Math.Between(24, Math.floor(ctx.h) - 20);
      if (out.every((p) => Phaser.Math.Distance.Between(p.x, p.y, x, y) > 44)) break;
    }
    out.push({ x, y, bad: trap && i % 2 === 1, seed: Math.random() * 999, gone: false });
  }
  return out;
}

function eutroLoop(ctx: PreviewCtx, opts: { trap: boolean }): void {
  const { fx, av } = stageIt(ctx);
  const orbs = scatter(ctx, opts.trap ? ALGAE_COUNT * 2 : ALGAE_COUNT, opts.trap);
  bloom(ctx, orbs);

  // Somebody walking the bloom, taking whatever they find — which is exactly how the ability
  // resolves: first come, no owner check, either colour.
  const walker: Mark = { x: ctx.w * 0.9, y: ctx.h * 0.72 };
  dummy(ctx, walker);
  label(ctx, walker.x, walker.y + 26, 'them', DPT.trench);
  label(ctx, ctx.cx, ctx.cy + 26, 'you', DPT.cyan);

  ctx.at(300, () => {
    av.play('flex');
    fx.ring(ctx.cx, ctx.cy, 20, 200, opts.trap ? DPT.rot : DPT.algae, 700);
    tick(ctx, ctx.cx, ctx.cy - 46,
      opts.trap ? '🌿 ALGAE TRAP' : '🌿 EUTROPHICATION', opts.trap ? DPT.rot : DPT.algae);
  });

  let target: Orb | null = null;
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < 800) return;
    if (!target || target.gone) {
      let best: Orb | null = null;
      let bestD = Infinity;
      for (const a of orbs) {
        if (a.gone) continue;
        const d = Phaser.Math.Distance.Between(walker.x, walker.y, a.x, a.y);
        if (d < bestD) { bestD = d; best = a; }
      }
      target = best;
    }
    if (!target) return;
    const d = Phaser.Math.Distance.Between(walker.x, walker.y, target.x, target.y);
    if (d > ALGAE_R * 0.5) {
      const step = Math.min(d, 105 * (dt / 1000));
      walker.x += ((target.x - walker.x) / d) * step;
      walker.y += ((target.y - walker.y) / d) * step;
      return;
    }
    target.gone = true;
    if (target.bad) {
      fx.bubbles(target.x, target.y, 7, 26, DPT.rot, 520, 9);
      tick(ctx, walker.x, walker.y - 30, `${RED_ALGAE_DAMAGE}`, DPT.rot);
    } else {
      fx.bubbles(target.x, target.y, 7, 26, DPT.algae, 520, 9);
      tick(ctx, walker.x, walker.y - 30, `+${ALGAE_HEAL}`, DPT.algae);
    }
    target = null;
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.trap ? 'red on your screen only — to them, and to the AI, all 24 are heals'
      : '12 orbs, 12 health each, 25 seconds, and no owner check at all', DPT.trench);
}

export const eutrophication: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'R — 12 real heals across the arena, for whoever reaches one first. Including them',
  run(ctx) { eutroLoop(ctx, { trap: false }); },
};

export const eutrophicationUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Algae Trap — 12 more that deal 18 instead. Red to you, green to everybody else',
  run(ctx) { eutroLoop(ctx, { trap: true }); },
};

// ── F — Angler ────────────────────────────────────────────────────────

/**
 * One thrown fish, stepped and painted as `updateFishProjectiles` steps it. The behaviours that
 * make each fish a different weapon — the puffer's bounce, the eel's carry, the flyer's return —
 * are mirrored rather than summarised, because "it bounces" is the whole reason to want one.
 */
function throwFish(
  ctx: PreviewCtx, fx: DepthsFx, kind: FishKind,
  from: Mark, to: Mark, victim: Mark,
  o?: { onHit?: () => void },
): void {
  const speed = FISH_SPEED[kind] ?? 500;
  const len = FISH_LEN[kind] ?? 34;
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const p = { x: from.x + Math.cos(ang) * 20, y: from.y + Math.sin(ang) * 20 };
  const v = { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  let wig = 0;
  let dead = false;
  let lastHit = -9999;
  let carrying = false;
  let returning = false;
  let clock = 0;
  let eat = 0;

  ctx.onFrame((dt) => {
    clock += dt;
    g.clear();
    if (dead) return;
    const s = dt / 1000;
    wig += s * 14;

    if (returning) {
      const a = Math.atan2(from.y - p.y, from.x - p.x);
      v.x = Math.cos(a) * 820;
      v.y = Math.sin(a) * 820;
      if (Phaser.Math.Distance.Between(p.x, p.y, from.x, from.y) <= 34) {
        dead = true;
        fx.splash(from.x, from.y - 12, 26, DPT.flyer);
        tick(ctx, from.x, from.y - 46, '🐬 CAUGHT — NO COOLDOWN', DPT.flyer);
        return;
      }
    }

    p.x += v.x * s;
    p.y += v.y * s;

    const wall = p.x <= 6 || p.x >= ctx.w - 6 || p.y <= 24 || p.y >= ctx.h - 6;
    if (kind === 'pufferfish' && wall) {
      if (p.x <= 6 || p.x >= ctx.w - 6) v.x *= -1;
      if (p.y <= 24 || p.y >= ctx.h - 6) v.y *= -1;
      p.x = Phaser.Math.Clamp(p.x, 7, ctx.w - 7);
      p.y = Phaser.Math.Clamp(p.y, 25, ctx.h - 7);
      fx.bubbles(p.x, p.y, 4, 16, DPT.puffer, 340, 9);
    } else if (wall && !returning) {
      if (kind === 'bombfish') {
        fx.blast(p.x, p.y, BOMBFISH_R * 0.5, DPT.bomb);
        tick(ctx, p.x, p.y - 16, `${BOMBFISH_DAMAGE}`, DPT.bomb);
      }
      if (kind === 'gulper' && carrying) {
        tick(ctx, p.x, p.y - 30, '🐍 SPAT AT THE WALL', DPT.gulper);
        carrying = false;
      }
      dead = true;
      return;
    }

    // A carried body goes exactly where the eel goes — the kit resets its position every frame.
    if (carrying) {
      victim.x = p.x;
      victim.y = p.y;
      eat += GULPER_DPS * s;
      if (eat >= 1) {
        const whole = Math.floor(eat);
        eat -= whole;
        tick(ctx, p.x, p.y - 24, `${whole}`, DPT.gulper);
      }
      g.fillStyle(ctx.tint(DPT.gulper), 0.4);
      g.fillCircle(p.x, p.y, 30 + Math.sin(wig * 2) * 3);
    } else if (!returning && Phaser.Math.Distance.Between(p.x, p.y, victim.x, victim.y) <= 30) {
      switch (kind) {
        case 'icefish':
          tick(ctx, victim.x, victim.y - 16, `${ICEFISH_DAMAGE}`, DPT.ice);
          tick(ctx, victim.x, victim.y - 40, '🧊 CHILLED · −20%', DPT.ice);
          dead = true;
          break;
        case 'barracuda':
          if (clock - lastHit < 400) break;
          lastHit = clock;
          tick(ctx, victim.x, victim.y - 16, `${BARRACUDA_DAMAGE}`, DPT.barracuda);
          fx.chomp(victim.x, victim.y, ang, 22, DPT.blood);
          break;
        case 'pufferfish': {
          if (clock - lastHit < 700) break;
          lastHit = clock;
          tick(ctx, victim.x, victim.y - 16, `${PUFFER_DAMAGE}`, DPT.puffer);
          // It bounces off the body too, or it sits inside them on the re-hit timer.
          const away = Math.atan2(p.y - victim.y, p.x - victim.x);
          const sp = Math.hypot(v.x, v.y);
          v.x = Math.cos(away) * sp;
          v.y = Math.sin(away) * sp;
          break;
        }
        case 'bombfish':
          fx.blast(p.x, p.y, BOMBFISH_R * 0.5, DPT.bomb);
          tick(ctx, victim.x, victim.y - 16, `${BOMBFISH_DAMAGE}`, DPT.bomb);
          dead = true;
          break;
        case 'gulper':
          carrying = true;
          fx.chomp(victim.x, victim.y, ang, 34, DPT.gulper);
          tick(ctx, victim.x, victim.y - 40, '🐍 SWALLOWED', DPT.gulper);
          break;
        case 'swordfish':
          if (clock - lastHit < 400) break;
          lastHit = clock;
          tick(ctx, victim.x, victim.y - 16, `${SWORD_DAMAGE}`, DPT.sword);
          tick(ctx, victim.x, victim.y - 40, '⚔️ RUN THROUGH', DPT.sword);
          fx.slashArc(victim.x, victim.y, ang, 40, DPT.sword);
          break;
        case 'flyingfish':
          tick(ctx, victim.x, victim.y - 16, `${FLYER_DAMAGE}`, DPT.flyer);
          fx.chomp(victim.x, victim.y, ang, 20, DPT.flyer);
          returning = true;
          break;
        default:
          break;
      }
      o?.onHit?.();
    }

    fishBody(g, ctx.tint, p.x, p.y, Math.atan2(v.y, v.x) + Math.sin(wig) * 0.18, len,
      FISH_COLOR[kind], 1, FISH_PROFILE[kind], wig);
    if (kind === 'icefish') {
      g.fillStyle(ctx.tint(DPT.ice), 0.18);
      g.fillCircle(p.x - v.x * 0.02, p.y - v.y * 0.02, 16);
    }
  });
}

/** The three-second line, with the catch bar the avatar draws while it comes in. */
function fishingLine(
  ctx: PreviewCtx, dav: DepthsAvatar | null, o: { from: number; hits: number[] },
): { landsAt: number } {
  let remain = FISH_CATCH_MS;
  for (const at of o.hits) {
    ctx.at(at, () => {
      remain += 1000;
      tick(ctx, ctx.cx, ctx.cy - 34, '🎣 +1s', DPT.blood);
    });
  }
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < o.from || remain <= 0) return;
    remain -= dt;
    dav?.setFishing(Phaser.Math.Clamp(1 - remain / FISH_CATCH_MS, 0, 1));
  });
  return { landsAt: o.from + FISH_CATCH_MS + o.hits.length * 1000 };
}

export const angler: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'F — 3s of standing still, +1s per hit taken, then one of five at random',
  run(ctx) {
    const { fx, av, dav } = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.58 };
    dummy(ctx, foe);

    ctx.at(300, () => {
      av.play('sweep', ctx.aim);
      tick(ctx, ctx.cx, ctx.cy - 44, '🎣 CAST OUT', DPT.foam);
    });
    const line = fishingLine(ctx, dav, { from: 300, hits: [1600] });

    // One of the five, and it is a real roll — a preview that always showed the barracuda
    // would be documenting an ability that does not exist.
    const kinds: FishKind[] = ['icefish', 'barracuda', 'pufferfish', 'bombfish', 'gulper'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    ctx.at(line.landsAt, () => {
      dav?.setFishing(0);
      dav?.setFish(kind);
      fx.splash(ctx.cx, ctx.cy - 20, 34, FISH_COLOR[kind]);
      tick(ctx, ctx.cx, ctx.cy - 50, `${FISH_EMOJI[kind]} LANDED`, FISH_COLOR[kind]);
    });
    ctx.at(line.landsAt + 900, () => {
      dav?.setFish(null);
      av.play('punch', ctx.aim);
      throwFish(ctx, fx, kind, { x: ctx.cx, y: ctx.cy }, foe, foe);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'icefish 15+slow · barracuda 25 piercing · puffer 15 bouncing · bomb 20 in 92px · eel 10/s carried',
      DPT.trench);
  },
};

export const anglerUpgraded: PreviewScript = {
  duration: 9600,
  scale: 0.9,
  caption: 'Deep Fishing — hold F to give the catch up as bait, and the next one comes off the rare table',
  run(ctx) {
    const { fx, av, dav } = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.58 };
    dummy(ctx, foe);

    // A common fish landed, and then given up rather than thrown.
    ctx.at(200, () => { dav?.setFish('icefish'); });
    ctx.at(700, () => {
      dav?.setFish(null);
      av.play('flex');
      fx.bubbles(ctx.cx, ctx.cy - 12, 8, 26, DPT.ice, 560, 9);
      fx.ring(ctx.cx, ctx.cy, 8, 60, DPT.lure, 420);
      tick(ctx, ctx.cx, ctx.cy - 50, '🎣 BAITED', DPT.lure);
      tick(ctx, ctx.cx, ctx.cy - 68, 'HELD 0.5s — the icefish goes on the hook', DPT.foam);
    });

    const line = fishingLine(ctx, dav, { from: 1300, hits: [] });
    const rare: FishKind[] = ['sawfish', 'swordfish', 'whaleshark', 'flyingfish'];
    const kind = rare[Math.floor(Math.random() * rare.length)];
    ctx.at(line.landsAt, () => {
      dav?.setFishing(0);
      dav?.setFish(kind);
      fx.splash(ctx.cx, ctx.cy - 20, 34, FISH_COLOR[kind]);
      tick(ctx, ctx.cx, ctx.cy - 50, `${FISH_EMOJI[kind]} RARE`, FISH_COLOR[kind]);
    });

    ctx.at(line.landsAt + 900, () => {
      dav?.setFish(null);
      av.play('punch', ctx.aim);
      if (kind === 'sawfish') {
        // It does not pass through — it stays in, at ten one-point ticks a second.
        const stuck = { orbit: Math.random() * Math.PI * 2, wig: 0, acc: 0, until: 5000 };
        const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
        tick(ctx, foe.x, foe.y - 40, '🔪 STUCK', DPT.saw);
        ctx.onFrame((dt) => {
          g.clear();
          if (stuck.until <= 0) return;
          stuck.until -= dt;
          stuck.wig += (dt / 1000) * 18;
          stuck.acc += dt;
          while (stuck.acc >= 100) {
            stuck.acc -= 100;
            tick(ctx, foe.x + (Math.random() - 0.5) * 14, foe.y - 10, `${SAW_TICK_DAMAGE}`, DPT.saw);
          }
          const r = 24;
          fishBody(g, ctx.tint, foe.x + Math.cos(stuck.orbit) * r, foe.y + Math.sin(stuck.orbit) * r * 0.9,
            stuck.orbit + Math.PI, (FISH_LEN.sawfish ?? 46) * 0.8, FISH_COLOR.sawfish, 1,
            FISH_PROFILE.sawfish, stuck.wig);
        });
      } else if (kind === 'whaleshark') {
        // A platform, not a projectile: its body is harmless and it steers to the cursor.
        const p: Mark = { x: ctx.cx + 30, y: ctx.cy };
        const cursor: Mark = { x: ctx.w * 0.5, y: ctx.h * 0.4 };
        const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
        interface Remora { x: number; y: number; vx: number; vy: number; wig: number; dead: boolean }
        const remoras: Remora[] = [];
        let burst = 0;
        ctx.onFrame((dt, elapsed) => {
          const s = dt / 1000;
          g.clear();
          cursor.x = ctx.w * 0.5 + Math.sin(elapsed / 900) * ctx.w * 0.12;
          const d = Phaser.Math.Distance.Between(p.x, p.y, cursor.x, cursor.y);
          if (d > 14) {
            const a = Math.atan2(cursor.y - p.y, cursor.x - p.x);
            p.x += Math.cos(a) * 150 * s;
            p.y += Math.sin(a) * 150 * s;
          }
          burst -= dt;
          if (burst <= 0) {
            burst = 3000;
            const base = Math.atan2(foe.y - p.y, foe.x - p.x);
            for (let i = 0; i < 5; i++) {
              const a = base + (i / 4 - 0.5) * 0.5;
              remoras.push({
                x: p.x + Math.cos(a) * 24, y: p.y + Math.sin(a) * 24,
                vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, wig: 0, dead: false,
              });
            }
            fx.bubbles(p.x, p.y, 6, 30, DPT.foam, 460, 9);
          }
          for (const r of remoras) {
            if (r.dead) continue;
            r.x += r.vx * s;
            r.y += r.vy * s;
            r.wig += s * 22;
            if (Phaser.Math.Distance.Between(r.x, r.y, foe.x, foe.y) <= 26) {
              r.dead = true;
              tick(ctx, foe.x + (Math.random() - 0.5) * 16, foe.y - 12, `${REMORA_DAMAGE}`, DPT.whale);
              continue;
            }
            if (r.x > ctx.w || r.y < 0 || r.y > ctx.h) { r.dead = true; continue; }
            fishBody(g, ctx.tint, r.x, r.y, Math.atan2(r.vy, r.vx) + Math.sin(r.wig) * 0.3, 17,
              DPT.scale, 1, REMORA_PROFILE, r.wig);
          }
          fishBody(g, ctx.tint, p.x, p.y, Math.atan2(cursor.y - p.y, cursor.x - p.x),
            FISH_LEN.whaleshark ?? 100, FISH_COLOR.whaleshark, 1, FISH_PROFILE.whaleshark, elapsed / 90);
        });
      } else {
        throwFish(ctx, fx, kind, { x: ctx.cx, y: ctx.cy }, foe, foe);
      }
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'saw 10/s for 5s · sword 50 piercing · whale shark 3-damage remoras · flyer 15 and it comes back · catfish eats your bloom',
      DPT.trench);
  },
};

// ── Q — Megalodon ─────────────────────────────────────────────────────

function megaLoop(ctx: PreviewCtx, opts: { commanded: boolean }): void {
  const { fx, av } = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.56, y: ctx.h * 0.6 };
  dummy(ctx, foe);
  const orbs = opts.commanded ? scatter(ctx, 10, true) : [];
  if (opts.commanded) bloom(ctx, orbs);

  const shark = {
    x: ctx.cx - 150, y: ctx.cy, ang: 0, phase: 'rush' as 'rush' | 'hold',
    gape: 1, held: false, tickAcc: 0, holdLeft: 0,
  };
  const cursor: Mark = { x: ctx.w * 0.72, y: ctx.h * 0.4 };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));

  ctx.at(400, () => {
    av.play('raise');
    fx.ring(ctx.cx, ctx.cy, 20, 180, DPT.trench, 640);
    fx.bubbles(ctx.cx, ctx.cy, 14, 70, DPT.foam, 800, 7);
    tick(ctx, ctx.cx, ctx.cy - 50, '🦈 MEGALODON', DPT.shark);
    shark.phase = 'rush';
  });

  let started = false;
  ctx.at(400, () => { started = true; });
  ctx.onFrame((dt, elapsed) => {
    const s = dt / 1000;
    g.clear();
    if (!started) return;

    if (shark.phase === 'rush') {
      shark.x += Math.cos(shark.ang) * SHARK_SPEED * s;
      shark.gape = 1;
      // The mouth leads the body, so the swallow point is out at the nose.
      const mx = shark.x + Math.cos(shark.ang) * SHARK_LEN * 0.42;
      if (!shark.held && Phaser.Math.Distance.Between(mx, shark.y, foe.x, foe.y) <= SHARK_MOUTH_R) {
        shark.held = true;
        fx.chomp(foe.x, foe.y, shark.ang, 46, DPT.blood);
        tick(ctx, foe.x, foe.y - 44, '🦈 SWALLOWED', DPT.shark);
      }
      if (mx > ctx.w - 6) {
        shark.phase = 'hold';
        shark.x = Math.min(shark.x, ctx.w - 40);
        // It turns to face the room, which is what keeps a held fighter inside the walls.
        shark.ang += Math.PI;
        shark.holdLeft = shark.held ? 8000 : 1400;
        fx.splash(mx, shark.y, 60, DPT.trench);
        fx.ring(shark.x, shark.y, 30, 140, DPT.foam, 620);
      }
    } else {
      shark.gape = 0.15 + 0.15 * Math.sin(elapsed / 90);
      shark.holdLeft -= dt;

      if (opts.commanded) {
        cursor.x = ctx.w * 0.42 + Math.sin(elapsed / 1100) * ctx.w * 0.3;
        cursor.y = ctx.h * 0.52 + Math.cos(elapsed / 900) * ctx.h * 0.18;
        const d = Phaser.Math.Distance.Between(shark.x, shark.y, cursor.x, cursor.y);
        if (d > 12) {
          const a = Math.atan2(cursor.y - shark.y, cursor.x - shark.x);
          const step = Math.min(SHARK_FOLLOW_SPEED * s, d);
          shark.x = Phaser.Math.Clamp(shark.x + Math.cos(a) * step, 30, ctx.w - 30);
          shark.y = Phaser.Math.Clamp(shark.y + Math.sin(a) * step, 34, ctx.h - 20);
          shark.ang = a;
        }
      }

      const mouthX = shark.x + Math.cos(shark.ang) * SHARK_LEN * 0.3;
      const mouthY = shark.y + Math.sin(shark.ang) * SHARK_LEN * 0.3;
      if (shark.held) { foe.x = mouthX; foe.y = mouthY; }

      // Either colour. The damage is the grinding, not the algae.
      if (opts.commanded && shark.held) {
        for (const a of orbs) {
          if (a.gone) continue;
          if (Phaser.Math.Distance.Between(mouthX, mouthY, a.x, a.y) > SHARK_MOUTH_R) continue;
          a.gone = true;
          fx.chomp(a.x, a.y, shark.ang, 26, a.bad ? DPT.rot : DPT.algae);
          tick(ctx, foe.x, foe.y - 44, `🦈 ${SHARK_ALGAE_DAMAGE}`, DPT.blood);
        }
      }

      shark.tickAcc += dt;
      while (shark.tickAcc >= 1000) {
        shark.tickAcc -= 1000;
        if (!shark.held) continue;
        tick(ctx, foe.x, foe.y - 20, `${SHARK_DPS}`, DPT.blood);
        fx.bubbles(mouthX, mouthY, 5, 26, DPT.blood, 480, 9);
      }
      if (shark.held) {
        bubbleColumn(g, ctx.tint, mouthX, mouthY, elapsed / 1000, 5, 8, 34, 0.7, 3);
      }
    }

    sharkBody(g, ctx.tint, shark.x, shark.y, shark.ang, SHARK_LEN, 1, shark.gape, elapsed / 1000);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.commanded ? '120 px/s to your cursor, and 30 per orb it drives over into whoever is inside'
      : '62px mouth, 8 HP a second for 8s against the wall, then spat into the middle', DPT.trench);
}

export const megalodon: PreviewScript = {
  duration: 8000,
  scale: 0.8,
  caption: 'Q — it surfaces 150px behind you and sweeps through where you were standing',
  run(ctx) { megaLoop(ctx, { commanded: false }); },
};

export const megalodonUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.8,
  caption: 'Command the Depths — steer the beached shark over your own bloom, 30 damage an orb',
  run(ctx) { megaLoop(ctx, { commanded: true }); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const theAnglerfish: PreviewScript = {
  duration: 8600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Stand still and the water takes you, leaving an orb drawn with the same brush as a real heal',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.3, y: ctx.h * 0.62 };
    let hidden = 0;
    const { fx, av, dav } = drivenCaster(ctx, () => home, { alpha: () => 1 - hidden });
    const foe: Mark = { x: ctx.w * 0.92, y: ctx.h * 0.36 };
    dummy(ctx, foe);

    // A real orb and the fake one, side by side, painted by the same painter.
    const real: Orb[] = [{ x: ctx.w * 0.55, y: ctx.h * 0.28, bad: false, seed: 12, gone: false }];
    bloom(ctx, real);
    label(ctx, real[0].x, real[0].y + 22, 'a real heal', DPT.algae);

    const lure: Mark = { x: home.x + LURE_STANDOFF, y: home.y };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    let bitten = false;
    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      // 450ms of standing still, then a 1.4s fade. Past 85% the health bar goes too.
      if (elapsed > 450 && !bitten) hidden = Math.min(1, hidden + dt / FADE_IN_MS);
      dav?.setHidden(hidden);
      if (hidden < 0.3) return;
      const ang = Math.atan2(foe.y - home.y, foe.x - home.x);
      lure.x = home.x + Math.cos(ang) * LURE_STANDOFF;
      lure.y = home.y + Math.sin(ang) * LURE_STANDOFF;
      algaeOrb(g, ctx.tint, lure.x, lure.y, 8, t, hidden, 71);
      bubbleColumn(g, ctx.tint, lure.x, lure.y, t, 3, 5, 26, hidden * 0.6, 71);
      // The thread back to the body — visible from close up, invisible from across the arena.
      g.lineStyle(1, ctx.tint(DPT.lure), hidden * 0.16);
      g.lineBetween(lure.x, lure.y, home.x, home.y - 14);
    });
    ctx.at(1200, () => label(ctx, lure.x, lure.y - 22, 'and this one', DPT.lure));

    // It comes for the light. There is no way to tell them apart by looking.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 2600 || bitten || hidden < 0.3) return;
      const d = Phaser.Math.Distance.Between(foe.x, foe.y, lure.x, lure.y);
      if (d > LURE_BITE_R) {
        const step = Math.min(d, 150 * (dt / 1000));
        foe.x += ((lure.x - foe.x) / d) * step;
        foe.y += ((lure.y - foe.y) / d) * step;
        return;
      }
      bitten = true;
      hidden = 0;
      dav?.setHidden(0);
      fx.chomp(lure.x, lure.y, Math.atan2(home.y - foe.y, home.x - foe.x), 28, DPT.lure);
      fx.ring(home.x, home.y, 10, 90, DPT.lure, 420);
      tick(ctx, home.x, home.y - 46, '🎣 BITE!', DPT.lure);
      tick(ctx, foe.x, foe.y - 36, '❗', DPT.blood);
      av.play('flex');
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      '450ms still → 1.4s fade → the bar goes at 85% · 56px standoff, 44px bite', DPT.trench);
  },
};

export const feedingFrenzy: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'One second: ×1.5 speed, and a Lungfish Strike worth 30 instead of 15',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.2, y: ctx.h * 0.64 };
    const { fx, av } = drivenCaster(ctx, () => home);
    const foe: Mark = { x: ctx.w * 0.62, y: ctx.h * 0.64 };
    dummy(ctx, foe);
    const pool: Mark = { x: ctx.w * 0.88, y: ctx.h * 0.26 };

    let boostUntil = -1;
    ctx.at(500, () => {
      boostUntil = 500 + BOOST_MS;
      fx.chomp(home.x + 40, home.y, 0, 28, DPT.lure);
      fx.ring(home.x, home.y, 10, 90, DPT.lure, 420);
      tick(ctx, home.x, home.y - 46, '🎣 BITE!', DPT.lure);
      tick(ctx, home.x, home.y - 64, `🩸 ×${BOOST_MULT} SPEED · 1.0s`, DPT.blood);
    });

    // The window is a second. The strike has to already be aimed.
    const halo = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((dt, elapsed) => {
      halo.clear();
      if (boostUntil < 0 || elapsed > boostUntil) return;
      const left = (boostUntil - elapsed) / BOOST_MS;
      halo.lineStyle(2, ctx.tint(DPT.blood), 0.28 + left * 0.4);
      halo.strokeCircle(home.x, home.y, 24 + (1 - left) * 10);
      home.x += 190 * BOOST_MULT * (dt / 1000);
    });

    ctx.at(1200, () => {
      av.play('dash', ctx.aim);
      fx.slashArc(home.x, home.y, ctx.aim, SLASH_REACH * 0.8, DPT.lure);
      tick(ctx, home.x, home.y - 40, '🩸 FED', DPT.blood);
    });
    ctx.at(1340, () => {
      fx.chomp(foe.x, foe.y, ctx.aim, 24, DPT.blood);
      tick(ctx, foe.x, foe.y - 14, `${SLASH_DAMAGE_BOOSTED}`, DPT.lure);
      tick(ctx, foe.x, foe.y - 38, '🫧 NO AIR', DPT.cyan);
      fx.ring(pool.x, pool.y, 14, PUDDLE_R * 1.6, DPT.cyan, 620);
    });
    const drown = drowning(ctx, fx, foe, pool);
    ctx.onFrame((dt, elapsed) => { if (elapsed > 1340) drown.drain(dt); });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${SLASH_DAMAGE} → ${SLASH_DAMAGE_BOOSTED}, and it still starts the drowning`, DPT.trench);
  },
};
