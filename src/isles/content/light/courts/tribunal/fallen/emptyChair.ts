import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { chalkLine, gavel, noonShadow, sunburst } from '../art';
import {
  BRONZE_DARK, GOLD, GOLD_DARK, GOLD_LIT, MARBLE, MARBLE_DEEP, MARBLE_LIT, MARBLE_SHADE, ROBE, ROBE_DARK, ROBE_LIT,
  SIDE_FOE, SIDE_YOU, SUN, SUN_HOT,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * The Empty Chair — Bench-Clerk Hyacinth Wardlaw.
 *
 * Wardlaw was clerk to the bench for thirty years and never once sat in the judge's chair. In the
 * star's telling she did, every afternoon the Prince was away, and passed sentence in his voice.
 *
 * The judge's high chair stands empty on a marble dais. Stand in it long enough to sit and you are
 * the bench: it holds you in your seat (you may still cast) and every beat a sentence is chalked
 * square round the *other* fighter and its great seal stamps down. But the seated are exposed —
 * they take more from every blow — and three blows throw them out of the chair. Each term the
 * chair is lifted to another dais (the next one glows first). Both of you may contest it; while
 * you both stand on the dais nobody sits.
 *
 * At half, the court sits in banc: a second chair comes down, and two benches can sentence each
 * other.
 */

const ID = fallenId('tribunal', 'empty-chair');
const SIT_R = 36;
const DAIS_R = 58;
const SIT_MS = 700;
const TERM_MS = 9500;
const MOVE_MS = 1500;
const BEAT_MS = 1750;
const WARN_MS = 900;
const SQ = 62;
const DMG_YOU = 15;
const DMG_FOE = 20;
const UNSEAT = 3;
const BARRED_MS = 2600;
const SEATED_MULT = 1.3;

type Side = 'player' | 'npc';

interface Chair {
  dais: number;
  /** -1 while not moving; else the dais it is being lifted to and when it lands. */
  next: number; landAt: number;
  arrivedAt: number;
  sitter: Side | null;
  claim: { player: number; npc: number };
  blows: number;
  beatAt: number;
}

interface Sentence { x: number; y: number; at: number; by: Side; fired: boolean; firedAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const DAISES: Pt[] = [
    { x: W * 0.2, y: top + 130 }, { x: W * 0.8, y: top + 130 }, { x: W * 0.5, y: H - 92 }, { x: W * 0.5, y: top + 120 },
  ];
  const chairs: Chair[] = [];
  const sentences: Sentence[] = [];
  const barred = { player: 0, npc: 0 };
  let banc = false;
  const fighter = (s: Side): Fighter => (s === 'player' ? player : npc);
  const other = (s: Side): Side => (s === 'player' ? 'npc' : 'player');

  function newChair(dais: number, time: number): void {
    chairs.push({ dais, next: -1, landAt: 0, arrivedAt: time, sitter: null, claim: { player: 0, npc: 0 }, blows: 0, beatAt: 0 });
  }
  newChair(2, 0);

  const seatOf = (s: Side) => chairs.find((c) => c.sitter === s) ?? null;
  const where = (c: Chair): Pt => DAISES[c.dais];

  function unseat(c: Chair, time: number, thrown: boolean): void {
    const s = c.sitter;
    if (!s) return;
    const f = fighter(s);
    c.sitter = null; c.blows = 0;
    c.claim.player = 0; c.claim.npc = 0;
    if (thrown) {
      barred[s] = time + BARRED_MS;
      const p = where(c);
      const a = Math.atan2(f.y - p.y, f.x - p.x) || Math.PI / 2;
      ctx.nudge(f, Math.cos(a) * 70, Math.sin(a) * 70);
      ctx.stun(f, 350);
      ctx.sfx('clang');
    }
  }

  function freeDais(exclude: number[]): number {
    const free = DAISES.map((_, i) => i).filter((i) => !exclude.includes(i));
    return free[Math.floor(ctx.rng() * free.length)] ?? 0;
  }

  function hurt(s: Side): void {
    const c = seatOf(s);
    if (!c) return;
    c.blows++;
    if (c.blows >= UNSEAT) { unseat(c, tk.now, true); ctx.banner('THROWN FROM THE BENCH', '#e8c860'); }
  }

  function strike(sn: Sentence): void {
    sn.fired = true; sn.firedAt = tk.now;
    ctx.sfx('stone-slam');
    const inSq = (f: Fighter) => Math.abs(f.x - sn.x) < SQ + 12 && Math.abs(f.y - sn.y) < SQ + 12;
    if (alive(player) && inSq(player)) tk.hitPlayer(DMG_YOU, player.x, player.y);
    if (alive(npc) && inSq(npc)) ctx.hit(npc, DMG_FOE, npc.x, npc.y);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!banc && npc.hp < npc.maxHp * 0.5) {
        banc = true;
        ctx.banner('THE COURT SITS IN BANC', '#e8c860');
        ctx.sfx('boss-phase');
        newChair(freeDais(chairs.map((c) => c.dais)), time);
      }
      for (const c of chairs) {
        // Lifted between daises.
        if (c.next >= 0) {
          if (time >= c.landAt) {
            c.dais = c.next; c.next = -1; c.arrivedAt = time;
            const p = where(c);
            ctx.sfx('anvil'); ctx.flash(p.x, p.y, SUN);
            for (const f of [player, npc]) {
              if (!alive(f) || dist(f.x, f.y, p.x, p.y) > DAIS_R) continue;
              if (f === player) tk.hitPlayer(10, f.x, f.y); else ctx.hit(npc, 10, f.x, f.y);
              const a = Math.atan2(f.y - p.y, f.x - p.x) || 0;
              ctx.nudge(f, Math.cos(a) * 60, Math.sin(a) * 60);
            }
          }
          continue;
        }
        const p = where(c);
        if (time - c.arrivedAt > TERM_MS) {
          unseat(c, time, false);
          c.next = freeDais(chairs.map((o) => (o.next >= 0 ? o.next : o.dais)));
          c.landAt = time + tk.warn(MOVE_MS);
          ctx.sfx('chain');
          continue;
        }
        if (c.sitter) {
          const f = fighter(c.sitter);
          if (!alive(f)) { unseat(c, time, false); continue; }
          // Held in the seat: drawn back onto the cushion and kept there.
          const d = dist(f.x, f.y, p.x, p.y);
          if (d > 6) ctx.nudge(f, (p.x - f.x) * Math.min(1, dt * 10), (p.y - f.y) * Math.min(1, dt * 10));
          ctx.root(f, 160);
          if (time >= c.beatAt) {
            c.beatAt = time + BEAT_MS;
            const t = fighter(other(c.sitter));
            if (alive(t)) {
              sentences.push({ x: tk.clampX(t.x, 70), y: tk.clampY(t.y, 60), at: time + tk.warn(WARN_MS), by: c.sitter, fired: false, firedAt: 0 });
              ctx.sfx('judgement');
            }
          }
          continue;
        }
        // Vacant: stand on the dais to sit. Two on it, and nobody sits.
        const inP = alive(player) && time >= barred.player && !seatOf('player') && dist(player.x, player.y, p.x, p.y) < SIT_R;
        const inN = alive(npc) && time >= barred.npc && !seatOf('npc') && dist(npc.x, npc.y, p.x, p.y) < SIT_R;
        const ms = dt * 1000;
        c.claim.player = inP && !inN ? c.claim.player + ms : Math.max(0, c.claim.player - ms * 2);
        c.claim.npc = inN && !inP ? c.claim.npc + ms : Math.max(0, c.claim.npc - ms * 2);
        for (const s of ['player', 'npc'] as Side[]) {
          if (c.claim[s] < SIT_MS) continue;
          c.sitter = s; c.blows = 0; c.beatAt = time + 500;
          c.claim.player = 0; c.claim.npc = 0;
          ctx.sfx('holy-chord');
          ctx.banner(s === 'player' ? 'YOU HAVE THE BENCH' : 'WARDLAW TAKES THE BENCH', s === 'player' ? '#ffd860' : '#c8a0ff');
          break;
        }
      }
      for (const sn of sentences) if (!sn.fired && time >= sn.at) strike(sn);
      for (let i = sentences.length - 1; i >= 0; i--) if (sentences[i].fired && time - sentences[i].firedAt > 600) sentences.splice(i, 1);
    },

    onPlayerHurt: () => hurt('player'),
    onNpcHurt: () => hurt('npc'),
    playerTakenMult: () => (seatOf('player') ? SEATED_MULT : 1),
    npcTakenMult: () => (seatOf('npc') ? SEATED_MULT : 1),

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const t = tk.now;
      // Out of any square chalked round him.
      for (const sn of sentences) {
        if (sn.fired || Math.abs(npc.x - sn.x) > SQ + 30 || Math.abs(npc.y - sn.y) > SQ + 30) continue;
        const ax = npc.x - sn.x, ay = npc.y - sn.y;
        return Math.abs(ax) > Math.abs(ay)
          ? { x: tk.clampX(sn.x + Math.sign(ax || 1) * (SQ + 70)), y: npc.y }
          : { x: npc.x, y: tk.clampY(sn.y + Math.sign(ay || 1) * (SQ + 70)) };
      }
      if (seatOf('npc')) return null;
      // A vacant chair he can reach first (or a dais about to receive one): take the bench.
      if (t >= barred.npc) {
        let best: Pt | null = null, bd = 1e9;
        for (const c of chairs) {
          if (c.sitter) continue;
          const p = c.next >= 0 ? DAISES[c.next] : where(c);
          const dn = dist(npc.x, npc.y, p.x, p.y), dp = dist(player.x, player.y, p.x, p.y);
          if (dn < dp + 140 && dn < bd) { bd = dn; best = p; }
        }
        if (best) return best;
      }
      // You hold the bench: come and knock you off it, circling so the squares miss.
      const yours = seatOf('player');
      if (yours) {
        const p = where(yours);
        const a = t / 900;
        return { x: tk.clampX(p.x + Math.cos(a) * 150), y: tk.clampY(p.y + Math.sin(a) * 120) };
      }
      return null;
    },

    drawGround(g, time) {
      DAISES.forEach((p, i) => {
        const chair = chairs.find((c) => c.dais === i && c.next < 0);
        const incoming = chairs.find((c) => c.next === i);
        drawDais(g, p.x, p.y, chair ? 1 : 0.55);
        if (incoming) {
          const k = clamp(1 - (incoming.landAt - time) / Math.max(1, tk.warn(MOVE_MS)), 0, 1);
          g.lineStyle(3, SUN_HOT, 0.4 + k * 0.5); g.strokeEllipse(p.x, p.y, DAIS_R * 2, DAIS_R * 1.55);
          g.fillStyle(SUN, 0.08 + k * 0.22); g.fillEllipse(p.x, p.y, DAIS_R * 2 * k, DAIS_R * 1.55 * k);
        }
        if (chair && !chair.sitter) {
          for (const s of ['player', 'npc'] as Side[]) {
            const k = clamp(chair.claim[s] / SIT_MS, 0, 1);
            if (k <= 0) continue;
            g.lineStyle(4, s === 'player' ? SIDE_YOU : SIDE_FOE, 0.9);
            g.beginPath(); g.arc(p.x, p.y, SIT_R + 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          }
        }
      });
      for (const sn of sentences) {
        const col = sn.by === 'player' ? SIDE_YOU : SIDE_FOE;
        if (!sn.fired) {
          const k = clamp(1 - (sn.at - time) / Math.max(1, tk.warn(WARN_MS)), 0, 1);
          g.fillStyle(col, 0.05 + k * 0.14); g.fillRect(sn.x - SQ, sn.y - SQ, SQ * 2, SQ * 2);
          const x0 = sn.x - SQ, y0 = sn.y - SQ, x1 = sn.x + SQ, y1 = sn.y + SQ;
          chalkLine(g, x0, y0, x1, y0, 0.5 + k * 0.5); chalkLine(g, x1, y0, x1, y1, 0.5 + k * 0.5);
          chalkLine(g, x1, y1, x0, y1, 0.5 + k * 0.5); chalkLine(g, x0, y1, x0, y0, 0.5 + k * 0.5);
          g.lineStyle(1.5, col, 0.4 + k * 0.4);
          g.lineBetween(x0 + 10, y0 + 10, x1 - 10, y1 - 10); g.lineBetween(x1 - 10, y0 + 10, x0 + 10, y1 - 10);
        } else {
          const k = clamp((time - sn.firedAt) / 600, 0, 1);
          g.fillStyle(MARBLE_DEEP, 0.4 * (1 - k)); g.fillRect(sn.x - SQ, sn.y - SQ, SQ * 2, SQ * 2);
          sunburst(g, sn.x, sn.y, SQ * 0.75, GOLD, 0.6 * (1 - k));
          for (let i = 0; i < 8; i++) {
            const a = i * 0.8 + sn.x * 0.02;
            g.lineStyle(1.5, MARBLE_SHADE, 0.7 * (1 - k));
            g.lineBetween(sn.x + Math.cos(a) * SQ * 0.5, sn.y + Math.sin(a) * SQ * 0.5, sn.x + Math.cos(a) * SQ * 1.1, sn.y + Math.sin(a) * SQ * 1.1);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const c of chairs) {
        if (c.next >= 0) {
          // Lifted on its chains, swinging toward the next dais.
          const from = DAISES[c.dais], to = DAISES[c.next];
          const k = clamp(1 - (c.landAt - time) / Math.max(1, tk.warn(MOVE_MS)), 0, 1);
          const x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k;
          const lift = Math.sin(k * Math.PI) * 170 + (1 - k) * 20;
          g.lineStyle(2, BRONZE_DARK, 0.8); g.lineBetween(x - 18, y - lift - 96, x - 30, top); g.lineBetween(x + 18, y - lift - 96, x + 30, top);
          drawChair(g, x, y - lift, null, time);
          continue;
        }
        const p = where(c);
        drawChair(g, p.x, p.y, c.sitter, time);
      }
      for (const sn of sentences) {
        if (sn.fired) continue;
        // The court's seal-block coming down out of the glare on its gavel.
        const k = clamp(1 - (sn.at - time) / Math.max(1, tk.warn(WARN_MS)), 0, 1);
        const y = sn.y - (1 - k * k) * 260 - 30;
        const a = 0.2 + (1 - k) * 0.7;
        gavel(g, sn.x - 30, y - 30, 1.8, -a, sn.by === 'player' ? dim(SIDE_YOU, 0.4) : ROBE_DARK);
      }
    },

    drawHud(g) {
      const x0 = 28, y = top + 28;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 14, y - 20, chairs.length * 70 + 8, 40, 8);
      chairs.forEach((c, i) => {
        const x = x0 + i * 70;
        const col = c.sitter === 'player' ? SIDE_YOU : c.sitter === 'npc' ? SIDE_FOE : MARBLE;
        g.fillStyle(col, 1); g.fillRect(x - 6, y - 14, 12, 18); g.fillRect(x - 9, y + 2, 18, 4);
        g.fillStyle(GOLD, 1); g.fillCircle(x, y - 15, 3);
        // Blows to throw the sitter out.
        for (let b = 0; b < UNSEAT; b++) {
          g.fillStyle(c.sitter && b < c.blows ? 0xe8642a : 0x5a5248, 1);
          g.fillCircle(x + 18 + b * 11, y, 4);
        }
      });
    },
  };
}

