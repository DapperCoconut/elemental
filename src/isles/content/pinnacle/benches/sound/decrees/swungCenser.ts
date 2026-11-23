import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { OBS, SILK, VOICE, VOICE_LIT, censer } from '../art';
import { type Who, WHO, alive, clamp, css, dist, fighterOf, other, stepDt, wrap } from '../util';

/**
 * DECREE OF THE SWUNG CENSER — Councilor Antiphon Grace, Seat of the Vow.
 *
 * She drafted the Vespers: the Hour at which the whole isle kneels and the great censer swings
 * down the nave over their bowed heads. In her room it is swinging now — a thurible of black glass
 * the size of a bell, burning voice-incense, on a chain from a pulley lost in the dark overhead.
 * Seen from above it sweeps the floor back and forth across the middle, and the plane it swings
 * in slowly turns, like a Foucault pendulum: the groove it will travel is inlaid in light.
 *   - At speed it is a battering ram: anyone in its way is struck and thrown along its swing.
 *     At the ends of its arc it hangs almost still — and is harmless.
 *   - Its smoke lies along the path; standing in it ANOINTS you (slow healing).
 *   - STRIKE it and the chain swings round: its plane turns toward the one you struck it at, and
 *     it swings harder.
 * Devotion never strikes a blow itself; she does not need to. She will catch it at the end of its
 * arc and aim it at you. Catch it first.
 */

const PERIOD = 3400;
const R = 30;
const HIT_R = 50;
const IMMUNE = 900;
const PUFF_LIFE = 4200;

