import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import { AIR, AirAvatar, AirFx, drawAirKnife } from '../../../elements/kits/AirVisuals';
import {
  FieldKnife, SparkPoint,
  beyBurst, coverBurst, drawBey, drawCloud, drawCover, drawDaggerField, drawLevitation, drawScar,
  drawSparkTrail, drawStealthGauge, drawStealthWisps, drawTimingRing, drawWinded, flipBurst, jabFlick,
  knifeHit, knockBlast, pierceBurst, ringVerdict, shredSparks,
} from '../../../elements/kits/AirBladeVisuals';

/**
 * The assassin's showcases.
 *
 * Each loop stages the kit's own painters (`AirBladeVisuals`) and the rig at the kit's numbers.
 * Nothing here runs `AirKit`: the figures below are its constants, replayed. Where the real
 * thing takes longer than a loop can (stealth banking, cover decay) the clock is compressed and
 * the caption carries the true figure.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const STEALTH_MAX = 100;
const STEALTH_PER_S = 12;
const CLOUD_FLAT = 0.62;
const CLOUD_SPEED = 18;
const CLOUD_FLEE_SPEED = 900;
const CLOUD_SHOT_SPEED = 0.25;
const PIERCE_DAMAGE = 14;
const PIERCE_DAMAGE_PER_STEALTH = 0.36;
const PIERCE_LUNGE = 50;
const PIERCE_LUNGE_PER_STEALTH = 2.3;
const PIERCE_LUNGE_SPEED = 1500;
const PIERCE_REACH = 62;
const SCAR_MS = 2600;
const JAB_HOLD_MS = 260;
const JAB_EVERY_MS = 110;
const JAB_DAMAGE = 3;
const JAB_REACH = 82;
const JAB_HALF = 0.34;
const KNOCK_RANGE = 100;
const KNOCK_HALF = 0.62;
const KNOCK_DAMAGE = 10;
const KNOCK_SHOVE = 380;
const KNOCK_SHOVE_MS = 170;
const WINDED_MS = 6000;
const STAMINA_DRAIN_S = 2.2;
const STAMINA_REFILL_S = 1.6;
const EXHAUSTED_SPEED = 0.3;
const COVER_HP = 25;
const COVER_DECAY = 5;
const COVER_SELF_ALPHA = 0.42;
const VOLLEY_KNIVES = 6;
const VOLLEY_SPREAD = 0.2;
const VOLLEY_SPEED = 900;
const VOLLEY_RANGE = 640;
const VOLLEY_DAMAGE = 6;
const VOLLEY_STAGGER_MS = 40;
const RING_DELAY_MS = 280;
const RING_MS = 560;
const RING_R0 = 96;
const RING_MARK_R = 26;
const RING_EARLY_MS = 150;
const RING_LATE_MS = 110;
const LEVITATE_MS = 3000;
const LEVITATE_LIFT = 78;
const FIELD_COLS = 4;
const FIELD_ROWS = 3;
const FIELD_HALF_W = 80;
const FIELD_HALF_H = 54;
const FIELD_STRIKE_AT_MS = 240;
const FIELD_STEP_DAMAGE = 5;
const FIELD_STEP_MS = 350;
const BEY_STAMINA = 6;
const BEY_ACCEL = 1700;
const BEY_MAX_SPEED = 640;
const BEY_DRAG = 1.2;
const BEY_RADIUS = 30;
const BEY_WALL_BOUNCE = 0.8;
const BEY_SHRED_MS = 900;
const BEY_TICK_MS = 100;
const BEY_TICK_DAMAGE = 4;
const BEY_SHRED_SPEED = 0.12;
const BEY_LAUNCH_SPEED = 720;
const BEY_REHIT_MS = 600;
const BEY_ORBIT_R = 46;
const BEY_ORBIT_DAMAGE = 6;
const BEY_TRAIL_MS = 650;
const BODY_R = 20;

type Pt = { x: number; y: number };
type Gfx = Phaser.GameObjects.Graphics;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): AirFx {
  return ctx.capture(() => new AirFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The assassin, plus the Air rig itself when no skin has replaced the character. */
