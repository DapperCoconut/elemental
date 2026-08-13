import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  ILL, IllusionAvatar, IllusionFx, ShapeKind,
  fracture, gateway, harlequinMask, illusionDagger, phantomFigure, shapeBody, tesseract,
  warpPane, weakCone,
} from '../../../elements/kits/IllusionVisuals';

/**
 * Illusion's showcases.
 *
 * The element throws exactly one sprite — `proj-illusion-crack` — and paints everything else
 * per frame out of `IllusionVisuals`: the pane, the cube, the fold, the understudy, the seam
 * and the daggers are all repainted Graphics with no world object behind them. So these loops
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
const TESS_SPEED = 430;
const TESS_SIZE = 21;
const SHAPE_SIZE_MULT = 1.3;
const BOGGLE_HALF = Math.PI / 12;
const BOGGLE_REACH = 52;
const BOGGLE_SPIN = 0.85;
const BLADE_COUNT = 10;
const BLADE_SPEED = 660;
const BLADE_SPREAD = Math.PI / 3;
const BLADE_SIZE = 13;
const PHANTOM_FUSE_MS = 1000;
const PHANTOM_RADIUS = 100;

const SHAPE_KINDS: ShapeKind[] = ['square', 'star', 'rhombus'];

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

// ── F — Tesseract ─────────────────────────────────────────────────────

/** A folded body, painted exactly as `paintAir` paints one: shape, seam, mask. */
function foldedBody(
  ctx: PreviewCtx, at: Mark, read: () => { kind: ShapeKind; spin: number; alpha: number },
  weak?: () => number | null,
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const s = read();
    if (s.alpha <= 0.02) return;
    shapeBody(g, ctx.tint, s.kind, at.x, at.y, 27 * SHAPE_SIZE_MULT, s.spin, s.alpha * 0.85);
    const a = s.spin * 2.2;
    fracture(g, ctx.tint, at.x + Math.cos(a) * 30, at.y + Math.sin(a) * 30,
      at.x - Math.cos(a) * 30, at.y - Math.sin(a) * 30, 1.4, ILL.cyan, s.alpha * 0.4,
      s.spin * 10, 1.2);
    harlequinMask(g, ctx.tint, at.x, at.y - 2, 7, s.alpha * 0.55, ILL.cyan);
    const w = weak?.();
    if (w !== null && w !== undefined) {
      weakCone(g, ctx.tint, at.x, at.y, w, BOGGLE_HALF, BOGGLE_REACH, s.alpha, elapsed / 1000);
    }
  });
}

/** The cube in flight, wake and all — the one thing in the game only its thrower can see. */
function flyCube(ctx: PreviewCtx, from: Mark, ang: number, until: () => boolean): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const p = { x: from.x, y: from.y };
  let spin = 0;
  ctx.onFrame((dt) => {
    g.clear();
    if (until()) return;
    const s = dt / 1000;
    p.x += Math.cos(ang) * TESS_SPEED * s;
    p.y += Math.sin(ang) * TESS_SPEED * s;
    spin += s * 3.4;
    for (let i = 2; i >= 1; i--) {
      tesseract(g, ctx.tint, p.x - Math.cos(ang) * i * 11, p.y - Math.sin(ang) * i * 11,
        TESS_SIZE * (1 - i * 0.14), spin - i * 0.5, 0.24 / i);
    }
    tesseract(g, ctx.tint, p.x, p.y, TESS_SIZE, spin, 1);
  });
}

export const tesseract4d: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'F — 430 px/s, 20 on impact, then 8s folded at ×1.3 size. Only you ever see the cube',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const foe = { x: ctx.tx, y: ctx.ty };
    let folded = false;
    dummyAt(ctx, foe, { alpha: () => (folded ? 0 : 1) });

    const muzzle = { x: ctx.cx + 26, y: ctx.cy };
    const flightMs = (Phaser.Math.Distance.Between(muzzle.x, muzzle.y, foe.x, foe.y) / TESS_SPEED) * 1000;
    let landed = false;
    ctx.at(400, () => {
      fx.ring(ctx.cx, ctx.cy, 10, 54, ILL.cyan, 380);
      tick(ctx, ctx.cx, ctx.cy - 46, '⬛ TESSERACT', ILL.cyan);
      flyCube(ctx, muzzle, ctx.aim, () => landed);
    });

    const fold = { kind: SHAPE_KINDS[0], spin: 0.4, alpha: 0 };
    ctx.onFrame((dt) => { if (folded) fold.spin += (dt / 1000) * 1.3; });
    foldedBody(ctx, foe, () => fold);

    ctx.at(400 + flightMs, () => {
      landed = true;
      folded = true;
      fold.alpha = 1;
      fx.fold(foe.x, foe.y, ILL.cyan);
      tick(ctx, foe.x, foe.y - 34, '20', ILL.crimson);
      ctx.at(420, () => tick(ctx, foe.x, foe.y - 44, '⬛ SQUARE · ×1.3', ILL.cyan));
    });
  },
};

