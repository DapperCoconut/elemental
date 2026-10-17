import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  ILL, IllusionAvatar, IllusionFx,
  gateway, illusionDagger, phantomFigure, warpPane,
} from '../../../elements/kits/IllusionVisuals';

/**
 * Illusion's showcases.
 *
 * The element throws exactly one sprite — `proj-illusion-crack` — and paints everything else
 * per frame out of `IllusionVisuals`: the pane, the understudy and the daggers are all
 * repainted Graphics with no world object behind them. Guise's clone is the element's own body
 * sprite and rig, staged twice. So these loops
 * fly the real bullet through `ctx.fly` and drive the kit's own painters with the kit's own
 * constants for the rest, which keeps one implementation of every shape rather than two.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so any
 * text or Graphics built inside one is handed to `ctx.adopt` by hand. `IllusionFx` instances
 * carry a sticky sink and look after themselves.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const SHOT_SPEED = 760;
const VEIL_HALF_LEN = 82;
const VEIL_HALF_THICK = 13;
const VEIL_DEFLECT = Math.PI / 6;
const DUP_SPREAD = Math.PI / 7;
const VEIL_STANDOFF = 78;
const GUISE_SIZE = 0.2;
const GUISE_SELF_ALPHA = 0.38;
const GUISE_PAYOUT = 0.2;
const BLADE_COUNT = 10;
const BLADE_SPEED = 660;
const BLADE_SPREAD = Math.PI / 3;
const BLADE_SIZE = 13;
const PHANTOM_FUSE_MS = 1000;
const PHANTOM_RADIUS = 100;

// ── Staging ───────────────────────────────────────────────────────────

interface Mark { x: number; y: number }

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: IllusionFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new IllusionFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new IllusionAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

/**
 * The caster, positioned by the script rather than by the harness.
 *
 * The box parks the rig on its own caster mark at full alpha every frame, which is wrong for
 * every loop here that either moves the illusionist (Relocate, the Dance) or needs them off the
 * floor line so a 164px pane fits above them. Those scripts set `bodyTexture: ''` so the
 * harness stages no body of its own, and re-drive the rig from a frame hook — hooks run after
 * the harness's own pass, so this is what sticks.
 */
function drivenCaster(
  ctx: PreviewCtx, read: () => { x: number; y: number; alpha: number },
): { fx: IllusionFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new IllusionFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-illusion')) {
    const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-illusion').setDepth(5));
    ctx.onFrame(() => {
      const s = read();
      body.setPosition(s.x, s.y).setAlpha(s.alpha);
    });
  }
  const av = ctx.useAvatar(() => new IllusionAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => {
    const s = read();
    av.update(dt, s.x, s.y, s.alpha);
  });
  return { fx, av };
}

/** `ctx.addDummy` stands its target on the harness's floor line; these loops choose their own. */
function dummyAt(ctx: PreviewCtx, m: Mark, o?: { scale?: () => number; alpha?: () => number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    const s = o?.scale?.() ?? 1;
    const a = o?.alpha?.() ?? 1;
    g.clear();
    if (a <= 0.02) return;
    g.fillStyle(0x2b2f3d, a);
    g.fillCircle(m.x, m.y, 17 * s);
    g.fillStyle(0x3c4254, a);
    g.fillCircle(m.x, m.y, 13 * s);
    g.fillStyle(0x8e97ad, a * 0.9);
    g.fillCircle(m.x - 5 * s, m.y - 4 * s, 3.2 * s);
    g.fillCircle(m.x + 5 * s, m.y - 4 * s, 3.2 * s);
    g.fillStyle(0x11131b, a);
    g.fillCircle(m.x - 5.6 * s, m.y - 4 * s, 1.6 * s);
    g.fillCircle(m.x + 4.4 * s, m.y - 4 * s, 1.6 * s);
  });
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** A figure floating off an impact. The whole screen exists to quote numbers; so do the loops. */
function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#08060f', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(20));
  const y0 = y;
  let age = 0;
  ctx.onFrame((dt) => {
    age += dt;
    t.setY(y0 - (age / 700) * 20);
    t.setAlpha(Phaser.Math.Clamp(1 - age / 700, 0, 1));
  });
}

/** Where a ray leaves the box — used to send a deflected bullet at whatever wall it now faces. */
function edgePoint(ctx: PreviewCtx, x: number, y: number, ang: number): Mark {
  const cx = Math.cos(ang);
  const cy = Math.sin(ang);
  const m = 8;
  let best = 4000;
  if (cx > 0.001) best = Math.min(best, (ctx.w - m - x) / cx);
  if (cx < -0.001) best = Math.min(best, (m - x) / cx);
  if (cy > 0.001) best = Math.min(best, (ctx.h - m - y) / cy);
  if (cy < -0.001) best = Math.min(best, (m - y) / cy);
  return { x: x + cx * best, y: y + cy * best };
}

