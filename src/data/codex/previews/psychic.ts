import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import {
  ChessKind, OUTPLAY, PSY, PsychicAvatar, PsychicFx, chessPiece, heavenlyAura, mightAura,
  moveGuide, outplayedAura, premoveClock, queenCrown, queueCard, rideWard, sightSquare, strideAura,
} from '../../../elements/kits/PsychicVisuals';

/**
 * Psychic's showcases.
 *
 * Nothing in the kit is a projectile, so nothing here goes through `ctx.fly`. Every loop keeps
 * the same small records the kit keeps (a pawn, a piece and its move, the queue) and paints them
 * with the kit's own exported painters — `chessPiece` for the board, `heavenlyAura` /
 * `strideAura` / `mightAura` under it, `moveGuide` for a picked-up piece, `queueCard` for the
 * passive's stack. One-shots go through a real `PsychicFx` with a sticky sink.
 */

// ── Staging ───────────────────────────────────────────────────────────

const AURA_R = 110;
const KNIGHT_UNIT = 75;

function fxOf(ctx: PreviewCtx): PsychicFx {
  return ctx.capture(() => new PsychicFx(ctx.scene, ctx.tint).setSink(ctx.sink));
}

/** A stand-in enemy that can be moved around, unlike `ctx.addDummy`'s fixed mark. */
function dummyAt(ctx: PreviewCtx, at: { x: number; y: number }, depth = 4): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1); g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1); g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9); g.fillCircle(at.x - 5, at.y - 4, 3.2); g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1); g.fillCircle(at.x - 5.6, at.y - 4, 1.6); g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
  });
}

/** The passive's shadow: the stand-in's own silhouette, filled with ink, a second ahead. */
function shadowOf(g: Phaser.GameObjects.Graphics, tint: (c: number) => number, x: number, y: number, t: number): void {
  const a = 0.5 + 0.08 * Math.sin(t * 5);
  g.fillStyle(tint(PSY.violet), 0.16);
  g.fillCircle(x, y, 28);
  g.fillStyle(tint(PSY.ink), 0.3);
  g.fillEllipse(x, y + 18, 30, 8);
  g.fillStyle(tint(PSY.robe), a);
  g.fillCircle(x, y, 17);
  g.lineStyle(1.6, tint(PSY.violetLit), 0.6);
  g.strokeCircle(x, y, 22);
}

function float(ctx: PreviewCtx, x: number, y: number, text: string, color: string, size = 11): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
  ctx.scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 900 });
}

