import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  ACID, AcidAura, AcidAvatar, AcidFx, POISONS, PoisonKind, STING_TONES, VILE_TONES,
  drawAcidBar, drawAcidBomb, drawAcidFloor, drawAfflictions, drawPoisonWheel, drawToxinMark, drawVenomBlob,
} from '../../../elements/kits/AcidVisuals';
import { AcidGrid, CellState } from '../../../elements/kits/AcidGrid';

/**
 * Venom's showcases (element id `slime`).
 *
 * The floor is the kit's real `AcidGrid`, painted through the kit's own `drawAcidFloor`, and the
 * blob, the bomb, the poison wheel and the marks on a poisoned body are the kit's own draw
 * functions — so a retune to any of them shows up here the same day. A board is still described
 * as circles (`Pool`) and rasterised into a grid each frame. Everything else (`splash`,
 * `muzzleSpray`, `gather`, `rainDrop`, the `AcidAura` styles) is the kit's own `AcidFx`, driven
 * with the kit's own numbers.
 *
 * Containment: `ctx.at` and `ctx.onFrame` bodies run outside the harness's capture window, so an
 * `AcidAura` or a raw Graphics built inside one goes through `ctx.capture` / `ctx.adopt` by hand.
 */

// ── Staging ───────────────────────────────────────────────────────────

function stage(ctx: PreviewCtx, opts?: { noDummy?: boolean }): { fx: AcidFx; av: AcidAvatar } {
  const fx = ctx.capture(() => new AcidFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new AcidAvatar(ctx.scene, ctx.tint, VILE_TONES)) as AcidAvatar;
  av.setFacing(ctx.aim);
  av.setHold('gun', ctx.aim);
  if (!opts?.noDummy) ctx.addDummy();
  return { fx, av };
}

/**
 * The caster, positioned by the script rather than by the harness — needed by the loops that
 * physically move an acid fighter (swimming a burrow, walking a footprint trail). The script
 * sets `bodyTexture: ''` so the harness stages no body of its own.
 */
function drivenCaster(
  ctx: PreviewCtx, read: () => { x: number; y: number; alpha: number },
): AcidAvatar {
  if (ctx.scene.textures.exists('elem-slime')) {
    const body = ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, 'elem-slime').setDepth(5));
    ctx.onFrame(() => { const s = read(); body.setPosition(s.x, s.y).setAlpha(s.alpha); });
  }
  const av = ctx.useAvatar(() => new AcidAvatar(ctx.scene, ctx.tint, VILE_TONES)) as AcidAvatar;
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

/**
 * One Inject shot the way the kit fires it: a blob at 720 px/s out of the needle, dribbling a thin
 * line of acid behind it and leaving a 34px puddle where it lands. `stopX` lets a shot end early
 * (on a bomb in the air) without the puddle.
 */
function injectShot(
  ctx: PreviewCtx, fx: AcidFx, pools: Pool[], poison: PoisonKind | null, onHit?: () => void, stopX?: number, y = ctx.cy,
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const seed = seeded();
  let x = ctx.cx + 46;
  let last = x;
  let done = false;
  fx.muzzleSpray(x, ctx.cy, ctx.aim, 1.15, 7, VILE_TONES);
  const color = poison !== null ? POISONS[poison].color : ctx.tint(VILE_TONES.hot);
  const dark = poison !== null ? POISONS[poison].dark : ctx.tint(VILE_TONES.body);
  const end = stopX ?? ctx.tx - 18;
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    if (done) return;
    x += 720 * (dt / 1000);
    while (x - last >= 16 && last < end) { pools.push({ x: last, y, radius: 9, hot: true, seed }); last += 16; }
    if (x >= end) {
      done = true;
      if (stopX === undefined) {
        pools.push({ x: ctx.tx, y: ctx.ty, radius: 34, hot: true, seed: seeded() });
        fx.ring(ctx.tx, ctx.ty, 10, 34, ACID.hotRim, 340, 3, 4);
        fx.splash(ctx.tx, ctx.ty, 28, { droplets: 6, fizz: 2, etch: false, depth: 8, tones: VILE_TONES });
      }
      onHit?.();
      return;
    }
    drawVenomBlob(g, x, y, 0, color, dark, elapsed / 1000, seed);
  });
}