/** The wall crack and the hitscan splinter that runs back off it. */
function crackWall(ctx: PreviewCtx, fx: IllusionFx, at: Mark, victim: Mark): void {
  const inward = Math.atan2(ctx.h / 2 - at.y, ctx.w / 2 - at.x);
  fx.wallCrack(at.x, at.y, inward, ILL.crimson);
  fx.crackBeam(at.x, at.y, victim.x, victim.y, ILL.crimson);
  tick(ctx, victim.x, victim.y - 26, '10', ILL.crimson);
}

// ── Click — Crack Shot ────────────────────────────────────────────────

export const crackShot: PreviewScript = {
  duration: 3200,
  caption: 'Click — 20 on a body at 760 px/s, and a miss still cracks the wall for 10',
  run(ctx) {
    const { fx, av } = stage(ctx);
    const muzzle = { x: ctx.cx + 26, y: ctx.cy };

    // The hit: an ordinary bullet doing an ordinary 20.
    ctx.at(300, () => {
      av.play('punch', ctx.aim);
      fx.shards(muzzle.x, muzzle.y, 3, 16, ILL.crimson, 260, 6);
      ctx.fly({
        texture: 'proj-illusion-crack', from: muzzle, to: { x: ctx.tx, y: ctx.ty }, speed: SHOT_SPEED,
        onHit: () => {
          fx.shards(ctx.tx, ctx.ty, 5, 22, ILL.crimson, 380, 9);
          tick(ctx, ctx.tx, ctx.ty - 28, '20', ILL.crimson);
        },
      });
    });

    // The miss: past the shoulder, into the wall, and the wall pays anyway.
    ctx.at(1500, () => {
      const wall = { x: ctx.w - 10, y: ctx.cy - 34 };
      av.play('punch', Math.atan2(wall.y - ctx.cy, wall.x - ctx.cx));
      fx.shards(muzzle.x, muzzle.y, 3, 16, ILL.crimson, 260, 6);
      ctx.fly({
        texture: 'proj-illusion-crack', from: muzzle, to: wall, speed: SHOT_SPEED,
        onHit: () => crackWall(ctx, fx, wall, { x: ctx.tx, y: ctx.ty }),
      });
    });
  },
};

export const crackShotUpgraded: PreviewScript = {
  duration: 3000,
  scale: 0.9,
  caption: 'Immersion Breaker — 20 through every body on the line, then 10 off the wall behind them',
  run(ctx) {
    const fx = ctx.capture(() => new IllusionFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const av = ctx.useAvatar(() => new IllusionAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);

    const muzzle = { x: ctx.cx + 26, y: ctx.cy };
    const bodies: Mark[] = [
      { x: ctx.w * 0.46, y: ctx.cy },
      { x: ctx.w * 0.64, y: ctx.cy },
      { x: ctx.w * 0.82, y: ctx.cy },
    ];
    for (const b of bodies) dummyAt(ctx, b);
    const wall = { x: ctx.w - 10, y: ctx.cy };

    ctx.at(400, () => {
      av.play('punch', ctx.aim);
      fx.shards(muzzle.x, muzzle.y, 3, 16, ILL.crimson, 260, 6);
      ctx.fly({
        texture: 'proj-illusion-crack', from: muzzle, to: wall, speed: SHOT_SPEED, pierce: true,
        onHit: () => crackWall(ctx, fx, wall, bodies[2]),
      });
      // Billed once per body, at the moment the bullet actually reaches each of them.
      for (const b of bodies) {
        ctx.at(((b.x - muzzle.x) / SHOT_SPEED) * 1000, () => {
          fx.pierceSpray(b.x, b.y, ctx.aim);
          tick(ctx, b.x, b.y - 28, '20', ILL.crimson);
        });
      }
    });
  },
};

// ── E — Illusion Veil ─────────────────────────────────────────────────

/** The pane, painted every frame exactly as `paintField` does, with its real 0.32s fade-out. */
function pane(ctx: PreviewCtx, at: Mark, ang: number, lifeMs: number, bornAt: number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  let seed = 0;
  ctx.onFrame((_dt, elapsed) => {
    if (!seed) seed = 137;
    const age = elapsed - bornAt;
    g.clear();
    if (age < 0 || age > lifeMs) return;
    const fade = Phaser.Math.Clamp((lifeMs - age) / 320, 0, 1);
    warpPane(g, ctx.tint, at.x, at.y, ang, VEIL_HALF_LEN, VEIL_HALF_THICK,
      elapsed / 1000, fade, seed);
  });
}

/** A bullet flown into the pane and out the far side on a new heading. */
function throughPane(
  ctx: PreviewCtx, fx: IllusionFx, from: Mark, cross: Mark, heading: number, kick: number,
): void {
  ctx.fly({
    texture: 'proj-illusion-crack', from, to: cross, speed: SHOT_SPEED,
    onHit: () => {
      fx.shards(cross.x, cross.y, 4, 14, ILL.warp, 300, 6);
      const out = heading + kick;
      tick(ctx, cross.x, cross.y - 30, `${Math.round(Math.abs(kick) * 180 / Math.PI)}° OFF`, ILL.warp);
      ctx.fly({
        texture: 'proj-illusion-crack', from: cross, to: edgePoint(ctx, cross.x, cross.y, out),
        speed: SHOT_SPEED,
      });
    },
  });
}

export const veil: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'E — a 164px pane for 6s. Every shot across it leaves 30° off, yours included',
  run(ctx) {
    const home = { x: ctx.w * 0.2, y: ctx.h * 0.5, alpha: 1 };
    const { fx, av } = drivenCaster(ctx, () => home);
    const foe = { x: ctx.w * 0.86, y: ctx.h * 0.5 };
    dummyAt(ctx, foe);

    const at = { x: home.x + VEIL_STANDOFF, y: home.y };
    ctx.at(300, () => {
      av.play('sweep', ctx.aim);
      (av instanceof IllusionAvatar ? av : null)?.setScattered(true);
      fx.ring(at.x, at.y, 12, VEIL_HALF_LEN, ILL.warp, 420);
      tick(ctx, home.x, home.y - 44, '🌫️ VEIL', ILL.warp);
    });
    // The pane stands across the aim, which is what `ang + π/2` means in the kit.
    pane(ctx, at, ctx.aim + Math.PI / 2, 6000, 300);

    const muzzle = { x: home.x + 26, y: home.y };
    // Yours, kicked one way…
    ctx.at(1100, () => {
      av.play('punch', ctx.aim);
      throughPane(ctx, fx, muzzle, { x: at.x, y: at.y }, ctx.aim, VEIL_DEFLECT);
    });
    // …theirs, kicked the other, because the pane does not know whose shot it is…
    ctx.at(2900, () => {
      throughPane(ctx, fx, { x: foe.x - 26, y: foe.y }, { x: at.x, y: at.y }, Math.PI, VEIL_DEFLECT);
    });
    // …and yours again, on a fresh coin flip.
    ctx.at(4500, () => {
      av.play('punch', ctx.aim);
      throughPane(ctx, fx, muzzle, { x: at.x, y: at.y }, ctx.aim, -VEIL_DEFLECT);
    });

    ctx.at(6300, () => fx.ring(at.x, at.y, VEIL_HALF_LEN, 14, ILL.warp, 320));
  },
};

