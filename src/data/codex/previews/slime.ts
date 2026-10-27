import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  ACID, AcidAura, AcidAvatar, AcidFx, STING_TONES, TailKnot, VILE_TONES, drawAcidBar, drawAcidFloor, drawToxinMark, drawVenomTail,
} from '../../../elements/kits/AcidVisuals';
import { AcidGrid, CellState } from '../../../elements/kits/AcidGrid';

/**
 * Venom's showcases (element id `slime`).
 *
 * The floor is the kit's real `AcidGrid`, painted through the kit's own `drawAcidFloor`, and the
 * caster drags the real `drawVenomTail` behind it — so a retune to either shows up here the same
 * day. A board is still described as circles (`Pool`) and rasterised into a grid each frame.
 * Everything
 * else (`splash`, `muzzleSpray`, `gather`, `rainDrop`, the four `AcidAura` styles) is the kit's
 * own `AcidFx`, driven with the kit's own numbers.
 *
 * Containment: `ctx.at` and `ctx.onFrame` bodies run outside the harness's capture window, so an
 * `AcidAura` or a raw Graphics built inside one goes through `ctx.capture` / `ctx.adopt` by hand.
 */

// ── Staging ───────────────────────────────────────────────────────────

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean; noTail?: boolean }): { fx: AcidFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new AcidFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new AcidAvatar(ctx.scene, ctx.tint, VILE_TONES));
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  if (!opts?.noTail) restingTail(ctx, ctx.cx, ctx.cy, () => 1);
  return { fx, av };
}

/** A standing serpent's tail: an S-curve lying away behind it, at the kit's 14 × 13px. */
function restingTail(ctx: PreviewCtx, x: number, y: number, lenMult: () => number, alpha = (): number => 1): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4.5));
  ctx.onFrame((_dt, elapsed) => {
    const n = Math.max(3, Math.round(14 * lenMult())) + 1;
    const knots: TailKnot[] = [];
    for (let i = 0; i < n; i++) {
      knots.push({ x: x - i * 12.5, y: y + 6 + Math.sin(i * 0.45 + elapsed / 900) * 9 * Math.min(1, i / 3) });
    }
    g.clear();
    drawVenomTail(g, ctx.tint, knots, 15, elapsed / 1000, VILE_TONES, alpha());
  });
}

/** The kit's own tail sampling, for a caster the script moves: knots laid every 13px walked. */
function followTail(ctx: PreviewCtx, read: () => { x: number; y: number; alpha: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4.5));
  const start = read();
  const knots: TailKnot[] = [];
  for (let i = 0; i <= 14; i++) knots.push({ x: start.x - i * 13, y: start.y });
  ctx.onFrame((_dt, elapsed) => {
    const p = read();
    const head = knots[0];
    if (Phaser.Math.Distance.Between(p.x, p.y, head.x, head.y) >= 13) knots.unshift({ x: p.x, y: p.y });
    else knots[0] = { x: p.x, y: p.y };
    knots.length = 15;
    g.clear();
    drawVenomTail(g, ctx.tint, knots, 15, elapsed / 1000, VILE_TONES, p.alpha);
  });
}

/**
 * The caster, positioned by the script rather than by the harness — needed by the two loops
 * that physically move an acid fighter (swimming a burrow, walking a footprint trail). The
 * script sets `bodyTexture: ''` so the harness stages no body of its own.
 */
function drivenCaster(
  ctx: PreviewCtx, read: () => { x: number; y: number; alpha: number },
): BaseAvatar {
  if (ctx.scene.textures.exists('elem-slime')) {
    const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-slime').setDepth(5));
    ctx.onFrame(() => { const s = read(); body.setPosition(s.x, s.y).setAlpha(s.alpha); });
  }
  const av = ctx.useAvatar(() => new AcidAvatar(ctx.scene, ctx.tint, VILE_TONES));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => { const s = read(); av.update(dt, s.x, s.y, s.alpha); });
  // Under the acid the tail goes with the body; on the surface it trails the path walked.
  followTail(ctx, () => { const s = read(); return { x: s.x, y: s.y, alpha: s.alpha < 1 ? 0 : 1 }; });
  return av;
}

function dummy(ctx: PreviewCtx, x: number, y: number): void {
  ctx.capture(() => {
    const g = ctx.scene.add.graphics().setDepth(4);
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(x, y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(x, y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(x - 5, y - 4, 3.2); g.fillCircle(x + 5, y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(x - 5.6, y - 4, 1.6); g.fillCircle(x + 4.4, y - 4, 1.6);
    return g;
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(14));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(14));
}

interface Pool { x: number; y: number; radius: number; hot: boolean; seed: number; alpha?: number }

/**
 * One grid for a whole board of splashes, rasterised from the circles whenever they change and
 * painted through the kit's own `drawAcidFloor` — spent acid first, fresh acid over it. Returns the
 * grid so a loop can read its coverage.
 */
function poolLayer(ctx: PreviewCtx, pools: Pool[]): AcidGrid {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  const grid = new AcidGrid(0, 0, ctx.w, ctx.h);
  let sig = '';
  ctx.onFrame(() => {
    const next = pools.map((p) => `${p.x | 0},${p.y | 0},${p.radius | 0},${p.hot ? 1 : 0}`).join(';');
    if (next === sig) return;
    sig = next;
    grid.clear();
    for (const p of pools) if (!p.hot) grid.paintCircle(p.x, p.y, p.radius, CellState.Cool);
    for (const p of pools) if (p.hot) grid.paintCircle(p.x, p.y, p.radius, CellState.Hot);
    drawAcidFloor(g, ctx.tint, grid, VILE_TONES);
  });
  return grid;
}

/** A dummy's toxin count, drawn with the kit's own mark and a counter over its head. */
function toxinMeter(ctx: PreviewCtx, at: () => { x: number; y: number }, read: () => number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4.6));
  const txt = label(ctx, at().x, at().y - 34, '#88ff33', 11);
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const n = read();
    const p = at();
    drawToxinMark(g, ctx.tint, p.x, p.y, n, elapsed / 1000, VILE_TONES);
    txt.setPosition(p.x, p.y - 34).setText(n > 0 ? `☠ ${Math.floor(n)}` : '');
  });
}

