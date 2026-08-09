import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  LIFT, SND, SandAvatar, SandFx, crown, goldOrb, grains, laneDivider, lavaTide, pillar,
  poisonPatch, pyramidIdol, sandBeam, sandBridge,
} from '../../../elements/kits/SandVisuals';

/**
 * Sand's showcases.
 *
 * The element has no sprites at all — pillars, bridges, poison, beams, the lava and the crowns
 * are Graphics repainted every frame from a handful of little records, and the whole thing hangs
 * off a 1-D height sim that never touches the fighter's position. So every loop here keeps the
 * kit's own records and runs the kit's own physics (384 up, 900 of gravity, a 26-unit landing
 * lip) and paints with the real painters: `pillar`, `sandBridge`, `poisonPatch`, `goldOrb`,
 * `pyramidIdol`, `sandBeam`, `lavaTide`, `crown`, `laneDivider`, `grains`.
 *
 * Height is read the way the arena reads it: a shadow that slides away by `z * LIFT`.
 * `SandAvatar.setElevation` does that for the caster; `chevronShadow` does it for anybody else,
 * which is exactly what the kit does for a non-Sand rival dragged into a Final Trail.
 */

// ── The height sim, as the kit runs it ────────────────────────────────

const GRAVITY = 900;
const JUMP_V = 384;
const LAND_GRACE = 26;
const AIRBORNE_Z = 6;

interface Plat {
  x: number; y: number; r: number; z: number; grey: boolean; goal: boolean; seed: number;
  move?: { x0: number; x1: number; period: number; phase: number };
}
interface Deck { x1: number; y1: number; z1: number; x2: number; y2: number; z2: number; born: number }

/** A runner: a position on the floor and a height above it, which never interact. */
interface Runner { x: number; y: number; z: number; vz: number; on: Plat | null; deck: Deck | null }

function fxOf(ctx: PreviewCtx): SandFx {
  return ctx.capture(() => new SandFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(22));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(22));
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** The desert rig, or null when a skin has replaced the character. */
function desert(av: unknown): SandAvatar | null {
  return av instanceof SandAvatar ? av : null;
}

/** The highest platform at or below `z`, within `grace` — the kit's own landing rule. */
function platUnder(plats: Plat[], x: number, y: number, z: number): Plat | null {
  let best: Plat | null = null;
  for (const p of plats) {
    if (Phaser.Math.Distance.Between(x, y, p.x, p.y) > p.r) continue;
    if (p.z > z + LAND_GRACE) continue;
    if (best && p.z <= best.z) continue;
    best = p;
  }
  return best;
}

/** A deck's sloped height under a point, by projection along the segment. */
function deckUnder(decks: Deck[], x: number, y: number): { deck: Deck; z: number } | null {
  let best: { deck: Deck; z: number } | null = null;
  for (const b of decks) {
    const dx = b.x2 - b.x1, dy = b.y2 - b.y1;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) continue;
    const t = Phaser.Math.Clamp(((x - b.x1) * dx + (y - b.y1) * dy) / len2, 0, 1);
    if (Phaser.Math.Distance.Between(x, y, b.x1 + dx * t, b.y1 + dy * t) > 26) continue;
    const z = b.z1 + (b.z2 - b.z1) * t;
    if (best && best.z >= z) continue;
    best = { deck: b, z };
  }
  return best;
}

/** One frame of the kit's height sim, minus the parts only a live match has. */
function stepHeight(r: Runner, plats: Plat[], decks: Deck[], dt: number, onLand?: (p: Plat | null) => void): void {
  const d = deckUnder(decks, r.x, r.y);
  if (d) {
    const onto = platUnder(plats, r.x, r.y, d.z + LAND_GRACE);
    if (onto && onto.z >= d.z - LAND_GRACE) {
      r.deck = null;
      if (r.on !== onto) { r.on = onto; r.z = onto.z; r.vz = 0; onLand?.(onto); }
      return;
    }
    const eligible = r.deck !== null || (r.on !== null && d.z >= r.on.z - 2)
      || (r.on === null && r.vz <= 0 && r.z <= d.z + LAND_GRACE);
    if (eligible) { r.z = d.z; r.vz = 0; r.on = null; r.deck = d.deck; return; }
  }
  r.deck = null;

  if (r.on) {
    if (!plats.includes(r.on) || Phaser.Math.Distance.Between(r.x, r.y, r.on.x, r.on.y) > r.on.r) {
      r.on = null; r.vz = 0;
    } else { r.z = r.on.z; r.vz = 0; return; }
  }
  const prevZ = r.z;
  r.vz -= GRAVITY * dt;
  r.z += r.vz * dt;
  if (r.vz <= 0) {
    const landing = platUnder(plats, r.x, r.y, prevZ + LAND_GRACE);
    if (landing && r.z <= landing.z) { r.on = landing; r.z = landing.z; r.vz = 0; onLand?.(landing); return; }
  }
  if (r.z <= 0) {
    r.z = 0; r.vz = 0;
    if (prevZ > AIRBORNE_Z) onLand?.(null);
  }
}

