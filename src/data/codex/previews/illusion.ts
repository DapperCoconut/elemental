import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  ILL, IllusionAvatar, IllusionFx,
  illusionBomb, phantomFigure, spentTint, warpPane,
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
const VEIL_DEFLECT = Math.PI / 18;
const DECOY_FAN: Array<{ deg: number; speed: number }> = [
  { deg: -22, speed: 1 }, { deg: -11, speed: 0.94 }, { deg: 11, speed: 0.94 }, { deg: 22, speed: 1 },
  { deg: 0, speed: 0.8 },
];
const DUP_OFFSET = 9;
const VEIL_STANDOFF = 78;
const GUISE_SIZE = 0.2;
const GUISE_SELF_ALPHA = 0.38;
const GUISE_PAYOUT = 0.2;
const BOMB_COUNT = 12;
const BOMB_SPREAD = Math.PI / 3;
const BOMB_TURN_MAX = 4.6;
const BOMB_HOMING = 1.1;
const BOMB_TRIGGER_R = 44;
const BOMB_AOE_R = 105;
const BOMB_SIZE = 9;
const BOMB_DAMAGE = 14;
const SHIFT_DAMAGE = 50;
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

/** Run `fn` once, `ms` from now — `ctx.at` only takes times measured from the loop's start. */
function later(ctx: PreviewCtx, ms: number, fn: () => void): void {
  let left = ms;
  let done = false;
  ctx.onFrame((dt) => {
    if (done) return;
    left -= dt;
    if (left > 0) return;
    done = true;
    fn();
  });
}

/**
 * Illusion bullets, on a little integrator of their own: the same dart as the real thing,
 * flown in a straight line until they fade at the box edge — or until `pop` cracks one.
 */
function decoyField(ctx: PreviewCtx, fx: IllusionFx, foe: Mark): {
  fan: (at: Mark, heading: number) => void;
  /** Where decoy `i` of the most recent fan will be `ms` from now. */
  predict: (i: number, ms: number) => Mark | null;
  pop: (i: number) => void;
} {
  interface D { x: number; y: number; vx: number; vy: number; img: Phaser.GameObjects.Image; dead: boolean }
  let last: D[] = [];
  const all: D[] = [];
  ctx.onFrame((dt) => {
    const s = dt / 1000;
    for (const d of all) {
      if (d.dead) continue;
      d.x += d.vx * s;
      d.y += d.vy * s;
      if (d.x < 6 || d.x > ctx.w - 6 || d.y < 6 || d.y > ctx.h - 6) {
        d.dead = true;
        d.img.setVisible(false);
        fx.shards(d.x, d.y, 4, 14, ILL.ghost, 280, 6);
        continue;
      }
      d.img.setPosition(d.x, d.y);
    }
  });
  return {
    fan(at, heading) {
      last = DECOY_FAN.map((f) => {
        const ang = heading + Phaser.Math.DegToRad(f.deg);
        const img = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'proj-illusion-crack')
          .setRotation(ang).setDepth(7).setAlpha(0.9));
        const d: D = {
          x: at.x, y: at.y, vx: Math.cos(ang) * SHOT_SPEED * f.speed, vy: Math.sin(ang) * SHOT_SPEED * f.speed,
          img, dead: false,
        };
        all.push(d);
        return d;
      });
      fx.split(at.x, at.y, heading, Phaser.Math.DegToRad(22), ILL.crimson);
      tick(ctx, at.x, at.y - 34, '×5 ILLUSIONS', ILL.warp);
    },
    predict(i, ms) {
      const d = last[i];
      if (!d) return null;
      return { x: d.x + d.vx * ms / 1000, y: d.y + d.vy * ms / 1000 };
    },
    pop(i) {
      const d = last[i];
      if (!d || d.dead) return;
      d.dead = true;
      d.img.setVisible(false);
      fx.wallCrack(d.x, d.y, Math.atan2(d.vy, d.vx) + Math.PI, ILL.crimson);
      fx.crackBeam(d.x, d.y, foe.x, foe.y, ILL.crimson);
      tick(ctx, foe.x, foe.y - 26, '10', ILL.crimson);
    },
  };
}