const seeded = (): number => Math.random() * Math.PI * 2;

// ══ CLICK — Poison Whip ═══════════════════════════════════════════════

/** Both whip loops throw the real barrage: N lashes, 25ms apart, ±5°, 650 px/s. */
function barrage(
  ctx: PreviewCtx, fx: AcidFx, av: BaseAvatar, count: number, tx: number, onHit?: () => void,
): void {
  av.play('punch', ctx.aim);
  for (let i = 0; i < count; i++) {
    ctx.at(i * 25, () => {
      const jitter = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-5, 5));
      // A muzzle spray every third lash, as the kit does — fifteen in 375ms is a wall of white.
      if (i % 3 === 0) fx.muzzleSpray(ctx.cx, ctx.cy, ctx.aim + jitter, 0.85, 7, VILE_TONES);
      ctx.fly({
        texture: 'proj-acid-whip',
        from: { x: ctx.cx + Math.cos(jitter) * 30, y: ctx.cy + Math.sin(jitter) * 30 },
        to: { x: tx, y: ctx.cy + Math.sin(jitter) * 200 },
        speed: 650,
        onHit: () => {
          fx.droplets(tx, ctx.cy, 2, { speed: 90, size: 2.4, life: 300, depth: 8, tones: VILE_TONES });
          onHit?.();
        },
      });
    });
  }
}

export const poisonWhip: PreviewScript = {
  duration: 2600,
  caption: 'Click — 15 lashes, 1 damage and 1 toxin each; 20 in acid; 2 toxin a lash at 50% acid',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    // The caster is standing in their own acid, which is what buys the extra five lashes.
    poolLayer(ctx, [{ x: ctx.cx, y: ctx.cy + 4, radius: 56, hot: false, seed: seeded() }]);
    let toxin = 0;
    toxinMeter(ctx, () => ({ x: ctx.tx, y: ctx.ty }), () => toxin);
    ctx.at(400, () => barrage(ctx, fx, av, 20, ctx.tx, () => { toxin++; }));
  },
};

export const poisonWhipUpgraded: PreviewScript = {
  duration: 3200,
  caption: 'Corrosive Bite — each lash also eats 1 off their maximum HP, permanently',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    poolLayer(ctx, [{ x: ctx.cx, y: ctx.cy + 4, radius: 56, hot: false, seed: seeded() }]);

    // A max-HP bar over the target, shrinking from the right as the volley eats into it.
    const bw = 74, bh = 6;
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(13));
    const cap = label(ctx, ctx.tx, ctx.ty - 40, '#88ff33', 10);
    let maxHp = 100;
    ctx.onFrame(() => {
      bar.clear();
      bar.fillStyle(ctx.tint(ACID.rot), 0.9);
      bar.fillRect(ctx.tx - bw / 2 - 1, ctx.ty - 30, bw + 2, bh + 2);
      bar.fillStyle(0x552222, 1);
      bar.fillRect(ctx.tx - bw / 2, ctx.ty - 29, bw, bh);
      bar.fillStyle(ctx.tint(ACID.lime), 1);
      bar.fillRect(ctx.tx - bw / 2, ctx.ty - 29, bw * (maxHp / 100), bh);
      cap.setText(`max ${maxHp}`);
    });

    ctx.at(400, () => barrage(ctx, fx, av, 20, ctx.tx, () => { maxHp = Math.max(0, maxHp - 1); }));
    ctx.at(1400, () => float(ctx, ctx.tx, ctx.ty - 50, '−20 MAX HP', '#88ff33', 11));
  },
};

// ══ E — Vile Spray ════════════════════════════════════════════════════

export const vileSpray: PreviewScript = {
  duration: 4200,
  scale: 0.9,
  caption: 'E — three permanent splashes at 110/180/250px; standing in acid: 1 damage + 3 toxin a second',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    dummy(ctx, ctx.cx + 180, ctx.cy);

    ctx.at(300, () => {
      av.play('sweep', ctx.aim);
      fx.muzzleSpray(ctx.cx, ctx.cy, ctx.aim, 1.6, 7, VILE_TONES);
      // The three real distances — the spread is fixed, not aimed.
      for (const dist of [110, 180, 250]) {
        const x = ctx.cx + dist, y = ctx.cy;
        fx.droplets(ctx.cx, ctx.cy, 5, {
          speed: dist * 2.2, angle: ctx.aim, spread: 0.22, size: 4.4,
          life: 340, fall: 20, depth: 6, tones: VILE_TONES,
        });
        ctx.at(Math.round((dist / (dist * 2.2)) * 1000) + 120, () => {
          pools.push({ x, y, radius: 58, hot: true, seed: seeded() });
          fx.ring(x, y, 58 * 0.3, 58, ACID.hotRim, 340, 3, 4);
          fx.fizz(x, y, 5, 58 * 0.7, 4, VILE_TONES);
        });
      }
      float(ctx, ctx.cx, ctx.cy - 30, '🧪 Vile Spray!', '#66ff33');
    });

    // The middle splash has somebody standing in it: it nips, goes dark, and then poisons.
    let toxin = 0;
    toxinMeter(ctx, () => ({ x: ctx.cx + 180, y: ctx.cy }), () => toxin);
    ctx.at(1600, () => {
      const p = pools.find((q) => q.x === ctx.cx + 180);
      if (!p) return;
      p.hot = false;
      fx.splash(ctx.cx + 180, ctx.cy, 26, { droplets: 4, fizz: 2, etch: false, depth: 8, tones: VILE_TONES });
      float(ctx, ctx.cx + 180, ctx.cy - 24, '2', '#66ff33', 12);
    });
    for (const d of [1600, 2600, 3600]) {
      ctx.at(d, () => { toxin += 3; float(ctx, ctx.cx + 180, ctx.cy - 50, '1  +3 ☠', '#66ff33', 10); });
    }
  },
};