function jump(r: Runner): boolean {
  const grounded = r.on !== null || r.deck !== null || (r.z <= AIRBORNE_Z && r.vz === 0);
  if (!grounded) return false;
  r.on = null; r.deck = null; r.vz = JUMP_V;
  return true;
}

// ── Staging ───────────────────────────────────────────────────────────

/**
 * The floor and everything standing on it, in the kit's own draw order: lava, poison, decks, then
 * pillars sorted by screen y so a near one genuinely overlaps a far one.
 */
function world(
  ctx: PreviewCtx,
  o: {
    plats: Plat[]; decks?: Deck[]; poisons?: { x: number; y: number; r: number; seed: number }[];
    beams?: { x1: number; y1: number; x2: number; y2: number; born: number; golden: boolean }[];
    lit?: () => Plat | null;
    orbAt?: () => Plat | null;
    idolAt?: () => { p: Plat; awake: boolean } | null;
    crowns?: () => { p: Plat; taken: boolean }[];
    lava?: () => number | null;
  },
): void {
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
  ctx.onFrame((_dt, elapsed) => {
    ground.clear(); air.clear();
    const t = elapsed / 1000;
    const lavaZ = o.lava?.() ?? null;
    if (lavaZ !== null) {
      lavaTide(ground, ctx.tint, 0, ctx.h * 0.5, ctx.w, ctx.h * 0.5, lavaZ, t, 1);
      laneDivider(ground, ctx.tint, ctx.w / 2, 20, ctx.h - 20, t, 1);
    }
    for (const p of o.poisons ?? []) poisonPatch(ground, ctx.tint, p.x, p.y, p.r, t, 1, { seed: p.seed });
    for (const b of o.decks ?? []) {
      const k = Phaser.Math.Clamp(1 - (elapsed - b.born) / 6000, 0, 1);
      sandBridge(ground, ctx.tint, b.x1, b.y1, b.z1, b.x2, b.y2, b.z2, 26, k, t, 1, { seed: 3 });
    }
    const standing = o.lit?.() ?? null;
    for (const p of [...o.plats].sort((a, b) => a.y - b.y)) {
      pillar(ground, ctx.tint, p.x, p.y, p.r, p.z, 1,
        { seed: p.seed, grey: p.grey, lit: p === standing ? 1 : 0, t });
    }
    for (const c of o.crowns?.() ?? []) crown(air, ctx.tint, c.p.x, c.p.y, t, 1, { taken: c.taken });
    const orb = o.orbAt?.();
    if (orb) goldOrb(air, ctx.tint, orb.x, orb.y, t, 1);
    const idol = o.idolAt?.();
    if (idol) pyramidIdol(air, ctx.tint, idol.p.x, idol.p.y - 4, t, 1, { size: 26, awake: idol.awake ? 1 : 0 });
    for (const b of o.beams ?? []) {
      const k = 1 - (elapsed - b.born) / 190;
      if (k <= 0) continue;
      sandBeam(air, ctx.tint, b.x1, b.y1, b.x2, b.y2, k, 1, { golden: b.golden, seed: 5 });
    }
    grains(ground, ctx.tint, ctx.w / 2, ctx.h / 2, Math.max(ctx.w, ctx.h) / 2, 22, 0.1,
      { seed: 11, color: SND.deep, size: 2, drift: Math.sin(t * 0.6) * 30 });
  });
}

/**
 * A caster that can walk and be up in the air. `bodyTexture: ''` on the script so the harness
 * stages nothing, and the body is staged here instead — its screen position never changes with
 * height, exactly as in the arena. The rig draws the shadow off `setElevation`.
 */
function runner(ctx: PreviewCtx, r: Runner): { fx: SandFx; av: SandAvatar | null } {
  const fx = fxOf(ctx);
  if (ctx.scene.textures.exists('elem-dune')) {
    const body = ctx.adopt(ctx.scene.add.image(r.x, r.y, 'elem-dune').setDepth(5));
    ctx.onFrame(() => body.setPosition(r.x, r.y));
  }
  const av = ctx.useAvatar(() => new SandAvatar(ctx.scene, ctx.tint));
  const rig = desert(av);
  ctx.onFrame((dt) => {
    rig?.setElevation(r.z);
    av.setFacing(ctx.aim);
    av.update(dt, r.x, r.y, 1);
  });
  return { fx, av: rig };
}

