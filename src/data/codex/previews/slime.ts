import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  ACID, AcidAura, AcidAvatar, AcidFx, STING_TONES, VILE_TONES,
} from '../../../elements/kits/AcidVisuals';

/**
 * Acid's showcases.
 *
 * The whole element is pools on the floor, and a pool is not a sprite — it is `AcidFx.drawPool`
 * repainted every frame out of a Graphics the kit owns. These loops own their own Graphics and
 * call the same static, so a retune to how a pool creeps shows up here the same day. Everything
 * else (`splash`, `muzzleSpray`, `gather`, `rainDrop`, the four `AcidAura` styles) is the kit's
 * own `AcidFx`, driven with the kit's own numbers.
 *
 * Containment: `ctx.at` and `ctx.onFrame` bodies run outside the harness's capture window, so an
 * `AcidAura` or a raw Graphics built inside one goes through `ctx.capture` / `ctx.adopt` by hand.
 */

// ── Staging ───────────────────────────────────────────────────────────

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: AcidFx; av: BaseAvatar } {
  const fx = ctx.capture(() => new AcidFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new AcidAvatar(ctx.scene, ctx.tint, VILE_TONES));
  av.setFacing(ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
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
 * One Graphics for a whole board of pools, repainted every frame through the kit's own
 * `drawPool` — exactly how `SlimeKit.drawWorld` does it.
 */
function poolLayer(ctx: PreviewCtx, pools: Pool[]): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    for (const p of pools) {
      AcidFx.drawPool(g, ctx.tint, p.x, p.y, p.radius, elapsed / 1000, p.seed, p.hot, p.alpha ?? 1);
    }
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
  caption: 'Click — 15 lashes at 1 damage each, 650 px/s; 20 of them while you stand in acid',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    // The caster is standing in their own acid, which is what buys the extra five lashes.
    poolLayer(ctx, [{ x: ctx.cx, y: ctx.cy + 4, radius: 56, hot: false, seed: seeded() }]);
    const tally = label(ctx, ctx.tx, ctx.ty - 34, '#88ff33', 12);
    let dealt = 0;
    ctx.at(400, () => barrage(ctx, fx, av, 20, ctx.tx, () => {
      dealt++;
      tally.setText(`${dealt}`);
    }));
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
  caption: 'E — three permanent 56px pools at 110/180/250px: 5 on first touch, then 2 every 2s',
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
          pools.push({ x, y, radius: 56, hot: true, seed: seeded() });
          fx.ring(x, y, 56 * 0.3, 56, ACID.hotRim, 340, 3, 4);
          fx.fizz(x, y, 5, 56 * 0.7, 4, VILE_TONES);
        });
      }
      float(ctx, ctx.cx, ctx.cy - 30, '🧪 Vile Spray!', '#66ff33');
    });

    // The middle pool has somebody standing in it, so it spends its bite and goes dark.
    ctx.at(1600, () => {
      const p = pools.find((q) => q.x === ctx.cx + 180);
      if (!p) return;
      p.hot = false;
      fx.splash(ctx.cx + 180, ctx.cy, 40, { droplets: 8, fizz: 3, etch: false, depth: 8, tones: VILE_TONES });
      float(ctx, ctx.cx + 180, ctx.cy - 24, '5', '#66ff33', 13);
    });
    for (const d of [3600]) {
      ctx.at(d, () => float(ctx, ctx.cx + 180, ctx.cy - 24, '2', '#66ff33', 11));
    }
  },
};

export const vileSprayUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Spray Spread — every 2s each pool has a 20% chance to bud one at 55% its size',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    const count = label(ctx, ctx.w * 0.5, 12, '#88ff33', 11);
    ctx.onFrame(() => count.setText(`${pools.length} pools`));

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
        float(ctx, at.x, at.y - 30, '🐍 Out of acid — surfaced!', '#99ff66', 10);
      });
    });
  },
};

export const snakeBurrowUpgraded: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Rattling Strike — surfacing detonates for 20 in 90px, and they drip a pool a second for 5s',
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

// ══ F — Purge ═════════════════════════════════════════════════════════

