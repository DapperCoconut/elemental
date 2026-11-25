import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  EMO, EmotionAvatar, EmotionFx, PLAYER_SIDE_COLOR, TroopKind,
  drawArrow, drawEuphoriaCharge, drawGrandStandard, drawMusterSeals, drawOrderLine, drawRallyRing, drawTears,
  drawTroop, drawTroopHp,
} from '../../../elements/kits/EmotionVisuals';

/**
 * Emotion's showcases (the element keeps the id `conquest`).
 *
 * Each loop stages the kit's own painters and `EmotionFx` bursts at the kit's numbers. Nothing
 * here runs `EmotionKit`: the timings below are its constants, replayed. Where the real thing
 * takes longer than a loop can (the six-second muster, the eight seconds of crying) the clock is
 * compressed and the caption carries the true figure.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const STAB_REACH = 210;
const STAB_DMG = 14;
const RILE_WAVE_MS = 450;
const RILE_RING = 52;
const RISE_MS = 520;
const KNIGHT_DMG = 4;
const KNIGHT_ATK_MS = 800;
const SWING_MS = 260;
const DEPRESS_LEN = 250;
const DEPRESS_HALF = 0.52;
const DEPRESS_DMG = 8;
const EUPHORIA_CHARGE_MS = 1000;
const EUPHORIA_LEN = 320;
const EUPHORIA_DASH_MS = 240;
const EUPHORIA_DMG = 38;
const RALLY_R = 230;
const SLAM_R = 170;
const SLAM_DMG = 45;
const MUSTER: TroopKind[] = ['knight', 'knight', 'knight', 'archer', 'archer', 'barbarian'];
const BODY_R = 20;

type Pt = { x: number; y: number };
type Gfx = Phaser.GameObjects.Graphics;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): EmotionFx {
  return ctx.capture(() => new EmotionFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The commander's rig, or null when a skin has replaced the character. */
function stand(ctx: PreviewCtx): EmotionAvatar | null {
  const made = ctx.useAvatar(() => new EmotionAvatar(ctx.scene, ctx.tint));
  const av = made instanceof EmotionAvatar ? made : null;
  av?.setFacing(ctx.aim);
  return av;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** A damage number. */
function float(ctx: PreviewCtx, x: number, y: number, text: string, size = 11, color = 0xff5a4a): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color: hex(color), stroke: '#050506', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 800 });
}

/** The three layers the kit paints on: floor, soldiers, and over everything. */
function layers(ctx: PreviewCtx): { ground: Gfx; unit: Gfx; air: Gfx } {
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3.3));
  const unit = ctx.adopt(ctx.scene.add.graphics().setDepth(5.4));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9.2));
  ctx.onFrame(() => { ground.clear(); unit.clear(); air.clear(); });
  return { ground, unit, air };
}

interface Victim extends Pt { crying: boolean; alpha: number }

/** A training dummy that can be moved, and can be made to cry. */
function victim(ctx: PreviewCtx, start: Pt): Victim {
  const v: Victim = { ...start, crying: false, alpha: 1 };
  const body = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const over = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  ctx.onFrame((_dt, e) => {
    body.clear();
    over.clear();
    if (v.alpha <= 0.01) return;
    body.fillStyle(0x2b2f3d, v.alpha); body.fillCircle(v.x, v.y, BODY_R);
    body.fillStyle(0x3c4254, v.alpha); body.fillCircle(v.x, v.y, 13);
    body.fillStyle(0x8e97ad, 0.9 * v.alpha); body.fillCircle(v.x - 5, v.y - 4, 3.2); body.fillCircle(v.x + 5, v.y - 4, 3.2);
    if (v.crying) drawTears(over, v.x, v.y - 2, BODY_R * 0.95, e / 1000, 0.95);
  });
  return v;
}

interface Unit extends Pt {
  kind: TroopKind;
  born: number;
  ang: number;
  swingAt: number;
  hp: number;
  max: number;
  ecstaticUntil: number;
  enraged: boolean;
  rallied: boolean;
  held: boolean;
  gone: boolean;
  seed: number;
  moving: boolean;
}

const UNIT_HP: Record<TroopKind, number> = { knight: 30, archer: 8, barbarian: 60 };
const UNIT_R: Record<TroopKind, number> = { knight: 10, archer: 9, barbarian: 16 };

