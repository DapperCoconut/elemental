import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  SILENCE, SilenceAvatar, SilenceFx, bloodSplat, fogBank, graspHand, silenceEye, toothRing,
} from '../../../elements/kits/SilenceVisuals';

/**
 * Silence's showcases.
 *
 * Two things have to be in frame or a loop is documenting a knife element with atmosphere. The
 * first is the **fog** — the 90px band around the arena border is where the whole economy lives,
 * so every script paints it and shows the stealth meter filling or draining against it. The
 * second is **the eye**: this is the only element that reads which way somebody is facing, and a
 * backstab preview without the rear arc drawn on the victim is showing a bigger number for no
 * visible reason.
 *
 * Silence puts no sprite in the world: the fog, the watchers, the beam, the teeth, the grabbing
 * arm and the blob are all Graphics repainted per frame out of `SilenceVisuals`, so `ctx.fly` is
 * useless throughout.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `SilenceFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const FOG_WIDTH = 90;
const STEALTH_MAX = 100;
const STEALTH_GAIN_PER_S = 10;
const STEALTH_DRAIN_PER_S = 10;
const STALKER_RATE_BONUS = 0.2;
const STALKER_DMG_BONUS = 0.1;

const STAB_BASE_DMG = 20;
const STAB_MAX_BONUS = 25;
const STAB_BACKSTAB_MULT = 1.5;
const STAB_SILENCE_MS = 12000;
const STAB_DASH_LEN = 170;
const BACKSTAB_ARC_RAD = (Math.PI * (120 / 180)) / 2;

const STALKER_MAX = 3;
const STALKER_MATURE_MS = 35000;
const STALKER_RADIUS = 14;
const SEEKER_CONE_LEN = 200;
const SEEKER_CONE_HALF_RAD = Math.PI / 6;
const PANIC_MS = 8000;
const PANIC_STAB_DRAIN = 50;

const RITUAL_RANGE = 450;
const RITUAL_RADIUS = 75;
const RITUAL_DELAY_MS = 1000;
const RITUAL_DMG = 25;
const RITUAL_SILENCE_MS = 20000;
const GRABBER_DMG = 50;
const GRABBER_CD_PENALTY = 1.2;
const TORTURE_BASE_DPS = 4;
const TORTURE_MS = 6000;

const FEAST_RADIUS = 110;
const FEAST_DURATION_MS = 8000;
const FEAST_REQUIRED_INSIDE_MS = 6000;
const FEAST_DMG = 35;
const HALLUCINATE_MS = 30000;
const MIDGET_COUNT = 5;
const MIDGET_DMG = 5;

const RUN_ARM_RANGE = 500;
const RUN_HIT_RADIUS = 60;
const RUN_MISS_REFUND_MS = 45000;
const BLOB_CATCH_DMG = 80;
const BLOB_SPEED = 380;
const HALL_VICTIM_SLOW = 0.8;
const SPIT_DMG = 5;
const GRAB_ESCAPE_PRESSES = 14;

const TERROR_MAX = 100;
const STRIKER_BASE_MS = 20000;
const WEEP_SPEED_MULT = 1.5;
const WEEP_DRAIN_MULT = 0.75;
const WEEP_WATCH_ARC_RAD = (Math.PI * (100 / 180)) / 2;
const PUPPET_TERROR_COST = 25;
const DOLL_HP = 50;
const DOLL_RELAY_MULT = 1.25;
const AWAKEN_SLASH_DMG = 15;
const AWAKEN_BITE_DMG = 10;
const AWAKEN_BITE_HEAL = 12;

const DEPTH_GROUND_FX = 3;
const DEPTH_STALKER = 6;
const DEPTH_BEAM = 9;
const DEPTH_FOG = 12;

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── Shared staging ────────────────────────────────────────────────────

interface Stage { fx: SilenceFx; av: BaseAvatar; sav: SilenceAvatar | null; at: Mark }

function stageIt(ctx: PreviewCtx): Stage {
  const fx = ctx.capture(() => new SilenceFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new SilenceAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av, sav: av instanceof SilenceAvatar ? av : null, at: { x: ctx.cx, y: ctx.cy } };
}

function drivenCaster(ctx: PreviewCtx, at: Mark, o?: { alpha?: () => number }): Stage {
  const fx = ctx.capture(() => new SilenceFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-silence')) {
    const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-silence').setDepth(5));
    ctx.onFrame(() => {
      body.setPosition(at.x, at.y);
      body.setAlpha(o?.alpha?.() ?? 1);
    });
  }
  const av = ctx.useAvatar(() => new SilenceAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => av.update(dt, at.x, at.y, o?.alpha?.() ?? 1));
  return { fx, av, sav: av instanceof SilenceAvatar ? av : null, at };
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#05000a', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(32));
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
  }).setOrigin(0.5).setDepth(31));
}

/**
 * The victim — with the thing that makes this element different drawn on them: an eye that says
 * which way they are facing, and the 120° rear arc a backstab has to come from.
 */
function victim(
  ctx: PreviewCtx, at: Mark,
  o?: { facing?: () => number; arc?: boolean; silenced?: () => boolean; halluc?: () => boolean },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    const face = o?.facing?.() ?? 0;
    g.clear();
    if (o?.arc) {
      // The rear arc — ±60° of the way they are facing away from.
      g.fillStyle(ctx.tint(SILENCE.blood), 0.12);
      g.beginPath();
      g.moveTo(at.x, at.y);
      g.arc(at.x, at.y, 60, face + Math.PI - BACKSTAB_ARC_RAD, face + Math.PI + BACKSTAB_ARC_RAD, false);
      g.closePath();
      g.fillPath();
    }
    g.fillStyle(0x2b2f3d, 1);
    g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1);
    g.fillCircle(at.x, at.y, 13);
    // One eye, pointed where they are looking — the whole reason the arc is readable.
    silenceEye(g, ctx.tint, at.x + Math.cos(face) * 6, at.y + Math.sin(face) * 6, face, 5,
      0, 1, SILENCE.sclera, 1);
    if (o?.silenced?.()) {
      g.lineStyle(1.6, ctx.tint(SILENCE.orchid), 0.6 + 0.35 * Math.sin(t * 5));
      g.strokeCircle(at.x, at.y, 24);
    }
    if (o?.halluc?.()) {
      for (let i = 0; i < 3; i++) {
        const a = t * 1.4 + (i / 3) * Math.PI * 2;
        silenceEye(g, ctx.tint, at.x + Math.cos(a) * 26, at.y + Math.sin(a) * 26, a, 4,
          Math.sin(t * 3 + i), 1, SILENCE.gore, 0.8);
      }
    }
  });
}

/**
 * The fog band and the stealth meter — the element's economy, in one helper.
 *
 * Returns a live `stealth` value the scripts read and spend, integrated at exactly the kit's
 * rates against whether the caster is standing in the band.
 */
