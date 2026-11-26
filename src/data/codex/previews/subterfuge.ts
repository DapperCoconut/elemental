import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  SUB, SubterfugeAvatar, SubterfugeFx, banknoteLayered, discoBallShape, smokeBank, stiletto,
} from '../../../elements/kits/SubterfugeVisuals';
import {
  CrewType, MoneyIcon, drawBomb, drawBomber, drawCrew, drawCrewRank, drawFlare, drawMoneyBag,
  drawMoneyButton, drawStrikeZone,
} from '../../../elements/kits/SubterfugeCrewVisuals';
import {
  RIDE_SIZE, RideKind, drawHijackCharge, drawRide, drawRideHp, drawRideTop, drawShell,
  drawSpaceHint,
} from '../../../elements/kits/SubterfugeRideVisuals';
import { RIDE_BY_TIER, RIDE_SPECS } from '../../../elements/kits/SubterfugeRide';

/**
 * Subterfuge's showcases.
 *
 * The thing that has to be legible in every loop is the **wallet**. Nothing in this element
 * regenerates or cools down — it is bought, out of three banknotes hovering over his head — so a
 * preview without the notes in frame is documenting an element where the abilities are free,
 * which is the opposite of what this one is. Every script that spends money shows it leaving.
 *
 * The upgrades sell their wares on **money bars**: one above an ability card, or over the head of
 * a level-3 recruit. There is no tray in a preview box, so a loop that buys from a bar stands a
 * stub card in the corner (`cardStub`) and hangs the kit's real `drawMoneyButton` above it.
 *
 * Subterfuge puts no sprite in the world: daggers, recruits, banknotes, bars, the bomber, the
 * rides and the disco ball are every one of them Graphics repainted per frame out of
 * `SubterfugeVisuals`, `SubterfugeCrewVisuals` and `SubterfugeRideVisuals`, and the Spray is
 * hitscan, so `ctx.fly` is useless throughout.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `SubterfugeFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const MONEY_MAX = 3;
const MONEY_MAX_MASTERY = 4;
const MONEY_START = 2;
const MONEY_TICK_MS = 5000;

const DAGGER_SPEED = 1350;
const DAGGER_THROW_DMG = 8;
const DAGGER_RETURN_DMG = 18;
const DAGGER_MAX = 3;
const DAGGER_ARRIVE_R = 14;
const DAGGER_GAP_MS = 380;
const DAGGER_RECALL_LOCK_MS = 850;
const FIVE_DAGGER_MAX = 5;
const FIVE_COST = 2;
const FIVE_MS = 10000;

const SPRAY_CONE_HALF = Phaser.Math.DegToRad(7.5);
const SPRAY_DMG = 2;
const SPRAY_INTERVAL_MS = 80;
const SPRAY_RANGE = 520;
const BULLETS_MAX = 50;
const BULLETS_START = 25;
const BULLETS_RELOAD = 25;
const AMMO_PER_10_DMG = 3;
const SPRAY_FOCUS_FULL_MS = 8000;
const LUX_COST = 2;
const LUX_ROUNDS = 35;
const LUX_DMG = 3;

const CREW_MAX = 3;
const CREW_LOYALTY_MS = 40000;
const CREW_BRIBE_BONUS = 1.2;
const CREW_SPAWN_REACH = 46;
const CREW_MAX_LEVEL = 3;
const THUG_COST = 1;
const SPECIALIST_COST = 2;
const ROLODEX: CrewType[] = ['enforcer', 'sniper', 'medic'];
const RECRUIT_ICON: Record<CrewType, MoneyIcon> = {
  thug: 'crew', enforcer: 'enforcer', sniper: 'sniper', medic: 'medic',
};

const THUG_DMG = 1;
const THUG_MAG = 25;
const THUG_MAG_L3 = 40;
const THUG_RELOAD_MS = 5000;
const THUG_INTERVAL = 140;
const THUG_INTERVAL_L1 = 100;
const THUG_CONE_HALF_L1 = Phaser.Math.DegToRad(3.5);
const THUG_RANGE = 560;

const ENF_PELLETS = 5;
const ENF_PELLET_DMG = 2;
const ENF_PELLET_DMG_L3 = 3;
const ENF_INTERVAL = 900;
const ENF_INTERVAL_L1 = 600;
const ENF_MAG = 5;
const ENF_RELOAD_MS = 4000;
const ENF_RANGE = 230;
const ENF_RANGE_L2 = 330;
const ENF_CONE_HALF = Phaser.Math.DegToRad(11);

const SNIPER_DMG = 14;
const SNIPER_DMG_L1 = 18;
const SNIPER_TRUE_DMG_L1 = 4;
const SNIPER_DMG_L3 = 24;
const SNIPER_HEADSHOT_CHANCE = 0.25;
const SNIPER_HEADSHOT_MULT = 2;
const SNIPER_INTERVAL = 3500;
const SNIPER_INTERVAL_L2 = 2400;
const STRIKE_COST = 1;
const STRIKE_DELAY_MS = 5000;
const STRIKE_BOMBS = 10;
const STRIKE_BOMB_DMG = 14;
const STRIKE_BOMB_RADIUS = 62;
const STRIKE_FALL_MS = 520;
const STRIKE_STAGGER_MS = 110;
const STRIKE_PLANE_MS = 1500;
const STRIKE_SPREAD_ONE = 175;
const STRIKE_SPREAD_AREA = 14;

const MEDIC_DMG = 1;
const MEDIC_DMG_L1 = 2;
const MEDIC_INTERVAL = 900;
const MEDIC_RANGE = 420;
const MEDIC_HEAL_PER_S = 2;
const MEDIC_RADIUS = 150;

const STASH_COST = 1;
const STASH_PAYOUT = 2;
const STASH_MS = 3000;
const STASH_FAIL_DMG = 50;

const BRIBE_MS = 8000;
const BRIBE_DMG_MULT = 0.75;
const BRIBE_COOLDOWN_MS = 1000;

const TREACHERY_DELAY_MS = 2000;
const RETAINER_MS = 8000;
const RETAINER_COST = 2;

const BOOM_RADIUS = 96;
const BOOM_DAMAGE = 10;

const HIJACK_COOLDOWN_MS = 15000;
const HIJACK_TIER_MS = [0, 450, 950, 1500];
// SubterfugeRide.ts keeps these to itself; the specs it exports are imported above.
const RIDE_ENTER_RANGE = 66;
const REVERSE_FRAC = 0.45;
const ROLL_DRAG = 0.55;
const BRAKE_DRAG = 2.4;
const RAM_MIN_SPEED = 130;
const RAM_BASE_DMG = 6;
const RAM_SPEED_DMG = 16;
const RAM_REF_SPEED = 500;
const RAM_TANK_DMG = 22;
const RAM_CD_MS = 750;
const RAM_KNOCK = 520;
const RAM_KNOCK_MS = 200;
const SHELL_SPEED = 760;
const SHELL_RADIUS = 96;
const SHELL_DMG = 35;
const SHELL_RELOAD_MS = 2500;

// Money bars, as the kit lays them out over the tray.
const BAR_H = 16;
const BAR_GAP = 4;
const HEAD_BTN_W = 30;
const HEAD_BTN_H = 14;

const D_GROUND = 3;
const D_WORLD = 7;
const D_AIR = 11;

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── Shared staging ────────────────────────────────────────────────────

interface Stage { fx: SubterfugeFx; av: BaseAvatar; at: Mark }

function stageIt(ctx: PreviewCtx): Stage {
  const fx = ctx.capture(() => new SubterfugeFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new SubterfugeAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av, at: { x: ctx.cx, y: ctx.cy } };
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#080606', strokeThickness: 3,
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

/**
 * The three banknotes over his head, painted the way the kit paints them. Every loop that
 * spends anything carries one — an ability preview for this element without a wallet in it is
 * documenting a different element.
 */
function wallet(ctx: PreviewCtx, at: Mark, read: () => number, o?: { max?: number }): void {
  const max = o?.max ?? MONEY_MAX;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(19));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    const have = read();
    g.clear();
    for (let i = 0; i < max; i++) {
      const x = at.x + (i - (max - 1) / 2) * 15;
      const y = at.y - 44 + Math.sin(t * 2 + i * 0.7) * 2;
      if (i < have) {
        banknoteLayered(g, ctx.tint, x, y, Math.sin(t * 1.3 + i) * 0.2, 13, 6, 1);
        continue;
      }
      // An empty slot, so a spent note reads as spent rather than as never having been there.
      g.lineStyle(1, ctx.tint(SUB.graphite), 0.6);
      g.strokeRect(x - 6.5, y - 3, 13, 6);
    }
  });
}

/** The bullet counter the kit renders under the wallet. */
function magazine(ctx: PreviewCtx, at: Mark, read: () => number, o?: { max?: number }): void {
  const t = ctx.adopt(ctx.scene.add.text(at.x, at.y - 58, '', {
    fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(SUB.steelHi),
  }).setOrigin(0.5).setDepth(19));
  ctx.onFrame(() => {
    const have = read();
    t.setText(`${have} / ${o?.max ?? BULLETS_MAX}`);
    t.setColor(hex(have <= 0 ? SUB.scarlet : SUB.steelHi));
  });
}

/** Kickbacks, as the kit counts them: 3 rounds per whole 10 damage, the remainder carried. */
interface Gun { bullets: number; carry: number }

function kickback(gun: Gun, dmg: number): number {
  let gained = 0;
  gun.carry += dmg;
  while (gun.carry >= 10) {
    gun.carry -= 10;
    gained += AMMO_PER_10_DMG;
  }
  gun.bullets = Math.min(BULLETS_MAX, gun.bullets + gained);
  return gained;
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const k = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
}

// ── Money bars ────────────────────────────────────────────────────────

interface Rect { x: number; y: number; w: number; h: number }

/**
 * A stand-in ability card in the corner of the box. Returns the rect of the money bar the kit
 * would hang above it — same inset, same height, same gap as `_buildButtons`.
 */
