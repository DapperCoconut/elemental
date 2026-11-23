import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { glint } from '../art';
import { BEAM, BEAM_HOT, GLARE, GOLD_LIT, SPECTRUM, SUN } from '../palette';
import { alive, clamp, lineDist, rayEnd, wrapAngle } from '../util';

/**
 * Sun Dogs — Sun-Priest Parhelia.
 *
 * On a hazy day a real sun shows two false ones beside it, sitting on a faint ring of light:
 * parhelia, sun dogs. Parhelia the priest calls hers down into the plaza. The two mock suns ride
 * that ring round the arena, always opposite one another, each gazing in at the middle. Each
 * picks out whichever fighter it is facing, fixes a ray on them — tracking a moment, then
 * freezing — and fires down it: a beam that runs the whole way across the square.
 *
 * The beam does not care who else is in the way. Stand so your foe is between you and a sun
 * dog's gaze and the ray goes through them first. And a sun dog is only reflected light: strike
 * one and it blinks out for a while, and the ring goes quiet on that side.
 */

interface Dog {
  phase: number;
  state: 'idle' | 'track' | 'freeze' | 'fire' | 'out';
  at: number;
  next: number;
  aim: number;
  who: Fighter | null;
  dealt: Set<Fighter>;
  target: StrikeTarget | null;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const C: Pt = { x: W / 2, y: (top + H) / 2 + 10 };
  const RX = 380, RY = 214;
  const ORBIT = ctx.hard ? 0.24 : 0.18;
  const TRACK = 520, FREEZE = ctx.hard ? 380 : 460, FIRE = 320;
  const HALF = 22;
  const DMG = ctx.hard ? 18 : 15;
  const OUT_MS = ctx.hard ? 5000 : 6000;
  let theta = rng() * Math.PI * 2;
  let started = false;
  const dogs: Dog[] = [0, Math.PI].map((phase) => ({ phase, state: 'idle', at: 0, next: 0, aim: 0, who: null, dealt: new Set<Fighter>(), target: null }));

  const posOf = (d: Dog): Pt => ({ x: C.x + Math.cos(theta + d.phase) * RX, y: C.y + Math.sin(theta + d.phase) * RY });
  const gaze = (d: Dog): number => { const p = posOf(d); return Math.atan2(C.y - p.y, C.x - p.x); };