export const vileSprayUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Spray Spread — every 2s each splash has a 20% chance to bud one at 55% its size',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    const count = label(ctx, ctx.w * 0.5, 12, '#88ff33', 11);
    ctx.onFrame(() => count.setText(`${pools.length} splashes`));

    const drop = (x: number, y: number, radius: number): void => {
      pools.push({ x, y, radius, hot: true, seed: seeded() });
      fx.ring(x, y, radius * 0.3, radius, ACID.hotRim, 340, 3, 4);
      fx.fizz(x, y, Math.max(2, Math.round(radius / 12)), radius * 0.7, 4, VILE_TONES);
    };

    ctx.at(300, () => {
      av.play('sweep', ctx.aim);
      fx.muzzleSpray(ctx.cx, ctx.cy, ctx.aim, 1.6, 7, VILE_TONES);
      for (const dist of [110, 180, 250]) drop(ctx.cx + dist, ctx.cy, 56);
    });

    // The 2s spread check, run for real on every pool on the board. The roll is the kit's 20%,
    // nudged to fire at least once per sweep so the loop is never a blank screen.
    let checkAccum = 0;
    let sweeps = 0;
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 800) return;
      checkAccum += dt;
      if (checkAccum < 2000) return;
      checkAccum -= 2000;
      sweeps++;
      let budded = false;
      for (const p of pools.slice()) {
        if (pools.length >= 60) break;
        if (Math.random() >= 0.2 && !(sweeps > 0 && !budded && p === pools[pools.length - 1])) continue;
        budded = true;
        const a = Math.random() * Math.PI * 2;
        const d = Phaser.Math.Between(20, 50);
        drop(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, Math.max(18, p.radius * 0.55));
      }
    });
  },
};

// ══ R — Snake Burrow ══════════════════════════════════════════════════

export const snakeBurrow: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'R — invincible and ×1.25 speed while under, and only over your own acid',
  run(ctx) {
    const fx = ctx.capture(() => new AcidFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const at = { x: ctx.cx, y: ctx.cy, alpha: 1 };
    drivenCaster(ctx, () => at);
    // A lane of acid to swim down — the burrow is only ever as long as the pools are.
    poolLayer(ctx, [110, 190, 270].map((d) => ({ x: ctx.cx + d - 110, y: ctx.cy, radius: 56, hot: false, seed: seeded() })));

    ctx.at(600, () => {
      at.alpha = 0.4;
      fx.gather(at.x, at.y, 46, 400, () => ({ x: at.x, y: at.y }), 5, VILE_TONES);
      fx.ring(at.x, at.y, 46, 12, ACID.hotRim, 380, 3.5, 4);
      float(ctx, at.x, at.y - 30, '🐍 Burrowed!', '#99ff66');

      const aura = ctx.capture(() => new AcidAura(ctx.scene, ctx.tint, 'burrow', VILE_TONES, 30, 4));
      let under = true;
      ctx.onFrame((dt) => {
        if (!under) return;
        aura.update(dt, at.x, at.y, 1);
        // ×1.25 of an ordinary walk, and only while there is still acid under it.
        at.x = Math.min(ctx.cx + 250, at.x + 150 * 1.25 * (dt / 1000));
      });
      // Hits that arrive while under simply do not land.
      for (const d of [900, 1800]) {
        ctx.at(d, () => float(ctx, at.x, at.y - 22, 'IMMUNE', '#99ff66', 10));
      }

      ctx.at(3400, () => {
        under = false;
        aura.destroy();
        at.alpha = 1;
        fx.splash(at.x, at.y, 56, { droplets: 12, fizz: 4, etch: false, depth: 6, tones: VILE_TONES });
        float(ctx, at.x, at.y - 30, 'OUT OF ACID', '#99ff66', 10);
      });
    });
  },
};

