import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  CREATION, CREATION_TIER_COLORS, CreationAvatar, CreationFx, CreationNexus, CreationMechRig,
  MechArmKind, blueprintFrame, drawAutomaton, drawBolt, drawDagger, drawFlask, drawNail,
  drawSaw, drawSpeedPad, drawSpikedPanel, drawWrench, plankPanel,
} from '../../../elements/kits/CreationVisuals';
import { CREATION_POTIONS, CreationPotionKind } from '../../../elements/kits/CreationKit';

/**
 * Creation's showcases.
 *
 * Creation puts more standing furniture in the arena than any other element — the Nexus, walls,
 * pads, spike blocks, crates, a piloted mech — and all of it is drawn by `CreationVisuals`
 * classes and statics that the kit repaints from its own state. These loops drive the same
 * ones: `CreationNexus` and `CreationMechRig` are the real rigs, and every wall here is a
 * `plankPanel` at the size the kit would have built.
 *
 * `ctx.at`/`ctx.onFrame` callbacks run outside the harness's capture window, so anything that
 * builds a display object inside one goes through `ctx.capture`/`ctx.adopt` by hand.
 */

interface Mark { x: number; y: number }

function stage(
  ctx: PreviewCtx, opts?: { noDummy?: boolean },
): { fx: CreationFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new CreationFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new CreationAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

function movingDummy(ctx: PreviewCtx, m: Mark): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1);
    g.fillCircle(m.x, m.y, 17);
    g.fillStyle(0x3c4254, 1);
    g.fillCircle(m.x, m.y, 13);
    g.fillStyle(0x8e97ad, 0.9);
    g.fillCircle(m.x - 5, m.y - 4, 3.2);
    g.fillCircle(m.x + 5, m.y - 4, 3.2);
    g.fillStyle(0x11131b, 1);
    g.fillCircle(m.x - 5.6, m.y - 4, 1.6);
    g.fillCircle(m.x + 4.4, m.y - 4, 1.6);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(14));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: '11px', fontFamily: 'Arial', color,
  }).setOrigin(0.5).setDepth(14));
}

/** The real Nexus rig, driven exactly as the kit drives it. */
function nexus(
  ctx: PreviewCtx,
  o: { x: number; y: number; load: () => number; brewing: () => boolean; awakened?: () => boolean },
): CreationNexus {
  const rig = ctx.capture(() => new CreationNexus(ctx.scene, ctx.tint, o.x, o.y, 3));
  const cap = ctx.adopt(ctx.scene.add.text(o.x, o.y + 52, 'Nexus', {
    fontSize: '11px', fontFamily: 'Arial', color: '#ff99cc',
  }).setOrigin(0.5).setDepth(4));
  void cap;
  ctx.onFrame((dt) => {
    rig.setBrewing(o.brewing());
    rig.setLoad(o.load());
    rig.setAwakened(o.awakened?.() ?? false);
    ctx.capture(() => rig.update(dt));
  });
  return rig;
}

/** A brewed bottle resting on the pedestal, bobbing the way the kit bobs it. */
function flask(ctx: PreviewCtx, o: { x: number; y: number; kind: CreationPotionKind; born: number; until?: () => number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    if (elapsed < o.born || elapsed > (o.until?.() ?? Infinity)) return;
    const t = (elapsed - o.born) / 1000;
    drawFlask(g, ctx.tint, CREATION_POTIONS[o.kind].color, t);
    g.setPosition(o.x, o.y + Math.sin(t * 2.2) * 4);
  });
}

/** A Create block: real plank panel, real health bar. */
function wall(
  ctx: PreviewCtx,
  o: { x: number; y: number; w: number; h: number; born: number; hp?: () => number; steel?: boolean },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
  ctx.onFrame((_dt, elapsed) => {
    g.clear(); bar.clear();
    if (elapsed < o.born) return;
    plankPanel(g, ctx.tint, o.w, o.h, 0.92, { steel: o.steel });
    g.setPosition(o.x, o.y);
    const frac = Phaser.Math.Clamp(o.hp?.() ?? 1, 0, 1);
    bar.fillStyle(0x333333, 1);
    bar.fillRect(o.x - o.w / 2, o.y - o.h / 2 - 8, o.w, 4);
    bar.fillStyle(ctx.tint(CREATION.tan), 1);
    bar.fillRect(o.x - o.w / 2, o.y - o.h / 2 - 8, o.w * frac, 4);
  });
}

// ══ CLICK — Dagger Spray ══════════════════════════════════════════════

/** A fan of daggers: real `drawDagger` blades, converging on the cursor then flying past. */
function daggerFan(
  ctx: PreviewCtx,
  o: { count: number; born: number; tx: number; ty: number; onHit?: (x: number, y: number) => void; onPass?: (d: { x: number; y: number; vx: number; vy: number }) => void },
): void {
  const base = Math.atan2(o.ty - ctx.cy, o.tx - ctx.cx);
  for (let i = 0; i < o.count; i++) {
    const a0 = base + (i - (o.count - 1) / 2) * Phaser.Math.DegToRad(30);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    drawDagger(g, ctx.tint);
    g.setPosition(ctx.cx, ctx.cy).setRotation(a0).setVisible(false);
    const d = { x: ctx.cx, y: ctx.cy, vx: Math.cos(a0) * 620, vy: Math.sin(a0) * 620 };
    let converged = false;
    let hit = false;
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < o.born) return;
      g.setVisible(true);
      if (!converged) {
        // Turn-rate limited steering at 7 rad/s, exactly as the kit steers them.
        const desired = Math.atan2(o.ty - d.y, o.tx - d.x);
        const cur = Math.atan2(d.vy, d.vx);
        const maxTurn = 7 * (dt / 1000);
        const na = cur + Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(desired - cur), -maxTurn, maxTurn);
        d.vx = Math.cos(na) * 620;
        d.vy = Math.sin(na) * 620;
        g.setRotation(na);
        if (Phaser.Math.Distance.Between(d.x, d.y, o.tx, o.ty) < 26) converged = true;
      }
      d.x += d.vx * (dt / 1000);
      d.y += d.vy * (dt / 1000);
      g.setPosition(d.x, d.y);
      o.onPass?.(d);
      if (!hit && o.onHit && Phaser.Math.Distance.Between(d.x, d.y, o.tx, o.ty) <= 20) {
        hit = true;
        o.onHit(d.x, d.y);
      }
    });
  }
}