/** The syringe barrel over a three-shot burst and the self-stab that refills it, on the kit's clock. */
function magazine(ctx: PreviewCtx, av: AcidAvatar, loaded: () => PoisonKind | null): { fire: () => boolean } {
  let ammo = 3;
  let reloadAt = -1;
  ctx.onFrame((_dt, elapsed) => {
    const color = loaded() !== null ? POISONS[loaded()!].color : null;
    if (reloadAt >= 0) {
      const p = (elapsed - reloadAt) / 1000;
      if (p >= 1) { reloadAt = -1; ammo = 3; av.setSyringe(1, color, 0); return; }
      av.setSyringe(Phaser.Math.Clamp((p - 0.4) / 0.6, 0, 1), color, Math.max(0.01, p));
      return;
    }
    av.setSyringe(ammo / 3, color, 0);
  });
  let now = 0;
  ctx.onFrame((_dt, elapsed) => { now = elapsed; });
  return {
    fire: () => {
      if (ammo <= 0 || reloadAt >= 0) return false;
      ammo--;
      if (ammo === 0) reloadAt = now;
      return true;
    },
  };
}

// ══ CLICK — Inject ════════════════════════════════════════════════════

export const inject: PreviewScript = {
  duration: 5200,
  caption: 'Click — 12 damage and 2 toxin a blob; it trickles acid and puddles on a hit; 3 shots, then a 1s self-stab',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    let toxin = 0;
    toxinMeter(ctx, () => ({ x: ctx.tx, y: ctx.ty }), () => toxin);
    const mag = magazine(ctx, av, () => null);
    // Two barrels: three shots, the stab, three more.
    for (const d of [400, 820, 1240, 2700, 3120, 3540]) {
      ctx.at(d, () => {
        if (!mag.fire()) return;
        injectShot(ctx, fx, pools, null, () => { toxin += 2; float(ctx, ctx.tx, ctx.ty - 24, '12', '#66ff33', 12); });
      });
    }
    ctx.at(1500, () => float(ctx, ctx.cx, ctx.cy - 40, 'RELOAD', '#ccff88', 10));
  },
};

export const injectUpgraded: PreviewScript = {
  duration: 4200,
  caption: 'Corrosive Dose — each hit also eats 12 off their maximum HP, permanently',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    const mag = magazine(ctx, av, () => null);

    // A max-HP bar over the target, shrinking from the right as each shot eats into it.
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
    for (const d of [400, 820, 1240]) {
      ctx.at(d, () => {
        if (!mag.fire()) return;
        injectShot(ctx, fx, pools, null, () => { maxHp -= 12; float(ctx, ctx.tx, ctx.ty - 52, '−12 MAX HP', '#88ff33', 10); });
      });
    }
  },
};

// ══ E — Pick Your Poison ══════════════════════════════════════════════

const POISON_LINES = [
  '5 / s for 5s · each tick +3% damage taken (max 15%)',
  '8s · no dash, no dodge · slow and slipping on acid',
  '8s · every positive effect stripped',
  '8s · ×2 damage on acid · drips puddles',
];

/** Opens the real wheel round the caster for `ms`, leaning toward `kind`, then loads it. */
function openWheel(ctx: PreviewCtx, fx: AcidFx, kind: PoisonKind, ms: number, onLoad: () => void): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const name = label(ctx, ctx.cx, ctx.cy - 104, '#ffffff', 11);
  let born = -1;
  let open = true;
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    if (!open) return;
    if (born < 0) born = elapsed;
    drawPoisonWheel(g, ctx.cx, ctx.cy, 64, kind, (elapsed - born) / 140, elapsed / 1000);
    name.setText(POISONS[kind].name).setColor(`#${POISONS[kind].color.toString(16).padStart(6, '0')}`);
  });
  ctx.at(ms, () => {
    open = false;
    name.setText('');
    const p = POISONS[kind];
    fx.ring(ctx.cx + Math.cos(p.angle) * 64, ctx.cy + Math.sin(p.angle) * 64, 20, 4, p.color, 260, 3, 9);
    fx.ring(ctx.cx, ctx.cy, 34, 10, p.color, 340, 4, 8);
    onLoad();
  });
}