function stand(ctx: PreviewCtx): { av: BaseAvatar; rig: AirAvatar | null } {
  const av = ctx.useAvatar(() => new AirAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { av, rig: av instanceof AirAvatar ? av : null };
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** A damage number. */
function float(ctx: PreviewCtx, x: number, y: number, text: string, size = 11, color = 0xff5a4a): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color: hex(color), stroke: '#050506', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 800 });
}

/** The kit's three layers: the floor, over the fighters, and the sky the clouds sit in. */
function layers(ctx: PreviewCtx): { ground: Gfx; air: Gfx; sky: Gfx } {
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(8.5));
  const sky = ctx.adopt(ctx.scene.add.graphics().setDepth(9.5));
  ctx.onFrame(() => { ground.clear(); air.clear(); sky.clear(); });
  return { ground, air, sky };
}

/** A training dummy that can be moved. */
function victim(ctx: PreviewCtx, start: Pt): Pt {
  const v = { ...start };
  const body = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    body.clear();
    body.fillStyle(0x2b2f3d, 1); body.fillCircle(v.x, v.y, BODY_R);
    body.fillStyle(0x3c4254, 1); body.fillCircle(v.x, v.y, 13);
    body.fillStyle(0x8e97ad, 0.9); body.fillCircle(v.x - 5, v.y - 4, 3.2); body.fillCircle(v.x + 5, v.y - 4, 3.2);
  });
  return v;
}

/** Walk a point to `to` between `from` and `from + ms` into the loop. */
function walk(ctx: PreviewCtx, p: Pt, to: Pt, from: number, ms: number): void {
  let a: Pt | null = null;
  ctx.onFrame((_dt, e) => {
    if (e < from || e > from + ms + 40) return;
    if (!a) a = { x: p.x, y: p.y };
    const k = Phaser.Math.Clamp((e - from) / ms, 0, 1);
    p.x = a.x + (to.x - a.x) * k;
    p.y = a.y + (to.y - a.y) * k;
  });
}

/** The rain's twelve knives, laid out exactly as the kit lays them. */
function fieldKnives(): FieldKnife[] {
  const out: FieldKnife[] = [];
  for (let cx = 0; cx < FIELD_COLS; cx++) {
    for (let cy = 0; cy < FIELD_ROWS; cy++) {
      out.push({
        dx: ((cx + 0.5) / FIELD_COLS - 0.5) * 2 * (FIELD_HALF_W - 14),
        dy: ((cy + 0.5) / FIELD_ROWS - 0.5) * 2 * (FIELD_HALF_H - 12),
        lean: (((cx * 7 + cy * 13) % 5) - 2) * 0.06,
        delay: cx * 35 + cy * 20,
      });
    }
  }
  return out;
}

const inField = (f: Pt, p: Pt): boolean =>
  Math.abs(p.x - f.x) <= FIELD_HALF_W && Math.abs(p.y - f.y) <= FIELD_HALF_H;

// ══ PASSIVE — Clouds ═══════════════════════════════════════════════════