function cardStub(ctx: PreviewCtx, key: string): Rect {
  const c: Rect = { x: 12, y: ctx.h - 48, w: 62, h: 30 };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
  g.fillStyle(ctx.tint(SUB.ink), 0.9);
  g.fillRoundedRect(c.x, c.y, c.w, c.h, 4);
  g.lineStyle(1, ctx.tint(SUB.graphite), 0.9);
  g.strokeRoundedRect(c.x, c.y, c.w, c.h, 4);
  ctx.adopt(ctx.scene.add.text(c.x + c.w / 2, c.y + c.h / 2, key, {
    fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(SUB.ash),
  }).setOrigin(0.5).setDepth(19));
  return { x: c.x + 3, y: c.y - BAR_H - BAR_GAP, w: c.w - 6, h: BAR_H };
}

interface BarState {
  cost: number;
  icon: MoneyIcon;
  /** -1 idle, else 0–1 of something running down. */
  progress?: number;
  blocked?: boolean;
  open?: boolean;
  hidden?: boolean;
}

/**
 * One money bar, painted by the kit's own `drawMoneyButton` from live state every frame.
 * Returns the click: a ripple on the bar, so the purchase reads as a press rather than a key.
 */
function moneyBar(
  ctx: PreviewCtx, s: Stage, rect: () => Rect, money: () => number, read: () => BarState,
): () => void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(19));
  let now = 0;
  let pressedAt = -9999;
  ctx.onFrame((_dt, elapsed) => {
    now = elapsed;
    g.clear();
    const b = read();
    if (b.hidden) return;
    const r = rect();
    drawMoneyButton(g, ctx.tint, r.x, r.y, r.w, r.h, elapsed / 1000, {
      cost: b.cost, affordable: money() >= b.cost && !b.blocked,
      hover: elapsed - pressedAt < 260 && !b.blocked,
      progress: b.progress === undefined || b.progress < 0 ? -1 : Phaser.Math.Clamp(b.progress, 0, 1),
      icon: b.icon, open: b.open,
    });
  });
  return () => {
    pressedAt = now;
    const r = rect();
    s.fx.ring(r.x + r.w / 2, r.y + r.h / 2, 3, 15, SUB.paper, 240, 20, 1.6);
  };
}

// ── The payroll ───────────────────────────────────────────────────────

interface Hand {
  type: CrewType;
  x: number; y: number;
  facing: number;
  /** 0–3. Every bribe under F+ is one promotion. */
  level: number;
  loyalty: number; maxLoyalty: number;
  bullets: number;
  reloadingUntil: number;
  nextShot: number;
  lastShot: number;
  healing: boolean;
}

function magOf(h: Hand): number {
  if (h.type === 'thug') return h.level >= 3 ? THUG_MAG_L3 : THUG_MAG;
  if (h.type === 'enforcer') return ENF_MAG;
  return Infinity;
}

function newHand(type: CrewType, at: Mark, facing: number, o?: { level?: number; loyalty?: number }): Hand {
  const h: Hand = {
    type, x: at.x, y: at.y, facing, level: o?.level ?? 0,
    loyalty: o?.loyalty ?? CREW_LOYALTY_MS, maxLoyalty: CREW_LOYALTY_MS,
    bullets: 0, reloadingUntil: 0, nextShot: 0, lastShot: -99999, healing: false,
  };
  h.bullets = magOf(h);
  return h;
}

/**
 * Where the kit stands a new hire: 46px from the boss on the side he is aiming, shuffled round
 * if one of the others already has the spot. He never leaves it.
 */
function standBeside(ctx: PreviewCtx, boss: Mark, crew: Hand[], aimX: number, aimY: number): Mark {
  let angle = Math.atan2(aimY - boss.y, aimX - boss.x);
  let x = boss.x;
  let y = boss.y;
  for (let tries = 0; tries < 7; tries++) {
    x = Phaser.Math.Clamp(boss.x + Math.cos(angle) * CREW_SPAWN_REACH, 22, ctx.w - 22);
    y = Phaser.Math.Clamp(boss.y + Math.sin(angle) * CREW_SPAWN_REACH, 22, ctx.h - 22);
    const px = x;
    const py = y;
    if (!crew.some((c) => Phaser.Math.Distance.Between(c.x, c.y, px, py) < 28)) break;
    angle += 0.9;
  }
  return { x, y };
}

/** One recruit the way the kit paints him: the figure, his rank, and loyalty as a banknote. */
function paintHand(
  g: Phaser.GameObjects.Graphics, ctx: PreviewCtx, h: Hand, elapsed: number,
  o?: { shielded?: boolean },
): void {
  const t = elapsed / 1000;
  const c = ctx.tint;
  if (h.type === 'medic') {
    g.lineStyle(1, c(SUB.moneyGreen), 0.16);
    g.strokeCircle(h.x, h.y, MEDIC_RADIUS);
  }
  const cycling = h.type === 'sniper' && elapsed < h.nextShot - 500;
  drawCrew(g, c, h.x, h.y, h.facing, t, 1, {
    type: h.type, level: h.level,
    reloading: h.reloadingUntil > elapsed || cycling,
    ignited: false, enemy: false,
    firedAgoMs: elapsed - h.lastShot,
    shielded: h.type === 'enforcer' || !!o?.shielded,
    healing: h.healing, seated: false,
  });
  drawCrewRank(g, c, h.x, h.y - 35, h.level, t, 1);
  const ratio = Phaser.Math.Clamp(h.loyalty / h.maxLoyalty, 0, 1);
  const bx = h.x - 17;
  const by = h.y - 27;
  g.fillStyle(c(SUB.slate), 0.85);
  g.fillRect(bx, by, 34, 7);
  if (ratio > 0) {
    const fw = 34 * ratio;
    g.fillStyle(c(SUB.paper), 0.97);
    g.fillRect(bx, by, fw, 7);
    g.fillStyle(c(SUB.moneyGreen), 0.35);
    g.fillRect(bx + 1, by + 1, Math.max(0, fw - 2), 5);
    if (fw > 10) {
      g.fillStyle(c(ratio < 0.25 ? SUB.crimson : SUB.gold), 1);
      g.fillCircle(bx + Math.min(fw - 4, 17), by + 3.5, 2);
    }
  }
  g.lineStyle(1, c(SUB.ink), 0.9);
  g.strokeRect(bx, by, 34, 7);
}

/**
 * One recruit's turn to shoot, mirroring `_fireRecruit`: nobody walks, everybody fires from
 * where he stands, and what he fires depends on what he is and how often he has been bribed.
 */
function fireHand(
  s: Stage, h: Hand, foe: Mark, elapsed: number, onHit: (dmg: number, color: number, note?: string) => void,
): void {
  h.facing = Math.atan2(foe.y - h.y, foe.x - h.x);
  const dist = Phaser.Math.Distance.Between(h.x, h.y, foe.x, foe.y);
  if (h.reloadingUntil > 0) {
    if (elapsed < h.reloadingUntil) return;
    h.reloadingUntil = 0;
    h.bullets = magOf(h);
  }
  if (elapsed < h.nextShot) return;
  const aim = h.facing;
  const round = (angle: number, range: number, color: number, width = 1.4): boolean => {
    const ex = h.x + Math.cos(angle) * range;
    const ey = h.y + Math.sin(angle) * range;
    s.fx.tracer(h.x, h.y, ex, ey, { color, depth: D_WORLD, duration: width > 2 ? 240 : 110, width });
    return segDist(foe.x, foe.y, h.x, h.y, ex, ey) <= 24;
  };

  if (h.type === 'thug') {
    if (dist > THUG_RANGE) return;
    h.nextShot = elapsed + (h.level >= 1 ? THUG_INTERVAL_L1 : THUG_INTERVAL);
    h.lastShot = elapsed;
    h.bullets -= 1;
    const cone = h.level >= 1 ? THUG_CONE_HALF_L1 : SPRAY_CONE_HALF;
    if (round(aim + Phaser.Math.FloatBetween(-cone, cone), THUG_RANGE, SUB.rust)) onHit(THUG_DMG, SUB.rust);
    if (h.bullets <= 0) h.reloadingUntil = elapsed + THUG_RELOAD_MS;
    return;
  }
  if (h.type === 'enforcer') {
    const range = h.level >= 2 ? ENF_RANGE_L2 : ENF_RANGE;
    if (dist > range) return;
    h.nextShot = elapsed + (h.level >= 1 ? ENF_INTERVAL_L1 : ENF_INTERVAL);
    h.lastShot = elapsed;
    h.bullets -= 1;
    const dmg = h.level >= 3 ? ENF_PELLET_DMG_L3 : ENF_PELLET_DMG;
    let total = 0;
    for (let p = 0; p < ENF_PELLETS; p++) {
      const spread = (p / (ENF_PELLETS - 1) - 0.5) * 2 * ENF_CONE_HALF;
      if (round(aim + spread, range, SUB.haze)) total += dmg;
    }
    if (total > 0) onHit(total, SUB.haze);
    if (h.bullets <= 0) h.reloadingUntil = elapsed + ENF_RELOAD_MS;
    return;
  }
  if (h.type === 'sniper') {
    h.nextShot = elapsed + (h.level >= 2 ? SNIPER_INTERVAL_L2 : SNIPER_INTERVAL);
    h.lastShot = elapsed;
    let dmg = h.level >= 3 ? SNIPER_DMG_L3 : h.level >= 1 ? SNIPER_DMG_L1 : SNIPER_DMG;
    const headshot = h.level >= 3 && Math.random() < SNIPER_HEADSHOT_CHANCE;
    if (headshot) dmg *= SNIPER_HEADSHOT_MULT;
    // The whole arena is in range, so the line simply runs out of the box.
    round(aim, 1400, headshot ? SUB.gold : SUB.steelHi, 3.2);
    onHit(dmg, headshot ? SUB.gold : SUB.steelHi, h.level >= 1 ? `+${SNIPER_TRUE_DMG_L1} true` : undefined);
    return;
  }
  if (dist > MEDIC_RANGE) return;
  h.nextShot = elapsed + MEDIC_INTERVAL;
  h.lastShot = elapsed;
  if (round(aim, MEDIC_RANGE, SUB.moneyGreen)) onHit(h.level >= 1 ? MEDIC_DMG_L1 : MEDIC_DMG, SUB.moneyGreen);
}