function unit(kind: TroopKind, at: Pt, born = -2000, seed = 1): Unit {
  return {
    ...at, kind, born, ang: 0, swingAt: -1, hp: UNIT_HP[kind], max: UNIT_HP[kind], ecstaticUntil: -1,
    enraged: false, rallied: false, held: false, gone: false, seed, moving: false,
  };
}

/** Paint a soldier the way the kit does: rising for 520ms, swinging for 260ms after `swingAt`. */
function paintUnit(ctx: PreviewCtx, g: Gfx, air: Gfx, u: Unit, e: number): void {
  if (u.gone || e < u.born) return;
  const swingMs = u.kind === 'archer' ? 450 : SWING_MS;
  const swing = u.swingAt >= 0 && e - u.swingAt < swingMs ? Math.max(0.01, (e - u.swingAt) / swingMs) : 0;
  const ecstatic = e < u.ecstaticUntil;
  drawTroop(g, ctx.tint, u.kind, u.x, u.y, PLAYER_SIDE_COLOR, {
    ang: u.ang, march: u.seed + (u.moving ? e / 110 : 0), swing, birth: Math.min(1, (e - u.born) / RISE_MS),
    alpha: 1, t: e / 1000, ecstatic, enraged: u.enraged, rallied: u.rallied, held: u.held,
  });
  if (e - u.born > RISE_MS * 0.6) {
    const w = u.kind === 'barbarian' ? 30 : 18;
    drawTroopHp(air, u.x, u.y - UNIT_R[u.kind] * 2 - (u.kind === 'knight' ? 16 : 12), w,
      Math.min(u.hp, u.max) / u.max, Math.max(0, u.hp - u.max) / u.max, PLAYER_SIDE_COLOR, 0.95);
  }
}

/** Walk a point to `to` between `from` and `from + ms` into the loop. */
function walk(ctx: PreviewCtx, p: Pt & { moving?: boolean }, to: Pt, from: number, ms: number): void {
  let a: Pt | null = null;
  let done = false;
  ctx.onFrame((_dt, e) => {
    if (done || e < from) return;
    if (!a) a = { x: p.x, y: p.y };
    const k = Phaser.Math.Clamp((e - from) / ms, 0, 1);
    p.x = a.x + (to.x - a.x) * k;
    p.y = a.y + (to.y - a.y) * k;
    p.moving = k < 1;
    if (k >= 1) done = true;
  });
}

// ══ PASSIVE — Soldiers ═════════════════════════════════════════════════

export const passiveSoldiers: PreviewScript = {
  duration: 7200,
  caption: 'Soldiers — each guards a post. Click one and drag: drop it on open floor for a new post, or on an enemy to send it after them',
  run(ctx) {
    stand(ctx);
    const { ground, unit: ug, air } = layers(ctx);
    void ground;
    const v = victim(ctx, { x: ctx.tx + 40, y: ctx.cy - 8 });
    const a = unit('knight', { x: ctx.cx + 60, y: ctx.cy - 28 }, -2000, 1);
    const b = unit('knight', { x: ctx.cx + 66, y: ctx.cy + 30 }, -2000, 4);
    const cursor = { x: a.x, y: a.y };
    let dragging: Unit | null = null;
    let attack = false;
    // First order: a new post, on open floor.
    const post = { x: ctx.cx + 170, y: ctx.cy - 40 };
    ctx.at(500, () => { dragging = a; a.held = true; attack = false; cursor.x = a.x; cursor.y = a.y; });
    walk(ctx, cursor, post, 500, 900);
    ctx.at(1500, () => { dragging = null; a.held = false; });
    walk(ctx, a, post, 1500, 1100);
    // Second order: dropped on the enemy.
    ctx.at(3000, () => { dragging = b; b.held = true; attack = false; cursor.x = b.x; cursor.y = b.y; });
    walk(ctx, cursor, { x: v.x, y: v.y }, 3000, 900);
    ctx.at(3800, () => { attack = true; });
    ctx.at(4000, () => { dragging = null; b.held = false; });
    walk(ctx, b, { x: v.x - BODY_R - 16, y: v.y + 6 }, 4000, 1500);
    for (let t = 5600; t < 7000; t += KNIGHT_ATK_MS) {
      ctx.at(t, () => { b.swingAt = t; });
      ctx.at(t + 110, () => float(ctx, v.x + 14, v.y - 24, `-${KNIGHT_DMG}`, 10));
    }
    ctx.onFrame((_dt, e) => {
      a.ang = a.moving ? Math.atan2(post.y - a.y, post.x - a.x) : 0;
      b.ang = Math.atan2(v.y - b.y, v.x - b.x);
      for (const u of [a, b].sort((p, q) => p.y - q.y)) paintUnit(ctx, ug, air, u, e);
      if (dragging) drawOrderLine(air, dragging.x, dragging.y, cursor.x, cursor.y, e / 1000, attack);
    });
  },
};

