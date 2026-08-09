import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  BOOK_TONE, BookId, PAP, PaperAvatar, PaperFx, arcaneSpike, burningScrap, chainRun,
  crucifixShape, flameSpirit, fortuneTeller, ghostBlade, ghostKnight, herbSeed, lightSlab,
  lotusBloom, paperPlaneShape, pinwheelShape, portalTear, shurikenShape, targetRing,
} from '../../../elements/kits/PaperVisuals';

/**
 * Paper's showcases.
 *
 * The thing that has to be legible in every one of these is **which book is open**. Two of
 * Paper's five keys are really five keys each, and the only way a player tells them apart in the
 * arena is the cover colour on the floating book and the palette of whatever comes out — so every
 * script drives `setBook` and paints in that book's own accent, exactly as the kit does.
 *
 * Paper puts no sprite in the world at all: blades, spikes, planes, shuriken, monsters, riders,
 * target rings, the spirit and its fire are every one of them Graphics repainted per frame out of
 * `PaperVisuals`, so `ctx.fly` is useless here. The one exception is the Mâché monster eating a
 * bullet — that is somebody else's projectile, and it is staged as one.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `PaperFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const BLADE_DAMAGE = 15;
const BLADE_SPEED = 620;
const BLADE_SEEK_R = 155;
const BLADE_TURN = 3.6;

const LASER_TICK_DAMAGE = 4;
const LASER_TICK_MS = 500;
const LASER_BURST_MS = 2000;
const LASER_RELOAD_MS = 1500;
const LASER_HALF_WIDTH = 16;

const SPIKE_DAMAGE = 6;
const SPIKE_SPEED = 700;
const SPIKE_STRIKES = 3;
const SPIKE_WARP_DIST = 96;
const SPIKE_WARP_MS = 280;

const SLAB_DAMAGE = 12;
const SLAB_SPEED = 520;
const SLAB_LEN = 96;
const SLAB_WIDTH = 22;
const SLAB_KNOCK = 320;
const SHOVE_MS = 280;

const SEED_COUNT = 3;
const SEED_SPEED = 620;
const SEED_SPREAD = 0.13;
const SEED_HEAL = 3;
const SEED_HEAL_BONUS = 6;
const SEED_FAR = 150;
const SEED_NEAR = 42;

const PLANE_DAMAGE = 10;
const PLANE_SPEED = 560;
const PLANE_RIDE_SPEED = 470;
const PLANE_STEER = 2.4;
const DRILL_AOE_R = 96;
const DRILL_AOE_DAMAGE = 10;

const SHURIKEN_DAMAGE = 15;
const SHURIKEN_SPEED = 640;
const SHURIKEN_R = 20;
const SHURIKEN_STUCK_GATE_MS = 1200;
const PINWHEEL_SIZE_MULT = 2;
const PINWHEEL_BONUS_MS = 2000;
const BLEED_FRACTION = 0.02;

const MACHE_COUNT = 6;
const MACHE_BITE_DAMAGE = 6;
const MACHE_CHARGE_DAMAGE = 8;
const MACHE_HUNT_DAMAGE = 4;
const MACHE_BITE_R = 26;
const MACHE_CHARGE_SPEED = 330;
const MACHE_HUNT_SPEED = 185;
const MACHE_R = 15;

const CHARGE_COUNT = 12;
const CHARGE_DAMAGE = 50;
const CHARGE_SPEED = 760;
const CHARGE_HIT_R = 40;

const BOMB_COUNT = 60;
const BOMB_DAMAGE = 25;
const BOMB_R = 46;
const BOMB_ARM_MS = 2000;
const BOMB_STAGGER_MS = 25;
const BOMB_STUN_MS = 2000;

const SPIRIT_SPEED = 330;
const SPIRIT_R = 18;
const SPIRIT_TRAIL_MS = 90;
const TRAIL_LIFE_MS = 3000;
const TRAIL_R = 28;
const TRAIL_DAMAGE = 4;

const CROSS_MS = 5000;
const LOTUS_HEAL = 100;

const TAU = Math.PI * 2;

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── Shared staging ────────────────────────────────────────────────────

interface Stage {
  fx: PaperFx;
  av: BaseAvatar;
  pav: PaperAvatar | null;
  at: Mark;
}

function stageIt(ctx: PreviewCtx, book: BookId = 0): Stage {
  const fx = ctx.capture(() => new PaperFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new PaperAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  const pav = av instanceof PaperAvatar ? av : null;
  pav?.setBook(book);
  return { fx, av, pav, at: { x: ctx.cx, y: ctx.cy } };
}

/** A caster the script positions — used by the plane ride, the drill and the charge. */
function drivenCaster(ctx: PreviewCtx, at: Mark, book: BookId = 0): Stage {
  const fx = ctx.capture(() => new PaperFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-paper')) {
    const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-paper').setDepth(5));
    ctx.onFrame(() => body.setPosition(at.x, at.y));
  }
  const av = ctx.useAvatar(() => new PaperAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  const pav = av instanceof PaperAvatar ? av : null;
  pav?.setBook(book);
  ctx.onFrame((dt) => av.update(dt, at.x, at.y, 1));
  return { fx, av, pav, at };
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#181409', strokeThickness: 3,
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

/** The open book's name, pinned where the loop can update it as the shelf turns. */
function bookBadge(ctx: PreviewCtx, read: () => BookId): void {
  const t = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 12, '', {
    fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
  }).setOrigin(0.5).setDepth(19));
  ctx.onFrame(() => {
    const tone = BOOK_TONE[read()];
    t.setText(`${tone.emoji} ${tone.name.toUpperCase()}`);
    t.setColor(hex(tone.accent));
  });
}

// ── Click — Storybook Summoning ───────────────────────────────────────

