import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  MEMORY, MemoryAvatar, MemoryFx, latchedShard, rebirthLine, shardBody, staticEcho, staticRect, woundMark,
} from '../../../elements/kits/MemoryVisuals';

/**
 * Memory's showcases.
 *
 * Each loop fires the kit's own `MemoryFx` painters at the kit's numbers. The box's walls stand in
 * for the arena's: Rebirth's line runs to the edge of the box.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const SHARD_SPEED = 700;
const SPIN_MS = 2000;
const SNATCH_W = 22;
const SLICE_HALF_ANGLE = Phaser.Math.DegToRad(30);
const SLICE_SWEEP_MS = 240;
const SLICE_W = 14;
const SWEEP_RAD_PER_S = Math.PI * 1.5;
const REBIRTH_W = 40;
const ECHO_R = 20;
const TRAUMA_MS = 3000;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): MemoryFx {
  return ctx.capture(() => new MemoryFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The gentleman's rig, or null when a skin has replaced the character. */
function gent(av: unknown): MemoryAvatar | null {
  return av instanceof MemoryAvatar ? av : null;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: number, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color: hex(color), stroke: '#0d0b12', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

/** A training dummy that can be moved; returns its live position. */
function dummy(ctx: PreviewCtx, start: { x: number; y: number }): { x: number; y: number } {
  const at = { ...start };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
  });
  return at;
}

function stand(ctx: PreviewCtx): MemoryAvatar | null {
  const av = gent(ctx.useAvatar(() => new MemoryAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  return av;
}

/** A shard flown from the caster to `to`, painted by the kit's own `shardBody`; `onHit` when it lands. */
function throwShard(ctx: PreviewCtx, to: { x: number; y: number }, onHit: () => void): void {
  const fx = fxOf(ctx);
  const c = ctx.casterAt();
  const ang = Math.atan2(to.y - c.y, to.x - c.x);
  const from = { x: c.x + Math.cos(ang) * 20, y: c.y + Math.sin(ang) * 20 };
  const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y) - 17;
  const ms = (dist / SHARD_SPEED) * 1000;
  fx.shardLaunch(from.x, from.y, ang);
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  let el = 0;
  let done = false;
  ctx.onFrame((dt) => {
    if (done) return;
    el += dt;
    g.clear();
    const k = Math.min(1, el / ms);
    shardBody(g, ctx.tint, from.x + Math.cos(ang) * dist * k, from.y + Math.sin(ang) * dist * k, ang, 1, 1);
    if (k >= 1) { done = true; g.clear(); onHit(); }
  });
}

// ══ PASSIVE ════════════════════════════════════════════════════════════

export const guilt: PreviewScript = {
  duration: 4600,
  scale: 0.85,
  caption: 'Guilt — every hit an enemy takes makes every hit after it 1% worse, for the rest of the match',
  run(ctx) {
    const av = stand(ctx);
    const victim = dummy(ctx, { x: ctx.cx + 170, y: ctx.cy });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(MEMORY.staticHi), 11);
    const stacks = label(ctx, victim.x, victim.y + 34, hex(0xff8aa0), 11);
    let n = 0;
    for (let i = 0; i < 8; i++) {
      ctx.at(300 + i * 480, () => {
        av?.play('punch', 0);
        throwShard(ctx, victim, () => {
          const dmg = 6 * (1 + 0.01 * n);
          n++;
          float(ctx, victim.x, victim.y - 30, `-${dmg.toFixed(2)}`, MEMORY.staticHi);
          stacks.setText(`GUILT ×${n}  (+${n}%)`);
        });
        readout.setText(i < 4 ? 'a stack for every hit taken' : 'each one makes the next hit bigger — no cap, no fading');
      });
    }
  },
};

// ══ Click — Forget ═════════════════════════════════════════════════════