export const snakeBurrowUpgraded: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Rattling Strike — surfacing blasts 20 in 90px, multiplies their toxin by 1.5, and they drip acid 5s',
  run(ctx) {
    const fx = ctx.capture(() => new AcidFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const at = { x: ctx.cx, y: ctx.cy, alpha: 1 };
    drivenCaster(ctx, () => at);
    const pools: Pool[] = [{ x: ctx.cx, y: ctx.cy, radius: 56, hot: false, seed: seeded() },
      { x: ctx.cx + 90, y: ctx.cy, radius: 56, hot: false, seed: seeded() }];
    poolLayer(ctx, pools);
    const victim = { x: ctx.cx + 150, y: ctx.cy };
    dummy(ctx, victim.x, victim.y);

    ctx.at(500, () => {
      at.alpha = 0.4;
      fx.gather(at.x, at.y, 46, 400, () => ({ x: at.x, y: at.y }), 5, VILE_TONES);
      const aura = ctx.capture(() => new AcidAura(ctx.scene, ctx.tint, 'burrow', VILE_TONES, 30, 4));
      let under = true;
      ctx.onFrame((dt) => {
        if (!under) return;
        aura.update(dt, at.x, at.y, 1);
        at.x = Math.min(ctx.cx + 110, at.x + 150 * 1.25 * (dt / 1000));
      });

      ctx.at(2200, () => {
        under = false;
        aura.destroy();
        at.alpha = 1;
        // The one warm effect in the element — it can never be mistaken for a normal surface.
        fx.splash(at.x, at.y, 90, { droplets: 18, fizz: 4, depth: 6, duration: 480, tones: STING_TONES });
        fx.splash(victim.x, victim.y, 34, { droplets: 6, fizz: 0, etch: false, depth: 8, tones: STING_TONES });
        float(ctx, at.x, at.y - 30, '🐍 Rattling Strike!', '#ff6666');
        float(ctx, victim.x, victim.y - 24, '20', '#ff6666', 14);
        float(ctx, victim.x, victim.y - 42, '☠ 80 → 120', '#ff6666', 11);

        // 5 seconds of dripping, one 22px pool a second, wherever the victim happens to be.
        let drips = 0;
        ctx.onFrame((dt2) => {
          victim.x = Math.min(ctx.cx + 330, victim.x + 46 * (dt2 / 1000));
        });
        for (let i = 0; i < 5; i++) {
          ctx.at(i * 1000, () => {
            drips++;
            pools.push({ x: victim.x, y: victim.y, radius: 22, hot: true, seed: seeded() });
            fx.fizz(victim.x, victim.y, 3, 16, 4, VILE_TONES);
            float(ctx, victim.x, victim.y - 34, `drip ${drips}/5`, '#66ff33', 9);
          });
        }
      });
    });
  },
};

// ══ F — Festering Bite ════════════════════════════════════════════════

/** A dummy the script draws itself, so it can shrink and wear a shield bubble. */
function biteVictim(ctx: PreviewCtx, x: number, y: number, state: { size: number; shield: boolean }): void {
  const vg = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame((_dt, elapsed) => {
    const k = state.size;
    vg.clear();
    vg.fillStyle(0x2b2f3d, 1); vg.fillCircle(x, y, 17 * k);
    vg.fillStyle(0x3c4254, 1); vg.fillCircle(x, y, 13 * k);
    vg.fillStyle(0x8e97ad, 0.9);
    vg.fillCircle(x - 5 * k, y - 4 * k, 3.2 * k); vg.fillCircle(x + 5 * k, y - 4 * k, 3.2 * k);
    if (state.shield) {
      vg.lineStyle(2.5, 0x66aaff, 0.7 + 0.2 * Math.sin(elapsed / 120));
      vg.strokeCircle(x, y, 24 * k);
      vg.fillStyle(0x66aaff, 0.12);
      vg.fillCircle(x, y, 24 * k);
    }
  });
}

export const festeringBite: PreviewScript = {
  duration: 6800,
  scale: 0.9,
  caption: 'F — Purge strips every buff, then 15/30/45 and 12 toxin; reach and purge grow with the acid',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const vx = ctx.cx + 92;
    const victim = { size: 1, shield: true };
    biteVictim(ctx, vx, ctx.cy, victim);
    let toxin = 0;
    toxinMeter(ctx, () => ({ x: vx, y: ctx.cy }), () => toxin);
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    const cov = label(ctx, ctx.w * 0.5, 12, '#88ff33', 11);
    let coverage = 0.08;
    ctx.onFrame(() => cov.setText(`${Math.round(coverage * 100)}% acid  —  bite stage ${coverage < 0.24 ? 1 : coverage < 0.5 ? 2 : 3}`));

    const bite = (stageIndex: 1 | 2 | 3): void => {
      const dmg = [15, 30, 45][stageIndex - 1];
      const reach = [70, 85, 100][stageIndex - 1] + 18;
      const purgeS = [3, 8, 15][stageIndex - 1];
      av.play('slam', 0);
      fx.bite(ctx.cx, ctx.cy, 0, reach, stageIndex, 8, VILE_TONES);
      ctx.at(150, () => {
        // Purge goes first: the shield is stripped before the fangs land, so none of it is absorbed.
        if (victim.shield) float(ctx, vx, ctx.cy - 60, 'SHIELD STRIPPED', '#99ff33', 10);
        victim.shield = false;
        fx.splash(vx, ctx.cy, 52, { droplets: 12, fizz: 4, depth: 8, tones: VILE_TONES });
        fx.punctures(vx, ctx.cy, 0, 9, VILE_TONES);
        toxin += 12;
        float(ctx, vx, ctx.cy - 26, `${dmg}`, '#66ff33', 14);
        float(ctx, vx, ctx.cy - 44, `☠️ Purged ${purgeS}s`, '#66ff33', 10);
        const aura = ctx.capture(() => new AcidAura(ctx.scene, ctx.tint, 'purge', VILE_TONES, 28, 4));
        ctx.onFrame((dt) => aura.update(dt, vx, ctx.cy, 1));
      });
    };

    ctx.at(500, () => bite(1));
    ctx.at(2600, () => {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        pools.push({ x: ctx.cx + 60 + Math.cos(a) * 120, y: ctx.cy + Math.sin(a) * 60, radius: 58, hot: false, seed: seeded() });
      }
      coverage = 0.55;
      float(ctx, ctx.w * 0.5, 30, 'FLOOR PAINTED', '#88ff33', 10);
    });
    ctx.at(3200, () => { victim.shield = true; });
    ctx.at(3800, () => bite(3));
  },
};