export const passiveClouds: PreviewScript = {
  duration: 6400,
  scale: 0.8,
  caption: 'Passive — her clouds crawl the arena: solid to the enemy, a veil to her. Inside one she banks 12 stealth a second (dodge up to 33%), and enemy shots crossing one keep a quarter of their speed',
  run(ctx) {
    const fx = fxOf(ctx);
    const { av } = stand(ctx);
    const { air, sky } = layers(ctx);
    const clouds = [
      { x: ctx.cx - 20, y: ctx.cy + 4, r: 105, seed: 3, solid: false, label: 'HER VIEW' },
      { x: ctx.cx + 420, y: ctx.cy - 6, r: 118, seed: 11, solid: true, label: "THE ENEMY'S VIEW" },
    ];
    for (const c of clouds) {
      const t = ctx.adopt(ctx.scene.add.text(c.x, c.y - c.r * 0.85, c.label, {
        fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: hex(ctx.tint(AIR.steel)),
      }).setOrigin(0.5).setDepth(12));
      ctx.onFrame(() => t.setX(c.x));
    }
    victim(ctx, { x: ctx.w - 46, y: ctx.cy - 40 });
    const inside = (p: Pt): boolean => clouds.some((c) =>
      ((p.x - c.x) / c.r) ** 2 + ((p.y - c.y) / (c.r * CLOUD_FLAT)) ** 2 <= 1);
    // An enemy shot, aimed high: it misses her, but both clouds take the pace out of it.
    let shot: Pt | null = null;
    ctx.at(500, () => { shot = { x: ctx.w - 70, y: ctx.cy - 40 }; });
    ctx.onFrame((dt, e) => {
      const t = e / 1000;
      for (const c of clouds) {
        c.x += (CLOUD_SPEED * dt) / 1000;
        drawCloud(sky, ctx.tint, c.x, c.y, c.r, t, c.seed, c.solid, 1);
      }
      const stealth01 = Math.min(1, (t * STEALTH_PER_S) / STEALTH_MAX);
      av.setIntensity(1 + stealth01 * 0.3);
      drawStealthWisps(air, ctx.tint, ctx.cx, ctx.cy, stealth01, t, 1);
      drawStealthGauge(air, ctx.tint, ctx.cx, ctx.cy, stealth01, true, t, 1);
      if (shot) {
        const s: Pt = shot;
        const slow = inside(s);
        s.x -= ((slow ? CLOUD_SHOT_SPEED : 1) * 420 * dt) / 1000;
        if (s.x < 12) { fx.motes(s.x, s.y, 4, { speed: 60, life: 260 }); shot = null; return; }
        air.fillStyle(ctx.tint(AIR.steel), 0.35);
        air.fillEllipse(s.x + (slow ? 6 : 16), s.y, slow ? 14 : 32, 6);
        air.fillStyle(ctx.tint(AIR.slate), 1);
        air.fillCircle(s.x, s.y, 6);
        air.lineStyle(1.5, ctx.tint(AIR.white), 0.9);
        air.strokeCircle(s.x, s.y, 6);
      }
    });
  },
};

// ══ Click — Pierce the Skies ═══════════════════════════════════════════

const STAB_POWER = 0.9;
const STAB_LUNGE = PIERCE_LUNGE + STAB_POWER * STEALTH_MAX * PIERCE_LUNGE_PER_STEALTH;
const STAB_DMG = Math.round(PIERCE_DAMAGE + STAB_POWER * STEALTH_MAX * PIERCE_DAMAGE_PER_STEALTH);

