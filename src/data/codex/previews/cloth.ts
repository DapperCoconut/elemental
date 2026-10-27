import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  CLT, ClothAvatar, ClothFx, bolaGlyph, burnScrap, clothWrap, clothesline, effigy, flameTongue,
  jacketGlyph, needleGlyph, pinGlyph, pincushion, scarfArm, scarfHand,
} from '../../../elements/kits/ClothVisuals';

/**
 * Cloth's showcases.
 *
 * The one object every loop has to have in frame is **the scarf hand**: the scarf wound round the
 * tailor's crown, paid out to a stitched cloth hand. It is the legs, the punch and the inventory,
 * so most of these scripts drive the caster themselves through `moveCaster` — the body is
 * *supposed* to be hauled by the scarf.
 *
 * Cloth puts no sprite in the world: needles, pins, the bola, the cushion, scraps and the
 * clotheslines are Graphics repainted per frame out of `ClothVisuals`, the same way the kit does.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const HAND_MAX = 250;
const HAND_MIN = 20;
const HAND_SPRING = 16;
const PUNCH_DAMAGE = 20;
const SMACK_DAMAGE = 14;
const SMACK_SPEED = 620;
const NEEDLE_LEN = 36;
const NEEDLE_DAMAGE = 26;
const NEEDLE_DROP_DAMAGE = 8;
const BOMB_PINS = 9;
const BOMB_SPREAD = 0.95;
const BOMB_PIN_DAMAGE = 6;
const PIN_SPEED = 520;
const BOLA_SPEED = 600;
const BOLA_DAMAGE = 10;
const WALL_SLAM_DAMAGE = 30;
const CUSHION_R = 18;
const CUSHION_BARRAGE = 14;
const CUSHION_PIN_DAMAGE = 7;
const RETALIATE_DAMAGE = 12;
const SCRAP_DAMAGE = 6;
const CLAW_PUNCH_BONUS = 15;
const LINE_SPEED = 680;
const TAU = Math.PI * 2;

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── Shared staging ────────────────────────────────────────────────────

interface Tailor {
  fx: ClothFx;
  av: ClothAvatar | null;
  /** Where the body is. Written by the script and handed to `moveCaster`. */
  at: Mark;
  /** Where the hand is this frame, sprung after `reach` exactly as the kit springs it. */
  hand: Mark;
  handV: Mark;
  /** Where the hand is being sent. Clamped to the scarf's reach. */
  reach: Mark;
  grip: boolean;
  burn: boolean;
  char: boolean;
  maxReach: number;
}

function tailor(ctx: PreviewCtx, at: Mark): Tailor {
  const fx = ctx.capture(() => new ClothFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new ClothAvatar(ctx.scene, ctx.tint));
  const t: Tailor = {
    fx, av: av instanceof ClothAvatar ? av : null,
    at, hand: { x: at.x + 40, y: at.y }, handV: { x: 0, y: 0 }, reach: { x: at.x + 60, y: at.y },
    grip: false, burn: false, char: false, maxReach: HAND_MAX,
  };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5.8));
  ctx.onFrame((dt, elapsed) => {
    const step = Math.max(0.001, dt / 1000);
    const dx = t.reach.x - t.at.x;
    const dy = t.reach.y - t.at.y;
    const d = Phaser.Math.Clamp(Math.hypot(dx, dy) || 1, HAND_MIN, t.maxReach);
    const a = Math.atan2(dy, dx);
    const tx = t.at.x + Math.cos(a) * d;
    const ty = t.at.y + Math.sin(a) * d;
    const k = Math.min(1, HAND_SPRING * step);
    const nx = t.hand.x + (tx - t.hand.x) * k;
    const ny = t.hand.y + (ty - t.hand.y) * k;
    t.handV.x = (nx - t.hand.x) / step;
    t.handV.y = (ny - t.hand.y) / step;
    t.hand.x = nx;
    t.hand.y = ny;
    ctx.moveCaster(t.at.x, t.at.y, { facing: Math.atan2(t.hand.y - t.at.y, t.hand.x - t.at.x) });
    t.av?.setBurn(t.burn);
    t.av?.setEffigy(t.char);

    const time = elapsed / 1000;
    const scale = t.char ? 1.35 : 1;
    const cy = t.at.y - 14 * scale;
    g.clear();
    scarfArm(g, ctx.tint, t.at.x, cy, t.hand.x, t.hand.y, 1, time,
      { width: 10 * scale, slack: t.grip ? 0.05 : 0.45, seed: 1, burn: t.burn ? 1 : 0, char: t.char });
    scarfHand(g, ctx.tint, t.hand.x, t.hand.y, Math.atan2(t.hand.y - cy, t.hand.x - t.at.x), 1, time,
      { grip: t.grip ? 1 : 0, scale, burn: t.burn ? 1 : 0, char: t.char });
  });
  return t;
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#1a0d12', strokeThickness: 3,
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