export const forget: PreviewScript = {
  duration: 5400,
  scale: 0.85,
  caption: 'Click — an obsidian shard latches on for 5s. 1: you vanish into static on their screen. 2: their health. 3: their cooldowns',
  run(ctx) {
    const av = stand(ctx);
    const victim = dummy(ctx, { x: ctx.cx + 170, y: ctx.cy });
    const fx = fxOf(ctx);
    const readout = label(ctx, ctx.w * 0.5, 14, hex(MEMORY.staticHi), 11);
    let latched = 0;
    const latchG = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    // A miniature of the victim's screen: the caster's bar, their own bar, their cards.
    const screenG = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
    const sx = ctx.w * 0.5 - 90;
    const sy = ctx.h - 54;
    const angs = [Math.PI - 0.5, Math.PI + 0.5, Math.PI];
    ctx.onFrame((_dt, e) => {
      const t = e / 1000;
      latchG.clear();
      for (let i = 0; i < latched; i++) latchedShard(latchG, ctx.tint, victim.x, victim.y, 17, angs[i], t + i, 1);
      screenG.clear();
      screenG.fillStyle(0x0d0b12, 0.85);
      screenG.fillRect(sx - 6, sy - 6, 192, 52);
      screenG.fillStyle(0x22dd55, 1);
      screenG.fillRect(sx, sy, 80, 8);
      screenG.fillRect(sx + 100, sy, 80, 8);
      for (let i = 0; i < 5; i++) {
        screenG.fillStyle(0x4466aa, 0.8);
        screenG.fillRect(sx + i * 37, sy + 16, 33, 22);
      }
      if (latched >= 1) staticRect(screenG, ctx.tint, sx, sy - 1, 80, 10, t, 0.95, 3, 1);
      if (latched >= 2) staticRect(screenG, ctx.tint, sx + 100, sy - 1, 80, 10, t, 0.95, 3, 2);
      if (latched >= 3) for (let i = 0; i < 5; i++) staticRect(screenG, ctx.tint, sx + i * 37, sy + 16, 33, 22, t, 0.93, 4, 3 + i);
    });
    const tierText = ['', '1 shard — you and your bar are static (bots miss)', '2 — their own health is static', '3 — their cooldowns are static (bots lose track)'];
    for (let i = 0; i < 3; i++) {
      ctx.at(400 + i * 1100, () => {
        av?.play('punch', 0);
        throwShard(ctx, victim, () => {
          fx.shardHit(victim.x - 17, victim.y);
          float(ctx, victim.x, victim.y - 30, '-6', MEMORY.staticHi);
          latched = i + 1;
          readout.setText(tierText[latched]);
        });
      });
    }
    ctx.at(4700, () => {
      for (let i = 0; i < latched; i++) fx.shardBreak(victim.x + Math.cos(angs[i]) * 22, victim.y + Math.sin(angs[i]) * 22);
      latched = 0;
      readout.setText('after 5s they crumble');
    });
  },
};

// ══ E — Memory Snatch ══════════════════════════════════════════════════

export const snatch: PreviewScript = {
  duration: 4600,
  scale: 0.75,
  caption: 'E — spin the cane for 2s, then a static beam that splits into a cone. It takes back the time their abilities sat ready',
  run(ctx) {
    const av = stand(ctx);
    const fx = fxOf(ctx);
    const main = dummy(ctx, { x: ctx.cx + 230, y: ctx.cy });
    const side = dummy(ctx, { x: ctx.cx + 190, y: ctx.cy + 95 });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(MEMORY.staticHi), 11);
    ctx.at(200, () => { av?.setSpin(true); av?.setHold('charge', 0); readout.setText('2s of spinning, at 40% speed'); });
    ctx.at(200 + SPIN_MS, () => {
      av?.setSpin(false);
      av?.setHold(null);
      av?.play('sweep', 0);
      const c = ctx.casterAt();
      const len = 280;
      fx.snatchBeam(c.x + 16, c.y, c.x + len, c.y, SNATCH_W);
      fx.snatchSlice(c.x + 16, c.y, 0, -SLICE_HALF_ANGLE, len, SLICE_SWEEP_MS, SLICE_W);
      fx.snatchSlice(c.x + 16, c.y, 0, SLICE_HALF_ANGLE, len, SLICE_SWEEP_MS, SLICE_W);
      fx.snatchHit(main.x, main.y, true);
      float(ctx, main.x, main.y - 30, '-20  FORGOTTEN', MEMORY.staticHi, 12);
      fx.timeSteal(main.x, main.y, () => ctx.casterAt(), 7);
      readout.setText('the beam: their ready abilities restart — yours lose the time they sat ready');
    });
    ctx.at(200 + SPIN_MS + SLICE_SWEEP_MS, () => {
      fx.snatchHit(side.x, side.y, false);
      float(ctx, side.x, side.y - 30, '-9  +2s', MEMORY.staticMid);
      fx.timeSteal(side.x, side.y, () => ctx.casterAt(), 2);
    });
    ctx.at(200 + SPIN_MS + 900, () => {
      const c = ctx.casterAt();
      float(ctx, c.x, c.y - 52, '-7.0s', MEMORY.staticHi, 12);
      readout.setText('the slices: their ready abilities locked 2s, yours −2s');
    });
  },
};