function label(ctx: PreviewCtx, x: number, y: number, color: string, size = 11): Phaser.GameObjects.Text {
  return ctx.adopt(ctx.scene.add.text(x, y, '', {
    fontSize: `${size}px`, fontFamily: 'Arial Black', color,
  }).setOrigin(0.5).setDepth(19));
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** The monk's rig, or null when a skin has replaced the character. */
function monk(av: unknown): PsychicAvatar | null {
  return av instanceof PsychicAvatar ? av : null;
}

/** A piece on the preview's board, exactly as the kit keeps one. */
interface Board {
  kind: ChessKind;
  x: number;
  y: number;
  aura: boolean;
  alive: boolean;
  selected: boolean;
  lift: number;
  face: number;
  guide: { x: number; y: number; leap: boolean; hot: boolean; blast: number } | null;
}

function piece(kind: ChessKind, x: number, y: number, aura = true): Board {
  return { kind, x, y, aura, alive: false, selected: false, lift: 0, face: 1, guide: null };
}

// `ctx.at` is a delayedCall measured from when it is registered, so one registered inside
// another's callback takes the delay *from that moment* — never `base + N`.

/** Paint a set of pieces: auras under the fighters, pieces among them, guides over them. */
function board(ctx: PreviewCtx, pieces: Board[]): void {
  const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
  const mid = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
  ctx.onFrame((_dt, elapsed) => {
    ground.clear(); mid.clear(); air.clear();
    const t = elapsed / 1000;
    for (const p of pieces) {
      if (!p.alive) continue;
      if (p.aura) {
        if (p.kind === 'bishop') heavenlyAura(ground, ctx.tint, p.x, p.y, AURA_R, 0.9, t, 7);
        else if (p.kind === 'knight') strideAura(ground, ctx.tint, p.x, p.y, AURA_R, 0.9, t);
        else if (p.kind === 'rook') mightAura(ground, ctx.tint, p.x, p.y, AURA_R, 0.9, t);
      }
      if (p.selected) {
        mid.lineStyle(2.4, ctx.tint(PSY.gold), 0.95);
        mid.strokeEllipse(p.x, p.y + 12, 44, 16);
      }
      chessPiece(mid, ctx.tint, p.kind, 'white', p.x, p.y - 8, p.kind === 'pawn' ? 0.72 : 1, 1,
        { face: p.face, lift: p.lift, glow: p.selected ? 1 : 0.5 });
      if (p.guide) {
        moveGuide(air, ctx.tint, p.x, p.y, p.guide.x, p.guide.y, p.guide.leap, p.guide.hot, 0.95, t, p.guide.blast);
      }
    }
  });
}

/** Slide (or leap) a preview piece to `to` over `ms`, calling `onPass` once when it crosses `hit`. */
function movePreview(
  ctx: PreviewCtx, p: Board, to: { x: number; y: number }, ms: number, leap: boolean,
  hit: { x: number; y: number } | null, onPass: () => void, onLand?: () => void,
): void {
  const from = { x: p.x, y: p.y };
  let passed = false;
  let k = 0;
  ctx.onFrame((dt) => {
    if (k >= 1) return;
    k = Math.min(1, k + dt / ms);
    const e = leap ? k : 1 - (1 - k) * (1 - k);
    p.x = from.x + (to.x - from.x) * e;
    p.y = from.y + (to.y - from.y) * e;
    p.lift = leap ? Math.sin(k * Math.PI) * 46 : 0;
    if (!leap && hit && !passed && Phaser.Math.Distance.Between(p.x, p.y, hit.x, hit.y) < 30) {
      passed = true;
      onPass();
    }
    if (k >= 1) onLand?.();
  });
}

/** The passive's stack over the caster: next at the bottom, later ones above. */
function queueStack(
  ctx: PreviewCtx,
  read: () => { key: string; name: string; big: boolean; left: number }[],
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
  const texts: Phaser.GameObjects.Text[] = [];
  const text = (i: number): Phaser.GameObjects.Text => {
    let t = texts[i];
    if (!t) {
      t = ctx.adopt(ctx.scene.add.text(0, 0, '', {
        fontFamily: 'monospace', fontSize: '10px', color: hex(PSY.aether), fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(17));
      texts.push(t);
    }
    return t;
  };
  ctx.onFrame(() => {
    g.clear();
    for (const t of texts) t.setVisible(false);
    const cards = read();
    const at = ctx.casterAt();
    let y = at.y - 54;
    let n = 0;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const next = i === 0;
      const w = next ? 104 : 88;
      const h = next ? 20 : 16;
      queueCard(g, ctx.tint, at.x, y, w, h, next ? 1 : 0.85 - i * 0.12, c.left, next, c.big);
      const bw = h - 4;
      text(n++).setVisible(true).setText(c.key === 'Click' ? 'M1' : c.key)
        .setStyle({ fontSize: c.key.length > 1 ? '8px' : '10px', color: hex(c.big ? PSY.ink : PSY.aether) })
        .setPosition(at.x - w / 2 + 3 + bw / 2, y - 0.5);
      text(n++).setVisible(true).setText(c.name)
        .setStyle({ fontSize: next ? '10px' : '8px', color: hex(next ? PSY.gold : PSY.violetLit) })
        .setPosition(at.x + bw / 2 + 1, y - 1);
      y -= h + 3;
    }
    if (cards.length) {
      text(n++).setVisible(true).setText('NEXT ▾').setStyle({ fontSize: '8px', color: hex(PSY.gold) })
        .setPosition(at.x + 70, at.y - 54);
    }
  });
}

// ══ CLICK — En Passant ════════════════════════════════════════════════

export const enPassant: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Click — a pawn steps toward the cursor (8), then captures on both forward diagonals (16) every second',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(0.5);
    const readout = label(ctx, ctx.w * 0.5, 12, '#d8d8de', 11);

    const front = { x: ctx.cx + 170, y: ctx.cy };
    const diag = { x: ctx.cx + 186, y: ctx.cy - 44 };
    dummyAt(ctx, front);
    dummyAt(ctx, diag);
    const pawns: Board[] = [];
    board(ctx, pawns);

    const throwPawn = (at: number, to: { x: number; y: number }, touch: { x: number; y: number } | null, strikeOn: { x: number; y: number } | null): void => {
      ctx.at(at, () => {
        const ang = Math.atan2(to.y - ctx.cy, to.x - ctx.cx);
        av.play('punch', ang);
        const p = piece('pawn', ctx.cx + Math.cos(ang) * 18, ctx.cy + Math.sin(ang) * 18, false);
        p.alive = true;
        pawns.push(p);
        movePreview(ctx, p, to, 300, false, touch, () => {
          if (!touch) return;
          float(ctx, touch.x, touch.y - 24, '8', '#ffb3aa', 13);
          ctx.capture(() => fx.pieceHit(touch.x, touch.y, ang));
        });
        for (let k = 0; k < 3; k++) {
          ctx.at(300 + k * 1000, () => {
            ctx.capture(() => fx.pawnStrike(p.x, p.y - 6, ang, 48));
            if (!strikeOn) return;
            float(ctx, strikeOn.x, strikeOn.y - 26, '16', hex(PSY.gold), 14);
            ctx.capture(() => fx.pieceHit(strikeOn.x, strikeOn.y, ang));
          });
        }
        ctx.at(3000, () => { p.alive = false; ctx.capture(() => fx.vanish(p.x, p.y)); });
      });
    };

    ctx.at(200, () => readout.setText('a pawn is thrown one step toward the cursor — 8 to whatever it walks into'));
    throwPawn(500, { x: front.x - 6, y: front.y }, front, null);
    ctx.at(3900, () => readout.setText('once it stops, it captures like a pawn: forward-left and forward-right, for 16'));
    throwPawn(4200, { x: ctx.cx + 152, y: ctx.cy - 10 }, null, diag);
    ctx.at(7400, () => readout.setText('again every second until it vanishes, 3 seconds after it was thrown'));
  },
};

// ══ E — Bisharp ═══════════════════════════════════════════════════════