/** The kit's own marks on a poisoned dummy, one flag per poison. */
function afflicted(ctx: PreviewCtx, x: number, y: number, state: { on: [number, number, number, number]; vuln: number }): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const aura = ctx.capture(() => new AcidAura(ctx.scene, ctx.tint, 'purge', VILE_TONES, 28, 4));
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    drawAfflictions(g, x, y, elapsed / 1000, state.on[0], state.vuln, state.on[1], state.on[3]);
    aura.update(dt, x, y, state.on[2] ? 1 : 0);
  });
}

export const pickYourPoison: PreviewScript = {
  duration: 9600,
  caption: 'E — hold for the wheel, release toward a vial: your next Inject carries that poison',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    // The target stands on acid, which is where Paralyzing and Melting bite.
    const pools: Pool[] = [{ x: ctx.tx, y: ctx.ty, radius: 60, hot: false, seed: seeded() }];
    poolLayer(ctx, pools);
    let loaded: PoisonKind | null = null;
    const mag = magazine(ctx, av, () => loaded);
    const state = { on: [0, 0, 0, 0] as [number, number, number, number], vuln: 0 };
    afflicted(ctx, ctx.tx, ctx.ty, state);
    const line = label(ctx, ctx.w * 0.5, 14, '#ffffff', 10);

    for (let k = 0; k < 4; k++) {
      const kind = k as PoisonKind;
      const t0 = 300 + k * 2300;
      ctx.at(t0, () => {
        state.on = [0, 0, 0, 0];
        state.vuln = 0;
        line.setText('');
        av.play('clap');
        openWheel(ctx, fx, kind, 650, () => { loaded = kind; });
      });
      ctx.at(t0 + 950, () => {
        mag.fire();
        const carried = loaded;
        loaded = null;
        injectShot(ctx, fx, pools, carried, () => {
          state.on[kind] = 1;
          const p = POISONS[kind];
          fx.ring(ctx.tx, ctx.ty, 8, 46, p.color, 380, 3.5, 8);
          line.setText(`${p.name} — ${POISON_LINES[kind]}`).setColor(`#${p.color.toString(16).padStart(6, '0')}`);
          if (kind === 0) {
            for (let i = 1; i <= 3; i++) {
              ctx.at(i * 320, () => { state.vuln = Math.min(1, state.vuln + 0.2); float(ctx, ctx.tx, ctx.ty - 26, '5', '#ff5533', 12); });
            }
          }
        });
      });
    }
  },
};

export const pickYourPoisonUpgraded: PreviewScript = {
  duration: 4600,
  caption: 'Double Dose — one pick loads your next two Inject shots',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    const pools: Pool[] = [{ x: ctx.tx, y: ctx.ty, radius: 60, hot: false, seed: seeded() }];
    poolLayer(ctx, pools);
    let shots = 0;
    const mag = magazine(ctx, av, () => (shots > 0 ? 3 : null));
    const state = { on: [0, 0, 0, 0] as [number, number, number, number], vuln: 0 };
    afflicted(ctx, ctx.tx, ctx.ty, state);
    ctx.at(300, () => { av.play('clap'); openWheel(ctx, fx, 3, 650, () => { shots = 2; float(ctx, ctx.cx, ctx.cy - 40, 'MELTING ×2', '#cc55ff', 11); }); });
    for (const d of [1300, 1720, 2140]) {
      ctx.at(d, () => {
        mag.fire();
        const carried: PoisonKind | null = shots > 0 ? 3 : null;
        if (shots > 0) shots--;
        injectShot(ctx, fx, pools, carried, () => { if (carried !== null) state.on[3] = 1; });
      });
    }
  },
};

// ══ R — Acid Reflux ═══════════════════════════════════════════════════

const BOMB_SIZES = [
  { damage: 25, radius: 80, size: 12 },
  { damage: 38, radius: 105, size: 15 },
  { damage: 52, radius: 130, size: 18 },
];

/**
 * Pull a bomb out, throw it at the kit's 300 px/s, and burst it at `burstX`. `shootAt` (ms after
 * the throw) fires an Inject at it in the air and sheds the five cluster bombs.
 */
