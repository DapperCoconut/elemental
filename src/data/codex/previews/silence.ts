import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  FEAR, FearAvatar, FearFx,
  drawBloodPuddle, drawButcherHook, drawClosingWalls, drawDragChain, drawDrainLine, drawFearMeter, drawFlashlightMask,
  drawFrozenFear, drawGashes, drawGazeCone, drawGraspCone, drawHole, drawHookSpin, drawJumpscare, drawMacheteSlash,
  drawMacheteStab, drawPhobia, drawRedacted, drawRune, drawSignatureCone, drawStatue,
} from '../../../elements/kits/FearVisuals';

/**
 * Fear's showcases (the element keeps the id `silence`).
 *
 * Each loop stages the kit's own painters and `FearFx` bursts at the kit's numbers. Nothing here
 * runs `FearKit`: the timings below are its constants, replayed. Where the real thing takes far
 * longer than a loop can (the walls, the hole, the maze) the clock is compressed and the caption
 * carries the true figure.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const DRAIN_RANGE = 120;
const DRAIN_TICK_MS = 500;
const DRAIN_PER_FEAR_TICK = 0.05;
const FLEE_MS = 2500;
const FLEE_RESET_FEAR = 60;
const PHOBIA_R = 22;
const GREY_BACKLASH = 3;
const GRASP_RANGE = 150;
const GRASP_HALF = 0.66;
const GRASP_MS = 360;
const GRASP_HIT_MS = 150;
const GRASP_DMG = 12;
const GRASP_FEAR = 10;
const GAZE_MS = 3000;
const GAZE_SCARE_MS = 2500;
const GAZE_HALF_MIN = 0.2;
const GAZE_HALF_MAX = 0.6;
const GAZE_GROW_PER_S = 0.16;
const GAZE_FEAR_PER_S = 22;
const SCARE_FEAR = 30;
const SCARE_SHOW_MS = 900;
const MANIFEST_FEAR = 50;
const RUNE_HP = 25;
const RUNE_TOUCH_DPS = 14;
const LIGHT_HALF = 0.42;
const LIGHT_LEN = 250;
const MASSACRE_RANGE = 120;
const MASSACRE_HALF = 1.05;
const MASSACRE_DMG = 28;
const MASSACRE_PER_FEAR = 0.3;
const SLASH_MS = 240;
const STAB_RANGE = 132;
const STAB_MS = 230;
const SPIN_RADIUS = 96;
const SPIN_RAD_PER_S = 9.5;
const DRAG_LEN = 50;
const SIG_ARMED_MS = 1000;
const SIG_LEN = 170;
const SIG_HALF = 0.5;
const SIG_DMG = 26;
const HOLE_R0 = 34;
const MAZE_CATCH_DMG = 75;
const STATUE_HP = 100;
const STATUE_TOUCH_DPS = 28;
const CLAUSTRO_MIN_HALF = 58;
const BODY_R = 17;

type Pt = { x: number; y: number };
type Gfx = Phaser.GameObjects.Graphics;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): FearFx {
  return ctx.capture(() => new FearFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The gentleman's rig (or the slasher's), or null when a skin has replaced the character. */
function stand(ctx: PreviewCtx, form: 'fear' | 'slasher' = 'fear'): FearAvatar | null {
  const made = ctx.useAvatar(() => new FearAvatar(ctx.scene, ctx.tint, 'player'));
  const av = made instanceof FearAvatar ? made : null;
  av?.setForm(form);
  av?.setFacing(ctx.aim);
  return av;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** A damage (or healing) number. */
function float(ctx: PreviewCtx, x: number, y: number, text: string, size = 11, color = ctx.tint(FEAR.bloodHot)): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color: hex(color), stroke: '#050506', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 800 });
}

/** The three layers the kit paints on: floor, air, and over everything. */
function layers(ctx: PreviewCtx): { ground: Gfx; air: Gfx; top: Gfx } {
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3.3));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(6.2));
  const top = ctx.adopt(ctx.scene.add.graphics().setDepth(16.6));
  ctx.onFrame(() => { ground.clear(); air.clear(); top.clear(); });
  return { ground, air, top };
}

interface Victim extends Pt {
  /** 0–100. */
  fear: number;
  fleeing: boolean;
  frozen: boolean;
  gashes: number;
  /** Whatever is drinking them, if anything. */
  drain: Pt | null;
  alpha: number;
  scale: number;
}

/**
 * A training dummy that can be moved, wearing everything Fear puts on a body: the meter over its
 * head, the grey line being drawn out of it, gashes, and the shake of being frozen.
 */