export const bisharp: PreviewScript = {
  duration: 9500,
  scale: 0.9,
  caption: 'E — a bishop whose heavenly light cuts 15% off every hit you take; click it to slide it diagonally for 40',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(0.6);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(PSY.gold), 11);

    const b = piece('bishop', ctx.cx + 60, ctx.cy + 20);
    board(ctx, [b]);
    const enemy = { x: b.x + 150, y: b.y - 150 * 0.42 };
    // A diagonal through the enemy, from the bishop: the enemy stands on it.
    enemy.x = b.x + 95; enemy.y = b.y - 95;
    dummyAt(ctx, enemy);

    ctx.at(400, () => {
      b.alive = true;
      av.play('slam', 0);
      ctx.capture(() => fx.summonPiece(b.x, b.y, true));
      readout.setText('a bishop on the cursor, pouring heavenly light around it');
    });
    ctx.at(1800, () => readout.setText('standing in it: 15% less damage taken — and every other bishop stacks'));
    ctx.at(2600, () => {
      float(ctx, ctx.cx, ctx.cy - 40, '20 → 17', '#ffb3aa', 13);
      float(ctx, ctx.cx, ctx.cy - 60, "✝️ BISHOP'S GRACE", hex(PSY.gold), 10);
    });
    ctx.at(4200, () => {
      b.selected = true;
      b.guide = { x: b.x + 170, y: b.y - 170, leap: false, hot: true, blast: 0 };
      readout.setText('click the bishop to pick it up — the guide turns gold when the line runs through someone');
    });
    ctx.at(5800, () => {
      b.selected = false;
      b.guide = null;
      const to = { x: b.x + 170, y: b.y - 170 };
      const from = { x: b.x, y: b.y };
      movePreview(ctx, b, to, 260, false, enemy, () => {
        float(ctx, enemy.x, enemy.y - 26, '40', hex(PSY.gold), 15);
        ctx.capture(() => fx.pieceHit(enemy.x, enemy.y, -Math.PI / 4));
      }, () => ctx.capture(() => fx.slide(from.x, from.y, to.x, to.y)));
      readout.setText('click again: it slides diagonally like a real bishop, through everyone in the way');
    });
    ctx.at(8000, () => readout.setText('8 seconds on the board — it can move again every 2 seconds'));
  },
};

// ══ R — Knightly Mandate ══════════════════════════════════════════════

export const knightlyMandate: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'R — a knight whose aura makes you 15% faster; it jumps like a chess knight and lands in a 35-damage blast',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(0.6);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(PSY.violetLit), 11);

    const k = piece('knight', ctx.cx + 80, ctx.cy + 30);
    board(ctx, [k]);
    const land = { x: k.x + KNIGHT_UNIT * 2, y: k.y - KNIGHT_UNIT };
    const enemy = { x: land.x + 14, y: land.y + 6 };
    dummyAt(ctx, enemy);

    ctx.at(400, () => {
      k.alive = true;
      av.play('slam', 0);
      ctx.capture(() => fx.summonPiece(k.x, k.y));
      readout.setText('a knight on the cursor, with a galloping wind around it');
    });
    ctx.at(1500, () => {
      ctx.glideCaster({ to: { x: ctx.cx + 60, y: ctx.cy + 10 }, ms: 700, ease: 'out' });
      readout.setText('step into it and you move 15% faster — every other knight stacks');
      float(ctx, ctx.cx + 60, ctx.cy - 40, "🐎 KNIGHT'S STRIDE", hex(PSY.violetLit), 10);
    });
    ctx.at(3800, () => {
      k.selected = true;
      k.guide = { x: land.x, y: land.y, leap: true, hot: true, blast: 80 };
      readout.setText('pick it up: it jumps two squares one way and one the other, over anything in between');
    });
    ctx.at(5400, () => {
      k.selected = false;
      k.guide = null;
      movePreview(ctx, k, land, 340, true, null, () => {}, () => {
        ctx.capture(() => fx.landing(land.x, land.y, 80));
        float(ctx, enemy.x, enemy.y - 26, '35', hex(PSY.violetLit), 15);
      });
      readout.setText('and it comes down in an explosion — the leap does not hit, the landing does');
    });
  },
};

// ══ F — Rook Battery ══════════════════════════════════════════════════

export const rookBattery: PreviewScript = {
  duration: 10000,
  scale: 0.85,
  caption: 'F — a rook whose aura adds 15% damage; it slides along a rank for 45 and captures any piece it runs over',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(0.6);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(PSY.stress), 11);

    const r = piece('rook', ctx.cx + 40, ctx.cy + 40);
    const b = piece('bishop', ctx.cx + 230, ctx.cy + 40);
    board(ctx, [r, b]);
    const enemy = { x: ctx.cx + 140, y: ctx.cy + 40 };
    dummyAt(ctx, enemy);

    ctx.at(300, () => { b.alive = true; ctx.capture(() => fx.summonPiece(b.x, b.y, true)); });
    ctx.at(900, () => {
      r.alive = true;
      av.play('slam', 0);
      ctx.capture(() => fx.summonPiece(r.x, r.y));
      readout.setText('a rook on the cursor: 15% more damage dealt while you stand in its aura');
    });
    ctx.at(3000, () => {
      r.selected = true;
      r.guide = { x: r.x + 300, y: r.y, leap: false, hot: true, blast: 0 };
      readout.setText('it slides along ranks and files — and through the bishop at the end of the line');
    });
    ctx.at(4600, () => {
      r.selected = false;
      r.guide = null;
      const from = { x: r.x, y: r.y };
      const to = { x: r.x + 300, y: r.y };
      movePreview(ctx, r, to, 300, false, enemy, () => {
        float(ctx, enemy.x, enemy.y - 26, '45 +15%', hex(PSY.stress), 14);
        ctx.capture(() => fx.pieceHit(enemy.x, enemy.y, 0));
      }, () => ctx.capture(() => fx.slide(from.x, from.y, to.x, to.y)));
      ctx.at(190, () => {
        b.alive = false;
        ctx.capture(() => fx.capture(b.x, b.y));
        float(ctx, b.x, b.y - 40, '♜ CAPTURED', hex(PSY.stress), 11);
        float(ctx, ctx.cx, ctx.cy - 58, "+BISHOP'S GRACE 30s", hex(PSY.gold), 11);
      });
    });
    ctx.at(6000, () => readout.setText('a captured piece is gone — and you wear its aura for 30 seconds, wherever you go'));
    ctx.at(8200, () => readout.setText('yours or theirs: any bishop, knight or rook it runs over'));
  },
};

