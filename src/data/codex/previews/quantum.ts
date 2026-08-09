import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  QC, coreAura, cutFlash, orbitShell, parasiteBody, splicerBlade, splitWall, stateBloom,
} from '../../../elements/kits/QuantumCoreVisuals';

/**
 * Quantum's showcases.
 *
 * The third state has no character rig of its own — the arena draws the plain `elem-quantum`
 * body with `coreAura` under it — and it has no `Fx` class either: every effect it produces is
 * a record in the kit's own `bursts` list, painted by `cutFlash` and `stateBloom`. These loops
 * therefore keep the same records and call the same painters, which is also how the blades
 * (`orbitShell` + `splicerBlade`), the seam (`splitWall`) and the parasite (`parasiteBody`) are
 * drawn here.
 *
 * The bond loops stage fire and water as the two halves, because a collapse has to be shown as
 * two real elements swapping rather than as an abstraction.
 */

// ── Staging ───────────────────────────────────────────────────────────

interface Mark { x: number; y: number }
interface Seg { x: number; y: number; r: number; hp: number; maxHp: number }
interface Burst { x: number; y: number; ang: number; born: number; seed: number; kind: 'cut' | 'bloom'; tint: number; r: number }

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

/**
 * The caster the arena actually draws for the third state: the element body sprite with
 * `coreAura` beneath it, and nothing else. Quantum is the one element with no character rig.
 */
function coreCaster(ctx: PreviewCtx, read: () => { x: number; y: number; texture?: string }): void {
  const key = 'elem-quantum';
  const img = ctx.scene.textures.exists(key)
    ? ctx.adopt(ctx.scene.add.image(ctx.cx, ctx.cy, key).setDepth(5))
    : null;
  const aura = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  ctx.onFrame((_delta, elapsed) => {
    const s = read();
    const tex = s.texture ?? key;
    if (img) {
      if (img.texture.key !== tex && ctx.scene.textures.exists(tex)) img.setTexture(tex);
      img.setPosition(s.x, s.y);
    }
    aura.clear();
    if (tex === key) coreAura(aura, s.x, s.y, 18, elapsed / 1000, 0);
  });
}

/** The kit's own burst list: `cutFlash` for a severed bead, `stateBloom` for everything else. */
function bursts(ctx: PreviewCtx, list: Burst[], depth = 10): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame((_delta, elapsed) => {
    g.clear();
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      const life = b.kind === 'cut' ? 420 : 460;
      const k = (elapsed - b.born) / life;
      if (k >= 1) { list.splice(i, 1); continue; }
      if (b.kind === 'cut') cutFlash(g, b.x, b.y, b.ang, k, b.seed);
      else stateBloom(g, b.x, b.y, k, b.tint, b.r);
    }
  });
}

/** The collapse ring the bond draws on every swap: one ring out, one ring in, three orbit ticks. */
function collapseRing(ctx: PreviewCtx, x: number, y: number, tint: number): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.scene.tweens.addCounter({
    from: 0, to: 1, duration: 380,
    onUpdate: (tw) => {
      if (!g.active) return;
      const t = Number(tw.getValue());
      g.clear();
      g.lineStyle(3 * (1 - t), QC.core, 0.9 * (1 - t));
      g.strokeCircle(x, y, 76 * t);
      g.lineStyle(2, tint, 0.85 * (1 - t));
      g.strokeCircle(x, y, 76 * (1 - t));
      g.lineStyle(1.5, QC.core, 0.5 * (1 - t));
      for (let i = 0; i < 3; i++) {
        const a = t * Math.PI * 2 + (i * Math.PI * 2) / 3;
        const r = 76 * t;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6);
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        g.strokePath();
      }
    },
    onComplete: () => g.destroy(),
  });
}

// ══ CLICK — Atom Splicers ═════════════════════════════════════════════