/** Excalibur: bends toward the nearest body inside 155px at a capped 3.6 rad/s. */
function excalibur(ctx: PreviewCtx, s: Stage, from: Mark, foe: Mark): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  const p = { x: from.x, y: from.y };
  // Thrown deliberately wide, so the curve is the thing you watch.
  let ang = Math.atan2(foe.y - from.y, foe.x - from.x) - 0.55;
  let done = false;
  ctx.onFrame((dt) => {
    g.clear();
    if (done) return;
    const step = dt / 1000;
    if (Phaser.Math.Distance.Between(p.x, p.y, foe.x, foe.y) <= BLADE_SEEK_R) {
      const want = Math.atan2(foe.y - p.y, foe.x - p.x);
      ang += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - ang), -BLADE_TURN * step, BLADE_TURN * step);
    }
    p.x += Math.cos(ang) * BLADE_SPEED * step;
    p.y += Math.sin(ang) * BLADE_SPEED * step;
    if (Phaser.Math.Distance.Between(p.x, p.y, foe.x, foe.y) <= 28) {
      done = true;
      s.fx.cut(foe.x, foe.y, 24, PAP.spectre);
      tick(ctx, foe.x, foe.y - 16, `${BLADE_DAMAGE}`, PAP.spectre);
      s.fx.shred(p.x, p.y, 4, 16, 320, 9, PAP.spectre);
      return;
    }
    if (p.x < -20 || p.x > ctx.w + 20 || p.y < -20 || p.y > ctx.h + 20) { done = true; return; }
    ghostBlade(g, ctx.tint, p.x, p.y, ang, 34, 1);
  });
  // The seek radius, drawn once — a preview of a homing shot should show where it starts homing.
  const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ring.lineStyle(1, ctx.tint(PAP.spectreDeep), 0.35);
  ring.strokeCircle(foe.x, foe.y, BLADE_SEEK_R);
}

/** The Alien beam: hitscan, four ticks over two seconds, then a reload you sit through. */
function alienLaser(ctx: PreviewCtx, s: Stage, from: Mark, foe: Mark, startAt: number): void {
  for (let i = 0; i < LASER_BURST_MS / LASER_TICK_MS; i++) {
    ctx.at(startAt + i * LASER_TICK_MS, () => {
      s.fx.beam(from.x, from.y, foe.x + 20, foe.y, 5, 220, 11);
      s.fx.splat(foe.x, foe.y, 16, PAP.beam);
      tick(ctx, foe.x, foe.y - 16, `${LASER_TICK_DAMAGE}`, PAP.beam);
    });
  }
  ctx.at(startAt + LASER_BURST_MS, () => {
    tick(ctx, from.x, from.y - 44, `📘 RELOADING · ${LASER_RELOAD_MS / 1000}s`, PAP.beamDeep);
  });
  // The 16px-wide lane the hitscan actually tests against.
  const lane = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  lane.fillStyle(ctx.tint(PAP.beamDeep), 0.12);
  lane.fillRect(from.x, from.y - LASER_HALF_WIDTH, ctx.w - from.x, LASER_HALF_WIDTH * 2);
}

/** The Fantasy spike: three strikes, each arriving from a fresh side through a portal. */
function fantasySpike(ctx: PreviewCtx, s: Stage, from: Mark, foe: Mark): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  const p = { x: from.x, y: from.y };
  let ang = Math.atan2(foe.y - from.y, foe.x - from.x);
  let strikes = 0;
  let armedAt = 0;
  const portal = { x: 0, y: 0, at: -9999 };
  let clock = 0;
  let done = false;
  ctx.onFrame((dt) => {
    clock += dt;
    g.clear();
    if (done) return;
    // The portal it came out of, still tearing shut behind it.
    const k = Phaser.Math.Clamp(1 - (clock - portal.at) / 420, 0, 1);
    if (k > 0) portalTear(g, ctx.tint, portal.x, portal.y, 18, k, k, { spin: clock / 300 });
    if (clock < armedAt) { arcaneSpike(g, ctx.tint, p.x, p.y, ang, 24, 0.5); return; }

    const step = dt / 1000;
    p.x += Math.cos(ang) * SPIKE_SPEED * step;
    p.y += Math.sin(ang) * SPIKE_SPEED * step;
    if (Phaser.Math.Distance.Between(p.x, p.y, foe.x, foe.y) <= 26) {
      strikes++;
      s.fx.cut(foe.x, foe.y, 22, PAP.arcane);
      tick(ctx, foe.x, foe.y - 16, `${SPIKE_DAMAGE}`, PAP.arcane);
      if (strikes >= SPIKE_STRIKES) {
        done = true;
        s.fx.shred(p.x, p.y, 6, 20, 380, 10, PAP.arcane);
        tick(ctx, foe.x, foe.y - 38, `📕 ×${SPIKE_STRIKES} · ${SPIKE_DAMAGE * SPIKE_STRIKES}`, PAP.arcane);
        return;
      }
      portal.x = p.x;
      portal.y = p.y;
      portal.at = clock;
      const a = Math.random() * TAU;
      p.x = Phaser.Math.Clamp(foe.x + Math.cos(a) * SPIKE_WARP_DIST, 12, ctx.w - 12);
      p.y = Phaser.Math.Clamp(foe.y + Math.sin(a) * SPIKE_WARP_DIST, 24, ctx.h - 12);
      ang = Math.atan2(foe.y - p.y, foe.x - p.x);
      armedAt = clock + SPIKE_WARP_MS;
      return;
    }
    if (p.x < -20 || p.x > ctx.w + 20 || p.y < -20 || p.y > ctx.h + 20) { done = true; return; }
    arcaneSpike(g, ctx.tint, p.x, p.y, ang, 24, 1);
  });
}

export const storybook: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  caption: 'Click — three books, three completely different attacks. Right-click turns the page',
  run(ctx) {
    let book: BookId = 0;
    const s = stageIt(ctx, book);
    const foe: Mark = { x: ctx.w * 0.76, y: ctx.h * 0.6 };
    dummy(ctx, foe);
    bookBadge(ctx, () => book);
    const home: Mark = { x: ctx.cx, y: ctx.cy };

    const page = (at: number, to: BookId, then: () => void): void => {
      ctx.at(at, () => {
        const from = BOOK_TONE[book].cover;
        book = to;
        s.pav?.setBook(book);
        s.fx.turnPage(home.x, home.y, from, BOOK_TONE[book].cover);
        tick(ctx, home.x, home.y - 44,
          `${BOOK_TONE[book].emoji} ${BOOK_TONE[book].name.toUpperCase()}`, BOOK_TONE[book].accent);
      });
      ctx.at(at + 500, then);
    };

    // 📗 thrown wide, so the curve reads. Then 📘, then 📕.
    ctx.at(400, () => {
      s.av.play('punch', ctx.aim);
      s.fx.ripple(home.x, home.y, 12, 46, 320, 9, PAP.spectre);
      excalibur(ctx, s, home, foe);
    });
    page(2600, 1, () => {
      s.pav?.setHold('spray');
      alienLaser(ctx, s, home, foe, 0);
    });
    ctx.at(3100 + LASER_BURST_MS, () => s.pav?.setHold(null));
    page(6600, 2, () => {
      s.av.play('punch', ctx.aim);
      s.fx.ripple(home.x, home.y, 10, 40, 300, 9, PAP.arcane);
      fantasySpike(ctx, s, home, foe);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      '15 curving · 4 a tick ×4 then a 1.5s reload · 6 three times through a portal', PAP.crease);
  },
};