/** The height read for anything that is not the Sand rig: the sliding shadow and its chevrons. */
function chevronShadow(ctx: PreviewCtx, r: { x: number; y: number; z: number }, depth = 3): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame(() => {
    g.clear();
    const drop = r.z * LIFT;
    const k = Math.min(1, r.z / 400);
    g.fillStyle(ctx.tint(SND.shadow), 0.42 - k * 0.2);
    g.fillEllipse(r.x, r.y + 15 + drop, 40 - k * 16, 14 - k * 6);
    g.fillStyle(ctx.tint(SND.deep), 0.4);
    const rungs = Math.max(0, Math.floor(drop / 12));
    for (let i = 1; i <= rungs; i++) {
      const yy = r.y + 15 + (drop * i) / (rungs + 1);
      const w = 5 - (i / (rungs + 1)) * 2.5;
      g.fillPoints([
        new Phaser.Geom.Point(r.x - w, yy + 2), new Phaser.Geom.Point(r.x, yy - 1),
        new Phaser.Geom.Point(r.x + w, yy + 2), new Phaser.Geom.Point(r.x, yy + 0.6),
      ], true);
    }
  });
}

function dummyAt(ctx: PreviewCtx, at: { x: number; y: number }, depth = 5): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(at.x - 5.6, at.y - 4, 1.6); g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
  });
}

/** Walk `r` toward `(tx, ty)` at `speed` px/s. Returns true once it is basically there. */
function walkTo(r: Runner, tx: number, ty: number, speed: number, dt: number): boolean {
  const d = Phaser.Math.Distance.Between(r.x, r.y, tx, ty);
  if (d < 3) return true;
  const a = Math.atan2(ty - r.y, tx - r.x);
  const step = Math.min(d, speed * dt);
  r.x += Math.cos(a) * step;
  r.y += Math.sin(a) * step;
  return false;
}

// ══ CLICK — Sand Striker ══════════════════════════════════════════════

export const striker: PreviewScript = {
  duration: 13000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Click — 30 flat-footed, 35 in the air, 40 off a platform, 45 for both',
  run(ctx) {
    const pillarP: Plat = { x: ctx.w * 0.3, y: ctx.cy + 20, r: 30, z: 70, grey: false, goal: false, seed: 4 };
    const plats = [pillarP];
    const beams: { x1: number; y1: number; x2: number; y2: number; born: number; golden: boolean }[] = [];
    const me: Runner = { x: ctx.w * 0.22, y: ctx.cy + 46, z: 0, vz: 0, on: null, deck: null };
    world(ctx, { plats, beams, lit: () => me.on });
    const { fx } = runner(ctx, me);
    const victim = { x: ctx.w * 0.82, y: ctx.cy - 10 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8c87a', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffd54a', 10);

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      stepHeight(me, plats, [], dt);
      // The kit's own tiers, read live off the sim rather than announced.
      const onPlat = me.on !== null;
      const inAir = me.on === null && me.z > AIRBORNE_Z;
      gauge.setText(`height ${Math.round(me.z)}   ·   ${onPlat ? 'on a platform' : inAir ? 'in the air' : 'flat-footed'}`
        + `   ·   ${30 + (onPlat || (inAir && me.z > 0 && elapsed > 6000) ? 10 : 0) + (inAir ? 5 : 0)}`);
      for (let i = beams.length - 1; i >= 0; i--) if (elapsed - beams[i].born > 220) beams.splice(i, 1);
    });

    const shoot = (at: number, dmg: number, why: string): void => ctx.at(at, () => {
      beams.push({ x1: me.x + 16, y1: me.y - 2, x2: victim.x, y2: victim.y, born: at, golden: false });
      ctx.capture(() => fx.ping(victim.x, victim.y, 20, SND.sand));
      float(ctx, victim.x, victim.y - 24, `${dmg}`, '#ffb3aa', dmg >= 45 ? 19 : 15);
      readout.setText(why);
    });

    shoot(600, 30, 'standing on the floor: 30, and two seconds to reload');
    // Straight up off the floor: +5 only.
    ctx.at(2900, () => { jump(me); });
    shoot(3050, 35, 'a plain hop off the floor: +5 for being airborne');
    // Onto the pillar.
    ctx.onFrame((delta, elapsed) => {
      if (elapsed < 5200 || elapsed > 6400) return;
      walkTo(me, pillarP.x, pillarP.y, 200, delta / 1000);
    });
    ctx.at(5300, () => { jump(me); });
    shoot(7000, 40, 'stood on something you built: +10');
    ctx.at(9000, () => { jump(me); float(ctx, me.x, me.y - 40, 'off the pillar', '#f0cd8e', 10); });
    shoot(9160, 45, 'in the air off your own platform — the bonuses add, and this is the ceiling');
    ctx.at(11000, () => readout.setText('a Sand player who never leaves the floor is playing a worse element on purpose'));
  },
};

// ══ E — Sandstone Ruins ═══════════════════════════════════════════════

