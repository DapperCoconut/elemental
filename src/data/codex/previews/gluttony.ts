import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  FOOD, FoodKind, GLT, GluttonyAvatar, GluttonyFx,
  charcoalLump, cookRing, foodHeal, foodShape, gobbet as drawGobbet, grillHeat, grillRig,
  hungerBar, kitchenKnife, mawBody, mawTentacle, prepSlot, skewerShape, spatter, stewPot,
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
interface Cook { kind: FoodKind; progress: number; slot: number; seed: number }
interface Item { kind: FoodKind; cooked: boolean }

const SLOT_OFFSETS: Array<[number, number]> = [[-17, -7], [17, -7], [-17, 8], [17, 8]];
const GRILL_R = 30;

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
    maw?: { gape: number; rage: number; awake: boolean };
  },
): void {
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  ctx.onFrame((_delta, elapsed) => {
    const s = read();
    const t = elapsed / 1000;
    ground.clear(); air.clear();
    if (s.maw) {
      const arms = s.maw.awake ? 7 : 4;
      for (let i = 0; i < arms; i++) {
        const a = (i / arms) * Math.PI * 2 + t * 0.35;
        mawTentacle(ground, ctx.tint, s.x + Math.cos(a) * GRILL_R * 0.8, s.y + Math.sin(a) * GRILL_R * 0.5,
          a, GRILL_R * (1.5 + s.maw.rage * 1.5), t, i * 3.1, 4.4 + s.maw.rage * 2, 0.95, s.maw.rage);
      }
      mawBody(ground, ctx.tint, s.x, s.y, GRILL_R, t, s.maw.gape, s.maw.rage, 1);
      return;
    }
    grillRig(ground, ctx.tint, s.x, s.y, GRILL_R, t, s.superheat, 1);
    grillHeat(air, ctx.tint, s.x, s.y, GRILL_R, t, s.superheat, 1);
    for (const c of s.cooking) {
      const [ox, oy] = SLOT_OFFSETS[c.slot % SLOT_OFFSETS.length];
      const full = FOOD[c.kind].cookMs;
      const done = c.progress >= full;
      const bob = Math.sin(t * 3 + c.seed) * 1.4;
      foodShape(air, ctx.tint, s.x + ox, s.y + oy + bob, c.kind, done, 21, 1, t * 2 + c.seed);
      cookRing(air, ctx.tint, s.x + ox, s.y + oy + bob, 15, c.progress / full, 0.9, done);
    }
  });
}

/** The prep strip and the knife tile, exactly as the kit lays them out. */
function prepStrip(
  ctx: PreviewCtx,
  read: () => { inv: Item[]; held: Item | null; heat: number; hunger?: number },
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
      foodShape(g, ctx.tint, x + S / 2, Y + S / 2, item.kind, item.cooked, S * 0.72, 1, t * 1.4 + i);
      if (item.cooked) {
        g.fillStyle(ctx.tint(0x7ada6a), 0.95);
        g.fillCircle(x + S - 5, Y + 5, 2.6);
      }
    }
    prepSlot(g, ctx.tint, KX, Y, S, s.held === null, false, 1);
    kitchenKnife(g, ctx.tint, KX + S / 2 - 3, Y + S / 2, -0.5, 20, s.heat, 1);
    if (s.heat > 0 && s.heat < 1) {
      g.fillStyle(ctx.tint(GLT.char), 0.85);
      g.fillRect(KX + 3, Y + S - 6, S - 6, 3);
      g.fillStyle(ctx.tint(GLT.heat), 1);
      g.fillRect(KX + 3, Y + S - 6, (S - 6) * s.heat, 3);
    }
    if (s.hunger !== undefined) {
      hungerBar(g, ctx.tint, X, Y + S + 6, W + S + 10, 13, Phaser.Math.Clamp(s.hunger / 30000, 0, 1), t, 1);
    }
  });
}

const cooked = (kind: FoodKind): Item => ({ kind, cooked: true });
const raw = (kind: FoodKind): Item => ({ kind, cooked: false });

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
      const ms = 3000 + s.inv.reduce((n, it) => n + ({ meat: 10000, potato: 5000, mushroom: 3000, carrot: 1000 })[it.kind], 0);
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