// ══ Click — Stab ═══════════════════════════════════════════════════════

export const stab: PreviewScript = {
  duration: 2600,
  caption: 'Click — thrust the pike and its flag 210px for 14 damage, through everything on the line',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const near = victim(ctx, { x: ctx.cx + 110, y: ctx.cy });
    const far = victim(ctx, { x: ctx.cx + STAB_REACH - 22, y: ctx.cy });
    for (const t of [500, 1100, 1700]) {
      ctx.at(t, () => {
        const c = ctx.casterAt();
        fx.thrust(c.x, c.y, ctx.aim, STAB_REACH, t);
        av?.hidePike(260);
        av?.play('punch', ctx.aim);
      });
      ctx.at(t + 80, () => {
        float(ctx, near.x, near.y - 26, `-${STAB_DMG}`);
        float(ctx, far.x, far.y - 26, `-${STAB_DMG}`);
      });
    }
  },
};

// ══ E — Rile ═══════════════════════════════════════════════════════════

export const rile: PreviewScript = {
  duration: 5600,
  caption: 'E — wave the flag: three knights rise (30 HP each) and slash any enemy that comes near for 4 a swing',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const { unit: ug, air } = layers(ctx);
    const v = victim(ctx, { x: ctx.w - 50, y: ctx.cy });
    const knights: Unit[] = [];
    ctx.at(400, () => {
      const c = ctx.casterAt();
      av?.play('raise');
      fx.call(c.x, c.y, RILE_RING + 34);
    });
    ctx.at(400 + RILE_WAVE_MS, () => {
      const c = ctx.casterAt();
      for (let i = 0; i < 3; i++) {
        const a = ctx.aim + (i - 1) * 0.95;
        const at = { x: c.x + Math.cos(a) * RILE_RING, y: c.y + Math.sin(a) * RILE_RING };
        knights.push(unit('knight', at, 400 + RILE_WAVE_MS, i * 2.1 + 1));
        fx.rise(at.x, at.y, 14);
      }
    });
    // The enemy wanders into their guard and is cut down for it.
    const meet = { x: ctx.cx + 150, y: ctx.cy };
    walk(ctx, v, meet, 1900, 1100);
    ctx.at(2600, () => knights.forEach((k, i) => walk(ctx, k, { x: meet.x - 34 - (i === 1 ? 4 : 0), y: meet.y + (i - 1) * 24 }, 2600, 500)));
    for (let t = 3200; t < 5300; t += KNIGHT_ATK_MS) {
      ctx.at(t, () => {
        knights.forEach((k) => { k.swingAt = t; });
      });
      ctx.at(t + 110, () => float(ctx, v.x + 16, v.y - 26, `-${KNIGHT_DMG * 3}`));
    }
    ctx.onFrame((_dt, e) => {
      for (const k of [...knights].sort((p, q) => p.y - q.y)) {
        k.ang = Math.atan2(v.y - k.y, v.x - k.x);
        paintUnit(ctx, ug, air, k, e);
      }
    });
  },
};

// ══ R — Depress ════════════════════════════════════════════════════════