export const veil: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'E — their shots leave 10° off; yours pass straight with five illusions that crack for 10 if hit',
  run(ctx) {
    const home = { x: ctx.w * 0.2, y: ctx.h * 0.5, alpha: 1 };
    const { fx, av } = drivenCaster(ctx, () => home);
    const foe = { x: ctx.w * 0.86, y: ctx.h * 0.5 };
    dummyAt(ctx, foe);
    const decoys = decoyField(ctx, fx, foe);

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
    // Yours: straight through, and five more come out with it.
    ctx.at(1100, () => {
      av.play('punch', ctx.aim);
      ctx.fly({
        texture: 'proj-illusion-crack', from: muzzle, to: { x: at.x, y: at.y }, speed: SHOT_SPEED,
        onHit: () => {
          decoys.fan(at, ctx.aim);
          ctx.fly({
            texture: 'proj-illusion-crack', from: { x: at.x, y: at.y }, to: { x: foe.x - 14, y: foe.y },
            speed: SHOT_SPEED, onHit: () => tick(ctx, foe.x, foe.y - 40, '20', ILL.crimson),
          });
          // …and the dummy shoots at the wrong one. Its bullet stops on the illusion, and the
          // illusion cracks back at it.
          const hitIn = 260;
          const p = decoys.predict(3, hitIn);
          if (!p) return;
          const from = { x: foe.x - 24, y: foe.y + 10 };
          const travel = Phaser.Math.Distance.Between(from.x, from.y, p.x, p.y) / SHOT_SPEED * 1000;
          const wait = Math.max(0, hitIn - travel);
          later(ctx, wait, () => ctx.fly({
            texture: 'proj-illusion-crack', from, to: p, speed: SHOT_SPEED,
            onHit: () => decoys.pop(3),
          }));
        },
      });
    });
    // Theirs, crossing the pane, come out crooked.
    ctx.at(3300, () => {
      throughPane(ctx, fx, { x: foe.x - 26, y: foe.y }, { x: at.x, y: at.y }, Math.PI, VEIL_DEFLECT);
    });
    ctx.at(4600, () => {
      throughPane(ctx, fx, { x: foe.x - 26, y: foe.y }, { x: at.x, y: at.y }, Math.PI, -VEIL_DEFLECT);
    });

    ctx.at(6300, () => fx.ring(at.x, at.y, VEIL_HALF_LEN, 14, ILL.warp, 320));
  },
};

export const veilUpgraded: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Duplication — walk through your own pane: it greys out, and every Crack Shot fires two for 3s',
  run(ctx) {
    const home = { x: ctx.w * 0.14, y: ctx.h * 0.5, alpha: 1 };
    const { fx, av } = drivenCaster(ctx, () => home);
    const foe = { x: ctx.w * 0.86, y: ctx.h * 0.5 };
    dummyAt(ctx, foe);

    const at = { x: home.x + VEIL_STANDOFF, y: home.y };
    let spent = false;
    ctx.at(200, () => {
      av.play('sweep', ctx.aim);
      fx.ring(at.x, at.y, 12, VEIL_HALF_LEN, ILL.warp, 420);
    });
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (elapsed < 200) return;
      const tint = spent ? spentTint(ctx.tint) : ctx.tint;
      warpPane(g, tint, at.x, at.y, ctx.aim + Math.PI / 2, VEIL_HALF_LEN, VEIL_HALF_THICK,
        elapsed / 1000, spent ? 0.8 : 1, 137);
    });

    // Walk through it.
    const startX = home.x;
    const endX = at.x + 70;
    ctx.onFrame((_dt, elapsed) => {
      const t = Phaser.Math.Clamp((elapsed - 900) / 900, 0, 1);
      home.x = startX + (endX - startX) * t;
      if (!spent && Math.abs(home.x - at.x) <= VEIL_HALF_THICK + 16) {
        spent = true;
        fx.ring(home.x, home.y, 8, 44, ILL.spark, 340);
        fx.shards(at.x, at.y, 8, VEIL_HALF_LEN * 0.6, ILL.ghost, 420, 6);
        tick(ctx, home.x, home.y - 50, '✂️ DUPLICATION', ILL.spark);
      }
    });

    const pair = (): void => {
      av.play('punch', ctx.aim);
      const mx = home.x + 26;
      for (const side of [1, -1]) {
        ctx.fly({
          texture: 'proj-illusion-crack', from: { x: mx, y: home.y + DUP_OFFSET * side },
          to: { x: foe.x - 12, y: foe.y + DUP_OFFSET * side }, speed: SHOT_SPEED,
          onHit: () => tick(ctx, foe.x + side * 10, foe.y - 36 - (side > 0 ? 0 : 14), '20', ILL.crimson),
        });
      }
      fx.split(mx, home.y, ctx.aim, 0.18, ILL.spark);
    };
    ctx.at(2300, pair);
    ctx.at(3300, pair);
    ctx.at(4300, pair);
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

