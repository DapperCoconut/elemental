import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { bolt, sparks } from '../art';
import {
  ARC, ARC_VIOLET, BRASS, BRASS_DARK, BRASS_LIT, CHALK, COPPER, COPPER_DARK, COPPER_LIT, INSULATOR, INSULATOR_LIT, IRON,
  IRON_DARK, OFF_RED, SPARK,
} from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * The Singing Gap — Gapwarden Linnet Sorrowby of the Switchyard, who tends the horn-gap arrester
 * that stands between the yard and the overhead lines. When the Grid is overdriven the arc in the
 * gap climbs the horns and *sings*, a note for every surge. In the King's telling Linnet tuned it,
 * so that the whole court could hear which streets were to be switched off that night.
 *
 * The arrester stands in the middle of the yard and sings a phrase. Each note throws a streamer
 * down one of eight compass lines from the horns: high notes north, low notes south, the rest round
 * the dial — the HUD writes the phrase on a stave, each note with a needle-stem pointing down its
 * line, and a marker walks along it as it plays. Each note's line glows on the setts before it fires.
 * The phrase repeats, a note longer each time, until the arrester tires of it and sings a new one.
 * Learn the tune and walk between its lines.
 *
 * Strike the arrester and the next note is sung *at your foe* — its streamer goes down the line to
 * wherever the other fighter stands. Halfway down, every note sounds its octave as well, and the
 * streamer goes out both ways.
 */

const ID = fallenId('dynamo', 'singing-gap');
const NOTE_MS = 560;
const WARN_MS = 660;
const FIRE_MS = 220;
const REST_MS = 1500;
const HALF_W = 24;
const RAY_LEN = 620;
const DMG = 14;
const STRIKE_CD = 3500;

/** Direction index → angle; 0 is north (the top note), going clockwise. */
const dirAngle = (k: number): number => -Math.PI / 2 + (k * Math.PI) / 4;
/** Direction index → stave height (0 bottom … 4 top): north highest, south lowest. */
const pitchOf = (k: number): number => 4 - Math.min(k, 8 - k);

interface Ray { a: number; at: number; fireAt: number; done: boolean; aimed: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const c: Pt = { x: W / 2, y: (top + H) / 2 + 10 };
  const newPhrase = (n: number) => Array.from({ length: n }, () => Math.floor(ctx.rng() * 8));
  let phrase = newPhrase(4);
  let idx = 0;
  let nextNote = -1;
  const rays: Ray[] = [];
  let aimedBy: 'player' | 'npc' | null = null;
  let strikeReady = 0;
  let octave = false;
  let aimedNote = -1;

  const fighterOf = (s: 'player' | 'npc'): Fighter => (s === 'player' ? player : npc);

  function onRay(p: Pt, a: number): boolean {
    const ux = Math.cos(a), uy = Math.sin(a);
    const wx = p.x - c.x, wy = p.y - c.y;
    const along = wx * ux + wy * uy;
    return along > -10 && along < RAY_LEN && Math.abs(wx * uy - wy * ux) < HALF_W + 18;
  }

  function sing(time: number): void {
    const k = phrase[idx];
    let a = dirAngle(k);
    let aimed = false;
    if (aimedBy) {
      const t = fighterOf(aimedBy === 'player' ? 'npc' : 'player');
      if (alive(t)) { a = Math.atan2(t.y - c.y, t.x - c.x); aimed = true; aimedNote = idx; }
      aimedBy = null;
    }
    rays.push({ a, at: time, fireAt: time + WARN_MS, done: false, aimed });
    if (octave) rays.push({ a: a + Math.PI, at: time, fireAt: time + WARN_MS, done: false, aimed });
    ctx.sfx(pitchOf(k) >= 3 ? 'crystal-chime' : pitchOf(k) >= 2 ? 'sonic-pulse' : 'drum-hit');
    idx++;
    if (idx >= phrase.length) {
      idx = 0;
      aimedNote = -1;
      phrase = phrase.length >= 7 ? newPhrase(4) : [...phrase, Math.floor(ctx.rng() * 8)];
      nextNote = time + REST_MS;
    } else nextNote = time + NOTE_MS;
  }

  const horns = ctx.target({
    x: c.x, y: c.y - 30, r: 30,
    onStruck(by) {
      if (tk.now < strikeReady) return;
      strikeReady = tk.now + STRIKE_CD;
      aimedBy = by;
      ctx.float(c.x, c.y - 90, by === 'player' ? 'NEXT NOTE: HER' : 'NEXT NOTE: YOU', by === 'player' ? '#bff0ff' : '#ffb0a0');
      ctx.sfx('prism');
    },
  });