export const purge: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'F — 15/30/45 damage and 3/8/15s of Purged, decided by how much acid is on the floor',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    const cov = label(ctx, ctx.w * 0.5, 12, '#88ff33', 11);
    let coverage = 0.05;
    ctx.onFrame(() => cov.setText(`${Math.round(coverage * 100)}% acid  —  stage ${coverage < 0.24 ? 1 : coverage < 0.5 ? 2 : 3}`));

    /** One throw at the stage the floor currently deserves. */
    const throwBall = (stageIndex: 1 | 2 | 3): void => {
      const dmg = [15, 30, 45][stageIndex - 1];
      const mult = [1, 1.25, 1.5][stageIndex - 1];
      const purgeS = [3, 8, 15][stageIndex - 1];
      av.play('slam', ctx.aim);
      fx.muzzleSpray(ctx.cx, ctx.cy, ctx.aim, 1 + stageIndex * 0.4, 7, VILE_TONES);
      fx.ring(ctx.cx, ctx.cy, 10, 30 + stageIndex * 16, ACID.neon, 300 + stageIndex * 90, 3, 5);
      fx.droplets(ctx.cx, ctx.cy, 4 + stageIndex * 4, {
        speed: 200, angle: ctx.aim, spread: 0.5, size: 3.4 + stageIndex, life: 420, depth: 6, tones: VILE_TONES,
      });
      float(ctx, ctx.cx, ctx.cy - 30, `☠️ Purge (Stage ${stageIndex})`, '#66ff33', 10);
      ctx.fly({
        texture: 'proj-purge', from: { x: ctx.cx + 30, y: ctx.cy }, to: { x: ctx.tx, y: ctx.ty },
        speed: 220 * mult, rotate: false,
        onHit: () => {
          fx.splash(ctx.tx, ctx.ty, 52, { droplets: 12, fizz: 4, depth: 8, tones: VILE_TONES });
          float(ctx, ctx.tx, ctx.ty - 26, `${dmg}`, '#66ff33', 14);
          float(ctx, ctx.tx, ctx.ty - 42, `☠️ Purged ${purgeS}s`, '#66ff33', 10);
          // The stat-strip tell: their buffs boiling off for the duration.
          const aura = ctx.capture(() => new AcidAura(ctx.scene, ctx.tint, 'purge', VILE_TONES, 28, 4));
          ctx.onFrame((dt) => aura.update(dt, ctx.tx, ctx.ty, 1));
        },
      });
    };

    ctx.at(400, () => throwBall(1));
    // Six sprays later the same throw is a different ability.
    ctx.at(2600, () => {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        pools.push({ x: ctx.cx + 120 + Math.cos(a) * 130, y: ctx.cy + Math.sin(a) * 52, radius: 56, hot: false, seed: seeded() });
      }
      coverage = 0.55;
      float(ctx, ctx.w * 0.5, 30, 'FLOOR PAINTED', '#88ff33', 10);
    });
    ctx.at(3400, () => throwBall(3));
  },
};

