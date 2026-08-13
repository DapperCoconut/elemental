import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  BND, BindAvatar, BindFx,
  arenaBinding, chainLink, chainRun, cosmicVeil, cultistFigure, darkMark, eviscerateCharge,
  faithRing, godBeam, hexWard, idolStatue, oblivionShard, overrageAura, patheticLunge, patronEye,
  ritualDagger, spreadReticle, vesselHalo, vesselMark,
} from '../../../elements/kits/BindVisuals';

/**
 * Bind's showcases.
 *
 * Two things have to be in frame for a Bind preview to be honest. The first is the **patron** —
 * the veil, the eye and the anger bar hanging under it — because there is no ability in this kit
 * that is not a withdrawal against that bar, and a loop without it is documenting a generic gold
 * projectile element. The second is the **price**: the tithe pop-up, the heat wall, the starving
 * ring, the anger the ward hands over. Bind's abilities are cheap to look at and expensive to
 * own, and only the second half is interesting.
 *
 * Bind puts no sprite in the world at all — shards, hexes, chains, converts and the beam are
 * every one of them Graphics repainted per frame out of `BindVisuals`, so `ctx.fly` is useless
 * here. Every loop mirrors the kit's own little state records and hands them to the kit's own
 * painters.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `BindFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const ANGER_MAX = 100;
const ANGER_DECAY = 2;

const HEAT_RISE_S = 3.2;
const HEAT_FALL_S = 4.5;
const BEAM_TICK_COLD_MS = 460;
const BEAM_TICK_HOT_MS = 120;
const BEAM_DAMAGE = 7;
const OVERHEAT_ANGER = 20;
const OVERRAGE_SELF_DPS = 2;
const OVERRAGE_ANGER_RATE = 7;

const SHARD_COUNT = 25;
const SHARD_DAMAGE = 10;
const SHARD_SPEED = 720;
const SHARD_SPREAD = 96;
const SHARD_STAGGER_MS = 26;
const EVIS_CHARGE_MS = 1500;
const EVIS_TIGHT_SPREAD = 18;
const EVIS_ANGER_RATE = 4;

const IDOL_R = 118;
const IDOL_FAITH_MAX = 10;
const IDOL_VOLLEY = 5;
const IDOL_SHARD_DAMAGE = 6;
const IDOL_STARVE_ANGER = 5;
const CULT_ANGER_CUT = 0.12;
const CULT_FAITH_SHARE = 1 / 3;

const WARD_CHARGES = 3;
const WARD_ANGER_SHARE = 0.5;
const VESSEL_STEP = 0.15;

const RITUAL_ANGER = 15;
const RITUAL_SELF_DAMAGE = 25;

const AWAKE_VOLLEY_SHARDS = 7;
const AWAKE_SWIPE_DAMAGE = 24;
const AWAKE_SWIPE_R = 96;
const AWAKE_LASER_DAMAGE = 8;
const AWAKE_BLAST_TELL_MS = 900;
const AWAKE_BLAST_R = 122;
const AWAKE_BLAST_DAMAGE = 38;
const AWK_SHARD_DAMAGE = 9;
const AWK_DASH_DAMAGE = 18;

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── Shared staging ────────────────────────────────────────────────────

/**
 * The eye, the veil and the anger bar, painted every frame the way `paintGod` paints them.
 *
 * Returned so a script can drive the bar: `anger` is the only number in this element and every
 * loop in the file moves it, because that is what pressing a Bind key actually does.
 */
interface Sky {
  fx: BindFx;
  /** 0–100, exactly as the kit tracks it. */
  anger: number;
  /** Frames remaining of the turned patron, in ms. */
  wrathFor: number;
  /** The eye's mark, so beams and volleys leave from the right place. */
  eye: Mark;
}

function sky(ctx: PreviewCtx, o?: { decay?: boolean }): Sky {
  const fx = ctx.capture(() => new BindFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const s: Sky = { fx, anger: 0, wrathFor: 0, eye: { x: ctx.w * 0.5, y: 18 } };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    if (o?.decay !== false && s.wrathFor <= 0) {
      s.anger = Math.max(0, s.anger - ANGER_DECAY * (dt / 1000));
    }
    if (s.wrathFor > 0) s.wrathFor -= dt;
    g.clear();

    const anger = Phaser.Math.Clamp(s.anger / ANGER_MAX, 0, 1);
    const wrath = s.wrathFor > 0 ? 1 : 0;
    cosmicVeil(g, ctx.tint, s.eye.x, s.eye.y - 4, ctx.w * 0.86, 66, 0.95, t);
    patronEye(g, ctx.tint, s.eye.x, s.eye.y, 20, 0.28 + anger * 0.34 + wrath * 0.38, 1,
      { wrath, drift: Math.sin(t * 0.7) + (wrath ? Math.sin(t * 11) : 0), t });

    // The bar, hung under the eye like a jaw — the whole element, in 110 pixels.
    const w = 110;
    const by = s.eye.y + 22;
    g.fillStyle(ctx.tint(BND.void), 0.85);
    g.fillRect(s.eye.x - w / 2 - 3, by - 3, w + 6, 11);
    g.fillStyle(ctx.tint(BND.cosmicDeep), 0.95);
    g.fillRect(s.eye.x - w / 2, by, w, 5);
    g.fillStyle(ctx.tint(wrath ? BND.wrath : anger > 0.7 ? BND.heat : BND.gold),
      wrath ? 0.55 + 0.45 * Math.sin(t * 16) : 0.95);
    g.fillRect(s.eye.x - w / 2, by, w * (wrath ? 1 : anger), 5);
    g.lineStyle(1.2, ctx.tint(BND.goldDeep), 0.9);
    g.strokeRect(s.eye.x - w / 2, by, w, 5);
    for (let i = 1; i < 4; i++) {
      g.fillStyle(ctx.tint(BND.goldDeep), 0.8);
      g.fillRect(s.eye.x - w / 2 + (w * i) / 4, by, 1, 5);
    }
    for (let i = 0; i < 5; i++) {
      const cx = s.eye.x - w / 2 + (w * (i + 0.5)) / 5;
      const swing = Math.sin(t * 1.7 + i) * (2 + anger * 5);
      for (let k = 0; k < 2; k++) {
        chainLink(g, ctx.tint, cx + swing * (k + 1) * 0.35, by + 10 + k * 6,
          Math.PI / 2, 0.7, 0.7, anger);
      }
    }
  });
  return s;
}

