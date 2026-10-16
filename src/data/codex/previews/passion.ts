import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  DEV, PassionAvatar, PassionFx, ascendBand, chariot, crashMark, crucifixAura, crucifixPost,
  faithBar, glory, halo, handGrenade, holyWaterPuddle, vial,
} from '../../../elements/kits/PassionVisuals';

/**
 * Devotion's showcases (element id `passion`).
 *
 * Every loop keeps the same small records the kit keeps (letters with a velocity, a puddle, a
 * bouncing grenade, a chariot's x) and paints them with the kit's own exported painters. One-shots
 * go through a real `PassionFx` with a sticky sink. Numbers are the kit's.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const LETTER_SPEED = 560;
const PUDDLE_R = 72;
const AURA_R = 90;
const BURST_R = 130;
const BAND_HALF = 37;
const CHARIOT_SPEED = 1500;
const CRASH_R = 120;
const FAITH_CAP = 200;
const GREEK = ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'π', 'σ', 'φ', 'ψ', 'ω', 'Σ', 'Ω', 'Δ'];

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): PassionFx {
  return ctx.capture(() => new PassionFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The priest's rig, or null when a skin has replaced the character. */
function priest(av: unknown): PassionAvatar | null {
  return av instanceof PassionAvatar ? av : null;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** A stand-in enemy that can be moved, with its faith bar and halo drawn over it. */
function believer(ctx: PreviewCtx, at: { x: number; y: number }, faith: () => number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const top = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
  ctx.onFrame((_dt, e) => {
    const t = e / 1000;
    g.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(at.x - 5.6, at.y - 4, 1.6); g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
    top.clear();
    const r = Phaser.Math.Clamp(faith() / FAITH_CAP, 0, 1);
    if (r <= 0) return;
    faithBar(top, ctx.tint, at.x, at.y - 40, 52, 5, r, t);
    if (r >= 0.25 && r < 0.5) halo(top, ctx.tint, at.x, at.y - 26, 13, 0.9, 2.4, true, t);
    if (r >= 0.5) halo(top, ctx.tint, at.x, at.y - 26, 13 + (r >= 0.75 ? 2 : 0), 1, 2.4);
    if (r >= 0.75) glory(top, ctx.tint, at.x, at.y - 26, 8, 9 + Math.sin(t * 4) * 2, 10, t * 0.6, 0.55, 1.6);
  });
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color, stroke: '#2b2210', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
}

interface Letter { x: number; y: number; vx: number; vy: number; born: number; text: Phaser.GameObjects.Text; alive: boolean; seed: number }

/** Fire a sermon of `n` letters from (x, y) along `ang`, staggered like the kit's. */
function preach(
  ctx: PreviewCtx, letters: Letter[], x: number, y: number, ang: number, n: number, now: number, charge: number,
): void {
  void charge;
  for (let i = 0; i < n; i++) {
    ctx.at(now + i * 34, () => {
      const a = ang;
      const text = ctx.adopt(ctx.scene.add.text(x, y, GREEK[(i * 5 + n) % GREEK.length], {
        fontSize: '17px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
        color: hex(ctx.tint(DEV.pale)), stroke: hex(ctx.tint(DEV.umber)), strokeThickness: 3,
      }).setOrigin(0.5).setDepth(9.5));
      letters.push({ x, y, vx: Math.cos(a) * LETTER_SPEED, vy: Math.sin(a) * LETTER_SPEED, born: now + i * 34, text, alive: true, seed: i * 1.7 });
    });
  }
}

function letterLayer(ctx: PreviewCtx, letters: Letter[], hit: (l: Letter) => boolean, onHit: (l: Letter) => void): void {
  ctx.onFrame((dt, e) => {
    const s = dt / 1000;
    for (const l of letters) {
      if (!l.alive) continue;
      const age = (e - l.born) / 1100;
      l.x += l.vx * s;
      l.y += l.vy * s;
      if (age > 1) { l.alive = false; l.text.setVisible(false); continue; }
      if (hit(l)) { l.alive = false; l.text.setVisible(false); onHit(l); continue; }
      l.text.setPosition(l.x, l.y);
    }
  });
}

// ══ PASSIVES ═══════════════════════════════════════════════════════════

export const faithPassive: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Faith — no damage, ever. A gold bar over their head; at 200 they are converted on the spot',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PassionAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#f5e08a', 11);
    const target = { x: ctx.cx + 240, y: ctx.cy };
    let faith = 120;
    believer(ctx, target, () => faith);
    const letters: Letter[] = [];
    letterLayer(ctx, letters,
      (l) => Phaser.Math.Distance.Between(l.x, l.y, target.x, target.y) < 28,
      () => { faith = Math.min(FAITH_CAP, faith + 6); float(ctx, target.x, target.y - 30, '+6 ✝', hex(DEV.holy)); });
    ctx.at(200, () => readout.setText('every letter, puddle and burst adds faith — and nothing takes it away'));
    for (const at of [400, 1600, 2800]) {
      ctx.at(at, () => {
        av.play('punch', ctx.aim);
        ctx.capture(() => fx.preach(ctx.cx + 20, ctx.cy, ctx.aim, 1));
        preach(ctx, letters, ctx.cx + 20, ctx.cy, ctx.aim, 12, at, 1);
      });
    }
    ctx.onFrame(() => {
      if (faith >= FAITH_CAP && readout.text !== 'CONVERTED') {
        readout.setText('CONVERTED');
        ctx.capture(() => fx.convert(target.x, target.y));
        float(ctx, target.x, target.y - 50, '✝️ CONVERTED', '#fffcf0', 13);
      }
    });
  },
};

