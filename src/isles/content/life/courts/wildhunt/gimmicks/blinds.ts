import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_BLINDS } from '../encounters';
import { FOE_C, GILT, MINE_C, clamp, dist, frameClock, reedHide } from '../util';

/**
 * Hunting Blinds — Blindkeeper Fern's reedbed. Four woven hides stand about the glade. Crouch
 * inside one and **the world forgets you**: blows find you at a third of their weight, and the
 * reeds close over you. Stay in long enough to settle (a moment) and leave it — **your first
 * blow out of a hide strikes double**, the old ambusher's shot.
 *
 * Fern is an illusionist. One of the four is always **a false hide**, a weave of nothing; step
 * into it and it unravels round you, and you stand there **spotted** — struck harder for a
 * moment. Its seed-heads catch the light wrong, if you look; and every so often the weave shifts
 * and a different one lies. Hides do not last: a hit on someone inside **flushes** it flat, and
 * anyone who lingers too long feels the reeds part on their own.
 *
 * Fern hides as well, and she never walks into her own lie. The rule the player can turn: she
 * has to leave her hide to take her shot — be the one waiting when she does.
 */

interface Hide { x: number; y: number; r: number; downUntil: number; seed: number; dissolveAt: number }
interface SideState { in: Hide | null; since: number; primedUntil: number; spottedUntil: number }

const HIDE_R = 40;
const SETTLE_MS = 800;
const PRIME_MS = 3500;

