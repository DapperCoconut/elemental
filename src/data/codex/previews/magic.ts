import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { FONT_DISPLAY, FONT_MONO } from '../../../ui/Theme';
import {
  MATHC, MathAvatar, MathFx,
  drawAxes, drawCineBoard, drawFuse, drawGraph, drawPainRegion, drawPillar,
} from '../../../elements/kits/MathVisuals';
import { CUTSCENE_EQUATIONS, crunchProblem, examProblems, seededRng } from '../../../elements/kits/MathProblems';

/**
 * Math's showcases (the element keeps the id `magic`).
 *
 * Each loop fires the kit's own `MathFx` painters at the kit's numbers. The preview box stands in
 * for the arena: the graph is centred on it and its floor is the bottom of the pain.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const TAU = Math.PI * 2;
const PILLAR_CAP = 5;
const ORBIT_R = 46;
const ORBIT_SPEED = 2.6;
const PILLAR_WINDUP_MS = 140;
const PILLAR_SPEED = 1000;
const FLAT_LEVEL = 0.45;
const CURVE_SCALE = 0.86;
const INTEGRAL_DROP = 0.16;
const CURVE_SAMPLES = 48;
const MORPH_MS = 420;
const LABELS = ['y = 1', 'y = x', 'y = x²/2 − 1', 'y = x³/6 − 2', 'y = x⁴/24 − 3'];
const RATE_MS = 3500;
const RATE_TICK_MS = 250;
const BOMB_COUNT = 9;
const BOMB_FUSE_MS = 560;
const BOMB_R = 87;
const BOMBLET_COUNT = 3;
const BOMBLET_FUSE_MS = 380;
const BOMBLET_R = 54;
const BOMBLET_THROW = 93;
const CINE_MS = 2000;

type Pt = { x: number; y: number };

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): MathFx {
  return ctx.capture(() => new MathFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The scholar's rig, or null when a skin has replaced the character. */
function stand(ctx: PreviewCtx): MathAvatar | null {
  const made = ctx.useAvatar(() => new MathAvatar(ctx.scene, ctx.tint));
  const av = made instanceof MathAvatar ? made : null;
  av?.setFacing(ctx.aim);
  return av;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

function label(ctx: PreviewCtx, x: number, y: number, color: number, size = 11, font = FONT_MONO): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: font, color: hex(ctx.tint(color)),
  }).setOrigin(0.5).setDepth(19));
}

/** A damage number. */
function float(ctx: PreviewCtx, x: number, y: number, text: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color: hex(ctx.tint(MATHC.painHot)), stroke: '#07110d', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 800 });
}

/** A training dummy that can be moved; returns its live position. */
function dummy(ctx: PreviewCtx, start: Pt): Pt {
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

const boxOf = (ctx: PreviewCtx): Phaser.Geom.Rectangle => new Phaser.Geom.Rectangle(0, 0, ctx.w, ctx.h);

/** Height of the degree-`n` curve at `x` — the kit's formula, on the box. */
function curveY(b: Phaser.Geom.Rectangle, degree: number, x: number): number {
  const u = Phaser.Math.Clamp((x - b.centerX) / (b.width / 2), -1, 1);
  return b.centerY - (b.height / 2) * CURVE_SCALE * (degree <= 0 ? FLAT_LEVEL : Math.pow(u, degree) - INTEGRAL_DROP * (degree - 1));
}

function curve(b: Phaser.Geom.Rectangle, degree: number): Pt[] {
  return Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => {
    const x = b.left + (b.width * i) / CURVE_SAMPLES;
    return { x, y: curveY(b, degree, x) };
  });
}

