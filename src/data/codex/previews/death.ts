import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  DEA, DeathAvatar, DeathFx, clockFace, cutMark, deathMask, katana, leash, sheath, shuriken,
  slicedBullet, stumps, styxBrand, tentacle, wallFace, wallScar, weaponCore,
} from '../../../elements/kits/DeathVisuals';

/**
 * Death's showcases.
 *
 * Two things have to be in frame or a loop is documenting a different element. The first is the
 * **clock** — Death's only source of damage is a timer, and an ability preview with no countdown
 * in it looks like a debuff element with a sword. The second is that **nothing here deals
 * damage**: every hit number a script prints has to be a slow, a stun, a cut to what they hit
 * *for*, or nothing at all. A floating red damage figure would be a lie about the whole kit.
 *
 * Death puts no sprite in the world: shurikens, the brand, the blade, the halves, the limbs, the
 * stone and the tentacles are every one of them Graphics repainted per frame out of
 * `DeathVisuals`, so `ctx.fly` is useless for the kit's own attacks. The exception is what
 * Riposte and Grimdark eat — those are somebody else's projectiles, and they are staged as real
 * ones.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `DeathFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const MIDNIGHT_MS = 60_000;

const STYX_SPEED = 780;
const STYX_HIT_R = 17;
const STYX_MS = 3000;
const STYX_MAX = 3;
const STYX_STEP = 0.15;
const STYX_COUNT = 3;
const STYX_SPREAD = 0.25;
const STYX_SPIN = 17;

const DISARM_REACH = 126;
const DISARM_HALF = 1.05;
const DISARM_STUN_PER_STACK = 1000;
const DISARM_HASTE = 1.30;
const DISARM_AFTER_MS = 700;

const RIPOSTE_MS = 3000;
const RIPOSTE_NEAR = 14;
const RIPOSTE_FAR = 84;
const RIPOSTE_R = 26;
const RIPOSTE_DEFLECT = 1.05;
const HALF_SPEED = 540;
const HALF_LIFE_MS = 760;

const AMP_MS = 230;
const AMP_HIT_R = 34;
const AMP_LEG_SPEED = [1, 0.67, 0.34];
const AMP_ARM_CD = [1, 1.25, 1.33];
const AMP_ARM_DMG = [1, 0.9, 0.75];

const DEAL_APPROACH = 48;
const DEAL_SHAKE_MS = 640;
const DEAL_RETREAT = 340;
const DEAL_MS = 10_000;
const DEAL_TOLL = 50;
const DEAL_REWARD_MS = 10_000;

const SHEATH_MS = 3000;
const SHEATH_VOLLEY_GAP = 105;
const SHEATH_STUN_BONUS = 1000;
const SHOCK_R = 320;
const SHOCK_PER_DAMAGE = 0.2;
const SHEATH_DEAL_TOLL = 75;

const WEAPON_PICKUP_R = 30;
const DISHONOR_MS = 20_000;
const DISHONOR_STEP = 0.02;
const WALL_THICK = 15;

const CUT_LIFE_MS = 5000;
const CUT_EVERY_MS = 90;
const CUT_LEN = 46;
const CUT_R = 34;
const CUT_SLOW = 0.25;
const CUT_AMP = 1.5;

const TENTACLES = 5;
const TENT_LEN = 74;
const GRAB_R = 175;
const MASK_CHARGES = 3;

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── Shared staging ────────────────────────────────────────────────────

interface Stage {
  fx: DeathFx;
  av: BaseAvatar;
  dav: DeathAvatar | null;
  at: Mark;
}

function stageIt(ctx: PreviewCtx): Stage {
  const fx = ctx.capture(() => new DeathFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new DeathAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av, dav: av instanceof DeathAvatar ? av : null, at: { x: ctx.cx, y: ctx.cy } };
}

/** A reaper the script moves — the dash, the two teleports of the Deal, and the cut trail. */
function drivenCaster(ctx: PreviewCtx, at: Mark, o?: { alpha?: () => number }): Stage {
  const fx = ctx.capture(() => new DeathFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-death')) {
    const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-death').setDepth(5));
    ctx.onFrame(() => {
      body.setPosition(at.x, at.y);
      body.setAlpha(o?.alpha?.() ?? 1);
    });
  }
  const av = ctx.useAvatar(() => new DeathAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => av.update(dt, at.x, at.y, o?.alpha?.() ?? 1));
  return { fx, av, dav: av instanceof DeathAvatar ? av : null, at };
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#05040a', strokeThickness: 3,
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

/**
 * The victim, and every readout Death paints on one — the Styx brand, the stumps left by an
 * amputation. It is the only body in the game whose *silhouette* is a status bar.
 */
function victim(
  ctx: PreviewCtx, at: Mark,
  read?: () => { stacks: number; arms: number; legs: number; alpha: number },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    const st = read?.() ?? { stacks: 0, arms: 0, legs: 0, alpha: 1 };
    const a = st.alpha;
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
    if (st.stacks > 0) styxBrand(g, ctx.tint, at.x, at.y, 24, t, st.stacks, a);
    if (st.arms > 0 || st.legs > 0) stumps(g, ctx.tint, at.x, at.y, 17, st.arms, st.legs, t, a);
  });
}

