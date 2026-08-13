import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  FOOD, FoodKind, FoodStamp, GLT, GluttonyAvatar, GluttonyFx,
  charcoalLump, chefCleaver, cookRing, foodHeal, foodShape, gobbet as drawGobbet, grillHeat,
  grillRig, hungerBar, itemShape, kitchenKnife, mawBody, mawTentacle, prepSlot, ratBody, ratHole,
  skewerShape, spatter, stewPot,
} from '../../../elements/kits/GluttonyVisuals';

/**
 * Gluttony's showcases.
 *
 * Nothing this element throws is a sprite — the knife, the coal, the food, the skewer and the
 * meat the maw spits are all Graphics the kit repaints every frame — so every loop here keeps
 * the same little records the kit keeps and paints them with the kit's own exported painters:
 * `grillRig` + `grillHeat` for the grill, `mawBody` + `mawTentacle` for what it becomes,
 * `foodShape` + `cookRing` for the grate, and `prepSlot` + `hungerBar` for the HUD the element
 * is really played on.
 *
 * The prep strip and the hunger bar matter enough that most of these loops draw them: half of
 * Gluttony is a screen-space UI, and a showcase without it is documenting a different element.
 */

// ── Staging ───────────────────────────────────────────────────────────

interface Mark { x: number; y: number }
/**
 * One thing on the grate. `progress` runs past the ingredient's own cook time when Pit Master
 * is on: over-searing is a second pass after done, not a longer first one, so `stage` is what
 * the ring and the drawing read rather than a single ratio.
 */
interface Cook {
  kind: FoodKind; progress: number; slot: number; seed: number;
  oversear?: boolean; stage?: 0 | 1 | 2;
}
interface Item extends FoodStamp { kind: FoodKind; cooked: boolean }
/** Something spoiling on the teeth — the maw's own four-slot grate. */
interface Rot { item: Item; progress: number; slot: number }

const SLOT_OFFSETS: Array<[number, number]> = [[-17, -7], [17, -7], [-17, 8], [17, 8]];
const GRILL_R = 30;
const ROT_MS = 6000;

/** Where a spoiling thing sits — a ring around the lip, exactly as the kit places it. */
function rotPos(cx: number, cy: number, slot: number): [number, number] {
  const a = (slot / 4) * Math.PI * 2 + Math.PI / 4;
  return [cx + Math.cos(a) * GRILL_R * 1.1, cy + Math.sin(a) * GRILL_R * 0.72];
}

function fxOf(ctx: PreviewCtx): GluttonyFx {
  return ctx.capture(() => new GluttonyFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

function dummyAt(ctx: PreviewCtx, at: Mark, depth = 5): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(at.x - 5.6, at.y - 4, 1.6); g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(24));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(24));
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** The chef rig, or null when a skin has replaced the character. */
function chef(av: BaseAvatar): GluttonyAvatar | null {
  return av instanceof GluttonyAvatar ? av : null;
}

/** The caster, driven by the script rather than pinned to the harness's mark. */
function drivenCaster(
  ctx: PreviewCtx, read: () => { x: number; y: number; alpha: number },
): BaseAvatar {
  if (ctx.scene.textures.exists('elem-gluttony')) {
    const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-gluttony').setDepth(5));
    ctx.onFrame(() => {
      const s = read();
      body.setPosition(s.x, s.y).setAlpha(s.alpha);
    });
  }
  const av = ctx.useAvatar(() => new GluttonyAvatar(ctx.scene, ctx.tint));
  ctx.onFrame((dt) => {
    const s = read();
    av.update(dt, s.x, s.y, s.alpha);
  });
  return av;
}

/**
 * The grill in the middle of the arena, or the maw it becomes — the kit's own `grillRig`,
 * `grillHeat`, `mawBody` and `mawTentacle`, driven from whatever state the script keeps.
 */
function kitchen(
  ctx: PreviewCtx,
  read: () => {
    x: number; y: number;
    superheat: number;
    cooking: Cook[];
    maw?: { gape: number; rage: number; awake: boolean; dread?: number };
    /** Pit Master: the coals are blue, and so is everything they light. */
    blue?: boolean;
    /** Head Chef, butcher half: what is spoiling on the teeth. */
    rotting?: Rot[];
  },
): void {
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  ctx.onFrame((_delta, elapsed) => {
    const s = read();
    const t = elapsed / 1000;
    ground.clear(); air.clear();
    if (s.maw) {
      const dread = s.maw.dread ?? 0;
      const arms = s.maw.awake ? 7 : 4;
      for (let i = 0; i < arms; i++) {
        const a = (i / arms) * Math.PI * 2 + t * 0.35;
        mawTentacle(ground, ctx.tint, s.x + Math.cos(a) * GRILL_R * 0.8, s.y + Math.sin(a) * GRILL_R * 0.5,
          a, GRILL_R * (1.5 + s.maw.rage * 1.5 + dread), t, i * 3.1,
          4.4 + s.maw.rage * 2 + dread * 2, 0.95, s.maw.rage);
      }
      mawBody(ground, ctx.tint, s.x, s.y, GRILL_R, t, s.maw.gape, s.maw.rage, 1, dread);
      for (const r of s.rotting ?? []) {
        const [rx, ry] = rotPos(s.x, s.y, r.slot);
        const done = r.progress >= ROT_MS;
        const bob = Math.sin(t * 2.2 + r.slot) * 1.6;
        itemShape(air, ctx.tint, rx, ry + bob, { ...r.item, rotten: done }, 20, 1, t * 1.6 + r.slot);
        cookRing(air, ctx.tint, rx, ry + bob, 14, r.progress / ROT_MS, 0.85, done);
      }
      return;
    }
    grillRig(ground, ctx.tint, s.x, s.y, GRILL_R, t, s.superheat, 1, s.blue);
    grillHeat(air, ctx.tint, s.x, s.y, GRILL_R, t, s.superheat, 1, s.blue);
    for (const c of s.cooking) {
      const [ox, oy] = SLOT_OFFSETS[c.slot % SLOT_OFFSETS.length];
      const stage = c.stage ?? (c.progress >= FOOD[c.kind].cookMs ? 1 : 0);
      const cookMs = FOOD[c.kind].cookMs;
      // Two passes, each drawn as its own sweep from empty — the same split the kit makes.
      const ring = stage >= 2 ? { ratio: 1, done: true, blue: true }
        : stage >= 1 && c.oversear
          ? { ratio: (c.progress - cookMs) / (cookMs * 0.5), done: false, blue: true }
          : stage >= 1 ? { ratio: 1, done: true, blue: false }
            : { ratio: c.progress / cookMs, done: false, blue: false };
      const bob = Math.sin(t * 3 + c.seed) * 1.4;
      itemShape(air, ctx.tint, s.x + ox, s.y + oy + bob,
        { kind: c.kind, cooked: stage >= 1, overseared: stage >= 2 }, 21, 1, t * 2 + c.seed);
      cookRing(air, ctx.tint, s.x + ox, s.y + oy + bob, 15, ring.ratio, 0.9, ring.done, ring.blue);
    }
  });
}

/** The prep strip and the knife tile, exactly as the kit lays them out. */
function prepStrip(
  ctx: PreviewCtx,
  read: () => {
    inv: Item[]; held: Item | null; heat: number; hunger?: number;
    /** Click upgrade: the tile holds a cleaver, and it may be dripping. */
    cleaver?: boolean; ichor?: number;
    /** Click upgrade: 0–1 of the 4-second window a red cleaver holds its heat for. */
    hot?: number;
  },
): void {
  const X = 14, Y = 10, S = 26, GAP = 3;
  const W = 6 * S + 5 * GAP;
  const KX = X + W + 10;
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(22));
  ctx.onFrame((_delta, elapsed) => {
    const s = read();
    const t = elapsed / 1000;
    g.clear();
    for (let i = 0; i < 6; i++) {
      const x = X + i * (S + GAP);
      const item = s.inv[i] ?? null;
      prepSlot(g, ctx.tint, x, Y, S, item !== null && item === s.held, !item, 1);
      if (!item) continue;
      itemShape(g, ctx.tint, x + S / 2, Y + S / 2, item, S * 0.72, 1, t * 1.4 + i);
      const pip = item.rotten ? GLT.rot : item.overseared ? GLT.blueHot : item.cooked ? 0x7ada6a : 0;
      if (pip) {
        g.fillStyle(ctx.tint(pip), 0.95);
        g.fillCircle(x + S - 5, Y + 5, 2.6);
      }
    }
    prepSlot(g, ctx.tint, KX, Y, S, s.held === null, false, 1);
    if (s.cleaver) {
      chefCleaver(g, ctx.tint, KX + S / 2 - 2, Y + S / 2, -0.35, 19, s.heat, 1, s.ichor ?? 0, t);
    } else {
      kitchenKnife(g, ctx.tint, KX + S / 2 - 3, Y + S / 2, -0.5, 20, s.heat, 1);
    }
    const bar = s.hot ?? (s.heat > 0 && s.heat < 1 ? s.heat : 0);
    if (bar > 0) {
      g.fillStyle(ctx.tint(GLT.char), 0.85);
      g.fillRect(KX + 3, Y + S - 6, S - 6, 3);
      g.fillStyle(ctx.tint(s.hot ? GLT.emberHot : GLT.heat), 1);
      g.fillRect(KX + 3, Y + S - 6, (S - 6) * Phaser.Math.Clamp(bar, 0, 1), 3);
    }
    if (s.hunger !== undefined) {
      hungerBar(g, ctx.tint, X, Y + S + 6, W + S + 10, 13, Phaser.Math.Clamp(s.hunger / 30000, 0, 1), t, 1);
    }
  });
}

const cooked = (kind: FoodKind): Item => ({ kind, cooked: true });
const raw = (kind: FoodKind): Item => ({ kind, cooked: false });
const seared = (kind: FoodKind): Item => ({ kind, cooked: true, overseared: true });
const spoiled = (kind: FoodKind): Item => ({ kind, cooked: false, rotten: true });

// ══ CHEF · CLICK — Kitchen Knife ══════════════════════════════════════

export const knife: PreviewScript = {
  duration: 20000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Click — 25 cold, 35 off the coals, 53 into something Burnt. Holding food throws the food.',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.34, y: ctx.h * 0.62 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    const grill = { x: ctx.w * 0.5, y: ctx.h * 0.42 };
    const foe = { x: ctx.w * 0.82, y: ctx.h * 0.62 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 58, '#f6f2e8', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#ffb347', 10);

    const s = {
      heat: 0, held: null as Item | null, inv: [raw('potato')] as Item[],
      burntUntil: -1, cooking: [] as Cook[],
    };
    kitchen(ctx, () => ({ x: grill.x, y: grill.y, superheat: 0, cooking: s.cooking }));
    prepStrip(ctx, () => ({ inv: s.inv, held: s.held, heat: s.heat }));

    type Thrown = { x: number; y: number; vx: number; vy: number; spin: number; hot: boolean; dmg: number };
    const knives: Thrown[] = [];
    const tossed: { x: number; y: number; vx: number; vy: number; item: Item; spin: number }[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const marks = ctx.adopt(ctx.scene.add.graphics().setDepth(7));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      air.clear(); marks.clear();
      // Two seconds within 66px of the grill, empty-handed, fills the bar.
      const near = Phaser.Math.Distance.Between(me.x, me.y, grill.x, grill.y) <= 66;
      if (near && !s.held && s.heat < 1) {
        const before = s.heat;
        s.heat = Math.min(1, s.heat + delta / 2000);
        if (before < 1 && s.heat >= 1) {
          ctx.capture(() => fx.sizzle(me.x, me.y, 8, 22, 500));
          float(ctx, me.x, me.y - 48, '🔥 KNIFE HEATED', hex(GLT.heat), 12);
        }
      }
      rig?.setKnifeHeat(s.heat);
      rig?.setHeld(s.held);
      rig?.setFed(s.inv.length / 6);

      if (s.burntUntil > elapsed) {
        const fade = Phaser.Math.Clamp((s.burntUntil - elapsed) / 900, 0, 1);
        for (let i = 0; i < 4; i++) {
          const a = elapsed / 420 + i * 1.6;
          marks.fillStyle(ctx.tint(i % 2 ? GLT.ember : GLT.heat), fade * 0.75);
          marks.fillCircle(foe.x + Math.cos(a) * 18, foe.y + Math.sin(a) * 11 - 4, 1.8);
        }
        marks.lineStyle(1.4, ctx.tint(GLT.char), fade * 0.5);
        marks.strokeCircle(foe.x, foe.y, 22);
      }

      for (let i = knives.length - 1; i >= 0; i--) {
        const k = knives[i];
        k.x += k.vx * dt; k.y += k.vy * dt; k.spin += dt * 22;
        if (Phaser.Math.Distance.Between(k.x, k.y, foe.x, foe.y) <= 22) {
          knives.splice(i, 1);
          ctx.capture(() => {
            fx.splat(foe.x, foe.y, 20, GLT.blood);
            if (k.hot) fx.sizzle(foe.x, foe.y, 7, 22, 460);
          });
          if (k.dmg === 53) float(ctx, foe.x, foe.y - 46, '🔥 SEARED', hex(GLT.ember), 11);
          float(ctx, foe.x, foe.y - 26, `${k.dmg}`, '#ffb3aa', k.dmg >= 50 ? 19 : 15);
          continue;
        }
        if (k.x > ctx.w) { knives.splice(i, 1); continue; }
        kitchenKnife(air, ctx.tint, k.x, k.y,
          Math.atan2(k.vy, k.vx) + Math.sin(k.spin) * 0.5, 30, k.hot ? 1 : 0, 1);
      }

      for (let i = tossed.length - 1; i >= 0; i--) {
        const p = tossed[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.spin += dt * 7;
        if (Phaser.Math.Distance.Between(p.x, p.y, grill.x, grill.y) <= GRILL_R * 1.4) {
          tossed.splice(i, 1);
          s.cooking.push({ kind: p.item.kind, progress: 0, slot: s.cooking.length, seed: 3 });
          ctx.capture(() => fx.sizzle(grill.x, grill.y, 8, 20, 520));
          float(ctx, grill.x, grill.y - 34, `${FOOD[p.item.kind].emoji} ON THE GRILL`, hex(GLT.ember), 11);
          continue;
        }
        foodShape(air, ctx.tint, p.x, p.y, p.item.kind, p.item.cooked, 22, 1, p.spin);
      }
      for (const c of s.cooking) c.progress = Math.min(FOOD[c.kind].cookMs, c.progress + delta * 3);

      gauge.setText(`blade ${Math.round(s.heat * 100)}% hot`
        + `   ·   next throw ${s.held ? 'the ' + FOOD[s.held.kind].label.toLowerCase() : (s.heat >= 1 ? (s.burntUntil > elapsed ? '53' : '35') : '25')}`
        + (s.burntUntil > elapsed ? `   ·   they are Burnt for ${((s.burntUntil - elapsed) / 1000).toFixed(1)}s` : ''));
    });

    const throwKnife = (at: number, note: string): void => ctx.at(at, () => {
      const a = Math.atan2(foe.y - me.y, foe.x - me.x);
      const hot = s.heat >= 1;
      const burnt = s.burntUntil > at;
      knives.push({
        x: me.x + Math.cos(a) * 24, y: me.y + Math.sin(a) * 24,
        vx: Math.cos(a) * 780, vy: Math.sin(a) * 780, spin: 0, hot,
        dmg: hot ? (burnt ? 53 : 35) : 25,
      });
      if (hot) {
        ctx.capture(() => fx.sizzle(me.x + Math.cos(a) * 20, me.y + Math.sin(a) * 20, 6, 18, 420));
        float(ctx, me.x, me.y - 46, '🔥 RED HOT', hex(GLT.heat), 12);
      }
      s.heat = 0;
      av.play('punch', a);
      readout.setText(note);
    });

    ctx.at(300, () => readout.setText('cold, from the block: 25 damage at 780 px/s'));
    throwKnife(700, 'cold, from the block: 25 damage at 780 px/s');
    ctx.at(2200, () => { me.x = grill.x - 40; me.y = grill.y + 34; readout.setText('stand within 66px of the grill with an empty hand and the blade heats in 2 seconds'); });
    throwKnife(5200, 'off the coals: 35 — and the throw takes the heat with it');
    ctx.at(6800, () => {
      s.burntUntil = 15000;
      ctx.capture(() => fx.flare(foe.x, foe.y, 34));
      float(ctx, foe.x, foe.y - 44, '🌳 BURNT', hex(GLT.char), 11);
      readout.setText('now with Charcoal Chuck on them: Burnt for 8 seconds');
    });
    throwKnife(10600, 'a heated blade into something Burnt is 53 — the chef\'s whole damage plan');
    ctx.at(12400, () => {
      s.held = s.inv[0];
      readout.setText('and with an ingredient in your hand, the same button throws the ingredient');
    });
    ctx.at(14200, () => {
      const item = s.held;
      if (!item) return;
      const a = Math.atan2(grill.y - me.y, grill.x - me.x);
      tossed.push({ x: me.x + Math.cos(a) * 22, y: me.y + Math.sin(a) * 22, vx: Math.cos(a) * 540, vy: Math.sin(a) * 540, item, spin: 0 });
      s.inv = s.inv.filter((it) => it !== item);
      s.held = null;
      av.play('punch', a);
      readout.setText('540 px/s onto the grate — this is how you cook without standing in the fight');
    });
    ctx.at(16600, () => readout.setText('a miss lands on the floor and waits 30 seconds. Nobody else can pick it up.'));
    ctx.at(18400, () => readout.setText('only raw food cooks: a cooked one thrown at the grate bounces off'));
  },
};

