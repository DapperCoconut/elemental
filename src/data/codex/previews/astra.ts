import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { ASTRA, AstraAvatar } from '../../../elements/kits/AstraVisuals';
import {
  AstraMassFx, MASS, antimatterBlob, blackHoleSky, cometRock, dustCloud, eclipse, floorCracks, massBar, massHalo,
  photonBolt, rockShard, silhouette, throne,
} from '../../../elements/kits/AstraMassVisuals';

/**
 * Astra's showcases.
 *
 * Each loop drives the kit's own painters (`AstraMassVisuals`) at the kit's numbers. The box's
 * walls stand in for the arena's.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const BODY_R = 22;
const MASS_SIZE = 3.2;
const BLOB_SPEED = 540;
const BOOM_R = 120;
const COMET_R = 13;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): AstraMassFx {
  return ctx.capture(() => new AstraMassFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The star's rig, or null when a skin has replaced the character. */
function star(av: unknown): AstraAvatar | null {
  return av instanceof AstraAvatar ? av : null;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: number, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color: hex(color), stroke: '#07061a', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

/** A training dummy that can be moved; returns its live position. */
function dummy(ctx: PreviewCtx, start: { x: number; y: number }, hidden?: () => boolean): { x: number; y: number } {
  const at = { ...start };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    g.clear();
    if (hidden?.()) return;
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
  });
  return at;
}

function stand(ctx: PreviewCtx): AstraAvatar | null {
  const av = star(ctx.useAvatar(() => new AstraAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  return av;
}

/** The mass a showcase is carrying, drawn the way the kit draws it: halo under, bar over. */
function massRig(ctx: PreviewCtx, state: { mass: number; fusion: number }): void {
  const under = ctx.adopt(ctx.scene.add.graphics().setDepth(3.3));
  const over = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((_dt, e) => {
    const c = ctx.casterAt();
    const k = state.mass / 100;
    const r = BODY_R * (1 + MASS_SIZE * k);
    under.clear();
    over.clear();
    massHalo(under, ctx.tint, c.x, c.y, r, k, e / 1000, 1, state.fusion);
    massBar(over, ctx.tint, c.x, c.y - r - 22, k, e / 1000, 1);
  });
}

// ══ PASSIVE — Space Dust ═══════════════════════════════════════════════

export const spaceDust: PreviewScript = {
  duration: 5600,
  scale: 0.8,
  caption: 'Space Dust — clouds add to your mass: slower and far bigger, but the mass takes 75% of every hit',
  run(ctx) {
    const fx = fxOf(ctx);
    stand(ctx);
    const state = { mass: 0, fusion: 0 };
    massRig(ctx, state);
    const readout = label(ctx, ctx.w * 0.5, 14, hex(MASS.dustLit), 11);
    const clouds = [0, 1, 2, 3].map((i) => ({ x: ctx.cx + 60 + i * 50, y: ctx.cy + (i % 2 ? -34 : 30), live: true, seed: 3 + i * 1.7 }));
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3.2));
    ctx.onFrame((_dt, e) => {
      g.clear();
      for (const c of clouds) if (c.live) dustCloud(g, ctx.tint, c.x, c.y, 20, e / 1000, c.seed, 1);
    });
    readout.setText('walk into the clouds');
    clouds.forEach((c, i) => ctx.at(500 + i * 650, () => {
      c.live = false;
      const at = ctx.casterAt();
      fx.eat(c.x, c.y, () => at, false);
      state.mass += 20;
      readout.setText(`mass ${state.mass} — bigger, slower`);
    }));
    ctx.at(3700, () => {
      const at = ctx.casterAt();
      const r = BODY_R * (1 + MASS_SIZE * state.mass / 100);
      fx.shed(at.x, at.y, r, 8);
      state.mass -= 15;
      float(ctx, at.x + 30, at.y - 30, '-5', ASTRA.starHot, 12);
      readout.setText('a 20-damage hit: 15 comes off the mass, 5 reaches you');
    });
  },
};

// ══ Click — Anti-Matter ════════════════════════════════════════════════

