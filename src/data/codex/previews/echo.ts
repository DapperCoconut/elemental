import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  ECHO, EchoAvatar, EchoFx, batSilhouette, chirpRing, echoChirpLayered, eyeGlyph, lanternGlyph,
} from '../../../elements/kits/EchoVisuals';

/**
 * Echo's showcases.
 *
 * There is exactly one thing that has to be in every one of these loops and it is **the dark**.
 * Echo's abilities are unremarkable numbers attached to an extraordinary problem — you cannot
 * see — and a preview lit like every other element's would document a mediocre projectile kit.
 * So each script lays the same black sheet the arena lays and cuts the same holes in it, and the
 * shape of those holes is the ability.
 *
 * Echo puts no sprite in the world: the shout, the summons, the eclipse lines, the psychic eyes,
 * the vibration arcs and the blooms are all Graphics repainted per frame out of `EchoVisuals`,
 * so `ctx.fly` is useless for the kit's own attacks — it is used once, for a shot the enemy
 * fires into a summon, because that really is somebody else's projectile.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `EchoFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const SHOT_SPEED = 440;
const SHOT_DAMAGE = 18;
const SHOT_HIT_R = 28;
const SHOT_MAX_BOUNCES = 5;
const SHOT_BOUNCE_GATE_MS = 500;

const GUESS_DIRECT_R = 35;
const GUESS_DIRECT_DAMAGE = 30;
const GUESS_AOE_R = 72;
const GUESS_AOE_DAMAGE = 15;
const GUESS_SLOW_MS = 3000;

const LANTERN_RADIUS = 128;
const BASE_RADIUS = 90;
const BAT_RADIUS = 45;
const SUMMON_HP = 25;
const SUMMON_SHOT_DAMAGE = 5;
const SUMMON_SPEED = 80;
const LANTERN_HEAL_PER_SEC = 5;

const BAT_FORM_MS = 5000;
const BAT_ATTACH_MS = 3000;
const BAT_DRAIN = 3;
const BAT_TRACKER_MS = 8000;

const ECLIPSE_REVEAL_MS = 4000;
const ECLIPSE_LINES = 8;
const ECLIPSE_LINE_DAMAGE = 60;
const ECLIPSE_LINE_R = 35;
const ECLIPSE_ARM_MS = 3000;
const ECLIPSE_AIM_SCATTER = 90;

const BEACON_RANGE = 130;
const BEACON_BOOST_RANGE = 156;
const BEACON_HALF_DEG = 35;
const BEACON_BATTERIES = 3;

const BLOOM_MAX = 3;
const BLOOM_SEED_SPEED = 540;
const BLOOM_VIEW_RADIUS = 76;
const TERROR_VIEW_RADIUS = 50;
const BLOOM_SHOT_DAMAGE = 5;
const TERROR_SHOT_DAMAGE = 10;
const TERROR_LIFETIME_MS = 15000;
const VIEW_SHIELD_HP = 100;
const BIOLUM_RADIUS_MULT = 1.25;

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── The dark ──────────────────────────────────────────────────────────

/**
 * The fog sheet, and the holes cut in it — the same shape `updateFog` builds, drawn with a
 * Graphics rather than a RenderTexture because a preview box has no render target of its own.
 *
 * Holes are declared as a list the script rebuilds each frame; whatever is not in one is under
 * a 95% black sheet, exactly as it is in the arena.
 */
type Hole =
  | { kind: 'circle'; x: number; y: number; r: number }
  | { kind: 'cone'; x: number; y: number; ang: number; r: number; half: number }
  | { kind: 'all' };

function fog(ctx: PreviewCtx, read: () => Hole[]): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
  ctx.onFrame(() => {
    g.clear();
    const holes = read();
    if (holes.some((h) => h.kind === 'all')) return;
    // Painted as a black wash with the lit shapes cut back out of it in layers — a mask would
    // fight the box's own geometry mask, and the arena's RenderTexture is not available here.
    g.fillStyle(0x000000, 0.95);
    g.fillRect(0, 0, ctx.w, ctx.h);
    g.setBlendMode(Phaser.BlendModes.ERASE);
    g.fillStyle(0xffffff, 1);
    for (const h of holes) {
      if (h.kind === 'circle') { g.fillCircle(h.x, h.y, h.r); continue; }
      if (h.kind !== 'cone') continue;
      g.beginPath();
      g.moveTo(h.x, h.y);
      g.arc(h.x, h.y, h.r, h.ang - h.half, h.ang + h.half, false);
      g.closePath();
      g.fillPath();
    }
    g.setBlendMode(Phaser.BlendModes.NORMAL);
  });
}

// ── Shared staging ────────────────────────────────────────────────────

interface Stage { fx: EchoFx; av: BaseAvatar; at: Mark }

function stageIt(ctx: PreviewCtx): Stage {
  const fx = ctx.capture(() => new EchoFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new EchoAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av, at: { x: ctx.cx, y: ctx.cy } };
}

/** A caster the script moves — the bat, the attach, and the warp. */
function drivenCaster(ctx: PreviewCtx, at: Mark, o?: { scale?: () => number }): Stage {
  const fx = ctx.capture(() => new EchoFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-echo')) {
    const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-echo').setDepth(5));
    ctx.onFrame(() => {
      body.setPosition(at.x, at.y);
      body.setScale(o?.scale?.() ?? 1);
    });
  }
  const av = ctx.useAvatar(() => new EchoAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => av.update(dt, at.x, at.y, 1));
  return { fx, av, at };
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#05050d', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(21));
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
  }).setOrigin(0.5).setDepth(21));
}

/** The enemy — drawn *under* the fog, so the whole point of the element is visible. */
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

// ── Click — Echolocation ──────────────────────────────────────────────