export const daggerSpray: PreviewScript = {
  duration: 6400,
  caption: 'Click — hold for up to 5 blades (8 each), all curving onto the cursor and piercing past',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    movingDummy(ctx, mark);
    const count = label(ctx, ctx.cx, ctx.cy - 50, '#ffcc66');

    // 2.4 seconds of hold is the full fan: 1 blade, then one more every 0.6s.
    av.setHold('draw', ctx.aim);
    for (let i = 1; i <= 5; i++) {
      ctx.at(i === 1 ? 200 : 200 + (i - 1) * 600, () => {
        count.setText(`${i} / 5 blades`);
        fx.sparks(ctx.cx + 20, ctx.cy, 3, { speed: 100, size: 1.8, life: 300, depth: 6 });
      });
    }
    ctx.at(2800, () => {
      av.setHold(null);
      av.play('sweep', ctx.aim, 450);
      count.setText('');
      fx.sparks(ctx.cx + 20, ctx.cy, 8, { angle: ctx.aim, spread: 0.7, speed: 180, size: 2, life: 320, depth: 6 });
      daggerFan(ctx, {
        count: 5, born: 2800, tx: mark.x, ty: mark.y,
        onHit: (x, y) => {
          fx.sparks(x, y, 5, { spread: 0.9, speed: 160, size: 2, life: 340, depth: 7 });
          float(ctx, mark.x + (Math.random() - 0.5) * 26, mark.y - 26, '8', '#ffb3aa');
        },
      });
    });
    ctx.at(3500, () => float(ctx, mark.x, mark.y - 46, '40 total', '#ffcc66'));
    ctx.at(4200, () => float(ctx, mark.x + 90, mark.y - 20, 'they keep going', '#ffe98a'));
  },
};

export const daggerSprayUpgraded: PreviewScript = {
  duration: 6000,
  caption: 'Blade Split — a blade through your wall halves it, and both halves keep the full HP',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const wx = ctx.cx + 190, wy = ctx.cy;
    const hp = label(ctx, wx, wy - 74, '#ffcc66');

    let split = false;
    wall(ctx, { x: wx, y: wy, w: 60, h: 110, born: 0, hp: () => (split ? 0 : 1) });
    ctx.at(200, () => hp.setText('125 HP'));

    ctx.at(1400, () => {
      av.play('sweep', ctx.aim, 450);
      daggerFan(ctx, {
        count: 1, born: 1400, tx: ctx.tx + 120, ty: ctx.ty,
        onPass: (d) => {
          if (split) return;
          if (Math.abs(d.x - wx) > 30 + 20 || Math.abs(d.y - wy) > 55 + 20) return;
          split = true;
          // The cut, then the two halves standing up with the original's health each.
          fx.sparks(wx, wy, 10, { angle: 0, spread: 0.5, speed: 200, size: 2.2, life: 420, depth: 7 });
          hp.setText('');
          wall(ctx, { x: wx, y: wy - 55 / 2 - 6, w: 60, h: 55, born: 0, hp: () => 1 });
          wall(ctx, { x: wx, y: wy + 55 / 2 + 6, w: 60, h: 55, born: 0, hp: () => 1 });
          float(ctx, wx - 40, wy - 44, '125 HP', '#ffcc66');
          float(ctx, wx + 40, wy + 44, '125 HP', '#ffcc66');
          float(ctx, wx, wy - 74, 'CUT', '#ffee99');
        },
      });
    });
    ctx.at(3200, () => float(ctx, wx, wy - 80, 'one cut per blade per block', '#ffe98a'));
  },
};

// ══ E — Charged Bolt ══════════════════════════════════════════════════

/** A bolt in flight at the kit's 380 px/s, in the metal it was forged from. */
function bolt(
  ctx: PreviewCtx,
  o: { tier: 'copper' | 'silver' | 'gold'; born: number; to: Mark; onArrive?: () => void },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
  drawBolt(g, ctx.tint, o.tier);
  const a = Math.atan2(o.to.y - ctx.cy, o.to.x - ctx.cx);
  g.setRotation(a).setVisible(false);
  const dist = Math.hypot(o.to.x - ctx.cx, o.to.y - ctx.cy) - 24;
  let done = false;
  ctx.onFrame((_dt, elapsed) => {
    if (elapsed < o.born || done) return;
    const travelled = 380 * ((elapsed - o.born) / 1000);
    g.setVisible(true).setPosition(ctx.cx + 24 + Math.cos(a) * travelled, ctx.cy + Math.sin(a) * travelled);
    if (travelled >= dist) {
      done = true;
      g.setVisible(false);
      o.onArrive?.();
    }
  });
}