export const festeringBiteUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Meltdown — a stage-3 bite melts them for 3s, and the puddles carry the stripped buffs to you',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const vx = ctx.cx + 110;
    const pools: Pool[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      pools.push({ x: ctx.cx + 80 + Math.cos(a) * 140, y: ctx.cy + Math.sin(a) * 54, radius: 58, hot: false, seed: seeded() });
    }
    poolLayer(ctx, pools);
    const victim = { size: 1, shield: false };
    biteVictim(ctx, vx, ctx.cy, victim);

    const melt: { x: number; y: number; seed: number; buffs: number; taken: boolean }[] = [];
    const mg = ctx.adopt(ctx.scene.add.graphics().setDepth(3.2));
    ctx.onFrame((_dt, elapsed) => {
      mg.clear();
      for (const m of melt) {
        if (m.taken) continue;
        AcidFx.drawMeltPuddle(mg, ctx.tint, m.x, m.y, 24, 0x3377bb, elapsed / 1000, m.seed, m.buffs);
      }
    });

    ctx.at(400, () => {
      av.play('slam', 0);
      fx.bite(ctx.cx, ctx.cy, 0, 118, 3, 8, VILE_TONES);
      ctx.at(150, () => {
        fx.splash(vx, ctx.cy, 52, { droplets: 12, fizz: 4, depth: 8, tones: VILE_TONES });
        fx.punctures(vx, ctx.cy, 0, 9, VILE_TONES);
        float(ctx, vx, ctx.cy - 26, '45', '#66ff33', 14);
        float(ctx, vx, ctx.cy - 44, '🫠 Melting!', '#33cc33', 11);
        const aura = ctx.capture(() => new AcidAura(ctx.scene, ctx.tint, 'melt', VILE_TONES, 24, 4));
        let melting = true;
        ctx.onFrame((dt) => { if (melting) aura.update(dt, vx, ctx.cy, 1); });
        for (let i = 1; i <= 3; i++) {
          ctx.at(i * 1000, () => {
            victim.size = Math.max(0.3, victim.size * 0.9);
            melt.push({ x: vx + (i - 2) * 26, y: ctx.cy + 30, seed: seeded(), buffs: 2, taken: false });
            float(ctx, vx, ctx.cy - 22, '−10% HP / max / size', '#33cc33', 9);
          });
        }
        ctx.at(3200, () => { melting = false; aura.destroy(); });
      });
    });

    ctx.at(5200, () => {
      const m = melt.find((q) => !q.taken);
      if (!m) return;
      m.taken = true;
      fx.gather(m.x, m.y, 24 * 1.6, 380, () => ({ x: ctx.cx, y: ctx.cy }), 5, VILE_TONES);
      fx.ring(m.x, m.y, 24, 6, 0x3377bb, 340, 3, 5);
      float(ctx, ctx.cx, ctx.cy - 40, '🫠 +30% Speed, +20% Damage (8s)', '#33ff99', 10);
    });
  },
};

// ══ Q — Acid Apocalypse ═══════════════════════════════════════════════

/** Both rain loops are the same storm; Acid Flood is whether the pools widen under it. */
function rainScript(flood: boolean): PreviewScript {
  return {
    duration: 9000,
    scale: 0.7,
    caption: flood
      ? 'Acid Flood — the acid creeps outward across the floor for as long as the rain falls, and stays'
      : 'Q — 8s of rain, 6 damage every 0.5s to anything standing on your acid',
    run(ctx) {
      const { fx, av } = stage(ctx, { noDummy: true });
      const pools: Pool[] = [];
      for (const d of [80, 180, 280]) {
        pools.push({ x: ctx.cx + d, y: ctx.cy, radius: 56, hot: false, seed: seeded() });
      }
      poolLayer(ctx, pools);
      dummy(ctx, ctx.cx + 180, ctx.cy);
      const readout = label(ctx, ctx.w * 0.5, 12, '#88ff33', 11);

      ctx.at(400, () => {
        av.play('raise', -Math.PI / 2, 900);
        fx.ring(ctx.cx, ctx.cy, 12, 160, ACID.neon, 620, 6, 5);
        for (const p of pools) {
          fx.ring(p.x, p.y, p.radius * 0.4, p.radius * 1.3, ACID.hotRim, 460, 3, 4);
          fx.fizz(p.x, p.y, 4, p.radius, 4, VILE_TONES);
        }
        float(ctx, ctx.w * 0.5, ctx.cy - 60, '☠️ Acid Apocalypse!', '#66ff33', 12);

        // The real 8s window: a tick every 500ms and three drops every 150ms.
        const start = 400;
        let tickAccum = 0, dropAccum = 0, dealt = 0;
        ctx.onFrame((dt, elapsed) => {
          const age = elapsed - start;
          if (age < 0 || age > 8000) { readout.setText(dealt ? `${dealt} total` : ''); return; }
          readout.setText(`rain ${((8000 - age) / 1000).toFixed(1)}s   —   ${dealt} dealt`);
          tickAccum += dt;
          if (tickAccum >= 500) {
            tickAccum -= 500;
            dealt += 6;
            fx.splash(ctx.cx + 180, ctx.cy, 30, { droplets: 5, fizz: 0, etch: false, depth: 8, tones: VILE_TONES });
            float(ctx, ctx.cx + 180, ctx.cy - 22, '6', '#66ff33', 11);
          }
          dropAccum += dt;
          if (dropAccum >= 150) {
            dropAccum -= 150;
            for (let i = 0; i < 3; i++) {
              const p = pools[Phaser.Math.Between(0, pools.length - 1)];
              fx.rainDrop(p.x + Phaser.Math.Between(-p.radius, p.radius),
                p.y + Phaser.Math.Between(-8, 8), 140, 6, VILE_TONES);
            }
          }
          if (flood) {
            for (const p of pools) p.radius = Math.min(56 * 2.2, p.radius + 6 * (dt / 1000));
          }
        });
      });
    },
  };
}