/**
 * The doomsday dial. Every loop in this file carries one, because the countdown is the only
 * reason anything else in the element matters.
 */
function clock(ctx: PreviewCtx, read: () => number, o?: { hostile?: boolean }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(19));
  const r = Math.min(26, ctx.h * 0.2);
  const cx = ctx.w - r - 8;
  const cy = r + 6;
  const t = ctx.adopt(ctx.scene.add.text(cx, cy + r + 7, '', {
    fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(DEA.gold),
  }).setOrigin(0.5).setDepth(19));
  ctx.onFrame(() => {
    const ms = read();
    g.clear();
    clockFace(g, ctx.tint, cx, cy, r, Phaser.Math.Clamp(ms / MIDNIGHT_MS, 0, 1), 1,
      { hostile: o?.hostile, numerals: r > 20 });
    t.setText(`${Math.ceil(ms / 1000)}s`);
    t.setColor(hex(ms < 10_000 ? DEA.blood : DEA.gold));
  });
}

// ── Click — Styx Shurikens ────────────────────────────────────────────

function styxLoop(ctx: PreviewCtx, opts: { sheathed: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: opts.sheathed ? ctx.w * 0.86 : ctx.w * 0.5, y: ctx.h * 0.56 };
  const state = { stacks: 0, arms: 0, legs: 0, alpha: 1, until: -9999 };
  victim(ctx, foe, () => state);
  let clockMs = MIDNIGHT_MS * 0.55;
  ctx.onFrame((dt) => { clockMs = Math.max(0, clockMs - dt); });
  clock(ctx, () => clockMs);

  interface Star { x: number; y: number; vx: number; vy: number; spin: number; life: number; gone: boolean }
  const stars: Star[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  const fire = (ang: number): void => {
    stars.push({
      x: ctx.cx + Math.cos(ang) * 26, y: ctx.cy + Math.sin(ang) * 26,
      vx: Math.cos(ang) * STYX_SPEED, vy: Math.sin(ang) * STYX_SPEED,
      spin: Math.random() * Math.PI, life: 1500, gone: false,
    });
    s.fx.soot(ctx.cx + Math.cos(ang) * 26, ctx.cy + Math.sin(ang) * 26, 2, 9, 320, 9);
  };

  ctx.onFrame((dt, elapsed) => {
    const step = dt / 1000;
    g.clear();
    if (state.stacks > 0 && elapsed >= state.until) state.stacks = 0;
    for (const st of stars) {
      if (st.gone) continue;
      st.x += st.vx * step;
      st.y += st.vy * step;
      st.spin += STYX_SPIN * step;
      st.life -= dt;
      if (Phaser.Math.Distance.Between(st.x, st.y, foe.x, foe.y) <= STYX_HIT_R + 12) {
        st.gone = true;
        state.stacks = Math.min(STYX_MAX, state.stacks + 1);
        state.until = elapsed + STYX_MS;
        const pct = Math.round(STYX_STEP * state.stacks * 100);
        s.fx.brand(foe.x, foe.y, 24, 10);
        tick(ctx, foe.x, foe.y - 30, `🌊 STYX ×${state.stacks}`, DEA.styx);
        tick(ctx, foe.x, foe.y - 14, `−${pct}% SPEED · −${pct}% DAMAGE`, DEA.deep);
        continue;
      }
      if (st.life <= 0 || st.x > ctx.w + 20 || st.y < -20 || st.y > ctx.h + 20) { st.gone = true; continue; }
      shuriken(g, ctx.tint, st.x, st.y, st.spin, 9, 1, { t: elapsed / 1000 });
    }
  });

  if (!opts.sheathed) {
    // Two throws at the real 0.62s cadence, at knife range — where the cone has not opened and
    // all three connect.
    for (let k = 0; k < 3; k++) {
      ctx.at(500 + k * 900, () => {
        s.av.play('punch', ctx.aim);
        const aim = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx);
        for (let i = 0; i < STYX_COUNT; i++) fire(aim + (i - (STYX_COUNT - 1) / 2) * STYX_SPREAD);
      });
    }
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'a ~14° fan — at this range all three land, and that is the −45% cap in one throw', DEA.pale);
    return;
  }

  // Sheathed: the saya fills over three seconds of not casting, and then the fan becomes a line.
  let drawnAt = -1;
  const saya = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
  ctx.onFrame((_dt, elapsed) => {
    saya.clear();
    const charge = drawnAt < 0 ? Phaser.Math.Clamp(elapsed / SHEATH_MS, 0, 1) : 0;
    sheath(saya, ctx.tint, ctx.cx - 18, ctx.cy + 12, 0.35, 40, charge, 0.95, { t: elapsed / 1000 });
  });
  ctx.at(SHEATH_MS, () => {
    s.fx.spark(ctx.cx, ctx.cy + 6, Math.PI);
    tick(ctx, ctx.cx, ctx.cy - 40, '🗡️ SHEATHED', DEA.edge);
  });
  ctx.at(SHEATH_MS + 500, () => {
    drawnAt = SHEATH_MS + 500;
    s.av.play('punch', ctx.aim);
    tick(ctx, ctx.cx, ctx.cy - 40, '🗡️ DRAWN — STRAIGHT LINE', DEA.edge);
  });
  for (let i = 0; i < STYX_COUNT; i++) {
    ctx.at(SHEATH_MS + 500 + i * SHEATH_VOLLEY_GAP, () => {
      // Each star leaves along the aim *as it is now*, so the line can be walked across.
      fire(Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx));
    });
  }
  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `3s with no cast fills the saya · then three stars ${SHEATH_VOLLEY_GAP}ms apart, straight down the cursor`,
    DEA.pale);
}

