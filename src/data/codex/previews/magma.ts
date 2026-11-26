import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  MAG, MagmaAvatar, MagmaFx, lavaRock, moltenPool, pressureGauge,
} from '../../../elements/kits/MagmaVisuals';
import {
  PIR, anchorChain, blunderbuss, deckCannon, flintlock, galleon, hangoverThrob, hotDrink,
  hotshotTracer, impactMarker, meltPuddle, moltenBall, numbHaze, shipAnchor, shotPellet,
  unstableCore as paintCore,
} from '../../../elements/kits/MagmaPirateVisuals';

/**
 * Magma's showcases — the pirate kit (Blunderblast, Hotshot, Nice Hot Drink, Unstable Core,
 * Limoncello).
 *
 * Magma puts nothing in the world as a sprite: pellets, pools, rocks, cores, the galleon, its
 * guns and its anchor are all records the kit repaints into Graphics layers every frame. So
 * every loop here keeps the same little records the kit keeps, advances them with the kit's own
 * arithmetic, and paints them with the real painters from `MagmaVisuals` and
 * `MagmaPirateVisuals`. One-shots go through a real `MagmaFx` with a sticky sink.
 *
 * The only text any loop puts in the box is a damage number.
 *
 * `bodyTexture` is `elem-magma`: the basalt ball ArenaScene stages under the rig.
 */

const BODY = 'elem-magma';

// ── The kit's numbers ─────────────────────────────────────────────────
// Copied from the constants at the top of `MagmaKit.ts`, which does not export them. If one
// moves there, it has to move here.

const POOL_R = 26;
const POOL_LIFE_MS = 5000;
const POOL_DPS = 24;

const BLUNDER_CHARGES = 2;
const BLUNDER_RECHARGE_MS = 3000;
const PELLETS = 8;
const PELLET_SPREAD = 0.27;
const PELLET_SPEED = 640;
const PELLET_RANGE = 310;
const PELLET_DMG = 4;
const PELLET_HIT_R = 20;
const PELLET_SHOVE = 16;
const KICK_WINDOW_MS = 700;
const KICK_DIST = 240;
const KICK_MS = 380;

const HOTSHOT_ROUNDS = 2;
const HOTSHOT_DMG = 26;
const HOTSHOT_RANGE = 900;
const HOTSHOT_HIT_R = 20;
const HOTSHOT_SHOVE = 30;

const NUMB_MS = 5000;
const HANGOVER_SHARE = 0.8;
const HANGOVER_MS = 4000;
const CHUG_MS = 520;

const CORE_HP = 100;
const CORE_ERUPT_MS = 5000;
const CORE_BURN_DPS = 10;
const CORE_POOL_MS = 650;
const CORE_POOL_R = 24;
const CORE_POOL_LIFE_MS = 3800;
const CORE_ROCK_MS = 240;
const CORE_BLAST_DMG = 45;
const CORE_BLAST_R = 130;
const CORE_BLAST_SHOVE = 110;
const ROCK_SPEED = 230;
const ROCK_DMG = 9;
const ROCK_LIFE_MS = 2200;
const ROCK_HIT_R = 22;

const MELT_MS = 480;
const RISE_MS = 520;
const SHIP_W = 440;
const SHIP_H = 104;
const SHIP_HP = 200;
const SHIP_DECAY_PER_S = 4;
const CANNON_AT: Array<[number, number]> = [[-132, 33], [0, 37], [128, 31]];
const CANNON_FUSE_MS = 600;
const CANNON_RELOAD_MS = 3200;
const BALL_FLIGHT_MS = 850;
const BALL_DMG = 36;
const BALL_R = 64;
const BALL_SHOVE = 120;
const HAWSE_AT: [number, number] = [172, 30];
const ANCHOR_REST: [number, number] = [250, 150];
const CHAIN_LEN = 380;
const ANCHOR_R = 26;
const ANCHOR_HIT_R = 32;
const ANCHOR_DMG = 24;
const ANCHOR_SHOVE = 130;
const ANCHOR_PELLET_KICK = 190;
const ANCHOR_MAX_SPEED = 950;
const ANCHOR_MIN_HIT_SPEED = 170;
const ANCHOR_FLY_MS = 2600;
const ANCHOR_HIT_GAP_MS = 600;
const ANCHOR_REEL_SPEED = 560;

const SHOVE_MS = 260;

/** What a stand-in enemy throws at the pirate. Not Magma's — just something to be hit by. */
const FOE_SHOT_DMG = 15;
const FOE_SHOT_SPEED = 520;

// ── Staging ───────────────────────────────────────────────────────────

interface Pt { x: number; y: number }

/** A stand-in enemy. Shoved about by the real shove arithmetic, then it walks home. */
interface Body {
  x: number; y: number;
  homeX: number; homeY: number;
  vx: number; vy: number;
  shoveUntil: number;
  /** Script-owned: the stage never walks it home. */
  hold: boolean;
}

interface Pool { x: number; y: number; r: number; life: number; born: number; seed: number }
interface Pellet { x: number; y: number; vx: number; vy: number; born: number; until: number; seed: number }
interface Orb { x0: number; y0: number; x1: number; y1: number; from: number; ms: number; onLand: () => void }

function fxOf(ctx: PreviewCtx): MagmaFx {
  return ctx.capture(() => new MagmaFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The molten-rock rig, or null when a skin has replaced the character. */
function molten(av: unknown): MagmaAvatar | null {
  return av instanceof MagmaAvatar ? av : null;
}

const dist = (a: Pt, b: Pt): number => Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);

/** A damage number — the one kind of text these loops are allowed. */
function num(ctx: PreviewCtx, x: number, y: number, amount: number, size = 13): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, `${amount}`, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color: '#ffb3aa',
  }).setOrigin(0.5).setDepth(22));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

/**
 * The pirate on a floor: the caster, his blunderbuss and its two charges, the flintlocks, the
 * pellets in the air, the lava on the ground and the bodies it all lands on. Every loop stands
 * on one of these and adds its own ability on top.
 */