export const ruins: PreviewScript = {
  duration: 14000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'E — a 4-slab course; reach the orb for 8s of one-second reloads. Fall and it is 20.',
  run(ctx) {
    const plats: Plat[] = [];
    const claimed = { yes: false };
    const goal = { p: null as Plat | null };
    const me: Runner = { x: ctx.w * 0.16, y: ctx.h * 0.72, z: 0, vz: 0, on: null, deck: null };
    world(ctx, {
      plats, lit: () => me.on,
      orbAt: () => (claimed.yes ? null : goal.p),
    });
    const { fx } = runner(ctx, me);
    const readout = label(ctx, ctx.w * 0.5, 12, '#f0cd8e', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffd54a', 10);

    ctx.at(300, () => {
      // The kit's own walk: a grey block at 58, then three pillars each 26–68 higher.
      const chain: [number, number, number][] = [
        [ctx.w * 0.32, ctx.h * 0.62, 58], [ctx.w * 0.46, ctx.h * 0.46, 100],
        [ctx.w * 0.60, ctx.h * 0.58, 148], [ctx.w * 0.76, ctx.h * 0.40, 200],
      ];
      chain.forEach(([x, y, z], i) => {
        const p: Plat = { x, y, r: i === 3 ? 40 : 30, z, grey: i === 0, goal: i === 3, seed: i * 61 };
        plats.push(p);
        if (i === 3) goal.p = p;
        ctx.capture(() => fx.rise(x, y, p.r, z, p.grey));
      });
      float(ctx, me.x, me.y - 46, 'SANDSTONE RUINS', hex(SND.stoneWarmLit), 12);
      readout.setText('one cold grey block you can reach standing — then pillars you cannot');
    });

    // The climb: walk to the next slab, hop as the gap closes.
    const climb = { i: 0, next: 900 };
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const target = plats[climb.i];
      if (target && elapsed > 900) {
        walkTo(me, target.x, target.y, 200, dt);
        const d = Phaser.Math.Distance.Between(me.x, me.y, target.x, target.y);
        if (elapsed > climb.next && me.on !== target && d < 76 && d > 26) {
          if (jump(me)) climb.next = elapsed + 700;
        }
      }
      stepHeight(me, plats, [], dt, (p) => {
        if (!p) {
          // Landing on the floor off an unfinished course is the one price the ruins charge.
          if (!claimed.yes && climb.i > 0) {
            ctx.capture(() => fx.puff(me.x, me.y + 14, 12, 18, 460, SND.dark));
            float(ctx, me.x, me.y - 42, 'FELL', hex(SND.expire), 12);
            float(ctx, me.x, me.y - 24, '20', '#ffb3aa', 14);
          }
          return;
        }
        const idx = plats.indexOf(p);
        if (idx > climb.i - 1) climb.i = Math.min(plats.length - 1, idx + 1);
        if (!p.goal || claimed.yes) return;
        claimed.yes = true;
        ctx.capture(() => fx.blast(p.x, p.y, 60, SND.gold));
        float(ctx, me.x, me.y - 46, 'GOLDEN SAND', hex(SND.gold), 13);
        readout.setText('8 seconds of one-second reloads — double the rate of fire');
        // Claimed courses go back into the floor. Falling off one costs nothing.
        ctx.scene.time.delayedCall(900, () => {
          for (const q of plats) ctx.capture(() => fx.collapse(q.x, q.y, q.z, q.r, q.grey));
          plats.length = 0;
        });
      });
      gauge.setText(claimed.yes
        ? 'reload 1.0s   ·   and the course sinks back into the floor, so the drop is free'
        : `height ${Math.round(me.z)}   ·   reload 2.0s   ·   a fall onto the floor is 20`);
    });
    ctx.at(2400, () => readout.setText('every rise is under a jump\'s apex — nothing it builds is unclearable'));
    ctx.at(11500, () => readout.setText('unclaimed it stands 22 seconds — and the pillars are still worth +10 a shot'));
  },
};

// ══ R — Cursed Pyramid ════════════════════════════════════════════════

