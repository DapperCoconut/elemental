import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  BND, BindAvatar, BindFx, SoulKind, boundPlaque, chainDagger, chainRun, chainShard, cosmicVeil,
  cultistFigure, darkMark, faithRing, favourBeads, hexWard, idolStatue, lostSoul, oblivionShard,
  patronEye, revenant, ritualRunes, shackle, siphonStream, soulColor, soulCore, tithePlaque,
} from '../../../elements/kits/BindVisuals';

/**
 * Bind's showcases.
 *
 * Bind puts no sprite in the world: daggers, chains, souls, revenants, cultists, the idol and the
 * god are all Graphics repainted per frame out of `BindVisuals`. So every loop here runs one small
 * copy of the kit's own simulation — `world()` below, a cut-down `BindKit` with the same constants,
 * the same stalk / wind-up / dash revenant, the same siphon integrator and the same god routine —
 * and hands its state to the kit's own painters. A script only stages: where the souls are, when
 * a key is pressed, where the caster walks.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `BindFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const TAU = Math.PI * 2;

const CURSE_MAX = 0.25;
const CURSE_SIPHON_RATE = 0.03;
const SOUL_DRIFT = 34;
const SOUL_DRAIN_S = 6;

const DAGGER_SPEED = 640;
const DAGGER_DAMAGE = 11;
const DAGGER_HIT_PAD = 5;
const DAGGER_STICK_MS = 5000;
const DAGGER_STUCK_MAX = 6;
const STUCK_SPRAY_MS = 1500;
const STUCK_SPRAY_COUNT = 3;
const STUCK_SPRAY_RANGE = 540;
const FRAG_DAMAGE = 5;
const FRAG_SPRAY_DAMAGE = 4;
const FRAG_SPEED = 820;
const FRAG_LIFE_MS = 420;
const DETONATE_FRAGS = 7;
const DETONATE_CONE = 0.34;
const CULT_DAGGER_DAMAGE = 7;

const INSPIRIT_R = 18;
const INSPIRIT_STEP = 0.3;
const CORE_R = 9;
const CORE_STEP = 0.5;

const TETHER_LEN = 150;
const TETHER_MS = 5000;
const HATRED_HOLD_MS = 5000;
const HATRED_DMG_MULT = 1.6;

const EYES_MS = 8000;
const SOUL_HITBOX = 0.35;

const KIND_HEAL_PS = 4;
const SAD_SPEED_PS = 0.05;
const SAD_SPEED_MAX = 0.3;

const SIPHON_BREAK = 420;
const SIPHON_GAIN_PS = 0.1;
const SIPHON_GAIN_MAX = 0.5;
const ANGRY_GAIN_PS = 0.16;
const ANGRY_GAIN_MAX = 0.8;
const SIPHON_LINGER_MS = 3000;

const REV_MAX = 3;
const REV_KEEP = 170;
const REV_SPEED = 150;
const REV_CHARGE_EVERY = 3200;
const REV_CHARGE_MS = 900;
const REV_DASH_SPEED = 720;
const REV_OVERSHOOT = 90;
const REV_HIT_R = 26;
const REV_SELF_DAMAGE = 12;
const REV_FOE_DAMAGE = 30;

const FURY_S = 4;
const CULT_MAX = 3;
const CULT_FAITH_MS = 12_000;
const CULT_FEED_MS = 6000;
const CULT_FAITH_CAP_MS = 18_000;
const CULT_THROW_MS = 1100;
const CULT_THROW_RANGE = 480;
const CULT_BIND_MS = 4500;
const CULT_BIND_RANGE = 200;
const CULT_TETHER_MS = 2000;
const CULT_TETHER_LEN = 140;
const CULT_SPEED = 120;

const GOD_SHORT_MS = 5000;
const GOD_MID_MS = 8000;
const GOD_LONG_MS = 12_000;
const LIFT_LONG_MS = 15_000;
const WRATHFUL_MS_PER = 3000;
const WARD_CHARGES = 3;
const GOD_VOLLEY_MS = 1200;
const GOD_VOLLEY_SHARDS = 7;
const GOD_SHARD_DAMAGE = 10;
const GOD_SHARD_SPREAD = 68;
const GOD_SHARD_SPEED = 720;
const GOD_SHARD_BLAST_R = 34;
const GOD_SWIPE_MS = 2100;
const GOD_SWIPE_DAMAGE = 24;
const GOD_SWIPE_R = 96;
const GOD_LASER_MS = 620;
const GOD_LASER_DAMAGE = 8;
const GOD_LASER_HIT_R = 20;
const GOD_BLAST_MS = 3000;
const GOD_BLAST_TELL_MS = 900;
const GOD_BLAST_R = 122;
const GOD_BLAST_DAMAGE = 38;
const SACRIFICE_GRACE_MS = 800;

const IDOL_R = 110;
const IDOL_FAVOUR_S = 8;
const IDOL_FADE_S = 12;
const IDOL_PATIENCE_MS = 4000;
const IDOL_ZAP_MS = 1200;
const IDOL_ZAP_DAMAGE = 8;
const IDOL_SOUL_S = 15;
const IDOL_DMG = 0.35;
const IDOL_SPEED = 0.2;
const IDOL_ARMOUR = 0.25;

/** The stand-in's body radius, for every hit test below. */
const BODY_R = 17;
/** The caster's own body, before Blackened Eyes shrinks it. */
const CASTER_R = 20;

type CurseId = 'shackled' | 'brittle' | 'feeble' | 'sluggish';
const CURSES: Record<CurseId, { name: string; emoji: string; what: string }> = {
  shackled: { name: 'Shackled', emoji: '⛓️', what: 'slower movement' },
  brittle: { name: 'Brittle', emoji: '💔', what: 'more damage taken' },
  feeble: { name: 'Feeble', emoji: '🥀', what: 'less damage dealt' },
  sluggish: { name: 'Sluggish', emoji: '⏳', what: 'longer cooldowns' },
};

// ── State records, the kit's own shapes ───────────────────────────────

interface P { x: number; y: number }
interface Foe extends P { alpha: number; vx: number; vy: number }
interface Soul extends P {
  heading: number; kind: SoulKind; essence: number; bound: boolean; onIdol: boolean;
  pinned: boolean; seed: number; dead: boolean;
}
interface Rev extends P {
  ang: number; state: 'stalk' | 'charge' | 'held' | 'dash'; until: number; nextAt: number;
  dash: { x0: number; y0: number; tx: number; ty: number; hit: object[] } | null;
  fury: number; empowered: boolean; auto: boolean; seed: number;
}
interface Dagger extends P {
  ang: number; stuckUntil: number; nextSprayAt: number; stacks: number; passed: Set<Soul>;
  cult: boolean; seed: number;
}
interface Frag extends P { ang: number; damage: number; dieAt: number; soul: boolean }
interface Tether { anchor: P | null; victim: Foe; until: number; len: number; main: boolean }
interface Cultist extends P { until: number; nextThrowAt: number; nextBindAt: number; seed: number }
interface Shard extends P { tx: number; ty: number; ang: number; liveAt: number; turned: boolean }
interface BlastMark extends P { landsAt: number; turned: boolean }
interface Spray { x0: number; y0: number; x1: number; y1: number; until: number; turned: boolean }
interface Idol extends P { favour: number; lastHeldAt: number; nextZapAt: number }

interface WorldOpts {
  mastered?: boolean;
  /** Choice Souls (R+): show and pay out the three tempers. */
  kinds?: boolean;
  /** Inspirit (Click+). */
  inspirit?: boolean;
  /** Bound: the curse this loop carries, printed on the plaque. */
  curse?: CurseId;
  /** Permanent Bond (mastery): the foe carries what you lose, and gets its own plaque. */
  bond?: boolean;
  /** Where the curse plaque hangs. Top centre by default. */
  plaqueAt?: P;
  /** How faintly an unseen wild soul is hinted. 0 — the truth — unless a loop is explaining them. */
  ghostAlpha?: number;
}

interface World {
  fx: BindFx;
  av: BaseAvatar;
  now: number;
  foes: Foe[];
  souls: Soul[];
  revs: Rev[];
  cultists: Cultist[];
  tethers: Tether[];
  eyesUntil: number;
  curse: { id: CurseId; strength: number; liftedUntil: number } | null;
  siphon: { soul: Soul | null; rev: Rev | null; gain: number; speed: number; lingerUntil: number; heal: number };
  idol: Idol | null;
  eye: P;
  me(): P;
  pop(x: number, y: number, text: string, color: number, size?: number): void;
  addFoe(x: number, y: number): Foe;
  addSoul(x: number, y: number, o?: Partial<Pick<Soul, 'kind' | 'essence' | 'bound' | 'pinned'>>): Soul;
  spawnRev(x: number, y: number, o?: { auto?: boolean; nextIn?: number; quiet?: boolean }): Rev;
  throwDagger(tx: number, ty: number): void;
  detonate(): void;
  chainFoe(f: Foe): void;
  anchor(): void;
  bindSoul(so: Soul): void;
  holdRev(r: Rev): void;
  feedIdol(): void;
  openEyes(): void;
  startSiphon(src: Soul | Rev): void;
  stopSiphon(): void;
  ritual(withRevs: boolean): number;
  plantIdol(x: number, y: number): void;
  inIdol(): boolean;
}

// ── Little helpers ────────────────────────────────────────────────────

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

const FONT = '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif';

function dist(a: P, b: P): number { return Math.hypot(b.x - a.x, b.y - a.y); }

function segDist(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L = dx * dx + dy * dy;
  const k = L > 0 ? Phaser.Math.Clamp(((px - x0) * dx + (py - y0) * dy) / L, 0, 1) : 0;
  return Math.hypot(px - (x0 + dx * k), py - (y0 + dy * k));
}

/** A rising, fading number — the arena's floating text, in the box. */
function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: FONT, fontStyle: 'bold',
    color: hex(color), stroke: '#0b0518', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(21));
  let age = 0;
  ctx.onFrame((dt) => {
    age += dt;
    t.setY(y - (age / 900) * 22);
    t.setAlpha(Phaser.Math.Clamp(1.25 - age / 900, 0, 1));
  });
}

