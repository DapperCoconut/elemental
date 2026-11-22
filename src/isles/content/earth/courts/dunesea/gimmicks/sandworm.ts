import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow } from '../../../../../art/IsleArt';
import { wormMaw } from '../art';
import { BRASS, BRASS_DARK, SAND, SAND_DARK, SAND_DEEP, SAND_LIT, SAND_PALE, STRIPE_RED, TIMBER_DARK } from '../palette';
import { Gait, alive, clamp, dist, stepDt } from '../util';

/**
 * Sandworm — Wormcaller Shai.
 *
 * A worm swims under the arena. It hunts by sound: every fighter is as loud as they are fast
 * (footsteps ripple out round your feet), and a hurt fighter cries out. The worm's furrow turns
 * toward whatever is loudest; reach the loudest thing and it surfaces — the sand bulges and cracks
 * in a ring first — and erupts, maw open, hurting and throwing everyone near. Stand still and it
 * loses you; it goes looking for something else.
 *
 * Shai drives *thumpers* into the sand near you: drum-stakes that beat on their own and call the
 * worm to them. Walk away from one and let it take the worm — or walk Shai into one's eruption.
 * Shai, for his part, would rather you were the loudest thing on the floor.
 */

const QUIET = 28;
const ERUPT_R = 74;
const RISE_MS = 780;
const DIVE_MS = 1500;