/** The board every graph loop shares: axes, the live curve (morphing on a rewrite) and its label. */
function board(ctx: PreviewCtx, degree: number): { b: Phaser.Geom.Rectangle; g: Phaser.GameObjects.Graphics; degree(): number; pts(): Pt[]; set(d: number): void } {
  const b = boxOf(ctx);
  const axes = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(3.4));
  const name = label(ctx, b.right - 58, b.top + 16, MATHC.graphHot, 13).setText(LABELS[degree]);
  let from = curve(b, degree);
  let to = from;
  let now = from;
  let since = MORPH_MS;
  ctx.onFrame((dt, e) => {
    since += dt;
    const k = Phaser.Math.Clamp(since / MORPH_MS, 0, 1);
    now = to.map((p, i) => ({ x: p.x, y: from[i].y + (p.y - from[i].y) * k }));
    axes.clear();
    g.clear();
    drawAxes(axes, ctx.tint, b, b.centerX, b.centerY, 1);
    drawGraph(g, ctx.tint, now, e / 1000, 1, 1 - k);
  });
  return {
    b, g,
    degree: () => degree,
    pts: () => now,
    set(d) { from = now; to = curve(b, d); degree = d; since = 0; name.setText(LABELS[d]); },
  };
}

// ══ PASSIVE — The Graph ════════════════════════════════════════════════

export const passiveTheGraph: PreviewScript = {
  duration: 4800,
  caption: 'The Graph — y = x is always drawn across the arena, centred. On its own it hurts nobody',
  run(ctx) {
    stand(ctx);
    const bd = board(ctx, 1);
    const from = { x: ctx.w * 0.3, y: bd.b.centerY };
    ctx.moveCaster(from.x, from.y);
    ctx.at(500, () => ctx.glideCaster({ from, to: { x: ctx.w * 0.7, y: bd.b.centerY }, ms: 3400, ease: 'linear' }));
  },
};

// ══ Click — Crunch the Numbers ═════════════════════════════════════════

export const crunch: PreviewScript = {
  duration: 7000,
  caption: 'Click — type the answer and a pillar joins the ring at your cursor (up to 5). Click: they all launch through the point, 8 each',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const home = { x: ctx.tx, y: ctx.ty };
    const victim = dummy(ctx, home);
    const aim = { ...home };
    const rng = seededRng(42);
    const slate = label(ctx, ctx.cx, ctx.cy - 50, MATHC.chalk, 15);
    const slateG = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    /** Standing pillars are a count; once clicked each one is a frozen foot flying down its line. */
    let ring = 0;
    let frozenAt = -1;
    let spin = 0;
    let shots: { x: number; y: number; ang: number; seed: number; gone: number; hit: boolean; done: boolean }[] = [];
    const foot = (i: number): Pt => {
      const a = spin + (i / Math.max(1, ring)) * TAU;
      return { x: aim.x + Math.cos(a) * ORBIT_R, y: aim.y + Math.sin(a) * ORBIT_R };
    };
    const SOLVE = 720;
    for (let i = 0; i < PILLAR_CAP; i++) {
      const p = crunchProblem(rng);
      const t0 = 300 + i * SOLVE;
      const ans = String(p.answer);
      ctx.at(t0, () => slate.setText(`${p.text} = ?`));
      for (let c = 1; c <= ans.length; c++) ctx.at(t0 + 260 + c * 110, () => slate.setText(`${p.text} = ${ans.slice(0, c)}`));
      ctx.at(t0 + SOLVE - 80, () => {
        ring++;
        const at = foot(ring - 1);
        fx.solved(at.x, at.y);
        av?.solve();
        av?.setStock(ring / PILLAR_CAP);
      });
    }
    const click = 300 + PILLAR_CAP * SOLVE + 500;
    ctx.at(click - 480, () => slate.setText('FULL — CLICK'));
    ctx.at(click, () => {
      frozenAt = click;
      av?.play('sweep', Math.atan2(aim.y - ctx.cy, aim.x - ctx.cx));
      shots = Array.from({ length: ring }, (_, i) => {
        const at = foot(i);
        return { ...at, ang: Math.atan2(aim.y - at.y, aim.x - at.x), seed: i + 1, gone: 0, hit: false, done: false };
      });
      ring = 0;
      av?.setStock(0);
      slate.setText('');
    });
    ctx.at(click + PILLAR_WINDUP_MS, () => { for (const s of shots) fx.launch(s.x, s.y, s.ang); });
    ctx.onFrame((dt, e) => {
      const t = e / 1000;
      g.clear();
      slateG.clear();
      if (slate.text) {
        const w = Math.max(74, slate.width + 18);
        slateG.fillStyle(ctx.tint(MATHC.board), 0.9);
        slateG.fillRoundedRect(slate.x - w / 2, slate.y - 13, w, 26, 5);
        slateG.lineStyle(1.5, ctx.tint(ring >= PILLAR_CAP ? MATHC.gold : MATHC.slateLit), 1);
        slateG.strokeRoundedRect(slate.x - w / 2, slate.y - 13, w, 26, 5);
      }
      if (frozenAt < 0) {
        spin += (ORBIT_SPEED * dt) / 1000;
        for (let i = 0; i < ring; i++) { const at = foot(i); drawPillar(g, ctx.tint, at.x, at.y, i + 1, t, 1); }
        return;
      }
      const flying = e >= frozenAt + PILLAR_WINDUP_MS;
      for (const s of shots) {
        if (s.done) continue;
        if (!flying) { drawPillar(g, ctx.tint, s.x, s.y, s.seed, t, 1, (e - frozenAt) / PILLAR_WINDUP_MS); continue; }
        const step = (PILLAR_SPEED * dt) / 1000;
        s.gone += step;
        s.x += Math.cos(s.ang) * step;
        s.y += Math.sin(s.ang) * step;
        if (!s.hit && s.gone >= ORBIT_R - 14) {
          s.hit = true;
          fx.pillarHit(victim.x, victim.y, s.ang);
          float(ctx, victim.x + (s.seed - 3) * 16, victim.y - 34, '-16');
        }
        if (s.x < 8 || s.x > ctx.w - 8 || s.y < 8 || s.y > ctx.h - 8) { s.done = true; fx.pillarCrumble(s.x, s.y); continue; }
        drawPillar(g, ctx.tint, s.x, s.y, s.seed, t, 1, 1, s.ang);
      }
      // Knocked back off the hits, then walked back to the mark.
      const k = e - (frozenAt + PILLAR_WINDUP_MS + 40);
      if (k > 0) victim.x = home.x + 70 * (k < 240 ? Math.sin((k / 240) * Math.PI / 2) : Math.max(0, 1 - (k - 240) / 700));
    });
  },
};

