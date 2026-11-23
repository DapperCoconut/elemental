import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { OBS, councilMask, seam } from '../../../../../art/PinnacleArt';
import { dim, mixC } from '../../../../../art/IsleArt';
import { BRASS, BRASS_DARK, BRASS_LIT, STILL, STILL_SHEEN, TIDE, TIDE_DEEP, TIDE_LIT } from '../palette';
import { type Who, WHO, alive, clamp, dist, fighterOf } from './util';

/**
 * DECREE OF THE LADEN BARGE — Councilor Cassius Bitumen, Seat of the Slick (oil).
 *
 * Bitumen wrote the Lading Clause: the Reach paid the Undertow in crude, and every barge that
 * reached the maelstrom was a household's floor bought back for a season. Barges cross the fighting
 * floor down sunken canals. A barge is armour-plate: it stops every shot (yours and his alike) and
 * rams anyone in its way aside. Let one cross and it is PAID IN FULL — Bitumen is mended and
 * underwritten, taking far less for a while. His own shots only ring off it; yours dent it.
 *
 * Sink it and the crude goes up, on whoever is near. Bitumen is perfected oil — drones, shields,
 * a fleet — and he shelters behind each barge as it comes. Sink it while he is behind it.
 */

const LEN = 176;
const BEAM = 74;
const PAD = 22;