  return {
    update(time) {
      if (nextNote < 0) { nextNote = time + 1600; aimedNote = -1; }
      if (!octave && npc.hp < npc.maxHp * 0.5) {
        octave = true;
        ctx.banner('Every note sounds its octave now — the streamers go both ways', '#d0c0ff');
      }
      if (time >= nextNote && alive(player) && alive(npc)) sing(time);
      for (const r of rays) {
        if (r.done || time < r.fireAt) continue;
        r.done = true;
        for (const f of [player, npc]) {
          if (!alive(f) || !onRay(f, r.a)) continue;
          if (f === player) tk.hitPlayer(DMG, f.x, f.y); else ctx.hit(f, DMG, f.x, f.y);
        }
        ctx.sfx('zap');
      }
      for (let i = rays.length - 1; i >= 0; i--) if (rays[i].done && time - rays[i].fireAt > FIRE_MS) rays.splice(i, 1);
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Lines about to fire, and the next two notes' lines.
      const danger: number[] = rays.filter((r) => !r.done).map((r) => r.a);
      for (let j = 0; j < 2 && j + idx < phrase.length; j++) {
        const a = dirAngle(phrase[idx + j]);
        danger.push(a); if (octave) danger.push(a + Math.PI);
      }
      const safe = (p: Pt) => !danger.some((a) => onRay(p, a));
      // Worth a strike: near the horns with the strike ready, and the spot beside them is clear.
      if (tk.now >= strikeReady && dist(npc.x, npc.y, c.x, c.y) < 280) {
        for (let k = 0; k < 8; k++) {
          const a = dirAngle(k) + Math.PI / 8;
          const p = { x: c.x + Math.cos(a) * 90, y: c.y + Math.sin(a) * 90 };
          if (safe(p)) return p;
        }
      }
      if (safe(npc) && !danger.length) return null;
      const spots: Pt[] = [];
      for (let k = 0; k < 8; k++) for (const r of [170, 260]) {
        const a = dirAngle(k) + Math.PI / 8;
        spots.push({ x: clamp(c.x + Math.cos(a) * r * 1.25, 50, W - 50), y: clamp(c.y + Math.sin(a) * r * 0.8, top + 40, H - 40) });
      }
      const ok = spots.filter(safe).sort((p, q) => dist(p.x, p.y, npc.x, npc.y) - dist(q.x, q.y, npc.x, npc.y));
      return ok[0] ?? null;
    },

    drawGround(g, time) {
      // Eight brass compass studs round the arrester, one per line, each with its note engraved.
      for (let k = 0; k < 8; k++) {
        const a = dirAngle(k);
        const sx = c.x + Math.cos(a) * 74, sy = c.y + Math.sin(a) * 74 * 0.6;
        g.lineStyle(1, BRASS_DARK, 0.35); g.lineBetween(c.x + Math.cos(a) * 90, c.y + Math.sin(a) * 90, c.x + Math.cos(a) * 470, c.y + Math.sin(a) * 470);
        g.fillStyle(BRASS_DARK, 1); g.fillEllipse(sx, sy, 22, 12);
        g.fillStyle(BRASS, 1); g.fillEllipse(sx, sy - 1, 19, 10);
        const p = pitchOf(k);
        for (let l = 0; l < 3; l++) { g.lineStyle(0.6, BRASS_DARK, 0.9); g.lineBetween(sx - 7, sy - 3 + l * 2.5, sx + 7, sy - 3 + l * 2.5); }
        g.fillStyle(0x1a1408, 1); g.fillEllipse(sx, sy + 2.5 - p * 1.5, 4, 3);
      }
      // Warned lines glow on the setts, filling toward the edge; fired ones flash.
      for (const r of rays) {
        const ux = Math.cos(r.a), uy = Math.sin(r.a), nx = -uy, ny = ux;
        const k = clamp((time - r.at) / WARN_MS, 0, 1);
        const col = r.aimed ? OFF_RED : ARC_VIOLET;
        if (!r.done) {
          g.fillStyle(col, 0.08 + k * 0.12);
          g.beginPath();
          g.moveTo(c.x + nx * HALF_W, c.y + ny * HALF_W); g.lineTo(c.x + ux * RAY_LEN + nx * HALF_W, c.y + uy * RAY_LEN + ny * HALF_W);
          g.lineTo(c.x + ux * RAY_LEN - nx * HALF_W, c.y + uy * RAY_LEN - ny * HALF_W); g.lineTo(c.x - nx * HALF_W, c.y - ny * HALF_W);
          g.closePath(); g.fillPath();
          g.lineStyle(2, col, 0.4 + k * 0.5);
          g.lineBetween(c.x + nx * HALF_W, c.y + ny * HALF_W, c.x + ux * RAY_LEN * k + nx * HALF_W, c.y + uy * RAY_LEN * k + ny * HALF_W);
          g.lineBetween(c.x - nx * HALF_W, c.y - ny * HALF_W, c.x + ux * RAY_LEN * k - nx * HALF_W, c.y + uy * RAY_LEN * k - ny * HALF_W);
        }
      }
      drawArrester(g, c.x, c.y, time, tk.now >= strikeReady);
    },

    drawAir(g, time) {
      for (const r of rays) {
        if (!r.done) continue;
        const k = clamp((time - r.fireAt) / FIRE_MS, 0, 1);
        const ex = c.x + Math.cos(r.a) * RAY_LEN, ey = c.y + Math.sin(r.a) * RAY_LEN;
        bolt(g, c.x, c.y - 40, ex, ey, Math.floor(time / 40) + Math.round(r.a * 10), 5 * (1 - k) + 1, r.aimed ? OFF_RED : ARC, 1 - k, 16);
      }
      // The arc in the gap climbs the horns as each note sounds.
      const ph = idx === 0 ? 0 : idx / Math.max(1, phrase.length);
      const ay = c.y - 34 - ph * 34, spread = 6 + ph * 26;
      bolt(g, c.x - spread, ay, c.x + spread, ay, Math.floor(time / 50), 2, ARC_VIOLET, 0.9, 6, false);
      glow(g, c.x, ay, 26, ARC_VIOLET, 0.07, 3);
      if (aimedBy) sparks(g, c.x, c.y - 70, 20, time, 8, aimedBy === 'player' ? ARC : OFF_RED);
    },

    drawHud(g) {
      // The phrase on a stave: noteheads at their pitch, each stem a needle down its line.
      const n = phrase.length, gapX = 26, w = n * gapX + 30, x0 = W / 2 - w / 2, y0 = top + 6;
      g.fillStyle(0x0c0d12, 0.7); g.fillRoundedRect(x0, y0, w, 52, 8);
      g.lineStyle(1, CHALK, 0.4);
      for (let l = 0; l < 5; l++) g.lineBetween(x0 + 8, y0 + 10 + l * 8, x0 + w - 8, y0 + 10 + l * 8);
      for (let i = 0; i < n; i++) {
        const k = phrase[i];
        const x = x0 + 22 + i * gapX, y = y0 + 42 - pitchOf(k) * 8;
        const played = i < idx, now = i === idx;
        const col = i === aimedNote && played ? OFF_RED : now ? SPARK : played ? 0x6a6a74 : CHALK;
        g.fillStyle(col, 1); g.fillEllipse(x, y, 10, 7);
        const a = dirAngle(k);
        g.lineStyle(2, col, 1); g.lineBetween(x, y, x + Math.cos(a) * 11, y + Math.sin(a) * 11);
        g.fillStyle(col, 1); g.fillCircle(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 2);
        if (now) { g.lineStyle(1, SPARK, 0.8); g.strokeRect(x - 9, y0 + 4, 18, 44); }
      }
    },

    destroy() { horns.remove(); },
  };
}

