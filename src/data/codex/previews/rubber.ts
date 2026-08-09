import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  RUBBER, RubberAvatar, RubberFx, boingRing, rubberBall, rubberStrandLayered,
} from '../../../elements/kits/RubberVisuals';

/**
 * Rubber's showcases.
 *
 * Everything in this element is **stored tension**, so every loop has to show the pull as well as
 * the release: the band thinning and paling as it stretches is the ability's readout, and a
 * preview that only shows the hit is documenting half of it. Three of the five scripts therefore
 * spend most of their runtime winding something up.
 *
 * Rubber puts no sprite in the world — fists, bands, anchors, balls and the bounce-form bar are
 * all Graphics repainted per frame out of `RubberVisuals` — so `ctx.fly` is useless for the kit's
 * own attacks. It is used once, in Bounce Form, for the enemy shot being turned around, because
 * that really is somebody else's projectile.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `RubberFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const PUNCH_MAX_HOLD_MS = 1500;
const PUNCH_MAX_PULL = 72;
const PUNCH_MIN_DMG = 8;
const PUNCH_MAX_DMG = 35;
const PUNCH_REACH = 130;
const PUNCH_STRETCH_MS = 130;
const PUNCH_HOLD_ANIM_MS = 60;
const PUNCH_SNAP_MS = 100;
const PUNCH_FIST_RADIUS = 40;

const BAZOOKA_SPEED = 780;
const BAZOOKA_RADIUS = 14;
const BAZOOKA_SNAP_SPEED = 2600;
const BAZOOKA_DMG = 50;

const SLING_MAX_PULL = 130;
const SLING_MIN_SPEED = 400;
const SLING_MAX_SPEED = 860;
const SLING_CONTACT_DMG = 28;
const SLING_ARM_ANGLE = Math.PI / 4;

const BOUNCE_FORM_MS = 3000;
const BOUNCE_REFLECT_RADIUS = 50;
const BOUNCE_REFLECT_SPEED = 1.6;
const COMBO_DMG = 50;

const BAND_LIFETIME_MS = 12000;
const BAND_COMFORT_RADIUS = 170;
const BAND_MAX_STRETCH = 420;
const BAND_MIN_SPEED_MULT = 0.3;
const BAND_RECALL_DURATION_MS = 220;
const BAND_RECALL_CONTACT_DMG = 15;
const BAND_ANCHOR_RADIUS = 14;
const BAND_ANCHOR_MAX_FLY_DMG = 30;

const RUBBERAGE_COUNT = 15;
const RUBBERAGE_COUNT_PLUS = 25;
const RUBBERAGE_DMG = 5;
const RUBBERAGE_DMG_PLUS = 8;
const RUBBERAGE_RADIUS = 7;
const RUBBERAGE_BASE_SPEED = 240;
const RUBBERAGE_MAX_SPEED = 820;
const RUBBERAGE_SPEED_GROWTH_PER_MS = 0.00045;
const PLAYER_BALL_SIZE_MULT = 0.42;

const UBER_GAIN_PER_HIT = 0.04;
const UBER_MAX = 0.60;
const UBER_IDLE_MS = 5000;

const VULC_DMG_PER_PCT = 5;
const VULC_FIRE_THRESHOLD = 0.75;
const VULC_FIRE_ANCHOR_DMG = 15;
const VULC_FIRE_ANCHOR_RADIUS = 78;

const NHILEGO_FUSE_MS = 3000;
const NHILEGO_START_RADIUS = 70;
const NHILEGO_GROWTH = 1.1;
const NHILEGO_DMG = 25;
const NHILEGO_HEAL_PER_HIT = 10;

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── Shared staging ────────────────────────────────────────────────────

interface Stage { fx: RubberFx; av: BaseAvatar; at: Mark }

function stageIt(ctx: PreviewCtx): Stage {
  const fx = ctx.capture(() => new RubberFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new RubberAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av, at: { x: ctx.cx, y: ctx.cy } };
}

/** A caster the script flings around — the sling, the snap-back and the player-ball all move. */
function drivenCaster(ctx: PreviewCtx, at: Mark, o?: { scale?: () => number }): Stage {
  const fx = ctx.capture(() => new RubberFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-rubber')) {
    const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-rubber').setDepth(5));
    ctx.onFrame(() => {
      body.setPosition(at.x, at.y);
      body.setScale(o?.scale?.() ?? 1);
    });
  }
  const av = ctx.useAvatar(() => new RubberAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => av.update(dt, at.x, at.y, o?.scale ? Phaser.Math.Clamp(o.scale() * 2, 0, 1) : 1));
  return { fx, av, at };
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#1a0308', strokeThickness: 3,
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

/** The drawn cursor — three of these loops are about what the mouse is doing, so it is on screen. */
function cursor(ctx: PreviewCtx, read: () => Mark | null): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(19));
  ctx.onFrame(() => {
    const p = read();
    g.clear();
    if (!p) return;
    g.lineStyle(1.4, ctx.tint(RUBBER.cream), 0.85);
    g.strokeCircle(p.x, p.y, 5);
    g.lineBetween(p.x - 8, p.y, p.x + 8, p.y);
    g.lineBetween(p.x, p.y - 8, p.x, p.y + 8);
  });
}

// ── Click — Rubber Punch ──────────────────────────────────────────────