export const pyramid: PreviewScript = {
  duration: 15000,
  scale: 0.74,
  bodyTexture: '',
  caption: 'R — a long course over poison; reach the idol for 15s of a 16-damage turret',
  run(ctx) {
    const plats: Plat[] = [];
    const poisons: { x: number; y: number; r: number; seed: number }[] = [];
    const beams: { x1: number; y1: number; x2: number; y2: number; born: number; golden: boolean }[] = [];
    const goal = { p: null as Plat | null, awake: false };
    const me: Runner = { x: ctx.w * 0.12, y: ctx.h * 0.74, z: 0, vz: 0, on: null, deck: null };
    world(ctx, {
      plats, poisons, beams, lit: () => me.on,
      idolAt: () => (goal.p ? { p: goal.p, awake: goal.awake } : null),
    });
    const { fx } = runner(ctx, me);
    const victim = { x: ctx.w * 0.2, y: ctx.h * 0.3 };
    dummyAt(ctx, victim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#74c23a', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffd54a', 10);

    ctx.at(300, () => {
      const chain: [number, number, number, boolean][] = [
        [ctx.w * 0.26, ctx.h * 0.68, 58, false], [ctx.w * 0.40, ctx.h * 0.54, 104, true],
        [ctx.w * 0.55, ctx.h * 0.66, 154, false], [ctx.w * 0.69, ctx.h * 0.48, 200, true],
        [ctx.w * 0.84, ctx.h * 0.60, 248, false],
      ];
      chain.forEach(([x, y, z, moving], i) => {
        const isGoal = i === chain.length - 1;
        const p: Plat = {
          x, y, r: isGoal ? 40 : 26, z, grey: i === 0, goal: isGoal, seed: i * 43,
          move: moving && !isGoal ? { x0: x, x1: x + 46, period: 2800, phase: i } : undefined,
        };
        plats.push(p);
        if (isGoal) goal.p = p;
        ctx.capture(() => fx.rise(x, y, p.r, z, p.grey));
        // Poison sunk into the floor across the gap behind each pillar.
        if (i > 0 && !isGoal) {
          poisons.push({
            x: (x + chain[i - 1][0]) / 2, y: (y + chain[i - 1][1]) / 2, r: 44, seed: i * 17,
          });
        }
      });
      float(ctx, me.x, me.y - 46, 'CURSED PYRAMID', hex(SND.gold), 12);
      readout.setText('poison sunk into the floor across every gap — the ground route is closed');
    });

    // The sliding slabs, on their own patrol, carrying whoever is standing on them.
    ctx.onFrame((_dt, elapsed) => {
      for (const p of plats) {
        if (!p.move) continue;
        const k = 0.5 + 0.5 * Math.sin((elapsed / p.move.period) * Math.PI * 2 + p.move.phase);
        const nx = p.move.x0 + (p.move.x1 - p.move.x0) * k;
        if (me.on === p) me.x += nx - p.x;
        p.x = nx;
      }
    });

    const poison = { in: null as unknown, next: 0 };
    const idolClock = { next: 0 };
    const climb = { i: 0, next: 900 };
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const target = plats[climb.i];
      if (target && elapsed > 900) {
        walkTo(me, target.x, target.y, 200, dt);
        const d = Phaser.Math.Distance.Between(me.x, me.y, target.x, target.y);
        if (elapsed > climb.next && me.on !== target && d < 76 && d > 26) {
          if (jump(me)) climb.next = elapsed + 700;
        }
      }
      stepHeight(me, plats, [], dt, (p) => {
        if (!p) return;
        const idx = plats.indexOf(p);
        if (idx > climb.i - 1) climb.i = Math.min(plats.length - 1, idx + 1);
        if (!p.goal || goal.awake) return;
        goal.awake = true;
        ctx.capture(() => fx.blast(p.x, p.y, 90, SND.goldHot));
        float(ctx, me.x, me.y - 46, 'PYRAMID AWAKENED', hex(SND.goldHot), 13);
        readout.setText('15 seconds of a turret you never have to aim');
        // Everything but the idol's slab comes down.
        for (let i = plats.length - 1; i >= 0; i--) {
          if (plats[i] === p) continue;
          ctx.capture(() => fx.collapse(plats[i].x, plats[i].y, plats[i].z, plats[i].r, plats[i].grey));
          plats.splice(i, 1);
        }
        poisons.length = 0;
      });
      // Poison: it bites the moment you enter, then every 600ms — and being off the floor is immunity.
      const inIt = me.z > AIRBORNE_Z ? null
        : poisons.find((q) => Phaser.Math.Distance.Between(me.x, me.y, q.x, q.y) <= q.r) ?? null;
      if (!inIt) { poison.in = null; } else if (poison.in !== inIt) {
        poison.in = inIt; poison.next = elapsed + 600;
        ctx.capture(() => fx.ping(me.x, me.y, 22, SND.poison));
        float(ctx, me.x, me.y - 40, 'POISON', hex(SND.poison), 11);
        float(ctx, me.x + 14, me.y - 22, '12', '#ffb3aa', 13);
      } else if (elapsed >= poison.next) {
        poison.next = elapsed + 600;
        float(ctx, me.x + 14, me.y - 22, '9', '#ffb3aa', 11);
      }
      // The idol, firing every 0.9s at the nearest enemy.
      if (goal.awake && goal.p && elapsed >= idolClock.next) {
        idolClock.next = elapsed + 900;
        beams.push({ x1: goal.p.x, y1: goal.p.y - 30, x2: victim.x, y2: victim.y, born: elapsed, golden: true });
        ctx.capture(() => fx.ping(victim.x, victim.y, 18, SND.gold));
        float(ctx, victim.x, victim.y - 24, '16', '#ffb3aa', 13);
      }
      for (let i = beams.length - 1; i >= 0; i--) if (elapsed - beams[i].born > 220) beams.splice(i, 1);
      gauge.setText(me.z > AIRBORNE_Z
        ? 'off the floor — poison cannot reach you at all'
        : `on the ground   ·   height ${Math.round(me.z)}   ·   poison bites on entry, then 9 every 0.6s`);
    });
    ctx.at(2200, () => readout.setText('jumping the patch is the only free way across'));
    ctx.at(13000, () => readout.setText('knock the slab out from under the idol and it goes quiet — that is the answer to it'));
  },
};