function stageIt(ctx: PreviewCtx): { av: BaseAvatar; bav: BindAvatar | null } {
  const av = ctx.useAvatar(() => new BindAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { av, bav: av instanceof BindAvatar ? av : null };
}

/**
 * A caster the script positions itself, for the loops where the character is moved — walking out
 * of a faith ring, and being dragged into the middle of the room by four chains.
 */
function drivenCaster(ctx: PreviewCtx, read: () => Mark): { av: BaseAvatar; bav: BindAvatar | null } {
  if (ctx.scene.textures.exists('elem-bind')) {
    const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-bind').setDepth(5));
    ctx.onFrame(() => { const p = read(); body.setPosition(p.x, p.y); });
  }
  const av = ctx.useAvatar(() => new BindAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => { const p = read(); av.update(dt, p.x, p.y, 1); });
  return { av, bav: av instanceof BindAvatar ? av : null };
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#0b0518', strokeThickness: 3,
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

/** The grey stand-in, drawn by the script so a loop can move it or hide it. */
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

/**
 * A live volley of oblivion shards.
 *
 * Mirrors `throwVolley` + `updateShards` + `burstShard`: staggered launches out of the eye, a
 * straight run at 720 px/s to a scattered landing point, and a burst there. The landing points
 * are drawn from the same square-root-of-random disc the kit uses, so the footprint a preview
 * shows really is the footprint the ability makes.
 */
function shardField(ctx: PreviewCtx, fx: BindFx): {
  volley(o: {
    from: Mark; tx: number; ty: number; count: number; damage: number; spread: number;
    turned?: boolean; onBurst?: (x: number, y: number, damage: number) => void;
  }): void;
} {
  interface Live {
    x: number; y: number; tx: number; ty: number; ang: number; damage: number;
    liveAt: number; turned: boolean;
    onBurst?: (x: number, y: number, damage: number) => void;
  }
  const list: Live[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  let now = 0;
  ctx.onFrame((dt) => {
    now += dt;
    const s = dt / 1000;
    g.clear();
    for (let i = list.length - 1; i >= 0; i--) {
      const sh = list[i];
      if (now < sh.liveAt) continue;
      const d = Phaser.Math.Distance.Between(sh.x, sh.y, sh.tx, sh.ty);
      if (d <= SHARD_SPEED * s + 4) {
        list.splice(i, 1);
        fx.shardBurst(sh.tx, sh.ty, sh.turned);
        sh.onBurst?.(sh.tx, sh.ty, sh.damage);
        continue;
      }
      sh.ang = Math.atan2(sh.ty - sh.y, sh.tx - sh.x);
      sh.x += Math.cos(sh.ang) * SHARD_SPEED * s;
      sh.y += Math.sin(sh.ang) * SHARD_SPEED * s;
      oblivionShard(g, ctx.tint, sh.x, sh.y, sh.ang, 1, { scale: 1, eye: 1, turned: sh.turned });
    }
  });
  return {
    volley(o) {
      for (let i = 0; i < o.count; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random()) * o.spread;
        const px = Phaser.Math.Clamp(o.tx + Math.cos(a) * d, 6, ctx.w - 6);
        const py = Phaser.Math.Clamp(o.ty + Math.sin(a) * d, 24, ctx.h - 6);
        const ox = o.from.x + (Math.random() - 0.5) * (ctx.w * 0.28);
        const oy = o.from.y + 8 + Math.random() * 10;
        list.push({
          x: ox, y: oy, tx: px, ty: py, ang: Math.atan2(py - oy, px - ox),
          damage: o.damage, liveAt: now + i * SHARD_STAGGER_MS,
          turned: !!o.turned, onBurst: o.onBurst,
        });
      }
    },
  };
}

/** The heat bar the kit hangs over the caster's head while the beam is firing. */
function heatBar(ctx: PreviewCtx, at: () => Mark, read: () => { heat: number; over: boolean }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(17));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    const { heat, over } = read();
    g.clear();
    if (heat <= 0.01 && !over) return;
    const p = at();
    const w = 42;
    const by = p.y - 46;
    g.fillStyle(ctx.tint(BND.void), 0.8);
    g.fillRect(p.x - w / 2 - 1, by - 1, w + 2, 6);
    g.fillStyle(ctx.tint(BND.cosmicDeep), 0.9);
    g.fillRect(p.x - w / 2, by, w, 4);
    const hot = over || heat > 0.75;
    g.fillStyle(ctx.tint(over ? BND.wrath : hot ? BND.heat : BND.gold),
      over ? 0.6 + 0.4 * Math.sin(t * 14) : 0.95);
    g.fillRect(p.x - w / 2, by, w * heat, 4);
    g.fillStyle(ctx.tint(BND.wrath), 0.9);
    g.fillRect(p.x + w / 2 - 1.4, by - 1.6, 1.6, 7.2);
  });
}

// ── Click — Summon ────────────────────────────────────────────────────

/**
 * The beam, run on the kit's own heat integrator so the ramp in the tick rate is the real ramp:
 * 460ms between bites cold, 120ms hot, and 3.2 seconds of holding to get from one to the other.
 */
function summonLoop(ctx: PreviewCtx, opts: { overrage: boolean }): void {
  const s = sky(ctx);
  const { av } = stageIt(ctx);
  const home: Mark = { x: ctx.cx, y: ctx.cy };
  const foe: Mark = { x: ctx.w * 0.72, y: ctx.h * 0.72 };
  dummy(ctx, foe);
  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.overrage ? 'holding past the top: 2 HP and 7 anger a second, no stop'
      : '3.2s of holding tops the bar out — then 4.5s of nothing', BND.goldDeep);

  let heat = 0;
  let over = false;
  let nextTick = 0;
  let firing = false;
  let debt = 0;
  heatBar(ctx, () => home, () => ({ heat, over }));

  const beam = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
  ctx.at(240, () => { firing = true; av.play('punch', Math.atan2(foe.y - home.y, foe.x - home.x)); });

  const aura = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    beam.clear();
    aura.clear();

    if (firing && over && opts.overrage) {
      // Over-rage: the wall is gone. Heat is pinned, the tick stays at its fastest, and the
      // bill is 2 HP and 7 anger a second for as long as the button is down.
      heat = 1;
      debt += OVERRAGE_SELF_DPS * step;
      if (debt >= 1) {
        const bite = Math.floor(debt);
        debt -= bite;
        tick(ctx, home.x, home.y - 22, `−${bite}`, BND.wrath);
      }
      s.anger = Math.min(ANGER_MAX, s.anger + OVERRAGE_ANGER_RATE * step);
      overrageAura(aura, ctx.tint, home.x, home.y, 0.95, t);
    } else if (firing && !over) {
      heat = Math.min(1, heat + step / HEAT_RISE_S);
      if (heat >= 1) {
        over = true;
        s.anger = Math.min(ANGER_MAX, s.anger + OVERHEAT_ANGER);
        tick(ctx, home.x, home.y - 56, '🔥 OVERHEATED', BND.heat);
        tick(ctx, s.eye.x, s.eye.y + 40, `+${OVERHEAT_ANGER} ANGER`, BND.wrath);
        if (!opts.overrage) firing = false;
      }
    } else {
      heat = Math.max(0, heat - step / HEAT_FALL_S);
      if (over && heat <= 0) { over = false; tick(ctx, home.x, home.y - 46, '✦ COOL', BND.gold); }
    }

    if (!firing) return;
    godBeam(beam, ctx.tint, s.eye.x, s.eye.y + 10, foe.x, foe.y, 1, heat, t);
    if (elapsed < nextTick) return;
    // The gap really does lerp with the heat — this is the ability's whole texture.
    nextTick = elapsed + (over && opts.overrage
      ? BEAM_TICK_HOT_MS
      : Phaser.Math.Linear(BEAM_TICK_COLD_MS, BEAM_TICK_HOT_MS, heat));
    s.fx.scald(foe.x, foe.y, heat);
    tick(ctx, foe.x, foe.y - 16, `${BEAM_DAMAGE}`, heat > 0.7 ? BND.heat : BND.gold);
  });
}