export const storybookUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Larger Library — 📙 12 and a 320px shove, 📓 three seeds that are worth nothing if they hit',
  run(ctx) {
    let book: BookId = 3;
    const s = stageIt(ctx, book);
    const foe: Mark = { x: ctx.w * 0.62, y: ctx.h * 0.58 };
    dummy(ctx, foe);
    bookBadge(ctx, () => book);
    const home: Mark = { x: ctx.w * 0.18, y: ctx.h * 0.58 };
    s.at.x = home.x;
    s.at.y = home.y;

    // 📙 — the slab, thrown broadside, and the shove that is the actual ability.
    const slab = { x: home.x, y: home.y, live: false };
    let shove: { vx: number; until: number } | null = null;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      if (shove) {
        // Played out as position, easing out over its 280ms, exactly as the kit does it.
        const left = Phaser.Math.Clamp((shove.until - elapsed) / SHOVE_MS, 0, 1);
        if (left <= 0) shove = null;
        else foe.x = Math.min(ctx.w - 16, foe.x + shove.vx * (dt / 1000) * left * 2);
      }
      if (!slab.live) return;
      slab.x += SLAB_SPEED * (dt / 1000);
      lightSlab(g, ctx.tint, slab.x, slab.y, 0, SLAB_LEN, SLAB_WIDTH, 1);
      if (slab.x < foe.x - 12) return;
      slab.live = false;
      s.fx.cut(foe.x, foe.y, 30, PAP.halo);
      tick(ctx, foe.x, foe.y - 16, `${SLAB_DAMAGE}`, PAP.halo);
      tick(ctx, foe.x, foe.y - 36, '📙 CAST OUT', PAP.halo);
      shove = { vx: SLAB_KNOCK / (SHOVE_MS / 1000), until: elapsed + SHOVE_MS };
    });
    ctx.at(500, () => {
      s.av.play('sweep', ctx.aim);
      s.fx.ripple(home.x, home.y, 12, 52, 340, 9, PAP.halo);
      slab.x = home.x + 20;
      slab.y = home.y;
      slab.live = true;
    });

    // 📓 — three seeds, and the graze band that decides what each is worth.
    ctx.at(3800, () => {
      book = 4;
      s.pav?.setBook(book);
      s.fx.turnPage(home.x, home.y, BOOK_TONE[3].cover, BOOK_TONE[4].cover);
      tick(ctx, home.x, home.y - 44, '📓 HERBOLOGY', PAP.leaf);
    });
    ctx.at(4400, () => {
      s.av.play('punch', ctx.aim);
      s.fx.ripple(home.x, home.y, 8, 38, 300, 9, PAP.leaf);
      const base = Math.atan2(foe.y - home.y, foe.x - home.x) - 0.16;
      for (let i = 0; i < SEED_COUNT; i++) {
        const ang = base + (i - (SEED_COUNT - 1) / 2) * SEED_SPREAD;
        const p = { x: home.x, y: home.y };
        let near = Infinity;
        let done = false;
        const sg = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
        ctx.onFrame((dt) => {
          sg.clear();
          if (done) return;
          const step = dt / 1000;
          p.x += Math.cos(ang) * SEED_SPEED * step;
          p.y += Math.sin(ang) * SEED_SPEED * step;
          const d = Phaser.Math.Distance.Between(p.x, p.y, foe.x, foe.y);
          if (d < near) near = d;
          if (d <= 20) {
            // A seed that touches is simply wasted — no damage, no heal.
            done = true;
            s.fx.splat(p.x, p.y, 12, PAP.leafDeep);
            tick(ctx, p.x, p.y - 20, '📓 WASTED', PAP.leafDeep);
            return;
          }
          if (p.x >= ctx.w - 6) {
            done = true;
            const charge = Phaser.Math.Clamp((SEED_FAR - near) / (SEED_FAR - SEED_NEAR), 0, 1);
            const amount = SEED_HEAL + Math.round(SEED_HEAL_BONUS * charge);
            s.fx.ripple(ctx.w - 8, p.y, 5, 26 + charge * 22, 320, 9, PAP.leaf);
            tick(ctx, home.x, home.y - 26, `🌿 +${amount}`, PAP.leaf);
            return;
          }
          const charge = Phaser.Math.Clamp((SEED_FAR - near) / (SEED_FAR - SEED_NEAR), 0, 1);
          herbSeed(sg, ctx.tint, p.x, p.y, ang, 7, charge, 1);
        });
      }
    });
    // The two bands the heal is measured between.
    const bands = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    bands.lineStyle(1, ctx.tint(PAP.leafDeep), 0.3);
    bands.strokeCircle(foe.x, foe.y, SEED_FAR);
    bands.lineStyle(1, ctx.tint(PAP.leaf), 0.45);
    bands.strokeCircle(foe.x, foe.y, SEED_NEAR);

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `graze band: ${SEED_NEAR}px pays all 9, ${SEED_FAR}px pays only ${SEED_HEAL}`, PAP.crease);
  },
};

// ── E — Paper Plane ───────────────────────────────────────────────────