// ── Click — Molecular Cutter ──────────────────────────────────────────

function daggerLoop(ctx: PreviewCtx, opts: { five: boolean; boom: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.6, y: ctx.cy - 30 };
  dummy(ctx, foe);
  const gun: Gun = { bullets: BULLETS_START, carry: 0 };
  magazine(ctx, s.at, () => gun.bullets);

  let money = MONEY_MAX;
  let fiveUntil = -1;
  let clock = 0;
  let pressFive: (() => void) | null = null;
  if (opts.five) {
    wallet(ctx, s.at, () => money);
    const bar = cardStub(ctx, 'CLICK');
    pressFive = moneyBar(ctx, s, () => bar, () => money, () => ({
      cost: FIVE_COST, icon: 'daggers',
      progress: clock < fiveUntil ? (fiveUntil - clock) / FIVE_MS : -1, blocked: clock < fiveUntil,
    }));
  }

  interface Dagger {
    x: number; y: number; dx: number; dy: number; destX: number; destY: number;
    state: 'flying' | 'planted' | 'returning'; red: boolean; hit: boolean;
    fromX: number; fromY: number; boomed: boolean; gone: boolean;
  }
  const daggers: Dagger[] = [];
  interface Boom { x: number; y: number; born: number }
  const booms: Boom[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_AIR));

  const throwOne = (tx: number, ty: number, i: number): void => {
    const a = Math.atan2(ty - ctx.cy, tx - ctx.cx);
    daggers.push({
      x: ctx.cx, y: ctx.cy, dx: Math.cos(a), dy: Math.sin(a), destX: tx, destY: ty,
      state: 'flying', red: i % 2 === 0,
      hit: false, fromX: 0, fromY: 0, boomed: false, gone: false,
    });
    s.av.play('punch', a);
  };

  ctx.onFrame((dt, elapsed) => {
    const step = dt / 1000;
    const t = elapsed / 1000;
    clock = elapsed;
    g.clear();

    for (const d of daggers) {
      if (d.gone) continue;
      if (d.state === 'flying') {
        d.x += d.dx * DAGGER_SPEED * step;
        d.y += d.dy * DAGGER_SPEED * step;
        if ((d.destX - d.x) * d.dx + (d.destY - d.y) * d.dy <= 0) {
          d.x = d.destX;
          d.y = d.destY;
          d.state = 'planted';
        }
      } else if (d.state === 'returning') {
        const dx = ctx.cx - d.x;
        const dy = ctx.cy - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        d.dx = dx / dist;
        d.dy = dy / dist;
        d.x += d.dx * DAGGER_SPEED * step;
        d.y += d.dy * DAGGER_SPEED * step;
        if (dist <= DAGGER_ARRIVE_R + 6) {
          d.gone = true;
          // Sonic Boom: it got home ahead of its own noise, which lands where it left.
          if (opts.boom && !d.boomed) {
            booms.push({ x: d.fromX, y: d.fromY, born: elapsed });
            d.boomed = true;
          }
          continue;
        }
      }
      // The hit, on the way out or on the way home — the recall is worth more than twice as much.
      if (!d.hit && d.state !== 'planted'
        && Phaser.Math.Distance.Between(d.x, d.y, foe.x, foe.y) <= 20) {
        d.hit = true;
        const back = d.state === 'returning';
        const dmg = back ? DAGGER_RETURN_DMG : DAGGER_THROW_DMG;
        const color = d.red ? SUB.scarlet : SUB.steelHi;
        s.fx.cut(foe.x, foe.y, Math.atan2(d.dy, d.dx), back ? 42 : 30,
          { color, scores: back ? 3 : 2, depth: D_AIR });
        tick(ctx, foe.x + (Math.random() - 0.5) * 22, foe.y - 14, `${dmg}`, color);
        // Kickbacks: 3 rounds for every 10 damage the blades deal.
        const gained = kickback(gun, dmg);
        if (gained > 0) tick(ctx, ctx.cx + (Math.random() - 0.5) * 20, ctx.cy - 70, `+${gained} 🔫`, SUB.brass);
        if (opts.boom && back && !d.boomed) {
          booms.push({ x: foe.x, y: foe.y, born: elapsed });
          d.boomed = true;
        }
      }
      SubterfugeFx.drawDagger(g, ctx.tint, d.x, d.y, Math.atan2(d.dy, d.dx), d.state,
        d.red ? SUB.blood : SUB.ink, t, 1);
    }

    for (let i = booms.length - 1; i >= 0; i--) {
      const b = booms[i];
      const k = (elapsed - b.born) / 420;
      if (k >= 1) { booms.splice(i, 1); continue; }
      g.lineStyle(3 * (1 - k), ctx.tint(SUB.steelHi), 1 - k);
      g.strokeCircle(b.x, b.y, BOOM_RADIUS * k);
      g.lineStyle(1.4 * (1 - k), ctx.tint(SUB.scarlet), (1 - k) * 0.8);
      g.strokeCircle(b.x, b.y, BOOM_RADIUS * k * 0.7);
    }
  });

  // Blades planted past the target — so they cut it on the way out and again on the way home —
  // and the rest planted wide of it, which is where a Sonic Boom has to land instead.
  const ux = (foe.x - ctx.cx) / Math.hypot(foe.x - ctx.cx, foe.y - ctx.cy);
  const uy = (foe.y - ctx.cy) / Math.hypot(foe.x - ctx.cx, foe.y - ctx.cy);
  const past = (d: number, off: number): Mark => ({ x: foe.x + ux * d - uy * off, y: foe.y + uy * d + ux * off });
  const spots: Mark[] = opts.five
    ? [past(90, 14), { x: ctx.w * 0.5, y: ctx.h * 0.2 }, past(160, -18), { x: ctx.w * 0.47, y: ctx.h * 0.86 }, past(220, 8)]
    : [past(90, 14), past(160, -18), { x: ctx.w * 0.5, y: ctx.h * 0.2 }];

  const first = opts.five ? 900 : 500;
  const gap = opts.five ? DAGGER_GAP_MS + 60 : 600;
  if (opts.five) {
    ctx.at(350, () => {
      pressFive?.();
      money -= FIVE_COST;
      fiveUntil = 350 + FIVE_MS;
      for (const off of [-0.5, 0.5]) {
        s.fx.cut(ctx.cx, ctx.cy, ctx.aim + off, 34, { color: SUB.steelHi, scores: 1, duration: 260, depth: D_AIR });
      }
      tick(ctx, ctx.cx, ctx.cy - 86, `💵 −${FIVE_COST} · ${FIVE_DAGGER_MAX} BLADES · ${FIVE_MS / 1000}s`, SUB.gold);
    });
  }
  spots.forEach((sp, i) => ctx.at(first + i * gap, () => throwOne(sp.x, sp.y, i)));
  const recallAt = first + spots.length * gap + 500;
  ctx.at(recallAt, () => {
    s.av.play('clap');
    for (const d of daggers) {
      if (d.gone || d.state === 'returning') continue;
      d.fromX = d.x;
      d.fromY = d.y;
      d.state = 'returning';
      d.hit = false;
      s.fx.cut(d.x, d.y, Math.atan2(ctx.cy - d.y, ctx.cx - d.x), 20,
        { color: SUB.steelHi, scores: 1, duration: 200, depth: D_AIR });
    }
    tick(ctx, ctx.cx, ctx.cy - 86, 'RECALL!', SUB.scarlet);
  });
  ctx.at(recallAt + 250, () => tick(ctx, ctx.cx, ctx.cy + 30,
    `hand back in ${DAGGER_RECALL_LOCK_MS / 1000}s`, SUB.ashDark));

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.boom ? `${BOOM_DAMAGE} in a ${BOOM_RADIUS}px ring where the blade was standing — or on whoever it cut on the way home`
      : opts.five ? `${FIVE_COST}💵 on the bar above the Click card: ${FIVE_DAGGER_MAX} at once instead of ${DAGGER_MAX}, for ${FIVE_MS / 1000}s`
        : `${DAGGER_THROW_DMG} out, ${DAGGER_RETURN_DMG} back, ${DAGGER_MAX} at once · ${DAGGER_GAP_MS / 1000}s between throws, ${DAGGER_RECALL_LOCK_MS / 1000}s after a recall`,
    SUB.ash);
}

export const cutter: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Click — three blades planted, then all three recalled through anything in the way',
  run(ctx) { daggerLoop(ctx, { five: false, boom: false }); },
};

export const cutterUpgraded: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'Full Set — two notes on the money bar, and for ten seconds it is five blades, not three',
  run(ctx) { daggerLoop(ctx, { five: true, boom: false }); },
};

// ── E — Spray ─────────────────────────────────────────────────────────