export const chargedBolt: PreviewScript = {
  duration: 7600,
  caption: 'E — copper 5, silver 10, gold 15 — and two of them in the Nexus is a 5s brew',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const nx = ctx.cx + 210, ny = ctx.cy - 4;
    let load = 0;
    let brewing = false;
    nexus(ctx, { x: nx, y: ny, load: () => load, brewing: () => brewing });
    const tier = label(ctx, ctx.cx, ctx.cy - 56, '#ffcc66');

    // Two charges: silver at 0.5s, silver again — SS is the Heal recipe.
    const fire = (at: number, hold: number, t: 'copper' | 'silver' | 'gold'): void => {
      ctx.at(at, () => {
        av.setHold('charge');
        tier.setText(`forging ${t}`);
      });
      ctx.at(at + hold, () => {
        av.setHold(null);
        av.play('punch', ctx.aim);
        tier.setText('');
        fx.muzzleFlash(ctx.cx + 22, ctx.cy, ctx.aim, t === 'gold' ? 1.5 : t === 'silver' ? 1.2 : 1);
        bolt(ctx, {
          tier: t, born: at + hold, to: { x: nx, y: ny },
          onArrive: () => {
            load++;
            fx.gearPulse(nx, ny, 22, 340, CREATION.brass, 6);
            fx.sparks(nx - 12 + (load - 1) * 24, ny - 46, 5, { speed: 80, size: 2, life: 400, depth: 6 });
            float(ctx, nx, ny - 60, `${t} loaded`, `#${CREATION_TIER_COLORS[t].toString(16).padStart(6, '0')}`);
            if (load === 2) {
              brewing = true;
              fx.channelCharge(nx, ny, 46, 5000, undefined, 6);
              float(ctx, nx, ny - 74, 'BREWING 5s', '#ff88cc');
            }
          },
        });
      });
    };
    fire(300, 600, 'silver');
    fire(1600, 600, 'silver');

    // Five seconds later, a bottle. SS is Heal.
    ctx.at(2200 + 600 + 5000 - 2400, () => { /* keeps the loop honest about the wait */ });
    ctx.at(6000, () => {
      brewing = false;
      load = 0;
      fx.gearPulse(nx, ny, 40, 520, CREATION.nexusLit, 8);
      flask(ctx, { x: nx, y: ny - 40, kind: 'heal', born: 6000 });
      float(ctx, nx, ny - 74, '💚 HEAL POTION', '#33dd66');
      float(ctx, nx, ny - 92, 'walk over to drink', '#ffe98a');
    });
  },
};

export const chargedBoltUpgraded: PreviewScript = {
  duration: 6400,
  caption: 'Electro Bolt — hold 3s and the release fires nothing: the Nexus re-brews the last recipe',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const nx = ctx.cx + 210, ny = ctx.cy - 4;
    nexus(ctx, { x: nx, y: ny, load: () => 0, brewing: () => false });
    const tier = label(ctx, ctx.cx, ctx.cy - 56, '#44ddff');

    ctx.at(300, () => { av.setHold('charge'); });
    // The four thresholds: copper, silver at 0.5s, gold at 1s, electro at 3s.
    ctx.at(300, () => tier.setText('copper'));
    ctx.at(800, () => { tier.setText('silver'); fx.hammerStrike(ctx.cx, ctx.cy - 40, -Math.PI / 2, 0.92); });
    ctx.at(1300, () => { tier.setText('gold'); fx.hammerStrike(ctx.cx, ctx.cy - 40, -Math.PI / 2, 1.04); });
    ctx.at(3300, () => { tier.setText('⚡ ELECTRO'); fx.hammerStrike(ctx.cx, ctx.cy - 40, -Math.PI / 2, 1.16); });

    ctx.at(4000, () => {
      av.setHold(null);
      av.play('clap');
      tier.setText('');
      fx.ring(ctx.cx, ctx.cy, 10, 90, CREATION.nexusLit, 380, 5, 15);
      fx.gearPulse(nx, ny, 40, 520, CREATION.nexusLit, 8);
      fx.sparks(ctx.cx, ctx.cy, 14, { speed: 220, size: 2.4, life: 480, depth: 15 });
      float(ctx, ctx.cx, ctx.cy - 40, 'ELECTRO!', '#44ddff');
      // Both shelf slots — the second one is this upgrade's other half.
      flask(ctx, { x: nx - 16, y: ny - 40, kind: 'buff', born: 4000 });
      flask(ctx, { x: nx + 16, y: ny - 40, kind: 'buff', born: 4300 });
      float(ctx, nx, ny - 74, 'no bolt · no 5s wait', '#ffe98a');
    });
    ctx.at(5000, () => float(ctx, nx, ny - 90, '2 potions on the shelf', '#ff88cc'));
  },
};

// ══ R — Wrench in your Plans ══════════════════════════════════════════

export const wrenchPlans: PreviewScript = {
  duration: 6200,
  caption: 'R — 20 on impact, then 5 seconds where every ability they use costs them 5 HP',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    movingDummy(ctx, mark);

    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    drawWrench(g, ctx.tint);
    g.setVisible(false);
    const throwAt = 500;
    const dist = Math.hypot(mark.x - ctx.cx, mark.y - ctx.cy) - 24;
    let landed = false;
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < throwAt || landed) return;
      const d = 640 * ((elapsed - throwAt) / 1000);
      g.setVisible(true).setPosition(ctx.cx + 24 + d, ctx.cy).setRotation(elapsed / 40);
      if (d >= dist) {
        landed = true;
        g.setVisible(false);
        fx.sparks(mark.x, mark.y, 8, { speed: 200, size: 2.2, life: 380, depth: 7 });
        float(ctx, mark.x, mark.y - 26, '20', '#ffb3aa');
        float(ctx, mark.x, mark.y - 46, '🔧 WRENCHED', '#cc6622');
      }
    });
    ctx.at(throwAt, () => {
      av.play('slam', ctx.aim);
      fx.sparks(ctx.cx + 24, ctx.cy, 7, { angle: ctx.aim, spread: 0.8, speed: 200, size: 2.2, life: 380, depth: 7 });
    });

    // Three casts inside the 5s window, each one grinding against the spanner.
    for (const [i, at] of [2200, 3300, 4400].entries()) {
      ctx.at(at, () => {
        fx.gearPulse(mark.x, mark.y, 26, 380, CREATION.rust, 9);
        fx.sparks(mark.x, mark.y, 8, { speed: 170, size: 2.2, life: 420, depth: 9 });
        float(ctx, mark.x, mark.y - 30, '−5 (cast)', '#ffb3aa');
        if (i === 2) float(ctx, mark.x, mark.y - 50, 'no cap on how often', '#ffe98a');
      });
    }
  },
};

