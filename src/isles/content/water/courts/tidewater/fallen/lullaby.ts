import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget, Striker } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  EBB, EBB_DARK, EBB_LIT, EBB_PEARL, FOAM, MOON, PAINT_BLUE, PAINT_CREAM, SEA, SEA_DEEP, SEA_LIT, SHINGLE_DARK,
  WEED,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Lullaby Row — Row-Warden Mabry (dream).
 *
 * The drowned of Tidewater are not dead: the Queen keeps them sleeping, and someone has to sing
 * them down every night. In the crown's telling that someone is Mabry, warden of the drowned row.
 * Up out of the row's lagoon (the bottom edge) the sleepers rise, one to a bubble, curled and
 * dreaming, drifting slowly across the flats.
 *
 * Their sleep is catching. Near a bubble you *drowse* — the eyelid over your head droops — and
 * when it shuts you fall asleep where you stand. Walk clear and it lifts, slowly.
 *
 * A bubble can be struck. Burst it and the gasp wakes whoever burst it (their drowse is gone) —
 * but the sleeper wakes too, frightened, and after a breath grabs whoever is nearest by the ankle
 * and holds them. Burst one beside your foe from range and it is theirs. Below half the lullaby
 * swells: the sleepers come faster and dream wider.
 */

const BUBBLE_R = 28;
const DROWSE_RATE = 0.6;
const DROWSE_FADE = 0.14;
const SLEEP_MS = 1700;
const GASP_MS = 700;
const GRAB_R = 130;
const GRAB_MS = 1300;
const GRAB_DMG = 8;

/** A sleeper rising in its bubble. */
interface Bubble { x: number; y: number; vy: number; seed: number; t: StrikeTarget | null }
/** A sleeper just woken: it reaches for the nearest fighter when the gasp is over. */
interface Waking { x: number; y: number; at: number; grabbed: Fighter | null; tried: boolean; seed: number }