// ══ Q — Queen ═════════════════════════════════════════════════════════

export const queen: PreviewScript = {
  duration: 11000,
  scale: 0.8,
  caption: 'Q — 15s as the queen: every aura ×3, no legs, and a click that slides you like a queen into an explosion',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(1);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(PSY.gold), 11);
    const e1 = { x: ctx.cx + 170, y: ctx.cy };
    const e2 = { x: ctx.cx + 300, y: ctx.cy - 110 };
    dummyAt(ctx, e1);
    dummyAt(ctx, e2);

    let crowned = false;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
    const guide = { to: null as { x: number; y: number } | null };
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (!crowned) return;
      const at = ctx.casterAt();
      queenCrown(g, ctx.tint, at.x, at.y - 50, 1.1, 0.95, elapsed / 1000);
      if (guide.to) moveGuide(g, ctx.tint, at.x, at.y, guide.to.x, guide.to.y, false, true, 0.95, elapsed / 1000, 85);
    });

    ctx.at(400, () => {
      crowned = true;
      av.play('raise');
      ctx.capture(() => fx.coronation(ctx.cx, ctx.cy));
      float(ctx, ctx.cx, ctx.cy - 70, '♛ QUEEN', hex(PSY.gold), 14);
      readout.setText('every aura at once, three times over: 45% less damage taken, 45% more dealt');
    });
    const slide = (at: number, to: { x: number; y: number }, hit: { x: number; y: number } | null): void => {
      ctx.at(at - 900, () => { guide.to = to; });
      ctx.at(at, () => {
        guide.to = null;
        const from = ctx.casterAt();
        ctx.glideCaster({ to, ms: 260, ease: 'out', onDone: () => {
          ctx.capture(() => fx.slide(from.x, from.y, to.x, to.y));
          ctx.capture(() => fx.landing(to.x, to.y, 85));
        } });
        if (hit) {
          ctx.at(120, () => {
            float(ctx, hit.x, hit.y - 26, '25', hex(PSY.gold), 14);
            ctx.capture(() => fx.pieceHit(hit.x, hit.y, Math.atan2(to.y - from.y, to.x - from.x)));
          });
        }
      });
    };
    ctx.at(2400, () => readout.setText('no legs — a click moves you like a queen: eight lines, through anyone in the way'));
    slide(3600, { x: ctx.cx + 230, y: ctx.cy }, e1);
    ctx.at(4400, () => readout.setText('25 on the way through, and a 20-damage explosion where you land'));
    slide(6200, { x: ctx.cx + 230 + 70, y: ctx.cy - 70 }, null);
    slide(8400, { x: ctx.cx + 100, y: ctx.cy + 60 }, null);
    ctx.at(8800, () => readout.setText('pieces still answer clicks while you reign — click one to move it instead'));
    ctx.at(10500, () => { crowned = false; });
  },
};

// ══ UPGRADES ══════════════════════════════════════════════════════════

// ── Click+ Insight Move ──

export const enPassantUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.85,
  caption: 'Click+ Insight Move — a pawn whose first capture finds nobody steps forward again; one that hits stays put',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(0.6);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(PSY.gold), 11);

    // Far: only a second step brings the pawn's diagonal onto them.
    const far = { x: ctx.cx + 18 + 260 + 34, y: ctx.cy - 34 };
    // Near: on the first stop's diagonal, so that pawn never moves again.
    const a2 = 0.5;
    const stop2 = { x: ctx.cx + Math.cos(a2) * 148, y: ctx.cy + Math.sin(a2) * 148 };
    const near = { x: stop2.x + Math.cos(a2 + Math.PI / 4) * 44, y: stop2.y + Math.sin(a2 + Math.PI / 4) * 44 };
    dummyAt(ctx, far);
    dummyAt(ctx, near);
    const pawns: Board[] = [];
    board(ctx, pawns);

    const strike = (p: Board, ang: number, on: { x: number; y: number } | null): void => {
      ctx.capture(() => fx.pawnStrike(p.x, p.y - 6, ang, 48));
      if (!on) return;
      float(ctx, on.x, on.y - 26, '16', hex(PSY.gold), 14);
      ctx.capture(() => fx.pieceHit(on.x, on.y, ang));
    };

    ctx.at(400, () => {
      readout.setText('the first capture lands on empty squares…');
      av.play('punch', 0);
      const p = piece('pawn', ctx.cx + 18, ctx.cy, false);
      p.alive = true;
      pawns.push(p);
      movePreview(ctx, p, { x: ctx.cx + 148, y: ctx.cy }, 300, false, null, () => {});
      ctx.at(300, () => {
        strike(p, 0, null);
        ctx.capture(() => fx.insight(p.x, p.y - 6, 0));
        float(ctx, p.x, p.y - 40, 'INSIGHT', hex(PSY.gold), 10);
        movePreview(ctx, p, { x: ctx.cx + 278, y: ctx.cy }, 300, false, null, () => {});
      });
      ctx.at(620, () => strike(p, 0, far));
      ctx.at(1620, () => strike(p, 0, far));
      ctx.at(2620, () => strike(p, 0, far));
      ctx.at(3000, () => { p.alive = false; ctx.capture(() => fx.vanish(p.x, p.y)); });
    });
    ctx.at(1100, () => readout.setText('…so it steps forward again, and captures from there'));
    ctx.at(4600, () => {
      readout.setText('a pawn whose first capture hits stays where it is — two steps at most');
      av.play('punch', a2);
      const p = piece('pawn', ctx.cx + Math.cos(a2) * 18, ctx.cy + Math.sin(a2) * 18, false);
      p.alive = true;
      pawns.push(p);
      movePreview(ctx, p, stop2, 300, false, null, () => {});
      ctx.at(300, () => strike(p, a2, near));
      ctx.at(1300, () => strike(p, a2, near));
      ctx.at(2300, () => strike(p, a2, near));
      ctx.at(2700, () => { p.alive = false; ctx.capture(() => fx.vanish(p.x, p.y)); });
    });
  },
};