export const wrenchPlansUpgraded: PreviewScript = {
  duration: 8200,
  caption: 'Nexus Awakening — put a wrench through the charged core and pilot what stands up',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const nx = ctx.cx + 190, ny = ctx.cy;
    let alive = true;
    nexus(ctx, { x: nx, y: ny, load: () => 0, brewing: () => false, awakened: () => alive });
    // Two bottles parked on the shelf become the two arms.
    flask(ctx, { x: nx - 16, y: ny - 40, kind: 'buff', born: 0, until: () => 2000 });
    flask(ctx, { x: nx + 16, y: ny - 40, kind: 'protection', born: 0, until: () => 2000 });
    ctx.at(400, () => float(ctx, nx, ny - 74, 'charged core', '#ff3355'));

    // The wrench.
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    drawWrench(g, ctx.tint);
    g.setVisible(false);
    const throwAt = 1200;
    let hit = false;
    ctx.onFrame((_dt, elapsed) => {
      if (elapsed < throwAt || hit) return;
      const d = 640 * ((elapsed - throwAt) / 1000);
      g.setVisible(true).setPosition(ctx.cx + 24 + d, ctx.cy).setRotation(elapsed / 40);
      if (d >= nx - ctx.cx - 24) { hit = true; g.setVisible(false); }
    });
    ctx.at(throwAt, () => av.play('slam', ctx.aim));

    // The machine tears itself apart and stands up.
    const mechAt = 2000;
    const mech: Mark = { x: nx, y: ny };
    let mounted = false;
    let hp = 1;
    ctx.at(mechAt, () => {
      alive = false;
      fx.explosion(nx, ny, 78, { shards: 16, smoke: 3, core: CREATION.rust, debris: false });
      fx.gearPulse(nx, ny, 70, 760, CREATION.ember, 8);
      fx.ring(nx, ny, 12, 120, CREATION.spark, 620, 6, 8);
      float(ctx, nx, ny - 70, '⚙️ NEXUS AWAKENS', '#ffaa44');
      const rig = ctx.capture(() => new CreationMechRig(ctx.scene, ctx.tint, 5));
      const kinds: MechArmKind[] = ['chainsaw', 'shield'];
      kinds.forEach((k, i) => { rig.arm(i as 0 | 1).kind = k; });
      rig.setAim(ctx.aim);
      ctx.onFrame((dt) => {
        rig.setMounted(mounted);
        ctx.capture(() => rig.update(dt, mech.x, mech.y, 1, mounted ? 40 : 0));
      });
      // The health bar under it, and the board prompt over it.
      const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
      ctx.onFrame(() => {
        bar.clear();
        bar.fillStyle(0x221108, 0.85);
        bar.fillRect(mech.x - 30, mech.y + 55, 60, 6);
        bar.fillStyle(ctx.tint(CREATION.brass), 0.95);
        bar.fillRect(mech.x - 30, mech.y + 55, 60 * hp, 6);
      });
      const prompt = ctx.adopt(ctx.scene.add.text(mech.x, mech.y - 62, '[R] BOARD', {
        fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ffcc66', stroke: '#2a1206', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(16));
      ctx.at(1200, () => prompt.setVisible(false));
    });
    ctx.at(mechAt + 300, () => float(ctx, nx + 34, ny - 18, '🪚 CHAINSAW ARM', '#ffaa44'));
    ctx.at(mechAt + 520, () => float(ctx, nx - 34, ny - 18, '🛡️ SHIELD ARM', '#66aaff'));

    // Climbing in.
    ctx.at(mechAt + 1200, () => {
      mounted = true;
      av.play('flex');
      fx.gearPulse(ctx.cx, ctx.cy, 46, 620, CREATION.brass, 7);
      fx.ring(ctx.cx, ctx.cy, 10, 90, CREATION.spark, 460, 5, 7);
      float(ctx, ctx.cx, ctx.cy - 56, '🤖 MECH ONLINE', '#ffaa44');
    });
    ctx.at(mechAt + 2000, () => { hp = 0.7; float(ctx, mech.x, mech.y - 58, 'it takes the hits', '#ffcc66'); });
    ctx.at(mechAt + 2900, () => { hp = 0.55; float(ctx, mech.x, mech.y - 58, 'BLOCKED', '#66aaff'); });
    ctx.at(mechAt + 3700, () => float(ctx, ctx.cx, ctx.cy - 44, '75% move speed', '#ff9c9c'));
  },
};

// ══ F — Create ════════════════════════════════════════════════════════

export const createBlock: PreviewScript = {
  duration: 6400,
  caption: 'F — drag out a wall up to 200×200 with 125 HP that eats their shots and passes yours',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx + 70, y: ctx.ty };
    movingDummy(ctx, mark);
    const wx = ctx.cx + 150, wy = ctx.cy;
    const ww = 56, wh = 120;

    // The drafting frame being dragged out.
    const frame = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
    ctx.onFrame((_dt, elapsed) => {
      frame.clear();
      if (elapsed < 400 || elapsed > 1600) return;
      const p = Phaser.Math.Clamp((elapsed - 400) / 1200, 0, 1);
      frame.setPosition(wx, wy);
      blueprintFrame(frame, ctx.tint, ww * p, wh * p, 1, elapsed / 40);
      av.setHold('sow', ctx.aim);
    });

    let hp = 1;
    ctx.at(1600, () => {
      av.setHold(null);
      av.play('clap', ctx.aim);
      fx.assemble(wx, wy, ww, wh);
      wall(ctx, { x: wx, y: wy, w: ww, h: wh, born: 1600, hp: () => hp });
      float(ctx, wx, wy - wh / 2 - 22, '125 HP', '#ffcc66');
    });

    // Their shot dies in it and takes health off the board; yours goes straight through.
    ctx.at(2600, () => {
      hp = 0.72;
      fx.sparks(wx - ww / 2, wy - 10, 4, { speed: 110, size: 2, life: 340, depth: 6 });
      float(ctx, wx, wy - wh / 2 - 22, 'their shot absorbed', '#bfe8ff');
    });
    ctx.at(3800, () => {
      daggerFan(ctx, {
        count: 1, born: 3800, tx: mark.x, ty: mark.y,
        onHit: () => float(ctx, mark.x, mark.y - 26, '8', '#ffb3aa'),
      });
      float(ctx, wx, wy + wh / 2 + 18, 'yours pass through', '#a6f0c2');
    });
    ctx.at(5000, () => float(ctx, wx, wy - wh / 2 - 34, 'and it blocks movement', '#d4c6ff'));
  },
};