interface Fog {
  band: number;
  inside(p: Mark): boolean;
  stealth(): number;
  spend(all: boolean): number;
}

function fog(ctx: PreviewCtx, read: () => Mark, o?: { stalkers?: () => number }): Fog {
  const band = Math.min(FOG_WIDTH, Math.floor(Math.min(ctx.w, ctx.h) * 0.24));
  let stealth = 0;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(DEPTH_FOG));
  const meter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 12, '', {
    fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(SILENCE.lilac),
  }).setOrigin(0.5).setDepth(31));

  const inside = (p: Mark): boolean => p.x < band || p.x > ctx.w - band || p.y < band || p.y > ctx.h - band;

  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const n = o?.stalkers?.() ?? 0;
    const p = read();
    stealth = inside(p)
      ? Math.min(STEALTH_MAX, stealth + STEALTH_GAIN_PER_S * (1 + STALKER_RATE_BONUS * n) * (dt / 1000))
      : Math.max(0, stealth - STEALTH_DRAIN_PER_S * Math.max(0, 1 - STALKER_RATE_BONUS * n) * (dt / 1000));

    // The band itself — lobes of dark rolling around the whole border.
    g.clear();
    for (let i = 0; i < 14; i++) {
      const u = i / 14;
      const per = Math.floor(14 / 4);
      const side = Math.floor(i / per) % 4;
      const k = (i % per) / per;
      const x = side === 0 ? k * ctx.w : side === 1 ? ctx.w - band * 0.5 : side === 2 ? (1 - k) * ctx.w : band * 0.5;
      const y = side === 0 ? band * 0.5 : side === 1 ? k * ctx.h : side === 2 ? ctx.h - band * 0.5 : (1 - k) * ctx.h;
      fogBank(g, x, y, band * 0.85, i * 3.1, t, ctx.tint(SILENCE.pitch), 0.5, 6);
      void u;
    }
    meter.setText(`🌫️ ${Math.round(stealth)} / ${STEALTH_MAX}${inside(p) ? '   ·   IN THE FOG' : ''}`);
    meter.setColor(hex(inside(p) || stealth > 0 ? SILENCE.lilac : SILENCE.violet));
  });

  return {
    band,
    inside,
    stealth: () => stealth,
    spend: (all) => {
      const had = stealth;
      stealth = all ? 0 : Math.max(0, stealth - PANIC_STAB_DRAIN);
      return had;
    },
  };
}

// ── Click — Stab ──────────────────────────────────────────────────────

function stabLoop(ctx: PreviewCtx, opts: { sacrifice: boolean }): void {
  const home: Mark = { x: ctx.w * 0.12, y: ctx.h * 0.5 };
  let visible = 1;
  const s = drivenCaster(ctx, home, { alpha: () => visible });
  const foe: Mark = { x: ctx.w * 0.68, y: ctx.h * 0.5 };
  let facing = 0;
  let silencedUntil = -9999;
  let now = 0;
  victim(ctx, foe, { facing: () => facing, arc: true, silenced: () => now < silencedUntil });
  ctx.onFrame((_dt, elapsed) => { now = elapsed; });
  const f = fog(ctx, () => home);
  ctx.onFrame(() => { visible = f.inside(home) || f.stealth() > 0 ? 0.35 : 1; });

  if (opts.sacrifice) {
    // Sacrifice: the knife goes into your own watcher instead.
    const watcher: Mark = { x: ctx.w * 0.44, y: ctx.h * 0.5 };
    let alive = true;
    const wg = ctx.adopt(ctx.scene.add.graphics().setDepth(DEPTH_STALKER));
    ctx.onFrame((_dt, elapsed) => {
      wg.clear();
      if (!alive) return;
      SilenceFx.drawWatcher(wg, ctx.tint, watcher.x, watcher.y,
        Phaser.Math.Clamp(elapsed / STALKER_MATURE_MS, 0, 1), false, elapsed / 1000, 1, true);
    });
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 900 || elapsed > 2400) return;
      home.x += 210 * (dt / 1000);
    });
    ctx.at(2400, () => {
      s.av.play('punch', 0);
      s.fx.slash(watcher.x, watcher.y, 0, 40, Math.PI / 3, { bloody: true });
      s.fx.graspRing(watcher.x, watcher.y, 10, 130, SILENCE.orchid, 520, 8, true);
      silencedUntil = 2400 + 10000;
      tick(ctx, watcher.x, watcher.y - 34, '🗡 SACRIFICE', SILENCE.gore);
      tick(ctx, foe.x, foe.y - 20, '15', SILENCE.orchid);
      tick(ctx, foe.x, foe.y - 38, '🔇 SILENCED · 10s', SILENCE.orchid);
      tick(ctx, watcher.x, watcher.y - 52, 'CANNOT MATURE FOR 5s', SILENCE.violet);
    });
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'the only way to silence somebody without getting behind them', SILENCE.violet);
    return;
  }

  // Charge in the fog, walk out invisible, come round behind them, and stab.
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < 2600 || elapsed > 5200) return;
    // Round the outside — the arc is what the walk is for.
    const k = (elapsed - 2600) / 2600;
    home.x = ctx.w * 0.12 + Math.sin(k * Math.PI) * ctx.w * 0.8;
    home.y = ctx.h * 0.5 + Math.cos(k * Math.PI) * ctx.h * 0.32;
    void dt;
  });
  ctx.onFrame((_dt, elapsed) => {
    // They keep looking where you were, not where you are — you are invisible.
    if (elapsed < 2600) facing = Math.PI;
    else facing = Math.PI + Math.sin(elapsed / 900) * 0.3;
  });

  ctx.at(5200, () => {
    const had = f.spend(true);
    const bonus = Math.round((had / STEALTH_MAX) * STAB_MAX_BONUS);
    const behind = Math.abs(Phaser.Math.Angle.Wrap(
      Math.atan2(home.y - foe.y, home.x - foe.x) - (facing + Math.PI))) <= BACKSTAB_ARC_RAD;
    const dmg = Math.round((STAB_BASE_DMG + bonus) * (behind ? STAB_BACKSTAB_MULT : 1));
    s.av.play('dash', Math.atan2(foe.y - home.y, foe.x - home.x));
    s.fx.lunge(home.x, home.y, foe.x, foe.y, { color: SILENCE.orchid });
    s.fx.slash(foe.x, foe.y, Math.atan2(foe.y - home.y, foe.x - home.x), 60, Math.PI / 3, { bloody: true });
    tick(ctx, foe.x, foe.y - 16, `${dmg}`, SILENCE.gore);
    tick(ctx, foe.x, foe.y - 34, behind ? `🗡 BACKSTAB ×${STAB_BACKSTAB_MULT}` : `+${bonus} FROM STEALTH`, SILENCE.pale);
    if (!behind) return;
    silencedUntil = 5200 + STAB_SILENCE_MS;
    tick(ctx, foe.x, foe.y - 52, `🔇 SILENCED · ${STAB_SILENCE_MS / 1000}s`, SILENCE.orchid);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `${STAB_BASE_DMG} + up to ${STAB_MAX_BONUS} from the meter · ×${STAB_BACKSTAB_MULT} and ${STAB_SILENCE_MS / 1000}s of Silence from behind`,
    SILENCE.violet);
}

