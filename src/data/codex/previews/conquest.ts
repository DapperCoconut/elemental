import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  CNQ, ConquestAvatar, ConquestFx, barbarianKing, barracksBody, barricadeBody, buildingHpBar,
  contestTile, fireballOrb, gridCell, hasteRing, linkChain, soldier, territoryTile,
  townCenterBody, townColor, turretBody, wizardTroop,
} from '../../../elements/kits/ConquestVisuals';

/**
 * Conquest's showcases.
 *
 * Every loop has to have the **board** in it. The grid, the squares you own, and the buildings
 * standing on them are the entire element — a Conquest preview that stages a caster against a
 * dummy with no territory underneath documents a poking element with a long spear, which is
 * exactly the wrong impression. So each script paints a slice of the 64px grid, colours in the
 * squares that are yours, and puts the ability on it.
 *
 * Conquest puts no sprite in the world: territory, buildings, soldiers, bullets and the fireball
 * are all Graphics repainted per frame out of `ConquestVisuals`, so `ctx.fly` is useless here.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `ConquestFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const CELL = 64;
const CONTEST_MS = 2000;
const START_AUTHORITY = 20;
const PIKE_REACH = 260;
const PIKE_HALF_WIDTH = 26;
const PIKE_DAMAGE = 20;
const PIKE_HOME_MULT = 0.25;
const HOME_ARMOUR = 0.5;
const TROOP_RANGE = 90;
const TURRET_RANGE = 220;
const BUILDING_R = 24;
const BUILDINGS_PER_TOWN = 9;

const BUILD_COST = { barracks: 35, turret: 25, barricade: 10 };
const EXPANSION_COST = 150;
const EXPANSION_COST_ENHANCED = 100;

const FIREBALL_DAMAGE = 30;
const FIREBALL_RADIUS = 44;
const FIREBALL_SPEED = 420;
const ASH_DAMAGE = 25;
const ASH_RADIUS = 80;
const HASTE_RANGE = 110;
const HASTE_PER = 1.15;
const HASTE_MAX_STACKS = 4;
const FORCE_SPEED = 1.25;
const FORCE_DAMAGE = 1.2;
const GUILD_TRAMPLE = 12;
const SURPRISE_BONUS = 10;
const WIZARD_RANGE = CELL * 3;

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── Shared staging ────────────────────────────────────────────────────

interface Stage { fx: ConquestFx; av: BaseAvatar; cav: ConquestAvatar | null; at: Mark }

function stageIt(ctx: PreviewCtx): Stage {
  const fx = ctx.capture(() => new ConquestFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new ConquestAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av, cav: av instanceof ConquestAvatar ? av : null, at: { x: ctx.cx, y: ctx.cy } };
}

function drivenCaster(ctx: PreviewCtx, at: Mark): Stage {
  const fx = ctx.capture(() => new ConquestFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-conquest')) {
    const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-conquest').setDepth(5));
    ctx.onFrame(() => body.setPosition(at.x, at.y));
  }
  const av = ctx.useAvatar(() => new ConquestAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => av.update(dt, at.x, at.y, 1));
  return { fx, av, cav: av instanceof ConquestAvatar ? av : null, at };
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#14100c', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(22));
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

function dummy(ctx: PreviewCtx, at: Mark): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1);
    g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1);
    g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9);
    g.fillCircle(at.x - 5, at.y - 4, 3.2);
    g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1);
    g.fillCircle(at.x - 5.6, at.y - 4, 1.6);
    g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
  });
}

/**
 * The board — a slice of the arena's real 64px grid with the owned squares painted in.
 *
 * Returns the cell size actually used and a `cell` helper so every script places its buildings
 * on the same lattice the arena would, rather than at arbitrary pixels.
 */
interface Board {
  size: number;
  cell(cx: number, cy: number): Mark;
  /** Mark a square as owned by `town` (index into the town palette), or -1 to clear. */
  own(cx: number, cy: number, town: number): void;
  contest(cx: number, cy: number, from: number): void;
}

function board(ctx: PreviewCtx, o?: { cols?: number; rows?: number }): Board {
  const cols = o?.cols ?? 7;
  const rows = o?.rows ?? 4;
  const size = Math.min(CELL, Math.floor(Math.min(ctx.w / cols, (ctx.h - 30) / rows)));
  const ox = (ctx.w - cols * size) / 2;
  const oy = (ctx.h - rows * size) / 2 + 6;
  const owned = new Map<string, number>();
  const contesting = new Map<string, number>();
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(2));

  const key = (cx: number, cy: number): string => `${cx},${cy}`;
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const x = ox + cx * size;
        const y = oy + cy * size;
        gridCell(g, x, y, size, 0.5);
        const own = owned.get(key(cx, cy));
        if (own === undefined) continue;
        // The four edges are open where the neighbour is the same colour, so a block of
        // territory reads as one shape rather than as nine outlined squares.
        const open: [boolean, boolean, boolean, boolean] = [
          owned.get(key(cx, cy - 1)) === own,
          owned.get(key(cx + 1, cy)) === own,
          owned.get(key(cx, cy + 1)) === own,
          owned.get(key(cx - 1, cy)) === own,
        ];
        territoryTile(g, ctx.tint, x, y, size, townColor('player', own), open, 0.9);
      }
    }
    for (const [k, from] of contesting) {
      const [cx, cy] = k.split(',').map(Number);
      const p = Phaser.Math.Clamp((elapsed - from) / CONTEST_MS, 0, 1);
      contestTile(g, ox + cx * size, oy + cy * size, size, p, townColor('player', 0), t);
      if (p >= 1) { owned.set(k, 0); contesting.delete(k); }
    }
  });

  return {
    size,
    cell: (cx, cy) => ({ x: ox + cx * size + size / 2, y: oy + cy * size + size / 2 }),
    own: (cx, cy, town) => { if (town < 0) owned.delete(key(cx, cy)); else owned.set(key(cx, cy), town); },
    contest: (cx, cy, from) => contesting.set(key(cx, cy), from),
  };
}