export const pierce: PreviewScript = {
  duration: 5800,
  caption: `Click — a stab scaled by stealth, and it spends all of it: at 90 she lunges ${Math.round(STAB_LUNGE)}px for ${STAB_DMG} and tears her clouds away. Hold for a barrage of ${JAB_DAMAGE}-damage jabs`,
  run(ctx) {
    const fx = fxOf(ctx);
    const { av, rig } = stand(ctx);
    const { ground, air, sky } = layers(ctx);
    const home = { x: ctx.cx, y: ctx.cy };
    const len = STAB_LUNGE + PIERCE_REACH;
    const v = victim(ctx, { x: home.x + STAB_LUNGE + 44, y: ctx.cy });
    const FILL_MS = 2000;           // 90 stealth is 7.5s in a cloud; compressed
    const STAB = 2300;
    const cloud = { x: home.x - 10, y: home.y + 4 };

    ctx.at(STAB - 160, () => rig?.setKnife(1));
    ctx.at(STAB, () => {
      av.play('punch', ctx.aim, 420);
      pierceBurst(fx, ctx.tint, home.x, home.y, ctx.aim, len, STAB_POWER, false);
      ctx.glideCaster({
        from: home, to: { x: home.x + STAB_LUNGE, y: home.y }, ms: (STAB_LUNGE / PIERCE_LUNGE_SPEED) * 1000, ease: 'out',
      });
    });
    ctx.at(STAB + 70, () => float(ctx, v.x, v.y - 28, `-${STAB_DMG}`, 15));
    ctx.at(STAB + 380, () => rig?.setKnife(0));

    // The held barrage, from where the lunge left her.
    const HOLD = STAB + 900;
    ctx.at(HOLD, () => rig?.setKnife(1));
    for (let i = 0, t = HOLD + JAB_HOLD_MS; t < HOLD + JAB_HOLD_MS + 1100; t += JAB_EVERY_MS, i++) {
      const a = ctx.aim + ((i % 3) - 1) * JAB_HALF * 0.6;
      ctx.at(t, () => {
        const c = ctx.casterAt();
        av.play('punch', a, 130);
        jabFlick(fx, ctx.tint, c.x, c.y, a, JAB_REACH);
        float(ctx, v.x + ((i % 3) - 1) * 8, v.y - 26, `-${JAB_DAMAGE}`, 9);
      });
    }
    ctx.at(HOLD + JAB_HOLD_MS + 1150, () => rig?.setKnife(0));
    ctx.at(5200, () => ctx.glideCaster({ to: home, ms: 400, ease: 'out' }));

    ctx.onFrame((_dt, e) => {
      const t = e / 1000;
      const c = ctx.casterAt();
      const stealth01 = e < STAB ? Math.min(STAB_POWER, (e / FILL_MS) * STAB_POWER) : 0;
      av.setIntensity(1 + stealth01 * 0.3);
      if (e < STAB) {
        drawCloud(sky, ctx.tint, cloud.x, cloud.y, 110, t, 3, false, 1);
      } else {
        // Torn away down the wind at the kit's flee speed.
        const k = (e - STAB) / 500;
        if (k < 1) {
          drawCloud(sky, ctx.tint, cloud.x + ((e - STAB) / 1000) * CLOUD_FLEE_SPEED, cloud.y, 110, t, 3, false, 1 - k, 1);
        }
        const life = 1 - (e - STAB) / SCAR_MS;
        if (life > 0) drawScar(ground, ctx.tint, home.x, home.y, home.x + len, home.y, life);
      }
      if (stealth01 > 0) drawStealthWisps(air, ctx.tint, c.x, c.y, stealth01, t, 1);
      drawStealthGauge(air, ctx.tint, c.x, c.y, stealth01, e < STAB, t, 1);
    });
  },
};

// ══ E — Knock ══════════════════════════════════════════════════════════

export const knock: PreviewScript = {
  duration: 7000,
  caption: `E — a ${KNOCK_RANGE}px fist of air for ${KNOCK_DAMAGE} that shoves them back and leaves them winded for 6s: walking drains their stamina, and run dry they crawl at 30% until it refills`,
  run(ctx) {
    const fx = fxOf(ctx);
    const { av } = stand(ctx);
    const { air } = layers(ctx);
    const v = victim(ctx, { x: ctx.cx + 72, y: ctx.cy });
    const HIT = 500;
    let windedFrom = -1;
    let stamina = 1;
    let exhausted = false;
    let dir = 1;
    let recovered = false;
    ctx.at(HIT, () => {
      av.play('clap', ctx.aim);
      knockBlast(fx, ctx.tint, ctx.cx, ctx.cy, ctx.aim, KNOCK_RANGE, KNOCK_HALF);
    });
    ctx.at(HIT + 60, () => {
      float(ctx, v.x, v.y - 26, `-${KNOCK_DAMAGE}`);
      walk(ctx, v, { x: v.x + (KNOCK_SHOVE * KNOCK_SHOVE_MS) / 1000, y: v.y }, HIT + 60, KNOCK_SHOVE_MS);
      windedFrom = HIT + 60;
    });
    ctx.onFrame((dt, e) => {
      if (windedFrom < 0 || e > windedFrom + WINDED_MS) return;
      const s = dt / 1000;
      // They try to walk off; once full again after a crawl, they stand and catch their breath.
      const walking = e > windedFrom + 400 && !recovered;
      if (walking) {
        const sp = 120 * (exhausted ? EXHAUSTED_SPEED : 1) * dir;
        v.x += sp * s;
        if (v.x > ctx.w - 40) dir = -1;
        if (v.x < ctx.cx + 60) dir = 1;
        v.y = ctx.cy + Math.sin(e / 90) * (exhausted ? 0.6 : 1.5);
      }
      if (exhausted) {
        stamina += s / STAMINA_REFILL_S;
        if (stamina >= 1) { stamina = 1; exhausted = false; recovered = true; }
      } else if (walking) {
        stamina -= s / STAMINA_DRAIN_S;
        if (stamina <= 0) { stamina = 0; exhausted = true; fx.ring(v.x, v.y, 6, 34, AIR.slate, 320, 3, 7); }
      } else {
        stamina = Math.min(1, stamina + s / STAMINA_REFILL_S);
      }
      drawWinded(air, ctx.tint, v.x, v.y, stamina, exhausted, e / 1000, 7);
    });
  },
};