export const veilUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Duplication — a Crack Shot crosses the pane as two, ±25.7°, and both can crack',
  run(ctx) {
    const home = { x: ctx.w * 0.2, y: ctx.h * 0.5, alpha: 1 };
    const { fx, av } = drivenCaster(ctx, () => home);
    const foe = { x: ctx.w * 0.86, y: ctx.h * 0.5 };
    dummyAt(ctx, foe);

    const at = { x: home.x + VEIL_STANDOFF, y: home.y };
    ctx.at(200, () => {
      av.play('sweep', ctx.aim);
      fx.ring(at.x, at.y, 12, VEIL_HALF_LEN, ILL.warp, 420);
    });
    pane(ctx, at, ctx.aim + Math.PI / 2, 5000, 200);

    const muzzle = { x: home.x + 26, y: home.y };
    ctx.at(1100, () => {
      av.play('punch', ctx.aim);
      ctx.fly({
        texture: 'proj-illusion-crack', from: muzzle, to: { x: at.x, y: at.y }, speed: SHOT_SPEED,
        onHit: () => {
          fx.split(at.x, at.y, ctx.aim, DUP_SPREAD);
          tick(ctx, at.x, at.y - 34, '✂️ ×2', ILL.spark);
          for (const side of [1, -1]) {
            const out = ctx.aim + DUP_SPREAD * side;
            const wall = edgePoint(ctx, at.x, at.y, out);
            ctx.fly({
              texture: 'proj-illusion-crack', from: { x: at.x, y: at.y }, to: wall, speed: SHOT_SPEED,
              // Both halves are tracked shots, so both pay the wall's 10.
              onHit: () => crackWall(ctx, fx, wall, foe),
            });
          }
        },
      });
    });
  },
};

// ── R — Relocate ──────────────────────────────────────────────────────

/** A faint arena outline with the four inset corner marks, so a jump reads as going somewhere. */
function arenaFrame(ctx: PreviewCtx, corners: Mark[], nearest: () => number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    g.lineStyle(1, ctx.tint(ILL.violetDim), 0.4);
    g.strokeRect(10, 10, ctx.w - 20, ctx.h - 20);
    const skip = nearest();
    for (let i = 0; i < corners.length; i++) {
      const c = corners[i];
      const dead = i === skip;
      g.lineStyle(1.6, ctx.tint(dead ? ILL.crimsonDeep : ILL.warp), dead ? 0.5 : 0.75);
      g.strokeCircle(c.x, c.y, 15 + (dead ? 0 : Math.sin(elapsed / 260) * 1.6));
      if (dead) {
        // The corner already stood in is struck off the list before the roll.
        g.lineBetween(c.x - 10, c.y - 10, c.x + 10, c.y + 10);
        g.lineBetween(c.x + 10, c.y - 10, c.x - 10, c.y + 10);
      }
    }
  });
}

