import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { OBS, VOICE_LIT, lit, repeatSign } from '../art';
import { type Who, WHO, alive, clamp, css, dist, fighterOf, other } from '../util';

/**
 * DECREE OF THE STANDING REPEAT — Councilor Iterum Hollowell, Seat of the Repeat.
 *
 * He drafted the clause that the caves must repeat the Score so that it never quite stops. In
 * his room nothing is said only once. Every fighter is followed by their ECHO: a ghost of them
 * walking their exact path 2.4 seconds behind, glowing — it shows through Echo's own dark, so
 * in here you always know where your foe *was*. An echo is a thing you can strike, and the room
 * repeats the blow on its owner (60%). Stand still and your echo stands in you: every blow lands
 * twice.
 *
 * Every few seconds the repeat sign glows and the room plays the bar back: each echo SOUNDS — a
 * ring round it that strikes the other fighter if they are inside. He keeps moving so his echo
 * is never on him and steps off yours before the sign comes round. The answer is the same: lead
 * him down your own path, and be somewhere else when the room repeats it.
 */

const DELAY = 2400;
const SAMPLE = 50;
const RELAY = 0.6;
const RING_R = 112;
const WARN = 1500;

interface Sample { t: number; x: number; y: number }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top } = ctx;
  const PERIOD = ctx.hard ? 7600 : 9200;
  const RING_DMG = ctx.hard ? 20 : 16;
  const trail: Record<Who, Sample[]> = { player: [], npc: [] };
  const echo: Record<Who, Pt> = { player: { x: ctx.player.x, y: ctx.player.y }, npc: { x: ctx.npc.x, y: ctx.npc.y } };
  const relayReady: Record<Who, number> = { player: 0, npc: 0 };
  const struckFx: Record<Who, number> = { player: -9999, npc: -9999 };
  const targets: Partial<Record<Who, StrikeTarget>> = {};
  let nextSample = 0;
  let repeatAt = 0;
  let warned = false;
  let soundedAt = -9999;
  let started = false;

  const colorOf = (w: Who): number => (w === 'player' ? 0xffd2ec : 0xc9b0ff);

  /** Where `w` was DELAY ms ago (the oldest sample if the trail is younger than that). */
  const was = (w: Who, now: number): Pt => {
    const tr = trail[w];
    const want = now - DELAY;
    for (let i = tr.length - 1; i >= 0; i--) if (tr[i].t <= want) return tr[i];
    return tr[0] ?? echo[w];
  };

  const relay = (owner: Who, by: Who, amount: number) => {
    if (by === owner) return;
    const now = ctx.scene.time.now;
    const f = fighterOf(ctx, owner);
    if (!alive(f) || now < relayReady[owner] || amount <= 0) return;
    relayReady[owner] = now + 220;
    struckFx[owner] = now;
    ctx.hit(f, Math.max(1, Math.round(amount * RELAY)), f.x, f.y - 10);
    if (Math.floor(now / 1000) % 2 === 0) ctx.float(f.x, f.y - 52, 'REPEATED', css(owner));
  };

  const sound = (time: number) => {
    soundedAt = time;
    ctx.sfx('sonic-pulse');
    for (const w of WHO) {
      const e = echo[w];
      const o = fighterOf(ctx, other(w));
      if (!alive(o) || dist(o.x, o.y, e.x, e.y) > RING_R) continue;
      ctx.hit(o, RING_DMG, o.x, o.y);
      const a = Math.atan2(o.y - e.y, o.x - e.x);
      ctx.nudge(o, Math.cos(a) * 70, Math.sin(a) * 70);
      ctx.float(o.x, o.y - 50, 'ECHOED', css(w));
    }
  };

  return {
    update(time) {
      if (!started) {
        started = true;
        repeatAt = time + PERIOD;
        for (const w of WHO) {
          const f = fighterOf(ctx, w);
          targets[w] = ctx.target({ x: f.x, y: f.y, r: 24, passThrough: true, onStruck: (by, amount) => relay(w, by, amount) });
        }
      }
      if (time >= nextSample) {
        nextSample = time + SAMPLE;
        for (const w of WHO) {
          const f = fighterOf(ctx, w);
          if (!alive(f)) continue;
          const tr = trail[w];
          tr.push({ t: time, x: f.x, y: f.y });
          while (tr.length > 2 && tr[1].t <= time - DELAY) tr.shift();
        }
      }
      for (const w of WHO) {
        const p = was(w, time);
        echo[w] = { x: p.x, y: p.y };
        targets[w]?.moveTo(p.x, p.y);
      }
      if (!warned && time >= repeatAt - WARN) { warned = true; ctx.banner('REPEAT', '#ffd2ec'); ctx.sfx('beam-charge'); }
      if (time >= repeatAt) { warned = false; repeatAt = time + PERIOD; sound(time); }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const now = ctx.scene.time.now;
      const e = echo.player;
      // Off your echo before the room repeats it.
      if (repeatAt - now < WARN + 700 && dist(n.x, n.y, e.x, e.y) < RING_R + 40) {
        const a = Math.atan2(n.y - e.y, n.x - e.x);
        return { x: clamp(e.x + Math.cos(a) * (RING_R + 90), 70, W - 70), y: clamp(e.y + Math.sin(a) * (RING_R + 90), top + 50, H - 50) };
      }
      // Otherwise never still: circle you at fighting range, so his own echo is always somewhere else.
      const a = Math.atan2(n.y - p.y, n.x - p.x) + 0.7;
      return { x: clamp(p.x + Math.cos(a) * 230, 70, W - 70), y: clamp(p.y + Math.sin(a) * 200, top + 50, H - 50) };
    },

    drawGround(g, time) {
      const warn = clamp(1 - (repeatAt - time) / WARN, 0, 1);
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const c = colorOf(w);
        const tr = trail[w];
        // The path the echo will walk: a dotted line of sound from the echo to its owner.
        for (let i = 0; i < tr.length; i += 3) {
          const s = tr[i];
          const age = (time - s.t) / DELAY;
          g.fillStyle(c, 0.12 + (1 - age) * 0.18);
          g.fillCircle(s.x, s.y + 16, 2.2);
        }
        if (!alive(f)) continue;
        // The ring the echo will sound, filling as the repeat comes round.
        const e = echo[w];
        g.lineStyle(1.2, c, 0.18 + warn * 0.5); g.strokeCircle(e.x, e.y, RING_R);
        if (warn > 0) { g.fillStyle(c, 0.05 + warn * 0.12); g.fillCircle(e.x, e.y, RING_R * warn); }
      }
      const since = time - soundedAt;
      if (since < 500) {
        const k = since / 500;
        for (const w of WHO) {
          const e = echo[w];
          g.lineStyle(5 * (1 - k), lit(colorOf(w), 0.4), 1 - k); g.strokeCircle(e.x, e.y, RING_R * (0.6 + k * 0.5));
          g.fillStyle(colorOf(w), 0.25 * (1 - k)); g.fillCircle(e.x, e.y, RING_R);
        }
      }
    },

    drawAir(g, time) {
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        const e = echo[w];
        const c = colorOf(w);
        const hurt = time - struckFx[w] < 260;
        // The echo: a hollow body, two dim eyes, rings breathing off it — and a repeat sign over it.
        for (let i = 0; i < 2; i++) {
          const ph = ((time / 900) + i / 2) % 1;
          g.lineStyle(1.5, c, 0.4 * (1 - ph)); g.strokeCircle(e.x, e.y, 22 + ph * 26);
        }
        g.fillStyle(c, hurt ? 0.45 : 0.16); g.fillCircle(e.x, e.y, 21);
        g.lineStyle(2, c, hurt ? 1 : 0.6); g.strokeCircle(e.x, e.y, 21);
        g.fillStyle(lit(c, 0.6), 0.55); g.fillEllipse(e.x - 6, e.y - 4, 5, 7); g.fillEllipse(e.x + 6, e.y - 4, 5, 7);
        repeatSign(g, e.x, e.y - 36, 7, c, 0.7);
        // A thread from the echo to its owner when they are close (standing still = struck twice).
        const d = dist(e.x, e.y, f.x, f.y);
        if (d < 40) {
          g.lineStyle(2, VOICE_LIT, 0.5 + 0.4 * Math.sin(time / 90)); g.strokeCircle(f.x, f.y, 30);
        }
      }
    },

    drawHud(g, time) {
      const cx = ctx.W / 2, cy = top + 24;
      const k = clamp(1 - (repeatAt - time) / PERIOD, 0, 1);
      g.fillStyle(0x07050c, 0.85); g.fillCircle(cx, cy, 20);
      g.lineStyle(2, OBS.edge, 0.6); g.strokeCircle(cx, cy, 20);
      g.lineStyle(4, k > 1 - WARN / PERIOD ? VOICE_LIT : OBS.seam, 1);
      g.beginPath(); g.arc(cx, cy, 16, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      repeatSign(g, cx, cy, 8, k > 1 - WARN / PERIOD ? VOICE_LIT : OBS.edge, 1);
    },

    destroy() { for (const w of WHO) targets[w]?.remove(); },
  };
};

export const STANDING_REPEAT: GimmickDef = {
  id: 'bench-sound-standing-repeat',
  rules: 'Nothing is said once: each voice is followed by its echo. Strike an echo and its owner feels it. On the repeat sign, each echo sounds at the other.',
  make,
};