function shoutLoop(ctx: PreviewCtx, opts: { relocation: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.28 };
  dummy(ctx, foe);
  const cursor: Mark = { x: foe.x, y: foe.y };
  fog(ctx, () => [{ kind: 'circle', x: ctx.cx, y: ctx.cy, r: BASE_RADIUS * 0.55 }]);

  interface Shot { x: number; y: number; vx: number; vy: number; bounces: number; gate: number; dead: boolean }
  const shots: Shot[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));

  ctx.at(400, () => {
    // Thrown deliberately away from them, so the bounces are what finds anybody.
    const ang = -0.9;
    s.av.play('punch', ang);
    s.fx.chirp(ctx.cx, ctx.cy, ang, { reach: 44, color: ECHO.lilac });
    shots.push({
      x: ctx.cx, y: ctx.cy,
      vx: Math.cos(ang) * SHOT_SPEED, vy: Math.sin(ang) * SHOT_SPEED,
      bounces: 0, gate: 0, dead: false,
    });
  });

  ctx.onFrame((dt, elapsed) => {
    const step = dt / 1000;
    const t = elapsed / 1000;
    g.clear();
    cursor.x = foe.x;
    cursor.y = foe.y;
    for (const p of shots) {
      if (p.dead) continue;
      p.x += p.vx * step;
      p.y += p.vy * step;

      if (elapsed - p.gate >= SHOT_BOUNCE_GATE_MS) {
        let bounced = false;
        if (p.x <= 10 || p.x >= ctx.w - 10) { p.vx *= -1; bounced = true; }
        if (p.y <= 10 || p.y >= ctx.h - 10) { p.vy *= -1; bounced = true; }
        if (bounced) {
          p.bounces++;
          p.gate = elapsed;
          // The wall answers, and dust comes off it — genuinely readable information in the dark.
          const off = Math.atan2(p.vy, p.vx);
          s.fx.chirp(p.x, p.y, off, { reach: 26, color: ECHO.mist, waves: 2, duration: 260 });
          s.fx.motes(p.x, p.y, 3, { speed: 70, angle: off, spread: 1.1, size: 1.8, life: 420 });
          if (p.bounces > SHOT_MAX_BOUNCES) { p.dead = true; continue; }
          if (opts.relocation) {
            // 60% of the way toward the cursor on every bounce, at the same speed.
            const want = Math.atan2(cursor.y - p.y, cursor.x - p.x);
            const cur = Math.atan2(p.vy, p.vx);
            const sp = Math.hypot(p.vx, p.vy);
            const blended = Phaser.Math.Angle.RotateTo(cur, want, 0.6);
            p.vx = Math.cos(blended) * sp;
            p.vy = Math.sin(blended) * sp;
            s.fx.ring(p.x, p.y, 6, 26, ECHO.pale, 260, 16, 4);
          }
        }
      }
      p.x = Phaser.Math.Clamp(p.x, 10, ctx.w - 10);
      p.y = Phaser.Math.Clamp(p.y, 10, ctx.h - 10);

      if (Phaser.Math.Distance.Between(p.x, p.y, foe.x, foe.y) <= SHOT_HIT_R) {
        p.dead = true;
        // The collapse is bigger the further it had travelled to get there.
        s.fx.boom(p.x, p.y, 46 + p.bounces * 6, {
          color: ECHO.lilac, arcs: 5 + p.bounces * 2, motes: 8 + p.bounces * 3,
          duration: 380 + p.bounces * 60, mark: false,
        });
        tick(ctx, foe.x, foe.y - 20, `${SHOT_DAMAGE}`, ECHO.lilac);
        tick(ctx, foe.x, foe.y - 38, `after ${p.bounces} bounces`, ECHO.mist);
        continue;
      }
      EchoFx.drawBolt(g, ctx.tint, p.x, p.y, Math.atan2(p.vy, p.vx), p.bounces, t);
    }
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.relocation ? 'every bounce turns 60% toward the cursor — a shot you steer, one wall at a time'
      : `${SHOT_SPEED} px/s, up to ${SHOT_MAX_BOUNCES} bounces, ${SHOT_DAMAGE} to the first body it finds`,
    ECHO.slate);
}

export const echolocation: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Click — a shout that comes off the walls five times, and answers with a chirp each time',
  run(ctx) { shoutLoop(ctx, { relocation: false }); },
};

export const echolocationUpgraded: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Re-location — on every bounce it turns most of the way toward your cursor and comes back',
  run(ctx) { shoutLoop(ctx, { relocation: true }); },
};

// ── E — Guess ─────────────────────────────────────────────────────────

function guessLoop(ctx: PreviewCtx, opts: { paranoia: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.72, y: ctx.h * 0.44 };
  dummy(ctx, foe);
  let revealUntil = -9999;
  let now = 0;
  fog(ctx, () => {
    const holes: Hole[] = [{ kind: 'circle', x: ctx.cx, y: ctx.cy, r: BASE_RADIUS * 0.5 }];
    if (now < revealUntil) holes.push({ kind: 'circle', x: foe.x, y: foe.y, r: 44 });
    return holes;
  });
  ctx.onFrame((_dt, elapsed) => { now = elapsed; });

  // Where the guess is aimed, drawn as the reticle it deserves.
  const aim: Mark = { x: 0, y: 0 };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  let aimUntil = -9999;
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    if (elapsed > aimUntil) return;
    g.lineStyle(1.2, ctx.tint(ECHO.slate), 0.6);
    g.strokeCircle(aim.x, aim.y, GUESS_DIRECT_R);
    g.lineStyle(1, ctx.tint(ECHO.dusk), 0.35);
    g.strokeCircle(aim.x, aim.y, GUESS_AOE_R);
  });

  const guess = (at: number, tx: number, ty: number): void => {
    ctx.at(at, () => {
      aim.x = tx;
      aim.y = ty;
      aimUntil = at + 700;
      s.av.play('sweep', Math.atan2(ty - ctx.cy, tx - ctx.cx));
      const d = Phaser.Math.Distance.Between(tx, ty, foe.x, foe.y);
      const direct = d <= GUESS_DIRECT_R;
      // Tight when it lands and loose when it does not — the shape is the answer.
      s.fx.sonar(tx, ty, direct ? 44 : 72,
        { pulses: direct ? 4 : 2, color: direct ? ECHO.ghost : ECHO.slate, duration: 640 });
      if (direct) {
        s.fx.boom(foe.x, foe.y, 62, { color: ECHO.pale, arcs: 9, motes: 16 });
        s.fx.eyeOpen(foe.x, foe.y - 34, 14, { color: ECHO.gold, duration: 780 });
        revealUntil = at + 500;
        tick(ctx, foe.x, foe.y - 18, `${GUESS_DIRECT_DAMAGE}`, ECHO.pale);
        if (opts.paranoia) tick(ctx, ctx.cx, ctx.cy - 46, '👁 PARANOIA · CD → 1s', ECHO.terrorHi);
        return;
      }
      if (d <= GUESS_AOE_R) {
        s.fx.ring(foe.x, foe.y, 8, 44, ECHO.pale, 340, 18, 7);
        s.fx.eyeOpen(foe.x, foe.y - 30, 10, { color: ECHO.pale, duration: 560 });
        revealUntil = at + 500;
        tick(ctx, foe.x, foe.y - 18, `${GUESS_AOE_DAMAGE}`, ECHO.pale);
        if (opts.paranoia) tick(ctx, ctx.cx, ctx.cy - 46, '👁 PARANOIA · CD → 1s', ECHO.terrorHi);
        return;
      }
      // Wrong. The sound comes back empty and you lose your footing in it.
      s.fx.mark(tx, ty, 30, 4, ECHO.dusk);
      s.fx.motes(ctx.cx, ctx.cy, 10, { speed: 60, size: 2, life: 900, color: ECHO.slate, drift: 6 });
      for (let i = 0; i < 3; i++) {
        ctx.at(i * 130, () => s.fx.chirp(ctx.cx, ctx.cy, Math.random() * Math.PI * 2,
          { reach: 30, color: ECHO.dusk, waves: 1, duration: 420 }));
      }
      tick(ctx, ctx.cx, ctx.cy - 34, 'DISORIENTED!', 0xff8888);
      tick(ctx, ctx.cx, ctx.cy - 52, `−50% SPEED · ${GUESS_SLOW_MS / 1000}s`, 0xff8888);
    });
  };

  if (opts.paranoia) {
    // Chained: a correct guess is a second's cooldown, so it can simply be asked again.
    guess(600, foe.x - 8, foe.y + 6);
    guess(2100, foe.x + 10, foe.y - 8);
    guess(3600, foe.x - 4, foe.y + 12);
    ctx.at(2100, () => { foe.x += 30; foe.y -= 14; });
    ctx.at(3600, () => { foe.x -= 22; foe.y += 20; });
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      '5s → 1s on any correct guess, direct or the 72px near miss', ECHO.slate);
    return;
  }
  guess(600, ctx.w * 0.5, ctx.h * 0.72);
  guess(3000, foe.x + 20, foe.y - 12);
  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `${GUESS_DIRECT_R}px is ${GUESS_DIRECT_DAMAGE} · ${GUESS_AOE_R}px is ${GUESS_AOE_DAMAGE} · anything else halves your speed for 3s`,
    ECHO.slate);
}