function stage(ctx: PreviewCtx, o: { pips?: boolean } = {}) {
  const fx = fxOf(ctx);
  const av = ctx.useAvatar(() => new MagmaAvatar(ctx.scene, ctx.tint));
  const rig = molten(av);
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  const dummies = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  const objs = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
  const tools = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

  const st = {
    /** Loop time, ms — latched every frame so `ctx.at` callbacks can read it. */
    t: 0,
    aim: ctx.aim,
    charges: BLUNDER_CHARGES,
    rechargeAt: 0,
    shotAt: -9999,
    shotAng: 0,
    flyUntil: 0,
    dodgeAt: -9999,
    kickSpent: true,
    hot: 0,
    hotFiredAt: [-9999, -9999] as [number, number],
  };
  const bodies: Body[] = [];
  const pools: Pool[] = [];
  const pellets: Pellet[] = [];
  const orbs: Orb[] = [];
  const burn = new Map<Body, number>();
  const hooks = {
    /** Told about every point a body takes — the core listens here. */
    onHurt: null as null | ((b: Body, amount: number) => void),
    /** Offered every pellet before the bodies are — the anchor listens here. True eats it. */
    onPellet: null as null | ((p: Pellet) => boolean),
  };

  const body = (x: number, y: number): Body => {
    const b: Body = { x, y, homeX: x, homeY: y, vx: 0, vy: 0, shoveUntil: -9999, hold: false };
    bodies.push(b);
    return b;
  };

  const pool = (x: number, y: number, r = POOL_R, life = POOL_LIFE_MS): void => {
    const px = Phaser.Math.Clamp(x, 20, ctx.w - 20), py = Phaser.Math.Clamp(y, 20, ctx.h - 14);
    pools.push({ x: px, y: py, r, life, born: st.t, seed: Math.random() * 999 });
    fx.splat(px, py, r * 0.9);
  };

  /** The kit's `shove`: a distance played out as position over 260ms, the newest one winning. */
  const shove = (b: Body, ang: number, distance: number): void => {
    const speed = distance / (SHOVE_MS / 1000);
    b.vx = Math.cos(ang) * speed;
    b.vy = Math.sin(ang) * speed;
    b.shoveUntil = st.t + SHOVE_MS;
  };

  const hurt = (b: Body, amount: number, size = 13): void => {
    num(ctx, b.x + (Math.random() - 0.5) * 22, b.y - 26, amount, size);
    hooks.onHurt?.(b, amount);
  };

  const aimAt = (p: Pt): void => {
    const c = ctx.casterAt();
    st.aim = Math.atan2(p.y - c.y, p.x - c.x);
  };

  /** A dodge: a short roll, and the 700ms in which the next blast kicks. */
  const dodge = (dx: number, dy = 0): void => {
    const c = ctx.casterAt();
    st.dodgeAt = st.t;
    st.kickSpent = false;
    ctx.glideCaster({ to: { x: c.x + dx, y: c.y + dy }, ms: 200, ease: 'out' });
  };

  const kickArmed = (): boolean => !st.kickSpent && st.t - st.dodgeAt <= KICK_WINDOW_MS;

  /** `doBlunder`: the spread, the charge, and — only out of a dodge — the kick. */
  const blast = (target: Pt): void => {
    if (st.charges <= 0) return;
    if (st.charges >= BLUNDER_CHARGES) st.rechargeAt = st.t + BLUNDER_RECHARGE_MS;
    st.charges--;
    const c = ctx.casterAt();
    const ang = Math.atan2(target.y - c.y, target.x - c.x);
    st.aim = ang;
    av.play('punch', ang);
    st.shotAt = st.t;
    st.shotAng = ang;
    const mx = c.x + Math.cos(ang) * 24, my = c.y + Math.sin(ang) * 24;
    for (let i = 0; i < PELLETS; i++) {
      const lane = (i / (PELLETS - 1)) * 2 - 1;
      const a = ang + lane * PELLET_SPREAD + (Math.random() - 0.5) * 0.09;
      const speed = PELLET_SPEED * (0.86 + Math.random() * 0.28);
      pellets.push({
        x: mx, y: my, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        born: st.t, until: st.t + (PELLET_RANGE / speed) * 1000, seed: Math.random() * 999,
      });
    }
    fx.ember(mx, my, 8, 30, 380, MAG.gold);
    fx.smoke(mx, my, 4, 620);
    if (!kickArmed()) return;
    st.kickSpent = true;
    st.flyUntil = st.t + KICK_MS;
    fx.shock(c.x, c.y, 10, 58, MAG.gold, 380);
    fx.erupt(mx, my, 34, MAG.white);
    ctx.glideCaster({
      from: { x: c.x, y: c.y },
      to: {
        x: Phaser.Math.Clamp(c.x - Math.cos(ang) * KICK_DIST, 30, ctx.w - 30),
        y: Phaser.Math.Clamp(c.y - Math.sin(ang) * KICK_DIST, 30, ctx.h - 30),
      },
      ms: KICK_MS, ease: 'out',
    });
  };

  /** `doHotshot`: both pistols out. */
  const draw = (): void => {
    const c = ctx.casterAt();
    st.hot = HOTSHOT_ROUNDS;
    st.hotFiredAt = [-9999, -9999];
    av.play('flex');
    fx.ember(c.x, c.y - 4, 10, 30, 520, MAG.gold);
    fx.shock(c.x, c.y, 8, 40, MAG.lava, 320);
  };

  /** `fireHotshot`: a line through the aim, and the first body on it. */
  const fireHot = (target: Pt): void => {
    const c = ctx.casterAt();
    const hand: 0 | 1 = st.hot === HOTSHOT_ROUNDS ? 1 : 0;
    st.hot--;
    st.hotFiredAt[hand] = st.t;
    const ang = Math.atan2(target.y - c.y, target.x - c.x);
    st.aim = ang;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const from = av.handPos(hand);
    let reach = HOTSHOT_RANGE;
    if (cs > 0.0001) reach = Math.min(reach, (ctx.w - 6 - c.x) / cs);
    if (cs < -0.0001) reach = Math.min(reach, (6 - c.x) / cs);
    if (sn > 0.0001) reach = Math.min(reach, (ctx.h - 6 - c.y) / sn);
    if (sn < -0.0001) reach = Math.min(reach, (6 - c.y) / sn);
    reach = Math.max(20, reach);
    let hit: Body | null = null;
    let hitAt = reach;
    for (const b of bodies) {
      const along = (b.x - c.x) * cs + (b.y - c.y) * sn;
      if (along < 0 || along > hitAt) continue;
      if (Math.abs(-(b.x - c.x) * sn + (b.y - c.y) * cs) > HOTSHOT_HIT_R) continue;
      hit = b;
      hitAt = along;
    }
    const ex = c.x + cs * hitAt, ey = c.y + sn * hitAt;
    fx.anim(9, 200, (g, u) => hotshotTracer(g, ctx.tint, from.x, from.y, ex, ey, u));
    fx.ember(ex, ey, 7, 22, 420, MAG.gold);
    av.play('punch', ang);
    if (hit) {
      hurt(hit, HOTSHOT_DMG, 16);
      shove(hit, ang, HOTSHOT_SHOVE);
      fx.erupt(ex, ey, 22, MAG.gold);
    }
  };

  /** The click, as the kit dispatches it: a drawn flintlock first, otherwise the blunderbuss. */
  const click = (target: Pt): void => {
    if (st.hot > 0) fireHot(target); else blast(target);
  };

  /** A stand-in enemy's shot, from `from` to wherever the pirate is standing now. */
  const orb = (from: Pt, onLand: () => void): void => {
    const c = ctx.casterAt();
    orbs.push({
      x0: from.x, y0: from.y, x1: c.x, y1: c.y, from: st.t,
      ms: (dist(from, c) / FOE_SHOT_SPEED) * 1000, onLand,
    });
  };

  ctx.onFrame((delta, elapsed) => {
    const dt = delta / 1000;
    const t = elapsed / 1000;
    st.t = elapsed;
    const c = ctx.casterAt();
    ctx.moveCaster(c.x, c.y, { facing: st.aim });
    av.setHold(st.hot > 0 ? 'gun' : null, st.aim);
    rig?.setVenting(elapsed < st.flyUntil || elapsed - st.shotAt < 220);

    // Charges come back one at a time.
    if (st.charges < BLUNDER_CHARGES && elapsed >= st.rechargeAt) {
      st.charges++;
      if (st.charges < BLUNDER_CHARGES) st.rechargeAt = elapsed + BLUNDER_RECHARGE_MS;
    }

    // Bodies: a shove eases out over its life; afterwards they walk back to their mark.
    for (const b of bodies) {
      if (elapsed < b.shoveUntil) {
        const left = Phaser.Math.Clamp((b.shoveUntil - elapsed) / SHOVE_MS, 0, 1);
        b.x = Phaser.Math.Clamp(b.x + b.vx * dt * left * 2, 20, ctx.w - 20);
        b.y = Phaser.Math.Clamp(b.y + b.vy * dt * left * 2, 20, ctx.h - 20);
      } else if (!b.hold && elapsed > b.shoveUntil + 900) {
        b.x += (b.homeX - b.x) * Math.min(1, dt * 2.2);
        b.y += (b.homeY - b.y) * Math.min(1, dt * 2.2);
      }
    }

    // Pellets.
    for (let i = pellets.length - 1; i >= 0; i--) {
      const p = pellets[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (elapsed >= p.until) { pellets.splice(i, 1); continue; }
      if (hooks.onPellet?.(p)) { pellets.splice(i, 1); continue; }
      const victim = bodies.find((b) => dist(p, b) <= PELLET_HIT_R);
      if (!victim) continue;
      hurt(victim, PELLET_DMG);
      shove(victim, Math.atan2(p.vy, p.vx), PELLET_SHOVE);
      fx.ember(p.x, p.y, 3, 12, 300);
      pellets.splice(i, 1);
    }

    // A stand-in's shots.
    for (let i = orbs.length - 1; i >= 0; i--) {
      if (elapsed < orbs[i].from + orbs[i].ms) continue;
      const done = orbs.splice(i, 1)[0];
      done.onLand();
    }

    // Lava: a maximum across every pool touching a body, never a sum; stepping out loses the
    // part-tick. Shown as one number each half second rather than one a point.
    for (let i = pools.length - 1; i >= 0; i--) if (elapsed >= pools[i].born + pools[i].life) pools.splice(i, 1);
    for (const b of bodies) {
      if (!pools.some((p) => dist(p, b) <= p.r)) { burn.delete(b); continue; }
      const acc = (burn.get(b) ?? 0) + POOL_DPS * dt;
      if (acc >= POOL_DPS / 2) { burn.set(b, acc - POOL_DPS / 2); hurt(b, POOL_DPS / 2, 11); } else burn.set(b, acc);
    }

    // ── Paint ──
    ground.clear(); dummies.clear(); objs.clear(); tools.clear();
    for (const p of pools) {
      const age = (elapsed - p.born) / p.life;
      const heat = Phaser.Math.Clamp(1 - age * 1.15, 0.05, 1);
      const grow = Phaser.Math.Clamp((elapsed - p.born) / 160, 0.3, 1);
      const fade = Phaser.Math.Clamp((p.born + p.life - elapsed) / Math.min(900, p.life * 0.5), 0, 1);
      moltenPool(ground, ctx.tint, p.x, p.y, p.r * grow, heat, t, p.seed, fade);
    }
    for (const b of bodies) {
      dummies.fillStyle(0x2b2f3d, 1); dummies.fillCircle(b.x, b.y, 17);
      dummies.fillStyle(0x3c4254, 1); dummies.fillCircle(b.x, b.y, 13);
      dummies.fillStyle(0x8e97ad, 0.9); dummies.fillCircle(b.x - 5, b.y - 4, 3.2); dummies.fillCircle(b.x + 5, b.y - 4, 3.2);
      dummies.fillStyle(0x11131b, 1); dummies.fillCircle(b.x - 5.6, b.y - 4, 1.6); dummies.fillCircle(b.x + 4.4, b.y - 4, 1.6);
    }
    for (const p of pellets) {
      const life = Phaser.Math.Clamp((p.until - elapsed) / Math.max(1, p.until - p.born), 0, 1);
      shotPellet(objs, ctx.tint, p.x, p.y, Math.atan2(p.vy, p.vx), life, p.seed);
    }
    for (const ob of orbs) {
      const u = Phaser.Math.Clamp((elapsed - ob.from) / Math.max(1, ob.ms), 0, 1);
      const x = Phaser.Math.Linear(ob.x0, ob.x1, u), y = Phaser.Math.Linear(ob.y0, ob.y1, u);
      objs.fillStyle(0x8e97ad, 0.3); objs.fillCircle(x, y, 9);
      objs.fillStyle(0xc9d0e0, 1); objs.fillCircle(x, y, 5);
    }

    // In hand: pistols while they are out, else the blunderbuss for the moment of the shot.
    if (st.hot > 0 || elapsed - Math.max(st.hotFiredAt[0], st.hotFiredAt[1]) < 260) {
      for (const hand of [0, 1] as const) {
        const at = av.handPos(hand);
        const lit = hand === 1 ? st.hot >= 2 : st.hot >= 1;
        const flash = Phaser.Math.Clamp(1 - (elapsed - st.hotFiredAt[hand]) / 150, 0, 1);
        flintlock(tools, ctx.tint, at.x, at.y, st.aim, lit, flash, t, hand * 1.7);
      }
    } else {
      const since = elapsed - st.shotAt;
      if (since < 320) {
        const at = av.castHand();
        blunderbuss(tools, ctx.tint, at.x, at.y, st.shotAng, Phaser.Math.Clamp(1 - since / 150, 0, 1),
          st.charges / BLUNDER_CHARGES, t);
      }
      // The kick window: the gold ring that says the next blast throws him.
      if (st.charges > 0 && kickArmed()) {
        tools.lineStyle(2, ctx.tint(MAG.gold), 0.5 + 0.35 * Math.sin(t * 26));
        tools.strokeCircle(c.x, c.y, 24);
        const back = st.aim + Math.PI;
        for (let i = -1; i <= 1; i++) {
          const a = back + i * 0.42;
          tools.lineBetween(c.x + Math.cos(a) * 28, c.y + Math.sin(a) * 28, c.x + Math.cos(a) * 38, c.y + Math.sin(a) * 38);
        }
      }
    }

    // The two charges, as shot under his feet: loaded, or coming back.
    if (o.pips) {
      for (let i = 0; i < BLUNDER_CHARGES; i++) {
        const px = c.x - 7 + i * 14, py = c.y + 34;
        tools.fillStyle(ctx.tint(MAG.scorch), 0.9);
        tools.fillCircle(px, py, 4.6);
        if (i < st.charges) {
          tools.fillStyle(ctx.tint(MAG.gold), 1);
          tools.fillCircle(px, py, 3.2);
        } else if (i === st.charges) {
          const k = Phaser.Math.Clamp(1 - (st.rechargeAt - elapsed) / BLUNDER_RECHARGE_MS, 0, 1);
          tools.lineStyle(1.8, ctx.tint(MAG.lava), 1);
          tools.beginPath();
          tools.arc(px, py, 3.4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
          tools.strokePath();
        }
      }
    }
  });

  return { fx, av, st, bodies, hooks, body, pool, shove, hurt, aimAt, dodge, blast, draw, fireHot, click, orb };
}

/** Walk the pirate somewhere at an even pace. */
function walk(ctx: PreviewCtx, to: Pt, ms: number): void {
  ctx.glideCaster({ to, ms, ease: 'linear' });
}

// ══ CLICK — Blunderblast ══════════════════════════════════════════════

export const blunderblast: PreviewScript = {
  duration: 9500,
  scale: 0.9,
  bodyTexture: BODY,
  caption: 'Click — 8 pellets at 4 each, 2 charges back in 3s apiece; out of a dodge, the recoil throws you 240px',
  run(ctx) {
    const s = stage(ctx, { pips: true });
    const home = { x: ctx.cx + 30, y: ctx.cy };
    ctx.moveCaster(home.x, home.y);
    const foe = s.body(home.x + 200, ctx.cy);
    s.aimAt(foe);

    // Both charges, standing still: two spreads and no kick.
    ctx.at(700, () => s.blast(foe));
    ctx.at(1300, () => s.blast(foe));
    // The first charge is back at 3.7s. Roll in, and fire inside the window: the kick.
    ctx.at(4100, () => { s.aimAt(foe); s.dodge(80); });
    ctx.at(4350, () => s.blast(foe));
    ctx.at(5300, () => walk(ctx, home, 1300));
    ctx.at(6700, () => s.aimAt(foe));
    // And the second, on his feet again.
    ctx.at(7400, () => s.blast(foe));
  },
};

// ══ E — Hotshot ═══════════════════════════════════════════════════════

export const hotshot: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  bodyTexture: BODY,
  caption: 'E — two flintlocks: the next two clicks are instant shots for 26 at the first enemy on the line',
  run(ctx) {
    const s = stage(ctx, { pips: true });
    const near = s.body(ctx.cx + 250, ctx.cy);
    // Standing directly behind: on the line, and never the one that is hit.
    const far = s.body(ctx.cx + 400, ctx.cy);
    s.aimAt(near);

    ctx.at(600, () => s.draw());
    ctx.at(1700, () => s.click(far));
    ctx.at(2700, () => s.click(far));
    // Both spent: the same click is the blunderbuss again, and its charges were never touched.
    ctx.at(4300, () => s.click(near));
  },
};

// ══ R — Nice Hot Drink ════════════════════════════════════════════════

export const niceHotDrink: PreviewScript = {
  duration: 11800,
  scale: 0.9,
  bodyTexture: BODY,
  caption: 'R — Numb for 5s: nothing hurts. Then 80% of it comes back as a burn over 4s',
  run(ctx) {
    const s = stage(ctx);
    const { fx, av, st } = s;
    const foe = s.body(ctx.cx + 250, ctx.cy);
    s.aimAt(foe);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const d = { chugFrom: -9999, numbUntil: 0, live: false, bank: 0, hangLeft: 0, hangTotal: 0, hangRate: 0, hangAcc: 0 };

    /** A hit arriving on the pirate: banked while he is numb, felt when he is not. */
    const struck = (): void => {
      const c = ctx.casterAt();
      if (st.t < d.numbUntil) {
        d.bank += FOE_SHOT_DMG;
        fx.ember(c.x, c.y, 4, 24, 380, PIR.numb);
      } else {
        num(ctx, c.x, c.y - 30, FOE_SHOT_DMG, 15);
      }
    };

    ctx.at(500, () => {
      const c = ctx.casterAt();
      d.chugFrom = st.t;
      d.numbUntil = st.t + NUMB_MS;
      d.bank = 0;
      d.live = true;
      av.play('raise');
      fx.ember(c.x, c.y - 10, 12, 30, 640, MAG.gold);
      fx.shock(c.x, c.y, 10, 46, PIR.numb, 460);
    });
    // Five hits inside the five seconds. None of them lands; all of them are counted.
    for (const at of [1100, 2000, 2900, 3800, 4700]) ctx.at(at, () => s.orb(foe, struck));
    // And one after the bill is paid, which he feels at once.
    ctx.at(10100, () => s.orb(foe, struck));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      const c = ctx.casterAt();
      g.clear();

      if (d.live && elapsed >= d.numbUntil) {
        d.live = false;
        const owed = Math.round(d.bank * HANGOVER_SHARE);
        d.bank = 0;
        if (owed > 0) {
          d.hangLeft = owed;
          d.hangTotal = owed;
          d.hangRate = owed / (HANGOVER_MS / 1000);
          d.hangAcc = 0;
          fx.shock(c.x, c.y, 44, 14, MAG.pendantLit, 420);
          fx.smoke(c.x, c.y - 10, 5, 800);
        }
      }
      // The bill, paid at its rate and shown a second's worth at a time.
      if (d.hangLeft > 0) {
        const pay = Math.min(d.hangLeft, d.hangRate * dt);
        d.hangLeft -= pay;
        d.hangAcc += pay;
        if (d.hangLeft <= 0.001) { d.hangLeft = 0; d.hangAcc = Math.round(d.hangAcc); }
        if (d.hangAcc >= d.hangRate || (d.hangLeft <= 0 && d.hangAcc >= 1)) {
          const shown = Math.round(Math.min(d.hangAcc, d.hangRate));
          d.hangAcc -= shown;
          num(ctx, c.x + (Math.random() - 0.5) * 18, c.y - 30, shown, 15);
        }
      }

      if (elapsed < d.numbUntil) {
        numbHaze(g, ctx.tint, c.x, c.y, t, (d.numbUntil - elapsed) / NUMB_MS, Phaser.Math.Clamp(d.bank / 120, 0, 1));
      } else if (d.hangLeft > 0) {
        hangoverThrob(g, ctx.tint, c.x, c.y, t, d.hangLeft / Math.max(1, d.hangTotal));
      }
      const chug = (elapsed - d.chugFrom) / CHUG_MS;
      if (chug >= 0 && chug < 1) {
        hotDrink(g, ctx.tint, c.x + 13, c.y - 16 - Math.sin(chug * Math.PI) * 5, Math.sin(chug * Math.PI), t);
      }
    });
  },
};