export const depress: PreviewScript = {
  duration: 5200,
  caption: 'R — a 250px cone of cold for 8. Depressed for 8s: crying, 25% slower, shots fizzle after 0.65s, and up to +50% damage taken the healthier you are than them',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const v = victim(ctx, { x: ctx.cx + 190, y: ctx.cy });
    const shotG = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    const shots: { x: number; born: number; done: boolean }[] = [];
    ctx.at(500, () => {
      const c = ctx.casterAt();
      av?.flareCape();
      av?.play('sweep', ctx.aim);
      fx.coldBlast(c.x, c.y, ctx.aim, DEPRESS_HALF, DEPRESS_LEN);
    });
    ctx.at(760, () => {
      v.crying = true;
      fx.gloom(v.x, v.y);
      float(ctx, v.x, v.y - 26, `-${DEPRESS_DMG}`);
    });
    // Their shots give up on the way over.
    for (const t of [1900, 2900, 3900]) ctx.at(t, () => shots.push({ x: v.x - BODY_R, born: t, done: false }));
    ctx.onFrame((dt, e) => {
      shotG.clear();
      for (const s of shots) {
        if (s.done) continue;
        s.x -= (260 * dt) / 1000;
        if (e - s.born >= 650) { s.done = true; fx.fizzle(s.x, ctx.cy - 2); continue; }
        const k = (e - s.born) / 650;
        shotG.fillStyle(k > 0.6 ? EMO.gloom : 0xffa040, 1 - k * 0.4);
        shotG.fillCircle(s.x, ctx.cy - 2 + k * k * 5, 6 - k * 2);
        shotG.fillStyle(0xffa040, 0.3 * (1 - k));
        shotG.fillEllipse(s.x + 10, ctx.cy - 2, 20, 7);
      }
    });
  },
};

// ══ F — Euphoria ═══════════════════════════════════════════════════════

export const euphoria: PreviewScript = {
  duration: 6200,
  caption: 'F — 1s wind-up, then a 320px charge for 38 through everything. Soldiers within 220px turn ecstatic for 4s: +10 HP over their maximum, 80% faster feet and blades',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const { ground, unit: ug, air } = layers(ctx);
    const v = victim(ctx, { x: ctx.cx + 180, y: ctx.cy });
    const knights = [
      unit('knight', { x: ctx.cx - 6, y: ctx.cy - 50 }, -2000, 1),
      unit('knight', { x: ctx.cx + 44, y: ctx.cy + 48 }, -2000, 3),
    ];
    const START = 500;
    const GO = START + EUPHORIA_CHARGE_MS;
    const home = { x: ctx.cx, y: ctx.cy };
    const end = { x: ctx.cx + EUPHORIA_LEN, y: ctx.cy };
    ctx.at(GO, () => {
      av?.play('dash', ctx.aim);
      ctx.glideCaster({ from: home, to: end, ms: EUPHORIA_DASH_MS, ease: 'linear', onDone: () => fx.dashTrail(home.x, home.y, end.x, end.y) });
      for (const k of knights) { k.ecstaticUntil = GO + 4000; k.hp = k.max + 10; fx.joy(k.x, k.y - 4, 10); }
    });
    ctx.at(GO + 130, () => { float(ctx, v.x, v.y - 26, `-${EUPHORIA_DMG}`, 13); fx.spark(v.x, v.y, EMO.joy, 7); });
    // Ecstatic: they cross the floor and cut twice as fast as they did.
    ctx.at(GO + 300, () => knights.forEach((k, i) => walk(ctx, k, { x: v.x - 30, y: v.y + (i ? 22 : -22) }, GO + 300, 650)));
    for (let t = GO + 1000; t < 5400; t += Math.round(KNIGHT_ATK_MS / 1.8)) {
      ctx.at(t, () => knights.forEach((k) => { k.swingAt = t; }));
      ctx.at(t + 110, () => float(ctx, v.x + 16, v.y - 26, `-${KNIGHT_DMG * 2}`, 10));
    }
    ctx.at(5500, () => ctx.moveCaster(home.x, home.y));
    ctx.onFrame((_dt, e) => {
      const c = ctx.casterAt();
      const k = Phaser.Math.Clamp((e - START) / EUPHORIA_CHARGE_MS, 0, 1);
      if (e >= START && e < GO) drawEuphoriaCharge(ground, c.x, c.y, ctx.aim, EUPHORIA_LEN, k, e / 1000);
      av?.setCharge(e >= START && e < GO + EUPHORIA_DASH_MS ? k : 0);
      for (const u of [...knights].sort((p, q) => p.y - q.y)) {
        u.ang = Math.atan2(v.y - u.y, v.x - u.x);
        paintUnit(ctx, ug, air, u, e);
      }
    });
  },
};