export const stagesPassive: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Stages — 25%: fills itself · 50%: they hit the priest 20% softer · 75%: drawn to holy water, +25% faith',
  run(ctx) {
    const av = ctx.useAvatar(() => new PassionAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#f5e08a', 11);
    const target = { x: ctx.cx + 260, y: ctx.cy - 10 };
    const pool = { x: ctx.cx + 110, y: ctx.cy + 20 };
    let faith = 40;
    believer(ctx, target, () => faith);
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    let tick = 0;
    ctx.onFrame((dt, e) => {
      ground.clear();
      holyWaterPuddle(ground, ctx.tint, pool.x, pool.y, PUDDLE_R * 0.8, e / 1000, 7, 0.3);
      faith = Math.min(FAITH_CAP - 1, faith + (faith >= 50 ? 2 : 0) * dt / 1000 + 12 * dt / 1000);
      if (faith >= 150) {
        const a = Math.atan2(pool.y - target.y, pool.x - target.x);
        if (Phaser.Math.Distance.Between(target.x, target.y, pool.x, pool.y) > 20) {
          target.x += Math.cos(a) * 55 * dt / 1000;
          target.y += Math.sin(a) * 55 * dt / 1000;
        }
      }
      if (e - tick > 1000) { tick = e; if (faith >= 50) float(ctx, target.x + 14, target.y - 20, '+2 🕯️', hex(DEV.pale)); }
    });
    ctx.at(200, () => readout.setText('25% — KINDLED: it fills on its own, 2 a second'));
    ctx.at(2600, () => readout.setText('50% — FAITHFUL: their blows land 20% softer on you'));
    ctx.at(5200, () => readout.setText('75% — DEVOUT: drawn into your holy water, and every attack adds 25% more'));
  },
};

// ══ CLICK — Sermon ═════════════════════════════════════════════════════

