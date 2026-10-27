import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  Pt, STRING, StringAvatar, StringFx, cocoon, hitKnot, controlBar, hexRope, hookTip, pointAlong, polyLength,
  puppetRig, ropeLine, sagPoints, silkLine, spiderBody, tombBar, wallTack,
} from '../../../elements/kits/StringVisuals';

/**
 * String's showcases.
 *
 * Each loop fires the kit's own `StringFx` and painters at the kit's numbers. The box's walls
 * stand in for the arena's: strings bite its edges, and the tomb's guy-lines run to its corners.
 */

// ── Kit numbers the loops replay ───────────────────────────────────────
const HOOK_SPEED = 1250;
const HEX_SPEED = 1050;
const BAR_SPEED = 760;
const SPIDER_SPEED = 150;
const LOOSE_SPEED = 230;
const SPIDER_SCALE = 3.15;

// ── Staging ───────────────────────────────────────────────────────────

function fxOf(ctx: PreviewCtx): StringFx {
  return ctx.capture(() => new StringFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** The marionette's rig, or null when a skin has replaced the character. */
function puppet(av: unknown): StringAvatar | null {
  return av instanceof StringAvatar ? av : null;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: number, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color: hex(color), stroke: '#1a1410', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
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

/** Where a hook from the caster's side bites a dummy: its near edge, not its middle. */
function skin(at: Pt): Pt {
  return { x: at.x - 15, y: at.y - 2 };
}

function stand(ctx: PreviewCtx): StringAvatar | null {
  const av = puppet(ctx.useAvatar(() => new StringAvatar(ctx.scene, ctx.tint)));
  av?.setFacing(ctx.aim);
  return av;
}

/** The spider's end of a string: a touch above the middle of its body. */
function hand(ctx: PreviewCtx): Pt {
  const c = ctx.casterAt();
  return { x: c.x, y: c.y - 4 };
}

/** A hook flown from the hand to `to` with its line paying out behind it; `onBite` when it lands. */
function throwHook(ctx: PreviewCtx, to: () => Pt, speed: number, purple: boolean, onBite: () => void): void {
  const fx = fxOf(ctx);
  const from = hand(ctx);
  const first = to();
  const ang = Math.atan2(first.y - from.y, first.x - from.x);
  fx.throwString(from.x + Math.cos(ang) * 18, from.y + Math.sin(ang) * 18, ang, purple);
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const dist = Phaser.Math.Distance.Between(from.x, from.y, first.x, first.y);
  const ms = (dist / speed) * 1000;
  let el = 0;
  let done = false;
  ctx.onFrame((dt, e) => {
    if (done) return;
    el += dt;
    g.clear();
    const k = Math.min(1, el / ms);
    const end = to();
    const h = hand(ctx);
    const x = h.x + (end.x - h.x) * k;
    const y = h.y + (end.y - h.y) * k;
    const mid = { x: (h.x + x) / 2 + Math.sin(e / 33) * 4, y: (h.y + y) / 2 + 6 };
    if (purple) hexRope(g, ctx.tint, [h, mid, { x, y }], e / 1000, 0.9, 0);
    else ropeLine(g, ctx.tint, [h, mid, { x, y }], 2.4, 0.95);
    hookTip(g, ctx.tint, x, y, Math.atan2(end.y - h.y, end.x - h.x), 1, purple);
    if (k >= 1) { done = true; g.clear(); fx.bite(end.x, end.y, false, purple); onBite(); }
  });
}

interface ShowStrand {
  end: () => Pt;
  /** Rope beyond the chord — a tied string hangs slack. */
  slack: number;
  tied: Pt | null;
  hex: boolean;
  on: boolean;
  strain: number;
  /** A body leaning on the line from this point bows it there. */
  bow: Pt | null;
}

/** Paint every live strand each frame; returns the list to push onto. */
function strandLayer(ctx: PreviewCtx): { list: ShowStrand[]; pts: (s: ShowStrand) => Pt[] } {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(4.5));
  const list: ShowStrand[] = [];
  const pts = (s: ShowStrand): Pt[] => {
    const a = hand(ctx);
    const b = s.end();
    const p = sagPoints(a.x, a.y, b.x, b.y, 0.6 + s.slack, 12);
    // A body leaning on the line bends it round itself, as the kit's rope does.
    if (s.bow) {
      for (let i = 1; i < p.length - 1; i++) {
        const n = p[i];
        const dx = n.x - s.bow.x;
        const dy = n.y - s.bow.y;
        const d = Math.hypot(dx, dy);
        if (d < 19 && d > 1e-3) { n.x = s.bow.x + (dx / d) * 19; n.y = s.bow.y + (dy / d) * 19; }
      }
    }
    return p;
  };
  ctx.onFrame((_dt, e) => {
    g.clear();
    ground.clear();
    for (const s of list) {
      if (!s.on) continue;
      const p = pts(s);
      if (s.hex) hexRope(g, ctx.tint, p, e / 1000, 1, 0);
      else ropeLine(g, ctx.tint, p, 3, 1, s.strain);
      const end = p[p.length - 1];
      if (s.tied) {
        const prev = p[p.length - 2];
        hitKnot(g, ctx.tint, end.x, end.y, Math.atan2(prev.y - end.y, prev.x - end.x), 1, s.hex);
      }
      if (!s.tied) wallTack(ground, ctx.tint, end.x, end.y, 1, s.hex);
    }
  });
  return { list, pts };
}

// ══ Click — Tension Snag ═══════════════════════════════════════════════

export const snag: PreviewScript = {
  duration: 5400,
  scale: 0.9,
  caption: 'Click — a heavy string hooks an enemy or the wall and stays tied to you. Push on one too hard and it snaps for 16',
  run(ctx) {
    const av = stand(ctx);
    const fx = fxOf(ctx);
    const victim = dummy(ctx, { x: ctx.cx + 200, y: ctx.cy + 40 });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(STRING.silk), 11);
    const { list } = strandLayer(ctx);
    const wallPt = { x: ctx.cx + 300, y: 4 };
    const tied: ShowStrand = { end: () => skin(victim), slack: 1.5, tied: victim, hex: false, on: false, strain: 0, bow: null };
    const wall: ShowStrand = { end: () => wallPt, slack: 0, tied: null, hex: false, on: false, strain: 0, bow: null };
    list.push(tied, wall);
    ctx.at(200, () => {
      av?.play('punch', 0); av?.jerk(0);
      readout.setText('hooks the first enemy it reaches — 6 damage, tied on a rope');
      throwHook(ctx, () => skin(victim), HOOK_SPEED, false, () => { tied.on = true; float(ctx, victim.x, victim.y - 30, '-6  TIED', STRING.silk); });
    });
    ctx.at(1300, () => {
      const a = Math.atan2(wallPt.y - ctx.cy, wallPt.x - ctx.cx);
      av?.play('punch', a); av?.jerk(a);
      readout.setText('or bites the wall — and the other end stays on you');
      throwHook(ctx, () => wallPt, HOOK_SPEED, false, () => { wall.on = true; });
    });
    // The dummy walks up into the wall string; the line bows and reddens, then snaps.
    const startY = victim.y;
    ctx.onFrame((_dt, e) => {
      if (e < 2400 || !wall.on) return;
      const k = Math.min(1, (e - 2400) / 1500);
      victim.y = startY - k * 70;
      victim.x = ctx.cx + 200 + k * 20;
      wall.bow = { x: victim.x, y: victim.y };
      wall.strain = k;
      if (e > 2500) readout.setText('enemies cannot walk through — pushing builds strain…');
    });
    ctx.at(3950, () => {
      if (!wall.on) return;
      const h = hand(ctx);
      fx.snap(h.x, h.y, wallPt.x, wallPt.y, victim.x, victim.y);
      fx.lash(victim.x, victim.y);
      wall.on = false;
      float(ctx, victim.x, victim.y - 32, '-16  SNAP', STRING.snap, 12);
      readout.setText('…until it snaps and lashes whoever broke it. Shots that cross a string snap it too');
    });
  },
};

// ══ E — Spider Dance ═══════════════════════════════════════════════════

export const spiderDance: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'E — five spiders walk every strand you have out, biting what they touch. Snap their strand and they run wild',
  run(ctx) {
    const av = stand(ctx);
    const fx = fxOf(ctx);
    const victim = dummy(ctx, { x: ctx.cx + 230, y: ctx.cy });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(STRING.spiderMark), 11);
    const { list, pts } = strandLayer(ctx);
    const wallPt = { x: ctx.cx + 120, y: ctx.h - 4 };
    const tied: ShowStrand = { end: () => skin(victim), slack: 1.5, tied: victim, hex: false, on: true, strain: 0, bow: null };
    const wall: ShowStrand = { end: () => wallPt, slack: 0, tied: null, hex: false, on: true, strain: 0, bow: null };
    list.push(tied, wall);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9.2));
    interface S { on: ShowStrand | null; d: number; dir: number; x: number; y: number; ang: number; phase: number; vx: number; vy: number; turn: number; gate: number }
    const spiders: S[] = [];
    ctx.at(250, () => {
      av?.play('flex');
      readout.setText('five spiders, shared out over your strands — 8 damage a bite');
      const plan: [ShowStrand, number][] = [[tied, 0.3], [tied, 0.6], [tied, 0.85], [wall, 0.35], [wall, 0.7]];
      plan.forEach(([s, f], i) => {
        const p = pts(s);
        const d = polyLength(p) * f;
        const at = pointAlong(p, d);
        spiders.push({ on: s, d, dir: i % 2 ? -1 : 1, x: at.x, y: at.y, ang: at.ang, phase: i, vx: 0, vy: 0, turn: 0, gate: 0 });
        fx.spiderDrop(at.x, at.y);
      });
    });
    ctx.at(3600, () => {
      const h = hand(ctx);
      fx.snap(h.x, h.y, wallPt.x, wallPt.y, (h.x + wallPt.x) / 2, (h.y + wallPt.y) / 2);
      wall.on = false;
      for (const sp of spiders) if (sp.on === wall) sp.on = null;
      readout.setText('a strand snaps under them — and its spiders run off in a frenzy, still biting');
    });
    ctx.onFrame((dt, e) => {
      g.clear();
      const s = dt / 1000;
      for (const sp of spiders) {
        if (sp.on) {
          const p = pts(sp.on);
          const L = polyLength(p);
          sp.d += sp.dir * SPIDER_SPEED * s;
          if (sp.d > L - 6) { sp.d = L - 6; sp.dir = -1; }
          if (sp.d < 6) { sp.d = 6; sp.dir = 1; }
          const at = pointAlong(p, sp.d);
          sp.x = at.x; sp.y = at.y; sp.ang = at.ang + (sp.dir < 0 ? Math.PI : 0);
          sp.phase += s * 14;
        } else {
          if (e >= sp.turn) {
            const a = Math.random() * Math.PI * 2;
            sp.vx = Math.cos(a) * LOOSE_SPEED; sp.vy = Math.sin(a) * LOOSE_SPEED;
            sp.turn = e + 120 + Math.random() * 200;
          }
          sp.x = Phaser.Math.Clamp(sp.x + sp.vx * s, 30, ctx.w - 30);
          sp.y = Phaser.Math.Clamp(sp.y + sp.vy * s, 30, ctx.h - 30);
          sp.ang = Math.atan2(sp.vy, sp.vx);
          sp.phase += s * 24;
        }
        if (Phaser.Math.Distance.Between(sp.x, sp.y, victim.x, victim.y) < 36 + 17 && e > sp.gate) {
          sp.gate = e + 550;
          fx.spiderBite(victim.x, victim.y - 6);
          float(ctx, victim.x, victim.y - 30, '-8', STRING.spiderMark);
        }
        const fade = e > 5600 ? Math.max(0, 1 - (e - 5600) / 300) : 1;
        spiderBody(g, ctx.tint, sp.x, sp.y, sp.ang, sp.phase, SPIDER_SCALE, fade, !sp.on);
      }
    });
  },
};