export const splicers: PreviewScript = {
  duration: 15000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Click — five permanent blades, 8 a cut. Hold to drive them from 48px to 112px.',
  run(ctx) {
    const me = { x: ctx.w * 0.36, y: ctx.h * 0.55 };
    coreCaster(ctx, () => me);
    const near = { x: me.x + 62, y: me.y + 10 };
    const wide = { x: me.x + 118, y: me.y - 18 };
    dummyAt(ctx, near); dummyAt(ctx, wide);
    const readout = label(ctx, ctx.w * 0.5, 12, '#7df9ff', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#eaffff', 10);

    // The kit's own ring record: radius and spin ease toward their targets rather than snapping.
    const ring = { ang: 0, r: 48, spin: 1.7, wideUntil: -1, gates: [0, 0, 0, 0, 0], dealt: 0 };
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      g.clear();
      const out = elapsed < ring.wideUntil;
      const k = Math.min(1, dt * 4.2);
      ring.r += ((out ? 112 : 48) - ring.r) * k;
      ring.spin += ((out ? 5.4 : 1.7) - ring.spin) * k;
      ring.ang += ring.spin * dt;
      const spinK = Phaser.Math.Clamp((ring.spin - 1.7) / (5.4 - 1.7), 0, 1);
      orbitShell(g, me.x, me.y, ring.r, elapsed / 1000, 0.6 + spinK * 0.4);
      for (let i = 0; i < 5; i++) {
        const a = ring.ang + (i * Math.PI * 2) / 5;
        splicerBlade(g, me.x + Math.cos(a) * ring.r, me.y + Math.sin(a) * ring.r,
          a, 30, spinK, elapsed / 1000, 1, i * 1.7);
        // The blade's tip is what cuts, and each blade carries its own 500ms gate per victim.
        const bx = me.x + Math.cos(a) * (ring.r + 9);
        const by = me.y + Math.sin(a) * (ring.r + 9);
        for (const t of [near, wide]) {
          if (Phaser.Math.Distance.Between(bx, by, t.x, t.y) > 30 * 0.55 + 18) continue;
          if (elapsed < ring.gates[i]) continue;
          ring.gates[i] = elapsed + 500;
          ring.dealt += 8;
          float(ctx, t.x, t.y - 24, '8', '#ffb3aa', 12);
        }
      }
      gauge.setText(`orbit ${Math.round(ring.r)}px   ·   ${(ring.spin / (Math.PI * 2)).toFixed(2)} rev/s`
        + `   ·   ${ring.dealt} dealt   ·   ${out ? 'held: driven wide' : 'at rest'}`);
    });

    ctx.at(300, () => readout.setText('while the third state is worn the blades are simply there — they are your body, not a summon'));
    ctx.at(2400, () => readout.setText('at rest: 48px, a revolution every 3.7 seconds, 8 a cut'));
    ctx.at(4600, () => {
      ring.wideUntil = 11000;
      readout.setText('hold Click and the whole ring eases out to 112px and 5.4 rad/s');
    });
    ctx.at(7000, () => readout.setText('which reaches about 130px from your chest, and passes far more often'));
    ctx.at(9200, () => readout.setText('but the cut is the same cut. The button buys coverage, never power.'));
    ctx.at(11600, () => readout.setText('a tap lets it fall back in — each cast marks it wide for 1.15s against a 900ms cooldown'));
    ctx.at(13400, () => readout.setText('and this Click can never spend an armed Ability Split. It is exempt.'));
  },
};

// ══ E — Ability Split ═════════════════════════════════════════════════