// ══ R — Cloud Cover ════════════════════════════════════════════════════

export const cloudCover: PreviewScript = {
  duration: 6000,
  caption: `R — a cloak of precipitation: ${COVER_HP} HP that eats hits and loses ${COVER_DECAY} every 3s. The enemy sees nothing; she sees herself at 42%`,
  run(ctx) {
    const fx = fxOf(ctx);
    const { av } = stand(ctx);
    const { air } = layers(ctx);
    const v = victim(ctx, { x: ctx.tx, y: ctx.cy });
    const ON = 400;
    const TICK = 1200;              // the kit's 3s decay, compressed
    const SHOT_DMG = 10;
    let hp = 0;
    let shot: Pt | null = null;
    const end = (): void => {
      hp = 0;
      coverBurst(fx, ctx.tint, ctx.cx, ctx.cy, true);
      ctx.moveCaster(ctx.cx, ctx.cy, { alpha: 1 });
    };
    ctx.at(ON, () => {
      av.play('flex', undefined, 520);
      coverBurst(fx, ctx.tint, ctx.cx, ctx.cy, false);
      hp = COVER_HP;
      ctx.moveCaster(ctx.cx, ctx.cy, { alpha: COVER_SELF_ALPHA });
    });
    for (let t = ON + TICK; t < 5600; t += TICK) {
      ctx.at(t, () => {
        if (hp <= 0) return;
        hp -= COVER_DECAY;
        if (hp <= 0) end();
      });
    }
    ctx.at(3000, () => { shot = { x: v.x - BODY_R, y: v.y }; });
    ctx.onFrame((dt, e) => {
      if (shot) {
        const s: Pt = shot;
        s.x -= (480 * dt) / 1000;
        air.fillStyle(ctx.tint(AIR.slate), 1);
        air.fillCircle(s.x, s.y, 6);
        air.lineStyle(1.5, ctx.tint(AIR.white), 0.9);
        air.strokeCircle(s.x, s.y, 6);
        if (s.x <= ctx.cx + 24) {
          shot = null;
          fx.motes(ctx.cx, ctx.cy, 6, { speed: 170, size: 2.4, life: 320, swirl: 2, depth: 7 });
          float(ctx, ctx.cx, ctx.cy - 50, `-${SHOT_DMG}`, 10, ctx.tint(AIR.frost));
          hp -= SHOT_DMG;
          if (hp <= 0) end();
        }
      }
      if (hp <= 0) return;
      drawCover(air, ctx.tint, ctx.cx, ctx.cy, e / 1000, hp / COVER_HP, 1);
      // The cloak's health, over her head.
      const w = 44, bx = ctx.cx - w / 2, by = ctx.cy - 42;
      air.fillStyle(ctx.tint(AIR.void), 0.8);
      air.fillRoundedRect(bx - 1.5, by - 1.5, w + 3, 8, 2.5);
      air.fillStyle(ctx.tint(AIR.frost), 1);
      air.fillRoundedRect(bx, by, Math.max(1, (w * hp) / COVER_HP), 5, 2);
    });
  },
};

// ══ F — Combo ══════════════════════════════════════════════════════════