// ══ F — Unstable Core ═════════════════════════════════════════════════

interface Rock { x: number; y: number; vx: number; vy: number; until: number; seed: number; spin: number }

export const unstableCore: PreviewScript = {
  duration: 12500,
  scale: 0.9,
  bodyTexture: BODY,
  caption: 'F — a 100 HP core that takes every hit its host takes; at zero it erupts for 5s, then blows for 45',
  run(ctx) {
    const s = stage(ctx, { pips: true });
    const { fx, av, st } = s;
    const host = s.body(ctx.cx + 84, ctx.cy);
    host.hold = true;
    const other = s.body(ctx.cx + 300, ctx.cy - 48);
    s.aimAt(host);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const rocks: Rock[] = [];
    const core = {
      on: false, gone: false, hp: CORE_HP, eruptFrom: 0, eruptUntil: 0, eruptX: 0,
      nextPoolAt: 0, nextRockAt: 0, rockAng: 1.1, burnAcc: 0, flashUntil: 0, seed: 31,
    };
    const holding = (): boolean => core.on && !core.gone && core.eruptUntil <= 0;

    // Whatever the host takes, from anything, the core takes too.
    s.hooks.onHurt = (b, amount) => {
      if (b !== host || !holding()) return;
      core.hp -= amount;
      core.flashUntil = st.t + 110;
      fx.ember(host.x, host.y - 30, Math.min(8, 1 + Math.round(amount / 3)), 16, 380, MAG.gold);
    };

    /** Every shot knocks the host back a little, so he steps in to stay on top of them. */
    const close = (): void => {
      if (!holding()) return;
      walk(ctx, { x: host.x - 82, y: host.y }, 260);
    };
    const shoot = (): void => { if (holding()) s.click(host); };

    ctx.at(500, () => {
      core.on = true;
      av.play('slam', Math.atan2(host.y - ctx.cy, host.x - ctx.cx));
      fx.shock(host.x, host.y, 34, 12, MAG.gold, 300);
      fx.ember(host.x, host.y, 10, 26, 520);
    });
    // Both barrels, both pistols: every one of those points comes off the shell as well.
    ctx.at(1300, shoot);
    ctx.at(1650, close);
    ctx.at(2000, shoot);
    ctx.at(2350, close);
    ctx.at(2700, () => { if (holding()) s.draw(); });
    ctx.at(3300, shoot);
    ctx.at(3650, close);
    ctx.at(4000, shoot);
    // A thin spread can leave a sliver of shell: the charge that has come back finishes it.
    ctx.at(4500, close);
    ctx.at(4850, shoot);

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      g.clear();

      // Rocks fly whether or not the core is still there.
      for (let i = rocks.length - 1; i >= 0; i--) {
        const r = rocks[i];
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.spin += dt * 6;
        if (elapsed >= r.until) { rocks.splice(i, 1); continue; }
        const victim = s.bodies.find((b) => b !== host && dist(r, b) <= ROCK_HIT_R);
        if (victim) {
          s.hurt(victim, ROCK_DMG);
          fx.ember(r.x, r.y, 5, 18, 480);
          rocks.splice(i, 1);
          continue;
        }
        lavaRock(g, ctx.tint, r.x, r.y, 6, r.spin, r.seed);
      }
      if (!core.on || core.gone) return;
      const at = { x: host.x, y: host.y - 30 };

      if (core.eruptUntil <= 0 && core.hp <= 0) {
        core.hp = 0;
        core.eruptFrom = elapsed;
        core.eruptUntil = elapsed + CORE_ERUPT_MS;
        core.eruptX = host.x;
        core.nextPoolAt = elapsed;
        core.nextRockAt = elapsed + 120;
        fx.erupt(at.x, at.y, 46, MAG.white);
        fx.shock(at.x, at.y, 12, 70, MAG.gold, 460);
        // The pirate gets out from under it; somebody else is standing where the host will run.
        walk(ctx, { x: Math.max(40, host.x - 150), y: host.y }, 700);
        other.homeX = host.x + 100;
        other.homeY = host.y - 48;
      }

      if (core.eruptUntil > 0) {
        if (elapsed >= core.eruptUntil) {
          // The blast: the host, and anyone within 130px of them.
          core.gone = true;
          fx.erupt(host.x, host.y, CORE_BLAST_R * 0.8, MAG.magma);
          fx.shock(host.x, host.y, 18, CORE_BLAST_R, MAG.white, 620);
          fx.crack(host.x, host.y, CORE_BLAST_R * 0.6);
          fx.smoke(host.x, host.y, 12, 1200);
          for (const b of s.bodies) {
            if (b !== host && dist(b, host) > CORE_BLAST_R) continue;
            s.hurt(b, CORE_BLAST_DMG, 18);
            if (b !== host) s.shove(b, Math.atan2(b.y - host.y, b.x - host.x), CORE_BLAST_SHOVE);
          }
          s.pool(host.x, host.y);
          return;
        }
        // The host runs — out and back — and the lava follows them.
        const u = (elapsed - core.eruptFrom) / CORE_ERUPT_MS;
        host.x = core.eruptX + Math.sin(u * Math.PI) * 170;
        core.burnAcc += CORE_BURN_DPS * dt;
        if (core.burnAcc >= CORE_BURN_DPS) { core.burnAcc -= CORE_BURN_DPS; s.hurt(host, CORE_BURN_DPS); }
        if (elapsed >= core.nextPoolAt) {
          core.nextPoolAt = elapsed + CORE_POOL_MS;
          s.pool(host.x, host.y, CORE_POOL_R, CORE_POOL_LIFE_MS);
        }
        if (elapsed >= core.nextRockAt) {
          core.nextRockAt = elapsed + CORE_ROCK_MS;
          core.rockAng += 2.39996;
          const a = core.rockAng + (Math.random() - 0.5) * 0.4;
          rocks.push({
            x: at.x + Math.cos(a) * 10, y: at.y + Math.sin(a) * 10,
            vx: Math.cos(a) * ROCK_SPEED, vy: Math.sin(a) * ROCK_SPEED,
            until: elapsed + ROCK_LIFE_MS, seed: Math.random() * 999, spin: Math.random() * Math.PI * 2,
          });
          fx.ember(at.x, at.y, 2, 12, 300, MAG.gold);
        }
      }

      const erupt = core.eruptUntil > 0 ? Phaser.Math.Clamp((elapsed - core.eruptFrom) / CORE_ERUPT_MS, 0.001, 1) : 0;
      paintCore(g, ctx.tint, host.x, host.y - 30, 11, core.hp / CORE_HP, erupt, t, core.seed);
      if (core.flashUntil > elapsed) {
        g.fillStyle(ctx.tint(MAG.white), ((core.flashUntil - elapsed) / 110) * 0.55);
        g.fillCircle(host.x, host.y - 30, 16);
      }
      // Its gauge: the shell while it holds, the eruption's clock once it does not.
      pressureGauge(g, ctx.tint, host.x, host.y - 52, 40,
        erupt > 0 ? 1 - erupt : core.hp / CORE_HP, erupt > 0 ? MAG.white : MAG.magma);
    });
  },
};