/** The Authority readout — the only currency, and the reason for everything else. */
function authority(ctx: PreviewCtx, read: () => number, o?: { rate?: () => number }): void {
  const t = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 12, '', {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(CNQ.gold),
  }).setOrigin(0.5).setDepth(21));
  ctx.onFrame(() => t.setText(`👑 ${Math.floor(read())}${o?.rate ? `   ·   +${o.rate()}/s` : ''}`));
}

/** A placed building, drawn with the kit's own painters and carrying a real HP bar. */
interface Building { at: Mark; kind: 'barracks' | 'turret' | 'barricade' | 'town'; hp: number; max: number; ang: number }

function buildings(ctx: PreviewCtx, list: Building[], o?: { spiked?: boolean }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    for (const b of list) {
      const col = townColor('player', 0);
      const s = BUILDING_R * 1.6;
      if (b.kind === 'town') townCenterBody(g, ctx.tint, b.at.x, b.at.y, s, col, t, 1);
      else if (b.kind === 'barracks') barracksBody(g, ctx.tint, b.at.x, b.at.y, s, col, 1);
      else if (b.kind === 'turret') turretBody(g, ctx.tint, b.at.x, b.at.y, s, col, b.ang, 0, 1);
      else barricadeBody(g, ctx.tint, b.at.x, b.at.y, s, col, !!o?.spiked, 1);
      if (b.hp >= b.max) continue;
      buildingHpBar(g, b.at.x, b.at.y - s * 0.7, s, b.hp / b.max, col, 1);
    }
  });
}

// ── Click — Banner Bash ───────────────────────────────────────────────