export const combo: PreviewScript = {
  duration: 8400,
  scale: 0.8,
  caption: `F — ${VOLLEY_KNIVES} knives for ${VOLLEY_DAMAGE} each, then press as the ring lands: flip up out of reach for 3s; land the second ring to rain 12 knives — 16 on the strike, ${FIELD_STEP_DAMAGE} a step for 7s`,
  run(ctx) {
    const fx = fxOf(ctx);
    const { av } = stand(ctx);
    const { ground, air } = layers(ctx);
    const v = victim(ctx, { x: ctx.tx, y: ctx.cy });
    const home = { x: ctx.cx, y: ctx.cy };
    const VOLLEY = 400;
    const RING1 = VOLLEY + RING_DELAY_MS;
    const FLIP = RING1 + RING_MS;
    // The second ring lands 0.8s before the 3s would end; answering it is what brings her down.
    const LEV_END = FLIP + LEVITATE_MS - 800;
    const RING2 = LEV_END - RING_MS;
    const field = { x: ctx.tx - 120, y: ctx.cy };
    let fieldAt = -1;
    let lastStep = -1;

    type Knife = Pt & { vx: number; vy: number; ang: number; from: number; gone: boolean };
    const knives: Knife[] = [];
    ctx.at(VOLLEY, () => {
      av.play('sweep', ctx.aim);
      for (let i = 0; i < VOLLEY_KNIVES; i++) {
        const ang = ctx.aim + ((i / (VOLLEY_KNIVES - 1)) - 0.5) * 2 * VOLLEY_SPREAD;
        const order = Math.abs(i - (VOLLEY_KNIVES - 1) / 2);
        knives.push({
          x: home.x, y: home.y, vx: Math.cos(ang) * VOLLEY_SPEED, vy: Math.sin(ang) * VOLLEY_SPEED, ang,
          from: VOLLEY + Math.floor(order) * VOLLEY_STAGGER_MS, gone: false,
        });
      }
    });
    ctx.at(FLIP, () => {
      ringVerdict(fx, ctx.tint, home.x, home.y, RING_MARK_R, true);
      av.play('raise', undefined, 700);
      av.setHold('ride');
      flipBurst(fx, ctx.tint, home.x, home.y, LEVITATE_LIFT);
    });
    ctx.at(LEV_END, () => {
      const c = ctx.casterAt();
      ringVerdict(fx, ctx.tint, c.x, c.y, RING_MARK_R, true);
      av.setHold(null);
      av.play('slam', Math.atan2(field.y - home.y, field.x - home.x));
      fieldAt = LEV_END;
    });
    // Down the field, the enemy wanders onto the knives.
    walk(ctx, v, { x: field.x - FIELD_HALF_W - 40, y: ctx.cy + 10 }, LEV_END + 700, 2600);
    const planted = fieldKnives();

    ctx.onFrame((dt, e) => {
      const t = e / 1000;
      // Lift, eased the way the kit eases it.
      let lift = 0;
      if (e >= FLIP && e < LEV_END) {
        const up = Phaser.Math.Clamp((e - FLIP) / 320, 0, 1);
        const down = Phaser.Math.Clamp((LEV_END - e) / 180, 0, 1);
        lift = LEVITATE_LIFT * Math.min(1 - (1 - up) * (1 - up), down) + Math.sin(t * 3) * 4 * up * down;
        drawLevitation(ground, ctx.tint, home.x, home.y, lift, t, 1);
      }
      ctx.moveCaster(home.x, home.y - lift);

      for (const k of knives) {
        if (k.gone || e < k.from) continue;
        k.x += (k.vx * dt) / 1000;
        k.y += (k.vy * dt) / 1000;
        if (Math.hypot(k.x - home.x, k.y - home.y) > VOLLEY_RANGE) { k.gone = true; continue; }
        if (Math.hypot(k.x - v.x, k.y - v.y) < BODY_R + 6) {
          k.gone = true;
          knifeHit(fx, k.x, k.y, k.ang);
          float(ctx, v.x, v.y - 26, `-${VOLLEY_DAMAGE}`, 10);
          continue;
        }
        drawAirKnife(air, ctx.tint, k.x, k.y, k.ang, 26, 1, t * 6);
      }

      for (const [from, at] of [[RING1, FLIP], [RING2, LEV_END]]) {
        if (e < from || e >= at) continue;
        const p = Phaser.Math.Clamp((e - from) / RING_MS, 0, 1);
        const off = e - at;
        const c = ctx.casterAt();
        drawTimingRing(air, ctx.tint, c.x, c.y, RING_R0 + (RING_MARK_R - RING_R0) * p, RING_MARK_R,
          off >= -RING_EARLY_MS && off <= RING_LATE_MS, 1);
      }

      if (fieldAt >= 0) {
        const age = e - fieldAt;
        drawDaggerField(ground, ctx.tint, field.x, field.y, FIELD_HALF_W, FIELD_HALF_H, planted, age,
          Math.min(1, (8400 - e) / 500), t);
        if (age >= FIELD_STRIKE_AT_MS && inField(field, v) && e - lastStep >= FIELD_STEP_MS) {
          lastStep = e;
          knifeHit(fx, v.x, v.y + 8, -Math.PI / 2);
          float(ctx, v.x, v.y - 26, `-${FIELD_STEP_DAMAGE}`, 10);
        }
      }
    });
  },
};