// ══ R — Practice ════════════════════════════════════════════════════════

export const rebirth: PreviewScript = {
  duration: 4400,
  scale: 0.75,
  caption: 'R — a white line sweeps round the cursor; Click strikes it. Every strike adds 4 damage for the rest of the match',
  run(ctx) {
    const av = stand(ctx);
    const fx = fxOf(ctx);
    const victim = dummy(ctx, { x: ctx.cx + 200, y: ctx.cy - 40 });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(MEMORY.white), 11);
    const pivot = { x: ctx.cx + 140, y: ctx.cy + 40 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9.5));
    const target = Math.atan2(victim.y - pivot.y, victim.x - pivot.x);
    let ang = target - SWEEP_RAD_PER_S * 1.6;
    let sweeping = false;
    const trail: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const chord = (a: number) => {
      const L = Math.max(ctx.w, ctx.h) * 1.5;
      return { x0: pivot.x - Math.cos(a) * L, y0: pivot.y - Math.sin(a) * L, x1: pivot.x + Math.cos(a) * L, y1: pivot.y + Math.sin(a) * L };
    };
    ctx.onFrame((dt, e) => {
      g.clear();
      if (!sweeping) return;
      trail.push(chord(ang));
      if (trail.length > 5) trail.shift();
      ang += SWEEP_RAD_PER_S * dt / 1000;
      rebirthLine(g, ctx.tint, pivot.x, pivot.y, chord(ang), trail, e / 1000, 1);
    });
    ctx.at(300, () => { sweeping = true; av?.play('raise', -Math.PI / 2, 380); readout.setText('the line sweeps round your cursor'); });
    ctx.at(1900, () => {
      sweeping = false;
      g.clear();
      const e = chord(target);
      fx.rebirthBeam(e.x0, e.y0, e.x1, e.y1, REBIRTH_W);
      fx.rebirthHit(victim.x, victim.y);
      float(ctx, victim.x, victim.y - 30, '-24', MEMORY.white, 12);
      readout.setText('click: 24 damage along the line');
    });
    ctx.at(2400, () => float(ctx, ctx.cx, ctx.cy - 60, 'PRACTICE +4', MEMORY.white, 11));
    ctx.at(2700, () => readout.setText('every strike adds 4 damage to the next — for the rest of the match'));
  },
};

// ══ F — Repression ═════════════════════════════════════════════════════