// ══ R — Hexing Strand ══════════════════════════════════════════════════

export const hexingStrand: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  caption: 'R — a purple strand they walk through but are slowed by. R again snaps it: 22 damage and a heavy slow to everyone in it',
  run(ctx) {
    const av = stand(ctx);
    const fx = fxOf(ctx);
    const victim = dummy(ctx, { x: ctx.cx + 230, y: ctx.cy - 30 });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(STRING.hexGlow), 11);
    const { list, pts } = strandLayer(ctx);
    const wallPt = { x: ctx.cx + 330, y: ctx.h - 4 };
    const strand: ShowStrand = { end: () => wallPt, slack: 0, tied: null, hex: true, on: false, strain: 0, bow: null };
    list.push(strand);
    ctx.at(200, () => {
      const a = Math.atan2(wallPt.y - ctx.cy, wallPt.x - ctx.cx);
      av?.play('punch', a); av?.jerk(a);
      throwHook(ctx, () => wallPt, HEX_SPEED, true, () => { strand.on = true; });
      readout.setText('a thick purple strand — bodies walk straight through it');
    });
    // The dummy walks down across it at full speed, then at 60% while it touches it.
    let slowed = false;
    ctx.onFrame((dt, e) => {
      if (e < 900 || e > 3100) return;
      const p = pts(strand);
      let touching = false;
      for (const n of p) if (Phaser.Math.Distance.Between(n.x, n.y, victim.x, victim.y) < 26) touching = true;
      if (touching && strand.on && !slowed) { slowed = true; float(ctx, victim.x, victim.y - 30, 'HEXED  60%', STRING.hexGlow); readout.setText('touching it slows them to 60%'); }
      victim.y += (touching && strand.on ? 0.6 : 1) * 60 * (dt / 1000);
    });
    ctx.at(3200, () => {
      if (!strand.on) return;
      fx.hexSnap(pts(strand), 40);
      fx.snared(victim.x, victim.y, 17);
      strand.on = false;
      float(ctx, victim.x, victim.y - 32, '-22  SNARED', STRING.hexGlow, 12);
      readout.setText('R again snaps it — 22 damage and 30% speed for 3.5s to everyone caught');
    });
  },
};