// ══ CHEF · E — Forage ═════════════════════════════════════════════════

export const forage: PreviewScript = {
  duration: 16000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'E — 2 seconds head-down at half speed, and up comes a mushroom, a carrot or a potato',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.34, y: ctx.h * 0.6, dir: 1 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    const readout = label(ctx, ctx.w * 0.5, 54, '#63a53c', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#d6cfbe', 10);

    const s = { inv: [] as Item[], digUntil: -1, full: false };
    prepStrip(ctx, () => ({ inv: s.inv, held: null, heat: 0 }));

    ctx.onFrame((delta, elapsed) => {
      const digging = s.digUntil > elapsed;
      const speed = 130 * (digging ? 0.5 : 1);
      me.x += speed * me.dir * (delta / 1000);
      if (me.x > ctx.w * 0.7) me.dir = -1;
      if (me.x < ctx.w * 0.2) me.dir = 1;
      rig?.setFed(s.inv.length / 6);
      gauge.setText(digging
        ? `digging — ${((s.digUntil - elapsed) / 1000).toFixed(1)}s left, at ×0.5 move speed`
        : `${s.inv.length} of 6 tiles used   ·   6s cooldown, 2s dig`);
    });

    const dig = (at: number, kind: FoodKind, note: string): void => {
      ctx.at(at, () => {
        s.digUntil = at + 2000;
        av.setHold('sow', ctx.aim);
        float(ctx, me.x, me.y - 46, '🌿 FORAGING', hex(GLT.frond), 12);
        readout.setText(note);
      });
      ctx.at(at + 2000, () => {
        av.setHold(null);
        if (s.inv.length >= 6) {
          float(ctx, me.x, me.y - 48, '📦 STRIP FULL', hex(GLT.linenDark), 12);
          ctx.capture(() => fx.crumbs(me.x, me.y + 12, FOOD[kind].color));
          readout.setText('with all six tiles taken it still comes up — it just lands at your feet');
          return;
        }
        s.inv.push(raw(kind));
        ctx.capture(() => fx.crumbs(me.x, me.y + 8, FOOD[kind].color));
        float(ctx, me.x, me.y - 48,
          `${FOOD[kind].emoji} ${FOOD[kind].label}  +${foodHeal(kind, false)} raw`, hex(FOOD[kind].color), 12);
      });
    };

    dig(500, 'carrot', 'two seconds of head-down digging, at half speed, in the middle of a fight');
    dig(3400, 'mushroom', 'a third each: mushroom 15 raw, carrot 10, potato 20');
    dig(6400, 'potato', 'cooked they are worth double — 30, 20 and 40');
    dig(9400, 'carrot', 'never meat. Meat only ever comes off a skewer, in the other form.');
    ctx.at(12200, () => { s.inv = [raw('carrot'), raw('mushroom'), raw('potato'), raw('carrot'), raw('mushroom'), raw('potato')]; });
    dig(12600, 'potato', 'this is the only source of ingredients the chef has — every heal starts here');
  },
};

// ══ CHEF · R — Charcoal Chuck ═════════════════════════════════════════

export const charcoal: PreviewScript = {
  duration: 16000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'R — 15 and Burnt for 8s on a body; 6 seconds of double-speed everything on the grill',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.3, y: ctx.h * 0.62 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const grill = { x: ctx.w * 0.52, y: ctx.h * 0.4 };
    const foe = { x: ctx.w * 0.84, y: ctx.h * 0.62 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 54, '#ff7a2a', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#ffe9a8', 10);

    const s = {
      superUntil: -1, burntUntil: -1,
      cooking: [{ kind: 'potato' as FoodKind, progress: 0, slot: 0, seed: 1 },
        { kind: 'carrot' as FoodKind, progress: 0, slot: 1, seed: 4 }] as Cook[],
    };
    kitchen(ctx, () => ({
      x: grill.x, y: grill.y, cooking: s.cooking,
      superheat: s.superUntil > 0 ? 1 : 0,
    }));

    const coals: { x: number; y: number; vx: number; vy: number; spin: number; toGrill: boolean }[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      air.clear();
      const hot = s.superUntil > elapsed;
      for (const c of s.cooking) {
        c.progress = Math.min(FOOD[c.kind].cookMs, c.progress + delta * (hot ? 2 : 1));
      }
      for (let i = coals.length - 1; i >= 0; i--) {
        const c = coals[i];
        c.x += c.vx * dt; c.y += c.vy * dt; c.spin += dt * 9;
        const onGrill = Phaser.Math.Distance.Between(c.x, c.y, grill.x, grill.y) <= GRILL_R * 1.5;
        const onBody = Phaser.Math.Distance.Between(c.x, c.y, foe.x, foe.y) <= 24;
        if (c.toGrill && onGrill) {
          coals.splice(i, 1);
          s.superUntil = elapsed + 6000;
          ctx.capture(() => fx.flare(grill.x, grill.y, GRILL_R * 1.7));
          float(ctx, grill.x, grill.y - 46, '🔥 SUPERHEATED', hex(GLT.emberHot), 12);
          continue;
        }
        if (!c.toGrill && onBody) {
          coals.splice(i, 1);
          s.burntUntil = elapsed + 8000;
          ctx.capture(() => fx.flare(foe.x, foe.y, 34));
          float(ctx, foe.x, foe.y - 44, '🌳 BURNT', hex(GLT.char), 11);
          float(ctx, foe.x, foe.y - 26, '15', '#ffb3aa', 15);
          continue;
        }
        charcoalLump(air, ctx.tint, c.x, c.y, c.spin * 0.4, 15, 0.85, 1, 5);
      }
      const p = s.cooking[0];
      gauge.setText(
        `${hot ? `SUPERHEATED for ${((s.superUntil - elapsed) / 1000).toFixed(1)}s — grate ×2, blade ×2` : 'ordinary coals'}`
        + `   ·   potato ${Math.round((p.progress / FOOD.potato.cookMs) * 100)}% of its 12s`
        + (s.burntUntil > elapsed ? `   ·   Burnt ${((s.burntUntil - elapsed) / 1000).toFixed(1)}s` : ''),
      );
    });

    const chuck = (at: number, toGrill: boolean, note: string): void => ctx.at(at, () => {
      const to = toGrill ? grill : foe;
      const a = Math.atan2(to.y - me.y, to.x - me.x);
      coals.push({ x: me.x + Math.cos(a) * 22, y: me.y + Math.sin(a) * 22, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, spin: 0, toGrill });
      av.play('slam', a);
      ctx.capture(() => fx.sizzle(me.x + Math.cos(a) * 20, me.y + Math.sin(a) * 20, 5, 16, 380));
      readout.setText(note);
    });

    chuck(700, false, 'at a person: 15 damage and Burnt for 8 seconds');
    ctx.at(2600, () => readout.setText('Burnt does nothing on its own — it is a 50% bonus for a HEATED knife only'));
    ctx.at(5000, () => {
      float(ctx, foe.x, foe.y - 26, '53', '#ffb3aa', 19);
      ctx.capture(() => { fx.splat(foe.x, foe.y, 20, GLT.blood); fx.sizzle(foe.x, foe.y, 7, 22, 460); });
      readout.setText('35 off the coals, half again into a Burnt target: 53 from a man who has been gardening');
    });
    chuck(8000, true, 'or at your own grill, where it is fuel instead');
    ctx.at(10600, () => readout.setText('6 seconds of superheat: everything on the grate cooks twice as fast'));
    ctx.at(12600, () => readout.setText('and the blade comes up to heat in 1 second instead of 2'));
    ctx.at(14400, () => readout.setText('a maw does not take charcoal — while anybody is transformed this is only ever a burn'));
  },
};

// ══ CHEF · F — Special Ingredient ═════════════════════════════════════

export const butcher: PreviewScript = {
  duration: 18000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'F — 30 seconds where damage comes off a hunger bar instead of your health',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.3, y: ctx.h * 0.62 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    const grill = { x: ctx.w * 0.56, y: ctx.h * 0.38 };
    const foe = { x: ctx.w * 0.84, y: ctx.h * 0.62 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 66, '#a81f2b', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#d4707b', 10);

    const s = {
      form: 0, hunger: 0, inv: [cooked('potato'), cooked('meat')] as Item[],
      frenzyUntil: -1, shot: 0,
    };
    kitchen(ctx, () => ({
      x: grill.x, y: grill.y, superheat: 0, cooking: [],
      maw: s.form > 0.5 ? { gape: 0.3 + 0.2 * Math.sin(Date.now() / 300), rage: 0, awake: false } : undefined,
    }));
    prepStrip(ctx, () => ({ inv: s.inv, held: null, heat: 0, hunger: s.form > 0.02 ? s.hunger : undefined }));

    const gobbets: { x: number; y: number; vx: number; vy: number; spin: number; dmg: number }[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      air.clear();
      s.form = Phaser.Math.Clamp(s.form + (s.hunger > 0 ? delta / 320 : -delta / 320), 0, 1);
      rig?.setButcher(s.form);
      rig?.setIntensity(s.form > 0.5 ? 1.25 : 1);
      if (s.hunger > 0) {
        // The bar is a clock as well as a shield: it drains in real time regardless.
        s.hunger = Math.max(0, s.hunger - delta);
        s.shot += delta;
        if (s.shot >= 1000) {
          s.shot -= 1000;
          const a = Math.atan2(foe.y - grill.y, foe.x - grill.x);
          gobbets.push({ x: grill.x + Math.cos(a) * 20, y: grill.y + Math.sin(a) * 14, vx: Math.cos(a) * 390, vy: Math.sin(a) * 390, spin: 0, dmg: 5 });
        }
      }
      for (let i = gobbets.length - 1; i >= 0; i--) {
        const b = gobbets[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 10;
        if (Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) <= 20) {
          gobbets.splice(i, 1);
          ctx.capture(() => fx.splat(foe.x, foe.y, 16, GLT.blood));
          float(ctx, foe.x, foe.y - 24, `${b.dmg}`, '#ffb3aa', 12);
          continue;
        }
        if (b.x > ctx.w || b.y > ctx.h) { gobbets.splice(i, 1); continue; }
        drawGobbet(air, ctx.tint, b.x, b.y, 7, b.spin, 1, false);
      }
      gauge.setText(s.hunger > 0
        ? `BUTCHER · ${(s.hunger / 1000).toFixed(1)}s   ·   every point of damage costs 0.2s   ·   health untouched`
        : 'chef — damage comes off your health again');
    });

    ctx.at(600, () => {
      s.hunger = 30000;
      ctx.capture(() => {
        fx.ring(me.x, me.y, 16, 110, GLT.blood, 620);
        fx.splat(me.x, me.y + 8, 34, GLT.blood);
        fx.smoke(me.x, me.y - 10, 6, 46, 0x6d5a58, 900);
      });
      float(ctx, me.x, me.y - 56, '🔪 SPECIAL INGREDIENT', hex(GLT.blood), 13);
      readout.setText('the toque comes off, and the grill in the middle of the arena opens a mouth');
    });
    const hit = (at: number, dmg: number): void => ctx.at(at, () => {
      s.hunger = Math.max(0, s.hunger - dmg * 200);
      ctx.capture(() => fx.splat(me.x, me.y, 16, GLT.bloodDark));
      float(ctx, me.x, me.y - 40, `-${((dmg * 200) / 1000).toFixed(1)}s`, hex(GLT.blood), 12);
    });
    ctx.at(3000, () => readout.setText('0.2 seconds a point — a full bar is 150 damage of buffer on top of your health'));
    hit(3400, 25);
    hit(4200, 30);
    hit(5000, 40);
    ctx.at(6400, () => readout.setText('shields are not even consulted: the bar sits ahead of every shield layer'));
    ctx.at(8600, () => {
      const item = s.inv.pop();
      if (!item) return;
      s.hunger = Math.min(30000, s.hunger + FOOD[item.kind].hungerSec * 1000);
      ctx.capture(() => { fx.crumbs(me.x, me.y + 6, GLT.meat); fx.ring(me.x, me.y, 12, 46, GLT.blood, 380); });
      float(ctx, me.x, me.y - 46, `${FOOD[item.kind].emoji} +${foodHeal(item.kind, true)}`, hex(GLT.stewLit), 12);
      float(ctx, me.x, me.y - 64, `🔴 +${FOOD[item.kind].hungerSec}s`, hex(GLT.blood), 12);
      readout.setText('eating is the only thing that puts time back on it — and it still heals you in full');
    });
    ctx.at(11000, () => readout.setText('cooked meat is 15 seconds and 50 HP. The chef half of the fight is what stocks this half.'));
    ctx.at(13400, () => readout.setText('and the maw spits 5 a second at them the whole time, for nothing'));
    ctx.at(15600, () => readout.setText('at zero it prints 🍽️ STARVED and hands you back the hat'));
  },
};

// ══ CHEF · Q — Feast ══════════════════════════════════════════════════

export const feast: PreviewScript = {
  duration: 13000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Q — the whole strip into a pot: double what all of it was worth, to you and every ally',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.34, y: ctx.h * 0.6 };
    drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const ally = { x: ctx.w * 0.66, y: ctx.h * 0.6 };
    dummyAt(ctx, ally);
    const readout = label(ctx, ctx.w * 0.5, 52, '#efb45e', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#c8823a', 10);

    const s = {
      inv: [cooked('potato'), cooked('potato'), cooked('mushroom'), raw('carrot'), cooked('meat'), raw('potato')] as Item[],
      potUntil: -1, heal: 0,
    };
    prepStrip(ctx, () => ({ inv: s.inv, held: null, heat: 0 }));

    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
    ctx.onFrame((_delta, elapsed) => {
      air.clear();
      if (s.potUntil > elapsed) {
        const left = (s.potUntil - elapsed) / 3000;
        stewPot(air, ctx.tint, me.x, me.y - 34, 17, elapsed / 1000, 1 - left, 1);
        gauge.setText(`three seconds of swirling — ${s.heal} HP each when it lands`);
      } else if (s.potUntil > 0) {
        s.potUntil = -1;
        ctx.capture(() => { fx.ring(me.x, me.y - 26, 18, 130, GLT.stewLit, 640); fx.smoke(me.x, me.y - 26, 7, 60, 0xd8cfba, 1100); });
        for (const m of [me, ally]) {
          float(ctx, m.x, m.y - 46, `🍲 +${s.heal}`, hex(GLT.stewLit), 16);
          ctx.capture(() => fx.crumbs(m.x, m.y + 6, GLT.stew));
        }
        gauge.setText(`${s.heal} HP to you AND to every ally — not a share of it, the whole figure`);
      }
    });

    ctx.at(600, () => {
      const total = s.inv.reduce((n, it) => n + foodHeal(it.kind, it.cooked), 0);
      s.heal = total * 2;
      readout.setText(`six tiles: ${total} HP eaten one at a time, ${s.heal} in the pot`);
      s.inv = [];
      s.potUntil = 600 + 3000;
      ctx.capture(() => fx.ring(me.x, me.y, 14, 90, GLT.stew, 560));
      float(ctx, me.x, me.y - 54, `🍲 FEAST — ${s.heal}`, hex(GLT.stewLit), 13);
    });
    ctx.at(5200, () => readout.setText('the pot doubles what it was given — it does not cook it'));
    ctx.at(7400, () => readout.setText('so six cooked potatoes is 240 and six raw ones is 120. The grill is the difference.'));
    ctx.at(9600, () => readout.setText('the strip empties at the cast: three seconds with no food and no butcher fuel'));
    ctx.at(11400, () => readout.setText('an empty pot is legal, does nothing, and spends the full 30s cooldown'));
  },
};

