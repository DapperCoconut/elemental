import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { brandSigil, dim, glow, type G } from '../../../../../art/IsleArt';
import { BRAND, BRICK, BRICK_DARK, EMBER_DARK, EMBER_LIT, GLOW, IRON, KINDLE_GOLD, SLATE, SOOT } from '../palette';
import { alive, angDiff, clamp, dist, frameClock } from '../gimmicks/util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Every Window Watched — Corva Dace, the neighbour across the lamp lane, who in the King's telling
 * kept a candle in her window every night and a list of every hearth that dimmed.
 *
 * Six windows look into the room from the terrace walls. One by one their shutters creak open
 * (a warning, with a faint wedge on the cobbles), then a neighbour's candle throws a cone of
 * sight across the floor for a few seconds. Linger half a second in a watching cone and you are
 * *reported*: each report makes you take 15% more damage, fading one every seven seconds. At four
 * reports you are DENOUNCED — the tithe office's brand-stamp comes down where you stand.
 *
 * The windows report anyone. Corva is shadow and slips between the cones, but put her in one and
 * she is reported too; at four, the stamp falls on her. And the stamp lands on whoever is under
 * it — be denounced with her beside you and she takes it with you. Halfway down, she names you
 * herself: the cones turn to follow you (slower than you walk) and three windows watch at once.
 */

const ID = fallenId('hearth', 'every-window');
const OPEN_MS = 900;
const WATCH_MS = 2800;
const HALF = 0.27;
const REACH = 560;
const SEEN_S = 0.5;
const PER_REPORT = 0.15;
const DENOUNCE = 4;
const FADE_MS = 7000;
const STAMP_MS = 950;
const STAMP_R = 66;