function makeBlinds(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const lingerMs = hard ? 4200 : 5200;
  const shiftMs = hard ? 9000 : 11000;
  const hiddenMult = 0.35;
  const primedMult = 2;
  const spottedMult = 1.3;

  const hides: Hide[] = [
    { x: W * 0.2, y: top + 130 }, { x: W * 0.8, y: top + 140 }, { x: W * 0.28, y: H - 110 }, { x: W * 0.74, y: H - 120 },
  ].map((p, i) => ({ ...p, r: HIDE_R, downUntil: 0, seed: i * 1.7, dissolveAt: -9999 }));
  let falseIdx = Math.floor(ctx.rng() * hides.length);
  let nextShift = ctx.scene.time.now + shiftMs;
  let shiftAt = -9999;

  const ps: SideState = { in: null, since: 0, primedUntil: 0, spottedUntil: 0 };
  const ns: SideState = { in: null, since: 0, primedUntil: 0, spottedUntil: 0 };

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const standing = (h: Hide, time: number): boolean => time >= h.downUntil;
  const hideAt = (x: number, y: number, time: number): Hide | null => {
    for (const h of hides) if (standing(h, time) && dist(x, y, h.x, h.y + 6) < h.r) return h;
    return null;
  };

  const collapse = (h: Hide, time: number, ms: number, text: string): void => {
    h.downUntil = time + ms;
    h.dissolveAt = time;
    ctx.float(h.x, h.y - 60, text, '#e8dca0');
    ctx.sfx('whoosh');
  };

  const track = (f: Fighter, s: SideState, isP: boolean, time: number): void => {
    if (!alive(f)) { s.in = null; return; }
    const h = hideAt(f.x, f.y, time);
    if (h && hides.indexOf(h) === falseIdx) {
      // Fern knows her own lie; anyone else unravels it.
      if (isP) {
        collapse(h, time, 6500, 'A FALSE HIDE');
        s.spottedUntil = time + 2500;
        ctx.float(f.x, f.y - 50, 'SPOTTED', '#ffb27a');
        ctx.sfx('glitch');
      }
      if (s.in) s.in = null;
      return;
    }
    if (h && !s.in) { s.in = h; s.since = time; }
    else if (!h && s.in) {
      if (time - s.since >= SETTLE_MS) {
        s.primedUntil = time + PRIME_MS;
        ctx.float(f.x, f.y - 52, isP ? 'AMBUSH READY' : 'SHE BREAKS COVER', isP ? '#ffe08a' : '#ffb27a');
        ctx.sfx('reload');
      }
      s.in = null;
    } else if (h && s.in && time - s.since > lingerMs) {
      collapse(h, time, 7000, 'THE REEDS PART');
      s.in = null;
    }
  };

  const shift = (time: number): void => {
    const choices = hides.map((_, i) => i).filter((i) => i !== falseIdx && standing(hides[i], time) && hides[i] !== ps.in && hides[i] !== ns.in);
    if (!choices.length) return;
    falseIdx = choices[Math.floor(ctx.rng() * choices.length)];
    shiftAt = time;
    ctx.float(W / 2, top + 60, 'THE WEAVE SHIFTS', '#d8c8ff');
    ctx.sfx('sparkle');
  };

  /** A blow that lands on someone inside a hide knocks it flat. */
  const flush = (s: SideState): void => {
    if (!s.in) return;
    collapse(s.in, ctx.scene.time.now, 6000, 'FLUSHED');
    s.in = null;
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      track(ctx.player, ps, true, time);
      track(ctx.npc, ns, false, time);
      if (time >= nextShift) { nextShift = time + shiftMs; shift(time); }
    },

    onPlayerHurt() {
      if (ctx.scene.time.now < ns.primedUntil) { ns.primedUntil = 0; ctx.float(ctx.player.x, ctx.player.y - 60, 'SHOT FROM COVER', '#ffb27a'); ctx.sfx('crit'); }
      flush(ps);
    },
    onNpcHurt() {
      // The ambush shot is spent on the first blow that lands.
      if (ctx.scene.time.now < ps.primedUntil) { ps.primedUntil = 0; ctx.float(ctx.npc.x, ctx.npc.y - 60, 'FROM COVER!', '#ffe08a'); ctx.sfx('crit'); }
      flush(ns);
    },

    playerTakenMult() {
      const now = ctx.scene.time.now;
      let m = ps.in ? hiddenMult : 1;
      if (now < ps.spottedUntil) m *= spottedMult;
      if (now < ns.primedUntil) m *= primedMult;
      return m;
    },
    npcTakenMult() {
      const now = ctx.scene.time.now;
      let m = ns.in ? hiddenMult : 1;
      if (now < ps.primedUntil) m *= primedMult;
      return m;
    },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const now = ctx.scene.time.now;
      if (now < ns.primedUntil) return null;
      if (ns.in) {
        // Settled: break cover toward you and take the shot.
        if (now - ns.since > SETTLE_MS + 900) {
          const a = Math.atan2(p.y - n.y, p.x - n.x);
          return { x: clamp(n.x + Math.cos(a) * 120, 60, W - 60), y: clamp(n.y + Math.sin(a) * 120, top + 40, H - 40) };
        }
        return { x: ns.in.x, y: ns.in.y + 6 };
      }
      let best: Hide | null = null, bd = Infinity;
      hides.forEach((h, i) => {
        if (i === falseIdx || !standing(h, now) || h === ps.in) return;
        if (dist(p.x, p.y, h.x, h.y) < 110) return;
        const d = dist(n.x, n.y, h.x, h.y);
        if (d < bd) { bd = d; best = h; }
      });
      const b = best as Hide | null;
      return b ? { x: b.x, y: b.y + 6 } : null;
    },

    drawGround(g, time) {
      const ts = time / 1000;
      // Reedbed tussocks round every stand, whether or not the hide is up.
      for (const h of hides) {
        g.fillStyle(0x4a5a26, 0.7); g.fillEllipse(h.x, h.y + 8, h.r * 3.2, h.r * 1.3);
        g.fillStyle(0x3a4a1e, 0.6); g.fillEllipse(h.x + 6, h.y + 10, h.r * 2.2, h.r * 0.8);
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 + h.seed;
          const bx = h.x + Math.cos(a) * h.r * 1.35, by = h.y + 8 + Math.sin(a) * h.r * 0.55;
          g.lineStyle(2, 0x9a8a46, 0.8); g.lineBetween(bx, by, bx + Math.sin(ts + k) * 2, by - 14);
        }
      }
      hides.forEach((h, i) => {
        if (!standing(h, time)) {
          // Flattened reeds lying where the hide stood, and a timer ring for its rebuilding.
          const since = time - h.dissolveAt;
          if (since < 600) {
            const k = since / 600;
            for (let j = 0; j < 14; j++) {
              const a = (j / 14) * Math.PI * 2 + h.seed;
              const r = h.r * (0.4 + k * 1.2);
              g.lineStyle(3, 0xb8a860, 1 - k); g.lineBetween(h.x + Math.cos(a) * r * 0.5, h.y + Math.sin(a) * r * 0.3, h.x + Math.cos(a) * r, h.y + Math.sin(a) * r * 0.5 - 20 * (1 - k));
            }
          }
          for (let j = 0; j < 9; j++) {
            const a = (j / 9) * Math.PI + h.seed;
            g.lineStyle(3, 0x8a7e3e, 0.7); g.lineBetween(h.x, h.y + 6, h.x + Math.cos(a) * h.r, h.y + 6 + Math.sin(a) * h.r * 0.25);
          }
          return;
        }
        reedHide(g, h.x, h.y + 6, h.r, ts + h.seed);
        // The lie: on the false hide the seed-heads shimmer, lilac, just off true.
        if (i === falseIdx) {
          const p = 0.35 + 0.25 * Math.sin(ts * 3.2);
          for (let k = 0; k < 6; k++) {
            const u = k / 5 - 0.5;
            g.fillStyle(0xc8b0ff, p); g.fillCircle(h.x + u * h.r * 1.8, h.y + 6 - h.r * 1.15 * (1 - u * u * 2.6) - 9, 2.2);
          }
        }
        if (time - shiftAt < 1200 && i === falseIdx) {
          const k = (time - shiftAt) / 1200;
          g.lineStyle(2, 0xd8c8ff, 0.6 * (1 - k)); g.strokeEllipse(h.x, h.y, h.r * (2.4 + k * 1.5), h.r * (1.2 + k));
        }
      });
    },

    drawAir(g, time) {
      const ts = time / 1000;
      // Reeds closing over whoever is inside — that is the "unseen".
      for (const [s, f, col] of [[ps, ctx.player, MINE_C], [ns, ctx.npc, FOE_C]] as const) {
        if (!s.in || !alive(f)) continue;
        reedHide(g, s.in.x, s.in.y + 10, s.in.r * 1.05, ts + s.in.seed, 0.94, true);
        const settled = clamp((time - s.since) / SETTLE_MS, 0, 1);
        g.lineStyle(2, col, 0.5);
        g.beginPath(); g.arc(s.in.x, s.in.y - s.in.r * 1.5, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * settled, false); g.strokePath();
        // Linger clock: the reeds start to lean apart.
        const lk = clamp((time - s.since) / lingerMs, 0, 1);
        if (lk > 0.6) { g.lineStyle(2, 0xffe08a, (lk - 0.6) * 2); g.strokeEllipse(s.in.x, s.in.y, s.in.r * 2.6, s.in.r * 1.3); }
      }
      // The ambusher's mark: a nocked-arrow glint over whoever is primed.
      for (const [s, f] of [[ps, ctx.player], [ns, ctx.npc]] as const) {
        if (time >= s.primedUntil || !alive(f)) continue;
        const k = (s.primedUntil - time) / PRIME_MS;
        const x = f.x, y = f.y - 58;
        g.fillStyle(GILT, 0.9); g.fillTriangle(x - 5, y - 4, x + 5, y - 4, x, y + 5);
        g.lineStyle(2, 0xe8dcc0, 0.9); g.lineBetween(x, y - 4, x, y - 18);
        g.lineStyle(2, GILT, 0.8); g.beginPath(); g.arc(x, y - 6, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
      }
      if (time < ps.spottedUntil && alive(ctx.player)) {
        const p = ctx.player;
        g.lineStyle(2, 0xff7a4a, 0.6 + 0.3 * Math.sin(ts * 12)); g.strokeCircle(p.x, p.y, 30);
        g.lineBetween(p.x - 38, p.y, p.x - 24, p.y); g.lineBetween(p.x + 24, p.y, p.x + 38, p.y);
        g.lineBetween(p.x, p.y - 38, p.x, p.y - 24); g.lineBetween(p.x, p.y + 24, p.x, p.y + 38);
      }
    },

    drawHud(g, time) {
      const x = ctx.W / 2, y = top + 14;
      const hidden = !!ps.in;
      const primed = time < ps.primedUntil;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 60, y - 10, 120, 22, 6);
      // Three pips: hidden, settled, ambush ready.
      const pip = (px: number, on: boolean, col: number): void => {
        g.fillStyle(on ? col : 0x2a2a22, 1); g.fillCircle(px, y + 1, 6);
        g.lineStyle(1.5, 0x000000, 0.6); g.strokeCircle(px, y + 1, 6);
      };
      pip(x - 30, hidden, 0x9a8a46);
      pip(x, hidden && time - ps.since >= SETTLE_MS, 0xc8b860);
      pip(x + 30, primed, GILT);
    },
  };
}

export const HUNTING_BLINDS: GimmickDef = {
  id: GIM_BLINDS,
  rules: 'Inside a reed hide you are unseen and hit for a third; your first blow after leaving one strikes double. One hide is a lie.',
  make: makeBlinds,
};