/**
 * Bomb Dance bombs on the preview box, flown with the kit's own wander: a re-rolled turn rate
 * plus a gentle pull at the dummy, bouncing off the box walls, going off within 44px.
 */
function bombField(ctx: PreviewCtx, fx: IllusionFx, foe: Mark): (from: Mark, count: number) => void {
  interface B { x: number; y: number; h: number; sp: number; turn: number; next: number; dies: number; seed: number }
  const bombs: B[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
  let clock = 0;
  let turnedUntil = 0;
  ctx.onFrame((dt) => {
    const s = dt / 1000;
    clock += dt;
    g.clear();
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i];
      if (clock >= b.next) { b.turn = (Math.random() * 2 - 1) * BOMB_TURN_MAX; b.next = clock + 250 + Math.random() * 550; }
      const want = Math.atan2(foe.y - b.y, foe.x - b.x);
      b.h += (b.turn + Phaser.Math.Angle.Wrap(want - b.h) * BOMB_HOMING) * s;
      b.x += Math.cos(b.h) * b.sp * s;
      b.y += Math.sin(b.h) * b.sp * s;
      if (b.x < 8 || b.x > ctx.w - 8) { b.h = Math.PI - b.h; b.x = Phaser.Math.Clamp(b.x, 8, ctx.w - 8); }
      if (b.y < 8 || b.y > ctx.h - 8) { b.h = -b.h; b.y = Phaser.Math.Clamp(b.y, 8, ctx.h - 8); }
      if (Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) <= BOMB_TRIGGER_R) {
        bombs.splice(i, 1);
        fx.bombBlast(b.x, b.y, BOMB_AOE_R);
        tick(ctx, foe.x + (Math.random() - 0.5) * 24, foe.y - 30, String(BOMB_DAMAGE), ILL.magenta);
        if (clock >= turnedUntil) {
          fx.turnSwirl(foe.x, foe.y);
          tick(ctx, foe.x, foe.y - 52, '🌀 TURNED AROUND', ILL.magenta);
        }
        turnedUntil = clock + 2600;
        continue;
      }
      if (clock >= b.dies) { fx.shards(b.x, b.y, 5, 20, ILL.violet, 320, 8); bombs.splice(i, 1); continue; }
      const life = Phaser.Math.Clamp((b.dies - clock) / 4200, 0, 1);
      illusionBomb(g, ctx.tint, b.x, b.y, BOMB_SIZE, b.h + clock / 333, clock / 1000, life, 1, b.seed);
    }
  });
  return (from, count) => {
    const base = Math.atan2(foe.y - from.y, foe.x - from.x);
    for (let i = 0; i < count; i++) {
      const h = base + (Math.random() * 2 - 1) * BOMB_SPREAD;
      bombs.push({
        x: from.x + Math.cos(h) * 20, y: from.y + Math.sin(h) * 20, h,
        sp: 210 + Math.random() * 80, turn: (Math.random() * 2 - 1) * BOMB_TURN_MAX,
        next: clock + 200 + Math.random() * 500, dies: clock + 4200 * (0.85 + Math.random() * 0.3),
        seed: Math.random() * 999,
      });
    }
    fx.ring(from.x, from.y, 10, 70, ILL.magenta, 420);
  };
}