// ══ BUTCHER · CLICK — Cleave ══════════════════════════════════════════

export const cleave: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Click (butcher) — 30 damage in a 132° fan, 110px deep. No travel time, nothing to dodge.',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.32, y: ctx.h * 0.58 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    chef(av)?.setButcher(1);
    const near = { x: me.x + 84, y: me.y - 22 };
    const other = { x: me.x + 70, y: me.y + 46 };
    const far = { x: me.x + 190, y: me.y };
    dummyAt(ctx, near); dummyAt(ctx, other); dummyAt(ctx, far);
    const readout = label(ctx, ctx.w * 0.5, 12, '#a81f2b', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#d6dee6', 10);

    const fan = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
    const tally = { dealt: 0 };
    ctx.onFrame((_d, elapsed) => {
      fan.clear();
      fan.fillStyle(ctx.tint(GLT.blood), 0.07 + 0.03 * Math.sin(elapsed / 240));
      fan.beginPath();
      fan.moveTo(me.x, me.y);
      fan.arc(me.x, me.y, 110, -1.15, 1.15);
      fan.closePath();
      fan.fillPath();
      gauge.setText(`${tally.dealt} dealt   ·   30 every 1.25s is 24 a second, the most in the element`);
    });

    const swing = (at: number, note: string): void => ctx.at(at, () => {
      av.play('sweep', 0);
      ctx.capture(() => fx.slashArc(me.x, me.y, 0, 110 * 0.85, GLT.blood));
      for (const m of [near, other, far]) {
        const d = Phaser.Math.Distance.Between(me.x, me.y, m.x, m.y);
        const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(m.y - me.y, m.x - me.x)));
        if (d > 110 || off > 1.15) continue;
        tally.dealt += 30;
        ctx.capture(() => fx.splat(m.x, m.y, 24, GLT.blood));
        float(ctx, m.x, m.y - 26, '30', '#ffb3aa', 16);
      }
      readout.setText(note);
    });

    swing(600, 'one flat arc, and it does not stop at one body');
    swing(3000, '66° either side of the aim — two people near each other are both in it');
    ctx.at(5200, () => readout.setText('the one at 190px is outside the 110px reach and is simply not hit'));
    swing(6400, 'no throw and no travel time: the only dodge is not standing in front of him');
    ctx.at(8200, () => readout.setText('a swing that catches nothing still draws in steel and still runs the full 1.25s'));
  },
};

// ══ BUTCHER · E — Poach ═══════════════════════════════════════════════

export const poach: PreviewScript = {
  duration: 17000,
  scale: 0.74,
  bodyTexture: '',
  caption: 'E — 15 through every body it passes, a cut of meat out of the first, and 22s in the wall',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.18, y: ctx.h * 0.55 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    chef(av)?.setButcher(1);
    const first = { x: ctx.w * 0.42, y: ctx.h * 0.55 };
    const second = { x: ctx.w * 0.62, y: ctx.h * 0.55 };
    dummyAt(ctx, first); dummyAt(ctx, second);
    const readout = label(ctx, ctx.w * 0.5, 46, '#d0525c', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#f1ead0', 10);

    const s = { inv: [] as Item[], cooking: [] as Cook[] };
    const grill = { x: ctx.w * 0.5, y: ctx.h * 0.24 };
    kitchen(ctx, () => ({ x: grill.x, y: grill.y, superheat: 0, cooking: s.cooking }));
    prepStrip(ctx, () => ({ inv: s.inv, held: null, heat: 0 }));

    const skewer = {
      live: false, x: 0, y: 0, vx: 0, vy: 0, ang: 0, meat: false,
      landed: false, hit: [] as Mark[], until: 0,
    };
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      air.clear(); ground.clear();
      for (const c of s.cooking) c.progress = Math.min(FOOD[c.kind].cookMs, c.progress + delta * 4);
      if (!skewer.live) return;
      if (!skewer.landed) {
        skewer.x += skewer.vx * dt; skewer.y += skewer.vy * dt;
        for (const m of [first, second]) {
          if (skewer.hit.includes(m)) continue;
          if (Phaser.Math.Distance.Between(skewer.x, skewer.y, m.x, m.y) > 26) continue;
          skewer.hit.push(m);
          ctx.capture(() => fx.splat(m.x, m.y, 26, GLT.blood));
          float(ctx, m.x, m.y - 26, '15', '#ffb3aa', 15);
          if (!skewer.meat) {
            skewer.meat = true;
            float(ctx, m.x, m.y - 48, '🍖 A CUT TAKEN', hex(GLT.meat), 11);
          }
        }
        if (skewer.x >= ctx.w - 20) {
          skewer.landed = true;
          skewer.x = ctx.w - 20;
          skewer.until = elapsed + 22000;
          ctx.capture(() => fx.sizzle(skewer.x, skewer.y, 4, 14, 320));
        }
      } else {
        spatter(ground, ctx.tint, skewer.x, skewer.y, 12, GLT.blood, 4, 0.7);
      }
      skewerShape(air, ctx.tint, skewer.x, skewer.y, skewer.ang, 84, skewer.meat, 1, elapsed / 1000);
      gauge.setText(skewer.landed
        ? (skewer.meat ? 'stuck in the wall with the meat still on it — 22 seconds to go and fetch it'
          : 'no meat on it: an empty skewer only waits 1.8 seconds')
        : '720 px/s, and it does not stop for anybody');
    });

    ctx.at(600, () => {
      const a = 0;
      skewer.live = true; skewer.landed = false; skewer.meat = false; skewer.hit = [];
      skewer.x = me.x + 26; skewer.y = me.y; skewer.vx = 720; skewer.vy = 0; skewer.ang = a;
      av.play('punch', a);
      readout.setText('it goes through everybody in the line — 15 each, once each');
    });
    ctx.at(3400, () => readout.setText('only the FIRST body loses a cut of meat, however many it hits'));
    ctx.at(5600, () => {
      // Walking over the landed skewer is what collects it.
      me.x = ctx.w - 60;
      skewer.meat = false;
      s.inv.push(raw('meat'));
      ctx.capture(() => fx.splat(skewer.x, skewer.y, 18, GLT.blood));
      float(ctx, me.x, me.y - 46, '🍖 MEAT', hex(GLT.meat), 13);
      readout.setText('walk within 48px of it to pull the meat off — it is not a button');
    });
    ctx.at(8000, () => {
      const item = s.inv.pop();
      if (!item) return;
      s.cooking.push({ kind: 'meat', progress: 0, slot: 0, seed: 2 });
      me.x = grill.x - 40; me.y = grill.y + 40;
      float(ctx, grill.x, grill.y - 34, '🍖 ON THE GRILL', hex(GLT.ember), 12);
      readout.setText('raw it heals 20 and buys 15 seconds of butcher form');
    });
    ctx.at(11000, () => {
      s.cooking = [];
      s.inv.push(cooked('meat'));
      float(ctx, grill.x, grill.y - 34, '🍖 DONE', hex(FOOD.meat.cookedColor), 12);
      readout.setText('fifteen seconds on the grate and it is 50 — the biggest single heal in the game');
    });
    ctx.at(13600, () => readout.setText('three trips across the arena, started on a 30-second clock. That is the price of it.'));
  },
};

// ══ BUTCHER · R — Cannibalize ═════════════════════════════════════════

export const cannibalize: PreviewScript = {
  duration: 14000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'R — a 90px lunge and a bite: 20 damage, 15 HP back, +3s on the bar, and 6s of frenzy',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.28, y: ctx.h * 0.62, dash: 0 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    chef(av)?.setButcher(1);
    const grill = { x: ctx.w * 0.52, y: ctx.h * 0.3 };
    const foe = { x: ctx.w * 0.5, y: ctx.h * 0.62 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 60, '#a81f2b', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#d4707b', 10);

    const s = { hunger: 18000, frenzyUntil: -1, shot: 0, inv: [] as Item[] };
    kitchen(ctx, () => ({
      x: grill.x, y: grill.y, superheat: 0, cooking: [],
      maw: { gape: 0.4, rage: s.frenzyUntil > 0 ? 0.6 : 0, awake: false },
    }));
    prepStrip(ctx, () => ({ inv: s.inv, held: null, heat: 0, hunger: s.hunger }));

    const gobbets: { x: number; y: number; vx: number; vy: number; spin: number; dmg: number; hot: boolean }[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      air.clear();
      s.hunger = Math.max(0, s.hunger - delta);
      if (me.dash > elapsed) me.x += 620 * dt;
      const hot = s.frenzyUntil > elapsed;
      s.shot += delta;
      if (s.shot >= 1000) {
        s.shot -= 1000;
        const a = Math.atan2(foe.y - grill.y, foe.x - grill.x);
        gobbets.push({
          x: grill.x + Math.cos(a) * 20, y: grill.y + Math.sin(a) * 14,
          vx: Math.cos(a) * 390, vy: Math.sin(a) * 390, spin: 0, dmg: hot ? 10 : 5, hot,
        });
      }
      for (let i = gobbets.length - 1; i >= 0; i--) {
        const b = gobbets[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 10;
        if (Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) <= 20) {
          gobbets.splice(i, 1);
          ctx.capture(() => fx.splat(foe.x, foe.y, 16, GLT.blood));
          float(ctx, foe.x, foe.y - 22, `${b.dmg}`, '#ffb3aa', b.hot ? 15 : 12);
          continue;
        }
        if (b.y > ctx.h || b.x > ctx.w) { gobbets.splice(i, 1); continue; }
        drawGobbet(air, ctx.tint, b.x, b.y, b.hot ? 9 : 7, b.spin, 1, b.hot);
      }
      gauge.setText(`bar ${(s.hunger / 1000).toFixed(1)}s`
        + `   ·   maw spitting ${hot ? '10' : '5'} a second`
        + (hot ? `   ·   frenzy for ${((s.frenzyUntil - elapsed) / 1000).toFixed(1)}s` : ''));
    });

    const bite = (at: number, connects: boolean, note: string): void => ctx.at(at, () => {
      me.dash = at + 150;
      av.play('dash', 0);
      const bx = me.x + 52, by = me.y;
      ctx.capture(() => fx.bite(bx, by, 0, 32));
      readout.setText(note);
      if (!connects) {
        float(ctx, me.x, me.y - 46, '😬 NOTHING TO BITE', hex(GLT.linenDark), 11);
        return;
      }
      float(ctx, foe.x, foe.y - 26, '20', '#ffb3aa', 16);
      float(ctx, me.x, me.y - 50, '🔴 +15  +3s', hex(GLT.blood), 12);
      s.hunger = Math.min(30000, s.hunger + 3000);
      s.frenzyUntil = at + 6000;
      ctx.capture(() => fx.ring(grill.x, grill.y, 20, 90, GLT.blood, 520));
    });

    ctx.at(400, () => readout.setText('a 150ms lunge at 620 px/s — you cannot steer out of it once it starts'));
    bite(1200, true, 'connecting: 20 damage, 15 of your real health back, 3 seconds onto the bar');
    ctx.at(4000, () => readout.setText('...and the maw goes into a frenzy: 10 a shot instead of 5, for 6 seconds'));
    ctx.at(6600, () => readout.setText('the 15 HP is the only real healing a butcher with nothing left to eat has'));
    ctx.at(8600, () => { me.x = ctx.w * 0.22; });
    bite(9200, false, 'a miss still dashes you in, and still spends the whole 9 seconds');
    ctx.at(11600, () => readout.setText('the card never mentions the 20 damage. It is there, to everything in the bite.'));
  },
};

// ══ BUTCHER · F — Return ══════════════════════════════════════════════

export const returnToKitchen: PreviewScript = {
  duration: 13000,
  scale: 0.83,
  bodyTexture: '',
  caption: 'F (butcher) — the hat goes back on, the maw closes, and the bar is emptied, not banked',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.3, y: ctx.h * 0.62 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    const grill = { x: ctx.w * 0.56, y: ctx.h * 0.36 };
    const readout = label(ctx, ctx.w * 0.5, 62, '#f6f2e8', 11);
    const tray = label(ctx, ctx.w * 0.5, ctx.h - 14, '#d6cfbe', 10);

    const s = { form: 1, hunger: 21000, blend: 1 };
    kitchen(ctx, () => ({
      x: grill.x, y: grill.y, superheat: 0,
      cooking: s.form > 0.5 ? [] : [{ kind: 'carrot', progress: 2000, slot: 0, seed: 1 }],
      maw: s.form > 0.5 ? { gape: 0.35, rage: 0, awake: false } : undefined,
    }));
    prepStrip(ctx, () => ({
      inv: [cooked('carrot')], held: null, heat: s.form > 0.5 ? 0 : s.blend,
      hunger: s.form > 0.02 ? s.hunger : undefined,
    }));

    ctx.onFrame((delta) => {
      s.form = Phaser.Math.Clamp(s.form + (s.hunger > 0 ? delta / 320 : -delta / 320), 0, 1);
      rig?.setButcher(s.form);
      if (s.hunger > 0) s.hunger = Math.max(0, s.hunger - delta);
      else s.blend = Math.min(1, s.blend + delta / 2000);
      tray.setText(s.form > 0.5
        ? '🔪 BUTCHER:  Cleave · Poach · Cannibalize · Return · Maw Awakening'
        : '👨‍🍳 CHEF:  Kitchen Knife · Forage · Charcoal Chuck · Special Ingredient · Feast');
    });

    ctx.at(500, () => readout.setText('21 seconds still on the bar, and the grill is still a mouth'));
    ctx.at(3000, () => {
      s.hunger = 0;
      s.blend = 0;
      ctx.capture(() => fx.ring(me.x, me.y, 10, 70, GLT.white, 480));
      float(ctx, me.x, me.y - 52, '👨‍🍳 BACK TO THE KITCHEN', hex(GLT.white), 12);
      readout.setText('F, and the mouth closes back into a grill you can cook on');
    });
    ctx.at(5400, () => readout.setText('the card says the leftover time is "banked". It is not — Return zeroes the bar.'));
    ctx.at(7600, () => readout.setText('the next Special Ingredient always starts from a full 30 seconds anyway'));
    ctx.at(9600, () => readout.setText('so leaving early costs nothing, and there is no reason to ride it to zero'));
    ctx.at(11400, () => readout.setText('cooking, collecting, charcoal fuel and a blade you can heat all come back at once'));
  },
};

// ══ BUTCHER · Q — Maw Awakening ═══════════════════════════════════════