function victim(ctx: PreviewCtx, start: Pt, fear = 0): Victim {
  const v: Victim = { ...start, fear, fleeing: false, frozen: false, gashes: 0, drain: null, alpha: 1, scale: 1 };
  const body = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const over = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  ctx.onFrame((_dt, e) => {
    const t = e / 1000;
    body.clear();
    over.clear();
    if (v.alpha <= 0.01) return;
    const s = v.scale;
    body.fillStyle(0x2b2f3d, v.alpha); body.fillCircle(v.x, v.y, BODY_R * s);
    body.fillStyle(0x3c4254, v.alpha); body.fillCircle(v.x, v.y, 13 * s);
    body.fillStyle(0x8e97ad, 0.9 * v.alpha); body.fillCircle(v.x - 5 * s, v.y - 4 * s, 3.2 * s); body.fillCircle(v.x + 5 * s, v.y - 4 * s, 3.2 * s);
    if (v.alpha < 0.95) return;
    if (v.drain) drawDrainLine(over, ctx.tint, v.x, v.y, v.drain.x, v.drain.y, t, v.fear / 100);
    if (v.gashes > 0) drawGashes(over, ctx.tint, v.x, v.y, BODY_R, Math.min(12, v.gashes), 7, t);
    if (v.frozen) drawFrozenFear(over, ctx.tint, v.x, v.y, BODY_R, t);
    if (v.fear >= 1) drawFearMeter(over, ctx.tint, v.x, v.y - BODY_R - 22, v.fear / 100, t, v.fleeing);
  });
  return v;
}

/** Walk a point to `to` between `from` and `from + ms` into the loop. */
function walk(ctx: PreviewCtx, p: Pt, to: Pt, from: number, ms: number): void {
  let a: Pt | null = null;
  let done = false;
  ctx.onFrame((_dt, e) => {
    if (done || e < from) return;
    if (!a) a = { x: p.x, y: p.y };
    const k = Phaser.Math.Clamp((e - from) / ms, 0, 1);
    p.x = a.x + (to.x - a.x) * k;
    p.y = a.y + (to.y - a.y) * k;
    // Let go once it has arrived, so a later walk can take the same point somewhere else.
    if (k >= 1) done = true;
  });
}

interface Ghost extends Pt { seed: number; born: number; gone: boolean; clawAt: number; clawAng: number; gaze: number; look: number }

function ghost(at: Pt, seed: number, born = -1000): Ghost {
  return { ...at, seed, born, gone: false, clawAt: -1, clawAng: 0, gaze: 0, look: Math.PI };
}

/** Paint a phobia the way the kit does: rising for 320ms, clawing for 360ms after `clawAt`. */
function paintGhost(ctx: PreviewCtx, ground: Gfx, air: Gfx, p: Ghost, e: number): void {
  if (p.gone || e < p.born) return;
  const clawK = p.clawAt >= 0 && e - p.clawAt < GRASP_MS ? (e - p.clawAt) / GRASP_MS : -1;
  if (clawK >= 0) drawGraspCone(ground, ctx.tint, p.x, p.y, p.clawAng, GRASP_HALF, GRASP_RANGE, 1 - clawK);
  drawPhobia(air, ctx.tint, p.x, p.y, e / 1000, {
    look: p.look, gaze: p.gaze, claw: clawK, clawAng: p.clawAng, alpha: Math.min(1, (e - p.born) / 320), seed: p.seed,
  });
}

/** One machete swing from the caster, painted for its 240ms. */
function swing(ctx: PreviewCtx, air: Gfx, range: number): { go(ang: number, at: number): void } {
  let at = -1;
  let ang = 0;
  ctx.onFrame((_dt, e) => {
    if (at < 0 || e - at > SLASH_MS) return;
    const c = ctx.casterAt();
    drawMacheteSlash(air, ctx.tint, c.x, c.y, ang, MASSACRE_HALF, range, (e - at) / SLASH_MS);
  });
  return { go(a, when) { ang = a; at = when; } };
}

/** One machete thrust from the caster, painted for its 230ms. */
function stab(ctx: PreviewCtx, air: Gfx): { go(ang: number, reach: number, at: number): void } {
  let at = -1;
  let ang = 0;
  let reach = STAB_RANGE;
  ctx.onFrame((_dt, e) => {
    if (at < 0 || e - at > STAB_MS) return;
    const c = ctx.casterAt();
    drawMacheteStab(air, ctx.tint, c.x, c.y, ang, reach, (e - at) / STAB_MS);
  });
  return { go(a, r, when) { ang = a; reach = r; at = when; } };
}

// ══ PASSIVE — Fear ═════════════════════════════════════════════════════