// ══ F — Sandwalk ══════════════════════════════════════════════════════

export const sandwalk: PreviewScript = {
  duration: 12000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'F — a sloped deck to a neighbouring slab: ×1.25 speed, 110 px/s of carry, 6 seconds',
  run(ctx) {
    const a: Plat = { x: ctx.w * 0.3, y: ctx.h * 0.66, r: 32, z: 60, grey: true, goal: false, seed: 2 };
    const b: Plat = { x: ctx.w * 0.62, y: ctx.h * 0.44, r: 32, z: 150, grey: false, goal: false, seed: 8 };
    const far: Plat = { x: ctx.w * 0.9, y: ctx.h * 0.7, r: 30, z: 120, grey: false, goal: false, seed: 12 };
    const plats = [a, b, far];
    const decks: Deck[] = [];
    const me: Runner = { x: ctx.w * 0.16, y: ctx.h * 0.74, z: 0, vz: 0, on: null, deck: null };
    world(ctx, { plats, decks, lit: () => me.on });
    const { fx } = runner(ctx, me);
    const readout = label(ctx, ctx.w * 0.5, 12, '#f0cd8e', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffd54a', 10);

    // Range rings, so "neighbours only" is something you see rather than read.
    const rings = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
    const showRange = { on: false };
    ctx.onFrame(() => {
      rings.clear();
      if (!showRange.on || !me.on) return;
      rings.lineStyle(1.4, ctx.tint(SND.stoneWarmLit), 0.35);
      rings.strokeCircle(me.on.x, me.on.y, 180);
    });

    ctx.at(300, () => readout.setText('climb onto something first — the deck is a step, not a teleport'));
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      if (elapsed > 400 && elapsed < 1800) walkTo(me, a.x, a.y, 200, dt);
      stepHeight(me, plats, decks, dt);
      gauge.setText(me.deck
        ? 'riding the deck: your own speed ×1.25, plus 110 px/s toward the far end'
        : `height ${Math.round(me.z)}   ·   ${me.on ? 'standing on a slab' : 'on the floor'}`);
      // The conveyor, applied as the kit applies it: after the walk, as an override.
      if (me.deck) {
        const len = Math.hypot(me.deck.x2 - me.deck.x1, me.deck.y2 - me.deck.y1) || 1;
        me.x += ((me.deck.x2 - me.deck.x1) / len) * 110 * dt;
        me.y += ((me.deck.y2 - me.deck.y1) / len) * 110 * dt;
      }
    });
    ctx.at(700, () => { jump(me); });
    ctx.at(2000, () => { showRange.on = true; readout.setText('180px of reach. The far slab is not a neighbour and gets no bridge.'); });
    ctx.at(3600, () => {
      showRange.on = false;
      decks.push({ x1: a.x, y1: a.y, z1: a.z, x2: b.x, y2: b.y, z2: b.z, born: 3600 });
      ctx.capture(() => fx.puff((a.x + b.x) / 2, (a.y + b.y) / 2, 14, 26, 460, SND.stoneWarmLit));
      float(ctx, me.x, me.y - 46, 'SANDWALK', hex(SND.stoneWarmLit), 12);
      readout.setText('it slopes: 60 units at this end, 150 at the other, worked out per step along it');
    });
    ctx.at(6200, () => readout.setText('a slab level with the far end adopts you off it — a bridge delivers'));
    ctx.at(8200, () => {
      decks.length = 0;
      me.on = null;
      readout.setText('6 seconds, one deck per side. Cast on the floor with nothing in range…');
    });
    ctx.at(9200, () => {
      decks.push({ x1: me.x, y1: me.y, z1: 0, x2: me.x + 170, y2: me.y, z2: 0, born: 9200 });
      ctx.capture(() => fx.puff(me.x + 85, me.y, 14, 26, 460, SND.stoneWarmLit));
      float(ctx, me.x, me.y - 46, 'SAND CONVEYOR', hex(SND.stoneWarmLit), 12);
      readout.setText('…and you get the same conveyor without the climb, worth pressing from turn one');
    });
  },
};

// ══ Q — Final Trail ═══════════════════════════════════════════════════