// ══ Q — Limoncello ════════════════════════════════════════════════════

interface Gun { readyAt: number; fuseFrom: number; fireAt: number; firedAt: number; ang: number; hover: boolean }
interface Ball { x0: number; y0: number; tx: number; ty: number; from: number; landAt: number; seed: number }

export const limoncello: PreviewScript = {
  duration: 13000,
  scale: 0.72,
  bodyTexture: BODY,
  caption: 'Q — a galleon with 200 hull: light a gun for 36 on its third of the arena, blast the anchor for 24 on its chain',
  run(ctx) {
    const s = stage(ctx);
    const { fx, av, st } = s;
    // The box is a good deal smaller than the arena, so the ship — and everything measured
    // along her: gun positions, the chain, the anchor's speeds — is drawn at this scale.
    // Fighters, pools and blast radii stay full size.
    const K = 0.6;
    const W = SHIP_W * K, H = SHIP_H * K;
    const ship = { x: ctx.w / 2, y: 46, hp: SHIP_HP, riseFrom: -1, flashUntil: 0, seed: 7 };
    const gunAt = (i: number): Pt => ({ x: ship.x + CANNON_AT[i][0] * K, y: ship.y + CANNON_AT[i][1] * K });
    const hawse = { x: ship.x + HAWSE_AT[0] * K, y: ship.y + HAWSE_AT[1] * K };
    const rest = { x: ship.x + ANCHOR_REST[0] * K, y: ship.y + ANCHOR_REST[1] * K };
    const chain = CHAIN_LEN * K;
    const bow = { x: ship.x + W * 0.36, y: ship.y };
    const guns: Gun[] = CANNON_AT.map(() => ({ readyAt: 0, fuseFrom: 0, fireAt: 0, firedAt: -9999, ang: Math.PI / 2, hover: false }));
    const anchor = {
      x: rest.x, y: rest.y, vx: 0, vy: 0, state: 'rest' as 'rest' | 'fly' | 'reel',
      flyUntil: 0, ang: Math.PI / 2, hitAt: new Map<Body, number>(),
    };
    const balls: Ball[] = [];
    const melt = { from: -1, x: ctx.cx, y: ctx.cy };

    // One enemy in the left third, for the stern gun; one in the right, standing exactly where
    // a blast from the bow sends the anchor.
    const port = s.body(ctx.w * 0.2, ctx.cy + 4);
    const line = Math.atan2(rest.y - bow.y, rest.x - bow.x);
    const star = s.body(rest.x + Math.cos(line) * 120, rest.y + Math.sin(line) * 120);

    const groundG = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const hullG = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const rigG = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    const topG = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    const up = (): boolean => ship.riseFrom >= 0 && st.t >= ship.riseFrom + RISE_MS;
    const aboard = (): boolean => {
      const c = ctx.casterAt();
      return up() && Math.abs(c.x - ship.x) <= W / 2 - 10 * K && Math.abs(c.y - ship.y) <= H / 2 - 2;
    };

    /** `cannonTarget`: the nearest enemy inside that gun's third, else the middle of it. */
    const targetOf = (i: number): Pt => {
      const third = ctx.w / CANNON_AT.length;
      const x0 = third * i;
      const from = gunAt(i);
      let best: Body | null = null;
      let bestD = Infinity;
      for (const b of s.bodies) {
        if (b.x < x0 || b.x > x0 + third) continue;
        const dd = dist(from, b);
        if (dd < bestD) { bestD = dd; best = b; }
      }
      if (best) return { x: best.x, y: best.y };
      return { x: x0 + third / 2, y: Phaser.Math.Clamp(ship.y + 300 * K, 20, ctx.h - 20) };
    };

    const light = (i: number): void => {
      const c = ctx.casterAt();
      const at = gunAt(i);
      const gun = guns[i];
      if (!up() || gun.fuseFrom > 0 || st.t < gun.readyAt) return;
      gun.fuseFrom = st.t;
      gun.fireAt = st.t + CANNON_FUSE_MS;
      gun.hover = false;
      av.play('punch', Math.atan2(at.y - c.y, at.x - c.x));
      fx.ember(at.x - 10, at.y - 6, 5, 10, 300, MAG.white);
    };

    const fire = (i: number): void => {
      const gun = guns[i];
      const at = gunAt(i);
      const aim = targetOf(i);
      const ang = Math.atan2(aim.y - at.y, aim.x - at.x);
      gun.ang = ang;
      gun.fuseFrom = 0;
      gun.firedAt = st.t;
      gun.readyAt = st.t + CANNON_RELOAD_MS;
      const mx = at.x + Math.cos(ang) * 28, my = at.y + Math.sin(ang) * 28;
      balls.push({ x0: mx, y0: my, tx: aim.x, ty: aim.y, from: st.t, landAt: st.t + BALL_FLIGHT_MS, seed: Math.random() * 999 });
      fx.erupt(mx, my, 40, MAG.white);
      fx.smoke(mx, my, 8, 900);
      fx.shock(mx, my, 8, 46, MAG.gold, 320);
    };

    const land = (b: Ball): void => {
      fx.erupt(b.tx, b.ty, BALL_R * 0.85, MAG.magma);
      fx.shock(b.tx, b.ty, 14, BALL_R, MAG.gold, 520);
      fx.crack(b.tx, b.ty, BALL_R * 0.6);
      fx.smoke(b.tx, b.ty, 8, 1000);
      for (const body of s.bodies) {
        if (dist(body, { x: b.tx, y: b.ty }) > BALL_R) continue;
        s.hurt(body, BALL_DMG, 18);
        s.shove(body, Math.atan2(body.y - b.ty, body.x - b.tx), BALL_SHOVE);
      }
      // One pool where it hit and the rest splashed round it.
      s.pool(b.tx, b.ty, POOL_R + 4);
      for (let i = 1; i < 3; i++) {
        const a = b.seed + (i / 2) * Math.PI * 2 + Math.random() * 0.8;
        s.pool(b.tx + Math.cos(a) * 42, b.ty + Math.sin(a) * 34);
      }
    };

    // A pellet that finds the anchor sends it where the shot was going.
    s.hooks.onPellet = (p) => {
      if (!up() || dist(p, anchor) > ANCHOR_R) return false;
      const sp = Math.max(1, Math.hypot(p.vx, p.vy));
      if (anchor.state !== 'fly') {
        anchor.state = 'fly';
        anchor.flyUntil = st.t + ANCHOR_FLY_MS;
        anchor.hitAt.clear();
        fx.crack(anchor.x, anchor.y, 30);
        fx.erupt(anchor.x, anchor.y, 30, MAG.gold);
      }
      anchor.vx += (p.vx / sp) * ANCHOR_PELLET_KICK * K;
      anchor.vy += (p.vy / sp) * ANCHOR_PELLET_KICK * K;
      const now = Math.hypot(anchor.vx, anchor.vy);
      const max = ANCHOR_MAX_SPEED * K;
      if (now > max) { anchor.vx *= max / now; anchor.vy *= max / now; }
      fx.ember(anchor.x, anchor.y, 4, 14, 320, MAG.white);
      return true;
    };

    /** `updateAnchor`: free flight inside the box and inside the chain, then hauled home. */
    const swing = (elapsed: number, dt: number): void => {
      const a = anchor;
      if (a.state === 'rest') { a.x = rest.x; a.y = rest.y; a.vx = 0; a.vy = 0; return; }
      if (a.state === 'reel') {
        const d = dist(a, rest);
        const step = ANCHOR_REEL_SPEED * K * dt;
        if (d <= step) {
          a.state = 'rest';
          a.x = rest.x; a.y = rest.y;
          fx.crack(rest.x, rest.y, 24);
          fx.ember(rest.x, rest.y, 6, 18, 420);
          return;
        }
        a.x += ((rest.x - a.x) / d) * step;
        a.y += ((rest.y - a.y) / d) * step;
        a.ang += dt * 9;
        return;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      const drag = Math.max(0, 1 - 0.45 * dt);
      a.vx *= drag;
      a.vy *= drag;
      if (a.x < ANCHOR_R) { a.x = ANCHOR_R; a.vx = Math.abs(a.vx) * 0.75; }
      if (a.x > ctx.w - ANCHOR_R) { a.x = ctx.w - ANCHOR_R; a.vx = -Math.abs(a.vx) * 0.75; }
      if (a.y < ANCHOR_R) { a.y = ANCHOR_R; a.vy = Math.abs(a.vy) * 0.75; }
      if (a.y > ctx.h - ANCHOR_R) { a.y = ctx.h - ANCHOR_R; a.vy = -Math.abs(a.vy) * 0.75; }
      // The chain: the outward part of its velocity comes off and the rest carries it round.
      const dx = a.x - hawse.x, dy = a.y - hawse.y;
      const d = Math.hypot(dx, dy);
      if (d > chain) {
        const nx = dx / d, ny = dy / d;
        a.x = hawse.x + nx * chain;
        a.y = hawse.y + ny * chain;
        const out = a.vx * nx + a.vy * ny;
        if (out > 0) { a.vx -= out * nx; a.vy -= out * ny; }
      }
      const speed = Math.hypot(a.vx, a.vy);
      if (speed > 1) a.ang = Math.atan2(a.vy, a.vx);
      if (speed >= ANCHOR_MIN_HIT_SPEED * K) {
        for (const b of s.bodies) {
          if (dist(a, b) > ANCHOR_HIT_R) continue;
          if (elapsed < (a.hitAt.get(b) ?? 0)) continue;
          a.hitAt.set(b, elapsed + ANCHOR_HIT_GAP_MS);
          s.hurt(b, ANCHOR_DMG, 16);
          s.shove(b, a.ang, ANCHOR_SHOVE);
          fx.erupt(b.x, b.y, 30, MAG.gold);
        }
      }
      if (elapsed >= a.flyUntil || speed < 70 * K) a.state = 'reel';
    };

    /** An enemy's shot at the captain: the hull's while he stands on it, his when he does not. */
    const struck = (): void => {
      const c = ctx.casterAt();
      if (aboard()) {
        ship.hp -= FOE_SHOT_DMG;
        ship.flashUntil = st.t + 110;
        fx.ember(ship.x + (Math.random() - 0.5) * W * 0.7, ship.y + (Math.random() - 0.5) * H * 0.6, 4, 16, 420);
      } else {
        num(ctx, c.x, c.y - 30, FOE_SHOT_DMG, 15);
      }
    };

    // ── Into the floor ──
    ctx.at(500, () => {
      const c = ctx.casterAt();
      melt.from = st.t;
      melt.x = c.x; melt.y = c.y;
      av.play('raise');
      fx.splat(c.x, c.y, 30);
      fx.ember(c.x, c.y, 12, 30, 520, MAG.gold);
    });
    // ── The stern gun, at the enemy in its third ──
    ctx.at(1750, () => { walk(ctx, { x: gunAt(0).x + 30, y: ship.y - 4 }, 480); });
    ctx.at(2250, () => { s.aimAt(gunAt(0)); guns[0].hover = true; });
    ctx.at(2600, () => light(0));
    // ── The anchor, from the bow ──
    ctx.at(3300, () => walk(ctx, bow, 800));
    ctx.at(4200, () => s.aimAt(anchor));
    ctx.at(4600, () => s.blast(anchor));
    // ── The bow gun, while the anchor is still swinging ──
    ctx.at(5500, () => { s.aimAt(gunAt(2)); guns[2].hover = true; });
    ctx.at(5850, () => light(2));
    // ── On deck the hull takes it; off the deck he does ──
    ctx.at(8300, () => { s.aimAt(port); s.orb(port, struck); });
    ctx.at(9500, () => walk(ctx, { x: ship.x + 50, y: ctx.cy - 10 }, 1000));
    ctx.at(10600, () => s.aimAt(port));
    ctx.at(10900, () => s.orb(port, struck));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const t = elapsed / 1000;
      groundG.clear(); hullG.clear(); rigG.clear(); topG.clear();

      // Going under: rooted, fading, with the pool he melts into drawn over him.
      if (melt.from >= 0 && ship.riseFrom < 0) {
        if (elapsed < melt.from + MELT_MS) {
          const k = Phaser.Math.Clamp((elapsed - melt.from) / MELT_MS, 0, 1);
          ctx.moveCaster(melt.x, melt.y, { alpha: 1 - Phaser.Math.Clamp((elapsed - melt.from) / (MELT_MS * 0.7), 0, 1) });
          meltPuddle(topG, ctx.tint, melt.x, melt.y + 6, 30, 0.35 + k * 0.65, t, 7);
        } else {
          // …and up again on the ship.
          ship.riseFrom = elapsed;
          for (const gun of guns) gun.readyAt = elapsed + RISE_MS;
          ctx.moveCaster(ship.x - 40 * K, ship.y, { alpha: 1 });
          fx.erupt(ship.x, ship.y, 120 * K, MAG.magma);
          fx.shock(ship.x, ship.y, 30, W * 0.56, MAG.gold, 700);
          fx.smoke(ship.x, ship.y, 14, 1300);
          fx.splat(melt.x, melt.y, 34);
        }
      }
      if (ship.riseFrom < 0) return;

      // The hull burns itself down, shot at or not.
      ship.hp = Math.max(0, ship.hp - SHIP_DECAY_PER_S * dt);
      const rise = Phaser.Math.Clamp((elapsed - ship.riseFrom) / RISE_MS, 0, 1);
      if (rise < 1) meltPuddle(hullG, ctx.tint, ship.x, ship.y, W * 0.42, 1 - rise * 0.6, t, ship.seed);
      const flash = ship.flashUntil > elapsed ? (ship.flashUntil - elapsed) / 110 : 0;
      galleon(hullG, ctx.tint, ship.x, ship.y + (1 - rise) * 10, W, H, t, ship.hp / SHIP_HP, ship.seed, 'hull', rise, flash);
      galleon(rigG, ctx.tint, ship.x, ship.y + (1 - rise) * 10, W, H, t, ship.hp / SHIP_HP, ship.seed, 'rig', rise);
      if (rise < 1) return;

      guns.forEach((gun, i) => {
        if (gun.fuseFrom > 0 && elapsed >= gun.fireAt) fire(i);
        const at = gunAt(i);
        if (gun.fuseFrom <= 0) {
          const aim = targetOf(i);
          const want = Math.atan2(aim.y - at.y, aim.x - at.x);
          gun.ang += Phaser.Math.Angle.Wrap(want - gun.ang) * Math.min(1, dt * 5);
        }
        const loaded = Phaser.Math.Clamp(1 - (gun.readyAt - elapsed) / CANNON_RELOAD_MS, 0, 1);
        const fuse = gun.fuseFrom > 0 ? Phaser.Math.Clamp((elapsed - gun.fuseFrom) / CANNON_FUSE_MS, 0.001, 1) : 0;
        const recoil = Phaser.Math.Clamp(1 - (elapsed - gun.firedAt) / 260, 0, 1);
        deckCannon(hullG, ctx.tint, at.x, at.y, gun.ang, loaded, fuse, recoil, t, gun.hover);
      });
      pressureGauge(rigG, ctx.tint, ship.x, ship.y - H / 2 - 6, 96 * K, ship.hp / SHIP_HP, MAG.gold);

      swing(elapsed, dt);
      const reach = dist(hawse, anchor);
      const speed = Math.hypot(anchor.vx, anchor.vy);
      const hot = anchor.state === 'fly' ? Phaser.Math.Clamp(speed / (500 * K), 0.15, 1) : anchor.state === 'reel' ? 0.2 : 0;
      anchorChain(rigG, ctx.tint, hawse.x, hawse.y, anchor.x, anchor.y, Phaser.Math.Clamp((chain - reach) * 0.12, 0, 26), hot);
      shipAnchor(rigG, ctx.tint, anchor.x, anchor.y, anchor.state === 'rest' ? Math.PI / 2 : anchor.ang, hot, t, anchor.state === 'rest');

      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        if (elapsed >= b.landAt) { land(b); balls.splice(i, 1); continue; }
        const u = Phaser.Math.Clamp((elapsed - b.from) / BALL_FLIGHT_MS, 0, 1);
        impactMarker(groundG, ctx.tint, b.tx, b.ty, BALL_R, u, t);
        const lift = Math.sin(u * Math.PI);
        const x = Phaser.Math.Linear(b.x0, b.tx, u);
        const y = Phaser.Math.Linear(b.y0, b.ty, u) - lift * 70;
        const ang = Math.atan2((b.ty - b.y0) - Math.cos(u * Math.PI) * Math.PI * 70, b.tx - b.x0);
        moltenBall(rigG, ctx.tint, x, y, 13 + lift * 6, ang, t, b.seed);
      }
    });
  },
};