export const acidApocalypse = rainScript(false);
export const acidApocalypseUpgraded = rainScript(true);

// ══ Passives ══════════════════════════════════════════════════════════

export const passiveSerpentine: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Serpentine — the tail is part of your hitbox; a dodge drops it and carries you 3× as far',
  run(ctx) {
    const fx = ctx.capture(() => new AcidFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const at = { x: ctx.cx - 60, y: ctx.cy, alpha: 1 };
    drivenCaster(ctx, () => at);
    let dodging = false;
    // The tail drawn by `drivenCaster` hides while alpha < 1, which is exactly a dodge here.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 1800) at.x += 70 * (dt / 1000);
      at.alpha = dodging ? 0.99 : 1;
    });
    // A shot that misses the body and catches the tail still lands.
    ctx.at(1300, () => {
      ctx.fly({
        texture: 'proj-acid-whip', from: { x: ctx.cx - 60, y: ctx.cy - 160 }, to: { x: ctx.cx - 60, y: ctx.cy + 6 },
        speed: 420,
        onHit: () => {
          fx.droplets(ctx.cx - 60, ctx.cy + 6, 3, { speed: 80, size: 2.4, life: 300, depth: 7, tones: VILE_TONES });
          float(ctx, ctx.cx - 60, ctx.cy - 16, 'TAIL HIT', '#ff6666', 11);
        },
      });
    });
    // The dodge: three times the distance, and the tail is gone for the length of it.
    ctx.at(3200, () => {
      dodging = true;
      float(ctx, at.x, at.y - 30, 'DODGE ×3', '#99ff66', 11);
      ctx.fly({
        texture: 'proj-acid-whip', from: { x: at.x - 40, y: ctx.cy - 160 }, to: { x: at.x - 40, y: ctx.cy + 6 },
        speed: 420,
      });
      ctx.onFrame((dt, elapsed) => {
        if (elapsed > 3200 && elapsed < 3480) at.x = Math.min(ctx.cx + 240, at.x + 1560 * (dt / 1000));
      });
      ctx.at(280, () => { dodging = false; float(ctx, at.x - 60, ctx.cy - 16, 'MISSED', '#99ff66', 10); });
    });
  },
};

export const passiveToxin: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Toxin never fades: 25 burns, 50 drips acid, 100 weakens, 250/500 eat max HP, 1000 kills',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    let toxin = 0;
    toxinMeter(ctx, () => ({ x: ctx.tx, y: ctx.ty }), () => toxin);
    const tiers: [number, string][] = [[25, '3 / s'], [50, 'DRIPPING'], [100, '−20% DAMAGE · 5 / s'], [250, '−50 MAX HP'], [500, '−100 MAX HP · 8 / s'], [1000, 'DISSOLVED']];
    let next = 0;
    const tierText = label(ctx, ctx.w * 0.5, 14, '#88ff33', 11);
    // Compressed time: the real climb takes a fight; here each volley is worth a lot more.
    ctx.onFrame((dt, elapsed) => {
      if (elapsed < 500 || toxin >= 1000) return;
      toxin = Math.min(1000, toxin + (dt / 1000) * (25 + toxin * 0.55));
      while (next < tiers.length && toxin >= tiers[next][0]) {
        float(ctx, ctx.tx, ctx.ty - 52, `${tiers[next][0]} · ${tiers[next][1]}`, next >= 3 ? '#ff6666' : '#88ff33', 11);
        fx.splash(ctx.tx, ctx.ty, 34 + next * 6, { droplets: 6 + next * 2, fizz: 3, etch: false, depth: 8, tones: next >= 3 ? STING_TONES : VILE_TONES });
        tierText.setText(`tier ${next + 1}: ${tiers[next][1]}`);
        next++;
      }
    });
    for (let i = 0; i < 8; i++) ctx.at(500 + i * 900, () => barrage(ctx, fx, av, 15, ctx.tx));
  },
};

export const passiveAcidFloor: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Fresh acid nips whoever walks over it; standing on any acid: 1 damage and 3 toxin a second',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const pool: Pool = { x: ctx.cx + 150, y: ctx.cy, radius: 58, hot: true, seed: seeded() };
    poolLayer(ctx, [pool]);
    const state = label(ctx, pool.x, pool.y - 50, '#88ff33', 10);
    ctx.onFrame(() => state.setText(pool.hot ? 'FRESH — nips on contact' : 'SPENT — 1 + 3 toxin / s, forever'));

    const walker = { x: ctx.cx, y: ctx.cy };
    let toxin = 0;
    toxinMeter(ctx, () => walker, () => toxin);
    const wg = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    let ticking = false;
    ctx.onFrame((dt, elapsed) => {
      if (elapsed > 900) walker.x = Math.min(pool.x, walker.x + 90 * (dt / 1000));
      wg.clear();
      wg.fillStyle(0x2b2f3d, 1); wg.fillCircle(walker.x, walker.y, 17);
      wg.fillStyle(0x3c4254, 1); wg.fillCircle(walker.x, walker.y, 13);
      wg.fillStyle(0x8e97ad, 0.9);
      wg.fillCircle(walker.x - 5, walker.y - 4, 3.2); wg.fillCircle(walker.x + 5, walker.y - 4, 3.2);
      if (!ticking && Phaser.Math.Distance.Between(walker.x, walker.y, pool.x, pool.y) <= pool.radius) {
        ticking = true;
        pool.hot = false;
        fx.splash(walker.x, walker.y + 6, 26, { droplets: 4, fizz: 2, etch: false, depth: 8, tones: VILE_TONES });
        float(ctx, walker.x, walker.y - 24, '4', '#66ff33', 13);
        for (let i = 0; i < 5; i++) {
          ctx.at(i * 1000, () => {
            toxin += 3;
            fx.droplets(walker.x, walker.y + 8, 3, {
              speed: 60, angle: -Math.PI / 2, spread: 1, size: 2.4, life: 380, depth: 5, tones: VILE_TONES,
            });
            float(ctx, walker.x, walker.y - 20, '1  +3 ☠', '#448822', 10);
          });
        }
      }
    });
  },
};