function dummy(ctx: PreviewCtx, at: Mark): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1);
    g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1);
    g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9);
    g.fillCircle(at.x - 5, at.y - 4, 3.2);
    g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1);
    g.fillCircle(at.x - 5.6, at.y - 4, 1.6);
    g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
  });
}

/** Pins in flight, painted the way the kit paints them, with a hit callback against one body. */
function pinField(ctx: PreviewCtx, foe: Mark | null, onHit: (dmg: number) => void): {
  spray(x: number, y: number, ang: number, count: number, spread: number, damage: number, hot?: boolean): void;
} {
  interface P { x: number; y: number; vx: number; vy: number; life: number; damage: number; hot: boolean }
  const list: P[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  ctx.onFrame((dt) => {
    const step = dt / 1000;
    g.clear();
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.life -= dt;
      if (foe && Phaser.Math.Distance.Between(p.x, p.y, foe.x, foe.y) <= 18) {
        onHit(p.damage);
        list.splice(i, 1);
        continue;
      }
      if (p.life <= 0) { list.splice(i, 1); continue; }
      pinGlyph(g, ctx.tint, p.x, p.y, Math.atan2(p.vy, p.vx), 13, 1, { head: 1.8, hot: p.hot });
    }
  });
  return {
    spray(x, y, ang, count, spread, damage, hot = false) {
      for (let i = 0; i < count; i++) {
        const a = spread >= TAU - 0.01
          ? ang + (i / count) * TAU
          : ang + (count > 1 ? (i / (count - 1) - 0.5) * spread : 0);
        list.push({ x, y, vx: Math.cos(a) * PIN_SPEED, vy: Math.sin(a) * PIN_SPEED, life: 460, damage, hot });
      }
    },
  };
}

// ── Click ─────────────────────────────────────────────────────────────

export const scarfHandBase: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Click — grip the floor with the scarf hand and drag the mouse back: the scarf hauls you forward, then punches',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.22, y: ctx.h * 0.62 };
    const t = tailor(ctx, home);
    const foe: Mark = { x: ctx.w * 0.8, y: ctx.h * 0.42 };
    dummy(ctx, foe);
    const anchor: Mark = { x: ctx.w * 0.56, y: ctx.h * 0.74 };
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame(() => {
      ground.clear();
      if (!t.grip) return;
      ground.fillStyle(ctx.tint(CLT.clothDeep), 0.45);
      ground.fillEllipse(anchor.x, anchor.y + 2, 22, 10);
    });
    ctx.at(600, () => { t.reach.x = anchor.x; t.reach.y = anchor.y; });
    ctx.at(900, () => {
      t.grip = true;
      t.fx.grip(anchor.x, anchor.y, false);
      tick(ctx, anchor.x, anchor.y - 24, '✊ GRIP', CLT.clothPale);
    });
    ctx.onFrame((dt, elapsed) => {
      if (!t.grip || elapsed < 1100) return;
      t.reach.x = anchor.x; t.reach.y = anchor.y;
      const d = Phaser.Math.Distance.Between(home.x, home.y, anchor.x, anchor.y);
      if (d <= 30) return;
      const step = Math.min(d - 30, 560 * 0.45 * (dt / 1000));
      home.x += ((anchor.x - home.x) / d) * step;
      home.y += ((anchor.y - home.y) / d) * step;
    });
    ctx.at(4300, () => { t.grip = false; t.reach.x = foe.x; t.reach.y = foe.y; });
    ctx.at(5100, () => {
      t.av?.play('punch', Math.atan2(foe.y - home.y, foe.x - home.x));
      t.fx.lint(foe.x, foe.y, 8, 20);
      tick(ctx, foe.x, foe.y - 18, `${PUNCH_DAMAGE}`, CLT.clothLit);
    });
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 5700) return;
      const sweep = (elapsed - 5700) / 1000;
      t.reach.x = foe.x + Math.cos(sweep * 4) * 90;
      t.reach.y = foe.y + Math.sin(sweep * 4) * 60;
    });
    let gate = 0;
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 5700 || elapsed < gate) return;
      if (Math.hypot(t.handV.x, t.handV.y) < SMACK_SPEED) return;
      if (Phaser.Math.Distance.Between(t.hand.x, t.hand.y, foe.x, foe.y) > 32) return;
      gate = elapsed + 520;
      t.fx.lint(foe.x, foe.y, 6, 16);
      tick(ctx, foe.x, foe.y - 18, `${SMACK_DAMAGE}`, CLT.clothLit);
    });
    label(ctx, ctx.w * 0.5, ctx.h - 10, 'grip → haul → 20 punch → free 14 smacks from a hand moving over 620 px/s', CLT.clothPale);
  },
};