// ══ PASSIVE — Lava On The Floor ═══════════════════════════════════════

export const lavaOnTheFloor: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  bodyTexture: BODY,
  caption: 'Passive — a pool burns for 24 a second; three of them on one spot still burn for 24, and stepping out stops it',
  run(ctx) {
    const s = stage(ctx);
    const one = s.body(ctx.cx + 170, ctx.cy);
    const three = s.body(ctx.cx + 400, ctx.cy);
    s.aimAt(one);

    // One pool under the first, three stacked under the second: the same number off both.
    ctx.at(600, () => {
      s.pool(one.x, one.y);
      s.pool(three.x - 14, three.y + 4);
      s.pool(three.x + 14, three.y + 4);
      s.pool(three.x, three.y - 10);
    });
    // The first walks out, and the burn stops where the lava does.
    ctx.at(2800, () => { one.homeY = ctx.cy - 70; });
    // The pools skin over and are gone at 5 seconds; nothing is left to stand in.
    ctx.at(6400, () => { one.homeY = ctx.cy; });
  },
};

// ══ PASSIVE — The Roll-Shot ═══════════════════════════════════════════

export const theRollShot: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  bodyTexture: BODY,
  caption: 'Passive — a Blunderblast inside 700ms of a dodge throws you 240px back; any other blast leaves you where you stand',
  run(ctx) {
    const s = stage(ctx, { pips: true });
    const home = { x: ctx.cx + 40, y: ctx.cy };
    ctx.moveCaster(home.x, home.y);
    const foe = s.body(home.x + 260, ctx.cy);
    s.aimAt(foe);

    // Standing: no kick.
    ctx.at(700, () => s.blast(foe));
    // A dodge, and then too long a wait: the ring goes out at 700ms, and the blast does not kick.
    ctx.at(2200, () => s.dodge(80));
    ctx.at(3150, () => s.blast(foe));
    ctx.at(3700, () => walk(ctx, home, 900));
    // A dodge and a blast straight out of it: thrown 240px the other way over 380ms.
    ctx.at(5000, () => { s.aimAt(foe); s.dodge(80); });
    ctx.at(5250, () => s.blast(foe));
    ctx.at(6100, () => walk(ctx, home, 1300));
    // A new dodge is a new kick.
    ctx.at(7700, () => { s.aimAt(foe); s.dodge(80); });
    ctx.at(7950, () => s.blast(foe));
    ctx.at(8900, () => walk(ctx, home, 1300));
    ctx.at(10300, () => s.aimAt(foe));
  },
};