export const styxShurikens: PreviewScript = {
  duration: 4600,
  scale: 0.9,
  caption: 'Click — no damage at all. Three stars, three stacks: −15% speed and −15% damage each',
  run(ctx) { styxLoop(ctx, { sheathed: false }); },
};

export const styxShurikensUpgraded: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Sheath — three seconds without casting, and the fan becomes a line that brands at any range',
  run(ctx) { styxLoop(ctx, { sheathed: true }); },
};

// ── E — Disarm ────────────────────────────────────────────────────────

function disarmLoop(ctx: PreviewCtx, opts: { disarmed: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.56, y: ctx.h * 0.56 };
  const state = { stacks: 0, arms: 0, legs: 0, alpha: 1 };
  victim(ctx, foe, () => state);
  let clockMs = MIDNIGHT_MS * 0.4;
  ctx.onFrame((dt) => { clockMs = Math.max(0, clockMs - dt); });
  clock(ctx, () => clockMs);

  // Branded to the cap first — the cleave is the only thing that spends brands, and with none
  // it does nothing at all.
  for (let i = 0; i < 3; i++) {
    ctx.at(400 + i * 260, () => {
      state.stacks = i + 1;
      s.fx.brand(foe.x, foe.y, 24, 10);
      tick(ctx, foe.x, foe.y - 28, `🌊 STYX ×${state.stacks}`, DEA.styx);
    });
  }

  const after = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  let sweptAt = -9999;
  let sweptAng = 0;
  let stunUntil = -9999;
  ctx.onFrame((_dt, elapsed) => {
    after.clear();
    const age = elapsed - sweptAt;
    if (age >= 0 && age < DISARM_AFTER_MS) {
      // The yellow crescent, hanging where the blade went.
      const a = 1 - age / DISARM_AFTER_MS;
      after.lineStyle(3, ctx.tint(DEA.after), a * 0.9);
      after.beginPath();
      after.arc(ctx.cx, ctx.cy, DISARM_REACH * 0.8, sweptAng - DISARM_HALF, sweptAng + DISARM_HALF, false);
      after.strokePath();
    }
    if (elapsed < stunUntil) {
      const left = (stunUntil - elapsed) / 1000;
      after.lineStyle(1.6, ctx.tint(DEA.after), 0.5 + 0.4 * Math.sin(elapsed / 90));
      after.strokeCircle(foe.x, foe.y, 24);
      if (Math.floor(left * 2) % 2 === 0) {
        after.fillStyle(ctx.tint(DEA.after), 0.5);
        after.fillCircle(foe.x, foe.y - 30, 2.4);
      }
    }
  });

  // The weapon core, once it has been knocked out of their hands.
  let core: Mark | null = null;
  const cg = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  ctx.onFrame((dt, elapsed) => {
    cg.clear();
    if (!core) return;
    const t = elapsed / 1000;
    // The line back to the person it belongs to is the whole tell.
    leash(cg, ctx.tint, foe.x, foe.y, core.x, core.y, t, 0.85);
    weaponCore(cg, ctx.tint, core.x, core.y, t * 2, 11, 1, { color: 0xff6b3c, t });
    if (elapsed < stunUntil) return;
    // They have to physically walk to it. Nothing else gives the keys back.
    const d = Phaser.Math.Distance.Between(foe.x, foe.y, core.x, core.y);
    if (d <= WEAPON_PICKUP_R) {
      core = null;
      tick(ctx, foe.x, foe.y - 34, '🔓 PICKED UP', DEA.bone);
      return;
    }
    const step = Math.min(d, 60 * (dt / 1000));
    foe.x += ((core.x - foe.x) / d) * step;
    foe.y += ((core.y - foe.y) / d) * step;
  });

  ctx.at(1500, () => {
    const ang = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx);
    sweptAt = 1500;
    sweptAng = ang;
    s.av.play('sweep', ang);
    s.fx.sweep(ctx.cx, ctx.cy, ang, DISARM_HALF, DISARM_REACH, 420, 10, DEA.after);
    const ms = state.stacks * DISARM_STUN_PER_STACK + (opts.disarmed ? 0 : 0);
    stunUntil = 1500 + ms;
    s.fx.spark(foe.x, foe.y, ang);
    s.fx.brand(foe.x, foe.y, 26, 10);
    tick(ctx, foe.x, foe.y - 30, `💫 DISARMED ${ms / 1000}s`, DEA.after);
    if (opts.disarmed && state.stacks >= STYX_MAX) {
      core = { x: Phaser.Math.Clamp(foe.x + Math.cos(ang) * 90, 20, ctx.w - 20), y: foe.y + 26 };
      tick(ctx, core.x, core.y - 22, '🔒 WEAPON TAKEN', DEA.after);
    }
    // Spent. The brands are the ammunition and the cleave fires them.
    state.stacks = 0;
    // Paid on the swing whatever the swing found.
    tick(ctx, ctx.cx, ctx.cy - 40, `🌀 QUICKENED +${Math.round((DISARM_HASTE - 1) * 100)}%`, DEA.after);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.disarmed ? 'at three stacks the core goes too — no casting at all until they walk to it'
      : `120° cleave, ${DISARM_REACH}px · 1s of stun per stack, and every stack is spent paying for it`,
    DEA.pale);
}