export const antimatter: PreviewScript = {
  duration: 4600,
  scale: 0.85,
  caption: 'Anti-Matter — passes through bodies, annihilates on shots, summons and shields. Each blast frees 3 photons that chase the cursor',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const victim = dummy(ctx, { x: ctx.cx + 150, y: ctx.cy });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(MASS.mercuryLit), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    // An enemy shot coming the other way: the thing the blob is actually for.
    const shot = { x: ctx.w - 20, live: true };
    let blobAt = -1;
    const photons: { x: number; y: number; vx: number; vy: number; live: boolean }[] = [];
    ctx.onFrame((_dt, e) => {
      g.clear();
      const c = ctx.casterAt();
      if (blobAt >= 0) {
        const x = c.x + 22 + ((e - blobAt) / 1000) * BLOB_SPEED;
        shot.x -= _dt * 0.3;
        if (shot.live && x >= shot.x - 14) {
          blobAt = -1;
          shot.live = false;
          fx.annihilate(x, c.y, BOOM_R);
          for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + 0.6;
            photons.push({ x, y: c.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, live: true });
          }
          float(ctx, victim.x, victim.y - 30, '-18', MASS.mercuryLit, 12);
          readout.setText('their shot: a 120px shockwave, 18 damage');
        } else {
          g.fillStyle(0xff5a6a, 1); g.fillCircle(shot.x, c.y, 5);
          g.fillStyle(0xffffff, 0.9); g.fillCircle(shot.x, c.y, 2.2);
          antimatterBlob(g, ctx.tint, x, c.y, 10, 0, e / 1000);
        }
      }
      // The photons: flung out of the blast, then drawn in on the cursor (here, held on the dummy).
      for (const ph of photons) {
        if (!ph.live) continue;
        const dts = _dt / 1000;
        ph.vx += ((victim.x - ph.x) * 34 - ph.vx * 3.4) * dts;
        ph.vy += ((victim.y - ph.y) * 34 - ph.vy * 3.4) * dts;
        ph.x += ph.vx * dts;
        ph.y += ph.vy * dts;
        if (Math.hypot(ph.x - victim.x, ph.y - victim.y) < 24) {
          ph.live = false;
          fx.photonHit(ph.x, ph.y);
          float(ctx, victim.x - 20 + photons.indexOf(ph) * 20, victim.y - 36, '-8', MASS.photon);
          readout.setText('3 photons chase the cursor: 8 each');
          continue;
        }
        photonBolt(g, ctx.tint, ph.x, ph.y, Math.atan2(ph.vy, ph.vx), Math.hypot(ph.vx, ph.vy), e / 1000 + ph.vx, 1);
      }
    });
    ctx.at(400, () => {
      const c = ctx.casterAt();
      av?.play('punch', 0);
      fx.launch(c.x + 22, c.y, 0);
      blobAt = 400;
      readout.setText('through the body — no damage');
    });
  },
};

// ══ E — Supernova ══════════════════════════════════════════════════════

export const supernova: PreviewScript = {
  duration: 4200,
  scale: 0.75,
  caption: 'Supernova — throw off up to 45 mass as a flaming shockwave: 12 damage plus 0.5 per point thrown',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const state = { mass: 70, fusion: 0 };
    massRig(ctx, state);
    const victim = dummy(ctx, { x: ctx.cx + 190, y: ctx.cy + 20 });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(MASS.fireHot), 11);
    readout.setText('mass 70');
    ctx.at(1100, () => {
      const c = ctx.casterAt();
      const r = BODY_R * (1 + MASS_SIZE * 0.7) + 105 + 45 * 1.3;
      av?.play('flex');
      fx.supernova(c.x, c.y, r);
      state.mass = 25;
      float(ctx, victim.x, victim.y - 30, '-35', MASS.fireHot, 13);
      readout.setText('45 mass thrown: 12 + 22 damage, and you are small again');
    });
  },
};

// ══ R — Nuclear Fusion ═════════════════════════════════════════════════