  /** The fighter this sun dog is facing: the one nearest its inward gaze. */
  function faced(d: Dog): Fighter | null {
    const p = posOf(d), g0 = gaze(d);
    let best: Fighter | null = null, bd = Infinity;
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      const da = Math.abs(wrapAngle(Math.atan2(f.y - p.y, f.x - p.x) - g0));
      if (da < bd) { bd = da; best = f; }
    }
    return best;
  }

  function arm(d: Dog): void {
    const p = posOf(d);
    d.target = ctx.target({
      x: p.x, y: p.y, r: 26,
      onStruck() {
        if (d.state === 'out') return;
        d.state = 'out';
        d.at = ctx.scene.time.now;
        ctx.float(p.x, p.y - 36, 'BLINKED OUT', '#fff3c0');
        ctx.sfx('blink');
        d.target?.remove();
        d.target = null;
      },
    });
  }

  return {
    update(time, dt) {
      if (!started) {
        started = true;
        dogs[0].next = time + 1400; dogs[1].next = time + 2900;
        for (const d of dogs) arm(d);
      }
      theta += ORBIT * Math.min(dt, 0.1);
      for (const d of dogs) {
        const p = posOf(d);
        d.target?.moveTo(p.x, p.y);
        if (d.state === 'out') {
          if (time - d.at >= OUT_MS) { d.state = 'idle'; d.next = time + 900; arm(d); ctx.sfx('sparkle'); }
          continue;
        }
        if (d.state === 'idle' && time >= d.next) {
          d.who = faced(d);
          if (!d.who) { d.next = time + 600; continue; }
          d.state = 'track'; d.at = time;
          ctx.sfx('beam-charge');
        }
        if (d.state === 'track') {
          if (d.who && alive(d.who)) d.aim = Math.atan2(d.who.y - p.y, d.who.x - p.x);
          if (time - d.at >= TRACK) { d.state = 'freeze'; d.at = time; }
        } else if (d.state === 'freeze' && time - d.at >= FREEZE) {
          d.state = 'fire'; d.at = time; d.dealt.clear();
          ctx.sfx('light-beam');
        } else if (d.state === 'fire') {
          // The ray runs from the sun dog outward along its aim, across the whole square.
          for (const f of [player, npc]) {
            if (!alive(f) || d.dealt.has(f)) continue;
            const ahead = (f.x - p.x) * Math.cos(d.aim) + (f.y - p.y) * Math.sin(d.aim);
            if (ahead < -10 || lineDist(f.x, f.y, p.x, p.y, d.aim) > HALF + 12) continue;
            d.dealt.add(f);
            ctx.hit(f, DMG, f.x, f.y);
            ctx.float(f.x, f.y - 50, f === npc && d.who === player ? 'CAUGHT IN YOUR RAY' : 'SUN DOG', '#fff3c0');
          }
          if (time - d.at >= FIRE) { d.state = 'idle'; d.next = time + (ctx.hard ? 1300 : 1700) + rng() * 700; }
        }
      }
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      // Keep range, out of any ray that is drawn, and not be the one a ready sun dog is facing.
      const a0 = Math.atan2(npc.y - player.y, npc.x - player.x);
      let best: Pt = { x: npc.x, y: npc.y };
      let bs = -Infinity;
      for (let i = 0; i < 12; i++) {
        const a = a0 + (i - 5.5) * 0.3;
        const x = clamp(player.x + Math.cos(a) * 240, 70, W - 70), y = clamp(player.y + Math.sin(a) * 210, top + 60, H - 50);
        let s = -Math.abs(i - 5.5) * 6;
        for (const d of dogs) {
          if (d.state === 'out') continue;
          const p = posOf(d);
          if (d.state === 'track' || d.state === 'freeze' || d.state === 'fire') {
            const ahead = (x - p.x) * Math.cos(d.aim) + (y - p.y) * Math.sin(d.aim);
            const ld = lineDist(x, y, p.x, p.y, d.aim);
            if (ahead > -10 && ld < 80) s -= (80 - ld) * 4;
          } else if (d.next - now < 900) {
            // Prefer you nearer this dog's gaze than he is.
            const g0 = gaze(d);
            const mine = Math.abs(wrapAngle(Math.atan2(y - p.y, x - p.x) - g0));
            const yours = Math.abs(wrapAngle(Math.atan2(player.y - p.y, player.x - p.x) - g0));
            if (mine < yours) s -= 60;
          }
        }
        if (s > bs) { bs = s; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // The 22° halo the sun dogs ride, and the true sun's glare at the heart of the square.
      g.lineStyle(10, GLARE, 0.07); g.strokeEllipse(C.x, C.y, RX * 2, RY * 2);
      g.lineStyle(2, GOLD_LIT, 0.16); g.strokeEllipse(C.x, C.y, RX * 2, RY * 2);
      g.fillStyle(SUN, 0.06 + Math.sin(time / 900) * 0.02); g.fillEllipse(C.x, C.y, 160, 90);
      for (const d of dogs) {
        if (d.state !== 'track' && d.state !== 'freeze' && d.state !== 'fire') continue;
        const p = posOf(d);
        const e = rayEnd(p.x, p.y, d.aim, W, top, H);
        if (d.state === 'fire') {
          const k = clamp((time - d.at) / FIRE, 0, 1);
          g.lineStyle(HALF * 2 + 10, BEAM, 0.3 * (1 - k)); g.lineBetween(p.x, p.y, e.x, e.y);
          continue;
        }
        const k = d.state === 'track' ? clamp((time - d.at) / TRACK, 0, 1) * 0.5 : 0.5 + clamp((time - d.at) / FREEZE, 0, 1) * 0.5;
        g.lineStyle(HALF * 2, BEAM, 0.05 + k * 0.12); g.lineBetween(p.x, p.y, e.x, e.y);
        g.lineStyle(1.5, d.state === 'freeze' ? 0xffffff : GOLD_LIT, 0.3 + k * 0.5);
        g.lineBetween(p.x + Math.cos(d.aim + Math.PI / 2) * HALF, p.y + Math.sin(d.aim + Math.PI / 2) * HALF, e.x + Math.cos(d.aim + Math.PI / 2) * HALF, e.y + Math.sin(d.aim + Math.PI / 2) * HALF);
        g.lineBetween(p.x - Math.cos(d.aim + Math.PI / 2) * HALF, p.y - Math.sin(d.aim + Math.PI / 2) * HALF, e.x - Math.cos(d.aim + Math.PI / 2) * HALF, e.y - Math.sin(d.aim + Math.PI / 2) * HALF);
      }
    },

    drawAir(g, time) {
      for (const d of dogs) {
        const p = posOf(d);
        const g0 = gaze(d);
        if (d.state === 'out') {
          // A faint ghost of where it was, and a ring counting it back.
          const k = clamp((time - d.at) / OUT_MS, 0, 1);
          g.lineStyle(1.5, GOLD_LIT, 0.25); g.strokeCircle(p.x, p.y, 16);
          g.lineStyle(2, GOLD_LIT, 0.5); g.beginPath(); g.arc(p.x, p.y, 20, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          continue;
        }
        // The mock sun: a white disc, a soft corona, a rainbow fringe on the side toward the true sun.
        const charge = d.state === 'track' ? 0.5 : d.state === 'freeze' ? 0.85 : d.state === 'fire' ? 1 : 0.25;
        glow(g, p.x, p.y, 42 + charge * 16, SUN, 0.07 + charge * 0.05, 4);
        for (let i = 0; i < SPECTRUM.length; i++) {
          g.lineStyle(2, SPECTRUM[i], 0.6);
          g.beginPath(); g.arc(p.x, p.y, 22 + i * 2, g0 - 0.9, g0 + 0.9, false); g.strokePath();
        }
        // A tail of white streaming away from the true sun — a sun dog's tell.
        g.fillStyle(0xffffff, 0.18);
        g.fillTriangle(p.x + Math.cos(g0 + Math.PI / 2) * 10, p.y + Math.sin(g0 + Math.PI / 2) * 10, p.x - Math.cos(g0 + Math.PI / 2) * 10, p.y - Math.sin(g0 + Math.PI / 2) * 10,
          p.x - Math.cos(g0) * 70, p.y - Math.sin(g0) * 70);
        g.fillStyle(BEAM_HOT, 1); g.fillCircle(p.x, p.y, 15);
        g.fillStyle(0xffffff, 1); g.fillCircle(p.x - 2, p.y - 2, 10 + charge * 3);
        glint(g, p.x, p.y, 20 + charge * 14 + Math.sin(time / 90) * 3, 0.9);
        // The fired ray: a white core with a spectral edge.
        if (d.state === 'fire') {
          const k = clamp((time - d.at) / FIRE, 0, 1);
          const e = rayEnd(p.x, p.y, d.aim, W, top, H);
          g.lineStyle(HALF * 2, BEAM, 0.45 * (1 - k)); g.lineBetween(p.x, p.y, e.x, e.y);
          g.lineStyle(HALF, BEAM_HOT, 0.9 * (1 - k)); g.lineBetween(p.x, p.y, e.x, e.y);
          g.lineStyle(4, 0xffffff, 1 - k); g.lineBetween(p.x, p.y, e.x, e.y);
          for (const [i, side] of [[0, 1], [6, -1]] as [number, number][]) {
            const nx = Math.cos(d.aim + Math.PI / 2) * (HALF + 2) * side, ny = Math.sin(d.aim + Math.PI / 2) * (HALF + 2) * side;
            g.lineStyle(2, SPECTRUM[i], 0.8 * (1 - k)); g.lineBetween(p.x + nx, p.y + ny, e.x + nx, e.y + ny);
          }
        }
        // Over whoever it has chosen: a small sun mark.
        if ((d.state === 'track' || d.state === 'freeze') && d.who && alive(d.who)) {
          const w = d.who;
          g.lineStyle(2, d.state === 'freeze' ? 0xffffff : GOLD_LIT, 0.8); g.strokeCircle(w.x, w.y, 28);
          for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + time / 400; g.lineBetween(w.x + Math.cos(a) * 30, w.y + Math.sin(a) * 30, w.x + Math.cos(a) * 36, w.y + Math.sin(a) * 36); }
        }
      }
    },

    destroy() { for (const d of dogs) d.target?.remove(); },
  };
}

export const SUN_DOGS: GimmickDef = {
  id: 'noon-sun-dogs',
  rules: 'Two mock suns ride a halo round the square; each fixes a ray on the fighter it faces and fires it across the arena. Strike a sun dog to blink it out.',
  make,
};