export const summon: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'Click — 7 a bite along the whole beam line, from 460ms apart down to 120ms as it heats',
  run(ctx) { summonLoop(ctx, { overrage: false }); },
};

export const summonUpgraded: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'Over-rage — hold through the top and it never stops: 58 dmg/s, 2 HP/s and 7 anger/s',
  run(ctx) { summonLoop(ctx, { overrage: true }); },
};

// ── E — Shards of Oblivion ────────────────────────────────────────────

const TITHES = [
  '⛓ TITHE: −10% SPEED',
  '⛓ TITHE: +10% DAMAGE TAKEN',
  '⛓ TITHE: −10% DAMAGE DEALT',
];

function shardsLoop(ctx: PreviewCtx, opts: { evis: boolean }): void {
  const s = sky(ctx);
  const { av } = stageIt(ctx);
  const field = shardField(ctx, s.fx);
  const foe: Mark = { x: ctx.w * 0.66, y: ctx.h * 0.66 };
  dummy(ctx, foe);

  const spread = opts.evis ? EVIS_TIGHT_SPREAD : SHARD_SPREAD;
  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.evis ? `full charge: all 25 inside ${EVIS_TIGHT_SPREAD}px — one body eats the lot`
      : `25 shards across a ${SHARD_SPREAD}px disc — a body in the middle catches five or six`,
    BND.goldDeep);

  // Eviscerate's floor reticle, drawn at the exact radius the shards will scatter across.
  let chargeStart = -1;
  const reticle = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const chargeGfx = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    reticle.clear();
    chargeGfx.clear();
    if (chargeStart < 0) return;
    const k = Phaser.Math.Clamp((elapsed - chargeStart) / EVIS_CHARGE_MS, 0, 1);
    spreadReticle(reticle, ctx.tint, foe.x, foe.y,
      Phaser.Math.Linear(SHARD_SPREAD, EVIS_TIGHT_SPREAD, k), 0.95, k, t);
    eviscerateCharge(chargeGfx, ctx.tint, ctx.cx, ctx.cy, k, 0.95, t);
    // Billed by the second, as it accrues — an abandoned wind-up still cost something.
    s.anger = Math.min(ANGER_MAX, s.anger + EVIS_ANGER_RATE * (dt / 1000));
  });

  let landed = 0;
  const throwIt = (): void => {
    av.play('slam', Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx));
    landed = 0;
    field.volley({
      from: s.eye, tx: foe.x, ty: foe.y, count: SHARD_COUNT, damage: SHARD_DAMAGE, spread,
      onBurst: (x, y, damage) => {
        if (Phaser.Math.Distance.Between(x, y, foe.x, foe.y) > 34) return;
        landed++;
        tick(ctx, foe.x + (Math.random() - 0.5) * 22, foe.y - 14, `${damage}`, BND.gold);
      },
    });
    // The tithe is rolled on the ask, not on the result — a barrage that hits nothing costs
    // exactly as much as one that kills.
    const roll = Math.floor(Math.random() * 3);
    ctx.at(120, () => tick(ctx, ctx.cx, ctx.cy - 54, TITHES[roll], BND.wrath));
    ctx.at(1500, () => tick(ctx, foe.x, foe.y - 40, `${landed} × ${SHARD_DAMAGE}`, BND.goldLit));
  };

  if (opts.evis) {
    ctx.at(400, () => { chargeStart = 400; });
    ctx.at(400 + EVIS_CHARGE_MS, () => {
      chargeStart = -1;
      tick(ctx, ctx.cx, ctx.cy - 70, '⛓ EVISCERATE', BND.goldLit);
      throwIt();
    });
  } else {
    ctx.at(500, throwIt);
  }
}

export const shards: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'E — 25 shards at 10 each. Every cast buys a permanent tithe, and the god picks which',
  run(ctx) { shardsLoop(ctx, { evis: false }); },
};

export const shardsUpgraded: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Eviscerate — 1.5s of winding up closes the scatter from 96px to 18px, at 4 anger a second',
  run(ctx) { shardsLoop(ctx, { evis: true }); },
};

// ── R — Summon Idol ───────────────────────────────────────────────────

interface IdolState { x: number; y: number; faith: number; empty: number }

/** The statue and its ring, painted by the kit's own two painters. */
function paintIdol(ctx: PreviewCtx, idol: IdolState): void {
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    ground.clear();
    air.clear();
    const hunger = idol.faith <= 0 ? 1 : 1 - idol.faith / IDOL_FAITH_MAX;
    faithRing(ground, ctx.tint, idol.x, idol.y + 18, IDOL_R, 0.9, hunger, t);
    idolStatue(air, ctx.tint, idol.x, idol.y, 1, Math.floor(idol.faith), IDOL_FAITH_MAX, t);
  });
}

export const idol: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'R — fed, it throws 5 shards a second. Empty, it charges the patron 5 anger a second',
  run(ctx) {
    const s = sky(ctx);
    const home: Mark = { x: ctx.w * 0.36, y: ctx.h * 0.66 };
    const { av } = drivenCaster(ctx, () => home);
    const field = shardField(ctx, s.fx);
    const foe: Mark = { x: ctx.w * 0.84, y: ctx.h * 0.34 };
    dummy(ctx, foe);

    const idolAt: IdolState = { x: ctx.w * 0.36, y: ctx.h * 0.66, faith: 0, empty: 0 };
    paintIdol(ctx, idolAt);
    ctx.at(200, () => {
      av.play('raise');
      tick(ctx, idolAt.x, idolAt.y - 40, '⛓ IDOL RAISED · FEED IT', BND.gold);
    });

    // The walk out. Everything after this is the bill.
    ctx.at(4200, () => tick(ctx, home.x, home.y - 44, '↦ LEAVING THE RING', BND.goldDeep));
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 4200) return;
      home.x = Math.min(ctx.w * 0.86, home.x + 150 * (dt / 1000));
    });

    // One tick a second, exactly as `updateIdols` runs it.
    for (let i = 1; i <= 8; i++) {
      ctx.at(200 + i * 1000, () => {
        const fed = Phaser.Math.Distance.Between(home.x, home.y, idolAt.x, idolAt.y) <= IDOL_R;
        idolAt.faith = Phaser.Math.Clamp(idolAt.faith + (fed ? 1 : -1), 0, IDOL_FAITH_MAX);
        if (fed) s.fx.offering(home.x, home.y);
        if (idolAt.faith >= 1) {
          field.volley({
            from: { x: idolAt.x, y: idolAt.y - 14 }, tx: foe.x, ty: foe.y,
            count: IDOL_VOLLEY, damage: IDOL_SHARD_DAMAGE, spread: SHARD_SPREAD * 0.6,
            onBurst: (x, y, damage) => {
              if (Phaser.Math.Distance.Between(x, y, foe.x, foe.y) > 34) return;
              tick(ctx, foe.x + (Math.random() - 0.5) * 18, foe.y - 14, `${damage}`, BND.gold);
            },
          });
          return;
        }
        if (idolAt.faith > 0) return;
        // Empty. It bills every second until it is fed or it gives up at six.
        s.anger = Math.min(ANGER_MAX, s.anger + IDOL_STARVE_ANGER);
        tick(ctx, idolAt.x, idolAt.y - 36, `+${IDOL_STARVE_ANGER} ANGER · STARVED IDOL`, BND.wrath);
      });
    }
    label(ctx, ctx.w * 0.5, ctx.h - 10,
      `118px ring · +1 faith a second inside, −1 outside, ${IDOL_FAITH_MAX} max`, BND.goldDeep);
  },
};