// ══ E — Integrate ══════════════════════════════════════════════════════

export const integrate: PreviewScript = {
  duration: 6000,
  caption: 'E — rewrite the graph one step up: x → x²/2 → x³/6 → x⁴/24, sinking lower every time. Every other ability works off whatever curve is up',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const bd = board(ctx, 1);
    for (let d = 2; d <= 4; d++) {
      ctx.at(900 + (d - 2) * 1400, () => {
        av?.play('flex');
        fx.rewrite(bd.b, true);
        bd.set(d);
      });
    }
  },
};

// ══ R — Rate of Pain ═══════════════════════════════════════════════════

export const rate: PreviewScript = {
  duration: 5200,
  caption: 'R — everything between your graph and the floor burns for 3.5s: 3 damage every quarter second on y = x, far more on higher integrals, which sit lower and burn less ground. Above the curve is safe',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const bd = board(ctx, 1);
    const x = bd.b.centerX + bd.b.width * 0.19;
    const under = { x, y: bd.b.centerY + 44 };
    const over = { x, y: curveY(bd.b, 1, x) - 44 };
    const victim = dummy(ctx, under);
    const pain = ctx.adopt(ctx.scene.add.graphics().setDepth(3.2));
    const START = 500;
    const CLIMB = START + 1800;
    ctx.at(START, () => av?.play('slam', Math.PI / 2));
    for (let t = RATE_TICK_MS; t <= RATE_MS; t += RATE_TICK_MS) {
      ctx.at(START + t, () => {
        // The kit's own test: are they below the curve where they stand?
        if (victim.y <= curveY(bd.b, bd.degree(), victim.x)) return;
        fx.painTick(victim.x, victim.y);
        float(ctx, victim.x + 24, victim.y - 22, '-3', 10);
      });
    }
    ctx.onFrame((_dt, e) => {
      pain.clear();
      const el = e - START;
      if (el >= 0 && el < RATE_MS) {
        const fade = Phaser.Math.Clamp(el / 200, 0, 1) * Phaser.Math.Clamp((RATE_MS - el) / 300, 0, 1);
        drawPainRegion(pain, ctx.tint, bd.pts(), bd.b.bottom, e / 1000, fade);
      }
      const k = Phaser.Math.Clamp((e - CLIMB) / 450, 0, 1);
      victim.y = under.y + (over.y - under.y) * k;
    });
  },
};