export const mawAwakening: PreviewScript = {
  duration: 17000,
  scale: 0.67,
  bodyTexture: '',
  caption: 'Q — feed it the whole strip: 3s base plus 1/3/5/10 an ingredient, then it hunts on its own',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.2, y: ctx.h * 0.66 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    chef(av)?.setButcher(1);
    const foe = { x: ctx.w * 0.82, y: ctx.h * 0.46, dir: 1 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 56, '#d4707b', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#f7f1de', 10);

    const maw = { x: ctx.w * 0.5, y: ctx.h * 0.4, awakeUntil: -1, whip: 0, barrage: 0, spit: 0 };
    const s = {
      inv: [cooked('meat'), cooked('potato'), raw('mushroom'), raw('carrot')] as Item[],
      hunger: 24000, total: 0,
    };
    kitchen(ctx, () => ({
      x: maw.x, y: maw.y, superheat: 0, cooking: [],
      maw: { gape: maw.awakeUntil > 0 ? 1 : 0.35, rage: maw.awakeUntil > 0 ? 1 : 0, awake: maw.awakeUntil > 0 },
    }));
    prepStrip(ctx, () => ({ inv: s.inv, held: null, heat: 0, hunger: s.hunger }));

    const bullets: { x: number; y: number; vx: number; vy: number; spin: number; dmg: number; hot: boolean }[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      air.clear();
      s.hunger = Math.max(0, s.hunger - delta);
      foe.y += 60 * foe.dir * dt;
      if (foe.y > ctx.h * 0.72) foe.dir = -1;
      if (foe.y < ctx.h * 0.24) foe.dir = 1;

      const awake = maw.awakeUntil > elapsed;
      const a = Math.atan2(foe.y - maw.y, foe.x - maw.x);
      if (awake) {
        // Off the floor at 165 px/s, stopping 40px short of them.
        if (Phaser.Math.Distance.Between(maw.x, maw.y, foe.x, foe.y) > 40) {
          maw.x += Math.cos(a) * 165 * dt;
          maw.y += Math.sin(a) * 165 * dt;
        }
        maw.whip += delta;
        if (maw.whip >= 1000) {
          maw.whip -= 1000;
          if (Phaser.Math.Distance.Between(maw.x, maw.y, foe.x, foe.y) <= 120) {
            ctx.capture(() => {
              fx.slashArc(maw.x, maw.y, a, 120 * 0.9, GLT.flesh);
              fx.splat(foe.x, foe.y, 22, GLT.fleshDark);
            });
            float(ctx, foe.x, foe.y - 30, '15', '#ffb3aa', 15);
          }
        }
        maw.barrage += delta;
        if (maw.barrage >= 1400) {
          maw.barrage -= 1400;
          for (let i = 0; i < 5; i++) {
            const spread = (i - 2) * 0.16;
            bullets.push({
              x: maw.x + Math.cos(a + spread) * 20, y: maw.y + Math.sin(a + spread) * 14,
              vx: Math.cos(a + spread) * 390, vy: Math.sin(a + spread) * 390, spin: 0, dmg: 6, hot: true,
            });
          }
        }
      } else {
        maw.x = Phaser.Math.Linear(maw.x, ctx.w * 0.5, Math.min(1, delta / 260));
        maw.y = Phaser.Math.Linear(maw.y, ctx.h * 0.4, Math.min(1, delta / 260));
      }
      maw.spit += delta;
      if (maw.spit >= 1000) {
        maw.spit -= 1000;
        bullets.push({
          x: maw.x + Math.cos(a) * 20, y: maw.y + Math.sin(a) * 14,
          vx: Math.cos(a) * 390, vy: Math.sin(a) * 390, spin: 0, dmg: 5, hot: false,
        });
      }
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 10;
        if (Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) <= 20) {
          bullets.splice(i, 1);
          ctx.capture(() => fx.splat(foe.x, foe.y, 16, GLT.blood));
          float(ctx, foe.x, foe.y - 22, `${b.dmg}`, '#ffb3aa', 12);
          continue;
        }
        if (b.x > ctx.w || b.x < 0 || b.y > ctx.h || b.y < 0) { bullets.splice(i, 1); continue; }
        drawGobbet(air, ctx.tint, b.x, b.y, b.hot ? 9 : 7, b.spin, 1, b.hot);
      }
      gauge.setText(awake
        ? `awake for ${((maw.awakeUntil - elapsed) / 1000).toFixed(1)}s more   ·   15 whip a second, 5×6 every 1.4s, plus the ordinary 5`
        : 'on the grill, spitting 5 a second and nothing else');
    });

    ctx.at(1400, () => {
      const bonus: Partial<Record<FoodKind, number>> = {
        meat: 10000, potato: 5000, mushroom: 3000, carrot: 1000,
      };
      const ms = 3000 + s.inv.reduce((n, it) => n + (bonus[it.kind] ?? 0), 0);
      s.total = ms;
      maw.awakeUntil = 1400 + ms;
      s.inv = [];
      av.play('raise');
      ctx.capture(() => { fx.ring(maw.x, maw.y, 24, 190, GLT.blood, 700); fx.splat(maw.x, maw.y, 60, GLT.bloodDark); });
      float(ctx, maw.x, maw.y - 60, `👄 AWAKENED — ${(ms / 1000).toFixed(1)}s`, hex(GLT.flesh), 13);
      float(ctx, me.x, me.y - 50, '🍽️ 4 FED IN', hex(GLT.stewLit), 12);
      readout.setText('meat 10s, potato 5s, mushroom 3s, carrot 1s — on top of the 3 it starts with');
    });
    ctx.at(4000, () => readout.setText('it leaves the grill and walks at them at 165 px/s. You do not steer it.'));
    ctx.at(6600, () => readout.setText('whip: 15 a second to everything within 120px of it'));
    ctx.at(9200, () => readout.setText('barrage: five gobbets every 1.4 seconds, 6 each — 30 a volley'));
    ctx.at(11800, () => readout.setText('about 45 damage a second, none of which you aim, while you cleave from the other side'));
    ctx.at(14200, () => readout.setText('it costs the whole strip, so it competes directly with Feast and with staying alive'));
  },
};

// ══ PASSIVE — The Larder ══════════════════════════════════════════════

export const theLarder: PreviewScript = {
  duration: 16000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Passive — four ingredients, and cooking any of them doubles what it is worth',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.18, y: ctx.h * 0.68 };
    drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const readout = label(ctx, ctx.w * 0.5, 48, '#efb45e', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#d6cfbe', 10);

    const kinds: FoodKind[] = ['carrot', 'mushroom', 'potato', 'meat'];
    const show = { cookedNow: false };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const texts = kinds.map((k, i) => {
      const t = ctx.adopt(ctx.scene.add.text(ctx.w * 0.32 + i * ctx.w * 0.15, ctx.h * 0.62, '', {
        fontSize: '11px', fontFamily: 'Arial Black', color: hex(FOOD[k].color),
      }).setOrigin(0.5).setDepth(24));
      return t;
    });

    ctx.onFrame((_delta, elapsed) => {
      g.clear();
      const t = elapsed / 1000;
      kinds.forEach((k, i) => {
        const x = ctx.w * 0.32 + i * ctx.w * 0.15;
        foodShape(g, ctx.tint, x, ctx.h * 0.42, k, show.cookedNow, 46, 1, t * 1.4 + i);
        texts[i].setColor(hex(show.cookedNow ? FOOD[k].cookedColor : FOOD[k].color));
        texts[i].setText(`${FOOD[k].emoji} ${show.cookedNow ? 'COOKED' : 'RAW'}  +${foodHeal(k, show.cookedNow)}`);
      });
      gauge.setText(show.cookedNow
        ? 'cook times: carrot 5s · mushroom 10s · potato 12s · meat 15s'
        : 'butcher seconds: carrot 3s · mushroom 5s · potato 8s · meat 15s');
    });

    ctx.at(400, () => readout.setText('raw, straight out of the ground: 10, 15, 20 — and meat, which you cut out of somebody'));
    ctx.at(4200, () => {
      show.cookedNow = true;
      ctx.capture(() => { for (let i = 0; i < 4; i++) fx.sizzle(ctx.w * 0.32 + i * ctx.w * 0.15, ctx.h * 0.42, 7, 20, 480); });
      readout.setText('and off the grate: 20, 30, 40 — and cooked meat at 50, the biggest heal in the game');
    });
    ctx.at(7600, () => { show.cookedNow = false; readout.setText('the difference is a walk to the grill and back. That is the whole economy.'); });
    ctx.at(10400, () => {
      show.cookedNow = true;
      readout.setText('eating is a right-click, wherever you are standing, with no cast and no cooldown');
    });
    ctx.at(13400, () => readout.setText('and in butcher form the same mouthful buys 3, 5, 8 or 15 seconds of staying alive'));
  },
};

// ══ PASSIVE — The Grill ═══════════════════════════════════════════════

export const theGrill: PreviewScript = {
  duration: 17000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Passive — one lit grill in the middle of every arena, and four slots on the grate',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.2, y: ctx.h * 0.66 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    const grill = { x: ctx.w * 0.52, y: ctx.h * 0.42 };
    const readout = label(ctx, ctx.w * 0.5, 54, '#ffb347', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#f6f2e8', 10);

    const s = {
      cooking: [] as Cook[], superUntil: -1, heat: 0, inv: [] as Item[],
    };
    kitchen(ctx, () => ({ x: grill.x, y: grill.y, superheat: s.superUntil > 0 ? 1 : 0, cooking: s.cooking }));
    prepStrip(ctx, () => ({ inv: s.inv, held: null, heat: s.heat }));

    const reach = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
    ctx.onFrame((delta, elapsed) => {
      reach.clear();
      reach.lineStyle(1.2, ctx.tint(GLT.ember), 0.28);
      reach.strokeCircle(grill.x, grill.y, 66);
      const hot = s.superUntil > elapsed;
      for (const c of s.cooking) c.progress = Math.min(FOOD[c.kind].cookMs, c.progress + delta * (hot ? 6 : 3));
      const near = Phaser.Math.Distance.Between(me.x, me.y, grill.x, grill.y) <= 66;
      if (near) s.heat = Math.min(1, s.heat + (delta / 2000) * (hot ? 2 : 1) * 3);
      rig?.setKnifeHeat(s.heat);
      gauge.setText(`${near ? 'within 66px — blade heating' : 'out of reach of it'}`
        + `   ·   ${s.cooking.length}/4 slots on the grate`
        + `${hot ? '   ·   SUPERHEATED' : ''}`);
    });

    ctx.at(500, () => {
      s.cooking = [
        { kind: 'carrot', progress: 0, slot: 0, seed: 1 },
        { kind: 'potato', progress: 0, slot: 1, seed: 3 },
        { kind: 'mushroom', progress: 0, slot: 2, seed: 5 },
      ];
      readout.setText('four slots. Carrot 5s, mushroom 10s, potato 12s, meat 15s.');
    });
    ctx.at(3200, () => { me.x = grill.x - 46; me.y = grill.y + 44; readout.setText('stand within 66px with an empty hand and the blade heats: 25 becomes 35'); });
    ctx.at(6000, () => {
      s.superUntil = 12000;
      ctx.capture(() => fx.flare(grill.x, grill.y, GRILL_R * 1.7));
      readout.setText('charcoal on the coals: six seconds of everything at double rate');
    });
    ctx.at(8600, () => {
      s.inv = [cooked('carrot'), cooked('potato'), cooked('mushroom')];
      s.cooking = [];
      ctx.capture(() => fx.sizzle(grill.x, grill.y, 8, 22, 480));
      float(ctx, me.x, me.y - 46, '🍲 COOKED ×3', hex(GLT.stewLit), 12);
      readout.setText('walking over it collects everything of yours that has finished — not a button');
    });
    ctx.at(11400, () => readout.setText('the grate is shared, but its contents are not: only the cook can take theirs off'));
    ctx.at(14000, () => readout.setText('and while anybody is the butcher it is a mouth — nothing cooks for either of you'));
  },
};

// ══ PASSIVE — The Prep Strip ══════════════════════════════════════════

export const thePrepStrip: PreviewScript = {
  duration: 15000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Passive — six tiles and a knife tile. What is in your hand is what your click throws.',
  run(ctx) {
    const me = { x: ctx.w * 0.3, y: ctx.h * 0.66 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    const readout = label(ctx, ctx.w * 0.5, 52, '#d6cfbe', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#d6dee6', 10);

    const s = {
      inv: [cooked('potato'), raw('carrot'), cooked('mushroom'), raw('potato')] as Item[],
      held: null as Item | null, heat: 0.55,
    };
    prepStrip(ctx, () => ({ inv: s.inv, held: s.held, heat: s.heat }));
    ctx.onFrame(() => {
      rig?.setHeld(s.held);
      rig?.setKnifeHeat(s.heat);
      rig?.setFed(s.inv.length / 6);
      gauge.setText(s.held
        ? `holding ${FOOD[s.held.kind].label.toLowerCase()} — click throws it, right-click eats it for ${foodHeal(s.held.kind, s.held.cooked)}`
        : 'holding the knife — click throws it, and the heat bar under the tile is how hot it is');
    });

    ctx.at(500, () => readout.setText('six tiles, and the knife on its own tile at the end of them'));
    ctx.at(2600, () => {
      s.held = s.inv[0];
      float(ctx, me.x, me.y - 44, '🥔 COOKED POTATO', hex(FOOD.potato.cookedColor), 12);
      readout.setText('clicking a tile puts it in your hand instead of the blade');
    });
    ctx.at(5200, () => {
      const item = s.held;
      if (!item) return;
      s.inv = s.inv.filter((i) => i !== item);
      s.held = null;
      float(ctx, me.x, me.y - 46, `🥔 +${foodHeal('potato', true)}`, hex(GLT.stewLit), 13);
      readout.setText('right-click eats what you are holding — 40 HP, no cast time, no cooldown');
    });
    ctx.at(7800, () => {
      s.held = s.inv[0];
      readout.setText('a green pip in the corner of a tile is the fastest read on "this one is cooked"');
    });
    ctx.at(10200, () => {
      s.held = null;
      float(ctx, me.x, me.y - 44, '🔪 KNIFE', hex(GLT.steel), 12);
      readout.setText('clicking the knife tile, or an empty one, puts the blade back in front');
    });
    ctx.at(12600, () => readout.setText('the click on a tile is swallowed by the strip — it never also throws what you had'));
  },
};

// ══ PASSIVE — The Maw ═════════════════════════════════════════════════

export const theMaw: PreviewScript = {
  duration: 14000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'Passive — while you are the butcher the grill is a mouth, spitting 5 a second for free',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.22, y: ctx.h * 0.68 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    chef(av)?.setButcher(1);
    const grill = { x: ctx.w * 0.5, y: ctx.h * 0.4 };
    const foe = { x: ctx.w * 0.84, y: ctx.h * 0.58, dir: -1 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 14, '#d4707b', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#f7f1de', 10);

    const s = { frenzyUntil: -1, spit: 0, dealt: 0 };
    kitchen(ctx, () => ({
      x: grill.x, y: grill.y, superheat: 0, cooking: [],
      maw: { gape: 0.35, rage: s.frenzyUntil > 0 ? 0.6 : 0, awake: false },
    }));

    const bullets: { x: number; y: number; vx: number; vy: number; spin: number; dmg: number; hot: boolean }[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      air.clear();
      foe.y += 50 * foe.dir * dt;
      if (foe.y < ctx.h * 0.3) foe.dir = 1;
      if (foe.y > ctx.h * 0.74) foe.dir = -1;
      const hot = s.frenzyUntil > elapsed;
      s.spit += delta;
      if (s.spit >= 1000) {
        s.spit -= 1000;
        const a = Math.atan2(foe.y - grill.y, foe.x - grill.x);
        bullets.push({
          x: grill.x + Math.cos(a) * 20, y: grill.y + Math.sin(a) * 14,
          vx: Math.cos(a) * 390, vy: Math.sin(a) * 390, spin: 0, dmg: hot ? 10 : 5, hot,
        });
      }
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 10;
        if (Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) <= 20) {
          bullets.splice(i, 1);
          s.dealt += b.dmg;
          ctx.capture(() => fx.splat(foe.x, foe.y, 16, GLT.blood));
          float(ctx, foe.x, foe.y - 22, `${b.dmg}`, '#ffb3aa', b.hot ? 15 : 12);
          continue;
        }
        if (b.x > ctx.w || b.y > ctx.h || b.y < 0) { bullets.splice(i, 1); continue; }
        drawGobbet(air, ctx.tint, b.x, b.y, b.hot ? 9 : 7, b.spin, 1, b.hot);
      }
      gauge.setText(`${s.dealt} dealt by the mouth alone   ·   ${hot ? 'FRENZY — 10 a shot' : '5 a shot, once a second'}`);
    });

    ctx.at(400, () => readout.setText('a lip of teeth, a working throat and four tentacles, where the grill was'));
    ctx.at(3000, () => readout.setText('once a second it spits a piece of meat at whoever you are fighting. You never aim it.'));
    ctx.at(5600, () => {
      s.frenzyUntil = 11600;
      ctx.capture(() => fx.ring(grill.x, grill.y, 20, 90, GLT.blood, 520));
      float(ctx, grill.x, grill.y - 50, '🩸 FRENZY', hex(GLT.blood), 12);
      readout.setText('a Cannibalize that connects works it into a frenzy: 10 a shot for 6 seconds');
    });
    ctx.at(8600, () => readout.setText('it belongs to whoever is transformed — and in a mirror, the player wins the tie'));
    ctx.at(11800, () => readout.setText('while it is a mouth nobody can cook, collect, fuel or heat a blade on it'));
  },
};