export const createBlockUpgraded: PreviewScript = {
  duration: 8600,
  caption: 'Build Mode — a second five-key loadout: build, pad, spike, then throw all of it at them',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx + 90, y: ctx.ty };
    movingDummy(ctx, mark);
    const bar = label(ctx, ctx.w / 2, 18, '#bb88ff');

    ctx.at(300, () => {
      av.play('flex');
      fx.gearPulse(ctx.cx, ctx.cy, 34, 520, CREATION.gold, 7);
      float(ctx, ctx.cx, ctx.cy - 40, 'Build Mode ON', '#bb88ff');
      bar.setText('Click build · E launch · R pad · F exit · Q spike');
    });

    // One of each, built where the kit would build them.
    const wx = ctx.cx + 130, wy = ctx.cy - 30;
    const px = ctx.cx + 120, py = ctx.cy + 52;
    const sx = ctx.cx + 210, sy = ctx.cy + 10;
    const launched = { on: false };
    ctx.at(1000, () => {
      fx.assemble(wx, wy, 54, 90);
      wall(ctx, { x: wx, y: wy, w: 54, h: 90, born: 1000, hp: () => 1 });
      float(ctx, wx, wy - 60, 'WALL 125', '#ffcc66');
    });
    ctx.at(1900, () => {
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
      drawSpeedPad(g, ctx.tint, 60, 20);
      g.setPosition(px, py);
      ctx.onFrame(() => { if (launched.on) g.x += 0; });
      fx.assemble(px, py, 60, 20, 300);
      fx.hammerStrike(px, py, Math.PI / 2, 1);
      float(ctx, px, py - 26, 'SPEED PAD +25%', '#44aaff');
    });
    ctx.at(2800, () => {
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
      drawSpikedPanel(g, ctx.tint, 50, 50, false, false);
      g.setPosition(sx, sy);
      fx.assemble(sx, sy, 50, 50, 340);
      fx.shrapnel(sx, sy, 8, 30, 5);
      float(ctx, sx, sy - 38, 'SPIKE BLOCK', '#cc2222');
    });
    ctx.at(3600, () => float(ctx, sx, sy + 38, '5 dmg / 0.3s', '#ffcf9a'));

    // E: chevrons for 1.5s, then the whole workshop flies at the cursor.
    ctx.at(4400, () => {
      av.play('sweep', ctx.aim, 1500);
      for (const p of [{ x: wx, y: wy }, { x: px, y: py }, { x: sx, y: sy }]) {
        fx.launchMarker(p.x, p.y, Math.atan2(mark.y - p.y, mark.x - p.x), 1500);
      }
      float(ctx, ctx.cx, ctx.cy - 44, 'LAUNCH — 1.5s', '#ffcc66');
    });
    ctx.at(5900, () => {
      launched.on = true;
      float(ctx, mark.x, mark.y - 30, '20', '#ffb3aa');
      float(ctx, mark.x - 24, mark.y - 48, '12 + slow', '#ffb3aa');
      float(ctx, mark.x + 24, mark.y - 64, '25', '#ffb3aa');
      fx.shrapnel(mark.x, mark.y, 12, 34, 7);
      fx.explosion(mark.x, mark.y, 60, { shards: 10, smoke: 2, core: CREATION.tan });
    });
    ctx.at(7200, () => float(ctx, ctx.cx, ctx.cy - 44, 'no Create, no bolts, no Q', '#ff9c9c'));
  },
};

// ══ Q — Workshop ══════════════════════════════════════════════════════

/** The boarded floor the Workshop lays over the whole arena. */
function workshopFloor(ctx: PreviewCtx, on: () => boolean): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(0));
  ctx.onFrame(() => {
    g.clear();
    if (!on()) return;
    plankPanel(g, ctx.tint, ctx.w, ctx.h, 0.34, { boardH: 46, frame: 6 });
    g.setPosition(ctx.w / 2, ctx.h / 2);
  });
}