// ══ F — Derivitize ═════════════════════════════════════════════════════

export const derive: PreviewScript = {
  duration: 4600,
  scale: 0.8,
  caption: 'F — one step down, and the old curve blows: nine cluster bombs along it (12 each), each throwing three bomblets (5)',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const bd = board(ctx, 3);
    const fuses: { x: number; y: number; r: number; at: number; ms: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const CAST = 700;
    const old = curve(bd.b, 3);
    const bombs = Array.from({ length: BOMB_COUNT }, (_, i) => old[Math.round(((i + 0.5) / BOMB_COUNT) * CURVE_SAMPLES)]);
    const victim = dummy(ctx, { x: bombs[6].x + 10, y: bombs[6].y + 6 });
    ctx.at(CAST, () => {
      av?.play('clap');
      fx.curveShatter(old);
      fx.rewrite(bd.b, false);
      bd.set(2);
      for (const p of bombs) fuses.push({ ...p, r: BOMB_R, at: CAST, ms: BOMB_FUSE_MS });
    });
    ctx.at(CAST + BOMB_FUSE_MS, () => {
      bombs.forEach((p, i) => {
        fx.blast(p.x, p.y, BOMB_R, true);
        for (let j = 0; j < BOMBLET_COUNT; j++) {
          const a = i * 1.7 + (j / BOMBLET_COUNT) * TAU;
          fuses.push({ x: p.x + Math.cos(a) * BOMBLET_THROW, y: p.y + Math.sin(a) * BOMBLET_THROW, r: BOMBLET_R, at: CAST + BOMB_FUSE_MS, ms: BOMBLET_FUSE_MS });
        }
      });
      float(ctx, victim.x, victim.y - 32, '-24', 12);
    });
    ctx.at(CAST + BOMB_FUSE_MS + BOMBLET_FUSE_MS, () => {
      for (const f of fuses) if (f.r === BOMBLET_R) fx.blast(f.x, f.y, BOMBLET_R, false);
      float(ctx, victim.x + 22, victim.y - 22, '-10', 10);
    });
    ctx.onFrame((_dt, e) => {
      g.clear();
      for (const f of fuses) {
        const t = (e - f.at) / f.ms;
        if (t >= 0 && t < 1) drawFuse(g, ctx.tint, f.x, f.y, f.r, t, e / 1000);
      }
    });
  },
};

// ══ Q — 42 ═════════════════════════════════════════════════════════════