// ══ PASSIVE — The Hunger Bar ══════════════════════════════════════════

export const theHungerBar: PreviewScript = {
  duration: 18000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Passive — 30 seconds, 0.2s a point of damage, and only food puts any of it back',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.34, y: ctx.h * 0.66 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    const readout = label(ctx, ctx.w * 0.5, 62, '#a81f2b', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#d4707b', 10);

    const s = {
      hunger: 30000, inv: [cooked('meat'), cooked('potato')] as Item[], form: 1, hp: 400,
    };
    prepStrip(ctx, () => ({ inv: s.inv, held: null, heat: 0, hunger: s.hunger }));
    ctx.onFrame((delta) => {
      s.form = Phaser.Math.Clamp(s.form + (s.hunger > 0 ? delta / 320 : -delta / 320), 0, 1);
      rig?.setButcher(s.form);
      if (s.hunger > 0) s.hunger = Math.max(0, s.hunger - delta);
      gauge.setText(`bar ${(s.hunger / 1000).toFixed(1)}s   ·   health ${s.hp}/400 — untouched`);
    });

    const hit = (at: number, dmg: number, note?: string): void => ctx.at(at, () => {
      s.hunger = Math.max(0, s.hunger - dmg * 200);
      ctx.capture(() => fx.splat(me.x, me.y, 16, GLT.bloodDark));
      float(ctx, me.x, me.y - 40, `-${((dmg * 200) / 1000).toFixed(1)}s`, hex(GLT.blood), 12);
      if (note) readout.setText(note);
    });

    ctx.at(300, () => readout.setText('thirty seconds, and it is a clock as well as a shield — it drains on its own'));
    hit(1600, 25, 'a 25-damage hit is 5 seconds off the bar and nothing off your health');
    hit(3000, 40, '150 damage of buffer in total, if nothing else touches it');
    hit(4400, 30);
    ctx.at(6000, () => readout.setText('shields are not consulted at all — the bar sits ahead of every shield layer'));
    ctx.at(8000, () => readout.setText('but armour still counts: the figure charged is the damage after every multiplier'));
    ctx.at(9800, () => {
      const item = s.inv.pop();
      if (!item) return;
      s.hunger = Math.min(30000, s.hunger + FOOD[item.kind].hungerSec * 1000);
      ctx.capture(() => fx.ring(me.x, me.y, 12, 46, GLT.blood, 380));
      float(ctx, me.x, me.y - 62, `🔴 +${FOOD[item.kind].hungerSec}s`, hex(GLT.blood), 12);
      float(ctx, me.x, me.y - 44, `${FOOD[item.kind].emoji} +${foodHeal(item.kind, true)}`, hex(GLT.stewLit), 12);
      readout.setText('eating is the only refill: 15 seconds for a cut of meat, and 50 HP with it');
    });
    ctx.at(12600, () => readout.setText('piercing damage skips absorbers entirely and lands on your health instead'));
    ctx.at(15000, () => {
      s.hunger = 0;
      float(ctx, me.x, me.y - 54, '🍽️ STARVED', hex(GLT.bloodDark), 13);
      readout.setText('at zero it hands the hat back. No penalty beyond being a chef again.');
    });
  },
};

// ══════════════════════════════════════════════════════════════════════
//  UPGRADED
//
//  Five purchases, ten showcases: a Gluttony slot is two abilities, so each
//  upgrade gets one loop for the kitchen and one for what the same coin does
//  once the toque is off. Every loop below assumes the upgrade is owned and
//  spends its whole runtime on what changed rather than re-teaching the base.
// ══════════════════════════════════════════════════════════════════════

// ══ CHEF · CLICK+ — Cleave ════════════════════════════════════════════

export const knifeUp: PreviewScript = {
  duration: 16000,
  scale: 0.78,
  bodyTexture: '',
  caption: 'Click+ — a cleaver that goes through bodies, and holds its heat for 4 seconds after the throw',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.2, y: ctx.h * 0.6 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    rig?.setCleaver(true);
    const grill = { x: ctx.w * 0.34, y: ctx.h * 0.32 };
    const line = [
      { x: ctx.w * 0.56, y: ctx.h * 0.6 },
      { x: ctx.w * 0.72, y: ctx.h * 0.6 },
      { x: ctx.w * 0.88, y: ctx.h * 0.6 },
    ];
    for (const m of line) dummyAt(ctx, m);
    const readout = label(ctx, ctx.w * 0.5, 58, '#d6dee6', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#ffe9a8', 10);

    const s = { heat: 0, hotUntil: -1, clock: 0, dealt: 0 };
    kitchen(ctx, () => ({ x: grill.x, y: grill.y, superheat: 0, cooking: [] }));
    prepStrip(ctx, () => ({
      inv: [], held: null, heat: s.heat, cleaver: true,
      // Once the blade is red the tile stops showing how far through heating you are and
      // starts showing how much of the four seconds is left, exactly as the kit's HUD does.
      hot: s.clock > 0 ? s.clock : undefined,
    }));

    type Slab = { x: number; y: number; vx: number; vy: number; spin: number; hot: boolean; hit: Mark[] };
    const slabs: Slab[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      air.clear();
      const near = Phaser.Math.Distance.Between(me.x, me.y, grill.x, grill.y) <= 66;
      if (near && s.heat < 1) {
        s.heat = Math.min(1, s.heat + delta / 2000);
        if (s.heat >= 1 && s.hotUntil < elapsed) {
          s.hotUntil = elapsed + 4000;
          ctx.capture(() => fx.sizzle(me.x, me.y, 8, 22, 500));
          float(ctx, me.x, me.y - 48, '🔥 CLEAVER HEATED', hex(GLT.heat), 12);
        }
      }
      // The four-second clock, and the blade going cold at the end of it.
      if (s.hotUntil > 0 && elapsed >= s.hotUntil) {
        s.hotUntil = -1;
        s.heat = 0;
        float(ctx, me.x, me.y - 48, '🧊 GONE COLD', hex(GLT.steelMid), 11);
      }
      s.clock = s.hotUntil > elapsed ? (s.hotUntil - elapsed) / 4000 : 0;
      rig?.setKnifeHeat(s.heat);

      for (let i = slabs.length - 1; i >= 0; i--) {
        const k = slabs[i];
        k.x += k.vx * dt; k.y += k.vy * dt; k.spin += dt * 18;
        k.hot = s.hotUntil > elapsed;
        for (const m of line) {
          if (k.hit.includes(m)) continue;
          if (Phaser.Math.Distance.Between(k.x, k.y, m.x, m.y) > 22) continue;
          k.hit.push(m);
          const dmg = k.hot ? 35 : 25;
          s.dealt += dmg;
          ctx.capture(() => { fx.splat(m.x, m.y, 20, GLT.blood); if (k.hot) fx.sizzle(m.x, m.y, 6, 20, 420); });
          float(ctx, m.x, m.y - 26, `${dmg}`, '#ffb3aa', 16);
          float(ctx, m.x, m.y - 44, '🪓 THROUGH', hex(GLT.steel), 10);
        }
        if (k.x > ctx.w) { slabs.splice(i, 1); continue; }
        chefCleaver(air, ctx.tint, k.x, k.y,
          Math.atan2(k.vy, k.vx) + Math.sin(k.spin) * 0.35, 32, k.hot ? 1 : 0, 1);
      }

      const left = s.hotUntil > elapsed ? (s.hotUntil - elapsed) / 1000 : 0;
      gauge.setText(left > 0
        ? `red for ${left.toFixed(1)}s more   ·   every throw inside that window is 35, and every throw pierces`
        : `${s.dealt} dealt   ·   cold: 25 a body, still through all of them`);
    });

    const hurl = (at: number, note: string): void => ctx.at(at, () => {
      const a = 0;
      slabs.push({ x: me.x + 26, y: me.y, vx: 780, vy: 0, spin: 0, hot: s.hotUntil > at, hit: [] });
      av.play('punch', a);
      readout.setText(note);
    });

    ctx.at(300, () => readout.setText('the knife is a slab now: square tip, spine you could stand on, and it does not stop'));
    hurl(900, 'cold, straight through all three: 25 apiece, once each, for the whole 1.5s of flight');
    ctx.at(3200, () => { me.x = grill.x - 30; me.y = grill.y + 40; readout.setText('two seconds over the coals arms a four-second clock instead of a single charge'); });
    ctx.at(6000, () => { me.x = ctx.w * 0.2; me.y = ctx.h * 0.6; });
    hurl(6600, 'red, and through: 35 to each of them');
    hurl(8000, 'and the throw no longer spends it — the same heat pays for the next one too');
    hurl(9400, 'three throws off one trip to the grill, which is the whole upgrade');
    ctx.at(11400, () => readout.setText('a blade already in flight goes cold mid-flight when the clock runs out'));
    hurl(12600, 'cold again: back to 25, still piercing');
    ctx.at(14600, () => readout.setText('the tile\'s bar fills orange while you heat, then drains pale as the 4 seconds run'));
  },
};

// ══ CHEF · E+ — Head Chef ═════════════════════════════════════════════

export const forageUp: PreviewScript = {
  duration: 22000,
  scale: 0.88,
  bodyTexture: '',
  caption: 'E+ — four more things in the ground: berries, mint, pineapple, and one that bites back',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.32, y: ctx.h * 0.62, dir: 1 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    const readout = label(ctx, ctx.w * 0.5, 56, '#9b3fd4', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#d6cfbe', 10);

    const s = { inv: [] as Item[], digUntil: -1, buff: '', buffUntil: -1, hp: 400 };
    prepStrip(ctx, () => ({ inv: s.inv, held: null, heat: 0 }));

    ctx.onFrame((delta, elapsed) => {
      const digging = s.digUntil > elapsed;
      me.x += 120 * me.dir * (delta / 1000) * (digging ? 0.5 : 1);
      if (me.x > ctx.w * 0.66) me.dir = -1;
      if (me.x < ctx.w * 0.22) me.dir = 1;
      rig?.setFed(s.inv.length / 6);
      const on = s.buffUntil > elapsed;
      gauge.setText(on
        ? `${s.buff}   ·   ${((s.buffUntil - elapsed) / 1000).toFixed(1)}s left`
        : `health ${s.hp}/400   ·   seven entries on the table, and one of them is weighted 0.34`);
    });

    const dig = (at: number, kind: FoodKind, note: string, after?: () => void): void => {
      ctx.at(at, () => {
        s.digUntil = at + 2000;
        av.setHold('sow', ctx.aim);
        float(ctx, me.x, me.y - 46, '🌿 FORAGING', hex(GLT.frond), 12);
        readout.setText(note);
      });
      ctx.at(at + 2000, () => {
        av.setHold(null);
        s.inv.push(raw(kind));
        ctx.capture(() => {
          fx.crumbs(me.x, me.y + 8, FOOD[kind].color);
          if (FOOD[kind].rare) fx.ring(me.x, me.y, 10, 60, GLT.venom, 620);
        });
        float(ctx, me.x, me.y - 48, `${FOOD[kind].emoji} ${FOOD[kind].label}`, hex(FOOD[kind].color), 12);
        after?.();
      });
    };

    const eat = (at: number, note: string, label_: string, color: number, hpDelta: number, ms: number): void =>
      ctx.at(at, () => {
        const item = s.inv.shift();
        if (item) ctx.capture(() => fx.crumbs(me.x, me.y + 6, FOOD[item.kind].color));
        s.hp = Phaser.Math.Clamp(s.hp + hpDelta, 0, 400);
        float(ctx, me.x, me.y - 46, `${hpDelta >= 0 ? '+' : ''}${hpDelta}`,
          hpDelta >= 0 ? '#9dffa0' : hex(GLT.venom), 15);
        float(ctx, me.x, me.y - 64, label_, hex(color), 12);
        s.buff = label_;
        s.buffUntil = at + ms;
        readout.setText(note);
      });

    dig(300, 'berries', 'Bristle Berries: five HP and a fifth more damage for eight seconds');
    eat(2500, 'raw they are +20% damage. Cooked — five seconds on the grate — 12 HP and +35%.',
      '🫐 +20% DAMAGE', GLT.berry, 5, 8000);
    dig(4200, 'mint', 'Winter Mint: a tenth of your health back, and a fifth less damage taken');
    eat(6400, 'and this is the one you must NOT cook. Two seconds on the grate ruins it: 1% and nothing else.',
      '🍃 −20% DAMAGE TAKEN', GLT.mint, 40, 8000);
    dig(8600, 'pineapple', 'Pineapple: no buff at all, just the biggest flat heal on the table');
    eat(10800, 'thirty raw, fifty cooked — but twenty seconds on the grate to get there',
      '🍍 30 HP', GLT.pineapple, 30, 1);
    dig(12800, 'deathcap', 'and one entry in twenty is a Death Cap, which is not food yet');
    eat(15000, 'raw it takes 30 off you for +25% speed. It is a cost with a benefit attached.',
      '☠️ +25% SPEED', GLT.venom, -30, 8000);
    ctx.at(17600, () => {
      s.inv.push(cooked('deathcap'));
      float(ctx, me.x, me.y - 50, '☠️ COOKED', hex(FOOD.deathcap.cookedColor), 12);
      readout.setText('twenty-five seconds on the grill and the same mushroom is a 50 heal and +35% speed');
    });
    eat(19600, 'the largest swing any single ingredient makes — from −30 to +50 for standing still',
      '☠️ +35% SPEED', GLT.venom, 50, 8000);
  },
};

// ══ CHEF · R+ — Pit Master ════════════════════════════════════════════