// ══ F — Marionette ═════════════════════════════════════════════════════

export const marionette: PreviewScript = {
  duration: 5600,
  scale: 0.9,
  caption: 'F — a control bar makes them your puppet for 5s. Hold the arrow keys and they walk where you steer',
  run(ctx) {
    const av = stand(ctx);
    const fx = fxOf(ctx);
    const victim = dummy(ctx, { x: ctx.cx + 220, y: ctx.cy + 10 });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(STRING.woodLit), 11);
    const keys = label(ctx, ctx.w * 0.5, ctx.h - 14, hex(STRING.brassLit), 13);
    const { list } = strandLayer(ctx);
    const wallPt = { x: ctx.cx + 140, y: 4 };
    const wall: ShowStrand = { end: () => wallPt, slack: 0, tied: null, hex: false, on: true, strain: 0, bow: null };
    list.push(wall);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9.6));
    let bar: Pt | null = null;
    let barSpin = 0;
    let puppeted = false;
    ctx.at(200, () => {
      av?.play('sweep', 0); av?.jerk(0);
      const c = ctx.casterAt();
      bar = { x: c.x + 20, y: c.y };
      readout.setText('throw the control bar');
    });
    let steer = 0;
    ctx.onFrame((dt, e) => {
      g.clear();
      const s = dt / 1000;
      if (bar) {
        bar.x += BAR_SPEED * s;
        barSpin += s * 14;
        controlBar(g, ctx.tint, bar.x, bar.y, barSpin, 1.15, 1);
        if (bar.x >= victim.x - 30) {
          bar = null;
          puppeted = true;
          fx.barHit(victim.x, victim.y, 17);
          float(ctx, victim.x, victim.y - 34, '-8  PUPPET', STRING.woodLit, 12);
          readout.setText('they still walk on their own — until you hold the arrow keys');
        }
      }
      if (puppeted) {
        const t = e / 1000;
        steer = e > 1800 && e < 4000 ? 1 : 0;
        puppetRig(g, ctx.tint, victim.x, victim.y, 17, t, steer > 0, 1);
        if (steer) {
          keys.setText('← ↑');
          victim.x -= 70 * s * 0.7;
          victim.y -= 70 * s;
          wall.bow = { x: victim.x, y: victim.y };
          wall.strain = Math.min(1, (e - 2600) / 1200);
        } else {
          keys.setText('');
        }
      }
    });
    ctx.at(2000, () => readout.setText('walk them into your own strings…'));
    ctx.at(3800, () => {
      if (!wall.on) return;
      const h = hand(ctx);
      fx.snap(h.x, h.y, wallPt.x, wallPt.y, victim.x, victim.y);
      fx.lash(victim.x, victim.y);
      wall.on = false;
      float(ctx, victim.x, victim.y - 32, '-16  SNAP', STRING.snap, 12);
      readout.setText('…and they snap them on themselves');
    });
  },
};