export const passiveFear: PreviewScript = {
  duration: 7200,
  caption: 'Fear — every enemy wears a meter, 0 to 100. Full, and within 170px of you, they run for 2.5s taking 33% more damage; then it drops to 60',
  run(ctx) {
    stand(ctx);
    const home = { x: ctx.cx + 130, y: ctx.cy };
    const v = victim(ctx, home);
    const FILL = 500;
    const FULL = FILL + 2400;
    ctx.at(FULL, () => { v.fleeing = true; });
    walk(ctx, v, { x: ctx.w - 60, y: ctx.cy }, FULL, FLEE_MS);
    ctx.at(FULL + FLEE_MS, () => { v.fleeing = false; v.fear = FLEE_RESET_FEAR; });
    walk(ctx, v, home, FULL + FLEE_MS + 500, 1400);
    ctx.onFrame((_dt, e) => {
      if (e >= FILL && e < FULL) v.fear = 100 * ((e - FILL) / (FULL - FILL));
      else if (e >= FULL && e < FULL + FLEE_MS) v.fear = 100;
    });
  },
};

// ══ PASSIVE — Reassurance ══════════════════════════════════════════════

export const passiveReassurance: PreviewScript = {
  duration: 7600,
  caption: 'Reassurance — a frightened enemy within 120px of you or of a phobia is drained: 0.1 damage a second per point of fear, and you are healed the same',
  run(ctx) {
    stand(ctx);
    const { ground, air } = layers(ctx);
    const ph = ghost({ x: ctx.tx + 70, y: ctx.cy - 6 }, 31);
    const v = victim(ctx, { x: ctx.tx - 20, y: ctx.cy }, 80);
    walk(ctx, v, { x: (ctx.cx + ctx.tx) / 2 + 20, y: ctx.cy }, 2200, 1100);
    walk(ctx, v, { x: ctx.cx + 84, y: ctx.cy }, 4200, 1100);
    for (let t = DRAIN_TICK_MS; t < 7400; t += DRAIN_TICK_MS) {
      ctx.at(t, () => {
        if (!v.drain) return;
        const amount = Math.round(v.fear * DRAIN_PER_FEAR_TICK);
        const c = ctx.casterAt();
        float(ctx, v.x + 22, v.y - 20, `-${amount}`, 10);
        float(ctx, c.x - 22, c.y - 30, `+${amount}`, 10, 0x4ade80);
      });
    }
    ctx.onFrame((_dt, e) => {
      const c = ctx.casterAt();
      paintGhost(ctx, ground, air, ph, e);
      // The kit's rule: whichever drinker is closest, if any is inside the reach.
      const reach = DRAIN_RANGE + BODY_R;
      const dc = Math.hypot(v.x - c.x, v.y - c.y);
      const dp = Math.hypot(v.x - ph.x, v.y - ph.y);
      v.drain = Math.min(dc, dp) >= reach ? null : dc < dp ? { x: c.x, y: c.y } : { x: ph.x, y: ph.y };
      ph.look = Math.atan2(v.y - ph.y, v.x - ph.x);
    });
  },
};

// ══ Click — Phobia ═════════════════════════════════════════════════════

export const phobia: PreviewScript = {
  duration: 5600,
  caption: 'Click — a phobia rises at your cursor (up to 4). Enemy shots that pass through one go grey: 55% damage, and 3 back to the shooter',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const { ground, air } = layers(ctx);
    const v = victim(ctx, { x: ctx.tx, y: ctx.cy });
    const ph = ghost({ x: (ctx.cx + ctx.tx) / 2, y: ctx.cy - 4 }, 12, 600);
    const shotG = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    const SPEED = 420;
    const shots: { x: number; grey: boolean; done: boolean }[] = [];
    ctx.at(600, () => { av?.play('raise'); fx.phobiaRise(ph.x, ph.y); });
    for (const t of [2000, 3200]) ctx.at(t, () => shots.push({ x: v.x - BODY_R, grey: false, done: false }));
    ctx.onFrame((dt, e) => {
      paintGhost(ctx, ground, air, ph, e);
      shotG.clear();
      for (const s of shots) {
        if (s.done) continue;
        s.x -= (SPEED * dt) / 1000;
        if (!s.grey && Math.abs(s.x - ph.x) < PHOBIA_R + 6) {
          s.grey = true;
          float(ctx, v.x + 20, v.y - 22, `-${GREY_BACKLASH}`, 10);
        }
        if (s.x <= ctx.cx + 20) { s.done = true; continue; }
        // The kit only tints and weakens the real projectile; a plain bolt stands in for it here.
        shotG.fillStyle(s.grey ? 0x8a8a8a : 0xffa040, s.grey ? 0.7 : 1);
        shotG.fillCircle(s.x, ctx.cy - 2, s.grey ? 4 : 6);
        shotG.fillStyle(s.grey ? 0x8a8a8a : 0xffa040, 0.3);
        shotG.fillEllipse(s.x + 10, ctx.cy - 2, 20, s.grey ? 4 : 7);
      }
    });
  },
};