export const disarm: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'E — no damage. One second of total lockout per Styx stack, and the stacks are consumed',
  run(ctx) { disarmLoop(ctx, { disarmed: false }); },
};

export const disarmUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Disarmed — a full-brand cleave throws their weapon across the floor, on top of the stun',
  run(ctx) { disarmLoop(ctx, { disarmed: true }); },
};

// ── R — Riposte ───────────────────────────────────────────────────────

function riposteLoop(ctx: PreviewCtx, opts: { dishonor: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.86, y: ctx.h * 0.5 };
  victim(ctx, foe);
  let clockMs = MIDNIGHT_MS * 0.35;
  ctx.onFrame((dt) => { clockMs = Math.max(0, clockMs - dt); });
  clock(ctx, () => clockMs);

  let guardUntil = -9999;
  let blocked = 0;
  interface Half { x: number; y: number; vx: number; vy: number; ang: number; spin: number; side: 1 | -1; life: number }
  const halves: Half[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

  // The stone, and the craters it keeps.
  interface Scar { x: number; y: number; inAng: number; born: number }
  const scars: Scar[] = [];
  const wall = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    wall.clear();
    if (!opts.dishonor) return;
    wallFace(wall, ctx.tint, ctx.w - 2, 20, ctx.w - 2, ctx.h - 2, Math.PI, WALL_THICK, t, 0.95);
    for (let i = scars.length - 1; i >= 0; i--) {
      const sc = scars[i];
      const heat = Phaser.Math.Clamp(1 - (elapsed - sc.born) / DISHONOR_MS, 0, 1);
      if (heat <= 0) { scars.splice(i, 1); continue; }
      wallScar(wall, ctx.tint, sc.x, sc.y, sc.inAng, heat, 1, { seed: i });
    }
  });

  ctx.onFrame((dt, elapsed) => {
    const step = dt / 1000;
    g.clear();
    for (let i = halves.length - 1; i >= 0; i--) {
      const h = halves[i];
      h.x += h.vx * step;
      h.y += h.vy * step;
      h.ang += h.spin * step;
      h.life -= dt;
      if (h.life <= 0) { halves.splice(i, 1); continue; }
      slicedBullet(g, ctx.tint, h.x, h.y, h.ang, 8, Phaser.Math.Clamp(h.life / 300, 0, 1),
        { side: h.side, color: DEA.pale });
    }
    if (elapsed >= guardUntil) return;
    // The blade, held out along the aim — a 70px line, and everything within 26px of it is cut.
    const ang = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx);
    katana(g, ctx.tint, ctx.cx + Math.cos(ang) * RIPOSTE_NEAR, ctx.cy + Math.sin(ang) * RIPOSTE_NEAR,
      ang, RIPOSTE_FAR - RIPOSTE_NEAR, 1, { glow: 0.6 });
    g.lineStyle(1, ctx.tint(DEA.blade), 0.14);
    g.strokeCircle(ctx.cx + Math.cos(ang) * (RIPOSTE_NEAR + RIPOSTE_FAR) / 2,
      ctx.cy + Math.sin(ang) * (RIPOSTE_NEAR + RIPOSTE_FAR) / 2, RIPOSTE_R + 20);
  });

  ctx.at(400, () => {
    guardUntil = 400 + RIPOSTE_MS;
    s.dav?.setGuard(true);
    s.av.play('punch', ctx.aim);
    tick(ctx, ctx.cx, ctx.cy - 40, opts.dishonor ? '🗡️ RIPOSTE' : '🗡️ RIPOSTE — DRAWN', DEA.blade);
  });
  ctx.at(400 + RIPOSTE_MS, () => {
    s.dav?.setGuard(false);
    if (opts.dishonor) return;
    // The parting wave — the Sheath payoff for this key. A fifth of what the blade ate, as legs.
    const pct = Math.min(0.9, (blocked * SHOCK_PER_DAMAGE) / 100);
    s.fx.shockwave(ctx.cx, ctx.cy, 24, SHOCK_R * 0.5);
    tick(ctx, ctx.cx, ctx.cy - 40, `🌊 ${blocked} CUT → −${Math.round(pct * 100)}% SPEED`, DEA.blade);
    tick(ctx, foe.x, foe.y - 30, `🐌 −${Math.round(pct * 100)}% SPEED · 3s`, DEA.blade);
  });

  // Real shots, from a real texture, arriving at the steel. Some aimed at the blade, some — with
  // Dishonor — thrown past him into the stone.
  const INCOMING = 30;
  for (let i = 0; i < 5; i++) {
    ctx.at(700 + i * 520, () => {
      const miss = opts.dishonor && i % 2 === 1;
      const from = { x: foe.x, y: foe.y };
      const to = miss ? { x: ctx.w - 6, y: ctx.h * 0.22 } : { x: ctx.cx + 40, y: ctx.cy };
      ctx.fly({
        texture: 'proj-fire', from, to, speed: 520,
        onHit: () => {
          if (miss) {
            // A shot that ends on the stone is a shot that was never aimed.
            scars.push({ x: to.x, y: to.y, inAng: Math.PI, born: ctx.scene.time.now && 0 });
            const n = scars.length;
            s.fx.spark(to.x, to.y, 0);
            tick(ctx, to.x - 22, to.y - 16, `⚖️ DISHONOR ×${n}`, DEA.blood);
            tick(ctx, foe.x, foe.y - 30, `−${Math.round(DISHONOR_STEP * n * 100)}% DAMAGE · 20s`, DEA.ash);
            return;
          }
          blocked += INCOMING;
          const inAng = Math.atan2(ctx.cy - from.y, ctx.cx - from.x);
          for (const side of [1, -1] as const) {
            const a = inAng + side * RIPOSTE_DEFLECT;
            halves.push({
              x: to.x + Math.cos(inAng + side * Math.PI / 2) * 5,
              y: to.y + Math.sin(inAng + side * Math.PI / 2) * 5,
              vx: Math.cos(a) * HALF_SPEED, vy: Math.sin(a) * HALF_SPEED,
              ang: a, spin: side * (3 + Math.random() * 4), side, life: HALF_LIFE_MS,
            });
          }
          s.fx.spark(to.x, to.y, inAng);
          tick(ctx, to.x, to.y - 18, '🗡️ CUT', DEA.blade);
        },
      });
    });
  }
  // Scars are timestamped off the loop clock, so seed them at 0 and age them from there.
  ctx.onFrame((_dt, elapsed) => { for (const sc of scars) if (sc.born === 0) sc.born = elapsed; });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.dishonor ? `every shot that ends on the stone: −${Math.round(DISHONOR_STEP * 100)}% damage for 20s, no stack limit`
      : 'the two halves leave at 60° and hit nothing — they are debris, not a counter-attack',
    DEA.pale);
}