// ══ Q — Tornado Blade ══════════════════════════════════════════════════

export const tornadoBlade: PreviewScript = {
  duration: 7600,
  scale: 0.8,
  caption: `Q — become a spinning top for ${BEY_STAMINA}s (longer with stealth): it skates after the cursor, grinds through anyone it meets for ${BEY_TICK_DAMAGE} every 0.1s, then is thrown off. Rolling over her dagger field picks the knives up to orbit it, ${BEY_ORBIT_DAMAGE} a cut`,
  run(ctx) {
    const fx = fxOf(ctx);
    stand(ctx);
    const { ground, air } = layers(ctx);
    const v = victim(ctx, { x: ctx.tx, y: ctx.cy });
    const START = 400;
    let field: Pt | null = { x: ctx.cx + 170, y: ctx.cy };
    const planted = fieldKnives();
    const bey = {
      on: false, x: ctx.cx, y: ctx.cy, vx: 0, vy: 0, spin: 0, stamina: BEY_STAMINA, orbit: 0,
      shredUntil: -1, inAng: 0, lastTick: 0, immuneUntil: -1, trail: [] as SparkPoint[],
    };
    ctx.at(START, () => {
      beyBurst(fx, ctx.tint, ctx.cx, ctx.cy, false);
      ctx.moveCaster(ctx.cx, ctx.cy, { alpha: 0 });
      bey.on = true;
    });
    ctx.onFrame((dtMs, e) => {
      const t = e / 1000;
      const dt = dtMs / 1000;
      if (field) drawDaggerField(ground, ctx.tint, field.x, field.y, FIELD_HALF_W, FIELD_HALF_H, planted, 5000, 1, t);
      // The cursor: on the enemy, who is pacing.
      v.y = ctx.cy + Math.sin(e / 600) * 34;
      if (!bey.on) return;

      const shred = e < bey.shredUntil;
      bey.spin += dt * (shred ? 44 : 26);
      bey.stamina -= dt;
      if (bey.stamina <= 0) {
        bey.on = false;
        beyBurst(fx, ctx.tint, bey.x, bey.y, true);
        ctx.moveCaster(bey.x, bey.y, { alpha: 1 });
        return;
      }
      if (shred) {
        bey.vx = Math.cos(bey.inAng) * BEY_MAX_SPEED * BEY_SHRED_SPEED;
        bey.vy = Math.sin(bey.inAng) * BEY_MAX_SPEED * BEY_SHRED_SPEED;
        if (e - bey.lastTick >= BEY_TICK_MS) {
          bey.lastTick = e;
          float(ctx, v.x + (Math.sin(e) * 10), v.y - 26, `-${BEY_TICK_DAMAGE}`, 9);
          shredSparks(fx, (bey.x + v.x) / 2, (bey.y + v.y) / 2, Math.atan2(bey.y - v.y, bey.x - v.x));
        }
      } else {
        if (bey.shredUntil > 0 && e - bey.shredUntil < dtMs + 1) {
          // Thrown off, the way it came in.
          const away = Math.atan2(bey.y - v.y, bey.x - v.x);
          bey.vx = Math.cos(away) * BEY_LAUNCH_SPEED;
          bey.vy = Math.sin(away) * BEY_LAUNCH_SPEED;
          bey.immuneUntil = e + BEY_REHIT_MS;
          fx.gustBurst(bey.x, bey.y, 60, { duration: 300, dust: false });
        }
        const gx = v.x - bey.x, gy = v.y - bey.y;
        const gd = Math.hypot(gx, gy);
        if (gd > 6) { bey.vx += (gx / gd) * BEY_ACCEL * dt; bey.vy += (gy / gd) * BEY_ACCEL * dt; }
        const drag = Math.exp(-BEY_DRAG * dt);
        bey.vx *= drag; bey.vy *= drag;
        const sp = Math.hypot(bey.vx, bey.vy);
        if (sp > BEY_MAX_SPEED) { bey.vx *= BEY_MAX_SPEED / sp; bey.vy *= BEY_MAX_SPEED / sp; }
        if ((bey.x <= BEY_RADIUS && bey.vx < 0) || (bey.x >= ctx.w - BEY_RADIUS && bey.vx > 0)) bey.vx *= -BEY_WALL_BOUNCE;
        if ((bey.y <= BEY_RADIUS && bey.vy < 0) || (bey.y >= ctx.h - BEY_RADIUS && bey.vy > 0)) bey.vy *= -BEY_WALL_BOUNCE;
        if (e >= bey.immuneUntil && gd <= BEY_RADIUS + BODY_R) {
          bey.shredUntil = e + BEY_SHRED_MS;
          bey.inAng = Math.atan2(gy, gx);
          bey.lastTick = e - BEY_TICK_MS;
        }
      }
      bey.x += bey.vx * dt;
      bey.y += bey.vy * dt;

      // Over her own field: the knives come up out of the floor and swing round it.
      if (field && inField(field, bey)) {
        bey.orbit += planted.length;
        fx.vortexCore(field.x, field.y, FIELD_HALF_W * 0.7, 360);
        field = null;
      }
      for (let i = 0; i < bey.orbit; i++) {
        const a = bey.spin * 0.35 + (i / bey.orbit) * Math.PI * 2;
        const kx = bey.x + Math.cos(a) * BEY_ORBIT_R, ky = bey.y + Math.sin(a) * BEY_ORBIT_R;
        if (Math.hypot(kx - v.x, ky - v.y) > BODY_R + 8) continue;
        knifeHit(fx, kx, ky, a);
        float(ctx, v.x - 12, v.y - 34, `-${BEY_ORBIT_DAMAGE}`, 10);
        bey.orbit--;
        break;
      }

      const last = bey.trail[bey.trail.length - 1];
      if (!last || Math.hypot(last.x - bey.x, last.y - 10 - bey.y) > 9) bey.trail.push({ x: bey.x, y: bey.y + 10, at: e });
      while (bey.trail.length && e - bey.trail[0].at > BEY_TRAIL_MS) bey.trail.shift();
      drawSparkTrail(ground, ctx.tint, bey.trail, e, BEY_TRAIL_MS);
      const tilt = Phaser.Math.Clamp(bey.vx / BEY_MAX_SPEED, -1, 1) * 0.6;
      drawBey(air, ctx.tint, bey.x, bey.y, bey.spin, t, bey.stamina / BEY_STAMINA, e < bey.shredUntil ? 1 : 0, tilt, 1);
      for (let i = 0; i < bey.orbit; i++) {
        const a = bey.spin * 0.35 + (i / bey.orbit) * Math.PI * 2;
        drawAirKnife(air, ctx.tint, bey.x + Math.cos(a) * BEY_ORBIT_R, bey.y + Math.sin(a) * BEY_ORBIT_R, a + Math.PI / 2, 22, 1, t);
      }
    });
  },
};