// ══ E — Fear's Grasp ═══════════════════════════════════════════════════

export const grasp: PreviewScript = {
  duration: 4200,
  caption: 'E — every phobia slashes a black claw in a 150px cone toward your cursor: 12 damage and 10 fear each',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const { ground, air } = layers(ctx);
    const v = victim(ctx, { x: ctx.tx - 20, y: ctx.cy });
    const ghosts = [ghost({ x: v.x - 96, y: ctx.cy - 8 }, 5), ghost({ x: v.x + 96, y: ctx.cy - 4 }, 23)];
    const CAST = 1000;
    ctx.at(CAST, () => {
      av?.play('sweep', ctx.aim);
      for (const p of ghosts) { p.clawAt = CAST; p.clawAng = Math.atan2(v.y - p.y, v.x - p.x); }
    });
    ctx.at(CAST + GRASP_HIT_MS, () => {
      ghosts.forEach((p, i) => {
        fx.slashHit(v.x, v.y, p.clawAng);
        fx.fearBurst(v.x, v.y - BODY_R, GRASP_FEAR);
        float(ctx, v.x + (i ? 24 : -24), v.y - 24, `-${GRASP_DMG}`);
        v.fear += GRASP_FEAR;
      });
    });
    ctx.onFrame((_dt, e) => {
      for (const p of ghosts) {
        p.look = Math.atan2(v.y - p.y, v.x - p.x);
        paintGhost(ctx, ground, air, p, e);
      }
    });
  },
};

// ══ R — Gaze ═══════════════════════════════════════════════════════════

export const gaze: PreviewScript = {
  duration: 7400,
  caption: 'R — for 3s every phobia shines its eye at you. An enemy in the beam gains 22 fear a second and widens it; 2.5s in the light is a jumpscare: frozen 3s, +30 fear',
  run(ctx) {
    const av = stand(ctx);
    const { ground, air } = layers(ctx);
    const ph = ghost({ x: ctx.tx + 90, y: ctx.cy - 6 }, 17);
    const v = victim(ctx, { x: ctx.tx - 60, y: ctx.cy });
    const scare = ctx.adopt(ctx.scene.add.graphics().setDepth(20));
    const fx = fxOf(ctx);
    const CAST = 600;
    let half = GAZE_HALF_MIN;
    let scaredAt = -1;
    ctx.at(CAST, () => av?.play('raise'));
    ctx.at(CAST + GAZE_SCARE_MS, () => {
      scaredAt = CAST + GAZE_SCARE_MS;
      v.fear = Math.min(100, v.fear + SCARE_FEAR);
      v.frozen = true;
      fx.fearBurst(v.x, v.y - BODY_R, SCARE_FEAR);
    });
    // Frozen for the kit's full 3s.
    ctx.at(CAST + GAZE_SCARE_MS + 3000, () => { v.frozen = false; });
    ctx.onFrame((dt, e) => {
      const c = ctx.casterAt();
      const el = e - CAST;
      const on = el >= 0 && el < GAZE_MS;
      ph.gaze = 0;
      if (on) {
        const ang = Math.atan2(c.y - ph.y, c.x - ph.x);
        const len = Math.hypot(c.x - ph.x, c.y - ph.y) + 50;
        half = Math.min(GAZE_HALF_MAX, half + (GAZE_GROW_PER_S * dt) / 1000);
        ph.gaze = Math.min(1, el / 300, (GAZE_MS - el) / 250);
        drawGazeCone(ground, ctx.tint, ph.x, ph.y, ang, half, len, e / 1000, ph.gaze);
        v.fear = Math.min(100, v.fear + (GAZE_FEAR_PER_S * dt) / 1000);
      }
      paintGhost(ctx, ground, air, ph, e);
      scare.clear();
      // What the victim sees, for the kit's 0.9s.
      const k = scaredAt < 0 ? -1 : (e - scaredAt) / SCARE_SHOW_MS;
      if (k >= 0 && k < 1) drawJumpscare(scare, ctx.tint, ctx.w, ctx.h, k, e / 1000, 0);
    });
  },
};

// ══ F — Manifest ═══════════════════════════════════════════════════════