export const guess: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'E — point at a patch of black and commit. Wrong costs you half your speed for three seconds',
  run(ctx) { guessLoop(ctx, { paranoia: false }); },
};

export const guessUpgraded: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'Paranoia — a correct guess drops the cooldown to one second, so you can keep asking',
  run(ctx) { guessLoop(ctx, { paranoia: true }); },
};

// ── R — Lantern ───────────────────────────────────────────────────────

function lanternLoop(ctx: PreviewCtx, opts: { healing: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.82, y: ctx.h * 0.38 };
  dummy(ctx, foe);

  let lit = false;
  interface Summon { x: number; y: number; hp: number; look: number }
  const summons: Summon[] = [];
  fog(ctx, () => {
    const holes: Hole[] = [{
      kind: 'circle', x: ctx.cx, y: ctx.cy,
      r: (lit ? LANTERN_RADIUS : BASE_RADIUS) * 0.5,
    }];
    // A summon shows only its own body through the dark — unless R+ gives it a lamp.
    for (const su of summons) {
      holes.push({ kind: 'circle', x: su.x, y: su.y, r: opts.healing ? 40 : 14 });
    }
    return holes;
  });

  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  interface Shot { x: number; y: number; vx: number; vy: number; born: number; dead: boolean }
  const shots: Shot[] = [];
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    g.clear();
    // The lamp itself, swinging on its hook.
    if (lit) lanternGlyph(g, ctx.tint, ctx.cx + 16, ctx.cy - 22, Math.sin(t * 2.2) * 0.3, 11, 1, true);
    for (const su of summons) {
      const d = Phaser.Math.Distance.Between(su.x, su.y, foe.x, foe.y);
      if (d > 40) {
        su.x += ((foe.x - su.x) / d) * SUMMON_SPEED * step;
        su.y += ((foe.y - su.y) / d) * SUMMON_SPEED * step;
      }
      su.look = Math.atan2(foe.y - su.y, foe.x - su.x);
      EchoFx.drawSummon(g, ctx.tint, su.x, su.y, su.look, su.hp / SUMMON_HP, t);
    }
    for (const p of shots) {
      if (p.dead) continue;
      p.x += p.vx * step;
      p.y += p.vy * step;
      if (Phaser.Math.Distance.Between(p.x, p.y, foe.x, foe.y) <= 24) {
        p.dead = true;
        s.fx.ring(p.x, p.y, 4, 30, ECHO.slate, 300, 18, 5);
        tick(ctx, foe.x, foe.y - 16, `${SUMMON_SHOT_DAMAGE}`, ECHO.slate);
        continue;
      }
      if (elapsed - p.born > 1300) { p.dead = true; continue; }
      echoChirpLayered(g, ctx.tint, p.x, p.y, Math.atan2(p.vy, p.vx), 9, 0.8, 1.6, ECHO.slate, 0.9, 2);
    }
  });

  // Strike the lantern, and then have it broken by a single point of damage.
  ctx.at(500, () => {
    lit = true;
    s.av.play('flex');
    s.fx.flash(ctx.cx, ctx.cy - 30, 22, 19, ECHO.lamp);
    s.fx.ring(ctx.cx, ctx.cy, 14, 120, ECHO.lamp, 520, 15, 8);
    s.fx.motes(ctx.cx, ctx.cy - 26, 12, { speed: 80, size: 2.2, life: 900, color: ECHO.gold, drift: -30 });
    tick(ctx, ctx.cx, ctx.cy - 34, 'LANTERN', ECHO.lamp);
    tick(ctx, ctx.cx, ctx.cy - 52, `${BASE_RADIUS}px → ${LANTERN_RADIUS}px`, ECHO.gold);
  });
  if (opts.healing) {
    for (let i = 1; i <= 3; i++) {
      ctx.at(500 + i * 1000, () => {
        if (!lit) return;
        tick(ctx, ctx.cx, ctx.cy - 40, `+${LANTERN_HEAL_PER_SEC} ❤`, 0x88ff88);
      });
    }
  }

  // A summon, torn off the enemy's own body.
  ctx.at(2200, () => {
    s.av.play('punch', Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx));
    s.fx.sonar(foe.x, foe.y, 70, { pulses: 3, color: ECHO.ghost, duration: 700 });
    s.fx.tether(foe.x, foe.y, foe.x - 40, foe.y, ECHO.pale, 18);
    summons.push({ x: foe.x - 40, y: foe.y, hp: SUMMON_HP, look: 0 });
    tick(ctx, ctx.cx, ctx.cy - 34, 'VISION', ECHO.gold);
  });
  for (let i = 0; i < 2; i++) {
    ctx.at(3400 + i * 2000, () => {
      const su = summons[0];
      if (!su) return;
      const a = Math.atan2(foe.y - su.y, foe.x - su.x);
      s.fx.chirp(su.x, su.y, a, { reach: 26, color: ECHO.slate, waves: 2, duration: 260 });
      shots.push({
        x: su.x, y: su.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160,
        born: 3400 + i * 2000, dead: false,
      });
    });
  }

  // One point of damage and the glass goes.
  ctx.at(5200, () => {
    ctx.fly({
      texture: 'proj-fire',
      from: { x: foe.x, y: foe.y },
      to: { x: ctx.cx, y: ctx.cy },
      speed: 560,
      onHit: () => {
        if (!lit) return;
        lit = false;
        s.fx.flash(ctx.cx, ctx.cy - 26, 26, 19, ECHO.lampCore);
        s.fx.motes(ctx.cx, ctx.cy - 26, 16, { speed: 210, size: 2.4, life: 780, color: ECHO.gold, drift: 40 });
        s.fx.ring(ctx.cx, ctx.cy, 90, 8, ECHO.umbra, 420, 15, 10);
        tick(ctx, ctx.cx, ctx.cy - 34, 'LANTERN SHATTERED!', 0xff8844);
      },
    });
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.healing ? `${LANTERN_HEAL_PER_SEC} HP a second while it burns, and every summon carries its own lamp`
      : `one point of damage puts it out · a summon is ${SUMMON_HP} HP and ${SUMMON_SHOT_DAMAGE} a shot`,
    ECHO.slate);
}