interface Barge {
  x: number; y: number; dir: 1 | -1; hp: number; maxHp: number;
  target: StrikeTarget; dents: { dx: number; dy: number }[]; hitFx: number;
}

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, rng } = ctx;
  const SPEED = ctx.hard ? 96 : 82;
  const HP = ctx.hard ? 95 : 75;
  const BLAST_R = 165;
  const BLAST = ctx.hard ? 30 : 26;
  const HORN_MS = 1600;
  const LANES = [top + 118, (top + H) / 2 + 8, H - 100];

  let barge: Barge | null = null;
  let lane = 1;
  let dir: 1 | -1 = 1;
  let nextAt = 0;
  let hornAt = -1;
  let underwrittenUntil = 0;
  const ramCd: Record<Who, number> = { player: 0, npc: 0 };
  const wrecks: { x: number; y: number; at: number }[] = [];
  let paidFx = -9999;
  const now = () => ctx.scene.time.now;

  const launch = (time: number) => {
    const x = dir > 0 ? -LEN / 2 - 10 : W + LEN / 2 + 10;
    const b: Barge = {
      x, y: LANES[lane], dir, hp: HP, maxHp: HP, dents: [], hitFx: 0,
      target: ctx.target({
        x, y: LANES[lane], r: BEAM * 0.62,
        onStruck: (by, amount) => {
          if (!barge) return;
          if (by === 'npc') { barge.hitFx = now(); return; }
          barge.hp -= Math.max(1, amount);
          barge.hitFx = now();
          if (barge.dents.length < 9 && rng() < 0.35) barge.dents.push({ dx: (rng() - 0.5) * LEN * 0.7, dy: (rng() - 0.5) * BEAM * 0.5 });
          ctx.sfx('clang');
        },
      }),
    };
    barge = b;
    hornAt = -1;
    void time;
  };

  const sink = (time: number) => {
    if (!barge) return;
    const b = barge;
    ctx.tk.boom(b.x, b.y, BLAST_R, 0x1a1410);
    ctx.flash(b.x, b.y, TIDE_LIT);
    ctx.sfx('explosion-large');
    for (const w of WHO) {
      const f = fighterOf(ctx, w);
      if (alive(f) && dist(f.x, f.y, b.x, b.y) < BLAST_R) ctx.hit(f, BLAST, f.x, f.y);
    }
    ctx.banner('BARGE SUNK — THE LADING IS LOST', '#9ad8ff');
    wrecks.push({ x: b.x, y: b.y, at: time });
    b.target.remove();
    barge = null;
    nextAt = time + 4200;
  };

  const paid = (time: number) => {
    if (!barge) return;
    barge.target.remove();
    barge = null;
    const n = ctx.npc;
    if (alive(n)) ctx.heal(n, Math.round(n.maxHp * (ctx.hard ? 0.12 : 0.09)));
    underwrittenUntil = time + 6000;
    paidFx = time;
    ctx.banner('PAID IN FULL — HE IS UNDERWRITTEN', '#c9b0ff');
    ctx.sfx('money');
    nextAt = time + 2600;
  };

  return {
    update(time, dtRaw) {
      const dt = clamp(dtRaw, 0, 0.05);
      if (nextAt === 0) nextAt = time + 2400;
      if (!barge && hornAt < 0 && time >= nextAt - HORN_MS) {
        hornAt = time;
        lane = Math.floor(rng() * 3);
        dir = rng() < 0.5 ? 1 : -1;
        ctx.sfx('train-horn');
      }
      if (!barge && time >= nextAt) launch(time);
      if (barge) {
        const b = barge;
        b.x += b.dir * SPEED * dt;
        b.target.moveTo(b.x, b.y);
        // Ram whoever is in its way: out to the nearer side of the canal.
        for (const w of WHO) {
          const f = fighterOf(ctx, w);
          if (!alive(f)) continue;
          const inX = Math.abs(f.x - b.x) < LEN / 2 + PAD, inY = Math.abs(f.y - b.y) < BEAM / 2 + PAD;
          if (!inX || !inY) continue;
          const side = f.y < b.y ? -1 : 1;
          const want = b.y + side * (BEAM / 2 + PAD + 2);
          ctx.nudge(f, b.dir * 10, want - f.y);
          if (time >= ramCd[w]) {
            ramCd[w] = time + 900;
            ctx.hit(f, 8, f.x, f.y);
            ctx.sfx('hit-medium');
          }
        }
        if (b.hp <= 0) sink(time);
        else if ((b.dir > 0 && b.x > W + LEN / 2 + 10) || (b.dir < 0 && b.x < -LEN / 2 - 10)) paid(time);
      }
      for (let i = wrecks.length - 1; i >= 0; i--) if (time - wrecks[i].at > 7000) wrecks.splice(i, 1);
    },
    npcTakenMult() { return now() < underwrittenUntil ? 0.65 : 1; },
    npcSeek() {
      if (!barge || now() < underwrittenUntil) return null;
      const b = barge, p = ctx.player;
      // Hide on the far side of the barge from you, keeping pace with it.
      const side = p.y < b.y ? 1 : -1;
      const lead = b.dir * 30;
      return { x: clamp(b.x + lead + clamp(b.x - p.x, -60, 60), 60, W - 60), y: clamp(b.y + side * (BEAM / 2 + 56), top + 50, H - 50) };
    },
    destroy() { barge?.target.remove(); barge = null; },
    drawGround(g, time) {
      const t = time / 1000;
      // The three canals: black water in the glass, the live one lit.
      LANES.forEach((ly, i) => {
        const live = (barge && i === lane) || (hornAt >= 0 && !barge && i === lane);
        g.fillStyle(STILL, 0.85); g.fillRect(0, ly - BEAM / 2 - 8, W, BEAM + 16);
        g.fillStyle(mixC(STILL, TIDE_DEEP, 0.35), 0.6); g.fillRect(0, ly - BEAM / 2 - 2, W, BEAM + 4);
        for (let k = 0; k < 6; k++) { g.fillStyle(STILL_SHEEN, 0.5); g.fillRect(((k * 173 + t * 22 * (k % 2 ? 1 : -1)) % (W + 120)) - 60, ly - 20 + k * 7, 60, 1.5); }
        g.lineStyle(1.4, OBS.edge, 0.45); g.lineBetween(0, ly - BEAM / 2 - 8, W, ly - BEAM / 2 - 8); g.lineBetween(0, ly + BEAM / 2 + 8, W, ly + BEAM / 2 + 8);
        if (live) {
          const hk = barge ? 1 : clamp((time - hornAt) / HORN_MS, 0, 1);
          seam(g, [{ x: 0, y: ly - BEAM / 2 - 8 }, { x: W, y: ly - BEAM / 2 - 8 }], 1.2, 0.5 + hk * 0.4, hk, TIDE);
          seam(g, [{ x: 0, y: ly + BEAM / 2 + 8 }, { x: W, y: ly + BEAM / 2 + 8 }], 1.2, 0.5 + hk * 0.4, hk, TIDE);
          if (!barge) {
            // Chevrons running the way it will come.
            for (let k = 0; k < 8; k++) {
              const ph = ((time / 500) + k / 8) % 1;
              const cx = dir > 0 ? ph * W : W - ph * W;
              g.lineStyle(3, TIDE_LIT, 0.5 * Math.sin(ph * Math.PI));
              g.lineBetween(cx - dir * 14, ly - 14, cx, ly); g.lineBetween(cx - dir * 14, ly + 14, cx, ly);
            }
          }
        }
      });
      // Burnt-out wrecks: a slick and floating debris, fading.
      for (const w of wrecks) {
        const k = 1 - (time - w.at) / 7000;
        g.fillStyle(0x0a0806, 0.6 * k); g.fillEllipse(w.x, w.y, 220, 70);
        for (let i = 0; i < 6; i++) { g.fillStyle(mixC(TIDE, 0xb08aff, i / 6), 0.18 * k); g.fillEllipse(w.x - 70 + i * 28, w.y + Math.sin(i) * 12, 40, 10); }
        for (let i = 0; i < 5; i++) { g.fillStyle(OBS.facet, k); g.fillRect(w.x - 60 + i * 30 + Math.sin(time / 800 + i) * 4, w.y - 10 + (i % 2) * 18, 14, 5); }
      }
    },
    drawAir(g, time) {
      if (barge) drawBarge(g, barge, time);
      const n = ctx.npc;
      if (alive(n) && now() < underwrittenUntil) {
        // Underwritten: a ring of lading-seals turning round him.
        for (let i = 0; i < 6; i++) {
          const a = time / 600 + (i / 6) * Math.PI * 2;
          councilMask(g, n.x + Math.cos(a) * 36, n.y - 4 + Math.sin(a) * 18, 6, { alpha: 0.8 });
        }
        g.lineStyle(2, OBS.seamLit, 0.5); g.strokeEllipse(n.x, n.y + 6, 80, 32);
      }
      if (time - paidFx < 900) { const k = (time - paidFx) / 900; g.lineStyle(4 * (1 - k), OBS.seamLit, 1 - k); g.strokeCircle(n.x, n.y, 30 + k * 90); }
    },
  };

  /** A squat tar-black lading barge: hull, riveted tank with the Undertow's seal, a funnel smoking. */
  function drawBarge(g: Phaser.GameObjects.Graphics, b: Barge, time: number): void {
    const t = time / 1000;
    const x = b.x, y = b.y, d = b.dir;
    const bob = Math.sin(t * 2) * 1.5;
    const hurt = time - b.hitFx < 120;
    const P = (dx: number, dy: number) => new Phaser.Geom.Point(x + dx * d, y + dy + bob);
    // Wake.
    for (let i = 0; i < 5; i++) {
      const k = ((t * 1.4) + i / 5) % 1;
      g.lineStyle(2, TIDE_LIT, 0.4 * (1 - k)); g.lineBetween(x - d * (LEN / 2 + k * 60), y - BEAM / 2 - k * 12, x - d * (LEN / 2 + 8 + k * 60), y - BEAM / 2 - 4 - k * 14);
      g.lineBetween(x - d * (LEN / 2 + k * 60), y + BEAM / 2 + k * 12, x - d * (LEN / 2 + 8 + k * 60), y + BEAM / 2 + 4 + k * 14);
    }
    g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + BEAM / 2 + 8, LEN * 1.05, 18);
    // Hull: a blunt bow, tarred plating, brass rivet lines.
    g.fillStyle(0x0c0a0a, 1);
    g.fillPoints([P(-LEN / 2, -BEAM / 2), P(LEN / 2 - 24, -BEAM / 2), P(LEN / 2, -BEAM / 4), P(LEN / 2, BEAM / 4), P(LEN / 2 - 24, BEAM / 2), P(-LEN / 2, BEAM / 2)], true);
    g.fillStyle(hurt ? 0x3a2e40 : 0x1c1816, 1);
    g.fillPoints([P(-LEN / 2 + 4, -BEAM / 2 + 4), P(LEN / 2 - 26, -BEAM / 2 + 4), P(LEN / 2 - 5, -BEAM / 4 + 2), P(LEN / 2 - 5, BEAM / 4 - 2), P(LEN / 2 - 26, BEAM / 2 - 4), P(-LEN / 2 + 4, BEAM / 2 - 4)], true);
    g.lineStyle(1.2, OBS.edge, 0.5); g.strokePoints([P(-LEN / 2, -BEAM / 2), P(LEN / 2 - 24, -BEAM / 2), P(LEN / 2, -BEAM / 4), P(LEN / 2, BEAM / 4), P(LEN / 2 - 24, BEAM / 2), P(-LEN / 2, BEAM / 2)], true);
    for (let i = 0; i < 12; i++) {
      const rx = -LEN / 2 + 10 + i * 13;
      g.fillStyle(BRASS, 0.9); g.fillCircle(x + rx * d, y - BEAM / 2 + 6 + bob, 1.3); g.fillCircle(x + rx * d, y + BEAM / 2 - 6 + bob, 1.3);
    }
    // The tank: a long riveted drum of crude.
    const tx0 = -LEN / 2 + 18, tx1 = LEN / 2 - 44;
    const tl = Math.min(x + tx0 * d, x + tx1 * d), tw = Math.abs((tx1 - tx0));
    g.fillStyle(0x221c18, 1); g.fillRoundedRect(tl, y - BEAM / 2 + 10 + bob, tw, BEAM - 20, 14);
    g.fillStyle(0x3a302a, 1); g.fillRoundedRect(tl, y - BEAM / 2 + 10 + bob, tw, (BEAM - 20) * 0.38, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(0xffffff, 0.08); g.fillRect(tl + 8, y - BEAM / 2 + 14 + bob, tw - 16, 3);
    for (let i = 1; i < 5; i++) { g.lineStyle(2.5, BRASS_DARK, 1); g.lineBetween(tl + (tw * i) / 5, y - BEAM / 2 + 10 + bob, tl + (tw * i) / 5, y + BEAM / 2 - 10 + bob); g.lineStyle(1, BRASS_LIT, 0.6); g.lineBetween(tl + (tw * i) / 5 - 1, y - BEAM / 2 + 10 + bob, tl + (tw * i) / 5 - 1, y + BEAM / 2 - 10 + bob); }
    // The Undertow's lading-seal stamped on the tank: a council mask in a ring.
    const sx = x + ((tx0 + tx1) / 2) * d, sy = y + bob;
    g.lineStyle(2, OBS.seam, 0.9); g.strokeCircle(sx, sy, 15);
    councilMask(g, sx, sy, 10, { alpha: 0.95 });
    // Dents, and crude leaking from them.
    for (const dn of b.dents) {
      g.fillStyle(0x0a0808, 1); g.fillCircle(x + dn.dx * d, y + dn.dy + bob, 4);
      g.lineStyle(1, OBS.edge, 0.5); g.strokeCircle(x + dn.dx * d, y + dn.dy + bob, 4);
      const k = (t * 1.5 + dn.dx) % 1;
      g.fillStyle(0x0a0806, 0.9); g.fillCircle(x + dn.dx * d, y + dn.dy + bob + 4 + k * 12, 2);
      g.fillStyle(mixC(TIDE, 0xb08aff, k), 0.4); g.fillCircle(x + dn.dx * d - 1, y + dn.dy + bob + 3 + k * 12, 0.8);
    }
    // The wheelhouse aft, a lamp on it, the funnel.
    const wx = x + (-LEN / 2 + 8) * d;
    g.fillStyle(0x161210, 1); g.fillRect(Math.min(wx, wx + 22 * d), y - 16 + bob, 22, 32);
    g.fillStyle(TIDE_LIT, 0.7); g.fillRect(Math.min(wx, wx + 22 * d) + 4, y - 10 + bob, 14, 6);
    const fx = x + (LEN / 2 - 40) * d;
    g.fillStyle(0x0c0a0a, 1); g.fillCircle(fx, y + bob, 11);
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(fx, y + bob, 8);
    g.fillStyle(0x000000, 1); g.fillCircle(fx, y + bob, 5);
    for (let i = 0; i < 6; i++) {
      const k = ((t * 0.8) + i / 6) % 1;
      g.fillStyle(dim(0x3a3640, 0.2), 0.5 * (1 - k)); g.fillCircle(fx - d * k * 50, y - k * 40 + bob, 6 + k * 14);
    }
    // Its plating gauge: how much more it can take.
    const hk = clamp(b.hp / b.maxHp, 0, 1);
    g.fillStyle(OBS.glass, 0.9); g.fillRect(x - 40, y - BEAM / 2 - 18 + bob, 80, 7);
    g.fillStyle(hk < 0.3 ? TIDE_LIT : TIDE, 1); g.fillRect(x - 39, y - BEAM / 2 - 17 + bob, 78 * hk, 5);
    g.lineStyle(1, OBS.edge, 0.6); g.strokeRect(x - 40, y - BEAM / 2 - 18 + bob, 80, 7);
    if (hk < 0.35) {
      // Close to going up: violet light in the seams of the tank.
      seam(g, [{ x: tl + 10, y: y + bob + 4 }, { x: tl + tw * 0.4, y: y + bob - 6 }, { x: tl + tw - 10, y: y + bob + 6 }], 1.2, 0.9, Math.abs(Math.sin(t * 10)), OBS.seam);
    }
  }
};

export const LADEN_BARGE: GimmickDef = {
  id: 'bench-water-laden-barge',
  rules: 'Barges cross the canals as moving walls. One that crosses pays him in full: mended, and hard to hurt. Sink it and it bursts on whoever is near.',
  make,
};
