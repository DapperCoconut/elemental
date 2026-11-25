import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { GLOW, GLOW_DEEP, GLOW_SOFT, ICE, ROCK, ROCK_DARK, ROCK_DEEP, ROCK_LIT, ROCK_PALE, SILVER_LIT } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../../../../life/courts/bloom/util';

/**
 * The Updraught — Osgar Fleet, Chasm-Keeper, who in the King's telling kept the deep crack that
 * splits the Echo Caves and fed it whatever the Tuners wanted gone: letters, hymn-sheets sung
 * wrong, a muted man's fiddle. The crack breathes cold air up from the sea far below, and it
 * gives nothing back where you expect.
 *
 * A fissure splits the floor. Its updraught catches every shot that crosses it — both sides' —
 * and throws it up into the dark, to come down as a falling burst a fixed stride past the crack,
 * on the far side from whoever loosed it, hurting anyone it lands on. Its shadow ring shows where.
 * Climbing over the lip is slow going.
 *
 * So shots never fly straight across: they are lobbed, and a lob lands one stride past the crack.
 * Stand so he is that stride beyond it and your shots drop on his head — he is doing the same to
 * you. At half health the floor splits again, crosswise.
 */

const ID = fallenId('cavern', 'draught');
const CATCH_R = 20;
const LOB = 175;
const LOB_MS = 900;
const BURST_R = 50;
const LIP = 20;