export const riposte: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'R — 3 seconds of blade along the cursor. Everything that reaches it is cut in half',
  run(ctx) { riposteLoop(ctx, { dishonor: false }); },
};

export const riposteUpgraded: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Dishonor — the arena grows stone, and every shot that ends on it costs them 2% damage for 20s',
  run(ctx) { riposteLoop(ctx, { dishonor: true }); },
};

// ── F — Amputate ──────────────────────────────────────────────────────

export const amputate: PreviewScript = {
  duration: 7200,
  scale: 0.9,
  bodyTexture: '',
  caption: 'F — no damage. A limb off everything the dash passes through, and nothing grows back',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.16, y: ctx.h * 0.6 };
    const s = drivenCaster(ctx, home);
    const foe: Mark = { x: ctx.w * 0.56, y: ctx.h * 0.6 };
    const state = { stacks: 0, arms: 0, legs: 0, alpha: 1 };
    victim(ctx, foe, () => state);
    let clockMs = MIDNIGHT_MS * 0.5;
    ctx.onFrame((dt) => { clockMs = Math.max(0, clockMs - dt); });
    clock(ctx, () => clockMs);

    // The picker: the decision is which limb, and it is made before the dash leaves.
    const pick = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, ctx.h * 0.2, '🦵 LEFT LEG', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(DEA.bone), backgroundColor: '#0d0a17', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(19));

    const dash = (at: number, limbLabel: string, apply: () => void): void => {
      ctx.at(at - 500, () => pick.setText(limbLabel).setVisible(true));
      ctx.at(at, () => {
        pick.setVisible(false);
        const ang = Math.atan2(foe.y - home.y, foe.x - home.x);
        s.av.play('sweep', ang);
        s.fx.sweep(home.x, home.y, ang, 0.5, 90, 320, 10, DEA.blade);
        const x0 = home.x;
        const y0 = home.y;
        const x1 = Phaser.Math.Clamp(foe.x + 70, 16, ctx.w - 16);
        let run = 0;
        let cut = false;
        ctx.onFrame((dt) => {
          if (run >= AMP_MS) return;
          run = Math.min(AMP_MS, run + dt);
          // Ease out — he arrives at speed and stops.
          const k = run / AMP_MS;
          const e = 1 - (1 - k) * (1 - k);
          home.x = x0 + (x1 - x0) * e;
          home.y = y0;
          if (cut || Phaser.Math.Distance.Between(home.x, home.y, foe.x, foe.y) > AMP_HIT_R + 14) return;
          cut = true;
          apply();
        });
      });
    };

    dash(900, '🦵 LEFT LEG', () => {
      state.legs = 1;
      s.fx.amputate(foe.x, foe.y, 0, true);
      tick(ctx, foe.x, foe.y - 40, '🗡️ 🦵 LEFT LEG TAKEN', DEA.blood);
      tick(ctx, foe.x, foe.y - 22, `−${Math.round((1 - AMP_LEG_SPEED[1]) * 100)}% SPEED`, DEA.bone);
    });
    ctx.at(2600, () => { home.x = ctx.w * 0.16; });
    dash(3600, '💪 LEFT ARM', () => {
      state.arms = 1;
      s.fx.amputate(foe.x, foe.y, 0, false);
      tick(ctx, foe.x, foe.y - 40, '🗡️ 💪 LEFT ARM TAKEN', DEA.blood);
      tick(ctx, foe.x, foe.y - 22,
        `+${Math.round((AMP_ARM_CD[1] - 1) * 100)}% COOLDOWNS · −${Math.round((1 - AMP_ARM_DMG[1]) * 100)}% DAMAGE`,
        DEA.bone);
      tick(ctx, foe.x, foe.y - 4, 'NOTHING MORE TO TAKE', DEA.pale);
    });
    ctx.at(5400, () => {
      s.fx.soot(home.x, home.y, 6, 20, 460, 9);
      tick(ctx, foe.x, foe.y - 40, '🦴 NOTHING LEFT', DEA.pale);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 10,
      `two limbs per body for the whole match · both legs is ×${AMP_LEG_SPEED[2]} speed, both arms is −${Math.round((1 - AMP_ARM_DMG[2]) * 100)}% damage`,
      DEA.pale);
  },
};