export const idolUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Cult — each convert feeds ⅓ a faith, takes 12% off anger and gives 10% speed. Three and it never needs you',
  run(ctx) {
    const s = sky(ctx);
    const { av } = stageIt(ctx);
    const field = shardField(ctx, s.fx);
    const foe: Mark = { x: ctx.w * 0.86, y: ctx.h * 0.3 };
    dummy(ctx, foe);

    const idolAt: IdolState = { x: ctx.w * 0.52, y: ctx.h * 0.66, faith: 4, empty: 0 };
    paintIdol(ctx, idolAt);

    // Three converts, milling inside the ring on their own phases, each on a run of chain back
    // to the summoner — the leash is the ability's whole tell.
    interface Convert { x: number; y: number; seed: number }
    const cult: Convert[] = [];
    const figures = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    const leashes = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      figures.clear();
      leashes.clear();
      for (const c of cult) {
        c.x = idolAt.x + Math.sin(t * 0.9 + c.seed) * 30;
        c.y = idolAt.y + Math.cos(t * 0.7 + c.seed * 1.4) * 18;
        chainRun(leashes, ctx.tint, ctx.cx, ctx.cy + 6, c.x, c.y + 4, 0.75, 0.25, t, c.seed);
      }
      for (const c of [...cult].sort((a, b) => a.y - b.y)) {
        cultistFigure(figures, ctx.tint, c.x, c.y, 1, { awakened: false, t, seed: c.seed });
      }
    });

    for (let i = 0; i < 3; i++) {
      ctx.at(400 + i * 900, () => {
        const seed = 40 + i * 130;
        const c = { x: idolAt.x + Math.cos(i * 2.1) * 40, y: idolAt.y + Math.sin(i * 2.1) * 22, seed };
        cult.push(c);
        s.fx.cultistRise(c.x, c.y);
        av.play('raise');
        tick(ctx, ctx.cx, ctx.cy - 52,
          `⛓ CULTIST ${cult.length}/3 · −${Math.round(CULT_ANGER_CUT * cult.length * 100)}% ANGER`,
          BND.goldLit);
      });
    }

    // The summoner is nowhere near the ring, and after the third convert the faith stops moving.
    for (let i = 1; i <= 7; i++) {
      ctx.at(400 + i * 1000, () => {
        const swing = -1 + cult.length * CULT_FAITH_SHARE;
        idolAt.faith = Phaser.Math.Clamp(idolAt.faith + swing, 0, IDOL_FAITH_MAX);
        for (const c of cult) s.fx.offering(c.x, c.y);
        if (idolAt.faith >= 1) {
          field.volley({
            from: { x: idolAt.x, y: idolAt.y - 14 }, tx: foe.x, ty: foe.y,
            count: IDOL_VOLLEY, damage: IDOL_SHARD_DAMAGE, spread: SHARD_SPREAD * 0.6,
            onBurst: (x, y, damage) => {
              if (Phaser.Math.Distance.Between(x, y, foe.x, foe.y) > 34) return;
              tick(ctx, foe.x + (Math.random() - 0.5) * 18, foe.y - 14, `${damage}`, BND.gold);
            },
          });
        }
        if (cult.length === 3) tick(ctx, idolAt.x, idolAt.y - 44, 'SELF-SUFFICIENT', BND.goldLit);
      });
    }
    label(ctx, ctx.w * 0.5, ctx.h - 10, 'the summoner is outside the ring the whole time', BND.goldDeep);
  },
};

// ── F — Prophet's Protection ──────────────────────────────────────────

function wardLoop(ctx: PreviewCtx, opts: { vessel: boolean }): void {
  const s = sky(ctx);
  const { av } = stageIt(ctx);
  const home: Mark = { x: ctx.cx, y: ctx.cy };

  let charges = 0;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    if (!charges) return;
    // Chosen Vessel goes under the hexes, so the rungs read as coming off the ward itself.
    if (opts.vessel) vesselHalo(g, ctx.tint, home.x, home.y, Math.min(3, charges), 0.9, t);
    hexWard(g, ctx.tint, home.x, home.y, 34, 0.9, charges, t);
  });

  ctx.at(300, () => {
    charges = WARD_CHARGES;
    av.play('flex');
    tick(ctx, home.x, home.y - 52, '✦ PROPHET\'S PROTECTION', BND.gold);
    if (opts.vessel) {
      tick(ctx, home.x, home.y - 70,
        `✨ +${Math.round(VESSEL_STEP * 3 * 100)}% SPEED · +${Math.round(VESSEL_STEP * 3 * 100)}% DMG`,
        BND.goldLit);
    }
  });

  // Three hits arriving, deliberately of very different sizes: the hex does not care.
  const hits = [18, 65, 300];
  hits.forEach((amount, i) => {
    ctx.at(1300 + i * 1500, () => {
      if (!charges) return;
      charges--;
      s.fx.wardBlock(home.x, home.y);
      tick(ctx, home.x + 26, home.y - 8, `${amount} ✦`, BND.goldLit);
      tick(ctx, home.x, home.y - 40, `✦ WARDED (${charges})`, BND.goldLit);
      // Half the raw figure, straight onto the bar. The 300 is the whole point of the loop.
      const gain = amount * WARD_ANGER_SHARE;
      s.anger = Math.min(ANGER_MAX, s.anger + gain);
      tick(ctx, s.eye.x, s.eye.y + 40, `+${Math.round(gain)} ANGER · WARD`, BND.wrath);
      if (opts.vessel) {
        tick(ctx, home.x, home.y - 66,
          charges ? `✨ +${Math.round(VESSEL_STEP * charges * 100)}%` : '✨ SPENT',
          charges ? BND.gold : BND.goldDeep);
      }
      if (!charges) tick(ctx, home.x, home.y - 54, '✦ WARD SPENT', BND.goldDeep);
    });
  });
  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.vessel ? '45% → 30% → 15% → nothing, a rung per hex eaten'
      : 'each hex eats one whole instance — 18, 65 and 300 all cost exactly one', BND.goldDeep);
}

export const protection: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'F — 3 hexes, each eating one whole hit however large, and handing half of it to the patron',
  run(ctx) { wardLoop(ctx, { vessel: false }); },
};

export const protectionUpgraded: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Chosen Vessel — +15% speed and damage per hex still standing, dropping a rung per block',
  run(ctx) { wardLoop(ctx, { vessel: true }); },
};

// ── Q — God of Treachery ──────────────────────────────────────────────

/**
 * The open sky.
 *
 * `runGod` and the wrath are the same routine with one flag, so this helper is too — it drives
 * volleys, swipes, laser sprays and dark-light marks at whatever `victims` returns, and the
 * caller decides whether that is the enemy or the person who summoned it.
 */