function cornerSet(ctx: PreviewCtx): Mark[] {
  const inset = 34;
  return [
    { x: inset, y: inset }, { x: ctx.w - inset, y: inset },
    { x: inset, y: ctx.h - inset }, { x: ctx.w - inset, y: ctx.h - inset },
  ];
}

function nearestIndex(corners: Mark[], p: Mark): number {
  return corners.reduce((best, c, i) => (
    Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y)
      < Phaser.Math.Distance.Between(p.x, p.y, corners[best].x, corners[best].y) ? i : best), 0);
}

export const relocate: PreviewScript = {
  duration: 4400,
  scale: 0.9,
  bodyTexture: '',
  caption: 'R — instant, no wind-up, to one of the three corners you are not already nearest',
  run(ctx) {
    const corners = cornerSet(ctx);
    const here = { x: ctx.w * 0.5, y: ctx.h * 0.5, alpha: 1 };
    const { fx, av } = drivenCaster(ctx, () => here);
    arenaFrame(ctx, corners, () => nearestIndex(corners, here));

    const jump = (to: Mark): void => {
      fx.blinkOut(here.x, here.y, ILL.violet);
      here.x = to.x;
      here.y = to.y;
      fx.blinkIn(to.x, to.y, ILL.magenta);
      av.play('dash');
      (av instanceof IllusionAvatar ? av : null)?.setScattered(true);
      tick(ctx, to.x, to.y - 40, '✨ RELOCATE', ILL.violet);
    };
    ctx.at(700, () => jump(corners[1]));
    ctx.at(1900, () => jump(corners[2]));
    ctx.at(3100, () => jump(corners[0]));
  },
};

export const relocateUpgraded: PreviewScript = {
  duration: 4000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Phantom — a 1s fuse, then 100px of ×1.2 damage taken and ×0.7 speed for 5s',
  run(ctx) {
    const here = { x: ctx.w * 0.3, y: ctx.h * 0.55, alpha: 1 };
    const { fx, av } = drivenCaster(ctx, () => here);
    const chaser = { x: ctx.w * 0.3 + 62, y: ctx.h * 0.55 };
    dummyAt(ctx, chaser);

    const left = { x: here.x, y: here.y };
    let bornAt = -1;
    // The understudy, wound by the same 0→1 charge the kit hands `phantomFigure`.
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (bornAt < 0) return;
      const charge = (elapsed - bornAt) / PHANTOM_FUSE_MS;
      if (charge < 0 || charge > 1) return;
      phantomFigure(g, ctx.tint, left.x, left.y, elapsed / 1000, charge, 1, 271);
    });

    ctx.at(600, () => {
      bornAt = 600;
      fx.blinkOut(here.x, here.y, ILL.violet);
      here.x = ctx.w * 0.78;
      here.y = ctx.h * 0.35;
      fx.blinkIn(here.x, here.y, ILL.magenta);
      av.play('dash');
      fx.ring(left.x, left.y, 8, 40, ILL.crimson, 320);
      tick(ctx, left.x, left.y - 42, '👻 PHANTOM', ILL.crimson);
    });

    ctx.at(600 + PHANTOM_FUSE_MS, () => {
      bornAt = -1;
      fx.phantomBurst(left.x, left.y, PHANTOM_RADIUS);
      // Everything inside the 100px ring wears the mark; nothing takes damage from it.
      if (Phaser.Math.Distance.Between(left.x, left.y, chaser.x, chaser.y) <= PHANTOM_RADIUS) {
        tick(ctx, chaser.x, chaser.y - 30, '👻 UNDERSTUDIED', ILL.crimson);
        ctx.at(620, () => tick(ctx, chaser.x, chaser.y - 30, '×1.2 DMG · ×0.7 SPEED', ILL.crimson));
      }
    });
  },
};

// ── F — Guise ─────────────────────────────────────────────────────────

/**
 * One fighter as the arena draws it: the element's body sprite with the real rig standing on it.
 * Guise needs two of them — the shrunken, ghosted real one and the full-size clone.
 */
function figure(
  ctx: PreviewCtx, read: () => { x: number; y: number; alpha: number; size: number }, facing: () => number,
): IllusionAvatar {
  const body = ctx.scene.textures.exists('elem-illusion')
    ? ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-illusion').setDepth(5))
    : null;
  const av = ctx.capture(() => new IllusionAvatar(ctx.scene, ctx.tint));
  // The avatar is not a GameObject itself — hand its layers to the box, as useAvatar does.
  ctx.capture(() => av.captureInto((o) => ctx.adopt(o)));
  ctx.onFrame((dt) => {
    const s = read();
    body?.setPosition(s.x, s.y).setAlpha(s.alpha).setScale(s.size);
    av.setRigScale(s.size);
    av.setFacing(facing());
    av.update(dt, s.x, s.y, s.alpha);
  });
  return av;
}