// ── E+ Sight Lines ──

export const bisharpUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.85,
  caption: 'E+ Sight Lines — a bishop\'s slide leaves its diagonal lit for 5s; stepping on a square costs 5',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(0.6);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(PSY.gold), 11);

    const b = piece('bishop', ctx.cx + 40, ctx.cy + 90);
    board(ctx, [b]);
    const to = { x: b.x + 200, y: b.y - 200 };
    const squares: { x: number; y: number; born: number; until: number; seed: number }[] = [];
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(1));
    let now = 0;
    ctx.onFrame((_dt, elapsed) => {
      now = elapsed;
      ground.clear();
      for (const q of squares) {
        if (now < q.born || now > q.until) continue;
        const a = Phaser.Math.Clamp((now - q.born) / 160, 0, 1) * Phaser.Math.Clamp((q.until - now) / 800, 0, 1);
        sightSquare(ground, ctx.tint, q.x, q.y, 30, a, elapsed / 1000, q.seed);
      }
    });

    // A walker who crosses the lit line, square by square.
    const walker = { x: ctx.cx + 300, y: ctx.cy + 70 };
    dummyAt(ctx, walker);

    ctx.at(300, () => {
      b.alive = true;
      av.play('slam', 0);
      ctx.capture(() => fx.summonPiece(b.x, b.y, true));
      readout.setText('a bishop, picked up and slid down its diagonal…');
    });
    ctx.at(1600, () => {
      const from = { x: b.x, y: b.y };
      movePreview(ctx, b, to, 260, false, null, () => {}, () => {
        ctx.capture(() => fx.slide(from.x, from.y, to.x, to.y));
        const n = Math.max(1, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / (30 * Math.SQRT2)));
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          const born = now + i * 22;
          squares.push({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, born, until: born + 5000, seed: i * 13.7 });
        }
        readout.setText('…leaves every square it crossed lit, start to finish');
      });
    });
    ctx.at(3400, () => readout.setText('anyone stepping onto a lit square takes 5 — once per square'));
    // Walk left across the line, and bill the square underfoot.
    ctx.at(3600, () => {
      const billed = new Set<number>();
      let last = -Infinity;
      ctx.onFrame((dt) => {
        if (walker.x < ctx.cx + 60) return;
        walker.x -= 70 * (dt / 1000);
        squares.forEach((q, i) => {
          if (billed.has(i) || Math.abs(walker.x - q.x) > 21 || Math.abs(walker.y - q.y) > 21) return;
          billed.add(i);
          if (now - last < 350) return;
          last = now;
          float(ctx, walker.x, walker.y - 26, '5', hex(PSY.gold), 13);
          ctx.capture(() => fx.pieceHit(walker.x, walker.y, Math.PI));
        });
      });
    });
    ctx.at(7400, () => readout.setText('the squares fade 5 seconds after the slide'));
  },
};

// ── R+ Mount Protect ──