function sprayLoop(ctx: PreviewCtx, opts: { steady: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.8, y: ctx.h * 0.42 };
  dummy(ctx, foe);
  const gun: Gun = { bullets: 6, carry: 0 };
  let money = opts.steady ? MONEY_MAX : MONEY_START;
  let lux = 0;
  wallet(ctx, s.at, () => money);
  magazine(ctx, s.at, () => gun.bullets);

  let pressLux: (() => void) | null = null;
  if (opts.steady) {
    const bar = cardStub(ctx, 'E');
    pressLux = moneyBar(ctx, s, () => bar, () => money, () => ({
      cost: LUX_COST, icon: 'luxury', progress: lux > 0 ? lux / LUX_ROUNDS : -1, blocked: lux > 0,
    }));
  }

  let firingFrom = -1;
  let nextShot = 0;
  const aimAt = (): number => Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx);
  // Steady Hands: the cone closes continuously over 8s of unbroken fire.
  const coneHalf = (elapsed: number): number => {
    if (!opts.steady || firingFrom < 0) return SPRAY_CONE_HALF;
    return SPRAY_CONE_HALF * (1 - Phaser.Math.Clamp((elapsed - firingFrom) / SPRAY_FOCUS_FULL_MS, 0, 1));
  };
  const cone = ctx.adopt(ctx.scene.add.graphics().setDepth(D_GROUND));
  ctx.onFrame((_dt, elapsed) => {
    cone.clear();
    if (firingFrom < 0) return;
    const half = lux > 0 ? 0.004 : Math.max(0.004, coneHalf(elapsed));
    const a = aimAt();
    cone.fillStyle(ctx.tint(lux > 0 ? SUB.gold : SUB.crimson), 0.1);
    cone.beginPath();
    cone.moveTo(ctx.cx, ctx.cy);
    cone.arc(ctx.cx, ctx.cy, SPRAY_RANGE, a - half, a + half, false);
    cone.closePath();
    cone.fillPath();
  });

  ctx.at(400, () => { firingFrom = 400; s.av.setHold('spray'); });
  let shots = 0;
  ctx.onFrame((_dt, elapsed) => {
    if (firingFrom < 0 || elapsed < nextShot) return;
    nextShot = elapsed + SPRAY_INTERVAL_MS;
    // Luxury Rounds go first: they were paid for, and they do not miss.
    const luxe = lux > 0;
    if (luxe) {
      lux--;
    } else if (gun.bullets <= 0) {
      if (elapsed % 600 < SPRAY_INTERVAL_MS * 1.5) tick(ctx, ctx.cx, ctx.cy - 74, 'EMPTY', SUB.scarlet);
      return;
    } else {
      gun.bullets--;
    }
    shots++;
    const half = luxe ? 0 : coneHalf(elapsed);
    const a = aimAt() + (Math.random() - 0.5) * half * 2;
    const ex = ctx.cx + Math.cos(a) * SPRAY_RANGE;
    const ey = ctx.cy + Math.sin(a) * SPRAY_RANGE;
    const color = luxe ? SUB.gold : SUB.brass;
    s.fx.tracer(ctx.cx, ctx.cy, ex, ey, { color, depth: D_AIR, duration: 90, width: luxe ? 1.8 : 1.4 });
    // Hitscan: it either was pointed at them or it was not.
    if (segDist(foe.x, foe.y, ctx.cx, ctx.cy, ex, ey) > 24) return;
    const dmg = luxe ? LUX_DMG : SPRAY_DMG;
    kickback(gun, dmg);
    if (shots % 2 === 0) tick(ctx, foe.x + (Math.random() - 0.5) * 24, foe.y - 12, `${dmg}`, color);
  });

  if (opts.steady) {
    // The magazine is nearly dry, so two notes go on the bar: 35 rounds that cannot miss — and
    // what they hit pays the ordinary magazine back while the cone keeps closing.
    ctx.at(1100, () => {
      pressLux?.();
      money -= LUX_COST;
      lux = LUX_ROUNDS;
      s.fx.cash(ctx.cx, ctx.cy, 4, { speed: 110, size: 12, life: 520, depth: D_AIR, seal: SUB.gold });
      tick(ctx, ctx.cx, ctx.cy - 86, `💵 −${LUX_COST} · ${LUX_ROUNDS} LUXURY ROUNDS · ${LUX_DMG} EACH`, SUB.gold);
    });
  }
  // Out of rounds, so the wallet buys 25 more. There is no free reload anywhere in the kit.
  ctx.at(opts.steady ? 8000 : 3000, () => {
    if (gun.bullets > 0 || lux > 0 || money < 1) return;
    money -= 1;
    gun.bullets = BULLETS_RELOAD;
    s.fx.cash(ctx.cx, ctx.cy - 30, 4, { depth: D_AIR, seal: SUB.crimson });
    tick(ctx, ctx.cx, ctx.cy - 86, `💵 −1 · +${BULLETS_RELOAD} ROUNDS`, SUB.gold);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.steady ? `the 15° cone closes to nothing over ${SPRAY_FOCUS_FULL_MS / 1000}s of unbroken fire · ${LUX_COST}💵 buys ${LUX_ROUNDS} rounds of ${LUX_DMG} that are fired first and never stray`
      : `${SPRAY_DMG} a round every ${SPRAY_INTERVAL_MS}ms in a 15° cone · ${BULLETS_MAX} in the magazine · a reload is 1💵 for ${BULLETS_RELOAD}`,
    SUB.ash);
}

export const spray: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'E — 2 damage a round, hitscan, and an empty magazine costs a note to refill',
  run(ctx) { sprayLoop(ctx, { steady: false }); },
};

export const sprayUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Steady Hands — the cone closes over eight seconds, and the money bar sells 35 Luxury Rounds',
  run(ctx) { sprayLoop(ctx, { steady: true }); },
};

// ── R — Recruit ───────────────────────────────────────────────────────

/** Damage numbers off a recruit's fire, thinned so a Tommy gun does not bury the target in 1s. */
function crewHits(ctx: PreviewCtx, foe: Mark): (dmg: number, color: number, note?: string) => void {
  let n = 0;
  return (dmg, color, note) => {
    n++;
    if (dmg <= THUG_DMG && n % 3 !== 0) return;
    tick(ctx, foe.x + (Math.random() - 0.5) * 26, foe.y - 14, `${dmg}`, color);
    if (note) tick(ctx, foe.x, foe.y - 32, note, SUB.paper);
  };
}

/** R — a Thug, and then two more: each one stands where he was hired while the target moves. */
function thugLoop(ctx: PreviewCtx): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.7, y: ctx.h * 0.45 };
  dummy(ctx, foe);
  let money = MONEY_MAX;
  wallet(ctx, s.at, () => money);

  const crew: Hand[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
  const hit = crewHits(ctx, foe);
  ctx.onFrame((dt, elapsed) => {
    // The target walks. Nobody on the payroll does: they turn and keep firing.
    foe.y = ctx.h * 0.45 + Math.sin(elapsed / 1100) * ctx.h * 0.27;
    g.clear();
    for (const h of crew) {
      h.loyalty -= dt;
      fireHand(s, h, foe, elapsed, hit);
      paintHand(g, ctx, h, elapsed);
    }
  });

  for (let i = 0; i < CREW_MAX; i++) {
    const at = 500 + i * 1500;
    ctx.at(at, () => {
      money -= THUG_COST;
      s.av.play('clap');
      const spot = standBeside(ctx, s.at, crew, foe.x, foe.y);
      const h = newHand('thug', spot, Math.atan2(foe.y - spot.y, foe.x - spot.x));
      h.nextShot = at + 300;
      crew.push(h);
      s.fx.payment(ctx.cx, ctx.cy, spot.x, spot.y, { count: THUG_COST * 2, depth: D_AIR });
      s.fx.smoke(spot.x, spot.y, 4, { speed: 40, size: 6, life: 520, depth: D_WORLD - 1 });
      tick(ctx, ctx.cx, ctx.cy - 74, `💵 −${THUG_COST} · THUG`, SUB.gold);
    });
  }
  ctx.at(500 + CREW_MAX * 1500, () => tick(ctx, ctx.cx, ctx.cy - 74,
    `${CREW_MAX} ON THE PAYROLL — THAT IS ALL OF IT`, SUB.ashDark));
  // The first drum runs dry about here: 25 rounds at one every 140ms.
  ctx.at(500 + 300 + THUG_MAG * THUG_INTERVAL + 150, () => {
    const h = crew[0];
    if (h) tick(ctx, h.x, h.y - 44, `RELOADING · ${THUG_RELOAD_MS / 1000}s`, SUB.ashDark);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `${THUG_COST}💵 each · ${CREW_SPAWN_REACH}px from you and he never walks · ${THUG_MAG}-round drum, ${THUG_RELOAD_MS / 1000}s reload · ${CREW_LOYALTY_MS / 1000}s of loyalty`,
    SUB.ash);
}

/** R+ — the Rolodex: the bar opens a list, and each name on it is 2 money. */
function rolodexLoop(ctx: PreviewCtx): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.cx + 205, y: ctx.cy - 56 };
  dummy(ctx, foe);
  let money = MONEY_MAX;
  wallet(ctx, s.at, () => money);

  const crew: Hand[] = [];
  let open = false;
  let healAccum = 0;
  const bar = cardStub(ctx, 'R');
  const pressBar = moneyBar(ctx, s, () => bar, () => money, () => ({
    cost: SPECIALIST_COST, icon: 'crew', blocked: crew.length >= CREW_MAX, open,
  }));
  const rows = ROLODEX.map((type, i) => moneyBar(ctx, s,
    () => ({ x: bar.x, y: bar.y - (BAR_H + 2) * (i + 1), w: bar.w, h: BAR_H }),
    () => money, () => ({ cost: SPECIALIST_COST, icon: RECRUIT_ICON[type], hidden: !open })));

  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
  const hit = crewHits(ctx, foe);
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    for (const h of crew) {
      h.loyalty -= dt;
      fireHand(s, h, foe, elapsed, hit);
      if (h.type === 'medic') {
        // The boss is standing inside his ring, and (for the showcase) hurt: 2 a second.
        h.healing = true;
        g.lineStyle(2, ctx.tint(SUB.moneyGreen), 0.4 + 0.2 * Math.sin(elapsed / 125));
        g.lineBetween(h.x, h.y, ctx.cx, ctx.cy);
        healAccum += dt;
        if (healAccum >= 1000) {
          healAccum -= 1000;
          s.fx.ring(ctx.cx, ctx.cy, 6, 26, SUB.moneyGreen, 320, D_AIR, 2);
          tick(ctx, ctx.cx - 22, ctx.cy - 20, `+${MEDIC_HEAL_PER_S}`, SUB.moneyGreen);
        }
      }
      paintHand(g, ctx, h, elapsed);
    }
  });

  const notes: Record<CrewType, string> = {
    thug: '',
    enforcer: `ENFORCER · ${ENF_PELLETS}×${ENF_PELLET_DMG} · SHIELDED`,
    sniper: `SNIPER · ${SNIPER_DMG} EVERY ${SNIPER_INTERVAL / 1000}s`,
    medic: `MEDIC · HEALS ${MEDIC_HEAL_PER_S}/s`,
  };
  ROLODEX.forEach((type, i) => {
    const at = 500 + i * 3000;
    // Income does not keep up with three specialists in ten seconds; the loop skips the wait.
    if (i > 0) {
      ctx.at(at - 300, () => {
        money = MONEY_MAX;
        tick(ctx, ctx.cx, ctx.cy - 74, '· A FULL WALLET LATER ·', SUB.ashDark);
      });
    }
    ctx.at(at, () => { pressBar(); open = true; });
    ctx.at(at + 600, () => {
      rows[i]();
      open = false;
      money -= SPECIALIST_COST;
      s.av.play('clap');
      const spot = standBeside(ctx, s.at, crew, foe.x, foe.y);
      const h = newHand(type, spot, Math.atan2(foe.y - spot.y, foe.x - spot.x));
      h.nextShot = at + 1000;
      crew.push(h);
      s.fx.payment(ctx.cx, ctx.cy, spot.x, spot.y, { count: SPECIALIST_COST * 2, depth: D_AIR });
      s.fx.smoke(spot.x, spot.y, 4, { speed: 40, size: 6, life: 520, depth: D_WORLD - 1 });
      tick(ctx, ctx.cx, ctx.cy - 74, `💵 −${SPECIALIST_COST} · ${notes[type]}`, SUB.gold);
    });
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `${SPECIALIST_COST}💵 each off the bar above the R card · shotgun and shield to ${ENF_RANGE}px · ${SNIPER_DMG} across the arena · ${MEDIC_HEAL_PER_S} health a second within ${MEDIC_RADIUS}px`,
    SUB.ash);
}