export const lantern: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'R — a lantern that shows you half again as far, and breaks on a single point of damage',
  run(ctx) { lanternLoop(ctx, { healing: false }); },
};

export const lanternUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Healing Light — 5 HP a second for as long as it burns, and summons that light their own way',
  run(ctx) { lanternLoop(ctx, { healing: true }); },
};

// ── F — Bat Form ──────────────────────────────────────────────────────

function batLoop(ctx: PreviewCtx, opts: { alpha: boolean }): void {
  const home: Mark = { x: ctx.w * 0.2, y: ctx.h * 0.66 };
  let batUntil = -9999;
  let attachUntil = -9999;
  let now = 0;
  const s = drivenCaster(ctx, home, { scale: () => (now < batUntil ? 0.5 : 1) });
  const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.36 };
  dummy(ctx, foe);
  fog(ctx, () => [{
    kind: 'circle', x: home.x, y: home.y,
    r: (now < batUntil ? BAT_RADIUS : BASE_RADIUS) * 0.55,
  }]);
  ctx.onFrame((_dt, elapsed) => { now = elapsed; });

  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    if (elapsed >= batUntil) return;
    // A blur of wingbeats where the body was.
    batSilhouette(g, ctx.tint, home.x, home.y - 6, Math.atan2(foe.y - home.y, foe.x - home.x),
      13, Math.sin(t * 18), opts.alpha ? 0x888888 : ECHO.mist, 0.95, elapsed < attachUntil);
  });

  ctx.at(500, () => {
    const aim = Math.atan2(foe.y - home.y, foe.x - home.x);
    s.av.play('dash', aim);
    // Turning into a bat is a shape change, so it gets one: the body scatters into a flock.
    s.fx.bats(home.x, home.y, 7, { speed: 230, angle: aim, spread: 1.5, size: 10, life: 620 });
    s.fx.ring(home.x, home.y, 10, 54, ECHO.umbra, 380, 15, 9);
    batUntil = 500 + BAT_FORM_MS;
    tick(ctx, home.x, home.y - 36, 'BAT FORM!', ECHO.lilac);
    tick(ctx, home.x, home.y - 54, `×2 SPEED · ${BASE_RADIUS}px → ${BAT_RADIUS}px`, ECHO.mist);
  });

  // Doubled speed, crossing the room. And then, with the enemy under the cursor, the attach.
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < 700 || elapsed >= attachUntil) {
      if (elapsed < 700 || elapsed >= batUntil) return;
      const d = Phaser.Math.Distance.Between(home.x, home.y, foe.x, foe.y);
      if (d <= 40) return;
      const step = Math.min(d, 190 * 2 * (dt / 1000));
      home.x += ((foe.x - home.x) / d) * step;
      home.y += ((foe.y - home.y) / d) * step;
      return;
    }
    // Attached: flown onto them at 500 px/s and held there.
    home.x = Phaser.Math.Linear(home.x, foe.x, Math.min(1, dt / 60));
    home.y = Phaser.Math.Linear(home.y, foe.y, Math.min(1, dt / 60));
  });

  ctx.at(3200, () => {
    attachUntil = 3200 + BAT_ATTACH_MS;
    batUntil = attachUntil;
    s.fx.dashTrail(home.x, home.y, foe.x, foe.y, { color: ECHO.mist });
    s.fx.tether(home.x, home.y, foe.x, foe.y, ECHO.terror, 17);
    tick(ctx, home.x, home.y - 40, '🦇 ATTACHED · INVINCIBLE', ECHO.terror);
    if (!opts.alpha) return;
    tick(ctx, foe.x, foe.y - 56, `📡 TRACKED · ${BAT_TRACKER_MS / 1000}s`, ECHO.biolum);
  });
  // 3 damage every half second for the three seconds it holds on.
  for (let i = 1; i <= 6; i++) {
    ctx.at(3200 + i * 500, () => {
      s.fx.motes(foe.x, foe.y, 4, {
        speed: 70, angle: Math.atan2(home.y - foe.y, home.x - foe.x),
        spread: 0.7, size: 2, life: 380, color: ECHO.terrorHi,
      });
      tick(ctx, foe.x + (Math.random() - 0.5) * 16, foe.y - 14, `${BAT_DRAIN}`, ECHO.terror);
    });
  }
  // The tracker keeps answering long after the bat has let go.
  if (opts.alpha) {
    for (let i = 0; i < 2; i++) {
      ctx.at(6400 + i * 1400, () => {
        s.fx.sonar(foe.x, foe.y, 42, { pulses: 2, color: ECHO.biolum, duration: 620 });
        s.fx.eyeOpen(foe.x, foe.y - 30, 8, { color: ECHO.biolum, duration: 520 });
        tick(ctx, foe.x, foe.y - 24, 'ping', 0x44ff66);
      });
    }
  }

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.alpha ? `grey, cancellable, the only form that can shout — and an ${BAT_TRACKER_MS / 1000}s tracker on anybody you land on`
      : `${BAT_ATTACH_MS / 1000}s of total invincibility for ${BAT_DRAIN * 6} damage, and no casting at all`,
    ECHO.slate);
}

export const batForm: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'F — double speed and half the sight, or three seconds latched on and untouchable',
  run(ctx) { batLoop(ctx, { alpha: false }); },
};