function planeLoop(ctx: PreviewCtx, opts: { drill: boolean }): void {
  const home: Mark = { x: ctx.w * 0.16, y: ctx.h * 0.66 };
  const s = drivenCaster(ctx, home);
  const foe: Mark = { x: ctx.w * 0.52, y: ctx.h * 0.5 };
  dummy(ctx, foe);

  const plane = { x: home.x, y: home.y, ang: 0, bank: 0, live: false, riding: true };
  const cursor: Mark = { x: ctx.w * 0.9, y: ctx.h * 0.28 };
  let drilled = false;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));

  ctx.at(400, () => {
    s.av.play('dash', ctx.aim);
    s.fx.ripple(home.x, home.y, 8, 44, 300, 9, PAP.pulp);
    plane.x = home.x;
    plane.y = home.y;
    plane.ang = Math.atan2(foe.y - home.y, foe.x - home.x);
    plane.live = true;
    tick(ctx, home.x, home.y - 42, '✈️ TAKE OFF', PAP.crease);
  });

  ctx.onFrame((dt, elapsed) => {
    g.clear();
    if (!plane.live) return;
    const step = dt / 1000;
    cursor.x = ctx.w * 0.86 + Math.sin(elapsed / 700) * ctx.w * 0.08;
    cursor.y = ctx.h * 0.3 + Math.cos(elapsed / 900) * ctx.h * 0.16;

    // A glide, not a homing dash: the turn rate is capped at 2.4 rad/s and it banks into it.
    const want = Math.atan2(cursor.y - plane.y, cursor.x - plane.x);
    const turn = Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - plane.ang),
      -PLANE_STEER * step, PLANE_STEER * step);
    plane.ang += turn;
    plane.bank += (Phaser.Math.Clamp(turn / (PLANE_STEER * step || 1), -1, 1) - plane.bank) * 0.2;

    const speed = plane.riding ? PLANE_RIDE_SPEED : PLANE_SPEED;
    plane.x += Math.cos(plane.ang) * speed * step;
    plane.y += Math.sin(plane.ang) * speed * step;

    if (!drilled && Phaser.Math.Distance.Between(plane.x, plane.y, foe.x, foe.y) <= 28) {
      drilled = true;
      s.fx.cut(foe.x, foe.y, 24, PAP.crease);
      tick(ctx, foe.x, foe.y - 16, `${PLANE_DAMAGE}`, PAP.pulp);
      if (opts.drill) tick(ctx, foe.x, foe.y - 36, '✈️ DRILLED', PAP.crease);
    }

    // A ridden plane is clamped rather than killed at the wall — a rider is never carried out.
    const wall = plane.x >= ctx.w - 8 || plane.y <= 20 || plane.y >= ctx.h - 8;
    plane.x = Phaser.Math.Clamp(plane.x, 8, ctx.w - 8);
    plane.y = Phaser.Math.Clamp(plane.y, 20, ctx.h - 8);
    home.x = plane.x;
    home.y = plane.y;
    // Passengers ride the nose, position-stomped, because anything gentler loses to their WASD.
    if (opts.drill && drilled) {
      foe.x = plane.x + Math.cos(plane.ang) * 16;
      foe.y = plane.y + Math.sin(plane.ang) * 16;
    }
    if (wall && opts.drill && drilled) {
      plane.live = false;
      s.fx.ripple(plane.x, plane.y, 10, DRILL_AOE_R, 380, 10, PAP.crease);
      s.fx.shred(plane.x, plane.y, 12, DRILL_AOE_R * 0.7, 460, 10);
      tick(ctx, plane.x, plane.y - 34, '✈️ CRASH', PAP.crease);
      tick(ctx, foe.x, foe.y - 16, `${DRILL_AOE_DAMAGE}`, PAP.crease);
      return;
    }
    paperPlaneShape(g, ctx.tint, plane.x, plane.y, plane.ang, 16, 1, { bank: plane.bank });
    // The cursor it is steering toward, so the 2.4 rad/s cap is something the eye can check.
    g.lineStyle(1, ctx.tint(PAP.crease), 0.5);
    g.strokeCircle(cursor.x, cursor.y, 4);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.drill ? `speared on the nose and carried to the wall — ${DRILL_AOE_DAMAGE} more in ${DRILL_AOE_R}px`
      : `ridden: ${PLANE_RIDE_SPEED} px/s, 2.4 rad/s of steering, and WASD is off`, PAP.crease);
}

export const paperPlane: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'E — tap to throw it for 10, or hold and you are on it: 470 px/s and the cursor is a rudder',
  run(ctx) { planeLoop(ctx, { drill: false }); },
};

export const paperPlaneUpgraded: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Plane Drill — it no longer passes through. It picks them up and takes them to the wall',
  run(ctx) { planeLoop(ctx, { drill: true }); },
};

// ── R — Paper Shuriken ────────────────────────────────────────────────