interface Win { x: number; y: number; face: number; aim: number; openAt: number; until: number; seed: number }
interface Watched { f: Fighter; seen: number; reports: number; lastReport: number }
interface Stamp { x: number; y: number; at: number; on: Fighter }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const step = frameClock();
  const fy = (k: number) => top + (H - top) * k;
  const wins: Win[] = [
    { x: W * 0.2, y: top + 2, face: Math.PI / 2 }, { x: W * 0.5, y: top + 2, face: Math.PI / 2 }, { x: W * 0.8, y: top + 2, face: Math.PI / 2 },
    { x: 8, y: fy(0.42), face: 0 }, { x: 8, y: fy(0.82), face: 0 }, { x: W - 8, y: fy(0.6), face: Math.PI },
  ].map((w, i) => ({ ...w, aim: w.face, openAt: 0, until: 0, seed: i * 1.7 }));
  const pw: Watched = { f: player, seen: 0, reports: 0, lastReport: 0 };
  const nw: Watched = { f: npc, seen: 0, reports: 0, lastReport: 0 };
  const stamps: Stamp[] = [];
  let named = false;
  let nextOpen = 0;
  let started = false;

  const watching = (w: Win, time: number): boolean => w.openAt > 0 && time >= w.openAt + OPEN_MS && time < w.until;
  const opening = (w: Win, time: number): boolean => w.openAt > 0 && time >= w.openAt && time < w.openAt + OPEN_MS;
  const inCone = (w: Win, x: number, y: number): boolean => {
    const d = dist(w.x, w.y, x, y);
    return d < REACH && d > 10 && Math.abs(angDiff(Math.atan2(y - w.y, x - w.x), w.aim)) < HALF;
  };

  function report(s: Watched, time: number): void {
    s.reports++;
    s.lastReport = time;
    ctx.float(s.f.x, s.f.y - 56, s.reports >= DENOUNCE ? 'DENOUNCED' : 'REPORTED', s.f === player ? '#d8ccb0' : '#ffb070');
    ctx.sfx(s.reports >= DENOUNCE ? 'judgement' : 'hush');
    if (s.reports >= DENOUNCE) {
      s.reports = 0;
      stamps.push({ x: s.f.x, y: s.f.y, at: time + tk.warn(STAMP_MS), on: s.f });
    }
  }

  return {
    update(time) {
      const dt = step(time);
      if (!started) { started = true; nextOpen = time + 1500; }
      if (!named && npc.hp < npc.maxHp * 0.5) {
        named = true;
        ctx.banner('SHE NAMES YOU HERSELF', '#ffb070');
        ctx.sfx('curse-cast');
      }
      const max = named ? 3 : 2;
      const open = wins.filter((w) => w.openAt && time < w.until).length;
      if (time >= nextOpen && open < max) {
        nextOpen = time + (named ? 1700 : 2300);
        const shut = wins.filter((w) => !w.openAt || time >= w.until);
        const w = shut[Math.floor(rng() * shut.length)];
        if (w) {
          w.openAt = time; w.until = time + OPEN_MS + WATCH_MS;
          // It looks where you stood when the shutters opened, but no wider than the frame allows.
          const want = Math.atan2(player.y - w.y, player.x - w.x);
          w.aim = w.face + clamp(angDiff(want, w.face), -1.05, 1.05);
          ctx.sfx('gear-turn');
        }
      }
      for (const w of wins) {
        if (named && watching(w, time)) {
          const want = w.face + clamp(angDiff(Math.atan2(player.y - w.y, player.x - w.x), w.face), -1.05, 1.05);
          w.aim += clamp(angDiff(want, w.aim), -0.3 * dt, 0.3 * dt);
        }
      }
      for (const s of [pw, nw]) {
        if (!alive(s.f)) continue;
        const seen = wins.some((w) => watching(w, time) && inCone(w, s.f.x, s.f.y));
        s.seen = seen ? s.seen + dt : 0;
        if (s.seen >= SEEN_S) { s.seen = 0; report(s, time); }
        if (s.reports > 0 && time - s.lastReport > FADE_MS) { s.reports--; s.lastReport = time; }
      }
      for (let i = stamps.length - 1; i >= 0; i--) {
        const st = stamps[i];
        if (time < st.at) continue;
        stamps.splice(i, 1);
        tk.boom(st.x, st.y, STAMP_R, BRAND);
        ctx.sfx('hammer-forge');
        if (alive(player) && dist(player.x, player.y, st.x, st.y) < STAMP_R) { tk.hitPlayer(24, st.x, st.y); ctx.stun(player, 700); }
        if (alive(npc) && dist(npc.x, npc.y, st.x, st.y) < STAMP_R) { ctx.hit(npc, 34, st.x, st.y); ctx.stun(npc, 900); }
      }
    },

    playerTakenMult: () => 1 + pw.reports * PER_REPORT,
    npcTakenMult: () => 1 + nw.reports * PER_REPORT,

    npcSeek() {
      if (!alive(player)) return null;
      // Out from under every stamp first.
      for (const st of stamps) {
        if (dist(npc.x, npc.y, st.x, st.y) < STAMP_R + 20) {
          const a = Math.atan2(npc.y - st.y, npc.x - st.x);
          return { x: tk.clampX(st.x + Math.cos(a) * (STAMP_R + 60)), y: tk.clampY(st.y + Math.sin(a) * (STAMP_R + 60)) };
        }
      }
      // Then a shadow near you that no window can see.
      const t = tk.now;
      let best: { x: number; y: number } | null = null;
      let bd = 1e9;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const x = tk.clampX(player.x + Math.cos(a) * 150), y = tk.clampY(player.y + Math.sin(a) * 150);
        if (wins.some((w) => (watching(w, t) || opening(w, t)) && inCone(w, x, y))) continue;
        const d = dist(npc.x, npc.y, x, y);
        if (d < bd) { bd = d; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      for (const w of wins) {
        if (!w.openAt || time >= w.until) continue;
        const live = watching(w, time);
        const k = live ? 1 : clamp((time - w.openAt) / OPEN_MS, 0, 1) * 0.35;
        drawCone(g, w, k, live, time);
      }
      for (const st of stamps) {
        const k = clamp(1 - (st.at - time) / tk.warn(STAMP_MS), 0, 1);
        g.fillStyle(SOOT, 0.25 + k * 0.3); g.fillCircle(st.x, st.y, STAMP_R);
        g.lineStyle(3, BRAND, 0.5 + k * 0.5); g.strokeCircle(st.x, st.y, STAMP_R);
        brandSigil(g, st.x, st.y, STAMP_R * 0.55 * (0.6 + k * 0.4), BRAND, 0.3 + k * 0.5);
      }
    },

    drawAir(g, time) {
      for (const w of wins) drawWindow(g, w, time, opening(w, time) || watching(w, time) ? clamp((time - w.openAt) / OPEN_MS, 0, 1) : 0);
      for (const st of stamps) {
        // The office stamp: an iron die on a long haft, coming down.
        const k = clamp(1 - (st.at - time) / tk.warn(STAMP_MS), 0, 1);
        const h = (1 - k) * 220 + 10;
        g.fillStyle(0x3a2c20, 1); g.fillRect(st.x - 4, st.y - h - 120, 8, 110);
        g.fillStyle(IRON, 1); g.fillRect(st.x - 30, st.y - h - 14, 60, 18);
        g.fillStyle(0x4a4440, 1); g.fillRect(st.x - 26, st.y - h - 12, 52, 4);
        g.fillStyle(BRAND, 0.6 + k * 0.4); g.fillRect(st.x - 24, st.y - h + 2, 48, 4);
      }
      for (const s of [pw, nw]) {
        if (!alive(s.f) || (!s.reports && !s.seen)) continue;
        for (let i = 0; i < DENOUNCE; i++) drawEye(g, s.f.x - 27 + i * 18, s.f.y - 62, i < s.reports, i === s.reports && s.seen > 0 ? s.seen / SEEN_S : 0);
      }
    },

    drawHud(g, time) {
      const y = top + 16;
      const tally = (x: number, s: Watched, col: number) => {
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 8, y - 12, 96, 24, 6);
        g.fillStyle(col, 1); g.fillCircle(x + 2, y, 5);
        for (let i = 0; i < DENOUNCE; i++) drawEye(g, x + 22 + i * 18, y, i < s.reports, 0);
      };
      tally(W / 2 - 110, pw, 0xd8ccb0);
      tally(W / 2 + 24, nw, BRAND);
      if (named) { g.fillStyle(KINDLE_GOLD, 0.6 + Math.sin(time / 200) * 0.3); g.fillCircle(W / 2, y, 4); }
    },
  };
}

