import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { OBS, VOICE, VOICE_LIT, cabinet } from '../art';
import { type Who, WHO, alive, clamp, css, dist, fighterOf, other, stepDt } from '../util';

/**
 * DECREE OF THE VANISHING CHORISTER — Councilor Persona Gilt, Seat of the Mask.
 *
 * She drafted the clause that keeps the choir faceless, and the quieter one beneath it: a singer
 * who is no longer wanted simply is not there at the next Hour. Her room is a magic act. Three
 * magician's cabinets of black glass stand on the floor. Stand on a cabinet's star and you step
 * inside — the doors shut, nothing can touch you — and a moment later you step out of ANOTHER
 * cabinet with a flourish: TA-DA, and every blow you land is 30% harder for a while.
 *
 * But the cabinet you will come out of RATTLES while you are inside it, its painted eyes lit.
 * Strike the rattling cabinet before the doors open and whoever comes out of it is SAWN IN HALF:
 * stunned and cut. She is Illusion — she relocates, she lives in other places — and she uses the
 * cabinets constantly. Watch which door rattles. The cabinets stop shots; they are good cover too.
 */

const PAD_R = 34;
const ENTER_MS = 350;
const INSIDE = 820;
const COOLDOWN = 4200;
const REVEAL_MS = 3000;
const OPEN_MS = 520;