export const scarfHandUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Click+ Clotheslines — catch a line with the scarf hand and it zips you along it to the wall',
  run(ctx) {
    const lineY = ctx.h * 0.4;
    const home: Mark = { x: ctx.w * 0.14, y: ctx.h * 0.7 };
    const t = tailor(ctx, home);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
    let riding = false;
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      clothesline(g, ctx.tint, 10, lineY, ctx.w - 10, lineY, riding ? 1 : 0.85, elapsed / 1000, { seed: 3, lit: riding });
    });
    ctx.at(700, () => { t.reach.x = home.x + 60; t.reach.y = lineY; });
    ctx.at(1200, () => {
      riding = true;
      t.grip = true;
      t.fx.grip(t.hand.x, lineY, false);
      tick(ctx, home.x, home.y - 40, '🧺 CLOTHESLINE', CLT.brassLit);
    });
    ctx.onFrame((dt, elapsed) => {
      if (!riding || elapsed < 1200) return;
      const step = dt / 1000;
      home.y += (lineY + 18 - home.y) * Math.min(1, step * 6);
      home.x = Math.min(ctx.w - 30, home.x + LINE_SPEED * 0.5 * step);
      t.reach.x = home.x + 46; t.reach.y = lineY;
      if (home.x >= ctx.w - 30) { riding = false; t.grip = false; }
    });
    label(ctx, ctx.w * 0.5, ctx.h - 10, '4 lines · 22px to catch one · 680 px/s until a wall', CLT.brassLit);
  },
};

// ── E ─────────────────────────────────────────────────────────────────