export const tesseractUpgraded: PreviewScript = {
  duration: 8400,
  scale: 0.9,
  caption: 'Mind-Boggle — a 30° seam turning at 0.85 rad/s. Stand in it and everything you land is ×1.5',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const foe = { x: ctx.tx, y: ctx.ty };
    let folded = false;
    dummyAt(ctx, foe, { alpha: () => (folded ? 0 : 1) });

    const fold = { kind: SHAPE_KINDS[1], spin: 0.2, alpha: 0 };
    // The seam turns on its own clock, slower than the shape it is cut into.
    let weakAng = Math.PI * 0.75;
    ctx.onFrame((dt) => {
      if (!folded) return;
      fold.spin += (dt / 1000) * 1.3;
      weakAng += (dt / 1000) * BOGGLE_SPIN;
    });
    foldedBody(ctx, foe, () => fold, () => (folded ? weakAng : null));

    ctx.at(300, () => {
      folded = true;
      fold.alpha = 1;
      fx.fold(foe.x, foe.y, ILL.cyan);
      tick(ctx, foe.x, foe.y - 40, '🎯 MIND-BOGGLE', ILL.crimson);
    });

    // The test is the angle from the folded body to the attacker, at the moment damage lands.
    const muzzle = { x: ctx.cx + 26, y: ctx.cy };
    for (let i = 0; i < 6; i++) {
      ctx.at(1300 + i * 1150, () => {
        av.play('punch', ctx.aim);
        ctx.fly({
          texture: 'proj-illusion-crack', from: muzzle, to: foe, speed: SHOT_SPEED,
          onHit: () => {
            const toSrc = Math.atan2(ctx.cy - foe.y, ctx.cx - foe.x);
            const inside = Math.abs(Phaser.Math.Angle.Wrap(toSrc - weakAng)) <= BOGGLE_HALF;
            fx.shards(foe.x, foe.y, 5, 22, ILL.crimson, 380, 10);
            tick(ctx, foe.x, foe.y - 34, inside ? '30  ×1.5' : '20', inside ? ILL.spark : ILL.crimson);
          },
        });
      });
    }
  },
};

// ── Q — Illusion Dance ────────────────────────────────────────────────

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

export const folded: PreviewScript = {
  duration: 7200,
  scale: 0.95,
  caption: 'Square, star or rhombus — one of the three at random, ×1.3 size and hitbox, for 8s',
  run(ctx) {
    const fx = ctx.capture(() => new IllusionFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const foe = { x: ctx.w * 0.62, y: ctx.cy };
    let folded2 = false;
    dummyAt(ctx, foe, { alpha: () => (folded2 ? 0 : 1) });
    // The body they had before, held at its real size beside the fold, so "30% more to hit"
    // is something the eye can check rather than a number to take on trust.
    const ghost = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame(() => {
      ghost.clear();
      if (!folded2) return;
      ghost.lineStyle(1.2, ctx.tint(ILL.ghost), 0.4);
      ghost.strokeCircle(foe.x, foe.y, 27);
    });

    const fold = { kind: SHAPE_KINDS[0], spin: 0.3, alpha: 0 };
    ctx.onFrame((dt) => { if (folded2) fold.spin += (dt / 1000) * 1.3; });
    foldedBody(ctx, foe, () => fold);

    for (let i = 0; i < 3; i++) {
      ctx.at(400 + i * 2200, () => {
        folded2 = true;
        fold.kind = SHAPE_KINDS[i];
        fold.alpha = 1;
        fx.fold(foe.x, foe.y, ILL.cyan);
        tick(ctx, foe.x, foe.y - 46, `⬛ ${SHAPE_KINDS[i].toUpperCase()}`, ILL.cyan);
      });
    }
  },
};