export const stab: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Click — 20, or 45 on a full meter, or 67 from inside their rear arc plus 12s of Silence',
  run(ctx) { stabLoop(ctx, { sacrifice: false }); },
};

export const stabUpgraded: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Sacrifice — put the knife in your own watcher and it lets out 15 damage and 10s of Silence',
  run(ctx) { stabLoop(ctx, { sacrifice: true }); },
};

// ── E — Watch ─────────────────────────────────────────────────────────

function watchLoop(ctx: PreviewCtx, opts: { mutant: boolean }): void {
  const home: Mark = { x: ctx.w * 0.16, y: ctx.h * 0.5 };
  const s = drivenCaster(ctx, home);
  const foe: Mark = { x: ctx.w * 0.72, y: ctx.h * 0.5 };
  let panicUntil = -9999;
  let now = 0;
  victim(ctx, foe, { facing: () => Math.PI, halluc: () => now < panicUntil });
  ctx.onFrame((_dt, elapsed) => { now = elapsed; });

  interface Watcher { at: Mark; born: number; seeker: boolean; hits: number; ang: number }
  const watchers: Watcher[] = [];
  const f = fog(ctx, () => home, { stalkers: () => watchers.length });
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(DEPTH_STALKER));

  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    for (const w of watchers) {
      // Maturity is a real 35-second clock, shown compressed so the growth is visible.
      const mature = Phaser.Math.Clamp((elapsed - w.born) / (STALKER_MATURE_MS * 0.14), 0, 1);
      if (w.seeker) {
        w.ang += (dt / 1000) * 0.7;
        w.at.x = Phaser.Math.Clamp(w.at.x + Math.cos(w.ang) * 120 * (dt / 1000), 12, ctx.w - 12);
        w.at.y = Phaser.Math.Clamp(w.at.y + Math.sin(w.ang) * 120 * (dt / 1000), 12, ctx.h - 12);
        // The gaze — a 200px cone, ±30°.
        g.fillStyle(ctx.tint(SILENCE.gore), 0.1);
        g.beginPath();
        g.moveTo(w.at.x, w.at.y);
        g.arc(w.at.x, w.at.y, SEEKER_CONE_LEN * 0.5,
          w.ang - SEEKER_CONE_HALF_RAD, w.ang + SEEKER_CONE_HALF_RAD, false);
        g.closePath();
        g.fillPath();
        const toFoe = Math.atan2(foe.y - w.at.y, foe.x - w.at.x);
        if (Math.abs(Phaser.Math.Angle.Wrap(toFoe - w.ang)) <= SEEKER_CONE_HALF_RAD
          && Phaser.Math.Distance.Between(w.at.x, w.at.y, foe.x, foe.y) <= SEEKER_CONE_LEN * 0.5
          && elapsed > panicUntil) {
          panicUntil = elapsed + PANIC_MS;
          s.fx.watchPulse(foe.x, foe.y, 26, SILENCE.gore);
          tick(ctx, foe.x, foe.y - 34, '👁 "I SEE YOU"', SILENCE.gore);
          tick(ctx, foe.x, foe.y - 52, `PANIC · ${PANIC_MS / 1000}s`, SILENCE.gore);
        }
      }
      SilenceFx.drawWatcher(g, ctx.tint, w.at.x, w.at.y, mature, w.seeker, t, 1, true);
      if (mature < 1) continue;
      g.lineStyle(1, ctx.tint(SILENCE.lilac), 0.3 + 0.2 * Math.sin(t * 3));
      g.strokeCircle(w.at.x, w.at.y, STALKER_RADIUS + 6);
    }
  });

  const plant = (at: number, x: number, y: number, onTop: boolean): void => {
    ctx.at(at, () => {
      s.av.play('raise');
      s.fx.motes(x, y, 6, { color: SILENCE.amethyst, life: 620 });
      if (onTop && opts.mutant && watchers.length) {
        // A watcher planted on another folds the two into a winged Seeker.
        const w = watchers[watchers.length - 1];
        w.seeker = true;
        w.hits = 3;
        w.born = at;
        s.fx.rupture(w.at.x, w.at.y, 40, {});
        tick(ctx, w.at.x, w.at.y - 34, '🦇 SEEKER · 3 HITS', SILENCE.gore);
        return;
      }
      watchers.push({ at: { x, y }, born: at, seeker: false, hits: 1, ang: 0 });
      tick(ctx, x, y - 30, `👁 ${watchers.length}/${STALKER_MAX}`, SILENCE.lilac);
      tick(ctx, x, y - 48,
        `+${STALKER_RATE_BONUS * 100}% GAIN · −${STALKER_RATE_BONUS * 100}% DRAIN · +${STALKER_DMG_BONUS * 100}% DMG`,
        SILENCE.amethyst);
    });
  };

  plant(500, ctx.w * 0.34, ctx.h * 0.3, false);
  plant(1800, ctx.w * 0.34, ctx.h * 0.7, false);
  plant(3100, opts.mutant ? ctx.w * 0.34 : ctx.w * 0.5, ctx.h * 0.7, opts.mutant);
  // Sitting in the fog while they stand there is the whole point of owning three.
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < 4200) return;
    home.x = Math.max(f.band * 0.4, home.x - 60 * (dt / 1000));
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.mutant ? `a watcher on a watcher is a Seeker — a ${SEEKER_CONE_LEN}px gaze that panics whatever it finds`
      : `${STALKER_MAX} at a time · ${STALKER_MATURE_MS / 1000}s to mature · one hit kills any of them`,
    SILENCE.violet);
}

export const watch: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'E — thin things that stand and stare. Each one makes the fog work better and the knife hit harder',
  run(ctx) { watchLoop(ctx, { mutant: false }); },
};

export const watchUpgraded: PreviewScript = {
  duration: 8600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Mutant — plant one on another and it becomes a winged Seeker whose gaze causes Panic',
  run(ctx) { watchLoop(ctx, { mutant: true }); },
};

// ── R — Ritual ────────────────────────────────────────────────────────