export const repression: PreviewScript = {
  duration: 7200,
  scale: 0.75,
  caption: 'F — record them for 6s, then a static copy walks their steps and casts their real click — at your cursor',
  run(ctx) {
    const av = stand(ctx);
    const fx = fxOf(ctx);
    const foe = dummy(ctx, { x: ctx.cx + 220, y: ctx.cy - 60 });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(MEMORY.grey), 11);
    const cursor = { x: ctx.cx + 200, y: ctx.cy + 90 };
    const path = (k: number) => ({ x: ctx.cx + 220 - 60 * Math.sin(k * Math.PI), y: ctx.cy - 60 + 40 * Math.sin(k * Math.PI * 2) });
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const REC = 2400;
    let echoAt = -1;
    ctx.onFrame((_dt, e) => {
      g.clear();
      g.lineStyle(1.5, 0xffffff, 0.8);
      g.strokeCircle(cursor.x, cursor.y, 7);
      if (e < 300 + REC) {
        const p = path(Phaser.Math.Clamp((e - 300) / REC, 0, 1));
        foe.x = p.x; foe.y = p.y;
      }
      if (echoAt >= 0 && e - echoAt < REC) {
        const p = path((e - echoAt) / REC);
        staticEcho(g, ctx.tint, p.x, p.y + 0, ECHO_R, 0xff6a2a, Math.atan2(cursor.y - p.y, cursor.x - p.x), e / 1000, 0.92);
      }
    });
    ctx.at(300, () => {
      av?.setAura('grey');
      const c = ctx.casterAt();
      fx.repressMark(c.x, c.y, true);
      readout.setText('the grey aura records their steps and their clicks (shown at 0.4× speed)');
    });
    ctx.at(1100, () => fx.echoBurst(ctx.casterAt().x, ctx.casterAt().y, 30, 0xff6a2a));
    ctx.at(1900, () => fx.echoBurst(ctx.casterAt().x, ctx.casterAt().y, 30, 0xff6a2a));
    ctx.at(300 + REC + 200, () => {
      av?.setAura(null);
      const p = path(0);
      fx.repressMark(p.x, p.y, false);
      echoAt = 300 + REC + 200;
      readout.setText('a static copy steps out and casts their click again — at your cursor');
    });
    ctx.at(300 + REC + 200 + 800, () => {
      const p = path(800 / REC);
      fx.echoLine(p.x, p.y, cursor.x, cursor.y, 10, 0xff6a2a);
      fx.echoBurst(cursor.x, cursor.y, 22, 0xff6a2a);
    });
    ctx.at(300 + REC + 200 + 1600, () => {
      const p = path(1600 / REC);
      fx.echoLine(p.x, p.y, cursor.x, cursor.y, 10, 0xff6a2a);
      fx.echoBurst(cursor.x, cursor.y, 22, 0xff6a2a);
    });
    ctx.at(300 + REC * 2 + 200, () => {
      const p = path(1);
      fx.echoFade(p.x, p.y, 0xff6a2a);
    });
  },
};

// ══ Q — Trauma ═════════════════════════════════════════════════════════

export const trauma: PreviewScript = {
  duration: 8000,
  scale: 0.85,
  caption: 'Q — a 3s red window. Afterwards they take 5% of everything they took in it, every second, for the rest of the match',
  run(ctx) {
    const av = stand(ctx);
    const fx = fxOf(ctx);
    const victim = dummy(ctx, { x: ctx.cx + 170, y: ctx.cy });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(MEMORY.redHot), 11);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    let wounded = -1;
    ctx.onFrame((_dt, e) => {
      g.clear();
      if (wounded >= 0) woundMark(g, ctx.tint, victim.x + 20, victim.y - 30, (e - wounded) / 1000, 1);
    });
    ctx.at(300, () => {
      const c = ctx.casterAt();
      fx.traumaPulse(c.x, c.y);
      av?.play('raise', -Math.PI / 2, 520);
      readout.setText('3s: everything they take is remembered');
    });
    ctx.onFrame((_dt, e) => {
      if (e > 300 && e < 300 + TRAUMA_MS) av?.setAura('red', (e - 300) / TRAUMA_MS);
      else av?.setAura(null);
    });
    [700, 1500, 2300].forEach((t) => ctx.at(t, () => {
      av?.play('punch', 0);
      fx.snatchHit(victim.x, victim.y, false);
      float(ctx, victim.x, victim.y - 30, '-20', MEMORY.staticHi);
    }));
    ctx.at(300 + TRAUMA_MS, () => {
      fx.traumaSeal(victim.x, victim.y);
      float(ctx, victim.x, victim.y - 40, 'TRAUMA  60 taken', MEMORY.redHot, 12);
      wounded = 300 + TRAUMA_MS;
      readout.setText('5% of 60 — 3 a second, forever');
    });
    for (let i = 1; i <= 4; i++) {
      ctx.at(300 + TRAUMA_MS + i * 1000, () => {
        fx.traumaTick(victim.x, victim.y);
        float(ctx, victim.x, victim.y - 30, '-3', MEMORY.red);
      });
    }
  },
};