/** One line of narration along the bottom of the box. */
function readout(ctx: PreviewCtx): (text: string, color?: number) => void {
  const t = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, ctx.h - 9, '', {
    fontSize: '10px', fontFamily: FONT, color: hex(BND.goldLit), stroke: '#0b0518', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(22));
  return (text, color = BND.goldLit) => { t.setText(text); t.setColor(hex(color)); };
}

/** A live line of text the script rewrites every frame. */
function live(ctx: PreviewCtx, x: number, y: number, read: () => { text: string; color: number }): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: '10px', fontFamily: FONT, fontStyle: 'bold', color: hex(BND.goldLit),
    stroke: '#0b0518', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(22));
  ctx.onFrame(() => {
    const r = read();
    t.setText(r.text);
    t.setColor(hex(r.color));
  });
}

// ── The world ─────────────────────────────────────────────────────────

/**
 * One Bind arena in a box. Everything the kit simulates for its owner, simulated the same way,
 * and painted every frame by the kit's painters in the kit's layer order.
 */
function world(ctx: PreviewCtx, o: WorldOpts = {}): World {
  const fx = ctx.capture(() => new BindFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new BindAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  if (o.mastered) av.setMastered(true);

  const L = 6;
  const R = ctx.w - 6;
  const T = 6;
  const B = ctx.h - 6;
  const daggers: Dagger[] = [];
  const frags: Frag[] = [];
  const shards: Shard[] = [];
  const marks: BlastMark[] = [];
  const sprays: Spray[] = [];
  const throws: { x: number; y: number; until: number }[] = [];
  const god = { until: 0, ms: 0, wrathMs: 0, wrathUntil: 0, nv: 0, ns: 0, nl: 0, nb: 0 };
  let runes: { x: number; y: number; from: number; until: number } | null = null;
  let ward = 0;
  let eyesFrom = -1;
  let nextId = 0;

  const W: World = {
    fx, av,
    now: 0,
    foes: [], souls: [], revs: [], cultists: [], tethers: [],
    eyesUntil: 0,
    curse: o.curse ? { id: o.curse, strength: 1, liftedUntil: 0 } : null,
    siphon: { soul: null, rev: null, gain: 0, speed: 0, lingerUntil: 0, heal: 0 },
    idol: null,
    eye: { x: ctx.w * 0.5, y: 24 },
    me: () => ctx.casterAt(),
    pop: (x, y, text, color, size) => tick(ctx, x, y, text, color, size),

    addFoe(x, y) {
      const f: Foe = { x, y, alpha: 1, vx: 0, vy: 0 };
      W.foes.push(f);
      return f;
    },

    addSoul(x, y, s = {}) {
      const so: Soul = {
        x, y, heading: Math.random() * TAU, kind: s.kind ?? 'plain', essence: s.essence ?? 1,
        bound: s.bound ?? false, onIdol: false, pinned: s.pinned ?? false,
        seed: (nextId++) * 13.7 + Math.random() * 9, dead: false,
      };
      W.souls.push(so);
      return so;
    },

    spawnRev(x, y, s = {}) {
      const r: Rev = {
        x, y, ang: 0, state: 'stalk', until: 0, nextAt: W.now + (s.nextIn ?? REV_CHARGE_EVERY),
        dash: null, fury: 0, empowered: false, auto: s.auto ?? true, seed: (nextId++) * 7.3,
      };
      W.revs.push(r);
      fx.revenantRise(x, y);
      if (!s.quiet) W.pop(x, y - 36, 'A REVENANT RISES', BND.rune, 11);
      return r;
    },

    throwDagger(tx, ty) {
      const me = W.me();
      const ang = Math.atan2(ty - me.y, tx - me.x);
      daggers.push({
        x: me.x + Math.cos(ang) * 18, y: me.y + Math.sin(ang) * 18, ang, stuckUntil: 0, nextSprayAt: 0,
        stacks: 0, passed: new Set(), cult: false, seed: Math.random() * 999,
      });
      av.setFacing(ang);
      av.play('punch', ang, 160);
    },

    detonate() {
      const mine = daggers.filter((d) => !d.cult);
      for (const d of mine) {
        let ang = d.ang;
        if (d.stuckUntil) {
          const t = nearestFoe(d, STUCK_SPRAY_RANGE);
          ang = t ? Math.atan2(t.y - d.y, t.x - d.x) : d.ang + Math.PI;
        }
        const bonus = 1 + d.stacks * INSPIRIT_STEP * 0.5;
        for (let i = 0; i < DETONATE_FRAGS; i++) {
          const u = i / (DETONATE_FRAGS - 1) - 0.5;
          frags.push({
            x: d.x, y: d.y, ang: ang + u * 2 * DETONATE_CONE + (Math.random() - 0.5) * 0.08,
            damage: FRAG_DAMAGE * bonus, dieAt: W.now + FRAG_LIFE_MS * (0.85 + Math.random() * 0.3),
            soul: d.stacks > 0,
          });
        }
        fx.daggerBurst(d.x, d.y, ang);
        daggers.splice(daggers.indexOf(d), 1);
      }
    },

    chainFoe(f) {
      const me = W.me();
      W.tethers = W.tethers.filter((t) => !t.main);
      W.tethers.push({ anchor: null, victim: f, until: W.now + TETHER_MS, len: TETHER_LEN, main: true });
      av.play('punch', Math.atan2(f.y - me.y, f.x - me.x), 220);
      W.pop(f.x, f.y - 40, 'BOUND', BND.chainLit, 12);
    },

    anchor() {
      const main = W.tethers.find((t) => t.main && !t.anchor);
      if (!main) return;
      const me = W.me();
      main.anchor = { x: me.x, y: me.y };
      W.pop(me.x, me.y - 44, 'ANCHORED', BND.chainLit, 11);
    },

    bindSoul(so) {
      const me = W.me();
      so.bound = true;
      so.pinned = false;
      throws.push({ x: so.x, y: so.y, until: W.now + 220 });
      av.play('punch', Math.atan2(so.y - me.y, so.x - me.x), 220);
      fx.soulBound(so.x, so.y, soulColor(o.kinds ? so.kind : 'plain'));
      W.pop(so.x, so.y - 24, 'SOUL BOUND', soulColor(o.kinds ? so.kind : 'plain'), 11);
    },

    holdRev(r) {
      const me = W.me();
      r.state = 'held';
      r.until = W.now + HATRED_HOLD_MS;
      r.empowered = true;
      r.dash = null;
      throws.push({ x: r.x, y: r.y, until: W.now + 260 });
      av.play('punch', Math.atan2(r.y - me.y, r.x - me.x), 220);
      W.pop(r.x, r.y - 34, 'HATRED BOUND', BND.rune, 11);
    },

    feedIdol() {
      const idol = W.idol;
      const so = W.souls.filter((s) => s.bound && !s.onIdol).pop();
      if (!idol || !so) return;
      so.onIdol = true;
      throws.push({ x: idol.x, y: idol.y, until: W.now + 240 });
      fx.soulBound(idol.x, idol.y, soulColor(so.kind));
      W.pop(idol.x, idol.y - 56, 'A SOUL STANDS IN', BND.soul, 11);
    },

    openEyes() {
      const me = W.me();
      W.eyesUntil = W.now + EYES_MS;
      eyesFrom = W.now;
      fx.eyesOpen(me.x, me.y);
      av.play('flex');
      W.pop(me.x, me.y - 52, 'BLACKENED EYES', BND.soul, 12);
    },

    startSiphon(src) {
      const me = W.me();
      const isSoul = 'essence' in src;
      W.siphon.soul = isSoul ? (src as Soul) : null;
      W.siphon.rev = isSoul ? null : (src as Rev);
      W.siphon.lingerUntil = 0;
      av.setHold('draw', Math.atan2(src.y - me.y, src.x - me.x));
      W.pop(me.x, me.y - 48, 'SIPHON', isSoul ? soulColor(o.kinds ? (src as Soul).kind : 'plain') : BND.rune, 11);
    },

    stopSiphon() {
      const sp = W.siphon;
      if (!sp.soul && !sp.rev) return;
      sp.soul = null;
      sp.rev = null;
      sp.lingerUntil = W.now + SIPHON_LINGER_MS;
      av.setHold(null);
      const me = W.me();
      if (sp.gain > 0.05) W.pop(me.x, me.y - 48, `+${Math.round(sp.gain * 100)}% DAMAGE`, BND.goldLit, 11);
    },

    ritual(withRevs) {
      const me = W.me();
      const souls = W.souls.filter((s) => s.bound && !s.onIdol);
      const revs = withRevs ? [...W.revs] : [];
      const n = souls.length + revs.length;
      if (!n) return 0;
      if (W.siphon.soul || W.siphon.rev) W.stopSiphon();
      for (const so of souls) {
        fx.soulOffered(so.x, so.y, me.x, me.y, soulColor(o.kinds ? so.kind : 'plain'));
        so.dead = true;
      }
      for (const r of revs) {
        fx.soulOffered(r.x, r.y, me.x, me.y, BND.rune);
        W.revs.splice(W.revs.indexOf(r), 1);
      }
      const ms = n <= 2 ? GOD_SHORT_MS : n <= 4 ? GOD_MID_MS : GOD_LONG_MS;
      god.until = W.now + ms;
      god.ms = ms;
      god.wrathMs = revs.length * WRATHFUL_MS_PER;
      god.wrathUntil = 0;
      god.nv = W.now + 400;
      god.ns = W.now + 900;
      god.nl = W.now + 300;
      god.nb = W.now + 1400;
      runes = { x: me.x, y: me.y + 6, from: W.now, until: W.now + ms };
      fx.ritualDrive(me.x, me.y, 70);
      fx.wrath(W.eye.x, W.eye.y);
      av.play('slam', Math.PI / 2, 360);
      W.pop(me.x, me.y - 64, `THE GOD ANSWERS · ${n} SOUL${n === 1 ? '' : 'S'}`, BND.runeLit, 12);
      if (n >= 3 && W.curse) {
        W.curse.liftedUntil = W.now + (n >= 5 ? LIFT_LONG_MS : ms);
        W.pop(me.x, me.y - 48, 'UNBOUND', BND.goldLit, 11);
      }
      if (n >= 5) ward = WARD_CHARGES;
      return n;
    },

    plantIdol(x, y) {
      for (const so of W.souls) if (so.onIdol) so.onIdol = false;
      W.idol = { x, y, favour: 0, lastHeldAt: W.now, nextZapAt: 0 };
      fx.cultistRise(x, y);
      av.play('raise');
      W.pop(x, y - 54, 'FALSE IDOL', BND.goldLit, 12);
    },

    inIdol() {
      const idol = W.idol;
      return !!idol && dist(W.me(), { x: idol.x, y: idol.y + 18 }) <= IDOL_R;
    },
  };

  function nearestFoe(at: P, range = Infinity): Foe | null {
    let best: Foe | null = null;
    let bd = range;
    for (const f of W.foes) {
      if (f.alpha < 0.5) continue;
      const d = dist(at, f);
      if (d <= bd) { bd = d; best = f; }
    }
    return best;
  }

  function hitFoe(f: Foe, dmg: number, color: number, dy = 0): void {
    W.pop(f.x + (Math.random() - 0.5) * 18, f.y - 22 + dy, `${Math.round(dmg)}`, color);
  }

  function hurtMe(dmg: number): void {
    const me = W.me();
    if (ward > 0) {
      ward--;
      fx.wardBlock(me.x, me.y);
      W.pop(me.x, me.y - 30, 'WARDED', BND.goldLit, 10);
      return;
    }
    W.pop(me.x + (Math.random() - 0.5) * 14, me.y - 28, `−${Math.round(dmg)}`, BND.wrath);
  }

  function clampIn(p: P, pad: number): void {
    p.x = Phaser.Math.Clamp(p.x, L + pad, R - pad);
    p.y = Phaser.Math.Clamp(p.y, T + pad, B - pad);
  }

  function startDash(r: Rev, tx: number, ty: number): void {
    const ang = Math.atan2(ty - r.y, tx - r.x);
    r.state = 'dash';
    r.ang = ang;
    r.dash = {
      x0: r.x, y0: r.y, tx: tx + Math.cos(ang) * REV_OVERSHOOT, ty: ty + Math.sin(ang) * REV_OVERSHOOT, hit: [],
    };
  }

  function runGod(turned: boolean): void {
    const me = W.me();
    const victims: P[] = turned ? [me] : W.foes.filter((f) => f.alpha > 0.5);
    if (!victims.length) return;
    const pick = (): P => victims[Math.floor(Math.random() * victims.length)];
    const hurt = (v: P, dmg: number, color: number): void => {
      if (turned) hurtMe(dmg);
      else hitFoe(v as Foe, dmg, color);
    };
    if (W.now >= god.nv) {
      god.nv = W.now + GOD_VOLLEY_MS;
      const v = pick();
      for (let i = 0; i < GOD_VOLLEY_SHARDS; i++) {
        const a = Math.random() * TAU;
        const d = Math.sqrt(Math.random()) * GOD_SHARD_SPREAD;
        const tx = Phaser.Math.Clamp(v.x + Math.cos(a) * d, L, R);
        const ty = Phaser.Math.Clamp(v.y + Math.sin(a) * d, T, B);
        const ox = W.eye.x + (Math.random() - 0.5) * 150;
        const oy = W.eye.y + 10 + Math.random() * 14;
        shards.push({ x: ox, y: oy, tx, ty, ang: Math.atan2(ty - oy, tx - ox), liveAt: W.now + i * 26, turned });
      }
    }
    if (W.now >= god.ns) {
      god.ns = W.now + GOD_SWIPE_MS;
      const v = pick();
      fx.swipe(v.x, v.y, Math.random() * TAU, GOD_SWIPE_R, turned);
      for (const t of victims) if (dist(v, t) <= GOD_SWIPE_R) hurt(t, GOD_SWIPE_DAMAGE, BND.goldLit);
    }
    if (W.now >= god.nl) {
      god.nl = W.now + GOD_LASER_MS;
      for (let i = 0; i < 3; i++) {
        const v = pick();
        const x1 = Phaser.Math.Clamp(v.x + (i - 1) * 46 + (Math.random() - 0.5) * 40, L, R);
        const y1 = v.y + (Math.random() - 0.5) * 30;
        const x0 = W.eye.x + (i - 1) * 16;
        const y0 = W.eye.y + 12;
        sprays.push({ x0, y0, x1, y1, until: W.now + 180, turned });
        for (const t of victims) if (segDist(t.x, t.y, x0, y0, x1, y1) <= GOD_LASER_HIT_R) hurt(t, GOD_LASER_DAMAGE, BND.gold);
      }
    }
    if (W.now >= god.nb) {
      god.nb = W.now + GOD_BLAST_MS;
      const v = pick();
      marks.push({
        x: Phaser.Math.Clamp(v.x + (Math.random() - 0.5) * 90, L + 30, R - 30),
        y: Phaser.Math.Clamp(v.y + (Math.random() - 0.5) * 60, T + 30, B - 20),
        landsAt: W.now + GOD_BLAST_TELL_MS, turned,
      });
    }
  }

  // ── Step ──
  const step = (dt: number): void => {
    const s = dt / 1000;
    W.now += dt;
    const t = W.now / 1000;
    const me = W.me();

    for (const f of W.foes) {
      if (!f.vx && !f.vy) continue;
      f.x += f.vx * s;
      f.y += f.vy * s;
      clampIn(f, 20);
    }

    // Souls: drifting wild, trailing the caster on the chain, or standing in at the idol.
    const ringN = Math.max(1, W.souls.filter((so) => so.bound && !so.onIdol && !so.dead).length);
    let ringI = 0;
    for (const so of W.souls) {
      if (so.dead) continue;
      const px = so.x;
      const py = so.y;
      if (so.onIdol && W.idol) {
        const p = t * 0.8 + so.seed;
        so.x += (W.idol.x + Math.cos(p) * 30 - so.x) * Math.min(1, s * 3);
        so.y += (W.idol.y + 18 + Math.sin(p) * 12 - so.y) * Math.min(1, s * 3);
        so.essence -= s / IDOL_SOUL_S;
        if (so.essence <= 0) { fx.soulPop(so.x, so.y, soulColor(so.kind)); so.dead = true; }
      } else if (so.bound) {
        const p = (ringI++ / ringN) * TAU + t * 0.6;
        so.x += (me.x + Math.cos(p) * 38 - so.x) * Math.min(1, s * 4);
        so.y += (me.y + Math.sin(p) * 26 - 6 - so.y) * Math.min(1, s * 4);
      } else if (!so.pinned) {
        so.heading += (Math.sin(t * 0.7 + so.seed) * 0.9 + (Math.random() - 0.5) * 0.6) * s;
        so.x += Math.cos(so.heading) * SOUL_DRIFT * s;
        so.y += Math.sin(so.heading) * SOUL_DRIFT * s;
        if (so.x < L + 30 || so.x > R - 30) so.heading = Math.PI - so.heading;
        if (so.y < T + 30 || so.y > B - 24) so.heading = -so.heading;
        clampIn(so, 24);
      }
      if (Math.abs(so.x - px) + Math.abs(so.y - py) > 0.3) so.heading = Math.atan2(so.y - py, so.x - px);
    }

    // Siphon: the pay builds, the curse wears, the soul empties — and comes back angry.
    const sp = W.siphon;
    const src: (Soul | Rev) | null = sp.soul ?? sp.rev;
    if (src) {
      if ((sp.soul && sp.soul.dead) || (sp.rev && !W.revs.includes(sp.rev)) || dist(me, src) > SIPHON_BREAK) {
        W.stopSiphon();
      } else {
        av.setHold('draw', Math.atan2(src.y - me.y, src.x - me.x));
        const kind: SoulKind = sp.soul ? (o.kinds ? sp.soul.kind : 'plain') : 'angry';
        const angry = kind === 'angry';
        sp.gain = Math.min(angry ? ANGRY_GAIN_MAX : SIPHON_GAIN_MAX, sp.gain + (angry ? ANGRY_GAIN_PS : SIPHON_GAIN_PS) * s);
        if (kind === 'sad') sp.speed = Math.min(SAD_SPEED_MAX, sp.speed + SAD_SPEED_PS * s);
        if (kind === 'kind') {
          sp.heal += KIND_HEAL_PS * s;
          if (sp.heal >= 1) {
            const whole = Math.floor(sp.heal);
            sp.heal -= whole;
            W.pop(me.x + 14, me.y - 26, `+${whole}`, BND.soulKind, 10);
          }
        }
        if (W.curse) W.curse.strength = Math.max(0, W.curse.strength - CURSE_SIPHON_RATE * s);
        if (sp.soul) {
          const so = sp.soul;
          so.essence -= s / SOUL_DRAIN_S;
          if (so.essence <= 0) {
            fx.soulPop(so.x, so.y, soulColor(kind));
            so.dead = true;
            W.stopSiphon();
            if (W.revs.length < REV_MAX) W.spawnRev(so.x, so.y);
          }
        } else if (sp.rev) {
          const r = sp.rev;
          r.fury = Math.min(1, r.fury + s / FURY_S);
          if (r.fury >= 1) {
            W.revs.splice(W.revs.indexOf(r), 1);
            W.stopSiphon();
            if (W.cultists.length < CULT_MAX) {
              W.cultists.push({ x: r.x, y: r.y, until: W.now + CULT_FAITH_MS, nextThrowAt: W.now + 600, nextBindAt: W.now + 1500, seed: Math.random() * 99 });
              fx.cultistRise(r.x, r.y);
              W.pop(r.x, r.y - 44, 'A CULTIST KNEELS', BND.goldLit, 11);
            }
          }
        }
      }
    } else if (sp.lingerUntil && W.now >= sp.lingerUntil) {
      sp.gain = 0;
      sp.speed = 0;
      sp.lingerUntil = 0;
    }
    W.souls = W.souls.filter((so) => !so.dead);

    // Revenants: keep their distance, wind up, run at you.
    for (const r of [...W.revs]) {
      const fury = r.fury;
      if (r.state === 'stalk') {
        const a = Math.atan2(r.y - me.y, r.x - me.x);
        const wob = Math.sin(t * 0.5 + r.seed) * 0.4;
        const w = { x: me.x + Math.cos(a + wob) * REV_KEEP, y: me.y + Math.sin(a + wob) * REV_KEEP };
        clampIn(w, 14);
        const d = dist(r, w);
        if (d > 2) {
          const k = Math.min(d, REV_SPEED * (1 + fury * 0.4) * s) / d;
          r.x += (w.x - r.x) * k;
          r.y += (w.y - r.y) * k;
        }
        r.ang = Math.atan2(me.y - r.y, me.x - r.x);
        if (r.auto && W.now >= r.nextAt) {
          r.state = 'charge';
          r.until = W.now + REV_CHARGE_MS * (1 - fury * 0.4);
        }
      } else if (r.state === 'charge') {
        r.ang = Math.atan2(me.y - r.y, me.x - r.x);
        if (W.now >= r.until) startDash(r, me.x, me.y);
      } else if (r.state === 'held') {
        if (W.now >= r.until) startDash(r, me.x, me.y);
      } else if (r.dash) {
        const dsh = r.dash;
        const x0 = r.x;
        const y0 = r.y;
        const rem = Math.hypot(dsh.tx - r.x, dsh.ty - r.y);
        const stepLen = Math.min(rem, REV_DASH_SPEED * (1 + fury * 0.3) * (r.empowered ? 1.2 : 1) * s);
        if (rem > 0.5) {
          r.x += ((dsh.tx - r.x) / rem) * stepLen;
          r.y += ((dsh.ty - r.y) / rem) * stepLen;
        }
        const mult = (1 + fury) * (r.empowered ? HATRED_DMG_MULT : 1);
        if (!dsh.hit.includes(W) && segDist(me.x, me.y, x0, y0, r.x, r.y) <= REV_HIT_R + CASTER_R * 0.5) {
          dsh.hit.push(W);
          hurtMe(REV_SELF_DAMAGE * mult);
        }
        for (const f of W.foes) {
          if (f.alpha < 0.5 || dsh.hit.includes(f)) continue;
          if (segDist(f.x, f.y, x0, y0, r.x, r.y) > REV_HIT_R + BODY_R * 0.5) continue;
          dsh.hit.push(f);
          hitFoe(f, REV_FOE_DAMAGE * mult, BND.rune);
          W.pop(f.x, f.y - 44, 'RAN THROUGH', BND.rune, 11);
        }
        const out = r.x <= L + 8 || r.x >= R - 8 || r.y <= T + 8 || r.y >= B - 8;
        if (rem <= 1 || out) {
          fx.revenantStreak(dsh.x0, dsh.y0, r.x, r.y);
          clampIn(r, 12);
          r.state = 'stalk';
          r.dash = null;
          r.empowered = false;
          r.nextAt = W.now + REV_CHARGE_EVERY * (1 - fury * 0.5);
        }
      }
    }

    // Cultists (F+): walk up short of the foe, throw, chain, and run out of faith.
    for (let i = W.cultists.length - 1; i >= 0; i--) {
      const c = W.cultists[i];
      if (W.now >= c.until) {
        fx.cultistStab(c.x, c.y);
        W.cultists.splice(i, 1);
        continue;
      }
      const foe = nearestFoe(c);
      if (!foe) continue;
      const a = Math.atan2(foe.y - me.y, foe.x - me.x) + (i - 1) * 0.6;
      const w = { x: foe.x - Math.cos(a) * 170, y: foe.y - Math.sin(a) * 170 };
      const d = dist(c, w);
      if (d > 4) {
        const k = Math.min(d, CULT_SPEED * s) / d;
        c.x += (w.x - c.x) * k;
        c.y += (w.y - c.y) * k;
      }
      clampIn(c, 30);
      const d2 = dist(c, foe);
      if (W.now >= c.nextThrowAt && d2 <= CULT_THROW_RANGE) {
        c.nextThrowAt = W.now + CULT_THROW_MS;
        const ang = Math.atan2(foe.y - c.y, foe.x - c.x) + (Math.random() - 0.5) * 0.12;
        daggers.push({
          x: c.x + Math.cos(ang) * 14, y: c.y - 6 + Math.sin(ang) * 14, ang, stuckUntil: 0, nextSprayAt: 0,
          stacks: 0, passed: new Set(), cult: true, seed: Math.random() * 999,
        });
      }
      if (W.now >= c.nextBindAt && d2 <= CULT_BIND_RANGE) {
        c.nextBindAt = W.now + CULT_BIND_MS;
        W.tethers.push({ anchor: { x: c.x, y: c.y }, victim: foe, until: W.now + CULT_TETHER_MS, len: CULT_TETHER_LEN, main: false });
      }
    }

    // Daggers: fly, pick up souls (Click+), hit, or stick in the wall and spit.
    for (let i = daggers.length - 1; i >= 0; i--) {
      const d = daggers[i];
      if (d.stuckUntil) {
        if (W.now >= d.stuckUntil) { daggers.splice(i, 1); continue; }
        if (W.now >= d.nextSprayAt) {
          d.nextSprayAt = W.now + STUCK_SPRAY_MS;
          const f = nearestFoe(d, STUCK_SPRAY_RANGE);
          if (f) {
            const ang = Math.atan2(f.y - d.y, f.x - d.x);
            for (let k = 0; k < STUCK_SPRAY_COUNT; k++) {
              frags.push({
                x: d.x, y: d.y, ang: ang + (k - 1) * 0.13 + (Math.random() - 0.5) * 0.06,
                damage: FRAG_SPRAY_DAMAGE * (1 + d.stacks * INSPIRIT_STEP * 0.5),
                dieAt: W.now + FRAG_LIFE_MS * 1.4, soul: d.stacks > 0,
              });
            }
            fx.daggerBurst(d.x, d.y, ang);
          }
        }
        continue;
      }
      const x0 = d.x;
      const y0 = d.y;
      d.x += Math.cos(d.ang) * DAGGER_SPEED * s;
      d.y += Math.sin(d.ang) * DAGGER_SPEED * s;
      if (!d.cult && o.inspirit) {
        for (const so of W.souls) {
          if (d.passed.has(so) || segDist(so.x, so.y, x0, y0, d.x, d.y) > INSPIRIT_R) continue;
          d.passed.add(so);
          d.stacks++;
          fx.soulBound(so.x, so.y, soulColor(o.kinds ? so.kind : 'plain'));
        }
      }
      let landed = false;
      for (const f of W.foes) {
        if (f.alpha < 0.5) continue;
        const sd = segDist(f.x, f.y, x0, y0, d.x, d.y);
        if (sd > BODY_R + DAGGER_HIT_PAD) continue;
        let dmg = d.cult ? CULT_DAGGER_DAMAGE : DAGGER_DAMAGE * (1 + d.stacks * INSPIRIT_STEP);
        const core = d.stacks > 0 && sd <= CORE_R;
        if (core) {
          dmg *= 1 + d.stacks * CORE_STEP;
          fx.coreHit(f.x, f.y);
          W.pop(f.x, f.y - 44, 'SOUL STRUCK', BND.soul, 11);
        }
        hitFoe(f, dmg, core ? BND.soul : BND.goldLit);
        fx.daggerHit(f.x, f.y, d.ang, d.stacks > 0);
        landed = true;
        break;
      }
      if (landed) { daggers.splice(i, 1); continue; }
      if (d.x <= L || d.x >= R || d.y <= T || d.y >= B) {
        d.x = Phaser.Math.Clamp(d.x, L, R);
        d.y = Phaser.Math.Clamp(d.y, T, B);
        if (d.cult) { daggers.splice(i, 1); continue; }
        d.stuckUntil = W.now + DAGGER_STICK_MS;
        d.nextSprayAt = W.now + STUCK_SPRAY_MS * 0.6;
        const stuck = daggers.filter((x) => x.stuckUntil && !x.cult);
        if (stuck.length > DAGGER_STUCK_MAX) {
          const oldest = stuck.reduce((a, c) => (c.stuckUntil < a.stuckUntil ? c : a));
          daggers.splice(daggers.indexOf(oldest), 1);
        }
      }
    }
    for (let i = frags.length - 1; i >= 0; i--) {
      const fr = frags[i];
      if (W.now >= fr.dieAt) { frags.splice(i, 1); continue; }
      const x0 = fr.x;
      const y0 = fr.y;
      fr.x += Math.cos(fr.ang) * FRAG_SPEED * s;
      fr.y += Math.sin(fr.ang) * FRAG_SPEED * s;
      if (fr.x < L || fr.x > R || fr.y < T || fr.y > B) { frags.splice(i, 1); continue; }
      for (const f of W.foes) {
        if (f.alpha < 0.5 || segDist(f.x, f.y, x0, y0, fr.x, fr.y) > BODY_R + 3) continue;
        hitFoe(f, fr.damage, fr.soul ? BND.soul : BND.chainLit, -8);
        frags.splice(i, 1);
        break;
      }
    }

    // Chains: the victim is put back inside the reach, after it has moved.
    W.tethers = W.tethers.filter((th) => W.now < th.until);
    for (const th of W.tethers) {
      const a = th.anchor ?? me;
      const d = dist(a, th.victim);
      if (d <= th.len) continue;
      th.victim.x = a.x + (th.victim.x - a.x) * (th.len / d);
      th.victim.y = a.y + (th.victim.y - a.y) * (th.len / d);
    }

    // The god — on the enemy, then (Q+) on you.
    if (W.now < god.until) {
      runGod(false);
    } else if (god.until) {
      god.until = 0;
      if (god.wrathMs > 0) {
        god.wrathUntil = W.now + god.wrathMs;
        god.wrathMs = 0;
        god.nv = W.now + 150;
        god.ns = W.now + 500;
        god.nl = W.now;
        god.nb = W.now + 800;
        fx.wrath(W.eye.x, W.eye.y);
        W.pop(me.x, me.y - 64, 'THE GOD IS WRATHFUL', BND.wrath, 12);
      }
    }
    if (W.now < god.wrathUntil) runGod(true);
    for (let i = shards.length - 1; i >= 0; i--) {
      const sh = shards[i];
      if (W.now < sh.liveAt) continue;
      const d = Math.hypot(sh.tx - sh.x, sh.ty - sh.y);
      if (d <= GOD_SHARD_SPEED * s + 4) {
        shards.splice(i, 1);
        fx.shardBurst(sh.tx, sh.ty, sh.turned);
        if (sh.turned) {
          if (Math.hypot(me.x - sh.tx, me.y - sh.ty) <= GOD_SHARD_BLAST_R) hurtMe(GOD_SHARD_DAMAGE);
        } else {
          for (const f of W.foes) if (f.alpha > 0.5 && Math.hypot(f.x - sh.tx, f.y - sh.ty) <= GOD_SHARD_BLAST_R) hitFoe(f, GOD_SHARD_DAMAGE, BND.gold);
        }
        continue;
      }
      sh.ang = Math.atan2(sh.ty - sh.y, sh.tx - sh.x);
      sh.x += Math.cos(sh.ang) * GOD_SHARD_SPEED * s;
      sh.y += Math.sin(sh.ang) * GOD_SHARD_SPEED * s;
    }
    for (let i = marks.length - 1; i >= 0; i--) {
      const m = marks[i];
      if (W.now < m.landsAt) continue;
      marks.splice(i, 1);
      fx.darkBlast(m.x, m.y, GOD_BLAST_R);
      if (m.turned) {
        if (dist(m, me) <= GOD_BLAST_R) hurtMe(GOD_BLAST_DAMAGE);
      } else {
        for (const f of W.foes) if (f.alpha > 0.5 && dist(m, f) <= GOD_BLAST_R) hitFoe(f, GOD_BLAST_DAMAGE, BND.iris);
      }
    }
    for (let i = sprays.length - 1; i >= 0; i--) if (W.now >= sprays[i].until) sprays.splice(i, 1);

    // The idol (mastery): favour while held, patience while not.
    const idol = W.idol;
    if (idol) {
      const held = W.inIdol() || W.souls.some((so) => so.onIdol);
      if (held) {
        idol.favour = Math.min(1, idol.favour + s / IDOL_FAVOUR_S);
        idol.lastHeldAt = W.now;
      } else {
        idol.favour = Math.max(0, idol.favour - s / IDOL_FADE_S);
        if (W.now - idol.lastHeldAt > IDOL_PATIENCE_MS && W.now >= idol.nextZapAt) {
          idol.nextZapAt = W.now + IDOL_ZAP_MS;
          fx.idolZap(idol.x, idol.y - 30, me.x, me.y);
          hurtMe(IDOL_ZAP_DAMAGE);
        }
      }
    }
  };

  // ── Paint ──
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  const foeG = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
  const skyG = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
  const lens = ctx.adopt(ctx.scene.add.graphics().setDepth(20));
  const hudG = ctx.adopt(ctx.scene.add.graphics().setDepth(21));
  const hudText = ctx.adopt(ctx.scene.add.text(0, 0, '', {
    fontSize: '10px', fontFamily: FONT, fontStyle: 'bold', color: hex(BND.chainLit), stroke: '#080415', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(22));
  const foeText = ctx.adopt(ctx.scene.add.text(0, 0, '', {
    fontSize: '9px', fontFamily: FONT, fontStyle: 'bold', color: hex(BND.chainLit), stroke: '#080415', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(22));
  hudText.setVisible(false);
  foeText.setVisible(false);

  const paint = (): void => {
    const t = W.now / 1000;
    const me = W.me();
    const tint = ctx.tint;
    ground.clear();
    foeG.clear();
    air.clear();
    skyG.clear();
    lens.clear();
    hudG.clear();

    // Ground: idol ring, blast marks, wind-up lines, the runes.
    const idol = W.idol;
    const angryIdol = !!idol && W.now - idol.lastHeldAt > IDOL_PATIENCE_MS;
    if (idol) faithRing(ground, tint, idol.x, idol.y + 18, IDOL_R, 0.9, angryIdol ? 1 : 1 - idol.favour, t);
    for (const m of marks) {
      darkMark(ground, tint, m.x, m.y, GOD_BLAST_R, 0.95, Phaser.Math.Clamp(1 - (m.landsAt - W.now) / GOD_BLAST_TELL_MS, 0, 1), t);
    }
    for (const r of W.revs) {
      if (r.state !== 'charge') continue;
      const k = Phaser.Math.Clamp(1 - (r.until - W.now) / REV_CHARGE_MS, 0, 1);
      ground.lineStyle(10 * k + 2, tint(BND.wrathDeep), 0.18 + k * 0.2);
      ground.lineBetween(r.x, r.y, me.x, me.y);
      ground.lineStyle(1.4, tint(BND.rune), 0.4 + k * 0.5);
      ground.lineBetween(r.x, r.y, me.x, me.y);
    }
    if (runes) {
      const life = runes.until - W.now;
      if (life <= 0) runes = null;
      else {
        const k = Phaser.Math.Clamp((W.now - runes.from) / 700, 0, 1);
        ritualRunes(ground, tint, runes.x, runes.y, 52, Math.min(1, life / 600), k, t);
      }
    }

    // The stand-ins.
    for (const f of W.foes) {
      if (f.alpha <= 0.02) continue;
      foeG.fillStyle(0x2b2f3d, f.alpha);
      foeG.fillCircle(f.x, f.y, BODY_R);
      foeG.fillStyle(0x3c4254, f.alpha);
      foeG.fillCircle(f.x, f.y, 13);
      foeG.fillStyle(0x8e97ad, f.alpha * 0.9);
      foeG.fillCircle(f.x - 5, f.y - 4, 3.2);
      foeG.fillCircle(f.x + 5, f.y - 4, 3.2);
      foeG.fillStyle(0x11131b, f.alpha);
      foeG.fillCircle(f.x - 4.4, f.y - 4, 1.6);
      foeG.fillCircle(f.x + 5.6, f.y - 4, 1.6);
    }

    // Chains first, so everything they hold sits on top of them.
    for (const th of W.tethers) {
      const a = th.anchor ?? me;
      const pull = Phaser.Math.Clamp(dist(a, th.victim) / th.len, 0, 1);
      chainRun(air, tint, a.x, a.y, th.victim.x, th.victim.y + 6, 0.92, pull, t, th.main ? 5 : 9);
      shackle(air, tint, th.victim.x, th.victim.y, BODY_R * 0.9, 0.9, t);
      if (th.anchor) {
        air.fillStyle(tint(BND.void), 0.8);
        air.fillCircle(a.x, a.y, 7);
        air.lineStyle(2, tint(BND.chainLit), 0.9);
        air.strokeCircle(a.x, a.y, 7);
      }
    }
    for (let i = throws.length - 1; i >= 0; i--) {
      const th = throws[i];
      if (W.now >= th.until) { throws.splice(i, 1); continue; }
      chainRun(air, tint, me.x, me.y, th.x, th.y, 0.9, 1, t, 7);
    }

    // Siphon stream.
    const sp = W.siphon;
    const src = sp.soul ?? sp.rev;
    if (src) {
      const col = sp.soul ? soulColor(o.kinds ? sp.soul.kind : 'plain') : BND.rune;
      const kmax = sp.soul && !(o.kinds && sp.soul.kind === 'angry') ? SIPHON_GAIN_MAX : ANGRY_GAIN_MAX;
      siphonStream(air, tint, src.x, src.y, me.x, me.y, 0.9, t, Math.min(1, sp.gain / kmax), col);
    }

    // Souls. A wild one is only seen through Blackened Eyes — or while it is being drunk.
    const eyes = W.now < W.eyesUntil;
    for (const so of W.souls) {
      const wild = !so.bound && !so.onIdol;
      let a = wild ? 0.85 : 0.95;
      if (wild && !eyes && sp.soul !== so) {
        a = o.ghostAlpha ?? 0;
        if (a <= 0) continue;
      }
      lostSoul(air, tint, so.x, so.y, a, {
        kind: o.kinds ? so.kind : 'plain', t, seed: so.seed, ang: so.heading, essence: so.essence,
        bound: so.bound && !so.onIdol,
      });
    }

    // The idol.
    if (idol) {
      idolStatue(air, tint, idol.x, idol.y, 1, angryIdol ? 0 : Math.ceil(idol.favour * 10), 10, t);
      favourBeads(air, tint, idol.x, idol.y + 18, 46, idol.favour, 0.9, t, angryIdol);
    }

    // Cultists, with their faith left.
    for (const c of W.cultists) {
      cultistFigure(air, tint, c.x, c.y, 1, { awakened: true, t, seed: c.seed });
      const left = Phaser.Math.Clamp((c.until - W.now) / CULT_FAITH_MS, 0, 1);
      air.fillStyle(tint(BND.void), 0.8);
      air.fillRect(c.x - 15, c.y - 36, 30, 4);
      air.fillStyle(tint(left < 0.3 ? BND.wrath : BND.goldLit), 0.95);
      air.fillRect(c.x - 14, c.y - 35, 28 * left, 2);
    }

    // Revenants.
    for (const r of W.revs) {
      const charge = r.state === 'charge' ? Phaser.Math.Clamp(1 - (r.until - W.now) / REV_CHARGE_MS, 0, 1)
        : r.state === 'dash' ? 1 : 0;
      revenant(air, tint, r.x, r.y, 0.97, { t, seed: r.seed, ang: r.ang, charge, fury: r.fury, frozen: r.state === 'held' ? 1 : 0 });
    }

    // Daggers and their shrapnel.
    for (const d of daggers) {
      const stuck = d.stuckUntil ? Phaser.Math.Clamp(1 - (d.nextSprayAt - W.now) / STUCK_SPRAY_MS, 0, 1) : 0;
      chainDagger(air, tint, d.x, d.y, d.ang, d.stuckUntil ? 0.92 : 1, { t, seed: d.seed, stacks: d.stacks, stuck, scale: d.cult ? 0.8 : 1 });
    }
    for (const fr of frags) chainShard(air, tint, fr.x, fr.y, fr.ang, 0.95, 1, fr.soul);
    for (const sh of shards) {
      if (W.now < sh.liveAt) continue;
      oblivionShard(air, tint, sh.x, sh.y, sh.ang, 1, { scale: 1, eye: 1, turned: sh.turned });
    }

    if (ward > 0) hexWard(air, tint, me.x, me.y, 34, 0.9, ward, t);
    if (eyes) {
      // Walking soul-only: the hitbox closes down to the core, and the core is all there is to hit.
      const k = Phaser.Math.Clamp((W.now - eyesFrom) / 450, 0, 1);
      const r = Phaser.Math.Linear(CASTER_R, CASTER_R * SOUL_HITBOX, k);
      air.lineStyle(1.2, tint(BND.soul), 0.25 + 0.4 * (1 - k));
      air.strokeCircle(me.x, me.y, CASTER_R);
      air.lineStyle(1.4, tint(BND.soul), 0.85);
      air.strokeCircle(me.x, me.y, r);
      soulCore(air, tint, me.x, me.y, 5, 0.95, t);
    }
    if (o.inspirit && daggers.some((d) => d.stacks > 0 && !d.stuckUntil && !d.cult)) {
      for (const f of W.foes) if (f.alpha > 0.5) soulCore(air, tint, f.x, f.y, 3.4, 0.85, t);
    }

    // The god: veil, eye, lasers.
    const awake = W.now < god.until;
    const turned = W.now < god.wrathUntil;
    if (awake || turned) {
      const total = turned ? Math.max(1, god.wrathUntil - W.now) : god.until - W.now;
      const fade = Phaser.Math.Clamp(Math.min(total / 600, (W.now - (god.until - god.ms)) / 600), 0, 1);
      const a = turned ? 1 : Math.max(0.15, fade);
      cosmicVeil(skyG, tint, W.eye.x, W.eye.y - 4, 320, 74, 0.95 * a, t);
      patronEye(skyG, tint, W.eye.x, W.eye.y, 20, 0.9 * a + 0.1, a,
        { wrath: turned ? 1 : 0, drift: Math.sin(t * 0.7) + (turned ? Math.sin(t * 11) : 0), t });
    }
    for (const spr of sprays) {
      const a = Phaser.Math.Clamp((spr.until - W.now) / 180, 0, 1);
      skyG.lineStyle(9, tint(BND.cosmic), a * 0.25);
      skyG.lineBetween(spr.x0, spr.y0, spr.x1, spr.y1);
      skyG.lineStyle(3.4, tint(spr.turned ? BND.wrath : BND.gold), a * 0.9);
      skyG.lineBetween(spr.x0, spr.y0, spr.x1, spr.y1);
      skyG.lineStyle(1.2, tint(BND.goldLit), a);
      skyG.lineBetween(spr.x0, spr.y0, spr.x1, spr.y1);
      skyG.fillStyle(tint(spr.turned ? BND.wrath : BND.goldLit), a * 0.6);
      skyG.fillCircle(spr.x1, spr.y1, 9 * a + 2);
    }

    // Blackened Eyes turns the arena over: a cold wash and a frosted rim, standing in for the
    // whole-canvas invert the arena does (which the menu cannot borrow).
    if (eyes) {
      const k = Math.min(1, (W.now - eyesFrom) / 300, (W.eyesUntil - W.now) / 300);
      lens.fillStyle(tint(BND.soul), 0.1 * k);
      lens.fillRect(0, 0, ctx.w, ctx.h);
      lens.lineStyle(10, tint(BND.soulDeep), 0.35 * k);
      lens.strokeRect(0, 0, ctx.w, ctx.h);
      lens.lineStyle(2, tint(BND.soul), 0.5 * k);
      lens.strokeRect(5, 5, ctx.w - 10, ctx.h - 10);
    }

    // Bound: the plaque.
    const c = W.curse;
    if (c) {
      const def = CURSES[c.id];
      const lifted = W.now < c.liftedUntil;
      const at = o.plaqueAt ?? { x: ctx.w * 0.5, y: 16 };
      hudText.setVisible(true).setPosition(at.x + 6, at.y - 1).setText(lifted
        ? `${def.emoji} ${def.name.toUpperCase()} · LIFTED`
        : `${def.emoji} BOUND · ${def.name.toUpperCase()} · ${Math.round(CURSE_MAX * c.strength * 100)}% ${def.what}`);
      hudText.setColor(hex(lifted ? BND.goldLit : BND.chainLit));
      boundPlaque(hudG, tint, at.x, at.y, hudText.width + 58, 24, c.strength, lifted ? 1 : 0, t);
      if (o.bond) {
        const f = W.foes[0];
        if (f) {
          const given = (1 - c.strength) + (lifted ? c.strength : 0);
          const pct = Math.round(CURSE_MAX * given * 100);
          foeText.setVisible(true).setPosition(f.x, f.y + 34)
            .setText(`FOE · ${def.name.toUpperCase()} · ${pct}% ${def.what}`);
          boundPlaque(hudG, tint, f.x, f.y + 35, foeText.width + 40, 18, given, 0, t);
          if (given > 0.01) shackle(air, tint, f.x, f.y, BODY_R * 0.9, 0.35 + given * 0.55, t);
        }
      }
    }
  };

  ctx.onFrame((dt) => { step(dt); paint(); });
  return W;
}

/**
 * Step out of a revenant's line the moment it commits — sideways to the dash, towards the middle
 * of the box. The dash is aimed where you stood when the wind-up ended, so this is the real dodge.
 */
function dodgeDashes(ctx: PreviewCtx, W: World, times = Infinity, step = 58): void {
  const seen = new WeakSet<object>();
  let left = times;
  ctx.onFrame(() => {
    for (const r of W.revs) {
      if (left <= 0 || r.state !== 'dash' || !r.dash || seen.has(r.dash)) continue;
      seen.add(r.dash);
      left--;
      const m = W.me();
      const opts = [r.ang + Math.PI / 2, r.ang - Math.PI / 2].map((a) => ({
        x: Phaser.Math.Clamp(m.x + Math.cos(a) * step, 30, ctx.w - 30),
        y: Phaser.Math.Clamp(m.y + Math.sin(a) * step, 40, ctx.h - 24),
      }));
      const mid = { x: ctx.w * 0.5, y: ctx.h * 0.55 };
      const to = dist(opts[0], mid) < dist(opts[1], mid) ? opts[0] : opts[1];
      ctx.glideCaster({ to, ms: 150, ease: 'out' });
    }
  });
}

// ══ PASSIVES ═══════════════════════════════════════════════════════════

export const passiveBound: PreviewScript = {
  duration: 10500,
  scale: 0.9,
  caption: 'Bound — a random curse at 25%, worn down 3% for every second you siphon. Three souls to the god lift it',
  run(ctx) {
    const W = world(ctx, { curse: 'brittle' });
    const say = readout(ctx);
    W.addFoe(ctx.tx, ctx.ty - 10);
    const me = W.me();
    for (let i = 0; i < 3; i++) W.addSoul(me.x + 40 * Math.cos(i * 2), me.y - 20, { bound: true });
    const drink = W.addSoul(me.x + 150, me.y - 70, { pinned: true, essence: 1 });
    say('Brittle: +25% damage taken, until you drink it away');
    ctx.at(400, () => { W.eyesUntil = W.now + 99_999; W.startSiphon(drink); });
    ctx.at(1200, () => say('every second of siphoning takes 3% of the curse off — for good'));
    ctx.at(6600, () => say('one whole soul: about 18% of it gone. And it came back angry'));
    ctx.at(7600, () => { W.ritual(false); say('three souls to the god: the curse is lifted while it stays (8s)', BND.goldLit); });
  },
};

export const passiveLostSouls: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Lost Souls — up to 6 wander the arena, unseen until Blackened Eyes. Bind one and it follows you, in plain sight',
  run(ctx) {
    const W = world(ctx, { ghostAlpha: 0.1 });
    const say = readout(ctx);
    const me = W.me();
    W.addSoul(ctx.w * 0.5, ctx.h * 0.35);
    W.addSoul(ctx.w * 0.7, ctx.h * 0.6);
    W.addSoul(ctx.w * 0.85, ctx.h * 0.3);
    W.addSoul(ctx.w * 0.12, ctx.h * 0.3);
    const near = W.addSoul(me.x + 90, me.y - 55, { pinned: true });
    say('the souls are here — nobody can see them');
    ctx.at(1300, () => { W.openEyes(); say('Blackened Eyes: 8 seconds of seeing them'); });
    ctx.at(2600, () => { W.bindSoul(near); say('E within 130px: bound — it follows you, and everyone can see it'); });
    ctx.at(3400, () => ctx.glideCaster({ to: { x: ctx.w * 0.46, y: ctx.cy - 20 }, ms: 1800, ease: 'out' }));
    ctx.at(6000, () => ctx.glideCaster({ to: { x: ctx.cx, y: ctx.cy }, ms: 1800, ease: 'out' }));
    ctx.at(9400, () => say('the eyes close; the bound soul stays in sight'));
  },
};

export const passiveRevenants: PreviewScript = {
  duration: 8600,
  scale: 0.9,
  caption: 'Revenants — 170px off you, a 0.9s wind-up, then a dash at you: 30 to anyone in the line, 12 to you if you stand still',
  run(ctx) {
    const W = world(ctx);
    const say = readout(ctx);
    const me = W.me();
    const rev = W.spawnRev(me.x + 230, me.y - 70, { nextIn: 1500 });
    const foe = W.addFoe(me.x + 110, me.y - 30);
    // The foe stands in the line until it learns better.
    ctx.onFrame((dt) => {
      if (W.now > 4600) return;
      const m = W.me();
      const k = Math.min(1, dt / 200);
      foe.x += ((m.x + rev.x) / 2 - foe.x) * k;
      foe.y += ((m.y + rev.y) / 2 - foe.y) * k;
    });
    say('a soul drunk dry: it keeps its distance and watches you');
    ctx.at(1500, () => say('the wind-up — the line it will run burns in'));
    dodgeDashes(ctx, W, 1);
    ctx.at(2300, () => say('keep walking and it misses you — the enemy in between takes 30'));
    ctx.at(4600, () => { foe.vx = 120; foe.vy = 10; });
    ctx.at(5600, () => { foe.vx = 0; foe.vy = 0; say('stand still and it is 12 to you'); });
  },
};

// ══ Click — Chainbound Daggers ═════════════════════════════════════════

export const daggers: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Click — 11 a dagger. Stuck in a wall it spits 3 × 4 every 1.5s; right click blows every one into 7 × 5',
  run(ctx) {
    const W = world(ctx);
    const say = readout(ctx);
    const foe = W.addFoe(ctx.tx, ctx.ty - 20);
    ctx.at(300, () => { W.throwDagger(foe.x, foe.y); say('a dagger: 11 to the first thing it touches'); });
    ctx.at(800, () => W.throwDagger(ctx.cx + 220, -60));
    ctx.at(1200, () => W.throwDagger(ctx.w, ctx.cy - 130));
    ctx.at(1500, () => say('the misses stick in the wall and spit fragments at the enemy'));
    ctx.at(3500, () => W.throwDagger(foe.x - 40, foe.y - 80));
    ctx.at(3620, () => {
      W.detonate();
      const m = W.me();
      W.pop(m.x, m.y - 50, 'RIGHT CLICK', BND.chainLit, 11);
      say('right click: every dagger out — stuck or flying — bursts into 7');
    });
  },
};

export const daggersUpgraded: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Inspirit — +30% for every soul a dagger passes through, and ×1.5 per soul more if it finds the enemy\'s core',
  run(ctx) {
    const W = world(ctx, { inspirit: true });
    const say = readout(ctx);
    const foe = W.addFoe(ctx.tx, ctx.ty - 20);
    const me = W.me();
    const along = (to: P, k: number): P => ({ x: me.x + (to.x - me.x) * k, y: me.y + (to.y - me.y) * k });
    const high = { x: me.x + 240, y: -80 };
    for (const p of [along(foe, 0.3), along(foe, 0.62), along(high, 0.42)]) W.addSoul(p.x, p.y, { pinned: true });
    ctx.at(200, () => { W.openEyes(); });
    ctx.at(900, () => { W.throwDagger(foe.x, foe.y); say('through two souls and into the core: 11 × 1.6 × 2 = 35'); });
    ctx.at(2400, () => { W.throwDagger(high.x, high.y); say('one soul on board, stuck in the wall: lit fragments, +15% each'); });
    ctx.at(5000, () => { W.detonate(); say('detonated: 7 lit fragments at the enemy'); });
  },
};

// ══ E — Bind ═══════════════════════════════════════════════════════════

export const chain: PreviewScript = {
  duration: 9600,
  scale: 0.9,
  caption: 'E — the enemy is chained 150px to you for 5s at ×1.2 cooldowns; E again anchors it. A visible soul is bound instead',
  run(ctx) {
    const W = world(ctx);
    const say = readout(ctx);
    const foe = W.addFoe(ctx.cx + 120, ctx.cy - 20);
    const soul = W.addSoul(ctx.cx + 60, ctx.cy - 80, { pinned: true });
    ctx.at(300, () => {
      W.chainFoe(foe);
      W.pop(foe.x, foe.y - 56, '×1.2 COOLDOWNS', BND.chainLit, 10);
      say('chained: it cannot get more than 150px from you');
      foe.vx = 70;
    });
    ctx.at(700, () => ctx.glideCaster({ to: { x: ctx.w * 0.08, y: ctx.cy - 10 }, ms: 1500, ease: 'linear' }));
    ctx.at(1200, () => say('walk away and it comes with you'));
    ctx.at(2500, () => { W.anchor(); say('E again: the chain is anchored where you stood'); });
    ctx.at(2800, () => ctx.glideCaster({ to: { x: ctx.w * 0.4, y: ctx.cy }, ms: 1400, ease: 'out' }));
    ctx.at(5300, () => say('5 seconds, and it is free'));
    ctx.at(6200, () => { foe.vx = 0; ctx.glideCaster({ to: { x: ctx.cx, y: ctx.cy }, ms: 900, ease: 'out' }); });
    ctx.at(7300, () => { W.openEyes(); say('with Blackened Eyes open, a lost soul in reach is bound instead'); });
    ctx.at(7900, () => W.bindSoul(soul));
  },
};

export const chainUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Bind the Hatred — a revenant held 5s in chains, then straight at you, ×1.2 speed and ×1.6 damage: 48 to the enemy between',
  run(ctx) {
    const W = world(ctx);
    const say = readout(ctx);
    const me = W.me();
    const rev = W.spawnRev(me.x + 165, me.y - 40, { auto: false, quiet: true });
    const foe = W.addFoe(me.x + 280, me.y - 40);
    say('a revenant within 170px');
    ctx.at(400, () => { W.holdRev(rev); say('E: held in its chains for 5 seconds'); });
    // Walk round so the enemy stands between you and it.
    ctx.at(900, () => {
      const ang = Math.atan2(foe.y - rev.y, foe.x - rev.x);
      ctx.glideCaster({ to: { x: rev.x + Math.cos(ang) * 250, y: rev.y + Math.sin(ang) * 250 }, ms: 1600, ease: 'out' });
      say('line it up — put the enemy between you');
    });
    dodgeDashes(ctx, W, 1);
    ctx.at(5400, () => say('released: through the enemy for 48, and past you'));
  },
};

// ══ R — Blackened Eyes ═════════════════════════════════════════════════

export const eyes: PreviewScript = {
  duration: 9800,
  scale: 0.9,
  caption: 'R — 8s of seeing the lost souls, a hitbox shrunk to 35% around your inner soul, and walking through anything solid',
  run(ctx) {
    const W = world(ctx);
    const say = readout(ctx);
    const foe = W.addFoe(ctx.w * 0.86, ctx.cy - 30);
    for (const [fx, fy] of [[0.45, 0.3], [0.62, 0.62], [0.78, 0.25], [0.15, 0.35]]) W.addSoul(ctx.w * fx, ctx.h * fy);
    const pillar = { x: ctx.cx + 150, y: ctx.cy - 60, w: 34, h: 96 };
    const pg = ctx.adopt(ctx.scene.add.graphics().setDepth(5.5));
    ctx.onFrame(() => {
      pg.clear();
      pg.fillStyle(0x3a3346, 1);
      pg.fillRect(pillar.x - pillar.w / 2, pillar.y, pillar.w, pillar.h);
      pg.fillStyle(0x4c445c, 1);
      pg.fillRect(pillar.x - pillar.w / 2, pillar.y, pillar.w, 8);
      pg.lineStyle(1.2, 0x1c1826, 1);
      pg.strokeRect(pillar.x - pillar.w / 2, pillar.y, pillar.w, pillar.h);
      for (let i = 1; i < 4; i++) pg.lineBetween(pillar.x - pillar.w / 2, pillar.y + i * 24, pillar.x + pillar.w / 2, pillar.y + i * 24);
    });

    // An enemy shot aimed to clip the edge of a normal body — and miss the core.
    const shots: { x: number; y: number; vx: number; vy: number; until: number; missed: boolean }[] = [];
    const sg = ctx.adopt(ctx.scene.add.graphics().setDepth(14));
    const shoot = (): void => {
      const m = W.me();
      const tx = m.x;
      const ty = m.y + 13;
      const a = Math.atan2(ty - foe.y, tx - foe.x);
      shots.push({ x: foe.x, y: foe.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, until: W.now + 1600, missed: false });
    };
    ctx.onFrame((dt) => {
      sg.clear();
      const m = W.me();
      for (let i = shots.length - 1; i >= 0; i--) {
        const sh = shots[i];
        sh.x += sh.vx * (dt / 1000);
        sh.y += sh.vy * (dt / 1000);
        if (W.now > sh.until) { shots.splice(i, 1); continue; }
        if (!sh.missed && sh.x < m.x) { sh.missed = true; W.pop(m.x, m.y - 30, 'MISS', BND.soul, 11); }
        sg.fillStyle(0xd9dde8, 0.95);
        sg.fillCircle(sh.x, sh.y, 5);
        sg.fillStyle(0x8e97ad, 0.5);
        sg.fillCircle(sh.x - sh.vx * 0.02, sh.y - sh.vy * 0.02, 3.5);
      }
    });

    say('the arena, as everyone sees it');
    ctx.at(500, () => { W.openEyes(); say('R: the screen turns over, and the dead are everywhere'); });
    ctx.at(1600, () => { shoot(); say('your hitbox is only your inner soul — 35% of you'); });
    ctx.at(3200, () => {
      ctx.glideCaster({ to: { x: ctx.cx + 300, y: ctx.cy - 10 }, ms: 1500, ease: 'linear' });
      say('and nothing solid stops you');
    });
    ctx.at(5200, shoot);
    ctx.at(6000, () => ctx.glideCaster({ to: { x: ctx.cx, y: ctx.cy }, ms: 1500, ease: 'linear' }));
    ctx.at(8600, () => say('8 seconds, and the souls are gone from sight again'));
  },
};

export const eyesUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Choice Souls — kind souls heal 4 HP/s, angry ones build damage to +80%, sad ones add up to +30% speed',
  run(ctx) {
    const W = world(ctx, { kinds: true });
    const say = readout(ctx);
    const me = W.me();
    const kind = W.addSoul(me.x + 120, me.y - 80, { kind: 'kind', pinned: true });
    const angry = W.addSoul(me.x + 260, me.y - 40, { kind: 'angry', pinned: true });
    const sad = W.addSoul(me.x + 400, me.y - 90, { kind: 'sad', pinned: true });
    live(ctx, ctx.w * 0.5, 14, () => ({
      text: `damage +${Math.round(W.siphon.gain * 100)}%   ·   speed +${Math.round(W.siphon.speed * 100)}%`,
      color: W.siphon.gain > 0.45 ? BND.soulAngry : BND.goldLit,
    }));
    ctx.at(200, () => { W.openEyes(); say('Blackened Eyes shows each soul\'s temper'); });
    ctx.at(700, () => { W.startSiphon(kind); say('green — kind: 4 HP a second while you drink'); });
    ctx.at(2600, () => W.stopSiphon());
    ctx.at(3200, () => { W.startSiphon(angry); say('red — angry: +16% a second, up to +80%'); });
    ctx.at(5400, () => W.stopSiphon());
    ctx.at(5800, () => { W.startSiphon(sad); say('blue — sad: +5% speed a second as well, up to +30%'); });
    ctx.at(8000, () => W.stopSiphon());
  },
};

