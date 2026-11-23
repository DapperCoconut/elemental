import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { OBS, seam, shard } from '../../../../../art/PinnacleArt';
import { BONE, OCHRE, OCHRE_LIT, RUST, SANDSTONE, STRATA } from '../art';
import { type Who, WHO, alive, clamp, dist } from '../util';

/**
 * Decree of Attrition — Councilor Ebbe Mortlake, Seat of Remainders (ruin).
 *
 * Mortlake wrote what becomes of what is left over: it is buried. Here the Ledger of Attrition
 * tallies the fight in spans: an obelisk erodes over each span, and when it falls the ledger is
 * read. Whoever dealt the less damage in that span FORFEITS A STONE: a cut tithe-stone drops at
 * their feet, and they are the poorer for it — slower and frailer, for good. "Nothing comes back."
 * Except: a forfeit stone lies on the floor for a while, and its owner may strike it back off the
 * floor (three blows) — while the other party can shatter it with one and make the loss permanent.
 *
 * A perfected Ruin deletes your shots out of the air and rots you from range. Out-strike it anyway,
 * and fight over the stones.
 */

type G = Phaser.GameObjects.Graphics;

interface Stone { who: Who; x: number; y: number; born: number; blows: number; last: number; target: StrikeTarget | null; end: number; how: 'lying' | 'reclaimed' | 'shattered' | 'buried' }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, rng } = ctx;
  const SPAN = ctx.hard ? 8000 : 9000;
  const LIE_MS = 8000;
  const MAX = 5;
  const SPEED_PER = 0.93;
  const TAKEN_PER = 1.06;
  const dealt: Record<Who, number> = { player: 0, npc: 0 };
  const forfeits: Record<Who, number> = { player: 0, npc: 0 };
  const stones: Stone[] = [];
  let spanStart = 0;
  let chisel: { who: Who; t: number } | null = null;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const label = (w: Who): string => (w === 'player' ? 'YOU FORFEIT A STONE' : 'THE SEAT FORFEITS A STONE');

  const settle = (s: Stone, how: Stone['how'], time: number) => {
    s.how = how;
    s.end = time;
    s.target?.remove();
    s.target = null;
  };

  const struck = (s: Stone, by: Who) => {
    if (s.how !== 'lying') return;
    const time = ctx.scene.time.now;
    if (time - s.last < 250) return;
    s.last = time;
    if (by !== s.who) {
      settle(s, 'shattered', time);
      ctx.float(s.x, s.y - 40, 'SHATTERED', '#ffb08a');
      ctx.sfx('crystal-shatter');
      return;
    }
    s.blows++;
    ctx.sfx('stone-slam');
    if (s.blows >= 3) {
      settle(s, 'reclaimed', time);
      forfeits[s.who] = Math.max(0, forfeits[s.who] - 1);
      const f = fighter(s.who);
      ctx.float(f.x, f.y - 52, 'RECLAIMED', '#e8c27e');
      ctx.sfx('sparkle');
    }
  };

  const tally = (time: number) => {
    const p = dealt.player, n = dealt.npc;
    dealt.player = 0; dealt.npc = 0;
    spanStart = time;
    if (Math.abs(p - n) < 5) { ctx.banner('THE LEDGER IS EVEN', '#d9cfb4'); return; }
    const loser: Who = p < n ? 'player' : 'npc';
    if (forfeits[loser] >= MAX) { ctx.banner('NOTHING LEFT TO FORFEIT', '#ffb08a'); return; }
    forfeits[loser]++;
    const f = fighter(loser);
    const a = rng() * Math.PI * 2;
    const x = clamp(f.x + Math.cos(a) * 70, 50, W - 50), y = clamp(f.y + Math.sin(a) * 60, top + 40, H - 40);
    const s: Stone = { who: loser, x, y, born: time, blows: 0, last: -9999, target: null, end: 0, how: 'lying' };
    s.target = ctx.target({ x, y: y - 8, r: 20, onStruck: (by) => struck(s, by) });
    stones.push(s);
    chisel = { who: loser, t: time };
    ctx.banner(`${label(loser)} — ${Math.round(Math.min(p, n))} TO ${Math.round(Math.max(p, n))}`, '#ffb08a');
    ctx.sfx('gravity-slam');
  };

  return {
    update(time) {
      if (spanStart === 0) spanStart = time;
      if (time - spanStart >= SPAN) tally(time);
      for (let i = stones.length - 1; i >= 0; i--) {
        const s = stones[i];
        if (s.how === 'lying' && time - s.born > LIE_MS) settle(s, 'buried', time);
        if (s.how !== 'lying' && time - s.end > 900) stones.splice(i, 1);
      }
    },
    onPlayerHurt(amount) { dealt.npc += amount; },
    onNpcHurt(amount) { dealt.player += amount; },
    playerSpeedMult() { return Math.pow(SPEED_PER, forfeits.player); },
    npcSpeedMult() { return Math.pow(SPEED_PER, forfeits.npc); },
    playerTakenMult() { return Math.pow(TAKEN_PER, forfeits.player); },
    npcTakenMult() { return Math.pow(TAKEN_PER, forfeits.npc); },

    npcSeek() {
      const n = ctx.npc;
      const lying = stones.filter((s) => s.how === 'lying');
      const own = lying.find((s) => s.who === 'npc');
      const theirs = lying.find((s) => s.who === 'player');
      const pick = own ?? theirs;
      if (!pick) return null;
      const d = dist(n.x, n.y, pick.x, pick.y) || 1;
      return { x: pick.x + (n.x - pick.x) / d * 36, y: pick.y + (n.y - pick.y) / d * 36 };
    },

    drawGround(g, time) {
      for (const s of stones) stoneArt(g, s, time, LIE_MS);
    },

    drawAir(g, time) {
      // The forfeited wear it: rust cracks round them, grit falling off them.
      for (const w of WHO) {
        const f = fighter(w), n = forfeits[w];
        if (!alive(f) || n === 0) continue;
        for (let i = 0; i < n; i++) {
          const a = i * 1.26 + 0.4;
          seam(g, [
            { x: f.x + Math.cos(a) * 8, y: f.y + Math.sin(a) * 8 }, { x: f.x + Math.cos(a + 0.3) * 15, y: f.y + Math.sin(a + 0.3) * 15 },
            { x: f.x + Math.cos(a - 0.1) * 22, y: f.y + Math.sin(a - 0.1) * 22 },
          ], 1, 0.6, 0, RUST);
        }
        for (let i = 0; i < n * 2; i++) {
          const ph = ((time / 900) + i * 0.27) % 1;
          g.fillStyle(SANDSTONE, 0.6 * (1 - ph)); g.fillCircle(f.x - 14 + ((i * 11) % 28), f.y + 4 + ph * 24, 1.3);
        }
      }
      // The chisel-stroke of the tally across the loser.
      if (chisel) {
        const k = (time - chisel.t) / 700;
        if (k > 1) chisel = null;
        else {
          const f = fighter(chisel.who);
          g.lineStyle(10 * (1 - k), BONE, 0.7 * (1 - k)); g.lineBetween(f.x - 50, f.y - 60, f.x + 50, f.y + 30);
          g.lineStyle(3, lit(OCHRE, 0.4), 1 - k); g.lineBetween(f.x - 50, f.y - 60, f.x - 50 + 100 * Math.min(1, k * 3), f.y - 60 + 90 * Math.min(1, k * 3));
        }
      }
    },

    drawHud(g, time) {
      // The ledger: two tally columns either side of an eroding obelisk.
      const cx = W / 2, cy = top + 22;
      const k = clamp((time - spanStart) / SPAN, 0, 1);
      g.fillStyle(OBS.glass, 0.92); g.fillRect(cx - 150, cy - 16, 300, 32);
      g.lineStyle(1.2, OBS.edge, 0.7); g.strokeRect(cx - 150, cy - 16, 300, 32);
      const max = Math.max(60, dealt.player, dealt.npc);
      const bar = (x: number, dir: number, v: number, c: number) => {
        const w = 110 * clamp(v / max, 0, 1);
        g.fillStyle(dim(c, 0.6), 1); g.fillRect(dir > 0 ? x : x - 110, cy - 9, 110, 8);
        g.fillStyle(c, 1); g.fillRect(dir > 0 ? x : x - w, cy - 9, w, 8);
        for (let i = 0; i < Math.floor(v / 20); i++) { g.lineStyle(1, OBS.glass, 0.8); const tx = dir > 0 ? x + (i + 1) * 110 * 20 / max : x - (i + 1) * 110 * 20 / max; if (Math.abs(tx - x) < w) g.lineBetween(tx, cy - 9, tx, cy - 1); }
      };
      bar(cx - 18, -1, dealt.player, BONE);
      bar(cx + 18, 1, dealt.npc, OBS.seamLit);
      // Forfeit pips under each column.
      for (const [w, x0, dir] of [['player', cx - 26, -1], ['npc', cx + 26, 1]] as [Who, number, number][]) {
        for (let i = 0; i < MAX; i++) {
          const x = x0 + dir * i * 16;
          g.fillStyle(i < forfeits[w] ? RUST : dim(OCHRE, 0.5), 1); g.fillRect(x - 5, cy + 4, 10, 7);
          g.fillStyle(i < forfeits[w] ? dim(RUST, 0.3) : OCHRE, 1); g.fillRect(x - 5, cy + 4, 10, 2);
        }
      }
      // The obelisk, eroding from the top as the span runs out.
      const oh = 28 * (1 - k);
      g.fillStyle(OBS.facet, 1); g.fillTriangle(cx - 7, cy + 14, cx + 7, cy + 14, cx, cy + 14 - Math.max(2, oh));
      g.lineStyle(1, OBS.edge, 0.7); g.lineBetween(cx, cy + 14 - Math.max(2, oh), cx + 7, cy + 14);
      for (let i = 0; i < 4; i++) {
        const ph = ((time / 500) + i * 0.25) % 1;
        g.fillStyle(SANDSTONE, 0.7 * (1 - ph)); g.fillCircle(cx - 3 + i * 2, cy + 14 - oh + ph * oh, 1);
      }
    },

    destroy() {
      for (const s of stones) s.target?.remove();
      stones.length = 0;
    },
  };
};