export const fusion: PreviewScript = {
  duration: 5000,
  scale: 0.8,
  caption: 'Nuclear Fusion — 3s: shots that enter your hitbox melt into mass, and enemies inside it burn',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const state = { mass: 50, fusion: 0 };
    massRig(ctx, state);
    const r = (): number => BODY_R * (1 + MASS_SIZE * state.mass / 100);
    const victim = dummy(ctx, { x: ctx.cx + 60, y: ctx.cy + 26 });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(MASS.fusion), 11);
    const shots: { x: number; y: number; live: boolean }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((dt) => {
      g.clear();
      const c = ctx.casterAt();
      for (const s of shots) {
        if (!s.live) continue;
        s.x -= dt * 0.36;
        if (state.fusion > 0 && Math.hypot(s.x - c.x, s.y - c.y) < r() + 6) {
          s.live = false;
          fx.melt(s.x, s.y, () => c);
          state.mass = Math.min(100, state.mass + 5);
          readout.setText(`melted: mass ${state.mass}`);
          continue;
        }
        g.fillStyle(0xff5a6a, 1); g.fillCircle(s.x, s.y, 5);
        g.fillStyle(0xffffff, 0.9); g.fillCircle(s.x, s.y, 2.2);
      }
    });
    ctx.at(500, () => {
      const c = ctx.casterAt();
      av?.play('flex');
      fx.ignite(c.x, c.y, r());
      state.fusion = 1;
      readout.setText('the furnace is lit');
    });
    for (let i = 0; i < 5; i++) ctx.at(700 + i * 420, () => shots.push({ x: ctx.w - 20, y: ctx.cy - 40 + i * 20, live: true }));
    for (let i = 0; i < 6; i++) {
      ctx.at(700 + i * 500, () => {
        fx.sear(victim.x, victim.y);
        float(ctx, victim.x + 16, victim.y - 28, '-6', MASS.fire);
      });
    }
    ctx.at(3500, () => { state.fusion = 0; readout.setText('3 seconds'); });
  },
};

// ══ F — Comet ══════════════════════════════════════════════════════════

export const comet: PreviewScript = {
  duration: 7400,
  scale: 0.75,
  caption: 'Comet — falls and stays. Cover it to catch it, hold F to swing it, release to throw it',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const state = { mass: 40, fusion: 0 };
    massRig(ctx, state);
    const victim = dummy(ctx, { x: ctx.cx + 250, y: ctx.cy - 60 });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(MASS.ice), 11);
    const under = ctx.adopt(ctx.scene.add.graphics().setDepth(3.25));
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const c0 = ctx.casterAt();
    const land = { x: c0.x + 44, y: c0.y + 30 };
    let phase: 'none' | 'ground' | 'spin' | 'fly' | 'gone' = 'none';
    let ang = Math.atan2(land.y - c0.y, land.x - c0.x);
    let omega = 2.5;
    const pos = { ...land };
    let vx = 0;
    let vy = 0;
    const shards: { x: number; y: number; seed: number }[] = [];
    let cracked = false;
    ctx.onFrame((dt, e) => {
      const t = e / 1000;
      const c = ctx.casterAt();
      under.clear();
      g.clear();
      if (cracked) floorCracks(under, ctx.tint, land.x, land.y, 70, 1, 4.2);
      for (const s of shards) rockShard(under, ctx.tint, s.x, s.y, 11, t, s.seed, 1);
      const heat = Math.min(1, Math.max(0, (omega - 2.5) / 14.5));
      if (phase === 'spin') {
        omega = Math.min(17, omega + 5.2 * dt / 1000);
        ang += omega * dt / 1000;
        const rim = BODY_R * (1 + MASS_SIZE * state.mass / 100) + 8;
        pos.x = c.x + Math.cos(ang) * rim;
        pos.y = c.y + Math.sin(ang) * rim;
        readout.setText(heat > 0.5 ? 'past halfway it catches fire' : 'hold F: faster and faster');
      } else if (phase === 'fly') {
        pos.x += vx * dt / 1000;
        pos.y += vy * dt / 1000;
        if (Math.hypot(pos.x - victim.x, pos.y - victim.y) < COMET_R + 18 || pos.x > ctx.w - 12 || pos.y < 12 || pos.y > ctx.h - 12 || pos.x < 12) {
          phase = 'gone';
          const a = Math.atan2(vy, vx);
          fx.cometHit(pos.x, pos.y, a, heat);
          float(ctx, victim.x, victim.y - 32, '-70', MASS.fireHot, 14);
          for (let i = 0; i < 4; i++) {
            const sa = a + Math.PI + (i - 1.5) * 0.55;
            shards.push({ x: pos.x + Math.cos(sa) * (46 + i * 17), y: pos.y + Math.sin(sa) * (46 + i * 17), seed: 2 + i * 3.1 });
          }
          readout.setText('it shatters: 4 shards of mass to gather');
        }
      }
      if (phase === 'ground' || phase === 'spin' || phase === 'fly') {
        const moveAng = phase === 'fly' ? Math.atan2(vy, vx) : ang + Math.PI / 2;
        cometRock(g, ctx.tint, pos.x, pos.y, COMET_R, phase === 'ground' ? 0 : heat, moveAng, t, 4.2, phase !== 'ground');
      }
    });
    ctx.at(300, () => {
      av?.play('slam', 0.6);
      fx.cometFall(land.x, land.y, 500, 58);
      readout.setText('down at the cursor: 14 damage');
    });
    ctx.at(800, () => { fx.cometImpact(land.x, land.y, 58); cracked = true; phase = 'ground'; });
    ctx.at(1500, () => { readout.setText('inside your hitbox: caught'); });
    ctx.at(2100, () => { phase = 'spin'; av?.setHold('charge', 0); });
    ctx.at(5000, () => {
      // Released as the orbit carries it at the target.
      const a = Math.atan2(victim.y - pos.y, victim.x - pos.x);
      vx = Math.cos(a) * 1220;
      vy = Math.sin(a) * 1220;
      phase = 'fly';
      av?.setHold(null);
      av?.play('sweep', a, 300);
      readout.setText('release: it leaves along its orbit');
    });
  },
};