// ══ F — Siphon ═════════════════════════════════════════════════════════

export const siphon: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  caption: 'F — +10% damage a second to +50%, 3% off the curse a second. Drain a soul dry and it comes back as a revenant',
  run(ctx) {
    const W = world(ctx, { curse: 'shackled' });
    const say = readout(ctx);
    const me = W.me();
    const so = W.addSoul(me.x + 150, me.y - 60, { pinned: true, essence: 0.55 });
    live(ctx, ctx.w * 0.84, 40, () => ({
      text: `+${Math.round(W.siphon.gain * 100)}% damage`,
      color: W.siphon.soul ? BND.goldLit : W.siphon.gain > 0 ? BND.gold : BND.goldDeep,
    }));
    ctx.at(200, () => { W.openEyes(); });
    ctx.at(600, () => { W.startSiphon(so); say('drinking a soul already half gone'); });
    ctx.at(1600, () => say('the buff builds; the curse at the top wears away for good'));
    ctx.at(4300, () => say('drained dry — and it comes back angry'));
    ctx.at(5000, () => say('the buff lingers 3s; the revenant stays'));
    ctx.at(7100, () => say('it winds up — walk out of the line'));
    dodgeDashes(ctx, W);
  },
};

export const siphonUpgraded: PreviewScript = {
  duration: 11500,
  scale: 0.9,
  caption: 'Trial by Faith — siphon a revenant 4s and it kneels as a cultist: 7-damage daggers, a 2s chain, 12s of faith',
  run(ctx) {
    const W = world(ctx);
    const say = readout(ctx);
    const me = W.me();
    const foe = W.addFoe(ctx.w * 0.86, ctx.cy - 40);
    const rev = W.spawnRev(me.x + 170, me.y - 30, { nextIn: 1600, quiet: true });
    W.addSoul(me.x - 30, me.y - 10, { bound: true });
    say('F+ on a revenant: it gets angrier as you drink');
    ctx.at(300, () => W.startSiphon(rev));
    ctx.at(1700, () => say('faster, harder, more often — and it still comes for you'));
    dodgeDashes(ctx, W);
    ctx.at(2800, () => {
      if (!W.siphon.rev && W.revs.includes(rev)) W.startSiphon(rev);
    });
    ctx.at(5200, () => say('fully drunk, it kneels: a cultist for 12 seconds'));
    ctx.at(7000, () => say('it throws daggers and chains the enemy'));
    ctx.at(8800, () => {
      const c = W.cultists[0];
      if (!c) return;
      const m = W.me();
      ctx.glideCaster({ to: { x: Phaser.Math.Linear(m.x, c.x, 0.7), y: Phaser.Math.Linear(m.y, c.y, 0.7) + 10 }, ms: 700, ease: 'out' });
    });
    ctx.at(9700, () => {
      const c = W.cultists[0];
      const so = W.souls.find((s) => s.bound);
      if (!c || !so) return;
      W.fx.soulOffered(so.x, so.y, c.x, c.y, soulColor(so.kind));
      so.dead = true;
      c.until = Math.min(W.now + CULT_FAITH_CAP_MS, Math.max(c.until, W.now) + CULT_FEED_MS);
      W.pop(c.x, c.y - 44, 'FAITH RESTORED', BND.goldLit, 11);
      say('E: bind a soul into it — 6 more seconds of faith');
    });
  },
};