export const recruit: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'R — 1 money hires a Thug who stands where he was hired. Nothing here is summoned; it is bought',
  run(ctx) { thugLoop(ctx); },
};

export const recruitUpgraded: PreviewScript = {
  duration: 10500,
  scale: 0.9,
  caption: 'The Rolodex — a money bar above R that hires an Enforcer, a Sniper or a Medic for two notes',
  run(ctx) { rolodexLoop(ctx); },
};

// ── F — Bribe ─────────────────────────────────────────────────────────

/** The censor bar and the money raining on a bought-off enemy. */
function censor(ctx: PreviewCtx, s: Stage, foe: Mark, until: () => number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    if (elapsed >= until()) return;
    g.fillStyle(ctx.tint(SUB.ink), 0.95);
    g.fillRect(foe.x - 13, foe.y - 7, 26, 6);
    if (Math.random() < 0.06) s.fx.cash(foe.x, foe.y - 26, 1, { depth: D_AIR, gravity: 200 });
  });
}

function bribeLoop(ctx: PreviewCtx): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.34 };
  dummy(ctx, foe);
  let money = MONEY_MAX;
  wallet(ctx, s.at, () => money);

  // One of your own, well into his contract, so both halves of the key are in frame.
  const spot: Mark = { x: ctx.cx + 150, y: ctx.cy + 14 };
  const thug = newHand('thug', spot, 0, { loyalty: 9000 });
  let bribedUntil = -9999;
  censor(ctx, s, foe, () => bribedUntil);
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
  const hit = crewHits(ctx, foe);
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    thug.loyalty = Math.max(0, thug.loyalty - dt);
    fireHand(s, thug, foe, elapsed, hit);
    paintHand(g, ctx, thug, elapsed);
  });

  ctx.at(700, () => {
    money -= 1;
    s.av.play('sweep', Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx));
    s.fx.payment(ctx.cx, ctx.cy, foe.x, foe.y, { count: 6, depth: D_AIR });
    bribedUntil = 700 + BRIBE_MS;
    tick(ctx, foe.x, foe.y - 30, `💵 BRIBED · −${Math.round((1 - BRIBE_DMG_MULT) * 100)}% DMG`, 0x66dd66);
    tick(ctx, foe.x, foe.y - 48, `${BRIBE_MS / 1000}s`, SUB.moneyGreen);
  });

  ctx.at(3000, () => {
    money -= 1;
    s.av.play('sweep', Math.atan2(thug.y - ctx.cy, thug.x - ctx.cx));
    s.fx.payment(ctx.cx, ctx.cy, thug.x, thug.y, { count: 6, depth: D_AIR });
    thug.loyalty = thug.maxLoyalty * CREW_BRIBE_BONUS;
    tick(ctx, thug.x, thug.y - 46,
      `💵 LOYALTY → ${Math.round(CREW_BRIBE_BONUS * 100)}% · ${(CREW_LOYALTY_MS * CREW_BRIBE_BONUS) / 1000}s`, SUB.gold);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    'the money physically crosses the gap · an enemy hits softer, one of yours works longer', SUB.ash);
}

/**
 * F+ — Hardened Criminals, start to finish: a Sniper bribed up to level 3, the air strike he
 * then has to sell landing inside the three daggers already standing round the target, and the
 * Laundering bag that pays for half of it. Income runs at the real rate throughout.
 */
function hardenedLoop(ctx: PreviewCtx): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.74, y: ctx.h * 0.46 };
  dummy(ctx, foe);
  let money = MONEY_MAX;
  let incomeMs = 0;
  let clock = 0;
  wallet(ctx, s.at, () => money);

  // Three blades planted earlier, fencing the target in. This is what the plane aims by.
  const planted: Mark[] = [
    { x: foe.x - 88, y: foe.y - 52 },
    { x: foe.x + 92, y: foe.y - 40 },
    { x: foe.x + 6, y: foe.y + 74 },
  ];
  const sniper = newHand('sniper', { x: ctx.cx + 118, y: ctx.cy - 26 }, 0);
  sniper.nextShot = 1500;

  // Laundering: the bar above the F card, and the bag on the floor behind him.
  let bagBorn = -1;
  const fBar = cardStub(ctx, 'F');
  const pressStash = moneyBar(ctx, s, () => fBar, () => money, () => ({
    cost: STASH_COST, icon: 'stash',
    progress: bagBorn >= 0 ? 1 - (clock - bagBorn) / STASH_MS : -1, blocked: bagBorn >= 0,
  }));
  const bagAt: Mark = { x: ctx.cx - 26, y: ctx.cy + 8 };

  // The favour: a bar over the head of a level-3 recruit.
  let strikeCalled = -1;
  let planeAt = -1;
  interface Bomb { x: number; y: number; dropAt: number; done: boolean }
  let bombs: Bomb[] = [];
  const pressStrike = moneyBar(ctx, s,
    () => ({ x: sniper.x - HEAD_BTN_W / 2, y: sniper.y - 55, w: HEAD_BTN_W, h: HEAD_BTN_H }),
    () => money, () => ({
      cost: STRIKE_COST, icon: 'airstrike', hidden: sniper.level < CREW_MAX_LEVEL,
      progress: strikeCalled >= 0 && planeAt < 0 ? 1 - (clock - strikeCalled) / STRIKE_DELAY_MS : -1,
      blocked: strikeCalled >= 0,
    }));

  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(D_GROUND));
  const world = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(D_AIR));
  const hit = crewHits(ctx, foe);

  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    clock = elapsed;
    ground.clear();
    world.clear();
    air.clear();

    // One note every five seconds, and the clock does not run on a full wallet.
    if (money >= MONEY_MAX) {
      incomeMs = 0;
    } else {
      incomeMs += dt;
      if (incomeMs >= MONEY_TICK_MS) {
        incomeMs -= MONEY_TICK_MS;
        money++;
        tick(ctx, ctx.cx + 34, ctx.cy - 44, '💵 +1', SUB.gold);
      }
    }

    for (const d of planted) SubterfugeFx.drawDagger(world, ctx.tint, d.x, d.y, 0.9, 'planted', SUB.blood, t, 1);
    sniper.loyalty -= dt;
    fireHand(s, sniper, foe, elapsed, hit);
    paintHand(world, ctx, sniper, elapsed);

    if (bagBorn >= 0) {
      drawMoneyBag(ground, ctx.tint, bagAt.x, bagAt.y, t, Phaser.Math.Clamp((elapsed - bagBorn) / STASH_MS, 0, 1), 0, 1);
      if (elapsed - bagBorn >= STASH_MS) {
        bagBorn = -1;
        money = Math.min(MONEY_MAX, money + STASH_PAYOUT);
        s.fx.payment(bagAt.x, bagAt.y, ctx.cx, ctx.cy - 44, { count: 6, depth: D_AIR });
        s.fx.ring(bagAt.x, bagAt.y, 6, 30, SUB.gold, 360, D_AIR, 2.4);
        tick(ctx, bagAt.x, bagAt.y - 22, `💵 +${STASH_PAYOUT} · CLEAN`, SUB.gold);
      }
    }

    if (strikeCalled < 0) return;
    if (planeAt < 0) {
      // Inbound: the flare climbing, and red on every blade the plane will aim by.
      const k = Phaser.Math.Clamp((elapsed - strikeCalled) / STRIKE_DELAY_MS, 0, 1);
      drawFlare(air, ctx.tint, sniper.x, sniper.y, Math.min(1, k * 2.5), t, 1);
      drawStrikeZone(ground, ctx.tint, planted, STRIKE_SPREAD_ONE, ctx.w, ctx.h, k, t, 1);
      if (elapsed < strikeCalled + STRIKE_DELAY_MS) return;
      // The plane is here. Three daggers: a random blend of the corners always lands inside.
      planeAt = elapsed;
      bombs = [];
      for (let i = 0; i < STRIKE_BOMBS; i++) {
        const w = planted.map(() => -Math.log(1 - Math.random()));
        const sum = w.reduce((a, b) => a + b, 0) || 1;
        const ja = Math.random() * Math.PI * 2;
        const jr = STRIKE_SPREAD_AREA * Math.sqrt(Math.random());
        let x = Math.cos(ja) * jr;
        let y = Math.sin(ja) * jr;
        planted.forEach((p, n) => { x += p.x * (w[n] / sum); y += p.y * (w[n] / sum); });
        bombs.push({ x, y, dropAt: elapsed + 200 + i * STRIKE_STAGGER_MS, done: false });
      }
      return;
    }
    for (const b of bombs) {
      if (b.done || elapsed < b.dropAt) continue;
      if (elapsed < b.dropAt + STRIKE_FALL_MS) {
        drawBomb(air, ctx.tint, b.x, b.y, STRIKE_BOMB_RADIUS, (elapsed - b.dropAt) / STRIKE_FALL_MS, t, 1);
        continue;
      }
      b.done = true;
      s.fx.flash(b.x, b.y, 30, D_AIR, SUB.flame);
      s.fx.deal(b.x, b.y, STRIKE_BOMB_RADIUS, { notes: 0, rings: 2, duration: 420, color: SUB.ember });
      s.fx.smoke(b.x, b.y, 5, { speed: 110, size: 9, life: 760, depth: D_AIR, color: SUB.ashDark });
      s.fx.scorch(b.x, b.y, 26);
      if (Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) <= STRIKE_BOMB_RADIUS) {
        tick(ctx, foe.x + (Math.random() - 0.5) * 30, foe.y - 14, `${STRIKE_BOMB_DMG}`, SUB.flame);
      }
    }
    const k = (elapsed - planeAt) / STRIKE_PLANE_MS;
    if (k <= 1) {
      const cx = (planted[0].x + planted[1].x + planted[2].x) / 3;
      const cy = (planted[0].y + planted[1].y + planted[2].y) / 3;
      drawBomber(air, ctx.tint, Phaser.Math.Linear(cx - 760, cx + 760, k), cy, 0, t, 1);
    }
  });

  const stash = (at: number): void => {
    ctx.at(at, () => {
      if (money < STASH_COST || bagBorn >= 0) return;
      pressStash();
      money -= STASH_COST;
      bagBorn = at;
      s.fx.cash(ctx.cx, ctx.cy, 2, { speed: 60, size: 11, life: 420, depth: D_AIR, seal: SUB.gold });
      tick(ctx, bagAt.x, bagAt.y + 24, `💵 −${STASH_COST} · ${STASH_MS / 1000}s`, SUB.gold);
    });
  };
  const perks = ['', '1 · HIGH CALIBER', '2 · PROFESSIONAL', '3 · BOUNTY HUNTER'];
  const promote = (at: number): void => {
    ctx.at(at, () => {
      if (money < 1) return;
      money -= 1;
      s.av.play('sweep', Math.atan2(sniper.y - ctx.cy, sniper.x - ctx.cx));
      s.fx.payment(ctx.cx, ctx.cy, sniper.x, sniper.y, { count: 6, depth: D_AIR });
      sniper.loyalty = sniper.maxLoyalty * CREW_BRIBE_BONUS;
      // One bribe, one promotion. Nothing teaches like being paid.
      sniper.level = Math.min(CREW_MAX_LEVEL, sniper.level + 1);
      s.fx.cash(sniper.x, sniper.y, 4 + sniper.level * 2, { speed: 170, size: 14, life: 700, depth: D_AIR, seal: SUB.gold });
      s.fx.ring(sniper.x, sniper.y, 8, 30 + sniper.level * 6, SUB.gold, 380, D_AIR, 2.6);
      tick(ctx, sniper.x, sniper.y - 62, perks[sniper.level], SUB.gold);
    });
  };

  // A note into the bag first; two bribes while it washes; the third out of what it pays.
  stash(400);
  promote(1000);
  promote(1000 + BRIBE_COOLDOWN_MS + 100);
  promote(400 + STASH_MS + 400);
  ctx.at(4900, () => {
    if (money < STRIKE_COST || sniper.level < CREW_MAX_LEVEL) return;
    pressStrike();
    money -= STRIKE_COST;
    strikeCalled = 4900;
    s.fx.flash(sniper.x, sniper.y - 10, 12, D_AIR, SUB.scarlet);
    tick(ctx, sniper.x, sniper.y - 76, `💵 −${STRIKE_COST} · AIR STRIKE IN ${STRIKE_DELAY_MS / 1000}s`, SUB.scarlet);
  });
  // The five seconds the plane takes are long enough to wash another note.
  stash(5800);

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `one bribe, one level, to ${CREW_MAX_LEVEL} · his favour: ${STRIKE_BOMBS} bombs of ${STRIKE_BOMB_DMG} inside your planted daggers · ${STASH_COST}💵 launders into ${STASH_PAYOUT} if you take under ${STASH_FAIL_DMG} in ${STASH_MS / 1000}s`,
    SUB.ash);
}