function ritualLoop(ctx: PreviewCtx, opts: { terror: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.7, y: ctx.h * 0.52 };
  let silencedUntil = -9999;
  let now = 0;
  victim(ctx, foe, { facing: () => Math.PI, silenced: () => now < silencedUntil });
  ctx.onFrame((_dt, elapsed) => { now = elapsed; });
  fog(ctx, () => s.at);

  interface Circle { at: Mark; born: number; done: boolean; onWatcher: boolean }
  const circles: Circle[] = [];
  let grabber: Mark | null = null;
  const watcher: Mark = { x: ctx.w * 0.4, y: ctx.h * 0.74 };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(DEPTH_BEAM));

  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    if (!grabber) {
      SilenceFx.drawWatcher(g, ctx.tint, watcher.x, watcher.y, 1, false, t, 1, true);
    } else {
      SilenceFx.drawGrabber(g, ctx.tint, grabber.x, grabber.y, 3, t, 1, false);
    }
    for (const c of circles) {
      if (c.done) continue;
      const k = Phaser.Math.Clamp((elapsed - c.born) / RITUAL_DELAY_MS, 0, 1);
      // The full second of warning — it is dodgeable, on purpose.
      g.lineStyle(2, ctx.tint(SILENCE.blood), 0.4 + k * 0.6);
      g.strokeCircle(c.at.x, c.at.y, RITUAL_RADIUS * 0.5);
      g.lineStyle(1, ctx.tint(SILENCE.gore), k);
      g.strokeCircle(c.at.x, c.at.y, RITUAL_RADIUS * 0.5 * (1 - k * 0.5));
      if (k < 1) continue;
      c.done = true;
      s.fx.beam(c.at.x, c.at.y, RITUAL_RADIUS * 0.5, { color: SILENCE.gore });
      if (c.onWatcher) {
        grabber = { x: watcher.x, y: watcher.y };
        s.fx.rupture(watcher.x, watcher.y, 50, {});
        tick(ctx, watcher.x, watcher.y - 40, '🫳 GRABBER', SILENCE.blood);
        tick(ctx, watcher.x, watcher.y - 58, `${GRABBER_DMG} · +${Math.round((GRABBER_CD_PENALTY - 1) * 100)}% COOLDOWNS FOREVER`, SILENCE.gore);
        continue;
      }
      if (Phaser.Math.Distance.Between(c.at.x, c.at.y, foe.x, foe.y) > RITUAL_RADIUS * 0.5) continue;
      silencedUntil = elapsed + RITUAL_SILENCE_MS;
      s.fx.stain(foe.x, foe.y, 26, DEPTH_GROUND_FX, true);
      tick(ctx, foe.x, foe.y - 16, `${RITUAL_DMG}`, SILENCE.gore);
      tick(ctx, foe.x, foe.y - 34, `🔇 SILENCED · ${RITUAL_SILENCE_MS / 1000}s`, SILENCE.orchid);
    }
  });

  ctx.at(600, () => {
    s.av.play('sweep', 0);
    circles.push({ at: { x: foe.x, y: foe.y }, born: 600, done: false, onWatcher: false });
  });
  ctx.at(2600, () => {
    s.av.play('sweep', 0);
    circles.push({ at: { x: watcher.x, y: watcher.y }, born: 2600, done: false, onWatcher: true });
  });

  if (!opts.terror) {
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${RITUAL_RADIUS}px, ${RITUAL_DELAY_MS / 1000}s of warning, ${RITUAL_RANGE}px of range · on your own matured watcher it makes a Grabber`,
      SILENCE.violet);
    return;
  }

  // Night Terror: the bar, and the circle drawn on yourself.
  let terror = 40;
  const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(31));
  const meter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 26, '', {
    fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(SILENCE.gore),
  }).setOrigin(0.5).setDepth(31));
  let striker = -1;
  let stored = 0;
  ctx.onFrame((dt, elapsed) => {
    if (elapsed > 600) terror = Math.min(TERROR_MAX, terror + 14 * (dt / 1000));
    bar.clear();
    const w = ctx.w * 0.44;
    const x = ctx.w * 0.5 - w / 2;
    bar.fillStyle(ctx.tint(SILENCE.pitch), 0.9);
    bar.fillRect(x, 38, w, 5);
    bar.fillStyle(ctx.tint(terror >= TERROR_MAX ? SILENCE.gore : SILENCE.rust), 0.95);
    bar.fillRect(x, 38, w * (terror / TERROR_MAX), 5);
    meter.setText(striker >= 0
      ? `STRIKER · ${((STRIKER_BASE_MS - (elapsed - striker)) / 1000).toFixed(1)}s · ${Math.round(stored)} STORED`
      : `TERROR ${Math.round(terror)} / ${TERROR_MAX}`);
    if (striker >= 0) stored += 9 * (dt / 1000);
  });
  ctx.at(5000, () => {
    if (terror < TERROR_MAX) return;
    striker = 5000;
    terror = 0;
    s.fx.rupture(s.at.x, s.at.y, 70, {});
    s.fx.dread(s.at.x, s.at.y, 60, 900, { color: SILENCE.gore });
    tick(ctx, s.at.x, s.at.y - 40, '🩸 THE STRIKER', SILENCE.gore);
    tick(ctx, s.at.x, s.at.y - 58, 'ALL DAMAGE DEFERRED', SILENCE.blood);
  });
  ctx.at(7600, () => {
    if (striker < 0) return;
    tick(ctx, s.at.x, s.at.y - 40, `TAKEN AT ONCE · −25% · ${Math.round(stored * 0.75)}`, SILENCE.blood);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `+1 terror a second per afflicted enemy · at ${TERROR_MAX}, ritual yourself for ${STRIKER_BASE_MS / 1000}s of claws`,
    SILENCE.violet);
}

export const ritual: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'R — a circle, a second of warning, then 25 damage and twenty seconds without abilities',
  run(ctx) { ritualLoop(ctx, { terror: false }); },
};

export const ritualUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Night Terror — a TERROR bar, and at full you ritual yourself into the Striker',
  run(ctx) { ritualLoop(ctx, { terror: true }); },
};

// ── F — Feast ─────────────────────────────────────────────────────────

function feastLoop(ctx: PreviewCtx, opts: { banquet: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.62, y: ctx.h * 0.5 };
  let hallucUntil = -9999;
  let now = 0;
  victim(ctx, foe, { facing: () => Math.PI, halluc: () => now < hallucUntil });
  ctx.onFrame((_dt, elapsed) => { now = elapsed; });
  fog(ctx, () => s.at);

  const ring: Mark = { x: ctx.w * 0.6, y: ctx.h * 0.5 };
  let ringFrom = -1;
  let inside = 0;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(DEPTH_GROUND_FX));
  const clock = ctx.adopt(ctx.scene.add.text(0, 0, '', {
    fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(SILENCE.bone),
  }).setOrigin(0.5).setDepth(31));

  interface Midget { x: number; y: number; ang: number; gate: number }
  const midgets: Midget[] = [];

  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    clock.setVisible(false);
    if (ringFrom >= 0 && elapsed - ringFrom < FEAST_DURATION_MS) {
      const bite = 0.5 + 0.5 * Math.sin(t * 6);
      toothRing(g, ctx.tint, ring.x, ring.y, FEAST_RADIUS * 0.5, 18, bite, 0.95);
      if (Phaser.Math.Distance.Between(foe.x, foe.y, ring.x, ring.y) <= FEAST_RADIUS * 0.5) {
        inside += dt;
      }
      clock.setVisible(true).setPosition(ring.x, ring.y - FEAST_RADIUS * 0.5 - 12)
        .setText(`${(inside / 1000).toFixed(1)}s / ${FEAST_REQUIRED_INSIDE_MS / 1000}s inside`);
      clock.setColor(hex(inside >= FEAST_REQUIRED_INSIDE_MS ? SILENCE.gore : SILENCE.bone));
    }
    // Flesh Banquet's midgets, hounding the victim for as long as the visions last.
    for (const m of midgets) {
      const d = Phaser.Math.Distance.Between(m.x, m.y, foe.x, foe.y);
      if (d > 18) {
        m.x += ((foe.x - m.x) / d) * 140 * (dt / 1000);
        m.y += ((foe.y - m.y) / d) * 140 * (dt / 1000);
      } else if (elapsed >= m.gate) {
        m.gate = elapsed + 500;
        tick(ctx, foe.x + (Math.random() - 0.5) * 20, foe.y - 12, `${MIDGET_DMG}`, SILENCE.gore);
      }
      m.ang = Math.atan2(foe.y - m.y, foe.x - m.x);
      SilenceFx.drawMidget(g, ctx.tint, m.x, m.y, m.ang, t, 1);
    }
  });

  ctx.at(400, () => {
    ringFrom = 400;
    s.av.play('slam', 0);
    s.fx.graspRing(ring.x, ring.y, 10, FEAST_RADIUS * 0.5, SILENCE.meat, 520, 8, true);
    tick(ctx, ring.x, ring.y - 40, `🦷 FEAST · ${FEAST_DURATION_MS / 1000}s`, SILENCE.bone);
  });
  ctx.at(400 + FEAST_DURATION_MS * 0.78, () => {
    if (inside < FEAST_REQUIRED_INSIDE_MS * 0.7) return;
    hallucUntil = 400 + FEAST_DURATION_MS * 0.78 + HALLUCINATE_MS;
    s.fx.rupture(foe.x, foe.y, 50, {});
    tick(ctx, foe.x, foe.y - 16, `${FEAST_DMG}`, SILENCE.gore);
    tick(ctx, foe.x, foe.y - 34, `👁 HALLUCINATIONS · ${HALLUCINATE_MS / 1000}s`, SILENCE.orchid);
    if (!opts.banquet) return;
    // The arena turns to meat, and five things are let out.
    for (let i = 0; i < 26; i++) {
      const x = Phaser.Math.Between(8, Math.floor(ctx.w) - 8);
      const y = Phaser.Math.Between(8, Math.floor(ctx.h) - 8);
      const decal = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
      bloodSplat(decal, ctx.tint, x, y, 10 + Math.random() * 10, i, 0.45);
    }
    for (let i = 0; i < MIDGET_COUNT; i++) {
      const a = (i / MIDGET_COUNT) * Math.PI * 2;
      midgets.push({ x: ring.x + Math.cos(a) * 50, y: ring.y + Math.sin(a) * 50, ang: a, gate: 0 });
    }
    tick(ctx, foe.x, foe.y - 52, `🍖 ${MIDGET_COUNT} MIDGETS · ${MIDGET_DMG} A BITE`, SILENCE.meat);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.banquet ? `the arena turns to flesh, and ${MIDGET_COUNT} things hound them for the whole ${HALLUCINATE_MS / 1000}s`
      : `${FEAST_REQUIRED_INSIDE_MS / 1000} of the ${FEAST_DURATION_MS / 1000} seconds inside · then ${FEAST_DMG} and ${HALLUCINATE_MS / 1000}s of seeing things`,
    SILENCE.violet);
}

export const feast: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'F — a ring of teeth. Six seconds inside it is 35 damage and thirty seconds of hallucinations',
  run(ctx) { feastLoop(ctx, { banquet: false }); },
};

export const feastUpgraded: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  caption: 'Flesh Banquet — the arena becomes meat, and five toothy things are let out after them',
  run(ctx) { feastLoop(ctx, { banquet: true }); },
};

// ── Q — Run ───────────────────────────────────────────────────────────

function runLoop(ctx: PreviewCtx, opts: { maze: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.74, y: ctx.h * 0.6 };
  victim(ctx, foe, { facing: () => Math.PI });
  fog(ctx, () => s.at);

  const hand: Mark = { x: ctx.cx, y: ctx.cy };
  let reaching = -1;
  let chase = -1;
  const blob: Mark = { x: ctx.w * 0.5, y: ctx.h - 20 };
  const runner: Mark = { x: ctx.w * 0.5, y: ctx.h * 0.75 };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(DEPTH_BEAM));
  const hall = ctx.adopt(ctx.scene.add.graphics().setDepth(DEPTH_FOG + 2));

  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    g.clear();
    hall.clear();

    if (reaching >= 0 && chase < 0) {
      const k = Phaser.Math.Clamp((elapsed - reaching) / 350, 0, 1);
      hand.x = ctx.cx + (foe.x - ctx.cx) * k;
      hand.y = ctx.cy + (foe.y - ctx.cy) * k;
      SilenceFx.drawReachingArm(g, ctx.tint, ctx.cx, ctx.cy, hand.x, hand.y, t, 1, k);
      if (k >= 1) {
        reaching = -1;
        chase = elapsed;
        s.fx.rupture(foe.x, foe.y, 60, {});
        tick(ctx, foe.x, foe.y - 34, `🖐 CAUGHT · ${GRAB_ESCAPE_PRESSES} PRESSES TO BREAK`, SILENCE.gore);
      }
      return;
    }
    if (chase < 0) return;

    // The pocket dimension: a corridor with a door at the top, or a maze.
    hall.fillStyle(ctx.tint(SILENCE.void), 0.96);
    hall.fillRect(0, 0, ctx.w, ctx.h);
    const halfW = ctx.w * (opts.maze ? 0.46 : 0.26);
    hall.fillStyle(ctx.tint(SILENCE.pitch), 1);
    hall.fillRect(ctx.w * 0.5 - halfW, 0, halfW * 2, ctx.h);
    hall.lineStyle(2, ctx.tint(SILENCE.violet), 0.55);
    hall.strokeRect(ctx.w * 0.5 - halfW, 0, halfW * 2, ctx.h);
    // The door.
    hall.fillStyle(ctx.tint(SILENCE.bone), 0.5 + 0.3 * Math.sin(t * 3));
    hall.fillRect(ctx.w * 0.5 - 14, 2, 28, 12);

    if (opts.maze) {
      // The Labyrinth: walls the blob simply eats through.
      hall.lineStyle(3, ctx.tint(SILENCE.plum), 0.9);
      for (let r = 1; r < 5; r++) {
        const y = (r / 5) * ctx.h;
        const gapX = ctx.w * 0.5 - halfW + ((r * 97) % (halfW * 1.6));
        hall.lineBetween(ctx.w * 0.5 - halfW, y, gapX, y);
        hall.lineBetween(gapX + 30, y, ctx.w * 0.5 + halfW, y);
      }
    }

    // They run for the door, slowed. The blob comes up behind them.
    runner.y -= 70 * HALL_VICTIM_SLOW * (opts.maze ? 0.7 : 1) * step;
    const d = Phaser.Math.Distance.Between(blob.x, blob.y, runner.x, runner.y);
    if (d > 4) {
      blob.x += ((runner.x - blob.x) / d) * BLOB_SPEED * 0.22 * step;
      blob.y += ((runner.y - blob.y) / d) * BLOB_SPEED * 0.22 * step;
    }
    hall.fillStyle(0x3c4254, 1);
    hall.fillCircle(runner.x, runner.y, opts.maze ? 10 : 15);
    SilenceFx.drawBlob(hall, ctx.tint, blob.x, blob.y, 26, t, 1);
    if (d > 22 || runner.y < 18) return;
    chase = -1;
    s.fx.rupture(runner.x, runner.y, 70, {});
    tick(ctx, ctx.w * 0.5, ctx.h * 0.4, `${BLOB_CATCH_DMG}`, SILENCE.gore);
    tick(ctx, ctx.w * 0.5, ctx.h * 0.4 - 20, 'CAUGHT', SILENCE.blood);
  });

  ctx.at(500, () => {
    reaching = 500;
    s.av.play('punch', Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx));
  });
  // Spitting during the chase — 5 damage and a slow, and it shaves a bot's odds.
  for (let i = 0; i < 4; i++) {
    ctx.at(2200 + i * 700, () => {
      if (chase < 0) return;
      const sg = ctx.adopt(ctx.scene.add.graphics().setDepth(DEPTH_FOG + 3));
      const p = { x: blob.x, y: blob.y };
      let live = true;
      ctx.onFrame((dt) => {
        sg.clear();
        if (!live) return;
        const a = Math.atan2(runner.y - p.y, runner.x - p.x);
        p.x += Math.cos(a) * 430 * 0.3 * (dt / 1000);
        p.y += Math.sin(a) * 430 * 0.3 * (dt / 1000);
        SilenceFx.drawSpit(sg, ctx.tint, p.x, p.y, a, 0, 1);
        if (Phaser.Math.Distance.Between(p.x, p.y, runner.x, runner.y) > 16) return;
        live = false;
        tick(ctx, runner.x, runner.y - 16, `${SPIT_DMG}`, SILENCE.bile);
      });
    });
  }

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.maze ? 'a 9×6 maze instead — they shrink, slow further and can barely see, and the blob eats the walls'
      : `${RUN_ARM_RANGE}px arm · ${BLOB_CATCH_DMG} if it catches them · a whiff refunds ${RUN_MISS_REFUND_MS / 1000}s of the 60`,
    SILENCE.violet);
}

export const run: PreviewScript = {
  duration: 8000,
  scale: 0.86,
  caption: 'Q — an arm out to 500px, and then both of you are somewhere else and they have to run',
  run(ctx) { runLoop(ctx, { maze: false }); },
};

export const runUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.86,
  caption: 'The Labyrinth — a maze instead of a corridor, and the blob does not need the corridors',
  run(ctx) { runLoop(ctx, { maze: true }); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const theFog: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  bodyTexture: '',
  caption: '90px of dark around the border. Stand in it and you are gone — bar and all',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.5, y: ctx.h * 0.5 };
    let visible = 1;
    const s = drivenCaster(ctx, home, { alpha: () => visible });
    const foe: Mark = { x: ctx.w * 0.5, y: ctx.h * 0.34 };
    victim(ctx, foe, { facing: () => Math.PI / 2 });
    const f = fog(ctx, () => home);
    ctx.onFrame(() => { visible = f.inside(home) || f.stealth() > 0 ? 0.35 : 1; });

    // Into the fog, fill up, walk back out, and drain in the open.
    ctx.onFrame((dt, elapsed) => {
      const step = dt / 1000;
      if (elapsed < 2600) home.y = Math.min(ctx.h - f.band * 0.4, home.y + 90 * step);
      else if (elapsed < 6000) return;
      else home.y = Math.max(ctx.h * 0.45, home.y - 60 * step);
    });
    ctx.at(2600, () => tick(ctx, home.x, home.y - 40, '🌫️ IN THE FOG · INVISIBLE', SILENCE.lilac));
    ctx.at(6000, () => tick(ctx, home.x, home.y - 40, `+${STEALTH_MAX} BANKED`, SILENCE.pale));
    ctx.at(7200, () => tick(ctx, home.x, home.y - 40,
      `STILL INVISIBLE · ${STEALTH_DRAIN_PER_S}/s`, SILENCE.amethyst));

    // What the enemy sees — nothing at all.
    const eye = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, ctx.h * 0.2, '', {
      fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(SILENCE.violet),
    }).setOrigin(0.5).setDepth(31));
    ctx.onFrame(() => {
      const gone = f.inside(home) || f.stealth() > 0;
      eye.setText(gone ? 'on their screen: nothing at all' : 'on their screen: you');
      eye.setColor(hex(gone ? SILENCE.gore : SILENCE.violet));
    });
    void s;

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${STEALTH_GAIN_PER_S}/s in, ${STEALTH_DRAIN_PER_S}/s out · a full meter is 10 seconds of open ground`,
      SILENCE.violet);
  },
};