function shurikenLoop(ctx: PreviewCtx, opts: { pinwheel: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.58, y: ctx.h * 0.56 };
  dummy(ctx, foe);
  const r = SHURIKEN_R * (opts.pinwheel ? PINWHEEL_SIZE_MULT : 1);

  const sh = {
    x: ctx.cx, y: ctx.cy, vx: 0, vy: 0, spin: 0,
    stuck: false, bonus: 0, live: false, gate: -9999,
  };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));

  // The bleed: 2% of what they have left, every second, for four seconds.
  let hp = 400;
  let bleedUntil = -9999;
  let nextBleed = 0;
  const cut = (elapsed: number): void => {
    hp -= SHURIKEN_DAMAGE;
    s.fx.splat(foe.x, foe.y, 24, PAP.blood);
    tick(ctx, foe.x, foe.y - 16, `${SHURIKEN_DAMAGE}`, PAP.blood);
    tick(ctx, foe.x, foe.y - 34, '🩸 BLEEDING', PAP.blood);
    bleedUntil = elapsed + 4000;
    if (nextBleed < elapsed) nextBleed = elapsed + 1000;
  };

  ctx.at(400, () => {
    s.av.play('sweep', ctx.aim);
    s.fx.ripple(ctx.cx, ctx.cy, 10, 50, 340, 9, PAP.crease);
    const ang = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx);
    sh.x = ctx.cx;
    sh.y = ctx.cy;
    sh.vx = Math.cos(ang) * SHURIKEN_SPEED;
    sh.vy = Math.sin(ang) * SHURIKEN_SPEED;
    sh.live = true;
    tick(ctx, ctx.cx, ctx.cy - 42, '🌀 SHURIKEN', PAP.blood);
  });

  let bitten = false;
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    if (elapsed >= nextBleed && elapsed < bleedUntil) {
      nextBleed = elapsed + 1000;
      const dmg = Math.max(1, Math.round(hp * BLEED_FRACTION));
      hp -= dmg;
      s.fx.splat(foe.x, foe.y + 8, 14, PAP.blood);
      tick(ctx, foe.x + 16, foe.y - 6, `${dmg}`, PAP.blood);
    }
    if (!sh.live) return;
    const step = dt / 1000;
    sh.spin += step * (sh.stuck ? 9 : 22);

    if (!sh.stuck) {
      sh.x += sh.vx * step;
      sh.y += sh.vy * step;
      if (!bitten && Phaser.Math.Distance.Between(sh.x, sh.y, foe.x, foe.y) <= r + 12) {
        bitten = true;
        cut(elapsed);
      }
      if (sh.x >= ctx.w - 6 || sh.x <= 6 || sh.y <= 20 || sh.y >= ctx.h - 6) {
        // It buries itself in the wall rather than stopping at it.
        sh.x = Phaser.Math.Clamp(sh.x, 6, ctx.w - 6);
        sh.y = Phaser.Math.Clamp(sh.y, 20, ctx.h - 6);
        sh.stuck = true;
        sh.vx = 0;
        sh.vy = 0;
        bitten = false;
        s.fx.shred(sh.x, sh.y, 5, 16, 340, 9);
        tick(ctx, sh.x, sh.y - 26,
          opts.pinwheel ? `🌀 BURIED · 16s +${sh.bonus / 1000}s` : '🌀 BURIED · 8s', PAP.crease);
      }
    } else {
      // Buried: an ordinary hazard with a 1.2s per-victim clock.
      if (Phaser.Math.Distance.Between(sh.x, sh.y, foe.x, foe.y) <= r + 12 && elapsed >= sh.gate) {
        sh.gate = elapsed + SHURIKEN_STUCK_GATE_MS;
        cut(elapsed);
      }
    }

    if (opts.pinwheel) {
      pinwheelShape(g, ctx.tint, sh.x, sh.y, sh.spin, r, 1, { stuck: sh.stuck ? 1 : 0 });
    } else {
      shurikenShape(g, ctx.tint, sh.x, sh.y, sh.spin, r, 1);
    }
  });

  if (!opts.pinwheel) {
    // Somebody wandering back into the buried star, which is the second half of the ability.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 2600 || !sh.stuck) return;
      const d = Phaser.Math.Distance.Between(foe.x, foe.y, sh.x, sh.y);
      if (d <= r + 10) return;
      const step = Math.min(d, 70 * (dt / 1000));
      foe.x += ((sh.x - foe.x) / d) * step;
      foe.y += ((sh.y - foe.y) / d) * step;
    });
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      '15 + a 2%-per-second bleed, and 8 seconds of the same star in the wall', PAP.crease);
    return;
  }

  // Pinwheel: shots flying past kick it back into the room, and each launch banks 2 more seconds.
  for (let i = 0; i < 3; i++) {
    ctx.at(3400 + i * 1500, () => {
      if (!sh.stuck) return;
      ctx.fly({
        texture: 'proj-fire',
        from: { x: ctx.w * 0.1, y: ctx.h * (0.3 + i * 0.2) },
        to: { x: sh.x, y: sh.y },
        speed: 620,
        pierce: true,
        onHit: () => {
          if (!sh.stuck) return;
          const inward = Math.atan2(ctx.h / 2 - sh.y, ctx.w / 2 - sh.x);
          const ang = inward + (Math.random() - 0.5) * Math.PI * 1.1;
          sh.vx = Math.cos(ang) * SHURIKEN_SPEED;
          sh.vy = Math.sin(ang) * SHURIKEN_SPEED;
          sh.stuck = false;
          sh.gate = -9999;
          bitten = false;
          sh.bonus += PINWHEEL_BONUS_MS;
          s.fx.ripple(sh.x, sh.y, 8, 46, 300, 9, PAP.crease);
          tick(ctx, sh.x, sh.y - 28, `🌀 SPUN OFF · +${PINWHEEL_BONUS_MS / 1000}s`, PAP.crease);
        },
      });
    });
  }
  label(ctx, ctx.w * 0.5, ctx.h - 8,
    'either side\'s shots kick it loose, the shot keeps going, and the hit list is cleared each time', PAP.crease);
}

export const paperShuriken: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'R — 15 and a bleed, then eight seconds of the same star spinning in the wall',
  run(ctx) { shurikenLoop(ctx, { pinwheel: false }); },
};

export const paperShurikenUpgraded: PreviewScript = {
  duration: 9600,
  scale: 0.9,
  caption: 'Paper Pinwheel — twice the size, twice the wall time, and any shot passing it kicks it loose',
  run(ctx) { shurikenLoop(ctx, { pinwheel: true }); },
};

// ── F — Mâché Monsters ────────────────────────────────────────────────

