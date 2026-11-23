import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow } from '../../../../../art/IsleArt';
import { tarotCard, type Arcanum } from '../art';
import { GILT, GILT_LIT, STONE, STONE_DARK, TAROT_NIGHT, TAROT_VIOLET, TAROT_VIOLET_LIT } from '../palette';
import { alive, clamp, dist, ease, shuffled, stepDt } from '../util';

/**
 * Tarot — Seer Arcana.
 *
 * Three great tarot cards are dealt onto the floor. Step on one to turn it, and it reads for you:
 * **the Tower** brings rubble down on your foe (three stones, their shadows first); **the Hanged
 * Man** holds you up by the ankle for a beat; **the Star** pours you a healing. Once all three are
 * turned — or after a while — the Seer gathers them and deals again.
 *
 * Every deal she shows the three face up for a moment, turns them down, and shuffles them about
 * the floor in three slow swaps. Watch the Star. The Seer always knows where it went — but she
 * reads it a beat after you can, so a sharp eye gets there first.
 */

const ARCANA: Arcanum[] = [0, 1, 2];
const NAMES = ['THE TOWER', 'THE HANGED MAN', 'THE STAR'];
const SHOW_MS = 1500;
const FLIP_MS = 320;
const SWAP_MS = 520;
const SWAPS = 3;
const TOUCH_R = 34;
const CARD_W = 34;

type Stage = 'show' | 'flip' | 'shuffle' | 'live' | 'gather';

interface Slot {
  arc: Arcanum;
  /** Where it lies (and, mid-swap, where it slides from / to). */
  x: number; y: number; fx: number; fy: number; tx: number; ty: number;
  turned: boolean; turnedAt: number; by: Fighter | null;
}

interface Rubble { x: number; y: number; at: number; fallAt: number; victim: Fighter; done: boolean; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const midY = (top + H) / 2 + 10;
  const SPOTS: Pt[] = [
    { x: W * 0.22, y: midY - 110 }, { x: W * 0.5, y: midY - 140 }, { x: W * 0.78, y: midY - 110 },
    { x: W * 0.28, y: midY + 120 }, { x: W * 0.5, y: midY + 150 }, { x: W * 0.72, y: midY + 120 },
  ];
  const LIVE_MS = ctx.hard ? 11000 : 13000;
  const slots: Slot[] = [];
  const rubble: Rubble[] = [];
  /** Who is hung, and from when (for the rope). */
  const hung = new Map<Fighter, number>();
  const starred = new Map<Fighter, number>();
  let stage: Stage = 'gather';
  let stageAt = 0;
  let swapN = 0;
  let swapPair: [number, number] = [0, 1];
  let started = false;

  function deal(time: number): void {
    const spots = shuffled(SPOTS, rng);
    // One card on each side of the room, one in the middle band: never all three in a clump.
    const picks = [spots.find((p) => p.x < W * 0.4), spots.find((p) => p.x > W * 0.6), spots.find((p) => p.x >= W * 0.4 && p.x <= W * 0.6)];
    slots.length = 0;
    shuffled(ARCANA, rng).forEach((arc, i) => {
      const p = picks[i] ?? SPOTS[i];
      slots.push({ arc, x: p.x, y: p.y, fx: p.x, fy: p.y, tx: p.x, ty: p.y, turned: false, turnedAt: 0, by: null });
    });
    stage = 'show';
    stageAt = time;
    swapN = 0;
    ctx.banner('THE SEER SHOWS HER HAND — WATCH THE STAR', '#c8b0ff');
    ctx.sfx('sparkle');
  }

  function beginSwap(time: number): void {
    const a = Math.floor(rng() * 3);
    const b = (a + 1 + Math.floor(rng() * 2)) % 3;
    swapPair = [a, b];
    const A = slots[a], B = slots[b];
    A.fx = A.x; A.fy = A.y; A.tx = B.x; A.ty = B.y;
    B.fx = B.x; B.fy = B.y; B.tx = A.fx; B.ty = A.fy;
    stageAt = time;
    ctx.sfx('whoosh');
  }

  function turn(s: Slot, f: Fighter, time: number): void {
    s.turned = true; s.turnedAt = time; s.by = f;
    const other = f === player ? npc : player;
    ctx.float(s.x, s.y - 50, NAMES[s.arc], s.arc === 2 ? '#fff4b0' : s.arc === 0 ? '#ffb080' : '#c8b0ff');
    if (s.arc === 0) {
      // The Tower: rubble on the foe, where they stand and where they are going.
      ctx.sfx('rock-throw');
      for (let i = 0; i < 3; i++) {
        const lead = i === 0 ? 0 : 70;
        const a = rng() * Math.PI * 2;
        rubble.push({
          x: clamp(other.x + Math.cos(a) * lead, 40, W - 40), y: clamp(other.y + Math.sin(a) * lead, top + 30, H - 30),
          at: time, fallAt: time + 900 + i * 220, victim: other, done: false, seed: rng() * 10,
        });
      }
    } else if (s.arc === 1) {
      ctx.root(f, ctx.hard ? 1300 : 1100);
      hung.set(f, time);
      ctx.sfx('chain');
    } else {
      ctx.heal(f, ctx.hard ? 11 : 14);
      starred.set(f, time);
      ctx.sfx('holy-chord');
    }
  }