/** A small eye glyph — a report against someone; filling while a window is still looking. */
function drawEye(g: G, x: number, y: number, on: boolean, filling: number): void {
  g.fillStyle(0x000000, 0.55); g.fillEllipse(x, y, 16, 10);
  g.lineStyle(1.5, on ? EMBER_LIT : 0x6a625c, 1); g.strokeEllipse(x, y, 14, 8);
  if (on) { g.fillStyle(GLOW, 1); g.fillCircle(x, y, 2.6); }
  else if (filling > 0) { g.fillStyle(EMBER_LIT, filling); g.fillCircle(x, y, 2.6 * filling); }
}

/** Candlelight from a window: a wedge laid on the cobbles, brighter near the sill, dust in it. */
function drawCone(g: G, w: Win, k: number, live: boolean, time: number): void {
  for (let band = 0; band < 4; band++) {
    const r = REACH * (1 - band * 0.22);
    const pts = [{ x: w.x, y: w.y }];
    for (let i = 0; i <= 10; i++) {
      const a = w.aim - HALF + (2 * HALF * i) / 10;
      pts.push({ x: w.x + Math.cos(a) * r, y: w.y + Math.sin(a) * r });
    }
    g.fillStyle(live ? GLOW : KINDLE_GOLD, (live ? 0.05 : 0.04) * k * (band + 1));
    g.fillPoints(pts, true);
  }
  g.lineStyle(1.5, live ? EMBER_LIT : KINDLE_GOLD, 0.5 * k);
  for (const s of [-1, 1]) {
    const a = w.aim + s * HALF;
    g.lineBetween(w.x, w.y, w.x + Math.cos(a) * REACH, w.y + Math.sin(a) * REACH);
  }
  if (!live) return;
  for (let i = 0; i < 9; i++) {
    const ph = ((time / 2600) + i / 9 + w.seed) % 1;
    const a = w.aim + Math.sin(i * 2.3 + w.seed) * HALF * 0.8;
    const r = 60 + ph * (REACH - 80);
    g.fillStyle(0xfff0c8, 0.5 * (1 - ph)); g.fillCircle(w.x + Math.cos(a) * r, w.y + Math.sin(a) * r + Math.sin(time / 500 + i) * 4, 1.4);
  }
}

