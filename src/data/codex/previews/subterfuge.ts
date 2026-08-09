import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  SUB, SubterfugeAvatar, SubterfugeFx, banknoteLayered, cigaretteShape, discoBallShape,
  smokeBank, stiletto,
} from '../../../elements/kits/SubterfugeVisuals';

/**
 * Subterfuge's showcases.
 *
 * The thing that has to be legible in every loop is the **wallet**. Nothing in this element
 * regenerates or cools down — it is bought, out of three banknotes hovering over his head — so a
 * preview without the notes in frame is documenting an element where the abilities are free,
 * which is the opposite of what this one is. Every script that spends money shows it leaving.
 *
 * Subterfuge puts no sprite in the world: daggers, recruits, banknotes, the smoke, the cigarette
 * and the disco ball are every one of them Graphics repainted per frame out of
 * `SubterfugeVisuals`, and the Spray is hitscan, so `ctx.fly` is useless throughout.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `SubterfugeFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const MONEY_MAX = 3;
const MONEY_MAX_MASTERY = 4;
const MONEY_TICK_MS = 5000;

const DAGGER_SPEED = 900;
const DAGGER_THROW_DMG = 8;
const DAGGER_RETURN_DMG = 12;
const DAGGER_MAX = 3;
const ORBIT_MS = 10000;
const ORBIT_DMG = 12;
const ORBIT_RADIUS = 48;
const ORBIT_RAD_PER_SEC = 2.6;

const SPRAY_CONE_HALF = Phaser.Math.DegToRad(7.5);
const SPRAY_DMG = 2;
const SPRAY_INTERVAL_MS = 80;
const SPRAY_RANGE = 520;
const BULLETS_MAX = 50;
const BULLETS_MAX_UPG = 75;
const BULLETS_RELOAD = 25;
const AMMO_PER_10_DMG = 3;
const SPRAY_FOCUS_FULL_MS = 8000;

const LACKEY_LOYALTY_MS = 20000;
const LACKEY_DMG = 1;
const RUNNER_QUIT_MONEY = 2;
const THUG_DMG = 12;
const THUG_STUN_MS = 2000;
const SPEC_PELLETS = 5;
const SPEC_PELLET_DMG = 2;
const XP_PER_LEVEL = 50;
const XP_PER_BRIBE = 10;

const BRIBE_MS = 8000;
const BRIBE_DMG_MULT = 0.75;

const TREACHERY_DELAY_MS = 2000;
const RETAINER_MS = 8000;
const RETAINER_COST = 2;

const BOOM_RADIUS = 96;
const BOOM_DAMAGE = 10;

const CIG_BURN_MS = 25000;
const CIG_DAMAGE_MULT = 0.75;
const SMOKE_CLOUD_MS = 8000;
const SMOKE_CLOUD_RADIUS = 132;
const SMOKE_LOYALTY_DRAIN_MULT = 0.4;

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

// ── Click — Molecular Cutter ──────────────────────────────────────────

function daggerLoop(ctx: PreviewCtx, opts: { dance: boolean; boom: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.66, y: ctx.h * 0.5 };
  dummy(ctx, foe);
  let bullets = 25;
  magazine(ctx, s.at, () => bullets);

  interface Dagger {
    x: number; y: number; dx: number; dy: number; destX: number; destY: number;
    state: 'flying' | 'planted' | 'returning'; color: number; hit: boolean;
    fromX: number; fromY: number; boomed: boolean; gone: boolean;
  }
  const daggers: Dagger[] = [];
  interface Orbiter { angle: number; until: number; color: number }
  const orbiters: Orbiter[] = [];
  interface Boom { x: number; y: number; born: number }
  const booms: Boom[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_AIR));

  const throwOne = (tx: number, ty: number, i: number): void => {
    const a = Math.atan2(ty - ctx.cy, tx - ctx.cx);
    daggers.push({
      x: ctx.cx, y: ctx.cy, dx: Math.cos(a), dy: Math.sin(a), destX: tx, destY: ty,
      state: 'flying', color: i % 2 === 0 ? SUB.scarlet : SUB.steelHi,
      hit: false, fromX: 0, fromY: 0, boomed: false, gone: false,
    });
    s.av.play('punch', a);
  };

  ctx.onFrame((dt, elapsed) => {
    const step = dt / 1000;
    const t = elapsed / 1000;
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
        if (dist <= 18) {
          d.gone = true;
          // Sonic Boom: it got home ahead of its own noise, which lands where it left.
          if (opts.boom && !d.boomed) {
            booms.push({ x: d.fromX, y: d.fromY, born: elapsed });
            d.boomed = true;
          }
          if (opts.dance) {
            orbiters.push({ angle: Math.random() * Math.PI * 2, until: elapsed + ORBIT_MS, color: d.color });
            tick(ctx, ctx.cx, ctx.cy - 34, '🗡️ BLADE DANCE', SUB.steelHi);
          }
          continue;
        }
      }
      // The hit, on the way out or on the way home — the recall is worth half again as much.
      if (!d.hit && d.state !== 'planted'
        && Phaser.Math.Distance.Between(d.x, d.y, foe.x, foe.y) <= 20) {
        d.hit = true;
        const dmg = d.state === 'returning' ? DAGGER_RETURN_DMG : DAGGER_THROW_DMG;
        s.fx.cut(foe.x, foe.y, Math.atan2(d.dy, d.dx), dmg > DAGGER_THROW_DMG ? 42 : 30,
          { color: d.color, scores: dmg > DAGGER_THROW_DMG ? 3 : 2, depth: D_AIR });
        tick(ctx, foe.x + (Math.random() - 0.5) * 18, foe.y - 14, `${dmg}`, d.color);
        // Kickbacks: 3 rounds for every 10 damage the blades deal.
        const gained = Math.floor((dmg / 10) * AMMO_PER_10_DMG);
        bullets = Math.min(BULLETS_MAX, bullets + gained);
        if (gained > 0) tick(ctx, ctx.cx, ctx.cy - 52, `+${gained} 🔫`, SUB.brass);
        if (opts.boom && d.state === 'returning' && !d.boomed) {
          booms.push({ x: foe.x, y: foe.y, born: elapsed });
          d.boomed = true;
        }
      }
      SubterfugeFx.drawDagger(g, ctx.tint, d.x, d.y, Math.atan2(d.dy, d.dx), d.state, d.color, t, 1);
    }

    for (let i = orbiters.length - 1; i >= 0; i--) {
      const o = orbiters[i];
      if (elapsed >= o.until) { orbiters.splice(i, 1); continue; }
      o.angle += ORBIT_RAD_PER_SEC * step;
      const ox = ctx.cx + Math.cos(o.angle) * ORBIT_RADIUS;
      const oy = ctx.cy + Math.sin(o.angle) * ORBIT_RADIUS;
      SubterfugeFx.drawOrbitDagger(g, ctx.tint, ox, oy, o.angle + Math.PI / 2, o.color,
        (o.until - elapsed) / ORBIT_MS, 1);
    }

    for (let i = booms.length - 1; i >= 0; i--) {
      const b = booms[i];
      const k = (elapsed - b.born) / 420;
      if (k >= 1) { booms.splice(i, 1); continue; }
      g.lineStyle(3 * (1 - k), ctx.tint(SUB.steelHi), 1 - k);
      g.strokeCircle(b.x, b.y, BOOM_RADIUS * 0.5 * k);
      g.lineStyle(1.4 * (1 - k), ctx.tint(SUB.scarlet), (1 - k) * 0.8);
      g.strokeCircle(b.x, b.y, BOOM_RADIUS * 0.5 * k * 0.7);
    }
  });

  // Three thrown, planted around them, then all three recalled at once.
  const spots: Mark[] = [
    { x: ctx.w * 0.82, y: ctx.h * 0.28 },
    { x: ctx.w * 0.86, y: ctx.h * 0.72 },
    { x: ctx.w * 0.56, y: ctx.h * 0.82 },
  ];
  spots.forEach((sp, i) => ctx.at(500 + i * 600, () => throwOne(sp.x, sp.y, i)));
  ctx.at(2600, () => {
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
    tick(ctx, ctx.cx, ctx.cy - 34, 'RECALL!', SUB.scarlet);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.boom ? `${BOOM_DAMAGE} in a ${BOOM_RADIUS}px ring wherever the blade was standing, plus a hard shove`
      : opts.dance ? `15% per blade home · ${ORBIT_DMG} on contact, ${ORBIT_MS / 1000}s, and it survives the hit`
        : `${DAGGER_THROW_DMG} out, ${DAGGER_RETURN_DMG} back, ${DAGGER_MAX} at once · every point is ammunition`,
    SUB.ash);
}

export const cutter: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Click — three blades planted, then all three recalled through anything in the way',
  run(ctx) { daggerLoop(ctx, { dance: false, boom: false }); },
};

export const cutterUpgraded: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'Blade Dance — 15% of the blades that make it home keep turning around you for 10 seconds',
  run(ctx) { daggerLoop(ctx, { dance: true, boom: false }); },
};

// ── E — Spray ─────────────────────────────────────────────────────────

function sprayLoop(ctx: PreviewCtx, opts: { steady: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.82, y: ctx.h * 0.46 };
  dummy(ctx, foe);
  const max = opts.steady ? BULLETS_MAX_UPG : BULLETS_MAX;
  let bullets = 6;
  let money = 2;
  wallet(ctx, s.at, () => money);
  magazine(ctx, s.at, () => bullets, { max });

  let firingFrom = -1;
  let nextShot = 0;
  const cone = ctx.adopt(ctx.scene.add.graphics().setDepth(D_GROUND));
  ctx.onFrame((_dt, elapsed) => {
    cone.clear();
    if (firingFrom < 0) return;
    // Steady Hands: the cone closes continuously over 8s of unbroken fire.
    const focus = opts.steady ? Phaser.Math.Clamp((elapsed - firingFrom) / SPRAY_FOCUS_FULL_MS, 0, 1) : 0;
    const half = SPRAY_CONE_HALF * (1 - focus);
    const a = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx);
    cone.fillStyle(ctx.tint(SUB.crimson), 0.1);
    cone.beginPath();
    cone.moveTo(ctx.cx, ctx.cy);
    cone.arc(ctx.cx, ctx.cy, SPRAY_RANGE * 0.5, a - half, a + half, false);
    cone.closePath();
    cone.fillPath();
  });

  ctx.at(400, () => { firingFrom = 400; s.av.setHold('spray'); });
  ctx.onFrame((_dt, elapsed) => {
    if (firingFrom < 0 || elapsed < nextShot) return;
    nextShot = elapsed + SPRAY_INTERVAL_MS;
    if (bullets <= 0) {
      if (elapsed % 600 < SPRAY_INTERVAL_MS * 1.5) tick(ctx, ctx.cx, ctx.cy - 40, 'EMPTY', SUB.scarlet);
      return;
    }
    bullets--;
    const focus = opts.steady ? Phaser.Math.Clamp((elapsed - firingFrom) / SPRAY_FOCUS_FULL_MS, 0, 1) : 0;
    const half = SPRAY_CONE_HALF * (1 - focus);
    const a = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx) + (Math.random() - 0.5) * half * 2;
    const ex = ctx.cx + Math.cos(a) * SPRAY_RANGE * 0.5;
    const ey = ctx.cy + Math.sin(a) * SPRAY_RANGE * 0.5;
    s.fx.tracer(ctx.cx, ctx.cy, ex, ey, { color: SUB.brass, depth: D_AIR, duration: 90, width: 1.4 });
    // Hitscan: it either was pointed at them or it was not.
    const perp = Math.abs(Phaser.Math.Angle.Wrap(a - Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx)))
      * Phaser.Math.Distance.Between(ctx.cx, ctx.cy, foe.x, foe.y);
    if (perp > 18) return;
    tick(ctx, foe.x + (Math.random() - 0.5) * 20, foe.y - 12, `${SPRAY_DMG}`, SUB.brass);
  });

  // Out of rounds, so the wallet buys 25 more. There is no free reload anywhere in the kit.
  ctx.at(opts.steady ? 5200 : 3000, () => {
    if (bullets > 0) return;
    money -= 1;
    bullets = BULLETS_RELOAD;
    s.fx.cash(ctx.cx, ctx.cy - 30, 4, { depth: D_AIR, seal: SUB.crimson });
    tick(ctx, ctx.cx, ctx.cy - 40, `💵 −1 · +${BULLETS_RELOAD} ROUNDS`, SUB.gold);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.steady ? `${BULLETS_MAX_UPG} rounds, and the 15° cone closes to nothing over ${SPRAY_FOCUS_FULL_MS / 1000}s of unbroken fire`
      : `${SPRAY_DMG} a round every ${SPRAY_INTERVAL_MS}ms in a 15° cone · a reload is 1 money for ${BULLETS_RELOAD}`,
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
  caption: 'Steady Hands — 75 rounds, and the cone closes to perfect accuracy over eight seconds',
  run(ctx) { sprayLoop(ctx, { steady: true }); },
};

// ── R — Recruit ───────────────────────────────────────────────────────

type RecruitType = 'lackey' | 'runner' | 'thug' | 'specialist';

function recruitLoop(ctx: PreviewCtx, opts: { rolodex: boolean; hardened: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.84, y: ctx.h * 0.34 };
  dummy(ctx, foe);
  let money = 3;
  wallet(ctx, s.at, () => money);

  interface Recruit {
    x: number; y: number; type: RecruitType; loyalty: number; maxLoyalty: number;
    level: number; xp: number; nextShot: number;
  }
  const crew: Recruit[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
  const bars = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD + 1));

  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    const step = dt / 1000;
    g.clear();
    bars.clear();
    for (let i = crew.length - 1; i >= 0; i--) {
      const r = crew[i];
      // Level slows the drain by 8% a level above the first.
      const drain = opts.hardened ? 1 - 0.08 * (r.level - 1) : 1;
      r.loyalty -= dt * drain;
      if (opts.hardened) {
        r.xp += step;
        if (r.xp >= XP_PER_LEVEL * r.level && r.level < 5) {
          r.level++;
          tick(ctx, r.x, r.y - 30, `${['', 'I', 'II', 'III', 'IV', 'V'][r.level]}`, SUB.gold);
        }
      }
      if (r.loyalty <= 0) {
        crew.splice(i, 1);
        s.fx.smoke(r.x, r.y, 5, { depth: D_WORLD, color: SUB.ash });
        if (r.type === 'runner') {
          money = Math.min(MONEY_MAX, money + RUNNER_QUIT_MONEY);
          s.fx.payment(r.x, r.y, ctx.cx, ctx.cy, { count: 4, depth: D_AIR });
          tick(ctx, r.x, r.y - 24, `💵 +${RUNNER_QUIT_MONEY}`, SUB.gold);
        } else {
          tick(ctx, r.x, r.y - 24, 'QUIT', SUB.ashDark);
        }
        continue;
      }

      // Where they want to be — a runner sprints the room, everybody else works the enemy.
      const want: Mark = r.type === 'runner'
        ? { x: ctx.w * 0.5 + Math.cos(t * 1.6 + i) * ctx.w * 0.35, y: ctx.h * 0.5 + Math.sin(t * 1.6 + i) * ctx.h * 0.3 }
        : foe;
      const stand = r.type === 'thug' ? 40 : r.type === 'specialist' ? 90 : 170;
      const d = Phaser.Math.Distance.Between(r.x, r.y, want.x, want.y);
      const speed = (r.type === 'runner' ? 280 : r.type === 'thug' ? 175 : r.type === 'specialist' ? 140 : 200)
        * (opts.hardened ? 1 + 0.1 * (r.level - 1) : 1);
      if (Math.abs(d - stand) > 8) {
        const dir = d > stand ? 1 : -1;
        r.x += ((want.x - r.x) / d) * speed * step * dir;
        r.y += ((want.y - r.y) / d) * speed * step * dir;
      }

      if (elapsed >= r.nextShot && r.type !== 'runner') {
        if (r.type === 'thug' && d <= 52) {
          r.nextShot = elapsed + 1800;
          s.fx.cut(foe.x, foe.y, Math.atan2(foe.y - r.y, foe.x - r.x), 40,
            { color: SUB.wood, scores: 2, depth: D_AIR });
          tick(ctx, foe.x, foe.y - 14, `${THUG_DMG}`, SUB.wood);
          tick(ctx, foe.x, foe.y - 32, `💫 ${(THUG_STUN_MS / 1000) * (opts.hardened && r.level >= 5 ? 2 : 1)}s`, SUB.haze);
        } else if (r.type === 'specialist' && d <= 240) {
          r.nextShot = elapsed + 500;
          const pellets = opts.hardened && r.level >= 5 ? 7 : SPEC_PELLETS;
          for (let k = 0; k < pellets; k++) {
            const a = Math.atan2(foe.y - r.y, foe.x - r.x) + (Math.random() - 0.5) * 0.38;
            s.fx.tracer(r.x, r.y, r.x + Math.cos(a) * 230 * 0.5, r.y + Math.sin(a) * 230 * 0.5,
              { color: SUB.navy, depth: D_AIR, duration: 90, width: 1.2 });
          }
          tick(ctx, foe.x, foe.y - 14, `${SPEC_PELLET_DMG * pellets}`, SUB.navy);
        } else if (r.type === 'lackey') {
          r.nextShot = elapsed + 140;
          const a = Math.atan2(foe.y - r.y, foe.x - r.x) + (Math.random() - 0.5) * 0.16;
          s.fx.tracer(r.x, r.y, r.x + Math.cos(a) * 280, r.y + Math.sin(a) * 280,
            { color: SUB.olive, depth: D_AIR, duration: 80, width: 1.1 });
          if (Math.random() < 0.5) tick(ctx, foe.x + (Math.random() - 0.5) * 16, foe.y - 10, `${LACKEY_DMG}`, SUB.olive);
        }
      }

      SubterfugeFx.drawRecruit(g, ctx.tint, r.x, r.y, Math.atan2(foe.y - r.y, foe.x - r.x), 11, t, 1,
        { type: r.type, inverted: opts.hardened && r.level >= 5, reloading: false, ignited: false, enemy: false });
      // The loyalty bar, which is the whole contract.
      const w = 22;
      bars.fillStyle(ctx.tint(SUB.ink), 0.8);
      bars.fillRect(r.x - w / 2 - 1, r.y - 22, w + 2, 4);
      bars.fillStyle(ctx.tint(SUB.gold), 0.95);
      bars.fillRect(r.x - w / 2, r.y - 21, w * Phaser.Math.Clamp(r.loyalty / r.maxLoyalty, 0, 1), 2);
    }
  });

  const hire = (at: number, type: RecruitType, cost: number): void => {
    ctx.at(at, () => {
      if (money < cost) { tick(ctx, ctx.cx, ctx.cy - 40, '💵 NOT ENOUGH', SUB.ashDark); return; }
      money -= cost;
      s.av.play('sweep', 0);
      s.fx.cash(ctx.cx, ctx.cy - 26, cost * 3, { depth: D_AIR, seal: SUB.crimson });
      const maxLoyalty = type === 'thug' ? 35000 : type === 'runner' ? 12000 : LACKEY_LOYALTY_MS;
      crew.push({
        x: ctx.cx + 26, y: ctx.cy + 18, type, loyalty: maxLoyalty, maxLoyalty,
        level: 1, xp: 0, nextShot: at + 400,
      });
      tick(ctx, ctx.cx, ctx.cy - 40, `💵 −${cost} · ${type.toUpperCase()}`, SUB.gold);
    });
  };

  if (!opts.rolodex) {
    hire(500, 'lackey', 1);
    hire(2600, 'lackey', 1);
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `1💵 · ${LACKEY_DMG} a pellet every 140ms · ${LACKEY_LOYALTY_MS / 1000}s of loyalty, and every hit taken costs 2 more`,
      SUB.ash);
    return;
  }

  hire(400, 'runner', 1);
  hire(2000, 'thug', 2);
  ctx.at(4600, () => { money = MONEY_MAX; });
  hire(4800, 'specialist', 3);
  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.hardened ? `+1 XP/s, +${XP_PER_BRIBE} a bribe, ${XP_PER_LEVEL} XP a level to V — speed, damage and slower drain each time`
      : 'runner 1💵 pays 2 back · thug 2💵 stuns · specialist 3💵 is armoured against projectiles',
    SUB.ash);
}

export const recruit: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'R — 1 money hires a Lackey for twenty seconds. Nothing here is summoned; it is bought',
  run(ctx) { recruitLoop(ctx, { rolodex: false, hardened: false }); },
};

export const recruitUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'The Rolodex — a hiring wheel of four: runner, thug and armoured specialist',
  run(ctx) { recruitLoop(ctx, { rolodex: true, hardened: false }); },
};

// ── F — Bribe ─────────────────────────────────────────────────────────

function bribeLoop(ctx: PreviewCtx, opts: { hardened: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.34 };
  dummy(ctx, foe);
  let money = 3;
  wallet(ctx, s.at, () => money);

  // One of your own, so both halves of the key are in frame.
  const hand: Mark = { x: ctx.w * 0.42, y: ctx.h * 0.76 };
  let loyalty = 8000;
  let level = 1;
  let xp = 0;
  let bribedUntil = -9999;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_WORLD));
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    loyalty = Math.max(0, loyalty - dt);
    SubterfugeFx.drawRecruit(g, ctx.tint, hand.x, hand.y, Math.atan2(foe.y - hand.y, foe.x - hand.x),
      11, t, 1, { type: 'lackey', inverted: opts.hardened && level >= 5, reloading: false, ignited: false, enemy: false });
    const w = 24;
    g.fillStyle(ctx.tint(SUB.ink), 0.8);
    g.fillRect(hand.x - w / 2 - 1, hand.y - 23, w + 2, 4);
    g.fillStyle(ctx.tint(SUB.gold), 0.95);
    g.fillRect(hand.x - w / 2, hand.y - 22, w * Phaser.Math.Clamp(loyalty / LACKEY_LOYALTY_MS, 0, 1), 2);
    if (opts.hardened) {
      g.fillStyle(ctx.tint(SUB.brass), 0.9);
      for (let i = 0; i < level; i++) g.fillRect(hand.x - 6 + i * 3, hand.y - 28, 1.4, 4);
    }
    // The censor bar, while they are bought off.
    if (elapsed >= bribedUntil) return;
    g.fillStyle(ctx.tint(SUB.ink), 0.95);
    g.fillRect(foe.x - 13, foe.y - 7, 26, 6);
    if (Math.random() < 0.06) s.fx.cash(foe.x, foe.y - 26, 1, { depth: D_AIR, gravity: 200 });
  });

  ctx.at(700, () => {
    money -= 1;
    s.av.play('punch', Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx));
    s.fx.payment(ctx.cx, ctx.cy, foe.x, foe.y, { count: 6, depth: D_AIR });
    bribedUntil = 700 + BRIBE_MS;
    tick(ctx, foe.x, foe.y - 30, `💵 BRIBED · −${Math.round((1 - BRIBE_DMG_MULT) * 100)}% DMG`, 0x66dd66);
    tick(ctx, foe.x, foe.y - 48, `${BRIBE_MS / 1000}s`, SUB.moneyGreen);
  });

  ctx.at(3000, () => {
    money -= 1;
    s.av.play('punch', Math.atan2(hand.y - ctx.cy, hand.x - ctx.cx));
    s.fx.payment(ctx.cx, ctx.cy, hand.x, hand.y, { count: 6, depth: D_AIR });
    loyalty = LACKEY_LOYALTY_MS * 1.2;
    tick(ctx, hand.x, hand.y - 26, '💵 LOYALTY +120%!', SUB.gold);
    if (!opts.hardened) return;
    xp += XP_PER_BRIBE;
    tick(ctx, hand.x, hand.y - 44, `+${XP_PER_BRIBE} XP`, SUB.brass);
  });
  if (opts.hardened) {
    for (let i = 0; i < 4; i++) {
      ctx.at(4200 + i * 900, () => {
        money = Math.min(MONEY_MAX, money);
        xp += XP_PER_BRIBE;
        level = Math.min(5, 1 + Math.floor(xp / XP_PER_LEVEL) + i);
        s.fx.payment(ctx.cx, ctx.cy, hand.x, hand.y, { count: 4, depth: D_AIR });
        tick(ctx, hand.x, hand.y - 30,
          `${['', 'I', 'II', 'III', 'IV', 'V'][level]}${level >= 5 ? ' · MADE MAN' : ''}`, SUB.gold);
      });
    }
  }

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.hardened ? `${XP_PER_BRIBE} XP a bribe is a fifth of a level for one note — the cheapest route to V`
      : 'the money physically crosses the gap · an enemy hits softer, one of yours works longer',
    SUB.ash);
}

export const bribe: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'F — 1 money. An enemy deals 25% less for 8s; your own recruit goes back to 120% loyalty',
  run(ctx) { bribeLoop(ctx, { hardened: false }); },
};

export const bribeUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Hardened Criminals — recruits earn levels, and being paid is the fastest way to earn them',
  run(ctx) { bribeLoop(ctx, { hardened: true }); },
};

// ── Q — Dark Treachery ────────────────────────────────────────────────

function treacheryLoop(ctx: PreviewCtx, opts: { retainer: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.76, y: ctx.h * 0.42 };
  dummy(ctx, foe);
  let money = 3;
  wallet(ctx, s.at, () => money);

  // The channel: two full seconds of black fog before anything happens at all.
  let channelFrom = -1;
  let retainerUntil = -9999;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_GROUND));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    if (channelFrom >= 0 && elapsed - channelFrom < TREACHERY_DELAY_MS) {
      const k = (elapsed - channelFrom) / TREACHERY_DELAY_MS;
      smokeBank(g, ctx.cx, ctx.cy, 26 + k * 26, 3, t, ctx.tint(SUB.ink), 0.55, 9);
      g.lineStyle(2, ctx.tint(SUB.crimson), 0.4 + 0.4 * Math.sin(t * 12));
      g.strokeCircle(ctx.cx, ctx.cy, 30 + k * 22);
    }
    if (elapsed >= retainerUntil) return;
    // The contract still on the books.
    g.lineStyle(1.4, ctx.tint(SUB.crimson), 0.35 + 0.3 * Math.sin(t * 6));
    g.strokeCircle(ctx.cx, ctx.cy, 34);
  });

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

  const steal = (at: number, cost: number, note: string): void => {
    ctx.at(at, () => {
      if (cost > 0) {
        money -= cost;
        tick(ctx, ctx.cx, ctx.cy - 40, `💵 −${cost} · ${note}`, SUB.gold);
      } else {
        channelFrom = at;
        s.av.play('raise', ctx.aim, 1100);
        tick(ctx, ctx.cx, ctx.cy - 40, '🕴️ DARK TREACHERY', SUB.crimson);
        tick(ctx, ctx.cx, ctx.cy - 58, `${TREACHERY_DELAY_MS / 1000}s CHANNEL`, SUB.ashDark);
      }
    });
    ctx.at(at + (cost > 0 ? 0 : TREACHERY_DELAY_MS), () => {
      channelFrom = -1;
      s.fx.deal(ctx.cx, ctx.cy, 60, { depth: D_AIR });
      balls.push({ x: ctx.w * 0.5, y: ctx.h * 0.24, born: at, next: at + 600 });
      tick(ctx, ctx.cx, ctx.cy - 40, '🪩 SOUND — DISCO BALL', SUB.neon);
      if (!opts.retainer || cost > 0) return;
      retainerUntil = at + TREACHERY_DELAY_MS + RETAINER_MS;
      tick(ctx, ctx.cx, ctx.cy - 58, `🤝 ON RETAINER — Q for ${RETAINER_COST}💵`, SUB.scarlet);
    });
  };

  steal(500, 0, '');
  if (opts.retainer) steal(4200, RETAINER_COST, 'RECAST · NO CHANNEL');

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.retainer ? `${RETAINER_MS / 1000}s to recast the exact same theft for ${RETAINER_COST}💵, with no second channel`
      : 'their ultimate, reinterpreted — Sound becomes a disco ball, Metal becomes 50 shield, Growth becomes two hires',
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
  caption: 'On Retainer — the contract stays open for 8s: tap Q again for 2 money and no channel',
  run(ctx) { treacheryLoop(ctx, { retainer: true }); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const dirtyMoney: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Two at the start, one more every five seconds, three at a time — and everything is bought',
  run(ctx) {
    const s = stageIt(ctx);
    let money = 2;
    let accum = 0;
    wallet(ctx, s.at, () => money);
    const clock = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 12, '', {
      fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(SUB.gold),
    }).setOrigin(0.5).setDepth(19));

    // Income at the real rate, and what it is spent on as it arrives.
    ctx.onFrame((dt) => {
      accum += dt;
      if (accum >= MONEY_TICK_MS) {
        accum -= MONEY_TICK_MS;
        if (money >= MONEY_MAX) {
          tick(ctx, ctx.cx, ctx.cy - 56, 'WASTED — WALLET FULL', SUB.ashDark);
        } else {
          money++;
          s.fx.cash(ctx.cx, ctx.cy - 40, 2, { depth: D_AIR, gravity: -60, seal: SUB.crimson });
          tick(ctx, ctx.cx, ctx.cy - 40, '💵 +1', SUB.gold);
        }
      }
      clock.setText(`next note in ${((MONEY_TICK_MS - accum) / 1000).toFixed(1)}s`);
    });

    const buys: Array<{ at: number; cost: number; what: string }> = [
      { at: 2200, cost: 1, what: 'RELOAD · 25 ROUNDS' },
      { at: 4600, cost: 1, what: 'BRIBE' },
      { at: 7400, cost: 3, what: 'SPECIALIST' },
    ];
    for (const b of buys) {
      ctx.at(b.at, () => {
        if (money < b.cost) {
          tick(ctx, ctx.cx, ctx.cy - 40, `💵 NOT ENOUGH FOR ${b.what}`, SUB.ashDark);
          return;
        }
        money -= b.cost;
        s.fx.cash(ctx.cx, ctx.cy - 26, b.cost * 3, { depth: D_AIR, seal: SUB.crimson });
        tick(ctx, ctx.cx, ctx.cy - 40, `💵 −${b.cost} · ${b.what}`, SUB.gold);
      });
    }

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'reloads, recruits, bribes and retainer recasts all compete for the same three notes', SUB.ash);
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
    let bullets = 4;
    magazine(ctx, s.at, () => bullets);

    const pay = (dmg: number, color: number): void => {
      const gained = Math.floor((dmg / 10) * AMMO_PER_10_DMG);
      bullets = Math.min(BULLETS_MAX, bullets + gained);
      tick(ctx, foe.x, foe.y - 14, `${dmg}`, color);
      if (gained > 0) tick(ctx, ctx.cx, ctx.cy - 46, `+${gained} 🔫`, SUB.brass);
    };

    // A dagger out and back, then the rounds it bought being spent.
    ctx.at(500, () => {
      s.av.play('punch', 0);
      s.fx.cut(foe.x, foe.y, 0, 30, { color: SUB.scarlet, scores: 2, depth: D_AIR });
      pay(DAGGER_THROW_DMG, SUB.scarlet);
    });
    ctx.at(1600, () => {
      s.av.play('clap');
      s.fx.cut(foe.x, foe.y, Math.PI, 42, { color: SUB.steelHi, scores: 3, depth: D_AIR });
      pay(DAGGER_RETURN_DMG, SUB.steelHi);
    });

    const dagger = ctx.adopt(ctx.scene.add.graphics().setDepth(D_AIR));
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      dagger.clear();
      if (elapsed < 500 || elapsed > 1900) return;
      const k = elapsed < 1600 ? (elapsed - 500) / 1100 : 1 - (elapsed - 1600) / 300;
      stiletto(dagger, ctx.tint, ctx.cx + (foe.x - ctx.cx) * k, ctx.cy + (foe.y - ctx.cy) * k,
        elapsed < 1600 ? 0 : Math.PI, 18, SUB.scarlet, 1);
      void t;
    });

    let nextShot = 0;
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < 2600 || elapsed < nextShot || bullets <= 0) return;
      nextShot = elapsed + SPRAY_INTERVAL_MS;
      bullets--;
      const a = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx) + (Math.random() - 0.5) * SPRAY_CONE_HALF * 2;
      s.fx.tracer(ctx.cx, ctx.cy, ctx.cx + Math.cos(a) * 260, ctx.cy + Math.sin(a) * 260,
        { color: SUB.brass, depth: D_AIR, duration: 90, width: 1.4 });
      if (Math.random() < 0.5) pay(SPRAY_DMG, SUB.brass);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'a recall is 12 damage and therefore 3 rounds · a recruit\'s damage pays nothing at all', SUB.ash);
  },
};

// ── Perk — Sonic Boom ─────────────────────────────────────────────────

export const perkSonicBoom: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'Recalled blades outrun their own noise — the boom lands where the blade was standing',
  run(ctx) { daggerLoop(ctx, { dance: false, boom: true }); },
};

// ── Mastery ───────────────────────────────────────────────────────────

export const masteryBigPockets: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'A fourth note — so a full wallet buys a Specialist and still leaves change',
  run(ctx) {
    const s = stageIt(ctx);
    let money = 4;
    wallet(ctx, s.at, () => money, { max: MONEY_MAX_MASTERY });
    label(ctx, ctx.cx, ctx.cy + 34, `${MONEY_MAX} → ${MONEY_MAX_MASTERY}`, SUB.gold);

    ctx.at(900, () => {
      money -= 3;
      s.fx.cash(ctx.cx, ctx.cy - 26, 9, { depth: D_AIR, seal: SUB.crimson });
      tick(ctx, ctx.cx, ctx.cy - 40, '💵 −3 · SPECIALIST', SUB.gold);
    });
    ctx.at(2200, () => {
      money -= 1;
      s.fx.cash(ctx.cx, ctx.cy - 26, 3, { depth: D_AIR, seal: SUB.crimson });
      tick(ctx, ctx.cx, ctx.cy - 40, '💵 −1 · AND STILL A RELOAD', SUB.gold);
    });
    // …and the income coming back at the real rate.
    let accum = 0;
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 3000) return;
      accum += dt;
      if (accum < MONEY_TICK_MS) return;
      accum -= MONEY_TICK_MS;
      money = Math.min(MONEY_MAX_MASTERY, money + 1);
      s.fx.cash(ctx.cx, ctx.cy - 40, 2, { depth: D_AIR, gravity: -60, seal: SUB.crimson });
      tick(ctx, ctx.cx, ctx.cy - 40, '💵 +1', SUB.gold);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'income past the cap is lost, so a bigger cap is also five more seconds of grace', SUB.ash);
  },
};

export const masterySmokeBreak: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  caption: 'A cigarette is 25% off everything; thrown, it is a cloud only they cannot see through',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.8, y: ctx.h * 0.3 };
    dummy(ctx, foe);

    let burn = 1;
    let lit = false;
    let cloud: { x: number; y: number; born: number } | null = null;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(D_AIR));
    const smokeOwn = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    const smokeThem = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
    const puffs = Array.from({ length: 11 }, (_, i) => ({
      ox: Math.cos(i * 1.9) * 40, oy: Math.sin(i * 1.4) * 26,
      r: 26 + (i % 4) * 7, phase: i * 0.8, speed: 0.5 + (i % 3) * 0.2,
    }));

    ctx.onFrame((dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      smokeOwn.clear();
      smokeThem.clear();
      if (lit) {
        burn = Math.max(0, burn - dt / CIG_BURN_MS);
        SubterfugeFx.drawCigarette(g, ctx.tint, ctx.cx, ctx.cy, 0, burn, t, 1);
      }
      if (!cloud) return;
      const age = elapsed - cloud.born;
      if (age > SMOKE_CLOUD_MS) { cloud = null; return; }
      const a = Phaser.Math.Clamp(1 - age / SMOKE_CLOUD_MS, 0, 1);
      // The same object at two depths: a thin haze under the fighters for you, a solid wall
      // over everything for them. That is the whole ability.
      SubterfugeFx.drawSmokeCloud(smokeOwn, ctx.tint, cloud.x, cloud.y,
        SMOKE_CLOUD_RADIUS * 0.5, t, true, a * 0.55, puffs);
      SubterfugeFx.drawSmokeCloud(smokeThem, ctx.tint, foe.x, foe.y - 2,
        SMOKE_CLOUD_RADIUS * 0.28, t, false, a * 0.9, puffs.slice(0, 6));
    });

    ctx.at(600, () => {
      lit = true;
      s.av.play('flex');
      s.fx.smoke(ctx.cx, ctx.cy - 12, 5, { depth: D_AIR, color: SUB.ash, drift: -30 });
      tick(ctx, ctx.cx, ctx.cy - 40, '🚬 LIT', SUB.ember);
      tick(ctx, ctx.cx, ctx.cy - 58, `−${Math.round((1 - CIG_DAMAGE_MULT) * 100)}% DAMAGE TAKEN`, SUB.ash);
    });
    // Every hit burns a second off it.
    for (let i = 0; i < 3; i++) {
      ctx.at(1600 + i * 900, () => {
        if (!lit) return;
        burn = Math.max(0, burn - 1000 / CIG_BURN_MS);
        s.fx.smoke(ctx.cx, ctx.cy - 10, 2, { depth: D_AIR, color: SUB.ashDark });
        tick(ctx, ctx.cx, ctx.cy - 34, '−1s', SUB.ashDark);
      });
    }

    ctx.at(4600, () => {
      lit = false;
      s.av.play('punch', Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx));
      cloud = { x: ctx.w * 0.5, y: ctx.h * 0.5, born: 4600 };
      s.fx.smoke(cloud.x, cloud.y, 12, { depth: 6, color: SUB.ash, speed: 90, life: 900 });
      tick(ctx, ctx.cx, ctx.cy - 40, '💨 THROWN', SUB.ash);
      tick(ctx, cloud.x, cloud.y - 40, `${SMOKE_CLOUD_MS / 1000}s · YOU ARE INVISIBLE IN IT`, SUB.haze);
      tick(ctx, foe.x, foe.y - 30, 'BLINDED', SUB.ashDark);
    });
    ctx.at(6600, () => tick(ctx, ctx.w * 0.5, ctx.h * 0.5 - 24,
      `recruits inside drain at ${Math.round(SMOKE_LOYALTY_DRAIN_MULT * 100)}%`, SUB.gold));
    ctx.at(7800, () => tick(ctx, ctx.w * 0.5, ctx.h * 0.5 - 24,
      'attacking gives you away · exposed 3s', SUB.scarlet));

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${CIG_BURN_MS / 1000}s of burn, and the cooldown runs from lighting up rather than from throwing`,
      SUB.ash);
  },
};