// ══ Q — Ritual ═════════════════════════════════════════════════════════

export const ritual: PreviewScript = {
  duration: 10600,
  scale: 0.9,
  caption: 'Q — every soul on your chain to the god. 4 souls: 8 seconds of it on the enemy, and your curse lifted',
  run(ctx) {
    const W = world(ctx, { curse: 'feeble', plaqueAt: { x: ctx.w * 0.17, y: 16 } });
    const say = readout(ctx);
    const me = W.me();
    W.addFoe(ctx.tx, ctx.ty - 26);
    for (let i = 0; i < 4; i++) W.addSoul(me.x + Math.cos(i * 1.6) * 38, me.y + Math.sin(i * 1.6) * 26, { bound: true });
    say('four souls on the chain');
    ctx.at(700, () => { W.ritual(false); say('the runes wake; the god comes for 8 seconds'); });
    ctx.at(2400, () => say('7-shard volleys, 24 swipes, 8-damage lasers, a 38-damage dark blast'));
    ctx.at(6000, () => say('1–2 souls: 5s and a limb · 3–4: 8s, curse lifted · 5–6: 12s, lifted 15s, a ward'));
  },
};

export const ritualUpgraded: PreviewScript = {
  duration: 10600,
  scale: 0.9,
  caption: 'Wrathful God — revenants count as souls, but every one offered is 3 seconds of the god turned on you after',
  run(ctx) {
    const W = world(ctx, { curse: 'sluggish', plaqueAt: { x: ctx.w * 0.17, y: 16 } });
    const say = readout(ctx);
    const me = W.me();
    W.addFoe(ctx.tx, ctx.ty - 26);
    W.addSoul(me.x + 38, me.y - 6, { bound: true });
    W.spawnRev(me.x + 160, me.y - 70, { auto: false, quiet: true });

    // The limb prompt — two souls is the short god, and the short god takes something.
    const pg = ctx.adopt(ctx.scene.add.graphics().setDepth(21));
    const pt = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, ctx.h - 40, '', {
      fontSize: '11px', fontFamily: FONT, fontStyle: 'bold', color: hex(BND.gold), stroke: '#080415', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(22));
    let askedAt = -1;
    ctx.onFrame(() => {
      pg.clear();
      if (askedAt < 0) { pt.setVisible(false); return; }
      const ready = W.now - askedAt >= SACRIFICE_GRACE_MS;
      pt.setVisible(true).setText(ready
        ? 'THE GOD TAKES A LIMB — press Click / E / R / F to give one up'
        : 'THE GOD TAKES A LIMB — it is deciding what to ask for…');
      pt.setColor(hex(ready ? BND.goldLit : BND.gold));
      tithePlaque(pg, ctx.tint, pt.x, pt.y, pt.width + 70, pt.height + 12, ready, W.now / 1000);
    });

    say('one soul and one revenant on offer');
    ctx.at(600, () => {
      W.ritual(true);
      askedAt = W.now;
      say('two souls: the 5-second god, and it takes a limb');
    });
    ctx.at(2000, () => {
      askedAt = -1;
      const m = W.me();
      W.fx.shardBurst(m.x, m.y, true);
      W.pop(m.x, m.y - 50, '⛓ R TAKEN', BND.wrath, 12);
      say('R is gone for the rest of the match');
    });
    ctx.at(5700, () => say('then it turns on you: 3 seconds for the revenant'));
    ctx.at(6100, () => ctx.glideCaster({ to: { x: ctx.cx + 140, y: ctx.cy - 30 }, ms: 1400, ease: 'linear' }));
    ctx.at(7500, () => ctx.glideCaster({ to: { x: ctx.cx, y: ctx.cy }, ms: 1200, ease: 'linear' }));
  },
};