function macheLoop(ctx: PreviewCtx, opts: { magical: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.84, y: ctx.h * 0.36 };
  dummy(ctx, foe);

  interface Mon { x: number; y: number; open: number; spin: number; seed: number; alive: boolean; enraged: boolean; gone: boolean }
  const mons: Mon[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));

  ctx.at(400, () => {
    s.av.play('clap');
    s.fx.ripple(ctx.cx, ctx.cy, 20, 140, 460, 9, PAP.pulp);
    const phase = Math.random() * TAU;
    for (let i = 0; i < MACHE_COUNT; i++) {
      const a = phase + (i / MACHE_COUNT) * TAU + (Math.random() - 0.5) * 0.4;
      const d = 40 + Math.random() * 52;
      mons.push({
        x: Phaser.Math.Clamp(ctx.cx + Math.cos(a) * d, MACHE_R, ctx.w - MACHE_R),
        y: Phaser.Math.Clamp(ctx.cy + Math.sin(a) * d, 24 + MACHE_R, ctx.h - MACHE_R),
        open: 0.35, spin: Math.random() * TAU, seed: Math.random() * 999,
        alive: opts.magical, enraged: false, gone: false,
      });
    }
    tick(ctx, ctx.cx, ctx.cy - 44,
      opts.magical ? `👹 MONSTERS ×${MACHE_COUNT}` : `👹 MÂCHÉ ×${MACHE_COUNT}`, PAP.crease);
  });

  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    g.clear();
    for (const m of mons) {
      if (m.gone) continue;
      if (m.alive) {
        const speed = m.enraged ? MACHE_CHARGE_SPEED : MACHE_HUNT_SPEED;
        const damage = m.enraged ? MACHE_CHARGE_DAMAGE : MACHE_HUNT_DAMAGE;
        const a = Math.atan2(foe.y - m.y, foe.x - m.x);
        m.x += Math.cos(a) * speed * step;
        m.y += Math.sin(a) * speed * step;
        m.spin += step * (m.enraged ? 6 : 3.4);
        m.open = 0.6 + Math.sin(t * (m.enraged ? 16 : 8)) * 0.4;
        if (Phaser.Math.Distance.Between(m.x, m.y, foe.x, foe.y) <= MACHE_BITE_R + 12) {
          m.gone = true;
          s.fx.shred(foe.x, foe.y, 7, 22, 420, 10);
          tick(ctx, foe.x + (Math.random() - 0.5) * 20, foe.y - 16, `${damage}`, PAP.crease);
          tick(ctx, foe.x, foe.y - 34, '👹 CHOMP', PAP.crease);
          continue;
        }
      } else {
        m.open = 0.3 + Math.sin(t * 2.4 + m.seed) * 0.12;
        if (Phaser.Math.Distance.Between(m.x, m.y, foe.x, foe.y) <= MACHE_BITE_R + 12) {
          m.gone = true;
          s.fx.shred(m.x, m.y, 6, 20, 400, 10);
          tick(ctx, foe.x, foe.y - 16, `${MACHE_BITE_DAMAGE}`, PAP.crease);
          tick(ctx, foe.x, foe.y - 34, '👹 BITE', PAP.crease);
          continue;
        }
      }
      fortuneTeller(g, ctx.tint, m.x, m.y, MACHE_R, m.open, 1,
        { seed: m.seed, spin: m.spin, accent: m.enraged ? PAP.ink : PAP.crease });
    }
  });

  // A bullet, on a real projectile texture, being swallowed — and what that does to the thing
  // that ate it. The shot is destroyed either way; the upgrade does not change that.
  ctx.at(2400, () => {
    const target = mons.find((m) => !m.gone && !m.enraged);
    if (!target) return;
    ctx.fly({
      texture: 'proj-fire',
      from: { x: foe.x, y: foe.y },
      to: { x: target.x, y: target.y },
      speed: 520,
      onHit: () => {
        target.alive = true;
        target.enraged = true;
        s.fx.ripple(target.x, target.y, 6, 34, 320, 9, PAP.pulp);
        tick(ctx, target.x, target.y - 24, '👹 ENRAGED!', PAP.ink);
        tick(ctx, target.x, target.y - 42, `${MACHE_CHARGE_DAMAGE} · ${MACHE_CHARGE_SPEED} px/s`, PAP.ink);
      },
    });
  });

  // The enemy wandering into the ring, which is what a face-up monster is for.
  if (!opts.magical) {
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 3600) return;
      const d = Phaser.Math.Distance.Between(foe.x, foe.y, ctx.cx, ctx.cy);
      if (d <= 30) return;
      const step = Math.min(d, 76 * (dt / 1000));
      foe.x += ((ctx.cx - foe.x) / d) * step;
      foe.y += ((ctx.cy - foe.y) / d) * step;
    });
  }

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.magical ? `six hunters at ${MACHE_HUNT_SPEED} px/s for ${MACHE_HUNT_DAMAGE} — a bullet still enrages one`
      : `six mines, ${MACHE_BITE_DAMAGE} a bite, and any shot that flies over one is eaten`, PAP.crease);
}

export const macheMonsters: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'F — six fortune-tellers face-up. Step on one for 6; feed one a bullet and it stands up',
  run(ctx) { macheLoop(ctx, { magical: false }); },
};

export const macheMonstersUpgraded: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'Magical Monsters — they land on their feet and walk them down for 4 apiece',
  run(ctx) { macheLoop(ctx, { magical: true }); },
};

// ── Q — Climax ────────────────────────────────────────────────────────

/** Knight: twelve riders, one hit list. Twelve riders are one attack, not twelve. */
function climaxCharge(ctx: PreviewCtx, s: Stage, foe: Mark, startAt: number): void {
  interface Rider { x: number; y: number; dir: number; scale: number; phase: number; mounted: boolean; startAt: number }
  const riders: Rider[] = [];
  let hit = false;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  ctx.at(startAt, () => {
    for (let i = 0; i < CHARGE_COUNT; i++) {
      riders.push({
        x: -60 - (i % 4) * 40,
        y: 24 + ((i + 0.5) / CHARGE_COUNT) * (ctx.h - 40) + (Math.random() - 0.5) * 12,
        dir: 1, scale: 11 + Math.random() * 4, phase: Math.random() * TAU,
        mounted: i % 3 !== 1, startAt: startAt + (i % 4) * 60,
      });
    }
    tick(ctx, ctx.cx, ctx.cy - 48, '📗 THE CHARGE', PAP.spectre);
  });
  ctx.onFrame((dt, elapsed) => {
    const step = dt / 1000;
    g.clear();
    for (const r of riders) {
      if (elapsed < r.startAt) continue;
      r.x += r.dir * CHARGE_SPEED * step;
      r.phase += step * 16;
      if (!hit && Math.abs(foe.x - r.x) <= CHARGE_HIT_R && Math.abs(foe.y - r.y) <= CHARGE_HIT_R * 1.2) {
        hit = true;
        s.fx.cut(foe.x, foe.y, 46, PAP.spectre);
        tick(ctx, foe.x, foe.y - 16, `${CHARGE_DAMAGE}`, PAP.spectre);
        tick(ctx, foe.x, foe.y - 38, '⚔️ RIDDEN DOWN', PAP.spectre);
      }
      if (r.x < -120 || r.x > ctx.w + 120) continue;
      ghostKnight(g, ctx.tint, r.x, r.y, r.dir, r.scale, 1, { mounted: r.mounted, phase: r.phase });
    }
  });
}