interface Cab { x: number; y: number; target: StrikeTarget | null; openAt: number; sawAt: number }
interface Act { inside: boolean; from: number; exit: number; until: number; onPad: number; padIdx: number; readyAt: number; revealUntil: number; sawn: boolean }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top } = ctx;
  const SAW = ctx.hard ? 22 : 18;
  const STUN = ctx.hard ? 1500 : 1300;
  const cabs: Cab[] = [
    { x: 200, y: top + 170, target: null, openAt: -9999, sawAt: -9999 },
    { x: W - 200, y: top + 170, target: null, openAt: -9999, sawAt: -9999 },
    { x: W / 2, y: H - 90, target: null, openAt: -9999, sawAt: -9999 },
  ];
  const pad = (c: Cab): Pt => ({ x: c.x, y: c.y + 28 });
  const inside = (c: Cab): Pt => ({ x: c.x, y: c.y - 40 });
  const act: Record<Who, Act> = {
    player: { inside: false, from: 0, exit: 0, until: 0, onPad: 0, padIdx: -1, readyAt: 0, revealUntil: 0, sawn: false },
    npc: { inside: false, from: 0, exit: 0, until: 0, onPad: 0, padIdx: -1, readyAt: 0, revealUntil: 0, sawn: false },
  };
  let botWantsIn = 0;
  let started = false;

  const strike = (i: number, by: Who) => {
    const now = ctx.scene.time.now;
    for (const w of WHO) {
      const a = act[w];
      if (!a.inside || a.exit !== i || by === w || a.sawn) continue;
      a.sawn = true;
      cabs[i].sawAt = now;
      ctx.sfx('slash');
      ctx.float(cabs[i].x, cabs[i].y - 140, 'THE SAW GOES IN', css(by));
    }
  };

  const enter = (w: Who, i: number, time: number) => {
    const f = fighterOf(ctx, w);
    const a = act[w];
    a.inside = true; a.from = i; a.sawn = false;
    let e = Math.floor(ctx.rng() * 2);
    if (e >= i) e++;
    a.exit = e;
    a.until = time + ctx.tk.warn(INSIDE);
    const p = inside(cabs[i]);
    ctx.nudge(f, p.x - f.x, p.y - f.y);
    ctx.root(f, a.until - time + 60);
    ctx.airborne(f, a.until - time + 60);
    ctx.sfx('portal');
  };

  const emerge = (w: Who, time: number) => {
    const f = fighterOf(ctx, w);
    const a = act[w];
    a.inside = false;
    a.readyAt = time + COOLDOWN;
    const c = cabs[a.exit];
    c.openAt = time;
    const p = pad(c);
    ctx.nudge(f, p.x - f.x, p.y - f.y);
    // Mind the door: whoever is standing on the star is shoved off it.
    const o = fighterOf(ctx, other(w));
    if (alive(o) && dist(o.x, o.y, p.x, p.y) < 70) {
      const ang = Math.atan2(o.y - p.y, o.x - p.x);
      ctx.nudge(o, Math.cos(ang) * 90, Math.sin(ang) * 90);
    }
    if (a.sawn) {
      ctx.hit(f, SAW, f.x, f.y);
      ctx.stun(f, STUN);
      ctx.float(f.x, f.y - 56, 'SAWN IN HALF', '#ff9ab0');
      ctx.sfx('crit');
    } else {
      a.revealUntil = time + REVEAL_MS;
      ctx.float(f.x, f.y - 56, 'TA-DA!', css(w));
      ctx.sfx('sparkle');
    }
    a.sawn = false;
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        cabs.forEach((c, i) => { c.target = ctx.target({ x: c.x, y: c.y - 55, r: 40, onStruck: (by) => strike(i, by) }); });
        botWantsIn = time + 5000;
      }
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const a = act[w];
        if (!alive(f)) continue;
        if (a.inside) {
          if (time >= a.until) emerge(w, time);
          continue;
        }
        if (time < a.readyAt) { a.onPad = 0; continue; }
        const i = cabs.findIndex((c) => { const p = pad(c); return dist(f.x, f.y, p.x, p.y) < PAD_R; });
        if (i < 0 || (i !== a.padIdx)) { a.onPad = 0; a.padIdx = i; continue; }
        a.onPad += dt * 1000;
        if (a.onPad >= ENTER_MS) { a.onPad = 0; enter(w, i, time); if (w === 'npc') botWantsIn = time + 6500 + ctx.rng() * 3000; }
      }
    },

    playerTakenMult() { return ctx.scene.time.now < act.npc.revealUntil ? 1.3 : 1; },
    npcTakenMult() { return ctx.scene.time.now < act.player.revealUntil ? 1.3 : 1; },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const now = ctx.scene.time.now;
      // You are inside: she goes to the door you will come out of, to put the saw in it.
      if (act.player.inside && !act.player.sawn) {
        const c = cabs[act.player.exit];
        const a = Math.atan2(n.y - (c.y - 55), n.x - c.x);
        return { x: clamp(c.x + Math.cos(a) * 70, 60, W - 60), y: clamp(c.y - 55 + Math.sin(a) * 70, top + 40, H - 40) };
      }
      if (act.npc.inside) return null;
      // Time for a trick: the nearest star you are not standing by.
      const hurt = n.hp / Math.max(1, n.maxHp) < 0.4;
      if (now >= act.npc.readyAt && (now >= botWantsIn || hurt)) {
        let best: Pt | null = null, bd = Infinity;
        for (const c of cabs) {
          const q = pad(c);
          if (dist(p.x, p.y, q.x, q.y) < 140) continue;
          const d = dist(n.x, n.y, q.x, q.y);
          if (d < bd) { bd = d; best = q; }
        }
        return best;
      }
      return null;
    },

    drawGround(g, time) {
      for (const c of cabs) {
        const q = pad(c);
        const free = WHO.every((w) => !(act[w].inside && act[w].from === cabs.indexOf(c)));
        // The star on the floor where you step in.
        g.fillStyle(VOICE, 0.08); g.fillCircle(q.x, q.y, PAD_R + 6);
        g.lineStyle(1.5, free ? VOICE : OBS.edge, free ? 0.6 : 0.3); g.strokeCircle(q.x, q.y, PAD_R);
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i / 5) * Math.PI * 2 + time / 3000;
          const b = a + Math.PI * 0.8;
          g.lineStyle(1.2, VOICE_LIT, 0.4);
          g.lineBetween(q.x + Math.cos(a) * (PAD_R - 6), q.y + Math.sin(a) * (PAD_R - 6) * 0.6, q.x + Math.cos(b) * (PAD_R - 6), q.y + Math.sin(b) * (PAD_R - 6) * 0.6);
        }
      }
      // Stepping in: a ring closing round whoever is on a star.
      for (const w of WHO) {
        const a = act[w];
        if (a.inside || a.onPad <= 0 || a.padIdx < 0) continue;
        const q = pad(cabs[a.padIdx]);
        const k = a.onPad / ENTER_MS;
        g.lineStyle(3, VOICE_LIT, 0.9); g.beginPath(); g.arc(q.x, q.y, PAD_R + 4, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },

    drawAir(g, time) {
      cabs.forEach((c, i) => {
        const rattling = WHO.some((w) => act[w].inside && act[w].exit === i);
        const occupied = WHO.some((w) => act[w].inside && act[w].from === i);
        const since = time - c.openAt;
        const open = since < OPEN_MS ? Math.sin((since / OPEN_MS) * Math.PI) : 0;
        cabinet(g, c.x, c.y, open, rattling ? 3 : occupied ? 1 : 0, rattling ? 0.6 + 0.4 * Math.sin(time / 60) : 0, time);
        // A puff of glitter when the doors fly open.
        if (since < 700) {
          const k = since / 700;
          for (let j = 0; j < 12; j++) {
            const a = (j / 12) * Math.PI * 2;
            g.fillStyle(j % 2 ? VOICE_LIT : OBS.seamLit, 1 - k);
            g.fillCircle(c.x + Math.cos(a) * (20 + k * 60), c.y - 50 + Math.sin(a) * (20 + k * 50) - k * 20, 2);
          }
        }
        // The saw, through the box, once someone has put it in.
        const sawn = WHO.some((w) => act[w].inside && act[w].exit === i && act[w].sawn);
        if (sawn || time - c.sawAt < 400) {
          const y = c.y - 60;
          const jig = Math.sin(time / 30) * 10;
          g.fillStyle(OBS.edge, 1); g.fillRect(c.x - 62 + jig, y - 5, 124, 10);
          g.fillStyle(0xffffff, 0.7); g.fillRect(c.x - 62 + jig, y - 5, 124, 2);
          for (let k = 0; k < 16; k++) g.fillTriangle(c.x - 60 + k * 7.6 + jig, y + 5, c.x - 56 + k * 7.6 + jig, y + 5, c.x - 58 + k * 7.6 + jig, y + 10);
          g.fillStyle(OBS.glass, 1); g.fillRoundedRect(c.x + 56 + jig, y - 10, 22, 20, 5);
        }
        if (rattling) {
          for (let k = 0; k < 3; k++) {
            const ph = ((time / 500) + k / 3) % 1;
            g.lineStyle(2, VOICE_LIT, 1 - ph);
            g.beginPath(); g.arc(c.x + (k - 1) * 20, c.y - 150 - ph * 20, 6, Math.PI, 0, false); g.strokePath();
          }
        }
      });
      // TA-DA: a spotlight cone and sparkles on whoever just appeared.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f) || time >= act[w].revealUntil) continue;
        const k = (act[w].revealUntil - time) / REVEAL_MS;
        g.fillStyle(VOICE_LIT, 0.08 * k + 0.03); g.fillTriangle(f.x - 34, f.y + 18, f.x + 34, f.y + 18, f.x, f.y - 200);
        for (let j = 0; j < 4; j++) {
          const a = time / 300 + j * 1.57;
          g.fillStyle(VOICE_LIT, 0.8); g.fillCircle(f.x + Math.cos(a) * 26, f.y - 10 + Math.sin(a) * 12, 1.8);
        }
      }
    },

    drawHud(g, time) {
      // Your trick cooldown: a little cabinet that fills.
      const a = act.player;
      const k = a.inside ? 0 : clamp(1 - (a.readyAt - time) / COOLDOWN, 0, 1);
      const x = 30, y = top + 16;
      g.fillStyle(0x07050c, 0.8); g.fillRoundedRect(x - 8, y - 6, 34, 40, 5);
      g.fillStyle(k >= 1 ? VOICE : OBS.facet, 1); g.fillRect(x, y + 30 - 28 * k, 18, 28 * k);
      g.lineStyle(1.5, k >= 1 ? VOICE_LIT : OBS.edge, 0.8); g.strokeRect(x, y + 2, 18, 28);
      g.lineBetween(x + 9, y + 2, x + 9, y + 30);
    },

    destroy() { for (const c of cabs) { c.target?.remove(); c.target = null; } },
  };
};

export const VANISHING_CHORISTER: GimmickDef = {
  id: 'bench-sound-vanishing-chorister',
  rules: 'A singer may vanish: step into a cabinet and out of another, TA-DA (+30% damage). The exit rattles — strike it first and they come out sawn in half.',
  make,
};