// ══ Q — Linen Tomb ═════════════════════════════════════════════════════

export const linenTomb: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Q — wrapped in silk in the middle of the arena. Only their own attacks cut the 100 HP tomb; until then they cannot move or hurt you',
  run(ctx) {
    const av = stand(ctx);
    const fx = fxOf(ctx);
    const victim = dummy(ctx, { x: ctx.cx + 260, y: ctx.cy - 40 });
    const readout = label(ctx, ctx.w * 0.5, 14, hex(STRING.silk), 11);
    const mid = { x: ctx.w * 0.62, y: ctx.h * 0.55 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const top = ctx.adopt(ctx.scene.add.graphics().setDepth(9.6));
    let hp = 0;
    let shake = 0;
    ctx.at(200, () => {
      av?.play('raise', -Math.PI / 2, 700);
      av?.setWeave(1);
      readout.setText('pulled to the middle and wrapped in silk, strung to all four corners');
    });
    ctx.onFrame((dt, e) => {
      const s = dt / 1000;
      g.clear();
      top.clear();
      if (e < 300) return;
      const k = Math.min(1, (e - 300) / 400);
      if (e < 900) {
        victim.x += (mid.x - victim.x) * k;
        victim.y += (mid.y - victim.y) * k;
        if (hp === 0) { hp = 100; fx.tombWrap(mid.x, mid.y, 17); }
      }
      if (hp <= 0) return;
      shake = Math.max(0, shake - s * 5);
      for (const [cx, cy] of [[4, 4], [ctx.w - 4, 4], [4, ctx.h - 4], [ctx.w - 4, ctx.h - 4]]) {
        silkLine(g, ctx.tint, sagPoints(victim.x, victim.y, cx, cy, 1, 10), 0.95);
      }
      cocoon(top, ctx.tint, victim.x + Math.sin(e / 16) * 2.5 * shake, victim.y, 17, 1 - hp / 100, e / 1000, 1);
      tombBar(top, ctx.tint, victim.x, victim.y - 40, hp / 100, 1);
    });
    // Their attacks cut it from the inside; a struggle tears at them.
    const cuts: [number, number, string][] = [[1500, 10, 'Click −10'], [2100, 10, 'Click −10'], [2700, 20, 'E −20'], [3500, 10, 'Click −10'], [4100, 35, 'Q −35'], [4700, 10, 'Click −10'], [5100, 5, '']];
    for (const [at, cut, text] of cuts) {
      ctx.at(at, () => {
        hp = Math.max(0, hp - cut);
        shake = 1;
        fx.tombHit(victim.x + 8, victim.y - 6);
        if (text) float(ctx, victim.x + 40, victim.y - 20, text, STRING.silkShade);
        if (at === 1500) readout.setText('only their own attacks cut the silk: 100 HP');
        if (hp <= 0) {
          fx.tombBreak(victim.x, victim.y);
          av?.setWeave(0);
          readout.setText('torn free');
        }
      });
    }
    ctx.at(3100, () => {
      fx.tear(victim.x, victim.y);
      float(ctx, victim.x - 30, victim.y - 30, '-11  STRUGGLE', STRING.blood);
      readout.setText('trying to move tears at them — the faster, the worse');
    });
  },
};