export const finalTrail: PreviewScript = {
  duration: 16000,
  scale: 0.67,
  bodyTexture: '',
  caption: 'Q — two lanes, one crown each, lava rising at 20 a second. Second place takes 70.',
  run(ctx) {
    const mine: Plat[] = [];
    const theirs: Plat[] = [];
    const lava = { z: -70 };
    const me: Runner = { x: 0, y: 0, z: 0, vz: 0, on: null, deck: null };
    const them = { x: 0, y: 0, z: 0, vz: 0, on: null as Plat | null, deck: null as Deck | null };
    const done = { crowned: null as 'me' | 'them' | null };
    // One board holding both lanes — `world` paints the array it is handed, by reference.
    const all: Plat[] = [];
    world(ctx, {
      plats: all, lit: () => me.on,
      lava: () => lava.z,
      crowns: () => [mine, theirs]
        .map((lane) => lane[lane.length - 1])
        .filter((p): p is Plat => !!p)
        .map((p) => ({ p, taken: done.crowned !== null })),
    });
    const { fx } = runner(ctx, me);
    chevronShadow(ctx, them);
    dummyAt(ctx, them);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ffb03a', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffd54a', 10);

    ctx.at(200, () => {
      const build = (lane: Plat[], minX: number, maxX: number): void => {
        const steps = 6;
        const yB = ctx.h - 40, yT = 34;
        let x = (minX + maxX) / 2, y = yB, z = 40, dir = 1;
        for (let i = 0; i <= steps; i++) {
          const p: Plat = {
            x, y, r: i === steps ? 34 : 24, z, grey: i === 0, goal: i === steps, seed: i * 29 + minX,
          };
          lane.push(p); all.push(p);
          ctx.capture(() => fx.rise(x, y, p.r, z, p.grey));
          if (x + dir * 62 < minX || x + dir * 62 > maxX) dir = -dir;
          x += dir * 62;
          y -= (yB - yT) / steps;
          z += 34;
        }
      };
      build(mine, 24, ctx.w * 0.5 - 24);
      build(theirs, ctx.w * 0.5 + 24, ctx.w - 24);
      me.x = mine[0].x; me.y = mine[0].y; me.z = mine[0].z; me.on = mine[0];
      them.x = theirs[0].x; them.y = theirs[0].y; them.z = theirs[0].z; them.on = theirs[0];
      float(ctx, ctx.w / 2, ctx.h / 2 - 60, 'FINAL TRAIL', hex(SND.goldHot), 14);
      readout.setText('the arena is cleared and replaced — only the jump and Sandwalk work up here');
    });

    // Both runners climb. The bot commits to its slab and cannot fall; you can.
    const myClimb = { i: 1, next: 1200 };
    const theirClimb = { i: 1, next: 1400 };
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      if (!mine.length) return;
      lava.z += 20 * dt;

      if (!done.crowned) {
        const t1 = mine[myClimb.i];
        if (t1) {
          walkTo(me, t1.x, t1.y, 200, dt);
          const d = Phaser.Math.Distance.Between(me.x, me.y, t1.x, t1.y);
          if (elapsed > myClimb.next && me.on !== t1 && d < 70 && d > 20 && jump(me)) myClimb.next = elapsed + 620;
        }
        // The bot: dwell 450ms on each slab, then hop — and it lands where it aimed, by fiat.
        const t2 = theirs[theirClimb.i];
        if (t2) {
          if (elapsed >= theirClimb.next) {
            them.x = t2.x; them.y = t2.y; them.z = t2.z; them.on = t2;
            theirClimb.i = Math.min(theirs.length - 1, theirClimb.i + 1);
            theirClimb.next = elapsed + 1170;
            if (t2.goal && !done.crowned) {
              done.crowned = 'them';
              readout.setText('crowned first — and second place is 70, whoever it is');
              float(ctx, me.x, me.y - 46, 'TOO SLOW', hex(SND.lava), 13);
              float(ctx, me.x, me.y - 24, '70', '#ffb3aa', 20);
            }
          }
        }
      }
      stepHeight(me, all, [], dt, (p) => {
        if (!p) return;
        const idx = mine.indexOf(p);
        if (idx >= 0 && idx >= myClimb.i) myClimb.i = Math.min(mine.length - 1, idx + 1);
        if (p.goal && !done.crowned) {
          done.crowned = 'me';
          ctx.capture(() => fx.blast(me.x, me.y, 110, SND.goldHot));
          float(ctx, me.x, me.y - 52, 'CROWNED', hex(SND.gold), 14);
          float(ctx, them.x, them.y - 24, '70', '#ffb3aa', 20);
          readout.setText('first to their crown walks away clean');
        }
      });
      // Two other ways to lose, both worth the same 70.
      if (!done.crowned && me.z <= lava.z) {
        done.crowned = 'them';
        float(ctx, me.x, me.y - 46, 'THE LAVA', hex(SND.lava), 13);
        float(ctx, me.x, me.y - 24, '70', '#ffb3aa', 20);
      }
      gauge.setText(`lava at ${Math.round(lava.z)}   ·   you at ${Math.round(me.z)}`
        + `   ·   it rises 20 a second and reaches the first slab 5.5s in`);
    });
    ctx.at(4000, () => { if (!done.crowned) readout.setText('the lava never beats a runner who is moving — it beats one who hesitates'); });
    ctx.at(13000, () => readout.setText('and the caster losing their own race takes the 70 too. You can lose this.'));
  },
};

// ══ PASSIVE — The Jump ════════════════════════════════════════════════