/** Alien: sixty rings, armed for two seconds, then landing 25ms apart. */
function climaxBombardment(ctx: PreviewCtx, s: Stage, foe: Mark, startAt: number): void {
  interface Bomb { x: number; y: number; landsAt: number; seed: number; gone: boolean }
  const bombs: Bomb[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  let stunUntil = -9999;
  ctx.at(startAt, () => {
    for (let i = 0; i < BOMB_COUNT; i++) {
      const aimed = i < 25;
      const a = Math.random() * TAU;
      const d = Math.random() * 60;
      bombs.push({
        x: aimed ? Phaser.Math.Clamp(foe.x + Math.cos(a) * d, 20, ctx.w - 20)
          : Phaser.Math.Between(20, Math.floor(ctx.w) - 20),
        y: aimed ? Phaser.Math.Clamp(foe.y + Math.sin(a) * d, 30, ctx.h - 20)
          : Phaser.Math.Between(30, Math.floor(ctx.h) - 20),
        landsAt: startAt + BOMB_ARM_MS + i * BOMB_STAGGER_MS,
        seed: Math.random() * 999, gone: false,
      });
    }
    tick(ctx, ctx.cx, ctx.cy - 48, '📘 BOMBARDMENT', PAP.beam);
  });
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    for (const b of bombs) {
      if (b.gone) continue;
      if (elapsed < b.landsAt) {
        const k = Phaser.Math.Clamp(1 - (b.landsAt - elapsed) / BOMB_ARM_MS, 0, 1);
        targetRing(g, ctx.tint, b.x, b.y, BOMB_R * 0.5, k, 0.95, { seed: b.seed });
        continue;
      }
      b.gone = true;
      s.fx.beam(b.x, b.y - 160, b.x, b.y, 6, 200, 12);
      s.fx.detonation(b.x, b.y, BOMB_R * 0.5, 520, 12);
      if (Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) > BOMB_R * 0.5) continue;
      // They overlap: standing where three land is three lots of 25 and three stuns.
      tick(ctx, foe.x + (Math.random() - 0.5) * 22, foe.y - 14, `${BOMB_DAMAGE}`, PAP.beam);
      if (elapsed > stunUntil) tick(ctx, foe.x, foe.y - 38, '💫 STUNNED', PAP.beam);
      stunUntil = elapsed + BOMB_STUN_MS;
    }
  });
}

/** Fantasy: eight seconds of a spirit bouncing off the walls, laying fire behind it. */
function climaxSpirit(ctx: PreviewCtx, s: Stage, foe: Mark, startAt: number): void {
  interface Trail { x: number; y: number; born: number; seed: number; gate: number }
  const trails: Trail[] = [];
  const sp = { x: ctx.cx, y: ctx.cy, vx: 0, vy: 0, live: false, next: 0 };
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.at(startAt, () => {
    const ang = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx) + 0.5;
    sp.x = ctx.cx;
    sp.y = ctx.cy;
    sp.vx = Math.cos(ang) * SPIRIT_SPEED;
    sp.vy = Math.sin(ang) * SPIRIT_SPEED;
    sp.live = true;
    tick(ctx, ctx.cx, ctx.cy - 48, '📕 FLAME SPIRIT', PAP.flame);
  });
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    ground.clear();
    air.clear();

    for (let i = trails.length - 1; i >= 0; i--) {
      const tr = trails[i];
      const life = 1 - (elapsed - tr.born) / TRAIL_LIFE_MS;
      if (life <= 0) { trails.splice(i, 1); continue; }
      burningScrap(ground, ctx.tint, tr.x, tr.y, TRAIL_R * 0.6, life, life, { seed: tr.seed, t });
      if (Phaser.Math.Distance.Between(tr.x, tr.y, foe.x, foe.y) > TRAIL_R || elapsed < tr.gate) continue;
      tr.gate = elapsed + 1000;
      tick(ctx, foe.x, foe.y - 12, `${TRAIL_DAMAGE}`, PAP.flame);
    }

    if (!sp.live) return;
    sp.x += sp.vx * step;
    sp.y += sp.vy * step;
    // A screensaver: reflect, clamp, never lose speed.
    if (sp.x < SPIRIT_R) { sp.x = SPIRIT_R; sp.vx = Math.abs(sp.vx); }
    if (sp.x > ctx.w - SPIRIT_R) { sp.x = ctx.w - SPIRIT_R; sp.vx = -Math.abs(sp.vx); }
    if (sp.y < 22 + SPIRIT_R) { sp.y = 22 + SPIRIT_R; sp.vy = Math.abs(sp.vy); }
    if (sp.y > ctx.h - SPIRIT_R) { sp.y = ctx.h - SPIRIT_R; sp.vy = -Math.abs(sp.vy); }
    if (elapsed >= sp.next) {
      sp.next = elapsed + SPIRIT_TRAIL_MS;
      trails.push({ x: sp.x, y: sp.y, born: elapsed, seed: Math.random() * 999, gate: 0 });
    }
    flameSpirit(air, ctx.tint, sp.x, sp.y, SPIRIT_R * 0.8, 1, t, { vx: sp.vx, vy: sp.vy });
  });
}

export const climax: PreviewScript = {
  duration: 11000,
  scale: 0.8,
  caption: 'Q — one key, one ending per book: 12 riders for 50, 60 bombs for 25 each, or 8s of loose fire',
  run(ctx) {
    let book: BookId = 0;
    const s = stageIt(ctx, book);
    const foe: Mark = { x: ctx.w * 0.62, y: ctx.h * 0.55 };
    dummy(ctx, foe);
    bookBadge(ctx, () => book);

    ctx.at(300, () => s.av.play('raise'));
    climaxCharge(ctx, s, foe, 400);

    ctx.at(2600, () => {
      book = 1;
      s.pav?.setBook(book);
      s.fx.turnPage(ctx.cx, ctx.cy, BOOK_TONE[0].cover, BOOK_TONE[1].cover);
      s.av.play('raise');
    });
    climaxBombardment(ctx, s, foe, 2800);

    ctx.at(7000, () => {
      book = 2;
      s.pav?.setBook(book);
      s.fx.turnPage(ctx.cx, ctx.cy, BOOK_TONE[1].cover, BOOK_TONE[2].cover);
      s.av.play('raise');
    });
    climaxSpirit(ctx, s, foe, 7200);

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'the twelve riders share one hit list — a body caught by all of them takes 50, not 600', PAP.crease);
  },
};