function throwBomb(
  ctx: PreviewCtx, fx: AcidFx, av: AcidAvatar, pools: Pool[], tier: number, burstX: number,
  opts: { shootAt?: number; onBurst?: () => void } = {},
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const def = BOMB_SIZES[tier - 1];
  const bomb = { x: ctx.cx - 16, y: ctx.cy - 30, held: true, live: true, grow: 0, spin: 0 };
  const lets: { x0: number; y0: number; x1: number; y1: number; p: number }[] = [];
  av.play('flex');
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    const t = elapsed / 1000;
    for (const c of lets) {
      if (c.p >= 1) continue;
      c.p = Math.min(1, c.p + dt / 520);
      const x = Phaser.Math.Linear(c.x0, c.x1, c.p);
      const y = Phaser.Math.Linear(c.y0, c.y1, c.p) - Math.sin(c.p * Math.PI) * 46;
      g.lineStyle(1.4, ctx.tint(ACID.hotRim), 0.25 + 0.5 * c.p);
      g.strokeEllipse(c.x1, c.y1, 88 * (0.4 + 0.6 * c.p), 53 * (0.4 + 0.6 * c.p));
      drawAcidBomb(g, ctx.tint, x, y, 6.5, 1, t, c.p * 9, VILE_TONES);
      if (c.p >= 1) {
        pools.push({ x: c.x1, y: c.y1, radius: 44, hot: true, seed: seeded() });
        fx.splash(c.x1, c.y1, 44, { droplets: 8, fizz: 3, depth: 6, tones: VILE_TONES });
      }
    }
    if (!bomb.live) return;
    bomb.grow = Math.min(1, bomb.grow + dt / 220);
    bomb.spin += dt * 0.007;
    if (!bomb.held) bomb.x += 300 * (dt / 1000);
    drawAcidBomb(g, ctx.tint, bomb.x, bomb.held ? bomb.y + Math.sin(t * 5) * 2 : bomb.y, def.size * bomb.grow, tier, t, bomb.spin, VILE_TONES);
    if (!bomb.held && bomb.x >= burstX) {
      bomb.live = false;
      pools.push({ x: burstX, y: ctx.cy, radius: def.radius, hot: true, seed: seeded() });
      fx.splash(burstX, ctx.cy, def.radius, { droplets: 14 + tier * 6, fizz: 6, duration: 520, depth: 6, tones: tier >= 3 ? STING_TONES : VILE_TONES });
      fx.ring(burstX, ctx.cy, def.radius * 0.2, def.radius * 1.1, tier >= 3 ? ACID.sting : ACID.neon, 420, 5 + tier, 7);
      opts.onBurst?.();
    }
  });
  ctx.at(650, () => {
    bomb.held = false;
    bomb.x = ctx.cx + 28;
    bomb.y = ctx.cy;
    av.play('slam', ctx.aim);
    if (opts.shootAt === undefined) return;
    ctx.at(opts.shootAt, () => {
      // Lead it: the shot covers the gap at 720 while the bomb keeps going at 300.
      const meet = bomb.x + 300 * ((bomb.x - ctx.cx - 46) / (720 - 300));
      injectShot(ctx, fx, pools, null, () => {
        fx.splash(bomb.x, bomb.y, 46, { droplets: 14, fizz: 4, etch: false, depth: 9, tones: VILE_TONES });
        fx.ring(bomb.x, bomb.y, 8, 54, ACID.glow, 300, 4, 9);
        for (let i = 0; i < 5; i++) {
          const a = ((i / 4) - 0.5) * 2.6;
          const d = 80 + (i % 2) * 50;
          lets.push({ x0: bomb.x, y0: bomb.y, x1: bomb.x + Math.cos(a) * d, y1: bomb.y + Math.sin(a) * d * 0.6, p: 0 });
        }
      }, meet);
    });
  });
}