export const theJump: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Passive — Space is a real jump: 384 up against 900 of gravity, an apex of 82',
  run(ctx) {
    const p: Plat = { x: ctx.w * 0.58, y: ctx.cy + 10, r: 32, z: 74, grey: false, goal: false, seed: 6 };
    const plats = [p];
    const me: Runner = { x: ctx.w * 0.24, y: ctx.cy + 40, z: 0, vz: 0, on: null, deck: null };
    world(ctx, { plats, lit: () => me.on });
    runner(ctx, me);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8c87a', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffd54a', 10);

    const apex = { z: 0 };
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      if (elapsed > 4200 && elapsed < 6400) walkTo(me, p.x, p.y, 200, dt);
      stepHeight(me, plats, [], dt);
      apex.z = Math.max(apex.z, me.z);
      gauge.setText(`height ${Math.round(me.z)}   ·   apex reached ${Math.round(apex.z)}`
        + `   ·   shadow slides ${(me.z * LIFT).toFixed(0)}px`);
    });

    ctx.at(400, () => readout.setText('your position on the floor never changes with height — only the shadow moves'));
    ctx.at(1200, () => { jump(me); float(ctx, me.x, me.y - 40, 'SPACE', hex(SND.stoneWarmLit), 12); });
    ctx.at(1700, () => { if (!jump(me)) float(ctx, me.x, me.y - 56, 'no double jump', '#8e97ad', 10); });
    ctx.at(2600, () => readout.setText('82 units of apex, and about 0.85 seconds of hang time'));
    ctx.at(3400, () => { jump(me); });
    ctx.at(4400, () => readout.setText('a platform catches you from 26 units under its top face, falling'));
    ctx.at(5000, () => { jump(me); });
    ctx.at(7200, () => readout.setText('and above 6 units you are airborne: +5 on the gun, and immune to poison'));
    ctx.at(8200, () => { jump(me); });
    ctx.at(9400, () => readout.setText('the chevrons between you and your shadow are how far up you are'));
  },
};

// ══ PASSIVE — Courses And Falling ═════════════════════════════════════

export const coursesAndFalling: PreviewScript = {
  duration: 13000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Passive — 20 for dropping off an unfinished course, and nothing for anything else',
  run(ctx) {
    const grey: Plat = { x: ctx.w * 0.34, y: ctx.h * 0.62, r: 32, z: 58, grey: true, goal: false, seed: 1 };
    const tall: Plat = { x: ctx.w * 0.56, y: ctx.h * 0.44, r: 28, z: 116, grey: false, goal: false, seed: 5 };
    const plats = [grey, tall];
    const live = { course: true };
    const me: Runner = { x: ctx.w * 0.18, y: ctx.h * 0.72, z: 0, vz: 0, on: null, deck: null };
    world(ctx, { plats, lit: () => me.on });
    const { fx } = runner(ctx, me);
    const readout = label(ctx, ctx.w * 0.5, 12, '#d9564a', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 18, '#ffd54a', 10);
    const fell = { from: null as Plat | null };

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const wasOn = me.on;
      if (elapsed > 500 && elapsed < 2200) walkTo(me, grey.x, grey.y, 200, dt);
      if (elapsed > 4200 && elapsed < 5600) walkTo(me, grey.x + 70, grey.y + 40, 200, dt);
      if (elapsed > 7400 && elapsed < 9000) walkTo(me, grey.x, grey.y, 200, dt);
      stepHeight(me, plats, [], dt, (p) => {
        if (p) { fell.from = null; return; }
        // Landing on the floor. It is only a fall if the course it came off is unfinished.
        if (!fell.from) return;
        if (live.course) {
          ctx.capture(() => fx.puff(me.x, me.y + 14, 12, 18, 460, SND.dark));
          float(ctx, me.x, me.y - 42, 'FELL', hex(SND.expire), 13);
          float(ctx, me.x, me.y - 22, '20', '#ffb3aa', 15);
        } else {
          float(ctx, me.x, me.y - 42, 'no charge', '#8e97ad', 11);
        }
        fell.from = null;
      });
      if (wasOn && !me.on) fell.from = wasOn;
      gauge.setText(live.course
        ? 'course unfinished — a drop onto the floor costs 20'
        : 'course claimed — the kit pulls it back into the floor, and charges you nothing for it');
    });

    ctx.at(600, () => readout.setText('the grey block is the only slab you can reach from the floor'));
    ctx.at(1400, () => { jump(me); });
    ctx.at(3000, () => readout.setText('walk off the edge of an unfinished course and it bites'));
    ctx.at(6400, () => {
      live.course = false;
      ctx.capture(() => fx.blast(tall.x, tall.y, 60, SND.gold));
      float(ctx, tall.x, tall.y - 40, 'CLAIMED', hex(SND.gold), 12);
      readout.setText('claimed — and now the same drop is free');
    });
    ctx.at(8000, () => { jump(me); });
    ctx.at(10400, () => readout.setText('hopping off the floor, stepping off an orphaned slab, leaving a deck: none of those is a fall'));
  },
};