export const workshop: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Q — 30 seconds of your own shop floor: +25% speed and you walk over your own walls',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    movingDummy(ctx, mark);
    let on = false;
    workshopFloor(ctx, () => on);

    const wx = ctx.cx + 150, wy = ctx.cy;
    wall(ctx, { x: wx, y: wy, w: 40, h: 100, born: 0, hp: () => 1 });

    ctx.at(700, () => {
      on = true;
      av.play('raise');
      fx.hammerStrike(ctx.cx, ctx.cy + 18, Math.PI / 2, 1.6);
      fx.ring(ctx.cx, ctx.cy, 20, Math.max(ctx.w, ctx.h) * 0.75, CREATION.tan, 620, 8, 1);
      fx.sawdust(ctx.w / 2, ctx.h / 2, ctx.w, ctx.h, 40);
      fx.gearPulse(ctx.cx, ctx.cy, 60, 700, CREATION.gold, 5);
      float(ctx, ctx.cx, ctx.cy - 40, '🔨 WORKSHOP', '#d9a066');
    });
    ctx.at(1400, () => float(ctx, ctx.cx, ctx.cy - 44, '+25% SPEED', '#ffe98a'));
    // A footprint stamped every 70ms behind whoever owns the floor.
    ctx.onFrame((_dt, elapsed) => {
      if (!on || elapsed % 280 > 20) return;
      fx.sawdust(ctx.cx + 20, ctx.cy + 14, 24, 10, 3);
    });
    ctx.at(2600, () => float(ctx, wx, wy - 62, 'you walk through your own', '#a6f0c2'));
    ctx.at(4000, () => float(ctx, mark.x, mark.y - 34, 'theirs still stops them', '#ff9c9c'));
    ctx.at(5400, () => float(ctx, ctx.cx, ctx.cy - 44, '30s up, 45s cooldown', '#8a8ab0'));
  },
};

export const workshopUpgraded: PreviewScript = {
  duration: 8600,
  scale: 0.9,
  caption: 'Ultimate Invention — three sliders that make the workshop better and its timer shorter',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx + 60, y: ctx.ty };
    movingDummy(ctx, mark);
    let on = false;
    workshopFloor(ctx, () => on);

    // The panel: three sliders and the unstable timer, in the kit's own layout.
    const vals = [0, 0, 0];
    const panel = ctx.adopt(ctx.scene.add.graphics().setDepth(20));
    const names = ['Danger', 'Bias', 'Clutter'];
    const cols = [0xff5544, 0xffcc33, 0x88aaff];
    const texts = names.map((n, i) => ctx.adopt(ctx.scene.add.text(20, 60 + i * 34, n, {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffffff',
    }).setDepth(21).setVisible(false)));
    const timer = ctx.adopt(ctx.scene.add.text(20, 168, '', {
      fontSize: '16px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ff3333',
    }).setDepth(21));
    let left = 30000;
    ctx.onFrame((dt) => {
      panel.clear();
      if (!on) { timer.setText(''); return; }
      for (const t of texts) t.setVisible(true);
      for (let i = 0; i < 3; i++) {
        const y = 79 + i * 34;
        panel.fillStyle(0x222228, 0.9);
        panel.fillRect(20, y - 4, 160, 8);
        panel.fillStyle(cols[i], 0.9);
        panel.fillRect(20, y - 4, 160 * vals[i], 8);
        panel.fillStyle(0xffffff, 1);
        panel.fillRect(20 + 160 * vals[i] - 5, y - 9, 10, 18);
      }
      // Instability: 1 + 1.5× the sum of the three sliders.
      left -= dt * (1 + (vals[0] + vals[1] + vals[2]) * 1.5);
      timer.setText(`${Math.max(0, left / 1000).toFixed(1)}s`);
    });

    ctx.at(500, () => {
      on = true;
      av.play('raise');
      fx.sawdust(ctx.w / 2, ctx.h / 2, ctx.w, ctx.h, 40);
      float(ctx, ctx.cx, ctx.cy - 40, '🔨 WORKSHOP', '#d9a066');
    });
    ctx.at(1300, () => { vals[0] = 0.85; float(ctx, ctx.cx, ctx.cy - 44, 'DANGER ↑', '#ff5544'); });
    ctx.at(2600, () => { vals[1] = 0.8; float(ctx, ctx.cx, ctx.cy - 44, 'BIAS ↑ +60% dmg', '#ffcc33'); });
    ctx.at(4200, () => { vals[2] = 0.5; float(ctx, ctx.cx, ctx.cy - 44, 'CLUTTER ↑', '#88aaff'); });

    // Danger: a saw across the floor, then a nail volley.
    const saw = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    drawSaw(saw, ctx.tint, 22);
    saw.setVisible(false);
    let sawX = -24;
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 1700) return;
      saw.setVisible(true);
      sawX += 300 * (dt / 1000);
      if (sawX > ctx.w + 40) sawX = -24;
      saw.setPosition(sawX, ctx.cy + 46).setRotation(elapsed / 90);
    });
    ctx.at(2900, () => float(ctx, mark.x, mark.y + 40, '25 (saw)', '#ffb3aa'));
    ctx.at(5000, () => {
      for (let i = 0; i < 5; i++) {
        const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
        drawNail(g, ctx.tint);
        const a = Math.PI + (i - 2) * Phaser.Math.DegToRad(14);
        g.setRotation(a);
        const born = 5000;
        ctx.onFrame((_dt, elapsed) => {
          if (elapsed < born) return;
          const d = 380 * ((elapsed - born) / 1000);
          g.setPosition(ctx.w + 10 + Math.cos(a) * d, ctx.cy - 20 + Math.sin(a) * d);
        });
      }
      fx.muzzleFlash(ctx.w + 10, ctx.cy - 20, Math.PI, 1.2);
      float(ctx, mark.x, mark.y - 30, '10 × 5 (nails)', '#ffb3aa');
    });

    // Clutter: rings of 46px crates that stop their shots and never block you.
    ctx.at(4200, () => {
      for (let x = 24; x <= ctx.w - 24; x += 52) {
        for (const y of [24, ctx.h - 24]) {
          const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
          plankPanel(g, ctx.tint, 46, 46, 0.95, { boardH: 15 });
          g.setPosition(x, y);
        }
      }
    });
    ctx.at(6400, () => float(ctx, ctx.cx, ctx.cy - 44, 'timer burns 5.5× at max', '#ff3333'));
  },
};