export const knightlyMandateUpgraded: PreviewScript = {
  duration: 8500,
  scale: 0.85,
  caption: 'R+ Mount Protect — move a knight while you stand in its aura and you ride the jump, untouchable in the air',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(0.7);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(PSY.gold), 11);

    const k = piece('knight', ctx.cx + 40, ctx.cy + 30);
    board(ctx, [k]);
    const land = { x: k.x + KNIGHT_UNIT * 2, y: k.y - KNIGHT_UNIT };
    const enemy = { x: land.x + 70, y: land.y + 10 };
    dummyAt(ctx, enemy);

    let riding = false;
    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((_dt, elapsed) => {
      air.clear();
      if (!riding) return;
      const at = ctx.casterAt();
      rideWard(air, ctx.tint, at.x, at.y, 0.9, elapsed / 1000);
    });

    ctx.at(400, () => {
      k.alive = true;
      av.play('slam', 0);
      ctx.capture(() => fx.summonPiece(k.x, k.y));
      readout.setText('stand in a knight\'s aura…');
    });
    ctx.at(2000, () => {
      k.selected = true;
      k.guide = { x: land.x, y: land.y, leap: true, hot: true, blast: 80 };
      readout.setText('…pick it up and move it, and you go with it');
    });
    ctx.at(3600, () => {
      k.selected = false;
      k.guide = null;
      riding = true;
      av.play('dash', Math.atan2(land.y - ctx.cy, land.x - ctx.cx));
      float(ctx, ctx.cx, ctx.cy - 50, '🐎 MOUNTED', hex(PSY.gold), 11);
      ctx.glideCaster({ to: { x: land.x, y: land.y + 24 }, ms: 340, ease: 'linear', onDone: () => { riding = false; } });
      movePreview(ctx, k, land, 340, true, null, () => {}, () => {
        ctx.capture(() => fx.landing(land.x, land.y, 80));
        float(ctx, enemy.x, enemy.y - 26, '35', hex(PSY.violetLit), 15);
      });
      // A shot that reaches you mid-leap does nothing.
      ctx.at(150, () => {
        const at = ctx.casterAt();
        float(ctx, at.x, at.y - 34, 'IMMUNE', hex(PSY.gold), 11);
      });
    });
    ctx.at(4400, () => readout.setText('invulnerable for the whole leap — you land just in front of the knight'));
  },
};

// ── F+ Castle ──

export const rookBatteryUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.85,
  caption: 'F+ Castle — press F again to swap places with your rook; it slams down where you stood for 20',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(0.6);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(PSY.stress), 11);

    const r = piece('rook', ctx.cx + 280, ctx.cy - 40);
    board(ctx, [r]);
    const enemy = { x: ctx.cx + 150, y: ctx.cy + 10 };
    dummyAt(ctx, enemy);

    ctx.at(400, () => {
      r.alive = true;
      av.play('slam', 0);
      ctx.capture(() => fx.summonPiece(r.x, r.y));
      readout.setText('a rook stands on the far side of the board');
    });
    ctx.at(1600, () => {
      readout.setText('they close in on you…');
      const from = { ...enemy };
      let k = 0;
      ctx.onFrame((dt) => {
        if (k >= 1) return;
        k = Math.min(1, k + dt / 900);
        enemy.x = from.x + (ctx.cx + 44 - from.x) * k;
        enemy.y = from.y + (ctx.cy + 6 - from.y) * k;
      });
    });
    ctx.at(3300, () => {
      const kx = ctx.cx;
      const ky = ctx.cy;
      const rx = r.x;
      const ry = r.y;
      ctx.moveCaster(rx, ry);
      r.x = kx;
      r.y = ky;
      ctx.capture(() => fx.castle(rx, ry, kx, ky, 70));
      av.play('slam', Math.PI);
      float(ctx, kx, ky - 44, '♜ CASTLED', hex(PSY.stress), 12);
      float(ctx, enemy.x, enemy.y - 26, '20', hex(PSY.stress), 15);
      readout.setText('F again: you and the rook swap squares — instantly, off cooldown');
    });
    ctx.at(5200, () => readout.setText('the rook comes down where you stood and slams everyone within 70px'));
    ctx.at(7200, () => readout.setText('once per rook — after that, F places a new one'));
  },
};

// ── Q+ Checkmate ──

export const queenUpgraded: PreviewScript = {
  duration: 9000,
  scale: 0.85,
  caption: 'Q+ Checkmate — when the Queen runs out, every enemy below 15% health is killed outright',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(1);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(PSY.gold), 11);
    const clock = label(ctx, ctx.cx, ctx.cy + 50, hex(PSY.gold), 12);
    const low = { x: ctx.cx + 170, y: ctx.cy - 40 };
    const healthy = { x: ctx.cx + 200, y: ctx.cy + 60 };
    dummyAt(ctx, low);
    dummyAt(ctx, healthy);

    let crowned = false;
    let lowHp = 0.12;
    let lowAlive = true;
    let ends = 0;
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(15));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      const bar = (at: { x: number; y: number }, frac: number): void => {
        g.fillStyle(0x11131b, 0.9); g.fillRect(at.x - 22, at.y - 34, 44, 6);
        g.fillStyle(frac < 0.15 ? PSY.stress : 0x6fdc8c, 1); g.fillRect(at.x - 21, at.y - 33, 42 * frac, 4);
        g.lineStyle(1, ctx.tint(PSY.gold), 0.8);
        g.lineBetween(at.x - 21 + 42 * 0.15, at.y - 36, at.x - 21 + 42 * 0.15, at.y - 26);
      };
      if (lowAlive) bar(low, lowHp);
      bar(healthy, 0.7);
      if (!crowned) { clock.setText(''); return; }
      const at = ctx.casterAt();
      queenCrown(g, ctx.tint, at.x, at.y - 50, 1.1, 0.95, elapsed / 1000);
      clock.setText(`reign ends in ${Math.max(0, (ends - elapsed) / 1000).toFixed(1)}s`);
    });

    ctx.at(400, () => {
      crowned = true;
      ends = 400 + 4500;
      av.play('raise');
      ctx.capture(() => fx.coronation(ctx.cx, ctx.cy));
      float(ctx, ctx.cx, ctx.cy - 70, '♛ QUEEN', hex(PSY.gold), 14);
      readout.setText('crowned — fight as the queen for the full 15 seconds (shortened here)');
    });
    ctx.at(2400, () => {
      lowHp = 0.1;
      readout.setText('the gold tick on each bar is the line: 15% of their health');
    });
    ctx.at(4900, () => {
      crowned = false;
      lowAlive = false;
      ctx.capture(() => fx.checkmate(low.x, low.y));
      float(ctx, low.x, low.y - 72, '♚ CHECKMATE', hex(PSY.gold), 14);
      ctx.capture(() => fx.vanish(ctx.cx, ctx.cy - 30));
      readout.setText('the reign runs out: everyone under the line is checkmated — killed outright');
    });
    ctx.at(7000, () => readout.setText('only a full reign — dying crowned, or losing the crown early, checkmates nobody'));
  },
};