export const acidReflux: PreviewScript = {
  duration: 7600,
  scale: 0.8,
  caption: 'R — pull it out, throw it: 25 in 80px and a crater of acid. Shoot it in the air for 5 cluster bombs',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    let toxin = 0;
    toxinMeter(ctx, () => ({ x: ctx.tx, y: ctx.ty }), () => toxin);
    const mag = magazine(ctx, av, () => null);
    // The three sizes, across the top: what the bomb becomes as the arena fills.
    const row = ctx.adopt(ctx.scene.add.graphics().setDepth(13));
    const names = ['under 15% acid', '15%', '35%'].map((s, i) => label(ctx, ctx.w * (0.3 + i * 0.2), 44, '#ccff88', 9).setText(s));
    void names;
    ctx.onFrame((_dt, elapsed) => {
      row.clear();
      for (let i = 0; i < 3; i++) drawAcidBomb(row, ctx.tint, ctx.w * (0.3 + i * 0.2), 22, 7 + i * 2, i + 1, elapsed / 1000, elapsed / 900, VILE_TONES);
    });
    // First throw: straight into the target.
    ctx.at(300, () => throwBomb(ctx, fx, av, pools, 1, ctx.tx - 20, {
      onBurst: () => { toxin += 5; float(ctx, ctx.tx, ctx.ty - 26, '25', '#66ff33', 13); },
    }));
    // Second throw: shot out of the air on the way.
    ctx.at(3300, () => {
      throwBomb(ctx, fx, av, pools, 1, ctx.tx - 20, {
        shootAt: 160,
        onBurst: () => { toxin += 6; float(ctx, ctx.tx, ctx.ty - 26, '25', '#66ff33', 13); },
      });
      ctx.at(650 + 160, () => { mag.fire(); });
    });
  },
};

export const acidRefluxUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.8,
  caption: 'Seeping Reflux — every 2s each bomb pool has a 20% chance to bud one at 55% its size',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    ctx.at(300, () => throwBomb(ctx, fx, av, pools, 2, ctx.cx + 200));
    // Budding is a dice roll in the kit; here it is laid out so the loop always shows it.
    const buds: [number, number, number][] = [[2400, 0.4, 118], [3200, 2.6, 124], [4000, -1.3, 120], [4800, 1.5, 150], [5600, -2.4, 156]];
    for (const [d, a, dist] of buds) {
      ctx.at(d, () => {
        const x = ctx.cx + 200 + Math.cos(a) * dist, y = ctx.cy + Math.sin(a) * dist * 0.8;
        pools.push({ x, y, radius: 58, hot: true, seed: seeded() });
        fx.ring(x, y, 17, 58, ACID.hotRim, 340, 3, 4);
        fx.fizz(x, y, 5, 40, 4, VILE_TONES);
      });
    }
  },
};

// ══ F — Burrow ════════════════════════════════════════════════════════