function runGod(
  ctx: PreviewCtx, s: Sky, field: ReturnType<typeof shardField>,
  o: { from: number; until: number; victim: () => Mark; turned: boolean },
): void {
  const marks: Array<{ x: number; y: number; landsAt: number }> = [];
  const sprays: Array<{ x0: number; y0: number; x1: number; y1: number; until: number }> = [];
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const beams = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
  let nextVolley = o.from + 300;
  let nextSwipe = o.from + 700;
  let nextLaser = o.from + 200;
  let nextBlast = o.from + 1200;

  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    ground.clear();
    beams.clear();

    for (let i = marks.length - 1; i >= 0; i--) {
      const m = marks[i];
      if (elapsed >= m.landsAt) {
        marks.splice(i, 1);
        s.fx.darkBlast(m.x, m.y, AWAKE_BLAST_R * 0.5);
        tick(ctx, m.x, m.y - 20, `${AWAKE_BLAST_DAMAGE}`, BND.iris);
        continue;
      }
      const k = Phaser.Math.Clamp(1 - (m.landsAt - elapsed) / AWAKE_BLAST_TELL_MS, 0, 1);
      darkMark(ground, ctx.tint, m.x, m.y, AWAKE_BLAST_R * 0.5, 0.95, k, t);
    }
    for (let i = sprays.length - 1; i >= 0; i--) {
      const sp = sprays[i];
      if (elapsed >= sp.until) { sprays.splice(i, 1); continue; }
      const a = Phaser.Math.Clamp((sp.until - elapsed) / 180, 0, 1);
      beams.lineStyle(6, ctx.tint(BND.cosmic), a * 0.25);
      beams.lineBetween(sp.x0, sp.y0, sp.x1, sp.y1);
      beams.lineStyle(2.4, ctx.tint(o.turned ? BND.wrath : BND.gold), a * 0.9);
      beams.lineBetween(sp.x0, sp.y0, sp.x1, sp.y1);
      beams.fillStyle(ctx.tint(o.turned ? BND.wrath : BND.goldLit), a * 0.6);
      beams.fillCircle(sp.x1, sp.y1, 6 * a + 2);
    }

    if (elapsed < o.from || elapsed > o.until) return;
    const v = o.victim();

    if (elapsed >= nextVolley) {
      nextVolley = elapsed + 1200;
      field.volley({
        from: s.eye, tx: v.x, ty: v.y, count: AWAKE_VOLLEY_SHARDS, damage: SHARD_DAMAGE,
        spread: SHARD_SPREAD * 0.7, turned: o.turned,
        onBurst: (x, y, damage) => {
          if (Phaser.Math.Distance.Between(x, y, o.victim().x, o.victim().y) > 34) return;
          tick(ctx, x, y - 12, `${damage}`, o.turned ? BND.wrath : BND.gold);
        },
      });
    }
    if (elapsed >= nextSwipe) {
      nextSwipe = elapsed + 2100;
      s.fx.swipe(v.x, v.y, Math.random() * Math.PI * 2, AWAKE_SWIPE_R * 0.55, o.turned);
      tick(ctx, v.x, v.y - 26, `${AWAKE_SWIPE_DAMAGE}`, o.turned ? BND.wrath : BND.goldLit);
    }
    if (elapsed >= nextLaser) {
      nextLaser = elapsed + 620;
      for (let i = 0; i < 3; i++) {
        sprays.push({
          x0: s.eye.x + (i - 1) * 14, y0: s.eye.y + 10,
          x1: Phaser.Math.Clamp(v.x + (i - 1) * 24 + (Math.random() - 0.5) * 20, 8, ctx.w - 8),
          y1: v.y + (Math.random() - 0.5) * 16,
          until: elapsed + 180,
        });
      }
      tick(ctx, v.x + 18, v.y - 6, `${AWAKE_LASER_DAMAGE}`, o.turned ? BND.wrath : BND.gold);
    }
    if (elapsed >= nextBlast) {
      nextBlast = elapsed + 3000;
      marks.push({
        x: Phaser.Math.Clamp(v.x + (Math.random() - 0.5) * 50, 24, ctx.w - 24),
        y: Phaser.Math.Clamp(v.y + (Math.random() - 0.5) * 40, 34, ctx.h - 18),
        landsAt: elapsed + AWAKE_BLAST_TELL_MS,
      });
    }
  });
}

export const treachery: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Q — 15s of open sky, four chains holding you in the middle of it, and one slot gone for the match',
  run(ctx) {
    const s = sky(ctx);
    const home: Mark = { x: ctx.w * 0.24, y: ctx.h * 0.7 };
    const { av, bav } = drivenCaster(ctx, () => home);
    const field = shardField(ctx, s.fx);
    const foe: Mark = { x: ctx.w * 0.76, y: ctx.h * 0.42 };
    dummy(ctx, foe);
    const centre: Mark = { x: ctx.w * 0.5, y: ctx.h * 0.58 };
    const corners: [number, number][] = [
      [8, 22], [ctx.w - 8, 22], [ctx.w - 8, ctx.h - 8], [8, ctx.h - 8],
    ];

    let chained = false;
    ctx.at(400, () => {
      chained = true;
      av.play('raise');
      bav?.setChannelling(true);
      s.fx.wrath(s.eye.x, s.eye.y);
      s.fx.chainDown(centre.x, centre.y, corners);
      tick(ctx, home.x, home.y - 56, '⛓ THE GOD IS AWAKE', BND.goldLit);
      tick(ctx, home.x, home.y - 74, '⛓ E TAKEN — FOR THE MATCH', BND.wrath);
    });

    // Dragged in and pinned. The kit writes the position rather than the velocity, so nothing
    // the player does moves them for the whole fifteen seconds.
    const binding = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
    ctx.onFrame((dt, elapsed) => {
      binding.clear();
      if (!chained) return;
      const k = Math.min(1, dt / 130);
      home.x = Phaser.Math.Linear(home.x, centre.x, k);
      home.y = Phaser.Math.Linear(home.y, centre.y, k);
      arenaBinding(binding, ctx.tint, home.x, home.y, corners, 0.9, 0.92, elapsed / 1000);
    });

    runGod(ctx, s, field, { from: 400, until: 7000, victim: () => foe, turned: false });

    // The bill for fifteen seconds of open sky: the bar straight to the top, and it turns.
    ctx.at(7000, () => {
      chained = false;
      bav?.setChannelling(false);
      s.anger = ANGER_MAX;
      tick(ctx, home.x, home.y - 62, '⛓ THE SKY CLOSES', BND.wrath);
    });
    ctx.at(7300, () => {
      s.anger = 0;
      s.wrathFor = 1700;
      s.fx.wrath(s.eye.x, s.eye.y);
      tick(ctx, home.x, home.y - 74, '⛓⛓ THE PATRON HAS TURNED ⛓⛓', BND.wrath);
    });
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'the ultimate ends by topping the bar out — 5s of the same attacks, aimed at you', BND.goldDeep);
  },
};