// ══ PASSIVES ══════════════════════════════════════════════════════════

export const passiveNexus: PreviewScript = {
  duration: 7400,
  caption: 'Passive — the machine in the middle: 2 ingots in, a 5s brew, one bottle waiting on the shelf',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const nx = ctx.cx + 200, ny = ctx.cy - 4;
    let load = 0;
    let brewing = false;
    nexus(ctx, { x: nx, y: ny, load: () => load, brewing: () => brewing });

    const shoot = (at: number, tier: 'copper' | 'silver' | 'gold'): void => ctx.at(at, () => {
      av.play('punch', ctx.aim);
      fx.muzzleFlash(ctx.cx + 22, ctx.cy, ctx.aim, 1);
      bolt(ctx, {
        tier, born: at, to: { x: nx, y: ny },
        onArrive: () => {
          load++;
          fx.gearPulse(nx, ny, 22, 340, CREATION.brass, 6);
          float(ctx, nx, ny - 58, `${load} / 2`, '#ffaa44');
          if (load === 2) {
            brewing = true;
            fx.channelCharge(nx, ny, 46, 3000, undefined, 6);
            float(ctx, nx, ny - 74, 'BREWING', '#ff88cc');
          }
        },
      });
    });
    shoot(400, 'copper');
    shoot(1400, 'copper');

    ctx.at(4600, () => {
      brewing = false;
      load = 0;
      fx.gearPulse(nx, ny, 40, 520, CREATION.nexusLit, 8);
      flask(ctx, { x: nx, y: ny - 40, kind: 'buff', born: 4600 });
      float(ctx, nx, ny - 74, '⚔️ BUFF POTION', '#ff4466');
    });
    ctx.at(5600, () => float(ctx, nx, ny - 92, 'walk within 46px to drink', '#ffe98a'));
    ctx.at(6400, () => float(ctx, nx, ny - 74, 'mid-brew bolts bounce off', '#ff9c9c'));
  },
};

export const passiveBrews: PreviewScript = {
  duration: 7600,
  caption: 'Passive — the six recipes, and what two ingots of each pair of metals makes',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const rows: Array<[CreationPotionKind, string]> = [
      ['buff', 'copper + copper'],
      ['heal', 'silver + silver'],
      ['gold', 'gold + gold'],
      ['protection', 'copper + silver'],
      ['speed', 'copper + gold'],
      ['reload', 'gold + silver'],
    ];
    rows.forEach(([kind, recipe], i) => {
      const x = ctx.w * (0.16 + (i % 3) * 0.28);
      const y = ctx.cy - 34 + Math.floor(i / 3) * 74;
      const born = 300 + i * 500;
      flask(ctx, { x, y, kind, born });
      ctx.at(born, () => {
        fx.ring(x, y, 6, 30, CREATION_POTIONS[kind].color, 340, 3, 8);
        const t = ctx.adopt(ctx.scene.add.text(x, y + 26, `${CREATION_POTIONS[kind].emoji} ${recipe}`, {
          fontSize: '10px', fontFamily: 'Arial', color: '#cbd5e1',
        }).setOrigin(0.5).setDepth(12));
        void t;
      });
    });
    ctx.at(4200, () => float(ctx, ctx.w / 2, ctx.cy + 70, '20s each — Gold runs 90s', '#ffe98a'));
    ctx.at(5600, () => float(ctx, ctx.w / 2, ctx.cy + 70, 'Gold doubles everything after it', '#ffcc22'));
  },
};

// ══ PERK — Automaton ══════════════════════════════════════════════════

export const perkAutomaton: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Automaton — the Workshop winds up 3 bots for 10s: 12 damage a shoulder, twice a second',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx, y: ctx.ty };
    movingDummy(ctx, mark);
    let on = false;
    workshopFloor(ctx, () => on);

    ctx.at(500, () => {
      on = true;
      av.play('raise');
      fx.sawdust(ctx.w / 2, ctx.h / 2, ctx.w, ctx.h, 40);
      float(ctx, ctx.cx, ctx.cy - 40, '🔨 WORKSHOP', '#d9a066');
      // Three bots, wandering at 60 px/s and bouncing off the walls.
      for (let i = 0; i < 3; i++) {
        const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
        const a = Math.random() * Math.PI * 2;
        const bot = {
          x: 60 + Math.random() * (ctx.w - 120), y: 40 + Math.random() * (ctx.h - 80),
          vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, t: Math.random() * 6, next: 0,
        };
        fx.gearPulse(bot.x, bot.y, 20, 420, CREATION.brass, 6);
        ctx.onFrame((dt, elapsed) => {
          bot.t += dt / 1000;
          bot.x += bot.vx * (dt / 1000);
          bot.y += bot.vy * (dt / 1000);
          if (bot.x < 20 || bot.x > ctx.w - 20) { bot.vx *= -1; bot.x = Phaser.Math.Clamp(bot.x, 20, ctx.w - 20); }
          if (bot.y < 20 || bot.y > ctx.h - 20) { bot.vy *= -1; bot.y = Phaser.Math.Clamp(bot.y, 20, ctx.h - 20); }
          drawAutomaton(g, ctx.tint, bot.t);
          g.setPosition(bot.x, bot.y);
          if (elapsed >= bot.next && Phaser.Math.Distance.Between(bot.x, bot.y, mark.x, mark.y) < 24) {
            bot.next = elapsed + 500;
            float(ctx, mark.x, mark.y - 26, '12', '#ffb3aa');
            fx.sparks(bot.x, bot.y, 6, { speed: 150, size: 2.2, life: 380, depth: 6 });
          }
        });
      }
    });
    ctx.at(5800, () => float(ctx, ctx.cx, ctx.cy - 44, 'they wind down after 10s', '#8a8ab0'));
  },
};