function needleLoop(ctx: PreviewCtx, bomb: boolean): void {
  const home: Mark = { x: ctx.w * 0.2, y: ctx.h * 0.6 };
  const t = tailor(ctx, home);
  const foe: Mark = { x: ctx.w * 0.82, y: ctx.h * 0.5 };
  dummy(ctx, foe);
  interface N { x: number; y: number; ang: number; vx: number; vy: number; state: 'fall' | 'ground' | 'held' | 'fly' | 'wall'; at: number; gone: boolean }
  const needles: N[] = [];
  const pins = pinField(ctx, foe, (d) => tick(ctx, foe.x, foe.y - 18, `${d}`, CLT.steelLit));
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  let now = 0;
  ctx.onFrame((dt) => {
    now += dt;
    const step = dt / 1000;
    g.clear();
    for (const n of needles) {
      if (n.gone) continue;
      if (n.state === 'fall' && now >= n.at) n.state = 'ground';
      if (n.state === 'held') { n.x = t.hand.x; n.y = t.hand.y; n.ang = Math.atan2(t.hand.y - home.y, t.hand.x - home.x); }
      if (n.state === 'fly') {
        n.x += n.vx * step;
        n.y += n.vy * step;
        if (Phaser.Math.Distance.Between(n.x, n.y, foe.x, foe.y) <= 20) {
          n.gone = true;
          t.fx.stab(foe.x, foe.y, n.ang, 1.4);
          tick(ctx, foe.x, foe.y - 18, `${NEEDLE_DAMAGE}`, CLT.steelLit);
          if (bomb) { pins.spray(n.x, n.y, n.ang, BOMB_PINS, BOMB_SPREAD * 2, BOMB_PIN_DAMAGE); t.fx.barrage(n.x, n.y, 36, CLT.cloth); }
          continue;
        }
        if (n.y <= 8) {
          n.y = 8; n.state = 'wall'; n.vx = 0; n.vy = 0;
          t.fx.stab(n.x, n.y, n.ang, 1.2);
          if (bomb) { pins.spray(n.x, n.y, Math.PI / 2, BOMB_PINS, BOMB_SPREAD * 2, BOMB_PIN_DAMAGE); t.fx.barrage(n.x, n.y, 36, CLT.cloth); }
        }
      }
      if (n.state === 'fall') {
        const k = 1 - Phaser.Math.Clamp((n.at - now) / 420, 0, 1);
        g.fillStyle(ctx.tint(CLT.ink), 0.25 + 0.3 * k);
        g.fillEllipse(n.x, n.y, 8 + k * 10, 3 + k * 4);
        continue;
      }
      needleGlyph(g, ctx.tint, n.x, n.y, n.ang, NEEDLE_LEN, 1, now / 1000,
        { stuck: n.state === 'ground' || n.state === 'wall', wrapped: bomb && (n.state === 'held' || n.state === 'fly') });
    }
  });
  ctx.at(400, () => {
    t.av?.play('raise');
    tick(ctx, home.x, home.y - 46, '🪡 NEEDLE NEXUS', CLT.steelLit);
    for (let i = 0; i < 3; i++) {
      const a = (i - 1) * 0.45;
      const d = i === 1 ? 96 : 78;
      const x = home.x + Math.cos(a) * d;
      const y = home.y + Math.sin(a) * d;
      needles.push({ x, y, ang: Math.PI / 2 + (i - 1) * 0.25, vx: 0, vy: 0, state: 'fall', at: now + 420 + i * 70, gone: false });
      ctx.at(400 + i * 70, () => t.fx.needleFall(x, y));
    }
  });
  ctx.at(1600, () => { const n = needles[1]; if (n) { t.reach.x = n.x; t.reach.y = n.y; } });
  ctx.at(2100, () => { const n = needles[1]; if (n) { n.state = 'held'; t.grip = true; } });
  ctx.at(2400, () => { t.reach.x = home.x - 40; t.reach.y = home.y + 10; });
  ctx.at(2900, () => {
    const n = needles[1];
    if (!n) return;
    t.grip = false;
    const a = Math.atan2(foe.y - n.y, foe.x - n.x);
    n.state = 'fly'; n.vx = Math.cos(a) * 760; n.vy = Math.sin(a) * 760; n.ang = a;
    t.reach.x = foe.x; t.reach.y = foe.y;
  });
  ctx.at(4300, () => { const n = needles[0]; if (n) { t.reach.x = n.x; t.reach.y = n.y; } });
  ctx.at(4800, () => { const n = needles[0]; if (n) { n.state = 'held'; t.grip = true; } });
  ctx.at(5400, () => {
    const n = needles[0];
    if (!n) return;
    t.grip = false;
    const a = -Math.PI / 2 + 0.2;
    n.state = 'fly'; n.vx = Math.cos(a) * 760; n.vy = Math.sin(a) * 760; n.ang = a;
    tick(ctx, n.x, n.y - 30, '📌 STUCK IN THE WALL', CLT.clothPale);
  });
  label(ctx, ctx.w * 0.5, ctx.h - 10, bomb
    ? 'wrapped needles burst into 9 pins × 6 — on a hit and off a wall'
    : `${NEEDLE_DROP_DAMAGE} where they land · ${NEEDLE_DAMAGE} thrown · a wall keeps the needle`, CLT.steelLit);
}

export const needleNexus: PreviewScript = {
  duration: 7600, scale: 0.9, bodyTexture: '',
  caption: 'E — three needles drop from the sky; the scarf pulls one out and throws it',
  run(ctx) { needleLoop(ctx, false); },
};

export const needleNexusUpgraded: PreviewScript = {
  duration: 7600, scale: 0.9, bodyTexture: '',
  caption: 'E+ Needle Bombs — every thrown needle is wrapped, and the wrap bursts into a shotgun spray of pins',
  run(ctx) { needleLoop(ctx, true); },
};

// ── R ─────────────────────────────────────────────────────────────────