// ══ Q — Singularity ════════════════════════════════════════════════════

export const singularity: PreviewScript = {
  duration: 8200,
  scale: 0.7,
  caption: 'Singularity — at full mass, become the black hole: a laser, a punch, a snap, a kneel, and the end of the world',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const state = { mass: 100, fusion: 0 };
    const mass = { on: true };
    const under = ctx.adopt(ctx.scene.add.graphics().setDepth(3.3));
    const sky = ctx.adopt(ctx.scene.add.graphics().setDepth(2.95));
    const shade = ctx.adopt(ctx.scene.add.graphics().setDepth(8.4));
    const over = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const box = new Phaser.Geom.Rectangle(0, 0, ctx.w, ctx.h);
    const readout = label(ctx, ctx.w * 0.5, 14, hex(ASTRA.starHot), 11);
    let k = 0;
    let aura = 0;
    let auraOn = false;
    let kneel = 0;
    const victim = dummy(ctx, { x: ctx.cx + 190, y: ctx.cy }, () => k > 0.5);
    ctx.onFrame((dt, e) => {
      const t = e / 1000;
      const c = ctx.casterAt();
      under.clear();
      sky.clear();
      shade.clear();
      over.clear();
      if (mass.on) {
        const r = BODY_R * (1 + MASS_SIZE);
        massHalo(under, ctx.tint, c.x, c.y, r, 1, t, 1, 0);
        massBar(over, ctx.tint, c.x, c.y - r - 22, state.mass / 100, t, 1);
        return;
      }
      k = Math.min(1, k + dt / 400);
      aura = auraOn ? Math.min(1, aura + dt / 2400) : Math.max(0, aura - dt / 300);
      blackHoleSky(sky, ctx.tint, box, ctx.w * 0.5, ctx.h * 0.5, t, k, 0);
      eclipse(under, ctx.tint, c.x, c.y, t, k, aura);
      throne(under, ctx.tint, c.x, c.y + 4 + Math.sin(t * 2.4) * 2.5, t, k);
      silhouette(shade, victim.x, victim.y, 18, null, k, kneel);
    });
    readout.setText('mass 100 — Q');
    ctx.at(900, () => {
      mass.on = false;
      av?.setSingular(true);
      av?.setHold('behind', 0);
      readout.setText('the world becomes a black hole. You are invincible');
    });
    ctx.at(2200, () => {
      const c = ctx.casterAt();
      fx.laser(c.x, c.y - 6, victim.x, victim.y);
      fx.shatterBody(() => victim, 18);
      float(ctx, victim.x, victim.y - 34, '-28', ASTRA.white, 13);
      readout.setText('Click: a laser that cannot miss');
    });
    ctx.at(3600, () => { kneel = 1; av?.setHold(null); av?.play('raise', -Math.PI / 2, 900); readout.setText('F: kneel — 2 seconds'); });
    ctx.at(4800, () => {
      kneel = 0;
      const c = ctx.casterAt();
      av?.setHold('behind', 0);
      fx.snap(c.x + 14, c.y - 26);
      fx.swapLives(() => c, () => victim);
      readout.setText('R: snap — your health and theirs trade places');
    });
    ctx.at(6000, () => { auraOn = true; readout.setText('hold the click 3s, release: the world ends'); });
  },
};