export const climaxUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.83,
  caption: 'Open-Ended — two endings at once: the open book, plus one rolled from the rest of the shelf',
  run(ctx) {
    const book: BookId = 3;
    const s = stageIt(ctx, book);
    const foe: Mark = { x: ctx.w * 0.6, y: ctx.h * 0.56 };
    dummy(ctx, foe);
    bookBadge(ctx, () => book);

    // 📙 open — the crucifix, which is the only ending in the kit that deals no damage.
    let chained = false;
    const cross = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((_dt, elapsed) => {
      cross.clear();
      if (!chained) return;
      const t = elapsed / 1000;
      crucifixShape(cross, ctx.tint, foe.x, foe.y - 8, 22, 0.95, { t });
      chainRun(cross, ctx.tint, foe.x, foe.y - 6, foe.x, foe.y + 18, 3.4, 0.85);
    });

    ctx.at(400, () => {
      s.av.play('raise');
      chained = true;
      s.fx.godRay(foe.x, foe.y, 44);
      tick(ctx, ctx.cx, ctx.cy - 48, '📙 JUDGEMENT', PAP.halo);
      tick(ctx, foe.x, foe.y - 34, `⛓️ CHAINED · ${CROSS_MS / 1000}s`, PAP.gilt);
    });

    // …and the second ending, rolled off the shelf. A lotus, worth 100 in one press.
    ctx.at(900, () => {
      tick(ctx, ctx.cx, ctx.cy - 66, '📖 OPEN-ENDED · HERBOLOGY', PAP.gilt);
      s.fx.ripple(ctx.cx, ctx.cy, 16, 120, 460, 9, PAP.gilt);
    });
    let lotusAt = -1;
    const lot = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((_dt, elapsed) => {
      lot.clear();
      if (lotusAt < 0) return;
      const k = Phaser.Math.Clamp((elapsed - lotusAt) / 700, 0, 1);
      const life = Phaser.Math.Clamp(1 - (elapsed - lotusAt) / 2200, 0, 1);
      if (life <= 0) return;
      lotusBloom(lot, ctx.tint, ctx.cx, ctx.cy + 6, 34, k, life, { t: elapsed / 1000 });
    });
    ctx.at(1200, () => {
      lotusAt = 1200;
      s.fx.petals(ctx.cx, ctx.cy, 18, 90);
      tick(ctx, ctx.cx, ctx.cy - 48, `🪷 +${LOTUS_HEAL}`, PAP.petal);
    });
    ctx.at(400 + CROSS_MS, () => {
      chained = false;
      s.fx.shred(foe.x, foe.y, 6, 26, 420, 9, PAP.halo);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'without Larger Library the roll is a coin flip between the two books you are not holding', PAP.crease);
  },
};

// ── Passives ──────────────────────────────────────────────────────────

export const theJournal: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Six entries per element — three from losing to it, three from beating it, and they never expire',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.56 };
    dummy(ctx, foe);
    label(ctx, foe.x, foe.y + 26, 'this element, and only this one', PAP.crease);

    // The six entries filling in, three each way, with what each is worth.
    const rows: Array<{ at: number; source: string; text: string; color: number }> = [
      { at: 700, source: 'LOSS 1/3', text: '🩹 −20% debuff duration', color: PAP.gilt },
      { at: 1900, source: 'LOSS 2/3', text: '🛡 +25 shield at the start', color: PAP.gilt },
      { at: 3100, source: 'LOSS 3/3', text: '🩹 −5% damage taken', color: PAP.gilt },
      { at: 4300, source: 'WIN 1/3', text: '⚔️ +6% damage dealt', color: PAP.spectre },
      { at: 5500, source: 'WIN 2/3', text: '👟 +5% move speed', color: PAP.spectre },
      { at: 6700, source: 'WIN 3/3', text: '⚔️ +6% damage dealt', color: PAP.spectre },
    ];
    let filled = 0;
    for (const r of rows) {
      ctx.at(r.at, () => {
        filled++;
        s.fx.inkStroke(ctx.cx, ctx.cy - 10, 70, 700, 12);
        tick(ctx, ctx.cx, ctx.cy - 46, `📖 ${r.source}`, PAP.gilt);
        tick(ctx, ctx.cx, ctx.cy - 64, r.text, r.color);
      });
    }

    // A running tally, because the point of the passive is that it accumulates across matches.
    const tally = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 12, '', {
      fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(PAP.gilt),
    }).setOrigin(0.5).setDepth(19));
    ctx.onFrame(() => tally.setText(`📖  ${filled} / 6 written up`));

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'a full six is roughly a 15–20% swing — and Invasion waves teach you nothing', PAP.crease);
  },
};

export const theShelf: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Right-click turns the page. Free, instant, and it changes both the click and the ultimate',
  run(ctx) {
    let book: BookId = 0;
    const s = stageIt(ctx, book);
    bookBadge(ctx, () => book);

    // The five covers, laid out — the shelf itself, which the arena never shows you all at once.
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      for (let i = 0; i < BOOK_TONE.length; i++) {
        const x = ctx.w * (0.34 + i * 0.14);
        const y = ctx.h * 0.42;
        const on = i === book;
        const tone = BOOK_TONE[i];
        g.fillStyle(ctx.tint(tone.cover), on ? 1 : 0.4);
        g.fillRoundedRect(x - 11, y - 15 - (on ? 4 : 0), 22, 30, 3);
        g.lineStyle(1.4, ctx.tint(tone.accent), on ? 1 : 0.45);
        g.strokeRoundedRect(x - 11, y - 15 - (on ? 4 : 0), 22, 30, 3);
        if (!on) continue;
        g.lineStyle(1, ctx.tint(tone.accent), 0.5 + 0.4 * Math.sin(elapsed / 200));
        g.strokeRoundedRect(x - 14, y - 22, 28, 40, 4);
      }
    });
    for (let i = 0; i < BOOK_TONE.length; i++) {
      label(ctx, ctx.w * (0.34 + i * 0.14), ctx.h * 0.42 + 26, BOOK_TONE[i].name, BOOK_TONE[i].accent);
    }
    label(ctx, ctx.w * (0.34 + 3.5 * 0.14), ctx.h * 0.42 - 34, 'Larger Library only', PAP.gilt);

    for (let i = 1; i < 6; i++) {
      ctx.at(700 + i * 1150, () => {
        const from = BOOK_TONE[book].cover;
        book = (i % BOOK_TONE.length) as BookId;
        s.pav?.setBook(book);
        s.fx.turnPage(ctx.cx, ctx.cy, from, BOOK_TONE[book].cover);
        tick(ctx, ctx.cx, ctx.cy - 42,
          `${BOOK_TONE[book].emoji} ${BOOK_TONE[book].name.toUpperCase()}`, BOOK_TONE[book].accent);
      });
    }

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'cycling out of a half-fired laser drops the burst but still charges the 1.5s reload', PAP.crease);
  },
};