export const charcoalUp: PreviewScript = {
  duration: 18000,
  scale: 0.8,
  bodyTexture: '',
  caption: 'R+ — blue coals at triple speed, and everything on the grate over-sears for +25%',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.24, y: ctx.h * 0.64 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const grill = { x: ctx.w * 0.54, y: ctx.h * 0.42 };
    const readout = label(ctx, ctx.w * 0.5, 56, '#3fa9ff', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#d6f0ff', 10);

    const s = {
      superUntil: -1, inv: [] as Item[],
      cooking: [{ kind: 'potato' as FoodKind, progress: 0, slot: 0, seed: 1, oversear: true, stage: 0 },
        { kind: 'berries' as FoodKind, progress: 0, slot: 1, seed: 4, oversear: true, stage: 0 }] as Cook[],
    };
    kitchen(ctx, () => ({
      x: grill.x, y: grill.y, cooking: s.cooking, blue: true,
      superheat: s.superUntil > 0 ? 1 : 0,
    }));
    prepStrip(ctx, () => ({ inv: s.inv, held: null, heat: 0 }));

    const coals: { x: number; y: number; vx: number; vy: number; spin: number }[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      air.clear();
      const hot = s.superUntil > elapsed;
      for (const c of s.cooking) {
        const cookMs = FOOD[c.kind].cookMs;
        const total = cookMs * 1.5;
        if (c.progress >= total) continue;
        c.progress = Math.min(total, c.progress + delta * (hot ? 3 : 1));
        const [ox, oy] = SLOT_OFFSETS[c.slot];
        if (c.stage === 0 && c.progress >= cookMs) {
          c.stage = 1;
          float(ctx, grill.x + ox, grill.y + oy - 26, `${FOOD[c.kind].emoji} DONE`,
            hex(FOOD[c.kind].cookedColor), 11);
          float(ctx, grill.x + ox, grill.y + oy - 44, '🔵 SEARING', hex(GLT.blueCoal), 10);
        }
        if (c.stage === 1 && c.progress >= total) {
          c.stage = 2;
          ctx.capture(() => fx.ring(grill.x + ox, grill.y + oy, 8, 34, GLT.blueHot, 480));
          float(ctx, grill.x + ox, grill.y + oy - 26, `${FOOD[c.kind].emoji} OVER-SEARED`,
            hex(GLT.blueHot), 12);
        }
      }
      for (let i = coals.length - 1; i >= 0; i--) {
        const c = coals[i];
        c.x += c.vx * dt; c.y += c.vy * dt; c.spin += dt * 9;
        if (Phaser.Math.Distance.Between(c.x, c.y, grill.x, grill.y) <= GRILL_R * 1.5) {
          coals.splice(i, 1);
          s.superUntil = elapsed + 6000;
          ctx.capture(() => fx.flare(grill.x, grill.y, GRILL_R * 1.7));
          float(ctx, grill.x, grill.y - 46, '🔵 BLUE COALS', hex(GLT.blueHot), 13);
          continue;
        }
        charcoalLump(air, ctx.tint, c.x, c.y, c.spin * 0.4, 15, 0.85, 1, 5, true);
      }
      const searing = s.cooking.some((c) => c.stage === 1);
      gauge.setText(hot
        ? `blue for ${((s.superUntil - elapsed) / 1000).toFixed(1)}s   ·   grate ×3, blade ×3`
        : searing
          ? 'cooked and collectable — and still on the fire. Walk over now and you take it as it is.'
          : 'the second pass is another 50% of the cook time: 2.5s a carrot, 6s a potato');
    });

    ctx.at(400, () => readout.setText('the same briquette, burning blue. It is fuel, and it is better fuel.'));
    ctx.at(1200, () => {
      const a = Math.atan2(grill.y - me.y, grill.x - me.x);
      coals.push({ x: me.x + Math.cos(a) * 22, y: me.y + Math.sin(a) * 22, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, spin: 0 });
      av.play('slam', a);
      readout.setText('six seconds at triple rate rather than double: a potato in four, a blade in two thirds of one');
    });
    ctx.at(4200, () => readout.setText('the ember ring fills and the food turns cooked, exactly when it always did'));
    ctx.at(6400, () => readout.setText('and then the ring restarts from empty, in blue. That is the second pass.'));
    ctx.at(8400, () => readout.setText('collection is still automatic within 66px — so an over-sear costs you the walk away'));
    ctx.at(10400, () => {
      s.inv.push(seared('potato'));
      readout.setText('+25% healing: a cooked potato is 40, an over-seared one is 50');
    });
    ctx.at(13000, () => {
      s.inv.push(seared('berries'));
      readout.setText('and +3 seconds on the buff: over-seared berries are +35% damage for 11 seconds, not 8');
    });
    ctx.at(15800, () => readout.setText('the blue coals are what pay for the second pass. Keep them lit or you are just slower.'));
  },
};

// ══ CHEF · F+ — Murderous Intent ══════════════════════════════════════

export const butcherUp: PreviewScript = {
  duration: 14000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'F+ — transforming back knocks 9 seconds off the 45, so the door is cheap in both directions',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.36, y: ctx.h * 0.62 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    const readout = label(ctx, ctx.w * 0.5, 56, '#a81f2b', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#f6f2e8', 10);

    const s = { form: 0, cdLeft: 0, hunger: 0 };
    prepStrip(ctx, () => ({ inv: [], held: null, heat: 0, hunger: s.form > 0.02 ? s.hunger : undefined }));

    // The cooldown plate, drawn big enough that nine seconds coming off it is the whole loop.
    const plate = ctx.adopt(ctx.scene.add.graphics().setDepth(20));
    ctx.onFrame((delta, elapsed) => {
      void elapsed;
      s.form = Phaser.Math.Clamp(s.form + (s.hunger > 0 ? delta / 320 : -delta / 320), 0, 1);
      rig?.setButcher(s.form);
      if (s.hunger > 0) s.hunger = Math.max(0, s.hunger - delta);
      if (s.cdLeft > 0) s.cdLeft = Math.max(0, s.cdLeft - delta);

      const w = 190, h = 20, x = ctx.w * 0.5 - w / 2, y = ctx.h - 46;
      plate.clear();
      plate.fillStyle(ctx.tint(GLT.char), 0.9);
      plate.fillRect(x, y, w, h);
      plate.fillStyle(ctx.tint(s.cdLeft > 0 ? GLT.bloodDark : 0x7ada6a), 1);
      plate.fillRect(x, y, w * (1 - s.cdLeft / 45000), h);
      plate.lineStyle(1.4, ctx.tint(GLT.blood), 0.9);
      plate.strokeRect(x, y, w, h);
      gauge.setText(s.cdLeft > 0
        ? `F — ${(s.cdLeft / 1000).toFixed(1)}s of 45`
        : 'F — ready');
    });

    ctx.at(400, () => readout.setText('nothing about the transformation itself changes. What changes is the price of leaving.'));
    ctx.at(1400, () => {
      s.hunger = 30000;
      s.cdLeft = 45000;
      ctx.capture(() => { fx.ring(me.x, me.y, 16, 110, GLT.blood, 620); fx.splat(me.x, me.y + 8, 34, GLT.blood); });
      float(ctx, me.x, me.y - 56, '🔪 SPECIAL INGREDIENT', hex(GLT.blood), 12);
      readout.setText('forty-five seconds of cooldown, spent the moment you press it');
    });
    ctx.at(4800, () => readout.setText('you got what you came for. Ordinarily leaving now would waste most of that wait.'));
    ctx.at(6200, () => {
      s.hunger = 0;
      s.cdLeft = Math.max(0, s.cdLeft - 9000);
      ctx.capture(() => fx.ring(me.x, me.y, 10, 70, GLT.white, 480));
      float(ctx, me.x, me.y - 52, '👨‍🍳 BACK TO THE KITCHEN', hex(GLT.white), 12);
      float(ctx, me.x, me.y - 70, '🔪 −9.0s', hex(GLT.blood), 14);
      readout.setText('20% of 45 comes straight off the running cooldown: nine seconds, once per transformation');
    });
    ctx.at(9000, () => readout.setText('a butcher who exits immediately is back on F after 36 seconds rather than 45'));
    ctx.at(11400, () => readout.setText('which is what makes short deliberate transformations worth taking at all'));
  },
};

// ══ CHEF · Q+ — Resourceful ═══════════════════════════════════════════

export const feastUp: PreviewScript = {
  duration: 20000,
  scale: 0.86,
  bodyTexture: '',
  caption: 'Q+ — two parcels out of the bottom of the pot, worth 12% now or 25% in twenty-five seconds',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.42, y: ctx.h * 0.66 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    const readout = label(ctx, ctx.w * 0.5, 60, '#c9b48a', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#efb45e', 10);

    const s = {
      inv: [cooked('potato'), cooked('potato'), cooked('meat'),
        cooked('carrot'), cooked('mushroom'), cooked('potato')] as Item[],
      potUntil: -1, potHeal: 0, restAt: -1, rested: false, hp: 220,
    };
    prepStrip(ctx, () => ({ inv: s.inv, held: null, heat: 0 }));

    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((_delta, elapsed) => {
      air.clear();
      if (s.potUntil > elapsed) {
        stewPot(air, ctx.tint, me.x, me.y - 34, 17, elapsed / 1000,
          1 - (s.potUntil - elapsed) / 3000, 1);
      }
      if (s.restAt > 0 && !s.rested && elapsed >= s.restAt) {
        s.rested = true;
        for (const it of s.inv) if (it.kind === 'leftovers') it.cooked = true;
        float(ctx, me.x, me.y - 52, '🥡 RESTED', hex(FOOD.leftovers.cookedColor), 13);
      }
      const left = s.restAt > elapsed ? (s.restAt - elapsed) / 1000 : 0;
      gauge.setText(left > 0
        ? `resting — ${left.toFixed(1)}s, and each parcel goes 29 → 60`
        : `health ${s.hp}/400`);
    });

    ctx.at(400, () => readout.setText('a full strip of cooked food: 240 HP once the pot doubles it'));
    ctx.at(1600, () => {
      s.potHeal = 240;
      s.potUntil = 4600;
      s.inv = [];
      av.play('raise');
      ctx.capture(() => fx.ring(me.x, me.y, 14, 90, GLT.stew, 560));
      float(ctx, me.x, me.y - 54, '🍲 FEAST — 240', hex(GLT.stewLit), 13);
      readout.setText('the strip goes in, the pot swirls for three seconds — all of that is unchanged');
    });
    ctx.at(1800, () => {
      s.inv = [raw('leftovers'), raw('leftovers')];
      s.restAt = 1800 + 25000;
      float(ctx, me.x, me.y - 72, '🥡 2 LEFTOVERS — 29 → 60', hex(GLT.parcel), 12);
      readout.setText('and two parcels land on the strip the same instant, scraped off the bottom');
    });
    ctx.at(4600, () => {
      s.hp = Phaser.Math.Clamp(s.hp + 240, 0, 400);
      ctx.capture(() => { fx.ring(me.x, me.y - 26, 18, 130, GLT.stewLit, 640); fx.crumbs(me.x, me.y + 6, GLT.stew); });
      float(ctx, me.x, me.y - 46, '🍲 +240', hex(GLT.stewLit), 16);
      readout.setText('the pot pays out. The parcels are on top of it, not instead of it.');
    });
    ctx.at(7000, () => readout.setText('12% of what the pot healed, each: 29 apiece off a 240 Feast'));
    ctx.at(9600, () => { s.restAt = 12200; readout.setText('leave them twenty-five seconds and they turn by themselves'); });
    ctx.at(13000, () => readout.setText('25% instead: 60 apiece, for having done nothing at all'));
    ctx.at(15600, () => readout.setText('a parcel tile carries its own rest bar, and the parcel opens and steams once it turns'));
    ctx.at(18000, () => readout.setText('they are food like anything else: 4 butcher seconds each, and they over-sear on a grate'));
  },
};

// ══ BUTCHER · CLICK+ — Cleave ═════════════════════════════════════════

export const cleaveUp: PreviewScript = {
  duration: 13000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Click+ (butcher) — every arc that lands is +25% walk speed for 2 seconds, refreshed by the next',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.16, y: ctx.h * 0.58 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    rig?.setButcher(1);
    rig?.setCleaver(true);
    const foe = { x: ctx.w * 0.78, y: ctx.h * 0.58, dir: 1 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 14, '#d6dee6', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#f6f2e8', 10);

    const s = { hasteUntil: -1, dealt: 0, chase: false };
    const fan = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
    const trail = ctx.adopt(ctx.scene.add.graphics().setDepth(2));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      const hasted = s.hasteUntil > elapsed;
      // The runner keeps backing off; the butcher only keeps up while the speed is live.
      foe.x += 96 * foe.dir * dt;
      if (foe.x > ctx.w * 0.86) foe.dir = -1;
      if (foe.x < ctx.w * 0.54) foe.dir = 1;
      if (s.chase) me.x += 110 * (hasted ? 1.25 : 1) * dt;
      me.x = Math.min(me.x, foe.x - 74);

      fan.clear();
      fan.fillStyle(ctx.tint(GLT.blood), 0.07);
      fan.beginPath();
      fan.moveTo(me.x, me.y);
      fan.arc(me.x, me.y, 110, -1.15, 1.15);
      fan.closePath();
      fan.fillPath();

      trail.clear();
      if (hasted) {
        for (let i = 1; i <= 4; i++) {
          trail.fillStyle(ctx.tint(GLT.steel), 0.16 - i * 0.03);
          trail.fillEllipse(me.x - i * 11, me.y + 12, 26 - i * 3, 8);
        }
      }
      gauge.setText(hasted
        ? `🏃 CARVING — ${((s.hasteUntil - elapsed) / 1000).toFixed(1)}s   ·   ×1.25 walk speed`
        : `${s.dealt} dealt   ·   the speed is the reward for closing, not the tool for it`);
    });

    const swing = (at: number, note: string, land: boolean): void => ctx.at(at, () => {
      av.play('sweep', 0);
      ctx.capture(() => fx.slashArc(me.x, me.y, 0, 94, land ? GLT.blood : GLT.steel));
      if (!land) { readout.setText(note); return; }
      s.dealt += 30;
      s.hasteUntil = at + 2000;
      ctx.capture(() => fx.splat(foe.x, foe.y, 24, GLT.blood));
      float(ctx, foe.x, foe.y - 26, '30', '#ffb3aa', 16);
      float(ctx, me.x, me.y - 58, '🏃 +25% SPEED', hex(GLT.steel), 12);
      readout.setText(note);
    });

    ctx.at(300, () => readout.setText('the swing is the same swing. What changes is what landing one does to you.'));
    swing(1000, 'thirty damage — and two seconds of +25% walk speed on top of it', true);
    ctx.at(1400, () => { s.chase = true; });
    swing(2500, 'the cooldown is 1.25s and the window is 2s, so a connected swing holds it open', true);
    swing(4000, 'refreshed rather than stacked: it never goes past 25%, and it never lapses', true);
    swing(5600, 'which turns the butcher from a man who walks at you into a man who keeps up', true);
    swing(8000, 'a whiffed arc gives nothing at all — no damage and no speed', false);
    ctx.at(9600, () => readout.setText('and it multiplies with a Death Cap rather than overwriting it: ×1.56 together'));
    ctx.at(11400, () => readout.setText('the same coin bought the chef a piercing cleaver. This is the other half of it.'));
  },
};

// ══ BUTCHER · E+ — Head Chef ══════════════════════════════════════════