/** A round marble dais of three shallow steps, gilt-rimmed, with the court's sun let into the top. */
function drawDais(g: G, x: number, y: number, a: number): void {
  noonShadow(g, x, y + 10, DAIS_R * 2.2, 0.24 * a);
  g.fillStyle(MARBLE_DEEP, a); g.fillEllipse(x, y + 6, DAIS_R * 2.2, DAIS_R * 1.7);
  g.fillStyle(MARBLE_SHADE, a); g.fillEllipse(x, y + 3, DAIS_R * 2, DAIS_R * 1.55);
  g.fillStyle(MARBLE, a); g.fillEllipse(x, y, DAIS_R * 1.7, DAIS_R * 1.3);
  g.fillStyle(MARBLE_LIT, a * 0.7); g.fillEllipse(x - 10, y - 5, DAIS_R * 0.9, DAIS_R * 0.45);
  g.lineStyle(2, GOLD_DARK, a); g.strokeEllipse(x, y, DAIS_R * 1.7, DAIS_R * 1.3);
  sunburst(g, x, y, 16, GOLD, 0.35 * a);
}

/** The judge's high chair: a carved gilt frame, violet cushions, a sunburst crest — and who sits in it. */
function drawChair(g: G, x: number, y: number, sitter: Side | null, time: number): void {
  noonShadow(g, x, y + 2, 54, 0.3);
  // Back legs, seat, arms, tall back.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 22, y - 16, 5, 16); g.fillRect(x + 17, y - 16, 5, 16);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 20, y - 96, 40, 82);
  g.fillStyle(GOLD, 1); g.fillRect(x - 17, y - 93, 34, 76);
  g.fillStyle(ROBE, 1); g.fillRoundedRect(x - 13, y - 88, 26, 64, 6);
  g.fillStyle(ROBE_LIT, 0.6); g.fillRoundedRect(x - 10, y - 84, 6, 52, 3);
  // Button-tufting on the back.
  for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) { g.fillStyle(ROBE_DARK, 1); g.fillCircle(x - 5 + k * 10, y - 76 + r * 18, 1.6); }
  // The crest: the court's sun over a carved scroll.
  g.fillStyle(GOLD_DARK, 1); g.fillTriangle(x - 24, y - 96, x + 24, y - 96, x, y - 112);
  sunburst(g, x, y - 112, 13, GOLD_LIT, 1);
  // The seat and its cushion, the arms with lion-paw ends.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 25, y - 24, 50, 10);
  g.fillStyle(ROBE, 1); g.fillRoundedRect(x - 22, y - 30, 44, 10, 4);
  for (const k of [-1, 1]) {
    g.fillStyle(GOLD, 1); g.fillRect(x + k * 24 - 3, y - 46, 6, 24);
    g.fillStyle(GOLD_LIT, 1); g.fillCircle(x + k * 24, y - 46, 4.5);
    g.fillStyle(GOLD_DARK, 1); g.fillRect(x + k * 24 - 4, y - 10, 8, 10);
  }
  g.fillStyle(GOLD_LIT, 0.8); g.fillRect(x - 15, y - 92, 2, 70);
  if (sitter) {
    // Whoever sits is lit in their side's colour, held under a ring of gilt.
    const col = sitter === 'player' ? SIDE_YOU : SIDE_FOE;
    glow(g, x, y - 50, 46, col, 0.05 + Math.sin(time / 140) * 0.02, 4);
    g.lineStyle(2, lit(col, 0.3), 0.8); g.strokeEllipse(x, y - 118, 34, 10);
  } else {
    // An empty chair: a little heat-shimmer over the empty cushion.
    for (let i = 0; i < 3; i++) {
      const p = (time / 1200 + i / 3) % 1;
      g.lineStyle(1, SUN, 0.35 * (1 - p)); g.lineBetween(x - 10 + i * 10, y - 32 - p * 30, x - 6 + i * 10, y - 40 - p * 30);
    }
  }
}

export const FALLEN_EMPTY_CHAIR: GimmickDef = {
  id: ID,
  rules: 'Sit in the empty judge\'s chair and it sentences the other fighter. Seated you are held and take more; three blows throw you out. The chair moves on.',
  make,
};