export const sermon: PreviewScript = {
  duration: 6500,
  scale: 0.9,
  caption: 'Click — tap: 4 letters × 3 faith. Hold 1.4s: 12 letters × 6 faith',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PassionAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#f5e08a', 11);
    const target = { x: ctx.cx + 250, y: ctx.cy };
    let faith = 0;
    let per = 3;
    believer(ctx, target, () => faith);
    const letters: Letter[] = [];
    letterLayer(ctx, letters,
      (l) => Phaser.Math.Distance.Between(l.x, l.y, target.x, target.y) < 30,
      (l) => {
        faith += per;
        float(ctx, target.x + (Math.random() - 0.5) * 20, target.y - 26, `+${per} ✝`, hex(DEV.holy));
        ctx.capture(() => fx.letterHit(l.x, l.y, ctx.aim));
      });
    ctx.at(200, () => readout.setText('a tap: four letters, 3 faith each'));
    ctx.at(500, () => {
      per = 3;
      av.play('punch', ctx.aim);
      ctx.capture(() => fx.preach(ctx.cx + 20, ctx.cy, ctx.aim, 0));
      preach(ctx, letters, ctx.cx + 20, ctx.cy, ctx.aim, 4, 500, 0);
    });
    ctx.at(1900, () => { readout.setText('hold to preach — the glory builds behind you…'); av.setHold('brace'); });
    ctx.onFrame((_dt, e) => {
      if (e >= 1900 && e < 3300) priest(av)?.setPreach((e - 1900) / 1400);
    });
    ctx.at(3300, () => {
      readout.setText('…release: twelve letters, 6 faith each');
      per = 6;
      av.setHold(null);
      priest(av)?.setPreach(0);
      av.play('punch', ctx.aim);
      ctx.capture(() => fx.preach(ctx.cx + 20, ctx.cy, ctx.aim, 1));
      preach(ctx, letters, ctx.cx + 20, ctx.cy, ctx.aim, 12, 3300, 1);
    });
  },
};

// ══ E — Holy Water ═════════════════════════════════════════════════════

export const holyWater: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'E — 2 bottles. Each shatters into a boiling puddle: 9 faith a second for 8s',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PassionAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#8fd3ff', 11);
    const target = { x: ctx.cx + 240, y: ctx.cy };
    let faith = 0;
    believer(ctx, target, () => faith);
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const pools: { x: number; y: number; born: number }[] = [];
    let flight: { from: { x: number; y: number }; to: { x: number; y: number }; born: number } | null = null;
    let tick = 0;
    const throwAt = (ms: number, to: { x: number; y: number }): void => {
      ctx.at(ms, () => {
        const ang = Math.atan2(to.y - ctx.cy, to.x - ctx.cx);
        av.play('punch', ang);
        flight = { from: { x: ctx.cx, y: ctx.cy }, to, born: ms };
      });
      ctx.at(ms + 520, () => {
        pools.push({ ...to, born: ms + 520 });
        ctx.capture(() => fx.shatter(to.x, to.y, PUDDLE_R));
        flight = null;
      });
    };
    ctx.onFrame((dt, e) => {
      air.clear();
      ground.clear();
      for (const p of pools) holyWaterPuddle(ground, ctx.tint, p.x, p.y, PUDDLE_R, e / 1000, p.born, Math.min(0.8, (e - p.born) / 8000));
      if (flight) {
        const k = Phaser.Math.Clamp((e - flight.born) / 520, 0, 1);
        vial(air, ctx.tint, Phaser.Math.Linear(flight.from.x, flight.to.x, k),
          Phaser.Math.Linear(flight.from.y, flight.to.y, k) - Math.sin(k * Math.PI) * 60, k * 9, 1);
      }
      if (pools.some((p) => Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y) < PUDDLE_R)) {
        faith += 9 * dt / 1000;
        if (e - tick > 900) { tick = e; float(ctx, target.x - 14, target.y - 26, '+9 💧', hex(DEV.water)); }
      }
    });
    ctx.at(200, () => readout.setText('lob a bottle — it boils where it lands'));
    throwAt(400, { x: target.x, y: target.y });
    ctx.at(3200, () => readout.setText('the second bottle; each refills 7s after it is spent'));
    throwAt(3400, { x: target.x - 150, y: target.y + 30 });
  },
};