export const poachUp: PreviewScript = {
  duration: 21000,
  scale: 0.76,
  bodyTexture: '',
  caption: 'E+ (butcher) — food left on the teeth spoils in 6 seconds, and a spoiled thing is ammunition',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.24, y: ctx.h * 0.66 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    rig?.setButcher(1);
    const maw = { x: ctx.w * 0.48, y: ctx.h * 0.4 };
    const foe = { x: ctx.w * 0.86, y: ctx.h * 0.66 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 56, '#7d9b34', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#d0525c', 10);

    const s = {
      inv: [raw('potato'), raw('mint')] as Item[], held: null as Item | null,
      rotting: [] as Rot[], hunger: 24000, dealt: 0,
    };
    kitchen(ctx, () => ({
      x: maw.x, y: maw.y, superheat: 0, cooking: [], rotting: s.rotting,
      maw: { gape: 0.35 + 0.15 * Math.sin(Date.now() / 400), rage: 0.2, awake: false },
    }));
    prepStrip(ctx, () => ({ inv: s.inv, held: s.held, heat: 0, hunger: s.hunger }));

    const tossed: { x: number; y: number; vx: number; vy: number; item: Item; spin: number; toMaw: boolean }[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta, elapsed) => {
      void elapsed;
      const dt = delta / 1000;
      air.clear();
      rig?.setHeld(s.held);
      for (const r of s.rotting) r.progress = Math.min(ROT_MS, r.progress + delta);

      for (let i = tossed.length - 1; i >= 0; i--) {
        const p = tossed[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.spin += dt * 7;
        if (p.toMaw && Phaser.Math.Distance.Between(p.x, p.y, maw.x, maw.y) <= GRILL_R * 1.4) {
          tossed.splice(i, 1);
          s.rotting.push({ item: p.item, progress: 0, slot: s.rotting.length });
          float(ctx, maw.x, maw.y - 36, `${FOOD[p.item.kind].emoji} LEFT TO ROT`, hex(GLT.rotDark), 11);
          continue;
        }
        if (!p.toMaw && Phaser.Math.Distance.Between(p.x, p.y, foe.x, foe.y) <= 24) {
          tossed.splice(i, 1);
          const dmg = p.item.kind === 'mint' ? 60 : FOOD[p.item.kind].healCooked;
          s.dealt += dmg;
          ctx.capture(() => fx.splat(foe.x, foe.y, 28, GLT.rot));
          float(ctx, foe.x, foe.y - 26, `${dmg}`, '#c8ff8a', 18);
          float(ctx, foe.x, foe.y - 46, `${FOOD[p.item.kind].emoji} SPOILED`, hex(GLT.rot), 11);
          continue;
        }
        itemShape(air, ctx.tint, p.x, p.y, p.item, 22, 1, p.spin);
      }
      gauge.setText(`${s.dealt} thrown into them   ·   rotten damage is what the cooked one would have healed`);
    });

    const toss = (at: number, toMaw: boolean, note: string): void => ctx.at(at, () => {
      const item = s.held ?? s.inv[0];
      if (!item) return;
      const tx = toMaw ? maw.x : foe.x;
      const ty = toMaw ? maw.y : foe.y;
      const a = Math.atan2(ty - me.y, tx - me.x);
      tossed.push({
        x: me.x + Math.cos(a) * 22, y: me.y + Math.sin(a) * 22,
        vx: Math.cos(a) * 540, vy: Math.sin(a) * 540, item, spin: 0, toMaw,
      });
      s.inv = s.inv.filter((it) => it !== item);
      s.held = null;
      av.play('punch', a);
      readout.setText(note);
    });

    ctx.at(300, () => readout.setText('holding an ingredient, the butcher\'s click throws it instead of swinging'));
    ctx.at(900, () => { s.held = s.inv[0]; });
    toss(1600, true, 'four slots on the teeth, and no heat involved — it just needs to be left alone');
    ctx.at(3200, () => { s.held = s.inv[0]; });
    toss(3900, true, 'six seconds flat, whatever it is. Superheat does nothing to a mouth.');
    ctx.at(6400, () => readout.setText('the ring around each one is the same ring the grate uses, and it turns green the same way'));
    ctx.at(10400, () => {
      s.inv = s.rotting.map((r) => spoiled(r.item.kind));
      s.rotting = [];
      s.held = s.inv[0];
      float(ctx, me.x, me.y - 48, '🥔 ROTTEN POTATO', hex(GLT.rot), 12);
      readout.setText('walk within 66px to take them back. They are not food any more.');
    });
    toss(12200, false, 'a rotten potato deals 40 — what the cooked one would have healed');
    ctx.at(14200, () => { s.held = s.inv[0]; });
    toss(15200, false, 'and rotten Winter Mint is the exception: 15% of their maximum health');
    ctx.at(17400, () => readout.setText('eaten instead, a rotten thing heals half what the raw one would — a rotten Death Cap still costs 15'));
    ctx.at(19400, () => readout.setText('and when the form ends the maw becomes a grill again: everything on the teeth falls off'));
  },
};

// ══ BUTCHER · R+ — Pit Master ═════════════════════════════════════════