export const treacheryUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Awakening — the hoods come off and the cult takes orders from your cursor, then it kills them all',
  run(ctx) {
    const s = sky(ctx);
    const home: Mark = { x: ctx.w * 0.5, y: ctx.h * 0.62 };
    const { av, bav } = drivenCaster(ctx, () => home);
    const field = shardField(ctx, s.fx);
    const foe: Mark = { x: ctx.w * 0.84, y: ctx.h * 0.36 };
    dummy(ctx, foe);
    const corners: [number, number][] = [
      [8, 22], [ctx.w - 8, 22], [ctx.w - 8, ctx.h - 8], [8, ctx.h - 8],
    ];

    interface Convert { x: number; y: number; seed: number; awake: boolean; dash: Mark | null; lean: number }
    const cult: Convert[] = [0, 1, 2].map((i) => ({
      x: ctx.w * (0.24 + i * 0.09), y: ctx.h * (0.5 + (i % 2) * 0.2),
      seed: 30 + i * 170, awake: false, dash: null, lean: 0,
    }));
    // The cursor they follow once they are awake, swung across the room so the homing reads.
    const cursor: Mark = { x: ctx.w * 0.66, y: ctx.h * 0.44 };

    const figures = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    const leashes = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const binding = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
    let chained = false;
    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      const step = dt / 1000;
      figures.clear();
      leashes.clear();
      binding.clear();
      cursor.x = ctx.w * 0.66 + Math.sin(t * 0.8) * ctx.w * 0.14;
      cursor.y = ctx.h * 0.44 + Math.cos(t * 0.6) * 16;

      for (const c of cult) {
        if (c.dash) {
          // 780 px/s straight through and 120px out the far side.
          const d = Phaser.Math.Distance.Between(c.x, c.y, c.dash.x, c.dash.y);
          const move = Math.min(d, 780 * step);
          const lx = c.x;
          const ly = c.y;
          if (d > 0.5) { c.x += ((c.dash.x - c.x) / d) * move; c.y += ((c.dash.y - c.y) / d) * move; }
          s.fx.cultistDash(lx, ly, c.x, c.y);
          c.lean = 0.6;
          if (d <= move + 0.5) { c.dash = null; c.lean = 0; }
        } else {
          const gx = (c.awake ? cursor.x : home.x) + Math.sin(t * 0.9 + c.seed) * 26;
          const gy = (c.awake ? cursor.y : home.y) + Math.cos(t * 0.7 + c.seed * 1.4) * 16;
          const d = Phaser.Math.Distance.Between(c.x, c.y, gx, gy);
          if (d > 4) {
            const move = Math.min(d, 190 * (c.awake ? 1.5 : 1) * step);
            c.x += ((gx - c.x) / d) * move;
            c.y += ((gy - c.y) / d) * move;
          }
        }
        chainRun(leashes, ctx.tint, home.x, home.y + 6, c.x, c.y + 4,
          0.75, c.awake ? 0.85 : 0.25, t, c.seed);
      }
      for (const c of [...cult].sort((a, b) => a.y - b.y)) {
        cultistFigure(figures, ctx.tint, c.x, c.y, 1,
          { awakened: c.awake, t, seed: c.seed, lean: c.lean });
      }
      if (chained) arenaBinding(binding, ctx.tint, home.x, home.y, corners, 0.9, 0.92, t);
    });

    ctx.at(500, () => {
      chained = true;
      av.play('raise');
      bav?.setChannelling(true);
      s.fx.wrath(s.eye.x, s.eye.y);
      s.fx.chainDown(home.x, home.y, corners);
      for (const c of cult) { c.awake = true; s.fx.cultistAwaken(c.x, c.y); }
      tick(ctx, home.x, home.y - 72, '👁️ THE CULT AWAKENS', BND.goldLit);
    });

    runGod(ctx, s, field, { from: 500, until: 6600, victim: () => foe, turned: false });

    // Their own volleys — deliberately wider than the player's, because they are converts.
    for (let i = 0; i < 3; i++) {
      for (let k = 0; k < 2; k++) {
        ctx.at(1000 + i * 320 + k * 1700, () => {
          const c = cult[i];
          field.volley({
            from: { x: c.x, y: c.y - 8 }, tx: foe.x, ty: foe.y,
            count: 3, damage: AWK_SHARD_DAMAGE, spread: 130 * 0.5,
            onBurst: (x, y, damage) => {
              if (Phaser.Math.Distance.Between(x, y, foe.x, foe.y) > 34) return;
              tick(ctx, x, y - 12, `${damage}`, BND.gold);
            },
          });
        });
      }
    }
    // And the charge, which goes through rather than up to.
    for (let i = 0; i < 3; i++) {
      ctx.at(2200 + i * 900, () => {
        const c = cult[i];
        const ang = Math.atan2(foe.y - c.y, foe.x - c.x);
        c.dash = {
          x: Phaser.Math.Clamp(foe.x + Math.cos(ang) * 60, 10, ctx.w - 10),
          y: Phaser.Math.Clamp(foe.y + Math.sin(ang) * 60, 30, ctx.h - 10),
        };
        tick(ctx, foe.x, foe.y - 30, `${AWK_DASH_DAMAGE}`, BND.goldLit);
      });
    }

    ctx.at(6600, () => {
      chained = false;
      bav?.setChannelling(false);
      // Every convert that woke up pays for having been allowed to see.
      for (const c of cult) s.fx.cultistStab(c.x, c.y);
      cult.length = 0;
      s.anger = ANGER_MAX;
      tick(ctx, home.x, home.y - 62, '⛓ THE SKY CLOSES', BND.wrath);
    });
    ctx.at(6900, () => { s.anger = 0; s.wrathFor = 1900; s.fx.wrath(s.eye.x, s.eye.y); });
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      '3 shards at 9 every ~2s each, and an 18-damage charge through the body every ~3s', BND.goldDeep);
  },
};

// ── Passives ──────────────────────────────────────────────────────────

export const thePatron: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  caption: 'Every bill the element can send, on one bar: it falls at 2 a second and nothing else lowers it',
  run(ctx) {
    const s = sky(ctx);
    stageIt(ctx);
    label(ctx, ctx.w * 0.5, ctx.h - 10, 'anger falls 2/s — that is the only thing that lowers it', BND.goldDeep);

    const bills: Array<{ at: number; amount: number; why: string }> = [
      { at: 900, amount: OVERHEAT_ANGER, why: 'OVERHEAT' },
      { at: 2600, amount: IDOL_STARVE_ANGER, why: 'STARVED IDOL' },
      { at: 3600, amount: IDOL_STARVE_ANGER, why: 'STARVED IDOL' },
      { at: 4600, amount: IDOL_STARVE_ANGER, why: 'STARVED IDOL' },
      { at: 6000, amount: 32, why: 'WARD · half of a 65' },
      { at: 7600, amount: 45, why: 'WARD · half of a 90' },
    ];
    for (const b of bills) {
      ctx.at(b.at, () => {
        s.anger = Math.min(ANGER_MAX, s.anger + b.amount);
        tick(ctx, ctx.cx, ctx.cy - 46, `+${b.amount} ANGER · ${b.why}`, BND.wrath);
        if (s.anger >= ANGER_MAX) {
          s.anger = 0;
          s.wrathFor = 1800;
          s.fx.wrath(s.eye.x, s.eye.y);
          tick(ctx, ctx.cx, ctx.cy - 64, '⛓⛓ THE PATRON HAS TURNED ⛓⛓', BND.wrath);
        }
      });
    }
  },
};