export const amputateUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Death by 1000 Cuts — a trail of gashes that deal nothing and make everything else 1.5× worse',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.18, y: ctx.h * 0.34 };
    const s = drivenCaster(ctx, home);
    const foe: Mark = { x: ctx.w * 0.7, y: ctx.h * 0.7 };
    const state = { stacks: 0, arms: 0, legs: 0, alpha: 1 };
    victim(ctx, foe, () => state);
    let clockMs = MIDNIGHT_MS * 0.3;
    ctx.onFrame((dt) => { clockMs = Math.max(0, clockMs - dt); });
    clock(ctx, () => clockMs);

    interface Cut { x: number; y: number; ang: number; born: number; seed: number }
    const cuts: Cut[] = [];
    const last = { x: home.x, y: home.y, next: 0 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    let carved = false;

    // He walks a loop and the blade drags behind him the whole way.
    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      home.x = ctx.w * 0.44 + Math.cos(t * 1.1) * ctx.w * 0.26;
      home.y = ctx.h * 0.5 + Math.sin(t * 1.1) * ctx.h * 0.3;

      if (elapsed >= last.next && Phaser.Math.Distance.Between(last.x, last.y, home.x, home.y) >= 11) {
        const along = Math.atan2(home.y - last.y, home.x - last.x);
        last.next = elapsed + CUT_EVERY_MS;
        last.x = home.x;
        last.y = home.y;
        // Across the path rather than along it: a slash he left, not a skidmark.
        cuts.push({
          x: home.x, y: home.y, ang: along + Math.PI / 2 + (Math.random() - 0.5) * 0.7,
          born: elapsed, seed: Math.random() * 999,
        });
      }

      g.clear();
      let inIt = false;
      for (let i = cuts.length - 1; i >= 0; i--) {
        const c = cuts[i];
        const life = 1 - (elapsed - c.born) / CUT_LIFE_MS;
        if (life <= 0) { cuts.splice(i, 1); continue; }
        cutMark(g, ctx.tint, c.x, c.y, c.ang, CUT_LEN, life);
        if (Phaser.Math.Distance.Between(c.x, c.y, foe.x, foe.y) <= CUT_R + 10) inIt = true;
      }
      if (inIt && !carved) {
        carved = true;
        tick(ctx, foe.x, foe.y - 40, '🗡️ CARVED', DEA.blade);
        tick(ctx, foe.x, foe.y - 22, `−${Math.round(CUT_SLOW * 100)}% SPEED · ALL DEBUFFS ×${CUT_AMP}`, DEA.blade);
      } else if (!inIt) {
        carved = false;
      }
      // The amplifier, spelled out on the brand it is currently multiplying.
      if (!inIt || state.stacks < STYX_MAX) return;
      g.lineStyle(1.4, ctx.tint(DEA.styx), 0.35 + 0.25 * Math.sin(elapsed / 130));
      g.strokeCircle(foe.x, foe.y, 30);
    });

    // A full brand, so the amplifier has something real to multiply.
    ctx.at(1400, () => {
      state.stacks = STYX_MAX;
      s.fx.brand(foe.x, foe.y, 24, 10);
      tick(ctx, foe.x, foe.y - 56, '🌊 STYX ×3 · −45%', DEA.styx);
    });
    ctx.at(3000, () => {
      tick(ctx, foe.x, foe.y - 56,
        `×${CUT_AMP} → −${Math.round(STYX_STEP * STYX_MAX * CUT_AMP * 100)}%`, DEA.blade);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 10,
      `a ${CUT_R}px gash every ${CUT_EVERY_MS}ms while moving, ${CUT_LIFE_MS / 1000}s each · everybody's debuffs, not just his`,
      DEA.pale);
  },
};

// ── Q — Deal with Death ───────────────────────────────────────────────