/**
 * The staging both Guise loops share: the illusionist shrinks and ghosts, a clone walks off on a
 * looping path, and a dummy fires 20s at the clone, which stops every one and banks it.
 */
function guiseStage(ctx: PreviewCtx, retrick: boolean): void {
  const fx = ctx.capture(() => new IllusionFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const foe = { x: ctx.w * 0.84, y: ctx.cy - 10 };
  dummyAt(ctx, foe);

  const real = { x: ctx.w * 0.22, y: ctx.cy + 20, alpha: 1, size: 1 };
  const clone = { x: real.x, y: real.y, alpha: 0, size: 1 };
  let guised = false;
  let stored = 0;
  let t = 0;
  figure(ctx, () => real, () => Math.atan2(foe.y - real.y, foe.x - real.x));
  figure(ctx, () => clone, () => Math.atan2(foe.y - clone.y, foe.x - clone.x));

  const bank = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 12, '', {
    fontSize: '12px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(ILL.violet), stroke: '#08060f', strokeThickness: 3,
  }).setOrigin(0.5, 0).setDepth(20));

  // Enemy bolts, aimed at the clone because the clone is all there is to aim at.
  const bolts: Array<{ x: number; y: number; vx: number; vy: number }> = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));

  ctx.at(500, () => {
    guised = true;
    stored = 0;
    clone.alpha = 1;
    real.alpha = GUISE_SELF_ALPHA;
    real.size = GUISE_SIZE;
    fx.ring(real.x, real.y, 8, 46, ILL.violet, 360);
    fx.shards(real.x, real.y, 6, 26, ILL.magenta, 360, 6);
    tick(ctx, real.x, real.y - 44, '🎭 GUISE', ILL.magenta);
  });
  for (let i = 0; i < 4; i++) {
    ctx.at(900 + i * 520, () => {
      if (!guised) return;
      const ang = Math.atan2(clone.y - foe.y, clone.x - foe.x);
      bolts.push({ x: foe.x, y: foe.y, vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520 });
    });
  }

  const end = (swap: boolean): void => {
    if (!guised) return;
    guised = false;
    const pay = Math.round(stored * GUISE_PAYOUT);
    if (swap) {
      // Re-Trick: arrive in the clone's place. Nothing marks it but your own blink-in.
      fx.blinkIn(clone.x, clone.y, ILL.magenta);
      real.x = clone.x;
      real.y = clone.y;
      tick(ctx, real.x, real.y - 44, '🃏 RE-TRICK · +25%', ILL.crimson);
    } else {
      fx.shards(clone.x, clone.y, 10, 34, ILL.violet, 460, 8);
      fx.blinkOut(clone.x, clone.y, ILL.violet);
    }
    fx.crackBeam(clone.x, clone.y, foe.x, foe.y, ILL.violet);
    tick(ctx, foe.x, foe.y - 34, `${pay}`, ILL.violet);
    clone.alpha = 0;
    real.alpha = 1;
    real.size = 1;
  };
  ctx.at(retrick ? 2900 : 3500, () => end(retrick));
  if (retrick) {
    // The 25% on the next few bullets out of the clone's old spot.
    for (let i = 0; i < 3; i++) {
      ctx.at(3500 + i * 600, () => {
        ctx.fly({
          texture: 'proj-illusion-crack', from: { x: real.x + 20, y: real.y }, to: foe, speed: SHOT_SPEED,
          onHit: () => tick(ctx, foe.x, foe.y - 34, '25', ILL.spark),
        });
      });
    }
  }

  ctx.onFrame((dt) => {
    const sec = dt / 1000;
    t += sec;
    if (guised) {
      // The clone walks a slow figure-eight, the way a player's cursor wanders.
      clone.x += (ctx.w * 0.48 + Math.sin(t * 1.4) * 70 - clone.x) * Math.min(1, sec * 3);
      clone.y += (ctx.cy + Math.sin(t * 2.8) * 40 - clone.y) * Math.min(1, sec * 3);
      // The real one slips off the other way, quick and small.
      real.y += (ctx.cy + 70 - real.y) * Math.min(1, sec * 2);
    } else {
      clone.x = real.x;
      clone.y = real.y;
    }
    g.clear();
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.x += b.vx * sec;
      b.y += b.vy * sec;
      g.fillStyle(0xff9a3c, 1);
      g.fillCircle(b.x, b.y, 5);
      g.fillStyle(0xffe2a8, 1);
      g.fillCircle(b.x, b.y, 2.4);
      const hit = guised && Phaser.Math.Distance.Between(b.x, b.y, clone.x, clone.y) < 22;
      if (hit) {
        stored += 20;
        fx.shards(b.x, b.y, 4, 16, ILL.violet, 300, 6);
        tick(ctx, clone.x, clone.y - 34, 'BANKED 20', ILL.violet);
      }
      if (hit || b.x < -20 || b.x > ctx.w + 20) bolts.splice(i, 1);
    }
    bank.setText(guised ? `🎭  clone has banked ${stored}` : '');
  });
}