export const theTurning: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'At 100 it swings round: the same volleys, swipes, lasers and dark light, all of it aimed at you',
  run(ctx) {
    const s = sky(ctx, { decay: false });
    const { av } = stageIt(ctx);
    const field = shardField(ctx, s.fx);
    const home: Mark = { x: ctx.cx, y: ctx.cy };

    // Walked to the top on the ward, which is the fastest route there in the whole element.
    ctx.at(300, () => { av.play('flex'); });
    for (let i = 0; i < 3; i++) {
      ctx.at(500 + i * 500, () => {
        s.anger = Math.min(ANGER_MAX, s.anger + 34);
        tick(ctx, home.x, home.y - 44, '+34 ANGER · WARD', BND.wrath);
      });
    }
    ctx.at(1600, () => {
      s.anger = 0;
      s.wrathFor = 5000;
      s.fx.wrath(s.eye.x, s.eye.y);
      ctx.scene.cameras.main.shake(200, 0.004);
      tick(ctx, home.x, home.y - 62, '⛓⛓ THE PATRON HAS TURNED ⛓⛓', BND.wrath);
    });

    runGod(ctx, s, field, { from: 1600, until: 6600, victim: () => home, turned: true });

    // Nothing answers for the whole five seconds, and the cooldown comes straight back.
    for (let i = 0; i < 3; i++) {
      ctx.at(2400 + i * 1300, () => tick(ctx, home.x, home.y - 30, '⛓ IT IS NOT LISTENING', BND.wrathDeep));
    }
    ctx.at(6600, () => tick(ctx, home.x, home.y - 46, '⛓ IT IS CALM', BND.gold));
    label(ctx, ctx.w * 0.5, ctx.h - 8, 'the bar is zeroed the frame it turns — surviving it is a clean sheet', BND.goldDeep);
  },
};

// ── Mastery ───────────────────────────────────────────────────────────

/** A caption line the script rewrites as the loop moves through the passive's three clauses. */
function readout(ctx: PreviewCtx): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, ctx.h - 9, '', {
    fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(BND.goldDeep), align: 'center',
  }).setOrigin(0.5).setDepth(19));
}

/**
 * Vessel Of The Broken God.
 *
 * Three clauses in one loop, in the order the passive is actually felt: the mark on the body and
 * the extra shards it throws, then the enrage the ultimate lights, then the stab left in the hole
 * where the god took a slot. The enrage's real window is 20 seconds — 15 of open sky plus the 5 of
 * wrath that closing it always causes — and this compresses it, but it keeps the *shape*, because
 * the shape is the whole argument for the passive: the useful half is the tail, after the chains
 * come off and the god is pointed inward.
 */
export const masteryVessel: PreviewScript = {
  duration: 17000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Mastery passive — wear the patron\'s eye: 3 shards of your own on E, a 20s enrage on Q, and a stab where the slot it took used to be',
  run(ctx) {
    const s = sky(ctx);
    const home: Mark = { x: ctx.w * 0.3, y: ctx.h * 0.68 };
    const { av, bav } = drivenCaster(ctx, () => home);
    const field = shardField(ctx, s.fx);
    const foe: Mark = { x: ctx.w * 0.74, y: ctx.h * 0.44 };
    dummy(ctx, foe);
    const centre: Mark = { x: ctx.w * 0.5, y: ctx.h * 0.58 };
    const corners: [number, number][] = [
      [8, 22], [ctx.w - 8, 22], [ctx.w - 8, ctx.h - 8], [8, ctx.h - 8],
    ];
    const line = readout(ctx);

    interface Lunge { x0: number; y0: number; tx: number; ty: number; ang: number; until: number; hit: boolean }
    const st = { chained: false, rageUntil: -1, rageFrom: 0, lunge: null as Lunge | null };

    // The mark, the enrage rings and the lunge, all on one layer over the body.
    const worn = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      worn.clear();

      if (st.chained) {
        const k = Math.min(1, dt / 130);
        home.x = Phaser.Math.Linear(home.x, centre.x, k);
        home.y = Phaser.Math.Linear(home.y, centre.y, k);
      }

      // The lunge writes the position rather than pushing on a velocity, exactly as the kit does.
      const lunge = st.lunge;
      if (lunge) {
        if (elapsed >= lunge.until) {
          st.lunge = null;
        } else {
          const k = Math.min(1, dt / (150 * 0.55));
          home.x = Phaser.Math.Linear(home.x, lunge.tx, k);
          home.y = Phaser.Math.Linear(home.y, lunge.ty, k);
          patheticLunge(worn, ctx.tint, lunge.x0, lunge.y0, home.x, home.y, 0.9);
          ritualDagger(worn, ctx.tint, home.x + Math.cos(lunge.ang) * 21,
            home.y + Math.sin(lunge.ang) * 21, lunge.ang, 0.95);
          if (!lunge.hit && Phaser.Math.Distance.Between(home.x, home.y, foe.x, foe.y) <= 30) {
            lunge.hit = true;
            s.fx.stabHit(foe.x, foe.y, lunge.ang);
            tick(ctx, foe.x, foe.y - 22, `${15}`, BND.goldLit);
          }
        }
      }

      const rage = elapsed < st.rageUntil ? 1 : 0;
      vesselMark(worn, ctx.tint, home.x, home.y - 30, 11, 0.95, { wrath: rage, t, seed: 11 });
      if (rage) {
        const left = Phaser.Math.Clamp((st.rageUntil - elapsed) / (st.rageUntil - st.rageFrom), 0, 1);
        for (let i = 0; i < 2; i++) {
          const u = ((t * 1.1 + i / 2) % 1);
          worn.lineStyle(2.4 * (1 - u) + 0.4, ctx.tint(i % 2 ? BND.wrath : BND.wrathDeep),
            (1 - u) * 0.55 * (0.4 + left * 0.6));
          worn.strokeCircle(home.x, home.y, 18 + u * 26);
        }
      }
    });

    ctx.at(200, () => line.setText('a knot of the patron\'s own veil, with a small copy of its eye set into it'));

    // ── Clause one: the body throws too ──
    for (let k = 0; k < 2; k++) {
      ctx.at(1200 + k * 1900, () => {
        av.play('slam', Math.atan2(foe.y - home.y, foe.x - home.x));
        // The sky's twenty-five, thinned for the box, and then the three that are the passive.
        field.volley({
          from: s.eye, tx: foe.x, ty: foe.y, count: 12, damage: SHARD_DAMAGE,
          spread: SHARD_SPREAD * 0.5,
          onBurst: (x, y, damage) => {
            if (Phaser.Math.Distance.Between(x, y, foe.x, foe.y) > 34) return;
            tick(ctx, x, y - 12, `${damage}`, BND.gold);
          },
        });
        field.volley({
          from: { x: home.x, y: home.y - 6 }, tx: foe.x, ty: foe.y,
          count: 3, damage: SHARD_DAMAGE, spread: 42 * 0.5,
          onBurst: (x, y, damage) => {
            if (Phaser.Math.Distance.Between(x, y, foe.x, foe.y) > 34) return;
            tick(ctx, x, y - 12, `${damage}`, BND.goldLit);
          },
        });
        tick(ctx, home.x, home.y - 56, '👁️ +3 SHARDS · FROM YOU', BND.goldLit);
      });
    }
    ctx.at(1500, () => line.setText('E throws 3 more off your own body for 10 each — not out of the ceiling'));

    // ── Clause two: the enrage ──
    ctx.at(5200, () => {
      st.chained = true;
      st.rageFrom = 5200;
      st.rageUntil = 15600;
      av.play('raise');
      bav?.setChannelling(true);
      s.fx.wrath(s.eye.x, s.eye.y);
      s.fx.chainDown(centre.x, centre.y, corners);
      s.fx.vesselEnrage(home.x, home.y);
      tick(ctx, home.x, home.y - 78, '👁️ THE VESSEL IS ENRAGED', BND.wrath);
      tick(ctx, home.x, home.y - 60, '👁️ SHED 4 EFFECTS', BND.wrath);
      line.setText('+35% speed  ·  −40% damage taken  ·  every debuff scoured off 4× a second');
    });
    runGod(ctx, s, field, { from: 5400, until: 10200, victim: () => foe, turned: false });

    // The sky closing, which is the moment the enrage stops being decoration.
    ctx.at(10400, () => {
      st.chained = false;
      bav?.setChannelling(false);
      s.anger = ANGER_MAX;
      tick(ctx, home.x, home.y - 62, '⛓ THE SKY CLOSES', BND.wrath);
    });
    ctx.at(10700, () => {
      s.anger = 0;
      s.wrathFor = 2600;
      s.fx.wrath(s.eye.x, s.eye.y);
      tick(ctx, home.x, home.y - 74, '⛓⛓ THE PATRON HAS TURNED ⛓⛓', BND.wrath);
      line.setText('the chains come off and the god turns inward — this is the half the enrage is for');
    });
    runGod(ctx, s, field, { from: 10700, until: 13000, victim: () => home, turned: true });

    // ── Clause three: what the taken slot became ──
    ctx.at(13600, () => line.setText('and the slot the ultimate took is a 118px lunge for 15, every 1.8s'));
    for (let k = 0; k < 2; k++) {
      ctx.at(13800 + k * 1800, () => {
        const ang = Math.atan2(foe.y - home.y, foe.x - home.x);
        st.lunge = {
          x0: home.x, y0: home.y, ang, until: 13800 + k * 1800 + 150, hit: false,
          tx: Phaser.Math.Clamp(home.x + Math.cos(ang) * 118 * 0.6, 10, ctx.w - 10),
          ty: Phaser.Math.Clamp(home.y + Math.sin(ang) * 118 * 0.6, 30, ctx.h - 10),
        };
        av.play('punch', ang);
        tick(ctx, home.x, home.y - 46, '🗡 PATHETIC STAB', BND.gold);
      });
    }
  },
};