function bannerLoop(ctx: PreviewCtx, opts: { bearer: boolean }): void {
  const bd = board(ctx, { cols: 6, rows: 3 });
  const home = bd.cell(1, 1);
  const s = drivenCaster(ctx, { x: home.x, y: home.y });
  const foe: Mark = { x: bd.cell(4, 1).x, y: bd.cell(4, 1).y };
  dummy(ctx, foe);
  // Nine squares around the town centre — the block you start with.
  for (let cy = 0; cy < 3; cy++) for (let cx = 0; cx < 3; cx++) bd.own(cx, cy, 0);
  buildings(ctx, [{ at: bd.cell(1, 1), kind: 'town', hp: 1, max: 1, ang: 0 }]);

  let standing = 0;
  const reach = PIKE_REACH * (bd.size / CELL);
  const thrust = (at: number, dmg: number, colour: number, note: string): void => {
    ctx.at(at, () => {
      s.av.play('punch', ctx.aim);
      s.fx.thrust(s.at.x, s.at.y, ctx.aim, reach, colour);
      tick(ctx, s.at.x, s.at.y - 40, note, colour);
      if (Phaser.Math.Distance.Between(s.at.x, s.at.y, foe.x, foe.y) > reach) return;
      tick(ctx, foe.x, foe.y - 14, `${dmg}`, colour);
    });
  };

  if (!opts.bearer) {
    // On your own land the pike is a quarter of itself — home is safety, not strength.
    thrust(500, PIKE_DAMAGE * PIKE_HOME_MULT, CNQ.stoneDark, '🏠 ON YOUR OWN LAND');
    ctx.at(1600, () => tick(ctx, s.at.x, s.at.y - 58, `−${Math.round((1 - HOME_ARMOUR) * 100)}% DAMAGE TAKEN`, CNQ.gold));
    // Walk off it, and the pike comes back.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 2200 || elapsed > 3400) return;
      s.at.x += 130 * (dt / 1000);
    });
    thrust(3600, PIKE_DAMAGE, CNQ.banner, '⚔️ OFF IT');
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${PIKE_REACH}px of reach — the longest melee in the game — and ${PIKE_DAMAGE * PIKE_HOME_MULT} of it at home`,
      CNQ.stoneDark);
    return;
  }

  // Banner Bearer: right-click cycles the standard, and each one re-tunes the pike.
  const STANDARDS = [
    { name: '⚔️ OFFENSIVE', color: CNQ.banner, dmg: PIKE_DAMAGE, note: 'nearby soldiers +3 damage' },
    { name: '🛡️ DEFENSIVE', color: CNQ.iron, dmg: 10, note: 'twice as fast · buildings take a fifth less' },
    { name: '💚 HEALING', color: CNQ.mend, dmg: 25, note: 'half as often · mends nearby soldiers' },
  ];
  const troops: Mark[] = [bd.cell(2, 0), bd.cell(2, 2)];
  const tg = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    tg.clear();
    for (const tr of troops) {
      soldier(tg, ctx.tint, tr.x, tr.y, townColor('player', 0), 0, t * 4, 1, 1);
    }
  });

  for (let i = 0; i < 3; i++) {
    const st = STANDARDS[i];
    ctx.at(400 + i * 2000, () => {
      standing = i;
      s.cav?.setBanner(st.color);
      s.fx.bannerSwap(s.at.x, s.at.y, st.color);
      tick(ctx, s.at.x, s.at.y - 56, st.name, st.color);
      tick(ctx, s.at.x, s.at.y - 74, st.note, CNQ.parchment);
    });
    // Defensive thrusts twice as fast; Healing half as often. The rate is the ability.
    const shots = i === 1 ? 4 : i === 2 ? 1 : 2;
    for (let k = 0; k < shots; k++) {
      thrust(900 + i * 2000 + k * (i === 1 ? 350 : 700), st.dmg, st.color, '');
    }
  }
  void standing;

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    'right-click to change standard — the pike and the aura change together', CNQ.stoneDark);
}

export const banner: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Click — 260px of pike, and a quarter of it while you stand on your own land',
  run(ctx) { bannerLoop(ctx, { bearer: false }); },
};

export const bannerUpgraded: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Banner Bearer — three standards, each re-tuning the pike and buffing what stands near you',
  run(ctx) { bannerLoop(ctx, { bearer: true }); },
};

// ── E — Place Barracks ────────────────────────────────────────────────

function barracksLoop(ctx: PreviewCtx, opts: { shadow: boolean }): void {
  const bd = board(ctx, { cols: 7, rows: 4 });
  const s = stageIt(ctx);
  s.at.x = bd.cell(1, 2).x;
  s.at.y = bd.cell(1, 2).y;
  const foe: Mark = { x: bd.cell(5, 1).x, y: bd.cell(5, 1).y };
  dummy(ctx, foe);
  for (let cy = 1; cy <= 3; cy++) for (let cx = 0; cx <= 2; cx++) bd.own(cx, cy, 0);

  let gold = 60;
  authority(ctx, () => gold, { rate: () => 2 });
  const built: Building[] = [{ at: bd.cell(1, 2), kind: 'town', hp: 1, max: 1, ang: 0 }];
  buildings(ctx, built);
  ctx.onFrame((dt) => { gold += 2 * (dt / 1000); });

  interface Troop { x: number; y: number; hp: number; march: number; fresh: boolean; cloak: boolean }
  const troops: Troop[] = [];
  const tg = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
  const barrackAt = bd.cell(2, 2);
  let nextSpawn = -1;
  let nextSwing = 0;

  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    tg.clear();
    if (nextSpawn >= 0 && elapsed >= nextSpawn && troops.length < 3) {
      nextSpawn = elapsed + 3000;
      troops.push({
        x: barrackAt.x + (Math.random() - 0.5) * 20,
        y: barrackAt.y + 18 + (Math.random() - 0.5) * 12,
        hp: 25, march: Math.random() * 6, fresh: false, cloak: opts.shadow,
      });
      s.fx.mend(barrackAt.x, barrackAt.y + 16);
    }
    for (const tr of troops) {
      tr.march += dt / 90;
      soldier(tg, ctx.tint, tr.x, tr.y, townColor('player', 0), 0, tr.march, 1, 1);
      if (tr.cloak) {
        // Shadow Cloak reads as a shroud rather than as a number.
        tg.fillStyle(ctx.tint(CNQ.shroud), 0.35 + 0.15 * Math.sin(t * 3 + tr.march));
        tg.fillCircle(tr.x, tr.y, 13);
      }
    }
    // They hold their ground and hit whatever is inside 90px of them.
    if (elapsed < nextSwing) return;
    nextSwing = elapsed + 1000;
    const reach = TROOP_RANGE * (bd.size / CELL);
    for (const tr of troops) {
      if (Phaser.Math.Distance.Between(tr.x, tr.y, foe.x, foe.y) > reach) continue;
      const dmg = 3 + (tr.fresh ? SURPRISE_BONUS : 0) + (opts.shadow ? 2 : 0);
      tr.fresh = false;
      tick(ctx, foe.x + (Math.random() - 0.5) * 16, foe.y - 12, `${dmg}`, CNQ.blood);
    }
  });

  ctx.at(600, () => {
    gold -= BUILD_COST.barracks;
    s.av.play('slam', 0);
    s.fx.raise(barrackAt.x, barrackAt.y, BUILDING_R * 1.6, townColor('player', 0));
    built.push({ at: barrackAt, kind: 'barracks', hp: 250, max: 250, ang: 0 });
    bd.own(2, 2, 0);
    nextSpawn = 600;
    tick(ctx, barrackAt.x, barrackAt.y - 34, `⚔️ −${BUILD_COST.barracks} 👑`, CNQ.gold);
    tick(ctx, barrackAt.x, barrackAt.y - 52, '250 HP · A SOLDIER EVERY 3s', CNQ.parchment);
  });

  // Dragged forward — soldiers hold their ground until you move them yourself.
  ctx.at(opts.shadow ? 5200 : 6000, () => {
    const to = bd.cell(opts.shadow ? 4 : 3, 2);
    for (const tr of troops) {
      tr.x = to.x + (Math.random() - 0.5) * 22;
      tr.y = to.y + (Math.random() - 0.5) * 16;
      tr.fresh = opts.shadow;
    }
    s.fx.claim(to.x, to.y, bd.size, townColor('player', 0));
    tick(ctx, to.x, to.y - 34,
      opts.shadow ? `🥷 TWO SQUARES · +${SURPRISE_BONUS} FIRST SWING` : '🫳 DRAGGED', CNQ.arcane);
    if (opts.shadow) tick(ctx, to.x, to.y - 52, `TRAMPLE ${GUILD_TRAMPLE}`, CNQ.arcane);
  });
  if (opts.shadow) {
    ctx.at(4000, () => {
      s.fx.cloakMiss(troops[0]?.x ?? s.at.x, troops[0]?.y ?? s.at.y);
      tick(ctx, troops[0]?.x ?? s.at.x, (troops[0]?.y ?? s.at.y) - 26, 'MISS', CNQ.shroud);
    });
  }

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.shadow ? `SHADOW — two-square marches, a +${SURPRISE_BONUS} opening swing, 50% dodge and a ${GUILD_TRAMPLE}-damage trample`
      : `${BUILD_COST.barracks} 👑 · 3 soldiers a square at 3 damage a second · they never chase`,
    CNQ.stoneDark);
}

export const barracks: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'E — 35 Authority for a barracks that trains soldiers who hold whatever square you put them on',
  run(ctx) { barracksLoop(ctx, { shadow: false }); },
};

export const barracksUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Barracks Enhanced — SHADOW: two-square marches, opening swings, dodge and a trample',
  run(ctx) { barracksLoop(ctx, { shadow: true }); },
};

// ── R — Place Turret ──────────────────────────────────────────────────

function turretLoop(ctx: PreviewCtx, opts: { ordnance: boolean }): void {
  const bd = board(ctx, { cols: 7, rows: 4 });
  const s = stageIt(ctx);
  s.at.x = bd.cell(1, 2).x;
  s.at.y = bd.cell(1, 2).y;
  const foe: Mark = { x: bd.cell(5, 1).x, y: bd.cell(5, 1).y };
  dummy(ctx, foe);
  for (let cy = 1; cy <= 3; cy++) for (let cx = 0; cx <= 2; cx++) bd.own(cx, cy, 0);

  let gold = 40;
  authority(ctx, () => gold, { rate: () => 2 });
  const at = bd.cell(2, 2);
  const built: Building[] = [
    { at: bd.cell(1, 2), kind: 'town', hp: 1, max: 1, ang: 0 },
  ];
  buildings(ctx, built);
  ctx.onFrame((dt) => { gold += 2 * (dt / 1000); });

  const range = TURRET_RANGE * (bd.size / CELL);
  const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  let live = false;
  let nextShot = 0;
  ctx.onFrame((_dt, elapsed) => {
    ring.clear();
    if (!live) return;
    const tur = built.find((b) => b.kind === 'turret');
    if (tur) tur.ang = Math.atan2(foe.y - at.y, foe.x - at.x);
    ring.lineStyle(1, ctx.tint(CNQ.tracer), 0.22);
    ring.strokeCircle(at.x, at.y, opts.ordnance ? range * (140 / 220) : range);
    if (elapsed < nextShot) return;
    nextShot = elapsed + 2000;
    if (Phaser.Math.Distance.Between(at.x, at.y, foe.x, foe.y) > (opts.ordnance ? range * (140 / 220) : range)) return;
    if (opts.ordnance) {
      // Blast Nucleus: the gun is gone, and it simply detonates instead.
      s.fx.blast(at.x, at.y, 70 * (bd.size / CELL), true);
      tick(ctx, foe.x, foe.y - 14, `${10 * 2}`, CNQ.ember);
      return;
    }
    const a = Math.atan2(foe.y - at.y, foe.x - at.x);
    s.fx.muzzle(at.x, at.y, a);
    s.fx.tracer(at.x, at.y, foe.x, foe.y);
    tick(ctx, foe.x, foe.y - 14, '10', CNQ.tracer);
  });

  ctx.at(600, () => {
    gold -= BUILD_COST.turret;
    s.av.play('slam', 0);
    s.fx.raise(at.x, at.y, BUILDING_R * 1.6, townColor('player', 0));
    built.push({ at, kind: 'turret', hp: 100, max: 100, ang: 0 });
    bd.own(2, 2, 0);
    live = true;
    nextShot = 900;
    tick(ctx, at.x, at.y - 34, `🔫 −${BUILD_COST.turret} 👑`, CNQ.gold);
    tick(ctx, at.x, at.y - 52,
      opts.ordnance ? '100 HP · BLAST NUCLEUS' : `100 HP · 10 EVERY 2s TO ${TURRET_RANGE}px`, CNQ.parchment);
  });

  if (opts.ordnance) {
    // Boom Back: hit the tower and it lobs a bomb at whoever did it.
    ctx.at(3600, () => {
      const tur = built.find((b) => b.kind === 'turret');
      if (tur) tur.hp = 70;
      s.fx.chip(at.x, at.y, CNQ.blood);
      tick(ctx, at.x, at.y - 26, 'HIT', CNQ.blood);
      ctx.at(220, () => {
        s.fx.boom(foe.x, foe.y, 40 * (bd.size / CELL));
        tick(ctx, foe.x, foe.y - 14, '8', CNQ.ember);
        tick(ctx, foe.x, foe.y - 32, '💣 BOOM BACK · DRAGGED IN', CNQ.ember);
      });
    });
  }

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    opts.ordnance ? 'ORDNANCE — bursting bullets, revenge bombs, and a blast tower on a 140px leash'
      : `${BUILD_COST.turret} 👑 · shoots their fighter, their soldiers and their buildings alike`,
    CNQ.stoneDark);
}

export const turret: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'R — 25 Authority for a gun that puts 10 into anything of theirs inside 220px',
  run(ctx) { turretLoop(ctx, { ordnance: false }); },
};

export const turretUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Turret Enhanced — ORDNANCE: bursts, revenge bombs, and a tower that detonates instead of firing',
  run(ctx) { turretLoop(ctx, { ordnance: true }); },
};

// ── F — Place Barricade ───────────────────────────────────────────────

function barricadeLoop(ctx: PreviewCtx, opts: { bulwark: boolean }): void {
  const bd = board(ctx, { cols: 7, rows: 4 });
  const home = bd.cell(2, 2);
  const s = drivenCaster(ctx, { x: home.x, y: home.y });
  const foe: Mark = { x: bd.cell(6, 1).x, y: bd.cell(6, 1).y };
  dummy(ctx, foe);
  for (let cy = 1; cy <= 3; cy++) for (let cx = 0; cx <= 3; cx++) bd.own(cx, cy, 0);

  let gold = 40;
  authority(ctx, () => gold, { rate: () => 2 });
  const turretAt = bd.cell(3, 1);
  const built: Building[] = [
    { at: bd.cell(1, 2), kind: 'town', hp: 1, max: 1, ang: 0 },
    { at: turretAt, kind: 'turret', hp: 100, max: 100, ang: 0 },
  ];
  buildings(ctx, built);
  ctx.onFrame((dt) => { gold += 2 * (dt / 1000); });

  const wallAt = bd.cell(3, 2);
  let placed = false;
  const aura = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    aura.clear();
    if (!placed) return;
    // The eight squares the resistance aura covers, diagonals included.
    aura.lineStyle(1.4, ctx.tint(CNQ.iron), 0.3 + 0.15 * Math.sin(t * 2));
    aura.strokeRect(wallAt.x - bd.size * 1.5, wallAt.y - bd.size * 1.5, bd.size * 3, bd.size * 3);
    if (!opts.bulwark) return;
    hasteRing(aura, ctx.tint, wallAt.x, wallAt.y, HASTE_RANGE * (bd.size / CELL), townColor('player', 0), t, 0.8);
  });

  ctx.at(600, () => {
    gold -= BUILD_COST.barricade;
    placed = true;
    s.av.play('slam', 0);
    s.fx.raise(wallAt.x, wallAt.y, BUILDING_R * 1.6, townColor('player', 0));
    built.push({ at: wallAt, kind: 'barricade', hp: 300, max: 300, ang: 0 });
    bd.own(3, 2, 0);
    tick(ctx, wallAt.x, wallAt.y - 34, `🧱 −${BUILD_COST.barricade} 👑`, CNQ.gold);
    tick(ctx, wallAt.x, wallAt.y - 52, '300 HP · −25% TO EVERY NEIGHBOUR', CNQ.parchment);
  });

  // Something arrives at the turret, and the wall is why it survives.
  for (let i = 0; i < 3; i++) {
    ctx.at(2200 + i * 900, () => {
      const tur = built.find((b) => b.kind === 'turret');
      if (!tur) return;
      const raw = 40;
      const taken = placed ? raw * 0.75 : raw;
      tur.hp = Math.max(0, tur.hp - taken);
      s.fx.chip(turretAt.x, turretAt.y, CNQ.blood);
      tick(ctx, turretAt.x, turretAt.y - 20, `${Math.round(taken)}`, CNQ.blood);
      if (i === 0 && placed) tick(ctx, turretAt.x, turretAt.y - 38, `${raw} → ${Math.round(taken)}`, CNQ.iron);
    });
  }

  if (!opts.bulwark) {
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${BUILD_COST.barricade} 👑 — the cheapest thing on the board, and it never attacks anything`, CNQ.stoneDark);
    return;
  }

  // BULWARK: the only column that does anything for you rather than for your buildings.
  let linked = false;
  const chain = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  ctx.onFrame((_dt, elapsed) => {
    chain.clear();
    if (!linked) return;
    linkChain(chain, ctx.tint, s.at.x, s.at.y, wallAt.x, wallAt.y,
      townColor('player', 0), elapsed / 1000, true, 1);
  });
  ctx.at(5000, () => {
    linked = true;
    tick(ctx, s.at.x, s.at.y - 40, '⛓ PERSONAL WALL', CNQ.arcane);
    tick(ctx, s.at.x, s.at.y - 58,
      `+${Math.round((FORCE_SPEED - 1) * 100)}% SPEED · +${Math.round((FORCE_DAMAGE - 1) * 100)}% DAMAGE`, CNQ.arcane);
  });
  ctx.at(6400, () => {
    const wall = built.find((b) => b.kind === 'barricade');
    if (wall) wall.hp = Math.max(0, wall.hp - 30);
    s.fx.chip(wallAt.x, wallAt.y, CNQ.blood);
    tick(ctx, wallAt.x, wallAt.y - 22, '30', CNQ.blood);
    tick(ctx, s.at.x, s.at.y - 24, 'IT TOOK IT FOR YOU', CNQ.arcane);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `BULWARK — +${Math.round((HASTE_PER - 1) * 100)}% speed per wall to ${HASTE_MAX_STACKS}, marchable walls, and one you link to`,
    CNQ.stoneDark);
}