// ══ MASTERY ═══════════════════════════════════════════════════════════

export const masterySpringboard: PreviewScript = {
  duration: 6600,
  caption: 'Springboard — every dash stamps a 25 HP pad; standing on one is +25% speed for 3s',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const me: Mark = { x: ctx.cx, y: ctx.cy };

    // Three dashes, three pads left along the retreat.
    const dash = (at: number, toX: number): void => ctx.at(at, () => {
      av.play('dash', ctx.aim);
      fx.sparks(me.x, me.y, 8, { speed: 150, size: 2.2, life: 400, depth: 5 });
      fx.dashTrail(me.x, me.y, toX, ctx.cy);
      const px = toX;
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
      drawSpeedPad(g, ctx.tint, 38, 14);
      g.setPosition(px, ctx.cy);
      const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
      ctx.onFrame((_dt, elapsed) => {
        const life = Phaser.Math.Clamp(1 - (elapsed - at) / 10000, 0, 1);
        bar.clear();
        bar.fillStyle(0x333333, 0.8);
        bar.fillRect(px - 19, ctx.cy - 13, 38, 4);
        bar.fillStyle(ctx.tint(CREATION.steel), 0.9);
        bar.fillRect(px - 19, ctx.cy - 13, 38 * life, 4);
        if (life <= 0) g.setVisible(false);
      });
      fx.hammerStrike(px, ctx.cy, Math.PI / 2, 0.85);
      fx.ring(px, ctx.cy, 4, 34, CREATION.spark, 300, 3, 5);
      me.x = px;
      float(ctx, px, ctx.cy - 34, '+25% SPEED 3s', '#88ccff');
    });
    dash(700, ctx.cx + 90);
    dash(2100, ctx.cx + 190);
    dash(3500, ctx.cx + 290);
    ctx.at(4800, () => float(ctx, ctx.cx + 190, ctx.cy - 46, 'pads fade after 10s', '#8a8ab0'));
  },
};

export const masteryMortarCommand: PreviewScript = {
  duration: 7600,
  caption: 'Mortar Command — the Nexus fires its bottles at the cursor and they land inverted',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const mark: Mark = { x: ctx.tx + 50, y: ctx.ty + 10 };
    movingDummy(ctx, mark);
    const nx = ctx.cx + 30, ny = ctx.cy - 4;
    nexus(ctx, { x: nx, y: ny, load: () => 0, brewing: () => false });

    // Two bottles parked, which is a two-shell volley.
    let fired = false;
    flask(ctx, { x: nx - 16, y: ny - 40, kind: 'buff', born: 200, until: () => (fired ? 0 : Infinity) });
    flask(ctx, { x: nx + 16, y: ny - 40, kind: 'speed', born: 200, until: () => (fired ? 0 : Infinity) });
    ctx.at(700, () => float(ctx, nx, ny - 74, '2 loaded', '#ff88cc'));

    const fireAt = 1800;
    ctx.at(fireAt, () => {
      fired = true;
      const angle = Math.atan2(mark.y - ny, mark.x - nx);
      av.play('raise', angle);
      fx.muzzleFlash(nx, ny, angle, 2.2, 9);
      fx.ring(nx, ny, 10, 64, CREATION.nexusLit, 340, 5, 9);
      fx.smoke(nx, ny, 3, 30, 8);
      float(ctx, nx, ny - 70, '🎆 MORTAR', '#ff66cc');
      // One lobbed shell per potion, fanned so a volley reads as two.
      fx.mortarShell(nx, ny, mark.x - 26, mark.y, CREATION_POTIONS.buff.color, 480);
      fx.mortarShell(nx, ny, mark.x + 26, mark.y, CREATION_POTIONS.speed.color, 480);
    });

    ctx.at(fireAt + 480, () => {
      fx.explosion(mark.x, mark.y, 130, { shards: 24, smoke: 6, duration: 600, core: CREATION_POTIONS.buff.color });
      fx.ring(mark.x, mark.y, 14, 137, CREATION_POTIONS.buff.color, 520, 5, 9);
      ctx.at(70, () => fx.ring(mark.x, mark.y, 14, 137, CREATION_POTIONS.speed.color, 520, 5, 9));
      float(ctx, mark.x, mark.y - 26, '20', '#ffb3aa');
    });
    ctx.at(fireAt + 800, () => float(ctx, mark.x, mark.y - 46, '🩸 WEAKENED −25% dmg', '#ff4466'));
    ctx.at(fireAt + 1500, () => float(ctx, mark.x, mark.y - 46, '🐌 LEADEN half speed', '#99ff66'));
    ctx.at(fireAt + 2400, () => float(ctx, ctx.cx, ctx.cy - 44, 'Gold would land unchanged', '#ffcc22'));
  },
};