export const purgeUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Meltdown — a stage-3 hit melts them for 3s, and the puddles carry their buffs to you',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const vx = ctx.cx + 230;
    const pools: Pool[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      pools.push({ x: ctx.cx + 140 + Math.cos(a) * 140, y: ctx.cy + Math.sin(a) * 54, radius: 56, hot: false, seed: seeded() });
    }
    poolLayer(ctx, pools);

    // The victim, drawn by the script so it can visibly shrink 10% a tick.
    let size = 1;
    const vg = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame(() => {
      vg.clear();
      vg.fillStyle(0x2b2f3d, 1); vg.fillCircle(vx, ctx.cy, 17 * size);
      vg.fillStyle(0x3c4254, 1); vg.fillCircle(vx, ctx.cy, 13 * size);
      vg.fillStyle(0x8e97ad, 0.9);
      vg.fillCircle(vx - 5 * size, ctx.cy - 4 * size, 3.2 * size);
      vg.fillCircle(vx + 5 * size, ctx.cy - 4 * size, 3.2 * size);
    });

    // Melt puddles, dyed the victim's colour and carrying two banked buffs each.
    const melt: { x: number; y: number; seed: number; buffs: number; taken: boolean }[] = [];
    const mg = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    ctx.onFrame((_dt, elapsed) => {
      mg.clear();
      for (const m of melt) {
        if (m.taken) continue;
        AcidFx.drawMeltPuddle(mg, ctx.tint, m.x, m.y, 24, 0x3377bb, elapsed / 1000, m.seed, m.buffs);
      }
    });

    ctx.at(400, () => {
      av.play('slam', ctx.aim);
      fx.muzzleSpray(ctx.cx, ctx.cy, ctx.aim, 2.2, 7, VILE_TONES);
      ctx.fly({
        texture: 'proj-purge', from: { x: ctx.cx + 30, y: ctx.cy }, to: { x: vx, y: ctx.cy },
        speed: 330, rotate: false,
        onHit: () => {
          fx.splash(vx, ctx.cy, 52, { droplets: 12, fizz: 4, depth: 8, tones: VILE_TONES });
          float(ctx, vx, ctx.cy - 26, '45', '#66ff33', 14);
          float(ctx, vx, ctx.cy - 44, '🫠 Melting!', '#33cc33', 11);
          const aura = ctx.capture(() => new AcidAura(ctx.scene, ctx.tint, 'melt', VILE_TONES, 24, 4));
          let melting = true;
          ctx.onFrame((dt) => { if (melting) aura.update(dt, vx, ctx.cy, 1); });
          // Three ticks at 1s: 10% HP, 10% max HP, 10% smaller, one puddle each.
          for (let i = 1; i <= 3; i++) {
            ctx.at(i * 1000, () => {
              size = Math.max(0.3, size * 0.9);
              melt.push({ x: vx + (i - 2) * 26, y: ctx.cy + 6, seed: seeded(), buffs: 2, taken: false });
              float(ctx, vx, ctx.cy - 22, '−10% HP / max / size', '#33cc33', 9);
            });
          }
          ctx.at(3200, () => { melting = false; aura.destroy(); });
        },
      });
    });

    // Walking over one puts their stats on for 8 seconds.
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
      ? 'Acid Flood — every pool grows 6px/s while the rain falls, capped at 2.2× and kept'
      : 'Q — 8s of rain, 6 damage every 0.5s to anything standing in any pool',
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

export const passiveAcidPools: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'A fresh pool bites once for 5, then cools and ticks 2 every 2s for the rest of the match',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const pool: Pool = { x: ctx.cx + 150, y: ctx.cy, radius: 56, hot: true, seed: seeded() };
    poolLayer(ctx, [pool]);
    const state = label(ctx, pool.x, pool.y - 46, '#88ff33', 10);
    ctx.onFrame(() => state.setText(pool.hot ? 'NEON — bites for 5' : 'COOLED — 2 every 2s, forever'));

    const walker = { x: ctx.cx, y: ctx.cy };
    const wg = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
    ctx.onFrame((dt, elapsed) => {
      if (elapsed > 900) walker.x = Math.min(pool.x, walker.x + 90 * (dt / 1000));
      wg.clear();
      wg.fillStyle(0x2b2f3d, 1); wg.fillCircle(walker.x, walker.y, 17);
      wg.fillStyle(0x3c4254, 1); wg.fillCircle(walker.x, walker.y, 13);
      wg.fillStyle(0x8e97ad, 0.9);
      wg.fillCircle(walker.x - 5, walker.y - 4, 3.2); wg.fillCircle(walker.x + 5, walker.y - 4, 3.2);
      // First touch of the rim spends the pool's bite for good.
      if (pool.hot && Phaser.Math.Distance.Between(walker.x, walker.y, pool.x, pool.y) <= pool.radius) {
        pool.hot = false;
        fx.splash(walker.x, walker.y, 40, { droplets: 8, fizz: 3, etch: false, depth: 8, tones: VILE_TONES });
        fx.fizz(pool.x, pool.y, 6, pool.radius, 4, VILE_TONES);
        float(ctx, walker.x, walker.y - 24, '5', '#66ff33', 14);
        // Then the quiet tick, at its real 2s cadence, for as long as they stand there.
        for (let i = 1; i <= 3; i++) {
          ctx.at(i * 2000, () => {
            fx.droplets(walker.x, walker.y + 8, 3, {
              speed: 60, angle: -Math.PI / 2, spread: 1, size: 2.4, life: 380, depth: 5, tones: VILE_TONES,
            });
            float(ctx, walker.x, walker.y - 20, '2', '#225511', 11);
          });
        }
      }
    });
  },
};