/** A fissure: its line, and how far it has opened (0..1). */
interface Crack { pts: Pt[]; open: number }
/** A shot the draught threw up. */
interface Lob { from: Pt; to: Pt; at: number; damage: number; owner: 'player' | 'npc' }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const jag = (a: Pt, b: Pt, n: number, amp: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
    const k = i / n, nx = -(b.y - a.y), ny = b.x - a.x, l = Math.hypot(nx, ny) || 1;
    const j = i === 0 || i === n ? 0 : (rng() - 0.5) * amp;
    return { x: a.x + (b.x - a.x) * k + (nx / l) * j, y: a.y + (b.y - a.y) * k + (ny / l) * j };
  });
  const cracks: Crack[] = [{ pts: jag({ x: W * 0.5 + (rng() - 0.5) * 60, y: top - 4 }, { x: W * 0.5 + (rng() - 0.5) * 60, y: H + 4 }, 9, 60), open: 1 }];
  const lobs: Lob[] = [];
  const bursts: { x: number; y: number; at: number }[] = [];
  let started = false;
  let split = false;

  /** Nearest point on a crack to (x, y), with its segment's unit normal. */
  const nearest = (c: Crack, x: number, y: number): { p: Pt; nx: number; ny: number; d: number } => {
    let best = { p: c.pts[0], nx: 1, ny: 0, d: Infinity };
    for (let i = 0; i < c.pts.length - 1; i++) {
      const a = c.pts[i], b = c.pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
      const k = clamp(((x - a.x) * dx + (y - a.y) * dy) / l2, 0, 1);
      const p = { x: a.x + dx * k, y: a.y + dy * k }, d = dist(p.x, p.y, x, y);
      if (d < best.d) { const l = Math.sqrt(l2); best = { p, nx: -dy / l, ny: dx / l, d }; }
    }
    return best;
  };
  const onLip = (f: Fighter) => cracks.some((c) => c.open >= 1 && nearest(c, f.x, f.y).d < LIP);

  function catchShots(time: number): void {
    for (const c of cracks) {
      if (c.open < 1) continue;
      for (let i = 0; i < c.pts.length - 1; i++) {
        const a = c.pts[i], b = c.pts[i + 1], n = Math.ceil(dist(a.x, a.y, b.x, b.y) / 26);
        for (let s = 0; s <= n; s++) {
          const px = a.x + (b.x - a.x) * (s / n), py = a.y + (b.y - a.y) * (s / n);
          for (const h of ctx.shotsNear(px, py, CATCH_R)) {
            if (segDist(h.x, h.y, a.x, a.y, b.x, b.y) > CATCH_R) continue;
            h.block();
            const owner = h.owner === 'player' ? player : npc;
            const from = { x: h.x, y: h.y };
            let ux = h.x - owner.x, uy = h.y - owner.y;
            const l = Math.hypot(ux, uy);
            if (l < 8) { const nn = nearest(c, h.x, h.y); ux = nn.nx; uy = nn.ny; } else { ux /= l; uy /= l; }
            const to = { x: clamp(h.x + ux * LOB, 40, W - 40), y: clamp(h.y + uy * LOB, top + 30, H - 30) };
            if (lobs.length < 18) lobs.push({ from, to, at: time, damage: Math.max(6, Math.round(h.damage * 1.35)), owner: h.owner });
            ctx.sfx('gust');
          }
        }
      }
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; ctx.banner('THE CRACK THROWS EVERY SHOT UP — IT FALLS ONE STRIDE PAST, ON WHOEVER STANDS THERE', '#cfefff'); }
      if (!split && npc.hp < npc.maxHp * 0.5) {
        split = true;
        const y = top + (H - top) * (0.4 + rng() * 0.2);
        cracks.push({ pts: jag({ x: -4, y }, { x: W + 4, y: y + (rng() - 0.5) * 60 }, 11, 50), open: 0 });
        ctx.banner('THE FLOOR SPLITS AGAIN, CROSSWISE', '#cfefff');
        ctx.sfx('quake');
      }
      for (const c of cracks) c.open = Math.min(1, c.open + dt / 2.2);
      catchShots(time);
      for (let i = lobs.length - 1; i >= 0; i--) {
        const l = lobs[i];
        if (time - l.at < LOB_MS) continue;
        lobs.splice(i, 1);
        ctx.sfx('rock-throw');
        bursts.push({ x: l.to.x, y: l.to.y, at: time });
        for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, l.to.x, l.to.y) < BURST_R + 14) ctx.hit(f, l.damage, l.to.x, l.to.y);
      }
      while (bursts.length && time - bursts[0].at > 700) bursts.shift();
    },

    playerSpeedMult() { return onLip(player) ? 0.68 : 1; },
    npcSpeedMult() { return onLip(npc) ? 0.68 : 1; },

    npcSeek() {
      // Out from under anything about to land on it.
      for (const l of lobs) {
        if (dist(l.to.x, l.to.y, npc.x, npc.y) > BURST_R + 40) continue;
        const a = Math.atan2(npc.y - l.to.y, npc.x - l.to.x);
        return { x: clamp(l.to.x + Math.cos(a) * 130, 50, W - 50), y: clamp(l.to.y + Math.sin(a) * 130, top + 40, H - 40) };
      }
      // Stand across the crack from the player, so the player is a stride past it from the bot.
      const live = cracks.filter((c) => c.open >= 1);
      const near = live.map((c) => nearest(c, player.x, player.y)).reduce((a, b) => (a.d < b.d ? a : b));
      const side = Math.sign((player.x - near.p.x) * near.nx + (player.y - near.p.y) * near.ny) || 1;
      return { x: clamp(near.p.x - near.nx * side * 140, 50, W - 50), y: clamp(near.p.y - near.ny * side * 140, top + 40, H - 40) };
    },

    drawGround(g, time) {
      const t = time / 1000;
      for (const c of cracks) drawFissure(g, c, t);
      // Where each lob will land: a shadow swelling and a ring closing on the spot.
      for (const l of lobs) {
        const k = clamp((time - l.at) / LOB_MS, 0, 1);
        g.fillStyle(ROCK_DEEP, 0.15 + k * 0.4); g.fillEllipse(l.to.x, l.to.y, BURST_R * (0.6 + k * 1.4), BURST_R * (0.35 + k * 0.7));
        g.lineStyle(2, l.owner === 'player' ? GLOW_SOFT : 0xffa040, 0.5 + k * 0.5); g.strokeCircle(l.to.x, l.to.y, BURST_R);
        g.lineStyle(1.5, SILVER_LIT, 0.7); g.beginPath(); g.arc(l.to.x, l.to.y, BURST_R + 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      for (const b of bursts) {
        const k = (time - b.at) / 700;
        g.lineStyle(3, ROCK_PALE, 0.7 * (1 - k)); g.strokeEllipse(b.x, b.y, BURST_R * 2 * (0.6 + k * 0.6), BURST_R * 1.2 * (0.6 + k * 0.6));
        for (let i = 0; i < 10; i++) {
          const a = i * 0.63, d = 10 + k * 46;
          g.fillStyle(i % 2 ? ROCK_LIT : ICE, 1 - k); g.fillRect(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d * 0.6, 3, 3);
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // The draught: cold streamers and grit rising out of the crack.
      for (const c of cracks) {
        if (c.open <= 0) continue;
        for (let i = 0; i < c.pts.length - 1; i++) {
          const a = c.pts[i], b = c.pts[i + 1];
          for (let s = 0; s < 3; s++) {
            const k = (s + 0.5) / 3, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
            const ph = (t * 0.8 + i * 0.37 + s * 0.29) % 1;
            g.lineStyle(1.5, GLOW_SOFT, 0.35 * (1 - ph) * c.open);
            g.beginPath(); g.moveTo(x, y);
            for (let j = 1; j <= 5; j++) g.lineTo(x + Math.sin(t * 3 + j + i) * 5, y - ph * 40 - j * 12);
            g.strokePath();
            g.fillStyle(ROCK_PALE, 0.6 * (1 - ph)); g.fillCircle(x + Math.sin(i + s) * 6, y - ph * 90, 1.4);
          }
        }
      }
      // Lobbed shots riding up into the dark and coming down.
      for (const l of lobs) {
        const k = clamp((time - l.at) / LOB_MS, 0, 1);
        const x = l.from.x + (l.to.x - l.from.x) * k, y = l.from.y + (l.to.y - l.from.y) * k - Math.sin(Math.PI * k) * 150;
        const col = l.owner === 'player' ? GLOW : 0xffa040;
        glow(g, x, y, 12, col, 0.08, 3);
        g.fillStyle(lit(col, 0.4), 1); g.fillCircle(x, y, 5);
        g.lineStyle(2, col, 0.5); g.lineBetween(x, y, x - (l.to.x - l.from.x) * 0.06, y + Math.cos(Math.PI * k) * 14);
      }
    },
  };
}

/** A fissure in the floor: lit and shadowed lips rimed with cold, and the sea glinting far below. */
function drawFissure(g: G, c: Crack, t: number): void {
  const n = c.pts.length - 1;
  const upto = c.open * n;
  const pts = c.pts.slice(0, Math.floor(upto) + 1);
  if (pts.length < 2) return;
  g.lineStyle(LIP * 2 + 8, ROCK_DARK, 0.5); g.strokePoints(pts, false);
  g.lineStyle(LIP * 2, ROCK, 0.9); g.strokePoints(pts, false);
  g.lineStyle(LIP + 6, ROCK_DEEP, 1); g.strokePoints(pts, false);
  g.lineStyle(10, 0x05070a, 1); g.strokePoints(pts, false);
  // The lips: a lit edge on one side, a hard shadow on the other.
  g.lineStyle(2, ROCK_LIT, 0.9); g.strokePoints(pts.map((p) => ({ x: p.x - LIP * 0.6, y: p.y - 3 })), false);
  g.lineStyle(2, ROCK_DEEP, 1); g.strokePoints(pts.map((p) => ({ x: p.x + LIP * 0.6, y: p.y + 3 })), false);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    for (let s = 0; s < 4; s++) {
      const k = (s + 0.5) / 4, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
      // Rime where the cold air licks the lip.
      g.fillStyle(ICE, 0.55); g.fillCircle(x - LIP * 0.7 + ((i + s) % 3), y + ((i * s) % 4) - 2, 1.6);
      g.fillStyle(ICE, 0.35); g.fillCircle(x + LIP * 0.7 - ((i + s) % 2), y + 1, 1.3);
      // The sea a long way down, catching glowworm light.
      g.fillStyle(GLOW_DEEP, 0.25 + 0.2 * Math.sin(t * 1.7 + i * 1.3 + s)); g.fillEllipse(x, y, 5, 2);
    }
  }
  // A crack still opening: its tip spitting grit.
  if (c.open < 1) {
    const tip = pts[pts.length - 1];
    g.fillStyle(ROCK_PALE, 0.8); for (let i = 0; i < 5; i++) g.fillCircle(tip.x + Math.sin(t * 20 + i) * 10, tip.y + Math.cos(t * 17 + i) * 8, 2);
  }
}

export const FALLEN_DRAUGHT: GimmickDef = {
  id: ID,
  rules: 'The crack throws every shot up; it falls one stride past, on whoever stands there. Stand so he is that stride beyond it. Later, a second crack.',
  make,
};