interface Thumper { x: number; y: number; at: number; until: number; lastBeat: number }
interface Ripple { x: number; y: number; at: number; big: boolean }
type Phase = 'hunt' | 'rise' | 'dive';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const gaits = new Map<Fighter, Gait>([[player, new Gait(player)], [npc, new Gait(npc)]]);
  const noise = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const lastStep = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const thumpers: Thumper[] = [];
  const ripples: Ripple[] = [];
  const furrow: Pt[] = [];
  const worm = { x: W / 2, y: H - 80, a: -Math.PI / 2, phase: 'hunt' as Phase, phaseAt: 0, ex: 0, ey: 0, restUntil: 0 };
  let wander: Pt = { x: W / 2, y: (top + H) / 2 };
  let target: Fighter | Thumper | null = null;
  const speed = ctx.hard ? 185 : 162;
  const dmg = ctx.hard ? 22 : 18;
  const thumpEvery = ctx.hard ? 6500 : 8200;
  let nextThump = 0;
  let started = false;

  const isFighter = (t: Fighter | Thumper | null): t is Fighter => t === player || t === npc;

  function pickTarget(time: number): Fighter | Thumper | null {
    let best: Fighter | Thumper | null = null;
    let bl = QUIET;
    for (const f of [player, npc]) if (alive(f) && (noise.get(f) ?? 0) > bl) { bl = noise.get(f) ?? 0; best = f; }
    for (const t of thumpers) if (time < t.until && 72 > bl) { bl = 72; best = t; }
    return best;
  }

  function erupt(time: number): void {
    worm.phase = 'dive';
    worm.phaseAt = time;
    ctx.sfx('roar');
    ctx.sfx('quake');
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, worm.ex, worm.ey) > ERUPT_R) continue;
      ctx.hit(f, dmg, f.x, f.y);
      ctx.stun(f, 650);
      const a = Math.atan2(f.y - worm.ey, f.x - worm.ex);
      ctx.nudge(f, Math.cos(a) * 70, Math.sin(a) * 70);
      ctx.float(f.x, f.y - 46, 'SWALLOWED', '#ffb070');
    }
    for (let i = thumpers.length - 1; i >= 0; i--) if (dist(thumpers[i].x, thumpers[i].y, worm.ex, worm.ey) < ERUPT_R) thumpers.splice(i, 1);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextThump = time + 4200; worm.restUntil = time + 1200; }

      // Footsteps.
      for (const f of [player, npc]) {
        const sp = gaits.get(f)?.step(dt) ?? 0;
        const n = noise.get(f) ?? 0;
        const want = alive(f) ? clamp(sp / 2, 0, 100) : 0;
        noise.set(f, n + (want - n) * Math.min(1, dt * (want > n ? 4 : 1.6)));
        if (alive(f) && sp > 40 && time - (lastStep.get(f) ?? 0) > 520 - Math.min(300, sp)) {
          lastStep.set(f, time);
          ripples.push({ x: f.x, y: f.y + 16, at: time, big: sp > 170 });
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) if (time - ripples[i].at > 900) ripples.splice(i, 1);

      // Shai's thumpers: a drum-stake hammered in near you.
      if (time >= nextThump && alive(npc)) {
        nextThump = time + thumpEvery;
        const a = rng() * Math.PI * 2, d = 110 + rng() * 60;
        thumpers.push({ x: clamp(player.x + Math.cos(a) * d, 70, W - 70), y: clamp(player.y + Math.sin(a) * d, top + 60, H - 50), at: time, until: time + 5200, lastBeat: 0 });
        ctx.banner('SHAI DRIVES A THUMPER', '#f2d496');
        ctx.sfx('drum-hit');
      }
      for (let i = thumpers.length - 1; i >= 0; i--) {
        const t = thumpers[i];
        if (time > t.until) { thumpers.splice(i, 1); continue; }
        if (time - t.lastBeat > 600) { t.lastBeat = time; ripples.push({ x: t.x, y: t.y, at: time, big: true }); if (((time - t.at) / 600 | 0) % 2 === 0) ctx.sfx('drum-hit'); }
      }

      // The worm.
      if (worm.phase === 'dive') {
        if (time - worm.phaseAt > DIVE_MS) { worm.phase = 'hunt'; worm.restUntil = time + 900; }
        return;
      }
      if (worm.phase === 'rise') {
        if (time - worm.phaseAt > ctx.tk.warn(RISE_MS)) erupt(time);
        return;
      }
      if (time < worm.restUntil) return;
      target = pickTarget(time);
      const goal: Pt = target ? { x: target.x, y: target.y } : wander;
      if (!target && dist(worm.x, worm.y, wander.x, wander.y) < 30) wander = { x: 80 + rng() * (W - 160), y: top + 70 + rng() * (H - top - 130) };
      const want = Math.atan2(goal.y - worm.y, goal.x - worm.x);
      const turn = Math.atan2(Math.sin(want - worm.a), Math.cos(want - worm.a));
      worm.a += clamp(turn, -3.2 * dt, 3.2 * dt);
      // Within striking distance it lunges: freeze before the furrow gets this close.
      const sp = !target ? speed * 0.45 : dist(worm.x, worm.y, goal.x, goal.y) < 120 ? speed * 2.1 : speed;
      worm.x = clamp(worm.x + Math.cos(worm.a) * sp * dt, 30, W - 30);
      worm.y = clamp(worm.y + Math.sin(worm.a) * sp * dt, top + 20, H - 20);
      furrow.push({ x: worm.x, y: worm.y });
      if (furrow.length > 26) furrow.shift();
      if (target && dist(worm.x, worm.y, target.x, target.y) < 34) {
        worm.phase = 'rise';
        worm.phaseAt = time;
        worm.ex = target.x; worm.ey = target.y;
        ctx.sfx('quake');
      }
    },

    onPlayerHurt() { noise.set(player, Math.min(100, (noise.get(player) ?? 0) + 30)); },
    onNpcHurt() { noise.set(npc, Math.min(100, (noise.get(npc) ?? 0) + 30)); },

    npcSeek() {
      const close = dist(worm.x, worm.y, npc.x, npc.y);
      // Hunted and close: freeze.
      if (target === npc && close < 260 && worm.phase === 'hunt') return { x: npc.x, y: npc.y };
      // About to erupt near him: get out of the ring.
      if (worm.phase === 'rise' && dist(worm.ex, worm.ey, npc.x, npc.y) < ERUPT_R + 40) {
        const a = Math.atan2(npc.y - worm.ey, npc.x - worm.ex);
        return { x: clamp(worm.ex + Math.cos(a) * 160, 60, W - 60), y: clamp(worm.ey + Math.sin(a) * 160, top + 50, H - 40) };
      }
      // Otherwise keep the player between himself and the worm.
      const a = Math.atan2(player.y - worm.y, player.x - worm.x);
      return { x: clamp(player.x + Math.cos(a) * 200, 60, W - 60), y: clamp(player.y + Math.sin(a) * 160, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // Footstep ripples: rings in the sand.
      for (const r of ripples) {
        const k = (time - r.at) / 900;
        g.lineStyle(r.big ? 2 : 1.2, SAND_PALE, 0.5 * (1 - k)); g.strokeEllipse(r.x, r.y, (r.big ? 26 : 16) + k * 40, (r.big ? 10 : 6) + k * 16);
      }
      // The furrow: a raised line of churned sand behind the worm.
      if (worm.phase === 'hunt') {
        furrow.forEach((p, i) => {
          const k = i / furrow.length;
          g.fillStyle(SAND_DARK, 0.35 * k); g.fillEllipse(p.x, p.y + 4, 30 * k + 8, 12 * k + 4);
          g.fillStyle(SAND_LIT, 0.4 * k); g.fillEllipse(p.x - 2, p.y, 22 * k + 6, 7 * k + 2);
        });
        // The mound over its head, with grains tumbling off it.
        g.fillStyle(SAND_DEEP, 0.5); g.fillEllipse(worm.x + 3, worm.y + 6, 50, 20);
        g.fillStyle(SAND, 1); g.fillEllipse(worm.x, worm.y, 44, 20);
        g.fillStyle(SAND_LIT, 1); g.fillEllipse(worm.x - 4, worm.y - 4, 26, 9);
        for (let i = 0; i < 6; i++) {
          const ph = (time / 300 + i / 6) % 1;
          const a = worm.a + Math.PI + (i - 2.5) * 0.4;
          g.fillStyle(SAND_PALE, 0.7 * (1 - ph)); g.fillCircle(worm.x + Math.cos(a) * (14 + ph * 20), worm.y + Math.sin(a) * (8 + ph * 12) - ph * 4, 2);
        }
      }
      if (worm.phase === 'rise') {
        // The bulge and the ring of cracks it will burst through.
        const k = clamp((time - worm.phaseAt) / ctx.tk.warn(RISE_MS), 0, 1);
        g.fillStyle(0xb8382c, 0.08 + k * 0.14); g.fillCircle(worm.ex, worm.ey, ERUPT_R);
        g.lineStyle(2, 0x6a1a14, 0.4 + k * 0.5); g.strokeCircle(worm.ex, worm.ey, ERUPT_R);
        g.fillStyle(SAND_LIT, 1); g.fillEllipse(worm.ex, worm.ey - k * 8, 40 + k * 50, 16 + k * 20);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          g.lineStyle(2, SAND_DEEP, 0.4 + k * 0.5);
          g.lineBetween(worm.ex + Math.cos(a) * 18, worm.ey + Math.sin(a) * 10, worm.ex + Math.cos(a + 0.2) * ERUPT_R * k, worm.ey + Math.sin(a + 0.2) * ERUPT_R * 0.7 * k);
        }
      }
      // Thumpers: their stakes in the sand and the beat going out of them.
      for (const t of thumpers) {
        g.fillStyle(SAND_DEEP, 0.5); g.fillEllipse(t.x, t.y + 4, 26, 9);
        const left = (t.until - time) / (t.until - t.at);
        g.lineStyle(2, STRIPE_RED, 0.3); g.strokeCircle(t.x, t.y, 30 + left * 10);
      }
    },

    drawAir(g, time) {
      for (const t of thumpers) {
        // A drum on a stake, its hammer rising and falling on the beat.
        const beat = clamp(1 - (time - t.lastBeat) / 300, 0, 1);
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(t.x - 2, t.y - 30, 4, 32);
        g.fillStyle(dim(STRIPE_RED, 0.2), 1); g.fillEllipse(t.x, t.y - 30, 22, 9);
        g.fillStyle(STRIPE_RED, 1); g.fillRect(t.x - 11, t.y - 42, 22, 12);
        g.fillStyle(0xf0e2c4, 1); g.fillEllipse(t.x, t.y - 42, 22, 8);
        g.lineStyle(1, BRASS_DARK, 1); for (let i = -9; i <= 9; i += 6) g.lineBetween(t.x + i, t.y - 42, t.x + i + 3, t.y - 30);
        const hy = t.y - 46 - (1 - beat) * 14;
        g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(t.x + 14, t.y - 30, t.x + 4, hy);
        g.fillStyle(BRASS, 1); g.fillCircle(t.x + 4, hy, 4);
        if (beat > 0.6) glow(g, t.x, t.y - 42, 22, 0xfff0c8, 0.05, 2);
      }
      if (worm.phase === 'dive') {
        const k = clamp((time - worm.phaseAt) / DIVE_MS, 0, 1);
        const open = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7;
        wormMaw(g, worm.ex, worm.ey + 18, 34, open, time);
      }
      // A tremor glyph over whatever the worm is hunting.
      if (target && worm.phase === 'hunt') {
        const tx = target.x, ty = target.y - (isFighter(target) ? 60 : 62);
        const s = 1 + Math.sin(time / 90) * 0.15;
        g.lineStyle(2, 0xb8382c, 0.85);
        g.beginPath(); g.moveTo(tx - 12 * s, ty); g.lineTo(tx - 6 * s, ty - 5); g.lineTo(tx, ty + 4); g.lineTo(tx + 6 * s, ty - 5); g.lineTo(tx + 12 * s, ty); g.strokePath();
      }
    },

    drawHud(g) {
      // Loudness: each side's noise against the worm's hearing line.
      for (const [f, x, d] of [[player, 20, 1], [npc, W - 20, -1]] as [Fighter, number, number][]) {
        const n = noise.get(f) ?? 0;
        const w = 110, x0 = d > 0 ? x : x - w, y = top + 10;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 2, y - 2, w + 4, 12, 5);
        const fw = (w * n) / 100;
        g.fillStyle(target === f ? 0xff7050 : SAND_LIT, 0.95);
        g.fillRoundedRect(d > 0 ? x0 : x0 + w - fw, y, Math.max(2, fw), 8, 4);
        const qx = d > 0 ? x0 + (w * QUIET) / 100 : x0 + w - (w * QUIET) / 100;
        g.lineStyle(2, 0xffffff, 0.7); g.lineBetween(qx, y - 3, qx, y + 11);
      }
    },
  };
}

export const SANDWORM: GimmickDef = {
  id: 'dunesea-sandworm',
  rules: 'A worm under the sand hunts the loudest thing — whoever moves most, or Shai\'s thumpers. Stand still to lose it; it erupts under its prey.',
  make,
};