export const guise: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  bodyTexture: '',
  caption: 'F — 80% smaller, 35% faster and invisible for 3s. The clone takes the fire, and pays back 20% of it when it fades',
  run(ctx) { guiseStage(ctx, false); },
};

export const guiseUpgraded: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Re-Trick — press F again to swap into the clone. +25% damage for 10s, and nothing on their screen shows the swap',
  run(ctx) { guiseStage(ctx, true); },
};

export const dance: PreviewScript = {
  duration: 9600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Q — 20s phased against projectiles, and a corner hop every 3s whether you want one',
  run(ctx) {
    const corners = cornerSet(ctx);
    const here = { x: ctx.w * 0.5, y: ctx.h * 0.55, alpha: 1 };
    const { fx, av } = drivenCaster(ctx, () => here);
    const iav = av instanceof IllusionAvatar ? av : null;
    const foe = { x: ctx.w * 0.5, y: ctx.h * 0.12 };
    dummyAt(ctx, foe);

    ctx.at(200, () => {
      av.play('raise');
      iav?.setEchoes(6);
      iav?.setScattered(true);
      fx.ring(here.x, here.y, 14, 130, ILL.violet, 620);
      fx.ring(here.x, here.y, 14, 168, ILL.magenta, 760);
      tick(ctx, here.x, here.y - 50, '🎭 ILLUSION DANCE', ILL.magenta);
    });

    // The hops: on a timer, unannounced, and never the corner already nearest.
    let seq = 1;
    for (const at of [3200, 6200, 9200]) {
      ctx.at(at, () => {
        const skip = nearestIndex(corners, here);
        const to = corners.filter((_, i) => i !== skip)[seq++ % 3];
        fx.blinkOut(here.x, here.y, ILL.violet);
        here.x = to.x;
        here.y = to.y;
        fx.blinkIn(to.x, to.y, ILL.magenta);
        av.play('dash');
      });
    }

    // Bullets aimed at the dancer, passing through a body that is no longer solid enough
    // for a projectile to notice.
    for (let i = 0; i < 9; i++) {
      ctx.at(900 + i * 900, () => {
        const ang = Math.atan2(here.y - foe.y, here.x - foe.x);
        const from = { x: foe.x + Math.cos(ang) * 24, y: foe.y + Math.sin(ang) * 24 };
        const hit = { x: here.x, y: here.y };
        ctx.fly({
          texture: 'proj-illusion-crack', from, to: hit, speed: SHOT_SPEED, pierce: true,
          onHit: () => {
            fx.shards(hit.x, hit.y, 4, 18, ILL.ghost, 320, 7);
            tick(ctx, hit.x, hit.y - 34, 'PHASED', ILL.ghost);
          },
        });
      });
    }
  },
};

export const danceUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Blade Dance — land a clean hop and arrive throwing 10 daggers for 15, each one a one-way ticket',
  run(ctx) {
    const corners = cornerSet(ctx);
    const here = { x: ctx.w * 0.28, y: ctx.h * 0.62, alpha: 1 };
    const { fx, av } = drivenCaster(ctx, () => here);
    const iav = av instanceof IllusionAvatar ? av : null;
    const foe = { x: ctx.w * 0.66, y: ctx.h * 0.3 };
    dummyAt(ctx, foe);

    ctx.at(200, () => { iav?.setEchoes(6); iav?.setScattered(true); });

    interface Blade { x: number; y: number; vx: number; vy: number; ang: number; dead: boolean }
    const blades: Blade[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    ctx.onFrame((dt) => {
      const s = dt / 1000;
      g.clear();
      for (const b of blades) {
        if (b.dead) continue;
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) <= 26) {
          b.dead = true;
          fx.stab(foe.x, foe.y, b.ang);
          tick(ctx, foe.x, foe.y - 30, '15', ILL.violet);
          // Reflected through the middle of the arena — the thrower's position, mirrored.
          const to = { x: ctx.w - here.x, y: ctx.h - here.y };
          fx.blinkOut(foe.x, foe.y, ILL.crimson);
          foe.x = to.x;
          foe.y = to.y;
          fx.blinkIn(to.x, to.y, ILL.violet);
          tick(ctx, to.x, to.y - 40, '🗡️ CAST ACROSS', ILL.violet);
          continue;
        }
        if (b.x < 0 || b.x > ctx.w || b.y < 0 || b.y > ctx.h) { b.dead = true; continue; }
        for (let i = 2; i >= 1; i--) {
          illusionDagger(g, ctx.tint, b.x - Math.cos(b.ang) * i * 9, b.y - Math.sin(b.ang) * i * 9,
            b.ang, BLADE_SIZE * (1 - i * 0.16), 0.2 / i);
        }
        illusionDagger(g, ctx.tint, b.x, b.y, b.ang, BLADE_SIZE, 1);
      }
    });

    const hop = (to: Mark, clean: boolean): void => {
      fx.blinkOut(here.x, here.y, ILL.violet);
      here.x = to.x;
      here.y = to.y;
      fx.blinkIn(to.x, to.y, ILL.magenta);
      av.play('dash');
      if (!clean) { tick(ctx, to.x, to.y - 44, '✗ WAS HIT — NO FAN', ILL.ghost); return; }
      const base = Math.atan2(foe.y - to.y, foe.x - to.x);
      for (let i = 0; i < BLADE_COUNT; i++) {
        const ang = base + (i / (BLADE_COUNT - 1) - 0.5) * BLADE_SPREAD;
        blades.push({
          x: to.x + Math.cos(ang) * 24, y: to.y + Math.sin(ang) * 24,
          vx: Math.cos(ang) * BLADE_SPEED, vy: Math.sin(ang) * BLADE_SPEED, ang, dead: false,
        });
      }
      av.play('sweep', base);
      fx.ring(to.x, to.y, 10, 62, ILL.magenta, 380);
      tick(ctx, to.x, to.y - 50, '🗡️ BLADE DANCE', ILL.violet);
    };

    ctx.at(1200, () => hop(corners[1], true));
    // Between hops, something lands — so the next teleport pays nothing.
    ctx.at(3400, () => {
      fx.shards(here.x, here.y, 6, 26, ILL.crimson, 380, 10);
      tick(ctx, here.x, here.y - 32, 'HIT', ILL.crimson);
    });
    ctx.at(4400, () => hop(corners[2], false));
    ctx.at(7000, () => hop(corners[3], true));
  },
};