export const constrainingCloth: PreviewScript = {
  duration: 8000, scale: 0.9, bodyTexture: '',
  caption: 'R — a bola binds them; the scarf picks them up and throws them into the wall',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.2, y: ctx.h * 0.55 };
    const t = tailor(ctx, home);
    const foe: Mark = { x: ctx.w * 0.6, y: ctx.h * 0.5 };
    dummy(ctx, foe);
    let bola: Mark | null = null;
    let bound = false;
    let carried = false;
    let flying: Mark | null = null;
    let pinned = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((dt, elapsed) => {
      const step = dt / 1000;
      const time = elapsed / 1000;
      g.clear();
      if (bola) {
        bola.x += BOLA_SPEED * step;
        bolaGlyph(g, ctx.tint, bola.x, bola.y, time * 16, 1, time);
        if (Phaser.Math.Distance.Between(bola.x, bola.y, foe.x, foe.y) <= 26) {
          bola = null;
          bound = true;
          t.fx.wrap(foe.x, foe.y, 24);
          tick(ctx, foe.x, foe.y - 20, `${BOLA_DAMAGE} · 🪢 BOUND`, CLT.web);
        }
      }
      if (carried) { foe.x = t.hand.x; foe.y = t.hand.y; }
      if (flying) {
        foe.x += flying.x * step;
        foe.y += flying.y * step;
        if (foe.x >= ctx.w - 20) {
          foe.x = ctx.w - 20;
          flying = null;
          pinned = elapsed + 2500;
          t.fx.burst(foe.x, foe.y, 30, CLT.web);
          tick(ctx, foe.x - 20, foe.y - 22, `${WALL_SLAM_DAMAGE} · 📌 PINNED`, CLT.clothLit);
        }
      }
      if (bound) clothWrap(g, ctx.tint, foe.x, foe.y, 22, 0.95, time, { seed: 4 });
      if (elapsed < pinned) {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU + 0.4;
          pinGlyph(g, ctx.tint, foe.x + Math.cos(a) * 20, foe.y + Math.sin(a) * 20, a + Math.PI, 16, 1, { head: 2.2 });
        }
      }
    });
    ctx.at(500, () => {
      t.av?.play('sweep', 0);
      bola = { x: home.x + 24, y: foe.y };
      tick(ctx, home.x, home.y - 46, '🪢 CONSTRAINING CLOTH', CLT.web);
    });
    ctx.at(1600, () => { t.reach.x = foe.x; t.reach.y = foe.y; });
    ctx.at(2300, () => { carried = true; t.grip = true; tick(ctx, foe.x, foe.y - 30, '🫳 GRABBED', CLT.clothLit); });
    ctx.at(2600, () => { t.reach.x = home.x + 30; t.reach.y = home.y - 60; });
    ctx.at(3400, () => { t.reach.x = home.x + 240; t.reach.y = home.y - 20; });
    ctx.at(3650, () => { carried = false; t.grip = false; flying = { x: 820, y: 0 }; tick(ctx, foe.x, foe.y - 30, '🤾 THROWN', CLT.clothLit); });
    label(ctx, ctx.w * 0.5, ctx.h - 10, `${BOLA_DAMAGE} + bound 5s at 45% speed → thrown into a wall: ${WALL_SLAM_DAMAGE} and pinned 2.5s`, CLT.web);
  },
};

export const constrainingClothUpgraded: PreviewScript = {
  duration: 7000, scale: 0.9, bodyTexture: '',
  caption: 'R+ Mystical Jacket — whoever it catches is buckled in, and the arrow keys drag them around',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.18, y: ctx.h * 0.5 };
    const t = tailor(ctx, home);
    const foe: Mark = { x: ctx.w * 0.55, y: ctx.h * 0.5 };
    dummy(ctx, foe);
    let jacket: Mark | null = null;
    let worn = false;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    const keys = ctx.adopt(ctx.scene.add.text(ctx.w * 0.18, ctx.h * 0.18, '', {
      fontSize: '14px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: hex(CLT.jacketLit),
    }).setOrigin(0.5).setDepth(20));
    ctx.onFrame((dt, elapsed) => {
      const step = dt / 1000;
      const time = elapsed / 1000;
      g.clear();
      if (jacket) {
        jacket.x += BOLA_SPEED * step;
        bolaGlyph(g, ctx.tint, jacket.x, jacket.y, 0, 1, time, { jacket: true, heading: 0 });
        if (Phaser.Math.Distance.Between(jacket.x, jacket.y, foe.x, foe.y) <= 26) {
          jacket = null;
          worn = true;
          t.fx.wrap(foe.x, foe.y, 24, true);
          tick(ctx, foe.x, foe.y - 20, '🧥 JACKETED', CLT.jacketLit);
        }
      }
      if (worn) {
        // The arrow keys: up, then right, then down — the body goes where they point.
        const phase = elapsed < 2600 ? null : elapsed < 3600 ? '↑' : elapsed < 4800 ? '→' : elapsed < 5800 ? '↓' : null;
        keys.setText(phase ? `[ ${phase} ]` : '');
        const v = 300 * step;
        if (phase === '↑') foe.y = Math.max(24, foe.y - v);
        if (phase === '→') foe.x = Math.min(ctx.w - 24, foe.x + v);
        if (phase === '↓') foe.y = Math.min(ctx.h - 24, foe.y + v);
        jacketGlyph(g, ctx.tint, foe.x, foe.y, 0, 22, 0.95, time);
      }
    });
    ctx.at(500, () => { t.av?.play('sweep', 0); jacket = { x: home.x + 24, y: foe.y }; });
    label(ctx, ctx.w * 0.5, ctx.h - 10, 'arrow keys drive a jacketed body at 300 px/s while held', CLT.jacketLit);
  },
};