export const abilitySplit: PreviewScript = {
  duration: 14000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'E — the next ability you cast comes back in half the time, even after you collapse',
  run(ctx) {
    const me = { x: ctx.w * 0.34, y: ctx.h * 0.55, texture: 'elem-quantum' };
    coreCaster(ctx, () => me);
    const readout = label(ctx, ctx.w * 0.5, 12, '#b07dff', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#eaffff', 10);
    const list: Burst[] = [];
    bursts(ctx, list);

    const s = { armed: false, bar: 0, halved: false };
    // A cooldown wheel, so "half the time" is a thing you watch rather than a claim.
    const wheel = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    ctx.onFrame((delta, elapsed) => {
      wheel.clear();
      if (s.bar > 0) {
        s.bar = Math.max(0, s.bar - delta / (s.halved ? 15000 : 30000));
        const cx = ctx.w * 0.68, cy = ctx.h * 0.5;
        wheel.lineStyle(7, QC.deep, 0.9);
        wheel.strokeCircle(cx, cy, 34);
        wheel.lineStyle(7, s.halved ? QC.ghost : QC.core, 0.95);
        wheel.beginPath();
        wheel.arc(cx, cy, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.bar, false);
        wheel.strokePath();
      }
      gauge.setText(s.armed
        ? 'armed — waiting for whatever you cast next, whichever half of the bond you are wearing'
        : (s.bar > 0
          ? `${s.halved ? 'a 30s ultimate on a 15s clock' : 'a 30s ultimate on its full clock'} — ${(s.bar * (s.halved ? 15 : 30)).toFixed(1)}s left`
          : 'nothing armed'));
    });

    ctx.at(500, () => {
      s.armed = true;
      list.push({ x: me.x, y: me.y, ang: 0, born: 500, seed: 3, kind: 'bloom', tint: QC.ghost, r: 58 });
      float(ctx, me.x, me.y - 46, '⚛️ Ability Split', hex(QC.ghost), 12);
      readout.setText('the charge is banked on your body, not on this kit');
    });
    ctx.at(2600, () => {
      me.texture = 'elem-fire';
      collapseRing(ctx, me.x, me.y, 0xff6633);
      float(ctx, me.x, me.y - 52, '🔥 Fire', '#7df9ff', 12);
      readout.setText('...which is why it is still there after you have collapsed into something else');
    });
    ctx.at(5000, () => {
      s.armed = false;
      s.bar = 1;
      s.halved = true;
      list.push({ x: me.x, y: me.y, ang: 0, born: 5000, seed: 8, kind: 'bloom', tint: QC.ghost, r: 52 });
      float(ctx, me.x, me.y - 60, '⚛️ Halved!', hex(QC.ghost), 13);
      readout.setText('spend it on the other half\'s ultimate: 30 seconds of cooldown becomes 15');
    });
    ctx.at(8200, () => readout.setText('spent once, by the very next thing you cast — it has no timer of its own'));
    ctx.at(10600, () => readout.setText('and it cannot eat its own cooldown: E is already stamped by the time the charge is set'));
    ctx.at(12400, () => readout.setText('point it at a 900ms Click and you have wasted 11 seconds. Point it at an ultimate.'));
  },
};

// ══ R — Arena Split ═══════════════════════════════════════════════════

export const arenaSplit: PreviewScript = {
  duration: 15000,
  scale: 0.67,
  bodyTexture: '',
  caption: 'R — a seam down the middle for 15s: they cannot cross it, and no shot from either side can',
  run(ctx) {
    const me = { x: ctx.w * 0.3, y: ctx.h * 0.5, dir: 1 };
    coreCaster(ctx, () => me);
    const foe = { x: ctx.w * 0.72, y: ctx.h * 0.5 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 14, '#7df9ff', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#eaffff', 10);
    const list: Burst[] = [];
    bursts(ctx, list);

    const seamX = ctx.w / 2;
    const s = { until: -1, side: 1, blocked: 0 };
    const wall = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
    const shots: { x: number; y: number; vx: number; mine: boolean }[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      wall.clear(); air.clear();
      const live = elapsed < s.until;
      if (live) {
        splitWall(wall, seamX, 14, ctx.h - 14, 10, elapsed / 1000,
          Phaser.Math.Clamp((s.until - elapsed) / 600, 0, 1), 7);
      }
      // They keep trying to get back to you; the seam holds them at the line.
      const a = Math.atan2(me.y - foe.y, me.x - foe.x);
      foe.x += Math.cos(a) * 150 * dt;
      foe.y += Math.sin(a) * 150 * dt;
      if (live && s.side > 0 && foe.x < seamX + 28) foe.x = seamX + 28;
      // ...and you walk straight through it.
      me.x += 120 * me.dir * dt;
      if (me.x > ctx.w * 0.78) me.dir = -1;
      if (me.x < ctx.w * 0.2) me.dir = 1;

      for (let i = shots.length - 1; i >= 0; i--) {
        const p = shots[i];
        p.x += p.vx * dt;
        if (live && Math.abs(p.x - seamX) <= 20) {
          shots.splice(i, 1);
          s.blocked++;
          list.push({ x: p.x, y: p.y, ang: Math.PI / 2, born: elapsed, seed: 4, kind: 'bloom', tint: QC.hot, r: 26 });
          continue;
        }
        if (p.x < 0 || p.x > ctx.w) { shots.splice(i, 1); continue; }
        air.fillStyle(p.mine ? QC.core : QC.blood, 1);
        air.fillCircle(p.x, p.y, 5);
      }
      gauge.setText(live
        ? `${((s.until - elapsed) / 1000).toFixed(1)}s of seam   ·   ${s.blocked} shots deleted on it   ·   you are exempt, your shots are not`
        : 'no seam');
    });

    ctx.at(600, () => {
      s.until = 600 + 13000;
      s.side = 1;
      list.push({ x: seamX, y: ctx.h / 2, ang: 0, born: 600, seed: 2, kind: 'bloom', tint: QC.core, r: 150 });
      float(ctx, me.x, me.y - 46, '⚛️ Arena Split', hex(QC.core), 12);
      readout.setText('always the exact middle of the arena, full height — there is nothing to aim');
    });
    ctx.at(2600, () => {
      shots.push({ x: foe.x + 20, y: foe.y, vx: -520, mine: false });
      readout.setText('they are pinned to whichever half they were standing in when you cast it');
    });
    ctx.at(4200, () => { shots.push({ x: foe.x + 30, y: foe.y - 20, vx: -520, mine: false }); });
    ctx.at(5600, () => {
      shots.push({ x: me.x + 20, y: me.y + 14, vx: 520, mine: true });
      readout.setText('and your own shots die on it exactly as theirs do');
    });
    ctx.at(7800, () => readout.setText('the kill band is 20px, wider than the wall, so the fastest shots cannot tunnel through'));
    ctx.at(9800, () => readout.setText('you walk through freely — which means crossing means fighting without anything you throw'));
    ctx.at(12000, () => readout.setText('one seam a side: casting it again replaces your own rather than raising a second'));
  },
};

// ══ F — Effect Split ══════════════════════════════════════════════════

export const effectSplit: PreviewScript = {
  duration: 15000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'F — everything on you at half strength for two and a half times as long. Buffs too.',
  run(ctx) {
    const me = { x: ctx.w * 0.36, y: ctx.h * 0.55 };
    coreCaster(ctx, () => me);
    const readout = label(ctx, ctx.w * 0.5, 12, '#eaffff', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#b07dff', 10);
    const list: Burst[] = [];
    bursts(ctx, list);

    // Two effects riding on the body: a nasty vulnerability and a speed buff of your own.
    const eff = { vulnLeft: 0, vulnMult: 1.5, hasteLeft: 0, hasteMult: 1.4, split: false };
    const rows = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
    const rowText = [0, 1].map((i) => ctx.adopt(ctx.scene.add.text(ctx.w * 0.62, ctx.h * 0.36 + i * 26, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#eaffff',
    }).setOrigin(0, 0.5).setDepth(24)));

    ctx.onFrame((delta) => {
      rows.clear();
      eff.vulnLeft = Math.max(0, eff.vulnLeft - delta);
      eff.hasteLeft = Math.max(0, eff.hasteLeft - delta);
      const bar = (i: number, left: number, full: number, col: number): void => {
        const x = ctx.w * 0.62, y = ctx.h * 0.36 + i * 26 + 12;
        rows.fillStyle(QC.deep, 0.9);
        rows.fillRect(x, y, 150, 5);
        rows.fillStyle(col, 1);
        rows.fillRect(x, y, 150 * Phaser.Math.Clamp(left / full, 0, 1), 5);
      };
      bar(0, eff.vulnLeft, 12000, QC.blood);
      bar(1, eff.hasteLeft, 12000, QC.core);
      rowText[0].setText(`☠️ vulnerability ×${eff.vulnMult.toFixed(2)}  —  ${(eff.vulnLeft / 1000).toFixed(1)}s`);
      rowText[1].setText(`💨 speed ×${eff.hasteMult.toFixed(2)}  —  ${(eff.hasteLeft / 1000).toFixed(1)}s`);
      gauge.setText(eff.split
        ? 'split: every multiplier dragged halfway back to neutral, for as long as the longest thing it stretched'
        : 'two effects riding on the body — one theirs, one yours');
    });

    ctx.at(500, () => {
      eff.vulnLeft = 4000; eff.hasteLeft = 3000;
      readout.setText('a heavy vulnerability they put on you, and a speed buff of your own');
    });
    ctx.at(3000, () => {
      eff.vulnLeft *= 2.5; eff.hasteLeft *= 2.5;
      eff.vulnMult = 1 + (1.5 - 1) * 0.5;
      eff.hasteMult = 1 + (1.4 - 1) * 0.5;
      eff.split = true;
      list.push({ x: me.x, y: me.y, ang: 0, born: 3000, seed: 6, kind: 'bloom', tint: QC.hot, r: 76 });
      float(ctx, me.x, me.y - 46, '⚛️ Split ×2', hex(QC.hot), 12);
      readout.setText('F cuts both along their own length: half the strength, 2.5× the clock');
    });
    ctx.at(5600, () => readout.setText('×1.50 taken becomes ×1.25, and ×1.40 speed becomes ×1.20. It does not discriminate.'));
    ctx.at(8000, () => readout.setText('so a body carrying something nasty wants this, and a body carrying a big buff does not'));
    ctx.at(10400, () => readout.setText('it reaches whatever the other half of your bond left on you, too'));
    ctx.at(12600, () => readout.setText('on a clean body it is weak rather than wasted: a flat 4 seconds of halved multipliers'));
  },
};

// ══ Q — Quantum Parasite ══════════════════════════════════════════════

export const parasite: PreviewScript = {
  duration: 18000,
  scale: 0.7,
  bodyTexture: '',
  caption: 'Q — ten beads, 35 a bite, and every cut middle bead leaves two parasites instead of one',
  run(ctx) {
    const me = { x: ctx.w * 0.2, y: ctx.h * 0.72 };
    coreCaster(ctx, () => me);
    const foe = { x: ctx.w * 0.76, y: ctx.h * 0.34 };
    dummyAt(ctx, foe);
    const readout = label(ctx, ctx.w * 0.5, 14, '#7df9ff', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 16, '#ff5577', 10);
    const list: Burst[] = [];
    bursts(ctx, list);

    interface Worm { segs: Seg[]; ang: number; gate: number; seed: number }
    const worms: Worm[] = [];
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
    const pad = 26;

    const makeWorm = (x: number, y: number, ang: number): Worm => ({
      segs: Array.from({ length: 10 }, (_, i) => ({
        x: x - Math.cos(ang) * i * 18, y: y - Math.sin(ang) * i * 18, r: 11, hp: 35, maxHp: 35,
      })),
      ang, gate: 0, seed: Math.random() * 999,
    });

    /** The kit's own split: the bead is spent, the back half reverses and comes back. */
    const cut = (w: Worm, idx: number, elapsed: number): void => {
      const at = worms.indexOf(w);
      if (at < 0) return;
      const bead = w.segs[idx];
      worms.splice(at, 1);
      list.push({ x: bead.x, y: bead.y, ang: w.ang, born: elapsed, seed: 5, kind: 'cut', tint: QC.hot, r: 0 });
      float(ctx, bead.x, bead.y - 26, '⚛️ SPLIT!', hex(QC.core), 12);
      const spread = 0.85 + Math.random() * 0.6;
      const front = w.segs.slice(0, idx);
      const back = w.segs.slice(idx + 1).reverse();
      if (front.length >= 1) worms.push({ segs: front, ang: w.ang + spread, gate: 0, seed: 11 });
      if (back.length >= 1) worms.push({ segs: back, ang: w.ang + Math.PI - spread, gate: 0, seed: 21 });
    };

    ctx.onFrame((delta, elapsed) => {
      const dt = delta / 1000;
      air.clear();
      for (const w of worms) {
        const head = w.segs[0];
        head.x += Math.cos(w.ang) * 215 * dt;
        head.y += Math.sin(w.ang) * 215 * dt;
        if (head.x < pad) { head.x = pad; w.ang = Math.PI - w.ang; }
        if (head.x > ctx.w - pad) { head.x = ctx.w - pad; w.ang = Math.PI - w.ang; }
        if (head.y < pad) { head.y = pad; w.ang = -w.ang; }
        if (head.y > ctx.h - pad) { head.y = ctx.h - pad; w.ang = -w.ang; }
        for (let k = 1; k < w.segs.length; k++) {
          const prev = w.segs[k - 1];
          const sg = w.segs[k];
          const a = Math.atan2(sg.y - prev.y, sg.x - prev.x);
          sg.x = prev.x + Math.cos(a) * 18;
          sg.y = prev.y + Math.sin(a) * 18;
        }
        // The mouth bites, and only the mouth.
        if (Phaser.Math.Distance.Between(head.x, head.y, foe.x, foe.y) <= head.r * 1.6 + 18
          && elapsed >= w.gate) {
          w.gate = elapsed + 800;
          float(ctx, foe.x, foe.y - 26, '35', '#ffb3aa', 17);
        }
        parasiteBody(air, w.segs, w.ang, elapsed / 1000, 1, w.seed);
      }
      const beads = worms.reduce((n, w) => n + w.segs.length, 0);
      gauge.setText(`${worms.length} parasite${worms.length === 1 ? '' : 's'} loose · ${beads} beads`
        + '   ·   the mouth and the tail cannot be killed');
    });

    ctx.at(600, () => {
      worms.push(makeWorm(me.x, me.y, -0.6));
      list.push({ x: me.x, y: me.y, ang: 0, born: 600, seed: 1, kind: 'bloom', tint: QC.core, r: 90 });
      float(ctx, me.x, me.y - 46, '⚛️ Quantum Parasite', hex(QC.core), 12);
      readout.setText('ten beads at 215 px/s, reflecting off every wall, biting for 35');
    });
    ctx.at(4000, () => {
      const w = worms[0];
      if (w && w.segs.length > 4) cut(w, 4, 4000);
      readout.setText('somebody shoots a middle bead: 35 HP each, and anybody\'s shot counts');
    });
    ctx.at(7000, () => readout.setText('the bead is spent — and the back half turns around and comes back at whoever cut it'));
    ctx.at(9000, () => {
      const w = worms.find((o) => o.segs.length > 3);
      if (w) cut(w, 2, 9000);
      readout.setText('every cut is a multiplication. Eight cuttable beads means up to nine parasites.');
    });
    ctx.at(11400, () => {
      const w = worms.find((o) => o.segs.length > 2);
      if (w) cut(w, 1, 11400);
      readout.setText('you can farm your own worm — anything you throw at it is a cut, and a cut is a reward');
    });
    ctx.at(13800, () => readout.setText('the mouth and the tail swallow a shot whole and take nothing from it'));
    ctx.at(16000, () => readout.setText('15 seconds on the clock, and both halves of a cut inherit whatever is left of it'));
  },
};

// ══ PASSIVE — Bonded ══════════════════════════════════════════════════

export const bonded: PreviewScript = {
  duration: 16000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Passive — two elements, one body. The half you are not wearing keeps running.',
  run(ctx) {
    const me = { x: ctx.w * 0.34, y: ctx.h * 0.58, texture: 'elem-fire' };
    coreCaster(ctx, () => me);
    const readout = label(ctx, ctx.w * 0.5, 12, '#7df9ff', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#eaffff', 10);

    // The bond readout the kit paints above the tray: the live stop lit, the dormant one dimmed.
    const forms = [
      { id: 'fire', name: '🔥 Fire', col: 0xff6633 },
      { id: 'water', name: '💧 Water', col: 0x3399ff },
    ];
    const idx = { at: 0, hp: 268, pool: true };
    const hud = ctx.adopt(ctx.scene.add.graphics().setDepth(22));
    const hudText = forms.map(() => ctx.adopt(ctx.scene.add.text(0, 0, '', {
      fontSize: '11px', fontFamily: 'Arial Black',
    }).setOrigin(0.5).setDepth(23)));
    const world = ctx.adopt(ctx.scene.add.graphics().setDepth(3));

    ctx.onFrame((_delta, elapsed) => {
      hud.clear(); world.clear();
      const cx = ctx.w / 2, y = ctx.h - 46, slot = 86, total = slot * forms.length;
      hud.fillStyle(0x061014, 0.88);
      hud.fillRoundedRect(cx - total / 2, y - 20, total, 40, 8);
      hud.lineStyle(1.5, QC.core, 0.55);
      hud.strokeRoundedRect(cx - total / 2, y - 20, total, 40, 8);
      forms.forEach((f, i) => {
        const live = i === idx.at;
        const sx = cx - total / 2 + 6 + i * slot;
        const sw = slot - 8;
        if (live) { hud.fillStyle(f.col, 0.34); hud.fillRoundedRect(sx, y - 14, sw, 28, 6); }
        hud.lineStyle(live ? 1.5 : 1, f.col, live ? 0.95 : 0.3);
        hud.strokeRoundedRect(sx, y - 14, sw, 28, 6);
        hudText[i].setPosition(sx + sw / 2, y);
        hudText[i].setText(f.name);
        hudText[i].setColor(live ? '#ffffff' : '#5d7076');
      });
      // The fire pool the first half left behind, still burning while you are water.
      if (idx.pool) {
        const t = elapsed / 1000;
        world.fillStyle(0xff6633, 0.28 + 0.06 * Math.sin(t * 4));
        world.fillEllipse(ctx.w * 0.68, ctx.h * 0.44, 96, 42);
        world.fillStyle(0xffbb44, 0.35);
        world.fillEllipse(ctx.w * 0.68, ctx.h * 0.44, 54, 22);
      }
      gauge.setText(`health ${idx.hp}/400 — shared   ·   the dormant half is still being ticked every frame`);
    });

    ctx.at(600, () => readout.setText('a bond is two elements you researched in the Entanglement Lab'));
    ctx.at(2600, () => { idx.pool = true; readout.setText('as fire, you leave a burning pool on the floor'); });
    ctx.at(5000, () => {
      idx.at = 1;
      me.texture = 'elem-water';
      collapseRing(ctx, me.x, me.y, 0x3399ff);
      float(ctx, me.x, me.y - 52, '💧 Water', '#7df9ff', 12);
      readout.setText('collapse, and you are water — with the same health, shields and status effects');
    });
    ctx.at(7600, () => readout.setText('and the pool is still burning. The dormant half never stops being simulated.'));
    ctx.at(10000, () => readout.setText('the shop upgrades, the mastery binds and the equipped skin all follow the half you wear'));
    ctx.at(12600, () => readout.setText('cooldowns are per ability on one body, so what you started still runs while you are away'));
    ctx.at(14400, () => readout.setText('an enemy Quantum rotates on a rhythm — 16s down to 5.5s by difficulty — so it can be learnt'));
  },
};

// ══ PASSIVE — Collapse ════════════════════════════════════════════════

export const collapse: PreviewScript = {
  duration: 13000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Passive — your dodge is the swap, and it is instant',
  run(ctx) {
    const me = { x: ctx.w * 0.26, y: ctx.h * 0.55, texture: 'elem-fire' };
    coreCaster(ctx, () => me);
    const readout = label(ctx, ctx.w * 0.5, 12, '#7df9ff', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#eaffff', 10);

    const cycle = [
      { tex: 'elem-fire', name: '🔥 Fire', col: 0xff6633 },
      { tex: 'elem-water', name: '💧 Water', col: 0x3399ff },
      { tex: 'elem-quantum', name: '⚛️ Quantum', col: QC.core },
    ];
    const s = { at: 0, third: false, dash: -1 };
    ctx.onFrame((delta, elapsed) => {
      // The dash still happens exactly as it would for anybody else.
      if (elapsed < s.dash) me.x += 520 * (delta / 1000);
      if (me.x > ctx.w * 0.8) me.x = ctx.w * 0.2;
      gauge.setText(s.third
        ? 'with Third State: first → second → Quantum → first'
        : 'without it: first → second → first');
    });

    const dodge = (at: number, note: string): void => ctx.at(at, () => {
      s.at = (s.at + 1) % (s.third ? 3 : 2);
      const f = cycle[s.at];
      me.texture = f.tex;
      s.dash = at + 220;
      collapseRing(ctx, me.x, me.y, f.col);
      float(ctx, me.x, me.y - 52, f.name, '#7df9ff', 12);
      readout.setText(note);
    });

    ctx.at(400, () => readout.setText('there is no swap key. The dodge is the swap.'));
    dodge(1400, 'the dash happens exactly as it would for anybody else — you just land as the other half');
    ctx.at(3400, () => readout.setText('the 380ms collapse ring is decoration; the re-key is on the frame you dodge'));
    dodge(4400, 'and back again. Nothing you left in the world is disturbed by it.');
    ctx.at(6400, () => { s.third = true; readout.setText('with Third State bought, the coin has three faces'); });
    dodge(7400, 'first element...');
    dodge(9000, '...second element...');
    dodge(10600, '...and Quantum itself, which finally has a kit of its own');
  },
};

// ══ PASSIVE — Quantum Instability ═════════════════════════════════════

export const instability: PreviewScript = {
  duration: 17000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Passive — 1 point a hit, 1% more damage taken per point, capped at 50 and shed 1 per 2s',
  run(ctx) {
    const me = { x: ctx.w * 0.34, y: ctx.h * 0.56 };
    coreCaster(ctx, () => me);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff5577', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#7df9ff', 10);
    const list: Burst[] = [];
    bursts(ctx, list);

    const s = { v: 0, decay: 0, hitting: false, next: 0 };
    const meter = ctx.adopt(ctx.scene.add.graphics().setDepth(22));
    ctx.onFrame((delta, elapsed) => {
      meter.clear();
      // A point every 2 seconds, carried across frames exactly as the kit does it.
      if (s.v > 0) {
        s.decay += delta;
        while (s.decay >= 2000 && s.v > 0) { s.decay -= 2000; s.v -= 1; }
      } else s.decay = 0;
      if (s.hitting && elapsed >= s.next) {
        s.next = elapsed + 420;
        s.v = Math.min(50, s.v + 1);
        float(ctx, me.x, me.y - 30, '+1', hex(QC.blood), 11);
      }
      const x = ctx.w * 0.56, y = ctx.h * 0.42, w = 190, h = 12;
      meter.fillStyle(QC.dark, 0.9);
      meter.fillRect(x, y, w, h);
      meter.fillStyle(s.v >= 40 ? QC.blood : QC.core, 1);
      meter.fillRect(x, y, w * (s.v / 50), h);
      meter.lineStyle(1.5, s.v >= 40 ? QC.blood : QC.core, 0.7);
      meter.strokeRect(x, y, w, h);
      // The 40 mark, which is where a collapse starts costing health.
      meter.lineStyle(1.5, QC.hot, 0.8);
      meter.lineBetween(x + w * 0.8, y - 3, x + w * 0.8, y + h + 3);
      gauge.setText(`instability ${s.v}   ·   taking ${s.v}% more damage   ·   ${s.v >= 40 ? 'a collapse now costs 25 HP' : 'a collapse is clean'}`);
    });

    ctx.at(400, () => readout.setText('carrying two kits is paid for one hit at a time'));
    ctx.at(1600, () => { s.hitting = true; readout.setText('one point per hit — it does not matter at all how big the hit was'); });
    ctx.at(6000, () => { s.hitting = false; readout.setText('one point is one percent more damage taken, one for one'); });
    ctx.at(8600, () => readout.setText('it bleeds off at 1 every 2 seconds, so a full 50 takes 100 seconds to clear'));
    ctx.at(11200, () => readout.setText('a hit fully eaten by a shield or an absorber adds nothing — only damage that got through counts'));
    ctx.at(13800, () => readout.setText('at the 50 cap everything in the game hits you half again as hard'));
  },
};

// ══ PASSIVE — Torn Collapse ═══════════════════════════════════════════

export const tornCollapse: PreviewScript = {
  duration: 14000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Passive — collapse at 40 instability or more and it takes 25 health out of you',
  run(ctx) {
    const me = { x: ctx.w * 0.34, y: ctx.h * 0.56, texture: 'elem-fire' };
    coreCaster(ctx, () => me);
    const readout = label(ctx, ctx.w * 0.5, 12, '#ff5577', 11);
    const gauge = label(ctx, ctx.w * 0.5, ctx.h - 14, '#eaffff', 10);

    const s = { v: 12, hp: 300 };
    const meter = ctx.adopt(ctx.scene.add.graphics().setDepth(22));
    ctx.onFrame(() => {
      meter.clear();
      const x = ctx.w * 0.56, y = ctx.h * 0.4, w = 190, h = 12;
      meter.fillStyle(QC.dark, 0.9);
      meter.fillRect(x, y, w, h);
      meter.fillStyle(s.v >= 40 ? QC.blood : QC.core, 1);
      meter.fillRect(x, y, w * (s.v / 50), h);
      meter.lineStyle(1.5, QC.hot, 0.8);
      meter.lineBetween(x + w * 0.8, y - 3, x + w * 0.8, y + h + 3);
      gauge.setText(`instability ${s.v}   ·   health ${s.hp}/400   ·   ${s.v >= 40 ? 'the next collapse tears' : 'clean'}`);
    });

    const swap = (at: number, note: string): void => ctx.at(at, () => {
      const toQuantum = me.texture !== 'elem-quantum';
      me.texture = toQuantum ? 'elem-quantum' : 'elem-fire';
      collapseRing(ctx, me.x, me.y, toQuantum ? QC.core : 0xff6633);
      float(ctx, me.x, me.y - 52, toQuantum ? '⚛️ Quantum' : '🔥 Fire', '#7df9ff', 12);
      if (s.v >= 40) {
        s.hp -= 25;
        float(ctx, me.x, me.y - 74, '⚛️ Unstable! −25', '#ff5577', 13);
      }
      readout.setText(note);
    });

    ctx.at(400, () => readout.setText('at 12 instability the collapse is clean — the bond is a rhythm you keep'));
    swap(1600, 'nothing is charged for it, and nothing about the swap is any different');
    ctx.at(4000, () => { s.v = 44; readout.setText('but forty hits inside the decay window and the body is coming apart'); });
    swap(6000, 'the collapse still works. It just takes 25 health out of you on the way through.');
    ctx.at(8400, () => readout.setText('flat 25 at 40 and flat 25 at the cap — there is no worse version to be afraid of'));
    ctx.at(10600, () => readout.setText('though it goes through your own instability, so at the cap it really costs about 38'));
    ctx.at(12400, () => readout.setText('the bond is not an escape hatch from a fight going badly. It is a rhythm you keep before it does.'));
  },
};