export const batFormUpgraded: PreviewScript = {
  duration: 9200,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Alpha Bat — grey, cancellable, the only form that can echolocate, and it leaves a tracker',
  run(ctx) { batLoop(ctx, { alpha: true }); },
};

// ── Q — Total Eclipse ─────────────────────────────────────────────────

function eclipseLoop(ctx: PreviewCtx, opts: { hypersense: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.74, y: ctx.h * 0.4 };
  dummy(ctx, foe);
  let revealUntil = -9999;
  let now = 0;
  ctx.onFrame((_dt, elapsed) => { now = elapsed; });
  fog(ctx, () => (now < revealUntil
    ? [{ kind: 'all' }]
    : [{ kind: 'circle', x: ctx.cx, y: ctx.cy, r: BASE_RADIUS * 0.5 }]));

  if (opts.hypersense) {
    // Q+ on a direct cast: the lines, bigger and lingering. On the reveal: auto-dodging.
    interface Line { cx: number; cy: number; ang: number; at: number; gone: boolean }
    const lines: Line[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.at(500, () => {
      s.av.play('raise', ctx.aim, 1100);
      s.fx.channelCharge(ctx.cx, ctx.cy, 50, 600, { color: ECHO.ghost, depth: 18 });
      revealUntil = 500 + ECLIPSE_REVEAL_MS;
      for (let i = 0; i < ECLIPSE_LINES; i++) {
        const cx = Phaser.Math.Between(20, Math.floor(ctx.w) - 20);
        const cy = Phaser.Math.Between(20, Math.floor(ctx.h) - 20);
        const ang = Math.random() * Math.PI * 2;
        lines.push({ cx, cy, ang, at: 500 + ECLIPSE_ARM_MS, gone: false });
        ctx.at(i * 60, () => s.fx.chirp(cx, cy, ang,
          { reach: 60, spread: 1.1, color: ECHO.ghost, duration: 400 }));
      }
      tick(ctx, ctx.cx, ctx.cy - 40, `📡 ${ECLIPSE_LINES} STANDING WAVES`, ECHO.ghost);
    });
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      const len = Math.hypot(ctx.w, ctx.h);
      g.clear();
      for (const l of lines) {
        if (l.gone) continue;
        if (elapsed < l.at) {
          const urgency = Phaser.Math.Clamp(1 - (l.at - elapsed) / ECLIPSE_ARM_MS, 0, 1);
          EchoFx.drawEclipseLine(g, ctx.tint, l.cx, l.cy, l.ang, len, urgency, t);
          continue;
        }
        l.gone = true;
        const ax = l.cx - Math.cos(l.ang) * len / 2;
        const ay = l.cy - Math.sin(l.ang) * len / 2;
        const dx = Math.cos(l.ang) * len;
        const dy = Math.sin(l.ang) * len;
        const tt = Phaser.Math.Clamp(((foe.x - ax) * dx + (foe.y - ay) * dy) / (len * len), 0, 1);
        const hit = Phaser.Math.Distance.Between(foe.x, foe.y, ax + tt * dx, ay + tt * dy) <= ECLIPSE_LINE_R;
        // Q+: nine blasts along each line instead of six, and the afterimage holds 2.4s.
        for (let k = 0; k < 9; k++) {
          const u = (k + 0.5) / 9;
          ctx.at(k * 34, () => s.fx.boom(ax + dx * u, ay + dy * u, 62,
            { color: ECHO.white, arcs: 9, motes: 12, duration: 520, mark: k % 2 === 0 }));
        }
        s.fx.dashTrail(ax, ay, ax + dx, ay + dy, { color: ECHO.ghost, width: 26, duration: 2400 });
        if (hit) tick(ctx, foe.x, foe.y - 20, `${ECLIPSE_LINE_DAMAGE}`, ECHO.white);
      }
    });
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'and on a non-direct Q instead: 4 seconds of dodging everything automatically', ECHO.slate);
    return;
  }

  ctx.at(500, () => {
    s.av.play('raise', ctx.aim, 1100);
    revealUntil = 500 + ECLIPSE_REVEAL_MS;
    s.fx.sonar(ctx.cx, ctx.cy, Math.hypot(ctx.w, ctx.h) * 0.6,
      { pulses: 4, color: ECHO.lamp, duration: 1400 });
    s.fx.flash(ctx.cx, ctx.cy, 60, 19, ECHO.white);
    s.fx.bats(ctx.cx, ctx.cy, 12, { speed: 340, size: 11, life: 900 });
    s.fx.eyeOpen(foe.x, foe.y - 36, 16, { color: ECHO.terror, duration: 900 });
    ctx.scene.cameras.main.shake(160, 0.004);
    tick(ctx, ctx.cx, ctx.cy - 36, 'TOTAL ECLIPSE!', ECHO.lamp);
    tick(ctx, foe.x, foe.y - 34, `🎯 +${ECLIPSE_AIM_SCATTER}° AIM SCATTER`, ECHO.terror);
  });
  // They keep firing, and none of it goes where they meant.
  for (let i = 0; i < 4; i++) {
    ctx.at(1200 + i * 700, () => {
      if (now > revealUntil) return;
      const a = Math.atan2(ctx.cy - foe.y, ctx.cx - foe.x)
        + (Math.random() - 0.5) * Phaser.Math.DegToRad(ECLIPSE_AIM_SCATTER * 2);
      ctx.fly({
        texture: 'proj-fire',
        from: { x: foe.x, y: foe.y },
        to: { x: foe.x + Math.cos(a) * 400, y: foe.y + Math.sin(a) * 400 },
        speed: 520,
      });
    });
  }
  ctx.at(500 + ECLIPSE_REVEAL_MS, () => tick(ctx, ctx.cx, ctx.cy - 36, 'THE DARK RETURNS', ECHO.umbra));

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `${ECLIPSE_REVEAL_MS / 1000}s with no dark anywhere — for both of you — and ${ECLIPSE_AIM_SCATTER}° off every shot they take`,
    ECHO.slate);
}

export const totalEclipse: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Q — the dark comes off the whole arena for four seconds, and their aim goes to pieces',
  run(ctx) { eclipseLoop(ctx, { hypersense: false }); },
};