export const silenced: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Every ability except the Click simply refuses — twelve seconds, or twenty from a ritual',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.68, y: ctx.h * 0.5 };
    let until = -9999;
    let now = 0;
    victim(ctx, foe, { facing: () => Math.PI, silenced: () => now < until });
    ctx.onFrame((_dt, elapsed) => { now = elapsed; });

    // The four keys, and what happens when they are pressed.
    const keys = ['E', 'R', 'F', 'Q'];
    const row = ctx.adopt(ctx.scene.add.graphics().setDepth(31));
    const texts = keys.map(() => ctx.adopt(ctx.scene.add.text(0, 0, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(32)));
    ctx.onFrame((_dt, elapsed) => {
      row.clear();
      const locked = elapsed < until;
      keys.forEach((k, i) => {
        const x = ctx.w * 0.5 + (i - 1.5) * 26;
        const y = ctx.h - 30;
        row.fillStyle(ctx.tint(locked ? SILENCE.plum : SILENCE.amethyst), locked ? 0.5 : 0.95);
        row.fillRoundedRect(x - 10, y - 9, 20, 18, 3);
        texts[i].setPosition(x, y).setText(locked ? '✕' : k);
        texts[i].setColor(locked ? hex(SILENCE.gore) : '#ffffff');
      });
      // The click still works. That is the whole of what they have left.
      row.fillStyle(ctx.tint(SILENCE.amethyst), 0.95);
      row.fillRoundedRect(ctx.w * 0.5 - 62, ctx.h - 39, 26, 18, 3);
    });
    label(ctx, ctx.w * 0.5 - 49, ctx.h - 30, 'CLICK', SILENCE.pale);

    ctx.at(900, () => {
      s.av.play('dash', 0);
      s.fx.slash(foe.x, foe.y, 0, 60, Math.PI / 3, { bloody: true });
      until = 900 + STAB_SILENCE_MS;
      tick(ctx, foe.x, foe.y - 34, `🗡 BACKSTAB · ${STAB_SILENCE_MS / 1000}s`, SILENCE.orchid);
    });
    ctx.at(3600, () => {
      s.fx.beam(foe.x, foe.y, RITUAL_RADIUS * 0.5, { color: SILENCE.gore });
      until = 3600 + RITUAL_SILENCE_MS;
      tick(ctx, foe.x, foe.y - 34, `🕯 RITUAL · ${RITUAL_SILENCE_MS / 1000}s`, SILENCE.orchid);
    });
    for (const at of [2000, 4800, 6200]) {
      ctx.at(at, () => {
        if (now >= until) return;
        tick(ctx, foe.x, foe.y - 52, 'NOTHING HAPPENS', SILENCE.violet);
      });
    }

    label(ctx, ctx.w * 0.5, 12,
      'twenty seconds without an ultimate, a dash or a heal', SILENCE.violet);
  },
};