// ══ MASTERY ════════════════════════════════════════════════════════════

export const masteryPermanentBond: PreviewScript = {
  duration: 10500,
  scale: 0.9,
  caption: 'Permanent Bond — every bit of curse Siphon takes off you lands on the enemy, for good; while it is lifted, they carry all of it',
  run(ctx) {
    const W = world(ctx, { mastered: true, curse: 'shackled', bond: true });
    const say = readout(ctx);
    const me = W.me();
    const foe = W.addFoe(ctx.tx, ctx.ty - 40);
    for (let i = 0; i < 3; i++) W.addSoul(me.x + Math.cos(i * 2.1) * 38, me.y + Math.sin(i * 2.1) * 26, { bound: true });
    const drink = W.addSoul(me.x + 140, me.y - 70, { pinned: true });
    // The foe paces: the shackles it is picking up are the ones you are losing.
    ctx.onFrame(() => {
      const c = W.curse;
      const slow = c ? 1 - CURSE_MAX * ((1 - c.strength) + (W.now < c.liftedUntil ? c.strength : 0)) : 1;
      foe.vy = Math.sin(W.now / 700) * 60 * slow;
    });
    ctx.at(300, () => { W.eyesUntil = W.now + 99_999; W.startSiphon(drink); say('Shackled: every second you drink, 3% of it moves to them'); });
    ctx.at(6700, () => say('a whole soul: about 18% off you and onto them, permanently'));
    ctx.at(7400, () => { W.ritual(false); say('three souls to the god: lifted off you — and the whole 25% on them'); });
  },
};