// ── F ─────────────────────────────────────────────────────────────────

function cushionLoop(ctx: PreviewCtx, purple: boolean): void {
  const home: Mark = { x: ctx.w * 0.18, y: ctx.h * 0.55 };
  const t = tailor(ctx, home);
  const foe: Mark = { x: ctx.w * 0.66, y: ctx.h * 0.45 };
  dummy(ctx, foe);
  const max = purple ? 8 : 6;
  const cushion: Mark & { pins: number; on: boolean; squash: number } = { x: ctx.w * 0.42, y: ctx.h * 0.55, pins: max, on: false, squash: 0 };
  const pins = pinField(ctx, foe, (d) => tick(ctx, foe.x, foe.y - 18, `${d}`, CLT.steelLit));
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const shots: Mark[] = [];
  const sg = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  ctx.onFrame((dt, elapsed) => {
    cushion.squash = Math.max(0, cushion.squash - dt / 220);
    g.clear();
    sg.clear();
    if (cushion.on) {
      pincushion(g, ctx.tint, cushion.x, cushion.y, CUSHION_R, cushion.pins, max, 1, elapsed / 1000,
        { purple, squash: cushion.squash, seed: 3 });
    }
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.x -= 420 * (dt / 1000);
      sg.fillStyle(0xff8a3d, 1);
      sg.fillCircle(s.x, s.y, 5);
      if (Phaser.Math.Distance.Between(s.x, s.y, cushion.x, cushion.y) <= CUSHION_R + 10) {
        shots.splice(i, 1);
        cushion.pins = Math.min(max, cushion.pins + 1);
        cushion.squash = 0.6;
        t.fx.stab(cushion.x, cushion.y - 6, -Math.PI / 2, 1.2);
        tick(ctx, cushion.x, cushion.y - 34, '♻ +1 PIN', CLT.pinnedLit);
      }
    }
  });
  ctx.at(400, () => {
    cushion.on = true;
    t.fx.burst(cushion.x, cushion.y, 26, purple ? CLT.pinned : CLT.tomato);
    tick(ctx, cushion.x, cushion.y - 36, purple ? '🟣 PINCUSHION' : '🍅 PINCUSHION', purple ? CLT.pinnedLit : CLT.tomatoLit);
  });
  ctx.at(1100, () => { t.reach.x = cushion.x; t.reach.y = cushion.y; });
  ctx.at(1700, () => {
    cushion.pins--;
    cushion.squash = 1;
    pins.spray(cushion.x, cushion.y, 0.2, CUSHION_BARRAGE, TAU, CUSHION_PIN_DAMAGE);
    t.fx.barrage(cushion.x, cushion.y, 44, purple ? CLT.pinnedLit : CLT.clothPale);
    tick(ctx, cushion.x, cushion.y - 36, `📌 ${cushion.pins} LEFT`, CLT.tomatoLit);
  });
  if (purple) {
    ctx.at(2600, () => shots.push({ x: ctx.w - 10, y: cushion.y }));
    ctx.at(3000, () => shots.push({ x: ctx.w - 10, y: cushion.y + 4 }));
  }
  // The self-pin: the tailor hauls across the cushion.
  ctx.at(3600, () => { t.reach.x = cushion.x + 60; t.reach.y = cushion.y; t.grip = true; });
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < 3700 || elapsed > 4700) return;
    home.x += ((cushion.x - home.x) * Math.min(1, (dt / 1000) * 4));
    home.y += ((cushion.y - home.y) * Math.min(1, (dt / 1000) * 4));
  });
  ctx.at(4300, () => {
    cushion.pins--;
    t.fx.selfPin(home.x, home.y);
    t.av?.setPins(3);
    tick(ctx, home.x, home.y - 44, '📌 PINNED ×3', CLT.pinnedLit);
  });
  ctx.at(4800, () => { t.grip = false; t.reach.x = foe.x; t.reach.y = foe.y; });
  // Hit while pinned: a ring of pins and a stab back.
  ctx.at(5600, () => {
    t.fx.barrage(home.x, home.y, 40, CLT.pinnedLit);
    pins.spray(home.x, home.y, 0, 10, TAU, 4);
    t.fx.stab(foe.x, foe.y, Math.atan2(foe.y - home.y, foe.x - home.x), 1.3);
    tick(ctx, foe.x, foe.y - 30, `${RETALIATE_DAMAGE} BACK`, CLT.pinnedLit);
    t.av?.setPins(2);
  });
  ctx.at(7400, () => t.av?.setPins(0));
  label(ctx, ctx.w * 0.5, ctx.h - 10, purple
    ? '8 pins · enemy shots that reach it become pins'
    : `punch: ${CUSHION_BARRAGE} pins × ${CUSHION_PIN_DAMAGE} · walk in: pinned ×3 → each hit taken stabs back for ${RETALIATE_DAMAGE}`,
  purple ? CLT.pinnedLit : CLT.tomatoLit);
}