function burrowScript(rattling: boolean): PreviewScript {
  return {
    duration: 7000,
    scale: 0.9,
    bodyTexture: '',
    caption: rattling
      ? 'Rattling Strike — surfacing also blasts 20 in 90px, they drip acid for 5s, and the bite is toxin ×1.5'
      : 'F — invincible and ×1.35 speed under your acid; come up biting: 30, debuffs back to full, toxin ×1.25',
    run(ctx) {
      const fx = ctx.capture(() => new AcidFx(ctx.scene, ctx.tint).setSink(ctx.sink));
      const at = { x: ctx.cx, y: ctx.cy, alpha: 1 };
      const av = drivenCaster(ctx, () => at);
      av.setHold('gun', ctx.aim);
      // A lane of acid to swim down, with somebody standing at the far end of it.
      const pools: Pool[] = [0, 80, 160, 240].map((d) => ({ x: ctx.cx + d, y: ctx.cy, radius: 56, hot: false, seed: seeded() }));
      poolLayer(ctx, pools);
      const vx = ctx.cx + 290;
      dummy(ctx, vx, ctx.cy);
      let toxin = 40;
      toxinMeter(ctx, () => ({ x: vx, y: ctx.cy }), () => toxin);
      // A Melting poison already on them, most of the way run down.
      const state = { on: [0, 0, 0, 1] as [number, number, number, number], vuln: 0 };
      afflicted(ctx, vx, ctx.cy, state);
      let left = 3.2;
      const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(13));
      const cap = label(ctx, vx, ctx.cy - 62, '#cc55ff', 10);
      ctx.onFrame((dt) => {
        left = Math.max(0, left - dt / 1000);
        state.on[3] = left > 0 ? 1 : 0;
        bar.clear();
        bar.fillStyle(0x1a0a24, 0.9);
        bar.fillRect(vx - 38, ctx.cy - 54, 76, 6);
        bar.fillStyle(POISONS[3].color, 1);
        bar.fillRect(vx - 37, ctx.cy - 53, 74 * (left / 8), 4);
        cap.setText(`MELTING ${left.toFixed(1)}s`);
      });

      ctx.at(600, () => {
        at.alpha = 0.4;
        av.setHold('brace', ctx.aim);
        fx.gather(at.x, at.y, 46, 400, () => ({ x: at.x, y: at.y }), 5, VILE_TONES);
        fx.ring(at.x, at.y, 46, 12, ACID.hotRim, 380, 3.5, 4);
        const aura = ctx.capture(() => new AcidAura(ctx.scene, ctx.tint, 'burrow', VILE_TONES, 30, 4));
        let under = true;
        ctx.onFrame((dt) => {
          if (!under) return;
          aura.update(dt, at.x, at.y, 1);
          // ×1.35 of an ordinary walk.
          at.x = Math.min(vx - 70, at.x + 150 * 1.35 * (dt / 1000));
        });
        ctx.at(700, () => float(ctx, at.x, at.y - 22, 'IMMUNE', '#99ff66', 10));

        ctx.at(1500, () => {
          under = false;
          aura.destroy();
          at.alpha = 1;
          av.setHold('gun', ctx.aim);
          av.play('slam', ctx.aim);
          fx.splash(at.x, at.y, 56, { droplets: 12, fizz: 4, etch: false, depth: 6, tones: VILE_TONES });
          fx.bite(at.x, at.y, 0, 113, rattling ? 3 : 2, 8, VILE_TONES);
          fx.punctures(vx, ctx.cy, 0, 9, VILE_TONES);
          float(ctx, vx, ctx.cy - 24, '30', '#66ff33', 13);
          left = 8;
          toxin = rattling ? 60 : 50;
          float(ctx, vx, ctx.cy - 76, rattling ? 'RESTORED · TOXIN ×1.5' : 'RESTORED · TOXIN ×1.25', '#ccff88', 10);
          if (!rattling) return;
          fx.splash(at.x, at.y, 90, { droplets: 18, fizz: 4, depth: 6, duration: 480, tones: STING_TONES });
          float(ctx, vx, ctx.cy - 40, '20', '#ff6666', 12);
          for (let i = 1; i <= 4; i++) {
            ctx.at(i * 900, () => pools.push({ x: vx + (i % 2 ? 14 : -10), y: ctx.cy + (i - 2) * 16, radius: 22, hot: true, seed: seeded() }));
          }
        });
      });
    },
  };
}

export const burrow = burrowScript(false);
export const burrowUpgraded = burrowScript(true);

// ══ Q — Acid Apocalypse ═══════════════════════════════════════════════

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