function dealLoop(ctx: PreviewCtx, opts: { grim: boolean }): void {
  const home: Mark = { x: ctx.w * 0.2, y: ctx.h * 0.66 };
  let alpha = 1;
  const s = drivenCaster(ctx, home, { alpha: () => alpha });
  const foe: Mark = { x: ctx.w * 0.62, y: ctx.h * 0.42 };
  victim(ctx, foe);
  let clockMs = MIDNIGHT_MS * 0.6;
  const toll = opts.grim ? SHEATH_DEAL_TOLL : DEAL_TOLL;
  ctx.onFrame((dt) => { clockMs = Math.max(0, clockMs - dt); });
  clock(ctx, () => clockMs);

  // The handshake, then the retreat. Both are teleports, and both leave a burst behind.
  ctx.at(500, () => {
    s.fx.vanish(home.x, home.y, 30, 380, 10, false);
    const ang = Math.atan2(home.y - foe.y, home.x - foe.x);
    home.x = Phaser.Math.Clamp(foe.x + Math.cos(ang) * DEAL_APPROACH, 20, ctx.w - 20);
    home.y = Phaser.Math.Clamp(foe.y + Math.sin(ang) * DEAL_APPROACH, 20, ctx.h - 20);
    s.fx.vanish(home.x, home.y, 30, 380, 10, true);
    s.av.play('punch', Math.atan2(foe.y - home.y, foe.x - home.x));
    tick(ctx, home.x, home.y - 44, '🤝 DEAL WITH DEATH', DEA.gold);
    if (opts.grim) tick(ctx, home.x, home.y - 62, `🗡️ DRAWN — ${SHEATH_DEAL_TOLL} DMG ALLOWED`, DEA.edge);
  });

  let dealFrom = -1;
  let taken = 0;
  ctx.at(500 + DEAL_SHAKE_MS, () => {
    s.fx.vanish(home.x, home.y, 30, 380, 10, false);
    const away = Math.atan2(home.y - foe.y, home.x - foe.x);
    home.x = Phaser.Math.Clamp(foe.x + Math.cos(away) * DEAL_RETREAT * 0.5, 24, ctx.w - 24);
    home.y = Phaser.Math.Clamp(foe.y + Math.sin(away) * DEAL_RETREAT * 0.5, 24, ctx.h - 24);
    s.fx.vanish(home.x, home.y, 30, 380, 10, true);
    s.av.play('flex');
    dealFrom = 500 + DEAL_SHAKE_MS;
    tick(ctx, home.x, home.y - 44, '🤝 STRUCK', DEA.gold);
    tick(ctx, home.x, home.y - 26, `+33% SPEED · +33% DODGE · <${toll} DMG`, DEA.bone);
    if (opts.grim) {
      s.fx.soot(home.x, home.y, 10, 26, 620, 10);
      tick(ctx, home.x, home.y - 62, '🐙 TRUE GRIMDARK', DEA.shroud);
    }
  });

  // The arms and the mask, both alive for exactly as long as the bargain.
  let masks = MASK_CHARGES;
  const grim = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
  ctx.onFrame((_dt, elapsed) => {
    grim.clear();
    if (!opts.grim || dealFrom < 0) return;
    const t = elapsed / 1000;
    for (let i = 0; i < TENTACLES; i++) {
      const a = Math.PI * 0.6 + (i / (TENTACLES - 1) - 0.5) * 2.2 + Math.sin(t * 1.3 + i) * 0.2;
      tentacle(grim, ctx.tint, home.x, home.y + 4, a, TENT_LEN * 0.7, 0.9, { seed: i * 37, t, curl: 1 });
    }
    if (masks > 0) deathMask(grim, ctx.tint, home.x, home.y - 6, 13, MASK_CHARGES - masks, 0.95, { t });
    // The reach the arms actually pull from.
    grim.lineStyle(1, ctx.tint(DEA.shroud), 0.22);
    grim.strokeCircle(home.x, home.y, GRAB_R * 0.5);
  });

  // Shots arriving through the ten seconds, and what the bargain does with them.
  for (let i = 0; i < 4; i++) {
    ctx.at(1800 + i * 1100, () => {
      ctx.fly({
        texture: 'proj-fire',
        from: { x: foe.x, y: foe.y },
        to: { x: home.x, y: home.y },
        speed: 480,
        onHit: () => {
          if (opts.grim && i < 2) {
            s.fx.grab(home.x + 24, home.y, Math.PI);
            tick(ctx, home.x + 26, home.y - 14, '🐙 TAKEN', DEA.shroud);
            return;
          }
          if (opts.grim && masks > 0) {
            masks--;
            s.fx.spark(home.x, home.y - 12, -Math.PI / 2);
            tick(ctx, home.x, home.y - 48, `🎭 MASK HELD (${masks} LEFT)`, DEA.bone);
            if (masks <= 0) {
              s.fx.maskBreak(home.x, home.y - 8);
              tick(ctx, home.x, home.y - 64, '🎭 MASK BROKEN', DEA.blood);
            }
            return;
          }
          taken += 16;
          tick(ctx, home.x, home.y - 20, `${taken} / ${toll}`, taken >= toll ? DEA.blood : DEA.bone);
        },
      });
    });
  }

  ctx.at(500 + DEAL_SHAKE_MS + DEAL_MS * 0.55, () => {
    if (taken >= toll) {
      s.fx.soot(home.x, home.y, 10, 30, 620, 10);
      tick(ctx, home.x, home.y - 44, '☠️ DEAL BROKEN', DEA.blood);
      return;
    }
    clockMs = Math.max(0, clockMs - DEAL_REWARD_MS);
    s.fx.toll(home.x, home.y, 14, 150, 720, 11, DEA.gold);
    tick(ctx, home.x, home.y - 44, '🕛 DEAL HONOURED', DEA.gold);
    tick(ctx, home.x, home.y - 26, `−${DEAL_REWARD_MS / 1000}s TO MIDNIGHT`, DEA.blood);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 10,
    opts.grim ? `${TENTACLES} arms taking a shot every 0.43s, and a mask that refuses ${MASK_CHARGES} whole hits`
      : `${DEAL_SHAKE_MS / 1000}s of standing still beside them, then 10 seconds of not being hit`,
    DEA.pale);
  void alpha;
}

export const dealWithDeath: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Q — shake their hand, then survive ten seconds under 50 damage for −10s on the clock',
  run(ctx) { dealLoop(ctx, { grim: false }); },
};