/** A terrace window in its brick surround: shutters swinging, a candle, the neighbour peering. */
function drawWindow(g: G, w: Win, time: number, open: number): void {
  const horiz = Math.abs(Math.sin(w.face)) > 0.5;
  const cx = w.x, cy = w.y;
  const bw = horiz ? 64 : 22, bh = horiz ? 22 : 64;
  g.fillStyle(BRICK_DARK, 1); g.fillRect(cx - bw / 2 - 6, cy - bh / 2 - 6, bw + 12, bh + 12);
  for (let i = 0; i < 6; i++) {
    g.fillStyle(i % 2 ? BRICK : dim(BRICK, 0.12), 1);
    if (horiz) g.fillRect(cx - bw / 2 - 6 + i * ((bw + 12) / 6), cy - bh / 2 - 6, (bw + 12) / 6 - 1, 5);
    else g.fillRect(cx - bw / 2 - 6, cy - bh / 2 - 6 + i * ((bh + 12) / 6), 5, (bh + 12) / 6 - 1);
  }
  g.fillStyle(SOOT, 1); g.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
  if (open > 0) {
    const flick = 0.8 + Math.sin(time / 70 + w.seed) * 0.15;
    g.fillStyle(EMBER_DARK, 1); g.fillRect(cx - bw / 2 + 2, cy - bh / 2 + 2, bw - 4, bh - 4);
    g.fillStyle(GLOW, open * flick); g.fillRect(cx - bw / 2 + 4, cy - bh / 2 + 4, bw - 8, bh - 8);
    // The neighbour: a head and shoulders against the candle, leaning in.
    const lean = Math.sin(time / 900 + w.seed) * 2;
    g.fillStyle(0x1a1412, open);
    if (horiz) { g.fillCircle(cx + 10 + lean, cy - 2, 6); g.fillRect(cx + 2 + lean, cy + 3, 16, 6); }
    else { g.fillCircle(cx, cy + 10 + lean, 6); g.fillRect(cx - 5, cy + 2 + lean, 10, 4); }
    g.fillStyle(EMBER_LIT, open); g.fillCircle(horiz ? cx - 16 : cx, horiz ? cy : cy - 16, 2.5);
    glow(g, cx, cy, 40, GLOW, 0.05 * open, 3);
  }
  // Shutters: two slatted leaves folding back as it opens.
  const leaf = (sgn: number) => {
    const sw = (horiz ? bw / 2 : bh / 2) * (1 - open * 0.85);
    g.fillStyle(SLATE, 1);
    if (horiz) {
      const x0 = sgn < 0 ? cx - bw / 2 : cx + bw / 2 - sw;
      g.fillRect(x0, cy - bh / 2, sw, bh);
      g.lineStyle(1, dim(SLATE, 0.4), 1); for (let s = 1; s < 4; s++) g.lineBetween(x0, cy - bh / 2 + s * bh / 4, x0 + sw, cy - bh / 2 + s * bh / 4);
    } else {
      const y0 = sgn < 0 ? cy - bh / 2 : cy + bh / 2 - sw;
      g.fillRect(cx - bw / 2, y0, bw, sw);
      g.lineStyle(1, dim(SLATE, 0.4), 1); for (let s = 1; s < 4; s++) g.lineBetween(cx - bw / 2 + s * bw / 4, y0, cx - bw / 2 + s * bw / 4, y0 + sw);
    }
  };
  leaf(-1); leaf(1);
  g.fillStyle(IRON, 1);
  if (horiz) g.fillRect(cx - bw / 2 - 8, cy + bh / 2 + 4, bw + 16, 4); else g.fillRect(w.face === 0 ? cx + bw / 2 + 4 : cx - bw / 2 - 8, cy - bh / 2 - 8, 4, bh + 16);
}

export const FALLEN_EVERY_WINDOW: GimmickDef = {
  id: ID,
  rules: 'Windows open and watch in cones. Stay in one and you are reported (+15% damage taken each); at 4, a brand-stamp falls. The windows report her too.',
  make,
};