export const manifest: PreviewScript = {
  duration: 8200,
  caption: 'F — at 50 fear on the field, become the slasher: invincible, 67% slower. The enemy sees by flashlight; breaking the 25hp rune on the arena edge ends it',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const { top } = layers(ctx);
    const v = victim(ctx, { x: ctx.tx - 30, y: ctx.cy }, MANIFEST_FEAR);
    const rune = { x: ctx.w - 46, y: ctx.cy - 70, hp: RUNE_HP, up: false };
    // The kit's torch is a mask cut out of the dark; here it is laid over the floor as light.
    const lamp = ctx.adopt(ctx.scene.add.graphics().setDepth(3.1).setAlpha(0.13));
    const CAST = 800;
    const SEARCH = CAST + 900;
    const FOUND = SEARCH + 2000;
    let slasher = false;
    let lightAng = Math.PI;
    ctx.at(CAST, () => {
      const c = ctx.casterAt();
      slasher = true;
      rune.up = true;
      av?.setForm('slasher');
      av?.play('flex');
      fx.manifest(c.x, c.y);
    });
    // He comes on, slowly; they go looking for the rune.
    ctx.at(CAST + 500, () => ctx.glideCaster({ to: { x: ctx.cx + 110, y: ctx.cy }, ms: 4200, ease: 'linear' }));
    walk(ctx, v, { x: rune.x - 26, y: rune.y + 22 }, SEARCH, FOUND - SEARCH);
    ctx.onFrame((dt, e) => {
      lamp.clear();
      if (!slasher) return;
      const t = e / 1000;
      // The beam sweeps while they search, then settles on the rune.
      const toRune = Math.atan2(rune.y - v.y, rune.x - v.x);
      const want = e < SEARCH ? Math.PI + Math.sin(t * 3) * 0.5 : toRune;
      lightAng = Phaser.Math.Angle.RotateTo(lightAng, want, (4 * dt) / 1000);
      const n = Math.sin(t * 31.7) + Math.sin(t * 17.3 + 1.1) + Math.sin(t * 7.9 + 4);
      drawFlashlightMask(lamp, v.x, v.y, lightAng, LIGHT_HALF, LIGHT_LEN, 34, n > 2.1 ? 0.9 : n > 1.7 ? 0.45 : 0.05);
      if (!rune.up) return;
      const touching = Math.hypot(v.x - rune.x, v.y - rune.y) < 46;
      if (touching) rune.hp -= (RUNE_TOUCH_DPS * dt) / 1000;
      drawRune(top, ctx.tint, rune.x, rune.y, t, Math.max(0, rune.hp / RUNE_HP), touching ? 0.4 : 0);
      if (rune.hp > 0) return;
      const c = ctx.casterAt();
      rune.up = false;
      slasher = false;
      fx.runeBreak(rune.x, rune.y);
      fx.revert(c.x, c.y);
      av?.setForm('fear');
    });
  },
};

// ══ Q — Claustrophobia ═════════════════════════════════════════════════

export const claustrophobia: PreviewScript = {
  duration: 7600,
  scale: 0.8,
  caption: 'Q — the walls close over 22s and your phobias turn to 100hp marble. Crushed is dead. Breaking any statue stops it — but half are trapped (they bleed if watched 3s): 40 damage',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const { ground, air } = layers(ctx);
    const trapped = ghost({ x: ctx.w * 0.47, y: ctx.cy - 10 }, 9);
    const empty = ghost({ x: ctx.w * 0.76, y: ctx.cy - 10 }, 27);
    const v = victim(ctx, { x: ctx.w * 0.55, y: ctx.cy + 6 });
    const outer = new Phaser.Geom.Rectangle(0, 0, ctx.w, ctx.h);
    const CAST = 600;
    const LEAVE = CAST + 2600;
    const ARRIVE = LEAVE + 900;
    /** The walls here run at twice the kit's speed, so the loop can show them move. */
    const CLOSE_MS = 11000;
    let on = false;
    let hp = STATUE_HP;
    let bleed = 0;
    let flash = 0;
    ctx.at(CAST, () => { on = true; av?.play('raise'); });
    walk(ctx, v, { x: empty.x - 40, y: ctx.cy + 6 }, LEAVE, ARRIVE - LEAVE);
    ctx.onFrame((dt, e) => {
      const t = e / 1000;
      if (!on) {
        paintGhost(ctx, ground, air, trapped, e);
        paintGhost(ctx, ground, air, empty, e);
        return;
      }
      const k = Phaser.Math.Clamp((e - CAST) / CLOSE_MS, 0, 1);
      const hw = Phaser.Math.Linear(outer.width / 2, CLAUSTRO_MIN_HALF, k);
      const hh = Phaser.Math.Linear(outer.height / 2, CLAUSTRO_MIN_HALF, k);
      drawClosingWalls(ground, ctx.tint, outer, new Phaser.Geom.Rectangle(outer.centerX - hw, outer.centerY - hh, hw * 2, hh * 2), t);
      v.fear = Math.min(100, v.fear + (2.5 * dt) / 1000);
      // Watched: the occupied one cannot keep still. (The kit waits 3s before it starts.)
      if (e > CAST + 900 && e < LEAVE + 300) bleed = Math.min(1, bleed + dt / 1500);
      flash = Math.max(0, flash - dt / 200);
      if (e >= ARRIVE) {
        // Standing on it: 28 a second in the kit; three times that here.
        hp -= (STATUE_TOUCH_DPS * 3 * dt) / 1000;
        if (flash <= 0.2) flash = 0.6;
      }
      drawStatue(air, ctx.tint, trapped.x, trapped.y, t, { hp: 1, bleed, seed: trapped.seed, flash: 0 });
      drawStatue(air, ctx.tint, empty.x, empty.y, t, { hp: Math.max(0, hp / STATUE_HP), bleed: 0, seed: empty.seed, flash });
      if (hp > 0) return;
      // It was empty: the rite ends, and the other is a phobia again.
      on = false;
      empty.gone = true;
      fx.statueShatter(empty.x, empty.y, false);
    });
  },
};