// ══ PASSIVE — Opened Eyes ═════════════════════════════════════════════

export const openedEyes: PreviewScript = {
  duration: 11000,
  scale: 0.9,
  caption: 'Passive — their casts are held 2 seconds and stacked over your head; their shadow stands where they will be in 1',
  run(ctx) {
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(ctx.aim);
    monk(av)?.setFocus(0.9);
    const enemy = { x: ctx.w * 0.55, y: ctx.cy + 18 };
    dummyAt(ctx, enemy, 5);
    const readout = label(ctx, ctx.w * 0.5, 12, '#d8d8de', 11);
    const queue: { key: string; name: string; big: boolean; due: number; pressed: number }[] = [];
    let now = 0;

    const vel = { x: 96, y: -34 };
    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(2));
    ctx.onFrame((dt, elapsed) => {
      ground.clear();
      now = elapsed;
      const s = dt / 1000;
      enemy.x += vel.x * s; enemy.y += vel.y * s;
      if (enemy.x > ctx.w - 60 || enemy.x < ctx.w * 0.35) vel.x *= -1;
      if (enemy.y > ctx.h - 40 || enemy.y < 40) vel.y *= -1;
      // One second of dead reckoning, damped the way the kit damps it.
      let px = enemy.x, py = enemy.y, vx = vel.x, vy = vel.y;
      for (let i = 0; i < 10; i++) {
        px = Phaser.Math.Clamp(px + vx * 0.1, 32, ctx.w - 32);
        py = Phaser.Math.Clamp(py + vy * 0.1, 32, ctx.h - 32);
        vx *= 0.97; vy *= 0.97;
      }
      shadowOf(ground, ctx.tint, px, py, elapsed / 1000);
    });

    queueStack(ctx, () => queue.map((e) => ({
      key: e.key, name: e.name, big: e.big,
      left: Phaser.Math.Clamp((e.due - now) / (e.due - e.pressed), 0, 1),
    })));
    const press = (at: number, key: string, name: string, big = false): void => {
      ctx.at(at, () => {
        queue.push({ key, name, big, due: at + 2000, pressed: at });
        float(ctx, enemy.x, enemy.y - 34, `they press ${key}`, '#8e97ad', 10);
      });
      ctx.at(at + 2000, () => {
        queue.shift();
        float(ctx, enemy.x, enemy.y - 50, `${name} happens`, hex(PSY.violetLit), 10);
      });
    };

    ctx.at(300, () => readout.setText('the shadow is them, one second from now — nothing else to read'));
    press(2400, 'Click', 'Fireball');
    press(2900, 'R', 'Flame Wall');
    press(3500, 'Q', 'Inferno', true);
    ctx.at(3900, () => readout.setText('every press waits 2 seconds — stacked over YOUR head, next one at the bottom'));
    ctx.at(6500, () => readout.setText('the fuse on each card is how long it has left; gold is the one going off first'));
    ctx.at(8800, () => readout.setText('their cooldown starts at the press, so the delay costs them tempo, not uptime'));
  },
};

// ══ MASTERY — Outplayed ═══════════════════════════════════════════════

export const masteryOutplayed: PreviewScript = {
  duration: 12000,
  scale: 0.9,
  caption: 'Mastery passive — the further behind you they fall (in %), the longer their cooldowns run',
  run(ctx) {
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(0);
    monk(av)?.setFocus(0.6);
    const enemy = { x: ctx.w * 0.66, y: ctx.cy };
    dummyAt(ctx, enemy, 5);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(PSY.gold), 11);
    const tag = label(ctx, enemy.x, enemy.y + 46, hex(OUTPLAY.lit), 11);
    const hp = { me: 1, them: 1 };
    let tier = 0;

    const ground = ctx.adopt(ctx.scene.add.graphics().setDepth(3));
    const bars = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      ground.clear();
      bars.clear();
      outplayedAura(ground, ctx.tint, enemy.x, enemy.y, tier, 0.9, t, 2.3);
      const bar = (x: number, y: number, frac: number, col: number): void => {
        bars.fillStyle(0x0b0b0d, 0.85); bars.fillRect(x - 26, y, 52, 6);
        bars.fillStyle(col, 1); bars.fillRect(x - 25, y + 1, 50 * frac, 4);
      };
      const me = ctx.casterAt();
      bar(me.x, me.y - 36, hp.me, 0x5be37a);
      bar(enemy.x, enemy.y - 36, hp.them, 0xe35b5b);
      const gap = (hp.me - hp.them) * 100;
      tier = gap >= 75 ? 3 : gap >= 50 ? 2 : gap >= 25 ? 1 : 0;
      tag.setText(tier ? `cooldowns +${[0, 10, 25, 33][tier]}%` : '');
    });
    const drop = (at: number, to: number): void => ctx.at(at, () => {
      const from = hp.them;
      ctx.scene.tweens.addCounter({
        from: from * 100, to: to * 100, duration: 600,
        onUpdate: (tw) => { hp.them = (tw.getValue() ?? 0) / 100; },
      });
    });

    ctx.at(300, () => readout.setText('both of you on 100% — nothing to read yet'));
    drop(1400, 0.72);
    ctx.at(2200, () => {
      float(ctx, enemy.x, enemy.y - 58, '♟ OUTPLAYED +10% CD', hex(OUTPLAY.lit), 11);
      readout.setText('25 points behind you: every cooldown of theirs runs 10% longer');
    });
    drop(4400, 0.46);
    ctx.at(5200, () => {
      float(ctx, enemy.x, enemy.y - 58, '♟ OUTPLAYED +25% CD', hex(OUTPLAY.lit), 11);
      readout.setText('50 points: 25% longer, and the aura grows a second ring');
    });
    drop(7400, 0.2);
    ctx.at(8200, () => {
      float(ctx, enemy.x, enemy.y - 58, '♟ OUTPLAYED +33% CD', hex(OUTPLAY.hot), 12);
      readout.setText('75 points: 33% longer — and they can see it on themselves');
    });
    ctx.at(10200, () => readout.setText('percent, not points: a tank at 300/400 is as far behind as a duellist at 75/100'));
  },
};