/** A forfeit stone: a cut tithe-stone marked with its owner, crumbling as it lies; three notches to reclaim. */
function stoneArt(g: G, s: Stone, time: number, lie: number): void {
  const x = s.x, y = s.y;
  if (s.how !== 'lying') {
    const k = clamp((time - s.end) / 900, 0, 1);
    if (s.how === 'reclaimed') {
      // It lifts and dissolves into light toward its owner.
      g.fillStyle(OCHRE_LIT, 0.8 * (1 - k)); g.fillRect(x - 12, y - 16 - k * 40, 24, 14);
    } else {
      for (let i = 0; i < 8; i++) {
        const a = i * 0.8;
        const px = x + Math.cos(a) * k * (s.how === 'shattered' ? 50 : 14), py = y - 8 + Math.sin(a) * k * 20 + (s.how === 'buried' ? k * 10 : 0);
        g.fillStyle(STRATA[i % 6], 1 - k); g.fillRect(px - 3, py - 3, 6, 5);
      }
    }
    return;
  }
  const age = (time - s.born) / lie;
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x + 2, y + 2, 40, 12);
  g.fillStyle(dim(OCHRE, 0.45), 1); g.fillRect(x - 15, y - 20, 30, 20);
  g.fillStyle(OCHRE, 1); g.fillRect(x - 15, y - 20, 30, 7);
  g.fillStyle(dim(OCHRE, 0.25), 1); g.fillRect(x - 15, y - 13, 8, 13);
  g.lineStyle(1, OBS.edge, 0.4); g.strokeRect(x - 15, y - 20, 30, 20);
  // Its owner's mark: a pale ring for the challenger, a violet slit for the Seat.
  if (s.who === 'player') { g.lineStyle(1.6, BONE, 0.9); g.strokeCircle(x, y - 9, 4); }
  else { g.fillStyle(OBS.seam, 1); g.fillEllipse(x, y - 9, 12, 2.4); }
  // Crumbling: corners gone, grit at its foot.
  for (let i = 0; i < Math.floor(age * 6); i++) shard(g, x - 15 + ((i * 7) % 30), y + 2, 5, 4, 0, 0.2);
  for (let i = 0; i < 3; i++) {
    g.lineStyle(2, i < s.blows ? OCHRE_LIT : dim(OCHRE, 0.4), 1);
    g.lineBetween(x - 10 + i * 10, y - 26, x - 6 + i * 10, y - 30);
  }
  // The time left, as a ring running down.
  g.lineStyle(1.4, s.who === 'player' ? BONE : OBS.seamLit, 0.6);
  g.beginPath(); g.arc(x, y - 10, 24, -Math.PI / 2, -Math.PI / 2 + (1 - age) * Math.PI * 2, false); g.strokePath();
}

export const DECREE_ATTRITION: GimmickDef = {
  id: 'bench-earth-attrition',
  rules: 'Each span the ledger is read: whoever dealt less forfeits a stone, slower and frailer for good. Its owner may strike it back; the other may shatter it.',
  make,
};