export const passiveAcidification: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'The gauge: 24% and 50% are the bite stages, 50% doubles the whip\'s toxin, 20/40/60/80% each earn a shed',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const pools: Pool[] = [];
    const grid = poolLayer(ctx, pools);
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(14));
    const readout = label(ctx, ctx.w * 0.5, 34, '#88ff33', 11);
    ctx.onFrame((_dt, elapsed) => {
      const cov = grid.coverage;
      let reached = 0;
      for (const m of [0.2, 0.4, 0.6, 0.8]) if (cov >= m) reached++;
      bar.clear();
      drawAcidBar(bar, ctx.tint, ctx.w * 0.5 - 110, 10, 220, 8, cov, elapsed / 1000, VILE_TONES, [0.2, 0.4, 0.6, 0.8], reached);
      const stg = cov < 0.24 ? 1 : cov < 0.5 ? 2 : 3;
      readout.setText(`${Math.round(cov * 100)}% acid · bite ${stg}${cov >= 0.5 ? ' · whip ×2 toxin' : ''} · sheds ${reached}`);
    });
    for (let s2 = 0; s2 < 7; s2++) {
      ctx.at(400 + s2 * 1100, () => {
        const ang = -0.9 + s2 * 0.3;
        av.play('sweep', ang);
        fx.muzzleSpray(ctx.cx, ctx.cy, ang, 1.6, 7, VILE_TONES);
        for (const dist of [70, 140, 210]) {
          const x = ctx.cx + Math.cos(ang) * dist, y = ctx.cy + Math.sin(ang) * dist;
          pools.push({ x, y, radius: 66, hot: true, seed: seeded() });
          fx.ring(x, y, 17, 66, ACID.hotRim, 340, 3, 4);
        }
      });
    }
  },
};

// ══ Mastery ═══════════════════════════════════════════════════════════

export const masteryAcidWalker: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Acid Walker — 5s of burning prints after leaving acid, one every 34px walked',
  run(ctx) {
    const fx = ctx.capture(() => new AcidFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const at = { x: ctx.cx, y: ctx.cy, alpha: 1 };
    const av = drivenCaster(ctx, () => at);
    av.setMastered(true);

    const pools: Pool[] = [{ x: ctx.cx, y: ctx.cy, radius: 56, hot: false, seed: seeded() }];
    poolLayer(ctx, pools);
    // Prints are their own list: they never count toward coverage.
    const prints: { x: number; y: number; radius: number; boosted: boolean; seed: number; born: number }[] = [];
    const pg = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      pg.clear();
      for (let i = prints.length - 1; i >= 0; i--) {
        const p = prints[i];
        const age = elapsed - p.born;
        if (age > 3000) { prints.splice(i, 1); continue; }
        const a = Phaser.Math.Clamp((3000 - age) / 600, 0, 1);
        AcidFx.drawPool(pg, ctx.tint, p.x, p.y, p.radius, elapsed / 1000, p.seed, p.boosted, a * 0.9);
      }
    });

    ctx.at(400, () => {
      // Surfacing first, so the first three prints are the boosted kind.
      fx.splash(at.x, at.y, 56, { droplets: 12, fizz: 4, etch: false, depth: 6, tones: VILE_TONES });
      float(ctx, at.x, at.y - 30, '🐍 Surfaced!', '#99ff66', 10);
      const surfacedAt = 400;
      let lastX = at.x;
      let leftAcidAt = -1;
      ctx.onFrame((dt, elapsed) => {
        at.x += 110 * (dt / 1000);
        const inAcid = pools.some((p) => Phaser.Math.Distance.Between(at.x, at.y, p.x, p.y) <= p.radius);
        if (!inAcid && leftAcidAt < 0) { leftAcidAt = elapsed; lastX = at.x; }
        if (inAcid || leftAcidAt < 0) return;
        if (elapsed - leftAcidAt > 5000) return;      // the 5s trail window
        if (at.x - lastX < 34) return;                // one print every 34px walked
        lastX = at.x;
        const boosted = elapsed - surfacedAt <= 3000; // boosted for 3s after surfacing
        prints.push({
          x: at.x, y: at.y, radius: boosted ? 26 : 15, boosted, seed: seeded(), born: elapsed,
        });
        if (boosted) fx.fizz(at.x, at.y, 3, 26, 4, VILE_TONES);
        float(ctx, at.x, at.y - 26, boosted ? '4 / 0.5s' : '2 / 0.5s', boosted ? '#88ff33' : '#448822', 9);
      });
    });
  },
};