export const passiveToxin: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Toxin never fades. Each stack makes every new negative effect last 2% longer — ×3 at the cap of 100',
  run(ctx) {
    const { fx, av } = stage(ctx, { noDummy: true });
    dummy(ctx, ctx.tx, ctx.ty);
    const pools: Pool[] = [];
    poolLayer(ctx, pools);
    let toxin = 0;
    toxinMeter(ctx, () => ({ x: ctx.tx, y: ctx.ty }), () => toxin);
    const mag = magazine(ctx, av, () => null);
    // The same 3-second burn, re-applied every beat: watch its bar get longer as the toxin climbs.
    const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(13));
    const cap = label(ctx, ctx.tx, ctx.ty - 66, '#ffaa55', 10);
    const readout = label(ctx, ctx.w * 0.5, 14, '#88ff33', 11);
    let full = 0;
    let left = 0;
    ctx.onFrame((dt) => {
      left = Math.max(0, left - (dt / 1000) * 3.5);
      bar.clear();
      bar.fillStyle(0x24140a, 0.9);
      bar.fillRect(ctx.tx - 62, ctx.ty - 58, 124, 7);
      bar.fillStyle(0xff8833, 1);
      bar.fillRect(ctx.tx - 61, ctx.ty - 57, 122 * (left / 9), 5);
      // Where a plain 3s burn would have ended.
      bar.lineStyle(1.5, 0xffffff, 0.8);
      bar.lineBetween(ctx.tx - 61 + 122 / 3, ctx.ty - 60, ctx.tx - 61 + 122 / 3, ctx.ty - 50);
      cap.setText(full > 0 ? `a 3s burn lasts ${full.toFixed(1)}s` : '');
      readout.setText(`toxin ${Math.floor(toxin)} · debuffs last +${Math.floor(toxin) * 2}%`);
    });
    for (let i = 0; i < 9; i++) {
      ctx.at(400 + i * 900, () => {
        mag.fire();
        // Compressed time: each shot here stands in for a dozen.
        injectShot(ctx, fx, pools, null, () => {
          toxin = Math.min(100, toxin + 13);
          full = 3 * (1 + toxin * 0.02);
          left = full;
        });
      });
    }
  },
};

export const passiveAcidFloor: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Fresh acid nips whoever walks over it; standing on any acid: 1 damage and 1 toxin a second',
  run(ctx) {
    const { fx } = stage(ctx, { noDummy: true });
    const pool: Pool = { x: ctx.cx + 150, y: ctx.cy, radius: 58, hot: true, seed: seeded() };
    poolLayer(ctx, [pool]);
    const state = label(ctx, pool.x, pool.y - 50, '#88ff33', 10);
    ctx.onFrame(() => state.setText(pool.hot ? 'FRESH — nips on contact' : 'SPENT — 1 + 1 toxin / s, forever'));

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
            toxin += 1;
            fx.droplets(walker.x, walker.y + 8, 3, {
              speed: 60, angle: -Math.PI / 2, spread: 1, size: 2.4, life: 380, depth: 5, tones: VILE_TONES,
            });
            float(ctx, walker.x, walker.y - 20, '1  +1 ☠', '#448822', 10);
          });
        }
      }
    });
  },
};


export const passiveAcidification: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'The gauge: at 15% and 35% acid the bomb grows a size; with the mastery, 20/40/60/80% each earn a shed',
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
      drawAcidBar(bar, ctx.tint, ctx.w * 0.5 - 110, 10, 220, 8, cov, elapsed / 1000, VILE_TONES, [0.2, 0.4, 0.6, 0.8], reached, [0.15, 0.35]);
      const size = cov < 0.15 ? 1 : cov < 0.35 ? 2 : 3;
      readout.setText(`${Math.round(cov * 100)}% acid · bomb size ${size} · sheds ${reached}`);
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
  duration: 5600,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Shed Skin — one per milestone (20/40/60/80%): +15% speed, 48 venom darts and a ring of acid',
  run(ctx) {
    const fx = ctx.capture(() => new AcidFx(ctx.scene, ctx.tint).setSink(ctx.sink));
    const at = { x: ctx.cx, y: ctx.cy, alpha: 1 };
    const av = drivenCaster(ctx, () => at);
    av.setMastered(true);
    av.setHold('gun', ctx.aim);
    dummy(ctx, ctx.cx + 130, ctx.cy);
    const pools: Pool[] = [];
    poolLayer(ctx, pools);

    ctx.at(700, () => {
      av.play('flex');
      float(ctx, ctx.cx, ctx.cy - 44, '+15% speed', '#99ff66', 11);
      fx.splash(ctx.cx, ctx.cy, 90, { droplets: 20, fizz: 6, duration: 560, depth: 6, tones: VILE_TONES });
      fx.ring(ctx.cx, ctx.cy, 20, 110, ACID.glow, 520, 5, 6);
      pools.push({ x: ctx.cx, y: ctx.cy, radius: 48, hot: true, seed: seeded() });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        pools.push({ x: ctx.cx + Math.cos(a) * 60, y: ctx.cy + Math.sin(a) * 60, radius: 22, hot: true, seed: seeded() });
      }
      // 48 darts spiralling out over 0.6s.
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