export const barricade: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'F — 10 Authority for a wall that never attacks and makes everything beside it harder to break',
  run(ctx) { barricadeLoop(ctx, { bulwark: false }); },
};

export const barricadeUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Barricade Enhanced — BULWARK: walls that hurry you along, and one that takes your hits',
  run(ctx) { barricadeLoop(ctx, { bulwark: true }); },
};

// ── Q — Expansion ─────────────────────────────────────────────────────

function expansionLoop(ctx: PreviewCtx, opts: { arcane: boolean }): void {
  const bd = board(ctx, { cols: 8, rows: 4 });
  const home = bd.cell(1, 2);
  const s = drivenCaster(ctx, { x: home.x, y: home.y });
  const foe: Mark = { x: bd.cell(7, 1).x, y: bd.cell(7, 1).y };
  dummy(ctx, foe);
  for (let cy = 1; cy <= 3; cy++) for (let cx = 0; cx <= 2; cx++) bd.own(cx, cy, 0);

  const cost = opts.arcane ? EXPANSION_COST_ENHANCED : EXPANSION_COST;
  let gold = cost + 20;
  let rate = 2;
  authority(ctx, () => gold, { rate: () => rate });
  const built: Building[] = [{ at: bd.cell(1, 2), kind: 'town', hp: 1, max: 1, ang: 0 }];
  buildings(ctx, built);
  ctx.onFrame((dt) => { gold += rate * (dt / 1000); });

  // Walk to where the second capital goes.
  ctx.onFrame((dt, elapsed) => {
    if (elapsed < 400 || elapsed > 1800) return;
    s.at.x += 150 * (dt / 1000);
  });

  const second = bd.cell(5, 2);
  ctx.at(2000, () => {
    gold -= cost;
    rate = 4;
    s.av.play('raise');
    s.fx.raise(second.x, second.y, BUILDING_R * 2, townColor('player', 1));
    built.push({ at: second, kind: 'town', hp: 1, max: 1, ang: 0 });
    for (let cy = 1; cy <= 3; cy++) for (let cx = 4; cx <= 6; cx++) bd.own(cx, cy, 1);
    ctx.scene.cameras.main.shake(200, 0.004);
    tick(ctx, second.x, second.y - 40, `🏛️ −${cost} 👑`, CNQ.gold);
    tick(ctx, second.x, second.y - 58, `ITS OWN 9 SQUARES · +2/s · ${BUILDINGS_PER_TOWN} MORE SLOTS`, CNQ.parchment);
  });

  if (!opts.arcane) {
    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${EXPANSION_COST} 👑 is 75 seconds of base income — a decision about the next two minutes`,
      CNQ.stoneDark);
    return;
  }

  // ARCANE: a fireball forms over the dome and is dragged off it.
  let orbFrom = -1;
  const orb: Mark = { x: second.x, y: second.y - 34 };
  let flying: Mark | null = null;
  const og = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((dt, elapsed) => {
    const t = elapsed / 1000;
    og.clear();
    if (orbFrom >= 0 && !flying) {
      orb.x = second.x;
      orb.y = second.y - 34 + Math.sin(t * 2) * 3;
      fireballOrb(og, ctx.tint, orb.x, orb.y, t, 1, 1);
    }
    if (!flying) return;
    const step = dt / 1000;
    const a = Math.atan2(foe.y - orb.y, foe.x - orb.x);
    orb.x += Math.cos(a) * FIREBALL_SPEED * (bd.size / CELL) * step;
    orb.y += Math.sin(a) * FIREBALL_SPEED * (bd.size / CELL) * step;
    fireballOrb(og, ctx.tint, orb.x, orb.y, t, 1.1, 1);
    if (Phaser.Math.Distance.Between(orb.x, orb.y, foe.x, foe.y) > 22) return;
    flying = null;
    orbFrom = -1;
    s.fx.fireburst(foe.x, foe.y, FIREBALL_RADIUS * (bd.size / CELL));
    tick(ctx, foe.x, foe.y - 14, `${FIREBALL_DAMAGE}`, CNQ.ember);
  });
  ctx.at(3000, () => {
    orbFrom = 3000;
    tick(ctx, second.x, second.y - 40, '🔮 WIZARD TOWER', CNQ.arcane);
  });
  ctx.at(4200, () => {
    flying = { x: foe.x, y: foe.y };
    tick(ctx, orb.x, orb.y - 24, '🔥 HURLED', CNQ.ember);
  });

  // …and a soldier promoted to a wizard, three squares of reach and half the damage.
  const wiz: Mark = bd.cell(4, 3);
  let promoted = -1;
  const wg = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    wg.clear();
    if (promoted < 0) { soldier(wg, ctx.tint, wiz.x, wiz.y, townColor('player', 1), 0, t * 4, 1, 1); return; }
    wizardTroop(wg, ctx.tint, wiz.x, wiz.y, townColor('player', 1), 0, t * 3, true, 1);
    wg.lineStyle(1, ctx.tint(CNQ.arcane), 0.25);
    wg.strokeCircle(wiz.x, wiz.y, WIZARD_RANGE * (bd.size / CELL));
  });
  ctx.at(5400, () => {
    promoted = 5400;
    s.fx.promote(wiz.x, wiz.y);
    tick(ctx, wiz.x, wiz.y - 30, '🧙 WIZARD SCHOOL', CNQ.arcane);
    tick(ctx, wiz.x, wiz.y - 48, '2× HP · 3 SQUARES · HALF DAMAGE', CNQ.arcane);
  });
  ctx.at(7000, () => {
    s.fx.ashBurst(wiz.x, wiz.y, ASH_RADIUS * (bd.size / CELL));
    tick(ctx, wiz.x, wiz.y - 30, `🕯 ACADEMY OF ASH · ${ASH_DAMAGE}`, CNQ.ember);
  });

  label(ctx, ctx.w * 0.5, ctx.h - 8,
    `${EXPANSION_COST_ENHANCED} 👑 instead of ${EXPANSION_COST}, and ARCANE on every town centre you own`,
    CNQ.stoneDark);
}

export const expansion: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Q — a second capital: its own nine squares, its own income, and nine more building slots',
  run(ctx) { expansionLoop(ctx, { arcane: false }); },
};

export const expansionUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Expansion Enhanced — a third cheaper, and ARCANE: fireballs, wizards and an Academy of Ash',
  run(ctx) { expansionLoop(ctx, { arcane: true }); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const theBoard: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'A 14×9 grid nobody else can see. Your land halves what you take and quarters what you deal',
  run(ctx) {
    const bd = board(ctx, { cols: 7, rows: 4 });
    const home = bd.cell(1, 2);
    const s = drivenCaster(ctx, { x: home.x, y: home.y });
    const foe: Mark = { x: bd.cell(5, 2).x, y: bd.cell(5, 2).y };
    dummy(ctx, foe);
    for (let cy = 1; cy <= 3; cy++) for (let cx = 0; cx <= 2; cx++) bd.own(cx, cy, 0);
    buildings(ctx, [{ at: bd.cell(1, 2), kind: 'town', hp: 1, max: 1, ang: 0 }]);

    label(ctx, bd.cell(1, 2).x, bd.cell(1, 2).y + bd.size * 0.7, 'your nine squares', CNQ.gold);
    ctx.at(600, () => {
      tick(ctx, s.at.x, s.at.y - 40, `🏠 −${Math.round((1 - HOME_ARMOUR) * 100)}% DAMAGE TAKEN`, CNQ.gold);
      tick(ctx, s.at.x, s.at.y - 58, `PIKE ${PIKE_DAMAGE} → ${PIKE_DAMAGE * PIKE_HOME_MULT}`, CNQ.stoneDark);
    });

    // Walk out onto neutral ground and hold it — two seconds, and it flips.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 1800 || elapsed > 3200) return;
      s.at.x += 120 * (dt / 1000);
    });
    ctx.at(3200, () => {
      bd.contest(3, 2, 3200);
      tick(ctx, s.at.x, s.at.y - 40, `⏳ CONTESTING · ${CONTEST_MS / 1000}s`, CNQ.banner);
    });
    ctx.at(3200 + CONTEST_MS, () => {
      s.fx.claim(bd.cell(3, 2).x, bd.cell(3, 2).y, bd.size, townColor('player', 0));
      tick(ctx, s.at.x, s.at.y - 40, '🚩 TAKEN', CNQ.gold);
    });
    ctx.at(5800, () => {
      s.av.play('punch', ctx.aim);
      s.fx.thrust(s.at.x, s.at.y, ctx.aim, PIKE_REACH * (bd.size / CELL), CNQ.stoneDark);
      tick(ctx, foe.x, foe.y - 14, `${PIKE_DAMAGE * PIKE_HOME_MULT}`, CNQ.stoneDark);
      tick(ctx, s.at.x, s.at.y - 40, 'AND NOW IT IS YOURS, SO THE PIKE IS BLUNT AGAIN', CNQ.stoneDark);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${CELL}px squares · ${CONTEST_MS / 1000}s of standing to flip one · ${BUILDINGS_PER_TOWN} building slots a town`,
      CNQ.stoneDark);
  },
};