export const masteryShedSkin: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Shed Skin — one per milestone (20/40/60/80%): tail ×0.67, +15% speed, a ring of lashes and acid',
  run(ctx) {
    const fx = ctx.capture(() => new AcidFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const at = { x: ctx.cx, y: ctx.cy, alpha: 1 };
    const av = ctx.useAvatar(() => new AcidAvatar(ctx.scene, ctx.tint, VILE_TONES));
    av.setMastered(true);
    av.setFacing(ctx.aim);
    if (ctx.scene.textures.exists('elem-slime')) {
      const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-slime').setDepth(5));
      ctx.onFrame(() => body.setPosition(at.x, at.y));
    }
    ctx.onFrame((dt) => av.update(dt, at.x, at.y, 1));
    let tailLen = 1;
    restingTail(ctx, ctx.cx, ctx.cy, () => tailLen);
    dummy(ctx, ctx.cx + 130, ctx.cy);
    const pools: Pool[] = [];
    poolLayer(ctx, pools);

    // The sloughed skin lying where it came off.
    const husk: TailKnot[] = [];
    let huskBorn = -1;
    const hg = ctx.adopt(ctx.scene.add.graphics().setDepth(4.4));
    ctx.onFrame((_dt, elapsed) => {
      hg.clear();
      if (huskBorn < 0) return;
      const life = 1 - (elapsed - huskBorn) / 3000;
      if (life > 0) drawVenomTail(hg, ctx.tint, husk, 16.5, elapsed / 1000, VILE_TONES, life, true);
    });

    ctx.at(700, () => {
      for (let i = 0; i <= 14; i++) husk.push({ x: ctx.cx - i * 12.5, y: ctx.cy + 6 + Math.sin(i * 0.45) * 9 * Math.min(1, i / 3) });
      huskBorn = 700;
      tailLen = 0.67;
      av.play('flex');
      float(ctx, ctx.cx, ctx.cy - 44, 'SHED SKIN', '#ccff88', 13);
      float(ctx, ctx.cx, ctx.cy - 28, '+15% speed', '#99ff66', 10);
      fx.splash(ctx.cx, ctx.cy, 90, { droplets: 20, fizz: 6, duration: 560, depth: 6, tones: VILE_TONES });
      pools.push({ x: ctx.cx, y: ctx.cy, radius: 48, hot: true, seed: seeded() });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        pools.push({ x: ctx.cx + Math.cos(a) * 60, y: ctx.cy + Math.sin(a) * 60, radius: 22, hot: true, seed: seeded() });
      }
      // 48 lashes spiralling out over 0.6s.
      for (let i = 0; i < 48; i++) {
        ctx.at(Math.floor((i * 600) / 48), () => {
          const ang = (i / 48) * Math.PI * 6;
          ctx.fly({
            texture: 'proj-acid-whip',
            from: { x: ctx.cx + Math.cos(ang) * 24, y: ctx.cy + Math.sin(ang) * 24 },
            to: { x: ctx.cx + Math.cos(ang) * 700, y: ctx.cy + Math.sin(ang) * 700 },
            speed: 650, pierce: true,
          });
        });
      }
    });
  },
};

// ══ PERK — Electrolysis ═══════════════════════════════════════════════

/**
 * Three pools inside conducting range, arcing on the kit's own 1.4s clock. The surge on the
 * third beat is scripted rather than rolled — a 20% chance would leave most viewings of this
 * loop never showing the half of the perk that matters.
 */
export const perkElectrolysis: PreviewScript = {
  duration: 6200,
  caption: 'Perk — the pool field is a circuit: 12 damage a beat between random pools, 36 on a surge',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const a: Pool = { x: ctx.cx - 40, y: ctx.cy - 46, radius: 40, hot: false, seed: seeded() };
    const b: Pool = { x: ctx.cx + 96, y: ctx.cy + 6, radius: 46, hot: false, seed: seeded() };
    const c: Pool = { x: ctx.cx + 30, y: ctx.cy + 84, radius: 38, hot: false, seed: seeded() };
    poolLayer(ctx, [a, b, c]);
    dummy(ctx, ctx.cx + 30, ctx.cy - 16);

    // The arcs, repainted from the clock through the kit's own painter.
    const arcs: { x1: number; y1: number; x2: number; y2: number; born: number; surge: boolean; seed: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      for (let i = arcs.length - 1; i >= 0; i--) {
        const life = 1 - (elapsed - arcs[i].born) / 260;
        if (life <= 0) { arcs.splice(i, 1); continue; }
        AcidFx.drawElectroArc(g, ctx.tint, arcs[i].x1, arcs[i].y1, arcs[i].x2, arcs[i].y2,
          elapsed / 1000, arcs[i].seed, arcs[i].surge, life);
      }
    });

    const arc = (at: number, from: Pool, to: Pool, surge: boolean, damage: string | null): void => {
      ctx.at(at, () => {
        arcs.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, born: at, surge, seed: seeded() });
        fx.fizz(from.x, from.y, surge ? 7 : 4, from.radius * 0.7, 5, VILE_TONES);
        fx.fizz(to.x, to.y, surge ? 7 : 4, to.radius * 0.7, 5, VILE_TONES);
        if (damage) {
          float(ctx, ctx.cx + 30, ctx.cy - 34, damage, surge ? '#ccff88' : '#aaff44', surge ? 15 : 12);
          fx.droplets(ctx.cx + 30, ctx.cy - 16, surge ? 6 : 3,
            { speed: 130, size: 2.6, life: 380, depth: 8, tones: VILE_TONES });
          float(ctx, ctx.cx + 30, ctx.cy + 4, '⚡ 45% SPEED', '#88ff33', 10);
        }
      });
    };
    // Beat one crosses the dummy, beat two misses it entirely, beat three surges and chains.
    arc(700, a, b, false, '12');
    arc(2100, b, c, false, null);
    arc(3500, a, b, true, '36');
    ctx.at(3500, () => float(ctx, ctx.cx + 30, ctx.cy - 62, '⚡ SURGE', '#ccff88', 14));
    arc(3560, b, c, true, null);
    arc(4900, c, a, false, null);

    const cap = label(ctx, ctx.cx, 14, '#aaff44', 10);
    cap.setText('220px conducting range · a random eligible pair every 1.4s');
  },
};