/** A drowned sleeper curled up, hair drifting — `wake` 0 asleep, 1 reaching out. */
function sleeper(g: G, x: number, y: number, s: number, seed: number, time: number, wake = 0, reach?: Pt): void {
  const drift = Math.sin(time / 600 + seed) * 2;
  g.fillStyle(SEA_DEEP, 0.85); g.fillEllipse(x + 2, y + 4, 22 * s, 14 * s);
  g.fillStyle(PAINT_BLUE, 0.85); g.fillEllipse(x + 2, y + 3, 18 * s, 11 * s);
  g.fillStyle(EBB_PEARL, 0.9); g.fillCircle(x - 7 * s, y - 4 * s, 5.5 * s);
  g.lineStyle(1.2, WEED, 0.9);
  for (let i = 0; i < 4; i++) g.lineBetween(x - 10 * s, y - 6 * s + i * 2, x - 17 * s + drift, y - 10 * s + i * 3 + drift);
  g.fillStyle(EBB_PEARL, 0.9); g.fillCircle(x + 9 * s, y + 6 * s, 3 * s);
  if (wake <= 0) {
    g.lineStyle(1, SHINGLE_DARK, 1); g.lineBetween(x - 9 * s, y - 4 * s, x - 6 * s, y - 4 * s);
  } else {
    g.fillStyle(0x10141a, 1); g.fillCircle(x - 8 * s, y - 5 * s, 1.2 * s); g.fillCircle(x - 5.5 * s, y - 5 * s, 1.2 * s);
    if (reach) {
      const ex = x + (reach.x - x) * wake, ey = y + (reach.y - y) * wake;
      g.lineStyle(4, EBB_PEARL, 0.9); g.lineBetween(x, y, ex, ey);
      g.fillStyle(EBB_PEARL, 1); g.fillCircle(ex, ey, 4.5);
      for (let i = -1; i <= 1; i++) { g.lineStyle(1.5, EBB_PEARL, 1); g.lineBetween(ex, ey, ex + 4 + i, ey + 5 + i * 2); }
    }
  }
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  let bubbles: Bubble[] = [];
  let wakings: Waking[] = [];
  const drowse = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const sleepUntil = new Map<Fighter, number>();
  let started = false;
  let nextBubble = 0;
  let swelled = false;
  let seedN = 0;

  const aura = (): number => (swelled ? 150 : 115);
  const asleep = (f: Fighter): boolean => (sleepUntil.get(f) ?? 0) > ctx.scene.time.now;

  function rise(): void {
    const b: Bubble = { x: 80 + ctx.rng() * (W - 160), y: H + 24, vy: -(24 + ctx.rng() * 12), seed: seedN++, t: null };
    b.t = ctx.target({ x: b.x, y: b.y, r: BUBBLE_R, onStruck: (by) => burst(b, by) });
    bubbles.push(b);
    ctx.sfx('bubble');
  }

  function burst(b: Bubble, by: Striker): void {
    if (!b.t) return;
    b.t.remove(); b.t = null;
    bubbles = bubbles.filter((k) => k !== b);
    const f = by === 'player' ? player : npc;
    drowse.set(f, 0);
    wakings.push({ x: b.x, y: b.y, at: ctx.scene.time.now, grabbed: null, tried: false, seed: b.seed });
    ctx.sfx('bubble');
    ctx.sfx('screech');
  }

  function grab(w: Waking): void {
    const near = [player, npc].filter((f) => alive(f) && dist(f.x, f.y, w.x, w.y) < GRAB_R)
      .sort((a, b) => dist(a.x, a.y, w.x, w.y) - dist(b.x, b.y, w.x, w.y))[0];
    if (!near) return;
    w.grabbed = near;
    ctx.root(near, GRAB_MS);
    if (near === player) tk.hitPlayer(GRAB_DMG, near.x, near.y); else ctx.hit(near, GRAB_DMG, near.x, near.y);
    ctx.sfx('status-slow');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextBubble = time + 1200; }
      if (!swelled && npc.hp < npc.maxHp * 0.55) {
        swelled = true;
        ctx.banner('THE LULLABY SWELLS — the sleepers dream wider', '#9fe6e8');
        ctx.sfx('hush');
      }
      if (time >= nextBubble) {
        nextBubble = time + (swelled ? 2000 : 2500);
        if (bubbles.length < (swelled ? 6 : 5)) rise();
      }
      for (const b of bubbles) {
        b.y += b.vy * dt;
        b.x = clamp(b.x + Math.sin(time / 900 + b.seed) * 14 * dt, 50, W - 50);
        b.t?.moveTo(b.x, b.y);
      }
      for (const b of bubbles.filter((k) => k.y < top + 20)) { b.t?.remove(); b.t = null; }
      bubbles = bubbles.filter((b) => b.t);
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        let rate = 0;
        for (const b of bubbles) rate += Math.max(0, 1 - dist(f.x, f.y, b.x, b.y) / aura()) * DROWSE_RATE;
        if (asleep(f)) continue;
        const d = clamp((drowse.get(f) ?? 0) + (rate - DROWSE_FADE) * dt, 0, 1);
        drowse.set(f, d);
        if (d >= 1) {
          sleepUntil.set(f, time + SLEEP_MS);
          drowse.set(f, 0.25);
          ctx.stun(f, SLEEP_MS);
          ctx.sfx('hush');
        }
      }
      for (const w of wakings) if (!w.tried && time >= w.at + GASP_MS) { w.tried = true; grab(w); }
      wakings = wakings.filter((w) => time < w.at + GASP_MS + GRAB_MS + 200);
    },

    playerTakenMult: () => (asleep(player) ? 1.25 : 1),
    npcTakenMult: () => (asleep(npc) ? 1.25 : 1),

    npcSeek() {
      const time = ctx.scene.time.now;
      // A sleeper is waking near Mabry: back off out of its reach (she is a beat slow to notice).
      for (const w of wakings) {
        if (w.grabbed || time - w.at < 280) continue;
        const d = dist(npc.x, npc.y, w.x, w.y);
        if (d < GRAB_R + 20) {
          const a = Math.atan2(npc.y - w.y, npc.x - w.x);
          return { x: clamp(w.x + Math.cos(a) * (GRAB_R + 60), 60, W - 60), y: clamp(w.y + Math.sin(a) * (GRAB_R + 60), top + 60, H - 50) };
        }
      }
      // Drowsy: walk away from the sleepers.
      if ((drowse.get(npc) ?? 0) > 0.45 && bubbles.length) {
        let vx = 0, vy = 0;
        for (const b of bubbles) { const d = Math.max(20, dist(npc.x, npc.y, b.x, b.y)); vx += (npc.x - b.x) / (d * d); vy += (npc.y - b.y) / (d * d); }
        const m = Math.hypot(vx, vy) || 1;
        return { x: clamp(npc.x + (vx / m) * 140, 60, W - 60), y: clamp(npc.y + (vy / m) * 140, top + 60, H - 50) };
      }
      // A bubble drifting by you: come at it from the far side, to burst it on you.
      const b = bubbles.find((k) => dist(k.x, k.y, player.x, player.y) < 110);
      if (b) {
        const a = Math.atan2(b.y - player.y, b.x - player.x);
        return { x: clamp(b.x + Math.cos(a) * 100, 60, W - 60), y: clamp(b.y + Math.sin(a) * 100, top + 60, H - 50) };
      }
      return null;
    },

    drawGround(g, time) {
      // The drowned row's lagoon along the bottom edge: roof-tips and chimneys standing out of it.
      g.fillStyle(SEA_DEEP, 0.9); g.fillRect(0, H - 30, W, 30);
      g.fillStyle(SEA, 0.8); g.fillRect(0, H - 30, W, 6);
      for (let x = 0; x < W; x += 28) {
        g.fillStyle(FOAM, 0.4); g.fillEllipse(x + 14 + Math.sin(time / 500 + x) * 4, H - 30, 20, 4);
      }
      for (let i = 0; i < 6; i++) {
        const rx = 70 + i * 165;
        g.fillStyle(EBB_DARK, 1); g.fillTriangle(rx - 26, H - 6, rx + 26, H - 6, rx, H - 30);
        g.fillStyle(PAINT_CREAM, 0.5); g.fillRect(rx + 10, H - 34, 6, 14);
      }
      // Each sleeper's dream spreads round it on the sand: soft moonlit rings.
      for (const b of bubbles) {
        g.fillStyle(EBB, 0.06); g.fillCircle(b.x, b.y + 12, aura());
        g.lineStyle(1.5, MOON, 0.18); g.strokeCircle(b.x, b.y + 12, aura() * (0.6 + 0.4 * ((time / 2400 + b.seed * 0.3) % 1)));
        g.fillStyle(0x000000, 0.18); g.fillEllipse(b.x, b.y + 34, 40, 10);
      }
      // A waking sleeper: the reach-ring closes on the gasp, then the hand.
      for (const w of wakings) {
        const k = clamp((time - w.at) / GASP_MS, 0, 1);
        if (!w.grabbed && k < 1) {
          g.fillStyle(SEA_DEEP, 0.25); g.fillCircle(w.x, w.y, GRAB_R);
          g.lineStyle(3, EBB_LIT, 0.5 + k * 0.5); g.strokeCircle(w.x, w.y, GRAB_R);
          g.fillStyle(EBB_LIT, 0.16); g.beginPath(); g.slice(w.x, w.y, GRAB_R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
        }
        g.fillStyle(SEA, 0.6); g.fillEllipse(w.x, w.y + 10, 70, 24);
        g.lineStyle(1.5, FOAM, 0.6); g.strokeEllipse(w.x, w.y + 10, 70 + k * 20, 24 + k * 6);
      }
    },

    drawAir(g, time) {
      for (const b of bubbles) {
        sleeper(g, b.x, b.y, 1, b.seed, time);
        g.fillStyle(SEA_LIT, 0.16); g.fillCircle(b.x, b.y, BUBBLE_R);
        g.lineStyle(2, FOAM, 0.55); g.strokeCircle(b.x, b.y, BUBBLE_R);
        g.lineStyle(1, EBB_LIT, 0.4); g.strokeCircle(b.x, b.y, BUBBLE_R - 4);
        g.lineStyle(3, FOAM, 0.75); g.beginPath(); g.arc(b.x, b.y, BUBBLE_R - 7, Math.PI * 1.1, Math.PI * 1.45, false); g.strokePath();
        g.fillStyle(FOAM, 0.9); g.fillCircle(b.x + 9, b.y - 13, 2.5);
        for (let i = 0; i < 3; i++) {
          const k = ((time / 1400 + i / 3 + b.seed * 0.17) % 1);
          g.lineStyle(1, FOAM, 0.6 * (1 - k)); g.strokeCircle(b.x + Math.sin(k * 6 + i) * 6, b.y - BUBBLE_R - k * 30, 2 + i);
        }
      }
      for (const w of wakings) {
        const k = clamp((time - w.at - GASP_MS) / 200, 0, 1);
        const reach = w.grabbed ? { x: w.grabbed.x, y: w.grabbed.y + 14 } : undefined;
        sleeper(g, w.x, w.y - 6, 1.3, w.seed, time, reach ? Math.max(0.01, k) : 0.01, reach);
      }
      // The drowse eyelid over each fighter: an eye whose lid closes as sleep comes.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const d = asleep(f) ? 1 : drowse.get(f) ?? 0;
        if (d < 0.08) continue;
        const x = f.x, y = f.y - 58;
        g.fillStyle(EBB_PEARL, 0.9); g.fillEllipse(x, y, 22, 11);
        g.fillStyle(EBB_DARK, 1); g.fillCircle(x, y, 3.5);
        g.fillStyle(d > 0.7 ? EBB : PAINT_BLUE, 1); g.fillEllipse(x, y - 5.5 + 5.5 * d, 22, 11 * d);
        g.lineStyle(1, EBB_DARK, 0.9); g.lineBetween(x - 9, y - 5.5 + 11 * d, x + 9, y - 5.5 + 11 * d);
        g.lineStyle(1.5, SHINGLE_DARK, 1); g.strokeEllipse(x, y, 22, 11);
        if (asleep(f)) {
          g.lineStyle(2, MOON, 0.8); g.beginPath(); g.arc(x + 16, y - 10, 5, Math.PI * 0.3, Math.PI * 1.6, false); g.strokePath();
        }
      }
    },

    drawHud(g) {
      // Your eye and Mabry's, side by side, lids at the drowse they carry.
      const y = top + 20;
      for (const [f, x] of [[player, W / 2 - 26], [npc, W / 2 + 26]] as [Fighter, number][]) {
        const d = asleep(f) ? 1 : drowse.get(f) ?? 0;
        g.fillStyle(0x000000, 0.45); g.fillEllipse(x, y, 40, 24);
        g.fillStyle(EBB_PEARL, 1); g.fillEllipse(x, y, 30, 15);
        g.fillStyle(f === player ? SEA : EBB_DARK, 1); g.fillCircle(x, y, 5);
        g.fillStyle(d > 0.7 ? EBB : PAINT_BLUE, 1); g.fillEllipse(x, y - 7.5 + 7.5 * d, 30, 15 * d);
        g.lineStyle(1.5, f === player ? SEA_LIT : MOON, 1); g.strokeEllipse(x, y, 30, 15);
      }
    },

    destroy() {
      for (const b of bubbles) b.t?.remove();
      bubbles = [];
      wakings = [];
      drowse.clear();
      sleepUntil.clear();
    },
  };
}

export const FALLEN_LULLABY: GimmickDef = {
  id: fallenId('tidewater', 'lullaby'),
  rules: 'Sleepers rise in bubbles; near them you drowse, and full drowse is sleep. Burst one to wake yourself — then its sleeper grabs whoever is nearest.',
  make,
};