interface Puff { x: number; y: number; t: number; seed: number }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top } = ctx;
  const DMG = ctx.hard ? 26 : 22;
  const C = { x: W / 2, y: (top + H) / 2 + 8 };
  const MAX_A = 380, MIN_A = 250;
  let theta = ctx.rng() * Math.PI;
  let phi = 0;
  let amp = 320;
  let pos: Pt = { x: C.x, y: C.y };
  let vel = 0;
  let speed = 0;
  let strikeReady = 0;
  let twistFx = -9999;
  let target: StrikeTarget | null = null;
  let nextPuff = 0;
  let healAcc: Record<Who, number> = { player: 0, npc: 0 };
  const immune: Record<Who, number> = { player: 0, npc: 0 };
  const puffs: Puff[] = [];
  let started = false;

  const axis = (): Pt => ({ x: Math.cos(theta), y: Math.sin(theta) * 0.7 });
  const place = (s: number): Pt => {
    const u = axis();
    return { x: clamp(C.x + u.x * amp * s, 40, W - 40), y: clamp(C.y + u.y * amp * s, top + 30, H - 30) };
  };
  /** Signed distance of a point off the swing line. */
  const offLine = (x: number, y: number): number => {
    const u = axis();
    const l = Math.hypot(u.x, u.y);
    return ((x - C.x) * -u.y + (y - C.y) * u.x) / l;
  };

  const twist = (by: Who) => {
    const now = ctx.scene.time.now;
    if (now < strikeReady) return;
    strikeReady = now + 700;
    const o = fighterOf(ctx, other(by));
    // Turn the plane toward the bearing of the other fighter (a plane: mod π).
    const want = Math.atan2((o.y - C.y) / 0.7, o.x - C.x);
    let d = wrap((want - theta) * 2) / 2;
    d = clamp(d, -0.5, 0.5);
    // Keep the swing continuous: change the plane, keep where along it the censer is.
    theta += d;
    amp = Math.min(MAX_A, amp * 1.12);
    twistFx = now;
    ctx.sfx('chain');
    ctx.float(pos.x, pos.y - 48, by === 'player' ? 'YOU PULL THE CHAIN' : 'SHE PULLS THE CHAIN', css(by));
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        target = ctx.target({ x: C.x, y: C.y, r: R + 4, onStruck: (by) => twist(by) });
      }
      phi += (dt * 1000 / PERIOD) * Math.PI * 2;
      theta += dt * 0.11;
      amp += (320 - amp) * dt * 0.08;
      amp = clamp(amp, MIN_A, MAX_A);
      const s = Math.sin(phi);
      vel = Math.cos(phi);
      speed = Math.abs(vel);
      pos = place(s);
      target?.moveTo(pos.x, pos.y);

      if (speed > 0.5 && time >= nextPuff) {
        nextPuff = time + 140;
        puffs.push({ x: pos.x, y: pos.y, t: time, seed: ctx.rng() * 6 });
        if (puffs.length > 46) puffs.shift();
      }
      while (puffs.length && time - puffs[0].t > PUFF_LIFE) puffs.shift();

      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        if (speed > 0.35 && time >= immune[w] && dist(f.x, f.y, pos.x, pos.y) < HIT_R) {
          immune[w] = time + IMMUNE;
          const u = axis();
          const l = Math.hypot(u.x, u.y);
          const dir = vel >= 0 ? 1 : -1;
          ctx.hit(f, Math.round(DMG * (0.6 + speed * 0.4)), f.x, f.y);
          ctx.nudge(f, (u.x / l) * dir * 120, (u.y / l) * dir * 120);
          ctx.float(f.x, f.y - 52, 'STRUCK BY THE CENSER', w === 'player' ? '#ff9ab0' : '#ffd2ec');
          ctx.flash(f.x, f.y, VOICE);
          ctx.sfx('gravity-slam');
        }
        // Anointed: healing in the incense.
        if (puffs.some((p) => dist(p.x, p.y, f.x, f.y) < 34)) {
          healAcc[w] += dt * 3;
          if (healAcc[w] >= 3) { ctx.heal(f, 3); healAcc[w] -= 3; }
        }
      }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const now = ctx.scene.time.now;
      // Catch it at the end of the arc on her side, and turn it on you.
      if (now >= strikeReady && Math.abs(offLine(p.x, p.y)) > 90) {
        const sideN = Math.sign((n.x - C.x) * axis().x + (n.y - C.y) * axis().y) || 1;
        const apex = place(sideN);
        if (dist(n.x, n.y, apex.x, apex.y) < 240) {
          const a = Math.atan2(apex.y - C.y, apex.x - C.x);
          return { x: clamp(apex.x + Math.cos(a) * 46, 60, W - 60), y: clamp(apex.y + Math.sin(a) * 46, top + 40, H - 40) };
        }
      }
      // Otherwise off the line, at preaching range from you.
      const d = offLine(n.x, n.y);
      if (Math.abs(d) < 110) {
        const u = axis();
        const l = Math.hypot(u.x, u.y);
        const sg = d >= 0 ? 1 : -1;
        return { x: clamp(n.x - (u.y / l) * sg * 140, 60, W - 60), y: clamp(n.y + (u.x / l) * sg * 140, top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      // The groove of the swing, inlaid in light, with the still points at either end.
      const a = place(-1), b = place(1);
      g.lineStyle(26, VOICE, 0.05); g.lineBetween(a.x, a.y, b.x, b.y);
      const n = 22;
      for (let i = 0; i < n; i++) {
        if (i % 2) continue;
        const k0 = i / n, k1 = (i + 1) / n;
        g.lineStyle(2, VOICE, 0.35);
        g.lineBetween(a.x + (b.x - a.x) * k0, a.y + (b.y - a.y) * k0, a.x + (b.x - a.x) * k1, a.y + (b.y - a.y) * k1);
      }
      for (const e of [a, b]) { g.lineStyle(1.5, VOICE_LIT, 0.5); g.strokeCircle(e.x, e.y, 18); }
      // The censer's shadow on the floor.
      g.fillStyle(0x000000, 0.35); g.fillEllipse(pos.x + 10, pos.y + 28, R * 2.2, R * 0.8);
      // Incense lying along its path.
      for (const p of puffs) {
        const age = (time - p.t) / PUFF_LIFE;
        const r = 14 + age * 26;
        g.fillStyle(SILK, 0.14 * (1 - age)); g.fillCircle(p.x + Math.sin(time / 900 + p.seed) * 8 * age, p.y - age * 20, r);
        g.fillStyle(VOICE, 0.06 * (1 - age)); g.fillCircle(p.x, p.y - age * 20, r * 0.6);
      }
    },

    drawAir(g, time) {
      // The chain from the pulley high above (at the centre) out to the censer, foreshortened.
      g.fillStyle(OBS.glass, 1); g.fillCircle(C.x, C.y, 12);
      g.lineStyle(2, OBS.edge, 0.8); g.strokeCircle(C.x, C.y, 12);
      g.fillStyle(OBS.seamLit, 0.8); g.fillCircle(C.x, C.y, 3);
      const links = 10;
      for (let i = 1; i < links; i++) {
        const k = i / links;
        const x = C.x + (pos.x - C.x) * k, y = C.y + (pos.y - C.y) * k - Math.sin(k * Math.PI) * 18;
        g.lineStyle(2, OBS.edge, 0.7); g.strokeEllipse(x, y, 7, 4);
      }
      censer(g, pos.x, pos.y - 18, R, time / 1000, speed);
      // Speed lines when it is dangerous.
      if (speed > 0.35) {
        const u = axis();
        const l = Math.hypot(u.x, u.y);
        const dir = vel >= 0 ? -1 : 1;
        for (let i = 0; i < 4; i++) {
          const o = (i - 1.5) * 12;
          const sx = pos.x - (u.y / l) * o, sy = pos.y - 18 + (u.x / l) * o;
          g.lineStyle(2, VOICE_LIT, 0.4 * speed);
          g.lineBetween(sx + (u.x / l) * dir * 30, sy + (u.y / l) * dir * 30, sx + (u.x / l) * dir * (60 + speed * 50), sy + (u.y / l) * dir * (60 + speed * 50));
        }
      }
      if (time - twistFx < 500) {
        const k = (time - twistFx) / 500;
        g.lineStyle(4 * (1 - k), VOICE_LIT, 1 - k); g.strokeCircle(pos.x, pos.y - 18, R + k * 40);
      }
      // Anointed: a faint halo on whoever stands in the smoke.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f) || !puffs.some((p) => dist(p.x, p.y, f.x, f.y) < 34)) continue;
        g.lineStyle(2, VOICE_LIT, 0.5 + 0.3 * Math.sin(time / 150)); g.strokeEllipse(f.x, f.y - 34, 26, 8);
      }
    },

    destroy() { target?.remove(); target = null; healAcc = { player: 0, npc: 0 }; },
  };
};

export const SWUNG_CENSER: GimmickDef = {
  id: 'bench-sound-swung-censer',
  rules: 'All shall bow while the censer swings: at speed it strikes and hurls, its smoke anoints. Strike it to turn its swing toward your foe.',
  make,
};