export const theRearArc: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Everyone has an eye. Silence is the only element that reads it',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.2, y: ctx.h * 0.5 };
    const s = drivenCaster(ctx, home);
    const foe: Mark = { x: ctx.w * 0.6, y: ctx.h * 0.5 };
    let facing = 0;
    victim(ctx, foe, { facing: () => facing, arc: true });

    // They turn on a slow sweep; the caster circles. The question is only ever whether the
    // angle between them is inside the wedge.
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      facing = Math.sin(t * 0.7) * 2.2;
      home.x = foe.x + Math.cos(t * 1.1 + Math.PI) * 78;
      home.y = foe.y + Math.sin(t * 1.1 + Math.PI) * 52;
    });

    const flag = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 12, '', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    }).setOrigin(0.5).setDepth(31));
    const behind = (): boolean => Math.abs(Phaser.Math.Angle.Wrap(
      Math.atan2(home.y - foe.y, home.x - foe.x) - (facing + Math.PI))) <= BACKSTAB_ARC_RAD;
    ctx.onFrame(() => {
      flag.setText(behind() ? `IN THE ARC — ×${STAB_BACKSTAB_MULT} AND ${STAB_SILENCE_MS / 1000}s` : 'IN FRONT — AN ORDINARY STAB');
      flag.setColor(hex(behind() ? SILENCE.gore : SILENCE.violet));
    });

    for (const at of [1600, 3400, 5200, 6800]) {
      ctx.at(at, () => {
        const back = behind();
        s.av.play('dash', Math.atan2(foe.y - home.y, foe.x - home.x));
        s.fx.slash(foe.x, foe.y, Math.atan2(foe.y - home.y, foe.x - home.x), 55, Math.PI / 3,
          { bloody: back });
        tick(ctx, foe.x, foe.y - 16, `${back ? Math.round(STAB_BASE_DMG * STAB_BACKSTAB_MULT) : STAB_BASE_DMG}`,
          back ? SILENCE.gore : SILENCE.pale);
        if (back) tick(ctx, foe.x, foe.y - 34, '🔇 SILENCED', SILENCE.orchid);
      });
    }

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'a 120° wedge behind them · being invisible does not change it, and turning is free', SILENCE.violet);
  },
};