export const totalEclipseUpgraded: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'Hypersense — bigger, longer-burning lines on a direct Q, and auto-dodging on the reveal',
  run(ctx) { eclipseLoop(ctx, { hypersense: true }); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const theDark: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: '90px of ground, and nothing else. The lantern is 128, a bat is 45, and it applies to both of you',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.32, y: ctx.h * 0.56 };
    let mode = 0;
    const s = drivenCaster(ctx, home, { scale: () => (mode === 2 ? 0.5 : 1) });
    const foe: Mark = { x: ctx.w * 0.74, y: ctx.h * 0.4 };
    dummy(ctx, foe);
    const RADII = [BASE_RADIUS, LANTERN_RADIUS, BAT_RADIUS, BASE_RADIUS * BIOLUM_RADIUS_MULT];
    fog(ctx, () => [{ kind: 'circle', x: home.x, y: home.y, r: RADII[mode] * 0.5 }]);

    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      if (mode === 1) lanternGlyph(g, ctx.tint, home.x + 16, home.y - 22, Math.sin(t * 2.2) * 0.3, 11, 1, true);
      if (mode === 2) {
        batSilhouette(g, ctx.tint, home.x, home.y - 6, 0, 13, Math.sin(t * 18), ECHO.mist, 0.95);
      }
      if (mode === 3) chirpRing(g, ctx.tint, home.x, home.y, 26, 2, ECHO.biolum, 0.7, 6, t * 1.2);
    });

    const rows: Array<{ at: number; mode: number; text: string; color: number }> = [
      { at: 600, mode: 0, text: `${BASE_RADIUS}px · nothing at all`, color: ECHO.slate },
      { at: 2600, mode: 1, text: `${LANTERN_RADIUS}px · the lantern, and you are the brightest thing in the room`, color: ECHO.lamp },
      { at: 4600, mode: 2, text: `${BAT_RADIUS}px · a bat sees by sound`, color: ECHO.mist },
      { at: 6600, mode: 3, text: `${Math.round(BASE_RADIUS * BIOLUM_RADIUS_MULT)}px · bioluminescent, 8s after a warp`, color: ECHO.biolum },
    ];
    for (const r of rows) {
      ctx.at(r.at, () => {
        mode = r.mode;
        s.fx.ring(home.x, home.y, 8, RADII[r.mode] * 0.5, ECHO.pale, 420, 16, 5);
        tick(ctx, home.x, home.y - 40, r.text, r.color);
      });
    }
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'the enemy is standing right there the whole time', ECHO.dusk);
  },
};

export const psychicEye: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Eyes collect around you. Spend one and the next cast is aimed at them, not at your guess',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.76, y: ctx.h * 0.36 };
    dummy(ctx, foe);
    fog(ctx, () => [{ kind: 'circle', x: ctx.cx, y: ctx.cy, r: BASE_RADIUS * 0.5 }]);

    interface Eye { off: number; x: number; y: number }
    const eyes: Eye[] = [];
    let armed = false;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      eyes.forEach((e, i) => {
        e.x = ctx.cx + Math.cos(t * 0.9 + e.off) * (30 + i * 4);
        e.y = ctx.cy - 20 + Math.sin(t * 1.3 + e.off) * 12;
        EchoFx.drawPsychicEye(g, ctx.tint, e.x, e.y, Math.atan2(foe.y - e.y, foe.x - e.x),
          armed && i === 0, e.off * 100, t);
      });
      if (!armed) return;
      // Armed: the next cast goes at them wherever they are.
      g.lineStyle(1, ctx.tint(ECHO.terror), 0.35 + 0.3 * Math.sin(t * 8));
      g.lineBetween(ctx.cx, ctx.cy, foe.x, foe.y);
      eyeGlyph(g, ctx.tint, foe.x, foe.y - 30, 0, 0, 9, ECHO.terror, 0.8);
    });

    for (let i = 0; i < 3; i++) {
      ctx.at(500 + i * 700, () => {
        eyes.push({ off: Math.random() * Math.PI * 2, x: ctx.cx, y: ctx.cy });
        s.fx.eyeOpen(ctx.cx, ctx.cy - 24, 11, { color: ECHO.pale, duration: 520 });
        tick(ctx, ctx.cx, ctx.cy - 44, `👁 ${eyes.length}/5`, ECHO.pale);
      });
    }
    ctx.at(3200, () => {
      const spent = eyes.shift();
      armed = true;
      if (spent) {
        s.fx.flash(spent.x, spent.y, 14, 19, ECHO.terrorHi);
        s.fx.motes(spent.x, spent.y, 7, { speed: 100, size: 2, life: 480, color: ECHO.terror });
      }
      s.fx.ring(ctx.cx, ctx.cy, 34, 8, ECHO.terror, 360, 18, 5);
      tick(ctx, ctx.cx, ctx.cy - 34, '👁 POWER!', ECHO.terror);
      tick(ctx, ctx.cx, ctx.cy - 52, 'next cast is aimed at them', ECHO.terrorHi);
    });
    ctx.at(4600, () => {
      armed = false;
      s.av.play('sweep', Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx));
      s.fx.sonar(foe.x, foe.y, 44, { pulses: 4, color: ECHO.ghost, duration: 640 });
      s.fx.boom(foe.x, foe.y, 62, { color: ECHO.pale, arcs: 9, motes: 16 });
      tick(ctx, foe.x, foe.y - 18, `${GUESS_DIRECT_DAMAGE}`, ECHO.pale);
      tick(ctx, foe.x, foe.y - 36, 'a guess that cannot miss', ECHO.gold);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'right-click to spend one · needs E+ Paranoia or Q+ Hypersense to work at all', ECHO.slate);
  },
};

// ── Perk — Beacon ─────────────────────────────────────────────────────