export const danceUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Bomb Dance — a clean hop, or any Relocate mid-Dance, throws 12 spiralling bombs that turn them around',
  run(ctx) {
    const corners = cornerSet(ctx);
    const here = { x: ctx.w * 0.28, y: ctx.h * 0.62, alpha: 1 };
    const { fx, av } = drivenCaster(ctx, () => here);
    const iav = av instanceof IllusionAvatar ? av : null;
    const foe = { x: ctx.w * 0.6, y: ctx.h * 0.42 };
    dummyAt(ctx, foe);
    const throwBombs = bombField(ctx, fx, foe);

    ctx.at(200, () => { iav?.setEchoes(6); iav?.setScattered(true); });

    const hop = (to: Mark, label: string | null): void => {
      fx.blinkOut(here.x, here.y, ILL.violet);
      here.x = to.x;
      here.y = to.y;
      fx.blinkIn(to.x, to.y, ILL.magenta);
      av.play('dash');
      if (!label) { tick(ctx, to.x, to.y - 44, '✗ WAS HIT — NO BOMBS', ILL.ghost); return; }
      av.play('raise');
      throwBombs(to, BOMB_COUNT);
      tick(ctx, to.x, to.y - 50, label, ILL.magenta);
    };

    ctx.at(900, () => hop(corners[1], '💣 BOMB DANCE'));
    // Between hops, something lands — so the next timed hop pays nothing…
    ctx.at(3400, () => {
      fx.shards(here.x, here.y, 6, 26, ILL.crimson, 380, 10);
      tick(ctx, here.x, here.y - 32, 'HIT', ILL.crimson);
    });
    ctx.at(3900, () => hop(corners[2], null));
    // …but a Relocate pressed mid-Dance always does.
    ctx.at(5600, () => hop(corners[3], 'R → 💣 BOMB DANCE'));
  },
};

// ── Mastery ───────────────────────────────────────────────────────────

export const masteryRealityShift: PreviewScript = {
  duration: 9000,
  scale: 0.86,
  bodyTexture: '',
  caption: 'Take 50 inside 2.5s and you are thrown to a corner — and mid-Dance the shift throws bombs',
  run(ctx) {
    const corners = cornerSet(ctx);
    const here = { x: ctx.w * 0.42, y: ctx.h * 0.55, alpha: 1 };
    const { fx, av } = drivenCaster(ctx, () => here);
    const iav = av instanceof IllusionAvatar ? av : null;
    const foe = { x: ctx.w * 0.72, y: ctx.h * 0.4 };
    dummyAt(ctx, foe);
    const throwBombs = bombField(ctx, fx, foe);

    // The tally, drawn as a bar over the illusionist so the 50 is legible.
    let tally = 0;
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
    ctx.onFrame(() => {
      bar.clear();
      const w = 54;
      bar.fillStyle(ILL.voidDark, 0.7);
      bar.fillRect(here.x - w / 2, here.y + 30, w, 5);
      bar.fillStyle(ctx.tint(ILL.warp), 0.95);
      bar.fillRect(here.x - w / 2, here.y + 30, w * Math.min(1, tally / SHIFT_DAMAGE), 5);
    });

    let dancing = false;
    const shift = (): void => {
      tally = 0;
      const skip = nearestIndex(corners, here);
      const to = corners.filter((_, i) => i !== skip)[Math.floor(Math.random() * 3)];
      fx.blinkOut(here.x, here.y, ILL.violet);
      here.x = to.x;
      here.y = to.y;
      fx.blinkIn(to.x, to.y, ILL.magenta);
      fx.ring(to.x, to.y, 10, 54, ILL.warp, 420);
      av.play('dash');
      iav?.setScattered(true);
      tick(ctx, to.x, to.y - 48, '🚪 REALITY SHIFT', ILL.warp);
      if (dancing) {
        throwBombs(to, BOMB_COUNT);
        tick(ctx, to.x, to.y - 66, '💣 + A VOLLEY', ILL.magenta);
      }
    };
    const hit = (n: number): void => {
      fx.shards(here.x, here.y, 6, 24, ILL.crimson, 340, 10);
      fx.crackBeam(foe.x, foe.y, here.x, here.y, ILL.crimson);
      tick(ctx, here.x + (Math.random() - 0.5) * 20, here.y - 30, String(n), ILL.crimson);
      tally += n;
      if (tally >= SHIFT_DAMAGE) later(ctx, 80, shift);
    };

    // A beating: 18 + 16 + 20 inside a second and a half.
    ctx.at(800, () => hit(18));
    ctx.at(1300, () => hit(16));
    ctx.at(1800, () => hit(20));
    // …then the ultimate goes on, and the next beating comes with bombs.
    ctx.at(3400, () => {
      dancing = true;
      iav?.setEchoes(6);
      fx.ring(here.x, here.y, 14, 130, ILL.violet, 620);
      tick(ctx, here.x, here.y - 50, '🎭 ILLUSION DANCE', ILL.magenta);
    });
    ctx.at(4400, () => hit(25));
    ctx.at(4900, () => hit(28));
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