export const dealWithDeathUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'True Grimdark — five arms pulling shots out of the air, and a mask that refuses three hits whole',
  run(ctx) { dealLoop(ctx, { grim: true }); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const midnight: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Sixty seconds. When it strikes twelve they die where they stand, through everything',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.72, y: ctx.h * 0.56 };
    let dead = false;
    victim(ctx, foe, () => ({ stacks: 0, arms: 0, legs: 0, alpha: dead ? 0 : 1 }));

    // The whole minute, compressed: the loop runs it at 9× so the tolls are all in frame.
    let clockMs = MIDNIGHT_MS;
    ctx.onFrame((dt) => { if (!dead) clockMs = Math.max(0, clockMs - dt * 9); });
    clock(ctx, () => clockMs);

    // It announces itself at 30, 10, and then every second from five.
    const tolled = new Set<number>();
    ctx.onFrame(() => {
      if (dead) return;
      const secs = Math.ceil(clockMs / 1000);
      for (const mark of [30, 10, 5, 4, 3, 2, 1]) {
        if (secs !== mark || tolled.has(mark)) continue;
        tolled.add(mark);
        s.fx.toll(ctx.cx, ctx.cy, 16, 70 + (30 - Math.min(30, mark)) * 2, 520, 10, DEA.gold);
        tick(ctx, ctx.cx, ctx.cy - 44, `🕛 ${mark}`, DEA.gold);
      }
      if (clockMs > 0) return;
      dead = true;
      s.fx.reap(foe.x, foe.y, 100, 900, 12);
      s.fx.toll(ctx.cx, ctx.cy, 10, 200, 900, 11, DEA.blood);
      tick(ctx, foe.x, foe.y - 50, '🕛 MIDNIGHT', DEA.blood);
      tick(ctx, foe.x, foe.y - 32, '100% OF REMAINING HEALTH · PIERCE', DEA.blood);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'shown at 9× speed — it runs for a real minute, once per match', DEA.pale);
  },
};

export const nothingIsDamage: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Four reasons the same punch lands softer, and they multiply rather than adding',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.68, y: ctx.h * 0.54 };
    const state = { stacks: 0, arms: 0, legs: 0, alpha: 1 };
    victim(ctx, foe, () => state);
    let clockMs = MIDNIGHT_MS * 0.45;
    ctx.onFrame((dt) => { clockMs = Math.max(0, clockMs - dt); });
    clock(ctx, () => clockMs);

    // The running product, which is the whole point: 45% and 25% is 59%, not 70%.
    let styx = 0;
    let arms = 0;
    let bleed = 0;
    let shame = 0;
    const meter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 14, '', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(DEA.styx),
    }).setOrigin(0.5).setDepth(19));
    ctx.onFrame(() => {
      const factor = (1 - styx) * (1 - arms) * (1 - bleed) * (1 - shame);
      meter.setText(`their damage  ×${factor.toFixed(2)}   ( −${Math.round((1 - factor) * 100)}% )`);
      meter.setColor(hex(factor < 0.5 ? DEA.blood : DEA.styx));
    });

    ctx.at(700, () => {
      styx = STYX_STEP * STYX_MAX;
      state.stacks = STYX_MAX;
      s.fx.brand(foe.x, foe.y, 24, 10);
      tick(ctx, foe.x, foe.y - 40, '🌊 STYX ×3 · −45%', DEA.styx);
    });
    ctx.at(2400, () => {
      arms = 1 - AMP_ARM_DMG[2];
      state.arms = 2;
      s.fx.amputate(foe.x, foe.y, 0, false);
      tick(ctx, foe.x, foe.y - 40, '💪💪 BOTH ARMS · −25%', DEA.blood);
    });
    ctx.at(4100, () => {
      bleed = 0.1;
      s.fx.bleed(foe.x, foe.y);
      tick(ctx, foe.x, foe.y - 40, '🩸 EXSANGUINATING · −10%', DEA.blood);
    });
    for (let i = 0; i < 5; i++) {
      ctx.at(5600 + i * 380, () => {
        shame = Math.min(0.9, shame + DISHONOR_STEP);
        s.fx.spark(ctx.w - 10, ctx.h * (0.2 + i * 0.12), Math.PI);
        tick(ctx, ctx.w - 40, ctx.h * (0.2 + i * 0.12), `⚖️ ×${i + 1}`, DEA.blood);
      });
    }

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'worn as reduced incoming damage on the reaper — one field, so the least weakened enemy sets it', DEA.pale);
  },
};