export const masteryFalseIdol: PreviewScript = {
  duration: 12500,
  scale: 0.9,
  caption: 'False Idol — in its ring, favour builds to +35% damage, +20% speed, −25% damage taken. Leave it 4s and it lasers you for 8',
  run(ctx) {
    const W = world(ctx, { mastered: true });
    const say = readout(ctx);
    const me = W.me();
    W.addSoul(me.x + 30, me.y - 10, { bound: true });
    const idolAt = { x: me.x + 20, y: me.y - 38 };
    live(ctx, ctx.w * 0.74, 16, () => {
      const f = W.idol && W.inIdol() ? W.idol.favour : 0;
      return {
        text: `favour ${Math.round((W.idol?.favour ?? 0) * 100)}%   ·   +${Math.round(IDOL_DMG * f * 100)}% dmg  +${Math.round(IDOL_SPEED * f * 100)}% speed  −${Math.round(IDOL_ARMOUR * f * 100)}% taken`,
        color: f > 0 ? BND.goldLit : BND.goldDeep,
      };
    });
    ctx.at(300, () => { W.plantIdol(idolAt.x, idolAt.y); say('plant it, and stand in its ring'); });
    ctx.at(3600, () => {
      ctx.glideCaster({ to: { x: ctx.w * 0.72, y: ctx.cy - 20 }, ms: 1300, ease: 'out' });
      say('walk out and the buffs stop; the favour drains over 12s');
    });
    ctx.at(7200, () => say('4 seconds alone and it loses patience: 8 every 1.2s'));
    ctx.at(9000, () => ctx.glideCaster({ to: { x: idolAt.x + 130, y: ctx.cy - 10 }, ms: 700, ease: 'out' }));
    ctx.at(9900, () => { W.feedIdol(); say('E: a soul stands in for you — calm, and the favour grows again'); });
  },
};