export const bribe: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'F — 1 money. An enemy deals 25% less for 8s; your own recruit goes back to 120% loyalty',
  run(ctx) { bribeLoop(ctx); },
};

export const bribeUpgraded: PreviewScript = {
  duration: 12600,
  scale: 0.9,
  caption: 'Hardened Criminals — three bribes make a level-3 Sniper, who sells an air strike aimed by your daggers; the F bar launders',
  run(ctx) { hardenedLoop(ctx); },
};

// ── Q — Dark Treachery ────────────────────────────────────────────────

function treacheryLoop(ctx: PreviewCtx, opts: { retainer: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.76, y: ctx.h * 0.42 };
  dummy(ctx, foe);
  let money = MONEY_MAX;
  wallet(ctx, s.at, () => money);

  // The channel: two full seconds of black fog before anything happens at all.
  let channelFrom = -1;
  let retainerUntil = -9999;
  let clock = 0;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_GROUND));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    clock = elapsed;
    g.clear();
    if (channelFrom >= 0 && elapsed - channelFrom < TREACHERY_DELAY_MS) {
      const k = (elapsed - channelFrom) / TREACHERY_DELAY_MS;
      smokeBank(g, ctx.cx, ctx.cy, 26 + k * 26, 3, t, ctx.tint(SUB.ink), 0.55, 9);
      g.lineStyle(2, ctx.tint(SUB.crimson), 0.4 + 0.4 * Math.sin(t * 12));
      g.strokeCircle(ctx.cx, ctx.cy, 30 + k * 22);
    }
  });

  // On Retainer: the contract is a bar above the Q card for as long as the window is open.
  let pressRetainer: (() => void) | null = null;
  if (opts.retainer) {
    const bar = cardStub(ctx, 'Q');
    pressRetainer = moneyBar(ctx, s, () => bar, () => money, () => ({
      cost: RETAINER_COST, icon: 'retainer', hidden: clock >= retainerUntil,
      progress: (retainerUntil - clock) / RETAINER_MS,
    }));
  }

  // A disco ball, because Sound's is the crooked copy that reads best in a small box.
  interface Disco { x: number; y: number; born: number; next: number }
  const balls: Disco[] = [];
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(D_AIR));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    air.clear();
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (elapsed - b.born > 12000) { balls.splice(i, 1); continue; }
      discoBallShape(air, ctx.tint, b.x, b.y, 13, t * 2, 1);
      if (elapsed < b.next) continue;
      b.next = elapsed + 3000;
      s.fx.tracer(b.x, b.y, foe.x, foe.y, { color: SUB.neon, depth: D_AIR, duration: 200, width: 2 });
      tick(ctx, foe.x, foe.y - 14, '10', SUB.neon);
    }
  });

  const resolve = (at: number, x: number): void => {
    channelFrom = -1;
    s.fx.deal(ctx.cx, ctx.cy, 60, { depth: D_AIR });
    balls.push({ x, y: ctx.h * 0.24, born: at, next: at + 600 });
    tick(ctx, ctx.cx, ctx.cy - 74, '🪩 SOUND — DISCO BALL', SUB.neon);
  };

  ctx.at(500, () => {
    channelFrom = 500;
    s.av.play('raise', ctx.aim, 1100);
    tick(ctx, ctx.cx, ctx.cy - 74, '🕴️ DARK TREACHERY', SUB.crimson);
    tick(ctx, ctx.cx, ctx.cy - 90, `${TREACHERY_DELAY_MS / 1000}s CHANNEL`, SUB.ashDark);
  });
  ctx.at(500 + TREACHERY_DELAY_MS, () => {
    resolve(500 + TREACHERY_DELAY_MS, ctx.w * 0.5);
    if (opts.retainer) retainerUntil = 500 + TREACHERY_DELAY_MS + RETAINER_MS;
  });
  if (opts.retainer) {
    ctx.at(4400, () => {
      pressRetainer?.();
      money -= RETAINER_COST;
      tick(ctx, ctx.cx, ctx.cy - 90, `💵 −${RETAINER_COST} · RECAST · NO CHANNEL`, SUB.gold);
      resolve(4400, ctx.w * 0.62);
    });
  }

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.retainer ? `${RETAINER_MS / 1000}s on the bar above the Q card to run the exact same theft again for ${RETAINER_COST}💵, with no second channel`
      : 'their ultimate, reinterpreted — Sound becomes a disco ball, Metal becomes 50 shield, Growth becomes two free Thugs',
    SUB.ash);
}

export const treachery: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Q — two seconds of black fog, then you cast their ultimate through a crooked lens',
  run(ctx) { treacheryLoop(ctx, { retainer: false }); },
};