export const authorityPassive: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Two a second, from the first frame, whether you are fighting or not',
  run(ctx) {
    const bd = board(ctx, { cols: 6, rows: 3 });
    const s = stageIt(ctx);
    s.at.x = bd.cell(1, 1).x;
    s.at.y = bd.cell(1, 1).y;
    for (let cy = 0; cy < 3; cy++) for (let cx = 0; cx <= 2; cx++) bd.own(cx, cy, 0);

    let gold = START_AUTHORITY;
    let rate = 2;
    authority(ctx, () => gold, { rate: () => rate });
    const built: Building[] = [{ at: bd.cell(1, 1), kind: 'town', hp: 1, max: 1, ang: 0 }];
    buildings(ctx, built);
    ctx.onFrame((dt) => { gold += rate * (dt / 1000); });

    const buys: Array<{ at: number; cost: number; kind: 'barracks' | 'turret' | 'barricade'; cell: [number, number] }> = [
      { at: 1400, cost: BUILD_COST.barricade, kind: 'barricade', cell: [3, 1] },
      { at: 3000, cost: BUILD_COST.turret, kind: 'turret', cell: [3, 0] },
      { at: 6200, cost: BUILD_COST.barracks, kind: 'barracks', cell: [3, 2] },
    ];
    for (const b of buys) {
      ctx.at(b.at, () => {
        if (gold < b.cost) { tick(ctx, s.at.x, s.at.y - 40, `👑 NOT ENOUGH FOR ${b.kind.toUpperCase()}`, CNQ.stoneDark); return; }
        gold -= b.cost;
        const at = bd.cell(b.cell[0], b.cell[1]);
        s.av.play('slam', 0);
        s.fx.raise(at.x, at.y, BUILDING_R * 1.6, townColor('player', 0));
        built.push({ at, kind: b.kind, hp: 1, max: 1, ang: 0 });
        bd.own(b.cell[0], b.cell[1], 0);
        tick(ctx, at.x, at.y - 34, `−${b.cost} 👑`, CNQ.gold);
      });
    }
    // Insurance: the only thing in the game that pays you for being hit.
    ctx.at(4400, () => {
      gold += 2;
      s.fx.coins(s.at.x, s.at.y, 3);
      tick(ctx, s.at.x, s.at.y - 26, '50 TAKEN', CNQ.blood);
      tick(ctx, s.at.x, s.at.y - 44, '🛡 INSURANCE · +2 👑', CNQ.gold);
    });
    ctx.at(5400, () => {
      rate = 4;
      s.fx.coins(bd.cell(1, 1).x, bd.cell(1, 1).y, 6);
      tick(ctx, bd.cell(1, 1).x, bd.cell(1, 1).y - 40, '💰 RICHER ×2 · +2/s', CNQ.gold);
    });

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      `${START_AUTHORITY} to start · barricade ${BUILD_COST.barricade} · turret ${BUILD_COST.turret} · barracks ${BUILD_COST.barracks} · expansion ${EXPANSION_COST}`,
      CNQ.stoneDark);
  },
};