/**
 * The horn-gap arrester: a steel frame on a concrete plinth, two stacks of green insulators, and
 * two copper horns rising and splaying apart so the arc can climb and stretch until it breaks.
 */
function drawArrester(g: G, x: number, y: number, time: number, ready: boolean): void {
  shadow(g, x, y + 4, 110, 26, 0.35);
  g.fillStyle(0x4a4c52, 1); g.fillRoundedRect(x - 44, y - 10, 88, 16, 4);
  g.fillStyle(0x5e6068, 1); g.fillRect(x - 44, y - 10, 88, 4);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 40, y - 18, 80, 8);
  for (const s of [-1, 1]) {
    const bx = x + s * 22;
    for (let k = 0; k < 4; k++) {
      g.fillStyle(k % 2 ? INSULATOR : INSULATOR_LIT, 1); g.fillEllipse(bx, y - 22 - k * 6, 16 - k, 6);
    }
    g.fillStyle(IRON, 1); g.fillRect(bx - 3, y - 48, 6, 8);
    // The horn: a copper rod curving up and out.
    g.lineStyle(5, COPPER_DARK, 1);
    g.beginPath(); g.moveTo(bx, y - 46);
    for (let t = 0.1; t <= 1.001; t += 0.1) g.lineTo(bx - s * 14 + s * 44 * t * t, y - 46 - 60 * t);
    g.strokePath();
    g.lineStyle(2, COPPER_LIT, 0.9);
    g.beginPath(); g.moveTo(bx, y - 47);
    for (let t = 0.1; t <= 1.001; t += 0.1) g.lineTo(bx - s * 14 + s * 44 * t * t, y - 47 - 60 * t);
    g.strokePath();
    g.fillStyle(COPPER, 1); g.fillCircle(bx - s * 14 + s * 44, y - 106, 3);
  }
  // The danger plate on the plinth, and a ring that shows when the horns can be struck.
  g.fillStyle(0xe8d84a, 1); g.fillRect(x - 8, y - 8, 16, 10);
  g.fillStyle(0x1a1a1a, 1); g.fillTriangle(x - 2, y - 7, x + 3, y - 3, x - 1, y - 3);
  g.fillTriangle(x + 1, y - 3, x - 3, y + 1, x + 2, y - 4);
  g.lineStyle(2, ready ? BRASS_LIT : 0x3a3a40, ready ? 0.6 + Math.sin(time / 200) * 0.2 : 0.4);
  g.strokeEllipse(x, y - 2, 120, 34);
}

export const FALLEN_SINGING_GAP: GimmickDef = {
  id: ID,
  rules: 'The arrester sings a phrase, a note longer each time; each note fires down its line on the stave. Strike it: the next note goes at your foe.',
  make,
};