function punchLoop(ctx: PreviewCtx, opts: { bazooka: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.72, y: ctx.h * 0.52 };
  dummy(ctx, foe);

  let pull = 0;
  let over = 0;
  let mouse: Mark | null = null;
  cursor(ctx, () => mouse);

  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  let fireAt = -9999;
  let fist: { x: number; y: number; vx: number; vy: number; path: Mark[]; bounces: number; going: boolean } | null = null;

  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    g.clear();
    const aim = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx);

    // Winding up: the fist is dragged *behind* you and the band thins as it goes.
    if (elapsed < fireAt) {
      const k = Phaser.Math.Clamp((elapsed - 300) / PUNCH_MAX_HOLD_MS, 0, 1);
      pull = k;
      over = opts.bazooka ? Phaser.Math.Clamp((elapsed - 300 - PUNCH_MAX_HOLD_MS) / PUNCH_MAX_HOLD_MS, 0, 1) : 0;
      const back = PUNCH_MAX_PULL * (k + over * 0.5);
      const fx0 = ctx.cx - Math.cos(aim) * back;
      const fy0 = ctx.cy - Math.sin(aim) * back;
      mouse = { x: fx0, y: fy0 };
      RubberFx.drawPunchArm(g, ctx.tint, ctx.cx, ctx.cy, fx0, fy0, -(k + over) * 0.5, over > 0.99, t);
      if (over > 0.99) {
        g.lineStyle(1.6, ctx.tint(RUBBER.charge), 0.5 + 0.5 * Math.sin(t * 22));
        g.strokeCircle(ctx.cx, ctx.cy, 30);
      }
      return;
    }
    mouse = null;

    // The bazooka fist, loose in the room.
    if (fist) {
      if (fist.going) {
        fist.x += fist.vx * step;
        fist.y += fist.vy * step;
        fist.path.push({ x: fist.x, y: fist.y });
        let bounced = false;
        if (fist.x <= 8 || fist.x >= ctx.w - 8) { fist.vx *= -1; bounced = true; }
        if (fist.y <= 8 || fist.y >= ctx.h - 8) { fist.vy *= -1; bounced = true; }
        if (bounced) {
          fist.bounces++;
          s.fx.boing(fist.x, fist.y, 6, 26, RUBBER.rose, 300, 8, 3);
          if (fist.bounces > 3) fist.going = false;
        }
      } else {
        // And then it retraces its own path home, very fast — a second pass over everything.
        const back = fist.path.pop();
        for (let i = 0; i < 4 && fist.path.length; i++) fist.path.pop();
        if (!back || fist.path.length === 0) {
          s.fx.boing(ctx.cx, ctx.cy, 8, 30, RUBBER.cream, 260, 9, 3);
          fist = null;
        } else {
          fist.x = back.x;
          fist.y = back.y;
        }
      }
      if (fist) {
        RubberFx.drawBazookaArm(g, ctx.tint, ctx.cx, ctx.cy, fist.path.slice(-24), fist.x, fist.y, false, t);
      }
    }
  });

  const throwIt = (at: number): void => {
    ctx.at(at, () => {
      fireAt = at;
      const aim = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx);
      s.av.play('punch', aim);
      if (opts.bazooka && over > 0.99) {
        fist = {
          x: ctx.cx, y: ctx.cy,
          vx: Math.cos(aim) * BAZOOKA_SPEED, vy: Math.sin(aim) * BAZOOKA_SPEED,
          path: [], bounces: 0, going: true,
        };
        s.fx.flash(ctx.cx, ctx.cy, 26, 9, RUBBER.charge);
        tick(ctx, ctx.cx, ctx.cy - 44, `🥊 BAZOOKA · ${BAZOOKA_DMG}`, RUBBER.charge);
        return;
      }
      const dmg = Math.round(PUNCH_MIN_DMG + (PUNCH_MAX_DMG - PUNCH_MIN_DMG) * pull);
      s.fx.boom(foe.x, foe.y, PUNCH_FIST_RADIUS, {});
      tick(ctx, foe.x, foe.y - 16, `${dmg}`, pull > 0.9 ? RUBBER.cream : RUBBER.rose);
      tick(ctx, ctx.cx, ctx.cy - 44, `${Math.round(pull * 100)}% PULL`, RUBBER.blush);
    });
  };

  if (opts.bazooka) {
    ctx.at(300, () => { fireAt = 300 + PUNCH_MAX_HOLD_MS * 2 + 200; });
    throwIt(300 + PUNCH_MAX_HOLD_MS * 2 + 200);
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${PUNCH_MAX_HOLD_MS / 1000}s to full, then ${PUNCH_MAX_HOLD_MS / 1000}s again to over-stretch · ${BAZOOKA_DMG} damage, 3 bounces, and it comes back along its own path`,
      RUBBER.maroon);
    return;
  }

  // A short pull and then a full one, so the scaling is side by side.
  ctx.at(300, () => { fireAt = 300 + 450; });
  throwIt(750);
  ctx.at(1600, () => { fireAt = 1600 + PUNCH_MAX_HOLD_MS; });
  ctx.at(1600, () => { pull = 0; });
  throwIt(1600 + PUNCH_MAX_HOLD_MS);
  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `${PUNCH_MIN_DMG} at no pull → ${PUNCH_MAX_DMG} at a full ${PUNCH_MAX_PULL}px drag · ${PUNCH_REACH}px of reach`,
    RUBBER.maroon);
}

export const punch: PreviewScript = {
  duration: 4200,
  scale: 0.9,
  caption: 'Click — drag the mouse backwards to wind up. It fires the opposite way to the pull',
  run(ctx) { punchLoop(ctx, { bazooka: false }); },
};

export const punchUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Rubber Bazooka — keep pulling past full and the fist leaves the arm: 50 damage, 3 bounces, and home',
  run(ctx) { punchLoop(ctx, { bazooka: true }); },
};

// ── E — Sling Shot ────────────────────────────────────────────────────

function slingLoop(ctx: PreviewCtx, opts: { bouncy: boolean }): void {
  const home: Mark = { x: ctx.w * 0.3, y: ctx.h * 0.66 };
  const s = drivenCaster(ctx, home);
  const foe: Mark = { x: ctx.w * 0.74, y: ctx.h * 0.3 };
  dummy(ctx, foe);

  const aim = Math.atan2(foe.y - home.y, foe.x - home.x);
  const armA: Mark = { x: home.x + Math.cos(aim - SLING_ARM_ANGLE) * 220, y: home.y + Math.sin(aim - SLING_ARM_ANGLE) * 220 };
  const armB: Mark = { x: home.x + Math.cos(aim + SLING_ARM_ANGLE) * 220, y: home.y + Math.sin(aim + SLING_ARM_ANGLE) * 220 };
  const restX = home.x;
  const restY = home.y;

  let tension = 0;
  let flying = false;
  let vx = 0;
  let vy = 0;
  let bounces = 0;
  let hit = false;
  let mouse: Mark | null = null;
  cursor(ctx, () => mouse);
  const walls = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    walls.clear();
    g.clear();
    if (opts.bouncy) {
      // Bouncy House coats the arena edge in the same gum you are made of.
      RubberFx.drawWallCoating(walls, ctx.tint, 2, 2, ctx.w - 4, ctx.h - 4, false, t);
    }

    if (!flying) {
      // Loading: the V strung between the two arms, with you in the pocket.
      const back = SLING_MAX_PULL * tension;
      home.x = restX - Math.cos(aim) * back;
      home.y = restY - Math.sin(aim) * back;
      mouse = tension > 0.02 ? { x: home.x, y: home.y } : null;
      RubberFx.drawSlingV(g, ctx.tint, home.x, home.y, armA.x, armA.y, armB.x, armB.y, tension, t);
      return;
    }
    mouse = null;

    home.x += vx * step;
    home.y += vy * step;
    if (!hit && Phaser.Math.Distance.Between(home.x, home.y, foe.x, foe.y) <= 26) {
      hit = true;
      s.fx.boom(foe.x, foe.y, 40, {});
      tick(ctx, foe.x, foe.y - 16, `${SLING_CONTACT_DMG}`, RUBBER.cream);
    }
    const wall = home.x <= 12 || home.x >= ctx.w - 12 || home.y <= 12 || home.y >= ctx.h - 12;
    if (!wall) return;
    home.x = Phaser.Math.Clamp(home.x, 12, ctx.w - 12);
    home.y = Phaser.Math.Clamp(home.y, 12, ctx.h - 12);
    s.fx.boing(home.x, home.y, 10, 46, RUBBER.rose, 380, 8, 4);
    if (!opts.bouncy || bounces >= 3) { flying = false; vx = 0; vy = 0; return; }
    // The bounce is aimed at the cursor as it is *now*, not reflected off the wall.
    bounces++;
    hit = false;
    const target = bounces % 2 === 0 ? foe : { x: ctx.w * 0.2, y: ctx.h * 0.2 };
    const a = Math.atan2(target.y - home.y, target.x - home.x);
    vx = Math.cos(a) * SLING_MAX_SPEED;
    vy = Math.sin(a) * SLING_MAX_SPEED;
    tick(ctx, home.x, home.y - 26, `BOUNCE ${bounces}/3`, RUBBER.blush);
  });

  ctx.at(300, () => { s.av.play('dash', aim); });
  ctx.onFrame((_dt, elapsed) => {
    if (flying || elapsed < 300) return;
    tension = Phaser.Math.Clamp((elapsed - 300) / 1200, 0, 1);
  });
  ctx.at(1600, () => {
    flying = true;
    const sp = SLING_MIN_SPEED + (SLING_MAX_SPEED - SLING_MIN_SPEED) * tension;
    vx = Math.cos(aim) * sp;
    vy = Math.sin(aim) * sp;
    s.fx.snap(home.x, home.y, armA.x, armA.y, { color: RUBBER.blush, duration: 260 });
    s.fx.snap(home.x, home.y, armB.x, armB.y, { color: RUBBER.blush, duration: 260 });
    tick(ctx, home.x, home.y - 44, `🚀 ${Math.round(sp)} px/s`, RUBBER.cream);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.bouncy ? `up to 3 more wall bounces, each aimed at the cursor — and ${SLING_CONTACT_DMG} on every leg`
      : `${SLING_MIN_SPEED}–${SLING_MAX_SPEED} px/s by pull · ${SLING_CONTACT_DMG} contact · you are the ammunition`,
    RUBBER.maroon);
}

export const sling: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'E — two arms to the walls, a V strung between them, and you in the pocket',
  run(ctx) { slingLoop(ctx, { bouncy: false }); },
};

export const slingUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Bouncy House — the arena edge is rubber now, and you keep going for three more bounces',
  run(ctx) { slingLoop(ctx, { bouncy: true }); },
};

// ── R — Bounce Form ───────────────────────────────────────────────────

function bounceLoop(ctx: PreviewCtx, opts: { combo: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.8, y: ctx.h * 0.44 };
  dummy(ctx, foe);

  if (opts.combo) {
    // Bounce Combo hangs off the anchor rather than off this key, so the loop shows the reel.
    const anchor: Mark = { x: ctx.w * 0.24, y: ctx.h * 0.74 };
    let reeling = false;
    let combo: { x: number; y: number; vx: number; vy: number } | null = null;
    let hit = false;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      const step = dt / 1000;
      g.clear();
      if (combo) {
        combo.x += combo.vx * step;
        combo.y += combo.vy * step;
        RubberFx.drawFreeAnchor(g, ctx.tint, combo.x, combo.y, combo.vx, combo.vy, BAND_ANCHOR_RADIUS);
        if (!hit && Phaser.Math.Distance.Between(combo.x, combo.y, foe.x, foe.y) <= 28) {
          hit = true;
          s.fx.boom(foe.x, foe.y, 44, {});
          tick(ctx, foe.x, foe.y - 16, `${COMBO_DMG}`, RUBBER.cobalt);
        }
        return;
      }
      if (reeling) {
        const d = Phaser.Math.Distance.Between(anchor.x, anchor.y, ctx.cx, ctx.cy);
        if (d > 6) {
          anchor.x += ((ctx.cx - anchor.x) / d) * 420 * step;
          anchor.y += ((ctx.cy - anchor.y) / d) * 420 * step;
        }
      }
      RubberFx.drawBand(g, ctx.tint, anchor.x, anchor.y, ctx.cx, ctx.cy, reeling ? 0.9 : 0.4, t);
      RubberFx.drawAnchor(g, ctx.tint, anchor.x, anchor.y, BAND_ANCHOR_RADIUS, true, false, t * 3, t);
    });
    ctx.at(600, () => {
      reeling = true;
      tick(ctx, ctx.cx, ctx.cy - 44, 'HOLD F — REELING IT IN', RUBBER.sky);
    });
    ctx.at(2100, () => {
      reeling = false;
      s.av.play('clap');
      const a = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx);
      combo = { x: ctx.cx, y: ctx.cy, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900 };
      s.fx.smear(anchor.x, anchor.y, foe.x, foe.y, { color: RUBBER.navy, width: 12, duration: 420 });
      s.fx.flash(ctx.cx, ctx.cy, 26, 9, RUBBER.cobalt);
      tick(ctx, ctx.cx, ctx.cy - 44, '⚡ BOUNCE COMBO', RUBBER.cobalt);
    });
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `tap R while the anchor is flying at you — ${COMBO_DMG} down a line, and the anchor is gone`,
      RUBBER.maroon);
    return;
  }

  let formUntil = -9999;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  interface Ref { x: number; y: number; vx: number; vy: number; dead: boolean }
  const reflected: Ref[] = [];
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    g.clear();
    if (elapsed < formUntil) {
      RubberFx.drawBounceForm(g, ctx.tint, ctx.cx, ctx.cy, Math.PI / 2, t);
      g.lineStyle(1, ctx.tint(RUBBER.blush), 0.22);
      g.strokeCircle(ctx.cx, ctx.cy, BOUNCE_REFLECT_RADIUS);
    }
    for (const r of reflected) {
      if (r.dead) continue;
      // Homing on whoever fired it, at 1.6× the speed it arrived with.
      const a = Math.atan2(foe.y - r.y, foe.x - r.x);
      r.vx = Phaser.Math.Linear(r.vx, Math.cos(a) * 520 * BOUNCE_REFLECT_SPEED, 0.12);
      r.vy = Phaser.Math.Linear(r.vy, Math.sin(a) * 520 * BOUNCE_REFLECT_SPEED, 0.12);
      r.x += r.vx * step;
      r.y += r.vy * step;
      if (Phaser.Math.Distance.Between(r.x, r.y, foe.x, foe.y) <= 22) {
        r.dead = true;
        s.fx.boom(foe.x, foe.y, 30, {});
        tick(ctx, foe.x, foe.y - 16, 'THEIRS', RUBBER.cream);
        continue;
      }
      rubberBall(g, ctx.tint, r.x, r.y, 6, Math.atan2(r.vy, r.vx), 0.2, RUBBER.rose, 1);
    }
  });

  ctx.at(400, () => {
    formUntil = 400 + BOUNCE_FORM_MS;
    s.av.play('flex');
    s.fx.boing(ctx.cx, ctx.cy, 8, 54, RUBBER.rose, 420, 8, 5);
    tick(ctx, ctx.cx, ctx.cy - 44, '🪀 BOUNCE FORM', RUBBER.rose);
    tick(ctx, ctx.cx, ctx.cy - 62, 'NO OTHER ABILITIES FOR 3s', RUBBER.maroon);
  });

  // Real enemy shots arriving at the bar and being turned around.
  for (let i = 0; i < 3; i++) {
    ctx.at(900 + i * 600, () => {
      ctx.fly({
        texture: 'proj-fire',
        from: { x: foe.x, y: foe.y },
        to: { x: ctx.cx, y: ctx.cy },
        speed: 520,
        onHit: () => {
          s.fx.boing(ctx.cx, ctx.cy, 6, 34, RUBBER.cream, 300, 9, 3);
          reflected.push({ x: ctx.cx, y: ctx.cy, vx: 0, vy: 0, dead: false });
          tick(ctx, ctx.cx, ctx.cy - 30, `↩ ×${BOUNCE_REFLECT_SPEED}`, RUBBER.cream);
        },
      });
    });
  }
  ctx.at(400 + BOUNCE_FORM_MS, () => tick(ctx, ctx.cx, ctx.cy - 44, 'BACK', RUBBER.blush));

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `${BOUNCE_REFLECT_RADIUS}px of reflection, at ×${BOUNCE_REFLECT_SPEED} speed and homing on whoever fired it`,
    RUBBER.maroon);
}

export const bounceForm: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  caption: 'R — flatten into a bar for 3 seconds. Everything they throw comes back faster and homing',
  run(ctx) { bounceLoop(ctx, { combo: false }); },
};

export const bounceFormUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Bounce Combo — tap R while reeling the anchor in and it rockets off you for 50',
  run(ctx) { bounceLoop(ctx, { combo: true }); },
};

// ── F — Rubber Banding ────────────────────────────────────────────────

function bandLoop(ctx: PreviewCtx, opts: { bouncy: boolean }): void {
  const home: Mark = { x: ctx.w * 0.32, y: ctx.h * 0.62 };
  const s = drivenCaster(ctx, home);
  const foe: Mark = { x: ctx.w * 0.76, y: ctx.h * 0.36 };
  dummy(ctx, foe);

  const anchor: Mark = { x: ctx.w * 0.24, y: ctx.h * 0.72 };
  let planted = false;
  let stretch = 0;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const rings = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    rings.clear();
    if (!planted) return;
    const d = Phaser.Math.Distance.Between(anchor.x, anchor.y, home.x, home.y);
    stretch = Phaser.Math.Clamp((d - BAND_COMFORT_RADIUS * 0.5) / (BAND_MAX_STRETCH * 0.5 - BAND_COMFORT_RADIUS * 0.5), 0, 1);
    // The comfort radius, drawn — the leash is a real cost and it should be visible.
    boingRing(rings, ctx.tint, anchor.x, anchor.y, BAND_COMFORT_RADIUS * 0.5, 0.1, t, RUBBER.maroon, 0.35, 2, 7);
    RubberFx.drawBand(g, ctx.tint, anchor.x, anchor.y, home.x, home.y, stretch, t);
    RubberFx.drawAnchor(g, ctx.tint, anchor.x, anchor.y, BAND_ANCHOR_RADIUS, opts.bouncy, false, t * 3, t);
  });

  ctx.at(300, () => {
    planted = true;
    s.av.play('slam', 0);
    s.fx.scuff(anchor.x, anchor.y, 20, 3);
    tick(ctx, anchor.x, anchor.y - 26, opts.bouncy ? '🔵 BOUNCY ANCHOR' : '⚓ ANCHOR', opts.bouncy ? RUBBER.sky : RUBBER.rose);
    tick(ctx, anchor.x, anchor.y - 44,
      `${(opts.bouncy ? 18000 : BAND_LIFETIME_MS) / 1000}s`, RUBBER.blush);
  });

  // Walk out until the band is dragging.
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < 700 || elapsed > 3000) return;
    home.x += 110 * (dt / 1000);
    home.y -= 40 * (dt / 1000);
  });
  ctx.at(2400, () => {
    tick(ctx, home.x, home.y - 40,
      `${Math.round((1 - (1 - (1 - BAND_MIN_SPEED_MULT) * stretch)) * 100)}% SPEED`, RUBBER.maroon);
    tick(ctx, home.x, home.y - 58, 'STRETCHED', RUBBER.gum);
  });

  // The snap-back, straight through anything in the way.
  ctx.at(3400, () => {
    const from = { x: home.x, y: home.y };
    s.fx.smear(from.x, from.y, anchor.x, anchor.y, { color: RUBBER.blush, width: 10, duration: 320 });
    let run = 0;
    ctx.onFrame((dt) => {
      if (run >= BAND_RECALL_DURATION_MS) return;
      run = Math.min(BAND_RECALL_DURATION_MS, run + dt);
      const k = run / BAND_RECALL_DURATION_MS;
      home.x = from.x + (anchor.x - from.x) * k;
      home.y = from.y + (anchor.y - from.y) * k;
    });
    tick(ctx, anchor.x, anchor.y - 40, '↩ SNAP-BACK', RUBBER.cream);
    if (opts.bouncy) tick(ctx, (from.x + anchor.x) / 2, (from.y + anchor.y) / 2 - 18, `${BAND_RECALL_CONTACT_DMG}`, RUBBER.sky);
  });

  // …and, once you are home, reeling it in hard enough that it flies past.
  ctx.at(4600, () => {
    const a = Math.atan2(foe.y - anchor.y, foe.x - anchor.x);
    let vx = Math.cos(a) * 1200;
    let vy = Math.sin(a) * 1200;
    let hit = false;
    const fg = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    planted = false;
    ctx.onFrame((dt) => {
      const step = dt / 1000;
      fg.clear();
      anchor.x += vx * step;
      anchor.y += vy * step;
      vx *= 0.995;
      vy *= 0.995;
      RubberFx.drawFreeAnchor(fg, ctx.tint, anchor.x, anchor.y, vx, vy, BAND_ANCHOR_RADIUS);
      if (hit || Phaser.Math.Distance.Between(anchor.x, anchor.y, foe.x, foe.y) > 28) return;
      hit = true;
      s.fx.boom(foe.x, foe.y, 36, {});
      tick(ctx, foe.x, foe.y - 16, `${BAND_ANCHOR_MAX_FLY_DMG}`, RUBBER.cream);
    });
    tick(ctx, ctx.w * 0.4, ctx.h * 0.72, '🎣 REELED PAST — MAX TENSION', RUBBER.cream);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.bouncy ? `unbreakable — attacks knock it flying instead · 18s · ${BAND_RECALL_CONTACT_DMG} on the snap-back line`
      : `${BAND_COMFORT_RADIUS}px free, then dragging down to ${Math.round(BAND_MIN_SPEED_MULT * 100)}% speed at ${BAND_MAX_STRETCH}px`,
    RUBBER.maroon);
}

export const band: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'F — a leash you fight inside, a snap-back home, and a reel that throws the anchor past you',
  run(ctx) { bandLoop(ctx, { bouncy: false }); },
};

export const bandUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Bouncy Anchor — nothing can break it, it lasts 18s, and the snap-back bruises',
  run(ctx) { bandLoop(ctx, { bouncy: true }); },
};

// ── Q — Rubberage ─────────────────────────────────────────────────────

function rageLoop(ctx: PreviewCtx, opts: { ball: boolean }): void {
  const home: Mark = { x: ctx.w * 0.3, y: ctx.h * 0.62 };
  let isBall = false;
  const s = drivenCaster(ctx, home, { scale: () => (isBall ? PLAYER_BALL_SIZE_MULT : 1) });
  const foe: Mark = { x: ctx.w * 0.72, y: ctx.h * 0.42 };
  dummy(ctx, foe);

  interface Ball { x: number; y: number; vx: number; vy: number; gate: number }
  const balls: Ball[] = [];
  const count = opts.ball ? RUBBERAGE_COUNT_PLUS : RUBBERAGE_COUNT;
  const dmg = opts.ball ? RUBBERAGE_DMG_PLUS : RUBBERAGE_DMG;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  let born = -1;

  ctx.at(400, () => {
    born = 400;
    s.av.play('raise');
    s.fx.boing(ctx.cx, ctx.cy, 10, 90, RUBBER.rose, 520, 8, 6);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      balls.push({
        x: home.x, y: home.y,
        vx: Math.cos(a) * RUBBERAGE_BASE_SPEED, vy: Math.sin(a) * RUBBERAGE_BASE_SPEED,
        gate: 0,
      });
    }
    tick(ctx, home.x, home.y - 44, `🪀 RUBBERAGE ×${count}`, RUBBER.rose);
    if (!opts.ball) return;
    isBall = true;
    tick(ctx, home.x, home.y - 62, `AND YOU · ${dmg} EACH`, RUBBER.amethyst);
  });

  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    g.clear();
    if (born < 0) return;
    // They accelerate the whole time — the first seconds are polite and the last ones are not.
    const age = elapsed - born;
    const speed = Math.min(RUBBERAGE_MAX_SPEED, RUBBERAGE_BASE_SPEED * (1 + age * RUBBERAGE_SPEED_GROWTH_PER_MS));
    for (const b of balls) {
      const cur = Math.hypot(b.vx, b.vy) || 1;
      b.vx = (b.vx / cur) * speed;
      b.vy = (b.vy / cur) * speed;
      b.x += b.vx * step;
      b.y += b.vy * step;
      if (b.x <= RUBBERAGE_RADIUS || b.x >= ctx.w - RUBBERAGE_RADIUS) b.vx *= -1;
      if (b.y <= RUBBERAGE_RADIUS || b.y >= ctx.h - RUBBERAGE_RADIUS) b.vy *= -1;
      b.x = Phaser.Math.Clamp(b.x, RUBBERAGE_RADIUS, ctx.w - RUBBERAGE_RADIUS);
      b.y = Phaser.Math.Clamp(b.y, RUBBERAGE_RADIUS, ctx.h - RUBBERAGE_RADIUS);
      if (elapsed >= b.gate && Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) <= 24) {
        b.gate = elapsed + 350;
        tick(ctx, foe.x + (Math.random() - 0.5) * 20, foe.y - 12, `${dmg}`, RUBBER.cream);
      }
      RubberFx.drawRageBall(g, ctx.tint, b.x, b.y, b.vx, b.vy, RUBBERAGE_RADIUS, false, RUBBERAGE_MAX_SPEED, t);
    }
    // The player-ball, bouncing off the walls toward the cursor like the rest.
    if (!isBall) return;
    const target = { x: foe.x, y: foe.y };
    const a = Math.atan2(target.y - home.y, target.x - home.x);
    home.x = Phaser.Math.Clamp(home.x + Math.cos(a) * speed * 0.7 * step, 10, ctx.w - 10);
    home.y = Phaser.Math.Clamp(home.y + Math.sin(a) * speed * 0.7 * step, 10, ctx.h - 10);
    rubberBall(g, ctx.tint, home.x, home.y, RUBBERAGE_RADIUS + 2, a, 0.15, RUBBER.amethyst, 1, 0, RUBBER.orchid);
  });

  // The speed readout, because the acceleration is the ability.
  const meter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 12, '', {
    fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(RUBBER.cream),
  }).setOrigin(0.5).setDepth(19));
  ctx.onFrame((_dt, elapsed) => {
    if (born < 0) { meter.setText(''); return; }
    const speed = Math.min(RUBBERAGE_MAX_SPEED,
      RUBBERAGE_BASE_SPEED * (1 + (elapsed - born) * RUBBERAGE_SPEED_GROWTH_PER_MS));
    meter.setText(`${Math.round(speed)} px/s  →  ${RUBBERAGE_MAX_SPEED}`);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.ball ? `${RUBBERAGE_COUNT_PLUS} balls at ${RUBBERAGE_DMG_PLUS} for 14s — the count, the damage and the duration all go up, not just you`
      : `${RUBBERAGE_COUNT} balls, ${RUBBERAGE_DMG} and heavy knockback each, accelerating for 10s`,
    RUBBER.maroon);
}

export const rubberage: PreviewScript = {
  duration: 8000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Q — fifteen balls left to it, getting faster the whole time. The knockback is what kills',
  run(ctx) { rageLoop(ctx, { ball: false }); },
};

export const rubberageUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Rubber Ball — you join them, and there are 25 of them at 8 damage for 14 seconds',
  run(ctx) { rageLoop(ctx, { ball: true }); },
};

// ── Passive ───────────────────────────────────────────────────────────

export const storedTension: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Three abilities scale off pull alone — and the band tells you how far you have got',
  run(ctx) {
    const s = stageIt(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let pull = 0;
    let row = 0;
    const ROWS = [
      { label: `punch  ${PUNCH_MIN_DMG} → ${PUNCH_MAX_DMG} damage`, color: RUBBER.rose },
      { label: `sling  ${SLING_MIN_SPEED} → ${SLING_MAX_SPEED} px/s`, color: RUBBER.blush },
      { label: `anchor  5 → ${BAND_ANCHOR_MAX_FLY_DMG} damage`, color: RUBBER.sky },
    ];

    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      const phase = (elapsed % 2600) / 2600;
      pull = phase < 0.75 ? phase / 0.75 : 0;
      row = Math.min(ROWS.length - 1, Math.floor(elapsed / 2600));
      const back = 100 * pull;
      // One band, stretching and thinning and paling — the readout the whole element runs on.
      rubberStrandLayered(g, ctx.tint, ctx.cx - back, ctx.cy, ctx.cx + 90, ctx.cy,
        11 - pull * 6, 8 - pull * 5, 0, ROWS[row].color, 1);
      if (pull > 0.96) {
        g.lineStyle(1.4, ctx.tint(RUBBER.charge), 0.4 + 0.4 * Math.sin(t * 20));
        g.strokeCircle(ctx.cx - back, ctx.cy, 14);
      }
    });

    const meter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 14, '', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    }).setOrigin(0.5).setDepth(19));
    ctx.onFrame(() => {
      meter.setText(`${ROWS[row].label}   ·   ${Math.round(pull * 100)}% pull`);
      meter.setColor(hex(ROWS[row].color));
    });

    for (let i = 0; i < 3; i++) {
      ctx.at(2600 * i + 1950, () => {
        s.fx.snap(ctx.cx - 100, ctx.cy, ctx.cx + 90, ctx.cy, { color: RUBBER.cream, duration: 240 });
        s.av.play('punch', 0);
      });
    }

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'no resource bar, no charges — only how long you are willing to stand still', RUBBER.maroon);
  },
};

// ── Perk — Uber-Gear ──────────────────────────────────────────────────

export const perkUberGear: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: '+4% elasticity a landed hit to +60%, feeding punch, sling and Rubberage alike',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.72, y: ctx.h * 0.52 };
    dummy(ctx, foe);
    let uber = 0;
    let lastHit = -9999;

    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(19));
    const meter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 14, '', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(RUBBER.cream),
    }).setOrigin(0.5).setDepth(19));
    ctx.onFrame((dt, elapsed) => {
      // Nothing at all for 5 seconds, then 8 points a second.
      if (elapsed - lastHit > UBER_IDLE_MS) uber = Math.max(0, uber - 0.08 * (dt / 1000));
      bar.clear();
      const w = ctx.w * 0.42;
      const x = ctx.w * 0.5 - w / 2;
      bar.fillStyle(ctx.tint(RUBBER.gum), 0.8);
      bar.fillRect(x, 26, w, 5);
      bar.fillStyle(ctx.tint(uber >= UBER_MAX ? RUBBER.charge : RUBBER.rose), 0.95);
      bar.fillRect(x, 26, w * (uber / UBER_MAX), 5);
      meter.setText(`elasticity +${Math.round(uber * 100)}%   ·   cap +${Math.round(UBER_MAX * 100)}%`);
      meter.setColor(hex(uber >= UBER_MAX ? RUBBER.charge : RUBBER.cream));
    });

    // Fifteen quick jabs is the fastest route to the cap — the click is cheap on purpose.
    for (let i = 0; i < 15; i++) {
      ctx.at(400 + i * 260, () => {
        s.av.play('punch', 0);
        s.fx.boom(foe.x, foe.y, 26, {});
        uber = Math.min(UBER_MAX, uber + UBER_GAIN_PER_HIT);
        lastHit = 400 + i * 260;
        const dmg = Math.round(PUNCH_MIN_DMG * (1 + uber));
        tick(ctx, foe.x + (Math.random() - 0.5) * 16, foe.y - 14, `${dmg}`, RUBBER.rose);
      });
    }
    ctx.at(4500, () => tick(ctx, ctx.cx, ctx.cy - 44, `+${Math.round(UBER_MAX * 100)}% — CAP`, RUBBER.charge));
    ctx.at(5200, () => tick(ctx, ctx.cx, ctx.cy - 44, `${UBER_IDLE_MS / 1000}s OF GRACE`, RUBBER.blush));
    ctx.at(6600, () => tick(ctx, ctx.cx, ctx.cy - 44, 'DECAYING · 8%/s', RUBBER.maroon));

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'and Rubberage runs 50% longer with balls that never lose speed', RUBBER.maroon);
  },
};

// ── Mastery ───────────────────────────────────────────────────────────

export const masteryVulcanization: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  caption: 'Every 5 damage taken cures 1%. Barely there at 20%, and on fire past 75%',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.76, y: ctx.h * 0.44 };
    dummy(ctx, foe);
    let cure = 0;
    const anchor: Mark = { x: ctx.w * 0.34, y: ctx.h * 0.76 };

    const skin = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(19));
    const meter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 14, '', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    }).setOrigin(0.5).setDepth(19));
    let nextPulse = 0;
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      skin.clear();
      bar.clear();
      const hot = cure >= VULC_FIRE_THRESHOLD;
      // The cured skin, and the heat once it runs past three quarters.
      skin.fillStyle(ctx.tint(hot ? RUBBER.ember : RUBBER.cured), 0.18 + cure * 0.3);
      skin.fillCircle(ctx.cx, ctx.cy, 22 + cure * 6 + (hot ? Math.sin(t * 9) * 2 : 0));
      if (hot) {
        skin.lineStyle(2, ctx.tint(RUBBER.flame), 0.4 + 0.4 * Math.sin(t * 11));
        skin.strokeCircle(ctx.cx, ctx.cy, 28 + Math.sin(t * 7) * 2);
      }
      const w = ctx.w * 0.44;
      const x = ctx.w * 0.5 - w / 2;
      bar.fillStyle(ctx.tint(RUBBER.gum), 0.85);
      bar.fillRect(x, 26, w, 5);
      bar.fillStyle(ctx.tint(hot ? RUBBER.ember : RUBBER.maroon), 0.95);
      bar.fillRect(x, 26, w * cure, 5);
      // The 75% mark, which is the whole shape of the enhancement.
      bar.fillStyle(ctx.tint(RUBBER.charge), 0.9);
      bar.fillRect(x + w * VULC_FIRE_THRESHOLD, 24, 1.4, 9);
      meter.setText(`vulcanized ${Math.round(cure * 100)}%${hot ? '   ·   RUNNING HOT' : ''}`);
      meter.setColor(hex(hot ? RUBBER.ember : RUBBER.cream));

      // Past 75% the anchor pulses a fire blast on its own.
      if (!hot || elapsed < nextPulse) return;
      nextPulse = elapsed + 3000;
      s.fx.heatBurst(anchor.x, anchor.y, VULC_FIRE_ANCHOR_RADIUS * 0.5, 8);
      tick(ctx, anchor.x, anchor.y - 26, `🔥 ${VULC_FIRE_ANCHOR_DMG}`, RUBBER.ember);
    });

    // The only way to charge it is to be hit.
    for (let i = 0; i < 14; i++) {
      ctx.at(500 + i * 550, () => {
        const dmg = 25 + Math.floor(Math.random() * 15);
        cure = Math.min(1, cure + (dmg / VULC_DMG_PER_PCT) / 100);
        s.fx.motes(ctx.cx, ctx.cy, 4, { color: RUBBER.soot, depth: 8, life: 420 });
        tick(ctx, ctx.cx, ctx.cy - 26, `−${dmg}`, RUBBER.maroon);
      });
    }
    ctx.at(4700, () => tick(ctx, ctx.cx, ctx.cy - 46, '🔥 RUNNING HOT — 75%', RUBBER.ember));

    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      RubberFx.drawAnchor(g, ctx.tint, anchor.x, anchor.y, BAND_ANCHOR_RADIUS,
        false, cure >= VULC_FIRE_THRESHOLD, elapsed / 300, elapsed / 1000);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'faster charges, faster slings, longer Bounce Form, harder anchors and shorter cooldowns — all at once',
      RUBBER.maroon);
  },
};

export const masteryAtomNhilego: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'A chain of zones you have to be standing inside — every one you make opens the next 10% bigger',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.24, y: ctx.h * 0.68 };
    const s = drivenCaster(ctx, home);
    const foe: Mark = { x: ctx.w * 0.7, y: ctx.h * 0.36 };
    dummy(ctx, foe);

    interface Zone { x: number; y: number; r: number; born: number; gone: boolean }
    const zones: Zone[] = [];
    let chain = 0;
    let radius = NHILEGO_START_RADIUS * 0.55;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));

    const open = (at: number, x: number, y: number): void => {
      ctx.at(at, () => {
        zones.push({ x, y, r: radius, born: at, gone: false });
      });
    };

    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      for (const z of zones) {
        if (z.gone) continue;
        const age = elapsed - z.born;
        if (age >= NHILEGO_FUSE_MS) {
          z.gone = true;
          s.fx.boom(z.x, z.y, z.r, {});
          const inside = Phaser.Math.Distance.Between(home.x, home.y, z.x, z.y) <= z.r;
          if (Phaser.Math.Distance.Between(foe.x, foe.y, z.x, z.y) <= z.r) {
            tick(ctx, foe.x, foe.y - 16, `${NHILEGO_DMG}`, RUBBER.amethyst);
          }
          if (inside) {
            chain++;
            radius *= NHILEGO_GROWTH;
            tick(ctx, z.x, z.y - 26, `⛓ CHAIN ×${chain}`, RUBBER.orchid);
          } else {
            tick(ctx, z.x, z.y - 26, 'MISSED — RUN OVER', RUBBER.maroon);
            tick(ctx, home.x, home.y - 40, `+${chain * NHILEGO_HEAL_PER_HIT} ❤`, RUBBER.cream);
          }
          continue;
        }
        RubberFx.drawNhilegoZone(g, ctx.tint, z.x, z.y, z.r, 1 - age / NHILEGO_FUSE_MS, true, t);
      }
      // Chasing the current zone down — which is the whole ability.
      const live = zones.find((z) => !z.gone);
      if (!live) return;
      const d = Phaser.Math.Distance.Between(home.x, home.y, live.x, live.y);
      if (d <= 6) return;
      const step = Math.min(d, 210 * (dt / 1000));
      home.x += ((live.x - home.x) / d) * step;
      home.y += ((live.y - home.y) / d) * step;
    });

    open(400, ctx.w * 0.5, ctx.h * 0.5);
    open(3600, ctx.w * 0.72, ctx.h * 0.72);
    open(6800, ctx.w * 0.3, ctx.h * 0.28);
    // The last one is put where you cannot reach it in time, which is how a run always ends.
    open(9900, ctx.w * 0.94, ctx.h * 0.9);

    label(ctx, ctx.w * 0.5, ctx.h - 10,
      `${NHILEGO_DMG} to everything inside, ${NHILEGO_FUSE_MS / 1000}s fuse, +${Math.round((NHILEGO_GROWTH - 1) * 100)}% bigger each time · ${NHILEGO_HEAL_PER_HIT} HP a zone when the run ends`,
      RUBBER.voidPurple);
  },
};