export const treacheryUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'On Retainer — the contract stays open for 8s as a money bar: 2 money, and no channel',
  run(ctx) { treacheryLoop(ctx, { retainer: true }); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const dirtyMoney: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Two at the start, one more every five seconds, three at a time — and everything is bought',
  run(ctx) {
    const s = stageIt(ctx);
    let money = MONEY_START;
    let accum = 0;
    wallet(ctx, s.at, () => money);
    const clock = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 12, '', {
      fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(SUB.gold),
    }).setOrigin(0.5).setDepth(19));

    // Income at the real rate, and what it is spent on as it arrives. A full wallet stops the
    // clock dead — that note is not late, it is never coming.
    ctx.onFrame((dt) => {
      if (money >= MONEY_MAX) {
        accum = 0;
        clock.setText('wallet full — the clock is not running');
        return;
      }
      accum += dt;
      if (accum >= MONEY_TICK_MS) {
        accum -= MONEY_TICK_MS;
        money++;
        s.fx.cash(ctx.cx, ctx.cy - 40, 2, { depth: D_AIR, gravity: -60, seal: SUB.crimson });
        tick(ctx, ctx.cx, ctx.cy - 74, '💵 +1', SUB.gold);
      }
      clock.setText(`next note in ${((MONEY_TICK_MS - accum) / 1000).toFixed(1)}s`);
    });

    const buys: Array<{ at: number; cost: number; what: string }> = [
      { at: 1200, cost: THUG_COST, what: 'THUG' },
      { at: 2600, cost: 1, what: `RELOAD · ${BULLETS_RELOAD} ROUNDS` },
      { at: 5200, cost: SPECIALIST_COST, what: 'SNIPER' },
      { at: 7200, cost: 1, what: 'BRIBE' },
    ];
    for (const b of buys) {
      ctx.at(b.at, () => {
        if (money < b.cost) {
          tick(ctx, ctx.cx, ctx.cy - 74, `💵 NOT ENOUGH FOR ${b.what}`, SUB.ashDark);
          return;
        }
        money -= b.cost;
        s.fx.cash(ctx.cx, ctx.cy - 26, b.cost * 3, { depth: D_AIR, seal: SUB.crimson });
        tick(ctx, ctx.cx, ctx.cy - 74, `💵 −${b.cost} · ${b.what}`, SUB.gold);
      });
    }

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `reloads, recruits, bribes, money bars and recasts all compete for the same ${MONEY_MAX} notes`, SUB.ash);
  },
};

export const kickbacks: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Three rounds for every ten damage your own two weapons deal — the daggers feed the gun',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.76, y: ctx.h * 0.5 };
    dummy(ctx, foe);
    const gun: Gun = { bullets: 4, carry: 0 };
    magazine(ctx, s.at, () => gun.bullets);

    const pay = (dmg: number, color: number, show = true): void => {
      const gained = kickback(gun, dmg);
      if (show) tick(ctx, foe.x + (Math.random() - 0.5) * 20, foe.y - 14, `${dmg}`, color);
      if (gained > 0) tick(ctx, ctx.cx, ctx.cy - 74, `+${gained} 🔫`, SUB.brass);
    };

    // A dagger out and back, then the rounds it bought being spent.
    ctx.at(500, () => s.av.play('punch', Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx)));
    ctx.at(900, () => {
      s.fx.cut(foe.x, foe.y, 0, 30, { color: SUB.scarlet, scores: 2, depth: D_AIR });
      pay(DAGGER_THROW_DMG, SUB.scarlet);
    });
    ctx.at(1600, () => s.av.play('clap'));
    ctx.at(1750, () => {
      s.fx.cut(foe.x, foe.y, Math.PI, 42, { color: SUB.steelHi, scores: 3, depth: D_AIR });
      pay(DAGGER_RETURN_DMG, SUB.steelHi);
    });

    const dagger = ctx.adopt(ctx.scene.add.graphics().setDepth(D_AIR));
    const beyond: Mark = { x: foe.x + (foe.x - ctx.cx) * 0.2, y: foe.y + (foe.y - ctx.cy) * 0.2 };
    ctx.onFrame((_dt, elapsed) => {
      dagger.clear();
      if (elapsed < 500 || elapsed > 2100) return;
      const out = elapsed < 1600;
      const k = out ? Math.min(1, (elapsed - 500) / 480) : 1 - (elapsed - 1600) / 500;
      stiletto(dagger, ctx.tint, ctx.cx + (beyond.x - ctx.cx) * k, ctx.cy + (beyond.y - ctx.cy) * k,
        Math.atan2(beyond.y - ctx.cy, beyond.x - ctx.cx) + (out ? 0 : Math.PI), 18, SUB.scarlet, 1);
    });

    let nextShot = 0;
    let shots = 0;
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 2800 || elapsed < nextShot || gun.bullets <= 0) return;
      nextShot = elapsed + SPRAY_INTERVAL_MS;
      gun.bullets--;
      shots++;
      const a = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx) + (Math.random() - 0.5) * SPRAY_CONE_HALF * 2;
      const ex = ctx.cx + Math.cos(a) * SPRAY_RANGE;
      const ey = ctx.cy + Math.sin(a) * SPRAY_RANGE;
      s.fx.tracer(ctx.cx, ctx.cy, ex, ey, { color: SUB.brass, depth: D_AIR, duration: 90, width: 1.4 });
      if (segDist(foe.x, foe.y, ctx.cx, ctx.cy, ex, ey) <= 24) pay(SPRAY_DMG, SUB.brass, shots % 2 === 0);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${DAGGER_THROW_DMG} out and ${DAGGER_RETURN_DMG} back is 26 damage: ${AMMO_PER_10_DMG * 2} rounds, and 6 carried toward the next ${AMMO_PER_10_DMG} · a recruit's damage pays nothing at all`,
      SUB.ash);
  },
};

// ── Perk — Sonic Boom ─────────────────────────────────────────────────

export const perkSonicBoom: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Recalled blades outrun their own noise — the boom lands where the blade was standing',
  run(ctx) { daggerLoop(ctx, { five: false, boom: true }); },
};

// ── Mastery ───────────────────────────────────────────────────────────

export const masteryBigPockets: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'A fourth note — two 2-money purchases out of one wallet, and the only way to afford the tank',
  run(ctx) {
    const s = stageIt(ctx);
    let money = MONEY_MAX_MASTERY;
    wallet(ctx, s.at, () => money, { max: MONEY_MAX_MASTERY });
    label(ctx, ctx.cx, ctx.cy + 34, `${MONEY_MAX} → ${MONEY_MAX_MASTERY}`, SUB.gold);

    ctx.at(900, () => {
      money -= SPECIALIST_COST;
      s.fx.cash(ctx.cx, ctx.cy - 26, 6, { depth: D_AIR, seal: SUB.crimson });
      tick(ctx, ctx.cx, ctx.cy - 74, `💵 −${SPECIALIST_COST} · SNIPER`, SUB.gold);
    });
    ctx.at(2200, () => {
      money -= LUX_COST;
      s.fx.cash(ctx.cx, ctx.cy - 26, 6, { depth: D_AIR, seal: SUB.crimson });
      tick(ctx, ctx.cx, ctx.cy - 74, `💵 −${LUX_COST} · AND STILL LUXURY ROUNDS`, SUB.gold);
    });
    // …and the income coming back at the real rate.
    let accum = 0;
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 900 || money >= MONEY_MAX_MASTERY) return;
      accum += dt;
      if (accum < MONEY_TICK_MS) return;
      accum -= MONEY_TICK_MS;
      money = Math.min(MONEY_MAX_MASTERY, money + 1);
      s.fx.cash(ctx.cx, ctx.cy - 40, 2, { depth: D_AIR, gravity: -60, seal: SUB.crimson });
      tick(ctx, ctx.cx, ctx.cy - 74, '💵 +1', SUB.gold);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `income past the cap is lost, so a bigger cap is also five more seconds of grace · a Hijacked tank costs all ${MONEY_MAX_MASTERY}`,
      SUB.ash);
  },
};

/**
 * Hijack, both ends of it: a tap for the car, which is got into, driven through somebody and
 * backed out again — and then a full hold for the tank, which replaces it and is mostly a gun.
 * The ride physics are `SubterfugeRide._drive` in one dimension.
 */
