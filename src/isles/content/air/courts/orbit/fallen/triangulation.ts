import type { Fighter } from '../gimmicks/shared';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { live } from '../gimmicks/shared';
import { glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { BRASS, BRASS_DARK, BRASS_LIT, ENAMEL, IRON_DARK, LODE_GLINT, LODE_WASH, METER, NAVY_DARK, VERD_LIT, WHITE } from '../palette';
import { dist } from '../orbitArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * Triangulated — Surveyor Euphemia Plumb, in the King's telling the woman who fixed every
 * debtor's house in the sky by triangulation off the moon, and certified, to the link, how much
 * lower it hung than last month.
 *
 * Three crystal theodolites stand on brass tripods about the yard. The ground between them is
 * the survey: a triangle chalked from foot to foot. Every few seconds she takes a reading — the
 * three crystal heads sight on one another, the triangle fills with hatching — and whoever is
 * inside it when the reading closes is CERTIFIED: crushed where they stand and held there.
 * After each reading the station farthest from you is picked up and set down again near you,
 * so the survey keeps closing round wherever you go.
 *
 * The tripods are things you can STRIKE: a blow knocks one a long stride away from whoever
 * struck it, and the whole triangle swings with it — off you, and over her. At half health
 * she moves two stations a reading. The bot steps out of a closing triangle and, when it can,
 * stands behind the station nearest you to knock it over your head.
 */

const ID = fallenId('orbit', 'survey');
const IDLE_MS = 3200;
const READ_MS = 2400;
const HOP_MS = 800;
const KNOCK = 72;
const MIN_GAP = 170;

/** One survey station: where its feet are, where it is hopping to, and its strike handle. */
interface Station { x: number; y: number; hopFrom: Pt | null; hopTo: Pt | null; hopAt: number; target: StrikeTarget | null; lastKnock: number; shake: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const cx = (x: number): number => Math.max(60, Math.min(W - 60, x));
  const cy = (y: number): number => Math.max(top + 50, Math.min(H - 40, y));
  const st: Station[] = [
    { x: W * 0.28, y: top + 120 }, { x: W * 0.72, y: top + 140 }, { x: W * 0.5, y: H - 110 },
  ].map((p) => ({ ...p, hopFrom: null, hopTo: null, hopAt: 0, target: null, lastKnock: -9999, shake: 0 }));
  let reading = false;
  let phaseAt = 0;
  let started = false;
  let now = 0;
  let two = false;
  let certified = 0;

  const corners = (): Pt[] => st.map((s) => ({ x: s.x, y: s.y }));
  const side = (p: Pt, a: Pt, b: Pt): number => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  const inside = (f: Fighter): boolean => {
    const [a, b, c] = corners();
    const d1 = side(f, a, b), d2 = side(f, b, c), d3 = side(f, c, a);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };
  const readMs = (): number => (two ? 1900 : READ_MS);

  function knock(s: Station, who: 'player' | 'npc'): void {
    if (s.hopTo || now - s.lastKnock < 300) return;
    s.lastKnock = now;
    s.shake = now;
    const f = who === 'player' ? player : npc;
    const a = Math.atan2(s.y - f.y, s.x - f.x);
    s.x = cx(s.x + Math.cos(a) * KNOCK);
    s.y = cy(s.y + Math.sin(a) * KNOCK);
    s.target?.moveTo(s.x, s.y - 34);
    ctx.sfx('crystal-chime');
  }

  /** Pick the station farthest from you up and set it down near you, clear of the other two. */
  function resite(s: Station): void {
    let best: Pt = { x: s.x, y: s.y };
    for (let i = 0; i < 8; i++) {
      const a = rng() * Math.PI * 2, r = 150 + rng() * 60;
      const p = { x: cx(player.x + Math.cos(a) * r), y: cy(player.y + Math.sin(a) * r * 0.8) };
      if (st.every((o) => o === s || dist(o.x, o.y, p.x, p.y) > MIN_GAP)) { best = p; break; }
    }
    s.hopFrom = { x: s.x, y: s.y };
    s.hopTo = best;
    s.hopAt = now;
    ctx.sfx('whoosh');
  }

  for (const s of st) s.target = ctx.target({ x: s.x, y: s.y - 34, r: 20, onStruck: (who) => knock(s, who) });

  return {
    update(time) {
      now = time;
      if (!started) { started = true; phaseAt = time; }
      if (!two && npc.hp < npc.maxHp * 0.5) { two = true; ctx.banner('TWO STATIONS MOVE EACH READING', '#d8ceff'); ctx.sfx('prism'); }
      for (const s of st) {
        if (!s.hopTo || !s.hopFrom) continue;
        const k = (time - s.hopAt) / HOP_MS;
        if (k >= 1) { s.x = s.hopTo.x; s.y = s.hopTo.y; s.hopTo = null; s.hopFrom = null; ctx.sfx('land'); }
        else { s.x = s.hopFrom.x + (s.hopTo.x - s.hopFrom.x) * k; s.y = s.hopFrom.y + (s.hopTo.y - s.hopFrom.y) * k; }
        s.target?.moveTo(s.x, s.y - 34);
      }
      const k = time - phaseAt;
      if (!reading && k >= IDLE_MS) { reading = true; phaseAt = time; ctx.sfx('beam-charge'); }
      else if (reading && k >= readMs()) {
        reading = false;
        phaseAt = time;
        ctx.sfx('crystal-shatter');
        if (live(player) && inside(player)) { tk.hitPlayer(18, player.x, player.y); ctx.root(player, 900); certified++; }
        if (live(npc) && inside(npc)) { ctx.hit(npc, 26, npc.x, npc.y); ctx.root(npc, 1200); ctx.float(npc.x, npc.y - 50, 'CERTIFIED', '#8ad6c1'); }
        if (live(player)) {
          const order = [...st].sort((a, b) => dist(b.x, b.y, player.x, player.y) - dist(a.x, a.y, player.x, player.y));
          resite(order[0]);
          if (two) resite(order[1]);
        }
      }
    },

    npcSeek() {
      if (!live(npc) || !live(player)) return null;
      const c = corners();
      if (inside(npc)) {
        // Out through the nearest edge, a stride past the chalk.
        let best: Pt = { x: npc.x, y: npc.y }, bd = Infinity;
        for (let i = 0; i < 3; i++) {
          const a = c[i], b = c[(i + 1) % 3];
          const dx = b.x - a.x, dy = b.y - a.y;
          const t = Math.max(0, Math.min(1, ((npc.x - a.x) * dx + (npc.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
          const p = { x: a.x + dx * t, y: a.y + dy * t };
          const d = dist(npc.x, npc.y, p.x, p.y);
          if (d < bd) { bd = d; best = p; }
        }
        const a = Math.atan2(best.y - npc.y, best.x - npc.x);
        return { x: cx(best.x + Math.cos(a) * 60), y: cy(best.y + Math.sin(a) * 60) };
      }
      if (!inside(player)) {
        const v = [...st].sort((a, b) => dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y))[0];
        if (!v.hopTo && dist(npc.x, npc.y, v.x, v.y) < 280) {
          const a = Math.atan2(v.y - player.y, v.x - player.x);
          return { x: cx(v.x + Math.cos(a) * 40), y: cy(v.y + Math.sin(a) * 40) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      const c = corners();
      const k = reading ? Math.min(1, (time - phaseAt) / readMs()) : 0;
      // The survey: hatching that fills the triangle as the reading closes.
      g.fillStyle(reading ? LODE_GLINT : BRASS_LIT, reading ? 0.06 + k * 0.18 : 0.04);
      g.fillTriangle(c[0].x, c[0].y, c[1].x, c[1].y, c[2].x, c[2].y);
      if (reading) {
        const minX = Math.min(c[0].x, c[1].x, c[2].x), maxX = Math.max(c[0].x, c[1].x, c[2].x);
        const n = Math.floor(((maxX - minX) / 18) * k);
        for (let i = 0; i < n; i++) {
          const x = minX + i * 18;
          const ys: number[] = [];
          for (let e = 0; e < 3; e++) {
            const a = c[e], b = c[(e + 1) % 3];
            if ((x - a.x) * (x - b.x) <= 0 && a.x !== b.x) ys.push(a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y));
          }
          if (ys.length >= 2) { g.lineStyle(1, LODE_WASH, 0.35); g.lineBetween(x, Math.min(...ys), x + 10, Math.max(...ys)); }
        }
      }
      // Chalk lines foot to foot, dashed, and the angle arcs read at every station.
      for (let e = 0; e < 3; e++) {
        const a = c[e], b = c[(e + 1) % 3], p = c[(e + 2) % 3];
        const len = dist(a.x, a.y, b.x, b.y), steps = Math.floor(len / 16);
        g.lineStyle(2, reading ? lit(LODE_GLINT, 0.3) : ENAMEL, reading ? 0.6 + k * 0.4 : 0.55);
        for (let i = 0; i < steps; i += 2) {
          const t0 = i / steps, t1 = Math.min(1, (i + 1) / steps);
          g.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
        }
        const a0 = Math.atan2(b.y - a.y, b.x - a.x), a1 = Math.atan2(p.y - a.y, p.x - a.x);
        let d = a1 - a0;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        g.lineStyle(1.5, BRASS_LIT, 0.7);
        g.beginPath(); g.arc(a.x, a.y, 34, Math.min(a0, a0 + d), Math.max(a0, a0 + d), false); g.strokePath();
        for (let t = 1; t < 5; t++) { const aa = a0 + (d * t) / 5; g.lineBetween(a.x + Math.cos(aa) * 30, a.y + Math.sin(aa) * 30, a.x + Math.cos(aa) * 38, a.y + Math.sin(aa) * 38); }
      }
      for (const s of st) if (s.hopTo) {
        const hk = (time - s.hopAt) / HOP_MS;
        g.lineStyle(2, METER, 0.4 + hk * 0.5); g.strokeEllipse(s.hopTo.x, s.hopTo.y, 44, 16);
      }
    },

    drawAir(g, time) {
      const k = reading ? Math.min(1, (time - phaseAt) / readMs()) : 0;
      // Sight-lines: crystal head to crystal head, flickering brighter as the reading closes.
      if (reading) {
        for (let e = 0; e < 3; e++) {
          const a = st[e], b = st[(e + 1) % 3];
          if (a.hopTo || b.hopTo) continue;
          const fl = 0.35 + k * 0.5 + Math.sin(time / 40 + e) * 0.1;
          g.lineStyle(3, VERD_LIT, fl * 0.5); g.lineBetween(a.x, a.y - 52, b.x, b.y - 52);
          g.lineStyle(1, WHITE, fl); g.lineBetween(a.x, a.y - 52, b.x, b.y - 52);
        }
      }
      for (const s of st) {
        const hop = s.hopTo ? Math.sin(Math.min(1, (time - s.hopAt) / HOP_MS) * Math.PI) * 70 : 0;
        const sh = time - s.shake < 260 ? Math.sin(time / 20) * 3 : 0;
        drawTheodolite(g, s.x + sh, s.y, hop, reading ? k : 0, time);
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 18;
      const k = reading ? Math.min(1, (time - phaseAt) / readMs()) : Math.min(1, (time - phaseAt) / IDLE_MS);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 60, y - 13, 120, 26, 7);
      // A tiny survey triangle filling with the reading.
      g.lineStyle(2, reading ? LODE_GLINT : BRASS, 1); g.strokeTriangle(x - 46, y + 8, x - 22, y + 8, x - 34, y - 9);
      if (reading) { g.fillStyle(LODE_WASH, 0.8 * k); g.fillTriangle(x - 46, y + 8, x - 22, y + 8, x - 34, y - 9); }
      g.fillStyle(IRON_DARK, 1); g.fillRect(x - 12, y - 3, 64, 6);
      g.fillStyle(reading ? METER : BRASS_LIT, 1); g.fillRect(x - 12, y - 3, 64 * k, 6);
      for (let i = 0; i < Math.min(5, certified); i++) { g.fillStyle(METER, 1); g.fillRect(x - 12 + i * 8, y + 6, 5, 3); }
    },

    destroy() { for (const s of st) s.target?.remove(); },
  };
}

/**
 * A survey station: three splayed brass legs with iron shoes, a brass drum, and a crystal sighting
 * head with a short brass telescope — the crystal glowing violet-white while a reading is taken.
 */
function drawTheodolite(g: G, x: number, y: number, hop: number, k: number, time: number): void {
  shadow(g, x, y + 2, 40 - hop * 0.2, 12, 0.3);
  const hy = y - hop;
  const splay = hop > 0 ? 6 : 16;
  for (const [dx, dy] of [[-splay, 2], [splay, 2], [0, -6]]) {
    g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(x + dx, hy + dy, x, hy - 38);
    g.lineStyle(1.5, BRASS_LIT, 0.7); g.lineBetween(x + dx * 0.8, hy + dy - 4, x, hy - 36);
    g.fillStyle(IRON_DARK, 1); g.fillRect(x + dx - 2, hy + dy - 2, 4, 4);
  }
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 9, hy - 44, 18, 7);
  g.fillStyle(BRASS, 1); g.fillRect(x - 8, hy - 43, 16, 3);
  for (let i = 0; i < 4; i++) { g.fillStyle(NAVY_DARK, 0.8); g.fillRect(x - 7 + i * 4, hy - 39, 1, 2); }
  // The crystal head: a cut prism, lit face and shadowed face.
  if (k > 0) glow(g, x, hy - 52, 30, LODE_GLINT, 0.05 + k * 0.05, 3);
  const q = 0xbfe8e0, qd = 0x6fa89c;
  g.fillStyle(qd, 1); g.fillTriangle(x - 9, hy - 46, x, hy - 62, x, hy - 46);
  g.fillStyle(q, 1); g.fillTriangle(x + 9, hy - 46, x, hy - 62, x, hy - 46);
  g.fillStyle(lit(q, 0.5), 0.8); g.fillTriangle(x + 2, hy - 48, x, hy - 58, x + 5, hy - 48);
  g.fillStyle(k > 0 ? LODE_WASH : WHITE, k > 0 ? 0.5 + k * 0.5 : 0.4 + Math.sin(time / 300) * 0.2); g.fillCircle(x, hy - 53, 2.2);
  // The sighting tube along the side.
  g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(x + 8, hy - 50, x + 20, hy - 54);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x + 20, hy - 54, 2);
}

export const FALLEN_SURVEY: GimmickDef = {
  id: ID,
  rules: 'Three crystal tripods chalk a triangle; when the reading closes, whoever is inside is crushed and held. Strike a tripod to swing the survey onto her.',
  make,
};