// ══ Slasher Click — Massacre ═══════════════════════════════════════════

export const massacre: PreviewScript = {
  duration: 6200,
  caption: 'Slasher Click — stab at the cursor (132px): 28 damage, +0.3 per point of their fear, and it wounds the part it lands on. Three stabs make a limb severe, and severe parts bleed. Running through your own phobia is +30% speed',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx, 'slasher');
    const { ground, air } = layers(ctx);
    const ph = ghost({ x: ctx.cx + 78, y: ctx.cy - 6 }, 14);
    const v = victim(ctx, { x: ctx.tx, y: ctx.cy }, 50);
    const st = stab(ctx, air);
    const FIRST = 700;
    const SECOND = 3200;
    const puddles: { x: number; y: number; born: number; seed: number }[] = [];
    ctx.at(FIRST, () => {
      av?.play('punch', 0);
      st.go(0, 96, FIRST);
      ph.gone = true;
      fx.phobiaDie(ph.x, ph.y);
      fx.bloodSplash(ph.x, ph.y);
    });
    ctx.at(FIRST + 500, () => ctx.glideCaster({ to: { x: v.x - 96, y: ctx.cy + 4 }, ms: SECOND - FIRST - 700, ease: 'linear' }));
    // Three into the same leg: sound, damaged, severe.
    for (let i = 0; i < 3; i++) {
      const at = SECOND + i * 800;
      ctx.at(at, () => {
        const c = ctx.casterAt();
        const tx = v.x - 7;
        const ty = v.y + 13;
        const ang = Math.atan2(ty - c.y, tx - c.x);
        av?.play('punch', ang);
        st.go(ang, Math.hypot(tx - c.x, ty - c.y), at);
        fx.slashHit(tx, ty, ang);
        v.gashes++;
        float(ctx, v.x + 24, v.y - 24 - i * 6, `-${Math.round(MASSACRE_DMG + v.fear * MASSACRE_PER_FEAR)}`, 13);
        if (i === 2) fx.bloodSplash(tx, ty);
      });
    }
    ctx.onFrame((_dt, e) => {
      paintGhost(ctx, ground, air, ph, e);
      if (e > SECOND + 1700 && (puddles.length === 0 || e - puddles[puddles.length - 1].born > 420) && puddles.length < 4) {
        puddles.push({ x: v.x - 8 + puddles.length * 5, y: v.y + 17 + (puddles.length % 2) * 4, born: e, seed: 5 + puddles.length * 13 });
      }
      for (const p of puddles) drawBloodPuddle(ground, ctx.tint, p.x, p.y, 8, p.seed, Math.min(0.5, (e - p.born) / 14000));
    });
  },
};

// ══ Slasher E — Haunt ══════════════════════════════════════════════════