// ══ R — Holy Hand Grenade ══════════════════════════════════════════════

export const grenade: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'R — thrown at the cursor, bounces about for 3 seconds, then 45 faith in 130px',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PassionAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#e8b93a', 11);
    const target = { x: ctx.cx + 230, y: ctx.cy + 10 };
    let faith = 60;
    believer(ctx, target, () => faith);
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const gr = { x: ctx.cx + 16, y: ctx.cy, vx: 0, vy: 0, z: 4, vz: 270, live: false, at: 0 };
    ctx.at(300, () => {
      readout.setText('one… two… three…');
      av.play('slam', ctx.aim);
      const d = 210;
      const v0 = (d * 1.6) / (1 - Math.exp(-1.6 * 0.55));
      gr.vx = Math.cos(ctx.aim) * v0;
      gr.vy = Math.sin(ctx.aim) * v0;
      gr.live = true;
      gr.at = 300;
    });
    ctx.onFrame((dt, e) => {
      air.clear();
      if (!gr.live) return;
      const s = dt / 1000;
      const keep = Math.exp(-1.6 * s);
      gr.vx *= keep; gr.vy *= keep;
      gr.x += gr.vx * s; gr.y += gr.vy * s;
      gr.vz -= 900 * s; gr.z += gr.vz * s;
      if (gr.z <= 0) { gr.z = 0; gr.vz = Math.max(95, Math.abs(gr.vz) * 0.6); gr.vy += (Math.random() - 0.5) * 80; }
      if (gr.x > ctx.w - 30) { gr.x = ctx.w - 30; gr.vx = -Math.abs(gr.vx) * 0.78; }
      if (gr.y < 30 || gr.y > ctx.h - 30) gr.vy = -gr.vy * 0.78;
      const fuse = Phaser.Math.Clamp((e - gr.at) / 3000, 0, 1);
      air.fillStyle(ctx.tint(DEV.ink), 0.3);
      air.fillEllipse(gr.x, gr.y + 7, 14, 5);
      handGrenade(air, ctx.tint, gr.x, gr.y - gr.z, e / 200, 1, fuse, e / 1000);
      if (fuse > 0.67) {
        air.lineStyle(1.6, ctx.tint(DEV.white), 0.7);
        air.strokeCircle(gr.x, gr.y, BURST_R * (1 - fuse) * 3);
      }
      if (fuse >= 1) {
        gr.live = false;
        readout.setText('HALLELUJAH — 45 faith to everything within 130px');
        ctx.capture(() => fx.holyBurst(gr.x, gr.y, BURST_R));
        if (Phaser.Math.Distance.Between(gr.x, gr.y, target.x, target.y) < BURST_R + 14) {
          faith += 45;
          float(ctx, target.x, target.y - 30, '+45 💥', hex(DEV.gold), 13);
        }
      }
    });
  },
};

// ══ F — Mount Crucifix ═════════════════════════════════════════════════