export const perkBeacon: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'The circle becomes a torch beam — much further where you look, and blind everywhere else',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.8, y: ctx.h * 0.34 };
    dummy(ctx, foe);
    const cursor: Mark = { x: ctx.w * 0.7, y: ctx.h * 0.5 };
    let boostUntil = -9999;
    let now = 0;
    ctx.onFrame((_dt, elapsed) => {
      now = elapsed;
      // The beam sweeps: the whole perk is that vision is a direction now.
      const a = Math.sin(elapsed / 1300) * 0.9 - 0.2;
      cursor.x = ctx.cx + Math.cos(a) * 120;
      cursor.y = ctx.cy + Math.sin(a) * 120;
    });
    fog(ctx, () => [{
      kind: 'cone', x: ctx.cx, y: ctx.cy,
      ang: Math.atan2(cursor.y - ctx.cy, cursor.x - ctx.cx),
      r: (now < boostUntil ? BEACON_BOOST_RANGE : BEACON_RANGE) * 0.55,
      half: Phaser.Math.DegToRad(BEACON_HALF_DEG),
    }]);

    // The three batteries, and what the lantern key costs now.
    let batteries = BEACON_BATTERIES;
    const cells = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 12, '', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(ECHO.amber),
    }).setOrigin(0.5).setDepth(21));
    ctx.onFrame(() => {
      cells.setText('🔋'.repeat(batteries) + '🪫'.repeat(BEACON_BATTERIES - batteries));
    });

    ctx.at(1600, () => {
      batteries -= 1;
      boostUntil = 1600 + 2000;
      s.av.play('flex');
      s.fx.ring(ctx.cx, ctx.cy, 14, 90, ECHO.lamp, 420, 15, 7);
      tick(ctx, ctx.cx, ctx.cy - 34, '🔋 −1 · CONE +20% · 2s', ECHO.amber);
    });
    ctx.at(4200, () => {
      batteries -= 2;
      s.av.play('punch', Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx));
      s.fx.sonar(foe.x, foe.y, 70, { pulses: 3, color: ECHO.ghost, duration: 700 });
      tick(ctx, ctx.cx, ctx.cy - 34, '🔋 −2 · ECHO SUMMONED', ECHO.amber);
    });
    ctx.at(6200, () => {
      tick(ctx, ctx.cx, ctx.cy - 34, '🔋 EMPTY', 0xff9900);
      tick(ctx, ctx.cx, ctx.cy - 52, 'no cast, no cooldown', ECHO.slate);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${BEACON_RANGE}px at ±${BEACON_HALF_DEG}° instead of a ${BASE_RADIUS}px circle · 3 batteries, 8s each`,
      ECHO.slate);
  },
};

// ── Mastery ───────────────────────────────────────────────────────────

export const masteryVibrationDetection: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'The floor tells you which quadrant they are in — thin for a footstep, bright for a cast',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.74, y: ctx.h * 0.3 };
    dummy(ctx, foe);
    fog(ctx, () => [{ kind: 'circle', x: ctx.cx, y: ctx.cy, r: BASE_RADIUS * 0.42 }]);

    interface Arc { quadrant: number; born: number; strong: boolean }
    const arcs: Arc[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(20));
    const quadrantOf = (x: number, y: number): number => {
      const a = Math.atan2(y - ctx.cy, x - ctx.cx) + Math.PI / 4;
      const norm = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      return Math.floor(norm / (Math.PI / 2)) % 4;
    };

    let last = { x: foe.x, y: foe.y };
    let nextSample = 0;
    let nextMoveArc = 0;
    ctx.onFrame((_dt, elapsed) => {
      // They walk a circuit around you, all of it in the dark.
      const t = elapsed / 1000;
      foe.x = ctx.cx + Math.cos(t * 0.85) * ctx.w * 0.3;
      foe.y = ctx.cy + Math.sin(t * 0.85) * ctx.h * 0.3;

      if (elapsed >= nextSample) {
        nextSample = elapsed + 90;
        if (Phaser.Math.Distance.Between(last.x, last.y, foe.x, foe.y) > 6 && elapsed >= nextMoveArc) {
          nextMoveArc = elapsed + 220;
          arcs.push({ quadrant: quadrantOf(foe.x, foe.y), born: elapsed, strong: false });
        }
        last = { x: foe.x, y: foe.y };
      }

      g.clear();
      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i];
        const life = arc.strong ? 700 : 420;
        const k = (elapsed - arc.born) / life;
        if (k >= 1) { arcs.splice(i, 1); continue; }
        EchoFx.drawVibeArc(g, ctx.tint, ctx.cx, ctx.cy, arc.quadrant * (Math.PI / 2),
          Phaser.Math.DegToRad(arc.strong ? 42 : 32),
          (arc.strong ? 40 : 34) + k * (arc.strong ? 9 : 5), arc.strong, 1 - k);
      }
    });

    // A cast is a much louder disturbance than a footstep, and it is never rate-limited.
    for (const at of [2000, 4400, 6200]) {
      ctx.at(at, () => {
        arcs.push({ quadrant: quadrantOf(foe.x, foe.y), born: at, strong: true });
        s.fx.ring(foe.x, foe.y, 6, 30, ECHO.sonar, 320, 14, 5);
        tick(ctx, ctx.cx, ctx.cy - 40, 'THEY CAST SOMETHING', ECHO.sonar);
      });
    }

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'four quadrants, never a distance — it says which way to look and nothing more', ECHO.slate);
  },
};

export const masteryEchoBloom: PreviewScript = {
  duration: 11000,
  scale: 0.86,
  bodyTexture: '',
  caption: 'Plant eyes, then move into them: look out of one, shoot from it, or step through',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.2, y: ctx.h * 0.7 };
    const s = drivenCaster(ctx, home);
    const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.3 };
    dummy(ctx, foe);

    interface Bloom { x: number; y: number; kind: 'echo' | 'terror'; sway: number; host: Mark | null }
    const blooms: Bloom[] = [];
    let viewing = -1;
    let biolumUntil = -9999;
    let now = 0;
    ctx.onFrame((_dt, elapsed) => { now = elapsed; });

    fog(ctx, () => {
      if (viewing >= 0 && blooms[viewing]) {
        const b = blooms[viewing];
        // While an eye is open you see out of the bloom, not out of yourself.
        return [{
          kind: 'circle', x: b.x, y: b.y,
          r: (b.kind === 'terror' ? TERROR_VIEW_RADIUS : BLOOM_VIEW_RADIUS) * 0.6,
        }];
      }
      const r = BASE_RADIUS * 0.45 * (now < biolumUntil ? BIOLUM_RADIUS_MULT : 1);
      return [{ kind: 'circle', x: home.x, y: home.y, r }];
    });

    // Seeds, blooms, and the bullets spat out of one.
    interface Seed { x: number; y: number; vx: number; vy: number; kind: 'echo' | 'terror'; dead: boolean }
    const seeds: Seed[] = [];
    interface Bullet { x: number; y: number; vx: number; vy: number; damage: number; dead: boolean }
    const bullets: Bullet[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      const step = dt / 1000;
      g.clear();

      for (const sd of seeds) {
        if (sd.dead) continue;
        sd.x += sd.vx * step;
        sd.y += sd.vy * step;
        if (sd.x >= ctx.w - 10 || sd.y <= 10 || sd.x <= 10 || sd.y >= ctx.h - 10) {
          sd.dead = true;
          blooms.push({
            x: Phaser.Math.Clamp(sd.x, 10, ctx.w - 10),
            y: Phaser.Math.Clamp(sd.y, 10, ctx.h - 10),
            kind: 'echo', sway: Math.random() * Math.PI * 2, host: null,
          });
          if (blooms.length > BLOOM_MAX) blooms.shift();
          s.fx.eyeOpen(sd.x, sd.y, 12, { color: ECHO.pale, duration: 620 });
          continue;
        }
        echoChirpLayered(g, ctx.tint, sd.x, sd.y, Math.atan2(sd.vy, sd.vx), 10, 0.8, 1.6,
          ECHO.pale, 0.9, 2);
      }

      for (const b of blooms) {
        if (b.host) { b.x = b.host.x; b.y = b.host.y; }
        const sway = Math.sin(t * 1.6 + b.sway) * 0.2;
        // A flower with an eye in it, drawn in its own colour.
        const col = b.kind === 'terror' ? ECHO.terror : ECHO.pale;
        g.fillStyle(ctx.tint(col), 0.28);
        g.fillCircle(b.x, b.y, 9);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + sway;
          g.fillStyle(ctx.tint(b.kind === 'terror' ? ECHO.terrorDeep : ECHO.mist), 0.85);
          g.fillEllipse(b.x + Math.cos(a) * 7, b.y + Math.sin(a) * 7, 6.5, 4);
        }
        eyeGlyph(g, ctx.tint, b.x, b.y, sway, Math.atan2(foe.y - b.y, foe.x - b.x), 7, col, 1);
      }

      for (const bl of bullets) {
        if (bl.dead) continue;
        bl.x += bl.vx * step;
        bl.y += bl.vy * step;
        if (Phaser.Math.Distance.Between(bl.x, bl.y, foe.x, foe.y) <= 22) {
          bl.dead = true;
          s.fx.ring(bl.x, bl.y, 4, 26, ECHO.biolum, 280, 18, 5);
          tick(ctx, foe.x, foe.y - 16, `${bl.damage}`, ECHO.biolumHi);
          continue;
        }
        if (bl.x < 0 || bl.x > ctx.w || bl.y < 0 || bl.y > ctx.h) { bl.dead = true; continue; }
        g.fillStyle(ctx.tint(ECHO.biolumHi), 0.95);
        g.fillCircle(bl.x, bl.y, 2.6);
      }
    });

    // A seed at a wall, then one straight at them.
    ctx.at(500, () => {
      const a = -0.5;
      s.av.play('punch', a);
      s.fx.chirp(home.x, home.y, a, { reach: 32, color: ECHO.pale, waves: 2 });
      seeds.push({ x: home.x, y: home.y, vx: Math.cos(a) * BLOOM_SEED_SPEED, vy: Math.sin(a) * BLOOM_SEED_SPEED, kind: 'echo', dead: false });
      tick(ctx, home.x, home.y - 34, '🌱 SEED', ECHO.lilac);
    });
    ctx.at(1900, () => {
      s.av.play('slam', Math.atan2(foe.y - home.y, foe.x - home.x));
      s.fx.boom(foe.x, foe.y, 58, { color: ECHO.terror, arcs: 8, motes: 14 });
      s.fx.eyeOpen(foe.x, foe.y, 15, { color: ECHO.terror, duration: 760 });
      blooms.push({ x: foe.x, y: foe.y, kind: 'terror', sway: 0, host: foe });
      if (blooms.length > BLOOM_MAX) blooms.shift();
      tick(ctx, foe.x, foe.y - 30, '🌺 TERROR BLOOM', ECHO.terrorHi);
      tick(ctx, foe.x, foe.y - 48, `−25% DAMAGE · ${TERROR_LIFETIME_MS / 1000}s`, ECHO.terror);
    });

    // Open the eye. Your sight leaves your body; the shield is the price of the view.
    ctx.at(3600, () => {
      viewing = 0;
      const b = blooms[0];
      s.fx.motes(home.x, home.y, 10, { speed: 90, size: 2.2, life: 620, color: ECHO.biolumHi });
      if (b) {
        s.fx.tether(home.x, home.y, b.x, b.y, ECHO.biolum, 19);
        s.fx.eyeOpen(b.x, b.y, 16, { color: ECHO.biolum, duration: 700 });
        s.fx.sonar(b.x, b.y, 70, { pulses: 2, color: ECHO.biolumPale, duration: 640 });
      }
      tick(ctx, home.x, home.y - 40, '👁 VIEWING', ECHO.lilac);
      tick(ctx, home.x, home.y - 58, `+${VIEW_SHIELD_HP} SHIELD — it belongs to the eye`, ECHO.biolum);
    });
    // Shooting out of it. 5 from an echo bloom, 10 from a terror one.
    for (let i = 0; i < 2; i++) {
      ctx.at(4200 + i * 500, () => {
        const b = blooms[viewing];
        if (!b) return;
        const a = Math.atan2(foe.y - b.y, foe.x - b.x);
        bullets.push({
          x: b.x, y: b.y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620,
          damage: b.kind === 'terror' ? TERROR_SHOT_DAMAGE : BLOOM_SHOT_DAMAGE, dead: false,
        });
      });
    }
    // Hop to the next one.
    ctx.at(5600, () => {
      const from = blooms[viewing];
      viewing = (viewing + 1) % Math.max(1, blooms.length);
      const to = blooms[viewing];
      if (from && to && from !== to) s.fx.tether(from.x, from.y, to.x, to.y, ECHO.biolum, 19);
      if (to) s.fx.eyeOpen(to.x, to.y, 13, { color: ECHO.biolum, duration: 520 });
      tick(ctx, ctx.w * 0.5, ctx.h * 0.16, 'RIGHT-CLICK · NEXT BLOOM', ECHO.lilac);
    });
    ctx.at(6400, () => {
      const b = blooms[viewing];
      if (!b) return;
      const a = Math.atan2(foe.y - b.y, foe.x - b.x);
      bullets.push({
        x: b.x, y: b.y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620,
        damage: b.kind === 'terror' ? TERROR_SHOT_DAMAGE : BLOOM_SHOT_DAMAGE, dead: false,
      });
    });
    // And step through: the bloom is spent, and you come out inside it, glowing.
    ctx.at(7800, () => {
      const b = blooms[viewing];
      if (!b) return;
      const tx = b.x;
      const ty = b.y;
      const wasTerror = b.kind === 'terror';
      blooms.splice(viewing, 1);
      viewing = -1;
      s.fx.bats(home.x, home.y, 6, { speed: 200, size: 9, life: 520 });
      s.fx.dashTrail(home.x, home.y, tx, ty, { color: ECHO.biolumHi, width: 16, duration: 460 });
      home.x = tx;
      home.y = ty;
      biolumUntil = 7800 + 8000;
      s.fx.boom(tx, ty, 54, { color: ECHO.biolum, arcs: 7, motes: 14, mark: false });
      tick(ctx, tx, ty - 34, '✨ BIOLUMINESCENT', ECHO.biolum);
      if (wasTerror) tick(ctx, tx, ty - 52, '+100 🩶', 0xcccccc);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 10,
      'three at once, and they never wilt · your body is standing in the dark the whole time you are looking',
      ECHO.slate);
  },
};