export const pincushionBase: PreviewScript = {
  duration: 8000, scale: 0.9, bodyTexture: '',
  caption: 'F — punch the cushion and it fires; walk into it and the pins go into you, ready to stab back',
  run(ctx) { cushionLoop(ctx, false); },
};

export const pincushionUpgraded: PreviewScript = {
  duration: 8000, scale: 0.9, bodyTexture: '',
  caption: 'F+ Recycle — a purple cushion with 8 pins, refilled by the shots that hit it',
  run(ctx) { cushionLoop(ctx, true); },
};

// ── Q ─────────────────────────────────────────────────────────────────

function fireLoop(ctx: PreviewCtx, father: boolean): void {
  const home: Mark = { x: ctx.w * 0.3, y: ctx.h * 0.58 };
  const t = tailor(ctx, home);
  const foe: Mark = { x: ctx.w * 0.82, y: ctx.h * 0.45 };
  dummy(ctx, foe);
  interface S { x: number; y: number; vx: number; vy: number; spin: number; life: number; seed: number }
  const scraps: S[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  const back = ctx.adopt(ctx.scene.add.graphics().setDepth(4.6));
  let burning = false;
  let nextScrap = 0;
  let foeBurn = 0;
  ctx.onFrame((dt, elapsed) => {
    const step = dt / 1000;
    const time = elapsed / 1000;
    g.clear();
    back.clear();
    if (burning && elapsed >= nextScrap) {
      nextScrap = elapsed + 150;
      const u = Math.random();
      scraps.push({
        x: home.x + (t.hand.x - home.x) * u, y: home.y - 14 + (t.hand.y - home.y + 14) * u,
        vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160 - 30,
        spin: Math.random() * TAU, life: 1000, seed: Math.random() * 99,
      });
    }
    for (let i = scraps.length - 1; i >= 0; i--) {
      const s = scraps[i];
      s.x += s.vx * step; s.y += s.vy * step; s.spin += step * 6; s.life -= dt;
      if (s.life <= 0) { scraps.splice(i, 1); continue; }
      burnScrap(g, ctx.tint, s.x, s.y, s.spin, 6 * (0.5 + s.life / 2000), Math.min(1, s.life / 500), time, s.seed);
    }
    if (elapsed < foeBurn) {
      for (let i = 0; i < 3; i++) flameTongue(g, ctx.tint, foe.x + (i - 1) * 9, foe.y - 6 + Math.abs(i - 1) * 4, 5, 0.85, time, i);
    }
    if (father && burning) {
      effigy(back, ctx.tint, home.x, home.y, 54, 1, time, 'back');
      effigy(g, ctx.tint, home.x, home.y, 54, 1, time, 'front');
    }
  });
  ctx.at(500, () => {
    burning = true;
    t.burn = true;
    t.char = father;
    if (father) { t.maxReach = 2400; t.av?.setRigScale(1.35); }
    t.av?.play('raise');
    t.fx.ignite(home.x, home.y, father ? 120 : 80);
    tick(ctx, home.x, home.y - 70, father ? '🔥 FATHER OF THE FLAME' : '🔥 BURNING MAN', CLT.ember);
  });
  // The scarf whips round so its scraps fan out.
  ctx.onFrame((_dt, elapsed) => {
    if (elapsed < 900 || elapsed > 3200) return;
    const a = (elapsed - 900) / 500;
    t.reach.x = home.x + Math.cos(a) * 150;
    t.reach.y = home.y + Math.sin(a) * 90;
  });
  ctx.at(3300, () => { t.reach.x = foe.x; t.reach.y = foe.y; });
  ctx.at(3900, () => {
    t.av?.play('punch', Math.atan2(foe.y - home.y, foe.x - home.x));
    t.fx.embers(foe.x, foe.y, 8, 18);
    foeBurn = 6500;
    tick(ctx, foe.x, foe.y - 20, father ? `${PUNCH_DAMAGE + CLAW_PUNCH_BONUS} 🔥` : `${SCRAP_DAMAGE} 🔥`, CLT.ember);
  });
  ctx.at(6500, () => {
    burning = false;
    t.burn = false;
    t.char = false;
    t.maxReach = HAND_MAX;
    t.av?.setRigScale(1);
    t.fx.embers(home.x, home.y, 10, 26);
  });
  label(ctx, ctx.w * 0.5, ctx.h - 10, father
    ? 'a towering effigy · the char claw reaches anywhere · whoever hurts you burns'
    : '6s · burning scraps · red-hot needles · bound bodies burn · the cushion spits pins until empty',
  CLT.ember);
}

export const burningMan: PreviewScript = {
  duration: 7600, scale: 0.9, bodyTexture: '',
  caption: 'Q — the tailor\'s clothes catch fire and the scarf sheds burning scraps',
  run(ctx) { fireLoop(ctx, false); },
};

export const burningManUpgraded: PreviewScript = {
  duration: 7600, scale: 0.9, bodyTexture: '',
  caption: 'Q+ Father of the Flame — a burning effigy whose char claw reaches the whole arena',
  run(ctx) { fireLoop(ctx, true); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const theScarfHand: PreviewScript = {
  duration: 7000, scale: 0.9, bodyTexture: '',
  caption: 'No legs: grip the floor or a wall and drag the mouse — the scarf hauls the body the other way',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.5, y: ctx.h * 0.6 };
    const t = tailor(ctx, home);
    const wall: Mark = { x: ctx.w - 16, y: ctx.h * 0.4 };
    const floor: Mark = { x: ctx.w * 0.25, y: ctx.h * 0.75 };
    const plan: [number, Mark, number][] = [[400, floor, 2600], [3200, wall, 6400]];
    for (const [at, grip, until] of plan) {
      ctx.at(at, () => { t.reach.x = grip.x; t.reach.y = grip.y; });
      ctx.at(at + 400, () => {
        t.grip = true;
        t.fx.grip(grip.x, grip.y, grip === wall);
        tick(ctx, grip.x - (grip === wall ? 30 : 0), grip.y - 24, grip === wall ? '✊ WALL ×1.35' : '✊ FLOOR', CLT.clothPale);
      });
      ctx.onFrame((dt, elapsed) => {
        if (elapsed < at + 500 || elapsed > until) return;
        const d = Phaser.Math.Distance.Between(home.x, home.y, grip.x, grip.y);
        if (d <= 40) return;
        const step = Math.min(d - 40, 560 * (grip === wall ? 0.6 : 0.45) * (dt / 1000));
        home.x += ((grip.x - home.x) / d) * step;
        home.y += ((grip.y - home.y) / d) * step;
      });
      ctx.at(until, () => { t.grip = false; });
    }
    label(ctx, ctx.w * 0.5, ctx.h - 10, 'reach 250px · ×1 off the floor, ×1.35 off a wall · 560 px/s cap', CLT.clothPale);
  },
};

export const theSmack: PreviewScript = {
  duration: 5000, scale: 0.9, bodyTexture: '',
  caption: 'Whip the scarf hand over somebody and it smacks them — no cooldown',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.3, y: ctx.h * 0.55 };
    const t = tailor(ctx, home);
    const foe: Mark = { x: ctx.w * 0.58, y: ctx.h * 0.5 };
    dummy(ctx, foe);
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 400) return;
      const a = (elapsed - 400) / 260;
      t.reach.x = foe.x + Math.cos(a) * 80;
      t.reach.y = foe.y + Math.sin(a) * 50;
    });
    let gate = 0;
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < gate) return;
      if (Math.hypot(t.handV.x, t.handV.y) < SMACK_SPEED) return;
      if (Phaser.Math.Distance.Between(t.hand.x, t.hand.y, foe.x, foe.y) > 32) return;
      gate = elapsed + 520;
      t.fx.lint(foe.x, foe.y, 6, 16);
      tick(ctx, foe.x, foe.y - 18, `${SMACK_DAMAGE}`, CLT.clothLit);
    });
    label(ctx, ctx.w * 0.5, ctx.h - 10, '14 per pass · hand over 620 px/s · once per body every 0.52s', CLT.clothLit);
  },
};