/**
 * Ritual Sacrifice.
 *
 * The bar is the only thing worth showing here, so the loop is really a graph: three of the kit's
 * own bills stacked up, then the dagger paying them off 15 at a time with a health counter running
 * down beside it — and then both refusals, because the two things the ability will not do are half
 * of what it is.
 */
export const masteryRitual: PreviewScript = {
  duration: 15000,
  scale: 0.9,
  caption: 'Mastery — 25 of your own health for 15 anger, no cooldown at all: the element\'s only way to buy patience back',
  run(ctx) {
    const s = sky(ctx);
    const { av } = stageIt(ctx);
    const home: Mark = { x: ctx.cx, y: ctx.cy };
    const line = readout(ctx);
    const state = { hp: 400 };

    // The health counter, because the whole ability is a conversion rate between two numbers.
    const hpText = ctx.adopt(ctx.scene.add.text(ctx.cx, ctx.cy + 34, '', {
      fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(BND.chainLit), stroke: '#0b0518', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20));
    ctx.onFrame(() => {
      hpText.setText(`${Math.round(state.hp)} / 400 HP     ·     ${Math.round(s.anger)} / 100 ANGER`);
    });

    // The bills, in the order a bad thirty seconds of Bind actually sends them.
    const bills: Array<{ at: number; amount: number; why: string }> = [
      { at: 700, amount: OVERHEAT_ANGER, why: 'OVERHEAT' },
      { at: 1600, amount: 45, why: 'WARD · half of a 90' },
      { at: 2500, amount: IDOL_STARVE_ANGER * 3, why: 'STARVED IDOL' },
    ];
    for (const b of bills) {
      ctx.at(b.at, () => {
        s.anger = Math.min(ANGER_MAX, s.anger + b.amount);
        tick(ctx, home.x, home.y - 48, `+${b.amount} ANGER · ${b.why}`, BND.wrath);
      });
    }
    ctx.at(300, () => line.setText('80 anger of bills, and 2 a second is the only thing that ever took any off'));

    // The dagger, paid four times in a row because nothing stops you.
    ctx.at(3600, () => line.setText('there is no cooldown — press it as many times as you can afford'));
    for (let i = 0; i < 4; i++) {
      ctx.at(3900 + i * 700, () => {
        const before = s.anger;
        s.anger = Math.max(0, s.anger - RITUAL_ANGER);
        state.hp -= RITUAL_SELF_DAMAGE;
        s.fx.ritualStab(home.x, home.y);
        av.play('slam', Math.PI / 2);
        tick(ctx, home.x, home.y - 64, `🗡 SACRIFICE · −${Math.round(before - s.anger)} ANGER`, BND.goldLit);
        tick(ctx, home.x + 16, home.y - 30, `${RITUAL_SELF_DAMAGE}`, BND.wrath);
      });
    }
    ctx.at(7000, () => line.setText('a full bar from 100 to 0 is seven stabs — 175 health, or 44% of you'));

    // Refusal one: nothing to spend.
    ctx.at(8600, () => {
      s.anger = 0;
      tick(ctx, home.x, home.y - 40, '⛓ IT IS ALREADY CALM', BND.wrath);
      line.setText('refused on a calm patron — there has to be anger there to take off');
    });

    // Refusal two: the floor. The god does not accept an offering that finishes the job for it.
    ctx.at(10600, () => {
      s.anger = 60;
      state.hp = 22;
      tick(ctx, home.x, home.y - 48, '+60 ANGER · WARD', BND.wrath);
    });
    ctx.at(11600, () => {
      tick(ctx, home.x, home.y - 40, '⛓ NOTHING LEFT TO GIVE', BND.wrath);
      line.setText('and refused at 25 health or less — a sacrifice must not finish the job for it');
    });
    ctx.at(13200, () => {
      // Which is exactly how a Bind player dies: the bar tops out with no way left to pay it down,
      // and the bar is zeroed the frame it turns.
      s.anger = 0;
      s.wrathFor = 1700;
      s.fx.wrath(s.eye.x, s.eye.y);
      tick(ctx, home.x, home.y - 62, '⛓⛓ THE PATRON HAS TURNED ⛓⛓', BND.wrath);
    });
  },
};