// ── Perk — Torture ────────────────────────────────────────────────────

export const perkTorture: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'The ritual stops killing quickly. Racked for 6s, and every tick is another second of Silence',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.66, y: ctx.h * 0.52 };
    let until = -9999;
    let now = 0;
    victim(ctx, foe, { facing: () => Math.PI, silenced: () => now < until });
    ctx.onFrame((_dt, elapsed) => { now = elapsed; });

    let stacks = 0;
    let rackUntil = -9999;
    let nextTick = 0;
    const meter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 12, '', {
      fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(SILENCE.blood),
    }).setOrigin(0.5).setDepth(31));
    ctx.onFrame((_dt, elapsed) => {
      const dps = TORTURE_BASE_DPS + (stacks - 1) * 2;
      meter.setText(stacks > 0
        ? `⛓ RACK ×${stacks}  ·  ${dps}/s  ·  silence ${(Math.max(0, until - elapsed) / 1000).toFixed(0)}s`
        : '⛓ TORTURE');
      if (stacks <= 0 || elapsed > rackUntil || elapsed < nextTick) return;
      nextTick = elapsed + 1000;
      until += 1000;
      s.fx.stain(foe.x, foe.y, 18, DEPTH_GROUND_FX, true);
      tick(ctx, foe.x + (Math.random() - 0.5) * 16, foe.y - 12, `${dps}`, SILENCE.gore);
      tick(ctx, foe.x, foe.y - 30, '+1s 🔇', SILENCE.orchid);
    });

    const cast = (at: number): void => {
      ctx.at(at, () => {
        s.av.play('sweep', 0);
        s.fx.beam(foe.x, foe.y, RITUAL_RADIUS * 0.5, { color: SILENCE.gore });
        stacks = Math.min(3, stacks + 1);
        rackUntil = at + TORTURE_MS;
        nextTick = at + 1000;
        if (stacks === 1) until = at + RITUAL_SILENCE_MS;
        tick(ctx, foe.x, foe.y - 48, stacks === 1 ? '⛓ RACKED' : `⛓ TIGHTENED ×${stacks}`, SILENCE.blood);
      });
    };
    cast(600);
    cast(3000);
    cast(5400);

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${TORTURE_BASE_DPS}/s for ${TORTURE_MS / 1000}s, +2/s a stack to 3 — 48 damage and 26 seconds of lockout`,
      SILENCE.violet);
  },
};

// ── Mastery ───────────────────────────────────────────────────────────

export const masteryWeep: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'You only exist while you are looked at. Unwatched, you move half again as fast',
  run(ctx) {
    const home: Mark = { x: ctx.w * 0.24, y: ctx.h * 0.6 };
    const s = drivenCaster(ctx, home);
    const foe: Mark = { x: ctx.w * 0.7, y: ctx.h * 0.4 };
    let facing = Math.PI;
    victim(ctx, foe, { facing: () => facing });
    const f = fog(ctx, () => home);

    // Their 100° cone of attention, drawn — the whole enhancement is a question about it.
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const watched = (): boolean => Math.abs(Phaser.Math.Angle.Wrap(
      Math.atan2(home.y - foe.y, home.x - foe.x) - facing)) <= WEEP_WATCH_ARC_RAD;
    ctx.onFrame((dt, elapsed) => {
      facing = Math.PI + Math.sin(elapsed / 1400) * 1.6;
      g.clear();
      g.fillStyle(ctx.tint(watched() ? SILENCE.gore : SILENCE.violet), watched() ? 0.14 : 0.07);
      g.beginPath();
      g.moveTo(foe.x, foe.y);
      g.arc(foe.x, foe.y, 120, facing - WEEP_WATCH_ARC_RAD, facing + WEEP_WATCH_ARC_RAD, false);
      g.closePath();
      g.fillPath();
      // Unwatched, you move half again as fast — and the moment they turn, you walk.
      home.x += 70 * (watched() ? 1 : WEEP_SPEED_MULT) * (dt / 1000);
      if (home.x > ctx.w - 20) home.x = 20;
    });

    const meter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 26, '', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    }).setOrigin(0.5).setDepth(31));
    ctx.onFrame(() => {
      meter.setText(watched()
        ? 'WATCHED — an ordinary walk'
        : `🥲 UNWATCHED — +${Math.round((WEEP_SPEED_MULT - 1) * 100)}% SPEED · DRAIN ×${WEEP_DRAIN_MULT}`);
      meter.setColor(hex(watched() ? SILENCE.gore : SILENCE.lilac));
    });
    void s;
    void f;

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `a 100° wedge of attention · the only speed bonus in the game an opponent turns off by turning round`,
      SILENCE.violet);
  },
};

export const masteryPuppetmaster: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'A doll of them that relays every knife at ×1.25 — and a ritual on it wakes them up',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.72, y: ctx.h * 0.42 };
    let awakened = -1;
    let now = 0;
    victim(ctx, foe, { facing: () => Math.PI, halluc: () => now >= 0 && now < awakened + 15000 && awakened >= 0 });
    ctx.onFrame((_dt, elapsed) => { now = elapsed; });

    let terror = PUPPET_TERROR_COST;
    let dollHp = -1;
    const doll: Mark = { x: ctx.w * 0.42, y: ctx.h * 0.62 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(DEPTH_BEAM));
    const meter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 12, '', {
      fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(SILENCE.burlap),
    }).setOrigin(0.5).setDepth(31));

    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      if (dollHp > 0) {
        SilenceFx.drawDoll(g, ctx.tint, doll.x, doll.y, dollHp / DOLL_HP, t, 1);
        // The thread that carries the damage across.
        g.lineStyle(1.2, ctx.tint(SILENCE.twine), 0.4 + 0.3 * Math.sin(t * 4));
        g.lineBetween(doll.x, doll.y, foe.x, foe.y);
      }
      if (awakened >= 0 && elapsed - awakened < 15000) {
        SilenceFx.drawAwakened(g, ctx.tint, foe.x, foe.y, Math.PI, t, 1);
      }
      meter.setText(awakened >= 0
        ? `🕷 AWAKENED · ${((15000 - (elapsed - awakened)) / 1000).toFixed(1)}s`
        : dollHp > 0 ? `🪆 DOLL ${Math.max(0, Math.round(dollHp))} / ${DOLL_HP}  ·  relaying ×${DOLL_RELAY_MULT}`
          : `terror ${terror} / ${PUPPET_TERROR_COST}`);
    });

    ctx.at(500, () => {
      s.av.play('dash', 0);
      s.fx.slash(foe.x, foe.y, 0, 55, Math.PI / 3, { bloody: true });
      tick(ctx, foe.x, foe.y - 16, `${STAB_BASE_DMG}`, SILENCE.gore);
      tick(ctx, foe.x, foe.y - 34, '5s TO STITCH', SILENCE.burlap);
    });
    ctx.at(1400, () => {
      terror -= PUPPET_TERROR_COST;
      dollHp = DOLL_HP;
      s.fx.motes(doll.x, doll.y, 8, { color: SILENCE.burlap, life: 700 });
      tick(ctx, doll.x, doll.y - 34, `🪆 −${PUPPET_TERROR_COST} TERROR`, SILENCE.burlap);
      tick(ctx, doll.x, doll.y - 52, 'THEY CANNOT TOUCH IT', SILENCE.twine);
    });
    // Every knife into the doll goes into them, with interest.
    for (let i = 0; i < 3; i++) {
      ctx.at(2400 + i * 900, () => {
        if (dollHp <= 0) return;
        dollHp -= 15;
        s.fx.slash(doll.x, doll.y, 0, 34, Math.PI / 3, { bloody: true });
        tick(ctx, doll.x, doll.y - 20, '15', SILENCE.bone);
        tick(ctx, foe.x, foe.y - 16, `${Math.round(15 * DOLL_RELAY_MULT)}`, SILENCE.gore);
      });
    }
    // …and then the ritual, which the doll survives.
    ctx.at(5600, () => {
      s.av.play('sweep', 0);
      s.fx.beam(doll.x, doll.y, RITUAL_RADIUS * 0.4, { color: SILENCE.gore });
      awakened = 5600;
      s.fx.rupture(foe.x, foe.y, 60, {});
      tick(ctx, foe.x, foe.y - 40, '🕷 AWAKENED', SILENCE.gore);
      tick(ctx, foe.x, foe.y - 58, 'YOU STEER THEM NOW', SILENCE.blood);
    });
    const moves = [
      { at: 6600, text: `CLICK · SLASH ${AWAKEN_SLASH_DMG}`, color: SILENCE.gore },
      { at: 7600, text: `E · BITE ${AWAKEN_BITE_DMG} · HEAL ${AWAKEN_BITE_HEAL}`, color: SILENCE.orchid },
      { at: 8600, text: 'R · CANNIBALIZE 20 · HEAL 20', color: SILENCE.meat },
      { at: 9600, text: 'F · SLAM · 3 KIN AT 10 EACH', color: SILENCE.amethyst },
    ];
    for (const m of moves) {
      ctx.at(m.at, () => {
        s.fx.slash(foe.x, foe.y, Math.PI, 50, Math.PI / 3, { color: m.color });
        tick(ctx, foe.x, foe.y - 34, m.text, m.color);
      });
    }

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `the doll breaks after ${DOLL_HP} damage has gone through it · a corrupted kin costs you the fog entirely`,
      SILENCE.violet);
  },
};