export const crucifix: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'F — a crucifix with a 90px aura no enemy can enter. Every shot fired into it: +1 faith to the shooter',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PassionAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#c08a50', 11);
    const cross = { x: ctx.cx + 130, y: ctx.cy + 10 };
    const enemy = { x: ctx.cx + 320, y: ctx.cy + 10 };
    let faith = 30;
    believer(ctx, enemy, () => faith);
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let planted = -1;
    let flare = 0;
    const shots: { x: number; y: number; paid: boolean }[] = [];
    ctx.at(300, () => {
      readout.setText('plant it between you');
      av.play('slam', ctx.aim);
      planted = 300;
      ctx.capture(() => fx.plant(cross.x, cross.y, AURA_R));
    });
    ctx.at(1400, () => readout.setText('they cannot walk in…'));
    ctx.at(3600, () => readout.setText('…and every shot they fire through it is faith they paid'));
    for (const at of [3800, 4300, 4800, 5300]) {
      ctx.at(at, () => shots.push({ x: enemy.x - 20, y: enemy.y + (Math.random() - 0.5) * 20, paid: false }));
    }
    ctx.onFrame((dt, e) => {
      const t = e / 1000;
      ground.clear();
      air.clear();
      // The enemy walks at the cross and is held on its rim.
      if (e > 1400 && e < 3600) {
        enemy.x = Math.max(cross.x + AURA_R, enemy.x - 90 * dt / 1000);
        if (enemy.x <= cross.x + AURA_R + 0.5) flare = e;
      }
      if (planted >= 0) {
        const rise = Phaser.Math.Clamp((e - planted) / 260, 0, 1);
        crucifixAura(ground, ctx.tint, cross.x, cross.y, AURA_R * rise, t, 1, e - flare < 160 ? 1 : 0);
        crucifixPost(air, ctx.tint, cross.x, cross.y, 1, t, rise);
      }
      for (const s of shots) {
        s.x -= 420 * dt / 1000;
        air.fillStyle(0x9aa3b8, 1);
        air.fillCircle(s.x, s.y, 4);
        if (!s.paid && Phaser.Math.Distance.Between(s.x, s.y, cross.x, cross.y) < AURA_R) {
          s.paid = true;
          faith += 1;
          ctx.capture(() => fx.blessShot(s.x, s.y));
          float(ctx, enemy.x, enemy.y - 30, '+1 ✝', hex(DEV.holy));
        }
      }
    });
  },
};

// ══ Q — Ascendance ═════════════════════════════════════════════════════

export const ascendance: PreviewScript = {
  duration: 8500,
  scale: 0.8,
  caption: 'Q — a line where you stand; 3s later a flaming chariot runs it (60 faith). Caught yourself? Crash down at the cursor (80)',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PassionAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff9a2e', 11);
    const enemy = { x: ctx.cx + 200, y: ctx.cy };
    let faith = 40;
    believer(ctx, enemy, () => faith);
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const lineY = ctx.cy;
    let cx = -150;
    let struckEnemy = false;
    let riding = false;
    const land = { x: enemy.x - 14, y: enemy.y + 8 };
    ctx.at(200, () => { readout.setText('the line is drawn where you stand'); av.play('raise'); });
    ctx.at(3200, () => readout.setText('the chariot comes through'));
    ctx.at(5400, () => readout.setText('it took you with it — now down onto them'));
    ctx.at(6000, () => {
      riding = false;
      ctx.moveCaster(land.x, land.y, { alpha: 1 });
      ctx.capture(() => fx.crash(land.x, land.y, CRASH_R));
      ctx.at(6200, () => { faith += 80; float(ctx, enemy.x, enemy.y - 34, '+80 ☄️', hex(DEV.fire), 13); });
    });
    ctx.onFrame((dt, e) => {
      const t = e / 1000;
      ground.clear();
      air.clear();
      if (e > 200 && e < 3200) ascendBand(ground, ctx.tint, 0, ctx.w, lineY, BAND_HALF, (e - 200) / 3000, 1, t);
      if (e >= 3200 && cx < ctx.w + 200) {
        cx += CHARIOT_SPEED * 0.5 * dt / 1000;
        chariot(air, ctx.tint, cx, lineY, 1, t, 1, riding);
        if (!riding && cx >= ctx.cx && e < 5000) {
          riding = true;
          ctx.capture(() => fx.liftOff(ctx.cx, ctx.cy));
          ctx.moveCaster(ctx.cx, ctx.cy, { alpha: 0 });
        }
        if (!struckEnemy && cx >= enemy.x) {
          struckEnemy = true;
          faith += 60;
          float(ctx, enemy.x, enemy.y - 34, '+60 🔥', hex(DEV.fire), 13);
        }
      }
      if (e > 5300 && e < 6000) crashMark(air, ctx.tint, land.x, land.y, CRASH_R, (e - 5300) / 700, t);
    });
  },
};