export const masteryHijack: PreviewScript = {
  duration: 12000,
  scale: 0.9,
  caption: 'Hijack — tap for a car and ram with it; hold for the tank and its 35-damage gun. Space gets in and out',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.56, y: ctx.cy };
    dummy(ctx, foe);
    let money = MONEY_MAX_MASTERY;
    wallet(ctx, s.at, () => money, { max: MONEY_MAX_MASTERY });

    interface Ride {
      kind: RideKind; x: number; y: number; heading: number; v: number; hp: number;
      ridden: boolean; turret: number; firedAt: number;
    }
    interface Shell { x: number; y: number; angle: number }
    const st = {
      ride: null as Ride | null,
      throttle: 0,
      backTo: -1,
      ramReadyAt: 0,
      knockUntil: 0,
      chargeFrom: -1,
      shells: [] as Shell[],
    };
    const under = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const over = ctx.adopt(ctx.scene.add.graphics().setDepth(D_AIR));

    const tierAt = (held: number): number => {
      let tier = 1;
      for (let i = 1; i < HIJACK_TIER_MS.length; i++) if (held >= HIJACK_TIER_MS[i]) tier = i + 1;
      return Math.min(tier, money, 4);
    };
    const steal = (tier: number): void => {
      // Left beside him, toward the cursor — which is on the enemy.
      const aim = Math.atan2(foe.y - s.at.y, foe.x - s.at.x);
      const kind = RIDE_BY_TIER[tier - 1];
      const spec = RIDE_SPECS[kind];
      const old = st.ride;
      if (old) s.fx.smoke(old.x, old.y, 6, { speed: 60, size: 8, life: 600, depth: 8 });
      money -= tier;
      const reach = spec.radius + 26;
      const x = Phaser.Math.Clamp(s.at.x + Math.cos(aim) * reach, spec.radius, ctx.w - spec.radius);
      const y = Phaser.Math.Clamp(s.at.y + Math.sin(aim) * reach, spec.radius, ctx.h - spec.radius);
      st.ride = { kind, x, y, heading: aim, v: 0, hp: spec.hp, ridden: false, turret: aim, firedAt: -99999 };
      s.av.play('sweep', aim);
      s.fx.smoke(x, y, 8, { speed: 90, size: 9, life: 620, depth: 8 });
      s.fx.cash(x, y, 3 + spec.tier * 2, { speed: 150, size: 13, life: 700, depth: D_AIR, seal: SUB.gold });
      tick(ctx, s.at.x, s.at.y - 74, `💵 −${tier} · ${kind.toUpperCase()} · ${spec.hp} HP`, SUB.gold);
    };
    const mount = (): void => {
      const r = st.ride;
      if (!r || Phaser.Math.Distance.Between(s.at.x, s.at.y, r.x, r.y) > RIDE_ENTER_RANGE) return;
      r.ridden = true;
    };
    const dismount = (): void => {
      const r = st.ride;
      if (!r || !r.ridden) return;
      r.ridden = false;
      r.v = 0;
      st.throttle = 0;
      // Out of the driver's door, on whichever side has room.
      const reach = RIDE_SIZE[r.kind].wid / 2 + 24;
      let oy = r.y + Math.sin(r.heading + Math.PI / 2) * reach;
      if (oy > ctx.h - 24) oy = r.y - Math.sin(r.heading + Math.PI / 2) * reach;
      s.at.x = r.x + Math.cos(r.heading + Math.PI / 2) * reach;
      s.at.y = oy;
      ctx.moveCaster(s.at.x, s.at.y, { facing: ctx.aim });
    };

    ctx.onFrame((dt, elapsed) => {
      const step = Math.min(dt, 50) / 1000;
      const t = elapsed / 1000;
      under.clear();
      over.clear();
      if (elapsed < st.knockUntil) foe.x += RAM_KNOCK * step;

      const r = st.ride;
      if (r) {
        const spec = RIDE_SPECS[r.kind];
        if (r.ridden) {
          if (st.throttle > 0) r.v += spec.accel * step;
          else if (st.throttle < 0) r.v -= spec.accel * (r.v > 0 ? 1.6 : 0.7) * step;
          r.v -= r.v * (ROLL_DRAG + (st.throttle === 0 ? BRAKE_DRAG : 0)) * step;
          r.v = Phaser.Math.Clamp(r.v, -spec.top * REVERSE_FRAC, spec.top);
          r.x += Math.cos(r.heading) * r.v * step;
          r.y += Math.sin(r.heading) * r.v * step;
          if (st.throttle < 0 && st.backTo >= 0 && r.x <= st.backTo) st.throttle = 0;

          // Driving into someone. Hurts with speed; the tank just hurts.
          const fastEnough = r.kind === 'tank' ? r.v >= 40 : r.v >= RAM_MIN_SPEED;
          if (fastEnough && elapsed >= st.ramReadyAt
            && Phaser.Math.Distance.Between(r.x, r.y, foe.x, foe.y) <= spec.radius + 16) {
            st.ramReadyAt = elapsed + RAM_CD_MS;
            const dmg = r.kind === 'tank' ? RAM_TANK_DMG
              : Math.round(RAM_BASE_DMG + RAM_SPEED_DMG * Math.min(1.2, r.v / RAM_REF_SPEED));
            st.knockUntil = elapsed + RAM_KNOCK_MS;
            s.fx.deal(foe.x, foe.y, 44, { notes: 0, rings: 2, duration: 320, mark: false, color: SUB.steelHi });
            tick(ctx, foe.x, foe.y - 16, `${dmg}`, SUB.steelHi);
            tick(ctx, foe.x, foe.y - 34, `RAMMED AT ${Math.round(r.v)} px/s`, SUB.ash);
            r.v *= 0.7;
            // …and back out of it, at the 45% a ride manages in reverse.
            if (r.kind === 'car') { st.throttle = -1; st.backTo = ctx.cx + 60; }
          }
          s.at.x = r.x;
          s.at.y = r.y;
          ctx.moveCaster(r.x, r.y, { facing: r.heading });
        }
        r.turret = Phaser.Math.Angle.RotateTo(r.turret, Math.atan2(foe.y - r.y, foe.x - r.x), 2.4 * step);
        const look = {
          hpRatio: Phaser.Math.Clamp(r.hp / spec.hp, 0, 1),
          speed: Phaser.Math.Clamp(Math.abs(r.v) / spec.top, 0, 1),
          steer: 0, occupied: r.ridden, turret: r.turret,
          recoil: Phaser.Math.Clamp(1 - (elapsed - r.firedAt) / 320, 0, 1), enemy: false,
        };
        drawRide(under, ctx.tint, r.kind, r.x, r.y, r.heading, t, 1, look);
        drawRideTop(over, ctx.tint, r.kind, r.x, r.y, r.heading, t, 1, look);
        drawRideHp(over, ctx.tint, r.x, r.y + RIDE_SIZE[r.kind].wid / 2 + 14, 44, look.hpRatio, 1);
        // The door is open: a keycap over a parked ride you are close enough to take.
        if (!r.ridden && Phaser.Math.Distance.Between(s.at.x, s.at.y, r.x, r.y) <= RIDE_ENTER_RANGE) {
          drawSpaceHint(over, ctx.tint, r.x, r.y - RIDE_SIZE[r.kind].wid / 2 - 22, t, 1);
        }
      }

      // The tank's shells: they go off on the first body they meet.
      for (let i = st.shells.length - 1; i >= 0; i--) {
        const sh = st.shells[i];
        sh.x += Math.cos(sh.angle) * SHELL_SPEED * step;
        sh.y += Math.sin(sh.angle) * SHELL_SPEED * step;
        if (Phaser.Math.Distance.Between(sh.x, sh.y, foe.x, foe.y) > 22 && sh.x < ctx.w) {
          drawShell(over, ctx.tint, sh.x, sh.y, sh.angle, t, 1);
          continue;
        }
        st.shells.splice(i, 1);
        s.fx.flash(sh.x, sh.y, 40, 12, SUB.flame);
        s.fx.deal(sh.x, sh.y, SHELL_RADIUS, { notes: 0, rings: 3, duration: 560, color: SUB.ember });
        s.fx.smoke(sh.x, sh.y, 10, { speed: 140, size: 10, life: 900, depth: D_AIR, color: SUB.ashDark });
        s.fx.scorch(sh.x, sh.y, 40);
        tick(ctx, foe.x, foe.y - 16, `${SHELL_DMG}`, SUB.flame);
      }

      // Mid-charge: which ride the hold has reached, and which the wallet can reach.
      if (st.chargeFrom < 0) return;
      const held = elapsed - st.chargeFrom;
      const tier = tierAt(held);
      const frac = tier >= 4 || tier >= money ? 1
        : Phaser.Math.Clamp((held - HIJACK_TIER_MS[tier - 1])
          / Math.max(1, HIJACK_TIER_MS[tier] - HIJACK_TIER_MS[tier - 1]), 0, 1);
      drawHijackCharge(over, ctx.tint, s.at.x, s.at.y - 74, tier, Math.min(4, money), frac, t, 1);
    });

    const fire = (at: number): void => {
      ctx.at(at, () => {
        const r = st.ride;
        if (!r || r.kind !== 'tank' || !r.ridden) return;
        const angle = Math.atan2(foe.y - r.y, foe.x - r.x);
        r.turret = angle;
        r.firedAt = at;
        const mx = r.x + Math.cos(angle) * 58;
        const my = r.y + Math.sin(angle) * 58;
        st.shells.push({ x: mx, y: my, angle });
        s.fx.flash(mx, my, 22, 12, SUB.flame);
        s.fx.smoke(mx, my, 6, { angle, spread: 0.5, speed: 150, size: 8, life: 560, depth: 12 });
        r.v -= 60;
      });
    };

    // ── The car: a tap ──
    ctx.at(400, () => steal(1));
    ctx.at(1100, () => { mount(); st.throttle = 1; });
    ctx.at(4450, () => dismount());
    // ── Fifteen seconds and a full wallet later: the tank, on a full hold ──
    ctx.at(4700, () => {
      money = MONEY_MAX_MASTERY;
      tick(ctx, s.at.x, s.at.y - 74, `· ${HIJACK_COOLDOWN_MS / 1000}s COOLDOWN LATER ·`, SUB.ashDark);
    });
    ctx.at(5200, () => { st.chargeFrom = 5200; });
    ctx.at(5200 + HIJACK_TIER_MS[3] + 150, () => {
      const tier = tierAt(HIJACK_TIER_MS[3] + 150);
      st.chargeFrom = -1;
      steal(tier);
    });
    // The tank's reach puts its door a step outside Space range, so he takes the step.
    ctx.at(7000, () => {
      const r = st.ride;
      if (!r) return;
      const to = { x: s.at.x + (r.x - s.at.x) * 0.3, y: s.at.y + (r.y - s.at.y) * 0.3 };
      ctx.glideCaster({ to, ms: 220, ease: 'out', onDone: () => { s.at.x = to.x; s.at.y = to.y; } });
    });
    ctx.at(7400, () => { mount(); st.throttle = 1; });
    fire(7800);
    ctx.at(8600, () => { st.throttle = 0; });
    // While you drive, what was meant for you lands on the bodywork.
    ctx.at(9100, () => {
      const r = st.ride;
      if (!r || !r.ridden) return;
      r.hp -= 18;
      s.fx.tracer(foe.x, foe.y, r.x, r.y, { color: SUB.haze, depth: D_AIR, duration: 160, width: 2 });
      tick(ctx, r.x, r.y - 46, `−18 · ${r.hp}/${RIDE_SPECS[r.kind].hp} HP — NOT YOURS`, SUB.steelHi);
    });
    fire(7800 + SHELL_RELOAD_MS);

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `1💵 car ${RIDE_SPECS.car.hp} HP · 2💵 motorcycle ${RIDE_SPECS.bike.hp} · 3💵 sports car ${RIDE_SPECS.sports.hp} · 4💵 tank ${RIDE_SPECS.tank.hp}, firing ${SHELL_DMG} every ${SHELL_RELOAD_MS / 1000}s · hits land on the ride`,
      SUB.ash);
  },
};

/**
 * Smoke Break left the mastery list when Hijack took the bindable slot, and its showcase went
 * with it. This alias exists only because `previews/index.ts` still registers
 * `'subterfuge:mastery:smoke-break'` against this name; once that line is renamed to
 * `'subterfuge:mastery:hijack': subterfuge.masteryHijack`, delete it.
 */