export const haunt: PreviewScript = {
  duration: 8200,
  caption: 'Slasher E — go grey and stalk; it charges faster the closer you are. Recast: a hook spins round you for 1.2–4.2s. Whoever it catches is dragged for 5s, then slammed for 22 — or hung on a butcher\'s hook for 3s, bleeding three times as fast',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx, 'slasher');
    const { ground, air } = layers(ctx);
    const v = victim(ctx, { x: ctx.tx, y: ctx.cy }, 40);
    const hook = { x: ctx.cx + 40, y: ctx.cy + 4 };
    const START = 500;
    const RELEASE = 2700;
    const CATCH = RELEASE + 420;
    const HAUL = 2300;
    const HUNG = CATCH + HAUL;
    const post = { x: v.x - 108, y: ctx.cy };
    let stalking = false;
    let spinFrom = -1;
    let dragging = false;
    let hung = false;
    const puddles: { x: number; y: number; born: number; seed: number }[] = [];
    v.gashes = 3;
    ctx.at(START, () => {
      stalking = true;
      av?.setHaunting(true);
      av?.setHold('brace', 0);
      ctx.glideCaster({ to: post, ms: RELEASE - START - 200, ease: 'linear' });
    });
    ctx.at(RELEASE, () => {
      stalking = false;
      spinFrom = RELEASE;
      av?.setHaunting(false);
      av?.setHold(null);
      av?.play('sweep', 0);
    });
    ctx.at(CATCH, () => {
      spinFrom = -1;
      dragging = true;
      fx.bloodSplash(v.x, v.y);
      // Haul them back the way he came, a chain's length past the hook.
      ctx.glideCaster({ to: { x: hook.x - DRAG_LEN - 6, y: hook.y }, ms: HAUL, ease: 'linear' });
    });
    ctx.at(HUNG, () => {
      dragging = false;
      hung = true;
      v.x = hook.x;
      v.y = hook.y;
      fx.bloodSplash(v.x, v.y);
    });
    ctx.at(HUNG + 400, () => float(ctx, v.x + 26, v.y - 30, 'x3', 13));
    ctx.onFrame((_dt, e) => {
      const t = e / 1000;
      const c = ctx.casterAt();
      ctx.moveCaster(c.x, c.y, { alpha: stalking ? 0.75 : 1 });
      drawButcherHook(ground, air, ctx.tint, hook.x + 15, hook.y + 8, t, 31, dragging ? 1 : 0, hung);
      if (spinFrom >= 0) drawHookSpin(air, ctx.tint, c.x, c.y, -2.4 + ((e - spinFrom) / 1000) * SPIN_RAD_PER_S, SPIN_RADIUS, t, 1);
      if (dragging) {
        const d = Math.hypot(v.x - c.x, v.y - c.y);
        if (d > DRAG_LEN) { v.x = c.x + ((v.x - c.x) * DRAG_LEN) / d; v.y = c.y + ((v.y - c.y) * DRAG_LEN) / d; }
        drawDragChain(air, ctx.tint, c.x, c.y, v.x, v.y, t);
      }
      if (hung && (puddles.length === 0 || e - puddles[puddles.length - 1].born > 320) && puddles.length < 5) {
        puddles.push({ x: v.x - 10 + puddles.length * 5, y: v.y + 18 + (puddles.length % 2) * 5, born: e, seed: 3 + puddles.length * 17 });
      }
      for (const p of puddles) drawBloodPuddle(ground, ctx.tint, p.x, p.y, 9, p.seed, Math.min(0.5, (e - p.born) / 14000));
    });
  },
};

// ══ Slasher R — Signature Move ═════════════════════════════════════════

export const signature: PreviewScript = {
  duration: 7000,
  caption: 'Slasher R — vanish to the arena edge. Three times: aim a red cone only you can see, click (or wait 2s) and it is live for 1s. An enemy who touches it gets you, through them, for 26',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx, 'slasher');
    const { ground, air } = layers(ctx);
    const v = victim(ctx, { x: ctx.tx + 70, y: ctx.cy });
    const sw = swing(ctx, air, MASSACRE_RANGE);
    const edge = { x: 40, y: ctx.cy };
    const apex = { x: ctx.w * 0.34, y: ctx.cy };
    const CAST = 500;
    const ARM1 = CAST + 1000;
    const AIM2 = ARM1 + SIG_ARMED_MS;
    const ARM2 = AIM2 + 1100;
    let live = false;
    let armed = false;
    ctx.at(CAST, () => {
      const c = ctx.casterAt();
      fx.teleport(c.x, c.y);
      ctx.moveCaster(edge.x, edge.y);
      fx.teleport(edge.x, edge.y);
      av?.setHold('reach', 0);
      live = true;
    });
    // Round one is aimed where they are not; round two is laid across the way they are walking.
    walk(ctx, apex, { x: v.x - 330, y: ctx.cy }, CAST, 800);
    ctx.at(ARM1, () => { armed = true; });
    ctx.at(AIM2, () => { armed = false; });
    walk(ctx, apex, { x: v.x - 200, y: ctx.cy }, AIM2, 900);
    ctx.at(ARM2, () => { armed = true; });
    ctx.onFrame((dt, e) => {
      if (!live) return;
      if (e >= ARM2 + 100) v.x -= (80 * dt) / 1000;
      drawSignatureCone(ground, ctx.tint, apex.x, apex.y, 0, SIG_HALF, SIG_LEN, armed, e / 1000);
      if (!armed || v.x - BODY_R > apex.x + SIG_LEN) return;
      // He is simply there, already through them.
      live = false;
      const c = ctx.casterAt();
      fx.teleport(c.x, c.y);
      ctx.moveCaster(v.x + 52, v.y);
      av?.setHold(null);
      av?.play('sweep', Math.PI);
      sw.go(Math.PI, e);
      fx.slashHit(v.x, v.y, 0);
      fx.bloodSplash(v.x, v.y);
      float(ctx, v.x - 24, v.y - 26, `-${SIG_DMG}`, 13);
    });
  },
};