export const passiveAcidCoverage: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Coverage gates the kit: 24% and 50% are the Purge stages, 50% unlocks Breakdown',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    const readout = label(ctx, ctx.w * 0.5, 12, '#88ff33', 13);
    // Coverage is total pool area against screen area, exactly as `computeAcidCoveragePct` does.
    const arenaArea = ctx.w * ctx.h;
    ctx.onFrame(() => {
      const cov = Math.min(1, pools.reduce((s, p) => s + Math.PI * p.radius * p.radius, 0) / arenaArea);
      const stage = cov < 0.24 ? 1 : cov < 0.5 ? 2 : 3;
      readout.setText(`${Math.round(cov * 100)}% acid   —   Purge stage ${stage}${cov >= 0.5 ? '   —   BREAKDOWN READY' : ''}`);
    });

    // Six sprays' worth, one every 1.2s, which is roughly the ability's real cooldown pacing.
    for (let s = 0; s < 6; s++) {
      ctx.at(400 + s * 1200, () => {
        const ang = -0.5 + s * 0.22;
        av.play('sweep', ang);
        fx.muzzleSpray(ctx.cx, ctx.cy, ang, 1.6, 7, VILE_TONES);
        for (const dist of [110, 180, 250]) {
          const x = ctx.cx + Math.cos(ang) * dist, y = ctx.cy + Math.sin(ang) * dist;
          pools.push({ x, y, radius: 56, hot: true, seed: seeded() });
          fx.ring(x, y, 17, 56, ACID.hotRim, 340, 3, 4);
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

export const masteryBreakdown: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Breakdown — rooted 3s, 200 lashes in every direction, 12 pools leaked underneath',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    av.setMastered(true);
    dummy(ctx, ctx.cx + 130, ctx.cy);
    const pools: Pool[] = [];
    // The 50% floor the ability refuses to cast below.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      pools.push({ x: ctx.cx + 120 + Math.cos(a) * 150, y: ctx.cy + Math.sin(a) * 60, radius: 56, hot: false, seed: seeded() });
    }
    poolLayer(ctx, pools);

    ctx.at(400, () => {
      av.play('flex');
      float(ctx, ctx.cx, ctx.cy - 40, '☣️ BREAKDOWN!', '#33ff33', 12);
      fx.splash(ctx.cx, ctx.cy, 90, { droplets: 20, fizz: 6, duration: 560, depth: 6, tones: VILE_TONES });
      const aura = ctx.capture(() => new AcidAura(ctx.scene, ctx.tint, 'breakdown', VILE_TONES, 34, 4));
      let live = true;
      ctx.onFrame((dt) => { if (live) aura.update(dt, ctx.cx, ctx.cy, 1); });
      ctx.at(3000, () => { live = false; aura.destroy(); });

      // 200 lashes at 650 px/s, one every 15ms, in fully random directions. Rooted throughout.
      for (let i = 0; i < 200; i++) {
        ctx.at(Math.floor(i * 3000 / 200), () => {
          const ang = Math.random() * Math.PI * 2;
          ctx.fly({
            texture: 'proj-acid-whip',
            from: { x: ctx.cx + Math.cos(ang) * 24, y: ctx.cy + Math.sin(ang) * 24 },
            to: { x: ctx.cx + Math.cos(ang) * 700, y: ctx.cy + Math.sin(ang) * 700 },
            speed: 650, pierce: true,
          });
        });
      }
      // 12 leaked pools under the caster, one every 250ms.
      for (let i = 0; i < 12; i++) {
        ctx.at(Math.floor(i * 3000 / 12), () => {
          const ox = Phaser.Math.Between(-16, 16), oy = Phaser.Math.Between(-16, 16);
          pools.push({ x: ctx.cx + ox, y: ctx.cy + oy, radius: 20, hot: true, seed: seeded() });
          fx.droplets(ctx.cx + ox, ctx.cy - 6, 3, {
            speed: 40, angle: Math.PI / 2, spread: 0.6, size: 3, life: 380, fall: 30, depth: 6, tones: VILE_TONES,
          });
        });
      }
    });
  },
};