export const cannibalizeUp: PreviewScript = {
  duration: 16000,
  scale: 0.84,
  bodyTexture: '',
  caption: 'R+ (butcher) — stand over the maw and the blade drinks: 25 damage buys a second of the form back',
  run(ctx) {
    const fx = fxOf(ctx);
    const maw = { x: ctx.w * 0.44, y: ctx.h * 0.44 };
    const me = { x: ctx.w * 0.2, y: ctx.h * 0.7 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    rig?.setButcher(1);
    rig?.setCleaver(true);
    const foe = { x: ctx.w * 0.6, y: ctx.h * 0.52 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 56, '#9c1524', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#5c0a14', 10);

    const s = { ichorUntil: -1, hunger: 9000, banked: 0 };
    kitchen(ctx, () => ({
      x: maw.x, y: maw.y, superheat: 0, cooking: [],
      maw: { gape: 0.4, rage: 0.3, awake: false },
    }));
    prepStrip(ctx, () => ({
      inv: [], held: null, heat: 0, hunger: s.hunger, cleaver: true,
      ichor: s.ichorUntil > 0 ? 1 : 0,
    }));

    const ring = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((delta, elapsed) => {
      const near = Phaser.Math.Distance.Between(me.x, me.y, maw.x, maw.y) <= 66;
      if (near) s.ichorUntil = elapsed + 5000;
      const wet = s.ichorUntil > elapsed;
      rig?.setIchor(wet ? Phaser.Math.Clamp((s.ichorUntil - elapsed) / 900, 0, 1) : 0);
      s.hunger = Math.max(0, s.hunger - delta);

      ring.clear();
      ring.lineStyle(1.6, ctx.tint(GLT.ichorLit), 0.35 + 0.15 * Math.sin(elapsed / 260));
      ring.strokeCircle(maw.x, maw.y, 66);
      gauge.setText(wet
        ? `🩸 ICHOROUS — ${((s.ichorUntil - elapsed) / 1000).toFixed(1)}s   ·   ${(s.banked / 1000).toFixed(1)}s banked so far`
        : `bar ${(s.hunger / 1000).toFixed(1)}s   ·   step inside the ring to coat the blade`);
    });

    const swing = (at: number, note: string): void => ctx.at(at, () => {
      const a = Math.atan2(foe.y - me.y, foe.x - me.x);
      const wet = s.ichorUntil > at;
      av.play('sweep', a);
      ctx.capture(() => {
        fx.slashArc(me.x, me.y, a, 94, wet ? GLT.ichorLit : GLT.blood);
        fx.splat(foe.x, foe.y, 24, wet ? GLT.ichor : GLT.blood);
      });
      float(ctx, foe.x, foe.y - 26, '30', '#ffb3aa', 16);
      if (wet) {
        const gain = 30 * 40;
        s.banked += gain;
        s.hunger = Math.min(30000, s.hunger + gain);
        float(ctx, me.x, me.y - 72, `🩸 +${(gain / 1000).toFixed(1)}s`, hex(GLT.ichorLit), 13);
      }
      readout.setText(note);
    });

    ctx.at(300, () => readout.setText('the bar is nine seconds and falling. Ordinarily that is the end of the form.'));
    swing(1100, 'a dry cleaver is thirty damage and nothing else');
    ctx.at(2600, () => {
      me.x = maw.x - 42; me.y = maw.y + 38;
      readout.setText('stand within 66px of the mouth and it climbs the blade — five seconds, refreshed while you stay');
    });
    ctx.at(3400, () => {
      ctx.capture(() => fx.splat(me.x, me.y + 6, 18, GLT.ichor));
      float(ctx, me.x, me.y - 54, '🩸 ICHOROUS BLADE', hex(GLT.ichorLit), 12);
    });
    ctx.at(4400, () => { foe.x = maw.x + 76; foe.y = maw.y + 24; });
    swing(5000, 'now every 25 damage it deals is a second back on the bar — 40ms a point');
    swing(6600, 'one 30-damage arc is 1.2 seconds. Into two bodies it is 2.4.');
    swing(8200, 'the form starts paying for itself, as long as you are willing to fight on top of the mouth');
    ctx.at(10000, () => { me.x = ctx.w * 0.2; me.y = ctx.h * 0.7; foe.x = ctx.w * 0.34; foe.y = ctx.h * 0.7; readout.setText('walk out of the ring and it dries five seconds later'); });
    swing(12400, 'dry again: thirty damage, nothing banked');
    ctx.at(14200, () => readout.setText('Cleave only. Poach, Cannibalize and the maw\'s own attacks pay nothing into the bar.'));
  },
};

// ══ BUTCHER · F+ — Murderous Intent ═══════════════════════════════════

export const returnUp: PreviewScript = {
  duration: 19000,
  scale: 0.74,
  bodyTexture: '',
  caption: 'F+ (butcher) — the maw fires a cone of five, grabs every 10 seconds, and bites anyone close',
  run(ctx) {
    const fx = fxOf(ctx);
    const maw = { x: ctx.w * 0.32, y: ctx.h * 0.44 };
    const me = { x: ctx.w * 0.16, y: ctx.h * 0.74 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    chef(av)?.setButcher(1);
    const foe = { x: ctx.w * 0.82, y: ctx.h * 0.5 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 56, '#d4707b', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#f7f1de', 10);

    const s = { nextShot: 800, vulnUntil: -1, stunUntil: -1, dealt: 0, nextBite: 99999 };
    kitchen(ctx, () => ({
      x: maw.x, y: maw.y, superheat: 0, cooking: [],
      maw: { gape: 0.45, rage: 0.35, awake: false },
    }));

    type Shot = { x: number; y: number; vx: number; vy: number; spin: number };
    const shots: Shot[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const marks = ctx.adopt(ctx.scene.add.graphics().setDepth(3));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      air.clear(); marks.clear();

      if (elapsed >= s.nextShot) {
        s.nextShot = elapsed + 1000;
        const a = Math.atan2(foe.y - maw.y, foe.x - maw.x);
        for (let i = 0; i < 5; i++) {
          const off = (i - 2) * 0.19;
          shots.push({
            x: maw.x + Math.cos(a + off) * 20, y: maw.y + Math.sin(a + off) * 14,
            vx: Math.cos(a + off) * 390, vy: Math.sin(a + off) * 390, spin: i,
          });
        }
      }
      for (let i = shots.length - 1; i >= 0; i--) {
        const b = shots[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 10;
        if (Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y) <= 20) {
          shots.splice(i, 1);
          s.dealt += 5;
          const fresh = s.vulnUntil <= elapsed;
          s.vulnUntil = elapsed + 2000;
          ctx.capture(() => fx.splat(foe.x, foe.y, 16, GLT.blood));
          if (fresh) float(ctx, foe.x, foe.y - 44, '🦷 TENDERISED', hex(GLT.flesh), 11);
          continue;
        }
        if (b.x > ctx.w || b.x < 0 || b.y > ctx.h || b.y < 0) { shots.splice(i, 1); continue; }
        drawGobbet(air, ctx.tint, b.x, b.y, 7, b.spin, 1, false);
      }

      if (s.vulnUntil > elapsed) {
        marks.lineStyle(2, ctx.tint(GLT.flesh), 0.5 + 0.2 * Math.sin(elapsed / 180));
        marks.strokeCircle(foe.x, foe.y, 25);
      }
      if (s.stunUntil > elapsed) {
        marks.lineStyle(2.4, ctx.tint(GLT.fleshDark), 0.8);
        marks.lineBetween(maw.x, maw.y, foe.x, foe.y);
      }
      if (elapsed >= s.nextBite) {
        s.nextBite = elapsed + 1600;
        const a = Math.atan2(foe.y - maw.y, foe.x - maw.x);
        s.dealt += 30;
        ctx.capture(() => fx.bite(foe.x, foe.y, a, 38));
        float(ctx, foe.x, foe.y - 50, '🦷 BITTEN  30', hex(GLT.tooth), 13);
      }
      gauge.setText(`${s.dealt} from the mouth alone`
        + (s.vulnUntil > elapsed ? '   ·   +15% damage taken on them' : '   ·   five a second, unaimed'));
    });

    ctx.at(300, () => readout.setText('the once-a-second spit becomes a fan of five, still at 5 damage each'));
    ctx.at(2600, () => readout.setText('close enough to eat the whole cone and that is 25 a second, from something you never aim'));
    ctx.at(5000, () => readout.setText('and every gobbet that lands leaves +15% damage taken for 2 seconds'));
    ctx.at(7000, () => readout.setText('it does not stack with itself — but the cone refreshes it every single second'));
    ctx.at(9000, () => {
      s.stunUntil = 11000;
      ctx.capture(() => {
        fx.slashArc(maw.x, maw.y, Math.atan2(foe.y - maw.y, foe.x - maw.x),
          Phaser.Math.Distance.Between(maw.x, maw.y, foe.x, foe.y), GLT.fleshDark);
        fx.ring(foe.x, foe.y, 8, 44, GLT.flesh, 480);
      });
      float(ctx, foe.x, foe.y - 40, '🖐️ GRABBED', hex(GLT.flesh), 13);
      readout.setText('every 10 seconds it reaches out to 300px and stuns whoever it catches for 2 seconds');
    });
    ctx.at(12000, () => {
      foe.x = maw.x + 62; foe.y = maw.y + 30;
      s.nextBite = 12400;
      readout.setText('and anybody inside 78px of it gets bitten for 30, at most once every 1.6 seconds');
    });
    ctx.at(15600, () => { s.nextBite = 99999; foe.x = ctx.w * 0.82; foe.y = ctx.h * 0.5; readout.setText('the bite timer only spends itself when there is somebody there to bite'); });
    ctx.at(17400, () => readout.setText('none of the three needs a button, and all three run while it is still sat on the grill'));
  },
};

// ══ BUTCHER · Q+ — Resourceful ════════════════════════════════════════

export const mawAwakeningUp: PreviewScript = {
  duration: 20000,
  scale: 0.7,
  bodyTexture: '',
  caption: 'Q+ (butcher) — it wakes with a face: +50% damage, tentacles up all four walls, and a scream',
  run(ctx) {
    const fx = fxOf(ctx);
    const maw = { x: ctx.w * 0.44, y: ctx.h * 0.46, dread: 0 };
    const me = { x: ctx.w * 0.16, y: ctx.h * 0.8 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    chef(av)?.setButcher(1);
    const foe = { x: ctx.w * 0.86, y: ctx.h * 0.5 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 56, '#f1ead0', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#d4707b', 10);

    const BAND = 26;
    const s = { awake: false, dealt: 0, nextTendril: 99999, stunUntil: -1 };
    kitchen(ctx, () => ({
      x: maw.x, y: maw.y, superheat: 0, cooking: [],
      maw: { gape: s.awake ? 1 : 0.4, rage: s.awake ? 1 : 0.3, awake: s.awake, dread: maw.dread },
    }));

    const walls = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((delta, elapsed) => {
      maw.dread = Phaser.Math.Linear(maw.dread, s.awake ? 1 : 0, Math.min(1, delta / 420));
      walls.clear();
      if (maw.dread > 0.02) {
        const a = maw.dread;
        walls.fillStyle(ctx.tint(GLT.fleshDark), a * 0.16);
        walls.fillRect(0, 0, ctx.w, BAND);
        walls.fillRect(0, ctx.h - BAND, ctx.w, BAND);
        walls.fillRect(0, 0, BAND, ctx.h);
        walls.fillRect(ctx.w - BAND, 0, BAND, ctx.h);
        const t = elapsed / 1000;
        const edges: Array<[number, number, number]> = [];
        for (let i = 0; i < 8; i++) edges.push([0, (i + 0.5) / 8 * ctx.h, 0]);
        for (let i = 0; i < 8; i++) edges.push([ctx.w, (i + 0.5) / 8 * ctx.h, Math.PI]);
        for (let i = 0; i < 10; i++) edges.push([(i + 0.5) / 10 * ctx.w, 0, Math.PI / 2]);
        for (let i = 0; i < 10; i++) edges.push([(i + 0.5) / 10 * ctx.w, ctx.h, -Math.PI / 2]);
        edges.forEach(([x, y, ang], i) => {
          mawTentacle(walls, ctx.tint, x, y, ang + Math.sin(t * 2.2 + i * 1.7) * 0.35,
            BAND * (0.9 + 0.35 * a), t, i * 2.7, 3.4 * a, 0.9 * a, 0.8);
        });
      }
      if (elapsed >= s.nextTendril) {
        s.nextTendril = elapsed + 500;
        s.dealt += 8;
        ctx.capture(() => fx.splat(foe.x, foe.y, 14, GLT.fleshDark));
        float(ctx, foe.x, foe.y - 24, '8', '#ffb3aa', 12);
      }
      gauge.setText(s.awake
        ? `${s.dealt} from the mouth   ·   whip 23, gobbets 9, spit 8, bite 45 — all ×1.5`
        : 'asleep on the grill, and worth 5 a second');
    });

    ctx.at(400, () => readout.setText('the same ultimate, fed the same larder. What comes off the floor is not the same thing.'));
    ctx.at(1400, () => {
      s.awake = true;
      ctx.capture(() => {
        fx.ring(maw.x, maw.y, 24, 190, GLT.blood, 700);
        fx.splat(maw.x, maw.y, 60, GLT.bloodDark);
        fx.ring(maw.x, maw.y, 40, 320, GLT.bone, 900);
      });
      float(ctx, maw.x, maw.y - 60, '👄 AWAKENED', hex(GLT.flesh), 13);
      float(ctx, maw.x, maw.y - 84, '💀 IT HAS A FACE NOW', hex(GLT.bone), 12);
      readout.setText('a crown of bone spurs, a ring of eyes that all look the same way, and a second jaw');
    });
    ctx.at(4200, () => readout.setText('everything it does is worth half again: the whip 23, the barrage 9 a gobbet, a bite 45'));
    ctx.at(6400, () => readout.setText('and its limbs go up all four walls — a 30px band that hurts anyone but you'));
    ctx.at(8000, () => {
      foe.x = ctx.w - BAND * 0.6;
      s.nextTendril = 8200;
      readout.setText('8 damage every half second to anything standing in it. There is no safe wall.');
    });
    ctx.at(11400, () => { s.nextTendril = 99999; foe.x = ctx.w * 0.7; readout.setText('and every five seconds it screams'); });
    ctx.at(12600, () => {
      s.dealt += 35;
      s.stunUntil = 14600;
      ctx.capture(() => {
        fx.ring(maw.x, maw.y, 30, 240, GLT.bone, 780);
        fx.ring(maw.x, maw.y, 14, 170, GLT.blood, 620);
      });
      float(ctx, maw.x, maw.y - 70, '😱 SCREAM', hex(GLT.bone), 14);
      float(ctx, foe.x, foe.y - 26, '35', '#ffb3aa', 18);
      float(ctx, foe.x, foe.y - 46, '💫 DEAFENED', hex(GLT.flesh), 11);
      readout.setText('35 damage to everything within 240px, and a 2-second stun with it');
    });
    ctx.at(15600, () => readout.setText('nothing to dodge and nothing to block. Only distance works.'));
    ctx.at(17600, () => readout.setText('a 5-second cycle and a 2-second stun is 40% of the awakening spent standing still'));
  },
};

// ══ MASTERY — Snacking ════════════════════════════════════════════════

/**
 * The passive is a number rather than an object, so the loop is built round the two things that
 * number is read off: the strip, and the health bar. A fake bar is drawn under the caster because
 * the harness has no real one, and the strip is filled and emptied on script beats so the rate
 * visibly climbs and then collapses when the Feast takes it all.
 */
export const masterySnacking: PreviewScript = {
  duration: 19000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Mastery passive — a regen read straight off the strip: 1/s empty, 9/s at 200 of healing',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.3, y: ctx.h * 0.64 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    const readout = label(ctx, ctx.w * 0.5, 52, '#efb45e', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#d6cfbe', 10);

    const MAXHP = 400;
    const s = { inv: [] as Item[], hp: 210, tick: 0 };
    prepStrip(ctx, () => ({ inv: s.inv, held: null, heat: 0 }));

    /** The pool the passive actually reads: what the strip would heal if it were all eaten. */
    const pool = (): number => s.inv.reduce((n, it) => n + Math.max(0, foodHeal(it.kind, it.cooked)), 0);
    const rate = (): number => 1 + 8 * Phaser.Math.Clamp(pool() / 200, 0, 1);

    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta) => {
      // The regeneration itself, spent in whole points exactly as the kit spends it.
      s.tick += (rate() * delta) / 1000;
      const whole = Math.floor(s.tick);
      if (whole >= 1 && s.hp < MAXHP) {
        s.tick -= whole;
        s.hp = Math.min(MAXHP, s.hp + whole);
        float(ctx, me.x + 18, me.y - 30, `+${whole}`, '#8fe08a', 11);
      }
      bar.clear();
      const bw = 108;
      bar.fillStyle(ctx.tint(GLT.char), 0.9);
      bar.fillRect(me.x - bw / 2, me.y - 46, bw, 8);
      bar.fillStyle(ctx.tint(0x6fd06a), 1);
      bar.fillRect(me.x - bw / 2, me.y - 46, bw * (s.hp / MAXHP), 8);
      bar.lineStyle(1, ctx.tint(GLT.linenDark), 0.8);
      bar.strokeRect(me.x - bw / 2, me.y - 46, bw, 8);
      rig?.setFed(s.inv.length / 6);
      gauge.setText(`strip worth ${pool()}   ·   ${rate().toFixed(1)} health a second   ·   ${Math.round(s.hp)}/${MAXHP}`);
    });

    ctx.at(400, () => readout.setText('an empty strip is 1 a second. It is not nothing, and it never stops.'));
    ctx.at(3000, () => {
      s.inv = [raw('carrot'), raw('carrot'), raw('mushroom')];
      ctx.capture(() => fx.crumbs(me.x, me.y + 8, GLT.carrot));
      readout.setText('three raw ingredients — 35 of healing on the strip, and the crawl picks up');
    });
    ctx.at(6200, () => {
      s.inv = [cooked('potato'), cooked('meat'), cooked('mushroom'), cooked('potato')];
      ctx.capture(() => fx.sizzle(me.x, me.y, 7, 20, 460));
      readout.setText('cooking the same larder doubles the pool. 160 is most of the way to the ceiling.');
    });
    ctx.at(9400, () => {
      s.inv = [cooked('potato'), cooked('meat'), cooked('meat'), cooked('potato'), cooked('mushroom'), cooked('pineapple')];
      float(ctx, me.x, me.y - 62, '🍪 SNACKING', hex(GLT.stewLit), 12);
      readout.setText('a full strip of cooked food is 9 a second — the cap, and it holds all match');
    });
    ctx.at(13000, () => {
      s.inv = [];
      ctx.capture(() => {
        fx.ring(me.x, me.y, 14, 90, GLT.stew, 560);
        fx.smoke(me.x, me.y - 26, 7, 60, 0xd8cfba, 1100);
      });
      float(ctx, me.x, me.y - 54, '🍲 FEAST', hex(GLT.stewLit), 13);
      readout.setText('and here is the catch: Feast empties the strip, so it empties this with it');
    });
    ctx.at(15600, () => readout.setText('back to 1 a second until the larder is rebuilt. Snacking pays you for *not* eating.'));
    ctx.at(17400, () => readout.setText('it runs in butcher form too — quietly mending the health bar you will go back to'));
  },
};

// ══ MASTERY — Chef's Friend ═══════════════════════════════════════════

/**
 * Two halves in one loop, because the enhancement genuinely is two things: a trade window in the
 * kitchen and a pet in the butcher form. The hole and the rat are the kit's own `ratHole` and
 * `ratBody`, driven off a record shaped like the kit's `RatState` so the mutation ramp, the feed
 * pips and the carried item all read the way they do in a match.
 */
export const masteryChefsFriend: PreviewScript = {
  duration: 26000,
  scale: 0.75,
  bodyTexture: '',
  caption: 'Mastery — a rat hole. Cooked food in, bread/cheese/pie out; in butcher form it comes out fighting',
  run(ctx) {
    const fx = fxOf(ctx);
    const me = { x: ctx.w * 0.24, y: ctx.h * 0.72 };
    const av = drivenCaster(ctx, () => ({ x: me.x, y: me.y, alpha: 1 }));
    const rig = chef(av);
    const foe = { x: ctx.w * 0.8, y: ctx.h * 0.52 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 56, '#c9a08a', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#e0a8a0', 10);

    const hole = { x: ctx.w * 0.5, y: 16 };
    const s = {
      inv: [cooked('potato'), cooked('carrot')] as Item[],
      butcher: 0,
      rat: {
        out: null as null | 'fetch' | 'roam',
        x: hole.x, y: hole.y + 17, ang: Math.PI / 2,
        mutate: 0, eyes: 1, feed: 0, carry: null as Item | null,
        tx: hole.x, ty: hole.y + 17, sic: false, dealt: 0,
      },
      swapUntil: -1,
      floorDrop: null as { x: number; y: number; item: Item } | null,
    };

    prepStrip(ctx, () => ({ inv: s.inv, held: null, heat: 0, hunger: s.butcher > 0.5 ? 24000 : undefined }));

    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta, elapsed) => {
      const t = elapsed / 1000;
      const dt = delta / 1000;
      ground.clear(); air.clear();
      const r = s.rat;

      r.mutate = Phaser.Math.Clamp(r.mutate + (r.out === 'roam' ? 1 : -1) * (delta / 500), 0, 1);
      r.eyes = Phaser.Math.Clamp(
        r.eyes + (r.out || s.swapUntil > elapsed ? -1 : 1) * (delta / 260), 0, 1);
      rig?.setButcher(s.butcher);
      rig?.setFed(s.inv.length / 6);

      const pending = s.swapUntil > elapsed
        ? Phaser.Math.Clamp((s.swapUntil - elapsed) / 1200, 0, 1) : 0;
      ratHole(ground, ctx.tint, hole.x, hole.y, 17, t, r.eyes, pending, 1);

      if (s.floorDrop) {
        ground.fillStyle(ctx.tint(0x000000), 0.3);
        ground.fillEllipse(s.floorDrop.x, s.floorDrop.y + 8, 22, 8);
        itemShape(ground, ctx.tint, s.floorDrop.x, s.floorDrop.y, s.floorDrop.item, 24, 1, t * 1.6);
      }

      if (r.out) {
        const d = Phaser.Math.Distance.Between(r.x, r.y, r.tx, r.ty);
        if (d > 1) {
          const a = Math.atan2(r.ty - r.y, r.tx - r.x);
          r.ang = a;
          const speed = (r.out === 'roam' ? 175 : 360) * (1 + r.feed * 0.15);
          const step = Math.min(d, speed * dt);
          r.x += Math.cos(a) * step;
          r.y += Math.sin(a) * step;
        }
        if (r.sic) {
          air.lineStyle(1.6, ctx.tint(GLT.ratEye), 0.35 + 0.25 * Math.sin(t * 9));
          air.strokeCircle(r.x, r.y, 16 + 3 * Math.sin(t * 6));
        }
        air.fillStyle(ctx.tint(0x000000), 0.28);
        air.fillEllipse(r.x, r.y + 8, 22 + r.mutate * 10, 7);
        ratBody(air, ctx.tint, r.x, r.y, r.ang, 22, r.mutate, r.feed / 4, t, 1);
        if (r.carry) {
          itemShape(air, ctx.tint, r.x - Math.cos(r.ang) * 14, r.y - Math.sin(r.ang) * 14 - 10,
            r.carry, 16, 1, t * 2);
        }
      }

      gauge.setText(r.out === 'roam'
        ? `slash ${Math.round(12 * (1 + r.feed * 0.25))}   ·   ${r.feed}/4 fed   ·   ${r.dealt} dealt`
        : s.swapUntil > elapsed ? 'something is happening down there'
          : r.out ? 'out on an errand' : 'two beady eyes, waiting for something cooked');
    });

    // ── The trade ──
    ctx.at(500, () => readout.setText('a hole in the wall at the top of the arena, and two beady eyes in it'));
    ctx.at(2400, () => {
      s.inv = s.inv.slice(1);
      s.swapUntil = 4000;
      ctx.capture(() => fx.crumbs(hole.x, hole.y + 14, FOOD.potato.cookedColor));
      float(ctx, hole.x, hole.y + 40, '🥔 TAKEN', hex(GLT.ratFur), 11);
      readout.setText('throw something **cooked** at it and the rat takes it. Raw is refused.');
    });
    ctx.at(4100, () => {
      s.floorDrop = { x: hole.x, y: hole.y + 56, item: raw('pie') };
      ctx.capture(() => fx.ring(hole.x, hole.y + 20, 6, 34, GLT.pieCrust, 460));
      float(ctx, hole.x, hole.y + 68, '🥧 PIE', hex(GLT.pieCrust), 12);
      readout.setText('bread 30/60, cheese 25/45, or a pie — 30/60 and +20% speed for 8 seconds');
    });
    ctx.at(6400, () => {
      s.rat.out = 'fetch';
      s.rat.x = hole.x; s.rat.y = hole.y + 17;
      s.rat.tx = s.floorDrop?.x ?? hole.x; s.rat.ty = s.floorDrop?.y ?? hole.y;
      float(ctx, hole.x, hole.y + 40, '🐀 FETCH', hex(GLT.ratFur), 11);
      readout.setText('the bound key is a whistle. In the kitchen it is a fetch: 360 px/s, straight at it.');
    });
    ctx.at(7600, () => {
      s.rat.carry = s.floorDrop?.item ?? null;
      s.floorDrop = null;
      s.rat.tx = me.x; s.rat.ty = me.y;
    });
    ctx.at(9200, () => {
      s.inv = [...s.inv, raw('pie')];
      s.rat.carry = null;
      s.rat.tx = hole.x; s.rat.ty = hole.y + 17;
      float(ctx, me.x, me.y - 50, '🐀 🥧 PIE', hex(GLT.pieCrust), 12);
      readout.setText('and it goes straight onto the strip. 14 second cooldown, and it never wastes a cast.');
    });
    ctx.at(10800, () => { s.rat.out = null; });

    // ── The butcher's rat ──
    ctx.at(11600, () => {
      s.butcher = 1;
      s.rat.out = 'roam';
      s.rat.x = hole.x; s.rat.y = hole.y + 17;
      s.rat.tx = foe.x; s.rat.ty = foe.y;
      ctx.capture(() => {
        fx.ring(hole.x, hole.y + 17, 8, 52, GLT.ratMutant, 560);
        fx.splat(hole.x, hole.y + 17, 20, GLT.ratMutantDark);
      });
      float(ctx, hole.x, hole.y + 46, '🐀 IT COMES OUT', hex(GLT.ratMutant), 12);
      readout.setText('put the whites down and the hole is not big enough for what comes out of it');
    });
    const slash = (at: number, mult: number, note?: string): void => ctx.at(at, () => {
      const r = s.rat;
      const dmg = Math.round(12 * (1 + r.feed * 0.25) * mult);
      r.dealt += dmg;
      r.sic = false;
      ctx.capture(() => {
        fx.slashArc(r.x, r.y, Math.atan2(foe.y - r.y, foe.x - r.x), 46, GLT.ratEye);
        fx.splat(foe.x, foe.y, 16, GLT.blood);
      });
      float(ctx, foe.x, foe.y - 26, `${dmg}`, '#ffb3aa', mult > 1 ? 18 : 14);
      if (mult > 1) float(ctx, foe.x, foe.y - 46, '🐀 SIC', hex(GLT.ratEye), 11);
      if (note) readout.setText(note);
    });
    slash(14000, 1, '12 a slash, about once a second, and it does not need you to aim it');
    slash(15200, 1);
    ctx.at(16400, () => {
      s.inv = s.inv.slice(1);
      s.rat.feed = 2;
      ctx.capture(() => fx.ring(s.rat.x, s.rat.y, 8, 40, GLT.ratMutant, 460));
      float(ctx, s.rat.x, s.rat.y - 32, '🐀 FED 2/4', hex(GLT.stewLit), 12);
      readout.setText('throw food at the rat instead and it eats it: +25% damage and +15% speed a mouthful');
    });
    slash(17800, 1, 'four feeds is 24 a slash every 0.7 seconds — and it is still collecting your drops');
    ctx.at(19000, () => {
      s.rat.feed = 4;
      s.rat.sic = true;
      float(ctx, s.rat.x, s.rat.y - 34, '🐀 SIC', hex(GLT.ratEye), 12);
      readout.setText('in butcher form the whistle stops being a fetch and becomes a sic');
    });
    slash(20200, 2, 'the next slash it lands is doubled');
    ctx.at(21600, () => {
      s.butcher = 0;
      float(ctx, me.x, me.y - 52, '👨‍🍳 BACK TO THE KITCHEN', hex(GLT.white), 11);
      readout.setText('and this is what feeding it really bought: butcher form ends, and it stays');
    });
    slash(22800, 1, 'every mouthful is 12 more seconds out. A fed rat outlives the transformation.');
    ctx.at(24200, () => {
      s.rat.out = 'fetch';
      s.rat.tx = hole.x; s.rat.ty = hole.y + 17;
      readout.setText('then it walks back to the hole, and the eyes are there again');
    });
  },
};