export const onePathOnly: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Three columns of four, and committing past tier 2 on one pins the other two there forever',
  run(ctx) {
    stageIt(ctx);
    const COLS = ['NUMBERS', 'STRENGTH', 'SHADOW'];
    const tiers = [0, 0, 0];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const heads = COLS.map((name, i) => ctx.adopt(ctx.scene.add.text(0, 0, name, {
      fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(i === 2 ? CNQ.arcane : CNQ.parchment),
    }).setOrigin(0.5).setDepth(9)));

    ctx.onFrame(() => {
      g.clear();
      const committed = tiers.findIndex((t) => t >= 3);
      for (let c = 0; c < 3; c++) {
        const x = ctx.w * (0.28 + c * 0.22);
        heads[c].setPosition(x, ctx.h * 0.2);
        for (let r = 0; r < 4; r++) {
          const y = ctx.h * 0.34 + r * 16;
          const bought = tiers[c] > r;
          // Locked: another path has committed and this one is already at its ceiling.
          const locked = committed >= 0 && committed !== c && r >= 2;
          g.fillStyle(ctx.tint(bought ? (c === 2 ? CNQ.arcane : CNQ.gold) : locked ? CNQ.stoneDark : CNQ.stone),
            bought ? 1 : locked ? 0.3 : 0.6);
          g.fillRect(x - 22, y - 6, 44, 12);
          g.lineStyle(1, ctx.tint(locked ? CNQ.stoneDark : CNQ.goldDeep), locked ? 0.4 : 0.8);
          g.strokeRect(x - 22, y - 6, 44, 12);
          if (!locked) continue;
          g.lineStyle(1.2, ctx.tint(CNQ.blood), 0.7);
          g.lineBetween(x - 8, y - 4, x + 8, y + 4);
          g.lineBetween(x + 8, y - 4, x - 8, y + 4);
        }
      }
    });

    const buy = (at: number, col: number, note: string, color: number): void => {
      ctx.at(at, () => {
        tiers[col]++;
        tick(ctx, ctx.w * (0.28 + col * 0.22), ctx.h * 0.34 - 14, note, color);
      });
    };
    buy(700, 0, 'Recruits', CNQ.gold);
    buy(1500, 1, 'Axes', CNQ.gold);
    buy(2300, 0, 'Crowding', CNQ.gold);
    buy(3100, 1, 'Dual Wield', CNQ.gold);
    ctx.at(4200, () => {
      tiers[0]++;
      tick(ctx, ctx.w * 0.28, ctx.h * 0.34 - 14, 'Recruitment Office', CNQ.gold);
      tick(ctx, ctx.w * 0.5, ctx.h * 0.68, '🔒 STRENGTH AND SHADOW PINNED AT 2', CNQ.blood);
    });
    buy(5800, 0, 'Strength in Numbers', CNQ.gold);
    ctx.at(7000, () => tick(ctx, ctx.w * 0.5, ctx.h * 0.68, 'FOREVER — AND PER BUILDING', CNQ.stoneDark));

    label(ctx, ctx.w * 0.5, ctx.h - 8,
      'every building keeps its own tree, so several cheap specialists beat one expensive generalist',
      CNQ.stoneDark);
  },
};