export const fortyTwo: PreviewScript = {
  duration: 9600,
  caption: 'Q — absorb every equation: the fight freezes 2s. Then the enemy sits five problems — each one failed hits for 10, +5 per earlier fail',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = stand(ctx);
    const victim = dummy(ctx, { x: ctx.tx, y: ctx.ty + 24 });
    const b = boxOf(ctx);
    const cine = ctx.adopt(ctx.scene.add.graphics().setDepth(17));
    const eqs = CUTSCENE_EQUATIONS.slice(0, 10).map((eq, i) => ctx.adopt(ctx.scene.add.text(0, 0, eq, {
      fontSize: `${11 + (i % 4) * 2}px`, fontFamily: FONT_MONO, color: hex(ctx.tint(i % 3 === 0 ? MATHC.graphHot : MATHC.chalk)),
    }).setOrigin(0.5).setDepth(18).setAlpha(0)));
    const title = ctx.adopt(ctx.scene.add.text(b.centerX, b.centerY, '42', {
      fontSize: '110px', fontFamily: FONT_DISPLAY, color: hex(ctx.tint(MATHC.chalk)), stroke: hex(ctx.tint(MATHC.ink)), strokeThickness: 10,
    }).setOrigin(0.5).setDepth(18.5).setAlpha(0));
    const START = 300;
    ctx.at(START, () => av?.setHold('charge', -Math.PI / 2));
    ctx.at(START + CINE_MS, () => { av?.setHold(null); av?.play('raise'); });

    // The exam: the panel over the sitter's head.
    const panel = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
    const head = label(ctx, 0, 0, MATHC.chalkDim, 9, FONT_DISPLAY);
    const body = label(ctx, 0, 0, MATHC.chalk, 12);
    const input = label(ctx, 0, 0, MATHC.graphHot, 12);
    const problems = examProblems(42);
    const PASSES = [true, true, false, false, false];
    const results: (boolean | null)[] = problems.map(() => null);
    const EXAM = START + CINE_MS + 400;
    const STEP = 1300;
    let showing = -1;
    let flash = -1;
    let fails = 0;
    problems.forEach((p, i) => {
      const t0 = EXAM + i * STEP;
      // A right answer is typed out; a wrong one is a guess, or nothing before the clock runs out.
      const typed = PASSES[i] ? String(p.answer) : i === problems.length - 1 ? '' : String(p.answer + 3 + i);
      ctx.at(t0, () => { showing = i; head.setText(`PROBLEM ${i + 1} / ${problems.length}`); body.setText(p.text); input.setText('= ?'); });
      for (let c = 1; c <= typed.length; c++) ctx.at(t0 + 300 + c * 120, () => input.setText(`= ${typed.slice(0, c)}`));
      ctx.at(t0 + STEP - 300, () => {
        results[i] = PASSES[i];
        flash = t0 + STEP - 300;
        if (PASSES[i]) { fx.passTick(victim.x, victim.y - 30); return; }
        fx.failStrike(victim.x, victim.y, fails);
        float(ctx, victim.x + 30, victim.y - 26, `-${10 + 5 * fails}`, 12 + fails);
        fails++;
      });
    });
    ctx.at(EXAM + problems.length * STEP + 200, () => { showing = -1; for (const t of [head, body, input]) t.setText(''); });

    ctx.onFrame((_dt, e) => {
      const c = ctx.casterAt();
      const el = e - START;
      cine.clear();
      const on = el >= 0 && el < CINE_MS;
      if (on) {
        const k = el / CINE_MS;
        const dark = Phaser.Math.Clamp(el / 260, 0, 1) * Phaser.Math.Clamp((CINE_MS - el) / 260, 0, 1);
        const surge = Phaser.Math.Clamp((k - 0.55) / 0.3, 0, 1);
        drawCineBoard(cine, ctx.tint, b, c.x, c.y, dark, e / 1000, surge);
        eqs.forEach((t, i) => {
          // Each equation spirals in from the rim, one after another, and is swallowed.
          const f = Phaser.Math.Clamp((k - i * 0.055) / 0.45, 0, 1);
          const r = (1 - f * f) * (b.width * 0.5);
          const a = i * 2.4 + f * 4.2;
          t.setPosition(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.6).setScale(1 - 0.7 * f).setAlpha(f <= 0 || f >= 1 ? 0 : dark * Math.min(1, f * 5));
        });
        const tk = Phaser.Math.Clamp((k - 0.68) / 0.2, 0, 1);
        title.setAlpha(tk * dark).setScale(0.5 + 0.5 * tk + 0.04 * Math.sin(e / 60));
      } else {
        for (const t of eqs) t.setAlpha(0);
        title.setAlpha(0);
      }
      panel.clear();
      if (showing < 0) return;
      const w = Math.max(150, body.width + 24);
      const px = Phaser.Math.Clamp(victim.x, w / 2 + 6, b.right - w / 2 - 6);
      const py = Math.max(44, victim.y - 78);
      head.setPosition(px, py - 26);
      body.setPosition(px, py - 8);
      input.setPosition(px, py + 10);
      const lit = flash >= 0 && e - flash < 320;
      panel.fillStyle(ctx.tint(MATHC.board), 0.92);
      panel.fillRoundedRect(px - w / 2, py - 38, w, 74, 6);
      panel.lineStyle(1.5, ctx.tint(lit ? (results[showing] ? MATHC.graph : MATHC.pain) : MATHC.chalk), 1);
      panel.strokeRoundedRect(px - w / 2, py - 38, w, 74, 6);
      results.forEach((r, i) => {
        panel.fillStyle(ctx.tint(r === null ? MATHC.slate : r ? MATHC.graph : MATHC.pain), 1);
        panel.fillCircle(px - (results.length - 1) * 6 + i * 12, py + 28, 3.5);
      });
    });
  },
};