  const live = () => stage === 'live';
  const seerReads = (time: number) => live() && time - stageAt > (ctx.hard ? 1600 : 2400);
  let T = 0;

  return {
    update(time, dtRaw) {
      T = time;
      stepDt(dtRaw);
      if (!started) { started = true; deal(time); }
      const k = time - stageAt;
      if (stage === 'show' && k >= SHOW_MS) { stage = 'flip'; stageAt = time; ctx.sfx('dice'); }
      else if (stage === 'flip' && k >= FLIP_MS) { stage = 'shuffle'; beginSwap(time); }
      else if (stage === 'shuffle') {
        const t = clamp(k / SWAP_MS, 0, 1);
        for (const i of swapPair) {
          const s = slots[i];
          const e = ease(t);
          // Slide on a little arc so the two never overlap mid-swap.
          const nx = -(s.ty - s.fy), ny = s.tx - s.fx;
          const nl = Math.hypot(nx, ny) || 1;
          const bow = Math.sin(e * Math.PI) * 40 * (i === swapPair[0] ? 1 : -1);
          s.x = s.fx + (s.tx - s.fx) * e + (nx / nl) * bow;
          s.y = s.fy + (s.ty - s.fy) * e + (ny / nl) * bow;
        }
        if (t >= 1) {
          for (const i of swapPair) { slots[i].x = slots[i].tx; slots[i].y = slots[i].ty; }
          swapN++;
          if (swapN >= SWAPS) { stage = 'live'; stageAt = time; } else beginSwap(time);
        }
      } else if (stage === 'live') {
        for (const s of slots) {
          if (s.turned) continue;
          for (const f of [player, npc]) {
            if (alive(f) && dist(f.x, f.y, s.x, s.y) < TOUCH_R) { turn(s, f, time); break; }
          }
        }
        if (slots.every((s) => s.turned) || k > LIVE_MS) { stage = 'gather'; stageAt = time; }
      } else if (stage === 'gather' && k > 1600) deal(time);

      for (const r of rubble) {
        if (r.done || time < r.fallAt) continue;
        r.done = true;
        ctx.sfx('stone-slam');
        if (alive(r.victim) && dist(r.victim.x, r.victim.y, r.x, r.y) < 48) ctx.hit(r.victim, ctx.hard ? 14 : 12, r.x, r.y);
        ctx.flash(r.x, r.y, 0xb0a890);
      }
      for (let i = rubble.length - 1; i >= 0; i--) if (rubble[i].done && time - rubble[i].fallAt > 2500) rubble.splice(i, 1);
      for (const m of [hung, starred]) for (const [f, at] of m) if (time - at > 1600) m.delete(f);
    },

    npcSeek() {
      if (!seerReads(T)) return null;
      // She wants the Star when she is hurt, the Tower when she is not — and never the Hanged Man.
      const want: Arcanum = npc.hp / Math.max(1, npc.maxHp) < 0.7 ? 2 : 0;
      const s = slots.find((c) => !c.turned && c.arc === want) ?? slots.find((c) => !c.turned && c.arc !== 1);
      if (s) return { x: s.x, y: s.y };
      // Only the Hanged Man left: keep off it.
      const h = slots.find((c) => !c.turned);
      if (h && dist(npc.x, npc.y, h.x, h.y) < 90) {
        const a = Math.atan2(npc.y - h.y, npc.x - h.x);
        return { x: clamp(h.x + Math.cos(a) * 140, 50, W - 50), y: clamp(h.y + Math.sin(a) * 140, top + 50, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      // The spread: chalked rectangles where cards may be dealt, a violet cloth under each card.
      for (const p of SPOTS) { g.lineStyle(1, TAROT_VIOLET_LIT, 0.18); g.strokeRect(p.x - 26, p.y - 40, 52, 80); }
      for (const s of slots) {
        g.fillStyle(0x000000, 0.25); g.fillEllipse(s.x + 3, s.y + 32, 58, 16);
        g.fillStyle(TAROT_NIGHT, 0.6); g.fillEllipse(s.x, s.y + 4, 74, 90);
        g.lineStyle(1.5, GILT, 0.35); g.strokeEllipse(s.x, s.y + 4, 74, 90);
        if (live() && !s.turned) {
          // A live card breathes.
          g.lineStyle(2, TAROT_VIOLET_LIT, 0.3 + Math.sin(time / 260 + s.x) * 0.2); g.strokeEllipse(s.x, s.y + 4, 82, 98);
        }
      }
      // The rubble's shadows grow as the stones come down.
      for (const r of rubble) {
        if (r.done) {
          const k = clamp((time - r.fallAt) / 2500, 0, 1);
          g.fillStyle(STONE_DARK, 0.6 * (1 - k)); g.fillEllipse(r.x, r.y + 6, 70, 26);
          continue;
        }
        const k = clamp((time - r.at) / (r.fallAt - r.at), 0, 1);
        g.fillStyle(0x000000, 0.12 + k * 0.3); g.fillEllipse(r.x, r.y + 4, 30 + k * 66, 12 + k * 22);
        g.lineStyle(2, 0xffb080, 0.3 + k * 0.6); g.strokeCircle(r.x, r.y, 48);
      }
    },

    drawAir(g, time) {
      for (const s of slots) {
        let face = 0;
        let sx = 1;
        if (stage === 'show') face = 1;
        else if (stage === 'flip') { const k = clamp((time - stageAt) / FLIP_MS, 0, 1); sx = Math.abs(Math.cos(k * Math.PI)); face = k < 0.5 ? 1 : 0; }
        else if (s.turned) { const k = clamp((time - s.turnedAt) / 260, 0, 1); sx = Math.abs(Math.cos((1 - k) * Math.PI)); face = k > 0.5 ? 1 : 0; }
        const fade = stage === 'gather' ? clamp(1 - (time - stageAt) / 900, 0, 1) : 1;
        if (fade <= 0) continue;
        const lift = stage === 'shuffle' ? 6 : 0;
        if (face && s.arc === 2) glow(g, s.x, s.y - lift, 40, 0xfff4b0, 0.06 * fade, 3);
        tarotCard(g, s.x, s.y - lift, CARD_W, 0, s.arc, face, fade, Math.max(0.08, sx));
      }
      // Stones falling out of nowhere onto the marked circles.
      for (const r of rubble) {
        if (r.done) {
          const k = (time - r.fallAt) / 2500;
          if (k < 1) for (let i = 0; i < 4; i++) { g.fillStyle(i % 2 ? STONE : STONE_DARK, 1 - k); g.fillCircle(r.x - 16 + i * 10 + Math.sin(r.seed + i) * 6, r.y + Math.cos(r.seed + i) * 6, 7 - i); }
          continue;
        }
        const k = clamp((time - r.at) / (r.fallAt - r.at), 0, 1);
        if (k < 0.35) continue;
        const y = r.y - (1 - k) * 340;
        g.fillStyle(STONE_DARK, 1); g.fillRect(r.x - 15, y - 13, 30, 24);
        g.fillStyle(STONE, 1); g.fillRect(r.x - 13, y - 15, 26, 18);
        g.lineStyle(1, dim(STONE, 0.4), 1); g.lineBetween(r.x - 13, y - 6, r.x + 13, y - 6); g.lineBetween(r.x, y - 15, r.x, y - 6);
      }
      // The Hanged Man: a rope from out of sight above, the held fighter swaying on it.
      for (const [f, at] of hung) {
        if (!alive(f)) continue;
        const k = (time - at) / 1100;
        if (k > 1) continue;
        const sway = Math.sin(time / 140) * 6;
        g.lineStyle(2.5, 0x8a6a3a, 1 - k * 0.5); g.lineBetween(f.x + sway, top, f.x, f.y - 30);
        g.lineStyle(2, 0x6a4a2a, 1); g.strokeCircle(f.x, f.y - 26, 5);
        g.fillStyle(TAROT_VIOLET, 0.25 * (1 - k)); g.fillCircle(f.x, f.y, 30);
      }
      // The Star: a star over the fighter, pouring light down.
      for (const [f, at] of starred) {
        if (!alive(f)) continue;
        const k = (time - at) / 1600;
        if (k > 1) continue;
        const sx = f.x, sy = f.y - 70 - k * 10;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + time / 600, r = i % 2 ? 9 : 18;
          g.fillStyle(0xfff4b0, 1 - k); g.fillTriangle(sx, sy, sx + Math.cos(a - 0.35) * 5, sy + Math.sin(a - 0.35) * 5, sx + Math.cos(a) * r, sy + Math.sin(a) * r);
        }
        for (let i = 0; i < 6; i++) { const ph = (k * 2 + i / 6) % 1; g.fillStyle(GILT_LIT, (1 - ph) * (1 - k)); g.fillCircle(sx + (i - 2.5) * 5, sy + ph * 60, 2); }
      }
    },
  };
}

export const TAROT: GimmickDef = {
  id: 'card-tarot',
  rules: 'Three tarot cards are shown, turned down and shuffled. Step on one: the Tower drops rubble on your foe, the Hanged Man holds you, the Star heals you.',
  make,
};