// ── Mastery ───────────────────────────────────────────────────────────

const GATE_HALF_W = 40;
const GATE_HALF_H = 30;
const GATE_R = 34;

/** The four doorways, scaled onto the preview box's own walls rather than the arena's. */
function gateSet(ctx: PreviewCtx): Array<{ x: number; y: number; inward: number }> {
  const inset = 40;
  return [
    { x: ctx.w / 2, y: inset, inward: Math.PI / 2 },
    { x: ctx.w / 2, y: ctx.h - inset, inward: -Math.PI / 2 },
    { x: inset, y: ctx.h / 2, inward: 0 },
    { x: ctx.w - inset, y: ctx.h / 2, inward: Math.PI },
  ];
}

export const masteryRealityShift: PreviewScript = {
  duration: 8600,
  scale: 0.86,
  bodyTexture: '',
  caption: 'Four doors on the walls — walk into one, come out of another, and mid-Dance arrive throwing',
  run(ctx) {
    const gates = gateSet(ctx);
    const here = { x: ctx.w * 0.5, y: ctx.h * 0.5, alpha: 1 };
    const { fx, av } = drivenCaster(ctx, () => here);
    const iav = av instanceof IllusionAvatar ? av : null;
    const foe = { x: ctx.w * 0.72, y: ctx.h * 0.7 };
    dummyAt(ctx, foe);

    // The arches, brightening as the illusionist closes on them — the same charge the kit
    // feeds `gateway`, so the "this is about to take you" read is identical in both places.
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      gates.forEach((gate, i) => {
        const d = Phaser.Math.Distance.Between(here.x, here.y, gate.x, gate.y);
        const charge = Phaser.Math.Clamp(1 - (d - GATE_R) / 110, 0, 1);
        gateway(g, ctx.tint, gate.x, gate.y, gate.inward, GATE_HALF_W, GATE_HALF_H,
          elapsed / 1000, 0.95, charge, 31 + i * 17);
      });
    });

    // The knives a mid-Dance trip throws, run on the same little integrator the Q+ loop uses.
    interface Blade { x: number; y: number; vx: number; vy: number; ang: number; dead: boolean }
    const blades: Blade[] = [];
    const bg = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    ctx.onFrame((dt) => {
      const s = dt / 1000;
      bg.clear();
      for (const b of blades) {
        if (b.dead) continue;
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) <= 26) {
          b.dead = true;
          fx.stab(foe.x, foe.y, b.ang);
          tick(ctx, foe.x, foe.y - 30, '15', ILL.violet);
          continue;
        }
        if (b.x < 0 || b.x > ctx.w || b.y < 0 || b.y > ctx.h) { b.dead = true; continue; }
        illusionDagger(bg, ctx.tint, b.x, b.y, b.ang, BLADE_SIZE, 1);
      }
    });

    /** Walk in, come out somewhere else — and throw, if the Dance is running. */
    const step = (from: number, to: number, dancing: boolean): void => {
      const gate = gates[to];
      here.x = gates[from].x;
      here.y = gates[from].y;
      fx.blinkOut(here.x, here.y, ILL.warp);
      fx.ring(here.x, here.y, 8, GATE_HALF_W + 18, ILL.cyan, 380);
      here.x = Phaser.Math.Clamp(gate.x + Math.cos(gate.inward) * 72, 30, ctx.w - 30);
      here.y = Phaser.Math.Clamp(gate.y + Math.sin(gate.inward) * 72, 30, ctx.h - 30);
      fx.blinkIn(here.x, here.y, ILL.magenta);
      fx.ring(here.x, here.y, GATE_HALF_W + 18, 10, ILL.violet, 420);
      av.play('dash');
      iav?.setScattered(true);
      tick(ctx, here.x, here.y - 44, '🚪 REALITY SHIFT', ILL.warp);
      if (!dancing) return;
      const base = Math.atan2(foe.y - here.y, foe.x - here.x);
      for (let i = 0; i < BLADE_COUNT; i++) {
        const ang = base + (i / (BLADE_COUNT - 1) - 0.5) * BLADE_SPREAD;
        blades.push({
          x: here.x + Math.cos(ang) * 24, y: here.y + Math.sin(ang) * 24,
          vx: Math.cos(ang) * BLADE_SPEED, vy: Math.sin(ang) * BLADE_SPEED, ang, dead: false,
        });
      }
      av.play('sweep', base);
      fx.ring(here.x, here.y, 10, 62, ILL.magenta, 380);
      tick(ctx, here.x, here.y - 66, '🗡️ + AN EXTRA ROUND', ILL.violet);
    };

    ctx.at(900, () => step(2, 3, false));
    ctx.at(2600, () => step(3, 0, false));
    // …and then the ultimate goes on, and every door becomes a knife rack.
    ctx.at(4200, () => {
      iav?.setEchoes(6);
      iav?.setScattered(true);
      fx.ring(here.x, here.y, 14, 130, ILL.violet, 620);
      tick(ctx, here.x, here.y - 50, '🎭 ILLUSION DANCE', ILL.magenta);
    });
    ctx.at(5400, () => step(0, 1, true));
    ctx.at(7200, () => step(1, 2, true));
  },
};