// ══ Slasher F — Shadowy Descent ════════════════════════════════════════

export const descent: PreviewScript = {
  duration: 4200,
  caption: 'Slasher F — sink through the floor and end the slasher. You come back as yourself somewhere on the arena edge',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx, 'slasher');
    const out = { x: ctx.w - 48, y: ctx.cy - 30 };
    const CAST = 1000;
    const SINK = 380;
    const UP = CAST + SINK + 500;
    ctx.at(CAST, () => { const c = ctx.casterAt(); fx.revert(c.x, c.y); });
    ctx.at(UP, () => {
      av?.setForm('fear');
      av?.setFacing(Math.PI);
      fx.teleport(out.x, out.y);
    });
    ctx.onFrame((_dt, e) => {
      if (e < CAST) return;
      if (e < UP) { ctx.moveCaster(ctx.cx, ctx.cy, { alpha: Math.max(0, 1 - (e - CAST) / SINK) }); return; }
      ctx.moveCaster(out.x, out.y, { alpha: Math.min(1, (e - UP) / 260), facing: Math.PI });
    });
  },
};

// ══ Slasher Q — They Will Fall ═════════════════════════════════════════

export const fall: PreviewScript = {
  duration: 8600,
  scale: 0.8,
  caption: 'Slasher Q — a hole opens mid-arena and grows 9px a second. Whoever falls in is hunted through a maze in first person for 45s. Caught: 75 damage',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx, 'slasher');
    const { ground } = layers(ctx);
    const hole = { x: ctx.w / 2, y: ctx.cy - 16 };
    const home = { x: hole.x + 150, y: ctx.cy };
    const v = victim(ctx, home, 30);
    const cut = ctx.adopt(ctx.scene.add.graphics().setDepth(20));
    const CAST = 600;
    /** The kit's 9px a second would take a quarter of a minute to get there; this one hurries. */
    const GROW_PER_S = 38;
    const CUT_MS = 1500;
    let open = false;
    let fellAt = -1;
    let backAt = -1;
    ctx.at(CAST, () => { open = true; av?.play('slam', Math.PI / 2); });
    ctx.onFrame((_dt, e) => {
      const t = e / 1000;
      cut.clear();
      if (open) {
        const r = HOLE_R0 + (GROW_PER_S * (e - CAST)) / 1000;
        drawHole(ground, ctx.tint, hole.x, hole.y, r, t);
        if (Math.hypot(v.x - hole.x, v.y - hole.y) <= r - 4) { open = false; fellAt = e; }
        return;
      }
      if (fellAt < 0) return;
      const el = e - fellAt;
      if (el < 500) {
        // Down they go: the kit closes the hole behind them.
        const k = el / 500;
        drawHole(ground, ctx.tint, hole.x, hole.y, (HOLE_R0 + (GROW_PER_S * (fellAt - CAST)) / 1000) * (1 - k * 0.6), t);
        v.x = home.x + (hole.x - home.x) * k;
        v.y = home.y + (hole.y - home.y) * k;
        v.scale = 1 - 0.8 * k;
        v.alpha = 0.96 - 0.96 * k * k;
        return;
      }
      if (backAt >= 0) return;
      v.alpha = 0;
      // The hunt is somewhere else. What the catch looks like is not shown to anybody.
      if (el < 500 + CUT_MS) { drawRedacted(cut, ctx.w, ctx.h, (el - 500) / CUT_MS, t); return; }
      backAt = e;
      v.x = home.x - 40; v.y = home.y; v.scale = 1; v.alpha = 1;
      v.gashes = 12;
      v.fear += 25;
      fx.bloodSplash(v.x, v.y);
      float(ctx, v.x + 26, v.y - 26, `-${MAZE_CATCH_DMG}`, 14);
    });
  },
};