// ══ Q — Maximum Nationalism ════════════════════════════════════════════

export const nationalism: PreviewScript = {
  duration: 9000,
  scale: 0.8,
  caption: 'Q — hold the grand standard: no attacks, 35% less damage taken, 30% faster; soldiers within 230px deal +50% and take 35% less. Q again: a 45 damage slam in 170px, then 3 knights, 2 archers and the Barbarian over 6s',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const { ground, unit: ug, air } = layers(ctx);
    const v = victim(ctx, { x: ctx.cx + 150, y: ctx.cy });
    const guard = unit('knight', { x: ctx.cx + 60, y: ctx.cy + 34 }, -2000, 2);
    const called: Unit[] = [];
    const RAISE = 400;
    const SLAM = 2400;
    const EVERY = 800;             // the kit's second, compressed
    let planted: Pt | null = null;
    const arrows: { x: number; y: number; ang: number; until: number }[] = [];
    ctx.at(RAISE, () => {
      const c = ctx.casterAt();
      av?.setStandard(true);
      av?.play('raise');
      fx.call(c.x, c.y, RALLY_R);
      guard.rallied = true;
    });
    for (const t of [1100, 1900]) {
      ctx.at(t, () => { guard.swingAt = t; });
      ctx.at(t + 110, () => float(ctx, v.x - 10, v.y - 26, `-${KNIGHT_DMG * 1.5}`, 10));
    }
    ctx.at(SLAM, () => {
      const c = ctx.casterAt();
      av?.setStandard(false);
      av?.play('slam');
      guard.rallied = false;
      planted = { x: c.x, y: c.y + 14 };
      fx.slam(c.x, c.y + 14, SLAM_R);
      float(ctx, v.x, v.y - 28, `-${SLAM_DMG}`, 14);
    });
    MUSTER.forEach((kind, i) => {
      const t = SLAM + (i + 1) * EVERY;
      ctx.at(t, () => {
        if (!planted) return;
        const a = -Math.PI / 2 + (i / MUSTER.length) * Math.PI * 2;
        const at = { x: planted.x + Math.cos(a) * 44, y: planted.y - 8 + Math.sin(a) * 31 };
        called.push(unit(kind, at, t, i * 1.7));
        fx.rise(at.x, at.y, kind === 'barbarian' ? 22 : 14);
      });
    });
    // The archers, once they are up, start in on the enemy.
    for (const t of [SLAM + 5 * EVERY + 700, SLAM + 6 * EVERY + 700]) {
      ctx.at(t, () => {
        for (const u of called.filter((c) => c.kind === 'archer')) {
          u.swingAt = t;
          ctx.at(t + 450, () => arrows.push({ x: u.x, y: u.y - 4, ang: Math.atan2(v.y - u.y, v.x - u.x), until: t + 450 + 260 }));
        }
      });
    }
    ctx.onFrame((dt, e) => {
      const c = ctx.casterAt();
      if (e >= RAISE && e < SLAM) drawRallyRing(ground, ctx.tint, c.x, c.y, RALLY_R, e / 1000, 1);
      if (planted) {
        const since = e - SLAM;
        const n = Math.min(MUSTER.length, Math.floor(since / EVERY));
        if (n < MUSTER.length) drawMusterSeals(ground, ctx.tint, planted.x, planted.y, n, MUSTER.length, (since % EVERY) / EVERY, e / 1000);
        drawGrandStandard(ug, ctx.tint, planted.x, planted.y, 72, e / 1000, 3, 1, 1, true);
      }
      for (const u of [guard, ...called].sort((p, q) => p.y - q.y)) {
        u.ang = Math.atan2(v.y - u.y, v.x - u.x);
        paintUnit(ctx, ug, air, u, e);
      }
      for (const a of arrows) {
        if (e > a.until) continue;
        a.x += (Math.cos(a.ang) * 560 * dt) / 1000;
        a.y += (Math.sin(a.ang) * 560 * dt) / 1000;
        drawArrow(air, ctx.tint, a.x, a.y, a.ang, 1);
      }
    });
  },
};