export const masteryMasquerade: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: '×1.5 damage they cannot see — the numbers still read 20 while they take 30, until somebody clicks it off',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const iav = av instanceof IllusionAvatar ? av : null;
    const foe = { x: ctx.w * 0.72, y: ctx.cy };
    dummyAt(ctx, foe);

    let masked = false;
    const shoot = (): void => {
      const muzzle = { x: ctx.cx + 26, y: ctx.cy };
      av.play('punch', ctx.aim);
      fx.shards(muzzle.x, muzzle.y, 3, 16, ILL.crimson, 260, 6);
      ctx.fly({
        texture: 'proj-illusion-crack', from: muzzle, to: foe, speed: SHOT_SPEED,
        onHit: () => {
          fx.shards(foe.x, foe.y, 5, 22, ILL.crimson, 380, 9);
          // The number they are shown never changes. What is actually coming off the bar,
          // shown here in gold beside it, is the only thing the mask moves.
          tick(ctx, foe.x, foe.y - 28, '20', ILL.crimson);
          if (masked) tick(ctx, foe.x + 46, foe.y - 46, 'really 30', 0xffc94a);
        },
      });
    };

    ctx.at(500, () => shoot());
    ctx.at(1900, () => {
      masked = true;
      iav?.setMasquerade(true);
      fx.ring(ctx.cx, ctx.cy, 10, 48, 0xffc94a, 380);
      tick(ctx, ctx.cx, ctx.cy - 52, '🎭 MASQUERADE', 0xffc94a);
      ctx.at(500, () => tick(ctx, ctx.cx, ctx.cy - 70, 'they see none of this', ILL.ghost));
    });
    ctx.at(3200, () => shoot());
    ctx.at(4600, () => shoot());
    // And then they reach for the face, and find out the hard way that it was there.
    ctx.at(6200, () => {
      fx.grab(ctx.cx, ctx.cy);
      ctx.at(320, () => {
        masked = false;
        iav?.setMasquerade(false);
        fx.maskBreak(ctx.cx, ctx.cy - 4);
        tick(ctx, ctx.cx, ctx.cy - 52, '🎭 UNMASKED', 0xffc94a);
      });
    });
    ctx.at(7800, () => shoot());
  },
};

// ── Passives ──────────────────────────────────────────────────────────

export const neverQuiteThere: PreviewScript = {
  duration: 7200,
  caption: 'Two afterimages as standard, six while the Dance runs — spread wide whenever anything is happening',
  run(ctx) {
    const { av } = stage(ctx, { noDummy: true });
    const iav = av instanceof IllusionAvatar ? av : null;
    ctx.at(600, () => { iav?.setScattered(true); av.play('sweep', ctx.aim); });
    ctx.at(2200, () => iav?.setScattered(false));
    ctx.at(3400, () => { iav?.setEchoes(6); iav?.setScattered(true); av.play('raise'); });
    ctx.at(5800, () => { iav?.setEchoes(2); iav?.setScattered(false); });
  },
};

export const theClone: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Full size, its own rig, a live health bar — and it cannot die. It only remembers',
  run(ctx) { guiseStage(ctx, false); },
};