// ══ MASTERY — Pre-move ════════════════════════════════════════════════

export const masteryPremove: PreviewScript = {
  duration: 13000,
  scale: 0.9,
  caption: 'Mastery — call their next key. If they press it within 1.5s: burst, stun, and a slow or a longer cooldown',
  run(ctx) {
    const fx = fxOf(ctx);
    const av = ctx.useAvatar(() => new PsychicAvatar(ctx.scene, ctx.tint));
    av.setFacing(0);
    monk(av)?.setFocus(0.8);
    const enemy = { x: ctx.w * 0.64, y: ctx.cy + 20 };
    const vel = { x: 0, y: 0 };
    dummyAt(ctx, enemy, 5);
    const readout = label(ctx, ctx.w * 0.5, 12, hex(PSY.gold), 11);
    const key = label(ctx, 0, 0, hex(PSY.gold), 10);
    const clock = { on: false, choosing: false, until: 0, text: '?' };
    let now = 0;

    const air = ctx.adopt(ctx.scene.add.graphics().setDepth(16));
    ctx.onFrame((dt, elapsed) => {
      now = elapsed;
      air.clear();
      enemy.x = Phaser.Math.Clamp(enemy.x + vel.x * dt / 1000, 60, ctx.w - 60);
      enemy.y = Phaser.Math.Clamp(enemy.y + vel.y * dt / 1000, 40, ctx.h - 40);
      const me = ctx.casterAt();
      if (clock.on) {
        const fuse = clock.choosing ? 1 : Phaser.Math.Clamp((clock.until - now) / 1500, 0, 1);
        premoveClock(air, ctx.tint, me.x - 50, me.y - 40, fuse, clock.choosing, 0.95, elapsed / 1000);
        key.setPosition(me.x - 39, me.y - 40).setText(clock.choosing ? '?' : clock.text).setVisible(true);
      } else {
        key.setVisible(false);
      }
    });
    const cast = (at: number): void => ctx.at(at, () => {
      clock.on = true; clock.choosing = true;
      av.play('raise');
      float(ctx, ctx.casterAt().x, ctx.casterAt().y - 70, '♟ PRE-MOVE', hex(OUTPLAY.lit), 12);
    });
    const choose = (at: number, k: string): void => ctx.at(at, () => {
      clock.choosing = false; clock.text = k; clock.until = at + 1500;
      const me = ctx.casterAt();
      ctx.capture(() => fx.premoveSet(me.x, me.y));
      float(ctx, me.x, me.y - 70, `♟ PREDICTED: ${k}`, hex(PSY.gold), 12);
    });
    const spring = (at: number, k: string, extra: string): void => ctx.at(at, () => {
      clock.on = false;
      ctx.capture(() => fx.premovePunish(enemy.x, enemy.y));
      float(ctx, enemy.x, enemy.y - 64, `♟ PRE-MOVED: ${k}`, hex(OUTPLAY.hot), 12);
      float(ctx, enemy.x + 26, enemy.y - 30, '25', hex(PSY.stress), 13);
      ctx.at(at + 250, () => float(ctx, enemy.x, enemy.y - 44, extra, hex(OUTPLAY.lit), 11));
    });

    ctx.at(200, () => readout.setText('Pre-move: the next key YOU press is your call'));
    cast(900);
    ctx.at(1700, () => readout.setText('they have been strafing on W and S… so press W'));
    choose(2300, 'W');
    ctx.at(2700, () => { vel.y = -110; readout.setText('they press W inside the 1.5 seconds'); });
    spring(2800, 'W', '🐌 −30% SPEED');
    ctx.at(2800, () => { vel.y = 0; });
    ctx.at(3400, () => { vel.y = -40; readout.setText('25 damage, a light stun, and 30% slower for 3 seconds'); });
    ctx.at(4800, () => { vel.y = 0; });
    cast(6400);
    ctx.at(6800, () => readout.setText('this time, call their ultimate'));
    choose(7400, 'Q');
    ctx.at(8300, () => readout.setText('an ability key: the cast they just made runs 50% longer, and so does the next for 8s'));
    spring(8400, 'Q', '⏳ INFERNO +50% CD');
    ctx.at(11000, () => readout.setText('only you see which key you called — they only see the clock running'));
  },
};
